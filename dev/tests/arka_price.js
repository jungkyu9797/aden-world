// v190 아르카의 마법주머니: 상점 10만 골드 · 되팔기 3,000 그대로 (bash dev/runkt.sh dev/tests/arka_price.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'akP' });
  console.log(JSON.stringify(await p.evaluate(() => ({ buy: __T.TOWN.priceOf('arka_pouch'), sellFix: __T.ITEMS.arka_pouch.sellFix }))));
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
