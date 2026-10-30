// 화룡 갑옷 3종: 강화 1당 화염 저항 +3 (KT_PORT=8780 bash dev/runkt.sh dev/tests/fireen.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'feKN' });
  const it = await p.evaluate(() => ['fd_plate', 'fd_robe', 'fd_leather'].map(id => ({ id, fr: __T.ITEMS[id].fireRes, en: __T.ITEMS[id].fireResEn, opt: __T.ITEMS[id].optTxt })));
  console.log(JSON.stringify(it)); ok('화룡 갑옷 3종 기본 50 · 강화 1당 3', it.every(x => x.fr === 50 && x.en === 3));
  const at = async en => p.evaluate(en => { const T = __T; T.HERO.lv = 60; T.INV.load({ bag: [{ id: 'fd_plate', n: 1, en, on: 'armor' }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); document.getElementById('invwin').hidden = false; T.INV.render();
    const c = [...document.querySelectorAll('#inv-grid .slot')].find(x => /화룡의 갑옷/.test(x.dataset.itip || '')); return { fr: T.INV.cx('fireRes'), res: T.elemRes('fire'), tip: c ? c.dataset.itip : '', cw: (document.getElementById('cw-res') || {}).textContent }; }, en);
  const a0 = await at(0), a7 = await at(7), am = await at(-1); console.log(JSON.stringify({ a0: [a0.fr, a0.res], a7: [a7.fr, a7.res], am: am.fr })); console.log(a7.tip);
  ok('+0 = 50', a0.fr === 50 && a0.res === 50); ok('+7 = 71', a7.fr === 71 && a7.res === 71); ok('음수 강화는 기본만', am.fr === 50);
  ok('설명: 화염 저항 +71 (강화 +21) · 강화 1당 화염 저항 +3', /화염 저항 \+71 \(강화 \+21\)/.test(a7.tip) && /강화 1당 화염 저항 \+3/.test(a7.tip) && !/\(강화/.test(a0.tip));
  await at(7); await p.evaluate(() => { const T = __T; document.getElementById('charwin').hidden = false; T.INV.render(); }); await p.waitForTimeout(200);
  ok('캐릭터 창 불 저항 71', /\/ 71 \//.test(await p.evaluate(() => document.getElementById('cw-res').textContent)));
  await p.screenshot({ path: 'dev/out/fireen.png' });
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
