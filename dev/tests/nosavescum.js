// 11/6 결과 먼저 저장 (갈래 work/nosavescum) — KT_PORT=8906 bash dev/runkt.sh dev/tests/nosavescum.js
// 운이 갈리는 결과(강화 증발·강화 수치·뽑은 카드·주머니·연금술)는 계정 서버에 저장이 끝난 뒤에만 화면·채팅·가방에 보임 → 결과를 보고 꺼서 되돌리기 막기
// 테스트 페이지(DEMO_MODE)는 원래 바로 보여 주므로 window.__RS_TEST + 가짜 계정 서버(CLOUD.get/set을 메모리로 · 저장 지연 __FS.sd · 실패 __FS.fail)로 시험
// ⓐ 저장 중엔 결과 안 보임 ⓑ 저장 뒤 보임 ⓒ 저장 실패 = 계속 숨김 + 다시 시도 ⓓ 오프라인이면 시작이 막힘 ⓔ 로컬(이 기기 저장)은 바로 ⓕ 일괄 강화·11회 뽑기 = 한 번(묶음마다 한 번) 저장 ⓖ 오류 없음
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m, x) => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + m + (x !== undefined ? '  ' + (typeof x === 'string' ? x : JSON.stringify(x)) : '')); };
const FAKE = () => { window.__RS_TEST = true; const F = window.__FS = { db: {}, sd: 0, fail: false, sets: [], nowN: 0 };
  const iv = setInterval(() => { const T = window.__T; if (!T || !T.CLOUD || !T.SAVE) return; clearInterval(iv); const C = T.CLOUD, S = T.SAVE;
    const W = ms => new Promise(r => setTimeout(r, ms)), bad = () => { if (F.fail) { const e = new Error('Failed to fetch'); e.status = 0; throw e; } }, key = p => String(p).split('?')[0];
    Object.assign(C, { ping: async () => true, signUp: async () => {}, signIn: async () => {}, on: () => true, uid: () => 'u_rs', session: () => null,
      get: async p => { await W(5); bad(); const v = F.db[key(p)]; return v ? Object.assign({}, v) : null; },
      set: async (p, o, merge) => { await W(F.sd); bad(); const k = key(p); F.db[k] = merge ? Object.assign({}, F.db[k] || {}, o) : Object.assign({}, o); F.sets.push({ k, at: Date.now() }); return 'ut' + F.sets.length; },
      create: async (p, o) => { await W(5); bad(); const k = key(p); if (F.db[k]) return false; F.db[k] = o; return true; },
      del: async p => { delete F.db[key(p)]; return true; }, beacon: () => true, list: async () => [], query: async () => [] });
    const n0 = S.now; S.now = (...a) => { F.nowN++; return n0(...a); }; }, 2); };   // nowN: 밖에서 부른 저장 수 (RSAVE · 20초 자동 저장은 안 셈)
const B0 = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
(async () => { const br = await chromium.launch(); const errs = [];
  const ctx = await br.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push('A: ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await login(p, { cls: 'knight', name: 'rsA', init: FAKE });
  const s0 = await p.evaluate(() => ({ mode: __T.ACCOUNT.mode(), need: __RS.need(), on: __T.SAVE.on(), cloud: __T.SAVE.cloud() }));
  ok(s0.mode === 'cloud' && s0.need && s0.cloud, '준비: 가짜 계정 서버로 로그인 (cloud) · 결과 먼저 저장 켜짐', s0);
  await p.evaluate(B0 => { const T = __T, I = T.INV; T.hero.lv = 50; T.setCoins(5e7);
    I.load({ bag: [{ id: 'dv_sword', n: 1, en: 6 }, { id: 'plate_armor', n: 1, en: 4, on: 'armor' }, { id: 'scroll_weapon', n: 50 }, { id: 'scroll_armor', n: 80 }, { id: 'bless_scroll', n: 10 }, { id: 'arka_pouch', n: 5 }, { id: 'red_potion', n: 10 }], bonus: B0 });
    if (document.getElementById('invwin').hidden) I.toggleWin('invwin'); I.render(); }, B0);
  await p.evaluate(() => __T.SAVE.now(true, true)); await p.waitForTimeout(300);
  const chat = q => q.evaluate(() => { const L = __T.log; return L.slice(L.indexOf(window.__lm) + 1).map(l => l.t || ''); });   // 채팅 기록은 길이 제한(앞에서 빠짐)이 있어 표시(__lm) 뒤의 줄만
  const L0 = () => p.evaluate(() => { window.__lm = __T.log[__T.log.length - 1]; return 0; });

  // ===== ⓐⓑ 강화 창 단일 강화 (+6 무기 → 위험) · 증발 · 저장 2.5초
  await p.evaluate(() => { __FS.sd = 2500; const T = __T, I = T.INV, bag = I.bag(), e = bag.find(x => x.id === 'dv_sword'); if (document.getElementById('bulkwin').hidden) I.bulkOpen(); I.render();
    document.querySelectorAll('#inv-grid > button')[bag.indexOf(e)].click(); });
  await p.waitForTimeout(200);
  let lg = await L0(); const a0 = await p.evaluate(() => { const T = __T, I = T.INV, e = I.bag().find(x => x.id === 'dv_sword'); window.__a1 = { e, g0: document.getElementById('inv-grid').innerHTML, sc0: I.count('scroll_weapon'), sets0: __FS.sets.length, n0: __FS.nowN };
    const R0 = Math.random; Math.random = () => 0.99; try { document.getElementById('en-go').click(); const y = document.getElementById('ask-yes'); if (y && !document.getElementById('askwin').hidden) y.onclick(); } finally { Math.random = R0; }
    return { inBag: I.bag().includes(e), one: !!document.getElementById('en-item').classList.contains('on') }; });
  await p.waitForTimeout(1700);
  const a1 = await p.evaluate(() => { const T = __T, I = T.INV, A = window.__a1; return { inBag: I.bag().includes(A.e), gridSame: document.getElementById('inv-grid').innerHTML === A.g0, slide: !document.getElementById('ef-slide').hidden, fx: !document.getElementById('enh-fx').hidden,
    title: document.getElementById('ef-title').textContent, sub: document.getElementById('ef-sub').textContent, pill: (document.getElementById('rs-pill') || {}).textContent || '', cover: !!document.querySelector('#invwin > .rs-cover'), held: __RS.held(), unsaved: __RS.unsaved() }; });
  await p.screenshot({ path: 'dev/out/nosavescum_1_enhfx.png' });
  const c1 = await chat(p); console.log('ⓐ mid', JSON.stringify(a1), JSON.stringify(c1));
  ok(!a1.inBag && a1.gridSame && a1.fx && !a1.slide && !a1.title && a1.unsaved && a1.cover && /기록 중/.test(a1.pill) && !c1.some(t => /증발|빛납니다/.test(t)), 'ⓐ 단일 강화(증발): 저장 중엔 가방 그림 그대로 · [밀어서 결과 보기] 안 나옴 · 채팅 없음 · 가방 창 \'기록 중…\'으로 덮음');
  await p.waitForFunction(() => !__RS.unsaved(), null, { timeout: 15000 }); await p.waitForTimeout(150);
  const a2 = await p.evaluate(() => { const d = JSON.parse(__FS.db['users/u_rs/chars/knight'].data); return { saved: !d.inv.bag.some(x => x.id === 'dv_sword'), slide: !document.getElementById('ef-slide').hidden, cover: !!document.querySelector('#invwin > .rs-cover'), held: __RS.held(), saves: __FS.nowN - window.__a1.n0 }; });
  ok(a2.saved && a2.slide && !a2.cover && a2.held && a2.saves === 1, 'ⓑ 저장 끝 (서버 문서에서 무기 빠짐 · 저장 1번) → [밀어서 결과 보기]가 나옴 (아직 결과는 안 열림)', a2);
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500);
  const a3 = await p.evaluate(() => ({ title: document.getElementById('ef-title').textContent, held: __RS.held(), gridHas: document.getElementById('inv-grid').innerHTML !== window.__a1.g0 })); const c3 = await chat(p);
  ok(a3.title === '강화 실패' && !a3.held && a3.gridHas && c3.some(t => /증발되어 사라집니다/.test(t)), 'ⓑ 밀어서 결과 → 강화 실패 · 증발 채팅 · 가방 다시 그림', { a3, c3 });
  await p.waitForTimeout(700); await p.keyboard.press('Enter'); await p.waitForTimeout(300);

  // ===== ⓒ 주문서 클릭 강화 (착용 +4 갑옷 → 위험) · 성공 · 저장 실패 → 숨김 + 다시 시도
  await p.evaluate(() => { __FS.sd = 0; __FS.fail = false; }); lg = await L0();
  const b1 = await p.evaluate(async () => { const T = __T, I = T.INV, e = I.bag().find(x => x.id === 'plate_armor'); const n0 = __FS.nowN;
    I.setHot(11, 'scroll_armor'); I.useHot(11); I.applyScroll(e); __FS.fail = true;
    const R0 = Math.random; Math.random = () => 0; try { document.getElementById('ask-yes').onclick(); } finally { Math.random = R0; }
    const en = e.en, shown = I.enOf('armor'), glow = T.ITEMS && I.equipped('armor'); await new Promise(r => setTimeout(r, 3300));
    return { en, shown, shown2: I.enOf('armor'), eq: glow, st: __RS.state(), pill: (document.getElementById('rs-pill') || {}).textContent || '', cover: (document.querySelector('#invwin > .rs-cover') || {}).textContent || '', offline: T.SAVE.offline(), n: __FS.nowN - n0 }; });
  await p.screenshot({ path: 'dev/out/nosavescum_2_retry.png' });
  const cb1 = await chat(p); console.log('ⓒ fail', JSON.stringify(b1), JSON.stringify(cb1));
  ok(b1.en === 5 && b1.shown === 4 && b1.shown2 === 4 && b1.eq === 'plate_armor' && b1.st.fails >= 1 && b1.n >= 2 && /인터넷 연결/.test(b1.pill) && /인터넷 연결/.test(b1.cover) && !cb1.some(t => /빛납니다/.test(t)), 'ⓒ 저장 실패: 결과(+5) 숨김 · 착용 강화 빛은 +4 그대로 · 2.5초마다 다시 저장 · \'저장 확인 중 — 인터넷 연결을 확인해 주세요\'');
  await p.evaluate(() => { __FS.fail = false; }); await p.waitForFunction(() => !__RS.held(), null, { timeout: 10000 }); await p.waitForTimeout(100);
  const b2 = await p.evaluate(() => ({ shown: __T.INV.enOf('armor'), offline: __T.SAVE.offline(), pill: !!document.getElementById('rs-pill'), saved: JSON.parse(__FS.db['users/u_rs/chars/knight'].data).inv.bag.find(x => x.id === 'plate_armor').en })); const cb2 = await chat(p);
  ok(b2.shown === 5 && b2.saved === 5 && !b2.offline && !b2.pill && cb2.some(t => /빛납니다/.test(t)), 'ⓒ 인터넷이 돌아와 저장되면 결과(+5)를 보여 줌', { b2, last: cb2.slice(-1) });

  // ===== ⓓ 오프라인(최근 저장 실패)이면 시작이 막힘
  await p.evaluate(async () => { __FS.fail = true; await __T.SAVE.now(false, true); }); lg = await L0();
  const d1 = await p.evaluate(() => { const T = __T, I = T.INV, e = I.bag().find(x => x.id === 'plate_armor'), sc = I.count('scroll_armor'), en = e.en, c0 = T.coins, cards = JSON.stringify(PCG.state().cards);
    I.setHot(11, 'scroll_armor'); I.useHot(11); I.applyScroll(e); const ask = !document.getElementById('askwin').hidden; if (ask) document.getElementById('ask-yes').onclick();
    const r = PCG.draw(1); return { offline: T.SAVE.offline(), ask, sc: I.count('scroll_armor') === sc, en: e.en === en, draw: r, coins: T.coins === c0, cards: JSON.stringify(PCG.state().cards) === cards, held: __RS.held() }; });
  const cd1 = await chat(p); console.log('ⓓ', JSON.stringify(d1), JSON.stringify(cd1));
  ok(d1.offline && !d1.ask && d1.sc && d1.en && d1.draw === null && d1.coins && d1.cards && !d1.held && cd1.some(t => /인터넷 연결이 없어서 지금은 강화를 할 수 없어요/.test(t)), 'ⓓ 오프라인: 강화·뽑기 시작이 막힘 (주문서·골드·카드 그대로 · 안내 문구)');
  await p.evaluate(async () => { __FS.fail = false; await __T.SAVE.now(false, true); }); ok(!(await p.evaluate(() => __T.SAVE.offline())), 'ⓓ 연결되면 다시 됨');

  // ===== ⓕ 변신 카드 11회 뽑기: 한 번 저장 → 묶어서 공개 (모션 스킵 = 채팅)
  await p.evaluate(() => { PCG.setSkip(true); PCG.openWin && PCG.openWin(); }); await p.waitForTimeout(300); lg = await L0();
  const g1 = await p.evaluate(() => { __FS.sd = 1500; const T = __T; window.__g = { n0: __FS.nowN, res0: document.getElementById('pw-res').innerHTML, c0: JSON.stringify(PCG.state().cards) };
    const r = PCG.draw(11); return { n: r && r.length, busy: PCG.busy(), cardsChanged: JSON.stringify(PCG.state().cards) !== window.__g.c0, last: !!(PCG.lastRes() && PCG.lastRes().L && PCG.lastRes().L.length === 11) }; });
  await p.waitForTimeout(900);
  const g2 = await p.evaluate(() => ({ busy: PCG.busy(), resSame: document.getElementById('pw-res').innerHTML === window.__g.res0, cover: (document.querySelector('#polywin > .rs-cover') || {}).textContent || '', again: PCG.draw(1) })); const cg2 = await chat(p);
  await p.screenshot({ path: 'dev/out/nosavescum_3_gacha.png' });
  ok(g1.n === 11 && g1.busy && g1.cardsChanged && g2.busy && g2.resSame && /기록 중/.test(g2.cover) && g2.again === null && !cg2.some(t => /11회 뽑기/.test(t)), 'ⓐ 11회 뽑기: 저장 중엔 창·채팅에 결과 없음 · 다음 뽑기 막힘 (카드는 이미 저장 내용에 들어감)', { g1, g2 });
  await p.waitForFunction(() => !__RS.held() && !PCG.busy(), null, { timeout: 15000 }); await p.waitForTimeout(150);
  const g3 = await p.evaluate(() => { const d = JSON.parse(__FS.db['users/u_rs'].polyCards); return { n: __FS.nowN - window.__g.n0, saved: JSON.stringify(d.cards) === JSON.stringify(PCG.state().cards), res: document.getElementById('pw-res').innerHTML !== window.__g.res0 }; }); const cg3 = await chat(p);
  ok(g3.n === 1 && g3.saved && g3.res && cg3.some(t => /11회 뽑기/.test(t)), 'ⓕ 11회 뽑기 = 저장 1번 → 저장 뒤 한 번에 공개 (채팅·최근 결과)', { g3, chat: cg3.filter(t => /뽑기/.test(t)).map(t => t.slice(0, 60)) });

  // ===== 마법인형 1회 뽑기 (같은 방식)
  lg = await L0(); const h1 = await p.evaluate(() => { __FS.sd = 800; DCG.setSkip(true); window.__h = __FS.nowN; const r = DCG.draw(1); return { r: !!r, busy: DCG.busy() }; }); const ch1 = await chat(p);
  await p.waitForFunction(() => !__RS.held() && !DCG.busy(), null, { timeout: 15000 }); const ch2 = await chat(p);
  ok(h1.r && h1.busy && !ch1.some(t => /1회 뽑기/.test(t)) && ch2.some(t => /마법인형\] 1회 뽑기/.test(t)), '마법인형 뽑기도 저장 뒤 공개', ch2.slice(-1));

  // ===== 주머니 (아르카의 마법주머니)
  lg = await L0(); const q1 = await p.evaluate(() => { __FS.sd = 900; const I = __T.INV, e = I.bag().find(x => x.id === 'arka_pouch'); I.use(e); return { left: I.count('arka_pouch') }; }); const cq1 = await chat(p);
  await p.waitForFunction(() => !__RS.held(), null, { timeout: 15000 }); const cq2 = await chat(p);
  ok(q1.left === 4 && !cq1.some(t => /마법주머니를 열었습니다/.test(t)) && cq2.some(t => /마법주머니를 열었습니다/.test(t)), '주머니: 저장 뒤에 무엇이 나왔는지 보여 줌', cq2.slice(-1));

  // ===== 축복 부여 주문서 (실패 · 저장 뒤 공개)
  lg = await L0(); const w1 = await p.evaluate(() => { __FS.sd = 900; const T = __T, I = T.INV; I.load({ bag: I.dump().bag.concat([{ id: 'leather_armor', n: 1 }]), bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); const e = I.bag().find(x => x.id === 'leather_armor');
    I.use(I.bag().find(x => x.id === 'bless_scroll')); const R0 = Math.random; Math.random = () => 0.99; try { I.applyScroll(e); } finally { Math.random = R0; } return { held: __RS.held() }; }); const cw1 = await chat(p);
  await p.waitForFunction(() => !__RS.held(), null, { timeout: 15000 }); const cw2 = await chat(p);
  ok(w1.held && !cw1.some(t => /축복 부여 실패/.test(t)) && cw2.some(t => /축복 부여 실패/.test(t)), '축복 부여: 저장 뒤 결과', cw2.slice(-1));

  // ===== ⓕ 일괄 강화: 방어구 6개 +4 → +6 · 묶음(증발까지)마다 저장 1번
  await p.evaluate(B0 => { __FS.sd = 600; const T = __T, I = T.INV; I.load({ bag: [{ id: 'plate_armor', n: 1, en: 4 }, { id: 'plate_armor', n: 1, en: 4 }, { id: 'plate_armor', n: 1, en: 4 }, { id: 'plate_armor', n: 1, en: 4 }, { id: 'plate_armor', n: 1, en: 4 }, { id: 'plate_armor', n: 1, en: 4 }, { id: 'scroll_armor', n: 80 }], bonus: B0 }); I.render();
    const w = document.getElementById('bulkwin'); if (w.hidden) I.bulkOpen(); w.querySelector('[data-et="multi"]').click(); }, B0);
  await p.waitForTimeout(200);
  await p.evaluate(() => { const I = __T.INV, bag = I.bag(), e = bag.find(x => x.id === 'plate_armor'); document.querySelectorAll('#inv-grid > button')[bag.indexOf(e)].click(); document.getElementById('en-same').click(); document.querySelector('#en-goals [data-g="6"]').click(); });
  await p.waitForTimeout(200);
  const m0 = await p.evaluate(() => { window.__m = { n0: __FS.nowN, g0: __RS.state().gen }; document.getElementById('en-mgo').click(); const y = document.getElementById('ask-yes'); if (!document.getElementById('askwin').hidden) y.onclick(); window.__m.grid = document.getElementById('inv-grid').innerHTML; return { list: document.querySelectorAll('#en-mlist .en-mi').length }; });
  await p.waitForTimeout(320);
  const m1 = await p.evaluate(() => ({ dbg: (() => { const N = s => s.replace(/(id="|url\(#)[\w-]+/g, '').replace(/<svg.*?<\/svg>/g, 'SVG'), a = N(window.__m.grid), b = N(document.getElementById('inv-grid').innerHTML); let i = 0; while (i < a.length && a[i] === b[i]) i++; return a === b ? '' : a.slice(Math.max(0, i - 150), i + 150) + ' ||| ' + b.slice(Math.max(0, i - 150), i + 150); })(), gridSame: window.__m.grid.replace(/(id="|url\(#)[\w-]+/g, '') === document.getElementById('inv-grid').innerHTML.replace(/(id="|url\(#)[\w-]+/g, ''),   /* 그림 id(그릴 때마다 새 번호)는 빼고 비교 */ rolled: __T.INV.bag().filter(x => x.id === 'plate_armor' && x.en !== 4).length + (6 - __T.INV.bag().filter(x => x.id === 'plate_armor').length), log: [...document.querySelectorAll('#en-mlog li')].map(x => x.textContent), cover: (document.querySelector('#bulkwin > .rs-cover') || {}).textContent || '', unsaved: __RS.unsaved() }));
  await p.screenshot({ path: 'dev/out/nosavescum_4_bulk.png' });
  ok(m0.list === 6 && m1.unsaved && m1.rolled >= 1 && m1.gridSame && /기록 중/.test(m1.cover) && !m1.log.some(t => /→|쪼개져/.test(t)), 'ⓐ 일괄 강화: 첫 묶음을 굴려 저장하는 중엔 결과 줄이 없고 가방 그림도 그대로 · 창 \'기록 중…\'', m1);
  { const t0 = Date.now(); while (Date.now() - t0 < 90000 && await p.evaluate(() => document.getElementById('en-mgo').textContent === '중지')) await p.waitForTimeout(300); }
  const m2 = await p.evaluate(() => { const hd = document.querySelector('#en-mlog li.hd').textContent, used = +(hd.match(/주문서 (\d+)장/) || [])[1], boom = +(hd.match(/증발 (\d+)개/) || [])[1], left = __T.INV.bag().filter(x => x.id === 'plate_armor').length, d = JSON.parse(__FS.db['users/u_rs/chars/knight'].data);
    return { hd, used, boom, left, savedLeft: d.inv.bag.filter(x => x.id === 'plate_armor').length, saves: __FS.nowN - window.__m.n0, chunks: __RS.state().gen - window.__m.g0, held: __RS.held(), lines: document.querySelectorAll('#en-mlog li').length }; });
  console.log('ⓕ bulk', JSON.stringify(m2));
  ok(m2.left === 6 - m2.boom && m2.savedLeft === m2.left && m2.saves === m2.chunks && m2.chunks >= 1 && m2.chunks <= m2.used && m2.chunks <= m2.boom + Math.ceil((m2.used - m2.boom) / 6) + 1 && !m2.held, `ⓕ 일괄 강화: 위험 강화 ${m2.used}번 · 저장 ${m2.saves}번 = 묶음 ${m2.chunks}개 (증발 ${m2.boom}개 — 증발이 나오면 묶음이 끝남 · 최대 6번씩) · 서버 문서와 가방 일치`);

  // ===== 연금술 (일반 3개 → 고급 · 돌아가는 연출 1.3초 + 저장 2초)
  await p.evaluate(B0 => { __FS.sd = 2000; const T = __T, L = Object.keys(T.ITEMS).filter(k => { const d = T.ITEMS[k]; return d.slot && d.slot !== 'doll' && (d.rar || '일반') === '일반' && !d.hidden; }).slice(0, 3);
    T.INV.load({ bag: L.map(id => ({ id, n: 1 })), bonus: B0 }); T.INV.render(); }, B0);
  await p.evaluate(() => { for (const id of ['polywin', 'dollwin', 'bulkwin']) { const w = document.getElementById(id); if (w) w.hidden = true; } document.getElementById('btn-alch').click(); }); await p.waitForTimeout(300); await p.click('#alchwin [data-alg="일반"]'); await p.waitForTimeout(150);
  lg = await L0(); await p.evaluate(() => { document.getElementById('al-go').click(); document.getElementById('ask-yes').onclick(); }); await p.waitForTimeout(1600);
  const al1 = await p.evaluate(() => ({ out: document.getElementById('al-out').textContent, cover: !!document.querySelector('#alchwin > .rs-cover'), unsaved: __RS.unsaved() })); const cal1 = await chat(p);
  await p.waitForFunction(() => !__RS.held(), null, { timeout: 15000 }); await p.waitForTimeout(150); const cal2 = await chat(p);
  ok(al1.unsaved && al1.cover && al1.out === '…' && !cal1.some(t => /연금술/.test(t)) && cal2.some(t => /연금술/.test(t) || /재료가 모두 사라졌습니다/.test(t)), '연금술: 연출이 끝나도 저장 전엔 결과 없음 → 저장 뒤 결과', { al1, last: cal2.slice(-1) });
  await p.evaluate(() => { const w = document.getElementById('alchwin'); if (w) w.hidden = true; });

  // ===== 저장이 6초 넘게 안 되면 강화 연출을 [닫기] → 저장되면 채팅으로 결과
  await p.evaluate(B0 => { __FS.sd = 0; const I = __T.INV; I.load({ bag: [{ id: 'dv_sword', n: 1, en: 7 }, { id: 'scroll_weapon', n: 5 }], bonus: B0 }); I.render(); const w = document.getElementById('bulkwin'); if (w.hidden) I.bulkOpen(); w.querySelector('[data-et="one"]').click(); }, B0);
  await p.waitForTimeout(200); lg = await L0();
  await p.evaluate(() => { const I = __T.INV, bag = I.bag(), e = bag.find(x => x.id === 'dv_sword'); document.querySelectorAll('#inv-grid > button')[bag.indexOf(e)].click(); });
  await p.waitForTimeout(150);
  await p.evaluate(() => { const R0 = Math.random; Math.random = () => 0; try { document.getElementById('en-go').click(); __FS.fail = true; document.getElementById('ask-yes').onclick(); } finally { Math.random = R0; } });
  await p.waitForTimeout(6400);
  const x1 = await p.evaluate(() => ({ btn: document.getElementById('ef-btn').hidden ? '' : document.getElementById('ef-btn').textContent, slide: !document.getElementById('ef-slide').hidden, sub: document.getElementById('ef-sub').textContent }));
  await p.screenshot({ path: 'dev/out/nosavescum_5_close.png' });
  if (x1.btn) await p.click('#ef-btn'); await p.waitForTimeout(300);
  const x2 = await p.evaluate(() => ({ fx: !document.getElementById('enh-fx').hidden, held: __RS.held() })); const cx2 = await chat(p);
  await p.evaluate(() => { __FS.fail = false; }); await p.waitForFunction(() => !__RS.held(), null, { timeout: 10000 }); await p.waitForTimeout(150); const cx3 = await chat(p);
  ok(x1.btn === '닫기' && !x1.slide && !x2.fx && x2.held && !cx2.some(t => /빛납니다/.test(t)) && cx3.some(t => /빛납니다/.test(t)), '저장이 오래 안 되면 [닫기] (결과는 안 보임) → 저장되면 채팅으로 결과', { x1, x2, last: cx3.slice(-1) });

  // ===== 그 밖의 대상: 장비 변경(착용 중 · 모습 그대로) · 속성 강화 · 자동 합성 · 마일리지 전설
  lg = await L0(); const o1 = await p.evaluate(B0 => { __FS.sd = 1000; const T = __T, I = T.INV; T.hero.lv = 55; I.load({ bag: [{ id: 'lg_sword', n: 1, en: 3, on: 'weapon' }, { id: 'eq_change', n: 3 }, { id: 'dv_sword', n: 1, en: 2 }, { id: 'scroll_fire', n: 3 }], bonus: B0 }); I.render();
    const e = I.bag().find(x => x.id === 'lg_sword'); I.use(I.bag().find(x => x.id === 'eq_change')); I.applyScroll(e); const R0 = Math.random; Math.random = () => 0.5; try { document.getElementById('ask-yes').onclick(); } finally { Math.random = R0; }
    return { id: e.id, shown: I.equipped('weapon'), held: __RS.held() }; }, B0); const co1 = await chat(p);
  await p.waitForFunction(() => !__RS.held(), null, { timeout: 15000 }); await p.waitForTimeout(100);
  const o2 = await p.evaluate(() => ({ shown: __T.INV.equipped('weapon'), id: __T.INV.bag().find(x => x.id.startsWith('lg_')).id })); const co2 = await chat(p);
  ok(o1.held && o1.id === 'lg_bow' && o1.shown === 'lg_sword' && !co1.some(t => /\[전설\] 진명황의 집행검 →/.test(t)) && co2.some(t => /\[전설\] 진명황의 집행검 →/.test(t)) && o2.shown === null, '장비 변경(착용 중 집행검 → 활): 저장 전엔 모습 그대로(집행검) · 채팅 없음 → 저장 뒤 결과 · 다른 직업 무기라 벗음', { o1, o2, last: co2.slice(-1) });
  lg = await L0(); const t1 = await p.evaluate(() => { __FS.sd = 800; const I = __T.INV, e = I.bag().find(x => x.id === 'dv_sword'); I.use(I.bag().find(x => x.id === 'scroll_fire')); const R0 = Math.random; Math.random = () => 0; try { I.applyScroll(e); } finally { Math.random = R0; } return { attr: e.attr, held: __RS.held() }; }); const ct1 = await chat(p);
  await p.waitForFunction(() => !__RS.held(), null, { timeout: 15000 }); const ct2 = await chat(p);
  ok(t1.held && t1.attr && t1.attr.lv === 1 && !ct1.some(t => /기운이 깃듭니다/.test(t)) && ct2.some(t => /기운이 깃듭니다/.test(t)), '속성 강화: 저장 뒤 결과', ct2.slice(-1));
  lg = await L0(); const y1 = await p.evaluate(() => { __FS.sd = 800; const S = PCG.state(), c = PCG.K.CARDS.filter(x => x.g === '일반'); for (const x of c) delete S.lock[x.id]; S.cards[c[0].id] = (S.cards[c[0].id] || 0) + 8; const n0 = __FS.nowN; const out = PCG.autoSyn(); return { n: out && out.length, busy: PCG.busy(), n0 }; }); const cy1 = await chat(p);
  await p.waitForFunction(() => !__RS.held() && !PCG.busy(), null, { timeout: 15000 }); const cy2 = await chat(p); const yN = await p.evaluate(n0 => __FS.nowN - n0, y1.n0);
  ok(y1.n >= 2 && y1.busy && !cy1.some(t => /자동 합성 —/.test(t)) && cy2.some(t => /자동 합성 —/.test(t)) && yN === 1, `자동 합성(${y1.n}번): 저장 1번 뒤 결과`, cy2.slice(-1));
  lg = await L0(); const z1 = await p.evaluate(() => { __FS.sd = 800; PCG.state().mile = 1000; const r = PCG.mileDo(); return { r: !!r, busy: PCG.busy(), mile: PCG.state().mile }; }); const cz1 = await chat(p);
  await p.waitForFunction(() => !__RS.held() && !PCG.busy(), null, { timeout: 15000 }); const cz2 = await chat(p);
  ok(z1.r && z1.busy && z1.mile === 0 && !cz1.some(t => /마일리지 전설 받기/.test(t)) && cz2.some(t => /마일리지 전설 받기/.test(t)), '마일리지 전설: 저장 뒤 결과', cz2.slice(-1));

  // ===== ⓔ 로컬(이 기기 저장) 계정: 지금처럼 바로
  const ctx2 = await br.newContext({ viewport: { width: 1280, height: 800 } }); const q = await ctx2.newPage(); q.on('pageerror', e => errs.push('B: ' + e.message));
  await login(q, { cls: 'knight', name: 'rsB' });
  const e1 = await q.evaluate(B0 => { const T = __T, I = T.INV; T.setCoins(1e7); I.load({ bag: [{ id: 'plate_armor', n: 1, en: 5 }, { id: 'scroll_armor', n: 5 }], bonus: B0 }); I.render(); const e = I.bag().find(x => x.id === 'plate_armor'), l0 = T.log.length;
    I.setHot(11, 'scroll_armor'); I.useHot(11); I.applyScroll(e); const R0 = Math.random; Math.random = () => 0.99; try { document.getElementById('ask-yes').onclick(); } finally { Math.random = R0; }
    const c1 = T.log.slice(l0).map(l => l.t), gone = !I.bag().includes(e); PCG.setSkip(true); const r = PCG.draw(1), c2 = T.log.slice(l0).map(l => l.t);
    return { mode: T.ACCOUNT.mode(), need: window.__RS ? __RS.need() : null, gone, boomNow: c1.some(t => /증발/.test(t)), draw: !!r, drawNow: c2.some(t => /1회 뽑기/.test(t)), held: __RS.held(), pill: !!document.getElementById('rs-pill') }; }, B0);
  ok(e1.mode !== 'cloud' && e1.need === false && e1.gone && e1.boomNow && e1.draw && e1.drawNow && !e1.held && !e1.pill, 'ⓔ 로컬 저장 계정: 강화 증발·뽑기 결과가 바로 보임 (기다림 없음)', e1);

  ok(!errs.length, 'ⓖ 오류 없음', errs.slice(0, 5));
  console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await br.close(); process.exit(fails ? 1 : 0); })().catch(e => { console.error(e); process.exit(1); });
