// 11/4 운영자 레벨 조정: Lv.65 기사 → Lv.1 (경험치 0 · 보너스 능력치 초기화 · 레벨에 없는 기술 빠짐 · 레벨 안 맞는 장비는 가방으로) · 낮출 때 확인 팝업 · 올리기는 그대로
//   KT_PORT=8890 bash dev/runkt.sh dev/tests/admlv.js   (진짜 운영자 키는 안 씀: admpet2.js처럼 테스트 키)
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const login = require('../tq.js');
const F = path.join(__dirname, '..', '..', 'src', '_kt2.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => { const s0 = fs.readFileSync(F, 'utf8'); let b;
  try { const { subtle } = require('crypto').webcrypto; const kp = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const pub = await subtle.exportKey('jwk', kp.publicKey), priv = await subtle.exportKey('jwk', kp.privateKey);
    fs.writeFileSync(F, s0.replace(/const ADMIN_PUB = \{[^}]*\};/, `const ADMIN_PUB = ${JSON.stringify({ kty: 'EC', crv: 'P-256', x: pub.x, y: pub.y })};`));
    b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } }); const errs = []; const t0 = Date.now() % 1e6;
    const page = async nm => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(nm + ': ' + e.message)); await login(p, { acc: nm.toLowerCase() + t0, cls: 'knight', name: nm + t0 % 1e4, mp: true }); return p; };
    const U = await page('alU');
    const u0 = await U.evaluate(() => { const T = __T, I = T.INV; document.getElementById('gp-lv').value = 65; document.getElementById('gp-apply').click(); for (let k = 0; k < 13; k++) I.addStat(['str', 'con', 'dex'][k % 3]);
      const hi = Object.keys(T.ITEMS).find(id => T.ITEMS[id].slot === 'helm' && (T.ITEMS[id].lv || 0) >= 30 && !T.ITEMS[id].hidden); I.add(hi, 1, true); const e = I.bag().filter(x => x.id === hi).pop(); I.use(e);
      return { lv: T.hero.lv, bp: T.hero.bonusPts, st: I.stat(), sk: T.LEARNED_ ? T.LEARNED_().length : null, helm: hi, on: !!e.on }; });
    console.log('전', JSON.stringify(u0));
    const M = await page('alM'); await M.evaluate(j => { __T.ACCOUNT.acc = () => 'adengm'; window.ADEN_ADMIN = { acc: 'adengm', jwk: j }; return __T.ADMIN.tryOn(); }, priv); await M.waitForTimeout(600);
    const uPeer = await U.evaluate(() => __T.NET.me()); await M.waitForFunction(p => __T.NET.others().some(o => o.peer === p && +o.pr.lv === 65), uPeer, { timeout: 20000 });
    await M.click('#btn-adm'); await M.waitForSelector(`#adm-list tr[data-p="${uPeer}"]`, { timeout: 5000 }); await M.click(`#adm-list tr[data-p="${uPeer}"] button[data-a="insp"]`); await M.waitForSelector('#adm-l', { timeout: 15000 });
    await M.fill('#adm-l', '1'); await M.click('#adm-det button[data-c="lv"]'); await M.waitForTimeout(500);
    const ask = await M.evaluate(() => { const w = document.getElementById('askwin') || document.querySelector('.askwin, #ask'); const t = document.body.innerText; return /Lv\.65 → Lv\.1로 낮출까요/.test(t); }); ok(ask, '낮출 때 확인 팝업 ("Lv.65 → Lv.1로 낮출까요?")');
    await M.click('#ask-yes'); await U.waitForFunction(() => __T.hero.lv === 1, null, { timeout: 15000 }).catch(() => {});
    const u1 = await U.evaluate(hi => { const T = __T, I = T.INV, e = I.bag().filter(x => x.id === hi).pop(); return { lv: T.hero.lv, exp: T.hero.exp, bp: T.hero.bonusPts, st: I.stat(), helmOn: !!(e && e.on), helmInBag: !!e, msg: T.log.slice(-4).map(l => l.t).filter(t => /운영자/.test(t)) }; }, u0.helm);
    console.log('후', JSON.stringify(u1));
    ok(u1.lv === 1 && u1.exp === 0, 'Lv.65 → Lv.1 · 경험치 0'); ok(u1.bp === 0 && u1.st.str < u0.st.str, `보너스 능력치 초기화 (힘 ${u0.st.str} → ${u1.st.str} · 남은 점수 ${u1.bp})`);
    ok(!u1.helmOn && u1.helmInBag, '레벨이 안 맞는 장비(투구)는 벗겨져 가방으로'); ok(u1.msg.some(t => /보너스 능력치는 초기화/.test(t)), '유저에게 안내');
    await M.fill('#adm-l', '20'); await M.click('#adm-det button[data-c="lv"]'); await U.waitForFunction(() => __T.hero.lv === 20, null, { timeout: 15000 }).catch(() => {}); const u2 = await U.evaluate(() => ({ lv: __T.hero.lv, bp: __T.hero.bonusPts }));
    ok(u2.lv === 20 && u2.bp === 4, `올리기는 확인 없이 바로 (Lv.${u2.lv} · 보너스 점수 ${u2.bp})`);
    console.log(errs.slice(0, 3).join('\n') || 'no errors'); ok(!errs.length, '오류 없음');
  } finally { fs.writeFileSync(F, s0); if (b) await b.close(); }
  console.log(fails ? `FAIL ${fails}` : 'ALL OK'); process.exitCode = fails ? 1 : 0; })();
