// 피닉스의 가호 테스트 (python3 dev/mkkt.py && bash dev/runkt.sh dev/tests/phx_gaho.js)
// ① 가호 없이 23번 지역: 용암 위에 서면 HP가 줄고 화산탄(AOES bomb)에 맞으면 HP가 준다 ② gaho_phoenix를 가방에 넣으면 둘 다 0
// ③ 다른 몬스터 공격·아시타지오 화염 기둥 같은 불 범위 피해는 그대로 ④ 피닉스 처치 → 조각 1개 · 조각 5개로 제작 장인 [가호 제작]에서 실제 제작 · [가호 조합]은 강화 없음 · 축복 부여 주문서는 못 씀
// ⑤ 오류 없음 · 스크린샷 dev/out/phx_gaho.png (가호 제작 탭) · phx_gaho_mix.png (가호 조합 탭) · phx_gaho_icons.png (아이콘 크게)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const errs = []; let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } };
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'phxG' });
  const L = async (k, f, a) => { const r = await p.evaluate(f, a); console.log(k, JSON.stringify(r)); return r; };
  // 0) 정의 · 아이콘 · ITEMS 순서
  const D = await L('defs', () => { const T = __T, I = T.ITEMS, K = Object.keys(I), g = I.gaho_phoenix, f = I.gfrag_phoenix;
    return { g: g && { name: g.name, rar: g.rar, gstat: g.gstat, gonoff: g.gonoff, desc: g.desc }, f: f && { name: f.name, rar: f.rar, stack: f.stack, desc: f.desc },
      icon: [!!T.CXI.gaho_phoenix, !!T.CXI.gfrag_phoenix], ord: [K.indexOf('gaho_drake_king'), K.indexOf('phoenix_feather'), K.indexOf('gfrag_phoenix'), K.indexOf('gaho_phoenix'), K.length] }; });
  ok(D.g && D.f, 'items missing'); ok(D.icon.every(Boolean), 'icons missing'); ok(D.ord[2] > D.ord[1] && D.ord[3] > D.ord[1], 'ITEMS order (화룡의 둥지 아이템 뒤)');
  ok(/용암.*화산탄 피해를 받지 않아요/.test(D.g.desc), 'gaho desc');
  // 1) 23번 지역 · 몬스터 치우기 · HP 넉넉히
  await p.evaluate(() => __T.TOWN.toZone(23)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 23 && __T.SCENE === 'field', null, { timeout: 20000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const T = __T, H = T.hero; T.GOD_INV = false; H.lv = 56; H.baseHP = 4000; T.INV.load({ bag: [{ id: 'red_potion', n: 1 }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); T.INV.render(); H.hp = H.max; window.__mobAt = T.foxes.map(f => [f.i, f.j]); T.foxes.splice(0); T.AOES.length = 0;
    window.__lava = [...T.ISLE.lava][0]; window.__safe = (() => { const far = (i, j) => { for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) if (T.ISLE.lava.has((j + dj) * 1000 + i + di)) return false; return true; };   // 몬스터가 서 있던 자리(걸을 수 있는 곳) 중 용암에서 3칸 넘게 떨어진 곳
      for (const q of [[H.i, H.j], ...window.__mobAt]) if (far(q[0], q[1])) return q; return [H.i, H.j]; })(); });
  const place = (at) => p.evaluate(at => { const H = __T.hero, [i, j] = at === 'lava' ? [__lava % 1000, Math.floor(__lava / 1000)] : __safe; H.i = H.fi = i; H.j = H.fj = j; H.x = i + 0.5; H.z = j + 0.5; H.t = 1; H.burnT = 0; H.hp = H.max; __T.foxes.splice(0); }, at);
  // 진짜 화산탄(fireTick이 만든 것)을 기다렸다가 내 자리로 옮겨 맞기 → 떨어진 직후 HP 차이
  const bombHit = async () => { await place('safe'); await p.evaluate(() => { __T.AOES.length = 0; __T.hero.hp = __T.hero.max; });
    await p.waitForFunction(() => __T.AOES.some(a => a.bomb && !a.landed), null, { timeout: 30000 });
    await p.evaluate(() => { const H = __T.hero, a = __T.AOES.find(a => a.bomb && !a.landed); a.x = H.x; a.z = H.z; window.__bomb = a; __T.foxes.splice(0); H.hp = H.max; H.burnT = 0; window.__hp0 = H.hp; window.__last = __T.log[__T.log.length - 1]; });
    await p.waitForFunction(() => __bomb.landed, null, { timeout: 5000 }); await p.waitForTimeout(100);
    return p.evaluate(() => ({ lost: __hp0 - __T.hero.hp, burn: __T.hero.burnT > 0, log: __T.log.slice(__T.log.lastIndexOf(__last) + 1).map(x => x.t || x.text || x) })); };   // 화산탄이 떨어지는 동안 새로 나온 메시지만
  const lavaHit = async () => { await place('lava'); await p.evaluate(() => { window.__hp0 = __T.hero.hp; }); await p.waitForTimeout(3300);
    return p.evaluate(() => ({ lost: __hp0 - __T.hero.hp, onLava: __T.ISLE.lava.has(__T.hero.j * 1000 + __T.hero.i), log: __T.log.slice(-2).map(x => x.t || x.text || x) })); };
  const A1 = await lavaHit(); console.log('lava (no gaho)', JSON.stringify(A1)); ok(A1.onLava && A1.lost >= 40, 'lava did not hurt without gaho');
  const B1 = await bombHit(); console.log('bomb (no gaho)', JSON.stringify(B1)); ok(B1.lost >= 20, 'bomb did not hurt without gaho');
  // 2) 피닉스의 가호를 가방에 넣으면 둘 다 0
  await p.evaluate(() => { __T.INV.add('gaho_phoenix', 1, true); __T.INV.render(); });
  const A2 = await lavaHit(); console.log('lava (gaho)', JSON.stringify(A2)); ok(A2.onLava && A2.lost <= 0, 'lava hurt with gaho'); ok(A2.log.some(t => /피닉스의 가호가 용암/.test(t)), 'lava gaho message');
  const B2 = await bombHit(); console.log('bomb (gaho)', JSON.stringify(B2)); ok(B2.lost <= 0 && !B2.burn, 'bomb hurt with gaho'); ok(B2.log.some(t => /피닉스의 가호가 화산탄을 막았습니다/.test(t)), 'bomb gaho message');
  const B3 = await bombHit(); console.log('bomb2 (gaho · 메시지 30초에 1번)', JSON.stringify(B3)); ok(B3.lost <= 0, 'bomb2 hurt with gaho'); ok(!B3.log.some(t => /화산탄을 막았습니다/.test(t)), 'bomb message spam (30초 안에 또 뜸)');
  // 3) 다른 불 피해는 그대로: 아시타지오 화염 기둥 모양 범위(bomb 아님) · 사라만다 근접 공격
  await place('safe');
  const C1 = await L('pillar (gaho)', () => { const T = __T, H = T.hero; H.hp = H.max; window.__hp0 = H.hp; T.AOES.push({ kind: 'mag', c: '255,90,30', x: H.x, z: H.z, r: 1.9, warn: 0.3, t: 0, life: 0.8, landed: false, dmg: [52, 75], fire: true, res: 'fire', nostun: true, msg: ['아시타지오의 화염 기둥에 휩싸였습니다!', '화염 기둥을 피했습니다.'] }); return 0; });
  await p.waitForTimeout(700); const C1r = await L('pillar result', () => ({ lost: __hp0 - __T.hero.hp })); ok(C1r.lost > 50, 'non-bomb fire AOE blocked by gaho');
  await place('safe');
  await p.evaluate(() => { const T = __T, H = T.hero; H.hp = H.max; window.__hp0 = H.hp; const m = T.mkMob('fn_salamander', H.i + 1, H.j); m.home = [H.i + 1, H.j]; m.aggro = true; T.foxes.push(m); window.__sal = m; });
  await p.waitForTimeout(6000); const M1 = await L('salamander (gaho)', () => ({ lost: __hp0 - __T.hero.hp, mobAlive: !__sal.dead })); ok(M1.lost > 0, 'monster attack blocked by gaho');
  await p.screenshot({ path: 'dev/out/phx_gaho_field.png' });
  // 4) 피닉스 처치 → 조각 1개 (되살아난 뒤 두 번째에)
  await p.evaluate(() => { const T = __T, H = T.hero; T.GOD_INV = true; T.foxes.splice(0); const m = T.mkMob('phoenix', H.i + 3, H.j); m.home = [H.i + 3, H.j]; m.aggro = true; T.foxes.push(m); window.__ph = m; window.__fr0 = T.INV.count('gfrag_phoenix'); });
  await p.waitForTimeout(800); await p.evaluate(() => { __ph.hp = -10; __T.killCheck(__ph); }); await p.waitForTimeout(300);
  const K1 = await L('phoenix ash', () => ({ dead: __ph.dead, ash: __ph.ashT > 0, frag: __T.INV.count('gfrag_phoenix') - __fr0 })); ok(!K1.dead && K1.frag === 0, 'fragment given at first (ash) death');
  await p.waitForTimeout(4500); await p.evaluate(() => { __ph.hp = -10; __T.killCheck(__ph); }); await p.waitForTimeout(500);
  const K2 = await L('phoenix dead', () => ({ dead: __ph.dead, frag: __T.INV.count('gfrag_phoenix') - __fr0, log: __T.log.slice(-8).map(x => x.t || x.text || x).filter(t => /가호조각/.test(t)) })); ok(K2.dead && K2.frag === 1, 'fragment not given on phoenix kill');
  // 5) 마을 · 제작 장인 [가호 제작]: 조각 4개면 버튼 꺼짐 → 5개로 제작 (성공) · 아이콘이 보스 그림으로 덮이지 않는지
  await p.evaluate(() => { __T.GOD_INV = false; __T.TOWN.goTown(); }); await p.waitForFunction(() => __T.SCENE === 'town', null, { timeout: 20000 }); await p.waitForTimeout(800);
  await p.evaluate(() => { const T = __T; T.INV.load({ bag: [{ id: 'gfrag_phoenix', n: 4 }, { id: 'gfrag_drake_king', n: 5 }, { id: 'red_potion', n: 5 }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); T.INV.render(); T.CRAFT_.open(); document.querySelector('#craftwin [data-ct="make"]').click(); });
  await p.waitForTimeout(500);
  const R4 = await L('make tab (4 frags)', () => { const bt = document.querySelector('#cr-list button[data-mk="phoenix"]'), row = bt && bt.closest('.cr-row'); return { has: !!bt, dis: bt && bt.disabled, txt: row && row.querySelector('.cr-t').innerText.replace(/\s+/g, ' ') }; });
  ok(R4.has && R4.dis, 'phoenix make row/button'); ok(/용암·화산탄 피해를 받지 않아요/.test(R4.txt || '') && !/\+1%/.test(R4.txt || ''), 'make row text');
  await p.evaluate(() => { __T.INV.add('gfrag_phoenix', 1, true); __T.INV.render(); }); await p.waitForTimeout(500);
  await p.evaluate(() => { const L = document.getElementById('cr-list'), r = L.querySelector('button[data-mk="phoenix"]').closest('.cr-row'); L.scrollTop = r.offsetTop - L.offsetTop - 120; });
  await p.waitForTimeout(300); await (await p.$('#craftwin')).screenshot({ path: 'dev/out/phx_gaho.png' });
  const en5 = await p.evaluate(() => !document.querySelector('#cr-list button[data-mk="phoenix"]').disabled); ok(en5, 'make button not enabled with 5 frags');
  await p.click('#cr-list button[data-mk="phoenix"]'); await p.waitForSelector('#ask-yes', { state: 'visible' });
  await p.evaluate(() => { const R = Math.random; Math.random = () => 0.05; try { document.getElementById('ask-yes').click(); } finally { Math.random = R; } });
  await p.waitForTimeout(400);
  const M = await L('made', () => ({ gaho: __T.INV.count('gaho_phoenix'), frag: __T.INV.count('gfrag_phoenix'), log: __T.log.slice(-2).map(x => x.t || x.text || x), icon: /gpx_b/.test(__T.CXI.gaho_phoenix) && /gpx_b/.test(__T.CXI.gfrag_phoenix) }));
  ok(M.gaho === 1 && M.frag === 0, 'phoenix gaho not crafted'); ok(M.icon, 'icon overwritten'); ok(M.log.some(t => /용암·화산탄 피해를 받지 않아요/.test(t)), 'make message');
  // 툴팁
  const TP = await L('tip', () => __T.INV.tipOf(__T.INV.bag().find(e => e.id === 'gaho_phoenix')).split('\n')); ok(TP.some(t => /적용 중/.test(t)) && !TP.some(t => /\+\d+%/.test(t)), 'tooltip');
  // 6) [가호 조합]: 피닉스의 가호 2개 → 강화 없음 (버튼 꺼짐 · data-mx 없음) · 다른 가호는 그대로 조합 가능
  await p.evaluate(() => { const T = __T; T.INV.add('gaho_phoenix', 1, true); T.INV.add('gaho_drake_king', 1, true); T.INV.add('gaho_drake_king', 1, true); T.INV.render(); document.querySelector('#craftwin [data-ct="mix"]').click(); });
  await p.waitForTimeout(500);
  const X = await L('mix tab', () => { const rows = [...document.querySelectorAll('#cr-list .cr-row')].map(r => ({ t: r.querySelector('.cr-t').innerText.replace(/\s+/g, ' '), mx: r.querySelector('button').dataset.mx || '', dis: r.querySelector('button').disabled })); return { rows, note: document.getElementById('cr-note').textContent }; });
  const px = X.rows.find(r => /피닉스의 가호/.test(r.t)), dk = X.rows.find(r => /드레이크 킹의 가호/.test(r.t));
  ok(px && px.dis && !px.mx && /강화할 수 없는/.test(px.t), 'phoenix mix row'); ok(dk && !dk.dis && dk.mx === 'drake_king', 'drake king mix row broken');
  await (await p.$('#craftwin')).screenshot({ path: 'dev/out/phx_gaho_mix.png' });
  await p.evaluate(() => document.querySelector('#craftwin [data-closewin="craftwin"]').click());
  // 7) 축복 부여 주문서: 피닉스의 가호만 있으면 쓸 대상 없음 · 무기가 있어도 피닉스의 가호를 누르면 안 됨
  await p.evaluate(() => { const T = __T; T.INV.load({ bag: [{ id: 'gaho_phoenix', n: 1 }, { id: 'bless_scroll', n: 3 }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); T.INV.render(); T.INV.use(T.INV.bag().find(e => e.id === 'bless_scroll')); });
  const S1 = await L('bless only gaho', () => ({ targeting: document.getElementById('invwin').classList.contains('targeting'), log: __T.log.slice(-1).map(x => x.t || x.text || x)[0] })); ok(!S1.targeting, 'bless targeting started with only phoenix gaho');
  await p.evaluate(() => { const T = __T; T.INV.add('dv_sword', 1, true); T.INV.render(); T.INV.use(T.INV.bag().find(e => e.id === 'bless_scroll')); });
  await p.waitForTimeout(200);
  const S2 = await L('bless click gaho', () => { const T = __T, bag = T.INV.bag(), e = bag.find(x => x.id === 'gaho_phoenix'), k = bag.indexOf(e); const c = document.querySelectorAll('#inv-grid .slot')[k]; const was = document.getElementById('invwin').classList.contains('targeting'); c && c.click();
    return { was, blessed: !!e.blessed, scrolls: T.INV.count('bless_scroll'), log: T.log.slice(-1).map(x => x.t || x.text || x)[0] }; });
  ok(S2.was && !S2.blessed && S2.scrolls === 3 && /축복할 수 없습니다/.test(S2.log || ''), 'bless on phoenix gaho');
  // 8) 월드맵 도감 · 아이템 출처
  const SRC = await L('codex', () => { const T = __T; try { T.TOWN.goTown(); } catch (e) {} return { hello22: T.ISLAND.def(22).hello, hello23: T.ISLAND.def(23).hello }; });
  ok(/피닉스의 가호/.test(SRC.hello22) && /피닉스의 가호/.test(SRC.hello23), 'hello text');
  // 아이콘 크게 (확인용)
  await p.evaluate(() => { const d = document.createElement('div'); d.id = 'icsheet'; d.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;background:#1a1410;padding:10px;display:flex;gap:10px';
    d.innerHTML = ['gaho_phoenix', 'gfrag_phoenix', 'gaho_drake_king', 'gfrag_drake_king', 'gaho_ice_queen', 'phoenix_feather'].map(id => `<div style="width:110px;text-align:center;color:#eee;font:11px sans-serif"><div style="width:100px;height:100px;margin:auto;background:#2a2230;border:1px solid #555">${__T.ICON(__T.ITEMS[id].icon).replace('<svg ', '<svg width="100" height="100" ')}</div>${__T.ITEMS[id].name}</div>`).join('')
      + ['gaho_phoenix', 'gfrag_phoenix', 'gaho_drake_king'].map(id => `<div style="width:40px;align-self:center"><div style="width:34px;height:34px">${__T.ICON(__T.ITEMS[id].icon).replace('<svg ', '<svg width="34" height="34" ')}</div></div>`).join(''); document.body.appendChild(d); });
  await p.waitForTimeout(400); await (await p.$('#icsheet')).screenshot({ path: 'dev/out/phx_gaho_icons.png' });
  console.log(fail ? `FAILED ${fail}` : 'ALL OK'); console.log(errs.join('\n') || 'no errors'); await b.close(); })();
