// 11/1 창을 최소화·가림(화면 프레임 멈춤)에도 게임이 계속: 워커 타이머로 그리기 없이 진행 · 다시 보이면 화면 프레임 한 줄만 (KT_PORT=8799 bash dev/runkt.sh dev/tests/bgrun.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  const p = await b.newPage({ viewport: { width: 1000, height: 700 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'bgK' });
  await p.evaluate(() => { const T = __T; T.GOD_INV = true; T.hero.lv = 60; T.INV.load({ bag: [{ id: 'lg_sword', n: 1, en: 5, on: 'weapon' }], bonus: { str: 30, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); T.TOWN.toZone(8); });
  await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 8 && __T.SCENE === 'field', null, { timeout: 20000 }); await p.waitForTimeout(1000);
  const spawn = () => p.evaluate(() => { const T = __T, H = T.hero; const f = T.mkMob('ogre', H.i + 1, H.j); f.max = f.hp = 5e6; f.stunT = 1e6; f.aggro = false; T.foxes.push(f); window.__OG = f; H.target = f; return f.uid; });
  const snap = () => p.evaluate(() => ({ t: __T.time, hp: window.__OG.hp, steps: window.__bgInfo().steps, timer: window.__bgInfo().timer, q: (window.__q || []).filter(f => f.name === 'frame').length }));
  await spawn(); await p.waitForTimeout(1500);
  let a = await snap(); await p.waitForTimeout(3000); let c = await snap(); const vis = { dt: c.t - a.t, dmg: a.hp - c.hp, steps: c.steps - a.steps }; console.log('보임', JSON.stringify(vis), c.timer);
  ok('보일 때: 게임 시간 ≤ 실제 시간 (두 배로 안 빨라짐) · 보스를 때림', vis.dt > 2.0 && vis.dt < 3.4 && vis.dmg > 0);
  // 최소화 흉내: 화면 프레임(requestAnimationFrame)이 더 안 옴
  await p.evaluate(() => { window.__q = []; window.__rafO = window.requestAnimationFrame; window.requestAnimationFrame = cb => { window.__q.push(cb); return 0; }; });
  await p.waitForTimeout(500); a = await snap(); await p.waitForTimeout(5000); c = await snap(); const hid = { dt: c.t - a.t, dmg: a.hp - c.hp, steps: c.steps - a.steps, q: c.q }; console.log('최소화', JSON.stringify(hid));
  ok('최소화(화면 프레임 멈춤)에도 게임 진행 (5초 중 4초 넘게) · 보스를 계속 때림', hid.dt > 4 && hid.dt < 5.6 && hid.dmg > vis.dmg && hid.steps > 70);
  ok('기다리는 화면 프레임은 한 개뿐 (다시 보일 때 두 배 빨라지지 않게)', hid.q === 1);
  // 다시 보임
  await p.evaluate(() => { window.requestAnimationFrame = window.__rafO; for (const cb of window.__q.splice(0)) window.__rafO(cb); }); await p.waitForTimeout(800);
  a = await snap(); await p.waitForTimeout(3000); c = await snap(); const back = { dt: c.t - a.t, steps: c.steps - a.steps }; console.log('다시 보임', JSON.stringify(back));
  ok('다시 보이면 원래대로 (화면 프레임으로 · 두 배로 안 빨라짐)', back.dt > 2.0 && back.dt < 3.4 && back.steps < 10);
  const fps = await p.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); })); console.log('fps', fps);
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
