// 10/30 화둥 몹 AC 명중 곡선 (−127 80% · −110 90% · −100 100%) (bash dev/runkt.sh dev/tests/fn_minhit.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await login(p, { cls: 'knight', name: 'mhT' });
  const r = await p.evaluate(() => { const T = __T, H = T.hero, M = T.MOB; H.lv = 57; const out = {};
    for (const [nm, ac] of [['AC-150', -150], ['AC-127', -127], ['AC-120', -120], ['AC-110', -110], ['AC-105', -105], ['AC-100', -100], ['AC-80', -80]]) { T.INV.ac = () => ac; out[nm] = {}; for (const k of ['fn_warrior', 'fn_salamander', 'fn_ifrit', 'phoenix', 'drake', 'wyvern']) out[nm][M[k].name] = Math.round(T.MOBHIT_(M[k]) * 100); }
    return out; });
  console.log(JSON.stringify(r)); const ok = r['AC-127']['불타는 전사'] === 80 && r['AC-110']['이프리트'] === 90 && r['AC-100']['피닉스'] === 100 && r['AC-80']['사라만다'] === 100 && r['AC-127']['드레이크'] === 10;
  console.log(ok ? 'ALL OK' : 'FAIL'); console.log(errs.join('\n') || 'no errors'); await b.close(); })();
