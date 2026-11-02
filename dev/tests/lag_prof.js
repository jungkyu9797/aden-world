// 11/2 친구 PC 렉 — 실제 사냥 장면(원래 몹 · 밤 · 자동사냥 · 필드 봇)에서 fps · 프레임 시간 · 함수별 자기 시간
//   LZ=23(지역) LCPU=4(CPU 느리게 · 약한 PC 흉내) LBOT=1(봇 그대로) LSEC=6 KT_PORT=8791 bash dev/runkt.sh dev/tests/lag_prof.js
const { chromium } = require('playwright'); const login = require('../tq.js'); const fs = require('fs'); const path = require('path');
const Z = +(process.env.LZ || 23), CPU = +(process.env.LCPU || 4), SEC = +(process.env.LSEC || 6), BOT = process.env.LBOT !== '0', TAG = process.env.LTAG || '';
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: +(process.env.LDPR || 1) }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  if (process.env.LINIT) await p.addInitScript(new Function(process.env.LINIT));
  await login(p, { cls: 'knight', name: 'lagP' });
  await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 60; document.querySelectorAll('.gw').forEach(w => w.hidden = true); });
  await p.evaluate(z => __T.TOWN.toZone(z), Z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', Z, { timeout: 60000 });
  await p.waitForFunction(() => { const I = __T.ISLE, G = I && I.ground; return G && (G.baked || !(I.def.hills && I.def.hills.length)); }, null, { timeout: 90000, polling: 500 }).catch(() => {});
  if (!BOT) await p.evaluate(() => { const F = window.__FB; if (F) { F.DBG.noEnsure = true; for (const f of F.bots()) f.gone = true; } });
  await p.evaluate(() => { try { if (!__T.AUTO.on()) __T.AUTO.toggle(); } catch (e) {} });
  await p.waitForTimeout(6000);
  const cdp = await ctx.newCDPSession(p); if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  await p.waitForTimeout(1500);
  const fps = () => p.evaluate(sec => new Promise(r => { let n = 0; const L = [], t0 = performance.now(); let l = t0; const f = t => { n++; L.push(t - l); l = t; if (t - t0 < sec * 1000) requestAnimationFrame(f); else { L.sort((a, b) => a - b); r({ fps: +(n / ((t - t0) / 1000)).toFixed(1), p50: +L[L.length >> 1].toFixed(1), p90: +L[Math.floor(L.length * 0.9)].toFixed(1), max: +L[L.length - 1].toFixed(1) }); } }; requestAnimationFrame(f); }), SEC);
  const f1 = await fps();
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
  await p.waitForTimeout(SEC * 1000);
  const { profile } = await cdp.send('Profiler.stop'); const byId = new Map(profile.nodes.map(n => [n.id, n])), dt = profile.timeDeltas; const cnt = new Map(); let tot = 0;
  for (let i = 0; i < profile.samples.length; i++) { const id = profile.samples[i]; cnt.set(id, (cnt.get(id) || 0) + (dt[i] || 0)); }
  const self = new Map(); for (const [id, us] of cnt) { const n = byId.get(id), cf = n.callFrame, k = (cf.functionName || '(anon)') + ' ' + cf.url.split('/').pop() + ':' + (cf.lineNumber + 1); self.set(k, (self.get(k) || 0) + us); tot += us; }
  // 포함 시간(자식 포함): 부모 사슬 따라 올림
  const parent = new Map(); for (const n of profile.nodes) for (const c of (n.children || [])) parent.set(c, n.id); const incl = new Map();
  for (const [id, us] of cnt) { const seen = new Set(); let q = id; while (q != null) { const n = byId.get(q), cf = n.callFrame, k = (cf.functionName || '(anon)') + ' ' + cf.url.split('/').pop() + ':' + (cf.lineNumber + 1); if (!seen.has(k)) { seen.add(k); incl.set(k, (incl.get(k) || 0) + us); } q = parent.get(q); } }
  const info = await p.evaluate(() => ({ mobs: __T.foxes.filter(f => !f.dead && !f.gone).length, bots: window.__FB ? __FB.bots().length : 0, night: __T.DN && __T.DN.night ? __T.DN.night() : null, W: innerWidth, H: innerHeight, dpr: devicePixelRatio, parts: __T.parts ? __T.parts.length : null }));
  const top = [...self].sort((a, b) => b[1] - a[1]).slice(0, 28).map(([k, us]) => [k, +(us / tot * 100).toFixed(1)]);
  // 네이티브(drawImage·restore 등) 시간을 그것을 부른 게임 함수에 붙임
  const own = new Map(); for (const [id, us] of cnt) { let q = id, nat = ''; while (q != null && !byId.get(q).callFrame.url) { nat = nat || byId.get(q).callFrame.functionName; q = parent.get(q); } if (q == null) continue; const cf = byId.get(q).callFrame, k = (cf.functionName || '(anon)') + ':' + (cf.lineNumber + 1) + (nat ? ' [' + nat + ']' : ''); own.set(k, (own.get(k) || 0) + us); }
  const topO = [...own].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, us]) => [k, +(us / tot * 100).toFixed(1)]);
  const topI = [...incl].filter(([k]) => /_kt2\.js|game\.js|gl\.js/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, us]) => [k, +(us / tot * 100).toFixed(1)]);
  const r = { zone: Z, cpu: CPU, bots: BOT, fps: f1, info, top, topO, topI }; fs.writeFileSync(path.resolve(__dirname, `../out/lag_prof_${Z}${TAG}.json`), JSON.stringify(r, null, 1));
  console.log(JSON.stringify({ zone: Z, cpu: CPU, bots: BOT, fps: f1, info }));
  console.log('-- self %'); for (const t of top) console.log(' ', t[1], t[0]);
  console.log('-- own+native %'); for (const t of topO) console.log(' ', t[1], t[0]);
  console.log('-- incl % (game)'); for (const t of topI) console.log(' ', t[1], t[0]);
  console.log(errs.slice(0, 5).join('\n') || 'no errors'); await b.close(); })();
