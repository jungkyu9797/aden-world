// 새 그래픽(WebGL) 정확도 테스트 — python3 dev/mkkt.py && KT_PORT=8768 bash dev/runkt.sh dev/tests/gl_parity.js
//   gl_scene.js 장면(화룡의 둥지 2구역 · 30명 + 몹 30 + 타격 효과)을 멈춘 뒤, 같은 순간을 GL 끔(2D)/켬으로 한 번씩 다시 그려 화면을 비교
//   결과: dev/out/gl_off.png · gl_on.png · gl_diff.png(차이 큰 곳 빨강) · gl_parity.json (평균 픽셀 차이 · 차이 큰 픽셀 비율 · 차이 큰 칸 목록)
//   장면 두 가지: still(움직임 없음 · 이펙트 없음 = 바닥·캐릭터·몹·그림자·이름표·HP 막대) / fx(타격 효과 포함)
const { chromium } = require('playwright'); const S = require('./gl_scene.js'); const { execFileSync } = require('child_process'); const path = require('path'); const fs = require('fs');
const R = path.resolve(__dirname, '../..'), OUT = path.join(R, 'dev/out');
const PY = `
import sys, json, numpy as np
from PIL import Image
a = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(np.int16); b = np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(np.int16)
d = np.abs(a - b).max(axis=2); H, W = d.shape; big = d > 48
o = (a * 0.35).astype(np.uint8); o[big] = [255, 40, 40]; o[(d > 16) & ~big] = [255, 200, 60]; Image.fromarray(o).save(sys.argv[3])
cells = []; G = 64
for y in range(0, H, G):
  for x in range(0, W, G):
    r = float(big[y:y+G, x:x+G].mean())
    if r > 0.02: cells.append([x, y, round(r * 100, 1)])
cells.sort(key=lambda c: -c[2])
print(json.dumps({'mean': round(float(np.abs(a - b).mean()), 3), 'gt16': round(float((d > 16).mean()) * 100, 3), 'gt48': round(float(big.mean()) * 100, 3), 'cells': cells[:12], 'ncells': len(cells)}))
`;
function diff(a, b, o) { return JSON.parse(execFileSync('python3', ['-c', PY, a, b, o]).toString()); }
async function shot(p, gl, file) { const r = await S.redraw(p, gl); await p.waitForTimeout(150); await p.screenshot({ path: file }); return r; }
(async () => { const b = await chromium.launch({ args: S.ARGS }); const res = {};
  for (const mode of ['still', 'fx']) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (/\[GL\]/.test(m.text())) errs.push(m.text()); });
    await p.addInitScript(() => { try { localStorage.setItem('aden_gl', 'force'); localStorage.setItem('aden_gl_bloom', '0'); /* 빛 번짐은 일부러 바뀌는 그림이라 정확도 비교에서는 끔 */ } catch (e) {} });
    await S.setup(p, { chars: 30, mobs: 30, fx: mode === 'fx', still: mode === 'still' });
    if (mode === 'still') await p.evaluate(() => { window.__glStill = true; });
    await p.waitForTimeout(mode === 'fx' ? 1500 : 4000);   // GL로 몇 프레임 그려 텍스처를 다 올려 둠
    await p.waitForFunction(() => GLR.on() && GLR.stats().upPx < 5e5, null, { timeout: 60000, polling: 500 }).catch(() => console.log('  (텍스처 올리기 기다림 시간 넘김)'));
    await S.freeze(p);
    const f0 = path.join(OUT, `gl_off${mode === 'fx' ? '_fx' : ''}.png`), f1 = path.join(OUT, `gl_on${mode === 'fx' ? '_fx' : ''}.png`), fd = path.join(OUT, `gl_diff${mode === 'fx' ? '_fx' : ''}.png`);
    const r0 = await shot(p, false, f0), r1 = await shot(p, true, f1);
    const fn = path.join(OUT, `gl_on_nopath${mode === 'fx' ? '_fx' : ''}.png`); await p.evaluate(() => { GLR._dbg.nopath = true; }); const r2 = await shot(p, true, fn); await p.evaluate(() => { GLR._dbg.nopath = false; }); const r0b = await shot(p, false, path.join(OUT, '_gl_off2.png'));
    const d = diff(f0, f1, fd), dn = diff(f0, fn, path.join(OUT, '_gl_dn.png')), self = diff(f0, path.join(OUT, '_gl_off2.png'), path.join(OUT, '_gl_self.png'));   // self = 2D를 두 번 그린 차이 (장면이 정말 멈췄는지 · 기준 잡음)
    const why = await p.evaluate(() => GLR.why()), info = await p.evaluate(() => GLR.info());
    res[mode] = { diff: d, diffNoPath: { mean: dn.mean, gt48: dn.gt48 }, self: { mean: self.mean, gt48: self.gt48 }, gl: typeof r1 === 'object' ? { img: r1.img, imgR: r1.imgR, txt: r1.txt, txtR: r1.txtR, rect: r1.rect, rectR: r1.rectR, ell: r1.ell, path: r1.path, poly: r1.poly, pline: r1.pline, runs: r1.runs, batches: r1.batches, quads: r1.quads } : r1, off: r0, why, renderer: info.renderer, errors: errs.slice(0, 5) };
    console.log(mode, JSON.stringify(res[mode])); await ctx.close(); }
  for (const f of ['_gl_off2.png', '_gl_self.png', '_gl_dn.png']) try { fs.unlinkSync(path.join(OUT, f)); } catch (e) {}
  fs.writeFileSync(path.join(OUT, 'gl_parity.json'), JSON.stringify(res, null, 1));
  const ok = m => res[m] && res[m].diff.gt48 < 1.0 && !res[m].errors.length;
  console.log(`\n정확도: 장면(still) 평균 차이 ${res.still.diff.mean} · 큰 차이 픽셀 ${res.still.diff.gt48}% (기준 잡음 ${res.still.self.gt48}% · 경로 GL 전 ${res.still.diffNoPath.gt48}%) → ${ok('still') ? '통과' : '확인 필요'}`);
  console.log(`정확도: 이펙트(fx)   평균 차이 ${res.fx.diff.mean} · 큰 차이 픽셀 ${res.fx.diff.gt48}% (기준 잡음 ${res.fx.self.gt48}% · 경로 GL 전 ${res.fx.diffNoPath.gt48}%) → ${ok('fx') ? '통과' : '확인 필요'}`);
  await b.close(); })();
