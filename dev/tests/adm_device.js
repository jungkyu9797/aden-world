// v190 운영자 기기 등록 테스트 (bash dev/runkt.sh dev/tests/adm_device.js)
// 진짜 운영자 키는 쓰지 않음: 테스트용 키 쌍을 새로 만들어 테스트 페이지(_kt2.js, git에 안 올라감)의 공개 키만 바꿔 끼움 · 계정 서버는 가짜(localStorage)
const { chromium } = require('playwright'); const fs = require('fs'); const login = require('../tq.js');
(async () => {
  const { subtle } = require('crypto').webcrypto; const kp = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pub = await subtle.exportKey('jwk', kp.publicKey), priv = await subtle.exportKey('jwk', kp.privateKey);
  const F = 'src/_kt2.js'; let s = fs.readFileSync(F, 'utf8'); s = s.replace(/const ADMIN_PUB = \{[^}]*\};/, `const ADMIN_PUB = ${JSON.stringify({ kty: 'EC', crv: 'P-256', x: pub.x, y: pub.y })};`); fs.writeFileSync(F, s);
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const errs = [];
  const mock = () => { const T = __T, K = 'mockfs'; const rd = () => { try { return JSON.parse(localStorage.getItem(K) || '{}'); } catch (e) { return {}; } };
    T.CLOUD.on = () => true; T.CLOUD.uid = () => 'u1'; T.CLOUD.get = async p => { const d = rd()[p]; return d ? Object.assign({}, d) : null; }; T.CLOUD.set = async (p, o) => { const d = rd(); d[p] = Object.assign({}, o); localStorage.setItem(K, JSON.stringify(d)); return true; };
    T.ACCOUNT.acc = () => 'adengm'; };
  const page = async () => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await login(p, { cls: 'knight', name: 'gm' + Date.now() % 1e4 }); await p.evaluate(mock); return p; };
  const logs = p => p.evaluate(() => __T.log.slice(-3).map(x => x.t || x.text || x));
  // A) 키 파일 없는 기기: /운영자등록
  let p = await page(); await p.evaluate(() => { window.ADEN_ADMIN = undefined; });
  await p.evaluate(() => __T.ADMIN.devRequest()); await p.waitForTimeout(500);
  console.log('A req', JSON.stringify(await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('mockfs'))['users/u1/chars/_admreq']; return { on: __T.ADMIN.on(), n: d ? JSON.parse(d.list).length : 0 }; })), JSON.stringify(await logs(p)));
  await p.close();
  // B) 원래 컴퓨터(테스트 운영자 키): 켜지면 허락 창 → 허락
  p = await page(); await p.evaluate(j => { window.ADEN_ADMIN = { acc: 'adengm', jwk: j }; }, priv);
  await p.evaluate(() => __T.ADMIN.tryOn()); await p.waitForTimeout(800);
  console.log('B ask', JSON.stringify(await p.evaluate(() => ({ on: __T.ADMIN.on(), ask: !document.getElementById('askwin').hidden, q: document.getElementById('ask-q').textContent }))));
  await p.click('#ask-yes'); await p.waitForTimeout(600);
  console.log('B cert', JSON.stringify(await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('mockfs')); const c = JSON.parse(d['users/u1/chars/_admcert'].list); return { n: c.length, days: Math.round((c[0].e - Date.now()) / 864e5), req: JSON.parse((d['users/u1/chars/_admreq'] || { list: '[]' }).list).length }; })), JSON.stringify(await logs(p)));
  await p.evaluate(() => { document.getElementById('btn-adm').click(); }); await p.waitForTimeout(600); console.log('B devs', await p.evaluate(() => document.getElementById('adm-devs').innerText));
  await p.close();
  // C) 그 기기로 다시 접속: 운영자 모드 (인증서)
  p = await page(); await p.evaluate(() => { window.ADEN_ADMIN = undefined; }); await p.evaluate(() => __T.ADMIN.tryOn()); await p.waitForTimeout(800);
  console.log('C dev on', JSON.stringify(await p.evaluate(() => ({ on: __T.ADMIN.on(), cert: !!__T.ADMIN.cert() }))), JSON.stringify(await logs(p)));
  await p.close();
  // D) 인증서를 고치면(만료 늘리기) 거부
  p = await page(); await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('mockfs')); const L = JSON.parse(d['users/u1/chars/_admcert'].list); L[0].e += 864e5; d['users/u1/chars/_admcert'].list = JSON.stringify(L); localStorage.setItem('mockfs', JSON.stringify(d)); window.ADEN_ADMIN = undefined; });
  await p.evaluate(() => __T.ADMIN.tryOn()); await p.waitForTimeout(800); console.log('D tampered', JSON.stringify(await p.evaluate(() => ({ on: __T.ADMIN.on() }))));
  await p.close();
  // E) 다른 계정이면 안 켜짐
  p = await page(); await p.evaluate(() => { __T.ACCOUNT.acc = () => 'someone'; window.ADEN_ADMIN = undefined; const d = JSON.parse(localStorage.getItem('mockfs')); const L = JSON.parse(d['users/u1/chars/_admcert'].list); L[0].e -= 864e5; d['users/u1/chars/_admcert'].list = JSON.stringify(L); localStorage.setItem('mockfs', JSON.stringify(d)); });
  await p.evaluate(() => __T.ADMIN.tryOn()); await p.waitForTimeout(800); console.log('E other acc', JSON.stringify(await p.evaluate(() => ({ on: __T.ADMIN.on() }))));
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
