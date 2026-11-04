// 11/4 메모리 다이어트 확인: 배경음은 트는 곡만 풀어 둠(바꾸기·반복·끄기·보스 전환 그대로) · 아이콘·초상·카드 그림은 작은 한 칸만(예전과 같은 그림) · decode() 사본 없음 · 채팅 기록 DOM이 끝없이 늘지 않음 · 사냥 중 메모리(RSS)
//   KT_PORT=8901 KT_TO=900 bash dev/runkt.sh dev/tests/memdiet.js        (MRSS=1 이면 화둥 2구역 75초 사냥 뒤 렌더러·GPU 메모리도 찍음 · MBASE=<MB> 이면 그보다 적은지)
const { chromium } = require('playwright'); const login = require('../tq.js'); const fs = require('fs');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const INIT = () => { const R = window.__MD = { ab: [], src: [], dec: 0, imgDecode: 0, bmp: 0 };
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) { const d0 = AC.prototype.decodeAudioData; AC.prototype.decodeAudioData = function (buf, a, c) { R.dec++; return d0.call(this, buf, x => { R.ab.push({ r: new WeakRef(x), d: x.duration }); a && a(x); }, c); };
    const st = AudioBufferSourceNode.prototype.start, sp = AudioBufferSourceNode.prototype.stop; AudioBufferSourceNode.prototype.start = function (...a) { if (this.buffer && this.buffer.duration > 30) R.src.push({ n: new WeakRef(this), d: this.buffer.duration, loop: this.loop, at: performance.now(), stopped: false }); return st.apply(this, a); };   /* WeakRef: 시험이 곡을 붙잡지 않게 */
    AudioBufferSourceNode.prototype.stop = function (...a) { const e = R.src.find(q => q.n.deref() === this); if (e) e.stopped = true; return sp.apply(this, a); }; }
  const dc = HTMLImageElement.prototype.decode; HTMLImageElement.prototype.decode = function () { if (/assets\/classic\//.test(this.src)) R.imgDecode++; return dc.call(this); };
  const cb = window.createImageBitmap; window.createImageBitmap = function (...a) { R.bmp++; return cb.apply(this, a); }; };
const bgm = p => p.evaluate(() => { const R = window.__MD, live = R.ab.filter(q => q.r.deref() && q.d > 30).map(q => Math.round(q.d)), play = R.src.filter(q => !q.stopped).map(q => ({ d: Math.round(q.d), loop: q.loop })); return { live, play, dec: R.dec, nsrc: R.src.length }; });
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const bcdp = await b.newBrowserCDPSession(); const ctx = await b.newContext({ viewport: { width: 1280, height: 760 } }); await ctx.addInitScript(INIT);
  const p = await ctx.newPage(), cdp = await ctx.newCDPSession(p); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const gc = async () => { try { await cdp.send('HeapProfiler.collectGarbage'); } catch (e) {} await p.waitForTimeout(300); };
  const rss = async () => { const { processInfo } = await bcdp.send('SystemInfo.getProcessInfo'); const o = {}; for (const q of processInfo) { let kb = 0; try { kb = +(/VmRSS:\s+(\d+)/.exec(fs.readFileSync(`/proc/${q.id}/status`, 'utf8')) || [])[1] || 0; } catch (e) {} o[q.type] = (o[q.type] || 0) + Math.round(kb / 1024); } return o; };
  await login(p, { cls: 'knight', name: 'mdiet' }); await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 61; __T.BUFF.invis = 9999; });
  await p.mouse.click(640, 300); await p.waitForTimeout(3000);
  // ---- 배경음: 마을 곡이 반복 재생 · 제목 곡은 15초 뒤 버림
  let s = await bgm(p); console.log('  town', JSON.stringify(s));
  ok(s.play.length === 1 && s.play[0].d === 179 && s.play[0].loop, `마을: 마을 곡(179초) 하나가 반복(loop)으로 재생 ${JSON.stringify(s.play)}`);
  await p.waitForTimeout(16500); await gc(); s = await bgm(p);
  ok(s.live.length === 1 && s.live[0] === 179, `마을 16초 뒤: 풀어 둔 곡은 마을 곡 하나 (제목 곡 버림) ${JSON.stringify(s.live)}`);
  // ---- 사냥터로: 곡이 바뀜 · 마을 곡은 15초 뒤 버림
  await p.evaluate(() => __T.TOWN.toZone(23)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 23 && __T.SCENE === 'field', null, { timeout: 90000 }); await p.waitForTimeout(3000);
  s = await bgm(p); const zd = s.play.length === 1 ? s.play[0].d : null; console.log('  zone23', JSON.stringify(s));
  ok(s.play.length === 1 && zd && zd !== 179 && s.play[0].loop, `화둥 2구역: 사냥터 곡(${zd}초)으로 바뀌어 반복 재생 · 마을 곡은 멈춤`);
  await p.waitForTimeout(16500); await gc(); s = await bgm(p);
  ok(s.live.length === 1 && s.live[0] === zd, `사냥터 16초 뒤: 풀어 둔 곡은 사냥터 곡 하나 ${JSON.stringify(s.live)} (예전: 제목·마을·사냥터 3곡 ≈130MB)`);
  // ---- 보스전: 보스 곡 → 보스가 쓰러지면 사냥터 곡 (15초 안이면 다시 받지 않고 바로)
  await p.evaluate(() => { const T = __T, h = T.hero; const m = T.mkMob_('shelob', h.i + 3, h.j); m.aggro = true; m.home = [h.i + 3, h.j]; m.__md = 1; T.foxes.push(m); }); await p.waitForTimeout(4000);
  s = await bgm(p); ok(s.play.length === 1 && s.play[0].d === 166, `보스가 덤비면 보스 곡(166초) ${JSON.stringify(s.play)}`);
  const d0 = s.dec; await p.evaluate(() => { for (const f of __T.foxes) if (f.__md) { f.dead = true; f.aggro = false; } }); await p.waitForTimeout(3000);
  s = await bgm(p); ok(s.play.length === 1 && s.play[0].d === zd && s.dec === d0, `보스가 쓰러지면 사냥터 곡으로 바로 돌아옴 (다시 풀지 않음 · 풀기 ${d0}→${s.dec})`);
  // ---- 끄기/켜기 · 볼륨
  await p.evaluate(() => document.getElementById('btn-bgm').click()); await p.waitForTimeout(2500); s = await bgm(p);
  ok(s.play.length === 0, `배경음 끄면 멈춤 ${JSON.stringify(s.play)}`);
  await p.waitForTimeout(15500); await gc(); s = await bgm(p); ok(s.live.length === 0, `끈 지 15초 뒤 풀어 둔 곡 없음 ${JSON.stringify(s.live)}`);
  await p.evaluate(() => document.getElementById('btn-bgm').click()); await p.waitForFunction(() => window.__MD.src.some(q => !q.stopped), null, { timeout: 15000 }).catch(() => {}); s = await bgm(p);
  ok(s.play.length === 1 && s.play[0].d === zd && s.play[0].loop, `다시 켜면 사냥터 곡이 다시 반복 재생 ${JSON.stringify(s.play)}`);
  const n0 = s.nsrc; await p.evaluate(() => { const S = __T.SND_; S.set({ bgm: 40 }); __T.TOWN.syncBGM(); }); await p.waitForTimeout(1500); s = await bgm(p);
  ok(s.play.length === 1 && s.nsrc === n0, `볼륨 40%: 곡을 다시 시작하지 않고 그대로 (소리 크기만)`); await p.evaluate(() => { __T.SND_.set({ bgm: 100 }); __T.TOWN.syncBGM(); });
  // ---- 그림: decode() 사본 없음 · 가호 아이콘은 작은 한 칸으로 (예전 방식과 같은 그림)
  const im = await p.evaluate(() => ({ dec: window.__MD.imgDecode, bmp: window.__MD.bmp, gaho: Object.keys(__T.CXI).filter(k => /^gaho_/.test(k) && /<image/.test(__T.CXI[k])).length, doll: Object.keys(__T.CXI).filter(k => /^doll_/.test(k) && /<image/.test(__T.CXI[k])).length, midle: __T.MEM_().midleN }));
  ok(im.dec === 0, `몬스터 그림 decode() 안 부름 (${im.dec}회)`); ok(im.gaho >= 6 && im.doll >= 3, `가호 아이콘 ${im.gaho}개 · 인형 아이콘 ${im.doll}개 생김`);
  ok(im.midle === 0, `가호 아이콘을 만들려고 서 있는 그림 전체(<img>)를 받지 않음 (MIDLE ${im.midle}장 · 예전 7장 ≈150MB)`);
  const same = await p.evaluate(async () => { const T = __T, out = []; const old = (k, I, row) => { const M = T.MSHEET[k], c = document.createElement('canvas'); c.width = M.W; c.height = M.H; const g = c.getContext('2d', { willReadFrequently: true }); if (M.tint) g.filter = M.tint; g.drawImage(I, 0, row * M.H, M.W, M.H, 0, 0, M.W, M.H); return g.getImageData(0, 0, M.W, M.H).data; };
    for (const k of ['shelob', 'queen_ant', 'ogre', 'fn_warrior', 'drake_king']) { const M = T.MSHEET[k]; if (!M) continue; const I = new Image(); I.src = `assets/classic/mon_${M.src || k}_idle.webp`; await I.decode(); const a = old(k, I, 1);
      let F = T.MFR_(k, 1); for (let i = 0; !F && i < 100; i++) { await new Promise(r => setTimeout(r, 100)); F = T.MFR_(k, 1); } if (!F) { out.push([k, 'none']); continue; }
      const c = document.createElement('canvas'); c.width = M.W; c.height = M.H; const g = c.getContext('2d', { willReadFrequently: true }); if (M.tint) g.filter = M.tint; g.drawImage(F[0], 0, F[1], M.W, M.H, 0, 0, M.W, M.H); const b2 = g.getImageData(0, 0, M.W, M.H).data;
      let diff = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b2[i]) diff++; out.push([k, diff, F[0] instanceof HTMLCanvasElement ? F[0].width + 'x' + F[0].height : 'img']); } return out; });
  ok(same.length >= 4 && same.every(r => r[1] === 0), `한 칸 그림 = 예전 그림과 화소 하나까지 같음 ${JSON.stringify(same)}`);
  // 월드맵 초상 · 변신 카드 그림: 그려짐 · 큰 그림(<img>)을 받지 않음
  const pr = await p.evaluate(async () => { const T = __T, ks = ['werewolf', 'ogre', 'baphomet', 'deathknight', 'spartoi', 'necromancer']; for (const k of ks) T.MFR_(k, 1); await new Promise(r => setTimeout(r, 4000)); return { ready: ks.filter(k => T.MFR_(k, 1)).length, n: ks.length, midle: T.MEM_().midleN }; });
  ok(pr.ready === pr.n && pr.midle === 0, `여러 몬스터 한 칸 그림 ${pr.ready}/${pr.n} 준비 · 큰 그림 안 받음 (MIDLE ${pr.midle})`);
  // ---- 채팅 기록: 줄 수 상한
  const cl = await p.evaluate(() => { for (let i = 0; i < 300; i++) window.__chatAdd('테스트 채팅 ' + i, '#fff'); const b = document.getElementById('chatlog'); return { n: b.children.length, nodes: b.getElementsByTagName('*').length, last: b.lastElementChild && b.lastElementChild.textContent }; });
  ok(cl.n <= 40 && /테스트 채팅 299/.test(cl.last), `채팅 기록은 최근 ${cl.n}줄만 (요소 ${cl.nodes}개 · 마지막 줄 '${cl.last}')`);
  // ---- DOM: 자동사냥 3분 동안 늘지 않음 (채팅 기록이 이미 가득 찬 상태)
  await p.evaluate(() => { const T = __T; T.AUTO.setCfg({ loot: true, retHp: 0, lowPot: false, sell: false, refillHome: false }); if (!T.AUTO.on()) T.AUTO.toggle(); });
  const dom0 = await p.evaluate(() => document.getElementsByTagName('*').length); await p.waitForTimeout(+(process.env.MDOM || 180) * 1000); const dom1 = await p.evaluate(() => document.getElementsByTagName('*').length);
  ok(dom1 - dom0 <= 12, `자동사냥 ${process.env.MDOM || 180}초 동안 DOM 요소 ${dom0} → ${dom1} (늘지 않음)`);
  if (process.env.MRSS) { await gc(); const r = await rss(), sum = (r.renderer || 0) + (r.GPU || r.gpu || 0); console.log(`  RSS (화둥 2구역 자동사냥 ${180 + 40}초 뒤): renderer ${r.renderer} + gpu ${r.GPU || r.gpu || 0} = ${sum} MB · mem ${JSON.stringify(await p.evaluate(() => __T.MEM_()))}`);
    if (process.env.MBASE) ok(sum < +process.env.MBASE, `렌더러+GPU ${sum} MB < 예전 ${process.env.MBASE} MB`); }
  // ---- 장비 색: 물들인 그림은 그리는 한 칸만 · 합계 상한 (예전: 통짜 그림 30여 장 ≈ 100~120MB)
  const tn = await p.evaluate(() => __T.TINT_()); console.log('  tint', JSON.stringify(tn));
  ok(tn.n > 20 && tn.px <= 8e6, `물들인 칸 ${tn.n}개 · ${(tn.px / 1e6).toFixed(1)}백만 화소 (≈${Math.round(tn.px * 4 / 1048576)}MB · 상한 8백만) · 새로 물들인 횟수 ${tn.mk}`);
  { const t0 = await p.evaluate(() => __T.TINT_().mk); await p.waitForTimeout(30000); const t1 = await p.evaluate(() => __T.TINT_().mk); ok(t1 - t0 < 600, `사냥 30초 동안 새로 물들인 칸 ${t1 - t0}개 (상한이 너무 작아 계속 다시 만드는지 · 한 칸 0.1ms 안팎)`); }
  // ---- 바닥: 1구역 → 2구역으로 옮기면 지금 지역 바닥만 남음 (예전: 바로 전 지역 바닥도 쥐고 있었음 30~60MB)
  await p.evaluate(() => __T.TOWN.toZone(22)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 22, null, { timeout: 60000 }); await p.waitForTimeout(2000);
  await p.evaluate(() => __T.TOWN.toZone(23)); await p.waitForFunction(() => __T.ISLE && __T.ISLE.id === 23, null, { timeout: 60000 }); await p.waitForTimeout(2000);
  const zs = await p.evaluate(() => ({ z: __T.ISLAND_().zones(), g: !!__T.ISLE.ground, dra: __T.DRA_.DRA.C.m.size }));
  ok(zs.g && zs.z.length === 1 && zs.z[0] === 23, `화둥 1구역 → 2구역: 바닥 그림이 남은 지역 ${JSON.stringify(zs.z)} (지금 지역만) · 몽환의 섬 프레임 캐시 ${zs.dra}장`);
  await p.screenshot({ path: 'dev/out/memdiet.png' });
  console.log(errs.length ? 'PAGE ERRORS\n' + errs.slice(0, 6).join('\n') : 'no page errors'); if (errs.length) process.exitCode = 1;
  if (process.exitCode !== 1) console.log('ALL OK'); await b.close(); })();
