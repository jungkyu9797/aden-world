// 11/5 잊섬 프레임 드랍 진단 — 프레임당 drawImage·save/restore·filter·shadowBlur 횟수, 화면 몹 수, 색칠 캐시(tintFrame) 새로 만들기 횟수
//   python3 dev/mkkt.py && (진단 카운터 넣기) && LZ=25 KT_PORT=8792 bash dev/runkt.sh dev/tests/isleperf_probe.js
const { chromium } = require('playwright'); const login = require('../tq.js');
const Z = +(process.env.LZ || 25), SEC = +(process.env.LSEC || 4), VW = +(process.env.LVW || 1600), VH = +(process.env.LVH || 900);
(async () => { const b = await chromium.launch(process.env.LGPU ? { args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-accelerated-2d-canvas', '--enable-unsafe-swiftshader'] } : {}); const ctx = await b.newContext({ viewport: { width: VW, height: VH } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(new Function(`try{localStorage.setItem('aden_low','${process.env.LLOW || '1'}')}catch(e){}
    const P = CanvasRenderingContext2D.prototype, C = window.__cc = { di: 0, sv: 0, rs: 0, flt: 0, fltOn: 0, sb: 0, sbOn: 0, fill: 0, txt: 0, clip: 0, gco: 0, cvNew: 0 };
    for (const [m, k] of [['drawImage', 'di'], ['save', 'sv'], ['restore', 'rs'], ['fill', 'fill'], ['fillText', 'txt'], ['clip', 'clip']]) { const o = P[m]; P[m] = function () { C[k]++; return o.apply(this, arguments); }; }
    const fd = Object.getOwnPropertyDescriptor(P, 'filter'); Object.defineProperty(P, 'filter', { get() { return fd.get.call(this); }, set(v) { C.flt++; if (v && v !== 'none') C.fltOn++; fd.set.call(this, v); } });
    const sd = Object.getOwnPropertyDescriptor(P, 'shadowBlur'); Object.defineProperty(P, 'shadowBlur', { get() { return sd.get.call(this); }, set(v) { C.sb++; if (v > 0) C.sbOn++; sd.set.call(this, v); } });
    const gd = Object.getOwnPropertyDescriptor(P, 'globalCompositeOperation'); Object.defineProperty(P, 'globalCompositeOperation', { get() { return gd.get.call(this); }, set(v) { if (v !== 'source-over') C.gco++; gd.set.call(this, v); } });
    const ce = document.createElement.bind(document); document.createElement = function (t) { if (String(t).toLowerCase() === 'canvas') C.cvNew++; return ce.apply(document, arguments); };`));
  await login(p, { cls: 'knight', name: 'ipP' });
  await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 62; document.querySelectorAll('.gw').forEach(w => w.hidden = true); });
  await p.evaluate(z => __T.TOWN.toZone(z), Z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', Z, { timeout: 60000 });
  await p.waitForTimeout(3000);
  await p.evaluate(() => { try { if (!__T.AUTO.on()) __T.AUTO.toggle(); } catch (e) {} });
  await p.waitForTimeout(8000);
  const out = [];
  for (let r = 0; r < 3; r++) {
    const s = await p.evaluate(async sec => { const C = window.__cc; for (const k in C) C[k] = 0; window.__tfm = 0; window.__dmb = 0; window.__tfU = new Map(); const P = __T.PERF_; const n0 = performance.now(); let fr = 0; await new Promise(res => { const f = () => { fr++; if (performance.now() - n0 < sec * 1000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
      const st = P.stats(), T = __T, H = T.hero, vis = T.foxes.filter(f => !f.dead && !f.gone && Math.abs(f.i - H.i) <= 14 && Math.abs(f.j - H.j) <= 14).length, M = T.MEM_ ? T.MEM_() : {};
      const per = k => +(C[k] / fr).toFixed(1); return { raf: fr, fps: st.fps, draw: st.draw, upd: st.upd, slow: st.slowPct, mobsNear14: vis, dmbPerFrame: +((window.__dmb || 0) / fr).toFixed(1), tfMissPerSec: +((window.__tfm || 0) / sec).toFixed(1), di: per('di'), save: per('sv'), restore: per('rs'), fltSet: per('flt'), fltOn: per('fltOn'), sbOn: per('sbOn'), gco: per('gco'), fill: per('fill'), txt: per('txt'), clip: per('clip'), cvNewPerSec: +(C.cvNew / sec).toFixed(1), tfrN: M.tfrN, tfrMpx: M.tfrMpx, tintN: M.tintN, tintMpx: M.tintMpx, hp: H.hp, low: T.LOWG_ && T.LOWG_.on(), gpu: T.PERF_.gpuName(), usedKeys: window.__tfU.size, usedMpx: +([...window.__tfU.values()].reduce((a, b) => a + b, 0) / 1e6).toFixed(1) }; }, SEC);
    out.push(s); console.log(JSON.stringify(s));
  }
  console.log(errs.slice(0, 5).join('\n') || 'no errors'); await b.close(); })();
