// v190 연금술 [자동 진행] 테스트 (bash dev/runkt.sh dev/tests/alch_auto.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'alA' });
  const ids = await p.evaluate(() => { const T = __T, L = Object.keys(T.ITEMS).filter(k => { const d = T.ITEMS[k]; return d.slot && d.slot !== 'doll' && (d.rar || '일반') === '일반' && !d.hidden; }).slice(0, 4);
    const bag = []; for (let i = 0; i < 16; i++) bag.push({ id: L[i % L.length], n: 1, en: 0 }); bag.push({ id: L[0], n: 1, en: 3 });   // 강화된 1개는 빠져야 함
    T.INV.load({ bag, bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); document.getElementById('invwin').hidden = false; T.INV.render(); return L; });
  const cnt = () => p.evaluate(() => { const T = __T; const o = {}; for (const e of T.INV.bag()) { const r = T.ITEMS[e.id].rar || '일반'; o[r] = (o[r] || 0) + (e.n || 1); } return o; });
  console.log('before', JSON.stringify(await cnt()));
  await p.evaluate(() => document.getElementById('btn-alch').click()); await p.waitForTimeout(300);
  await p.click('#alchwin [data-alg="일반"]'); await p.waitForTimeout(200);
  await p.click('#al-auto'); await p.waitForTimeout(300);
  console.log('ask', await p.evaluate(() => document.getElementById('ask-sub').textContent.slice(0, 160)));
  await p.click('#ask-yes'); await p.waitForTimeout(1200);
  console.log('running', await p.evaluate(() => ({ btn: document.getElementById('al-auto').textContent, go: document.getElementById('al-go').disabled, bulk: document.querySelector('#alchwin [data-alg="일반"]').disabled })).then(JSON.stringify));
  await p.screenshot({ path: 'dev/out/alch_auto_run.png' });
  { const t0 = Date.now(); while (Date.now() - t0 < 20000 && await p.evaluate(() => __T.ALCH ? __T.ALCH.auto() : window.ALCH.auto())) await p.waitForTimeout(300); }
  console.log('after', JSON.stringify(await cnt()), 'btn', await p.evaluate(() => document.getElementById('al-auto').textContent));
  console.log('log', JSON.stringify(await p.evaluate(() => __T.log.slice(-2).map(x => x.t || x.text || x))));
  // 중지 버튼
  await p.evaluate(() => { const T = __T, L = Object.keys(T.ITEMS).filter(k => { const d = T.ITEMS[k]; return d.slot && d.slot !== 'doll' && (d.rar || '일반') === '일반' && !d.hidden; }).slice(0, 4); for (let i = 0; i < 30; i++) T.INV.add(L[i % 4], 1, true); T.INV.render(); });
  await p.click('#alchwin [data-alg="일반"]'); await p.click('#al-auto'); await p.waitForTimeout(200); await p.click('#ask-yes'); await p.waitForTimeout(1500); await p.click('#al-auto');
  { const t0 = Date.now(); while (Date.now() - t0 < 8000 && await p.evaluate(() => window.ALCH.auto())) await p.waitForTimeout(200); }
  console.log('stop', JSON.stringify(await p.evaluate(() => __T.log.slice(-1).map(x => x.t || x.text || x))), JSON.stringify(await cnt()));
  await p.screenshot({ path: 'dev/out/alch_auto_done.png' });
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
