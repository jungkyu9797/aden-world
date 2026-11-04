// 11/4 펫 규칙 (프로듀서): 주인보다 레벨 높은 펫(받은 펫)은 레벨을 내리지 않고 그대로 데리고 다님 · 주인 레벨이 펫 레벨에 닿을 때까지 성장만 멈춤 · 그 펫 몫 경험치는 없어짐(주인에게도 안 감)
//   11/3의 '넘어 있던 경험치를 주인에게 한 번 넘기기'는 없앰 · 주인 레벨과 같은 펫(최고 레벨)은 지금처럼 몫이 주인에게 · 낮은 펫은 주인 레벨까지 자람
//   KT_PORT=8873 bash dev/runkt.sh dev/tests/petcap.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 680 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'petc' });
  const r = await p.evaluate(() => { const T = __T; T.GOD_INV = true; T.hero.lv = 50; T.hero.exp = 1000;
    const A = Object.assign(T.mkPetData('doberman', 60), { name: '망고', evo: 1, eb: { hp: 223, dmg: [10, 20], lv: 61 }, lv: 61, maxhp: 223 + 20 * 60, hp: 223 + 20 * 60, capOk: 1 });   /* 다른 캐릭터에게서 받은 Lv.61 진화 펫 */
    const O = Object.assign(T.mkPetData('doberman', 60), { name: '옛펫', evo: 1, eb: { hp: 615, dmg: [26, 54], lv: 173 }, lv: 363, exp: 5000, maxhp: 615 + 20 * 362, hp: 615 + 20 * 362 });   /* 확인 표시 없는 아주 높은 옛 펫 */
    const D = Object.assign(T.mkPetData('doberman', 50), { name: '같은렙' }), C = Object.assign(T.mkPetData('doberman', 30), { name: '초코' });
    T.INV.load({ bag: [A, O, D, C].map(pet => ({ id: 'pet_collar', n: 1, pet })), bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } });
    T.log.length = 0; const e0 = T.hero.exp; T.PET.capCheck(); const eChk = T.hero.exp - e0; const after = Object.fromEntries(T.INV.bag().filter(e => e.pet).map(e => [e.pet.name, { lv: e.pet.lv, eb: e.pet.eb ? e.pet.eb.lv : 0 }]));
    const msg = T.log.map(l => l.t).join(' / ');
    const bag = T.INV.bag().filter(e => e.pet), get = n => bag.find(e => e.pet.name === n), ent = e => ({ d: e.pet, e, x: T.hero.x, z: T.hero.z, isPet: true });
    const h1 = T.hero.exp; const ovA = T.PET.gainExp(ent(get('망고')), 1000); const gA = T.hero.exp - h1, aLv = get('망고').pet.lv, aExp = get('망고').pet.exp;
    const h2 = T.hero.exp; const ovD = T.PET.gainExp(ent(get('같은렙')), 700); const gD = T.hero.exp - h2;
    const ovC = T.PET.gainExp(ent(get('초코')), 200000), cLv = get('초코').pet.lv;
    T.hero.lv = 61; const ovA2 = T.PET.gainExp(ent(get('망고')), 500), a2 = get('망고').pet.exp;
    T.hero.lv = 62; const ovA3 = T.PET.gainExp(ent(get('망고')), 500), a3 = get('망고').pet.exp;
    return { eChk, after, msg, ovA, gA, aLv, aExp, ovD, gD, ovC, cLv, ovA2, a2, ovA3, a3 }; });
  console.log(JSON.stringify(r).slice(0, 900));
  ok(r.after['망고'].lv === 61 && r.after['망고'].eb === 61, 'Lv.50 주인이 받은 Lv.61 망고: 레벨 그대로 61 (진화 기준도 그대로)');
  ok(r.after['옛펫'].lv === 363 && r.after['옛펫'].eb === 173, '확인 표시가 없던 아주 높은 옛 펫(Lv.363)도 레벨을 내리지 않음');
  ok(r.eChk === 0, `펫을 확인해도 주인 경험치는 안 늘어남 (+${r.eChk})`);
  ok(/자라지 않아요/.test(r.msg) && !/주인에게 들어갔어요/.test(r.msg), `안내: 주인보다 높은 펫은 자라지 않음 (경험치 넘김 안내 없음) — "${r.msg.slice(0, 90)}"`);
  ok(r.ovA === -1 && r.gA === 0 && r.aLv === 61 && r.aExp === 0, '주인보다 높은 펫이 받은 몫 1000 → 펫도 안 자라고 주인에게도 안 감 (없어짐)');
  ok(r.ovD === 700 && r.gD === 700, '주인 레벨과 같은 펫(최고 레벨) 몫 700 → 지금처럼 주인에게');
  ok(r.cLv > 30 && r.cLv <= 50, `낮은 펫(Lv.30)은 주인 레벨까지 자람 (Lv.${r.cLv})`);
  ok(r.ovA2 === 500 && r.a2 === 0, '주인이 Lv.61(펫과 같음)이 되면 망고 몫은 주인에게 (최고 레벨)');
  ok(r.ovA3 === 0 && r.a3 === 500, '주인이 Lv.62가 되면 망고가 다시 경험치를 받아 자람');
  console.log(errs.slice(0, 3).join('\n') || 'no errors'); ok(!errs.length, '오류 없음'); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
