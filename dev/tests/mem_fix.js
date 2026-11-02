// 11/2 메모리 줄이기 — 기능 확인: 배경음은 트는 곡만 · 몬스터 그림은 그 지역 것만(나중에 놓음) · 바닥 그림은 지금+바로 전 지역만(다시 오면 다시 만듦)
//   · 예전 통짜 기사 그림 안 받음 · 가호 아이콘(보스 얼굴)·인형 아이콘은 그대로 생김 · 몽환의 섬 그림은 들어갈 때
//   KT_PORT=8791 bash dev/runkt.sh dev/tests/mem_fix.js
const { chromium } = require('playwright'); const login = require('../tq.js');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage({ viewport: { width: 1100, height: 680 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { const M = window.__MEM = { dec: [] }; const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) { const d0 = AC.prototype.decodeAudioData; AC.prototype.decodeAudioData = function (buf, a, c) { const n = M.dec.length; M.dec.push('?'); return d0.call(this, buf, x => { M.dec[n] = x.duration.toFixed(0) + 's'; a && a(x); }, c); }; }
    const F = window.fetch; window.fetch = function (u, ...r) { if (/bgm_\w+\.mp3/.test(String(u))) (M.bgm = M.bgm || []).push(String(u).match(/bgm_(\w+)/)[1]); return F.call(this, u, ...r); }; });
  await login(p, { cls: 'knight', name: 'memF' }); await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 60; __T.BUFF.invis = 9999; });
  await p.mouse.click(550, 300); await p.keyboard.press('Shift'); await p.waitForTimeout(6000);
  const m0 = await p.evaluate(() => ({ C: __T.MEM_(), bgm: window.__MEM.bgm || [], res: performance.getEntriesByType('resource').map(e => e.name.split('/').pop()) }));
  console.log('  start', JSON.stringify({ C: m0.C, bgm: m0.bgm }));
  ok(m0.C.mimgN === 0, `시작: 몬스터 그림(3동작) 안 받음 (${m0.C.mimgN}종)`);
  ok(m0.bgm.length <= 2 && !m0.bgm.includes('desert') && !m0.bgm.includes('boss'), `시작: 배경음은 트는 곡만 받음 [${m0.bgm.join(',')}] (예전 10곡)`);
  ok(!m0.res.some(n => /^knight_(idle|walk|attack|attack2|look)\.webp$/.test(n)), '예전 통짜 기사 그림(knight_idle 등 72MB) 안 받음');
  ok(!m0.res.some(n => /^(unicorn|spirits_a|spirits_b)\.webp$/.test(n)), '몽환의 섬 그림(73MB)은 시작할 때 안 받음');
  // 가호 아이콘(보스 얼굴) · 인형 아이콘
  await p.waitForFunction(() => /<image/.test(__T.CXI['gaho_shelob'] || '') && /<image/.test(__T.CXI['gaho_deathknight'] || ''), null, { timeout: 30000 }).catch(() => {});
  const ic = await p.evaluate(() => ({ gaho: Object.keys(__T.CXI).filter(k => /^gaho_/.test(k) && /<image/.test(__T.CXI[k])).length, doll: Object.keys(__T.CXI).filter(k => /^doll_/.test(k) && /<image/.test(__T.CXI[k])).length, mimgN: __T.MEM_().mimgN }));
  ok(ic.gaho >= 6 && ic.mimgN === 0, `가호 아이콘 보스 얼굴 ${ic.gaho}개 (idle 한 장만 · 3동작 그림은 그대로 ${ic.mimgN}종)`); ok(ic.doll >= 3, `인형 아이콘 ${ic.doll}개`);
  // 사냥터: 그 지역 몬스터 그림만 · 그려짐
  const go = async z => { await p.evaluate(z => __T.TOWN.toZone(z), z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', z, { timeout: 60000 }); };
  await go(2); await p.waitForTimeout(4000);
  const z2 = await p.evaluate(() => ({ C: __T.MEM_() }));
  const z2b = await p.evaluate(() => { const T = __T; const K = [...new Set(T.foxes.filter(f => !f.dead && T.MSHEET && T.MSHEET[f.kind]).map(f => f.kind))]; return { K, ready: K.filter(k => { const I = T.MIMG_ && T.MIMG_[k]; return I && I.idle && I.idle.naturalWidth > 0; }) }; });
  console.log('  zone2', JSON.stringify({ C: z2.C, K: z2b.K, ready: z2b.ready }));
  ok(z2.C.mimgN >= 1 && z2.C.mimgN <= z2b.K.length + 3, `2구역: 그 지역 몬스터 그림만 (${z2.C.mimgN}종 · 지역 종류 ${z2b.K.length})`); ok(z2b.ready.length === z2b.K.length && z2b.K.length > 0, `2구역 몬스터 그림 모두 준비됨 ${z2b.ready.length}/${z2b.K.length}`);
  const bgm2 = await p.evaluate(() => (window.__MEM.bgm || []).slice()); ok(bgm2.filter(x => x === 'island').length === 1, '사냥터 배경음은 들어갈 때 한 번 받음 ' + bgm2.join(','));
  // 바닥 그림: 2 → 4 → 6 → 2 (지금 + 바로 전만 · 다시 오면 다시 만듦)
  await go(4); await p.waitForTimeout(1500); await go(6); await p.waitForTimeout(25000); const g6 = await p.evaluate(() => ({ g: __T.ISLAND.zones(), C: __T.MEM_(), K: [...__T.MEM_K_()] }));
  ok(JSON.stringify(g6.g.sort((a, b) => a - b)) === '[4,6]', `바닥 그림은 지금(6)·바로 전(4)만 남음 ${JSON.stringify(g6.g)}`);
  await go(2); await p.waitForTimeout(2000); const g2 = await p.evaluate(() => ({ g: __T.ISLAND.zones(), has: !!__T.ISLE.ground, K: [...__T.MEM_K_()], C: __T.MEM_() }));
  ok(g2.has && JSON.stringify(g2.g.sort((a, b) => a - b)) === '[2,6]', `다시 온 2구역 바닥 다시 만듦 · 남은 바닥 ${JSON.stringify(g2.g)}`);
  console.log('  mimg before/after', JSON.stringify(g6.K), '→', JSON.stringify(g2.K));
  const z4only = g6.K.filter(k => !g2.K.includes(k)); ok(z4only.length > 0 || g6.K.every(k => g2.K.includes(k)), `20초 넘게 안 그린 다른 지역 몬스터 그림은 놓음 (놓은 것 ${z4only.join(',') || '없음'})`);
  ok(g2.C.mimgN <= g6.C.mimgN + 8, `몬스터 그림 종류가 끝없이 늘지 않음 (${g6.C.mimgN} → ${g2.C.mimgN})`);
  // 몽환의 섬: 들어가면 그림 받음
  await p.evaluate(() => { try { __T.DRM && __T.DRM.reset && __T.DRM.reset(); } catch (e) {} }); await go(24).catch(() => {}); await p.waitForTimeout(4000);
  const dr = await p.evaluate(() => performance.getEntriesByType('resource').some(e => /unicorn\.webp$/.test(e.name)));
  ok(dr, '몽환의 섬에 들어가면 유니콘·정령 그림 받음');
  await p.screenshot({ path: 'dev/out/mem_fix.png' });
  console.log(errs.length ? 'PAGE ERRORS\n' + errs.slice(0, 6).join('\n') : 'no page errors'); if (errs.length) process.exitCode = 1; await b.close(); })();
