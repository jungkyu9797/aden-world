// 할로윈 호박 주머니 300개 열기 · 호박 사탕 경험치 · 잭오랜턴 · 할로윈 망토 (bash dev/runkt.sh dev/tests/hw_pouch.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'hwP' });
  await p.evaluate(() => { __T.INV.load({ bag: [{ id: 'hw_pouch', n: 300 }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); __T.setCoins(0); __T.INV.setHot(11, 'hw_pouch'); });
  for (let k = 0; k < 300; k++) { await p.evaluate(() => __T.INV.useHot(11)); await p.waitForTimeout(k % 20 ? 0 : 50); await p.evaluate(() => new Promise(r => setTimeout(r, 620))); }
  console.log('got', JSON.stringify(await p.evaluate(() => { const o = {}; for (const e of __T.INV.dump().bag) o[__T.ITEMS[e.id].name] = (o[__T.ITEMS[e.id].name] || 0) + (e.n || 1); o['골드'] = __T.coins; return o; })));
  // 사탕: 경험치 +20%
  console.log('candy', JSON.stringify(await p.evaluate(() => { __T.INV.add('hw_candy', 1, true); __T.INV.setHot(10, 'hw_candy'); __T.INV.useHot(10); const e0 = __T.hero.exp; const f = __T.mkMob('hw_pumpkin', 3, 3); return { buff: __T.BUFF.hwexp }; })));
  await p.evaluate(() => __T.INV.add('hw_lantern', 1, true)); await p.waitForTimeout(700); await p.evaluate(() => { __T.INV.setHot(9, 'hw_lantern'); __T.INV.useHot(9); });
  console.log('lantern', await p.evaluate(() => __T.BUFF.light));
  console.log('cloak', JSON.stringify(await p.evaluate(() => { const a0 = __T.INV.ac(), m0 = __T.hero.max; __T.INV.load({ bag: [{ id: 'hw_cloak', n: 1, on: 'cloak' }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); __T.INV.render(); return { ac: [a0, __T.INV.ac()], hp: [m0, __T.hero.max] }; })));
  await p.evaluate(() => { document.getElementById('invwin').hidden = false; __T.INV.render(); }); await p.waitForTimeout(400); await p.screenshot({ path: 'dev/out/hw_8_items.png' });
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
