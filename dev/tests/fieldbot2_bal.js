// 11/1 밸런스 시뮬: 보통 유저(그 사냥터 권장 레벨 · 평범한 장비) vs 라인 봇 1:1 — 실제 게임 코드를 빠르게 돌림 (_sim2.html)
// python3 dev/mkkt.py && python3 dev/mksim.py && KT_PORT=8785 bash dev/runkt.sh dev/tests/fieldbot2_bal.js
//   LV=47(오렌설원 2구역 45~50) · N=판 수 · COPY=ord(봇 기준 캐릭터 = 같은 평범한 장비 → 같은 급의 봇) / high(기준 = 영웅급 +5~7 Lv55 기사 dev/sim/pvpbuilds.js)
//   CFG='{"SPK":1.2}' → FBOT.cfg로 봇 값 바꿔서 비교
// 유저: 레벨 L · 그 직업 중간 등급 장비 +4(축복·장신구 없음) · 주 능력치 18 + 레벨 보너스 · 레벨 HP/MP 평균 · 물약 HP 65/50/35%에 빨강/주홍/맑은(1.5초) · 대상 자동 공격
//   물약은 봇과 비슷하게 55개(빨강 19 · 주홍 19 · 맑은 17 · 다 떨어지면 없음)
//   기사: 리덕션·바운스·솔리드·카운터 유지 + 붙으면 스턴 · 법사: 콘·이럽·선버·디스(재사용·MP 그대로) · 요정: 트리플 애로우 — 도망·귀환 없음
// 봇: 같은 레벨(기준 레벨 × 비율 = L)의 라인 봇 (2단계 ① 전부: 버프·스턴·마법·물약·귀환/끝까지)
const { chromium } = require('playwright'); const PB = require('../sim/pvpbuilds.js');
const L = +(process.env.LV || 47), N = +(process.env.N || 12), CFG = process.env.CFG ? JSON.parse(process.env.CFG) : null, COPY = process.env.COPY || 'ord', ZONE = +(process.env.ZONE || 12);
const CLS = ['knight', 'elf', 'wizard'], KN = { knight: '기사', elf: '요정', wizard: '법사' };
async function open(b, cls) { const p = await (await b.newContext({ viewport: { width: 800, height: 600 } })).newPage(); p.on('pageerror', e => console.log('ERR', cls, String(e).slice(0, 200)));
  await p.goto('http://127.0.0.1:' + (process.env.KT_PORT || 8766) + '/_sim2.html'); await p.waitForSelector('#lg-mode', { state: 'visible', timeout: 60000 }); await p.click('#lg-mode');
  await p.fill('#lg-acc', 'bal' + cls[0] + Date.now() % 1e6); await p.fill('#lg-pw', 'abcd'); await p.fill('#lg-pw2', 'abcd'); await p.click('#lg-go');
  await p.waitForSelector(`.cs-card[data-cls="${cls}"]`, { state: 'visible', timeout: 60000 }); await p.click(`.cs-card[data-cls="${cls}"]`); await p.click('#cs-start');
  await p.waitForSelector('#nm-in', { state: 'visible' }); await p.fill('#nm-in', 'bal' + cls.slice(0, 2) + Date.now() % 1e4); await p.click('#nm-go');
  await p.waitForFunction(() => window.__gameOn && window.__T && __T.SCENE === 'town', null, { timeout: 60000 }); await p.waitForTimeout(300);
  await p.evaluate(() => { window.__DUEL = {
    // 평범한 장비: 수호탑 봇 장비표(TWM GEAR)의 가운데 등급 · +4 · 축복 없음 · 장신구 없음
    setup(cls, L, high) { const T = __T, H = T.hero, MAIN = { knight: 'str', elf: 'dex', wizard: 'int' }[cls], z = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }, CD = T.CLS_DEF[cls];
      let bag; if (high) bag = high.bag.map(([id, on, en, bl]) => ({ id, n: 1, on, en, blessed: !!bl })).filter(e => T.ITEMS[e.id]); else { const g = __TW.kit.gearOf({ cls, pct: 0.85, lk: 0 }); bag = Object.entries(g).map(([on, id]) => ({ id, n: 1, on, en: 4 })); }
      T.INV.load({ bag, bonus: z }); const st = T.INV.stat(), bonus = Object.assign({}, z); bonus[MAIN] = high ? 11 : Math.max(0, 18 - st[MAIN]) + Math.floor(L / 5); T.INV.load({ bag, bonus });
      H.lv = L; H.baseHP = Math.round(CD.hp + (L - 1) * (CD.hpLv[0] + CD.hpLv[1]) / 2); H.baseMP = Math.round(CD.mp + (L - 1) * (CD.mpLv[0] + CD.mpLv[1]) / 2); T.INV.render(); H.hp = H.max; H.mp = H.maxmp; T.wizAutoLearn(true);
      return { lv: H.lv, hp: H.max, mp: H.maxmp, ac: T.INV.ac(), mr: Math.round(T.MRT_), bag: bag.map(e => e.id + '+' + e.en).join(' '), cp: T.CP_().total }; },
    W: null, BUF: 10000, PN: [19, 19, 17],   // 유저 물약 55개 (봇 30~80개의 가운데 · 35/35/30)
    start(cls, bc, pct) { const F = __FB, T = __T, H = T.hero, R = F.roster(), D = this; F.DBG.noEnsure = true; for (const f of F.bots()) f.gone = true; for (const m of T.foxes) if (!m.fb && !m.dead) { m.dead = true; m.deadT = -1e9; }
      const b = R.B.find(x => x.cls === bc); b.pct = pct; b.st = null; b.stRef = null; if (!D.base) D.base = H.baseHP; H.baseHP = D.base + D.BUF; T.INV.render(); H.hp = H.max; H.mp = H.maxmp;
      for (const k in T.BUFF) T.BUFF[k] = 0; for (const k in T.SKCD) delete T.SKCD[k]; H.target = null; H.atk = null; T.GOD_INV = false;
      const f = F.spawnTest(b.uid, H.i + 4, H.j + 1); D.W = { cls, f, t0: T.time, res: null, potT: 0, pots: 0, pl: { red_potion: D.PN[0], orange_potion: D.PN[1], clear_potion: D.PN[2] }, real: H.max - D.BUF, st0: Object.assign({}, F.stat(), { pot: F.stat().pot.slice() }) }; return { blv: f.bot.st.lv, bhp: f.max, bac: f.bot.st.ac, bmr: f.bot.st.mr, bd: Math.round(f.bot.st.d) }; },
    end(res) { const D = this, W = D.W, T = __T, f = W.f, S = __FB.stat(); W.res = res; W.out = { res, t: Math.round(T.time - W.t0), me: Math.round((T.hero.hp - D.BUF) / W.real * 100), bot: Math.round(f.hp / f.max * 100), pots: W.pots, bpot: S.pot.reduce((a, x) => a + x, 0) - W.st0.pot.reduce((a, x) => a + x, 0), stun: S.stun - W.st0.stun };
      f.gone = true; T.hero.target = null; T.GOD_INV = true; },
    hook() { const D = this, W = D.W; if (!W || W.res) return; const T = __T, H = T.hero, f = W.f, eff = H.hp - D.BUF;
      if (window.__TR && (W.trT = (W.trT || 0) + 0.05) >= 2) { W.trT = 0; const X = f.bx || {}; window.__TR.push([Math.round(T.time - W.t0), Math.round(eff), Math.round(f.hp), X.tgt === H ? 'T' : X.tgt ? 'o' : '-', X.goal, Math.max(Math.abs(f.i - H.i), Math.abs(f.j - H.j)), +(f.stunT || 0).toFixed(1), +(T.BUFF.stun || 0).toFixed(1), X.potN, f.t, +(X.cd || 0).toFixed(2)]); }
      if (eff <= 0 || T.DEATH) return D.end('bot'); if (f.dead) return D.end('me'); if (f.gone) return D.end('recall'); if (T.time - W.t0 > 150) return D.end('draw');
      if (T.time >= W.potT && !(T.BUFF.stun > 0)) { const pc = eff / W.real * 100; let id = pc < 35 ? 'clear_potion' : pc < 50 ? 'orange_potion' : pc < 65 ? 'red_potion' : null; if (id && !(W.pl[id] > 0)) id = ['clear_potion', 'orange_potion', 'red_potion'].find(q => W.pl[q] > 0) || null; if (id) { W.pl[id]--; const r = T.ITEMS[id].heal; H.hp = Math.min(H.max, H.hp + r[0] + Math.floor(Math.random() * (r[1] - r[0] + 1))); W.potT = T.time + 1.5; W.pots++; } }
      if (H.target !== f) H.target = f; if (T.BUFF.stun > 0) return;
      const busy = id => (T.SKCD[id] || 0) > 0 || (T.SK[id].kind === 'magic' && (T.SKCD._mag || 0) > 0), can = id => T.LEARNED.has(id) && !busy(id) && H.mp >= T.SK[id].mp, d = Math.max(Math.abs(f.i - H.i), Math.abs(f.j - H.j));
      if (W.cls === 'knight') { for (const id of ['reduction', 'bounce', 'solid', 'counter']) if (!(T.BUFF[T.SK[id].buff] > 0) && can(id)) { T.castSkill(id); return; } if (d <= 1 && can('stun')) T.castSkill('stun', f); }
      else if (W.cls === 'wizard') { if (d <= 7) { const Lq = ['coc', 'eruption', 'sunburst', 'disint'].filter(can); if (Lq.length) T.castSkill(Lq[Math.floor(Math.random() * Lq.length)], f); } }
      else if (d <= 8 && can('triple_arrow')) T.castSkill('triple_arrow', f); } };
    window.__HOOK = () => window.__DUEL.hook(); });
  return p; }
(async () => { const b = await chromium.launch(); const t0 = Date.now(); const pages = {}; for (const c of CLS) pages[c] = await open(b, c);
  // 봇 기준 캐릭터 사진 (기사): ord = 같은 평범한 장비 Lv(L/0.9) · high = 영웅급 Lv55 · 봇 비율 = L / 기준 레벨 → 봇 레벨 L
  const kp = pages.knight, LC = COPY === 'high' ? 55 : Math.round(L / 0.9);
  const cinfo = await kp.evaluate(([LC, high]) => __DUEL.setup('knight', LC, high), [LC, COPY === 'high' ? PB.knight : null]); const copy = await kp.evaluate(() => __FB.mine());
  console.log(`기준 캐릭터(${COPY}) 기사 Lv${LC}`, JSON.stringify(cinfo), 'cb', JSON.stringify(copy.cb));
  const rows = [];
  for (const pc of CLS) { const p = pages[pc]; if (process.env.ONLY && !process.env.ONLY.startsWith(pc + ':')) continue;
    const info = await p.evaluate(([cls, L, copy, CFG, Z]) => { if (CFG) __FB.cfg(CFG); __FB.setRef({ copy }); const r = __DUEL.setup(cls, L); __T.GOD_INV = true; __T.BUFF.invis = 0; __T.TOWN.toZone(Z); return r; }, [pc, L, copy, CFG, ZONE]);
    await p.waitForTimeout(3000); await p.evaluate(() => { window.__DRAW = 40; window.__FAST = 40; });
    console.log(`유저 ${KN[pc]} Lv${L}`, JSON.stringify(info));
    for (const bc of CLS) { if (process.env.ONLY && process.env.ONLY !== pc + ':' + bc) continue; const R = { me: 0, bot: 0, recall: 0, draw: 0, t: 0, stun: 0, pots: 0, bpot: 0 }; let binfo = null;
      for (let k = 0; k < N; k++) { if (process.env.TRACE) await p.evaluate(() => { window.__TR = []; }); binfo = await p.evaluate(([pc, bc, pct]) => __DUEL.start(pc, bc, pct), [pc, bc, L / LC]);
        await p.waitForFunction(() => __DUEL.W && __DUEL.W.res, null, { timeout: 180000, polling: 200 }); const o = await p.evaluate(() => __DUEL.W.out); if (process.env.TRACE) console.log('trace', JSON.stringify(o), JSON.stringify(await p.evaluate(() => window.__TR))); R[o.res]++; R.t += o.t; R.stun += o.stun; R.pots += o.pots; R.bpot += o.bpot; }
      const row = { 유저: KN[pc], 봇: KN[bc], 봇승: R.bot, 유저승: R.me, 봇귀환: R.recall, 무: R.draw, 봇승률: Math.round(R.bot / N * 100) + '%', 평균초: Math.round(R.t / N), 봇스턴: R.stun, 유저물약: Math.round(R.pots / N), 봇물약: Math.round(R.bpot / N), 봇능력: `Lv${binfo.blv} HP${binfo.bhp} AC${binfo.bac} MR${binfo.bmr} D${binfo.bd}` };
      rows.push(row); console.log(JSON.stringify(row)); }
    await p.evaluate(() => { window.__FAST = 0; }); }
  const tot = rows.reduce((a, r) => (a.b += r.봇승, a.n += N, a), { b: 0, n: 0 }); console.log(`전체 봇 승률 ${Math.round(tot.b / tot.n * 100)}% (${tot.b}/${tot.n}) · ${Math.round((Date.now() - t0) / 1000)}초`);
  await b.close(); })();
