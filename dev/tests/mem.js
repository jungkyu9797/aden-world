// 11/2 메모리 (프로듀서 작업 관리자: Electron 1.45GB) — 단계마다 렌더러·GPU 프로세스 메모리(RSS) · JS 힙 · 배경음 디코딩 크기 · 받은 그림 수·풀었을 때 크기
//   KT_PORT=8791 bash dev/runkt.sh dev/tests/mem.js        (MZ="23,24,12,4" 들를 지역 · MCYC=2 몇 바퀴)
const { chromium } = require('playwright'); const login = require('../tq.js'); const fs = require('fs');
const ZS = (process.env.MZ || '23,24,12,4,17,6,2,8').split(',').map(Number), CYC = +(process.env.MCYC || 1);
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const ctx = await b.newContext({ viewport: { width: 1280, height: 760 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { const M = window.__MEM = { audio: 0, audioN: 0, img: new Set() };
    const AC = window.AudioContext || window.webkitAudioContext; if (AC) { const d0 = AC.prototype.decodeAudioData; AC.prototype.decodeAudioData = function (buf, ok, no) { const r = d0.call(this, buf, x => { M.audio += x.length * x.numberOfChannels * 4; M.audioN++; ok && ok(x); }, no); return r; }; }
    const D = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src'); Object.defineProperty(HTMLImageElement.prototype, 'src', { configurable: true, get: D.get, set(v) { if (v) M.img.add(this); D.set.call(this, v); } }); });
  const cdp = await ctx.newCDPSession(p), bcdp = await b.newBrowserCDPSession();
  const rss = async () => { const { processInfo } = await bcdp.send('SystemInfo.getProcessInfo'); const o = {}; for (const q of processInfo) { let kb = 0; try { kb = +(/VmRSS:\s+(\d+)/.exec(fs.readFileSync(`/proc/${q.id}/status`, 'utf8')) || [])[1] || 0; } catch (e) {} o[q.type] = (o[q.type] || 0) + Math.round(kb / 1024); } return o; };
  const L = [];
  const snap = async (tag, gc) => { if (gc) { try { await cdp.send('HeapProfiler.collectGarbage'); } catch (e) {} await p.waitForTimeout(500); }
    const r = await rss(), j = await p.evaluate(() => { const M = window.__MEM; let dec = 0, n = 0, done = 0; for (const i of M.img) { n++; if (i.naturalWidth) { done++; dec += i.naturalWidth * i.naturalHeight * 4; } }
      const Z = window.__T && __T.ISLAND && __T.ISLAND.zones ? __T.ISLAND.zones() : null;
      const C = __T.MEM_ ? __T.MEM_() : null;
      return { caches: C, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, audioMB: Math.round(M.audio / 1048576), audioN: M.audioN, imgs: n, imgsLoaded: done, imgDecMB: Math.round(dec / 1048576), grounds: Z }; });
    const row = { tag, renderer: r.renderer, gpu: r.GPU || r.gpu || 0, browser: r.browser, ...j }; L.push(row); console.log(JSON.stringify(row)); return row; };
  await login(p, { cls: 'knight', name: 'memA' }); await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 60; }); await p.waitForTimeout(4000);
  const s0 = await snap('town (클릭 전)', true);
  await p.mouse.click(640, 300); await p.keyboard.press('Shift'); await p.waitForTimeout(8000); const s1 = await snap('town (첫 클릭 뒤 · 배경음 켜짐)', true);
  for (let c = 0; c < CYC; c++) for (const z of ZS) { await p.evaluate(z => __T.TOWN.toZone(z), z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', z, { timeout: 60000 }).catch(() => {}); await p.waitForTimeout(+(process.env.MWAIT || 6000)); await snap(`zone ${z}` + (CYC > 1 ? ` #${c + 1}` : ''), false); }
  await p.evaluate(() => __T.TOWN.goTown && __T.TOWN.goTown()); await p.waitForTimeout(5000); const sE = await snap('town (끝 · GC)', true);
  fs.writeFileSync('dev/out/mem.json', JSON.stringify(L, null, 1));
  console.log(`\n요약: 렌더러 ${s0.renderer} → 첫 클릭 ${s1.renderer} → 끝 ${sE.renderer} MB · 배경음 PCM ${sE.audioMB}MB(${sE.audioN}곡) · 그림 ${sE.imgsLoaded}/${sE.imgs}장 풀면 ${sE.imgDecMB}MB · JS 힙 ${sE.heap}MB`);
  if (process.env.MLIM) { const [a, i] = process.env.MLIM.split(',').map(Number); ok(sE.audioMB <= a, `배경음 PCM ${sE.audioMB}MB ≤ ${a}`); ok(sE.imgDecMB <= i, `받은 그림 풀면 ${sE.imgDecMB}MB ≤ ${i}`); }
  console.log(errs.slice(0, 5).join('\n') || 'no errors'); await b.close(); })();
