// 2단계 연출(마법·타격 빛·불티) 눈으로 확인 — python3 dev/mkkt.py && bash dev/runkt.sh dev/tests/gl_mx.js
//   화룡의 둥지 2구역 · 마법을 몹에 맞힌 바로 그 순간에 멈추고, 같은 장면을 원래(2D)/새 그래픽으로 한 번씩 그려 나란히 → dev/out/gl_mx_sheet.png
const { chromium } = require('playwright'); const S = require('./gl_scene.js'); const path = require('path'); const { execFileSync } = require('child_process'); const OUT = path.resolve(__dirname, '../out');
const IDS = (process.env.MXI || 'meteor,blizzard,quake,ebolt,sunburst,heal,levelup,crit,breath').split(',');
(async () => { const b = await chromium.launch({ args: S.ARGS }); const p = await (await b.newContext({ viewport: { width: 1000, height: 640 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('aden_gl', 'force'); } catch (e) {} });
  await S.setup(p, { chars: 3, mobs: 8, fx: false }); await p.waitForTimeout(2500); if (process.env.NOBLOOM) await p.evaluate(() => GLR.bloom(false)); if (process.env.NOMX) await p.evaluate(() => { GLR.mx = () => {}; });
  for (const id of IDS) {
    await S.freeze(p); await p.evaluate(() => { GLR._dbg.spk(), GLR._dbg.ts = 0.0001; });   // 불티 시간 거의 멈춤 → 나온 직후 모습
    await p.evaluate(id => { const T = __T, hq = T.W2P(T.hero.x, T.hero.z), dd = m => { const q = T.W2P(m.x, m.z); return Math.hypot(q[0] - hq[0] - 140, q[1] - hq[1] + 40); }, f = T.foxes.filter(m => !m.dead && !T.MOB[m.kind].boss).sort((a, b) => dd(a) - dd(b))[0]; GLR._dbg.spk(), GLR._dbg.ts = 1; const t0 = performance.now(); while (performance.now() - t0 < 60); GLR._dbg.spk(), GLR._dbg.ts = 0.0001;
      if (id === 'heal') T.MXF_.mxSelf('heal', T.hero); else if (id === 'levelup') { const q = T.W2P(T.hero.x, T.hero.z); GLR.mx('sfx', 'levelup', q[0], q[1], 0); } else if (id === 'breath') { const q = T.W2P(f.x, f.z); GLR.mx('breath', 0, q[0], q[1], 40, { dx: hq[0] - q[0], dy: hq[1] - q[1] }); } else if (id === 'crit') { const q = T.W2P(f.x, f.z); GLR.spark(q[0], q[1] - 30, 30, { c: '#ffd070', sp: 190, life: 0.5 }); } else T.MXF_.mxHit(id, f); }, id);
    // 불티가 조금 날아간 모습: 시간을 0.12초 흘림
    await p.evaluate(() => { GLR._dbg.spk(), GLR._dbg.ts = 1; const t0 = performance.now(); while (performance.now() - t0 < 120); GLR._dbg.spk(), GLR._dbg.ts = 0.0001; });
    await S.redraw(p, false); await p.waitForTimeout(100); await p.screenshot({ path: path.join(OUT, `gl_mx_${id}_off.png`) });
    await S.redraw(p, true); await p.waitForTimeout(100); await p.screenshot({ path: path.join(OUT, `gl_mx_${id}_on.png`) });
    await p.evaluate(() => { GLR._dbg.spk(), GLR._dbg.ts = 1; window.__glStill = false; window.__bgOff = false; window.requestAnimationFrame = window.__raf0; if (window.__frozen) window.__raf0(window.__frozen); }); await p.waitForTimeout(1500); }
  execFileSync('python3', ['-c', `
from PIL import Image
ids=${JSON.stringify(IDS)}; W=500; H=320; o=Image.new('RGB',(W*2,H*len(ids)))
for i,d in enumerate(ids):
  for j,m in enumerate(['off','on']): o.paste(Image.open('${OUT}/gl_mx_%s_%s.png'%(d,m)).crop((250,140,750,460)),(j*W,i*H))
o.save('${OUT}/gl_mx_sheet.png')`]);
  console.log(JSON.stringify({ errs: errs.slice(0, 3), on: await p.evaluate(() => GLR.on()) })); await b.close(); })();
