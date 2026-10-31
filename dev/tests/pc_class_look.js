// 소드·아크 시리즈 모습 비교 (KT_PORT=8774 bash dev/runkt.sh dev/tests/pc_class_look.js) — dev/out/pc_class_compare.png
// 줄: 기사 · 마법사 · 요정 / 칸: 다크 · 실버 · 소드 · 아크 (서 있기) | 다크 · 실버 · 소드 · 아크 (공격)
const { chromium } = require('playwright'); const login = require('../tq.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1700, height: 1050 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'pcL' + Date.now() % 1e4 });
  const ROW = +(process.env.ROW || 1), FR = +(process.env.FR || 0), AFR = +(process.env.AFR || 4), SC = +(process.env.SC || 1.6), ONLY = process.env.ONLY || '', HS = process.env.HS || '';
  const draw = () => p.evaluate(({ ROW, FR, AFR, SC, ONLY, HS }) => { let c = document.getElementById('cmp'); if (!c) { c = document.createElement('canvas'); c.id = 'cmp'; c.width = 1360; c.height = 730; c.style.cssText = 'position:fixed;left:10px;top:10px;z-index:9999;background:#3a4436'; document.body.appendChild(c); }
    const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); g.fillStyle = '#3a4436'; g.fillRect(0, 0, c.width, c.height);
    const J = [['knight', 'knight'], ['mage', 'wizard'], ['ranger', 'elf']].filter(([j]) => !ONLY || ONLY === j), ok = [], CW = 96 * SC, RH = 145 * SC;
    J.forEach(([j], r) => { const keys = ['pm_d' + j, 'pm_s' + j, 'pc_sword_' + j, 'pc_arc_' + j];
      [['idle', FR], ['attack', AFR]].filter((q, h) => HS === '' || +HS === h).forEach(([a, f], h) => keys.forEach((k, i) => { const x = CW * 0.55 + (h * 4 + i) * CW + h * 20, y = RH * 0.86 + r * RH; g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y, 30, 8, 0, 0, 7); g.fill();
        g.save(); g.translate(x, y); g.scale(SC, SC); ok.push(PCG.drawForm(g, k, a, f, ROW, 0, 0)); g.restore();
        const NM = { d: '다크', s: '실버', sword: '소드', arc: '아크' }, JB = { knight: '나이트', mage: '메이지', ranger: '레인저' }, m = k.match(/^p[mc]_(sword_|arc_|d|s)(\w+)$/), nm = m ? NM[m[1].replace('_', '')] + JB[m[2]] : k;
        g.fillStyle = ['#c8b8b0', '#f4f4f4', '#8fd8ff', '#ffd27a'][i]; g.font = '700 14px "Noto Sans KR",sans-serif'; g.textAlign = 'center'; g.fillText(nm, x, y + 22); }));
      if (!r) [['서 있기', 0], ['공격', 1]].filter((q, h) => HS === '' || +HS === h).forEach(([t], h) => { g.fillStyle = '#e8d8a8'; g.font = '800 16px "Noto Sans KR",sans-serif'; g.textAlign = 'center'; g.fillText(t + ' (다크 · 실버 · 소드 · 아크)', CW * 0.55 + (h * 4 + 1.5) * CW + h * 20, 22); }); });
    return ok; }, { ROW, FR, AFR, SC, ONLY, HS });
  let ok = []; for (let i = 0; i < 30; i++) { ok = await draw(); if (ok.every(Boolean)) break; await p.waitForTimeout(400); }
  await p.waitForTimeout(300); await draw(); console.log('drawn', ok.filter(Boolean).length, '/', ok.length);
  await (await p.$('#cmp')).screenshot({ path: process.env.OUT || 'dev/out/pc_class_compare.png' });
  console.log(errs.length ? 'ERR ' + errs.join(' | ') : 'no errors'); await b.close(); })();
