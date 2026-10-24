const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('native', {
  saveWrite: (slot, json) => ipcRenderer.invoke('save:write', slot, json),
  saveRead: (slot) => ipcRenderer.invoke('save:read', slot),
  saveDelete: (slot) => ipcRenderer.invoke('save:delete', slot),
  quit: () => ipcRenderer.invoke('app:quit'),
  updateCheck: () => ipcRenderer.invoke('update:check'),
  update: () => ipcRenderer.invoke('update:run'),
  onUpdate: (fn) => ipcRenderer.on('update:progress', (_e, m) => fn(m)),
  relaunch: () => ipcRenderer.invoke('app:relaunch'),
  onClosing: (fn) => ipcRenderer.on('app:closing', () => fn()),
  closeNow: () => ipcRenderer.invoke('app:close-now'),
  logAppend: (name, text) => ipcRenderer.invoke('log:append', name, text),
  logShot: () => ipcRenderer.invoke('log:shot'),
});
