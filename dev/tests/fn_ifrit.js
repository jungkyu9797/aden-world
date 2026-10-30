// 화룡의 둥지 40마리 + 중간 보스 이프리트 확인 (KT_PORT=8771 bash dev/runkt.sh dev/tests/fn_ifrit.js)
//   ① 구역마다 일반 몹 40마리 · 이프리트 1마리 ② 등장 타이머(진짜 시간표 — DEMO 끔 · 시계를 당겨서): 잡으면 1시간~1시간 30분 뒤 다시 · 다시 나타날 때 공지·채팅 없음 · 용암·포털 근처 아님
//   ③ 드랍: bossLoot 수천 번 → 이프리트의 심장 50% · 화룡의 비늘 2~4개 ④ 도감(아이템·사냥터)에 보임 ⑤ 그림: dev/out/ifrit_*.png (서 있기·8방향·주먹 들기·공격·기술·맞음·죽음·크기 비교·아이콘)
const { chromium } = require('playwright'); const login = require('../tq.js'); const fs = require('fs');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch(); const errs = [];
  const enter = async (p, z) => { await p.evaluate(z => __T.TOWN.toZone(z), z); await p.waitForFunction(z => __T.ISLE && __T.ISLE.id === z && __T.SCENE === 'field', z, { timeout: 20000 }); await p.waitForTimeout(1200); };
  // ---------- 진짜 시간표 (DEMO 끔) ----------
  { const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message));
    await login(p, { cls: 'knight', name: 'ifR', init: () => { Object.defineProperty(window, 'DEMO_MODE', { get: () => false, set() {}, configurable: true }); } });
    await p.evaluate(() => { __T.GOD_INV = true; const r = Date.now.bind(Date); window.__OFF = 0; Date.now = () => r() + window.__OFF * 1000; });
    for (const z of [22, 23]) { await enter(p, z);
      const c = await p.evaluate(() => { const T = __T, cnt = {}; let n = 0, ifr = 0; for (const f of T.foxes) { if (f.dead || f.gone) continue; const S = T.MOB[f.kind]; if (S.midb) { ifr++; continue; } if (S.boss) continue; n++; cnt[f.kind] = (cnt[f.kind] || 0) + 1; } return { n, ifr, cnt, def: T.ISLAND.def(T.ISLE.id).mobs.reduce((a, [, k]) => a + k, 0) + T.ISLAND.def(T.ISLE.id).groups.reduce((a, [, m, k]) => a + k * (1 + m.reduce((x, [, c]) => x + c, 0)), 0) }; });
      console.log('zone', z, JSON.stringify(c)); ok(c.n === 40 && c.def === 40, `${z}번 일반 몹 40마리 (${c.n})`); ok(c.ifr === 1, `${z}번 이프리트 1마리 (처음엔 살아 있음)`);
      const key = 'ifrit' + z, delays = [], spots = [], talk = [];
      for (let cyc = 0; cyc < 12; cyc++) {
        const k0 = await p.evaluate(() => { const T = __T, f = T.foxes.find(m => m.kind === 'fn_ifrit' && !m.dead && !m.gone); if (!f) return null; const at = f.home.slice(), lava = !!(T.ISLE.lava && T.ISLE.lava.has(at[1] * 1000 + at[0])), nearP = T.ISLE.portals.some(q => Math.max(Math.abs(q.i - at[0]), Math.abs(q.j - at[1])) < 6); f.hp = -10; T.killCheck(f); return { at, lava, nearP, n0: T.log.length }; });
        if (!k0) { ok(false, `${z}번 ${cyc}회차 이프리트 없음`); break; } spots.push(k0.at); ok(!k0.lava && !k0.nearP, `${z}번 자리 ${k0.at} (용암·포털 근처 아님)`);
        const tm = await p.evaluate(k => __T.ISLAND.bossTimers()[k], key); delays.push(tm);
        await p.evaluate(s => { window.__OFF += s; }, tm - 30); await p.waitForTimeout(500);
        const before = await p.evaluate(k => ({ t: __T.ISLAND.bossTimers()[k], live: __T.foxes.filter(m => m.kind === 'fn_ifrit' && !m.dead && !m.gone).length }), key);
        if (cyc === 0) ok(typeof before.t === 'number' && before.live === 0, `${z}번 등장 30초 전: 아직 없음 (${JSON.stringify(before)})`);
        const n1 = await p.evaluate(() => performance.now()); await p.evaluate(() => { window.__OFF += 45; }); await p.waitForTimeout(600);   // 채팅 기록은 최근 20줄만 남으므로 시각(at)으로 거름
        const after = await p.evaluate(({ k, n1 }) => { const T = __T, L = T.log.filter(x => x.at > n1).map(x => String(x.t || x.text || x)), an = (document.getElementById('announce') || {}).textContent || ''; return { t: T.ISLAND.bossTimers()[k], live: T.foxes.filter(m => m.kind === 'fn_ifrit' && !m.dead && !m.gone).length, msgs: L.filter(s => /이프리트|공지|나타났|튀어나왔/.test(s)), all: L.length, an: /이프리트/.test(an) }; }, { k: key, n1 });
        if (after.msgs.length || after.an) talk.push(after); if (cyc === 0) ok(after.t === 'alive' && after.live === 1, `${z}번 시간이 되면 조용히 다시 나타남 (${JSON.stringify(after)})`);
        if (after.live !== 1) { ok(false, `${z}번 ${cyc}회차 다시 안 나타남 ${JSON.stringify(after)}`); break; } }
      console.log(z, 'delays(s)', delays.join(' '), '| spots', spots.map(s => s.join(',')).join(' '));
      ok(delays.length && delays.every(d => d >= 3590 && d <= 5400), `${z}번 다시 나타나는 간격 1시간~1시간 30분 (${Math.min(...delays)}~${Math.max(...delays)}초)`);
      ok(new Set(spots.map(s => s.join(','))).size >= Math.min(8, spots.length - 2), `${z}번 자리가 매번 달라짐 (${new Set(spots.map(s => s.join(','))).size}곳)`);
      ok(!talk.length, `${z}번 나타날 때 공지·채팅·알림 없음 ${talk.length ? JSON.stringify(talk[0]) : ''}`); }
    { // 대조군: 피닉스(일반 필드 보스)는 같은 방법으로 등장 공지가 잡혀야 함 → 위의 '알림 없음' 검사가 헛돌지 않는다는 확인
      const k = await p.evaluate(() => { const T = __T, f = T.foxes.find(m => m.kind === 'phoenix' && !m.dead && !m.gone); if (!f) return null; f.reborn = true; f.hp = -10; T.killCheck(f); return T.ISLAND.bossTimers().phoenix; });
      if (typeof k === 'number') { await p.evaluate(s => { window.__OFF += s; }, k - 5); await p.waitForTimeout(300); const n1 = await p.evaluate(() => performance.now()); await p.evaluate(() => { window.__OFF += 20; }); await p.waitForTimeout(600);
        const L = await p.evaluate(n1 => __T.log.filter(x => x.at > n1).map(x => String(x.t || x.text || x)), n1); ok(L.some(s => /피닉스.*나타났/.test(s)), `대조군: 피닉스는 등장 공지가 잡힘 (${L.filter(s => /피닉스/.test(s)).join(' / ')})`); } else console.log('phoenix control skipped', k); }
    const tm2 = await p.evaluate(() => { const T = __T.ISLAND.bossTimers(); return { i22: T.ifrit22, i23: T.ifrit23, kills: Object.keys(__T.ISLAND.bossKills()) }; }); console.log('timers', JSON.stringify(tm2));
    await p.close(); }
  // ---------- 데모 페이지: 드랍 · 도감 · 그림 ----------
  const p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 });   // 2배는 테스트 기기 메모리가 모자라 가끔 페이지가 죽음 p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'ifA' }); await p.evaluate(() => { __T.GOD_INV = true; });
  await enter(p, 22);
  const drop = await p.evaluate(() => { const T = __T, N = 4000, cnt = { heart: 0 }, sc = {}; for (let q = 0; q < N; q++) { T.GROUND.clear(); T.GROUND.bossLoot({ kind: 'fn_ifrit', i: T.hero.i, j: T.hero.j, x: T.hero.x, z: T.hero.z }); const L = T.GROUND.list(); if (L.some(d => d.id === 'ifrit_heart')) cnt.heart++; const s = L.filter(d => d.id === 'fire_scale').reduce((a, d) => a + d.n, 0); sc[s] = (sc[s] || 0) + 1; } T.GROUND.clear(); return { N, heart: cnt.heart, p: +(cnt.heart / N).toFixed(3), scale: sc }; });
  console.log('drop', JSON.stringify(drop)); ok(Math.abs(drop.p - 0.5) < 0.03, `이프리트의 심장 드랍 ${drop.p * 100}% (${drop.N}번)`); ok(Object.keys(drop.scale).every(k => +k >= 2 && +k <= 4), '화룡의 비늘 2~4개 (반드시)');
  const dex = await p.evaluate(() => { const T = __T, it = T.ITEMS.ifrit_heart, L = window.CODEX.list(), e = L.find(x => x.id === 'ifrit_heart'), sc = L.find(x => x.id === 'fire_scale'); return { it: it && { name: it.name, rar: it.rar, desc: it.desc }, dex: e ? JSON.stringify(e.where) : null, scale: sc ? JSON.stringify(sc.where) : null }; });
  console.log('item', JSON.stringify(dex)); ok(dex.it && /화룡 장비의 핵심 재료/.test(dex.it.desc), '심장 설명: 화룡 장비의 핵심 재료'); ok(dex.dex && /이프리트/.test(dex.dex), '아이템 도감에 이프리트의 심장 (얻는 곳: 이프리트)');
  await p.click('#btn-map'); await p.waitForTimeout(500); await p.click('.mk[data-r="fire_dragon_nest"]'); await p.waitForTimeout(600);
  const wc = await p.evaluate(() => { const c = document.getElementById('wm-codex'); return { txt: c ? c.textContent : '', desc: (document.getElementById('wm-desc') || {}).textContent || '', heart: !!(c && [...c.querySelectorAll('.wc-it')].some(e => /이프리트의 심장/.test(e.dataset.itip || ''))) }; });
  ok(/이프리트/.test(wc.txt) && /중간 보스/.test(wc.txt) && wc.heart, '사냥터 도감: 이프리트(중간 보스) · 보스 드랍에 심장'); ok(/이프리트/.test(wc.desc), '월드맵 설명에 이프리트');
  { const el = await p.$('#wm-codex'); if (el) await el.screenshot({ path: 'dev/out/ifrit_codex.png' }); }
  await p.keyboard.press('Escape'); await p.evaluate(() => { const w = document.getElementById('wmap'); if (w) w.hidden = true; }); await p.waitForTimeout(300);
  // 아이콘
  await p.evaluate(() => { const d = document.createElement('div'); d.id = '__ic'; d.style.cssText = 'position:fixed;left:20px;top:20px;z-index:99999;background:#1a140e;padding:10px;display:flex;gap:10px'; d.innerHTML = ['ifrit_heart', 'phoenix_feather', 'fire_scale'].map(k => `<span style="display:inline-block;width:68px;height:68px">${__T.ICON(k).replace('<svg ', '<svg width="68" height="68" ')}</span>`).join(''); document.body.appendChild(d); });
  await (await p.$('#__ic')).screenshot({ path: 'dev/out/ifrit_heart_icon.png' }); await p.evaluate(() => document.getElementById('__ic').remove());
  // 그림: 주변 몹 치우고 영웅 옆에 이프리트 · 아시타지오 (크기 비교)
  await p.evaluate(() => { const T = __T, H = T.hero, f = T.foxes.find(m => m.kind === 'fn_ifrit' && !m.dead); for (let q = T.foxes.length - 1; q >= 0; q--) if (T.foxes[q] !== f) T.foxes.splice(q, 1);
    f.i = f.fi = H.i + 2; f.j = f.fj = H.j; f.x = f.i + .5; f.z = f.j + .5; f.t = 1; f.home = [f.i, f.j]; f.row = 1; window.__A = f;
    const a = T.mkMob('fn_ashtazio', H.i + 3, H.j - 3); a.home = [a.i, a.j]; a.row = 1; T.foxes.push(a); window.__Z = a; for (const m of [f, a]) m.aggro = false; T.MOB.fn_ifrit.passive = T.MOB.fn_ashtazio.passive = true; })   // 찍는 동안 제자리에 묶음 (스턴 별 없이);
  await p.waitForTimeout(1500);
  const shot = async (name, w = 320, h = 400, f = '__A') => { const [x, y] = await p.evaluate(f => __T.scr(window[f].x, window[f].z), f); const y0 = Math.max(0, y - h + 50); await p.screenshot({ path: `dev/out/ifrit_${name}.png`, clip: { x: Math.max(0, x - w / 2), y: y0, width: w, height: Math.min(h, 798 - y0) } }); };
  { const [x, y] = await p.evaluate(() => __T.scr(__A.x, __A.z)); await p.screenshot({ path: 'dev/out/ifrit_size.png', clip: { x: Math.max(0, x - 330), y: Math.max(0, y - 380), width: 600, height: 430 } }); }
  console.log('size', JSON.stringify(await p.evaluate(() => { const S = __T.MOB.fn_ifrit, Z = __T.MOB.fn_ashtazio; return { ifrit: { sc: S.sc, hh: S.hh, hw: S.hw }, ashtazio: { sc: Z.sc, hh: Z.hh } }; })));
  await p.evaluate(() => { __Z.gone = true; });
  for (let r = 0; r < 8; r++) { await p.evaluate(r => { __A.row = r; __A.t = 1; __A.atkT = null; __A.casting = null; }, r); await p.waitForTimeout(150); await shot('dir' + r, 280, 380); }
  const pose = (js, a, wait = 160) => p.evaluate(js, a).then(() => p.waitForTimeout(wait));
  await pose(() => { const f = __A; f.row = 1; f.aggro = true; f.cool = 5; }); await shot('idle');
  await pose(() => { Object.defineProperty(__A, 'atkT', { get: () => 0.001, set() {}, configurable: true }); }); await shot('windup');   // 주먹을 다 치켜든 순간 (공격 시작)
  for (const [k, n] of [[0.06, 'attack'], [0.16, 'attack1'], [0.26, 'attack2'], [0.55, 'attack3']]) { await pose(k => { Object.defineProperty(__A, 'atkT', { get: () => k * 0.8 / 0.7, set() {}, configurable: true }); }, k); await shot(n); }
  await pose(() => { delete __A.atkT; __A.atkT = null; __A.cool = 5; __A.casting = { k: { cast: 1.0 }, t: 0.25, tg: null }; }); await shot('cast', 380, 430);
  await pose(() => { __A.casting = null; __A.flash = 0.5; }, null, 30); await shot('hit');
  await pose(() => { __A.flash = 0; __A.row = 3; }); await shot('side');
  // 죽음: deadT가 각 시각을 넘는 순간의 화면을 페이지 안에서 잘라 저장
  const TS = [0.05, 0.3, 0.6, 1.0, 1.4, 1.8];
  const dshots = await p.evaluate(TS => new Promise(done => { const f = __A, cv = document.getElementById('cv'), r = cv.getBoundingClientRect(), kx = cv.width / r.width, ky = cv.height / r.height, [sx, sy] = __T.scr(f.x, f.z), W = 300, H = 380, out = [];
    const grab = () => { const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2; c.getContext('2d').drawImage(cv, (sx - r.left - W / 2) * kx, (sy - r.top - 330) * ky, W * kx, H * ky, 0, 0, W * 2, H * 2); return c.toDataURL(); };
    __T.MOB.fn_ifrit.passive = false; f.aggro = false; f.hp = -1; __T.killCheck(f); f.flash = 0.09; let i = 0; const loop = () => { const t = f.deadT || 0; while (i < TS.length && t >= TS[i]) { out.push({ t, url: grab() }); i++; } if (i < TS.length && !f.gone) requestAnimationFrame(loop); else done(out); }; requestAnimationFrame(loop); }), TS);
  dshots.forEach((s, n) => fs.writeFileSync(`dev/out/ifrit_dead${n}.png`, Buffer.from(s.url.split(',')[1], 'base64'))); console.log('death frames', dshots.map(s => s.t.toFixed(2)).join(' '));
  await p.waitForFunction(() => __A.gone || !__T.foxes.includes(__A), null, { timeout: 30000 }).catch(() => {}); console.log('after death', JSON.stringify(await p.evaluate(() => ({ dead: __A.dead, gone: !!__A.gone, inList: __T.foxes.includes(__A), loot: __T.GROUND.list().filter(d => d.zone === 'isle22').map(d => d.id + 'x' + d.n) }))));
  // 실제 싸움 한 번 (기술·소리·오류 확인): 이프리트를 영웅 옆에 새로 놓고 무적으로 25초
  await p.evaluate(() => { const T = __T, H = T.hero, m = T.mkMob('fn_ifrit', H.i + 1, H.j); m.home = [m.i, m.j]; m.aggro = true; T.foxes.push(m); window.__B = m; window.__CAST = 0; const L = T.BOSS_SKILL.fn_ifrit; for (const k of L) { const u = k.use; k.use = function (f) { window.__CAST++; return u.call(this, f); }; } });
  await p.waitForFunction(() => window.__CAST >= 2, null, { timeout: 40000 }).catch(() => {}); const fight = await p.evaluate(() => ({ casts: window.__CAST, aoes: __T.AOES.length, hp: __B.hp, max: __B.max })); console.log('fight', JSON.stringify(fight)); ok(fight.casts >= 2, `기술 사용 ${fight.casts}번`);
  console.log(errs.join('\n') || 'no errors'); ok(!errs.length, '페이지 오류 없음'); await b.close(); })();
