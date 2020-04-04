const WebSocket = require("ws");
const process = require("process");
const winston = require("winston");
const fetch = require("node-fetch");
const Package = require("./package.js");
const { ports, logLevel } = require("./config.js");

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.json(),
  defaultMeta: {
    service: "websocket-service",
  },
  transports: [
    new winston.transports.Console({ format: winston.format.cli() }),
  ],
});
let shuttingDown = false;

function noop() {}

// Socket connecter and disconector
const unknownSockets = new Set();
const sockets = new Map();
const wss = new WebSocket.Server({
  port: ports.websocket,
});

const autoCloser = setInterval(() => {
  wss.clients.forEach((socket) => {
    if (!socket.isAlive) {
      const user = socket.user;
      if (user) {
        logger.info(`Terminating dead socket from user ${user}`);
        sockets.delete(user);
      } else {
        logger.info("Terminating dead socket from unknown user");
        unknownSockets.delete(socket);
      }
      socket.terminate();
      return;
    }

    socket.isAlive = false;
    socket.ping(noop);
  });
}, 30_000);

wss.on("connection", (socket) => {
  unknownSockets.add(socket);

  socket.on("message", (data) => {
    const package = Package.read(data);
    logger.debug(`data: ${data}`);

    if (package.type === "connected") {
      const id = package.payload.id;
      socket.user = package.payload.id;
      sockets.set(id, socket);
      unknownSockets.delete(socket);

      logger.info(`User with id: ${id} connected`);
    }
  });

  socket.on("pong", () => {
    socket.isAlive = true;
  });

  socket.on("close", () => {
    const user = socket.user;
    if (user) {
      logger.info(`User ${user} closed socket`);
      sockets.delete(user);
    } else {
      logger.info(`Unknown user closed websocket`);
      unknownSockets.delete(socket);
    }
  });
});

wss.on("close", () => {
  logger.info("Closing server");
  clearInterval(autoCloser);
});

// Fetching of queue messages
const fetchMessage = async () => {
  if (shuttingDown) {
    logger.info("Shutting down FetchMessage");
    return;
  }

  async function handle200(response) {
    try {
      const json = await response.json();
      logger.debug(`mail: ${JSON.stringify(json)}`);
      const to = json.to;
      if (sockets.has(to)) {
        logger.info(`Sending mail to ${to}`);
        const socket = sockets.get(to);
        const package = new Package("mail", json);
        const data = package.write();
        try {
          socket.send(data);
        } catch {
          logger.error(`Cannot write to socket for user ${to}`);
        }
      } else {
        logger.info(`User ${to} does not exist anymore, dropping mail`);
      }
    } catch (err) {
      logger.error("Cannot parse json from queue");
    }
  }

  try {
    const response = await fetch(`http://localhost:${ports.queue}/first`);

    if (response.status === 200) {
      await handle200(response);
      fetchMessage();
    } else if (response.status === 404) {
      setTimeout(fetchMessage, 1_000);
    } else {
      logger.error(`Unknown response status ${response.status}`);
      setTimeout(fetchMessage, 1_000);
    }
  } catch (error) {
    logger.error(
      `Could not fetch message from queue, queue service down? Retrying in 1 second. ${eror.toString()}}`
    );
    setTimeout(fetchMessage, 1_000);
  }
};
fetchMessage().catch();

process.on("SIGTERM", () => {
  logger.info(`Got sigterm, gracefull shutdown`);
  wss.close();
  shuttingDown = true;
});

logger.debug(`PID = ${process.pid}`);
logger.info(`Started listening on port ${ports.websocket}`);
