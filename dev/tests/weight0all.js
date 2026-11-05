// 11/5 프로듀서: 장비·물약 종류를 빼고는 모든 아이템 무게 0 (지금 있는 것 + 앞으로 추가되는 것)
//   KT_PORT=8887 bash dev/runkt.sh dev/tests/weight0all.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'w0a' });
  const r = await p.evaluate(() => { const I = __T.ITEMS, POT = d => d.use === 'heal' || d.use === 'haste' || d.use === 'mana' || d.use === 'cure' || d.use === 'antidote' || /^pot_/.test(d.icon || '') || /물약|해독제/.test(d.name || '');
    const heavy = Object.entries(I).filter(([, d]) => !d.slot && !POT(d) && (d.w || 0) > 0).map(([id]) => id);
    const potW = ['red_potion', 'orange_potion', 'clear_potion', 'green_potion', 'brave_potion'].map(id => I[id].w), eqW = Object.values(I).filter(d => d.slot === 'weapon' && d.w > 0).length;
    const W = () => { const t = document.querySelector('#inv-w, .inv-w'); return t ? t.textContent : ''; };
    const w0 = __T.INV.wPct(); for (const [id, n] of [['hw_seed', 1000], ['fg_faded_belt', 5], ['spellbook', 3], ['pet_fruit', 2], ['arrow', 500], ['immortal_ward', 10], ['elixir_str', 2]]) __T.INV.add(id, n); const w1 = __T.INV.wPct();
    return { heavy, potW, eqW, seed: I.hw_seed.w, belt: I.fg_faded_belt.w, book: I.spellbook.w, w0, w1 }; });
  console.log(JSON.stringify(r));
  ok(r.heavy.length === 0, `장비·물약이 아닌 아이템은 모두 무게 0 (남은 것: ${r.heavy.join(',') || '없음'})`);
  ok(r.seed === 0 && r.belt === 0 && r.book === 0, `호박씨 · 빛을 바랜 전설의 벨트 · 마법서 = 0`);
  ok(r.potW.every(w => w > 0) && r.eqW > 10, `물약(빨강·주홍·맑은·초록·용기)과 장비는 무게 그대로 (${r.potW} · 무기 ${r.eqW}종)`);
  ok(r.w0 === r.w1, `재료·주머니 등을 잔뜩 넣어도 가방 무게 그대로 (${r.w0} → ${r.w1})`);
  ok(!errs.length, '오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
