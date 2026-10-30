// 10/30 바닥 아이템 지역당 50개 (넘으면 가장 오래된 것부터) (bash dev/runkt.sh dev/tests/ground_cap.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'gcT' });
  const r = await p.evaluate(() => { const G = __T.GROUND; G.clear(); const first = G.drop('red_potion', 1, 5, 5);
    for (let k = 1; k < 60; k++) G.drop('red_potion', 1, 5 + (k % 10), 5 + Math.floor(k / 10));
    return { n: G.list().length, firstGone: !G.list().includes(first) }; });
  console.log(JSON.stringify(r));
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
