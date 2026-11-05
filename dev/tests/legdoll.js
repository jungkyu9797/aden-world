// 11/5 전설 마법인형 (KT_PORT=8901 bash dev/runkt.sh dev/tests/legdoll.js) — 정의·능력치(받는 피해 % · 마법 명중 · cx) · 전투력·봇 복사 · 합성(영웅 4 → 전설 20%) · 연출(밀기·누르기·Space·건너뛰기) · 따라다니는 인형 오로라 · 도감 · 390px
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v, x) => { R[k] = !!v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k + (x !== undefined ? '  ' + (typeof x === 'string' ? x : JSON.stringify(x)) : '')); };
const LEG = ['doll_deathknight', 'doll_phoenix', 'doll_ice_queen'], HERO4 = ['doll_drake', 'doll_kbugbear', 'doll_troll', 'doll_wyvern'];
const st = p => p.evaluate(() => window.LDOLL && LDOLL.state());
const waitPh = (p, ph, to) => p.waitForFunction(ph => { const s = window.LDOLL && LDOLL.state(); return s && s.ph === ph; }, ph, { timeout: to || 9000 });
// 가방에 영웅 인형 4개(+α)를 넣고 제작 장인 [인형 합성] → 3단계 자동 넣기 → 합성 → (Math.random 고정) 예
async function mix(p, seq, bag) {
  await p.evaluate(([bag]) => { const T = __T; T.INV.load({ bag: bag.map(id => ({ id, n: 1, en: 0 })), bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); T.INV.render(); T.CRAFT_.open(); }, [bag || HERO4]);
  await p.waitForTimeout(150); await p.click('#craftwin [data-ct=doll]'); await p.waitForTimeout(150); await p.click('#craftwin [data-da="3"]'); await p.waitForTimeout(120);
  const sel = await p.evaluate(() => __T.CRAFT_.dollSel(3).map(e => e && e.id)); await p.click('#craftwin [data-dl="3"]'); await p.waitForSelector('#askwin:not([hidden])');
  await p.evaluate(seq => { const o = Math.random; let i = 0; Math.random = () => i < seq.length ? seq[i++] : o(); document.getElementById('ask-yes').click(); Math.random = o; }, seq);   // 고친 Math.random은 누른 직후 바로 되돌림 (게임 루프가 먹지 않게)
  return sel; }
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
  ok('설명: 영웅 4개 · 20%', D.every(d => /영웅\(3단계\) 인형 4개/.test(d.desc) && /20%/.test(d.desc)));
  // ② 능력치 (cx · 받는 피해 % · 마법 명중 · 전투력 · 봇 복사)
  const S = await p.evaluate(() => { const T = __T, I = T.INV, bonus = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }, put = id => { I.load({ bag: id ? [{ id, n: 1, en: 0, on: 'doll' }] : [], bonus }); I.render(); };
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
    const M = await p2.evaluate(() => { const T = __T, I = T.INV, bonus = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }, put = id => { I.load({ bag: id ? [{ id, n: 1, en: 0, on: 'doll' }] : [], bonus }); I.render(); }, S = { lv: T.HERO.lv, mac: 10 }, D = { lv: T.HERO.lv + 15, ac: -60 };
      put(null); const a = { h: T.HEROHIT_(S, 'magic'), hm: T.HEROHIT_(S), pv: T.PVPHIT_(D, 'magic'), cp: T.CP_().total, hb: T.FBOT_.mine().cb.hb };
      put('doll_phoenix'); const b = { h: T.HEROHIT_(S, 'magic'), hm: T.HEROHIT_(S), pv: T.PVPHIT_(D, 'magic'), cp: T.CP_().total, hb: T.FBOT_.mine().cb.hb }; put(null); return { a, b }; });
    console.log('magic hit', JSON.stringify(M));
    ok('마법 명중 +5 → 마력탄 명중 +15%p (근거리는 그대로)', Math.abs(M.b.h - M.a.h - 0.15) < 1e-9 && M.b.hm === M.a.hm);
    ok('마법 명중 +5 → 대인전 마법 명중 +15%p · 봇 복사 hb', Math.abs(M.b.pv - M.a.pv - 0.15) < 1e-9 && Math.abs(M.b.hb - M.a.hb - 0.15) < 0.002);
    ok('마법사 전투력도 오름', M.b.cp > M.a.cp); await p2.close(); }
  // ③ 확률 (2만 번 · 가방은 그대로)
  const sim = await p.evaluate(() => __T.CRAFT_.dollSim(3, 20000)); const legN = ['doll_deathknight', 'doll_phoenix', 'doll_ice_queen'].map(k => sim.got[k] || 0);
  console.log('sim', JSON.stringify(sim));
  ok('영웅 4 → 전설 약 20%', Math.abs(sim.p - 0.2) < 0.015, sim.p); ok('전설 3종 각 약 1/3', legN.every(n => Math.abs(n / sim.ok - 1 / 3) < 0.04), legN);
  { const s2 = await p.evaluate(() => [__T.CRAFT_.dollSim(1, 8000).p, __T.CRAFT_.dollSim(2, 8000).p]); ok('1→2 40% · 2→3 30% 그대로', Math.abs(s2[0] - 0.4) < 0.03 && Math.abs(s2[1] - 0.3) < 0.03, s2); }
  // ④ 합성 성공: 영웅 4개 사라지고 전설 1개 (연출 전에 이미 가방에) → 연출: 어두운 화면 · 돎 · 밀어서 확인 · 금빛
  await p.evaluate(() => { try { localStorage.removeItem('aden_ldseen'); } catch (e) {} const N = __T.NET, o = N.announceAll; window.__ann = []; N.announceAll = m => { window.__ann.push(m); try { return o.call(N, m); } catch (e) {} }; });
  const sel = await mix(p, [0.05, 0.5], HERO4.concat(['pot_red']));
  ok('자동 넣기: 영웅 인형 4개 (섞어서)', sel.length === 4 && sel.every(id => HERO4.includes(id)) && new Set(sel).size === 4, sel);
  let bag = await bagIds(p); ok('성공: 넣은 영웅 4개 없어지고 피닉스 인형 1개 — 연출 시작 전에 이미 가방에', !bag.some(id => HERO4.includes(id)) && bag.filter(id => id === 'doll_phoenix').length === 1 && bag.filter(id => LEG.includes(id)).length === 1, bag);
  await p.waitForTimeout(250); let s = await st(p); ok('연출: 전체 화면 어두운 막', s && (s.ph === 'in' || s.ph === 'orbit') && await p.evaluate(() => { const r = document.querySelector('.ld-ov').getBoundingClientRect(); return r.width === innerWidth && r.height === innerHeight; }));
  ok('처음 보는 기기는 건너뛰기 없음', s && !s.skip);
  await p.waitForTimeout(1900); s = await st(p); ok('영웅 인형 4개가 돎 (orbit) · 화면 흔들림', s.ph === 'orbit' && s.parts > 10 && s.shk > 0, s); await p.screenshot({ path: 'dev/out/legdoll_orbit.png' });
  { const h0 = await p.evaluate(() => __T.HF_.lv); await p.evaluate(() => __T.HF_.set(0)); await p.waitForTimeout(300); const s0 = await st(p); await p.evaluate(v => __T.HF_.set(v), h0); ok('타격 연출 [끔]이면 흔들림만 없음 (입자는 그대로)', s0.shk === 0 && s0.parts > 10, s0); }
  ok('연출 중 가방 = 최종 결과 (새로고침해도 그대로)', JSON.stringify(await bagIds(p)) === JSON.stringify(bag));
  await waitPh(p, 'seal'); await p.waitForTimeout(500); s = await st(p); ok('봉인된 구슬 + 밀어서 확인하기', s.slide && await p.evaluate(() => /밀어서 확인하기/.test(document.querySelector('.ld-ov .ef-hint').textContent)));
  await p.screenshot({ path: 'dev/out/legdoll_slide.png' });
  const half = await knobDrag(p, false); await p.waitForTimeout(400); s = await st(p); ok('반만 밀면 안 열리고 제자리', half.p > 0.3 && s.ph === 'seal' && s.p < 0.2, [half.p, s.p]);
  const fullM = await knobDrag(p, true); await p.waitForTimeout(80); s = await st(p); ok('끝까지 밀면 열림 (마우스 끌기)', fullM.p > 0.95 && (s.ph === 'rev' || s.ph === 'done'), s.ph);
  await p.waitForTimeout(280); await p.screenshot({ path: 'dev/out/legdoll_burst.png' });
  await p.waitForTimeout(1400); s = await st(p); ok('성공 결과: 큰 그림 · 이름·전설·능력치 · 확인', s.res && s.okBtn && s.art && await p.evaluate(() => { const r = document.querySelector('.ld-res'); return /피닉스 인형/.test(r.textContent) && /전설/.test(r.querySelector('.ld-badge').textContent) && r.querySelectorAll('.ld-st span').length === 5 && /마법 명중 \+5/.test(r.textContent); }));
  ok('결과가 열린 뒤엔 건너뛰기 보임', s.skip);
  ok('전체 공지: ○○님이 전설 [피닉스 인형]을 합성했습니다!', await p.evaluate(() => window.__ann.length === 1 && /님이 전설 \[피닉스 인형\]을 합성했습니다!$/.test(window.__ann[0])), await p.evaluate(() => window.__ann));
  await p.waitForTimeout(900); await p.screenshot({ path: 'dev/out/legdoll_success.png' });
  await p.click('.ld-ov .ld-ok'); await p.waitForTimeout(200); ok('확인 → 닫힘 · 합성 칸 결과 금빛', !(await st(p)) && !(await p.$('.ld-ov')) && await p.evaluate(() => !!document.querySelector('#craftwin .dg-res.ok.t4')));
  ok('공지는 한 번만', await p.evaluate(() => window.__ann.length === 1));
  // ⑤ 합성 실패: 넣은 것 중 1개 돌려받음 · 누르기(3번)로 열기 · 잿빛
  const sel2 = await mix(p, [0.9, 0.1, 0.9], HERO4); bag = await bagIds(p);
  { const dl = bag.filter(id => id.startsWith('doll_')); ok('실패: 영웅 1개만 돌려받음 (넣은 것 중)', dl.length === 1 && dl[0] === sel2[3] && !bag.some(id => LEG.includes(id)), [sel2, bag]); }
  s = await st(p); ok('한 번 본 기기는 처음부터 건너뛰기', s && s.skip);
  await waitPh(p, 'seal'); await p.waitForTimeout(450); const c = await p.evaluate(() => { const r = document.querySelector('.ld-ov').getBoundingClientRect(); return [r.width / 2, r.height * 0.42]; });
  for (let i = 0; i < 2; i++) { await p.mouse.click(c[0], c[1]); await p.waitForTimeout(120); } s = await st(p); ok('누르기 2번: 아직 (금만 감)', s.ph === 'seal' && s.p > 0.5, s.p);
  await p.mouse.click(c[0], c[1]); await p.waitForTimeout(60); s = await st(p); ok('누르기 3번 → 열림 (대신 누르기)', s.ph === 'rev', s.ph);
  await p.waitForTimeout(350); await p.screenshot({ path: 'dev/out/legdoll_fail_crack.png' });
  await p.waitForTimeout(1500); s = await st(p); ok('실패 결과: 실패… 영웅 인형 1개를 돌려받았어요', s.res && await p.evaluate(() => /실패/.test(document.querySelector('.ld-res').textContent) && /영웅 인형 1개를 돌려받았어요/.test(document.querySelector('.ld-res').textContent)));
  ok('실패는 공지 없음', await p.evaluate(() => window.__ann.length === 1)); await p.screenshot({ path: 'dev/out/legdoll_fail.png' });
  await p.keyboard.press('Enter'); await p.waitForTimeout(150); ok('Enter로 닫기', !(await st(p)));
  // ⑥ 건너뛰기: 돌고 있을 때 → 바로 결과 (결과 그대로)
  await mix(p, [0.1, 0.9], HERO4); bag = await bagIds(p); await p.waitForTimeout(900); s = await st(p); ok('건너뛰기 버튼 (orbit 중)', s.skip && s.ph !== 'done');
  await p.click('.ld-ov .ld-skip'); await p.waitForTimeout(250); s = await st(p); ok('건너뛰기 → 바로 결과 화면', s.ph === 'done' && s.res && s.okBtn && await p.evaluate(() => /얼음여왕 인형/.test(document.querySelector('.ld-res').textContent)));
  ok('건너뛰어도 결과·가방 그대로 · 공지 1번', JSON.stringify(await bagIds(p)) === JSON.stringify(bag) && bag.includes('doll_ice_queen') && await p.evaluate(() => window.__ann.length === 2 && /얼음여왕/.test(window.__ann[1])));
  await p.screenshot({ path: 'dev/out/legdoll_skip.png' }); await p.keyboard.press('Escape'); await p.waitForTimeout(150); ok('결과에서 Esc → 닫힘', !(await st(p)));
  // ⑦ Space 꾹 누르기
  await mix(p, [0.01, 0.01], HERO4); await waitPh(p, 'seal'); await p.waitForTimeout(300); await p.keyboard.down('Space'); await p.waitForTimeout(1300); s = await st(p); await p.keyboard.up('Space'); ok('Space 꾹 → 열림 (데스나이트)', (s.ph === 'rev' || s.ph === 'done') && s.id === 'doll_deathknight', s);
  await p.waitForTimeout(1800); await p.screenshot({ path: 'dev/out/legdoll_success_dk.png' }); await p.click('.ld-ov .ld-ok'); await p.waitForTimeout(150);
  // ⑧ 전설은 합성에 못 넣음 · 합성 칸
  ok('전설 인형은 합성 칸에 못 넣음', await p.evaluate(() => { const T = __T, e = T.INV.bag().find(x => x.id === 'doll_deathknight'); T.CRAFT_.dollToggle(e); return !T.CRAFT_.dollSel(3).includes(e) && ![1, 2].some(t => T.CRAFT_.dollSel(t).includes(e)); }));
  await p.screenshot({ path: 'dev/out/legdoll_craft.png' });
  // ⑨ 따라다니는 인형: 금빛 오로라 · 다른 유저(presence dl) · 장비 이펙트 끔
  await p.evaluate(() => { document.getElementById('craftwin').hidden = true; const T = __T; T.INV.load({ bag: [{ id: 'doll_deathknight', n: 1, en: 0, on: 'doll' }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); T.INV.render(); });
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
  const tip = await p.evaluate(() => __T.INV.tipOf(__T.INV.bag()[0])); ok('툴팁: 4단계 마법인형 · 능력치', /4단계 마법인형/.test(tip) && /받는 피해 5% 감소/.test(tip));
  // ⑩ 도감 [마법인형] — 전설 칸 · 얻는 곳
  await p.click('#btn-codex').catch(() => p.evaluate(() => CODEX.open())); await p.waitForTimeout(250);
  await p.evaluate(() => { const t = [...document.querySelectorAll('#cdx-tabs [data-k]')].find(x => /마법인형/.test(x.textContent)); t && t.click(); }); await p.waitForTimeout(250);
  const cdx = await p.evaluate(() => { const L = document.getElementById('cdx-list'); const sub = [...document.querySelectorAll('#codexwin [data-s], #codexwin .cdx-subt')].map(x => x.textContent.trim()); return { t: L.textContent, sub }; });
  ok('도감: 전설 인형 3종 · 영웅 4개 → 20% · 전설 칸', ['데스나이트 인형', '피닉스 인형', '얼음여왕 인형'].every(n => cdx.t.includes(n)) && /영웅\(3단계\) 인형 4개 → 성공 20%/.test(cdx.t) && cdx.sub.some(x => /^전설/.test(x)), cdx.sub);
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
