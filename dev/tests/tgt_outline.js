// 10/30 고른 대상 빨간 테두리 (bash dev/runkt.sh dev/tests/tgt_outline.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 700 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'tgO' }); await p.evaluate(() => { __T.GOD_INV = true; });
  for (const [z, kind, nm] of [[1, null, 'z1'], [17, null, 'z17']]) {
    await p.evaluate(z => __T.TOWN.toZone(z), z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', z, { timeout: 20000 }); await p.waitForTimeout(1500);
    const info = await p.evaluate(() => { const T = __T, H = T.hero; let best = null, bd = 1e9; for (const f of T.foxes) { if (f.dead) continue; const d = Math.hypot(f.x - H.x, f.z - H.z); if (d < bd) { bd = d; best = f; } } best.stunT = 99; best.aggro = false; best.i = best.fi = H.i + 2; best.j = best.fj = H.j - 1; best.x = best.i + .5; best.z = best.j + .5; best.t = 1; best.home = [best.i, best.j]; H.target = best; window.__M = best; return best.kind; });
    await p.waitForTimeout(500); const [x, y] = await p.evaluate(() => __T.scr(__M.x, __M.z));
    await p.screenshot({ path: `dev/out/tgt_${nm}.png`, clip: { x: 380, y: 60, width: 360, height: 360 } }); console.log(nm, info);
    await p.evaluate(() => { __T.hero.target = null; }); await p.waitForTimeout(300); await p.screenshot({ path: `dev/out/tgt_${nm}_off.png`, clip: { x: 380, y: 60, width: 360, height: 360 } }); }
  const fps = await p.evaluate(async () => { __T.hero.target = window.__M; let n = 0; const t0 = performance.now(); await new Promise(r => { const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); }); return n / 2; });
  console.log('fps with target', fps); console.log(errs.join('\n') || 'no errors'); await b.close(); })();
