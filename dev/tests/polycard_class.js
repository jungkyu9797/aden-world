// 소드·아크 시리즈 (직업 전용 변신 카드) 테스트 · 2차(변신 칸 · 확정 칸 없음 · 마일리지 1000)에 맞춤 — KT_PORT=8774 bash dev/runkt.sh dev/tests/polycard_class.js · 스크린샷 dev/out/pcc_*.png
// ① 6종이 영웅·전설 풀에 있고 등급 확률 유지 (같은 등급 안에서 고르게) ② 기사: 소드나이트 +10% · 아크나이트 +18% ③ 기사가 소드메이지로 변신 시도 → 막힘 · 골드 그대로
// ④ 같은 계정 마법사: 소드메이지 변신 ⑤ 다른 직업 카드 변신 기록으로 재접속 → 풀림 ⑥ 마일리지로 아크 고르기 ⑦ 다른 사람 화면에서도 같은 색 ⑧ 오류 없음
const { chromium } = require('playwright'); const login = require('../tq.js');
const URL = 'http://127.0.0.1:' + (process.env.KT_PORT || 8766) + '/_kt2.html';
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
async function relog(p, acc, cls, name, mp, pre) { await p.goto(URL + (mp ? '?mp=bc' : '')); await p.waitForSelector('#lg-acc', { state: 'visible' }); if (pre) await pre();   /* pre: 로그인 화면에서 (나가며 저장한 뒤) 할 일 */
  await p.waitForTimeout(500); await p.fill('#lg-acc', acc); await p.fill('#lg-pw', 'abcd'); if (await p.inputValue('#lg-acc') !== acc) await p.fill('#lg-acc', acc); await p.click('#lg-go');
  try { await p.waitForSelector(`.cs-card[data-cls="${cls}"]`, { state: 'visible', timeout: 30000 }); } catch (e) { await p.screenshot({ path: 'dev/out/pcc_relog_fail.png' }); console.log('relog 실패 화면:', await p.evaluate(() => [...document.querySelectorAll('.nm-msg,#lg-msg,.lg-msg')].map(x => x.textContent).join(' | '))); throw e; }
  await p.click(`.cs-card[data-cls="${cls}"]`); await p.click('#cs-start');
  const nm = await p.waitForSelector('#nm-in', { state: 'visible', timeout: 2500 }).catch(() => null); if (nm) { await p.fill('#nm-in', name); await p.click('#nm-go'); }
  await p.waitForFunction(() => window.__gameOn && window.__T && __T.SCENE === 'town', null, { timeout: 30000 }); await p.waitForTimeout(400); }
const HERO = ['king_bugbear', 'necromancer', 'spartoi', 'sword_knight', 'sword_mage', 'sword_ranger'], LEG = ['deathknight', 'wyvern', 'kaspar', 'arc_knight', 'arc_mage', 'arc_ranger'];
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('A: ' + e.message));
  const acc = 'pcc' + Date.now() % 1e7; await login(p, { acc, cls: 'knight', name: 'pccK' + Date.now() % 1e4, mp: true });
  const S = () => p.evaluate(() => JSON.parse(JSON.stringify(PCG.state()))), cx = () => p.evaluate(() => ({ a: __T.INV.cx('atkSpd'), m: __T.INV.cx('moveSpd'), xm: __T.INV.cx('xdmgM'), dr: __T.INV.cx('dr'), sp: __T.INV.cx('sp'), mr: __T.INV.cx('mpRegen'), c: __T.coins, cur: PCG.cur() }));
  const lastLog = () => p.evaluate(() => { const l = __T.log.slice(-1)[0] || {}; return l.t || l.text || ''; });
  await p.evaluate(() => { __T.setCoins(3000000); __T.hero.lv = 52; __T.INV.render(); });
  // ① 풀 · 확률 (60만 장 · 11회 2만 번)
  { const N = 600000, r = await p.evaluate(N => { const a = PCG.sim(N), b = PCG.sim(20000, 11); return { g: a.g, per: a.per, no11: b.no11 }; }, N), E = { 일반: 60, 고급: 30, 희귀: 8, 영웅: 1.8, 전설: 0.2 }, pc = k => r.g[k] / N * 100;
    console.log('등급 %', JSON.stringify(Object.fromEntries(Object.keys(E).map(k => [k, +pc(k).toFixed(3)]))));
    ok(Object.keys(E).every(k => Math.abs(pc(k) - E[k]) < Math.max(0.5, E[k] * 0.06)), '① 등급 확률 그대로 (60/30/8/1.8/0.2)');
    const h = HERO.map(id => (r.per[id] || 0) / N * 100), l = LEG.map(id => (r.per[id] || 0) / N * 100);
    console.log('영웅 카드 %', HERO.map((id, i) => id + ' ' + h[i].toFixed(3)).join(' · ')); console.log('전설 카드 %', LEG.map((id, i) => id + ' ' + l[i].toFixed(4)).join(' · '));
    ok(h.every(v => Math.abs(v - 0.3) < 0.045), '① 영웅 6종 고르게 (각 약 0.3%)'); ok(l.every(v => Math.abs(v - 0.0333) < 0.012), '① 전설 6종 고르게 (각 약 0.033%)');
    ok(r.no11 > 4000, '① 11회 확정 칸 없음 (희귀 이상 없는 11회 ' + r.no11 + '번 / 2만)'); }
  // 뽑기 결과 앞면 (Math.random 잠깐 바꿔 전설 4번째 = 아크나이트)
  { await p.evaluate(() => { const R = Math.random; let n = 0; Math.random = () => (n++ % 2 ? 0.5 : 0.9995); try { PCG.draw(1); } finally { Math.random = R; } }); await p.waitForTimeout(500); await p.click('#pcg-ovl .pcg-c'); await p.waitForTimeout(1500);
    const t = await p.evaluate(() => document.querySelector('#pcg-ovl .pcg-fr').textContent); ok(/아크나이트/.test(t) && /기사 전용/.test(t) && /속도 \+18%/.test(t), '뽑기 결과 앞면: 아크나이트 · 기사 전용 · 속도 +18% (' + t.replace(/\s+/g, ' ').trim() + ')');
    ok(await p.evaluate(() => { const im = document.querySelector('#pcg-ovl .pcg-fr img'); return !!(im && im.getAttribute('src') && im.naturalWidth > 0); }), '뽑기 결과 앞면 그림 (색 입힌 렌더)');
    await p.screenshot({ path: 'dev/out/pcc_draw_arc.png' }); await p.evaluate(() => PCG.close()); }
  // ② 기사: 소드나이트 +10% · 아크나이트 +18%
  await p.evaluate(() => { const s = PCG.state(); for (const k of ['sword_knight', 'arc_knight', 'sword_mage', 'arc_mage', 'sword_ranger']) s.cards[k] = (s.cards[k] || 0) + 1; });
  const k0 = await cx();
  { await p.evaluate(() => document.getElementById('btn-poly').click()); await p.waitForTimeout(500); await p.click('#pw-grid .pw-c[data-id="sword_knight"]'); await p.waitForTimeout(400); await p.click('#pw-sel [data-a="put"]'); await p.waitForTimeout(400);
    const a = await cx(); ok(a.cur === 'pc_sword_knight' && k0.c === a.c, '② 기사 → 소드나이트 변신 칸 (골드 안 듦)'); ok(a.a - k0.a === 10 && a.m - k0.m === 10, `② 소드나이트 공속·이속 +10% (${k0.a}→${a.a} · ${k0.m}→${a.m})`); ok(a.xm - k0.xm === 1, '② 소드나이트 근거리 추가 피해 +1');
    await p.waitForTimeout(800); await p.screenshot({ path: 'dev/out/pcc_win_sword_knight.png' });
    await p.evaluate(() => PCG.doMorph('arc_knight')); const c = await cx(); ok(c.cur === 'pc_arc_knight' && c.a - k0.a === 18 && c.m - k0.m === 18, `② 아크나이트 공속·이속 +18% (${k0.a}→${c.a})`); ok(c.xm - k0.xm === 1 && c.dr - k0.dr === 1, '② 아크나이트 근거리 추가 피해 +1 · 받는 피해 -1');
  // ③ 기사가 소드메이지 카드로 변신 시도 → 막힘
    await p.click('#pw-grid .pw-c[data-id="sword_mage"]'); await p.waitForTimeout(500); const go = await p.evaluate(() => { const g = document.querySelector('#pw-sel [data-a="put"]'); return { d: g.disabled, t: g.textContent, sel: document.getElementById('pw-sel').textContent, xc: document.querySelector('#pw-grid .pw-c[data-id="sword_mage"]').classList.contains('xc') }; });
    ok(go.d && /마법사 전용/.test(go.t) && /마법사 전용/.test(go.sel) && go.xc, '③ 변신 창: 소드메이지 = "마법사 전용" 표시 · 버튼 막힘 (' + go.t + ')'); await p.screenshot({ path: 'dev/out/pcc_win_block.png' });
    const c1 = await cx(); await p.evaluate(() => PCG.morph('sword_mage')); await p.waitForTimeout(200); const c2 = await cx(); const lg = await lastLog();
    ok(c2.cur === 'pc_arc_knight' && c2.c === c1.c && await p.evaluate(() => document.getElementById('askwin').hidden), '③ 기사가 소드메이지 변신 시도 → 안 됨 · 골드 그대로 (' + lg + ')');
    await p.evaluate(() => PCG.doMorph('sword_mage')); ok((await cx()).cur === 'pc_arc_knight' && (await cx()).c === c1.c, '③ 내부 변신 함수로 바로 불러도 막힘 · 골드 그대로');
    ok(await p.evaluate(() => PCG.canKeep({ id: 'sword_mage', cls: 'wizard', lv: 30 })) === false, '③ 다른 직업 카드는 유지 조건도 거짓');
    await p.evaluate(() => { document.getElementById('polywin').hidden = true; }); }
  // 게임 화면 (기사 · 아크나이트)
  await p.evaluate(() => { __T.TOWN.placeAt(18.5, 22.5); __T.ZOOMT = 2.2; }); await p.waitForTimeout(1500); await p.screenshot({ path: 'dev/out/pcc_morph_arc_knight.png', clip: { x: 340, y: 150, width: 600, height: 460 } });
  // ⑦ 다른 사람 화면 (같은 브라우저 두 번째 창 · 요정) + 접속자 정보 창 미리보기
  { const q = await ctx.newPage(); q.on('pageerror', e => errs.push('B: ' + e.message)); await login(q, { cls: 'elf', name: 'pccB' + Date.now() % 1e4, mp: true });
    await q.evaluate(() => { __T.TOWN.placeAt(19.5, 23.5); __T.ZOOMT = 2.2; }); await q.waitForTimeout(3000);
    const seen = await q.evaluate(() => PCG.rcCache().filter(k => k.startsWith('pc_arc_knight|')).length); ok(seen > 0, '⑦ 다른 사람 화면에 아크나이트(색 입힌 그림)로 그려짐 (프레임 ' + seen + '장)');
    const pos = await p.evaluate(() => [__T.hero.x, __T.hero.z]); const sp = await q.evaluate(([x, z]) => __T.scr(x, z), pos);
    await q.screenshot({ path: 'dev/out/pcc_remote.png', clip: { x: Math.max(0, sp[0] - 160), y: Math.max(0, sp[1] - 240), width: 320, height: 300 } });
    await q.evaluate(() => { __T.NET.hasArtRoom = () => true; const b = document.getElementById('btn-mp'); if (b) b.click(); }); await q.waitForTimeout(1200);   // 테스트 모드(?mp=bc)는 접속자 목록이 비어 있어 잠깐 '연결됨'으로 봄
    const opened = await q.evaluate(() => { const x = document.querySelector('#mp-list [data-who]:not([data-who="me"])'); if (!x) return false; x.click(); return !document.getElementById('whowin').hidden; });
    if (opened) { await q.waitForTimeout(1500); const w = await q.$('#whowin'); await w.screenshot({ path: 'dev/out/pcc_whois.png' }); ok(true, '⑦ 접속자 정보 창 미리보기 (dev/out/pcc_whois.png)'); } else console.log('(접속자 목록이 이 테스트 모드에서 안 열림 — 정보 창 미리보기는 건너뜀)');
    await q.close(); }
  // 저장 → 다시 접속 (기사): 아크나이트 유지
  await p.evaluate(() => __T.SAVE.now(true, true)); await p.waitForTimeout(300); await relog(p, acc, 'knight', '', true);
  { const c = await cx(); ok(c.cur === 'pc_arc_knight' && c.a - k0.a === 18, '기사로 다시 접속: 아크나이트 변신 유지'); }
  // 캐릭터 창 미리보기
  await p.evaluate(() => { __T.INV.toggleWin('charwin'); }); await p.waitForTimeout(800); { const w = await p.$('#charwin'); if (w) await w.screenshot({ path: 'dev/out/pcc_charwin.png' }); } await p.evaluate(() => { document.getElementById('charwin').hidden = true; });
  // ④ 같은 계정 마법사: 소드메이지 변신 · 아크나이트는 막힘
  await relog(p, acc, 'wizard', 'pccW' + Date.now() % 1e4, true);
  { await p.evaluate(() => { __T.setCoins(100000); __T.hero.lv = 52; }); const w0 = await cx(); ok(w0.cur === null, '④ 마법사는 변신하지 않은 채로 시작');
    await p.evaluate(() => PCG.morph('arc_knight')); await p.waitForTimeout(200); ok((await cx()).cur === null && (await cx()).c === 100000 && await p.evaluate(() => document.getElementById('askwin').hidden), '④ 마법사가 아크나이트 → 막힘 · 골드 그대로');
    await p.evaluate(() => PCG.morph('sword_mage')); await p.waitForTimeout(400); const w1 = await cx();
    ok(w1.cur === 'pc_sword_mage' && w1.c === 100000 && w1.a - w0.a === 10 && w1.m - w0.m === 10 && w1.sp - w0.sp === 1, `④ 마법사 → 소드메이지 변신 (공속·이속 +10 · SP +1 · 골드 ${w1.c})`);
    await p.evaluate(() => { __T.TOWN.placeAt(18.5, 22.5); __T.ZOOMT = 2.2; }); await p.waitForTimeout(1500); await p.screenshot({ path: 'dev/out/pcc_morph_sword_mage.png', clip: { x: 340, y: 150, width: 600, height: 460 } });
    await p.evaluate(() => PCG.doMorph('arc_mage')); ok((await cx()).cur === 'pc_arc_mage' && (await cx()).a - w0.a === 18, '④ 마법사 → 아크메이지 +18%'); await p.evaluate(() => PCG.doMorph('sword_mage')); }
  // ⑤ 다른 직업 카드가 변신 칸에 적혀 있으면(잘못된 데이터) 재접속 → 변신 안 함 (마법사 칸에 아크나이트)
  { await p.evaluate(() => __T.SAVE.now(true, true)); await p.waitForTimeout(300); let patched = '';
    const key = 'aden_pcard_' + acc.toLowerCase(), patch = async () => { patched = await p.evaluate(key => { const v = localStorage.getItem(key); if (!v) return 'no data'; const o = JSON.parse(v); if (!o.slot || o.slot.wizard !== 'sword_mage') return 'slot=' + JSON.stringify(o.slot); o.slot.wizard = 'arc_knight'; localStorage.setItem(key, JSON.stringify(o)); return 'ok'; }, key); };
    await relog(p, acc, 'wizard', '', true, patch); ok(patched === 'ok', '⑤ 마법사 변신 칸을 아크나이트로 바꿈 (' + patched + ')'); await p.waitForTimeout(1200); const c = await cx(); ok(c.cur === null && await p.evaluate(() => __T.BUFF.poly) === 0, '⑤ 다른 직업(기사) 카드가 칸에 있으면 → 변신 안 함');
    await p.evaluate(() => { __T.hero.lv = 52; __T.setCoins(50000); }); await p.evaluate(() => PCG.doMorph('sword_mage')); await p.evaluate(() => __T.SAVE.now(true, true)); await p.waitForTimeout(300);
    await relog(p, acc, 'wizard', '', true); ok((await cx()).cur === 'pc_sword_mage', '⑤ 자기 직업 카드 변신은 재접속해도 유지'); }
  // ⑥ 마일리지 1000 → 아크 고르기 (마법사 캐릭터에서 아크레인저 받기 — 계정 공유)
  { await p.evaluate(() => { PCG.state().mile = 1000; PCG.openWin(true); }); await p.waitForTimeout(400);
    await p.click('#pw-mb'); await p.waitForTimeout(600); const ids = await p.evaluate(() => [...document.querySelectorAll('#pw-pick [data-id]')].map(b => b.dataset.id));
    ok(['arc_knight', 'arc_mage', 'arc_ranger'].every(id => ids.includes(id)) && ids.length === 6, '⑥ 마일리지 전설 고르기에 아크 3종 (' + ids.join(',') + ')');
    ok(/요정 전용/.test(await p.evaluate(() => document.querySelector('#pw-pick [data-id="arc_ranger"]').textContent)), '⑥ 고르기 칸에 직업 전용 표시'); await p.screenshot({ path: 'dev/out/pcc_mile.png' });
    const r0 = (await S()).cards.arc_ranger || 0; await p.click('#pw-pick [data-id="arc_ranger"]'); await p.waitForTimeout(200); await p.click('#ask-yes'); await p.waitForTimeout(700); await p.evaluate(() => PCG.close());
    const s = await S(); ok(s.mile === 0 && (s.cards.arc_ranger || 0) === r0 + 1, '⑥ 마일리지 1000 → 아크레인저 1장 (마일리지 0)'); await p.evaluate(() => { document.getElementById('polywin').hidden = true; }); }
  // 도감 [변신 카드] 탭: 26종 · 직업 전용
  { await p.evaluate(() => document.getElementById('btn-codex').click()); await p.waitForTimeout(300);
    await p.evaluate(() => [...document.querySelectorAll('#cdx-tabs .cdx-tab')].find(t => /변신 카드/.test(t.textContent)).click()); await p.waitForTimeout(1200);
    const n = await p.evaluate(() => document.querySelectorAll('#cdx-list .cdx-card').length), t = await p.evaluate(() => [...document.querySelectorAll('#cdx-list .cdx-card')].filter(e => /소드|아크/.test(e.textContent)).map(e => e.textContent).join(' | '));
    ok(n === 26 && /소드나이트 변신 카드/.test(t) && /기사 전용/.test(t) && /0\.3%/.test(t) && /0\.033%/.test(t), `도감 [변신 카드] ${n}종 · 소드·아크 직업 전용 · 확률 0.3% / 0.033%`);
    await p.evaluate(() => { const c = [...document.querySelectorAll('#cdx-list .cdx-card')].find(e => /소드나이트/.test(e.textContent)); if (c) c.scrollIntoView(); }); await p.waitForTimeout(600); await p.screenshot({ path: 'dev/out/pcc_codex.png' });
    await p.evaluate(() => document.getElementById('codexwin').hidden = true); }
  // 요정 캐릭터: 소드레인저
  await relog(p, acc, 'elf', 'pccE' + Date.now() % 1e4, true);
  { await p.evaluate(() => { __T.setCoins(50000); __T.hero.lv = 52; }); const e0 = await cx(); await p.evaluate(() => PCG.doMorph('sword_ranger')); const e1 = await cx(); ok(e1.cur === 'pc_sword_ranger' && e1.a - e0.a === 10, '요정 → 소드레인저 +10%');
    await p.evaluate(() => PCG.openWin()); await p.waitForTimeout(1200); await p.screenshot({ path: 'dev/out/pcc_win_elf.png' }); await p.evaluate(() => { document.getElementById('polywin').hidden = true; }); }
  ok(errs.length === 0, '⑧ 오류 없음' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log(fails ? `실패 ${fails}개` : '모두 통과'); await b.close(); })();
