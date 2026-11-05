// 11/5 골드 세금 6% 적립 (공성전 준비) — KT_PORT=8885 KT_TO=1200 bash dev/runkt.sh dev/tests/goldtax.js
// ① 처음 0 · [랭킹] 창 위쪽 '아덴 성 금고 · 세율 6%' + '내가 낸 세금'
// ② 매김: 상점(한 개·일괄) · 시장 상인 · 자동 정비 · 변신 뽑기(1·11 · 무료는 0) · 인형 뽑기 · 전설 재뽑기 · 할로윈 모자 · 오프라인 사냥 구입 · 월드맵 이동비 · 잊혀진 섬 입장료
//    → 분류마다 쓴 골드의 정확히 6% (1/100골드 단위) · 낸 골드 = 원래 가격 (가격 그대로)
// ③ 뺌: 창고 맡기기·찾기 · 운영자 골드 지급/회수 · 유저끼리 교환 · 쓰러져서 잃는 골드 → 세금 0
// ④ 금고 모으기: presence gt → 기록 서버(봇 호스트 역할 탭) · worldbot_chars/{uid}.gt (나간 유저도) · 큰 값만 · 저장/불러오기 · 스냅샷 → 다른 유저 창
//    · 실시간(스냅샷 없이 presence) · 기록 서버가 꺼져도 줄지 않음
// ⑤ 운영자 창 금고·살펴보기 '낸 세금' · 운영자 모드(본섭)는 안 셈
// ⑥ 다시 접속해도 유지 · 같은 계정 다른 캐릭터도 같은 값(계정 공유)
// ⑦ PC·모바일 스크린샷 (dev/out/goldtax_*.png) · 오류 없음
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const login = require('../tq.js');
const F = path.join(__dirname, '..', '..', 'src', '_kt2.js'), PORT = process.env.KT_PORT || 8766;
let fails = 0; const ok = (c, m, x) => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + m + (x !== undefined ? '  ' + (typeof x === 'string' ? x : JSON.stringify(x)) : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const st = p => p.evaluate(() => { const g = __GTAX.me(); return { coins: __T.coins, c: g.c, s: g.s, by: g.by, bad: g.bad }; });
const yes = async (p, to = 6000) => { await p.waitForFunction(() => !document.getElementById('askwin').hidden, null, { timeout: to }); await p.click('#ask-yes'); };
// 한 번 사고 확인: 낸 골드(가격 그대로) · 세금 = 6% (1/100골드 단위로 정확히) · 분류
async function buy(p, label, cat, act, want) { const a = await st(p); const r = await act(); await p.waitForTimeout(150); const b = await st(p);
  const paid = a.coins - b.coins, dc = b.c - a.c, ds = b.s - a.s, dby = (b.by[cat] || 0) - (a.by[cat] || 0), exp = typeof want === 'function' ? want(r) : want;
  ok(paid === exp && paid > 0 && dc === paid * 6 && ds === paid && dby === paid, `② ${label}: ${paid.toLocaleString()} 골드 (가격 그대로 ${exp.toLocaleString()}) → 세금 ${(dc / 100).toFixed(2)} 골드 = 6% · 분류 ${cat}`, { paid, exp, dc, ds, dby, r });
  return { paid, dc }; }
async function relogin(ctx, acc, cls, name, errs) { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(cls + ' relogin: ' + e.message));
  await p.goto(`http://127.0.0.1:${PORT}/_kt2.html`); await p.waitForSelector('#lg-mode', { state: 'visible' }); await p.fill('#lg-acc', acc); await p.fill('#lg-pw', 'abcd'); await p.click('#lg-go');
  await p.waitForSelector(`.cs-card[data-cls="${cls}"]`, { state: 'visible', timeout: 30000 }); await p.click(`.cs-card[data-cls="${cls}"]`); await p.click('#cs-start');
  try { await p.waitForSelector('#nm-in', { state: 'visible', timeout: 2500 }); await p.fill('#nm-in', name); await p.click('#nm-go'); } catch (e) {}
  await p.waitForFunction(() => window.__gameOn && window.__T && __T.SCENE === 'town', null, { timeout: 30000 }); await p.waitForTimeout(500); return p; }
// 가짜 Firestore (같은 브라우저 localStorage · fieldbot4.js와 같은 방식)
const fakeCloud = uid => { const C = __T.CLOUD, K = 'fakefs:'; C.on = () => true; C.uid = () => uid;
  C.get = async p => { const v = localStorage.getItem(K + p); return v ? JSON.parse(v) : null; };
  C.create = async (p, o) => { if (localStorage.getItem(K + p)) return false; localStorage.setItem(K + p, JSON.stringify(o)); return true; };
  C.set = async (p, o) => { localStorage.setItem(K + p, JSON.stringify(o)); return true; };
  C.list = async col => { const L = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(K + col + '/')) L.push(Object.assign({ __id: k.slice((K + col + '/').length) }, JSON.parse(localStorage.getItem(k)))); } return L; }; };
const vaultUI = p => p.evaluate(() => { __RANK.open('cp'); __RANK.render(); const w = document.getElementById('rankwin'), v = w.querySelector('.rk-vault'); if (!v) return null; const n = s => +String(s || '').replace(/[^0-9]/g, '');
  return { vis: !w.hidden, txt: v.textContent.replace(/\s+/g, ' ').trim(), vault: n(v.querySelector('.rk-vg').textContent), mine: n(v.querySelector('.rk-vm b').textContent), first: w.querySelector('#rk-body').firstElementChild === v }; });

(async () => { const s0 = fs.readFileSync(F, 'utf8'); let br; const errs = [];
  try { const { subtle } = require('crypto').webcrypto; const kp = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);   // 운영자 창 확인용 테스트 키 (진짜 운영자 키는 안 씀 · 끝나면 _kt2.js 되돌림)
    const pub = await subtle.exportKey('jwk', kp.publicKey), priv = await subtle.exportKey('jwk', kp.privateKey);
    fs.writeFileSync(F, s0.replace(/const ADMIN_PUB = \{[^}]*\};/, `const ADMIN_PUB = ${JSON.stringify({ kty: 'EC', crv: 'P-256', x: pub.x, y: pub.y })};`));
    br = await chromium.launch({ args: ['--disable-gpu', '--mute-audio'] }); const ctx = await br.newContext({ viewport: { width: 1280, height: 800 } }); const t0 = Date.now() % 1e6;
    const page = async (nm, acc, cls) => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(nm + ': ' + e.message + ' @ ' + String(e.stack || '').split('\n').slice(1, 3).join(' '))); await login(p, { acc, cls, name: nm, mp: true }); return p; };
    const ACC_A = 'gta' + t0, ACC_B = 'gtb' + t0, NM_A = 'gtA' + t0 % 1e4, NM_B = 'gtB' + t0 % 1e4;
    let P = await page(NM_A, ACC_A, 'knight'); const Q = await page(NM_B, ACC_B, 'elf');

    // ① 처음
    const s1 = await P.evaluate(() => ({ g: __GTAX.me(), pct: __GTAX.PCT, raw: __GTAX.raw(), gt: __T.NET.dbgPayload().gt }));
    ok(s1.g.c === 0 && s1.g.s === 0 && s1.g.loaded && !s1.g.bad && s1.pct === 6 && s1.raw && !s1.gt, '① 처음: 세금 0 · 세율 6% · 불러옴 · presence gt 없음', s1);
    const u1 = await vaultUI(P); console.log('①', JSON.stringify(u1));
    ok(u1 && u1.vis && u1.first && /🏰 아덴 성 금고 0 골드 세율 6%/.test(u1.txt) && /공성전에서 성의 주인에게/.test(u1.txt) && /가격은 그대로/.test(u1.txt) && /내가 낸 세금 0 골드/.test(u1.txt), '① [랭킹] 창 맨 위: 아덴 성 금고 0 골드 · 세율 6% · 공성전에서 성의 주인에게 · 내가 낸 세금 0', u1 && u1.txt);
    await P.keyboard.press('Escape');

    // ② 매김
    await P.evaluate(() => { __T.setCoins(100000000); __T.hero.lv = 60; __T.GOD_INV = true; });
    await P.evaluate(() => __T.TOWN.openShopId('general')); await P.waitForTimeout(200);
    await buy(P, '잡화상점 빨간 물약 7개 (구입 버튼)', 'shop', () => P.evaluate(() => { const row = [...document.querySelectorAll('#shop-list .item')].find(r => r.querySelector('.nm').textContent === '빨간 물약'), inp = row.querySelector('input'); inp.value = 7; inp.dispatchEvent(new Event('input')); row.querySelector('.buy').click(); return +row.querySelector('.pr').textContent.replace(/[^0-9]/g, ''); }), r => r * 7);
    await buy(P, '잡화상점 일괄 구매 (주홍 3 · 맑은 2)', 'shop', () => P.evaluate(() => { const rows = [...document.querySelectorAll('#shop-list .item')], pr = {}; for (const [n, q] of [['주홍 물약', 3], ['맑은 물약', 2]]) { const row = rows.find(r => r.querySelector('.nm').textContent === n), inp = row.querySelector('input'); inp.value = q; inp.dispatchEvent(new Event('input')); pr[n] = +row.querySelector('.pr').textContent.replace(/[^0-9]/g, ''); } document.getElementById('shop-buyall').click(); return pr; }), r => r['주홍 물약'] * 3 + r['맑은 물약'] * 2);
    await buy(P, '시장 상인 희귀 장비 1개', 'mkt', () => P.evaluate(() => { __T.TOWN.openShopObj(__T.MARKET.shop(__T.MARKET.DEF[0])); const row = [...document.querySelectorAll('#shop-list .item.mkt-row')].find(r => !r.classList.contains('sold')); const p = +row.querySelector('.pr').textContent.replace(/[^0-9]/g, ''); row.querySelector('.buy').click(); return p; }), r => r);
    await P.evaluate(() => { document.getElementById('shop').hidden = true; });
    await buy(P, '자동사냥 마을 정비 (빨간 물약 40개까지)', 'auto', () => P.evaluate(() => { const A = __T.AUTO, q = {}; for (const k in A.conf().buyQ) q[k] = 0; q.red_potion = 40; A.setCfg({ buy: true, buyQ: q, buyHaste: false, buyPoly: false, buyWard: false }); const need = 40 - __T.INV.count('red_potion'); A.buyAll(); return need * A.price('red_potion'); }), r => r);
    await buy(P, '변신 뽑기 1회', 'poly', async () => { const r = await P.evaluate(() => { PCG.setSkip(true); PCG.draw(1); return PCG.COST1; }); await P.waitForTimeout(400); await P.evaluate(() => PCG.close()); await P.waitForTimeout(300); return r; }, r => r);
    await buy(P, '변신 뽑기 11회', 'poly', async () => { const r = await P.evaluate(() => { PCG.draw(11); return PCG.COST11; }); await P.waitForTimeout(400); await P.evaluate(() => PCG.close()); await P.waitForTimeout(300); return r; }, r => r);
    { const a = await st(P); await P.evaluate(() => { PCG.state().freeAt = 0; PCG.draw('free'); }); await P.waitForTimeout(400); await P.evaluate(() => PCG.close()); await P.waitForTimeout(300); const b = await st(P);
      ok(a.coins === b.coins && a.c === b.c && a.s === b.s, '② 변신 무료 뽑기: 골드 0 → 세금 0', { dc: b.c - a.c, paid: a.coins - b.coins }); }
    await buy(P, '마법인형 뽑기 1회', 'doll', async () => { const r = await P.evaluate(() => { DCG.setSkip(true); DCG.draw(1); return DCG.COST1; }); await P.waitForTimeout(400); await P.evaluate(() => DCG.close()); await P.waitForTimeout(300); return r; }, r => r);
    await buy(P, '전설 재뽑기 1번째', 'rr', async () => { const r = await P.evaluate(() => { const s = PCG.state(); s.cards = { deathknight: 1 }; s.rr = {}; s.slot = {}; s.lock = {}; PCG.sync(); PCG._force(['wyvern']); PCG.rrDo('deathknight'); return PCG.RR_COST[0]; }); await P.waitForTimeout(500); await P.evaluate(() => PCG.close()); await P.waitForTimeout(300); return r; }, r => r);
    await buy(P, '할로윈 모자 (입장료)', 'entry', () => P.evaluate(() => { document.getElementById('hw-buy').click(); return 100; }), 100);
    { const a = await st(P); const r = await P.evaluate(async () => { const T = __T; T.OFFL.load({ v: 1 }); const rec = Array.from({ length: 12 }, () => [0, 0, 0, {}, { red_potion: 6 }, T.hero.lv]);
        await T.OFFL.settle({ v: 1, arm: 1, ts: Date.now() - 60 * 60000, r: null, i: 1, rec, om: 0, day: '', used: 0, done: '' }); { const w = document.getElementById('oflres'); if (w) w.remove(); } return { red: T.INV.count('red_potion') }; });
      await P.waitForTimeout(300); const b = await st(P), dby = (b.by.offl || 0) - (a.by.offl || 0), paid = a.coins - b.coins;
      ok(dby > 0 && dby % 25 === 0 && b.c - a.c === dby * 6 && paid === dby, `② 오프라인 사냥 중 산 빨간 물약: ${dby.toLocaleString()} 골드 (개당 25 그대로) → 세금 6%`, { dby, dc: b.c - a.c, paid, r }); }
    // 월드맵 이동비 (오크숲 1,000) → 쓰러짐(골드 손실은 뺌) → 마을 → 잊혀진 섬 입장료 50만
    await P.click('#btn-map'); await P.waitForTimeout(500); await P.click('#wm-stage .mk[data-r="orc_forest"]'); await P.waitForTimeout(300);
    await buy(P, '월드맵 이동비 (오크숲)', 'tele', async () => { await P.click('#wm-go'); await yes(P); await P.waitForFunction(() => __T.SCENE === 'field', null, { timeout: 60000 }); await P.waitForTimeout(1500); return 1000; }, 1000);
    { const a = await st(P); const r = await P.evaluate(() => { const T = __T; T.GOD_INV = false; T.BUFF.invis = 0; const f = T.foxes.find(x => !x.dead) || null; T.hero.hp = 3; T.hurtHero(999999, f, 'melee'); return { death: !!T.DEATH }; }); await P.waitForTimeout(400);
      await P.click('#death-town').catch(() => {}); await P.waitForFunction(() => __T.SCENE === 'town' && !__T.DEATH, null, { timeout: 20000 }); await P.waitForTimeout(800); await P.evaluate(() => { __T.GOD_INV = true; __T.hero.hp = __T.hero.max; }); const b = await st(P);
      ok(r.death && a.coins - b.coins > 0 && b.c === a.c && b.s === a.s, `③ 쓰러져서 잃은 골드 ${(a.coins - b.coins).toLocaleString()} (마을에서 부활) → 세금 0 (뺌)`, { r, lost: a.coins - b.coins, dc: b.c - a.c }); }
    await P.click('#btn-map'); await P.waitForTimeout(500); await P.click('#wm-stage .mk[data-r="forgotten_island"]'); await P.waitForTimeout(300);
    await buy(P, '잊혀진 섬 입장료 50만', 'entry', async () => { await P.click('#wm-go'); await yes(P); await P.waitForFunction(() => __T.ISLE && __T.ISLE.id === 25 && __T.SCENE === 'field', null, { timeout: 90000 }); await P.waitForTimeout(1500); return 500000; }, 500000);
    await P.evaluate(() => __T.TOWN.goTown()); await P.waitForFunction(() => __T.SCENE === 'town', null, { timeout: 20000 }); await P.waitForTimeout(800);

    // ③ 뺌
    { const a = await st(P); await P.evaluate(() => { const i = document.getElementById('st-gin'); i.value = '12345'; __T.STORE.goldMove(1); }); const m = await st(P); await P.evaluate(() => { const i = document.getElementById('st-gin'); i.value = '12345'; __T.STORE.goldMove(-1); }); const b = await st(P);
      ok(a.coins - m.coins === 12345 && b.coins === a.coins && m.c === a.c && b.c === a.c, '③ 창고에 골드 맡기기·찾기 (12,345) → 세금 0', { dep: a.coins - m.coins, dc: b.c - a.c }); }
    { const a = await st(P); await P.evaluate(() => { __T.ADMIN.apply('gold', JSON.stringify({ op: 'add', v: 1000000 }), null, 0); __T.ADMIN.apply('gold', JSON.stringify({ op: 'add', v: -700000 }), null, 0); }); const b = await st(P);
      ok(b.coins - a.coins === 300000 && b.c === a.c, '③ 운영자 골드 지급 100만 · 회수 70만 → 세금 0', { d: b.coins - a.coins, dc: b.c - a.c }); }
    { const qPeer = await Q.evaluate(() => __T.NET.me()); await P.waitForFunction(p => __T.NET.others().some(o => o.peer === p), qPeer, { timeout: 15000 });
      const a = await st(P), qa = await st(Q); await P.evaluate(p => __T.TRADE.request(p), qPeer); await yes(Q); await P.waitForFunction(() => !document.getElementById('tradewin').hidden, null, { timeout: 8000 }); await P.waitForTimeout(500);
      await P.evaluate(() => { const g = document.getElementById('tw-gold'); g.value = '5000'; g.dispatchEvent(new Event('input')); }); await P.waitForTimeout(600);
      await P.click('#tw-ok').catch(() => {}); await Q.click('#tw-ok').catch(() => {}); await P.waitForTimeout(900); await yes(P).catch(() => {}); await yes(Q).catch(() => {}); await P.waitForTimeout(2000);
      const b = await st(P), qb = await st(Q);
      ok(a.coins - b.coins === 5000 && qb.coins - qa.coins === 5000 && b.c === a.c && qb.c === qa.c, '③ 유저끼리 교환 (5,000 골드 A→B) → 둘 다 세금 0', { a: a.coins - b.coins, b: qb.coins - qa.coins, dcA: b.c - a.c, dcB: qb.c - qa.c }); }
    const SA = await st(P); console.log('A 합계', JSON.stringify(SA));
    ok(SA.c === SA.s * 6 && Object.values(SA.by).reduce((x, v) => x + v, 0) === SA.s, `② 합계: 쓴 골드 ${SA.s.toLocaleString()} · 세금 ${(SA.c / 100).toLocaleString()} 골드 · 분류 합 = 쓴 골드`, SA.by);

    // ④ 두 번째 유저 · 금고 모으기
    await Q.evaluate(() => __T.TOWN.openShopId('general')); await Q.waitForTimeout(200);
    await buy(Q, '(B) 잡화상점 빨간 물약 10개', 'shop', () => Q.evaluate(() => { const row = [...document.querySelectorAll('#shop-list .item')].find(r => r.querySelector('.nm').textContent === '빨간 물약'), inp = row.querySelector('input'); inp.value = 10; inp.dispatchEvent(new Event('input')); row.querySelector('.buy').click(); return 250; }), 250);
    const SB = await st(Q); const ahA = await P.evaluate(() => __T.SESS.ah()), ahB = await Q.evaluate(() => __T.SESS.ah());
    await P.waitForFunction(([ah, c]) => __T.NET.others().some(o => o.pr && o.pr.ah === ah && +o.pr.gt === c), [ahB, SB.c], { timeout: 10000 }).catch(() => {});
    { const v = await P.evaluate(() => __RANK.vault()), u = await vaultUI(P); const want = Math.floor((SA.c + SB.c) / 100);
      ok(v.t === SA.c + SB.c && !v.snap && u.vault === want && u.mine === Math.floor(SA.c / 100), `④ 기록 서버 전에도: 금고 = 나 + 지금 접속 중인 B (presence gt) = ${want.toLocaleString()} 골드`, { t: v.t, ui: u.vault, mine: u.mine, want }); }
    await P.evaluate(() => __RANK.open()); await P.waitForTimeout(100);
    // worldbot_chars/{uid}에 gt·ah (봇 호스트가 꺼져 있을 때 낸 세금도 나중에 모음)
    for (const [p, uid] of [[P, 'uA' + t0], [Q, 'uB' + t0]]) await p.evaluate(fakeCloud, uid);
    const wc = await Promise.all([[P, 'uA' + t0], [Q, 'uB' + t0]].map(async ([p, uid]) => { await p.evaluate(() => { __FB.charReset(); __FB.mine(); __FB.charNow(); }); await p.waitForTimeout(300); return p.evaluate(u => JSON.parse(localStorage.getItem('fakefs:worldbot_chars/' + u) || 'null'), uid); }));
    ok(wc[0] && wc[0].gt === String(SA.c) && wc[0].ah === ahA && wc[1] && wc[1].gt === String(SB.c) && wc[1].ah === ahB, '④ worldbot_chars/{uid}에 내 계정 세금(gt)·계정(ah)도 저장', wc.map(d => d && { n: d.n, gt: d.gt, ah: d.ah }));
    await Q.close(); await sleep(7000);   // B는 나감 (접속 끊김)
    const C = await page('gtC' + t0 % 1e4, 'gtc' + t0, 'wizard');
    await C.evaluate(u => { (function (uid) { const C = __T.CLOUD, K = 'fakefs:'; C.on = () => true; C.uid = () => uid;
        C.get = async p => { const v = localStorage.getItem(K + p); return v ? JSON.parse(v) : null; }; C.create = async (p, o) => { if (localStorage.getItem(K + p)) return false; localStorage.setItem(K + p, JSON.stringify(o)); return true; };
        C.set = async (p, o) => { localStorage.setItem(K + p, JSON.stringify(o)); return true; };
        C.list = async col => { const L = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(K + col + '/')) L.push(Object.assign({ __id: k.slice((K + col + '/').length) }, JSON.parse(localStorage.getItem(k)))); } return L; }; })(u);
      __RANK.reset(); __RANK.DBG.noCloud = false; __RANK.DBG.col = true; }, 'bh' + t0);
    await C.waitForFunction(([a, b]) => { const G = __RANK.COL.G; return G[a] && G[b]; }, [ahA, ahB], { timeout: 30000 }).catch(() => {});
    const g4 = await C.evaluate(([a, b]) => ({ A: __RANK.COL.G[a], B: __RANK.COL.G[b], on: __RANK.COL.on, loaded: __RANK.COL.loaded }), [ahA, ahB]); console.log('④ 기록 서버', JSON.stringify(g4));
    ok(g4.A && g4.A.c === SA.c && g4.A.n === NM_A, '④ 기록 서버(봇 호스트 역할): 접속 중인 A의 세금 (presence gt)', g4.A);
    ok(g4.B && g4.B.c === SB.c, '④ 기록 서버: 나간 B의 세금도 (worldbot_chars gt — 봇 호스트가 꺼져 있을 때 낸 세금도 다음에 모음)', g4.B);
    const g4b = await C.evaluate(([a, c]) => { __RANK.upG(a, 'old', 1, Date.now()); __RANK.upG(a, 'old', c - 600, Date.now()); return __RANK.COL.G[a].c; }, [ahA, SA.c]);
    ok(g4b === SA.c, '④ 더 작은 값을 받아도 줄지 않음 (계정마다 큰 값)', g4b);
    const g4c = await C.evaluate(async () => { await __RANK.colSave(); const before = JSON.stringify(__RANK.state().G); __RANK.reset(); __RANK.DBG.col = true; await __RANK.colLoad(); return { same: before === JSON.stringify(__RANK.state().G), n: Object.keys(__RANK.COL.G).length, doc: !!localStorage.getItem('fakefs:worldbot_chars/' + __T.CLOUD.uid()) }; });
    ok(g4c.same && g4c.n >= 2 && g4c.doc, '④ 기록 서버 저장(worldbot_chars/{봇 호스트 uid}.rk) → 지우고 다시 불러와도 같음', g4c);
    const snapTxt = await C.evaluate(() => JSON.stringify(__RANK.snapOf(__RANK.state(), 'relay')));
    const sn = JSON.parse(snapTxt); ok(Array.isArray(sn.G) && sn.T === SA.c + SB.c && sn.G.some(g => g[0] === ahB && g[2] === SB.c), '④ 스냅샷(중계 rk)에 계정별 세금(G)·합(T)', { T: sn.T, G: sn.G.length });
    await P.evaluate(t => __RANK.onSnap(t), snapTxt);
    const u4 = await vaultUI(P), want4 = Math.floor((SA.c + SB.c) / 100); console.log('④ A 창', JSON.stringify(u4));
    ok(u4.vault === want4 && u4.mine === Math.floor(SA.c / 100), `④ A의 [랭킹] 창: 아덴 성 금고 ${want4.toLocaleString()} 골드 (A + 나간 B) · 내가 낸 세금 ${Math.floor(SA.c / 100).toLocaleString()}`, u4.txt);
    await P.screenshot({ path: 'dev/out/goldtax_pc.png' }); await (await P.$('#rankwin')).screenshot({ path: 'dev/out/goldtax_pcwin.png' });
    // 실시간: A가 더 쓰면 스냅샷 없이도 바로 · 기록 서버도 presence로
    await P.evaluate(() => { __T.TOWN.openShopId('general'); const row = [...document.querySelectorAll('#shop-list .item')].find(r => r.querySelector('.nm').textContent === '맑은 물약'), inp = row.querySelector('input'); inp.value = 5; inp.dispatchEvent(new Event('input')); row.querySelector('.buy').click(); document.getElementById('shop').hidden = true; });
    const SA2 = await st(P); const u4b = await vaultUI(P);
    ok(SA2.c - SA.c === 1000 * 6 && u4b.vault === Math.floor((SA2.c + SB.c) / 100), '④ 실시간: A가 맑은 물약 5개(1,000) → 금고 바로 늘어남 (스냅샷 전)', { vault: u4b.vault });
    await C.waitForFunction(([a, c]) => __RANK.COL.G[a] && __RANK.COL.G[a].c === c, [ahA, SA2.c], { timeout: 15000 }).catch(() => {});
    ok(await C.evaluate(([a, c]) => !!__RANK.COL.G[a] && __RANK.COL.G[a].c === c, [ahA, SA2.c]), '④ 기록 서버도 presence로 새 값');
    // 기록 서버(봇 호스트)가 꺼짐 → 금고는 줄지 않음 (받은 기록 + 접속 중 + 나)
    await C.close(); await sleep(7500);
    const u4c = await vaultUI(P); ok(u4c.vault === Math.floor((SA2.c + SB.c) / 100) && !!(await P.evaluate(() => localStorage.getItem('aden_rk_snap'))), '④ 기록 서버가 꺼져도 금고 그대로 (마지막 기록 + 지금 접속 중) · 이 기기에도 기록', { vault: u4c.vault });
    await P.keyboard.press('Escape');

    // ⑤ 운영자 창 · 살펴보기 · 운영자 모드(본섭)는 안 셈
    const M = await page('gtM' + t0 % 1e4, 'gtm' + t0, 'knight'); await M.evaluate(j => { __T.ACCOUNT.acc = () => 'adengm'; window.ADEN_ADMIN = { acc: 'adengm', jwk: j }; return __T.ADMIN.tryOn(); }, priv); await M.waitForTimeout(800);
    const aPeer = await P.evaluate(() => __T.NET.me()); await M.waitForFunction(p => __T.NET.others().some(o => o.peer === p && +o.pr.gt > 0), aPeer, { timeout: 20000 }).catch(() => {});
    await M.evaluate(t => __RANK.onSnap(t), snapTxt);
    await M.click('#btn-adm'); await M.waitForTimeout(1300);
    const m5 = await M.evaluate(() => (document.getElementById('adm-vault') || {}).textContent || '');
    console.log('⑤ 운영자 금고', m5.slice(0, 200));
    ok(new RegExp('합계 ' + Math.floor((SA2.c + SB.c) / 100).toLocaleString() + ' 골드').test(m5) && m5.includes(NM_A) && m5.includes(NM_B) && /접속 중/.test(m5), '⑤ 운영자 창: 아덴 성 금고 합계 · 계정별 (A 접속 중 · B)', m5.slice(0, 160));
    await M.waitForSelector(`#adm-list tr[data-p="${aPeer}"]`, { timeout: 8000 }); await M.click(`#adm-list tr[data-p="${aPeer}"] button[data-a="insp"]`); await M.waitForFunction(() => /낸 세금/.test((document.getElementById('adm-det') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => {});
    const m5b = await M.evaluate(() => (document.getElementById('adm-det') || {}).textContent.replace(/\s+/g, ' '));
    ok(new RegExp('낸 세금 ' + Math.floor(SA2.c / 100).toLocaleString() + ' \\(쓴 골드 ' + SA2.s.toLocaleString() + '\\)').test(m5b), `⑤ 운영자 [살펴보기]: 낸 세금 ${Math.floor(SA2.c / 100).toLocaleString()} (쓴 골드 ${SA2.s.toLocaleString()})`, (m5b.match(/낸 세금[^)]*\)/) || [''])[0]);
    await (await M.$('#admwin')).screenshot({ path: 'dev/out/goldtax_admin.png' });
    const m5c = await M.evaluate(() => { __T.setCoins(100000); window.DEMO_MODE = false; const c0 = __GTAX.me().c, g0 = __T.coins; __T.TOWN.openShopId('general'); const row = [...document.querySelectorAll('#shop-list .item')].find(r => r.querySelector('.nm').textContent === '빨간 물약'), inp = row.querySelector('input'); inp.value = 4; inp.dispatchEvent(new Event('input')); row.querySelector('.buy').click(); window.DEMO_MODE = true; document.getElementById('shop').hidden = true; return { paid: g0 - __T.coins, dc: __GTAX.me().c - c0, on: __T.ADMIN.on() }; });
    ok(m5c.on && m5c.paid === 100 && m5c.dc === 0, '⑤ 본섭 운영자 모드에서 쓴 골드는 세금에 안 셈 (골드를 마음대로 만들 수 있어서)', m5c);
    await M.close();

    // ⑥ 다시 접속 · 같은 계정 다른 캐릭터
    await P.evaluate(() => __T.SAVE.now(true, true)); await P.close(); await sleep(500);
    P = await relogin(ctx, ACC_A, 'knight', 'x', errs); let r6 = await st(P);
    ok(r6.c === SA2.c && r6.s === SA2.s && JSON.stringify(r6.by) === JSON.stringify(SA2.by) && !r6.bad, '⑥ 다시 접속해도 그대로 (계정 문서 goldTax)', { c: r6.c, s: r6.s });
    await P.close(); P = await relogin(ctx, ACC_A, 'elf', 'gtE' + t0 % 1e4, errs); r6 = await st(P);
    ok(r6.c === SA2.c && r6.s === SA2.s, '⑥ 같은 계정 다른 캐릭터(요정)도 같은 값 (계정 공유)', { c: r6.c });
    await P.evaluate(() => __T.setCoins(1000)); await P.evaluate(() => __T.TOWN.openShopId('general')); await P.waitForTimeout(200);
    await buy(P, '(같은 계정 요정) 빨간 물약 4개', 'shop', () => P.evaluate(() => { const row = [...document.querySelectorAll('#shop-list .item')].find(r => r.querySelector('.nm').textContent === '빨간 물약'), inp = row.querySelector('input'); inp.value = 4; inp.dispatchEvent(new Event('input')); row.querySelector('.buy').click(); return 100; }), 100);
    await P.evaluate(() => __T.SAVE.now(true, true)); await P.close(); P = await relogin(ctx, ACC_A, 'knight', 'x', errs); r6 = await st(P);
    ok(r6.c === SA2.c + 600 && r6.by.shop === SA2.by.shop + 100, '⑥ 요정이 낸 세금이 기사에게도 (계정 합)', { c: r6.c });
    // 깨진 값이면 덮어쓰지 않음
    const r6b = await P.evaluate(() => { const k = 'aden_gtax_' + String(__T.ACCOUNT.acc()).toLowerCase(), v0 = localStorage.getItem(k); __GTAX.load('{broken'); const bad = __GTAX.me().bad, raw = __GTAX.raw(); __GTAX.pay(1000, 'shop'); const after = __GTAX.raw(); __GTAX.load(v0); return { bad, raw, after, back: __GTAX.me().c }; });
    ok(r6b.bad && r6b.raw === null && r6b.after === null && r6b.back === r6.c, '⑥ 저장된 값을 읽지 못하면(깨짐) 저장하지 않음 (덮어쓰지 않게)', r6b);
    await P.close();

    // ⑦ 모바일 (세로 좁은 창 390 · 가로 휴대폰 844×390 메뉴)
    for (const vp of [{ width: 390, height: 844, m: false }, { width: 844, height: 390, m: true }]) {
      let mc, Mp; for (let k = 0; k < 2; k++) { mc = await br.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.m, isMobile: vp.m, deviceScaleFactor: 2 }); Mp = await mc.newPage(); Mp.on('pageerror', e => errs.push('M' + vp.width + ': ' + e.message));
        try { await login(Mp, { acc: 'gtm' + vp.width + t0 + k, cls: 'elf', name: 'gtMob' + vp.width + k }); break; } catch (e) { console.log('⑦ 로그인 다시 (테스트 환경)', vp.width, e.message.slice(0, 60)); await Mp.screenshot({ path: `dev/out/goldtax_login_fail${vp.width}.png` }).catch(() => {}); await mc.close(); if (k) throw e; } }
      await Mp.evaluate(() => { __T.setCoins(5000000); __GTAX.pay(1234567, 'poly'); __RANK.setSnap({ v: 1, at: Date.now(), src: 'relay', P: [], K: [], G: [['aaaaaaaa', '친구1', 98765400], ['bbbbbbbb', '친구2', 1234500]], T: 99999900 }, true); });
      const mob = await Mp.evaluate(() => document.documentElement.classList.contains('mob'));
      if (mob) { await Mp.evaluate(() => document.getElementById('mob-menu-b').click()); await Mp.waitForTimeout(200); await Mp.evaluate(() => document.getElementById('mm-rank').click()); } else await Mp.evaluate(() => document.getElementById('btn-rank').click());
      await Mp.waitForTimeout(400);
      const m7 = await Mp.evaluate(() => { const w = document.getElementById('rankwin'), v = w.querySelector('.rk-vault'), r = w.getBoundingClientRect(), q = v.getBoundingClientRect(), kids = [...v.querySelectorAll('*')];
        return { vis: !w.hidden, txt: v.textContent.replace(/\s+/g, ' '), l: r.left, r: r.right, W: innerWidth, vl: q.left, vr: q.right, over: kids.filter(x => x.scrollWidth > x.clientWidth + 1 && getComputedStyle(x).display !== 'inline').length, sw: w.scrollWidth, cw: w.clientWidth, fs: parseFloat(getComputedStyle(v.querySelector('.rk-vs')).fontSize) }; });
      console.log('⑦', vp.width, mob, JSON.stringify(m7));
      const wantM = Math.floor((98765400 + 1234500 + 1234567 * 6) / 100).toLocaleString();
      ok(m7.vis && m7.txt.includes(wantM) && /내가 낸 세금 74,074 골드/.test(m7.txt) && m7.l >= 0 && m7.r <= m7.W && m7.vl >= m7.l + 8 && m7.vr <= m7.r - 8 && m7.over === 0, `⑦ ${vp.width}×${vp.height}${mob ? ' (모바일 메뉴 → [랭킹])' : ''}: 금고 ${wantM} · 내가 낸 세금 · 화면 안 · 가로 넘침 없음`, m7.txt.slice(0, 120));
      await Mp.screenshot({ path: `dev/out/goldtax_m${vp.width}.png` }); await mc.close(); }

    ok(!errs.length, '⑧ 페이지 오류 없음', errs.slice(0, 4).join(' / '));
  } catch (e) { console.error(e); fails++; }
  finally { fs.writeFileSync(F, s0); if (br) await br.close(); }
  console.log(fails ? `FAILED ${fails}` : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
