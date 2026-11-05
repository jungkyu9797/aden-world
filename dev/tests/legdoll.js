// 11/5 전설 마법인형 (KT_PORT=8901 bash dev/runkt.sh dev/tests/legdoll.js) — 정의·능력치(받는 피해 % · 마법 명중 · cx) · 전투력·봇 복사 · (11/5 dollmenu) 인형 칸 = [마법인형] 창(DCG) · 영웅 4 → 전설 10% 합성(변신과 같은 홀 연출) · 따라다니는 인형 오로라 · 도감 · LDOLL 연출(데모) · 390px
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v, x) => { R[k] = !!v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k + (x !== undefined ? '  ' + (typeof x === 'string' ? x : JSON.stringify(x)) : '')); };
const LEG = ['doll_deathknight', 'doll_phoenix', 'doll_ice_queen'], HERO4 = ['doll_drake', 'doll_kbugbear', 'doll_troll', 'doll_wyvern'];
const st = p => p.evaluate(() => window.LDOLL && LDOLL.state());
const waitPh = (p, ph, to) => p.waitForFunction(ph => { const s = window.LDOLL && LDOLL.state(); return s && s.ph === ph; }, ph, { timeout: to || 9000 });
const bagIds = p => p.evaluate(() => __T.INV.bag().map(e => e.id));
async function knobDrag(p, full) { const k = await p.evaluate(() => { const r = document.querySelector('.ld-ov .ef-knob').getBoundingClientRect(), t = document.querySelector('.ld-ov .ef-track').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, x1: t.right - 8 }; });
  await p.mouse.move(k.x, k.y); await p.mouse.down(); const end = full ? k.x1 + 40 : k.x + (k.x1 - k.x) * 0.5; for (let i = 1; i <= 10; i++) { await p.mouse.move(k.x + (end - k.x) * i / 10, k.y); await p.waitForTimeout(25); } const mid = await st(p); await p.mouse.up(); return mid; }
(async () => { const b = await chromium.launch(); const errs = []; try {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage(); p.on('pageerror', e => { if (errs.length < 3) errs.push('pc: ' + e.message + ' @ ' + String(e.stack || '').split('\n').slice(2, 5).join(' ')); else errs.push('pc+'); });
  await login(p, { cls: 'knight', name: 'ldPC' });
  // ① 정의
  const D = await p.evaluate(LEG => LEG.map(id => { const d = __T.ITEMS[id]; return d && { id, n: d.name, t: d.tier, r: d.rar, s: d.slot, dk: d.doll, st: ['xdmgM', 'hitM', 'xdmgR', 'hitR', 'sp', 'hitMg', 'drPct', 'mpRegen', 'wPct'].reduce((o, k) => (d[k] ? (o[k] = d[k], o) : o), {}), txt: d.dTxt, desc: d.desc }; }), LEG);
  console.log(JSON.stringify(D.map(d => [d.n, d.st])));
  ok('전설 인형 3종 (4단계 · 전설 · 인형 칸)', D.every(d => d && d.t === 4 && d.r === '전설' && d.s === 'doll') && D.map(d => d.n).join() === '데스나이트 인형,피닉스 인형,얼음여왕 인형');
  ok('데스나이트: 근추5 근명5 받피5% MP회복3 무게10%', JSON.stringify(D[0].st) === JSON.stringify({ xdmgM: 5, hitM: 5, drPct: 5, mpRegen: 3, wPct: 10 }) && D[0].txt === '근거리 추가 피해 +5 · 근거리 명중 +5 · 받는 피해 5% 감소 · MP 회복 +3 · 가방 최대 무게 +10%');
  ok('피닉스: SP5 마명5 받피5% MP회복3 무게10%', JSON.stringify(D[1].st) === JSON.stringify({ sp: 5, hitMg: 5, drPct: 5, mpRegen: 3, wPct: 10 }) && /마법 명중 \+5/.test(D[1].txt));
  ok('얼음여왕: 원추5 원명5 받피5% MP회복3 무게10%', JSON.stringify(D[2].st) === JSON.stringify({ xdmgR: 5, hitR: 5, drPct: 5, mpRegen: 3, wPct: 10 }));
  ok('설명: 위 메뉴 [마법인형] · 금빛 기운 · 거래 불가', D.every(d => /위 메뉴 \[마법인형\]/.test(d.desc) && /금빛 기운/.test(d.desc) && /거래 불가/.test(d.desc)));
  // ② 능력치 (cx · 받는 피해 % · 마법 명중 · 전투력 · 봇 복사)
  const S = await p.evaluate(() => { const T = __T, I = T.INV, bonus = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }, put = id => { I.load({ bag: [], bonus }); const k = id && id.slice(5); if (k) { const S = DCG.state(); S.cards[k] = Math.max(1, S.cards[k] || 0); DCG.setSlot(k); } else DCG.clearSlot(true); I.render(); };   /* 11/5: 인형 칸 = [마법인형] 창 (DCG) */
    const read = () => { const o = {}; for (const k of ['xdmgM', 'hitM', 'xdmgR', 'hitR', 'sp', 'hitMg', 'drPct', 'mpRegen']) o[k] = I.cx(k); o.dmg = I.dmg(); o.maxW = I.maxW(); o.cp = T.CP_(); o.sp_ = I.sp(); return o; };
    const hurt = (src, kind) => { T.GOD_INV = false; const h = T.HERO; h.max = Math.max(h.max, 5000); h.hp = 5000; const o = Math.random; Math.random = () => 0; try { T.HURT_(100, src, kind); } finally { Math.random = o; } return 5000 - h.hp; };
    const mob = () => ({ kind: 'goblin', x: T.HERO.x, z: T.HERO.z }), pvp = () => ({ isRemote: true, peer: 'x', x: T.HERO.x, z: T.HERO.z }), boss = () => ({ kind: 'baphomet', x: T.HERO.x, z: T.HERO.z });
    put(null); const a = read(), ha = [hurt(mob(), 'melee'), hurt(boss(), 'melee'), hurt(pvp(), 'melee'), hurt(pvp(), 'magic')];
    put('doll_deathknight'); const dk = read(), hd = [hurt(mob(), 'melee'), hurt(boss(), 'melee'), hurt(pvp(), 'melee'), hurt(pvp(), 'magic')], mn = T.FBOT_.mine();
    put('doll_ice_queen'); const iq = read(); put('doll_phoenix'); const px = read();
    T.HERO.hp = T.HERO.max = 100; put(null); return { a, dk, iq, px, ha, hd, mnDp: mn && mn.cb.dp, eq: I.equipped('doll') }; });
  console.log('hurt', JSON.stringify([S.ha, S.hd]), 'cp', S.a.cp.total, S.dk.cp.total, JSON.stringify(S.dk.cp.raw));
  ok('cx: 데스나이트 근추·근명·받피·MP회복', S.dk.xdmgM === 5 && S.dk.hitM === 5 && S.dk.drPct === 5 && S.dk.mpRegen === 3 && S.a.drPct === 0);
  ok('근거리 공격력 +5', S.dk.dmg[0] - S.a.dmg[0] === 5 && S.dk.dmg[1] - S.a.dmg[1] === 5, [S.a.dmg, S.dk.dmg]);
  ok('가방 최대 무게 +10%', Math.abs(S.dk.maxW / S.a.maxW - 1.1) < 0.02, [S.a.maxW, S.dk.maxW]);
  ok('얼음여왕: 원추·원명 · 피닉스: SP·마명', S.iq.xdmgR === 5 && S.iq.hitR === 5 && S.px.sp === 5 && S.px.hitMg === 5 && S.px.sp_ - S.a.sp_ === 5);
  ok('받는 피해 5% 감소 (몬스터·보스·대인전 근접·마법)', S.ha.every((v, i) => v > 0 && S.hd[i] === Math.floor(v * 0.95)), [S.ha, S.hd]);
  ok('전투력: 받는 피해 % 감소만큼 올라감', S.dk.cp.total > S.a.cp.total && S.dk.cp.raw.dp === 5 && S.dk.cp.P.etc > S.a.cp.P.etc);
  ok('봇 복사: 받는 피해 % (cb.dp)', S.mnDp === 5);
  // 마법 명중 (마법사로 다시 들어가서)
  { const p2 = await ctx.newPage(); p2.on('pageerror', e => errs.push('wiz: ' + e.message)); await login(p2, { cls: 'wizard', name: 'ldWZ' });
    const M = await p2.evaluate(() => { const T = __T, I = T.INV, bonus = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }, put = id => { I.load({ bag: [], bonus }); const k = id && id.slice(5); if (k) { const S = DCG.state(); S.cards[k] = Math.max(1, S.cards[k] || 0); DCG.setSlot(k); } else DCG.clearSlot(true); I.render(); }, S = { lv: T.HERO.lv, mac: 10 }, D = { lv: T.HERO.lv + 15, ac: -60 };
      put(null); const a = { h: T.HEROHIT_(S, 'magic'), hm: T.HEROHIT_(S), pv: T.PVPHIT_(D, 'magic'), cp: T.CP_().total, hb: T.FBOT_.mine().cb.hb };
      put('doll_phoenix'); const b = { h: T.HEROHIT_(S, 'magic'), hm: T.HEROHIT_(S), pv: T.PVPHIT_(D, 'magic'), cp: T.CP_().total, hb: T.FBOT_.mine().cb.hb }; put(null); return { a, b }; });
    console.log('magic hit', JSON.stringify(M));
    ok('마법 명중 +5 → 마력탄 명중 +15%p (근거리는 그대로)', Math.abs(M.b.h - M.a.h - 0.15) < 1e-9 && M.b.hm === M.a.hm);
    ok('마법 명중 +5 → 대인전 마법 명중 +15%p · 봇 복사 hb', Math.abs(M.b.pv - M.a.pv - 0.15) < 1e-9 && Math.abs(M.b.hb - M.a.hb - 0.15) < 0.002);
    ok('마법사 전투력도 오름', M.b.cp > M.a.cp); await p2.close(); }
  // ③ 합성 확률 (변신과 같음: 영웅→전설 10% · 전설 3종 각 1/3 · 고급→희귀 30% · 희귀→영웅 10%) — 보관함은 되돌림
  const sim = await p.evaluate(() => { const bk = DCG.raw(), o = {}; for (const g of ['고급', '희귀', '영웅']) { let k = 0; const got = {}, n = 20000; for (let i = 0; i < n; i++) { const r = DCG.synOne(g); if (r.ok) { k++; got[r.c.id] = (got[r.c.id] || 0) + 1; } } o[g] = { p: k / n, ok: k, got }; } DCG.load(bk); return o; });
  const legN = ['deathknight', 'phoenix', 'ice_queen'].map(k => sim['영웅'].got[k] || 0); console.log('sim', JSON.stringify(sim['영웅']));
  ok('영웅 4 → 전설 약 10% (변신과 같음)', Math.abs(sim['영웅'].p - 0.1) < 0.01, sim['영웅'].p); ok('전설 3종 각 약 1/3', legN.every(n => Math.abs(n / sim['영웅'].ok - 1 / 3) < 0.05), legN);
  ok('고급→희귀 30% · 희귀→영웅 10%', Math.abs(sim['고급'].p - 0.3) < 0.015 && Math.abs(sim['희귀'].p - 0.1) < 0.01, [sim['고급'].p, sim['희귀'].p]);
  // ④ [마법인형] 창에서 영웅 4개 합성 → 전설 (Math.random 고정 · 결과는 연출 전에 이미 보관함에) → 홀 연출 · 전체 공지 1번
  await p.evaluate(() => { const N = __T.NET, o = N.announceAll; window.__ann = []; N.announceAll = m => { window.__ann.push(m); try { return o.call(N, m); } catch (e) {} }; const S = DCG.state(); S.cards = { drake: 1, kbugbear: 1, troll: 1, wyvern: 1 }; S.slot = {}; S.lock = {}; DCG.setSkip(false); DCG.openWin(true); });
  await p.click('#dw-synb .pw-mt[data-g="영웅"]'); await p.waitForTimeout(150); await p.click('#dw-synb [data-a="fill"]'); await p.waitForTimeout(150);
  await p.evaluate(() => { const o = Math.random; let i = 0; const seq = [0.05, 0.4]; Math.random = () => i < seq.length ? seq[i++] : o(); try { document.querySelector('#dw-synb [data-a="go"]').click(); } finally { Math.random = o; } });
  let S1 = await p.evaluate(() => JSON.parse(JSON.stringify(DCG.state().cards))); ok('성공: 영웅 4개 없어지고 전설 1개 (연출 시작 전에 이미 보관함에)', !S1.drake && !S1.kbugbear && !S1.troll && !S1.wyvern && Object.keys(S1).length === 1 && ['deathknight', 'phoenix', 'ice_queen'].includes(Object.keys(S1)[0]), S1);
  await p.waitForTimeout(1800); ok('홀 연출 (변신 카드와 같은 화면)', await p.evaluate(() => { const o = DCG.ov(); return o && o.k === 'tsyn' && o.n === 1; })); await p.screenshot({ path: 'dev/out/legdoll_syn_hall.png' });
  await p.evaluate(() => { const g = DCG._tg(); if (g) g.openAll(); }); await p.waitForTimeout(400); await p.mouse.click(640, 360); await p.waitForTimeout(6500); await p.screenshot({ path: 'dev/out/legdoll_syn_reveal.png' }); await p.evaluate(() => DCG.close()); await p.waitForTimeout(300);
  await p.waitForFunction(() => window.__ann.length > 0, null, { timeout: 4000 }).catch(() => {}); await p.waitForTimeout(800);
  ok('전체 공지: ○○님이 마법인형 합성에서 [전설] ○○ 인형을 얻었습니다! (1번)', await p.evaluate(() => window.__ann.length === 1 && /님이 마법인형 합성에서 \[전설\] .+ 인형을 얻었습니다!$/.test(window.__ann[0])), await p.evaluate(() => window.__ann));
  // ⑤ 실패: 영웅 1개 돌려받음 · 공지 없음 · 전설은 합성 재료가 아님(희귀·영웅만)
  await p.evaluate(() => { DCG.setSkip(true); const S = DCG.state(); S.cards = { drake: 2, kbugbear: 1, troll: 1, phoenix: 1 }; const o = Math.random; Math.random = () => 0.9; try { DCG.manSyn(['drake', 'drake', 'kbugbear', 'troll']); } finally { Math.random = o; } });
  S1 = await p.evaluate(() => JSON.parse(JSON.stringify(DCG.state().cards))); ok('실패: 영웅 1개만 돌려받음 · 공지 없음', Object.entries(S1).filter(([k]) => ['drake', 'kbugbear', 'troll', 'wyvern', 'shelob', 'spartoi'].includes(k)).reduce((a, [, v]) => a + v, 0) === 1 && S1.phoenix === 1 && await p.evaluate(() => window.__ann.length === 1), S1);
  ok('전설 인형은 합성 재료가 아님', await p.evaluate(() => DCG.manSyn(['phoenix', 'phoenix', 'phoenix', 'phoenix']) === null && !('전설' in DCG.SYN)));
  // ⑥ LDOLL 연출(v236)은 남아 있음 (데모): 밀어서 확인하기 · 건너뛰기
  await p.evaluate(() => { document.getElementById('dollwin').hidden = true; try { localStorage.removeItem('aden_ldseen'); } catch (e) {} LDOLL.demo(true, 'doll_phoenix'); }); await waitPh(p, 'seal', 9000); await p.waitForTimeout(500);
  const half = await knobDrag(p, false); await p.waitForTimeout(400); let s = await st(p); ok('LDOLL: 반만 밀면 안 열리고 제자리', half.p > 0.3 && s.ph === 'seal' && s.p < 0.2, [half.p, s.p]);
  const fullM = await knobDrag(p, true); await p.waitForTimeout(80); s = await st(p); ok('LDOLL: 끝까지 밀면 열림', fullM.p > 0.95 && (s.ph === 'rev' || s.ph === 'done'), s.ph);
  await p.waitForTimeout(1600); s = await st(p); ok('LDOLL: 결과 · 확인', s.res && s.okBtn); await p.click('.ld-ov .ld-ok'); await p.waitForTimeout(200); ok('LDOLL: 닫힘', !(await st(p)));
  // ⑨ 따라다니는 인형: 금빛 오로라 · 다른 유저(presence dl) · 장비 이펙트 끔
  await p.evaluate(() => { const T = __T; T.INV.load({ bag: [], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); const S = DCG.state(); S.cards.deathknight = Math.max(1, S.cards.deathknight || 0); S.slot = {}; DCG.setSlot('deathknight'); T.INV.render(); });
  await p.waitForFunction(() => window.DOLL && DOLL.ready(4), null, { timeout: 10000 }); await p.waitForTimeout(1200);
  const a0 = await p.evaluate(() => DOLL.aura()); ok('내 전설 인형: 금빛 오로라 (전설 변신과 같은 방식)', a0 > 0, a0);
  await p.evaluate(() => { const T = __T; window.__rm = setInterval(() => { DOLL.remote('ldR1', T.HERO.x + 2.2, T.HERO.z + 0.5, 1, 'phoenix', 0); DOLL.remote('ldR2', T.HERO.x - 2.2, T.HERO.z + 0.5, 3, 'ice_queen', 1); DOLL.remote('ldR3', T.HERO.x, T.HERO.z + 2, 1, 'nope_zz', 0); DOLL.remote('fbX', T.HERO.x + 1, T.HERO.z - 2, 5, 'deathknight', 0); }, 100); });
  await p.waitForTimeout(1500); const a1 = await p.evaluate(() => DOLL.aura()); ok('다른 유저 인형도 오로라 · 모르는 인형은 그냥 안 그림 (오류 없음)', a1 > a0 && !errs.length, [a0, a1]);
  { const cl = await p.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(), q = __T.scr(__T.HERO.x, __T.HERO.z); return { x: Math.max(0, q[0] - 200), y: Math.max(0, q[1] - 190), width: 400, height: 260 }; }); await p.screenshot({ path: 'dev/out/legdoll_follow.png', clip: cl }); }
  await p.evaluate(() => __T.EQFX_(false)); await p.waitForTimeout(500); await p.evaluate(() => __T.EQFX_(true)); await p.evaluate(() => clearInterval(window.__rm)); ok('장비 이펙트 끔/켬 오류 없음', !errs.length);
  // 가방 아이콘: 금빛 테두리
  ok('가방 아이콘: 인형 얼굴 + 금빛 테두리', await p.waitForFunction(() => /<image/.test(__T.CXI.doll_phoenix || '') && /ldf/.test(__T.CXI.doll_phoenix), null, { timeout: 12000 }).then(() => true, () => false));
  // 캐릭터 창: 받는 피해 감소 · 장비 명중
  await p.evaluate(() => { document.getElementById('charwin').hidden = false; __T.INV.render(); }); await p.waitForTimeout(200);
  const cw = await p.evaluate(() => [document.getElementById('cw-drx').textContent, document.getElementById('cw-hitx').textContent]); ok('캐릭터 창: 받는 피해 감소 5% · 명중 근/원/마 +5', /5%/.test(cw[0]) && /^\+5 \/ \+0 \/ \+0$/.test(cw[1]), cw);
  await p.evaluate(() => { document.getElementById('charwin').hidden = true; });
  const tip = await p.evaluate(() => __T.INV.tipOf(__T.INV.eqE('doll'))); ok('툴팁: 4단계 마법인형 · 능력치', /4단계 마법인형/.test(tip) && /받는 피해 5% 감소/.test(tip));
  // ⑩ 도감 [마법인형] — 전설 칸 · 얻는 곳
  await p.click('#btn-codex').catch(() => p.evaluate(() => CODEX.open())); await p.waitForTimeout(250);
  await p.evaluate(() => { const t = [...document.querySelectorAll('#cdx-tabs [data-k]')].find(x => /마법인형/.test(x.textContent)); t && t.click(); }); await p.waitForTimeout(250);
  const cdx = await p.evaluate(() => { const L = document.getElementById('cdx-list'); const sub = [...document.querySelectorAll('#codexwin [data-s], #codexwin .cdx-subt')].map(x => x.textContent.trim()); return { t: L.textContent, sub }; });
  ok('도감: 전설 인형 3종 · 영웅 인형 4개 합성 10% · 전설 칸', ['데스나이트 인형', '피닉스 인형', '얼음여왕 인형'].every(n => cdx.t.includes(n)) && /영웅 인형 4개 합성 10%/.test(cdx.t) && cdx.sub.some(x => /^전설/.test(x)), cdx.sub);
  { const tb = await p.evaluate(() => { const x = [...document.querySelectorAll('#codexwin .cdx-subt')].find(e => /^전설/.test(e.textContent.trim())); if (x) x.click(); return !!x; }); await p.waitForTimeout(200); const t2 = await p.evaluate(() => document.getElementById('cdx-list').textContent);
    ok('도감 [전설] 칸 = 전설 인형 3개만', tb && (t2.match(/인형/g) || []).length >= 3 && !/킹 버그베어 인형/.test(t2) && /데스나이트 인형/.test(t2)); await p.screenshot({ path: 'dev/out/legdoll_codex.png' }); }
  await p.evaluate(() => { document.getElementById('codexwin').hidden = true; });
  await p.close();
  // ⑪ 390px: 모바일 가로 844×390 (터치) · 세로 390×844
  for (const [w, h, mob, nm] of [[844, 390, true, 'm390'], [390, 844, false, 'p390']]) {
    const c2 = await b.newContext(Object.assign({ viewport: { width: w, height: h } }, mob ? { hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : {})); const q = await c2.newPage(); q.on('pageerror', e => errs.push(nm + ': ' + e.message));
    await login(q, { cls: 'elf', name: 'ld' + nm, init: mob ? () => { try { localStorage.setItem('aden_mob', '1'); } catch (e) {} } : null });
    await q.evaluate(() => LDOLL.demo(true, 'doll_ice_queen')); await waitPh(q, 'seal', 9000); await q.waitForTimeout(500);
    const inb = await q.evaluate(() => { const V = [innerWidth, innerHeight], f = s => { const e = document.querySelector(s); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; }; return { V, sl: f('.ld-ov .ld-sl'), msg: f('.ld-ov .ld-msg') }; });
    const fit = r => r && r[0] >= 0 && r[1] >= 0 && r[2] <= inb.V[0] && r[3] <= inb.V[1];
    ok(`${nm}: 밀어서 확인하기가 화면 안`, fit(inb.sl) && fit(inb.msg), inb); await q.screenshot({ path: `dev/out/legdoll_${nm}_slide.png` });
    const cc = await q.evaluate(() => [innerWidth / 2, innerHeight * 0.42]); for (let i = 0; i < 3; i++) { if (mob) await q.touchscreen.tap(cc[0], cc[1]); else await q.mouse.click(cc[0], cc[1]); await q.waitForTimeout(110); }
    await q.waitForTimeout(2000); const s3 = await st(q); const rb = await q.evaluate(() => { const V = [innerWidth, innerHeight], rr = e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; }; return { V, res: rr(document.querySelector('.ld-ov .ld-res')), ok: rr(document.querySelector('.ld-ov .ld-ok')), sk: rr(document.querySelector('.ld-ov .ld-skip')) }; });
    ok(`${nm}: ${mob ? '톡톡 3번' : '누르기 3번'} → 결과 · 글·확인 버튼이 화면 안`, s3 && s3.res && s3.okBtn && [rb.res, rb.ok, rb.sk].every(r => r[0] >= 0 && r[1] >= 0 && r[2] <= rb.V[0] && r[3] <= rb.V[1]), rb);
    await q.screenshot({ path: `dev/out/legdoll_${nm}_success.png` }); if (mob) await q.tap('.ld-ov .ld-ok'); else await q.click('.ld-ov .ld-ok'); await q.waitForTimeout(150); ok(`${nm}: 확인 → 닫힘`, !(await st(q)));
    await q.evaluate(() => LDOLL.demo(false)); await waitPh(q, 'seal', 9000); await q.waitForTimeout(300); await q.evaluate(() => LDOLL.reveal()); await q.waitForTimeout(1900); await q.screenshot({ path: `dev/out/legdoll_${nm}_fail.png` }); await q.evaluate(() => LDOLL.close());
    await c2.close(); }
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  ok('페이지 오류 없음', !errs.length, errs.slice(0, 4).join(' | ') + (errs.length > 4 ? ` … (${errs.length})` : ''));
  const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : 'ALL OK'); await b.close(); })();
