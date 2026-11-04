// 11/4 프로듀서: 혈맹 파티 봇이 ① 일점사일 때 자동사냥 대상 순서 = 나를 치는 몹 → 파티 봇을 치는 몹 → 새 몹
//   KT_PORT=8897 bash dev/runkt.sh dev/tests/ptfocus.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 680 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'ptf' }); await p.evaluate(() => { document.getElementById('gp-lv').value = 61; document.getElementById('gp-apply').click(); __T.GOD_INV = true; });
  await p.evaluate(() => __T.TOWN.toZone(2)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 2 && __T.SCENE === 'field', null, { timeout: 60000 }); await p.waitForTimeout(1500);
  const r = await p.evaluate(async () => { const T = __T, F = __FB, H = T.hero, A = T.AUTO, w = ms => new Promise(r => setTimeout(r, ms));
    F.setRef && F.setRef({ copy: F.mine() }); const x = F.roster().A.find(q => !q.pt && !F.pb.why(q.uid)); F.pb.invite(x.uid); await w(800); F.pb.cmd('wait'); const e = F.pb.here()[0]; if (!e) return { err: 'no bot' };
    A.setCfg({ loot: false, retHp: 0, lowPot: false, sell: false, aggrFirst: true, counter: true }); if (!A.on()) A.toggle();
    const L = T.foxes.filter(f => !f.dead && !f.gone && T.MOB[f.kind] && !T.MOB[f.kind].boss && !T.MOB[f.kind].midb && !f.fb).slice(0, 3); if (L.length < 3) return { err: 'mobs' };
    const [ma, mb, mc] = L, put = (f, i, j) => { f.i = f.fi = i; f.j = f.fj = j; f.x = i + 0.5; f.z = j + 0.5; }, clr = () => { for (const f of L) { f.aggro = false; f.tgt = null; f.hitMeT = 0; f.myDmg = 0; f.dmgBy = null; } e.hitBy = null; e.hitByT = -99; };
    const run = s => { for (let k = 0; k < Math.round(s / 0.05); k++) { H.atk = null; A.tick(0.05); } }, nm = f => f === ma ? 'A(봇을 침)' : f === mb ? 'B(새 몹)' : f === mc ? 'C(나를 침)' : String(f && f.kind);
    const out = {}; put(e, H.i - 1, H.j); e.i = H.i - 1; e.j = H.j;
    // ① 봇을 치는 몹 A(5칸) · 새 몹 B(2칸) → A
    clr(); put(ma, H.i - 5, H.j); put(mb, H.i + 2, H.j); put(mc, H.i, H.j + 7); ma.aggro = true; ma.tgt = e; e.hitBy = ma; e.hitByT = T.time; H.target = null; run(0.3); out.one = nm(H.target);
    // ② 나를 치는 몹 C(7칸)도 있으면 C 먼저
    H.target = null; mc.aggro = true; mc.tgt = H; mc.hitMeT = T.time; run(0.3); out.two = nm(H.target);
    // ③ 새 몹 B에게 걸어가는 중(아직 안 때림)에 A가 봇을 치기 시작 → A로 갈아탐
    clr(); put(mb, H.i + 3, H.j); H.target = mb; run(0.2); ma.aggro = true; ma.tgt = e; e.hitBy = ma; e.hitByT = T.time; run(1.2); out.three = nm(H.target);
    // ④ 잡던 몹(내가 때림)이면 봇을 치는 몹이 있어도 마저 잡음
    clr(); mb.myDmg = 20; H.target = mb; ma.aggro = true; ma.tgt = e; e.hitBy = ma; e.hitByT = T.time; run(1.2); out.four = nm(H.target);
    // ⑤ 봇 스타일이 근처 각개면(일점사 없음) 봇을 치는 몹을 먼저 고르지 않음 → 가까운 새 몹 B
    clr(); const m0 = F.pb.S.m[0], st0 = m0.st; m0.st = 'near'; put(mb, H.i + 2, H.j); put(ma, H.i - 6, H.j); ma.aggro = true; ma.tgt = e; e.hitBy = ma; e.hitByT = T.time; H.target = null; run(0.3); out.five = nm(H.target); m0.st = st0;
    if (A.on()) A.toggle(); return out; });
  console.log(JSON.stringify(r));
  ok(r.one === 'A(봇을 침)', `① 일점사: 새 몹보다 파티 봇을 치는 몹 먼저 (${r.one})`);
  ok(r.two === 'C(나를 침)', `② 나를 치는 몹이 있으면 그 몹이 먼저 (${r.two})`);
  ok(r.three === 'A(봇을 침)', `③ 새 몹에게 가는 중에 봇이 맞으면 그 몹으로 (${r.three})`);
  ok(r.four === 'B(새 몹)', `④ 이미 때리던 몹은 마저 잡음 (${r.four})`);
  ok(r.five === 'B(새 몹)', `⑤ 일점사 봇이 없으면 지금처럼 가까운 몹 (${r.five})`);
  ok(!errs.length, '오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
