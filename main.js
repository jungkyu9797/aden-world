// Electron 메인 프로세스: 게임 창 생성 + 세이브 파일 입출력
const { app, BrowserWindow, ipcMain, Menu, net, powerMonitor, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

app.setAppUserModelId('com.local.adensurvivors');   // 작업 표시줄에 게임 아이콘이 나오게
// 11/2 렉: 그래픽카드(드라이버)가 크롬 차단 목록에 있으면 게임 화면을 CPU로 그려서 매우 느림 → 차단 목록을 무시하고 그래픽카드로 그림
//   그래픽카드 쪽이 비정상으로 죽으면 gpu_safe 파일을 남겨 다음 실행부터는 원래대로 (게임 폴더 밖 · 사용자 데이터 폴더)
// 11/4 멈춤 복구: gpu_safe는 3일 뒤 · 게임 파일이 업데이트되면(version.json 번호가 바뀌면) 지움 → 다시 그래픽카드로 시도 (예전엔 한 번 남으면 영원히 CPU로 그려 CPU 22%·메모리 1GB)
//   잠자기·화면 꺼짐·화면 잠금 직후(3분)나 자리를 비운 동안(2분 넘게 입력 없음), 'killed'(밖에서 끈 것)는 그래픽카드 탓이 아니라서 남기지 않음 · 일어난 일은 사용자 데이터 폴더 crash.log에
const GPU_SAFE = () => path.join(app.getPath('userData'), 'gpu_safe'), GPU_SAFE_MS = 3 * 86400e3;
const CRASH_LOG = () => path.join(app.getPath('userData'), 'crash.log');
function clog(t) { try { const f = CRASH_LOG(); fs.mkdirSync(path.dirname(f), { recursive: true }); try { if (fs.statSync(f).size > 300e3) fs.renameSync(f, f + '.1'); } catch (_) {} fs.appendFileSync(f, new Date().toISOString() + ' ' + t + '\n', 'utf-8'); } catch (_) {} }
const appVer = () => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'version.json'), 'utf-8')).ver | 0; } catch (_) { return 0; } };
let gpuSafe = false, gpuSafeAt = 0;
try { const f = GPU_SAFE(); if (fs.existsSync(f)) { let o = null; try { o = JSON.parse(fs.readFileSync(f, 'utf-8')); } catch (_) {}
  if (o && +o.at > 0 && Date.now() - o.at < GPU_SAFE_MS && Date.now() >= +o.at && (o.v | 0) === appVer()) { gpuSafe = true; gpuSafeAt = +o.at; }
  else { fs.unlinkSync(f); clog('그래픽 안전 모드 끝 (' + (!o ? '예전 기록' : (o.v | 0) !== appVer() ? '게임 업데이트' : '3일 지남') + ') → 다시 그래픽카드로'); } } } catch (_) {}
if (!gpuSafe) app.commandLine.appendSwitch('ignore-gpu-blocklist');
let wakeAt = 0, sleeping = false, locked = false, beatAt = Date.now();
const idleSec = () => { try { return powerMonitor.getSystemIdleTime() | 0; } catch (_) { return 0; } };
const sleepish = () => sleeping || locked || Date.now() - beatAt > 20000 || Date.now() - wakeAt < 180000 || idleSec() >= 120;   // 방금 깨어남(3분) · 잠김 · 자리 비움 · 아직 깨어난 걸 모름(타이머가 20초 넘게 못 돎)
app.on('child-process-gone', (_e, d) => { if (!d || d.type !== 'GPU' || d.reason === 'clean-exit') return;
  const ign = d.reason === 'killed' || d.reason === 'memory-eviction' ? d.reason : sleepish() ? '잠자기·화면 꺼짐·자리 비움 때' : gpuSafe ? '이미 안전 모드' : '';
  clog(`그래픽 프로세스 끝남: ${d.reason} (코드 ${d.exitCode})${ign ? ' · 안전 모드 안 함: ' + ign : ' → 다음 실행부터 3일 동안 그래픽 안전 모드'}`); if (ign) return;
  try { fs.mkdirSync(path.dirname(GPU_SAFE()), { recursive: true }); fs.writeFileSync(GPU_SAFE(), JSON.stringify({ at: Date.now(), why: d.reason, code: d.exitCode, v: appVer() })); } catch (_) {} });
let closeOk = false;
const DEV_OK = () => process.argv.includes('--dev') || fs.existsSync(path.join(__dirname, 'admin_key.js'));
let SECONDARY = 0;   // 11/6: 운영자 PC에서 두 번째로 띄운 창이면 2·3·4 (아래 '게임은 한 PC에 하나만' 참고)
const SAVE_DIR = () => path.join(app.getPath('userData'), 'saves');

function createWindow(page, query) {
  const win = new BrowserWindow({
    width: 1280,
    height: 760,
    minWidth: 960,
    minHeight: 560,
    backgroundColor: '#0d0a0e',
    title: SECONDARY ? `아덴 월드 [창 ${SECONDARY}]` : '아덴 월드',
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
  win.on('close', (e) => { if (closeOk || /kicked\.html/.test(win.webContents.getURL())) return;   /* 안내 창은 저장할 게임이 없으니 바로 닫음 */ e.preventDefault(); win.__closing = true; try { win.webContents.send('app:closing'); } catch (_) {} setTimeout(() => { closeOk = true; if (!win.isDestroyed()) win.close(); }, 4000); });
  win.loadFile(page || 'index.html', query ? { query } : undefined);
  // 11/4 멈춤 복구: 게임 창 프로세스가 죽으면(메모리 부족·오류·멈춰서 끔) 창이 까맣게 멈춘 채로 남던 것 → 기록하고 다시 불러와 그 자리에서 이어서 (10분에 3번까지)
  win.webContents.on('render-process-gone', (_e, d) => { const r = (d && d.reason) || '?', forced = !!win.__why, why = win.__why || ('창 프로세스 ' + r); win.__why = null; clearTimeout(win.__whyT);
    clog(`게임 창 프로세스 끝남: ${r} (코드 ${d && d.exitCode}) · ${why}`); if (r === 'clean-exit' && !forced) return; revive(win, why); });
  win.on('unresponsive', () => { clog('게임 창 응답 없음'); clearTimeout(win.__hangT); win.__hangT = setTimeout(() => { win.__hangT = null; if (!win.isDestroyed()) hangKill(win, '응답 없음 15초'); }, 15000); });   // 15초 더 기다려도 그대로면 끄고 다시
  win.on('responsive', () => { if (!win.__hangT) return; clearTimeout(win.__hangT); win.__hangT = null; clog('게임 창 응답 다시 옴'); });
  win.webContents.on('did-navigate', (_e, url) => { if (win.__stop && /index\.html/.test(url)) { win.__stop = false; RV.length = 0; } });   // 멈춤 안내 창에서 [다시 접속하기] → 다시 자동 복구
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
  if (SECONDARY) return { ok: false, err: 'secondary' };   // 11/6: 두 번째 창부터는 파일 업데이트를 안 함 (첫 창이 함 · 같은 폴더를 두 창이 같이 고치지 않게)
  const base0 = updateBase(); if (!base0) return { ok: false, err: 'nobase' }; const base = base0;   // 11/3: 확인(2분마다)은 커밋 고정 안 함 — api.github.com 한 시간 60번 제한 (몇 분 늦게 알아도 됨 · 받을 때만 고정)
  try { const m = await manifest(base); return { ok: true, ver: m.ver | 0 }; } catch (e) { return { ok: false, err: String(e.message || e) }; }
});
ipcMain.handle('update:run', async (e) => {
  if (SECONDARY) return { ok: false, err: '두 번째 창에서는 업데이트하지 않아요 — 첫 번째 창에서 업데이트해 주세요' };
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
ipcMain.handle('app:kicked', (e, r) => { const old = BrowserWindow.fromWebContents(e.sender); const b = old && !old.isDestroyed() ? old.getBounds() : null, max = old && old.isMaximized(); if (old) old.__dying = true;
  const nw = createWindow('kicked.html', { r: r === 'admin' ? 'admin' : 'dup' }); if (b) nw.setBounds(b); if (max) nw.maximize();
  if (old && !old.isDestroyed()) setTimeout(() => { try { old.destroy(); } catch (_) {} }, 300); return true; });
const md = t => { const d = new Date(t), p2 = n => String(n).padStart(2, '0'); return `${d.getMonth() + 1}/${d.getDate()} ${p2(d.getHours())}:${p2(d.getMinutes())}`; };
ipcMain.handle('gpu:status', () => { const x = { safe: gpuSafe, until: gpuSafe ? md(gpuSafeAt + GPU_SAFE_MS) : '', rv: RVN }; try { return { st: app.getGPUFeatureStatus(), ...x }; } catch (err) { return { st: {}, ...x }; } });   // 11/2: /렉 진단 · 11/4: 안전 모드 끝나는 때 · 멈춤 복구 횟수
// ===== 관찰 기록기: 플레이 기록과 게임 창 캡처를 게임 폴더 logs/ 에 남김 (모니터 리포트용 · 이 PC에만 저장)
const LOG_DIR = () => path.join(APP_DIR, 'logs');
ipcMain.handle('log:append', (_e, name, text) => { try { if (typeof name !== 'string' || !/^[\w\-.]+\.jsonl$/.test(name) || typeof text !== 'string' || text.length > 2e6) return false; fs.mkdirSync(LOG_DIR(), { recursive: true }); const f = path.join(LOG_DIR(), name); try { if (fs.statSync(f).size > 40e6) return false; } catch (_) {} fs.appendFileSync(f, text, 'utf-8'); return true; } catch (err) { return false; } });
ipcMain.handle('log:shot', async (e) => { try { const w = BrowserWindow.fromWebContents(e.sender); if (!w || w.isMinimized()) return false; const img = await w.webContents.capturePage(); if (img.isEmpty()) return false; const sz = img.getSize(), sm = sz.width > 1280 ? img.resize({ width: 1280 }) : img;
  const dir = path.join(LOG_DIR(), 'shots'); fs.mkdirSync(dir, { recursive: true }); const d = new Date(), p2 = n => String(n).padStart(2, '0'); const name = `shot-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}.jpg`;
  fs.writeFileSync(path.join(dir, name), sm.toJPEG(72)); const all = fs.readdirSync(dir).filter(x => /^shot-.*\.jpg$/.test(x)).sort(); for (const x of all.slice(0, Math.max(0, all.length - 18))) { try { fs.unlinkSync(path.join(dir, x)); } catch (_) {} } return name; } catch (err) { return false; } });

// ===== 11/4 멈춤 복구 (오래 켜 두거나 절전 화면에 둔 채 화면이 꺼지거나 잠자기에 들어갔다 오면 게임 창이 까맣게 멈춘 채로 안 돌아오던 것)
//   ① 게임 창 프로세스가 죽음(render-process-gone) → crash.log에 적고 index.html?rc=1로 다시 불러옴 → 게임이 10초마다 적어 둔 자리(aden_rc)에서 이어서 (로그인·자동사냥·절전 그대로)
//   ② 응답 없음 15초 · 잠자기/잠금 해제/화면 깨어남 뒤 10초 안에 대답이 없음 · 1분마다 확인해서 20초 안에 대답이 없음 → 멈춘 프로세스를 끄고 ①
//   ③ 10분에 3번 넘게 다시 불러오면 멈추고 안내 창(kicked.html?r=crash) — 계속 죽는데 무한히 다시 불러오지 않게
const RV = []; let RVN = 0, pingSeq = 0;
const isGame = w => !!w && !w.isDestroyed() && !w.__dying && !w.webContents.isDestroyed() && /index\.html/.test(w.webContents.getURL());
function revive(w, why) { if (!w || w.isDestroyed() || w.__dying || w.__closing || closeOk) return false; const wc = w.webContents; if (wc.isDestroyed()) return false; unping(w);
  const n = Date.now(); while (RV.length && n - RV[0] > 600000) RV.shift(); const kick = /kicked\.html/.test(wc.getURL());
  if (RV.length >= 3) { clog(`자동 복구 멈춤 (10분에 3번) · ${why}`); w.__stop = true; w.loadFile('kicked.html', { query: { r: 'crash' } }); return false; }
  RV.push(n); RVN++; clog(`다시 불러옴 (${RV.length}/3) · ${why}`); if (kick) wc.reload(); else w.loadFile('index.html', { query: { rc: '1' } }); return true; }
function hangKill(w, why) { if (!w || w.isDestroyed() || w.__why) return; w.__why = why; clog(`멈춘 게임 창 프로세스를 끔 · ${why}`);
  w.__whyT = setTimeout(() => { if (w.__why === why) { w.__why = null; revive(w, why); } }, 4000);   // 끈 뒤 render-process-gone이 안 오면 그냥 다시 불러옴
  try { w.webContents.forcefullyCrashRenderer(); } catch (_) {} }
function unping(w) { if (w.__pingT) clearTimeout(w.__pingT); w.__pingT = null; w.__ping = null; }
function ping(w, why, ms) { if (!isGame(w) || w.__pingT || w.__why || w.__closing || w.webContents.isCrashed() || w.webContents.isLoading() || w.webContents.isDevToolsOpened()) return false; const id = ++pingSeq, t0 = Date.now(); w.__ping = { id, why, t0 };
  try { w.webContents.send('app:wake', { id, why }); } catch (_) { w.__ping = null; return false; }
  w.__pingT = setTimeout(() => { w.__pingT = null; const p = w.__ping; w.__ping = null; if (!p || p.id !== id || !isGame(w) || Date.now() - beatAt > 20000) return;   /* 그 사이 컴퓨터가 잠들었으면 다음에 다시 */
    hangKill(w, `대답 없음 ${Math.round((Date.now() - t0) / 1000)}초 (${why})`); }, ms); return true; }
ipcMain.on('app:pong', (e, id, st) => { const w = BrowserWindow.fromWebContents(e.sender); if (!w || !w.__ping || w.__ping.id !== id) return; const p = w.__ping; unping(w);
  if (p.why !== 'beat' || (st && (st.lost || st.err))) clog(`게임 창 대답 (${p.why}) ${Date.now() - p.t0}ms ${JSON.stringify(st || {}).slice(0, 200)}`); });
function wake(why) { wakeAt = Date.now(); sleeping = false; clog('깨어남: ' + why); for (const w of BrowserWindow.getAllWindows()) { if (!isGame(w)) continue; try { w.webContents.invalidate(); } catch (_) {} unping(w); ping(w, why, 10000); } }   // 다시 그리기 + 살아 있는지 확인
function watchPower() { let idle0 = 0, n = 0;
  powerMonitor.on('suspend', () => { sleeping = true; clog('잠자기'); BrowserWindow.getAllWindows().forEach(unping); });
  powerMonitor.on('resume', () => { sleeping = false; wake('잠자기에서 깨어남'); });
  powerMonitor.on('lock-screen', () => { locked = true; clog('화면 잠김'); });
  powerMonitor.on('unlock-screen', () => { locked = false; wake('화면 잠금 해제'); });
  try { screen.on('display-added', () => wake('모니터 연결')); screen.on('display-removed', () => { wakeAt = Date.now(); clog('모니터 빠짐'); }); } catch (_) {}   // 화면이 꺼지면 모니터가 빠졌다 다시 붙는 PC가 있음
  setInterval(() => { const t = Date.now(), gap = t - beatAt; beatAt = t; if (gap > 30000 && t - wakeAt > 10000) wake(`멈춤 ${Math.round(gap / 1000)}초 뒤`);   // 잠자기 알림이 안 와도 시계로 알아챔
    const s = idleSec(); if (idle0 >= 300 && s < 30) wake(`자리 비움 ${Math.round(idle0 / 60)}분 뒤 돌아옴`); idle0 = s;   // 화면이 꺼졌다 켜짐 (입력 없이 5분 넘게 → 다시 입력)
    if (++n % 12 === 0) for (const w of BrowserWindow.getAllWindows()) ping(w, 'beat', 20000); }, 5000); }   // 1분마다 살아 있는지

// 11/3: 게임은 한 PC에 하나만 — 이미 켜져 있으면 새로 띄우지 않고 켜져 있는 창을 앞으로 (작업 표시줄에 남은 예전 창 + 새 창이 겹쳐 메모리를 두 배로 쓰던 것)
// 11/6 프로듀서: 운영자 PC(게임 폴더에 admin_key.js가 있는 PC)에서만 창을 4개까지 — 본계정과 운영자 계정을 같이 켜서 지켜보려고
//   창마다 저장 공간(로그인·설정)을 따로 씀: 첫 창 = 원래 userData · 두 번째부터 userData-2, -3, -4 · 두 번째 창부터는 파일 업데이트를 안 함 · 다른 PC는 지금처럼 하나만
const OP_PC = fs.existsSync(path.join(__dirname, 'admin_key.js'));
let gotLock = OP_PC ? app.requestSingleInstanceLock({ multi: true }) : app.requestSingleInstanceLock();
if (!gotLock && OP_PC) { try { const base = app.getPath('userData'); for (let k = 2; k <= 4 && !gotLock; k++) { app.setPath('userData', base + '-' + k); gotLock = app.requestSingleInstanceLock({ multi: true }); if (gotLock) SECONDARY = k; } } catch (e) { gotLock = false; } }
if (!gotLock) app.quit();
else {
  app.on('second-instance', (_e, _argv, _cwd, data) => { if (OP_PC && data && data.multi) return;   // 운영자 PC에서 창을 더 띄울 때는 첫 창을 앞으로 가져오지 않음
    const w = BrowserWindow.getAllWindows()[0]; if (!w || w.isDestroyed()) return; if (w.isMinimized()) w.restore(); w.show(); w.focus(); });
  app.whenReady().then(() => { createWindow(); try { watchPower(); } catch (e) { clog('watchPower ' + e.message); } });
}
app.on('window-all-closed', () => app.quit());
