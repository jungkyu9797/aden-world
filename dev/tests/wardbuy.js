// 11/5 프로듀서: 자동사냥 [마을에서] 구매 설정에 불멸의 가호 자동 구매 (정한 개수까지 · 5만 골드)
//   KT_PORT=8883 bash dev/runkt.sh dev/tests/wardbuy.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'wdb' });
  const r = await p.evaluate(() => { const T = __T, A = T.AUTO, I = T.INV, o = {}; T.setCoins(1000000);
    A.setCfg({ buy: false, buyHaste: false, buyPoly: false, buyScroll: false, buyWard: false, wardN: 3 }); I.take('immortal_ward', I.count('immortal_ward')); A.buyAll(); o.off = I.count('immortal_ward');
    A.setCfg({ buyWard: true, wardN: 3 }); A.buyAll(); o.n1 = I.count('immortal_ward'); o.g1 = T.coins;
    A.buyAll(); o.n2 = I.count('immortal_ward'); o.g2 = T.coins;   // 이미 3개 → 안 삼
    I.take('immortal_ward', 1); A.buyAll(); o.n3 = I.count('immortal_ward'); o.g3 = T.coins;   // 1개 탐 → 1개만
    T.setCoins(70000); I.take('immortal_ward', 3); A.buyAll(); o.n4 = I.count('immortal_ward'); o.g4 = T.coins;   // 돈이 모자라면 살 수 있는 만큼
    A.setCfg({ wardN: 99 }); T.setCoins(5e6); I.take('immortal_ward', I.count('immortal_ward')); A.buyAll(); o.n5 = I.count('immortal_ward');   // 최대 20개
    o.saved = JSON.parse(JSON.stringify(A.cfg())).buyWard; return o; });
  // 설정 창: 체크·개수 칸
  await p.evaluate(() => __T.AUTO.openSet()); await p.waitForTimeout(400);
  const ui = await p.evaluate(() => { const cb = document.querySelector('[data-k="buyWard"]'), n = document.querySelector('[data-k="wardN"]'); if (!cb || !n) return { has: false }; cb.checked = false; cb.dispatchEvent(new Event('change')); const off = __T.AUTO.conf().buyWard; n.value = 5; n.dispatchEvent(new Event('change')); cb.checked = true; cb.dispatchEvent(new Event('change')); const c = __T.AUTO.conf(); const rc = cb.getBoundingClientRect(); return { has: true, off, on: c.buyWard, n: c.wardN, vis: rc.width > 0 && rc.height > 0 }; });
  await p.screenshot({ path: 'dev/out/wardbuy_set.png' });
  console.log(JSON.stringify({ r, ui }));
  ok(r.off === 0, `꺼져 있으면 안 삼 (${r.off})`);
  ok(r.n1 === 3 && r.g1 === 1000000 - 150000, `켜면 3개까지 삼 (${r.n1}개 · 골드 ${r.g1})`);
  ok(r.n2 === 3 && r.g2 === r.g1, `이미 3개면 안 삼 (${r.n2})`);
  ok(r.n3 === 3 && r.g3 === r.g2 - 50000, `1개 줄면 1개만 채움 (${r.n3} · −${r.g2 - r.g3})`);
  ok(r.n4 === 1 && r.g4 === 20000, `골드가 모자라면 살 수 있는 만큼 (${r.n4}개 · 남은 골드 ${r.g4})`);
  ok(r.n5 === 20, `최대 20개 (${r.n5})`);
  ok(ui.has && ui.vis && ui.off === false && ui.on === true && ui.n === 5, `자동사냥 설정 [마을에서]에 체크·개수 칸 (${JSON.stringify(ui)})`);
  ok(!errs.length, '오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
