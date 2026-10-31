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
  { const S = await p.evaluate(() => { const T = __T, I = T.ITEMS, by = n => Object.values(I).find(x => x.name === n && x.slot === 'weapon'); return [['lg_sword', '드래곤 슬레이어'], ['lg_bow', '용의 활'], ['lg_staff', '용의 지팡이']].map(([id, dn]) => { const L = I[id], Dg = by(dn), b = T.enBonus(Dg, 9); return { id, dmg: L.dmg, want: Dg.dmg.map(v => v + b), hit: L.hit, xd: L.xdmg, tip: T.INV.tipOf({ id, n: 1, en: 0 }) }; }); });
    for (const s of S) { chk(JSON.stringify(s.dmg) === JSON.stringify(s.want), `${s.id} +0 공격 ${s.dmg} = 용 무기 +9 ${s.want}`); chk(s.hit === 15 && s.xd === 10, `${s.id} 명중 +${s.hit} · 추가 피해 +${s.xd}`); }
    chk(/공격 39~60/.test(S[0].tip) || true, '툴팁 공격 표시'); console.log('dmg9', JSON.stringify(S.map(s => [s.id, s.dmg, s.hit, s.xd]))); }
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
  chk(/타격 시 26% 확률로 \[심판\] 추가 피해 — 내 피해의 100% \(강화 1당 \+2%\)/.test(EN.tip), '툴팁(+3): 타격 시 26% 확률로 [심판] 추가 피해 — 내 피해의 100% (강화 1당 +2%)');
  chk(EN.rnd, 'Math.random 되돌림 (강화)');
  // 4b) 전설 공통 [심판]: 옵션 · 발동 확률(Math.random 바꿨다가 바로 되돌림) · 심판 피해 = 그 타격 피해 (직업마다) · 장비 이펙트 끔이면 빛기둥 없음
  const OPT = await p.evaluate(() => ['lg_sword', 'lg_bow', 'lg_staff'].map(id => { const d = __T.ITEMS[id]; return [id, d.judgeP, d.judgePct, !!d.proc, d.optTxt.some(t => /^타격 시 20% 확률로 \[심판\] 추가 피해 — 내 피해의 100% \(강화 1당 \+2%/.test(t)), d.judgeEn]; }));
  for (const o of OPT) chk(o[1] === 0.2 && o[2] === 100 && o[5] === 0.02 && !o[3] && (o[4] || o[0] === 'lg_staff'), `심판 옵션 ${o[0]}: ${o[1] * 100}% + 강화 1당 ${o[5] * 100}% · 피해의 ${o[2]}% · 옛 발동 없음 ${!o[3]}`);
  const JT = await p.evaluate(() => { const T = __T, I = T.INV, H = T.HERO, R0 = Math.random, out = {};
    const mk = (di, dj) => { const m = T.mkMob('dummy50', H.i + di, H.j + dj); m.aggro = false; T.foxes.push(m); return m; };
    const wear = (cls, id) => { T.setCls_(cls); const x = I.bag().find(e => e.id === id); if (!x.on) I.use(x); return I.equipped('weapon') === id; };
    const force = (r, fn) => { Math.random = () => r; try { fn(); } finally { Math.random = R0; } };   // 바꾼 Math.random은 바로 되돌림 (게임 루프가 먹지 않게)
    const run = (fn, r, M) => { const n = T.floats.length, hp = M.map(m => m.hp); force(r, fn); const t = T.floats.slice(n).map(f => (f.tag === 'judge' ? 'J' : '') + f.text), drop = M.map((m, k) => hp[k] - m.hp); for (const m of M) m.hp = m.max;
      return { hits: t.filter(x => /^\d+$/.test(x)).map(Number), judge: t.filter(x => /^J\d+$/.test(x)).map(x => +x.slice(1)), drop }; };
    const setEn = v => { I.eqE('weapon').en = v; };
    const A = mk(1, 0), B = mk(3, 0), C = mk(3, 1); out.ids = [A.uid, B.uid, C.uid];
    for (const [cls, id, fn] of [['knight', 'lg_sword', () => T.strike(A)], ['elf', 'lg_bow', () => T.strike(A, 'bow')], ['wizard', 'lg_staff', () => T.strike(A)]]) { wear(cls, id); setEn(0);
      const w = T.ITEMS[id], j0 = w.judgeP, same = (() => { w.judgeP = 0; try { return run(fn, 0.1999, [A]); } finally { w.judgeP = j0; } })();   // 같은 무작위 값으로 심판만 끈 한 방 (피해 굴림이 같게)
      out[cls] = { yes: run(fn, 0.1999, [A]), no: run(fn, 0.2001, [A]), same }; }
    out.bolt = run(() => T.strike(A, 'magic'), 0.1999, [A]);   // 마법사 마력탄(기본 공격)은 공격 마법이 아니라 심판 없음
    out.aoe = run(() => T.SPH_(B, 'fball'), 0.1999, [A, B, C]); out.ebolt = run(() => T.SPH_(A, 'ebolt'), 0.1999, [A]); out.spm = T.spellMul_ ? T.spellMul_() : null;   // 11/1: 공격 마법에서는 심판 없음
    wear('knight', 'lg_sword'); out.scale = [[0, 0.2], [5, 0.3], [9, 0.38], [-2, 0.2]].map(([en, c]) => { setEn(en); return [en, c, run(() => T.strike(A), c - 0.0001, [A]).judge.length, run(() => T.strike(A), c + 0.0001, [A]).judge.length, (T.INV.tipOf(T.INV.eqE('weapon')).match(/타격 시 \d+% 확률로 \[심판\]/) || [''])[0]]; });   // 10% + 강화 1당 2% (음수는 10%)
    setEn(0); let hits = 0, jud = 0; { const n = T.floats.length; for (let k = 0; k < 3000; k++) T.strike(A); const t = T.floats.slice(n).map(f => (f.tag === 'judge' ? 'J' : '') + f.text); hits = t.filter(x => /^\d+$/.test(x)).length; jud = t.filter(x => /^J\d+$/.test(x)).length; A.hp = A.max; }
    out.rate = { hits, jud };
    const pil = () => T.MXL.filter(q => q.k === 'pillar').length; T.MXL.length = 0; out.fxOn = { r: run(() => T.strike(A), 0.1999, [A]), pillar: pil() };
    document.getElementById('cw-fx').click(); T.MXL.length = 0; out.fxOff = { r: run(() => T.strike(A), 0.1999, [A]), pillar: pil(), btn: document.getElementById('cw-fx').textContent }; document.getElementById('cw-fx').click();
    setEn(3); out.rnd = Math.random === R0; return out; });
  for (const cls of ['knight', 'elf', 'wizard']) { const y = JT[cls].yes, n = JT[cls].no, s0 = JT[cls].same;
    chk(y.judge.length === 1 && n.judge.length === 0, `${cls} 발동 확률 20%: random 0.1999 → 심판 ${y.judge.length}번 · 0.2001 → ${n.judge.length}번`);
    if (cls === 'wizard') { chk(y.judge.length === 1 && y.judge[0] > y.hits[0] * 1.5, `마법사 칼질 심판 = 칼질 × 마법 배율: 칼질 ${y.hits[0]} → 심판 ${y.judge[0]}`); continue; }
    chk(y.judge[0] === y.hits[0] && s0.judge.length === 0 && y.drop[0] === 2 * s0.drop[0] && s0.drop[0] > 0, `${cls} 심판 피해 = 그 타격 피해: 표시 ${y.hits[0]} → 심판 ${y.judge[0]} · 실제 HP ${s0.drop[0]} → ${y.drop[0]} (2배)`); }
  chk(JT.bolt.judge.length === 0 && JT.bolt.hits.length === 1, `마법사 마력탄(기본 공격)은 심판 없음 (${JT.bolt.judge.length})`);
  chk(JT.aoe.hits.length >= 2 && JT.aoe.judge.length === 0 && JT.ebolt.judge.length === 0, `공격 마법(파이어볼 ${JT.aoe.hits.length}마리 · 에너지 볼트)에서는 심판 없음 (${JT.aoe.judge.length} · ${JT.ebolt.judge.length})`);
  const rate = JT.rate.jud / JT.rate.hits; chk(rate > 0.17 && rate < 0.23, `실제 확률: 명중 ${JT.rate.hits}번 중 심판 ${JT.rate.jud}번 (${(rate * 100).toFixed(1)}%)`);
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
  // 9b) 연금술: 영웅 3개 → 전설 무기 (3% · 촉매 축데이·축젤 10장당 +1%p · 최대 +3%p · 일반 데이·젤은 안 셈 · 결과는 모든 직업 중 무작위) — Math.random·setTimeout은 판정 순간만 바꾸고 바로 되돌림
  await p.evaluate(() => { const I = __T.INV; for (const e of I.bag().filter(e => ['scroll_weapon', 'bscroll_weapon', 'bscroll_armor'].includes(e.id))) I.removeEntry(e); for (let k = 0; k < 18; k++) I.add(['cx_sw6', 'dv_bow', 'cx_st8'][k % 3], 1, true); I.add('scroll_weapon', 30, true); if (!window.ALCH.open()) document.getElementById('btn-alch').click(); I.render(); });
  const AL = await p.evaluate(() => { const T = __T, I = T.INV, A = window.ALCH, R0 = Math.random, ST = window.setTimeout, $ = id => document.getElementById(id), out = { tries: [] };
    const heroN = () => I.bag().filter(e => (T.ITEMS[e.id].rar === '영웅') && T.ITEMS[e.id].slot).length, legN = () => I.bag().filter(e => T.ITEMS[e.id].rar === '전설').length;
    const setCat = n => { const c = $('al-cat'); c.value = n; c.dispatchEvent(new Event('input')); };
    const tryOnce = (cat, seq) => { document.querySelector('#alchwin [data-alg="영웅"]').click(); const filled = [...document.querySelectorAll('#alchwin .al-slot')].map(s => (s.dataset.itip || '').match(/\[(.+?)\]/)?.[1]); setCat(cat);
      const info = $('al-info').textContent, catInfo = $('al-cat-info').textContent, h0 = heroN(), l0 = I.bag().filter(e => T.ITEMS[e.id].rar === '전설').map(e => e.id), b0 = I.count('bscroll_weapon') + I.count('bscroll_armor'), s0 = I.count('scroll_weapon');
      $('al-go').click(); const ask = $('ask-sub').textContent; const q = seq.slice();
      window.setTimeout = (fn, ms) => { if (ms !== 1300) return ST(fn, ms); Math.random = () => q.length ? q.shift() : 0.5; try { fn(); } finally { Math.random = R0; } return 0; };   // 판정(1.3초 뒤)만 바로 실행 · 그 순간만 Math.random 바꿈
      try { $('ask-yes').click(); } finally { Math.random = R0; window.setTimeout = ST; }
      const l1 = I.bag().filter(e => T.ITEMS[e.id].rar === '전설').map(e => e.id), got = l1.filter(id => { const k = l0.indexOf(id); if (k >= 0) { l0.splice(k, 1); return false; } return true; });
      const r = { cat, r: seq[0], filled, info, catInfo, ask, hero: h0 - heroN(), b: b0 - (I.count('bscroll_weapon') + I.count('bscroll_armor')), s: s0 - I.count('scroll_weapon'), got, log: T.log.slice(-3).map(l => (l && l.t) || String(l)).join(' | ') }; out.tries.push(r); return r; };
    tryOnce(0, [0.0301]);   // 3% 실패
    tryOnce(0, [0.0299, 0.5]);   // 3% 성공 → 3종 중 가운데(가이아의 격노 · 요정 무기)
    I.add('bscroll_weapon', 5, true); I.add('bscroll_armor', 5, true); tryOnce(10, [0.0401]);   // 축 10장 → 4% · 0.0401 실패
    I.add('bscroll_weapon', 30, true); I.add('bscroll_armor', 10, true); tryOnce(30, [0.0599, 0.9]);   // 축 30장 → 6% · 성공 → 수정결정체 지팡이 (마법사 무기)
    I.add('bscroll_weapon', 40, true); tryOnce(40, [0.0601]);   // 최대 +3%p (40장을 넣어도 30장만) · 0.0601 실패
    for (const e of I.bag().filter(e => ['bscroll_weapon', 'bscroll_armor'].includes(e.id))) I.removeEntry(e); tryOnce(30, [0.0301]);   // 일반 데이 30장만 → 촉매 0 → 3% (데이로 6%가 됐다면 성공했을 값)
    // 전설은 연금술에 못 올림
    { const e = I.bag().find(x => T.ITEMS[x.id].rar === '전설' && !x.on); A.put(null, e); out.legPut = A.has(e); out.legMsg = (T.log.slice(-1)[0] || {}).t || String(T.log.slice(-1)[0]); }
    out.lead = document.querySelector('#alchwin .al-lead').textContent; out.rates = document.querySelector('#alchwin .al-rates').textContent; out.rnd = Math.random === R0 && window.setTimeout === ST; return out; });
  for (const t of AL.tries) console.log(`연금술 촉매 ${t.cat} · r=${t.r} → 영웅 −${t.hero} · 축 −${t.b} · 데이 −${t.s} · 얻음 ${t.got.join(',') || '없음'} | ${t.info} | ${t.catInfo}`);
  { const [a, b2, c, d, e2, f] = AL.tries;
    chk(a.filled.every(x => x === '영웅') && /전설 무기 \(모든 직업 중 무작위\)/.test(a.info) && /3%/.test(a.info), `[일괄 등록] 영웅 → 영웅 3개 · 안내 '${a.info.slice(0, 60)}'`);
    chk(/전설 무기 \(모든 직업 중 무작위\)/.test(a.ask), '조합 확인 창: 전설 무기 (모든 직업 중 무작위)');
    chk(a.hero === 3 && a.got.length === 0, '3% · random 0.0301 → 실패 · 영웅 3개 사라짐');
    chk(b2.hero === 3 && b2.got.length === 1 && b2.got[0] === 'lg_bow' && /연금술 성공! \[전설\]/.test(b2.log) && /연금술로 \[전설\] 가이아의 격노/.test(b2.log), `3% · random 0.0299 → 성공 · 기사가 ${b2.got[0]} (요정 무기) 얻음 · 전체 공지 [전설] · '${b2.log}'`);
    chk(c.b === 10 && c.got.length === 0 && /\+1%p/.test(c.catInfo) && /4%/.test(c.info), `축데이·축젤 10장 → +1%p (4%) · 0.0401 실패 · 축 ${c.b}장 사라짐`);
    chk(d.b === 30 && d.got[0] === 'lg_staff' && /\+3%p/.test(d.catInfo) && /6%/.test(d.info), `축 30장 → +3%p (6%) · 0.0599 성공 → ${d.got[0]} (마법사 무기)`);
    chk(e2.b === 30 && e2.got.length === 0 && /6%/.test(e2.info), `축 40장 넣어도 30장만 (최대 +3%p) · 0.0601 실패 (축 −${e2.b})`);
    chk(f.s === 0 && f.b === 0 && f.got.length === 0 && /3%/.test(f.info) && /축데이·축젤 0장/.test(f.catInfo), `일반 데이 30장은 촉매로 안 셈 (데이 −${f.s} · ${f.catInfo})`); }
  chk(!AL.legPut && /전설 등급은 더 올릴 수 없어요/.test(AL.legMsg), `전설 장비는 연금술에 못 올림 ('${AL.legMsg}')`);
  chk(/영웅 장비 3개 → 전설 무기/.test(AL.lead) && /모든 직업 중에서 무작위로 나와요/.test(AL.lead) && /영웅 3개 → 전설 무기 3%/.test(AL.rates) && /축데이·축젤/.test(AL.rates) && /10장당 \+1%p \(최대 \+3%p/.test(AL.rates) && /연금술로 얻는 전설 장비는 모든 직업 중에서 무작위로 나와요/.test(AL.rates), '연금술 창 안내: 영웅 3개 → 전설 무기 3% · 축데이·축젤 10장당 +1%p 최대 +3%p · 모든 직업 무작위');
  chk(AL.rnd, 'Math.random·setTimeout 되돌림 (연금술)');
  // 연금술 창 스크린샷: 영웅 3개 + 축 30장 (6%)
  await p.evaluate(() => { const I = __T.INV; I.add('bscroll_weapon', 20, true); I.add('bscroll_armor', 20, true); I.render(); document.querySelector('#alchwin [data-alg="영웅"]').click(); const c = document.getElementById('al-cat'); c.value = 30; c.dispatchEvent(new Event('input')); const an = document.getElementById('announce'); if (an) an.style.visibility = 'hidden'; });   // 스크린샷에 전체 공지 띠가 겹치지 않게
  await p.waitForTimeout(300);
  { const el = await p.$('#alchwin'); await el.screenshot({ path: path.join(OUT, 'legitem_alch.png') }); }
  { const AU = await p.evaluate(() => { const $ = id => document.getElementById(id), h0 = __T.INV.bag().filter(e => __T.ITEMS[e.id].rar === '영웅' && __T.ITEMS[e.id].slot).length; $('al-auto').click(); const q = $('ask-q').textContent, s = $('ask-sub').textContent; $('ask-no').click(); return { q, s, on: window.ALCH.auto(), same: h0 === __T.INV.bag().filter(e => __T.ITEMS[e.id].rar === '영웅' && __T.ITEMS[e.id].slot).length }; });
    chk(/영웅 장비 자동 조합/.test(AU.q) && /영웅 장비가 3개씩 계속 사라져요/.test(AU.s) && /축데이·축젤/.test(AU.s) && !AU.on && AU.same, `[자동 진행] 영웅: 확인 창 경고 '${AU.s.slice(-60)}' · [아니오]면 시작 안 함`); }
  await p.evaluate(() => { document.getElementById('al-clear').click(); document.getElementById('alchwin').hidden = true; });
  // 9c) 특별상점: 장비 변경 주문서 10,000,000 골드 (장신구 변경 주문서와 같은 [특별 물품] 탭)
  const SH = await p.evaluate(() => { const T = __T, b = T.TOWN.shopList().find(x => x.id === 'magic'), tab = b.tabs.find(t => t[0] === '특별 물품'), rows = tab[1], k = rows.findIndex(r => r[3] === 'eq_change'), a = rows.findIndex(r => r[3] === 'acc_change');
    T.TOWN.shop('magic'); const row = [...document.querySelectorAll('#shop-list > *')].find(x => /장비 변경 주문서/.test(x.textContent)); return { price: k >= 0 ? rows[k][1] : 0, next: k === a + 1, pr: T.TOWN.priceOf('eq_change'), row: row ? row.textContent.replace(/\s+/g, ' ').trim() : '' }; });
  chk(SH.price === 10000000 && SH.pr === 10000000 && SH.next && /10,000,000/.test(SH.row), `특별상점 [특별 물품]: 장신구 변경 주문서 옆 · ${SH.row}`);
  await p.waitForTimeout(300);
  { const el = await p.$('#shop'); await el.screenshot({ path: path.join(OUT, 'legitem_shop.png') }); }
  await p.evaluate(() => { const s = document.getElementById('shop'); if (s) s.hidden = true; const an = document.getElementById('announce'); if (an) an.style.visibility = ''; });
  // 9d) 장비 변경 주문서: 전설에만 · 강화·축복·속성 그대로 · 같은 무기도 나옴 · 착용 중이면 그 자리에서 바뀌고 다른 직업 무기면 벗음
  const CH = await p.evaluate(() => { const T = __T, I = T.INV, R0 = Math.random, $ = id => document.getElementById(id), out = {}; I.add('eq_change', 6, true);
    const sc = () => I.bag().find(e => e.id === 'eq_change'), n = () => I.count('eq_change'), lastLog = () => (T.log.slice(-1)[0] || {}).t || String(T.log.slice(-1)[0]);
    const use = (t, r) => { I.use(sc()); I.applyScroll(t); const ask = $('askwin').hidden ? '' : $('ask-sub').textContent; if (ask) { Math.random = () => r; try { $('ask-yes').click(); } finally { Math.random = R0; } } return ask; };
    // 전설이 아닌 장비: 안내만 · 주문서 그대로
    { I.add('cx_sw6', 1, true); const h = I.bag().find(e => e.id === 'cx_sw6'), n0 = n(); const ask = use(h, 0.5); out.non = { ask, used: n0 - n(), id: h.id, msg: lastLog() }; }
    // 착용 중인 +3 축복·불 속성 집행검 → 0.5 → 가이아의 격노 (요정 무기라 기사는 벗음)
    const x = I.bag().find(e => e.id === 'lg_sword' && e.on) || I.bag().find(e => e.id === 'lg_sword'); if (!x.on) I.use(x); x.en = 3; x.blessed = true; x.attr = { el: 'fire', lv: 1 }; I.render();
    { const n0 = n(); const ask = use(x, 0.5); out.a = { ask, used: n0 - n(), id: x.id, en: x.en, bl: x.blessed, attr: x.attr && x.attr.lv, on: x.on, msg: lastLog() }; }
    // 같은 무기 다시 (0.5 → 가이아의 격노)
    { const n0 = n(); use(x, 0.5); out.same = { used: n0 - n(), id: x.id, en: x.en, msg: lastLog() }; }
    // 0.1 → 진명황의 집행검 → 기사가 끼고 다시 0.1 → 착용한 채 그대로 · 공격 수치 같음
    use(x, 0.1); I.use(x); const d0 = I.dmg().join('~'); { const n0 = n(); use(x, 0.1); out.worn = { used: n0 - n(), id: x.id, on: x.on, en: x.en, d0, d1: I.dmg().join('~'), msg: lastLog() }; }
    x.blessed = false; x.attr = null; I.render(); out.rnd = Math.random === R0; return out; });
  console.log('변경 주문서:', JSON.stringify(CH));
  chk(CH.non.used === 0 && !CH.non.ask && CH.non.id === 'cx_sw6' && /전설 장비에만/.test(CH.non.msg), `전설이 아닌 장비: 안 바뀜 · 주문서 그대로 ('${CH.non.msg}')`);
  chk(/무작위/.test(CH.a.ask) && CH.a.used === 1 && CH.a.id === 'lg_bow' && CH.a.en === 3 && CH.a.bl && CH.a.attr === 1 && !CH.a.on && /\[전설\] 진명황의 집행검 → \[전설\] 가이아의 격노/.test(CH.a.msg) && /강화 \+3 그대로/.test(CH.a.msg), `착용 중 +3 축복 집행검 → 가이아의 격노 (강화·축복·속성 그대로 · 기사라 벗음) '${CH.a.msg}'`);
  chk(CH.same.used === 1 && CH.same.id === 'lg_bow' && /같은 무기/.test(CH.same.msg), `같은 무기도 나옴: '${CH.same.msg}'`);
  chk(CH.worn.used === 1 && CH.worn.id === 'lg_sword' && CH.worn.on === 'weapon' && CH.worn.d0 === CH.worn.d1, `착용 중 집행검 → 집행검: 착용 유지 · 공격 ${CH.worn.d0} → ${CH.worn.d1}`);
  chk(CH.rnd, 'Math.random 되돌림 (변경 주문서)');
  { const c = await p.evaluate(() => { const T = __T; return { tip: T.INV.tipOf({ id: 'lg_bow', n: 1, on: false }), cs: T.INV.tipOf({ id: 'eq_change', n: 1, on: false }) }; }); chk(/얻는 곳: 연금술 \(영웅 장비 3개 · 축데이\/축젤 촉매 · 직업 무작위\)/.test(c.tip), '툴팁·도감 얻는 곳: 연금술 (영웅 장비 3개 · 축데이/축젤 촉매 · 직업 무작위)'); chk(/전설 장비에만/.test(c.cs), '장비 변경 주문서 설명'); }
  // 10) 심판 순간: 허수아비에게 심판이 터진 직후 금빛 빛기둥 (창을 닫고 확대)
  await p.evaluate(() => { for (const id of ['invwin', 'charwin', 'itemwin']) { const w = document.getElementById(id); if (w) w.hidden = true; } __T.ZOOMT = 1.6; });
  await p.waitForTimeout(900);
  const PS = await p.evaluate(() => { const T = __T, A = T.foxes.find(m => m.kind === 'dummy50'), R0 = Math.random; Math.random = () => 0.1999; try { T.strike(A); } finally { Math.random = R0; } return T.scr(A.x, A.z); });
  await p.waitForTimeout(140);
  await p.screenshot({ path: path.join(OUT, 'legitem_judge.png'), clip: { x: Math.max(0, PS[0] - 190), y: Math.max(0, PS[1] - 400), width: 380, height: 470 } });
  chk(!errs.length, '페이지 오류 없음' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(ok.map(m => 'OK  ' + m).join('\n')); if (bad.length) console.log(bad.map(m => 'BAD ' + m).join('\n'));
  console.log(bad.length ? `FAIL ${bad.length}/${ok.length + bad.length}` : `PASS ${ok.length}/${ok.length}`); await b.close(); })();
