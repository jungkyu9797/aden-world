// 11/1 콜로세움 리뉴얼 (KT_PORT=8799 bash dev/runkt.sh dev/tests/colo2.js): 혼자 입장 · 1·2·3라운드 보스 1·2·3마리(가호 보스 무작위) · 보스마다 가호 완성품 · 클리어마다 주홍·맑은 물약 각 50 · 30분 · 3라운드 클리어 30초 뒤 자동 퇴장 · 하루 1번 · 실패
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'co2' });
  await p.evaluate(() => { const T = __T; T.GOD_INV = true; T.hero.lv = 60; T.INV.load({ bag: [{ id: 'lg_sword', n: 1, en: 5, on: 'weapon' }, { id: 'col_ticket', n: 3 }], bonus: { str: 30, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); });
  const COLO = () => p.evaluate(() => { const c = window.__COLO || null; return c ? JSON.parse(JSON.stringify(c.dbg() || {})) : null; });
  const st = () => p.evaluate(() => { const S = window.__COLO.dbg(); return S ? { ph: S.ph, r: S.r, n: S.n, bs: S.bs, bl: (S.bkL || []).slice(), gk: (S.gk || []).length } : null; });
  await p.evaluate(() => window.__COLO.open(true)); await p.waitForTimeout(300);
  const t0 = await p.evaluate(() => document.getElementById('co-st').textContent); console.log('win', t0);
  await p.evaluate(() => document.getElementById('co-solo').click()); await p.waitForTimeout(2500);
  ok('혼자 입장 → 콜로세움 (1라운드 준비)', await p.evaluate(() => __T.ISLE && __T.ISLE.id === 14) && (await st()).ph === 'cd');
  const POOL = await p.evaluate(() => Object.keys(__T.ITEMS).filter(k => /^gaho_/.test(k) && __T.ITEMS[k].gaho).map(k => __T.ITEMS[k].gaho)); console.log('pool', POOL.join(','));
  const killAll = () => p.evaluate(async () => { const T = __T; for (let t = 0; t < 1500; t++) { const L = T.foxes.filter(f => f.coloBoss && !f.dead && !f.gone); if (!L.length) return true; for (const f of L) { if (f.ashT > 0) { f.ashT = Math.min(f.ashT, 0.05); continue; } f.hp = 1; T.strike(f); } await new Promise(r => setTimeout(r, 30)); } return false;   /* 피닉스: 잿더미(4초) 뒤 한 번 되살아남 → 기다렸다 다시 */ });
  const gahos = () => p.evaluate(() => __T.INV.bag().filter(e => /^gaho_/.test(e.id)).reduce((a, e) => a + (e.n || 1), 0));
  await p.evaluate(() => { const G = __T.GROUND, o = G.drop.bind(G); window.__DR = []; G.drop = (id, n, i, j) => { if (/potion/.test(id)) window.__DR.push([id, n]); return o(id, n, i, j); }; });   // 바닥에 떨어뜨린 물약을 그대로 셈 (주운 것과 상관없이)
  const pots = () => p.evaluate(() => { const L = window.__DR; window.__DR = []; const s = id => L.filter(d => d[0] === id).reduce((a, d) => a + d[1], 0); return { o: s('orange_potion'), c: s('clear_potion'), piles: L.map(d => d[1]) }; });
  for (const r of [1, 2, 3]) {
    await p.evaluate(() => { window.__COLO.dbg().t = 9.9; }); await p.waitForTimeout(1200);
    const a = await st(); console.log('round', r, JSON.stringify(a));
    ok(`${r}라운드: 보스 ${r}마리 · 가호 보스 중에서`, a.ph === 'fight' && a.r === r && a.bs === r && a.bl.length === r && a.bl.every(k => POOL.includes(k)));
    const g0 = await gahos(); const killed = await killAll(); await p.waitForTimeout(1500); const g1 = await gahos();
    ok(`${r}라운드: 보스를 다 잡음 · 가호 완성품 +${r}`, killed && g1 - g0 === r);
    const pt = await pots(); console.log('pots', JSON.stringify({ o: pt.o, c: pt.c, mx: Math.max(...pt.piles), mn: Math.min(...pt.piles) }));
    ok(`${r}라운드 클리어: 바닥에 주홍·맑은 물약 각 50개 · 뭉치 1~3개`, pt.o === 50 && pt.c === 50 && Math.max(...pt.piles) <= 3 && Math.min(...pt.piles) >= 1);
    const b2 = await st(); if (r < 3) ok(`${r}라운드 클리어 → ${r + 1}라운드 10초 카운트`, b2.ph === 'cd' && b2.r === r + 1); else ok('3라운드 클리어 → 클리어(줍는 시간) · [퇴장] 버튼', b2.ph === 'win' && await p.evaluate(() => { const x = document.getElementById('colo-exit'); return !!x && !x.hidden; }));
    if (r === 1) await p.screenshot({ path: 'dev/out/colo2_r1.png' }); }
  await p.evaluate(() => { window.__COLO.dbg().t = 30.5; }); await p.waitForTimeout(1500);
  ok('3라운드 클리어 30초 뒤 자동 퇴장', await p.evaluate(() => __T.SCENE === 'town'));
  // 하루 1번
  await p.evaluate(() => window.__COLO.open(true)); await p.waitForTimeout(300);
  const d1 = await p.evaluate(() => ({ st: document.getElementById('co-st').textContent, dis: document.getElementById('co-join').disabled, left: window.__COLO.entLeft(), out: window.__COLO.entOut() }));
  console.log('day', JSON.stringify(d1)); ok('오늘 다시 입장 안 됨 (캐릭터마다 하루 1번) · 저장 값', /오늘은 이미 콜로세움에 들어갔어요/.test(d1.st) && d1.dis && d1.left === 0 && d1.out && d1.out.n === 1);
  await p.evaluate(() => document.getElementById('co-solo').click()); await p.waitForTimeout(800); ok('[혼자 입장]도 막힘', await p.evaluate(() => __T.SCENE === 'town'));
  // 실패: 다음 날 → 시간 초과
  await p.evaluate(() => { window.__COLO.entIn({ n: 1, d: '19990101' }); document.getElementById('co-solo').click(); }); await p.waitForTimeout(2500);
  await p.evaluate(() => { window.__COLO.dbg().t = 9.9; }); await p.waitForTimeout(1200); await p.evaluate(() => { window.__COLO.dbg().t = 1799.9; }); await p.waitForTimeout(1500);
  const f = await st(); console.log('fail', JSON.stringify(f)); ok('30분 안에 못 잡으면 실패 · [퇴장] 버튼', (f.ph === 'fail' || f.ph === 'end') && await p.evaluate(() => { const x = document.getElementById('colo-exit'); return !!x && !x.hidden; }));
  await p.evaluate(() => document.getElementById('colo-exit').click()); await p.waitForTimeout(1500); ok('[퇴장] → 마을', await p.evaluate(() => __T.SCENE === 'town'));
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
