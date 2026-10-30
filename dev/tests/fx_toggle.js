// 장비 이펙트 켬/끔 (캐릭터 창 미리보기 밑 버튼) — +9 영웅 무기·영웅 방어구를 입혀 켬/끔 각각 필드·캐릭터 창 확인, 새로고침 뒤 설정 유지 (KT_PORT=8772 bash dev/runkt.sh dev/tests/fx_toggle.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'fxT' });
  await p.evaluate(() => { const T = __T; T.hero.lv = 50; T.GOD_INV = true;
    T.INV.load({ bag: [{ id: 'dk_sword', n: 1, en: 9, on: 'weapon' }, { id: 'dk_helm', n: 1, en: 6, on: 'helm' }, { id: 'dk_armor', n: 1, en: 3, on: 'armor' }, { id: 'long_sword', n: 1, en: 9 }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); T.INV.render(); });
  // 미리보기 캔버스·필드 주인공 주변의 '빛' 픽셀(보라·밝은 보라) 세기
  const glowPx = () => p.evaluate(() => { const purple = (D, n) => { let k = 0; for (let i = 0; i < n * 4; i += 4) { const r = D[i], g = D[i + 1], bl = D[i + 2]; if (bl > 150 && r > 90 && g < 110 && bl - g > 70) k++; } return k; };
    const c = document.getElementById('cw-look'), pv = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const cv = document.getElementById('cv'), r = cv.getBoundingClientRect(), [sx, sy] = __T.scr(__T.hero.x, __T.hero.z), sc = cv.width / r.width, x0 = Math.max(0, Math.round((sx - r.left - 90) * sc)), y0 = Math.max(0, Math.round((sy - r.top - 170) * sc)), w = Math.round(180 * sc), h = Math.round(200 * sc);
    const fd = cv.getContext('2d').getImageData(x0, y0, w, h).data; return { preview: purple(pv, c.width * c.height), field: purple(fd, w * h) }; });
  const avg = async () => { let a = { preview: 0, field: 0 }; for (let i = 0; i < 6; i++) { const q = await glowPx(); a.preview += q.preview; a.field += q.field; await p.waitForTimeout(120); } return a; };
  const shotField = async f => { const [sx, sy] = await p.evaluate(() => __T.scr(__T.hero.x, __T.hero.z)); await p.screenshot({ path: f, clip: { x: Math.max(0, sx - 160), y: Math.max(0, sy - 190), width: 320, height: 240 } }); };
  // 필드로 (이야기섬)
  await p.evaluate(() => { document.querySelectorAll('.gw').forEach(w => w.hidden = true); __T.TOWN.toZone(1); }); await p.waitForFunction(() => __T.SCENE === 'field', null, { timeout: 20000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => { __T.ZOOMT = 2; }); await p.waitForTimeout(800);
  // 캐릭터 창 열기
  await p.evaluate(() => { const w = document.getElementById('charwin'); if (w.hidden) __T.INV.toggle('charwin'); }); await p.waitForTimeout(500);
  const btn0 = await p.evaluate(() => { const x = document.getElementById('cw-fx'), r = x.getBoundingClientRect(); return { text: x.textContent, pressed: x.getAttribute('aria-pressed'), visible: r.width > 0 && r.height > 0, w: Math.round(r.width), h: Math.round(r.height) }; });
  console.log('button (default):', JSON.stringify(btn0));
  const on = await avg(); console.log('ON  glow pixels:', JSON.stringify(on));
  const cw = await p.$('#charwin'); await cw.screenshot({ path: 'dev/out/fx_btn.png' });
  await shotField('dev/out/fx_on.png');
  // 끔
  await p.click('#cw-fx'); await p.waitForTimeout(500);
  const btn1 = await p.evaluate(() => ({ text: document.getElementById('cw-fx').textContent, pressed: document.getElementById('cw-fx').getAttribute('aria-pressed'), ls: localStorage.getItem('aden_eqfx'), msg: __T.log.slice(-1).map(x => x.t || x.text || x)[0] }));
  console.log('after click:', JSON.stringify(btn1));
  const off = await avg(); console.log('OFF glow pixels:', JSON.stringify(off));
  await cw.screenshot({ path: 'dev/out/fx_btn_off.png' });
  await shotField('dev/out/fx_off.png');
  // 데스나이트 세트(변신) 불티: 끔이면 생기지 않음
  await p.evaluate(() => __T.INV.load({ bag: [{ id: 'dk_sword', n: 1, en: 9, on: 'weapon' }, { id: 'dk_helm', n: 1, on: 'helm' }, { id: 'dk_armor', n: 1, on: 'armor' }, { id: 'dk_gloves', n: 1, on: 'gloves' }, { id: 'dk_boots', n: 1, on: 'boots' }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } })); await p.waitForTimeout(1500);
  await shotField('dev/out/fx_off_dkset.png');
  await p.click('#cw-fx'); await p.waitForTimeout(1500); await shotField('dev/out/fx_on_dkset.png'); await p.click('#cw-fx'); await p.waitForTimeout(300);
  // 새로고침 뒤 유지
  await p.reload(); await p.waitForSelector('#lg-mode', { state: 'visible' });
  console.log('after reload (before login):', JSON.stringify(await p.evaluate(() => ({ text: document.getElementById('cw-fx').textContent, ls: localStorage.getItem('aden_eqfx') }))));
  await login(p, { cls: 'knight', name: 'fxT2' });
  await p.evaluate(() => { __T.INV.load({ bag: [{ id: 'dk_sword', n: 1, en: 9, on: 'weapon' }, { id: 'dk_helm', n: 1, en: 6, on: 'helm' }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); __T.INV.render(); const w = document.getElementById('charwin'); if (w.hidden) __T.INV.toggle('charwin'); }); await p.waitForTimeout(700);
  const re = await avg(); console.log('after reload glow pixels (should stay off):', JSON.stringify(re), 'button:', await p.textContent('#cw-fx'));
  await p.click('#cw-fx'); await p.waitForTimeout(500); const re2 = await avg(); console.log('turned back ON:', JSON.stringify(re2), 'button:', await p.textContent('#cw-fx'), 'ls:', await p.evaluate(() => localStorage.getItem('aden_eqfx')));
  // 모바일 화면 (html.mob): 버튼 보이고 눌림
  const m = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); const mp = await m.newPage(); mp.on('pageerror', e => errs.push('mobile: ' + e.message));
  await login(mp, { cls: 'knight', name: 'fxM' });
  await mp.evaluate(() => { __T.INV.load({ bag: [{ id: 'dk_sword', n: 1, en: 9, on: 'weapon' }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); const w = document.getElementById('charwin'); if (w.hidden) __T.INV.toggle('charwin'); }); await mp.waitForTimeout(600);
  const mob = await mp.evaluate(() => ({ mob: document.documentElement.classList.contains('mob'), MOBILE: __T.MOBILE }));
  await mp.evaluate(() => document.getElementById('cw-fx').scrollIntoView({ block: 'center' })); await mp.waitForTimeout(200);
  const mb = await mp.evaluate(() => { const r = document.getElementById('cw-fx').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, inView: r.top >= 0 && r.bottom <= innerHeight }; });
  await mp.tap('#cw-fx'); await mp.waitForTimeout(300);
  console.log('mobile:', JSON.stringify(mob), 'btn rect', JSON.stringify(mb), 'after tap:', await mp.textContent('#cw-fx'));
  await mp.screenshot({ path: 'dev/out/fx_btn_mobile.png' });
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
