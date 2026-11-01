#!/usr/bin/env node
// 아덴 월드 24시간 봇 서버 러너 (11/1 · dev/rooms/bothost.md)
// 크로뮴(헤드리스) 1개 + 지역마다 페이지 1개를 '봇 호스트 모드'(?bothost=1&zone=N)로 열어 두고 지킨다.
//   · 로그인 화면에 config.json의 계정·비밀번호를 입력(게임 코드에는 자격 증명 없음) → 게임이 캐릭터를 골라 그 지역으로 들어가 호스트가 됨
//   · healthSec(30초)마다 window.__BH(ok·host·fps·tick) 확인 → 60초 넘게 이상하면 그 페이지만 새로 고침 · 5번 연속이면 브라우저 재시작
//   · versionSec(5분)마다 version.json(GAME_VER) 확인 → 바뀌면 페이지 전부 순서대로 새로(새 컨텍스트 = 캐시 없음)
//   · 크로뮴 RSS 합이 memCapMB 넘으면 브라우저 재시작 · 로그는 stdout(journald)에 한 줄씩
// 쓰는 법: node run.js [--config 경로]   (기본 config.json · 없으면 config.example.json 을 복사해서 채우세요)
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

// ----- 설정
const argv = process.argv.slice(2), ci = argv.indexOf('--config'), cfgPath = path.resolve(ci >= 0 && argv[ci + 1] ? argv[ci + 1] : path.join(__dirname, 'config.json'));
if (!fs.existsSync(cfgPath)) { console.error(`설정 파일이 없어요: ${cfgPath}\n  cp config.example.json config.json 한 뒤 계정·비밀번호를 적어 주세요.`); process.exit(2); }
const C = Object.assign({ url: 'https://jungkyu9797.github.io/aden-world/', account: '', password: '', zones: [2, 4, 6, 8, 10, 12, 17, 23], healthSec: 30, versionSec: 300, memCapMB: 3000, shareProcess: true, versionUrl: 'https://raw.githubusercontent.com/jungkyu9797/aden-world/main/version.json', badSec: 60, badMax: 5, storageState: null, loginTimeoutSec: 90, killStray: true }, JSON.parse(fs.readFileSync(cfgPath, 'utf8')));
if (process.env.ADEN_BH_ACCOUNT) C.account = process.env.ADEN_BH_ACCOUNT; if (process.env.ADEN_BH_PASSWORD) C.password = process.env.ADEN_BH_PASSWORD;   // 환경 변수로도 넣을 수 있음
if (!C.account || !C.password || /여기에/.test(C.password)) { console.error('config.json 에 account(계정)·password(비밀번호)를 적어 주세요.'); process.exit(2); }
C.zones = [...new Set(C.zones.map(z => +z | 0).filter(z => z > 0))];
const ts = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
const log = (...a) => console.log(ts(), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tmo = (p, ms, fb) => Promise.race([p.catch(() => fb), sleep(ms).then(() => fb)]);   // 멈춘 페이지에 evaluate가 영영 안 돌아오지 않게
const zoneUrl = z => C.url + (C.url.includes('?') ? '&' : '?') + 'bothost=1&zone=' + z;

// ----- 크로뮴 메모리 (RSS 합 · MB): playwright 브라우저 폴더(~/.cache/ms-playwright)에서 시작한 프로세스 전부 — 헤드리스 셸·크로뮴 둘 다 (/proc · 리눅스만 · 못 재면 -1)
const EXE_DIR = (() => { try { return path.resolve(chromium.executablePath(), '..', '..', '..'); } catch (e) { return ''; } })();
function rssMB() { if (!EXE_DIR || !fs.existsSync('/proc')) return -1; let total = 0;
  for (const d of fs.readdirSync('/proc')) { if (!/^\d+$/.test(d)) continue; try { const c = fs.readFileSync(`/proc/${d}/cmdline`, 'utf8'); if (!c.includes(EXE_DIR)) continue; const m = /VmRSS:\s+(\d+)/.exec(fs.readFileSync(`/proc/${d}/status`, 'utf8')); if (m) total += +m[1]; } catch (e) {} }
  return Math.round(total / 1024); }
// 브라우저를 닫아도 남은 크로뮴 프로세스가 있으면 죽임 (이 서버는 봇 서버 전용이라는 전제 · config killStray:false 로 끌 수 있음)
function killStray() { if (!C.killStray || !EXE_DIR || !fs.existsSync('/proc')) return 0; let n = 0; for (const d of fs.readdirSync('/proc')) { if (!/^\d+$/.test(d)) continue; try { if (!fs.readFileSync(`/proc/${d}/cmdline`, 'utf8').includes(EXE_DIR)) continue; process.kill(+d, 'SIGKILL'); n++; } catch (e) {} } if (n) log(`[browser] 남은 크로뮴 프로세스 ${n}개 정리`); return n; }

// ----- 브라우저
let browser = null, context = null, stopping = false, restarts = 0;
const Z = new Map();   // zone → { page, bad(연속 이상 헬스체크 수), badAt(처음 이상해진 시각), reloads(연속 새로고침 수), st(마지막 __BH), ok }
async function startBrowser() {
  const args = ['--disable-gpu', '--mute-audio', '--no-sandbox', '--disable-dev-shm-usage', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-extensions', '--no-first-run'];
  if (C.shareProcess) args.push('--process-per-site', '--renderer-process-limit=1');   // 페이지 8개가 렌더러 프로세스 하나를 같이 씀 (8탭 1.6GB → 0.75GB)
  browser = await chromium.launch({ headless: true, args });
  browser.on('disconnected', () => { if (!stopping) { log('[browser] 끊김 — 다시 시작'); setTimeout(() => restartAll('disconnected').catch(e => log('[err]', e.message)), 3000); } });
  await newContext(); }
async function newContext() {
  const opt = { viewport: { width: 320, height: 200 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul', serviceWorkers: 'block' };
  if (C.storageState && fs.existsSync(path.resolve(path.dirname(cfgPath), C.storageState))) opt.storageState = path.resolve(path.dirname(cfgPath), C.storageState);   // 테스트용(로컬 계정)
  context = await browser.newContext(opt);
  await context.route(/\.(webp|png|jpe?g|gif|svg|ico|mp3|ogg|wav|woff2?|ttf|otf)(\?|$)|fonts\.googleapis|fonts\.gstatic/i, r => r.abort().catch(() => {}));   // 그림·소리·글꼴은 받지 않음 (게임도 안 쓰지만 이중으로)
  context.setDefaultTimeout(30000); }
async function closeBrowser() { try { if (browser) browser.removeAllListeners('disconnected'); } catch (e) {} await tmo(context ? context.close() : Promise.resolve(), 15000, null); await tmo(browser ? browser.close() : Promise.resolve(), 15000, null); context = null; browser = null; Z.clear(); await sleep(1000); killStray(); }

// ----- 페이지 하나 열기 (로그인 → 봇 호스트 모드가 알아서 캐릭터 선택·지역 입장)
async function openZone(z) {
  const old = Z.get(z); if (old && old.page) await tmo(old.page.close(), 10000, null);
  const page = await context.newPage(); const S = { page, bad: 0, badAt: 0, reloads: old ? old.reloads : 0, st: null, ok: false, since: Date.now() }; Z.set(z, S);
  let ceAt = 0; page.on('console', m => { const t = m.text(); if (/^\[BH\]/.test(t)) log(`[z${z}]`, t); else if (m.type() === 'error' && !/favicon|net::ERR_FAILED|ERR_ABORTED|404/.test(t) && Date.now() - ceAt > 60000) { ceAt = Date.now(); log(`[z${z}] console.error`, t.slice(0, 200)); } });   // 콘솔 오류는 지역마다 1분에 한 줄만
  page.on('pageerror', e => log(`[z${z}] pageerror`, String(e && e.message || e).slice(0, 200)));
  page.on('crash', () => { log(`[z${z}] 페이지 크래시`); S.ok = false; S.bad = 99; });
  try { await page.goto(zoneUrl(z), { waitUntil: 'domcontentloaded', timeout: 60000 }); }
  catch (e) { log(`[z${z}] 페이지 열기 실패: ${e.message.slice(0, 120)}`); return S; }
  try { await loginIfNeeded(page, z); } catch (e) { log(`[z${z}] 로그인 중 오류: ${String(e && e.message || e).slice(0, 120)}`); }
  const t0 = Date.now(); let st = null;
  while (Date.now() - t0 < C.loginTimeoutSec * 1000) { st = await bh(page); if (st && st.ok) break; if (st && /^(fail|badzone)$/.test(st.phase)) break; await sleep(1000); }
  S.st = st; S.ok = !!(st && st.ok); log(`[z${z}] ${S.ok ? '입장 완료' : '입장 못 함'} phase=${st ? st.phase : '-'} err=${st && st.err || '-'} host=${st ? st.host : '-'} v${st ? st.ver : '-'}`);
  return S; }
async function loginIfNeeded(page, z) {
  // 로그인 화면이 뜨면 계정·비번 입력 · 자동 로그인(aden_auto)이 있으면 캐릭터 선택으로 바로 감 → 게임이 알아서 고름
  for (let k = 0; k < 40; k++) { const v = await tmo(page.evaluate(() => { const lg = document.getElementById('loginscr'), cs = document.getElementById('charsel'); return { lg: !!lg && !lg.hidden, cs: !!cs && !cs.hidden, ph: window.__BH && __BH.phase, msg: (document.getElementById('lg-msg') || {}).textContent || '' }; }), 10000, null);
    if (!v) { await sleep(500); continue; }
    if (v.lg) { await page.fill('#lg-acc', C.account); await page.fill('#lg-pw', C.password); await page.click('#lg-go'); log(`[z${z}] 로그인 입력`);
      for (let j = 0; j < 60; j++) { await sleep(500); const w = await tmo(page.evaluate(() => ({ lg: !document.getElementById('loginscr').hidden, msg: (document.getElementById('lg-msg') || {}).textContent || '', cls: (document.getElementById('lg-msg') || {}).className || '' })), 10000, null); if (!w) continue; if (!w.lg) return; if (/no/.test(w.cls) && w.msg) { log(`[z${z}] 로그인 실패: ${w.msg}`); return; } }
      return; }
    if (v.cs || (v.ph && v.ph !== 'boot')) return;
    await sleep(500); } }
const bh = page => tmo(page.evaluate(() => { const S = window.__BH; return S ? { ok: !!S.ok, host: !!S.host, bots: S.bots | 0, mobs: S.mobs | 0, fps: S.fps | 0, tick: +S.tick || 0, ver: S.ver | 0, phase: String(S.phase || ''), err: String(S.err || ''), errN: S.errN | 0, peers: S.peers | 0, net: !!S.net, zoneNow: S.zoneNow | 0 } : null; }), 10000, null);

// ----- 전부 다시 (버전 바뀜 · 메모리 · 브라우저 끊김)
let restarting = false;
async function restartAll(why) { if (restarting || stopping) return; restarting = true; restarts++; log(`[restart] ${why} (${restarts}번째)`);
  try { await closeBrowser(); await startBrowser(); for (const z of C.zones) { if (stopping) break; await openZone(z); } }
  catch (e) { log('[restart] 실패:', e.message); }
  restarting = false; }

// ----- 헬스체크
let lastHealth = 0;
async function health() {
  if (restarting || !browser || !context) return;
  const now = Date.now(), parts = [], mem = rssMB(); let badTotal = 0;
  for (const z of C.zones) { const S = Z.get(z); if (!S) continue; const st = await bh(S.page); S.st = st;
    const good = !!(st && st.ok && st.host && st.fps >= 10 && now - st.tick < 15000 && st.phase === 'run');
    if (good) { S.bad = 0; S.badAt = 0; S.reloads = 0; S.ok = true; } else { S.bad++; if (!S.badAt) S.badAt = now; S.ok = false; badTotal++; }
    parts.push(`${z}:${good ? '' : '!'}${st ? (st.host ? 'host' : 'guest') + ' b' + st.bots + ' m' + st.mobs + ' ' + st.fps + 'Hz' + (st.peers ? ' p' + st.peers : '') + (st.err ? ' err=' + st.err.slice(0, 30) : '') : (st === null ? 'none' : '?')}${S.ok ? '' : ' ' + (st ? st.phase : '-')}`); }
  log(`[health] ${parts.join(' · ')} · rss ${mem}MB`);
  // 60초 넘게 이상한 페이지는 새로 고침 · 5번 연속이면 브라우저 재시작
  for (const z of C.zones) { const S = Z.get(z); if (!S || S.ok || !S.badAt || now - S.badAt < C.badSec * 1000) continue;
    if (S.reloads >= C.badMax) { await restartAll(`지역 ${z} ${S.reloads}번 연속 새로 고쳐도 안 됨`); return; }
    S.reloads++; log(`[z${z}] ${Math.round((now - S.badAt) / 1000)}초 동안 이상 → 새로 고침 (${S.reloads}/${C.badMax})`); await openZone(z); }
  if (mem > 0 && mem > C.memCapMB) { await restartAll(`메모리 ${mem}MB > ${C.memCapMB}MB`); } }

// ----- 버전 확인 (version.json 의 ver 가 올라가면 전부 새로)
let remoteVer = 0, lastVerRestart = 0;
async function fetchVer() { try { const r = await fetch(C.versionUrl + (C.versionUrl.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store', signal: AbortSignal.timeout(15000) }); if (!r.ok) return 0; const m = /"ver"\s*:\s*(\d+)/.exec((await r.text()).slice(0, 400)); return m ? +m[1] : 0; } catch (e) { return 0; } }
async function versionCheck() { if (restarting || !browser) return; const v = await fetchVer(); if (!v) return; if (!remoteVer) { remoteVer = v; log(`[ver] version.json v${v}`); }
  const running = [...Z.values()].map(S => S.st && S.st.ver || 0).filter(Boolean); const minRun = running.length ? Math.min(...running) : 0;
  if (v > remoteVer) { log(`[ver] 새 버전 v${v} (전 v${remoteVer})`); remoteVer = v; }
  if (minRun && remoteVer > minRun && Date.now() - lastVerRestart > C.versionSec * 1000 - 5000) { lastVerRestart = Date.now(); await restartAll(`게임 v${minRun} → v${remoteVer} 반영`);   // GitHub Pages 반영이 늦으면 다음 확인 때 또 (최대 5분마다)
    const after = [...Z.values()].map(S => S.st && S.st.ver || 0); if (after.some(x => x && x < remoteVer)) log(`[ver] 아직 페이지가 v${Math.min(...after.filter(Boolean))} — 다음 확인 때 다시 새로 고침`); } }

// ----- 시작
(async () => {
  log(`아덴 월드 봇 서버 시작 · 지역 ${C.zones.join(',')} · ${C.url} · 헬스 ${C.healthSec}초 · 버전 ${C.versionSec}초 · 메모리 상한 ${C.memCapMB}MB · 공유 프로세스 ${C.shareProcess}`);
  const stop = async sig => { if (stopping) return; stopping = true; log(`[stop] ${sig}`); await closeBrowser(); process.exit(0); };
  process.on('SIGTERM', () => stop('SIGTERM')); process.on('SIGINT', () => stop('SIGINT'));
  process.on('unhandledRejection', e => log('[unhandled]', String(e && e.message || e).slice(0, 200)));
  await startBrowser(); for (const z of C.zones) await openZone(z);
  remoteVer = await fetchVer(); if (remoteVer) log(`[ver] version.json v${remoteVer}`);
  let hb = 0;
  while (!stopping) { await sleep(1000); const now = Date.now();
    try { if (now - lastHealth >= C.healthSec * 1000) { lastHealth = now; await health(); }
      if (++hb >= C.versionSec) { hb = 0; await versionCheck(); } }
    catch (e) { log('[loop err]', String(e && e.message || e).slice(0, 200)); } }
})().catch(e => { log('[fatal]', e && e.stack || e); process.exit(1); });
