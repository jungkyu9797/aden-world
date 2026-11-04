// 11/4: 사람 파티원이 아무도 없는데 남아 있던 파티 번호 때문에 혈맹 봇이 전부 '사람 파티 중'으로 막히던 것
//   KT_PORT=8897 bash dev/runkt.sh dev/tests/ptstale.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 680 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'pst' }); await p.evaluate(() => { document.getElementById('gp-lv').value = 61; document.getElementById('gp-apply').click(); __T.GOD_INV = true; });
  const r = await p.evaluate(async () => { const T = __T, F = __FB, N = T.NET || window.NET, w = ms => new Promise(r => setTimeout(r, ms));
    const net = N || null; if (!net) return { err: 'no NET' };
    F.setRef && F.setRef({ copy: F.mine() }); const x = F.roster().A.find(q => !q.pt);
    net.setParty('Pstale1'); const inGrace = net.inParty(), whyGrace = F.pb.why(x.uid);
    const realNow = Date.now; Date.now = () => realNow() + 25000;   /* 파티원 기다리는 20초가 지났다고 침 */
    let after, whyAfter, inv, pid; try { after = net.inParty(); whyAfter = F.pb.why(x.uid); inv = F.pb.invite(x.uid); pid = net.partyId(); } finally { Date.now = realNow; }
    return { inGrace, whyGrace, after, whyAfter, inv, pid, n: F.pb.S.m.length }; });
  console.log(JSON.stringify(r));
  ok(r.inGrace && r.whyGrace === '사람 파티 중', '① 파티에 막 들어온 20초 동안은 사람 파티로 봄 (파티원이 아직 안 보일 수 있어서)');
  ok(!r.after && r.whyAfter === '', `② 파티원이 아무도 없으면 사람 파티가 아님 → 봇 초대 가능 ("${r.whyAfter}")`);
  ok(r.inv && r.n === 1 && !r.pid, '② 봇 초대 성공 · 남아 있던 파티 번호는 지움');
  ok(!errs.length, '오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
