// v190 운영자 기기 — 받는 쪽 확인: 등록된 기기의 운영자는 다른 유저 목록에서 숨고, 그 기기가 보낸 명령이 실행되는지 (bash dev/runkt.sh dev/tests/adm_device_net.js)
// 진짜 운영자 키는 쓰지 않음: 테스트용 키 쌍으로 테스트 페이지(_kt2.js)의 공개 키만 바꿈 · 끝나면 python3 dev/mkkt.py 로 되돌리기
const { chromium } = require('playwright'); const fs = require('fs'); const login = require('../tq.js');
(async () => {
  const { subtle } = require('crypto').webcrypto; const kp = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pub = await subtle.exportKey('jwk', kp.publicKey), priv = await subtle.exportKey('jwk', kp.privateKey);
  const F = 'src/_kt2.js'; let s = fs.readFileSync(F, 'utf8'); s = s.replace(/const ADMIN_PUB = \{[^}]*\};/, `const ADMIN_PUB = ${JSON.stringify({ kty: 'EC', crv: 'P-256', x: pub.x, y: pub.y })};`); fs.writeFileSync(F, s);
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1000, height: 700 } }); const errs = [];
  const mock = acc => { const T = __T, K = 'mockfs'; const rd = () => { try { return JSON.parse(localStorage.getItem(K) || '{}'); } catch (e) { return {}; } };
    T.CLOUD.on = () => true; T.CLOUD.uid = () => 'u1'; T.CLOUD.get = async p => { const d = rd()[p]; return d ? Object.assign({}, d) : null; }; T.CLOUD.set = async (p, o) => { const d = rd(); d[p] = Object.assign({}, o); localStorage.setItem(K, JSON.stringify(d)); return true; };
    if (acc) T.ACCOUNT.acc = () => acc; };
  const page = async (nm, acc) => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(nm + ': ' + e.message)); await login(p, { cls: 'knight', name: nm, mp: true }); await p.evaluate(mock, acc); return p; };
  const D = await page('gmdev', 'adengm'); await D.evaluate(() => { window.ADEN_ADMIN = undefined; return __T.ADMIN.devRequest(); }); await D.waitForTimeout(400);
  const M = await page('gmmain', 'adengm'); await M.evaluate(j => { window.ADEN_ADMIN = { acc: 'adengm', jwk: j }; return __T.ADMIN.tryOn(); }, priv); await M.waitForTimeout(700); await M.click('#ask-yes'); await M.waitForTimeout(500); await M.close();
  await D.evaluate(() => __T.ADMIN.tryOn()); await D.waitForTimeout(600); console.log('device admin on', await D.evaluate(() => __T.ADMIN.on()));
  const U = await page('user1', null); await U.waitForTimeout(6000);
  const uPeer = await U.evaluate(() => __T.NET.me()), dPeer = await D.evaluate(() => __T.NET.me());
  console.log('user sees admin?', JSON.stringify(await U.evaluate(dp => ({ others: __T.NET.others().map(o => o.peer), hasAdmin: __T.NET.others().some(o => o.peer === dp) }), dPeer)));
  await D.evaluate(up => __T.ADMIN.send(up, 'msg', { t: '기기 운영자 테스트' }), uPeer); await U.waitForTimeout(4000);
  console.log('user got msg', JSON.stringify(await U.evaluate(() => __T.log.slice(-3).map(x => x.t || x.text || x).filter(t => /운영자/.test(t)))));
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
