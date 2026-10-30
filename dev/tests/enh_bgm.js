// 10/30 강화 BGM: 저장값이 ON이어도 게임을 켤 때마다 OFF로 시작 (bash dev/runkt.sh dev/tests/enh_bgm.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'ebT' });
  const a = await p.evaluate(() => { const S = __T.SND_; const v0 = S.get().enhOn; S.set({ enhOn: true }); return { v0, stored: JSON.parse(localStorage.getItem('aden_snd') || '{}').enhOn }; });
  await p.reload(); await p.waitForFunction(() => window.__T && __T.SND_, null, { timeout: 30000 });   // 새로 켜기
  const c = await p.evaluate(() => ({ after: __T.SND_.get().enhOn }));
  const ok = a.v0 === false && a.stored === true && c.after === false;
  console.log(JSON.stringify({ a, c }), ok ? 'ALL OK' : 'FAIL'); console.log(errs.join('\n') || 'no errors'); await b.close(); })();
