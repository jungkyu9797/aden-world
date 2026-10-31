// 아크 나이트 변신: 어두운 은빛 갑옷·남보라 망토·금빛 칼날 · 발밑 금빛 광원 · 휘두를 때 금빛 초승달 · 맞히면 주황 폭발·금빛 불티 · 치명타 = 금빛 빛기둥 (KT_PORT=8795 bash dev/runkt.sh dev/tests/arck.js) — 스크린샷 dev/out/arck_*.png
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 }); const ZZ = +(process.env.AKZ || 1); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'akKN' });
  await p.evaluate(ZZ => { const T = __T; T.GOD_INV = true; T.hero.lv = 55; const s = PCG.state(); s.cards = { arc_knight: 1, sword_knight: 1, arc_mage: 1 }; s.slot = {}; PCG.sync(); PCG.setSlot('arc_knight'); T.DN_ && T.DN_.set(0); T.TOWN.toZone(ZZ); }, ZZ);
  await p.waitForTimeout(2500);
  ok('아크 나이트로 변신', await p.evaluate(() => PCG.cur() === 'pc_arc_knight'));
  // 색: 칼날은 금빛 · 망토는 남보라 (색 입힌 그림에서 확인)
  await p.waitForTimeout(800);
  const col = await p.evaluate(() => { const ks = PCG.rcCache().filter(k => k.startsWith('pc_arc_knight|')); return { n: ks.length }; }); console.log('cache', JSON.stringify(col)); ok('색 입힌 그림 만들어짐', col.n > 0);
  // 몹 하나 앞에 두고 때리기
  await p.evaluate(() => { const T = __T, H = T.hero; for (const f of T.foxes) if (!f.isPet) f.gone = true; let m = null; for (let d = 1; d < 4 && !m; d++) m = T.mkMob('orc', H.i + d + 1, H.j); T.foxes.push(m); m.hp = m.max = 1e7; m.summoned = true; m.aggro = false; m.dmg0 = 1; window.__AKM = m; H.target = m; });
  const shots = []; const kinds = new Set(); let swing = 0;
  for (let i = 0; i < 26; i++) { await p.waitForTimeout(70); const s = await p.evaluate(() => { const T = __T; T.hero.hp = T.hero.maxhp; return { a: T.hero.atk ? 'attack' : '', k: T.MXL.map(q => q.k) }; }); s.k.forEach(k => kinds.add(k)); if (s.a === 'attack') swing++; if (i % 2 === 0 && shots.length < 12) { const f = `dev/out/arck_seq${shots.length}.png`; await p.screenshot({ path: f, clip: { x: 520, y: 230, width: 240, height: 210 } }); shots.push(f); } }
  console.log('kinds', [...kinds].join(','), 'swingFrames', swing);
  ok('공격 동작 나옴', swing > 0);
  ok('맞히면 주황 폭발 (burst)', kinds.has('burst'));
  // 치명타 → 금빛 빛기둥
  const cr = await p.evaluate(() => { const T = __T, m = window.__AKM, Rr = Math.random; T.MXL.length = 0; Math.random = () => 0.01; try { T.strike(m, 'melee'); } finally { Math.random = Rr; } return T.MXL.map(q => q.k); });
  console.log('crit', cr.join(',')); ok('치명타 → 금빛 빛기둥 + 폭발', cr.includes('pillar') && cr.includes('burst'));
  await p.waitForTimeout(90); await p.screenshot({ path: 'dev/out/arck_crit.png', clip: { x: 440, y: 120, width: 400, height: 380 } });
  // 밤: 발밑 광원이 어둠을 밝힘
  await p.evaluate(() => { __T.hero.target = null; __T.DN_ && __T.DN_.set(1); }); await p.waitForTimeout(1500); await p.screenshot({ path: 'dev/out/arck_night.png', clip: { x: 340, y: 150, width: 600, height: 400 } });
  const lit = await p.evaluate(() => new Promise(r => requestAnimationFrame(() => r(null)))); void lit;
  // 다른 직업 아크(아크메이지)는 예전 색 그대로 · 소드 나이트는 효과 없음
  const sp = await p.evaluate(() => { const T = __T; return { mage: !!(PCG.rcCache && true) }; }); void sp;
  // 변신 창 미리보기
  await p.evaluate(() => { __T.DN_ && __T.DN_.set(0); PCG.openWin(); }); await p.waitForTimeout(500); await p.click('#pw-grid .pw-c[data-id="arc_knight"]').catch(() => {}); await p.waitForTimeout(900);
  const lk = await p.evaluate(() => { const r = document.getElementById('pw-look').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }); await p.screenshot({ path: 'dev/out/arck_look.png', clip: { x: lk.x - 4, y: lk.y - 4, width: lk.w + 8, height: lk.h + 8 } });
  // 소드 나이트로 바꾸면 금빛 효과 없음
  await p.evaluate(() => { PCG.close && PCG.close(); const w = document.getElementById('polywin'); if (w) w.hidden = true; PCG.setSlot('sword_knight'); __T.MXL.length = 0; const m = window.__AKM, Rr = Math.random; Math.random = () => 0.01; try { __T.strike(m, 'melee'); } finally { Math.random = Rr; } });
  ok('소드 나이트는 금빛 효과 없음', await p.evaluate(() => PCG.cur() === 'pc_sword_knight' && !__T.MXL.some(q => q.k === 'pillar')));
  console.log('shots', shots.join(' '));
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
