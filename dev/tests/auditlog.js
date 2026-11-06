// 11/6 기록(감사 기록) — Firestore audit 컬렉션에 사건마다 문서 1개 만들기만 · 운영자 [살펴보기 → 기록] 표 · 수상한 점 표시
//   KT_PORT=8905 bash dev/runkt.sh dev/tests/auditlog.js   (같은 브라우저 탭 3개 ?mp=bc: U 기록하는 유저 · P 거래 상대 · M 운영자 — 진짜 운영자 키는 안 씀: admlv.js처럼 테스트 키)
//   Firestore는 테스트에서 못 쓰므로 U의 CLOUD.create, M의 CLOUD.query를 가짜(같은 브라우저 localStorage 'fakefs:audit/…')로 바꿈 · U는 AUDIT._force(true) (테스트 페이지는 데모라 원래는 기록 안 함)
//   ① 강화(주문서 직접 성공·증발·안전 구간 +7·장신구 · 강화 창 단일 · 다중) ② 축복 부여 성공·실패 ③ 뽑기 영웅·전설·합성 ④ 거래 ⑤ 운영자 지급(+8 장비·골드) ⑥ 상태 사진 ⑦ 골드 급증(설명된 것은 안 셈)
//   운영자 [기록] 표 · '설명 안 되는 변화'(+18 · 기록 없이 생긴 +13 · 증발 뒤 그대로) · 살펴보기 수상한 점(+18 방어구) · 규칙 없음(403) → 경고 1번·다시 시도 · 데모/운영자는 기록 안 함 · 오류 없음
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const login = require('../tq.js');
const F = path.join(__dirname, '..', '..', 'src', '_kt2.js');
let fails = 0; const ok = (c, m, x) => { console.log((c ? 'OK   ' : 'FAIL ') + m + (x !== undefined && !c ? ' ' + JSON.stringify(x).slice(0, 600) : '')); if (!c) fails++; };
(async () => { const s0 = fs.readFileSync(F, 'utf8'); let b;
  try { const { subtle } = require('crypto').webcrypto; const kp = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const pub = await subtle.exportKey('jwk', kp.publicKey), priv = await subtle.exportKey('jwk', kp.privateKey);
    fs.writeFileSync(F, s0.replace(/const ADMIN_PUB = \{[^}]*\};/, `const ADMIN_PUB = ${JSON.stringify({ kty: 'EC', crv: 'P-256', x: pub.x, y: pub.y })};`));
    b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const errs = [], warns = []; const t0 = Date.now() % 1e6;
    const page = async (nm, cls) => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(nm + ': ' + e.message)); p.on('console', m => { if (/\[기록\]/.test(m.text())) warns.push(nm + ': ' + m.text()); });
      await login(p, { acc: nm.toLowerCase() + t0, cls, name: nm + t0 % 1e4, mp: true }); await p.evaluate(() => { __T.hero.lv = 55; __T.GOD_INV = false; }); return p; };
    const U = await page('auU', 'knight'), P = await page('auP', 'elf'); const UID = 'uidU' + t0, UN = 'auU' + t0 % 1e4;
    const yes = async p => { await p.waitForFunction(() => !document.getElementById('askwin').hidden, null, { timeout: 8000 }); await p.click('#ask-yes'); };
    // ---------- U 준비: 장비 · 골드 · 가짜 Firestore · 기록 켬 (첫 사진은 바로)
    const IDS = await U.evaluate(() => { const T = __T, by = n => Object.keys(T.ITEMS).find(k => T.ITEMS[k].name === n && !T.ITEMS[k].hidden); return { SH: 'cx_sh6', TS: 'cx_ts6', HM: 'cx_hm5', GL: 'cx_gl5', RING: by('힘의 반지'), nm: { SH: T.ITEMS.cx_sh6.name, TS: T.ITEMS.cx_ts6.name, HM: T.ITEMS.cx_hm5.name } }; });
    console.log('items', JSON.stringify(IDS));
    await U.evaluate(I_ => { const T = __T, I = T.INV; I.load({ bag: [{ id: I_.SH, n: 1, en: 9 }, { id: I_.TS, n: 1, en: 4 }, { id: I_.HM, n: 1, en: 7 }, { id: 'dv_sword', n: 1, en: 5, on: 'weapon' }, { id: 'long_sword', n: 1, en: 5 }, { id: I_.RING, n: 1, en: 6 },
      { id: I_.GL, n: 1, en: 3 }, { id: I_.GL, n: 1, en: 3 }, { id: 'scroll_armor', n: 30 }, { id: 'bscroll_weapon', n: 5 }, { id: 'scroll_acc', n: 5 }, { id: 'bless_scroll', n: 3 }, { id: 'red_potion', n: 50 }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); I.render(); T.setCoins(8000000); }, IDS);
    await U.evaluate(uid => { const C = __T.CLOUD, K = 'fakefs:'; window.__fs = { creates: 0, fail: false, thr: false };
      for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k && k.startsWith(K)) localStorage.removeItem(k); }
      const enc = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]));   // 진짜 CLOUD처럼 모든 값을 문자열로
      C.on = () => true; C.uid = () => uid; C.get = async () => null; C.set = async () => true; C.list = async () => []; C.query = async () => []; C.beacon = () => true;
      C.create = async (p, o) => { __fs.creates++; await new Promise(r => setTimeout(r, 5)); if (__fs.thr) throw new Error('network'); if (__fs.fail) return false; if (localStorage.getItem(K + p)) return false; localStorage.setItem(K + p, JSON.stringify(enc(o))); return true; };
      __AUDIT.C.first = 0; __AUDIT._force(true); __AUDIT.tick(); }, UID);
    await U.waitForTimeout(400);
    const docs = () => U.evaluate(() => { const L = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('fakefs:audit/')) { const o = JSON.parse(localStorage.getItem(k)); o.__id = k.slice(13); o.D = JSON.parse(o.d); L.push(o); } } return L.sort((a, b) => a.t.localeCompare(b.t)); });
    { const L = await docs(), s = L.find(x => x.k === 'snap'); console.log('첫 사진', JSON.stringify(s).slice(0, 700));
      ok(L.length === 1 && s && s.D.f === 1 && s.D.lv === 55 && s.D.g === 8000000 && s.D.eq.some(e => e[0] === 'dv_sword' && e[1] === 5) && s.D.hi.some(e => e[0] === IDS.SH && e[1] === 9) && s.D.hi.some(e => e[0] === IDS.HM && e[1] === 7) && s.D.sk[0][0] === 'red_potion' && s.D.sk[0][1] === 50 && s.D.cp > 0, '⑥ 접속 사진 1장 (레벨·골드·전투력·착용·가방 +7 이상·많은 것 상위)');
      ok(s && s.u === UID && s.n === UN && s.c === 'knight' && /^\d{13}$/.test(s.t) && +s.v > 200 && s.__id.startsWith(UID + '_') && typeof s.d === 'string', '문서 모양: u·n·c·k·t(ms)·v(GAME_VER)·d(JSON) · id = uid_시각_난수', s && { u: s.u, n: s.n, c: s.c, t: s.t, v: s.v, id: s.__id }); }
    const gap = () => U.waitForTimeout(30);
    // ---------- ① 강화
    const scroll = (sid, id, en, rnd, ask) => U.evaluate(([sid, id, en, rnd, ask]) => { const T = __T, I = T.INV, e = I.bag().find(x => x.id === id && (x.en || 0) === en); if (!e) return 'no item'; I.setHot(11, sid); I.useHot(11); const R0 = Math.random; Math.random = () => rnd;
      try { I.applyScroll(e); const y = document.getElementById('ask-yes'); if (ask && y && !document.getElementById('askwin').hidden) y.onclick(); } finally { Math.random = R0; } return { en: e.en, inBag: I.bag().includes(e), bl: !!e.blessed }; }, [sid, id, en, rnd, ask]);
    const r1 = await scroll('scroll_armor', IDS.SH, 9, 0, 1); await gap();   // +9 → +10 성공
    const r2 = await scroll('scroll_armor', IDS.TS, 4, 0.99, 1); await gap();   // +4 증발
    const r3 = await scroll('bscroll_weapon', 'dv_sword', 5, 0.99, 0); await gap();   // 안전 구간 +5 → +7 (축복 2단계)
    const r4 = await scroll('scroll_acc', IDS.RING, 6, 0, 1); await gap();   // 장신구 +6 → +7
    const r5 = await scroll('scroll_armor', IDS.HM, 7, 0.99, 1); await gap();   // +7 증발 → 되돌리기 흉내: 같은 +7을 다시 넣음 (기록 없이)
    await U.evaluate(id => { __T.INV.add(id, 1, true); const e = __T.INV.bag().filter(x => x.id === id).pop(); e.en = 7; __T.INV.render(); }, IDS.HM);
    console.log('scroll', JSON.stringify([r1, r2, r3, r4, r5]));
    ok(r1.en === 10 && !r2.inBag && r3.en === 7 && r4.en === 7 && !r5.inBag, '주문서 결과 (흐름은 그대로): +9→+10 · +4 증발 · +5→+7 · 반지 +6→+7 · +7 증발');
    // 강화 창 단일 (enRoll · 안전 구간 결과 +7)
    await U.evaluate(() => { const I = __T.INV, bag = I.bag(), e = bag.find(x => x.id === 'long_sword'); if (document.getElementById('bulkwin').hidden) I.bulkOpen(); I.render(); document.querySelectorAll('#inv-grid > button')[bag.indexOf(e)].click(); });
    await U.waitForTimeout(200); await U.click('#bulkwin [data-es="bscroll_weapon"]'); await U.waitForTimeout(100);
    const w1 = await U.evaluate(() => { const R0 = Math.random; Math.random = () => 0.99; try { document.getElementById('en-go').click(); } finally { Math.random = R0; } const e = __T.INV.bag().find(x => x.id === 'long_sword'); return e && e.en; });
    await U.waitForTimeout(400); ok(w1 === 7, '강화 창(단일): 롱소드 +5 → +7 (축복)', w1);
    // 다중 강화 (enRoll · 장갑 2개 +3 → 목표 +5: 안전 +4까지 한 번에, 그 뒤 차례대로)
    await U.click('#bulkwin [data-et="multi"]'); await U.waitForTimeout(150);
    await U.evaluate(id => { const I = __T.INV, bag = I.bag(); for (const e of bag.filter(x => x.id === id)) { I.render(); document.querySelectorAll('#inv-grid > button')[I.bag().indexOf(e)].click(); } }, IDS.GL);
    await U.click('#bulkwin [data-g="5"]'); await U.click('#en-mgo'); await yes(U);
    await U.waitForFunction(() => /목표 도달/.test((document.querySelector('#en-mlog .hd') || {}).textContent || ''), null, { timeout: 15000 });
    const ML = await U.evaluate(() => ({ hd: document.querySelector('#en-mlog .hd').textContent, all: document.getElementById('en-mlog').textContent }));
    const used = +((ML.hd.match(/주문서 (\d+)장/) || [])[1] || -1), safeOk = +((ML.all.match(/안전 강화까지 한 번에: 성공 (\d+)회/) || [])[1] || 0); console.log('multi', ML.hd, '| safe', safeOk);
    await U.evaluate(() => { const I = __T.INV; if (!document.getElementById('bulkwin').hidden) I.bulkOpen(); }); await gap();
    // ② 축복 부여: 무기 성공 · 투구 실패
    const bl = (id, en, rnd) => U.evaluate(([id, en, rnd]) => { const I = __T.INV, t = I.bag().find(x => x.id === id && (x.en || 0) === en); I.use(I.bag().find(e => e.id === 'bless_scroll')); const R0 = Math.random; Math.random = () => rnd; try { I.applyScroll(t); } finally { Math.random = R0; } return !!t.blessed; }, [id, en, rnd]);
    const b1 = await bl('dv_sword', 7, 0); await gap(); const b2 = await bl(IDS.HM, 7, 0.99); await gap(); ok(b1 && !b2, '축복 부여: 무기 성공 · 투구 실패');
    // ③ 뽑기 (영웅·전설만 기록) · 합성
    const GA = await U.evaluate(() => { const L = PCG.K.CARDS.filter(c => c.g === '전설'), H = PCG.K.CARDS.filter(c => c.g === '영웅'), N = PCG.K.CARDS.filter(c => c.g === '일반'), DH = DCG.K.CARDS.filter(c => c.g === '영웅');
      PCG.setSkip(true); DCG.setSkip(true); PCG._force([L[0].id]); PCG.draw(1); PCG.close(); PCG._force([N[0].id]); PCG.draw(1); PCG.close(); DCG._force([DH[0].id]); DCG.draw(1); DCG.close();
      const s = PCG.state(); s.cards[H[0].id] = (s.cards[H[0].id] || 0) + 4; PCG._force([L[1].id]); const R0 = Math.random; Math.random = () => 0; let r; try { r = PCG.manSyn([H[0].id, H[0].id, H[0].id, H[0].id]); } finally { Math.random = R0; } PCG.close();
      return { L0: L[0].id, L1: L[1].id, DH: DH[0].id, syn: r && r.map(x => x.ok + ':' + x.c.id).join() }; });
    console.log('gacha', JSON.stringify(GA)); await U.waitForTimeout(500);
    // ④ 거래: P → U 힘의 반지 +8 · 골드 1,500,000 / U → P 빨간 물약
    await P.evaluate(r => { const I = __T.INV; I.load({ bag: [{ id: r, n: 1, en: 8 }, { id: 'red_potion', n: 3 }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); I.render(); __T.setCoins(2000000); }, IDS.RING);
    const pPeer = await P.evaluate(() => __T.NET.me()); await U.waitForFunction(p => __T.NET.others().some(o => o.peer === p), pPeer, { timeout: 20000 });
    await U.evaluate(p => __T.TRADE.request(p), pPeer); await yes(P); await U.waitForFunction(() => !document.getElementById('tradewin').hidden, null, { timeout: 8000 }); await U.waitForTimeout(400);
    await U.evaluate(() => { const bag = __T.INV.bag(), e = bag.find(x => x.id === 'red_potion'); document.querySelector(`#tradewin [data-bag="${bag.indexOf(e)}"]`).click(); });
    await P.evaluate(r => { const bag = __T.INV.bag(), e = bag.find(x => x.id === r); document.querySelector(`#tradewin [data-bag="${bag.indexOf(e)}"]`).click(); }, IDS.RING); await P.fill('#tw-gold', '1500000'); await U.waitForTimeout(700);
    const coinsBeforeTrade = await U.evaluate(() => __T.coins);
    await U.click('#tw-ok'); await P.click('#tw-ok'); await U.waitForTimeout(700); await yes(U); await yes(P); await U.waitForTimeout(1500);
    const TR = await U.evaluate(r => ({ ring8: __T.INV.bag().some(x => x.id === r && x.en === 8), coins: __T.coins, pot: __T.INV.bag().some(x => x.id === 'red_potion') }), IDS.RING);
    ok(TR.ring8 && TR.coins - coinsBeforeTrade === 1500000 && !TR.pot, '거래 완료 (반지 +8·골드 150만 받고 물약 줌)', TR);
    // ⑤ 운영자: M (테스트 키) → U에게 +8 반역자의 방패 · 골드 2,500,000 (설명된 골드라 급증으로 안 셈)
    const M = await page('auM', 'knight'); await M.evaluate(j => { __T.ACCOUNT.acc = () => 'adengm'; window.ADEN_ADMIN = { acc: 'adengm', jwk: j }; return __T.ADMIN.tryOn(); }, priv); await M.waitForTimeout(600);
    await M.evaluate(() => { const C = __T.CLOUD, K = 'fakefs:'; window.__rd = 0; C.query = async (col, ord, n) => { __rd++; await new Promise(r => setTimeout(r, 20)); const L = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(K + col + '/')) L.push(JSON.parse(localStorage.getItem(k))); } L.sort((a, b) => String(b[ord]).localeCompare(String(a[ord]))); return L.slice(0, n); }; });
    const uPeer = await U.evaluate(() => __T.NET.me()); await M.waitForFunction(p => __T.NET.others().some(o => o.peer === p), uPeer, { timeout: 20000 });
    await M.click('#btn-adm'); await M.waitForSelector(`#adm-list tr[data-p="${uPeer}"]`, { timeout: 8000 }); await M.click(`#adm-list tr[data-p="${uPeer}"] button[data-a="insp"]`); await M.waitForSelector('#adm-re', { timeout: 15000 });
    await U.evaluate(() => __AUDIT.tick()); await U.waitForTimeout(50);
    await M.fill('#adm-it', IDS.nm.SH); await M.fill('#adm-in', '1'); await M.fill('#adm-ie', '8'); await M.click('#adm-det button[data-c="give"]');
    await U.waitForFunction(id => __T.INV.bag().some(x => x.id === id && x.en === 8), IDS.SH, { timeout: 15000 });
    const cAdm = await U.evaluate(() => __T.coins); await M.fill('#adm-g', '2500000'); await M.click('#adm-det button[data-c="gadd"]'); await U.waitForFunction(c => __T.coins >= c + 2500000, cAdm, { timeout: 15000 });
    await U.waitForTimeout(100); await U.evaluate(() => __AUDIT.tick()); await U.waitForTimeout(300);
    // 복구 코드(운영자 키로 서명 — 여기선 테스트 키): +11 반역자의 방패 → 기록 · 설명되는 것
    { const b64u = u8 => Buffer.from(u8).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); const m1 = b64u(Buffer.from(JSON.stringify({ v: 1, id: 'c' + t0, it: [[IDS.SH, 1, 11]] })));
      const sig = b64u(new Uint8Array(await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode(m1)))); const r = await U.evaluate(c => __T.CODES_.redeem(c), `ADN1.${m1}.${sig}`); await U.waitForTimeout(500);
      ok(r === true && await U.evaluate(id => __T.INV.bag().some(x => x.id === id && x.en === 11), IDS.SH), '복구 코드로 +11 반역자의 방패 받음'); }
    // ⑦ 골드 급증: 설명 없이 +3,000,000
    await U.evaluate(() => { __AUDIT.tick(); __T.setCoins(__T.coins + 3000000); __AUDIT.tick(); }); await U.waitForTimeout(500);
    // 기록 없이 생긴 강화(저장 조작 흉내): 반역자의 방패 +10 → +18 · 새 +13 커츠의 티셔츠 → 사진
    await U.evaluate(I_ => { const I = __T.INV, e = I.bag().find(x => x.id === I_.SH && x.en === 10); e.en = 18; I.add(I_.TS, 1, true); I.bag().filter(x => x.id === I_.TS).pop().en = 13; I.render(); __AUDIT.snapNow(0); return __AUDIT.flush(); }, IDS); await U.waitForTimeout(300);
    // ---------- 쌓인 문서 확인
    const L = await docs(), by = k => L.filter(x => x.k === k), E = by('en'), fE = f => E.find(x => f(x.D));
    console.log('docs', L.length, JSON.stringify(Object.fromEntries(['en', 'bless', 'gacha', 'trade', 'adm', 'code', 'snap', 'gold', 'chg'].map(k => [k, by(k).length])))); for (const x of L) console.log('  ', x.k, JSON.stringify(x.D).slice(0, 220));
    ok(fE(d => d.i === IDS.SH && d.a === 9 && d.b === 10 && d.r === 'ok' && d.w === 'scroll' && d.s === 'scroll_armor' && d.p === 0.333), '① 주문서: +9→+10 성공 (전·후·주문서·확률)');
    ok(fE(d => d.i === IDS.TS && d.a === 4 && d.b === null && d.r === 'boom'), '① 주문서: +4 증발 (안전 +4 넘는 시도)');
    ok(fE(d => d.i === 'dv_sword' && d.a === 5 && d.b === 7 && d.r === 'bless' && d.bs === 1), '① 안전 구간이라도 결과 +7 이상 (+5→+7 축복 주문서)');
    ok(fE(d => d.i === IDS.RING && d.a === 6 && d.b === 7 && d.s === 'scroll_acc'), '① 장신구 +6→+7');
    ok(fE(d => d.i === IDS.HM && d.a === 7 && d.r === 'boom'), '① +7 투구 증발');
    ok(fE(d => d.i === 'long_sword' && d.a === 5 && d.b === 7 && d.w === 'wone'), '① 강화 창(단일) +5→+7');
    { const mE = E.filter(x => x.D.w === 'wmulti'); ok(used > 0 && mE.length === used - safeOk && mE.every(x => x.D.i === IDS.GL && x.D.a >= 4), `① 다중 강화: 안전 +4를 넘는 시도만 전부 (${mE.length}건 = 주문서 ${used} − 안전 ${safeOk})`, mE.map(x => x.D)); }
    ok(E.length === 6 + (used - safeOk), `① 안전 구간 결과 +7 미만(장갑 +3→+4 등)은 기록 안 함 (강화 기록 ${E.length}건)`);
    ok(by('bless').length === 2 && by('bless').some(x => x.D.i === 'dv_sword' && x.D.ok === 1 && x.D.en === 7) && by('bless').some(x => x.D.i === IDS.HM && x.D.ok === 0), '② 축복 부여 성공·실패 둘 다');
    { const G = by('gacha'); ok(G.length === 3 && G.some(x => x.D.s === 'poly' && x.D.m === 'g' && x.D.got[0] === GA.L0) && G.some(x => x.D.s === 'doll' && x.D.m === 'g' && x.D.got[0] === GA.DH) && G.some(x => x.D.s === 'poly' && x.D.m === 'syn' && x.D.got[0] === GA.L1), '③ 뽑기 전설(변신)·영웅(인형)·합성 전설 3건 (일반 카드 뽑기는 안 남김)', G.map(x => x.D)); }
    { const T = by('trade')[0]; ok(by('trade').length === 1 && T.D.p === 'auP' + t0 % 1e4 && T.D.gg === 1500000 && T.D.get.some(e => e[0] === IDS.RING && e[2] === 8) && T.D.give.some(e => e[0] === 'red_potion' && e[1] === 50), '④ 거래: 상대 이름 · 받은 것(반지 +8·골드) · 준 것(물약 50)', T && T.D); }
    { const A = by('adm'); ok(A.length === 2 && A.some(x => x.D.c === 'give' && x.D.i === IDS.SH && x.D.en === 8 && x.D.n === 1 && x.D.by === '운영자') && A.some(x => x.D.c === 'gold' && x.D.g1 - x.D.g0 === 2500000), '⑤ 운영자 지급 받음: +8 반역자의 방패 ×1 · 골드 250만', A.map(x => x.D)); }
    ok(by('code').length === 1 && by('code')[0].D.it[0][0] === IDS.SH && by('code')[0].D.it[0][2] === 11, '복구 코드로 받은 것 기록 (+11 방패)', by('code').map(x => x.D));
    { const G = by('gold'); ok(G.length === 1 && G[0].D.b - G[0].D.a - G[0].D.x === 3000000, '⑦ 골드 급증: 설명 없는 +300만만 1건 (거래 150만·운영자 250만은 안 셈)', G.map(x => x.D)); }
    { const S = by('snap'); ok(S.length === 2 && S[1].D.f === 0 && S[1].D.hi.some(e => e[0] === IDS.SH && e[1] === 18) && S[1].D.gt && S[1].D.pc && S[1].D.pc[2] >= 2, '⑥ 사진 2장 (두 번째: +18 방패 · 세금 · 변신 카드 전설 수)', S[1] && S[1].D); }
    // ---------- 운영자: 살펴보기 수상한 점 + [기록] 표
    await M.click('#adm-re'); await M.waitForFunction(() => /반역자의 방패/.test((document.querySelector('#adm-det .aud-sus') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => {});
    const SU = await M.evaluate(() => { const s = document.querySelector('#adm-det .aud-sus'); return s ? [...s.children].map(d => ({ t: d.textContent, c: getComputedStyle(d).color })) : []; }); console.log('sus', JSON.stringify(SU));
    ok(SU.some(x => /\[규칙상 나올 수 없음\] \+18 반역자의 방패 \(가방\) — 방어구 최대 \+15 넘음 — 안전 \+4 위로 12~14번 연속 성공 · 약 91만~478만분의 1/.test(x.t) && /255, 106, 106/.test(x.c)), '③ 살펴보기: +18 방어구 빨간 줄 + 확률 안내');
    ok(SU.some(x => /\[확률상 매우 드묾\] \+13 커츠의 티셔츠/.test(x.t)) && !SU.some(x => /\+10 반역자|\+7 /.test(x.t)), '③ +13 방어구는 주황(매우 드묾) · 흔한 수치는 표시 안 함');
    await (await M.$('#adm-det')).screenshot({ path: 'dev/out/auditlog_insp.png' });
    const rd0 = await M.evaluate(() => __rd); await M.click('#adm-aud-b'); await M.waitForSelector('#adm-aud .aud-t', { timeout: 10000 }); await M.waitForTimeout(300);
    const V = await M.evaluate(() => ({ h: document.querySelector('#adm-aud h4').textContent, rows: [...document.querySelectorAll('#adm-aud .aud-t tr')].map(r => ({ c: r.className, t: r.textContent.replace(/\s+/g, ' ').trim(), col: getComputedStyle(r).color })) }));
    console.log('view', V.h); for (const r of V.rows) console.log('   |', r.t.slice(0, 200));
    const has = re => V.rows.some(r => re.test(r.t));
    ok(has(new RegExp(`강화 \\+9→\\+10 ${IDS.nm.SH} 성공 \\(갑옷 마법 주문서 · 주문서 · 확률 33\\.3%\\)`)) || has(new RegExp(`강화 \\+9→\\+10 ${IDS.nm.SH} 성공`)), '표: 강화 +9→+10 반역자의 방패 성공');
    ok(has(new RegExp(`증발 \\+4 ${IDS.nm.TS}`)) && has(/강화 \+5→\+7 데몬의 검 성공 \(축복 주문서 · 주문서 · 2단계\)|강화 \+5→\+7 .* 성공 \(축복 주문서/), '표: 증발 · 축복 주문서 2단계');
    ok(has(/축복 부여 성공/) && has(/축복 부여 실패/) && has(/변신 카드 뽑기 1회: \[전설\]/) && has(/마법인형 뽑기 1회: \[영웅\]/) && has(/변신 카드 합성 1번 중 성공 1: \[전설\]/), '표: 축복·뽑기·합성 줄');
    ok(has(new RegExp(`거래 ← auP${t0 % 1e4}: \\+8 힘의 반지, 골드 1,500,000 \\(→ 준 것: 빨간 물약 ×50\\)`)), '표: 거래 ← 상대: 받은 것 (준 것)', V.rows.filter(r => /거래/.test(r.t)).map(r => r.t));
    ok(has(new RegExp(`지급 ← 운영자: \\+8 ${IDS.nm.SH} ×1`)) && has(/지급 ← 운영자: 골드 2,500,000/), '표: 지급 ← 운영자: +8 방패 · 골드');
    ok(has(/접속 사진 Lv55 \(.*%\) · 골드 8,000,000 · 전투력 /) && has(/^.*사진 Lv55 .*착용: .*데몬의 검|사진 Lv55/), '표: 사진 줄 (레벨·골드·전투력·착용…)');
    ok(V.rows.some(r => /골드 급증 \d+초 만에 설명 안 되는 \+3,000,000/.test(r.t) && /255, 138, 122/.test(r.col)), '표: 골드 급증 빨간 줄');
    const bad = V.rows.filter(r => r.c === 'aud-bad'); console.log('bad', JSON.stringify(bad.map(r => r.t)));
    ok(bad.length === 1 && new RegExp(`설명 안 되는 변화.*\\+18 ${IDS.nm.SH} — 강화·거래·지급 기록 없이 생김`).test(bad[0].t) && new RegExp(`\\+13 ${IDS.nm.TS} — 강화·거래·지급 기록 없이 생김`).test(bad[0].t) && new RegExp(`\\+7 ${IDS.nm.HM} — 증발 기록이 있는데 그대로 있음`).test(bad[0].t) && /255, 106, 106/.test(bad[0].col), "표: 빨간 '설명 안 되는 변화' 줄 (+18 방패 · +13 티셔츠 · 증발 뒤 그대로인 +7 투구)", bad);
    ok(has(new RegExp(`복구 코드 ← 운영자: \\+11 ${IDS.nm.SH}`)), '표: 복구 코드 줄');
    ok(!/\+10 반역자|\+11 반역자|\+8 반역자|\+8 힘의 반지|\+7 롱소드|\+7 힘의 반지/.test(bad.map(r => r.t).join()), '설명되는 것(강화·거래·지급)은 의심 줄에 없음');
    ok(V.rows.some(r => /\[규칙상 나올 수 없음\] \+18 반역자의 방패/.test(r.t)), '표: 사진 줄 안에도 규칙 밖 +18 표시');
    ok(/최근 \d+건 중 \d+건 · 계정\(uid\) 기준 · 한국 시간/.test(V.h), '표 머리: 계정(uid) 기준 · 한국 시간', V.h);
    await M.evaluate(() => { const a = document.getElementById('adm-aud'); a.scrollIntoView(); }); await M.waitForTimeout(200);
    await (await M.$('#adm-aud')).screenshot({ path: 'dev/out/auditlog_view.png' });
    await M.evaluate(() => { const s = document.querySelector('#adm-aud .aud-box'); if (s) s.scrollTop = 0; }); await (await M.$('#adm-aud')).screenshot({ path: 'dev/out/auditlog_view_top.png' });
    await M.waitForTimeout(6500); const rd1 = await M.evaluate(() => __rd); ok(rd1 - rd0 === 1, `읽기는 [기록]을 누를 때만 (6.5초 동안 ${rd1 - rd0}번 · 자동 새로고침 없음)`);
    // 이름으로 찾기(uid 없는 예전 버전) · 다른 사람을 고르면 표 닫힘
    { const n = await M.evaluate(nm => { __T.ADMIN && 0; return new Promise(r => { window.__AUDIT.view({ n: nm, u: '' }); setTimeout(() => r(document.querySelectorAll('#adm-aud .aud-t tr.aud-r').length + '|' + document.querySelector('#adm-aud h4').textContent), 400); }); }, UN); ok(/\|.*이름 기준/.test(n) && +n.split('|')[0] === L.length, '이름 기준으로도 같은 기록', n); }
    // ---------- 규칙 없음(403) → 경고 1번 · 5분 쉼 · 다시 시도 / 인터넷 오류 → 같은 id로 다시
    const R = await U.evaluate(async () => { const A = __AUDIT, c0 = __fs.creates; __fs.fail = true; A._hold(0); A.snapNow(0); await A.flush(); const c1 = __fs.creates; A.snapNow(0); await A.flush(); const c2 = __fs.creates, q2 = A.q().length;
      __fs.fail = false; A._hold(0); await A.flush(); const q3 = A.q().length; __fs.thr = true; A.snapNow(0); await A.flush(); const id1 = A.q().length; __fs.thr = false; A._hold(0); await A.flush(); return { c0, c1, c2, q2, q3, thrQ: id1, q4: A.q().length }; });
    console.log('403', JSON.stringify(R), warns);
    ok(R.c1 - R.c0 === 1 && R.c2 === R.c1 && R.q2 === 2 && R.q3 === 0 && R.thrQ === 1 && R.q4 === 0, '규칙 없음(거절): 1번 시도 뒤 쉼 · 큐에 남았다가 다시 보냄 · 인터넷 오류도 다시', R);
    ok(warns.length === 1 && /audit 문서를 만들 수 없어요/.test(warns[0]), '콘솔 경고는 1번만', warns);
    // ---------- 기록 안 하는 곳: 데모(이 기기) · 운영자
    const NP = await P.evaluate(() => ({ add: __AUDIT.add('en', { x: 1 }), q: __AUDIT.q().length })), NM = await M.evaluate(() => ({ add: __AUDIT.add('en', { x: 1 }), q: __AUDIT.q().length }));
    ok(!NP.add && !NP.q && !NM.add && !NM.q, '계정 서버가 아니면(데모·이 기기)·운영자 모드면 아무것도 안 함', [NP, NM]);
    console.log(errs.slice(0, 5).join('\n') || 'no errors'); ok(!errs.length, '오류 없음');
  } catch (e) { console.log('TEST ERROR', e.stack); fails++; }
  finally { fs.writeFileSync(F, s0); if (b) await b.close(); }
  console.log(fails ? `FAIL ${fails}` : 'ALL OK'); process.exitCode = fails ? 1 : 0; })();
