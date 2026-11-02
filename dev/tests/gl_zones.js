// 새 그래픽(WebGL) 모든 지역 돌기 — 지역마다: 오류 · GL 실패 · 2D로 빠진 것(이유) · 2D와 화면 차이(멈춘 같은 순간) — KT_PORT=8770 KT_TO=3000 bash dev/runkt.sh dev/tests/gl_zones.js
//   스크린샷: 차이가 큰 지역만 dev/out/gl_zone_<번호>_{on,off}.png
const { chromium } = require('playwright'); const S = require('./gl_scene.js'); const { execFileSync } = require('child_process'); const fs = require('fs');
const PY = `import sys, numpy as np
from PIL import Image
a=np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int)[:560]; b=np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(int)[:560]
d=np.abs(a-b).max(axis=2); print('%.3f %.3f'%(np.abs(a-b).mean(),(d>48).mean()*100))`;
(async () => { const b = await chromium.launch({ args: S.ARGS }); const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); let errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (/\[GL\]/.test(m.text())) errs.push(m.text()); });
  await p.addInitScript(() => { try { localStorage.setItem('aden_gl', 'force'); localStorage.setItem('aden_gl_bloom', '0'); localStorage.setItem('aden_gl_fx', '0'); } catch (e) {} });
  await S.login(p, { cls: 'knight', name: 'glZ' }); await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 60; });
  const ids = await p.evaluate(() => { const o = []; for (let n = 1; n <= 60; n++) { let d = null; try { d = __T.ISLAND.def(n); } catch (e) {} if (d) o.push([n, d.name || '?']); } return o; });
  const only = (process.env.GLZ || '').split(',').filter(Boolean).map(Number); const L = [['town', '마을'], ...ids.filter(([n]) => !only.length || only.includes(n))]; const rows = [];
  for (const [z, name] of L) { errs = []; const t0 = Date.now();
    try {
      if (z === 'town') await p.evaluate(() => __T.TOWN.goTown()); else await p.evaluate(z => __T.TOWN.toZone(z), z);
      await p.waitForFunction(z => z === 'town' ? __T.SCENE === 'town' : (__T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field'), z, { timeout: 60000 });
      await p.waitForTimeout(3500);
      const w0 = await p.evaluate(() => GLR.why()); await p.waitForTimeout(2500);
      const st = await p.evaluate(w0 => { const w = GLR.why(), d = {}; for (const k in w) { const v = w[k] - (w0[k] || 0); if (v > 0) d[k.replace(/@.*/, '')] = (d[k.replace(/@.*/, '')] || 0) + v; } const s = GLR.stats(); return { why: d, runs: s.runs, runKpx: Math.round(s.runPx / 1000), up: s.up, info: GLR.info() }; }, w0);
      await S.freeze(p); await S.redraw(p, true); await p.waitForTimeout(120); await p.screenshot({ path: 'dev/out/_z_on.png' }); await S.redraw(p, false); await p.waitForTimeout(120); await p.screenshot({ path: 'dev/out/_z_off.png' });
      await p.evaluate(() => { window.requestAnimationFrame = window.__raf0; window.__glStill = false; if (window.__frozen) requestAnimationFrame(window.__frozen); });
      const [mean, gt48] = execFileSync('python3', ['-c', PY, 'dev/out/_z_off.png', 'dev/out/_z_on.png']).toString().trim().split(' ').map(Number);
      if (gt48 > 1) { fs.copyFileSync('dev/out/_z_on.png', `dev/out/gl_zone_${z}_on.png`); fs.copyFileSync('dev/out/_z_off.png', `dev/out/gl_zone_${z}_off.png`); }
      const r = { z, name, gt48, mean, runs: st.runs, runKpx: st.runKpx, failed: st.info.failed || st.info.lost, why: Object.entries(st.why).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => k + ':' + v).join(' '), errs: errs.slice(0, 2).join(' | '), s: Math.round((Date.now() - t0) / 1000) };
      rows.push(r); console.log(JSON.stringify(r));
    } catch (e) { const r = { z, name, error: String(e.message || e).slice(0, 120) }; rows.push(r); console.log(JSON.stringify(r)); try { await p.evaluate(() => { window.requestAnimationFrame = window.__raf0 || window.requestAnimationFrame; }); } catch (x) {} } }
  fs.writeFileSync('dev/out/gl_zones.json', JSON.stringify(rows, null, 1));
  console.log('\n| 지역 | 큰 차이 % | 2D 묶음 | 2D로 간 이유 | 오류 |'); console.log('|---|---|---|---|---|');
  for (const r of rows) console.log(`| ${r.z} ${r.name} | ${r.gt48 ?? '-'} | ${r.runs ?? '-'} (${r.runKpx ?? '-'}kpx) | ${r.why || ''} | ${r.error || r.errs || (r.failed ? 'GL 실패' : '')} |`);
  await b.close(); })();
