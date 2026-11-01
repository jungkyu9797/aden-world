// 11/1 콜로세움 두 명: 같이 대기 → 입장 · 보스 잡으면 두 사람 모두 가호 완성품 +1 · 물약은 두 명이어도 각 50개 (KT_PORT=8799 bash dev/runkt.sh dev/tests/colo2_mp.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  const ctx = await b.newContext({ viewport: { width: 1000, height: 700 } }); const pg = [];
  for (const nm of ['coA', 'coB']) { const q = await ctx.newPage(); q.on('pageerror', e => errs.push(nm + ': ' + e.message)); await login(q, { cls: 'knight', name: nm, mp: true }); pg.push(q); }
  for (const q of pg) await q.evaluate(() => { const T = __T; T.GOD_INV = true; T.hero.lv = 60; T.INV.load({ bag: [{ id: 'lg_sword', n: 1, en: 5, on: 'weapon' }, { id: 'col_ticket', n: 1 }], bonus: { str: 30, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); window.__COLO.open(true); });
  await pg[0].waitForTimeout(1500);
  for (const q of pg) await q.evaluate(() => document.getElementById('co-join').click()); await pg[0].waitForTimeout(2500);
  await pg[0].evaluate(() => document.getElementById('co-join').click()); await pg[0].waitForTimeout(5000);
  const inA = await Promise.all(pg.map(q => q.evaluate(() => __T.ISLE && __T.ISLE.id === 14))); ok('둘 다 입장', inA.every(Boolean));
  const hi = (await Promise.all(pg.map(q => q.evaluate(() => __T.NET.hostHere())))).indexOf(true), H = pg[hi], G = pg[1 - hi]; ok('호스트 1명', hi >= 0);
  await H.evaluate(() => { const G = __T.GROUND, o = G.drop.bind(G); window.__DR = []; G.drop = (id, n, i, j) => { if (/potion/.test(id)) window.__DR.push([id, n]); return o(id, n, i, j); }; });
  const gah = q => q.evaluate(() => __T.INV.bag().filter(e => /^gaho_/.test(e.id)).reduce((a, e) => a + (e.n || 1), 0));
  await H.evaluate(() => { window.__COLO.dbg().t = 9.9; }); await H.waitForTimeout(2500);
  const g0 = await Promise.all([gah(H), gah(G)]);
  await H.evaluate(async () => { const T = __T; for (let t = 0; t < 1500; t++) { const L = T.foxes.filter(f => f.coloBoss && !f.dead && !f.gone); if (!L.length) return; for (const f of L) { if (f.ashT > 0) { f.ashT = Math.min(f.ashT, 0.05); continue; } f.hp = 1; T.strike(f); } await new Promise(r => setTimeout(r, 30)); } });
  await H.waitForTimeout(4000); const g1 = await Promise.all([gah(H), gah(G)]); console.log('gaho', g0, g1);
  ok('보스 1마리 처치 → 호스트·게스트 모두 가호 완성품 +1', g1[0] - g0[0] === 1 && g1[1] - g0[1] === 1);
  const dr = await H.evaluate(() => { const L = window.__DR; return { o: L.filter(d => d[0] === 'orange_potion').reduce((a, d) => a + d[1], 0), c: L.filter(d => d[0] === 'clear_potion').reduce((a, d) => a + d[1], 0) }; }); console.log('pots', JSON.stringify(dr));
  ok('두 명이어도 물약은 각 50개', dr.o === 50 && dr.c === 50);
  const ph = await G.evaluate(() => { const S = window.__COLO.dbg(); return S && [S.ph, S.r]; }); ok('게스트 화면도 2라운드 준비', ph && ph[0] === 'cd' && ph[1] === 2);
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
