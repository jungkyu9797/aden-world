// 새 그래픽(WebGL) 몽환의 섬 가운데 보스 막대 글자 (11/1 메인방 버그 재현) — KT_PORT=8769 bash dev/runkt.sh dev/tests/gl_bossbar.js → dev/out/gl_bossbar_on.png · gl_bossbar_off.png
const { chromium } = require('playwright'); const S = require('./gl_scene.js');
(async () => { const b = await chromium.launch({ args: S.ARGS }); const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (/\[GL\]/.test(m.text())) errs.push(m.text()); });
  await p.addInitScript(() => { try { localStorage.setItem('aden_gl', 'force'); localStorage.setItem('aden_gl_fx', '0'); } catch (e) {} });
  await S.login(p, { cls: 'knight', name: 'glBB' }); await p.evaluate(() => { __T.GOD_INV = true; __T.TOWN.toZone(24); });
  await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 24 && __T.SCENE === 'field', null, { timeout: 60000 }); await p.waitForTimeout(4000); await S.freeze(p);
  await p.evaluate(() => { GLR._dbg.on = true; }); const st = await S.redraw(p, true); await p.waitForTimeout(150); await p.screenshot({ path: 'dev/out/gl_bossbar_on.png' });
  const why = await p.evaluate(() => GLR.why());
  for (const v of ['noshadow', 'nopath', 'noabs']) { await p.evaluate(v => { GLR._dbg[v] = true; }, v); await S.redraw(p, true); await p.waitForTimeout(150); await p.screenshot({ path: 'dev/out/gl_bossbar_' + v + '.png', clip: { x: 140, y: 0, width: 1000, height: 280 } }); await p.evaluate(v => { GLR._dbg[v] = false; }, v); } await S.redraw(p, false); await p.waitForTimeout(150); await p.screenshot({ path: 'dev/out/gl_bossbar_off.png' });
  console.log(JSON.stringify({ txt: st.txt, txtR: st.txtR, runs: st.runs, rl: (st.rl || []).slice(0, 8), why }));
  console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors'); await b.close(); })();
