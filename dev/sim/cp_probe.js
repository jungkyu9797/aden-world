// 빌드 전투력 확인: node로 실행 (runkt) — pvpbuilds 기사·마법사와 기준 캐릭터, 강화 단계를 바꿔 가며
const { chromium } = require('playwright'); const B = require('./pvpbuilds.js'); const REF = JSON.parse(require('fs').readFileSync('dev/sim/builds/ref_knight.json', 'utf8'));
(async () => { const b = await chromium.launch();
  for (const cls of ['knight', 'wizard']) { const p = await (await b.newContext({ viewport: { width: 800, height: 600 } })).newPage();
    await p.goto('http://127.0.0.1:8766/_sim2.html'); await p.waitForSelector('#lg-mode', { state: 'visible', timeout: 60000 }); await p.click('#lg-mode');
    await p.fill('#lg-acc', 'cp' + Date.now() % 1e6); await p.fill('#lg-pw', 'abcd'); await p.fill('#lg-pw2', 'abcd'); await p.click('#lg-go');
    await p.waitForSelector(`.cs-card[data-cls="${cls}"]`, { state: 'visible', timeout: 60000 }); await p.click(`.cs-card[data-cls="${cls}"]`); await p.click('#cs-start');
    await p.waitForSelector('#nm-in', { state: 'visible' }); await p.fill('#nm-in', 'cp' + Date.now() % 1e5); await p.click('#nm-go');
    await p.waitForFunction(() => window.__gameOn && window.__T && __T.SCENE === 'town', null, { timeout: 60000 });
    const D = B[cls]; for (const ed of [-5, -3, -2, 0]) { const r = await p.evaluate(({ D, ed }) => { const T = __T, H = T.hero; const bag = D.bag.map(([id, on, en, bl]) => ({ id, n: 1, on, en: Math.max(0, en + (on === 'doll' || on === 'belt' || /ring/.test(on) ? 0 : ed)), blessed: !!bl })).filter(e => T.ITEMS[e.id]);
        T.INV.load({ bag, bonus: { str: D.main === 'str' ? 11 : 0, dex: 0, con: 0, int: D.main === 'int' ? 11 : 0, wis: 0, cha: 0 } }); H.lv = D.lv; H.baseHP = D.hpMax || D.baseHP; H.baseMP = D.mpMax || D.baseMP; T.INV.render(); return { cp: T.CP_().total, hp: H.max, ac: T.INV.ac() }; }, { D, ed }); console.log(cls, 'pvpbuild en', ed, JSON.stringify(r)); }
    if (cls === 'knight') { const r = await p.evaluate(R => { const T = __T, H = T.hero; const idOf = nm => Object.keys(T.ITEMS).find(k => T.ITEMS[k].name === nm && !T.ITEMS[k].hidden && T.ITEMS[k].slot); const bag = R.gear.map(([nm, on, en, bl]) => ({ id: idOf(nm), n: 1, on, en, blessed: !!bl })).filter(e => e.id);
        const z = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }; T.INV.load({ bag, bonus: z }); H.lv = R.lv; const st = T.INV.stat(), bonus = {}; for (const k in z) bonus[k] = Math.max(0, R.stats[k] - st[k]); T.INV.load({ bag, bonus }); H.baseHP = 400; H.baseMP = 40; T.INV.render(); H.baseHP += R.hp - H.max; H.baseMP += R.mp - H.maxmp; T.INV.render(); return { cp: T.CP_().total, hp: H.max }; }, REF); console.log('ref knight', JSON.stringify(r)); }
    await p.close(); }
  await b.close(); })();
