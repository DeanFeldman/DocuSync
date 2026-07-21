"use strict";

const path = require("node:path");
const { createTemplateServer } = require("./server.cjs");

const port = Number.parseInt(process.env.DOCSYNC_PORT || "0", 10);
const host = "127.0.0.1";
const sessionToken = process.env.DOCSYNC_SESSION_TOKEN || "";
const uiDirectory = process.env.DOCSYNC_UI_DIR
  ? path.resolve(process.env.DOCSYNC_UI_DIR)
  : path.resolve(__dirname, "../../desktop-ui");

const server = createTemplateServer({ sessionToken, uiDirectory });
server.listen(port, host, () => {
  const address = server.address();
  const ready = { type: "ready", host, port: address.port, api_version: "1.0.0" };
  if (typeof process.send === "function") process.send(ready);
  else process.stdout.write(`${JSON.stringify(ready)}\n`);
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
