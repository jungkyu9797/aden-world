// 화룡 갑옷 3종 (제작 장인 브론 · 10/30) 테스트 (python3 dev/mkkt.py && bash dev/runkt.sh dev/tests/fire_craft.js)
// ⓪ 정의(영웅 · Lv55 · 직업 전용 · 화염 저항 +50 · ITEMS 맨 뒤) · 예전 화룡 장비 7종 흔적 없음 · 용비늘 방어구 레시피 없음·용비늘 무기 레시피 있음
// ① 재료가 모자라면 못 만듦 ② 3종 실제 제작 ③ 직업 제한 · 착용 시 화염 저항 +50 (elemRes('fire')) ④ 오류 없음
// 스크린샷: dev/out/fire_armor.png (제작 창) · fire_armor_icons.png (아이콘 크게 + 기사·법사·요정 착용 모습 · 영웅 등급 빛 켬)
const { chromium } = require('playwright'); const login = require('../tq.js');
const FA = ['fd_plate', 'fd_robe', 'fd_leather'], CLS = { fd_plate: 'knight', fd_robe: 'wizard', fd_leather: 'elf' };
const OLD = ['fd_helm', 'fd_armor', 'fd_gloves', 'fd_boots', 'fd_sword', 'fd_staff', 'fd_bow'], DVA = ['dv_helm', 'dv_armor', 'dv_gloves', 'dv_boots'], DVW = ['dv_sword', 'dv_staff', 'dv_bow'];
const NEED = [['ifrit_heart', 5], ['astazio_ash', 10], ['fire_scale', 20], ['phoenix_feather', 1]];
const ZERO = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
(async () => { const b = await chromium.launch(); const errs = []; let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } };
  const page = async (cls, name) => { const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(cls + ': ' + e.message));
    p.on('console', m => { if (/장비 도감|아이콘 없음|해석하지 못한/.test(m.text())) errs.push(cls + ' console: ' + m.text()); }); await login(p, { cls, name }); return p; };
  const p = await page('knight', 'faK');
  // ⓪ 정의
  const D = await p.evaluate(({ FA, OLD, DVA }) => { const T = __T, I = T.ITEMS, keys = Object.keys(I);
    const inDrop = id => [T.DROP_TABLE, T.MOB_DROPS].some(Tb => Object.values(Tb).some(L => L.some(r => r[0] === id))) || T.CX_HERO.includes(id) || [T.CX_ZONE, T.CX_ZONE_R, T.CX_ZONE_H].some(Z => Object.values(Z).some(L => L.includes(id)));
    return { last: keys.slice(-3), defs: FA.map(id => { const d = I[id]; return d && { id, name: d.name, slot: d.slot, rar: d.rar, lv: d.lv, cls: d.cls, ac: d.ac, mr: d.mr, fire: d.fireRes, hp: d.hp, mp: d.mp, int: d.int, mpRegen: d.mpRegen, w: d.w, safe: d.safe, look: d.look, icon: !!T.CXI[d.icon], price: d.price, src: d.src, desc: d.desc, drop: inDrop(id) }; }),
      old: OLD.filter(id => I[id] || T.CXI['ic_' + id] || Object.values(typeof LOOK !== 'undefined' ? LOOK : T.LOOK || {}).some(o => o && o[id])), oldName: keys.filter(k => /^화룡의 (투구|장갑|장화|검|지팡이|활)$/.test(I[k].name)),
      mats: ['fire_scale', 'astazio_ash', 'phoenix_feather', 'ifrit_heart', 'dragon_scale', 'drake_claw'].map(id => I[id].desc), heart: I.ifrit_heart.desc,
      dv: DVA.map(id => I[id] && [id, I[id].name, I[id].src, I[id].ac, I[id].fireRes]) }; }, { FA, OLD, DVA });
  for (const d of D.defs) { ok(d, 'missing item'); if (!d) continue; console.log(JSON.stringify(d));
    ok(d.slot === 'armor' && d.rar === '영웅' && d.lv === 55, d.id + ' slot/rar/lv'); ok(d.fire === 50, d.id + ' 화염 저항 50'); ok(JSON.stringify(d.cls) === JSON.stringify([CLS[d.id]]), d.id + ' 직업 전용');
    ok(d.icon, d.id + ' icon'); ok(!d.drop, d.id + ' in drop table'); ok(/제작 장인 브론/.test(d.src) && /이프리트의 심장 5/.test(d.src) && /피닉스의 깃털 1/.test(d.src), d.id + ' src'); ok(d.desc && d.desc.length > 20, d.id + ' desc'); }
  ok(JSON.stringify(D.last) === JSON.stringify(FA), 'ITEMS 맨 뒤가 아님: ' + D.last.join(','));
  ok(!D.old.length && !D.oldName.length, '예전 화룡 장비 흔적: ' + D.old.concat(D.oldName).join(','));
  for (const t of D.mats.slice(0, 4)) { console.log('mat:', t); ok(/화룡 갑옷 3종/.test(t) && !/화룡 장비|직업 무기|화룡의 검/.test(t), 'material desc'); }
  for (const t of D.mats.slice(4)) { console.log('dv mat:', t); ok(!/용비늘 장비/.test(t), 'dv material desc'); }
  ok(/^화룡 갑옷의 핵심 재료/.test(D.heart), 'heart desc');
  for (const r of D.dv) { console.log('dv:', JSON.stringify(r)); ok(r && !/제작/.test(r[2]) && r[3] > 0, 'dv armor src/def: ' + (r && r[0])); }
  // ① 재료 부족 (심장 4 · 나머지 넉넉) → 버튼 꺼짐 · 억지로 눌러도 안 만들어짐 · 깃털만 없음도 꺼짐
  await p.evaluate(() => { const T = __T; T.hero.lv = 56; T.INV.load({ bag: [{ id: 'ifrit_heart', n: 4 }, { id: 'astazio_ash', n: 10 }, { id: 'fire_scale', n: 20 }, { id: 'phoenix_feather', n: 1 }, { id: 'red_potion', n: 5 }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); T.INV.render(); T.CRAFT_.open(); document.querySelector('#craftwin [data-ct="gear"]').click(); });
  await p.waitForTimeout(300);
  const R = await p.evaluate(({ FA, DVA, DVW }) => { const has = id => !!document.querySelector(`#cr-list button[data-gr="${id}"]`);
    const st = FA.map(id => { const bt = document.querySelector(`#cr-list button[data-gr="${id}"]`); return bt ? bt.disabled : 'none'; });
    const bt = document.querySelector('#cr-list button[data-gr="fd_plate"]'); bt.disabled = false; bt.click();
    return { st, dvA: DVA.map(has), dvW: DVW.map(has), ask: !document.getElementById('askwin') || document.getElementById('askwin').hidden, log: __T.log.slice(-1).map(x => x.t || x.text || x)[0], n: __T.INV.count('fd_plate'), h: __T.INV.count('ifrit_heart'),
      rows: [...document.querySelectorAll('#cr-list .cr-row')].filter(r => r.querySelector('button[data-gr^="fd_"]')).map(r => r.textContent.replace(/\s+/g, ' ').trim()) }; }, { FA, DVA, DVW });
  console.log('lack', JSON.stringify({ st: R.st, n: R.n, h: R.h, log: R.log })); console.log('recipe dvArmor', JSON.stringify(R.dvA), 'dvWeapon', JSON.stringify(R.dvW)); console.log('rows', JSON.stringify(R.rows));
  ok(R.st.every(x => x === true), 'buttons not disabled when lacking'); ok(R.n === 0 && R.h === 4, 'crafted without materials'); ok(/재료가 모자라요/.test(R.log || ''), 'lack message');
  ok(R.dvA.every(x => !x), '용비늘 방어구 레시피가 남아 있음'); ok(R.dvW.every(Boolean), '용비늘 무기 레시피가 없음');
  ok(R.rows.length === 3 && R.rows.every(t => /이프리트의 심장 4 \/ 5/.test(t) && /아시타지오의 재 10 \/ 10/.test(t) && /화룡의 비늘 20 \/ 20/.test(t) && /피닉스의 깃털 1 \/ 1/.test(t)), 'recipe rows');
  await p.evaluate(() => { const T = __T; T.INV.load({ bag: [{ id: 'ifrit_heart', n: 5 }, { id: 'astazio_ash', n: 10 }, { id: 'fire_scale', n: 20 }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); T.INV.render(); });
  await p.waitForTimeout(300);
  const noF = await p.evaluate(FA => FA.map(id => document.querySelector(`#cr-list button[data-gr="${id}"]`).disabled), FA); console.log('noFeather', JSON.stringify(noF)); ok(noF.every(Boolean), 'craftable without feather');
  // ② 재료 3벌 → 3종 제작
  await p.evaluate(NEED => { const T = __T; T.INV.load({ bag: NEED.map(([id, n]) => ({ id, n: n * 3 })).concat([{ id: 'red_potion', n: 5 }]), bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); T.INV.render(); }, NEED);
  await p.waitForTimeout(500);
  const en = await p.evaluate(FA => FA.map(id => !document.querySelector(`#cr-list button[data-gr="${id}"]`).disabled), FA); console.log('enabled', JSON.stringify(en)); ok(en.every(Boolean), 'buttons enabled with materials');
  await p.evaluate(() => { const L = document.getElementById('cr-list'), r = L.querySelector('button[data-gr="dv_bow"]').closest('.cr-row'); L.scrollTop = r.offsetTop - L.offsetTop + 40; });
  await p.waitForTimeout(300); await (await p.$('#craftwin')).screenshot({ path: 'dev/out/fire_armor.png' });
  for (const id of FA) { await p.click(`#cr-list button[data-gr="${id}"]`); await p.waitForSelector('#ask-yes', { state: 'visible' }); await p.click('#ask-yes'); await p.waitForTimeout(250); }
  const made = await p.evaluate(({ FA, NEED }) => ({ got: FA.map(id => __T.INV.count(id)), left: NEED.map(([id]) => __T.INV.count(id)), log: __T.log.slice(-1).map(x => x.t || x.text || x) }), { FA, NEED });
  console.log('made', JSON.stringify(made)); ok(made.got.every(n => n === 1), 'not all crafted'); ok(made.left.every(n => n === 0), 'materials left');
  await p.evaluate(() => document.querySelector('#craftwin [data-closewin="craftwin"]').click());
  // ③ 직업 제한 · 화염 저항 +50 — 직업마다 자기 갑옷만 입힘
  const wearTest = async (pg, mine) => pg.evaluate(({ FA, mine }) => { const T = __T, H = T.hero, I = T.INV; H.lv = 56;
    I.load({ bag: FA.map(id => ({ id, n: 1 })), bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); I.render();
    const m = () => ({ fire: T.elemRes('fire'), ac: I.ac(), mr: I.cx('mr'), hp: H.max }); const r = { base: m(), other: {} };
    for (const id of FA) if (id !== mine) { const e = I.bag().find(x => x.id === id); I.use(e); r.other[id] = !!e.on; if (e.on) I.use(e); }
    { H.lv = 50; const e = I.bag().find(x => x.id === mine); I.use(e); r.atLv50 = !!e.on; if (e.on) I.use(e); H.lv = 56; }
    const e = I.bag().find(x => x.id === mine); I.use(e); r.on = !!e.on; r.wear = m(); r.tip = I.tipOf(e).split('\n'); I.render(); return r; }, { FA, mine });
  const res = {}; res.knight = await wearTest(p, 'fd_plate');
  const pw = await page('wizard', 'faW'); res.wizard = await wearTest(pw, 'fd_robe');
  const pe = await page('elf', 'faE'); res.elf = await wearTest(pe, 'fd_leather');
  for (const [c, r] of Object.entries(res)) { console.log(c, JSON.stringify({ base: r.base, wear: r.wear, on: r.on, other: r.other, atLv50: r.atLv50 })); console.log('  tip:', r.tip.join(' | '));
    ok(r.on, c + ' equip'); ok(r.wear.fire - r.base.fire === 50, c + ' fire +50'); ok(Object.values(r.other).every(x => !x), c + ' other class armor equipped'); ok(!r.atLv50, c + ' level limit'); ok(r.wear.ac < r.base.ac, c + ' AC'); }
  // 착용 모습 (기사·법사·요정) · 아이콘 크게
  const shots = [];
  for (const pg of [p, pw, pe]) { await pg.evaluate(() => { const H = __T.hero; H.i = H.fi = 30; H.j = H.fj = 46; H.x = 30.5; H.z = 46.5; __T.ZOOMT = 3; }); await pg.waitForTimeout(2500);
    const [x, y] = await pg.evaluate(() => __T.scr(__T.hero.x, __T.hero.z)); shots.push((await pg.screenshot({ clip: { x: Math.max(0, x - 110), y: Math.max(0, y - 290), width: 220, height: 310 } })).toString('base64')); }
  await p.evaluate(({ FA, shots }) => { const d = document.createElement('div'); d.id = 'icsheet'; d.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;background:#1a1410;padding:10px;display:flex;gap:10px;align-items:flex-end';
    d.innerHTML = FA.concat(['dv_armor', 'ifrit_heart', 'phoenix_feather']).map(id => `<div style="width:110px;text-align:center;color:#eee;font:11px sans-serif"><div style="width:100px;height:100px;margin:auto;background:#2a2230;border:1px solid #555">${__T.ICON(__T.ITEMS[id].icon).replace('<svg ', '<svg width="100" height="100" ')}</div>${__T.ITEMS[id].name}</div>`).join('')
      + shots.map(s => `<img src="data:image/png;base64,${s}" style="width:120px;border:1px solid #555">`).join(''); document.body.appendChild(d); }, { FA, shots });
  await p.waitForTimeout(400); await (await p.$('#icsheet')).screenshot({ path: 'dev/out/fire_armor_icons.png' });
  console.log(fail ? `FAILED ${fail}` : 'ALL OK'); console.log(errs.join('\n') || 'no errors'); await b.close(); })();
