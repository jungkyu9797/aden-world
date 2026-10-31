// 몽환의 섬 (지역 24) 테스트 — KT_PORT=8773 bash dev/runkt.sh dev/tests/dream.js
//   ① 입장(가운데 도착 · N 94 · 사분면마다 정령 15·대정령 3 · 가운데 10칸 안 없음) ② 순간이동 주문서 막힘 · 귀환 됨 ③ 정령 비선공 · 대정령 선공 · 속성 저항/약점(dreamElMul) · 근접 속성 추가 피해
//   ④ 드랍(확률 1로 바꿔 훅): 정령 축 · 대정령 축/영웅/퓨어엘릭서 · 유니콘 반드시 축데이 1~2·축젤 1~2·퓨어엘릭서 1~5 ⑤ 대정령 속성 마법 · 유니콘 기술 3개 ⑥ 퓨어엘릭서 교환 · 엘릭서 복용 +1 · 5개 상한 · 저장(inv.elix)
//   ⑦ 유니콘 젠(진짜 시간표 2시간) · 토벌 기록 · 제단 자리 ⑧ 미니맵 · 월드맵 도감 · 모바일 화면 ⑨ 스크린샷 dev/out/dream_*.png (사분면 4 · 정령 8종 · 유니콘 · PC · 모바일)
const { chromium, devices } = require('playwright'); const login = require('../tq.js');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const Z = 24;
(async () => { const b = await chromium.launch(); const errs = [];
  const enter = async (p, z) => { await p.evaluate(z => __T.TOWN.toZone(z), z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', z, { timeout: 60000 }); await p.waitForTimeout(1500); };
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'drm' }); await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 60; });
  // ---------- ① 입장
  await enter(p, Z);
  const a = await p.evaluate(() => { const T = __T, I = T.ISLE, N = I.N, C = N / 2, cnt = {}, bad = [], near = []; for (const f of T.foxes) { if (f.dead || f.gone) continue; const S = T.MOB[f.kind]; if (S.boss) continue; cnt[f.kind] = (cnt[f.kind] || 0) + 1; const q = T.dreamQuad(N, f.home[0], f.home[1]); if (T.DREAM.EL[q] !== S.el) bad.push(f.kind + '@' + q); if (Math.hypot(f.home[0] + .5 - C, f.home[1] + .5 - C) <= T.DREAM.NO_SPAWN_R) near.push(f.kind); }
    return { hero: [T.hero.i, T.hero.j], N, cnt, bad, near, hello: T.log.slice(-6).map(x => String(x.t || x.text || x)).join(' / '), lava: I.lava ? I.lava.size : 0, water: I.water.size, hills: (I.def.hills || []).length, props: I.props.length, shrine: I.def.shrine, nobot: !!I.def.nobot }; });
  console.log('enter', JSON.stringify(a));
  ok(a.N === 94 && a.hero[0] === 47 && a.hero[1] === 47, `N 94 · 가운데 도착 (${a.hero})`);
  ok(['fire', 'water', 'earth', 'wind'].every(el => a.cnt['dr_' + el] === 15 && a.cnt['dr_g' + el] === 3), `사분면마다 정령 15 · 대정령 3 (${JSON.stringify(a.cnt)})`);
  ok(!a.bad.length && !a.near.length, `자기 속성 사분면에만 · 가운데 10칸 안 스폰 없음 (${a.bad.join(',')} ${a.near.join(',')})`);
  ok(a.lava > 50 && a.water > 20 && a.hills >= 3 && a.props > 300, `용암 ${a.lava}칸 · 호수 ${a.water}칸 · 북쪽 언덕 ${a.hills} · 소품 ${a.props}`);
  ok(/귀환만/.test(a.hello) && a.nobot, '입장 안내에 귀환만 · nobot');
  // ---------- ② 순간이동 막힘 · 귀환 됨
  const tele = await p.evaluate(() => { const T = __T; T.INV.add('tele_scroll', 2, true); const n0 = T.INV.count('tele_scroll'), p0 = [T.hero.i, T.hero.j]; T.INV.use(T.INV.bag().find(e => e.id === 'tele_scroll')); return { n0, n1: T.INV.count('tele_scroll'), moved: p0[0] !== T.hero.i || p0[1] !== T.hero.j, msg: T.log.slice(-2).map(x => String(x.t || x.text || x)).join(' / ') }; });
  ok(tele.n0 === tele.n1 && !tele.moved && /귀환만/.test(tele.msg), `순간이동 주문서 막힘 (${tele.msg})`);
  await p.evaluate(() => { __T.INV.use(__T.INV.bag().find(e => e.id === 'return_charm')); }); await p.waitForTimeout(800);
  ok(await p.evaluate(() => __T.SCENE === 'town'), '귀환 부적으로 마을 이동');
  await enter(p, Z);
  // ---------- ③ 비선공/선공 · 속성 배율
  const ag = await p.evaluate(() => { const T = __T, M = T.MOB; return { sp: !M.dr_fire.aggr, gr: M.dr_gfire.aggr >= 6, uni: !M.unicorn.aggr, same: T.dreamElMul(M.dr_fire, 'fire'), opp: T.dreamElMul(M.dr_fire, 'water'), other: T.dreamElMul(M.dr_fire, 'earth'), none: T.dreamElMul(M.fn_salamander, 'water'), w: T.dreamElMul(M.dr_gwind, 'earth'), hp: [M.dr_fire.hp, M.dr_gfire.hp, M.unicorn.hp], dmg: [M.dr_fire.dmg, M.dr_gfire.dmg], exp: [M.dr_fire.exp, M.dr_gfire.exp], sc: [M.dr_fire.sc, M.dr_gfire.sc] }; });
  console.log('mob', JSON.stringify(ag));
  ok(ag.sp && ag.gr && ag.uni, '정령 비선공 · 대정령 선공 6칸 · 유니콘 비선공');
  ok(ag.same === 0.5 && ag.opp === 1.3 && ag.other === 1 && ag.none === 1 && ag.w === 1.3, `속성 배율 같은 0.5 · 반대 1.3 · 다른 1 (${ag.same} ${ag.opp} ${ag.other})`);
  ok(ag.hp[0] === 9000 && ag.hp[1] === 13500 && ag.hp[2] === 300000 && ag.exp[0] === 42450 && ag.exp[1] === 84900 && ag.sc[1] === 1.5, '수치: 정령 HP 9000 · 대정령 13500 · 유니콘 300000 · 경험치 ×3/×6 · 대정령 1.5배');
  // 근접 속성 추가 피해: 정령을 바로 옆에 두고 때리게 → 'elem' 피해가 따로 들어옴 (무적 끔 · HP 넉넉히)
  const melee = await p.evaluate(async () => { const T = __T, H = T.hero; T.GOD_INV = false; H.baseHP = 20000; T.INV.render(); H.hp = H.max; const f = T.foxes.find(m => m.kind === 'dr_fire' && !m.dead); const at = [H.i + 1, H.j]; f.i = f.fi = at[0]; f.j = f.fj = at[1]; f.x = at[0] + .5; f.z = at[1] + .5; f.t = 1; f.home = at; f.aggro = true; f.cool = 0;
    const hurt = []; const oh = T.TELE.hurt; T.TELE.hurt = (k, d) => { hurt.push([k, d]); return oh(k, d); }; const gw = s => new Promise(r => { const t1 = T.time; const iv = setInterval(() => { if (T.time - t1 >= s) { clearInterval(iv); r(); } }, 50); }); await gw(4.5); T.TELE.hurt = oh; f.aggro = false; T.GOD_INV = true; H.hp = H.max; return { hurt, hp: H.hp, max: H.max, el: T.log.slice(-8).map(x => String(x.t || x.text || x)).filter(s => /불/.test(s)) }; });
  console.log('melee', JSON.stringify(melee).slice(0, 300));
  ok(melee.hurt.length >= 2, `정령 근접 피해 들어옴 (${melee.hurt.length}번)`);
  // ---------- ④ 드랍 (확률 1로)
  const drop = await p.evaluate(() => { const T = __T, D = T.DREAM, keep = { a: D.BLESS_P, b: D.G_BLESS_P, c: D.G_HERO_P, d: D.G_ELIX_P }; const f0 = { kind: 'dr_fire', i: T.hero.i, j: T.hero.j, x: T.hero.x, z: T.hero.z }, g0 = { ...f0, kind: 'dr_gfire' };
    D.BLESS_P = 1; D.G_BLESS_P = 1; D.G_HERO_P = 1; D.G_ELIX_P = 1; T.GROUND.clear(); T.dreamLoot(f0); const s1 = T.GROUND.list().map(d => d.id); T.GROUND.clear(); T.dreamLoot(g0); const s2 = T.GROUND.list().map(d => ({ id: d.id, rar: T.ITEMS[d.id].rar, craft: !!T.ITEMS[d.id].craft }));
    D.BLESS_P = 0; D.G_BLESS_P = 0; D.G_HERO_P = 0; D.G_ELIX_P = 0; T.GROUND.clear(); const z = T.dreamLoot(g0), s3 = T.GROUND.list().length;
    // 확률 통계 (원래 값으로 2000번)
    D.BLESS_P = keep.a; D.G_BLESS_P = keep.b; D.G_HERO_P = keep.c; D.G_ELIX_P = keep.d; const N = 2000, c = { sb: 0, gb: 0, gh: 0, ge: 0 }; for (let q = 0; q < N; q++) { T.GROUND.clear(); T.dreamLoot(f0); if (T.GROUND.list().some(d => /^bscroll_/.test(d.id))) c.sb++; T.GROUND.clear(); T.dreamLoot(g0); const L = T.GROUND.list(); if (L.some(d => /^bscroll_/.test(d.id))) c.gb++; if (L.some(d => T.ITEMS[d.id].rar === '영웅' && d.id !== 'pure_elixir')) c.gh++; if (L.some(d => d.id === 'pure_elixir')) c.ge++; } T.GROUND.clear();
    // 유니콘 전리품
    const u = { n: 0, bw: [], ba: [], pe: [] }; for (let q = 0; q < 300; q++) { T.GROUND.clear(); T.GROUND.bossLoot({ kind: 'unicorn', i: T.hero.i, j: T.hero.j, x: T.hero.x, z: T.hero.z }); const L = T.GROUND.list(); u.n++; const cnt = id => L.filter(d => d.id === id).reduce((s, d) => s + d.n, 0); u.bw.push(cnt('bscroll_weapon')); u.ba.push(cnt('bscroll_armor')); u.pe.push(cnt('pure_elixir')); } T.GROUND.clear();
    return { s1, s2, z, s3, p: { sb: c.sb / N, gb: c.gb / N, gh: c.gh / N, ge: c.ge / N }, uni: { bw: [Math.min(...u.bw), Math.max(...u.bw)], ba: [Math.min(...u.ba), Math.max(...u.ba)], pe: [Math.min(...u.pe), Math.max(...u.pe)] } }; });
  console.log('drop', JSON.stringify(drop));
  ok(drop.s1.length === 1 && /^bscroll_/.test(drop.s1[0]), `정령 확률 1 → 축 주문서 1개 (${drop.s1})`);
  ok(drop.s2.length === 3 && drop.s2.some(x => /^bscroll_/.test(x.id)) && drop.s2.some(x => x.rar === '영웅' && !x.craft && x.id !== 'pure_elixir') && drop.s2.some(x => x.id === 'pure_elixir'), `대정령 확률 1 → 축·영웅(제작 아님)·퓨어엘릭서 (${drop.s2.map(x => x.id)})`);
  ok(!drop.z && drop.s3 === 0, '확률 0 → 드랍 없음');
  ok(Math.abs(drop.p.sb - 0.05) < 0.015 && Math.abs(drop.p.gb - 0.15) < 0.025 && Math.abs(drop.p.gh - 0.03) < 0.012 && Math.abs(drop.p.ge - 0.15) < 0.025, `드랍 확률 정령 축 ${drop.p.sb} · 대정령 축 ${drop.p.gb} 영웅 ${drop.p.gh} 퓨어 ${drop.p.ge}`);
  ok(drop.uni.bw[0] >= 1 && drop.uni.bw[1] <= 2 && drop.uni.ba[0] >= 1 && drop.uni.ba[1] <= 2 && drop.uni.pe[0] >= 1 && drop.uni.pe[1] <= 5 && drop.uni.pe[1] >= 4, `유니콘 반드시 축데이 ${drop.uni.bw} · 축젤 ${drop.uni.ba} · 퓨어엘릭서 ${drop.uni.pe}`);
  // ---------- ⑤ 대정령 속성 마법 · 유니콘 기술
  const sk = await p.evaluate(async () => { const T = __T, H = T.hero, out = {}, gw = s => new Promise(r => { const t1 = T.time; const iv = setInterval(() => { if (T.time - t1 >= s) { clearInterval(iv); r(); } }, 50); }); const put = (kind, di, dj) => { const m = T.foxes.find(x => x.kind === kind && !x.dead) || T.mkMob(kind, H.i + di, H.j + dj); if (!T.foxes.includes(m)) T.foxes.push(m); const at = [H.i + di, H.j + dj]; m.i = m.fi = at[0]; m.j = m.fj = at[1]; m.x = at[0] + .5; m.z = at[1] + .5; m.t = 1; m.home = at; m.aggro = true; m.sk = {}; return m; };
    const g = put('dr_gwater', 3, 0); g.sk = { gmagic: 0.01 }; await gw(1.4); const a1 = T.AOES.find(x => x.res === 'water'); out.gm = a1 ? { dmg: a1.dmg, r: a1.r, res: a1.res, slow: a1.slow, src: a1.src && a1.src.kind, msg: a1.msg } : null; g.aggro = false; g.sk = { gmagic: 99 };
    const u = put('unicorn', 4, 0); u.hp = u.max * 0.3; u.sk = { charge: 0.01, horn: 99, heal: 99 }; await gw(1.4); out.charge = T.AOES.filter(x => x.src === u).length; await gw(1.5); u.sk = { charge: 99, horn: 0.01, heal: 99 }; await gw(1.5); out.horn = !!T.AOES.find(x => x.src === u && x.r === 2.2);
    await gw(1.6); u.sk = { charge: 99, horn: 99, heal: 0.01 }; const hp0 = u.hp; await gw(1.8); out.heal = { hp0, hp1: u.hp, max: u.max, used: !!u._uheal }; u.sk = { charge: 99, horn: 99, heal: 0.01 }; await gw(1.8); out.healAgain = u.hp; u.aggro = false; u.hp = u.max;
    out.log = T.log.slice(-12).map(x => String(x.t || x.text || x)).filter(s => /대정령|유니콘/.test(s)); return out; });
  console.log('skills', JSON.stringify(sk));
  ok(sk.gm && sk.gm.res === 'water' && sk.gm.slow === 2 && sk.gm.dmg[0] === Math.round(180 * 1.3 / 2.5) && sk.gm.dmg[1] === Math.round(286 * 1.3 / 2.5), `대정령 속성 마법: 물 · 피해 ${sk.gm && sk.gm.dmg} (근접 1.3배 ÷ BOSS_MAGIC) · 둔화`);
  ok(sk.charge >= 2, `유니콘 돌진 범위 ${sk.charge}칸`); ok(sk.horn, '유니콘 뿔 빛기둥');
  ok(sk.heal.used && sk.heal.hp1 > sk.heal.hp0 && Math.abs(sk.heal.hp1 - sk.heal.hp0 - sk.heal.max * 0.05) < 2 && sk.healAgain === sk.heal.hp1, `유니콘 치유 빛 5% 1번만 (${Math.round(sk.heal.hp0)} → ${Math.round(sk.heal.hp1)} · 다시 ${Math.round(sk.healAgain)})`);
  ok(sk.log.some(s => /돌진/.test(s)) && sk.log.some(s => /빛기둥/.test(s)) && sk.log.some(s => /치유/.test(s)), '기술 안내 문구');
  // ---------- ⑥ 퓨어엘릭서 교환 · 엘릭서 복용 · 상한 · 저장
  await p.evaluate(() => { __T.TOWN.goTown(); }); await p.waitForTimeout(800);
  const ex = await p.evaluate(async () => { const T = __T, out = {}; T.INV.add('pure_elixir', 650, true); const st0 = T.INV.stat().str; const craft = document.querySelector('[data-ct="elix"]'); T.CRAFT_.open(); craft.click(); await new Promise(r => setTimeout(r, 400));
    out.rows = document.querySelectorAll('#cr-list [data-ex]').length; const go = async id => { const b = document.querySelector(`#cr-list [data-ex="${id}"]`); if (!b || b.disabled) return false; b.click(); await new Promise(r => setTimeout(r, 200)); const y = document.getElementById('ask-yes'); if (y) y.click(); await new Promise(r => setTimeout(r, 300)); return true; };
    for (let q = 0; q < 5; q++) await go(q < 3 ? 'elixir_str' : 'elixir_dex'); out.after5 = { pure: T.INV.count('pure_elixir'), str: T.INV.count('elixir_str'), dex: T.INV.count('elixir_dex'), c: T.INV.elix().c };
    out.sixth = await go('elixir_str'); out.pure6 = T.INV.count('pure_elixir'); out.msg6 = T.log.slice(-2).map(x => String(x.t || x.text || x)).join(' / ');
    // 복용
    const drink = async id => { const e = T.INV.bag().find(x => x.id === id); if (!e) return; T.INV.use(e); await new Promise(r => setTimeout(r, 150)); const y = document.getElementById('ask-yes'); if (y && !document.getElementById('askwin').hidden) y.click(); await new Promise(r => setTimeout(r, 200)); };
    await drink('elixir_str'); out.str1 = T.INV.stat().str - st0; for (let q = 0; q < 2; q++) await drink('elixir_str'); for (let q = 0; q < 2; q++) await drink('elixir_dex'); out.after = { str: T.INV.stat().str - st0, elix: T.INV.elix() };
    T.INV.add('elixir_int', 1, true); await drink('elixir_int'); out.sixthDrink = { n: T.INV.elix().n, left: T.INV.count('elixir_int'), msg: T.log.slice(-2).map(x => String(x.t || x.text || x)).join(' / ') };
    out.tip = T.INV.tipOf({ id: 'elixir_int', n: 1, on: false }); out.save = T.SAVE_.snap().inv.elix; return out; });
  console.log('elixir', JSON.stringify(ex));
  ok(ex.rows === 3 && ex.after5.pure === 150 && ex.after5.str === 3 && ex.after5.dex === 2 && ex.after5.c === 5, `교환 5번: 퓨어 650 → ${ex.after5.pure} · 힘 ${ex.after5.str} · 민첩 ${ex.after5.dex} · 제작 ${ex.after5.c}/5`);
  ok(!ex.sixth && ex.pure6 === 150, `6번째 교환 막힘 (버튼 비활성) ${ex.msg6}`);
  ok(ex.str1 === 1 && ex.after.str === 3 && ex.after.elix.str === 3 && ex.after.elix.dex === 2 && ex.after.elix.n === 5, `복용: 힘 +${ex.after.str} · 민첩 +${ex.after.elix.dex} · 합계 ${ex.after.elix.n}/5`);
  ok(ex.sixthDrink.n === 5 && ex.sixthDrink.left === 1 && /5개까지만/.test(ex.sixthDrink.msg), `6번째 복용 막힘 (${ex.sixthDrink.msg})`);
  ok(/5\/5/.test(ex.tip), `툴팁에 (n/5): ${ex.tip.split('\n').find(l => /엘릭서/.test(l))}`); ok(ex.save && ex.save.str === 3 && ex.save.dex === 2 && ex.save.c === 5, `저장 inv.elix ${JSON.stringify(ex.save)}`);
  // 저장·불러오기 왕복
  const rt = await p.evaluate(() => { const T = __T, s = T.SAVE_.snap(); const st = T.INV.stat().str; T.INV.load({ bag: [], bonus: {} }); const st2 = T.INV.stat().str; T.SAVE_.apply(s); return { st, st2, st3: T.INV.stat().str, elix: T.INV.elix() }; });
  ok(rt.st2 === rt.st - 3 && rt.st3 === rt.st && rt.elix.n === 5, `저장 왕복: 힘 ${rt.st} → 비움 ${rt.st2} → 복원 ${rt.st3}`);
  await p.keyboard.press('Escape'); await p.evaluate(() => { const w = document.getElementById('craftwin'); if (w) w.hidden = true; });
  // ---------- ⑧ 월드맵 도감 · 미니맵
  await p.click('#btn-map'); await p.waitForTimeout(500); await p.click('.mk[data-r="dream_island"]'); await p.waitForTimeout(600);
  const wc = await p.evaluate(() => { const c = document.getElementById('wm-codex'); return { txt: c ? c.textContent : '', desc: (document.getElementById('wm-desc') || {}).textContent || '', name: (document.getElementById('wm-name') || {}).textContent, pe: !!(c && [...c.querySelectorAll('.wc-it')].some(e => /퓨어엘릭서/.test(e.dataset.itip || ''))), mobs: c ? [...c.querySelectorAll('.wc-mob b')].map(e => e.textContent) : [] }; });
  ok(wc.name === '몽환의 섬' && /정령/.test(wc.desc) && wc.mobs.length === 9 && /유니콘/.test(wc.txt) && wc.pe, `월드맵 도감: ${wc.name} · 몬스터 ${wc.mobs.length}종 · 유니콘 · 퓨어엘릭서`);
  { const el = await p.$('#wm-codex'); if (el) await el.screenshot({ path: 'dev/out/dream_codex.png' }); }
  await p.evaluate(() => { const w = document.getElementById('wmap'); if (w) w.hidden = true; });
  await p.evaluate(() => { __T.TOWN.toField('몽환의 섬'); }); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 24 && __T.SCENE === 'field', null, { timeout: 60000 }); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => __T.hero.i === 47 && __T.hero.j === 47), 'toField(몽환의 섬) → 가운데');
  // ---------- ⑨ 스크린샷: 사분면 4곳 · 정령 8종 · 유니콘
  const C = 47; await p.evaluate(() => { for (const f of __T.foxes) f.aggro = false; });
  for (const [q, dx, dz] of [['E', 20, -20], ['W', -20, 20], ['S', 20, 20], ['N', -20, -20]]) { await p.evaluate(([x, z]) => { __T.TOWN.placeAt(x, z); }, [C + dx, C + dz]); await p.waitForTimeout(900); await p.screenshot({ path: `dev/out/dream_q${q}.png` }); }
  await p.evaluate(() => { __T.TOWN.placeAt(47.5, 47.5); const T = __T, H = T.hero; for (let q = T.foxes.length - 1; q >= 0; q--) T.foxes.splice(q, 1); const K = ['dr_fire', 'dr_water', 'dr_earth', 'dr_wind', 'dr_gfire', 'dr_gwater', 'dr_gearth', 'dr_gwind'];
    K.forEach((k, n) => { const col = n % 4, row = n < 4 ? 1 : 0; const m = T.mkMob(k, H.i - 9 + col * 2 + row * 4, H.j - 3 - col * 2 + row * 5); m.home = [m.i, m.j]; m.row = 1; m.aggro = false; T.MOB[k].passive = true; T.foxes.push(m); });
    const u = T.mkMob('unicorn', H.i - 5, H.j + 6); u.home = [u.i, u.j]; u.row = 1; u.aggro = false; T.MOB.unicorn.passive = true; T.foxes.push(u); T.DN_.set(0); });
  await p.waitForTimeout(1500); await p.screenshot({ path: 'dev/out/dream_spirits.png' });
  await p.evaluate(() => { const T = __T; for (const f of T.foxes) { f.atkT = 0; f.aggro = true; } }); await p.waitForTimeout(250); await p.screenshot({ path: 'dev/out/dream_spirits_attack.png' });
  await p.evaluate(() => { const T = __T, u = T.foxes.find(f => f.kind === 'unicorn'); for (const f of T.foxes) { f.atkT = null; f.aggro = false; } u.casting = { k: { cast: 1 }, t: 0.3 }; const g = T.foxes.find(f => f.kind === 'dr_gfire'); g.casting = { k: { cast: 1 }, t: 0.2 }; }); await p.waitForTimeout(200); await p.screenshot({ path: 'dev/out/dream_cast.png' });
  await p.evaluate(() => { for (const f of __T.foxes) f.casting = null; for (const k in __T.MOB) delete __T.MOB[k].passive; });
  await p.close();
  // ---------- ⑦ 진짜 시간표: 유니콘 2시간마다 제단 · 토벌 기록
  { const p2 = await b.newPage({ viewport: { width: 1280, height: 800 } }); p2.on('pageerror', e => errs.push(e.message));
    await login(p2, { cls: 'knight', name: 'drT', init: () => { Object.defineProperty(window, 'DEMO_MODE', { get: () => false, set() {}, configurable: true }); } });
    await p2.evaluate(() => { __T.GOD_INV = true; const r = Date.now.bind(Date); window.__OFF = 0; Date.now = () => r() + window.__OFF * 1000; });
    await enter(p2, Z);
    const t = await p2.evaluate(async () => { const T = __T, out = { spots: [], gaps: [] }; const tm0 = T.ISLAND.bossTimers().unicorn; out.t0 = tm0;
      if (typeof tm0 === 'number') { window.__OFF += tm0 + 5; await new Promise(r => setTimeout(r, 700)); }
      for (let c = 0; c < 4; c++) { const u = T.foxes.find(m => m.kind === 'unicorn' && !m.dead && !m.gone); if (!u) { out.missing = c; break; } out.spots.push(u.home.slice()); u.hp = -10; T.killCheck(u); await new Promise(r => setTimeout(r, 200)); const g = T.ISLAND.bossTimers().unicorn; out.gaps.push(g); out.kill = T.ISLAND.bossKills().unicorn; window.__OFF += g + 5; await new Promise(r => setTimeout(r, 700)); }
      out.alive = T.ISLAND.bossTimers().unicorn; out.msgs = T.log.slice(-10).map(x => String(x.t || x.text || x)).filter(s => /유니콘/.test(s)); return out; });
    console.log('timer', JSON.stringify(t));
    ok(t.spots.length === 4 && t.spots.every(s => s[0] === 47 && s[1] === 45), `유니콘은 늘 제단(47,45)에 (${t.spots.map(s => s.join(',')).join(' ')})`);
    ok(t.gaps.every(g => g >= 7190 && g <= 7500), `잡힌 뒤 2시간~2시간 5분 (${t.gaps.join(' ')})`);
    ok(t.kill && t.kill.by && t.msgs.some(s => /토벌/.test(s)) && t.msgs.some(s => /나타났/.test(s)), `토벌 기록 ${JSON.stringify(t.kill)} · 공지`);
    await p2.close(); }
  // ---------- 모바일 화면
  { const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); const pm = await ctx.newPage(); pm.on('pageerror', e => errs.push('mobile: ' + e.message));
    await login(pm, { cls: 'elf', name: 'drM' }); await pm.evaluate(() => { __T.GOD_INV = true; }); await enter(pm, Z); await pm.waitForTimeout(1500);
    const mi = await pm.evaluate(() => ({ mobile: __T.MOBILE, z: __T.ISLE.id, n: __T.foxes.length, at: [__T.hero.i, __T.hero.j] })); ok(mi.mobile && mi.z === 24 && mi.n >= 72, `모바일 입장 ${JSON.stringify(mi)}`);
    await pm.evaluate(() => { __T.TOWN.placeAt(67.5, 27.5); }); await pm.waitForTimeout(900); await pm.screenshot({ path: 'dev/out/dream_mobile.png' }); await ctx.close(); }
  console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'no page errors'); ok(!errs.filter(e => !/Failed to load|TUNNEL|WebSocket/.test(e)).length, '페이지 오류 없음'); await b.close(); })();
