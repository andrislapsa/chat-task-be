import WebSocket from 'ws';
import {
  getNicknameValidationError,
  getSanitizedNickname,
  registerClient,
  excludeClient,
  notifyClients,
  formatMessage,
} from './clientUtils.js';


const INACTIVITY_TIMEOUT = 60000;
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
  // clients excluding the current one
  const otherClients = excludeClient(wss.clients, ws);

  const currentClientData = registerClient(nickname, INACTIVITY_TIMEOUT);
  clientData[clientId] = currentClientData;

  const leave = (dueInactivity) => {
    const notifyOthersMsg = dueInactivity ?
      `${nickname} has left the chat due to inactivity!` :
      `${nickname} has left the chat`;
    const msg = dueInactivity ?
      'You got disconnected due to inactivity, try connecting again' :
      'You disconnected from the chat';

    notifyClients(otherClients, formatMessage('system', notifyOthersMsg));
    ws.close(CLOSING_CODE, msg);
    delete clientData[clientId];
  };

  currentClientData.inactivityPromise.then(() => leave(true));

  notifyClients(wss.clients, formatMessage('system', `${nickname} has joined the chat!`));

  ws.on('message', (data) => {
    currentClientData.resetInactivityTimeout();
    notifyClients(wss.clients, formatMessage('user', data, nickname));
  });

  ws.on('close', () => {
    leave(false);
  });
});
