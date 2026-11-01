// 11/1 전설 축복: 전설 장비 축복 부여 1% · 전설 무기 3단까지 (단마다 공격 속도 +1% · 추가 타격·SP 대신) · 일반 장비는 그대로 20% (KT_PORT=8798 bash dev/runkt.sh dev/tests/legbless.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'lbT' });
  const run = (id, rnd, n) => p.evaluate(([id, rnd, n]) => { const T = __T, I = T.INV; const t = I.bag().find(e => e.id === id); const out = [];
    for (let k = 0; k < n; k++) { const before = I.count('bless_scroll'); I.use(I.bag().find(e => e.id === 'bless_scroll')); const R0 = Math.random; Math.random = () => rnd; try { I.applyScroll(t); } finally { Math.random = R0; }
      out.push({ bl: !!t.blessed, sp: t.blessSp || 0, used: before - I.count('bless_scroll'), spd: I.cx('atkSpd'), hit: I.blessHit(), msg: (T.log.slice(-1)[0] || {}).t || '' }); } return out; }, [id, rnd, n]);
  await p.evaluate(() => __T.INV.load({ bag: [{ id: 'lg_sword', n: 1, on: 'weapon' }, { id: 'bless_scroll', n: 20 }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }));
  const s0 = await p.evaluate(() => __T.INV.cx('atkSpd'));
  const f1 = await run('lg_sword', 0.5, 1); console.log('fail', JSON.stringify(f1)); ok('전설 무기: 1% 실패면 그대로 (주문서는 씀)', !f1[0].bl && f1[0].used === 1 && /성공 확률 1%/.test(f1[0].msg));
  const f2 = await run('lg_sword', 0.02, 1); ok('전설 무기: 2%는 실패 (성공 확률 1%)', !f2[0].bl);
  const ok3 = await run('lg_sword', 0.001, 4); console.log('ok', JSON.stringify(ok3));
  ok('1단: 축복 · 공격 속도 +1% · 추가 타격 없음', ok3[0].bl && ok3[0].sp === 1 && ok3[0].spd === s0 + 1 && !ok3[0].hit && /축복 1단 · 공격 속도 \+1%/.test(ok3[0].msg));
  ok('2단 +2% · 3단 +3%', ok3[1].sp === 2 && ok3[1].spd === s0 + 2 && ok3[2].sp === 3 && ok3[2].spd === s0 + 3);
  ok('3단 뒤에는 최대 · 주문서 안 씀', ok3[3].sp === 3 && ok3[3].used === 0 && /3단\(최대\)/.test(ok3[3].msg));
  const tip = await p.evaluate(() => __T.INV.tipOf(__T.INV.bag().find(e => e.id === 'lg_sword'))); ok('툴팁: "축복 3단: 공격 속도 +3%"', /축복 3단: 공격 속도 \+3%/.test(tip));
  // 일반 무기는 예전 그대로 (20% · 추가 타격)
  const nid = await p.evaluate(() => Object.keys(__T.ITEMS).find(k => { const d = __T.ITEMS[k]; return d.slot === 'weapon' && d.rar !== '전설' && d.wtype !== 'staff' && d.wtype !== 'bow' && !d.hidden && d.cls !== 'wizard'; }));
  await p.evaluate(nid => __T.INV.load({ bag: [{ id: nid, n: 1, on: 'weapon' }, { id: 'bless_scroll', n: 5 }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }), nid);
  const n1 = await run(nid, 0.15, 1); console.log('normal', nid, JSON.stringify(n1)); ok('일반 무기: 15%면 성공(20% 그대로) · 추가 타격 · 공속 변화 없음', n1[0].bl && n1[0].hit && n1[0].spd === s0);
  // 전설 지팡이: SP 안 늘고 공속
  await p.evaluate(() => { __T.setCls_ && 0; __T.INV.load({ bag: [{ id: 'lg_staff', n: 1, on: 'weapon' }, { id: 'bless_scroll', n: 5 }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); });
  const sp0 = await p.evaluate(() => __T.INV.sp()); const st = await run('lg_staff', 0.001, 1); const sp1 = await p.evaluate(() => __T.INV.sp());
  ok('전설 지팡이: 축복해도 SP 그대로 · 공격 속도 +1%', st[0].bl && sp1 === sp0 && st[0].spd === s0 + 1);
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
