// 11/4 프로듀서: 타격 연출 [끔]이면 치명타·마법·보스 기술의 화면 흔들림·타격 멈춤도 없음 (저사양도) · [보통]이면 그대로 · 강화 결과 흔들림은 그대로
//   KT_PORT=8896 bash dev/runkt.sh dev/tests/shakeoff.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 680 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'shk' }); await p.evaluate(() => { __T.GOD_INV = true; __T.LOWG_.set && __T.LOWG_.set(false); });
  await p.evaluate(() => __T.TOWN.toZone(2)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 2 && __T.SCENE === 'field', null, { timeout: 60000 }); await p.waitForTimeout(1200);
  const run = lv => p.evaluate(async lv => { const T = __T, w = ms => new Promise(r => setTimeout(r, ms)); T.HF_.set(lv); let jit = 0, n = 0;
    for (let k = 0; k < 20; k++) { T.setShk_(0.3, 0); await w(40); const s = T.SHK_(); if (s.sj !== 0) jit++; n++; }
    T.setShk_(0, 0.5); const t0 = T.time; await w(250); const s2 = T.SHK_(), adv = T.time - t0; return { jit, n, stop: s2.hitstop, adv: +adv.toFixed(2), fx: T.HF_.fx() }; }, lv);
  const on = await run(1), off = await run(0);
  console.log('보통', JSON.stringify(on), '끔', JSON.stringify(off));
  ok(on.jit > 0 && on.stop > 0, `① 타격 연출 [보통]: 흔들림·타격 멈춤 있음 (흔들린 프레임 ${on.jit}/${on.n})`);
  ok(off.jit === 0, `② 타격 연출 [끔]: 치명타·마법 흔들림 없음 (흔들린 프레임 ${off.jit}/${off.n})`);
  ok(off.stop === 0, `② 타격 연출 [끔]: 타격 멈춤 없음 (남은 멈춤 ${off.stop})`);
  const crit = await p.evaluate(async () => { const T = __T, w = ms => new Promise(r => setTimeout(r, ms)); T.HF_.set(0); const m = T.foxes.find(f => !f.dead && !f.fb && T.MOB[f.kind] && !T.MOB[f.kind].boss); const R = Math.random; Math.random = () => 0.001; try { T.strike ? T.strike(m) : null; } catch (e) {} Math.random = R; let jit = 0; for (let k = 0; k < 8; k++) { await w(30); if (T.SHK_().sj !== 0) jit++; } return { has: !!T.strike, jit }; });
  if (crit.has) ok(crit.jit === 0, `② [끔]에서 실제 치명타를 때려도 안 흔들림 (${crit.jit})`);
  const low = await p.evaluate(async () => { const T = __T, w = ms => new Promise(r => setTimeout(r, ms)); T.HF_.set(1); T.LOWG_.set(true); let jit = 0; for (let k = 0; k < 10; k++) { T.setShk_(0.3, 0); await w(40); if (T.SHK_().sj !== 0) jit++; } T.LOWG_.set(false); return jit; });
  ok(low === 0, `③ 저사양 그래픽이면 흔들림 없음 (${low})`);
  const enh = await p.evaluate(async () => { const T = __T, w = ms => new Promise(r => setTimeout(r, ms)); T.HF_.set(0); T.bigFx ? T.bigFx('boom', '테스트') : null; let jit = 0; for (let k = 0; k < 8; k++) { await w(30); if (T.SHK_().sj !== 0) jit++; } T.HF_.set(1); return { has: !!T.bigFx, jit }; });
  if (enh.has) ok(enh.jit > 0, `④ 강화 결과 흔들림은 [끔]이어도 그대로 (${enh.jit})`);
  ok(!errs.length, '오류 없음 ' + errs.slice(0, 2).join(' | ')); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
