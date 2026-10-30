// 상단 [게임 기록]: 전체 공지를 시각과 함께 최대 200줄 (KT_PORT=8776 bash dev/runkt.sh dev/tests/gamelog.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
const rows = p => p.evaluate(() => ({ open: !document.getElementById('logwin').hidden, rows: [...document.querySelectorAll('#glog-list .gl-row')].map(r => r.querySelector('time').textContent + ' ' + r.querySelector('span').textContent), days: [...document.querySelectorAll('#glog-list .gl-day')].map(d => d.textContent), n: (document.getElementById('glog-n') || {}).textContent }));
(async () => { const b = await chromium.launch(); const errs = []; try {
  { const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push('pc: ' + e.message));
    const acc = 'gl' + Date.now() % 1e6; await login(p, { cls: 'knight', name: 'glPC', acc, init: () => { if (!sessionStorage.getItem('glInit')) { sessionStorage.setItem('glInit', '1'); localStorage.setItem('aden_glog', JSON.stringify([{ at: Date.now() - 864e5, t: '어제 기록: 누군가 데스나이트를 토벌했습니다!', c: '#ffd86a' }])); } } });
    ok('GLOG 있음', await p.evaluate(() => !!__T.GLOG_ && typeof __T.ANN_ === 'function'));
    await p.evaluate(() => { __T.ANN_('기사A님이 바포메트를 토벌했습니다!', '#ffd86a', 'boss'); __T.ANN_('요정B님이 [영웅] 커츠의 검을 얻었습니다!', '#c77dff'); __T.ANN_('마법사C님이 접속했습니다. (마법사 Lv.50)', '#8fd0ff'); __T.ANN_('기사D님이 [전설] 데스나이트 변신 카드를 뽑았습니다!', '#ff9a3c'); });
    const tb = await p.evaluate(() => { const t = document.querySelector('.topbar'), r = t.getBoundingClientRect(), bt = document.getElementById('btn-glog'); return { l: r.left, r: r.right, w: innerWidth, vis: !!bt && bt.offsetParent !== null, one: [...t.children].filter(x => x.offsetParent).every(x => Math.abs(x.getBoundingClientRect().top - t.children[0].getBoundingClientRect().top) < 2) }; });
    console.log('topbar', JSON.stringify(tb)); ok('상단 메뉴에 [게임 기록] · 한 줄 · 화면 안', tb.vis && tb.l >= 0 && tb.r <= tb.w && tb.one);
    await p.click('#btn-glog'); await p.waitForTimeout(200); let v = await rows(p); console.log(JSON.stringify(v, null, 1));
    const hm = await p.evaluate(() => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':'; });
    ok('창 열림 · 새 기록이 위', v.open && /전설/.test(v.rows[0]) && /바포메트/.test(v.rows[2]));
    ok('시:분 표시', v.rows[0].startsWith(hm) && /^\d\d:\d\d /.test(v.rows[3] || ''));
    ok('접속 알림은 안 남김', !v.rows.some(r => /접속했습니다/.test(r)) && v.rows.length === 4);   // 오늘 3 + 어제 1
    ok('날짜 줄 (오늘·어제)', v.days.length === 2 && /오늘/.test(v.days[0]) && /어제/.test(v.days[1]));
    ok('글자 색 유지', await p.evaluate(() => getComputedStyle(document.querySelector('#glog-list .gl-row span')).color !== 'rgb(233, 226, 207)'));
    await p.screenshot({ path: 'dev/out/gamelog_pc.png' });
    // 열려 있을 때 새 공지 → 바로 추가
    await p.evaluate(() => __T.ANN_('보스 등장: 화산 어딘가에 이프리트가 나타났습니다!', '#ff7a5a', 'boss')); await p.waitForTimeout(100); v = await rows(p); ok('열린 채로 새 공지 바로 보임', /이프리트/.test(v.rows[0]) && v.rows.length === 5);
    // 200줄 한도
    await p.evaluate(() => { for (let i = 0; i < 230; i++) __T.GLOG_.add('테스트 공지 ' + i, '#ffd86a'); }); v = await rows(p); ok('최대 200줄 (오래된 것부터 지움)', v.rows.length === 200 && /테스트 공지 229/.test(v.rows[0]) && /테스트 공지 30$/.test(v.rows[199]) && v.n === '200 / 200줄');
    await p.keyboard.press('Escape'); await p.waitForTimeout(150); ok('Esc → 닫힘', !(await rows(p)).open);
    await p.click('#btn-glog'); await p.waitForTimeout(100); await p.click('#logwin [data-closewin=logwin]'); ok('[닫기]', !(await rows(p)).open);
    // 다시 접속해도 남아 있음
    await p.reload(); await p.waitForTimeout(1500); ok('새로고침 뒤에도 기록 유지', await p.evaluate(() => JSON.parse(localStorage.getItem('aden_glog') || '[]').length === 200));
    await ctx.close(); }
  { const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push('mob: ' + e.message));
    await login(p, { cls: 'elf', name: 'glMB', init: () => { try { localStorage.setItem('aden_mob', '1'); } catch (e) {} } });
    await p.evaluate(() => { for (let i = 0; i < 30; i++) __T.ANN_(`요정${i}님이 [영웅] 아이템을 얻었습니다! 이름이 조금 긴 공지가 줄바꿈 되는지 확인`, '#c77dff'); });
    await p.tap('#mob-menu-b'); await p.waitForTimeout(250); ok('모바일 메뉴에 [게임 기록]', await p.evaluate(() => { const b = document.getElementById('mm-glog'); return !!b && b.offsetParent !== null; }));
    await p.tap('#mm-glog'); await p.waitForTimeout(300); const v = await rows(p); ok('모바일: 메뉴 → 게임 기록 창', v.open && v.rows.length >= 30);
    const fit = await p.evaluate(() => { const r = document.getElementById('logwin').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1; }); ok('모바일: 창이 화면 안', fit);
    await p.screenshot({ path: 'dev/out/gamelog_mobile.png' }); await ctx.close(); }
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
