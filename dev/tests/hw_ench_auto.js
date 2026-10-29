// 할로윈: 호박 강화 주문서로 고른 모자 강화 · 호박밭 자동사냥 (bash dev/runkt.sh dev/tests/hw_ench_auto.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'hwE' });
  await p.evaluate(() => { __T.INV.load({ bag: [{ id: 'hw_hat', n: 1, en: 0 }, { id: 'hw_hat', n: 1, en: 2 }, { id: 'hw_scroll', n: 10 }, { id: 'long_sword', n: 1 }, { id: 'red_potion', n: 50 }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); document.getElementById('invwin').hidden = false; __T.INV.render(); __T.INV.setHot(11, 'hw_scroll'); });
  const hats = () => p.evaluate(() => [...document.querySelectorAll('#inv-grid > button')].slice(0, 2).map(b => b.title || b.getAttribute('aria-label') || b.innerText.trim().slice(0, 20)));
  for (let k = 0; k < 2; k++) { await p.evaluate(() => __T.INV.useHot(11)); await p.waitForTimeout(300); await p.click('#inv-grid > button:nth-child(2)'); await p.waitForTimeout(900); }
  await p.evaluate(() => __T.INV.useHot(11)); await p.waitForTimeout(300); await p.click('#inv-grid > button:nth-child(4)'); await p.waitForTimeout(500);   // 칼에는 안 됨
  console.log('log', JSON.stringify(await p.evaluate(() => __T.log.slice(-6).map(x => x.t || x.text || x))));
  console.log('hats', JSON.stringify(await p.evaluate(() => __T.INV.dump().bag.filter(e => e.id === 'hw_hat').map(e => e.en || 0))), 'scroll', await p.evaluate(() => __T.INV.count('hw_scroll')));
  await p.screenshot({ path: 'dev/out/hw_6_ench.png' });
  // 자동사냥
  await p.keyboard.press('Escape'); await p.evaluate(() => { document.querySelectorAll('.gw').forEach(w => w.hidden = true); __T.hero.lv = 55; __T.TOWN.toZone(21); }); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 21 && __T.SCENE === 'field', null, { timeout: 20000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => { __T.AUTO.toggle(); }); await p.waitForTimeout(15000);
  console.log('auto', JSON.stringify(await p.evaluate(() => ({ on: __T.AUTO.on(), scene: __T.SCENE, zone: __T.ISLE && __T.ISLE.id, status: __T.AUTO.status ? __T.AUTO.status() : '', seed: __T.INV.count('hw_seed'), log: __T.log.slice(-4).map(x => x.t || x.text || x) }))));
  await p.screenshot({ path: 'dev/out/hw_7_auto.png' });
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
