// 11/1 속성: 같은 속성 상대로도 피해가 줄지 않음 · 약점(반대 속성)에만 추가 피해 (KT_PORT=8799 bash dev/runkt.sh dev/tests/elnoloss.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  const p = await b.newPage({ viewport: { width: 1000, height: 700 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'elK' });
  const u = await p.evaluate(() => { const T = __T, M = T.MOB, f = { kind: 'dr_fire' }, w = { kind: 'dr_water' }, n = { kind: Object.keys(M).find(k => !M[k].el && !M[k].boss && !M[k].dummy) };
    return { af: T.attrMult('fire', f), aw: T.attrMult('fire', w), an: T.attrMult('fire', n), df: T.dreamElMul(M.dr_fire, 'fire'), dw: T.dreamElMul(M.dr_water, 'fire'), de: T.dreamElMul(M.dr_earth, 'fire') }; });
  console.log(JSON.stringify(u));
  ok('무기 속성: 같은 속성 1 · 약점 2 · 무속성 1', u.af === 1 && u.aw === 2 && u.an === 1);
  ok('몽환의 섬 정령: 같은 속성 ×1 · 반대 ×1.3 · 다른 속성 ×1', u.df === 1 && u.dw === 1.3 && u.de === 1);
  // 실제 한 방: 불 3단 검 · 같은 몹의 속성만 바꿔 가며 (난수 고정)
  await p.evaluate(() => { const T = __T; T.hero.lv = 60; T.INV.load({ bag: [{ id: 'lg_sword', n: 1, en: 0, on: 'weapon', attr: { el: 'fire', lv: 3 } }], bonus: { str: 20, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); });
  await p.evaluate(() => __T.TOWN.toZone(2)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 2 && __T.SCENE === 'field', null, { timeout: 20000 }); await p.waitForTimeout(1500);
  const hit = (el, how) => p.evaluate(([el, how]) => { const T = __T, f = T.foxes.find(m => !m.dead && !m.gone && !(T.MOB[m.kind] || {}).boss); const S = T.MOB[f.kind], o = S.el; if (el) S.el = el; else delete S.el; f.hp = f.max = 1e6; const R0 = Math.random; let d = 0;
      try { Math.random = () => 0.3; if (how === 'magic') T.spellHit(f, 'coc'); else T.strike(f); } finally { Math.random = R0; if (o) S.el = o; else delete S.el; } d = 1e6 - f.hp; return d; }, [el, how]);
  const w = { none: await hit(null), same: await hit('fire'), weak: await hit('water') }; console.log('weapon', JSON.stringify(w));
  ok('불 3단 검: 불 몹 = 무속성 몹 (안 줄어듦)', w.same === w.none && w.none > 0); ok('불 3단 검: 물 몹은 추가 피해', w.weak > w.none);
  const m = { none: await hit(null, 'magic'), same: await hit('water', 'magic'), weak: await hit('fire', 'magic') }; console.log('coc', JSON.stringify(m));
  ok('콘 오브 콜드: 물 몹 = 무속성 몹 (안 줄어듦)', m.same === m.none && m.none > 0); ok('콘 오브 콜드: 불 몹은 ×1.5', m.weak > m.none);
  const tip = await p.evaluate(() => __T.INV.tipOf(__T.INV.bag().find(e => e.attr))); ok('툴팁: "불 몬스터 0" 문구 없음', !/몬스터 0/.test(tip) && /물 몬스터 2배/.test(tip));
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
