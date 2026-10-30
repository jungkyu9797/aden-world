// 접속자 목록에서 거리·지역 상관없이 교환 · 순간이동/지역 이동/사망하면 자동 취소 (KT_PORT=8782 bash dev/runkt.sh dev/tests/fartrade.js)
// 같은 브라우저 탭끼리(?mp=bc · BroadcastChannel)로 2명
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const errs = []; try {
  const page = async (nm, cls) => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(nm + ': ' + e.message)); await login(p, { cls, name: nm, mp: true }); await p.evaluate(() => { __T.hero.lv = 55; __T.GOD_INV = false; }); return p; };
  const A = await page('trA', 'knight'), B = await page('trB', 'elf');
  const bag = p => p.evaluate(() => { __T.INV.load({ bag: [{ id: 'long_sword', n: 1, en: 3 }, { id: 'red_potion', n: 20 }, { id: 'scr_tele', n: 5 }, { id: 'tele_scroll', n: 5 }].filter(x => __T.ITEMS[x.id]), bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); __T.INV.render(); });
  await bag(A); await bag(B);
  const tele = await A.evaluate(() => Object.keys(__T.ITEMS).find(k => __T.ITEMS[k].use === 'tele')); console.log('tele item', tele);
  // B는 사냥터(용계 등 다른 지역), A는 마을
  await B.evaluate(() => __T.TOWN.toZone(15)); await A.waitForTimeout(2500);
  const bPeer = await B.evaluate(() => __T.NET.me()), aPeer = await A.evaluate(() => __T.NET.me());
  console.log('zones', await A.evaluate(() => __T.SCENE), await B.evaluate(() => __T.SCENE + ':' + (__T.ISLE && __T.ISLE.id)));
  const win = p => p.evaluate(() => ({ open: !document.getElementById('tradewin').hidden, who: (document.getElementById('tw-who') || {}).textContent, log: __T.log.slice(-4).map(x => x.t || x.text || x) }));
  const yes = async p => { await p.waitForFunction(() => !document.getElementById('askwin').hidden, null, { timeout: 6000 }); await p.click('#ask-yes'); };
  // 접속자 목록 → [교환]
  await A.evaluate(() => { __T.NET.hasArtRoom = () => true; }); await A.waitForFunction(() => !document.getElementById('btn-mp').hidden, null, { timeout: 5000 }); await A.click('#btn-mp'); await A.waitForTimeout(1300);
  ok('접속자 목록에 [교환] 버튼', !!(await A.$(`#mp-list [data-trade="${bPeer}"]`)));
  await (await A.$('#mpwin')).screenshot({ path: 'dev/out/fartrade_list.png' });
  const start = async () => { await A.click(`#mp-list [data-trade="${bPeer}"]`); await yes(B); await A.waitForFunction(() => !document.getElementById('tradewin').hidden, null, { timeout: 6000 }); await A.waitForTimeout(400); };
  await A.click('#btn-mp'); await A.waitForTimeout(200); if (await A.evaluate(() => document.getElementById('mpwin').hidden)) await A.click('#btn-mp'); await A.waitForTimeout(500);
  await start(); let a = await win(A), bb = await win(B); console.log(JSON.stringify({ a, bb }));
  ok('다른 지역(마을 ↔ 사냥터)끼리 교환 창 열림', a.open && bb.open);
  // 실제 교환까지: A가 검을 올리고 둘 다 확인
  await A.evaluate(() => { const e = __T.INV.bag().find(x => x.id === 'long_sword'); document.querySelector(`#tradewin [data-bag="${__T.INV.bag().indexOf(e)}"]`).click(); }); await A.waitForTimeout(500);
  await A.click('#tw-ok').catch(() => {}); await B.click('#tw-ok').catch(() => {}); await A.waitForTimeout(800);
  await yes(A).catch(() => {}); await yes(B).catch(() => {}); await A.waitForTimeout(1500);
  const got = await B.evaluate(() => __T.INV.bag().some(x => x.id === 'long_sword' && x.en === 3)), gone = await A.evaluate(() => !__T.INV.bag().some(x => x.id === 'long_sword'));
  ok('다른 지역끼리 교환 성공 (검이 B에게)', got && gone);
  // ① B가 순간이동 주문서 → 둘 다 닫힘, A에 '상대방이 텔을 타거나 사망하여 거래가 취소되었습니다.'
  await A.waitForTimeout(3200); await start();
  await B.evaluate(t => { const e = __T.INV.bag().find(x => x.id === t); __T.INV.use(e); }, tele); await A.waitForTimeout(1500);
  a = await win(A); bb = await win(B); console.log('tele', JSON.stringify({ a, bb }));
  ok('① 순간이동 → 둘 다 창 닫힘', !a.open && !bb.open);
  ok('① 상대 화면: 상대방이 텔을 타거나 사망하여 거래가 취소되었습니다.', a.log.some(x => /상대방이 텔을 타거나 사망하여 거래가 취소되었습니다/.test(x)));
  ok('① 내 화면: 순간이동 취소 안내', bb.log.some(x => /순간이동.*거래가 취소/.test(x)));
  // ② A가 지역 이동(마을 → 사냥터)
  await A.waitForTimeout(3200); await start();
  await A.evaluate(() => __T.TOWN.toZone(1)); await A.waitForTimeout(1500); a = await win(A); bb = await win(B); console.log('zone', JSON.stringify({ a, bb }));
  ok('② 지역 이동 → 둘 다 닫힘 · 상대에게 안내', !a.open && !bb.open && bb.log.some(x => /상대방이 텔을 타거나 사망하여/.test(x)));
  // ③ B 사망
  await A.waitForTimeout(3200); await start();
  await B.evaluate(() => { __T.hurtHero(99999, null, 'test'); }); await A.waitForTimeout(1500); a = await win(A); bb = await win(B); console.log('death', JSON.stringify({ a, bb }));
  ok('③ 사망 → 둘 다 닫힘 · 상대에게 안내', !a.open && !bb.open && a.log.some(x => /상대방이 텔을 타거나 사망하여/.test(x)) && bb.log.some(x => /쓰러져서 거래가 취소/.test(x)));
  // ④ 쓰러진 사람에게는 신청 안 됨
  await A.waitForTimeout(3200); await A.evaluate(p => __T.NET.others().length, null); await A.click('#btn-mp').catch(() => {}); await A.waitForTimeout(300); if (await A.evaluate(() => document.getElementById('mpwin').hidden)) await A.click('#btn-mp'); await A.waitForTimeout(800);
  await A.click(`#mp-list [data-trade="${bPeer}"]`); await A.waitForTimeout(400); a = await win(A); ok('④ 쓰러진 상대에게는 신청 안 됨', a.log.some(x => /상대가 쓰러져 있어서/.test(x)));
  // ⑤ 플레이어 메뉴는 어디서나 [교환 신청]
  ok('⑤ 마을 밖 메뉴 문구 없앰', !(await A.evaluate(() => /교환은 마을에서만/.test(document.documentElement.innerHTML))));
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
