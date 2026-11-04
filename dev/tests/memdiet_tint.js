// 11/4 메모리 다이어트: 장비 색 물들이기를 '그림 한 장 전체' 대신 '그리는 한 칸만' 해도 화면에 그려지는 화소가 같은지
//   (예전 tintSheet: 통짜 시트 전체에 색 필터 → 한 칸을 잘라 0.5배로 그림 · 새 tintCell: 그 칸만 필터로 물들인 작은 캔버스 → 같은 크기로 그림)
//   KT_PORT=8902 bash dev/runkt.sh dev/tests/memdiet_tint.js   — 실제로 그리는 배율 = 0.5(그림) × 2(PC 확대) × 화면 배율 → PC 1·1.5·2 · 폰 0.5~1 · 'high'·'low' 보간 · 칸 위치 여러 곳 · 실제 칸 크기(KLM·CL_DEF)
const { chromium } = require('playwright'); const fs = require('fs');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const SRC = fs.readFileSync('src/game.js', 'utf8'), KLM = JSON.parse(/const KLM = (\{.*?\});/.exec(SRC)[1]), CLS = SRC.slice(SRC.indexOf('const CL_DEF = {'));
const ELF = JSON.parse(/elf: \{ pfx: 'elfl', layers: \[[^\]]*\], meta: (\{.*?\}) \},/.exec(CLS)[1]), WIZ = JSON.parse(/wizard: \{ pfx: 'magel', layers: \[[^\]]*\], meta: (\{.*?\}) \}/.exec(CLS)[1]);
const ALL = []; for (const [p, M] of [['knight', KLM], ['elfl', ELF], ['magel', WIZ]]) for (const l in M) if (l !== 'body') for (const a in M[l]) ALL.push([`${p}_${l}_${a}.webp`, M[l][a].W, M[l][a].H, M[l][a].n]);
const FILES = ALL.filter(x => fs.existsSync('assets/classic/' + x[0])).filter((x, i) => i % 6 === 0).slice(0, +(process.env.TN || 22));   // 실제 칸 크기 (게임의 KLM·CL_DEF)
const AL = +(process.env.TA || 2);   // 한 칸을 짝수 자리·짝수 크기로 맞추고 둘레 AL화소를 같이 물들임 (0.5배 'high'는 크롬이 밉맵(2×2 평균)을 쓰므로 통짜 그림과 칸 경계를 맞춰야 같은 화소)
const FILTERS = ['sepia(.7) saturate(1.25) brightness(.72) contrast(1.1)', 'grayscale(1) brightness(.34) contrast(1.7)', 'sepia(1) hue-rotate(178deg) saturate(2.2) brightness(1.25)', 'grayscale(.4) brightness(1.5) opacity(.55)'];
(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.goto(`http://127.0.0.1:${process.env.KT_PORT || 8766}/dev/`);
  const r = await p.evaluate(async ([files, filters, AL]) => { const out = [];
    for (const [fn, W, H, nfr] of files) { const img = new Image(); img.src = '/assets/classic/' + fn; await img.decode(); const IW = img.naturalWidth, IH = img.naturalHeight, rows = Math.round(IH / H);
      for (const f of filters) { const S = document.createElement('canvas'); S.width = img.naturalWidth; S.height = img.naturalHeight; const sg = S.getContext('2d'); sg.filter = f; sg.drawImage(img, 0, 0);   // 예전: 통짜
        for (const [fr, row] of [[0, 0], [3, 1], [5, 4], [nfr - 1, rows - 1]]) { const sx = fr * W, sy = row * H, x0 = AL ? Math.max(0, (sx - AL) & ~1) : sx, y0 = AL ? Math.max(0, (sy - AL) & ~1) : sy, x1 = AL ? Math.min(IW, (sx + W + AL + 1) & ~1) : sx + W, y1 = AL ? Math.min(IH, (sy + H + AL + 1) & ~1) : sy + H;
          const C = document.createElement('canvas'); C.width = x1 - x0; C.height = y1 - y0; const cg = C.getContext('2d'); cg.filter = f; cg.drawImage(img, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);   // 새: 한 칸 (+둘레)
          for (const sc of [0.5, 0.75, 1, 1.5, 2]) for (const q of ['high', 'low']) { const draw = (src, x0, y0, dx = 3, dy = 4) => { const D = document.createElement('canvas'); D.width = Math.ceil(W * sc) + 8; D.height = Math.ceil(H * sc) + 8; const g = D.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = q; g.drawImage(src, x0, y0, W, H, dx, dy, W * sc, H * sc); return g.getImageData(0, 0, D.width, D.height).data; };
            const a = draw(S, sx, sy), c = draw(C, sx - x0, sy - y0), a2 = Number.isInteger(sc) || sc === 0.5 ? null : draw(S, sx, sy, 3.05, 4.05); let n = 0, mx = 0, ph = 0; for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - c[i]); if (d) { n++; if (d > mx) mx = d; } if (a2) ph = Math.max(ph, Math.abs(a[i] - a2[i])); } out.push({ fn, f: f.slice(0, 12), fr, row, sc, q, n, mx, ph, px: a.length / 4, odd: IW % 2 + IH % 2 }); } } } }
    return out; }, [FILES, FILTERS, AL]);
  const bad = r.filter(x => x.n); const byS = {}; for (const x of r) { const k = x.sc + ' ' + x.q; const o = byS[k] || (byS[k] = { cases: 0, diffCases: 0, maxd: 0, diffPx: 0, phase: 0 }); o.cases++; o.phase = Math.max(o.phase, x.ph); if (x.n) { o.diffCases++; o.diffPx += x.n; o.maxd = Math.max(o.maxd, x.mx); } }
  console.log(JSON.stringify(byS)); if (bad.length) console.log('diff samples', JSON.stringify(bad.slice(0, 8)));
  ok(r.length >= 100, `비교한 경우 ${r.length}개 (그림 ${FILES.length}장 × 색 ${FILTERS.length} × 칸 4 × 배율 5 × 보간 2 · 둘레 ${AL})`);
  const intK = Object.keys(byS).filter(k => /^(0\.5|1|2) /.test(k)), fracK = Object.keys(byS).filter(k => !intK.includes(k));
  ok(intK.every(k => byS[k].diffCases === 0), `배율 0.5·1·2 (보통 PC 화면 = 1 · 배율 200% = 2 · 폰 = 0.5): 한 칸만 물들여 그린 그림 = 통짜를 물들여 그린 그림 (화소 하나까지 같음) ${intK.map(k => k + ' 다른 경우 ' + byS[k].diffCases).join(' · ')}`);
  ok(fracK.every(k => byS[k].maxd <= byS[k].phase), `배율 0.75·1.5 (화면 배율 150% 등): 차이는 그림이 0.05화소 움직일 때 생기는 보간 차이보다 작음 ${fracK.map(k => k + ' 최대 ' + byS[k].maxd + ' ≤ ' + byS[k].phase).join(' · ')}`);
  if (process.exitCode !== 1) console.log('ALL OK'); await b.close(); })();
