// 11/5 프로듀서: 캐릭터 창 [변신 카드] 칸에 지금 변신 중인 카드 그림·등급 표시 (변신 안 하면 예전처럼 '변신 카드')
//   KT_PORT=8892 bash dev/runkt.sh dev/tests/polyslot.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'pslot' }); await p.evaluate(() => { __T.hero.lv = 60; const cw = document.getElementById('charwin'); cw.hidden = false; __T.INV.render(); });
  const st = () => p.evaluate(() => { const b = document.getElementById('cw-poly'), im = b.querySelector('img'); return { on: b.classList.contains('on'), txt: b.textContent.trim(), src: !!(im && im.getAttribute('src')), gc: b.style.getPropertyValue('--gc'), title: b.title }; });
  await p.waitForTimeout(1300); const s0 = await st();
  const id = await p.evaluate(() => { const D = window.PCG.state(); const id = ['orc_warrior', 'orc', 'goblin'].find(k => true); D.cards[id] = 2; window.PCG.setSlot(id); return id; });
  await p.waitForTimeout(2600); const s1 = await st(); await (await p.$('#charwin')).screenshot({ path: 'dev/out/polyslot.png' });
  await p.evaluate(() => window.PCG.clearSlot()); await p.waitForTimeout(1400); const s2 = await st();
  console.log(JSON.stringify({ id, s0, s1, s2 }));
  ok(!s0.on && /변신\s*카드/.test(s0.txt), `변신 안 했을 때: '변신 카드' 글자 (${s0.txt})`);
  ok(s1.on && s1.src && !!s1.gc && /변신 중/.test(s1.title), `변신 중: 카드 그림·등급 테두리·제목 (${s1.title})`);
  ok(!s2.on && /변신\s*카드/.test(s2.txt), '변신을 빼면 다시 글자');
  ok(!errs.length, '오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
