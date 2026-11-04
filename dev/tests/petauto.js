// 11/4 프로듀서: 데리고 다니던 펫은 다시 접속하면 저절로 나옴 (보관해 둔 펫·쓰러진 펫은 그대로)
//   KT_PORT=8896 bash dev/runkt.sh dev/tests/petauto.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1100, height: 680 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const acc = 'pa' + Date.now() % 1e6; await login(p, { acc, cls: 'knight', name: 'pat' });
  const r1 = await p.evaluate(async () => { const T = __T, w = ms => new Promise(r => setTimeout(r, ms)); T.hero.lv = 45;
    const mk = n => { const e = { id: 'pet_collar', n: 1, pet: Object.assign(T.mkPetData('doberman', 30), { name: n }) }; T.INV.bag().push(e); return e; };
    const a = mk('바둑'), s = mk('보관멍'), c = mk('누렁'); T.PET.summon(a); T.PET.summon(c); T.PET.store(c); await w(300);
    const dump = T.INV.dump(), pa = dump.bag.find(x => x.pet && x.pet.name === '바둑').pet, ps = dump.bag.find(x => x.pet && x.pet.name === '보관멍').pet, pc = dump.bag.find(x => x.pet && x.pet.name === '누렁').pet;
    try { await T.SAVE.now(true, true); } catch (e) {} await w(500); return { a: [pa.state, pa.auto], s: [ps.state, ps.auto || 0], c: [pc.state, pc.auto || 0] }; });
  console.log('①', JSON.stringify(r1)); ok(r1.a[0] === 'stored' && r1.a[1] === 1 && !r1.s[1] && !r1.c[1], '① 저장: 데리고 다니던 펫만 다시 나올 표시 (보관한 펫은 표시 없음)');
  // ② 다시 접속 (새로 불러오기 → 같은 계정 로그인)
  await p.reload(); await p.waitForSelector('#lg-acc', { state: 'visible' }); await p.fill('#lg-acc', acc); await p.fill('#lg-pw', 'abcd'); await p.click('#lg-go');
  await p.waitForSelector('.cs-card[data-cls="knight"]', { state: 'visible', timeout: 30000 }); await p.click('.cs-card[data-cls="knight"]'); await p.click('#cs-start');
  await p.waitForFunction(() => window.__gameOn && window.__T && __T.SCENE === 'town', null, { timeout: 30000 }); await p.waitForTimeout(2500);
  const r2 = await p.evaluate(() => { const T = __T, st = n => { const e = T.INV.bag().find(x => x.pet && x.pet.name === n); return e ? e.pet.state : 'none'; }; return { a: st('바둑'), s: st('보관멍'), c: st('누렁'), here: T.PETS_HERE_().map(q => q.d.name), msg: T.log.map(l => l.t).filter(t => /나타났습니다/.test(t)) }; });
  console.log('②', JSON.stringify(r2));
  ok(r2.a === 'out' && r2.here.includes('바둑'), '② 다시 접속하면 데리고 다니던 펫이 저절로 나옴');
  ok(r2.s === 'stored' && r2.c === 'stored' && !r2.here.includes('보관멍') && !r2.here.includes('누렁'), '② 보관해 둔 펫은 그대로 보관');
  ok(r2.msg.length === 1, `② 안내 한 줄 (${r2.msg.join(' / ')})`);
  ok(!errs.length, '오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
