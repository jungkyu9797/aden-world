// 11/4 멈춤 복구 — 실제 Electron(PC 실행 파일) 확인
//   python3 dev/mkkt.py && ELECTRON_BIN=<electron> xvfb-run -a node dev/tests/pc_crashfix.js   (Electron 44 · 그래픽은 SwiftShader로 진짜 그래픽 프로세스를 띄움)
//   시험용 앱 폴더 dev/out/pcapp: 지금 main.js·preload.js·kicked.html + 테스트 페이지(_kt2.html = 데모 계정)를 index.html로 · src·assets는 저장소 것
// ① 게임 창 프로세스가 죽음 → 다시 불러와 같은 사냥터·자동사냥 그대로 ② 절전 중 죽음 → 절전 이어서 ③ 깨어남(resume) 확인: 대답하면 그대로
// ④ 응답 없음 → 응답 옴이면 그대로 · 진짜 멈춤이면 끄고 다시 ⑤ 10분에 3번 넘으면 안내 창 · [다시 접속하기] 뒤 다시 자동 복구
// ⑥ 진짜 멈춤 + 깨어남 → 10초 안에 대답 없음 → 끄고 다시 ⑦ 그래픽 프로세스가 죽음: 깨어난 직후·자리 비움·killed면 gpu_safe 안 씀 / 그냥 죽으면 씀
//   + 캔버스가 비었다가(확인) 다시 불러와 그림을 새로 만듦 · 10분에 2번 넘으면 안내만 ⑧ gpu_safe: 3일 지남·업데이트·예전 기록이면 지우고 다시 그래픽카드 / 1일이면 안전 모드 유지
const { _electron } = require('playwright'); const fs = require('fs'), path = require('path'), os = require('os');
const BIN = process.env.ELECTRON_BIN || '/home/claude/pcbuild/elx/electron', R = path.resolve(__dirname, '../..'), DIR = path.join(R, 'dev/out/pcapp');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
// ---- 시험용 앱 폴더
fs.rmSync(DIR, { recursive: true, force: true }); fs.mkdirSync(DIR, { recursive: true });
fs.writeFileSync(path.join(DIR, 'package.json'), JSON.stringify({ name: 'aden-crashfix-test', main: 'main.js' }));
for (const f of ['main.js', 'preload.js', 'kicked.html', 'version.json']) fs.copyFileSync(path.join(R, f), path.join(DIR, f));
fs.writeFileSync(path.join(DIR, 'update.json'), JSON.stringify({ base: 'http://127.0.0.1:9/' }));   // 업데이트 확인은 바로 실패 (지금 버전으로 접속)
if (!fs.existsSync(path.join(R, '_kt2.html'))) { console.log('FAIL 먼저 python3 dev/mkkt.py'); process.exit(1); }
fs.copyFileSync(path.join(R, '_kt2.html'), path.join(DIR, 'index.html'));
for (const d of ['src', 'assets']) fs.symlinkSync(path.join(R, d), path.join(DIR, d));
const UD = path.join(os.homedir(), '.config', 'aden-crashfix-test'); fs.rmSync(UD, { recursive: true, force: true });
const LOGF = path.join(UD, 'crash.log'), SAFEF = path.join(UD, 'gpu_safe'), VER = JSON.parse(fs.readFileSync(path.join(R, 'version.json'), 'utf8')).ver | 0;
const logTxt = () => { try { return fs.readFileSync(LOGF, 'utf8'); } catch (e) { return ''; } };
const ARGS = [DIR, '--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

async function launch() { const app = await _electron.launch({ executablePath: BIN, args: ARGS, env: { ...process.env, ELECTRON_ENABLE_LOGGING: '0' } });
  const ev = (code, ms) => app.evaluate(async ({ BrowserWindow }, [c, ms]) => { const w = BrowserWindow.getAllWindows().find(x => !x.isDestroyed()); if (!w) return 'ERR nowin';
    try { return await Promise.race([w.webContents.executeJavaScript(c, true), new Promise(r => setTimeout(() => r('ERR timeout'), ms || 3000))]); } catch (e) { return 'ERR ' + e.message; } }, [code, ms]);
  const waitJs = async (code, ms) => { const t = Date.now(); while (Date.now() - t < ms) { const r = await ev(code).catch(e => 'ERR ' + e.message); if (r && !(typeof r === 'string' && r.startsWith('ERR'))) return r; await sleep(500); } return null; };
  const M = (fn, arg) => app.evaluate(fn, arg);
  return { app, ev, waitJs, M }; }
async function login(L, acc) { const w = await L.app.firstWindow(); await w.waitForSelector('#lg-mode', { state: 'visible', timeout: 90000 }); await w.click('#lg-mode');
  await w.fill('#lg-acc', acc); await w.fill('#lg-pw', 'abcd'); await w.fill('#lg-pw2', 'abcd'); await w.click('#lg-go');
  await w.waitForSelector('.cs-card[data-cls="knight"]', { state: 'visible', timeout: 30000 }); await w.click('.cs-card[data-cls="knight"]'); await w.click('#cs-start');
  await w.waitForSelector('#nm-in', { state: 'visible' }); await w.fill('#nm-in', 'c' + Date.now() % 1e5); await w.click('#nm-go');
  await L.waitJs("window.__gameOn && window.__T && __T.SCENE === 'town' ? 1 : 0", 60000); return w; }
const crashR = L => L.M(({ BrowserWindow }) => { BrowserWindow.getAllWindows()[0].webContents.forcefullyCrashRenderer(); return 1; });
const loadsOf = L => L.M(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].__nLoad || 0);
const gameSt = "JSON.stringify({ on: !!window.__gameOn, z: __T.ISLE && __T.ISLE.id, sc: __T.SCENE, auto: __T.AUTO.on(), sv: !!(window.SAVER && SAVER.on()), q: location.search, msg: __T.log.map(l => l.t).filter(t => /멈춰서 다시 불러왔어요|그래픽카드가 초기화/.test(t)), svn: (document.getElementById('sv-notes') || {}).textContent || '' })";
const resumed = async (L, z) => { const r = await L.waitJs(`window.__gameOn && window.__T && __T.ISLE && __T.ISLE.id === ${z} && __T.SCENE === 'field' && __T.log.some(l => /멈춰서 다시 불러왔어요/.test(l.t)) ? 1 : 0`, 90000); if (!r) return null; await sleep(1500); return L.ev(gameSt); };   // 자동사냥은 이어진 뒤 0.8초에 켜짐
const toZone = async (L, z) => { await L.ev(`__T.TOWN.toZone(${z}); 1`); await L.waitJs(`__T.ISLE && __T.ISLE.id === ${z} && __T.SCENE === 'field' ? 1 : 0`, 60000); await L.ev("__T.GOD_INV = true; if (!__T.AUTO.on()) __T.AUTO.toggle(); 1"); };
const rcSnap = L => L.ev("(() => { try { const o = JSON.parse(localStorage.getItem('aden_rc') || 'null'); return o ? JSON.stringify({ z: o.pos && o.pos.isle, auto: o.auto, sv: !!o.sv }) : 'none'; } catch (e) { return 'bad'; } })()");

(async () => {
  // ================================================================ 1번째 실행: 게임 창 프로세스 죽음·멈춤
  let L = null; if (!process.env.ONLY2) { L = await launch(); await L.M(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.__nLoad = 0; w.webContents.on('did-finish-load', () => { w.__nLoad++; }); return 1; });
  await login(L, 'cf' + Date.now() % 1e6); ok(true, '실제 Electron: 로그인 → 마을');
  await toZone(L, 2); await sleep(11000);
  const s0 = await rcSnap(L); console.log('  aden_rc', s0); ok(/"z":2/.test(s0) && /"auto":true/.test(s0), '게임 중 10초마다 aden_rc에 자리 적음 (사냥터 2 · 자동사냥)');
  // ①
  const l0 = await loadsOf(L); await crashR(L); const r1 = await resumed(L, 2); console.log('①', r1, 'loads', (await loadsOf(L)) - l0);
  ok(!!r1 && /"auto":true/.test(r1) && /"q":""/.test(r1), '① 게임 창 프로세스가 죽음 → 다시 불러와 같은 사냥터(2)·자동사냥 그대로 · 주소의 ?rc=1은 지움');
  ok(/게임 창 프로세스 끝남: crashed/.test(logTxt()) && /다시 불러옴 \(1\/3\)/.test(logTxt()), '① crash.log에 기록 (끝난 이유 · 다시 불러옴 1/3)');
  // ② 절전 중
  await L.ev("__T.GOD_INV = true; SAVER.enter(false); 1"); await sleep(11000); const s2 = await rcSnap(L); await crashR(L); const r2 = await L.waitJs(`window.__gameOn && window.SAVER && SAVER.on() && __T.ISLE && __T.ISLE.id === 2 ? (${gameSt}) : 0`, 90000); await sleep(1500);
  const r2b = await L.ev(gameSt); console.log('②', s2, r2b); ok(/"sv":true/.test(s2) && !!r2 && /"sv":true/.test(r2b) && /멈춰서 다시 불러온 뒤 절전 모드를 이어서/.test(r2b), '② 절전 중 죽음 → 다시 불러와 절전 화면 그대로 (안내: 멈춰서 다시 불러온 뒤 절전 이어서)');
  await L.ev("SAVER.exit(); 1");
  // ③ 깨어남: 대답하면 그대로
  const l3 = await loadsOf(L); await L.M(({ powerMonitor }) => { powerMonitor.emit('resume'); return 1; }); await sleep(3000);
  const t3 = logTxt(); console.log('③', (t3.match(/게임 창 대답 \(잠자기에서 깨어남\).*/) || [''])[0]); ok(/깨어남: 잠자기에서 깨어남/.test(t3) && /게임 창 대답 \(잠자기에서 깨어남\) \d+ms .*"lost":false/.test(t3) && (await loadsOf(L)) === l3, '③ 잠자기에서 깨어남 → 게임 창에 물어봄 → 대답(캔버스 정상) → 다시 불러오지 않음');
  await sleep(11000);
  const l4 = await loadsOf(L); await L.M(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.emit('unresponsive'); setTimeout(() => w.emit('responsive'), 3000); return 1; }); await sleep(17000);
  ok((await loadsOf(L)) === l4 && /게임 창 응답 다시 옴/.test(logTxt()), '④ 응답 없음 → 3초 뒤 응답 옴 → 끄지 않음');
  // ④ 진짜 멈춤 + 응답 없음
  await L.ev("setTimeout(() => { const t = Date.now(); while (Date.now() - t < 90000) {} }, 50); 1"); await sleep(500); await L.M(({ BrowserWindow }) => { BrowserWindow.getAllWindows()[0].emit('unresponsive'); return 1; });
  const r4 = await resumed(L, 2); const t4 = logTxt(); console.log('④', r4, (t4.match(/멈춘 게임 창 프로세스를 끔 · .*/g) || []).slice(-1)[0]);
  ok(!!r4 && /멈춘 게임 창 프로세스를 끔 · (응답 없음 15초|대답 없음 \d+초 \(beat\))/.test(t4) && /다시 불러옴 \(3\/3\)/.test(t4), '④ 진짜로 멈춘 채 응답 없음 15초 → 프로세스를 끄고 다시 불러와 그 자리에서 (3/3)');
  // ⑤ 10분에 3번 넘음 → 안내 창
  await sleep(11000); await crashR(L); const k5 = await L.waitJs("/kicked\\.html\\?r=crash/.test(location.href) ? document.body.innerText : 0", 30000); console.log('⑤', JSON.stringify(k5 && k5.slice(0, 80)));
  ok(!!k5 && /자동 복구를 멈췄어요/.test(k5) && /자동 복구 멈춤 \(10분에 3번\)/.test(logTxt()), '⑤ 10분 안에 4번째로 죽으면 더 다시 불러오지 않고 안내 창 (crash.log에도)');
  await L.ev("document.getElementById('re').click(); 1"); const i5 = await L.waitJs("document.getElementById('lg-mode') ? location.href : 0", 60000);
  await crashR(L); const k5b = await L.waitJs("document.getElementById('lg-mode') && !/kicked/.test(location.href) ? location.href : 0", 60000); await sleep(1000);
  const last5 = logTxt().trim().split('\n').filter(x => /다시 불러옴|자동 복구 멈춤/.test(x)).slice(-1)[0] || ''; console.log('⑤b', last5);
  ok(!!i5 && !!k5b && /다시 불러옴 \(1\/3\)/.test(last5), '⑤ 안내 창 [다시 접속하기] → 게임 처음 화면 · 그 뒤로는 다시 자동 복구 (1/3부터)');
  { const tc = Date.now(); const closed = new Promise(r => L.app.on('close', r)); await L.M(({ BrowserWindow }) => { BrowserWindow.getAllWindows()[0].close(); return 1; }); await Promise.race([closed, sleep(12000)]); ok(Date.now() - tc < 11000, `창 닫기 → 앱 종료 (${((Date.now() - tc) / 1000).toFixed(1)}초 · 닫는 동안 다시 불러오지 않음)`); }
  try { await L.app.close(); } catch (e) {} }

  // ================================================================ 2번째 실행: 진짜 멈춤 + 깨어남 · 그래픽 프로세스
  fs.mkdirSync(UD, { recursive: true }); fs.writeFileSync(LOGF, ''); L = await launch(); await L.M(({ powerMonitor }) => { powerMonitor.getSystemIdleTime = () => 0; return 1; });   // xvfb는 X 입력이 없어 '자리 비움'으로 보임 → 시험에선 0
  await login(L, 'cg' + Date.now() % 1e6); await toZone(L, 2); await sleep(11000);
  const gpu0 = await L.M(({ app }) => JSON.stringify(app.getGPUFeatureStatus()['2d_canvas'] + ' ' + app.commandLine.hasSwitch('ignore-gpu-blocklist'))); console.log('  2d_canvas · ignore-gpu-blocklist', gpu0);
  // ⑦-a 그냥 죽음 → gpu_safe 씀 · 캔버스 비었다가 다시 불러와 새로 만듦
  const groundPx = "(() => { const g = __T.ISLE && __T.ISLE.ground; if (!g || !g.width) return 'none'; const t = document.createElement('canvas'); t.width = t.height = 1; const x = t.getContext('2d', { willReadFrequently: true }); x.drawImage(g, Math.floor(g.width / 2), Math.floor(g.height / 2), 1, 1, 0, 0, 1, 1); return Array.from(x.getImageData(0, 0, 1, 1).data).join(','); })()";
  const gA = await L.ev(groundPx, 30000); await L.ev(`document.getElementById('cv').addEventListener('contextrestored', () => { try { sessionStorage.setItem('t_px', ${groundPx}); } catch (e) {} }); 1`);
  const kGpu = sig => L.M(({ app }, s) => { const g = app.getAppMetrics().find(m => m.type === 'GPU'); if (!g) return 0; process.kill(g.pid, s); return g.pid; }, sig);
  const p7 = await kGpu('SIGSEGV'); const r7 = await resumed(L, 2); const blank = await L.ev("sessionStorage.getItem('t_px')"), gB = await L.ev(groundPx, 30000); const sf = fs.existsSync(SAFEF) ? fs.readFileSync(SAFEF, 'utf8') : 'none';
  console.log('⑦a gpu pid', p7, 'ground before', gA, 'right after GPU crash', blank, 'after reload', gB, '| gpu_safe', sf, '|', r7);
  ok(!!p7 && /"why":"crashed"/.test(sf) && /"v":\d+/.test(sf) && /그래픽 프로세스 끝남: crashed .*3일 동안 그래픽 안전 모드/.test(logTxt()), '⑦a 그래픽 프로세스가 그냥 죽음 → gpu_safe {시각·이유·버전} → 다음 실행부터 3일 안전 모드');
  ok(/,255$/.test(gA) && blank === '0,0,0,0', `⑦a 확인: 그래픽 프로세스가 죽으면 미리 그려 둔 바닥 그림이 빈 그림이 됨 (${gA} → ${blank})`);
  ok(!!r7 && /,255$/.test(gB) && /"auto":true/.test(r7), '⑦a 화면 캔버스를 되찾음 → 저장 뒤 다시 불러와 바닥 그림을 새로 만듦 · 같은 사냥터·자동사냥 그대로');
  fs.rmSync(SAFEF, { force: true });
  // ⑥ 진짜 멈춤 + 깨어남 → 10초 안에 대답 없음 → 끄고 다시
  await sleep(11000); await L.ev("setTimeout(() => { const t = Date.now(); while (Date.now() - t < 90000) {} }, 50); 1"); await sleep(800); const t6 = Date.now();
  await L.M(({ powerMonitor }) => { powerMonitor.emit('suspend'); powerMonitor.emit('resume'); return 1; }); const r6 = await resumed(L, 2); const lg6 = logTxt();
  console.log('⑥', ((Date.now() - t6) / 1000).toFixed(1) + 's', (lg6.match(/멈춘 게임 창 프로세스를 끔 · .*/) || [''])[0]);
  ok(!!r6 && /멈춘 게임 창 프로세스를 끔 · 대답 없음 1\d초 \(잠자기에서 깨어남\)/.test(lg6) && /다시 불러옴 \(1\/3\)/.test(lg6), '⑥ 깨어난 뒤 게임 창이 10초 안에 대답 없음 → 멈춘 프로세스를 끄고 다시 불러와 그 자리에서');
  // ⑦-b 깨어난 직후(3분 안) 그래픽 프로세스가 죽음 → gpu_safe 안 씀
  await sleep(11000); const p7b = await kGpu('SIGSEGV'); const r7b = await resumed(L, 2); await sleep(500);
  ok(!!p7b && !fs.existsSync(SAFEF) && /그래픽 프로세스 끝남: crashed .*안전 모드 안 함: 잠자기/.test(logTxt()), '⑦b 잠자기에서 깨어난 지 3분 안에 그래픽 프로세스가 죽음 → gpu_safe 안 씀');
  ok(!!r7b, '⑦b 캔버스 되찾음 → 다시 불러와 이어서 (10분에 2번째)');
  // ⑦-c killed → 안 씀 · 캔버스 다시 불러오기는 10분에 2번까지 → 3번째는 안내만
  await sleep(6000); const c7 = await L.waitJs("window.__crf ? sessionStorage.getItem('aden_crf') : 0", 20000), l7c = await L.waitJs("String(performance.timeOrigin)", 20000);
  const p7c = await kGpu('SIGKILL'); await sleep(9000); const lg7 = logTxt(); const l7d = await L.waitJs("String(performance.timeOrigin)", 20000); console.log('  aden_crf', c7, 'reloaded', l7c !== l7d);
  const m7 = await L.ev("JSON.stringify({ on: !!window.__gameOn, msg: __T.log.slice(-8).map(l => l.t).filter(t => /그림이 빠졌을 수 있어요/.test(t)).length })"); console.log('⑦c', p7c, m7, (lg7.match(/그래픽 프로세스 끝남: killed.*/) || [''])[0]);
  ok(!!p7c && !fs.existsSync(SAFEF) && /그래픽 프로세스 끝남: killed .*안전 모드 안 함: killed/.test(lg7), "⑦c 그래픽 프로세스를 밖에서 끔(killed) → gpu_safe 안 씀");
  ok(/"on":true/.test(m7) && /"msg":1/.test(m7), '⑦c 캔버스 다시 불러오기는 10분에 2번까지 → 3번째는 안내만 하고 게임은 그대로');
  // ⑦-d 자리 비움(입력 없이 2분 넘게) 중 죽음 → 안 씀
  await L.M(({ powerMonitor }) => { powerMonitor.getSystemIdleTime = () => 600; return 1; }); await sleep(500);
  const p7d = await kGpu('SIGSEGV'); await sleep(4000);
  ok(!p7d || (!fs.existsSync(SAFEF) && /안전 모드 안 함: 잠자기·화면 꺼짐·자리 비움 때/.test(logTxt())), `⑦d 자리 비움 중 그래픽 프로세스가 죽음 → gpu_safe 안 씀${p7d ? '' : ' (그래픽 프로세스가 더 없음 — 크롬이 그래픽카드를 껐음)'}`);
  try { await L.app.close(); } catch (e) {}

  // ================================================================ ⑧ gpu_safe 기한·업데이트
  const DAY = 86400e3, cases = [['1일 전 · 같은 버전', { at: Date.now() - DAY, why: 'crashed', v: VER }, true], ['4일 전', { at: Date.now() - 4 * DAY, why: 'crashed', v: VER }, false],
    ['게임 업데이트(버전 다름)', { at: Date.now() - 3600e3, why: 'crashed', v: VER - 1 }, false], ['예전 기록(글자)', '2026-11-02T10:00:00.000Z crashed', false]];
  for (const [nm, o, keep] of cases) { fs.mkdirSync(UD, { recursive: true }); fs.writeFileSync(SAFEF, typeof o === 'string' ? o : JSON.stringify(o));
    L = await launch(); const w = await L.app.firstWindow(); await w.waitForSelector('#lg-mode', { state: 'visible', timeout: 90000 });
    const st = await L.ev("window.native.gpuStatus().then(r => JSON.stringify({ safe: r.safe, until: r.until }))"); const sw = await L.M(({ app }) => app.commandLine.hasSwitch('ignore-gpu-blocklist'));
    console.log('⑧', nm, st, 'ignore-gpu-blocklist', sw, 'file', fs.existsSync(SAFEF));
    ok(keep ? (fs.existsSync(SAFEF) && /"safe":true/.test(st) && /"until":"\d+\/\d+ \d\d:\d\d"/.test(st) && !sw) : (!fs.existsSync(SAFEF) && /"safe":false/.test(st) && sw), `⑧ gpu_safe ${nm} → ${keep ? '안전 모드 유지 (/렉에 끝나는 때)' : '지우고 다시 그래픽카드 (차단 목록 무시)'}`);
    try { await L.app.close(); } catch (e) {} }
  console.log(fails ? `FAIL ${fails}` : 'ALL OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL 오류', e && e.stack || e); process.exit(1); });
