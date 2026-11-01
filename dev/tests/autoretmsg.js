// 11/1 자동사냥 시작 → 화면 가운데 큰 안내 4초 (KT_PORT=8799 bash dev/runkt.sh dev/tests/autoretmsg.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  for (const [w, h, nm] of [[1280, 800, 'pc'], [390, 800, 'mob']]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); p.on('pageerror', e => errs.push(e.message));
    await login(p, { cls: 'knight', name: 'amK' + nm });
    await p.evaluate(() => __T.TOWN.toZone(2)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 2 && __T.SCENE === 'field', null, { timeout: 20000 }); await p.waitForTimeout(800);
    await p.evaluate(() => { __T.GOD_INV = true; __T.AUTO.toggle(); }); await p.waitForTimeout(600);
    const s = await p.evaluate(() => { const el = document.getElementById('cnote'), r = el && el.getBoundingClientRect(), cs = el && getComputedStyle(el); return el && { t: el.textContent, on: el.classList.contains('on'), op: +cs.opacity, cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2), w: Math.round(r.width), pe: cs.pointerEvents }; });
    console.log(nm, JSON.stringify(s)); await p.screenshot({ path: `dev/out/autoretmsg_${nm}.png` });
    ok(`${nm}: 가운데 큰 안내 "현재 위치에서 자동사냥을 시작합니다 · 자동 복귀도 현재 위치로"`, s && s.on && s.op > 0.9 && /현재 위치에서 자동사냥을 시작합니다/.test(s.t) && /자동 복귀도 현재 위치\(\d+, \d+\)로 진행합니다/.test(s.t) && Math.abs(s.cx - w / 2) < 30 && s.pe === 'none' && s.w <= w);
    await p.waitForTimeout(4000); const off = await p.evaluate(() => { const el = document.getElementById('cnote'); return !el.classList.contains('on') && +getComputedStyle(el).opacity < 0.1; }); ok(`${nm}: 4초 뒤 사라짐`, off);
    await p.evaluate(() => __T.AUTO.toggle()); await p.waitForTimeout(300); ok(`${nm}: 끌 때는 안 뜸`, await p.evaluate(() => !document.getElementById('cnote').classList.contains('on')));
    await p.close(); }
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
