// 11/3 봇끼리 파티가 2시간 구간마다 바뀜 (모든 PC 같은 결과 · 구간 안에서는 그대로)
//   KT_PORT=8899 bash dev/runkt.sh dev/tests/ptshuffle.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await login(p, { cls: 'knight', name: 'pts' });
  const r = await p.evaluate(() => { const F = __FB, d0 = Date.now, sig = () => F.parties().map(q => q.id + ':' + q.uids.join(',')).join(' | '), names = () => F.parties().map(q => q.id + ' ' + q.uids.map(u => F.roster().by.get(u).name).join('·'));
    const a = sig(), an = names(), a2 = sig(); const base = d0(); Date.now = () => base + 7200e3; const b = sig(), bn = names(); Date.now = () => base + 14400e3; const c = sig(); Date.now = d0; const back = sig();
    const pt = F.roster().all.filter(x => x.pt).length; return { same: a === a2, diff: a !== b && b !== c, back: back === a, an, bn, pt, sizes: F.parties().map(q => q.uids.length) }; });
  console.log(JSON.stringify(r)); ok(r.same, '같은 2시간 구간 안에서는 파티 그대로'); ok(r.diff, '2시간 뒤·4시간 뒤 파티 구성이 바뀜'); ok(r.back, '시간을 되돌리면 원래 구성 (씨앗 = 구간 → 모든 PC 같은 결과)'); ok(r.sizes.join() === '3,3,4,3' && r.pt === 13, `파티 크기 그대로 (반왕 3·3 · 라인 4·3 = ${r.pt}명)`);
  console.log(errs.slice(0, 3).join('\n') || 'no errors'); ok(!errs.length, '오류 없음'); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
