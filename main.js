// Electron 메인 프로세스: 게임 창 생성 + 세이브 파일 입출력
const { app, BrowserWindow, ipcMain, Menu, net } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

app.setAppUserModelId('com.local.adensurvivors');   // 작업 표시줄에 게임 아이콘이 나오게
const SAVE_DIR = () => path.join(app.getPath('userData'), 'saves');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 760,
    minWidth: 960,
    minHeight: 560,
    backgroundColor: '#0d0a0e',
    title: '아덴 월드',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  Menu.setApplicationMenu(null);
  win.loadFile('index.html');
  if (process.argv.includes('--dev')) win.webContents.openDevTools({ mode: 'detach' });
  // F11 전체화면, F12 개발자도구
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.key === 'F12') { win.webContents.toggleDevTools(); e.preventDefault(); }
  });
}

ipcMain.handle('save:write', (_e, slot, json) => {
  fs.mkdirSync(SAVE_DIR(), { recursive: true });
  const file = path.join(SAVE_DIR(), `${slot}.json`);
  fs.writeFileSync(file + '.tmp', json, 'utf-8');
  fs.renameSync(file + '.tmp', file);
  return true;
});
ipcMain.handle('save:read', (_e, slot) => {
  const file = path.join(SAVE_DIR(), `${slot}.json`);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : null;
});
ipcMain.handle('save:delete', (_e, slot) => {
  const file = path.join(SAVE_DIR(), `${slot}.json`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  return true;
});
ipcMain.handle('app:quit', () => app.quit());

// ===== 업데이트: update.json 의 base 주소에서 version.json(파일 목록·해시)을 받아 바뀐 파일만 내려받아 게임 폴더에 덮어씀
const APP_DIR = __dirname;
const readJSON = f => { try { return JSON.parse(fs.readFileSync(f, 'utf-8')); } catch (e) { return null; } };
const updateBase = () => { const c = readJSON(path.join(APP_DIR, 'update.json')) || {}; const b = String(c.base || '').trim(); return b ? (b.endsWith('/') ? b : b + '/') : ''; };
const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');
const shaFile = f => { try { return sha(fs.readFileSync(f)); } catch (e) { return null; } };
const safeRel = rel => typeof rel === 'string' && !rel.includes('..') && !path.isAbsolute(rel) && /^[\w\-./ ]+$/.test(rel) && rel !== 'version.json';
async function getBuf(url) { const r = await net.fetch(url, { cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status); return Buffer.from(await r.arrayBuffer()); }
async function manifest(base) { return JSON.parse((await getBuf(base + 'version.json?t=' + Date.now())).toString('utf-8')); }
ipcMain.handle('update:check', async () => {
  const base = updateBase(); if (!base) return { ok: false, err: 'nobase' };
  try { const m = await manifest(base); return { ok: true, ver: m.ver | 0 }; } catch (e) { return { ok: false, err: String(e.message || e) }; }
});
ipcMain.handle('update:run', async (e) => {
  const base = updateBase(); if (!base) return { ok: false, err: 'nobase' };
  const send = m => { try { e.sender.send('update:progress', m); } catch (_) {} };
  try {
    const m = await manifest(base), files = Object.entries(m.files || {}).filter(([rel]) => safeRel(rel));
    send({ step: 'check', total: files.length });
    const need = files.filter(([rel, info]) => shaFile(path.join(APP_DIR, rel)) !== info[1]);
    let done = 0, restart = false;
    for (const [rel, info] of need) {
      send({ step: 'file', n: done, total: need.length, name: rel });
      const buf = await getBuf(base + rel.split('/').map(encodeURIComponent).join('/') + '?v=' + info[1].slice(0, 12));
      if (sha(buf) !== info[1]) throw new Error('파일이 손상되었어요: ' + rel);
      const dst = path.join(APP_DIR, rel); fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.writeFileSync(dst + '.tmp', buf); fs.renameSync(dst + '.tmp', dst);
      if (rel === 'main.js' || rel === 'preload.js') restart = true; done++;
    }
    fs.writeFileSync(path.join(APP_DIR, 'version.json'), JSON.stringify({ ver: m.ver | 0, name: m.name || '' }), 'utf-8');
    return need.length ? { ok: true, ver: m.ver | 0, n: need.length, restart } : { ok: true, latest: true, ver: m.ver | 0 };
  } catch (err) { return { ok: false, err: String(err.message || err) }; }
});
ipcMain.handle('app:relaunch', () => { app.relaunch(); app.exit(0); });

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
