const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 3030 });

const clientData = {};

const INACTIVITY_TIMEOUT = 5000;

function registerClient(client, req) {
  const reqParams = new URLSearchParams(req.url.substr(1));
  const nickname = reqParams.get('nickname');

  let exposedResetInactivityTimeout;
  const inactivityPromise = new Promise((resolve) => {
    let t;
    function startTimeout() {
      t = setTimeout(() => {
        resolve();
      }, INACTIVITY_TIMEOUT)
    }
    startTimeout();

    function resetInactivityTimeout() {
      clearTimeout(t);
      startTimeout();
    }

    exposedResetInactivityTimeout = resetInactivityTimeout;
  });


  return {
    nickname,
    inactivityPromise,
    resetInactivityTimeout: exposedResetInactivityTimeout,
  }
}

function formatMessage(type, message, nickname) {
  const m = JSON.stringify({ type, message, nickname });
  console.log('formatted msg', m);
  return m;
}

function excludeClient(clients, client) {
  return [...clients].filter((c) => c !== client);
}

function notifyClients(clients, message) {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on('connection', function connection(ws, req) {
  const clientId = req.headers['sec-websocket-key'];

  const currentClientData = registerClient(ws, req);
  clientData[clientId] = currentClientData;

  currentClientData.inactivityPromise.then(() => {
    console.log('client inactive, disconnecting');
    ws.close();
    delete clientData[clientId];
  });

  const reqParams = new URLSearchParams(req.url.substr(1));
  const nickname = reqParams.get('nickname');

  console.log('someone connected!', req.url, clientData);

  // clients excluding the current one (who sent the message)
  const otherClients = excludeClient(wss.clients, ws);
  notifyClients(otherClients, formatMessage('system', `${nickname} has joined the chat!`));

  ws.on('message', function incoming(data) {
    currentClientData.resetInactivityTimeout();
    notifyClients(wss.clients, formatMessage('user', data, nickname));
  });
});
