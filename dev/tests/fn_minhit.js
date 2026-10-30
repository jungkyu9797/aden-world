// 10/30 화둥 몹 최저 명중 60% (bash dev/runkt.sh dev/tests/fn_minhit.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await login(p, { cls: 'knight', name: 'mhT' });
  const r = await p.evaluate(() => { const T = __T, H = T.hero, M = T.MOB; H.lv = 57; const out = {};
    for (const [nm, ac] of [['AC-127', -127], ['AC-80', -80], ['AC-40', -40]]) { T.INV.ac = () => ac; out[nm] = {}; for (const k of ['fn_warrior', 'fn_salamander', 'fn_ifrit', 'phoenix', 'drake', 'wyvern']) out[nm][M[k].name] = Math.round(T.MOBHIT_(M[k]) * 100); }
    return out; });
  console.log(JSON.stringify(r)); const ok = r['AC-127']['불타는 전사'] === 60 && r['AC-127']['피닉스'] === 60 && r['AC-127']['드레이크'] === 10 && r['AC-40']['이프리트'] > 60;
  console.log(ok ? 'ALL OK' : 'FAIL'); console.log(errs.join('\n') || 'no errors'); await b.close(); })();
