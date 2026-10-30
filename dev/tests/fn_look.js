// 화룡의 둥지 확인: 1·2구역 입장 · 몬스터 수 · 용암 · 그림 (bash dev/runkt.sh dev/tests/fn_look.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'fnT' });
  const L = async (k, f, a) => console.log(k, JSON.stringify(await p.evaluate(f, a)));
  await p.evaluate(() => { __T.GOD_INV = true; });
  for (const Z of [22, 23]) {
    await p.evaluate(Z => __T.TOWN.toZone(Z), Z); await p.waitForFunction(Z => __T.ISLE && __T.ISLE.id === Z, Z, { timeout: 20000 }); await p.waitForTimeout(2500);
    await L('zone' + Z, () => ({ name: __T.ISLE.name, mobs: __T.foxes.filter(f => !f.dead).map(f => f.kind).reduce((o, k) => (o[k] = (o[k] || 0) + 1, o), {}), lava: __T.ISLE.lava ? __T.ISLE.lava.size : 0, pools: (__T.ISLE.def.lavaList || []).length, portals: __T.ISLE.portals.map(q => [q.i, q.j, q.to]), hero: [__T.hero.i, __T.hero.j] }));
    await p.screenshot({ path: `dev/out/fn_${Z}_a.png` });
    // 몬스터마다 가까이 가서 찍기
    const kinds = await p.evaluate(() => [...new Set(__T.foxes.filter(f => !f.dead).map(f => f.kind))]);
    for (const k of kinds) { const ok = await p.evaluate(k => { const f = __T.foxes.find(m => m.kind === k && !m.dead); if (!f) return false; const H = __T.hero; H.i = H.fi = Math.max(1, f.i - 2); H.j = H.fj = f.j + 1; H.x = H.i + 0.5; H.z = H.j + 0.5; H.t = 1; return true; }, k); if (!ok) continue; await p.waitForTimeout(900); await p.screenshot({ path: `dev/out/fn_${Z}_${k}.png`, clip: { x: 340, y: 150, width: 600, height: 450 } }); }
  }
  // 피닉스: 소환해서 부활 확인
  await p.evaluate(() => { __T.GOD_INV = true; const H = __T.hero; const m = __T.mkMob('phoenix', H.i + 3, H.j); m.home = [H.i + 3, H.j]; m.aggro = true; __T.foxes.push(m); window.__ph = m; });
  await p.waitForTimeout(1500); await p.screenshot({ path: 'dev/out/fn_phoenix.png' });
  await p.evaluate(() => { __ph.hp = 5; __T.killCheck ? 0 : 0; }); await p.evaluate(() => { const f = __ph; f.hp = -10; __T.killCheck(f); });
  await L('ash', () => ({ dead: __ph.dead, hp: __ph.hp, ashT: __ph.ashT, reborn: __ph.reborn }));
  await p.waitForTimeout(1200); await p.screenshot({ path: 'dev/out/fn_phoenix_ash.png' });
  await p.waitForTimeout(3500); await L('rise', () => ({ dead: __ph.dead, hp: __ph.hp, max: __ph.max, ashT: __ph.ashT }));
  await p.screenshot({ path: 'dev/out/fn_phoenix_rise.png' });
  await p.evaluate(() => { const f = __ph; f.hp = -10; __T.killCheck(f); }); await p.waitForTimeout(800);
  await L('dead2', () => ({ dead: __ph.dead, ground: __T.GROUND && __T.GROUND.list ? __T.GROUND.list().length : null, log: __T.log.slice(-6).map(x => x.t || x.text || x) }));
  await p.screenshot({ path: 'dev/out/fn_phoenix_loot.png' });
  // 용암 위에 서기 (갓 무적 끄고)
  await p.evaluate(() => { __T.GOD_INV = false; const L = __T.ISLE.lava; const k = [...L][0]; const H = __T.hero; H.i = H.fi = k % 1000; H.j = H.fj = Math.floor(k / 1000); H.x = H.i + 0.5; H.z = H.j + 0.5; H.hp = H.max; window.__hp0 = H.hp; for (const f of __T.foxes) f.aggro = false; });
  await p.waitForTimeout(3200); await L('lava', () => ({ hp0: __hp0, hp: __T.hero.hp, log: __T.log.slice(-4).map(x => x.t || x.text || x) }));
  await p.screenshot({ path: 'dev/out/fn_lava.png' });
  // 월드맵 도감
  await L('items', () => ['fire_scale', 'astazio_ash', 'phoenix_feather', 'fn_ring', 'fn_amulet', 'fn_hring', 'fn_phx_amulet'].map(id => __T.ITEMS[id] ? [id, __T.ITEMS[id].name, __T.ITEMS[id].rar, __T.ITEMS[id].fireRes || 0] : [id, null]));
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
