// 11/6 프로듀서: 밤·던전 어둠을 절반으로 — 흐릿하지만 주변 지형·맵이 보이게 (어둠 판 진하기 필드 0.86→0.43 · 던전 0.95→0.48 · 마을 0.5→0.25)
//   KT_PORT=8893 bash dev/runkt.sh dev/tests/nightdim.js   (TAG=before 로 바꾸면 스크린샷 이름만 바뀜)
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
const TAG = process.env.TAG || 'after';
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'ndim' }); await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 60; window.DEMO_MODE = false; });
  const shot = async (nm) => { await p.waitForTimeout(2500); await p.screenshot({ path: `dev/out/nightdim_${nm}_${TAG}.png` }); };
  const lum = () => p.evaluate(() => { const cv = document.querySelector('canvas'); const t = document.createElement('canvas'); t.width = cv.width; t.height = cv.height; const x = t.getContext('2d'); x.drawImage(cv, 0, 0); const W = cv.width, H = cv.height; let s = 0, n = 0;
    for (const [fx, fy] of [[0.08, 0.15], [0.92, 0.15], [0.08, 0.85], [0.92, 0.85], [0.5, 0.08]]) { const d = x.getImageData(Math.floor(W * fx), Math.floor(H * fy), 20, 20).data; for (let k = 0; k < d.length; k += 4) { s += 0.299 * d[k] + 0.587 * d[k + 1] + 0.114 * d[k + 2]; n++; } } return +(s / n).toFixed(1); });
  // ① 필드(8번) 낮 → 밤
  await p.evaluate(() => { __T.DN_.set(0); __T.TOWN.toZone(8); }); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 8 && __T.SCENE === 'field', null, { timeout: 60000 }); await p.waitForTimeout(2500);
  const fDay = await lum(); await p.evaluate(() => __T.DN_.set(1)); await shot('field'); const fNight = await lum();
  // ② 어두운 던전(9번)
  await p.evaluate(() => { __T.TOWN.toZone(9); }); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 9 && __T.SCENE === 'field', null, { timeout: 60000 }); await shot('dungeon'); const dun = await lum();
  console.log(JSON.stringify({ TAG, fDay, fNight, ratio: +(fNight / fDay).toFixed(2), dun }));
  if (TAG === 'after') { ok(fNight / fDay > 0.45, `밤 필드 가장자리 밝기: 낮의 ${Math.round(fNight / fDay * 100)}% (예전 약 14%)`); ok(dun > 8, `던전 가장자리 밝기 ${dun} (지형이 흐릿하게 보임)`); }
  ok(!errs.length, '오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
