// 10/30 고렙 사냥터 방어 방식 (defbal 새 방향) 확인 (python3 dev/mkkt.py && bash dev/runkt.sh dev/tests/defstyle.js)
//   ① 몹 물리 명중: 모든 사냥터 90~95% (결투장·콜로세움·수호탑·이벤트 지역은 v193 식)
//   ② AC별 물리 피해 감소 · ③ MR·불 저항별 마법 피해(평균·최대) · ④ 강타 확률(수천 번) · ⑤ 사냥터 밖은 마법 폭·강타 없음
//   ⑥ 캐릭터 창 두 줄 값 + 스크린샷 dev/out/defstyle_cw.png · ⑦ '강타!' 연출 스크린샷 dev/out/defstyle_crit.png · 오류 없음
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 760 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); await login(p, { cls: 'knight', name: 'dsT' });
  const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
  const go = async z => { await p.evaluate(z => __T.TOWN.toZone(z), z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', z, { timeout: 20000 }); await p.waitForTimeout(400); await p.evaluate(() => { __T.GOD_INV = false; for (const f of __T.foxes) f.dead = true; }); };
  // ① 명중 표 (내 Lv56 · AC −125 / −60)
  const hit = {};
  for (const [z, ks] of [[22, ['fn_warrior', 'fn_golem', 'fn_fly', 'fn_archer']], [23, ['fn_salamander', 'fn_hcerberus', 'phoenix']], [17, ['wyvern', 'drake']], [16, ['dv_skel']], [12, ['ettin', 'sabertooth']], [11, ['elmore_soldier']], [8, ['bugbear', 'cerberus']], [5, ['roba_orc']]]) {
    await go(z);
    hit[z] = await p.evaluate(ks => { const T = __T, a0 = T.INV.ac, lv0 = T.hero.lv, o = {}; T.hero.lv = 56; for (const k of ks) { const S = T.MOB[k]; if (!S) continue; const r = {}; for (const ac of [-60, -125, -160]) { T.INV.ac = () => ac; r[ac] = Math.round(T.MOBHIT_(S) * 1000) / 10; const old = Math.max(S.boss ? 0.5 : 0.1, Math.min(0.95, ((S.lv || 1) * 3 + (S.hit || 0.8) * 100 - (56 * 2 - ac) - 40 + (S.boss ? 10 : 0)) / 100)); r['v193_' + ac] = Math.round(old * 1000) / 10; } o[k] = r; } T.INV.ac = a0; T.hero.lv = lv0; return { hiz: T.HZ_.HIZ(), o }; }, ks);
    console.log('명중', z, hit[z].hiz ? '고렙' : '일반', JSON.stringify(hit[z].o));
    for (const [k, r] of Object.entries(hit[z].o)) { if (hit[z].hiz) ok(r[-125] >= 90 && r[-125] <= 95 && r[-60] >= 90, `고렙 명중 ${z} ${k} ${r[-125]}`); else ok(r[-125] === r['v193_-125'] && r[-60] === r['v193_-60'], `일반 사냥터 v193 다름 ${z} ${k}`); }
    ok(!!hit[z].hiz === true, `HIZ 플래그 ${z} (모든 사냥터)`); }
  // ② AC별 물리 피해 (화둥 2구역 · 기본 피해 100 · 불 저항 0) — 실제 hurtHero로 1000번 평균
  await go(23);
  const phys = await p.evaluate(() => { const T = __T, H = T.hero, a0 = T.INV.ac, o = {}; const src = { kind: 'fn_hcerberus', x: H.x, z: H.z }, bs = { kind: 'phoenix', x: H.x, z: H.z };
    for (const ac of [0, -30, -60, -100, -125, -160, -200]) { T.INV.ac = () => ac; let s = 0, sb = 0; for (let i = 0; i < 1000; i++) { H.hp = 1e9; T.HURT_(100, src, 'melee'); s += 1e9 - H.hp; H.hp = 1e9; T.HURT_(100, bs, 'melee'); sb += 1e9 - H.hp; } o[ac] = { dmg: +(s / 1000).toFixed(1), cut: Math.round((1 - T.HZ_.hzAcMul(ac)) * 1000) / 10 + '%', boss: +(sb / 1000).toFixed(1) }; }
    T.INV.ac = a0; H.hp = 16; return o; });
  console.log('AC별 물리 피해 (기본 100 · 화둥2 · 일반 몹/보스)'); for (const [ac, v] of Object.entries(phys)) console.log('  AC', ac, '→ 받는 피해', v.dmg, '(감소', v.cut + ')', '· 보스', v.boss);
  ok(Math.abs(phys[-125].dmg - 10.7) < 1 && phys[-160].dmg < phys[-125].dmg && phys[-200].dmg > 5 && phys[0].dmg === 100, 'AC 감소 곡선');
  // ③④ MR·불 저항별 마법 피해 (아시타지오 불 마법 · 기본 100) — 3000번 평균·최대·강타 비율
  const mag = await p.evaluate(() => { const T = __T, H = T.hero, cx0 = T.INV.cx, o = {}; const src = { kind: 'fn_ashtazio', x: H.x, z: H.z };
    for (const mr of [0, 70, 100, 120, 140]) for (const fr of [0, 35, 60]) { T.INV.cx = k => k === 'mr' ? mr : k === 'fireRes' ? fr : cx0(k); T.DEFMODE_.log = {}; let s = 0, mx = 0, mn = 1e9; const N = 3000; for (let i = 0; i < N; i++) { H.hp = 1e9; T.HURT_(100, src, 'magic'); const d = 1e9 - H.hp; s += d; mx = Math.max(mx, d); mn = Math.min(mn, d); } const L = T.DEFMODE_.log; o[mr + '/' + fr] = { avg: +(s / N).toFixed(1), min: mn, max: mx, crit: +((L['#crit'] || 0) / N * 100).toFixed(1) }; }
    T.INV.cx = cx0; T.DEFMODE_.log = null; H.hp = 16; return o; });
  console.log('MR / 불 저항 → 마법 피해 (기본 100) 평균 [최저~최고] 강타%'); for (const [k, v] of Object.entries(mag)) console.log('  MR/불', k, '→', v.avg, `[${v.min}~${v.max}]`, v.crit + '%');
  ok(mag['0/0'].avg > 85 && mag['0/0'].avg < 95 && mag['0/0'].min === 50 && mag['0/0'].max >= 200, '마법 폭');
  ok(mag['0/0'].crit > 10 && mag['0/0'].crit < 14, '강타 확률 ' + mag['0/0'].crit);
  ok(mag['70/35'].avg < mag['0/0'].avg * 0.45 && mag['70/60'].avg < mag['70/35'].avg * 0.7 && Math.abs(mag['140/60'].avg - mag['120/60'].avg) < 1.5 && mag['120/0'].avg < mag['100/0'].avg, 'MR·저항 감소');
  // 범위 기술(aoe)도 폭·강타 / 용암·지속 피해는 그대로
  const aoe = await p.evaluate(() => { const T = __T, H = T.hero; T.DEFMODE_.log = {}; const ds = new Set(); for (let i = 0; i < 2000; i++) { H.hp = 1e9; T.HURT_(100, null, 'aoe'); ds.add(1e9 - H.hp); } const c = (T.DEFMODE_.log['#crit'] || 0) / 20; const lv = new Set(); for (let i = 0; i < 200; i++) { H.hp = 1e9; T.HURT_(30, null, 'lava'); lv.add(1e9 - H.hp); } T.DEFMODE_.log = null; H.hp = 16; return { n: ds.size, crit: c, lava: [...lv] }; });
  console.log('범위 기술: 피해 값 종류', aoe.n, '강타', aoe.crit + '%', '· 용암 피해', JSON.stringify(aoe.lava)); ok(aoe.n > 20 && aoe.crit > 10 && aoe.lava.length === 1 && aoe.lava[0] === 30, '범위 기술·용암');
  // ⑤ 일반 사냥터: 마법 폭·강타 없음, 물리는 0~|AC|÷3 무작위
  await go(8);
  const nz = await p.evaluate(() => { const T = __T, H = T.hero, a0 = T.INV.ac; T.INV.ac = () => -125; const src = { kind: 'cerberus', x: H.x, z: H.z }; const m = new Set(); let ps = 0; T.DEFMODE_.log = {}; for (let i = 0; i < 1000; i++) { H.hp = 1e9; T.HURT_(100, src, 'magic'); m.add(1e9 - H.hp); H.hp = 1e9; T.HURT_(100, src, 'melee'); ps += 1e9 - H.hp; } const c = T.DEFMODE_.log['#crit'] || 0; T.DEFMODE_.log = null; T.INV.ac = a0; H.hp = 16; return { magic: [...m], phys: +(ps / 1000).toFixed(1), crit: c }; });
  console.log('일반 사냥터(8): 마법 피해 값', JSON.stringify(nz.magic), '· 물리 평균(AC −125)', nz.phys, '· 강타', nz.crit); ok(nz.magic.length > 1 && nz.phys < 40, '버그베어밭(8)도 새 방식 (마법 들쭉날쭉 · 물리 % 감소)');
  // ⑥ 캐릭터 창 (AC −125 · MR 72 · 불 저항 35 가정)
  await go(23);
  const cw = await p.evaluate(async () => { const T = __T, cx0 = T.INV.cx; T.INV.ac = () => -125; T.INV.cx = k => k === 'mr' ? 72 : k === 'fireRes' ? 35 : cx0(k); document.getElementById('charwin').hidden = false; T.INV.render(); await new Promise(r => setTimeout(r, 900)); document.getElementById('cw-pdr').scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 200)); return { pdr: document.getElementById('cw-pdr').textContent, mdr: document.getElementById('cw-mdr').textContent, tip1: document.getElementById('cw-pdr').previousElementSibling.dataset.tip, lab: [document.getElementById('cw-pdr').previousElementSibling.textContent, document.getElementById('cw-mdr').previousElementSibling.textContent], mev: !!document.getElementById('cw-mev') }; });
  console.log('캐릭터 창:', cw.lab[0], cw.pdr, '·', cw.lab[1], cw.mdr, '· 예전 줄 남음', cw.mev); ok(cw.pdr === '89.3%' && cw.mdr === '36%' && !cw.mev, '캐릭터 창 값');
  await p.locator('#charwin').screenshot({ path: 'dev/out/defstyle_cw.png' }).catch(e => fails.push('cw shot ' + e.message));
  await p.evaluate(() => { document.getElementById('charwin').hidden = true; });
  // ⑦ '강타!' 연출
  await p.evaluate(() => { const T = __T, H = T.hero, D = T.DEFMODE_, c0 = D.hzCritP; H.hp = 1e6; D.hzCritP = 1; T.HURT_(140, { kind: 'fn_ashtazio', x: H.x + 2, z: H.z + 2 }, 'magic'); D.hzCritP = c0; H.hp = 16; });
  await p.waitForTimeout(220); await p.screenshot({ path: 'dev/out/defstyle_crit.png' });
  const fl = await p.evaluate(() => __T.floats.map(f => f.text)); ok(fl.includes('강타!'), '강타 글씨');
  console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'no errors'); console.log(fails.length ? 'FAIL ' + fails.join(' | ') : 'ALL OK (고렙 사냥터 방어 방식)'); await b.close(); })();
