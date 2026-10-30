// 10/30 사냥터별 회피 구간 (화둥: −120~−129 회피 20% · 10방마다 5%) (bash dev/runkt.sh dev/tests/fn_minhit.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await login(p, { cls: 'knight', name: 'mhT' });
  const out = {};
  for (const [z, k] of [[22, 'fn_warrior'], [23, 'phoenix'], [17, 'drake'], [12, 'etin'], [10, 'cerberus'], [8, 'bugbear'], [1, 'goblin']]) {
    await p.evaluate(z => __T.TOWN.toZone(z), z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', z, { timeout: 20000 }); await p.waitForTimeout(500);
    out[z] = await p.evaluate(k => { const T = __T, S = T.MOB[k] || Object.values(T.MOB)[0], r = {}; const ac0 = T.INV.ac; for (const ac of [0, -20, -40, -60, -80, -95, -105, -115, -125, -135, -150, -250]) { T.INV.ac = () => ac; r[ac] = Math.round(T.MOBHIT_(S) * 100); } T.INV.ac = ac0; return { mob: S.name, r }; }, k); }
  await p.evaluate(() => __T.TOWN.toZone(15)).catch(() => {});
  for (const [z, v] of Object.entries(out)) console.log(z, v.mob, JSON.stringify(v.r));
  const ok = out[22].r[-127] === 80 && out[22].r[-110] === 90 && out[22].r[-100] === 100 && out[23].r[-127] === 90 && out[17].r[-115] === 80 && out[1].r[-15] === undefined || true;
  const cw = await p.evaluate(async () => { __T.INV.ac = () => -125; await __T.TOWN.toZone(22); return 1; }).catch(() => 0); await p.waitForTimeout(2500); const mev = await p.evaluate(() => { const b = [...document.querySelectorAll('#charwin button, button')].find(x => /캐릭터/.test(x.textContent)); document.getElementById('charwin').hidden = false; return new Promise(r => setTimeout(() => r(document.getElementById('cw-mev').textContent), 1200)); }); console.log('charwin 몹 공격 회피:', mev);
  console.log(out[22].r[-125] === 80 && out[22].r[-115] === 85 && out[22].r[-105] === 90 && out[22].r[-95] === 95 && out[22].r[-80] === 100 && out[22].r[-135] === 75 && out[22].r[-250] === 40 && out[23].r[-125] === 90 ? 'ALL OK' : 'FAIL'); console.log(errs.join('\n') || 'no errors'); await b.close(); })();
