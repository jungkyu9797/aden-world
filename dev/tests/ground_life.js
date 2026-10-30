// 10/30 바닥 아이템 10분 뒤 사라짐 (bash dev/runkt.sh dev/tests/ground_life.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'glT' });
  const r = await p.evaluate(async () => { const G = __T.GROUND; G.clear();
    const a = G.drop('red_potion', 1, 10, 10), b = G.drop('red_potion', 1, 11, 10); a.t = 590; b.t = 100;
    const s0 = G.list().length; await new Promise(r => setTimeout(r, 12000));
    return { s0, after: G.list().length, aLeft: G.list().includes(a), bLeft: G.list().includes(b), bT: Math.round(b.t) }; });
  console.log(JSON.stringify(r));
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
