# chat-task-be
BE part for the chat task https://github.com/andrislapsa/chat-task-fe

## Starting the chat WS server
Run `npm i && npm start` to start the server.

To change inactivity timeout (default is 2 minutes) provide an ENV variable with value in milliseconds.
Example for 10s:
```
INACTIVITY_TIMEOUT=10000 npm start
```

## Logging server output to a file
```
npm start | tee log.txt
```
