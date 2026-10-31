// 캐릭터 복사 (운영자 [복사 코드] → 테스트 페이지 갓 모드 [캐릭터 복사]) 테스트
//   python3 dev/mkkt.py && KT_PORT=8800 bash dev/runkt.sh dev/tests/charcopy.js   (스크린샷 dev/out/charcopy_*.png)
// A: Lv55 기사 (집행검 +5 불 2단 · 축복 갑옷 · 장신구 강화 · 인형 · 가호 · 변신 카드 · 버프 · 보너스 능력치 · 기본 HP/MP 다르게)
//    → 살펴보기 응답(운영자 명령 'insp' {cc:1})에 실린 복사 정보로 코드 만들기 (운영자 버튼과 같은 함수)
// B: 새 기사 (Lv60 · 더 높은 가호 · 다른 변신 카드 + 변신 주문서 · 다른 버프) → 갓 모드 패널에 붙여 넣고 [적용] → 레벨·기본 HP/MP·능력치·AC·MR·장비·인형·변신 모두 같음
// 그 밖: 다른 직업 코드 거절 · 망가진 코드 거절 · 원래 장비는 가방으로 · 높은 가호는 창고로 · 변신 주문서 복사 · 본섭(DEMO_MODE 아님)에는 적용 길 없음 · 페이지 오류 없음
const { chromium } = require('playwright'); const login = require('../tq.js'); const path = require('path');
const OUT = path.join(__dirname, '..', 'out'); const ok = [], bad = []; const chk = (c, m) => (c ? ok : bad).push(m);
const J = x => JSON.stringify(x);
(async () => { const b = await chromium.launch(); const errs = [];
  const cA = await b.newContext({ viewport: { width: 1280, height: 860 } }), cB = await b.newContext({ viewport: { width: 1280, height: 860 } });
  const A = await cA.newPage(), B = await cB.newPage(); A.on('pageerror', e => errs.push('A: ' + e.message)); B.on('pageerror', e => errs.push('B: ' + e.message));
  const t0 = Date.now() % 1e6; await login(A, { acc: 'cca' + t0, cls: 'knight', name: 'ccA' + t0 % 1e4 }); await login(B, { acc: 'ccb' + t0, cls: 'knight', name: 'ccB' + t0 % 1e4 });
  chk(await B.evaluate(() => !!document.getElementById('gp-cc') && !!document.getElementById('gp-cc-in') && typeof window.__CC === 'object'), '테스트 페이지 갓 모드 패널에 [캐릭터 복사] 칸');

  // ---------- A: 여러 가지가 섞인 Lv55 기사
  const SET = await A.evaluate(() => { const T = __T, I = T.INV, H = T.hero, IT = T.ITEMS, RK = { 일반: 0, 고급: 1, 희귀: 2, 영웅: 3, 전설: 4 };
    document.getElementById('gp-lv').value = 55; document.getElementById('gp-apply').click(); T.wizAutoLearn(true);   // 본섭처럼 레벨에 맞는 기술·마법
    H.baseHP += 37; H.baseMP += 3; H.exp = 12345.5;   // 기본 HP/MP가 레벨 공식과 다르게 (레벨업 굴림)
    for (const k of ['str', 'str', 'str', 'con', 'con', 'dex', 'str', 'str', 'con', 'wis']) I.addStat(k);   // 11개 중 10개 (1개 남김)
    const pick = (sl, n = 0) => Object.keys(IT).filter(id => { const d = IT[id]; return d.slot === sl && !d.hidden && !d.legend && d.rar !== '전설' && (!d.cls || d.cls.includes('knight')) && (!d.only || d.only === 'knight') && (d.lv || 0) <= 55; })
      .sort((a, b) => (RK[IT[b].rar] || 0) - (RK[IT[a].rar] || 0) || (IT[b].lv || 0) - (IT[a].lv || 0) || (a < b ? -1 : 1))[n];
    const wear = (id, set) => { I.add(id, 1, true); const e = I.bag().filter(x => x.id === id && !x.on).pop(); Object.assign(e, set || {}); I.use(e); return e.on; };
    for (const e of I.bag().filter(x => x.on)) I.use(e);   // 처음 장비는 벗음
    const on = {};
    on.weapon = wear('lg_sword', { en: 5, attr: { el: 'fire', lv: 2 } });
    on.armor = wear(pick('armor'), { en: 4, blessed: true }); on.helm = wear(pick('helm'), { en: 3 }); on.cloak = wear(pick('cloak'), { en: 1 }); on.gloves = wear(pick('gloves'), { en: 2 }); on.boots = wear(pick('boots'), { en: -1 });
    on.shield = wear(pick('shield'), { en: 2 }); on.shirt = wear(pick('shirt')); on.belt = wear(pick('belt'), { blessed: true }); on.amulet = wear(pick('amulet'), { en: 2 });
    on.ring1 = wear(pick('ring', 0), { en: 3, blessed: true }); on.ring2 = wear(pick('ring', 1), { en: 1 }); on.doll = wear('doll_troll');
    // 가방 효과: 가호 (같은 가호는 높은 것만) · 할로윈 모자
    const add = (id, set) => { I.add(id, 1, true); Object.assign(I.bag().filter(x => x.id === id).pop(), set || {}); };
    add('gaho_baphomet', { en: 3, blessed: true }); add('gaho_baphomet', { en: 1 }); add('gaho_queen_ant', { en: 2 }); add('hw_hat', { en: 4 });
    // 변신 카드 (변신 칸) · 버프
    const S = PCG.state(); S.cards.deathknight = 1; const pcOk = PCG.setSlot('deathknight');
    Object.assign(T.BUFF, { shieldm: 500, advsp: 1500, haste2: 1000, rmagic: 400 }); I.render(); H.hp = H.max; H.mp = H.maxmp;
    return { on, pcOk, eq: I.bag().filter(x => x.on).length, cur: PCG.cur() }; });
  console.log('A 착용:', J(SET.on));
  chk(Object.values(SET.on).every(Boolean) && SET.eq === 13 && SET.pcOk && SET.cur === 'pc_deathknight', `A 준비: 13칸 착용 (${SET.eq}) · 변신 카드 데스나이트 (${SET.cur})`);

  // ---------- 살펴보기 경로: 운영자 명령 'insp' {cc:1} → 응답(presence ar)에 복사 정보 · {cc} 없으면 예전과 같음
  const IP = await A.evaluate(() => { const T = __T; T.ADMIN.apply('insp', JSON.stringify({ cc: 1 }), 'peerX', 901); T.ADMIN.apply('insp', '{}', 'peerX', 902);
    const P = T.NET.dbgPayload(), ar = P.ar || [], r1 = ar.find(x => x[0] === 901), r2 = ar.find(x => x[0] === 902), d1 = r1 && JSON.parse(r1[3]), d2 = r2 && JSON.parse(r2[3]);
    return { to: r1 && r1[1], cmd: r1 && r1[2], cc: d1 && d1.cc, has2: !!(d2 && d2.cc), len1: r1 ? r1[3].length : 0, len2: r2 ? r2[3].length : 0, bag1: d1 ? d1.bag.length : 0, bag2: d2 ? d2.bag.length : 0, me: __CC.make(), code: __CC.code(), pbytes: new TextEncoder().encode(JSON.stringify(P)).length }; });
  const noBf = o => Object.assign({}, o, { bf: Object.keys(o.bf || {}).sort() });
  chk(IP.to === 'peerX' && IP.cmd === 'insp' && IP.cc && !IP.has2, `살펴보기 응답: {cc:1}이면 복사 정보 있음 · 평소 살펴보기는 없음`);
  chk(IP.cc && J(noBf(IP.cc)) === J(noBf(IP.me)), '살펴보기로 받은 복사 정보 = 내 캐릭터 복사 코드 내용 (버프 남은 시간 빼고)');
  chk(IP.len1 <= 1800 && IP.len2 <= 1800, `살펴보기 응답 크기 (공용 서버 1,800자 안): 복사 정보 ${IP.len1}자 (가방 ${IP.bag1}칸) · 평소 ${IP.len2}자 (가방 ${IP.bag2}칸) · presence ${IP.pbytes}B`);
  const code = await A.evaluate(cc => __CC.encode(cc), IP.cc);   // 운영자 [복사 코드] 버튼과 같은 함수 (받은 복사 정보 → 코드)
  console.log('코드 길이', code.length, '·', code.slice(0, 60) + '…'); console.log('코드 내용', J(IP.cc));
  chk(/^AWC1:[A-Za-z0-9_-]+\.[0-9a-z]+$/.test(code) && code.length < 2400, `코드 형식 AWC1:… (${code.length}자)`);
  const src = IP.cc;
  chk(src.c === 'knight' && src.lv === 55 && src.ex === 12345.5 && src.e.length === 13 && src.pc === 'deathknight' && !src.ps && src.bp === 1 && J(src.b) === J([5, 1, 3, 0, 1, 0]), `코드: 직업·레벨·경험치·보너스 ${J(src.b)} (남은 ${src.bp})·장비 13칸·변신 카드`);
  chk(J(src.e.find(r => r[0] === 'weapon')) === J(['weapon', 'lg_sword', 5, 0, 'fire', 2]) && src.e.some(r => r[0] === 'doll' && r[1] === 'doll_troll') && src.e.some(r => r[0] === 'armor' && r[2] === 4 && r[3] === 1), `코드 장비: 집행검 +5 불 2단 · 축복 갑옷 +4 · 트롤 인형`);
  chk(J((src.g || []).slice().sort()) === J([['gaho_baphomet', 3, 1], ['gaho_queen_ant', 2], ['hw_hat', 4]].sort()), `코드 가방 효과: ${J(src.g)}`);
  chk(J(Object.keys(src.bf || {}).sort()) === J(['advsp', 'haste2', 'rmagic', 'shieldm']), `코드 버프: ${Object.keys(src.bf || {}).join(',')}`);

  // ---------- B: 다른 상태의 새 기사
  const B0 = await B.evaluate(() => { const T = __T, I = T.INV, H = T.hero;
    document.getElementById('gp-lv').value = 60; document.getElementById('gp-apply').click(); T.wizAutoLearn(true); I.addStat('dex'); I.addStat('int');
    const eq0 = I.bag().filter(x => x.on).map(x => x.id);
    I.add('gaho_baphomet', 1, true); Object.assign(I.bag().filter(x => x.id === 'gaho_baphomet').pop(), { en: 6 }); I.add('gaho_ogre', 1, true);
    const S = PCG.state(); S.cards.spartoi = 1; PCG.setSlot('spartoi');
    const scr = Object.keys(T.ITEMS).find(id => T.ITEMS[id].use === 'poly' && T.ITEMS[id].tier === 'dark'); I.add(scr, 1, true); I.use(I.bag().find(x => x.id === scr));
    T.BUFF.enchant = 200; T.BUFF.shieldm = 50; I.render();
    return { eq0, cur: PCG.cur(), v: __CC.vals() }; });
  console.log('B 처음 장비:', B0.eq0.join(','), '· 변신', B0.cur);
  chk(B0.eq0.length >= 2 && B0.cur === 'pm_dknight', `B 준비: 처음 장비 ${B0.eq0.length}개 · 변신 주문서 다크나이트`);

  // ---------- 잘못된 코드는 거절 (상태 그대로 · 확인 창 없음)
  const tryCode = t => B.evaluate(t => { const v0 = JSON.stringify(__CC.vals()); document.getElementById('gp-cc-in').value = t; document.getElementById('gp-cc-go').click();
    const ask = !document.getElementById('askwin').hidden; if (ask) document.getElementById('ask-no').click(); return { res: document.getElementById('gp-cc-res').textContent, ask, same: JSON.stringify(__CC.vals()) === v0 }; }, t);
  { const o = JSON.parse(J(src)); o.c = 'elf'; const r = await tryCode(await B.evaluate(o => __CC.encode(o), o));
    chk(/요정 캐릭터로 접속해서 붙여 넣어 주세요/.test(r.res) && !r.ask && r.same, `다른 직업 코드 거절: "${r.res}"`); }
  { const i = 30, flip = code.slice(0, i) + (code[i] === 'A' ? 'B' : 'A') + code.slice(i + 1), r = await tryCode(flip);
    chk(/손상/.test(r.res) && !r.ask && r.same, `글자 하나 바뀐 코드 거절: "${r.res}"`); }
  { const r = await tryCode(code.slice(0, -12)); chk(/손상|형식/.test(r.res) && !r.ask && r.same, `잘린 코드 거절: "${r.res}"`); }
  { const r = await tryCode('안녕하세요'); chk(/형식이 아니에요/.test(r.res) && !r.ask && r.same, `코드가 아닌 글 거절: "${r.res}"`); }
  { const r = await tryCode(code.replace('AWC1:', 'AWC9:')); chk(/모르는 코드/.test(r.res) && !r.ask && r.same, `모르는 버전 거절: "${r.res}"`); }
  { const o = JSON.parse(J(src)); o.e[0][1] = 'zz_fake'; const r = await tryCode(await B.evaluate(o => __CC.encode(o), o)); chk(/없는 아이템/.test(r.res) && !r.ask && r.same, `없는 아이템 거절: "${r.res}"`); }
  { const o = JSON.parse(J(src)); o.lv = 150; const r = await tryCode(await B.evaluate(o => __CC.encode(o), o)); chk(/레벨/.test(r.res) && !r.ask && r.same, `레벨 범위 밖 거절: "${r.res}"`); }
  { const o = JSON.parse(J(src)); o.e.find(r => r[0] === 'weapon')[2] = 99; const r = await tryCode(await B.evaluate(o => __CC.encode(o), o)); chk(/강화/.test(r.res) && !r.ask && r.same, `강화 범위 밖 거절: "${r.res}"`); }
  { const o = JSON.parse(J(src)); o.e.find(r => r[0] === 'helm')[0] = 'boots'; const r = await tryCode(await B.evaluate(o => __CC.encode(o), o)); chk(/칸/.test(r.res) && !r.ask && r.same, `칸이 맞지 않는 장비 거절: "${r.res}"`); }
  { const o = JSON.parse(J(src)), r1 = o.e.find(r => r[0] === 'ring1'), r2 = o.e.find(r => r[0] === 'ring2'); r1[1] = r2[1];   // 버전이 달라 같은 아이디가 다른 아이템을 가리키는 경우 (이름 확인값이 안 맞음)
    const r = await tryCode(await B.evaluate(o => __CC.encode(o), o)); chk(/아이템이 달라요/.test(r.res) && !r.ask && r.same, `아이템 이름 확인값이 다르면 거절: "${r.res}"`); }
  // 본섭(DEMO_MODE 아님)에는 적용 길이 없음
  { const r = await B.evaluate(o => { window.DEMO_MODE = false; try { const v0 = JSON.stringify(__CC.vals()); return { r: __CC.apply(o), n: __T.INV.ccSet([], {}), same: JSON.stringify(__CC.vals()) === v0 }; } finally { window.DEMO_MODE = true; } }, src);
    chk(!r.r.ok && r.n === -1 && r.same, `DEMO_MODE가 아니면 적용 안 됨: "${r.r.msg}"`); }

  // ---------- 적용 (갓 모드 패널 → [적용] → 확인 창 [네])
  await B.evaluate(() => { document.getElementById('godpanel').hidden = false; document.getElementById('gp-cc-in').value = ''; document.getElementById('gp-cc-res').textContent = ''; });
  { const inv0 = await B.evaluate(() => document.getElementById('invwin').hidden); await B.click('#gp-cc-in'); await B.keyboard.type('i a'); await B.keyboard.press('Tab');   // 칸 안에서 친 글자는 게임 단축키로 안 감
    const r = await B.evaluate(() => ({ v: document.getElementById('gp-cc-in').value, inv: document.getElementById('invwin').hidden })); chk(r.v === 'i a' && r.inv === inv0, `복사 코드 칸에 글자 입력: 게임 단축키로 안 감 ("${r.v}")`); }
  await B.fill('#gp-cc-in', code); await B.click('#gp-cc-go');   // 실제로 붙여 넣고 [적용] 클릭
  const Q = await B.evaluate(() => ({ ask: !document.getElementById('askwin').hidden, q: document.getElementById('ask-q').textContent, sub: document.getElementById('ask-sub').textContent }));
  chk(Q.ask && /Lv\.55/.test(Q.q) && /가방으로/.test(Q.sub), `확인 창: "${Q.q}" · ${Q.sub}`);
  await B.evaluate(() => document.getElementById('ask-yes').click()); await B.waitForTimeout(300);
  const R = await B.evaluate(() => { const T = __T, I = T.INV; return { res: document.getElementById('gp-cc-res').textContent, m: __CC.make(), bag: I.bag().map(e => [e.id, e.on || 0, e.en || 0, e.blessed ? 1 : 0]), store: T.STORE.list().map(e => [e.id, e.en || 0]), cur: PCG.cur(), slot: PCG.state().slot.knight, gl: document.getElementById('gp-lv').value, log: T.log.slice(-8).map(l => l.t || l.text || '').join(' | ') }; });
  console.log('결과:', R.res);
  chk(/똑같이 맞췄어요/.test(R.res), `결과 "똑같이 맞췄어요": ${R.res}`);
  const m = R.m, sa = src.s, sb = m.s;
  chk(m.lv === 55 && m.ex === 12345.5 && m.bh === src.bh && m.bm === src.bm && R.gl === '55', `레벨 ${m.lv} · 경험치 ${m.ex} · 기본 HP/MP ${m.bh}/${m.bm} (코드 ${src.bh}/${src.bm})`);
  chk(J(m.b) === J(src.b) && m.bp === src.bp, `보너스 능력치 ${J(m.b)} · 남은 ${m.bp}`);
  chk(J(sb.st) === J(sa.st), `최종 능력치 ${J(sb.st)} = ${J(sa.st)}`);
  for (const k of ['hp', 'mp', 'ac', 'mr', 'sp', 'cp', 'sk']) chk(sb[k] === sa[k], `${k} ${sb[k]} = ${sa[k]}`);
  chk(J(sb.dm) === J(sa.dm), `공격 ${sb.dm.join('~')} = ${sa.dm.join('~')}`);
  chk(J(m.e) === J(src.e), '착용 장비 13칸 (아이디·강화·축복·속성) 모두 같음');
  for (const r of src.e) { const g = m.e.find(x => x[0] === r[0]); chk(J(g) === J(r), `  ${r[0]}: ${J(g)}`); }
  chk(m.e.some(r => r[0] === 'doll' && r[1] === 'doll_troll'), '인형: 트롤');
  chk(m.pc === 'deathknight' && R.slot === 'deathknight' && R.cur === 'pc_deathknight' && sb.pf === 'pc_deathknight' && !m.ps, `변신 칸 데스나이트 · 지금 변신 ${R.cur} (B의 변신 주문서는 풀림)`);
  chk(J(Object.keys(m.bf || {}).sort()) === J(Object.keys(src.bf).sort()) && Object.keys(src.bf).every(k => Math.abs(m.bf[k] - src.bf[k]) <= 30), `버프 같음 ${J(m.bf)} (B의 인챈트 웨폰은 지움)`);
  chk(J((m.g || []).slice().sort()) === J((src.g || []).slice().sort()), `가방 효과 같음 ${J(m.g)}`);
  // 원래 장비는 가방으로 · 높은 가호·코드에 없는 가호는 창고로
  chk(B0.eq0.every(id => R.bag.some(e => e[0] === id && !e[1])), `원래 장비 ${B0.eq0.join(',')} → 가방 (지우지 않음)`);
  chk(R.store.some(e => e[0] === 'gaho_baphomet' && e[1] === 6) && R.store.some(e => e[0] === 'gaho_ogre') && !R.bag.some(e => e[0] === 'gaho_baphomet' && e[2] === 6), `높은 가호(+6 바포메트)·코드에 없는 가호(오우거)는 창고로: ${J(R.store)}`);
  await B.evaluate(() => document.getElementById('gp-cc-res').scrollIntoView({ block: 'end' })); await B.waitForTimeout(150);
  { const bx = await B.evaluate(() => { const r = document.getElementById('godpanel').getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
    await B.screenshot({ path: path.join(OUT, 'charcopy_god.png'), clip: { x: Math.max(0, bx[0] - 4), y: Math.max(0, bx[1] - 4), width: Math.min(bx[2] + 8, 1280 - bx[0]), height: Math.min(bx[3] + 8, 860 - bx[1]) } }).catch(e => console.log('스크린샷 실패', e.message)); }

  // ---------- 변신 주문서 복사: A가 실버 변신 주문서를 읽은 상태 → 코드 → B
  const code2 = await A.evaluate(() => { const T = __T, I = T.INV, scr = Object.keys(T.ITEMS).find(id => T.ITEMS[id].use === 'poly' && T.ITEMS[id].tier === 'silver'); I.add(scr, 1, true); I.use(I.bag().find(x => x.id === scr)); return { c: __CC.code(), m: __CC.make(), cur: PCG.cur() }; });
  chk(code2.m.ps === 'pm_sknight' && code2.m.pt > 1700 && code2.m.pc === 'deathknight', `A 실버 변신 주문서 → 코드 ps ${code2.m.ps} (${code2.m.pt}초) · 변신 칸은 그대로`);
  await B.evaluate(t => { document.getElementById('gp-cc-in').value = t; document.getElementById('gp-cc-go').click(); document.getElementById('ask-yes').click(); }, code2.c); await B.waitForTimeout(200);
  const R2 = await B.evaluate(() => ({ res: document.getElementById('gp-cc-res').textContent, m: __CC.make(), cur: PCG.cur(), bag: __T.INV.bag().filter(e => e.on).length, all: __T.INV.bag().length }));
  chk(/똑같이 맞췄어요/.test(R2.res) && R2.cur === 'pm_sknight' && R2.m.ps === 'pm_sknight' && R2.m.pc === 'deathknight' && R2.m.s.cp === code2.m.s.cp && R2.m.s.ac === code2.m.s.ac, `변신 주문서까지 복사: ${R2.cur} · 전투력 ${R2.m.s.cp} = ${code2.m.s.cp} · ${R2.res}`);
  chk(R2.bag === 13, `두 번째 적용: 착용 13칸 · 가방 ${R2.all}칸 (앞서 복사한 장비는 가방으로)`);
  // 다른 점이 있으면 목록으로 (코드 수치를 일부러 바꿈)
  { const o = JSON.parse(J(code2.m)); o.s.hp += 7; o.s.st[0] -= 1; const r = await B.evaluate(o => { document.getElementById('gp-cc-in').value = __CC.encode(o); document.getElementById('gp-cc-go').click(); document.getElementById('ask-yes').click(); return document.getElementById('gp-cc-res').textContent; }, o);
    chk(/다른 점 2개/.test(r) && /최대 HP/.test(r) && /힘/.test(r), `다른 점 목록: ${r}`); }

  // 축복 지팡이의 축복 SP · 물 3단 · 음수 강화도 그대로 (장비 칸 값만 확인 — 지팡이로 바꾼 코드라 수치 비교는 다를 수 있음)
  { const o = JSON.parse(J(code2.m)); delete o.ih; o.e = o.e.map(r => r[0] === 'weapon' ? ['weapon', 'lg_staff', -2, 1, 'water', 3, 2] : r);
    const r = await B.evaluate(o => { const sp0 = __T.INV.sp(), R = __CC.apply(o), w = __CC.make().e.find(x => x[0] === 'weapon'); return { ok: R.ok, w, sp: __T.INV.sp(), e: __T.INV.eqE('weapon') }; }, o);
    chk(r.ok && J(r.w) === J(['weapon', 'lg_staff', -2, 1, 'water', 3, 2]) && r.e.blessSp === 2 && r.e.attr.el === 'water' && r.e.attr.lv === 3, `축복 지팡이 축복 SP 2 · 물 3단 · -2 강화 그대로: ${J(r.w)} (SP ${r.sp})`); }

  // ---------- 본섭 화면(DEMO_MODE 없음)에는 [캐릭터 복사] 칸·테스트 훅 없음
  { const cC = await b.newContext(), C = await cC.newPage(); await C.goto('http://127.0.0.1:' + (process.env.KT_PORT || 8766) + '/index.html'); await C.waitForTimeout(2500);
    const r = await C.evaluate(() => ({ gp: !!document.getElementById('godpanel'), cc: !!document.getElementById('gp-cc'), hook: typeof window.__CC, demo: !!window.DEMO_MODE })); await cC.close();
    chk(r.gp && !r.cc && r.hook === 'undefined' && !r.demo, `본섭 index.html: 갓 모드 패널은 있어도 [캐릭터 복사] 칸 없음 · 테스트 훅 없음 (${J(r)})`); }

  chk(!errs.length, '페이지 오류 없음' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(ok.map(m => 'OK  ' + m).join('\n')); if (bad.length) console.log(bad.map(m => 'BAD ' + m).join('\n'));
  console.log(bad.length ? `FAIL ${bad.length}/${ok.length + bad.length}` : `PASS ${ok.length}/${ok.length}`); await b.close(); })();
