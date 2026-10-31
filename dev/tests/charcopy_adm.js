// 캐릭터 복사 — 운영자 창 끝까지: [살펴보기] → [복사 코드] (상대 PC가 명령 'insp' {cc:1}에 답함) → 클립보드 → 테스트 페이지 갓 모드 [캐릭터 복사] [적용] · [내 캐릭터 복사 코드]
//   python3 dev/mkkt.py && KT_PORT=8800 bash dev/runkt.sh dev/tests/charcopy_adm.js
// 진짜 운영자 키(admin_key.js)는 쓰지 않음: adm_device_net.js처럼 테스트용 키 쌍을 새로 만들어 테스트 페이지(_kt2.js · git에 안 올라감)의 공개 키만 바꿔 끼우고, 끝나면 원래대로 되돌림
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const login = require('../tq.js');
const OUT = path.join(__dirname, '..', 'out'), F = path.join(__dirname, '..', '..', 'src', '_kt2.js'), ORIGIN = 'http://127.0.0.1:' + (process.env.KT_PORT || 8766);
const ok = [], bad = []; const chk = (c, m) => (c ? ok : bad).push(m); const J = x => JSON.stringify(x);
(async () => { const s0 = fs.readFileSync(F, 'utf8'); let b;
  try {
    const { subtle } = require('crypto').webcrypto; const kp = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const pub = await subtle.exportKey('jwk', kp.publicKey), priv = await subtle.exportKey('jwk', kp.privateKey);
    fs.writeFileSync(F, s0.replace(/const ADMIN_PUB = \{[^}]*\};/, `const ADMIN_PUB = ${JSON.stringify({ kty: 'EC', crv: 'P-256', x: pub.x, y: pub.y })};`));
    b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } }); await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ORIGIN });
    const errs = []; const t0 = Date.now() % 1e6;
    const page = async (nm, mp) => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(nm + ': ' + e.message)); await login(p, { acc: nm.toLowerCase() + t0, cls: 'knight', name: nm + t0 % 1e4, mp }); return p; };
    // 유저 U: Lv55 기사 (집행검 +5 불 2단 · 축복 갑옷 · 인형 · 가호 · 변신 카드 · 실드)
    const U = await page('ccU', true);
    await U.evaluate(() => { const T = __T, I = T.INV, H = T.hero; document.getElementById('gp-lv').value = 55; document.getElementById('gp-apply').click(); T.wizAutoLearn(true); H.baseHP += 21;
      for (const k of ['str', 'str', 'con', 'con', 'dex']) I.addStat(k);
      const wear = (id, set) => { I.add(id, 1, true); const e = I.bag().filter(x => x.id === id && !x.on).pop(); Object.assign(e, set || {}); I.use(e); };
      for (const e of I.bag().filter(x => x.on)) I.use(e);
      wear('lg_sword', { en: 5, attr: { el: 'fire', lv: 2 } }); wear('dk_armor', { en: 3, blessed: true }); wear('dk_helm', { en: 2 }); wear('doll_troll');
      I.add('gaho_baphomet', 1, true); Object.assign(I.bag().filter(x => x.id === 'gaho_baphomet').pop(), { en: 2 });
      PCG.state().cards.deathknight = 1; PCG.setSlot('deathknight'); T.BUFF.shieldm = 600; I.render(); });
    // 운영자 M (테스트 키)
    const M = await page('ccM', true);
    await M.evaluate(j => { __T.ACCOUNT.acc = () => 'adengm'; window.ADEN_ADMIN = { acc: 'adengm', jwk: j }; return __T.ADMIN.tryOn(); }, priv); await M.waitForTimeout(600);
    chk(await M.evaluate(() => __T.ADMIN.on()), '운영자 모드 켜짐 (테스트 키)');
    const uPeer = await U.evaluate(() => __T.NET.me()); await M.waitForFunction(p => __T.NET.others().some(o => o.peer === p), uPeer, { timeout: 15000 });
    await M.click('#btn-adm'); await M.waitForSelector(`#adm-list tr[data-p="${uPeer}"]`, { timeout: 5000 });
    chk(await M.evaluate(() => !!document.getElementById('adm-ccme') && !!document.getElementById('adm-cc-out')), '운영자 창: [내 캐릭터 복사 코드] 버튼 · 복사 코드 칸');
    await M.click(`#adm-list tr[data-p="${uPeer}"] button[data-a="insp"]`);
    await M.waitForFunction(() => /레벨/.test((document.getElementById('adm-det') || {}).textContent || '') && !!document.getElementById('adm-cc'), null, { timeout: 15000 });
    chk(true, '살펴보기 정보 · [복사 코드] 버튼');
    await M.evaluate(() => navigator.clipboard.writeText('')); await M.click('#adm-cc');
    const wait1 = await M.evaluate(() => document.getElementById('adm-cc-out').textContent); chk(/받는 중/.test(wait1), `[복사 코드] 누름 → "${wait1}"`);
    await M.waitForFunction(() => /복사했어요|직접 복사/.test(document.getElementById('adm-cc-out').textContent), null, { timeout: 12000 });
    const out1 = await M.evaluate(async () => ({ t: document.getElementById('adm-cc-out').textContent, clip: await navigator.clipboard.readText().catch(() => ''), ta: (document.querySelector('#adm-cc-out textarea') || {}).value || '', log: __T.log.slice(-4).map(l => l.t || l.text || '').join(' | ') }));
    const code = out1.clip || out1.ta; console.log('운영자 창:', out1.t); console.log('채팅:', out1.log);
    chk(/복사 코드를 복사했어요 \(테스트 페이지 갓 모드 → \[캐릭터 복사\]에 붙여넣기\)/.test(out1.t) && /^AWC1:/.test(out1.clip), `클립보드에 복사 (${out1.clip.length}자): "${out1.t}"`);
    const want = await U.evaluate(() => __CC.make()); const got = await M.evaluate(c => { const r = __CC.decode(c); return r.o || r.err; }, code);
    const noBf = o => Object.assign({}, o, { bf: Object.keys(o.bf || {}).sort() });
    chk(got && J(noBf(got)) === J(noBf(want)), `코드 내용 = 유저 캐릭터 (${got && got.n} Lv.${got && got.lv} · 장비 ${got && got.e && got.e.length}칸 · 변신 ${got && got.pc})`);
    // 20초 안에 다시 누르면 받아 둔 정보로 바로
    await M.evaluate(() => navigator.clipboard.writeText('')); await M.click('#adm-cc'); await M.waitForTimeout(250);
    const again = await M.evaluate(() => navigator.clipboard.readText()); chk(again === code, '20초 안에 다시 [복사 코드] → 바로 복사 (같은 코드)');
    // 내 캐릭터 복사 코드
    await M.evaluate(() => navigator.clipboard.writeText('')); await M.click('#adm-ccme'); await M.waitForTimeout(250);
    const me = await M.evaluate(async () => { const c = await navigator.clipboard.readText(), r = __CC.decode(c); return { t: document.getElementById('adm-ccme-out').textContent, o: r.o, err: r.err }; });
    chk(me.o && me.o.c === 'knight' && /^ccM/.test(me.o.n) && /내 캐릭터 복사 코드를 복사했어요/.test(me.t), `[내 캐릭터 복사 코드]: ${me.o ? me.o.n + ' Lv.' + me.o.lv : me.err} · "${me.t}"`);
    await M.screenshot({ path: path.join(OUT, 'charcopy_adm.png') }).catch(() => {});
    // 테스트 페이지(멀티 아님)에서 적용
    const T = await page('ccT', false);
    await T.evaluate(() => { document.getElementById('godpanel').hidden = false; }); await T.fill('#gp-cc-in', code); await T.click('#gp-cc-go'); await T.click('#ask-yes'); await T.waitForTimeout(300);
    const R = await T.evaluate(() => ({ res: document.getElementById('gp-cc-res').textContent, m: __CC.make() }));
    console.log('적용:', R.res);
    chk(/똑같이 맞췄어요/.test(R.res) && J(R.m.e) === J(want.e) && J(R.m.s) === J(want.s) && R.m.pc === want.pc, `테스트 페이지 적용 → "똑같이 맞췄어요" · 장비·수치·변신 같음 (HP ${R.m.s.hp} · AC ${R.m.s.ac} · 전투력 ${R.m.s.cp})`);
    chk(!errs.length, '페이지 오류 없음' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  } catch (e) { bad.push('예외: ' + (e && e.message || e)); }
  finally { fs.writeFileSync(F, s0); if (b) await b.close(); }   // 테스트 페이지의 공개 키 원래대로
  console.log(ok.map(m => 'OK  ' + m).join('\n')); if (bad.length) console.log(bad.map(m => 'BAD ' + m).join('\n'));
  console.log(bad.length ? `FAIL ${bad.length}/${ok.length + bad.length}` : `PASS ${ok.length}/${ok.length}`); })();
