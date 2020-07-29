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
  let exposedDestroyInactivityTimeout;
  const inactivityPromise = new Promise((resolve, reject) => {
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

    function destroy() {
      clearTimeout(t);
      reject();
    }

    exposedDestroyInactivityTimeout = destroy;
    exposedResetInactivityTimeout = resetInactivityTimeout;
  });

  return {
    inactivityPromise,
    nickname,
    destroyInactivityTimeout: exposedDestroyInactivityTimeout,
    resetInactivityTimeout: exposedResetInactivityTimeout,
  }
}

export function formatMessage(type, message, nickname) {
  return { type, message, nickname };
}

export function excludeClient(clients, client) {
  return [...clients].filter((c) => c !== client);
}

export function notifyClients(clients, payload) {
  const prefix = payload.nickname ? `${payload.nickname}: ` : '';
  console.log(`[${payload.type} is broadcasting]`, `${prefix}${payload.message}`);

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload));
    }
  });
}

export function getSanitizedNickname(req) {
  const reqParams = new URLSearchParams(req.url.substr(1));
  const nickname = reqParams.get('nickname');

  return nickname.trim();
}
