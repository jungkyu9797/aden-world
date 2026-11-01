// 11/1 절전 귀환: 라인 혈맹 봇에게 맞아도 마을로 (KT_PORT=8799 bash dev/runkt.sh dev/tests/fieldbot_saver.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  const p = await b.newPage({ viewport: { width: 1000, height: 700 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'fbS' });
  const Z = await p.evaluate(() => { const F = window.__FB; F.setRef({ lv: 55, fb: { lv: 55, c: 'knight', hp: 900, ac: -60, mr: 40, d: 45, cp: 5000 } }); const P = F.plan(); return +Object.keys(P.cnt).sort((a, b) => P.cnt[b] - P.cnt[a])[0]; }); console.log('zone', Z);
  await p.evaluate(z => { __T.GOD_INV = true; __T.BUFF.invis = 9999; __T.TOWN.toZone(z); }, Z);
  let n = 0; for (let q = 0; q < 30 && !n; q++) { await p.waitForTimeout(500); n = await p.evaluate(() => __T.foxes.filter(f => f.fb && !f.dead && !f.gone).length); } console.log('bots', n); ok('2구역에 봇이 있음', n > 0);
  const hitBy = () => p.evaluate(() => { const f = __T.foxes.find(f => f.fb && !f.dead && !f.gone); __T.hurtHero(3, f, 'melee'); });
  await p.evaluate(() => window.SAVER.enter(false)); await p.waitForTimeout(300);
  await hitBy(); await p.waitForTimeout(1500); ok('절전 귀환 꺼짐: 봇에게 맞아도 그대로', await p.evaluate(() => __T.SCENE === 'field'));
  await p.evaluate(() => { const c = document.getElementById('sv-homec'); if (!c.checked) c.click(); }); await hitBy(); await p.waitForTimeout(2500);
  const r = await p.evaluate(() => ({ sc: __T.SCENE, notes: document.getElementById('sv-notes').textContent, lab: document.querySelector('.sv-home').textContent }));
  console.log(JSON.stringify(r)); ok('절전 귀환 켜짐: 라인 봇에게 맞으면 마을로 · 알림', r.sc === 'town' && /라인 혈맹 봇에게 공격받아/.test(r.notes) && /라인 혈맹 봇/.test(r.lab));
  await p.evaluate(() => { const c = document.getElementById('sv-homec'); if (c.checked) c.click(); window.SAVER.exit(); });
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
