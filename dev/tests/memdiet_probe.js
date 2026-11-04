// 11/4 메모리 다이어트: 사냥 중 메모리가 어디에 쓰이는지 나눠 봄 (그림·캔버스·소리·DOM + 크롬 memory-infra 덤프)
//   KT_PORT=8901 KT_TO=900 bash dev/runkt.sh dev/tests/memdiet_probe.js
//   MW=1280 MH=760 MD=1 (화면·배율) · MZ=23 (지역) · MT=75 (자동사냥 초) · MOUT=dev/out/memdiet_probe.json
const { chromium } = require('playwright'); const login = require('../tq.js'); const fs = require('fs');
const W = +(process.env.MW || 1280), H = +(process.env.MH || 760), DPR = +(process.env.MD || 1), Z = +(process.env.MZ || 23), SEC = +(process.env.MT || 75), OUT = process.env.MOUT || 'dev/out/memdiet_probe.json';
const INIT = () => { const R = window.__PRB = { cv: [], img: [], ab: [], bm: [], el: [] }; const site = () => { const s = (new Error().stack || '').split('\n').slice(3, 6).map(x => { const m = /(\w+)? ?\(?[^()]*?(?:_kt2|game)\.js:(\d+):(\d+)/.exec(x); return m ? (m[1] || '?') + ':' + m[2] : ''; }).filter(Boolean); return s.join('<') || '?'; };
  const ce = Document.prototype.createElement; Document.prototype.createElement = function (t, ...r) { const e = ce.call(this, t, ...r); const n = String(t).toLowerCase(); if (n === 'canvas') R.cv.push({ r: new WeakRef(e), s: site() }); else if (n === 'audio' || n === 'video') R.el.push({ r: new WeakRef(e), s: site() }); return e; };
  if (window.OffscreenCanvas) { const O = window.OffscreenCanvas; window.OffscreenCanvas = function (w, h) { const e = new O(w, h); R.cv.push({ r: new WeakRef(e), s: 'Offscreen<' + site() }); return e; }; window.OffscreenCanvas.prototype = O.prototype; }
  const gc = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (k, o) { this.__ctx = k; return gc.call(this, k, o); };
  const D = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src'); Object.defineProperty(HTMLImageElement.prototype, 'src', { configurable: true, get: D.get, set(v) { if (v && !this.__prb) { this.__prb = 1; R.img.push({ r: new WeakRef(this), s: site() }); } D.set.call(this, v); } });
  const A0 = window.Audio; window.Audio = function (...a) { const e = new A0(...a); R.el.push({ r: new WeakRef(e), s: 'Audio<' + site() }); return e; }; window.Audio.prototype = A0.prototype;
  const AC = window.AudioContext || window.webkitAudioContext; if (AC) { const d0 = AC.prototype.decodeAudioData; AC.prototype.decodeAudioData = function (buf, ok, no) { const s = site(); const keep = x => { R.ab.push({ r: new WeakRef(x), s, mb: x.length * x.numberOfChannels * 4 / 1048576, sec: x.duration, ch: x.numberOfChannels, sr: x.sampleRate }); return x; }; const p = d0.call(this, buf, x => { keep(x); ok && ok(x); }, no); return p && p.then ? p.then(x => x) : p; }; }
  if (window.__MSHIM) { const BM = new WeakMap(), PEND = new WeakSet(), D0 = CanvasRenderingContext2D.prototype.drawImage; R.shim = { n: 0, mb: 0 };   /* what-if: 큰 <img>는 ImageBitmap으로 바꿔 그림 */
    CanvasRenderingContext2D.prototype.drawImage = function (s, ...a) { if (s instanceof HTMLImageElement && s.complete && s.naturalWidth * s.naturalHeight > 1e6 && !/^data:/.test(s.src)) { const b = BM.get(s); if (b) return D0.call(this, b, ...a); if (!PEND.has(s)) { PEND.add(s); fetch(s.src).then(r => r.blob()).then(x => createImageBitmap(x)).then(x => { BM.set(s, x); R.shim.n++; R.shim.mb += x.width * x.height * 4 / 1048576; }).catch(() => {}); } return; } return D0.call(this, s, ...a); }; }
  if (window.createImageBitmap) { const c0 = window.createImageBitmap; window.createImageBitmap = function (...a) { const s = site(); return c0.apply(this, a).then(b => { R.bm.push({ r: new WeakRef(b), s }); return b; }); }; } };
const SNAP = () => { const R = window.__PRB, by = {}, add = (cat, s, mb, n = 1) => { const k = cat + ' ' + s; const o = by[k] || (by[k] = { cat, s, mb: 0, n: 0 }); o.mb += mb; o.n += n; };
  const tot = { canvas: 0, canvasDom: 0, img: 0, imgN: 0, audio: 0, bitmap: 0, el: 0 };
  const dom = new Set(document.querySelectorAll('canvas'));
  for (const q of R.cv) { const e = q.r.deref(); if (!e) continue; const mb = e.width * e.height * 4 / 1048576; if (!mb) continue; const live = e.__ctx || e instanceof OffscreenCanvas; if (!live) continue; add(dom.has(e) ? 'canvas(DOM)' : 'canvas', q.s, mb); tot[dom.has(e) ? 'canvasDom' : 'canvas'] += mb; dom.delete(e); }
  for (const e of dom) { const mb = e.width * e.height * 4 / 1048576; if (e.__ctx) { add('canvas(DOM)', '#' + (e.id || e.className || '?'), mb); tot.canvasDom += mb; } }
  for (const q of R.img) { const e = q.r.deref(); if (!e || !e.naturalWidth) continue; const mb = e.naturalWidth * e.naturalHeight * 4 / 1048576; add('img', q.s, mb); tot.img += mb; tot.imgN++; }
  for (const q of R.ab) { const e = q.r.deref(); if (!e) continue; add('audio', q.s, q.mb); tot.audio += q.mb; }
  for (const q of R.bm) { const e = q.r.deref(); if (!e || !e.width) continue; const mb = e.width * e.height * 4 / 1048576; add('bitmap', q.s, mb); tot.bitmap += mb; }
  for (const q of R.el) { const e = q.r.deref(); if (!e) continue; add('media-el', q.s + (e.src ? ' ' + e.src.split('/').pop() : ''), 0); tot.el++; }
  for (const k in tot) tot[k] = Math.round(tot[k]);
  const top = Object.values(by).sort((a, b) => b.mb - a.mb).slice(0, 30).map(o => ({ cat: o.cat, s: o.s, mb: Math.round(o.mb * 10) / 10, n: o.n }));
  const bigAudio = R.ab.filter(q => q.r.deref()).map(q => ({ s: q.s, mb: Math.round(q.mb), sec: Math.round(q.sec), ch: q.ch, sr: q.sr })).filter(x => x.mb >= 2);
  const sfxAudio = R.ab.filter(q => q.r.deref() && q.mb < 2); const sfx = { n: sfxAudio.length, mb: Math.round(sfxAudio.reduce((s, q) => s + q.mb, 0) * 10) / 10, ch: [...new Set(sfxAudio.map(q => q.ch))], sr: [...new Set(sfxAudio.map(q => q.sr))] };
  const domCount = {}; for (const el of document.body.children) { const n = el.getElementsByTagName('*').length + 1; if (n > 20) domCount[el.id || el.tagName] = n; }
  return { shim: R.shim, tot, top, bigAudio, sfx, dom: document.getElementsByTagName('*').length, domBig: domCount, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, mem: window.__T && __T.MEM_ ? __T.MEM_() : null }; };
async function infra(bcdp) {   // 크롬 memory-infra: 프로세스별 큰 덩어리(malloc·partition_alloc·v8·skia·cc·gpu·discardable·web_cache …)
  await bcdp.send('Tracing.start', { transferMode: 'ReturnAsStream', traceConfig: { includedCategories: ['disabled-by-default-memory-infra'], excludedCategories: ['*'], memoryDumpConfig: { triggers: [] } } });
  const r = await bcdp.send('Tracing.requestMemoryDump', { deterministic: true, levelOfDetail: 'detailed' }).catch(e => ({ err: String(e) }));
  const done = new Promise(res => bcdp.once('Tracing.tracingComplete', res)); await bcdp.send('Tracing.end'); const { stream } = await done; let s = '';
  for (;;) { const c = await bcdp.send('IO.read', { handle: stream, size: 1 << 20 }); s += c.base64Encoded ? Buffer.from(c.data, 'base64').toString() : c.data; if (c.eof) break; } await bcdp.send('IO.close', { handle: stream });
  let J; try { J = JSON.parse(s); } catch (e) { return { err: 'parse ' + e.message, ok: r }; } const EV = J.traceEvents || J; const pname = {}, out = {};
  for (const e of EV) if (e.ph === 'M' && e.name === 'process_name') pname[e.pid] = e.args.name; else if (e.ph === 'M' && e.name === 'process_labels') pname[e.pid] = (pname[e.pid] || '') + ' ' + e.args.labels;
  for (const e of EV) { if (e.ph !== 'v' || !e.args || !e.args.dumps) continue; const A = e.args.dumps.allocators || {}, P = e.args.dumps.process_totals || {}; const o = out[(pname[e.pid] || 'pid') + ':' + e.pid] = { rss: P.resident_set_bytes ? Math.round(parseInt(P.resident_set_bytes, 16) / 1048576) : null, top: {}, sub: {} };
    const sz = d => { const a = d && d.attrs || {}; const v = a.effective_size || a.size; return v ? parseInt(v.value, 16) / 1048576 : 0; };
    for (const k in A) { const parts = k.split('/'), m = sz(A[k]); if (parts.length === 1) o.top[k] = Math.round(m * 10) / 10; else if (parts.length <= 3 && m >= 3 && !/0x|\d{4,}/.test(k)) o.sub[k] = Math.round(m * 10) / 10; } }
  return out; }
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const bcdp = await b.newBrowserCDPSession();
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR }); if (process.env.MSHIM) await ctx.addInitScript(() => { window.__MSHIM = 1; }); await ctx.addInitScript(INIT); const p = await ctx.newPage(), cdp = await ctx.newCDPSession(p); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const rss = async () => { const { processInfo } = await bcdp.send('SystemInfo.getProcessInfo'); const o = {}; for (const q of processInfo) { let kb = 0; try { kb = +(/VmRSS:\s+(\d+)/.exec(fs.readFileSync(`/proc/${q.id}/status`, 'utf8')) || [])[1] || 0; } catch (e) {} o[q.type] = (o[q.type] || 0) + Math.round(kb / 1024); } return o; };
  const L = [], snap = async tag => { try { await cdp.send('HeapProfiler.collectGarbage'); } catch (e) {} await p.waitForTimeout(800); const r = await rss(), j = await p.evaluate(SNAP), mi = process.env.MINFRA === '0' ? null : await infra(bcdp);
    const row = { tag, cfg: `${W}x${H}@${DPR}`, renderer: r.renderer, gpu: r.GPU || r.gpu || 0, sum: (r.renderer || 0) + (r.GPU || r.gpu || 0), ...j, infra: mi }; L.push(row);
    console.log(`== ${tag}: renderer ${row.renderer} + gpu ${row.gpu} = ${row.sum} MB · heap ${row.heap} · dom ${row.dom} · tot ${JSON.stringify(row.tot)}`); for (const t of row.top.slice(0, 14)) console.log(`   ${t.mb}MB ${t.cat} ${t.s} ×${t.n}`); console.log('   bgm', JSON.stringify(row.bigAudio), 'sfx', JSON.stringify(row.sfx));
    if (mi) for (const k in mi) if (/renderer|Renderer|GPU|gpu/i.test(k)) { console.log('   infra', k, 'rss', mi[k].rss, JSON.stringify(mi[k].top)); const subs = Object.entries(mi[k].sub).sort((a, b) => b[1] - a[1]).slice(0, 16); console.log('     sub', JSON.stringify(Object.fromEntries(subs))); }
    fs.writeFileSync(OUT, JSON.stringify(L, null, 1)); return row; };
  await login(p, { cls: 'knight', name: 'mprb' }); await p.mouse.click(Math.round(W / 2), Math.round(H / 2 - 80)); await p.waitForTimeout(6000); await snap('town');
  await p.evaluate(() => { const T = __T; document.getElementById('gp-lv').value = 61; document.getElementById('gp-apply').click(); T.GOD_INV = true; T.BUFF.invis = 0; });
  await p.evaluate(z => __T.TOWN.toZone(z), Z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', Z, { timeout: 90000 });
  await p.evaluate(() => { const T = __T; T.AUTO.setCfg({ loot: true, retHp: 0, lowPot: false, sell: false, refillHome: false }); if (!T.AUTO.on()) T.AUTO.toggle(); });
  if (process.env.MSN) { let t = 0; for (const s of process.env.MSN.split(',').map(Number)) { await p.waitForTimeout((s - t) * 1000); t = s; await snap('zone' + Z + ' hunt ' + s + 's'); } }   /* 여러 번 (예: MSN=60,240,480) */
  else { await p.waitForTimeout(SEC * 1000); await snap('zone' + Z + ' hunt ' + SEC + 's'); }
  console.log(errs.slice(0, 5).join('\n') || 'no errors'); await b.close(); })();
