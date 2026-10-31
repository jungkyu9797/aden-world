// 변신 카드 창 [보유중]: 없는 카드도 흐리게 모두 보임 · 눌러서 정보 · 끌기·합성 재료·변신 칸은 안 됨 (KT_PORT=8791 bash dev/runkt.sh dev/tests/pcg_all.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
const SET = { goblin: 6, orc: 4, werewolf: 5, dark_elf: 6, bugbear: 4, deathknight: 1 };
(async () => { const b = await chromium.launch(); const errs = []; try {
  for (const vp of [{ width: 1280, height: 800 }, { width: 844, height: 390, mob: 1 }]) {
    const ctx = await b.newContext(vp.mob ? { viewport: { width: vp.width, height: vp.height }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: vp }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); const M = vp.mob ? '모바일: ' : '';
    await login(p, { cls: 'knight', name: 'paK' + (vp.mob ? 'm' : 'p'), init: vp.mob ? () => { try { localStorage.setItem('aden_mob', '1'); } catch (e) {} } : undefined });
    await p.evaluate(() => { __T.setCoins(5000000); __T.hero.lv = 52; }); await p.evaluate(() => PCG.openWin()); await p.waitForTimeout(400);
    await p.evaluate(o => { const s = PCG.state(); s.cards = Object.assign({}, o); s.lock = {}; s.slot = {}; PCG.sync(); PCG.renderWin(); }, SET); await p.waitForTimeout(300);
    const v = await p.evaluate(() => { const all = [...document.querySelectorAll('#pw-grid .pw-c')], no = all.filter(e => e.classList.contains('no'));
      return { all: all.length, n: __T ? window.PCG && Object.keys(PCG.state().cards).filter(k => PCG.state().cards[k] > 0).length : 0, no: no.length, noLock: no.some(e => e.querySelector('.pw-lock, .pw-n')), op: no.length ? +getComputedStyle(no[0]).opacity : 1, opOwn: +getComputedStyle(all.find(e => !e.classList.contains('no'))).opacity,
        kinds: [...document.querySelectorAll('#pw-grid .pw-gn small')].map(e => e.textContent), cnt: [...document.querySelectorAll('#pw-grid .pw-gn b')].map(e => e.textContent), tot: document.getElementById('pw-total').textContent, total: window.PCG ? null : null }; });
    console.log(JSON.stringify(v));
    ok(M + '보유중에 모든 카드 (26종)', v.all === 26);
    ok(M + '없는 카드 = 흐리게 (' + v.op + ' / 있는 카드 ' + v.opOwn + ')', v.no === 26 - Object.keys(SET).length && v.op < 0.5 && v.opOwn === 1);
    ok(M + '없는 카드에는 장수·자물쇠 없음', !v.noLock);
    ok(M + '등급마다 모은 종류 (' + v.kinds.join(' · ') + ')', v.kinds.join(' ') === '2/6종 1/4종 2/4종 0/6종 1/6종');
    ok(M + '장수 합계는 가진 카드만 (' + v.cnt.join(' · ') + ')', v.cnt.join(' ') === '10장 5장 10장 0장 1장' && /6 \/ 26종 · 26장/.test(v.tot));
    // 없는 카드 누르기 → 정보 (얻는 방법) · [변신 칸에 넣기]·[잠그기] 막힘
    const tap = s => vp.mob ? p.tap(s) : p.click(s);
    await tap('#pw-grid .pw-c.no[data-id="baphomet"], #pw-grid .pw-c.no'); await p.waitForTimeout(200);
    const s1 = await p.evaluate(() => { const e = document.getElementById('pw-sel'); return { t: e.textContent, put: e.querySelector('[data-a="put"]').disabled, lock: e.querySelector('[data-a="lock"]').disabled, on: (document.querySelector('#pw-grid .pw-c.on') || {}).className || '' }; });
    console.log('sel', JSON.stringify(s1)); ok(M + '없는 카드 누르면 정보 · 없는 카드 · 뽑기 확률 표시', /없는 카드/.test(s1.t) && /뽑기 [\d.]+% \(1장마다\)/.test(s1.t) && / no/.test(s1.on));
    ok(M + '없는 카드: [변신 칸에 넣기]·[잠그기] 막힘', s1.put && s1.lock);
    // 전설(없음) → 마일리지 안내 · 희귀 → 합성 안내
    const lg = await p.evaluate(() => { const id = [...document.querySelectorAll('#pw-grid .pw-c.no')].map(e => e.dataset.id).find(id => PCG.state && document.querySelector(`#pw-grid .pw-c[data-id="${id}"]`).closest('.pw-gr').querySelector('.pw-gn').textContent.startsWith('전설')); return id; });
    await tap(`#pw-grid .pw-c[data-id="${lg}"]`); await p.waitForTimeout(200); const s2 = await p.evaluate(() => document.getElementById('pw-sel').textContent); console.log('legend', lg, s2);
    ok(M + '전설 없는 카드: 영웅 4장 합성 · 마일리지 1000점 안내', /영웅 4장 합성/.test(s2) && /마일리지 1000점이면 골라서 받기/.test(s2) && /뽑기 0\.0\d+%/.test(s2));
    if (!vp.mob) await p.screenshot({ path: 'dev/out/pcg_all.png' }); else await p.screenshot({ path: 'dev/out/pcg_all_mob.png' });
    // 두 번 누르기·끌기 → 변신 칸 안 됨
    if (!vp.mob) { await p.dblclick(`#pw-grid .pw-c[data-id="${lg}"]`); await p.waitForTimeout(250); ok('두 번 눌러도 없는 카드는 변신 칸에 안 들어감', await p.evaluate(() => !document.getElementById('pw-slot').classList.contains('full')));
      const sb = await p.locator('#pw-slot').boundingBox(), drag = async sel => { const bb = await p.locator(sel).boundingBox(), x0 = bb.x + bb.width / 2, y0 = bb.y + bb.height / 2 + 6, x1 = sb.x + 30, y1 = sb.y + sb.height / 2;
        await p.mouse.move(x0, y0); await p.mouse.down(); for (let i = 1; i <= 8; i++) { await p.mouse.move(x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8); await p.waitForTimeout(20); } await p.mouse.up(); await p.waitForTimeout(300); };
      await drag(`#pw-grid .pw-c[data-id="${lg}"]`);
      ok('끌어도 없는 카드는 변신 칸에 안 들어감', await p.evaluate(() => !document.getElementById('pw-slot').classList.contains('full') && !document.querySelector('.pw-ghost')));
      // 있는 카드는 그대로: 끌어서 변신
      await drag('#pw-grid .pw-c[data-id="deathknight"]');
      const d = await p.evaluate(() => { const e = document.querySelector('#pw-grid .pw-c[data-id="deathknight"]'); return { full: document.getElementById('pw-slot').classList.contains('full'), sl: e && e.classList.contains('sl'), no: e && e.classList.contains('no'), slot: PCG.state().slot, log: __T.log.slice(-3).map(x => x.t || x) }; }); console.log('dk', JSON.stringify(d));
      ok('있는 카드는 끌어서 변신 · 1장뿐이면 보유중에 \'변신\' 표시로 남음', d.full && d.sl && !d.no); }
    // 합성 고르는 중: 없는 카드는 재료로 안 들어감 (흐리게) · 눌러도 정보만
    await tap('#pw-synb .pw-mt[data-g="희귀"]'); await p.waitForTimeout(200);
    const rare = await p.evaluate(() => [...document.querySelectorAll('#pw-grid .pw-c.no')].map(e => e.dataset.id).find(id => document.querySelector(`#pw-grid .pw-c[data-id="${id}"]`).closest('.pw-gr').querySelector('.pw-gn').textContent.startsWith('희귀')));
    const dm = await p.evaluate(id => ({ dim: document.querySelector(`#pw-grid .pw-c[data-id="${id}"]`).classList.contains('dim'), pk: document.querySelector(`#pw-grid .pw-c[data-id="${id}"]`).classList.contains('pk'), own: document.querySelector('#pw-grid .pw-c[data-id="dark_elf"]').classList.contains('pk') }), rare);
    await tap(`#pw-grid .pw-c[data-id="${rare}"]`); await p.waitForTimeout(200); const tr = await p.evaluate(() => ({ n: PCG.tray().n, sel: document.getElementById('pw-sel').textContent }));
    console.log('tray', rare, JSON.stringify(dm), JSON.stringify(tr.n)); ok(M + '합성 고르는 중: 없는 카드는 흐리게 · 눌러도 재료 안 됨 (정보만)', dm.dim && !dm.pk && dm.own && !Object.keys(tr.n).length && /없는 카드/.test(tr.sel));
    await tap(`#pw-grid .pw-c[data-id="dark_elf"]`); await p.waitForTimeout(150); ok(M + '있는 카드는 그대로 재료로 들어감', await p.evaluate(() => PCG.tray().n.dark_elf === 1));
    await ctx.close(); }
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
