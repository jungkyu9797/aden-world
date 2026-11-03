// 11/3 자동 업데이트: 새 버전이 보이면 20초 알림 뒤 자동 (안전할 때만) · 위험한 때는 미룸 · 파일이 아직 안 퍼졌으면 다시 불러오지 않고 1분 뒤 · 같은 버전으로 다시 불러오기 반복 안 함
//   KT_PORT=8893 bash dev/runkt.sh dev/tests/autoupd.js
// ① 웹: 버전 파일 v+1 → 예약·카운트다운·알림 ② 미룸: HP 40% 아래 · 보스 전투 · 글자 입력 · 쓰러짐 ③ 게임 파일이 아직 예전 판 → 다시 불러오지 않음·1분 뒤 다시
// ④ 게임 파일이 새 판(가짜) → 저장 → 다시 불러옴 → 그 자리에서 이어짐 → (여전히 예전 판이라) 또 자동으로 다시 불러오지 않음 ⑤ PC(가짜 native): 자동으로 받기 · 실패하면 1분 뒤 다시 ⑥ 로그인 화면: 3초 뒤 바로
const { chromium } = require('playwright'); const login = require('../tq.js'); const fs = require('fs');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
const GV = +/const GAME_VER = (\d+)/.exec(fs.readFileSync('src/game.js', 'utf8'))[1], NV = GV + 1;
fs.writeFileSync('dev/out/_ver.json', JSON.stringify({ ver: NV }));
const VER_INIT = `window.__AU_TEST = true; window.ADEN_VER_URL = location.origin + '/dev/out/_ver.json';`;   /* 테스트 페이지(DEMO_MODE)는 원래 자동 안 함 → 시험용 표시 */
(async () => { const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1100, height: 700 }, serviceWorkers: 'block' });   /* 서비스 워커가 받으면 page.route가 안 먹음 */ const p = await ctx.newPage(); p.on('pageerror', e => errs.push('P: ' + e.message));
  let loads = 0; p.on('load', () => loads++);
  await login(p, { cls: 'knight', name: 'auA', init: VER_INIT }); await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 30; });
  await p.evaluate(() => __T.TOWN.toZone(2)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 2 && __T.SCENE === 'field', null, { timeout: 60000 }); await p.waitForTimeout(1500);
  const pos0 = await p.evaluate(() => [+__T.hero.x.toFixed(1), +__T.hero.z.toFixed(1)]);
  // ①
  await p.evaluate(() => __T.UPD.checkWeb()); await p.waitForTimeout(1600);
  const s1 = await p.evaluate(() => ({ v: __T.UPD.au.v, btn: document.getElementById('btn-upd').textContent, hid: document.getElementById('btn-upd').hidden, msg: __T.log.slice(-4).map(l => l.t).filter(t => /\[업데이트\]/.test(t)) }));
  console.log('①', JSON.stringify(s1)); ok(s1.v === NV && !s1.hid && /자동 업데이트 \d+초/.test(s1.btn), `① 새 버전 v${NV} 보이자 자동 예약 · 버튼 "${s1.btn}"`); ok(s1.msg.some(t => /초 뒤 자동으로 업데이트해요/.test(t)), '① 채팅 안내 (몇 초 뒤 자동 · 그 자리 그대로)');
  // ② 미룸
  const held = await p.evaluate(async () => { const T = __T, U = T.UPD, H = T.hero, out = {}; const w = ms => new Promise(r => setTimeout(r, ms));
    T.GOD_INV = false; H.hp = Math.floor(H.max * 0.3); out.hp = U.unsafe(); U.auTick(); out.hpBtn = document.getElementById('btn-upd').textContent; out.hpHeld = U.au.held; H.hp = H.max; T.GOD_INV = true;
    const bs = T.foxes.find(f => T.MOB[f.kind] && T.MOB[f.kind].boss) || null; let fake = null; if (bs) { out.boss0 = bs.dead; bs.dead = false; bs.tgt = H; } else { fake = { kind: Object.keys(T.MOB).find(k => T.MOB[k].boss), dead: false, gone: false, tgt: H }; T.foxes.push(fake); }
    out.boss = U.unsafe(); if (bs) bs.tgt = null; if (fake) T.foxes.splice(T.foxes.indexOf(fake), 1);
    const inp = document.getElementById('chat-in') || document.querySelector('input[type=text]'); if (inp) { inp.hidden = false; inp.style.display = ''; inp.focus(); out.inp0 = U.unsafe(); inp.value = '잠깐만'; out.inp = U.unsafe(); inp.value = ''; }
    out.safe = U.unsafe(); out.atLeft = Math.round((U.au.at - Date.now()) / 1000); return out; });
  console.log('②', JSON.stringify(held)); ok(held.hp === 'HP 회복' && /HP 회복 끝나면 자동/.test(held.hpBtn), '② HP 40% 아래면 미룸 (버튼에 이유)'); ok(held.boss === '보스 전투', '② 보스가 나를 노리면 미룸'); ok(held.inp === '글자 입력', '② 글자 입력 중이면 미룸'); ok(held.safe === '' && held.atLeft >= 4, `② 다시 안전 → 최소 5초 뒤 (${held.atLeft}초)`);
  // ③ 카운트다운 끝 → 게임 파일이 아직 예전 판 → 다시 불러오지 않음
  const l3 = loads; await p.waitForFunction(() => __T.UPD.au.n >= 1, null, { timeout: 40000 }).catch(() => {});
  await p.waitForTimeout(1500); const s3 = await p.evaluate(() => ({ n: __T.UPD.au.n, nextIn: Math.round((__T.UPD.au.next - Date.now()) / 1000), msg: __T.log.slice(-5).map(l => l.t).filter(t => /퍼지는 중/.test(t)) }));
  console.log('③', JSON.stringify(s3), 'loads', loads - l3); ok(loads === l3 && s3.n === 1 && s3.nextIn > 50 && s3.msg.length === 1, `③ 파일이 아직 예전 판이면 다시 불러오지 않고 1분 뒤 다시 (안내 · ${s3.nextIn}초)`);
  // ④ 가짜 새 판 game.js → 저장·다시 불러오기 → 그 자리에서 이어짐 → 또 반복 안 함
  await p.route('**/src/game.js', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: `/* fake */ const GAME_VER = ${NV};` }));
  const l4 = loads; await p.evaluate(() => { const U = __T.UPD; U.au.next = 0; U.au.at = Date.now() + 500; });
  await p.waitForEvent('load', { timeout: 30000 }).catch(() => {}); await p.waitForFunction(() => window.__gameOn && window.__T && __T.SCENE === 'field', null, { timeout: 60000 }).catch(() => {}); await p.waitForTimeout(2500);
  const s4 = await p.evaluate(() => ({ z: __T.ISLE && __T.ISLE.id, pos: [+__T.hero.x.toFixed(1), +__T.hero.z.toFixed(1)], msg: __T.log.map(l => l.t).filter(t => /업데이트 완료/.test(t)).length, au: sessionStorage.getItem('aden_au') }));
  console.log('④', JSON.stringify(s4), 'loads', loads - l4, 'pos0', JSON.stringify(pos0)); ok(loads - l4 === 1 && s4.z === 2 && s4.msg >= 1, `④ 새 판이 올라와 있으면 저장 → 다시 불러와 같은 사냥터(2)에서 이어짐`);
  await p.evaluate(() => __T.UPD.checkWeb()); await p.waitForTimeout(25000);
  const s4b = await p.evaluate(() => ({ v: __T.UPD.au.v, btn: document.getElementById('btn-upd').textContent }));
  console.log('④b', JSON.stringify(s4b), 'loads', loads - l4); ok(loads - l4 === 1 && s4b.v === 0 && /업데이트 \(v/.test(s4b.btn), '④ 다시 불러왔는데도 예전 판이면 자동으로 또 다시 불러오지 않음 (버튼만)');
  const du = await p.evaluate(() => { const T = __T, d0 = T.ISLE.def; T.ISLE.def = Object.assign({}, d0, { duel: true }); const w = T.UPD.unsafe(); T.ISLE.def = d0; return w; }); ok(du === '결투', '결투장에서도 미룸');
  await p.unroute('**/src/game.js'); await p.close();
  // ⑤ PC (가짜 native)
  const q = await ctx.newPage(); q.on('pageerror', e => errs.push('Q: ' + e.message)); let qL = 0; q.on('load', () => qL++);
  const NAT = `window.__AU_TEST = true; window.__NU = { calls: 0, mode: 'stale', ver: ${GV}, delay: 0 }; window.native = { updateCheck: async () => ({ ok: true, ver: __NU.ver }), update: async () => { __NU.calls++; if (__NU.delay) await new Promise(r => setTimeout(r, __NU.delay)); return __NU.mode === 'stale' ? { ok: false, err: 'STALE' } : { ok: true, latest: false, ver: ${NV}, n: 3 }; }, onUpdate() {}, gpuStatus: async () => null };`;
  await login(q, { cls: 'elf', name: 'auP', init: NAT }); await q.evaluate(() => { __T.GOD_INV = true; }); await q.waitForTimeout(500);
  const g0 = await q.evaluate(() => ({ v: __T.UPD.au.v, btn: document.getElementById('btn-upd').textContent }));
  await q.evaluate(nv => { __NU.ver = nv; return __T.UPD.check(); }, NV); await q.waitForTimeout(1200); const g1 = await q.evaluate(() => ({ v: __T.UPD.au.v, btn: document.getElementById('btn-upd').textContent }));
  console.log('⑤', JSON.stringify(g0), JSON.stringify(g1)); ok(g1.v === NV && /자동 업데이트 \d+초/.test(g1.btn), '⑤ PC: 새 버전 확인 → 자동 예약');
  await q.evaluate(() => { __T.UPD.au.at = Date.now() + 300; }); await q.waitForFunction(() => __NU.calls >= 1 && __T.UPD.au.n >= 1, null, { timeout: 15000 }).catch(() => {});
  const g2 = await q.evaluate(() => ({ calls: __NU.calls, n: __T.UPD.au.n, nextIn: Math.round((__T.UPD.au.next - Date.now()) / 1000) })); ok(g2.calls === 1 && g2.n === 1 && g2.nextIn > 50, `⑤ PC: 받기 실패(파일이 아직 퍼지는 중) → 1분 뒤 자동으로 다시 (${g2.nextIn}초)`);
  await q.evaluate(() => { __NU.mode = 'ok'; __NU.delay = 1500; const U = __T.UPD; U.au.next = 0; U.au.at = Date.now() + 300; }); const ql = qL;
  await q.waitForFunction(() => __NU.calls >= 2, null, { timeout: 10000 }).catch(() => {}); await q.evaluate(() => { const c = document.getElementById('chat-in'); c.focus(); c.value = '잠깐만요'; window.__dead = (() => { __T.GOD_INV = false; const h0 = __T.hero.hp; __T.hero.hp = 0; const w = __T.UPD.unsafe(); __T.hero.hp = h0; __T.GOD_INV = true; return w; })(); });   /* 받는 사이에 채팅을 쓰기 시작 (마을은 HP가 바로 차서 쓰러짐은 바로 확인만) */
  await q.waitForTimeout(4000); const g3 = await q.evaluate(() => ({ btn: document.getElementById('btn-upd').textContent, msg: __T.log.slice(-6).map(l => l.t).filter(t => /새 파일을 받았어요/.test(t)).length, dead: window.__dead }));
  console.log('⑤ dead', JSON.stringify(g3), qL - ql); ok(qL - ql === 0 && /글자 입력 끝나면 다시 시작/.test(g3.btn) && g3.msg === 1, '⑤ PC: 받는 사이에 위험해지면(채팅 쓰는 중) 다시 불러오지 않고 기다림'); ok(g3.dead === '쓰러진 상태', '⑤ 쓰러진 상태도 기다림 조건');
  await q.evaluate(() => { document.getElementById('chat-in').value = ''; }); await q.waitForEvent('load', { timeout: 30000 }).catch(() => {}); ok(qL - ql === 1, '⑤ PC: 채팅을 비우자 다시 불러옴');
  await q.close();
  // ⑥ 로그인 화면: 3초 뒤 바로 (게임 파일이 예전 판이면 다시 불러오지 않음)
  const r = await ctx.newPage(); r.on('pageerror', e => errs.push('R: ' + e.message)); await r.addInitScript(VER_INIT);
  await r.goto('http://127.0.0.1:' + (process.env.KT_PORT || 8766) + '/_kt2.html'); await r.waitForSelector('#lg-mode', { state: 'visible' });
  await r.click('#lg-mode'); await r.fill('#lg-acc', 'typing'); await r.focus('#lg-acc');
  await r.evaluate(() => __T.UPD.checkWeb()); await r.waitForTimeout(5500); const s6a = await r.evaluate(() => ({ n: __T.UPD.au.n })); ok(s6a.n === 0, '⑥ 로그인 화면에서 아이디를 쓰는 중이면 기다림');
  await r.fill('#lg-acc', ''); await r.waitForTimeout(2500); const s6 = await r.evaluate(() => ({ n: __T.UPD.au.n }));
  ok(s6.n === 1, `⑥ 로그인 화면에서도 3초 뒤 바로 시도 (파일이 예전 판이라 1분 뒤 다시 · n=${s6.n})`);
  console.log(errs.slice(0, 5).join('\n') || 'no errors'); ok(!errs.length, '오류 없음');
  console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
