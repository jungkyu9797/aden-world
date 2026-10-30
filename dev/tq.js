// 빠른 테스트 로그인: 고정 대기 없이 조건으로 기다림
module.exports = async function login(p, { acc, cls = 'knight', name, mp = false, init = null } = {}) {
  if (init) await p.addInitScript(init);
  await p.goto('http://127.0.0.1:' + (process.env.KT_PORT || 8766) + '/_kt2.html' + (mp ? '?mp=bc' : ''));
  await p.waitForSelector('#lg-mode', { state: 'visible' }); await p.click('#lg-mode');
  acc = acc || 't' + Date.now() % 1e7; await p.fill('#lg-acc', acc); await p.fill('#lg-pw', 'abcd'); await p.fill('#lg-pw2', 'abcd'); await p.click('#lg-go');
  await p.waitForSelector(`.cs-card[data-cls="${cls}"]`, { state: 'visible', timeout: 30000 }); await p.click(`.cs-card[data-cls="${cls}"]`); await p.click('#cs-start');
  await p.waitForSelector('#nm-in', { state: 'visible' }); await p.fill('#nm-in', name || 'n' + Date.now() % 1e5); await p.click('#nm-go');
  await p.waitForFunction(() => window.__gameOn && window.__T && __T.SCENE === 'town', null, { timeout: 30000 }); await p.waitForTimeout(300); return p; };
