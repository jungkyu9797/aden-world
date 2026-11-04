// 11/3 운영자 [펫 목걸이 만들기]: 레벨·진화·진화 기준 Lv·이름 → 상한 맞춤(Lv.61)을 거친 진화 펫과 레벨·HP·공격·진화 기준이 똑같은지 · 주인보다 높은 펫은 안 만들어짐
//   KT_PORT=8898 bash dev/runkt.sh dev/tests/admpet.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 680 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'admp' });
  const r = await p.evaluate(() => { const T = __T; T.GOD_INV = true; T.hero.lv = 61;
    const A = Object.assign(T.mkPetData('doberman', 60), { name: '기준펫', evo: 1, eb: { hp: 615, dmg: [26, 54], lv: 173 }, lv: 363, exp: 0, maxhp: 615 + 10 * 362, hp: 615 + 10 * 362 });   /* 업데이트 전 Lv.173에서 진화해 Lv.363이던 펫 */
    T.INV.load({ bag: [{ id: 'pet_collar', n: 1, pet: A }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); T.PET.capCheck();
    T.log.length = 0; T.ADMIN.apply('pet', JSON.stringify({ lv: 61, evo: 1, eb: 61, name: '베리' }), null, 0);
    const P = T.INV.bag().filter(e => e.pet).map(e => { const d = e.pet; return { n: d.name, kind: d.kind, lv: d.lv, evo: d.evo || 0, eb: d.eb || null, mh: d.maxhp, hp: d.hp, mxh: T.PET.mxh(d), rng: T.PET.range(d), ok: d.capOk, st: d.state, mode: d.mode, inv: d.inv.length }; });
    const msg = T.log.map(l => l.t).join(' / ');
    T.PET.capCheck(); const after = T.INV.bag().filter(e => e.pet).map(e => e.pet.lv + ':' + e.pet.eb.lv);
    T.hero.lv = 55; const n0 = T.INV.bag().length; T.log.length = 0; T.ADMIN.apply('pet', JSON.stringify({ lv: 61, evo: 1, eb: 61, name: '베리2' }), null, 0); const refuse = { n: T.INV.bag().length - n0, msg: T.log.map(l => l.t).join(' / ') };
    T.hero.lv = 61; T.ADMIN.apply('pet', JSON.stringify({ lv: 30, evo: 0, name: '아주아주긴펫이름입니다' }), null, 0); const plain = T.INV.bag().filter(e => e.pet).pop().pet;
    return { P, msg, after, refuse, plain: { n: plain.name, lv: plain.lv, evo: plain.evo || 0, mh: plain.maxhp } }; });
  console.log(JSON.stringify(r.P)); console.log(r.msg);
  const [A, B] = r.P;
  ok(A && B && B.n === '베리' && B.kind === A.kind && B.lv === A.lv && B.evo === A.evo && JSON.stringify(B.eb) === JSON.stringify(A.eb), `베리 = 상한 맞춤된 펫과 레벨·진화·진화 기준 같음 (Lv.${B && B.lv} · 진화 기준 ${B && JSON.stringify(B.eb)})`);
  ok(B && B.mh === A.mh && B.mxh === A.mxh && B.hp === B.mxh && B.rng.join() === A.rng.join(), `HP ${B && B.mxh} · 공격 ${B && B.rng.join('~')} 같음 (HP는 가득)`);
  ok(B && B.lv === 61 && B.eb.lv === 61 && B.eb.hp === 223 && B.mh === 1423 && B.rng.join() === '36,73', '값: Lv.61 · 진화 기준 Lv.61(HP 223·10~20) · 최대 HP 1423 · 공격 36~73 (카리스마 보너스 없을 때)');
  ok(B && B.ok === 1 && B.st === 'stored' && B.inv === 4, '새 목걸이: 상한 확인 표시(경험치 넘김 없음) · 보관 상태 · 펫 가방 4칸');
  ok(/\[운영자\] 펫 목걸이\(Lv\.61 베리 · 진화 · 진화 기준 Lv\.61\)를 받았습니다/.test(r.msg), '안내 문구');
  ok(r.after.every(x => x === '61:61'), `상한 확인을 다시 돌려도 그대로 (${r.after.join(', ')})`);
  ok(r.refuse.n === 0 && /주인 레벨을 넘을 수 없어요/.test(r.refuse.msg), `운영자 캐릭터가 Lv.55면 Lv.61 펫은 안 만들고 안내 (${r.refuse.msg.slice(0, 60)})`);
  ok(r.plain.lv === 30 && r.plain.evo === 0 && r.plain.mh === 26 + 7 * 29 && r.plain.n.length === 8, `진화 안 한 펫도 (Lv.30 · HP ${r.plain.mh} · 이름 8글자까지 "${r.plain.n}")`);
  // 운영자 창 UI 칸 (기본값)
  const ui = await p.evaluate(() => { const w = document.getElementById('admwin'); return w ? ['adm-pl', 'adm-pe', 'adm-pb', 'adm-pn', 'adm-spet'].map(id => { const el = document.getElementById(id); return el ? (el.type === 'checkbox' ? el.checked : el.value || el.textContent) : null; }) : null; });
  console.log('UI', JSON.stringify(ui)); if (ui) ok(ui.join() === '61,true,61,베리,만들기', '운영자 창 [내 캐릭터] 펫 목걸이 칸 기본값 61 · 진화 · 61 · 베리');
  console.log(errs.slice(0, 3).join('\n') || 'no errors'); ok(!errs.length, '오류 없음');
  console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
