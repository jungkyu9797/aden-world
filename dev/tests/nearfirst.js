// 11/5 프로듀서: 여러 몹에게 맞을 때 자동사냥 순서 = 붙어서 나를 치는 몹 → 파티원을 치는 몹 → 멀리서 치는(원거리) 몹
//   둘러싸인 채로 멀리서 쏘는 원거리 몹을 잡으러 걸어가지 않음
//   KT_PORT=8898 bash dev/runkt.sh dev/tests/nearfirst.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 680 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'nfs' }); await p.evaluate(() => { document.getElementById('gp-lv').value = 61; document.getElementById('gp-apply').click(); __T.GOD_INV = true; });
  await p.evaluate(() => __T.TOWN.toZone(2)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 2 && __T.SCENE === 'field', null, { timeout: 60000 }); await p.waitForTimeout(1500);
  const r = await p.evaluate(async () => { const T = __T, F = __FB, H = T.hero, A = T.AUTO, w = ms => new Promise(r => setTimeout(r, ms));
    F.setRef && F.setRef({ copy: F.mine() }); const x = F.roster().A.find(q => !q.pt && !F.pb.why(q.uid)); F.pb.invite(x.uid); await w(800); F.pb.cmd('wait'); const e = F.pb.here()[0]; if (!e) return { err: 'no bot' };
    A.setCfg({ loot: false, retHp: 0, lowPot: false, sell: false, aggrFirst: true, counter: true }); if (!A.on()) A.toggle();
    const L = T.foxes.filter(f => !f.dead && !f.gone && T.MOB[f.kind] && !T.MOB[f.kind].boss && !T.MOB[f.kind].midb && !f.fb).slice(0, 4); if (L.length < 4) return { err: 'mobs ' + L.length };
    const [N, N2, P, R] = L, put = (f, i, j) => { f.i = f.fi = i; f.j = f.fj = j; f.x = i + 0.5; f.z = j + 0.5; };
    const clr = () => { for (const f of L) { f.aggro = false; f.tgt = null; f.hitMeT = 0; f.myDmg = 0; f.dmgBy = null; } e.hitBy = null; e.hitByT = -99; };
    const onMe = f => { f.aggro = true; f.tgt = H; f.hitMeT = T.time; }, onBot = f => { f.aggro = true; f.tgt = e; e.hitBy = f; e.hitByT = T.time; };
    const run = s => { for (let k = 0; k < Math.round(s / 0.05); k++) { H.atk = null; A.tick(0.05); } }, nm = f => f === N ? 'N(붙어서 나를 침)' : f === N2 ? 'N2(붙어서 나를 침)' : f === P ? 'P(파티원을 침)' : f === R ? 'R(멀리서 나를 침)' : String(f && f.kind);
    const out = {}; put(e, H.i - 1, H.j); e.i = H.i - 1; e.j = H.j;
    const place = () => { put(N, H.i + 1, H.j); put(N2, H.i + 1, H.j + 1); put(P, H.i - 4, H.j); put(R, H.i, H.j + 5); };
    // ① 멀리서 쏘는 R(5칸)을 잡으러 가는 중(한 번 때림) · 옆에 붙은 N·N2가 나를 때림 → 붙은 몹으로 갈아탐
    clr(); place(); onMe(R); R.myDmg = 30; onMe(N); onMe(N2); H.target = R; run(1.2); out.one = nm(H.target);
    // ② 붙어서 나를 치는 N을 잡는 중(때림) → 다른 몹이 나를 쳐도 N을 마저 잡음
    clr(); place(); onMe(N); N.myDmg = 30; onMe(N2); onMe(R); onBot(P); H.target = N; run(1.2); out.two = nm(H.target);
    // ③ 아직 안 때린 R(멀리서 나를 침)에게 가는 중에 P가 파티원을 침 → P로 (파티원을 치는 몹이 원거리 몹보다 먼저)
    clr(); place(); onMe(R); H.target = R; run(0.2); onBot(P); run(1.2); out.three = nm(H.target);
    // ④ 대상이 없을 때 고르는 순서: N(1칸·나를 침) → P(4칸·파티원을 침) → R(5칸·나를 침)
    clr(); place(); onMe(N); onBot(P); onMe(R); H.target = null; run(0.3); out.p1 = nm(H.target);
    H.target = null; N.dead = true; run(0.3); out.p2 = nm(H.target);
    H.target = null; P.dead = true; e.hitBy = null; run(0.3); out.p3 = nm(H.target);
    if (A.on()) A.toggle(); return out; });
  console.log(JSON.stringify(r));
  ok(r.one === 'N(붙어서 나를 침)' || r.one === 'N2(붙어서 나를 침)', `① 둘러싸이면 멀리 있는 원거리 몹 대신 붙어서 치는 몹 (${r.one})`);
  ok(r.two === 'N(붙어서 나를 침)', `② 붙어서 치던 몹은 마저 잡음 (${r.two})`);
  ok(r.three === 'P(파티원을 침)', `③ 원거리 몹보다 파티원을 치는 몹 먼저 (${r.three})`);
  ok(r.p1 === 'N(붙어서 나를 침)', `④-1 첫째: 붙어서 나를 치는 몹 (${r.p1})`);
  ok(r.p2 === 'P(파티원을 침)', `④-2 둘째: 파티원을 치는 몹 (${r.p2})`);
  ok(r.p3 === 'R(멀리서 나를 침)', `④-3 셋째: 멀리서 나를 치는 몹 (${r.p3})`);
  ok(!errs.length, '오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
