// 접속자 정보 창 — 접속자 목록(월드 서버 창)에서 이름을 누르면 그 캐릭터의 레벨·경험치·전투력·위치·착용 장비·모습 (KT_PORT=8772 bash dev/runkt.sh dev/tests/whois.js)
// 같은 브라우저 탭끼리(?mp=bc · BroadcastChannel)로 2명 + 예전 버전 클라이언트 흉내(xp·wq 없는 presence) 1명
const { chromium } = require('playwright'); const login = require('../tq.js'); const PORT = process.env.KT_PORT || 8766;
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const errs = [];
  const page = async (nm, cls) => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(nm + ': ' + e.message)); await login(p, { cls, name: nm, mp: true }); return p; };
  const A = await page('whoA', 'knight'), B = await page('whoB', 'knight');
  await B.evaluate(() => { const T = __T, doll = Object.keys(T.ITEMS).find(k => T.ITEMS[k].doll);
    T.INV.load({ bag: [{ id: 'dk_sword', n: 1, en: 9, blessed: true, attr: { el: 'fire', lv: 2 }, on: 'weapon' }, { id: 'dk_helm', n: 1, en: 6, on: 'helm' }, { id: 'dk_armor', n: 1, en: -1, on: 'armor' }, { id: 'silver_ring', n: 1, en: 3, on: 'ring1' }, { id: 'amulet', n: 1, on: 'amulet' }, { id: doll, n: 1, on: 'doll' }, { id: 'red_potion', n: 50 }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } });
    T.hero.lv = 52; T.hero.exp = Math.floor(T.needExp(52) * 0.437); T.INV.render(); });
  // 예전 버전 클라이언트 흉내: xp·wq·e 일부만
  const C = await ctx.newPage(); await C.goto(`http://127.0.0.1:${PORT}/CREDITS.md`);
  await C.evaluate(() => { const ch = new BroadcastChannel('aden-mp'); window.__ch = ch; const pr = { n: '옛버전유저', c: 'elf', lv: 31, z: 'town', cp: 2345, e: { weapon: 'long_sword', helm: 'dk_helm' }, hp: 100, hm: 100, x: 30, y: 30 }; window.__t = setInterval(() => ch.postMessage({ t: 'p', peer: 'pOLDver1', presence: pr }), 700); });
  await A.waitForTimeout(3500);
  console.log('B payload xp/wq:', JSON.stringify(await B.evaluate(() => { const P = __T.NET.dbgPayload(); return { xp: P.xp, wq: P.wq, e: P.e, size: JSON.stringify(P).length }; })));
  // A: 접속자 목록 열기 (BroadcastChannel 시험 모드는 목록이 '연결 안 됨'으로 보여서 시험용으로 켬)
  await A.evaluate(() => { __T.NET.hasArtRoom = () => true; }); await A.waitForFunction(() => !document.getElementById('btn-mp').hidden, null, { timeout: 5000 }); await A.click('#btn-mp'); await A.waitForTimeout(1300);
  const names = await A.evaluate(() => [...document.querySelectorAll('#mp-list .mp-nm')].map(x => x.textContent + ' → ' + x.dataset.who)); console.log('list names:', JSON.stringify(names));
  const bPeer = await B.evaluate(() => __T.NET.me());
  await A.click(`#mp-list .mp-nm[data-who="${bPeer}"]`); await A.waitForTimeout(800);
  const info = () => A.evaluate(() => { const w = document.getElementById('whowin'); return { open: !w.hidden, hd: document.getElementById('who-hd').innerText.replace(/\s+/g, ' '), info: document.getElementById('who-info').innerText.replace(/\s+/g, ' '), eq: [...document.querySelectorAll('#who-eq .who-it:not(.none)')].map(x => x.innerText.replace(/\s+/g, ' ')), empty: document.querySelectorAll('#who-eq .who-it.none').length, note: document.getElementById('who-note').textContent }; });
  const i1 = await info(); console.log('whois B:', JSON.stringify(i1));
  const tipW = await A.evaluate(() => (document.querySelector('#who-eq .who-it[data-itip]') || {}).dataset.itip); console.log('weapon tip:', JSON.stringify(tipW));
  const pv = await A.evaluate(() => { const c = document.getElementById('who-look'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 200) n++; return n; }); console.log('preview opaque px:', pv);
  await (await A.$('#whowin')).screenshot({ path: 'dev/out/whois.png' });
  { const h1 = await A.evaluate(() => document.getElementById('who-eq').innerHTML); await A.waitForTimeout(1100); const h2 = await A.evaluate(() => document.getElementById('who-eq').innerHTML); let k = 0; while (k < h1.length && h1[k] === h2[k]) k++; console.log('eq html stable:', h1 === h2, h1 === h2 ? '' : JSON.stringify([h1.slice(k - 80, k + 80), h2.slice(k - 80, k + 80)])); }
  // 마우스 올리기 → 아이템 툴팁 (이름)
  const it = await A.$('#who-eq .who-it[data-itip]'); const bb = await it.boundingBox(); await A.mouse.move(bb.x + 15, bb.y + 15); await A.waitForTimeout(300);
  console.log('hover tip:', JSON.stringify(await A.evaluate(() => { const t = document.getElementById('stat-tip'); return { shown: !t.hidden, text: t.innerText }; })));
  await A.screenshot({ path: 'dev/out/whois_full.png' });
  // 정보가 바뀌면 갱신
  await B.evaluate(() => { __T.hero.lv = 53; __T.hero.exp = 0; __T.INV.load({ bag: [{ id: 'dk_sword', n: 1, en: 10, on: 'weapon' }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); }); await A.waitForTimeout(1800);
  const i2 = await info(); console.log('after B changed:', JSON.stringify({ info: i2.info, eq: i2.eq, empty: i2.empty }));
  // 예전 버전 유저
  await A.click('#mp-list .mp-nm[data-who="pOLDver1"]'); await A.waitForTimeout(700); const i3 = await info(); console.log('old client:', JSON.stringify(i3));
  await (await A.$('#whowin')).screenshot({ path: 'dev/out/whois_old.png' });
  // 나가면 '접속 종료'
  await C.evaluate(() => { clearInterval(window.__t); window.__ch.postMessage({ t: 'bye', peer: 'pOLDver1' }); }); await A.waitForTimeout(1500); const i4 = await info(); console.log('after leave:', JSON.stringify({ hd: i4.hd, note: i4.note, open: i4.open }));
  await (await A.$('#whowin')).screenshot({ path: 'dev/out/whois_gone.png' });
  // ESC로 닫힘 · 내 이름 → 내 캐릭터 창
  await A.keyboard.press('Escape'); await A.waitForTimeout(200); console.log('esc closes:', await A.evaluate(() => document.getElementById('whowin').hidden));
  await A.evaluate(() => { const w = document.getElementById('mpwin'); if (w.hidden) document.getElementById('btn-mp').click(); }); await A.waitForTimeout(1100);
  await A.click('#mp-list .mp-nm[data-who="me"]'); await A.waitForTimeout(300); console.log('my name → charwin open:', await A.evaluate(() => !document.getElementById('charwin').hidden));
  // 모바일 (html.mob): 다른 컨텍스트 — 혼자 + 예전 버전 흉내 대신 B 같은 장비를 가진 가짜 presence
  const mc = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); const M = await mc.newPage(); M.on('pageerror', e => errs.push('mobile: ' + e.message));
  await login(M, { cls: 'knight', name: 'whoM', mp: true }); const F = await mc.newPage(); await F.goto(`http://127.0.0.1:${PORT}/CREDITS.md`);
  await F.evaluate(() => { const ch = new BroadcastChannel('aden-mp'); const pr = { n: '모바일상대', c: 'wizard', lv: 47, xp: 512, z: 'isle1', cp: 9876, e: { weapon: 'dk_sword', helm: 'dk_helm', armor: 'dk_armor' }, eg: { weapon: 9, helm: 8 }, wq: { weapon: '+9*@f2', helm: '+6', amulet: 'amulet', ring1: 'silver_ring+3' }, hp: 100, hm: 100, x: 30, y: 30 }; setInterval(() => ch.postMessage({ t: 'p', peer: 'pMOBfake', presence: pr }), 700); });
  await M.waitForTimeout(2500); await M.evaluate(() => { __T.NET.hasArtRoom = () => true; }); await M.waitForTimeout(1200);
  await M.evaluate(() => document.getElementById('esc-mp').click()); await M.waitForTimeout(1200);
  await M.tap('#mp-list .mp-nm[data-who="pMOBfake"]'); await M.waitForTimeout(800);
  console.log('mobile:', JSON.stringify(await M.evaluate(() => { const w = document.getElementById('whowin'), r = w.getBoundingClientRect(); return { mob: document.documentElement.classList.contains('mob'), open: !w.hidden, rect: [r.left, r.top, r.width, r.height].map(Math.round), vh: innerHeight, info: document.getElementById('who-info').innerText.replace(/\s+/g, ' '), eq: document.querySelectorAll('#who-eq .who-it:not(.none)').length }; })));
  await M.screenshot({ path: 'dev/out/whois_mobile.png' });
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
