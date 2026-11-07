// 11/7 프로듀서: 버프 아이콘에 드래곤의 진주 남은 개수 (초록·용기 물약처럼 오른쪽 아래 숫자 · 0개면 빨강)
//   KT_PORT=8909 bash dev/runkt.sh dev/tests/pearlcnt.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'pcnt' });
  await p.evaluate(() => { const P = CanvasRenderingContext2D.prototype, F = P.fillText; window.__TXT = []; P.fillText = function (t, x, y) { if (window.__TXT.length < 4000) window.__TXT.push([String(t), x, y, this.fillStyle]); return F.apply(this, arguments); }; });
  const look = () => p.evaluate(async () => { window.__TXT.length = 0; await new Promise(r => setTimeout(r, 400)); const R = (__T.BUFFRECT_ || []).find(r => r[4] === 'pearl'); if (!R) return null; const [x, y, sz] = R;
    const t = window.__TXT.filter(([s, tx, ty]) => Math.abs(tx - (x + sz - 1)) < 0.6 && Math.abs(ty - (y + sz - 4)) < 0.6).pop(); return t ? { n: t[0], c: t[3] } : { n: null }; });
  await p.evaluate(() => { const T = __T; T.INV.add('dragon_pearl', 6, true); const e = T.INV.bag().find(x => x.id === 'dragon_pearl'); T.INV.use(e); });
  const a = await look(); console.log('a', JSON.stringify(a));
  ok(a && a.n === '5', `진주 1개 사용 → 버프 아이콘에 남은 개수 5 (${a && a.n})`);
  await p.evaluate(() => { const T = __T; const e = T.INV.bag().find(x => x.id === 'dragon_pearl'); e.n = 1; T.INV.take ? T.INV.take('dragon_pearl', 1) : (e.n = 0); T.INV.render(); });
  const c = await look(); console.log('c', JSON.stringify(c));
  ok(c && c.n === '0' && /ff6a5a/i.test(c.c || ''), `다 쓰면 0 (빨강) (${c && c.n} ${c && c.c})`);
  await p.evaluate(() => { __T.INV.add('dragon_pearl', 5, true); __T.INV.add('green_potion', 35, true); __T.BUFF.haste1 = 600; __T.INV.render(); }); await p.waitForTimeout(400);
  { const R = await p.evaluate(() => { const r = (__T.BUFFRECT_ || []).find(q => q[4] === 'pearl'), z = __T.curZ, b = document.querySelector('canvas').getBoundingClientRect(); return r ? [b.left + r[0] * z, b.top + r[1] * z, r[2] * z] : null; }); if (R) await p.screenshot({ path: 'dev/out/pearlcnt.png', clip: { x: Math.max(0, R[0] - 200), y: Math.max(0, R[1] - 12), width: 300, height: R[2] + 24 } }); }
  ok(!errs.length, '오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
