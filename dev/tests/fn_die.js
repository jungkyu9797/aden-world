// 화둥 몹 죽는 모습: 불타는 전사·궁수·라바 골렘 (하얗게 재가 되어 증발) + 드래곤 플라이 비교 (KT_PORT=8771 bash dev/runkt.sh dev/tests/fn_die.js)
//   죽은 뒤 deadT가 각 시각을 넘는 순간의 게임 화면을 페이지 안에서 바로 잘라 저장 → dev/out/die_<몹>_<ms>.png · 한 장에 이어 붙인 비교는 dev/out/die_compare.png (python3 dev/tests/fn_die_sheet.py)
const { chromium } = require('playwright'); const login = require('../tq.js'); const fs = require('fs');
const TS = [0.05, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8];
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'fnD' }); await p.evaluate(() => { __T.GOD_INV = true; });
  const only = process.env.KINDS ? process.env.KINDS.split(',') : null; let res = {}; try { res = JSON.parse(fs.readFileSync('dev/out/die_times.json', 'utf8')); } catch (e) {}
  for (const [z, kinds] of [[22, ['fn_fly', 'fn_warrior', 'fn_archer', 'fn_golem']]]) {
    await p.evaluate(z => __T.TOWN.toZone(z), z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', z, { timeout: 20000 }); await p.waitForTimeout(1500);
    for (const k of kinds) { if (only && !only.includes(k)) continue;
      await p.evaluate(k => { const T = __T, H = T.hero; for (let q = T.foxes.length - 1; q >= 0; q--) T.foxes.splice(q, 1); const m = T.mkMob(k, H.i + 2, H.j - 2); m.home = [m.i, m.j]; m.aggro = false; m.row = 1; T.foxes.push(m); window.__M = m; }, k);
      await p.waitForTimeout(1200);
      const shots = await p.evaluate(TS => new Promise(done => { const f = __M, cv = document.getElementById('cv'), r = cv.getBoundingClientRect(), kx = cv.width / r.width, ky = cv.height / r.height, [sx, sy] = __T.scr(f.x, f.z), W = 260, H = 280, OX = 28, out = [];
        const grab = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(cv, (sx - r.left - W / 2 + OX) * kx, (sy - r.top - 220) * ky, W * kx, H * ky, 0, 0, W, H); return c.toDataURL(); };
        out.push({ t: -1, url: grab() });   // 살아 있을 때
        f.bindUntil = __T.time + 99; f.hitT = 0.3; f.hitD = 0.3; f.kx = 1; f.ky = 0; f.kmag = 5; f.hp = -1; __T.killCheck(f); f.flash = 0.09;   // 진짜 타격처럼: 죽인 뒤 번쩍임
        let i = 0; const loop = () => { const t = f.deadT || 0; while (i < TS.length && t >= TS[i]) { out.push({ t, url: grab() }); i++; } if (i < TS.length && __T.time < 1e9) requestAnimationFrame(loop); else done(out); }; requestAnimationFrame(loop); }), TS);
      res[k] = shots.map(s => s.t); shots.forEach((s, n) => fs.writeFileSync(`dev/out/die_${k}_${n}.png`, Buffer.from(s.url.split(',')[1], 'base64')));
      console.log(k, 'deadT', shots.map(s => s.t.toFixed(2)).join(' '));
      const perf = await p.evaluate(() => { const f = __M; return { dead: f.dead, deadT: +f.deadT.toFixed(2) }; }); console.log(k, JSON.stringify(perf));
    } }
  fs.writeFileSync('dev/out/die_times.json', JSON.stringify(res));
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
