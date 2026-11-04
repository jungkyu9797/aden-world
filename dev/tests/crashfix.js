// 11/4 멈춤 복구 (브라우저): python3 dev/mkkt.py && KT_PORT=8911 bash dev/runkt.sh dev/tests/crashfix.js
// ① 보통 플레이: 오류 없음 · 다시 불러오지 않음 · 화면 프레임 그대로 · 웹은 aden_rc 안 씀 ② 화면 프레임 중 오류 → 다음 프레임 예약이 끊겨도 1초 안에 다시 이어 그림
// ③ 화면 캔버스를 잃었다 되찾음(contextlost → contextrestored) → 글자 입력 중이면 기다림 → 저장 → 다시 불러와 그 자리·자동사냥 그대로 · 10분에 2번까지, 3번째는 안내만
// ④ PC(가짜 native): 10초마다 aden_rc · 'app:wake'에 상태로 대답 · index.html?rc=1로 열리면 aden_rc 자리에서 이어서(주소의 rc는 지움) · rc 없이 열리면 aden_rc 버림 ⑤ /렉: 안전 모드 끝나는 때·멈춤 복구 횟수
const { chromium } = require('playwright'); const login = require('../tq.js'); const fs = require('fs');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
const GV = +/const GAME_VER = (\d+)/.exec(fs.readFileSync('src/game.js', 'utf8'))[1], BASE = 'http://127.0.0.1:' + (process.env.KT_PORT || 8766);
(async () => { const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1100, height: 700 }, serviceWorkers: 'block' }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push('P: ' + e.message));
  let loads = 0; p.on('load', () => loads++);
  await login(p, { cls: 'knight', name: 'cfA' }); await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 30; });
  await p.evaluate(() => __T.TOWN.toZone(2)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 2 && __T.SCENE === 'field', null, { timeout: 60000 }); await p.evaluate(() => { if (!__T.AUTO.on()) __T.AUTO.toggle(); });
  // ① 보통 플레이
  const l1 = loads; await p.evaluate(() => { window.__dn = 0; const P = __T.PERF_, o = P.drawn; P.drawn = function () { window.__dn++; return o.apply(this, arguments); }; }); await p.waitForTimeout(12000);
  const s1 = await p.evaluate(() => ({ st: window.__crf.st(), dn: window.__dn, rc: localStorage.getItem('aden_rc'), fps: __T.PERF_.stats().fps, bg: window.__bgInfo().steps }));
  console.log('①', JSON.stringify(s1), 'errs', errs.length); await p.screenshot({ path: 'dev/out/crashfix_play.png' });
  ok(loads === l1 && errs.length === 0 && s1.dn > 50 && s1.st.fix === 0 && !s1.st.lost && s1.st.q === 1, `① 보통 플레이 12초: 오류 없음 · 다시 불러오지 않음 · 화면 프레임 ${s1.dn}번(초당 ${s1.fps}) · 이어 붙이기 0번`);
  ok(s1.rc === null, '① 웹(native 없음)은 aden_rc를 안 씀');
  // ② 화면 프레임 중 오류 한 번
  const s2 = await p.evaluate(async () => { const P = __T.PERF_, o = P.mid, w = ms => new Promise(r => setTimeout(r, ms)); let thrown = 0;
    const a0 = window.__dn; await w(2000); const pre = window.__dn - a0;
    P.mid = function () { P.mid = o; thrown = 1; throw new Error('crashfix 시험 오류'); }; await w(300); const d0 = window.__dn; await w(2000); return { thrown, pre, d: window.__dn - d0, st: window.__crf ? window.__crf.st() : null }; });
  console.log('②', JSON.stringify(s2)); errs.length = 0;
  ok(s2.thrown === 1 && s2.st.fix >= 1 && s2.d >= s2.pre * 0.6 && s2.d > 5 && s2.st.raf < 300, `② 화면 프레임 중 오류 → 프레임 예약이 끊겨도 다시 이어 그림 (2초에 ${s2.d}프레임 · 이어 붙이기 ${s2.st.fix}번)`);
  // ③ 캔버스 잃음 → 되찾음 (글자 입력 중이면 기다림)
  const l3 = loads; await p.evaluate(() => { const i = document.getElementById('chat-in') || document.querySelector('input[type=text]'); i.hidden = false; i.style.display = ''; i.focus(); i.value = '잠깐만'; const c = document.getElementById('cv'); c.dispatchEvent(new Event('contextlost')); c.dispatchEvent(new Event('contextrestored')); });
  await p.waitForTimeout(3000); const held = loads === l3; await p.evaluate(() => { const i = document.activeElement; if (i) { i.value = ''; i.blur(); } });
  await p.waitForEvent('load', { timeout: 30000 }).catch(() => {}); await p.waitForFunction(() => window.__gameOn && window.__T && __T.ISLE && __T.ISLE.id === 2 && __T.SCENE === 'field', null, { timeout: 60000 }).catch(() => {}); await p.waitForTimeout(2000);
  const s3 = await p.evaluate(() => ({ z: __T.ISLE && __T.ISLE.id, auto: __T.AUTO.on(), msg: __T.log.map(l => l.t).filter(t => /멈춰서 다시 불러왔어요/.test(t)).length, crf: JSON.parse(sessionStorage.getItem('aden_crf') || '[]').length, res: localStorage.getItem('aden_resume') }));
  console.log('③', JSON.stringify(s3), 'held', held, 'loads', loads - l3); ok(held, '③ 글자를 입력하는 중이면 다시 불러오기를 기다림');
  ok(loads - l3 === 1 && s3.z === 2 && s3.auto && s3.msg === 1 && s3.crf === 1 && s3.res === null, '③ 캔버스를 되찾으면 저장 → 다시 불러와 같은 사냥터(2)·자동사냥 그대로 (안내 1줄)');
  const l3b = loads; await p.evaluate(() => { const c = document.getElementById('cv'); c.dispatchEvent(new Event('contextlost')); c.dispatchEvent(new Event('contextrestored')); });
  await p.waitForEvent('load', { timeout: 30000 }).catch(() => {}); await p.waitForFunction(() => window.__gameOn && window.__T && __T.ISLE && __T.ISLE.id === 2, null, { timeout: 60000 }).catch(() => {}); await p.waitForTimeout(1500);
  const l3c = loads; await p.evaluate(() => { const c = document.getElementById('cv'); c.dispatchEvent(new Event('contextlost')); c.dispatchEvent(new Event('contextrestored')); }); await p.waitForTimeout(3000);
  const s3c = await p.evaluate(() => ({ on: !!window.__gameOn, msg: __T.log.map(l => l.t).filter(t => /그림이 빠졌을 수 있어요/.test(t)).length }));
  console.log('③b', loads - l3b, loads - l3c, JSON.stringify(s3c)); ok(l3c - l3b === 1 && loads === l3c && s3c.on && s3c.msg === 1, '③ 10분 안에 두 번째까지는 다시 불러오고, 세 번째는 안내만 (반복 다시 불러오기 막음)');
  ok(errs.length === 0, '③ 오류 없음 ' + errs.slice(0, 2).join(' | ')); await p.close();
  // ④ PC (가짜 native)
  const NAT = `window.__W = null; window.native = { updateCheck: async () => ({ ok: true, ver: ${GV} }), update: async () => ({ ok: true, latest: true, ver: ${GV} }), onUpdate() {}, relaunch() {}, onWake(fn) { window.__W = fn; },
    gpuStatus: async () => ({ st: { '2d_canvas': 'enabled', gpu_compositing: 'enabled' }, safe: true, until: '11/7 14:00', rv: 2 }) };`;
  const q = await ctx.newPage(); q.on('pageerror', e => errs.push('Q: ' + e.message)); await login(q, { cls: 'elf', name: 'cfP', init: NAT }); await q.evaluate(() => { __T.GOD_INV = true; });
  await q.evaluate(() => __T.TOWN.toZone(2)); await q.waitForFunction(() => __T.ISLE && __T.ISLE.id === 2 && __T.SCENE === 'field', null, { timeout: 60000 }); await q.evaluate(() => { if (!__T.AUTO.on()) __T.AUTO.toggle(); }); await q.waitForTimeout(11000);
  const s4 = await q.evaluate(() => { const o = JSON.parse(localStorage.getItem('aden_rc') || 'null'); return { rc: o && { z: o.pos && o.pos.isle, auto: o.auto, acc: !!o.acc, cls: o.cls }, w: typeof __W === 'function' ? __W({ id: 1, why: 'resume' }) : null }; });
  console.log('④', JSON.stringify(s4)); ok(s4.rc && s4.rc.z === 2 && s4.rc.auto && s4.rc.acc && s4.rc.cls === 'elf', '④ PC: 게임 중 10초마다 aden_rc에 자리·자동사냥 적음');
  ok(s4.w && s4.w.lost === false && s4.w.on === true && s4.w.q === 1 && s4.w.raf < 500, '④ PC: 깨어남 물음(app:wake)에 상태로 대답 (캔버스 정상 · 화면 프레임 예약됨)');
  const r5 = await q.evaluate(() => __T.PERF_.report().then(() => __T.log.slice(-6).map(l => l.t).find(t => /그래픽카드:/.test(t)) || ''));
  console.log('⑤', r5); ok(/\(안전 모드 ~11\/7 14:00\)/.test(r5) && /멈춤 복구 2번/.test(r5), '⑤ /렉: (안전 모드 ~끝나는 때) · 멈춤 복구 횟수');
  // rc=1 로 열림 (main.js가 죽은 창을 다시 불러온 것) → 이어서
  await q.goto(BASE + '/_kt2.html?rc=1'); await q.waitForFunction(() => window.__gameOn && window.__T && __T.ISLE && __T.ISLE.id === 2 && __T.SCENE === 'field', null, { timeout: 60000 }).catch(() => {}); await q.waitForTimeout(2000);
  const s6 = await q.evaluate(() => ({ z: __T.ISLE && __T.ISLE.id, auto: __T.AUTO.on(), url: location.search, msg: __T.log.map(l => l.t).filter(t => /멈춰서 다시 불러왔어요/.test(t)).length, cls: __T.CLASS }));
  console.log('④b', JSON.stringify(s6)); ok(s6.z === 2 && s6.auto && s6.url === '' && s6.msg === 1 && s6.cls === 'elf', '④ ?rc=1로 열리면 aden_rc 자리(사냥터 2·자동사냥)에서 이어서 · 주소의 rc는 지움');
  // rc 없이 열림 (보통 켜기) → aden_rc는 버리고 로그인 화면
  await q.waitForTimeout(11000); const has = await q.evaluate(() => !!localStorage.getItem('aden_rc')); await q.goto(BASE + '/_kt2.html'); await q.waitForSelector('#lg-mode', { state: 'visible', timeout: 60000 }); await q.waitForTimeout(1500);
  const s7 = await q.evaluate(() => ({ on: !!window.__gameOn, rc: localStorage.getItem('aden_rc') }));
  console.log('④c', has, JSON.stringify(s7)); ok(has && !s7.on && s7.rc === null, '④ 보통으로 켜면(rc 없음) aden_rc는 버리고 이어하지 않음');
  ok(errs.length === 0, '오류 없음 ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); })().catch(e => { console.log('FAIL 오류', e && e.stack || e); process.exit(1); });
