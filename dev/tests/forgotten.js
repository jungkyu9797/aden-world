// 11/3 잊혀진 섬 (지역 25 · dev/rooms/forgotten.md) — python3 dev/mkkt.py && KT_PORT=8897 KT_TO=900 bash dev/runkt.sh dev/tests/forgotten.js
//   ① 월드맵 입장료 50만 골드 (모자라면 거절) ② 맵 한가운데 도착 ③ 가운데 비고 바로 바깥에 몹 떼 (288마리 = 몽섬 2배 · 5:1) ④ 몹 능력치 표 (화둥 2구역 평균 × 3 · 이동 2배 · 선공 · 무속성)
//   ⑤ 귀환 부적·순간이동 주문서·월드맵(마을·사냥 시작)·귀환 버튼·자동사냥 귀환(HP·물약)·절전 귀환 모두 막힘 + 안내 ⑥ 떠돌이 상인: 물약만 · 본토 값의 2배 · 구입
//   ⑦ 일반 몹 드랍(고급·일반 없음 · 희귀 4% · 영웅 0.5%) ⑧ 드레이크 고대의 주문서 3% · 빛바랜 벨트 3% ⑨ 주문서 → 빛바랜 벨트 3/27/70 (뽑기 3만 번) ⑩ 실제 사용: 둘 다 소진 · 결과 안내 · 잘못된 대상
//   ⑪ 보스 전리품: 전설 벨트 3% · 빛바랜 벨트 1~5 · 고대의 주문서 1~5 반드시 ⑫ 펫 · 혈맹 파티 봇이 같이 들어와 싸움 ⑬ 사망 → 무덤 → 부활(제자리) · 마을 부활
//   ⑭ 섬지기 대화 → [머무른다]/[섬을 탈출한다] → 마을 ⑮ 월드맵 도감 ⑯ 스크린샷 dev/out/forgotten_*.png (광장 · 넓게 · 상인 창 · 싸움 · 몹 그림 · 아이템 아이콘·툴팁 · 월드맵)
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
const Z = 25, REF = { lv: 61, fb: { lv: 61, c: 'knight', hp: 778, ac: -127, mr: 85, d: 60, hb: 0.05, cr: 0.12, cp: 11114 } };
const lastLog = (p, n = 8) => p.evaluate(n => __T.log.slice(-n).map(x => String(x.t || x.text || x)).join(' / '), n);
(async () => { const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await login(p, { cls: 'knight', name: 'fgt' + Date.now() % 1e4 }); await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 60; });
  // ---------- ① 월드맵 입장료
  await p.evaluate(() => __T.setCoins(499999)); await p.click('#btn-map'); await p.waitForTimeout(500); await p.click('#wm-stage .mk[data-r="forgotten_island"]'); await p.waitForTimeout(400);
  const w1 = await p.evaluate(() => ({ go: document.getElementById('wm-go').textContent, name: document.getElementById('wm-name').textContent, codex: document.getElementById('wm-codex').innerText.replace(/\s+/g, ' ').slice(0, 400) }));
  await p.screenshot({ path: 'dev/out/forgotten_map.png' });
  await p.click('#wm-go'); await p.waitForTimeout(300);
  const w2 = await p.evaluate(() => ({ ask: !document.getElementById('askwin').hidden, coins: __T.coins, scene: __T.SCENE, log: __T.log.slice(-1).map(x => String(x.t || x)).join('') }));
  console.log('①', JSON.stringify(w1), JSON.stringify(w2));
  ok(w1.name === '잊혀진 섬' && /500,000 골드/.test(w1.go), `① 월드맵 [잊혀진 섬] 선택 → 버튼 "${w1.go}"`);
  ok(!w2.ask && w2.coins === 499999 && w2.scene === 'town' && /부족/.test(w2.log), `① 49만 9999 골드로는 거절 (${w2.log})`);
  await p.evaluate(() => __T.setCoins(600000)); await p.click('#wm-go'); await p.waitForTimeout(300); const ask1 = await p.evaluate(() => [!document.getElementById('askwin').hidden, document.getElementById('ask-sub').textContent]); await p.click('#ask-yes');
  await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', Z, { timeout: 60000 }); await p.waitForTimeout(2500);
  // ---------- ② 도착 · ③ 몹 배치
  const a = await p.evaluate(() => { const T = __T, F = __FG, I = T.ISLE, N = I.N, C = N / 2, cnt = {}, band = { in: 0, near: 0, far: 0 }; let minD = 99, nowIn = 0, bossD = null;
    for (const f of T.foxes) { if (f.dead || f.gone) continue; const S = T.MOB[f.kind], d = Math.hypot(f.home[0] + 0.5 - C, f.home[1] + 0.5 - C); if (S.boss) { bossD = +d.toFixed(1); continue; } cnt[f.kind] = (cnt[f.kind] || 0) + 1; minD = Math.min(minD, d); band[d <= F.FGI.NO_SPAWN_R ? 'in' : d <= F.FGI.NEAR_R ? 'near' : 'far']++; if (Math.hypot(f.x - C, f.z - C) <= F.FGI.SAFE_R) nowIn++; }
    const area = r => Math.PI * r * r, ringA = area(F.FGI.NEAR_R) - area(F.FGI.NO_SPAWN_R), farA = N * N - area(F.FGI.NEAR_R);
    return { coins: T.coins, hero: [T.hero.i, T.hero.j], N, cnt, band, minD: +minD.toFixed(1), nowIn, bossD, dens: { ring: +(ringA / band.near).toFixed(1), far: +(farA / band.far).toFixed(1) }, props: I.props.length, plazaProps: I.props.filter(q => Math.hypot(q.i + 0.5 - C, q.j + 0.5 - C) <= F.FGI.SAFE_R).length, nobot: !!I.def.nobot, hello: T.log.slice(-3).map(x => String(x.t || x)).join(' / ').slice(0, 200) }; });
  console.log('②③', JSON.stringify(a));
  ok(ask1[0] && /500,000 골드/.test(ask1[1]) && a.coins === 100000, `① 60만 골드 → 확인 창(${ask1[1]}) → 입장 · 50만 골드 빠짐 (남은 ${a.coins})`);
  ok(a.N === 133 && a.hero[0] === 66 && a.hero[1] === 66, `② 크기 N ${a.N}(몽환의 섬과 같음) · 맵 한가운데 도착 (${a.hero})`);
  const tot = Object.values(a.cnt).reduce((x, y) => x + y, 0);
  ok(tot === 288 && ['fg_bugbear', 'fg_delf', 'fg_ettin', 'fg_gast', 'fg_shelob'].every(k => a.cnt[k] === 48) && a.cnt.fg_drake === 48, `③ 몹 ${tot}마리 = 몽환의 섬 144의 2배 · 일반 5종 48씩 · 드레이크 48 (5:1) ${JSON.stringify(a.cnt)}`);
  ok(a.band.in === 0 && a.minD >= 11 && a.nowIn === 0 && a.plazaProps === 0, `③ 가운데 11칸 안에는 몹 없음 (가장 가까운 몹 ${a.minD}칸 · 광장 소품 ${a.plazaProps})`);
  ok(a.band.near >= 115 && a.dens.ring * 3 < a.dens.far, `③ 광장 바로 바깥 고리(11~28칸)에 ${a.band.near}마리 몰림 — 고리 ${a.dens.ring}칸당 1마리 · 나머지 ${a.dens.far}칸당 1마리`);
  ok(a.nobot && (a.bossD == null || a.bossD > 14), `③ 필드 봇 없음 · 보스 자리 가운데에서 ${a.bossD}칸`);
  await p.evaluate(() => { __T.DN_.set(0); }); await p.waitForTimeout(1500); await p.screenshot({ path: 'dev/out/forgotten_center.png' });
  await p.evaluate(() => { __T.ZOOMT = 1; }); await p.waitForTimeout(1300); await p.screenshot({ path: 'dev/out/forgotten_wide.png' }); await p.evaluate(() => { __T.ZOOMT = 2; }); await p.waitForTimeout(600);
  // ---------- ④ 몹 능력치
  const st = await p.evaluate(() => { const T = __T, F = __FG, B = F.FG_BASE, rows = []; for (const k in F.FG_DEF) { const S = T.MOB[k], src = T.MOB[F.FG_DEF[k][0]]; rows.push({ k, name: S.name, lv: S.lv, hp: S.hp, dmg: S.dmg.join('~'), mac: S.mac, mr: S.mr, exp: S.exp, coin: S.coin.join('~'), run: S.run, run0: src.run, walk: S.walk, walk0: src.walk, aggr: S.aggr, el: S.el || '', mid: !!S.fgMid }); }
    const G = T.MOB.fg_giant, P = T.MOB.phoenix; return { B, rows, giant: { hp: G.hp, dmg: G.dmg, exp: G.exp, coin: G.coin, run: G.run, aggr: G.aggr, el: G.el || '' }, phx: { hp: P.hp, dmg: P.dmg, exp: P.exp, coin: P.coin, run: P.run } }; });
  console.log('④ 화둥 2구역 평균(사라만다·혼 켈베로스·아시타지오):', JSON.stringify(Object.fromEntries(Object.entries(st.B).map(([k, v]) => [k, Math.round(v * 100) / 100]))));
  console.log('   종류              Lv    HP     피해        AC  MR  경험치  골드          이동(원래→)     선공 속성');
  for (const r of st.rows) console.log(`   ${(r.name + (r.mid ? '(중보)' : '')).padEnd(14)} ${r.lv}  ${String(r.hp).padStart(6)}  ${r.dmg.padEnd(9)} ${String(r.mac).padStart(3)} ${String(r.mr).padStart(3)}  ${String(r.exp).padStart(6)}  ${r.coin.padEnd(12)} ${r.walk0}/${r.run0}→${r.walk}/${r.run}  ${r.aggr}   ${r.el || '없음'}`);
  console.log(`   에이션트 자이언트   HP ${st.giant.hp} (피닉스 ${st.phx.hp}) · 피해 ${st.giant.dmg} (${st.phx.dmg}) · 경험치 ${st.giant.exp} · 골드 ${st.giant.coin} · 달리기 ${st.phx.run}→${st.giant.run}`);
  { const N5 = st.rows.filter(r => !r.mid), av = f => N5.reduce((x, r) => x + f(r), 0) / N5.length, R = { hp: av(r => r.hp) / st.B.hp, d0: av(r => +r.dmg.split('~')[0]) / st.B.d0, d1: av(r => +r.dmg.split('~')[1]) / st.B.d1, exp: av(r => r.exp) / st.B.exp, c0: av(r => +r.coin.split('~')[0]) / st.B.c0, c1: av(r => +r.coin.split('~')[1]) / st.B.c1 };
    console.log('   일반 5종 평균 ÷ 화둥 평균:', JSON.stringify(Object.fromEntries(Object.entries(R).map(([k, v]) => [k, +v.toFixed(3)]))));
    ok(Object.values(R).every(v => Math.abs(v - 3) < 0.03), `④ 일반 5종 평균 HP·공격·경험치·골드 = 화둥 2구역 평균의 3배 (${Object.values(R).map(v => v.toFixed(2)).join(' · ')})`); }
  ok(st.rows.every(r => Math.abs(r.run - r.run0 * 2) < 0.02 && Math.abs(r.walk - r.walk0 * 2) < 0.02) && Math.abs(st.giant.run - st.phx.run * 2) < 0.02, '④ 이동 속도 = 원래 몹의 2배 (보스 = 피닉스 2배)');
  ok(st.rows.every(r => r.aggr > 0 && !r.el) && st.giant.aggr > 0 && !st.giant.el, '④ 전부 선공 · 무속성');
  ok(st.giant.hp === st.phx.hp * 3 && st.giant.exp === st.phx.exp * 3 && st.giant.dmg[0] === st.phx.dmg[0] * 3, '④ 에이션트 자이언트 = 피닉스 × 3 (HP·피해·경험치·골드)');
  // ---------- ⑤ 귀환·순간이동 막힘
  const bl = await p.evaluate(async () => { const T = __T, H = T.hero, I = T.INV, F = __FG, MSG = F.FGI.MSG, z = () => T.SCENE === 'field' && T.ISLE && T.ISLE.id === 25, msg = () => T.log.slice(-4).some(x => String(x.t || x).includes(MSG)), wait = ms => new Promise(r => setTimeout(r, ms)), o = {};
    const charm = I.bag().find(x => x.id === 'return_charm'); I.use(charm); await wait(80); o.charm = z() && msg(); T.log.push({ t: '-' });
    await wait(1300); I.add('tele_scroll', 3, true); const p0 = [H.i, H.j], n0 = I.count('tele_scroll'); I.use(I.bag().find(x => x.id === 'tele_scroll')); await wait(80); o.tele = z() && msg() && H.i === p0[0] && H.j === p0[1] && I.count('tele_scroll') === n0; T.log.push({ t: '-' });
    await wait(1300); o.home = T.TOWN.scrollHome() === false && z() && msg(); T.log.push({ t: '-' });
    return o; });
  // 월드맵: 다른 사냥터 [사냥 시작] · [마을]
  await p.waitForTimeout(1300); await p.click('#btn-map'); await p.waitForTimeout(400); await p.click('#wm-stage .mk[data-r="fire_dragon_nest"]'); await p.waitForTimeout(200); const c0 = await p.evaluate(() => __T.coins); await p.click('#wm-go'); await p.waitForTimeout(300);
  const wmGo = await p.evaluate(c0 => ({ z: __T.ISLE && __T.ISLE.id, ask: !document.getElementById('askwin').hidden, coins: __T.coins === c0, msg: __T.log.slice(-3).some(x => String(x.t || x).includes(__FG.FGI.MSG)) }), c0);
  await p.waitForTimeout(1300); await p.click('#wm-town'); await p.waitForTimeout(300); const wmTown = await p.evaluate(() => ({ z: __T.ISLE && __T.ISLE.id, ask: !document.getElementById('askwin').hidden, msg: __T.log.slice(-3).some(x => String(x.t || x).includes(__FG.FGI.MSG)) }));
  await p.evaluate(() => { document.getElementById('wmap').hidden = true; });
  // 자동사냥: HP 낮음·물약 부족이어도 귀환 안 함 (계속 사냥)
  const au = await p.evaluate(async () => { const T = __T, H = T.hero, A = T.AUTO, wait = ms => new Promise(r => setTimeout(r, ms)); A.setCfg({ retHp: 70, lowPot: true, lowN: 999 }); if (!A.on()) A.toggle(); H.hp = Math.max(1, Math.round(H.max * 0.2)); for (let k = 0; k < 6; k++) { A.tick(0.05); await wait(30); }
    const r = { on: A.on(), st: A.status(), z: T.ISLE && T.ISLE.id, scene: T.SCENE, msg: T.log.slice(-12).map(x => String(x.t || x)).filter(t => /자동사냥: /.test(t)).slice(-2) }; H.hp = H.max; if (A.on()) A.toggle(); return r; });
  // 절전 모드: 라인 봇에게 맞아도 귀환 안 함
  const sv = await p.evaluate(async () => { const T = __T, wait = ms => new Promise(r => setTimeout(r, ms)); window.SAVER.enter(false); await wait(200); const hc = document.getElementById('sv-homec'); if (hc) { hc.checked = true; hc.dispatchEvent(new Event('change')); }
    window.SAVER.pvpHit({ fb: true }); await wait(200); const r = { on: window.SAVER.on(), z: T.ISLE && T.ISLE.id, scene: T.SCENE, hc: !!(hc && hc.checked), note: (document.getElementById('saver') || document.body).innerText.includes(__FG.FGI.MSG) }; window.SAVER.exit(); if (hc) { hc.checked = false; hc.dispatchEvent(new Event('change')); } await wait(100); return r; });
  console.log('⑤', JSON.stringify(bl), JSON.stringify(wmGo), JSON.stringify(wmTown), JSON.stringify(au), JSON.stringify(sv));
  ok(bl.charm, '⑤ 귀환 부적 → 막힘 + "주변의 에너지가 공간을 차단하고 있습니다"'); ok(bl.tele, '⑤ 순간이동 주문서 → 막힘 (자리 그대로 · 주문서 그대로)'); ok(bl.home, '⑤ 귀환(TOWN.scrollHome) → 막힘');
  ok(wmGo.z === 25 && !wmGo.ask && wmGo.coins && wmGo.msg, '⑤ 월드맵에서 다른 사냥터 [사냥 시작] → 막힘 (골드 그대로)'); ok(wmTown.z === 25 && !wmTown.ask && wmTown.msg, '⑤ 월드맵 [아덴 마을] → 막힘');
  ok(au.z === 25 && au.scene === 'field' && au.on && au.msg.some(t => t.includes('계속 사냥')), `⑤ 자동사냥: HP 20%·물약 부족이어도 귀환 안 하고 계속 (${au.msg.join(' | ')})`);
  ok(sv.z === 25 && sv.scene === 'field' && sv.hc, `⑤ 절전(마을 귀환 켬) 중 라인 봇에게 맞아도 귀환 안 함 (안내 ${sv.note})`);
  // ---------- ⑥ 떠돌이 상인 (물약 · 2배)
  const shopPos = await p.evaluate(() => { const [i, j] = __FG.FGM.at('shop'); return __T.scr(i + 0.5, j + 0.5); }); await p.mouse.click(shopPos[0], shopPos[1] - 40);
  await p.waitForFunction(() => !document.getElementById('shop').hidden, null, { timeout: 15000 }).catch(() => {});
  const sh = await p.evaluate(() => { const T = __T, g = T.TOWN.shopList().find(b => b.id === 'general'), town = Object.fromEntries(g.tabs[0][1].filter(r => /물약/.test(r[0])).map(r => [r[0], r[1]]));
    const rows = [...document.querySelectorAll('#shop-list .item')].map(r => ({ n: r.querySelector('.nm').textContent, pr: +r.querySelector('.pr').textContent.replace(/[^0-9]/g, '') })); return { vis: !document.getElementById('shop').hidden, title: document.getElementById('shop-title').textContent, npc: document.getElementById('shop-npc').textContent, rows, town, tabs: [...document.querySelectorAll('#shop-tabs .shop-tab')].map(t => t.textContent) }; });
  console.log('⑥', JSON.stringify(sh));
  ok(sh.vis && /떠돌이 상인/.test(sh.npc), `⑥ 떠돌이 상인을 누르면 걸어가서 상점 창 (${sh.title} · ${sh.npc})`);
  ok(sh.rows.length === Object.keys(sh.town).length && sh.rows.length >= 5 && sh.rows.every(r => /물약/.test(r.n) && r.pr === sh.town[r.n] * 2), `⑥ 물약만 ${sh.rows.length}종 · 값 = 본토 잡화상점의 2배 (${sh.rows.map(r => r.n + ' ' + r.pr).join(' · ')})`);
  const buy = await p.evaluate(() => { const T = __T, c0 = T.coins, n0 = T.INV.count('red_potion'), row = [...document.querySelectorAll('#shop-list .item')].find(r => r.querySelector('.nm').textContent === '빨간 물약'), inp = row.querySelector('input'); inp.value = 3; inp.dispatchEvent(new Event('input')); row.querySelector('.buy').click(); return { d: c0 - T.coins, n: T.INV.count('red_potion') - n0 }; });
  ok(buy.d === 150 && buy.n === 3, `⑥ 빨간 물약 3개 구입 → ${buy.d} 골드 (개당 50 = 본토 25의 2배)`);
  await p.screenshot({ path: 'dev/out/forgotten_shop.png' }); await p.evaluate(() => { document.getElementById('shop').hidden = true; });
  // ---------- ⑦ 일반 몹 드랍 · ⑧ 드레이크 드랍
  const dr = await p.evaluate(() => { const T = __T, F = __FG, N = 20000, out = {}; for (const k of ['fg_bugbear', 'fg_drake']) { const f = T.mkMob(k, 70, 84), rar = {}, ids = {}; T.GROUND.capStart(); for (let q = 0; q < N; q++) F.fgLoot(f, null); const L = T.GROUND.capEnd(); for (const d of L) { const r = T.ITEMS[d.id].rar || '일반'; rar[r] = (rar[r] || 0) + 1; ids[d.id] = (ids[d.id] || 0) + 1; } out[k] = { rar, n: L.length, kinds: Object.keys(ids).length, scroll: ids.fg_scroll || 0, faded: ids.fg_faded_belt || 0, heroGear: L.filter(d => T.ITEMS[d.id].rar === '영웅' && T.ITEMS[d.id].slot).length }; T.GROUND.clear(); }
    const P = F.fgPools(); return { out, N, pool: { rareGear: P.rareGear.length, rareScr: P.rareScr, heroGear: P.heroGear.length, heroScr: P.heroScr, rareBelt: P.rareBelt.map(id => T.ITEMS[id].name), heroBelt: P.heroBelt.map(id => T.ITEMS[id].name) } }; });
  console.log('⑦⑧', JSON.stringify(dr));
  { const o = dr.out.fg_bugbear, hr = (o.rar['영웅'] || 0) / dr.N, rr = (o.rar['희귀'] || 0) / dr.N;
    ok(!o.rar['일반'] && !o.rar['고급'] && !o.rar['전설'], `⑦ 일반 몹 드랍에 일반·고급 없음 (${JSON.stringify(o.rar)})`);
    ok(rr > 0.034 && rr < 0.046 && o.kinds > 20, `⑦ 희귀 ${(rr * 100).toFixed(2)}% (목표 4% · ${o.kinds}종)`); ok(hr > 0.003 && hr < 0.0075 && o.heroGear > 0, `⑦ 영웅 ${(hr * 100).toFixed(2)}% (목표 0.5% · 영웅 장비 ${o.heroGear}개)`); }
  { const o = dr.out.fg_drake, s = o.scroll / dr.N, f = o.faded / dr.N; ok(s > 0.026 && s < 0.034 && f > 0.026 && f < 0.034, `⑧ 드레이크: 고대의 주문서 ${(s * 100).toFixed(2)}% · 빛바랜 벨트 ${(f * 100).toFixed(2)}% (목표 3%·3% · ${dr.N}마리)`); ok(!o.rar['일반'] && !o.rar['고급'], '⑧ 드레이크도 일반·고급 없음'); }
  // ---------- ⑨ 고대의 주문서 → 빛바랜 벨트 확률 (뽑기 3만 번)
  const rl = await p.evaluate(() => { const T = __T, F = __FG, N = 30000, c = { 전설: 0, 영웅: 0, 희귀: 0 }, ids = {}; for (let q = 0; q < N; q++) { const r = F.fgRoll(); c[r.tier]++; ids[r.id] = (ids[r.id] || 0) + 1; } return { N, c, ids: Object.fromEntries(Object.entries(ids).map(([k, v]) => [T.ITEMS[k].name + '(' + T.ITEMS[k].rar + ')', v])), belt: (({ name, slot, rar, lv, ac, mr, hp, wr, optTxt }) => ({ name, slot, rar, lv, ac, mr, hp, wr, optTxt }))(T.ITEMS.fg_belt) }; });
  console.log('⑨', JSON.stringify(rl));
  { const pc = k => rl.c[k] / rl.N; ok(Math.abs(pc('전설') - 0.03) < 0.005 && Math.abs(pc('영웅') - 0.27) < 0.012 && Math.abs(pc('희귀') - 0.70) < 0.012, `⑨ 결과 ${(pc('전설') * 100).toFixed(2)}% / ${(pc('영웅') * 100).toFixed(1)}% / ${(pc('희귀') * 100).toFixed(1)}% (목표 3/27/70)`); }
  ok(rl.belt.slot === 'belt' && rl.belt.rar === '전설' && rl.belt.name === '에이션트 자이언트의 반지', `⑨ 전설 = [에이션트 자이언트의 반지] 벨트 칸 (${rl.belt.optTxt.join(' · ')} · AC ${rl.belt.ac} · MR ${rl.belt.mr} · Lv${rl.belt.lv})`);
  // ---------- ⑩ 실제 사용: 주문서·빛바랜 벨트 소진 · 결과 안내 · 잘못된 대상
  await p.evaluate(() => { const I = __T.INV; I.add('fg_scroll', 4, true); I.add('fg_faded_belt', 3, true); if (document.getElementById('invwin').hidden) I.toggleBoth(); I.render(); });
  await p.waitForTimeout(400);
  const useOnce = () => p.evaluate(async () => { const T = __T, I = T.INV, wait = ms => new Promise(r => setTimeout(r, ms)), cnt = () => ({ s: I.count('fg_scroll'), f: I.count('fg_faded_belt'), belts: I.bag().filter(e => T.ITEMS[e.id].slot === 'belt').length });
    const c0 = cnt(); I.use(I.bag().find(e => e.id === 'fg_scroll')); await wait(50); const tg = !!I.targeting(); const cell = [...document.querySelectorAll('#inv-grid > *')].find(c => c.innerHTML.includes('fdb_a')); if (cell) cell.click(); await wait(120);
    const c1 = cnt(); return { tg, cell: !!cell, c0, c1, msg: T.log.slice(-3).map(x => String(x.t || x)).find(t => t.includes('되었습니다')) || '' }; });
  const u1 = await useOnce(); await p.waitForTimeout(250); await p.screenshot({ path: 'dev/out/forgotten_roll.png' }); const u2 = await useOnce(); const u3 = await useOnce();
  console.log('⑩', JSON.stringify([u1, u2, u3]));
  ok([u1, u2, u3].every(u => u.tg && u.cell && u.c1.s === u.c0.s - 1 && u.c1.f === u.c0.f - 1 && u.c1.belts === u.c0.belts + 1 && u.msg), `⑩ 주문서 → 빛바랜 벨트 클릭 3번: 둘 다 1개씩 사라지고 벨트 1개 (${[u1, u2, u3].map(u => u.msg.replace(/^.*빛이 되살아나 /, '').replace(/ \(전설.*$/, '')).join(' / ')})`);
  const wr = await p.evaluate(async () => { const T = __T, I = T.INV, wait = ms => new Promise(r => setTimeout(r, ms)); I.add('fg_faded_belt', 1, true); I.render(); await wait(50); const s0 = I.count('fg_scroll'); I.use(I.bag().find(e => e.id === 'fg_scroll')); await wait(50); const cell = [...document.querySelectorAll('#inv-grid > *')].find(c => !c.innerHTML.includes('fdb_a') && !c.innerHTML.includes('anc_p') && c.querySelector('svg')); if (cell) cell.click(); await wait(80); const r1 = { s: I.count('fg_scroll') === s0, msg: T.log.slice(-2).map(x => String(x.t || x)).join(' / ') };
    I.bag().filter(e => e.id === 'fg_faded_belt').forEach(e => { e.n = 0; }); for (let k = I.bag().length - 1; k >= 0; k--) if (I.bag()[k].id === 'fg_faded_belt') I.bag().splice(k, 1); I.use(I.bag().find(e => e.id === 'fg_scroll')); await wait(50); r1.none = !I.targeting() && T.log.slice(-1).map(x => String(x.t || x)).join('').includes('없습니다'); return r1; });
  console.log('⑩b', JSON.stringify(wr)); ok(wr.s && /빛을 바랜 전설의 벨트\]에만/.test(wr.msg), '⑩ 다른 아이템에 쓰면 안내만 · 주문서 그대로'); ok(wr.none, '⑩ 빛바랜 벨트가 없으면 쓸 수 없다고 안내');
  // 아이템 아이콘·툴팁 스크린샷 (가방 · 전설 벨트 상세)
  await p.evaluate(() => { const T = __T, I = T.INV; I.add('fg_faded_belt', 2, true); if (!I.count('fg_belt')) I.add('fg_belt', 1, true); I.render(); const e = I.bag().find(x => x.id === 'fg_belt'); I.showDetail(e); });
  await p.waitForTimeout(500); await p.screenshot({ path: 'dev/out/forgotten_items.png' });
  const tips = await p.evaluate(() => ['fg_scroll', 'fg_faded_belt', 'fg_belt'].map(id => __T.INV.tipOf({ id, n: 1, on: false }).split('\n').slice(0, 6).join(' | ')));
  console.log('tips', JSON.stringify(tips)); await p.evaluate(() => { __T.INV.hideDetail(); document.getElementById('invwin').hidden = true; const cw = document.getElementById('charwin'); if (cw) cw.hidden = true; });
  // ---------- ⑪ 보스 전리품
  const bs = await p.evaluate(() => { const T = __T, N = 3000, f = T.mkMob('fg_giant', 80, 84); let leg = 0, badF = 0, badS = 0, minN = 99; const fd = [0, 0, 0, 0, 0, 0], sc = [0, 0, 0, 0, 0, 0];
    for (let q = 0; q < N; q++) { T.GROUND.capStart(); T.GROUND.bossLoot(f); const L = T.GROUND.capEnd(); const nF = L.filter(d => d.id === 'fg_faded_belt').reduce((a, d) => a + d.n, 0), nS = L.filter(d => d.id === 'fg_scroll').reduce((a, d) => a + d.n, 0); if (L.some(d => d.id === 'fg_belt')) leg++; if (nF < 1 || nF > 5) badF++; else fd[nF]++; if (nS < 1 || nS > 5) badS++; else sc[nS]++; minN = Math.min(minN, L.length); if (q % 50 === 49) T.GROUND.clear(); }
    T.GROUND.clear(); return { N, leg, badF, badS, fd, sc, minN }; });
  console.log('⑪', JSON.stringify(bs));
  ok(bs.badF === 0 && bs.badS === 0 && bs.fd.slice(1).every(v => v > 400) && bs.sc.slice(1).every(v => v > 400), `⑪ 에이션트 자이언트: 빛바랜 벨트 1~5 · 고대의 주문서 1~5 반드시 (${bs.N}번 · 개수별 ${bs.fd.slice(1)} / ${bs.sc.slice(1)})`);
  ok(bs.leg / bs.N > 0.018 && bs.leg / bs.N < 0.043, `⑪ 전설 벨트 ${(bs.leg / bs.N * 100).toFixed(2)}% (목표 3% · 한 번만 굴림) · 한 번에 최소 ${bs.minN}개`);
  await p.evaluate(() => { __T.log.length = Math.min(__T.log.length, 200); });
  // ---------- ⑫ 펫 · 혈맹 파티 봇
  const pt = await p.evaluate(() => { const T = __T, e = { id: 'pet_collar', n: 1, pet: Object.assign(T.mkPetData('doberman', 30), { name: '섬멍' }) }; T.INV.bag().push(e); const s = T.PET.summon(e); return { s, out: e.pet.state }; });
  await p.waitForTimeout(600);
  const pb = await p.evaluate(R => { const F = __FB, T = __T; F.setRef(R); Object.assign(F.DBG, { noEnsure: true, noBoss: true, noTalk: true, noReinf: true }); const A = F.pb.list().filter(x => !x.why).slice(0, 3).map(x => x.b.uid); const inv = A.map(u => F.pb.invite(u)); return { inv, n: F.pb.S.m.length }; }, REF);
  await p.waitForTimeout(800);
  const pb2 = await p.evaluate(() => { const T = __T, F = __FB, H = T.hero, L = F.pb.here(), pets = (T.PB_HERE_ || []).length; const petsHere = T.INV.bag().filter(e => e.pet && e.pet.state === 'out').length;
    const M = T.foxes.filter(f => !f.dead && !f.gone && T.MOB[f.kind] && T.MOB[f.kind].fgi && !T.MOB[f.kind].boss).sort((a, b) => Math.hypot(a.x - H.x, a.z - H.z) - Math.hypot(b.x - H.x, b.z - H.z)), m = M[0];
    T.TOWN.placeAt(m.x + 2, m.z); F.sim(0.3); H.target = m; m.hp = m.max = 1e6; m.dmgBy = null; for (const e of F.pb.here()) e.px.hits = 0; F.sim(6);
    return { n: L.length, zone: L.map(e => e.zone), d: L.map(e => Math.max(Math.abs(e.i - H.i), Math.abs(e.j - H.j))), petsHere, kind: m.kind, hits: F.pb.here().map(e => e.px.hits), dmg: m.dmgBy ? Math.round(m.dmgBy.get(H) || 0) : 0, petTgt: !!(T.foxes.length) }; });
  console.log('⑫', JSON.stringify(pt), JSON.stringify(pb), JSON.stringify(pb2));
  ok(pt.s !== false && pt.out === 'out' && pb2.petsHere >= 1, `⑫ 섬 안에서 펫 소환 (${pt.out})`);
  ok(pb.inv.every(Boolean) && pb2.n === 3 && pb2.zone.every(z => z === 'isle25'), `⑫ 혈맹 파티 봇 3명이 섬 안에서 함께 (밖에서 기다리지 않음 · 거리 ${pb2.d})`);
  ok(pb2.hits.some(h => h > 0) && pb2.dmg > 0, `⑫ 파티 봇이 ${pb2.kind}을(를) 공격 (${pb2.hits} · 내 몫 피해 ${pb2.dmg})`);
  await p.waitForTimeout(2500); await p.screenshot({ path: 'dev/out/forgotten_fight.png' });
  await p.evaluate(() => { const F = __FB; if (F.pb.end) try { F.pb.end(); } catch (e) {} });
  // 몹 그림 나란히 (6종 + 보스) — 다른 몹은 치우고 잠깐 멈춤 (선공·이동 0)
  await p.evaluate(() => { const T = __T, H = T.hero, C = T.ISLE.N >> 1; T.TOWN.placeAt(C + 0.5, C + 0.5); for (const f of T.foxes) f.gone = true; const ks = ['fg_bugbear', 'fg_delf', 'fg_ettin', 'fg_gast', 'fg_shelob', 'fg_drake'];
    window.__SP = {}; for (const k of ks.concat('fg_giant')) { window.__SP[k] = [T.MOB[k].walk, T.MOB[k].run, T.MOB[k].aggr]; T.MOB[k].walk = 0; T.MOB[k].run = 0; T.MOB[k].aggr = 0; }
    ks.forEach((k, q) => { const d = -15 + q * 6, i = Math.round((2 * C + 8 + d) / 2), m = T.mkMob_(k, i, 2 * C + 8 - i); m.home = [m.i, m.j]; m.row = 1; T.foxes.push(m); }); const g = T.mkMob_('fg_giant', C - 7, C + 3); g.home = [g.i, g.j]; g.row = 1; T.foxes.push(g); H.row = 1; T.GOD_INV = true; T.ZOOMT = 1.3; });
  await p.waitForTimeout(2500); await p.screenshot({ path: 'dev/out/forgotten_mobs.png' });
  await p.evaluate(() => { __T.ZOOMT = 2; for (const k in window.__SP) [__T.MOB[k].walk, __T.MOB[k].run, __T.MOB[k].aggr] = window.__SP[k]; for (const f of __T.foxes) f.gone = true; });
  // ---------- ⑬ 사망 → 무덤 → 제자리 부활 · 마을 부활
  const de = await p.evaluate(async () => { const T = __T, H = T.hero, wait = ms => new Promise(r => setTimeout(r, ms)); for (const f of T.foxes) f.gone = true; await wait(100); T.GOD_INV = false; H.hp = 1; T.HURT_(99999, null, 'melee'); await wait(200);
    const d1 = { dead: !!T.DEATH, z: T.ISLE && T.ISLE.id, ui: !!document.getElementById('death-town') && !document.getElementById('death-town').closest('[hidden]') }; const p0 = [H.i, H.j]; __FG.reviveHere('테스트');
    const d2 = { dead: !!T.DEATH, z: T.ISLE && T.ISLE.id, same: H.i === p0[0] && H.j === p0[1], hp: H.hp > 0 }; await wait(150); H.hp = 1; T.HURT_(99999, null, 'melee'); await wait(200); return { d1, d2, d3: !!T.DEATH }; });
  await p.click('#death-town').catch(() => {}); await p.waitForTimeout(800); const de2 = await p.evaluate(() => ({ scene: __T.SCENE, dead: !!__T.DEATH })); await p.evaluate(() => { __T.GOD_INV = true; });
  console.log('⑬', JSON.stringify(de), JSON.stringify(de2));
  ok(de.d1.dead && de.d1.z === 25 && de.d1.ui, '⑬ 섬에서 쓰러지면 그 자리에 무덤 (사망 창)'); ok(!de.d2.dead && de.d2.z === 25 && de.d2.same && de.d2.hp, '⑬ 부활 주문서(다른 유저)로 제자리 부활 — 섬에 그대로'); ok(de.d3 && de2.scene === 'town' && !de2.dead, '⑬ 부활이 없으면 [마을에서 부활] → 마을 (막지 않음)');
  // ---------- ⑭ 섬지기: [머무른다] / [섬을 탈출한다] → 마을
  await p.evaluate(z => __T.TOWN.toZone(z), Z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z, Z, { timeout: 60000 }); await p.waitForTimeout(1500);
  const exPos = await p.evaluate(() => { const [i, j] = __FG.FGM.at('exit'); return __T.scr(i + 0.5, j + 0.5); }); await p.mouse.click(exPos[0], exPos[1] - 40);
  await p.waitForFunction(() => !document.getElementById('askwin').hidden, null, { timeout: 15000 }).catch(() => {});
  const ex1 = await p.evaluate(() => ({ vis: !document.getElementById('askwin').hidden, q: document.getElementById('ask-q').textContent, y: document.getElementById('ask-yes').textContent, n: document.getElementById('ask-no').textContent, talk: __T.log.slice(-2).map(x => String(x.t || x)).join(' / ') }));
  await p.screenshot({ path: 'dev/out/forgotten_exit.png' }); await p.click('#ask-no'); await p.waitForTimeout(300);
  const ex2 = await p.evaluate(() => ({ z: __T.ISLE && __T.ISLE.id, y: document.getElementById('ask-yes').textContent, n: document.getElementById('ask-no').textContent }));
  await p.mouse.click(exPos[0], exPos[1] - 40); await p.waitForFunction(() => !document.getElementById('askwin').hidden, null, { timeout: 15000 }).catch(() => {}); await p.click('#ask-yes'); await p.waitForTimeout(800);
  const ex3 = await p.evaluate(() => ({ scene: __T.SCENE, y: document.getElementById('ask-yes').textContent, msg: __T.log.slice(-4).map(x => String(x.t || x)).join(' / ') }));
  console.log('⑭', JSON.stringify(ex1), JSON.stringify(ex2), JSON.stringify(ex3));
  ok(ex1.vis && ex1.y === '섬을 탈출한다' && ex1.n === '머무른다' && /섬지기 로렌/.test(ex1.talk), `⑭ 섬지기 로렌에게 말을 걸면 [섬을 탈출한다]/[머무른다] (${ex1.q})`);
  ok(ex2.z === 25 && ex2.y === '네' && ex2.n === '아니오', '⑭ [머무른다] → 섬에 그대로 · 버튼 글자 원래대로');
  ok(ex3.scene === 'town' && ex3.y === '네' && /빠져나왔습니다/.test(ex3.msg), '⑭ [섬을 탈출한다] → 아덴 마을');
  // ---------- ⑮ 월드맵 도감
  await p.click('#btn-map'); await p.waitForTimeout(400); await p.click('#wm-stage .mk[data-r="forgotten_island"]'); await p.waitForTimeout(600);
  const cx = await p.evaluate(() => { const C = document.getElementById('wm-codex'); return { mobs: [...C.querySelectorAll('.wc-mob b')].map(b => b.textContent), mid: [...C.querySelectorAll('.wc-mob small')].map(s => s.textContent).filter(t => /중간 보스/.test(t)).length, heads: [...C.querySelectorAll('.wc-h')].map(h => h.textContent), items: C.querySelectorAll('.wc-it').length, normRar: [...C.querySelectorAll('.wc-h')].map(h => h.textContent).find(t => /일반 몬스터/.test(t)) || '' }; });
  await p.screenshot({ path: 'dev/out/forgotten_map2.png' }); await p.evaluate(() => { document.getElementById('wmap').hidden = true; });
  console.log('⑮', JSON.stringify(cx));
  ok(cx.mobs.length === 7 && cx.mobs.includes('에이션트 자이언트') && cx.mid >= 1, `⑮ 월드맵 도감: 몹 6종 + 보스 (${cx.mobs.join(', ')})`); ok(!/고급|일반 \d/.test(cx.normRar) && /희귀/.test(cx.normRar) && /영웅/.test(cx.normRar), `⑮ 일반 몬스터 드랍 = 희귀·영웅만 (${cx.normRar})`);
  ok(!errs.length, `페이지 오류 없음 ${errs.slice(0, 3).join(' / ')}`);
  console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exit(fails ? 1 : 0); })();
