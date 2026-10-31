// 할로윈 이벤트 몹(호박괴물·호박대장)은 낮은 레벨 경험치 감소 없음 · 다른 몹은 그대로 (KT_PORT=8796 bash dev/runkt.sh dev/tests/hwexp.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'hxKN' });
  await p.evaluate(() => { const T = __T; T.GOD_INV = true; T.DN_ && T.DN_.set(0); T.TOWN.toZone(8); }); await p.waitForTimeout(1500);
  const kill = (kind, lv) => p.evaluate(([kind, lv]) => { const T = __T, H = T.hero, S = T.MOB[kind]; H.lv = lv; let m = null; for (let d = 3; d < 12 && !m; d++) m = T.mkMob(kind, H.i + d, H.j + 2); T.foxes.push(m); const x0 = H.exp, n0 = T.log.length; m.dmgBy = new Map([[H, 10]]); m.hp = 0; T.killCheck(m); return { got: H.exp - x0, base: S.exp, lv: S.lv, msg: T.log.slice(n0).map(x => x.t || x).filter(t => /경험치/.test(t)).join(' / ') }; }, [kind, lv]);
  const a = await kill('hw_pumpkin', 64), bb = await kill('hw_pumpkin_boss', 64), c = await kill('dv_lizard', 64); console.log(JSON.stringify({ a, bb, c }));
  ok('Lv64: 호박괴물(Lv52) 경험치 감소 없음 (' + a.got + ' / ' + a.base + ')', a.got === a.base && !/낮은 레벨/.test(a.msg));
  ok('Lv64: 호박대장(Lv54) 경험치 감소 없음 (' + bb.got + ' / ' + bb.base + ')', bb.got === bb.base && !/낮은 레벨/.test(bb.msg));
  ok('다른 낮은 몹은 그대로 감소 (' + c.got + ' / ' + c.base + ' · Lv' + c.lv + ')', c.lv <= 58 ? c.got < c.base && /낮은 레벨/.test(c.msg) : true);
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
