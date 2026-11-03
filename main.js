// Electron 메인 프로세스: 게임 창 생성 + 세이브 파일 입출력
const { app, BrowserWindow, ipcMain, Menu, net } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

app.setAppUserModelId('com.local.adensurvivors');   // 작업 표시줄에 게임 아이콘이 나오게
// 11/2 렉: 그래픽카드(드라이버)가 크롬 차단 목록에 있으면 게임 화면을 CPU로 그려서 매우 느림 → 차단 목록을 무시하고 그래픽카드로 그림
//   그래픽카드 쪽이 비정상으로 죽으면 gpu_safe 파일을 남겨 다음 실행부터는 원래대로 (게임 폴더 밖 · 사용자 데이터 폴더)
const GPU_SAFE = () => path.join(app.getPath('userData'), 'gpu_safe');
let gpuSafe = false; try { gpuSafe = fs.existsSync(GPU_SAFE()); } catch (_) {}
if (!gpuSafe) app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.on('child-process-gone', (_e, d) => { if (!d || d.type !== 'GPU' || d.reason === 'clean-exit' || gpuSafe) return; try { fs.mkdirSync(path.dirname(GPU_SAFE()), { recursive: true }); fs.writeFileSync(GPU_SAFE(), new Date().toISOString() + ' ' + d.reason); } catch (_) {} });
let closeOk = false;
const DEV_OK = () => process.argv.includes('--dev') || fs.existsSync(path.join(__dirname, 'admin_key.js'));
const SAVE_DIR = () => path.join(app.getPath('userData'), 'saves');

function createWindow(page, query) {
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
  // 창을 닫으면: 게임이 캐릭터를 서버에 저장할 시간을 준 뒤 닫힘 (최대 4초)
  win.on('close', (e) => { if (closeOk || /kicked\.html/.test(win.webContents.getURL())) return;   /* 안내 창은 저장할 게임이 없으니 바로 닫음 */ e.preventDefault(); try { win.webContents.send('app:closing'); } catch (_) {} setTimeout(() => { closeOk = true; if (!win.isDestroyed()) win.close(); }, 4000); });
  win.loadFile(page || 'index.html', query ? { query } : undefined);
  if (process.argv.includes('--dev')) win.webContents.openDevTools({ mode: 'detach' });
  // F5~F12는 게임 단축키로 게임에 그대로 넘김 · 전체화면은 Alt+Enter, 개발자도구는 Ctrl+Shift+I
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.alt && input.key === 'Enter') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.control && input.shift && (input.key === 'I' || input.key === 'i')) { e.preventDefault(); if (DEV_OK()) win.webContents.toggleDevTools(); }   // v156: 개발자도구는 --dev 실행 또는 운영자 키(admin_key.js)가 있는 PC에서만
  });
  return win;
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
ipcMain.handle('app:close-now', () => { closeOk = true; BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.close(); }); });

// ===== 업데이트: update.json 의 base 주소에서 version.json(파일 목록·해시)을 받아 바뀐 파일만 내려받아 게임 폴더에 덮어씀
const APP_DIR = __dirname;
const readJSON = f => { try { return JSON.parse(fs.readFileSync(f, 'utf-8')); } catch (e) { return null; } };
const DEFAULT_BASE = 'https://raw.githubusercontent.com/jungkyu9797/aden-world/main/';   // update.json이 없거나 비어 있어도 이 주소로
const updateBase = () => { const c = readJSON(path.join(APP_DIR, 'update.json')) || {}; const b = String(c.base || '').trim() || DEFAULT_BASE; return b.endsWith('/') ? b : b + '/'; };
const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');
const shaFile = f => { try { return sha(fs.readFileSync(f)); } catch (e) { return null; } };
const BOOT_SHA = { 'main.js': shaFile(path.join(APP_DIR, 'main.js')), 'preload.js': shaFile(path.join(APP_DIR, 'preload.js')) };   // 11/3: 켤 때의 main.js·preload.js — 받다가 실패한 뒤 다시 받아도 '다시 시작'이 필요한지 알 수 있게
const needRestart = () => Object.keys(BOOT_SHA).some(rel => BOOT_SHA[rel] && shaFile(path.join(APP_DIR, rel)) !== BOOT_SHA[rel]);
const safeRel = rel => typeof rel === 'string' && !rel.includes('..') && !path.isAbsolute(rel) && /^[\w\-./ ]+$/.test(rel) && rel !== 'version.json';
async function getBuf(url) { const r = await net.fetch(url, { cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status); return Buffer.from(await r.arrayBuffer()); }
// raw.githubusercontent.com 은 새로 올린 직후 몇 분간 예전 파일을 줄 수 있어서, 가장 최근 커밋 번호로 고정한 주소를 씀 (실패하면 원래 주소)
async function pinBase(base) { const g = /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/$/.exec(base); if (!g) return base;
  try { const r = await net.fetch(`https://api.github.com/repos/${g[1]}/${g[2]}/commits/${g[3]}`, { headers: { Accept: 'application/vnd.github.sha', 'User-Agent': 'AdenWorld' }, cache: 'no-store' }); if (r.ok) { const sha = (await r.text()).trim(); if (/^[0-9a-f]{40}$/.test(sha)) return `https://raw.githubusercontent.com/${g[1]}/${g[2]}/${sha}/`; } } catch (e) {}
  return base; }
async function manifest(base) { return JSON.parse((await getBuf(base + 'version.json?t=' + Date.now())).toString('utf-8')); }
ipcMain.handle('update:check', async () => {
  const base0 = updateBase(); if (!base0) return { ok: false, err: 'nobase' }; const base = base0;   // 11/3: 확인(2분마다)은 커밋 고정 안 함 — api.github.com 한 시간 60번 제한 (몇 분 늦게 알아도 됨 · 받을 때만 고정)
  try { const m = await manifest(base); return { ok: true, ver: m.ver | 0 }; } catch (e) { return { ok: false, err: String(e.message || e) }; }
});
ipcMain.handle('update:run', async (e) => {
  const base0 = updateBase(); if (!base0) return { ok: false, err: 'nobase' }; const base = await pinBase(base0);
  const send = m => { try { e.sender.send('update:progress', m); } catch (_) {} };
  try {
    const m = await manifest(base), files = Object.entries(m.files || {}).filter(([rel]) => safeRel(rel));
    send({ step: 'check', total: files.length });
    const need = files.filter(([rel, info]) => shaFile(path.join(APP_DIR, rel)) !== info[1]);
    let done = 0, restart = false;
    for (const [rel, info] of need) {
      send({ step: 'file', n: done, total: need.length, name: rel });
      let buf = null; for (let tr = 0; tr < 3; tr++) { const b = await getBuf(base + rel.split('/').map(encodeURIComponent).join('/') + '?v=' + info[1].slice(0, 12) + (tr ? '&r=' + Date.now() : '')); if (sha(b) === info[1]) { buf = b; break; } await new Promise(r => setTimeout(r, 3000)); }   // 예전 파일이 오면 잠깐 기다렸다 다시
      if (!buf) throw new Error('STALE 파일이 아직 예전 것이에요: ' + rel);
      const dst = path.join(APP_DIR, rel); fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.writeFileSync(dst + '.tmp', buf); fs.renameSync(dst + '.tmp', dst);
      done++;
    }
    fs.writeFileSync(path.join(APP_DIR, 'version.json'), JSON.stringify({ ver: m.ver | 0, name: m.name || '' }), 'utf-8');
    restart = needRestart(); return need.length ? { ok: true, ver: m.ver | 0, n: need.length, restart } : { ok: true, latest: true, ver: m.ver | 0, restart };
  } catch (err) { return { ok: false, err: String(err.message || err) }; }
});
ipcMain.handle('app:relaunch', () => { app.relaunch(); app.exit(0); });
// 11/3: 다른 곳에서 같은 계정으로 접속해 끊긴 창 — 게임 창(그림·소리·몬스터로 1GB 넘게 씀)을 통째로 닫고 가벼운 안내 창(kicked.html)으로 바꿈 → 메모리·그래픽 메모리를 윈도우에 바로 돌려줌
ipcMain.handle('app:kicked', (e, r) => { const old = BrowserWindow.fromWebContents(e.sender); const b = old && !old.isDestroyed() ? old.getBounds() : null, max = old && old.isMaximized();
  const nw = createWindow('kicked.html', { r: r === 'admin' ? 'admin' : 'dup' }); if (b) nw.setBounds(b); if (max) nw.maximize();
  if (old && !old.isDestroyed()) setTimeout(() => { try { old.destroy(); } catch (_) {} }, 300); return true; });
ipcMain.handle('gpu:status', () => { try { return { st: app.getGPUFeatureStatus(), safe: gpuSafe }; } catch (err) { return { st: {}, safe: gpuSafe }; } });   // 11/2: /렉 진단
// ===== 관찰 기록기: 플레이 기록과 게임 창 캡처를 게임 폴더 logs/ 에 남김 (모니터 리포트용 · 이 PC에만 저장)
const LOG_DIR = () => path.join(APP_DIR, 'logs');
ipcMain.handle('log:append', (_e, name, text) => { try { if (typeof name !== 'string' || !/^[\w\-.]+\.jsonl$/.test(name) || typeof text !== 'string' || text.length > 2e6) return false; fs.mkdirSync(LOG_DIR(), { recursive: true }); const f = path.join(LOG_DIR(), name); try { if (fs.statSync(f).size > 40e6) return false; } catch (_) {} fs.appendFileSync(f, text, 'utf-8'); return true; } catch (err) { return false; } });
ipcMain.handle('log:shot', async (e) => { try { const w = BrowserWindow.fromWebContents(e.sender); if (!w || w.isMinimized()) return false; const img = await w.webContents.capturePage(); if (img.isEmpty()) return false; const sz = img.getSize(), sm = sz.width > 1280 ? img.resize({ width: 1280 }) : img;
  const dir = path.join(LOG_DIR(), 'shots'); fs.mkdirSync(dir, { recursive: true }); const d = new Date(), p2 = n => String(n).padStart(2, '0'); const name = `shot-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}.jpg`;
  fs.writeFileSync(path.join(dir, name), sm.toJPEG(72)); const all = fs.readdirSync(dir).filter(x => /^shot-.*\.jpg$/.test(x)).sort(); for (const x of all.slice(0, Math.max(0, all.length - 18))) { try { fs.unlinkSync(path.join(dir, x)); } catch (_) {} } return name; } catch (err) { return false; } });

// 11/3: 게임은 한 PC에 하나만 — 이미 켜져 있으면 새로 띄우지 않고 켜져 있는 창을 앞으로 (작업 표시줄에 남은 예전 창 + 새 창이 겹쳐 메모리를 두 배로 쓰던 것)
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
else {
  app.on('second-instance', () => { const w = BrowserWindow.getAllWindows()[0]; if (!w || w.isDestroyed()) return; if (w.isMinimized()) w.restore(); w.show(); w.focus(); });
  app.whenReady().then(() => createWindow());
}
app.on('window-all-closed', () => app.quit());
