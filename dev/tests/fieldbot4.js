// 11/1 밤 필드 봇: 분배(100%×4…)·고정 이름 38·변신(100%만 전설)·법사 슬로우·요정 게일/똥물/어바·worldbot_chars 서버 저장 — KT_PORT=8781 bash dev/runkt.sh dev/tests/fieldbot4.js
// ① 비율표 ② 이름 38개 고정·중복 없음·100% 8명·원큐=요정 ③ 변신: 100% 봇만 전설(아크) · 나머지 소드 · 전설이 아니면 그대로 ④ 슬로우가 나에게 걸림(아이콘·속도·겹침·면역) ⑤ 게일·똥물·어바가 나에게 걸림(무적·면역)
// ⑥ 봇끼리(슬로우·어바 무적·똥물 회복 50%) ⑦ 대인전에서 저절로 씀 ⑧ worldbot_chars 저장(가짜 CLOUD · 바뀔 때만 · 봇 호스트는 안 씀) ⑨ 구간이 바뀌면 서버 캐릭터 cp 1등으로 사진 · 403이면 예전 방식 ⑩ 게스트에게도 걸림 ⑪ 오류 없음
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
const REF = { lv: 55, fb: { lv: 55, c: 'knight', hp: 900, ac: -60, mr: 40, d: 45, cp: 5000 } };
const N100 = { A: ['인범', '포세이든', '퉁탕', '구문룡'], B: ['만만이', '원큐', '철구', '해골'] };
const REST = ['킹받쥬', '불타는썽큰', 'x골리앗x', '악마혼', '천사혼', '가렌', '간달프', '막피의왕', '뿅가', '베르한다실시', '안타라스', '발라카스', '파푸리온', '이실로테', '군터', '흑기사', '노빤쮸', '갤럭시', '거지왕', '문도', '카드값줘체리', '쌈장', '멸치', '고구마', '닥터x', '진격의거인', '원피스', '루피', '조로', '나미', '손오공', '오징어게임'];
(async () => { const br = await chromium.launch(); const ctx1 = await br.newContext({ viewport: { width: 1280, height: 800 } }); const errs = [];
  const p = await ctx1.newPage(); p.on('pageerror', e => errs.push('P1: ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await login(p, { cls: 'knight', name: 'fb4One', mp: true });   // mp: NET.me()가 있어야 사진 작성자(amTop)가 됨
  // ① 비율표
  const r1 = await p.evaluate(() => { const R = __FB.roster(), cnt = t => [1, 0.9, 0.8, 0.7].map(q => R[t].filter(b => b.pct === q).length);
    return { n: R.all.length, A: cnt('A'), B: cnt('B'), cls: ['A', 'B'].map(t => ['knight', 'elf', 'wizard'].map(c => R[t].filter(b => b.cls === c).length).join('/')), top: ['A', 'B'].map(t => R[t].filter(b => b.pct === 1).map(b => b.cls + ':' + b.name)), tab: ['A', 'B'].map(t => __FB.TAB[t].length), same: R.A.every((b, n) => __FB.TAB.A[n][0] === b.name && __FB.TAB.A[n][1] === b.cls && __FB.TAB.A[n][2] === b.pct) }; });
  console.log('① ratio', JSON.stringify(r1));
  ok(r1.n === 38 && r1.A.join() === '4,4,5,5' && r1.B.join() === '4,6,5,5', '① 반왕 18 = 100%×4·90%×4·80%×5·70%×5 · 라인 20 = 100%×4·90%×6·80%×5·70%×5');
  ok(r1.cls[0] === '5/6/7' && r1.cls[1] === '7/6/7' && r1.top.every(L => new Set(L.map(s => s.split(':')[0])).size === 3) && r1.tab.join() === '18,20' && r1.same, '① 직업 구성 그대로(반왕 기사5·요정6·법사7 · 라인 7·6·7) · 100% 4명은 세 직업 섞임 · 명단 = 코드의 표(TAB)');
  // ② 이름
  const r2 = await p.evaluate(() => { const R = __FB.roster(), names = R.all.map(b => b.name), R2 = __FB.roster(); return { names, uniq: new Set(names).size, t100: ['A', 'B'].map(t => R[t].filter(b => b.pct === 1).map(b => b.name).sort()), wk: R.B.find(b => b.name === '원큐'), stable: R === R2 && R.all.every((b, k) => b.name === R2.all[k].name), tw: __TW.kit.N1.length > 0, disp: (() => { const f = __FB.spawnTest(R.B[0].uid, __T.hero.i + 2, __T.hero.j); const d = f && f.dispName; if (f) f.gone = true; return d; })() }; });
  console.log('② names', r2.names.join(' '));
  const rest2 = r2.names.filter(n => !N100.A.includes(n) && !N100.B.includes(n));
  ok(r2.uniq === 38 && r2.t100[0].join() === N100.A.slice().sort().join() && r2.t100[1].join() === N100.B.slice().sort().join(), '② 38개 모두 다름 · 100% 8명 이름 고정 (반왕 인범·포세이든·퉁탕·구문룡 · 라인 만만이·원큐·철구·해골)');
  ok(r2.wk && r2.wk.cls === 'elf' && r2.wk.pct === 1 && rest2.length === 30 && rest2.every(n => REST.includes(n)) && r2.stable && r2.disp === r2.names[18], `② 원큐 = 요정 100% · 나머지 30명은 프로듀서 목록에서 (남은 이름 ${REST.filter(n => !rest2.includes(n)).join('·')}) · 이름표(dispName)도 그 이름`);
  // ③ 변신: 100%만 전설 · 나머지 소드 · 복사 대상이 전설이 아니면 그대로
  const r3 = await p.evaluate(() => { const o = {}; for (const pf of ['pc_arc_knight', 'pc_sword_knight', 'pm_dknight', 'pc_deathknight', '']) { __FB.setRef({ copy: { c: 'knight', lv: 55, cb: { hp: 900, ac: -60, mr: 40, d: 45 }, eq: {}, pf } }); o[pf || 'none'] = [1, 0.9, 0.7].map(p => ['knight', 'elf', 'wizard'].map(c => __FB.lookFor(c, p).pf || '-').join(',')); }
    __FB.setRef({ copy: { c: 'knight', lv: 55, cb: { hp: 900, ac: -60, mr: 40, d: 45 }, eq: {}, pf: 'pc_arc_knight' } }); const R = __FB.roster(); o.bots = ['A', 'B'].map(t => [1, 0.9, 0.8, 0.7].map(p => [...new Set(R[t].filter(b => b.pct === p).map(b => __FB.stOf(b.uid).pf))].join('|')));
    __FB.setRef(null); return o; });
  console.log('③ poly', JSON.stringify(r3));
  ok(r3.pc_arc_knight[0] === 'pc_arc_knight,pc_arc_ranger,pc_arc_mage' && r3.pc_arc_knight[1] === 'pc_sword_knight,pc_sword_ranger,pc_sword_mage' && r3.pc_arc_knight[2] === 'pc_sword_knight,pc_sword_ranger,pc_sword_mage', '③ 복사 대상이 아크나이트(전설): 100% 봇만 아크 시리즈 · 90·70%는 자기 직업 소드 시리즈');
  ok(r3.pc_sword_knight.every(s => s === 'pc_sword_knight,pc_sword_ranger,pc_sword_mage') && r3.pm_dknight.every(s => s === 'pm_dknight,pm_dranger,pm_dmage') && r3.pc_deathknight[0] === 'pc_deathknight,pc_deathknight,pc_deathknight' && r3.pc_deathknight[1] === 'pc_sword_knight,pc_sword_ranger,pc_sword_mage' && r3.none.every(s => s === '-,-,-'), '③ 전설이 아닌 변신(소드·다크 주문서)은 비율과 상관없이 짝 그대로 · 전설 몬스터 카드(데스나이트)도 100%만 · 변신이 없으면 모두 없음');
  ok(r3.bots.every(L => /^pc_arc_/.test(L[0]) && !L[0].includes('sword') && L.slice(1).every(s => /^pc_sword_/.test(s) && !s.includes('arc'))), '③ 실제 명단: 100% 봇 8명 아크 · 90·80·70% 봇 30명 소드 ' + JSON.stringify(r3.bots));
  // ④ 슬로우가 나에게 (사냥터 4번 2구역 · 호스트)
  await p.evaluate(R => { __FB.setRef(R); __T.GOD_INV = true; __T.BUFF.invis = 9999; __T.TOWN.toZone(4); }, REF); await p.waitForTimeout(1500);
  await p.evaluate(() => { const F = __FB, H = __T.hero; F.DBG.noEnsure = true; F.DBG.noAI = true; F.DBG.noReinf = true; F.DBG.noBoss = true; F.DBG.noTalk = true; for (const q of F.bots()) q.gone = true; __T.TOWN.placeAt(27.5, 30.5); H.lv = 55; H.baseHP = 1e5; __T.INV.render(); H.hp = H.max; __T.GOD_INV = false; __T.BUFF.invis = 0; });
  await p.waitForTimeout(400);
  const cast = (who, what, tgt) => p.evaluate(([who, what, tgt]) => { const F = __FB, H = __T.hero, R = F.roster(), S = F.stat(); let f = F.bots().find(q => q.bot.team === 'B' && q.bot.cls === who && !q.dead); if (!f) { f = F.spawnTest(R.B.filter(b => b.cls === who && b.pct === 1)[0].uid, H.i + (who === 'wizard' ? 2 : -2), H.j + 1); f.max = f.hp = 1e5; }
    const T = tgt === 'me' ? H : F.bots().find(q => q.bot.team === 'A' && !q.dead); const b = { ok: S.efOk, imm: S.efImm, miss: S.efMiss }; const mr = Math.random; Math.random = () => 0.01; try { F.castEf(f, T, what); } finally { Math.random = mr; }
    return { ok: S.efOk - b.ok, imm: S.efImm - b.imm, miss: S.efMiss - b.miss, lv: f.bot.st.lv, B: { wslow: +(__T.BUFF.wslow || 0).toFixed(2), gale: +(__T.BUFF.gale || 0).toFixed(2), poll: +(__T.BUFF.poll || 0).toFixed(2), ebind: +(__T.BUFF.ebind || 0).toFixed(2), stun: +(__T.BUFF.stun || 0).toFixed(2) }, hs: __T.NET.dbgPayload().hs, log: __T.log.slice(-2).map(l => l.t) }; }, [who, what, tgt]);
  const hs0 = await p.evaluate(() => __T.NET.dbgPayload().hs);
  const a4 = await cast('wizard', 'wslow', 'me'); await p.waitForTimeout(250);
  const i4 = await p.evaluate(() => ({ rect: (__T.BUFFRECT_ || []).map(r => r[4]), hs: __T.NET.dbgPayload().hs, floats: __T.floats.map(f => f.text).filter(t => /슬로우/.test(t)) }));
  console.log('④ slow', JSON.stringify(a4), JSON.stringify(i4), 'hs0', hs0);
  ok(a4.ok === 1 && a4.B.wslow > 5.5 && a4.B.wslow <= 6 && /슬로우에 걸렸습니다/.test(a4.log.join()) && Math.abs(i4.hs / hs0 - 0.75) < 0.02, `④ 법사 봇 슬로우 → BUFF.wslow ${a4.B.wslow}초 · 이동/공격 속도 ${hs0} → ${i4.hs} (×0.75) · 채팅 안내`);
  ok(i4.rect.includes('wslow') && i4.floats.length >= 1, '④ 디버프 아이콘(wslow)이 버프 줄에 그려짐 · 머리 위 "슬로우! 6초" 글자 ' + JSON.stringify(i4.rect));
  const a4b = await cast('wizard', 'wslow', 'me'); ok(a4b.imm === 1 && a4b.ok === 0, '④ 걸려 있는 동안 다시 걸면 안 겹침 (면역 처리)');
  await p.evaluate(() => { __T.BUFF.wslow = 0.05; }); await p.waitForTimeout(600); const a4c = await cast('wizard', 'wslow', 'me'); ok(a4c.imm === 1 && a4c.ok === 0 && a4c.B.wslow < 0.1, '④ 풀린 직후 3초 면역 ' + JSON.stringify(a4c.B));
  await p.evaluate(() => __FB.sim(10)); const a4d = await cast('wizard', 'wslow', 'me'); ok(a4d.ok === 1 && a4d.B.wslow > 5.5, '④ 면역(걸린 시각 + 6초 + 3초)이 지나면 다시 걸림');
  await p.evaluate(() => { __T.BUFF.wslow = 0; __FB.sim(4); });
  // ⑤ 요정: 게일·똥물·어바
  const g5 = await cast('elf', 'striker_gale', 'me'); ok(g5.ok === 1 && g5.B.gale === 12 && /스트라이커 게일/.test(g5.log.join()), `⑤ 요정 봇 스트라이커 게일 → BUFF.gale ${g5.B.gale}초`);
  const p5 = await cast('elf', 'pollute_water', 'me'); ok(p5.ok === 1 && p5.B.poll === 8 && /폴루트 워터/.test(p5.log.join()), `⑤ 폴루트 워터 → BUFF.poll ${p5.B.poll}초 (받는 회복 50%)`);
  const b5 = await cast('elf', 'earth_bind', 'me'); const h5 = await p.evaluate(() => { const H = __T.hero, hp0 = H.hp; __T.hurtHero(500, null, 'melee'); return { hp0, hp1: H.hp, f: __T.floats.map(f => f.text).filter(t => /바인드|무적/.test(t)).length }; });
  console.log('⑤ bind', JSON.stringify(b5), JSON.stringify(h5));
  ok(b5.ok === 1 && b5.B.ebind > 0.9 && b5.B.ebind <= 5 && b5.B.stun > 0.9 && /어스 바인드/.test(b5.log.join()) && h5.hp1 === h5.hp0 && h5.f >= 1, `⑤ 어스 바인드 ${b5.B.ebind}초 (기절 + 피해 무효: 500 피해 → HP 그대로)`);
  await p.evaluate(() => { __T.BUFF.ebind = 0.05; __T.BUFF.stun = 0.05; }); await p.waitForTimeout(300); const b5b = await cast('elf', 'earth_bind', 'me'); ok(b5b.imm === 1 && b5b.B.ebind === 0, '⑤ 어스 바인드가 풀린 뒤 6초 면역 (유저와 같음)');
  const i5 = await p.evaluate(() => (__T.BUFFRECT_ || []).map(r => r[4])); ok(i5.includes('gale') && i5.includes('poll'), '⑤ 게일·폴루트 아이콘이 디버프 줄에 ' + JSON.stringify(i5));
  await p.evaluate(() => { __T.BUFF.gale = 0; __T.BUFF.poll = 0; __FB.sim(7); });
  // 카운터 매직은 슬로우·똥물·어바를 막음 (게일은 못 막음)
  const c5 = await p.evaluate(() => { __T.BUFF.counterm = 600; return 1; }); const c5a = await cast('wizard', 'wslow', 'me'); const c5b = await cast('elf', 'striker_gale', 'me');
  ok(c5a.B.wslow === 0 && /카운터 매직/.test(c5a.log.join()) && c5b.ok === 1 && c5b.B.gale === 12, '⑤ 카운터 매직이 슬로우를 막음(효과 끝) · 게일은 막히지 않음');
  await p.evaluate(() => { __T.BUFF.gale = 0; __T.BUFF.counterm = 0; __FB.sim(4); });
  // ⑥ 봇끼리: 반왕 기사 봇에게 슬로우·어바·똥물
  const r6 = await p.evaluate(() => { const F = __FB, H = __T.hero, R = F.roster(), S = F.stat(); const k = F.spawnTest(R.A.filter(b => b.cls === 'knight' && b.pct === 1)[0].uid, H.i - 4, H.j - 3); k.max = k.hp = 1e5; k.hp = k.max;
    const w = F.bots().find(q => q.bot.team === 'B' && q.bot.cls === 'wizard'), e = F.bots().find(q => q.bot.team === 'B' && q.bot.cls === 'elf'), bk = F.spawnTest(R.B.filter(b => b.cls === 'knight' && b.pct === 1)[0].uid, k.i + 1, k.j); bk.max = bk.hp = 1e5;
    const mr = Math.random; let o = {}; try { Math.random = () => 0.01; F.castEf(w, k, 'wslow'); o.wslowT = +k.wslowT.toFixed(1); o.wimm = k.wslowImm > __T.time; const q = [0.01, 0.9]; Math.random = () => q.length ? q.shift() : 0.01; F.castEf(e, k, 'earth_bind'); o.bind = k.bindUntil > __T.time; o.stun = +k.stunT.toFixed(1); } finally { Math.random = mr; }   // 성공 판정 0.01 · 지속 0.9 → 4.6초
    // 묶인 동안 라인 기사가 때려도 피해 없음 (AI 켜고 1초)
    F.DBG.noAI = false; bk.bx = null; F.sim(0.2); if (bk.bx) { bk.bx.tgt = k; bk.bx.cd = 0; } const hp0 = k.hp; F.sim(1.2); o.hpBound = hp0 - k.hp; o.stillBound = k.bindUntil > __T.time; F.DBG.noAI = true;
    // 똥물: 물약 회복 50%
    k.bindUntil = 0; k.stunT = 0; try { Math.random = () => 0.01; F.castEf(e, k, 'pollute_water'); } finally { Math.random = mr; } o.poll = k.pollUntil > __T.time; if (!k.bx) { F.DBG.noAI = false; F.sim(0.1); F.DBG.noAI = true; } k.bx.potN = 50; k.bx.potAt = 0.95; k.bx.pot = 0; k.hp = Math.round(k.max * 0.5); const h0 = k.hp, p0 = S.pot.slice(); F.DBG.noAI = false; F.sim(0.1); F.DBG.noAI = true; o.potHeal = k.hp - h0; o.potN = S.pot.map((v, i) => v - p0[i]).reduce((a, b) => a + b, 0);
    for (const q of [k, bk]) q.gone = true; return o; });
  console.log('⑥ bot↔bot', JSON.stringify(r6));
  ok(r6.wslowT >= 5.9 && r6.wimm && r6.bind && r6.stun > 4, `⑥ 봇에게도 슬로우(wslowT ${r6.wslowT}) · 어스 바인드(bindUntil · 기절 ${r6.stun}초)`);
  ok(r6.hpBound === 0 && r6.stillBound, `⑥ 어바에 묶인 봇은 라인 기사가 때려도 피해 없음 (1.2초 동안 ${r6.hpBound})`);
  ok(r6.poll && r6.potN >= 1 && r6.potHeal >= 1 && r6.potHeal <= 31, `⑥ 똥물 걸린 봇의 물약 회복 50% (한 번에 +${r6.potHeal} · 물약 ${r6.potN}개)`);
  // ⑦ 대인전에서 저절로 씀 (확률 100%로 올려 20초)
  const r7 = await p.evaluate(() => { const F = __FB, H = __T.hero, S = F.stat(); F.DBG.wslowP = 1; F.DBG.espP = 1; F.cfg({ ESP_DL: [1, 2] }); const e0 = JSON.stringify(S.ef); const b = { ...S.ef }; H.hp = H.max; __T.BUFF.wslow = 0; __T.BUFF.ebind = 0; __T.BUFF.stun = 0; F.DBG.noAI = false; for (const q of F.bots()) if (q.bx) { q.bx.tgt = H; q.bx.scd = {}; }
    F.sim(25); F.DBG.noAI = true; F.DBG.wslowP = null; F.DBG.espP = null; F.cfg({ ESP_DL: [6, 12] }); const d = {}; for (const k in S.ef) d[k] = S.ef[k] - (b[k] || 0); return { d, on: S.efOn, hp: Math.round(H.hp / H.max * 100), b: { wslow: __T.BUFF.wslow, gale: __T.BUFF.gale, poll: __T.BUFF.poll } }; });
  console.log('⑦ auto', JSON.stringify(r7));
  ok((r7.d.wslow || 0) >= 1 && (r7.d.striker_gale || 0) >= 1 && (r7.d.pollute_water || 0) >= 1 && (r7.d.earth_bind || 0) >= 1, '⑦ 대인전 25초: 법사 봇이 슬로우, 요정 봇이 게일·똥물·어바를 저절로 씀 ' + JSON.stringify(r7.d));
  await p.evaluate(() => { for (const q of __FB.bots()) q.gone = true; __T.BUFF.wslow = 0; __T.BUFF.gale = 0; __T.BUFF.poll = 0; __T.BUFF.ebind = 0; __T.BUFF.stun = 0; __T.hero.hp = __T.hero.max; __FB.setRef(null); });
  // ⑧ worldbot_chars (가짜 Firestore — localStorage)
  const stub = () => { const C = __T.CLOUD, K = 'fakefs:'; window.__fs = { gets: 0, creates: 0, sets: 0, lists: 0, fail: false, failList: false, paths: [] };
    C.on = () => true; C.uid = () => 'u_' + __T.NET.me();
    const wait = () => new Promise(r => setTimeout(r, 20)), deny = () => { const e = new Error('PERMISSION_DENIED'); e.status = 403; e.code = 'PERMISSION_DENIED'; throw e; };
    C.get = async p => { __fs.gets++; __fs.paths.push('get ' + p); await wait(); if (__fs.fail) deny(); const v = localStorage.getItem(K + p); return v ? JSON.parse(v) : null; };
    C.create = async (p, o) => { __fs.creates++; __fs.paths.push('create ' + p); await wait(); if (__fs.fail) return false; if (localStorage.getItem(K + p)) return false; localStorage.setItem(K + p, JSON.stringify(o)); return true; };
    C.set = async (p, o) => { __fs.sets++; __fs.paths.push('set ' + p); await wait(); if (__fs.fail) deny(); localStorage.setItem(K + p, JSON.stringify(o)); return true; };
    C.list = async col => { __fs.lists++; __fs.paths.push('list ' + col); await wait(); if (__fs.fail || __fs.failList) deny(); const L = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(K + col + '/')) L.push(JSON.parse(localStorage.getItem(k))); } return L; };
    for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k && k.startsWith(K)) localStorage.removeItem(k); } __FB.snapReset(); __FB.charReset(); };
  await p.evaluate(stub);
  const w8 = async () => { await p.evaluate(() => { __FB.mine(); __FB.charNow(); }); await p.waitForTimeout(200); return p.evaluate(() => { const C = __FB.chars(), k = 'fakefs:worldbot_chars/' + __T.CLOUD.uid(), v = localStorage.getItem(k); return { writes: C.writes, mode: C.mode, err: C.err, doc: v ? JSON.parse(v) : null, size: v ? v.length : 0, sets: __fs.sets }; }); };
  const c8 = await w8(); console.log('⑧ chars', JSON.stringify(c8).slice(0, 300), c8.size + 'B');
  ok(c8.writes === 1 && c8.doc && c8.doc.n === 'fb4One' && c8.doc.c === 'knight' && c8.doc.lv === '55' && +c8.doc.cp > 0 && JSON.parse(c8.doc.d).n === 'fb4One' && c8.size < 1200, `⑧ 내 캐릭터 정보가 worldbot_chars/{uid}에 저장됨 (${c8.size}B · n·c·lv·cp·at·d)`);
  const c8b = await w8(); ok(c8b.writes === 1 && c8b.sets === 1, '⑧ 바뀐 게 없으면 다시 안 씀');
  await p.evaluate(() => { __T.hero.lv = 57; }); const c8c = await w8(); ok(c8c.writes === 2 && c8c.doc.lv === '57', '⑧ 레벨이 바뀌면 덮어씀 (같은 문서)');
  const c8d = await p.evaluate(async () => { __FB.DBG.bh = true; const s0 = __fs.sets; __T.hero.lv = 58; __FB.charNow(); await new Promise(r => setTimeout(r, 200)); const o = { sets: __fs.sets - s0, top: __FB.amTop(), writer: __FB.amWriter(), meBh: __FB.meBh() }; __FB.DBG.bh = false; __T.hero.lv = 55; return o; });
  ok(c8d.sets === 0 && !c8d.top && c8d.writer && c8d.meBh, '⑧ 봇 호스트 계정(bh): worldbot_chars에 안 쓰고 · cp 후보 아님 · 사진 작성자 ' + JSON.stringify(c8d));
  // ⑨ 구간이 바뀌면 서버 캐릭터 목록의 cp 1등으로 사진 (접속 안 한 유저여도)
  const r9 = await p.evaluate(async () => { const F = __FB; localStorage.setItem('fakefs:worldbot_chars/u_other', JSON.stringify({ v: '1', u: 'u_other', n: 'TOPGUY', c: 'elf', lv: '60', cp: '999999', at: String(Date.now()), d: JSON.stringify({ n: 'TOPGUY', c: 'elf', lv: 60, cp: 999999, st: [12, 25, 14, 10, 10, 10], cb: { hp: 1200, ac: -70, mr: 50, d: 48, hb: 0.1, cr: 0.15, as: 10, ms: 10, dr: 2, jg: 0, pr: null }, eq: { weapon: ['lg_bow', 7, 0] }, pf: 'pc_arc_ranger', dl: '' }) }));
    localStorage.setItem('fakefs:worldbot_chars/u_bh', JSON.stringify({ v: '1', u: 'u_bh', bh: '1', n: 'BOTHOST', c: 'knight', lv: '99', cp: '9999999', at: String(Date.now()), d: JSON.stringify({ n: 'BOTHOST', c: 'knight', lv: 99, cp: 9999999, cb: { hp: 5000, ac: -200, mr: 200, d: 200 }, eq: {}, pf: '', dl: '' }) }));
    F.DBG.settled = true; F.DBG.toff = 7200e3; F.snapReset(); F.snapNow(); await new Promise(r => setTimeout(r, 500)); const S = F.snap(), R = F.ref(), C = F.chars(), doc = JSON.parse(localStorage.getItem('fakefs:worldbot/s' + S.cur) || 'null');
    const e = document.getElementById('chat-in'); e.value = '/혈맹'; __T.CHAT.send(); await new Promise(r => setTimeout(r, 100));
    return { slot: S.slot, cur: S.cur, src: R.src, n: R.n, lv: R.lv, c: R.copy.c, from: S.from, f: doc && doc.f, dn: doc && JSON.parse(doc.d).n, lists: C.lists, cn: C.n, top: C.top, rep: __T.log.map(l => l.t).filter(t => /봇 복사/.test(t)).slice(-1)[0] || '', elfW: F.stOf(F.roster().B.find(b => b.cls === 'elf' && b.pct === 1).uid).eq.weapon }; });
  console.log('⑨ slot', JSON.stringify(r9));
  ok(r9.slot === r9.cur && r9.src === 'cloud' && r9.n === 'TOPGUY' && r9.lv === 60 && r9.c === 'elf' && r9.from === 'chars' && r9.f === 'chars' && r9.dn === 'TOPGUY' && r9.lists >= 1 && r9.cn === 2 && r9.elfW === 'lg_bow', `⑨ 새 구간 s${r9.cur}: 서버 캐릭터 목록(내 캐릭터 + TOPGUY · 봇 호스트 문서는 뺌) 중 cp 1등 TOPGUY(Lv60 요정)로 사진 → 요정 봇은 가이아의 격노`);
  ok(/서버 캐릭터 2명 중 1등/.test(r9.rep) && /TOPGUY Lv.60 요정/.test(r9.rep), '⑨ /혈맹: "봇 복사: TOPGUY Lv.60 요정 (다음 갱신 … · 서버 캐릭터 2명 중 1등)" ' + r9.rep);
  const r9b = await p.evaluate(async () => { const F = __FB; __fs.failList = true; F.DBG.toff += 7200e3; F.snapReset(); F.snapNow(); await new Promise(r => setTimeout(r, 500)); const S = F.snap(), R = F.ref(), C = F.chars(), doc = JSON.parse(localStorage.getItem('fakefs:worldbot/s' + S.cur) || 'null'); __fs.failList = false;
    return { src: R.src, n: R.n, from: S.from, f: doc && doc.f, err: C.err, wait: Math.round((C.listNext - Date.now() - F.DBG.toff) / 1000) }; });
  console.log('⑨ 403', JSON.stringify(r9b));
  ok(r9b.src === 'cloud' && r9b.n === 'fb4One' && r9b.from === 'me' && r9b.f === 'me' && /PERMISSION/.test(r9b.err) && r9b.wait > 240 && r9b.wait <= 300, `⑨ 목록 읽기가 403이면 조용히 예전 방식(접속자 1등 = 내 캐릭터)으로 사진 · ${r9b.wait}초 뒤 다시`);
  await p.evaluate(() => { __FB.DBG.toff = 0; __FB.DBG.settled = false; __T.CLOUD.on = () => false; __FB.snapReset(); __FB.setRef(null); });
  await ctx1.close();
  // ⑩ 두 탭: 호스트의 법사 봇 슬로우가 게스트에게 (피해 목록 8·9번째 칸) · 게스트 화면 연출
  const ctx = await br.newContext({ viewport: { width: 1100, height: 720 } }); const pg = []; for (const nm of ['fb4Host', 'fb4Gst']) { const q = await ctx.newPage(); q.on('pageerror', e => errs.push(nm + ': ' + e.message)); await login(q, { cls: nm === 'fb4Host' ? 'knight' : 'elf', name: nm, mp: true }); pg.push(q); }
  for (const q of pg) await q.evaluate(R => { __FB.setRef(R); __FB.DBG.noReinf = true; __FB.DBG.noBoss = true; __FB.DBG.noTalk = true; __T.GOD_INV = true; __T.BUFF.invis = 9999; __T.TOWN.toZone(4); }, REF);
  await pg[0].waitForTimeout(2500); const hi = (await Promise.all(pg.map(q => q.evaluate(() => __FB.host())))).indexOf(true), H = pg[hi], G = pg[1 - hi]; ok(hi >= 0, '⑩ 호스트 1명');
  const hp = await H.evaluate(() => [__T.hero.x, __T.hero.z]); await G.evaluate(([x, z]) => { const h = __T.hero; __T.TOWN.placeAt(x + 2, z + 1); h.lv = 55; h.baseHP = 1e5; __T.INV.render(); h.hp = h.max; __T.GOD_INV = false; __T.BUFF.invis = 0; }, hp);
  await H.waitForTimeout(1500);
  await H.evaluate(() => { const F = __FB, R = F.roster(); F.DBG.noEnsure = true; F.DBG.noAI = true; for (const q of F.bots()) q.gone = true; const o = __T.NET.others()[0], gi = Math.floor(o.pr.x), gj = Math.floor(o.pr.y);
    const w = F.spawnTest(R.B.filter(b => b.cls === 'wizard' && b.pct === 1)[0].uid, gi + 2, gj), e = F.spawnTest(R.B.filter(b => b.cls === 'elf' && b.pct === 1)[0].uid, gi - 2, gj + 1); for (const f of [w, e]) f.max = f.hp = 1e5; });
  await H.waitForTimeout(1500);   // 게스트가 먼저 fbx를 한 번 받아 두게 (처음 받은 묶음은 재생하지 않음)
  const h10 = await H.evaluate(() => { const F = __FB, o = __T.NET.others()[0], T = __T.NET.proxyOf(o.peer), w = F.bots().find(q => q.bot.cls === 'wizard'), e = F.bots().find(q => q.bot.cls === 'elf');
    const S = F.stat(), mr = Math.random; try { Math.random = () => 0.01; F.castEf(w, T, 'wslow'); F.castEf(e, T, 'striker_gale'); } finally { Math.random = mr; } return { ok: S.efOk, on: S.efOn, imm: T.wslowImm > __T.time, gale: T.galeUntil > __T.time }; });
  let g10 = null; for (let t = 0; t < 8; t++) { await G.waitForTimeout(700); g10 = await G.evaluate(() => ({ wslow: +(__T.BUFF.wslow || 0).toFixed(1), gale: +(__T.BUFF.gale || 0).toFixed(1), hs: __T.NET.dbgPayload().hs, ev: __FB.stat().ev, log: __T.log.map(l => l.t).filter(t => /슬로우에 걸렸습니다|스트라이커 게일/.test(t)) })); if (g10.wslow > 0 && g10.gale > 0) break; }
  console.log('⑩ host', JSON.stringify(h10), 'guest', JSON.stringify(g10));
  ok(h10.ok === 2 && h10.imm && h10.gale && g10.wslow > 3 && g10.gale > 8 && g10.log.length >= 2 && (g10.ev.e || 0) >= 2, `⑩ 게스트가 호스트 봇의 슬로우(${g10.wslow}초)·게일(${g10.gale}초)에 걸림 · 연출 이벤트(e) ${g10.ev.e}번 · 채팅 안내`);
  const h10b = await H.evaluate(() => { const S = __FB.stat(), o = __T.NET.others()[0], T = __T.NET.proxyOf(o.peer), w = __FB.bots().find(q => q.bot.cls === 'wizard'), mr = Math.random; const i0 = S.efImm; try { Math.random = () => 0.01; __FB.castEf(w, T, 'wslow'); } finally { Math.random = mr; } return S.efImm - i0; });
  ok(h10b === 1, '⑩ 호스트가 기록한 면역(proxy)으로 걸려 있는 동안 다시 안 걺');
  await G.screenshot({ path: 'dev/out/fb4_guest.png' });
  ok(errs.length === 0, '⑪ 오류 없음'); console.log(errs.join('\n') || 'no errors');
  console.log(fails ? `FAIL ${fails}개` : 'ALL OK'); await br.close(); })();
