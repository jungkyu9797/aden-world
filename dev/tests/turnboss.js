// 턴 언데드: 자동 사용·직접 사용 모두 보스(데스나이트 등)에게는 안 씀 (KT_PORT=8798 bash dev/runkt.sh dev/tests/turnboss.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'wizard', name: 'tbWZ' });
  await p.evaluate(() => { const T = __T; T.GOD_INV = true; T.hero.lv = 56; T.LEARNED.add('turnund'); T.INV.setAutoSk('turnund', true); T.TOWN.toZone(8); }); await p.waitForTimeout(1500);
  const run = (kind, ms) => p.evaluate(async ({ kind, ms }) => { const T = __T, H = T.hero; for (const f of T.foxes) if (!f.isPet) f.gone = true; let m = null; for (let d = 2; d < 6 && !m; d++) m = T.mkMob(kind, H.i + d, H.j); T.foxes.push(m); m.hp = m.max = 1e6; m.summoned = true; m.aggro = true; H.target = m;
    H.mp = H.maxmp = 999; const n0 = T.log.length; let casts = 0, mpLow = 999; const t0 = performance.now(); while (performance.now() - t0 < ms) { await new Promise(r => setTimeout(r, 100)); H.target = m; if ((T.SKCD.turnund || 0) > 0) { casts++; T.SKCD.turnund = 0; } mpLow = Math.min(mpLow, H.mp); H.mp = 999; }
    m.gone = true; return { casts, mpUsed: 999 - mpLow, log: T.log.slice(n0).map(x => x.t || x).filter(t => /턴 언데드/.test(t)).slice(-3) }; }, { kind, ms });
  const z = await run('zombie', 3000), dk = await run('deathknight', 4000); console.log(JSON.stringify({ z, dk }));
  ok('자동: 일반 언데드(좀비)에게는 턴 언데드 씀', z.casts > 0);
  ok('자동: 언데드 보스(데스나이트)에게는 안 씀', dk.casts === 0);
  const man = await p.evaluate(() => { const T = __T, H = T.hero; for (const f of T.foxes) if (!f.isPet) f.gone = true; let m = null; for (let d = 2; d < 6 && !m; d++) m = T.mkMob('deathknight', H.i + d, H.j); T.foxes.push(m); H.target = m; H.mp = 200; for (const k in T.SKCD) T.SKCD[k] = 0; const n0 = T.log.length; T.castSkill('turnund'); return { mp: H.mp, cd: T.SKCD.turnund || 0, log: T.log.slice(n0).map(x => x.t || x) }; });
  console.log('manual', JSON.stringify(man)); ok('직접: 보스에게 쓰면 안내만 (MP·재사용 대기 안 씀)', man.mp === 200 && man.cd === 0 && man.log.some(t => /보스에게는 통하지 않아요/.test(t)));
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
