// 할로윈 피해: 첫 타 = 1 + 모자 강화(몬스터마다 내가 처음 때릴 때 한 번) · 나머지 1 고정 · 기사 ×1.25 안 붙음 · 같은 호박밭에 다른 유저가 있어 내가 손님이어도 같음 (KT_PORT=8797 bash dev/runkt.sh dev/tests/hwdmg.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  for (const cls of ['knight', 'elf']) { const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(cls + ': ' + e.message)); const C = cls === 'knight' ? '기사' : '요정';
    await login(p, { cls, name: 'hd' + cls.slice(0, 2) });
    await p.evaluate(() => { __T.INV.load({ bag: [{ id: 'hw_hat', n: 1, en: 5 }, { id: 'red_potion', n: 20 }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); __T.GOD_INV = true; });
    await p.evaluate(() => document.getElementById('hw-enter').click()); await p.waitForFunction(() => __T.SCENE === 'field' && __T.ISLE && __T.ISLE.id === 21, null, { timeout: 20000 }); await p.waitForTimeout(1200);
    const hits = guest => p.evaluate(guest => { const T = __T, N = T.NET, g0 = N.guestMob, h0 = N.hit; const f = T.foxes.find(q => q.kind === 'hw_pumpkin' && !q.dead && !q.gone && !q.hwMe && !(q.dmgBy && q.dmgBy.size)); if (!f) return null; f.hp = f.max;
      if (guest) { N.guestMob = q => q === f; N.hit = () => {}; } const out = []; try { for (let i = 0; i < 4; i++) { const h = f.hp; T.strike(f); out.push(h - f.hp); } } finally { N.guestMob = g0; N.hit = h0; } return { max: f.max, out }; }, guest);
    const a = await hits(false), g = await hits(true); console.log(cls, JSON.stringify({ a, g }));
    ok(C + ': 첫 타 1+모자 강화(+5) = 6 · 나머지 1 (×1.25 없음)', a && a.out.join(',') === '6,1,1,1');
    ok(C + ': 내가 손님이어도 첫 타만 6 · 나머지 1', g && g.out.join(',') === '6,1,1,1');
    await p.close(); }
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
