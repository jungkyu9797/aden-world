// 11/6 아덴감옥(처음 이름 기란감옥 · 지역 26·27): 입장·미로·몹 · 산적 → 악령(40%) · 턴 언데드 · 악령 → 산적으로 다시 태어남 · 드래곤의 진주 · 2층 · 클라인 광폭화 → 파우스트 · 하루 4시간
// KT_PORT=8895 bash dev/runkt.sh dev/tests/giran.js  (입장은 마을 간수 NPC로만 — 여기서는 내부 toField로 바로 · NPC 입장은 dev/tests/adenprison.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'wizard', name: 'gpT' });
  await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 58; __T.TOWN.toField('아덴감옥'); }); await p.waitForTimeout(3000);
  const a = await p.evaluate(() => { const T = __T, z = T.ISLE, cnt = {}; for (const f of z.mobs) cnt[f.kind] = (cnt[f.kind] || 0) + 1; const t = document.getElementById('gp-timer');
    return { id: z.id, name: z.name, N: z.N, maze: !!z.def.maze, cnt, n: z.mobs.length, stairs: z.portals.map(q => q.label), timer: !t.hidden && t.textContent, left: T.GPR_.left() }; });
  console.log('enter', JSON.stringify(a));
  ok('1층 입장 (미로 · 계단 · 마을 포털)', a.id === 26 && a.maze && a.stairs.some(s => /2층/.test(s)) && a.stairs.some(s => /마을/.test(s)));
  ok('몹 개체 수 (잊섬 수준 50마리 이상 · 3종)', a.n >= 50 && a.cnt.gp_bandit > 0 && a.cnt.gp_archer > 0 && a.cnt.gp_chief > 0);
  ok('남은 시간 표시 (6시간)', /아덴감옥 남은 시간 5시간 59분/.test(a.timer || '') && a.left > 6 * 3600 - 30);
  await p.waitForTimeout(400); await p.screenshot({ path: 'dev/out/giran_1f.png' });
  // 산적 쓰러뜨리기 → 20% 확률을 강제로 → 악령
  const g = await p.evaluate(async () => { const T = __T, H = T.hero; let m = T.foxes.find(f => f.kind === 'gp_bandit' && !f.dead); const uid = m.uid; const R0 = Math.random; Math.random = () => 0.05; try { m.hp = 1; T.strike ? (H.target = m) : 0; m.hp = 0; T.killCheck(m); } finally { Math.random = R0; }
    const was = { dead: m.dead, rise: !!m.gpRise }; await new Promise(r => setTimeout(r, 2600)); return { was, kind: m.kind, dead: m.dead, uid: m.uid === uid, base: m.gpBase, undead: !!T.MOB[m.kind].undead, hp: m.hp, max: m.max }; });
  console.log('ghost', JSON.stringify(g)); ok('산적 → 그 자리에서 파우스트의 악령 (같은 칸 · 언데드 · HP 절반 수준)', g.was.dead && g.was.rise && g.kind === 'gp_ghost' && !g.dead && g.uid && g.base === 'gp_bandit' && g.undead && g.max < 1400);
  // 확률이 안 걸리면 그냥 산적으로 다시 태어남
  const g2 = await p.evaluate(() => { const T = __T, m = T.foxes.find(f => f.kind === 'gp_archer' && !f.dead); const R0 = Math.random; Math.random = () => 0.9; try { m.hp = 0; T.killCheck(m); } finally { Math.random = R0; } return { rise: !!m.gpRise }; });
  ok('확률이 안 걸리면 악령 없음', !g2.rise);
  // 11/6 프로듀서: 악령 변신 40% (0.39 → 변신 · 0.41 → 안 변신)
  const g3 = await p.evaluate(() => { const T = __T, r = []; for (const v of [0.39, 0.41]) { const m = T.foxes.find(f => (f.kind === 'gp_bandit' || f.kind === 'gp_chief') && !f.dead); const R0 = Math.random; Math.random = () => v; try { m.hp = 0; T.killCheck(m); } finally { Math.random = R0; } r.push(!!m.gpRise); } return r; });
  ok('악령 변신 확률 40% (0.39 변신 · 0.41 안 변신)', g3[0] === true && g3[1] === false);
  // 턴 언데드
  const tu = await p.evaluate(async () => { const T = __T, H = T.hero, m = T.foxes.find(f => f.kind === 'gp_ghost' && !f.dead); T.LEARNED.add('turnund'); H.mp = H.maxmp = 999; H.i = m.i + 1; H.j = m.j; H.x = H.i + 0.5; H.z = H.j + 0.5;
    let tries = 0; while (!m.dead && tries < 30) { H.target = m; for (const k in T.SKCD) T.SKCD[k] = 0; H.mp = 999; T.castSkill('turnund'); await new Promise(r => setTimeout(r, 120)); tries++; }
    return { dead: m.dead, tries, log: T.log.slice(-4).map(x => x.t) }; });
  console.log('turn', JSON.stringify(tu)); ok('파우스트의 악령은 턴 언데드로 쓰러짐', tu.dead);
  const back = await p.evaluate(async () => { const T = __T, m = T.foxes.find(f => f.gpBase === 'gp_bandit'); if (!m) return null; m.deadT = 99; await new Promise(r => setTimeout(r, 400)); return { kind: m.kind, dead: m.dead, base: m.gpBase }; });
  console.log('back', JSON.stringify(back)); ok('악령이 쓰러진 자리는 원래 산적으로 다시 태어남 (개체 수 그대로)', back && back.kind === 'gp_bandit' && !back.dead && !back.base);
  // 드래곤의 진주
  const pr = await p.evaluate(async () => { const T = __T; T.INV.add('dragon_pearl', 2); const e = T.INV.bag().find(x => x.id === 'dragon_pearl'); T.INV.use(e); await new Promise(r => setTimeout(r, 300));
    return { buff: T.BUFF.pearl, n: T.INV.count('dragon_pearl'), drop: T.MOB_DROPS.gp_ghost, name: T.ITEMS.dragon_pearl.name, icon: !!T.CXI.dragon_pearl }; });
  console.log('pearl', JSON.stringify(pr)); ok('드래곤의 진주(3단 가속): 10분 3단 가속 · 1개 소모 · 악령 드랍 10%', pr.buff > 590 && pr.n === 1 && pr.drop[0][0] === 'dragon_pearl' && pr.drop[0][1] === 0.1 && pr.name === '드래곤의 진주(3단 가속)' && pr.icon);
  // 2층
  await p.evaluate(() => __T.TOWN.toZone(27)); await p.waitForTimeout(2500);
  const f2 = await p.evaluate(() => ({ id: __T.ISLE.id, n: __T.ISLE.mobs.length, hall: __T.ISLE.hall, up: __T.ISLE.portals.some(q => /1층/.test(q.label)) }));
  console.log('2f', JSON.stringify(f2)); ok('2층 (보스 방 · 올라가는 계단)', f2.id === 27 && !!f2.hall && f2.up && f2.n >= 55);
  // 11/6 프로듀서: 레벨 올림 — 1층 58~61 · 2층 61~64 (2층은 *2 종류 · 체력·공격·경험치·골드 ×1.3 · 1층 ×1.15)
  const lv = await p.evaluate(() => { const T = __T, M = T.MOB, ks = ['gp_bandit', 'gp_archer', 'gp_chief', 'gp_ghost']; const kinds2 = [...new Set(T.foxes.filter(f => !f.dead && /^gp_/.test(f.kind) && !T.MOB[f.kind].boss).map(f => f.kind))];
    return { l1: ks.map(k => M[k].lv), l2: ks.map(k => M[k + '2'].lv), hp1: M.gp_bandit.hp, hp2: M.gp_bandit2.hp, ex2: M.gp_bandit2.exp, boss: [M.gp_klein.lv, M.gp_faust.lv, M.gp_klein.hp], kinds2 }; });
  console.log('lv', JSON.stringify(lv));
  ok(`레벨: 1층 ${lv.l1} · 2층 ${lv.l2} · 칼 산적 HP ${lv.hp1}/${lv.hp2}`, JSON.stringify(lv.l1) === '[58,58,60,55]' && JSON.stringify(lv.l2) === '[61,61,63,58]' && lv.hp1 === 2415 && lv.hp2 === 2730 && lv.ex2 === 23400);
  ok(`보스: 클라인 Lv${lv.boss[0]} → 파우스트 Lv${lv.boss[1]} · HP ${lv.boss[2]}`, lv.boss[0] === 64 && lv.boss[1] === 66 && lv.boss[2] === 143000);
  ok(`2층에는 2층 종류만 (${lv.kinds2})`, lv.kinds2.length >= 3 && lv.kinds2.every(k => /2$/.test(k)));
  // 클라인 → 광폭화 → 파우스트
  const kl = await p.evaluate(async () => { const T = __T, H = T.hero, z = T.ISLE; let m = T.foxes.find(f => f.kind === 'gp_klein' && !f.dead); if (!m) { m = T.mkMob('gp_klein', z.hall[0], z.hall[1]); m.home = [z.hall[0], z.hall[1]]; T.foxes.push(m); }
    H.i = m.i + 2; H.j = m.j; H.x = H.i + 0.5; H.z = H.j + 0.5; m.aggro = true; m.enrAt = 0.4; m.hp = Math.round(m.max * 0.35); await new Promise(r => setTimeout(r, 600));
    return { kind: m.kind, en: !!m.enraged, ratio: +(m.hp / m.max).toFixed(2), log: T.log.slice(-6).map(x => x.t).join(' | '), sk: (T.BOSS_SKILL[m.kind] || []).map(k => k.id) }; });
  console.log('klein', JSON.stringify(kl)); ok('두목 클라인 광폭화 → 파우스트로 변신 (HP 비율 그대로 · 기술 바뀜)', kl.kind === 'gp_faust' && kl.en && Math.abs(kl.ratio - 0.35) < 0.05 && /파우스트로 변신/.test(kl.log) && kl.sk.includes('curse'));
  await p.waitForTimeout(1500); await p.screenshot({ path: 'dev/out/giran_faust.png' });
  const kd = await p.evaluate(async () => { const T = __T, m = T.foxes.find(f => f.kind === 'gp_faust' && !f.dead); m.hp = 0; T.killCheck(m); await new Promise(r => setTimeout(r, 300)); return { log: T.log.slice(-8).map(x => x.t).join(' | '), info: T.ISLAND.bossInfo(27).map(x => [x.k, x.alive]) }; });
  console.log('kd', JSON.stringify(kd)); ok('파우스트를 쓰러뜨리면 두목 클라인 토벌로 기록', /두목 클라인/.test(kd.log) && kd.info.some(([k, al]) => k === 'gp_klein' && !al));
  // 월드맵에는 아덴감옥이 없음 (11/6 프로듀서 — 마을 간수 NPC로만 입장)
  await p.evaluate(() => { __T.TOWN.goTown(); }); await p.waitForTimeout(1500);
  await p.evaluate(() => { __T.setCoins(100000); document.getElementById('btn-map').click(); }); await p.waitForTimeout(600);
  const wm = await p.evaluate(() => ({ mk: !!document.querySelector('#wm-stage .mk[data-r="giran_prison"]'), n: document.querySelectorAll('#wm-stage .mk').length, all: document.getElementById('wmap').innerText }));
  console.log('wm', JSON.stringify({ mk: wm.mk, n: wm.n })); ok('월드맵에 아덴감옥 없음 (다른 사냥터 표시는 그대로)', !wm.mk && wm.n >= 8 && !/아덴감옥/.test(wm.all));
  await p.screenshot({ path: 'dev/out/giran_map.png' }); await p.evaluate(() => { document.getElementById('wmap').hidden = true; });
  // 하루 6시간 (11/7 · 전 4시간)
  await p.evaluate(() => __T.TOWN.toZone(26)); await p.waitForTimeout(2000);
  await p.evaluate(() => __T.GPR_.dbgSet(6 * 3600 - 2)); await p.waitForTimeout(4000);
  const k = await p.evaluate(() => ({ scene: __T.SCENE, msg: __T.log.slice(-8).map(x => x.t).join(' | ') })); console.log('kick', JSON.stringify(k));
  ok('다 쓰면 마을로', k.scene === 'town' && /아덴감옥 이용 시간\(6시간\)을 모두 썼습니다/.test(k.msg));
  await p.evaluate(() => __T.TOWN.toField('아덴감옥')); await p.waitForTimeout(1500);
  ok('그날은 다시 못 들어감', await p.evaluate(() => __T.SCENE === 'town'));
  const sv = await p.evaluate(() => __T.GPR_.dump()); ok('저장 값', !!sv.d && sv.u >= 6 * 3600);
  await p.evaluate(() => { __T.GPR_.load({ d: '19990101', u: 99999 }); }); ok('다음 날 초기화', await p.evaluate(() => __T.GPR_.left() === 6 * 3600));
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
