// 새 그래픽(WebGL) 안개(goreFx) GL 층 — 2D와 비교 + 그림 올림 줄었는지 — KT_PORT=8769 bash dev/runkt.sh dev/tests/gl_gore.js → dev/out/gl_gore_*.png
const { chromium } = require('playwright'); const S = require('./gl_scene.js'); const { execFileSync } = require('child_process');
(async () => { const b = await chromium.launch({ args: S.ARGS }); const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (/\[GL\]/.test(m.text())) errs.push(m.text()); });
  await p.addInitScript(() => { try { localStorage.setItem('aden_gl', 'force'); localStorage.setItem('aden_gl_bloom', '0'); localStorage.setItem('aden_gl_fx', '0'); } catch (e) {} });
  await S.setup(p, { chars: 6, mobs: 8, fx: false, still: true }); await p.evaluate(() => { window.__glStill = true; }); await p.waitForTimeout(3000); await S.freeze(p);
  const a = await S.redraw(p, true); await p.waitForTimeout(150); await p.screenshot({ path: 'dev/out/gl_gore_on.png' });
  await S.redraw(p, false); await p.waitForTimeout(150); await p.screenshot({ path: 'dev/out/gl_gore_off.png' });
  console.log(JSON.stringify({ layer: a.layer, up: a.up, upKpx: Math.round(a.upPx / 1000), runs: a.runs }));
  console.log(execFileSync('python3', ['-c', `import numpy as np
from PIL import Image
a=np.asarray(Image.open('dev/out/gl_gore_off.png').convert('RGB')).astype(int); b=np.asarray(Image.open('dev/out/gl_gore_on.png').convert('RGB')).astype(int)
d=np.abs(a-b).max(axis=2); print('mean %.3f gt48 %.3f%%'%(np.abs(a-b).mean(),(d>48).mean()*100))`]).toString().trim());
  console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors'); await b.close(); })();
