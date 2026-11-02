// 11/2 렉 줄이기 (친구 PC 영상): 저사양 그래픽 · 자동 전환 · /렉 진단 · UI 틀 캐시 · 게스트 몹 따라가기(호스트 속도)
//   KT_PORT=8791 bash dev/runkt.sh dev/tests/lag.js
const { chromium } = require('playwright'); const login = require('../tq.js');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch(); const errs = [];
  const ONLY = process.env.LONLY;
  if (!ONLY) // ---------- 1) ESC 버튼 · 화면 배율 · 그리기 초당 30번 · 입자 생략 · 타격 멈춤 없음 (화면 배율 2인 기기 흉내)
  { const ctx = await b.newContext({ viewport: { width: 1100, height: 680 }, deviceScaleFactor: 2 }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await login(p, { cls: 'knight', name: 'lagA' }); await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 60; });
    const b0 = await p.evaluate(() => { const e = document.getElementById('esc-low'); return e ? e.textContent : null; }); ok(b0 === '그래픽: 보통', 'ESC 버튼 [그래픽: 보통] — ' + b0);
    const d0 = await p.evaluate(() => ({ dpr: document.getElementById('cv').width / innerWidth, w: document.getElementById('cv').width, iw: innerWidth }));
    await p.evaluate(() => document.getElementById('esc-low').click()); await p.waitForTimeout(300);
    const d1 = await p.evaluate(() => ({ dpr: document.getElementById('cv').width / innerWidth, w: document.getElementById('cv').width, txt: document.getElementById('esc-low').textContent, ls: localStorage.getItem('aden_low'), on: __T.LOWG_.on() }));
    console.log('  dpr', JSON.stringify(d0), JSON.stringify(d1)); ok(d0.dpr === 2 && d1.dpr === 1 && d1.w === d0.iw && d0.w === d0.iw * 2, `배율 2 → 저사양 1 (캔버스 ${d0.w} → ${d1.w})`); ok(d1.on && d1.ls === '1' && d1.txt === '그래픽: 저사양 (렉 줄임)', '켬 저장 aden_low=1 · 버튼 글자');
    const sk = await p.evaluate(() => { const L = __T.LOWG_; const r = [L.skip(1e6), L.skip(1e6 + 10), L.skip(1e6 + 20), L.skip(1e6 + 30), L.skip(1e6 + 45), L.skip(1e6 + 60)]; r.push(L.skip(performance.now())); return r; });
    ok(JSON.stringify(sk) === '[false,true,true,false,true,false,false]', '그리기 간격 29ms 미만이면 건너뜀 ' + JSON.stringify(sk));
    // 화룡의 둥지 2구역: 재 가루·몸 불꽃 알갱이·반딧불 그리기 횟수 (저사양 켬/끔)
    await p.evaluate(() => __T.TOWN.toZone(23)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 23 && __T.SCENE === 'field', null, { timeout: 60000 }); await p.waitForTimeout(2500);
    const count = () => p.evaluate(() => new Promise(res => { const P = CanvasRenderingContext2D.prototype, K = ['arc', 'fillRect', 'drawImage'], O = {}, C = { fnFlame: 0, fireFx: 0, drawFlies: 0, ornate0: 0, all: 0 }; let n = 0;
      for (const k of K) { O[k] = P[k]; P[k] = function () { C.all++; const s = new Error().stack; for (const f of ['fnFlame', 'fireFx', 'drawFlies', 'ornate0']) if (s.includes('at ' + f + ' ') || s.includes('at Object.' + f + ' ')) C[f]++; return O[k].apply(this, arguments); }; }
      const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2500) requestAnimationFrame(f); else { for (const k of K) P[k] = O[k]; const o = {}; for (const k in C) o[k] = +(C[k] / n).toFixed(1); o.frames = n; res(o); } }; requestAnimationFrame(f); }));
    // 몸 불꽃 몹 하나를 내 옆에 (fn_warrior · S.flame)
    await p.evaluate(() => { const T = __T, H = T.hero; for (let q = 0; q < 3; q++) { const m = T.mkMob('fn_warrior', H.i + 1 + q, H.j + 1); m.home = [m.i, m.j]; m.aggro = false; T.MOB.fn_warrior.passive = true; T.foxes.push(m); } });
    const cLow = await count(); await p.evaluate(() => document.getElementById('esc-low').click()); await p.waitForTimeout(300); const cHi = await count();
    console.log('  calls/frame low', JSON.stringify(cLow), '· normal', JSON.stringify(cHi));
    ok(cLow.fnFlame < cHi.fnFlame * 0.3 && cHi.fnFlame > 50, `몸 불꽃 (빛만 남김): 저사양 ${cLow.fnFlame} · 보통 ${cHi.fnFlame}`); ok(cLow.fireFx <= 10 && cHi.fireFx > 50, `재 가루: 저사양 ${cLow.fireFx} · 보통 ${cHi.fireFx}`);
    ok(cLow.all < cHi.all * 0.7, `한 번 그릴 때 그리기 수 ${cLow.all} / ${cHi.all} (저사양은 그리기도 초당 30번)`); ok(cHi.ornate0 === 0, `UI 금장 틀은 그려 둔 그림으로 (ornate0 직접 그리기 ${cHi.ornate0}/프레임)`);
    ok(await p.evaluate(() => localStorage.getItem('aden_low') === '0' && !__T.LOWG_.on()), '끔 저장 aden_low=0');
    // 타격 멈춤: 보통이면 치명타에 멈춤 · 저사양이면 없음
    const hf = await p.evaluate(() => { const T = __T, H = T.HF_, f = T.foxes.find(q => !q.dead && T.MOB[q.kind] && !T.MOB[q.kind].boss); H.tick(1); H.hit(f, true, true); const a = H.tick(0.001); H.tick(1); document.getElementById('esc-low').click(); H.hit(f, true, true); const b = H.tick(0.001); document.getElementById('esc-low').click(); return [a, b]; });
    ok(hf[0] === true && hf[1] === false, '타격 멈춤: 보통 있음 · 저사양 없음 ' + JSON.stringify(hf));
    // /렉 진단
    await p.evaluate(() => { const e = document.getElementById('chat-in'); e.value = '/렉'; __T.CHAT.send(); }); await p.waitForTimeout(800);
    const lg = await p.evaluate(() => __T.log.slice(-6).map(l => l.t || l.text || String(l)).join('\n'));
    ok(/렉 진단\] 초당 프레임 [\d.]+/.test(lg) && /그래픽카드: /.test(lg) && /몬스터 계산: 내 컴퓨터/.test(lg), '/렉 진단 4줄'); const bx = await p.evaluate(() => { const e = document.getElementById('lag-diag'); return e ? e.textContent : null; }); ok(!!bx && /초당 프레임/.test(bx) && bx.split('\n').length === 5, '/렉 진단 상자 (찍어서 보내기용)'); console.log(lg.split('\n').map(x => '    ' + x).join('\n'));
    await p.screenshot({ path: 'dev/out/lag_diag.png' }); await ctx.close(); }
  if (!ONLY) // ---------- 2) 자동 전환: 웹드라이버가 아닌 척 + 프레임마다 60ms 바쁘게 → 20초 뒤 저사양 자동 · 다시 열어도 유지
  { const ctx = await b.newContext({ viewport: { width: 900, height: 600 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }); });
    await login(p, { cls: 'knight', name: 'lagB', init: () => {} }); await p.evaluate(() => { __T.GOD_INV = true; });
    ok(await p.evaluate(() => __T.LOWG_.auto() && !__T.LOWG_.on()), '처음: 자동 감시 중 · 꺼짐');
    await p.evaluate(() => { const r0 = requestAnimationFrame; window.requestAnimationFrame = cb => r0(t => { const a = performance.now(); while (performance.now() - a < 60) {} cb(t); }); });
    await p.waitForFunction(() => __T.LOWG_.on(), null, { timeout: 45000, polling: 500 }).catch(() => {});
    const a = await p.evaluate(() => ({ on: __T.LOWG_.on(), ls: localStorage.getItem('aden_low'), msg: __T.log.slice(-8).map(l => l.t || l.text || '').filter(t => /저사양 그래픽으로 바꿨어요/.test(t)).length, cn: (document.getElementById('cnote') || {}).textContent || '' }));
    ok(a.on && a.ls === 'a' && a.msg > 0 && /저사양/.test(a.cn), `느리면 자동으로 저사양 (aden_low=${a.ls} · 채팅 ${a.msg} · 가운데 안내)`);
    await p.reload(); await p.waitForSelector('#lg-mode', { state: 'visible' }); ok(await p.evaluate(() => typeof LOWG === 'undefined' ? null : null) === null && await p.evaluate(() => localStorage.getItem('aden_low')) === 'a', '다시 열어도 자동 저사양 유지(저장)');
    await ctx.close(); }
  // ---------- 3) 게스트 몹 따라가기: 가짜 호스트(BroadcastChannel)가 0.1초마다 위치를 보냄 — 대각선 초당 6칸으로 왕복하는 몹
  { const ctx = await b.newContext({ viewport: { width: 900, height: 600 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await login(p, { cls: 'knight', name: 'lagG', mp: true }); await p.evaluate(() => { __T.GOD_INV = true; __T.BUFF.invis = 9999; });
    await p.evaluate(() => __T.TOWN.toZone(1)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 1 && __T.SCENE === 'field', null, { timeout: 60000 }); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => new Promise(res => { const T = __T, H = T.hero, ki = Object.keys(T.MOB).indexOf('wolf') >= 0 ? Object.keys(T.MOB).indexOf('wolf') : Object.keys(T.MOB).findIndex(k => !T.MOB[k].boss && T.MOB[k].hp > 0), z = 'isle' + T.ISLE.id;
      const x0 = H.x + 2, z0 = H.z + 2, SP = 6 / Math.SQRT2, ch = new BroadcastChannel('aden-mp'), t0 = performance.now(), truth = t => { const u = ((t / 1000) * SP) % 17, s = u < 8.5 ? u : 17 - u; return [x0 + s, z0 + s]; };   // 대각선 초당 6칸 (광폭·이동 속도 빠른 몹·봇 · 대각선 12칸 가서 되돌아옴)
      const send = () => { const t = performance.now() - t0, [x, y] = truth(t); ch.postMessage({ t: 'p', peer: '0host', presence: { n: '가짜호스트', c: 'knight', lv: 50, z, x: H.x + 6, y: H.z + 6, hp: 100, hm: 100, m: [[990, ki, Math.round(x * 10), Math.round(y * 10), 1, 100, 4]], mz: z, d: {}, gi: [], go: [] } }); };
      const iv = setInterval(send, 100); send(); let jumps = 0, maxLag = 0, n = 0, prev = null, warm = 0;
      const tick = () => { const f = T.foxes.find(q => q.uid === 990); const t = performance.now() - t0;
        if (f) { if (prev && Math.hypot(f.x - prev[0], f.z - prev[1]) > 1.0) jumps++; prev = [f.x, f.z]; if (t > 1500) { const [tx, tz] = truth(t - 100); maxLag = Math.max(maxLag, Math.hypot(f.x - tx, f.z - tz)); n++; } }
        if (t < 9000) requestAnimationFrame(tick); else { clearInterval(iv); res({ seen: !!f, guest: T.NET.hostInfo ? T.NET.hostInfo().guest : true, jumps, maxLag: +maxLag.toFixed(2), n, nv: f ? +(f.nv || 0).toFixed(2) : null }); } };
      requestAnimationFrame(tick); }));
    console.log('  guest follow', JSON.stringify(r));
    ok(r.seen && r.guest, '가짜 호스트의 몹을 게스트로 받음'); ok(r.jumps === 0, `순간이동(한 프레임 1칸 넘게) ${r.jumps}번`); ok(r.maxLag < 1.6, `뒤처짐 최대 ${r.maxLag}칸 (호스트 0.1초 전 위치 기준)`);
    await ctx.close(); }
  console.log(errs.length ? 'PAGE ERRORS\n' + errs.slice(0, 8).join('\n') : 'no page errors'); if (errs.length) process.exitCode = 1; await b.close(); })();
