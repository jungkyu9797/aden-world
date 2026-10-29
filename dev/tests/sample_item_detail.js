// 예시 테스트: 아이템 상세 창 [강화] 버튼 → 장비 강화 창 (bash dev/runkt.sh dev/tests/sample_item_detail.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'ewT' });
  await p.evaluate(() => { __T.INV.load({ bag: [{ id: 'long_sword', n: 1, en: 6 }, { id: 'scroll_weapon', n: 3 }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); __T.INV.render(); document.getElementById('invwin').hidden = false; __T.INV.render(); });
  const c = await p.$('#inv-grid > button'); const bb = await c.boundingBox(); await p.mouse.move(bb.x + 20, bb.y + 20); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up(); await p.waitForTimeout(200);
  await p.evaluate(() => { const g = document.querySelector('#inv-grid > button'); g.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });
  console.log('sword detail:', JSON.stringify(await p.evaluate(() => { const w = document.getElementById('itemwin'); return { open: !w.hidden, enw: !!w.querySelector('[data-act=enw]') }; })));
  await p.screenshot({ path: 'dev/out/80_detail_btn.png' });
  await p.click('#itemwin [data-act=enw]'); await p.waitForTimeout(400);
  console.log('after click:', JSON.stringify(await p.evaluate(() => ({ bulk: !document.getElementById('bulkwin').hidden, item: !document.getElementById('itemwin').hidden, oneTab: !document.getElementById('en-one').hidden, slot: document.getElementById('en-item').innerText.trim().slice(0, 30), stat: ((document.getElementById('en-stat') || {}).innerText || '').slice(0, 60) }))));
  await p.screenshot({ path: 'dev/out/81_after_enw.png' });
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
