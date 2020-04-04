const express = require("express");
const winston = require("winston");
const { ports, logLevel } = require("./config.js");

const app = express();
app.use(express.json());

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.json(),
  defaultMeta: {
    service: "queue-service",
  },
  transports: [
    new winston.transports.Console({ format: winston.format.cli() }),
  ],
});

let queue = [];

app.post("/add", (req, res) => {
  logger.info(`Adding message to queue ${JSON.stringify(req.body)}`);
  queue.push(req.body);
  res.sendStatus(200);
});

app.get("/first", (req, res) => {
  const first = queue.shift();

  if (typeof first === "undefined") {
    logger.info("Request for first but queue empty");
    res.sendStatus(404);
    return;
  }

  const data = JSON.stringify(first);
  const length = queue.length;
  logger.info(`Request for first, returning ${data}. ${length} left`);
  res.json(first);
});

app.listen(ports.queue, () => {
  logger.info(`Listening on port ${ports.queue}`);
});
