// 11/4 혈맹 파티 2단계 (dev/rooms/botparty.md · dev/notes/botparty2.md)
//   KT_PORT=8902 KT_TO=600 bash dev/runkt.sh dev/tests/botparty2.js
// ① ② 근처 각개 사냥 N칸: 파티장 대상이 없으면 N칸 안의 몹을 직접 고름 · N칸 밖 몹은 안 침 · 치던 몹이 N칸 밖으로 나가면 놓고 돌아옴 · 파티장이 N칸 밖 몹을 쳐도 안 따라감 (일점사는 따라감)
// ② ③ 쫄법사: 법사 봇만 (기사·요정은 안 됨) · 공격 안 함 · 파티장 2칸 안 · 파티장 HP 80% 밑이면 힐 · 이뮨 · 파티장이 괜찮으면 다친 봇 힐
// ③ 전투 우선: 끄면 사냥 그대로 · 켜면 8칸 안 적 봇 먼저 · 멀어지면(11칸) 안 쫓고 사냥으로 · 다시 가까워지면 또 공격
// ④ 저장 pbDump → pbLoad (스타일·칸·전투 우선 · 옛 저장 = 일점사) ⑤ 툴팁 ① ② ③ ④ · 고른 것 테두리 · − + 칸 · 채팅 · 전투 우선 체크 (스크린샷 dev/out/botparty2_*.png)
const { chromium } = require('playwright'); const login = require('../tq.js');
const Z = +(process.env.BZ || 12);
const REF = { lv: 61, fb: { lv: 61, c: 'knight', hp: 778, ac: -127, mr: 85, d: 60, hb: 0.05, cr: 0.12, cp: 11114 } };
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
const toZone = async (p, z) => { await p.evaluate(z => __T.TOWN.toZone(z), z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', z, { timeout: 60000 }); await p.waitForTimeout(2500); };
const SETUP = R => { __T.GOD_INV = true; __FB.setRef(R); Object.assign(__FB.DBG, { noEnsure: true, noBoss: true, noTalk: true, noReinf: true }); };
(async () => { const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await login(p, { cls: 'knight', name: 'bp2' + Date.now() % 1e4 }); await p.evaluate(SETUP, REF); await p.evaluate(() => { const H = __T.hero; H.lv = 61; H.hp = H.max; });
  const U = await p.evaluate(() => { const F = __FB, L = F.pb.list().filter(x => !x.why), w = L.find(x => x.b.cls === 'wizard'), k = L.find(x => x.b.cls === 'knight'), o = L.find(x => x.b.cls === 'elf') || L.find(x => x !== w && x !== k); for (const x of [w, k, o]) F.pb.invite(x.b.uid); return { w: w.b.uid, k: k.b.uid, o: o.b.uid, oc: o.b.cls, n: F.pb.S.m.length, st: [w, k, o].map(x => F.pb.stOf(x.b.uid).st) }; });
  await toZone(p, Z); await p.evaluate(SETUP, REF); await p.evaluate(() => { const H = __T.hero; H.lv = 61; H.hp = H.max; });
  const prep = await p.evaluate(() => { const T = __T, F = __FB, H = T.hero, M = T.MOB; for (const f of F.bots()) f.gone = true; const L = [];
    for (const m of T.foxes) { if (m.fb || m.dead || !M[m.kind] || M[m.kind].boss || M[m.kind].midb || M[m.kind].dummy || M[m.kind].pet) continue; if (Math.max(Math.abs(m.i - H.i), Math.abs(m.j - H.j)) <= 30) L.push(m); }
    L.sort((a, c) => Math.max(Math.abs(a.i - H.i), Math.abs(a.j - H.j)) - Math.max(Math.abs(c.i - H.i), Math.abs(c.j - H.j))); const keep = L.slice(0, 2); for (const m of L.slice(2)) { m.dead = true; m.deadT = -1e9; }
    window.__mA = keep[0]; window.__mB = keep[1]; for (const m of keep) { m.hp = m.max = 1e7; m.aggro = false; m.tgt = null; m.dead = true; m.deadT = -1e9; } F.pb.cmd('move'); F.sim(0.5); return { A: keep[0] && keep[0].kind, B: keep[1] && keep[1].kind, n: F.pb.here().length }; });
  console.log('prep', JSON.stringify(U), JSON.stringify(prep)); ok(U.n === 3 && prep.n === 3 && !!prep.A && !!prep.B, `파티 봇 3명 (법사·기사·${U.oc}) · 시험 몹 ${prep.A}·${prep.B}`); ok(U.st.every(s => s === 'focus'), '처음 사냥 스타일은 ① 일점사');
  const BY = `const F = __FB, T = __T, H = T.hero, E = uid => F.pb.E.get(uid), W = E(${U.w}), K = E(${U.k}), O = E(${U.o}), A = window.__mA, B = window.__mB, Wk = T.walkable_, cb = (a, c) => Math.max(Math.abs(a.i - c.i), Math.abs(a.j - c.j));
    const spot = r => { for (const [a, c] of [[r, 0], [0, r], [-r, 0], [0, -r], [r, 1], [1, r], [-r, -1], [-1, -r], [r, -1], [-1, r], [-r, 1], [1, -r]]) if (Wk(H.i + a, H.j + c) && !T.foxes.some(f => !f.dead && !f.gone && f.i === H.i + a && f.j === H.j + c) && !F.pb.here().some(e => e.i === H.i + a && e.j === H.j + c)) return [H.i + a, H.j + c]; return null; };
    const put = (m, r, keepA) => { const s = spot(r); if (!s) return false; m.dead = false; m.deadT = 0; if (!(m.hp > 0) || m.hp < 1e6) m.hp = m.max = 1e7; if (!keepA) { m.aggro = false; m.tgt = null; } m.i = m.fi = s[0]; m.j = m.fj = s[1]; m.x = m.i + .5; m.z = m.j + .5; m.t = 1; if (m.bx) m.bx.tgt = null; return true; };
    const pin = (m, r) => { if (cb(m, H) !== r) put(m, r); m.aggro = false; m.tgt = null; if (m.bx) m.bx.tgt = null; };
    const heal = () => { for (const e of F.pb.here()) { e.hp = e.max; e.dead = false; } };
    const run = (sec, fn) => { for (let k = 0, n = Math.round(sec / 0.25); k < n; k++) { if (fn) fn(k); F.sim(0.25); heal(); } };`;
  const ev = (body, arg) => p.evaluate(new Function('arg', BY + body), arg);
  // ① 근처 각개 사냥 (N = 4)
  const r1 = await ev(`F.pb.cmd('fight'); H.target = null; for (const u of [${U.w}, ${U.k}, ${U.o}]) F.pb.st(u, 'near', 4, true); const st = [W, K, O].map(e => F.pb.stOf(e.uid));
    const pa = put(A, 3), pb = put(B, 7); let tA = 0, tB = 0; run(5, () => { pin(B, 7); H.target = null; for (const e of [W, K, O]) { if (e.px.tgt === A) tA++; if (e.px.tgt === B) tB++; } });
    const dA = A.dmgBy ? A.dmgBy.get(H) || 0 : 0, dB = B.dmgBy ? B.dmgBy.size : 0, dBhp = B.max - B.hp;
    return { st, pa, pb, tA, tB, dA, dB, dBhp, seenB: T.DN.seen ? T.DN.seen(B.i, B.j) : null, hits: [W, K, O].map(e => e.px.hits) };`);
  console.log('①', JSON.stringify(r1)); ok(r1.st.every(s => s.st === 'near' && s.n === 4), '① 3명 모두 ② 근처 각개 4칸');
  ok(r1.pa && r1.pb && r1.tA > 0 && r1.dA > 0, `① 파티장 대상이 없어도 4칸 안 몹(${prep.A})을 직접 골라 사냥 (피해 ${r1.dA} · 파티장 몫)`); ok(r1.tB === 0 && r1.dBhp === 0, '① 4칸 밖(7칸) 몹은 안 침');
  const r1b = await ev(`let tA = 0; run(0.5, () => { pin(A, 8); pin(B, 9); H.target = null; }); const sA = A.max - A.hp; run(4, () => { pin(A, 8); pin(B, 9); H.target = null; for (const e of [W, K, O]) if (e.px.tgt === A) tA++; }); const dA = A.max - A.hp - sA;
    const d = [W, K, O].map(e => cb(e, H)), tg = [W, K, O].map(e => !!e.px.tgt); return { tA, dA, d, tg };`);
  console.log('①b', JSON.stringify(r1b)); ok(r1b.tA === 0 && r1b.dA === 0 && r1b.tg.every(t => !t), '① 치던 몹이 4칸 밖(8칸)으로 나가면 놓음 (안 쫓음)'); ok(r1b.d.every(x => x <= 3), `① 놓고 파티장 곁으로 돌아옴 (${r1b.d}칸)`);
  const r1c = await ev(`F.pb.st(${U.o}, 'focus', null, true); let near = 0, foc = 0; run(4, () => { pin(A, 7); pin(B, 9); H.target = A; H.lastHit = A; H.lastHitT = T.time; for (const e of [W, K]) if (e.px.tgt === A) near++; if (O.px.tgt === A) foc++; });
    H.target = null; H.lastHit = null; const out = { near, foc, d: [W, K].map(e => cb(e, H)) }; F.pb.st(${U.o}, 'near', 4, true); return out;`);
  console.log('①c', JSON.stringify(r1c)); ok(r1c.near === 0 && r1c.foc > 0, `① 파티장이 7칸 밖 몹을 쳐도 근처 각개(4칸)는 안 따라감 · 일점사 봇은 같이 침 (${r1c.foc})`);
  const r1d = await ev(`let tA = 0; run(3, () => { pin(B, 9); if (cb(A, H) > 3) put(A, 3); H.target = A; for (const e of [W, K, O]) if (e.px.tgt === A) tA++; }); H.target = null; return { tA };`);
  console.log('①d', JSON.stringify(r1d)); ok(r1d.tA > 0, '① 파티장이 4칸 안 몹을 치면 같이 침');
  // ② 쫄법사
  const r2a = await ev(`const k0 = F.pb.st(${U.k}, 'zzol', null, true), o0 = F.pb.st(${U.o}, 'zzol', null, true), w0 = F.pb.st(${U.w}, 'zzol'); return { k0, o0, w0, k: F.pb.stOf(${U.k}).st, o: F.pb.stOf(${U.o}).st, w: F.pb.stOf(${U.w}).st };`);
  console.log('②a', JSON.stringify(r2a)); ok(!r2a.k0 && !r2a.o0 && r2a.k === 'near' && r2a.o === 'near', '② 기사·요정 봇은 쫄법사를 못 고름'); ok(r2a.w0 && r2a.w === 'zzol', '② 법사 봇은 ③ 쫄법사');
  const r2 = await ev(`F.pb.st(${U.k}, 'focus', null, true); F.pb.st(${U.o}, 'focus', null, true); F.pb.cmd('fight'); const h0 = W.px.hits, pend0 = F.pb.pend.filter(q => q.e === W).length; let tg = 0, mx = 0, smp = [];
    run(6, k => { pin(B, 9); if (cb(A, H) > 3) put(A, 3, true); H.target = A; if (W.px.tgt) tg++; if (k >= 4) { const d = cb(W, H); mx = Math.max(mx, d); smp.push(d); } });
    return { hits: W.px.hits - h0, pend: F.pb.pend.filter(q => q.e === W).length - pend0, tg, mx, end: cb(W, H), kh: K.px.hits, smp: smp.slice(-6) };`);
  console.log('②', JSON.stringify(r2)); ok(r2.hits === 0 && r2.pend <= 0 && r2.tg === 0, `② 쫄법사는 싸우는 중에도 공격 안 함 (다른 봇은 ${r2.kh}번)`); ok(r2.mx <= 2 && r2.end <= 2, `② 파티장 2칸 안을 따라다님 (최대 ${r2.mx}칸)`);
  const r2b = await ev(`H.target = null; A.dead = true; A.deadT = -1e9; B.dead = true; B.deadT = -1e9; F.sim(0.5); const s0 = F.stat().pbHealMe || 0; H.hp = Math.round(H.max * 0.7); const h0 = H.hp; W.px.sk.heal = 0; F.sim(0.6); const h1 = H.hp, n1 = (F.stat().pbHealMe || 0) - s0;
    H.hp = Math.round(H.max * 0.7); T.BUFF.immune = 0; W.px.sk.imm = 0; F.sim(0.6); const im0 = T.BUFF.immune; H.hp = H.max;
    F.pb.st(${U.w}, 'focus', null, true); const s1 = F.stat().pbHealMe || 0; H.hp = Math.round(H.max * 0.7); W.px.sk.heal = 0; T.BUFF.immune = 0; W.px.sk.imm = 0; F.sim(0.6); const nf = (F.stat().pbHealMe || 0) - s1, imf = T.BUFF.immune; H.hp = H.max; F.pb.st(${U.w}, 'zzol', null, true);
    T.BUFF.immune = 0; put(A, 3); H.target = A; W.px.sk.imm = 0; F.sim(0.6); const im1 = T.BUFF.immune; H.target = null; A.dead = true; A.deadT = -1e9;
    K.px.pot = 1e9; K.hp = Math.round(K.max * 0.4); const k0 = K.hp; W.px.sk.heal = 0; for (let q = 0; q < 3; q++) F.sim(0.2); const k1 = K.hp; K.px.pot = 0; T.BUFF.immune = 0;
    return { h0, h1, mx: H.max, n1, im0, nf, imf, im1, k0, k1 };`);
  console.log('②b', JSON.stringify(r2b)); ok(r2b.h1 > r2b.h0 && r2b.n1 >= 1, `② 쫄법사: 파티장 HP 70%에도 힐 (${r2b.h0} → ${r2b.h1}/${r2b.mx}) · 일점사 법사는 안 함 (${r2b.nf}번)`); ok(r2b.nf === 0 && r2b.imf === 0, '② (비교) 일점사 법사 봇은 HP 70%·안 싸우는 파티장에게 힐·이뮨 안 함');
  ok(r2b.im0 > 16 && r2b.im1 > 16, `② 쫄법사: 파티장에게 이뮨 투 함 (HP 80% 밑 ${r2b.im0.toFixed(1)}초 · 싸울 때 ${r2b.im1.toFixed(1)}초)`); ok(r2b.k1 > r2b.k0, `② 파티장이 괜찮으면 다친 파티 봇 힐 (${r2b.k0} → ${r2b.k1})`);
  // ③ 전투 우선 (적 = 라인 B 봇 · 가만히 세워 둠 = 먼저 덤비지 않음)
  const r3 = await ev(`F.pb.st(${U.k}, 'focus', null, true); F.pb.st(${U.o}, 'focus', null, true); const x = F.roster().B.find(q => q.cls === 'knight') || F.roster().B[0]; const s = spot(6); const f = s && F.spawnTest(x.uid, s[0], s[1]); if (!f) return null; window.__eB = f;
    f.hp = f.max = 1e7; f.stunT = 999; if (f.bx) f.bx.tgt = null; const fr = () => { f.stunT = 999; if (f.bx) f.bx.tgt = null; if (f.hp < 1e6) f.hp = 1e7; f.dead = false; };
    put(A, 3); H.target = A; F.pb.cmd('fight'); let off = 0, offA = 0; run(2, () => { fr(); pin(B, 9); if (cb(A, H) > 4) put(A, 3, true); H.target = A; for (const e of [K, O]) { if (e.px.tgt === f) off++; if (e.px.tgt === A) offA++; } });
    const pr = F.pb.pri(true), l0 = performance.now(); let on = 0; const e0 = f.max - f.hp; run(2, () => { fr(); pin(B, 9); if (cb(A, H) > 4) put(A, 3, true); H.target = A; for (const e of [K, O]) if (e.px.tgt === f) on++; }); const dmg = f.max - f.hp - e0;
    const msg = T.log.filter(l => l.at >= l0).map(l => l.t).filter(t => /전투 우선 켬/.test(t)); return { uid: x.uid, cls: x.cls, d: cb(f, H), off, offA, pr, on, dmg, wz: W.px.tgt === f, msg, S: F.pb.S.pri };`);
  console.log('③', JSON.stringify(r3)); ok(r3 && r3.off === 0 && r3.offA > 0, '③ 전투 우선 끔: 가만히 있는 적 봇(6칸)은 두고 사냥 (1단계 그대로)');
  ok(r3 && r3.pr && r3.S && r3.on > 0 && r3.dmg > 0 && !r3.wz, `③ 전투 우선 켬: 사냥을 멈추고 6칸 적 봇 먼저 공격 (피해 ${r3 && r3.dmg} · 쫄법사는 그대로) · ${r3 && r3.msg[0]}`);
  const r3b = await ev(`const f = window.__eB, fr = () => { f.stunT = 999; if (f.bx) f.bx.tgt = null; if (f.hp < 1e6) f.hp = 1e7; f.dead = false; }; let far = 0, back = 0;
    run(3, k => { fr(); if (cb(f, H) !== 11) { const s = spot(11); if (s) { f.i = f.fi = s[0]; f.j = f.fj = s[1]; f.x = f.i + .5; f.z = f.j + .5; f.t = 1; } } pin(B, 9); if (cb(A, H) > 4) put(A, 3, true); H.target = A; if (k >= 2) for (const e of [K, O]) { if (e.px.tgt === f) far++; if (e.px.tgt === A) back++; } });
    const d11 = cb(f, H), dk = [K, O].map(e => cb(e, H)); let again = 0; const s6 = spot(6); f.i = f.fi = s6[0]; f.j = f.fj = s6[1]; f.x = f.i + .5; f.z = f.j + .5; f.t = 1;
    run(1.5, () => { fr(); pin(B, 9); H.target = A; for (const e of [K, O]) if (e.px.tgt === f) again++; }); F.pb.pri(false); f.gone = true; H.target = null; return { d11, far, back, dk, again };`);
  console.log('③b', JSON.stringify(r3b)); ok(r3b.d11 === 11 && r3b.far === 0 && r3b.back > 0, '③ 적 봇이 11칸으로 멀어지면 안 쫓고 돌아와 사냥 재개'); ok(r3b.dk.every(d => d <= 5), `③ 파티장 곁으로 돌아옴 (${r3b.dk}칸)`); ok(r3b.again > 0, '③ 적 봇이 다시 6칸으로 오면 또 공격');
  // ④ 저장 (pbDump → JSON → pbLoad)
  const r4 = await ev(`F.pb.st(${U.w}, 'zzol', null, true); F.pb.st(${U.k}, 'near', 8, true); F.pb.st(${U.o}, 'focus', null, true); F.pb.pri(true); const d = JSON.parse(JSON.stringify(F.pbDump())); F.pbLoad(d); F.sim(0.3);
    const a = [${U.w}, ${U.k}, ${U.o}].map(u => F.pb.stOf(u)), pri = F.pb.S.pri, n = F.pb.here().length; const old = JSON.parse(JSON.stringify(d)); old.m = old.m.map(r => r.slice(0, 5).map((v, k) => k === 1 ? 'focus' : v)); delete old.pri; F.pbLoad(old); const b0 = [${U.w}, ${U.k}, ${U.o}].map(u => F.pb.stOf(u)), pri0 = F.pb.S.pri;
    const bad = JSON.parse(JSON.stringify(d)); bad.m = bad.m.map(r => { r[1] = r[0] === ${U.k} ? 'zzol' : 'weird'; r[5] = 99; return r; }); F.pbLoad(bad); const c = [${U.w}, ${U.k}, ${U.o}].map(u => F.pb.stOf(u));
    F.pbLoad(d); F.sim(0.3); F.pb.pri(false); return { row: d.m.map(r => r.slice(0, 2).concat(r[5])), dpri: d.pri, a, pri, n, b0, pri0, c };`);
  console.log('④', JSON.stringify(r4)); ok(r4.a[0].st === 'zzol' && r4.a[1].st === 'near' && r4.a[1].n === 8 && r4.a[2].st === 'focus' && r4.pri === true && r4.n === 3, '④ 새로고침·자동 업데이트 뒤에도 쫄법사·근처 각개 8칸·일점사·전투 우선 그대로');
  ok(r4.b0.every(s => s.st === 'focus' && s.n === 6) && r4.pri0 === false, '④ 옛 저장(스타일 칸 없음) = 일점사 · 6칸 · 전투 우선 끔'); ok(r4.c[0].st === 'focus' && r4.c[1].st === 'focus' && r4.c[1].n === 10, '④ 잘못된 값: 모르는 스타일·기사 쫄법사 = 일점사 · 칸은 3~10');
  // ⑤ 툴팁 · 전투 우선 체크
  await ev(`F.pb.cmd('move'); F.pb.box(); return 0;`); await p.waitForTimeout(400);
  const tipOf = () => p.evaluate(() => { const m = document.getElementById('pmenu'); return { vis: !m.hidden, t: m.innerText.replace(/\s+/g, ' '), on: [...m.querySelectorAll('button.on')].map(b => b.dataset.st), z: (m.querySelector('[data-st="zzol"]') || {}).disabled, nv: (m.querySelector('.pm-nv') || {}).textContent, bd: (() => { const q = m.querySelector('button.on'); return q ? getComputedStyle(q).borderTopColor : ''; })() }; });
  await p.click(`#partybox .pb-m.pbot[data-pbu="${U.w}"] .pb-t`); await p.waitForTimeout(300); const t5w = await tipOf();
  await p.screenshot({ path: 'dev/out/botparty2_tip_wiz.png', clip: { x: 0, y: 40, width: 520, height: 460 } });
  await p.click('#pmenu [data-a="x"]'); await p.waitForTimeout(200);
  const l5 = await p.evaluate(() => performance.now()); await p.click(`#partybox .pb-m.pbot[data-pbu="${U.k}"] .pb-t`); await p.waitForTimeout(300); const t5k = await tipOf();
  await p.click('#pmenu [data-a="n+"]'); await p.waitForTimeout(120); await p.click('#pmenu [data-a="n+"]'); await p.waitForTimeout(120); const t5n = await tipOf(); await p.waitForTimeout(900);
  await p.screenshot({ path: 'dev/out/botparty2_tip_knight.png', clip: { x: 0, y: 40, width: 520, height: 460 } });
  await p.click('#pmenu [data-a="st"][data-st="focus"]'); await p.waitForTimeout(200);
  const r5 = await ev(`const L = T.log.filter(l => l.at >= arg).map(l => l.t).filter(t => /^\\[혈맹 파티\\]/.test(t)); return { k: F.pb.stOf(${U.k}), L, vis: !document.getElementById('pmenu').hidden };`, l5);
  console.log('⑤', JSON.stringify(t5w), JSON.stringify(t5k), JSON.stringify(t5n), JSON.stringify(r5));
  ok(t5w.vis && /① 일점사/.test(t5w.t) && /② 근처 각개 사냥/.test(t5w.t) && /③ 쫄법사/.test(t5w.t) && /④ 파티 추방/.test(t5w.t) && !/다음 단계/.test(t5w.t), '⑤ 툴팁: ① 일점사 · ② 근처 각개 · ③ 쫄법사 · ④ 파티 추방 ("다음 단계" 안내 없음)');
  ok(t5w.on.join() === 'zzol' && !t5w.z && /✓/.test(t5w.t), `⑤ 법사 봇: 지금 고른 ③ 쫄법사에 테두리 (${t5w.bd})`); ok(t5k.on.join() === 'near' && t5k.z === true && /법사 봇만/.test(t5k.t) && t5k.nv === '8칸', '⑤ 기사 봇: ② 근처 각개 8칸에 테두리 · ③ 쫄법사는 막힘 (법사 봇만)');
  ok(t5n.vis && t5n.nv === '10칸' && t5n.on.join() === 'near', '⑤ + 두 번 → 10칸 (툴팁은 그대로 열려 있음)');
  ok(r5.k.st === 'focus' && !r5.vis && r5.L.filter(t => /근처 각개 사냥 10칸/.test(t)).length === 1 && r5.L.some(t => /① 일점사/.test(t)), `⑤ 채팅: 칸 바꿈은 한 줄 (${r5.L[0]}) · ① 일점사 고름 (${r5.L[r5.L.length - 1]})`);
  const pri0 = await p.evaluate(() => ({ s: __FB.pb.S.pri, c: document.querySelector('#partybox .pb-pri input').checked })); await p.click('#partybox .pb-pri'); await p.waitForTimeout(500);
  const pri1 = await p.evaluate(() => ({ s: __FB.pb.S.pri, c: document.querySelector('#partybox .pb-pri input').checked, on: document.querySelector('#partybox .pb-pri').classList.contains('on') }));
  const bx = await p.evaluate(() => { const r = document.getElementById('partybox').getBoundingClientRect(); return { x: Math.max(0, r.left - 4), y: Math.max(0, r.top - 4), width: r.width + 8, height: r.height + 8 }; }); await p.screenshot({ path: 'dev/out/botparty2_box.png', clip: bx });
  await p.click('#partybox .pb-pri'); await p.waitForTimeout(500); const pri2 = await p.evaluate(() => ({ s: __FB.pb.S.pri, c: document.querySelector('#partybox .pb-pri input').checked }));
  console.log('⑤ pri', JSON.stringify(pri0), JSON.stringify(pri1), JSON.stringify(pri2)); ok(!pri0.s && !pri0.c && pri1.s && pri1.c && pri1.on && !pri2.s && !pri2.c, '⑤ 파티창 맨 끝 [전투 우선] 체크 → 켬 · 다시 누르면 끔 (체크 표시가 상태와 같음)');
  await p.setViewportSize({ width: 390, height: 760 }); await p.waitForTimeout(500); await p.click(`#partybox .pb-m.pbot[data-pbu="${U.w}"] .pb-t`); await p.waitForTimeout(300);
  const fit = await p.evaluate(() => { const m = document.getElementById('pmenu').getBoundingClientRect(), b = document.getElementById('partybox').getBoundingClientRect(); return { m: [m.left, m.right, m.top, m.bottom].map(Math.round), b: [b.left, b.right].map(Math.round), W: innerWidth, H: innerHeight, sx: document.documentElement.scrollWidth }; });
  await p.screenshot({ path: 'dev/out/botparty2_mobile.png' }); console.log('⑤ mobile', JSON.stringify(fit)); ok(fit.m[0] >= 0 && fit.m[1] <= fit.W && fit.m[3] <= fit.H && fit.sx <= fit.W, '⑤ 휴대폰 폭(390)에서도 툴팁이 화면 안');
  console.log(errs.slice(0, 5).join('\n') || 'no errors'); ok(!errs.length, '오류 없음');
  console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
