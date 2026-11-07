// 11/7 프로듀서: 캐릭터 자동사냥 · 소환수·펫 · 혈맹 파티 봇의 사냥 순서
//   1순위 내 사거리 안에서 나(소환수·펫·파티 봇은 주인·파티장 포함)를 때리는 몹 (가까운 몹 → HP 적은 몹 · 잡던 몹이 사거리 안이면 죽을 때까지)
//   2순위 잡던 몹이 사거리를 벗어나 못 치면 → 사거리 안에서 나를 때리는 다른 몹 (없으면 다가가고 1.5초 막히면 다시 고름)
//   3순위 사거리 안에 그런 몹이 없으면 → 멀리서 나를 때리는 몹 (소환수·펫·파티 봇은 주인·파티장이 치는 대상도)
//   영상(아덴감옥 · 마법사 + 혼 켈베로스 3마리): 마법사가 멀리 있는 몹을 치는데 소환수가 곁에 붙어 있음
//     → 어두운 던전은 시야가 7.5칸 원이라, 대각선 6칸(7.8칸) 몹은 '안 보이는 몹'으로 버렸음 (11/7 고치기 전 origin/main에서 ②-1·②-2 FAIL 재현)
//   ① 캐릭터(기사) ② 마법사 + 소환수(아덴감옥) ③ 펫 ④ 혈맹 파티 봇(일점사 · 아덴감옥 시야 밖 파티장 대상) ⑤ 오류 없음
//   python3 dev/mkkt.py && KT_PORT=8911 bash dev/runkt.sh dev/tests/tgtorder.js   (한 부분만: TGO_ONLY=hero,sum,pet,pb)
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
const toZone = async (p, z) => { await p.evaluate(z => __T.TOWN.toZone(z), z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', z, { timeout: 60000 }); await p.waitForTimeout(1500); };
const ONLY = process.env.TGO_ONLY || '', want = k => !ONLY || ONLY.split(',').includes(k);
// 페이지 안 공통 도구: 몹 자리 놓기 · 얼리기(스턴 · HP 큼) · 다른 몹 치우기 · 열린 자리 찾기 · 어두운 던전 시야 밖 자리 찾기
const TOOLS = () => { const T = __T, W = T.walkable_; window.__tg = {
  put: (f, i, j) => { f.i = f.fi = i; f.j = f.fj = j; f.x = i + 0.5; f.z = j + 0.5; f.t = 1; },
  freeze: f => { f.stunT = 99; f.hp = f.max = 1e6; f.aggro = false; f.tgt = null; f.hitMeT = 0; f.myDmg = 0; f.dmgBy = null; f._skipT = 0; },
  mobs: n => T.foxes.filter(f => !f.dead && !f.gone && T.MOB[f.kind] && !T.MOB[f.kind].boss && !T.MOB[f.kind].midb && !T.MOB[f.kind].dummy && !f.fb).slice(0, n),
  hide: L => { for (const f of T.foxes) if (!L.includes(f) && !f.fb && !f.isPet) f.gone = true; },
  open: (i, j, r) => { for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (!W(i + di, j + dj)) return false; return true; },
  line: (a, b) => { const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); for (let k = 0; k <= n; k++) if (!W(Math.round(a[0] + (b[0] - a[0]) * k / n), Math.round(a[1] + (b[1] - a[1]) * k / n))) return false; return true; },
  // 마법사 자리 h와 몹 자리 m: 대각선 (5,6) — 체비 6칸(마법 사거리 안) · 거리 7.8칸(어두운 던전 시야 7.5칸 밖) · 사이가 모두 걸을 수 있는 칸
  darkSpot: () => { const G = __tg, N = T.ISLE.N || 200; for (let j = 8; j < N - 8; j++) for (let i = 8; i < N - 8; i++) { if (!G.open(i, j, 1)) continue; for (const [a, c] of [[-5, -6], [-6, -5], [5, 6], [6, 5]]) { const m = [i + a, j + c]; if (G.open(m[0], m[1], 1) && G.line([i, j], m) && G.line([i + 1, j], [m[0] + 1, m[1]]) && G.line([i, j + 1], [m[0], m[1] + 1])) return { h: [i, j], m }; } } return null; },
  openSpot: r => { const G = __tg, H = T.hero; for (let d = 0; d < 40; d++) for (let dj = -d; dj <= d; dj++) for (let di = -d; di <= d; di++) { if (Math.max(Math.abs(di), Math.abs(dj)) !== d) continue; if (G.open(H.i + di, H.j + dj, r)) return [H.i + di, H.j + dj]; } return null; },
  cheb: (a, b) => Math.max(Math.abs(a.i - b.i), Math.abs(a.j - b.j)) }; };
(async () => { const b = await chromium.launch(); const errs = [];
  const page = async (cls, name, lv) => { const p = await b.newPage({ viewport: { width: 1100, height: 680 } }); p.on('pageerror', e => errs.push(name + ': ' + e.message)); await login(p, { cls, name });
    await p.evaluate(lv => { document.getElementById('gp-lv').value = lv; document.getElementById('gp-apply').click(); __T.GOD_INV = true; __T.hero.lv = lv; }, lv); return p; };

  // ① 캐릭터 자동사냥 (기사 · 사거리 1칸)
  if (want('hero')) { const p = await page('knight', 'tgh', 40); await toZone(p, 2); await p.evaluate(TOOLS);
    const r = await p.evaluate(async () => { const T = __T, H = T.hero, A = T.AUTO, G = __tg, w = ms => new Promise(r => setTimeout(r, ms));
      const sp = G.openSpot(3); if (!sp) return { err: 'no open spot' }; T.TOWN.placeAt(sp[0] + 0.5, sp[1] + 0.5); await w(200);
      A.setCfg({ loot: false, retHp: 0, lowPot: false, sell: false, aggrFirst: true, counter: false }); if (!A.on()) A.toggle();
      const L = G.mobs(5); if (L.length < 5) return { err: 'mobs ' + L.length }; G.hide(L); const [Aa, D, B2, Fr, E] = L;
      const nm = f => f === Aa ? 'A(옆·나를 침·HP 80%)' : f === D ? 'D(옆·나를 침·HP 30%)' : f === B2 ? 'B(옆·안 침)' : f === Fr ? 'F(3칸·멀리서 나를 침)' : f === E ? 'E' : String(f && f.kind);
      const clr = () => { for (const f of L) { G.freeze(f); f.dead = false; } const S_ = A.swap(); if (S_.reset) S_.reset(); },   /* 걸어가지 않는 테스트 캐릭터: 장면 사이 '막힘' 시간 지움 */ onMe = f => { f.aggro = true; f.tgt = H; f.hitMeT = T.time; };
      const run = s => { for (let k = 0; k < Math.round(s / 0.05); k++) { H.atk = null; A.tick(0.05); for (const f of L) if (f.tgt === H && f.aggro && !f.dead) f.hitMeT = T.time; } };
      const i0 = H.i, j0 = H.j, out = {};
      const place = () => { G.put(Aa, i0 + 1, j0); G.put(D, i0 - 1, j0); G.put(B2, i0, j0 + 1); G.put(Fr, i0, j0 - 3); G.put(E, i0 + 3, j0 + 3); };
      // ①-1 대상 없음: 옆에서 나를 치는 A·D (HP 적은 D 먼저) · 옆의 안 치는 B · 3칸 밖에서 나를 치는 F
      clr(); place(); onMe(Aa); onMe(D); onMe(Fr); Aa.hp = 0.8e6; D.hp = 0.3e6; H.target = null; run(0.3); out.p1 = nm(H.target);
      // ①-2 잡던 D가 사거리 밖(2칸)으로 벗어남 · 아직 나를 침 → 사거리 안에서 나를 치는 A로
      D.myDmg = 30; H.target = D; G.put(D, i0 - 2, j0); run(1); out.p2 = nm(H.target);
      // ①-3 잡던 A가 사거리 안 → 다른 몹(D가 다시 옆 · HP 더 적음)이 쳐도 그대로
      Aa.myDmg = 30; H.target = Aa; G.put(D, i0 - 1, j0); D.hp = 0.1e6; run(2); out.p3 = nm(H.target);
      // ①-4 옆에서 치던 A·D를 다 잡음 → 멀리서 나를 치는 F (옆의 안 치는 B보다 먼저)
      Aa.dead = true; D.dead = true; H.target = null; run(0.3); out.p4 = nm(H.target);
      for (const f of L) { f.stunT = 0; } A.toggle(); return out; });
    console.log('①', JSON.stringify(r));
    ok(r.p1 === 'D(옆·나를 침·HP 30%)', `①-1 사거리 안에서 나를 치는 몹 먼저 · 같은 거리면 HP 적은 몹 (${r.p1})`);
    ok(r.p2 === 'A(옆·나를 침·HP 80%)', `①-2 잡던 몹이 사거리 밖으로 벗어나면 사거리 안에서 나를 치는 다른 몹 (${r.p2})`);
    ok(r.p3 === 'A(옆·나를 침·HP 80%)', `①-3 잡던 몹이 사거리 안이면 죽을 때까지 그대로 (${r.p3})`);
    ok(r.p4 === 'F(3칸·멀리서 나를 침)', `①-4 사거리 안 공격자를 다 잡으면 멀리서 나를 치는 몹 (${r.p4})`);
    await p.close(); }

  // ② 마법사 + 소환수 (아덴감옥 1층 · 어두운 던전 — 영상 상황)
  if (want('sum')) { const p = await page('wizard', 'tgs', 60); await toZone(p, 26); await p.evaluate(TOOLS);
    const r = await p.evaluate(async (process_dbg) => { const T = __T, H = T.hero, G = __tg, W = T.walkable_, w = ms => new Promise(r => setTimeout(r, ms));
      const spot = G.darkSpot(); if (!spot) return { err: 'no spot' };
      T.TOWN.placeAt(spot.h[0] + 0.5, spot.h[1] + 0.5); await w(300); if (H.i !== spot.h[0] || H.j !== spot.h[1]) return { err: 'place ' + H.i + ',' + H.j };
      const cast = async () => { T.PET.sumClear('quiet'); T.PET.sumCast(3); await w(300); return T.PETS_HERE_().filter(q => q.sum && !q.dead); };
      let S = await cast(); if (!S.length) return { err: 'no summon' };
      const L = G.mobs(2); if (L.length < 2) return { err: 'mobs ' + L.length }; G.hide(L); const [M, Nb] = L;
      const dS = f => Math.min(...S.map(q => G.cheb(q, f)));
      for (const f of L) G.freeze(f); G.put(M, spot.m[0], spot.m[1]); G.put(Nb, spot.h[0] + 40, spot.h[1] + 40);
      const out = { seen: T.DN.seen(M.i, M.j), hyp: +Math.hypot(M.i - H.i, M.j - H.j).toFixed(2), n: S.length };
      // ②-1 마법사가 멀리 있는 M(시야 밖)을 침 · 가까이에 공격자 없음 → 소환수가 M에게 가서 침
      M.myDmg = 30; M.aggro = true; M.tgt = H; for (let k = 0; k < 40; k++) { H.target = M; await w(100); }
      out.a = { d: dS(M), tg: S.filter(q => q.target === M).length };
      // ②-2 소환수를 다시 곁에 부름 → 마법사 옆에서 마법사를 치는 Nb가 있으면 Nb 먼저 (주인 대상 M보다)
      H.target = null; M.myDmg = 0; M.aggro = false; M.tgt = null; S = await cast(); const sp = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].map(([a, c]) => [H.i + a, H.j + c]).find(([i, j]) => W(i, j) && !S.some(q => q.i === i && q.j === j));
      G.put(Nb, sp[0], sp[1]); Nb.aggro = true; Nb.tgt = H; Nb.hitMeT = T.time; M.myDmg = 30; M.aggro = true; M.tgt = H;
      const trace = []; for (let k = 0; k < 25; k++) { H.target = M; Nb.hitMeT = T.time; await w(100); if (process_dbg && k % 5 === 0) trace.push({ h: [H.i, H.j], nb: [Nb.i - H.i, Nb.j - H.j, Nb.aggro, !!Nb.tgt, Nb.dead, Nb.gone], s: S.map(q => [q.i - H.i, q.j - H.j, q.target === Nb ? 'N' : q.target === M ? 'M' : q.target ? 'x' : '-', q.d.mode]) }); } if (process_dbg) out.trace = trace;
      out.b = { nb: S.filter(q => q.target === Nb).length, m: S.filter(q => q.target === M).length, mBlk: S.filter(q => q.target === M && q.skipF === Nb).length, dNb: dS(Nb) };   // mBlk: Nb 옆자리가 막혀 1.5초 못 다가간 소환수는 2순위 규칙대로 Nb를 빼고 주인 대상으로 (좁은 감옥 통로)
      // ②-3 Nb를 잡으면(옆 공격자 없음) → 다시 주인 대상 M으로
      Nb.dead = true; for (let k = 0; k < 40; k++) { H.target = M; await w(100); } out.c = { d: dS(M), tg: S.filter(q => q.target === M).length };
      H.target = null; for (const f of L) f.stunT = 0; T.PET.sumClear('quiet'); return out; }, !!process.env.TGO_DBG);
    console.log('②', JSON.stringify(r));
    ok(r.a && r.a.d <= 1 && r.a.tg >= 1, `②-1 마법사가 멀리 있는 몹(어두운 던전 시야 밖 ${r.hyp}칸 · seen=${r.seen})을 치면 소환수가 쫓아가서 침 (가장 가까운 소환수 ${r.a && r.a.d}칸 · ${r.a && r.a.tg}/${r.n}마리)`);
    ok(r.b && r.b.nb >= 1 && r.b.m === r.b.mBlk, `②-2 마법사 옆에서 마법사를 치는 몹이 있으면 그 몹 먼저 (그 몹 ${r.b && r.b.nb}마리 · 주인 대상 ${r.b && r.b.m}마리 — 그중 옆자리가 막혀 넘어간 ${r.b && r.b.mBlk}마리)`);
    ok(r.c && r.c.d <= 1 && r.c.tg >= 1, `②-3 그 몹을 잡으면 다시 주인 대상으로 (${r.c && r.c.d}칸 · ${r.c && r.c.tg}마리)`);
    await p.close(); }

  // ③ 펫 (기사 + 도베르만 · 공격 모드)
  if (want('pet')) { const p = await page('knight', 'tgp', 45); await toZone(p, 2); await p.evaluate(TOOLS);
    const r = await p.evaluate(async () => { const T = __T, H = T.hero, G = __tg, w = ms => new Promise(r => setTimeout(r, ms));
      const sp = G.openSpot(4); if (!sp) return { err: 'no open spot' }; T.TOWN.placeAt(sp[0] + 0.5, sp[1] + 0.5); await w(200);
      const e = { id: 'pet_collar', n: 1, pet: Object.assign(T.mkPetData('doberman', 30), { name: '바둑' }) }; T.INV.bag().push(e); T.PET.summon(e); await w(400);
      const P = T.PETS_HERE_().find(q => !q.sum && q.d.name === '바둑'); if (!P) return { err: 'no pet' };
      const L = G.mobs(2); if (L.length < 2) return { err: 'mobs ' + L.length }; G.hide(L); const [M, Nb] = L; for (const f of L) G.freeze(f);
      G.put(M, H.i + 4, H.j + 4); G.put(Nb, H.i - 30, H.j - 30); const out = {};
      // ③-1 주인이 4칸 밖 M을 침(때림) · 가까이에 공격자 없음 → 펫이 M에게 가서 침
      M.myDmg = 30; M.aggro = true; M.tgt = H; for (let k = 0; k < 30; k++) { H.target = M; await w(100); } out.a = { d: G.cheb(P, M), tg: P.target === M };
      // ③-2 펫을 주인 곁으로 · 펫 옆에서 펫을 치는 Nb → Nb 먼저 (주인 대상 M보다)
      P.i = P.fi = H.i - 1; P.j = P.fj = H.j; P.x = P.i + 0.5; P.z = P.j + 0.5; P.t = 1; P.target = null; G.put(Nb, P.i - 1, P.j); Nb.aggro = true; Nb.tgt = P;
      for (let k = 0; k < 15; k++) { H.target = M; await w(100); } out.b = { nb: P.target === Nb, d: G.cheb(P, Nb), hit: Nb.hp < Nb.max };
      // ③-3 '공격 대기' 모드는 그대로 (아무도 안 침)
      T.PET.setMode(e, 'wait'); await w(300); out.c = { tg: P.target ? 'set' : null }; T.PET.setMode(e, 'attack');
      H.target = null; for (const f of L) f.stunT = 0; T.PET.store(e); return out; });
    console.log('③', JSON.stringify(r));
    ok(r.a && r.a.d <= 1 && r.a.tg, `③-1 주인이 멀리 있는 몹을 치면 펫이 쫓아가서 침 (${r.a && r.a.d}칸)`);
    ok(r.b && r.b.nb && r.b.d <= 1, `③-2 펫 옆에서 펫을 치는 몹 먼저 (${JSON.stringify(r.b)})`);
    ok(r.c && r.c.tg === null, '③-3 공격 대기 모드는 그대로 (공격 안 함)');
    await p.close(); }

  // ④ 혈맹 파티 봇 (일점사)
  if (want('pb')) { const p = await page('knight', 'tgb', 61); await toZone(p, 2); await p.evaluate(TOOLS);
    const r = await p.evaluate(async () => { const T = __T, F = __FB, H = T.hero, G = __tg, w = ms => new Promise(r => setTimeout(r, ms));
      const sp = G.openSpot(3); if (!sp) return { err: 'no open spot' }; T.TOWN.placeAt(sp[0] + 0.5, sp[1] + 0.5); await w(200);
      F.setRef && F.setRef({ copy: F.mine() }); const x = F.roster().A.find(q => !q.pt && !F.pb.why(q.uid)); F.pb.invite(x.uid); await w(800); F.pb.cmd('fight'); const e = F.pb.here()[0]; if (!e) return { err: 'no bot' };
      const st = F.pb.stOf(e.uid); const L = G.mobs(3); if (L.length < 3) return { err: 'mobs ' + L.length }; G.hide(L); const [M, Nb, N2] = L; for (const f of L) G.freeze(f);
      G.put(e, H.i - 1, H.j); e.hitBy = null; e.hitByT = -99; G.put(M, H.i + 4, H.j + 4); G.put(Nb, H.i - 2, H.j); G.put(N2, H.i - 2, H.j + 1);
      const nm = f => f === M ? 'M(파티장 대상)' : f === Nb ? 'Nb' : f === N2 ? 'N2' : f ? String(f.kind) : null, X = e.px, out = { cls: e.bot.cls, st: st && st.st };
      M.myDmg = 30; M.aggro = true; M.tgt = H; H.target = M;
      // ④-1 봇 사거리 안(옆)에서 파티장을 치는 Nb → 일점사여도 Nb 먼저
      Nb.aggro = true; Nb.tgt = H; Nb.hitMeT = T.time; X.tgt = null; out.a = nm(F.pb.choose(e));
      // ④-2 Nb를 치는 중(사거리 안) · N2가 봇을 침(HP 더 적음) → Nb 그대로 (죽을 때까지)
      X.tgt = Nb; N2.aggro = true; N2.tgt = e; e.hitBy = N2; e.hitByT = T.time; N2.hp = 0.2e6; out.b = nm(F.pb.choose(e));
      // ④-3 Nb를 잡음 → 봇을 치는 N2 (사거리 안)
      Nb.dead = true; out.c = nm(F.pb.choose(e));
      // ④-4 사거리 안 공격자가 없음 → 파티장 대상 M
      N2.dead = true; e.hitBy = null; out.d = nm(F.pb.choose(e));
      // ④-5 실제로 돌려 봄 (F.sim) — 사거리 안 공격자 없으면 파티장 대상을 침
      X.tgt = null; F.sim(3); out.e = { tg: nm(X.tgt), d: G.cheb(e, M) };
      return out; });
    console.log('④', JSON.stringify(r));
    ok(r.a === 'Nb', `④-1 일점사여도 봇 사거리 안에서 파티장을 치는 몹 먼저 (${r.a} · ${r.cls} ${r.st})`);
    ok(r.b === 'Nb', `④-2 치던 몹이 사거리 안이면 그대로 (${r.b})`);
    ok(r.c === 'N2', `④-3 그다음 사거리 안에서 봇을 치는 몹 (${r.c})`);
    ok(r.d === 'M(파티장 대상)' && r.e && r.e.tg === 'M(파티장 대상)', `④-4 사거리 안 공격자가 없으면 파티장 대상 (${r.d} · 돌려 보면 ${JSON.stringify(r.e)})`);
    // ④-6 아덴감옥(어두운 던전): 파티장이 시야 밖(7.8칸) 몹을 치면 봇도 같이 침
    await toZone(p, 26); await p.evaluate(TOOLS);
    const r2 = await p.evaluate(async () => { const T = __T, F = __FB, H = T.hero, G = __tg, w = ms => new Promise(r => setTimeout(r, ms));
      const spot = G.darkSpot(); if (!spot) return { err: 'no spot' }; T.TOWN.placeAt(spot.h[0] + 0.5, spot.h[1] + 0.5); await w(300); F.sim(0.3);
      const e = F.pb.here()[0]; if (!e) return { err: 'no bot here' }; const L = G.mobs(1); if (!L.length) return { err: 'mobs' }; G.hide(L); const M = L[0]; G.freeze(M); G.put(M, spot.m[0], spot.m[1]);
      G.put(e, H.i + (spot.m[0] > H.i ? -1 : 1), H.j); M.myDmg = 30; M.aggro = true; M.tgt = H; H.target = M; e.px.tgt = null;
      const c = F.pb.choose(e); return { seen: T.DN.seen(M.i, M.j), tg: c === M }; });
    console.log('④-6', JSON.stringify(r2));
    ok(r2.tg && r2.seen === false, `④-6 어두운 던전에서 파티장이 시야 밖 몹을 치면 봇도 그 몹 (seen=${r2.seen})`);
    await p.close(); }
  ok(!errs.length, '⑤ 오류 없음 ' + errs.slice(0, 3).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
