// 몽환의 섬 3차 유니콘 그림 확인 (개발용) — KT_PORT=8774 bash dev/runkt.sh dev/tests/dream3_uni.js
//   실제 drawUnicorn 으로 동작별(서기·구보·공격·기술·쓰러짐) · 방향 8줄을 화면 밖 캔버스에 (확대 2) → dev/out/dream3_unicorn_states.png
//   게임 화면: 한가운데 제단 옆 유니콘 (낮 · 확대 2) → dev/out/dream3_unicorn.png
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'dru' }); await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 60; __T.TOWN.toZone(24); });
  await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 24 && __T.DRA_ && __T.DRA_.DRA.ok, null, { timeout: 60000 });
  const d = await p.evaluate(async () => { const T = __T, c = document.createElement('canvas'), CW = 300, CH = 260; c.width = CW * 8; c.height = CH * 6; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, c.height); gr.addColorStop(0, '#6e6a78'); gr.addColorStop(1, '#8a8478'); g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
    const st = [['idle', f => {}], ['walk', f => { f.t = 0.5; }], ['attack', f => { f.atkT = 0.35; }], ['cast', f => { f.casting = { k: { cast: 1 }, t: 0.3 }; }], ['hit', f => { f.flash = 0.08; }], ['dead', f => { f.dead = true; f.deadT = 0.75; }]];
    for (let k = 0; k < 40; k++) await new Promise(r => requestAnimationFrame(r));
    st.forEach(([nm, set], r) => { for (let row = 0; row < 8; row++) { const f = T.mkMob('unicorn', 5, 5); f.row = row; f.hi = row * 0.3; f.dist = row * 0.31; set(f); g.save(); g.translate(row * CW + CW / 2, r * CH + CH - 40); g.scale(1, 1);
        if (nm === 'hit') T.procLayer(g, f, T.MOB.unicorn, 'unicorn', 1) || T.PROCFX.unicorn[0](g, f); else T.PROCFX.unicorn[0](g, f); g.restore(); } });
    return c.toDataURL('image/png'); });
  require('fs').writeFileSync('dev/out/dream3_unicorn_states.png', Buffer.from(d.split(',')[1], 'base64'));
  await p.evaluate(() => { const T = __T, N = T.ISLE.N, C = Math.floor(N / 2); T.DN_.set(0); T.TOWN.placeAt(C + 3.5, C + 2.5); const H = T.hero; const u = T.mkMob('unicorn', H.i - 2, H.j - 4); u.home = [u.i, u.j]; u.row = 2; T.MOB.unicorn.passive = true; T.foxes.push(u); T.ZOOMT = 2; });
  await p.waitForTimeout(2500);
  const r = await p.evaluate(() => { const u = __T.foxes.find(f => f.kind === 'unicorn'); return __T.scr(u.x, u.z); });
  await p.screenshot({ path: 'dev/out/dream3_unicorn.png', clip: { x: Math.max(0, r[0] - 320), y: Math.max(0, r[1] - 330), width: 640, height: 420 } });
  console.log(errs.length ? 'ERR ' + errs.join(' / ') : 'ok'); await b.close(); })();
