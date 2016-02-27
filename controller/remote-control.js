'use strict';

const log4js = require('log4js');
const logger = log4js.getLogger('remote');
logger.setLevel('TRACE');

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
        "server": server
    });

    wss.on('connection', function (ws) {
        const address = ws.upgradeReq.client.remoteAddress;

        connections.push(ws);

        logger.info('Connection request from ' + address);
        logger.info('    Total %d connections', wss.clients.length);

        ws.on('message', function (message) {
            logger.info('received message: ' + message + ' from ' + address);

            const msg = JSON.parse(message);
            switch (msg.type) {
                case 'success_connection':
                    ws.send(JSON.stringify({type: 'success_connection', value: 'none'}));
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
};
