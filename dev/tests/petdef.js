// 11/4 펫 상향: 2구역(방어 v2)에서 펫도 사냥터 방어 — 물리 × 사냥터 물리 배율(화둥 2구역 0.3) · 범위·지속 피해 × 마법 배율(0.5) · 1구역·방어 v2가 없는 곳은 그대로 · 서먼 소환수는 그대로
//   진화 펫 레벨당 HP +20 (예전 +10) · 이미 있는 진화 펫도 맞춰짐
//   KT_PORT=8890 bash dev/runkt.sh dev/tests/petdef.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 640 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'pdf' }); await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 61; });
  const r0 = await p.evaluate(() => { const T = __T; const A = Object.assign(T.mkPetData('doberman', 60), { name: '망고', evo: 1, eb: { hp: 223, dmg: [10, 20], lv: 61 }, lv: 61, maxhp: 223 + 10 * 60, hp: 223 + 10 * 60, capOk: 1 });
    T.INV.load({ bag: [{ id: 'pet_collar', n: 1, pet: A }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); T.PET.capCheck(); const d = T.INV.bag().find(e => e.pet).pet; return { mh: d.maxhp, hp: d.hp }; });
  console.log(JSON.stringify(r0)); ok(r0.mh === 223 + 20 * 60, `이미 있던 진화 펫(Lv.61) 최대 HP 823 → ${r0.mh} (+20/레벨)`); ok(r0.hp === 823, '지금 HP는 그대로 (자연 회복으로 참)');
  const hit = async z => { await p.evaluate(z => __T.TOWN.toZone(z), z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', z, { timeout: 60000 }); await p.waitForTimeout(1500);
    return p.evaluate(() => { const T = __T, e = T.INV.bag().find(x => x.pet); if (e.pet.state !== 'out') T.PET.summon(e); const pt = T.PETS_HERE_ ? T.PETS_HERE_() : null; const P = (T.PET.list ? T.PET.list() : null);
      const m = T.foxes.find(f => !f.dead && !f.fb && T.MOB[f.kind] && !T.MOB[f.kind].boss && !T.MOB[f.kind].midb); const ent = (window.__PH = T.PETS_HERE_ && T.PETS_HERE_()[0]) || null; return { ok: !!m, ent: !!ent, mk: m && m.kind }; }); };
  const meas = () => p.evaluate(() => { const T = __T, pe = T.PETS_HERE_()[0], m = T.foxes.find(f => !f.dead && !f.fb && T.MOB[f.kind] && !T.MOB[f.kind].boss && !T.MOB[f.kind].midb); const d = pe.d; d.hp = 1e6; const h0 = d.hp; T.PET.hurt(pe, 100, m); const ph = h0 - d.hp; d.hp = 1e6; T.PET.hurt(pe, 100, null); const mg = 1e6 - d.hp; d.hp = d.maxhp; const Z = T.HZ_, on = Z.HIZ(); return { ph, mg, z: T.ISLE.id, on, eP: on ? Math.max(1, Math.round(100 * Z.v2Z('P'))) - 1 : 99, eM: on ? Math.max(1, Math.round(100 * Z.v2Z('M'))) - 1 : 99 }; });
  const z23 = await hit(23); console.log('23', JSON.stringify(z23)); const m23 = await meas(); console.log('23 피해', JSON.stringify(m23));
  ok(m23.ph >= 28 && m23.ph <= 31, `화룡의 둥지 2구역: 몬스터 물리 100 → 펫 ${m23.ph} (×0.3 · 예전 99)`); ok(m23.mg >= 48 && m23.mg <= 51, `범위·지속 피해 100 → ${m23.mg} (×0.5)`);
  await hit(22); const m22 = await meas(); ok(m22.ph >= 58 && m22.ph <= 61, `화룡의 둥지 1구역: 물리 100 → ${m22.ph} (×0.6)`);
  await hit(1); const m1 = await meas(); console.log('1 피해', JSON.stringify(m1)); ok(m1.ph === m1.eP && m1.mg === m1.eM, `이야기섬도 유저와 같은 사냥터 배율 (물리 ${m1.ph} · 마법 ${m1.mg} · 유저 기준 ${m1.eP}·${m1.eM})`);
  await p.evaluate(() => __T.TOWN.toZone(14)); await p.waitForTimeout(4000); const m14 = await p.evaluate(() => { const T = __T, pe = T.PETS_HERE_()[0]; if (!pe) return { none: 1, z: T.ISLE && T.ISLE.id }; const d = pe.d; d.hp = 1e6; T.PET.hurt(pe, 100, null); return { mg: 1e6 - d.hp, on: T.HZ_.HIZ(), z: T.ISLE && T.ISLE.id }; }); console.log('14', JSON.stringify(m14)); ok(m14.none || (!m14.on && m14.mg === 99), `방어 v2가 없는 곳(콜로세움 등)은 그대로 (${JSON.stringify(m14)})`);
  console.log(errs.slice(0, 3).join('\n') || 'no errors'); ok(!errs.length, '오류 없음'); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
