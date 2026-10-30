// 마법사 서먼 보스 솔로 시뮬 (dev/runkt.sh 로 서버를 켠 상태에서): node dev/sim/summon_boss_sim.js <cur|A|B|C> <baphomet,kaspar,...> <out.json> [횟수]
// 먼저 python3 dev/mkkt.py && python3 dev/mksim.py
// 마법사 서먼 보스 솔로 시뮬: node wsum_sim.js <scenario> <bosses,comma> <out.json> [trials]
const { chromium } = require('playwright'); const B = require('./pvpbuilds.js');
const [SC, BL, OUT, TR] = process.argv.slice(2); const TRIALS = +(TR || 2);
const SCN = {
  N: {},
  P: { aoeTake: 0.5, mpKeep: 15 },   // N + 보스 범위 기술 소환수 피해 추가 −50% + 공격 마법이 MP 15 남김   // 지금 코드 기본값 그대로 (v189: 1~4 + ① + ②)
  cur: { bossK: 0.5, tank: false, take: 1, lv: 0, hp: 1, dmg: 1, heroLv: false },
  A: { bossK: 1, tank: true, take: 0.5, lv: 0.03, hp: 1, dmg: 1, heroLv: false },
  B: { bossK: 1, tank: true, take: 0.5, lv: 0, hp: 1, dmg: 1, heroLv: false },
  C: { bossK: 0.5, tank: false, take: 1, lv: 0.03, hp: 2, dmg: 1.5, heroLv: true },
};
const BOSS = {
  baphomet: { lv: 40, zone: 8, gear: 'mid', kinds: ['baphomet'] },
  kaspar: { lv: 45, zone: 8, gear: 'mid', kinds: ['kaspar', 'merkyor', 'balthazar', 'sema'] },
  deathknight: { lv: 48, zone: 8, gear: 'high', kinds: ['deathknight'] },
  ice_queen: { lv: 52, zone: 12, gear: 'high', kinds: ['ice_queen'] },
  drake_king: { lv: 55, zone: 17, gear: 'high', kinds: ['drake_king'] },
};
const MID = [['cx_st3', 'weapon', 6], ['leather_helm', 'helm', 4], ['cx_ts1', 'shirt', 4], ['leather_boots', 'boots', 4], ['leather_gloves', 'gloves', 4], ['silver_ring', 'ring1', 0], ['cx_rg3', 'ring2', 0], ['cx_am3', 'amulet', 0], ['cx_be3', 'belt', 0], ['cx_cl3', 'cloak', 4], ['cx_ar3', 'armor', 4]];
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 800, height: 600 } })).newPage(); const errs = []; p.on('pageerror', x => errs.push(String(x).slice(0, 200)));
  await p.goto('http://127.0.0.1:' + (process.env.KT_PORT || 8766) + '/_sim2.html'); await p.waitForSelector('#lg-mode', { state: 'visible', timeout: 60000 }); await p.click('#lg-mode');
  await p.fill('#lg-acc', 'ws' + Date.now() % 1e6 + Math.floor(Math.random() * 99)); await p.fill('#lg-pw', 'abcd'); await p.fill('#lg-pw2', 'abcd'); await p.click('#lg-go');
  await p.waitForSelector('.cs-card[data-cls="wizard"]', { state: 'visible', timeout: 60000 }); await p.click('.cs-card[data-cls="wizard"]'); await p.click('#cs-start');
  await p.waitForSelector('#nm-in', { state: 'visible' }); await p.fill('#nm-in', 'ws' + Date.now() % 1e5); await p.click('#nm-go');
  await p.waitForFunction(() => window.__gameOn && window.__T && __T.SCENE === 'town', null, { timeout: 60000 }); await p.waitForTimeout(500);
  const res = { scenario: SC, cfg: SCN[SC], fights: [] };
  for (const bk of BL.split(',')) { const D = BOSS[bk];
    const setup = await p.evaluate(({ D, SCB, MID, HIGH }) => { const T = __T, H = T.hero, L = D.lv; Object.assign(__S.PET.sumBal, SCB);
      const bag = (D.gear === 'mid' ? MID.map(([id, on, en]) => ({ id, n: 1, on, en })) : HIGH.map(([id, on, en, bl]) => ({ id, n: 1, on, en, blessed: !!bl }))).filter(e => T.ITEMS[e.id]);
      bag.push({ id: 'clear_potion', n: 600 }); const pts = Math.floor(L / 5), bonus = { str: 0, dex: 0, con: 0, int: Math.max(0, pts - 3), wis: 0, cha: Math.min(3, pts) };
      T.INV.load({ bag, bonus }); H.lv = L; H.bonusPts = 0; H.baseHP = Math.round(12 + (L - 1) * 6.5); H.baseMP = Math.round(8 + (L - 1) * 4); T.INV.render();
      for (const id in T.SK) { const k = T.SK[id]; if (k.kind === 'magic' && k.circle * 4 <= L && (!k.cls || k.cls.includes('wizard'))) T.LEARNED.add(id); } T.LEARNED.add('summon');
      for (const id of ['summon', 'disint', 'tornado', 'meteor', 'blizzard', 'fstorm', 'lstorm', 'quake', 'sunburst', 'coc', 'eruption', 'clight', 'farrow', 'fball', 'ebolt']) if (T.LEARNED.has(id)) T.INV.setAutoSk(id, true);
      const A = T.INV.auto('hp'); A.on = true; A.id = 'clear_potion'; A.pct = 55; A.ps = { red_potion: { on: false, pct: 50 }, orange_potion: { on: false, pct: 45 }, clear_potion: { on: true, pct: 55 } };
      T.BUFF.haste1 = 1e6; T.BUFF.haste2 = 1e6; T.BUFF.mana = 1e6; T.BUFF.medit = 1e6; T.BUFF.shieldm = 1e6;
      T.AUTO.setCfg({ retHp: 0, lowPot: false, buy: false, deathBack: false, noBoss: false, aggrFirst: true, loot: false, sell: false, mute: true });
      H.hp = H.max; H.mp = H.maxmp; return { lv: L, hp: H.max, mp: H.maxmp, ac: T.INV.ac(), st: T.INV.stat(), cap: __S.PET.sumCap(), sumKind: null };
    }, { D, SCB: SCN[SC], MID, HIGH: B.wizard.bag });
    for (let trial = 0; trial < TRIALS; trial++) {
      await p.evaluate(z => { if (__T.AUTO.on()) __T.AUTO.toggle(); __T.TOWN.toZone(z); }, D.zone); await p.waitForTimeout(1500);
      const r = await p.evaluate(({ D, bk }) => new Promise(done => { const T = __T, S = __S, H = T.hero, PET = S.PET;
        for (const f of S.foxes) f.gone = true; PET.sumClear('quiet'); H.hp = H.max; H.mp = H.maxmp; T.SKCD && Object.keys(T.SKCD).forEach(k => T.SKCD[k] = 0);
        let casts = 0; const sc0 = PET.sumCast; PET.sumCast(PET.sumCap()); casts = PET.sumLive();
        const ms = []; for (const kind of D.kinds) { let m = null; for (let r = 6; r < 12 && !m; r++) m = S.mkMob(kind, H.i + r, H.j + (ms.length - 1)); if (!m) for (let r = 6; r < 12 && !m; r++) m = S.mkMob(kind, H.i - r, H.j); if (!m) continue; m.home = [m.i, m.j]; m.summoned = true; m.aggro = true; S.foxes.push(m); ms.push(m); }
        const MX = ms.reduce((a, m) => a + m.hp, 0), pot0 = T.INV.count('clear_potion'); if (!T.AUTO.on()) T.AUTO.toggle();
        const t0 = S.time; let minHp = 1, deaths = 0, wasTown = false, sumDeaths = 0, lastLive = PET.sumLive(), sumT = 0;
        const fin = o => { window.__FAST = 0; window.__HOOK = null; done(Object.assign({ boss: bk, t: +(S.time - t0).toFixed(1), deaths, pots: pot0 - T.INV.count('clear_potion'), minHp: +minHp.toFixed(2), casts, sumDeaths, sumUp: +(sumT / Math.max(1, S.time - t0)).toFixed(2), bossLeft: +(ms.reduce((a, m) => a + Math.max(0, m.dead ? 0 : m.hp), 0) / MX).toFixed(2), bossHp: MX, sumDmg: window.__SUMDMG, sumHit: window.__SUMHIT, sumMiss: window.__SUMMISS, tr }, o)); };
        window.__SUMDMG = 0; window.__SUMHIT = 0; window.__SUMMISS = 0; const tr = []; let nt = 0; window.__HOOK = () => { for (const f of S.foxes) if (!ms.includes(f) && !f.gone) f.gone = true; const st = S.STATE; if (S.time - t0 >= nt) { nt += 5; tr.push([Math.round(S.time - t0), Math.round(st.hp), Math.round(st.mp), PET.sumLive(), ms.reduce((a, m) => a + Math.max(0, m.dead ? 0 : m.hp), 0), Math.max(Math.abs(ms[0].i - H.i), Math.abs(ms[0].j - H.j)), ms[0].tgt ? (ms[0].tgt.sum ? 'S' : 'o') : 'H', H.atk ? (H.atk.v || 'a') : '-']); } minHp = Math.min(minHp, st.hp / st.max); const live = PET.sumLive(); if (live < lastLive) sumDeaths += lastLive - live; if (live > lastLive) casts += live - lastLive; lastLive = live; if (live > 0) sumT += 0.05;
          const town = T.SCENE === 'town'; if (town && !wasTown) deaths++; wasTown = town;
          if (town || T.DEATH) return fin({ win: false, died: true });
          if (ms.every(m => m.dead || m.hp <= 0)) return fin({ win: true });
          if (S.time - t0 > 900) return fin({ win: false, timeout: true }); };
        window.__DRAW = 60; window.__FAST = 20; }), { D, bk });
      r.setup = setup; res.fights.push(r); console.log(SC, bk, r.win ? 'W' : 'L', r.t + 's', 'left', r.bossLeft, 'pots', r.pots, 'minHp', r.minHp, 'casts', r.casts, 'sumDeaths', r.sumDeaths, 'sumUp', r.sumUp);
      await p.evaluate(() => { if (__T.AUTO.on()) __T.AUTO.toggle(); const d = document.getElementById('death-town'); if (__T.DEATH && d) d.click(); }).catch(() => {}); await p.waitForTimeout(600); await p.evaluate(() => { if (__T.SCENE !== 'town') __T.TOWN.toZone('town'); }).catch(() => {}); await p.waitForTimeout(800);
    } }
  res.errors = errs.slice(0, 5); require('fs').writeFileSync(OUT, JSON.stringify(res)); if (errs.length) console.log('ERR', errs.slice(0, 3).join(' | ')); await b.close(); })();
