// 아크 시리즈(나이트·메이지·레인저 같음): 어두운 은빛·남보라·금빛 무기 · 발밑 금빛 광원 · 나이트 = 금빛 초승달 · 메이지·레인저 = 무기 앞 금빛 섬광 + 금빛 마력탄·화살
// 맞히면 주황 폭발·금빛 불티 (치명타 = 크게 + 바닥 고리) · 하늘 빛기둥 없음 · 소드 시리즈 = 예전 아크 모습(금빛 갑옷·보랏빛 무기) (KT_PORT=8795 bash dev/runkt.sh dev/tests/arck.js) — 스크린샷 dev/out/arck_*.png
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
const JOB = { knight: 'knight', wizard: 'mage', elf: 'ranger' }, NM = { knight: '나이트', wizard: '메이지', elf: '레인저' };
const ONLY = process.env.AKCLS ? process.env.AKCLS.split(',') : ['knight', 'wizard', 'elf'];
(async () => { const b = await chromium.launch(); const errs = []; try {
  for (const cls of ONLY) { const j = JOB[cls], N = '아크 ' + NM[cls];
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(cls + ': ' + e.message));
    await login(p, { cls, name: 'ak' + cls.slice(0, 2) });
    await p.evaluate(j => { const T = __T; T.GOD_INV = true; T.hero.lv = 55; T.hero.mp = T.hero.maxmp = 999; const s = PCG.state(); s.cards = { ['arc_' + j]: 1, ['sword_' + j]: 1 }; s.slot = {}; PCG.sync(); PCG.setSlot('arc_' + j); T.DN_ && T.DN_.set(0); T.TOWN.toZone(1); }, j);
    await p.waitForTimeout(2500); ok(N + ': 변신', await p.evaluate(j => PCG.cur() === 'pc_arc_' + j, j));
    await p.evaluate(cls => { const T = __T, H = T.hero; for (const f of T.foxes) if (!f.isPet) f.gone = true; let m = null; const d0 = cls === 'knight' ? 1 : 3; for (let d = d0; d < d0 + 3 && !m; d++) m = T.mkMob('orc', H.i + d + 1, H.j); T.foxes.push(m); m.hp = m.max = 1e7; m.summoned = true; m.aggro = false; window.__AKM = m; H.target = m; }, cls);
    const kinds = new Set(); let swing = 0, gold = 0, plain = 0; const shots = [];
    for (let i = 0; i < 40; i++) { await p.waitForTimeout(70); const s = await p.evaluate(() => { const T = __T; T.hero.hp = T.hero.maxhp; T.hero.mp = 999; if (!T.hero.target) T.hero.target = window.__AKM; return { a: !!T.hero.atk, k: T.MXL.map(q => q.k), g: (T.arrows || []).filter(a => a.pl && a.gold).length, n: (T.arrows || []).filter(a => a.pl && !a.gold).length }; });
      s.k.forEach(k => kinds.add(k)); if (s.a) swing++; gold += s.g; plain += s.n; if (i % 3 === 0 && shots.length < 8) { const f = `dev/out/arck_${cls}_${shots.length}.png`; await p.screenshot({ path: f, clip: { x: 500, y: 220, width: 300, height: 220 } }); shots.push(f); } }
    console.log(cls, 'kinds', [...kinds].join(','), 'swing', swing, 'goldShots', gold, 'plainShots', plain);
    ok(N + ': 공격함', swing > 0); ok(N + ': 맞히면 주황 폭발', kinds.has('burst')); ok(N + ': 하늘 빛기둥 없음', !kinds.has('pillar'));
    if (cls === 'elf') ok(N + ': 화살이 금빛', gold > 0 && plain === 0);
    const cr = await p.evaluate(cls => { const T = __T, m = window.__AKM, Rr = Math.random; T.MXL.length = 0; Math.random = () => 0.01; try { T.strike(m, cls === 'wizard' ? 'magic' : cls === 'elf' ? 'bow' : 'melee'); } finally { Math.random = Rr; } return T.MXL.map(q => q.k); }, cls);
    console.log(cls, 'crit', cr.join(',')); ok(N + ': 치명타 = 폭발 + 바닥 고리 (빛기둥 없음)', cr.includes('burst') && cr.includes('ring') && !cr.includes('pillar'));
    await p.waitForTimeout(80); await p.screenshot({ path: `dev/out/arck_${cls}_crit.png`, clip: { x: 460, y: 160, width: 380, height: 300 } });
    // 변신 창 미리보기 색: 아크 = 은빛(파랑 ≥ 빨강) · 소드 = 예전 아크 금빛(빨강 > 파랑)
    await p.evaluate(() => { __T.hero.target = null; window.__AKM.gone = true; PCG.openWin(); }); await p.waitForTimeout(400);
    const box = () => p.evaluate(() => { const r = document.getElementById('pw-look').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
    const look = async id => { await p.click(`#pw-grid .pw-c[data-id="${id}"]`); await p.waitForTimeout(1200); return p.evaluate(() => { const c = document.getElementById('pw-look'), g = c.getContext('2d'), D = g.getImageData(c.width * 0.3, c.height * 0.15, c.width * 0.4, c.height * 0.6).data; let r = 0, gg = 0, bl = 0, n = 0;
      for (let i = 0; i < D.length; i += 4) { const mx = Math.max(D[i], D[i + 1], D[i + 2]); if (D[i + 3] < 200 || mx < 70) continue; r += D[i]; gg += D[i + 1]; bl += D[i + 2]; n++; } return n ? { r: Math.round(r / n), g: Math.round(gg / n), b: Math.round(bl / n), n } : null; }); };
    await p.evaluate(() => { const b = document.getElementById('cw-fx'); if (b && !b.classList.contains('off')) b.click(); });   // 미리보기 색만 보려고 장비 이펙트(전설 금빛 오로라) 잠깐 끔
    const A = await look('arc_' + j); await p.screenshot({ path: `dev/out/arck_${cls}_look_arc.png`, clip: await box() });
    const S = await look('sword_' + j); await p.screenshot({ path: `dev/out/arck_${cls}_look_sword.png`, clip: await box() });
    await p.evaluate(() => { const b = document.getElementById('cw-fx'); if (b && b.classList.contains('off')) b.click(); });
    console.log(cls, 'look arc', JSON.stringify(A), 'sword', JSON.stringify(S));
    ok(N + ': 미리보기 은빛 (아크)', !!A && A.b >= A.r - 12); ok('소드 ' + NM[cls] + ': 예전 아크 금빛 (' + (S && S.r - S.b) + ')', !!S && S.r - S.b > 12);
    // 소드로 바꾸면 금빛 효과 없음
    await p.evaluate(j => { const w = document.getElementById('polywin'); if (w) w.hidden = true; PCG.setSlot('sword_' + j); }, j); await p.waitForTimeout(200);
    ok('소드 ' + NM[cls] + ': 금빛 효과 없음', await p.evaluate(cls => { const T = __T, H = T.hero; let m = null; for (let d = 2; d < 6 && !m; d++) m = T.mkMob('orc', H.i + d, H.j + 1); T.foxes.push(m); m.hp = m.max = 1e6; T.MXL.length = 0; const Rr = Math.random; Math.random = () => 0.01; try { T.strike(m, cls === 'wizard' ? 'magic' : cls === 'elf' ? 'bow' : 'melee'); } finally { Math.random = Rr; } return PCG.cur().startsWith('pc_sword_') && !T.MXL.some(q => q.k === 'burst' && q.c === '255,96,24'); }, cls));
    await ctx.close(); }
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
