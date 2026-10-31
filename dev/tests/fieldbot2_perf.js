// 11/1 필드 봇 성능 (지역 호스트 1명 · 헤드리스 · 그래픽카드 없음): 화룡의 둥지 2구역(23번)에서 봇 8명(반왕 4 · 라인 4)이 화면 안에서 싸울 때
// 봇 계산(FBOT.mobTick + FBOT.tick) 프레임당 ms · fps · 30초 모의 계산 시간 — 2단계 ① 전후 비교용 (예전 game.js로 바꿔서도 그대로 돌아감)
// KT_PORT=8784 bash dev/runkt.sh dev/tests/fieldbot2_perf.js
const { chromium } = require('playwright'); const login = require('../tq.js');
const REF = { lv: 55, fb: { lv: 55, c: 'knight', hp: 900, ac: -60, mr: 40, d: 45, cp: 5000 } };
(async () => { const b = await chromium.launch(); const errs = []; const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'fbPerf' });
  await p.evaluate(R => { __FB.setRef(R); __T.GOD_INV = true; __T.BUFF.invis = 9999; __T.TOWN.toZone(23); }, REF); await p.waitForTimeout(4000);
  const fps = () => p.evaluate(() => new Promise(r => { let n = 0, w = 0; const L = [], t0 = performance.now(); let l = t0; const f = t => { n++; L.push(t - l); w = Math.max(w, t - l); l = t; if (t - t0 < 5000) requestAnimationFrame(f); else { L.sort((a, b) => a - b); r({ fps: Math.round(n / ((t - t0) / 1000)), p90ms: Math.round(L[Math.floor(L.length * 0.9)]), worstMs: Math.round(w) }); } }; requestAnimationFrame(f); }));
  const cost = () => p.evaluate(() => new Promise(r => { const F = window.__FB, om = F.mobTick, ot = F.tick; let a = 0, n = 0, mx = 0; F.mobTick = (f, dt) => { const t = performance.now(); om(f, dt); a += performance.now() - t; }; F.tick = dt => { const t = performance.now(); ot(dt); a += performance.now() - t; };
    let last = 0; const t0 = performance.now(); const fr = t => { n++; mx = Math.max(mx, a - last); last = a; if (t - t0 < 5000) requestAnimationFrame(fr); else { F.mobTick = om; F.tick = ot; r({ avg: +(a / n).toFixed(3), max: +mx.toFixed(2), frames: n }); } }; requestAnimationFrame(fr); }));
  await p.evaluate(() => { const F = __FB; F.DBG.noEnsure = true; for (const f of F.bots()) f.gone = true; }); await p.waitForTimeout(1500);
  const base = await fps();
  await p.evaluate(() => { const F = __FB, H = __T.hero, R = F.roster(), pick = (t, c, k) => R[t].filter(b => b.cls === c).sort((a, b) => b.pct - a.pct)[k];
    [['A', 'knight', 0], ['A', 'elf', 0], ['A', 'wizard', 0], ['A', 'knight', 1], ['B', 'knight', 0], ['B', 'elf', 0], ['B', 'wizard', 0], ['B', 'wizard', 1]].forEach(([t, c, k], q) => { const f = F.spawnTest(pick(t, c, k).uid, H.i + (q % 4) * 2 - 3, H.j + (t === 'A' ? -3 : 3)); if (f) { f.max *= 20; f.hp = f.max; } }); });   // 오래 싸우게 HP 20배
  await p.waitForTimeout(3000); const bot = await fps(), c = await cost(); const sim = await p.evaluate(() => __FB.sim(30)), n = await p.evaluate(() => ({ bots: __FB.bots().length, mobs: __T.foxes.filter(f => !f.fb && !f.dead).length, lod: __FB.lod(), st: __FB.stat() }));
  console.log('perf23', JSON.stringify({ noBots: base, bots8: bot, botMsPerFrame: c, sim30ms: sim, bots: n.bots, mobs: n.mobs, lod: n.lod, sp: n.st.sp, stun: n.st.stun, pot: n.st.pot }));
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
