'use strict';

const log4js = require('log4js');
const logger = log4js.getLogger('remote');
logger.setLevel('TRACE');

const tryParseJSON = jsonString => {
    try {
        const json = JSON.parse(jsonString);
        // Handle non-exception-throwing cases:
        // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
        // but... JSON.parse(null) returns 'null', and typeof null === "object",
        // so we must check for that, too.
        if (json && typeof json === 'object' && json !== null) {
            return json;
        }
    } catch (e) {
        // go through to 'return false'
    }

    return false;
};

const broadcast = (sockets, message) => {
    sockets.forEach(socket => {
        logger.info('send message: ' + message + ' to ' + socket.upgradeReq.client.remoteAddress);
        socket.send(message);
    });
};

const getOthers = (sockets, me) => sockets.filter(socket => socket !== me);

module.exports = function remoteControl(server) {
    let connections = [];

    const WebSocketServer = require('ws').Server;
    const wss = new WebSocketServer({
        "server": server,
        handleProtocols: (protocols, callback) => {
            console.log('protocols: ', protocols);
            callback(true, protocols[protocols.length - 1]);
        }
    });

    wss.broadcat = data => {
        wss.clients.forEach(client => {
            client.send(data);
        });
    };

    wss.on('connection', function (ws) {
        const address = ws.upgradeReq.client.remoteAddress;

        connections.push(ws);

        logger.info('Connection request from ' + address);
        logger.info('    Total %d connections', wss.clients.length);

        ws.on('message', function (message) {
            logger.info('received message: ' + message + ' from ' + address);

            const msg = tryParseJSON(message);
            if (!msg || !msg.hasOwnProperty('type')) {
                return;
            }
            switch (msg.type) {
            case 'success_connection':
                ws.send(JSON.stringify({
                    type: 'success_connection',
                    value: 'none'
                }));
                break;
            case 'iamalive':
                break;
            default:
                broadcast(getOthers(connections, ws), message);
            }
        });

        ws.on('disconnect', function () {
            logger.info('disconnected by ' + address);
            connections = getOthers(connections, ws);
        });

        ws.on('close', function () {
            logger.info('closed by ' + address);
            connections = getOthers(connections, ws);
        });

        ws.on('error', function (error) {
            logger.error('WebSocket Error: ' + error);
        });
    });

    wss.on('error', error => {
        logger.debug('WS Server Error:' + error);
    });

    wss.on('headers', headers => {
        logger.info('headers: ' + JSON.stringify(headers));
    });
};
