// 11/5 전설 마법인형(4단계) 그림 만들기 — 보스의 서 있는 그림(idle)을 게임과 같은 색 필터로 물들이고, 바닥 그림자(거의 검은 반투명 점)는 빼고,
// 인형 칸(144×120 · 8장 × 8방향)에 맞게 줄여 dev/out/doll_t4.png → python으로 assets/classic/doll_t4.webp · 인형 자리값(DOLLMETA)도 출력
// python3 dev/mkkt.py && KT_PORT=8905 bash dev/runkt.sh dev/mk_doll_t4.js && python3 -c "from PIL import Image; Image.open('dev/out/doll_t4.png').save('assets/classic/doll_t4.webp','WEBP',quality=90,method=6,alpha_quality=100)"
const { chromium } = require('playwright'); const fs = require('fs');
const DOLLS = ['deathknight', 'phoenix', 'ice_queen'];   // 이 순서 = 그림 안 줄 번호 (i)
(async () => { const b = await chromium.launch(); try {
  const p = await b.newPage(); await p.goto('http://127.0.0.1:' + (process.env.KT_PORT || 8766) + '/_kt2.html'); await p.waitForFunction(() => window.__T && __T.MSHEET, null, { timeout: 30000 });
  const r = await p.evaluate(async DOLLS => { const CW = 144, CH = 120, AX = 72, AY = 117, out = document.createElement('canvas'); out.width = CW * 8; out.height = CH * 8 * DOLLS.length; const og = out.getContext('2d'); og.imageSmoothingEnabled = true; og.imageSmoothingQuality = 'high';
    const load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; }), meta = {};
    for (let i = 0; i < DOLLS.length; i++) { const k = DOLLS[i], M = __T.MSHEET[k], img = await load(`assets/classic/mon_${M.src || k}_idle.webp`), W = M.W, H = M.H, cells = [];
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) { const raw = document.createElement('canvas'); raw.width = W; raw.height = H; const rg = raw.getContext('2d', { willReadFrequently: true }); rg.drawImage(img, f * W, r * H, W, H, 0, 0, W, H);
        const c = document.createElement('canvas'); c.width = W; c.height = H; const cg = c.getContext('2d', { willReadFrequently: true }); if (M.tint) cg.filter = M.tint; cg.drawImage(raw, 0, 0); cg.filter = 'none';
        const R = rg.getImageData(0, 0, W, H).data, I = cg.getImageData(0, 0, W, H), D = I.data;
        for (let q = 0; q < D.length; q += 4) { const a = R[q + 3]; if (!a) { D[q + 3] = 0; continue; } if (a <= 150 && Math.max(R[q], R[q + 1], R[q + 2]) < 22) { D[q + 3] = 0; continue; }   // 바닥 그림자
          if (D[q + 3] > 10) { const px = (q >> 2) % W, py = (q >> 2) / W | 0; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; } }
        cg.putImageData(I, 0, 0); cells.push(c); }
      const half = Math.max(M.ax - x0, x1 + 1 - M.ax), s = Math.min((CW - 6) / (2 * half), (AY - 5) / (y1 + 1 - y0)), oy = AY - (y1 + 1) * s;
      for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) og.drawImage(cells[r * 8 + f], f * CW + AX - M.ax * s, (i * 8 + r) * CH + oy, W * s, H * s);
      // 앞모습(1번 줄) 첫 장의 그림 범위 (가방 아이콘·합성 연출 크기용)
      const d = og.getImageData(0, (i * 8 + 1) * CH, CW, CH).data; let a0 = CW, b0 = CH, a1 = -1, b1 = -1; for (let q = 0; q < d.length; q += 4) if (d[q + 3] > 24) { const px = (q >> 2) % CW, py = (q >> 2) / CW | 0; if (px < a0) a0 = px; if (px > a1) a1 = px; if (py < b0) b0 = py; if (py > b1) b1 = py; }
      meta[k] = { i, ax: AX, ay: AY, bb: [a0, b0, a1 - a0 + 1, b1 - b0 + 1], s: +s.toFixed(4) }; }
    return { png: out.toDataURL('image/png'), meta }; }, DOLLS);
  fs.mkdirSync('dev/out', { recursive: true }); fs.writeFileSync('dev/out/doll_t4.png', Buffer.from(r.png.split(',')[1], 'base64'));
  console.log('meta', JSON.stringify(r.meta)); console.log('OK doll_t4.png');
} catch (e) { console.log('FAIL', e.message); } await b.close(); })();
