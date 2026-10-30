// 10/30 화룡의 둥지 1구역 포털: 마을로 (용계와 안 이어짐) (bash dev/runkt.sh dev/tests/fn_portal.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await login(p, { cls: 'knight', name: 'fpT' });
  const out = {};
  for (const z of [17, 22]) { await p.evaluate(z => __T.TOWN.toZone(z), z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', z, { timeout: 20000 }); await p.waitForTimeout(800);
    out[z] = await p.evaluate(() => (__T.ISLE.portals || __T.ISLE.def.portals || []).map(q => q.to + ':' + q.label)); }
  const ok = !out[17].some(s => s.startsWith('22:')) && out[22].includes('town:▼ 마을로') && !out[22].some(s => s.startsWith('17:'));
  console.log(JSON.stringify(out), ok ? 'ALL OK' : 'FAIL'); console.log(errs.join('\n') || 'no errors'); await b.close(); })();
