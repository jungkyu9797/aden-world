// 무기 바꿔 끼우면 한 번 칠 때 평균 피해(빗나감·치명타·발동·심판·기사 +25% 모두 포함) · 공격 간격 · 초당 피해 (KT_PORT=8797 bash dev/runkt.sh "dev/sim/wpn_probe.js 23 build1.json build2.json ...")
// python3 dev/mkkt.py && python3 dev/mksim.py 뒤에 · 상대 = 그 지역 일반 몬스터 종류마다 (HP는 크게)
const { chromium } = require('playwright'); const fs = require('fs');
const ZONE = +process.argv[2], FILES = process.argv.slice(3), N = +(process.env.N || 6000);
(async () => { const b = await chromium.launch(); const errs = [];
  for (const f of FILES) { const REF = JSON.parse(fs.readFileSync(f, 'utf8')); const p = await (await b.newContext({ viewport: { width: 800, height: 600 } })).newPage(); p.on('pageerror', x => errs.push(String(x).slice(0, 200)));
    await p.goto('http://127.0.0.1:' + (process.env.KT_PORT || 8766) + '/_sim2.html'); await p.waitForSelector('#lg-mode', { state: 'visible', timeout: 60000 }); await p.click('#lg-mode');
    await p.fill('#lg-acc', 'wp' + Date.now() % 1e6); await p.fill('#lg-pw', 'abcd'); await p.fill('#lg-pw2', 'abcd'); await p.click('#lg-go');
    await p.waitForSelector('.cs-card[data-cls="knight"]', { state: 'visible', timeout: 60000 }); await p.click('.cs-card[data-cls="knight"]'); await p.click('#cs-start');
    await p.waitForSelector('#nm-in', { state: 'visible' }); await p.fill('#nm-in', 'wp' + Date.now() % 1e5); await p.click('#nm-go');
    await p.waitForFunction(() => window.__gameOn && window.__T && __T.SCENE === 'town', null, { timeout: 60000 }); await p.waitForTimeout(400);
    const r = await p.evaluate(({ R, Z, N }) => { const T = __T, H = T.hero;
      const idOf = nm => Object.keys(T.ITEMS).find(k => T.ITEMS[k].name === nm && !T.ITEMS[k].hidden && T.ITEMS[k].slot) || Object.keys(T.ITEMS).find(k => T.ITEMS[k].name === nm && !T.ITEMS[k].hidden);
      const bag = R.gear.map(([nm, on, en, bl]) => ({ id: idOf(nm), n: 1, on, en, blessed: !!bl })).filter(e => e.id), z = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
      T.INV.load({ bag, bonus: z }); H.lv = R.lv; const st = T.INV.stat(), bonus = {}; for (const k in z) bonus[k] = Math.max(0, R.stats[k] - st[k]); T.INV.load({ bag, bonus }); T.BUFF.haste1 = 1e7; T.BUFF.haste2 = 1e7; T.INV.render();
      const w = T.INV.equipped('weapon'), dm = T.INV.dmg(); T.TOWN.toZone(Z); return { w: T.ITEMS[w] && T.ITEMS[w].name, dmg: dm }; }, { R: REF, Z: ZONE, N });
    await p.waitForTimeout(1500);
    const m = await p.evaluate(({ N }) => { const T = __T, H = T.hero, DF = T.ISLAND.def(T.ISLE ? T.ISLE.id : 0), kinds = [...new Set((DF.mobs || []).map(x => x[0]))].filter(k => T.MOB[k] && !T.MOB[k].boss && !T.MOB[k].midb);
      for (const f of T.foxes) if (!f.isPet) f.gone = true; const o = {}; let tot = 0, nn = 0;
      for (const k of kinds) { let A = null; for (let d = 1; d < 6 && !A; d++) A = T.mkMob(k, H.i + d, H.j); if (!A) continue; T.foxes.push(A); A.summoned = true; A.hp = A.max = 1e9; const fl0 = T.floats.length; let s = 0;
        for (let i = 0; i < N; i++) { const h0 = A.hp; T.strike(A); s += h0 - A.hp; A.hp = 1e9; A.dead = false; } const jud = T.floats.slice(fl0).filter(x => x.tag === 'judge').length; A.gone = true; T.floats.length = fl0;
        o[k] = { per: +(s / N).toFixed(2), judge: +(jud / N * 100).toFixed(1) }; tot += s / N; nn++; }
      H.atk = null; T.heroAttack && 0; return { per: +(tot / Math.max(1, nn)).toFixed(2), mobs: o }; }, { N });
    console.log(JSON.stringify({ f: f.split('/').pop(), weapon: r.w, show: r.dmg, ...m }));
    await p.close(); }
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
