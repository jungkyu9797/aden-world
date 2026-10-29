// 갓 모드 할로윈 테스트 묶음 버튼 (bash dev/runkt.sh dev/tests/hw_god.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'hwG' });
  await p.evaluate(() => { document.getElementById('godpanel').hidden = false; document.getElementById('gp-hw').click(); });
  console.log(JSON.stringify(await p.evaluate(() => ['hw_hat', 'hw_seed', 'hw_scroll', 'hw_pouch_h'].map(id => __T.INV.count(id)))));
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
