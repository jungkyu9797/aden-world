// 11/3 중립: Lv.55까지는 [중립] — 혈맹 봇(반왕·라인)이 공격하지 않고, 나도 혈맹 봇을 고르거나 때릴 수 없음 · Lv.56이 되면 자동으로 반왕 (라인 봇이 공격해 옴)
//   KT_PORT=8897 bash dev/runkt.sh dev/tests/neutral.js
// ① 혼자(지역 호스트): Lv50 옆에 라인 봇 3명 → 20초 동안 나를 노리지 않음·피해·스턴 없음 · 내가 쳐도 봇 HP 그대로 · /혈맹 · 처음 안내
// ② 경험치로 Lv56 → 반왕 가입 안내 · 라인 봇이 나를 노림 · 내가 치면 피해 들어감
// ③ 두 PC: 호스트(Lv61·숨김) · 게스트(Lv50) — 호스트 봇이 게스트를 안 노림 · 호스트가 억지로 보낸 봇 피해도 게스트가 안 받음(몹 피해는 받음) · 이름표 [중립] → 게스트 Lv56 → [반왕]·노림
const { chromium } = require('playwright'); const login = require('../tq.js');
const Z = +(process.env.NZ || 23);
const REF = { lv: 61, fb: { lv: 61, c: 'knight', hp: 778, ac: -127, mr: 85, d: 60, hb: 0.05, cr: 0.12, cp: 11114 } };
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
const toZone = async (p, z) => { await p.evaluate(z => __T.TOWN.toZone(z), z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', z, { timeout: 60000 }); await p.waitForTimeout(2500); };
(async () => { const b = await chromium.launch(); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 1100, height: 700 } })).newPage(); p.on('pageerror', e => errs.push('P: ' + e.message));
  await login(p, { cls: 'knight', name: 'neuA' });
  await p.evaluate(() => { __T.hero.lv = 50; __T.GOD_INV = false; __T.BUFF.invis = 0; });
  ok(await p.evaluate(() => { const F = __FB; return F.neuLv(1) && F.neuLv(55) && !F.neuLv(56) && !F.neuLv(0) && !F.neuLv(undefined) && F.neuMe(); }), '경계: Lv1·55 중립 · 56 아님 · 레벨 정보 없음은 중립 아님(예전과 같이 반왕)');
  await toZone(p, Z); await p.evaluate(R => __FB.setRef(R), REF);
  // ① 라인 봇 3명을 바로 옆에
  const s1 = await p.evaluate(() => { const T = __T, F = __FB, H = T.hero; F.DBG.noEnsure = true; F.DBG.noBoss = true;   /* 보스 사냥(11/3 3600초·원정)으로 봇이 보스에게 가지 않게 */ for (const f of F.bots()) f.gone = true;
    for (const m of T.foxes) if (!m.fb && !m.dead && Math.max(Math.abs(m.i - H.i), Math.abs(m.j - H.j)) <= 14) { m.dead = true; m.deadT = 0; }   // 몹은 치움 (봇 피해만 보려고)
    const R = F.roster(), B = R.B; const k = F.spawnTest(B.find(x => x.cls === 'knight').uid, H.i + 1, H.j), w = F.spawnTest(B.find(x => x.cls === 'wizard').uid, H.i + 3, H.j + 1), e = F.spawnTest(B.find(x => x.cls === 'elf').uid, H.i + 2, H.j - 2);
    const a = F.spawnTest(R.A.find(x => x.cls === 'wizard').uid, H.i - 2, H.j);
    window.__NB = [k, w, e]; window.__NA = a; H.hp = H.max; return { bots: [k, w, e, a].map(f => f && `${f.bot.clan}:${f.bot.name}`), hp: H.max }; });
  console.log('① spawn', JSON.stringify(s1));
  await p.waitForTimeout(1500);
  const said = await p.evaluate(() => __T.log.map(l => l.t).filter(t => /까지는 \[중립\]/.test(t)).length);
  ok(said === 1, `① 봇이 있는 사냥터에 들어가면 한 번 안내 ("Lv.55까지는 [중립]이에요…") ×${said}`);
  const r1 = await p.evaluate(() => { const T = __T, F = __FB, H = T.hero, NB = window.__NB; let tgtMe = 0, minHp = H.hp, stun = 0; const hp0 = H.hp;
    for (let s = 0; s < 20; s++) { F.sim(1); if (NB.some(f => f.bx && f.bx.tgt === H)) tgtMe++; minHp = Math.min(minHp, H.hp); if (T.BUFF.stun > 0) stun++; }
    const k = NB[0], kh = k.hp; for (let n = 0; n < 15; n++) T.strike(k);
    return { tgtMe, hp0, minHp, stun, ally: k.hp === kh, allyFn: F.neuMe(), alive: NB.filter(f => !f.dead && !f.gone).length, aHeal: (window.__NA.bx && window.__NA.bx.tgt === H) ? 1 : 0 }; });
  console.log('① 20초', JSON.stringify(r1));
  ok(r1.alive === 3, '① 라인 봇 3명이 옆에 그대로 있음 (시험 조건)');
  ok(r1.tgtMe === 0, `① 라인 봇이 20초 동안 나를 한 번도 노리지 않음 (${r1.tgtMe})`);
  ok(r1.minHp === r1.hp0 && r1.stun === 0, `① 봇 피해·스턴 없음 (HP ${r1.hp0} → 최저 ${r1.minHp} · 스턴 ${r1.stun})`);
  ok(r1.ally, '① 내가 라인 봇을 쳐도 피해 안 들어감 (중립은 혈맹 봇을 때릴 수 없음)');
  await p.evaluate(() => __FB.report()); const rep = await p.evaluate(() => __T.log.slice(-8).map(l => l.t).filter(t => /\[혈맹\]/.test(t)));
  console.log('① /혈맹', JSON.stringify(rep.slice(0, 2)));
  ok(rep.some(t => /나는 \[중립\]/.test(t)) && rep.some(t => /중립\(Lv\.55 이하\) 유저 1명/.test(t)), '① /혈맹 에 [중립] 안내와 중립 유저 수');
  // ② Lv55 → 56 (경험치)
  const r2 = await p.evaluate(() => { const T = __T, H = T.hero; if (window.__NA) window.__NA.gone = true; H.lv = 55;   /* 반왕 봇은 빼고 (라인 봇이 그쪽을 노리면 시험이 흔들림) */ H.exp = 0; T.gainExp(T.needExp(55) + 5); return { lv: H.lv, msg: T.log.slice(-6).map(l => l.t).filter(t => /반왕 혈맹\]으로 들어갔어요/.test(t)).length, neu: __FB.neuMe() }; });
  console.log('② Lv up', JSON.stringify(r2)); ok(r2.lv === 56 && r2.msg === 1 && !r2.neu, `② Lv.56이 되면 [반왕 혈맹] 가입 안내 · 중립 끝 (Lv${r2.lv})`);
  const r3 = await p.evaluate(() => { const T = __T, F = __FB, H = T.hero, NB = window.__NB; T.GOD_INV = true; { const k0 = NB.find(f => !f.dead && !f.gone); if (k0) T.TOWN.placeAt(k0.x + 1, k0.z); }   /* 중립일 때 봇들이 다른 몹을 잡으러 멀어졌을 수 있어 봇 옆으로 */ let tgtMe = 0; for (let s = 0; s < 12; s++) { F.sim(1); if (NB.some(f => f.bx && f.bx.tgt === H)) tgtMe++; }
    const k = NB.find(f => !f.dead && !f.gone), kh = k ? k.hp : 0; if (k) for (let n = 0; n < 15; n++) T.strike(k); return { tgtMe, hit: k ? k.hp < kh : null }; });
  console.log('② 12초', JSON.stringify(r3)); ok(r3.tgtMe > 0, `② Lv.56: 라인 봇이 나를 노림 (${r3.tgtMe}초)`); ok(r3.hit === true, '② Lv.56: 내가 라인 봇을 치면 피해 들어감');
  await p.close();
  // ③ 두 PC
  const ctx = await b.newContext({ viewport: { width: 1100, height: 700 } }); const pg = [];
  for (const [nm, cls] of [['neuH', 'knight'], ['neuG', 'elf']]) { const q = await ctx.newPage(); q.on('pageerror', e => errs.push(nm + ': ' + e.message)); await login(q, { cls, name: nm, mp: true }); pg.push(q); }
  for (const q of pg) await q.evaluate(R => { __T.GOD_INV = true; __FB.setRef(R); }, REF);
  await toZone(pg[0], Z); await pg[0].waitForTimeout(1500); await toZone(pg[1], Z); await pg[0].waitForTimeout(3000);
  const hs = await Promise.all(pg.map(q => q.evaluate(() => __FB.host()))); const H = hs[1] && !hs[0] ? pg[1] : pg[0], G = H === pg[0] ? pg[1] : pg[0]; console.log('③ host flags', JSON.stringify(hs));   // 지역 호스트인 쪽이 Lv61(숨김) · 다른 쪽이 Lv50 게스트
  await H.evaluate(() => { __T.hero.lv = 61; __T.BUFF.invis = 99999; }); await G.evaluate(() => { __T.hero.lv = 50; __T.GOD_INV = false; __T.BUFF.invis = 0; });
  await G.evaluate(() => { const T = __T; T.TOWN.placeAt(T.hero.x, T.hero.z); }); await H.evaluate(() => { const T = __T, o = T.NET.others()[0]; if (o) T.TOWN.placeAt(o.pr.x + 2, o.pr.y); }); await H.waitForTimeout(4000);
  const h0 = await H.evaluate(() => ({ host: __FB.host(), others: __T.NET.others().map(o => [o.pr.n, o.pr.lv, o.pr.z]) })); console.log('③ host', JSON.stringify(h0)); ok(h0.host, '③ 첫 PC가 지역 호스트');
  await H.evaluate(() => { const T = __T, F = __FB; F.DBG.noEnsure = true; F.DBG.noBoss = true; for (const f of F.bots()) f.gone = true; const o = T.NET.others()[0], gi = Math.floor(o.pr.x), gj = Math.floor(o.pr.y);
    for (const m of T.foxes) if (!m.fb && !m.dead && Math.max(Math.abs(m.i - gi), Math.abs(m.j - gj)) <= 14) { m.dead = true; m.deadT = 0; }
    const B = F.roster().B; window.__NB = [F.spawnTest(B.find(x => x.cls === 'knight').uid, gi + 1, gj), F.spawnTest(B.find(x => x.cls === 'wizard').uid, gi + 2, gj + 2)]; });
  await G.evaluate(() => { __T.hero.hp = __T.hero.max; });
  await H.waitForTimeout(12000);
  const g1 = await G.evaluate(() => ({ hp: __T.hero.hp, max: __T.hero.max, stun: __T.BUFF.stun || 0 })), hb1 = await H.evaluate(() => window.__NB.map(f => f && f.bx && f.bx.tgt ? (f.bx.tgt.isRemote ? 'remote' : 'x') : '-'));
  console.log('③ 12초', JSON.stringify(g1), JSON.stringify(hb1)); ok(!hb1.includes('remote'), '③ 호스트의 라인 봇이 중립 게스트를 노리지 않음'); ok(g1.hp === g1.max, `③ 게스트 HP 그대로 (${g1.hp}/${g1.max})`);
  await H.screenshot({ path: 'dev/out/neutral_tag.png' });
  // 호스트가 억지로 보낸 봇 피해 → 게스트가 무시 · 몹 피해(대조)는 들어감
  const samp = () => G.evaluate(() => { window.__mh = __T.hero.hp; clearInterval(window.__mt); window.__mt = setInterval(() => { window.__mh = Math.min(window.__mh, __T.hero.hp); }, 30); });   /* HP가 금방 차서 가장 낮았던 HP로 봄 */
  await samp(); await H.evaluate(() => { const T = __T, o = T.NET.others()[0], P = T.NET.proxyOf(o.peer); T.NET.hitRaw(P, window.__NB[0], 77, false); }); await H.waitForTimeout(3500);
  const g2 = await G.evaluate(() => window.__mh); ok(g2 === g1.max, `③ 봇 이름으로 온 피해는 중립 게스트가 안 받음 (HP ${g2})`);
  await samp(); await H.evaluate(() => { const T = __T, o = T.NET.others()[0], P = T.NET.proxyOf(o.peer), m = T.foxes.filter(f => !f.fb && f.uid > 0 && !f.dead && T.MOB[f.kind] && !T.MOB[f.kind].boss && !T.MOB[f.kind].midb).sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z))[0]; if (m) { for (let k = 0; k < 6; k++) T.NET.hitRaw(P, m, 7, false); } });   /* 2구역은 유저 방어 v2(빗나감 있음) → 여러 번 */ await H.waitForTimeout(3500);
  const g3 = await G.evaluate(() => window.__mh); ok(g3 < g1.max, `③ (대조) 몹 이름으로 온 피해는 들어감 (HP ${g3})`);
  // 게스트 Lv56 → 호스트가 반왕으로 보고 노림
  { const bp = await H.evaluate(() => { const k0 = window.__NB.find(f => f && !f.dead && !f.gone); return k0 ? [k0.x, k0.z] : null; }); await G.evaluate(bp => { __T.GOD_INV = true; const T = __T; T.gainExp(1); T.hero.lv = 56; if (bp) T.TOWN.placeAt(bp[0] + 1, bp[1]); }, bp); } await H.waitForTimeout(12000);
  const hb2 = await H.evaluate(() => ({ t: window.__NB.map(f => f && f.bx && f.bx.tgt ? (f.bx.tgt.isRemote ? 'remote' : 'x') : '-'), lv: __T.NET.others()[0].pr.lv }));
  console.log('③ Lv56', JSON.stringify(hb2)); ok(hb2.lv === 56 && hb2.t.includes('remote'), '③ 게스트가 Lv.56이 되자 라인 봇이 노림 (반왕)');
  await H.screenshot({ path: 'dev/out/neutral_tag56.png' });
  console.log(errs.slice(0, 5).join('\n') || 'no errors'); ok(!errs.length, '오류 없음');
  console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
