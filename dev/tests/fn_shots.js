// 화룡의 둥지 그림 확인용 스크린샷 (bash dev/runkt.sh dev/tests/fn_shots.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'fnS' }); await p.evaluate(() => { __T.GOD_INV = true; });
  const go = async (Z, pick) => { await p.evaluate(Z => __T.TOWN.toZone(Z), Z); await p.waitForFunction(Z => __T.ISLE && __T.ISLE.id === Z, Z, { timeout: 20000 }); await p.waitForTimeout(1500);
    await p.evaluate(pick => { const I = __T.ISLE, H = __T.hero; let at = null; if (pick === 'lava') { const o = I.def.lavaList.find(q => !q.st); at = [Math.round(o.x) + 3, Math.round(o.z) + 2]; } else if (pick === 'bones') { const o = I.def.siteList[0]; at = [Math.round(o.x) + 2, Math.round(o.z) + 3]; } else { const f = __T.foxes.find(m => m.kind === pick && !m.dead); at = [f.i - 2, f.j + 2]; }
      H.i = H.fi = at[0]; H.j = H.fj = at[1]; H.x = H.i + 0.5; H.z = H.j + 0.5; H.t = 1; for (const f of __T.foxes) { f.aggro = false; } document.querySelectorAll('#charwin,#invwin').forEach(w => w.hidden = true); }, pick); await p.waitForTimeout(1800); };
  await go(22, 'lava'); await p.screenshot({ path: 'dev/out/fs_22_lava.png' });
  await go(23, 'bones'); await p.screenshot({ path: 'dev/out/fs_23_bones.png' });
  await go(23, 'phoenix'); await p.waitForTimeout(1500); await p.screenshot({ path: 'dev/out/fs_23_phoenix.png' });
  await go(23, 'fn_ashtazio'); await p.screenshot({ path: 'dev/out/fs_23_ashtazio.png' });
  await go(22, 'fn_golem'); await p.screenshot({ path: 'dev/out/fs_22_golem.png' });
  await go(23, 'fn_hcerberus'); await p.screenshot({ path: 'dev/out/fs_23_cerb.png' });
  // 월드맵
  await p.evaluate(() => { __T.TOWN.goTown(); }); await p.waitForTimeout(1500); await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === '월드맵'); b && b.click(); }); await p.waitForTimeout(800);
  await p.evaluate(() => { const m = document.querySelector('#wm-stage .mk[data-r="fire_dragon_nest"]'); m && m.click(); }); await p.waitForTimeout(1200); await p.screenshot({ path: 'dev/out/fs_wmap.png' });
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
