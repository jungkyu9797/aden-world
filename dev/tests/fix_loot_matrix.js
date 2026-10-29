// 자동사냥 줍기 종류×등급 표 (bash dev/runkt.sh dev/tests/fix_loot_matrix.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'lmT' });
  const W = () => p.evaluate(() => { const A = __T.AUTO; const ids = ['long_sword', 'dk_helm', 'dragon_scale', 'scroll_weapon', 'red_potion']; return ids.map(i => i + '(' + (__T.ITEMS[i].rar || '일반') + ')=' + (A.wantLoot(i) ? 'O' : 'X')).join(' '); });
  console.log('기본(전부 켬):', await W());
  // 예전 저장 옮기기: 고급 끔 → 재료(고급)도 X, 지금과 같아야 함
  await p.evaluate(() => __T.AUTO.setCfg({ lootR: { 일반: true, 고급: false, 희귀: true, 영웅: true }, lootT: { weapon: true, armor: true, acc: true, cons: true, book: true, etc: true } }));
  console.log('예전 저장(고급 끔):', await W());
  await p.evaluate(() => __T.AUTO.openSet()); await p.waitForTimeout(200);
  // 재료·기타 줄 전체 켜기 (머리 버튼), 장비 3줄은 일반 끄기
  await p.click('#huntwin [data-lmr=etc]'); for (const t of ['weapon', 'armor', 'acc']) await p.click(`#huntwin [data-lm="${t}:일반"]`);
  console.log('표 수정 후:', await W());
  const cfg = await p.evaluate(() => __T.AUTO.cfg()); console.log('저장 lootM.etc:', JSON.stringify(cfg.lootM.etc), 'lootR(예전판용):', JSON.stringify(cfg.lootR));
  // 저장 → 다른 PC에서 불러오기 흉내: 기본값으로 덮은 뒤 cfg 다시 넣기
  await p.evaluate(c => { __T.AUTO.setCfg({ lootM: { weapon: { 일반: true, 고급: true, 희귀: true, 영웅: true } } }); __T.AUTO.setCfg(c); }, cfg);
  console.log('다시 불러온 뒤:', await W());
  await p.locator('#huntwin .hw-lm').scrollIntoViewIfNeeded(); await p.screenshot({ path: 'dev/out/fix_loot_matrix.png' });
  await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(200); await p.locator('#huntwin .hw-lm').scrollIntoViewIfNeeded(); await p.screenshot({ path: 'dev/out/fix_loot_matrix_m.png' });
  console.log('표 가로폭(모바일):', await p.evaluate(() => [document.querySelector('#huntwin .hw-lm').scrollWidth, document.getElementById('huntwin').clientWidth]));
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
