// 11/1 봇 호스트 모드(24시간 봇 서버) — KT_PORT=8785 bash dev/runkt.sh dev/tests/bothost.js
// ① 봇 호스트 탭: 지역 자동 입장 · 호스트 · 그림 없음 · 캔버스 1×1 · 바닥 캔버스 없음 · 루프 20Hz · presence 작음(bh:1 · 사람 표시 칸 없음) · 저장 안 함 · 귀환 막힘
// ② 유저가 먼저 호스트였어도 봇 호스트가 들어오면 호스트를 넘김 · 유저 탭에서 봇이 보이고(호스트 몬스터 목록) 봇 호스트는 접속자 목록·cp 후보에 없음 · fbx(봇 연출)도 받음
// ③ 유저가 나가도 봇 호스트는 계속 호스트로 돌아감(보는 사람이 없으면 몬스터 목록 없이 0.5초 주기) · 다시 들어오면 다시 게스트 ④ 몬스터가 봇 호스트를 노리지 않음 ⑤ __BH 값 ⑥ 오류 없음
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
const U = 'http://127.0.0.1:' + (process.env.KT_PORT || 8766) + '/_kt2.html';
const REF = { lv: 55, fb: { lv: 55, c: 'knight', hp: 900, ac: -60, mr: 40, d: 45, cp: 5000 } }, Z = 12;
(async () => { const br = await chromium.launch({ args: ['--disable-gpu', '--mute-audio'] }); const ctx = await br.newContext({ viewport: { width: 1100, height: 720 } }); const errs = [];
  // 봇 호스트 계정(캐릭터 1개) 만들기 — 일반 로그인으로
  { const q = await ctx.newPage(); await login(q, { acc: 'bhacc', cls: 'elf', name: 'BotHostE', mp: true }); await q.close(); }
  // 유저 탭: 먼저 지역에 들어가 호스트가 됨
  const P = await ctx.newPage(); P.on('pageerror', e => errs.push('P: ' + e.message)); await login(P, { acc: 'bhuser', cls: 'knight', name: 'bhUser', mp: true });
  await P.evaluate(([R, z]) => { __FB.setRef(R); __FB.DBG.noTalk = true; __T.GOD_INV = true; __T.TOWN.toZone(z); }, [REF, Z]); await P.waitForTimeout(1500);
  const h0 = await P.evaluate(() => ({ host: __T.NET.zoneHost(), n: __T.NET.count(), bots: __FB.bots().length })); ok(h0.host && h0.n === 1, '② 유저 혼자 들어가면 유저가 호스트 ' + JSON.stringify(h0));
  // 봇 호스트 탭: ?bothost=1&zone=12 · 로그인 화면에 계정/비번 입력(러너와 같은 방식) → 캐릭터 자동 선택 → 지역 자동 입장
  const B = await ctx.newPage(); B.on('pageerror', e => errs.push('B: ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 2).join(''))); const logs = []; B.on('console', m => { if (/\[BH\]/.test(m.text())) logs.push(m.text()); });
  await B.goto(U + '?mp=bc&bothost=1&zone=' + Z); await B.waitForSelector('#lg-acc', { state: 'visible' }); await B.fill('#lg-acc', 'bhacc'); await B.fill('#lg-pw', 'abcd'); await B.click('#lg-go');
  await B.waitForFunction(() => window.__BH && __BH.ok, null, { timeout: 30000 }).catch(() => {}); await B.evaluate(R => { __FB.setRef(R); __FB.DBG.noTalk = true; }, REF); await B.waitForTimeout(3500);
  // ① 봇 호스트 탭 상태
  const b1 = await B.evaluate(() => { const R = performance.getEntriesByType('resource').map(r => r.name); const pr = __T.NET.dbgPayload();
    return { BH: Object.assign({}, window.__BH), scene: __T.SCENE, isle: __T.ISLE && __T.ISLE.id, host: __T.NET.zoneHost(), cv: [document.getElementById('cv').width, document.getElementById('cv').height], ground: !!(__T.ISLE && __T.ISLE.ground), imgs: R.filter(n => /\.(webp|mp3|woff|ttf)/.test(n) || /classic\//.test(n)).length, imgList: R.filter(n => !/_kt2|map_data|googleapis/.test(n)).map(n => n.split('/').slice(-2).join('/')), mimg: Object.values(__T.MSHEET).length, imgComplete: (() => { const i = new Image(); i.src = 'assets/classic/ground.webp'; return i.complete; })(),
      saveOn: __T.SAVE.on(), invis: __T.BUFF.invis > 1000, god: __T.GOD_INV, extraBh: __T.NET.extraOf('bh'), prKeys: Object.keys(pr).filter(k => pr[k] != null).sort(), prSize: JSON.stringify(pr).length, bots: __FB.bots().length, meBh: __FB.meBh(), writer: __FB.amWriter(), top: __FB.amTop(), timer: __BH.timer, vis: document.visibilityState }; });
  console.log('① bh', JSON.stringify(b1).slice(0, 900)); console.log('① resources', JSON.stringify(b1.imgList));
  ok(b1.BH.ok && b1.scene === 'field' && b1.isle === Z && b1.BH.phase === 'run', `① 로그인 뒤 캐릭터를 골라 ${Z}번 지역에 자동 입장 (__BH.ok · phase run)`);
  ok(b1.cv[0] === 1 && b1.cv[1] === 1 && !b1.ground && b1.imgs === 0 && !b1.imgComplete && !b1.imgList.some(n => /\.(webp|mp3)/.test(n)), `① 캔버스 1×1 · 바닥 캔버스 없음 · 그림(webp)·소리(mp3) 파일 0개 받음(Image 껍데기 · 배경음 preload 취소) ${JSON.stringify(b1.cv)}`);
  ok(b1.BH.fps >= 19 && b1.BH.fps <= 22 && b1.timer === 'worker' && b1.BH.errN === 0, `① 루프 ${b1.BH.fps}Hz (워커 타이머 50ms) · frame 오류 ${b1.BH.errN}`);
  ok(!b1.saveOn && b1.invis && b1.god && b1.extraBh === 1 && b1.meBh && b1.writer && !b1.top, '① 저장 꺼짐 · 투명·무적 · presence bh:1 · 사진 작성자(meBh)지만 cp 후보 아님');
  ok(b1.prKeys.every(k => ['n', 'c', 'lv', 'z', 'x', 'y', 'r', 'hp', 'hm', 'bh', 'bk', 'm', 'mz', 'bt', 'tk', 'ao', 'd', 'gi', 'go', 'rw', 'gv', 'rp', 'an', 'fbx'].includes(k)) && !b1.prKeys.includes('e') && !b1.prKeys.includes('ah') && !b1.prKeys.includes('sd') && !b1.prKeys.includes('wq'), '① presence에 사람 표시 칸(장비 e·wq·변신 pf·세션 ah/sd·버프)이 없음 ' + b1.prKeys.join(','));
  ok(b1.host && b1.bots > 0, `① 유저가 먼저 호스트였지만 봇 호스트가 들어오자 봇 호스트가 호스트 · 봇 ${b1.bots}명 계산 중`);
  const g1 = await B.evaluate(() => { __T.TOWN.goTown(); return __T.SCENE; }); ok(g1 === 'field', '① 봇 호스트는 귀환(goTown)이 막힘');
  // ② 유저 탭: 게스트가 됨 · 봇이 보임 · 봇 호스트는 접속자 목록에 없음
  await P.waitForTimeout(1500);
  const p2 = await P.evaluate(() => { const bh = __T.NET.bhs()[0]; return { host: __T.NET.zoneHost(), guest: __T.NET.guestIn('isle' + __T.ISLE.id), n: __T.NET.count(), others: __T.NET.others().length, bhs: __T.NET.bhs().length, bhPr: bh ? { z: bh.pr.z, m: Array.isArray(bh.pr.m) ? bh.pr.m.length : null, size: JSON.stringify(bh.pr).length, keys: Object.keys(bh.pr).filter(k => bh.pr[k] != null).length } : null,
      bots: __FB.bots().length, botNames: __FB.bots().slice(0, 3).map(f => f.dispName || f.bot && f.bot.name), uidMobs: __T.foxes.filter(f => f.uid != null && !f.gone).length, bhOn: __FB.bhOn(), top: __FB.amTop(), writer: __FB.amWriter(), tag: __T.NET.others().some(o => o.pr.bh) }; });
  console.log('② user', JSON.stringify(p2));
  ok(!p2.host && p2.guest && p2.n === 1 && p2.others === 0 && p2.bhs === 1 && !p2.tag, '② 유저는 게스트 · 접속자 수 1(나만) · 봇 호스트는 others()에 없고 bhs()에만');
  ok(p2.bhPr && p2.bhPr.z === 'isle' + Z && p2.bhPr.m > 0 && p2.bots > 0 && p2.uidMobs > 0, `② 봇 호스트 presence(몬스터 ${p2.bhPr && p2.bhPr.m}개 · ${p2.bhPr && p2.bhPr.size}B)로 몬스터·봇이 보임 (봇 ${p2.bots}명 ${JSON.stringify(p2.botNames)})`);
  ok(p2.bhOn && p2.top && !p2.writer, '② 유저 쪽: bhOn() · 내가 cp 1등이지만 봇 호스트가 있어 사진 작성자는 아님');
  // 봇 연출(fbx)을 게스트가 받는지: 봇 호스트에서 봇 하나가 멘트 → 유저 화면 말풍선/채팅
  const fx = await B.evaluate(() => { const f = __FB.bots().find(q => !q.dead); if (!f) return null; __FB.DBG.noTalk = false; __FB.DBG.talkP = 1; const r = __FB.talk(f, 'idle'); __FB.DBG.noTalk = true; __FB.DBG.talkP = null; return { uid: f.uid, r }; });
  await P.waitForTimeout(1200); const p2b = await P.evaluate(uid => ({ chat: __T.log.map(l => l.t).filter(t => /^\[라인\]|^\[반왕\]/.test(t)).length, bubble: !!(__FB.bots().find(f => f.uid === uid) || {}).fbChat }), fx && fx.uid);
  ok(fx && fx.r && (p2b.chat >= 1 || p2b.bubble), '② 봇 호스트의 봇 연출(fbx 멘트)을 게스트가 받음 ' + JSON.stringify({ fx, p2b }));
  // ④ 몬스터가 봇 호스트를 노리지 않음 · HP 그대로
  const b4 = await B.evaluate(() => ({ aggroMe: __T.foxes.filter(f => f.aggro && f.tgt === __T.hero).length, hp: __T.hero.hp, max: __T.hero.max, near: __T.foxes.filter(f => !f.dead && Math.max(Math.abs(f.i - __T.hero.i), Math.abs(f.j - __T.hero.j)) <= 3).length, ok: __BH.ok }));
  ok(b4.aggroMe === 0 && b4.hp === b4.max, '④ 몬스터가 봇 호스트를 노리지 않음 · HP 가득 ' + JSON.stringify(b4));
  // ③ 유저가 나가도 계속 · 보는 사람이 없으면 몬스터 목록 없음
  await P.evaluate(() => __T.TOWN.goTown()); await B.waitForTimeout(2500);
  const b3 = await B.evaluate(() => { const pr = __T.NET.dbgPayload(); return { host: __T.NET.zoneHost(), bots: __FB.bots().filter(f => !f.dead).length, fps: __BH.fps, m: pr.m, size: JSON.stringify(pr).length, peers: __BH.peers, ok: __BH.ok }; });
  ok(b3.host && b3.bots > 0 && b3.fps >= 19 && b3.m === null && b3.size < 400 && b3.peers === 1, `③ 유저가 나가도 봇 호스트는 계속(호스트 · 봇 ${b3.bots} · ${b3.fps}Hz) · 보는 사람이 없으면 presence ${b3.size}B(몬스터 목록 없음)`);
  await P.evaluate(z => { __T.TOWN.toZone(z); }, Z); await P.waitForTimeout(2500);
  const p3 = await P.evaluate(() => ({ host: __T.NET.zoneHost(), guest: __T.NET.guestIn('isle' + __T.ISLE.id), uidMobs: __T.foxes.filter(f => f.uid != null && !f.gone).length, bhs: __T.NET.bhs().length })); const b3b = await B.evaluate(() => ({ host: __T.NET.zoneHost(), bots: __FB.bots().filter(f => !f.dead).length, watchers: !!__T.NET.dbgPayload().m }));
  ok(!p3.host && p3.guest && p3.uidMobs > 0 && p3.bhs === 1 && b3b.host && b3b.bots > 0 && b3b.watchers, '③ 다시 들어오면 다시 게스트(호스트 몬스터 받음) · 봇 호스트는 그대로 호스트(몬스터 목록 다시 보냄) ' + JSON.stringify({ p3, b3b }));
  // 유저 공격이 호스트에 전달되는지 (게스트 h → 호스트 applyHits)
  const hit = await P.evaluate(() => { const H = __T.hero; const m = __T.foxes.filter(f => f.uid != null && !f.fb && !f.dead && !f.gone && __T.MOB[f.kind] && !__T.MOB[f.kind].boss).sort((a, b) => Math.hypot(a.x - H.x, a.z - H.z) - Math.hypot(b.x - H.x, b.z - H.z))[0]; if (!m) return null; __T.TOWN.placeAt(m.x + 1, m.z); H.lv = 55; __T.INV.render(); __T.NET.hit(m, 50, true); return { uid: m.uid, hp: m.hp }; });
  await B.waitForTimeout(1200); const hb = await B.evaluate(uid => { const f = __T.foxes.find(q => q.uid === uid); return f ? { hp: f.hp, max: f.max, dead: f.dead } : null; }, hit && hit.uid);
  ok(hit && hb && (hb.hp < hb.max || hb.dead), '② 게스트(유저)의 공격이 봇 호스트에 적용됨 ' + JSON.stringify({ hit, hb }));
  // ⑤ __BH · 1분 로그 줄 형식
  const b5 = await B.evaluate(() => window.__BH); ok(['ok', 'zone', 'host', 'bots', 'mobs', 'fps', 'since', 'ver', 'err', 'phase', 'tick', 'peers'].every(k => k in b5) && b5.ver > 0 && b5.zone === Z && Date.now() - b5.tick < 3000, '⑤ window.__BH 값 ' + JSON.stringify(b5));
  ok(logs.length >= 1 && /^\[BH\] \{"ok":(true|false),"zone":12,/.test(logs[0]) && logs.every(l => /"fps":\d+/.test(l)), '⑤ console.log 한 줄 [BH] {...} (켜고 1초 뒤 한 번 · 그 뒤 1분마다) ' + (logs[logs.length - 1] || '').slice(0, 150));
  // ⑥ 오류
  ok(errs.length === 0, '⑥ 두 탭 오류 없음 ' + JSON.stringify(errs.slice(0, 3)));
  await br.close(); console.log(fails ? `FAILS ${fails}` : 'ALL OK'); process.exit(fails ? 1 : 0); })().catch(e => { console.error(e); process.exit(2); });
