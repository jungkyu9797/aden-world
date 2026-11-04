// 11/4 봇 레벨 (프로듀서): 1위보다 최대 -5렙 · 맞는 사냥터(±6)가 다 차면 레벨이 가까운 다른 사냥터로 (마을 정비는 10% 정도만)
//   KT_PORT=8884 bash dev/runkt.sh dev/tests/botlv.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await login(p, { cls: 'knight', name: 'blv' });
  for (const lv of [55, 61, 65, 70]) { for (const T0 of [1762240000000, 1762250000000, 1762260000000]) {
    const r = await p.evaluate(([lv, T0]) => { const t = __FB.table(lv, T0), rest = t.find(x => x.zone === '마을 정비'), all = t.reduce((s, x) => s + x.ban + x.lin, 0), C = __FB.cfg();
      const lvs = t.filter(x => x.lv !== '-').map(x => x.lv.split('~').map(Number)), mn = Math.min(...lvs.map(x => x[0]));
      return { all, rest: rest.ban + rest.lin, over: t.filter(x => x.zone !== '마을 정비' && x.ban + x.lin > C.CAP).length, mn, rows: t.map(x => `${x.zone} ${x.ban}+${x.lin}`).join(' / ') }; }, [lv, T0]);
    if (T0 === 1762240000000) console.log(`기준 Lv.${lv}: ${r.rows}`);
    ok(r.mn >= lv - 5, `기준 Lv.${lv}: 봇 레벨 최저 Lv.${r.mn} ≥ ${lv - 5}`);
    ok(r.rest <= Math.ceil(r.all * 0.2), `기준 Lv.${lv}: 마을 정비 ${r.rest}/${r.all}명 (20% 이하)`);
    ok(!r.over, `기준 Lv.${lv}: 사냥터마다 8명 이하`); } }
  ok(!errs.length, '오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
