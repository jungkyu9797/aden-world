// 할로윈: 시간 저장·소진 자동 퇴장 · 기사 허수아비 모습 (bash dev/runkt.sh dev/tests/hw_time.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'hwK' });
  await p.evaluate(() => { __T.hero.lv = 55; __T.INV.add('hw_hat', 1, true); __T.INV.add('return_scroll', 3, true); });
  await p.evaluate(() => __T.TOWN.toZone(21)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 21 && __T.SCENE === 'field', null, { timeout: 20000 });
  await p.waitForTimeout(3000); await p.evaluate(() => { const f = __T.foxes.find(m => m.kind === 'hw_pumpkin_boss' && !m.dead); __T.hero.i = f.i - 2; __T.hero.j = f.j; __T.hero.x = f.i - 1.5; __T.hero.z = f.j + 0.5; }); await p.waitForTimeout(1500);
  await p.screenshot({ path: 'dev/out/hw_5_knight.png' });
  const s = await p.evaluate(() => __T.SAVE.snap().hw); console.log('snap hw', JSON.stringify(s));
  // 저장값에서 남은 시간 5초로 → 자동 퇴장
  await p.evaluate(() => { const o = __T.SAVE.snap(); o.hw = { d: o.hw.d, u: 7195 }; __T.SAVE.apply(o); });
  await p.waitForTimeout(7000); console.log('after timeout', JSON.stringify(await p.evaluate(() => ({ scene: __T.SCENE, timer: document.getElementById('hw-timer').hidden, log: __T.log.slice(-3).map(x => x.t || x.text || x) }))));
  // 마을에서 다시 입장 시도 → 막힘
  await p.evaluate(() => { document.getElementById('hwwin').hidden = false; document.getElementById('hw-enter').disabled = false; document.getElementById('hw-enter').click(); }); await p.waitForTimeout(500);
  console.log('re-enter', JSON.stringify(await p.evaluate(() => ({ scene: __T.SCENE, last: (__T.log.slice(-1)[0] || {}).t || __T.log.slice(-1)[0] }))));
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
