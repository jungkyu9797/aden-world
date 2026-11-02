// 새 그래픽(WebGL) 시험용 장면 — gl_bench.js · gl_parity.js 공용
//   화룡의 둥지 2구역(23) · 나 + '다른 유저 대역' 29명(같은 페이지 안 BroadcastChannel로 접속 정보를 흉내 · ?mp=bc) + 몹(시트 그림 몹 위주) + 계속 나는 타격 효과(피해 숫자·번쩍임·마법 타격)
//   다른 유저 대역: 직업 섞음 · 장비 무작위 · 일부는 걸어 다니고 1.2~2초마다 공격 동작
// 로그인 (dev/tq.js와 같은 순서 · 페이지 주소만 바꿀 수 있게: 비교용 main 판은 dev/out/mainref/_kt2.html)
async function login(p, { cls = 'knight', name, page = '/_kt2.html', q = '?mp=bc' } = {}) {
  // v215 BGRUN(화면 프레임이 멈추면 워커 타이머로 게임만 진행): 장면을 멈출 때(freeze) 같이 멈추게 — 워커 대신 50ms 타이머로 돌게 하고 __bgOff면 건너뜀
  await p.addInitScript(() => { try { window.Worker = function () { throw new Error('no worker (gl test)'); }; const si = window.setInterval; window.setInterval = function (f, ms, ...a) { if (ms === 50 && typeof f === 'function') { const g = f; f = (...b) => { if (!window.__bgOff) g(...b); }; } return si.call(window, f, ms, ...a); }; } catch (e) {} });
  await p.goto('http://127.0.0.1:' + (process.env.KT_PORT || 8766) + page + q);
  await p.waitForSelector('#lg-mode', { state: 'visible' }); await p.click('#lg-mode');
  const acc = 't' + Date.now() % 1e7; await p.fill('#lg-acc', acc); await p.fill('#lg-pw', 'abcd'); await p.fill('#lg-pw2', 'abcd'); await p.click('#lg-go');
  await p.waitForSelector(`.cs-card[data-cls="${cls}"]`, { state: 'visible', timeout: 30000 }); await p.click(`.cs-card[data-cls="${cls}"]`); await p.click('#cs-start');
  await p.waitForSelector('#nm-in', { state: 'visible' }); await p.fill('#nm-in', name || 'n' + Date.now() % 1e5); await p.click('#nm-go');
  await p.waitForFunction(() => window.__gameOn && window.__T && __T.SCENE === 'town', null, { timeout: 30000 }); await p.waitForTimeout(300); return p; }
exports.login = login;
exports.ARGS = [];   // 헤드리스 기본값으로도 WebGL2가 SwiftShader(소프트웨어 GL)로 켜짐 · --ignore-gpu-blocklist 등을 주면 2D 캔버스까지 SwiftShader로 가속돼 프레임이 수십 초가 됨(11/1 실측) — 그래서 안 줌
exports.setup = async function setup(p, { chars = 30, mobs = 30, fx = true, zone = 23, still = false, page } = {}) {
  await login(p, { cls: 'knight', name: 'glB', page });
  await p.evaluate(() => { __T.GOD_INV = true; __T.hero.lv = 60; document.querySelectorAll('.gw').forEach(w => w.hidden = true); });
  await p.evaluate(z => __T.TOWN.toZone(z), zone); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', zone, { timeout: 60000 });
  await p.waitForFunction(() => { const I = __T.ISLE, G = I && I.ground; return G && (G.baked || !(I.def.hills && I.def.hills.length)); }, null, { timeout: 90000, polling: 500 }).catch(() => console.log('  (바닥 굽기 기다림 시간 넘김)'));   // 언덕 바닥 굽기(배경 작업)가 끝난 뒤에 잼
  await p.waitForTimeout(1000);
  const info = await p.evaluate(({ chars, mobs, still }) => { const T = __T, H = T.hero, I = T.ISLE, N = I.N;
    T.TOWN.placeAt(N / 2 + 0.5, N / 2 + 0.5);   // 나: 지역 가운데
    for (let q = T.foxes.length - 1; q >= 0; q--) if (!T.MOB[T.foxes[q].kind].boss) T.foxes.splice(q, 1);   // 원래 몹은 치우고 (보스는 둠)
    const K = ['fn_warrior', 'fn_archer', 'fn_golem', 'fn_salamander', 'fn_hcerberus', 'fn_warrior', 'fn_archer', 'fn_fly'], arts = {};
    for (let n = 0; n < mobs; n++) { const k = K[n % K.length], a = n / mobs * Math.PI * 2 + 0.3, rr = 3.2 + (n % 3) * 1.6; const m = T.mkMob(k, Math.round(H.x + Math.cos(a) * rr * 1.3), Math.round(H.z + Math.sin(a) * rr));
      m.home = [m.i, m.j]; m.aggro = false; m.hp = m.max = 1e9; T.MOB[k].passive = true; m.row = n % 8; T.foxes.push(m); arts[k] = T.MOB[k].art; }
    // 다른 유저 대역 (BroadcastChannel 'aden-mp' · peer 이름이 내 것보다 뒤라 내가 지역 호스트)
    const CL = Object.keys(T.CLS_DEF), SL = ['weapon', 'helm', 'armor', 'shield', 'gloves', 'boots', 'cloak', 'shirt', 'belt'], bySlot = {};
    for (const id in T.ITEMS) { const d = T.ITEMS[id]; if (d.slot && SL.includes(d.slot)) (bySlot[d.slot] = bySlot[d.slot] || []).push(id); }
    let seed = 7; const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const P = []; for (let n = 0; n < chars - 1; n++) { const c = CL[n % CL.length], e = {}; for (const s of SL) if (bySlot[s] && R() < 0.8) e[s] = bySlot[s][Math.floor(R() * bySlot[s].length)];
      const a = n / (chars - 1) * Math.PI * 2, rr = 2 + (n % 4) * 1.4; P.push({ peer: 'p~' + String(n).padStart(2, '0'), n: '대역' + (n + 1), c, e, cx: H.x + Math.cos(a) * rr * 1.25, cz: H.z + Math.sin(a) * rr, ph: R() * 6, mv: !still && n % 3 === 0, as: 0, nx: 1 + R() * 0.8, row: n % 8 }); }
    const ch = new BroadcastChannel('aden-mp'), t0 = performance.now(); window.__glP = P;
    const send = () => { const t = (performance.now() - t0) / 1000; for (const o of P) { let x = o.cx, z = o.cz, r = o.row;
        if (o.mv && !window.__glStill) { x += Math.cos(t * 0.6 + o.ph) * 1.2; z += Math.sin(t * 0.6 + o.ph) * 1.2; r = Math.round(((Math.atan2(Math.cos(t * 0.6 + o.ph), -Math.sin(t * 0.6 + o.ph)) / (Math.PI * 2)) * 8 + 8)) % 8; }
        else if (!window.__glStill && t > o.nx) { o.as++; o.nx = t + 1.2 + (o.as % 4) * 0.25; }
        ch.postMessage({ t: 'p', peer: o.peer, presence: { n: o.n, c: o.c, lv: 50, z: 'isle' + T.ISLE.id, x: +x.toFixed(2), y: +z.toFixed(2), r, a: 'attack', as: o.as, hp: 900, hm: 1000, e: o.e, eg: {}, pf: 0 } }); } };
    send(); window.__glSend = setInterval(send, 150);
    return { arts, classes: CL, slots: Object.fromEntries(Object.entries(bySlot).map(([k, v]) => [k, v.length])), mobs: T.foxes.length }; }, { chars, mobs, still });
  if (fx) await p.evaluate(() => { const T = __T, ids = ['ebolt', 'fireball', 'ice', 'light']; let k = 0;   // 타격 효과: 0.1초마다 몹 하나 번쩍 + 피해 숫자 · 0.3초마다 마법 타격
    window.__glFx = setInterval(() => { if (window.__glStill) return; const L = T.foxes.filter(f => !f.dead && !T.MOB[f.kind].boss); if (!L.length) return; const f = L[(k++ * 7) % L.length]; f.flash = 0.09;
      const q = T.W2P(f.x, f.z); T.floats.push({ x: q[0] + ((k * 13) % 18 - 9), y: q[1] - 70, text: String(100 + (k * 37) % 400), t: 0, life: 0.9, color: k % 9 ? '#ffffff' : '#ffd24a', size: k % 9 ? 12 : 16, rise: 26, big: !(k % 9), dx: 0 });
      if (k % 3 === 0) { for (const id of ids) { try { T.MXF_.mxHit(id, f); break; } catch (e) {} } } }, 100); });
  await p.waitForTimeout(2500);
  info.peers = await p.evaluate(() => __T.NET.others().length);
  return info; };
// 같은 장면을 멈춰 두고(게임 루프 멈춤 · 난수 고정) GL 끔/켬으로 한 번씩 그리기 — gl.js의 GLR._redraw (시험용)
exports.freeze = p => p.evaluate(() => new Promise(res => { window.__glStill = true; window.__bgOff = true; /* v215 BGRUN도 멈춤 */ const r0 = window.requestAnimationFrame; window.__raf0 = r0; window.requestAnimationFrame = cb => (cb && cb.name === 'frame' ? (window.__frozen = cb, 0) : r0.call(window, cb)); setTimeout(res, 300); }));
exports.redraw = (p, gl) => p.evaluate(gl => { let s = 12345; const M = Math.random; Math.random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; try { return GLR._redraw(gl); } finally { Math.random = M; } }, gl);
