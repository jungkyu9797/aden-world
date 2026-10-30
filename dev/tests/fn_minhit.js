// 10/30 사냥터별 기준 AC 명중 곡선 (bash dev/runkt.sh dev/tests/fn_minhit.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await login(p, { cls: 'knight', name: 'mhT' });
  const out = {};
  for (const [z, k] of [[22, 'fn_warrior'], [23, 'phoenix'], [17, 'drake'], [12, 'etin'], [10, 'cerberus'], [8, 'bugbear'], [1, 'goblin']]) {
    await p.evaluate(z => __T.TOWN.toZone(z), z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', z, { timeout: 20000 }); await p.waitForTimeout(500);
    out[z] = await p.evaluate(k => { const T = __T, S = T.MOB[k] || Object.values(T.MOB)[0], r = {}; const ac0 = T.INV.ac; for (const ac of [0, -20, -40, -60, -80, -100, -110, -127, -150, -200]) { T.INV.ac = () => ac; r[ac] = Math.round(T.MOBHIT_(S) * 100); } T.INV.ac = ac0; return { mob: S.name, r }; }, k); }
  await p.evaluate(() => __T.TOWN.toZone(15)).catch(() => {});
  for (const [z, v] of Object.entries(out)) console.log(z, v.mob, JSON.stringify(v.r));
  const ok = out[22].r[-127] === 80 && out[22].r[-110] === 90 && out[22].r[-100] === 100 && out[23].r[-127] === 90 && out[17].r[-115] === 80 && out[1].r[-15] === undefined || true;
  console.log(out[22].r[-127] === 80 && out[22].r[-110] === 90 && out[22].r[-100] === 100 && out[17].r[-200] === 40 ? 'ALL OK' : 'FAIL'); console.log(errs.join('\n') || 'no errors'); await b.close(); })();
