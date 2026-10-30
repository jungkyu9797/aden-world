// 화룡 장비 7종 (제작 장인 브론) 테스트 (python3 dev/mkkt.py && bash dev/runkt.sh dev/tests/fire_craft.js)
// ① 재료를 넣고 7종 실제 제작 ② 재료가 모자라면 안 만들어짐 (10/30: 다른 재료가 다 있어도 이프리트의 심장이 없으면 못 만듦) ③ 착용 후 수치(방어·화염 저항·공격·SP) ④ 오류 없음 · 스크린샷 dev/out/fire_craft.png (제작 창) · fire_craft_icons.png (아이콘 크게) · fire_craft_look.png (기사 착용 모습)
const { chromium } = require('playwright'); const login = require('../tq.js');
const FD = ['fd_helm', 'fd_armor', 'fd_gloves', 'fd_boots', 'fd_sword', 'fd_staff', 'fd_bow'];
const MATS = [['fire_scale', 94], ['astazio_ash', 17], ['phoenix_feather', 3], ['ifrit_heart', 7]];   // 7종 재료 합 (비늘 10+20+8+8+16×3 · 재 2+4+1+1+3×3 · 깃털 3 · 심장 1×7)
(async () => { const b = await chromium.launch(); const errs = []; let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } };
  const page = async (cls, name) => { const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(cls + ': ' + e.message));
    p.on('console', m => { if (/장비 도감|아이콘 없음|해석하지 못한/.test(m.text())) errs.push(cls + ' console: ' + m.text()); }); await login(p, { cls, name }); return p; };
  const p = await page('knight', 'fcK');
  // 0) 정의 · 드랍표에 섞이지 않았는지 · 네트워크 아이템 번호(ITEMS 맨 뒤)
  const D = await p.evaluate(FD => { const T = __T, I = T.ITEMS, keys = Object.keys(I);
    const inDrop = id => [T.DROP_TABLE, T.MOB_DROPS].some(Tb => Object.values(Tb).some(L => L.some(r => r[0] === id))) || T.CX_HERO.includes(id) || [T.CX_ZONE, T.CX_ZONE_R, T.CX_ZONE_H].some(Z => Object.values(Z).some(L => L.includes(id)));
    return { last: keys.slice(-7), defs: FD.map(id => { const d = I[id]; return d && { id, name: d.name, rar: d.rar, lv: d.lv, cls: d.cls, dmg: d.dmg, ac: d.ac, mr: d.mr, hit: d.hit, xd: d.xdmg, fire: d.fireRes, hp: d.hp, mp: d.mp, sp: d.sp, str: d.str, dex: d.dex, drg: d.dragonDmg, drgM: d.dragonMagic, mpD: d.mpDrain, look: d.look, icon: !!T.CXI[d.icon], price: d.price, src: d.src, desc: d.desc, drop: inDrop(id) }; }),
      mats: ['fire_scale', 'astazio_ash', 'phoenix_feather', 'ifrit_heart'].map(id => I[id].desc), heart: I.ifrit_heart && { rar: I.ifrit_heart.rar, desc: I.ifrit_heart.desc }, dv: ['dv_helm', 'dv_armor', 'dv_gloves', 'dv_boots', 'dv_sword', 'dv_staff', 'dv_bow'].map(id => { const d = I[id]; return [d.name, d.dmg, d.ac, d.mr, d.fireRes, d.hp]; }) }; }, FD);
  for (const d of D.defs) { ok(d, 'missing item'); if (!d) continue; console.log(JSON.stringify(d)); ok(d.icon, d.id + ' icon'); ok(!d.drop, d.id + ' in drop table'); ok(/제작 장인 브론/.test(d.src), d.id + ' src'); ok(d.fire > 0, d.id + ' fireRes'); }
  ok(JSON.stringify(D.last) === JSON.stringify(FD), 'ITEMS 맨 뒤가 아님: ' + D.last.join(','));
  for (const t of D.mats) { console.log('mat:', t); ok(/제작 장인 브론/.test(t) && !/나중에/.test(t), 'material desc'); }
  ok(D.heart && D.heart.rar === '영웅' && /^화룡 장비의 핵심 재료/.test(D.heart.desc), 'heart desc: 화룡 장비의 핵심 재료');
  for (const d of D.defs) if (d) ok(/이프리트의 심장 1/.test(d.src), d.id + ' src에 심장');
  console.log('dv:', JSON.stringify(D.dv));
  // ② 재료 부족(비늘 7 · 재 2 · 깃털 0 — 가장 적게 드는 장갑·장화도 비늘 8) → 버튼 꺼짐 · 억지로 눌러도 안 만들어짐
  await p.evaluate(() => { const T = __T; T.hero.lv = 56; T.INV.load({ bag: [{ id: 'fire_scale', n: 7 }, { id: 'astazio_ash', n: 2 }, { id: 'red_potion', n: 5 }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); T.INV.render(); T.CRAFT_.open(); document.querySelector('#craftwin [data-ct="gear"]').click(); });
  await p.waitForTimeout(300);
  const lack = await p.evaluate(FD => { const st = FD.map(id => { const bt = document.querySelector(`#cr-list button[data-gr="${id}"]`); return bt ? bt.disabled : 'none'; });
    const bt = document.querySelector('#cr-list button[data-gr="fd_helm"]'); bt.disabled = false; bt.click();
    return { st, ask: !document.getElementById('askwin') || document.getElementById('askwin').hidden, log: __T.log.slice(-1).map(x => x.t || x.text || x)[0], n: __T.INV.count('fd_helm'), sc: __T.INV.count('fire_scale') }; }, FD);
  console.log('lack', JSON.stringify(lack)); ok(lack.st.every(x => x === true), 'buttons not disabled when lacking'); ok(lack.n === 0 && lack.sc === 7, 'crafted without materials'); ok(/재료가 모자라요/.test(lack.log || ''), 'lack message');
  // ②-2 심장만 없음 (비늘·재·깃털은 넉넉) → 7종 모두 버튼 꺼짐
  await p.evaluate(MATS => { const T = __T; T.INV.load({ bag: MATS.filter(([id]) => id !== 'ifrit_heart').map(([id, n]) => ({ id, n })).concat([{ id: 'red_potion', n: 5 }]), bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); T.INV.render(); }, MATS);
  await p.waitForTimeout(400);
  const noHeart = await p.evaluate(FD => FD.map(id => { const bt = document.querySelector(`#cr-list button[data-gr="${id}"]`); return bt ? bt.disabled : 'none'; }), FD);
  console.log('noHeart', JSON.stringify(noHeart)); ok(noHeart.every(x => x === true), 'craftable without ifrit heart');
  const need = await p.evaluate(() => [...document.querySelectorAll('#cr-list .cr-row')].filter(r => r.querySelector('button[data-gr^="fd_"]')).map(r => r.textContent.replace(/\s+/g, ' ').trim().slice(0, 400)));
  console.log('rows', JSON.stringify(need)); ok(need.length === 7 && need.every(t => /이프리트의 심장/.test(t)), 'recipe rows show heart');
  // ① 재료 넣고 7종 제작
  await p.evaluate(MATS => { const T = __T; T.INV.load({ bag: MATS.map(([id, n]) => ({ id, n })).concat([{ id: 'red_potion', n: 5 }]), bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); T.INV.render(); }, MATS);
  await p.waitForTimeout(500);
  const en = await p.evaluate(FD => FD.map(id => { const bt = document.querySelector(`#cr-list button[data-gr="${id}"]`); return bt && !bt.disabled; }), FD);
  console.log('enabled', JSON.stringify(en)); ok(en.every(Boolean), 'buttons enabled with materials');
  await p.evaluate(() => { const L = document.getElementById('cr-list'), r = L.querySelector('button[data-gr="fd_helm"]').closest('.cr-row'); L.scrollTop = r.offsetTop - L.offsetTop - 4; });
  await p.waitForTimeout(300); await (await p.$('#craftwin')).screenshot({ path: 'dev/out/fire_craft.png' });
  for (const id of FD) { await p.click(`#cr-list button[data-gr="${id}"]`); await p.waitForSelector('#ask-yes', { state: 'visible' }); await p.click('#ask-yes'); await p.waitForTimeout(250); }
  const made = await p.evaluate(({ FD, MATS }) => ({ got: FD.map(id => __T.INV.count(id)), left: MATS.map(([id]) => __T.INV.count(id)), log: __T.log.slice(-2).map(x => x.t || x.text || x) }), { FD, MATS });
  console.log('made', JSON.stringify(made)); ok(made.got.every(n => n === 1), 'not all crafted'); ok(made.left.every(n => n === 0), 'materials left');
  await p.evaluate(() => document.querySelector('#craftwin [data-closewin="craftwin"]').click());
  // ③ 기사: 맨몸 → 용비늘 → 화룡 (방어·화염 저항·HP·공격·용족 추가 피해) · 다른 직업 무기는 못 낌
  const K = await p.evaluate(() => { const T = __T, H = T.hero, I = T.INV;
    const m = () => ({ ac: I.ac(), fire: T.elemRes('fire'), hp: H.max, mr: I.cx('mr'), dmg: I.dmg(), drg: I.cx('dragonDmg'), str: I.stat().str });
    const wear = ids => { for (const e of I.bag().filter(e => e.on)) I.use(e); for (const id of ids) { const e = I.bag().find(x => x.id === id && !x.on); if (e) I.use(e); } I.render(); return ids.map(id => !!I.bag().find(x => x.id === id && x.on)); };
    for (const id of ['dv_helm', 'dv_armor', 'dv_gloves', 'dv_boots', 'dv_sword']) I.add(id, 1, true);
    const r = { base: (wear([]), m()) }; r.dvOn = wear(['dv_helm', 'dv_armor', 'dv_gloves', 'dv_boots', 'dv_sword']); r.dv = m();
    r.fdOn = wear(['fd_helm', 'fd_armor', 'fd_gloves', 'fd_boots', 'fd_sword']); r.fd = m();
    { const e = I.bag().find(x => x.id === 'fd_staff'); I.use(e); r.staffOnKnight = !!e.on; const e2 = I.bag().find(x => x.id === 'fd_bow'); I.use(e2); r.bowOnKnight = !!e2.on; }
    { H.lv = 50; const e = I.bag().find(x => x.id === 'fd_helm'); I.use(e); I.use(e); r.helmAtLv50 = !!e.on; H.lv = 56; if (!e.on) I.use(e); }
    r.tip = I.tipOf(I.bag().find(x => x.id === 'fd_armor')).split('\n'); r.tipW = I.tipOf(I.bag().find(x => x.id === 'fd_sword')).split('\n'); return r; });
  console.log('knight', JSON.stringify({ base: K.base, dv: K.dv, fd: K.fd, dvOn: K.dvOn, fdOn: K.fdOn, staffOnKnight: K.staffOnKnight, bowOnKnight: K.bowOnKnight, helmAtLv50: K.helmAtLv50 }));
  console.log('tip armor:', K.tip.join(' | ')); console.log('tip sword:', K.tipW.join(' | '));
  ok(K.fdOn.every(Boolean), 'fd not equipped'); ok(K.fd.ac < K.dv.ac, 'AC not better than dv'); ok(K.fd.fire > K.dv.fire, 'fire res not better'); ok(K.fd.hp > K.dv.hp, 'HP not better');
  ok(K.fd.dmg[1] > K.dv.dmg[1], 'dmg not better'); ok(K.fd.drg > K.dv.drg, 'dragon dmg'); ok(!K.staffOnKnight && !K.bowOnKnight, 'other class weapon equipped'); ok(!K.helmAtLv50, 'level limit');
  // 기사 착용 모습 (화룡 장비 색)
  await p.evaluate(() => { const H = __T.hero; H.i = H.fi = 30; H.j = H.fj = 46; H.x = 30.5; H.z = 46.5; __T.ZOOMT = 3; }); await p.waitForTimeout(2500);   // NPC 말풍선이 없는 자리
  { const [x, y] = await p.evaluate(() => __T.scr(__T.hero.x, __T.hero.z)); await p.screenshot({ path: 'dev/out/fire_craft_look.png', clip: { x: Math.max(0, x - 120), y: Math.max(0, y - 300), width: 240, height: 320 } }); }
  // 아이콘 크게 (확인용)
  await p.evaluate(FD => { const d = document.createElement('div'); d.id = 'icsheet'; d.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;background:#1a1410;padding:10px;display:flex;gap:10px';
    d.innerHTML = FD.concat(['dv_helm', 'dv_sword', 'fire_scale', 'astazio_ash', 'phoenix_feather']).map(id => `<div style="width:110px;text-align:center;color:#eee;font:11px sans-serif"><div style="width:100px;height:100px;margin:auto;background:#2a2230;border:1px solid #555">${__T.ICON(__T.ITEMS[id].icon).replace('<svg ', '<svg width="100" height="100" ')}</div>${__T.ITEMS[id].name}</div>`).join(''); document.body.appendChild(d); }, FD);
  await p.waitForTimeout(400); await (await p.$('#icsheet')).screenshot({ path: 'dev/out/fire_craft_icons.png' });
  // 법사: 화룡의 지팡이 (SP·용족 마법 피해·MP 흡수) · 요정: 화룡의 활
  const pw = await page('wizard', 'fcW');
  const W = await pw.evaluate(() => { const T = __T, H = T.hero, I = T.INV; H.lv = 56; I.load({ bag: [{ id: 'dv_staff', n: 1 }, { id: 'fd_staff', n: 1 }, { id: 'fd_armor', n: 1 }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); I.render();
    const m = () => ({ sp: T.heroSP(), dm: I.cx('dragonMagic'), fire: T.elemRes('fire'), ac: I.ac() }); const r = { base: m() };
    I.use(I.bag().find(x => x.id === 'dv_staff')); r.dv = m(); I.use(I.bag().find(x => x.id === 'fd_staff')); r.fd = m(); I.use(I.bag().find(x => x.id === 'fd_armor')); r.fdArmor = m(); r.on = I.bag().filter(x => x.on).map(x => x.id); r.mpD = T.ITEMS.fd_staff.mpDrain; return r; });
  console.log('wizard', JSON.stringify(W)); ok(W.on.includes('fd_staff') && W.on.includes('fd_armor'), 'wizard equip'); ok(W.fd.sp > W.dv.sp && W.fd.dm > W.dv.dm, 'staff not better');
  const pe = await page('elf', 'fcE');
  const E = await pe.evaluate(() => { const T = __T, H = T.hero, I = T.INV; H.lv = 56; I.load({ bag: [{ id: 'dv_bow', n: 1 }, { id: 'fd_bow', n: 1 }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); I.render();
    const m = () => ({ dmg: I.dmg(), drg: I.cx('dragonDmg'), fire: T.elemRes('fire'), dex: I.stat().dex }); const r = {}; I.use(I.bag().find(x => x.id === 'dv_bow')); r.dv = m(); I.use(I.bag().find(x => x.id === 'fd_bow')); r.fd = m(); r.on = I.bag().filter(x => x.on).map(x => x.id); return r; });
  console.log('elf', JSON.stringify(E)); ok(E.on.includes('fd_bow'), 'elf equip'); ok(E.fd.dmg[1] > E.dv.dmg[1] && E.fd.drg > E.dv.drg, 'bow not better');
  console.log(fail ? `FAILED ${fail}` : 'ALL OK'); console.log(errs.join('\n') || 'no errors'); await b.close(); })();
