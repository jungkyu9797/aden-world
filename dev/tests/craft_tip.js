// 제작 창 아이템 상세 정보: 마우스를 올리면 이름 툴팁 · 꾹 누르고 있으면 아이템 상세 정보 창 (가방과 같은 규칙) · 모바일 꾹 누르기·톡
// KT_PORT=8772 bash dev/runkt.sh dev/tests/craft_tip.js
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
const iw = p => p.evaluate(() => { const w = document.getElementById('itemwin'); return { open: !w.hidden, name: ((w.querySelector('.iw-name') || {}).innerText || '').trim(), lines: w.querySelectorAll('.iw-lines li').length, hint: ((w.querySelector('.iw-hint') || {}).innerText || '').trim(), ctl: !!w.querySelector('.iw-ctl [data-act=use]'), pv: !!w.querySelector('.iw-pv') }; });
const setup = async p => { await p.evaluate(() => { const I = __T.INV; I.add('dragon_scale', 60, true); I.add('drake_claw', 6, true); I.add('dragon_heart', 1, true); I.add('gfrag_baphomet', 3, true); I.add('gaho_ogre', 1, true); I.add('gaho_ogre', 1, true); __T.DOLL_DEF.filter(r => r[2] === 1).slice(0, 2).forEach(r => { I.add('doll_' + r[0], 1, true); I.add('doll_' + r[0], 1, true); }); __T.CRAFT_.open(); }); await p.waitForTimeout(200); };
const hold = async (p, sel, ms = 700) => { const el = await p.$(sel); await el.scrollIntoViewIfNeeded(); const b = await el.boundingBox(); await p.mouse.move(b.x + Math.min(20, b.width / 2), b.y + b.height / 2); await p.mouse.down(); await p.waitForTimeout(ms); await p.mouse.up(); await p.waitForTimeout(150); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  // ---- PC
  { const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push('pc: ' + e.message));
    await login(p, { cls: 'knight', name: 'ctPC' }); await setup(p);
    await p.click('#craftwin [data-ct=gear]'); await p.waitForTimeout(400);
    const gsel = '#cr-list .cr-row[data-pv=dv_sword]'; ok('장비 제작 줄에 data-pv', !!(await p.$(gsel)));
    // 마우스 올리기 → 이름 툴팁 (가방과 같음)
    { const el = await p.$(gsel + ' .ic'); await el.scrollIntoViewIfNeeded(); const bb = await el.boundingBox(); await p.mouse.move(bb.x + 5, bb.y + 5); await p.mouse.move(bb.x + 20, bb.y + 20); await p.waitForTimeout(150);
      const t = await p.evaluate(() => { const t = document.getElementById('stat-tip'); return { vis: !t.hidden, txt: t.innerText }; }); console.log('hover tip:', JSON.stringify(t)); ok('마우스 올리기 → 이름 툴팁', t.vis && /\[/.test(t.txt) && !/꾹/.test(t.txt)); }
    // 짧게 누르기(0.2초) → 상세 안 뜸
    await hold(p, gsel + ' .ic', 200); ok('짧게 누르면 상세 창 안 뜸', !(await iw(p)).open);
    // 꾹 누르기 → 상세 창
    await hold(p, gsel + ' .ic'); { const s = await iw(p); console.log('gear detail:', JSON.stringify(s)); ok('장비 아이콘 꾹 → 상세 창', s.open && s.lines >= 2 && /제작 미리보기/.test(s.hint) && !s.ctl); ok('장비 상세에 강화 미리보기', s.pv); }
    await p.screenshot({ path: 'dev/out/craft_tip.png' });
    // 가방을 열어 다시 그려도 미리보기 창 유지
    await p.evaluate(() => { document.getElementById('invwin').hidden = false; __T.INV.render(); __T.INV.render(); }); await p.waitForTimeout(400); ok('가방 다시 그려도 미리보기 유지', (await iw(p)).open);
    await p.evaluate(() => { document.getElementById('invwin').hidden = true; }); await p.keyboard.press('Escape'); await p.waitForTimeout(150); ok('Esc → 닫힘', !(await iw(p)).open);
    // 이름 꾹
    await hold(p, gsel + ' .cr-t b'); ok('장비 이름 꾹 → 상세 창', (await iw(p)).open); await p.keyboard.press('Escape');
    // 재료 꾹
    await hold(p, gsel + ' small[data-pv=dragon_scale]'); { const s = await iw(p); console.log('mat detail:', JSON.stringify(s)); ok('재료(용의 비늘) 꾹 → 재료 상세', s.open && /제작 재료/.test(s.hint)); }
    await p.screenshot({ path: 'dev/out/craft_tip_mat.png' }); await p.keyboard.press('Escape');
    // 제작 버튼은 그대로 (꾹 눌러도 상세 안 뜸)
    await hold(p, gsel + ' .cr-go'); ok('제작 버튼은 상세 안 뜸', !(await iw(p)).open); ok('제작 버튼은 그대로 (제작 확인창)', await p.evaluate(() => !document.getElementById('askwin').hidden)); await p.click('#ask-no'); await p.waitForTimeout(150);
    // 가호 제작 · 가호 조합 · 인형 합성 탭
    await p.click('#craftwin [data-ct=make]'); await p.waitForTimeout(400);
    await hold(p, '#cr-list .cr-row[data-pv=gaho_baphomet] .ic'); { const s = await iw(p); ok('가호 제작: 가호 꾹 → 상세', s.open && /바포메트/.test(s.name)); } await p.keyboard.press('Escape');
    await hold(p, '#cr-list small[data-pv=gfrag_baphomet]'); ok('가호 제작: 조각 꾹 → 상세', (await iw(p)).open); await p.keyboard.press('Escape');
    await p.click('#craftwin [data-ct=mix]'); await p.waitForTimeout(400);
    await hold(p, '#cr-list .cr-row[data-pv=gaho_ogre] .ic'); { const s = await iw(p); ok('가호 조합: 가진 가호 꾹 → 상세', s.open && /가방에 있는 가호/.test(s.hint)); } await p.keyboard.press('Escape');
    await p.click('#craftwin [data-ct=doll]'); await p.waitForTimeout(400);
    await p.click('#cr-list [data-da="1"]'); await p.waitForTimeout(300);
    const nIn = () => p.evaluate(() => document.querySelectorAll('#cr-list .dg-sl.has').length); const n0 = await nIn();
    await hold(p, '#cr-list .dg-sl.has'); { const s = await iw(p); ok('인형 합성: 칸의 인형 꾹 → 상세', s.open && /합성 칸/.test(s.hint)); } ok('꾹 누른 뒤 손 떼도 인형이 칸에서 안 빠짐', (await nIn()) === n0 && n0 > 0);
    await p.keyboard.press('Escape'); await p.click('#cr-list .dg-sl.has'); await p.waitForTimeout(200); ok('짧게 누르면 예전처럼 칸에서 빠짐', (await nIn()) === n0 - 1);
    await p.close(); }
  // ---- 모바일 (터치)
  { const ctx = await b.newContext({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push('mob: ' + e.message));
    await login(p, { cls: 'elf', name: 'ctMB', init: () => { try { localStorage.setItem('aden_mob', '1'); } catch (e) {} } }); await setup(p);
    ok('모바일 모드', await p.evaluate(() => __T.MOBILE));
    await p.evaluate(() => document.querySelector('#craftwin [data-ct=gear]').click()); await p.waitForTimeout(400);
    const cdp = await ctx.newCDPSession(p);
    const touchHold = async (sel, ms) => { const el = await p.$(sel); await el.scrollIntoViewIfNeeded(); const bb = await el.boundingBox(); const x = bb.x + Math.min(20, bb.width / 2), y = bb.y + bb.height / 2;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await p.waitForTimeout(ms); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(200); };
    const gsel = '#cr-list .cr-row[data-pv=dv_bow]';
    await touchHold(gsel + ' .ic', 700); { const s = await iw(p); console.log('mobile hold:', JSON.stringify(s)); ok('모바일 꾹 누르기 → 상세 창', s.open && /제작 미리보기/.test(s.hint)); }
    await p.screenshot({ path: 'dev/out/craft_tip_mobile.png' });
    await p.evaluate(() => __T.INV.hideDetail()); await p.waitForTimeout(100);
    await p.tap(gsel + ' .ic'); await p.waitForTimeout(250); ok('모바일 톡 → 상세 창 (가방과 같음)', (await iw(p)).open);
    await p.evaluate(() => __T.INV.hideDetail());
    await p.tap(gsel + ' .cr-go'); await p.waitForTimeout(250); ok('모바일: 제작 버튼 톡은 제작 확인창 (상세 아님)', await p.evaluate(() => document.getElementById('itemwin').hidden && !document.getElementById('askwin').hidden)); await p.tap('#ask-no');
    await ctx.close(); }
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.keys(R).filter(k => !R[k]); console.log(bad.length ? 'FAILED: ' + bad.join(', ') : 'ALL OK'); await b.close(); })();
