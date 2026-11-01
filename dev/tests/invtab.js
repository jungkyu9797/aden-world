// 11/1 인벤 [재료]·[가호] 탭 (KT_PORT=8797 bash dev/runkt.sh dev/tests/invtab.js) — 스크린샷 dev/out/invtab*.png
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  for (const vp of [{ width: 1280, height: 800 }, { width: 844, height: 390, mob: 1 }]) {
    const ctx = await b.newContext(vp.mob ? { viewport: { width: vp.width, height: vp.height }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: vp }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); const M = vp.mob ? '모바일: ' : '';
    await login(p, { cls: 'knight', name: 'ivT' + (vp.mob ? 'm' : 'p'), init: vp.mob ? () => { try { localStorage.setItem('aden_mob', '1'); } catch (e) {} } : undefined });
    await p.evaluate(() => { const T = __T, I = T.ITEMS, pick = f => Object.keys(I).find(k => f(I[k], k));
      const ids = { ward: 'immortal_ward', burnt: 'burnt_ward', gaho: pick(d => d.gaho), frag: pick((d, k) => /^gfrag_/.test(k)), mat1: 'gold_wing', mat2: pick((d, k) => k === 'pure_elixir') || 'silver_wing', pot: 'red_potion', scr: pick(d => /주문서/.test(d.name) && d.use) };
      const bag = Object.values(ids).filter(Boolean).map(id => ({ id, n: I[id].stack ? 3 : 1 })); bag.push({ id: 'lg_sword', n: 1 }); T.INV.load({ bag, bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); window.__IDS = ids; T.INV.toggleWin('invwin'); });
    await p.waitForTimeout(500);
    const tab = async t => { await p.evaluate(t => document.querySelector(`#inv-tabs button[data-t="${t}"]`).click(), t); await p.waitForTimeout(250); return p.evaluate(() => [...document.querySelectorAll('#invwin .slots .slot[data-i], #invwin [data-i]')].map(e => e.dataset.id || e.getAttribute('data-id') || e.title || '').filter(Boolean)); };
    const names = await p.evaluate(() => [...document.querySelectorAll('#inv-tabs button')].map(b => b.textContent.trim()));
    console.log(M, JSON.stringify(names)); ok(M + '탭: 전체·장비·물약·주문서·재료·가호·마법인형', names.map(x => x.replace(/\s*\d+$/, '')).join(',') === '전체,장비,물약,주문서,재료,가호,마법인형');
    const cats = await p.evaluate(() => { const T = __T, I = T.ITEMS, ids = window.__IDS, out = {}; for (const k in ids) if (ids[k]) out[k] = T.INV.cat ? T.INV.cat(I[ids[k]]) : null; return out; });
    const cnt = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#inv-tabs button')].map(b => [b.dataset.t, +(b.querySelector('small').textContent || 0)])));
    console.log(M, JSON.stringify(cnt)); ok(M + '개수: 가호 4종(불멸·타버린·보스 가호·가호조각) · 재료 2종 · 물약 1 · 주문서 1 · 장비 1', cnt.gaho === 4 && cnt.mat === 2 && cnt.pot === 1 && cnt.scr === 1 && cnt.eq === 1 && cnt.all >= 9);
    await p.evaluate(() => document.querySelector('#inv-tabs button[data-t="gaho"]').click()); await p.waitForTimeout(250);
    const shown = await p.evaluate(() => [...document.querySelectorAll('#inv-grid .slot')].filter(c => c.dataset.itip).map(c => c.dataset.itip.split('\n')[0]));
    console.log(M, 'gaho tab', JSON.stringify(shown));
    ok(M + '[가호] 누르면 가호 4칸만', shown.length === 4 && shown.every(t => /가호/.test(t)));
    const fit = await p.evaluate(() => { const tb = document.getElementById('inv-tabs'), r = tb.getBoundingClientRect(); return [...tb.querySelectorAll('button')].every(b => { const q = b.getBoundingClientRect(); return q.right <= r.right + 1 && b.scrollWidth <= b.clientWidth + 2; }); });
    ok(M + '탭 글자가 넘치지 않음', fit);
    await p.locator('#inv-tabs').screenshot({ path: vp.mob ? 'dev/out/invtab_mob.png' : 'dev/out/invtab.png' });
    await ctx.close(); }
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
