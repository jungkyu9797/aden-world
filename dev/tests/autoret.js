// 11/1 자동사냥 복귀: 마을 다녀오면 자동사냥을 켠 지역·좌표 4칸 안으로 (몽환의 섬 포함) (KT_PORT=8799 bash dev/runkt.sh dev/tests/autoret.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  const p = await b.newPage({ viewport: { width: 1000, height: 700 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'arK' });
  await p.evaluate(() => { const T = __T; T.GOD_INV = true; T.hero.lv = 60; T.setCoins(1e8); const C = T.AUTO.conf(); C.lowPot = true; C.lowN = 0; C.buyQ = { red_potion: 50 }; C.lowIds = { red_potion: true };
    const o = T.TOWN.placeAt; T.TOWN.placeAt = (x, z) => { o(x, z); if (T.SCENE === 'field' && T.AUTO.on()) window.__PL = [T.hero.i, T.hero.j, T.ISLE && T.ISLE.id]; }; });
  const goZone = async z => { await p.evaluate(z => __T.TOWN.toZone(z), z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', z, { timeout: 30000 }); await p.waitForTimeout(1200); };
  const start = (pl) => p.evaluate(pl => { const T = __T, N = T.ISLE.N; for (let t = 0; t < 30; t++) { const i = Math.floor(N * pl[0] + pl[2]) + t, j = Math.floor(N * pl[1] + pl[3]); T.TOWN.placeAt(i + 0.5, j + 0.5); if (T.hero.i === i && T.hero.j === j) break; }
      window.__PL = null; T.INV.add('red_potion', 5, true); T.AUTO.toggle(); const a = T.AUTO.anchor(); T.INV.take('red_potion', T.INV.count('red_potion')); return a; }, pl);   // 물약을 다 빼면 '물약 부족'으로 마을 → 사서 돌아옴
  const back = async () => { let got = null; for (let t = 0; t < 90 && !got; t++) { await p.waitForTimeout(400); got = await p.evaluate(() => window.__PL); } const log = await p.evaluate(() => __T.log.slice(-6).map(l => l.t)); await p.evaluate(() => { if (__T.AUTO.on()) __T.AUTO.toggle(); }); return { got, log }; };
  for (const [z, pl, label] of [[2, [0.3, 0.6, 0, 0], '2번 지역'], [24, [0.5, 0.5, 32, -3], '몽환의 섬 동쪽(불 지역)']]) {
    await goZone(z); const a = await start(pl); const { got, log } = await back(); const d = got && a ? Math.max(Math.abs(got[0] - a.i), Math.abs(got[1] - a.j)) : 99;
    console.log(label, JSON.stringify({ a, got, d, log: log.filter(t => /자동사냥/.test(t)) }));
    ok(`${label}: 마을 다녀온 뒤 켠 자리 4칸 안으로 (거리 ${d})`, !!got && got[2] === z && d <= 4 && log.some(t => /처음 켠 자리/.test(t))); }
  // 그 자리에 몬스터가 있으면 4칸 안 다른 빈 칸
  { await goZone(2); const a = await start([0.5, 0.5, 0, 0]);
    await p.evaluate(a => { const T = __T, o = T.TOWN.toZone; T.TOWN.toZone = (id, x, z) => { o(id, x, z); if (id !== a.z || T.SCENE !== 'field') return; const m = T.foxes.find(f => !f.dead && !(T.MOB[f.kind] || {}).boss); if (m) { m.i = a.i; m.j = a.j; m.x = a.i + 0.5; m.z = a.j + 0.5; m.t = 1; m.stunT = 99; } T.TOWN.toZone = o; }; }, a);
    const { got } = await back(); const d = got ? Math.max(Math.abs(got[0] - a.i), Math.abs(got[1] - a.j)) : 99; console.log('blocked', JSON.stringify({ a, got, d }));
    ok('그 자리에 몬스터가 있으면 4칸 안 다른 빈 칸', !!got && d >= 1 && d <= 4); }
  // 몽환의 섬 시간을 다 쓰면 마을에서 멈춤
  { await goZone(24); await start([0.5, 0.5, 32, -3]); for (let t = 0; t < 40; t++) { await p.waitForTimeout(300); if (await p.evaluate(() => __T.SCENE === 'town')) break; }
    await p.evaluate(() => __T.DRM.dbgSet(99999)); await p.waitForTimeout(4000);
    const s = await p.evaluate(() => ({ on: __T.AUTO.on(), sc: __T.SCENE, log: __T.log.slice(-4).map(l => l.t) })); console.log('dream out', JSON.stringify(s));
    ok('몽환의 섬 이용 시간을 다 쓰면 마을에서 자동사냥 멈춤', !s.on && s.sc === 'town' && s.log.some(t => /몽환의 섬 이용 시간을 다 써서/.test(t))); }
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
