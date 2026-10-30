// 화룡의 둥지 그림·소리 확인: 드래곤플라이·폭탄꽃·용암 몹이 공격하고 죽는 동안 오류 없는지 + 전용 효과음 mp3가 모두 열리는지 (bash dev/runkt.sh dev/tests/fn_art_sfx.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
const SND = ['fn_warrior', 'fn_archer', 'fn_golem', 'fn_bomb', 'fn_egg', 'fn_fly', 'fn_ashtazio', 'phoenix'].flatMap(k => ['attack', 'hit', 'death'].concat(k === 'fn_ashtazio' || k === 'phoenix' ? ['attack2'] : []).map(t => k + '_' + t));
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'fnS' }); await p.evaluate(() => { __T.GOD_INV = true; });
  const snd = await p.evaluate(async L => { const AC = new (window.AudioContext || window.webkitAudioContext)(), bad = [], dur = {};
    for (const k of L) { try { const r = await fetch('assets/sound/sfx/' + k + '.mp3'); if (!r.ok) { bad.push(k + ':' + r.status); continue; } const a = await AC.decodeAudioData(await r.arrayBuffer()); dur[k] = +a.duration.toFixed(2); } catch (e) { bad.push(k + ':' + e); } }
    return { n: Object.keys(dur).length, bad }; }, SND);
  console.log('sfx', JSON.stringify(snd));
  await p.evaluate(() => __T.TOWN.toZone(22)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 22 && __T.SCENE === 'field', null, { timeout: 20000 }); await p.waitForTimeout(1500);
  for (const k of ['fn_fly', 'fn_bomb', 'fn_golem', 'fn_warrior', 'fn_archer']) {
    const ok = await p.evaluate(k => { const T = __T, H = T.hero, f = T.foxes.find(m => m.kind === k && !m.dead); if (!f) return false; H.i = H.fi = f.i - 1; H.j = H.fj = f.j + 2; H.x = H.i + .5; H.z = H.j + .5; H.t = 1; f.aggro = true; f.tgt = null; window.__F = f; return true; }, k);
    if (!ok) { console.log(k, 'missing'); continue; }
    await p.waitForTimeout(3500); const atk = await p.evaluate(() => ({ atkSeen: __F.atkT != null || __F.cool > 0, hp: __F.hp }));
    await p.evaluate(() => { const f = __F; f.hp = -10; __T.killCheck(f); }); await p.waitForTimeout(1800);
    console.log(k, JSON.stringify(atk), 'dead', await p.evaluate(() => !!__F.dead));
    await p.screenshot({ path: `dev/out/fn_art_${k}.png` });
  }
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
