// 11/5 프로듀서: 무기 고강화 보너스(+7~+10 · 등급 상관없이 · 기존 강화에 더함) · 유저 마법사 기본 공격 = 마력탄(7칸 · magicDmg · 마법 명중) · 무기 최대 +10
//   KT_PORT=8889 bash dev/runkt.sh dev/tests/hienchant.js
//   HE_LIVE=1 이면 마법사 실제 사냥 측정만 (예전 판 코드에도 돌아감 — 전후 비교용)
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v, x) => { R[k] = !!v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k + (x !== undefined ? '  ' + (typeof x === 'string' ? x : JSON.stringify(x)) : '')); };
const HI = { 7: [3, 1], 8: [9, 3], 9: [21, 6], 10: [33, 9] }, HS = { 7: [3, 1, null], 8: [7, 3, [2, 3]], 9: [12, 6, [3, 4]], 10: [17, 9, [3, 4]] };
const hv = en => HI[Math.min(10, en)] || [0, 0], hs = en => HS[Math.min(10, en)] || [0, 0, null];
const LIVE_ONLY = !!process.env.HE_LIVE, B0 = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
// 마법사 실제 사냥: 몹을 얼려 두고(stunT) 자동사냥 · 공격을 시작할 때 대상과의 거리 · 맞힘/빗나감
async function live(p, tag) {
  await p.evaluate(() => { const T = __T; T.GOD_INV = true; T.hero.lv = 52; T.INV.load({ bag: [{ id: 'dv_staff', n: 1, en: 9, on: 'weapon' }, { id: 'red_potion', n: 50 }], bonus: { str: 0, dex: 0, con: 0, int: 20, wis: 0, cha: 0 } }); T.INV.render(); T.TOWN.toZone(17); });   // 용의 계곡 2구역 (드레이크 Lv52 AC 1 · 와이번)
  await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 17 && __T.SCENE === 'field', null, { timeout: 60000 }); await p.waitForTimeout(1500);
  const r = await p.evaluate(async () => { const T = __T, H = T.hero, A = T.AUTO; A.setCfg({ loot: false, retHp: 0, lowPot: false, sell: false });
    const fz = () => { for (const f of T.foxes) if (!f.dead && !f.gone && !f.fb) { f.stunT = 5; if (f.max < 1e5) { f.max = f.hp = 2e5; } } }; fz(); const frz = setInterval(fz, 50);   // 얼림 + 안 죽게 (거리·명중만 봄)
    const st = { atk: 0, d: [], hit: 0, miss: 0, bolt: 0 }, mine = f => (f.dmgBy && f.dmgBy.get(H)) || 0, pend = []; let last = null;
    const done = q => { if (mine(q.f) > q.v0) st.hit++; else st.miss++; };   // 맞힘 = 그 공격 뒤 그 몹에 내 피해(dmgBy)가 늘었는지 (필드 봇의 MISS 글자와 섞이지 않게)
    const mon = setInterval(() => { const a = H.atk, now = performance.now(); if (a && a !== last && a.f && !a.f.isRemote && a.v !== 'cast') { st.atk++; st.d.push(Math.max(Math.abs(a.f.i - H.i), Math.abs(a.f.j - H.j))); pend.push({ f: a.f, v0: mine(a.f), at: now }); } last = a;
      while (pend.length && now - pend[0].at > 1450) done(pend.shift());
      for (const q of T.arrows) if (q.pl && q.kind === 'bolt' && !q._c) { q._c = 1; st.bolt++; } }, 16);
    const dmg0 = new Map(); for (const f of T.foxes) dmg0.set(f, mine(f));
    if (!A.on()) A.toggle(); await new Promise(r => setTimeout(r, 24000)); if (A.on()) A.toggle(); await new Promise(r => setTimeout(r, 1500)); clearInterval(mon); clearInterval(frz); while (pend.length) done(pend.shift());
    let lost = 0; for (const f of T.foxes) lost += mine(f) - (dmg0.get(f) || 0);   // 내가 준 피해 (dmgBy)
    const ds = st.d; return { atk: st.atk, bolt: st.bolt, hit: st.hit, miss: st.miss, hitP: st.atk ? +(st.hit / st.atk).toFixed(2) : null, perSec: +(lost / 24).toFixed(1), dmin: ds.length ? Math.min(...ds) : null, dmax: ds.length ? Math.max(...ds) : null, davg: ds.length ? +(ds.reduce((a, b) => a + b, 0) / ds.length).toFixed(2) : null, far: ds.filter(d => d >= 2).length, dealt: Math.round(lost), cls: T.CLASS }; });
  await p.screenshot({ path: `dev/out/hienchant_live${tag}.png` }); return r; }
(async () => { const b = await chromium.launch(); const errs = []; try {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  if (LIVE_ONLY) { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await login(p, { cls: 'wizard', name: 'heLv' }); const L = await live(p, '_base'); console.log('LIVE', JSON.stringify(L)); } else {
  // ===== ① 기사 페이지: 검·활 수치 · 정보·비교 창 · 강화 창 · 최대 +10 · 봇 복사 · 도감
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push('k: ' + e.message)); await login(p, { cls: 'knight', name: 'heK' });
  const K = await p.evaluate(B0 => { const T = __T, I = T.INV; T.hero.lv = 52; const out = [];
    for (const id of ['long_sword', 'cx_sw4', 'dv_sword', 'lg_sword', 'cx_bw2', 'cx_bw7', 'cx_dg7']) for (const en of [0, 6, 7, 8, 9, 10, 12]) { I.load({ bag: [{ id, n: 1, en, on: 'weapon' }], bonus: B0 }); const d = I.dmg();
      out.push({ id, rar: T.ITEMS[id].rar || '일반', wt: T.ITEMS[id].wtype, en, d0: d[0], d1: d[1], hm: I.cx('hitM'), hr: I.cx('hitR'), hg: I.cx('hitMg'), eb: T.enBonus(T.ITEMS[id], en), h: T.HEROHIT_({ lv: 52, mac: 0 }, T.ITEMS[id].wtype === 'bow' ? 'bow' : undefined) }); }
    return out; }, B0);
  { let bad = []; const by = {}; for (const r of K) (by[r.id] || (by[r.id] = [])).push(r);
    for (const id in by) { const z = by[id][0]; for (const r of by[id]) { const [dd, hh] = hv(r.en), bow = r.wt === 'bow';
      if (r.d0 - z.d0 !== r.eb + dd || r.d1 - z.d1 !== r.eb + dd) bad.push(`${id}+${r.en} 공격 ${r.d0 - z.d0}≠${r.eb}+${dd}`);
      if ((bow ? r.hr - z.hr : r.hm - z.hm) !== hh || (bow ? r.hm - z.hm : r.hr - z.hr) !== 0 || r.hg !== z.hg) bad.push(`${id}+${r.en} 명중`);
      if (Math.abs((r.h - z.h) - hh * 0.03) > 1e-9 && r.h < 0.97) bad.push(`${id}+${r.en} heroHit ${(r.h - z.h).toFixed(3)}`); } }
    const tbl = ['long_sword', 'dv_sword', 'cx_bw7'].map(id => id + ' ' + by[id].map(r => `+${r.en}:${r.d0 - by[id][0].d0}/${(r.wt === 'bow' ? r.hr : r.hm) - (r.wt === 'bow' ? by[id][0].hr : by[id][0].hm)}`).join(' ')).join(' | ');
    ok('검·활·단검: 일반·고급·희귀·영웅·전설 +6~+10 공격 = 기존 강화 + 고강화(3/9/21/33) · 명중(1/3/6/9) 근거리/원거리', !bad.length, bad.length ? bad.slice(0, 4) : tbl);
    ok('+12(예전 무기)는 그대로 · 보너스는 +10 값', by.dv_sword.find(r => r.en === 12).d0 - by.dv_sword[0].d0 === 36 + 33); }
  // 정보 창 · 비교 창 (+9 드래곤 슬레이어 vs 착용 +6)
  const INF = await p.evaluate(B0 => { const T = __T, I = T.INV; I.load({ bag: [{ id: 'dv_sword', n: 1, en: 6, on: 'weapon' }, { id: 'dv_sword', n: 1, en: 9 }, { id: 'dv_sword', n: 1, en: 10 }, { id: 'dv_sword', n: 1, en: 12 }, { id: 'cx_bw7', n: 1, en: 8 }, { id: 'scroll_weapon', n: 5 }, { id: 'bscroll_weapon', n: 5 }], bonus: B0 });
    document.getElementById('invwin').hidden = false; I.render(); const bag = I.bag(), e9 = bag.find(x => x.id === 'dv_sword' && x.en === 9);
    I.showDetail(e9); const tx = s => s.replace(/\s+/g, ' '), info = tx(document.getElementById('itemwin').textContent), cw = document.getElementById('cmpwin');
    return { info, cmp: cw && !cw.hidden ? tx(cw.textContent) : '', bow: I.tipOf(bag.find(x => x.id === 'cx_bw7')), t12: I.tipOf(bag.find(x => x.en === 12)), dmg: T.ITEMS.dv_sword.dmg }; }, B0);
  await p.waitForTimeout(300); await p.screenshot({ path: 'dev/out/hienchant_info_sword.png' });
  { const [b0, b1] = INF.dmg; console.log('info', (INF.info.match(/공격 \d.{0,60}/) || [''])[0], '|', (INF.info.match(/고강화 \+9 보너스[^강]{0,40}/) || [''])[0], '| cmp', (INF.cmp.match(/고강화.{0,40}/g) || []).join(' / '));
    ok('정보: 공격 = 기본 · 강화 +27 · 고강화 +21 (+9 영웅 검)', INF.info.includes(`공격 ${b0 + 48}~${b1 + 48} = 기본 ${b0}~${b1} · 강화 +27 · 고강화 +21`));
    ok('정보: 고강화 +9 보너스 줄 · 근거리 명중 +6 · 최대 +10', /고강화 \+9 보너스: 공격 \+21 · 근거리 명중 \+6/.test(INF.info) && /최대 \+10/.test(INF.info));
    ok('정보: 활 +8 → 원거리 명중 +3', /고강화 \+8 보너스: 공격 \+9 · 원거리 명중 \+3/.test(INF.bow));
    ok('정보: +12 무기는 보너스 +10 값', /고강화 보너스 \(\+10 값\): 공격 \+33/.test(INF.t12));
    ok('비교 창: 공격 칸 고강화 몫 · 고강화 명중 줄', /강화 \+27 · 고강화 \+21 포함/.test(INF.cmp) && /강화 \+18 포함/.test(INF.cmp) && /고강화 명중\+0\+6\+6/.test(INF.cmp), (INF.cmp.match(/공격.{0,80}/) || [''])[0]); }
  // 봇 복사 (필드 봇 사진 cb) — +6 → +9
  const BC = await p.evaluate(B0 => { const T = __T, I = T.INV, cb = en => { I.load({ bag: [{ id: 'dv_sword', n: 1, en, on: 'weapon' }], bonus: B0 }); return T.FBOT_.mine().cb; }; const a = cb(6), b = cb(9); return { a: { d: a.d, hb: a.hb }, b: { d: b.d, hb: b.hb } }; }, B0);
  ok('봇 복사(cb): 평균 피해 +9+21 · 명중 +0.18 (기사 +6 → +9)', Math.abs(BC.b.d - BC.a.d - 30) < 0.01 && Math.abs(BC.b.hb - BC.a.hb - 0.18) < 0.002, BC);
  // 강화: +10이면 막힘 (주문서 직접 · 강화 창) · +9 → +10 가능
  const EN = await p.evaluate(B0 => { const T = __T, I = T.INV; I.load({ bag: [{ id: 'dv_sword', n: 1, en: 10 }, { id: 'dv_sword', n: 1, en: 9 }, { id: 'dv_sword', n: 1, en: 12 }, { id: 'scroll_weapon', n: 5 }, { id: 'bscroll_weapon', n: 5 }], bonus: B0 }); I.render();
    const bag = I.bag(), e10 = bag.find(x => x.en === 10), e9 = bag.find(x => x.en === 9), e12 = bag.find(x => x.en === 12), out = {};
    const use = (sid, e) => { I.setHot(11, sid); I.useHot(11); I.applyScroll(e); };
    use('scroll_weapon', e10); out.e10 = e10.en; out.sc1 = I.count('scroll_weapon'); out.msg = T.log.slice(-2).map(x => x.t || x.text || x).join(' / ');
    use('bscroll_weapon', e12); out.e12 = e12.en; out.bs = I.count('bscroll_weapon');
    const R0 = Math.random; Math.random = () => 0; try { use('scroll_weapon', e9); const y = document.getElementById('ask-yes'); if (y && !document.getElementById('askwin').hidden) y.onclick(); } finally { Math.random = R0; }
    out.e9 = e9.en; out.inBag = bag.includes(e9); out.sc2 = I.count('scroll_weapon'); return out; }, B0);
  console.log('enchant', JSON.stringify(EN));
  ok('+10 무기에 주문서: 안 됨 · 주문서 그대로 · 최대 안내', EN.e10 === 10 && EN.sc1 === 5 && /최대 강화\(\+10\)/.test(EN.msg));
  ok('+12(예전) 무기도 축복 주문서 안 됨 · 그대로 +12', EN.e12 === 12 && EN.bs === 5);
  ok('+9 → +10 강화는 됨 (성공)', EN.e9 === 10 && EN.inBag && EN.sc2 === 4);
  // 강화 창 미리보기 (+6 → +7 · +9 → +10 · +10 최고)
  const pick = async (en, shot) => { const r = await p.evaluate(en => { const T = __T, I = T.INV, bag = I.bag(), e = bag.find(x => x.id === 'dv_sword' && x.en === en); const bw = document.getElementById('bulkwin'); if (bw.hidden) I.bulkOpen(); I.render();
      document.querySelectorAll('#inv-grid > button')[bag.indexOf(e)].click(); const g = id => (document.getElementById(id) || {}).textContent || ''; return { stat: g('en-stat').replace(/\s+/g, ' '), rate: g('en-rate'), plus: g('en-plus'), go: document.getElementById('en-go').disabled }; }, en);
    await p.waitForTimeout(250); if (shot) await p.screenshot({ path: shot }); await p.evaluate(() => { const T = __T, I = T.INV, bag = I.bag(); const e = bag.find(x => x.id === 'dv_sword'); }); return r; };
  await p.evaluate(B0 => { const I = __T.INV; I.load({ bag: [{ id: 'dv_sword', n: 1, en: 6 }, { id: 'dv_sword', n: 1, en: 9 }, { id: 'dv_sword', n: 1, en: 10 }, { id: 'scroll_weapon', n: 5 }], bonus: B0 }); I.render(); }, B0);
  const E6 = await pick(6), E9 = await pick(9, 'dev/out/hienchant_enh.png'), E10 = await pick(10, 'dev/out/hienchant_enh_max.png');
  console.log('enh', E6.stat, '|', E9.stat, '|', E10.rate, E10.plus);
  ok('강화 창 +6→+7: 고강화 공격 +0 ▶ +3 · 근거리 명중 +0 ▶ +1', /고강화공격\+0▶\+3/.test(E6.stat.replace(/ /g, '')) && /고강화근거리명중\+0▶\+1/.test(E6.stat.replace(/ /g, '')));
  ok('강화 창 +9→+10: 고강화 공격 +21 ▶ +33 · 명중 +6 ▶ +9', /고강화공격\+21▶\+33/.test(E9.stat.replace(/ /g, '')) && /명중\+6▶\+9/.test(E9.stat.replace(/ /g, '')));
  ok('강화 창 +10: 최고 강화(+10) · 강화 버튼 꺼짐', /최고 강화\(\+10\)/.test(E10.rate) && E10.go && /최고 강화/.test(E10.plus));
  // 도감: 무기 탭 안내 · 주문서 설명
  const CD = await p.evaluate(() => { document.querySelectorAll('.gw').forEach(w => w.hidden = true); const bw = document.getElementById('bulkwin'); if (bw) bw.hidden = true; CODEX.open(); const t = document.querySelector('#cdx-tabs [data-k="1"]'); if (t) t.click(); const g = document.querySelector('#cdx-list .cdx-guide'); return { g: g ? g.textContent : '', sc: __T.ITEMS.scroll_weapon.desc, bs: __T.ITEMS.bscroll_weapon.desc }; });
  await p.waitForTimeout(300); await p.screenshot({ path: 'dev/out/hienchant_codex.png' });
  console.log('codex', CD.g);
  ok('도감 무기 탭: 고강화 표 (검·활 +10 33·9 · 지팡이 +8 마나 흡수 2~3)', /최대 \+10/.test(CD.g) && /\+10 공격 \+33 · 명중 \+9/.test(CD.g) && /\+8 마력탄 피해 \+7 · 마법 명중 \+3 · 마나 흡수 2~3/.test(CD.g));
  ok('주문서 설명: 최대 +10 · 고강화', /최대 \+10/.test(CD.sc) && /고강화/.test(CD.sc) && /최대 \+10/.test(CD.bs));
  await p.close();
  // ===== ② 마법사 페이지: 지팡이 수치 · 마나 흡수 · 마력탄 전후 · [심판] · 대인전 명중 · 캐릭터 창 · 실제 사냥
  const w = await ctx.newPage(); w.on('pageerror', e => errs.push('w: ' + e.message)); await login(w, { cls: 'wizard', name: 'heW' });
  const S = await w.evaluate(B0 => { const T = __T, I = T.INV; T.hero.lv = 52; const out = [];
    for (const id of ['cx_st1', 'cx_st5', 'cx_st8', 'lg_staff']) for (const en of [0, 6, 7, 8, 9, 10, 12]) { I.load({ bag: [{ id, n: 1, en, on: 'weapon' }], bonus: B0 }); const m = T.MDMG_(), d = I.dmg(), h = I.hiEn();
      out.push({ id, en, m0: m[0], m1: m[1], d0: d[0], hg: I.cx('hitMg'), hm: I.cx('hitM'), eb: T.enBonus(T.ITEMS[id], en), dr: h.drain, mh: T.HEROHIT_({ lv: 52, mac: 0 }, 'magic') }); }
    return out; }, B0);
  { const bad = [], by = {}; for (const r of S) (by[r.id] || (by[r.id] = [])).push(r);
    for (const id in by) { const z = by[id][0]; for (const r of by[id]) { const [md, mh, dr] = hs(r.en);
      if (r.m0 - z.m0 !== md || r.m1 - z.m1 !== md) bad.push(`${id}+${r.en} 마력탄 ${r.m0 - z.m0}≠${md}`); if (r.hg - z.hg !== mh || r.hm !== z.hm) bad.push(`${id}+${r.en} 마법 명중`);
      if (r.d0 - z.d0 !== r.eb) bad.push(`${id}+${r.en} 지팡이 칼질 공격은 기존 강화만`); if (JSON.stringify(r.dr) !== JSON.stringify(dr)) bad.push(`${id}+${r.en} 흡수 ${JSON.stringify(r.dr)}`);
      if (Math.abs((r.mh - z.mh) - mh * 0.03) > 1e-9 && r.mh < 0.97) bad.push(`${id}+${r.en} 마법 명중률`); } }
    ok('지팡이 일반·희귀·영웅·전설 +6~+10: 마력탄 피해 3/7/12/17 · 마법 명중 1/3/6/9 · 마나 흡수(+8 2~3 · +9~ 3~4)', !bad.length, bad.length ? bad.slice(0, 4) : 'cx_st8 ' + by.cx_st8.map(r => `+${r.en}:${r.m0 - by.cx_st8[0].m0}/${r.hg - by.cx_st8[0].hg}`).join(' ')); }
  // 마나 흡수 실제 (cxProcs 300번)
  const DR = await w.evaluate(B0 => { const T = __T, I = T.INV, H = T.hero, o = {};
    for (const en of [7, 8, 9, 10]) { I.load({ bag: [{ id: 'cx_st8', n: 1, en, on: 'weapon' }], bonus: B0 }); const f = T.mkMob_('drake', H.i, H.j); f.mpLeft = 1e9; let lo = 99, hi = 0;
      for (let k = 0; k < 300; k++) { H.maxmp = 10000; H.mp = 0; T.cxProcs(f); const g = H.mp; lo = Math.min(lo, g); hi = Math.max(hi, g); } o[en] = [lo, hi]; } return o; }, B0);
  ok('마나 흡수 실제: +7 1~2 · +8 2~3 · +9 3~4 · +10 3~4', JSON.stringify(DR) === JSON.stringify({ 7: [1, 2], 8: [2, 3], 9: [3, 4], 10: [3, 4] }), DR);
  // 마력탄 전후: Lv52 · 지능 36 · 용의 지팡이 +9 · 드레이크(Lv52 · AC 1) 상대 — 예전(근접 칼질 strike(f)) vs 지금(마력탄 strike(f,'magic')) 각 600번
  const BF = await w.evaluate(async () => { const T = __T, I = T.INV, H = T.hero; H.lv = 52; I.load({ bag: [{ id: 'dv_staff', n: 1, en: 9, on: 'weapon' }], bonus: { str: 0, dex: 0, con: 0, int: 20, wis: 0, cha: 0 } }); I.render();
    const S = T.MOB.drake, sim = mode => { const f = T.mkMob_('drake', H.i + 1, H.j); f.max = f.hp = 1e8; let hit = 0, dmg = 0; const N = 600; for (let k = 0; k < N; k++) { const h0 = f.hp; T.strike(f, mode); if (f.hp < h0) { hit++; dmg += h0 - f.hp; } } return { hitP: +(hit / N).toFixed(3), avgHit: +(dmg / Math.max(1, hit)).toFixed(1), perAtk: +(dmg / N).toFixed(1), dps: +(dmg / N / (1.15 / 0.7)).toFixed(1) }; };   // 마법사 공격 간격 1.15/GSPD(0.7) = 1.64초 (근접·마력탄 같음)
    const md = T.MDMG_(), dm = I.dmg(); return { stat: I.stat().int, sp: I.sp(), melee: { range: 1, dmg: dm, hitF: +T.HEROHIT_(S).toFixed(3), ...sim(undefined) }, bolt: { range: 7, dmg: md, hitF: +T.HEROHIT_(S, 'magic').toFixed(3), ...sim('magic') } }; });
  console.log('before/after', JSON.stringify(BF));
  ok('마력탄: 높은 AC 몹(드레이크) 명중률이 근접보다 높음 · 초당 피해도 높음', BF.bolt.hitP > BF.melee.hitP + 0.2 && BF.bolt.dps > BF.melee.dps, `근접 ${BF.melee.hitP} → 마력탄 ${BF.bolt.hitP} · 초당 ${BF.melee.dps} → ${BF.bolt.dps}`);
  // 전설 지팡이 [심판]: 마력탄에서도 터짐
  const JG = await w.evaluate(() => { const T = __T, I = T.INV, H = T.hero; I.load({ bag: [{ id: 'lg_staff', n: 1, en: 9, on: 'weapon' }], bonus: { str: 0, dex: 0, con: 0, int: 20, wis: 0, cha: 0 } }); const f = T.mkMob_('drake', H.i + 1, H.j); f.max = f.hp = 1e8; const n0 = T.floats.filter(q => q.tag === 'judge').length; for (let k = 0; k < 200; k++) T.strike(f, 'magic'); return T.floats.filter(q => q.tag === 'judge').length - n0; });
  ok('전설 지팡이 [심판]이 마력탄에서도 터짐', JG > 20, JG);
  // 대인전 마법 명중 · 봇 복사 (지팡이 +6 → +9)
  const PV = await w.evaluate(B0 => { const T = __T, I = T.INV, D = { lv: 67, ac: -60 }, at = en => { I.load({ bag: [{ id: 'cx_st8', n: 1, en, on: 'weapon' }], bonus: B0 }); const cb = T.FBOT_.mine().cb; return { pv: T.PVPHIT_(D, 'magic'), d: cb.d, hb: cb.hb, cp: T.CP_().total }; }; return { a: at(6), b: at(9) }; }, B0);
  ok('대인전 마력탄 명중 +18%p · 봇 복사 평균 피해 +12 · hb +0.18 · 전투력 오름 (지팡이 +6 → +9)', Math.abs(PV.b.pv - PV.a.pv - 0.18) < 1e-9 && Math.abs(PV.b.d - PV.a.d - 12) < 0.01 && Math.abs(PV.b.hb - PV.a.hb - 0.18) < 0.002 && PV.b.cp > PV.a.cp, PV);
  // 지팡이 정보 창 · 캐릭터 창 '마력탄'
  const WI = await w.evaluate(B0 => { const T = __T, I = T.INV; I.load({ bag: [{ id: 'dv_staff', n: 1, en: 6, on: 'weapon' }, { id: 'dv_staff', n: 1, en: 9 }], bonus: { ...B0, int: 20 } }); document.getElementById('invwin').hidden = false; document.getElementById('charwin').hidden = false; I.render();
    const e = I.bag().find(x => x.en === 9); I.showDetail(e); const tx = s => s.replace(/\s+/g, ' '), cw = document.getElementById('cmpwin'), dd = document.getElementById('cw-dmg');
    return { info: tx(document.getElementById('itemwin').textContent), cmp: cw && !cw.hidden ? tx(cw.textContent) : '', lab: dd && dd.previousElementSibling.textContent, val: dd && dd.textContent, md: T.MDMG_() }; }, B0);
  await w.waitForTimeout(300); await w.screenshot({ path: 'dev/out/hienchant_info_staff.png' });
  console.log('staff info', (WI.info.match(/고강화.{0,60}/g) || []).join(' / '), '| char', WI.lab, WI.val);
  ok('지팡이 정보: 마력탄 피해 +12 · 마법 명중 +6 · 마나 흡수 3~4 · MP 3~4 흡수 · 마력탄 안내', /고강화 \+9 보너스: 마력탄 피해 \+12 · 마법 명중 \+6 · 마나 흡수 3~4/.test(WI.info) && /타격 시 MP 3~4 흡수/.test(WI.info) && /마법사 기본 공격은 마력탄\(7칸\)/.test(WI.info));
  ok('지팡이 비교 창: 고강화 마력탄 · 마법 명중 · MP 흡수', /고강화 마력탄\+0\+12\+12/.test(WI.cmp) && /고강화 마법 명중\+0\+6\+6/.test(WI.cmp) && /MP 3~4 흡수/.test(WI.cmp));
  ok('캐릭터 창: 마법사 공격 칸 = 마력탄 (magicDmg)', WI.lab === '마력탄' && WI.val === `${WI.md[0]} ~ ${WI.md[1]}`, [WI.lab, WI.val]);
  await w.evaluate(() => { document.querySelectorAll('.gw').forEach(x => x.hidden = true); document.getElementById('itemwin').hidden = true; const c = document.getElementById('cmpwin'); if (c) c.hidden = true; });
  // 수동: 대상 지정 → 6칸에서 그대로 쏨 (다가가지 않음)
  const MN = await w.evaluate(async () => { const T = __T, H = T.hero; T.GOD_INV = true; T.TOWN.toZone(2); await new Promise(r => { const t = setInterval(() => { if (T.ISLE && T.ISLE.id === 2 && T.SCENE === 'field') { clearInterval(t); r(); } }, 100); }); await new Promise(r => setTimeout(r, 1200));
    let spot = null; for (let r = 0; r < 12 && !spot; r++) for (let dj = -r; dj <= r && !spot; dj++) for (let di = -r; di <= r && !spot; di++) { const i = H.i + di, j = H.j + dj; if (T.walkable_(i, j) && T.walkable_(i + 6, j) && T.DGLOS({ i, j }, { i: i + 6, j })) { let clr = true; for (let k = 1; k < 6; k++) if (!T.walkable_(i + k, j)) clr = false; if (clr) spot = [i, j]; } }
    if (!spot) return { err: 'no spot' }; H.i = H.fi = spot[0]; H.j = H.fj = spot[1]; H.x = spot[0] + 0.5; H.z = spot[1] + 0.5; H.t = 1;
    const f = T.mkMob_('drake', spot[0] + 6, spot[1]); f.max = f.hp = 1e6; f.stunT = 1e6; T.foxes.push(f); H.target = f; const p0 = [H.i, H.j], h0 = f.hp; let bolts = 0; const mon = setInterval(() => { for (const q of T.arrows) if (q.pl && q.kind === 'bolt' && !q._c) { q._c = 1; bolts++; } }, 16);
    await new Promise(r => setTimeout(r, 6000)); clearInterval(mon); const moved = H.i !== p0[0] || H.j !== p0[1]; const res = { moved, dist: Math.max(Math.abs(f.i - H.i), Math.abs(f.j - H.j)), bolts, dmg: (f.dmgBy && f.dmgBy.get(H)) || 0 };   /* 내가 준 피해 (몹 HP는 바뀔 수 있음) */ H.target = null; f.gone = true; f.dead = true; return res; });
  await w.screenshot({ path: 'dev/out/hienchant_manual.png' });
  ok('수동 대상(6칸): 다가가지 않고 마력탄을 쏨', !MN.err && !MN.moved && MN.dist === 6 && MN.bolts >= 3 && MN.dmg > 0, MN);
  // 자동사냥 실제 (몹을 얼림): 공격할 때 거리 · 마력탄 · MISS
  const L = await live(w, ''); console.log('LIVE', JSON.stringify(L));
  ok('자동사냥: 마력탄으로 멀리서(2칸 이상) 공격 · 근접하러 안 감', L.atk >= 6 && L.bolt >= L.atk - 1 && L.far >= L.atk * 0.6 && L.dmax <= 7, L);
  }
  } catch (e) { console.log('TEST ERROR', e.stack); R['테스트 끝까지'] = false; }
  console.log(errs.slice(0, 5).join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); if (errs.length) R['오류 없음'] = false; console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : 'ALL OK'); await b.close(); process.exitCode = bad.length || errs.length ? 1 : 0; })();
