// 11/1 필드 봇 2단계 ① 전투를 사람처럼 (KT_PORT=8781 bash dev/runkt.sh dev/tests/fieldbot2.js)
// ① 2구역에만 봇 (1구역 없음 · /혈맹도 같은 목록) ② 기사: 버프 유지 · 스턴(대인전 규칙) ③ 법사: 콘·이럽·선버·디스 25%씩 ④ 물약 3종·먹는 HP% 봇마다 다름
// ⑤ HP가 없을 때 50% 귀환(사라졌다 다시) · 50% 끝까지(도망 안 감) ⑥ 봇과 싸우는 몹도 기술 ⑦ 멘트(말풍선·채팅 · 봇마다 30초 · 지역마다 8초) ⑧ 봇 혼자 잡은 몹 드랍 → 그 봇이 주움 · 유저는 못 주움
// ⑨ 두 탭: 게스트도 버프·스턴·마법·물약·귀환·멘트를 봄 ⑩ 오류 없음
const { chromium } = require('playwright'); const login = require('../tq.js');
const REF = { lv: 55, fb: { lv: 55, c: 'knight', hp: 900, ac: -60, mr: 40, d: 45, cp: 5000 } };
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); };
const SEC2 = [2, 4, 6, 8, 10, 12, 17, 23], SEC1 = [1, 3, 5, 7, 9, 11, 16, 22];
const BAD = /ㅅㅂ|시발|씨발|병신|븅신|느금|니애미|엠창|좆|존나|개새|새끼|미친놈|닥쳐|꺼져|장애|한남|김치녀/;
(async () => { const b = await chromium.launch(); const errs = [];
  const ctx1 = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx1.newPage(); p.on('pageerror', e => errs.push('P1: ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await login(p, { cls: 'knight', name: 'fb2One' });
  // ① 2구역만
  const z1 = await p.evaluate(R => { const F = __FB; F.setRef(R); const ids = F.zones().map(z => z.id).sort((a, b) => a - b); const all = [];
    for (const lv of [10, 20, 30, 40, 50, 55, 60]) { const P = F.planAt(1793330000000, lv); for (const u in P.at) if (P.at[u]) all.push(P.at[u]); } return { ids, used: [...new Set(all)].sort((a, b) => a - b) }; }, REF);
  console.log('① zones', JSON.stringify(z1)); ok(JSON.stringify(z1.ids) === JSON.stringify(SEC2), '① 봇이 나오는 지역 = 각 사냥터 2구역 ' + z1.ids.join('·')); ok(z1.used.every(z => SEC2.includes(z)) && !z1.used.some(z => SEC1.includes(z)), '① 일과표(여러 기준 레벨)도 2구역만 ' + z1.used.join('·'));
  await p.evaluate(() => { __T.GOD_INV = true; __T.BUFF.invis = 9999; __T.TOWN.toZone(11); }); await p.waitForTimeout(4000);
  const s11 = await p.evaluate(() => ({ here: __FB.here(), n: __FB.bots().length })); ok(!s11.here && s11.n === 0, `① 1구역(11번)에는 봇 없음 (here ${s11.here} · ${s11.n}명)`);
  const Z = await p.evaluate(() => { const P = __FB.plan(), L = [12, 17, 23, 10].map(z => [z, P.cnt[z] || 0]).sort((a, b) => b[1] - a[1]); return { z: L[0][0], n: L[0][1] }; });
  await p.evaluate(z => __T.TOWN.toZone(z), Z.z); await p.waitForTimeout(5500);
  const s12 = await p.evaluate(() => ({ here: __FB.here(), n: __FB.bots().length })); ok(s12.here && s12.n === Math.min(Z.n, 8), `① 2구역(${Z.z}번)에는 봇 ${s12.n}명 (계획 ${Z.n})`);
  await p.evaluate(() => { const e = document.getElementById('chat-in'); e.value = '/혈맹'; __T.CHAT.send(); }); await p.waitForTimeout(300);
  const rep = await p.evaluate(() => __T.log.slice(-3).map(l => l.t).filter(t => /지금 사냥 중/.test(t))[0] || ''); console.log('① /혈맹', rep);
  ok(!!rep && !/1구역|1구간|1층/.test(rep), '① /혈맹 일정표도 2구역만');
  // ④ 물약 개수·먹는 HP%는 봇마다 다름 (방금 나온 봇들)
  const p4 = await p.evaluate(() => { __FB.sim(0.5); return __FB.bots().filter(f => f.bx).map(f => [Math.round(f.bx.potAt * 100), f.bx.potN]); }); console.log('④ potAt·potN', JSON.stringify(p4));
  ok(p4.length >= 4 && p4.every(([a, n]) => a >= 40 && a <= 65 && n >= 30 && n <= 80) && new Set(p4.map(x => x[0])).size >= Math.min(4, p4.length), '④ 봇마다 물약 먹는 HP%(40~65%)·물약 개수(30~80)가 다름');
  // ② 기사 버프 유지 (라인 기사 Lv55 · 사냥하며 400초)
  const r2 = await p.evaluate(() => { const F = __FB, H = __T.hero, R = F.roster(); F.DBG.noEnsure = true; for (const f of F.bots()) f.gone = true; const S = F.stat(); for (const k in S.buf) delete S.buf[k];
    const kb = R.B.filter(b => b.cls === 'knight').sort((a, b) => b.pct - a.pct)[0], f = F.spawnTest(kb.uid, H.i + 4, H.j + 4); f.max = f.hp = 1e6; const up = { reduction: 0, bounce: 0, solid: 0, counter: 0 }; let n = 0;
    F.sim(5); for (let s = 0; s < 400; s++) { F.sim(1); if (f.dead || f.gone) break; n++; for (const k in up) if (f.bx.bf[k] > __T.time) up[k]++; }
    const K = __TW.kit, m1 = (() => { const b0 = f.fbBf; f.fbBf = 0; const a = K.inDmg(f, 1000, 'magic'); f.fbBf = 1; const c = K.inDmg(f, 1000, 'magic'); f.fbBf = b0; return [a, c]; })();
    f.gone = true; return { lv: f.bot.st.lv, n, up, buf: Object.assign({}, S.buf), red: m1 }; });
  console.log('② buffs', JSON.stringify(r2)); ok(r2.n >= 300 && Object.values(r2.up).every(v => v >= r2.n * 0.95), `② 기사 Lv${r2.lv}: 리덕션·바운스·솔리드·카운터를 ${r2.n}초 동안 95% 넘게 유지 (${JSON.stringify(r2.up)})`);
  ok(r2.buf.reduction >= 3 && r2.buf.counter >= 3, `② 버프가 끝나면 다시 검 (리덕션 ${r2.buf.reduction}번 · 카운터 ${r2.buf.counter}번 · 3분·2분 지속)`); ok(Math.abs(r2.red[1] / r2.red[0] - 0.75) < 0.02, `② 리덕션 아머: 받는 피해 25% 감소 (${r2.red[0]} → ${r2.red[1]})`);
  // ② 스턴 (대인전 규칙): 성공 → 기절 중엔 안 겹침 → 풀려도 3초 면역 → 그 뒤 다시 걸림 (플레이어·봇 둘 다)
  const s2 = await p.evaluate(() => { const F = __FB, H = __T.hero, R = F.roster(), S = F.stat(); __T.GOD_INV = false; __T.BUFF.invis = 0; H.baseHP = 1e5; __T.INV.render(); H.hp = H.max;
    const kb = R.B.filter(b => b.cls === 'knight').sort((a, b) => b.pct - a.pct)[0], f = F.spawnTest(kb.uid, H.i + 1, H.j), ab = F.spawnTest(R.A.find(b => b.cls === 'elf').uid, f.i + 1, f.j + 1); F.sim(0.2); F.DBG.noAI = true;
    const force = fn => { const r = Math.random; Math.random = () => 0.01; try { fn(); } finally { Math.random = r; } }, snap = () => [S.stun, S.stunImm, S.stunMiss], L = [];
    force(() => F.stunTry(f, H)); const t1 = __T.BUFF.stun; L.push(['첫 스턴', t1.toFixed(1), snap()]);
    force(() => F.stunTry(f, H)); L.push(['기절 중', __T.BUFF.stun.toFixed(1), snap()]);
    __T.BUFF.stun = 0; force(() => F.stunTry(f, H)); L.push(['풀린 직후', __T.BUFF.stun, snap()]);
    F.sim(t1 + 3.2); force(() => F.stunTry(f, H)); L.push(['3초 뒤', __T.BUFF.stun.toFixed(1), snap()]); __T.BUFF.stun = 0;
    force(() => F.stunTry(f, ab)); const b1 = ab.stunT; force(() => F.stunTry(f, ab)); const b2 = S.stunImm; ab.stunT = 0; force(() => F.stunTry(f, ab)); const b3 = S.stunImm; F.sim(b1 + 3.3); ab.stunT = 0; force(() => F.stunTry(f, ab));
    L.push(['봇', b1.toFixed(1), b2, b3, ab.stunT.toFixed(1), snap()]); f.gone = true; ab.gone = true; F.DBG.noAI = false; return L; });
  console.log('② stun', JSON.stringify(s2)); const st = s2.map(x => x[x.length - 1]);
  ok(+s2[0][1] >= 1 && +s2[0][1] <= 4 && st[0][0] === 1, '② 스턴 성공: 1~4초 기절 (' + s2[0][1] + '초)');
  ok(st[1][1] === 1 && st[2][1] === 2 && +s2[2][1] === 0, '② 기절 중엔 안 겹치고 · 풀린 뒤 3초는 면역');
  ok(+s2[3][1] > 0 && st[3][0] === 2, '② 면역이 끝나면 다시 걸림'); ok(+s2[4][1] > 0 && s2[4][2] === st[3][1] + 1 && s2[4][3] === st[3][1] + 2 && +s2[4][4] > 0, '② 봇끼리도 같은 규칙 (기절 중·3초 면역)');
  // 스턴 성공률 = 유저와 같은 식 (레벨 차) — 같은 레벨 50%
  const s2r = await p.evaluate(() => { const F = __FB, H = __T.hero, R = F.roster(), S = F.stat(); const kb = R.B.filter(b => b.cls === 'knight').sort((a, b) => b.pct - a.pct)[0], f = F.spawnTest(kb.uid, H.i + 1, H.j); F.sim(0.2); F.DBG.noAI = true; H.lv = f.bot.st.lv; let ok = 0, n = 0;
    for (let k = 0; k < 400; k++) { const s0 = S.stun; __T.BUFF.stun = 0; F.sim(0.05); F.stunTry(f, H); n++; if (S.stun > s0) ok++; __T.BUFF.stun = 0; F.sim(7.5); }
    f.gone = true; F.DBG.noAI = false; H.lv = 1; return { n, ok, lv: f.bot.st.lv }; });
  console.log('② stun rate', JSON.stringify(s2r)); ok(Math.abs(s2r.ok / s2r.n - 0.5) < 0.08, `② 같은 레벨(${s2r.lv}) 스턴 성공률 ${(s2r.ok / s2r.n * 100).toFixed(0)}% (유저 식 50%)`);
  // ③ 법사 마법 섞기 (라인 법사 Lv55 vs 반왕 기사 · 300초) + ④ 물약 3종
  const r3 = await p.evaluate(() => { const F = __FB, H = __T.hero, R = F.roster(), S = F.stat(); __T.BUFF.invis = 9999; __T.GOD_INV = true; for (const k in S.sp) delete S.sp[k]; S.pot.fill(0);
    const wb = R.B.filter(b => b.cls === 'wizard').sort((a, b) => b.pct - a.pct)[0], kb = R.A.filter(b => b.cls === 'knight').sort((a, b) => b.pct - a.pct)[0], w = F.spawnTest(wb.uid, H.i + 6, H.j + 6), k = F.spawnTest(kb.uid, H.i + 8, H.j + 6);
    w.max = 3e4; k.max = 3e4; w.hp = k.hp = 1.1e4; F.sim(300);   /* HP를 낮게 시작 → 물약을 계속 마심 */ const sp = Object.assign({}, S.sp), lv = w.bot.st.lv; w.gone = true; k.gone = true; return { lv, sp, pot: S.pot.slice() }; });
  const tot3 = Object.values(r3.sp).reduce((a, x) => a + x, 0), sh = id => (r3.sp[id] || 0) / tot3; console.log('③ spells', JSON.stringify(r3), 'share', ['coc', 'eruption', 'sunburst', 'disint'].map(id => id + ' ' + (sh(id) * 100).toFixed(0) + '%').join(' · '));
  ok(['coc', 'eruption', 'sunburst', 'disint'].every(id => r3.sp[id] > 0) && ['coc', 'eruption', 'sunburst'].every(id => sh(id) > 0.12 && sh(id) < 0.45) && sh('disint') > 0.06 && sh('disint') <= 0.3, `③ 법사 Lv${r3.lv}: 콘·이럽·선버·디스 모두 씀 (${tot3}번 · 디스는 재사용 8초라 가끔)`);
  ok(tot3 <= 300 / 3 + 2, `③ 마법 공용 대기 3초 (300초에 ${tot3}번)`);
  ok(r3.pot.every(n => n > 0), `④ 물약 3종 모두 마심 (빨강 ${r3.pot[0]} · 주홍 ${r3.pot[1]} · 맑은 ${r3.pot[2]})`);
  // ⑤ HP가 없을 때: 물약이 없으면 50% 귀환 · 50% 끝까지
  const r5 = await p.evaluate(() => { const F = __FB, H = __T.hero, R = F.roster(); __T.BUFF.invis = 0; __T.GOD_INV = true; let ret = 0, die = 0, other = 0; const backs = [];
    for (let k = 0; k < 60; k++) { const bb = R.B[k % R.B.length], f = F.spawnTest(bb.uid, H.i + 1 + (k % 2), H.j + 1); if (!f) continue; F.sim(0.3); const X = f.bx; X.potN = 0; f.hp = Math.max(1, Math.round(f.max * 0.05)); X.lowT = 0; X.end = null; F.sim(0.8);
      if (f.gone && !f.dead) { ret++; backs.push(Math.round((F.away.get(bb.uid) - Date.now()) / 1000)); } else if (X.end === 'die') die++; else other++; f.gone = true; F.away.delete(bb.uid); }
    return { ret, die, other, backs: [Math.min(...backs), Math.max(...backs)] }; });
  console.log('⑤ low hp', JSON.stringify(r5)); ok(r5.ret + r5.die >= 55 && r5.ret / (r5.ret + r5.die) > 0.3 && r5.ret / (r5.ret + r5.die) < 0.7, `⑤ 물약 없이 위험하면 귀환 ${r5.ret} · 끝까지 ${r5.die} (50%씩)`);
  ok(r5.backs[0] >= 58 && r5.backs[1] <= 121, `⑤ 귀환한 봇은 ${r5.backs[0]}~${r5.backs[1]}초 뒤 다시 (1~2분)`);
  const r5b = await p.evaluate(() => { const F = __FB, H = __T.hero, R = F.roster(); const bb = R.B.filter(b => b.cls === 'knight')[1], f = F.spawnTest(bb.uid, H.i + 3, H.j); F.sim(0.3); const X = f.bx; X.potN = 0; X.end = 'die'; f.hp = Math.max(1, Math.round(f.max * 0.04)); const D = [];
    for (let k = 0; k < 16; k++) { F.sim(0.5); D.push(Math.max(Math.abs(f.i - H.i), Math.abs(f.j - H.j))); } const g = f.gone, dd = f.dead; f.gone = true; return { D, gone: g, dead: dd }; });
  console.log('⑤ last stand', JSON.stringify(r5b)); ok(!r5b.gone && r5b.D.slice(4).every(d => d <= 1), '⑤ 끝까지 싸우는 봇은 도망가지 않고 붙어서 싸움 (거리 ' + r5b.D.join(',') + ')');
  const r5c = await p.evaluate(() => { const F = __FB, P = F.plan(), zid = __T.ISLE.id, uid = +Object.keys(P.at).find(u => P.at[u] === zid); const f = F.bots().find(q => q.uid === uid) || F.spawnTest(uid, __T.hero.i + 2, __T.hero.j + 2);
    F.sim(0.3); F.recall(f); const gone = f.gone, away = F.away.get(uid) - Date.now(); F.away.set(uid, Date.now() - 1); F.DBG.noEnsure = false; F.sim(3); const back = F.bots().some(q => q.uid === uid && !q.dead); F.DBG.noEnsure = true; for (const q of F.bots()) q.gone = true; return { uid, gone, away: Math.round(away / 1000), back }; });
  console.log('⑤ recall', JSON.stringify(r5c)); ok(r5c.gone && r5c.back, `⑤ 귀환하면 사라졌다가 시간이 되면 다시 나타남 (${r5c.away}초 뒤)`);
  // ⑦ 멘트: 도배 방지 (봇마다 30초 · 지역마다 8초) · 금지어 없음 · 봇마다 말투 버릇
  const r7 = await p.evaluate(() => { const F = __FB, H = __T.hero, R = F.roster(), S = F.stat(); S.talk.length = 0; F.DBG.talkP = 1; __T.BUFF.invis = 0; __T.GOD_INV = true;
    const L = [...R.A.filter(b => b.cls === 'knight').slice(0, 3), ...R.B.slice(0, 4)].map((bb, k) => F.spawnTest(bb.uid, H.i + (k % 4) * 2 - 3, H.j + Math.floor(k / 4) * 3 + 2)).filter(Boolean);
    for (let k = 0; k < 480; k++) { F.sim(0.5); const f = L[Math.floor(Math.random() * L.length)]; if (f && !f.gone) F.talk(f, Object.keys(F.TALK)[k % 8]); }   // 0.5초마다 아무 봇에게 말을 시켜도 도배 방지로 걸러짐
    F.DBG.talkP = null; for (const f of L) f.gone = true; const T = S.talk.slice(), byBot = {}; let minBot = 1e9, minZone = 1e9;
    for (let k = 0; k < T.length; k++) { const [t, u] = T[k]; if (byBot[u] != null) minBot = Math.min(minBot, t - byBot[u]); byBot[u] = t; if (k) minZone = Math.min(minZone, t - T[k - 1][0]); }
    const all = Object.values(F.TALK).flat(), q = [...new Set(R.all.slice(0, 12).map(b => F.quirk(b.uid, '님 베르요')))];
    return { n: T.length, kinds: [...new Set(T.map(x => x[2]))], minBot, minZone, sample: T.slice(0, 10).map(x => x[3]), lines: all.length, bad: all.filter(t => /ㅅㅂ|시발|씨발|병신|느금|니애미|엠창|좆|존나|개새|새끼|닥쳐|꺼져/.test(t)), q }; });
  console.log('⑦ talk', JSON.stringify(r7)); ok(r7.n >= 20 && r7.minBot >= 30 && r7.minZone >= 8, `⑦ 240초 동안 0.5초마다 말을 시켜도 ${r7.n}번만 · 같은 봇 간격 최소 ${r7.minBot.toFixed(0)}초 (≥30) · 지역 간격 최소 ${r7.minZone.toFixed(1)}초 (≥8)`);
  ok(r7.lines >= 50 && r7.bad.length === 0 && !Object.values(await p.evaluate(() => __FB.TALK)).flat().some(t => BAD.test(t)), `⑦ 상황별 ${r7.lines}줄 · 욕설·패드립·혐오 표현 없음`); ok(r7.q.length >= 4, '⑦ 봇마다 말투 버릇 ' + JSON.stringify(r7.q));
  // ⑧ 줍기: 봇 혼자 잡은 몹 → 드랍 → 그 봇이 1~6초 안에 주움 · 유저는 못 주움 · 플레이어가 같이 때린 몹은 기존 규칙
  const r8 = await p.evaluate(() => { const F = __FB, H = __T.hero, R = F.roster(), S = F.stat(), MD = __T.MOB_DROPS, keep = {}; __T.BUFF.invis = 9999; for (const q of F.bots()) q.gone = true;
    const mobs = () => __T.foxes.filter(m => !m.fb && !m.dead && !m.gone && !__T.MOB[m.kind].boss && !__T.MOB[m.kind].midb);
    for (const m of mobs()) if (!(m.kind in keep)) { keep[m.kind] = MD[m.kind]; MD[m.kind] = [['orange_potion', 1]]; }
    const d0 = S.dropB, p0 = S.pick, m0 = S.mob; S.picks.length = 0; const kb = R.A.filter(b => b.cls === 'knight').sort((a, b) => b.pct - a.pct)[0], mm = mobs().filter(m => Math.hypot(m.x - H.x, m.z - H.z) > 8).sort((a, b) => Math.hypot(a.x - H.x, a.z - H.z) - Math.hypot(b.x - H.x, b.z - H.z))[0];
    const f = F.spawnTest(kb.uid, mm.i + 2, mm.j); f.max = f.hp = 5e4; for (let k = 0; k < 24; k++) { for (const m of mobs()) m.hp = Math.min(m.hp, 25); F.sim(5); }   // 몹을 약하게 해서 빨리 여러 마리
    const left = __T.GROUND.here().filter(d => String(d.owner).startsWith('fb:')).length; f.gone = true; for (const k in keep) { if (keep[k] === undefined) delete MD[k]; else MD[k] = keep[k]; }
    return { kills: S.mob - m0, drop: S.dropB - d0, pick: S.pick - p0, picks: S.picks.slice(), left }; });
  console.log('⑧ loot', JSON.stringify(r8)); ok(r8.drop >= 3 && r8.pick >= r8.drop - 1 && r8.left <= 1, `⑧ 봇 혼자 잡은 몹 드랍 ${r8.drop}개 → 그 봇이 ${r8.pick}개 주움`);
  ok(r8.picks.length && r8.picks.every(t => t >= 0.4 && t <= 6.6), '⑧ 잡은 뒤 1~6초 안에 주움 (' + r8.picks.slice(0, 12).join(',') + ')');
  const r8b = await p.evaluate(() => { const G = __T.GROUND, H = __T.hero, d = G.drop('red_potion', 1, H.i, H.j); d.owner = 'fb:' + __FB.roster().B[0].uid; d.until = performance.now() + 60000; const n0 = __T.INV.count('red_potion'); G.pick(d); const msg = __T.log.slice(-2).map(l => l.t).join(' / ');
    const still = G.here().includes(d), blocked = G.blocked(d); G.list().splice(G.list().indexOf(d), 1); return { still, blocked, got: __T.INV.count('red_potion') - n0, msg }; });
  console.log('⑧ player pick', JSON.stringify(r8b)); ok(r8b.still && r8b.blocked && r8b.got === 0 && /전리품/.test(r8b.msg), '⑧ 봇이 잡은 몹의 드랍은 유저가 못 주움 (자동사냥 줍기도 건너뜀)');
  const r8c = await p.evaluate(() => { const F = __FB, H = __T.hero, R = F.roster(), S = F.stat(), MD = __T.MOB_DROPS; __T.BUFF.invis = 9999; const kb = R.A.filter(b => b.cls === 'knight')[0];
    const m = __T.foxes.filter(q => !q.fb && !q.dead && !__T.MOB[q.kind].boss && !__T.MOB[q.kind].midb && Math.hypot(q.x - H.x, q.z - H.z) > 8).sort((a, b) => Math.hypot(a.x - H.x, a.z - H.z) - Math.hypot(b.x - H.x, b.z - H.z))[0], kk = m.kind, keep = MD[kk]; MD[kk] = [['clear_potion', 1]]; const f = F.spawnTest(kb.uid, m.i + 1, m.j); F.sim(0.3);
    m.hp = 1; m.aggro = true; m.tgt = f; m.dmgBy = new Map([[H, 3]]); f.bx.mob = m; const d0 = S.dropB, g0 = __T.GROUND.here().length, exp0 = H.exp; F.sim(6); if (keep === undefined) delete MD[kk]; else MD[kk] = keep;
    const items = __T.GROUND.here().slice(g0).filter(d => d.id === 'clear_potion'); f.gone = true; return { dead: m.dead, dropB: S.dropB - d0, items: items.map(d => d.owner || 'none'), exp: H.exp - exp0 }; });
  console.log('⑧ mixed', JSON.stringify(r8c)); ok(r8c.dead && r8c.dropB === 0 && r8c.items.length >= 1 && r8c.items.every(o => !String(o).startsWith('fb:')) && r8c.exp > 0, '⑧ 유저가 같이 때린 몹은 기존 규칙 (유저 보상·드랍 · 봇 소유 아님)');
  // ⑦ 실제 화면: 라인 봇이 플레이어를 보면 도발 멘트 (말풍선 + 채팅) · 스크린샷
  await p.evaluate(() => { const F = __FB, H = __T.hero, R = F.roster(); F.DBG.talkP = 1; __T.BUFF.invis = 0; __T.GOD_INV = true; for (const q of F.bots()) q.gone = true; const kb = R.B.filter(b => b.cls === 'knight').sort((a, b) => b.pct - a.pct)[2]; F.spawnTest(kb.uid, H.i + 3, H.j + 1);
    F.spawnTest(R.B.filter(b => b.cls === 'wizard').sort((a, b) => b.pct - a.pct)[1].uid, H.i - 3, H.j + 2); });
  await p.waitForTimeout(2600); await p.screenshot({ path: 'dev/out/fb2_taunt.png' });
  const r7b = await p.evaluate(() => ({ chat: __T.log.map(l => l.t).filter(t => /^\[라인\] /.test(t)).slice(-3), bub: __FB.bots().filter(f => f.fbChat && f.fbChat.until > __T.time).length })); console.log('⑦ live', JSON.stringify(r7b));
  ok(r7b.chat.length >= 1 && r7b.bub >= 1, '⑦ 라인 봇 도발: 말풍선 + 채팅 ' + JSON.stringify(r7b.chat)); await p.waitForTimeout(4500); await p.screenshot({ path: 'dev/out/fb2_fight.png' }); await p.evaluate(() => { __FB.DBG.talkP = null; for (const q of __FB.bots()) q.gone = true; });
  // ⑥ 봇과 싸우는 몹도 기술 (용의 계곡 2구역 드레이크 불 숨결) · 멀리 있는 나에게 '피했습니다' 알림 없음
  await p.evaluate(() => { __T.GOD_INV = true; __T.BUFF.invis = 9999; __T.TOWN.toZone(17); }); await p.waitForTimeout(4000);
  const r6 = await p.evaluate(() => { const F = __FB, H = __T.hero, R = F.roster(); F.DBG.noEnsure = true; for (const q of F.bots()) q.gone = true; const dk = __T.foxes.filter(m => m.kind === 'drake' && !m.dead).sort((a, b) => Math.hypot(b.x - H.x, b.z - H.z) - Math.hypot(a.x - H.x, a.z - H.z))[0];
    dk.max = dk.hp = 1e6; const kb = R.A.filter(b => b.cls === 'knight').sort((a, b) => b.pct - a.pct)[0], f = F.spawnTest(kb.uid, dk.i + 1, dk.j); f.max = f.hp = 1e5; dk.aggro = true; dk.tgt = f; return { far: Math.round(Math.hypot(dk.x - H.x, dk.z - H.z)), aoe0: F.stat().aoe, log0: __T.log.length }; });
  await p.waitForTimeout(16000);
  const r6b = await p.evaluate(o => { const F = __FB; return { aoe: F.stat().aoe - o.aoe0, miss: __T.log.slice(o.log0).map(l => l.t).filter(t => /피했습니다/.test(t)) }; }, r6);
  console.log('⑥ mob skill', JSON.stringify(r6), JSON.stringify(r6b)); ok(r6b.aoe >= 1, `⑥ 봇과 싸우는 드레이크가 불 숨결을 씀 → 봇이 범위에 ${r6b.aoe}번 맞음`); ok(r6b.miss.length === 0, `⑥ 멀리(${r6.far}칸) 있는 나에게 '피했습니다' 알림 없음`);
  await p.evaluate(() => { for (const q of __FB.bots()) q.gone = true; });
  await ctx1.close();   // 첫 탭은 닫음 (세 탭이 함께 돌면 느려서 게임 시간이 덜 흐름)
  // ⑨ 두 탭: 호스트가 계산한 버프·스턴·마법·물약·귀환·멘트를 게스트도 봄 · 게스트가 스턴에 걸림(대인전 규칙)
  const ctx = await b.newContext({ viewport: { width: 1100, height: 720 } }); const pg = []; for (const nm of ['fb2Host', 'fb2Gst']) { const q = await ctx.newPage(); q.on('pageerror', e => errs.push(nm + ': ' + e.message)); await login(q, { cls: nm === 'fb2Host' ? 'knight' : 'elf', name: nm, mp: true }); pg.push(q); }
  for (const q of pg) await q.evaluate(([R, z]) => { __FB.setRef(R); __T.GOD_INV = true; __T.BUFF.invis = 9999; __T.TOWN.toZone(z); }, [REF, Z.z]);
  await pg[0].waitForTimeout(2500); const hi = (await Promise.all(pg.map(q => q.evaluate(() => __FB.host())))).indexOf(true), H9 = pg[hi], G9 = pg[1 - hi]; ok(hi >= 0, '⑨ 호스트 1명');
  const hp = await H9.evaluate(() => [__T.hero.x, __T.hero.z]); await G9.evaluate(([x, z]) => { const H = __T.hero; __T.TOWN.placeAt(x + 2, z + 1); H.lv = 55; H.baseHP = 1e5; __T.INV.render(); H.hp = H.max; __T.GOD_INV = false; __T.BUFF.invis = 0; }, hp);
  await H9.waitForTimeout(1200);
  await H9.evaluate(() => { const F = __FB, R = F.roster(), H = __T.hero; F.DBG.noEnsure = true; F.DBG.talkP = 1; for (const q of F.bots()) q.gone = true; const o = __T.NET.others()[0], gi = Math.floor(o.pr.x), gj = Math.floor(o.pr.y);
    const k = F.spawnTest(R.B.filter(b => b.cls === 'knight').sort((a, b) => b.pct - a.pct)[0].uid, gi + 1, gj), w = F.spawnTest(R.B.filter(b => b.cls === 'wizard').sort((a, b) => b.pct - a.pct)[0].uid, gi - 3, gj + 2), a = F.spawnTest(R.A.filter(b => b.cls === 'knight')[0].uid, gi + 2, gj + 3);
    for (const f of [k, w, a]) { f.max = f.hp = 5e4; } setTimeout(() => { w.hp = w.max * 0.45; a.hp = a.max * 0.4; }, 4000); window.__A9 = a; });
  let g9 = null; for (let t = 0; t < 12; t++) { await H9.waitForTimeout(2500);
    g9 = await G9.evaluate(() => { const F = __FB, kn = F.bots().find(f => f.bot && f.bot.team === 'B' && f.bot.cls === 'knight'); return { ev: F.stat().ev, bf: kn ? kn.fbBf : -1, chat: __T.log.map(l => l.t).filter(t => /^\[(라인|반왕)\] /.test(t)).slice(-4), stun: __T.log.map(l => l.t).filter(t => /스턴에 걸렸습니다|스턴 면역|이미 기절 중/.test(t)).length, gone: !F.bots().some(f => f.bot && f.bot.team === 'A' && !f.dead) }; });
    if (t >= 3 && ['k', 'm', 'p', 'c', 'r', 's'].every(k => (g9.ev[k] || 0) > 0) && g9.stun >= 1) break; }
  await G9.screenshot({ path: 'dev/out/fb2_guest.png' }); const aU = await H9.evaluate(() => { const a = window.__A9; if (!a.gone && !a.dead) __FB.recall(a); return a.uid; }); await H9.waitForTimeout(2500);
  g9.gone = await G9.evaluate(u => !__FB.bots().some(f => f.uid === u && !f.dead), aU); g9.ev = await G9.evaluate(() => __FB.stat().ev);
  const h9 = await H9.evaluate(() => { const S = __FB.stat(), P = __T.NET.dbgPayload(); return { stun: S.stun, stunImm: S.stunImm, all: JSON.stringify(P).length, fbx: P.fbx ? JSON.stringify(P.fbx).length : 0 }; });
  console.log('⑨ guest', JSON.stringify(g9), 'host', JSON.stringify(h9));
  ok(['k', 'm', 'p', 'c', 'r', 's'].every(k => (g9.ev[k] || 0) > 0), '⑨ 게스트가 버프(k)·마법(m)·물약(p)·멘트(c)·귀환(r)·스턴(s) 연출을 받음 ' + JSON.stringify(g9.ev));
  ok(g9.bf > 0 && g9.chat.length >= 1 && g9.gone, `⑨ 게스트 화면: 기사 봇 버프 칸(${g9.bf}) · 멘트 채팅 · 귀환한 봇은 사라짐`); ok(g9.stun >= 1 || h9.stun === 0, `⑨ 게스트가 라인 기사 봇의 스턴에 걸림 (${g9.stun}번 · 호스트 성공 ${h9.stun})`);
  ok(h9.all < 3900, `⑨ 호스트 presence ${h9.all}B (fbx ${h9.fbx}B · 공용 상한 3.9KB)`);
  ok(errs.length === 0, '⑩ 오류 없음'); console.log(errs.join('\n') || 'no errors');
  console.log(fails ? `FAIL ${fails}개` : 'ALL OK'); await b.close(); })();
