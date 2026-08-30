const { WebSocketServer } = require('ws');

let wss;

function initWebSocket(server) {
  wss = new WebSocketServer({ server });
  wss.on('connection', (socket) => {
    socket.send(JSON.stringify({ type: 'connected' }));
  });
}

// Le avisa a todos los celulares conectados que algo cambió
function broadcast(message) {
  if (!wss) return;
  const payload = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
}

module.exports = { initWebSocket, broadcast };
