// 전설 카드 변신 = 몸을 감싸는 두꺼운 금빛 오로라 (카스파·아크 나이트) · 영웅(소드 나이트)은 없음 · 장비 이펙트 끄면 없음 (KT_PORT=8792 bash dev/runkt.sh dev/tests/legaura.js) — 스크린샷 dev/out/legaura_*.png
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'auKN' });
  await p.evaluate(() => { const T = __T; T.hero.lv = 55; T.hero.hp = T.hero.maxhp; const s = PCG.state(); s.cards = { kaspar: 1, arc_knight: 1, sword_knight: 1 }; s.slot = {}; PCG.sync(); T.DN_ && T.DN_.set(0); });
  await p.waitForTimeout(2000);
  // 주인공 둘레 금빛 화소 수 (화면 가운데 · 주인공 그림 바깥 띠 포함)
  const gold = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => { __T.BUFF.invis = 0; __T.hero.hp = __T.hero.maxhp; for (const f of __T.foxes) if (!f.isPet) f.gone = true; const c = document.getElementById('cv'), g = c.getContext('2d'), W = c.width, H = c.height, D = g.getImageData(W / 2 - 110, H / 2 - 200, 220, 260).data; let n = 0; for (let i = 0; i < D.length; i += 4) if (D[i] > 210 && D[i + 1] > 160 && D[i] - D[i + 2] > 45) n++; r(n); })));
  const shot = async (id, f) => { await p.evaluate(id => { PCG.setSlot(id); }, id); await p.waitForTimeout(900); const on = await gold(); await p.screenshot({ path: `dev/out/legaura_${f}.png`, clip: { x: 520, y: 180, width: 240, height: 300 } }); await p.evaluate(() => __T.setEqFx ? __T.setEqFx(false) : null); return on; };
  const eqfx = v => p.evaluate(v => { const b = document.getElementById('cw-fx'); const cur = !b || !b.classList.contains('off'); if (cur !== v && b) b.click(); else if (cur !== v) { try { localStorage.setItem('aden_eqfx', v ? '1' : '0'); } catch (e) {} } }, v);
  await p.evaluate(() => __T.INV.toggleWin('charwin')); await p.waitForTimeout(500);
  const res = {};
  for (const id of ['kaspar', 'arc_knight', 'sword_knight']) { await eqfx(true); await p.evaluate(id => PCG.setSlot(id), id); await p.waitForTimeout(1000); const on = await gold();
    const box = await p.evaluate(() => { const r = document.getElementById('cw-look').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; }); await p.screenshot({ path: `dev/out/legaura_cw_${id}.png`, clip: box });
    await eqfx(false); await p.waitForTimeout(700); const off = await gold(); await eqfx(true); res[id] = { on, off }; }
  console.log(JSON.stringify(res));
  ok('전설 카스파: 금빛 오로라 (장비 이펙트 켬 > 끔)', res.kaspar.on > res.kaspar.off + 150);
  ok('전설 아크 나이트: 금빛 오로라', res.arc_knight.on > res.arc_knight.off + 150);
  ok('영웅 소드 나이트: 오로라 없음 (차이 작음)', Math.abs(res.sword_knight.on - res.sword_knight.off) < Math.max(150, res.kaspar.on - res.kaspar.off) * 0.6);
  await p.evaluate(() => { document.getElementById('charwin').hidden = true; PCG.setSlot('kaspar'); }); await p.waitForTimeout(800); await p.screenshot({ path: 'dev/out/legaura_world.png', clip: { x: 500, y: 170, width: 280, height: 320 } });
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
