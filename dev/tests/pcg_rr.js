// 변신 카드 11/1: 전설 재뽑기(300만·600만·1200만 → 원하는 전설 무료 · 횟수는 카드를 따라감 · 변신 칸 카드 안 됨) · 마일리지 = 무작위 전설(연출)
// 희귀→영웅·영웅→전설 합성도 홀 연출 (11장 넘으면 다음 카드) · 개별 연출에서 공개 전까지 등급 색 숨김 · 모션 스킵 (KT_PORT=8791 bash dev/runkt.sh dev/tests/pcg_rr.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'rrKN' });
  const S = () => p.evaluate(() => JSON.parse(JSON.stringify(PCG.state()))), coins = () => p.evaluate(() => __T.coins), lastLog = () => p.evaluate(() => __T.log.slice(-4).map(x => x.t || x.text || x).join(' | '));
  const setS = o => p.evaluate(o => { const s = PCG.state(); s.cards = Object.assign({}, o.cards); s.rr = Object.assign({}, o.rr || {}); s.lock = {}; s.slot = {}; s.pity = { h: 0, l: 0 }; s.mile = o.mile || 0; PCG.sync(); PCG.renderWin(); }, o);
  const yes = async () => { await p.waitForSelector('#askwin:not([hidden])', { timeout: 3000 }); const t = await p.evaluate(() => document.getElementById('ask-q').textContent + ' / ' + document.getElementById('ask-sub').textContent); await p.click('#ask-yes'); await p.waitForTimeout(700); return t; };
  await p.evaluate(() => { __T.setCoins(50000000); __T.hero.lv = 55; PCG.setSkip(false); }); await p.click('#btn-poly'); await p.waitForTimeout(600);
  await setS({ cards: { deathknight: 1, goblin: 3 } });
  // ① 버튼 이름 · 재뽑기 칸
  ok('① 변신 칸 옆 [전설 재뽑기] · 마일리지 [전설 받기]', await p.evaluate(() => /전설 재뽑기/.test(document.getElementById('pw-again').textContent) && /전설 받기/.test(document.getElementById('pw-mb').textContent)));
  await p.click('#pw-again'); await p.waitForTimeout(200);
  const pan = await p.evaluate(() => { const k = document.getElementById('pw-pick'); return { vis: !k.hidden, t: k.textContent, n: k.querySelectorAll('[data-rr]').length, dk: (k.querySelector('[data-rr="deathknight"]') || {}).textContent }; }); console.log(JSON.stringify(pan));
  ok('① 재뽑기 칸: 가진 전설만 · 0/3 · 다음 300만', pan.vis && pan.n === 1 && /재뽑기 0 \/ 3/.test(pan.dk) && /300만/.test(pan.dk) && /300만 · 2번째 600만 · 3번째 1,200만/.test(pan.t));
  await p.screenshot({ path: 'dev/out/rr_panel.png' });
  // ② 1번째: 300만 → 무작위 전설 (정한 카드 와이번) · 연출 · 횟수는 나온 카드로
  let c0 = await coins(); await p.evaluate(() => PCG._force(['wyvern'])); await p.click('#pw-pick [data-rr="deathknight"]'); const q1 = await yes(); console.log('ask1', q1);
  let s = await S(), o = await p.evaluate(() => PCG.ov()); console.log(JSON.stringify({ cards: s.cards, rr: s.rr, ov: o }));
  ok('② 1번째 300만 골드 · 데스나이트 → 와이번', c0 - await coins() === 3000000 && !s.cards.deathknight && s.cards.wyvern === 1 && /1번째/.test(q1) && /같은 카드가 나올 수도/.test(q1));
  ok('② 횟수는 카드를 따라감 (와이번 1번)', JSON.stringify(s.rr) === '{"wyvern":[1]}');
  ok('② 재뽑기도 홀 연출 (1장)', !!o && !!o.tg && o.k === 'one' && o.n === 1);
  await p.evaluate(() => { const G = PCG._tg(); if (G) G.quickAll(); }); await p.waitForTimeout(900); await p.screenshot({ path: 'dev/out/rr_tg.png' });
  ok('② 다 열면 결과 줄: 데스나이트 → 와이번 · 1 / 3 · 다음 600만', /데스나이트 → \[전설\] 와이번/.test(await p.evaluate(() => document.getElementById('pcg-sum').textContent)) && /1 \/ 3/.test(await p.evaluate(() => document.getElementById('pcg-sum').textContent)) && /600만/.test(await p.evaluate(() => document.getElementById('pcg-sum').textContent)));
  await p.evaluate(() => PCG.close()); await p.waitForTimeout(300);
  ok('② 전설 재뽑기 전체 알림', /전설 재뽑기에서 \[전설\] 와이번/.test(await lastLog()));
  // ③ 2번째: 600만 · 같은 카드도 나옴
  c0 = await coins(); await p.evaluate(() => { PCG._force(['wyvern']); PCG.rrDo('wyvern'); }); await p.waitForTimeout(500); await p.evaluate(() => PCG.close()); s = await S();
  ok('③ 2번째 600만 · 같은 카드(와이번)도 나옴 → 2번', c0 - await coins() === 6000000 && s.cards.wyvern === 1 && JSON.stringify(s.rr) === '{"wyvern":[2]}');
  // ④ 3번째: 1,200만 → 아크 나이트 (3번)
  c0 = await coins(); await p.evaluate(() => { PCG._force(['arc_knight']); PCG.rrDo('wyvern'); }); await p.waitForTimeout(500); await p.evaluate(() => PCG.close()); s = await S();
  ok('④ 3번째 1,200만 → 아크 나이트 3번', c0 - await coins() === 12000000 && !s.cards.wyvern && s.cards.arc_knight === 1 && JSON.stringify(s.rr) === '{"arc_knight":[3]}');
  // ⑤ 3번 한 카드 → 원하는 전설 무료
  await p.evaluate(() => PCG.renderWin()); await p.click('#pw-again').catch(() => {}); await p.waitForTimeout(100); if (await p.evaluate(() => document.getElementById('pw-pick').hidden)) { await p.click('#pw-again'); await p.waitForTimeout(150); }
  ok('⑤ 칸에 "원하는 전설 고르기 (무료)"', /원하는 전설 고르기 \(무료\)/.test(await p.evaluate(() => (document.querySelector('#pw-pick [data-rr="arc_knight"]') || {}).textContent || '')));
  c0 = await coins(); await p.click('#pw-pick [data-rr="arc_knight"]'); await p.waitForTimeout(200);
  const pk = await p.evaluate(() => ({ m: PCG.rrMode(), n: document.querySelectorAll('#pw-pick [data-to]').length, self: !!document.querySelector('#pw-pick [data-to="arc_knight"]'), t: document.getElementById('pw-pick').textContent })); console.log(JSON.stringify(pk));
  ok('⑤ 고르기 칸: 나머지 전설 5종 (자기 빼고)', pk.m && pk.m.k === 'pick' && pk.n === 5 && !pk.self && /무료/.test(pk.t)); await p.screenshot({ path: 'dev/out/rr_pick.png' });
  await p.click('#pw-pick [data-to="deathknight"]'); const q2 = await yes(); s = await S();
  ok('⑤ 무료로 아크 나이트 → 데스나이트 · 횟수 처음부터', c0 === await coins() && !s.cards.arc_knight && s.cards.deathknight === 1 && JSON.stringify(s.rr) === '{}' && /무료/.test(q2));
  // ⑥ 장마다 따로 · 변신 칸 카드는 안 됨 · 골드 부족
  await setS({ cards: { deathknight: 1, wyvern: 2 }, rr: { wyvern: [2] } }); await p.evaluate(() => { PCG.setSlot('deathknight'); PCG.renderWin(); }); await p.click('#pw-again').catch(() => {}); await p.waitForTimeout(150); if (await p.evaluate(() => document.getElementById('pw-pick').hidden)) { await p.click('#pw-again'); await p.waitForTimeout(150); }
  const pan2 = await p.evaluate(() => ({ dk: (document.querySelector('#pw-pick [data-rr="deathknight"]') || {}).textContent, dkDis: (document.querySelector('#pw-pick [data-rr="deathknight"]') || {}).disabled, wy: (document.querySelector('#pw-pick [data-rr="wyvern"]') || {}).textContent })); console.log(JSON.stringify(pan2));
  ok('⑥ 변신 칸의 카드(1장뿐)는 재뽑기 막힘', pan2.dkDis && /변신 칸에 있음/.test(pan2.dk));
  ok('⑥ 와이번 2장: 2번 한 장 → 다음 1,200만 (큰 횟수부터)', /재뽑기 2 \/ 3/.test(pan2.wy) && /1,200만/.test(pan2.wy));
  c0 = await coins(); await p.evaluate(() => { PCG._force(['kaspar']); PCG.rrDo('wyvern'); }); await p.waitForTimeout(400); await p.evaluate(() => PCG.close()); s = await S();
  ok('⑥ 2장 중 1장만 바뀜 (와이번 1장 0번 남음 · 카스파 3번)', c0 - await coins() === 12000000 && s.cards.wyvern === 1 && s.cards.kaspar === 1 && JSON.stringify(s.rr) === '{"kaspar":[3]}');
  await p.evaluate(() => __T.setCoins(1000000)); c0 = await coins(); const r0 = await p.evaluate(() => PCG.rrGo('wyvern')); ok('⑥ 골드 모자라면 안 됨', r0 === null && c0 === await coins() && /골드가 부족/.test(await lastLog()));
  await p.evaluate(() => __T.setCoins(50000000));
  // ⑦ 저장·불러오기 (횟수 · 장수보다 많은 기록은 잘림 · 잘못된 값)
  const ld = await p.evaluate(() => { const raw = JSON.parse(PCG.raw()); raw.rr = { kaspar: [3, 2, 'x'], wyvern: [9], nope: 'bad' }; PCG.load(JSON.stringify(raw)); const r = JSON.parse(JSON.stringify(PCG.state().rr)); return r; }); console.log('load', JSON.stringify(ld));
  ok('⑦ 불러오기: 장수만큼만 · 3 넘으면 3 · 이상한 값 버림', JSON.stringify(ld) === '{"kaspar":[3],"wyvern":[3]}');
  // ⑧ 마일리지 = 무작위 전설 (연출)
  await setS({ cards: { goblin: 1 }, mile: 1000 }); await p.evaluate(() => PCG._force(['arc_mage'])); await p.click('#pw-mb'); const q3 = await yes(); o = await p.evaluate(() => PCG.ov()); s = await S();
  ok('⑧ 마일리지 1000 → 무작위 전설 1장 (연출)', /무작위/.test(q3) && s.mile === 0 && s.cards.arc_mage === 1 && !!o && !!o.tg && o.k === 'one'); await p.evaluate(() => PCG.close());
  // ⑨ 영웅→전설 합성도 홀 연출 · 11장 넘으면 다음 카드
  await setS({ cards: { spartoi: 30, necromancer: 30 } }); await p.evaluate(() => { PCG.setTray('영웅', { spartoi: 30, necromancer: 30 }); }); await p.waitForTimeout(100);
  await p.evaluate(() => { const R0 = Math.random; let n = 0; Math.random = () => (n++ % 3 === 0 ? 0.01 : 0.5); try { document.querySelector('#pw-synb [data-a="go"]').click(); } finally { Math.random = R0; } }); await p.waitForTimeout(800);
  o = await p.evaluate(() => PCG.ov()); console.log('syn ov', JSON.stringify(o));
  ok('⑨ 영웅→전설 15번 합성 → 홀 연출 · 2쪽 (11 + 나머지)', !!o && !!o.tg && o.k === 'tsyn' && o.pages === 2 && o.n === 11 && o.all >= 15 && o.tg.high === 11);
  await p.evaluate(() => PCG._tg().quickAll()); await p.waitForTimeout(1200); ok('⑨ 다 열면 [다음 카드]', await p.evaluate(() => !document.getElementById('pcg-next').hidden && /남은 카드/.test(document.getElementById('pcg-sum').textContent)));
  await p.screenshot({ path: 'dev/out/rr_syn1.png' }); await p.waitForFunction(() => PCG.ov() && PCG.ov().tg.ready); await p.keyboard.press('Space'); await p.waitForTimeout(900); o = await p.evaluate(() => PCG.ov()); ok('⑨ Space → 2쪽', !!o && o.pg === 1 && o.n === o.all - 11);
  await p.waitForFunction(() => PCG.ov() && PCG.ov().tg.ready); await p.evaluate(() => PCG._tg().quickAll()); await p.waitForTimeout(900); ok('⑨ 마지막 쪽: [다음 카드] 없음 · 합성 요약', await p.evaluate(() => document.getElementById('pcg-next').hidden && /영웅→전설 15번/.test(document.getElementById('pcg-sum').textContent)));
  await p.click('#pcg-ok'); await p.waitForTimeout(1000); ok('⑨ 닫으면 합성 요약 · 전설 알림', /영웅 → 전설 합성 — 영웅→전설 15번/.test(await lastLog()) && /변신 카드 합성에서 \[전설\]/.test(await p.evaluate(() => __T.log.slice(-30).map(x => x.t || x).join(' | '))));
  // ⑩ 개별 연출: 공개 전까지 등급 색 숨김 (희귀 = 파랑이 공개 전에는 안 보임)
  await setS({ cards: { goblin: 1 } }); await p.evaluate(() => PCG._force(['dark_elf'])); await p.evaluate(() => PCG.draw(1)); await p.waitForTimeout(300); await p.waitForFunction(() => PCG.ov() && PCG.ov().tg && PCG.ov().tg.ready, null, { timeout: 8000 });
  await p.evaluate(() => PCG._tg().open(0));
  const hue = () => p.evaluate(() => { const c = document.querySelector('#pcg-ovl canvas'), g = c.getContext('2d'), D = g.getImageData(0, 0, c.width, c.height).data; let r = 0, gg = 0, bl = 0, n = 0; for (let i = 0; i < D.length; i += 16) { const m = Math.max(D[i], D[i + 1], D[i + 2]); if (m < 90) continue; r += D[i]; gg += D[i + 1]; bl += D[i + 2]; n++; } const G = PCG._tg(); return { r: Math.round(r / n), g: Math.round(gg / n), b: Math.round(bl / n), n, u: G.cine ? +(G.t - G.cine.s).toFixed(2) : -1 }; });
  await p.waitForTimeout(2500); const h1 = await hue(); await p.screenshot({ path: 'dev/out/rr_crack.png' }); await p.waitForTimeout(2600); const h2 = await hue(); await p.screenshot({ path: 'dev/out/rr_reveal.png' }); console.log('hue', JSON.stringify({ h1, h2 }));
  ok('⑩ 균열 중(공개 전): 금빛 (파랑 아님)', h1.u > 1.8 && h1.u < 3.3 && h1.r > h1.b + 20);
  ok('⑩ 공개 뒤: 희귀 파랑', h2.u > 4.3 && h2.b > h2.r);
  await p.evaluate(() => PCG.close());
  // ⑪ 모션 스킵: 재뽑기·마일리지 연출 없이 바로
  await setS({ cards: { deathknight: 1 }, mile: 1000 }); await p.evaluate(() => { PCG.setSkip(true); PCG._force(['wyvern']); PCG.rrDo('deathknight'); }); await p.waitForTimeout(300);
  ok('⑪ 모션 스킵: 재뽑기 바로 (연출 없음) · 결과 칸', await p.evaluate(() => !PCG.ov() && /전설 재뽑기/.test(document.getElementById('pw-res').textContent) && PCG.state().cards.wyvern === 1));
  await p.evaluate(() => { PCG._force(['kaspar']); PCG.mileDo(); }); await p.waitForTimeout(300); ok('⑪ 모션 스킵: 마일리지도 바로', await p.evaluate(() => !PCG.ov() && PCG.state().cards.kaspar === 1 && PCG.state().mile === 0));
  await p.evaluate(() => PCG.setSkip(false));
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
