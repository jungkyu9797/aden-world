// 11/7 프로듀서: 자동사냥 중 둘러싸였는데 잡던 몹이 내 사거리 밖으로 벗어나 칠 수 없으면 → 붙어서(사거리 안) 나를 치는 몹으로 바꿈
//   ① 잡던 몹(내가 때림)이 2칸 밖 + 옆에서 나를 치는 몹 → 그 몹으로 (전에는 2칸 안이라 계속 붙잡고 갇힘)
//   ② 나를 치는 몹이 없는데 사거리 밖 대상에게 1.5초 넘게 못 다가가면 → 그 몹은 4초 빼고 다시 고름
//   ③ 잡던 몹이 사거리 안이면 옆에서 다른 몹이 쳐도 그대로 (v230 · 계속 바뀌지 않게) ④ 오류 없음
//   KT_PORT=8907 bash dev/runkt.sh dev/tests/autoswap.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 680 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'asw' }); await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 40; });
  await p.evaluate(() => __T.TOWN.toZone(2)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 2 && __T.SCENE === 'field', null, { timeout: 60000 }); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const T = __T, H = T.hero, A = T.AUTO;
    A.setCfg({ loot: false, retHp: 0, lowPot: false, sell: false, aggrFirst: true, counter: false }); if (!A.on()) A.toggle();
    const L = T.foxes.filter(f => !f.dead && !f.gone && T.MOB[f.kind] && !T.MOB[f.kind].boss && !T.MOB[f.kind].midb && !f.fb).slice(0, 4); if (L.length < 4) return { err: 'mobs ' + L.length };
    const [Tg, N, M, Q] = L, put = (f, i, j) => { f.i = f.fi = i; f.j = f.fj = j; f.x = i + 0.5; f.z = j + 0.5; };
    const clr = () => { for (const f of L) { f.aggro = false; f.tgt = null; f.hitMeT = 0; f.myDmg = 0; f.dmgBy = null; f._skipT = 0; f.stunT = 99; } for (const f of T.foxes) if (!L.includes(f) && !f.fb) { f.gone = true; } };
    const onMe = f => { f.aggro = true; f.tgt = H; f.hitMeT = T.time; }, hit = f => { f.myDmg = 30; };
    const run = s => { for (let k = 0; k < Math.round(s / 0.05); k++) { H.atk = null; A.tick(0.05); for (const f of L) if (f.tgt === H && f.aggro) f.hitMeT = T.time; } };
    const nm = f => f === Tg ? 'T(잡던 몹)' : f === N ? 'N(옆에서 나를 침)' : f === M ? 'M(옆 · 안 침)' : f === Q ? 'Q' : String(f && f.kind);
    const out = {}; const i0 = H.i, j0 = H.j;
    // ①
    clr(); put(Tg, i0 + 2, j0); put(N, i0 - 1, j0); put(M, i0, j0 + 1); put(Q, i0 + 1, j0 + 1); hit(Tg); onMe(N); H.target = Tg; const s0 = A.swap().n; run(1);
    out.a = { tg: nm(H.target), swaps: A.swap().n - s0 };
    // ②
    clr(); put(Tg, i0 + 2, j0); put(N, i0 - 1, j0); put(M, i0, j0 + 1); put(Q, i0 + 1, j0 + 1); hit(Tg); H.target = Tg; const k0 = A.swap().stuck; run(1.0); const mid = nm(H.target); run(1.5);
    out.b = { mid, tg: nm(H.target), stuck: A.swap().stuck - k0, skip: Tg._skipT > T.time };
    // ③
    clr(); put(Tg, i0 + 1, j0); put(N, i0 - 1, j0); put(M, i0, j0 + 1); put(Q, i0 + 3, j0 + 3); hit(Tg); onMe(Tg); onMe(N); H.target = Tg; run(3);
    out.c = { tg: nm(H.target) };
    for (const f of L) f.stunT = 0; A.toggle(); return out; });
  console.log(JSON.stringify(r));
  ok(r.a && r.a.tg === 'N(옆에서 나를 침)' && r.a.swaps >= 1, `① 잡던 몹이 2칸 밖(못 침) → 옆에서 나를 치는 몹으로 (${r.a && r.a.tg})`);
  ok(r.b && r.b.mid === 'T(잡던 몹)' && r.b.tg !== 'T(잡던 몹)' && r.b.stuck >= 1 && r.b.skip, `② 나를 치는 몹이 없으면 1.5초 동안은 그대로(${r.b && r.b.mid}) → 못 다가가면 다시 고름 (${r.b && r.b.tg})`);
  ok(r.c && r.c.tg === 'T(잡던 몹)', `③ 잡던 몹이 사거리 안이면 옆에서 다른 몹이 쳐도 그대로 (${r.c && r.c.tg})`);
  ok(!errs.length, '④ 오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
