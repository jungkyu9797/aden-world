// 11/3 봇 생존: 사냥터 2구역에서 봇 8명(세기 99%~66% · 기사·법사·요정)을 몹 옆에 두고 3분 모의 — 물약 사용 · 최저 HP · 죽음(죽을 때 남은 물약) · 귀환
//   BZ=23 KT_PORT=8896 bash dev/runkt.sh dev/tests/botpot.js     (기준 캐릭터 = Lv61 기사 HP 778 · AC -127 · MR 85)
//   BCHK=1이면 판정: 물약이 20개 넘게 남은 채 죽은 봇 2명 이하 · 물약 먹기 시작 HP 70% 이상
const { chromium } = require('playwright'); const login = require('../tq.js');
const Z = +(process.env.BZ || 23), SEC = +(process.env.BSEC || 180);
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 640 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'bpot' }); await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 60; __T.BUFF.invis = 99999; });
  await p.evaluate(z => __T.TOWN.toZone(z), Z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', Z, { timeout: 60000 }); await p.waitForTimeout(3000);
  await p.evaluate(() => __FB.setRef({ lv: 61, fb: { lv: 61, c: 'knight', hp: 778, ac: -127, mr: 85, d: 60, hb: 0.05, cr: 0.12, cp: 11114 } }));
  const r = await p.evaluate(async (SEC) => { const T = __T, F = __FB, R = F.roster(); F.DBG.noEnsure = true; for (const f of F.bots()) f.gone = true;
    const L = [...R.A, ...R.B].sort((a, b) => b.pct - a.pct); const pick = [L[0], L[3], L[8], L[14], L[20], L[26], L[31], L[36]].filter(Boolean);
    const mobs = T.foxes.filter(f => !f.dead && !f.fb && T.MOB[f.kind] && !T.MOB[f.kind].boss);
    const bots = []; pick.forEach((bb, q) => { const m = mobs[q * 3 % mobs.length]; const f = F.spawnTest(bb.uid, m.i + 1, m.j + 1); if (f) bots.push(f); });
    T.TOWN.placeAt(2, 2);
    F.sim(0.2); const log = new Map(); for (const f of bots) log.set(f.uid, { name: f.bot.name, team: f.bot.team, cls: f.bot.cls, pct: +f.bot.pct.toFixed(2), lv: f.bot.st.lv, ac: f.bot.st.ac, mr: f.bot.st.mr, hp0: f.max, pot0: f.bx ? f.bx.potN : 0, potAt: f.bx ? +f.bx.potAt.toFixed(2) : 0, pots: 0, died: 0, diePot: [], minHpPct: 100, gone: 0 });
    const rec0 = F.stat().low || 0;
    for (let s = 0; s < SEC; s++) { const before = new Map(bots.map(f => [f.uid, { pot: f.bx ? f.bx.potN : 0, dead: f.dead, gone: f.gone }]));
      F.sim(1);
      for (const f of bots) { const a = before.get(f.uid), g = log.get(f.uid); if (!g || a.dead || a.gone) continue; const pot = f.bx ? f.bx.potN : 0; if (pot < a.pot) g.pots += a.pot - pot; if (f.hp > 0) g.minHpPct = Math.min(g.minHpPct, Math.round(100 * f.hp / f.max)); if (f.dead && !a.dead) { g.died++; g.diePot.push(pot); } if (f.gone && !f.dead && !a.gone) g.gone++; } }
    return { zone: T.ISLE.id, bots: [...log.values()], potStat: F.stat().pot, low: (F.stat().low || 0) - rec0 }; }, SEC);
  console.log(JSON.stringify({ zone: r.zone, sec: SEC, potStat: r.potStat, 귀환: r.low }));
  for (const g of r.bots) console.log(`  ${g.team} ${g.cls.padEnd(7)} ${g.name} ${g.pct} Lv${g.lv} AC${g.ac} MR${g.mr} HP${g.hp0} · 먹는 HP ${Math.round(g.potAt * 100)}% · 물약 ${g.pot0 >= 1e8 ? '무제한' : g.pot0 + '개'} 중 ${g.pots} · 최저 ${g.minHpPct}% · 죽음 ${g.died}${g.diePot.length ? ' (남은 물약 ' + g.diePot.join(',') + ')' : ''}${g.gone ? ' · 귀환 ' + g.gone : ''}`);
  const deadWithPots = r.bots.filter(g => g.diePot.some(n => n > 20)).length;
  console.log(`요약: 죽음 ${r.bots.reduce((s, g) => s + g.died, 0)} · 물약 20개 넘게 남기고 죽음 ${deadWithPots} · 귀환 ${r.bots.reduce((s, g) => s + g.gone, 0)}`);
  if (process.env.BCHK) { ok(deadWithPots <= 2, `물약을 20개 넘게 남기고 죽은 봇 ${deadWithPots}명 (2명 이하)`); ok(r.bots.every(g => g.potAt >= 0.7), '물약 먹기 시작 HP 70% 이상'); }
  console.log(errs.slice(0, 3).join('\n') || 'no errors'); await b.close(); })();
