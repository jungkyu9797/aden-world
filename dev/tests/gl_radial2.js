// 새 그래픽(WebGL) 두 원 그라데이션(createRadialGradient 중심 다름) 정확도 — KT_PORT=8769 bash dev/runkt.sh dev/tests/gl_radial2.js
const { chromium } = require('playwright'); const S = require('./gl_scene.js'); const { execFileSync } = require('child_process');
(async () => { const b = await chromium.launch({ args: S.ARGS }); const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('aden_gl', 'force'); localStorage.setItem('aden_gl_bloom', '0'); } catch (e) {} });
  await S.login(p, { cls: 'knight', name: 'glR' }); await p.waitForFunction(() => GLR.on() && GLR.info().frame > 5, null, { timeout: 60000 }); await S.freeze(p);
  const draw = `(g) => { g.save(); g.setTransform(2,0,0,2,0,0); g.fillStyle='#203040'; g.fillRect(0,0,640,400);
    const cases = [[-5,-26,2, 0,-18,20], [0,0,5, 20,0,30], [0,0,30, 10,5,5], [-10,0,0, 10,0,0], [0,0,10, 30,0,10], [0,0,0, 0,0,25]];
    cases.forEach((c, i) => { g.save(); g.translate(60 + (i % 3) * 180, 90 + Math.floor(i / 3) * 170); const gr = g.createRadialGradient(...c); gr.addColorStop(0,'#fff0c8'); gr.addColorStop(0.55,'#f0a050'); gr.addColorStop(1,'#8a2a0a'); g.fillStyle = gr;
      g.beginPath(); g.ellipse(0, -18, 50, 60, 0, 0, 7); g.fill(); g.fillRect(55, -70, 40, 120); g.restore(); });
    g.save(); g.translate(500, 250); g.scale(1.6, 1.6); g.rotate(0.4); const gr = g.createRadialGradient(-5,-26,2, 0,-18,20); gr.addColorStop(0,'#fff0c8'); gr.addColorStop(0.55,'#f0a050'); gr.addColorStop(1,'#8a2a0a'); g.fillStyle = gr; g.beginPath(); g.ellipse(0,-18,12.5,17,0,0,7); g.fill(); g.restore(); g.restore(); }`;
  const { R, gl, out } = await p.evaluate(src => { const f = eval(src); GLR._dbg.on = true; const out = GLR._frameWith(g => { g.fillStyle = '#000'; g.fillRect(0, 0, 4000, 4000); f(g); }); const gl = document.getElementById('glcv').toDataURL();
    const cv = document.createElement('canvas'); cv.width = out.pw; cv.height = out.ph; const g2 = cv.getContext('2d'); g2.fillStyle = '#000'; g2.fillRect(0, 0, cv.width, cv.height); f(g2); return { R: cv.toDataURL(), gl, out: { runs: out.runs, ell: out.ell, rect: out.rect, path: out.path } }; }, draw);
  const fs = require('fs'), dec = d => Buffer.from(d.split(',')[1], 'base64'); fs.writeFileSync('dev/out/gl_rad2_2d.png', dec(R)); fs.writeFileSync('dev/out/gl_rad2_gl.png', dec(gl));
  console.log(JSON.stringify(out)); console.log(execFileSync('python3', ['-c', `import numpy as np
from PIL import Image
a=np.asarray(Image.open('dev/out/gl_rad2_2d.png').convert('RGB')).astype(int)[:800,:1280]; b=np.asarray(Image.open('dev/out/gl_rad2_gl.png').convert('RGB')).astype(int)[:800,:1280]
d=np.abs(a-b).max(axis=2); o=(a*0.35).astype(np.uint8); o[d>48]=[255,40,40]; o[(d>16)&(d<=48)]=[255,200,60]; Image.fromarray(o).save('dev/out/gl_rad2_diff.png'); print('mean %.3f gt16 %.3f%% gt48 %.3f%%'%(np.abs(a-b).mean(),(d>16).mean()*100,(d>48).mean()*100))`]).toString().trim());
  console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors'); await b.close(); })();
