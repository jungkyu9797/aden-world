// 11/1 절전 모드: 위치·남은 시간 · 혼자 잡아도 처치 수 · 마을 다녀와도 처치·획득 아이템 유지 · 전투 중인 보스와 남은 HP · 업데이트 뒤 이어서 (KT_PORT=8799 bash dev/runkt.sh dev/tests/saverinfo.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'svI' });
  await p.evaluate(() => { const T = __T; T.GOD_INV = true; T.hero.lv = 60; T.INV.add('hw_hat', 1, true); });
  const sv = () => p.evaluate(() => ({ st: document.getElementById('sv-st').textContent, k: document.getElementById('sv-k').textContent, items: document.getElementById('sv-items').textContent, boss: document.getElementById('sv-boss').hidden ? '' : document.getElementById('sv-boss').textContent }));
  const killOne = () => p.evaluate(() => { const T = __T, f = T.foxes.find(m => !m.dead && !m.gone && !(T.MOB[m.kind] || {}).boss && !(T.MOB[m.kind] || {}).dummy); if (!f) return false; f.dmgBy = new Map([[T.hero, 10]]); f.hp = 0; T.killCheck(f); return true; });
  await p.evaluate(() => __T.TOWN.toZone(21)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 21 && __T.SCENE === 'field', null, { timeout: 20000 }); await p.waitForTimeout(2000);
  await p.evaluate(() => window.SAVER.enter(false)); await p.waitForTimeout(1300);
  let s = await sv(); console.log('hw', JSON.stringify(s));
  ok('위치(할로윈 호박밭 · 좌표) + 할로윈 남은 시간', /📍 할로윈 호박밭/.test(s.st) && /\(\d+, \d+\)/.test(s.st) && /할로윈 남은 시간 \d/.test(s.st));
  for (let q = 0; q < 3; q++) await killOne(); await p.evaluate(() => __T.INV.add('hw_seed', 7)); await p.waitForTimeout(1300); s = await sv(); console.log('kills', s.k, s.items);
  ok('혼자 잡은 몹도 처치 수에 셈 (3)', s.k === '3'); ok('획득 아이템 (호박씨 ×7)', /호박씨 ×7/.test(s.items));
  // 보스
  await p.evaluate(() => { const T = __T, f = T.mkMob('ogre', T.hero.i + 3, T.hero.j); f.passiveT = 1; T.foxes.push(f); window.__OG = f; T.hero.target = f; f.hp = Math.round(f.max * 0.4); }); await p.waitForTimeout(1300); s = await sv(); console.log('boss', s.boss);
  ok('전투 중인 보스 이름과 남은 HP', /전투 중/.test(s.boss) && /\d[\d,]* \/ [\d,]+ \(40\.0%\)/.test(s.boss));
  await p.screenshot({ path: 'dev/out/saverinfo_hw.png' });
  await p.evaluate(() => { __T.hero.target = null; window.__OG.stunT = 999; window.__OG.aggro = false; window.__OG.tgt = null; window.__OG.myHitAt = -1e9; }); await p.waitForTimeout(1300); s = await sv(); ok('보스와 안 싸우면 보스 칸 숨김', !s.boss);
  await p.evaluate(() => { window.__OG.myHitAt = __T.time; }); await p.waitForTimeout(1300); s = await sv(); ok('내가 때린 보스(대상이 아니어도) 표시', /오우거/.test(s.boss)); await p.evaluate(() => { window.__OG.gone = true; });
  // 마을 다녀오기
  await p.evaluate(() => __T.TOWN.goTown()); await p.waitForTimeout(2500); s = await sv(); console.log('town', JSON.stringify(s));
  ok('마을: 위치 마을 · 남은 시간 없음', /📍 마을/.test(s.st) && !/남은 시간/.test(s.st));
  ok('마을에 다녀와도 처치·획득 아이템 그대로', s.k === '3' && /호박씨 ×7/.test(s.items));
  await p.evaluate(() => __T.TOWN.toZone(21)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 21 && __T.SCENE === 'field', null, { timeout: 20000 }); await p.waitForTimeout(1500);
  await killOne(); await p.waitForTimeout(1300); s = await sv(); ok('다시 사냥 → 처치 이어서 (4)', s.k === '4');
  // 업데이트 뒤 이어서
  const snap = await p.evaluate(() => { __T.ACCOUNT.keepForUpdate(); const r = JSON.parse(localStorage.getItem('aden_resume') || 'null'); localStorage.removeItem('aden_resume'); return r && r.sv; });
  ok('업데이트 직전 저장에 절전 기록', snap && snap.kills === 4 && snap.items.some(x => x[0] === 'hw_seed' && x[1] === 7));
  await p.evaluate(() => window.SAVER.exit()); await p.evaluate(s => window.SAVER.resume(s), snap); await p.waitForTimeout(1300); s = await sv(); console.log('resume', JSON.stringify(s));
  ok('업데이트 뒤 절전·처치·아이템 이어서', await p.evaluate(() => window.SAVER.on()) && s.k === '4' && /호박씨 ×7/.test(s.items));
  // 몽환의 섬
  await p.evaluate(() => __T.TOWN.toZone(24)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 24 && __T.SCENE === 'field', null, { timeout: 30000 }); await p.waitForTimeout(1500); s = await sv(); console.log('dream', s.st);
  ok('몽환의 섬: 위치(광장/방위 지역) + 남은 시간', /📍 몽환의 섬 · (가운데 제단 광장|[동서남북]쪽 [불물땅바람]+ 지역)/.test(s.st) && /몽환의 섬 남은 시간 \d/.test(s.st));
  await p.evaluate(() => { const T = __T, C = T.ISLE.N / 2; T.hero.i = Math.floor(C + 30); T.hero.j = Math.floor(C - 2); T.hero.x = T.hero.i + 0.5; T.hero.z = T.hero.j + 0.5; }); await p.waitForTimeout(1300); s = await sv(); console.log('dream E', s.st);
  ok('몽환의 섬 동쪽 → 불 지역', /동쪽 불 지역/.test(s.st));
  await p.screenshot({ path: 'dev/out/saverinfo_dream.png' });
  // 콜로세움
  await p.evaluate(() => { window.SAVER.exit(); __T.TOWN.goTown(); }); await p.waitForTimeout(2000);
  await p.evaluate(() => window.__COLO.open(true)); await p.waitForTimeout(800); await p.evaluate(() => document.getElementById('co-solo').click()); await p.waitForTimeout(2500);
  await p.evaluate(() => { window.__COLO.dbg().t = 9.9; }); await p.waitForTimeout(1500); await p.evaluate(() => window.SAVER.enter(false)); await p.waitForTimeout(1300); s = await sv(); console.log('colo', JSON.stringify(s));
  ok('콜로세움: 라운드·남은 시간 + 보스 칸', /콜로세움 1라운드/.test(s.st) && /남은 시간 \d/.test(s.st) && /전투 중/.test(s.boss));
  await p.screenshot({ path: 'dev/out/saverinfo_colo.png' });
  await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(800); await p.screenshot({ path: 'dev/out/saverinfo_narrow.png' });
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
