// 11/1 몽환의 섬 하루 4시간 (새벽 5시 초기화): 안에서 남은 시간 표시 · 10분 경고 · 다 쓰면 마을로 · 그날은 못 들어감 · 다음 날 초기화 · 저장 (KT_PORT=8774 bash dev/runkt.sh dev/tests/dream_time.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'drT' });
  await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 60; __T.TOWN.toZone(24); }); await p.waitForTimeout(3500);
  const a = await p.evaluate(() => { const t = document.getElementById('dr-timer'); return { isle: __T.ISLE && __T.ISLE.id, vis: !t.hidden, txt: t.textContent, left: __T.DRM.left() }; });
  console.log('in', JSON.stringify(a)); ok('입장 · 위에 "몽환의 섬 남은 시간 3시간 59분…" 표시', a.isle === 24 && a.vis && /몽환의 섬 남은 시간 3시간 59분/.test(a.txt) && a.left <= 4 * 3600 && a.left > 4 * 3600 - 30);
  await p.screenshot({ path: 'dev/out/dream_time.png', clip: { x: 340, y: 40, width: 600, height: 90 } });
  await p.evaluate(() => __T.DRM.dbgSet(4 * 3600 - 590)); await p.waitForTimeout(1500);
  ok('10분 남으면 경고 · 빨간 표시', await p.evaluate(() => __T.log.slice(-6).some(x => /남은 이용 시간이 10분/.test(x.t)) && document.getElementById('dr-timer').classList.contains('low')));
  await p.evaluate(() => __T.DRM.dbgSet(4 * 3600 - 2)); await p.waitForTimeout(4500);
  const k = await p.evaluate(() => ({ scene: __T.SCENE, isle: __T.ISLE && __T.ISLE.id, msg: __T.log.slice(-8).map(x => x.t).join(' | '), vis: !document.getElementById('dr-timer').hidden }));
  console.log('kick', JSON.stringify(k)); ok('다 쓰면 마을로 · 안내 · 시간 표시 꺼짐', k.scene === 'town' && /이용 시간\(4시간\)을 모두 썼습니다/.test(k.msg) && !k.vis);
  await p.evaluate(() => __T.TOWN.toZone(24)); await p.waitForTimeout(1500);
  const bl = await p.evaluate(() => ({ scene: __T.SCENE, msg: __T.log.slice(-3).map(x => x.t).join(' | ') }));
  ok('그날은 다시 못 들어감 (마을 그대로 · 안내)', bl.scene === 'town' && /새벽 5시 뒤에 다시 들어올 수 있어요/.test(bl.msg));
  await p.evaluate(() => __T.TOWN.toZone(22)); await p.waitForTimeout(2000); ok('다른 사냥터는 그대로 들어감', await p.evaluate(() => __T.ISLE && __T.ISLE.id === 22));
  // 월드맵: 몽환의 섬 표시 아래 남은 시간 · 다 썼으면 이동 비용을 안 내고 막힘
  await p.evaluate(() => { __T.TOWN.goTown(); }); await p.waitForTimeout(1500);
  await p.evaluate(() => { __T.setCoins(100000); document.getElementById('btn-map').click(); }); await p.waitForTimeout(600);
  const wm = await p.evaluate(() => { const m = document.querySelector('#wm-stage .mk[data-r="dream_island"]'), t = m && m.querySelector('.wm-tl'); return { t: t && t.textContent, out: t && t.classList.contains('out') }; });
  console.log('wm', JSON.stringify(wm)); ok('월드맵 몽환의 섬 아래 "오늘 시간 다 씀" 표시', /오늘 시간 다 씀/.test(wm.t || '') && wm.out);
  await p.evaluate(() => { document.querySelector('#wm-stage .mk[data-r="dream_island"]').click(); }); await p.waitForTimeout(200);
  const c0 = await p.evaluate(() => __T.coins); await p.evaluate(() => document.getElementById('wm-go').click()); await p.waitForTimeout(400);
  const gb = await p.evaluate(() => ({ c: __T.coins, ask: !!document.querySelector('.yn:not([hidden]), #askyn:not([hidden])'), grade: document.getElementById('wm-grade').textContent, msg: __T.log.slice(-2).map(x => x.t).join(' | ') }));
  console.log('go', JSON.stringify(gb)); ok('다 썼으면 [사냥 시작]이 비용 없이 막힘 · 설명 칸에도 표시', gb.c === c0 && /새벽 5시 뒤에/.test(gb.msg) && /오늘 시간 다 씀/.test(gb.grade));
  await p.evaluate(() => { __T.DRM.dbgSet(3600 + 12 * 60); const w = document.getElementById('wmap'); w.hidden = true; document.getElementById('btn-map').click(); }); await p.waitForTimeout(500);
  const wm2 = await p.evaluate(() => document.querySelector('#wm-stage .mk[data-r="dream_island"] .wm-tl').textContent); console.log('wm2', wm2);
  ok('남았으면 "오늘 남은 시간 2시간 48분"', /오늘 남은 시간 2시간 48분/.test(wm2));
  await p.screenshot({ path: 'dev/out/dream_time_map.png', clip: await p.evaluate(() => { const r = document.querySelector('#wm-stage .mk[data-r="dream_island"]').getBoundingClientRect(); return { x: Math.max(0, r.left - 120), y: Math.max(0, r.top - 60), width: 360, height: 220 }; }) });
  await p.evaluate(() => { document.getElementById('wmap').hidden = true; __T.DRM.dbgSet(4 * 3600 + 5); });
  const sv = await p.evaluate(() => __T.DRM.dump()); ok('저장 값 (오늘 · 다 씀)', !!sv.d && sv.u >= 4 * 3600);
  await p.evaluate(() => { __T.DRM.load({ d: '19990101', u: 99999 }); __T.TOWN.goTown(); }); await p.waitForTimeout(1500);
  ok('다음 날(날짜가 바뀐 기록)이면 4시간으로 초기화', await p.evaluate(() => __T.DRM.left() === 4 * 3600));
  await p.evaluate(() => __T.TOWN.toZone(24)); await p.waitForTimeout(2500); ok('초기화 뒤 다시 입장', await p.evaluate(() => __T.ISLE && __T.ISLE.id === 24 && __T.SCENE === 'field'));
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
