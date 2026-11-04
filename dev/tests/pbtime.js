// 11/4 프로듀서: 혈맹 파티 시간은 봇마다 초대한 때부터 4시간 · 파티창 봇 이름 옆에 각자 남은 시간
//   KT_PORT=8897 bash dev/runkt.sh dev/tests/pbtime.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 680 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'pbt' }); await p.evaluate(() => { document.getElementById('gp-lv').value = 61; document.getElementById('gp-apply').click(); __T.GOD_INV = true; });
  await p.evaluate(() => __T.TOWN.toZone(2)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 2 && __T.SCENE === 'field', null, { timeout: 60000 }); await p.waitForTimeout(1200);
  const r = await p.evaluate(async () => { const T = __T, F = __FB, w = ms => new Promise(r => setTimeout(r, ms)); F.setRef && F.setRef({ copy: F.mine() });
    const free = () => F.roster().A.filter(q => !q.pt && !F.pb.why(q.uid) && !F.pb.S.m.some(m => m.uid === q.uid));
    const a = free()[0]; F.pb.invite(a.uid); F.DBG.toff = 3600e3; const bb = free()[0]; F.pb.invite(bb.uid); F.sim(0.1); await w(1500);
    const tl = [...document.querySelectorAll('#partybox .pbot .pb-tl')].map(x => x.textContent), head = (document.querySelector('#partybox .pb-h small') || {}).textContent;
    const dump = JSON.parse(JSON.stringify(F.pbDump())); F.pbLoad(dump); const at2 = F.pb.S.m.map(m => m.at), at1 = dump.m.map(r => r[2]);
    T.log.length = 0; F.DBG.toff = 4 * 3600e3 + 5e3; F.sim(0.1); await w(300); const left = F.pb.S.m.map(m => m.uid), msg = T.log.map(l => l.t).filter(t => /함께한 4시간이 지나서 귀환/.test(t)), tl2 = [...document.querySelectorAll('#partybox .pbot .pb-tl')].map(x => x.textContent);
    F.DBG.toff = 5 * 3600e3 + 5e3; F.sim(0.1); const n3 = F.pb.S.m.length; F.DBG.toff = 0;
    return { a: a.uid, b: bb.uid, tl, head, same: JSON.stringify(at1) === JSON.stringify(at2), left, msg, tl2, n3, why: F.pb.why(a.uid) }; });
  console.log(JSON.stringify(r));
  ok(r.tl.length === 2 && /^3:(59|60|00)|^2:59|^3:00/.test(r.tl[0]) && /^4:00|^3:59/.test(r.tl[1]), `① 봇 이름 옆에 각자 남은 시간 (먼저 초대 ${r.tl[0]} · 1시간 뒤 초대 ${r.tl[1]})`);
  ok(!/남음/.test(r.head || ''), `① 위쪽 제목에는 인원만 ("${r.head}")`);
  ok(r.same, '② 저장 → 다시 불러와도 봇마다 초대 시각 그대로');
  ok(r.left.length === 1 && r.left[0] === r.b && r.msg.length === 1, `③ 먼저 초대한 봇만 4시간 뒤 귀환 · 나중 봇은 남음 (${r.msg[0] || ''})`);
  ok(r.tl2.length === 1 && /^1:00|^0:59|^59분|^1:0/.test(r.tl2[0]), `③ 남은 봇 시간 (${r.tl2[0]})`);
  ok(r.n3 === 0 && /분 뒤 초대/.test(r.why), '④ 나중 봇도 자기 4시간이 지나면 귀환 · 30분 뒤 다시 초대');
  ok(!errs.length, '오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
