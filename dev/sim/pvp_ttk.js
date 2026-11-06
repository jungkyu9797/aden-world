// 11/6 PvP '순삭' 측정: 유저(BUILD json 장비·능력치) vs 그 캐릭터를 복사한 라인 봇(기사·요정·법사 · 비율 PCT)
//   물약 없이 서로 SEC초 동안 때림 (둘 다 HP를 크게 늘려서 안 죽게) → 초당 피해(DPS) · 한 대 평균·최대 → 원래 HP로 몇 초 만에 죽는지
//   python3 dev/mkkt.py && python3 dev/mksim.py && BUILD=dev/sim/builds/ref_knight.json COPY=self PCT=0.9 KT_PORT=8899 bash dev/runkt.sh dev/sim/pvp_ttk.js
//   COPY=self(유저 자신을 복사한 봇) · COPY=<json 경로>(다른 캐릭터를 복사한 봇) · CFG='{"..."}' → FBOT.cfg · PVPK=0.6 → (시뮬에서만) 대인전 피해 배율
const { chromium } = require('playwright'); const fs = require('fs');
const REF = JSON.parse(fs.readFileSync(process.env.BUILD, 'utf8')), PCT = +(process.env.PCT || 0.9), SEC = +(process.env.SEC || 40), ZONE = +(process.env.ZONE || 12), N = +(process.env.N || 3);
const COPYREF = process.env.COPY && process.env.COPY !== 'self' ? JSON.parse(fs.readFileSync(process.env.COPY, 'utf8')) : null;
const CLS = ['knight', 'elf', 'wizard'], KN = { knight: '기사', elf: '요정', wizard: '법사' };
async function open(b, cls) { const p = await (await b.newContext({ viewport: { width: 800, height: 600 } })).newPage(); p.on('pageerror', e => console.log('ERR', cls, String(e).slice(0, 200)));
  await p.goto('http://127.0.0.1:' + (process.env.KT_PORT || 8766) + '/_sim2.html'); await p.waitForSelector('#lg-mode', { state: 'visible', timeout: 60000 }); await p.click('#lg-mode');
  await p.fill('#lg-acc', 'tk' + cls[0] + Date.now() % 1e6); await p.fill('#lg-pw', 'abcd'); await p.fill('#lg-pw2', 'abcd'); await p.click('#lg-go');
  await p.waitForSelector(`.cs-card[data-cls="${cls}"]`, { state: 'visible', timeout: 60000 }); await p.click(`.cs-card[data-cls="${cls}"]`); await p.click('#cs-start');
  await p.waitForSelector('#nm-in', { state: 'visible' }); await p.fill('#nm-in', 'tk' + cls.slice(0, 2) + Date.now() % 1e4); await p.click('#nm-go');
  await p.waitForFunction(() => window.__gameOn && window.__T && __T.SCENE === 'town', null, { timeout: 60000 }); await p.waitForTimeout(300);
  await p.evaluate(() => { window.__TK = { REAL: 0,
    setup(R) { const T = __T, H = T.hero, z = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }, miss = [];
      const idOf = nm => Object.keys(T.ITEMS).find(k => T.ITEMS[k].name === nm && !T.ITEMS[k].hidden && T.ITEMS[k].slot) || Object.keys(T.ITEMS).find(k => T.ITEMS[k].name === nm && !T.ITEMS[k].hidden);
      const bag = R.gear.filter(g => g[1] !== 'doll').map(([nm, on, en, bl]) => { const id = idOf(nm); if (!id) miss.push(nm); return { id, n: 1, on, en, blessed: !!bl }; }).filter(e => e.id && T.ITEMS[e.id]);
      for (const [nm, en, bl] of (R.gaho || [])) { const id = Object.keys(T.ITEMS).find(k => T.ITEMS[k].name === nm && T.ITEMS[k].gaho); if (id) bag.push({ id, n: 1, en, blessed: !!bl }); else miss.push(nm); }
      T.INV.load({ bag, bonus: z }); H.lv = R.lv; const st = T.INV.stat(), bonus = {}; for (const k in z) bonus[k] = Math.max(0, R.stats[k] - st[k]); T.INV.load({ bag, bonus }); H.exp = 0; H.bonusPts = 0;
      const dn = R.doll || (R.gear.find(g => g[1] === 'doll') || [])[0]; if (dn) { const did = Object.keys(T.ITEMS).find(k => T.ITEMS[k].name === dn); if (did && window.DCG) { window.DCG.state().cards[did] = 1; window.DCG.setSlot(did); } else miss.push(dn); }
      H.baseHP = 400; H.baseMP = 40; T.INV.render(); H.baseHP += R.hp - H.max; H.baseMP += R.mp - H.maxmp; T.INV.render(); H.hp = H.max; H.mp = H.maxmp; T.wizAutoLearn && T.wizAutoLearn(true);
      for (const id of ['reduction', 'bounce', 'solid', 'counter', 'stun']) if (T.SK[id]) T.LEARNED.add(id);
      try { T.INV.auto('hp').on = false; } catch (e) {} return { lv: H.lv, hp: H.max, mp: H.maxmp, ac: T.INV.ac(), dmg: T.INV.dmg(), cp: T.CP_ ? T.CP_().total : 0, miss }; },
    BUF: 50000, W: null,
    start(bc, pct, sec, pvpk) { const F = __FB, T = __T, H = T.hero, R = F.roster(), D = this; F.DBG.noEnsure = true; for (const f of F.bots()) f.gone = true; for (const m of T.foxes) if (!m.fb && !m.dead) { m.dead = true; m.deadT = -1e9; }
      const b = R.B.find(x => x.cls === bc); b.pct = pct; b.st = null; b.stRef = null; if (!D.base) { D.base = H.baseHP; D.real = H.max; } H.baseHP = D.base + D.BUF; T.INV.render(); H.hp = H.max; H.mp = H.maxmp;
      for (const k in T.BUFF) T.BUFF[k] = 0; for (const k in T.SKCD) delete T.SKCD[k]; H.target = null; H.atk = null; T.GOD_INV = false; T.BUFF.haste1 = 1e7; T.BUFF.haste2 = 1e7;
      const f = F.spawnTest(b.uid, H.i + 3, H.j + 1), real = f.max; if (!D.REAL) { f.max = f.hp = real * 200; if (f.bx) f.bx.potN = 0; } D.potT = 0; D.pl = { red_potion: 0, orange_potion: 100, clear_potion: 100 };
      D.W = { bc, f, real, t0: T.time, sec, pvpk, pH: H.hp, pB: f.hp, dIn: 0, dOut: 0, nIn: 0, nOut: 0, mxIn: 0, mxOut: 0, out: null, info: { blv: f.bot.st.lv, bhp: real, bac: f.bot.st.ac, bmr: f.bot.st.mr, bd: Math.round(f.bot.st.d), bjg: f.bot.st.jg, bcr: f.bot.st.cr, bas: f.bot.st.as } }; return D.W.info; },
    hook() { const D = this, W = D.W; if (!W || W.out) return; const T = __T, H = T.hero, f = W.f;
      if (D.REAL) { const eff = H.hp - (H.max - D.real) ;   // 실제 싸움: 내 HP = 버퍼 뺀 값 · 물약(주홍 70% · 맑은 50% · 1.5초) · 봇은 자기 물약
        if (eff <= 0 || f.dead || f.gone || T.time - W.t0 >= W.sec) { W.out = { t: Math.round(T.time - W.t0), end: eff <= 0 ? 'medead' : f.dead ? 'botdead' : f.gone ? 'recall' : 'time', me: Math.round(Math.max(0, eff) / D.real * 100), bot: Math.round(Math.max(0, f.hp) / W.real * 100), pots: W.pots || 0, meHp: D.real, botHp: W.real, dpsIn: 0, dpsOut: 0, hitIn: 0, hitOut: 0, mxIn: 0, mxOut: 0, ttkMe: 0, ttkBot: 0 }; f.gone = true; H.target = null; T.GOD_INV = true; return; }
        if (T.time >= D.potT && !(T.BUFF.stun > 0)) { const pc = eff / D.real * 100; let id = pc < 50 ? 'clear_potion' : pc < 70 ? 'orange_potion' : null; if (id && !(D.pl[id] > 0)) id = ['clear_potion', 'orange_potion'].find(q => D.pl[q] > 0) || null; if (id) { D.pl[id]--; const r = T.ITEMS[id].heal; H.hp = Math.min(H.max, H.hp + r[0] + Math.floor(Math.random() * (r[1] - r[0] + 1))); D.potT = T.time + 1.5; W.pots = (W.pots || 0) + 1; } }
        if (H.target !== f) H.target = f; if (T.BUFF.stun > 0) return; const busy = id => (T.SKCD[id] || 0) > 0, can = id => T.LEARNED.has(id) && T.SK[id] && !busy(id) && H.mp >= T.SK[id].mp, d = Math.max(Math.abs(f.i - H.i), Math.abs(f.j - H.j));
        for (const id of ['reduction', 'bounce', 'solid', 'counter']) if (T.SK[id] && T.SK[id].buff && !(T.BUFF[T.SK[id].buff] > 0) && can(id)) { T.castSkill(id); return; } if (d <= 1 && can('stun')) T.castSkill('stun', f); return; }
      // 시뮬 전용 대인전 피해 배율: 이번 스텝에 줄어든 HP를 배율만큼만 남기고 되돌림
      const dh = W.pH - H.hp, db = W.pB - f.hp;
      if (dh > 0) { const k = W.pvpk || 1, real = dh * k; if (k !== 1) H.hp = W.pH - real; W.dIn += real; W.nIn++; W.mxIn = Math.max(W.mxIn, real); }
      if (db > 0) { const k = W.pvpk || 1, real = db * k; if (k !== 1) f.hp = W.pB - real; W.dOut += real; W.nOut++; W.mxOut = Math.max(W.mxOut, real); }
      W.pH = H.hp; W.pB = f.hp;
      if (T.time - W.t0 >= W.sec || f.dead || f.gone || T.DEATH) { const t = T.time - W.t0, dpsIn = W.dIn / t, dpsOut = W.dOut / t;
        W.out = { t: Math.round(t), end: f.dead ? 'botdead' : f.gone ? 'gone' : T.DEATH ? 'medead' : 'time', dpsIn: +dpsIn.toFixed(1), dpsOut: +dpsOut.toFixed(1), hitIn: Math.round(W.dIn / Math.max(1, W.nIn)), hitOut: Math.round(W.dOut / Math.max(1, W.nOut)), mxIn: Math.round(W.mxIn), mxOut: Math.round(W.mxOut),
          ttkMe: +(D.real / Math.max(0.01, dpsIn)).toFixed(1), ttkBot: +(W.real / Math.max(0.01, dpsOut)).toFixed(1), meHp: D.real, botHp: W.real };
        f.gone = true; H.target = null; T.GOD_INV = true; return; }
      if (H.target !== f) H.target = f; if (T.BUFF.stun > 0) return;
      const busy = id => (T.SKCD[id] || 0) > 0 || (T.SK[id].kind === 'magic' && (T.SKCD._mag || 0) > 0), can = id => T.LEARNED.has(id) && T.SK[id] && !busy(id) && H.mp >= T.SK[id].mp, d = Math.max(Math.abs(f.i - H.i), Math.abs(f.j - H.j));
      if (T.CLASS_ === 'knight' || !T.CLASS_) { for (const id of ['reduction', 'bounce', 'solid', 'counter']) if (T.SK[id] && T.SK[id].buff && !(T.BUFF[T.SK[id].buff] > 0) && can(id)) { T.castSkill(id); return; } if (d <= 1 && can('stun')) T.castSkill('stun', f); } } };
    window.__HOOK = () => window.__TK.hook(); });
  return p; }
(async () => { const b = await chromium.launch(); const p = await open(b, REF.cls || 'knight');
  const me = await p.evaluate(R => __TK.setup(R), REF); console.log('유저', JSON.stringify(me));
  let copy;
  if (COPYREF) { const q = await open(b, COPYREF.cls || 'knight'); await q.evaluate(R => __TK.setup(R), COPYREF); await q.waitForTimeout(2500); copy = await q.evaluate(() => __FB.mine()); await q.close(); }
  else { await p.waitForTimeout(2500); copy = await p.evaluate(() => __FB.mine()); }
  console.log('봇 기준(복사)', JSON.stringify({ c: copy.c, lv: copy.lv, cb: copy.cb }));
  await p.evaluate(([copy, CFG, Z]) => { if (CFG) __FB.cfg(CFG); __FB.setRef({ copy }); __T.GOD_INV = true; __T.TOWN.toZone(Z); }, [copy, process.env.CFG ? JSON.parse(process.env.CFG) : null, ZONE]);
  await p.waitForTimeout(3000); await p.evaluate(F_ => { window.__DRAW = 40; window.__FAST = +(F_ || 40); }, +(process.env.FAST || 40));
  await p.evaluate(R => { __TK.REAL = R; }, +(process.env.REAL || 0)); const rows = [];
  for (const bc of CLS) { const acc = []; let info = null;
    for (let k = 0; k < N; k++) { info = await p.evaluate(([bc, pct, sec, k]) => __TK.start(bc, pct, sec, k), [bc, PCT, SEC, +(process.env.PVPK || 1)]);
      await p.waitForFunction(() => __TK.W && __TK.W.out, null, { timeout: 180000, polling: 200 }); acc.push(await p.evaluate(() => __TK.W.out)); }
    const avg = k => +(acc.reduce((a, o) => a + o[k], 0) / acc.length).toFixed(1), mx = k => Math.max(...acc.map(o => o[k]));
    if (+(process.env.REAL || 0)) { const cnt = k => acc.filter(o => o.end === k).length, row = { 봇: KN[bc], 봇HP: info.bhp, 내HP: acc[0].meHp, 내승: cnt('botdead'), 봇승: cnt('medead'), 봇귀환: cnt('recall'), 시간끝: cnt('time'), '평균 초': +(acc.reduce((a, o) => a + o.t, 0) / acc.length).toFixed(0), '끝날 때 내HP%': acc.map(o => o.me).join('/'), '봇HP%': acc.map(o => o.bot).join('/'), 내물약: acc.map(o => o.pots).join('/') }; rows.push(row); console.log(JSON.stringify(row)); continue; }
    const row = { 봇: KN[bc], 봇Lv: info.blv, 봇HP: info.bhp, 봇AC: info.bac, 봇평균피해: info.bd, 봇심판: info.bjg, 내HP: acc[0].meHp, '봇→나 초당': avg('dpsIn'), '봇→나 한대': avg('hitIn'), '봇→나 최대': mx('mxIn'), '나 죽는 초(물약X)': avg('ttkMe'),
      '나→봇 초당': avg('dpsOut'), '나→봇 한대': avg('hitOut'), '나→봇 최대': mx('mxOut'), '봇 죽는 초(물약X)': avg('ttkBot'), 끝: acc.map(o => o.end).join('/') };
    rows.push(row); console.log(JSON.stringify(row)); }
  fs.writeFileSync('dev/out/pvp_ttk.json', JSON.stringify({ me, copy: { c: copy.c, lv: copy.lv, cb: copy.cb }, PCT, PVPK: +(process.env.PVPK || 1), rows }, null, 1));
  await b.close(); })();
