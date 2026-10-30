// v191(10/30) 혈맹 + 필드 상주 봇 1단계 (bash dev/runkt.sh dev/tests/fieldbot.js · 보조 작업자는 KT_PORT=8773)
// ① 명단 38명(반왕 18·라인 20) · 같은 시각이면 두 PC가 같은 배치 ② 기준 레벨별 사냥터 분배 표 ③ 플레이어가 들어간 사냥터에 봇이 나타나 몹 사냥 (봇 혼자 잡은 몹은 보상 없음)
// ④ 반왕 봇 ↔ 라인 봇 전투 (봇끼리 잡으면 드랍 없음) ⑤ 플레이어가 라인 봇을 잡으면 타버린 불멸의 가호 · 반왕 봇은 공격 안 됨 ⑥ 라인 봇에게 죽으면 사망 손실 (가호가 있으면 가호가 탐)
// ⑦ 전체 채팅 알림은 같은 지역 3분에 한 번 ⑧ 두 브라우저(BroadcastChannel)에서 게스트도 같은 봇·이름표 · 패킷 크기 ⑨ 수호탑 대전은 그대로 (필드 봇 없음) ⑩ 오류 없음 · 성능
const { chromium } = require('playwright'); const login = require('../tq.js');
const REF = { lv: 55, fb: { lv: 55, c: 'knight', hp: 900, ac: -60, mr: 40, d: 45, cp: 5000 } };
const ok = (c, m) => console.log((c ? 'OK  ' : 'FAIL') + ' ' + m);
(async () => { const b = await chromium.launch(); const errs = [];
  const ctx1 = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx1.newPage(); p.on('pageerror', e => errs.push('P1: ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await login(p, { cls: 'knight', name: 'fbOne' });
  // ① 명단
  const R1 = await p.evaluate(() => { const F = window.__FB, R = F.roster(); return { n: R.all.length, A: R.A.length, B: R.B.length, cls: ['knight', 'elf', 'wizard'].map(c => c + ' ' + R.A.filter(b => b.cls === c).length + '/' + R.B.filter(b => b.cls === c).length), pct: [R.A.map(b => b.pct).join(','), R.B.map(b => b.pct).join(',')], names: R.A.slice(0, 4).map(b => b.name).concat(R.B.slice(0, 4).map(b => b.name)) }; });
  console.log('① roster', JSON.stringify(R1)); ok(R1.n === 38 && R1.A === 18 && R1.B === 20, '① 명단 38명 (반왕 18 · 라인 20)');
  const T0 = 1793330000000; const planA = await p.evaluate(T0 => JSON.stringify(window.__FB.planAt(T0, 55).at), T0);
  // ② 분배 표
  for (const lv of [12, 30, 45, 55]) { const t = await p.evaluate(([lv, T0]) => window.__FB.table(lv, T0), [lv, T0]); console.log(`② 기준 Lv${lv}:`, t.map(r => `${r.zone}(${r.rec}) 반왕${r.ban}·라인${r.lin} [봇 Lv${r.lv}]`).join(' / ')); }
  // ③ 사냥터에 들어가면 봇이 나타나 몹 사냥
  const Z = await p.evaluate(R => { const F = window.__FB; F.setRef(R); const P = F.plan(), L = [11, 12, 16, 17].map(z => [z, P.cnt[z] || 0]).sort((a, b) => b[1] - a[1]); return { z: L[0][0], n: L[0][1], cnt: P.cnt }; }, REF);
  console.log('③ plan now', JSON.stringify(Z));
  await p.evaluate(z => { __T.GOD_INV = true; __T.BUFF.invis = 9999; __T.TOWN.toZone(z); }, Z.z); await p.waitForTimeout(5500);
  const s3 = await p.evaluate(() => { const F = window.__FB; return { here: F.here(), host: F.host(), bots: F.bots().map(f => `${f.bot.clan}:${f.bot.name}:${f.bot.cls}:Lv${f.bot.st.lv}:HP${f.max}:AC${f.bot.st.ac}:D${Math.round(f.bot.st.d)}`) }; });
  console.log('③ bots in zone', JSON.stringify(s3)); ok(s3.here && s3.host && s3.bots.length === Math.min(Z.n, 8), `③ 사냥터(${Z.z})에 들어가자 봇 ${s3.bots.length}명 등장 (계획 ${Z.n}명)`);
  const before3 = await p.evaluate(() => ({ exp: __T.hero.exp, coins: __T.coins, mob: window.__FB.stat().mob }));
  const simMs = await p.evaluate(() => window.__FB.sim(120));
  const after3 = await p.evaluate(() => ({ exp: __T.hero.exp, coins: __T.coins, mob: window.__FB.stat().mob, die: window.__FB.stat().die, drop: window.__FB.stat().drop, n: window.__FB.bots().length }));
  console.log('③ sim 120s', simMs + 'ms', JSON.stringify(before3), JSON.stringify(after3)); ok(after3.mob > before3.mob, `③ 봇이 몬스터를 실제로 잡음 (120초 동안 ${after3.mob - before3.mob}마리)`); ok(after3.exp === before3.exp && after3.coins === before3.coins, '③ 봇이 잡은 몹은 내 경험치·골드에 안 들어옴');
  // ④ 반왕 ↔ 라인 봇 전투
  const s4 = await p.evaluate(() => { const F = window.__FB, H = __T.hero; F.DBG.noEnsure = true; for (const f of F.bots()) f.gone = true; const R = F.roster();
    const a1 = F.spawnTest(R.A.find(b => b.cls === 'knight').uid, H.i + 3, H.j - 1), a2 = F.spawnTest(R.A.find(b => b.cls === 'wizard').uid, H.i + 1, H.j - 3), b1 = F.spawnTest(R.B.find(b => b.cls === 'knight').uid, H.i + 4, H.j + 2), b2 = F.spawnTest(R.B.find(b => b.cls === 'elf').uid, H.i + 6, H.j + 3);
    return [a1, a2, b1, b2].map(f => f && f.bot.name); });
  await p.waitForTimeout(3500);
  const s4b = await p.evaluate(() => { const F = window.__FB; return F.bots().map(f => `${f.bot.clan}:${f.bot.name}:${Math.round(f.hp)}/${f.max}:${f.bx ? (f.bx.tgt ? 'PvP' : f.bx.goal) : '-'}`); });
  console.log('④ fight', JSON.stringify(s4), JSON.stringify(s4b)); ok(s4b.some(x => /PvP/.test(x)) && s4b.some(x => { const m = /:(\d+)\/(\d+):/.exec(x); return m && +m[1] < +m[2]; }), '④ 반왕 봇과 라인 봇이 만나 싸움 (피해 들어감)');
  const d4 = await p.evaluate(() => { const F = window.__FB, s0 = { ...F.stat() }; F.sim(40); const s1 = F.stat(); return { die: s1.die - s0.die, drop: s1.drop - s0.drop, left: F.bots().filter(f => !f.dead).map(f => f.bot.clan + ':' + f.bot.name) }; });
  console.log('④ after 40s', JSON.stringify(d4)); ok(d4.die > 0 && d4.drop === 0, `④ 봇끼리 싸워 ${d4.die}명 쓰러짐 · 드랍 없음`);
  // ⑤ 플레이어가 라인 봇을 잡으면 타버린 불멸의 가호 · 반왕 봇은 공격이 안 들어감
  const s5 = await p.evaluate(() => { const F = window.__FB, H = __T.hero; for (const f of F.bots()) f.gone = true; F.DBG.noAI = true; const R = F.roster();
    const a = F.spawnTest(R.A.find(b => b.cls === 'elf').uid, H.i - 1, H.j), e = F.spawnTest(R.B.find(b => b.cls === 'wizard').uid, H.i + 1, H.j); const aHp = a.hp; e.hp = 1;
    const g0 = __T.GROUND.here().filter(d => d.id === 'burnt_ward').length; let n = 0; while (!e.dead && n++ < 60) __T.strike(e); for (let k = 0; k < 20; k++) __T.strike(a);
    const g1 = __T.GROUND.here().filter(d => d.id === 'burnt_ward').length; return { tries: n, dead: e.dead, ward: g1 - g0, allyHp: [aHp, a.hp], msg: __T.log.slice(-6).map(l => l.t).filter(t => /쓰러뜨렸습니다/.test(t)), drop: F.stat().drop }; });
  console.log('⑤', JSON.stringify(s5)); ok(s5.dead && s5.ward === 1, '⑤ 플레이어가 라인 봇을 잡으면 타버린 불멸의 가호 1개'); ok(s5.allyHp[0] === s5.allyHp[1], '⑤ 반왕 봇은 공격이 안 들어감');
  await p.waitForTimeout(800); await p.screenshot({ path: 'dev/out/fb_ward.png' });
  // ⑥ 라인 봇에게 죽으면 사망 손실 (가호 없음 → 경험치 5%·골드 10% / 가호 있음 → 가호가 탐)
  const s6a = await p.evaluate(() => { const F = window.__FB, H = __T.hero; for (const f of F.bots()) f.gone = true; F.DBG.noAI = false; __T.GOD_INV = false; __T.BUFF.invis = 0; __T.setCoins(10000); H.exp = 6; H.hp = 4;
    const e = F.spawnTest(F.roster().B.find(b => b.cls === 'knight').uid, H.i + 1, H.j); return { bot: e && e.bot.name, ward: __T.INV.count('immortal_ward') }; });
  await p.waitForFunction(() => !!__T.DEATH, null, { timeout: 30000 }).catch(() => {});
  const d6 = await p.evaluate(() => ({ death: !!__T.DEATH, ward: !!(__T.DEATH && __T.DEATH.ward), msg: __T.log.slice(-4).map(l => l.t).filter(t => /쓰러졌습니다/.test(t)) }));
  await p.screenshot({ path: 'dev/out/fb_death.png' });
  await p.click('#death-town'); await p.waitForTimeout(800);
  const r6 = await p.evaluate(() => ({ scene: __T.SCENE, coins: __T.coins, exp: __T.hero.exp }));
  console.log('⑥ no ward', JSON.stringify(s6a), JSON.stringify(d6), JSON.stringify(r6)); ok(d6.death && !d6.ward && r6.coins === 9000, '⑥ 라인 봇에게 죽으면 몬스터와 같은 사망 손실 (골드 10% · 경험치 5%)');
  await p.evaluate(z => { __T.INV.add('immortal_ward', 1); __T.TOWN.toZone(z); }, Z.z); await p.waitForTimeout(1500);
  const bw0 = await p.evaluate(() => { const F = window.__FB, H = __T.hero; for (const f of F.bots()) f.gone = true; __T.BUFF.invis = 0; H.hp = 4; F.spawnTest(F.roster().B.find(b => b.cls === 'knight').uid, H.i + 1, H.j); return __T.GROUND.here().filter(d => d.id === 'burnt_ward').length; });
  await p.waitForFunction(() => !!__T.DEATH, null, { timeout: 30000 }).catch(() => {});
  const d6b = await p.evaluate(() => ({ death: !!__T.DEATH, ward: !!(__T.DEATH && __T.DEATH.ward), left: __T.INV.count('immortal_ward'), burnt: __T.GROUND.here().filter(d => d.id === 'burnt_ward').length }));
  await p.click('#death-town'); await p.waitForTimeout(800); const r6b = await p.evaluate(() => ({ coins: __T.coins }));
  console.log('⑥ ward', JSON.stringify(d6b), JSON.stringify(r6b)); ok(d6b.death && d6b.ward && d6b.left === 0 && d6b.burnt - bw0 === 1 && r6b.coins === 9000, '⑥ 불멸의 가호가 있으면 가호가 대신 타고 손실 없음');
  // ⑦ 전체 채팅 알림: 같은 지역은 3분에 한 번
  const a7 = await p.evaluate(() => ({ alerts: window.__FB.stat().alerts, chat: __T.log.map(l => l.t).filter(t => /전투 중입니다/.test(t)) }));
  const zs = a7.alerts.map(t => t.split('에서 ')[0]); console.log('⑦', JSON.stringify(a7));
  ok(a7.alerts.length >= 1 && new Set(zs).size === zs.length && a7.chat.length === a7.alerts.length, `⑦ 알림 ${a7.alerts.length}번 (같은 지역 중복 없음 · 여러 번 싸웠지만 3분 안에는 한 번)`);
  // 스크린샷: 트인 사냥터(사막필드 1구간 · 기준 Lv18로 봇 Lv11~18)에서 반왕 봇 사냥 → 라인 봇이 와서 전투 (채팅 알림)
  await p.evaluate(() => { window.__FB.setRef({ lv: 18, fb: { lv: 18, c: 'knight', hp: 260, ac: -14, mr: 8, d: 16, cp: 900 } }); __T.GOD_INV = true; __T.BUFF.invis = 0; __T.TOWN.toZone(3); }); await p.waitForTimeout(800);
  await p.evaluate(() => { const F = window.__FB, R = F.roster(); F.DBG.noEnsure = true; for (const f of F.bots()) f.gone = true; __T.TOWN.placeAt(27.5, 30.5); const H = __T.hero;
    F.spawnTest(R.A.find(b => b.cls === 'knight').uid, H.i - 4, H.j + 2); F.spawnTest(R.A.find(b => b.cls === 'elf').uid, H.i + 4, H.j - 3); F.spawnTest(R.A.find(b => b.cls === 'wizard').uid, H.i - 3, H.j - 4); });
  await p.waitForTimeout(8000); const hs = await p.evaluate(() => window.__FB.bots().map(f => f.bot.name + ':' + (f.bx ? f.bx.goal : '-'))); console.log('shot hunt', JSON.stringify(hs));
  await p.screenshot({ path: 'dev/out/fb_hunt.png' });
  const fc = await p.evaluate(() => { const F = window.__FB, R = F.roster(), L = F.bots(), c = L[0] || __T.hero; __T.BUFF.invis = 9999; F.spawnTest(R.B.find(b => b.cls === 'knight').uid, c.i + 3, c.j + 1); F.spawnTest(R.B.find(b => b.cls === 'wizard').uid, c.i + 5, c.j - 2); F.spawnTest(R.B.find(b => b.cls === 'elf').uid, c.i + 6, c.j + 3); __T.TOWN.placeAt(c.x + 1, c.z + 3); return [c.i, c.j]; });
  await p.waitForTimeout(3200); await p.screenshot({ path: 'dev/out/fb_fight.png' });
  await p.screenshot({ path: 'dev/out/fb_label.png', clip: { x: 320, y: 80, width: 640, height: 400 } });
  await p.evaluate(R => { window.__FB.setRef(R); __T.BUFF.invis = 0; }, REF);
  // 성능: 같은 사냥터에서 봇 8명 + 몹 vs 몹만 (헤드리스 크롬 기준)
  await p.evaluate(z => { __T.GOD_INV = true; __T.BUFF.invis = 0; window.__FB.DBG.noEnsure = false; __T.TOWN.toZone(z); }, Z.z); await p.waitForTimeout(500);
  await p.evaluate(() => { const F = window.__FB, H = __T.hero; F.DBG.noEnsure = true; for (const f of F.bots()) f.gone = true; const R = F.roster(); for (let k = 0; k < 8; k++) F.spawnTest((k % 2 ? R.B : R.A)[k].uid, H.i + (k % 4) * 2 - 3, H.j + Math.floor(k / 4) * 3 - 2); });
  const fps = () => p.evaluate(() => new Promise(r => { let n = 0, w = 0; const t0 = performance.now(); let l = t0; const f = t => { n++; w = Math.max(w, t - l); l = t; if (t - t0 < 3000) requestAnimationFrame(f); else r({ fps: Math.round(n / ((t - t0) / 1000)), worst: Math.round(w) }); }; requestAnimationFrame(f); }));
  const perfB = await fps(); const simB = await p.evaluate(() => window.__FB.sim(30)); const nB = await p.evaluate(() => ({ bots: window.__FB.bots().length, mobs: __T.foxes.filter(f => !f.fb && !f.dead).length }));
  await p.screenshot({ path: 'dev/out/fb_perf.png' });
  await p.evaluate(() => { for (const f of window.__FB.bots()) f.gone = true; }); await p.waitForTimeout(300);
  const perfN = await fps(); const simN = await p.evaluate(() => window.__FB.sim(30));
  console.log('perf', JSON.stringify({ with: { ...perfB, sim30ms: simB, ...nB }, without: { ...perfN, sim30ms: simN } }));
  await p.evaluate(() => { window.__FB.DBG.noEnsure = false; });
  // ⑨ 수호탑 대전: 필드 봇 없이 그대로
  await p.evaluate(() => { __T.TOWN.goTown(); }); await p.waitForTimeout(600); await p.evaluate(() => window.__TW.enter()); await p.waitForTimeout(2500);
  const s9 = await p.evaluate(() => { const S0 = window.__TW.state(); const r = window.__TW.sim(150); return { here: window.__FB.here(), fb: __T.foxes.filter(f => f.fb).length, tw: __T.foxes.filter(f => f.bot && !f.fb).length, ph0: S0 && S0.ph, r }; });
  console.log('⑨ TW', JSON.stringify(s9)); ok(!s9.here && s9.fb === 0 && s9.tw >= 36 && s9.r.S && (s9.r.S.ph === 'fight' || s9.r.S.ph === 'end'), '⑨ 수호탑 대전은 그대로 (필드 봇 없음 · 봇 20 대 20 진행)');
  await p.evaluate(() => { try { __T.TOWN.goTown(); } catch (e) {} });
  // ⑧ 두 브라우저 (BroadcastChannel): 같은 시각이면 같은 배치 · 게스트도 같은 봇·이름표
  const ctx = await b.newContext({ viewport: { width: 1100, height: 720 } }); const pg = []; for (const nm of ['fbHost', 'fbGst']) { const q = await ctx.newPage(); q.on('pageerror', e => errs.push(nm + ': ' + e.message)); await login(q, { cls: nm === 'fbHost' ? 'knight' : 'elf', name: nm, mp: true }); pg.push(q); }
  const plans = await Promise.all(pg.map(q => q.evaluate(T0 => JSON.stringify(window.__FB.planAt(T0, 55).at), T0)));
  ok(plans[0] === plans[1] && plans[0] === planA, '① 같은 시각·같은 기준 레벨이면 세 PC 모두 같은 배치');
  await pg[0].waitForTimeout(2500);
  const refs = await Promise.all(pg.map(q => q.evaluate(() => { const r = window.__FB.ref(); return r.n + ' Lv' + r.lv; }))); console.log('⑧ 기준 유저 (각 PC가 고른 것)', JSON.stringify(refs)); ok(refs[0] === refs[1], '⑧ 두 PC가 같은 기준 유저를 고름 (presence 전투력)');
  for (const q of pg) await q.evaluate(([R, z]) => { window.__FB.setRef(R); __T.GOD_INV = true; __T.TOWN.toZone(z); }, [REF, Z.z]);
  await pg[0].waitForTimeout(1200); await pg[1].evaluate(() => { const H = __T.hero; __T.TOWN.placeAt(H.x + 1, H.z); }); await pg[0].waitForTimeout(7000);
  const sv = await Promise.all(pg.map(q => q.evaluate(() => { const F = window.__FB, P = [[__T.hero.x, __T.hero.z], ...__T.NET.others().filter(o => o.pr.z === 'isle' + __T.ISLE.id).map(o => [o.pr.x, o.pr.y])];
    return { host: F.host(), all: F.bots().filter(f => !f.dead).map(f => f.bot.clan + ':' + f.bot.name).sort(), near: F.bots().filter(f => !f.dead && P.some(([x, z]) => Math.max(Math.abs(f.x - x), Math.abs(f.z - z)) <= 18)).map(f => f.bot.clan + ':' + f.bot.name).sort(), tagged: F.bots().every(f => !!f.bot && !!f.bot.clan) }; })));
  const H = sv[0].host ? 0 : 1, G = 1 - H; console.log('⑧', JSON.stringify(sv));
  ok(sv[H].host && !sv[G].host && sv[G].all.length > 0 && sv[H].near.every(x => sv[G].all.includes(x)) && sv[G].all.every(x => sv[H].all.includes(x)) && sv[G].tagged, `⑧ 게스트도 호스트와 같은 봇이 보임 (호스트 ${sv[H].all.length}명 · 게스트 ${sv[G].all.length}명 · 18칸 안 ${sv[H].near.length}명 모두 일치)`);
  const pk = await pg[H].evaluate(() => { const P = __T.NET.dbgPayload(), all = JSON.stringify(P).length, m = (P.m || []).length, bots = (P.m || []).filter(r => window.__FB.isUid(r[0])).length; return { all, m, bots, botBytes: JSON.stringify((P.m || []).filter(r => window.__FB.isUid(r[0]))).length, fbx: P.fbx ? JSON.stringify(P.fbx).length : 0, fb: P.fb ? JSON.stringify(P.fb).length : 0, cap: window.__bigNet ? 60000 : 3900 }; });
  console.log('⑧ 패킷(호스트 presence)', JSON.stringify(pk));
  await pg[G].screenshot({ path: 'dev/out/fb_guest.png' }); await pg[H].screenshot({ path: 'dev/out/fb_host.png' });
  const al = await Promise.all(pg.map(q => q.evaluate(() => __T.log.map(l => l.t).filter(t => /전투 중입니다/.test(t)))));
  console.log('⑧ 알림 (호스트·게스트 채팅)', JSON.stringify(al)); ok(al[H].length <= 1 && al[G].length <= 1 && al[H].length === al[G].length, '⑦ 같은 싸움 알림은 호스트·게스트 모두 한 번씩만');
  // /혈맹 명령 (채팅창)
  await pg[G].evaluate(() => { const e = document.getElementById('chat-in'); e.value = '/혈맹'; __T.CHAT.send(); }); await pg[G].waitForTimeout(400);
  console.log('/혈맹', JSON.stringify(await pg[G].evaluate(() => __T.log.slice(-3).map(l => l.t).filter(t => /^\[혈맹\]/.test(t)))));
  await pg[G].screenshot({ path: 'dev/out/fb_chat.png' });
  ok(errs.length === 0, '⑩ 오류 없음'); console.log(errs.join('\n') || 'no errors'); await b.close(); })();
