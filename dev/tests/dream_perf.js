// 몽환의 섬 성능 재기 — KT_PORT=8773 bash dev/runkt.sh dev/tests/dream_perf.js
//   입장 시간 · 바닥 캔버스 크기(MB) · 호스트 몬스터 계산(ms/프레임) · 몹 패킷(24칸 안 · 바이트)
//   정령 20마리 그리기: ① 화면 밖 캔버스(1280×800 · 확대 2) — 한 사분면(정령 16 + 대정령 4 · 동작 섞음) · 프레임마다 게임 시간이 흐르게 rAF 기다림 → 그리기만 잰 ms
//                       ② 실제 화면 drawWorld ms · 3초 동안 프레임 수 — 한 사분면 20마리 / 8종 섞어 20마리(최악) / 0마리
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'drp' }); await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 60; });
  const t0 = Date.now(); await p.evaluate(() => __T.TOWN.toZone(24)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 24 && __T.SCENE === 'field', null, { timeout: 60000 }); const tEnter = Date.now() - t0;
  await p.waitForTimeout(1500);
  const info = await p.evaluate(() => { const I = __T.ISLE, G = I.ground; return { N: I.N, gw: G && G.width, gh: G && G.height, mb: G ? +(G.width * G.height * 4 / 1048576).toFixed(1) : 0, mobs: __T.foxes.length }; });
  console.log('enter', tEnter, 'ms', JSON.stringify(info));
  // 호스트 몬스터 계산: 사분면 안에 서서 updateFox 전부 · 300번 평균 · 24칸 안 몹 패킷
  const host = await p.evaluate(async () => { const T = __T, N = T.ISLE.N, C = N / 2, out = {};
    for (const [q, dx, dz] of [['E', 0.3, -0.3], ['W', -0.3, 0.3], ['S', 0.3, 0.3], ['N', -0.3, -0.3]]) { T.TOWN.placeAt(C + dx * N * 0.75, C + dz * N * 0.75); await new Promise(r => setTimeout(r, 400));
      const L = T.foxes.slice(); let s = 0; const n = 300; for (let k = 0; k < n; k++) { const a = performance.now(); for (const f of L) T.updateFox(f, 0.016); s += performance.now() - a; }
      const H = T.hero, rows = T.foxes.filter(f => !f.gone && f.uid != null && Math.max(Math.abs(f.x - H.x), Math.abs(f.z - H.z)) <= 24).map(f => [f.uid, 3, Math.round(f.x * 10), Math.round(f.z * 10), f.row, 100, 0]);
      out[q] = { ms: +(s / n).toFixed(3), near: rows.length, bytes: JSON.stringify(rows).length }; }
    return out; });
  console.log('host', JSON.stringify(host));
  const mkSet = (mixed) => p.evaluate((mixed) => { const T = __T, K = ['fire', 'water', 'earth', 'wind'], F = [];
    for (let n = 0; n < 20; n++) { const el = mixed ? K[n % 4] : 'fire', k = (mixed ? n < 12 : n < 16) ? 'dr_' + el : 'dr_g' + el, f = T.mkMob(k, 5, 5); f.row = n % 8; f.t = n % 3 ? 1 : 0.5; f.atkT = n % 5 === 0 ? 0.3 : null; f.aggro = n % 4 === 0; f.cool = 0.3; f.hi = n * 0.37; if (n % 7 === 3) f.casting = { k: { cast: 1 }, t: 0.4 }; F.push(f); } window.__F = F; }, mixed);
  const off = async (mixed) => { await mkSet(mixed); return p.evaluate(async () => { const T = __T, c = document.createElement('canvas'); c.width = 1280; c.height = 800; const g = c.getContext('2d'), F = window.__F; let s = 0, n = 0;
    for (let k = 0; k < 150; k++) { await new Promise(r => requestAnimationFrame(r)); const a = performance.now(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 1280, 800); g.setTransform(2, 0, 0, 2, 0, 0); F.forEach((f, i) => { g.save(); g.translate(40 + (i % 5) * 70 + 40, 130 + Math.floor(i / 5) * 60); T.drawSpirit(g, f); g.restore(); }); g.getImageData(0, 0, 1, 1); if (k >= 30) { s += performance.now() - a; n++; } }
    return +(s / n).toFixed(2); }); };
  const offOne = await off(false), offMix = await off(true);
  console.log('spirits20 offscreen ms/frame (warm): one quadrant', offOne, '· 8 kinds mixed', offMix);
  // 실제 화면
  const scene = async (mixed) => { await p.evaluate((mixed) => { const T = __T, N = T.ISLE.N, C = Math.floor(N / 2); T.TOWN.placeAt(C + 0.5, C + 0.5); T.dwWrap(); const H = T.hero; for (let q = T.foxes.length - 1; q >= 0; q--) if (!T.MOB[T.foxes[q].kind].boss) T.foxes.splice(q, 1); const K = ['fire', 'water', 'earth', 'wind'];
      if (mixed != null) for (let n = 0; n < 20; n++) { const el = mixed ? K[n % 4] : 'fire', k = (mixed ? n < 12 : n < 16) ? 'dr_' + el : 'dr_g' + el, m = T.mkMob(k, H.i - 4 + (n % 5) * 2, H.j - 3 + Math.floor(n / 5) * 2); m.home = [m.i, m.j]; m.aggro = false; T.MOB[k].passive = true; T.foxes.push(m); } }, mixed);
    await p.waitForTimeout(1500); await p.evaluate(() => { window.__dwT.length = 0; }); await p.waitForTimeout(3000);
    return p.evaluate(() => { const a = window.__dwT.slice().sort((x, y) => x - y); return { frames3s: a.length, avg: +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(2), p50: +a[a.length >> 1].toFixed(2), p90: +a[Math.floor(a.length * 0.9)].toFixed(2) }; }); };
  const s1 = await scene(false), s2 = await scene(true), s0 = await scene(null);
  console.log('drawWorld one-quadrant 20', JSON.stringify(s1), '· mixed 20', JSON.stringify(s2), '· none', JSON.stringify(s0));
  console.log('cache', JSON.stringify(await p.evaluate(() => __T.DSPC_ ? { px: __T.DSPC_.DSPC.px, frames: __T.DSPC_.DSPC.m.size, live: __T.DSPC_.DSPC.live } : null)));
  console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'no page errors'); await b.close(); })();
