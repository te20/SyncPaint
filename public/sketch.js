/**
 * Sample painting application using p5.js
 */

var KEEPALIVE_INTERVAL = 60000;
var KEEPALIVE_MAX = 30;

var canvasOrigin = {
  x: 50,
  y: 40
};

var foregroundColor = 0;
var backgroundColor = 240;

var webSocket;
var sliderRadius;
var drawing = false;

var tool = (function() {
  var radius = {
    'pen': 10,
    'eraser': 70
  };
  var tool = 'pen';

  return {
    set: function(name) {
      radius[tool] = sliderRadius.value();
      tool = name;
      sliderRadius.value(radius[tool]);
    }
  };
})();

function setup() {
  var max_keepalive = KEEPALIVE_MAX;

  var pen = createButton('Pen').size(50, 50).position(0, 40);
  pen.mousePressed(function() {
    tool.set('pen');
    stroke(foregroundColor);
    webSocket.send(JSON.stringify({
      type: 'pen',
      value: {}
    }));
  });

  var eraser = createButton('Eraser').size(50, 50).position(0, 90);
  eraser.mousePressed(function() {
    tool.set('eraser');
    stroke(backgroundColor);
    webSocket.send(JSON.stringify({
      type: 'eraser',
      value: {}
    }));
  });

  var radius_div = createDiv('Size').position(40, 10);
  sliderRadius = createSlider(1, 100, 10);
  radius_div.child(sliderRadius);

  var cvs = createCanvas(windowWidth - canvasOrigin.x - 10,
      windowHeight - canvasOrigin.y - 10)
    .position(canvasOrigin.x, canvasOrigin.y);

  background(backgroundColor);
  stroke(foregroundColor);

  var url = window.location;
  var ws_url = url.protocol === 'https:' ? 'wss:' : 'ws:' + '//' + url.host;
  console.log('WebSocket Host: ' + ws_url);

  webSocket = new WebSocket(ws_url);
  webSocket.onopen = function() {
    webSocket.send(JSON.stringify({
      "type": "success_connection",
      "data": "none"
    }));
  };

  webSocket.onmessage = function(e) {
    var message = JSON.parse(e.data);
    max_keepalive = KEEPALIVE_MAX;

    switch (message.type) {
      case 'success_connection':
        console.log('success_connection');
        break;
      case 'drawStart':
        strokeWeight(message.value.radius);
        point(message.value.x, message.value.y);
        break;
      case 'drawLines':
        line(message.value.x0, message.value.y0, message.value.x1, message.value.y1);
        break;
      case 'drawEnd':
        break;
      case 'pen':
        tool.set('pen');
        stroke(foregroundColor);
        break;
      case 'eraser':
        tool.set('eraser');
        stroke(backgroundColor);
        break;
      default:
        console.log('Unknown message type: ', e.data);
    }
  };

  setTimeout(function keepalive() {
    if (max_keepalive-- > 0) {
      webSocket.send(JSON.stringify({
        type: 'iamalive',
        value: 0
      }));
      setTimeout(keepalive, KEEPALIVE_INTERVAL);
    }
  }, KEEPALIVE_INTERVAL);

}

function draw() {
  // Do nothing in rendering loop
}

function drawStarted(x, y) {
  if ((x > canvasOrigin.x && x < canvasOrigin.x + width) &&
    (y > canvasOrigin.y && y < canvasOrigin.y + height)) {
    drawing = true;
    strokeWeight(sliderRadius.value());
    point(x, y);
    webSocket.send(JSON.stringify({
      type: 'drawStart',
      value: {
        x, y,
        radius: sliderRadius.value()
      }
    }));

    return false;
  }
}

function drawLines(x0, y0, x1, y1) {
  if (drawing) {
    strokeWeight(sliderRadius.value());
    line(x0, y0, x1, y1);
    webSocket.send(JSON.stringify({
      type: 'drawLines',
      value: {
        x0, y0, x1, y1
      }
    }));
    return false;
  }
}

function drawEnded() {
  drawing = false;
  webSocket.send(JSON.stringify({
    type: 'drawEnd',
    value: {}
  }));
}

// mouse operation
function mousePressed() {
  return drawStarted(mouseX, mouseY);
}

function mouseDragged() {
  return drawLines(pmouseX, pmouseY, mouseX, mouseY);
}

function mouseReleased() {
  return drawEnded();
}

// touch panel operation
function touchStarted() {
  return drawStarted(touchX, touchY);
}

function touchMoved() {
  return drawLines(ptouchX, ptouchY, touchX, touchY);
}

function touchEnded() {
  return drawEnded();
}