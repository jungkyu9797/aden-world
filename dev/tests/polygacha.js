// 변신 카드 2차 1단계 테스트 (KT_PORT=8781 bash dev/runkt.sh dev/tests/polygacha.js) — 스크린샷 dev/out/pg_*.png
// ① 가격·골드 확인 (1회 50,000 · 11회 500,000) · 확정 칸 없음 · 확률 · 무료 2시간 ② 마일리지 1000 ③ 보유중 장수·등급 합계 ④ 잠금 → 합성 재료에서 빠짐
// ⑤ 합성 확률(30/30/10/10 · 경계값) · 실패 = 같은 등급 1장 · 천장 7/10 ⑥ 자동 합성(일반·고급만 · 잠금·변신 칸 제외) ⑦ 직접 합성(창에서 고르기)
// ⑧ 변신 칸: 끌어다 놓기 · 골드 없음 · 쓰러져도 · 다시 접속해도 · 빼면 풀림 · 칸 카드는 합성 안 함 · 직업·레벨 제한 · 주문서와 함께
// ⑨ 저장 → 다시 접속(카드·잠금·천장·마일리지·변신 칸) · 다른 직업 · 예전 데이터 옮기기 ⑩ 도감·상점 안내 · 모바일 화면 ⑪ 오류 없음
const { chromium } = require('playwright'); const login = require('../tq.js');
const URL = 'http://127.0.0.1:' + (process.env.KT_PORT || 8766) + '/_kt2.html';
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
async function relog(p, acc, cls, name, pre) { await p.goto(URL); await p.waitForSelector('#lg-acc', { state: 'visible' }); if (pre) await pre();
  await p.waitForTimeout(300); await p.fill('#lg-acc', acc); await p.fill('#lg-pw', 'abcd'); if (await p.inputValue('#lg-acc') !== acc) await p.fill('#lg-acc', acc); await p.click('#lg-go');
  await p.waitForSelector(`.cs-card[data-cls="${cls}"]`, { state: 'visible', timeout: 30000 }); await p.click(`.cs-card[data-cls="${cls}"]`); await p.click('#cs-start');
  const nm = await p.waitForSelector('#nm-in', { state: 'visible', timeout: 2500 }).catch(() => null); if (nm) { await p.fill('#nm-in', name); await p.click('#nm-go'); }
  await p.waitForFunction(() => window.__gameOn && window.__T && __T.SCENE === 'town', null, { timeout: 30000 }); await p.waitForTimeout(1300); }
const SET = { goblin: 6, orc: 4, dwarf: 4, hobgoblin: 2, werewolf: 5, lizardman: 3, dark_elf: 6, bugbear: 4, cerberus: 2, king_bugbear: 5, spartoi: 3, sword_knight: 1, deathknight: 1, arc_mage: 1 };
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('A: ' + e.message));
  const acc = 'pg' + Date.now() % 1e7; await login(p, { acc, cls: 'knight', name: 'pgK' + Date.now() % 1e4 });
  const S = () => p.evaluate(() => JSON.parse(JSON.stringify(PCG.state()))), coins = () => p.evaluate(() => __T.coins), lastLog = () => p.evaluate(() => { const l = __T.log.slice(-1)[0] || {}; return l.t || l.text || ''; });
  const setCards = o => p.evaluate(o => { const s = PCG.state(); s.cards = Object.assign({}, o); s.lock = {}; s.slot = {}; s.pity = { h: 0, l: 0 }; PCG.sync(); PCG.renderWin(); }, o);
  const stub = (v, fn) => p.evaluate(([v, fn]) => { const R = Math.random; Math.random = () => v; try { return new Function('return ' + fn)()(); } finally { Math.random = R; } }, [v, fn]);   // Math.random은 부를 때만 잠깐 바꿈
  await p.evaluate(() => { __T.setCoins(5000000); __T.hero.lv = 52; __T.INV.render(); });
  // ① 확률 · 확정 칸 없음
  { const r = await p.evaluate(() => { const a = PCG.sim(200000), b = PCG.sim(20000, 11); return { a: a.g, no11: b.no11 }; }), N = 200000, E = { 일반: 60, 고급: 30, 희귀: 8, 영웅: 1.8, 전설: 0.2 }, pc = k => r.a[k] / N * 100;
    console.log('rates', JSON.stringify(Object.fromEntries(Object.keys(E).map(k => [k, +pc(k).toFixed(3)]))));
    ok(Object.keys(E).every(k => Math.abs(pc(k) - E[k]) < Math.max(0.6, E[k] * 0.08)), '① 등급 확률 60/30/8/1.8/0.2');
    ok(r.no11 > 20000 * 0.25 && r.no11 < 20000 * 0.37, `① 11회 확정 칸 없음 (희귀 이상 없는 11회 ${(r.no11 / 200).toFixed(1)}% · 기대 약 31%)`); }
  // 창 열기 (위 [변신] 버튼)
  await p.click('#btn-poly'); await p.waitForTimeout(700); ok(await p.evaluate(() => !document.getElementById('polywin').hidden), '위 메뉴 [변신] → 변신 카드 창');
  { const t = await p.evaluate(() => ({ d11: document.getElementById('pw-d11').textContent, d1: document.getElementById('pw-d1').textContent, g: [...document.querySelectorAll('#polywin .pw-gold')].map(e => e.textContent) }));
    ok(/11회 뽑기/.test(t.d11) && /500,000/.test(t.d11) && /1회 뽑기/.test(t.d1) && /50,000/.test(t.d1), '① 버튼: 11회 500,000 · 1회 50,000 (' + t.d11 + ' / ' + t.d1 + ')');
    ok(t.g.length === 2 && t.g.every(x => /보유 5,000,000/.test(x)), '① 버튼 옆 보유 골드 (' + t.g.join(' · ') + ')');
    const order = await p.evaluate(() => document.getElementById('pw-d11').getBoundingClientRect().top < document.getElementById('pw-d1').getBoundingClientRect().top); ok(order, '① 11회 버튼이 위 · 1회가 아래'); }
  await p.screenshot({ path: 'dev/out/pg_win_empty.png' });
  // ① 무료 뽑기 (2시간)
  { const c0 = await coins(); await p.click('#pw-dfree'); await p.waitForTimeout(700); ok(await p.evaluate(() => !document.getElementById('pcg-ovl').hidden), '① 무료 뽑기 → 결과 연출');
    await p.click('#pcg-ok'); await p.waitForTimeout(200); const s = await S(); ok(s.draws === 1 && s.mile === 1 && await coins() === c0, '① 무료 1회: 골드 그대로 · 카드 1장 · 마일리지 1');
    ok(await p.evaluate(() => PCG.freeLeft() > 7190e3), '① 무료 뽑기 뒤 2시간 대기'); await p.click('#pw-dfree'); await p.waitForTimeout(200); ok((await S()).draws === 1, '① 2시간 안엔 무료 다시 안 됨: ' + await lastLog());
    await p.evaluate(() => { PCG.state().freeAt -= 2 * 3600e3 + 1000; }); await p.waitForTimeout(1200); ok(await p.evaluate(() => PCG.freeLeft() === 0 && document.getElementById('pw-dfree').classList.contains('rdy')), '① 2시간 지나면 다시 무료 (버튼 빛남)'); }
  // ① 1회 50,000 · 11회 500,000 · 다시 뽑기
  { const c0 = await coins(), d0 = (await S()).draws; await p.click('#pw-d1'); await p.waitForTimeout(500); await p.click('#pcg-ok'); await p.waitForTimeout(150);
    ok(c0 - await coins() === 50000 && (await S()).draws === d0 + 1, '① 1회 50,000 골드 · 1장'); const c1 = await coins();
    await p.click('#pw-d11'); await p.waitForTimeout(1300); ok(c1 - await coins() === 500000 && (await S()).draws === d0 + 12, '① 11회 500,000 골드 · 11장'); await p.screenshot({ path: 'dev/out/pg_11_back.png' });
    await p.waitForFunction(() => PCG.ov() && PCG.ov().ready); await p.evaluate(() => PCG.flipAll(true)); await p.waitForTimeout(1600); await p.screenshot({ path: 'dev/out/pg_11.png' }); await p.click('#pcg-ok'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => PCG.last() === 11 && /전설 재뽑기/.test(document.getElementById('pw-again').textContent)), '변신 칸 옆 버튼 = [전설 재뽑기] · 다시 뽑기는 Space·결과 화면');
    const c2 = await coins(); await p.evaluate(() => PCG.again()); await p.waitForTimeout(900); ok(c2 - await coins() === 500000 && (await S()).draws === d0 + 23, '다시 뽑기 → 같은 11회 한 번 더'); await p.evaluate(() => PCG.close());
    ok(await p.evaluate(() => document.querySelectorAll('#pw-res .pw-ri').length) === 11, '최근 결과 칸에 11장');
    await p.evaluate(() => { __T.setCoins(49000); }); await p.waitForTimeout(1100); ok(await p.evaluate(() => document.querySelector('#polywin .pw-gold[data-c="50000"]').classList.contains('short')), '① 골드 모자라면 보유 골드 빨갛게');
    await p.click('#pw-d1'); await p.waitForTimeout(200); ok((await S()).draws === d0 + 23 && /골드가 부족/.test(await lastLog()), '① 골드 부족하면 안 됨 (' + await lastLog() + ')');
    await p.evaluate(() => { __T.setCoins(5000000); }); const s = await S(), tot = Object.values(s.cards).reduce((a, b) => a + b, 0); ok(tot === s.draws && s.mile === s.draws, `카드 장수 합 ${tot} = 뽑은 수 ${s.draws} = 마일리지 ${s.mile}`); }
  // 강제 전설 연출 (Math.random 잠깐)
  { await p.evaluate(() => { const R = Math.random; let n = 0; Math.random = () => (n++ % 2 ? 0.5 : 0.9995); try { PCG.draw(1); } finally { Math.random = R; } }); await p.waitForFunction(() => PCG.ov() && PCG.ov().ready); await p.evaluate(() => PCG.flipAll(true)); await p.waitForTimeout(900); await p.screenshot({ path: 'dev/out/pg_legend.png' }); await p.evaluate(() => PCG.close()); }
  // ② 마일리지 1000
  { await p.evaluate(() => { PCG.state().mile = 999; PCG.renderWin(); }); ok(/전설 받기/.test(await p.evaluate(() => document.getElementById('pw-mb').textContent)), '② 마일리지 버튼 = [전설 받기]'); await p.click('#pw-mb'); await p.waitForTimeout(200); ok(await p.evaluate(() => document.getElementById('askwin').hidden) && /마일리지가 모자라요.*1000/.test(await lastLog()), '② 999점이면 전설 받기 안 됨');
    await p.evaluate(() => { PCG.state().mile = 1003; PCG.renderWin(); PCG._force(['wyvern']); }); const w0 = (await S()).cards.wyvern || 0; await p.click('#pw-mb'); await p.waitForTimeout(200); ok(/무작위/.test(await p.evaluate(() => document.getElementById('ask-sub').textContent)), '② 1000점 → 무작위 전설 받기 물음');
    await p.click('#ask-yes'); await p.waitForTimeout(900); ok(await p.evaluate(() => { const o = PCG.ov(); return !!o && !!o.tg && o.n === 1 && o.k === 'one'; }), '② 마일리지 전설도 뽑기 연출(홀)로'); await p.screenshot({ path: 'dev/out/pg_mile.png' }); await p.evaluate(() => PCG.close());
    const s = await S(); ok(s.mile === 3 && (s.cards.wyvern || 0) === w0 + 1, `② 마일리지 1000 → 전설 1장 (정한 카드 와이번 · 남은 ${s.mile}점)`); }
  // ③ 보유중: 등급별 · 장수 · 합계
  await setCards(SET); await p.waitForTimeout(400);
  { const v = await p.evaluate(() => [...document.querySelectorAll('#pw-grid .pw-gr')].map(r => ({ g: r.querySelector('.pw-gn').childNodes[0].textContent, n: r.querySelector('.pw-gn b').textContent, ids: [...r.querySelectorAll('.pw-c')].map(c => c.dataset.id + ':' + ((c.querySelector('.pw-n') || {}).textContent || '1')) })));
    console.log('보유중', JSON.stringify(v)); const G = { 일반: 16, 고급: 8, 희귀: 12, 영웅: 9, 전설: 2 };
    ok(v.length === 5 && v.every(r => r.n === G[r.g] + '장'), '③ 등급마다 합계 (일반 16 · 고급 8 · 희귀 12 · 영웅 9 · 전설 2)');
    ok(v[0].ids.includes('goblin:6') && v[0].ids.includes('orc:4') && v[3].ids.includes('sword_knight:1'), '③ 같은 카드는 장수 표시 (고블린 6 · 오크 4)');
    ok(await p.evaluate(() => /14 \/ 26종 · 47장/.test(document.getElementById('pw-total').textContent)), '③ 보유 종류·장수 (' + await p.evaluate(() => document.getElementById('pw-total').textContent) + ')'); }
  await p.screenshot({ path: 'dev/out/pg_win.png' });
  // ⑤ 합성 확률 경계값 (Math.random 고정)
  { const r = await stub(0.2999, "() => PCG.synOne('일반')"); ok(r.ok && r.c.g === '고급', '⑤ 일반→고급: 0.2999 → 성공 (고급 카드)');
    const r2 = await stub(0.3001, "() => PCG.synOne('일반')"); ok(!r2.ok && r2.c.g === '일반', '⑤ 일반→고급: 0.3001 → 실패 · 같은 등급(일반) 1장');
    const r3 = await stub(0.2999, "() => PCG.synOne('고급')"); const r4 = await stub(0.3001, "() => PCG.synOne('고급')"); ok(r3.ok && r3.c.g === '희귀' && !r4.ok && r4.c.g === '고급', '⑤ 고급→희귀 30%');
    const r5 = await stub(0.0999, "() => PCG.synOne('희귀')"); const r6 = await stub(0.1001, "() => PCG.synOne('희귀')"); ok(r5.ok && r5.c.g === '영웅' && !r6.ok && r6.c.g === '희귀', '⑤ 희귀→영웅 10%');
    const r7 = await stub(0.0999, "() => PCG.synOne('영웅')"); const r8 = await stub(0.1001, "() => PCG.synOne('영웅')"); ok(r7.ok && r7.c.g === '전설' && !r8.ok && r8.c.g === '영웅', '⑤ 영웅→전설 10%');
    // 실패하면 그 등급 전체에서 무작위 (재료와 상관없이): 6종 모두 나옴
    const st = await p.evaluate(() => { const bak = JSON.stringify(PCG.state()), o = {}, t = {}, by = {}; for (const g of ['일반', '고급', '희귀', '영웅']) { let n = 0; const N = 20000; for (let i = 0; i < N; i++) { const r = PCG.synOne(g); if (r.ok) n++; else by[r.c.id] = (by[r.c.id] || 0) + 1; } o[g] = +(n / N * 100).toFixed(2); } PCG.load(bak); PCG.sync(); return { o, by }; });
    console.log('합성 성공률 %', JSON.stringify(st.o)); ok(Math.abs(st.o.일반 - 30) < 1.5 && Math.abs(st.o.고급 - 30) < 1.5 && Math.abs(st.o.희귀 - 10) < 1.2 && Math.abs(st.o.영웅 - 10) < 1.2, '⑤ 합성 2만 번씩 성공률 30/30/10/10');
    ok(['goblin', 'orc', 'dwarf', 'orc_archer', 'hobgoblin', 'orc_warrior'].every(id => st.by[id] > 2000), '⑤ 실패 카드는 같은 등급 전체에서 고르게 (일반 6종 모두 나옴)'); }
  // ⑤ 천장 7 / 10 (계정 공유 숫자)
  { await setCards(SET); await p.evaluate(() => { PCG.state().pity = { h: 5, l: 8 }; });
    const a = await stub(0.5, "() => PCG.synOne('희귀')"); ok(!a.ok && !a.pity && (await S()).pity.h === 6, '⑤ 희귀→영웅 6번째 실패: 천장 아직 (6/7)');
    const c = await stub(0.5, "() => PCG.synOne('희귀')"); ok(!c.ok && c.c.g === '희귀' && c.pity && c.pity.g === '영웅' && (await S()).pity.h === 0, `⑤ 7번째 연속 실패 → 돌려받는 희귀 + 천장 영웅 1장 (${c.pity && c.pity.name}) · 0으로`);
    const d = await stub(0.5, "() => PCG.synOne('영웅')"); ok(!d.pity && (await S()).pity.l === 9, '⑤ 영웅→전설 9/10');
    const e = await stub(0.5, "() => PCG.synOne('영웅')"); ok(e.pity && e.pity.g === '전설' && (await S()).pity.l === 0, `⑤ 10번째 연속 실패 → 천장 전설 1장 (${e.pity && e.pity.name})`);
    await p.evaluate(() => { PCG.state().pity.h = 4; }); const f = await stub(0.01, "() => PCG.synOne('희귀')"); ok(f.ok && (await S()).pity.h === 0, '⑤ 성공하면 연속 실패 0으로');
    await p.evaluate(() => PCG.renderWin()); ok(await p.evaluate(() => /천장 0\/7/.test(document.querySelector('#pw-synb .pw-mt[data-g="희귀"]').textContent) && /천장 희귀→영웅 0\/7 · 영웅→전설 0\/10/.test(document.getElementById('pw-pity').textContent)), '⑤ 창에 천장 숫자'); }
  // ④ 잠금 · ⑥ 자동 합성 · ⑧ 변신 칸(끌어다 놓기)
  await setCards(SET); await p.waitForTimeout(300);
  { await p.click('#pw-grid .pw-c[data-id="dwarf"] .pw-lock'); await p.waitForTimeout(200); ok((await S()).lock.dwarf === 1 && await p.evaluate(() => document.querySelector('#pw-grid .pw-c[data-id="dwarf"]').classList.contains('lk')), '④ 자물쇠 누르면 잠금 (난쟁이)');
    // 끌어다 놓기: 고블린 → 변신 칸
    const c0 = await coins(), a0 = await p.evaluate(() => __T.INV.cx('atkSpd')); const bb = await p.locator('#pw-grid .pw-c[data-id="goblin"]').boundingBox(), sb = await p.locator('#pw-slot').boundingBox();
    await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); for (let i = 1; i <= 8; i++) { await p.mouse.move(bb.x + bb.width / 2 + (sb.x + 30 - bb.x - bb.width / 2) * i / 8, bb.y + bb.height / 2 + (sb.y + sb.height / 2 - bb.y - bb.height / 2) * i / 8); await p.waitForTimeout(20); }
    ok(await p.evaluate(() => !!document.querySelector('.pw-ghost') && document.getElementById('pw-slot').classList.contains('drop')), '⑧ 끄는 동안 카드가 따라오고 변신 칸이 빛남'); await p.screenshot({ path: 'dev/out/pg_drag.png' });
    await p.mouse.up(); await p.waitForTimeout(400); const m = await p.evaluate(() => ({ cur: PCG.cur(), slot: (PCG.slot() || {}).id, a: __T.INV.cx('atkSpd'), ghost: !!document.querySelector('.pw-ghost') }));
    ok(m.cur === 'pc_goblin' && m.slot === 'goblin' && !m.ghost, '⑧ 고블린을 변신 칸에 놓으면 바로 변신'); ok(await coins() === c0, '⑧ 변신에 골드 안 듦'); ok(m.a - a0 === 1, `⑧ 일반 카드 공속 +1% (${a0}→${m.a})`);
    ok(await p.evaluate(() => document.querySelector('#pw-grid .pw-c[data-id="goblin"] .pw-n').textContent === '5' && PCG.free('goblin') === 5 && PCG.avail('goblin') === 5), '⑧ 칸에 넣은 카드는 보유중에서 빠짐 (고블린 6 → 5)');
    // 자동 합성: 일반(고블린 5 + 오크 4 + 홉고블린 2 = 11, 난쟁이 잠금) · 고급
    const s0 = await S(); await p.click('#pw-synb [data-a="auto"]'); await p.waitForTimeout(500); const s1 = await S(), out = await p.evaluate(() => PCG.lastRes().L.map(r => ({ g: r.g, ok: r.ok, c: r.c.g, id: r.c.id })));
    { const back = out.filter(r => r.id === 'dwarf').length; ok(s1.cards.dwarf === 4 + back, `④ 잠근 난쟁이 4장은 자동 합성에 안 씀 (돌려받은 난쟁이 ${back}장 더)`); } ok(s1.slot.knight === 'goblin' && (s1.cards.goblin || 0) >= 1, '⑥ 변신 칸의 고블린은 합성에 안 씀');
    ok(out.length > 0 && out.every(r => r.g === '일반' || r.g === '고급'), `⑥ 자동 합성은 일반·고급만 (${out.length}번)`);
    ok(await p.evaluate(() => PCG.gAvail('일반') < 4 && PCG.gAvail('고급') < 4), '⑥ 남김없이 (남은 일반·고급 재료 4장 미만)');
    ok(['dark_elf', 'bugbear', 'cerberus', 'king_bugbear', 'spartoi'].every(id => (s1.cards[id] || 0) >= s0.cards[id]), '⑥ 희귀·영웅 카드는 자동 합성으로 줄지 않음');
    ok(await p.evaluate(() => /자동 합성/.test(document.querySelector('#pw-res .pw-rh').textContent) && /성공/.test(document.querySelector('#pw-res .pw-rs').textContent)), '⑥ 결과 요약만 (' + await p.evaluate(() => document.querySelector('#pw-res .pw-rs').textContent) + ')');
    await p.screenshot({ path: 'dev/out/pg_auto.png' }); }
  // ⑦ 직접 합성 (창: 희귀 → 영웅 · 보유중에서 누르기)
  await setCards(SET); await p.evaluate(() => { PCG.state().lock.bugbear = 1; PCG.renderWin(); });
  { await p.click('#pw-synb .pw-mt[data-g="희귀"]'); await p.waitForTimeout(200); ok(await p.evaluate(() => PCG.tray().g === '희귀' && document.querySelector('#pw-grid .pw-c[data-id="goblin"]').classList.contains('dim')), '⑦ [희귀 → 영웅] → 다른 등급은 흐리게');
    for (let i = 0; i < 6; i++) await p.click('#pw-grid .pw-c[data-id="dark_elf"]'); await p.click('#pw-grid .pw-c[data-id="dark_elf"]'); await p.waitForTimeout(100); await p.click('#pw-grid .pw-c[data-id="cerberus"]'); await p.click('#pw-grid .pw-c[data-id="bugbear"]'); await p.waitForTimeout(200);
    const t = await p.evaluate(() => PCG.tray().n); ok(t.dark_elf === 6 && t.cerberus === 1 && !t.bugbear, '⑦ 누를 때마다 1장 (다크엘프는 6장까지 · 잠근 버그베어는 안 들어감): ' + JSON.stringify(t));
    ok(await p.evaluate(() => /7장 → 합성 1번/.test(document.querySelector('#pw-synb .pw-tb').textContent) && /3장은 남아요/.test(document.querySelector('#pw-synb .pw-tb').textContent)), '⑦ 7장 → 1번 (3장 남음)');
    await p.click('#pw-synb [data-a="fill"]'); await p.waitForTimeout(200); ok(await p.evaluate(() => { const n = Object.values(PCG.tray().n).reduce((a, b) => a + b, 0); return n === 8 && !PCG.tray().n.bugbear; }), '⑦ [모두 넣기] = 4장 단위 (다크엘프 6 + 케르베로스 2 = 8 · 잠금 제외)');
    await p.screenshot({ path: 'dev/out/pg_tray.png' }); const s0 = await S();
    await p.evaluate(() => { const R = Math.random; let n = 0; Math.random = () => (n++ === 0 ? 0.05 : 0.5); try { document.querySelector('#pw-synb [data-a="go"]').click(); } finally { Math.random = R; } }); await p.waitForTimeout(400);
    const s1 = await S(), L = await p.evaluate(() => PCG.lastRes().L.map(r => ({ ok: r.ok, g: r.c.g })));
    ok(L.length === 2 && L[0].ok && L[0].g === '영웅' && !L[1].ok && L[1].g === '희귀', '⑦ 2번 합성: 성공(영웅) · 실패(희귀 1장 돌려받음)');
    const used = (s0.cards.dark_elf - (s1.cards.dark_elf || 0)) + (s0.cards.cerberus - (s1.cards.cerberus || 0)); const back = L.filter(r => !r.ok).length; ok(used >= 8 - back && used <= 8, `⑦ 재료 8장 사용 (다크엘프·케르베로스 ${used}장 줄어듦 · 돌려받은 카드가 같은 종류면 +1)`);
    ok(s1.pity.h === 1, '⑦ 천장 숫자: 성공 뒤 실패 1 → 1/7'); await p.evaluate(() => PCG.close()); await p.waitForTimeout(200); await p.screenshot({ path: 'dev/out/pg_man.png' }); await p.click('#pw-synb .pw-mt[data-g="희귀"]'); }
  // ⑧ 변신 칸: 직업 · 레벨 제한 · 탭(눌러서) 넣기 · 빼기 · 쓰러짐 · 주문서
  await setCards(SET);
  { await p.click('#pw-grid .pw-c[data-id="arc_mage"]'); await p.waitForTimeout(200); ok(await p.evaluate(() => { const b = document.querySelector('#pw-sel [data-a="put"]'); return b.disabled && /마법사 전용/.test(b.textContent); }), '⑧ 기사: 아크메이지 = 마법사 전용 (버튼 막힘)');
    await p.evaluate(() => PCG.setSlot('arc_mage')); ok(await p.evaluate(() => !PCG.slot() && !PCG.cur()), '⑧ 내부 함수로도 막힘: ' + await lastLog());
    await p.evaluate(() => { __T.hero.lv = 40; }); await p.evaluate(() => PCG.setSlot('deathknight')); ok(await p.evaluate(() => !PCG.slot()) && /Lv.45/.test(await lastLog()), '⑧ 레벨 모자라면 안 됨 (Lv40 · 전설 45)'); await p.evaluate(() => { __T.hero.lv = 52; });
    await p.click('#pw-grid .pw-c[data-id="deathknight"]'); await p.waitForTimeout(150); await p.click('#pw-sel [data-a="put"]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => PCG.cur() === 'pc_deathknight' && __T.INV.cx('atkSpd') === 15 && __T.BUFF.poly > 999000), '⑧ 누르고 [변신 칸에 넣기] → 데스나이트 (+15%)');
    ok(await p.evaluate(() => { const e = document.querySelector('#pw-grid .pw-c[data-id="deathknight"]'); return !!e && e.classList.contains('sl') && !e.classList.contains('no') && !e.querySelector('.pw-n') && /변신/.test(e.querySelector('.pw-slt').textContent); }), '⑧ 1장뿐인 카드를 칸에 넣으면 보유중에 \'변신\' 표시 (남은 장수 없음)');
    await p.waitForTimeout(1500); ok(await p.evaluate(() => __T.BUFF.poly > 999000), '⑧ 시간이 지나도 그대로');
    await p.evaluate(() => PCG.setSlot('king_bugbear')); ok(await p.evaluate(() => PCG.cur() === 'pc_king_bugbear' && PCG.free('deathknight') === 1), '⑧ 다른 카드를 넣으면 바뀌고 전 카드는 보유중으로');
    await p.evaluate(() => PCG.setSlot('deathknight'));
    // 주문서: 그동안만 주문서 모습 → 끝나면 칸의 카드로
    await p.evaluate(() => { __T.INV.add('poly_dark', 1, true); const e = __T.INV.bag().find(x => x.id === 'poly_dark'); __T.INV.use(e); }); await p.waitForTimeout(300);
    ok(await p.evaluate(() => PCG.cur() === 'pc_dknight' || (PCG.cur() && !PCG.cur().startsWith('pc_') && __T.BUFF.poly <= 1800)), '⑧ 주문서를 읽으면 30분 주문서 모습 (' + await p.evaluate(() => PCG.cur()) + ')');
    await p.evaluate(() => { __T.BUFF.poly = 0.5; }); await p.waitForTimeout(2200); ok(await p.evaluate(() => PCG.cur() === 'pc_deathknight' && __T.BUFF.poly > 999000), '⑧ 주문서가 끝나면 변신 칸의 카드 모습으로');
    // 쓰러져도 그대로
    await p.evaluate(() => { __T.GOD_INV = false; __T.hurtHero(999999, null, 'melee'); }); await p.waitForTimeout(400); ok(await p.evaluate(() => !!__T.DEATH && PCG.cur() === 'pc_deathknight'), '⑧ 쓰러져도 변신 그대로');
    await p.click('#death-town').catch(() => {}); await p.waitForTimeout(1500); ok(await p.evaluate(() => !__T.DEATH && PCG.cur() === 'pc_deathknight'), '⑧ 마을에서 다시 일어나도 그대로');
    await p.evaluate(() => { document.getElementById('polywin').hidden = true; __T.TOWN.placeAt(18.5, 22.5); __T.ZOOMT = 2.2; }); await p.waitForTimeout(1500); await p.screenshot({ path: 'dev/out/pg_morph.png', clip: { x: 340, y: 150, width: 600, height: 460 } });
    await p.evaluate(() => PCG.openWin()); await p.waitForTimeout(300); await p.click('#pw-slot [data-a="out"]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => !PCG.cur() && !PCG.slot() && __T.BUFF.poly === 0 && __T.INV.cx('atkSpd') === 0 && PCG.free('deathknight') === 1), '⑧ [빼기] → 변신 풀림 · 카드는 보유중으로');
    await p.evaluate(() => PCG.setSlot('deathknight')); }
  // ⑨ 저장 → 다시 접속 · 다른 직업
  { await p.evaluate(() => { const s = PCG.state(); s.lock = { dwarf: 1, spartoi: 1 }; s.pity = { h: 3, l: 6 }; s.mile = 777; }); const s0 = await S(); await p.evaluate(() => __T.SAVE.now(true, true)); await p.waitForTimeout(300);
    await relog(p, acc, 'knight', ''); const s1 = await S();
    ok(JSON.stringify(s1.cards) === JSON.stringify(s0.cards) && JSON.stringify(s1.lock) === JSON.stringify(s0.lock) && s1.pity.h === 3 && s1.pity.l === 6 && s1.mile === 777 && s1.slot.knight === 'deathknight', '⑨ 다시 접속: 카드·잠금·천장·마일리지·변신 칸 그대로');
    ok(await p.evaluate(() => PCG.cur() === 'pc_deathknight' && __T.BUFF.poly > 999000), '⑨ 다시 접속해도 데스나이트 변신');
    await relog(p, acc, 'wizard', 'pgW' + Date.now() % 1e4); const s2 = await S();
    ok(JSON.stringify(s2.cards) === JSON.stringify(s0.cards) && s2.mile === 777, '⑨ 마법사도 같은 카드 · 마일리지 (계정 공유)');
    ok(await p.evaluate(() => !PCG.cur() && !PCG.slot() && PCG.free('deathknight') === 0), '⑨ 마법사는 변신 칸이 따로 (기사 칸의 데스나이트는 마법사 보유중에 없음)');
    await p.evaluate(() => { __T.hero.lv = 52; }); await p.evaluate(() => PCG.setSlot('arc_mage')); ok(await p.evaluate(() => PCG.cur() === 'pc_arc_mage'), '⑨ 마법사 → 아크메이지 변신 칸');
    await p.evaluate(() => PCG.setSlot('deathknight')); ok(await p.evaluate(() => PCG.cur() === 'pc_arc_mage') && /다른 캐릭터의 변신 칸/.test(await lastLog()), '⑨ 다른 캐릭터 칸에 있는 마지막 1장은 못 넣음');
    await p.evaluate(() => __T.SAVE.now(true, true)); await relog(p, acc, 'knight', ''); ok(await p.evaluate(() => PCG.cur() === 'pc_deathknight' && PCG.state().slot.wizard === 'arc_mage'), '⑨ 기사로 돌아오면 데스나이트 · 마법사 칸 기록도 남음'); }
  // ⑨ 예전(1차) 데이터 옮기기: 카드·마일리지 300점 체계 + 1만 골드 카드 변신 → 변신 칸
  { const acc2 = 'pgo' + Date.now() % 1e7; const q = await ctx.newPage(); q.on('pageerror', e => errs.push('B: ' + e.message)); await login(q, { acc: acc2, cls: 'knight', name: 'pgO' + Date.now() % 1e4 });
    await q.evaluate(() => { __T.hero.lv = 50; __T.SAVE.now(true, true); }); await q.waitForTimeout(300);
    const patch = async () => q.evaluate(a => { const k = 'aden_save_' + a + '_knight', o = JSON.parse(localStorage.getItem(k)); o.pf = 'pc_kaspar'; o.buff = Object.assign(o.buff || {}, { poly: 999999 }); localStorage.setItem(k, JSON.stringify(o));
      localStorage.setItem('aden_pcard_' + a, JSON.stringify({ cards: { kaspar: 1, goblin: 3 }, mile: 250, freeAt: 0, draws: 4 })); }, acc2.toLowerCase());
    await relog(q, acc2, 'knight', '', patch); const s = await q.evaluate(() => JSON.parse(JSON.stringify(PCG.state())));
    ok(s.mile === 250 && s.cards.kaspar === 1 && s.slot.knight === 'kaspar' && await q.evaluate(() => PCG.cur() === 'pc_kaspar'), '⑨ 예전 데이터: 마일리지 250점 그대로 · 1만 골드로 하던 카스파 변신 → 변신 칸으로 옮김');
    await q.close(); }
  // ⑩ 도감 · 특별상점 안내 · 캐릭터 창 버튼
  { await p.evaluate(() => { document.getElementById('polywin').hidden = true; document.getElementById('btn-codex').click(); }); await p.waitForTimeout(300);
    await p.evaluate(() => [...document.querySelectorAll('#cdx-tabs .cdx-tab')].find(t => /변신 카드/.test(t.textContent)).click()); await p.waitForTimeout(900);
    const t = await p.evaluate(() => document.getElementById('cdx-list').textContent); ok(await p.evaluate(() => document.querySelectorAll('#cdx-list .cdx-card').length) === 26, '⑩ 도감 [변신 카드] 26종');
    ok(/확정 칸 없음/.test(t) && /1,000점/.test(t) && /일반→고급 30% · 고급→희귀 30% · 희귀→영웅 10% · 영웅→전설 10%/.test(t) && !/11회 확정/.test(t) && /희귀 4장 합성 10%/.test(t), '⑩ 도감 글: 확정 칸 없음 · 마일리지 1000 · 합성 확률');
    await p.screenshot({ path: 'dev/out/pg_codex.png' }); await p.evaluate(() => document.getElementById('codexwin').hidden = true);
    { const tabs = await p.evaluate(() => { __T.TOWN.openShopId('magic'); const t = [...document.querySelectorAll('#shop-tabs .shop-tab')].map(t => t.textContent); document.getElementById('shop').hidden = true; return t; }); console.log('shop tabs', tabs.join(',')); ok(tabs.length > 0 && !tabs.includes('변신 카드'), '⑩ 특별상점에 [변신 카드] 탭 없음 (위 메뉴 [변신] 창에서)'); }
    await p.evaluate(() => { document.getElementById('polywin').hidden = true; __T.INV.toggleWin('charwin'); }); await p.waitForTimeout(300); await p.click('#cw-poly'); await p.waitForTimeout(300); ok(await p.evaluate(() => !document.getElementById('polywin').hidden), '⑩ 캐릭터 창 [변신 카드] 버튼 → 변신 카드 창');
    await p.evaluate(() => { document.getElementById('charwin').hidden = true; }); }
  // ⑩ 사냥터에서도 열림
  { await p.evaluate(() => { document.getElementById('polywin').hidden = true; }); await p.evaluate(() => { try { __T.TOWN.toZone(1); } catch (e) {} }); await p.waitForTimeout(1500);
    await p.click('#btn-poly'); await p.waitForTimeout(400); ok(await p.evaluate(() => !document.getElementById('polywin').hidden), '⑩ 위 [변신] 버튼은 어디서나 (' + await p.evaluate(() => __T.SCENE) + ')'); await p.evaluate(() => { document.getElementById('polywin').hidden = true; }); }
  // ⑩ 모바일 (가로 844×390 · 터치)
  { const m = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); const q = await m.newPage(); q.on('pageerror', e => errs.push('mob: ' + e.message));
    await login(q, { cls: 'knight', name: 'pgM' + Date.now() % 1e4, init: () => { try { localStorage.setItem('aden_mob', '1'); } catch (e) {} } });
    await q.evaluate(o => { __T.setCoins(5000000); __T.hero.lv = 52; const s = PCG.state(); s.cards = Object.assign({}, o); }, SET);
    const opened = await q.evaluate(() => { const b = document.getElementById('mm-poly'); if (b) b.click(); return !document.getElementById('polywin').hidden; }); await q.waitForTimeout(800);
    ok(opened, '⑩ 모바일 메뉴 [변신 카드] → 창'); const fit = await q.evaluate(() => { const r = document.getElementById('polywin').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5; }); ok(fit, '⑩ 모바일: 창이 화면 안에');
    await q.screenshot({ path: 'dev/out/pg_mobile.png' });
    await q.tap('#pw-grid .pw-c[data-id="king_bugbear"]'); await q.waitForTimeout(200); ok(await q.evaluate(() => /킹 버그베어/.test(document.getElementById('pw-sel').textContent) && !PCG.locked('king_bugbear')), '⑩ 모바일: 카드 톡 → 고르기 (자물쇠는 정보 칸 버튼으로)'); await q.tap('#pw-sel [data-a="put"]'); await q.waitForTimeout(400); ok(await q.evaluate(() => PCG.cur() === 'pc_king_bugbear'), '⑩ 모바일: 카드 톡 → [변신 칸에 넣기]');
    await q.tap('#pw-synb .pw-mt[data-g="희귀"]'); await q.waitForTimeout(150); for (let i = 0; i < 4; i++) await q.tap('#pw-grid .pw-c[data-id="dark_elf"]'); await q.waitForTimeout(200); ok(await q.evaluate(() => PCG.tray().n.dark_elf === 4), '⑩ 모바일: 톡으로 합성 재료 고르기');
    await q.screenshot({ path: 'dev/out/pg_mobile_tray.png' }); await m.close(); }
  ok(errs.length === 0, '⑪ 오류 없음' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log(fails ? `실패 ${fails}개` : '모두 통과'); await b.close(); })();
