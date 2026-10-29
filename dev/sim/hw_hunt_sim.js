// 할로윈 호박밭 자동사냥 시뮬 (실제 게임 코드를 빠르게 돌림): Lv55 기사 · 초록+용기 물약 · 모자 +N · 2시간
// python3 dev/mkkt.py && python3 dev/mksim.py && bash dev/runkt.sh "dev/sim/hw_hunt_sim.js 0,4,7,9 7200"
const { chromium } = require('playwright');
const HATS = (process.argv[2] || '0').split(',').map(Number), SEC = +(process.argv[3] || 7200);
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 800, height: 600 } })).newPage(); const errs = []; p.on('pageerror', x => errs.push(String(x).slice(0, 200)));
  await p.goto('http://127.0.0.1:8766/_sim2.html'); await p.waitForSelector('#lg-mode', { state: 'visible', timeout: 60000 }); await p.click('#lg-mode');
  await p.fill('#lg-acc', 'hs' + Date.now() % 1e6); await p.fill('#lg-pw', 'abcd'); await p.fill('#lg-pw2', 'abcd'); await p.click('#lg-go');
  await p.waitForSelector('.cs-card[data-cls="knight"]', { state: 'visible', timeout: 60000 }); await p.click('.cs-card[data-cls="knight"]'); await p.click('#cs-start');
  await p.waitForSelector('#nm-in', { state: 'visible' }); await p.fill('#nm-in', 'hs' + Date.now() % 1e5); await p.click('#nm-go');
  await p.waitForFunction(() => window.__gameOn && window.__T && __T.SCENE === 'town', null, { timeout: 60000 }); await p.waitForTimeout(500);
  const out = [];
  for (const hat of HATS) {
    await p.evaluate(hat => { const T = __T, H = T.hero; if (T.AUTO.on()) T.AUTO.toggle(); T.INV.load({ bag: [{ id: 'long_sword', n: 1, on: 'weapon', en: 0 }, { id: 'hw_hat', n: 1, en: hat }, { id: 'return_scroll', n: 5 }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } });
      H.lv = 55; H.exp = 0; H.baseHP = 600; T.INV.render(); T.BUFF.haste1 = 1e7; T.BUFF.haste2 = 1e7; H.hp = H.max; T.setCoins(0);
      T.AUTO.setCfg({ retHp: 0, lowPot: false, buy: false, deathBack: true, noBoss: false, aggrFirst: true, loot: true, sell: false, mute: true }); T.TOWN.toZone(21); }, hat);
    await p.waitForTimeout(1500);
    const r = await p.evaluate(async SEC => { const T = __T, t0 = __S.time, K = {}; const kc = T.killCheck;
      window.__HOOK = () => { for (const f of T.foxes) if (f.dead && !f._cnt) { f._cnt = 1; K[f.kind] = (K[f.kind] || 0) + 1; } else if (!f.dead && f._cnt) f._cnt = 0; };
      T.AUTO.toggle(); window.__FAST = 400; window.__DRAW = 0;
      await new Promise(res => { const iv = setInterval(() => { if (__S.time - t0 >= SEC || T.SCENE !== 'field') { clearInterval(iv); res(); } }, 50); });
      window.__FAST = 0; window.__HOOK = null; if (T.AUTO.on()) T.AUTO.toggle();
      return { sec: Math.round(__S.time - t0), scene: T.SCENE, kills: K, seed: T.INV.count('hw_seed'), scroll: T.INV.count('hw_scroll'), bscroll: T.INV.count('hw_bscroll'), coins: T.coins, lv: T.hero.lv, exp: T.hero.exp, need55: T.needExp(55), hp: Math.round(T.hero.hp), ground: T.GROUND.here().length }; }, SEC);
    r.hat = hat; out.push(r); console.log(JSON.stringify(r));
    await p.evaluate(() => __T.TOWN.goTown()); await p.waitForTimeout(800); }
  require('fs').writeFileSync('dev/out/hw_hunt_sim.json', JSON.stringify(out, null, 1));
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
