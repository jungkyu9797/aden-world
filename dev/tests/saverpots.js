// 11/5 프로듀서: 절전 모드 화면에 가진 빨간·주홍·맑은 물약 개수 (자동사냥 '물약 N개 이하면 귀환' 아래면 붉게)
//   KT_PORT=8883 bash dev/runkt.sh dev/tests/saverpots.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'svp' }); await p.evaluate(() => { __T.GOD_INV = true; });
  await p.evaluate(() => { const I = __T.INV; for (const id of ['red_potion', 'orange_potion', 'clear_potion']) I.take(id, I.count(id)); I.add('red_potion', 1234); I.add('orange_potion', 3); __T.AUTO.setCfg({ lowPot: true, lowN: 5 }); __T.TOWN.toZone(2); });
  await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 2 && __T.SCENE === 'field', null, { timeout: 60000 }); await p.waitForTimeout(800);
  await p.evaluate(() => SAVER.enter()); await p.waitForTimeout(1500);
  const read = () => p.evaluate(() => { const el = document.getElementById('sv-pots'); if (!el) return null; const r = el.getBoundingClientRect(); return { txt: el.textContent.replace(/\s+/g, ' ').trim(), low: [...el.querySelectorAll('.sv-pot')].map(x => x.classList.contains('low')), vis: r.width > 0 && r.height > 0 }; });
  const a = await read(); await p.screenshot({ path: 'dev/out/saverpots.png' });
  await p.evaluate(() => { __T.INV.take('red_potion', 1000); __T.INV.add('clear_potion', 40); }); await p.waitForTimeout(1500); const b2 = await read();
  await p.evaluate(() => SAVER.exit()); await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(600); await p.evaluate(() => SAVER.enter()); await p.waitForTimeout(1500);
  await p.screenshot({ path: 'dev/out/saverpots_mob.png' }); const m = await read();
  console.log(JSON.stringify({ a, b2, m }));
  ok(a && a.vis && /빨간 물약 1,234개/.test(a.txt) && /주홍 물약 3개/.test(a.txt) && /맑은 물약 0개/.test(a.txt), `절전 화면에 물약 3종 개수 (${a && a.txt})`);
  ok(a && a.low.join() === 'false,true,true', `귀환 기준(5개) 이하는 붉게 (${a && a.low})`);
  ok(b2 && /빨간 물약 234개/.test(b2.txt) && /맑은 물약 40개/.test(b2.txt) && b2.low.join() === 'false,true,false', `개수가 바뀌면 따라 바뀜 (${b2 && b2.txt})`);
  ok(m && m.vis, '좁은 화면(844×390)에서도 보임');
  ok(!errs.length, '오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
