// 11/4 새 버전 확인 주기 2시간 (예전 2분) · 켤 때 15초 뒤 한 번은 그대로
//   KT_PORT=8890 bash dev/runkt.sh dev/tests/updint.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.__IV = []; window.__TO = []; const si = window.setInterval, st = window.setTimeout; window.setInterval = function (f, ms, ...a) { window.__IV.push([f && f.name, ms]); return si.call(this, f, ms, ...a); }; window.setTimeout = function (f, ms, ...a) { if (f && /^check/.test(f.name || '')) window.__TO.push([f.name, ms]); return st.call(this, f, ms, ...a); }; });
  await login(p, { cls: 'knight', name: 'uiv' });
  const r = await p.evaluate(() => ({ iv: window.__IV.filter(x => /^check/.test(x[0] || '')), to: window.__TO }));
  console.log(JSON.stringify(r)); ok(r.iv.some(x => x[1] === 7200000) && !r.iv.some(x => x[1] === 120000), '새 버전 확인 주기 2시간 (2분 아님)'); ok(r.to.some(x => x[1] <= 15000), '켤 때 한 번은 바로(15초 뒤) 확인');
  console.log(errs.slice(0, 3).join('\n') || 'no errors'); ok(!errs.length, '오류 없음'); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
