// 몽환의 섬 3차 (유니콘·정령 실사 렌더 그림) 테스트 — KT_PORT=8774 bash dev/runkt.sh dev/tests/dream3.js
//   ① 아틀라스 4장 불러옴 · 메타의 모든 프레임이 아틀라스 안 · 그림 종류 9 + 오로라 5 · 모든 동작·방향 줄이 찾아짐
//   ② 실제 그리기 함수로: 정령 8종 × (서기·이동·공격·들어 올림·기술·맞음·죽음·뒷모습) · 유니콘 (서기·구보·공격·기술·맞음·쓰러짐) 오류 없음 · 픽셀 나옴 · 대정령이 1.5배쯤
//   ③ 그림이 없을 때(봇 호스트 · 못 불러옴) 예전 코드 그림으로 그려짐 (DRA.ok = false)
//   ④ 성능: 화면에 정령 20 + 유니콘 · drawWorld ms (렌더 그림 vs 예전 코드 그림) · 아틀라스 메모리(MB)
//   ⑤ 스크린샷 dev/out/dream3_unicorn.png (게임 화면 · 가까이) · dream3_spirits.png (8종 서기/공격/기술 · 실제 그리기) · dream3_field.png (사분면 사냥 화면)
const { chromium } = require('playwright'); const login = require('../tq.js');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const KS = ['dr_fire', 'dr_water', 'dr_earth', 'dr_wind', 'dr_gfire', 'dr_gwater', 'dr_gearth', 'dr_gwind'];
(async () => { const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'dr3' }); await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 60; });
  await p.evaluate(() => __T.TOWN.toZone(24)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 24 && __T.SCENE === 'field', null, { timeout: 60000 });
  await p.waitForFunction(() => __T.DRA_ && __T.DRA_.DRA.ok, null, { timeout: 30000 }).catch(() => {});
  // ---------- ① 아틀라스 · 메타
  const at = await p.evaluate(() => { const { DRA, DRA_META: M } = __T.DRA_, bad = [], miss = []; const imgs = DRA.img.map(i => [i.naturalWidth, i.naturalHeight]);
    for (const k in M.s) { const S = M.s[k]; for (let i = 0; i < S.f.length; i += 9) { const [fid, sx, sy, w, h] = S.f.slice(i, i + 5), I = imgs[fid]; if (!I || sx < 0 || sy < 0 || sx + w > I[0] || sy + h > I[1] || w < 1 || h < 1) bad.push(k + '#' + i / 9); }
      for (const a in S.an) for (let fi = 0; fi < S.an[a][0]; fi++) for (let r = 0; r < 8; r++) { const q = DRA.fr(k, a, fi, r); if (!q || !q.im) miss.push(k + a + fi + ':' + r); } }
    const px = imgs.reduce((s, [w, h]) => s + w * h, 0); return { ok: DRA.ok, files: M.files, imgs, keys: Object.keys(M.s), frames: Object.values(M.s).reduce((s, S) => s + S.f.length / 9, 0), bad: bad.slice(0, 5), nb: bad.length, miss: miss.slice(0, 5), nm: miss.length, mb: +(px * 4 / 1048576).toFixed(1) }; });
  console.log('atlas', JSON.stringify(at));
  ok(at.ok && at.imgs.length === 4 && at.imgs.every(([w, h]) => w > 100 && h > 100), `아틀라스 4장 불러옴 (${at.files.join(', ')} · ${at.imgs.map(a => a.join('×')).join(' / ')})`);
  ok(at.keys.length === 14 && at.nb === 0 && at.nm === 0, `그림 종류 ${at.keys.length} · 프레임 ${at.frames}장 모두 아틀라스 안 · 동작×방향 8줄 모두 찾아짐 ${at.bad.join(',')} ${at.miss.join(',')}`);
  console.log('decoded atlas memory', at.mb, 'MB');
  // ---------- ② 실제 그리기 (렌더 그림)
  const draw = (dra) => p.evaluate(({ KS, dra }) => { const T = __T, D = T.DRA_.DRA, ok0 = D.ok; D.ok = dra; const c = document.createElement('canvas'); c.width = 420; c.height = 380; const g = c.getContext('2d', { willReadFrequently: true }), res = {}, errs = [];
    const cnt = () => { const d = g.getImageData(0, 0, 420, 380).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++; return n; };
    for (const k of KS.concat(['unicorn'])) { res[k] = {}; for (const st of ['idle', 'move', 'atk', 'wind', 'cast', 'hit', 'dead', 'back']) { const f = T.mkMob(k, 5, 5); f.row = st === 'back' ? 5 : 2; f.hi = 0.3; if (st === 'move') { f.t = 0.5; f.dist = 0.7; } if (st === 'atk') f.atkT = 0.2; if (st === 'wind') { f.aggro = true; f.cool = 0.2; } if (st === 'cast') f.casting = { k: { cast: 1 }, t: 0.4 }; if (st === 'hit') f.flash = 0.08; if (st === 'dead') { f.dead = true; f.deadT = 0.5; f._dfx = 1; }
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 420, 380); g.setTransform(1.2, 0, 0, 1.2, 210, 330); g.globalAlpha = 1;
        try { const art = T.MOB[k].art; if (st === 'hit') T.procLayer(g, f, T.MOB[k], art, 1) || T.PROCFX[art][0](g, f); else T.PROCFX[art][0](g, f); } catch (e) { errs.push(k + ' ' + st + ': ' + e.message); }
        res[k][st] = cnt(); } }
    D.ok = ok0; return { res, errs }; }, { KS, dra });
  const nw = await draw(true); console.log('new', JSON.stringify(nw.res));
  ok(!nw.errs.length, `렌더 그림: 정령 8종·유니콘 × 8동작 그리기 오류 없음 ${nw.errs.slice(0, 3).join(' / ')}`);
  ok(Object.values(nw.res).every(r => ['idle', 'move', 'atk', 'wind', 'cast', 'hit', 'back'].every(s => r[s] > 1500) && r.dead > 100), `동작마다 그림이 나옴 (서기 ${Object.values(nw.res).map(r => r.idle).join('/')} 픽셀)`);
  ok(['fire', 'water', 'earth', 'wind'].every(el => nw.res['dr_g' + el].idle > nw.res['dr_' + el].idle * 1.6), `대정령이 더 큼 (${['fire', 'water', 'earth', 'wind'].map(el => nw.res['dr_' + el].idle + '→' + nw.res['dr_g' + el].idle).join(' · ')})`);
  ok(nw.res.unicorn.idle > nw.res.dr_fire.idle * 3 && nw.res.unicorn.dead < nw.res.unicorn.idle, `유니콘 크기 ${nw.res.unicorn.idle} · 쓰러짐 ${nw.res.unicorn.dead}`);
  // ---------- ③ 그림 없을 때 예전 코드 그림
  const od = await draw(false); console.log('old', JSON.stringify(od.res.dr_fire), JSON.stringify(od.res.unicorn));
  ok(!od.errs.length && Object.values(od.res).every(r => r.idle > 1500), `그림이 없으면(봇 호스트 등) 예전 코드 그림으로 그려짐 ${od.errs.slice(0, 2).join(' / ')}`);
  // ---------- ⑤-1 정령 8종 나란히 (실제 drawSpirit · PC 확대 2 · 서기 / 공격 / 기술) — 사분면 바닥색 배경
  { const d = await p.evaluate(async (KS) => { const T = __T, c = document.createElement('canvas'), CW = n => n < 4 ? 220 : 400, X0 = n => [0, 220, 440, 660, 880, 1280, 1680, 2080][n], W = 2480, RH = n => n < 4 ? 330 : 480, H = 3 * 480 + 50; c.width = W; c.height = H; const g = c.getContext('2d');
      const BG = { fire: ['#3a1c14', '#5a2a1a'], water: ['#9fb4c8', '#c8d6e2'], earth: ['#b8935e', '#d2b07a'], wind: ['#6f6c66', '#8e8a82'] };
      KS.forEach((k, n) => { const el = T.MOB[k].el, gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, BG[el][0]); gr.addColorStop(1, BG[el][1]); g.fillStyle = gr; g.fillRect(X0(n), 0, CW(n), H); });
      g.fillStyle = '#fff'; g.font = '700 22px sans-serif'; g.textAlign = 'center'; KS.forEach((k, n) => g.fillText(T.MOB[k].name, X0(n) + CW(n) / 2, 30));
      const F = KS.map((k, n) => { const f = T.mkMob(k, 5, 5); f.row = 2; f.hi = n * 0.41; return f; });
      const rows = [['서기', f => { f.atkT = null; f.casting = null; }], ['공격', f => { f.atkT = 0.2; f.casting = null; }], ['기술', f => { f.atkT = null; f.casting = { k: { cast: 1 }, t: 0.4 }; }]];
      for (const [r, [nm, set]] of rows.entries()) F.forEach((f, n) => { set(f); g.save(); g.beginPath(); g.rect(X0(n), 40 + r * 480, CW(n), 480); g.clip(); g.translate(X0(n) + CW(n) / 2, 40 + r * 480 + (n < 4 ? 400 : 455)); g.scale(2, 2); T.drawSpirit(g, f); g.restore(); });   // 대정령(1.5배)은 넓은 칸 · 칸 밖으로 번지는 오로라는 자름
      return c.toDataURL('image/png'); }, KS);
    require('fs').writeFileSync('dev/out/dream3_spirits.png', Buffer.from(d.split(',')[1], 'base64')); }
  // ---------- ④ 성능: 정령 20 + 유니콘 (한가운데 · 실제 화면)
  const scene = async (dra) => { await p.evaluate((dra) => { const T = __T, N = T.ISLE.N, C = Math.floor(N / 2); T.DRA_.DRA.ok = dra; T.TOWN.placeAt(C + 0.5, C + 0.5); T.dwWrap(); const H = T.hero; T.DN_.set(0);
      for (let q = T.foxes.length - 1; q >= 0; q--) if (T.foxes[q].__perf || T.foxes[q].kind === 'unicorn') T.foxes.splice(q, 1);
      const K = ['fire', 'water', 'earth', 'wind'];
      for (let n = 0; n < 20; n++) { const el = K[n % 4], k = n < 15 ? 'dr_' + el : 'dr_g' + el, m = T.mkMob(k, H.i - 4 + (n % 5) * 2, H.j - 3 + Math.floor(n / 5) * 2); m.home = [m.i, m.j]; m.aggro = false; m.__perf = 1; m.hi = n * 0.37; T.MOB[k].passive = true; T.foxes.push(m); }
      const u = T.mkMob('unicorn', H.i + 3, H.j - 4); u.home = [u.i, u.j]; u.row = 1; u.__perf = 1; T.MOB.unicorn.passive = true; T.foxes.push(u); }, dra);
    await p.waitForTimeout(1500); await p.evaluate(() => { window.__dwT.length = 0; }); await p.waitForTimeout(3000);
    return p.evaluate(() => { const a = window.__dwT.slice().sort((x, y) => x - y), C = __T.DRA_.DRA.C; return { cache: C.m.size + '/' + (C.px / 1e6).toFixed(1) + 'M', frames3s: a.length, avg: +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(2), p50: +a[a.length >> 1].toFixed(2), p90: +a[Math.floor(a.length * 0.9)].toFixed(2) }; }); };
  const pOld = await scene(false), pNew = await scene(true), pOld2 = await scene(false), pNew2 = await scene(true);
  console.log('perf old', JSON.stringify(pOld), JSON.stringify(pOld2), '· new', JSON.stringify(pNew), JSON.stringify(pNew2));
  const avgO = (pOld.avg + pOld2.avg) / 2, avgN = (pNew.avg + pNew2.avg) / 2;
  ok(avgN <= avgO * 1.15, `성능: 정령 20 + 유니콘 drawWorld 평균 ${avgO.toFixed(2)} → ${avgN.toFixed(2)} ms (예전 대비 ${(avgN / avgO * 100).toFixed(0)}% · 115% 이하)`);
  // ---------- ⑤-2 유니콘 가까이 (게임 화면 · 확대 2) · 사분면 사냥 화면
  await p.evaluate(() => { const T = __T, N = T.ISLE.N, C = Math.floor(N / 2); for (let q = T.foxes.length - 1; q >= 0; q--) if (T.foxes[q].__perf || T.foxes[q].kind === 'unicorn') T.foxes.splice(q, 1);   /* 유니콘 하나만 (보스 체력 막대가 하나) · 영웅 아래쪽(화면 가운데 아래)에 */
    T.TOWN.placeAt(C + 6.5, C - 5.5); const H = T.hero, u = T.mkMob('unicorn', H.i + 3, H.j - 3); u.home = [u.i, u.j]; u.row = 2; u.__perf = 1; T.MOB.unicorn.passive = true; T.foxes.push(u); T.ZOOMT = 2; T.DN_.set(0); });
  await p.waitForTimeout(1500);
  { const r = await p.evaluate(() => { const u = __T.foxes.find(f => f.kind === 'unicorn'); return __T.scr(u.x, u.z); }); await p.screenshot({ path: 'dev/out/dream3_unicorn.png', clip: { x: Math.max(0, Math.min(1280 - 700, r[0] - 420)), y: Math.max(0, r[1] - 330), width: 700, height: Math.min(400, 560 - Math.max(0, r[1] - 330)) } }); }
  await p.evaluate(() => { const T = __T, N = T.ISLE.N, C = N / 2; for (let q = T.foxes.length - 1; q >= 0; q--) if (T.foxes[q].__perf) T.foxes.splice(q, 1); for (const k in T.MOB) delete T.MOB[k].passive;
    T.TOWN.placeAt(C + 30, C - 30); const H = T.hero; const near = T.foxes.filter(f => !f.dead && T.MOB[f.kind].el === 'fire').sort((a, b) => Math.hypot(a.x - H.x, a.z - H.z) - Math.hypot(b.x - H.x, b.z - H.z)).slice(0, 6);
    near.forEach((f, n) => { const dx = [-4, 3, -2, 5, 1, -5][n], dz = [-3, -4, 3, 0, 4, 1][n]; f.x = H.x + dx; f.z = H.z + dz; f.i = Math.floor(f.x); f.j = Math.floor(f.z); f.home = [f.i, f.j]; f.t = 1; });
    if (!near.some(f => T.MOB[f.kind].great)) { const g = T.mkMob('dr_gfire', H.i + 3, H.j - 2); g.home = [g.i, g.j]; T.MOB.dr_gfire.passive = true; T.foxes.push(g); } });
  await p.waitForTimeout(1600); await p.screenshot({ path: 'dev/out/dream3_field.png' });
  await p.evaluate(() => { for (const k in __T.MOB) delete __T.MOB[k].passive; });
  ok(!errs.length, `페이지 오류 없음 ${errs.slice(0, 3).join(' / ')}`);
  await b.close(); })();
