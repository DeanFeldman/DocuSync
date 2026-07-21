"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("docSync", Object.freeze({
  getSessionToken: () => ipcRenderer.invoke("session:get-token"),
  saveOutputs: (outputs) => ipcRenderer.invoke("files:save-outputs", outputs),
}));
