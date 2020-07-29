import WebSocket from 'ws';
import {
  getNicknameValidationError,
  getSanitizedNickname,
  registerClient,
  notifyClients,
  formatMessage,
} from './clientUtils.js';


const INACTIVITY_TIMEOUT = process.env.INACTIVITY_TIMEOUT || 120000;
const PORT = 3030;
// Picked from this list as a suitable code number for app uses https://github.com/Luka967/websocket-close-codes
const CLOSING_CODE = 4001;

const wss = new WebSocket.Server({ port: PORT });
const clientData = {};

wss.on('listening', () => {
  console.log(`Chat WS server running on ws://localhost:${PORT}`)
});

wss.on('connection', (ws, req) => {
  const nickname = getSanitizedNickname(req);

  const nicknameValidationError = getNicknameValidationError(clientData, nickname);
  if (nicknameValidationError) {
    ws.close(CLOSING_CODE, nicknameValidationError);
    return;
  }

  const clientId = req.headers['sec-websocket-key'];

  const currentClientData = registerClient(nickname, INACTIVITY_TIMEOUT);
  clientData[clientId] = currentClientData;

  const leave = (dueInactivity) => {
    const notifyOthersMsg = dueInactivity ?
      `${nickname} has left the chat due to inactivity!` :
      `${nickname} has left the chat`;
    const msg = dueInactivity ?
      'You got disconnected due to inactivity, try connecting again' :
      'You disconnected from the chat';

    notifyClients(wss.clients, formatMessage('system', notifyOthersMsg));
    currentClientData.destroyInactivityTimeout();
    ws.close(CLOSING_CODE, msg);
    delete clientData[clientId];
  };

  currentClientData.inactivityPromise
    .then(() => leave(true))
    .catch(() => { /* user has already left */ });

  notifyClients(wss.clients, formatMessage('system', `${nickname} has joined the chat!`));

  ws.on('message', (data) => {
    const message = data.trim().substr(0, 255);

    if (!message) return;

    currentClientData.resetInactivityTimeout();
    notifyClients(wss.clients, formatMessage('user', message, nickname));
  });

  ws.on('close', () => {
    if (clientData[clientId]) leave(false);
  });
});

function shutdown() {
  console.log('closing socket connections with clients');
  wss.clients.forEach((client) => {
    client.close();
  });

  console.log('server teardown complete, shutting down');

  process.exit(0);
}

process.once('SIGINT', () => {
  console.log('\nSIGINT received...')
  shutdown();
});

process.once('SIGTERM', () => {
  console.log('\nSIGTERM received...')
  shutdown();
});
