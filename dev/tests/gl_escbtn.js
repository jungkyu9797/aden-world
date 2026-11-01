// ESC 메뉴 [새 그래픽(베타)] 켜고 끄기 확인 — python3 dev/mkkt.py && bash dev/runkt.sh dev/tests/gl_escbtn.js
const { chromium } = require('playwright'); const S = require('./gl_scene.js');
(async () => { const b = await chromium.launch({ args: S.ARGS }); const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await S.setup(p, { chars: 3, mobs: 5, fx: false });
  const r0 = await p.evaluate(() => ({ demo: !!window.DEMO_MODE, btn: (document.getElementById('esc-gl') || {}).textContent, diag: !!document.getElementById('esc-gldiag'), on: GLR.on() }));
  await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.click('#esc-gl'); await p.waitForTimeout(2500);
  const r1 = await p.evaluate(() => ({ btn: document.getElementById('esc-gl').textContent, on: GLR.on(), ls: localStorage.getItem('aden_gl') }));
  await p.screenshot({ path: 'dev/out/gl_escbtn.png' }); await p.click('#esc-gl'); await p.waitForTimeout(800);
  const r2 = await p.evaluate(() => ({ btn: document.getElementById('esc-gl').textContent, on: GLR.on(), ls: localStorage.getItem('aden_gl') }));
  console.log(JSON.stringify({ r0, r1, r2, errs: errs.slice(0, 3) })); await b.close(); })();
