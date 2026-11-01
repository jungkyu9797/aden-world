// 몽환의 섬 3차 그리기 비용 나눠 재기 (개발용) — KT_PORT=8774 bash dev/runkt.sh dev/tests/dream3_prof.js
//   화면 밖 캔버스 1280×800 · 확대 2 · 정령 20(대정령 5) + 유니콘 · 프레임마다 rAF 기다림 → 그리기만 잰 ms
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await login(p, { cls: 'knight', name: 'drf' }); await p.evaluate(() => __T.TOWN.toZone(24)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 24 && __T.DRA_ && __T.DRA_.DRA.ok, null, { timeout: 60000 });
  const r = await p.evaluate(async () => { const T = __T, D = T.DRA_.DRA, K = ['fire', 'water', 'earth', 'wind'], F = [];
    for (let n = 0; n < 20; n++) { const el = K[n % 4], k = n < 15 ? 'dr_' + el : 'dr_g' + el, f = T.mkMob(k, 5, 5); f.row = n % 8; f.hi = n * 0.37; F.push(f); }
    const u = T.mkMob('unicorn', 5, 5); u.row = 2; F.push(u);
    const c = document.createElement('canvas'); c.width = 1280; c.height = 800; const g = c.getContext('2d'); const out = {};
    const run = async (nm, setup) => { setup(); let s = 0, n = 0; for (let k = 0; k < 90; k++) { await new Promise(r => requestAnimationFrame(r)); const a = performance.now(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 1280, 800); g.setTransform(2, 0, 0, 2, 0, 0);
        F.forEach((f, i) => { g.save(); g.translate(60 + (i % 7) * 85, 120 + Math.floor(i / 7) * 110); T.PROCFX[T.MOB[f.kind].art][0](g, f); g.restore(); }); g.getImageData(0, 0, 1, 1); if (k >= 20) { s += performance.now() - a; n++; } } out[nm] = +(s / n).toFixed(2); };
    const dr0 = D.draw.bind(D);
    await run('old', () => { D.ok = false; });
    await run('new', () => { D.ok = true; D.draw = dr0; });
    await run('new_noaura', () => { D.ok = true; D.draw = (g, key, a, fi, row) => key[0] === 'a' ? null : dr0(g, key, a, fi, row); });
    await run('new_aura_only', () => { D.ok = true; D.draw = (g, key, a, fi, row) => key[0] === 'a' ? dr0(g, key, a, fi, row) : D.fr(key, a, fi, row); });
    await run('new_noblit', () => { D.ok = true; D.draw = dr0; D._b = D.blit; D.blit = () => false; });
    D.blit = D._b; D.draw = dr0;
    return { out, cache: { n: D.C.m.size, px: D.C.px } }; });
  console.log(JSON.stringify(r)); await b.close(); })();
