// 마법사: 모든 마법 재사용 대기 +1초 · 그레이터 힐 4초 (요정·기사 그대로) (KT_PORT=8784 bash dev/runkt.sh dev/tests/wizcd.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  const cds = async cls => { const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(cls + ': ' + e.message)); await login(p, { cls, name: 'cd' + cls.slice(0, 2) });
    const r = await p.evaluate(() => { const T = __T, o = {}; for (const id in T.SK) if (T.SK[id].kind === 'magic' && !T.SK[id].hidden) o[id] = T.SK[id].cd; return o; });
    let cast = null; if (cls === 'wizard') cast = await p.evaluate(() => { const T = __T; T.hero.lv = 60; T.LEARNED && T.LEARNED.add && T.LEARNED.add('gheal'); T.hero.mp = T.hero.maxmp = 500; T.castSkill('gheal'); return T.SKCD.gheal; });
    await p.close(); return { r, cast }; };
  const W = await cds('wizard'), E = await cds('elf'), K = await cds('knight'); E.r.summon = K.r.summon = 3;
  const rows = Object.keys(W.r).map(id => `${id} ${E.r[id]}→${W.r[id]}`); console.log(rows.join(' · ')); console.log('gheal cast SKCD', W.cast);
  ok('마법사: 그레이터 힐 4초', W.r.gheal === 4);
  ok('마법사: 나머지 모든 마법 +1초', Object.keys(W.r).filter(id => id !== 'gheal').every(id => Math.abs(W.r[id] - (E.r[id] + 1)) < 1e-9));
  ok('요정·기사는 그대로', Object.keys(E.r).every(id => E.r[id] === K.r[id]) && E.r.turnund === 3 && E.r.ebolt === 1.2);
  ok('턴 언데드 마법사 4초', W.r.turnund === 4);
  ok('실제로 쓸 때도 4초 (헤이스트 없음)', W.cast == null || Math.abs(W.cast - 4) < 0.6);
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
