// 11/7 프로듀서: 파우스트의 악령 드랍 — 갑옷·무기 마법 주문서 → 축복받은 갑옷·무기 마법 주문서 (확률 그대로)
//   ① 악령 3000마리(1층·2층 종류)를 쓰러뜨려 드랍 비율: 진주 약 10% · 축복받은 갑옷 약 5.7% · 축복받은 무기 약 5.1% · 일반 갑옷·무기 주문서 0
//   ② 산적은 그대로 (일반 갑옷·무기 마법 주문서 · 합 12%) ③ 오류 없음
//   KT_PORT=8910 bash dev/runkt.sh dev/tests/ghostdrop.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 680 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'gdrop' }); await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 60; });
  await p.evaluate(() => __T.TOWN.toZone(26)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 26 && __T.SCENE === 'field', null, { timeout: 60000 }); await p.waitForTimeout(1500);
  const run = (kinds, N) => p.evaluate(([kinds, N]) => { const T = __T, H = T.hero, G = T.GROUND, d0 = G.drop, c = {}; let n = 0;
    G.drop = (id) => { const nm = T.ITEMS[id] ? T.ITEMS[id].name : id; c[nm] = (c[nm] || 0) + 1; };   // 바닥에 실제로 놓지 않고 세기만
    try { for (let k = 0; k < N; k++) { const kind = kinds[k % kinds.length]; let m = null; for (let d = 2; d < 12 && !m; d++) m = T.mkMob(kind, H.i + d, H.j + (k % 3)); if (!m) continue; m.summoned = false; T.foxes.push(m); m.dmgBy = new Map([[H, m.max]]); m.hp = 0; T.killCheck(m); n++; m.gone = true; m.gpRise = false; } }
    finally { G.drop = d0; }
    T.foxes.splice(0, T.foxes.length, ...T.foxes.filter(f => !f.gone)); return { n, c }; }, [kinds, N]);
  const g = await run(['gp_ghost', 'gp_ghost2'], 3000); console.log('ghost', JSON.stringify(g));
  const pc = k => (g.c[k] || 0) / g.n * 100;
  ok(Math.abs(pc('드래곤의 진주(3단 가속)') - 10) < 1.8 && Math.abs(pc('축복받은 갑옷 마법 주문서') - 5.7) < 1.4 && Math.abs(pc('축복받은 무기 마법 주문서') - 5.1) < 1.4 && !g.c['갑옷 마법 주문서'] && !g.c['무기 마법 주문서'],
    `① 악령 ${g.n}마리: 진주 ${pc('드래곤의 진주(3단 가속)').toFixed(1)}% · 축복받은 갑옷 ${pc('축복받은 갑옷 마법 주문서').toFixed(1)}% · 축복받은 무기 ${pc('축복받은 무기 마법 주문서').toFixed(1)}% · 일반 주문서 ${(g.c['갑옷 마법 주문서'] || 0) + (g.c['무기 마법 주문서'] || 0)}`);
  const s = await run(['gp_bandit', 'gp_archer2'], 2000); console.log('bandit', JSON.stringify(s));
  const ps = k => (s.c[k] || 0) / s.n * 100;
  ok(Math.abs(ps('갑옷 마법 주문서') + ps('무기 마법 주문서') - 12) < 2 && !s.c['축복받은 갑옷 마법 주문서'] && !s.c['드래곤의 진주(3단 가속)'], `② 산적 ${s.n}마리: 일반 갑옷·무기 주문서 합 ${(ps('갑옷 마법 주문서') + ps('무기 마법 주문서')).toFixed(1)}% (그대로)`);
  ok(!errs.length, '③ 오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
