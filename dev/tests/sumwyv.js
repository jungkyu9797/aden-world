// 서먼 몬스터 Lv56 와이번 (체력 900 · 독 꼬리) (KT_PORT=8786 bash dev/runkt.sh dev/tests/sumwyv.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'wizard', name: 'swWZ' });
  await p.evaluate(() => { const T = __T; T.GOD_INV = true; T.TOWN.toZone(8); }); await p.waitForTimeout(1500);
  const at = lv => p.evaluate(lv => { const T = __T, P = T.PET; P.sumClear('quiet'); T.hero.lv = lv; P.sumCast(3); const L = P.list().filter(x => x.sum); return { n: L.length, kind: L.map(x => x.kind), hp: L.map(x => x.d.maxhp), rng: L.length ? P.range(L[0].d) : null }; }, lv);
  const a55 = await at(55), a56 = await at(56), a60 = await at(60); console.log(JSON.stringify({ a55, a56, a60 }));
  ok('Lv55 트롤', a55.kind.every(k => k === 'dv_lizard'));
  ok('Lv56 와이번 · 체력 900', a56.n >= 1 && a56.kind.every(k => k === 'wyvern') && a56.hp.every(h => h === 900));
  ok('Lv60 와이번 · 레벨 보정(+12%)', a60.hp.every(h => h === Math.round(900 * 1.12)));
  ok('설명에 56 와이번', await p.evaluate(() => /56 와이번\(독 꼬리\)/.test(__T.SK.summon.desc)));
  // 독: 튼튼한 몹 하나를 세워 두고 20초
  const r = await p.evaluate(async () => { const T = __T, H = T.hero; for (const f of T.foxes) if (!f.isPet && !f.sum) f.gone = true; let m = null; for (let d = 2; d < 8 && !m; d++) m = T.mkMob('dv_lizard', H.i + d, H.j); if (!m) return { err: 'no mob' }; m.hp = m.max = 1e6; m.aggro = true; m.summoned = true;
    H.target = m; m.tgt = H; for (const x of T.PET.list()) if (x.sum) x.target = m;
    await new Promise(r => setTimeout(r, 1500)); const dbg = { scene: T.SCENE, isle: T.ISLE && T.ISLE.id, sums: T.PET.list().filter(x => x.sum).map(x => [x.i - m.i, x.j - m.j, !!x.target, x.zone]), mob: [m.i - H.i, m.j - H.j, m.dead, m.gone], hp: 1e6 - m.hp };
    let psn = 0, maxDps = 0; const t0 = performance.now(); while (performance.now() - t0 < 20000) { await new Promise(r => setTimeout(r, 200)); if (m.bleed && m.bleed.psn) { psn++; maxDps = Math.max(maxDps, m.bleed.dps); } }
    return { dbg, psn, maxDps, dealt: 1e6 - m.hp, st: T.mobStatus ? JSON.stringify((T.mobStatus(m) || []).map(s => s.n)) : '' }; });
  console.log('poison', JSON.stringify(r)); ok('독 꼬리가 걸림 (초록 독 · 초당 피해)', r.psn > 0 && r.maxDps >= 5 && r.maxDps <= 12);
  await p.screenshot({ path: 'dev/out/sumwyv.png' });
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
