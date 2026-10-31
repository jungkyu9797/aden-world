// 변신 뽑기 결과 연출 v3(TGFX) 테스트 (KT_PORT=8782 bash dev/runkt.sh dev/tests/polygacha3.js) · 스크린샷 dev/out/pg3_*.png
// ① 11회: 홀에 카드 뒷면 11장 · 희귀 이상 금빛 ② [모두 열기] = 일반·고급만 · 금빛 남음 → 버튼 '다음 열기' ③ 금빛 카드 누르기 → 개별 연출 → 건너뛰기·돌아오기
// ④ [다음 열기] → 마지막 금빛 · 다 열면 [확인] · 전설 공지 ⑤ Space = 다시 뽑기 ⑥ 1회 ⑦ 자동 뽑기(연출 없이 닫힘) ⑧ 모바일 크기 ⑨ 오류 없음
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
const st = p => p.evaluate(() => PCG.ov());
(async () => { const b = await chromium.launch(); const errs = []; const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await login(p, { acc: 'pg3' + Date.now() % 1e7, cls: 'knight', name: 'pg3' + Date.now() % 1e4 });
  await p.evaluate(() => { __T.setCoins(50000000); __T.hero.lv = 52; PCG.setSkip(false); PCG.openWin(); }); await p.waitForTimeout(400);
  const F11 = ['goblin', 'werewolf', 'dark_elf', 'orc', 'lizardman', 'king_bugbear', 'dwarf', 'scorpion', 'deathknight', 'hobgoblin', 'roba_orc'];
  await p.evaluate(F => PCG._force(F), F11); await p.click('#pw-d11'); await p.waitForTimeout(1200); await p.screenshot({ path: 'dev/out/pg3_rise.png' });
  await p.waitForFunction(() => PCG.ov() && PCG.ov().tg && PCG.ov().tg.ready, null, { timeout: 8000 }); await p.waitForTimeout(500);
  let s = await st(p); ok(s.tg && s.tg.n === 11 && s.tg.low === 8 && s.tg.high === 3, `① 카드 11장 세워짐 (닫힌 일반·고급 ${s.tg.low} · 금빛 ${s.tg.high})`);
  ok(await p.evaluate(() => !document.getElementById('pcg-all').hidden && document.getElementById('pcg-all').textContent === '모두 열기'), '① [모두 열기] 버튼');
  { const fps = await p.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else r(n); }; requestAnimationFrame(f); })); ok(fps >= 30, `① 카드 11장 홀 ${fps}fps (헤드리스)`); } await p.screenshot({ path: 'dev/out/pg3_hall.png' });
  await p.click('#pcg-all'); await p.waitForTimeout(1800); s = await st(p);
  ok(s.tg.low === 0 && s.tg.high === 3 && !s.tg.cine && s.open === 8, `② 모두 열기 → 일반·고급 8장만 뒤집힘 · 금빛 3장 그대로 (열림 ${s.open})`);
  ok(await p.evaluate(() => document.getElementById('pcg-all').textContent === '다음 열기' && /빛나는 카드/.test(document.getElementById('pcg-sum').textContent)), '② 버튼이 [다음 열기] · 안내 문구');
  await p.screenshot({ path: 'dev/out/pg3_lowopen.png' });
  // ③ 금빛 카드 직접 누르기 (캔버스 좌표)
  const xy = await p.evaluate(() => { const S = document.querySelector('#pcg-ovl canvas').getBoundingClientRect(); const G = window.__tgG; return null; });
  const pt = await p.evaluate(() => { const cv = document.querySelector('#pcg-ovl canvas'), r = cv.getBoundingClientRect(); const G = PCG._tg(); const c = G.cards.find(c => c.high && !c.opened && c.res.grade === 'rare'); const q = c.rect; return [r.left + (q[0] + q[2] / 2) / 1280 * r.width, r.top + (q[1] + q[3] / 2) / 720 * r.height]; });
  await p.mouse.click(pt[0], pt[1]); await p.waitForTimeout(2200); s = await st(p); ok(s.tg.cine, '③ 금빛 카드 누르면 개별 연출'); ok(await p.evaluate(() => document.getElementById('pcg-tgbar').classList.contains('hid')), '③ 연출 중엔 버튼 줄 숨김');
  await p.screenshot({ path: 'dev/out/pg3_charge.png' });
  await p.waitForTimeout(1300); await p.screenshot({ path: 'dev/out/pg3_crack.png' });
  await p.keyboard.press('Space'); await p.waitForTimeout(1800); await p.screenshot({ path: 'dev/out/pg3_reveal_rare.png' }); s = await st(p); ok(s.tg.cine && s.tg.cineDone, '③ Space = 카드 공개로 건너뛰기');
  await p.mouse.click(640, 400); await p.waitForTimeout(700); s = await st(p); ok(!s.tg.cine && s.tg.high === 2 && s.open === 9, '③ 한 번 더 누르면 홀로 · 그 카드는 열림');
  // ④ 다음 열기 ×2 (영웅 → 전설) — 전설은 끝까지 보고 공지
  await p.click('#pcg-all'); await p.waitForTimeout(500); ok((await st(p)).tg.cine, '④ [다음 열기] → 다음 금빛 카드 연출'); await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  s = await st(p); ok(!s.tg.cine && s.tg.high === 1 && !!(await p.evaluate(() => document.getElementById('pcg-ovl') && !document.getElementById('pcg-ovl').hidden)), '④ 연출 중 Esc = 그 연출만 끝내고 홀로 (창은 그대로)');
  console.log('  before legend', JSON.stringify(await st(p))); await p.click('#pcg-all'); await p.waitForTimeout(400); { const fps = await p.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else r(n); }; requestAnimationFrame(f); })); ok(fps >= 25, `④ 개별 연출 중 ${fps}fps`); } await p.waitForTimeout(1700); await p.screenshot({ path: 'dev/out/pg3_legend_shatter.png' }); await p.waitForTimeout(3200); await p.screenshot({ path: 'dev/out/pg3_reveal_legend.png' });
  await p.mouse.click(640, 400); await p.waitForTimeout(800); s = await st(p);
  ok(s.tg.low + s.tg.high === 0 && s.open === 11, '④ 전부 열림 ' + JSON.stringify(s)); ok(await p.evaluate(() => !document.getElementById('pcg-ok').hidden && document.getElementById('pcg-all').hidden && !document.getElementById('pcg-re').hidden), '④ [나가기]·[다시 뽑기] 나옴');
  { const x = await p.evaluate(() => { const o = document.getElementById('pcg-ok').getBoundingClientRect(), r = document.getElementById('pcg-re').getBoundingClientRect(); return { t: document.getElementById('pcg-ok').textContent, gap: innerWidth - o.right, row: Math.abs(o.bottom - r.bottom), reMid: Math.abs((r.left + r.right) / 2 - innerWidth / 2) }; }); console.log('exit', JSON.stringify(x));
    ok(x.t === '나가기' && x.gap >= 8 && x.gap <= 40 && x.row < 4 && x.reMid < 4, '④ [나가기]는 오른쪽 끝 (다시 뽑기와 같은 줄 · 다시 뽑기는 가운데)'); }
  ok(await p.evaluate(() => /새 카드/.test(document.getElementById('pcg-sum').textContent)), '④ 요약(새 카드 · 마일리지)'); await p.screenshot({ path: 'dev/out/pg3_allopen.png' });
  ok(await p.evaluate(() => __T.log.some(l => /전설.*데스나이트/.test(l.t || l.text || ''))), '④ 전설 공지');
  // ⑤ Space = 다시 뽑기
  const c0 = await p.evaluate(() => __T.coins); await p.keyboard.press('Space'); await p.waitForTimeout(700); s = await st(p);
  ok(s && s.tg && s.n === 11 && (await p.evaluate(() => __T.coins)) === c0 - 500000, '⑤ Space = 11회 다시 뽑기 (500,000 골드)');
  await p.keyboard.press('Escape'); await p.waitForTimeout(500); ok(!(await st(p)), '⑤ Esc = 닫기 (안 연 카드도 받음)');
  // ⑥ 1회 (희귀)
  await p.evaluate(() => PCG._force(['bugbear'])); await p.click('#pw-d1'); await p.waitForFunction(() => PCG.ov() && PCG.ov().tg && PCG.ov().tg.ready, null, { timeout: 8000 }); await p.waitForTimeout(300);
  s = await st(p); ok(s.tg.n === 1 && s.tg.high === 1, '⑥ 1회 = 가운데 1장'); await p.screenshot({ path: 'dev/out/pg3_one.png' });
  await p.click('#pcg-all'); await p.waitForTimeout(300); await p.keyboard.press('Space'); await p.waitForTimeout(1900); await p.mouse.click(640, 400); await p.waitForTimeout(600);
  s = await st(p); ok(s.open === 1 && !s.tg.cine, '⑥ 1회 희귀도 개별 연출 뒤 열림'); await p.keyboard.press('Enter'); await p.waitForTimeout(400); ok(!(await st(p)), '⑥ Enter = 확인');
  // ⑦ 자동 뽑기: 영웅 이상 없으면 연출 없이 뒤집고 닫힘 → 다음
  await p.evaluate(() => { PCG._force(['goblin', 'orc', 'dwarf', 'orc', 'goblin', 'dark_elf', 'dwarf', 'orc', 'goblin', 'werewolf', 'orc', ...Array(11).fill('king_bugbear')]); PCG.setAuto(true); }); await p.click('#pw-d11');
  await p.waitForTimeout(4000); s = await st(p); ok(!s || !s.tg || !s.tg.cine, '⑦ 자동 뽑기 중엔 개별 연출 없음');
  await p.waitForTimeout(6000); const why = await p.evaluate(() => (document.getElementById('pw-autowhy') || {}).textContent || ''); ok(/영웅/.test(why), '⑦ 영웅이 나오면 자동 뽑기 멈춤: ' + why.slice(0, 40));
  if (await st(p)) { await p.keyboard.press('Escape'); await p.waitForTimeout(400); }
  // ⑧ 모바일 크기
  await p.setViewportSize({ width: 844, height: 390 }); await p.evaluate(() => { PCG.setAuto(false); PCG._force(['goblin', 'werewolf', 'dark_elf', 'orc', 'lizardman', 'king_bugbear', 'dwarf', 'scorpion', 'wyvern', 'hobgoblin', 'roba_orc']); }); await p.click('#pw-d11').catch(() => p.evaluate(() => PCG.draw(11)));
  await p.waitForFunction(() => PCG.ov() && PCG.ov().tg && PCG.ov().tg.ready, null, { timeout: 8000 }); await p.waitForTimeout(400); await p.screenshot({ path: 'dev/out/pg3_mobile.png' });
  ok(await p.evaluate(() => { const r = document.getElementById('pcg-all').getBoundingClientRect(); return r.bottom <= innerHeight && r.top > 0; }), '⑧ 모바일 가로 화면에서도 버튼이 화면 안');
  ok(errs.length === 0, '⑨ 오류 없음 ' + errs.slice(0, 3).join(' | '));
  console.log(fails ? `실패 ${fails}개` : '모두 통과'); await b.close(); })();
