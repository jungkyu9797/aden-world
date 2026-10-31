// 전설 무기 3종 (진명황의 집행검 · 가이아의 격노 · 수정결정체 지팡이) + 전설 칸 효과 테스트
//   python3 dev/mkkt.py && bash dev/runkt.sh dev/tests/legitem.js   (스크린샷·GIF 재료: dev/out/legitem_*)
const { chromium } = require('playwright'); const login = require('../tq.js'); const fs = require('fs'); const path = require('path');
const OUT = path.join(__dirname, '..', 'out'); const ok = [], bad = []; const chk = (c, m) => (c ? ok : bad).push(m);
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'legT' });
  // 1) 아이템 데이터: 전설 · 직업 제한 · 드랍표에 없음
  const D = await p.evaluate(() => { const I = __T.ITEMS, ids = ['lg_sword', 'lg_bow', 'lg_staff'];
    const inDrop = id => Object.values(__T.DROP_TABLE).some(L => L.some(r => r[0] === id)) || Object.values(__T.MOB_DROPS).some(L => L.some(r => r[0] === id));
    return ids.map(id => { const d = I[id]; return d && { id, name: d.name, rar: d.rar, cls: d.cls, wtype: d.wtype, slot: d.slot, lv: d.lv, dmg: d.dmg, icon: !!__T.CXI[d.icon] && /<path/.test(__T.CXI[d.icon]), drop: inDrop(id), opt: d.optTxt }; }); });
  const want = { lg_sword: ['진명황의 집행검', 'knight', 'sword'], lg_bow: ['가이아의 격노', 'elf', 'bow'], lg_staff: ['수정결정체 지팡이', 'wizard', 'staff'] };
  for (const d of D) { const w = d && want[d.id]; chk(d && d.name === w[0] && d.rar === '전설' && d.slot === 'weapon' && d.wtype === w[2] && JSON.stringify(d.cls) === JSON.stringify([w[1]]), `데이터 ${d && d.id}: ${d && d.name} [${d && d.rar}] ${d && d.cls} ${d && d.wtype} 공격 ${d && d.dmg}`); chk(d && d.icon, `아이콘 ${d && d.id}`); chk(d && !d.drop, `드랍표에 없음 ${d && d.id}`); }
  console.log(JSON.stringify(D.map(d => [d.name, d.lv, d.dmg, d.opt.join(' · ')])));
  // 2) 갓 모드 [아이템 지급] → [전설] 탭에서 3종 받기
  await p.evaluate(() => { const gp = document.getElementById('godpanel'); gp.hidden = false; document.getElementById('gp-lv').value = 55; document.getElementById('gp-apply').click(); document.querySelector('#gp-tabs [data-k="0"]').click(); });
  const gpN = await p.evaluate(() => [document.querySelector('#gp-tabs [data-k="0"]').textContent, [...document.querySelectorAll('#gp-list [data-id]')].map(x => x.dataset.id)]);
  chk(gpN[0] === '전설' && ['lg_sword', 'lg_bow', 'lg_staff'].every(id => gpN[1].includes(id)) && gpN[1].length === 3, `갓 모드 [전설] 탭: ${gpN[1].join(',')}`);
  await p.evaluate(() => { for (const b of document.querySelectorAll('#gp-list [data-id]')) b.click(); document.getElementById('godpanel').hidden = true; });
  chk(await p.evaluate(() => ['lg_sword', 'lg_bow', 'lg_staff'].every(id => __T.INV.count(id) === 1)), '가방에 3종 1개씩');
  // 3) 착용: 자기 직업만 (갓 모드 아님)
  const EQ = await p.evaluate(() => { const T = __T, I = T.INV, r = {}; const e = id => I.bag().find(x => x.id === id);
    for (const [cls, own] of [['knight', 'lg_sword'], ['elf', 'lg_bow'], ['wizard', 'lg_staff']]) { T.setCls_(cls); r[cls] = {};
      for (const id of ['lg_sword', 'lg_bow', 'lg_staff']) { const x = e(id); if (x.on) I.use(x); I.use(x); r[cls][id] = I.equipped('weapon') === id; if (x.on) I.use(x); } }
    T.setCls_('knight'); I.use(e('lg_sword')); return r; });
  for (const [cls, own] of [['knight', 'lg_sword'], ['elf', 'lg_bow'], ['wizard', 'lg_staff']]) for (const id of ['lg_sword', 'lg_bow', 'lg_staff']) chk(EQ[cls][id] === (id === own), `${cls} ${id} 착용 ${EQ[cls][id] ? '됨' : '안 됨'}`);
  // 4) 강화: 무기 마법 주문서 +1 → 공격 +4 (전설 강화 1당 +4) · 안전 강화 +6
  const EN = await p.evaluate(() => { const I = __T.INV, x = I.bag().find(e => e.id === 'lg_sword'); I.add('scroll_weapon', 5, true); const d0 = I.dmg();
    for (let k = 0; k < 3; k++) { I.use(I.bag().find(e => e.id === 'scroll_weapon')); I.applyScroll(x); } const d1 = I.dmg(); return { en: x.en, d0, d1, tip: I.tipOf(x), safe: __T.SAFE_EN(__T.ITEMS.lg_sword), mul: __T.enBonus(__T.ITEMS.lg_sword, 1) }; });
  chk(EN.en === 3 && EN.d1[0] - EN.d0[0] === 12 && EN.mul === 4 && EN.safe === 6, `강화 +${EN.en} · 공격 ${EN.d0.join('~')} → ${EN.d1.join('~')} · 강화 1당 +${EN.mul} · 안전 +${EN.safe}`);
  chk(/전설 · 강화 1당 공격 \+4/.test(EN.tip), '툴팁에 전설 강화 수치');
  // 5) 인벤토리 칸 효과: 전설 칸(r-4) · 효과 요소(.lg-fx) · 애니메이션 · 장비 칸
  await p.evaluate(() => { __T.INV.add('scroll_weapon', 40, true); __T.INV.add('red_potion', 30, true); for (const id of ['cx_sw6', 'dv_sword', 'dv_bow', 'dv_staff']) __T.INV.add(id, 1, true); if (document.getElementById('invwin').hidden || document.getElementById('charwin').hidden) __T.INV.toggleBoth(); __T.INV.render(); });
  await p.waitForTimeout(400);
  const FX = await p.evaluate(() => { const S = [...document.querySelectorAll('#inv-grid .slot.r-4')], L = S.map(s => s.querySelector('.lg-fx')).filter(Boolean), a = L[0] && getComputedStyle(L[0], '::after'), bb = L[0] && getComputedStyle(L[0].querySelector('b')), eqw = document.getElementById('eq-weapon');
    return { slots: S.length, fx: L.length, sweep: a && a.animationName, star: bb && bb.animationName, pulse: L[0] && getComputedStyle(L[0], '::before').animationName, hero: document.querySelectorAll('#inv-grid .slot.r-3 .lg-fx').length, eq: !!(eqw && eqw.classList.contains('r-4') && eqw.querySelector('.lg-fx')), bg: S[0] && getComputedStyle(S[0]).backgroundImage.slice(0, 40) }; });
  chk(FX.slots === 3 && FX.fx === 3 && FX.hero === 0, `전설 칸 ${FX.slots}개 · 효과 요소 ${FX.fx}개 · 영웅 칸에는 없음(${FX.hero})`);
  chk(FX.sweep === 'lgSweep' && FX.star === 'lgStar' && FX.pulse === 'lgPulse', `애니메이션 ${FX.pulse}/${FX.sweep}/${FX.star}`);
  chk(FX.eq, '장비 칸(무기)에도 전설 효과'); console.log('bg', FX.bg);
  // 6~7) 스크린샷: 인벤토리(확대) · 장비 칸 · 아이템 정보 3종 · 캐릭터 모습(전설 빛)
  fs.mkdirSync(OUT, { recursive: true });
  { const r = await p.evaluate(() => { const q = document.getElementById('eq-weapon').getBoundingClientRect(); return { x: q.left - 60, y: q.top - 60, width: q.width + 120, height: q.height + 120 }; }); await p.screenshot({ path: path.join(OUT, 'legitem_eq.png'), clip: r }); }
  { await p.waitForTimeout(600); const lk = await p.$('#cw-look'); if (lk) await lk.screenshot({ path: path.join(OUT, 'legitem_look.png') }); }   // 캐릭터 창 미리보기: 전설 무기 빛 (안전 강화 아래라 기본 단계 10)
  const box = await p.evaluate(() => { const g = document.getElementById('inv-grid').getBoundingClientRect(), s = [...document.querySelectorAll('#inv-grid .slot')].slice(0, 16).map(x => x.getBoundingClientRect()); const r = s.reduce((a, q) => ({ l: Math.min(a.l, q.left), t: Math.min(a.t, q.top), r: Math.max(a.r, q.right), b: Math.max(a.b, q.bottom) }), { l: 1e9, t: 1e9, r: 0, b: 0 }); return { x: r.l - 4, y: r.t - 4, width: r.r - r.l + 8, height: r.b - r.t + 8 }; });
  await p.screenshot({ path: path.join(OUT, 'legitem_inv.png'), clip: box });
  const win = await p.evaluate(() => { const r = document.getElementById('invwin').getBoundingClientRect(); return { x: Math.max(0, r.left), y: Math.max(0, r.top), width: Math.min(r.width, 1280 - r.left), height: Math.min(r.height, 800 - r.top) }; });
  await p.screenshot({ path: path.join(OUT, 'legitem_invwin.png'), clip: win });
  // GIF 재료: 전설 칸 애니메이션을 멈추고 0.1초씩 넘기며 30장 (3초 · 스크린샷 속도와 상관없이 고른 간격) → ffmpeg로 dev/out/legitem_inv.gif
  const nA = await p.evaluate(() => { window.__LGA = document.getAnimations().filter(a => /^lg/.test(a.animationName || '')).map(a => [a, a.currentTime]); for (const [a] of __LGA) a.pause(); return __LGA.length; });
  chk(nA >= 12, `전설 애니메이션 ${nA}개 (칸마다 맥박·빛줄기·별빛 2)`);
  for (let f = 0; f < 30; f++) { await p.evaluate(f => { for (const [a, t0] of __LGA) a.currentTime = t0 + f * 100; }, f); await p.screenshot({ path: path.join(OUT, `legitem_f${String(f).padStart(2, '0')}.png`), clip: box }); }
  await p.evaluate(() => { for (const [a] of __LGA) a.play(); });
  for (const id of ['lg_sword', 'lg_bow', 'lg_staff']) { await p.evaluate(id => { const e = __T.INV.bag().find(x => x.id === id); __T.INV.showDetail(e, 700, 120); }, id); await p.waitForTimeout(250);
    const r = await p.evaluate(() => { const w = document.getElementById('itemwin'), q = w.getBoundingClientRect(); return { hidden: w.hidden, fx: !!w.querySelector('.iw-ic.r-4 .lg-fx'), txt: w.innerText.slice(0, 400), box: { x: q.left, y: q.top, width: q.width, height: Math.min(q.height, 800 - q.top) } }; });
    chk(!r.hidden && r.fx, `아이템 정보 ${id}: 창 열림 · 아이콘 효과`); console.log('---', id, '\n' + r.txt.replace(/\n+/g, ' / '));
    await p.screenshot({ path: path.join(OUT, `legitem_tip_${id.slice(3)}.png`), clip: r.box }); await p.evaluate(() => __T.INV.hideDetail()); }
  // 8) 도감: 전설 카드 아이콘 효과
  const CX = await p.evaluate(() => { document.getElementById('btn-codex').click(); const s = document.getElementById('cdx-rar'); s.value = '전설'; s.dispatchEvent(new Event('change')); s.dispatchEvent(new Event('input')); return [...document.querySelectorAll('#cdx-list .cdx-card')].filter(c => c.querySelector('.cdx-ic.r-4 .lg-fx')).length; });
  chk(CX >= 3, `도감 전설 카드 ${CX}개`);
  await p.evaluate(() => document.getElementById('btn-codex').click());
  // 9) 움직임 줄이기(prefers-reduced-motion): 애니메이션 멈춤 · 파란 바탕은 그대로
  await p.emulateMedia({ reducedMotion: 'reduce' });
  const RM = await p.evaluate(() => { const L = document.querySelector('#inv-grid .slot.r-4 .lg-fx'); return L ? [getComputedStyle(L, '::after').animationName, getComputedStyle(L.querySelector('b')).animationName, getComputedStyle(L.parentElement).backgroundImage.startsWith('radial')] : null; });
  chk(RM && RM[0] === 'none' && RM[1] === 'none' && RM[2], `움직임 줄이기: 애니메이션 ${RM && RM.slice(0, 2).join('/')} · 바탕 유지 ${RM && RM[2]}`);
  await p.emulateMedia({ reducedMotion: 'no-preference' });
  chk(!errs.length, '페이지 오류 없음' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(ok.map(m => 'OK  ' + m).join('\n')); if (bad.length) console.log(bad.map(m => 'BAD ' + m).join('\n'));
  console.log(bad.length ? `FAIL ${bad.length}/${ok.length + bad.length}` : `PASS ${ok.length}/${ok.length}`); await b.close(); })();
