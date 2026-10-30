// 인벤 [마법인형] 칸 · 턴 언데드 재사용 3초 (KT_PORT=8773 bash dev/runkt.sh dev/tests/dolltab.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
const setup = async p => p.evaluate(() => { const T = __T, I = T.INV;
  const eqs = Object.keys(T.ITEMS).filter(k => { const d = T.ITEMS[k]; return d.slot && d.slot !== 'doll' && !d.hidden; }).slice(0, 5);
  const dolls = T.DOLL_DEF.slice(0, 4).map(r => 'doll_' + r[0]);
  const bag = []; eqs.forEach(id => bag.push({ id, n: 1, en: 0 })); dolls.forEach((id, i) => bag.splice(i * 2, 0, { id, n: 1, en: 0 }));
  bag.push({ id: 'pot_red', n: 30 }); bag.push({ id: 'scr_tele', n: 5 });
  I.load({ bag: bag.filter(x => T.ITEMS[x.id]), bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } });
  document.getElementById('invwin').hidden = false; I.render(); return { eqs, dolls }; });
const view = p => p.evaluate(() => { const T = __T, g = document.getElementById('inv-grid'), cells = [...g.querySelectorAll('.slot')].filter(c => c.dataset.itip);
  const names = cells.map(c => c.dataset.itip.split('\n')[0]); const dollN = names.filter(n => /인형/.test(n)).length;
  const tabs = {}; document.querySelectorAll('#inv-tabs button').forEach(b => tabs[b.dataset.t] = { sel: b.getAttribute('aria-selected'), n: b.querySelector('small').textContent, txt: b.textContent.trim() });
  return { n: cells.length, dollN, tabs, bag: T.INV.bag().length, bagDolls: T.INV.bag().filter(e => T.ITEMS[e.id].doll).length }; });
(async () => { const b = await chromium.launch(); const errs = []; try {
  { const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push('pc: ' + e.message));
    await login(p, { cls: 'wizard', name: 'dtPC' }); const S = await setup(p); console.log('setup', JSON.stringify(S));
    let v = await view(p); console.log('all', JSON.stringify(v));
    ok('전체 칸에 인형 없음', v.dollN === 0 && v.n === v.bag - v.bagDolls && v.bagDolls === 4);
    ok('탭 숫자: 전체는 인형 빼고 · 마법인형 4', +v.tabs.all.n === v.bag - 4 && +v.tabs.doll.n === 4 && /마법인형/.test(v.tabs.doll.txt));
    await p.click('#inv-tabs button[data-t=eq]'); await p.waitForTimeout(150); v = await view(p); ok('장비 칸에 인형 없음', v.dollN === 0 && v.n === 5);
    await p.click('#inv-tabs button[data-t=doll]'); await p.waitForTimeout(150); v = await view(p); console.log('doll', JSON.stringify(v)); ok('마법인형 칸에는 인형만', v.n === 4 && v.dollN === 4 && v.tabs.doll.sel === 'true');
    await p.screenshot({ path: 'dev/out/dolltab_pc.png' });
    // 인형 착용 → 마법인형 칸에서 ON 표시
    await p.evaluate(() => { const T = __T, e = T.INV.bag().find(x => T.ITEMS[x.id].doll); T.INV.equip ? T.INV.equip(e) : null; T.INV.render(); });
    // 새로 주운 인형도 마법인형 칸으로
    await p.click('#inv-tabs button[data-t=all]'); await p.evaluate(() => { __T.INV.add('doll_' + __T.DOLL_DEF[5][0], 1, true); __T.INV.render(); }); await p.waitForTimeout(100);
    v = await view(p); ok('새 인형도 전체 칸에 안 나옴', v.dollN === 0 && +v.tabs.doll.n === 5);
    // 전체 칸 끌어서 자리 바꾸기 (인형이 섞여 있어도 보이는 순서대로)
    const sw = await p.evaluate(() => { const T = __T, g = document.getElementById('inv-grid'), cells = [...g.querySelectorAll('.slot')]; const n0 = cells[0].dataset.itip.split('\n')[0], n2 = cells[2].dataset.itip.split('\n')[0];
      const dt = new DataTransfer(); dt.setData('text/x-bag', String(T.INV.bag().findIndex(x => !T.ITEMS[x.id].doll))); const ev = new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }); cells[2].dispatchEvent(ev);
      const c2 = [...document.getElementById('inv-grid').querySelectorAll('.slot')]; return { n0, n2, a0: c2[0].dataset.itip.split('\n')[0], a2: c2[2].dataset.itip.split('\n')[0] }; });
    console.log('swap', JSON.stringify(sw)); ok('전체 칸 끌어 놓기 → 보이는 두 칸이 바뀜', sw.a0 === sw.n2 && sw.a2 === sw.n0);
    // 제작 장인 [인형 합성] 탭 → 가방도 마법인형 칸
    await p.evaluate(() => { __T.CRAFT_.open(); }); await p.waitForTimeout(150); await p.click('#craftwin [data-ct=doll]'); await p.waitForTimeout(200);
    v = await view(p); ok('인형 합성 탭 열면 가방도 마법인형 칸', v.tabs.doll.sel === 'true' && v.dollN === v.n && v.n === 5);
    await p.evaluate(() => document.querySelector('#inv-grid .slot').click()); await p.waitForTimeout(150);
    ok('마법인형 칸에서 눌러 합성 칸에 넣기', await p.evaluate(() => document.querySelectorAll('#cr-list .dg-sl.has').length >= 1));
    await p.screenshot({ path: 'dev/out/dolltab_craft.png' });
    // 턴 언데드 재사용 3초
    const cd = await p.evaluate(() => __T.SK.turnund.cd); ok('턴 언데드 재사용 3초', cd === 3);
    await p.close(); }
  { const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push('mob: ' + e.message));
    await login(p, { cls: 'knight', name: 'dtMB', init: () => { try { localStorage.setItem('aden_mob', '1'); } catch (e) {} } }); await setup(p);
    await p.tap('#inv-tabs button[data-t=doll]'); await p.waitForTimeout(200); const v = await view(p);
    const fit = await p.evaluate(() => { const bs = [...document.querySelectorAll('#inv-tabs button')]; const r = bs.map(b => { const q = b.getBoundingClientRect(); return { h: Math.round(q.height), sw: b.scrollWidth, cw: b.clientWidth }; }); return r; });
    console.log('mobile tabs', JSON.stringify(fit)); ok('모바일: 마법인형 칸 톡 → 인형만', v.n === 4 && v.dollN === 4); ok('모바일: 탭 글자 한 줄', fit.every(x => x.h === fit[0].h && x.sw <= x.cw + 1));
    await p.screenshot({ path: 'dev/out/dolltab_mobile.png' }); await ctx.close(); }
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
