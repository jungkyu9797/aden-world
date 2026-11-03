// 11/3 봇 보스 사냥: 반왕 봇 물약 무제한 · 라인 봇 250~300개 · 큰 보스(Lv.55 이상)는 갈 무리가 없으면 다른 사냥터 파티가 원정 · 파티 예상 시간 기준 3600초
//   BZ=17 KT_PORT=8898 bash dev/runkt.sh dev/tests/botboss.js     (BMAX 최대 초 · 기준 = Lv61 기사 복사)
const { chromium } = require('playwright'); const login = require('../tq.js');
const Z = +(process.env.BZ || 17), MAXS = +(process.env.BMAX || 3600);
const REF = { lv: 61, fb: { lv: 61, c: 'knight', hp: 778, ac: -127, mr: 85, d: 60, hb: 0.05, cr: 0.12, cp: 11114 } };
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 900, height: 600 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'bb' + Z }); await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 61; __T.BUFF.invis = 99999; });
  await p.evaluate(z => __T.TOWN.toZone(z), Z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', Z, { timeout: 60000 }); await p.waitForTimeout(2500);
  const r = await p.evaluate(async ({ REF, MAXS, Z }) => { const T = __T, F = __FB; F.setRef(REF); F.DBG.noEnsure = true; for (const f of F.bots()) f.gone = true; F.sim(0.2);
    const I = T.ISLAND.bossInfo(Z).find(x => !x.quiet); const boss = I && T.foxes.find(m => m.kind === I.kind && !m.dead && !m.gone); if (!boss) return { err: 'boss not alive' };
    T.TOWN.placeAt(2, 2); const P = F.plan(), here = F.roster().all.filter(x => P.at[x.uid] === Z); here.forEach((x, k) => { const a = k / here.length * Math.PI * 2; F.spawnTest(x.uid, Math.round(boss.i + Math.cos(a) * 16), Math.round(boss.j + Math.sin(a) * 16)); });   /* 사냥터에 흩어져 있게 (보스에게서 16칸) */ F.sim(0.3);
    const pot = F.bots().map(f => [f.bot.team, f.bx ? f.bx.potN : (f.bx = null, -1)]);
    F.DBG.noBoss = false; F.DBG.bossNow = true; F.bossPlans.clear(); const S = F.stat(), e0 = S.bossExp || 0, d0 = S.die || 0, l0 = S.low || 0, b0 = S.boss || 0; let t = 0, hitT = 0, minB = 1; const fighters = new Map();
    while (t < MAXS && !boss.dead) { F.sim(5, 0.1); t += 5; if (!hitT && boss.fbD > 0) hitT = t; minB = Math.min(minB, boss.hp / boss.max); for (const f of F.bots()) if (f.bx && f.bx.boss === boss) fighters.set(f.uid, f); }
    const fs = [...fighters.values()], K = T.ISLAND.bossKills ? (T.ISLAND.bossKills()[I.k] || {}) : {};
    return { boss: T.MOB[boss.kind].name, bhp: boss.max, zoneBots: here.map(x => x.team + ':' + x.name), dead: boss.dead, sec: t, hitT, minB: Math.round(minB * 100), exp: (S.bossExp || 0) - e0, by: K.by || '', die: (S.die || 0) - d0, recall: (S.low || 0) - l0,
      fighters: fs.map(f => `${f.bot.team} ${f.bot.cls} Lv${f.bot.st.lv} 물약${f.bx.potN >= 1e8 ? '∞' : f.bx.potN}${f.dead ? ' 죽음' : f.gone ? ' 빠짐' : ''}`), potA: pot.filter(x => x[0] === 'A').map(x => x[1]), potB: pot.filter(x => x[0] === 'B').map(x => x[1]) }; }, { REF, MAXS, Z });
  console.log(JSON.stringify(r));
  ok(r.potA.every(v => v === -1 || v >= 1e8) && r.potB.every(v => v === -1 || (v >= 250 && v <= 300)), `물약: 반왕 무제한 · 라인 250~300개 (${JSON.stringify(r.potB)})`);
  ok(r.hitT > 0, `봇 무리가 ${r.boss}에게 감 (${r.hitT}초에 첫 타 · 원정 부름 ${r.exp}번)`);
  ok(r.dead, `${r.boss}(HP ${r.bhp}) 잡음 — ${Math.round(r.sec / 60)}분 · 토벌 ${r.by} · 남은 HP 최저 ${r.minB}%`);
  console.log(errs.slice(0, 3).join('\n') || 'no errors'); ok(!errs.length, '오류 없음'); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
