// 새 그래픽(WebGL) 빛 번짐(블룸) 눈으로 보기 — KT_PORT=8769 bash dev/runkt.sh dev/tests/gl_bloom.js → dev/out/gl_bloom_off.png · gl_bloom_on.png (같은 멈춘 장면)
const { chromium } = require('playwright'); const S = require('./gl_scene.js');
(async () => { const b = await chromium.launch({ args: S.ARGS }); const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (/\[GL\]/.test(m.text())) errs.push(m.text()); });
  await p.addInitScript(() => { try { localStorage.setItem('aden_gl', 'force'); localStorage.setItem('aden_gl_bloom', '0.75'); } catch (e) {} });
  await S.setup(p, { chars: 30, mobs: 30, fx: true }); await p.waitForTimeout(3000); await S.freeze(p);
  for (const on of [false, true]) { await p.evaluate(on => GLR.bloom(on, 0.75), on); const r = await S.redraw(p, true); await p.waitForTimeout(150);
    await p.screenshot({ path: `dev/out/gl_bloom_${on ? 'on' : 'off'}.png`, clip: { x: 240, y: 60, width: 800, height: 480 } }); console.log(on ? 'on' : 'off', JSON.stringify({ bloom: r.bloom, bloomQ: r.bloomQ, tBloom: r.tBloom })); }
  console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors'); await b.close(); })();
