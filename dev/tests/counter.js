// 11/3 자동사냥 [자동 반격] + 반격 우선순위 (잡던 몹 마저 잡고 · 보스 포함 / 보스 제외 / 반격 먼저) · 끄면 봇은 안 노림
//   KT_PORT=8897 bash dev/runkt.sh dev/tests/counter.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
const REF = { lv: 61, fb: { lv: 61, c: 'knight', hp: 778, ac: -127, mr: 85, d: 60, hb: 0.05, cr: 0.12, cp: 11114 } };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 700 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'ctr' }); await p.evaluate(() => { __T.hero.lv = 61; __T.GOD_INV = true; });
  // 설정 창 칸
  const ui = await p.evaluate(() => { __T.AUTO.openSet && __T.AUTO.openSet(); const c = document.querySelector('[data-k="counter"]'), s = document.querySelector('[data-k="counterMode"]'); const r = { c: c && c.checked, s: s && s.value, opts: s ? [...s.options].map(o => o.textContent) : [] }; if (s) { s.value = 'first'; s.dispatchEvent(new Event('change')); r.after = __T.AUTO.conf().counterMode; s.value = 'finish'; s.dispatchEvent(new Event('change')); } return r; });
  console.log('UI', JSON.stringify(ui)); ok(ui.c === true && ui.s === 'finish' && ui.opts.length === 3 && ui.after === 'first', '설정 창: [자동 반격] 켜짐(기본) · 우선순위 3가지(기본 잡던 몹 마저·보스 포함) · 바꾸면 설정에 들어감');
  await p.evaluate(() => __T.TOWN.toZone(23)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 23 && __T.SCENE === 'field', null, { timeout: 60000 }); await p.waitForTimeout(2000);
  await p.evaluate(R => { const T = __T, F = __FB, H = T.hero; F.setRef(R); F.DBG.noEnsure = true; F.DBG.noAI = true; for (const f of F.bots()) f.gone = true;
    const B = F.roster().B; window.__B = F.spawnTest(B.find(x => x.cls === 'knight').uid, H.i + 3, H.j); T.AUTO.setCfg({ lowPot: false, retHp: 0, refillHome: false, sell: false, loot: false, noBoss: false, buyHaste: false, manner: false });
    const ms = T.foxes.filter(f => !f.dead && !f.fb && T.MOB[f.kind] && !T.MOB[f.kind].boss && !T.MOB[f.kind].midb).sort((a, b) => Math.hypot(a.x - H.x, a.z - H.z) - Math.hypot(b.x - H.x, b.z - H.z)); window.__M = ms[0]; window.__M2 = ms[1]; window.__M3 = ms.find(f => Math.max(Math.abs(f.i - H.i), Math.abs(f.j - H.j)) >= 11) || ms[ms.length - 1];
    for (const m of [ms[0], ms[1]]) { m.max = m.hp = 1e7; } window.__BK = Object.keys(T.MOB).find(k => T.MOB[k].boss && !T.MOB[k].dummy); window.__K0 = ms[1].kind;
    if (!T.AUTO.on()) T.AUTO.toggle(); }, REF);
  await p.waitForTimeout(800);
  const run = (name, set) => p.evaluate(async ({ set }) => { const T = __T, H = T.hero, A = window.__B, M = window.__M, M2 = window.__M2, w = ms => new Promise(r => setTimeout(r, ms));
    T.AUTO.setCfg(set.cfg); A.hitMeT = -1e9; A.dead = false; A.gone = false; M.kind = M.kind; M2.kind = window.__K0;
    const tg = set.boss ? M2 : set.far ? window.__M3 : M; if (set.boss) M2.kind = window.__BK; tg.dead = false; tg.hp = tg.max; tg.myDmg = set.fight ? 50 : 0; tg.dmgBy = null; tg.aggro = false; tg.tgt = null; tg.hitMeT = -1e9;
    H.target = tg; if (!set.far) await w(400); A.hitMeT = 1e9; await w(set.far ? 500 : 900); const r = H.target === A ? 'bot' : H.target === tg ? 'mob' : H.target ? 'other' : 'none';
    if (set.kill) { tg.dead = true; tg.hp = 0; await w(900); } const r2 = H.target === A ? 'bot' : H.target === tg ? 'mob' : H.target ? 'other' : 'none'; A.hitMeT = -1e9; M2.kind = window.__K0; return [r, r2]; }, { set });
  const c1 = await run('finish', { cfg: { counter: true, counterMode: 'finish' }, fight: true, kill: true }); console.log('finish 일반', c1);
  ok(c1[0] === 'mob' && c1[1] === 'bot', '잡던 몹 마저 잡고 반격: 때리던 몹은 마저 잡고 → 쓰러지면 봇에게 반격');
  const c2 = await run('finish boss', { cfg: { counter: true, counterMode: 'finish' }, fight: true, boss: true }); console.log('finish 보스', c2); ok(c2[0] === 'mob', '보스몹 포함: 잡던 보스도 마저 잡음');
  const c3 = await run('finishNB boss', { cfg: { counter: true, counterMode: 'finishNB' }, fight: true, boss: true }); console.log('finishNB 보스', c3); ok(c3[0] === 'bot', '보스몹 제외: 보스를 잡던 중이면 바로 반격');
  const c4 = await run('finishNB 일반', { cfg: { counter: true, counterMode: 'finishNB' }, fight: true }); console.log('finishNB 일반', c4); ok(c4[0] === 'mob', '보스몹 제외: 일반 몹은 마저 잡음');
  const c5 = await run('first', { cfg: { counter: true, counterMode: 'first' }, fight: true }); console.log('first', c5); ok(c5[0] === 'bot', '반격 먼저: 잡던 몹이 있어도 바로 반격');
  const c6 = await run('finish walk', { cfg: { counter: true, counterMode: 'finish' }, fight: false, far: true }); console.log('finish 걸어가던 몹', c6); ok(c6[0] === 'bot', '아직 안 때린 몹(걸어가던 중)은 잡던 몹이 아님 → 바로 반격');
  const c7 = await run('off', { cfg: { counter: false, counterMode: 'first' }, fight: true, kill: true }); console.log('off', c7); ok(c7[0] !== 'bot' && c7[1] !== 'bot', '[자동 반격] 끔: 봇이 때려도 봇은 안 노림');
  console.log(errs.slice(0, 3).join('\n') || 'no errors'); ok(!errs.length, '오류 없음'); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
