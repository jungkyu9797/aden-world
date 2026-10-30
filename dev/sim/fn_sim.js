// 화룡의 둥지용 사본: 필드 보스는 치우고(피닉스가 시작 자리에 있으면 사망만 셈) 죽을 때 근처 몬스터·로그 기록
// 10/30: 중간 보스(이프리트, MOB.midb)도 기본으로 치움 (MIDB=1이면 남김) · xp = 실제로 얻은 경험치 합(레벨이 올라도 정확)
//   IFRIT=alone|mix → 이프리트를 영웅 3칸 옆에 놓고 잡을 때까지 (alone: 다른 몹 치움 · mix: 그 구역 몹 그대로) · ifT = 처치까지 걸린 초 · 못 잡으면 ifHp = 남은 HP%
// 사냥터 난이도 배율 시뮬 (실제 게임 코드를 빠르게 돌림): Lv55 기사 영웅급 +5~7 (dev/sim/pvpbuilds.js) · 초록+용기 · 자동 물약 · 자동사냥
// 몬스터 HP·공격을 배율만큼 올린 뒤 지역 N에서 SEC초 사냥 → 처치·물약·사망·경험치
// python3 dev/mkkt.py && python3 dev/mksim.py && bash dev/runkt.sh "dev/sim/zone_scale_sim.js 17 600 1x1,3x3,2x1.5"
const { chromium } = require('playwright'); const B = require('./pvpbuilds.js');
const CLS = process.env.CLS || 'knight'; const REF = process.env.BUILD ? JSON.parse(require('fs').readFileSync(process.env.BUILD, 'utf8')) : null;   // BUILD=dev/sim/builds/ref_knight.json → 장비 이름·능력치·HP를 그대로 맞춤
const ZONE = +(process.argv[2] || 17), SEC = +(process.argv[3] || 600), VARS = (process.argv[4] || '1x1').split(',').map(s => s.split('x').map(Number));   // HP배율x공격배율[x공격속도배율[x개체수 비율]]
(async () => { const b = await chromium.launch(); const errs = []; let p = null;
  const fresh = async () => { if (p) await p.close(); p = await (await b.newContext({ viewport: { width: 800, height: 600 } })).newPage(); p.on('pageerror', x => errs.push(String(x).slice(0, 200)));
  await p.goto('http://127.0.0.1:' + (process.env.KT_PORT || 8766) + '/_sim2.html'); await p.waitForSelector('#lg-mode', { state: 'visible', timeout: 60000 }); await p.click('#lg-mode');
    await p.fill('#lg-acc', 'zs' + Date.now() % 1e6); await p.fill('#lg-pw', 'abcd'); await p.fill('#lg-pw2', 'abcd'); await p.click('#lg-go');
    await p.waitForSelector(`.cs-card[data-cls="${CLS}"]`, { state: 'visible', timeout: 60000 }); await p.click(`.cs-card[data-cls="${CLS}"]`); await p.click('#cs-start');
    await p.waitForSelector('#nm-in', { state: 'visible' }); await p.fill('#nm-in', 'zs' + Date.now() % 1e5); await p.click('#nm-go');
    await p.waitForFunction(() => window.__gameOn && window.__T && __T.SCENE === 'town', null, { timeout: 60000 }); await p.waitForTimeout(500);
  };
  await fresh();
  const base = await p.evaluate(Z => { const M = __T.MOB || __S.MOB, D = __T.DEF ? __T.DEF[Z] : null, o = {}; for (const k in M) o[k] = { hp: M[k].hp, dmg: M[k].dmg && M[k].dmg.slice(), cd: M[k].cd }; return o; }, ZONE);
  const out = [];
  const REP = +(process.argv[5] || 1), CNT = +(process.argv[6] || 1);   // CNT: 그 지역 몬스터 수 배율 (예: 1.5)
  for (const [hk, dk, sk = 1, dens = 1] of VARS) for (let rep = 0; rep < REP; rep++) { if (out.length) await fresh();
    await p.evaluate(({ CNT, D, Z, hk, dk, sk, base, WZ }) => { const T = __T, H = T.hero, M = T.MOB || __S.MOB; if (T.AUTO.on()) T.AUTO.toggle();
      for (const k in base) { if (!M[k] || M[k].boss || !base[k].dmg) continue; M[k].hp = Math.round(base[k].hp * hk); M[k].dmg = base[k].dmg.map(v => Math.round(v * dk)); if (base[k].cd) M[k].cd = +(base[k].cd / sk).toFixed(3); }
      const idOf = nm => Object.keys(T.ITEMS).find(k => T.ITEMS[k].name === nm && !T.ITEMS[k].hidden && T.ITEMS[k].slot) || Object.keys(T.ITEMS).find(k => T.ITEMS[k].name === nm && !T.ITEMS[k].hidden);
      const R = D.ref, miss = []; const bag = (R ? R.gear.map(([nm, on, en, bl]) => { const id = idOf(nm); if (!id) miss.push(nm); return { id, n: 1, on, en, blessed: !!bl }; }) : D.bag.map(([id, on, en, bl]) => ({ id, n: 1, on, en, blessed: !!bl }))).filter(e => e.id && T.ITEMS[e.id]); window.__MISS = miss; bag.push({ id: 'red_potion', n: 3000 }, { id: 'orange_potion', n: 3000 }, { id: 'clear_potion', n: 3000 }, { id: 'return_scroll', n: 20 });
      if (R) { const z = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }; T.INV.load({ bag, bonus: z }); H.lv = R.lv; const st = T.INV.stat(), bonus = {}; for (const k in z) bonus[k] = Math.max(0, R.stats[k] - st[k]); T.INV.load({ bag, bonus }); H.exp = 0; H.bonusPts = 0;
        H.baseHP = 400; H.baseMP = 40; T.INV.render(); H.baseHP += R.hp - H.max; H.baseMP += R.mp - H.maxmp; T.INV.render(); window.__REFCHK = { hp: H.max, mp: H.maxmp, ac: T.INV.ac(), mr: T.INV.cx('mr'), st: T.INV.stat(), bonus, miss }; }
      else { T.INV.load({ bag, bonus: { str: 11, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }); H.lv = D.lv; H.exp = 0; H.bonusPts = 0; H.baseHP = D.hpMax || D.baseHP; H.baseMP = D.mpMax || D.baseMP; T.INV.render(); }
      const A = T.INV.auto('hp'); A.on = true; A.ps = R && R.pots ? Object.fromEntries(Object.entries(R.pots).map(([k, [on, pct]]) => [k, { on, pct }])) : { red_potion: { on: true, pct: 75 }, orange_potion: { on: true, pct: 60 }, clear_potion: { on: true, pct: 45 } };
      if (T.CLASS === 'wizard') { for (const id in T.SK) { const k = T.SK[id]; if (k.kind === 'magic' && k.circle * 4 <= H.lv && (!k.cls || k.cls.includes('wizard'))) T.LEARNED.add(id); } T.LEARNED.add('summon');
        for (const id of (WZ || [])) if (T.LEARNED.has(id)) T.INV.setAutoSk(id, true); T.INV.add('mana_potion', 3000, true); const AM = T.INV.auto('mp'); if (AM) { AM.on = true; AM.id = 'mana_potion'; AM.pct = 40; } T.BUFF.shieldm = 1e7; H.mp = H.maxmp; }
      T.BUFF.haste1 = 1e7; T.BUFF.haste2 = 1e7; H.hp = H.max; T.setCoins(0);
      T.AUTO.setCfg({ retHp: 0, lowPot: false, buy: false, deathBack: true, noBoss: true, aggrFirst: true, loot: false, sell: false, mute: true }); if (CNT !== 1) { const DF = T.ISLAND.def(Z); DF.mobs = DF.mobs.map(([k, n]) => [k, Math.round(n * CNT)]); DF.groups = DF.groups.map(([k, m, n]) => [k, m, Math.round(n * CNT)]); } T.TOWN.toZone(Z); }, { WZ: (process.env.WZ || 'summon,disint,tornado,meteor,blizzard,fstorm,lstorm,quake,sunburst,coc,eruption,clight,farrow,fball,ebolt').split(','), CNT, D: REF ? { ref: REF } : B[CLS], Z: ZONE, hk, dk, sk, base });
    if (REF && !out.length) console.log('build check', JSON.stringify(await p.evaluate(() => window.__REFCHK)));
    await p.waitForTimeout(1500);
    if (CNT > 1) await p.evaluate(CNT => { const T = __T, I = T.ISLE, cnt = {}; for (const f of T.foxes) if (!T.MOB[f.kind].boss) cnt[f.kind] = (cnt[f.kind] || 0) + 1; const have = Object.values(cnt).reduce((a, v) => a + v, 0), want = Object.fromEntries(I.def.mobs.map(([k, n]) => [k, n]));
      if (have >= Math.round(Object.values(want).reduce((a, v) => a + v, 0) * 1.2)) return;   // 이미 늘어난 지역이면 그대로
      for (const k in cnt) for (let q = 0; q < Math.round(cnt[k] * (CNT - 1)); q++) for (let t = 0; t < 300; t++) { const i = 2 + Math.floor(Math.random() * (I.N - 4)), j = 2 + Math.floor(Math.random() * (I.N - 4)); if (I.blocked[j][i] || (I.lava && I.lava.has(j * 1000 + i)) || Math.max(Math.abs(i - T.hero.i), Math.abs(j - T.hero.j)) < 8) continue; const m = T.mkMob(k, i, j); m.home = [i, j]; T.foxes.push(m); break; } }, CNT);
    const r = await p.evaluate(async ({ SEC, dens, STOPD, MIDB, IFR }) => { const nMob = __T.foxes.filter(f => !__T.MOB[f.kind].boss).length; const T = __T, t0 = __S.time, K = {}, pot0 = ['red_potion', 'orange_potion', 'clear_potion'].map(id => T.INV.count(id)); let deaths = 0, wasDead = false, minHp = 1, hpSum = 0, n = 0;
      let XP = 0; const oxp = T.TELE.xp; T.TELE.xp = n => { XP += n; return oxp(n); };
      let IF = null, ifT = null; if (IFR) { const H = T.hero; IF = T.foxes.find(m => m.kind === 'fn_ifrit' && !m.dead && !m.gone); if (!IF) { IF = T.mkMob('fn_ifrit', H.i, H.j); T.foxes.push(IF); } if (IFR === 'alone') for (const f of T.foxes) if (f !== IF) { f.gone = true; f.aggro = false; }
        let at = null; for (let r = 3; r < 8 && !at; r++) for (const [di, dj] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r]]) { const i = H.i + di, j = H.j + dj; if (i > 1 && j > 1 && i < T.ISLE.N - 2 && j < T.ISLE.N - 2 && !T.ISLE.blocked[j][i] && !(T.ISLE.lava && T.ISLE.lava.has(j * 1000 + i))) { at = [i, j]; break; } }
        if (at) { IF.i = IF.fi = at[0]; IF.j = IF.fj = at[1]; IF.x = at[0] + .5; IF.z = at[1] + .5; IF.t = 1; IF.home = at; } IF.aggro = true; }
      window.__HOOK = () => { if (IF && IF.dead && ifT == null) ifT = __S.time - t0; for (const f of T.foxes) if (T.MOB[f.kind] && (T.MOB[f.kind].boss || (T.MOB[f.kind].midb && !MIDB && !IFR)) && !f.gone) { f.gone = true; f.aggro = false; } if (dens < 1) for (const f of T.foxes) { if (f._dz === undefined) f._dz = Math.random() >= dens; if (f._dz && !f.boss) { f.gone = true; f.aggro = false; } } for (const f of T.foxes) if (f.dead && !f._cnt) { f._cnt = 1; K[f.kind] = (K[f.kind] || 0) + 1; } else if (!f.dead && f._cnt) f._cnt = 0;
        const dead = T.hero.hp <= 0; if (dead && !wasDead) { deaths++; (window.__DL = window.__DL || []).push({ t: Math.round(__S.time - t0), log: T.log.slice(-8).map(x => x.t || x.text || x), near: T.foxes.filter(f => !f.dead && Math.max(Math.abs(f.i - T.hero.i), Math.abs(f.j - T.hero.j)) <= 6).map(f => f.kind + ':' + Math.round(f.hp / f.max * 100) + '%') }); } wasDead = dead; const k = T.hero.hp / T.hero.max; if (T.SCENE === 'field') { minHp = Math.min(minHp, k); hpSum += k; n++; } };
      T.AUTO.toggle(); window.__STOPD = STOPD; window.__FAST = 400; window.__DRAW = 0;
      await new Promise(res => { const iv = setInterval(() => { if (__S.time - t0 >= SEC || (window.__STOPD && deaths > 0) || (ifT != null && __S.time - t0 > ifT + 1)) { clearInterval(iv); res(); } }, 50); });
      window.__FAST = 0; window.__HOOK = null; T.TELE.xp = oxp; if (T.AUTO.on()) T.AUTO.toggle();
      const used = ['red_potion', 'orange_potion', 'clear_potion'].map((id, i) => pot0[i] - T.INV.count(id));
      return { sec: Math.round(__S.time - t0), dens, kills: K, total: Object.values(K).reduce((a, v) => a + v, 0), pots: used, deaths, minHp: +minHp.toFixed(2), avgHp: +(hpSum / Math.max(1, n)).toFixed(2), exp: T.hero.exp, xp: XP, lv: T.hero.lv, ...(IFR ? { ifT: ifT == null ? null : Math.round(ifT), ifHp: IF ? Math.round(Math.max(0, IF.hp) / IF.max * 100) : null } : {}), coins: T.coins, dl: window.__DL || [], nMob }; }, { SEC, dens, STOPD: !!process.env.STOPD, MIDB: !!process.env.MIDB, IFR: process.env.IFRIT || '' });
    r.hpX = hk; r.dmgX = dk; r.spdX = sk; r.rep = rep; out.push(r); console.log(JSON.stringify(r));
    await p.evaluate(() => { if (__T.DEATH) { const b = document.getElementById('death-town'); if (b) b.click(); } __T.TOWN.goTown(); }); await p.waitForTimeout(1200); }
  require('fs').writeFileSync('dev/out/zone_scale_sim.json', JSON.stringify(out, null, 1));
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
