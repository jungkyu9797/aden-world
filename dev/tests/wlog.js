// 게임 기록 서버 저장 (Firestore worldlog) — 가짜 서버로 확인 (KT_PORT=8789 bash dev/runkt.sh dev/tests/wlog.js)
const { chromium } = require('playwright'); const login = require('../tq.js');
const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'OK  ' : 'FAIL') + ' ' + k); };
(async () => { const b = await chromium.launch(); const errs = []; try {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'wlA' });
  // 가짜 서버: 만들기는 같은 id면 실패 · 읽기는 at 최신순
  await p.evaluate(() => { const C = __T.CLOUD, now = Date.now(); window.__FS = new Map(); window.__FAIL = false;
    C.on = () => true; C.uid = () => 'uidA';
    C.create = async (path, o) => { if (window.__FAIL) throw new Error('PERMISSION_DENIED'); if (window.__FS.has(path)) return false; window.__FS.set(path, Object.assign({}, o)); return true; };
    C.query = async (col, ord, n) => { if (window.__FAIL) throw new Error('PERMISSION_DENIED'); return [...window.__FS.entries()].filter(([k]) => k.startsWith(col + '/')).map(([, v]) => v).sort((a, b) => +b.at - +a.at).slice(0, n); };
    localStorage.removeItem('aden_glog');
    // 내가 꺼져 있던 동안 친구가 올린 기록 2줄
    window.__FS.set('worldlog/x1', { t: '법사다님이 화룡의 둥지 1구역에서 영웅 아이템 이프리트의 심장을 획득했습니다!', c: '#c77dff', at: String(now - 3 * 3600e3), u: 'uidB' });
    window.__FS.set('worldlog/x2', { t: '법사다님이 피닉스를 토벌했습니다!', c: '#ffd86a', at: String(now - 2 * 3600e3), u: 'uidB' }); });
  // ① 받아 오기
  const n1 = await p.evaluate(async () => { const G = __T.GLOG_; const n = await G.pull(true); return { n, src: G.src(), list: G.list().map(x => [Math.round((Date.now() - x.at) / 60000), x.t.slice(0, 20)]) }; });
  console.log('pull', JSON.stringify(n1)); ok('① 꺼져 있던 동안의 친구 기록을 서버에서 받아 옴 (시각 순서대로)', n1.src === 'on' && n1.list.length >= 2 && n1.list[0][0] >= 179 && /피닉스/.test(n1.list[1][1]));
  // ② 내 공지 → 서버에 한 줄 · 같은 공지를 다른 사람 게임도 올리면 한 줄만
  const s2 = await p.evaluate(async () => { const T = __T; T.ANN_('기사A님이 바포메트를 토벌했습니다!', '#ffd86a'); await new Promise(r => setTimeout(r, 200)); const before = window.__FS.size;
    const k = [...window.__FS.keys()].find(k => /^worldlog\/[0-9a-z]+_\d+$/.test(k) && window.__FS.get(k).t.includes('기사A')); const again = await T.CLOUD.create(k, { t: 'x', c: '', at: '1', u: 'uidB' }); return { before, has: !!k, again, u: k && window.__FS.get(k).u }; });
  console.log('share', JSON.stringify(s2)); ok('② 공지가 뜨면 서버에 올라감 (같은 id는 두 번 안 생김)', s2.has && s2.again === false && s2.u === 'uidA');
  // ③ 다른 사람 공지(접속 정보로 받은 것)는 다시 올리지 않음
  const s3 = await p.evaluate(async () => { const T = __T, G = T.GLOG_, n0 = window.__FS.size; G.mute = 1; try { T.ANN_('요정B님이 [영웅] 커츠의 검을 얻었습니다!', '#c77dff'); } finally { G.mute = 0; } await new Promise(r => setTimeout(r, 200)); return { n0, n1: window.__FS.size, local: G.list().some(x => /요정B/.test(x.t)) }; });
  ok('③ 받은 공지는 내 기록에만 (서버에 중복으로 안 올림)', s3.n0 === s3.n1 && s3.local);
  // ④ 서버의 같은 글(1분 차이)은 한 줄로 합침
  const s4 = await p.evaluate(async () => { const G = __T.GLOG_, x = G.list().find(y => /기사A/.test(y.t)); window.__FS.set('worldlog/dupe', { t: x.t, c: '#ffd86a', at: String(x.at + 60000), u: 'uidB' }); await G.pull(true); return G.list().filter(y => /기사A/.test(y.t)).length; });
  ok('④ 같은 공지가 여러 줄로 겹치지 않음', s4 === 1);
  // ⑤ 꺼져 있던 동안 나타난 보스: 처치 기록으로 계산해서 채워 넣고 서버에도 올림
  const s5 = await p.evaluate(async () => { const T = __T, G = T.GLOG_, now = Date.now() / 1000; T.ISLAND.mergeKills({ drake_king: { k: 1, t: Math.floor(now - 4 * 3600), by: '법사다' } }, true); const sl = T.ISLAND.spawnLog(); await G.pull(true);
    const e = G.list().find(y => /드레이크 킹이 나타났습니다/.test(y.t)); return { sl: sl.map(x => [x.t.slice(0, 18), Math.round((Date.now() - x.at) / 60000)]), e: e && Math.round((Date.now() - e.at) / 60000), srv: [...window.__FS.values()].some(v => /드레이크 킹이 나타났습니다/.test(v.t)) }; });
  console.log('spawn', JSON.stringify(s5)); ok('⑤ 꺼져 있던 동안의 보스 등장을 실제 시각으로 채움 (+ 서버)', s5.e != null && s5.sl.length && s5.e === s5.sl[0][1] && s5.e < 240 && s5.srv);   // 테스트 페이지(데모)는 보스 다시 나오는 시간이 3~4분
  // ⑥ 창 머리에 서버/이 기기 표시 · 서버가 막히면 이 기기 기록으로
  await p.evaluate(() => __T.GLOG_.open(true)); await p.waitForTimeout(300); const h1 = await p.evaluate(() => document.getElementById('glog-src').textContent);
  await p.evaluate(async () => { window.__FAIL = true; await __T.GLOG_.pull(true); }); await p.waitForTimeout(200); const h2 = await p.evaluate(() => document.getElementById('glog-src').textContent);
  console.log('hdr', h1, '|', h2); ok('⑥ 창에 서버 기록 / 이 기기 기록 표시', /서버 기록/.test(h1) && /이 기기 기록/.test(h2));
  ok('⑥ 서버가 막혀도 이 기기 기록은 그대로', await p.evaluate(() => __T.GLOG_.list().length >= 4));
  await p.evaluate(() => { window.__FAIL = false; return __T.GLOG_.pull(true); }); await p.waitForTimeout(300); await p.screenshot({ path: 'dev/out/wlog.png' });
  } catch (e) { console.log('TEST ERROR', e.message); R['테스트 끝까지'] = false; }
  console.log(errs.join('\n') || 'no errors'); const bad = Object.entries(R).filter(([, v]) => !v); console.log(bad.length || errs.length ? 'FAIL ' + bad.map(x => x[0]).join(', ') : '모두 통과'); await b.close(); })();
