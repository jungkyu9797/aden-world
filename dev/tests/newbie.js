// 11/4 신규지원 NPC 테스트 — python3 dev/mkkt.py && KT_PORT=8899 bash dev/runkt.sh dev/tests/newbie.js · 스크린샷 dev/out/newbie_*.png
// ① Lv.30 기사·요정·마법사 → 신규 지원관 세라 클릭 → [신규지원을 받는다] → Lv.50 + 신규 지원 주머니 → 열면 직업별 영웅 무기 +6 · 방어구 +4 · 장신구
// ② 두 번째는 거절 (재접속해도) ③ Lv.51 거절 ④ 교환·판매·자동판매·창고·삭제·강화·연금술 불가 ⑤ 시계 +5일 → 사라짐 (착용 중 · 저장→재접속) ⑥ 툴팁 남은 시간 ⑦ 오류 없음
const { chromium } = require('playwright'); const login = require('../tq.js');
const URL = 'http://127.0.0.1:' + (process.env.KT_PORT || 8766) + '/_kt2.html';
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
const CLOCK = off => `(() => { const D0 = Date.now.bind(Date); window.__NBOFF = ${off}; Date.now = () => D0() + (window.__NBOFF || 0); })();`;
async function relog(p, acc, cls) { await p.goto(URL); await p.waitForSelector('#lg-acc', { state: 'visible' }); await p.waitForTimeout(500);
  await p.fill('#lg-acc', acc); await p.fill('#lg-pw', 'abcd'); if (await p.inputValue('#lg-acc') !== acc) await p.fill('#lg-acc', acc); await p.click('#lg-go');
  await p.waitForSelector(`.cs-card[data-cls="${cls}"]`, { state: 'visible', timeout: 30000 }); await p.click(`.cs-card[data-cls="${cls}"]`); await p.click('#cs-start');
  await p.waitForFunction(() => window.__gameOn && window.__T && __T.SCENE === 'town', null, { timeout: 30000 }); await p.waitForTimeout(600); }
async function talk(p) { await p.evaluate(() => { const w = document.getElementById('nbwin'); if (w) w.hidden = true; });
  const [sx, sy] = await p.evaluate(() => { const q = __T.scr(19.5, 18.5); return [q[0], q[1] - 28 * __T.curZ]; }); await p.mouse.click(sx, sy);
  await p.waitForSelector('#nbwin', { state: 'visible', timeout: 15000 }); await p.waitForTimeout(300); }
const logTail = (p, n = 8) => p.evaluate(n => __T.log.slice(-n).map(l => l.t || l.text || '').join('\n'), n);
const nbList = p => p.evaluate(() => __T.INV.bag().filter(e => e.nb).map(e => ({ id: e.id, name: __T.ITEMS[e.id].name, slot: __T.ITEMS[e.id].slot, en: e.en || 0, on: e.on || '', nb: e.nb, rar: __T.ITEMS[e.id].rar, lv: __T.ITEMS[e.id].lv, cls: (__T.ITEMS[e.id].cls || ['공용']).join('/') })));
const ARM = new Set(['helm', 'armor', 'shirt', 'cloak', 'gloves', 'boots', 'shield']), ACC = new Set(['amulet', 'ring', 'belt']);

(async () => { const b = await chromium.launch(); const errs = [];
  const mk = async () => { const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); return { ctx, p }; };
  for (const cls of ['knight', 'elf', 'wizard']) {
    console.log(`\n===== ${cls} =====`); const { ctx, p } = await mk(); const acc = 'nb' + cls[0] + Date.now() % 1e6; await login(p, { acc, cls, name: 'nb' + cls[0] + Date.now() % 1e4 });
    await p.evaluate(() => { __T.ADMIN.setLv(30); __T.wizAutoLearn(true); __T.INV.render(); });
    const s0 = await p.evaluate(() => ({ lv: __T.hero.lv, L: __T.LEARNED.size, hp: __T.hero.max, mp: __T.hero.maxmp, bp: __T.hero.bonusPts }));
    await talk(p); await p.screenshot({ path: `dev/out/newbie_dialog_${cls}.png` });
    const d0 = await p.evaluate(() => ({ btn: document.getElementById('nb-go').textContent, dis: document.getElementById('nb-go').disabled, st: document.getElementById('nb-st').textContent, kit: document.querySelectorAll('#nb-kit .nb-it').length }));
    ok(!d0.dis && d0.btn === '신규지원을 받는다' && d0.kit === 12, `${cls} 대화창: [${d0.btn}] · ${d0.st} · 미리보기 ${d0.kit}칸`);
    await p.click('#nb-go'); await p.waitForSelector('#askwin', { state: 'visible' }); await p.click('#ask-yes'); await p.waitForTimeout(500);
    const s1 = await p.evaluate(() => ({ lv: __T.hero.lv, L: __T.LEARNED.size, hp: __T.hero.max, mp: __T.hero.maxmp, bp: __T.hero.bonusPts, pouch: __T.INV.count('nb_pouch'), used: __T.NBS_.used(), win: document.getElementById('nbwin').hidden }));
    ok(s1.lv === 50 && s1.pouch === 1 && s1.used > 0, `${cls} Lv.${s0.lv} → Lv.${s1.lv} · 주머니 ${s1.pouch}개 · 받은 기록 ${!!s1.used}`);
    ok(s1.hp > s0.hp && s1.bp === 10 && s1.L >= s0.L, `${cls} HP ${s0.hp}→${s1.hp} · MP ${s0.mp}→${s1.mp} · 보너스 능력치 ${s0.bp}→${s1.bp} · 배운 기술·마법 ${s0.L}→${s1.L}`);
    const ptip = await p.evaluate(() => __T.INV.tipOf(__T.INV.bag().find(x => x.id === 'nb_pouch')));
    ok(/신규 지원 주머니/.test(ptip) && /5일/.test(ptip), `${cls} 주머니 툴팁: ${ptip.split('\n').slice(0, 3).join(' / ').slice(0, 200)}…`);
    ok(await p.evaluate(() => { const e = __T.INV.bag().find(x => x.id === 'nb_pouch'); return !__T.TRADE.canTrade(e) && !__T.INV.sellEntry(e, 1) && !__T.STORE.deposit(e); }), `${cls} 주머니도 교환·판매·창고 불가`);
    // 주머니 열기
    const t0 = await p.evaluate(() => Date.now()); await p.evaluate(() => { const e = __T.INV.bag().find(x => x.id === 'nb_pouch'); __T.INV.use(e); }); await p.waitForTimeout(400);
    const L = await nbList(p); console.log(`${cls} 주머니 내용 (${L.length}개):\n  ` + L.map(x => `${x.en ? '+' + x.en + ' ' : ''}${x.name} [${x.slot} · ${x.rar} · Lv${x.lv} · ${x.cls}]`).join('\n  '));
    ok(L.length === 12 && await p.evaluate(() => __T.INV.count('nb_pouch')) === 0, `${cls} 주머니 → 장비 12개 (주머니는 사라짐)`);
    ok(L.every(x => x.rar === '영웅' && x.lv <= 50), `${cls} 모두 영웅 · 착용 Lv.50 이하`);
    ok(L.filter(x => x.slot === 'weapon').length === 1 && L.filter(x => x.slot === 'weapon').every(x => x.en === 6), `${cls} 무기 1개 +6`);
    ok(L.filter(x => ARM.has(x.slot)).length === 7 && L.filter(x => ARM.has(x.slot)).every(x => x.en === 4), `${cls} 방어구 7부위(투구·갑옷·티셔츠·망토·장갑·장화·방패) 모두 +4`);
    ok(L.filter(x => ACC.has(x.slot)).length === 4 && L.filter(x => ACC.has(x.slot)).every(x => x.en === 0) && L.filter(x => x.slot === 'ring').length === 2, `${cls} 장신구 4개 (목걸이·반지 2·벨트) 강화 없음`);
    ok(L.every(x => Math.abs(x.nb - (t0 + 5 * 864e5)) < 60e3), `${cls} 사라지는 시각 = 연 때 + 5일`);
    const tip = await p.evaluate(() => { const e = __T.INV.bag().find(x => x.nb && __T.ITEMS[x.id].slot === 'weapon'); return __T.INV.tipOf(e); });
    ok(/\(신규 지원 · 4일 23시간 남음\)/.test(tip.split('\n')[0]) && /교환·판매·창고 보관·삭제·강화·재료 사용 불가/.test(tip), `${cls} 툴팁: ${tip.split('\n').slice(0, 3).join(' / ')}`);
    const cellTip = await p.evaluate(() => { const c = [...document.querySelectorAll('#inv-grid .slot')].find(x => /신규 지원/.test(x.dataset.itip || '')); return c ? c.dataset.itip.split('\n')[0] + (c.querySelector('.nbk') ? ' [신규 표식]' : '') : ''; });
    ok(/남음/.test(cellTip) && /신규 표식/.test(cellTip), `${cls} 가방 칸 이름(마우스 올림): ${cellTip}`);
    // 귀속: 교환·판매·자동판매·창고·삭제·강화·연금술
    if (cls === 'knight') { await p.waitForTimeout(900);
      await p.evaluate(() => { __T.INV.add('scroll_weapon', 5, true); __T.INV.add('scroll_armor', 5, true); __T.INV.add('bless_scroll', 2, true); __T.INV.add('long_sword', 1, true); __T.INV.add('cx_rg6', 1, true); __T.INV.render(); });
      const r = await p.evaluate(async () => { const I = __T.INV, B = I.bag(), nb = B.filter(e => e.nb), w = nb.find(e => __T.ITEMS[e.id].slot === 'weapon'), a = nb.find(e => __T.ITEMS[e.id].slot === 'armor'), rg = nb.find(e => e.id === 'cx_rg6'), plainRing = B.find(e => e.id === 'cx_rg6' && !e.nb), o = {};
        o.trade = nb.filter(e => __T.TRADE.canTrade(e)).length; o.sell = nb.filter(e => I.sellEntry(e, 1)).length; o.store = nb.filter(e => __T.STORE.deposit(e)).length; o.rm = nb.filter(e => I.removeEntry(e)).length;
        Object.assign(__T.AUTO.conf().sellR, { 일반: true, 고급: true, 희귀: true, 영웅: true }); __T.AUTO.conf().sellOther = false; o.auto = __T.AUTO.sellList().filter(e => e.nb).length; o.autoPlain = __T.AUTO.sellList().includes(plainRing);
        __T.SELL.open(); const idx = [...document.querySelectorAll('#sl-list .sl-it')].map(x => +x.dataset.k); o.sellWin = idx.filter(k => B[k] && B[k].nb).length; o.sellWinN = idx.length; document.getElementById('sellwin').hidden = true;
        I.trashAsk(w); o.trashAsk = !document.getElementById('askwin').hidden; document.getElementById('askwin').hidden = true;
        const sc = () => I.count('scroll_weapon') + I.count('scroll_armor') + I.count('bless_scroll');
        const c0 = sc(); I.use(B.find(e => e.id === 'scroll_weapon')); o.tgt = I.targeting(); I.applyScroll(w); I.use(B.find(e => e.id === 'scroll_armor')); I.applyScroll(a); I.use(B.find(e => e.id === 'bless_scroll')); I.applyScroll(w);
        o.en = [w.en, a.en, !!w.blessed]; o.scrollsUsed = c0 - sc();
        I.showDetail(w, 400, 300); o.enwBtn = !!document.querySelector('#itemwin [data-act="enw"]'); I.hideDetail();
        const AL = __T.ALCH_; if (AL) { AL.toggle(rg); o.alch = AL.has(rg); }
        o.left = I.bag().filter(e => e.nb).length; return o; });
      console.log('  귀속 결과', JSON.stringify(r));
      ok(r.trade === 0, '교환 목록에 못 올림 (TRADE.tradable)'); ok(r.sell === 0 && r.sellWin === 0 && r.sellWinN > 0, `아덴상단 판매 목록에 없음 (팔 수 있는 다른 물건 ${r.sellWinN}개) · 직접 판매 불가`); ok(r.auto === 0 && r.autoPlain, '자동판매 대상에서 빠짐 (같은 용의 반지라도 일반 것은 팔림)');
      ok(r.store === 0, '창고에 못 맡김'); ok(!r.trashAsk && r.rm === 0, '삭제(버리기) 불가 · 다른 경로로도 빼낼 수 없음'); ok(r.tgt && r.en[0] === 6 && r.en[1] === 4 && !r.en[2] && r.scrollsUsed === 0, `강화·축복 주문서 거절 (무기 +${r.en[0]} · 갑옷 +${r.en[1]} · 주문서 그대로)`);
      ok(!r.enwBtn, '상세 정보창에 [강화] 버튼 없음'); ok(r.alch === false, '연금술 재료로 못 올림'); ok(r.left === 12, '아무것도 빠지지 않음 (12개)');
      await p.evaluate(() => { document.getElementById('invwin').hidden = true; for (const id of ['scroll_weapon', 'scroll_armor', 'bless_scroll']) __T.INV.take(id, __T.INV.count(id)); const B = __T.INV.bag(); for (const e of B.filter(e => (e.id === 'long_sword' || e.id === 'cx_rg6') && !e.nb)) __T.INV.removeEntry(e); __T.INV.render(); });
    }
    // 모두 착용
    await p.evaluate(() => { for (const e of __T.INV.bag().filter(e => e.nb)) if (!e.on) __T.INV.use(e); __T.INV.render(); });
    const eqd = await nbList(p); ok(eqd.every(x => x.on), `${cls} 12개 모두 착용 (${eqd.map(x => x.on).join(',')})`);
    await p.evaluate(() => { document.getElementById('invwin').hidden = false; document.getElementById('charwin').hidden = false; __T.INV.render(); }); await p.waitForTimeout(300);
    await p.evaluate(() => { __T.INV.toggleWin('invwin'); __T.INV.toggleWin('invwin'); }); await p.waitForTimeout(200);
    { const c = await p.evaluate(() => { const x = [...document.querySelectorAll('#charwin .eq')].find(el => /신규 지원/.test(el.dataset.itip || '')); if (!x) return null; const r = x.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); if (c) await p.mouse.move(c[0], c[1]); await p.waitForTimeout(250); }
    await p.screenshot({ path: `dev/out/newbie_pouch_${cls}.png` });
    // 두 번째: 거절
    await p.mouse.move(5, 5); await p.evaluate(() => { document.getElementById('invwin').hidden = true; document.getElementById('charwin').hidden = true; });
    await talk(p); const d2 = await p.evaluate(() => ({ btn: document.getElementById('nb-go').textContent, dis: document.getElementById('nb-go').disabled, st: document.getElementById('nb-st').textContent, why: __T.NBS_.why() }));
    ok(d2.dis && d2.why === 'used', `${cls} 두 번째 대화: [${d2.btn}] 막힘 · ${d2.st}`); if (cls === 'knight') await p.screenshot({ path: 'dev/out/newbie_refuse_used.png' });
    await p.evaluate(() => document.getElementById('nbwin').hidden = true);
    if (cls === 'knight') {   // 착용 중 + 시계 +5일 → 사라짐 (이번 접속 안에서)
      const before = await p.evaluate(() => ({ ac: __T.INV.ac(), hp: __T.hero.max }));
      await p.evaluate(CLOCK(5 * 864e5 + 60e3)); await p.waitForTimeout(6500);
      const r = await p.evaluate(() => ({ n: __T.INV.bag().filter(e => e.nb).length, eq: ['weapon', 'helm', 'armor', 'ring1', 'ring2', 'belt'].map(s => __T.INV.equipped(s)), ac: __T.INV.ac(), hp: __T.hero.max, hpNow: __T.hero.hp }));
      const lg = await logTail(p, 4); ok(r.n === 0 && r.eq.every(x => !x), `기사 시계 +5일 → 착용 중이던 12개 모두 사라짐 (AC ${before.ac}→${r.ac} · 최대 HP ${before.hp}→${r.hp} · 지금 HP ${r.hpNow})`);
      ok(/사용 기간\(5일\)이 끝나 사라졌습니다/.test(lg), '채팅: ' + (lg.split('\n').find(t => /사용 기간/.test(t)) || lg));
      await p.evaluate(() => { window.__NBOFF = 0; });
      // 받은 뒤 Lv.50이라도 다시 못 받음 (장비가 없어져도)
      ok(await p.evaluate(() => __T.NBS_.why()) === 'used', '기사 장비가 사라진 뒤에도 다시 못 받음');
    }
    if (cls === 'wizard') {   // 시계를 되돌려도 남은 시간이 늘지 않음
      await p.evaluate(CLOCK(-3 * 864e5)); const tw = await p.evaluate(() => __T.INV.tipOf(__T.INV.bag().find(x => x.nb)).split('\n')[0]); await p.evaluate(() => { window.__NBOFF = 0; });
      ok(/4일 23시간 남음|4일 22시간 남음/.test(tw), `마법사 시계를 3일 되돌려도 남은 시간 그대로: ${tw}`);
    }
    // 저장 → 재접속: 기록·장비 유지 → 시계 +5일로 재접속하면 사라짐
    await p.evaluate(() => __T.SAVE.now(true, true)); await p.waitForTimeout(400);
    await relog(p, acc, cls);
    const r1 = await p.evaluate(() => ({ lv: __T.hero.lv, n: __T.INV.bag().filter(e => e.nb).length, on: __T.INV.bag().filter(e => e.nb && e.on).length, why: __T.NBS_.why(), used: __T.NBS_.used() }));
    if (cls === 'knight') ok(r1.n === 0 && r1.why === 'used' && r1.lv === 50, `기사 재접속: 장비 0개 · 받은 기록 그대로 (${r1.why})`);
    else ok(r1.n === 12 && r1.on === 12 && r1.why === 'used' && r1.lv === 50, `${cls} 재접속: Lv.${r1.lv} · 신규 지원 장비 ${r1.n}개 (착용 ${r1.on}) · 다시 받기 막힘 (${r1.why})`);
    await talk(p); const d3 = await p.evaluate(() => ({ dis: document.getElementById('nb-go').disabled, st: document.getElementById('nb-st').textContent })); ok(d3.dis, `${cls} 재접속 뒤 대화도 거절: ${d3.st}`);
    await p.evaluate(() => document.getElementById('nbwin').hidden = true);
    if (cls !== 'knight') {
      await p.evaluate(() => __T.SAVE.now(true, true)); await p.waitForTimeout(400); await p.close();
      const p2 = await ctx.newPage(); p2.on('pageerror', e => errs.push(e.message)); await p2.addInitScript(CLOCK(5 * 864e5 + 120e3));
      await relog(p2, acc, cls); await p2.waitForTimeout(2200);
      const r2 = await p2.evaluate(() => ({ n: __T.INV.bag().filter(e => e.nb).length, eq: ['weapon', 'helm', 'armor', 'cloak', 'ring1', 'amulet'].map(s => __T.INV.equipped(s)), why: __T.NBS_.why() }));
      const lg = await logTail(p2, 12); ok(r2.n === 0 && r2.eq.every(x => !x) && r2.why === 'used', `${cls} 시계 +5일로 재접속 → 착용 중이던 신규 지원 장비 모두 사라짐 · 받은 기록 그대로`);
      ok(/사용 기간\(5일\)이 끝나 사라졌습니다/.test(lg), `${cls} 재접속 채팅: ` + (lg.split('\n').find(t => /사용 기간/.test(t)) || '(없음)'));
      await p2.evaluate(() => __T.SAVE.now(true, true)); await p2.waitForTimeout(300);
    }
    await ctx.close(); }
  // ③ Lv.51 거절 · Lv.50은 레벨 그대로 주머니만
  { const { ctx, p } = await mk(); await login(p, { cls: 'knight', name: 'nbL' + Date.now() % 1e4 });
    await p.evaluate(() => { __T.ADMIN.setLv(51); __T.INV.render(); __T.ZOOMT = 1.15; }); await p.waitForTimeout(1500);
    { const [x, y] = await p.evaluate(() => __T.scr(19.5, 18.5)); await p.mouse.move(x + 60, y + 40); await p.waitForTimeout(400); await p.screenshot({ path: 'dev/out/newbie_npc.png', clip: { x: Math.max(0, x - 330), y: Math.max(0, y - 230), width: 660, height: 360 } }); }
    { const [x, y] = await p.evaluate(() => { const q = __T.scr(19.5, 18.5); return [q[0], q[1] - 28 * __T.curZ]; }); await p.mouse.move(x, y); await p.waitForTimeout(400); await p.screenshot({ path: 'dev/out/newbie_npc_hover.png', clip: { x: Math.max(0, x - 200), y: Math.max(0, y - 150), width: 400, height: 260 } }); }
    await talk(p);
    const d = await p.evaluate(() => ({ btn: document.getElementById('nb-go').textContent, dis: document.getElementById('nb-go').disabled, st: document.getElementById('nb-st').textContent, why: __T.NBS_.why() }));
    ok(d.dis && d.why === 'lv' && /Lv\.51/.test(d.st), `Lv.51 거절: [${d.btn}] · ${d.st}`); await p.screenshot({ path: 'dev/out/newbie_refuse_lv51.png' });
    const lg = await logTail(p, 3); ok(/신규 지원관 세라: 벌써 Lv\.51/.test(lg), 'Lv.51 거절 말: ' + lg.split('\n').filter(t => /세라/.test(t)).pop());
    await p.keyboard.press('Escape'); await p.waitForTimeout(200); const esc = await p.evaluate(() => document.getElementById('nbwin').hidden); await talk(p); await p.click('#nbwin [data-closewin]'); ok(esc && await p.evaluate(() => document.getElementById('nbwin').hidden), '대화창 Esc · [닫기]로 닫힘');
    await p.evaluate(() => { document.getElementById('nbwin').hidden = true; __T.ADMIN.setLv(50); __T.hero.exp = 12345; __T.INV.render(); }); await talk(p);
    await p.click('#nb-go'); await p.waitForSelector('#askwin', { state: 'visible' }); await p.click('#ask-yes'); await p.waitForTimeout(400);
    const r = await p.evaluate(() => ({ lv: __T.hero.lv, exp: __T.hero.exp, pouch: __T.INV.count('nb_pouch') })); ok(r.lv === 50 && r.exp === 12345 && r.pouch === 1, `Lv.50 캐릭터: 레벨·경험치 그대로 (exp ${r.exp}) · 주머니 1개`);
    await ctx.close(); }
  console.log('\n' + (errs.length ? 'PAGE ERRORS:\n' + [...new Set(errs)].join('\n') : 'no page errors'));
  console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); })();
