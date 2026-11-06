// 11/6 프로듀서: 대인전 피해 전체 ×0.6 (유저↔유저·유저↔필드 봇·봇↔봇 · 몬스터 사냥·수호탑 대전은 그대로)
//   ① 받는 피해: 같은 원래 피해(마법 100 · AC 무작위 없음)를 몬스터 / 필드 봇 / 다른 유저 / 수호탑 봇에게 맞았을 때 → 필드 봇·유저만 ×0.6
//   ② 주는 피해: 기사가 몬스터에게 100 → 125(사냥 보너스 ×1.25) · 필드 봇에게 100 → 60(보너스 없음 · ×0.6)
//   ③ 실제 1:1 싸움은 dev/sim/pvp_ttk.js (REAL=1 이면 물약까지) ④ 오류 없음
//   KT_PORT=8900 bash dev/runkt.sh dev/tests/pvpdmg.js
const { chromium } = require('playwright'); const login = require('../tq.js');
const REF = { lv: 55, fb: { lv: 55, c: 'knight', hp: 900, ac: -60, mr: 40, d: 45, cp: 5000 } };
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); };
(async () => { const b = await chromium.launch(); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await login(p, { cls: 'knight', name: 'pvdK' });
  // ① 받는 피해 (마을 · 사냥터 방어 v2 없이 · 마법이라 AC 무작위 감소 없음)
  const r1 = await p.evaluate(() => { const T = __T, H = T.hero; T.GOD_INV = false; for (const k of ['reduction', 'immune', 'counter', 'abar', 'ebind', 'counterm', 'invis']) T.BUFF[k] = 0; H.lv = 60; H.baseHP = 5000; T.INV.render();
    const take = src => { H.hp = H.max; const h0 = H.hp; T.hurtHero(100, src, 'magic'); return h0 - H.hp; };
    return { mob: take({ kind: 'goblin', x: H.x, z: H.z }), fb: take({ kind: 'goblin', fb: true, bot: { team: 'B' }, x: H.x, z: H.z }), user: take({ isRemote: true, peer: 'zz', kind: 'goblin', x: H.x, z: H.z }), tw: take({ kind: 'goblin', bot: { team: 'B' }, x: H.x, z: H.z }) }; });
  console.log('①', JSON.stringify(r1));
  const k6 = v => Math.max(1, Math.round(v * 0.6));
  ok(r1.mob > 0 && r1.fb === k6(r1.mob) && r1.user === k6(r1.mob), `① 필드 봇·다른 유저에게 맞은 피해 = 몬스터의 0.6배 (${r1.mob} → 봇 ${r1.fb} · 유저 ${r1.user})`);
  ok(r1.tw === r1.mob, `① 수호탑 봇에게 맞은 피해는 그대로 (${r1.tw})`);
  // ② 주는 피해 (기사): 몬스터 / 필드 봇
  await p.evaluate(R => { const F = __FB; F.setRef(R); F.DBG.noReinf = true; F.DBG.noBoss = true; __T.GOD_INV = true; __T.BUFF.invis = 9999; __T.TOWN.toZone(12); }, REF); await p.waitForTimeout(5000);
  const r2 = await p.evaluate(() => { const T = __T, F = __FB, H = T.hero, R = F.roster(); F.DBG.noAI = true;
    const kb = R.B.filter(b => b.cls === 'knight').sort((a, b) => b.pct - a.pct)[0], f = F.spawnTest(kb.uid, H.i + 3, H.j + 3); f.max = f.hp = 1e6; const b0 = f.hp; T.dmgMob(f, 100); const bot = b0 - f.hp;
    let m = null; for (let d = 3; d < 12 && !m; d++) m = T.mkMob('goblin', H.i + d, H.j - 3); m.max = m.hp = 1e6; T.foxes.push(m); const m0 = m.hp; T.dmgMob(m, 100); const mob = m0 - m.hp; m.dead = true; m.gone = true; f.gone = true; F.DBG.noAI = false;
    return { bot, mob }; });
  console.log('②', JSON.stringify(r2));
  ok(r2.mob === 125, `② 기사 → 몬스터 100 → ${r2.mob} (사냥 보너스 ×1.25 그대로)`);
  ok(r2.bot === 60, `② 기사 → 필드 봇 100 → ${r2.bot} (사냥 보너스 없음 · 대인전 ×0.6)`);
  // ③ 실제 1:1 싸움(봇 AI·물약 포함)은 시뮬로 확인: dev/sim/pvp_ttk.js (봇→나 한 대 62.5 → 37.5 · 나→봇 52 → 28)
  ok(!errs.length, '④ 오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
