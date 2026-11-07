// 11/4 프로듀서: 자동사냥 중 몹이 많아도 잡기 시작한 몹(때렸거나 나를 노리는 몹)은 죽을 때까지 — 다른 몹으로 안 갈아탐
//   KT_PORT=8896 bash dev/runkt.sh dev/tests/autotgt.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 680 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'atg' }); await p.evaluate(() => { const T = __T; T.GOD_INV = true; T.hero.lv = 30; });
  await p.evaluate(() => __T.TOWN.toZone(2)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 2 && __T.SCENE === 'field', null, { timeout: 60000 }); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const T = __T, H = T.hero, A = T.AUTO; A.setCfg({ loot: false, retHp: 0, lowPot: false, sell: false, aggrFirst: true }); if (!A.on()) A.toggle();
    const L = T.foxes.filter(f => !f.dead && !f.gone && T.MOB[f.kind] && !T.MOB[f.kind].boss && !f.fb).slice(0, 3); if (L.length < 3) return { err: 'mobs ' + L.length };
    const [a, m, c] = L, put = (f, i, j) => { f.i = i; f.j = j; f.x = i + 0.5; f.z = j + 0.5; };
    const out = {}; const run = s => { for (let k = 0; k < Math.round(s / 0.05); k++) { H.atk = null; A.tick(0.05); } };
    // ① 내가 때린 몹 a(옆 · 사거리 안 — 11/7부터 사거리 밖으로 벗어나 못 치면 옆에서 나를 치는 몹으로 바꿈: dev/tests/autoswap.js) · 다른 몹 m이 옆에서 나를 때리는 중 · 다른 몹 c(2칸)
    put(a, H.i + 1, H.j); put(m, H.i + 1, H.j + 1); put(c, H.i, H.j + 2); for (const f of L) { f.aggro = false; f.tgt = null; f.hitMeT = 0; f.myDmg = 0; f.dmgBy = null; }
    a.myDmg = 30; m.aggro = true; m.tgt = H; m.hitMeT = T.time; H.target = a; run(2); out.locked = H.target === a;
    // ② 아직 안 때린 몹 a에게 걸어가는 중이면 지금처럼 나를 때리는 몹으로 갈아탐
    a.myDmg = 0; a.dmgBy = null; a.aggro = false; a.tgt = null; a.hitMeT = 0; m.hitMeT = T.time; H.target = a; run(2); out.swap = H.target === m;
    // ③ 잡던 몹이 죽으면 다음 몹
    H.target = a; a.myDmg = 30; a.dead = true; run(1); out.next = !!H.target && H.target !== a && !H.target.dead;
    if (A.on()) A.toggle(); return out; });
  console.log(JSON.stringify(r));
  ok(r.locked, '① 잡던 몹(내가 때림 · 사거리 안)은 다른 몹이 나를 때려도 안 바꿈');
  ok(r.swap, '② 아직 안 때린 몹에게 가는 중이면 나를 때리는 몹으로 갈아탐 (지금처럼)');
  ok(r.next, '③ 잡던 몹이 죽으면 다음 몹을 고름');
  ok(!errs.length, '오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
