// 11/3 펫 체력 물약 기준: 펫 창에서 HP 10~90% (10% 단위) 조정 = d.potPct · 예전 펫(값 없음)은 50% · 가방 저장(dump/load)에 남음
//   python3 dev/mkkt.py && KT_PORT=8892 bash dev/runkt.sh dev/tests/petpot.js
const { chromium } = require('playwright'); const login = require('../tq.js');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 680 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'petpot' });
  // 예전 펫 (potPct 없음) 하나를 가방에 넣고 소환
  const r0 = await p.evaluate(() => { const T = __T; T.hero.lv = 30; const pet = Object.assign(T.mkPetData('doberman', 20), { name: '바둑' }); delete pet.potPct;
    T.INV.load({ bag: [{ id: 'pet_collar', n: 1, pet }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); T.INV.add('red_potion', 50, true); T.INV.add('green_potion', 20, true);
    const e = T.INV.bag().find(x => x.pet); T.PET.summon(e); T.PET.openWin(e); return { has: 'potPct' in e.pet, def: parseInt((document.querySelector('#petwin .pw-pot b') || {}).textContent), out: e.pet.state }; });
  ok(!r0.has && r0.def === 50 && r0.out === 'out', `예전 펫(값 없음) 기준 = ${r0.def}% · 소환 ${r0.out}`);
  const winTxt = () => p.evaluate(() => (document.querySelector('#petwin .pw-pot b') || {}).textContent || '');
  ok(await p.isVisible('#petwin') && (await winTxt()) === '50%', `펫 창 열림 · 표시 ${await winTxt()}`);
  // 펫 HP를 정하고 잠깐 기다려서 (게임 루프가 petUse) 내 가방 빨간 물약을 먹었는지
  const drinkAt = async k => { await p.evaluate(k => { const T = __T, e = T.INV.bag().find(x => x.pet), d = e.pet, ent = T.PET.list().find(q => q.e === e); ent.potCd = 0; d.hp = T.PET.mxh(d) * k; window.__pc = T.INV.count('red_potion'); }, k);
    await p.waitForTimeout(400); return p.evaluate(() => window.__pc - __T.INV.count('red_potion')); };
  ok((await drinkAt(0.49)) === 1, '기본 50%: HP 49%에서 마심'); ok((await drinkAt(0.51)) === 0, '기본 50%: HP 51%에서는 안 마심');
  // ▶ 세 번 → 80%
  for (let i = 0; i < 3; i++) await p.click('#petwin [data-pp="10"]');
  const v80 = await p.evaluate(() => __T.INV.bag().find(x => x.pet).pet.potPct);
  ok(v80 === 80 && (await winTxt()) === '80%', `▶ 세 번 → 저장 값 ${v80} · 표시 ${await winTxt()}`);
  ok((await drinkAt(0.79)) === 1, '80%: HP 79%에서 마심'); ok((await drinkAt(0.81)) === 0, '80%: HP 81%에서는 안 마심');
  // 끝 (90%) 에서 ▶ 막힘
  await p.click('#petwin [data-pp="10"]'); const dis90 = await p.evaluate(() => document.querySelector('#petwin [data-pp="10"]').disabled);
  ok(dis90 && (await winTxt()) === '90%', `90%에서 ▶ 막힘 (${await winTxt()})`);
  // ◀ 일곱 번 → 20%
  for (let i = 0; i < 7; i++) await p.click('#petwin [data-pp="-10"]');
  const v20 = await p.evaluate(() => __T.INV.bag().find(x => x.pet).pet.potPct);
  ok(v20 === 20 && (await winTxt()) === '20%', `◀ 일곱 번 → ${v20}%`);
  ok((await drinkAt(0.30)) === 0, '20%: HP 30%에서는 안 마심'); ok((await drinkAt(0.19)) === 1, '20%: HP 19%에서 마심');
  await p.click('#petwin [data-pp="-10"]'); const dis10 = await p.evaluate(() => document.querySelector('#petwin [data-pp="-10"]').disabled); await p.click('#petwin [data-pp="-10"]', { force: true }).catch(() => {});
  ok(dis10 && (await winTxt()) === '10%', `10%에서 ◀ 막힘 (${await winTxt()})`);
  // 가속 물약 넣기 버튼 · 칸 클릭 꺼내기가 그대로 되는지
  await p.click('#petwin [data-pp="10"]'); await p.click('#petwin [data-pp="10"]');   // 30%
  await p.click('#petwin [data-give="green_potion"]'); const g = await p.evaluate(() => { const d = __T.INV.bag().find(x => x.pet).pet; return { inv: d.inv.filter(Boolean).map(x => x.id + ':' + x.n).join(), bag: __T.INV.count('green_potion') }; });
  ok(/green_potion:\d+/.test(g.inv) && g.bag <= 15, `가속 물약 넣기 버튼 동작 (펫 가방 ${g.inv} · 내 가방 ${g.bag})`);
  await p.screenshot({ path: 'dev/out/petpot.png', clip: await p.evaluate(() => { const r = document.getElementById('petwin').getBoundingClientRect(); return { x: Math.max(0, r.left - 6), y: Math.max(0, r.top - 6), width: r.width + 12, height: r.height + 12 }; }) });
  await p.click('#petwin .pw-slot[data-k="0"]'); const tk = await p.evaluate(() => __T.INV.bag().find(x => x.pet).pet.inv.filter(Boolean).length);
  // 가방 저장 (dump → JSON → load) 뒤에도 값이 남음
  const r2 = await p.evaluate(() => { const T = __T; T.PET.storeAll(); const D = JSON.parse(JSON.stringify(T.INV.dump())); T.INV.load(D); const e = T.INV.bag().find(x => x.pet); T.PET.openWin(e);
    return { v: e.pet.potPct, txt: (document.querySelector('#petwin .pw-pot b') || {}).textContent }; });
  ok(tk === 0, '펫 가방 칸 클릭 → 꺼내기 그대로');
  ok(r2.v === 30 && r2.txt === '30%', `가방 저장·불러오기 뒤 기준 ${r2.v}% (창 ${r2.txt})`);
  // 휴대폰 폭에서 한 줄에 들어가는지
  await p.setViewportSize({ width: 360, height: 700 }); await p.waitForTimeout(200);
  const lay = await p.evaluate(() => { const w = document.getElementById('petwin').getBoundingClientRect(), r = document.querySelector('#petwin .pw-pot').getBoundingClientRect(), bs = [...document.querySelectorAll('#petwin .pw-pot > *')].map(x => x.getBoundingClientRect());
    return { fit: r.right <= w.right + 0.5 && r.left >= w.left - 0.5, one: bs.every(q => Math.abs(q.top + q.height / 2 - (bs[0].top + bs[0].height / 2)) < 4), w: Math.round(w.width), h: Math.round(r.height) }; });
  ok(lay.fit && lay.one, `폭 360: 창 ${lay.w}px 안에 한 줄 (높이 ${lay.h}px)`);
  console.log(errs.length ? 'PAGE ERRORS\n' + errs.slice(0, 5).join('\n') : 'no page errors'); if (errs.length) process.exitCode = 1; await b.close(); })();
