// 11/3 운영자 창 [살펴보기] → 펫 목걸이 [지급]: 유저 가방에 Lv.61 진화(진화 기준 61) 베리가 생김 · 유저 레벨보다 높으면 안 보냄
//   python3 dev/mkkt.py && KT_PORT=8895 bash dev/runkt.sh dev/tests/admpet2.js   (진짜 운영자 키는 안 씀: 테스트용 키 쌍으로 _kt2.js 공개 키만 바꿔 끼우고 되돌림 · charcopy_adm.js와 같은 방식)
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const login = require('../tq.js');
const F = path.join(__dirname, '..', '..', 'src', '_kt2.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const s0 = fs.readFileSync(F, 'utf8'); let b;
  try { const { subtle } = require('crypto').webcrypto; const kp = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const pub = await subtle.exportKey('jwk', kp.publicKey), priv = await subtle.exportKey('jwk', kp.privateKey);
    fs.writeFileSync(F, s0.replace(/const ADMIN_PUB = \{[^}]*\};/, `const ADMIN_PUB = ${JSON.stringify({ kty: 'EC', crv: 'P-256', x: pub.x, y: pub.y })};`));
    b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } }); const errs = []; const t0 = Date.now() % 1e6;
    const page = async nm => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(nm + ': ' + e.message)); await login(p, { acc: nm.toLowerCase() + t0, cls: 'knight', name: nm + t0 % 1e4, mp: true }); return p; };
    const U = await page('apU'); await U.evaluate(() => { __T.hero.lv = 61; __T.GOD_INV = true; });
    const M = await page('apM'); await M.evaluate(j => { __T.ACCOUNT.acc = () => 'adengm'; window.ADEN_ADMIN = { acc: 'adengm', jwk: j }; return __T.ADMIN.tryOn(); }, priv); await M.waitForTimeout(600);
    ok(await M.evaluate(() => __T.ADMIN.on()), '운영자 모드 켜짐 (테스트 키)');
    const uPeer = await U.evaluate(() => __T.NET.me()); await M.waitForFunction(p => __T.NET.others().some(o => o.peer === p && +o.pr.lv === 61), uPeer, { timeout: 20000 });
    await M.click('#btn-adm'); await M.waitForSelector(`#adm-list tr[data-p="${uPeer}"]`, { timeout: 5000 }); await M.click(`#adm-list tr[data-p="${uPeer}"] button[data-a="insp"]`);
    await M.waitForSelector('#adm-tpl', { timeout: 15000 });
    const def = await M.evaluate(() => ['adm-tpl', 'adm-tpe', 'adm-tpb', 'adm-tpn'].map(id => { const e = document.getElementById(id); return e.type === 'checkbox' ? e.checked : e.value; }).join());
    ok(def === '61,true,61,베리', `살펴보기 [관리]에 펫 목걸이 칸 (기본 ${def})`);
    await M.waitForTimeout(1500); const kept = await M.evaluate(() => document.getElementById('adm-tpn').value); ok(kept === '베리', '창이 다시 그려져도 값 그대로');
    await M.click('#adm-det button[data-c="pet"]');
    await U.waitForFunction(() => __T.INV.bag().some(e => e.pet && e.pet.name === '베리'), null, { timeout: 15000 }).catch(() => {});
    const g = await U.evaluate(() => { const e = __T.INV.bag().find(x => x.pet && x.pet.name === '베리'); const d = e && e.pet; return d ? { lv: d.lv, evo: d.evo, eb: d.eb, mh: d.maxhp, rng: __T.PET.range(d), msg: __T.log.map(l => l.t).filter(t => /펫 목걸이\(Lv\.61 베리/.test(t)).length } : null; });
    console.log('유저:', JSON.stringify(g)); ok(g && g.lv === 61 && g.evo === 1 && g.eb.lv === 61 && g.eb.hp === 223 && g.mh === 823 && g.msg === 1, '유저 가방에 베리 (Lv.61 · 진화 기준 Lv.61 · 최대 HP 823) + 받았다는 안내');
    await M.waitForTimeout(1500); const ack = await M.evaluate(() => document.getElementById('adm-det').textContent); ok(/펫 목걸이 Lv\.61 베리 지급/.test(ack), '운영자 창에 지급 완료 표시');
    // 유저보다 높은 펫은 안 보냄
    await M.evaluate(() => { document.getElementById('adm-tpl').value = 70; }); const n0 = await U.evaluate(() => __T.INV.bag().filter(e => e.pet).length);
    await M.click('#adm-det button[data-c="pet"]'); await M.waitForTimeout(3000); const n1 = await U.evaluate(() => __T.INV.bag().filter(e => e.pet).length);
    const warn = await M.evaluate(() => __T.log.slice(-3).map(l => l.t).filter(t => /줄 수 없어요/.test(t)).length); ok(n1 === n0 && warn === 1, '유저(Lv.61)보다 높은 Lv.70 펫은 안 보내고 안내');
    console.log(errs.slice(0, 3).join('\n') || 'no errors'); ok(!errs.length, '오류 없음');
  } finally { fs.writeFileSync(F, s0); if (b) await b.close(); }
  console.log(fails ? `FAIL ${fails}` : 'ALL OK'); process.exitCode = fails ? 1 : 0; })();
