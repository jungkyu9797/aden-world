// 11/2 타격감: 설정 3단계 · 치명타 때 그리기만 멈춤(게임 시간은 흐름) · 밀림 카메라 · 확대 · 찌그러짐 · 칼 궤적 · 끔이면 아무것도 안 함
//   python3 dev/mkkt.py && KT_PORT=8770 bash dev/runkt.sh dev/tests/hitfeel.js → dev/out/hitfeel_*.png
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v, x) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k + (x !== undefined ? '  ' + JSON.stringify(x) : '')); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  const p = await b.newPage({ viewport: { width: 1000, height: 700 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'hfK' });
  await p.evaluate(() => { const T = __T; T.GOD_INV = true; T.hero.lv = 60; T.INV.load({ bag: [{ id: 'lg_sword', n: 1, en: 5, on: 'weapon' }], bonus: { str: 30, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); T.TOWN.toZone(8); });
  await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 8 && __T.SCENE === 'field', null, { timeout: 20000 }); await p.waitForTimeout(1000);
  await p.evaluate(() => { const T = __T, H = T.hero; const f = T.mkMob('ogre', H.i + 2, H.j); f.max = f.hp = 5e6; f.stunT = 1e6; f.aggro = false; T.foxes.push(f); window.__OG = f; });
  await p.waitForTimeout(800);
  const btn = await p.evaluate(() => (document.getElementById('esc-hf') || {}).textContent); ok('ESC 버튼 기본 보통', btn === '타격 연출: 보통', btn);
  // 그리기 멈춤: 치명타 연출 뒤 0.03초 동안 화면 프레임은 그대로(그리기 횟수 0), 게임 시간은 흐름
  const st = await p.evaluate(() => new Promise(res => { const HF = __T.HF_, T = __T; let draws = 0; const C = HTMLCanvasElement.prototype, cv = document.querySelector('canvas'); const g = cv.getContext('2d'), d0 = g.drawImage; g.drawImage = function () { draws++; return d0.apply(this, arguments); };
    HF.hit(window.__OG, true, false); const t1 = T.time; requestAnimationFrame(() => { const r = { draws, dt: T.time - t1 }; g.drawImage = d0; res(r); }); }));
  ok('치명타: 그리기 멈춤 중 게임 시간 흐름', st.draws === 0 && st.dt > 0.005, st);
  // 칼 궤적 + 찌그러짐 스크린샷
  await p.evaluate(() => { const HF = __T.HF_; HF.swing(window.__OG, true); HF.hit(window.__OG, true, false); }); const sq = await p.evaluate(() => ({ s: window.__OG.hfS, k: __T.HF_.off(), boss: !!__T.MOB.ogre.boss })); ok('찌그러짐·밀림 값', sq.s > 0.02 && Math.hypot(sq.k[0], sq.k[1]) > 0.3, sq); await p.waitForTimeout(60); await p.screenshot({ path: 'dev/out/hitfeel_crit.png' });
  // 실제 공격 몇 번 (자동 공격) — 오류 없음
  await p.evaluate(() => { __T.hero.target = window.__OG; }); await p.waitForTimeout(3000); await p.screenshot({ path: 'dev/out/hitfeel_fight.png' });
  // 끔: 아무것도 안 함
  await p.evaluate(() => __T.HF_.set(0)); const off = await p.evaluate(() => { const HF = __T.HF_, f = window.__OG; f.hfT = null; HF.hit(f, true, true); return { stop: HF.tick(0), s: f.hfT, z: HF.zoomK(), o: HF.off() }; });
  ok('끔: 멈춤·찌그러짐 없음', off.stop === false && off.s == null && off.z === 0, off);
  const btn2 = await p.evaluate(() => { document.getElementById('esc-hf').click(); document.getElementById('esc-hf').click(); return [document.getElementById('esc-hf').textContent, localStorage.getItem('aden_hf')]; }); ok('버튼 순환 끔→보통→강', btn2[0] === '타격 연출: 강' && btn2[1] === '2', btn2);
  ok('오류 없음', errs.length === 0, errs.slice(0, 3));
} catch (e) { console.log('ERR', e.message); } finally { await b.close(); } console.log(Object.values(R).every(Boolean) ? '모두 통과' : '실패 있음'); })();
