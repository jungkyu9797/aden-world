// 몽환의 섬 성능 재기 — KT_PORT=8773 bash dev/runkt.sh dev/tests/dream_perf.js
//   입장 시간 · 바닥 캔버스 크기(MB) · 호스트 몬스터 계산(ms/프레임) · 몹 패킷(24칸 안 · 바이트) · 정령 20마리 그리기(ms/프레임, 화면 밖 캔버스) · 실제 화면 그리기(drawWorld ms)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'drp' }); await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 60; });
  const t0 = Date.now(); await p.evaluate(() => __T.TOWN.toZone(24)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 24 && __T.SCENE === 'field', null, { timeout: 60000 }); const tEnter = Date.now() - t0;
  await p.waitForTimeout(1500);
  const info = await p.evaluate(() => { const I = __T.ISLE, G = I.ground; return { N: I.N, gw: G && G.width, gh: G && G.height, mb: G ? +(G.width * G.height * 4 / 1048576).toFixed(1) : 0, mobs: __T.foxes.length }; });
  console.log('enter', tEnter, 'ms', JSON.stringify(info));
  // 호스트 몬스터 계산: 사분면 안(동쪽)에 서서 updateFox 전부 · 300번 평균
  const host = await p.evaluate(async () => { const T = __T, N = T.ISLE.N, C = N / 2, out = {};
    for (const [q, dx, dz] of [['E', 0.3, -0.3], ['W', -0.3, 0.3]]) { T.TOWN.placeAt(C + dx * N * 0.75, C + dz * N * 0.75); await new Promise(r => setTimeout(r, 400));
      const L = T.foxes.slice(); let s = 0; const n = 300; for (let k = 0; k < n; k++) { const a = performance.now(); for (const f of L) T.updateFox(f, 0.016); s += performance.now() - a; }
      const H = T.hero, rows = T.foxes.filter(f => !f.gone && f.uid != null && Math.max(Math.abs(f.x - H.x), Math.abs(f.z - H.z)) <= 24).map(f => [f.uid, 3, Math.round(f.x * 10), Math.round(f.z * 10), f.row, 100, 0]);
      out[q] = { ms: +(s / n).toFixed(3), near: rows.length, bytes: JSON.stringify(rows).length }; }
    return out; });
  console.log('host', JSON.stringify(host));
  // 정령 20마리 그리기 (화면 밖 캔버스 1280×800 · 확대 2) — 정령 12 + 대정령 8 · 동작 섞음
  const draw = await p.evaluate(() => { const T = __T, c = document.createElement('canvas'); c.width = 1280; c.height = 800; const g = c.getContext('2d'); const K = ['dr_fire', 'dr_water', 'dr_earth', 'dr_wind'], F = [];
    for (let n = 0; n < 20; n++) { const k = (n < 12 ? 'dr_' : 'dr_g') + K[n % 4].slice(3), f = T.mkMob(k, 5, 5); f.row = n % 8; f.t = n % 3 ? 1 : 0.5; f.atkT = n % 5 === 0 ? 0.3 : null; f.aggro = n % 4 === 0; f.cool = 0.3; f.hi = n * 0.37; if (n % 7 === 3) f.casting = { k: { cast: 1 }, t: 0.4 }; F.push([f, 80 + (n % 5) * 140, 260 + Math.floor(n / 5) * 120]); }
    const run = (n) => { let s = 0; for (let k = 0; k < n; k++) { for (const [f] of F) f.hi += 0.033; const a = performance.now(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 1280, 800); g.setTransform(2, 0, 0, 2, 0, 0); for (const [f, x, y] of F) { g.save(); g.translate(x / 2 + 40, y / 2); T.drawSpirit(g, f); g.restore(); } g.getImageData(0, 0, 1, 1); s += performance.now() - a; } return s / n; };
    run(20); const ms = run(150); return { ms: +ms.toFixed(2) }; });
  console.log('spirits20', JSON.stringify(draw));
  // 실제 화면: 영웅 둘레에 정령 20마리 · drawWorld 시간
  await p.evaluate(() => { const T = __T, N = T.ISLE.N, C = Math.floor(N / 2); T.TOWN.placeAt(C + 0.5, C + 0.5); T.dwWrap(); const H = T.hero; for (let q = T.foxes.length - 1; q >= 0; q--) if (!T.MOB[T.foxes[q].kind].boss) T.foxes.splice(q, 1); const K = ['fire', 'water', 'earth', 'wind'];
    for (let n = 0; n < 20; n++) { const k = (n < 12 ? 'dr_' : 'dr_g') + K[n % 4], m = T.mkMob(k, H.i - 4 + (n % 5) * 2, H.j - 3 + Math.floor(n / 5) * 2); m.home = [m.i, m.j]; m.aggro = false; T.MOB[k].passive = true; T.foxes.push(m); } });
  await p.waitForTimeout(800); await p.evaluate(() => { window.__dwT.length = 0; }); await p.waitForTimeout(3000);
  const dw20 = await p.evaluate(() => { const a = window.__dwT.slice().sort((x, y) => x - y); return { n: a.length, avg: +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(2), p50: +a[a.length >> 1].toFixed(2), p90: +a[Math.floor(a.length * 0.9)].toFixed(2) }; });
  await p.evaluate(() => { const T = __T; for (let q = T.foxes.length - 1; q >= 0; q--) if (T.MOB[T.foxes[q].kind].spirit) T.foxes.splice(q, 1); window.__dwT.length = 0; }); await p.waitForTimeout(3000);
  const dw0 = await p.evaluate(() => { const a = window.__dwT.slice().sort((x, y) => x - y); return { n: a.length, avg: +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(2), p50: +a[a.length >> 1].toFixed(2) }; });
  console.log('drawWorld 20 spirits', JSON.stringify(dw20), '· 0 spirits', JSON.stringify(dw0));
  console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'no page errors'); await b.close(); })();
