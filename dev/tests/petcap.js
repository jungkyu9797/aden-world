// 11/3 펫 레벨 상한 = 주인 레벨: 넘은 펫은 주인 레벨로 맞추고(HP 다시 계산) 넘은 만큼의 펫 경험치를 한 번 주인에게 · 상한이면 펫 몫 경험치는 주인에게 · 거래로 넘어온 펫은 레벨만
//   KT_PORT=8873 bash dev/runkt.sh dev/tests/petcap.js
const { chromium } = require('playwright'); const login = require('../tq.js');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const petNeed = lv => Math.round(18 * Math.pow(lv, 1.55));
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 680 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'petc' });
  const sumN = (a, b, k) => { let s = 0; for (let l = a; l < b; l++) s += petNeed(l) * k; return s; };
  const exEvo = Math.round(0.924 * 2 * petNeed(363)) + sumN(61, 363, 2) + sumN(61, 173, 1), exB = 100 + sumN(61, 70, 1), exD = sumN(61, 120, 1);   /* 진화 펫: 진화 뒤 61~363 (×2) + 진화 전 61~173 · D: 진화 레벨 120 → 61 구간만 */
  const r = await p.evaluate(({ exE }) => { const T = __T; T.GOD_INV = true; T.hero.lv = 61; T.hero.exp = Math.round(T.needExp(61) * 0.248);
    const A = Object.assign(T.mkPetData('doberman', 60), { name: '망고', evo: 1, eb: { hp: 615, dmg: [26, 54], lv: 173 }, lv: 363, exp: Math.round(0.924 * 2 * Math.round(18 * Math.pow(363, 1.55))), maxhp: 615 + 10 * 362, hp: 615 + 10 * 362 });   /* 실제 망고: Lv.173에서 진화 (Lv.363 화면 값과 맞음) */
    const D = Object.assign(T.mkPetData('doberman', 60), { name: '두부', evo: 1, eb: { hp: 446, dmg: [19, 40], lv: 120 }, lv: 40, maxhp: 446 + 390, hp: 446 + 390 });
    const B = Object.assign(T.mkPetData('doberman', 70), { name: '바둑', exp: 100 }), C = Object.assign(T.mkPetData('doberman', 30), { name: '초코' });
    T.INV.load({ bag: [A, B, C, D].map(pet => ({ id: 'pet_collar', n: 1, pet })), bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } });
    T.log.length = 0; const e0 = T.hero.exp; T.PET.capCheck(); const L = T.INV.bag().filter(e => e.pet).map(e => ({ n: e.pet.name, lv: e.pet.lv, mh: e.pet.maxhp, exp: e.pet.exp, ok: e.pet.capOk, eb: e.pet.eb || null, rng: T.PET.range(e.pet), cha: T.PET.mxh(e.pet) / e.pet.maxhp }));
    return { L, gained: T.hero.exp - e0, lv: T.hero.lv, pct: +(100 * T.hero.exp / T.needExp(T.hero.lv)).toFixed(1), msg: T.log.map(l => l.t).join(' / ') }; }, { exE: exEvo });
  console.log('  ', JSON.stringify(r).slice(0, 400));
  const [A, B, C, D] = r.L;
  ok(A.lv === 61 && A.eb.lv === 61 && A.eb.hp === 223 && A.eb.dmg.join() === '10,20' && A.mh === 223 + 20 * 60, `진화 펫 Lv.363(Lv.173에서 진화) → Lv.61 · Lv.61에서 진화한 기준(HP 223 · 10~20) · 최대 HP ${A.mh}`);
  ok(A.cha === 1 && A.rng.join() === '36,73', `Lv.61 진화 펫 공격 ${A.rng.join('~')} (카리스마 보너스 없을 때 · 카리스마 24면 ×1.24 = 45~91)`);
  ok(D.lv === 40 && D.eb.lv === 61 && D.mh === 223 + 20 * 39, `레벨은 낮아도 높은 레벨(120)에서 진화한 펫 → 진화 기준만 Lv.61로 · 최대 HP ${D.mh}`);
  ok(B.lv === 61 && B.mh === 26 + 7 * 60, `일반 펫 Lv.70 → Lv.61 · 최대 HP ${B.mh}`); ok(C.lv === 30, '주인보다 낮은 펫(Lv.30)은 그대로');
  ok(r.gained === exEvo + exB + exD, `넘은 펫 경험치를 주인에게: ${r.gained.toLocaleString()} (계산 ${(exEvo + exB + exD).toLocaleString()})`);
  ok(r.lv === 61 && r.pct > 75 && r.pct < 80, `주인 Lv.61 24.8% → Lv.${r.lv} ${r.pct}% (망고만이면 약 76.4%)`);
  ok(/\[펫\] 이제 펫은 주인 레벨을 넘을 수 없어서 주인 레벨\(Lv\.61\)에 맞췄어요\. 넘어 있던 경험치는 주인에게 들어갔어요\. 주인 레벨이 오르면 펫도 다시 자라요\./.test(r.msg) && !/망고|363|173|진화/.test(r.msg), '채팅 안내 (짧게 · 펫 이름·이전 레벨·진화 내용 없음)');
  // 다시 확인해도 또 주지 않음 · 거래로 넘어온 펫(이미 확인 표시)은 레벨만
  const r2 = await p.evaluate(() => { const T = __T, e0 = T.hero.exp; T.PET.capCheck(); const g1 = T.hero.exp - e0; const B = T.INV.bag().find(e => e.pet && e.pet.name === '바둑').pet; B.lv = 80; B.exp = 500; const e1 = T.hero.exp; T.PET.capCheck(); return { g1, g2: T.hero.exp - e1, lv: B.lv, mh: B.maxhp }; });
  ok(r2.g1 === 0, '두 번째 확인: 경험치 다시 안 줌'); ok(r2.g2 === 0 && r2.lv === 61 && r2.mh === 26 + 7 * 60, '거래로 넘어온 높은 펫: 레벨만 61로 · 경험치는 안 넘김');
  // 상한이면 펫 몫은 주인에게 · 낮은 펫은 상한까지 크고 남은 건 주인에게 · 주인이 레벨업하면 다시 큼
  const r3 = await p.evaluate(() => { const T = __T, bag = T.INV.bag().filter(e => e.pet); for (const e of bag) T.PET.summon(e); const Ls = T.PET.list ? T.PET.list() : null;
    const ents = (T.PETS_ || []); return { n: bag.filter(e => e.pet.state === 'out').length }; });
  const r4 = await p.evaluate(() => { const T = __T; const bag = T.INV.bag().filter(e => e.pet), A = bag.find(e => e.pet.name === '망고'), C = bag.find(e => e.pet.name === '초코');
    const ent = e => ({ d: e.pet, e, x: T.hero.x, z: T.hero.z, isPet: true });   /* gainExp는 p.d만 씀 */
    const e0 = T.hero.exp; const ovA = T.PET.gainExp(ent(A), 1000); const gA = T.hero.exp - e0;
    let needC = 5000; for (let l = 30; l < 61; l++) needC += Math.round(18 * Math.pow(l, 1.55)); const e1 = T.hero.exp; const ovC = T.PET.gainExp(ent(C), needC); const gC = T.hero.exp - e1;
    T.hero.lv = 62; const e2 = T.hero.exp; const ovA2 = T.PET.gainExp(ent(A), 1000); const gA2 = T.hero.exp - e2;
    return { ovA, gA, ovC, gC, lvC: C.pet.lv, expC: C.pet.exp, ovA2, gA2, expA: A.pet.exp, win: (() => { try { T.PET.openWin && T.PET.openWin(A); } catch (e) {} return ''; })() }; });
  console.log('  ', JSON.stringify(r4));
  ok(r4.ovA === 1000 && r4.gA === 1000, '상한(Lv.61) 펫이 받은 경험치 1000 → 주인에게 1000');
  ok(r4.lvC === 61 && r4.expC === 0 && r4.ovC === 5000 && r4.gC === 5000, `Lv.30 펫에 큰 경험치 → Lv.61에서 멈추고 남은 ${Math.round(r4.ovC).toLocaleString()}은 주인에게`);
  ok(r4.ovA2 === 0 && r4.gA2 === 0 && r4.expA === 1000, '주인이 Lv.62가 되면 펫이 다시 경험치를 받음');
  console.log(errs.length ? 'PAGE ERRORS\n' + errs.slice(0, 5).join('\n') : 'no page errors'); if (errs.length) process.exitCode = 1; await b.close(); })();
