// 11/5 에이션트 자이언트 렌더 그림 (dev/rooms/fggiant.md) — python3 dev/mkkt.py && KT_PORT=8893 bash dev/runkt.sh dev/tests/fggiant.js
//   ① 마을에서는 아틀라스를 안 받음 ② 잊혀진 섬에 들어가면 받음 · 오우거 임시 시트(MIMG)는 안 받음 ③ 아틀라스 프레임 전부를 게임 코드(GIA.fr·draw)로 → dev/out/fggiant_frames.png
//   ④ drawGiantR 동작별 8방향 (서 있기·걷기·공격·기술·번쩍임·붉은 기·쓰러짐) → dev/out/fggiant_states.png ⑤ 게임 화면 동작별 스크린샷 dev/out/fggiant_{idle,walk,attack,cast,death,target}.png
//   ⑥ 그리기 시간 (drawWorld · 확대 2 · 대상으로 고르고 공격·걷기·기술을 1초씩 돌림 · 1.5초마다 방향 바뀜): 렌더 그림 vs 예전 임시 그림 ⑦ 섬을 나가면 그림·캐시가 풀림 (마을 · 다른 섬) ⑧ 그림을 못 받으면 임시 그림 ⑨ 페이지 오류 없음
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await login(p, { cls: 'knight', name: 'fgg' + Date.now() % 1e4 }); await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 60; });
  // ① 마을
  const t0 = await p.evaluate(() => ({ st: __FG.GIA.st, im: !!__FG.GIA.im, meta: !!__FG.GIA_META(), n: __FG.GIA_META() ? __FG.GIA_META().f.length / 9 : 0 }));
  ok(t0.meta && t0.n === 190 && t0.st === 0 && !t0.im, `① 메타 ${t0.n}프레임 (5방향 × 38) · 마을에서는 아틀라스 안 받음 (st ${t0.st})`);
  // ② 섬 입장
  await p.evaluate(() => __T.TOWN.toZone(25)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 25 && __FG.GIA.ok, null, { timeout: 60000 });
  const t1 = await p.evaluate(() => ({ st: __FG.GIA.st, w: __FG.GIA.im.naturalWidth, h: __FG.GIA.im.naturalHeight, src: __FG.GIA.im.src.replace(/^.*\/assets/, 'assets'), mimg: __T.MEM_K_().includes('fg_giant') }));
  ok(t1.st === 2 && t1.w > 0 && /assets\/forgotten\/giant\.webp$/.test(t1.src), `② 섬에 들어가면 받음 (${t1.src} ${t1.w}×${t1.h})`);
  // 무대: 가운데 · 다른 몹 치움 · 거인 하나 (멈춤 · 기술 안 씀)
  await p.evaluate(() => { const T = __T, C = T.ISLE.N >> 1; T.DN_.set(1); T.TOWN.placeAt(C + 0.5, C + 0.5);   /* 밤: 테스트 페이지는 어둡지 않고 낮의 구름 그림자가 없음 */ for (const f of T.foxes) f.gone = true; const S = T.MOB.fg_giant; window.__SP = [S.walk, S.run, S.aggr]; S.walk = 0; S.run = 0; S.aggr = 0;
    const g = T.mkMob_('fg_giant', C - 1, C + 4); g.home = [g.i, g.j]; g.row = 1; g.sk = { stomp: 1e9, boulder: 1e9, roar: 1e9 }; g.aggro = false; T.foxes.push(g); window.__G = g; T.hero.row = 1; T.ZOOMT = 1.4;
    window.__hold = st => { cancelAnimationFrame(window.__hr); const step = () => { try { st(window.__G); } catch (e) {} window.__hr = requestAnimationFrame(step); }; step(); }; });
  await wait(4000);   // 새로 생긴 몹이 서서히 나타나는 시간
  const t2 = await p.evaluate(() => ({ mimg: __T.MEM_K_().includes('fg_giant'), keys: __T.MEM_K_() }));
  ok(!t1.mimg && !t2.mimg, `② 렌더 그림을 쓰면 오우거 임시 시트(3장 ≈ 76MB)는 안 받음 (받은 몹 그림: ${t2.keys.join(',')})`);
  // ③ 아틀라스 프레임 전부 (2번 방향) + 8방향 (서 있기 0번)
  const fr = await p.evaluate(() => { const F = __FG, G = F.GIA, M = F.GIA_META(), CW = 250, CH = 330, A = Object.entries(M.an), c = document.createElement('canvas'); c.width = CW * 8; c.height = CH * (A.length + 1); const g = c.getContext('2d');
    g.fillStyle = '#56605a'; g.fillRect(0, 0, c.width, c.height); g.font = '14px sans-serif'; g.fillStyle = '#eee'; let bad = 0;
    A.forEach(([an, [n]], r) => { g.fillText(an, 6, r * CH + 16); for (let fi = 0; fi < n; fi++) { const q = G.fr(an, fi, 2); if (!(q.w > 0 && q.h > 0)) bad++; g.save(); g.translate(fi * CW + CW / 2, r * CH + CH - 50); g.scale(0.85, 0.85); G.draw(g, q); g.restore(); } });
    [1, 2, 3, 4, 5, 6, 7, 0].forEach((row, k) => { const q = G.fr('idle', 0, row); g.save(); g.translate(k * CW + CW / 2, A.length * CH + CH - 50); g.scale(0.85, 0.85); G.draw(g, q); g.restore(); g.fillText('row ' + row + (q.fl ? ' (뒤집기)' : ''), k * CW + 6, A.length * CH + 16); });
    return { url: c.toDataURL('image/png'), bad }; });
  require('fs').writeFileSync('dev/out/fggiant_frames.png', Buffer.from(fr.url.split(',')[1], 'base64')); ok(fr.bad === 0, '③ 동작별 모든 프레임 · 8방향 → dev/out/fggiant_frames.png');
  // ④ drawGiantR 상태별 8방향
  const stt = await p.evaluate(() => { const T = __T, F = __FG, CW = 250, CH = 330, c = document.createElement('canvas'), ATK = 0.8 / 0.7; c.width = CW * 8; c.height = CH * 7; const g = c.getContext('2d'); g.fillStyle = '#5a6460'; g.fillRect(0, 0, c.width, c.height); g.font = '14px sans-serif';
    const SK = T.BOSS_SKILL.fg_giant[0], RED = 'sepia(.55) saturate(2.4) hue-rotate(-38deg) brightness(1.08)';
    const st = [['서 있기', f => {}], ['걷기', f => { f.t = 0.5; f.dist = 0.9; }], ['공격', f => { f.atkT = ATK * 0.45; }], ['기술(머리 위)', f => { f.casting = { k: SK, t: 0.3 }; }], ['맞음(번쩍)', f => { f.atkT = ATK * 0.3; }, 'brightness(2.6) saturate(0)'], ['맞음(붉은 기)', f => {}, RED], ['쓰러짐', f => { f.dead = true; f.deadT = 0.75; }]];
    st.forEach(([nm, set, fl], r) => { g.fillStyle = '#eee'; g.fillText(nm, 6, r * CH + 16); for (let row = 0; row < 8; row++) { const f = T.mkMob_('fg_giant', 5, 5); f.row = row; f.hi = 0; set(f); g.save(); g.translate(row * CW + CW / 2, r * CH + CH - 50); g.scale(0.85, 0.85); F.drawGiantR(g, f, fl || null); g.restore(); } });
    return c.toDataURL('image/png'); });
  require('fs').writeFileSync('dev/out/fggiant_states.png', Buffer.from(stt.split(',')[1], 'base64')); ok(true, '④ 상태별 8방향 → dev/out/fggiant_states.png');
  // ⑤ 게임 화면 스크린샷 (동작을 매 프레임 붙잡아 둠)
  const shot = async (nm, fn, ms = 900) => { await p.evaluate(fn); await wait(ms); const r = await p.evaluate(() => __T.scr(__G.x, __G.z)); await p.screenshot({ path: `dev/out/fggiant_${nm}.png`, clip: { x: Math.max(0, r[0] - 300), y: Math.max(0, r[1] - 470), width: 600, height: 540 } }); };
  await shot('idle', () => __hold(g => { g.atkT = null; g.casting = null; g.t = 1; g.dead = false; }));
  await shot('walk', () => __hold(g => { g.t = 0.5; g.dist = (g.dist || 0) + 0.012; }), 700);
  await shot('attack', () => __hold(g => { g.t = 1; g.atkT = 0.62; }));
  await shot('cast', () => __hold(g => { g.atkT = null; g.casting = { k: __T.BOSS_SKILL.fg_giant[0], t: 0.25, tg: __T.hero }; }));
  await shot('slam', () => { __hold(g => {}); __G.casting = null; __G.gcT = __T.time - 0.05; __G.gcD = 0; }, 120);
  await shot('death', () => __hold(g => { g.casting = null; g.atkT = null; g.dead = true; g.deadT = 0.75; }));
  await shot('target', () => { __hold(g => { g.dead = false; g.deadT = 0; g.atkT = null; g.casting = null; g.t = 1; }); __T.hero.target = __G; }, 1200);
  const tg = await p.evaluate(() => ({ tgt: __T.hero.target === __G, hh: __T.MOB.fg_giant.hh, hw: __T.MOB.fg_giant.hw, ring: __T.MOB.fg_giant.ring }));
  ok(tg.tgt, `⑤ 게임 화면 서 있기·걷기·공격·기술·내려찍기·쓰러짐·대상(빨간 테두리·고리·이름표) → dev/out/fggiant_*.png (hh ${tg.hh} · hw ${tg.hw} · 고리 ${tg.ring})`);
  // ⑥ 그리기 시간: 대상으로 고른 거인이 공격·걷기·기술 동작을 돌림 · drawWorld 시간 (렌더 그림 vs 예전 임시 그림)
  await p.evaluate(() => { __T.ZOOMT = 2; __T.dwWrap(); __T.hero.target = __G; __hold(g => { const T = performance.now() / 1000 % 3, ATK = 0.8 / 0.7; g.dead = false; if (T < 1) { g.casting = null; g.t = 1; g.atkT = (T * 1.1) % ATK; } else if (T < 2) { g.atkT = null; g.t = 0.5; g.dist = (g.dist || 0) + 0.015; } else { g.t = 1; g.casting = { k: __T.BOSS_SKILL.fg_giant[0], t: 1 - (T - 2), tg: __T.hero }; } g.row = [1, 2, 3, 0][Math.floor(performance.now() / 1500) % 4]; }); });
  const measure = async () => { await wait(1500); await p.evaluate(() => { window.__dwT.length = 0; }); await wait(4500); return p.evaluate(() => { const a = window.__dwT.slice().sort((x, y) => x - y), n = a.length; return { n, avg: +(a.reduce((x, y) => x + y, 0) / n).toFixed(2), med: +a[n >> 1].toFixed(2), p95: +a[Math.floor(n * 0.95)].toFixed(2), cpx: __FG.GIA.C.px, cn: __FG.GIA.C.m.size }; }); };
  const mR = await measure();
  await p.evaluate(() => { const G = __FG.GIA; G.ok = false; G.st = 3; });   // 임시 그림으로 (오우거 시트를 받아 물들임)
  await p.waitForFunction(() => { const I = __T.MIMG_.fg_giant; return I && I.idle.naturalWidth && I.walk.naturalWidth && I.attack.naturalWidth; }, null, { timeout: 30000 });
  const mT = await measure(); await p.evaluate(() => { __T.ZOOMT = 1.4; __T.hero.target = null; __hold(g => { g.atkT = null; g.casting = null; g.t = 1; g.row = 1; }); }); await wait(1200); const r2 = await p.evaluate(() => __T.scr(__G.x, __G.z)); await p.screenshot({ path: 'dev/out/fggiant_old.png', clip: { x: Math.max(0, r2[0] - 300), y: Math.max(0, r2[1] - 470), width: 600, height: 540 } });
  console.log('⑥ drawWorld ms  렌더 그림', JSON.stringify(mR), ' · 예전 임시 그림', JSON.stringify(mT));
  ok(mR.avg <= mT.avg * 1.25 + 0.5, `⑥ 그리기 시간: 렌더 그림 평균 ${mR.avg}ms (중간 ${mR.med} · 95% ${mR.p95}) vs 임시 그림 평균 ${mT.avg}ms (중간 ${mT.med} · 95% ${mT.p95}) · 프레임 캐시 ${mR.cn}장 ${(mR.cpx / 1e6).toFixed(1)}M화소`);
  ok(mR.cpx <= 8e6, `⑥ 프레임 캐시 화소 상한 지킴 (${(mR.cpx / 1e6).toFixed(1)}M ≤ 8M)`);
  // ⑧ 그림을 못 받으면 임시 그림 (위에서 st 3 → 임시 그림으로 그려짐)
  ok(errs.length === 0 && mT.n > 30, '⑧ 그림을 못 받은 상태(st 3)면 예전 임시 그림으로 그려짐 → dev/out/fggiant_old.png');
  await p.evaluate(() => { cancelAnimationFrame(window.__hr); __T.hero.target = null; const S = __T.MOB.fg_giant; [S.walk, S.run, S.aggr] = window.__SP; });
  // ⑦ 나가면 풀림: 마을 → 다시 섬 → 다른 섬(화룡의 둥지)
  await p.evaluate(() => __T.TOWN.goTown()); await p.waitForFunction(() => __T.SCENE === 'town', null, { timeout: 30000 });
  const l1 = await p.evaluate(() => ({ st: __FG.GIA.st, im: !!__FG.GIA.im, ok: __FG.GIA.ok, c: __FG.GIA.C.m.size, px: __FG.GIA.C.px }));
  ok(l1.st === 0 && !l1.im && !l1.ok && l1.c === 0 && l1.px === 0, `⑦ 마을로 나가면 아틀라스·프레임 캐시 놓음 (${JSON.stringify(l1)})`);
  await p.evaluate(() => __T.TOWN.toZone(25)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 25 && __FG.GIA.ok, null, { timeout: 60000 });
  await p.evaluate(() => __T.TOWN.toZone(22)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 22, null, { timeout: 60000 }); await wait(500);
  const l2 = await p.evaluate(() => ({ st: __FG.GIA.st, im: !!__FG.GIA.im, c: __FG.GIA.C.m.size }));
  ok(l2.st === 0 && !l2.im && l2.c === 0, `⑦ 다시 들어가면 또 받고 · 다른 섬(화룡의 둥지)으로 가면 놓음 (${JSON.stringify(l2)})`);
  ok(!errs.length, `⑨ 페이지 오류 없음 ${errs.slice(0, 3).join(' / ')}`);
  console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exit(fails ? 1 : 0); })();
