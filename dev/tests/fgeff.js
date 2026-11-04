// 11/4 잊혀진 섬 사냥 효율 (실시간): 전투력 약 1만 기사(파티장 · 자동사냥) + 같은 전투력의 파티 봇 3명(기사·요정·법사) · FMIN분
//   FMIN=20 KT_PORT=8897 KT_TO=1800 bash dev/runkt.sh dev/tests/fgeff.js     (1분마다 한 줄 · 끝에 요약 · dev/out/fgeff.json)
//   파티장이 쓰러지면 기록하고 그 자리에서 되살려 계속 (부활 주문서를 쓴 셈) · 파티 봇이 쓰러지면 부활 주문서로 되살림 (개수 셈)
const { chromium } = require('playwright'); const login = require('../tq.js'); const fs = require('fs');
const MIN = +(process.env.FMIN || 20), EN = +(process.env.FEN || 6), WEN = +(process.env.FWEN || 8);
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 600 } }); await p.addInitScript(() => { try { localStorage.setItem('aden_low', '1'); } catch (e) {} });   /* 헤드리스 화면 그리기가 느려서 낮은 그래픽 (게임 시간 기준으로 잼) */ const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'fgE' });
  const setup = await p.evaluate(([EN, WEN]) => { const T = __T, I = T.INV, IT = T.ITEMS, RK = { 일반: 0, 고급: 1, 희귀: 2, 영웅: 3, 전설: 4 };
    document.getElementById('gp-lv').value = 61; document.getElementById('gp-apply').click(); T.GOD_INV = false; T.BUFF.invis = 0;
    for (const k of ['str', 'str', 'str', 'str', 'str', 'con', 'con', 'con', 'con', 'con', 'dex', 'dex']) I.addStat(k);
    const pick = (sl, n = 0) => Object.keys(IT).filter(id => { const d = IT[id]; return d.slot === sl && !d.hidden && d.rar !== '전설' && !d.legend && (!d.cls || d.cls.includes('knight')) && (!d.only || d.only === 'knight') && (d.lv || 0) <= 61; }).sort((a, c) => (RK[IT[c].rar] || 0) - (RK[IT[a].rar] || 0) || (IT[c].lv || 0) - (IT[a].lv || 0) || (a < c ? -1 : 1))[n];
    const wear = (id, set) => { if (!id) return; I.add(id, 1, true); const e = I.bag().filter(x => x.id === id && !x.on).pop(); Object.assign(e, set || {}); I.use(e); };
    for (const e of I.bag().filter(x => x.on)) I.use(e);
    wear(pick('weapon'), { en: WEN }); for (const s of ['armor', 'helm', 'cloak', 'gloves', 'boots', 'shield', 'shirt']) wear(pick(s), { en: EN }); wear(pick('belt')); wear(pick('amulet'), { en: 2 }); wear(pick('ring', 0), { en: 2 }); wear(pick('ring', 1), { en: 2 });
    I.add('orange_potion', 800, true); I.add('clear_potion', 800, true); I.add('revive_scroll', 50, true);
    const A = I.auto('hp'); A.ps.red_potion.on = false; A.ps.orange_potion.on = true; A.ps.orange_potion.pct = 80; A.ps.clear_potion.on = true; A.ps.clear_potion.pct = 60; A.on = true;
    T.hero.hp = T.hero.max; const c = T.CP_(); return { cp: Math.round(c.total || c), hp: T.hero.max, ac: I.ac(), gear: I.bag().filter(x => x.on).map(x => IT[x.id].name + (x.en ? '+' + x.en : '')).join(', ') }; }, [EN, WEN]);
  console.log('파티장', JSON.stringify(setup));
  await p.evaluate(() => __T.TOWN.toZone(25)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 25 && __T.SCENE === 'field', null, { timeout: 90000 }); await p.waitForTimeout(3000);
  const party = await p.evaluate(() => { const T = __T, F = __FB; F.setRef({ copy: F.mine() }); const R = F.roster(), pick = c => R.A.filter(x => !x.pt && x.cls === c && !F.pb.why(x.uid))[0];
    const out = []; for (const c of ['knight', 'elf', 'wizard']) { const x = pick(c); if (!x) { out.push(c + ' 없음'); continue; } x.pct = 1; out.push([x.name, c, F.pb.invite(x.uid)]); } F.pb.cmd('fight');
    const K = window.__K = { kill: 0, drake: 0, boss: 0, by: {} }; setInterval(() => { for (const f of T.foxes) { const S = T.MOB[f.kind]; if (!S || !(S.fgi || /^fg/.test(f.kind))) continue; if (f.dead && !f._k) { f._k = 1; K.kill++; if (S.midb) K.drake++; if (S.boss) K.boss++; K.by[S.name] = (K.by[S.name] || 0) + 1; } else if (!f.dead && f._k) f._k = 0; } }, 200);
    const fr = window.__FR = { n: 0 }; const loop = () => { fr.n++; requestAnimationFrame(loop); }; requestAnimationFrame(loop);
    T.AUTO.setCfg({ loot: true, retHp: 0, lowPot: false, noBoss: false, sell: false, refillHome: false, mute: true }); if (!T.AUTO.on()) T.AUTO.toggle();
    return { out, pb: F.pb.here().map(e => `${e.bot.name}(${e.bot.cls}) Lv${e.bot.st.lv} HP${e.max} 투력${F.pb.cp(e.uid)}`), copyCp: F.ref().cp }; });
  console.log('파티 봇', JSON.stringify(party));
  const snap = () => p.evaluate(() => { const T = __T, H = T.hero, I = T.INV, F = __FB; let tot = 0; for (let l = 1; l < H.lv; l++) tot += T.needExp(l); tot += H.exp;
    const bag = {}; for (const e of I.bag()) bag[e.id] = (bag[e.id] || 0) + (e.n || 1);
    return { t: T.time, lv: H.lv, exp: tot, coins: T.coins, bag, hp: H.hp, max: H.max, dead: !!T.DEATH, auto: T.AUTO.on(), z: T.ISLE && T.ISLE.id, K: JSON.parse(JSON.stringify(window.__K)), fr: window.__FR.n, pb: F.pb.here().map(e => [e.bot.name, Math.round(100 * Math.max(0, e.hp) / e.max), e.dead ? 1 : 0]), ground: T.GROUND.here().length }; });
  const s0 = await snap(), rows = []; let hDead = 0, pbRev = 0, minHp = 100, pbMin = 100, lastFr = s0.fr, lastT = s0.t, wall0 = Date.now();
  let m = 1; while (m <= MIN && Date.now() - wall0 < 50 * 60e3) {
    for (;;) { await p.waitForTimeout(5000);
      const st = await p.evaluate(() => { const T = __T, F = __FB, H = T.hero, r = { dead: !!T.DEATH, hp: Math.round(100 * H.hp / H.max), pbd: 0, pbm: 100 }; for (const e of F.pb.here()) { if (e.dead) r.pbd++; else r.pbm = Math.min(r.pbm, Math.round(100 * e.hp / e.max)); } if (r.pbd && T.INV.count('revive_scroll') > 0) r.rev = F.pbRevive() ? 1 : 0;
        if (r.dead) { try { T.reviveHere_('시험', true); } catch (e) { r.err = String(e); } if (!T.AUTO.on()) T.AUTO.toggle(); } if (T.SCENE === 'town' || !T.ISLE || T.ISLE.id !== 25) { r.out = 1; T.TOWN.toZone(25); } return r; });
      if (st.dead) hDead++; if (st.rev) pbRev++; if (!st.dead) minHp = Math.min(minHp, st.hp); pbMin = Math.min(pbMin, st.pbm); if (st.out) console.log('  (섬 밖으로 나가 있어서 다시 들어감)');
      const gt = await p.evaluate(() => __T.time); if (gt - s0.t >= m * 60 || Date.now() - wall0 > 50 * 60e3) break; }
    const s = await snap(), gs = s.t - s0.t, fps = Math.round((s.fr - lastFr) / Math.max(1, (s.t - lastT))); lastFr = s.fr; lastT = s.t;
    const row = { 분: m, 게임초: Math.round(gs), 처치: s.K.kill, 드레이크: s.K.drake, 보스: s.K.boss, 경험치: s.exp - s0.exp, 골드: s.coins - s0.coins, Lv: s.lv, 파티장죽음: hDead, 봇부활: pbRev, 최저HP: minHp, 봇최저HP: pbMin, fps, 봇: s.pb.map(x => x[0] + ' ' + x[1] + '%' + (x[2] ? '(죽음)' : '')).join(' / ') };
    rows.push(row); console.log(JSON.stringify(row)); m++; }
  const sE = await snap(), gsec = sE.t - s0.t, wall = (Date.now() - wall0) / 1000, used = id => (s0.bag[id] || 0) - (sE.bag[id] || 0), got = {};
  for (const id in sE.bag) { const d = (sE.bag[id] || 0) - (s0.bag[id] || 0); if (d > 0 && !/potion|revive/.test(id)) got[id] = d; }
  const items = await p.evaluate(got => Object.entries(got).map(([id, n]) => `${__T.ITEMS[id] ? __T.ITEMS[id].name : id}(${__T.ITEMS[id] ? __T.ITEMS[id].rar || '' : ''}) ×${n}`), got);
  const sum = { 파티장: setup, 파티봇: party.pb, 실제초: Math.round(wall), 게임초: Math.round(gsec), 처치: sE.K.kill, 종류별: sE.K.by, 경험치: sE.exp - s0.exp, 골드: sE.coins - s0.coins, 레벨: [s0.lv, sE.lv], 주홍물약: used('orange_potion'), 맑은물약: used('clear_potion'), 부활주문서: used('revive_scroll'), 파티장죽음: hDead, 봇부활: pbRev, 최저HP: minHp, 봇최저HP: pbMin, 아이템: items, 바닥에남음: sE.ground, 오류: errs.slice(0, 3) };
  fs.writeFileSync('dev/out/fgeff.json', JSON.stringify({ sum, rows }, null, 1)); console.log('요약 ' + JSON.stringify(sum)); await b.close(); })();
