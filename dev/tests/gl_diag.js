// 새 그래픽 진단 버튼(ESC [새 그래픽 진단]) 동작 확인 — KT_PORT=8769 bash dev/runkt.sh dev/tests/gl_diag.js → dev/out/gl_diag.png
const { chromium } = require('playwright'); const S = require('./gl_scene.js');
(async () => { const b = await chromium.launch({ args: S.ARGS }); const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('aden_gl', '0'); localStorage.setItem('aden_gl_force', '1'); } catch (e) {} });
  await S.login(p, { cls: 'knight', name: 'glD' }); await p.waitForTimeout(1500);
  await p.keyboard.press('Escape'); await p.waitForSelector('#esc-gldiag', { state: 'visible', timeout: 10000 }); await p.click('#esc-gldiag');
  await p.waitForFunction(() => { const d = document.getElementById('gl-diag'); return d && /결과/.test(d.textContent); }, null, { timeout: 90000, polling: 500 });
  console.log(await p.evaluate(() => document.getElementById('gl-diag').textContent)); console.log('after: GL', await p.evaluate(() => GLR.on()), 'button', await p.evaluate(() => document.getElementById('esc-gl').textContent));
  await p.screenshot({ path: 'dev/out/gl_diag.png' }); console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors'); await b.close(); })();
