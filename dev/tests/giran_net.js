// 11/6 기란감옥 — 두 사람(같은 지역): 호스트에서 산적 → 악령 · 클라인 → 파우스트로 바뀌면 게스트 화면도 같은 종류로 (KT_PORT=8791 bash dev/runkt.sh dev/tests/giran_net.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1000, height: 700 } }); const errs = []; try {
  const page = async nm => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(nm + ': ' + e.message)); await login(p, { cls: 'knight', name: nm, mp: true }); return p; };
  const A = await page('gpA'); await A.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 58; __T.TOWN.toZone(27); }); await A.waitForTimeout(2500);
  const Bp = await page('gpB'); await Bp.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 58; __T.TOWN.toZone(27); }); await Bp.waitForTimeout(6000);
  const role = async p => p.evaluate(() => ({ host: __T.NET.zoneHost ? __T.NET.zoneHost() : null, n: __T.foxes.length }));
  const ra = await role(A), rb = await role(Bp); console.log('roles', JSON.stringify([ra, rb])); const H = ra.host ? A : Bp, G = ra.host ? Bp : A;
  ok('한쪽이 지역 호스트', !!ra.host !== !!rb.host);
  // 호스트 쪽 산적 하나를 게스트 옆으로 · 악령으로
  const gpos = await G.evaluate(() => [__T.hero.i, __T.hero.j]);
  const uid = await H.evaluate(async gp => { const T = __T; const m = T.foxes.find(f => f.kind === 'gp_bandit' && !f.dead); m.i = m.fi = gp[0] + 2; m.j = m.fj = gp[1]; m.x = m.i + 0.5; m.z = m.j + 0.5; m.aggro = false; const R0 = Math.random; Math.random = () => 0.05; try { m.hp = 0; T.killCheck(m); } finally { Math.random = R0; } await new Promise(r => setTimeout(r, 2500)); return { uid: m.uid, kind: m.kind }; }, gpos);
  await G.waitForTimeout(2500); const gk = await G.evaluate(u => { const f = __T.foxes.find(q => q.uid === u); return f ? { kind: f.kind, dead: f.dead, max: f.max } : null; }, uid.uid);
  console.log('ghost', JSON.stringify([uid, gk])); ok('게스트 화면도 산적 → 악령', uid.kind === 'gp_ghost' && gk && gk.kind === 'gp_ghost' && !gk.dead && gk.max === 1050);
  // 클라인
  const ku = await H.evaluate(async gp => { const T = __T; let m = T.foxes.find(f => f.kind === 'gp_klein'); if (!m) return null; m.i = m.fi = gp[0] + 3; m.j = m.fj = gp[1] + 1; m.x = m.i + 0.5; m.z = m.j + 0.5; m.enrAt = 0.4; m.hp = Math.round(m.max * 0.35); await new Promise(r => setTimeout(r, 800)); return { uid: m.uid, kind: m.kind }; }, gpos);
  await G.waitForTimeout(2500); const gkl = ku && await G.evaluate(u => { const f = __T.foxes.find(q => q.uid === u); return f ? { kind: f.kind, en: !!f.enraged, log: __T.log.slice(-10).map(x => x.t).join(' | ') } : null; }, ku.uid);
  console.log('klein', JSON.stringify([ku, gkl])); ok('게스트 화면도 클라인 → 파우스트 (광폭화 · 변신 알림)', ku && ku.kind === 'gp_faust' && gkl && gkl.kind === 'gp_faust' && gkl.en && /파우스트로 변신/.test(gkl.log));
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
