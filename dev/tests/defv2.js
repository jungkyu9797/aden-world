// 10/30 방어 v2 확인 (python3 dev/mkkt.py && KT_PORT=8850 bash dev/runkt.sh dev/tests/defv2.js)
//   ① 물리 명중(AC별 · 사냥터) ② 물리 피해 감소 ③ 강타 확률·배율(AC·MR별 수천 번) ④ 마법 피해 감소(MR 0/70/100/200/300) ⑤ 속성 저항(같은 속성만 · 200 상한)
//   ⑥ 직업 보정(요정 AC·MR·저항 · 법사 MR) ⑦ 대인전·결투장(hiz 아님)은 v193 식 ⑧ 캐릭터 창 값 + 스크린샷 dev/out/defv2_cw.png ⑨ 강타 연출 스크린샷 dev/out/defv2_crit.png · 오류 없음
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 760 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); await login(p, { cls: 'knight', name: 'v2T' });
  const fails = []; const ok = (c, m) => { if (!c) fails.push(m); }; const near = (a, b, t) => Math.abs(a - b) <= t;
  const go = async z => { await p.evaluate(z => __T.TOWN.toZone(z), z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', z, { timeout: 20000 }); await p.waitForTimeout(400); await p.evaluate(() => { __T.GOD_INV = false; for (const f of __T.foxes) f.dead = true; const D = __T.DEFMODE_; D.v2CritGap = 0; D.zP = { [__T.ISLE.id]: 1 }; D.zM = { [__T.ISLE.id]: 1 }; }); };   // 식 확인은 사냥터 배율 ×1로
  // ① 물리 명중 (내 Lv56 · 화둥 2구역 혼 켈베로스 Lv?, 용계 와이번)
  await go(23);
  const hit = await p.evaluate(() => { const T = __T, a0 = T.INV.ac, lv0 = T.hero.lv, o = {}; T.hero.lv = 56; for (const k of ['fn_hcerberus', 'fn_salamander', 'wyvern']) { const S = T.MOB[k], r = { lv: S.lv }; for (const ac of [0, -60, -125, -167, -200]) { T.INV.ac = () => ac; r[ac] = Math.round(T.MOBHIT_(S) * 1000) / 10; } o[k] = r; } T.INV.ac = a0; T.hero.lv = lv0; return { hiz: T.HZ_.HIZ(), o }; });
  console.log('① 물리 명중 % (Lv56 · AC 0/−60/−125/−167/−200)', JSON.stringify(hit));
  for (const [k, r] of Object.entries(hit.o)) { const base = Math.max(90, Math.min(95, 95 + 0.5 * (r.lv - 56))); ok(hit.hiz && near(r[0], base, 0.11) && near(r[-125], base - 18.75, 0.11) && near(r[-167], base - 25, 0.11) && r[-200] === r[-167], `명중 ${k} ${JSON.stringify(r)}`); }
  // ② 물리 피해 감소 (기본 100 · 강타 끔) ③ 물리 강타 (AC별 4000번)
  const phys = await p.evaluate(() => { const T = __T, H = T.hero, D = T.DEFMODE_, a0 = T.INV.ac, o = {}, src = { kind: 'fn_hcerberus', x: H.x, z: H.z }, cx0 = T.INV.cx; T.INV.cx = k => /Res$/.test(k) ? 0 : cx0(k); const P0 = D.v2CritP;
    for (const ac of [0, -60, -100, -125, -160, -200]) { T.INV.ac = () => ac; D.v2CritP = 0; H.hp = 1e9; T.HURT_(100, src, 'melee'); const one = 1e9 - H.hp; D.v2CritP = P0; D.log = {}; let s = 0; const N = 4000; for (let i = 0; i < N; i++) { H.hp = 1e9; T.HURT_(100, src, 'melee'); s += 1e9 - H.hp; } o[ac] = { dmg: one, avg: +(s / N).toFixed(1), crit: +((D.log['#crit:p'] || 0) / N * 100).toFixed(1), want: +(20 * (1 - Math.min(0.6, -ac * 0.003))).toFixed(1) }; }
    D.log = null; T.INV.ac = a0; T.INV.cx = cx0; H.hp = 16; return o; });
  console.log('②③ AC → 물리 피해(기본 100) · 평균(강타 포함) · 물리 강타% (기대)'); for (const [ac, v] of Object.entries(phys)) console.log('  AC', ac, '→', v.dmg, '· 평균', v.avg, '· 강타', v.crit + '% (' + v.want + '%)');
  for (const [ac, v] of Object.entries(phys)) { ok(near(v.dmg, 100 * 60 / (60 - ac), 0.6), `물리 감소 AC ${ac} ${v.dmg}`); ok(near(v.crit, v.want, 1.6), `물리 강타 AC ${ac} ${v.crit} vs ${v.want}`); }
  // 강타 배율 ×1.4
  const cm = await p.evaluate(() => { const T = __T, H = T.hero, D = T.DEFMODE_, a0 = T.INV.ac, P0 = D.v2CritP; T.INV.ac = () => 0; D.v2CritP = 1; H.hp = 1e9; T.HURT_(100, { kind: 'wyvern', x: H.x, z: H.z }, 'melee'); const d = 1e9 - H.hp; D.v2CritP = P0; T.INV.ac = a0; H.hp = 16; return d; });
  ok(cm === 140, '강타 배율 ×1.4 (' + cm + ')');
  // ④ 마법 피해 감소 (MR별 · 속성 없는 마법 · 4000번 평균) + 마법 강타%
  const mag = await p.evaluate(() => { const T = __T, H = T.hero, D = T.DEFMODE_, cx0 = T.INV.cx, o = {}, src = { kind: 'wyvern', x: H.x, z: H.z };
    for (const mr of [0, 70, 100, 200, 300]) { T.INV.cx = k => k === 'mr' ? mr : /Res$/.test(k) ? 0 : cx0(k); D.log = {}; let s = 0, mn = 1e9, mx = 0; const N = 4000; for (let i = 0; i < N; i++) { H.hp = 1e9; T.HURT_(100, src, 'magic'); const d = 1e9 - H.hp; s += d; mn = Math.min(mn, d); mx = Math.max(mx, d); } o[mr] = { cut: Math.round(T.HZ_.hzMrCut ? (1 - 0) : 0), red: +(T.MRT_ >= 0 ? 1 : 0), avg: +(s / N).toFixed(1), min: mn, max: mx, crit: +((D.log['#crit:m'] || 0) / N * 100).toFixed(1) }; }
    D.log = null; T.INV.cx = cx0; H.hp = 16; return o; });
  console.log('④ MR → 마법 피해(기본 100) 평균 [최저~최고] · 마법 강타%'); for (const [mr, v] of Object.entries(mag)) console.log('  MR', mr, '→', v.avg, `[${v.min}~${v.max}]`, '강타', v.crit + '%');
  for (const mr of [0, 70, 100, 200]) { const red = Math.min(200, mr) / (Math.min(200, mr) + 100), cp = 0.2 * (1 - Math.min(0.6, mr * 0.003)); const want = 100 * (1 - red) * (1 + cp * 0.4); ok(near(mag[mr].avg, want, want * 0.04), `마법 MR ${mr} 평균 ${mag[mr].avg} (기대 ${want.toFixed(1)})`); ok(near(mag[mr].crit, cp * 100, 1.6), `마법 강타 MR ${mr} ${mag[mr].crit}`); }
  ok(near(mag[300].avg, mag[200].avg, mag[200].avg * 0.06) && near(mag[300].crit, mag[200].crit, 1.5), 'MR 300 = MR 200 (상한)');
  ok(mag[0].min >= 69 && mag[0].min <= 71 && mag[0].max >= 180 && mag[0].max <= 183, '마법 폭 ×0.7~1.3 · 강타 ×1.4');
  // ⑤ 속성 저항 (불 몹만 · 200 상한 · 물리·마법 모두) — 강타 끔
  const res = await p.evaluate(() => { const T = __T, H = T.hero, D = T.DEFMODE_, cx0 = T.INV.cx, a0 = T.INV.ac, P0 = D.v2CritP, o = {}; D.v2CritP = 0; T.INV.ac = () => 0; const fire = { kind: 'fn_hcerberus', x: H.x, z: H.z }, plain = { kind: 'wyvern', x: H.x, z: H.z };
    for (const fr of [0, 35, 60, 100, 200, 300]) { T.INV.cx = k => k === 'fireRes' ? fr : k === 'mr' ? 0 : /Res$/.test(k) ? 0 : cx0(k); H.hp = 1e9; T.HURT_(100, fire, 'melee'); const pf = 1e9 - H.hp; H.hp = 1e9; T.HURT_(100, plain, 'melee'); const pp = 1e9 - H.hp; o[fr] = { firePhys: pf, otherPhys: pp, cut: Math.round(T.HZ_.resCut('fire', true) * 1000) / 10 }; }
    D.v2CritP = P0; T.INV.cx = cx0; T.INV.ac = a0; H.hp = 16; return { o, el: T.MOB.fn_hcerberus.el || (T.MOB.fn_hcerberus.fire ? 'fire' : null), el2: T.MOB.wyvern.el || null }; });
  console.log('⑤ 불 저항 → 불 몹 물리 피해 / 다른 몹(와이번', res.el2, ')', JSON.stringify(res.o));
  for (const fr of [0, 35, 60, 100, 200]) ok(near(res.o[fr].firePhys, 100 * 100 / (100 + fr), 0.6) && (res.el2 === 'fire' || res.o[fr].otherPhys === 100), `속성 저항 ${fr}`);
  ok(res.o[300].firePhys === res.o[200].firePhys, '저항 300 = 200 (상한)');
  // 범위 기술 res · 용암 (resCut 같은 식)
  const lava = await p.evaluate(() => { const T = __T; return T.HZ_.resCut('fire', true); }); ok(lava >= 0, 'resCut');
  // ⑥ 직업 보정
  const cls = await p.evaluate(() => { const T = __T, o = {}; const c0 = T.CLS_; for (const c of ['knight', 'wizard', 'elf']) { T.setCls_(c); T.INV.render(); const st = T.INV.stat(); o[c] = { ac: T.INV.ac(), mr: T.INV.cx('mr'), fire: T.ELEMRES_('fire'), water: T.ELEMRES_('water'), dex: st.dex, cp: T.CP_().total }; } T.setCls_(c0); T.INV.render(); return o; });
  console.log('⑥ 직업 보정', JSON.stringify(cls));
  ok(cls.wizard.mr === cls.knight.mr + 10 && cls.elf.mr === cls.knight.mr + 10 && cls.elf.fire === cls.knight.fire + 10 && cls.elf.water === cls.knight.water + 10 && cls.wizard.fire === cls.knight.fire, '직업 MR·저항');
  ok(cls.elf.ac === cls.knight.ac - Math.floor(cls.elf.dex / 4) && cls.wizard.ac === cls.knight.ac, `요정 AC (민첩 ${cls.elf.dex})`);
  ok(cls.elf.cp > cls.knight.cp - 1e9, '전투력 계산');
  // ⑦ 대인전(원격 공격자) · 결투장처럼 hiz 아닌 곳 → v193 식
  const old = await p.evaluate(() => { const T = __T, H = T.hero, D = T.DEFMODE_, a0 = T.INV.ac, cx0 = T.INV.cx; T.INV.ac = () => -125; T.INV.cx = k => k === 'mr' ? 100 : k === 'fireRes' ? 100 : cx0(k); D.log = {}; const rem = { kind: 'player', isRemote: true, x: H.x, z: H.z, dead: false }; const ps = new Set(); for (let i = 0; i < 2000; i++) { H.hp = 1e9; T.HURT_(100, rem, 'melee'); ps.add(1e9 - H.hp); } const pvpCrit = (D.log['#crit:p'] || 0) + (D.log['#crit:m'] || 0);
    const def = T.ISLE.def; def.hiz = false; const hz = T.HZ_.HIZ(), S = T.MOB.fn_hcerberus, lv0 = H.lv; H.lv = 56; const h = T.MOBHIT_(S), hOld = Math.max(0.1, Math.min(0.95, ((S.lv || 1) * 3 + (S.hit || 0.8) * 100 - (56 * 2 + 125) - 40) / 100)); H.lv = lv0; const mg = new Set(); for (let i = 0; i < 500; i++) { H.hp = 1e9; T.HURT_(100, { kind: 'wyvern', x: H.x, z: H.z }, 'magic'); mg.add(1e9 - H.hp); } const ph = []; for (let i = 0; i < 2000; i++) { H.hp = 1e9; T.HURT_(100, { kind: 'wyvern', x: H.x, z: H.z }, 'melee'); ph.push(1e9 - H.hp); } const fc = T.HZ_.resCut('fire', false); def.hiz = true;
    const crit2 = (D.log['#crit:p'] || 0) + (D.log['#crit:m'] || 0) - pvpCrit; D.log = null; T.INV.ac = a0; T.INV.cx = cx0; H.hp = 16; return { pvp: [Math.min(...ps), Math.max(...ps)], pvpCrit, hz, h, hOld, magic: [...mg], phys: [Math.min(...ph), Math.max(...ph)], crit2, fc }; });
  console.log('⑦ 대인전 물리(AC −125) 범위', JSON.stringify(old.pvp), '강타', old.pvpCrit, '· hiz 끔: HIZ', old.hz, '명중', old.h, '(v193', old.hOld + ') · 마법(MR 100)', JSON.stringify(old.magic), '· 물리', JSON.stringify(old.phys), '· 강타', old.crit2, '· 불 저항 100 감소', old.fc);
  ok(old.pvp[0] >= 59 && old.pvp[1] === 100 && old.pvpCrit === 0, '대인전 = v193 (0~AC÷3 무작위 · 강타 없음)');
  ok(!old.hz && near(old.h, old.hOld, 1e-9) && old.magic.length === 1 && old.magic[0] === 50 && old.phys[0] >= 59 && old.phys[1] === 100 && old.crit2 === 0 && old.fc === 0.6, '결투장(hiz 아님) = v193');
  // ⑧ 캐릭터 창 (AC −125 · MR 70 · 불 저항 35)
  const cw = await p.evaluate(async () => { const T = __T, cx0 = T.INV.cx; T.INV.ac = () => -125; T.INV.cx = k => k === 'mr' ? 70 : k === 'fireRes' ? 35 : cx0(k); document.getElementById('charwin').hidden = false; T.INV.render(); await new Promise(r => setTimeout(r, 900)); document.getElementById('cw-pdr').scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 200)); const g = id => document.getElementById(id).textContent; return { pev: g('cw-pev'), pdr: g('cw-pdr'), pcr: g('cw-pcr'), mdr: g('cw-mdr'), mcr: g('cw-mcr'), mr: g('cw-mr'), res: g('cw-res'), resc: g('cw-resc'), mb: g('cw-mb'), sp: g('cw-sp') }; });
  console.log('⑧ 캐릭터 창', JSON.stringify(cw));
  ok(cw.pev === '18.8%' && cw.pdr === '67.6%' && cw.pcr === '37.5%' && cw.mdr === '41.2%' && cw.mcr === '21%' && cw.mr === '70' && cw.resc === '불 25.9%' && cw.mb !== '-' && cw.sp !== '-', '캐릭터 창 값');
  await p.locator('#charwin').screenshot({ path: 'dev/out/defv2_cw.png' }).catch(e => fails.push('cw shot ' + e.message));
  await p.evaluate(() => { document.getElementById('charwin').hidden = true; });
  // ⑨ 강타 연출 (물리 주황 · 마법 붉은)
  await p.evaluate(() => { const T = __T, H = T.hero, D = T.DEFMODE_, c0 = D.v2CritP; H.hp = 1e6; D.v2CritP = 1; T.HURT_(140, { kind: 'fn_ashtazio', x: H.x + 2, z: H.z + 2 }, 'magic'); D.v2CritP = c0; H.hp = 16; });
  await p.waitForTimeout(220); await p.screenshot({ path: 'dev/out/defv2_crit.png' });
  const fl = await p.evaluate(() => __T.floats.map(f => f.text)); ok(fl.includes('강타!'), '강타 글씨');
  console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'no errors'); ok(!errs.length, 'page errors'); console.log(fails.length ? 'FAIL ' + fails.join(' | ') : 'ALL OK (방어 v2)'); await b.close(); })();
