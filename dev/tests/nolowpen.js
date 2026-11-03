// 11/3 낮은 레벨 몬스터 경험치 패널티 없앰: Lv61이 용의 계곡 1구역(Lv47~48 · 예전 −40~−45%) 몬스터를 잡아도 경험치 그대로 · 채팅에 "(낮은 레벨 −%)" 없음
//   KT_PORT=8896 bash dev/runkt.sh dev/tests/nolowpen.js
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 640 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'nlp' }); await p.evaluate(() => { __T.hero.lv = 61; __T.GOD_INV = true; });
  await p.evaluate(() => __T.TOWN.toZone(16)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 16 && __T.SCENE === 'field', null, { timeout: 60000 }); await p.waitForTimeout(2000);
  const r = await p.evaluate(() => { const T = __T, H = T.hero, out = []; for (let k = 0; k < 3; k++) { const m = T.foxes.filter(f => !f.dead && !f.fb && T.MOB[f.kind] && !T.MOB[f.kind].boss && T.MOB[f.kind].lv <= 50).sort((a, b) => Math.hypot(a.x - H.x, a.z - H.z) - Math.hypot(b.x - H.x, b.z - H.z))[0]; if (!m) break;
      const S = T.MOB[m.kind], e0 = H.exp, l0 = H.lv, n0 = T.log.length; m.hp = 1; let n = 0; while (!m.dead && n++ < 40) T.strike(m); const got = H.lv === l0 ? H.exp - e0 : null; const msg = T.log.slice(n0).map(l => l.t).filter(t => /경험치 \+/.test(t)).join(' / ');
      out.push({ k: m.kind, lv: S.lv, exp: S.exp, got, msg }); } return out; });
  console.log(JSON.stringify(r));
  ok(r.length >= 2, `몬스터 ${r.length}마리 잡음`);
  ok(r.every(x => x.got != null && (x.got === x.exp || x.got === Math.round(x.exp * 1.2))), '받은 경험치 = 몬스터 경험치 그대로 (밤이면 +20%) · 예전 Lv61이면 −40~−45%');
  ok(r.every(x => /경험치 \+/.test(x.msg) && !/낮은 레벨/.test(x.msg)), '채팅에 "(낮은 레벨 −%)" 표시 없음');
  console.log(errs.slice(0, 3).join('\n') || 'no errors'); ok(!errs.length, '오류 없음'); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exitCode = fails ? 1 : 0; })();
