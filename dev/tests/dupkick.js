// 11/3 중복 접속으로 끊긴 창: 예전엔 게임이 계속 돌았음(몬스터·봇·그리기 · 메모리 그대로) → 2.5초 뒤 처음 화면으로 새로 열려 게임이 멈추고 메모리가 비는지
//   KT_PORT=8872 bash dev/runkt.sh dev/tests/dupkick.js
const { chromium } = require('playwright'); const login = require('../tq.js'); const fs = require('fs');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1100, height: 680 } }); const p = await ctx.newPage(); const bcdp = await b.newBrowserCDPSession(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const rss = async () => { const { processInfo } = await bcdp.send('SystemInfo.getProcessInfo'); let r = 0; for (const q of processInfo) if (q.type === 'renderer') { try { r += +(/VmRSS:\s+(\d+)/.exec(fs.readFileSync(`/proc/${q.id}/status`, 'utf8')) || [])[1] || 0; } catch (e) {} } return Math.round(r / 1024); };
  await login(p, { cls: 'knight', name: 'dupk' }); await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 60; });
  await p.evaluate(() => __T.TOWN.toZone(12)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 12 && __T.SCENE === 'field', null, { timeout: 60000 }); await p.waitForTimeout(5000);
  const m0 = await rss(); const g0 = await p.evaluate(() => ({ on: !!window.__gameOn, bots: window.__FB ? __FB.bots().length : 0 }));
  ok(g0.on, `끊기기 전: 게임 중 · 봇 ${g0.bots}명 · 메모리 ${m0}MB`);
  const nav = p.waitForNavigation({ timeout: 15000 }).then(() => true).catch(() => false);
  await p.evaluate(() => __T.SESS.kick('presence'));
  const dlg = await p.evaluate(() => { const e = document.getElementById('dupkick'); return e ? e.textContent : ''; });
  ok(/다른 곳에서 같은 계정/.test(dlg) && /메모리를 비운/.test(dlg), '끊긴 창 안내 (곧 처음 화면으로 돌아간다는 말)');
  ok(await nav, '2.5초 뒤 게임 화면을 닫고 가벼운 안내 페이지로 감');
  await p.waitForTimeout(6000); try { const c = await ctx.newCDPSession(p); await c.send('HeapProfiler.collectGarbage'); } catch (e) {} await p.waitForTimeout(1500);
  const g1 = await p.evaluate(() => ({ url: location.pathname.split('/').pop(), on: !!window.__gameOn, txt: document.body.innerText }));
  const m1 = await rss();
  console.log('  after', JSON.stringify(g1).slice(0, 160), 'rss', m1);
  ok(g1.url === 'kicked.html' && !g1.on && /메모리를 비웠어요/.test(g1.txt), '안내 페이지: 게임 멈춤 · 끊긴 이유');
  ok(m1 < m0 * 0.5, `메모리 비움 ${m0}MB → ${m1}MB`);
  // [다시 접속하기] → 게임 처음 화면 (자동 로그인이어도 캐릭터 선택까지만)
  await p.click('#re'); await p.waitForSelector('#lg-mode, #cs-start', { state: 'attached', timeout: 30000 }).catch(() => {}); await p.waitForTimeout(5000);
  const g2 = await p.evaluate(() => ({ on: !!window.__gameOn, lg: (document.getElementById('lg-msg') || {}).textContent || '', cs: (document.getElementById('cs-msg') || {}).textContent || '' }));
  ok(!g2.on, '다시 접속하기 → 처음 화면 · 게임이 저절로 시작되지 않음 (다른 쪽 접속을 다시 끊지 않음)');
  ok(/다른 곳에서 같은 계정으로 접속해서/.test(g2.lg + g2.cs), '처음 화면에도 끊긴 이유 한 번 안내');
  console.log(errs.length ? 'PAGE ERRORS\n' + errs.slice(0, 5).join('\n') : 'no page errors'); if (errs.length) process.exitCode = 1; await b.close(); })();
