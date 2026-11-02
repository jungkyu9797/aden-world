// 새 그래픽 켬일 때 CPU가 어디에 쓰이는지 (함수별 자기 시간) — GLZ=24 bash dev/runkt.sh dev/tests/gl_prof.js
//   장면을 멈추고 GLR._redraw(true)를 N번 → Chrome 프로파일러로 함수별 시간 상위 · 결과 dev/out/gl_prof_<지역>.json
const { chromium } = require('playwright'); const S = require('./gl_scene.js'); const fs = require('fs'); const path = require('path');
const Z = +(process.env.GLZ || 23), N = +(process.env.GLN || 30), GL = process.env.GLOFF ? false : true;
(async () => { const b = await chromium.launch({ args: S.ARGS }); const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.setItem('aden_gl', 'force'); localStorage.setItem('aden_gl_bloom', '0'); } catch (e) {} });
  await S.setup(p, { chars: +(process.env.GLC || 10), mobs: +(process.env.GLM || 30), fx: false, zone: Z }); await p.waitForTimeout(4000); await S.freeze(p);
  await p.evaluate(gl => { for (let i = 0; i < 3; i++) GLR._redraw(gl); }, GL);
  const cdp = await ctx.newCDPSession(p); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 100 }); await cdp.send('Profiler.start');
  const ms = await p.evaluate(([n, gl]) => { const t = performance.now(); for (let i = 0; i < n; i++) GLR._redraw(gl); return (performance.now() - t) / n; }, [N, GL]);
  const { profile } = await cdp.send('Profiler.stop'); const self = new Map(), byId = new Map(profile.nodes.map(n => [n.id, n])), dt = profile.timeDeltas; let tot = 0;
  const cnt = new Map(); for (let i = 0; i < profile.samples.length; i++) { const id = profile.samples[i]; cnt.set(id, (cnt.get(id) || 0) + (dt[i] || 0)); }
  for (const [id, us] of cnt) { const n = byId.get(id), cf = n.callFrame, k = (cf.functionName || '(anon)') + ' ' + cf.url.split('/').pop() + ':' + cf.lineNumber; self.set(k, (self.get(k) || 0) + us); tot += us; }
  const top = [...self].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, us]) => [k, Math.round(us / 1000 / N * 100) / 100, Math.round(us / tot * 1000) / 10]);
  const r = { zone: Z, gl: GL, msPerFrame: Math.round(ms * 10) / 10, top }; fs.writeFileSync(path.resolve(__dirname, `../out/gl_prof_${Z}${GL ? '' : '_2d'}.json`), JSON.stringify(r, null, 1));
  console.log(JSON.stringify({ zone: Z, ms: r.msPerFrame })); for (const t of top.slice(0, 22)) console.log(t.join('  ')); await b.close(); })();
