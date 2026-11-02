// 11/2 렉: 실제 사냥 장면에서 한 프레임에 부르는 2D 그리기 횟수(그라데이션 만들기·drawImage·save·filter 등) · 프레임의 JS 시간(그리기 기록) · GC
//   LZ=23 KT_PORT=8791 bash dev/runkt.sh dev/tests/lag_count.js
const { chromium } = require('playwright'); const login = require('../tq.js');
const Z = +(process.env.LZ || 23);
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  if (process.env.LINIT) await p.addInitScript(new Function(process.env.LINIT));
  await login(p, { cls: 'knight', name: 'lagC' });
  await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 60; document.querySelectorAll('.gw').forEach(w => w.hidden = true); });
  await p.evaluate(z => __T.TOWN.toZone(z), Z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', Z, { timeout: 60000 });
  await p.waitForFunction(() => { const I = __T.ISLE, G = I && I.ground; return G && (G.baked || !(I.def.hills && I.def.hills.length)); }, null, { timeout: 90000, polling: 500 }).catch(() => {});
  await p.evaluate(() => { try { if (!__T.AUTO.on()) __T.AUTO.toggle(); } catch (e) {} }); await p.waitForTimeout(8000);
  const r = await p.evaluate(() => new Promise(res => { const P = CanvasRenderingContext2D.prototype, C = {}, K = ['createRadialGradient', 'createLinearGradient', 'createPattern', 'drawImage', 'fill', 'stroke', 'fillRect', 'fillText', 'strokeText', 'save', 'restore', 'arc', 'ellipse', 'getImageData', 'putImageData', 'measureText'], O = {};
    for (const k of K) { O[k] = P[k]; C[k] = 0; P[k] = function () { C[k]++; return O[k].apply(this, arguments); }; }
    let fl = 0, sh = 0; const fd = Object.getOwnPropertyDescriptor(P, 'filter'), sd = Object.getOwnPropertyDescriptor(P, 'shadowBlur');
    Object.defineProperty(P, 'filter', { configurable: true, get: fd.get, set(v) { if (v && v !== 'none') fl++; fd.set.call(this, v); } }); Object.defineProperty(P, 'shadowBlur', { configurable: true, get: sd.get, set(v) { if (v > 0) sh++; sd.set.call(this, v); } });
    let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 4000) requestAnimationFrame(f); else { for (const k of K) P[k] = O[k]; Object.defineProperty(P, 'filter', fd); Object.defineProperty(P, 'shadowBlur', sd); const o = {}; for (const k of K) o[k] = Math.round(C[k] / n); o.filterSet = Math.round(fl / n); o.shadowSet = Math.round(sh / n); o.frames = n; res(o); } }; requestAnimationFrame(f); }));
  console.log('per frame', JSON.stringify(r));
  console.log('scene', JSON.stringify(await p.evaluate(() => ({ mobs: __T.foxes.filter(f => !f.dead && !f.gone).length, bots: window.__FB ? __FB.bots().length : 0, parts: (__T.parts || []).length }))));
  console.log(errs.slice(0, 5).join('\n') || 'no errors'); await b.close(); })();
