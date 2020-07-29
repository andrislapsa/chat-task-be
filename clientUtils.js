import WebSocket from 'ws';


export function getNicknameValidationError(clientData, nickname) {
  if (nickname.length > 255) return 'Nickname too long, use up to 255 characters';
  if (nickname.length < 3) return 'Nickname too short, use at least 3 characters';

  const isUnique = Object.values(clientData)
    .findIndex((c) => c.nickname.toLowerCase() === nickname.toLowerCase()) === -1;

  if (!isUnique) return 'Someone with this name already is in the chat';
}

export function registerClient(nickname, INACTIVITY_TIMEOUT) {
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
    inactivityPromise,
    nickname,
    resetInactivityTimeout: exposedResetInactivityTimeout,
  }
}

export function formatMessage(type, message, nickname) {
  const m = JSON.stringify({ type, message, nickname });
  // console.log('formatted msg', m);
  return m;
}

export function excludeClient(clients, client) {
  return [...clients].filter((c) => c !== client);
}

export function notifyClients(clients, message) {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export function getSanitizedNickname(req) {
  const reqParams = new URLSearchParams(req.url.substr(1));
  const nickname = reqParams.get('nickname');

  return nickname.trim();
}
