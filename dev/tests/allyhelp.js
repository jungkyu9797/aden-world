// 11/6 프로듀서: 적 봇이 지원·원정 오듯이 아군(반왕) 봇도 같은 확률·인원으로 지원·원정
//   ① 지원군: 반왕 4 vs 라인 1 → 60초 넘어서 라인 지원군 2명 + 반왕 지원군 2명 (같은 인원)
//   ② 보스(버그베어밭 2구간 바포메트 · 나 Lv60이 침 · 뒷치기·원정 강제): 이 지역 라인 봇 2명이 보스로 → 이 지역 반왕 봇 2명이 보스 곁을 지킴
//      라인 원정 파티 n명 → 반왕 원정 파티도 n명(가장자리에서 보스 쪽으로) · 반왕 봇은 보스를 치지 않음 · 보스가 끝나면 원정은 돌아감
//   ③ 오류 없음
//   KT_PORT=8904 bash dev/runkt.sh dev/tests/allyhelp.js
const { chromium } = require('playwright'); const login = require('../tq.js');
const REF = { lv: 55, fb: { lv: 55, c: 'knight', hp: 900, ac: -60, mr: 40, d: 45, cp: 5000 } }, ZB = 8;
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); };
(async () => { const b = await chromium.launch(); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await login(p, { cls: 'knight', name: 'ahOne' });
  await p.evaluate(R => __FB.setRef(R), REF);
  await p.evaluate(z => { __T.GOD_INV = true; __T.BUFF.invis = 9999; __T.TOWN.toZone(z); }, ZB); await p.waitForTimeout(3000);
  // ① 지원군 거울
  const r1 = await p.evaluate(() => { const F = __FB, H = __T.hero, S = F.stat(), RO = F.roster(); F.DBG.noBoss = true; F.DBG.noReinf = false; F.DBG.noEnsure = true; for (const q of F.bots()) q.gone = true; F.vis.clear(); __T.BUFF.invis = 9999; __T.GOD_INV = true;
    const sp = (x, i, j) => { const f = F.spawnTest(x.uid, i, j); if (f) { f.max = f.hp = 1e5; } return f; };
    RO.A.filter(x => !x.pt).slice(0, 4).forEach((x, k) => sp(x, H.i + 2 + k % 2, H.j + Math.floor(k / 2))); sp(RO.B.filter(x => x.cls === 'knight' && !x.pt)[0], H.i + 1, H.j + 1);
    const r0 = S.reinf, a0 = S.reinfA || 0; let at = -1, vis = null; for (let s = 0; s < 180; s++) { F.sim(0.5); if (at < 0 && S.reinf > r0) { at = s * 0.5; vis = [...F.vis].filter(([u, V]) => V.r).map(([u]) => RO.by.get(u).team); } }
    const out = { at, all: S.reinf - r0, ally: (S.reinfA || 0) - a0, vis, teams: { A: F.bots().filter(f => f.bot.team === 'A' && !f.dead).length, B: F.bots().filter(f => f.bot.team === 'B' && !f.dead).length } };
    for (const q of F.bots()) q.gone = true; F.vis.clear(); F.DBG.reinfCd = 0; return out; });
  console.log('①', JSON.stringify(r1));
  const nA = r1.vis ? r1.vis.filter(t => t === 'A').length : 0, nB = r1.vis ? r1.vis.filter(t => t === 'B').length : 0;
  ok(r1.at >= 55 && r1.at <= 75 && nB === 2 && nA === 2 && r1.ally === 2, `① 반왕 4 vs 라인 1 → ${r1.at}초 뒤 라인 지원군 ${nB}명 + 반왕 지원군 ${nA}명 (같은 인원)`);
  // ② 보스
  const r2 = await p.evaluate(async () => { const F = __FB, H = __T.hero, S = F.stat(), IS = __T.ISLAND, RO = F.roster(), K = IS.bossKills(); F.DBG.noBoss = false; F.DBG.reinfCd = null; if (K.baphomet) K.baphomet.t = Math.floor(Date.now() / 1000) - 400; F.sim(0.3);
    const boss = __T.foxes.find(m => m.kind === 'baphomet' && !m.dead); if (!boss) return { noBoss: true, K: Object.keys(K), kinds: [...new Set(__T.foxes.filter(m => __T.MOB[m.kind] && __T.MOB[m.kind].boss).map(m => m.kind))] };
    const ally0 = S.ally || 0, apt0 = S.allyPt || 0, bpt0 = S.bsPt; F.bossPlans.clear(); F.DBG.bossNow = false; F.DBG.bossP = 0; F.DBG.bsSpawn = 1; F.DBG.bsP = 1; F.DBG.bsPt = 1; F.DBG.noReinf = false; F.DBG.reinfAt = 1e9; for (const q of F.bots()) q.gone = true; F.vis.clear();
    __T.TOWN.placeAt(boss.x + 1, boss.z); __T.BUFF.invis = 0; __T.GOD_INV = true; H.lv = 60; __T.INV.render(); H.target = boss; boss.max = boss.hp = 1e6;
    const sp = (x, i, j) => { const f = F.spawnTest(x.uid, i, j); if (f) { f.max = f.hp = 3e4; } return f; };
    const B2 = RO.B.filter(x => !x.pt).slice(0, 2).map((x, k) => sp(x, boss.i + 9 + k, boss.j + 8)).filter(Boolean), A3 = RO.A.filter(x => !x.pt).slice(0, 3).map((x, k) => sp(x, boss.i - 9 - k, boss.j - 8)).filter(Boolean); F.sim(0.3);
    let hitBoss = 0; const dS = [];
    for (let s = 0; s < 80; s++) { if (s % 4 === 0) { __T.strike(boss); H.target = boss; } F.sim(0.5); for (const f of F.bots()) if (f.bot.team === 'A' && f.bx && (f.bx.boss === boss || f.bx.mob === boss)) hitBoss++; if (s >= 40) for (const f of A3) if (f.bx && f.bx.guardK && !f.dead && !f.gone) dS.push(Math.max(Math.abs(f.i - boss.i), Math.abs(f.j - boss.j))); if (s % 10 === 0) (window.__TRA = window.__TRA || []).push([s / 2, A3.map(f => [f.bx && f.bx.goal, !!(f.bx && f.bx.guard), f.bx && f.bx.tgt ? 'T' : '-', Math.max(Math.abs(f.i - boss.i), Math.abs(f.j - boss.j)), f.gone ? 'g' : '', f.dead ? 'x' : ''].join(':')).join(' ')]); }
    const kE = B2.filter(f => f.bx && f.bx.boss === boss).length, guard = A3.filter(f => f.bx && f.bx.guardK).length, dA = +(dS.reduce((a, x) => a + x, 0) / Math.max(1, dS.length)).toFixed(1);
    const V = [...F.vis], vB = V.filter(([u, v]) => v.boss).length, vA = V.filter(([u, v]) => v.guard).length, visA = F.bots().filter(f => f.bot.team === 'A' && F.vis.get(f.uid) && F.vis.get(f.uid).guard), visAg = visA.filter(f => f.bx && f.bx.guardK).length;
    const out = { kE, guard, dA, ally: (S.ally || 0) - ally0, bpt: S.bsPt - bpt0, apt: (S.allyPt || 0) - apt0, vB, vA, visA: visA.length, visAg, hitBoss, chat: S.talk.filter(x => x[2] === 'ally' || x[2] === 'reinf').slice(-3).map(x => x[3]) };
    boss.hp = 0; __T.killCheck(boss); for (let s = 0; s < 90; s++) F.sim(0.5); out.left = [...F.vis].filter(([u, v]) => v.guard || v.boss).length; F.DBG.reinfAt = null; H.target = null; __T.GOD_INV = true; __T.BUFF.invis = 9999; for (const q of F.bots()) q.gone = true; F.vis.clear(); F.DBG.noEnsure = false; return out; });
  console.log('②', JSON.stringify(r2)); console.log('trace', JSON.stringify(await p.evaluate(() => window.__TRA)));
  ok(r2 && !r2.noBoss && r2.kE === 2 && r2.guard === 2 && r2.ally >= 2, `② 이 지역 라인 봇 ${r2 && r2.kE}명이 보스로 → 이 지역 반왕 봇 ${r2 && r2.guard}명이 보스 곁을 지킴`);
  ok(r2 && r2.bpt === 1 && r2.apt === 1 && r2.vB >= 1 && r2.vA === r2.vB && r2.visA >= 1 && r2.visAg === r2.visA, `② 라인 원정 ${r2 && r2.vB}명 → 반왕 원정 ${r2 && r2.vA}명 (같은 인원 · 나타난 ${r2 && r2.visA}명 모두 보스 곁을 지킴 ${r2 && r2.visAg})`);
  ok(r2 && r2.hitBoss === 0 && r2.dA > 0 && r2.dA <= 8, `② 반왕 봇은 보스를 치지 않고 곁에 있음 (뒤 20초 지키는 봇 평균 거리 ${r2 && r2.dA}칸)`);
  ok(r2 && r2.left === 0, `② 보스가 끝나면 원정 봇은 돌아감 (남은 원정 ${r2 && r2.left})`);
  ok(!errs.length, '③ 오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
