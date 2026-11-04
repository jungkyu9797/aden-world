// 11/4 프로듀서: 마법사 서먼 몬스터 Lv60 = 혼 켈베로스 (HP 1300 · 공격 원래 몹의 60% · 불꽃 물기 25% 4초 화상)
//   KT_PORT=8896 bash dev/runkt.sh dev/tests/sumcerb.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 680 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'wizard', name: 'smc' }); await p.evaluate(() => { __T.GOD_INV = true; __T.GOD_MP = true; });
  await p.evaluate(() => __T.TOWN.toZone(2)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 2 && __T.SCENE === 'field', null, { timeout: 60000 }); await p.waitForTimeout(1000);
  const r = await p.evaluate(async () => { const T = __T, H = T.hero, w = ms => new Promise(r => setTimeout(r, ms)); const out = {};
    for (const lv of [59, 60, 64]) { H.lv = lv; T.PET.sumClear && T.PET.sumClear('test'); await w(200); T.PET.sumCast(1); await w(300); const s = T.PETS_HERE_().find(q => q.sum && !q.dead); out[lv] = s ? { kind: s.kind, name: s.d.name, hp: T.PET.mxh(s.d) } : null; }
    H.lv = 60; T.PET.sumClear && T.PET.sumClear('test'); await w(200); T.PET.sumCast(1); await w(300); const s = T.PETS_HERE_().find(q => q.sum && !q.dead);
    const m = T.foxes.find(f => !f.dead && !f.fb && T.MOB[f.kind] && !T.MOB[f.kind].boss); m.hp = m.max = 1e7; m.bleed = null; let burned = 0, tries = 0;
    m.i = m.fi = s.i + 1; m.j = m.fj = s.j; m.x = m.i + 0.5; m.z = m.j + 0.5; m.aggro = false; m.tgt = null; H.target = m;
    for (let k = 0; k < 300 && !burned; k++) { s.target = m; m.bleed = null; m.i = m.fi = s.i + 1; m.j = m.fj = s.j; m.x = m.i + 0.5; m.z = m.j + 0.5; await w(50); tries++; if (m.bleed && m.bleed.burn) burned = 1; }
    out.burn = burned ? { t: m.bleed.t, dps: m.bleed.dps, psn: m.bleed.psn } : null; out.tries = tries; out.msg = T.log.slice(-20).map(l => l.t).filter(t => /화상/.test(t)).length; return out; });
  console.log(JSON.stringify(r));
  ok(r[59] && r[59].kind === 'wyvern', `① Lv59: 와이번 (${r[59] && r[59].name})`);
  ok(r[60] && r[60].kind === 'fn_hcerberus' && r[60].hp === 1300, `① Lv60: 혼 켈베로스 HP ${r[60] && r[60].hp}`);
  ok(r[64] && r[64].kind === 'fn_hcerberus' && r[64].hp > 1300, `① Lv64: 혼 켈베로스 레벨 보정 HP ${r[64] && r[64].hp}`);
  ok(r.burn && r.burn.psn === 0 && r.burn.t > 0 && r.burn.dps > 0, `② 불꽃 물기 → 화상 (초당 ${r.burn && r.burn.dps})`);
  ok(!errs.length, '오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
