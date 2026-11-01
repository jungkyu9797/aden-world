// 몽환의 섬 (지역 24) 테스트 — KT_PORT=8773 bash dev/runkt.sh dev/tests/dream.js
//   ① 입장(정확히 한가운데 도착 · N 133 · 사분면마다 정령 30·대정령 6 · 가운데 15칸 안 없음 · 안전지대 반지름 11) ② 순간이동 주문서 막힘 · 귀환 됨 ③ 정령 비선공 · 대정령 선공 · 속성 저항/약점(dreamElMul) · 근접 속성 추가 피해
//   ①-2 (11/1 2차) 속성 길: 방향마다 두 갈래 · 바닥 캔버스에 구움(길 따라 바닥 픽셀 색: 동 빨강 · 서 파랑 · 북 잿빛 · 남 모래빛) · 길 위 소품 없음 · 미니맵 길 색 · 광장 속성 표지석 4개
//   ①-3 (11/1 2차) 정령 8종 그림: 동작마다(서기·공격·기술·죽음) 오류 없이 그려짐 · 프레임 저장(DSPC) · 효과음 16개 받아짐·해독됨 · MSFX 연결(대정령 기술 = cast)
//   ④ 드랍(확률 1로 바꿔 훅): 정령 축 · 대정령 축/영웅/퓨어엘릭서 · 유니콘 반드시 축데이 1~2·축젤 1~2·퓨어엘릭서 1~5 ⑤ 대정령 속성 마법 · 유니콘 기술 3개 ⑥ 퓨어엘릭서 교환 · 엘릭서 복용 +1 · 5개 상한 · 저장(inv.elix)
//   ⑦ 유니콘 젠(진짜 시간표 2시간) · 토벌 기록 · 제단 자리(가운데 위 3칸) ⑧ 미니맵 · 월드맵 도감 · 모바일 화면
//   ⑨ 스크린샷 dev/out/dream_*.png (사분면 4 · 정령 8종 · 유니콘 · 모바일) · dev/out/dream2_*.png (도착 화면 PC·모바일 · 지도 · 미니맵 · 정령 8종 나란히)
const { chromium, devices } = require('playwright'); const login = require('../tq.js');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const Z = 24;
(async () => { const b = await chromium.launch(); const errs = [];
  const enter = async (p, z) => { await p.evaluate(z => __T.TOWN.toZone(z), z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', z, { timeout: 60000 }); await p.waitForTimeout(1500); };
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'drm' }); await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 60; });
  // ---------- ① 입장
  await enter(p, Z);
  const a = await p.evaluate(() => { const T = __T, I = T.ISLE, N = I.N, C = N / 2, cnt = {}, bad = [], near = []; for (const f of T.foxes) { if (f.dead || f.gone) continue; const S = T.MOB[f.kind]; if (S.boss) continue; cnt[f.kind] = (cnt[f.kind] || 0) + 1; const q = T.dreamQuad(N, f.home[0], f.home[1]); if (T.DREAM.EL[q] !== S.el) bad.push(f.kind + '@' + q); if (Math.hypot(f.home[0] + .5 - C, f.home[1] + .5 - C) <= T.DREAM.NO_SPAWN_R) near.push(f.kind); }
    const qc = {}; for (const f of T.foxes) { if (f.dead || f.gone || T.MOB[f.kind].boss) continue; const q = T.dreamQuad(N, f.home[0], f.home[1]); qc[q] = (qc[q] || 0) + 1; } let minD = 99; for (const f of T.foxes) if (!T.MOB[f.kind].boss) minD = Math.min(minD, Math.hypot(f.home[0] + .5 - C, f.home[1] + .5 - C));
    return { hx: T.hero.x, hz: T.hero.z, qc, minD: +minD.toFixed(2), safe: T.DREAM.SAFE_R, nsr: T.DREAM.NO_SPAWN_R, stones: I.def.stones, roads: (I.def.roads || []).length, hero: [T.hero.i, T.hero.j], N, cnt, bad, near, hello: T.log.slice(-6).map(x => String(x.t || x.text || x)).join(' / '), lava: I.lava ? I.lava.size : 0, water: I.water.size, hills: (I.def.hills || []).length, props: I.props.length, shrine: I.def.shrine, nobot: !!I.def.nobot }; });
  console.log('enter', JSON.stringify(a));
  ok(a.N === 133 && a.hero[0] === 66 && a.hero[1] === 66 && a.hx === a.N / 2 && a.hz === a.N / 2, `N 133 · 정확히 한가운데 도착 (칸 ${a.hero} · 좌표 ${a.hx},${a.hz})`);
  ok(['fire', 'water', 'earth', 'wind'].every(el => a.cnt['dr_' + el] === 30 && a.cnt['dr_g' + el] === 6), `사분면마다 정령 30 · 대정령 6 = 144 (${JSON.stringify(a.cnt)})`);
  ok(['E', 'W', 'S', 'N'].every(q => a.qc[q] === 36), `사분면별 몹 수 ${JSON.stringify(a.qc)}`);
  ok(!a.bad.length && !a.near.length && a.minD > 15 && a.safe === 11 && a.nsr === 15, `자기 속성 사분면에만 · 가운데 15칸 안 스폰 없음 (가장 가까운 ${a.minD}칸 · 안전지대 ${a.safe}) ${a.bad.join(',')} ${a.near.join(',')}`);
  ok(a.lava > 100 && a.water > 60 && a.hills >= 8 && a.props > 600, `용암 ${a.lava}칸 · 호수 ${a.water}칸 · 북쪽 언덕 ${a.hills} · 소품 ${a.props}`);
  ok(a.roads === 8 && a.stones.length === 8 && a.stones.filter(s => s[2]).length === 4, `속성 길 ${a.roads}갈래 · 제단 돌기둥 ${a.stones.length} (속성 표지석 ${a.stones.filter(s => s[2]).map(s => s[2]).join(',')})`);
  // 도착 화면 (들어오자마자 · 낮): PC 실제 확대 2 · 넓게 확대 1 (광장 + 네 방향 길 시작)
  await p.evaluate(() => { __T.DN_.set(0); }); await p.waitForTimeout(1500); await p.screenshot({ path: 'dev/out/dream2_center.png' });
  await p.evaluate(() => { __T.ZOOMT = 1; }); await p.waitForTimeout(1200); await p.screenshot({ path: 'dev/out/dream2_center_wide.png' }); await p.evaluate(() => { __T.ZOOMT = 2; }); await p.waitForTimeout(600);
  // ---------- ①-2 속성 길: 바닥 캔버스 픽셀 (길 가운데 · 길에서 6칸 떨어진 바닥과 비교) · 길 위 소품 없음 · 미니맵
  const rd = await p.evaluate(() => { const T = __T, I = T.ISLE, G = I.ground, N = I.N, C = N / 2, K = Math.SQRT1_2 * window.MAP_META.S, sx = G.width / (2 * N * K + 48), sy = G.height / (N * K + 48), SR = T.DREAM.SAFE_R;
    const t = document.createElement('canvas'); t.width = t.height = 1; const tg = t.getContext('2d', { willReadFrequently: true });
    const at = (x, z) => { tg.clearRect(0, 0, 1, 1); tg.drawImage(G, (N * K + 24 + (x - z) * K) * sx, (24 + (x + z) * K / 2) * sy, 1, 1, 0, 0, 1, 1); return [...tg.getImageData(0, 0, 1, 1).data].slice(0, 3); };
    const isEl = { fire: ([r, g, b]) => (r > 60 && r > g * 1.5 && r > b * 1.8) || (r > 200 && b < 170 && r > b * 1.3), water: ([r, g, b]) => b > 110 && b > r + 25, wind: ([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b) < 26 && (r + g + b) / 3 > 105, earth: ([r, g, b]) => r > 150 && g > 105 && r > b * 1.45 && g > b * 1.15 };
    const out = {}; for (const R of I.def.roads) { const o = out[R.q] = out[R.q] || { el: R.el, n: 0, hit: 0, road: [0, 0, 0], off: [0, 0, 0], first: null }; R.pts.forEach((p, k) => { if (p[2] < SR + 1 || p[2] > R.r1 - 14 || k % 4) return; const c = at(p[0], p[1]); o.n++; if (isEl[R.el](c)) o.hit++; if (!o.first) o.first = { r: +p[2].toFixed(1), c }; c.forEach((v, i) => o.road[i] += v);
      const n2 = R.pts[Math.min(R.pts.length - 1, k + 1)], dx = n2[0] - p[0], dz = n2[1] - p[1], l = Math.hypot(dx, dz) || 1, s = R.k; at(p[0] - dz / l * 6 * s, p[1] + dx / l * 6 * s).forEach((v, i) => o.off[i] += v); }); }
    for (const q in out) { const o = out[q]; o.road = o.road.map(v => Math.round(v / o.n)); o.off = o.off.map(v => Math.round(v / o.n)); o.diff = Math.round(Math.hypot(...o.road.map((v, i) => v - o.off[i]))); o.p = +(o.hit / o.n).toFixed(2); }
    let onRoad = 0, rt = 0; for (const pp of I.props) { const r = T.DREAM_X.dreamRoadAt(I.def, pp.i, pp.j); if (r) onRoad++; } for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (T.DREAM_X.dreamRoadAt(I.def, i, j)) rt++;
    let blk = 0, tot = 0; for (const R of I.def.roads) for (const p of R.pts) { if (p[2] < SR + 1) continue; tot++; if (I.blocked[Math.floor(p[1])][Math.floor(p[0])]) blk++; }
    return { out, onRoad, rt, blk, tot, gw: G.width, gh: G.height, mb: +(G.width * G.height * 4 / 1048576).toFixed(1) }; });
  console.log('roads', JSON.stringify(rd));
  for (const [q, nm] of [['E', '동 불 = 빨강'], ['W', '서 물 = 파랑'], ['N', '북 바람 = 잿빛'], ['S', '남 땅 = 모래빛']]) { const o = rd.out[q]; ok(o && o.p >= 0.8 && o.diff >= 30, `${nm}: 길 가운데 픽셀 ${Math.round(o.p * 100)}% 맞음 (평균 ${o.road} · 옆 바닥 ${o.off} · 차이 ${o.diff} · 광장 테두리 ${o.first && o.first.r}칸부터)`); }
  ok(rd.onRoad === 0 && rd.rt > 600 && rd.blk / rd.tot < 0.02, `길 칸 ${rd.rt}개 · 길 위 소품 ${rd.onRoad} · 길 가운데선이 막힌 칸 ${rd.blk}/${rd.tot} (걷는 데 영향 없음)`);
  ok(rd.gw * rd.gh <= 15.1e6, `바닥 캔버스 ${rd.gw}×${rd.gh} = ${(rd.gw * rd.gh / 1e6).toFixed(1)}M 픽셀 · ${rd.mb}MB (아이폰 한도 16.7M 아래)`);
  const mm = await p.evaluate(() => { const T = __T, I = T.ISLE, out = {}; for (const R of I.def.roads) { const p = R.pts.find(pp => pp[2] > T.DREAM.SAFE_R + 6 && T.DREAM_X.dreamRoadAt(I.def, Math.floor(pp[0]), Math.floor(pp[1]))); if (p) out[R.q] = [Math.floor(p[0]), Math.floor(p[1])]; } return { pts: out, rect: T.MM.rect(), on: T.MM.on(), z: T.curZ, dpr: window.devicePixelRatio, cols: Object.fromEntries(Object.entries(T.DREAM_X.DREAM_RDS).map(([k, v]) => [k, v.mini])) }; });
  { const cnt = await p.evaluate(() => { const T = __T, c = document.createElement('canvas'); c.width = 820; c.height = 440; const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#000'; g.fillRect(0, 0, 820, 440); T.MM.draw(g, 820, 440, 10, 10, 798); const d = g.getImageData(0, 0, 820, 440).data, n = { red: 0, blue: 0, gray: 0, sand: 0 };   // 미니맵을 원래 크기(798px)로 따로 그려서 셈
      for (let i = 0; i < d.length; i += 4) { const r = d[i], gg = d[i + 1], bb = d[i + 2]; if (r > 180 && gg < 100 && bb < 70) n.red++; else if (bb > 180 && r < 90 && gg > 80 && gg < 160) n.blue++; else if (r > 190 && gg > 190 && bb > 180 && Math.abs(r - bb) < 20) n.gray++; else if (r > 190 && gg > 140 && gg < 190 && bb < 80) n.sand++; } return n; });
    console.log('minimap', JSON.stringify(mm), JSON.stringify(cnt));
    ok(mm.on && cnt.red > 15 && cnt.blue > 15 && cnt.gray > 15 && cnt.sand > 15, `미니맵에 색 길 (빨강 ${cnt.red} · 파랑 ${cnt.blue} · 잿빛 ${cnt.gray} · 모래빛 ${cnt.sand} 픽셀)`);
    const [x0, y0, w, h] = mm.rect; await p.screenshot({ path: 'dev/out/dream2_minimap.png', clip: { x: Math.max(0, x0 * mm.z - 10), y: Math.max(0, y0 * mm.z - 8), width: w * mm.z + 20, height: h * mm.z + 16 } }); }
  // ---------- ①-3 정령 그림 8종 (동작마다 오류 없이) · 효과음 16개
  const art = await p.evaluate(() => { const T = __T, c = document.createElement('canvas'); c.width = 240; c.height = 320; const g = c.getContext('2d', { willReadFrequently: true }), res = {}, errs = [];
    for (const k of ['dr_fire', 'dr_water', 'dr_earth', 'dr_wind', 'dr_gfire', 'dr_gwater', 'dr_gearth', 'dr_gwind']) { res[k] = {}; for (const st of ['idle', 'move', 'atk', 'wind', 'cast', 'hit', 'dead', 'back']) { const f = T.mkMob(k, 5, 5); f.row = st === 'back' ? 5 : 1; f.hi = 0.3; if (st === 'move') f.t = 0.5; if (st === 'atk') f.atkT = 0.2; if (st === 'wind') { f.aggro = true; f.cool = 0.2; } if (st === 'cast') f.casting = { k: { cast: 1 }, t: 0.4 }; if (st === 'hit') f.flash = 0.08; if (st === 'dead') { f.dead = true; f.deadT = 0.5; f._dfx = 1; }
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 240, 320); g.setTransform(1.2, 0, 0, 1.2, 120, 290); try { if (st === 'hit') T.procLayer(g, f, T.MOB[k], 'spirit', 1) || T.drawSpirit(g, f); else T.drawSpirit(g, f); } catch (e) { errs.push(k + ' ' + st + ': ' + e.message); }
        const d = g.getImageData(0, 0, 240, 320).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++; res[k][st] = n; } }
    const D = T.DSPC_.DSPC; return { res, errs, cache: { frames: D.m.size, px: D.px, max: D.MAX } }; });
  console.log('art', JSON.stringify(art.res), JSON.stringify(art.cache));
  ok(!art.errs.length, `정령 8종 × 8동작 그리기 오류 없음 ${art.errs.slice(0, 3).join(' / ')}`);
  ok(Object.values(art.res).every(r => r.idle > 1500 && r.atk > 1500 && r.cast > 1500 && r.back > 1500 && r.move > 1500 && r.hit > 1500 && r.dead > 100 && r.dead !== r.idle), `동작마다 그림이 나옴 (서기 ${Object.values(art.res).map(r => r.idle).join('/')} 픽셀)`);
  ok(art.res.dr_gfire.idle > art.res.dr_fire.idle * 1.6 && art.res.dr_gearth.idle > art.res.dr_earth.idle * 1.6, `대정령이 더 큼 (불 ${art.res.dr_fire.idle} → ${art.res.dr_gfire.idle} · 땅 ${art.res.dr_earth.idle} → ${art.res.dr_gearth.idle})`);
  ok(art.cache.frames > 0 && art.cache.px <= art.cache.max, `프레임 저장 ${art.cache.frames}장 · ${(art.cache.px / 1e6).toFixed(2)}M/${art.cache.max / 1e6}M 픽셀`);
  const snd = await p.evaluate(async () => { const out = {}, ctx = new OfflineAudioContext(1, 22050, 22050); for (const el of ['fire', 'water', 'earth', 'wind']) for (const k of ['attack', 'hit', 'death', 'cast']) { const n = `dr_${el}_${k}`; try { const r = await fetch(`assets/sound/sfx/${n}.mp3`); const ab = await r.arrayBuffer(), kb = +(ab.byteLength / 1024).toFixed(1); const b = await ctx.decodeAudioData(ab); out[n] = { kb, s: +b.duration.toFixed(2) }; } catch (e) { out[n] = { err: String(e) }; } } return out; });
  console.log('sfx', JSON.stringify(snd));
  ok(Object.keys(snd).length === 16 && Object.values(snd).every(v => !v.err && v.kb <= 20 && v.s >= 0.15 && v.s <= 1.4), `정령 효과음 16개 받아짐·해독됨 · 20KB 이하 (${Object.values(snd).map(v => v.kb).join(' ')} KB)`);
  { const req = []; p.on('request', r => { const m = /sfx\/(dr_[a-z_]+)\.mp3/.exec(r.url()); if (m) req.push(m[1]); }); await p.mouse.click(640, 300);
    const r = await p.evaluate(() => { const T = __T; T.initAudio(); const o = {}; for (const k of ['dr_fire', 'dr_gwater', 'dr_earth', 'dr_gwind']) for (const t of ['attack', 'hit', 'death', 'skill']) o[k + ':' + t] = T.MSFX(k, t, 0.01); return o; }); await p.waitForTimeout(1500);
    const want = ['dr_fire_attack', 'dr_fire_hit', 'dr_fire_death', 'dr_fire_cast', 'dr_water_cast', 'dr_water_attack', 'dr_earth_death', 'dr_wind_cast', 'dr_wind_hit'];
    ok(Object.values(r).every(Boolean) && want.every(w => req.includes(w)) && !req.some(x => /ifrit|basilisk|golem|gast/.test(x)), `MSFX 연결: 정령·대정령 → dr_<속성>_* (대정령 기술 = cast) · 요청 ${[...new Set(req)].length}개`); }
  ok(/귀환만/.test(a.hello) && a.nobot, '입장 안내에 귀환만 · nobot');
  // ---------- ② 순간이동 막힘 · 귀환 됨
  const tele = await p.evaluate(() => { const T = __T; T.INV.add('tele_scroll', 2, true); const n0 = T.INV.count('tele_scroll'), p0 = [T.hero.i, T.hero.j]; T.INV.use(T.INV.bag().find(e => e.id === 'tele_scroll')); return { n0, n1: T.INV.count('tele_scroll'), moved: p0[0] !== T.hero.i || p0[1] !== T.hero.j, msg: T.log.slice(-2).map(x => String(x.t || x.text || x)).join(' / ') }; });
  ok(tele.n0 === tele.n1 && !tele.moved && /귀환만/.test(tele.msg), `순간이동 주문서 막힘 (${tele.msg})`);
  await p.evaluate(() => { __T.INV.use(__T.INV.bag().find(e => e.id === 'return_charm')); }); await p.waitForTimeout(800);
  ok(await p.evaluate(() => __T.SCENE === 'town'), '귀환 부적으로 마을 이동');
  await enter(p, Z);
  // ---------- ③ 비선공/선공 · 속성 배율
  const ag = await p.evaluate(() => { const T = __T, M = T.MOB; return { sp: !M.dr_fire.aggr, gr: M.dr_gfire.aggr >= 6, uni: !M.unicorn.aggr, same: T.dreamElMul(M.dr_fire, 'fire'), opp: T.dreamElMul(M.dr_fire, 'water'), other: T.dreamElMul(M.dr_fire, 'earth'), none: T.dreamElMul(M.fn_salamander, 'water'), w: T.dreamElMul(M.dr_gwind, 'earth'), hp: [M.dr_fire.hp, M.dr_gfire.hp, M.unicorn.hp], dmg: [M.dr_fire.dmg, M.dr_gfire.dmg], exp: [M.dr_fire.exp, M.dr_gfire.exp], sc: [M.dr_fire.sc, M.dr_gfire.sc] }; });
  console.log('mob', JSON.stringify(ag));
  ok(ag.sp && ag.gr && ag.uni, '정령 비선공 · 대정령 선공 6칸 · 유니콘 비선공');
  ok(ag.same === 0.5 && ag.opp === 1.3 && ag.other === 1 && ag.none === 1 && ag.w === 1.3, `속성 배율 같은 0.5 · 반대 1.3 · 다른 1 (${ag.same} ${ag.opp} ${ag.other})`);
  ok(ag.hp[0] === 9000 && ag.hp[1] === 13500 && ag.hp[2] === 300000 && ag.exp[0] === 42450 && ag.exp[1] === 84900 && ag.sc[1] === 1.5, '수치: 정령 HP 9000 · 대정령 13500 · 유니콘 300000 · 경험치 ×3/×6 · 대정령 1.5배');
  // 근접 속성 추가 피해: 정령을 바로 옆에 두고 때리게 → 'elem' 피해가 따로 들어옴 (무적 끔 · HP 넉넉히)
  const melee = await p.evaluate(async () => { const T = __T, H = T.hero; T.GOD_INV = false; H.baseHP = 20000; T.INV.render(); H.hp = H.max; const f = T.foxes.find(m => m.kind === 'dr_fire' && !m.dead); const at = [H.i + 1, H.j]; f.i = f.fi = at[0]; f.j = f.fj = at[1]; f.x = at[0] + .5; f.z = at[1] + .5; f.t = 1; f.home = at; f.aggro = true; f.cool = 0;
    const hurt = []; const oh = T.TELE.hurt; T.TELE.hurt = (k, d) => { hurt.push([k, d]); return oh(k, d); }; const gw = s => new Promise(r => { const t1 = T.time; const iv = setInterval(() => { if (T.time - t1 >= s) { clearInterval(iv); r(); } }, 50); }); await gw(4.5); T.TELE.hurt = oh; f.aggro = false; T.GOD_INV = true; H.hp = H.max; return { hurt, hp: H.hp, max: H.max, el: T.log.slice(-8).map(x => String(x.t || x.text || x)).filter(s => /불/.test(s)) }; });
  console.log('melee', JSON.stringify(melee).slice(0, 300));
  ok(melee.hurt.length >= 2, `정령 근접 피해 들어옴 (${melee.hurt.length}번)`);
  // ---------- ④ 드랍 (확률 1로)
  const drop = await p.evaluate(() => { const T = __T, D = T.DREAM, keep = { a: D.BLESS_P, b: D.G_BLESS_P, c: D.G_HERO_P, d: D.G_ELIX_P }; const f0 = { kind: 'dr_fire', i: T.hero.i, j: T.hero.j, x: T.hero.x, z: T.hero.z }, g0 = { ...f0, kind: 'dr_gfire' };
    D.BLESS_P = 1; D.G_BLESS_P = 1; D.G_HERO_P = 1; D.G_ELIX_P = 1; T.GROUND.clear(); T.dreamLoot(f0); const s1 = T.GROUND.list().map(d => d.id); T.GROUND.clear(); T.dreamLoot(g0); const s2 = T.GROUND.list().map(d => ({ id: d.id, rar: T.ITEMS[d.id].rar, craft: !!T.ITEMS[d.id].craft }));
    D.BLESS_P = 0; D.G_BLESS_P = 0; D.G_HERO_P = 0; D.G_ELIX_P = 0; T.GROUND.clear(); const z = T.dreamLoot(g0), s3 = T.GROUND.list().length;
    // 확률 통계 (원래 값으로 2000번)
    D.BLESS_P = keep.a; D.G_BLESS_P = keep.b; D.G_HERO_P = keep.c; D.G_ELIX_P = keep.d; const N = 2000, c = { sb: 0, gb: 0, gh: 0, ge: 0 }; for (let q = 0; q < N; q++) { T.GROUND.clear(); T.dreamLoot(f0); if (T.GROUND.list().some(d => /^bscroll_/.test(d.id))) c.sb++; T.GROUND.clear(); T.dreamLoot(g0); const L = T.GROUND.list(); if (L.some(d => /^bscroll_/.test(d.id))) c.gb++; if (L.some(d => T.ITEMS[d.id].rar === '영웅' && d.id !== 'pure_elixir')) c.gh++; if (L.some(d => d.id === 'pure_elixir')) c.ge++; } T.GROUND.clear();
    // 유니콘 전리품
    const u = { n: 0, bw: [], ba: [], pe: [] }; for (let q = 0; q < 300; q++) { T.GROUND.clear(); T.GROUND.bossLoot({ kind: 'unicorn', i: T.hero.i, j: T.hero.j, x: T.hero.x, z: T.hero.z }); const L = T.GROUND.list(); u.n++; const cnt = id => L.filter(d => d.id === id).reduce((s, d) => s + d.n, 0); u.bw.push(cnt('bscroll_weapon')); u.ba.push(cnt('bscroll_armor')); u.pe.push(cnt('pure_elixir')); } T.GROUND.clear();
    return { s1, s2, z, s3, p: { sb: c.sb / N, gb: c.gb / N, gh: c.gh / N, ge: c.ge / N }, uni: { bw: [Math.min(...u.bw), Math.max(...u.bw)], ba: [Math.min(...u.ba), Math.max(...u.ba)], pe: [Math.min(...u.pe), Math.max(...u.pe)] } }; });
  console.log('drop', JSON.stringify(drop));
  ok(drop.s1.length === 1 && /^bscroll_/.test(drop.s1[0]), `정령 확률 1 → 축 주문서 1개 (${drop.s1})`);
  ok(drop.s2.length === 3 && drop.s2.some(x => /^bscroll_/.test(x.id)) && drop.s2.some(x => x.rar === '영웅' && !x.craft && x.id !== 'pure_elixir') && drop.s2.some(x => x.id === 'pure_elixir'), `대정령 확률 1 → 축·영웅(제작 아님)·퓨어엘릭서 (${drop.s2.map(x => x.id)})`);
  ok(!drop.z && drop.s3 === 0, '확률 0 → 드랍 없음');
  ok(Math.abs(drop.p.sb - 0.05) < 0.015 && Math.abs(drop.p.gb - 0.15) < 0.025 && Math.abs(drop.p.gh - 0.03) < 0.012 && Math.abs(drop.p.ge - 0.15) < 0.025, `드랍 확률 정령 축 ${drop.p.sb} · 대정령 축 ${drop.p.gb} 영웅 ${drop.p.gh} 퓨어 ${drop.p.ge}`);
  ok(drop.uni.bw[0] >= 1 && drop.uni.bw[1] <= 2 && drop.uni.ba[0] >= 1 && drop.uni.ba[1] <= 2 && drop.uni.pe[0] >= 1 && drop.uni.pe[1] <= 5 && drop.uni.pe[1] >= 4, `유니콘 반드시 축데이 ${drop.uni.bw} · 축젤 ${drop.uni.ba} · 퓨어엘릭서 ${drop.uni.pe}`);
  // ---------- ⑤ 대정령 속성 마법 · 유니콘 기술
  const sk = await p.evaluate(async () => { const T = __T, H = T.hero, out = {}, gw = s => new Promise(r => { const t1 = T.time; const iv = setInterval(() => { if (T.time - t1 >= s) { clearInterval(iv); r(); } }, 50); }); const put = (kind, di, dj) => { const m = T.foxes.find(x => x.kind === kind && !x.dead) || T.mkMob(kind, H.i + di, H.j + dj); if (!T.foxes.includes(m)) T.foxes.push(m); const at = [H.i + di, H.j + dj]; m.i = m.fi = at[0]; m.j = m.fj = at[1]; m.x = at[0] + .5; m.z = at[1] + .5; m.t = 1; m.home = at; m.aggro = true; m.sk = {}; return m; };
    const g = put('dr_gwater', 3, 0); g.sk = { gmagic: 0.01 }; await gw(1.4); const a1 = T.AOES.find(x => x.res === 'water'); out.gm = a1 ? { dmg: a1.dmg, r: a1.r, res: a1.res, slow: a1.slow, src: a1.src && a1.src.kind, msg: a1.msg } : null; g.aggro = false; g.sk = { gmagic: 99 };
    const u = put('unicorn', 4, 0); u.hp = u.max * 0.3; u.sk = { charge: 0.01, horn: 99, heal: 99 }; await gw(1.4); out.charge = T.AOES.filter(x => x.src === u).length; await gw(1.5); u.sk = { charge: 99, horn: 0.01, heal: 99 }; await gw(1.5); out.horn = !!T.AOES.find(x => x.src === u && x.r === 2.2);
    await gw(1.6); u.sk = { charge: 99, horn: 99, heal: 0.01 }; const hp0 = u.hp; await gw(1.8); out.heal = { hp0, hp1: u.hp, max: u.max, used: !!u._uheal }; u.sk = { charge: 99, horn: 99, heal: 0.01 }; await gw(1.8); out.healAgain = u.hp; u.aggro = false; u.hp = u.max;
    out.log = T.log.slice(-12).map(x => String(x.t || x.text || x)).filter(s => /대정령|유니콘/.test(s)); return out; });
  console.log('skills', JSON.stringify(sk));
  ok(sk.gm && sk.gm.res === 'water' && sk.gm.slow === 2 && sk.gm.dmg[0] === Math.round(180 * 1.3 / 2.5) && sk.gm.dmg[1] === Math.round(286 * 1.3 / 2.5), `대정령 속성 마법: 물 · 피해 ${sk.gm && sk.gm.dmg} (근접 1.3배 ÷ BOSS_MAGIC) · 둔화`);
  ok(sk.charge >= 2, `유니콘 돌진 범위 ${sk.charge}칸`); ok(sk.horn, '유니콘 뿔 빛기둥');
  ok(sk.heal.used && sk.heal.hp1 > sk.heal.hp0 && Math.abs(sk.heal.hp1 - sk.heal.hp0 - sk.heal.max * 0.05) < 2 && sk.healAgain === sk.heal.hp1, `유니콘 치유 빛 5% 1번만 (${Math.round(sk.heal.hp0)} → ${Math.round(sk.heal.hp1)} · 다시 ${Math.round(sk.healAgain)})`);
  ok(sk.log.some(s => /돌진/.test(s)) && sk.log.some(s => /빛기둥/.test(s)) && sk.log.some(s => /치유/.test(s)), '기술 안내 문구');
  // ---------- ⑥ 퓨어엘릭서 교환 · 엘릭서 복용 · 상한 · 저장
  await p.evaluate(() => { __T.TOWN.goTown(); }); await p.waitForTimeout(800);
  const ex = await p.evaluate(async () => { const T = __T, out = {}; T.INV.add('pure_elixir', 650, true); const st0 = T.INV.stat().str; const craft = document.querySelector('[data-ct="elix"]'); T.CRAFT_.open(); craft.click(); await new Promise(r => setTimeout(r, 400));
    out.rows = document.querySelectorAll('#cr-list [data-ex]').length; const go = async id => { const b = document.querySelector(`#cr-list [data-ex="${id}"]`); if (!b || b.disabled) return false; b.click(); await new Promise(r => setTimeout(r, 200)); const y = document.getElementById('ask-yes'); if (y) y.click(); await new Promise(r => setTimeout(r, 300)); return true; };
    for (let q = 0; q < 5; q++) await go(q < 3 ? 'elixir_str' : 'elixir_dex'); out.after5 = { pure: T.INV.count('pure_elixir'), str: T.INV.count('elixir_str'), dex: T.INV.count('elixir_dex'), c: T.INV.elix().c };
    out.sixth = await go('elixir_str'); out.pure6 = T.INV.count('pure_elixir'); out.msg6 = T.log.slice(-2).map(x => String(x.t || x.text || x)).join(' / ');
    // 복용
    const drink = async id => { const e = T.INV.bag().find(x => x.id === id); if (!e) return; T.INV.use(e); await new Promise(r => setTimeout(r, 150)); const y = document.getElementById('ask-yes'); if (y && !document.getElementById('askwin').hidden) y.click(); await new Promise(r => setTimeout(r, 200)); };
    await drink('elixir_str'); out.str1 = T.INV.stat().str - st0; for (let q = 0; q < 2; q++) await drink('elixir_str'); for (let q = 0; q < 2; q++) await drink('elixir_dex'); out.after = { str: T.INV.stat().str - st0, elix: T.INV.elix() };
    T.INV.add('elixir_int', 1, true); await drink('elixir_int'); out.sixthDrink = { n: T.INV.elix().n, left: T.INV.count('elixir_int'), msg: T.log.slice(-2).map(x => String(x.t || x.text || x)).join(' / ') };
    out.tip = T.INV.tipOf({ id: 'elixir_int', n: 1, on: false }); out.save = T.SAVE_.snap().inv.elix; return out; });
  console.log('elixir', JSON.stringify(ex));
  ok(ex.rows === 3 && ex.after5.pure === 150 && ex.after5.str === 3 && ex.after5.dex === 2 && ex.after5.c === 5, `교환 5번: 퓨어 650 → ${ex.after5.pure} · 힘 ${ex.after5.str} · 민첩 ${ex.after5.dex} · 제작 ${ex.after5.c}/5`);
  ok(!ex.sixth && ex.pure6 === 150, `6번째 교환 막힘 (버튼 비활성) ${ex.msg6}`);
  ok(ex.str1 === 1 && ex.after.str === 3 && ex.after.elix.str === 3 && ex.after.elix.dex === 2 && ex.after.elix.n === 5, `복용: 힘 +${ex.after.str} · 민첩 +${ex.after.elix.dex} · 합계 ${ex.after.elix.n}/5`);
  ok(ex.sixthDrink.n === 5 && ex.sixthDrink.left === 1 && /5개까지만/.test(ex.sixthDrink.msg), `6번째 복용 막힘 (${ex.sixthDrink.msg})`);
  ok(/5\/5/.test(ex.tip), `툴팁에 (n/5): ${ex.tip.split('\n').find(l => /엘릭서/.test(l))}`); ok(ex.save && ex.save.str === 3 && ex.save.dex === 2 && ex.save.c === 5, `저장 inv.elix ${JSON.stringify(ex.save)}`);
  // 저장·불러오기 왕복
  const rt = await p.evaluate(() => { const T = __T, s = T.SAVE_.snap(); const st = T.INV.stat().str; T.INV.load({ bag: [], bonus: {} }); const st2 = T.INV.stat().str; T.SAVE_.apply(s); return { st, st2, st3: T.INV.stat().str, elix: T.INV.elix() }; });
  ok(rt.st2 === rt.st - 3 && rt.st3 === rt.st && rt.elix.n === 5, `저장 왕복: 힘 ${rt.st} → 비움 ${rt.st2} → 복원 ${rt.st3}`);
  await p.keyboard.press('Escape'); await p.evaluate(() => { const w = document.getElementById('craftwin'); if (w) w.hidden = true; });
  // ---------- ⑧ 월드맵 도감 · 미니맵
  await p.click('#btn-map'); await p.waitForTimeout(500); await p.click('.mk[data-r="dream_island"]'); await p.waitForTimeout(600);
  const wc = await p.evaluate(() => { const c = document.getElementById('wm-codex'); return { txt: c ? c.textContent : '', desc: (document.getElementById('wm-desc') || {}).textContent || '', name: (document.getElementById('wm-name') || {}).textContent, pe: !!(c && [...c.querySelectorAll('.wc-it')].some(e => /퓨어엘릭서/.test(e.dataset.itip || ''))), mobs: c ? [...c.querySelectorAll('.wc-mob b')].map(e => e.textContent) : [] }; });
  ok(wc.name === '몽환의 섬' && /정령/.test(wc.desc) && wc.mobs.length === 9 && /유니콘/.test(wc.txt) && wc.pe, `월드맵 도감: ${wc.name} · 몬스터 ${wc.mobs.length}종 · 유니콘 · 퓨어엘릭서`);
  { const el = await p.$('#wm-codex'); if (el) await el.screenshot({ path: 'dev/out/dream_codex.png' }); }
  const cdx = await p.evaluate(() => { const L = window.CODEX.list(), f = id => L.find(x => x.id === id); return { pe: f('pure_elixir') && f('pure_elixir').where.join(' / '), es: f('elixir_str') && f('elixir_str').where.join(' / '), hero: (L.find(x => x.rar === '영웅' && x.d.slot && !x.d.craft) || { where: [] }).where.join(' / ') }; });
  ok(cdx.pe && /대정령/.test(cdx.pe) && /유니콘/.test(cdx.pe) && cdx.es && /브론/.test(cdx.es) && /대정령 3%/.test(cdx.hero), `아이템 도감: 퓨어엘릭서(${cdx.pe}) · 엘릭서(${cdx.es}) · 영웅(대정령 3%)`);
  await p.evaluate(() => { const w = document.getElementById('wmap'); if (w) w.hidden = true; });
  await p.evaluate(() => { __T.TOWN.toField('몽환의 섬'); }); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 24 && __T.SCENE === 'field', null, { timeout: 60000 }); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => __T.hero.i === 66 && __T.hero.j === 66), 'toField(몽환의 섬) → 가운데');
  // ---------- ⑨ 스크린샷: (11/1 2차) 도착 화면 PC(확대 2 = 실제) · 넓게(확대 1) · 섬 전체 지도 · 사분면 4곳 · 정령 8종 · 유니콘
  const C = 66; await p.evaluate(() => { for (const f of __T.foxes) f.aggro = false; });
  { const d = await p.evaluate(() => { const G = __T.ISLE.ground, c = document.createElement('canvas'); c.width = 1400; c.height = Math.round(1400 * G.height / G.width); const g = c.getContext('2d'); g.fillStyle = '#16121e'; g.fillRect(0, 0, c.width, c.height); g.drawImage(G, 0, 0, c.width, c.height); return c.toDataURL('image/png'); }); require('fs').writeFileSync('dev/out/dream2_map.png', Buffer.from(d.split(',')[1], 'base64')); }
  for (const [q, dx, dz] of [['E', 28, -28], ['W', -28, 28], ['S', 28, 28], ['N', -28, -28]]) { await p.evaluate(([x, z]) => { __T.TOWN.placeAt(x, z); }, [C + dx, C + dz]); await p.waitForTimeout(900); await p.screenshot({ path: `dev/out/dream_q${q}.png` }); }
  await p.evaluate(() => { __T.TOWN.placeAt(66.5, 66.5); const T = __T, H = T.hero; for (let q = T.foxes.length - 1; q >= 0; q--) T.foxes.splice(q, 1); const K = ['dr_fire', 'dr_water', 'dr_earth', 'dr_wind', 'dr_gfire', 'dr_gwater', 'dr_gearth', 'dr_gwind'];
    K.forEach((k, n) => { const col = n % 4, row = n < 4 ? 1 : 0; const m = T.mkMob(k, H.i - 7 + col * 2 + row * 2, H.j - col * 2 + row * 4); m.home = [m.i, m.j]; m.row = 1; m.aggro = false; T.MOB[k].passive = true; T.foxes.push(m); });
    const u = T.mkMob('unicorn', H.i - 2, H.j + 5); u.home = [u.i, u.j]; u.row = 1; u.aggro = false; T.MOB.unicorn.passive = true; T.foxes.push(u); T.DN_.set(0); });
  await p.waitForTimeout(1500); await p.screenshot({ path: 'dev/out/dream_spirits.png' });
  await p.evaluate(() => { const T = __T; for (const f of T.foxes) { f.atkT = 0; f.aggro = true; } }); await p.waitForTimeout(250); await p.screenshot({ path: 'dev/out/dream_spirits_attack.png' });
  await p.evaluate(() => { const T = __T, u = T.foxes.find(f => f.kind === 'unicorn'); for (const f of T.foxes) { f.atkT = null; f.aggro = false; } u.casting = { k: { cast: 1 }, t: 0.3 }; const g = T.foxes.find(f => f.kind === 'dr_gfire'); g.casting = { k: { cast: 1 }, t: 0.2 }; }); await p.waitForTimeout(200); await p.screenshot({ path: 'dev/out/dream_cast.png' });
  await p.evaluate(() => { for (const f of __T.foxes) f.casting = null; });
  // (11/1 2차) 정령 8종 나란히: ① 실제 게임 화면(확대 1 · 한 줄) ② 실제 그리기 함수(drawSpirit · 얼굴·오로라·알갱이 포함)로 PC 크기(확대 2) 나란히 — 서기 / 공격 / 기술
  await p.evaluate(() => { const T = __T; T.ZOOMT = 1; const H = T.hero; for (let q = T.foxes.length - 1; q >= 0; q--) T.foxes.splice(q, 1); ['dr_fire', 'dr_gfire', 'dr_water', 'dr_gwater', 'dr_earth', 'dr_gearth', 'dr_wind', 'dr_gwind'].forEach((k, n) => { const a = (n - 3.5) * 2, m = T.mkMob(k, H.i + Math.round(a) + 2, H.j - Math.round(a) + 2); m.home = [m.i, m.j]; m.row = 1; m.aggro = false; T.MOB[k].passive = true; T.foxes.push(m); }); });
  await p.waitForTimeout(1800); await p.screenshot({ path: 'dev/out/dream2_spirits_game.png' }); await p.evaluate(() => { __T.ZOOMT = 2; for (const k in __T.MOB) delete __T.MOB[k].passive; });
  { const d = await p.evaluate(async () => { const T = __T, K = ['dr_fire', 'dr_water', 'dr_earth', 'dr_wind', 'dr_gfire', 'dr_gwater', 'dr_gearth', 'dr_gwind'], c = document.createElement('canvas'); c.width = 1900; c.height = 1500; const X = n => n < 4 ? 110 + n * 200 : 930 + (n - 4) * 290; const g = c.getContext('2d');
      const bg = g.createLinearGradient(0, 0, 0, c.height); bg.addColorStop(0, '#2a2636'); bg.addColorStop(1, '#14121a'); g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.font = '600 20px sans-serif'; g.textAlign = 'center';
      const F = K.map((k, n) => { const f = T.mkMob(k, 5, 5); f.row = 1; f.hi = n * 0.41; return f; }), rows = [['서기', f => { f.atkT = null; f.casting = null; }], ['공격', f => { f.atkT = 0.2; f.casting = null; }], ['기술', f => { f.atkT = null; f.casting = { k: { cast: 1 }, t: 0.4 }; }]];
      const sc = document.createElement('canvas'); sc.width = sc.height = 400; const sg = sc.getContext('2d'); sg.setTransform(2, 0, 0, 2, 200, 380);
      for (const [r, [nm, set]] of rows.entries()) { for (let w = 0; w < 30; w++) { await new Promise(rs => requestAnimationFrame(rs)); for (const f of F) { set(f); T.drawSpirit(sg, f); } }   // 이 동작의 프레임 저장 데우기 (게임 시간이 흐르게)
        F.forEach((f, n) => { set(f); const x = X(n), y = 400 + r * 480; g.save(); g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y + 2, 70, 22, 0, 0, 7); g.fill(); g.translate(x, y); g.scale(2, 2); T.drawSpirit(g, f); g.restore(); });
        g.fillStyle = '#f2e6c8'; g.textAlign = 'left'; g.fillText(nm, 12, 70 + r * 480); g.textAlign = 'center'; }
      K.forEach((k, n) => { g.fillStyle = T.MOB[k].great ? '#ffd86a' : '#e8e0d0'; g.fillText(T.MOB[k].name, X(n), 1480); }); return c.toDataURL('image/png'); });
    require('fs').writeFileSync('dev/out/dream2_spirits.png', Buffer.from(d.split(',')[1], 'base64')); }
  await p.close();
  // ---------- ⑦ 진짜 시간표: 유니콘 2시간마다 제단 · 토벌 기록
  { const p2 = await b.newPage({ viewport: { width: 1280, height: 800 } }); p2.on('pageerror', e => errs.push(e.message));
    await login(p2, { cls: 'knight', name: 'drT', init: () => { Object.defineProperty(window, 'DEMO_MODE', { get: () => false, set() {}, configurable: true }); } });
    await p2.evaluate(() => { __T.GOD_INV = true; const r = Date.now.bind(Date); window.__OFF = 0; Date.now = () => r() + window.__OFF * 1000; });
    await enter(p2, Z);
    const t = await p2.evaluate(async () => { const T = __T, out = { spots: [], gaps: [] }; const tm0 = T.ISLAND.bossTimers().unicorn; out.t0 = tm0;
      if (typeof tm0 === 'number') { window.__OFF += tm0 + 5; await new Promise(r => setTimeout(r, 700)); }
      for (let c = 0; c < 4; c++) { const u = T.foxes.find(m => m.kind === 'unicorn' && !m.dead && !m.gone); if (!u) { out.missing = c; break; } out.spots.push(u.home.slice()); u.hp = -10; T.killCheck(u); await new Promise(r => setTimeout(r, 200)); const g = T.ISLAND.bossTimers().unicorn; out.gaps.push(g); out.kill = T.ISLAND.bossKills().unicorn; window.__OFF += g + 5; await new Promise(r => setTimeout(r, 700)); }
      out.alive = T.ISLAND.bossTimers().unicorn; out.msgs = T.log.slice(-10).map(x => String(x.t || x.text || x)).filter(s => /유니콘/.test(s)); return out; });
    console.log('timer', JSON.stringify(t));
    ok(t.spots.length === 4 && t.spots.every(s => s[0] === 66 && s[1] === 63), `유니콘은 늘 제단 위 3칸(66,63)에 (${t.spots.map(s => s.join(',')).join(' ')})`);
    ok(t.gaps.every(g => g >= 7190 && g <= 7500), `잡힌 뒤 2시간~2시간 5분 (${t.gaps.join(' ')})`);
    ok(t.kill && t.kill.by && t.msgs.some(s => /토벌/.test(s)) && t.msgs.some(s => /나타났/.test(s)), `토벌 기록 ${JSON.stringify(t.kill)} · 공지`);
    await p2.close(); }
  // ---------- 모바일 화면
  { const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); const pm = await ctx.newPage(); pm.on('pageerror', e => errs.push('mobile: ' + e.message));
    await login(pm, { cls: 'elf', name: 'drM' }); await pm.evaluate(() => { __T.GOD_INV = true; }); await enter(pm, Z); await pm.waitForTimeout(1500);
    const mi = await pm.evaluate(() => ({ mobile: __T.MOBILE, z: __T.ISLE.id, n: __T.foxes.length, at: [__T.hero.i, __T.hero.j] })); ok(mi.mobile && mi.z === 24 && mi.n >= 144 && mi.at[0] === 66 && mi.at[1] === 66, `모바일 입장 ${JSON.stringify(mi)}`);
    await pm.evaluate(() => { __T.DN_.set(0); }); await pm.waitForTimeout(900); await pm.screenshot({ path: 'dev/out/dream2_mobile.png' });
    await pm.evaluate(() => { __T.TOWN.placeAt(94.5, 38.5); }); await pm.waitForTimeout(900); await pm.screenshot({ path: 'dev/out/dream_mobile.png' }); await ctx.close(); }
  console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'no page errors'); ok(!errs.filter(e => !/Failed to load|TUNNEL|WebSocket/.test(e)).length, '페이지 오류 없음'); await b.close(); })();
