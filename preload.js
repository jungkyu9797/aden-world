const { contextBridge, ipcRenderer } = require('electron');
// 11/4 멈춤 복구: main.js가 잠자기·화면 잠금 해제 뒤와 1분마다 'app:wake'로 살아 있는지 물음 → 바로 대답 (게임이 onWake로 상태를 덧붙임 · 게임이 멈춰 있으면 대답 못 함 → main.js가 다시 불러옴)
let wakeFn = null;
ipcRenderer.on('app:wake', (_e, m) => { let st = null; try { st = wakeFn ? wakeFn(m) : null; st = st && typeof st === 'object' ? JSON.parse(JSON.stringify(st)) : null; } catch (e) { st = { err: String((e && e.message) || e).slice(0, 80) }; } ipcRenderer.send('app:pong', m && m.id, st); });

contextBridge.exposeInMainWorld('native', {
  saveWrite: (slot, json) => ipcRenderer.invoke('save:write', slot, json),
  saveRead: (slot) => ipcRenderer.invoke('save:read', slot),
  saveDelete: (slot) => ipcRenderer.invoke('save:delete', slot),
  quit: () => ipcRenderer.invoke('app:quit'),
  updateCheck: () => ipcRenderer.invoke('update:check'),
  update: () => ipcRenderer.invoke('update:run'),
  onUpdate: (fn) => ipcRenderer.on('update:progress', (_e, m) => fn(m)),
  relaunch: () => ipcRenderer.invoke('app:relaunch'),
  gpuStatus: () => ipcRenderer.invoke('gpu:status'),
  kicked: (r) => ipcRenderer.invoke('app:kicked', r),
  onClosing: (fn) => ipcRenderer.on('app:closing', () => fn()),
  closeNow: () => ipcRenderer.invoke('app:close-now'),
  logAppend: (name, text) => ipcRenderer.invoke('log:append', name, text),
  logShot: () => ipcRenderer.invoke('log:shot'),
  onWake: (fn) => { wakeFn = typeof fn === 'function' ? fn : null; },
});
