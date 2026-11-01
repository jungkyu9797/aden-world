// 새 그래픽(WebGL) 그래픽카드 메모리·그림 올리기 진단 — KT_PORT=8769 bash dev/runkt.sh dev/tests/gl_mem.js
//   화룡의 둥지 2구역 30명 장면: 텍스처 큰 것 순서(크기·밉맵·몇 번 올렸나·누가) · 프레임마다 올린 픽셀 · 몽환의 섬 보스 막대 글자 스크린샷
const { chromium } = require('playwright'); const S = require('./gl_scene.js');
(async () => { const b = await chromium.launch({ args: S.ARGS }); const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (/\[GL\]/.test(m.text())) errs.push(m.text()); });
  await p.addInitScript(() => { try { localStorage.setItem('aden_gl', 'force'); } catch (e) {} });
  await S.setup(p, { chars: 30, mobs: 30 }); await p.waitForTimeout(6000);
  const r = await p.evaluate(() => new Promise(res => { GLR._dbg.on = true; const ul = {}; let n = 0, px = 0; const t = setInterval(() => { const s = GLR.stats(); n++; px += s.upPx; for (const u of s.ul || []) { const k = u[0] + ' ' + u[1] + 'x' + u[2]; ul[k] = (ul[k] || 0) + 1; } }, 50);
    setTimeout(() => { clearInterval(t); GLR._dbg.on = false; res({ info: GLR.info(), big: GLR._tex ? GLR._tex() : null, ul: Object.entries(ul).sort((a, b) => b[1] - a[1]).slice(0, 15), avgUpKpx: Math.round(px / n / 1000) }); }, 6000); }));
  console.log(JSON.stringify(r, null, 1).slice(0, 4000));
  console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors'); await b.close(); })();
