// 11/5 프로듀서: 할로윈 호박 사탕 자동 사용 — 효과(30분)가 끝나면 바로 다시 먹음 (자동 물약 창 [버프 자동 사용] · 아이템 정보)
//   KT_PORT=8883 bash dev/runkt.sh dev/tests/candyauto.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'cdy' }); await p.evaluate(() => { __T.GOD_INV = true; __T.INV.add('hw_candy', 3); __T.BUFF.hwexp = 0; });
  const w = ms => p.waitForTimeout(ms), cnt = () => p.evaluate(() => ({ n: __T.INV.count('hw_candy'), b: Math.round(__T.BUFF.hwexp || 0), on: __T.INV.autoBuff('hw_candy') }));
  // 마을: 켜도 안 먹음
  await p.evaluate(() => __T.INV.openAuto()); await w(300);
  const ui = await p.evaluate(() => { const el = document.getElementById('au-hw_candy'), n = document.getElementById('au-hw_candy-n'); if (!el) return null; el.click(); const r = el.getBoundingClientRect(); return { vis: r.width > 0, n: n && n.textContent }; });
  await p.screenshot({ path: 'dev/out/candyauto_win.png' }); await w(1500); const town = await cnt();
  await p.evaluate(() => { document.getElementById('autowin').hidden = true; __T.TOWN.toZone(2); }); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 2 && __T.SCENE === 'field', null, { timeout: 60000 }); await w(1500);
  const f1 = await cnt();
  await p.evaluate(() => { __T.BUFF.hwexp = 0.5; }); await w(2000); const f2 = await cnt();
  await p.evaluate(() => { document.getElementById('au-hw_candy').click(); __T.BUFF.hwexp = 0; }); await w(1500); const off = await cnt();
  await p.evaluate(() => { __T.INV.take('hw_candy', __T.INV.count('hw_candy')); document.getElementById('au-hw_candy').click(); __T.BUFF.hwexp = 0; }); await w(1500); const none = await cnt();
  console.log(JSON.stringify({ ui, town, f1, f2, off, none }));
  ok(ui && ui.vis, `자동 물약 창 [버프 자동 사용]에 호박 사탕 (${JSON.stringify(ui)})`);
  ok(town.on && town.n === 3 && town.b === 0, `마을에서는 안 먹음 (${JSON.stringify(town)})`);
  ok(f1.n === 2 && f1.b > 1700, `사냥터에 나가면 바로 먹음 (${JSON.stringify(f1)})`);
  ok(f2.n === 1 && f2.b > 1700, `효과가 끝나면 다시 먹음 (${JSON.stringify(f2)})`);
  ok(!off.on && off.n === 1 && off.b === 0, `끄면 안 먹음 (${JSON.stringify(off)})`);
  ok(none.on && none.n === 0 && none.b === 0, `사탕이 없으면 그냥 넘어감 (${JSON.stringify(none)})`);
  ok(!errs.length, '오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
