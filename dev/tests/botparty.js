// 11/3 혈맹 파티 1단계 (봇과 파티 · dev/rooms/botparty.md)
//   KT_PORT=8899 KT_TO=900 bash dev/runkt.sh dev/tests/botparty.js
// ① Lv.55 초대 불가 · Lv.56 가능 ② 혈맹 창: 반왕 18명 투력순 (스크린샷 1280·760) ③ 봇 3명 초대 → 4번째 거절 · 내 옆에 나타남
// ④ 지역 이동 따라옴 ⑤ 걸어가면 따라옴 ⑥ 끼임·멀어짐·순간이동 → 옆에 다시 ⑦ 일점사 (파티장 대상 · 없으면 나를 노리는 몹) · 피해 = 파티장 몫
// ⑧ 대기·이동은 공격 안 함 ⑨ 몹에게 맞음 · 물약 ⑩ 쓰러짐 → 시체 · 부활 주문서 · 2분 지나면 빠짐 ⑪ 툴팁 → 추방(확인 팝업) · 30분 대기 (스크린샷)
// ⑫ 해산 ⑬ 경험치·골드·드랍 1/N × 1.1 · 보스 그대로 ⑭ 4시간 자동 해산 ⑮ 저장 → 다시 접속해도 파티 그대로
// ⑯ 두 PC (BroadcastChannel): 게스트가 파티장 · 호스트 화면에 파티 봇이 보임 · 세계 복사본 사라짐 · 같은 봇 중복 초대 정리 · 호스트의 라인 봇이 파티 봇을 공격(피해가 파티장 PC로) · 파티 봇 피해 = 파티장 몫
const { chromium } = require('playwright'); const login = require('../tq.js');
const URL = 'http://127.0.0.1:' + (process.env.KT_PORT || 8766) + '/_kt2.html';
const Z = +(process.env.BZ || 12), Z2 = +(process.env.BZ2 || 17);
const REF = { lv: 61, fb: { lv: 61, c: 'knight', hp: 778, ac: -127, mr: 85, d: 60, hb: 0.05, cr: 0.12, cp: 11114 } };
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
const toZone = async (p, z) => { await p.evaluate(z => __T.TOWN.toZone(z), z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', z, { timeout: 60000 }); await p.waitForTimeout(2500); };
async function relog(p, acc, cls, name, mp) { await p.goto(URL + (mp ? '?mp=bc' : '')); await p.waitForSelector('#lg-acc', { state: 'visible' }); await p.waitForTimeout(500);
  await p.fill('#lg-acc', acc); await p.fill('#lg-pw', 'abcd'); if (await p.inputValue('#lg-acc') !== acc) await p.fill('#lg-acc', acc); await p.click('#lg-go');
  await p.waitForSelector(`.cs-card[data-cls="${cls}"]`, { state: 'visible', timeout: 30000 }); await p.click(`.cs-card[data-cls="${cls}"]`); await p.click('#cs-start');
  const nm = await p.waitForSelector('#nm-in', { state: 'visible', timeout: 2500 }).catch(() => null); if (nm) { await p.fill('#nm-in', name); await p.click('#nm-go'); }
  await p.waitForFunction(() => window.__gameOn && window.__T && (__T.SCENE === 'town' || __T.SCENE === 'field'), null, { timeout: 30000 }); await p.waitForTimeout(800); }
const SETUP = R => { __T.GOD_INV = true; __FB.setRef(R); Object.assign(__FB.DBG, { noEnsure: true, noBoss: true, noTalk: true, noReinf: true }); };
const free = (p, n) => p.evaluate(n => __FB.pb.list().filter(x => !x.why).slice(0, n).map(x => x.b.uid), n);
(async () => { const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push('P: ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  const acc = 'bp' + Date.now() % 1e7, NAME = 'bpLd' + Date.now() % 1e4; await login(p, { acc, cls: 'knight', name: NAME }); await p.evaluate(SETUP, REF);
  // ① Lv.55 / Lv.56
  const r1 = await p.evaluate(() => { const F = __FB, H = __T.hero, x = F.roster().A.find(b => !b.pt); H.lv = 55; const w55 = F.pb.why(x.uid), i55 = F.pb.invite(x.uid), n55 = F.pb.S.m.length; H.lv = 56; const w56 = F.pb.why(x.uid); H.lv = 60; return { w55, i55, n55, w56, nm: x.name }; });
  console.log('①', JSON.stringify(r1)); ok(r1.w55 === 'Lv.56부터' && !r1.i55 && r1.n55 === 0, `① Lv.55(중립)는 초대 안 됨 (${r1.w55})`); ok(r1.w56 === '', '① Lv.56은 초대 가능');
  // ② 혈맹 창
  await p.click('#btn-clan'); await p.waitForTimeout(500);
  const r2 = await p.evaluate(() => { const rows = [...document.querySelectorAll('#clanwin .cl-r')].map(r => ({ cp: +r.querySelector('.cl-cp').textContent.replace(/,/g, ''), lv: r.querySelector('.cl-lv').textContent, c: r.querySelector('.cl-c').textContent, n: r.querySelector('.cl-n').textContent, t: r.querySelector('button').textContent, dis: r.querySelector('button').disabled, u: +r.dataset.u }));
    const pt = new Set(__FB.roster().A.filter(b => b.pt).map(b => b.uid)); return { vis: !document.getElementById('clanwin').hidden, rows, ptOk: rows.every(r => pt.has(r.u) === (r.t === '봇끼리 파티 중' && r.dis)), cps: rows.map(r => r.cp) }; });
  console.log('② rows', r2.rows.slice(0, 4).map(r => `${r.cp} ${r.lv} ${r.c} ${r.n} [${r.t}]`).join(' / '));
  ok(r2.vis && r2.rows.length === 18, `② 혈맹 창: 반왕 혈맹원 ${r2.rows.length}명`); ok(r2.cps.every((v, k) => !k || r2.cps[k - 1] >= v) && r2.cps[0] > r2.cps[17], '② 투력순 (높은 순)'); ok(r2.rows.every(r => /^Lv\.\d+$/.test(r.lv) && /기사|요정|마법사/.test(r.c) && r.n), '② 투력·레벨·직업·아이디 표시'); ok(r2.ptOk, '② 봇끼리 파티 중인 봇은 [봇끼리 파티 중] 막힘');
  await (await p.$('#clanwin')).screenshot({ path: 'dev/out/botparty_clan.png' }); await p.screenshot({ path: 'dev/out/botparty_clan_1280.png' });
  // ③ 초대 3명 (첫 명은 창의 버튼) · 4번째 거절
  await p.click('#clanwin [data-inv]'); await p.waitForTimeout(300);
  const A = await free(p, 3); const r3 = await p.evaluate(A => { const F = __FB; const a = F.pb.invite(A[0]), b2 = F.pb.invite(A[1]), x = F.pb.list().find(q => !F.pb.S.m.some(m => m.uid === q.b.uid) && !q.b.pt), c = F.pb.invite(x.b.uid), w = F.pb.why(x.b.uid); return { a, b2, c, w, n: F.pb.S.m.length, uids: F.pb.S.m.map(m => m.uid) }; }, A);
  await p.waitForTimeout(400);
  const r3b = await p.evaluate(() => { const H = __T.hero, L = __FB.pb.here(); return { here: L.map(e => Math.max(Math.abs(e.i - H.i), Math.abs(e.j - H.j))), names: L.map(e => e.bot.name), btn: [...document.querySelectorAll('#clanwin .cl-r button')].map(b => b.textContent), box: document.getElementById('partybox').innerText.replace(/\s+/g, ' ') }; });
  console.log('③', JSON.stringify(r3), JSON.stringify(r3b.here), r3b.box);
  ok(r3.a && r3.b2 && r3.n === 3, '③ 혈맹 창 버튼 + 2명 더 → 봇 3명 (바로 수락)'); ok(!r3.c && r3.w === '파티 가득', `③ 4번째 초대 거절 (${r3.w})`); ok(r3b.btn.filter(t => t === '내 파티').length === 3 && r3b.btn.filter(t => t === '파티 가득').length > 0, '③ 혈맹 창: [내 파티] 3 · 나머지 [파티 가득]');
  ok(r3b.here.length === 3 && r3b.here.every(d => d <= 3), `③ 봇이 내 옆(3칸 안)에 나타남 (${r3b.here})`); ok(/혈맹 파티/.test(r3b.box) && (r3b.box.match(/\(봇\)/g) || []).length === 3 && /대기 이동 전투 해산/.test(r3b.box), '③ 파티창: 봇 이름 옆 (봇) · HP · 대기/이동/전투/해산');
  await p.evaluate(() => { document.getElementById('clanwin').hidden = true; });
  // ④ 지역 이동
  await toZone(p, Z); await p.evaluate(SETUP, REF);
  const r4 = await p.evaluate(() => { const H = __T.hero, L = __FB.pb.here(); return { z: __T.ISLE.id, n: L.length, zone: L.map(e => e.zone), d: L.map(e => Math.max(Math.abs(e.i - H.i), Math.abs(e.j - H.j))), name: __T.ISLE.def.name }; });
  console.log('④', JSON.stringify(r4)); ok(r4.n === 3 && r4.zone.every(z => z === 'isle' + Z) && r4.d.every(d => d <= 6), `④ 사냥터(${r4.name})로 가자 봇 3명이 따라옴 (거리 ${r4.d})`);
  // ⑤ 걸어가면 따라옴 (순간이동 없이)
  const r5 = await p.evaluate(() => { const T = __T, F = __FB, H = T.hero, W = T.walkable_, D = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    for (const m of T.foxes) if (!m.fb && !m.dead && Math.max(Math.abs(m.i - H.i), Math.abs(m.j - H.j)) <= 22) { m.dead = true; m.deadT = 0; }   /* 몹은 치움 (따라오기만 보려고) */
    const run = d => { let n = 0; while (n < 14 && W(H.i + d[0] * (n + 1), H.j + d[1] * (n + 1))) n++; return n; }; const d = D.slice().sort((a, b) => run(b) - run(a))[0], N = Math.min(10, run(d)); const p0 = F.stat().pbPlace || 0; let far = 0;
    F.sim(1); for (let k = 0; k < N; k++) { H.fi = H.i; H.fj = H.j; H.i += d[0]; H.j += d[1]; H.x = H.i + 0.5; H.z = H.j + 0.5; H.t = 1; F.sim(0.45); far = Math.max(far, ...F.pb.here().map(e => Math.max(Math.abs(e.i - H.i), Math.abs(e.j - H.j)))); }
    F.sim(2); const fin = F.pb.here().map(e => Math.max(Math.abs(e.i - H.i), Math.abs(e.j - H.j))); return { N, far, fin, re: (F.stat().pbPlace || 0) - p0, d, st: F.pb.here().map(e => [e.px.stuck.toFixed(2), !!e.px.tgt]) }; });
  console.log('⑤', JSON.stringify(r5)); ok(r5.N >= 6 && r5.fin.every(d => d <= 3) && r5.far <= 6 && r5.re === 0, `⑤ ${r5.N}칸 걸어가도 걸어서 따라옴 (최대 ${r5.far}칸 · 끝 ${r5.fin} · 다시 생성 ${r5.re})`);
  // ⑥ 멀어짐·끼임 → 옆에 다시 · 순간이동
  const r6 = await p.evaluate(() => { const T = __T, F = __FB, H = T.hero, W = T.walkable_, e = F.pb.here()[0], p0 = F.stat().pbPlace || 0; let spot = null;
    for (let r = 14; r <= 24 && !spot; r++) for (const [a, c] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r]]) if (!spot && W(H.i + a, H.j + c)) spot = [H.i + a, H.j + c];
    e.i = e.fi = spot[0]; e.j = e.fj = spot[1]; e.x = e.i + 0.5; e.z = e.j + 0.5; e.t = 1; F.sim(0.3); const d1 = Math.max(Math.abs(e.i - H.i), Math.abs(e.j - H.j)), re1 = (F.stat().pbPlace || 0) - p0;
    let tp = null; for (let r = 7; r <= 14 && !tp; r++) for (const [a, c] of [[r, 0], [-r, 0], [0, r], [0, -r]]) if (!tp && W(H.i + a, H.j + c)) tp = [H.i + a, H.j + c]; T.TOWN.placeAt(tp[0] + 0.5, tp[1] + 0.5); F.sim(0.3);
    const d2 = F.pb.here().map(q => Math.max(Math.abs(q.i - H.i), Math.abs(q.j - H.j))); return { d1, re1, d2, tp: !!tp }; });
  console.log('⑥', JSON.stringify(r6)); ok(r6.re1 >= 1 && r6.d1 <= 3, `⑥ 10칸 넘게 떨어진 봇 → 파티장 옆에 다시 (${r6.d1}칸)`); ok(r6.tp && r6.d2.every(d => d <= 3), `⑥ 순간이동해도 옆으로 (${r6.d2})`);
  // ⑦ 일점사: 파티장 대상 · 피해 = 파티장 몫 · 대상이 없으면 나를 노리는 몹
  const r7 = await p.evaluate(() => { const T = __T, F = __FB, H = T.hero; for (const m of T.foxes) if (m.dead && !m.fb && T.MOB[m.kind] && !T.MOB[m.kind].boss) { m.dead = false; m.deadT = 0; }
    const L = T.foxes.filter(f => !f.fb && !f.dead && T.MOB[f.kind] && !T.MOB[f.kind].boss && !T.MOB[f.kind].midb && !T.MOB[f.kind].dummy).sort((a, b) => Math.hypot(a.x - H.x, a.z - H.z) - Math.hypot(b.x - H.x, b.z - H.z)), m = L[0];
    T.TOWN.placeAt(m.x + 3, m.z); if (Math.max(Math.abs(H.i - m.i), Math.abs(H.j - m.j)) > 5) T.TOWN.placeAt(m.x, m.z + 2); F.sim(0.3); H.target = m; m.hp = m.max = 1e6; m.dmgBy = null; for (const e of F.pb.here()) e.px.hits = 0;
    F.sim(8); const res = { kind: m.kind, d: Math.max(Math.abs(H.i - m.i), Math.abs(H.j - m.j)), hits: F.pb.here().map(e => e.px.hits), tg: F.pb.here().map(e => e.px.tgt === m), dmgHero: m.dmgBy ? m.dmgBy.get(H) || 0 : 0, only: m.dmgBy ? [...m.dmgBy.keys()].every(w => w === H) : false };
    H.target = null; m.dead = true; m.deadT = 0; const m2 = L.find(q => q !== m && !q.dead && Math.max(Math.abs(q.i - H.i), Math.abs(q.j - H.j)) <= 10) || L[1]; if (m2) { m2.hp = m2.max = 1e6; m2.aggro = true; m2.tgt = null; for (const q of T.foxes) if (q !== m2 && !q.fb && !q.dead && Math.max(Math.abs(q.i - H.i), Math.abs(q.j - H.j)) <= 14) { q.aggro = false; q.tgt = null; } F.sim(1.2); res.atk = F.pb.here().map(e => e.px.tgt === m2); m2.dead = true; m2.deadT = 0; }
    return res; });
  console.log('⑦', JSON.stringify(r7)); ok(r7.tg.every(Boolean) && r7.hits.every(h => h > 0), `⑦ 일점사: 3명 모두 파티장 대상(${r7.kind})을 공격 (${r7.hits})`); ok(r7.dmgHero > 0 && r7.only, `⑦ 파티 봇 피해는 파티장 몫 (${r7.dmgHero})`); ok(r7.atk && r7.atk.some(Boolean), `⑦ 파티장 대상이 없으면 나를 노리는 몹을 공격 (${r7.atk})`);
  // ⑧ 대기·이동은 공격 안 함
  const r8 = await p.evaluate(() => { const T = __T, F = __FB, H = T.hero; const m = T.foxes.find(f => !f.fb && !f.dead && T.MOB[f.kind] && !T.MOB[f.kind].boss && !T.MOB[f.kind].midb && Math.max(Math.abs(f.i - H.i), Math.abs(f.j - H.j)) <= 12); if (!m) return null; m.hp = m.max = 1e6; m.aggro = false; m.tgt = null; H.target = m; const out = {};
    for (const md of ['wait', 'move']) { F.pb.cmd(md); const pos = F.pb.here().map(e => [e.i, e.j]); for (const e of F.pb.here()) e.px.hits = 0; F.sim(4); out[md] = { hits: F.pb.here().reduce((a, e) => a + e.px.hits, 0), still: F.pb.here().every((e, k) => e.i === pos[k][0] && e.j === pos[k][1]) }; }
    F.pb.cmd('fight'); for (const e of F.pb.here()) e.px.hits = 0; F.sim(4); out.fight = F.pb.here().reduce((a, e) => a + e.px.hits, 0); H.target = null; m.dead = true; m.deadT = 0; out.mode = F.pb.S.mode; return out; });
  console.log('⑧', JSON.stringify(r8)); ok(r8 && r8.wait.hits === 0 && r8.wait.still, '⑧ 대기: 공격 안 하고 그 자리에'); ok(r8 && r8.move.hits === 0, '⑧ 이동: 공격 안 함 (따라만 옴)'); ok(r8 && r8.fight > 0 && r8.mode === 'fight', `⑧ 전투로 바꾸면 다시 공격 (${r8 && r8.fight})`);
  // ⑨ 몹에게 맞음 · 물약 (무제한)
  const r9 = await p.evaluate(() => { const T = __T, F = __FB, H = T.hero, e = F.pb.here().slice().sort((a, b) => b.bot.st.ac - a.bot.st.ac)[0]; F.pb.cmd('wait'); const omh = F.mobHit; let att = 0; F.mobHit = (...a) => { if (a[0] === e) att++; return omh(...a); }; const m = T.foxes.find(f => !f.fb && !f.dead && T.MOB[f.kind] && !T.MOB[f.kind].boss && !T.MOB[f.kind].midb && !T.MOB[f.kind].passive); const S = T.MOB[m.kind];
    const h0 = e.hp; F.mobHit(e, m, S, 150, 1); const h1 = e.hp; e.hp = Math.round(e.max * 0.4); e.px.potN = 0; e.px.pot = 0; const h2 = e.hp; F.sim(4); const pot = e.px.potN, h3 = e.hp;
    m.hp = m.max = 1e6; m.i = m.fi = e.i + 1; m.j = m.fj = e.j; m.x = m.i + 0.5; m.z = m.j + 0.5; m.t = 1; m.aggro = true; m.tgt = e; e.hitBy = null; let tg = 0; for (let k = 0; k < 16; k++) { F.sim(0.5); if (m.tgt === e) tg++; }
    F.mobHit = omh; const res = { kind: m.kind, h0, h1, h2, pot, h3, hitBy: e.hitBy === m, att: att - 1, tg, alive: !e.dead, cls: e.bot.cls }; m.dead = true; m.deadT = 0; F.pb.cmd('fight'); return res; });
  console.log('⑨', JSON.stringify(r9)); ok(r9.h1 < r9.h0, `⑨ 몹에게 맞으면 파티 봇 HP가 줄어듦 (${r9.h0} → ${r9.h1})`); ok(r9.pot > 0 && r9.h3 > r9.h2, `⑨ HP가 줄면 물약을 마심 (${r9.pot}번 · ${r9.h2} → ${r9.h3})`); ok(r9.tg > 0 && r9.att > 0, `⑨ 몹이 파티 봇을 노리고 때림 (${r9.kind} → ${r9.cls} · 노린 ${r9.tg}/16 · 공격 ${r9.att}번${r9.hitBy ? ' · 맞음' : ''})`);
  // ⑨-2 라인 봇 ↔ 파티 봇 (혼자 = 지역 호스트): 라인 봇이 파티 봇을 노리고 때림 · 전투 모드면 파티 봇이 반격 (피해 = 파티장 몫) · 2시간 복사 갱신 → 능력치 새로
  const r9b = await p.evaluate(([R, R2]) => { const T = __T, F = __FB, H = T.hero, L = F.pb.here(), e = L[0]; T.BUFF.invis = 99999; F.pb.cmd('wait'); for (const q of L) q.hitBy = null;
    const B = F.roster().B.find(b => b.cls === 'knight'), lb = F.spawnTest(B.uid, e.i + 1, e.j); if (!lb) return null; F.sim(6); const hit = L.some(q => q.hitBy === lb), tgt = !!(lb.bx && lb.bx.tgt && lb.bx.tgt.pbot);
    F.pb.cmd('fight'); lb.dmgBy = null; const lh = lb.hp; for (const q of L) q.px.hits = 0; F.sim(6); const res = { hit, tgt, back: lb.dead || lb.hp < lh, mine: lb.dead || !!(lb.dmgBy && lb.dmgBy.get(H) > 0), hits: L.map(q => q.px.hits) };
    lb.gone = true; T.BUFF.invis = 0; for (const q of L) if (q.dead) { q.dead = false; q.hp = q.max; } const mx0 = e.max; F.setRef(R2); F.sim(1.2); res.mx = [mx0, e.max]; F.setRef(R); F.sim(1.2); res.mx.push(e.max); return res; }, [REF, { lv: 61, fb: Object.assign({}, REF.fb, { hp: 1000 }) }]);
  console.log('⑨-2', JSON.stringify(r9b)); ok(r9b && r9b.tgt && r9b.hit, '⑨-2 라인 봇이 파티 봇을 노리고 때림'); ok(r9b && r9b.back && r9b.mine && r9b.hits.some(h => h > 0), `⑨-2 전투 모드: 파티 봇이 라인 봇에게 반격 · 피해는 파티장 몫 (${r9b && r9b.hits})`);
  ok(r9b && r9b.mx[1] > r9b.mx[0] && r9b.mx[2] === r9b.mx[0], `⑨-2 복사 대상이 바뀌면(2시간 갱신) 파티 봇 능력치도 새로 (HP ${r9b && r9b.mx.join(' → ')})`);
  // ⑩ 쓰러짐 → 시체 2분 · 부활 주문서 (HP 50%) · 2분 지나면 빠짐
  const r10 = await p.evaluate(() => { const T = __T, F = __FB, e = F.pb.here()[2], uid = e.uid; F.pb.hurt(e, 1e6); const dead = e.dead && F.pb.here().includes(e); F.pb.box(); const box = document.getElementById('partybox').innerText;
    T.INV.add('revive_scroll', 2, true); const n0 = T.INV.count('revive_scroll'); const rv = F.pbRevive(), n1 = T.INV.count('revive_scroll'); const hp = e.hp, half = Math.round(e.max * 0.5), alive = !e.dead;
    F.pb.hurt(e, 1e6); F.DBG.toff = 121e3; F.sim(0.2); F.DBG.toff = 0; const left = !F.pb.S.m.some(m => m.uid === uid), away = (F.away.get(uid) || 0) > Date.now(), cd = F.pb.why(uid); return { dead, box: /쓰러짐/.test(box) && /부활/.test(box), rv, n0, n1, hp, half, alive, left, away, cd, n: F.pb.S.m.length }; });
  console.log('⑩', JSON.stringify(r10)); ok(r10.dead && r10.box, '⑩ 쓰러지면 시체로 남음 (파티창: 쓰러짐 · 부활)'); ok(r10.rv && r10.alive && r10.hp === r10.half && r10.n1 === r10.n0 - 1, `⑩ 부활 주문서로 HP 50% 부활 (${r10.hp}) · 주문서 1개 사용`); ok(r10.left && r10.away && r10.n === 2, `⑩ 2분 동안 못 살리면 파티에서 빠지고 귀환 (${r10.cd})`);
  await p.waitForTimeout(600); await p.screenshot({ path: 'dev/out/botparty_field.png' });
  // ⑪ 툴팁 → ④ 파티 추방 (확인 팝업) · 30분 뒤 다시 초대
  await p.evaluate(() => __FB.pb.box()); await p.waitForTimeout(300); await p.click('#partybox .pb-m.pbot'); await p.waitForTimeout(300);
  const r11a = await p.evaluate(() => { const m = document.getElementById('pmenu'); return { vis: !m.hidden, t: m.innerText.replace(/\s+/g, ' ') }; }); console.log('⑪ tooltip', JSON.stringify(r11a));
  ok(r11a.vis && /① 일점사/.test(r11a.t) && /④ 파티 추방/.test(r11a.t), '⑪ 봇 이름을 누르면 툴팁 (① 일점사 · ④ 파티 추방)');
  await p.screenshot({ path: 'dev/out/botparty_box.png', clip: { x: 0, y: 40, width: 460, height: 380 } });
  const kick = await p.evaluate(() => +document.querySelector('#partybox .pb-m.pbot').dataset.pbu); await p.click('#pmenu [data-a="kick"]'); await p.waitForTimeout(300);
  const r11b = await p.evaluate(() => ({ vis: !document.getElementById('askwin').hidden, q: document.getElementById('ask-q').textContent })); ok(r11b.vis && r11b.q === '정말 파티에서 추방시키겠습니까?', `⑪ 확인 팝업 "${r11b.q}"`);
  await p.click('#ask-yes'); await p.waitForTimeout(300);
  const r11 = await p.evaluate(u => { const F = __FB; return { n: F.pb.S.m.length, gone: !F.pb.E.has(u), why: F.pb.why(u), inv: F.pb.invite(u), cd: Math.round(((F.pb.S.cd[u] || 0) - Date.now()) / 60000) }; }, kick);
  console.log('⑪', JSON.stringify(r11)); ok(r11.n === 1 && r11.gone, '⑪ [네] → 파티에서 빠지고 귀환'); ok(/분 뒤 초대/.test(r11.why) && !r11.inv && r11.cd >= 29, `⑪ 추방한 봇은 30분 동안 다시 초대 안 됨 (${r11.why})`);
  // ⑫ 해산 (아래 메뉴 · 확인 팝업)
  const B1 = await free(p, 1); await p.evaluate(u => __FB.pb.invite(u[0]), B1); await p.waitForTimeout(400); const ids12 = await p.evaluate(() => __FB.pb.S.m.map(m => m.uid));
  await p.click('#partybox [data-pbm="bye"]'); await p.waitForTimeout(300); const q12 = await p.evaluate(() => document.getElementById('ask-q').textContent); await p.click('#ask-yes'); await p.waitForTimeout(500);
  const r12 = await p.evaluate(ids => ({ n: __FB.pb.S.m.length, here: __FB.pb.here().length, box: document.getElementById('partybox').hidden, cd: ids.map(u => /분 뒤 초대/.test(__FB.pb.why(u))) }), ids12);
  console.log('⑫', q12, JSON.stringify(r12)); ok(r12.n === 0 && r12.here === 0 && r12.box && r12.cd.every(Boolean), `⑫ 해산 → 모두 귀환 · 파티창 닫힘 · 30분 대기 (${ids12.length}명)`);
  // ⑬ 경험치·골드·드랍 × 1/N × 1.1 · 보스 그대로 (마을에서 · 몹 사체 대신 시험용 몹)
  await p.evaluate(() => __T.TOWN.goTown()); await p.waitForFunction(() => __T.SCENE === 'town', null, { timeout: 30000 }); await p.waitForTimeout(1500);
  const C3 = await free(p, 3);
  const r13 = await p.evaluate(C3 => { const T = __T, F = __FB, H = T.hero, M = T.MOB; const kind = Object.keys(M).filter(k => { const S = M[k]; return !S.boss && !S.midb && !S.dummy && !S.hwEv && !S.spirit && S.exp >= 150 && S.coin && T.MOB_DROPS[k]; }).sort((a, b) => M[b].exp - M[a].exp)[0];
    const boss = Object.keys(M).find(k => M[k].boss && M[k].exp > 0 && !M[k].dummy && !k.startsWith('tw_'));
    const rng = sd => () => { sd |= 0; sd = sd + 0x6D2B79F5 | 0; let t = Math.imul(sd ^ sd >>> 15, 1 | sd); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };   /* 같은 씨앗 → 골드(rint)가 같은 값 */
    const kill = (k, sum) => { const R = Math.random, G = T.GROUND, od = G.drop, ob = G.bossLoot; let nb = 0; Math.random = rng(1103); G.drop = () => null; G.bossLoot = () => { nb++; }; try { const f = T.mkMob_(k, H.i, H.j); if (sum) f.summoned = true; f.hp = 0; f.dmgBy = new Map([[H, 10]]); const e0 = H.exp, c0 = T.coins, l0 = H.lv; T.killCheck(f); return { ex: H.lv === l0 ? H.exp - e0 : null, g: T.coins - c0, bl: nb }; } finally { Math.random = R; G.drop = od; G.bossLoot = ob; } };
    const drops = n => { const G = T.GROUND, o = G.drop, od = T.MOB_DROPS[kind]; let c = 0; G.drop = () => { c++; return null; }; T.MOB_DROPS[kind] = [['red_potion', 1]]; try { for (let q = 0; q < n; q++) { const f = T.mkMob_(kind, H.i, H.j); f.hp = 0; f.dmgBy = new Map([[H, 10]]); T.killCheck(f); } } finally { G.drop = o; T.MOB_DROPS[kind] = od; } return c / n; };
    const bl = n => { let c = 0; for (let q = 0; q < n; q++) c += kill(boss, true).bl; return c; };
    H.lv = 60; H.exp = 0; const out = { kind, boss }; out.b0 = kill(kind); out.bb0 = kill(boss, true); out.d0 = drops(300);
    F.pb.invite(C3[0]); F.sim(0.1); out.k1 = F.pbK(M[kind]); out.b1 = kill(kind); out.d1 = drops(600);
    F.pb.invite(C3[1]); F.pb.invite(C3[2]); F.sim(0.1); out.n = F.pb.here().length; out.k3 = F.pbK(M[kind]); out.kb = F.pbK(M[boss]); out.kd = F.pbDropK(M[boss], null); out.b3 = kill(kind); out.d3 = drops(800); out.bb3 = kill(boss, true); out.bl3 = bl(10); return out; }, C3);
  console.log('⑬', JSON.stringify(r13));
  const rt = (a, b) => b ? a / b : 0;
  ok(Math.abs(r13.k1 - 0.55) < 1e-9 && Math.abs(r13.k3 - 0.275) < 1e-9, `⑬ 배율: 봇 1명 ×${r13.k1} · 봇 3명 ×${r13.k3}`);
  ok(Math.abs(rt(r13.b1.ex, r13.b0.ex) - 0.55) < 0.02 && Math.abs(rt(r13.b3.ex, r13.b0.ex) - 0.275) < 0.02, `⑬ 경험치 ${r13.b0.ex} → ${r13.b1.ex}(1명) → ${r13.b3.ex}(3명) (${r13.kind})`);
  ok(Math.abs(rt(r13.b1.g, r13.b0.g) - 0.55) < 0.03 && Math.abs(rt(r13.b3.g, r13.b0.g) - 0.275) < 0.03, `⑬ 골드 ${r13.b0.g} → ${r13.b1.g} → ${r13.b3.g}`);
  ok(r13.d0 === 1 && Math.abs(r13.d1 - 0.55) < 0.07 && Math.abs(r13.d3 - 0.275) < 0.06, `⑬ 일반 몬스터 드랍 확률 ${r13.d0} → ${r13.d1.toFixed(3)} → ${r13.d3.toFixed(3)}`);
  ok(r13.kb === 1 && r13.kd === 1 && r13.bb3.ex === r13.bb0.ex && r13.bb3.g === r13.bb0.g && r13.bl3 === 10, `⑬ 보스(${r13.boss})는 그대로: 경험치 ${r13.bb0.ex}=${r13.bb3.ex} · 골드 ${r13.bb0.g}=${r13.bb3.g} · 전리품 10/10`);
  // ⑭ 4시간 자동 해산 (시계 밀기)
  const r14 = await p.evaluate(() => { const T = __T, F = __FB, ids = F.pb.S.m.map(m => m.uid), end = F.pb.S.end, left = end - Date.now(); F.DBG.toff = 4 * 3600e3 + 5e3; F.sim(0.1); const n = F.pb.S.m.length, msg = T.log.slice(-6).map(l => l.t).filter(t => /4시간이 지나 자동으로 해산/.test(t)).length; F.DBG.toff = 0; return { left: Math.round(left / 60000), n, msg, cd: ids.map(u => /분 뒤 초대/.test(F.pb.why(u))) }; });
  console.log('⑭', JSON.stringify(r14)); ok(r14.left >= 239 && r14.left <= 240, `⑭ 파티 시간 4시간 (${r14.left}분 남음)`); ok(r14.n === 0 && r14.msg === 1 && r14.cd.every(Boolean), '⑭ 4시간이 지나면 자동 해산 + 채팅 알림');
  // ⑮ 저장 → 다시 접속 (파티·대기 모드·남은 시간·쿨타임 그대로 · 봇이 옆에 다시)
  const D2 = await free(p, 2); const s15 = await p.evaluate(D2 => { const F = __FB; F.pb.invite(D2[0]); F.pb.invite(D2[1]); F.pb.cmd('move'); F.sim(0.1); return { ids: F.pb.S.m.map(m => m.uid), end: F.pb.S.end, cd: Object.keys(F.pb.S.cd).length }; }, D2);
  await p.evaluate(() => __T.SAVE.now(true, true)); await p.waitForTimeout(500); await relog(p, acc, 'knight', NAME, false); await p.evaluate(SETUP, REF); await p.waitForTimeout(1500);
  const r15 = await p.evaluate(() => { const F = __FB, H = __T.hero; return { ids: F.pb.S.m.map(m => m.uid), end: F.pb.S.end, mode: F.pb.S.mode, cd: Object.keys(F.pb.S.cd).length, here: F.pb.here().map(e => Math.max(Math.abs(e.i - H.i), Math.abs(e.j - H.j))), box: !document.getElementById('partybox').hidden }; });
  console.log('⑮', JSON.stringify(s15), JSON.stringify(r15)); ok(r15.ids.join() === s15.ids.join() && Math.abs(r15.end - s15.end) < 2000 && r15.mode === 'move', '⑮ 다시 접속해도 파티 그대로 (봇 2명 · 남은 시간 · 이동 모드)'); ok(r15.cd === s15.cd, `⑮ 30분 대기도 그대로 (${r15.cd}명)`); ok(r15.here.length === 2 && r15.here.every(d => d <= 3) && r15.box, `⑮ 봇이 파티장 옆에 다시 나타남 (${r15.here}) · 파티창`);
  // 몽환의 섬 (1단계: 밖에서 기다림) → 마을로 나오면 다시 옆에
  await toZone(p, 24); await p.evaluate(SETUP, REF); await p.waitForTimeout(800);
  const r15b = await p.evaluate(() => { const F = __FB; return { z: __T.ISLE && __T.ISLE.id, here: F.pb.here().length, n: F.pb.S.m.length, k: F.pbK({ exp: 1 }), box: /밖에서 기다리는 중/.test(document.getElementById('partybox').innerText) }; });
  await p.evaluate(() => __T.TOWN.goTown()); await p.waitForFunction(() => __T.SCENE === 'town', null, { timeout: 30000 }); await p.waitForTimeout(1500);
  const r15c = await p.evaluate(() => { const H = __T.hero; return __FB.pb.here().map(e => Math.max(Math.abs(e.i - H.i), Math.abs(e.j - H.j))); });
  console.log('⑮ dream', JSON.stringify(r15b), JSON.stringify(r15c)); ok(r15b.z === 24 && r15b.here === 0 && r15b.n === 2 && r15b.k === 1 && r15b.box, '⑮ 몽환의 섬: 봇은 밖에서 기다림 (파티는 그대로 · 보상 배율 1)'); ok(r15c.length === 2 && r15c.every(d => d <= 3), `⑮ 마을로 나오면 다시 옆에 (${r15c})`);
  await p.evaluate(() => { __FB.pb.end('bye'); }); await p.setViewportSize({ width: 760, height: 800 }); await p.click('#btn-clan').catch(() => p.evaluate(() => __FB.pb.open())); await p.waitForTimeout(500);
  if (await p.evaluate(() => document.getElementById('clanwin').hidden)) await p.evaluate(() => __FB.pb.open()); await p.waitForTimeout(300); await p.screenshot({ path: 'dev/out/botparty_clan_760.png' });
  const w760 = await p.evaluate(() => { const r = document.getElementById('clanwin').getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), w: innerWidth, sw: document.getElementById('clanwin').scrollWidth, cw: document.getElementById('clanwin').clientWidth }; });
  console.log('760', JSON.stringify(w760)); ok(w760.l >= 0 && w760.r <= w760.w, `혈맹 창이 760px 화면 안에 들어감 (${w760.l}~${w760.r})`);
  await p.close();
  // ⑯ 두 PC
  const ctx2 = await b.newContext({ viewport: { width: 1100, height: 700 } }); const pg = [];
  for (const [nm, cls] of [['bpH', 'knight'], ['bpG', 'elf']]) { const q = await ctx2.newPage(); q.on('pageerror', e => errs.push(nm + ': ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | '))); await login(q, { cls, name: nm + Date.now() % 1e4, mp: true }); pg.push(q); }
  for (const q of pg) await q.evaluate(R => { __T.hero.lv = 61; }, REF);
  for (const q of pg) await q.evaluate(SETUP, REF);
  await toZone(pg[0], Z2); await pg[0].waitForTimeout(1000); await toZone(pg[1], Z2); for (const q of pg) await q.evaluate(SETUP, REF); await pg[0].waitForTimeout(3000);
  const hs = await Promise.all(pg.map(q => q.evaluate(() => __FB.host()))); const H = hs[1] && !hs[0] ? pg[1] : pg[0], G = H === pg[0] ? pg[1] : pg[0]; console.log('⑯ host flags', JSON.stringify(hs));
  await G.evaluate(() => { const o = __T.NET.others()[0]; if (o) __T.TOWN.placeAt(o.pr.x + 3, o.pr.y); }); await G.waitForTimeout(1500);
  const X = await H.evaluate(() => { const F = __FB, h = __T.hero, L = F.pb.list().filter(x => !x.why); for (const f of F.bots()) f.gone = true; const f = F.spawnTest(L[0].b.uid, h.i + 4, h.j + 3); return { x: L[0].b.uid, y: L[1].b.uid, world: !!f, host: F.host() }; });
  await H.waitForTimeout(800);
  const g0 = await G.evaluate(([x, y]) => { const F = __FB; const a = F.pb.invite(x), b2 = F.pb.invite(y); F.pb.cmd('wait'); __T.BUFF.invis = 99999; return { a, b2, host: F.host(), at: F.pb.S.m.map(m => m.at) }; }, [X.x, X.y]);
  await H.evaluate(() => { __T.BUFF.invis = 99999; }); await H.waitForTimeout(3500);
  const hv = await H.evaluate(([x, y]) => { const F = __FB; return { world: __T.foxes.filter(f => f.fb && f.uid === x && !f.gone && !f.dead).length, remote: __T.NET.pbRemote().map(e => e.bot.name + ':' + e.uid), why: F.pb.why(x), inv: F.pb.invite(x), mine: F.pb.S.m.length, spawn: !!F.spawnTest(y, __T.hero.i + 2, __T.hero.j), ev: F.stat().ev.r || 0 }; }, [X.x, X.y]);
  console.log('⑯', JSON.stringify(X), JSON.stringify(g0), JSON.stringify(hv));
  ok(g0.a && g0.b2 && !g0.host && X.host, '⑯ 게스트(지역 호스트 아님)가 봇 2명 초대');
  ok(X.world && hv.world === 0, '⑯ 세계에 나와 있던 그 봇(호스트 계산)은 파티에 들어가자 사라짐');
  ok(hv.remote.length === 2, `⑯ 다른 PC(호스트) 화면에 파티 봇이 보임 (${hv.remote})`); ok(hv.why === '다른 유저 파티' && !hv.inv && hv.mine === 0 && !hv.spawn, '⑯ 다른 유저 파티의 봇은 초대·세계 등장 안 됨');
  await H.screenshot({ path: 'dev/out/botparty_remote.png' });
  // 같은 봇을 거의 동시에 초대 → 먼저 누른 쪽만
  await H.evaluate(([x, at]) => { const F = __FB; F.pb.S.m.push({ uid: x, st: 'focus', at: at + 3000 }); F.pb.S.end = Date.now() + 3600e3; }, [X.x, g0.at[0]]); await H.waitForTimeout(1800);
  const cf = await Promise.all([H.evaluate(x => ({ n: __FB.pb.S.m.length, msg: __T.log.slice(-8).map(l => l.t).filter(t => /먼저 초대한/.test(t)).length }), X.x), G.evaluate(x => __FB.pb.S.m.some(m => m.uid === x), X.x)]);
  console.log('⑯ conflict', JSON.stringify(cf)); ok(cf[0].n === 0 && cf[0].msg === 1 && cf[1], '⑯ 두 사람이 같은 봇을 초대하면 먼저 누른 쪽만 남음');
  // 호스트의 라인 봇이 게스트의 파티 봇을 공격 → 피해는 게스트 PC로
  const lb = await H.evaluate(() => { const F = __FB, L = __T.NET.pbRemote(), e = L.slice().sort((a, b) => b.bot.st.ac - a.bot.st.ac)[0]; if (!e) return null; for (const m of __T.foxes) if (!m.fb && !m.dead && Math.max(Math.abs(m.i - e.i), Math.abs(m.j - e.j)) <= 14) { m.dead = true; m.deadT = 0; }
    const B = F.roster().B.find(b => b.cls === 'wizard'); const f = F.spawnTest(B.uid, e.i + 2, e.j); return f ? { uid: B.uid, at: e.uid } : null; });   /* 마법은 명중 판정 없이 들어감 */
  await G.evaluate(() => { window.__pbMin = {}; clearInterval(window.__pbT); window.__pbT = setInterval(() => { for (const e of __FB.pb.here()) window.__pbMin[e.uid] = Math.min(window.__pbMin[e.uid] ?? 1e9, e.hp); }, 30); });
  await H.waitForTimeout(9000);
  const hb = await H.evaluate(u => { const f = __T.foxes.find(q => q.uid === u && !q.gone); return { alive: !!f && !f.dead, tgt: f && f.bx && f.bx.tgt ? (f.bx.tgt.pbR ? 'pb' : f.bx.tgt.isRemote ? 'remote' : 'x') : '-', pbd: !!(__T.NET.dbgPayload().pbd) }; }, lb && lb.uid);
  const gb = await G.evaluate(() => { const o = __T.NET.others()[0]; return { min: window.__pbMin, max: Object.fromEntries(__FB.pb.here().map(e => [e.uid, e.max])), hitBy: __FB.pb.here().map(e => !!e.hitBy), rx: o && o.pr.pbd ? JSON.stringify(o.pr.pbd).slice(0, 160) : null, me: __T.NET.me(), here: __FB.pb.here().map(e => e.uid + ':' + e.hp + (e.dead ? 'D' : '')) }; });
  console.log('⑯ host pbd', await H.evaluate(() => JSON.stringify(__T.NET.dbgPayload().pbd).slice(0, 200)));
  console.log('⑯ line bot', JSON.stringify(lb), JSON.stringify(hb), JSON.stringify(gb));
  ok(!!lb && (hb.tgt === 'pb' || !hb.alive), `⑯ 호스트의 라인 봇이 게스트의 파티 봇을 노림 (${hb.tgt})`); ok(Object.keys(gb.min).some(u => gb.min[u] < gb.max[u]) && gb.hitBy.some(Boolean), '⑯ 라인 봇의 피해가 게스트(파티장) PC의 파티 봇에 들어감 (pbd)');
  // 호스트의 몹이 게스트의 파티 봇을 노리고 때림 (피해는 게스트 PC로)
  const mb = await H.evaluate(() => { const T = __T, e = T.NET.pbRemote().slice().sort((a, b) => b.bot.st.ac - a.bot.st.ac)[0]; const m = T.foxes.find(f => !f.fb && f.dead && T.MOB[f.kind] && !T.MOB[f.kind].boss && !T.MOB[f.kind].midb && !T.MOB[f.kind].passive && !T.MOB[f.kind].still); if (!e || !m) return null;
    m.dead = false; m.deadT = 0; m.hp = m.max = 1e6; m.i = m.fi = e.i + 1; m.j = m.fj = e.j; m.x = m.i + 0.5; m.z = m.j + 0.5; m.t = 1; m.aggro = true; m.tgt = e; const o = __FB.mobHit; window.__mbA = 0; __FB.mobHit = (...a) => { if (a[0] === e) window.__mbA++; return o(...a); }; window.__mbO = o; return { m: m.uid, e: e.uid, kind: m.kind }; });
  await G.evaluate(() => { for (const e of __FB.pb.here()) e.hitBy = null; }); await H.waitForTimeout(6000);
  const mb2 = mb && await H.evaluate(u => { const m = __T.foxes.find(q => q.uid === u); __FB.mobHit = window.__mbO; return { att: window.__mbA, tgt: !!(m && m.tgt && m.tgt.pbR) }; }, mb.m);
  const mb3 = mb && await G.evaluate(su => __FB.pb.here().some(e => e.hitBy && e.hitBy.uid === su), mb.m);
  console.log('⑯ mob', JSON.stringify(mb), JSON.stringify(mb2), mb3); ok(!!mb && mb2.att > 0 && (mb2.tgt || mb3), `⑯ 호스트의 몹(${mb && mb.kind})이 게스트의 파티 봇을 공격 (${mb2 && mb2.att}번${mb3 ? ' · 게스트 PC에서 맞음' : ''})`);
  await H.evaluate(u => { const m = __T.foxes.find(q => q.uid === u); if (m) { m.dead = true; m.deadT = 0; } }, mb && mb.m);
  // 게스트의 파티 봇이 몹을 치면 호스트에서 게스트 몫
  await G.waitForTimeout(1500); const mt = await G.evaluate(ex => { const T = __T, H = T.hero, F = __FB; F.pb.cmd('fight'); const m = T.foxes.filter(f => !f.fb && !f.dead && f.uid !== ex && T.MOB[f.kind] && !T.MOB[f.kind].boss && !T.MOB[f.kind].midb).sort((a, b) => Math.hypot(a.x - H.x, a.z - H.z) - Math.hypot(b.x - H.x, b.z - H.z))[0]; if (!m) return null; T.TOWN.placeAt(m.x + 2, m.z); H.target = m; for (const e of F.pb.here()) e.px.hits = 0; return m.uid; }, mb && mb.m);
  if (mt != null) await H.evaluate(u => { const m = __T.foxes.find(q => q.uid === u); if (m) { m.hp = m.max = 1e6; } }, mt);
  await G.waitForTimeout(6000);
  const md = mt == null ? null : await H.evaluate(u => { const m = __T.foxes.find(q => q.uid === u); return m && m.dmgBy ? [...m.dmgBy].filter(([w, v]) => w && w.isRemote && v > 0).length : 0; }, mt);
  const gh = await G.evaluate(() => __FB.pb.here().map(e => e.px.hits)); console.log('⑯ guest party hits', JSON.stringify(gh), 'host dmgBy remote', md);
  ok(md > 0 && gh.some(h => h > 0), '⑯ 게스트의 파티 봇이 친 피해는 호스트에서 게스트(파티장) 몫으로 들어감');
  console.log(errs.slice(0, 6).join('\n') || 'no errors'); ok(!errs.length, '오류 없음');
  console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
