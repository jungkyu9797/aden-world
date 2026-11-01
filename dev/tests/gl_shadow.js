// 새 그래픽(WebGL) 그림자 흐림(shadowBlur) 정확도 — KT_PORT=8769 bash dev/runkt.sh dev/tests/gl_shadow.js
//   GL 화면 위에 그림자 켠 그림 여러 가지(사각형·원·경로·선·글자·그림)를 2D와 GL로 각각 그려 비교 → dev/out/gl_shadow_2d.png · gl_shadow_gl.png · gl_shadow_diff.png
const { chromium } = require('playwright'); const S = require('./gl_scene.js'); const { execFileSync } = require('child_process');
(async () => { const b = await chromium.launch({ args: S.ARGS }); const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (/\[GL\]/.test(m.text())) errs.push(m.text()); });
  await p.addInitScript(() => { try { localStorage.setItem('aden_gl', 'force'); localStorage.setItem('aden_gl_bloom', '0'); } catch (e) {} });
  await S.login(p, { cls: 'knight', name: 'glS' }); await p.waitForTimeout(1500);
  const draw = `(g) => { g.save(); g.setTransform(2,0,0,2,0,0); g.fillStyle='#203040'; g.fillRect(20,20,600,300);
    const sh=(c,b,x,y)=>{ g.shadowColor=c; g.shadowBlur=b; g.shadowOffsetX=x; g.shadowOffsetY=y; };
    sh('rgba(0,0,0,.8)',8,4,4); g.fillStyle='#e0b050'; g.fillRect(50,50,80,50);
    sh('#ffd040',14,0,0); g.fillStyle='#fff6c0'; g.beginPath(); g.arc(200,80,25,0,7); g.fill();
    sh('rgba(255,80,40,1)',20,0,0); g.strokeStyle='#ffa060'; g.lineWidth=3; g.beginPath(); g.moveTo(260,60); g.lineTo(320,110); g.lineTo(380,50); g.stroke();
    sh('rgba(0,0,0,.7)',3,1,1); g.font='bold 22px sans-serif'; g.fillStyle='#ffffff'; g.fillText('그림자 글자 Shadow', 60, 180);
    sh('rgba(200,220,255,.9)',10,0,0); g.fillStyle='#e8f0ff'; g.beginPath(); g.moveTo(420,60); g.lineTo(470,120); g.lineTo(400,120); g.closePath(); g.fill();
    sh('rgba(0,0,0,.6)',0,6,6); g.fillStyle='#60c070'; g.fillRect(450,160,60,40);
    const cv=document.createElement('canvas'); cv.width=cv.height=40; const q=cv.getContext('2d'); q.fillStyle='#c04040'; q.beginPath(); q.arc(20,20,16,0,7); q.fill();
    sh('rgba(255,255,0,1)',12,0,0); g.drawImage(cv,300,170,50,50); g.restore(); }`;
  await p.waitForFunction(() => GLR.on() && GLR.info().frame > 5, null, { timeout: 60000 }); await S.freeze(p);
  const { R, gl, out } = await p.evaluate(src => { const f = eval(src); let gl, out;
    out = GLR._frameWith(g => { g.fillStyle = '#000'; g.fillRect(0, 0, 4000, 4000); f(g); }); gl = document.getElementById('glcv').toDataURL();
    const cv = document.createElement('canvas'); cv.width = out.pw; cv.height = out.ph; const g2 = cv.getContext('2d'); g2.fillStyle = '#000'; g2.fillRect(0, 0, cv.width, cv.height); f(g2);
    return { R: cv.toDataURL(), gl, out }; }, draw);
  const fs = require('fs'); const dec = d => Buffer.from(d.split(',')[1], 'base64'); fs.writeFileSync('dev/out/gl_shadow_2d.png', dec(R)); fs.writeFileSync('dev/out/gl_shadow_gl.png', dec(gl));
  console.log('gl stats', JSON.stringify({ shadow: out.shadow, tShadow: out.tShadow, path: out.path, why: await p.evaluate(() => GLR.why()) }));
  const py = `import sys,numpy as np
from PIL import Image
a=np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int)[:640,:1280]; b=np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(int)[:640,:1280]
d=np.abs(a-b).max(axis=2); o=(a*0.35).astype(np.uint8); o[d>48]=[255,40,40]; o[(d>16)&(d<=48)]=[255,200,60]; Image.fromarray(o).save(sys.argv[3])
m=(a.sum(axis=2)>0)|(b.sum(axis=2)>0); print('mean %.3f gt16 %.3f%% gt48 %.3f%%'%(np.abs(a-b).mean(),(d>16).mean()*100,(d>48).mean()*100))`;
  console.log('diff', execFileSync('python3', ['-c', py, 'dev/out/gl_shadow_2d.png', 'dev/out/gl_shadow_gl.png', 'dev/out/gl_shadow_diff.png']).toString().trim());
  console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors'); await b.close(); })();
