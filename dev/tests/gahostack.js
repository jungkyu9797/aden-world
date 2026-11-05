// 11/5 프로듀서: 가호 완제는 같은 종류끼리 가방(·창고) 칸 하나로 묶어 보이고 개수 표시 · 효과는 가장 높은 것 하나만
//   python3 dev/mkkt.py && KT_PORT=8894 bash dev/runkt.sh dev/tests/gahostack.js
// ① 가호 탭: 드킹 4개(+3 축복 · +0 ×3) + 다른 가호 2개 → 3칸 · 드킹 칸 개수 4 · 대표 +3 축복 · 툴팁/정보창 요약 · 탭 개수
// ② 효과 INV.gaho 그대로 (가장 높은 것 하나) ③ 창고 맡기기(우클릭·끌기)는 +0부터 · 창고도 한 칸 + 개수 · 꺼낼 땐 가장 높은 것부터
// ④ 휴지통으로 끌면 가장 낮은 것 ⑤ 칸끼리 끌기 = 묶음 통째로 ⑥ 축복 주문서 대상 = 대표 ⑦ 제작 장인 [가호 조합] 그대로 ⑧ 오류 없음
// 스크린샷 dev/out/gahostack.png (가방 가호 탭) · gahostack_info.png (정보창) · gahostack_all.png (전체 탭) · gahostack_store.png (창고)
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  try {
  await login(p, { cls: 'knight', name: 'gStk' });
  const BAG = [{ id: 'gaho_drake_king', n: 1 }, { id: 'red_potion', n: 5 }, { id: 'gaho_drake_king', n: 1, en: 3, blessed: true }, { id: 'gaho_ice_queen', n: 1, en: 1 }, { id: 'gaho_drake_king', n: 1 }, { id: 'gaho_ogre', n: 1 }, { id: 'gaho_drake_king', n: 1 }, { id: 'bless_scroll', n: 3 }];
  const loadBag = L => p.evaluate(L => { const T = __T; T.INV.load({ bag: JSON.parse(JSON.stringify(L)), bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); T.INV.render(); }, L);
  await loadBag(BAG);
  await p.evaluate(() => { const T = __T; if (document.getElementById('invwin').hidden) T.INV.toggleWin('invwin'); document.querySelector('#inv-tabs button[data-t="gaho"]').click(); });
  await p.waitForTimeout(300);
  const cellInfo = () => p.evaluate(() => [...document.querySelectorAll('#inv-grid .slot')].filter(c => c.dataset.itip).map(c => ({ name: c.dataset.itip.split('\n')[0], n: (c.querySelector(':scope > b') || {}).textContent || '', en: (c.querySelector('i.en') || {}).textContent || '', bl: c.classList.contains('blessed'), tip: c.dataset.itip })));
  // ① 가호 탭
  const C1 = await cellInfo(); console.log(JSON.stringify(C1.map(c => [c.name, c.n, c.en, c.bl])));
  const dk = C1.find(c => /드레이크 킹의 가호/.test(c.name));
  ok(C1.length === 3, `가호 탭 3칸 (드킹 묶음 · 얼음여왕 · 오우거) — ${C1.length}칸`);
  ok(dk && dk.n === '4', `드킹 칸 개수 4 (${dk && dk.n})`);
  ok(dk && dk.en === '+3' && dk.bl, `드킹 칸 대표 = +3 축복 (en ${dk && dk.en} · 축복 ${dk && dk.bl})`);
  ok(dk && /\(4\) \[영웅\]$/.test(dk.name), `드킹 칸 이름 줄에 (4): ${dk && dk.name}`);
  ok(dk && dk.tip.includes('같은 가호 4개 — 적용: +3 축복 (가장 높은 것 하나만) · 나머지: +0 ×3'), '툴팁 요약 줄');
  const oth = C1.filter(c => c !== dk); ok(oth.every(c => c.n === ''), '다른 가호(1개)는 개수 표시 없음');
  const cnt = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#inv-tabs button')].map(b => [b.dataset.t, (b.querySelector('small') || {}).textContent || ''])));
  console.log('tab cnt', JSON.stringify(cnt)); ok(cnt.gaho === '3', `탭 개수: 가호 3 (${cnt.gaho})`);
  // ② 효과 그대로
  const G1 = await p.evaluate(() => { const T = __T, I = T.INV; const v = I.bag().filter(e => e.id === 'gaho_drake_king').map(e => I.gahoVal(e)); return { exp: I.gaho('exp'), want: Math.max(...v), dmg: I.gaho('dmg'), w: I.gaho('w') }; });
  console.log('gaho', JSON.stringify(G1)); ok(G1.exp === 5 && G1.want === 5 && G1.dmg === 2 && G1.w === 1, '효과: 드킹 +5% (가장 높은 것 하나만) · 얼음여왕 +2% · 오우거 +1%');
  await (await p.$('#invwin')).screenshot({ path: 'dev/out/gahostack.png' });   // 가방 가호 탭 (묶음 칸 · 개수)
  // 정보창 (꾹 누르기)
  { const bx = await p.evaluate(k => { const r = document.querySelectorAll('#inv-grid .slot[data-itip]')[k].getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; }, C1.indexOf(dk)); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.mouse.down(); await p.waitForTimeout(600); await p.mouse.up(); await p.waitForTimeout(200); }
  const W1 = await p.evaluate(() => { const w = document.getElementById('itemwin'); return { vis: !w.hidden, txt: w.innerText.replace(/\s+/g, ' ') }; });
  console.log('detail', W1.txt.slice(0, 300)); ok(W1.vis && /\+3 축복받은 드레이크 킹의 가호|축복받은.*\+3|\+3.*드레이크 킹/.test(W1.txt) && /4개/.test(W1.txt) && /같은 가호 4개 — 적용: \+3 축복/.test(W1.txt) && /가지고 있어서 적용 중/.test(W1.txt), '정보창: 대표(+3 축복) 정보 + 4개 + 요약 + 적용 중');
  await p.screenshot({ path: 'dev/out/gahostack_info.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  // 전체 탭: 드킹은 처음 나온 자리(0번)에 한 칸 · 전체 개수 = 칸 수
  await p.evaluate(() => document.querySelector('#inv-tabs button[data-t="all"]').click()); await p.waitForTimeout(250);
  const A1 = await cellInfo(); console.log('all', JSON.stringify(A1.map(c => [c.name.slice(0, 18), c.n])));
  const cntA = await p.evaluate(() => (document.querySelector('#inv-tabs button[data-t="all"] small') || {}).textContent);
  ok(/드레이크 킹/.test(A1[0].name) && A1[0].n === '4' && A1.filter(c => /드레이크 킹/.test(c.name)).length === 1, '전체 탭: 드킹 한 칸 (첫 자리)');
  ok(+cntA === A1.length && A1.length === 6, `전체 탭 개수 = 칸 수 (${cntA} / ${A1.length}) · 귀환 부적 포함 6칸`);
  await p.screenshot({ path: 'dev/out/gahostack_all.png' });
  // ⑤ 칸끼리 끌기: 드킹 칸(0) → 물약 칸(1)으로 → 자리 바꿈 · 묶음 그대로
  const dnd = (fromSel, fromK, toSel, toK) => p.evaluate(([fs, fk, ts, tk]) => { const a = document.querySelectorAll(fs)[fk], z = ts ? document.querySelectorAll(ts)[tk] : null; const dt = new DataTransfer(); a.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }));
    const tgt = z || document.querySelector(tk); tgt.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true })); tgt.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); a.dispatchEvent(new DragEvent('dragend', { dataTransfer: dt, bubbles: true })); return [...dt.types]; }, [fromSel, fromK, toSel, toK]);
  await dnd('#inv-grid .slot', 0, '#inv-grid .slot', 1); await p.waitForTimeout(250);
  const A2 = await cellInfo(); console.log('after move', JSON.stringify(A2.map(c => [c.name.slice(0, 18), c.n])));
  ok(/빨간 물약|물약/.test(A2[0].name) && /드레이크 킹/.test(A2[1].name) && A2[1].n === '4' && A2.length === 6, '칸끼리 끌기: 드킹 묶음이 통째로 1번 칸으로 (물약과 자리 바꿈)');
  await dnd('#inv-grid .slot', 1, '#inv-grid .slot', 0); await p.waitForTimeout(250);   // 되돌리기
  const A3 = await cellInfo(); ok(/드레이크 킹/.test(A3[0].name) && A3[0].n === '4', '다시 끌어 되돌림');
  // 빈 칸으로 끌면 맨 끝으로
  await dnd('#inv-grid .slot', 0, '#inv-grid .slot', 20); await p.waitForTimeout(250);
  const A4 = await cellInfo(); ok(/드레이크 킹/.test(A4[A4.length - 1].name) && A4[A4.length - 1].n === '4' && A4.length === 6, '빈 칸으로 끌면 묶음 통째로 맨 끝');
  // ④ 휴지통으로 끌면 가장 낮은 것(+0)을 묻고, 아니오
  { const k = A4.length - 1; await dnd('#inv-grid .slot', k, null, '#inv-trash'); await p.waitForTimeout(200); }
  const TR = await p.evaluate(() => { const q = document.getElementById('ask-q').textContent, vis = !document.getElementById('askwin').hidden; document.getElementById('ask-no').click(); return { q, vis }; });
  console.log('trash', JSON.stringify(TR)); ok(TR.vis && /^드레이크 킹의 가호를 삭제/.test(TR.q), '휴지통: +0 드킹을 묻기 (가장 낮은 것)');
  // ⑥ 축복 주문서 대상 = 대표 (+3, 축복 없음 · 나머지 +0 ×2)
  await loadBag([{ id: 'gaho_drake_king', n: 1 }, { id: 'gaho_drake_king', n: 1, en: 3 }, { id: 'gaho_drake_king', n: 1 }, { id: 'bless_scroll', n: 3 }]);
  await p.evaluate(() => { const T = __T; T.INV.use(T.INV.bag().find(e => e.id === 'bless_scroll')); }); await p.waitForTimeout(150);
  const S1 = await p.evaluate(() => { const T = __T, cells = [...document.querySelectorAll('#inv-grid .slot')].filter(c => c.dataset.itip), c = cells.find(x => /드레이크 킹/.test(x.dataset.itip)); const was = document.getElementById('invwin').classList.contains('targeting');
    const R = Math.random; Math.random = () => 0; try { c.click(); } finally { Math.random = R; }
    const L = T.INV.bag().filter(e => e.id === 'gaho_drake_king').map(e => [e.en || 0, !!e.blessed]); return { was, L, sc: T.INV.count('bless_scroll'), log: T.log.slice(-1).map(x => x.t || x.text || x)[0] }; });
  console.log('bless', JSON.stringify(S1)); ok(S1.was && S1.sc === 2 && S1.L.filter(x => x[1]).length === 1 && S1.L.find(x => x[1])[0] === 3, '축복 주문서: 대표(+3)가 축복됨 · +0은 그대로');
  // ③ 창고: 우클릭 맡기기 = 가장 낮은 것부터 · 끌어서 맡기기도 · 창고 한 칸 + 개수 · 꺼내기 = 가장 높은 것부터
  await loadBag(BAG);
  await p.evaluate(() => { const T = __T; T.STORE.load([]); T.STORE.open(); document.querySelector('#inv-tabs button[data-t="gaho"]').click(); }); await p.waitForTimeout(300);
  const dkCell = () => p.evaluate(() => [...document.querySelectorAll('#inv-grid .slot')].findIndex(c => c.dataset.itip && /드레이크 킹/.test(c.dataset.itip)));
  for (let q = 0; q < 2; q++) { await p.evaluate(() => { const c = [...document.querySelectorAll('#inv-grid .slot')].find(c => c.dataset.itip && /드레이크 킹/.test(c.dataset.itip)); c.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 })); }); await p.waitForTimeout(150); }   // 우클릭 (가방이 자주 다시 그려져서 이벤트로)
  { const k = await dkCell(); await dnd('#inv-grid .slot', k, null, '#st-grid'); await p.waitForTimeout(200); }
  const D1 = await p.evaluate(() => { const T = __T; return { bag: T.INV.bag().filter(e => e.id === 'gaho_drake_king').map(e => [e.en || 0, !!e.blessed]), box: T.STORE.list().filter(e => e.id === 'gaho_drake_king').map(e => [e.en || 0, !!e.blessed]) }; });
  console.log('deposit', JSON.stringify(D1)); ok(D1.bag.length === 1 && D1.bag[0][0] === 3 && D1.bag[0][1] && D1.box.length === 3 && D1.box.every(x => x[0] === 0 && !x[1]), '창고 맡기기(우클릭 2 · 끌기 1): +0 3개가 들어가고 +3 축복은 가방에 남음');
  const C2 = await cellInfo(); const dk2 = C2.find(c => /드레이크 킹/.test(c.name)); ok(dk2 && dk2.n === '' && dk2.en === '+3', '가방 드킹 1개 남음 → 개수 표시 없음');
  // 창고에 +5 하나 더 (가방에서 바로 맡김) → 창고 대표 +5 · 개수 4
  await p.evaluate(() => { const T = __T; T.INV.add('gaho_drake_king', 1, true); const e = T.INV.bag().filter(x => x.id === 'gaho_drake_king' && !x.en)[0]; e.en = 5; T.STORE.deposit(e, 1); T.STORE.render(); }); await p.waitForTimeout(200);
  const ST = await p.evaluate(() => { const cells = [...document.querySelectorAll('#st-grid .slot')].filter(c => c.dataset.itip); const c = cells.find(x => /드레이크 킹/.test(x.dataset.itip)); return { n: cells.length, cnt: document.getElementById('st-count').textContent, b: c && (c.querySelector(':scope > b') || {}).textContent, en: c && (c.querySelector('i.en') || {}).textContent, tip: c && c.dataset.itip }; });
  console.log('store', JSON.stringify(ST)); ok(ST.n === 1 && /^1 \//.test(ST.cnt) && ST.b === '4' && ST.en === '+5' && /같은 가호 4개 — 가장 높은 것: \+5 · 나머지: \+0 ×3/.test(ST.tip) && /\(4\) \[영웅\]/.test(ST.tip), '창고: 드킹 한 칸 · 개수 4 · 대표 +5 · 요약 · 칸 수 1');
  await (await p.$('#storewin')).screenshot({ path: 'dev/out/gahostack_store.png' }).catch(() => {});
  await p.evaluate(() => { const c = [...document.querySelectorAll('#st-grid .slot')].find(x => x.dataset.itip && /드레이크 킹/.test(x.dataset.itip)); c.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); }); await p.waitForTimeout(200);
  const WD = await p.evaluate(() => { const T = __T; return { bag: T.INV.bag().filter(e => e.id === 'gaho_drake_king').map(e => [e.en || 0, !!e.blessed]), box: T.STORE.list().filter(e => e.id === 'gaho_drake_king').map(e => e.en || 0), exp: T.INV.gaho('exp') }; });
  console.log('withdraw', JSON.stringify(WD)); ok(WD.box.length === 3 && WD.box.every(v => v === 0) && WD.bag.some(x => x[0] === 5) && WD.exp === 6, '창고 더블클릭: 가장 높은 +5부터 꺼냄 → 효과 +6%');
  const C3 = await cellInfo(); const dk3 = C3.find(c => /드레이크 킹/.test(c.name)); ok(dk3 && dk3.n === '2' && dk3.en === '+5' && !dk3.bl, '가방 드킹: 대표가 +5로 바뀜 · 개수 2');
  // 창고 칸 수: 같은 가호는 이미 있으면 칸이 안 늘어남 (150칸 꽉 찬 창고)
  const CAP = await p.evaluate(() => { const T = __T, I = T.ITEMS, W = Object.keys(I).filter(k => I[k].slot === 'weapon' && !I[k].bound && !I[k].stack); T.STORE.load([{ id: 'gaho_drake_king', n: 1 }, ...Array.from({ length: 149 }, (_, k) => ({ id: W[k % W.length], n: 1 }))]); T.INV.add('gaho_drake_king', 1, true); T.INV.add('gaho_ogre', 1, true);
    const lo = T.INV.bag().filter(e => e.id === 'gaho_drake_king').sort((a, b) => (a.en || 0) - (b.en || 0))[0]; const okD = T.STORE.deposit(lo, 1), okO = T.STORE.deposit(T.INV.bag().find(e => e.id === 'gaho_ogre'), 1); T.STORE.render(); return { okD, okO, cnt: document.getElementById('st-count').textContent, n: T.STORE.list().length }; });
  console.log('cap', JSON.stringify(CAP)); ok(CAP.okD && !CAP.okO && /^150 \/ 150/.test(CAP.cnt) && CAP.n === 151, '꽉 찬 창고: 드킹은 같은 칸에 들어감 · 새 가호(오우거)는 가득');
  await p.evaluate(() => { document.getElementById('storewin').hidden = true; });
  // ⑦ 제작 장인 [가호 조합]: 대표 + 재료 자동 (가장 낮은 것) · 성공하면 대표 +1
  await loadBag([{ id: 'gaho_drake_king', n: 1 }, { id: 'gaho_drake_king', n: 1, en: 3, blessed: true }, { id: 'gaho_drake_king', n: 1, en: 1 }]);
  await p.evaluate(() => { const T = __T; T.CRAFT_.open(); document.querySelector('#craftwin [data-ct="mix"]').click(); }); await p.waitForTimeout(300);
  const X1 = await p.evaluate(() => { const r = [...document.querySelectorAll('#cr-list .cr-row')].find(r => /드레이크 킹/.test(r.innerText)); return r && { t: r.innerText.replace(/\s+/g, ' '), dis: r.querySelector('button').disabled }; });
  console.log('mix', JSON.stringify(X1)); ok(X1 && !X1.dis && /\+3 축복받은|축복받은 \+3|\+3/.test(X1.t) && /재료: 드레이크 킹의 가호 \(/.test(X1.t), '[가호 조합]: 대표 +3 축복 · 재료 +0');
  await p.click('#cr-list button[data-mx="drake_king"]'); await p.waitForSelector('#ask-yes', { state: 'visible' });
  await p.evaluate(() => { const R = Math.random; Math.random = () => 0.05; try { document.getElementById('ask-yes').click(); } finally { Math.random = R; } }); await p.waitForTimeout(300);
  const X2 = await p.evaluate(() => __T.INV.bag().filter(e => e.id === 'gaho_drake_king').map(e => [e.en || 0, !!e.blessed]).sort((a, b) => b[0] - a[0]));
  console.log('mixed', JSON.stringify(X2)); ok(X2.length === 2 && X2[0][0] === 4 && X2[0][1] && X2[1][0] === 1, '조합 성공: +3 축복 → +4 · +0 재료 사라짐 · +1 남음');
  await p.evaluate(() => { const w = document.getElementById('craftwin'); if (w) w.hidden = true; document.querySelector('#inv-tabs button[data-t="gaho"]').click(); }); await p.waitForTimeout(250);
  const C4 = await cellInfo(); const dk4 = C4.find(c => /드레이크 킹/.test(c.name)); ok(dk4 && dk4.n === '2' && dk4.en === '+4' && dk4.bl, '조합 뒤 가방 칸: +4 축복 · 개수 2');
  } catch (e) { console.log('TEST ERROR', e.stack || e.message); fails++; }
  ok(!errs.length, '오류 없음 ' + errs.slice(0, 3).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
