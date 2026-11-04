// 11/4 프로듀서(두 번째): 새 버전 확인은 2분마다 · [업데이트]를 안 누르면 처음 본 때부터 2시간 뒤 자동 (다시 켜도 처음부터 안 셈) · 로그인 화면은 바로
//   KT_PORT=8894 bash dev/runkt.sh dev/tests/autoupd2h.js
const { chromium } = require('playwright'); const login = require('../tq.js'); const fs = require('fs');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
const GV = +/const GAME_VER = (\d+)/.exec(fs.readFileSync('src/game.js', 'utf8'))[1], NV = GV + 1;
fs.writeFileSync('dev/out/_ver.json', JSON.stringify({ ver: NV }));
const VER_INIT = `window.__AU_TEST = true; window.ADEN_VER_URL = location.origin + '/dev/out/_ver.json';`;
(async () => { const b = await chromium.launch(); const errs = []; const ctx = await b.newContext({ viewport: { width: 1100, height: 700 }, serviceWorkers: 'block' }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  let loads = 0; p.on('load', () => loads++);
  await login(p, { cls: 'knight', name: 'au2h', init: VER_INIT }); await p.evaluate(() => { __T.GOD_INV = true; try { localStorage.removeItem('aden_upd_seen'); } catch (e) {} });
  const every = await p.evaluate(() => __T.UPD.every); ok(every === 120000, `① 새 버전 확인 간격 2분 (${every}ms)`);
  await p.evaluate(() => __T.UPD.checkWeb()); await p.waitForTimeout(1600);
  const s1 = await p.evaluate(() => { const U = __T.UPD; return { v: U.au.v, left: Math.round((U.au.at - Date.now()) / 60000), btn: document.getElementById('btn-upd').textContent, msg: __T.log.slice(-5).map(l => l.t).filter(t => /\[업데이트\]/.test(t)), seen: localStorage.getItem('aden_upd_seen') }; });
  console.log('①', JSON.stringify(s1));
  ok(s1.v === NV && s1.left >= 119 && s1.left <= 120, `① 새 버전 v${NV} 보이면 2시간 뒤 자동으로 예약 (${s1.left}분 남음)`);
  ok(/1시간 59분 뒤 자동|2시간 뒤 자동/.test(s1.btn), `① 버튼: "${s1.btn}"`);
  ok(s1.msg.some(t => /\[업데이트\]를 누르면 바로 받고, 안 누르면 .* 뒤\(\d+:\d\d쯤\) 자동으로 업데이트해요/.test(t)), '① 채팅 안내: 누르면 바로 · 안 누르면 2시간 뒤(시각) 자동');
  // ② 2분마다 다시 확인해도 2시간이 다시 세지지 않음 · 기다리는 동안은 보스 전투·HP가 낮아도 버튼은 남은 시간만
  const s2 = await p.evaluate(async () => { const T = __T, U = T.UPD, at0 = U.au.at; await U.checkWeb(); await new Promise(r => setTimeout(r, 1200)); T.GOD_INV = false; T.hero.hp = Math.floor(T.hero.max * 0.3); U.auTick(); const btn = document.getElementById('btn-upd').textContent; T.hero.hp = T.hero.max; T.GOD_INV = true; return { same: U.au.at === at0, btn }; });
  ok(s2.same, '② 다시 확인해도 자동 업데이트 시각 그대로'); ok(/뒤 자동/.test(s2.btn) && !/끝나면/.test(s2.btn), `② 기다리는 동안은 HP가 낮아도 남은 시간만 보임 ("${s2.btn}")`);
  // ③ 다시 불러와도(게임 다시 켬) 처음 본 때부터 — 2시간 중 1시간 50분이 지났다고 치면 10분 남음
  await p.evaluate(() => { const o = JSON.parse(localStorage.getItem('aden_upd_seen')); o.at -= 110 * 60e3; localStorage.setItem('aden_upd_seen', JSON.stringify(o)); __T.UPD.au.v = 0; __T.UPD.checkWeb(); });
  await p.waitForTimeout(1600); const s3 = await p.evaluate(() => ({ left: Math.round((__T.UPD.au.at - Date.now()) / 60000), btn: document.getElementById('btn-upd').textContent }));
  ok(s3.left >= 9 && s3.left <= 10, `③ 다시 예약해도 처음 본 때부터 셈 (${s3.left}분 남음 · "${s3.btn}")`);
  // ④ 2시간이 되면: 위험한 때(HP 40% 아래)는 미루고 → 안전해지면 20초 알림 → 자동 (테스트 페이지는 파일이 예전 판이라 다시 불러오지 않고 1분 뒤 다시)
  const s4 = await p.evaluate(async () => { const T = __T, U = T.UPD, w = ms => new Promise(r => setTimeout(r, ms)); U.au.at = Date.now() - 1000; T.GOD_INV = false; T.hero.hp = Math.floor(T.hero.max * 0.3); U.auTick(); const held = document.getElementById('btn-upd').textContent; T.hero.hp = T.hero.max; T.GOD_INV = true; await w(1200);
    const cnt = document.getElementById('btn-upd').textContent, left = Math.round((U.au.at - Date.now()) / 1000), msg = T.log.slice(-6).map(l => l.t).filter(t => /초 뒤 자동으로 업데이트해요/.test(t)).length; return { held, cnt, left, msg }; });
  console.log('④', JSON.stringify(s4)); ok(/HP 회복 끝나면 자동/.test(s4.held), '④ 2시간이 됐어도 HP 40% 아래면 미룸'); ok(/자동 업데이트 \d+초/.test(s4.cnt) && s4.left >= 15 && s4.left <= 20 && s4.msg >= 1, `④ 안전해지면 20초 알림 뒤 자동 ("${s4.cnt}")`);
  const l0 = loads; await p.waitForFunction(() => __T.UPD.au.n >= 1, null, { timeout: 40000 }).catch(() => {}); const n = await p.evaluate(() => __T.UPD.au.n); ok(n >= 1 && loads === l0, `④ 카운트다운 끝 → 자동 업데이트 시도 (파일이 아직 예전 판이라 다시 불러오지 않고 다시 기다림 · 시도 ${n})`);
  // ⑤ 절전 화면에 자동 시각
  const s5 = await p.evaluate(() => { window.SAVER.enter(); const r = { txt: (document.getElementById('sv-upd') || {}).textContent || '', hid: document.getElementById('sv-upd').hidden }; window.SAVER.exit && window.SAVER.exit(); return r; });
  ok(!s5.hid && /\d+:\d\d쯤 자동으로 업데이트해요/.test(s5.txt), `⑤ 절전 화면: 새 업데이트 + 자동 시각 ("${s5.txt.replace(/\s+/g, ' ').slice(0, 90)}")`);
  ok(!errs.length, '오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
