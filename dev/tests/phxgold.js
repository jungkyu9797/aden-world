// 11/5 프로듀서: 피닉스의 가호 — 용암·화산탄 면역 그대로 + 골드 획득 +% (조합 +1마다 +1% · 최대 +8 · 축복 +1%)
//   KT_PORT=8890 bash dev/runkt.sh dev/tests/phxgold.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'phxg' }); await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 40; });
  await p.evaluate(() => __T.TOWN.toZone(2)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 2 && __T.SCENE === 'field', null, { timeout: 60000 }); await p.waitForTimeout(1200);
  const killGold = () => p.evaluate(async () => { const T = __T, H = T.hero, f = T.foxes.find(x => !x.dead && !x.gone && T.MOB[x.kind] && !T.MOB[x.kind].boss && !x.fb); if (!f) return null;
    const S = T.MOB[f.kind], c0 = S.coin; S.coin = [1000, 1000]; f.i = f.fi = H.i + 1; f.j = f.fj = H.j; f.x = f.i + 0.5; f.z = f.j + 0.5; f.hp = 1; f.aggro = true; f.tgt = H; H.target = f; const g0 = T.coins;
    for (let k = 0; k < 60 && !f.dead; k++) await new Promise(r => setTimeout(r, 100)); S.coin = c0; return f.dead ? T.coins - g0 : -1; });
  const g0 = await killGold();
  await p.evaluate(() => __T.INV.add('gaho_phoenix', 1, true)); const v1 = await p.evaluate(() => __T.INV.gaho('gold')); const g1 = await killGold();
  await p.evaluate(() => { const e = __T.INV.bag().find(x => x.id === 'gaho_phoenix'); e.en = 8; e.blessed = true; }); const v2 = await p.evaluate(() => __T.INV.gaho('gold')); const g2 = await killGold();
  const info = await p.evaluate(() => { const e = __T.INV.bag().find(x => x.id === 'gaho_phoenix'); return __T.INV.tipOf(e); });
  console.log(JSON.stringify({ g0, v1, g1, v2, g2, info: info.split('\n').slice(0, 5) }));
  ok(g0 > 0, `가호 없이 골드 ${g0}`);
  ok(v1 === 1 && g1 === Math.round(g0 * 1.01), `+0 가호: 골드 획득 +1% (${g0} → ${g1})`);
  ok(v2 === 10 && g2 === Math.round(g0 * 1.10), `+8 축복 가호: +10% (${g0} → ${g2})`);
  ok(/용암·화산탄 피해 없음/.test(info) && /골드 획득 \+10%/.test(info), '정보: 용암 면역 + 골드 획득 +10%');
  ok(!errs.length, '오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
