// 낮/밤 개편: 현실 시각 1시간 낮·1시간 밤 (한국 시각 짝수 시 낮 · 홀수 시 밤) · 밤에는 모든 몬스터(보스 포함) 체력·공격력 +20% · 경험치·골드 +20% (KT_PORT=8788 bash dev/runkt.sh dev/tests/daynight.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'dnKN' });
  // ① 현실 시각 기준
  const c = await p.evaluate(() => { const D = __T.DN_; D.set(null); const u = (Date.now() / 1000 + 9 * 3600) % 7200, kh = (new Date(Date.now() + 9 * 3600e3)).getUTCHours(); return { night: D.isNight(), exp: u >= 3600, odd: kh % 2 === 1, kh, label: D.label(), min: Math.ceil(((u >= 3600 ? 7200 : 3600) - u) / 60) }; });
  console.log('clock', JSON.stringify(c)); ok('① 현실 시각: 한국 시각 짝수 시 낮 · 홀수 시 밤 (1시간씩)', c.night === c.exp && c.exp === c.odd && c.label.includes(`${c.min}분 뒤 ${c.exp ? '낮' : '밤'}`));
  // ② 사냥터에서 낮 → 밤 → 낮
  await p.evaluate(() => { const T = __T; T.GOD_INV = true; T.DN_.set(0); T.TOWN.toZone(8); }); await p.waitForTimeout(1500);
  const spawn = () => p.evaluate(() => { const T = __T, H = T.hero; for (const f of T.foxes) if (!f.isPet) f.gone = true; const out = {}; for (const k of ['dv_lizard', 'zombie', 'baphomet']) { if (!T.MOB[k]) continue; let m = null; for (let d = 3; d < 12 && !m; d++) m = T.mkMob(k, H.i + d, H.j + Object.keys(out).length * 2); if (m) { m.summoned = true; m.aggro = false; T.foxes.push(m); out[k] = m; } } window.__DNM = out; return Object.keys(out); });
  const st = () => p.evaluate(() => { const T = __T, o = {}; for (const [k, f] of Object.entries(window.__DNM)) { const S = T.MOB[k]; let s = 0; for (let i = 0; i < 4000; i++) s += T.MOBDMG_(S, f); o[k] = { max: f.max, hp: Math.round(f.hp), base: S.hp, dmg: +(s / 4000).toFixed(2), hit: +T.MOBHIT_(S).toFixed(3), st: (T.mobStatus(f) || []).map(x => x.n).join(' / ') }; } return o; });
  const ids = await spawn(); console.log('mobs', JSON.stringify(ids));
  await p.evaluate(() => { const T = __T; for (const f of Object.values(window.__DNM)) f.hp = f.max * 0.5; }); await p.waitForTimeout(600);
  const d0 = await st(); await p.evaluate(() => __T.DN_.set(1)); await p.waitForTimeout(800); const n1 = await st(); await p.evaluate(() => __T.DN_.set(0)); await p.waitForTimeout(800); const d2 = await st();
  console.log(JSON.stringify({ d0, n1, d2 }, null, 1));
  const ks = Object.keys(d0); ok('② 몹 준비', ks.length >= 2);
  ok('② 밤: 체력 최대치 +20% (보스 포함) · 남은 비율 유지', ks.every(k => n1[k].max === Math.round(d0[k].max * 1.2) && Math.abs(n1[k].hp / n1[k].max - 0.5) < 0.02));
  ok('② 밤: 공격력 +20%', ks.every(k => Math.abs(n1[k].dmg / d0[k].dmg - 1.2) < 0.05));
  ok('② 낮: 원래대로', ks.every(k => d2[k].max === d0[k].max && Math.abs(d2[k].hp / d2[k].max - 0.5) < 0.02 && Math.abs(d2[k].dmg / d0[k].dmg - 1) < 0.05));
  ok('② 언데드도 명중 그대로 (예전 밤 +10% 없앰)', ks.every(k => n1[k].hit === d0[k].hit));
  ok('② 몬스터 상태: 밤의 힘 — 체력·공격력 +20%', ks.every(k => /밤의 힘 — 체력·공격력 \+20%/.test(n1[k].st) && !/밤의 힘/.test(d0[k].st)));
  const log = await p.evaluate(() => __T.log.slice(-8).map(x => x.t || x.text || x)); console.log(JSON.stringify(log));
  ok('② 밤/낮 바뀔 때 안내', log.some(x => /밤이 되었습니다.*모든 몬스터가 강해지.*경험치·골드를 20% 더/.test(x)) && log.some(x => /날이 밝았습니다/.test(x)));
  // ③ 새로 생긴 몹도 밤이면 +20%
  await p.evaluate(() => __T.DN_.set(1)); await spawn(); await p.waitForTimeout(600); const n3 = await st(); ok('③ 밤에 새로 나온 몹도 +20%', Object.keys(n3).every(k => n3[k].max === Math.round(n3[k].base * 1.2) && n3[k].hp === n3[k].max));
  await p.screenshot({ path: 'dev/out/daynight_night.png' });
  // ⑤ 밤 보상: 경험치·골드 +20%
  { const rw = async night => p.evaluate(nt => { const T = __T, H = T.hero; T.DN_.set(nt); const S = T.MOB.dv_lizard, c0 = S.coin, e0 = S.exp; S.coin = [1000, 1000]; S.exp = 5000; let m = null; for (let d = 3; d < 12 && !m; d++) m = T.mkMob('dv_lizard', H.i + d, H.j + 3); T.foxes.push(m); H.lv = 50; const g0 = T.coins, x0 = H.exp; m.dmgBy = new Map([[H, 10]]); m.hp = 0; T.killCheck(m); const r = { gold: T.coins - g0, exp: H.exp - x0 }; S.coin = c0; S.exp = e0; return r; }, night);
    await p.evaluate(() => __T.DN_.set(0)); await p.waitForTimeout(400); const d = await rw(0); await p.evaluate(() => __T.DN_.set(1)); await p.waitForTimeout(400); const n = await rw(1); console.log('reward', JSON.stringify({ d, n }));
    ok('⑤ 밤: 골드 +20%', n.gold === Math.round(d.gold * 1.2)); ok('⑤ 밤: 경험치 +20%', d.exp > 0 && Math.abs(n.exp / d.exp - 1.2) < 0.01); }
  // ⑥ 밤 디버프 아이콘 (마우스를 올리면 설명)
  { const ic = async nt => { await p.evaluate(nt => __T.DN_.set(nt), nt); await p.waitForTimeout(300); return p.evaluate(() => { const R = (__T.BUFFRECT_ || []).find(r => r[4] === '_night'); return R ? R.slice(0, 4) : null; }); };
    const dI = await ic(0), nI = await ic(1); console.log('icon', JSON.stringify({ dI, nI })); ok('⑥ 밤에만 디버프 줄에 밤 아이콘', !dI && !!nI);
    if (nI) { await p.evaluate(r => { const z = __T.curZ; __T.setMouse([(r[0] + r[2] / 2) * z, (r[1] + r[3] / 2) * z]); }, nI); await p.waitForTimeout(300); await p.screenshot({ path: 'dev/out/daynight_icon.png' }); } }
  // ④ 던전 이름표 · 결투장은 영향 없음
  const lab = await p.evaluate(async () => { const T = __T; T.DN_.set(null); const dz = Object.keys(T.ISLAND.def ? {} : {}); return T.DN_.label(); }); console.log('label', lab);
  await p.evaluate(() => { __T.DN_.set(1); __T.TOWN.toZone(15); }); await p.waitForTimeout(1500);
  const ar = await p.evaluate(() => { const T = __T, H = T.hero; let m = null; for (let d = 3; d < 12 && !m; d++) m = T.mkMob('dv_lizard', H.i + d, H.j); if (m) T.foxes.push(m); return new Promise(r => setTimeout(() => r(m ? { max: m.max, base: T.MOB.dv_lizard.hp } : null), 600)); });
  console.log('arena', JSON.stringify(ar)); ok('④ 결투장(이벤트·수호탑 등)은 밤 강화 없음', !ar || ar.max === ar.base);
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
