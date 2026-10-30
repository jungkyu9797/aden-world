// 기준 캐릭터 장비로 화룡의 둥지 몹 명중·받는 피해 계산 (bash dev/runkt.sh dev/tests/ref_fn_hit.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await login(p, { cls: 'knight', name: 'rfH' });
  const eq = await p.evaluate(() => { const T = __T, I = T.ITEMS, by = n => { const L = Object.entries(I).filter(([, d]) => d.name === n); return L.length ? L[0][0] : null; };
    const want = [['커츠의 투구', 'helm', 5, 0], ['용의 목걸이', 'amulet', 5, 0], ['거대 여왕개미의 금빛 날개', 'cloak', 5, 0], ['데스나이트의 갑옷', 'armor', 5, 1], ['커츠의 티셔츠', 'shirt', 5, 1], ['반역자의 방패', 'shield', 5, 1], ['오우거의 장갑', 'gloves', 5, 1], ['데스나이트의 장화', 'boots', 5, 1], ['군주의 반지', 'ring1', 2, 1], ['군주의 반지', 'ring2', 2, 1], ['지배자의 벨트', 'belt', 0, 1], ['커츠의 검', 'weapon', 7, 1], ['케르베로스 인형', 'doll', 0, 0]];
    const bag = [], miss = []; for (const [n, on, en, bl] of want) { const id = by(n); if (!id) { miss.push(n); continue; } bag.push({ id, n: 1, en, on, blessed: !!bl }); }
    T.hero.lv = 57; T.INV.load({ bag, bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); return { miss, ac: T.INV.ac(), fire: T.ELEMRES_('fire'), dr: T.INV.cx('dr'), drm: T.INV.cx('drMelee'), mr: Math.round(T.mrTotal ? T.mrTotal() : 0) }; });
  console.log('EQ', JSON.stringify(eq));
  for (const z of [22, 23]) { await p.evaluate(z => __T.TOWN.toZone(z), z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', z, { timeout: 20000 }); await p.waitForTimeout(600);
    const r = await p.evaluate(() => { const T = __T, H = T.hero, out = []; T.GOD_INV = false; const ac0 = T.INV.ac(); T.INV.ac = () => -127;
      const kinds = [...new Set(T.foxes.map(f => f.kind))].concat(T.ISLE.id === 23 ? ['phoenix'] : []).concat(['fn_ifrit']);
      for (const k of [...new Set(kinds)]) { const S = T.MOB[k]; if (!S || S.dummy) continue; const f = T.foxes.find(m => m.kind === k) || T.mkMob(k, H.i + 3, H.j);
        const ranged = !!S.range, magic = !!(S.fireball || S.spell), kind = magic ? 'magic' : ranged ? 'ranged' : 'melee';
        const hit = magic ? T.MOBHIT_M ? 0 : null : T.MOBHIT_(S) - (ranged ? Math.min(30, T.INV.er ? T.INV.er() : 8) / 100 : 0);
        const sim = red => { let s = 0, mn = 1e9, mx = 0; const N = 3000; for (let q = 0; q < N; q++) { H.hp = 1e7; H.max = 1e7; T.BUFF.reduction = red ? 99 : 0; const before = H.hp; const raw = T.MOBDMG_(S, f); T.HURT_(raw, f, kind); const d = before - H.hp; s += d; mn = Math.min(mn, d); mx = Math.max(mx, d); } return [Math.round(s / N), mn, mx]; };
        const raw = S.dmg.slice(); out.push({ name: S.name, kind, hit: hit == null ? null : Math.round(hit * 1000) / 10, raw, mult: Math.round(T.MOBDMG_(S, f) / ((S.dmg[0] + S.dmg[1]) / 2) * 10) / 10, dmg: sim(false), dmgRA: sim(true) }); }
      T.BUFF.reduction = 0; return out; });
    for (const x of r) console.log(z, JSON.stringify(x)); }
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
