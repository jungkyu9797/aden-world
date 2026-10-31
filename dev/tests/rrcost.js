// 11/1 [전설 재뽑기] 버튼에 비용: 전설 없음 300만~1,200만 · 다음 비용 · 여러 카드면 범위 · 3번 다 하면 무료 고르기 · 모자라면 빨강 (KT_PORT=8797 bash dev/runkt.sh dev/tests/rrcost.js) — 스크린샷 dev/out/rrcost*.png
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  for (const vp of [{ width: 1280, height: 800 }, { width: 844, height: 390, mob: 1 }]) {
    const ctx = await b.newContext(vp.mob ? { viewport: { width: vp.width, height: vp.height }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: vp }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); const M = vp.mob ? '모바일: ' : '';
    await login(p, { cls: 'knight', name: 'rc' + (vp.mob ? 'm' : 'p'), init: vp.mob ? () => { try { localStorage.setItem('aden_mob', '1'); } catch (e) {} } : undefined });
    await p.evaluate(() => { __T.setCoins(5000000); __T.hero.lv = 52; PCG.openWin(); }); await p.waitForTimeout(400);
    const st = (cards, rr, slot, coins) => p.evaluate(([cards, rr, slot, coins]) => { const s = PCG.state(); s.cards = Object.assign({}, cards); s.rr = JSON.parse(JSON.stringify(rr || {})); s.lock = {}; s.slot = {}; __T.setCoins(coins); PCG.sync(); if (slot) PCG.setSlot(slot); PCG.renderWin();
      const b = document.getElementById('pw-again'), c = b.querySelector('.pw-rrc'); const sm = [...b.querySelectorAll('small')], bw = b.clientWidth - 12; return { wrap: sm.some(e => { const r = e.getBoundingClientRect(); return r.width > bw + 1 || r.height > parseFloat(getComputedStyle(e).fontSize) * 1.7; }), l3: sm[1] && sm[1].textContent, t: b.textContent, c: c && c.textContent, short: !!(c && c.classList.contains('short')), col: c && getComputedStyle(c).color }; }, [cards, rr, slot, coins]);
    const a = await st({ goblin: 3 }, {}, null, 5e6); console.log(JSON.stringify(a)); ok(M + '전설 없음: 300만~1,200만 골드', a.c === '300만~1,200만 골드' && /전설 카드가 생기면/.test(a.t));
    if (!vp.mob) await p.screenshot({ path: 'dev/out/rrcost_none.png', clip: await p.evaluate(() => { const r = document.getElementById('pw-again').getBoundingClientRect(); return { x: r.left - 6, y: r.top - 6, width: r.width + 12, height: r.height + 12 }; }) });
    const b1 = await st({ deathknight: 1 }, {}, null, 5e6); ok(M + '데스나이트 0번: 300만 골드 · 전설 1장 (' + b1.c + ')', b1.c === '300만 골드' && /전설 1장/.test(b1.t) && !b1.short);
    const b2 = await st({ deathknight: 1 }, {}, null, 1e6); ok(M + '골드 모자라면 빨강 (' + b2.col + ')', b2.short && /255, 138, 122/.test(b2.col));
    const b3 = await st({ deathknight: 1, kaspar: 1 }, { deathknight: [1] }, null, 5e6); ok(M + '1번 한 카드 + 새 카드: 300만~600만 골드 (' + b3.c + ')', b3.c === '300만~600만 골드');
    const b4 = await st({ deathknight: 1 }, { deathknight: [2] }, null, 5e6); ok(M + '2번 한 카드: 1,200만 골드 · 모자라면 빨강', b4.c === '1,200만 골드' && b4.short);
    const b5 = await st({ deathknight: 1 }, { deathknight: [3] }, null, 0); ok(M + '3번 다 한 카드: 무료 고르기 (골드 없어도 빨강 아님) · 전설 1장', b5.c === '무료 고르기' && !b5.short && b5.l3 === '전설 1장');
    const b6 = await st({ deathknight: 1, wyvern: 1 }, { deathknight: [3] }, null, 5e6); ok(M + '무료 + 300만: "300만 골드" + 아랫줄 "+ 무료 고르기" (' + b6.c + ' / ' + b6.l3 + ')', b6.c === '300만 골드' && b6.l3 === '+ 무료 고르기');
    const b7 = await st({ deathknight: 1 }, {}, 'deathknight', 5e6); ok(M + '변신 칸에 있는 1장뿐: 재뽑기 못 하니 기본 안내 (' + b7.c + ')', b7.c === '300만~1,200만 골드');
    ok(M + '어느 경우도 글자가 줄바꿈·넘침 없음', ![a, b1, b2, b3, b4, b5, b6, b7].some(x => x.wrap));
    await st({ deathknight: 1, kaspar: 1 }, { deathknight: [1] }, null, 5e6);
    const sz = await p.evaluate(() => { const b = document.getElementById('pw-again').getBoundingClientRect(), s = document.getElementById('pw-slot').getBoundingClientRect(), c = document.querySelector('#pw-again .pw-rrc'); return { bh: Math.round(b.height), sh: Math.round(s.height), over: c.scrollWidth > c.clientWidth + 1 || c.getBoundingClientRect().width > b.width }; });
    console.log(M, JSON.stringify(sz)); ok(M + '버튼 글자가 넘치지 않음 · 변신 칸과 높이 맞음', !sz.over && Math.abs(sz.bh - sz.sh) <= 2);
    await p.locator('#polywin .pw-bot').screenshot({ path: vp.mob ? 'dev/out/rrcost_mob.png' : 'dev/out/rrcost.png' });
    await st({ deathknight: 1, wyvern: 1 }, { deathknight: [3] }, null, 5e6); await p.locator('#pw-again').screenshot({ path: vp.mob ? 'dev/out/rrcost_free_mob.png' : 'dev/out/rrcost_free.png' }); await st({ deathknight: 1, kaspar: 1 }, { deathknight: [1] }, null, 5e6);
    // 눌러서 목록 → 카드마다 다음 비용 (원래 기능 그대로)
    await p.click('#pw-again'); await p.waitForTimeout(250); ok(M + '버튼 누르면 재뽑기 목록 (다음 300만 · 600만)', await p.evaluate(() => { const t = document.getElementById('polywin').textContent; return /다음 600만/.test(t) && /다음 300만/.test(t); }));
    await ctx.close(); }
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
