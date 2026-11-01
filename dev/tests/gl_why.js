// 새 그래픽(WebGL) 개발용: GL 켜고 몇 초 뒤 2D로 빠진 이유(GLR.why · 개발 표시 켬) 출력 — KT_PORT=8769 bash dev/runkt.sh dev/tests/gl_why.js
const { chromium } = require('playwright'); const S = require('./gl_scene.js');
(async () => { const b = await chromium.launch({ args: S.ARGS }); const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await p.addInitScript(() => { try { localStorage.setItem('aden_gl', 'force'); localStorage.setItem('aden_gl_bloom', '0'); } catch (e) {} }); await p.addInitScript(() => { const t = setInterval(() => { if (window.GLR) { GLR._dbg.on = true; clearInterval(t); } }, 50); });
  await S.setup(p, { chars: 30, mobs: 30 }); await p.waitForTimeout(8000);
  console.log(JSON.stringify(await p.evaluate(() => ({ why: GLR.why(), st: GLR.stats(), info: GLR.info() })))); await b.close(); })();
