// 변신 카드 2차 2단계 테스트 — 연출·다시 뽑기·자동 뽑기 (KT_PORT=8781 bash dev/runkt.sh dev/tests/polygacha2.js) · 스크린샷 dev/out/pg2_*.png
// ① 11회: 모였다가 펼쳐짐 · 흰(일반·고급)/금빛(희귀 이상, 등급 숨김) 뒷면 · 흰 카드는 바로 뒤집힘 ② 금빛 카드: 카드 비 → 다가오는 카드 → 밀어서 결과 확인(덜 밀면 제자리) → 희귀 파랑 · 영웅 보라 · 전설 금빛+번개+번쩍
// ③ [모두 뒤집기]: 가장 높은 금빛 카드만 전체 화면 연출 · 키보드(Space·Enter) ④ 다 뒤집은 뒤 Space = 같은 뽑기 다시 · 창에서 Space · [다시 뽑기] ⑤ 1회도 같은 흐름
// ⑥ [모션 스킵]: 연출 없이 창에 바로 · 기기에 기억 ⑦ [자동 뽑기]: 영웅 이상 → 멈춤(까닭) · 골드 모자람 → 멈춤 · 연출 켠 채로도 ⑧ 직접 합성 연출: 큰 카드 · 횟수만큼 · 성공/실패 · 천장 보상
// ⑨ 모바일(가로 · 터치) 화면 ⑩ 연출 중 프레임 ⑪ 오류 없음
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
const ready = p => p.waitForFunction(() => PCG.ov() && PCG.ov().ready, null, { timeout: 8000 });
async function slide(p, frac) { const kb = await p.locator('#pcg-big .ef-knob').boundingBox(), tb = await p.locator('#pcg-big .ef-track').boundingBox(); const x0 = kb.x + kb.width / 2, y = kb.y + kb.height / 2, dx = (tb.x + tb.width - kb.width / 2 - 4 - x0) * frac;
  await p.mouse.move(x0, y); await p.mouse.down(); for (let i = 1; i <= 12; i++) { await p.mouse.move(x0 + dx * i / 12, y); await p.waitForTimeout(16); } await p.mouse.up(); }
(async () => { const b = await chromium.launch(); const errs = []; const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push('A: ' + e.message));
  const acc = 'pgb' + Date.now() % 1e7; await login(p, { acc, cls: 'knight', name: 'pgB' + Date.now() % 1e4 });
  const coins = () => p.evaluate(() => __T.coins), lastLog = () => p.evaluate(() => { const l = __T.log.slice(-1)[0] || {}; return l.t || l.text || ''; });
  const FPS = () => p.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else r(n); }; requestAnimationFrame(f); }));
  await p.evaluate(() => { __T.setCoins(50000000); __T.hero.lv = 52; PCG.setSkip(false); PCG.openWin(); }); await p.waitForTimeout(400); const fps0 = await FPS(); console.log('창만 열었을 때 프레임/초', fps0);
  // ① 11회 (정해 둔 결과: 일반·고급 8장 · 희귀 1 · 영웅 1 · 전설 1)
  const F11 = ['goblin', 'werewolf', 'dark_elf', 'orc', 'lizardman', 'king_bugbear', 'dwarf', 'scorpion', 'deathknight', 'hobgoblin', 'roba_orc'];
  await p.evaluate(F => PCG._force(F), F11); await p.click('#pw-d11'); await p.waitForTimeout(600);
  { const g = await p.evaluate(() => { const d = document.querySelector('#pcg-ovl .pcg-deck').getBoundingClientRect(), cx = d.left + d.width / 2, cy = d.top + d.height / 2; return [...document.querySelectorAll('#pcg-ovl .pcg-c')].map(e => { const r = e.getBoundingClientRect(); return Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy); }); });
    await p.screenshot({ path: 'dev/out/pg2_gather.png' }); ok(g.length === 11 && Math.max(...g) < 60, '① 처음엔 카드가 가운데로 모임 (중심에서 최대 ' + Math.round(Math.max(...g)) + 'px)'); }
  await ready(p); await p.waitForTimeout(100);
  { const v = await p.evaluate(() => { const cs = [...document.querySelectorAll('#pcg-ovl .pcg-c')]; const pos = cs.map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; }); const bk = cs.map(e => ({ y: e.classList.contains('y'), g: +e.className.match(/g(\d)/)[1], bc: getComputedStyle(e.querySelector('.pcg-bk')).borderTopColor })); return { pos, bk }; });
    ok(new Set(v.pos.map(x => x.join(','))).size === 11, '① 11장으로 펼쳐짐 (6 + 5)'); await p.screenshot({ path: 'dev/out/pg2_deck.png' });
    ok(v.bk.every(x => x.y === (x.g >= 2)), '① 일반·고급 = 흰 뒷면 · 희귀·영웅·전설 = 금빛 뒷면');
    const gold = v.bk.filter(x => x.y).map(x => x.bc), white = v.bk.filter(x => !x.y).map(x => x.bc); ok(new Set(gold).size === 1 && new Set(white).size === 1 && gold[0] !== white[0], `① 금빛 뒷면 테두리는 등급과 상관없이 같음 (희귀·영웅·전설 모두 ${gold[0]})`); }
  // 흰 카드는 바로
  await p.click('#pcg-ovl .pcg-c[data-i="0"]'); await p.waitForTimeout(700); ok(await p.evaluate(() => document.querySelector('#pcg-ovl .pcg-c[data-i="0"]').classList.contains('open') && !PCG.ov().seq), '① 흰 카드(고블린) 누르면 바로 뒤집힘');
  // ② 금빛 카드(다크엘프 · 희귀) → 전체 화면
  await p.click('#pcg-ovl .pcg-c[data-i="2"]'); await p.waitForTimeout(900); ok((await p.evaluate(() => PCG.ov().seq)) === 'rain', '② 금빛 카드 → 전체 화면 카드 비'); await p.screenshot({ path: 'dev/out/pg2_rain.png' });
  { const fps = await FPS(); console.log('카드 비 프레임/초', fps); ok(fps >= Math.min(50, fps0), `⑩ 카드 비 연출 ${fps}fps (게임 화면만 ${fps0}fps보다 느리지 않음 · 결과 화면이 덮는 동안 게임 화면은 안 그림)`); }
  await p.waitForFunction(() => PCG.ov().seq === 'zoom', null, { timeout: 5000 }); await p.waitForTimeout(450); await p.screenshot({ path: 'dev/out/pg2_zoom.png' }); ok(true, '② 약 3초 뒤 카드 한 장이 다가옴');
  await p.waitForFunction(() => PCG.ov().seq === 'slide', null, { timeout: 4000 }); ok(await p.evaluate(() => !document.querySelector('#pcg-big .pcg-sl').hidden && /밀어서 결과 확인/.test(document.querySelector('#pcg-big .ef-hint').textContent)), '② [밀어서 결과 확인] 손잡이');
  await slide(p, 0.6); await p.waitForTimeout(400); ok((await p.evaluate(() => PCG.ov().seq)) === 'slide' && !(await p.evaluate(() => document.querySelector('#pcg-big .pcg-zc').classList.contains('open'))), '② 끝까지 안 밀고 놓으면 제자리 (안 열림)');
  await slide(p, 1.05); await p.waitForTimeout(500); { const r = await p.evaluate(() => ({ s: PCG.ov().seq, r2: document.getElementById('pcg-big').classList.contains('r2'), open: document.querySelector('#pcg-big .pcg-zc').classList.contains('open'), sh: getComputedStyle(document.querySelector('#pcg-big .pcg-zc .pcg-fr')).boxShadow }));
    ok(r.s === 'rev' && r.r2 && r.open && /63, 155, 255/.test(r.sh), '② 끝까지 밀면 열림 · 희귀 = 파란 빛 테두리'); }
  await p.waitForTimeout(700); await p.screenshot({ path: 'dev/out/pg2_rev_rare.png' }); await p.click('#pcg-big .pcg-bok'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !PCG.ov().seq && document.querySelector('#pcg-ovl .pcg-c[data-i="2"]').classList.contains('open')), '② [확인] → 덱의 그 카드가 앞면으로');
  // ③ 모두 뒤집기: 가장 높은 금빛(전설 데스나이트 · 9번째)만 전체 화면
  await p.click('#pcg-all'); await p.waitForTimeout(1400); { const v = await p.evaluate(() => ({ s: PCG.ov().seq, open: [...document.querySelectorAll('#pcg-ovl .pcg-deck .pcg-c')].filter(e => e.classList.contains('open')).map(e => +e.dataset.i), t: document.querySelector('#pcg-big .pcg-zc .pcg-fr').textContent }));
    ok(v.s && v.open.length === 10 && !v.open.includes(8) && /데스나이트/.test(v.t), `③ [모두 뒤집기] → 나머지 10장은 바로 · 전설(데스나이트) 1장만 전체 화면 (${v.s})`);
    ok(await p.evaluate(() => document.querySelector('#pcg-ovl .pcg-c[data-i="5"]').classList.contains('open') && getComputedStyle(document.querySelector('#pcg-ovl .pcg-c[data-i="5"] .pcg-fr')).borderTopWidth === '3px'), '③ 영웅(킹 버그베어)은 연출 없이 뒤집히고 보라 빛 (두꺼운 테두리)'); }
  // 키보드: Space = 건너뛰기 → 손잡이 → 열기
  await p.keyboard.press('Space'); await p.waitForTimeout(300); await p.keyboard.press('Space'); await p.waitForTimeout(300); ok((await p.evaluate(() => PCG.ov().seq)) === 'slide', '③ Space로 카드 비·다가오기 건너뛰기');
  await p.keyboard.press('Space'); await p.waitForTimeout(350); await p.screenshot({ path: 'dev/out/pg2_rev_legend_flash.png' }); await p.waitForTimeout(900);
  { const r = await p.evaluate(() => ({ r4: document.getElementById('pcg-big').classList.contains('r4'), bolt: !!document.querySelector('#pcg-big .pcg-zc .pcg-bolt'), b: getComputedStyle(document.querySelector('#pcg-big .pcg-zc .pcg-fr')).borderTopColor }));
    ok(r.r4 && r.bolt && r.b === 'rgb(255, 211, 106)', '② 전설 = 금빛 테두리 · 금빛 번개 · 번쩍'); }
  await p.screenshot({ path: 'dev/out/pg2_rev_legend.png' }); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  { const v = await p.evaluate(() => ({ o: PCG.ov(), re: !document.getElementById('pcg-re').hidden, sum: document.getElementById('pcg-sum').textContent, bolt: !!document.querySelector('#pcg-ovl .pcg-c[data-i="8"] .pcg-bolt') }));
    ok(v.o.open === 11 && v.re && /새 카드/.test(v.sum) && v.bolt, '③ 다 뒤집으면 요약 · [다시 뽑기] · 덱의 전설 카드에도 번개'); await p.screenshot({ path: 'dev/out/pg2_all.png' }); }
  // ④ 결과 화면에서 Space = 같은 11회 다시
  { const c0 = await coins(), d0 = await p.evaluate(() => PCG.state().draws); await p.keyboard.press('Space'); await p.waitForTimeout(600);
    ok(c0 - await coins() === 500000 && await p.evaluate(() => PCG.state().draws) === d0 + 11 && (await p.evaluate(() => PCG.ov() && PCG.ov().n)) === 11, '④ 다 뒤집은 뒤 Space → 같은 11회 다시 (500,000)');
    await ready(p); await p.evaluate(() => PCG.close()); await p.waitForTimeout(200);
    const c1 = await coins(); await p.evaluate(() => document.activeElement && document.activeElement.blur()); await p.keyboard.press('Space'); await p.waitForTimeout(500);
    ok(c1 - await coins() === 500000 && !!(await p.evaluate(() => PCG.ov())), '④ 창에서 Space → 같은 뽑기 (결과 화면 열림)'); await ready(p); await p.evaluate(() => PCG.close());
    await p.focus('#pw-d1'); const c2 = await coins(); await p.keyboard.press('Space'); await p.waitForTimeout(700); ok(c2 - await coins() === 500000, '④ 버튼에 포커스가 있어도 Space는 한 번만 (11회 1번 = 500,000)'); await ready(p); await p.evaluate(() => PCG.close()); }
  // ⑤ 1회: 같은 흐름 (금빛 1장 → 전체 화면 · 영웅 = 보라 두껍게)
  { await p.evaluate(() => PCG._force(['necromancer'])); await p.click('#pw-d1'); await ready(p); ok(await p.evaluate(() => PCG.ov().n === 1 && document.querySelector('#pcg-ovl .pcg-c').classList.contains('y')), '⑤ 1회: 카드 1장 · 금빛 뒷면');
    await p.click('#pcg-ovl .pcg-c'); await p.waitForTimeout(300); await p.keyboard.press('Enter'); await p.keyboard.press('Enter'); await p.waitForTimeout(200); await p.keyboard.press('Enter'); await p.waitForTimeout(900);
    const r = await p.evaluate(() => ({ r3: document.getElementById('pcg-big').classList.contains('r3'), bw: getComputedStyle(document.querySelector('#pcg-big .pcg-zc .pcg-fr')).borderTopWidth, sh: getComputedStyle(document.querySelector('#pcg-big .pcg-zc .pcg-fr')).boxShadow }));
    ok(r.r3 && parseFloat(r.bw) >= 4 && /199, 125, 255/.test(r.sh), `⑤ 영웅 = 보라 빛 (테두리 ${r.bw})`); await p.screenshot({ path: 'dev/out/pg2_rev_hero.png' }); await p.keyboard.press('Enter'); await p.waitForTimeout(300); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    ok(!(await p.evaluate(() => PCG.ov())), '⑤ Enter로 닫힘'); }
  // ⑥ 모션 스킵 (기기에 기억)
  { await p.click('#pw-skip'); ok(await p.evaluate(() => PCG.skip() && localStorage.getItem('aden_pcg_skip') === '1'), '⑥ [모션 스킵] 켜기 → 이 기기에 기억');
    const d0 = await p.evaluate(() => PCG.state().draws); await p.click('#pw-d11'); await p.waitForTimeout(300);
    ok(!(await p.evaluate(() => PCG.ov())) && await p.evaluate(() => PCG.state().draws) === d0 + 11 && await p.evaluate(() => document.querySelectorAll('#pw-res .pw-ri').length) === 11, '⑥ 연출 없이 창 안 최근 결과에 11장 바로');
    await p.screenshot({ path: 'dev/out/pg2_skip.png' }); await p.evaluate(() => document.activeElement && document.activeElement.blur()); await p.keyboard.press('Space'); await p.waitForTimeout(300); ok(await p.evaluate(() => PCG.state().draws) === d0 + 22, '⑥ 모션 스킵에서도 Space = 다시 뽑기'); }
  // ⑦ 자동 뽑기 (모션 스킵): 영웅 이상이 나오면 멈춤
  { await p.evaluate(() => PCG._force(['goblin', 'orc', 'dwarf', 'werewolf', 'spartoi'])); const d0 = await p.evaluate(() => PCG.state().draws); await p.click('#pw-auto'); ok(await p.evaluate(() => PCG.auto()), '⑦ [자동 뽑기] 켜기');
    await p.click('#pw-d1'); await p.waitForFunction(() => !PCG.auto(), null, { timeout: 15000 }).catch(() => {}); const v = await p.evaluate(() => ({ a: PCG.auto(), d: PCG.state().draws, w: PCG.autoWhy(), t: document.getElementById('pw-autowhy').textContent }));
    ok(!v.a && v.d === d0 + 5 && /스파토이/.test(v.w) && /멈췄어요/.test(v.t), `⑦ 1회 자동: 5번째에 영웅(스파토이) → 멈춤 · 까닭 표시 (${v.t})`); await p.screenshot({ path: 'dev/out/pg2_auto_stop.png' }); }
  // ⑦ 골드가 모자라면 멈춤
  { await p.evaluate(() => { __T.setCoins(50000 * 3 + 500); PCG._force(Array(20).fill('goblin')); }); const d0 = await p.evaluate(() => PCG.state().draws); await p.click('#pw-auto'); await p.click('#pw-d1');
    await p.waitForFunction(() => !PCG.auto(), null, { timeout: 15000 }).catch(() => {}); const v = await p.evaluate(() => ({ a: PCG.auto(), d: PCG.state().draws, w: PCG.autoWhy(), c: __T.coins }));
    ok(!v.a && v.d === d0 + 3 && v.c === 500 && /골드가 모자라서/.test(v.w), `⑦ 골드가 다음 값보다 적으면 멈춤 (3번 · 남은 ${v.c} · ${v.w})`); await p.evaluate(() => { __T.setCoins(50000000); PCG._force([]); }); }
  // ⑦ 자동 뽑기 (연출 켬): 희귀까지는 알아서 뒤집고 닫음 → 영웅이 나오면 멈추고 금빛 카드를 남겨 둠
  { await p.click('#pw-skip'); await p.evaluate(() => PCG._force(['goblin', 'dark_elf', 'orc', 'wyvern'])); const d0 = await p.evaluate(() => PCG.state().draws); await p.click('#pw-auto'); await p.click('#pw-d1');
    await p.waitForFunction(() => !PCG.auto(), null, { timeout: 25000 }).catch(() => {}); await ready(p); const v = await p.evaluate(() => ({ a: PCG.auto(), d: PCG.state().draws, o: PCG.ov(), w: PCG.autoWhy() }));
    ok(!v.a && v.d === d0 + 4 && v.o && v.o.open === 0 && /영웅 이상/.test(v.w) && !/와이번/.test(v.w), `⑦ 연출 켠 자동: 3번은 알아서 넘기고 4번째(전설)에서 멈춤 · 이름은 안 알려 줌 (${v.w})`);
    await p.screenshot({ path: 'dev/out/pg2_auto_anim_stop.png' }); await p.click('#pcg-ovl .pcg-c'); await p.waitForTimeout(200); ok((await p.evaluate(() => PCG.ov().seq)) === 'rain', '⑦ 남은 금빛 카드는 직접 전체 화면 연출로'); await p.evaluate(() => PCG.close()); }
  // ⑧ 직접 합성 연출 (큰 카드 · 횟수만큼 · 천장 보상)
  { await p.evaluate(() => { const s = PCG.state(); for (const id of ['dark_elf', 'skeleton_archer', 'bugbear', 'cerberus']) delete s.cards[id]; s.cards.dark_elf = 8; s.cards.bugbear = 4; s.pity.h = 6; PCG.setTray('희귀'); PCG.trayFill(); });
    await p.evaluate(() => { const R = Math.random; Math.random = () => 0.5; try { document.querySelector('#pw-synb [data-a="go"]').click(); } finally { Math.random = R; } }); await p.waitForTimeout(300);
    await p.screenshot({ path: 'dev/out/pg2_syn_deal.png' }); await ready(p); const v = await p.evaluate(() => ({ o: PCG.ov(), w: document.querySelector('#pcg-ovl .pcg-sdeck .pcg-c').getBoundingClientRect().width, y: [...document.querySelectorAll('#pcg-ovl .pcg-sdeck .pcg-c')].every(e => e.classList.contains('y')), icon: document.querySelector('#pw-grid .pw-c') ? document.querySelector('#pw-grid .pw-c').getBoundingClientRect().width : 52 }));
    ok(v.o.k === 'syn' && v.o.n === 3 && v.y, '⑧ 합성 3번 → 금빛 뒷면 카드 3장 (뒤집을 수 있는 수 = 횟수)'); ok(v.w >= v.icon * 3.4, `⑧ 카드 크기 ${Math.round(v.w)}px (보유중 아이콘 ${Math.round(v.icon)}px의 약 ${(v.w / v.icon).toFixed(1)}배)`);
    await p.screenshot({ path: 'dev/out/pg2_syn.png' }); await p.click('#pcg-ovl .pcg-sdeck .pcg-c[data-i="0"]'); await p.waitForTimeout(800);
    const a = await p.evaluate(() => ({ t: document.querySelector('#pcg-ovl .pcg-sdeck .pcg-c[data-i="0"] .pcg-tag').textContent, n: document.querySelectorAll('#pcg-ovl .pcg-sdeck > .pcg-c').length, pt: document.querySelector('#pcg-ovl .pcg-sdeck .pcg-c.pt .pcg-tag') && document.querySelector('#pcg-ovl .pcg-sdeck .pcg-c.pt').textContent }));
    ok(/실패/.test(a.t) && a.n === 4 && /천장 보상/.test(a.pt || '') && /영웅/.test(a.pt || ''), '⑧ 뒤집으면 실패(돌려받은 희귀) · 7번째 연속 실패라 천장 보상 영웅 카드가 옆에 한 장 더');
    await p.click('#pcg-all'); await p.waitForTimeout(900); ok(await p.evaluate(() => PCG.ov().open === 3 && /성공 0 · 실패 3 · 천장 1/.test(document.getElementById('pcg-sum').textContent)), '⑧ [모두 뒤집기] → 요약 (성공 0 · 실패 3 · 천장 1)');
    await p.screenshot({ path: 'dev/out/pg2_syn_open.png' }); await p.click('#pcg-ok'); await p.waitForTimeout(200); ok(!(await p.evaluate(() => PCG.ov())) && await p.evaluate(() => /천장/.test(document.getElementById('pw-res').textContent)), '⑧ 닫으면 창의 최근 결과에 남음');
    // 성공 카드
    await p.evaluate(() => { const s = PCG.state(); for (const id of ['dark_elf', 'skeleton_archer', 'bugbear', 'cerberus']) delete s.cards[id]; s.cards.dark_elf = 4; PCG.setTray('희귀'); PCG.trayFill(); }); await p.evaluate(() => { const R = Math.random; Math.random = () => 0.01; try { document.querySelector('#pw-synb [data-a="go"]').click(); } finally { Math.random = R; } }); await ready(p);
    await p.click('#pcg-ovl .pcg-sdeck .pcg-c[data-i="0"]'); await p.waitForTimeout(900); ok(await p.evaluate(() => /성공/.test(document.querySelector('#pcg-ovl .pcg-sdeck .pcg-c[data-i="0"] .pcg-tag').textContent) && /영웅/.test(document.querySelector('#pcg-ovl .pcg-sdeck .pcg-c[data-i="0"] .pcg-gr').textContent)), '⑧ 성공 → 영웅 카드 · [성공!]');
    await p.screenshot({ path: 'dev/out/pg2_syn_ok.png' }); await p.keyboard.press('Enter'); await p.waitForTimeout(200); ok(!(await p.evaluate(() => PCG.ov())), '⑧ Enter로 닫힘');
    await p.evaluate(() => { PCG.setSkip(true); const s = PCG.state(); for (const id of ['dark_elf', 'skeleton_archer', 'bugbear', 'cerberus']) delete s.cards[id]; s.cards.dark_elf = 4; PCG.setTray('희귀'); PCG.trayFill(); }); await p.click('#pw-synb [data-a="go"]'); await p.waitForTimeout(200);
    ok(!(await p.evaluate(() => PCG.ov())) && await p.evaluate(() => /희귀 → 영웅 합성/.test(document.getElementById('pw-res').textContent)), '⑧ 모션 스킵이면 합성 결과도 창에 바로'); await p.evaluate(() => PCG.setSkip(false)); }
  // ⑥ 다시 접속해도 모션 스킵 기억
  { await p.evaluate(() => PCG.setSkip(true)); await p.evaluate(() => __T.SAVE.now(true, true)); await p.goto('http://127.0.0.1:' + (process.env.KT_PORT || 8766) + '/_kt2.html'); await p.waitForSelector('#lg-acc', { state: 'visible' });
    await p.fill('#lg-acc', acc); await p.fill('#lg-pw', 'abcd'); await p.click('#lg-go'); await p.waitForSelector('.cs-card[data-cls="knight"]', { state: 'visible', timeout: 30000 }); await p.click('.cs-card[data-cls="knight"]'); await p.click('#cs-start');
    await p.waitForFunction(() => window.__gameOn && __T.SCENE === 'town', null, { timeout: 30000 }); await p.evaluate(() => PCG.openWin()); await p.waitForTimeout(300);
    ok(await p.evaluate(() => PCG.skip() && document.getElementById('pw-skip').checked && !PCG.auto()), '⑥ 다시 접속: 모션 스킵은 그대로 · 자동 뽑기는 꺼진 채'); await p.evaluate(() => PCG.setSkip(false)); }
  // ⑨ 모바일 (가로 844×390 · 터치)
  { const m = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); const q = await m.newPage(); q.on('pageerror', e => errs.push('mob: ' + e.message));
    await login(q, { cls: 'elf', name: 'pgM' + Date.now() % 1e4, init: () => { try { localStorage.setItem('aden_mob', '1'); localStorage.setItem('aden_pcg_skip', '0'); } catch (e) {} } });
    await q.evaluate(() => { __T.setCoins(5000000); __T.hero.lv = 52; PCG.openWin(); PCG._force(['goblin', 'werewolf', 'dark_elf', 'orc', 'lizardman', 'king_bugbear', 'dwarf', 'scorpion', 'kaspar', 'hobgoblin', 'roba_orc']); }); await q.waitForTimeout(300);
    await q.screenshot({ path: 'dev/out/pg2_mobile_win.png' }); await q.tap('#pw-d11'); await ready(q);
    const fit = await q.evaluate(() => [...document.querySelectorAll('#pcg-ovl .pcg-c')].every(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; }) && (() => { const r = document.getElementById('pcg-ok').getBoundingClientRect(); return r.bottom <= innerHeight; })());
    ok(fit, '⑨ 모바일: 11장·버튼이 화면 안에'); await q.screenshot({ path: 'dev/out/pg2_mobile_deck.png' });
    await q.tap('#pcg-ovl .pcg-c[data-i="0"]'); await q.waitForTimeout(700); ok(await q.evaluate(() => document.querySelector('#pcg-ovl .pcg-c[data-i="0"]').classList.contains('open')), '⑨ 모바일: 톡 → 뒤집힘');
    await q.tap('#pcg-ovl .pcg-c[data-i="8"]'); await q.waitForTimeout(400); await q.tap('#pcg-big canvas', { force: true }).catch(() => {}); await q.waitForTimeout(300); await q.tap('#pcg-big canvas', { force: true }).catch(() => {}); await q.waitForTimeout(400);
    ok((await q.evaluate(() => PCG.ov().seq)) === 'slide', '⑨ 모바일: 톡으로 카드 비 건너뛰기 → 손잡이'); const sl = await q.evaluate(() => { const r = document.querySelector('#pcg-big .pcg-sl').getBoundingClientRect(), z = document.querySelector('#pcg-big .pcg-zc').getBoundingClientRect(); return r.bottom <= innerHeight && z.top >= 0 && z.bottom <= r.top + 4; });
    ok(sl, '⑨ 모바일: 카드와 손잡이가 겹치지 않고 화면 안에'); await q.screenshot({ path: 'dev/out/pg2_mobile_seq.png' });
    await slide(q, 1.05); await q.waitForTimeout(1300); ok((await q.evaluate(() => PCG.ov().seq)) === 'rev', '⑨ 모바일: 밀어서 열기'); await q.screenshot({ path: 'dev/out/pg2_mobile_rev.png' });
    await q.tap('#pcg-big .pcg-bok'); await q.waitForTimeout(300); await q.tap('#pcg-all'); await q.waitForTimeout(1500); await q.evaluate(() => PCG.close()); await q.waitForTimeout(300);
    await q.evaluate(() => { const s = PCG.state(); s.cards.dark_elf = 12; PCG.setTray('희귀'); PCG.trayFill(); }); await q.evaluate(() => { const R = Math.random; Math.random = () => 0.5; try { document.querySelector('#pw-synb [data-a="go"]').click(); } finally { Math.random = R; } }); await ready(q);
    const sf = await q.evaluate(() => [...document.querySelectorAll('#pcg-ovl .pcg-sdeck .pcg-c')].every(e => { const r = e.getBoundingClientRect(); return r.right <= innerWidth && r.bottom <= innerHeight; })); ok(sf, '⑨ 모바일: 합성 카드 3장이 화면 안에');
    await q.tap('#pcg-ovl .pcg-sdeck .pcg-c[data-i="1"]'); await q.waitForTimeout(800); await q.screenshot({ path: 'dev/out/pg2_mobile_syn.png' }); await m.close(); }
  ok(errs.length === 0, '⑪ 오류 없음' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log(fails ? `실패 ${fails}개` : '모두 통과'); await b.close(); })();
