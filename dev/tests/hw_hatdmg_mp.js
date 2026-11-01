// 할로윈 두 명 (KT_PORT=8796 bash dev/runkt.sh dev/tests/hw_hatdmg_mp.js): 각자 자기 모자 강화만큼 (호스트 +0 → 1 · 게스트 +5 → 5) · 서로 더해지지 않음 · 두 화면 HP 같음
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  const ctx = await b.newContext({ viewport: { width: 1000, height: 700 } }); const pg = [];
  for (const nm of ['hwMA', 'hwMB']) { const q = await ctx.newPage(); q.on('pageerror', e => errs.push(nm + ': ' + e.message)); await login(q, { cls: 'knight', name: nm, mp: true }); pg.push(q); }
  for (const q of pg) await q.evaluate(() => { __T.GOD_INV = true; __T.INV.load({ bag: [{ id: 'hw_hat', n: 1, en: 0 }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); __T.TOWN.toZone(21); });
  await pg[0].waitForTimeout(4000);
  const hi = (await Promise.all(pg.map(q => q.evaluate(() => __T.NET.hostHere())))).indexOf(true), H = pg[hi], G = pg[1 - hi]; ok('호스트 1명', hi >= 0);
  await G.evaluate(() => __T.INV.load({ bag: [{ id: 'hw_hat', n: 1, en: 5 }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }));
  const uid = await H.evaluate(() => { const T = __T, f = T.foxes.find(x => !x.dead && !x.gone && x.kind === 'hw_pumpkin_boss') || T.foxes.find(x => !x.dead && !x.gone && T.MOB[x.kind] && T.MOB[x.kind].hwEv); f.hp = f.max; window.__H0 = f.hp; return f.uid; }); await H.waitForTimeout(1500);
  // 게스트가 3대
  await G.evaluate(uid => { const T = __T, f = T.foxes.find(x => x.uid === uid); for (let k = 0; k < 3; k++) T.strike(f); }, uid); await H.waitForTimeout(2500);
  const h1 = await H.evaluate(uid => __T.foxes.find(x => x.uid === uid).hp, uid); console.log('after guest 3 hits (host view)', h1);
  const h0 = await H.evaluate(() => window.__H0); console.log('start hp', h0); ok('게스트(+5 모자) 3대 → 호스트 화면에서 15 깎임', h1 === h0 - 15);
  // 호스트가 3대
  await H.evaluate(uid => { const T = __T, f = T.foxes.find(x => x.uid === uid); for (let k = 0; k < 2; k++) T.strike(f); }, uid); await H.waitForTimeout(300);
  const h2 = await H.evaluate(uid => __T.foxes.find(x => x.uid === uid).hp, uid); console.log('after host 3 hits', h2);
  ok('호스트(+0 모자) 2대 → 2 깎임 · 게스트 모자와 안 더해짐', h2 === h1 - 2);
  await G.waitForTimeout(2000); const g2 = await G.evaluate(uid => { const f = __T.foxes.find(x => x.uid === uid); return f && f.hp; }, uid); console.log('guest view', g2); ok('게스트 화면도 같은 HP', g2 === h2);
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
