// 11/1 절전 화면 '오늘 할 일': 콜로세움 남은 입장 · 몽환의 섬·할로윈 남은 시간 · 특별 보상 · 완료 표시 · 넓은 화면은 오른쪽, 좁은 화면은 아래 (KT_PORT=8799 bash dev/runkt.sh dev/tests/savertodo.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'tdK' });
  const td = () => p.evaluate(() => { const el = document.getElementById('sv-todo'), c = document.querySelector('.sv-card').getBoundingClientRect(), r = el.getBoundingClientRect(); return { t: el.textContent, items: [...el.querySelectorAll('li')].map(li => li.className + '|' + li.textContent), right: r.left >= c.right - 1, below: r.top >= c.bottom - 1, inView: r.right <= innerWidth + 1 && r.left >= -1 }; });
  await p.evaluate(() => window.SAVER.enter(false)); await p.waitForTimeout(1300);
  let s = await td(); console.log(JSON.stringify(s));
  ok('오늘 할 일: 콜로세움(가호 완성품) 1/1 · 몽환의 섬(엘릭서·축데이·축젤) 4시간 · 할로윈(호박 주머니·마법인형) 모자 필요 · 2시간', /오늘 할 일/.test(s.t) && /콜로세움가호 완성품1\/1/.test(s.items.join('')) && /몽환의 섬엘릭서·축데이·축젤남은 시간 4시간/.test(s.items.join('')) && /할로윈 던전호박 주머니·마법인형모자 필요 · 남은 시간 2시간/.test(s.items.join('')));
  ok('넓은 화면: 카드 오른쪽 · 화면 안', s.right && s.inView);
  await p.screenshot({ path: 'dev/out/savertodo_wide.png' });
  // 남은 시간·완료
  await p.evaluate(() => { const T = __T; T.INV.add('hw_hat', 1, true); const o = T.SAVE.snap(), d = T.DRM.dump().d; o.hw = { d, u: 7200 - 2160 }; o.dr = { d, u: 4 * 3600 - 5400 }; T.SAVE.apply(o); window.__COLO.entIn({ n: 1, d: T.DRM.dump().d }); }); await p.waitForTimeout(1300);
  s = await td(); console.log(JSON.stringify(s.items));
  ok('콜로세움 다 쓰면 완료 · 몽환의 섬 1시간 30분 · 할로윈 36분', /^done\|✔ 콜로세움.*완료/.test(s.items[0]) && /남은 시간 1시간 30분/.test(s.items[1]) && /남은 시간 36분/.test(s.items[2]) && !/모자 필요/.test(s.items[2]));
  await p.evaluate(() => { window.SAVER.exit(); __T.TOWN.toZone(24); }); await p.waitForTimeout(2500); await p.evaluate(() => window.SAVER.enter(false)); await p.waitForTimeout(1300);
  s = await td(); ok('지금 있는 곳 표시 (몽환의 섬 · 지금 여기)', /here/.test(s.items[1]) && /지금 여기/.test(s.items[1]));
  await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(1300); s = await td(); console.log('narrow', JSON.stringify({ below: s.below, inView: s.inView }));
  ok('좁은 화면: 카드 아래 · 화면 안', s.below && s.inView); await p.screenshot({ path: 'dev/out/savertodo_narrow.png' });
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
