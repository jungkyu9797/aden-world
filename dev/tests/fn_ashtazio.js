// 아시타지오 코드 그림 확인: 2구역(23)에서 8방향 서 있기 · 공격(불덩이 키우기·쏘기) · 화염 기둥 시전 · 맞음 · 사망(재로 무너짐) 스크린샷 (bash dev/runkt.sh dev/tests/fn_ashtazio.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'fnA' }); await p.evaluate(() => { __T.GOD_INV = true; });
  await p.evaluate(() => __T.TOWN.toZone(23)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 23 && __T.SCENE === 'field', null, { timeout: 20000 }); await p.waitForTimeout(1500);
  console.log('def', JSON.stringify(await p.evaluate(() => { const S = __T.MOB.fn_ashtazio; return { art: S.art, sc: S.sc, hw: S.hw, hh: S.hh }; })));
  const shot = async (name, f = '__A', w = 320, h = 330) => { const [x, y] = await p.evaluate(f => { const m = window[f]; return __T.scr(m.x, m.z); }, f); await p.screenshot({ path: `dev/out/${name}.png`, clip: { x: Math.max(0, x - w / 2), y: Math.max(0, y - h * 0.86), width: w, height: Math.min(h, 560 - Math.max(0, y - h * 0.86)) } }); };
  // 주변 몹 치우고 영웅 옆에 아시타지오 · 살라맨더 · 영웅 나란히 (크기 비교)
  await p.evaluate(() => { const T = __T, H = T.hero; H.i = H.fi = H.i + 6; H.j = H.fj = H.j - 6; H.x = H.i + .5; H.z = H.j + .5; H.t = 1; const f = T.foxes.find(m => m.kind === 'fn_ashtazio'), s = T.foxes.find(m => m.kind === 'fn_salamander'), c = T.foxes.find(m => m.kind === 'fn_hcerberus'); for (let q = T.foxes.length - 1; q >= 0; q--) if (![f, s, c].includes(T.foxes[q])) T.foxes.splice(q, 1); f.i = f.fi = H.i + 2; f.j = f.fj = H.j; f.x = f.i + .5; f.z = f.j + .5; f.t = 1; f.home = [f.i, f.j]; f.row = 1; window.__A = f;
    for (const [m, di, dj] of [[s, 3, -2], [c, -1, -3]]) if (m) { m.aggro = false; m.i = m.fi = H.i + di; m.j = m.fj = H.j + dj; m.x = m.i + .5; m.z = m.j + .5; m.t = 1; m.home = [m.i, m.j]; } window.__S = s; window.__C = c; });
  await p.waitForTimeout(3000); await p.screenshot({ path: 'dev/out/fn_ash_full.png' }); console.log('scr', JSON.stringify(await p.evaluate(() => [__T.scr(__A.x, __A.z), __T.scr(__T.hero.x, __T.hero.z)])));
  { const [x, y] = await p.evaluate(() => __T.scr(__A.x, __A.z)); await p.screenshot({ path: 'dev/out/fn_ash_size.png', clip: { x: x - 330, y: y - 300, width: 560, height: 360 } }); }
  // 8방향
  for (let r = 0; r < 8; r++) { await p.evaluate(r => { __A.row = r; __A.t = 1; __A.aggro = false; __A.stunT = 99; __A.dingT = 999; __A.atkT = null; __A.casting = null; }, r); await p.waitForTimeout(120); await p.evaluate(r => { __A.row = r; }, r); await shot('fn_ash_dir' + r, '__A', 260, 300); }
  // 동작 (몹을 묶어 두고 상태를 직접 넣어 찍음: 보는 사람 쪽을 바라봄)
  const pose = (js, wait = 150) => p.evaluate(js).then(() => p.waitForTimeout(wait));
  await pose(() => { const f = __A; f.row = 1; f.stunT = 99; f.dingT = 999; f.bindUntil = __T.time + 999; f.aggro = true; f.cool = 5; });
  await shot('fn_ash_idle');
  await pose(() => { __A.cool = 0.15; }); await shot('fn_ash_charge');
  for (const [k, n] of [[0.04, 'attack'], [0.12, 'attack1'], [0.45, 'attack2']]) { await pose(k => { Object.defineProperty(__A, 'atkT', { get: () => k * 0.8 / 0.7, set() {}, configurable: true }); }, k); await shot('fn_ash_' + n); }
  await pose(() => { delete __A.atkT; __A.atkT = null; __A.cool = 5; __A.casting = { k: { cast: 0.9 }, t: 0.2, tg: null }; }); await shot('fn_ash_cast', '__A', 360, 330);
  await pose(() => { __A.casting = null; __A.flash = 0.5; }, 30); await shot('fn_ash_hit');
  await pose(() => { const f = __A; f.flash = 0; f.stunT = 0; f.bindUntil = 0; f.aggro = false; f.dead = true; f.deadT = 0; f.hp = 0; }, 0);
  for (const [ms, n] of [[300, 1], [350, 2], [400, 3]]) { await p.waitForTimeout(ms); await shot('fn_ash_dead' + n); }
  // 실제 사망 처리도 한 번 (오류 확인용)
  await p.evaluate(() => { const T = __T, H = T.hero; const m = T.mkMob('fn_ashtazio', H.i + 2, H.j + 2); m.home = [H.i + 2, H.j + 2]; T.foxes.push(m); window.__B = m; }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const f = __B; f.hp = -10; __T.killCheck(f); }); await p.waitForTimeout(1500);
  console.log('dead', await p.evaluate(() => [!!__A.dead, !!__B.dead]));
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
