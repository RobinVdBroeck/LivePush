const express = require("express");
const winston = require("winston");
const fetch = require("node-fetch");
const { ports, logLevel } = require("./config.js");

const app = express();
app.use(express.json());

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.json(),
  defaultMeta: {
    service: "restapi-service",
  },
  transports: [
    new winston.transports.Console({ format: winston.format.cli() }),
  ],
});

app.post("/mail", async (req, res) => {
  logger.info(`Received mail from ${req.body.from} for ${req.body.to}`);

  try {
    const resp = await fetch(`http://localhost:${ports.queue}/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });
    if (resp.status === 200) res.sendStatus(200);
    else res.sendStatus(500);
  } catch (err) {
    log.error(`Could not send to queue, ${err.toString()}`);
    res.status(500);
  }
});

app.listen(ports.restapi, () =>
  logger.info(`listening on port ${ports.restapi}`)
);
