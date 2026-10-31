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
  // 4) 강화: 전설은 안전 강화 +0 — +0부터 성공 1/3 · 실패하면 증발 (일반 무기가 안전 강화를 넘었을 때와 같은 판정 · 같은 코드) · 강화 1당 공격 +3 (영웅과 같음)
  const EN = await p.evaluate(() => { const T = __T, I = T.INV, R0 = Math.random, x = I.bag().find(e => e.id === 'lg_sword'); I.add('scroll_weapon', 10, true); const d0 = I.dmg(), asks = [];
    const yes = r => { Math.random = () => r; try { document.getElementById('ask-yes').click(); } finally { Math.random = R0; } };   // 바꾼 Math.random은 바로 되돌림
    const once = (t, r) => { I.use(I.bag().find(e => e.id === 'scroll_weapon')); I.applyScroll(t); const w = document.getElementById('askwin'); asks.push(w.hidden ? '(확인 창 없음)' : document.getElementById('ask-sub').textContent); if (!w.hidden) yes(r); };
    for (let k = 0; k < 3; k++) once(x, 0.1);   // 0.1 < 1/3 → 성공
    const d1 = I.dmg(), tip = I.tipOf(x);
    I.add('lg_sword', 1, true); const y = I.bag().find(e => e.id === 'lg_sword' && e !== x), n0 = I.count('lg_sword'); once(y, 0.9);   // 0.9 ≥ 1/3 → 실패 → 증발
    const failMsg = T.log.slice(-4).map(l => typeof l === 'string' ? l : (l && (l.t || l.text || l.msg)) || JSON.stringify(l)).join(' | ');
    // 장비 강화 창(단일): +0 전설도 '성공 확률 33.3% · 실패하면 장비가 증발해요 (안전 강화 +0)'
    I.add('lg_sword', 1, true); const z = I.bag().find(e => e.id === 'lg_sword' && e !== x); I.bulkOpen(); I.render();
    const zc = [...document.querySelectorAll('#inv-grid .slot')].find(c => (c.dataset.itip || '').startsWith('진명황의 집행검 [전설]')); if (zc) zc.click();
    const rateTxt = (document.getElementById('en-rate') || {}).textContent || ''; I.bulkClose(); I.removeEntry(z); I.render();
    return { en: x.en, d0, d1, tip, asks, safe: T.SAFE_EN(T.ITEMS.lg_sword), safeOld: T.SAFE_EN(T.ITEMS.dv_sword), mul: T.enBonus(T.ITEMS.lg_sword, 1), n0, n1: I.count('lg_sword'), gone: !I.bag().includes(y), failMsg, rateTxt, rnd: Math.random === R0 }; });
  console.log('강화 확인 창:', EN.asks[0], '\n실패 메시지:', EN.failMsg, '\n강화 창:', EN.rateTxt);
  chk(EN.safe === 0 && EN.safeOld === 6, `안전 강화: 전설 +${EN.safe} · 영웅 무기 +${EN.safeOld}`);
  chk(EN.asks.length === 4 && EN.asks.every(t => /안전 강화가 없는 장비입니다\. \(안전 \+0\)/.test(t) && /증발/.test(t)), `+0부터 매번 '증발할 수 있음' 확인 창 (${EN.asks.length}번)`);
  chk(EN.en === 3 && EN.d1[0] - EN.d0[0] === 9 && EN.mul === 3, `강화 성공 +${EN.en} · 공격 ${EN.d0.join('~')} → ${EN.d1.join('~')} · 강화 1당 +${EN.mul}`);
  chk(EN.gone && EN.n1 === EN.n0 - 1 && /증발/.test(EN.failMsg), `+0 강화 실패 → 증발 (집행검 ${EN.n0} → ${EN.n1}개)`);
  chk(/성공 확률 33\.3%/.test(EN.rateTxt) && /증발/.test(EN.rateTxt) && /안전 강화 \+0/.test(EN.rateTxt), `장비 강화 창 +0: ${EN.rateTxt.replace(/\s+/g, ' ').trim()}`);
  chk(/안전 강화 \+0/.test(EN.tip) && /전설 · 강화 1당 공격 \+3/.test(EN.tip), '툴팁: 안전 강화 +0 · 강화 1당 공격 +3');
  chk(/타격 시 16% 확률로 \[심판\] 추가 피해 — 내 피해의 100% \(강화 1당 \+2%\)/.test(EN.tip), '툴팁(+3): 타격 시 16% 확률로 [심판] 추가 피해 — 내 피해의 100% (강화 1당 +2%)');
  chk(EN.rnd, 'Math.random 되돌림 (강화)');
  // 4b) 전설 공통 [심판]: 옵션 · 발동 확률(Math.random 바꿨다가 바로 되돌림) · 심판 피해 = 그 타격 피해 (직업마다) · 장비 이펙트 끔이면 빛기둥 없음
  const OPT = await p.evaluate(() => ['lg_sword', 'lg_bow', 'lg_staff'].map(id => { const d = __T.ITEMS[id]; return [id, d.judgeP, d.judgePct, !!d.proc, d.optTxt.some(t => /^타격 시 10% 확률로 \[심판\] 추가 피해 — 내 피해의 100% \(강화 1당 \+2%/.test(t)), d.judgeEn]; }));
  for (const o of OPT) chk(o[1] === 0.1 && o[2] === 100 && o[5] === 0.02 && !o[3] && o[4], `심판 옵션 ${o[0]}: ${o[1] * 100}% + 강화 1당 ${o[5] * 100}% · 피해의 ${o[2]}% · 옛 발동 없음 ${!o[3]}`);
  const JT = await p.evaluate(() => { const T = __T, I = T.INV, H = T.HERO, R0 = Math.random, out = {};
    const mk = (di, dj) => { const m = T.mkMob('dummy50', H.i + di, H.j + dj); m.aggro = false; T.foxes.push(m); return m; };
    const wear = (cls, id) => { T.setCls_(cls); const x = I.bag().find(e => e.id === id); if (!x.on) I.use(x); return I.equipped('weapon') === id; };
    const force = (r, fn) => { Math.random = () => r; try { fn(); } finally { Math.random = R0; } };   // 바꾼 Math.random은 바로 되돌림 (게임 루프가 먹지 않게)
    const run = (fn, r, M) => { const n = T.floats.length, hp = M.map(m => m.hp); force(r, fn); const t = T.floats.slice(n).map(f => f.text), drop = M.map((m, k) => hp[k] - m.hp); for (const m of M) m.hp = m.max;
      return { hits: t.filter(x => /^\d+$/.test(x)).map(Number), judge: t.filter(x => /^심판 \d+$/.test(x)).map(x => +x.slice(3)), drop }; };
    const setEn = v => { I.eqE('weapon').en = v; };
    const A = mk(1, 0), B = mk(3, 0), C = mk(3, 1); out.ids = [A.uid, B.uid, C.uid];
    for (const [cls, id, fn] of [['knight', 'lg_sword', () => T.strike(A)], ['elf', 'lg_bow', () => T.strike(A, 'bow')], ['wizard', 'lg_staff', () => T.SPH_(A, 'ebolt')]]) { wear(cls, id); setEn(0);
      out[cls] = { yes: run(fn, 0.0999, [A]), no: run(fn, 0.1001, [A]) }; }
    out.bolt = run(() => T.strike(A, 'magic'), 0.0999, [A]);   // 마법사 마력탄(기본 공격)은 공격 마법이 아니라 심판 없음
    out.aoe = run(() => T.SPH_(B, 'fball'), 0.0999, [A, B, C]);   // 범위 마법: 맞은 대상마다 따로
    wear('knight', 'lg_sword'); out.scale = [[0, 0.1], [5, 0.2], [9, 0.28], [-2, 0.1]].map(([en, c]) => { setEn(en); return [en, c, run(() => T.strike(A), c - 0.0001, [A]).judge.length, run(() => T.strike(A), c + 0.0001, [A]).judge.length, (T.INV.tipOf(T.INV.eqE('weapon')).match(/타격 시 \d+% 확률로 \[심판\]/) || [''])[0]]; });   // 10% + 강화 1당 2% (음수는 10%)
    setEn(0); let hits = 0, jud = 0; { const n = T.floats.length; for (let k = 0; k < 3000; k++) T.strike(A); const t = T.floats.slice(n).map(f => f.text); hits = t.filter(x => /^\d+$/.test(x)).length; jud = t.filter(x => /^심판 \d+$/.test(x)).length; A.hp = A.max; }
    out.rate = { hits, jud };
    const pil = () => T.MXL.filter(q => q.k === 'pillar').length; T.MXL.length = 0; out.fxOn = { r: run(() => T.strike(A), 0.0999, [A]), pillar: pil() };
    document.getElementById('cw-fx').click(); T.MXL.length = 0; out.fxOff = { r: run(() => T.strike(A), 0.0999, [A]), pillar: pil(), btn: document.getElementById('cw-fx').textContent }; document.getElementById('cw-fx').click();
    setEn(3); out.rnd = Math.random === R0; return out; });
  for (const cls of ['knight', 'elf', 'wizard']) { const y = JT[cls].yes, n = JT[cls].no;
    chk(y.judge.length === 1 && n.judge.length === 0, `${cls} 발동 확률 10%: random 0.0999 → 심판 ${y.judge.length}번 · 0.1001 → ${n.judge.length}번`);
    chk(y.judge[0] === y.hits[0] && y.drop[0] === 2 * n.drop[0] && n.drop[0] > 0, `${cls} 심판 피해 = 그 타격 피해: 표시 ${y.hits[0]} → 심판 ${y.judge[0]} · 실제 HP ${n.drop[0]} → ${y.drop[0]} (2배)`); }
  chk(JT.bolt.judge.length === 0 && JT.bolt.hits.length === 1, `마법사 마력탄(기본 공격)은 심판 없음 (${JT.bolt.judge.length})`);
  chk(JT.aoe.hits.length >= 2 && JT.aoe.judge.length === JT.aoe.hits.length && JT.aoe.judge.every((v, k) => v === JT.aoe.hits[k]), `범위 마법(파이어볼): 맞은 ${JT.aoe.hits.length}마리 각각 심판 ${JT.aoe.judge.join(',')} = ${JT.aoe.hits.join(',')}`);
  const rate = JT.rate.jud / JT.rate.hits; chk(rate > 0.075 && rate < 0.125, `실제 확률: 명중 ${JT.rate.hits}번 중 심판 ${JT.rate.jud}번 (${(rate * 100).toFixed(1)}%)`);
  chk(JT.fxOn.pillar >= 1 && JT.fxOn.r.judge.length === 1, `장비 이펙트 켬: 금빛 기둥 ${JT.fxOn.pillar}개`);
  chk(JT.fxOff.pillar === 0 && JT.fxOff.r.judge.length === 1 && JT.fxOff.r.drop[0] === JT.fxOn.r.drop[0] && /끔/.test(JT.fxOff.btn), `장비 이펙트 끔: 기둥 ${JT.fxOff.pillar}개 · 피해는 그대로 ${JT.fxOff.r.drop[0]}`);
  for (const [en, c, y, n, tt] of JT.scale) chk(y === 1 && n === 0 && tt === `타격 시 ${Math.round(c * 100)}% 확률로 [심판]`, `${en >= 0 ? '+' : ''}${en} 심판 ${Math.round(c * 100)}%: random ${(c - 0.0001).toFixed(4)} → ${y}번 · ${(c + 0.0001).toFixed(4)} → ${n}번 · 툴팁 '${tt}'`);
  chk(JT.rnd, 'Math.random 되돌림');

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
  // 새 집행검 아이콘 크게: 전설 칸 바탕·효과 위에 (애니메이션은 빛줄기·별빛이 보이는 순간에 멈춤)
  await p.evaluate(() => { const z = document.createElement('div'); z.id = 'lgzoom'; z.className = 'iw-ic r-4'; z.style.cssText = 'position:fixed;left:30px;top:30px;width:260px;height:260px;z-index:99999;--lgd:0s';
    z.innerHTML = __T.ICON('ic_lg_sword') + '<i class="lg-fx" aria-hidden="true"><b></b><b></b></i>'; z.querySelector('svg').style.cssText = 'width:236px;height:236px'; document.body.appendChild(z); });
  await p.waitForTimeout(100);
  await p.evaluate(() => { const z = document.getElementById('lgzoom'), T_ = { lgSweep: 800, lgPulse: 2000 }; let s = 0; for (const a of document.getAnimations()) { const t = a.effect && a.effect.target; if (!t || !z.contains(t)) continue; a.pause(); a.currentTime = a.animationName === 'lgStar' ? (s++ ? 370 : 1100) : (T_[a.animationName] || 0); } });
  { const el = await p.$('#lgzoom'); await el.screenshot({ path: path.join(OUT, 'legitem_sword_zoom.png') }); }
  await p.evaluate(() => document.getElementById('lgzoom').remove());
  // 8) 도감: 전설 카드 아이콘 효과
  const CX = await p.evaluate(() => { document.getElementById('btn-codex').click(); const s = document.getElementById('cdx-rar'); s.value = '전설'; s.dispatchEvent(new Event('change')); s.dispatchEvent(new Event('input')); return [...document.querySelectorAll('#cdx-list .cdx-card')].filter(c => c.querySelector('.cdx-ic.r-4 .lg-fx')).length; });
  chk(CX >= 3, `도감 전설 카드 ${CX}개`);
  await p.evaluate(() => document.getElementById('btn-codex').click());
  // 9) 움직임 줄이기(prefers-reduced-motion): 애니메이션 멈춤 · 파란 바탕은 그대로
  await p.emulateMedia({ reducedMotion: 'reduce' });
  const RM = await p.evaluate(() => { const L = document.querySelector('#inv-grid .slot.r-4 .lg-fx'); return L ? [getComputedStyle(L, '::after').animationName, getComputedStyle(L.querySelector('b')).animationName, getComputedStyle(L.parentElement).backgroundImage.startsWith('radial')] : null; });
  chk(RM && RM[0] === 'none' && RM[1] === 'none' && RM[2], `움직임 줄이기: 애니메이션 ${RM && RM.slice(0, 2).join('/')} · 바탕 유지 ${RM && RM[2]}`);
  await p.emulateMedia({ reducedMotion: 'no-preference' });
  // 10) 심판 순간: 허수아비에게 심판이 터진 직후 금빛 빛기둥 (창을 닫고 확대)
  await p.evaluate(() => { for (const id of ['invwin', 'charwin', 'itemwin']) { const w = document.getElementById(id); if (w) w.hidden = true; } __T.ZOOMT = 1.6; });
  await p.waitForTimeout(900);
  const PS = await p.evaluate(() => { const T = __T, A = T.foxes.find(m => m.kind === 'dummy50'), R0 = Math.random; Math.random = () => 0.0999; try { T.strike(A); } finally { Math.random = R0; } return T.scr(A.x, A.z); });
  await p.waitForTimeout(140);
  await p.screenshot({ path: path.join(OUT, 'legitem_judge.png'), clip: { x: Math.max(0, PS[0] - 190), y: Math.max(0, PS[1] - 400), width: 380, height: 470 } });
  chk(!errs.length, '페이지 오류 없음' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(ok.map(m => 'OK  ' + m).join('\n')); if (bad.length) console.log(bad.map(m => 'BAD ' + m).join('\n'));
  console.log(bad.length ? `FAIL ${bad.length}/${ok.length + bad.length}` : `PASS ${ok.length}/${ok.length}`); await b.close(); })();
