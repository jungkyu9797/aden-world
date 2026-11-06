// 11/6 프로듀서: 전 클래스 최대 HP +30% (HP_MUL 1.3 · 레벨·체력·장비·가호·어드밴스 스피릿 모두 포함한 최종 값에 곱함)
//   ① 기사·요정·법사: 최대 HP = (기본 HP + 장비 HP + 체력 보너스) × 1.3 ② 어드밴스 스피릿 ×1.2도 그 위에 ③ 레벨 업하면 늘어난 만큼 × 1.3
//   ④ 혈맹 봇이 복사하는 HP(mine)도 새 최대 HP ⑤ 캐릭터 창 HP 표시 ⑥ 오류 없음
//   KT_PORT=8902 bash dev/runkt.sh dev/tests/hp130.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const errs = [];
  for (const cls of ['knight', 'elf', 'wizard']) { const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); p.on('pageerror', e => errs.push(cls + ': ' + e.message));
    await login(p, { cls, name: 'hp' + cls.slice(0, 3) });
    const r = await p.evaluate(() => { const T = __T, H = T.hero; T.INV.load({ bag: [], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); H.lv = 50; H.baseHP = 500; T.BUFF.advsp = 0; T.INV.render();
      const con = T.INV.stat().con, base = 500 + Math.max(0, con - 14), m1 = H.max;
      T.BUFF.advsp = 600; T.INV.render(); const m2 = H.max; T.BUFF.advsp = 0; T.INV.render();
      H.exp = 0; const b0 = H.baseHP; H.exp = 1e12; let L0 = H.lv; try { T.gainExp ? T.gainExp(0) : 0; } catch (e) {} const lvUp = H.lv > L0, dB = H.baseHP - b0; H.exp = 0; T.INV.render(); const m3 = H.max;
      const mine = window.__FB && __FB.mine ? __FB.mine() : null; document.getElementById('charwin').hidden = false; T.INV.render(); const cw = document.getElementById('charwin').textContent.replace(/\s+/g, ' ');
      return { con, base, m1, m2, lvUp, dB, m3, b3: H.baseHP, cp: mine && mine.cb && mine.cb.hp, cwHas: cw.includes(String(H.max)) }; });
    console.log(cls, JSON.stringify(r));
    ok(r.m1 === Math.round(r.base * 1.3), `① ${cls}: 최대 HP ${r.m1} = (기본 500 + 체력 보너스 ${r.base - 500}) × 1.3`);
    ok(r.m2 === Math.round(r.base * 1.3 * 1.2), `② ${cls}: 어드밴스 스피릿 ${r.m2} = × 1.3 × 1.2`);
    ok(!r.lvUp || r.m3 === Math.round((r.b3 + (r.base - 500)) * 1.3), `③ ${cls}: 레벨 업 뒤 최대 HP ${r.m3} = (기본 ${r.b3} + 체력) × 1.3${r.lvUp ? '' : ' (레벨 업 없음)'}`);
    ok(r.cp === r.m3, `④ ${cls}: 혈맹 봇이 복사하는 HP = 지금 최대 HP (${r.cp})`);
    ok(r.cwHas, `⑤ ${cls}: 캐릭터 창에 최대 HP ${r.m3} 표시`);
    if (cls === 'knight') await p.screenshot({ path: 'dev/out/hp130.png' }); await p.close(); }
  ok(!errs.length, '⑥ 오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
