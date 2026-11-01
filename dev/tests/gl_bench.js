// 새 그래픽(WebGL) 30명 벤치마크 — python3 dev/mkkt.py && KT_PORT=8767 KT_TO=900 bash dev/runkt.sh dev/tests/gl_bench.js
//   장면(gl_scene.js): 화룡의 둥지 2구역 · 나 + 다른 유저 대역 29명(직업·장비 섞음 · 걷기/공격) + 몹 30(시트 몹 26 + 코드 그림 드래곤 플라이 4) + 0.1초마다 타격(번쩍임·피해 숫자) + 0.3초마다 마법 타격
//   판 4가지 (각각 새 페이지 · 같은 장면):
//     main   : origin/main 그대로 (dev/out/mainref — 비교 기준 · gl.js 없음)
//     off    : 이 갈래 · 새 그래픽 꺼짐 (= main과 같아야 함 · 회귀 확인)
//     gl     : 이 갈래 · 새 그래픽 켬 (WebGL2 → 헤드리스라 SwiftShader 소프트웨어 GL)
//     glcpu  : gl과 같은데 GPU 그리기 명령만 빼고(drawElements 생략) — 진짜 그래픽카드에서 '메인 스레드 CPU'가 얼마나 드는지 어림
//   잰 것: 게임 프레임 함수(rAF) 시간 평균·p90·최악 · 초당 프레임 · CPU 프로파일로 '그리기 비율'(메인 스레드) · 프로세스별 CPU(렌더러·GPU 프로세스)/프레임
//   ※ 헤드리스에는 GPU가 없어 WebGL이 SwiftShader(CPU로 흉내)로 돌아감 — GPU 쪽 숫자는 실제 PC와 전혀 다름(실제는 거의 0). 상대 비교만.
const { chromium } = require('playwright'); const S = require('./gl_scene.js'); const { execFileSync } = require('child_process'); const path = require('path'); const fs = require('fs');
const R = path.resolve(__dirname, '../..'), WIN = +(process.env.GLB_WIN || 8000), ONLY = (process.env.GLB_ONLY || '').split(',').filter(Boolean);
function mainRef() { const D = path.join(R, 'dev/out/mainref'); fs.mkdirSync(path.join(D, 'src'), { recursive: true }); fs.mkdirSync(path.join(D, 'dev'), { recursive: true });
  for (const f of ['src/game.js', 'index.html', 'src/map_data.js']) fs.writeFileSync(path.join(D, f), execFileSync('git', ['show', 'origin/main:' + f], { cwd: R, maxBuffer: 64 << 20 }));
  fs.copyFileSync(path.join(R, 'dev/mkkt.py'), path.join(D, 'dev/mkkt.py')); try { fs.symlinkSync(path.join(R, 'assets'), path.join(D, 'assets')); } catch (e) {}
  execFileSync('python3', [path.join(D, 'dev/mkkt.py')]); return '/dev/out/mainref/_kt2.html'; }
function analyze(pr) { const nodes = new Map(pr.nodes.map(n => [n.id, n])), par = new Map(); for (const n of pr.nodes) for (const c of n.children || []) par.set(c, n.id);
  const acc = {}, self = {}; let total = 0;
  for (let i = 0; i < pr.samples.length; i++) { const dt = (pr.timeDeltas[i] || 0) / 1000; let id = pr.samples[i]; const n0 = nodes.get(id); if (!n0 || n0.callFrame.functionName === '(idle)') continue; total += dt;
    const k0 = n0.callFrame.functionName + '@' + n0.callFrame.url.split('/').pop(); self[k0] = (self[k0] || 0) + dt; const seen = new Set();
    while (id !== undefined) { const n = nodes.get(id), k = n.callFrame.functionName + '@' + n.callFrame.url.split('/').pop(); if (!seen.has(k)) { seen.add(k); acc[k] = (acc[k] || 0) + dt; } id = par.get(id); } }
  const f = acc['frame@_kt2.js'] || 0, glf = acc['frame@gl.js'] || 0, draw = glf || ((acc['drawWorld@_kt2.js'] || 0) + (acc['drawUI@_kt2.js'] || 0) + (self['frame@_kt2.js'] || 0));
  const top = Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => k + ' ' + v.toFixed(0));
  return { busyMs: +total.toFixed(0), frameMs: +f.toFixed(0), drawMs: +draw.toFixed(0), drawShare: f ? +(draw / f * 100).toFixed(1) : 0, dw: +(acc['drawWorld@_kt2.js'] || 0).toFixed(0), du: +(acc['drawUI@_kt2.js'] || 0).toFixed(0), frameSelf: +(self['frame@_kt2.js'] || 0).toFixed(0), glEnd: +(acc['end@gl.js'] || 0).toFixed(0), gc: +((acc['(garbage collector)@'] || 0)).toFixed(0), top }; }
async function cpuNow(bs) { const { processInfo } = await bs.send('SystemInfo.getProcessInfo'); const o = {}; for (const q of processInfo) o[q.type] = (o[q.type] || 0) + q.cpuTime; return o; }
async function measure(b, p, bs, label) {
  const cdp = await p.context().newCDPSession(p); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
  await p.waitForTimeout(3000);   // 데우기 (텍스처 올리기 등) — GL은 텍스처 올리기가 끝날 때까지 (최근 5프레임 올린 픽셀 < 50만 · 최대 60초)
  if (label.startsWith('gl')) await p.waitForFunction(() => { const G = window.__gs; return G.length >= 5 && G.slice(-5).every(s => s.upPx < 5e5); }, null, { timeout: 60000, polling: 500 }).catch(() => console.log('  (데우기 시간 넘김)'));
  await p.evaluate(() => { window.__fr.length = 0; window.__iv.length = 0; window.__gs.length = 0; });
  const c0 = await cpuNow(bs); await cdp.send('Profiler.start'); await p.waitForTimeout(WIN); const { profile } = await cdp.send('Profiler.stop'); const c1 = await cpuNow(bs);
  const r = await p.evaluate(() => { const a = window.__fr.slice().sort((x, y) => x - y), iv = window.__iv.slice(1), n = a.length, G = window.__gs;
    const avgG = k => G.length ? +(G.reduce((s, x) => s + (x[k] || 0), 0) / G.length).toFixed(1) : null;
    return { n, avg: +(a.reduce((s, x) => s + x, 0) / n).toFixed(1), p90: +a[Math.floor(n * 0.9)].toFixed(1), max: +a[n - 1].toFixed(1), fps: +(1000 / (iv.reduce((s, x) => s + x, 0) / iv.length)).toFixed(1),
      gl: G.length ? { worldMs: avgG('ms'), batches: avgG('batches'), quads: avgG('quads'), img: avgG('img'), txt: avgG('txt'), txtNew: avgG('txtNew'), tUp: avgG('tUp'), tRun: avgG('tRun'), tTxt: avgG('tTxt'), ell: avgG('ell'), rect: avgG('rect'), path: avgG('path'), abs: avgG('abs'), runs: avgG('runs'), runKpx: +(avgG('runPx') / 1000).toFixed(0), up: avgG('up'), upKpx: +(avgG('upPx') / 1000).toFixed(0) } : null,
      info: window.GLR ? GLR.info() : null, peers: __T.NET.others().length, mobs: __T.foxes.length }; });
  const per = k => +(((c1[k] || 0) - (c0[k] || 0)) * 1000 / r.n).toFixed(1), tot = Object.keys(c1).reduce((s, k) => s + (c1[k] - (c0[k] || 0)), 0);
  r.cpu = { renderer: per('renderer'), gpu: per('GPU'), browser: per('browser'), total: +(tot * 1000 / r.n).toFixed(1) }; r.prof = analyze(profile); r.label = label;
  console.log(label.padEnd(6), JSON.stringify(r)); await cdp.detach(); return r; }
async function session(b, bs, { page, gl, modes }) { const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (/\[GL\]/.test(m.text())) errs.push(m.text()); });
  await p.addInitScript(gl => { try { localStorage.setItem('aden_gl', gl ? 'force' : '0');   /* force: 헤드리스의 소프트웨어 GL에서도 켬 */ } catch (e) {} const r0 = window.requestAnimationFrame; window.__fr = []; window.__iv = []; window.__gs = []; let last = 0;
    window.requestAnimationFrame = function (cb) { return r0.call(window, ts => { if (cb && cb.name === 'frame') { const a = performance.now(); if (last) window.__iv.push(a - last); last = a; cb(ts); window.__fr.push(performance.now() - a);
      if (window.GLR && GLR.on()) window.__gs.push(GLR.stats()); } else cb(ts); }); }; }, gl);
  const info = await S.setup(p, { chars: 30, mobs: 30, page }); console.log('scene', page || 'branch', JSON.stringify(info));
  const out = []; for (const m of modes) { await p.evaluate(m => { if (window.GLR) { GLR.set(m !== 'off' && m !== 'main'); GLR._dbg.nodraw = m === 'glcpu'; } }, m); out.push(await measure(b, p, bs, m)); }
  if (out.some(o => o.label === 'gl')) await p.screenshot({ path: 'dev/out/gl_bench_on.png' }).catch(() => {});
  console.log(errs.length ? 'ERRORS ' + errs.slice(0, 5).join(' | ') : 'no page errors'); await ctx.close(); return out; }
(async () => { const b = await chromium.launch({ args: S.ARGS }); const bs = await b.newBrowserCDPSession(); const res = [];
  const want = m => !ONLY.length || ONLY.includes(m);
  if (want('main')) res.push(...await session(b, bs, { page: mainRef(), gl: false, modes: ['main'] }));
  if (want('off')) res.push(...await session(b, bs, { gl: false, modes: ['off'] }));
  if (want('gl') || want('glcpu')) res.push(...await session(b, bs, { gl: true, modes: ['gl', 'glcpu'].filter(want) }));
  console.log('\n| 판 | fps | 프레임 함수 평균 / p90 / 최악 (ms) | 메인 스레드 그리기 비율 | 렌더러 CPU/프레임 | GPU 프로세스 CPU/프레임 | 전체 CPU/프레임 |');
  console.log('|---|---|---|---|---|---|---|');
  for (const r of res) console.log(`| ${r.label} | ${r.fps} | ${r.avg} / ${r.p90} / ${r.max} | ${r.prof.drawShare}% (${r.prof.drawMs}/${r.prof.frameMs} ms) | ${r.cpu.renderer} | ${r.cpu.gpu} | ${r.cpu.total} |`);
  for (const r of res) if (r.gl) console.log(r.label, 'GL 통계/프레임', JSON.stringify(r.gl));
  fs.writeFileSync(path.join(R, 'dev/out/gl_bench.json'), JSON.stringify(res, null, 1)); await b.close(); })();
