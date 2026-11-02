// 새 그래픽: 전설 변신 오로라가 원래 그래픽보다 눈부시지 않은지 (빛 번짐 빼기) — bash dev/runkt.sh dev/tests/gl_legaura.js → dev/out/gl_legaura.png (왼쪽 원래 · 오른쪽 새 그래픽)
const { chromium } = require('playwright'); const login = require('../tq.js'); const S = require('./gl_scene.js'); const { execFileSync } = require('child_process');
(async () => { const b = await chromium.launch({ args: S.ARGS }); const p = await b.newPage({ viewport: { width: 1000, height: 640 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: process.env.LAC || 'wizard', name: 'glLA', init: () => { try { localStorage.setItem('aden_gl', 'force'); window.__LA = 'arc_mage'; window.__LANB = 0; } catch (e) {} } });
  await p.evaluate(() => { const T = __T; T.hero.lv = 55; const s = PCG.state(); const id = window.__LA || 'kaspar'; s.cards = { [id]: 1 }; s.slot = {}; PCG.sync(); PCG.setSlot(id); if (window.__LANB) GLR.noBloom = null; T.DN_ && T.DN_.set(0); });
  await p.waitForTimeout(3000); await S.freeze(p);
  const box = { x: 380, y: 140, width: 240, height: 300 }; const res = {};
  for (const [k, gl] of [['off', false], ['on', true]]) { await S.redraw(p, gl); await p.waitForTimeout(120); await p.screenshot({ path: `dev/out/_la_${k}.png`, clip: box }); }
  const m = execFileSync('python3', ['-c', `
from PIL import Image; import numpy as np
a=np.asarray(Image.open('dev/out/_la_off.png').convert('L')).astype(float); b=np.asarray(Image.open('dev/out/_la_on.png').convert('L')).astype(float)
o=Image.new('RGB',(480,300)); o.paste(Image.open('dev/out/_la_off.png'),(0,0)); o.paste(Image.open('dev/out/_la_on.png'),(240,0)); o.save('dev/out/gl_legaura.png')
print(round(a.mean(),1), round(b.mean(),1), int((a>235).sum()), int((b>235).sum()))`]).toString().trim().split(' ').map(Number);
  console.log(JSON.stringify({ meanOff: m[0], meanOn: m[1], whiteOff: m[2], whiteOn: m[3], errs: errs.slice(0, 2) }));
  console.log(m[1] <= m[0] * 1.15 && m[3] <= m[2] * 1.5 + 200 ? 'OK 새 그래픽 밝기가 원래와 비슷' : 'FAIL 새 그래픽이 더 밝음'); await b.close(); })();
