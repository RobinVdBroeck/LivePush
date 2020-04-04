const WebSocket = require("ws");
const { v4: uuid } = require("uuid");
const fetch = require("node-fetch");
const Package = require("./package.js");
const { ports } = require("./config.js");

// id = jwt but without all the auth
const id = uuid();

// Wait 2 second for websocket to be up
setTimeout(() => {
  const ws = new WebSocket(`ws://127.0.0.1:${ports.websocket}`);

  ws.on("open", () => {
    console.log("Connected");
    const package = new Package("connected", { id });
    const repr = package.write();
    ws.send(repr);
  });

  ws.on("message", (data) => {
    const package = Package.read(data);
    console.log("Received:", package);
  });

  ws.on("error", (err) => {
    console.error("Error:", err);
  });

  ws.on("close", () => {
    console.log("Closed");
  });
}, 2_000);

// Wait 2.5 seconds to send email
setTimeout(async () => {
  const payload = {
    to: id,
    from: id,
    message: "Hello world",
  };
  console.log("Sending mail");

  const resp = await fetch(`http://localhost:${ports.restapi}/mail`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (resp.status === 200) {
    console.log("Succesfully send mail");
  } else {
    console.error("Could not send email", resp.status);
  }
}, 2_500);
