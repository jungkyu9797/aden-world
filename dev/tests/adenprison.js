// 11/6 프로듀서 수정 요청: 기란감옥 → 아덴감옥 · 입장은 월드맵이 아니라 마을 NPC(아덴감옥 간수 모르텐) · 산적 3종·파우스트의 악령 = 유저 캐릭터와 같은 키 (두목 클라인·파우스트는 그대로)
// python3 dev/mkkt.py && KT_PORT=8895 bash dev/runkt.sh dev/tests/adenprison.js
const { chromium } = require('playwright'); const login = require('../tq.js'); const fs = require('fs');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
const K4 = ['gp_bandit', 'gp_archer', 'gp_chief', 'gp_ghost'], KB = ['gp_klein', 'gp_faust'];
// 화면 키 재기: 게임의 그리기 함수(drawMobBody · drawHeroSprite)로 빈 캔버스에 그려서, 발 기준점에서 머리 꼭대기까지(가로로 4픽셀 넘게 찬 가장 위 줄) 픽셀 수
async function measure(p, comp) { return p.evaluate(async ({ K, comp }) => { const T = __T;
    for (const k of K) T.MIMG_[k]; for (let t = 0; t < 150; t++) { if (K.every(k => { const I = T.MIMG_[k]; return I && I.idle && I.idle.complete && I.idle.naturalWidth; })) break; await new Promise(r => setTimeout(r, 100)); }
    const meas = draw => { const c = document.createElement('canvas'); c.width = 700; c.height = 700; const g = c.getContext('2d'); draw(g); const D = g.getImageData(0, 0, 700, 700).data; let y4 = 700;
      for (let y = 0; y < 700 && y4 === 700; y++) { let n = 0; for (let x = 0; x < 700; x++) if (D[(y * 700 + x) * 4 + 3] > 120) n++; if (n >= 4) y4 = y; } return 560 - y4; };
    const hero = (g, cls, eq, x, y) => T.DHS_(g, 'idle', 0, 1, x, y, null, cls, s => (eq || {})[s] || null, null);
    const mob = (g, k, x, y) => { const f = T.mkMob(k, 10, 10); f.row = 1; f.t = 1; const [px, py] = T.W2P_(f.x, f.z); g.save(); g.translate(x - px, y - py); T.DMB_(g, f); g.restore(); };
    const M = { knight: meas(g => hero(g, 'knight', null, 350, 560)), knight_helm: meas(g => hero(g, 'knight', { helm: 'plate_helm', armor: 'plate_armor' }, 350, 560)), elf: meas(g => hero(g, 'elf', null, 350, 560)), wizard: meas(g => hero(g, 'wizard', null, 350, 560)) };
    for (const k of K) M[k] = meas(g => mob(g, k, 350, 560));
    const info = Object.fromEntries(K.map(k => [k, { s: +T.MSHEET[k].s.toFixed(4), hh: T.MOB[k].hh, hw: T.MOB[k].hw, sc: +T.MOB[k].sc.toFixed(3), src: T.MSHEET[k].src || '' }]));
    let url = null; if (comp) { const c = document.createElement('canvas'); c.width = 1180; c.height = 250; const g = c.getContext('2d'); g.fillStyle = '#9aa0a8'; g.fillRect(0, 0, 1180, 250);
      g.strokeStyle = 'rgba(200,0,0,.8)'; g.beginPath(); g.moveTo(0, 210.5); g.lineTo(1180, 210.5); g.stroke(); g.strokeStyle = 'rgba(0,90,200,.8)'; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(0, 210.5 - M.knight); g.lineTo(1180, 210.5 - M.knight); g.stroke(); g.setLineDash([]);
      g.font = '700 12px sans-serif'; g.fillStyle = '#10141c'; g.textAlign = 'center'; let x = 55; hero(g, 'knight', null, x, 210); g.fillText('기사 ' + M.knight, x, 236); x += 110; hero(g, 'knight', { helm: 'plate_helm', armor: 'plate_armor' }, x, 210); g.fillText('기사(투구) ' + M.knight_helm, x, 236); x += 140;
      for (const k of K) { mob(g, k, x, 210); g.fillText(`${T.MOB[k].name} ${M[k]} (×${(M[k] / M.knight).toFixed(2)})`, x, 236); x += k === 'gp_klein' ? 170 : k === 'gp_faust' ? 0 : 150; }
      url = c.toDataURL(); }
    return { M, info, url }; }, { K: [...K4, ...KB], comp }); }
(async () => { const b = await chromium.launch(); const errs = []; try {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'apT' });
  await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 58; __T.setCoins(100000); });
  // ① 이름: 게임 원본에 '기란'은 주석·옛 이름 받기 3곳뿐 · 지역·월드맵·아이템·안내 문구는 아덴감옥
  const nm = await p.evaluate(async () => { const T = __T, src = await (await fetch('src/game.js', { cache: 'no-store' })).text(), html = await (await fetch('index.html', { cache: 'no-store' })).text();
    const lines = src.split('\n').filter(l => /기란/.test(l)).map(l => l.trim().slice(0, 60));
    return { lines, html: /기란/.test(html), z26: T.ISLAND.def(26).name, z27: T.ISLAND.def(27).name, pearl: T.ITEMS.dragon_pearl.desc }; });
  console.log('names', JSON.stringify(nm));
  ok('① 지역 이름 아덴감옥 1층·2층 · 아이템 설명', nm.z26 === '아덴감옥 1층' && nm.z27 === '아덴감옥 2층' && /아덴감옥/.test(nm.pearl) && !/기란/.test(nm.pearl));
  ok('① 게임 원본에 남은 "기란"은 주석·옛 이름 받기뿐 (화면 문구 없음)', !nm.html && nm.lines.length === 3 && nm.lines.every(l => /^\/\/|^if \(name === '아덴감옥' \|\| name === '기란감옥'\)/.test(l)));
  // ② 월드맵에는 아덴감옥이 아예 없음 (11/6 프로듀서 두 번째 수정 요청) — 입장은 마을 간수 NPC로만
  await p.evaluate(() => document.getElementById('btn-map').click()); await p.waitForTimeout(600);
  const wm = await p.evaluate(() => ({ mk: !!document.querySelector('#wm-stage .mk[data-r="giran_prison"]'), n: document.querySelectorAll('#wm-stage .mk').length, all: document.getElementById('wmap').innerText }));
  console.log('wm', JSON.stringify({ mk: wm.mk, n: wm.n }));
  await p.screenshot({ path: 'dev/out/adenprison_map.png' });
  ok('② 월드맵에 아덴감옥 표시·설명 없음 (기란도 없음)', !wm.mk && wm.n >= 8 && !/아덴감옥|기란/.test(wm.all));
  await p.evaluate(() => { document.getElementById('wmap').hidden = true; }); await p.waitForTimeout(300);
  const c0 = await p.evaluate(() => __T.coins);
  // ③ 마을 NPC 클릭 → 창 → [입장] → 지역 26
  const npc = await p.evaluate(() => __T.TOWN.gpNpc()); console.log('npc', JSON.stringify(npc));
  await p.evaluate(({ i, j }) => { const H = __T.hero; H.i = H.fi = i - 3; H.j = H.fj = j + 1; H.x = H.i + 0.5; H.z = H.j + 0.5; }, npc); await p.waitForTimeout(700);
  { const [x, y] = await p.evaluate(({ i, j }) => __T.scr(i + 0.5, j + 0.5), npc); const z = await p.evaluate(() => __T.curZ); await p.mouse.move(x + 3, y - 40 * z); await p.waitForTimeout(400);
    await p.screenshot({ path: 'dev/out/adenprison_npc.png', clip: { x: Math.max(0, x - 330), y: Math.max(0, y - 250), width: 660, height: 380 } }); }
  { const [x, y] = await p.evaluate(({ i, j }) => { const q = __T.scr(i + 0.5, j + 0.5); return [q[0], q[1] - 40 * __T.curZ]; }, npc); await p.mouse.click(x, y); }
  await p.waitForSelector('#gpwin', { state: 'visible', timeout: 15000 }).catch(() => {}); await p.waitForTimeout(400);
  const win = await p.evaluate(() => { const w = document.getElementById('gpwin'); return { vis: !w.hidden, t: w.innerText, btn: document.getElementById('gp-enter').textContent, dis: document.getElementById('gp-enter').disabled, log: __T.log.slice(-2).map(x => x.t).join(' | ') }; });
  console.log('win', JSON.stringify({ vis: win.vis, btn: win.btn, t: win.t.slice(0, 260) }));
  await p.screenshot({ path: 'dev/out/adenprison_win.png' });
  ok('③ 간수를 누르면 창 (설명 · 권장 Lv 53~58 · 오늘 남은 시간 · 두목 클라인 · 입장료)', win.vis && /권장 Lv\.53~58/.test(win.t) && /오늘 남은 시간: 4시간/.test(win.t) && /두목 클라인/.test(win.t) && /1,000 골드/.test(win.btn) && !win.dis && /아덴감옥 간수 모르텐/.test(win.log) && !/기란/.test(win.t));
  await p.click('#gp-enter'); await p.waitForTimeout(2500);
  const en = await p.evaluate(() => ({ isle: __T.ISLE && __T.ISLE.id, scene: __T.SCENE, coins: __T.coins, win: document.getElementById('gpwin').hidden, timer: (() => { const t = document.getElementById('gp-timer'); return !t.hidden && t.textContent; })() }));
  console.log('enter', JSON.stringify(en));
  ok('③ [입장하기] → 아덴감옥 1층(26) · 입장료 1,000 골드 · 위에 남은 시간', en.isle === 26 && en.scene === 'field' && en.coins === c0 - 1000 && en.win && /아덴감옥 남은 시간/.test(en.timer || ''));
  // 자동사냥 복귀 길(TOWN.toZone)은 그대로
  await p.evaluate(() => __T.TOWN.goTown()); await p.waitForTimeout(1000); await p.evaluate(() => __T.TOWN.toZone(26)); await p.waitForTimeout(1500);
  ok('자동사냥 복귀 길(마을 → 아덴감옥 1층)은 그대로', await p.evaluate(() => __T.ISLE && __T.ISLE.id === 26));
  await p.evaluate(() => __T.TOWN.goTown()); await p.waitForTimeout(1000);
  // ④ 오늘 시간을 다 쓰면 창의 [입장하기]가 막히고, 눌러도(내부 입장) 못 들어감 · 골드 그대로
  await p.evaluate(() => { __T.GPR_.dbgSet(4 * 3600); __T.TOWN.gpOpen(); }); await p.waitForTimeout(300);
  const c1 = await p.evaluate(() => __T.coins);
  const blk = await p.evaluate(() => ({ dis: document.getElementById('gp-enter').disabled, btn: document.getElementById('gp-enter').textContent, t: document.getElementById('gp-info').innerText }));
  await p.evaluate(() => { const b = document.getElementById('gp-enter'); b.disabled = false; b.click(); }); await p.waitForTimeout(800);
  const blk2 = await p.evaluate(() => ({ scene: __T.SCENE, coins: __T.coins, log: __T.log.slice(-2).map(x => x.t).join(' | ') }));
  await p.evaluate(() => __T.TOWN.toField('아덴감옥')); await p.waitForTimeout(800);
  const blk3 = await p.evaluate(() => __T.SCENE);
  console.log('block', JSON.stringify({ blk, blk2, blk3 }));
  ok('④ 남은 시간 0이면 막힘 (버튼 꺼짐 · 눌러도 못 들어감 · 골드 그대로)', blk.dis && /다 씀/.test(blk.btn) && blk2.scene === 'town' && blk2.coins === c1 && /아덴감옥 이용 시간\(4시간\)을 모두 썼어요/.test(blk2.log) && blk3 === 'town');
  await p.evaluate(() => { __T.GPR_.dbgSet(0); document.getElementById('gpwin').hidden = true; });
  // ⑤ 몹 크기: 산적 3종·악령 키 ≈ 기사 (0.9~1.1배) · 클라인·파우스트는 그대로
  const m1 = await measure(p, true); fs.writeFileSync('dev/out/adenprison_size.png', Buffer.from(m1.url.split(',')[1], 'base64'));
  const rat = Object.fromEntries([...K4, ...KB].map(k => [k, +(m1.M[k] / m1.M.knight).toFixed(2)]));
  console.log('size', JSON.stringify(m1.M), JSON.stringify(rat), JSON.stringify(m1.info));
  ok('⑤ 산적 3종·악령 키 = 기사의 0.9~1.1배 (투구 쓴 기사·요정·마법사와도)', K4.every(k => rat[k] >= 0.9 && rat[k] <= 1.1 && ['knight_helm', 'elf', 'wizard'].every(c => m1.M[k] / m1.M[c] >= 0.9 && m1.M[k] / m1.M[c] <= 1.15)));
  ok('⑤ 이름표·HP바 높이(hh)·클릭 폭(hw)도 줄어듦', K4.every(k => m1.info[k].hh >= 78 && m1.info[k].hh <= 86 && m1.info[k].hw >= 18 && m1.info[k].hw <= 30));
  ok('⑤ 두목 클라인·파우스트는 그대로 (그림 배율 0.9091 · 1.0417 · 기사의 1.4배 넘게)', m1.info.gp_klein.s === 0.9091 && m1.info.gp_faust.s === 1.0417 && rat.gp_klein > 1.4 && rat.gp_faust > 1.6);
  // 화면에서: 밝은 사막필드(지역 3)에 기사 옆으로 몹을 한 줄로 세워 비교 (다른 몹은 치우고 · 잠깐 선공을 끄고)
  await p.evaluate(() => __T.TOWN.toZone(3)); await p.waitForTimeout(2000);
  const row = await p.evaluate(() => { const T = __T, H = T.hero; for (const k of ['gp_bandit', 'gp_archer', 'gp_chief', 'gp_ghost', 'gp_klein']) { T.MOB[k]._aggr = T.MOB[k].aggr; T.MOB[k].aggr = 0; }
    T.foxes.splice(0, T.foxes.length); H.row = 1; H.target = null; const hi = H.i, hj = H.j, L = []; let q = 0;
    for (const [k, q] of [['gp_archer', -2], ['gp_bandit', -1], ['gp_chief', 1], ['gp_ghost', 2], ['gp_klein', 4]]) { const i = hi + q, j = hj - q; if (!T.walkable_(i, j)) continue; const m = T.mkMob(k, i, j); m.home = [i, j]; m.aggro = false; m.row = 1; T.foxes.push(m); L.push([k, i, j]); } return { hi, hj, L }; });
  console.log('row', JSON.stringify(row));
  await p.waitForTimeout(1500); { const [x, y] = await p.evaluate(({ hi, hj }) => __T.scr(hi + 1.5, hj - 0.5), row); const cx = Math.max(0, Math.min(1280 - 1000, x - 500)); await p.screenshot({ path: 'dev/out/adenprison_size_field.png', clip: { x: cx, y: Math.max(0, y - 250), width: 1000, height: 330 } }); }
  await p.evaluate(() => { const T = __T; T.foxes.splice(0, T.foxes.length); for (const k in T.MOB) if ('_aggr' in T.MOB[k]) { T.MOB[k].aggr = T.MOB[k]._aggr; delete T.MOB[k]._aggr; } T.TOWN.goTown(); }); await p.waitForTimeout(1200);
  // 임시 그림(MS_ALIAS) 경로: GIRAN_ART 블록을 뺀 판으로 같은 크기인지
  const p2 = await b.newPage({ viewport: { width: 1280, height: 800 } }); p2.on('pageerror', e => errs.push('alias: ' + e.message));
  await p2.route('**/src/_kt2.js', async r => { const res = await r.fetch(); let s = await res.text(); const a = s.indexOf('/*GIRAN_ART_BEGIN*/'), z = s.indexOf('/*GIRAN_ART_END*/'); if (a >= 0 && z > a) s = s.slice(0, a) + s.slice(z + 17); await r.fulfill({ response: res, body: s }); });
  await login(p2, { cls: 'knight', name: 'apT2' });
  const m2 = await measure(p2, true); fs.writeFileSync('dev/out/adenprison_size_alias.png', Buffer.from(m2.url.split(',')[1], 'base64'));
  const rat2 = Object.fromEntries(K4.map(k => [k, +(m2.M[k] / m2.M.knight).toFixed(2)]));
  console.log('alias', JSON.stringify(rat2), JSON.stringify(Object.fromEntries(K4.map(k => [k, m2.info[k].src]))));
  ok('⑤ 임시 그림(MS_ALIAS)일 때도 산적 3종·악령 키 = 기사의 0.9~1.1배', K4.every(k => m2.info[k].src && rat2[k] >= 0.9 && rat2[k] <= 1.1));
  await p2.close();
  // 마을 간수 자리 (넓게)
  await p.evaluate(({ i, j }) => { const H = __T.hero; H.i = H.fi = i - 3; H.j = H.fj = j + 2; H.x = H.i + 0.5; H.z = H.j + 0.5; }, npc); await p.mouse.move(5, 5); await p.waitForTimeout(700);
  await p.screenshot({ path: 'dev/out/adenprison_town.png' });
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  ok('⑥ 오류 없음', !errs.length); console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
