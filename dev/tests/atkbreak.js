// 11/5 프로듀서: 공격 수치가 속성까지 합친 값이라 헷갈림 → 아이템 정보·비교 창에 기본 · 강화 · 속성 몫을 나눠서 보여 줌
//   KT_PORT=8888 bash dev/runkt.sh dev/tests/atkbreak.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'atkb' }); await p.evaluate(() => { __T.hero.lv = 55; });
  const r = await p.evaluate(() => { const T = __T, I = T.ITEMS, id = Object.keys(I).find(k => I[k].name === '드래곤 슬레이어'); if (!id) return { err: 'no ds' };
    T.INV.load({ bag: [{ id, n: 1, en: 8, blessed: true, attr: { el: 'fire', lv: 3 }, on: 'weapon' }, { id, n: 1, en: 9, blessed: true }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } });
    document.getElementById('invwin').hidden = false; T.INV.render(); const bag = T.INV.bag(), e9 = bag.find(x => x.en === 9), e8 = bag.find(x => x.en === 8);
    T.INV.showDetail(e9); const info9 = document.getElementById('itemwin').textContent.replace(/\s+/g, ' '), cmp = document.getElementById('cmpwin'), ct = cmp && !cmp.hidden ? cmp.textContent.replace(/\s+/g, ' ') : '';
    const d = I[id]; return { id, base: d.dmg, info9, cmp: ct, cmpVis: !!cmp && !cmp.hidden }; });
  await p.waitForTimeout(300); await p.screenshot({ path: 'dev/out/atkbreak.png' });
  const r8 = await p.evaluate(() => { const T = __T, e8 = T.INV.bag().find(x => x.en === 8); T.INV.showDetail(e8); return document.getElementById('itemwin').textContent.replace(/\s+/g, ' '); });
  console.log(JSON.stringify({ base: r.base, info9: (r.info9.match(/공격 [^강]*/) || [''])[0], info8: (r8.match(/공격 [^강]*/) || [''])[0], cmp: (r.cmp.match(/공격.{0,90}/) || [''])[0], attr: (r.cmp.match(/속성.{0,30}/) || [''])[0] }));
  const [b0, b1] = r.base || [0, 0];
  ok(r.info9.includes(`공격 ${b0 + 48}~${b1 + 48} = 기본 ${b0}~${b1} · 강화 +27 · 고강화 +21`), `+9(속성 없음) 정보: 공격 = 기본 + 강화 +27 + 고강화 +21 (11/5 hienchant)`);
  ok(r8.includes(`공격 ${b0 + 38}~${b1 + 38} = 기본 ${b0}~${b1} · 강화 +24 · 고강화 +9 · 속성 3단 +5`), `+8(속성 3단) 정보: 공격 = 기본 + 강화 +24 + 고강화 +9 + 속성 3단 +5`);
  ok(r.cmpVis && /강화 \+24 · 고강화 \+9 · 속성 \+5 포함/.test(r.cmp) && /강화 \+27 · 고강화 \+21 포함/.test(r.cmp) && /3단 \(\+5\)/.test(r.cmp), `비교 창: 공격 칸 아래 강화·속성 몫 · 속성 칸에 (+5)`);
  ok(!errs.length, '오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
