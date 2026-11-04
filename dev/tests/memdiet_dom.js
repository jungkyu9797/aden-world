// 11/4 메모리 다이어트: 오래 켜 두면 DOM(화면 요소) 수가 늘어나는 곳 찾기 — 절전 화면 + 자동사냥 DMIN분 동안 1분마다 부모(id)별 요소 수
//   DMIN=8 KT_PORT=8904 KT_TO=900 bash dev/runkt.sh dev/tests/memdiet_dom.js
const { chromium } = require('playwright'); const login = require('../tq.js'); const fs = require('fs');
const MIN = +(process.env.DMIN || 8), Z = +(process.env.DZ || 23), SAV = process.env.DSAVER !== '0';
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 760 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'mdom' });
  await p.evaluate(() => { const T = __T; document.getElementById('gp-lv').value = 61; document.getElementById('gp-apply').click(); T.GOD_INV = true; T.BUFF.invis = 0; T.INV.add('clear_potion', 2000, true); });
  await p.evaluate(z => __T.TOWN.toZone(z), Z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', Z, { timeout: 90000 }); await p.waitForTimeout(2000);
  await p.evaluate(sv => { const T = __T; T.AUTO.setCfg({ loot: true, retHp: 0, lowPot: false, sell: false, refillHome: false }); if (!T.AUTO.on()) T.AUTO.toggle(); if (sv) window.SAVER.enter(); }, SAV);
  const count = () => p.evaluate(() => { const o = {}; const path = e => { const L = []; for (let x = e; x && x !== document.body && L.length < 3; x = x.parentElement) if (x.id) L.unshift('#' + x.id); return L.join('>') || e.tagName; };
    for (const e of document.body.getElementsByTagName('*')) { const k = e.id ? path(e.parentElement || e) : path(e); o[k] = (o[k] || 0) + 1; } return { all: document.getElementsByTagName('*').length, o }; });
  const L = [await count()]; console.log('min 0 dom', L[0].all);
  for (let m = 1; m <= MIN; m++) { await p.waitForTimeout(60000); const c = await count(); L.push(c); console.log('min', m, 'dom', c.all); }
  const a = L[0].o, z = L[L.length - 1].o, d = Object.keys({ ...a, ...z }).map(k => [k, (z[k] || 0) - (a[k] || 0)]).filter(x => x[1]).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 15);
  console.log('grew:', JSON.stringify(d)); fs.writeFileSync('dev/out/memdiet_dom.json', JSON.stringify({ L: L.map(x => x.all), d }, null, 1));
  console.log(errs.slice(0, 5).join('\n') || 'no errors'); await b.close(); })();
