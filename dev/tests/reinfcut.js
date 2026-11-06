// 11/6 프로듀서: 봇 지원군·보스 원정 줄이기 (기준 캐릭터가 1:1은 다 이기는데 조금만 싸우면 적이 떼로 옴)
//   ① 설정: 지원군 60초(전 25초) · 한 번에 최대 2명 · 온 뒤 3분 쉼 · 보스 원정 파티 20%(전 50%) · 그 맵 봇 꼬장(젠 50% · 봇 70%)은 그대로
//   ② 반왕(나 + 봇 4) vs 라인 1 → 60초 넘어서 라인 지원군 2명만 (전에는 차이 4명만큼) → 그 뒤 3분 동안은 차이가 남아도 더 안 옴
//   ③ 보스 젠 계획: 원정 파티가 붙는 젠 약 20% · 뒷치기 젠 약 50% ④ 오류 없음
//   KT_PORT=8903 bash dev/runkt.sh dev/tests/reinfcut.js
const { chromium } = require('playwright'); const login = require('../tq.js');
const REF = { lv: 55, fb: { lv: 55, c: 'knight', hp: 900, ac: -60, mr: 40, d: 45, cp: 5000 } }, ZB = 8;
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); };
(async () => { const b = await chromium.launch(); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await login(p, { cls: 'knight', name: 'rcOne' });
  const c1 = await p.evaluate(R => { const F = __FB; F.setRef(R); const C = F.cfg(); return { at: C.REINF_AT, mx: C.REINF_MAX, cd: C.REINF_CD, pt: C.BS_PT, sp: C.BS_SPAWN, bp: C.BS_P }; }, REF);
  console.log('①', JSON.stringify(c1));
  ok(c1.at === 60 && c1.mx === 2 && c1.cd === 180 && c1.pt === 0.2 && c1.sp === 0.5 && c1.bp === 0.7, '① 지원군 60초 · 최대 2명 · 3분 쉼 · 원정 파티 20% · 그 맵 봇 꼬장(50% · 70%) 그대로');
  await p.evaluate(z => { __T.GOD_INV = true; __T.BUFF.invis = 9999; __T.TOWN.toZone(z); }, ZB); await p.waitForTimeout(3000);
  const r2 = await p.evaluate(() => { const F = __FB, H = __T.hero, S = F.stat(), RO = F.roster(); F.DBG.noBoss = true; F.DBG.noReinf = false; F.DBG.noEnsure = true; for (const q of F.bots()) q.gone = true; F.vis.clear(); __T.BUFF.invis = 0; __T.GOD_INV = true;
    const sp = (x, i, j) => { const f = F.spawnTest(x.uid, i, j); if (f) { f.max = f.hp = 1e5; } return f; };
    const A = RO.A.filter(x => !x.pt).slice(0, 4).map((x, k) => sp(x, H.i + 2 + k % 2, H.j + Math.floor(k / 2))), Bq = [sp(RO.B.filter(x => x.cls === 'knight' && !x.pt)[0], H.i + 1, H.j + 1)];
    const cnt = () => { const T = F.bots().filter(f => !f.dead); return [T.filter(f => f.bot.team === 'A').length + 1, T.filter(f => f.bot.team === 'B').length]; }, c0 = cnt(), r0 = S.reinf; let at = -1, n1 = 0;
    for (let s = 0; s < 180; s++) { F.sim(0.5); if (at < 0 && S.reinf > r0) at = s * 0.5; if (at >= 0 && s * 0.5 - at < 20) n1 = S.reinf - r0; }   // 90초
    const after1 = S.reinf - r0, mid = cnt(); for (let s = 0; s < 200; s++) F.sim(0.5);   // 100초 더 (3분 쉼 안)
    const after2 = S.reinf - r0, end = cnt(); __T.BUFF.invis = 9999; for (const q of F.bots()) q.gone = true; F.vis.clear(); F.DBG.noEnsure = false; return { c0, at, n1, after1, mid, after2, end }; });
  console.log('②', JSON.stringify(r2));
  ok(r2.c0[0] === 5 && r2.c0[1] === 1 && r2.at >= 55 && r2.at <= 75, `② 반왕 ${r2.c0[0]} vs 라인 ${r2.c0[1]} → ${r2.at}초 뒤 지원군 (60초 넘어서)`);
  ok(r2.n1 === 2 && r2.after1 === 2, `② 한 번에 2명만 (머릿수 차이 4인데 ${r2.n1}명)`);
  ok(r2.after2 === 2, `② 그 뒤 100초 동안 더 안 옴 (차이 ${r2.mid[0] - r2.mid[1]}명 남아도 · 모두 ${r2.after2}명)`);
  const r3 = await p.evaluate(() => { const F = __FB; let pt = 0, bs = 0; const N = 3000; for (let k = 0; k < N; k++) { const H = F.bossPlan('rcTest:' + k, Date.now() / 1000); if (H.bsPt) pt++; if (H.bs) bs++; } return { pt: pt / N, bs: bs / N }; });
  console.log('③', JSON.stringify(r3));
  ok(Math.abs(r3.pt - 0.2) < 0.04 && Math.abs(r3.bs - 0.5) < 0.04, `③ 보스 젠: 원정 파티 ${Math.round(r3.pt * 100)}% (전 50%) · 뒷치기 젠 ${Math.round(r3.bs * 100)}% (그대로)`);
  ok(!errs.length, '④ 오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
