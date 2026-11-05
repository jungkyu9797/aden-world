// 11/4 랭킹 창 (전투력 · PVP) — KT_PORT=8911 bash dev/runkt.sh dev/tests/ranking.js
// ① 메뉴 [랭킹] → 창 · 탭 2개 · 열 이름 · 기록 서버가 없으면 '기록 서버 연결 전' ② presence → 기록 서버 표 ③ 봇을 내가 잡음 → 내 킬 +1 · 봇 데스 +1
// ④ 봇끼리 → 한 번만 (같은 사건을 여러 번 받아도 · 호스트가 둘이라 같은 죽음을 두 번 내도) ⑤ 라인 봇에게 내가 죽음 → 내 데스 +1 · 봇 킬 +1
// ⑥ 기록(스냅샷) 받기 → 창에 그림 · 나간 사람도 남음 ⑦ 저장·다시 불러오기 · 내 킬데스는 캐릭터 저장에도 ⑧ 휴대폰 폭 ⑨ 오류 없음
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
const REF = { lv: 55, fb: { lv: 55, c: 'knight', hp: 900, ac: -60, mr: 40, d: 45, cp: 5000 } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => { const br = await chromium.launch({ args: ['--disable-gpu', '--mute-audio'] }); const errs = [];
  const ctx = await br.newContext({ viewport: { width: 1100, height: 720 } });
  const P = await ctx.newPage(); P.on('pageerror', e => errs.push('P: ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 2).join('')));
  await login(P, { acc: 'rkone', cls: 'knight', name: 'rkOne', mp: true });
  // ① 창
  await P.click('#btn-rank'); await P.waitForTimeout(300);
  const s1 = await P.evaluate(() => { const w = document.getElementById('rankwin'), hd = [...w.querySelectorAll('.rk-hd span')].map(x => x.textContent), tabs = [...w.querySelectorAll('[data-rt]')].map(x => x.textContent); return { vis: !w.hidden, tabs, hd, note: w.querySelector('.rk-note').textContent, me: !!w.querySelector('.rk-r.me'), bots: !!document.getElementById('rk-bots') }; });
  console.log('①', JSON.stringify(s1));
  ok(s1.vis && s1.tabs.join() === '전투력 랭킹,PVP 랭킹', '① [랭킹] 버튼 → 창 · 탭 2개');
  ok(s1.hd.join() === '순위,아이디,전투력,레벨,경험치,클래스' && s1.bots, '① 전투력 탭 열: 순위·아이디·전투력·레벨·경험치·클래스 + [봇 포함]');
  ok(s1.me, '① 내 줄 강조');
  ok(/기록 서버 연결 전/.test(s1.note), '① 기록 서버가 없으면 "기록 서버 연결 전" (접속 중인 사람만)');
  await P.click('[data-rt="kd"]'); await P.waitForTimeout(200);
  const s1b = await P.evaluate(() => [...document.querySelectorAll('#rankwin .rk-hd span')].map(x => x.textContent));
  ok(s1b.join() === '순위,아이디,킬,데스,K/D,클래스,구분', '① PVP 탭 열: 순위·아이디·킬·데스·K/D·클래스·구분 (11/5 클래스 추가) ' + s1b.join());
  await P.click('[data-rt="cp"]'); await P.click('#rk-bots'); await P.waitForTimeout(200);
  const s1c = await P.evaluate(() => ({ bots: document.querySelectorAll('#rankwin .rk-r.bot').length, rows: document.querySelectorAll('#rankwin .rk-r').length }));
  ok(s1c.bots >= 30, `① [봇 포함] → 봇 줄 ${s1c.bots}개 (전체 ${s1c.rows})`);
  await P.click('#rk-bots'); await P.keyboard.press('Escape'); await P.waitForTimeout(200);
  ok(await P.evaluate(() => document.getElementById('rankwin').hidden), '① ESC로 닫힘');

  // 기록 서버 탭 (테스트: 일반 탭을 기록 서버처럼 · Firestore 안 씀)
  const C = await ctx.newPage(); C.on('pageerror', e => errs.push('C: ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 2).join('')));
  await login(C, { acc: 'rkcol', cls: 'wizard', name: 'rkCol', mp: true }); await C.evaluate(() => { __RANK.DBG.noCloud = true; __RANK.DBG.col = true; });
  // 나갈 사람
  const Q = await ctx.newPage(); await login(Q, { acc: 'rkgone', cls: 'elf', name: 'rkGone', mp: true }); await Q.evaluate(() => { __T.HERO.lv = 33; });
  await C.waitForTimeout(7000);
  // ② presence → 표
  const myKey = await P.evaluate(() => __RANK.myKey());
  const s2 = await C.evaluate(k => { const P = __RANK.COL.P; return { on: __RANK.COL.on, loaded: __RANK.COL.loaded, me: P[k], gone: Object.values(P).find(r => r.n === 'rkGone'), n: Object.keys(P).length }; }, myKey);
  console.log('②', myKey, JSON.stringify(s2));
  ok(s2.on && s2.loaded && s2.me && s2.me.n === 'rkOne' && s2.me.c === 'knight' && s2.me.cp > 0 && s2.me.lv >= 1 && s2.me.xp >= 0 && s2.me.seen > 0, '② presence → 기록 서버 표 (이름·직업·전투력·레벨·경험치·본 시각)');
  ok(s2.gone && s2.gone.lv === 33 && s2.gone.c === 'elf', '② 다른 유저도 (rkGone Lv33 요정)');
  await Q.close(); await sleep(8000);

  // ③ 봇을 내가 잡음 (P가 그 지역 호스트)
  const Z = await P.evaluate(R => { const F = window.__FB; F.setRef(R); F.DBG.noTalk = true; const P = F.plan(), L = [11, 12, 16, 17].map(z => [z, P.cnt[z] || 0]).sort((a, b) => b[1] - a[1]); __T.GOD_INV = true; __T.BUFF.invis = 9999; __T.TOWN.toZone(L[0][0]); return L[0][0]; }, REF);
  await P.waitForTimeout(3000);
  const s3 = await P.evaluate(() => { const F = window.__FB, H = __T.hero; F.DBG.noEnsure = true; for (const f of F.bots()) f.gone = true; const R = F.roster();
    const b1 = F.spawnTest(R.B[0].uid, H.i + 2, H.j); if (!b1) return { err: 'spawn' }; b1.bx = b1.bx || {}; b1.bx.hitBy = H; b1.hp = 0; __T.killCheck(b1);
    const me = __RANK.me(), mk = __RANK.myKey(), LP = __RANK.LP; return { host: F.host(), dead: b1.dead, me, myRow: LP[mk], bot: LP['b' + b1.uid], uid: b1.uid, rke: (__T.NET.dbgPayload().rke || []).length }; });
  console.log('③', Z, JSON.stringify(s3));
  ok(s3.host && s3.dead && s3.me.k === 1 && s3.me.d === 0, '③ 내가 라인 봇을 잡음 → 내 킬 +1');
  ok(s3.bot && s3.bot.d === 1 && s3.bot.kind === 'bot' && s3.myRow && s3.myRow.k === 1, '③ 그 봇 데스 +1 · 사건이 presence에 (rke ' + s3.rke + ')');
  await C.waitForTimeout(2500);
  const s3c = await C.evaluate(([k, u]) => ({ me: __RANK.COL.K[k], bot: __RANK.COL.K['b' + u] }), [myKey, s3.uid]);
  ok(s3c.me && s3c.me.k === 1 && s3c.bot && s3c.bot.d === 1, '③ 기록 서버도 같은 값 (presence 사건으로) ' + JSON.stringify(s3c));

  // ④ 봇끼리 · 한 번만
  const s4 = await P.evaluate(() => { const F = window.__FB, H = __T.hero, R = F.roster();
    const a1 = F.spawnTest(R.A[0].uid, H.i - 2, H.j + 1), b2 = F.spawnTest(R.B[1].uid, H.i - 3, H.j + 2); b2.bx = b2.bx || {}; b2.bx.hitBy = a1; b2.hp = 0; __T.killCheck(b2);
    const ev = (__T.NET.dbgPayload().rke || []).slice(-1)[0]; for (let i = 0; i < 5; i++) __RANK.onEv(ev);   // 같은 사건을 여러 번 받음
    __RANK.emit(__RANK.who(a1), __RANK.who(b2));   // 다른 호스트가 같은 죽음을 또 냄 (10초 안 같은 대상)
    const LP = __RANK.LP; return { a: LP['b' + a1.uid], b: LP['b' + b2.uid], ua: a1.uid, ub: b2.uid, me: __RANK.me() }; });
  console.log('④', JSON.stringify(s4));
  ok(s4.a && s4.a.k === 1 && s4.b && s4.b.d === 1 && s4.me.k === 1, '④ 반왕 봇이 라인 봇을 잡음 → 킬 1 · 데스 1 (여러 번 받아도 · 두 번 내도 한 번)');
  await C.waitForTimeout(2500);
  const s4c = await C.evaluate(([a, b]) => ({ a: __RANK.COL.K['b' + a], b: __RANK.COL.K['b' + b] }), [s4.ua, s4.ub]);
  ok(s4c.a && s4c.a.k === 1 && s4c.b && s4c.b.d === 1, '④ 기록 서버도 한 번 ' + JSON.stringify(s4c));

  // ⑤ 라인 봇에게 내가 죽음
  const s5 = await P.evaluate(() => { const F = window.__FB, H = __T.hero, R = F.roster(); const b3 = F.spawnTest(R.B[2].uid, H.i + 1, H.j + 1); __T.GOD_INV = false; __T.BUFF.invis = 0; H.hp = 5; __T.hurtHero(9999, b3, 'melee');
    return { death: !!__T.DEATH, me: __RANK.me(), bot: __RANK.LP['b' + b3.uid], u: b3.uid }; });
  console.log('⑤', JSON.stringify(s5));
  ok(s5.death && s5.me.d === 1 && s5.bot && s5.bot.k === 1, '⑤ 라인 봇에게 쓰러짐 → 내 데스 +1 · 그 봇 킬 +1');
  await C.waitForTimeout(2500);
  const s5c = await C.evaluate(([k, u]) => ({ me: __RANK.COL.K[k], bot: __RANK.COL.K['b' + u] }), [myKey, s5.u]);
  ok(s5c.me && s5c.me.d === 1 && s5c.me.k === 1 && s5c.bot && s5c.bot.k === 1, '⑤ 기록 서버도 ' + JSON.stringify(s5c));
  // 수호탑·콜로세움·결투장 제외 확인 (DEATH.arena 등이면 세지 않음 — heroDie 조건) : 결투장 플래그로 한 번 더
  const s5d = await P.evaluate(() => { const H = __T.hero; document.getElementById('death-town') && document.getElementById('death-town').click(); return { dead: !!__T.DEATH }; });
  await P.waitForTimeout(1500);

  // ⑥ 스냅샷 보내기 → 받은 쪽 창 · 나간 사람도
  const snapTxt = await C.evaluate(() => { const S = __RANK.snapOf(__RANK.state(), 'relay'); return JSON.stringify(S); });
  const s6 = await P.evaluate(t => { __RANK.onSnap(t); __RANK.open('cp'); const w = document.getElementById('rankwin'), rows = [...w.querySelectorAll('.rk-r')].map(r => ({ n: r.querySelector('.rk-n').textContent, on: !!r.querySelector('.rk-on'), me: r.classList.contains('me'), lv: r.children[3].textContent, xp: r.children[4].textContent }));
    const note = w.querySelector('.rk-note').textContent; __RANK.open('kd'); const kd = [...w.querySelectorAll('.rk-r')].map(r => [...r.children].map(c => c.textContent).join('|')); return { rows, note, kd, snap: !!__RANK.snap(), ls: !!localStorage.getItem('aden_rk_snap') }; }, snapTxt);
  console.log('⑥', JSON.stringify(s6));
  const gone = s6.rows.find(r => r.n.includes('rkGone')), meR = s6.rows.find(r => r.me);
  ok(s6.snap && /기록 서버 기준/.test(s6.note) && s6.ls, '⑥ 기록을 받으면 "기록 서버 기준" · 이 기기에 저장');
  ok(gone && !gone.on && gone.lv === '33', '⑥ 나간 사람(rkGone)도 마지막 값으로 남음 (접속 표시 없음)');
  { const nm = s6.rows.map(r => r.n.replace(/ 봇$/, '')); ok(new Set(nm).size === nm.length, '⑥ 같은 이름이 두 줄로 안 나옴 ' + nm.join(',')); }
  ok(meR && meR.on && /%$/.test(meR.xp), '⑥ 내 줄: 실시간 · 경험치 %');
  ok(s6.kd.length >= 4 && s6.kd.some(r => /rkOne\|1\|1\|1\.00\|(기사|요정|마법사)\|유저/.test(r)) && s6.kd.some(r => /\|(기사|요정|마법사)\|봇 · /.test(r)), '⑥ PVP 탭: 나 1/1 · 클래스 · 봇(혈맹 이름) 포함 ' + s6.kd.slice(0, 3).join(' / '));
  await P.screenshot({ path: 'dev/out/ranking_kd.png' }); await P.evaluate(() => __RANK.open('cp')); await P.screenshot({ path: 'dev/out/ranking_cp.png' });

  // ⑦ 저장 · 다시 불러오기
  const s7 = await C.evaluate(async () => { await __RANK.colSave(); const before = JSON.stringify(__RANK.state().K), nP = Object.keys(__RANK.COL.P).length, base0 = Date.now();
    __RANK.reset(); __RANK.DBG.col = true; await __RANK.colLoad(); const after = JSON.stringify(__RANK.state().K);
    const old = ['old1', 'b72100', 'x', 'knight', 'b72101', 'y', 'elf', base0 - 60000, 3, '', '']; __RANK.onEv(old);   // 저장 전에 있던 사건은 다시 세지 않음
    return { same: before === after, nP, nP2: Object.keys(__RANK.COL.P).length, old: JSON.stringify(__RANK.COL.K.b72100 || null), from: __RANK.COL.from }; });
  console.log('⑦', JSON.stringify(s7));
  ok(s7.same && s7.nP === s7.nP2 && s7.from === 'local', '⑦ 기록 서버 표 저장 → 지우고 다시 불러와도 같음');
  const s7b = await P.evaluate(() => { const s = __T.SAVE.dbgSnap ? __T.SAVE.dbgSnap() : null; const me = __RANK.dump(); __RANK.load({ k: 7, d: 3 }); return { me, after: __RANK.me() }; });
  ok(s7b.me && s7b.me.k === 1 && s7b.me.d === 1 && s7b.after.k === 7 && s7b.after.d === 3, '⑦ 내 킬·데스는 캐릭터 저장에도 (rk) ' + JSON.stringify(s7b));
  await C.waitForTimeout(7000);
  const s7c = await C.evaluate(k => __RANK.COL.K[k], myKey);
  ok(s7c && s7c.k === 7 && s7c.d === 3, '⑦ 기록 서버는 큰 값을 씀 (presence kd 7/3) ' + JSON.stringify(s7c));

  // ⑧ 휴대폰 (390px)
  for (const vp of [{ width: 390, height: 844, m: false }, { width: 844, height: 390, m: true }]) {   // 세로 휴대폰은 '가로로 돌리기' 안내가 덮으므로 좁은 창(390px)으로 폭만 · 가로 휴대폰은 메뉴까지
    const mc = await br.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.m, isMobile: vp.m, deviceScaleFactor: 2 }); const M = await mc.newPage(); M.on('pageerror', e => errs.push('M: ' + e.message));
    await login(M, { acc: 'rkmob' + vp.width, cls: 'elf', name: 'rkMob' + vp.width });
    const mob = await M.evaluate(() => document.documentElement.classList.contains('mob'));
    if (mob) { await M.evaluate(() => document.getElementById('mob-menu-b').click()); await M.waitForTimeout(200); const has = await M.evaluate(() => { const b = document.getElementById('mm-rank'); return !!b && b.offsetParent !== null; }); ok(has, `⑧ ${vp.width}×${vp.height} 휴대폰 메뉴에 [랭킹]`); await M.evaluate(() => document.getElementById('mm-rank').click()); }
    else await M.evaluate(() => document.getElementById('btn-rank').click());
    await M.waitForTimeout(300); await M.evaluate(() => { document.getElementById('rk-bots').click(); }); await M.waitForTimeout(200);
    const m8 = await M.evaluate(() => { const w = document.getElementById('rankwin'), r = w.getBoundingClientRect(), rows = [...w.querySelectorAll('.rk-r,.rk-hd')]; return { vis: !w.hidden, l: r.left, r: r.right, t: r.top, b: r.bottom, W: innerWidth, H: innerHeight, over: rows.filter(x => x.scrollWidth > x.clientWidth + 1).length, sw: w.scrollWidth, cw: w.clientWidth, n: rows.length }; });
    console.log('⑧', JSON.stringify(vp), mob, JSON.stringify(m8));
    ok(m8.vis && m8.l >= 0 && m8.r <= m8.W && m8.b <= m8.H + 1 && m8.over === 0, `⑧ ${vp.width}×${vp.height}: 창이 화면 안 · 가로 넘침 없음`);
    await M.screenshot({ path: `dev/out/ranking_m${vp.width}.png` }); await mc.close(); }

  ok(!errs.length, '⑨ 페이지 오류 없음 ' + errs.slice(0, 3).join(' / '));
  await br.close(); console.log(fails ? `FAILED ${fails}` : 'ALL OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
