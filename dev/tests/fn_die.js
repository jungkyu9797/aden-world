// 화둥 몹 죽는 모습 (스킨 그대로인지) (bash dev/runkt.sh dev/tests/fn_die.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'fnD' }); await p.evaluate(() => { __T.GOD_INV = true; });
  for (const [z, kinds] of [[22, ['fn_warrior', 'fn_archer', 'fn_golem']], [23, ['fn_salamander', 'fn_hcerberus']]]) {
    await p.evaluate(z => __T.TOWN.toZone(z), z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', z, { timeout: 20000 }); await p.waitForTimeout(1500);
    for (const k of kinds) {
      await p.evaluate(k => { const T = __T, H = T.hero; for (let q = T.foxes.length - 1; q >= 0; q--) T.foxes.splice(q, 1); const m = T.mkMob(k, H.i + 2, H.j - 2); m.home = [m.i, m.j]; m.aggro = false; m.row = 1; T.foxes.push(m); window.__M = m; }, k);
      await p.waitForTimeout(1200);
      const [x, y] = await p.evaluate(() => __T.scr(__M.x, __M.z)); const clip = { x: x - 110, y: y - 170, width: 220, height: 200 };
      await p.screenshot({ path: `dev/out/die_${k}_0.png`, clip });
      const info = await p.evaluate(() => { const f = __M; f.bindUntil = __T.time + 99; f.hp = 5; __T.strike ? 0 : 0; f.flash = 0.09; f.hitT = 0.3; f.hitD = 0.3; f.kx = 1; f.ky = 0; f.kmag = 5; f.hp = -1; __T.killCheck(f); return { dead: f.dead, flash: f.flash }; });
      for (const ms of [40, 150, 400, 800]) { await p.waitForTimeout(ms === 40 ? 40 : ms - 0); await p.screenshot({ path: `dev/out/die_${k}_${ms}.png`, clip }); }
      console.log(k, JSON.stringify(info));
    } }
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
