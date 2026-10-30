// 변신 뽑기 1단계 테스트 (KT_PORT=8773 bash dev/runkt.sh dev/tests/polygacha.js) — 스크린샷 dev/out/pg_*.png
// ① 무료 뽑기 2시간 ② 1회 2만·11회 20만 · 11회 희귀 이상 확정 ③ 확률 ④ 등록·여분 ⑤ 1만 골드 변신·공속·이속·풀기·레벨·골드 ⑥ 저장→새로 접속→다른 직업도 같은 카드
// ⑦ 마일리지 300 → 전설 고르기 ⑧ 주문서 변신과 서로 풀림 ⑨ 오류 없음 (+ 쓰러지면 풀림 · 다른 사람 화면에 보임)
const { chromium } = require('playwright'); const login = require('../tq.js');
const URL = 'http://127.0.0.1:' + (process.env.KT_PORT || 8766) + '/_kt2.html';
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
async function relog(p, acc, cls, name, mp) { await p.goto(URL + (mp ? '?mp=bc' : '')); await p.waitForSelector('#lg-acc', { state: 'visible' }); await p.fill('#lg-acc', acc); await p.fill('#lg-pw', 'abcd'); await p.click('#lg-go');
  await p.waitForSelector(`.cs-card[data-cls="${cls}"]`, { state: 'visible', timeout: 30000 }); await p.click(`.cs-card[data-cls="${cls}"]`); await p.click('#cs-start');
  const nm = await p.waitForSelector('#nm-in', { state: 'visible', timeout: 2500 }).catch(() => null); if (nm) { await p.fill('#nm-in', name); await p.click('#nm-go'); }
  await p.waitForFunction(() => window.__gameOn && window.__T && __T.SCENE === 'town', null, { timeout: 30000 }); await p.waitForTimeout(400); }
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('A: ' + e.message));
  const acc = 'pg' + Date.now() % 1e7; await login(p, { acc, cls: 'knight', name: 'pgK' + Date.now() % 1e4, mp: true });
  const S = () => p.evaluate(() => JSON.parse(JSON.stringify(PCG.state())));
  await p.evaluate(() => { __T.setCoins(3000000); __T.hero.lv = 52; __T.INV.render(); });
  // ③ 확률 (내부 함수로 20만 장 · 11회 2만 번)
  { const r = await p.evaluate(() => { const a = PCG.sim(200000), b = PCG.sim(20000, 11); return { a: a.g, per: a.per, no11: b.no11, b: b.g }; }), N = 200000, E = { 일반: 60, 고급: 30, 희귀: 8, 영웅: 1.8, 전설: 0.2 };
    const pc = k => r.a[k] / N * 100; console.log('rates', JSON.stringify(Object.fromEntries(Object.keys(E).map(k => [k, +pc(k).toFixed(3)]))));
    ok(Object.keys(E).every(k => Math.abs(pc(k) - E[k]) < Math.max(0.6, E[k] * 0.08)), '③ 등급 확률이 표(60/30/8/1.8/0.2)와 비슷');
    ok(Math.abs(r.per.goblin / N * 100 - 10) < 0.5 && Math.abs((r.per.kaspar || 0) / N * 100 - 0.0667) < 0.04, '③ 같은 등급 안에서 같은 확률 (고블린 ' + (r.per.goblin / N * 100).toFixed(2) + '% · 카스파 ' + ((r.per.kaspar || 0) / N * 100).toFixed(3) + '%)');
    ok(r.no11 === 0, '② 11회 2만 번 모두 희귀 이상 1장 이상 (없음 ' + r.no11 + '번)');
    const t11 = Object.values(r.b).reduce((x, y) => x + y, 0); console.log('11회 등급', JSON.stringify(Object.fromEntries(Object.entries(r.b).map(([k, v]) => [k, +(v / t11 * 100).toFixed(2)])))); }
  // 특별상점 [변신 카드] 탭
  await p.evaluate(() => __T.TOWN.openShopId('magic')); await p.waitForTimeout(200);
  await p.evaluate(() => [...document.querySelectorAll('#shop-tabs .shop-tab')].find(t => t.textContent === '변신 카드').click()); await p.waitForTimeout(800);
  ok(await p.evaluate(() => !!document.querySelector('#shop-list .pcg-shop')), '뽑기 창: 특별상점 [변신 카드] 탭');
  await p.screenshot({ path: 'dev/out/pg_shop.png' });
  // ① 무료 뽑기
  { const c0 = await p.evaluate(() => __T.coins); await p.click('#shop-list .pcg-b.free'); await p.waitForTimeout(700);
    ok(await p.evaluate(() => !document.getElementById('pcg-ovl').hidden), '① 무료 뽑기 → 결과 연출'); await p.screenshot({ path: 'dev/out/pg_free_back.png' });
    await p.click('#pcg-ovl .pcg-c'); await p.waitForTimeout(900); await p.screenshot({ path: 'dev/out/pg_free.png' }); await p.click('#pcg-ok'); await p.waitForTimeout(200);
    const s = await S(); ok(s.draws === 1 && s.mile === 1 && (await p.evaluate(() => __T.coins)) === c0, '① 무료 1회: 골드 그대로 · 카드 1장 · 마일리지 1');
    ok(await p.evaluate(() => PCG.freeLeft() > 7190e3), '① 무료 뽑기 뒤 2시간 대기');
    await p.click('#shop-list .pcg-b.free'); await p.waitForTimeout(300); const s2 = await S();
    ok(s2.draws === 1 && await p.evaluate(() => document.getElementById('pcg-ovl').hidden), '① 2시간 안엔 무료 다시 안 됨: ' + await p.evaluate(() => __T.log.slice(-1)[0].t || __T.log.slice(-1)[0].text));
    await p.evaluate(() => { PCG.state().freeAt -= 2 * 3600e3 + 1000; }); await p.waitForTimeout(1200);
    ok(await p.evaluate(() => PCG.freeLeft() === 0 && document.querySelector('#shop-list .pcg-b.free').classList.contains('rdy')), '① 2시간 지나면 다시 무료 (버튼 빛남)');
    await p.click('#shop-list .pcg-b.free'); await p.waitForTimeout(500); await p.evaluate(() => PCG.close()); ok((await S()).draws === 2, '① 2시간 뒤 무료 뽑기 됨'); }
  // ② 1회 2만 · 11회 20만
  { const c0 = await p.evaluate(() => __T.coins); await p.click('#shop-list .pcg-b[data-k="1"]'); await p.waitForTimeout(500); await p.evaluate(() => PCG.close());
    ok(c0 - await p.evaluate(() => __T.coins) === 20000, '② 1회 20,000 골드'); const c1 = await p.evaluate(() => __T.coins), d0 = (await S()).draws;
    await p.click('#shop-list .pcg-b[data-k="11"]'); await p.waitForTimeout(1300);
    ok(c1 - await p.evaluate(() => __T.coins) === 200000 && (await S()).draws === d0 + 11, '② 11회 200,000 골드 · 11장'); await p.screenshot({ path: 'dev/out/pg_11_back.png' });
    await p.click('#pcg-all'); await p.waitForTimeout(2600); await p.screenshot({ path: 'dev/out/pg_11.png' });
    const gs = await p.evaluate(() => [...document.querySelectorAll('#pcg-ovl .pcg-c')].map(e => +e.className.match(/g(\d)/)[1])); ok(gs.length === 11 && gs.some(g => g >= 2), '② 11회 결과에 희귀 이상 (' + gs.join('') + ')');
    await p.click('#pcg-ok'); await p.waitForTimeout(200);
    await p.evaluate(() => __T.setCoins(15000)); await p.click('#shop-list .pcg-b[data-k="1"]'); await p.waitForTimeout(200);
    ok((await S()).draws === d0 + 11 && /골드가 부족/.test(await p.evaluate(() => { const l = __T.log.slice(-1)[0]; return l.t || l.text || ''; })), '② 골드 부족하면 안 됨'); await p.evaluate(() => { __T.setCoins(3000000); __T.INV.render(); }); }
  // 강제로 영웅·전설 연출 (Math.random 잠깐 바꿈)
  { await p.evaluate(() => { const R = Math.random; let n = 0; Math.random = () => (n++ % 2 ? 0.5 : 0.9995); try { PCG.draw(1); } finally { Math.random = R; } }); await p.waitForTimeout(500); await p.click('#pcg-ovl .pcg-c'); await p.waitForTimeout(700); await p.screenshot({ path: 'dev/out/pg_legend.png' }); await p.evaluate(() => PCG.close()); }
  // ④ 등록 · 여분
  { const s = await S(), tot = Object.values(s.cards).reduce((a, b) => a + b, 0); ok(tot === s.draws, `④ 카드 장수 합 ${tot} = 뽑은 수 ${s.draws}`);
    const id = Object.keys(s.cards).find(k => s.cards[k] >= 2); if (id) ok(await p.evaluate(id => PCG.spare(id), id) === s.cards[id] - 1, `④ 같은 카드 ${id} ${s.cards[id]}장 → 여분 ${s.cards[id] - 1}`); }
  await p.evaluate(() => __T.TOWN.openShopId('magic')); await p.evaluate(() => document.querySelector('#shop [data-close]') && document.querySelector('#shop [data-close]').click());
  await p.evaluate(() => { for (const k of ['shop']) document.getElementById(k).hidden = true; });
  // ⑤ 변신
  await p.evaluate(() => { const s = PCG.state(); s.cards.kaspar = (s.cards.kaspar || 0) + 1; s.cards.goblin = (s.cards.goblin || 0) + 1; __T.hero.lv = 40; });
  { const before = await p.evaluate(() => ({ a: __T.INV.cx('atkSpd'), m: __T.INV.cx('moveSpd'), mr: __T.INV.cx('mpRegen'), sp: __T.INV.cx('sp') }));
    await p.evaluate(() => PCG.morph('kaspar')); ok(await p.evaluate(() => __T.BUFF.poly === 0 && document.getElementById('askwin').hidden), '⑤ 레벨 모자라면 변신 안 됨 (Lv40 · 전설 Lv45)');
    await p.evaluate(() => { __T.hero.lv = 52; __T.setCoins(5000); }); await p.evaluate(() => PCG.morph('kaspar')); ok(await p.evaluate(() => __T.BUFF.poly) === 0 && await p.evaluate(() => document.getElementById('askwin').hidden), '⑤ 골드 모자라면 변신 안 됨');
    await p.evaluate(() => { __T.setCoins(1000000); __T.INV.render(); });
    await p.evaluate(() => document.getElementById('btn-poly').click()); await p.waitForTimeout(500);
    await p.click('#pw-grid .pw-c[data-id="kaspar"]'); await p.waitForTimeout(300); await p.click('#pw-go'); await p.waitForTimeout(200); await p.click('#ask-yes'); await p.waitForTimeout(500);
    const af = await p.evaluate(() => ({ a: __T.INV.cx('atkSpd'), m: __T.INV.cx('moveSpd'), mr: __T.INV.cx('mpRegen'), sp: __T.INV.cx('sp'), c: __T.coins, poly: __T.BUFF.poly }));
    ok(af.c === 990000, '⑤ 변신 1만 골드 (' + af.c + ')'); ok(af.a - before.a === 15 && af.m - before.m === 15, `⑤ 전설 공속·이속 +15% (${before.a}→${af.a}, ${before.m}→${af.m})`); ok(af.mr - before.mr === 2 && af.sp - before.sp === 1, '⑤ 카스파 옵션 MP 회복 +2 · SP +1');
    await p.waitForTimeout(1500); ok(await p.evaluate(() => __T.BUFF.poly > 999000), '⑤ 시간이 지나도 변신 유지 (BUFF.poly ' + await p.evaluate(() => Math.round(__T.BUFF.poly)) + ')');
    await p.screenshot({ path: 'dev/out/pg_win.png' });
    await p.evaluate(() => { document.getElementById('polywin').hidden = true; __T.TOWN.placeAt(18.5, 22.5); __T.ZOOMT = 2.2; }); await p.waitForTimeout(1500); await p.screenshot({ path: 'dev/out/pg_morph.png', clip: { x: 340, y: 150, width: 600, height: 460 } });
    await p.evaluate(() => PCG.unmorph()); await p.click('#ask-yes'); await p.waitForTimeout(200); ok(await p.evaluate(() => __T.BUFF.poly === 0 && __T.INV.cx('atkSpd')) === before.a, '⑤ 변신 풀기 → 원래대로');
    // 일반 카드로 변신 → 다른 카드로 바꾸기
    await p.evaluate(() => PCG.doMorph('goblin')); ok(await p.evaluate(() => __T.INV.cx('atkSpd')) - before.a === 1, '⑤ 일반(고블린) +1%');
    await p.evaluate(() => { __T.ZOOMT = 2.2; }); await p.waitForTimeout(800); await p.screenshot({ path: 'dev/out/pg_morph_goblin.png', clip: { x: 340, y: 150, width: 600, height: 460 } });
    await p.evaluate(() => PCG.doMorph('kaspar')); ok(await p.evaluate(() => __T.INV.cx('atkSpd')) - before.a === 15, '⑤ 다른 카드로 바로 바꾸기'); }
  // ⑧ 주문서 변신과 서로 풀림
  { await p.evaluate(() => { __T.INV.add('poly_dark', 1, true); const e = __T.INV.bag().find(x => x.id === 'poly_dark'); __T.INV.use(e); }); await p.waitForTimeout(300);
    ok(await p.evaluate(() => __T.BUFF.poly > 1700 && __T.BUFF.poly <= 1800 && !PCG.has('nope')), '⑧ 주문서를 읽으면 카드 변신이 풀리고 주문서 변신 (30분)');
    await p.evaluate(() => PCG.doMorph('kaspar')); await p.waitForTimeout(200); ok(await p.evaluate(() => __T.BUFF.poly > 999000), '⑧ 카드 변신을 하면 주문서 변신이 풀림'); }
  // ⑦ 마일리지 300 → 전설 고르기
  { await p.evaluate(() => { PCG.state().mile = 300; __T.TOWN.openShopId('magic'); [...document.querySelectorAll('#shop-tabs .shop-tab')].find(t => t.textContent === '변신 카드').click(); }); await p.waitForTimeout(400);
    const w0 = (await S()).cards.wyvern || 0; await p.click('#shop-list .pcg-mb'); await p.waitForTimeout(300); await p.screenshot({ path: 'dev/out/pg_mile.png' });
    await p.click('#shop-list .pcg-pick [data-id="wyvern"]'); await p.waitForTimeout(200); await p.click('#ask-yes'); await p.waitForTimeout(600); await p.evaluate(() => PCG.close());
    const s = await S(); ok(s.mile === 0 && (s.cards.wyvern || 0) === w0 + 1, '⑦ 마일리지 300 → 와이번 1장 (마일리지 0)'); }
  // 도감 [변신 카드] 탭
  { await p.evaluate(() => { document.getElementById('shop').hidden = true; document.getElementById('btn-codex').click(); }); await p.waitForTimeout(300);
    await p.evaluate(() => [...document.querySelectorAll('#cdx-tabs .cdx-tab')].find(t => /변신 카드/.test(t.textContent)).click()); await p.waitForTimeout(900);
    ok(await p.evaluate(() => document.querySelectorAll('#cdx-list .cdx-card').length) === 20, '도감 [변신 카드] 20종'); await p.screenshot({ path: 'dev/out/pg_codex.png' });
    await p.evaluate(() => document.getElementById('codexwin').hidden = true); }
  // 다른 사람 화면: 같은 브라우저의 두 번째 창 (?mp=bc)
  { const q = await ctx.newPage(); q.on('pageerror', e => errs.push('B: ' + e.message)); await login(q, { cls: 'elf', name: 'pgB' + Date.now() % 1e4, mp: true });
    await p.evaluate(() => { __T.hero.x = __T.hero.x; }); await q.waitForTimeout(2500); await q.evaluate(() => { __T.ZOOMT = 1.6; }); await q.waitForTimeout(800); await q.screenshot({ path: 'dev/out/pg_remote.png' }); await q.close(); }
  // 쓰러지면 풀림
  { await p.evaluate(() => { __T.GOD_INV = false; __T.hurtHero(999999, null, 'melee'); }); await p.waitForTimeout(300); ok(await p.evaluate(() => !!__T.DEATH && __T.BUFF.poly === 0), '쓰러지면 카드 변신 풀림');
    await p.click('#death-town').catch(() => {}); await p.waitForTimeout(500); }
  // ⑥ 저장 → 새로 접속 → 카드·마일리지·변신 유지 → 다른 직업도 같은 카드
  { await p.evaluate(() => PCG.doMorph('kaspar')); await p.evaluate(() => { PCG.state().mile = 37; }); const s0 = await S(); await p.evaluate(() => __T.SAVE.now(true, true)); await p.waitForTimeout(300);
    await relog(p, acc, 'knight', ''); const s1 = await S();
    ok(JSON.stringify(s1.cards) === JSON.stringify(s0.cards) && s1.mile === 37 && s1.freeAt === s0.freeAt, '⑥ 새로 접속: 카드·마일리지·무료 시각 그대로');
    await p.evaluate(() => PCG.openWin()); await p.waitForTimeout(300); ok(await p.evaluate(() => __T.BUFF.poly > 999000 && /카스파/.test(document.getElementById('pw-now').textContent)), '⑥ 새로 접속: 카스파 변신 유지 (' + await p.evaluate(() => document.getElementById('pw-now').textContent) + ')'); await p.evaluate(() => { document.getElementById('polywin').hidden = true; });
    await relog(p, acc, 'wizard', 'pgW' + Date.now() % 1e4); const s2 = await S();
    ok(JSON.stringify(s2.cards) === JSON.stringify(s0.cards) && s2.mile === 37, '⑥ 다른 직업(마법사)도 같은 카드 · 마일리지 (계정 공유)');
    ok(await p.evaluate(() => __T.BUFF.poly) === 0, '⑥ 마법사는 변신하지 않은 채로 시작 (변신은 캐릭터마다)');
    await p.evaluate(() => { __T.setCoins(50000); __T.hero.lv = 20; }); await p.evaluate(() => PCG.doMorph('goblin')); ok(await p.evaluate(() => __T.BUFF.poly > 999000 && __T.coins === 40000), '⑥ 마법사도 계정 카드로 변신');
    await p.evaluate(() => { PCG.state().mile = 5; }); await p.evaluate(() => __T.SAVE.now(true, true)); await relog(p, acc, 'knight', ''); ok((await S()).mile === 5, '⑥ 마법사에서 바꾼 마일리지가 기사에서도 보임'); }
  await p.evaluate(() => { __T.INV.toggleWin('charwin'); }); await p.waitForTimeout(500); await p.screenshot({ path: 'dev/out/pg_charwin.png' });
  await p.click('#cw-poly'); await p.waitForTimeout(400); ok(await p.evaluate(() => !document.getElementById('polywin').hidden), '캐릭터 창 [변신 카드] 버튼 → 변신 창');
  ok(errs.length === 0, '⑨ 오류 없음' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log(fails ? `실패 ${fails}개` : '모두 통과'); await b.close(); })();
