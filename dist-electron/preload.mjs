"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  readConfig: (configPath) => electron.ipcRenderer.invoke("read-config", configPath),
  writeConfig: (configPath, data) => electron.ipcRenderer.invoke("write-config", configPath, data)
});
