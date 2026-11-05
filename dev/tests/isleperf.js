// 11/5 잊섬 프레임 드랍: ① 화면 밖 몹은 안 그림(몹 288마리를 매 프레임 다 그리던 것) · 화면 안 몹은 다 그림
//   ② 물들인 몹 칸 캐시가 넘쳐 초당 수십~150장씩 새 캔버스를 만들던 것 → 데워진 뒤엔 거의 안 만듦 · ③ 다른 지역으로 가면 잊섬 몹 칸은 비움
//   KT_PORT=8792 bash dev/runkt.sh dev/tests/isleperf.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1891, height: 1293 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('aden_low', '1'); } catch (e) {} window.__cvN = 0; const ce = document.createElement.bind(document); document.createElement = function (t) { if (String(t).toLowerCase() === 'canvas') window.__cvN++; return ce.apply(document, arguments); }; });
  await login(p, { cls: 'knight', name: 'ipf' }); await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 62; document.querySelectorAll('.gw').forEach(w => w.hidden = true); });
  await p.evaluate(() => __T.TOWN.toZone(25)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 25 && __T.SCENE === 'field', null, { timeout: 60000 });
  await p.waitForTimeout(2500); await p.evaluate(() => { if (!__T.AUTO.on()) __T.AUTO.toggle(); }); await p.waitForTimeout(10000);
  // ② 데워진 뒤 4초 동안 새로 만든 캔버스 수
  const churn = await p.evaluate(async () => { const n0 = window.__cvN, t0 = performance.now(); await new Promise(r => setTimeout(r, 4000)); const M = __T.MEM_(); return { perSec: +((window.__cvN - n0) / ((performance.now() - t0) / 1000)).toFixed(1), tfrN: M.tfrN, tfrMpx: M.tfrMpx }; });
  // ① 멈춰 서서 한 화면에 그린 몹 모으기 (HF.body로 그리는 몹)
  const cull = await p.evaluate(async () => { const T = __T, H = T.hero; if (T.AUTO.on()) T.AUTO.toggle(); H.target = null; await new Promise(r => setTimeout(r, 1500));
    const HF = T.HF_, o = HF.body, S = new Set(); HF.body = function (g, f, fn) { S.add(f); return o.apply(this, arguments); };
    await new Promise(r => { let n = 0; const f = () => (++n < 6 ? requestAnimationFrame(f) : r()); requestAnimationFrame(f); }); HF.body = o;
    const z = T.curZ, vw = innerWidth / z, vh = innerHeight / z, [hx, hy] = T.W2P(H.x, H.z), cx = hx, cy = hy - 20; let alive = 0, inV = 0, inMiss = 0, far = 0, farDrawn = 0;
    for (const f of T.foxes) { if (f.dead || f.gone) continue; alive++; const [x, y] = T.W2P(f.x, f.z), dx = x - cx, dy = y - cy;
      if (Math.abs(dx) < vw / 2 - 20 && dy > -vh / 2 + 20 && dy < vh / 2 - 20) { inV++; if (!S.has(f)) inMiss++; }
      if (Math.abs(dx) > vw / 2 + 700 || dy < -vh / 2 - 500 || dy > vh / 2 + 900) { far++; if (S.has(f)) farDrawn++; } }
    return { alive, drawn: S.size, inView: inV, inMiss, far, farDrawn, vw: Math.round(vw), vh: Math.round(vh) }; });
  // ③ 다른 지역(2)으로 가면 잊섬 몹 칸을 비움
  const trim = await p.evaluate(async () => { const T = __T, before = T.MEM_(); T.TOWN.toZone(2); const t0 = performance.now(); while (!(T.ISLE && T.ISLE.id === 2 && T.SCENE === 'field') && performance.now() - t0 < 60000) await new Promise(r => setTimeout(r, 300)); await new Promise(r => setTimeout(r, 1500)); const a = T.MEM_(); return { before: before.tfrMpx, after: a.tfrMpx, nB: before.tfrN, nA: a.tfrN }; });
  console.log(JSON.stringify({ churn, cull, trim }));
  ok(cull.inView > 5 && cull.inMiss === 0, `① 화면 안 몹은 모두 그림 (${cull.inView}마리 중 빠짐 ${cull.inMiss})`);
  ok(cull.drawn < cull.alive * 0.6 && cull.farDrawn === 0, `① 화면 밖 몹은 안 그림 (살아 있는 ${cull.alive} · 그림 ${cull.drawn} · 멀리 있는 ${cull.far}마리 중 그림 ${cull.farDrawn})`);
  ok(churn.perSec <= 3, `② 자동사냥 중 새 캔버스 초당 ${churn.perSec}장 (전: 35~150) · 칸 ${churn.tfrN}개 ${churn.tfrMpx}M화소`);
  ok(trim.after < trim.before * 0.5, `③ 다른 지역으로 가면 잊섬 몹 칸 비움 (${trim.before} → ${trim.after}M화소)`);
  ok(!errs.length, '오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
