// 새 그래픽(WebGL) GPU 불티 눈으로 보기 — KT_PORT=8769 bash dev/runkt.sh dev/tests/gl_spark.js → dev/out/gl_spark.png
//   장면(gl_scene) 위에서 몹 몇 마리에 hitFx 대신 GLR.spark를 직접 쏨 + 불 터짐 · 그 순간 스크린샷 · 오류·통계
const { chromium } = require('playwright'); const S = require('./gl_scene.js');
(async () => { const b = await chromium.launch({ args: S.ARGS }); const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (/\[GL\]/.test(m.text())) errs.push(m.text()); });
  await p.addInitScript(() => { try { localStorage.setItem('aden_gl', 'force'); } catch (e) {} });
  await S.setup(p, { chars: 10, mobs: 12, fx: false, still: true }); await p.evaluate(() => { window.__glStill = true; }); await p.waitForTimeout(2000);
  await S.freeze(p);
  const r = await p.evaluate(() => new Promise(res => { const T = __T, L = T.foxes.filter(f => !f.dead).slice(0, 8);
    for (const f of L) { const q = T.W2P(f.x, f.z); GLR.spark(q[0], q[1] - 30, 30, { c: '#ffd070', sp: 190, life: 0.5 }); }
    const q = T.W2P(T.hero.x, T.hero.z); GLR.spark(q[0], q[1], 40, { c: '#ff8a30', sp: 110, life: 0.8, g: -60, up: 20, sz: 2 });
    setTimeout(() => { const st = GLR._redraw(true); res({ st, info: GLR.info() }); }, 150); }));
  await p.screenshot({ path: 'dev/out/gl_spark.png', clip: { x: 240, y: 60, width: 800, height: 480 } });
  console.log(JSON.stringify({ spark: r.st.spark, bloom: r.st.bloom, ms: r.st.ms, failed: r.info.failed, why: r.info.why }));
  console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors'); await b.close(); })();
