// 11/3 봇끼리 전투는 전체 알림 안 함 · 유저가 끼면 알림 · 예전 판 호스트가 보낸 봇끼리 알림도 안 띄움
//   KT_PORT=8894 bash dev/runkt.sh dev/tests/fbalert.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
const REF = { lv: 61, fb: { lv: 61, c: 'knight', hp: 778, ac: -127, mr: 85, d: 60, hb: 0.05, cr: 0.12, cp: 11114 } };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 700 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'fbaA' }); await p.evaluate(() => { __T.hero.lv = 61; __T.GOD_INV = true; __T.BUFF.invis = 99999; });
  await p.evaluate(() => __T.TOWN.toZone(23)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 23 && __T.SCENE === 'field', null, { timeout: 60000 }); await p.waitForTimeout(2500);
  await p.evaluate(R => { const F = __FB, H = __T.hero; F.setRef(R); F.DBG.noEnsure = true; for (const f of F.bots()) f.gone = true; const Ro = F.roster();
    window.__P = [F.spawnTest(Ro.A.find(x => x.cls === 'knight').uid, H.i + 6, H.j), F.spawnTest(Ro.B.find(x => x.cls === 'knight').uid, H.i + 7, H.j)]; }, REF);
  await p.waitForTimeout(7000);
  const r1 = await p.evaluate(() => ({ fight: window.__P.some(f => f.hp < f.max) || window.__P.some(f => f.dead), al: __FB.stat().alerts.filter(t => /전투 중/.test(t)).length, log: __T.log.filter(l => /전투 중입니다/.test(l.t)).length }));
  console.log('①', JSON.stringify(r1)); ok(r1.fight, '① 반왕 봇과 라인 봇이 실제로 싸움'); ok(r1.al === 0 && r1.log === 0, '① 봇끼리 싸울 때는 전체 알림 없음');
  await p.evaluate(() => { const F = __FB, H = __T.hero; __T.BUFF.invis = 0; for (const f of window.__P) if (f) f.gone = true; window.__L = F.spawnTest(F.roster().B.find(x => x.cls === 'wizard').uid, H.i + 1, H.j + 1); }); await p.waitForTimeout(8000);
  const r2 = await p.evaluate(() => ({ tgt: !!(window.__L && window.__L.bx && window.__L.bx.tgt === __T.hero), inv: __T.BUFF.invis, al: __FB.stat().alerts.filter(t => /전투 중/.test(t)), log: __T.log.filter(l => /\[전체\].*전투 중입니다/.test(l.t)).map(l => l.t) }));
  console.log('②', JSON.stringify(r2)); ok(r2.al.length === 1 && /fbaA/.test(r2.al[0]) && r2.log.length === 1, '② 유저가 라인 봇과 싸우면 알림은 그대로');
  const r3 = await p.evaluate(() => { const F = __FB, R = F.roster(), a = R.A[0].name, z = R.B[0].name, n0 = __T.log.length;
    F.onAlert(`화룡의 둥지 2구역에서 [반왕 혈맹] ${a}가 [라인 혈맹] ${z}와 전투 중입니다`, 'fb:91'); const n1 = __T.log.length;
    F.onAlert(`화룡의 둥지 2구역에서 [반왕 혈맹] 친구이름이 [라인 혈맹] ${z}와 전투 중입니다`, 'fb:92'); return { bots: n1 - n0, user: __T.log.length - n1 }; });
  console.log('③', JSON.stringify(r3)); ok(r3.bots === 0 && r3.user === 1, '③ 다른 PC(예전 판)가 보낸 봇끼리 알림은 안 띄우고, 유저가 낀 알림은 띄움');
  console.log(errs.slice(0, 3).join('\n') || 'no errors'); ok(!errs.length, '오류 없음'); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
