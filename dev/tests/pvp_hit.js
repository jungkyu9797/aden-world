// PvP 명중 (10/30): 기본 50% → 70% · 방어(AC) 보정 절반 — 예시 명중률 표(전/후) · 결투 흉내(결투장에서 가짜 상대를 3000번 때려 실제 명중 비율) · 수호탑 봇 경로
// KT_PORT=8772 bash dev/runkt.sh dev/tests/pvp_hit.js
const { chromium } = require('playwright'); const login = require('../tq.js'); const B = require('../sim/pvpbuilds.js');
const OLD = { base: 0.5, acK: 0.004, acKM: 0.002 };
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
const pc = v => (v * 100).toFixed(1) + '%';
(async () => { const b = await chromium.launch(); const errs = []; const rows = [];
  try {
    for (const cls of ['knight', 'elf', 'wizard']) { const D = B[cls], mode = cls === 'knight' ? null : cls === 'elf' ? 'bow' : 'magic';
      const p = await b.newPage({ viewport: { width: 1000, height: 700 } }); p.on('pageerror', e => errs.push(cls + ': ' + e.message));
      await login(p, { cls, name: 'ph' + cls.slice(0, 2) });
      // 두 빌드: 보통(그 직업 무기 +0만 · 주 능력치 18) / 고급(Lv57 · 영웅급 +5~7 축복 dev/sim/pvpbuilds.js · 주 능력치 +11)
      for (const kind of ['보통', '고급']) {
        const info = await p.evaluate(({ D, OLD, mode, kind }) => { const T = __T, H = T.hero, z = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
          let bag = D.bag.map(([id, on, en, bl]) => ({ id, n: 1, on, en, blessed: !!bl })).filter(e => T.ITEMS[e.id]), bonus = Object.assign({}, z);
          if (kind === '보통') { bag = bag.filter(e => e.on === 'weapon').map(e => Object.assign(e, { en: 0, blessed: false })); T.INV.load({ bag, bonus: z }); bonus[D.main] = Math.max(0, 18 - T.INV.stat()[D.main]); } else bonus[D.main] = 11;
          T.INV.load({ bag, bonus }); H.lv = 57; T.INV.render();
          const st = T.INV.stat(), m = mode || undefined, f = (lv, ac, K) => T.PVPHIT_({ lv, ac }, m, K);
          const L = [[57, -40, '같은 레벨 · AC −40'], [57, -80, '같은 레벨 · AC −80'], [56, -127, '기준 캐릭터급 AC −127'], [52, -40, '상대 5레벨 낮음 · AC −40'], [62, -40, '상대 5레벨 높음 · AC −40']]
            .map(([lv, ac, t]) => ({ t, old: f(lv, ac, OLD), now: f(lv, ac) }));
          const tw = __TW.hitP({ bot: { st: { lv: 57, ac: -40 } } }, m);
          return { st: { str: st.str, dex: st.dex, int: st.int }, hit: T.INV.cx('hit'), hitM: T.INV.cx('hitM'), hitR: T.INV.cx('hitR'), L, tw, twEq: f(57, -40), cp: T.CP_().total };
        }, { D, OLD, mode, kind });
        rows.push({ cls, mode, kind, info });
        ok(`${cls} ${kind}: 수호탑 봇에게(TWM.hitP)도 같은 식`, Math.abs(info.tw - info.twEq) < 1e-9);
        ok(`${cls} ${kind}: 같은 레벨 AC −40 명중이 올라감(또는 상한)`, info.L[0].now > info.L[0].old || info.L[0].now === 0.95);
        ok(`${cls} ${kind}: 상한 95% · 하한 20% 안`, info.L.every(r => r.now <= 0.95 + 1e-9 && r.now >= 0.2 - 1e-9));
        // 결투 흉내(보통 빌드): 결투장(15번)에서 가짜 상대(Lv57 · AC −40 / −127)를 3000번씩 때려 실제 명중 비율 확인
        if (kind === '보통') {
          if (!(await p.evaluate(() => !!(__T.ISLE && __T.ISLE.def && __T.ISLE.def.duel)))) { await p.evaluate(() => __T.TOWN.toZone(15)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.def && __T.ISLE.def.duel && __T.SCENE === 'field', null, { timeout: 20000 }); await p.waitForTimeout(500); }
          for (const [lv, ac] of [[57, -40], [56, -127]]) {
            const du = await p.evaluate(({ mode, lv, ac }) => { const T = __T, N = T.NET, H = T.hero, keep = { alive: N.alive, duelDef: N.duelDef, pvp: N.pvp }; let hit = 0, dmg = 0; const n = 3000;
              N.alive = () => true; N.duelDef = () => ({ ac, mr: 0, lv, so: 0, sn: 0 }); N.pvp = (q, d) => { hit++; dmg += d; };
              const foe = { isRemote: true, peer: 'fake', x: H.x + 1, z: H.z, i: H.i + 1, j: H.j, dead: false };
              try { for (let k = 0; k < n; k++) T.strike(foe, mode || undefined); } finally { Object.assign(N, keep); }
              return { n, hit, rate: hit / n, exp: T.PVPHIT_({ lv, ac }, mode || undefined), avg: hit ? dmg / hit : 0 }; }, { mode, lv, ac });
            console.log(`  결투 흉내(${cls} 보통 → Lv${lv} AC ${ac}): ${du.hit}/${du.n} = ${pc(du.rate)} (식 ${pc(du.exp)}) · 평균 피해 ${du.avg.toFixed(1)}`);
            ok(`${cls}: 결투 흉내 AC ${ac} 명중 비율이 식과 맞음 (±3%)`, Math.abs(du.rate - du.exp) < 0.03); } }
      }
      await p.close(); }
    // 봇 → 유저 (수호탑 봇 hitChance: 기본 80% + 레벨 차 1당 3% − 방어 1당 acK)
    const p = await b.newPage(); await login(p, { cls: 'knight', name: 'phbt' });
    const TWB = await p.evaluate(() => Object.assign({}, __TW.bal())); await p.close();
    const bot = (ac, k) => Math.max(0.2, Math.min(0.95, TWB.hit - (10 - ac) * k));
    ok('봇 기본 80% 그대로 · 방어 계수 0.3% → 0.15%', TWB.hit === 0.8 && TWB.acK === 0.0015);
    console.log('\n=== 예시 명중률 (전 → 후) · 내 레벨 57 ===');
    for (const { cls, mode, kind, info } of rows) { console.log(`[${cls} ${mode || '근접'} · ${kind}] 힘 ${info.st.str} 민첩 ${info.st.dex} 지능 ${info.st.int} · 장비 명중 ${info.hit} (근접 ${info.hitM} · 원거리 ${info.hitR}) · 전투력 ${info.cp}`);
      for (const r of info.L) console.log(`  ${r.t.padEnd(20)} ${pc(r.old).padStart(6)} → ${pc(r.now).padStart(6)}`); }
    console.log('[수호탑 봇 → 유저] (같은 레벨)'); for (const ac of [-40, -80, -127]) console.log(`  AC ${ac}`.padEnd(22) + ` ${pc(bot(ac, 0.003)).padStart(6)} → ${pc(bot(ac, TWB.acK)).padStart(6)}`);
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.keys(R).filter(k => !R[k]); console.log(bad.length ? 'FAILED: ' + bad.join(', ') : 'ALL OK'); await b.close(); })();
