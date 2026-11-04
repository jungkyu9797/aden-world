// 11/4 혈맹 파티 지원·버프 (dev/notes/pbbuff.md)
//   KT_PORT=8899 KT_TO=600 bash dev/runkt.sh dev/tests/pbbuff.js
// ① 파티 봇 초록·용기의 물약 무제한 (끝나면 다시) → 공격 간격·이동 속도 = 유저 가속과 같은 식 ② 법사 봇: HP 낮은 파티장 힐 · 채팅은 1분에 한 번
// ③ 싸우는 파티장에게 이뮨 투 함 (안 싸우면 안 걸음) · 받는 피해 −30% ④ 싸우는 기사 봇에게 이뮨 · 다친 봇 힐 ⑤ 기사 봇 자기 버프
// ⑥ 파티장 → 봇: 파티창에서 힐 ⑦ 화면에서 봇을 눌러 이뮨 → 받는 피해 −30% ⑧ 어드밴스 스피릿 ⑨ 리무브 커스 ⑩ 실드·카운터 매직(파티 전체)·힐 올
// ⑪ 파티창 버프 아이콘 (스크린샷 dev/out/pbbuff_box.png) ⑫ 채팅 도배 없음 ⑬ 다른 PC로 기사 버프 칸
const { chromium } = require('playwright'); const login = require('../tq.js');
const Z = +(process.env.BZ || 12);
const REF = { lv: 61, fb: { lv: 61, c: 'knight', hp: 778, ac: -127, mr: 85, d: 60, hb: 0.05, cr: 0.12, cp: 11114 } };
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
const toZone = async (p, z) => { await p.evaluate(z => __T.TOWN.toZone(z), z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', z, { timeout: 60000 }); await p.waitForTimeout(2500); };
const SETUP = R => { __T.GOD_INV = true; __FB.setRef(R); Object.assign(__FB.DBG, { noEnsure: true, noBoss: true, noTalk: true, noReinf: true }); };
(async () => { const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await login(p, { cls: 'wizard', name: 'pbw' + Date.now() % 1e4 }); await p.evaluate(SETUP, REF); await p.evaluate(() => { const H = __T.hero; H.lv = 61; __T.wizAutoLearn(true); H.baseHP = 800; H.baseMP = 600; __T.INV.render(); H.hp = H.max; H.mp = H.maxmp; });   /* 새 캐릭터라 HP·MP를 넉넉히 */
  const U = await p.evaluate(() => { const F = __FB, L = F.pb.list().filter(x => !x.why), w = L.find(x => x.b.cls === 'wizard'), k = L.filter(x => x.b.cls === 'knight').sort((a, c) => c.lv - a.lv)[0], o = L.find(x => x !== w && x !== k); for (const x of [w, k, o]) F.pb.invite(x.b.uid); return { w: w.b.uid, k: k.b.uid, o: o.b.uid, n: F.pb.S.m.length }; });
  await toZone(p, Z); await p.evaluate(SETUP, REF); await p.evaluate(() => { const H = __T.hero; H.lv = 61; H.hp = H.max; H.mp = H.maxmp; });
  // 몹은 하나만 남김 (HP 크게 · 가만히)
  const prep = await p.evaluate(() => { const T = __T, H = T.hero, M = T.MOB; let m0 = null, bd = 1e9; for (const m of T.foxes) { if (m.fb || m.dead || !M[m.kind] || M[m.kind].boss || M[m.kind].midb || M[m.kind].dummy) continue; const d = Math.max(Math.abs(m.i - H.i), Math.abs(m.j - H.j)); if (d <= 30 && d >= 3 && d < bd) { bd = d; m0 = m; } }
    for (const m of T.foxes) if (!m.fb && !m.dead && m !== m0 && Math.max(Math.abs(m.i - H.i), Math.abs(m.j - H.j)) <= 30) { m.dead = true; m.deadT = -1e9; }
    window.__m0 = m0; if (m0) { m0.hp = m0.max = 1e7; m0.aggro = false; m0.tgt = null; m0.dead = true; m0.deadT = -1e9; } __FB.pb.cmd('move'); __FB.sim(0.5); return { m0: m0 && m0.kind, n: __FB.pb.here().length }; });
  console.log('prep', JSON.stringify(U), JSON.stringify(prep)); ok(U.n === 3 && prep.n === 3 && !!prep.m0, `파티 봇 3명 (법사·기사·${prep.n}) · 시험 몹 ${prep.m0}`);
  const BY = `const F = __FB, T = __T, H = T.hero, E = uid => F.pb.E.get(uid), W = E(${U.w}), K = E(${U.k}), O = E(${U.o}), Wk = T.walkable_;
    const spot = r => { for (let q = r; q <= r + 3; q++) for (const [a, c] of [[q, 0], [0, q], [-q, 0], [0, -q], [q, q], [-q, -q], [q, -q], [-q, q]]) if (Wk(H.i + a, H.j + c) && !F.pb.here().some(e => e.i === H.i + a && e.j === H.j + c)) return [H.i + a, H.j + c]; return [H.i + r, H.j]; };
    const put = (m, r) => { const s = spot(r); m.dead = false; m.deadT = 0; m.hp = m.max = 1e7; m.aggro = false; m.tgt = null; m.i = m.fi = s[0]; m.j = m.fj = s[1]; m.x = m.i + .5; m.z = m.j + .5; m.t = 1; };`;
  const ev = (body, arg) => p.evaluate(new Function('arg', BY + body), arg);
  // ① 11/4 프로듀서: 파티 봇은 초록·용기의 물약을 마시지 않음 — 속도는 필드 봇과 같은 기본값 (공격 간격 = atkCd · 이동 = SPD)
  const r1 = await ev(`F.sim(5); const L = F.pb.here(), drank = L.some(e => e.pbf.haste1 > T.time || e.pbf.haste2 > T.time), hs = L.map(e => F.pb.haste(e)), n = F.stat().pbHaste || 0; return { drank, hs, n };`);
  console.log('①', JSON.stringify(r1)); ok(!r1.drank && r1.n === 0 && r1.hs.every(h => h === 1), '① 파티 봇은 초록·용기의 물약을 마시지 않음 (필드 봇과 같은 기본 속도)');
  // ② 법사 봇: 다친 파티장 힐 · 채팅 1분에 한 번
  const r2 = await ev(`F.pb.cmd('move'); H.target = null; F.pb.msg.h = -999; const s0 = F.stat().pbHealMe || 0, l0 = performance.now(); H.hp = Math.round(H.max * 0.3); const h0 = H.hp; W.px.sk.heal = 0; F.sim(1); const h1 = H.hp;
    for (let k = 0; k < 10; k++) { H.hp = Math.round(H.max * 0.3); F.sim(3); } const n = (F.stat().pbHealMe || 0) - s0, msg = T.log.filter(l => l.at >= l0).filter(l => /\\[혈맹 파티\\].*\\(봇\\)님이 힐을/.test(l.t)).map(l => l.t); H.hp = H.max; return { h0, h1, mx: H.max, n, msg };`);
  console.log('②', JSON.stringify(r2)); ok(r2.h1 > r2.h0, `② 법사 봇이 HP 30% 파티장에게 힐 (${r2.h0} → ${r2.h1}/${r2.mx})`); ok(r2.n >= 6 && r2.msg.length === 1, `② 31초 동안 힐 ${r2.n}번 · 채팅은 1번 (${r2.msg[0]})`);
  // ③ 이뮨 투 함: 싸우는 파티장만 · 받는 피해 −30%
  const r3 = await ev(`const m = window.__m0; F.pb.msg.i = -999; T.BUFF.immune = 0; H.target = null; W.px.sk.imm = 0; F.sim(3); const idle = T.BUFF.immune; const l0 = performance.now(), s0 = F.stat().pbImm || 0;
    put(m, 3); H.target = m; F.sim(1.5); const im = T.BUFF.immune, n = (F.stat().pbImm || 0) - s0;
    const msg = T.log.filter(l => l.at >= l0).filter(l => /이뮨 투 함을 걸어 줬어요/.test(l.t)).map(l => l.t); const R = Math.random; Math.random = () => 0.5; T.GOD_INV = false; const mx = H.max; let d0, d1; try { H.max = H.hp = 5000; T.BUFF.immune = 0; T.hurtHero(200, null, 'melee'); d0 = H.max - H.hp; H.hp = H.max; T.BUFF.immune = 18; T.hurtHero(200, null, 'melee'); d1 = H.max - H.hp; } finally { Math.random = R; T.GOD_INV = true; H.max = H.hp = mx; }   /* 새 캐릭터라 최대 HP가 작아서 잠깐 크게 (쓰러지지 않게) */
    T.BUFF.immune = im; return { idle, im, n, msg, d0, d1, dead: T.DEATH };`);
  console.log('③', JSON.stringify(r3)); ok(r3.idle === 0, '③ 파티장이 안 싸울 때는 이뮨을 안 걸어 줌'); ok(r3.im >= 16 && r3.n >= 1 && r3.msg.length === 1, `③ 싸우는 파티장에게 이뮨 투 함 (${r3.im.toFixed(1)}초 · ${r3.msg[0]})`); ok(r3.d1 < r3.d0 && Math.abs(r3.d1 / r3.d0 - 0.7) < 0.06, `③ 이뮨 중 받는 피해 ${r3.d0} → ${r3.d1} (−30%)`);
  // ④ 싸우는 기사 봇에게 이뮨 · 다친 봇 힐 (봇끼리)
  const r4 = await ev(`const m = window.__m0; T.BUFF.immune = 99; F.pb.cmd('fight'); H.target = m; K.immT = 0; F.sim(1); const kt = !!K.px.tgt; K.immT = 0; W.px.sk.imm = 0; F.sim(1.5);   /* 11/4: 처음 1초 안에 이미 걸었으면 남은 시간이 16초 아래라 — 지우고 다시 걸리는지 봄 */ const ki = K.immT - T.time;
    F.pb.cmd('move'); H.target = null; m.dead = true; m.deadT = -1e9; F.sim(0.5); const s0 = F.stat().pbHeal || 0; K.hp = Math.round(K.max * 0.4); K.px.pot = 1e9; const k0 = K.hp; W.px.sk.heal = 0; F.sim(1); const k1 = K.hp; K.px.pot = 0; T.BUFF.immune = 0; return { kt, ki, k0, k1, mx: K.max, n: (F.stat().pbHeal || 0) - s0 };`);
  console.log('④', JSON.stringify(r4)); ok(r4.kt && r4.ki > 16, `④ 싸우는 기사 봇에게 이뮨 투 함 (${r4.ki.toFixed(1)}초)`); ok(r4.k1 > r4.k0 && r4.n >= 1, `④ 법사 봇이 다친 봇도 힐 (${r4.k0} → ${r4.k1}/${r4.mx})`);
  // ⑤ 기사 봇 자기 버프 (필드 기사 봇과 같음)
  const r5 = await ev(`F.sim(6); const lv = K.bot.st.lv, want = ['reduction', 'bounce', 'solid', 'counter'].filter(id => lv >= T.SK[id].lv), on = want.filter(id => K.px.bf[id] > T.time); return { lv, want, on, bits: K.fbBf };`);
  console.log('⑤', JSON.stringify(r5)); ok(r5.want.length > 0 && r5.on.length === r5.want.length && r5.bits === ((r5.on.includes('reduction') ? 1 : 0) | (r5.on.includes('solid') ? 2 : 0) | (r5.on.includes('counter') ? 4 : 0)), `⑤ 기사 봇(Lv.${r5.lv}) 자기 버프 ${r5.on.join('·')}`);
  // ⑥ 파티장 → 봇: 단축키(힐) → 파티창의 봇 칸을 누름
  await ev(`F.pb.cmd('wait'); T.INV.setHot(4, 'sk:heal'); T.INV.setHot(5, 'sk:immune'); T.INV.setHot(6, 'sk:advspirit'); T.INV.setHot(7, 'sk:rcurse'); for (const e of F.pb.here()) { e.px.pot = 1e9; e.px.sk.heal = 1e9; } O.hp = Math.round(O.max * 0.3); H.mp = H.maxmp; for (const k in T.SKCD) T.SKCD[k] = 0; return 0;`);
  await p.waitForTimeout(500); const h6 = await ev(`return { hp: O.hp, l: performance.now() };`);
  await p.keyboard.press('F5'); await p.waitForTimeout(150); const sk6 = await p.evaluate(() => document.documentElement.classList.contains('sktgt'));
  await p.click(`#partybox .pb-m.pbot[data-pbu="${U.o}"] .pb-t`); await p.waitForTimeout(250);
  const r6 = await ev(`return { hp: O.hp, mx: O.max, msg: T.log.filter(l => l.at >= arg.l).map(l => l.t).filter(t => /힐 →/.test(t)), sk: document.documentElement.classList.contains('sktgt') };`, h6);
  console.log('⑥', JSON.stringify(h6), JSON.stringify(r6)); const g6 = r6.msg[0] && +(/\(\+(\d+)\)/.exec(r6.msg[0]) || [])[1];
  ok(sk6 && !r6.sk, '⑥ 힐 단축키 → 대상 선택 → 파티창의 봇 칸을 누르면 시전'); ok(r6.hp > h6.hp && g6 === r6.hp - h6.hp && /\(봇\)/.test(r6.msg[0]), `⑥ 파티장의 힐이 봇에게 (${h6.hp} → ${r6.hp} · ${r6.msg[0]})`);
  // ⑦ 화면에서 봇을 눌러 이뮨 → 받는 피해 −30%
  const pos = await ev(`H.mp = H.maxmp; for (const k in T.SKCD) T.SKCD[k] = 0; K.immT = 0; const L = F.pb.here(); let e = K; const [sx, sy] = T.scr(e.x, e.z), [hx, hy] = T.scr(H.x, H.z); return { sx, sy: sy - 40 * T.curZ, hx, hy, l: performance.now(), d: Math.max(Math.abs(e.i - H.i), Math.abs(e.j - H.j)) };`);
  await p.keyboard.press('F6'); await p.waitForTimeout(150); await p.mouse.click(pos.sx, pos.sy); await p.waitForTimeout(250);
  const r7 = await ev(`const im = K.immT - T.time, msg = T.log.filter(l => l.at >= arg.l).map(l => l.t).filter(t => /이뮨 투 함 →/.test(t)); const m = window.__m0, S = T.MOB[m.kind], R = Math.random; Math.random = () => 0.5; let d0, d1; const hp = K.hp, it = K.immT;
    try { K.hp = K.max; K.immT = 0; F.mobHit(K, m, S, 300, 1); d0 = K.max - K.hp; K.hp = K.max; K.immT = T.time + 18; F.mobHit(K, m, S, 300, 1); d1 = K.max - K.hp; } finally { Math.random = R; K.hp = hp; K.immT = it; } return { im, msg, d0, d1, dr: K.bot.st.dr || 0 };`, pos);
  console.log('⑦', JSON.stringify(pos), JSON.stringify(r7)); ok(r7.im > 17 && r7.msg.length === 1, `⑦ 화면에서 기사 봇을 눌러 이뮨 투 함 (${r7.im.toFixed(1)}초 · ${r7.msg[0]})`); ok(r7.d1 < r7.d0 && Math.abs((r7.d1 + r7.dr) / (r7.d0 + r7.dr) - 0.7) < 0.06, `⑦ 이뮨 중 봇이 받는 피해 ${r7.d0} → ${r7.d1} (−30%)`);
  // ⑧ 어드밴스 스피릿 (파티창) ⑨ 리무브 커스 (화면)
  const h8 = await ev(`H.mp = H.maxmp; for (const k in T.SKCD) T.SKCD[k] = 0; return { mx: W.max, hp: W.hp, base: W.bot.st.hp };`); await p.waitForTimeout(2100);
  await p.keyboard.press('F7'); await p.waitForTimeout(150); await p.click(`#partybox .pb-m.pbot[data-pbu="${U.w}"] .pb-t`); await p.waitForTimeout(250);
  const r8 = await ev(`return { mx: W.max, hp: W.hp, left: W.pbf.advsp - T.time };`);
  console.log('⑧', JSON.stringify(h8), JSON.stringify(r8)); ok(r8.mx === Math.round(h8.base * 1.2) && r8.hp === h8.hp && r8.left > 1790, `⑧ 어드밴스 스피릿 → 봇 최대 HP ${h8.mx} → ${r8.mx} (+20% · 30분)`);
  const pos9 = await ev(`H.mp = H.maxmp; for (const k in T.SKCD) T.SKCD[k] = 0; O.wslowT = 5; O.slowT = 3; const [sx, sy] = T.scr(O.x, O.z); return { sx, sy: sy - 40 * T.curZ, l: performance.now() };`);
  await p.keyboard.press('F8'); await p.waitForTimeout(150); await p.mouse.click(pos9.sx, pos9.sy); await p.waitForTimeout(250);
  const r9 = await ev(`return { w: O.wslowT, s: O.slowT, msg: T.log.filter(l => l.at >= arg.l).map(l => l.t).filter(t => /리무브 커스 →/.test(t)) };`, pos9);
  console.log('⑨', JSON.stringify(r9)); ok(r9.w <= 0 && r9.s <= 0 && /2개/.test(r9.msg[0] || ''), `⑨ 리무브 커스 → 봇의 슬로우 풀림 (${r9.msg[0]})`);
  // ⑩ 실드·카운터 매직 (파티 전체 → 봇도) · 힐 올
  const r10 = await ev(`const cast = id => { H.mp = H.maxmp; for (const k in T.SKCD) T.SKCD[k] = 0; T.castSkill(id); }; const l0 = performance.now(); cast('shieldm'); cast('counterm'); const L = F.pb.here(), sh = L.map(e => e.pbf.shieldm > T.time + 590), cm = L.map(e => e.pbf.counterm > T.time + 590);
    const m = window.__m0, S = T.MOB[m.kind], hp = O.hp, c0 = F.stat().pbCm || 0; F.mobHit(O, m, S, 300, 1, true); const blk = O.hp === hp && !(O.pbf.counterm > T.time) && (F.stat().pbCm || 0) === c0 + 1; F.mobHit(O, m, S, 300, 1, true); const hit2 = O.hp < hp; O.hp = hp;
    for (const e of L) e.hp = Math.round(e.max * 0.5); const h0 = L.map(e => e.hp); cast('healall'); const h1 = L.map(e => e.hp); const msg = T.log.filter(l => l.at >= l0).map(l => l.t).filter(t => /봇/.test(t)); for (const e of L) { e.px.pot = 0; e.px.sk.heal = 0; } return { sh, cm, blk, hit2, h0, h1, msg };`);
  console.log('⑩', JSON.stringify(r10)); ok(r10.sh.every(Boolean) && r10.cm.every(Boolean), '⑩ 실드·카운터 매직을 쓰면 8칸 안 파티 봇에게도 (10분)'); ok(r10.blk && r10.hit2, '⑩ 카운터 매직: 봇이 받는 마법 공격 1회 무효 (그다음은 맞음)'); ok(r10.h1.every((h, k) => h > r10.h0[k]) && r10.msg.some(t => /봇 3명 회복/.test(t)), `⑩ 힐 올 → 파티 봇 3명도 회복 (${r10.h0} → ${r10.h1})`);
  // ⑪ 파티창 버프 아이콘 (사람 파티원과 같은 모양 · 남은 시간)
  await p.waitForTimeout(700);
  const r11 = await p.evaluate(() => { const rows = [...document.querySelectorAll('#partybox .pb-m')].map(r => ({ u: r.dataset.pbu || r.dataset.pp, n: r.querySelectorAll('.pb-bf .pb-b').length, t: [...r.querySelectorAll('.pb-bf .pb-b')].map(s => s.title.split(' · ')[0]) })); return rows; });
  console.log('⑪', JSON.stringify(r11)); const rw = u => r11.find(r => r.u === String(u)) || { t: [] };
  ok([U.w, U.k, U.o].every(u => rw(u).t.includes('실드') && !rw(u).t.includes('1단 가속 (초록 물약)')), '⑪ 봇 칸마다 버프 아이콘 (실드 … · 11/4: 초록·용기 물약은 안 마심)'); ok(rw(U.k).t.includes('이뮨 투 함') && rw(U.k).t.includes('리덕션 아머') && rw(U.w).t.includes('어드밴스 스피릿'), `⑪ 이뮨·기사 버프·어드밴스 스피릿 아이콘 (기사 ${rw(U.k).t.length}개)`);
  ok(rw('me').t.includes('실드'), '⑪ 내 칸에도 내 버프 아이콘 (사람 파티와 같음)');
  const bx = await p.evaluate(() => { const r = document.getElementById('partybox').getBoundingClientRect(); return { x: Math.max(0, r.left - 4), y: Math.max(0, r.top - 4), width: r.width + 8, height: r.height + 8 }; });
  await p.screenshot({ path: 'dev/out/pbbuff_box.png', clip: bx }); await p.screenshot({ path: 'dev/out/pbbuff_field.png' });
  // ⑫ 채팅 도배 없음 (40초 · 파티장 HP 낮고 싸우는 중)
  const r12 = await ev(`const m = window.__m0; put(m, 3); H.target = m; F.pb.cmd('move'); for (const e of F.pb.here()) e.px.pot = 0; const l0 = performance.now(), s0 = F.stat().pbHeal || 0, i0 = F.stat().pbImm || 0; F.pb.msg.h = F.pb.msg.i = -999;
    for (let k = 0; k < 20; k++) { H.hp = Math.round(H.max * 0.3); if (k % 5 === 0) T.BUFF.immune = 0; F.sim(2); } const L = T.log.filter(l => l.at >= l0).map(l => l.t), hm = L.filter(t => /\\(봇\\)님이 힐을/.test(t)).length, im = L.filter(t => /\\(봇\\)님이 이뮨/.test(t)).length, pb = L.filter(t => /^\\[혈맹 파티\\]/.test(t) && !/^\\[혈맹 파티\\] (대기|이동|전투) —/.test(t)).length;
    H.target = null; H.hp = H.max; m.dead = true; m.deadT = -1e9; return { heals: (F.stat().pbHeal || 0) - s0, imms: (F.stat().pbImm || 0) - i0, hm, im, pb, all: L.length };`);
  console.log('⑫', JSON.stringify(r12)); ok(r12.heals >= 6 && r12.imms >= 2 && r12.hm <= 1 && r12.im <= 1 && r12.pb <= 2, `⑫ 40초 동안 힐 ${r12.heals}번·이뮨 ${r12.imms}번 → 채팅 힐 ${r12.hm}·이뮨 ${r12.im}줄 (도배 없음)`);
  // ⑬ 다른 PC에 보내는 칸: 기사 버프(리덕션 16·솔리드 32·카운터 64) · 이뮨 8
  await p.waitForTimeout(400); const r13 = await ev(`const o = T.NET.dbgPayload(), L = o && o.pb && o.pb.L || [], r = L.find(x => x[0] === ${U.k}); return { fl: r ? r[5] : -1, bits: K.fbBf, imm: K.immT > T.time };`);
  console.log('⑬', JSON.stringify(r13)); ok(r13.fl >= 0 && ((r13.fl >> 4) & 7) === r13.bits && !!(r13.fl & 8) === r13.imm, `⑬ 다른 PC로 기사 버프·이뮨 칸 (${r13.fl})`);
  console.log(errs.slice(0, 5).join('\n') || 'no errors'); ok(!errs.length, '오류 없음');
  console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
