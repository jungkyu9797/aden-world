// 수호탑 대전 모의전: 봇 방어 계수(TWB.acK) 예전 0.003 ↔ 지금 값으로 같은 판(시드)을 번갈아 돌려 승률·시간·봇 명중 비교 (10/30 PvP 명중 변경 확인용)
// python3 dev/mkkt.py && KT_PORT=8772 KT_TO=1800 bash dev/runkt.sh "dev/sim/tw_hit_sim.js 20"
//  · 기준 유저(가장 센 유저) = Lv57 기사 영웅급(dev/sim/pvpbuilds.js) 공격력 + 기준 캐릭터 HP 703 · AC −127 · MR 70 (REF=build 이면 빌드 그대로)
const { chromium } = require('playwright'); const login = require('../tq.js'); const B = require('./pvpbuilds.js');
const N = +(process.argv[2] || 10), OLDK = 0.003;
(async () => { const b = await chromium.launch(); const errs = [];
  try { const p = await b.newPage({ viewport: { width: 800, height: 600 } }); p.on('pageerror', e => errs.push(String(e.message).slice(0, 200)));
    await login(p, { cls: 'knight', name: 'twsim' });
    const ref = await p.evaluate(({ D, useBuild }) => { const T = __T, H = T.hero, bonus = { str: 11, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
      T.INV.load({ bag: D.bag.map(([id, on, en, bl]) => ({ id, n: 1, on, en, blessed: !!bl })).filter(e => T.ITEMS[e.id]), bonus }); H.lv = 57; H.baseHP = D.hpMax; H.baseMP = D.mpMax; T.INV.render();
      const R = T.INV.dmg(), r = { lv: 57, c: 'knight', hp: H.max, ac: T.INV.ac(), mr: T.INV.cx('mr'), d: Math.round((R[0] + R[1]) / 2 * 10) / 10 };
      return useBuild ? r : Object.assign(r, { hp: 703, ac: -127, mr: 70 }); }, { D: B.knight, useBuild: process.env.REF === 'build' });
    console.log('기준 유저:', JSON.stringify(ref));
    await p.evaluate(() => { __T.GOD_INV = true; __TW.enter(); });
    await p.waitForFunction(() => __T.ISLE && __T.ISLE.def && __T.ISLE.def.tw && __T.SCENE === 'field' && __TW.state(), null, { timeout: 30000 }); await p.waitForTimeout(1500);
    const NEWK = await p.evaluate(() => __TW.bal().acK); console.log(`봇 방어 계수: 예전 ${OLDK} ↔ 지금 ${NEWK} · ${N}판씩 (같은 시드)`);
    const run = (seed, acK) => p.evaluate(({ seed, acK, ref }) => { const T = __T, S = __TW.state(); T.hero.target = null; for (const f of T.foxes) f.gone = true; T.foxes.length = 0;
      Object.assign(S, { seed, ph: 'cd', t: 0, th: [20000, 20000], k: [0, 0], sc: {}, res: null }); __TW.bal({ acK }); __TW.setRef(Object.assign({}, ref));
      const H = { melee: [0, 0], bow: [0, 0] }; __TW.DBG.st = (k, a, Tg, d, kind) => { if (k === 'raw' && a && a.bot && Tg && Tg.bot && H[kind]) { H[kind][0]++; if (d > 0) H[kind][1]++; } };
      let r; try { r = __TW.sim(1900); } finally { __TW.DBG.st = null; }
      return { w: r.S.res ? r.S.res.w : '-', how: r.S.res ? r.S.res.how : '-', t: r.S.t, th: r.S.th, k: r.S.k, ms: r.ms, H }; }, { seed, acK, ref });
    const out = { old: [], now: [] };
    for (let n = 0; n < N; n++) { const seed = 1000 + n * 7919;
      for (const [key, k] of [['old', OLDK], ['now', NEWK]]) { const r = await run(seed, k); out[key].push(r);
        console.log(`#${n + 1} ${key === 'old' ? '예전' : '지금'} 승:${r.w} (${r.how}) 처치 ${r.k.join(':')} 탑HP ${r.th.join('/')} · 근접 명중 ${(100 * r.H.melee[1] / Math.max(1, r.H.melee[0])).toFixed(0)}% · 활 ${(100 * r.H.bow[1] / Math.max(1, r.H.bow[0])).toFixed(0)}% · ${(r.ms / 1000).toFixed(1)}초`); } }
    const sum = L => { const w = { A: 0, B: 0, D: 0 }; let kA = 0, kB = 0, tw = 0, m = [0, 0], bw = [0, 0], thA = 0, thB = 0; for (const r of L) { w[r.w] = (w[r.w] || 0) + 1; kA += r.k[0]; kB += r.k[1]; if (r.how === 'tower') tw++; m[0] += r.H.melee[0]; m[1] += r.H.melee[1]; bw[0] += r.H.bow[0]; bw[1] += r.H.bow[1]; thA += r.th[0]; thB += r.th[1]; }
      return `A(우리 편) 승 ${w.A} · B 승 ${w.B} · 무 ${w.D || 0} / ${L.length} · 탑 파괴로 끝 ${tw} · 평균 처치 ${(kA / L.length).toFixed(1)}:${(kB / L.length).toFixed(1)} · 평균 탑HP ${Math.round(thA / L.length)}/${Math.round(thB / L.length)} · 봇 근접 명중 ${(100 * m[1] / Math.max(1, m[0])).toFixed(1)}% · 활 ${(100 * bw[1] / Math.max(1, bw[0])).toFixed(1)}%`; };
    console.log('\n=== 결과 ===\n예전(' + OLDK + '): ' + sum(out.old) + '\n지금(' + NEWK + '): ' + sum(out.now));
  } catch (e) { console.log('SIM ERROR', e.message); }
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
