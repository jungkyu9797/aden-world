// 새 그래픽(WebGL)을 게임 도중에 켤 때(ESC 버튼 = 프로듀서가 하는 방법) — 처음부터 켠 것과 2D 묶음·이유 비교
//   KT_PORT=8769 bash dev/runkt.sh dev/tests/gl_late.js
const { chromium } = require('playwright'); const S = require('./gl_scene.js');
async function run(b, late) { const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(late => { try { localStorage.setItem('aden_gl', late ? '0' : 'force'); localStorage.setItem('aden_gl_force', '1'); } catch (e) {} }, late);
  await S.login(p, { cls: 'knight', name: late ? 'glL' : 'glE' }); await p.waitForTimeout(2000);
  if (late) await p.evaluate(() => GLR.set(true)); await p.waitForTimeout(5000);
  const r = await p.evaluate(() => new Promise(res => { GLR._dbg.on = true; const A = []; const iv = setInterval(() => A.push(GLR.stats()), 300); setTimeout(() => { clearInterval(iv); const L = A.slice(-5); const avg = k => +(L.reduce((s, x) => s + (x[k] || 0), 0) / L.length).toFixed(1);
    res({ on: GLR.on(), runs: avg('runs'), runKpx: Math.round(avg('runPx') / 1000), path: avg('path'), imgR: avg('imgR'), rectR: avg('rectR'), ms: avg('ms'), rl: (L[L.length - 1].rl || []).slice(0, 6), why: GLR.why() }); }, 4000); }));
  console.log(late ? 'LATE ' : 'EARLY', JSON.stringify(r)); if (errs.length) console.log('ERR', errs.slice(0, 3).join(' | ')); await p.context().close(); }
(async () => { const b = await chromium.launch({ args: S.ARGS }); await run(b, false); await run(b, true); await b.close(); })();
