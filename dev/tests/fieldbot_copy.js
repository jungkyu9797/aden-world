// v204(10/31) 필드 봇 = 접속자 중 전투력 1등 캐릭터 복사 (2시간마다 사진 · Firestore worldbot) — KT_PORT=8800 bash dev/runkt.sh dev/tests/fieldbot_copy.js
// 같은 브라우저 탭 2개(?mp=bc · BroadcastChannel)로 A(센 기사)·B(약한 요정) · Firestore는 테스트에서 못 쓰므로 페이지 안의 CLOUD.get/create를 가짜(두 탭이 같이 보는 localStorage)로 바꿈
// ① 실시간 기준(서버 없음): 접속자 중 전투력 1등(A)을 복사 — 레벨·능력치·장비(강화·축복·속성)·변신·인형 ② 봇 능력치 = 복사 × 비율 × 직업 보정
// ③ 같은 직업 봇은 복사한 장비·변신·인형 그대로 · 다른 직업은 짝 (집행검 → 가이아의 격노·수정결정체 지팡이 · 아크나이트 → 아크레인저·아크메이지)
// ④ 서버 사진: 1등 PC(A)만 만들고 B는 읽음 · 같은 구간 안에서는 접속자 전투력이 바뀌어도 그대로 ⑤ 새 구간 → 새 사진 (이번엔 B가 1등)
// ⑥ 서버 실패(권한 없음) → 실시간 기준 · /혈맹 출처 표시 ⑦ 이상한 문서 → 범위 자르기 ⑧ 그림(스크린샷)·성능 ⑨ 오류 없음
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
const HPK = { knight: 1, elf: 0.75, wizard: 0.62 }, ACK = { knight: 1, elf: 0.8, wizard: 0.55 }, DMK = { knight: 1, elf: 0.9, wizard: 0.95 }, MRK = { knight: 1, elf: 1.25, wizard: 1.6 };
const expect = (cp, b) => { const R = cp.cb, c0 = cp.c, p = b.pct, c = b.cls;   // TWM statOf와 같은 식 + v204 추가 값
  return { lv: Math.max(1, Math.round(cp.lv * p)), hp: Math.max(60, Math.round(R.hp / HPK[c0] * HPK[c] * p)), ac: Math.round(10 - Math.max(0, 10 - R.ac) / ACK[c0] * ACK[c] * p), mr: Math.round(R.mr / MRK[c0] * MRK[c] * p), d: Math.max(4, R.d / DMK[c0] * DMK[c] * p),
    hb: R.hb * p, cr: R.cr, as: R.as, ms: R.ms, dr: Math.round(R.dr * p), jg: R.jg }; };
const near = (a, b, e) => Math.abs(a - b) <= (e || 1e-6);
(async () => { const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 800 } }); const errs = [];
  const page = async (nm, cls) => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(nm + ': ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | '))); await login(p, { cls, name: nm, mp: true }); return p; };
  const A = await page('cpA', 'knight'), B = await page('cpB', 'elf');
  const ids = await A.evaluate(() => ['lg_sword', 'lg_bow', 'lg_staff', 'fd_plate', 'fd_robe', 'fd_leather', 'dk_helm', 'cx_gl5', 'cx_bt5', 'cx_sh6', 'cx_cl6', 'doll_wyvern', 'silver_ring'].filter(k => !__T.ITEMS[k])); ok(!ids.length, '아이템 id 확인 ' + JSON.stringify(ids));
  // A: Lv55 기사 · 집행검 +7 축복 불2 · 화룡의 갑옷 +5 · 와이번 인형 · 아크나이트 변신
  await A.evaluate(() => { const T = __T; T.hero.lv = 55; T.hero.exp = 0;
    T.INV.load({ bag: [{ id: 'lg_sword', n: 1, en: 7, blessed: true, attr: { el: 'fire', lv: 2 }, on: 'weapon' }, { id: 'fd_plate', n: 1, en: 5, on: 'armor' }, { id: 'dk_helm', n: 1, en: 4, on: 'helm' }, { id: 'cx_gl5', n: 1, en: 3, on: 'gloves' }, { id: 'cx_bt5', n: 1, en: 3, on: 'boots' }, { id: 'cx_sh6', n: 1, en: 5, on: 'shield' }, { id: 'cx_cl6', n: 1, en: 2, on: 'cloak' }, { id: 'silver_ring', n: 1, en: 3, on: 'ring1' }, { id: 'doll_wyvern', n: 1, on: 'doll' }, { id: 'red_potion', n: 50 }], bonus: { str: 8, dex: 0, con: 4, int: 0, wis: 0, cha: 0 } });
    const s = PCG.state(); s.cards.arc_knight = (s.cards.arc_knight || 0) + 1; PCG.doMorph('arc_knight'); T.INV.render(); });
  await A.waitForTimeout(5500);   // presence fb (4초마다) · 접속자 목록
  // ① 실시간 기준 (서버 없음)
  const mA = await A.evaluate(() => __FB.mine()), cA = await A.evaluate(() => __FB.copy()), cB = await B.evaluate(() => __FB.copy()), sA = await A.evaluate(() => ({ cp: __T.NET.dbgPayload().cp, poly: PCG.cur(), as: __T.INV.cx('atkSpd'), ms: __T.INV.cx('moveSpd'), hp: __T.hero.max, ac: __T.INV.ac() }));
  console.log('A mine', JSON.stringify(mA)); console.log('A stats', JSON.stringify(sA)); console.log('B copy (live)', JSON.stringify(cB));
  ok(cB.n === 'cpA' && cB.c === 'knight' && cB.lv === 55 && cA.n === 'cpA', '① 두 PC 모두 전투력 1등 A(cpA · Lv55 기사)를 복사 (실시간 기준)');
  ok(JSON.stringify(cB.eq.weapon) === JSON.stringify(['lg_sword', 7, 1, 'f', 2]) && cB.eq.armor[0] === 'fd_plate' && cB.eq.armor[1] === 5 && cB.eq.doll[0] === 'doll_wyvern' && cB.eq.ring1[0] === 'silver_ring', '① 장비 id·강화·축복·속성까지 복사 (반지·인형 칸 포함) ' + JSON.stringify(cB.eq.weapon));
  ok(cB.pf === 'pc_arc_knight' && cB.dl === 'wyvern', '① 변신(아크나이트)·마법인형(와이번) 복사');
  ok(['hp', 'ac', 'mr', 'd', 'hb', 'cr', 'as', 'ms', 'dr', 'jg'].every(k => near(cB.cb[k], cA.cb[k], 0.11)) && JSON.stringify(cB.cb.pr) === JSON.stringify(cA.cb.pr) && JSON.stringify(cB.st) === JSON.stringify(cA.st), '① B가 presence로 받은 전투 값 = A 자신의 값 ' + JSON.stringify(cB.cb));
  ok(cA.cb.hp === sA.hp && cA.cb.ac === sA.ac && cA.cb.as === sA.as && cA.cb.as >= 18 && cA.cb.ms >= 18 && cA.cb.jg > 0.3 && JSON.stringify(cA.cb.pr) === JSON.stringify([0.04, 14, 26]), `① 전투 값: HP ${cA.cb.hp} · AC ${cA.cb.ac} · 공속 +${cA.cb.as}% (아크 +18 포함) · 이속 +${cA.cb.ms}% · 심판 ${cA.cb.jg} · 인형 번개 ${JSON.stringify(cA.cb.pr)}`);
  // ② 봇 능력치 = 복사 × 비율 × 직업 보정 · ③ 모습
  const bots = await B.evaluate(() => { const R = __FB.roster(), pick = []; for (const c of ['knight', 'elf', 'wizard']) for (const t of ['A', 'B']) { const L = R[t].filter(b => b.cls === c).sort((x, y) => x.pct - y.pct); pick.push(L[0], L[L.length - 1]); } return pick.map(b => __FB.stOf(b.uid)); });
  let bad = []; for (const s of bots) { const E = expect(cB, s); for (const k in E) if (!near(s.st[k], E[k], k === 'd' || k === 'hb' ? 0.01 : 0)) bad.push(`${s.name}(${s.cls} ${s.pct}) ${k} ${s.st[k]}≠${E[k]}`); }
  console.log('② bots', bots.map(s => `${s.name} ${s.cls} ${s.pct} Lv${s.st.lv} HP${s.st.hp} AC${s.st.ac} MR${s.st.mr} D${s.st.d.toFixed(1)} 명중+${s.st.hb.toFixed(2)} 치명${s.st.cr} 공속+${s.st.as} 감소${s.st.dr} 번개${JSON.stringify(s.st.pr && s.st.pr.map(v => +v.toFixed(2)))}`).join('\n   '));
  ok(!bad.length, '② 봇 능력치 = 복사 × 비율 × 직업 보정 (기사·요정·법사 × 최저·최고 비율 × 두 혈맹) ' + bad.slice(0, 4).join(' / '));
  const kb = bots.find(s => s.cls === 'knight'), eb = bots.find(s => s.cls === 'elf'), wb = bots.find(s => s.cls === 'wizard');
  console.log('③ looks', JSON.stringify({ knight: [kb.eq, kb.pf, kb.dl, kb.en], elf: [eb.eq, eb.pf, eb.dl], wizard: [wb.eq, wb.pf, wb.dl] }));
  ok(kb.eq.weapon === 'lg_sword' && kb.eq.armor === 'fd_plate' && kb.eq.helm === 'dk_helm' && kb.eq.shield === 'cx_sh6' && kb.eq.cloak === 'cx_cl6' && kb.pf === 'pc_arc_knight' && kb.dl === 'wyvern' && kb.en === 7, '③ 같은 직업(기사) 봇 = 복사한 장비·변신·인형 그대로');
  ok(eb.eq.weapon === 'lg_bow' && eb.eq.armor === 'fd_leather' && eb.pf === 'pc_arc_ranger' && eb.dl === 'wyvern', '③ 요정 봇: 집행검 → 가이아의 격노 · 화룡의 갑옷 → 화룡의 가죽갑옷 · 아크레인저 · 같은 인형');
  ok(wb.eq.weapon === 'lg_staff' && wb.eq.armor === 'fd_robe' && wb.pf === 'pc_arc_mage' && wb.dl === 'wyvern', '③ 법사 봇: 수정결정체 지팡이 · 화룡의 로브 · 아크메이지 · 같은 인형');
  // 다른 변신 짝: 다크·실버 주문서 · 몬스터 카드
  const pm = await B.evaluate(() => { const o = {}; for (const pf of ['pm_sknight', 'pm_dknight', 'pc_deathknight', 'pc_sword_knight']) { __FB.setRef({ copy: { c: 'knight', lv: 55, cb: { hp: 900, ac: -60, mr: 40, d: 45 }, eq: {}, pf } }); o[pf] = ['knight', 'elf', 'wizard'].map(c => __FB.lookFor(c).pf); } __FB.setRef(null); return o; });
  console.log('③ poly map', JSON.stringify(pm)); ok(pm.pm_sknight.join() === 'pm_sknight,pm_sranger,pm_smage' && pm.pm_dknight.join() === 'pm_dknight,pm_dranger,pm_dmage' && pm.pc_deathknight.join() === 'pc_deathknight,pc_deathknight,pc_deathknight' && pm.pc_sword_knight.join() === 'pc_sword_knight,pc_sword_ranger,pc_sword_mage', '③ 변신 짝: 실버·다크는 같은 단계 · 몬스터 카드는 모든 직업 그대로 · 소드는 같은 시리즈');
  // ④ 서버 사진 (가짜 Firestore — 두 탭이 같이 보는 localStorage)
  const stub = () => { const C = __T.CLOUD, K = 'fakefs:'; window.__fs = { gets: 0, creates: 0, fail: false, paths: [] };
    C.on = () => true; C.uid = () => 'u_' + __T.NET.me();
    C.get = async p => { __fs.gets++; __fs.paths.push('get ' + p); await new Promise(r => setTimeout(r, 30)); if (__fs.fail) { const e = new Error('PERMISSION_DENIED'); e.status = 403; e.code = 'PERMISSION_DENIED'; throw e; } const v = localStorage.getItem(K + p); return v ? JSON.parse(v) : null; };
    C.create = async (p, o) => { __fs.creates++; __fs.paths.push('create ' + p); await new Promise(r => setTimeout(r, 30)); if (__fs.fail) return false; if (localStorage.getItem(K + p)) return false; localStorage.setItem(K + p, JSON.stringify(o)); return true; };
    for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k && k.startsWith(K)) localStorage.removeItem(k); } __FB.snapReset(); };
  await A.evaluate(stub); await B.evaluate(stub);
  await B.evaluate(() => __FB.snapNow()); await B.waitForTimeout(300); await A.evaluate(() => __FB.snapNow()); await A.waitForTimeout(600); await B.evaluate(() => __FB.snapNow()); await B.waitForTimeout(600);
  const snap = q => q.evaluate(() => { const S = __FB.snap(), R = __FB.ref(); return { slot: S.slot, cur: S.cur, src: R.src, n: R.n, lv: R.lv, reads: S.reads, writes: S.writes, mode: S.mode, err: S.err, fs: window.__fs, top: __FB.amTop(), keys: Object.keys(localStorage).filter(k => k.startsWith('fakefs:')) }; });
  const a4 = await snap(A), b4 = await snap(B); console.log('④ A', JSON.stringify(a4)); console.log('④ B', JSON.stringify(b4));
  const doc = await A.evaluate(s => JSON.parse(localStorage.getItem('fakefs:worldbot/s' + s)), a4.cur); console.log('④ doc', JSON.stringify(doc).slice(0, 400) + ' … ' + JSON.stringify(doc).length + 'B');
  ok(a4.top && !b4.top && a4.writes === 1 && b4.writes === 0 && a4.keys.length === 1 && doc && doc.s === String(a4.cur) && JSON.parse(doc.d).n === 'cpA', `④ 1등 PC(A)만 사진을 만듦 (worldbot/s${a4.cur} · ${JSON.stringify(doc).length}B · B는 만들지 않음)`);
  ok(a4.src === 'cloud' && b4.src === 'cloud' && b4.n === 'cpA' && b4.lv === 55 && a4.slot === a4.cur && b4.slot === b4.cur, '④ 두 PC 모두 서버 사진(cpA Lv55)을 씀');
  const cpEq = (x, y) => JSON.stringify([x.c, x.lv, x.cb, x.eq, x.pf, x.dl, x.st]) === JSON.stringify([y.c, y.lv, y.cb, y.eq, y.pf, y.dl, y.st]);
  { const x = await A.evaluate(() => __FB.copy()), y = await B.evaluate(() => __FB.copy()); ok(cpEq(x, y), '④ 두 PC의 사진 내용이 완전히 같음'); }
  // 같은 구간 안에서 접속자가 바뀜: B가 Lv60 + 센 장비로 1등이 되고 A는 약해짐 → 그래도 사진 그대로 (실시간이면 B로 바뀜)
  await B.evaluate(() => { const T = __T; T.hero.lv = 60; T.INV.load({ bag: [{ id: 'lg_bow', n: 1, en: 9, on: 'weapon' }, { id: 'fd_leather', n: 1, en: 7, on: 'armor' }, { id: 'red_potion', n: 50 }], bonus: { str: 0, dex: 12, con: 4, int: 0, wis: 0, cha: 0 } }); T.INV.render(); });
  await A.evaluate(() => { const T = __T; T.hero.lv = 20; T.INV.load({ bag: [{ id: 'red_potion', n: 5 }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); T.INV.render(); });
  await A.waitForTimeout(5500);
  const c4 = await Promise.all([A, B].map(q => q.evaluate(() => { const R = __FB.ref(), k = __FB.roster().A.find(b => b.cls === 'knight'); return { n: R.n, lv: R.lv, src: R.src, w: __FB.stOf(k.uid).eq.weapon, top: __FB.amTop(), cp: __T.NET.dbgPayload().cp }; })));
  console.log('④ after presence change', JSON.stringify(c4)); ok(c4.every(r => r.n === 'cpA' && r.lv === 55 && r.src === 'cloud' && r.w === 'lg_sword') && c4[1].top && !c4[0].top, '④ 같은 구간: B가 1등이 되고 A가 약해져도 사진(cpA Lv55 집행검) 그대로');
  // /혈맹 출처 표시
  const rep = async q => { await q.evaluate(() => { const e = document.getElementById('chat-in'); e.value = '/혈맹'; __T.CHAT.send(); }); await q.waitForTimeout(300); return q.evaluate(() => __T.log.map(l => l.t).filter(t => /봇 복사/.test(t)).slice(-1)[0] || ''); };
  { const t = await rep(B), nx = await B.evaluate(s => __FB.kHM(__FB.slotStart(s + 1)), b4.cur); console.log('④ /혈맹', t); ok(t.includes('봇 복사: cpA Lv.55 기사') && t.includes('다음 갱신 ' + nx), `④ /혈맹: 복사한 캐릭터 · 다음 갱신 ${nx} (한국 시간)`); }
  // ⑤ 새 구간 (시계를 2시간 밈) → 새 사진: 이번엔 B가 1등이라 B가 만듦
  await A.evaluate(() => { __FB.DBG.toff = 7200e3; }); await B.evaluate(() => { __FB.DBG.toff = 7200e3; });
  const prevSrc = await A.evaluate(async () => { await new Promise(r => setTimeout(r, 1200)); return __FB.ref().src; });
  await A.waitForTimeout(400); await A.evaluate(() => __FB.snapNow()); await A.waitForTimeout(600);
  const a5 = await snap(A), b5 = await snap(B); console.log('⑤ A', JSON.stringify(a5)); console.log('⑤ B', JSON.stringify(b5));
  ok(b5.cur === b4.cur + 1 && b5.writes === 1 && a5.writes === 1 && b5.keys.length === 2 && b5.src === 'cloud' && a5.src === 'cloud' && a5.n === 'cpB' && a5.lv === 60, `⑤ 새 구간 s${b5.cur}: 1등(B)이 새 사진을 만들고 두 PC 모두 cpB Lv60 요정 (사진 찾기 전 A는 '${prevSrc}')`);
  { const y = await A.evaluate(() => __FB.copy()), t = await A.evaluate(() => { const k = __FB.roster().A.find(b => b.cls === 'knight'), e = __FB.roster().A.find(b => b.cls === 'elf'); return [__FB.stOf(k.uid).eq.weapon, __FB.stOf(e.uid).eq.weapon, __FB.stOf(e.uid).eq.armor]; });
    console.log('⑤ looks', JSON.stringify(t), y.c, JSON.stringify(y.eq.weapon)); ok(y.c === 'elf' && t[1] === 'lg_bow' && t[2] === 'fd_leather' && t[0] === 'lg_sword', '⑤ 요정 사진: 요정 봇은 가이아의 격노 그대로 · 기사 봇은 짝인 집행검'); }
  // ⑥ 서버 실패 (권한 없음 = 규칙을 아직 안 넣음) → 실시간 기준 · 5분 뒤 다시
  await A.evaluate(() => { __fs.fail = true; __FB.snapReset(); __FB.snapNow(); }); await A.waitForTimeout(800);
  const a6 = await snap(A), t6 = await rep(A), wait6 = await A.evaluate(() => Math.round((__FB.snap().next - Date.now() - __FB.DBG.toff) / 1000)); console.log('⑥', JSON.stringify(a6), t6, 'next', wait6 + 's');
  ok(a6.mode === 'fail' && a6.src === 'live' && a6.n === 'cpB' && /실시간 기준/.test(t6) && wait6 > 240, `⑥ 서버 실패 → 실시간 기준(지금 1등 cpB) · /혈맹 "실시간 기준 · 서버 저장 안 됨" · ${wait6}초 뒤 다시`);
  await A.evaluate(() => { __T.CLOUD.on = () => false; __FB.snapReset(); __FB.snapNow(); }); await A.waitForTimeout(300);
  { const r = await snap(A); ok(r.mode === 'off' && r.src === 'live', '⑥ 로그아웃(서버 꺼짐)도 실시간 기준'); }
  // ⑦ 이상한 문서 → 범위 자르기
  const evil = await A.evaluate(() => { const C = __T.CLOUD; C.on = () => true; __fs.fail = false; const s = __FB.slotOf(Date.now() + __FB.DBG.toff) + 1, st = __FB.slotStart(s);
    localStorage.setItem('fakefs:worldbot/s' + s, JSON.stringify({ v: '1', s: String(s), at: String(st + 1000), u: 'evil', d: JSON.stringify({ n: '<b>해커</b>'.repeat(6) + '\n', c: 'knight', lv: 999, cp: 1e12, st: [999, -5, 30, 30, 30, 30],
      cb: { hp: 1e9, ac: -9999, mr: 99999, d: 1e6, hb: 50, cr: 9, as: 900, ms: 900, dr: 999, jg: 5, pr: [1, 1e5, 1e6] }, eq: { weapon: ['no_such_item', 99, 99], armor: ['fd_plate', 99, 99, 'x', 9], helm: ['lg_sword', 3, 0], cloak: 'cx_cl6', doll: ['doll_wyvern', 0, 0] }, pf: 'nope', dl: '../x' }) }));
    __FB.DBG.toff += 7200e3; __FB.snapNow(); return s; });
  await A.waitForTimeout(800);
  const c7 = await A.evaluate(() => { const R = __FB.ref(), L = __FB.roster().all.map(b => __FB.stOf(b.uid).st); return { src: R.src, copy: R.copy, max: { hp: Math.max(...L.map(s => s.hp)), d: Math.max(...L.map(s => s.d)), lv: Math.max(...L.map(s => s.lv)), mr: Math.max(...L.map(s => s.mr)), ac: Math.min(...L.map(s => s.ac)), as: Math.max(...L.map(s => s.as)) }, fin: L.every(s => ['hp', 'ac', 'mr', 'd', 'hb', 'cr', 'as', 'dr'].every(k => isFinite(s[k]))) }; });
  console.log('⑦', JSON.stringify(c7));
  const E7 = c7.copy;
  ok(c7.src === 'cloud' && E7.lv === 99 && E7.cb.hp <= 150 + 99 * 45 && E7.cb.ac >= -Math.round(20 + 99 * 2.5) && E7.cb.mr <= Math.round(40 + 99 * 2.5) && E7.cb.d <= 20 + 99 * 2.5 && E7.cb.hb <= 0.9 && E7.cb.cr <= 0.5 && E7.cb.as <= 40 && E7.cb.dr <= 15 && E7.cb.jg <= 0.6 && E7.cb.pr[0] <= 0.1 && E7.cb.pr[2] <= 80 && E7.cp <= 1e7 && c7.fin,
    `⑦ 이상한 문서: 레벨 99 · HP ${E7.cb.hp} · AC ${E7.cb.ac} · MR ${E7.cb.mr} · 피해 ${E7.cb.d} · 공속 +${E7.cb.as}% 로 잘림 (봇 최고 HP ${c7.max.hp})`);
  ok(!E7.eq.weapon && !E7.eq.helm && !E7.eq.cloak && JSON.stringify(E7.eq.armor) === JSON.stringify(['fd_plate', 15, 9]) && E7.eq.doll && E7.pf === '' && E7.dl === '' && !/[<>\n]/.test(E7.n) && E7.n.length <= 16 && E7.st.every(v => v >= 1 && v <= 60), '⑦ 모르는 아이템·부위가 틀린 아이템·없는 변신·인형은 버림 · 이름 정리 ' + JSON.stringify([E7.n, E7.eq, E7.st]));
  { const r = await A.evaluate(() => { const s = __FB.slotOf(Date.now() + __FB.DBG.toff) + 1; localStorage.setItem('fakefs:worldbot/s' + s, JSON.stringify({ v: '1', s: String(s + 5), at: '0', d: '{"c":"knight","lv":10}' })); __FB.DBG.toff += 7200e3; __FB.snapNow(); return s; });
    await A.waitForTimeout(1300); const q = await snap(A); console.log('⑦ wrong slot doc', JSON.stringify({ src: q.src, err: await A.evaluate(() => __FB.snap().err) })); ok(q.src === 'prev' || q.src === 'live', '⑦ 구간 번호가 틀린 문서는 안 씀 (지난 사진/실시간 기준)'); }
  // ⑧ 그림: 사진 = 센 기사(아크나이트·집행검·와이번 인형) → B 화면 사냥터에 반왕·라인 봇 세 직업
  await A.evaluate(() => { __FB.DBG.toff = 0; }); await B.evaluate(() => { __FB.DBG.toff = 0; __T.CLOUD.on = () => false; __FB.snapReset(); });
  await B.evaluate(cp => { __FB.setRef({ copy: cp }); __T.GOD_INV = true; __T.BUFF.invis = 9999; __T.TOWN.toZone(4); }, cA);   // 11/1: 봇은 2구역에만 await B.waitForTimeout(1200);
  await B.evaluate(() => { const F = __FB, R = F.roster(); F.DBG.noEnsure = true; F.DBG.noAI = true; for (const f of F.bots()) f.gone = true; __T.TOWN.placeAt(27.5, 30.5); const H = __T.hero;
    const pick = (t, c, k) => R[t].filter(b => b.cls === c)[k || 0].uid; [[pick('A', 'knight'), -3, -2], [pick('A', 'elf'), 0, -3], [pick('A', 'wizard'), 3, -2], [pick('B', 'knight'), -3, 2], [pick('B', 'elf'), 0, 3], [pick('B', 'wizard'), 3, 2]].forEach(([u, di, dj]) => F.spawnTest(u, H.i + di, H.j + dj)); });
  await B.waitForTimeout(4000); await B.screenshot({ path: 'dev/out/fbc_look.png' }); { const k = await B.evaluate(() => { const f = __FB.bots()[0]; return __T.scr(f.x, f.z); }); await B.screenshot({ path: 'dev/out/fbc_look_zoom.png', clip: { x: Math.max(0, k[0] - 160), y: Math.max(0, k[1] - 190), width: 320, height: 260 } }); }
  const lk = await B.evaluate(() => __FB.bots().map(f => `${f.bot.clan}:${f.bot.cls}:${f.bot.pf}:${f.bot.dl}:${f.bot.eq && f.bot.eq.weapon}`)); console.log('⑧ drawn', JSON.stringify(lk));
  ok(lk.length === 6 && lk.every(s => /:pc_arc_(knight|ranger|mage):wyvern:lg_/.test(s)), '⑧ 사냥터 봇 6명 모두 아크 시리즈·와이번 인형·전설 무기 (스크린샷 dev/out/fbc_look.png)');
  // 성능: 봇 8명이 가까이서 싸울 때 (아크 변신 색 입힌 그림은 프레임당 2장까지만 새로)
  await B.evaluate(() => { const F = __FB, H = __T.hero, R = F.roster(); F.DBG.noAI = false; for (let k = 0; k < 2; k++) F.spawnTest((k % 2 ? R.B : R.A)[6 + k].uid, H.i + k * 2 - 1, H.j + 1); });
  const fps = () => B.evaluate(() => new Promise(r => { let n = 0, w = 0; const L = [], t0 = performance.now(); let l = t0; const f = t => { n++; L.push(t - l); w = Math.max(w, t - l); l = t; if (t - t0 < 4000) requestAnimationFrame(f); else { L.sort((a, b) => a - b); r({ fps: Math.round(n / ((t - t0) / 1000)), p90ms: Math.round(L[Math.floor(L.length * 0.9)]), worstMs: Math.round(w), rc: PCG.rcCache().length }); } }; requestAnimationFrame(f); }));
  const pf1 = await fps(); await B.screenshot({ path: 'dev/out/fbc_fight.png' }); const pf2 = await fps();
  await B.evaluate(() => { const F = __FB; for (const f of F.bots()) f.gone = true; }); await B.waitForTimeout(500); const pf0 = await fps();
  console.log('⑧ perf', JSON.stringify({ noBots: pf0, bots8_first: pf1, bots8_after: pf2 }));
  ok(errs.length === 0, '⑨ 오류 없음'); console.log(errs.join('\n') || 'no errors');
  console.log(fails ? `FAIL ${fails}개` : 'ALL OK'); await br.close(); })();
