// 10/30 마법인형·재료 무게 0 (bash dev/runkt.sh dev/tests/weight0.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await login(p, { cls: 'knight', name: 'w0T' });
  const r = await p.evaluate(() => { const I = __T.ITEMS, bad = []; for (const [id, d] of Object.entries(I)) if ((d.doll || id.startsWith('gfrag_') || ['gold_wing', 'silver_wing', 'dragon_scale', 'drake_claw', 'dragon_heart'].includes(id)) && d.w) bad.push(id);
    __T.INV.add('dragon_scale', 50); __T.INV.add('doll_wyvern', 1); __T.INV.add('gfrag_ogre', 5); return { bad, red: I.red_potion.w, sword: I.dv_sword && I.dv_sword.w }; });
  console.log(JSON.stringify(r), r.bad.length ? 'FAIL' : 'ALL OK'); console.log(errs.join('\n') || 'no errors'); await b.close(); })();
