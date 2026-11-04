// 11/4 프로듀서: 마을로 돌아오면 쓰러진 펫과 혈맹 파티 봇이 저절로 되살아남 (HP 가득 · 부활 주문서 안 씀) · 사냥터에서는 그대로 쓰러져 있음
//   KT_PORT=8896 bash dev/runkt.sh dev/tests/townrev.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 680 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'trv' });
  await p.evaluate(() => { const T = __T; T.GOD_INV = true; document.getElementById('gp-lv').value = 61; document.getElementById('gp-apply').click(); T.GOD_INV = true; });
  await p.evaluate(() => __T.TOWN.toZone(2)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 2 && __T.SCENE === 'field', null, { timeout: 60000 }); await p.waitForTimeout(1500);
  const r1 = await p.evaluate(async () => { const T = __T, F = __FB, w = ms => new Promise(r => setTimeout(r, ms));
    const e = { id: 'pet_collar', n: 1, pet: Object.assign(T.mkPetData('doberman', 40), { name: '바둑' }) }; T.INV.bag().push(e); T.PET.summon(e); await w(400);
    F.setRef && F.setRef({ copy: F.mine() }); const x = F.roster().A.find(q => !q.pt && !F.pb.why(q.uid)); const inv = x ? F.pb.invite(x.uid) : null; await w(800);
    const pe = T.PETS_HERE_()[0], be = F.pb.here()[0]; if (!pe || !be) return { err: 'no pet/bot', pe: !!pe, be: !!be, inv };
    pe.d.hp = 0; T.PET.hurt(pe, 999999, null); be.hp = 1; F.pbNetHurt ? 0 : 0; be.dead = true; be.deadAt = Date.now(); be.hp = 0; be.deadT = 0; await w(1500);
    return { petDead: pe.d.state === 'dead' && pe.dead, botDead: be.dead, scrolls: T.INV.count('revive_scroll'), name: be.bot.name }; });
  console.log('①', JSON.stringify(r1)); ok(r1.petDead && r1.botDead, '① 사냥터에서 쓰러진 펫·파티 봇은 그대로 쓰러져 있음');
  await p.evaluate(() => { __T.log.length = 0; __T.TOWN.goTown(); }); await p.waitForFunction(() => __T.SCENE === 'town', null, { timeout: 30000 }); await p.waitForTimeout(2500);
  const r2 = await p.evaluate(() => { const T = __T, F = __FB, e = T.INV.bag().find(x => x.pet && x.pet.name === '바둑'), pe = T.PETS_HERE_().find(q => q.d === e.pet), be = F.pb.here()[0];
    return { st: e.pet.state, hp: e.pet.hp, mx: T.PET.mxh(e.pet), ent: !!pe && !pe.dead, bot: be ? { dead: be.dead, hp: be.hp, max: be.max } : null, msg: T.log.map(l => l.t).filter(t => /마을에 돌아와서/.test(t)), scrolls: T.INV.count('revive_scroll') }; });
  console.log('②', JSON.stringify(r2));
  ok(r2.st === 'out' && r2.ent && r2.hp === r2.mx, `② 마을에 오면 쓰러진 펫이 되살아남 · HP 가득 (${r2.hp}/${r2.mx})`);
  ok(r2.bot && !r2.bot.dead && r2.bot.hp === r2.bot.max, `② 쓰러진 파티 봇도 되살아남 · HP 가득`);
  ok(r2.msg.length === 2 && r2.scrolls === r1.scrolls, `② 안내 2줄 · 부활 주문서는 안 씀 (${r2.msg.join(' / ')})`);
  ok(!errs.length, '오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
