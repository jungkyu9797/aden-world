// 11/5 프로듀서: 창고 80 → 150칸
//   KT_PORT=8883 bash dev/runkt.sh dev/tests/storage150.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'st150' });
  const r = await p.evaluate(() => { const T = __T, S = T.STORE, I = T.INV, IT = T.ITEMS || window.ITEMS; const W = Object.keys(IT).filter(k => IT[k].slot === 'weapon' && !IT[k].bound && !IT[k].stack);
    S.load(Array.from({ length: 140 }, (_, k) => ({ id: W[k % W.length], n: 1 }))); const o = { n0: S.list().length };
    let okN = 0; for (let k = 0; k < 12; k++) { I.add(W[k % W.length], 1); const e = I.bag().filter(x => x.id === W[k % W.length] && !x.on).pop(); if (S.deposit(e, 1)) okN++; } o.dep = okN; o.n1 = S.list().filter(e => e.id !== 'stored_gold').length;
    S.open && S.open(); S.render(); const g = document.getElementById('st-grid'), c = document.getElementById('st-count'); o.cells = g ? g.children.length : -1; o.count = c ? c.textContent : ''; return o; });
  await p.waitForTimeout(300); await p.screenshot({ path: 'dev/out/storage150.png' });
  console.log(JSON.stringify(r));
  ok(r.n0 === 140, `140개 넣음 (${r.n0})`);
  ok(r.dep === 10 && r.n1 === 150, `10개 더 맡겨 150칸까지 · 그 뒤는 가득 (${r.dep}개 맡김 · ${r.n1}칸)`);
  ok(r.cells === 150 && /150 \/ 150/.test(r.count), `창고 창: 칸 ${r.cells}개 · ${r.count}`);
  ok(!errs.length, '오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
