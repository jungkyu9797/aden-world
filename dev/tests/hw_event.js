// 할로윈 이벤트 테스트 (bash dev/runkt.sh dev/tests/hw_event.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const cls = process.env.CLS || 'elf'; await login(p, { cls, name: 'hwT' });
  const L = async (k, f, a) => console.log(k, JSON.stringify(await p.evaluate(f, a)));
  // 마을 NPC
  await p.evaluate(() => { __T.TOWN.placeAt(13, 28); __T.ZOOMT = 1; }); await p.waitForTimeout(600); await p.screenshot({ path: 'dev/out/hw_1_npc.png' });
  await p.evaluate(() => { __T.setCoins(1000); }); await p.evaluate(() => { const w = document.getElementById('hwwin'); w.hidden = false; });
  await p.evaluate(() => __T.TOWN && 0); await p.evaluate(() => { document.getElementById('hw-buy').click(); });
  await L('after buy', () => ({ coins: __T.coins, hats: __T.INV.count('hw_hat'), best: __T.INV.hwHat() }));
  await p.evaluate(() => { __T.INV.add('red_potion', 5, true); __T.INV.add('green_potion', 2, true); __T.INV.add('hw_scroll', 30, true); __T.INV.add('hw_bscroll', 3, true); __T.INV.add('hw_seed', 250, true); });
  await p.evaluate(() => { const w = document.getElementById('hwwin'); w.hidden = true; }); await p.mouse.click(640, 400); await p.waitForTimeout(100);
  { const [x, y] = await p.evaluate(() => __T.scr(12.5, 26.5)); await p.mouse.click(x, y - 50); await p.waitForTimeout(1500); }
  await L('win open', () => !document.getElementById('hwwin').hidden); await p.screenshot({ path: 'dev/out/hw_2_win.png' });
  await p.evaluate(() => document.getElementById('hw-ex1').click()); await L('ex1', () => ({ seed: __T.INV.count('hw_seed'), pouch: __T.INV.count('hw_pouch') }));
  await p.evaluate(() => document.getElementById('hw-exall').click()); await L('exall', () => ({ seed: __T.INV.count('hw_seed'), pouch: __T.INV.count('hw_pouch') }));
  await p.evaluate(() => document.getElementById('hw-enter').click()); await p.waitForFunction(() => __T.SCENE === 'field' && __T.ISLE && __T.ISLE.id === 21, null, { timeout: 20000 }); await p.waitForTimeout(1500);
  await L('zone', () => ({ id: __T.ISLE.id, mobs: __T.foxes.filter(f => !f.dead).map(f => f.kind).reduce((o, k) => (o[k] = (o[k] || 0) + 1, o), {}), timer: document.getElementById('hw-timer').textContent, timerShown: !document.getElementById('hw-timer').hidden, dark: __T.DN.dark ? __T.DN.dark() : null }));
  await p.screenshot({ path: 'dev/out/hw_3_zone.png' });
  // 마법·물약 막힘
  await L('magic', () => { __T.LEARNED.add('heal'); return __T.castSkill('heal'); });
  const U = async (id) => p.evaluate(id => { __T.INV.setHot(11, id); __T.INV.useHot(11); return [__T.INV.count(id)]; }, id);
  await L('hotType', () => Array.isArray(__T.INV.hot)); 
  await p.evaluate(() => { __T.hero.hp = Math.max(1, __T.hero.hp - 5); }); console.log('red before/after', await U('red_potion'));
  console.log('green', await U('green_potion'), await p.evaluate(() => __T.BUFF.haste1));
  // 공격: 가까운 호박에 붙어서 때리기
  await p.evaluate(() => { const f = __T.foxes.find(m => m.kind === 'hw_pumpkin' && !m.dead); __T.TOWN.placeAt ? 0 : 0; __T.hero.i = f.i - 1; __T.hero.j = f.j; __T.hero.x = f.i - 0.5; __T.hero.z = f.j + 0.5; __T.hero.target = f; window.__pf = f; });
  for (let k = 0; k < 40; k++) { await p.waitForTimeout(250); if (await p.evaluate(() => __pf.dead)) break; await p.evaluate(() => { if (!__pf.dead) __T.strike(__pf); }); }
  await L('kill', () => ({ dead: __pf.dead, hp: __pf.hp, max: __pf.max, coins: __T.coins, log: __T.log.slice(-6).map(x => x.t || x.text || x) }));
  await p.keyboard.press('Escape'); await p.evaluate(() => { document.querySelectorAll('.gw').forEach(w => w.hidden = true); }); await p.waitForTimeout(2500); await p.screenshot({ path: 'dev/out/hw_4_fight.png' });
  // 맞는 피해
  await L('hurt', () => { const h0 = __T.hero.hp; __T.hurtHero(500, __pf, 'melee'); return [h0, __T.hero.hp]; });
  // 강화
  const en = []; for (let k = 0; k < 14; k++) { await p.waitForTimeout(650); en.push((await U('hw_scroll'))[0] + ':' + await p.evaluate(() => __T.INV.hwHat())); } console.log('ench', en.join(' '));
  for (let k = 0; k < 2; k++) { await p.waitForTimeout(700); console.log('pouch', await U('hw_pouch')); }
  await p.waitForTimeout(500); await L('chat', () => __T.log.slice(-8).map(x => x.t || x.text || JSON.stringify(x).slice(0, 120)));
  // 시간 다 쓰면 자동 퇴장
  await p.evaluate(() => { const o = __T.HWM_ ? 0 : 0; }); 
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
