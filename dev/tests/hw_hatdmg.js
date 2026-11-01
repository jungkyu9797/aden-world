// 11/1 할로윈: 호박에게 주는 피해 = 한 대마다 모자 강화 수치 (+5 모자 → 매번 5 · +0 → 1) (KT_PORT=8796 bash dev/runkt.sh dev/tests/hw_hatdmg.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'hwD' });
  for (const en of [0, 5, 9]) {
    await p.evaluate(en => { const T = __T; T.GOD_INV = true; T.INV.load({ bag: [{ id: 'hw_hat', n: 1, en }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); if (!T.ISLE || T.ISLE.id !== 21) T.TOWN.toZone(21); }, en);
    await p.waitForTimeout(2500);
    const r = await p.evaluate(() => { const T = __T, H = T.hero, f = T.foxes.filter(x => !x.dead && !x.gone && T.MOB[x.kind] && T.MOB[x.kind].hwEv).sort((a, b) => Math.hypot(a.x - H.x, a.z - H.z) - Math.hypot(b.x - H.x, b.z - H.z))[0]; if (!f) return null;
      f.hp = f.max = 1000; const d = []; for (let k = 0; k < 4; k++) { const h0 = f.hp; T.strike(f); d.push(h0 - f.hp); } f.hp = f.max; return { hat: T.INV.hwHat(), d, kind: f.kind, hw: T.ISLE && T.ISLE.id }; });
    console.log(en, JSON.stringify(r)); const want = Math.max(1, en);
    ok(`+${en} 모자: 호박에게 한 대마다 ${want} (4대 모두)`, !!r && r.d.length === 4 && r.d.every(x => x === want)); }
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
