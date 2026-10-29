// 사냥터 난이도 배율 시뮬 (실제 게임 코드를 빠르게 돌림): Lv55 기사 영웅급 +5~7 (dev/sim/pvpbuilds.js) · 초록+용기 · 자동 물약 · 자동사냥
// 몬스터 HP·공격을 배율만큼 올린 뒤 지역 N에서 SEC초 사냥 → 처치·물약·사망·경험치
// python3 dev/mkkt.py && python3 dev/mksim.py && bash dev/runkt.sh "dev/sim/zone_scale_sim.js 17 600 1x1,3x3,2x1.5"
const { chromium } = require('playwright'); const B = require('./pvpbuilds.js');
const ZONE = +(process.argv[2] || 17), SEC = +(process.argv[3] || 600), VARS = (process.argv[4] || '1x1').split(',').map(s => s.split('x').map(Number));
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 800, height: 600 } })).newPage(); const errs = []; p.on('pageerror', x => errs.push(String(x).slice(0, 200)));
  await p.goto('http://127.0.0.1:8766/_sim2.html'); await p.waitForSelector('#lg-mode', { state: 'visible', timeout: 60000 }); await p.click('#lg-mode');
  await p.fill('#lg-acc', 'zs' + Date.now() % 1e6); await p.fill('#lg-pw', 'abcd'); await p.fill('#lg-pw2', 'abcd'); await p.click('#lg-go');
  await p.waitForSelector('.cs-card[data-cls="knight"]', { state: 'visible', timeout: 60000 }); await p.click('.cs-card[data-cls="knight"]'); await p.click('#cs-start');
  await p.waitForSelector('#nm-in', { state: 'visible' }); await p.fill('#nm-in', 'zs' + Date.now() % 1e5); await p.click('#nm-go');
  await p.waitForFunction(() => window.__gameOn && window.__T && __T.SCENE === 'town', null, { timeout: 60000 }); await p.waitForTimeout(500);
  const base = await p.evaluate(Z => { const M = __T.MOB || __S.MOB, D = __T.DEF ? __T.DEF[Z] : null, o = {}; for (const k in M) o[k] = { hp: M[k].hp, dmg: M[k].dmg && M[k].dmg.slice() }; return o; }, ZONE);
  const out = [];
  for (const [hk, dk] of VARS) {
    await p.evaluate(({ D, Z, hk, dk, base }) => { const T = __T, H = T.hero, M = T.MOB || __S.MOB; if (T.AUTO.on()) T.AUTO.toggle();
      for (const k in base) { if (!M[k] || M[k].boss || !base[k].dmg) continue; M[k].hp = Math.round(base[k].hp * hk); M[k].dmg = base[k].dmg.map(v => Math.round(v * dk)); }
      const bag = D.bag.map(([id, on, en, bl]) => ({ id, n: 1, on, en, blessed: !!bl })).filter(e => T.ITEMS[e.id]); bag.push({ id: 'red_potion', n: 3000 }, { id: 'orange_potion', n: 3000 }, { id: 'clear_potion', n: 3000 }, { id: 'return_scroll', n: 20 });
      T.INV.load({ bag, bonus: { str: 11, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); H.lv = D.lv; H.exp = 0; H.bonusPts = 0; H.baseHP = D.hpMax; H.baseMP = D.mpMax; T.INV.render();
      const A = T.INV.auto('hp'); A.on = true; A.ps = { red_potion: { on: true, pct: 75 }, orange_potion: { on: true, pct: 60 }, clear_potion: { on: true, pct: 45 } };
      T.BUFF.haste1 = 1e7; T.BUFF.haste2 = 1e7; H.hp = H.max; T.setCoins(0);
      T.AUTO.setCfg({ retHp: 0, lowPot: false, buy: false, deathBack: true, noBoss: true, aggrFirst: true, loot: false, sell: false, mute: true }); T.TOWN.toZone(Z); }, { D: B.knight, Z: ZONE, hk, dk, base });
    await p.waitForTimeout(1500);
    const r = await p.evaluate(async SEC => { const T = __T, t0 = __S.time, K = {}, pot0 = ['red_potion', 'orange_potion', 'clear_potion'].map(id => T.INV.count(id)); let deaths = 0, wasDead = false, minHp = 1, hpSum = 0, n = 0;
      window.__HOOK = () => { for (const f of T.foxes) if (f.dead && !f._cnt) { f._cnt = 1; K[f.kind] = (K[f.kind] || 0) + 1; } else if (!f.dead && f._cnt) f._cnt = 0;
        const dead = T.hero.hp <= 0; if (dead && !wasDead) deaths++; wasDead = dead; const k = T.hero.hp / T.hero.max; if (T.SCENE === 'field') { minHp = Math.min(minHp, k); hpSum += k; n++; } };
      T.AUTO.toggle(); window.__FAST = 400; window.__DRAW = 0;
      await new Promise(res => { const iv = setInterval(() => { if (__S.time - t0 >= SEC) { clearInterval(iv); res(); } }, 50); });
      window.__FAST = 0; window.__HOOK = null; if (T.AUTO.on()) T.AUTO.toggle();
      const used = ['red_potion', 'orange_potion', 'clear_potion'].map((id, i) => pot0[i] - T.INV.count(id));
      return { sec: Math.round(__S.time - t0), kills: K, total: Object.values(K).reduce((a, v) => a + v, 0), pots: used, deaths, minHp: +minHp.toFixed(2), avgHp: +(hpSum / Math.max(1, n)).toFixed(2), exp: T.hero.exp, lv: T.hero.lv, coins: T.coins }; }, SEC);
    r.hpX = hk; r.dmgX = dk; out.push(r); console.log(JSON.stringify(r));
    await p.evaluate(() => { if (__T.DEATH) { const b = document.getElementById('death-town'); if (b) b.click(); } __T.TOWN.goTown(); }); await p.waitForTimeout(1200); }
  require('fs').writeFileSync('dev/out/zone_scale_sim.json', JSON.stringify(out, null, 1));
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
