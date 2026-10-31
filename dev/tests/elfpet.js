// 11/1 요정 펫: 1레벨부터 3마리 · 40레벨에도 3마리 (더 안 늘어남) · 다른 직업은 그대로 (1마리 · 40레벨부터 2마리) (KT_PORT=8796 bash dev/runkt.sh dev/tests/elfpet.js) — 스크린샷 dev/out/elfpet.png
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  for (const [cls, lv, want] of [['elf', 1, 3], ['elf', 45, 3], ['knight', 1, 1], ['knight', 40, 2], ['wizard', 52, 2]]) {
    const p = await b.newPage({ viewport: { width: 1100, height: 700 } }); p.on('pageerror', e => errs.push(cls + ': ' + e.message));
    await login(p, { cls, name: 'ep' + cls.slice(0, 2) + lv });
    const r = await p.evaluate(lv => { const T = __T; T.hero.lv = lv; T.GOD_INV = true; T.INV.load({ bag: Array.from({ length: 4 }, (_, k) => ({ id: 'pet_collar', n: 1, pet: Object.assign(T.mkPetData('doberman', 5), { name: '멍' + (k + 1) }) })), bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } });
      const L = T.INV.bag().filter(e => e.pet), res = L.map(e => T.PET.summon(e)); const out = T.INV.bag().filter(e => e.pet && e.pet.state === 'out').length; return { res, out, msg: (T.log.slice(-1)[0] || {}).t || '' }; }, lv);
    console.log(cls, lv, JSON.stringify(r));
    ok(`${cls} Lv${lv}: 펫 ${want}마리까지 (나온 펫 ${r.out})`, r.out === want && r.res.filter(Boolean).length === want);
    ok(`${cls} Lv${lv}: 넘으면 안내`, cls === 'elf' ? /요정은 펫을 3마리까지/.test(r.msg) : new RegExp(`펫을 ${want}마리까지`).test(r.msg));
    if (cls === 'elf' && lv === 1) { await p.evaluate(() => __T.TOWN.toZone(1)); await p.waitForTimeout(2500); const n = await p.evaluate(() => __T.PET.list().filter(q => !q.dead && !q.sum).length);
      ok('요정 Lv1: 사냥터에 펫 3마리가 따라옴 (' + n + ')', n === 3); await p.screenshot({ path: 'dev/out/elfpet.png', clip: { x: 350, y: 150, width: 400, height: 400 } }); }
    await p.close(); }
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
