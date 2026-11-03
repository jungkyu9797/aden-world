// 11/3 PC 실행 파일(Electron) 확인: ① 한 번만 켜짐(두 번째 실행은 바로 꺼지고 기존 창만) ② 끊긴 창 → 게임 창을 닫고 가벼운 안내 창(새 프로세스) ③ 안내 창 [다시 접속하기] → 게임 처음 화면
//   ELECTRON_BIN=<electron 실행 파일> APP_DIR=<main.js가 있는 폴더(package.json main=main.js)> xvfb-run -a node dev/tests/pc_dupkick.js
const { _electron } = require('playwright'); const { spawn } = require('child_process');
const BIN = process.env.ELECTRON_BIN, DIR = process.env.APP_DIR;
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
(async () => { const app = await _electron.launch({ executablePath: BIN, args: [DIR, '--no-sandbox'], env: { ...process.env, ELECTRON_ENABLE_LOGGING: '0' } });
  const w = await app.firstWindow(); await w.waitForSelector('#lg-mode', { state: 'visible', timeout: 60000 });
  ok(true, '게임 창이 켜지고 로그인 화면이 보임 (main.js·preload.js 정상)');
  const n0 = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length);
  // ② 두 번째 실행
  const t0 = Date.now(); const p2 = spawn(BIN, [DIR, '--no-sandbox'], { stdio: 'ignore' }); const code = await new Promise(r => { const to = setTimeout(() => { try { p2.kill(); } catch (e) {} r('timeout'); }, 20000); p2.on('exit', c => { clearTimeout(to); r(c); }); });
  await w.waitForTimeout(800); const n1 = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length);
  ok(code !== 'timeout' && n0 === 1 && n1 === 1, `두 번 실행: 두 번째는 ${((Date.now() - t0) / 1000).toFixed(1)}초 만에 꺼짐(코드 ${code}) · 창은 그대로 1개`);
  // ③ 끊긴 창 → 안내 창
  const pid0 = await w.evaluate(() => 0) || await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.getOSProcessId());
  await w.evaluate(() => window.native.kicked('dup'));
  let kw = null; for (let i = 0; i < 40 && !kw; i++) { await new Promise(r => setTimeout(r, 250)); kw = app.windows().find(x => /kicked\.html/.test(x.url())); }
  await new Promise(r => setTimeout(r, 1200));
  const info = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map(x => ({ url: x.webContents.getURL().split('/').pop(), pid: x.webContents.getOSProcessId() })));
  const fs = require('fs'); const st = pid => { try { return (/State:\s+(\S)/.exec(fs.readFileSync(`/proc/${pid}/status`, 'utf8')) || [])[1] || '?'; } catch (e) { return 'gone'; } };
  let s0 = st(pid0); for (let i = 0; i < 20 && s0 !== 'gone' && s0 !== 'Z'; i++) { await new Promise(r => setTimeout(r, 250)); s0 = st(pid0); }
  const alive0 = !(s0 === 'gone' || s0 === 'Z');   /* Z = 끝났지만 부모가 아직 안 거둔 상태 (메모리는 이미 돌려줌) */
  console.log('  windows', JSON.stringify(info), 'old renderer pid', pid0, 'state', s0);
  ok(!!kw && info.length === 1 && /kicked\.html/.test(info[0].url) && info[0].pid !== pid0, '끊긴 창: 게임 창을 닫고 안내 창 1개만 (새 프로세스)');
  ok(!alive0, '예전 게임 창 프로세스가 끝나 메모리를 돌려줌');
  const txt = await kw.evaluate(() => document.body.innerText); ok(/메모리를 비웠어요/.test(txt), '안내 창 문구');
  // ④ 다시 접속하기 → 게임 처음 화면
  await kw.click('#re'); await kw.waitForSelector('#lg-mode', { state: 'attached', timeout: 60000 }); ok(/index\.html/.test(kw.url()), '다시 접속하기 → 게임 처음 화면');
  // ⑤ 닫기: 게임 창이면 저장 시간(최대 4초) 뒤 앱 종료
  const tc = Date.now(); const closed = new Promise(r => app.on('close', r)); await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close()); await Promise.race([closed, new Promise(r => setTimeout(r, 10000))]);
  ok(Date.now() - tc < 9000, `창 닫기 → 앱 종료 (${((Date.now() - tc) / 1000).toFixed(1)}초)`);
  try { await app.close(); } catch (e) {} })().catch(e => { console.log('FAIL 오류', e.message); process.exitCode = 1; process.exit(1); });
