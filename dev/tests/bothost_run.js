// 11/1 봇 서버 러너(server/bothost/run.js) smoke — 로컬 테스트 서버(_kt2.html)에 지역 8개 페이지를 열고 헬스체크 2회 통과 · 버전 바뀜 재시작 · SIGTERM 종료
//   KT_PORT=8785 bash dev/runkt.sh dev/tests/bothost_run.js
const { chromium } = require('playwright'); const login = require('../tq.js'); const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
const PORT = process.env.KT_PORT || 8766, R = path.resolve(__dirname, '..', '..'), OUT = path.join(R, 'dev', 'out'), ZONES = [2, 4, 6, 8, 10, 12, 17, 23];
(async () => {
  // 봇 호스트 계정(로컬 계정 · 캐릭터 1개)을 만들어 storageState로 저장 — 러너가 새 컨텍스트에서 쓰게
  { const br = await chromium.launch({ args: ['--disable-gpu', '--mute-audio'] }); const ctx = await br.newContext(); const p = await ctx.newPage(); await login(p, { acc: 'bhrun', cls: 'wizard', name: 'BotHostW', mp: true }); await ctx.storageState({ path: path.join(OUT, 'bh_state.json') }); await br.close(); }
  const verFile = path.join(OUT, 'bh_ver.json'); fs.writeFileSync(verFile, JSON.stringify({ ver: 205 }));
  const verNow = +(/const GAME_VER = (\d+)/.exec(fs.readFileSync(path.join(R, 'src', 'game.js'), 'utf8')) || [])[1]; fs.writeFileSync(verFile, JSON.stringify({ ver: verNow }));
  const cfg = { url: `http://127.0.0.1:${PORT}/_kt2.html?mp=bc`, account: 'bhrun', password: 'abcd', zones: ZONES, healthSec: 10, versionSec: 15, memCapMB: 6000, shareProcess: true, versionUrl: `http://127.0.0.1:${PORT}/dev/out/bh_ver.json`, storageState: 'bh_state.json', badSec: 30, killStray: false };
  fs.writeFileSync(path.join(OUT, 'bh_config.json'), JSON.stringify(cfg, null, 1));
  const lines = []; const ch = spawn('node', [path.join(R, 'server', 'bothost', 'run.js'), '--config', path.join(OUT, 'bh_config.json')], { cwd: R, env: Object.assign({}, process.env) });
  let buf = ''; const onData = d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); lines.push(l); if (/\[health\]|\[restart\]|\[ver\]|입장|\[stop\]|로그인|fatal|err/.test(l)) console.log('  run.js>', l.slice(0, 260)); } };
  ch.stdout.on('data', onData); ch.stderr.on('data', onData);
  const waitFor = (re, n, ms) => new Promise(res => { const t0 = Date.now(); const iv = setInterval(() => { const L = lines.filter(l => re.test(l)); if (L.length >= n || Date.now() - t0 > ms) { clearInterval(iv); res(L); } }, 500); });
  // ① 8개 입장
  const ent = await waitFor(/입장 완료/, 8, 240000); ok(ent.length === 8 && !lines.some(l => /입장 못 함/.test(l)), `① 지역 8개 페이지 입장 완료 (${ent.length}/8 · ${Math.round(process.uptime())}초)`);
  // ② 헬스체크 2회 통과 (모든 지역 host · ! 없음 · rss)
  const H = await waitFor(/\[health\]/, 2, 60000); const good = H.filter(l => !/!/.test(l) && ZONES.every(z => new RegExp(` ${z}:host b\\d+ m\\d+ \\d+Hz`).test(l)));
  ok(H.length >= 2 && good.length >= 2, `② 헬스체크 ${H.length}회 중 ${good.length}회 전부 정상 (지역 8개 host · 20Hz) ${(H[H.length - 1] || '').replace(/^\S+ \S+ /, '').slice(0, 200)}`);
  const rss = +((/rss (\d+)MB/.exec(H[H.length - 1] || '') || [])[1] || 0); ok(rss > 0 && rss < 2000, `② 러너가 잰 크로뮴 RSS ${rss}MB (8페이지)`);
  // ③ 버전이 오르면 전부 새로 시작 (version.json 의 ver +1)
  fs.writeFileSync(verFile, JSON.stringify({ ver: verNow + 1 })); const rs = await waitFor(/\[restart\] 게임 v\d+ → v\d+ 반영/, 1, 60000); ok(rs.length >= 1, '③ version.json 의 ver 가 오르면 [restart] ' + (rs[0] || '').slice(20, 120));
  const ent2 = await waitFor(/입장 완료/, 16, 240000); ok(ent2.length >= 16, `③ 재시작 뒤 8개 다시 입장 (${ent2.length - 8}/8)`);
  fs.writeFileSync(verFile, JSON.stringify({ ver: verNow }));
  // ④ SIGTERM → 브라우저 닫고 종료
  const code = await new Promise(res => { ch.on('exit', c => res(c)); ch.kill('SIGTERM'); setTimeout(() => { try { ch.kill('SIGKILL'); } catch (e) {} res(-1); }, 30000); });
  ok(code === 0 && lines.some(l => /\[stop\] SIGTERM/.test(l)), `④ SIGTERM 으로 정리 종료 (exit ${code})`);
  ok(!lines.some(l => /pageerror|\[fatal\]|\[unhandled\]/.test(l)), '⑤ 페이지 오류·치명 오류 없음 ' + JSON.stringify(lines.filter(l => /pageerror|\[fatal\]|\[unhandled\]/.test(l)).slice(0, 2)));
  console.log(fails ? `FAILS ${fails}` : 'ALL OK'); process.exit(fails ? 1 : 0); })().catch(e => { console.error(e); process.exit(2); });
