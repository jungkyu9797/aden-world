// v189 추가: 강화 창(단일·다중)에서 할로윈 모자 · 호박밭에서 희귀·영웅 호박 주머니·귀환 부적 · 금빛 날개 강화 1당 MR +1 (bash dev/runkt.sh dev/tests/hw_more.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'hwM' });
  await p.evaluate(() => { __T.INV.load({ bag: [{ id: 'hw_hat', n: 1, en: 0 }, { id: 'hw_hat', n: 1, en: 3 }, { id: 'hw_scroll', n: 30 }, { id: 'hw_bscroll', n: 2 }, { id: 'qa_wing', n: 1, en: 5, on: 'cloak' }, { id: 'hw_pouch_r', n: 2 }, { id: 'hw_pouch_h', n: 1 }, { id: 'return_charm', n: 1 }, { id: 'red_potion', n: 20 }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); document.getElementById('invwin').hidden = false; __T.INV.render(); });
  const hatEn = () => p.evaluate(() => __T.INV.dump().bag.filter(e => e.id === 'hw_hat').map(e => e.en || 0));
  // 금빛 날개 +5 착용: MR 기본 + 5
  console.log('wing mr', await p.evaluate(() => __T.INV.cx('mr')), JSON.stringify(await p.evaluate(() => { const d = __T.ITEMS.qa_wing; return { mr: d.mr, mrEn: d.mrEn, opt: d.optTxt }; })));
  // 단일 강화: 모자를 클릭해 넣기
  await p.evaluate(() => __T.INV.bulkOpen()); await p.waitForTimeout(300);
  const hatClick = k => p.evaluate(k => { const ids = __T.INV.dump().bag.map(e => e.id); let n = -1; for (let i = 0; i < ids.length; i++) if (ids[i] === 'hw_hat' && ++n === k) { document.querySelectorAll('#inv-grid > button')[i].click(); return i; } return -1; }, k);
  console.log('hat cell', await hatClick(0)); await p.waitForTimeout(300);
  console.log('one', JSON.stringify(await p.evaluate(() => ({ item: !!document.querySelector('#en-item.on'), stat: document.getElementById('en-stat').innerText.replace(/\n+/g, ' / ').slice(0, 120), mats: [...document.querySelectorAll('#en-mats [data-es]')].map(x => x.dataset.es + ':' + x.innerText.replace(/\s+/g, ' ')), rate: document.getElementById('en-rate').innerText, go: !document.getElementById('en-go').disabled }))));
  await p.screenshot({ path: 'dev/out/hw_m1_one.png' });
  await p.evaluate(() => { const c = document.getElementById('en-safe1'); if (c) c.checked = true; }); await p.click('#en-go'); await p.waitForTimeout(600);
  console.log('after one (safe run)', JSON.stringify(await hatEn()), 'scroll', await p.evaluate(() => __T.INV.count('hw_scroll')));
  // 다중 강화: 두 모자 → +6
  await p.click('#bulkwin [data-et=multi]'); await p.waitForTimeout(200);
  await hatClick(0); await p.waitForTimeout(150); await hatClick(1); await p.waitForTimeout(150);
  await p.click('#en-goals [data-g="6"]'); await p.waitForTimeout(150);
  console.log('multi', JSON.stringify(await p.evaluate(() => ({ count: document.getElementById('en-mcount').innerText, sc: document.getElementById('en-msc').innerText.replace(/\s+/g, ' ').slice(0, 120) }))));
  await p.screenshot({ path: 'dev/out/hw_m2_multi.png' });
  await p.click('#en-mgo'); await p.waitForTimeout(500); { const t0 = Date.now(); while (Date.now() - t0 < 20000 && await p.evaluate(() => document.getElementById('en-mgo').textContent === '중지')) await p.waitForTimeout(300); }
  await p.evaluate(() => { const y = document.getElementById('ask-yes'); if (y && !document.getElementById('askwin').hidden) y.click(); }); await p.waitForTimeout(300);
  { const t0 = Date.now(); while (Date.now() - t0 < 30000 && await p.evaluate(() => document.getElementById('en-mgo').textContent === '중지')) await p.waitForTimeout(300); }
  console.log('after multi', JSON.stringify(await hatEn()), 'log', JSON.stringify(await p.evaluate(() => document.getElementById('en-mlog').innerText.split('\n').slice(0, 3))));
  await p.screenshot({ path: 'dev/out/hw_m3_multi_done.png' });
  // 호박밭: 희귀·영웅 주머니 · 귀환 부적
  await p.keyboard.press('Escape'); await p.evaluate(() => { document.querySelectorAll('.gw').forEach(w => w.hidden = true); __T.hero.lv = 55; if (!__T.INV.count('hw_hat')) __T.INV.add('hw_hat', 1); __T.TOWN.toZone(21); }); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 21 && __T.SCENE === 'field', null, { timeout: 20000 }); await p.waitForTimeout(1200);
  await p.evaluate(() => { __T.INV.setHot(10, 'hw_pouch_r'); __T.INV.useHot(10); }); await p.waitForTimeout(800);
  await p.evaluate(() => { __T.INV.setHot(10, 'hw_pouch_h'); __T.INV.useHot(10); }); await p.waitForTimeout(800);
  console.log('pouch', JSON.stringify(await p.evaluate(() => ({ r: __T.INV.count('hw_pouch_r'), h: __T.INV.count('hw_pouch_h'), log: __T.log.slice(-4).map(x => x.t || x.text || x) }))));
  await p.evaluate(() => { __T.INV.add('red_potion', 5); __T.INV.add('poly_dark', 2); __T.INV.add('hw_candy', 1); __T.hero.hp = Math.max(1, __T.hero.hp - 30); });
  for (const id of ['red_potion', 'poly_dark', 'hw_candy']) { await p.evaluate(id => { __T.INV.setHot(10, id); __T.INV.useHot(10); }, id); await p.waitForTimeout(800); }
  console.log('consumables', JSON.stringify(await p.evaluate(() => ({ red: __T.INV.count('red_potion'), poly: __T.INV.count('poly_dark'), candy: __T.INV.count('hw_candy'), log: __T.log.slice(-3).map(x => x.t || x.text || x) }))));
  await p.evaluate(() => { __T.INV.setHot(10, 'return_charm'); __T.INV.useHot(10); }); await p.waitForTimeout(2500);
  console.log('charm', JSON.stringify(await p.evaluate(() => ({ scene: __T.SCENE, charm: __T.INV.count('return_charm'), log: __T.log.slice(-2).map(x => x.t || x.text || x) }))));
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
