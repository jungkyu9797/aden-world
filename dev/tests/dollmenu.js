// 11/5 마법인형 = 변신 카드와 같은 시스템 (KT_PORT=8881 bash dev/runkt.sh dev/tests/dollmenu.js)
// 위 메뉴 [마법인형] · 1·11회 뽑기 골드·확률 · 무료 2시간 · 마일리지 → 전설 · 합성 확률·천장·자동 합성·잠금 · 인형 칸 → 능력치·따라다니는 인형·NET·봇 복사
// 다시 접속 · 다른 직업 · 옮기기(가방·장착·창고 → 보관함 · 개수 · 두 번 안 옮김 · 저장 실패·보관함 읽기 실패) · 주머니 · 가방 탭·브론 탭 없음 · 모바일 390
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v, x) => { R[k] = !!v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k + (x !== undefined ? '  ' + (typeof x === 'string' ? x : JSON.stringify(x)) : '')); };
const PORT = process.env.KT_PORT || 8766, OUT = 'dev/out/dollmenu_';
const st = p => p.evaluate(() => JSON.parse(JSON.stringify(DCG.state())));
const tot = S => Object.values(S.cards).reduce((a, v) => a + v, 0);
const bagDolls = p => p.evaluate(() => __T.INV.bag().filter(e => __T.ITEMS[e.id] && __T.ITEMS[e.id].doll).map(e => e.id + (e.on ? '@' + e.on : '')));
const logHas = (p, re) => p.evaluate(src => __T.log.slice(-40).some(x => new RegExp(src).test(x.t || x)), re.source);
// 같은 계정으로 다시 접속 (이 기기 저장 · 같은 브라우저)
async function relogin(ctx, acc, cls, name) { const p = await ctx.newPage(); p.on('pageerror', e => ERR.push(cls + ' relogin: ' + e.message));
  await p.goto(`http://127.0.0.1:${PORT}/_kt2.html`); await p.waitForSelector('#lg-mode', { state: 'visible' }); await p.fill('#lg-acc', acc); await p.fill('#lg-pw', 'abcd'); await p.click('#lg-go');
  await p.waitForSelector(`.cs-card[data-cls="${cls}"]`, { state: 'visible', timeout: 30000 }); await p.click(`.cs-card[data-cls="${cls}"]`); await p.click('#cs-start');
  try { await p.waitForSelector('#nm-in', { state: 'visible', timeout: 2500 }); await p.fill('#nm-in', name); await p.click('#nm-go'); } catch (e) {}
  await p.waitForFunction(() => window.__gameOn && window.__T && __T.SCENE === 'town', null, { timeout: 30000 }); await p.waitForTimeout(500); return p; }
const ERR = [];
(async () => { const b = await chromium.launch(); try {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); let p = await ctx.newPage(); p.on('pageerror', e => ERR.push('pc: ' + e.message + ' @ ' + String(e.stack || '').split('\n').slice(1, 3).join(' ')));
  const ACC = 'dm' + Date.now() % 1e7; await login(p, { acc: ACC, cls: 'knight', name: 'dmK' + Date.now() % 1e4 });
  await p.evaluate(() => { __T.setCoins(20000000); window.__ann = []; const N = __T.NET, o = N.announceAll; N.announceAll = m => { window.__ann.push(m); try { return o.call(N, m); } catch (e) {} }; });
  // ① 메뉴 · 창 · 탭 없앰
  ok('위 메뉴 [마법인형] 버튼 (변신 옆)', await p.evaluate(() => { const b = document.getElementById('btn-doll'), a = document.getElementById('btn-poly'); return !!b && b.previousElementSibling === a && b.textContent === '마법인형'; }));
  await p.click('#btn-doll'); await p.waitForTimeout(600);
  let v = await p.evaluate(() => ({ open: !document.getElementById('dollwin').hidden, title: document.querySelector('#dollwin .gw-plate').textContent, n: document.querySelectorAll('#dw-grid .pw-c').length, rows: [...document.querySelectorAll('#dw-grid .pw-gn')].map(e => e.firstChild.textContent), kinds: [...document.querySelectorAll('#dw-grid .pw-gn small')].map(e => e.textContent), foot: document.getElementById('dw-foot').textContent, d11: document.getElementById('dw-d11').textContent, d1: document.getElementById('dw-d1').textContent }));
  console.log(JSON.stringify(v));
  ok('[마법인형] 창: 인형 21종 · 고급·희귀·영웅·전설', v.open && v.title === '마법인형' && v.n === 21 && v.rows.join() === '고급,희귀,영웅,전설' && v.kinds.join(' ') === '0/6종 0/6종 0/6종 0/3종');
  ok('뽑기 값·확률 = 변신과 같음 (11회 50만 · 1회 5만 · 고급 90 · 희귀 8 · 영웅 1.8 · 전설 0.2)', /500,000/.test(v.d11) && /50,000/.test(v.d1) && /고급 90% · 희귀 8% · 영웅 1\.8% · 전설 0\.2%/.test(v.foot) && /계정의 모든 캐릭터/.test(v.foot) && /거래·판매 불가/.test(v.foot));
  ok('같은 설정: 마일리지 1000 · 무료 2시간 · 전설 재뽑기 300만~', await p.evaluate(() => DCG.MILE === PCG.MILE && DCG.FREE_MS === PCG.FREE_MS && DCG.COST1 === PCG.COST1 && DCG.COST11 === PCG.COST11 && JSON.stringify(DCG.RR_COST) === JSON.stringify(PCG.RR_COST) && /300만/.test(document.getElementById('dw-again').textContent)));
  await p.click('#btn-poly'); await p.waitForTimeout(200); const ex1 = await p.evaluate(() => [document.getElementById('polywin').hidden, document.getElementById('dollwin').hidden]);
  await p.click('#btn-doll'); await p.waitForTimeout(200); const ex2 = await p.evaluate(() => [document.getElementById('polywin').hidden, document.getElementById('dollwin').hidden]);
  ok('[변신]·[마법인형] 창은 하나만 열림', !ex1[0] && ex1[1] && ex2[0] && !ex2[1], [ex1, ex2]);
  ok('가방 [마법인형] 탭 없음', await p.evaluate(() => !document.querySelector('#inv-tabs [data-t="doll"]') && document.querySelectorAll('#inv-tabs [data-t]').length > 3));
  await p.evaluate(() => __T.CRAFT_.open()); await p.waitForTimeout(200);
  ok('제작 장인 [인형 합성] 탭 없음 · 안내', await p.evaluate(() => !document.querySelector('#craftwin [data-ct="doll"]') && !!document.querySelector('#craftwin [data-ct="elix"]')) && await logHas(p, /마법인형 합성은 이제 위 메뉴 \[마법인형\]/));
  await p.evaluate(() => { document.getElementById('craftwin').hidden = true; });
  // ② 뽑기 골드 · 마일리지 (모션 스킵)
  await p.evaluate(() => { DCG.setSkip(true); DCG.openWin(true); });
  let c0 = await p.evaluate(() => __T.coins), S0 = await st(p); await p.click('#dw-d1'); await p.waitForTimeout(300); let c1 = await p.evaluate(() => __T.coins), S1 = await st(p);
  ok('1회 뽑기: 50,000 골드 · 1개 · 마일리지 +1', c0 - c1 === 50000 && tot(S1) - tot(S0) === 1 && S1.mile === 1, [c0 - c1, tot(S1), S1.mile]);
  await p.click('#dw-d11'); await p.waitForTimeout(300); let c2 = await p.evaluate(() => __T.coins), S2 = await st(p);
  ok('11회 뽑기: 500,000 골드 · 11개 · 마일리지 12', c1 - c2 === 500000 && tot(S2) - tot(S1) === 11 && S2.mile === 12, [c1 - c2, tot(S2), S2.mile]);
  ok('뽑은 인형은 모두 인형 21종 중 (계정 문서 dollCards 모양 = polyCards)', Object.keys(S2.cards).every(k => /^[a-z_]+$/.test(k)) && ['v', 'cards', 'lock', 'mile', 'freeAt', 'draws', 'pity', 'slot', 'rr', 'mig'].every(k => k in S2) && await p.evaluate(ks => ks.every(k => __T.ITEMS['doll_' + k] && __T.ITEMS['doll_' + k].doll === k), Object.keys(S2.cards)));
  // 확률 (sim · 보관함은 그대로)
  const sim = await p.evaluate(() => { const a = DCG.sim(200000, 1), q = DCG.sim(4000, 11), per = {}; for (const k in a.per) per[k] = a.per[k]; return { g: a.g, per, no11: q.no11 }; });
  console.log('sim', JSON.stringify(sim.g)); const pr = g => sim.g[g] / 2000;
  ok('뽑기 확률 (20만 번): 고급 90 · 희귀 8 · 영웅 1.8 · 전설 0.2 %', Math.abs(pr('고급') - 90) < 0.5 && Math.abs(pr('희귀') - 8) < 0.3 && Math.abs(pr('영웅') - 1.8) < 0.15 && Math.abs(pr('전설') - 0.2) < 0.05 && sim.g['일반'] === 0, [pr('고급'), pr('희귀'), pr('영웅'), pr('전설')]);
  { const T1 = ['werewolf', 'lizard', 'dwarf', 'orcwiz', 'bugbear', 'ogre'].map(k => sim.per[k] / sim.g['고급']); ok('같은 등급 안에서는 같은 확률 (고급 6종 각 1/6)', T1.every(x => Math.abs(x - 1 / 6) < 0.01), T1.map(x => x.toFixed(3))); }
  ok('확정 칸 없음 (11회에 희귀 이상이 없을 때도 있음)', sim.no11 > 0);
  // ③ 무료 2시간
  { const a = await st(p), cA = await p.evaluate(() => __T.coins); await p.click('#dw-dfree'); await p.waitForTimeout(300); const b2 = await st(p), cB = await p.evaluate(() => __T.coins), L = await p.evaluate(() => DCG.freeLeft());
    ok('무료 1회: 골드 그대로 · 1개 · 다음 무료 2시간 뒤', cA === cB && tot(b2) - tot(a) === 1 && L > 2 * 3600e3 - 60e3, [tot(b2) - tot(a), Math.round(L / 60e3)]);
    await p.click('#dw-dfree'); await p.waitForTimeout(250); const b3 = await st(p); ok('무료는 2시간마다 (바로 다시 누르면 안 됨)', tot(b3) === tot(b2) && await logHas(p, /무료 뽑기는 .*뒤에 다시/));
    await p.evaluate(() => { DCG.state().freeAt = Date.now() - 2 * 3600e3 - 1000; }); await p.waitForTimeout(1100); ok('2시간이 지나면 다시 무료', await p.evaluate(() => DCG.freeLeft() === 0 && /지금 뽑을 수 있어요/.test(document.getElementById('dw-free').textContent))); }
  // ④ 마일리지 1000 → 전설 1개
  { await p.evaluate(() => { DCG.state().mile = 999; DCG.renderWin(); }); await p.click('#dw-mb'); await p.waitForTimeout(200); ok('마일리지 999: 모자라요', await p.evaluate(() => document.getElementById('askwin').hidden) && await logHas(p, /마일리지가 모자라요. \(999 \/ 1000점 · 뽑은 인형 1개 = 1점\)/));
    await p.evaluate(() => { DCG.state().mile = 1000; DCG.renderWin(); }); const a = await st(p); await p.click('#dw-mb'); await p.waitForSelector('#askwin:not([hidden])'); const q = await p.evaluate(() => document.getElementById('askwin').textContent);
    await p.click('#ask-yes'); await p.waitForTimeout(400); const b2 = await st(p), leg = ['deathknight', 'phoenix', 'ice_queen'], got = leg.filter(k => (b2.cards[k] || 0) > (a.cards[k] || 0));
    ok('마일리지 1000 → 전설 인형 1개 (전설 3종 중 무작위) · 마일리지 0', /전설 인형을 받을까요/.test(q) && /전설 3종 중 1개가 무작위로/.test(q) && got.length === 1 && tot(b2) - tot(a) === 1 && b2.mile === 0, [q.slice(0, 60), got]);
    ok('전설 → 전체 알림', await p.waitForFunction(() => window.__ann.some(m => /님이 마일리지 전설 받기에서 \[전설\] .+ 인형을 얻었습니다!$/.test(m)), null, { timeout: 3000 }).then(() => true, () => false), await p.evaluate(() => window.__ann)); }
  // ⑤ 합성 확률 (sim: 상태를 저장했다가 되돌림)
  const syn = await p.evaluate(() => { const bk = DCG.raw(), o = {}; for (const g of ['고급', '희귀', '영웅']) { let ok_ = 0, up = 0, same = 0; const n = 30000; for (let i = 0; i < n; i++) { const r = DCG.synOne(g); if (r.ok) ok_++; if (r.ok && r.c.g === DCG.SYN[g].to) up++; if (!r.ok && r.c.g === g) same++; } o[g] = { p: ok_ / n, up: up === ok_, same: same === n - ok_ }; } DCG.load(bk); return o; });
  console.log('syn', JSON.stringify(syn));
  ok('합성 확률: 고급→희귀 30% · 희귀→영웅 10% · 영웅→전설 10% (등급 이름대로 변신과 같음)', Math.abs(syn['고급'].p - 0.3) < 0.012 && Math.abs(syn['희귀'].p - 0.1) < 0.008 && Math.abs(syn['영웅'].p - 0.1) < 0.008, [syn['고급'].p, syn['희귀'].p, syn['영웅'].p]);
  ok('성공 = 위 등급 · 실패 = 같은 등급 1개', ['고급', '희귀', '영웅'].every(g => syn[g].up && syn[g].same));
  const pity = await p.evaluate(() => { const bk = DCG.raw(), S = DCG.state(), o = Math.random; let r1, r2, r3; try { Math.random = () => 0.999; S.pity.h = 5; r1 = DCG.synOne('희귀'); S.pity.h = 6; r2 = DCG.synOne('희귀'); S.pity.l = 9; r3 = DCG.synOne('영웅'); } finally { Math.random = o; } const out = { r1: !!r1.pity, h1: 6, r2: r2.pity && r2.pity.g, h: S.pity.h, r3: r3.pity && r3.pity.g, l: S.pity.l }; DCG.load(bk); return out; });
  ok('천장: 희귀→영웅 7번 · 영웅→전설 10번 연속 실패면 위 등급 1개 더 · 세던 수 0', !pity.r1 && pity.r2 === '영웅' && pity.h === 0 && pity.r3 === '전설' && pity.l === 0, pity);
  // 자동 합성 · 잠금 · 직접 합성
  { const r = await p.evaluate(() => { const S = DCG.state(); S.cards = { werewolf: 9, lizard: 4, dwarf: 1, basilisk: 4, drake: 2 }; S.lock = { lizard: 1 }; S.slot = {}; DCG.renderWin(); const out = DCG.autoSyn(); const T = DCG.state().cards; return { n: out.length, gs: [...new Set(out.map(x => x.g))], liz: T.lizard, avail: ['werewolf', 'dwarf', 'ogre', 'orcwiz', 'bugbear'].reduce((a, k) => a + (T[k] || 0), 0), basi: T.basilisk || 0 }; });
    ok('자동 합성 = 고급→희귀만 남김없이 (희귀·영웅은 직접) · 잠근 인형(리자드맨 4)은 안 씀', r.n >= 2 && r.gs.join() === '고급' && r.liz >= 4 && r.avail < 4 && r.basi >= 4, r); }
  await p.evaluate(() => DCG.renderWin()); await p.screenshot({ path: OUT + 'syn_auto.png' });
  { await p.evaluate(() => { const S = DCG.state(); S.cards = { basilisk: 3, orcwar: 1, drow: 2, ogre: 1 }; S.lock = {}; DCG.renderWin(); }); await p.click('#dw-synb .pw-mt[data-g="희귀"]'); await p.waitForTimeout(150);
    await p.click('#dw-synb [data-a="fill"]'); await p.waitForTimeout(150); const tr = await p.evaluate(() => DCG.tray()); await p.screenshot({ path: OUT + 'syn_tray.png' });
    ok('직접 합성: [희귀 → 영웅] 고르고 [모두 넣기] = 희귀 4개', tr.g === '희귀' && Object.values(tr.n).reduce((a, x) => a + x, 0) === 4, tr);
    await p.evaluate(() => DCG.setSkip(false)); await p.click('#dw-synb [data-a="go"]'); await p.waitForTimeout(1600); await p.screenshot({ path: OUT + 'syn_result.png' });
    const ov = await p.evaluate(() => DCG.ov()); ok('직접 합성 결과 화면 (변신과 같은 홀 연출)', ov && ov.k === 'tsyn' && ov.n === 1, ov);
    await p.evaluate(() => DCG.close()); await p.waitForTimeout(200); const S3 = await st(p); ok('희귀 4개(바실리스크 3·다크엘프 1) → 1개 (영웅 또는 희귀) · 넣지 않은 것은 그대로', (S3.cards.basilisk || 0) <= 1 && (S3.cards.orcwar || 0) >= 1 && (S3.cards.drow || 0) >= 1 && S3.cards.ogre === 1 && tot(S3) === 4, S3.cards); }
  // ⑥ 뽑기 결과 화면 (연출) — 11회
  { await p.evaluate(() => { DCG.state().cards = {}; DCG._force(['werewolf', 'ogre', 'dwarf', 'lizard', 'basilisk', 'orcwiz', 'bugbear', 'troll', 'werewolf', 'ogre', 'phoenix']); }); await p.click('#dw-d11'); await p.waitForTimeout(2600);
    const ov = await p.evaluate(() => DCG.ov()); ok('11회 뽑기 결과 화면 (홀 · 카드 11장)', ov && ov.k === 'draw' && ov.n === 11 && !!ov.tg, ov); await p.screenshot({ path: OUT + 'draw_hall.png' });
    await p.evaluate(() => { const g = DCG._tg(); if (g) g.openAll(); }); await p.waitForTimeout(1500); await p.screenshot({ path: OUT + 'draw_open.png' });
    await p.evaluate(() => DCG.close()); await p.waitForTimeout(300); ok('결과 닫으면 전설 공지 (피닉스)', await p.waitForFunction(() => window.__ann.some(m => /마법인형 뽑기에서 \[전설\] 피닉스 인형을 얻었습니다!$/.test(m)), null, { timeout: 3000 }).then(() => true, () => false)); await p.evaluate(() => DCG.setSkip(true)); }
  // ⑦ 인형 칸: 넣기 → 능력치 · 장비 [인형] 칸 · NET · 봇 복사 · 따라다니는 인형 / 빼기
  const base = await p.evaluate(() => { const I = __T.INV; DCG.clearSlot(true); DCG.state().cards = { ogre: 1, deathknight: 1, troll: 2 }; DCG.renderWin(); return { max: __T.HERO.max, ac: I.ac(), cp: __T.CP_().total, eq: I.equipped('doll'), dl: __T.NET.dbgPayload().dl }; });
  await p.click('#dw-grid .pw-c[data-id="ogre"]'); await p.waitForTimeout(150); await p.click('#dw-sel [data-a="put"]'); await p.waitForTimeout(400);
  let sl = await p.evaluate(() => { const I = __T.INV, pl = __T.NET.dbgPayload(); return { max: __T.HERO.max, eq: I.equipped('doll'), inBag: I.bag().some(e => e.id === 'doll_ogre'), dl: pl.dl, wq: pl.wq && pl.wq.doll, mine: __T.FBOT_.mine().dl, slot: DCG.state().slot, full: document.getElementById('dw-slot').classList.contains('full'), txt: document.getElementById('dw-slot').textContent, ic: document.querySelector('#dw-grid .pw-c[data-id="ogre"]').className }; });
  console.log('slot', JSON.stringify(sl));
  ok('인형 칸에 넣기 → 오우거 HP +50', sl.max - base.max === 50 && sl.slot.knight === 'ogre' && sl.full && /소환 중 · 최대 HP \+50/.test(sl.txt), [base.max, sl.max]);
  ok('장비 [인형] 칸 = 인형 칸 (가방엔 아이템 없음)', sl.eq === 'doll_ogre' && !sl.inBag && !base.eq);
  ok('다른 유저에게 보이는 인형 (접속 정보 dl·wq) · 봇 복사 dl', sl.dl === 'ogre' && sl.wq === 'doll_ogre' && sl.mine === 'ogre' && !base.dl, sl);
  ok('칸의 인형 1개뿐이면 보유중에 \'소환\' 표시로 남음 · 합성 재료에서 빠짐', / sl/.test(sl.ic) && await p.evaluate(() => DCG.avail('ogre') === 0));
  await p.screenshot({ path: OUT + 'slot.png' });
  await p.click('#dw-grid .pw-c[data-id="deathknight"]'); await p.waitForTimeout(150); await p.click('#dw-sel [data-a="put"]'); await p.waitForTimeout(400);
  const dk = await p.evaluate(() => ({ cp: __T.CP_().total, dp: __T.FBOT_.mine().cb.dp, dm: __T.INV.cx('drPct'), xm: __T.INV.cx('xdmgM'), back: DCG.free('ogre'), max: __T.HERO.max }));
  ok('전설 데스나이트로 바꾸기 → 받는 피해 5% · 근추 +5 · 전투력 오름 · 봇 복사 cb.dp · 오우거는 보유중으로', dk.dp === 5 && dk.dm === 5 && dk.xm === 5 && dk.cp > base.cp && dk.back === 1 && dk.max === base.max, dk);
  await p.evaluate(() => { document.getElementById('dollwin').hidden = true; }); await p.waitForFunction(() => window.DOLL && DOLL.ready(4), null, { timeout: 12000 }).catch(() => {}); await p.waitForTimeout(1400);
  ok('따라다니는 인형 (전설 금빛 오로라를 그림)', await p.evaluate(() => DOLL.aura() > 0), await p.evaluate(() => DOLL.aura()));
  { const cl = await p.evaluate(() => { const q = __T.scr(__T.HERO.x, __T.HERO.z); return { x: Math.max(0, q[0] - 200), y: Math.max(0, q[1] - 190), width: 400, height: 260 }; }); await p.screenshot({ path: OUT + 'follow.png', clip: cl }); }
  await p.evaluate(() => { const w = document.getElementById('charwin'); w.hidden = false; __T.INV.render(); }); await p.waitForTimeout(200);
  const cw = await p.evaluate(() => { const e = document.getElementById('eq-doll'); return { has: e.classList.contains('has'), tip: e.dataset.itip }; }); await p.click('#eq-doll'); await p.waitForTimeout(250);
  ok('캐릭터 창 [인형] 칸 = 인형 칸 표시 · 누르면 [마법인형] 창', cw.has && /데스나이트 인형/.test(cw.tip) && /누르면 \[마법인형\] 창/.test(cw.tip) && await p.evaluate(() => !document.getElementById('dollwin').hidden), cw.tip.split('\n').slice(-2));
  await p.evaluate(() => { document.getElementById('charwin').hidden = true; });
  await p.click('#dw-slot [data-a="out"]'); await p.waitForTimeout(300); const out = await p.evaluate(() => ({ eq: __T.INV.equipped('doll'), dl: __T.NET.dbgPayload().dl, dp: __T.INV.cx('drPct'), slot: DCG.state().slot.knight }));
  ok('빼기 → 인형 효과·접속 정보에서 사라짐', !out.eq && !out.dl && !out.dp && !out.slot, out);
  await p.evaluate(() => DCG.setSlot('troll')); await p.waitForTimeout(200);
  // ⑧ 다시 접속 · 다른 직업 (계정 공유 · 칸은 직업마다)
  await p.evaluate(() => __T.SAVE.now(true, true)); const Sk = await st(p); await p.close();
  p = await relogin(ctx, ACC, 'knight', 'x');
  let re = await p.evaluate(() => ({ S: JSON.parse(JSON.stringify(DCG.state())), eq: __T.INV.equipped('doll'), max: __T.HERO.max }));
  ok('다시 접속해도 그대로 (보관함·인형 칸·장비 [인형] 칸)', JSON.stringify(re.S.cards) === JSON.stringify(Sk.cards) && re.S.slot.knight === 'troll' && re.eq === 'doll_troll', [re.S.cards, re.S.slot, re.eq]);
  await p.close(); p = await relogin(ctx, ACC, 'elf', 'dmE' + Date.now() % 1e4);
  re = await p.evaluate(() => ({ S: JSON.parse(JSON.stringify(DCG.state())), eq: __T.INV.equipped('doll') }));
  ok('다른 직업(요정): 보관함은 같이 · 인형 칸은 따로 (비어 있음)', JSON.stringify(re.S.cards) === JSON.stringify(Sk.cards) && !re.S.slot.elf && re.S.slot.knight === 'troll' && !re.eq, re.S.slot);
  { const a = await p.evaluate(() => { const S = DCG.state(), r1 = DCG.setSlot('troll'), f1 = DCG.free('troll'), eq1 = __T.INV.equipped('doll'); S.slot.wizard = 'ogre'; const r2 = DCG.setSlot('ogre'); delete S.slot.wizard; return { r1, f1, eq1, r2, slot: JSON.parse(JSON.stringify(S.slot)), eq: __T.INV.equipped('doll') }; });
    ok('요정 칸에도 넣기 (트롤 2개 = 기사 칸 1 · 요정 칸 1) · 다른 캐릭터 칸에 다 들어간 인형은 못 넣음', a.r1 && a.f1 === 0 && a.eq1 === 'doll_troll' && a.r2 === false && a.slot.elf === 'troll' && a.slot.knight === 'troll' && a.eq === 'doll_troll' && await logHas(p, /\[오우거\] 인형이 남아 있지 않아요. \(다른 캐릭터의 인형 칸에 들어가 있어요\)/), a); }
  await p.close(); p = await relogin(ctx, ACC, 'knight', 'x');
  // ⑨ 옮기기: 가방·장착·창고의 옛 인형 아이템 → 보관함
  const M0 = await p.evaluate(() => { const T = __T, S = DCG.state(); S.slot = {}; S.cards = {}; S.mig = {}; T.INV.load({ bag: [{ id: 'doll_ogre', n: 1, on: 'doll' }, { id: 'doll_ogre', n: 1 }, { id: 'doll_troll', n: 1 }, { id: 'doll_phoenix', n: 1 }, { id: 'red_potion', n: 7 }], bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } });
    T.STORE.load([{ id: 'doll_drake', n: 1, on: false }, { id: 'doll_werewolf', n: 1, on: false }, { id: 'red_potion', n: 3, on: false }]); T.INV.render(); return { eq: T.INV.equipped('doll'), store: T.STORE.list().map(e => e.id) }; });
  ok('준비: 가방 인형 4개(1개 착용) · 창고 인형 2개', M0.eq === 'doll_ogre' && M0.store.filter(x => /^doll_/.test(x)).length === 2);
  await p.waitForFunction(() => !__T.INV.bag().some(e => __T.ITEMS[e.id].doll) && !DCG.migState(), null, { timeout: 12000 }).catch(() => {});
  let M1 = await p.evaluate(() => ({ S: JSON.parse(JSON.stringify(DCG.state())), bag: __T.INV.bag().map(e => e.id), store: __T.STORE.list().map(e => e.id), eq: __T.INV.eqE('doll'), dm: __T.SAVE.snap().dm }));
  console.log('mig', JSON.stringify(M1.S.cards), JSON.stringify(M1.S.mig), M1.dm);
  ok('옮기기: 가방·장착·창고 인형 6개 → 보관함 (개수 그대로)', tot(M1.S) === 6 && M1.S.cards.ogre === 2 && M1.S.cards.troll === 1 && M1.S.cards.phoenix === 1 && M1.S.cards.drake === 1 && M1.S.cards.werewolf === 1, M1.S.cards);
  ok('가방·창고에 인형 아이템 없음 · 다른 물건은 그대로', !M1.bag.some(x => /^doll_/.test(x)) && !M1.store.some(x => /^doll_/.test(x)) && M1.bag.includes('red_potion') && M1.store.includes('red_potion'), [M1.bag, M1.store]);
  ok('끼고 있던 인형 → 이 직업의 인형 칸', M1.S.slot.knight === 'ogre' && M1.eq && M1.eq.dv && M1.eq.id === 'doll_ogre');
  ok('옮긴 기록(가방 것만) · 캐릭터 저장 번호 dm', M1.S.mig.knight && M1.S.mig.knight.length === 1 && JSON.stringify(M1.S.mig.knight[0][1]) === JSON.stringify({ ogre: 2, troll: 1, phoenix: 1 }) && M1.dm === 1, [M1.S.mig, M1.dm]);
  ok('채팅 안내: 가방·창고의 인형 6개를 마법인형 보관함으로 옮겼어요', await logHas(p, /\[마법인형\] 가방·창고의 인형 6개를 마법인형 보관함으로 옮겼어요/));
  await p.waitForTimeout(3500); ok('두 번 옮기지 않음 (몇 초 뒤에도 6개)', tot(await st(p)) === 6);
  await p.evaluate(() => __T.SAVE.now(true, true)); await p.close(); p = await relogin(ctx, ACC, 'knight', 'x'); await p.waitForTimeout(3500);
  ok('다시 접속해도 6개 · 가방에 인형 없음', tot(await st(p)) === 6 && !(await bagDolls(p)).length);
  // 새로 들어온 옛 인형(거래·바닥·주머니) → 바로
  await p.evaluate(() => __T.INV.add('doll_drake', 1, true)); await p.waitForFunction(() => !__T.INV.bag().some(e => e.id === 'doll_drake') && !DCG.migState(), null, { timeout: 8000 }).catch(() => {});
  ok('새로 들어온 옛 인형도 바로 보관함으로', (await st(p)).cards.drake === 2 && await p.evaluate(() => __T.SAVE.snap().dm === 2));
  // 저장 실패: 계정 문서 저장이 안 되면 아이템은 가방에 그대로 (기다림)
  const F = await p.evaluate(async () => { const T = __T, SV = T.SAVE, o = SV.now; window.__svOrig = o; SV.now = async () => false; const before = DCG.raw(); T.INV.add('doll_wyvern', 1, true);
    for (let i = 0; i < 40 && !DCG.migState(); i++) await new Promise(r => setTimeout(r, 150)); await new Promise(r => setTimeout(r, 600));
    return { before, after: DCG.raw(), snap: SV.snap(), ms: DCG.migState(), inBag: T.INV.bag().some(e => e.id === 'doll_wyvern'), wy: DCG.state().cards.wyvern || 0 }; });
  ok('계정 문서 저장 실패 → 인형 아이템은 가방에 남겨 둠 (보관함 기록은 다음 저장에)', F.ms && F.inBag && F.wy === 1 && F.snap.dm === 2 && F.snap.inv.bag.some(e => e.id === 'doll_wyvern'), F.ms);
  // (i) 계정 문서만 저장되고 캐릭터는 저장 전에 꺼짐 → 다시 접속: 가방의 와이번은 빼기만 (두 번 생기지 않음)
  const F1 = await p.evaluate(F => { DCG.load(F.after); __T.SAVE.apply(F.snap); return { wy: DCG.state().cards.wyvern || 0, bag: __T.INV.bag().filter(e => e.id === 'doll_wyvern').length, ms: DCG.migState(), dm: DCG.dm() }; }, F);
  ok('저장 꼬임 ①: 계정 문서는 저장 · 캐릭터는 못 함 → 다시 접속하면 가방 인형만 빠짐 (와이번 1개)', F1.wy === 1 && F1.bag === 0 && !F1.ms && F1.dm === 3, F1);
  // (ii) 둘 다 못 함(또는 캐릭터만) → 다시 접속: 아이템이 가방에 있고 다시 옮김
  const F2 = await p.evaluate(async F => { DCG.load(F.before); __T.SAVE.apply(F.snap); const a = { wy: DCG.state().cards.wyvern || 0, bag: __T.INV.bag().filter(e => e.id === 'doll_wyvern').length }; __T.SAVE.now = window.__svOrig;
    for (let i = 0; i < 60 && (DCG.migState() || __T.INV.bag().some(e => e.id === 'doll_wyvern')); i++) await new Promise(r => setTimeout(r, 200)); return { a, wy: DCG.state().cards.wyvern || 0, bag: __T.INV.bag().filter(e => e.id === 'doll_wyvern').length }; }, F);
  ok('저장 꼬임 ②: 계정 문서 저장 못 함 → 다시 접속하면 가방에 그대로 → 다시 옮김 (와이번 1개)', F2.a.wy === 0 && F2.a.bag === 1 && F2.wy === 1 && F2.bag === 0, F2);
  // 보관함(계정 문서)을 읽지 못한 접속: 옮기지 않음 · 덮어쓰지 않음
  const B = await p.evaluate(async () => { const good = DCG.raw(); DCG.load('{"v":2,"cards":'); __T.INV.add('doll_shelob', 1, true); await new Promise(r => setTimeout(r, 3500));
    const o = { bad: DCG.bad(), raw: DCG.raw(), inBag: __T.INV.bag().some(e => e.id === 'doll_shelob'), why: DCG.draw(1) }; DCG.load(good); for (let i = 0; i < 40 && __T.INV.bag().some(e => e.id === 'doll_shelob'); i++) await new Promise(r => setTimeout(r, 200)); o.after = DCG.state().cards.shelob || 0; o.bag2 = __T.INV.bag().some(e => e.id === 'doll_shelob'); return o; });
  ok('보관함을 읽지 못하면: 옮기지 않음(아이템 그대로) · 저장 안 함(null) · 뽑기 멈춤', B.bad && B.raw === null && B.inBag && B.why === null && await logHas(p, /\[마법인형\] 계정의 인형 정보를 읽지 못했어요/), B);
  ok('다시 읽으면 그때 옮김 (셸로브 1개)', B.after === 1 && !B.bag2);
  // 실제로 새로고침: 계정 문서(이 기기 저장)만 쓰고 캐릭터 저장 전에 꺼짐 → 다시 접속
  { const r0 = await p.evaluate(async () => { const T = __T, SV = T.SAVE; await SV.now(true, true); const o = SV.now; SV.now = async () => false; T.INV.add('doll_spartoi', 1, true); for (let i = 0; i < 40 && !DCG.migState(); i++) await new Promise(r => setTimeout(r, 150));
      const acc = T.ACCOUNT.acc().toLowerCase(), sn = SV.snap(); localStorage.setItem('aden_save_' + acc + '_knight', JSON.stringify(sn)); localStorage.setItem('aden_dcard_' + acc, DCG.raw()); SV.stop();   // 캐릭터 저장 = 아직 가방에 스파토이(옛 번호) · 계정 = 옮긴 기록까지 → 그대로 꺼짐
      return { sp: DCG.state().cards.spartoi || 0, bag: T.INV.bag().some(e => e.id === 'doll_spartoi'), snapHas: sn.inv.bag.some(e => e.id === 'doll_spartoi'), dm: sn.dm, k: Object.keys(localStorage).filter(k => k.startsWith('aden_save_') || k.startsWith('aden_dcard_')) }; });
    await p.close(); p = await relogin(ctx, ACC, 'knight', 'x'); await p.waitForTimeout(3500);
    const r1 = await p.evaluate(() => ({ sp: DCG.state().cards.spartoi || 0, bag: __T.INV.bag().filter(e => e.id === 'doll_spartoi').length }));
    ok('새로고침 꼬임: 계정만 저장된 채 꺼짐 → 다시 접속해도 스파토이 1개 (가방 0)', r0.sp === 1 && r0.bag && r1.sp === 1 && r1.bag === 0, [r0, r1]); }
  ok('도는 동안 페이지 오류 없음', !ERR.length, ERR.slice(0, 3));
  // ⑩ 주머니 · 아이템 막기
  const P1 = await p.evaluate(() => { const T = __T, I = T.INV; I.add('doll_pouch', 3, true); const e = I.bag().find(x => x.id === 'doll_pouch'); I.use(e); return { n: I.count('doll_pouch'), unit: T.SELL_.unit({ id: 'doll_pouch', n: 1 }), shop: T.TOWN.priceOf('doll_pouch'), desc: T.ITEMS.doll_pouch.desc }; });
  ok('주머니: 열 수 없음 (개수 그대로 · 안내)', P1.n === 3 && await logHas(p, /마법인형 주머니는 이제 열 수 없어요. 마법인형은 위 메뉴 \[마법인형\]에서 뽑아요 · 상점에 팔면 산 값 10만/), P1.n);
  ok('주머니: 상점 판매 10만 골드 (산 값) · 상점에서 더는 안 팖', P1.unit === 100000 && P1.shop === 0, P1);
  { const coinsA = await p.evaluate(() => __T.coins); const sold = await p.evaluate(() => { const T = __T, e = T.INV.bag().find(x => x.id === 'doll_pouch'); return T.INV.sellEntry(e, 3) ? 3 * T.SELL_.unit({ id: 'doll_pouch', n: 1 }) : 0; }); ok('주머니 3개 팔면 30만', sold === 300000 && await p.evaluate(() => __T.INV.count('doll_pouch') === 0)); }
  const blk = await p.evaluate(() => { const T = __T, e = { id: 'doll_ogre', n: 1, on: false }; return { bound: !!T.ITEMS.doll_ogre.bound, trade: T.TRADE.canTrade(e), store: T.STORE.deposit({ id: 'doll_ogre', n: 1, on: false }) }; });
  ok('옛 인형 아이템: 거래·창고 안 됨 (bound)', blk.bound && !blk.trade && !blk.store, blk);
  // ⑪ 도감 [마법인형]
  await p.evaluate(() => { const b = document.getElementById('btn-codex'); b.click(); }); await p.waitForTimeout(300);
  await p.evaluate(() => { const t = [...document.querySelectorAll('#cdx-tabs [data-k], #cdx-tabs button')].find(x => /마법인형/.test(x.textContent)); t && t.click(); }); await p.waitForTimeout(300);
  const cdx = await p.evaluate(() => document.getElementById('cdx-list').textContent);
  ok('도감 [마법인형]: 얻는 곳 = 위 메뉴 [마법인형] 뽑기·합성 · 보유', /위 메뉴 \[마법인형\] 뽑기 15%/.test(cdx) && /고급 인형 4개 합성 30%/.test(cdx) && /마일리지 1,000점/.test(cdx) && !/제작 장인|인형 합성 탭|마법인형 주머니\(10만/.test(cdx) && /보유 \d+개/.test(cdx), cdx.slice(0, 200));
  await p.screenshot({ path: OUT + 'codex.png' }); await p.evaluate(() => { document.getElementById('codexwin').hidden = true; });
  // ⑫ 창 전체 스크린샷 (가진 인형 여럿)
  await p.evaluate(() => { const S = DCG.state(); S.cards = { werewolf: 3, lizard: 1, dwarf: 2, orcwiz: 4, bugbear: 1, ogre: 2, basilisk: 2, cerberus: 1, necro: 1, troll: 1, kbugbear: 1, deathknight: 1 }; S.lock = { dwarf: 1 }; S.slot = { knight: 'troll' }; S.mile = 640; DCG.sync(); DCG.openWin(true); DCG.renderWin(); });
  await p.click('#dw-grid .pw-c[data-id="deathknight"]'); await p.waitForTimeout(1200); await p.screenshot({ path: OUT + 'window.png' });
  await p.click('#dw-again'); await p.waitForTimeout(300); await p.screenshot({ path: OUT + 'rr.png' }); ok('전설 재뽑기 칸 (변신과 같음)', await p.evaluate(() => /전설 재뽑기 — 다시 뽑을 전설 인형을 고르세요/.test(document.getElementById('dw-pick').textContent) && !!document.querySelector('#dw-pick [data-rr="deathknight"]')));
  await p.click('#dw-again'); await p.close();
  // ⑬ 모바일: 390 세로 · 844×390 가로 (메뉴 → 마법인형)
  for (const [w, h, mob, nm] of [[844, 390, true, 'mob844'], [390, 844, false, 'w390']]) {   // 모바일(가로 · 터치) · 폭 390 (세로 화면)
    const c2 = await b.newContext(Object.assign({ viewport: { width: w, height: h } }, mob ? { hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : {})); const q = await c2.newPage(); q.on('pageerror', e => ERR.push(nm + ': ' + e.message));
    await login(q, { cls: 'wizard', name: 'dm' + nm, init: mob ? () => { try { localStorage.setItem('aden_mob', '1'); } catch (e) {} } : null });
    await q.evaluate(() => { __T.setCoins(3000000); const S = DCG.state(); S.cards = { werewolf: 2, ogre: 1, orcwiz: 3, basilisk: 1, troll: 1, phoenix: 1 }; S.slot = { wizard: 'phoenix' }; DCG.sync(); });
    let mm = true; if (mob) { await q.tap('#mob-menu-b'); await q.waitForTimeout(250); mm = await q.evaluate(() => { const b = document.getElementById('mm-doll'); return !!b && !b.hidden && b.offsetParent !== null; }); await q.screenshot({ path: OUT + nm + '_menu.png' }); await q.tap('#mm-doll'); } else await q.evaluate(() => document.getElementById('btn-doll').click()); await q.waitForTimeout(900);
    const fit = await q.evaluate(() => { const r = document.getElementById('dollwin').getBoundingClientRect(); return { open: !document.getElementById('dollwin').hidden, l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), W: innerWidth, H: innerHeight, sw: document.documentElement.scrollWidth }; });
    ok(`${nm}: ${mob ? '메뉴 → ' : ''}[마법인형] 창 · 화면 안`, mm && fit.open && fit.l >= 0 && fit.r <= fit.W && fit.sw <= fit.W + 1, fit);
    await q.screenshot({ path: OUT + nm + '.png' });
    await q.evaluate(() => DCG.setSkip(false)); if (mob) await q.tap('#dw-d11'); else await q.click('#dw-d11'); await q.waitForTimeout(2600); await q.screenshot({ path: OUT + nm + '_draw.png' }); await q.evaluate(() => DCG.close()); await c2.close(); }
  } catch (e) { console.log('TEST ERROR', e.message, e.stack.split('\n').slice(1, 3).join(' ')); R['테스트 끝까지'] = false; }
  ok('페이지 오류 없음', !ERR.length, ERR.slice(0, 4).join(' | '));
  const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : 'ALL OK'); await b.close(); })();
