// 새 그래픽(WebGL) 직접 사냥 장면(자동사냥·스킬·버프)에서 2D 묶음·그림 올림이 어디서 오는지 — KT_PORT=8769 bash dev/runkt.sh dev/tests/gl_hunt.js
const { chromium } = require('playwright'); const S = require('./gl_scene.js');
(async () => { const b = await chromium.launch({ args: S.ARGS }); const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('aden_gl', 'force'); } catch (e) {} });
  for (const cls of [process.env.GLH_CLS || 'wizard']) {
    await S.login(p, { cls, name: 'glH' + cls[0] }); await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 60; __T.TOWN.toZone(23); });
    await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 23 && __T.SCENE === 'field', null, { timeout: 60000 }); await p.waitForTimeout(3000);
    await p.evaluate(() => { try { __T.wizAutoLearn && __T.wizAutoLearn(); } catch (e) {} try { if (!__T.AUTO.on()) __T.AUTO.toggle(); } catch (e) { try { __T.AUTO.toggle(); } catch (x) {} } });
    await p.waitForTimeout(8000);
    const r = await p.evaluate(() => new Promise(res => { const R = {}, U = {}, w0 = { ...GLR.why() }; let n = 0, last = null; GLR._dbg.on = true; const t0 = performance.now();
      const tick = () => { const s = GLR.stats(); if (s !== last) { last = s; n++; for (const x of s.rl || []) { const k = String(x[0]).replace(/https?:\/\/[^ <]*\//g, '').replace(/Ctx\.<computed><|Ctx\.|Object\./g, '').slice(0, 90); const e = R[k] || (R[k] = [0, 0]); e[0]++; e[1] += x[2] * x[3]; }
          for (const u of s.ul || []) { const k = String(u[0]).slice(0, 70) + ' ' + u[1] + 'x' + u[2]; const e = U[k] || (U[k] = [0, 0]); e[0]++; e[1] += u[1] * u[2]; } }
        if (performance.now() - t0 < 6000) requestAnimationFrame(tick); else { GLR._dbg.on = false; const W = {}, w1 = GLR.why(); for (const k in w1) { const d = w1[k] - (w0[k] || 0); if (d > 0) W[k] = +(d / n).toFixed(1); }
          const top = O => Object.entries(O).sort((a, b) => b[1][1] - a[1][1]).slice(0, 10).map(([k, v]) => (v[0] / n).toFixed(1) + '번 ' + Math.round(v[1] / n / 1000) + 'kpx ' + k);
          res({ n, auto: __T.AUTO.on && __T.AUTO.on(), runs: top(R), ups: top(U), why: W }); } };
      requestAnimationFrame(tick); }));
    console.log(cls, JSON.stringify(r, null, 1)); }
  console.log(errs.length ? 'ERRORS ' + errs.slice(0, 3).join(' | ') : 'no page errors'); await b.close(); })();
