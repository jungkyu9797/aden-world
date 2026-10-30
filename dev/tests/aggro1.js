// 10/30 선공 인식 거리 +1 (bash dev/runkt.sh dev/tests/aggro1.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await login(p, { cls: 'knight', name: 'agT' });
  const r = await p.evaluate(() => { const M = __T.MOB; return { egg: M.fn_egg && M.fn_egg.aggr, war: M.fn_warrior && M.fn_warrior.aggr, ifrit: M.fn_ifrit && M.fn_ifrit.aggr, dk: M.deathknight.aggr, goblin: M.goblin.aggr || 0 }; });
  await p.evaluate(z => __T.TOWN.toZone(z), 17); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 17 && __T.SCENE === 'field', null, { timeout: 20000 }); await p.waitForTimeout(800);
  const t = await p.evaluate(async () => { const T = __T, H = T.hero; T.GOD_INV = true; const f = T.foxes.find(m => !m.dead && T.MOB[m.kind].aggr); for (const m of T.foxes) if (m !== f) { m.aggro = false; m.i = m.fi = 2; m.j = m.fj = 2; m.x = 2.5; m.z = 2.5; }
    const A = T.MOB[f.kind].aggr; f.aggro = false; f.i = f.fi = H.i + A; f.j = f.fj = H.j; f.x = f.i + .5; f.z = f.j + .5; f.home = [f.i, f.j]; f.t = 1; await new Promise(r => setTimeout(r, 800)); return { kind: f.kind, A, aggro: f.aggro }; });
  const ok = r.war === 7 && r.ifrit === 8 && r.egg === 5 && r.dk === 8 && t.aggro;
  console.log(JSON.stringify({ r, t }), ok ? 'ALL OK' : 'FAIL'); console.log(errs.join('\n') || 'no errors'); await b.close(); })();
