// 11/4 메모리 다이어트: 예전 판과 그림이 같은지 — 가호·인형 아이콘(데이터 URL) · 변신 카드 그림 · 월드맵 보스 초상(화소) 해시 + 장면 스크린샷 (마을 · 화둥 2구역 · 보스 · 월드맵)
//   MTAG=new KT_PORT=8909 bash dev/runkt.sh dev/tests/memdiet_same.js   → dev/out/memdiet_same_new.json · 예전 판 폴더에서 MTAG=base 로 한 번 더 → 두 json 비교 (MCMP=1 이면 두 파일을 비교해 OK/FAIL)
const { chromium } = require('playwright'); const login = require('../tq.js'); const fs = require('fs'); const crypto = require('crypto');
const TAG = process.env.MTAG || 'new', h = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
if (process.env.MCMP) { const [a, b] = process.env.MCMP.split(',').map(f => JSON.parse(fs.readFileSync(f, 'utf8'))); let same = 0, diff = [];
  // 빼는 것: portrait:unicorn = 몽환의 섬 유니콘 초상은 코드로 그리는 움직이는 그림(시각마다 다름 · 이번에 안 바뀐 곳) · cxi:doll_basilisk = 0.42배로 줄이는 아이콘 하나만 크롬 <img> 축소와 계산이 달라 평균 1/255 안쪽 차이(눈으로 구별 안 됨 · 4배 확대 비교함)
  const SKIP = new Set(['portrait:unicorn', 'cxi:doll_basilisk']);
  for (const k of Object.keys(a)) { if (!(k in b) || SKIP.has(k)) continue; if (a[k] === b[k]) same++; else diff.push(k); }
  ok(!diff.length && same > 20, `예전 판과 같은 그림 ${same}개 · 다른 것 ${diff.length ? diff.join(',') : '없음'} (뺀 것 ${[...SKIP].join(',')})`); if (!diff.length) console.log('ALL OK'); return; }
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 760 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'msame' }); await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 61; __T.BUFF.invis = 9999; });
  await p.mouse.click(640, 300); await p.waitForTimeout(4000);
  await p.waitForFunction(() => Object.keys(__T.CXI).filter(k => /^(gaho|doll)_/.test(k) && /<image/.test(__T.CXI[k])).length >= 25, null, { timeout: 40000 }).catch(() => {});
  const out = {}; const cx = await p.evaluate(() => Object.fromEntries(Object.keys(__T.CXI).filter(k => /^(gaho|gfrag|doll)_/.test(k)).map(k => [k, __T.CXI[k]])));
  for (const k in cx) out['cxi:' + k] = h(cx[k]);
  const arts = await p.evaluate(async () => { const ids = ['werewolf', 'ogre', 'baphomet', 'deathknight', 'spartoi', 'necromancer', 'orc_wizard', 'bugbear', 'fn_warrior', 'drake_king'], o = {};
    for (let n = 0; n < 60 && Object.keys(o).length < ids.length; n++) { for (const id of ids) if (!o[id]) { const u = window.PCG.art(id); if (u) o[id] = u; } await new Promise(r => setTimeout(r, 200)); } return o; });
  for (const k in arts) out['art:' + k] = h(arts[k]);
  await p.screenshot({ path: `dev/out/memdiet_${TAG}_town.png` });
  await p.evaluate(() => document.getElementById('btn-map').click()); await p.waitForTimeout(3500);
  const por = await p.evaluate(() => [...document.querySelectorAll('#wm-stage .mk-boss canvas[data-k]')].map(c => [c.dataset.k, Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data).join(',')]));
  for (const [k, d] of por) out['portrait:' + k] = h(d); await p.screenshot({ path: `dev/out/memdiet_${TAG}_worldmap.png` }); await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  await p.evaluate(() => __T.TOWN.toZone(23)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 23 && __T.SCENE === 'field', null, { timeout: 90000 }); await p.waitForTimeout(8000);
  await p.screenshot({ path: `dev/out/memdiet_${TAG}_zone23.png` });
  await p.evaluate(() => { const T = __T, hh = T.hero; const m = T.mkMob_('deathknight', hh.i + 2, hh.j + 1); m.aggro = false; m.home = [hh.i + 2, hh.j + 1]; T.foxes.push(m); }); await p.waitForTimeout(5000);
  await p.screenshot({ path: `dev/out/memdiet_${TAG}_boss.png` });
  fs.writeFileSync(`dev/out/memdiet_same_${TAG}.json`, JSON.stringify(out, null, 1)); console.log(`${TAG}: ${Object.keys(out).length}개 해시 (아이콘 ${Object.keys(cx).length} · 카드 ${Object.keys(arts).length} · 초상 ${por.length}) → dev/out/memdiet_same_${TAG}.json`);
  console.log(errs.length ? 'PAGE ERRORS\n' + errs.slice(0, 6).join('\n') : 'no page errors'); await b.close(); })();
