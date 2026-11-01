// ============================================================ 새 그래픽(WebGL2) — 0단계 시제품 (11/1 · 갈래 work/webgl · 설계·결과는 dev/rooms/webgl.md)
// 구조 (A · 기록용 가짜 2D 컨텍스트): game.js의 drawWorld(g)에 진짜 2D 컨텍스트 대신 GLR.ctx를 넘긴다. 게임 그리기 코드는 하나도 안 바뀜.
//   · GL로 바로: 그림(drawImage) · 글자(fillText/strokeText → 글자 아틀라스) · 사각형 채우기(단색·선형/원형 그라데이션·반복 무늬)
//                · 원/타원 채우기(단색·그라데이션)와 테두리(단색) · 선 한 줄(단색)
//       (텍스처 15장까지 한 번에 · 미리 곱한 알파 · 합성: 보통/더하기(lighter)/곱하기/스크린/지우기/위에만 · 색 필터 brightness·saturate·sepia·hue-rotate·grayscale·contrast·invert·opacity는 셰이더)
//   · 나머지(여러 점 경로·곡선·클립·흐림/그림자 필터·특수 합성·점선) → 보조 2D 캔버스(V)에 그대로 그린 뒤 그 부분만 텍스처로 올려 '같은 순서'로 GL 위에 얹음
//       (뒤에 오는 GL 그림과 겹치지 않으면 여러 번을 한 장으로 모아서 올림 = 올리는 횟수 줄임)
//   · 켜는 법: 주소 ?gl=1 · localStorage aden_gl=1 · 테스트 페이지(DEMO) ESC 메뉴 [새 그래픽(시험)]. 기본은 꺼짐 — 꺼져 있으면 이 파일은 아무것도 안 함(게임은 지금과 100% 같음).
//   · WebGL2가 없거나, 만들다 실패하거나, 컨텍스트를 잃으면 자동으로 원래 Canvas2D로 돌아감. 봇 호스트(그림 안 그림)는 game.js 쪽에서 아예 부르지 않음.
(() => {
  'use strict';
  const LSG = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const QS = location.search;
  // 'force': 소프트웨어 GL(SwiftShader 등 · 그래픽카드 없음)에서도 켬 — 시험용 (헤드리스 테스트). 보통은 소프트웨어 GL이면 켜지 않고 원래 그래픽.
  const FORCE = /[?&]gl=force\b/.test(QS) || (!/[?&]gl=/.test(QS) && LSG('aden_gl') === 'force');
  let WANT = /[?&]gl=(1|force)\b/.test(QS) ? true : /[?&]gl=0\b/.test(QS) ? false : /^(1|force)$/.test(LSG('aden_gl') || '');
  let FAILED = false, LOST = false, why = '';
  // ---------------------------------------------------------------- 통계 (한 프레임)
  const ZST = () => ({ tUp: 0, tRun: 0, tTxt: 0, abs: 0, stn: 0, shadow: 0, tShadow: 0, bloom: 0, bloomQ: 0, tBloom: 0, poly: 0, pline: 0, img: 0, imgR: 0, txt: 0, txtR: 0, txtNew: 0, rect: 0, rectR: 0, ell: 0, seg: 0, grad: 0, path: 0, other: 0, runs: 0, runPx: 0, defer: 0, batches: 0, quads: 0, up: 0, upPx: 0, approx: 0, ms: 0 });
  let ST = ZST(), LAST = ZST();
  const why_ = {};   // 그림이 GL 대신 2D로 간 이유 (누적 · 개발용)
  const note = k => { why_[k] = (why_[k] || 0) + 1; };

  // ---------------------------------------------------------------- 캔버스가 바뀌었는지 알기: 2D 그리기 함수가 불리면 그 캔버스 번호(__glv)를 올림 (GL을 켰을 때만 한 번 설치)
  let patched = false;
  function patch() { if (patched) return; patched = true;
    const bump = c => { if (c) c.__glv = (c.__glv | 0) + 1; };
    for (const P of [window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype, window.OffscreenCanvasRenderingContext2D && OffscreenCanvasRenderingContext2D.prototype]) { if (!P) continue;
      for (const k of ['drawImage', 'fillRect', 'strokeRect', 'clearRect', 'fill', 'stroke', 'fillText', 'strokeText', 'putImageData', 'reset']) { const o = P[k]; if (typeof o !== 'function') continue;
        P[k] = function () { bump(this.canvas); return o.apply(this, arguments); }; } }
    for (const Cn of [window.HTMLCanvasElement, window.OffscreenCanvas]) { if (!Cn) continue; for (const k of ['width', 'height']) { const d = Object.getOwnPropertyDescriptor(Cn.prototype, k); if (!d || !d.set) continue;
      Object.defineProperty(Cn.prototype, k, { configurable: true, enumerable: d.enumerable, get: d.get, set(v) { this.__glv = (this.__glv | 0) + 1; d.set.call(this, v); } }); } }
    // 그라데이션·무늬: 어느 캔버스에서 만들었든 만든 값을 기억 (진짜 CanvasGradient/CanvasPattern 그대로 · GL로 칠할 때 씀)
    const GP = window.CanvasGradient && CanvasGradient.prototype, PP = window.CanvasPattern && CanvasPattern.prototype;
    if (GP) { const add = GP.addColorStop; GP.addColorStop = function (o, c) { add.call(this, o, c); const r = GREC.get(this); if (r) { r.st.push(+o, String(c)); r.key = null; } }; }
    if (PP && PP.setTransform) { const sx = PP.setTransform; PP.setTransform = function (m) { const r = PREC.get(this); if (r) r.xf = true; return sx.call(this, m); }; }
    for (const P of [window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype, window.OffscreenCanvasRenderingContext2D && OffscreenCanvasRenderingContext2D.prototype]) { if (!P) continue;
      const cl = P.createLinearGradient, cr = P.createRadialGradient, cp = P.createPattern;
      P.createLinearGradient = function (x0, y0, x1, y1) { const g = cl.call(this, x0, y0, x1, y1); GREC.set(g, { type: 'L', a: [x0, y0, x1, y1], st: [], key: null }); return g; };
      P.createRadialGradient = function (x0, y0, r0, x1, y1, r1) { const g = cr.call(this, x0, y0, r0, x1, y1, r1); GREC.set(g, { type: 'R', a: [x0, y0, r0, x1, y1, r1], st: [], key: null }); return g; };
      P.createPattern = function (img, rep) { const p = cp.call(this, img, rep); if (p) PREC.set(p, { img, rep: rep || 'repeat', xf: false }); return p; }; } }

  // ---------------------------------------------------------------- 색 필터 → 색 행렬 (CSS Filter Effects 규격 그대로 · 단계마다 0~1로 자름 = 크롬과 같음)
  const FPC = new Map();
  function angle(s) { const v = parseFloat(s); if (!isFinite(v)) return NaN; return /rad$/.test(s) ? v : /grad$/.test(s) ? v * Math.PI / 200 : /turn$/.test(s) ? v * Math.PI * 2 : v * Math.PI / 180; }
  function fmat(fn, v) {   // 행 우선 4×5 (r,g,b,a,+)
    const I = () => [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
    const c01 = x => Math.max(0, Math.min(1, x));
    if (fn === 'brightness') { const m = I(); m[0] = m[6] = m[12] = v; return m; }
    if (fn === 'contrast') { const m = I(), o = 0.5 - 0.5 * v; m[0] = m[6] = m[12] = v; m[4] = m[9] = m[14] = o; return m; }
    if (fn === 'saturate') { const s = v; return [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s, 0, 0, 0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s, 0, 0, 0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s, 0, 0, 0, 0, 0, 1, 0]; }
    if (fn === 'grayscale') { const s = 1 - c01(v); return [0.2126 + 0.7874 * s, 0.7152 - 0.7152 * s, 0.0722 - 0.0722 * s, 0, 0, 0.2126 - 0.2126 * s, 0.7152 + 0.2848 * s, 0.0722 - 0.0722 * s, 0, 0, 0.2126 - 0.2126 * s, 0.7152 - 0.7152 * s, 0.0722 + 0.9278 * s, 0, 0, 0, 0, 0, 1, 0]; }
    if (fn === 'sepia') { const s = 1 - c01(v); return [0.393 + 0.607 * s, 0.769 - 0.769 * s, 0.189 - 0.189 * s, 0, 0, 0.349 - 0.349 * s, 0.686 + 0.314 * s, 0.168 - 0.168 * s, 0, 0, 0.272 - 0.272 * s, 0.534 - 0.534 * s, 0.131 + 0.869 * s, 0, 0, 0, 0, 0, 1, 0]; }
    if (fn === 'hue-rotate') { const C = Math.cos(v), S = Math.sin(v); return [0.213 + C * 0.787 - S * 0.213, 0.715 - C * 0.715 - S * 0.715, 0.072 - C * 0.072 + S * 0.928, 0, 0, 0.213 - C * 0.213 + S * 0.143, 0.715 + C * 0.285 + S * 0.140, 0.072 - C * 0.072 - S * 0.283, 0, 0, 0.213 - C * 0.213 - S * 0.787, 0.715 - C * 0.715 + S * 0.715, 0.072 + C * 0.928 + S * 0.072, 0, 0, 0, 0, 0, 1, 0]; }
    if (fn === 'invert') { const a = c01(v), m = I(); m[0] = m[6] = m[12] = 1 - 2 * a; m[4] = m[9] = m[14] = a; return m; }
    if (fn === 'opacity') { const m = I(); m[18] = c01(v); return m; }
    return null; }
  function parseFilter(s) { if (!s || s === 'none') return null; let r = FPC.get(s); if (r !== undefined) return r; r = parseF(s); if (FPC.size > 400) FPC.clear(); FPC.set(s, r); return r; }
  function parseF(s) { const re = /([a-z-]+)\(([^()]*)\)/g; let m, at = 0; const L = [];
    while ((m = re.exec(s))) { if (s.slice(at, m.index).trim()) return false; at = re.lastIndex; const fn = m[1], a = m[2].trim();
      const v = fn === 'hue-rotate' ? (a === '' ? 0 : angle(a)) : a === '' ? 1 : /%$/.test(a) ? parseFloat(a) / 100 : parseFloat(a); if (!isFinite(v)) return false;
      const M = fmat(fn, v); if (!M) return false; L.push(M); }
    if (s.slice(at).trim()) return false; if (!L.length) return null;
    while (L.length > 4) { const b = L.pop(), a = L.pop(); L.push(mul45(b, a)); }   // 5단계 넘으면 마지막 둘을 합침 (자름 한 번 빠짐 · 거의 없음)
    const M = new Float32Array(64), O = new Float32Array(16);
    L.forEach((q, k) => { for (let r = 0; r < 4; r++) { for (let c = 0; c < 4; c++) M[k * 16 + c * 4 + r] = q[r * 5 + c]; O[k * 4 + r] = q[r * 5 + 4]; } });
    return { n: L.length, M, O, key: s }; }
  function mul45(b, a) { const o = new Array(20).fill(0); for (let r = 0; r < 4; r++) { for (let c = 0; c < 5; c++) { let s = c === 4 ? b[r * 5 + 4] : 0; for (let k = 0; k < 4; k++) s += b[r * 5 + k] * a[k * 5 + c]; o[r * 5 + c] = s; } } return o; }

  // ---------------------------------------------------------------- 색 글자 → RGBA (캐시)
  const CPC = new Map(); let pcx = null;
  function parseColor(s) { let r = CPC.get(s); if (r !== undefined) return r; if (!pcx) pcx = document.createElement('canvas').getContext('2d');
    pcx.fillStyle = '#000'; pcx.fillStyle = s; const n = pcx.fillStyle; r = null; let m;
    if ((m = /^#([0-9a-f]{6})$/i.exec(n))) { const v = parseInt(m[1], 16); r = [(v >> 16) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255, 1]; }
    else if ((m = /^rgba?\(([^)]+)\)$/.exec(n))) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); if (p.length >= 3) r = [p[0] / 255, p[1] / 255, p[2] / 255, p.length > 3 ? p[3] : 1]; }
    if (CPC.size > 2000) CPC.clear(); CPC.set(s, r); return r; }

  const GREC = new WeakMap(), PREC = new WeakMap();   // 그라데이션·무늬 → 만든 값 (patch에서 기록)

  // ---------------------------------------------------------------- WebGL 쪽
  let cvs = null, gl = null, PR = null, curProg = null, bCx = false, vao = null, vbo = null, ibo = null, white = null, layer = null, layerW = 0, layerH = 0;
  let SMP = null, MAXT = 4096, NS = 15, frameNo = 0, PW = 0, PH = 0, tAll = 0;
  const FL = 13, MAXQ = 4096, VB = new ArrayBuffer(MAXQ * 4 * FL * 4), VF = new Float32Array(VB), VU = new Uint32Array(VB);   // 꼭짓점: x y · u v · gx gy · 색 · 칸 · 모양 · p0..p3
  const VS = `#version 300 es
layout(location=0) in vec2 aP; layout(location=1) in vec2 aT; layout(location=2) in vec2 aG; layout(location=3) in vec4 aC; layout(location=4) in float aS; layout(location=5) in float aM; layout(location=6) in vec4 aQ;
uniform vec2 uR; out vec2 vT; out vec2 vG; out vec4 vC; out vec4 vP; flat out int vS; flat out int vM;
void main(){ vT=aT; vG=aG; vC=aC; vP=aQ; vS=int(aS+.5); vM=int(aM+.5); gl_Position=vec4(aP.x*2./uR.x-1., 1.-aP.y*2./uR.y, 0., 1.); }`;
  const TXF = n => `vec4 tx(vec2 t){ switch(vS){ ${Array.from({ length: n }, (_, i) => `case ${i}: return texture(uT[${i}],t);`).join(' ')} } return vec4(0.); }`;
  // 빠른 셰이더: 그림만 (대부분의 배치) · 모양·그라데이션·색 필터가 섞인 배치만 아래 셰이더
  const FS0 = n => `#version 300 es
precision highp float; precision highp int;
uniform sampler2D uT[${n}]; in vec2 vT; in vec4 vC; flat in int vS; out vec4 o;
${TXF(n)}
void main(){ o=tx(vT)*vC; }`;
  // 모양(vM&3): 0 사각형 · 1 타원 채우기 · 2 타원 테두리 · 3 선 한 줄 / 칠(vM>>2): 0 텍스처(단색은 흰 텍스처) · 1 선형 그라데이션 · 2 원형 그라데이션
  const FS = n => `#version 300 es
precision highp float; precision highp int;
uniform sampler2D uT[${n}]; uniform sampler2D uG; uniform int uN; uniform mat4 uM[4]; uniform vec4 uO[4];
in vec2 vT; in vec2 vG; in vec4 vC; in vec4 vP; flat in int vS; flat in int vM; out vec4 o;
${TXF(n)}
void main(){ int sh=vM&3, pa=(vM>>2)&3; float d=length(vT); float w=max(length(vec2(dFdx(d),dFdy(d))),1e-6); vec4 c;
  if(pa==0) c=tx(sh==0?vT:vec2(.5)); else { float t=pa==1?vG.x:(length(vG)-vP.y)/(vP.z-vP.y); c=texture(uG,vec2((clamp(t,0.,1.)*255.+.5)/256.,vP.x)); }
  if(uN>0 && pa==0){ float a=c.a; vec4 q=vec4(a>0.?c.rgb/a:vec3(0.),a); for(int k=0;k<4;k++){ if(k>=uN) break; q=clamp(uM[k]*q+uO[k],0.,1.); } c=vec4(q.rgb*q.a,q.a); }
  if((vM&16)!=0) c=vec4(c.a);
  if(sh==1) c*=clamp((1.-d)/w+.5,0.,1.); else if(sh==2) c*=clamp(vP.w-abs((d-1.)/w)+.5,0.,1.); else if(sh==3) c*=clamp(vP.w-abs(vT.y)+.5,0.,1.)*clamp(vP.z-abs(vT.x)+.5,0.,1.);
  o=c*vC; }`;
  const RAMP = { tex: null, m: new Map(), n: 0, H: 256, c: null, g: null };
  function init() { if (gl || FAILED) return !!gl;
    try { cvs = document.createElement('canvas'); cvs.id = 'glcv'; cvs.setAttribute('aria-hidden', 'true'); cvs.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;z-index:-1;pointer-events:none;display:none';
      gl = cvs.getContext('webgl2', { alpha: false, antialias: !(window.matchMedia && matchMedia('(pointer:coarse)').matches) && LSG('aden_gl_aa') !== '0',   /* 1단계: 경로를 삼각형으로 그리므로 PC는 MSAA(가장자리 부드럽게) · 휴대폰은 끔 */ depth: false, stencil: true, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: !FORCE });
      if (!gl) throw new Error('WebGL2 없음 (또는 그래픽카드 없이 소프트웨어로만 돌아감)');
      STC = !!(gl.getContextAttributes() || {}).stencil;
      if (!FORCE) { let rn = ''; try { const d = gl.getExtension('WEBGL_debug_renderer_info'); rn = d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : ''; } catch (e) {} if (/SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rn)) throw new Error('소프트웨어 GL (' + rn + ')'); }
      MAXT = Math.min(8192, gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096); NS = Math.max(1, Math.min(+LSG('aden_gl_ns') || 15, 15, (gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) || 8) - 1));   // 한 배치 텍스처 수 (시험: localStorage aden_gl_ns)
      const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error('셰이더: ' + gl.getShaderInfoLog(o)); return o; };
      const vsh = sh(gl.VERTEX_SHADER, VS);
      PR = [FS0(NS), FS(NS)].map((src, i) => { const p = gl.createProgram(); gl.attachShader(p, vsh); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, src)); gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('링크: ' + gl.getProgramInfoLog(p)); gl.useProgram(p);
        gl.uniform1iv(gl.getUniformLocation(p, 'uT'), Int32Array.from({ length: NS }, (_, k) => k)); if (i) gl.uniform1i(gl.getUniformLocation(p, 'uG'), NS);
        return { p, uR: gl.getUniformLocation(p, 'uR'), uN: gl.getUniformLocation(p, 'uN'), uM: gl.getUniformLocation(p, 'uM'), uO: gl.getUniformLocation(p, 'uO'), f: undefined }; });
      vao = gl.createVertexArray(); gl.bindVertexArray(vao); vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, VB.byteLength, gl.DYNAMIC_DRAW);
      const S = FL * 4, at = (i, n, ty, nm, off) => { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, n, ty, nm, S, off); };
      at(0, 2, gl.FLOAT, false, 0); at(1, 2, gl.FLOAT, false, 8); at(2, 2, gl.FLOAT, false, 16); at(3, 4, gl.UNSIGNED_BYTE, true, 24); at(4, 1, gl.FLOAT, false, 28); at(5, 1, gl.FLOAT, false, 32); at(6, 4, gl.FLOAT, false, 36);
      const IX = new Uint16Array(MAXQ * 6); for (let q = 0; q < MAXQ; q++) { const v = q * 4, i = q * 6; IX[i] = v; IX[i + 1] = v + 1; IX[i + 2] = v + 2; IX[i + 3] = v; IX[i + 4] = v + 2; IX[i + 5] = v + 3; }
      ibo = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, IX, gl.STATIC_DRAW);
      const mk = (mi, ma, wr) => { const s = gl.createSampler(); gl.samplerParameteri(s, gl.TEXTURE_MIN_FILTER, mi); gl.samplerParameteri(s, gl.TEXTURE_MAG_FILTER, ma); gl.samplerParameteri(s, gl.TEXTURE_WRAP_S, wr); gl.samplerParameteri(s, gl.TEXTURE_WRAP_T, wr); return s; };
      const CE = gl.CLAMP_TO_EDGE, RP = gl.REPEAT;   // 0 가깝게 · 1 부드럽게 · 2 부드럽게+밉맵 · 3 가깝게 반복 · 4 부드럽게 반복
      SMP = [mk(gl.NEAREST, gl.NEAREST, CE), mk(gl.LINEAR, gl.LINEAR, CE), mk(gl.LINEAR_MIPMAP_LINEAR, gl.LINEAR, CE), mk(gl.NEAREST, gl.NEAREST, RP), mk(gl.LINEAR, gl.LINEAR, RP)];
      white = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, white); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
      RAMP.tex = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + NS); gl.bindTexture(gl.TEXTURE_2D, RAMP.tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, RAMP.H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); gl.bindSampler(NS, SMP[1]); gl.activeTexture(gl.TEXTURE0);
      RAMP.c = document.createElement('canvas'); RAMP.c.width = 256; RAMP.c.height = 1; RAMP.g = RAMP.c.getContext('2d', { willReadFrequently: true });
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE); gl.enable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
      cvs.addEventListener('webglcontextlost', ev => { LOST = true; why = '컨텍스트 잃음'; hide(); try { console.warn('[GL] WebGL 컨텍스트를 잃어서 원래 그래픽으로 돌아갑니다'); } catch (e) {} });
      document.body.insertBefore(cvs, document.body.firstChild); patch(); return true;
    } catch (e) { FAILED = true; why = String(e && e.message || e); gl = null; try { console.warn('[GL] 새 그래픽을 켤 수 없어 원래 그래픽으로:', why); } catch (x) {} if (cvs && cvs.parentNode) cvs.remove(); return false; } }
  function hide() { if (cvs) cvs.style.display = 'none'; }

  // ---------------------------------------------------------------- 텍스처 (그림·캔버스 하나에 하나 · 크면 조각)
  const TX = new Map();
  let bid = 1;   // 지금 모으는 배치 번호 (다시 올려야 하는 텍스처가 지금 배치에 들어 있으면 먼저 그림)
  function srcSize(s) { if (s instanceof HTMLImageElement) return s.complete ? [s.naturalWidth, s.naturalHeight, 0] : [0, 0, 0];
    if (s instanceof HTMLCanvasElement || (window.OffscreenCanvas && s instanceof OffscreenCanvas)) return [s.width, s.height, 1];
    if (window.ImageBitmap && s instanceof ImageBitmap) return [s.width, s.height, 0]; return null; }
  function texOf(s, w, h, isC) { let e = TX.get(s); const v = isC ? (s.__glv | 0) : 0;
    if (e && e.w === w && e.h === h && e.v === v) { e.f = frameNo; return e; }
    if (e && e.b === bid) flush();
    if (!e) { e = { w: 0, h: 0, v: -1, t: null, ups: 0, mip: false, f: frameNo, b: 0, by: 0 }; TX.set(s, e); }
    upload(e, s, w, h, v, isC); e.f = frameNo; return e; }
  function upload(e, s, w, h, v, isC) { const t0 = performance.now(); try { upload_(e, s, w, h, v, isC); } finally { ST.tUp += performance.now() - t0; } }
  function upload_(e, s, w, h, v, isC) { const same = e.t && e.w === w && e.h === h; e.ups++; const mip = !isC || e.ups <= 2;   // 자주 바뀌는 캔버스는 밉맵 안 만듦
    if (!same) { if (e.t) for (const q of e.t) gl.deleteTexture(q.tex); e.t = []; tAll -= e.by; e.by = 0;
      for (let y = 0; y < h; y += MAXT) for (let x = 0; x < w; x += MAXT) { const tw = Math.min(MAXT, w - x), th = Math.min(MAXT, h - y); e.t.push({ x, y, w: tw, h: th, tex: gl.createTexture() }); } }
    for (const q of e.t) { gl.bindTexture(gl.TEXTURE_2D, q.tex); gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, q.x); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, q.y);
      if (same) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, q.w, q.h, gl.RGBA, gl.UNSIGNED_BYTE, s); else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, q.w, q.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, s);
      if (mip) gl.generateMipmap(gl.TEXTURE_2D); }
    gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
    if (!same) { e.by = w * h * 4 * (mip ? 1.34 : 1); tAll += e.by; } e.mip = mip; e.w = w; e.h = h; e.v = v; ST.up++; ST.upPx += w * h;
    if (DBG.on) (ST.ul || (ST.ul = [])).push([String(new Error().stack).split('\n').slice(4, 8).map(s => (/at (\S+)/.exec(s) || [])[1]).join('<'), w, h, e.ups]); }
  function sweep() { const lim = (window.matchMedia && matchMedia('(pointer:coarse)').matches ? 256 : 768) * 1048576, old = frameNo - 600;   // 10초 넘게 안 쓴 것 · 메모리 넘치면 더 빨리
    for (const [s, e] of TX) if (e.f < old || (tAll > lim && e.f < frameNo - 60)) { for (const q of e.t || []) gl.deleteTexture(q.tex); tAll -= e.by; TX.delete(s); } }
  // 그라데이션 색 띠 (256칸 한 줄 · 같은 색 목록은 한 번만)
  function rampRow(r) { if (!r.key) r.key = r.st.join('|'); let row = RAMP.m.get(r.key); if (row !== undefined) return row;
    if (RAMP.n >= RAMP.H) { shFlush(); flush(); RAMP.m.clear(); RAMP.n = 0; } row = RAMP.n++; const g = RAMP.g; g.clearRect(0, 0, 256, 1);
    const gr = g.createLinearGradient(0.5, 0, 255.5, 0); for (let i = 0; i < r.st.length; i += 2) gr.addColorStop(r.st[i], r.st[i + 1]); g.fillStyle = gr; g.fillRect(0, 0, 256, 1);
    gl.activeTexture(gl.TEXTURE0 + NS); gl.bindTexture(gl.TEXTURE_2D, RAMP.tex); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, row, 256, 1, gl.RGBA, gl.UNSIGNED_BYTE, g.getImageData(0, 0, 256, 1).data); gl.activeTexture(gl.TEXTURE0);
    RAMP.m.set(r.key, row); return row; }


  // ---------------------------------------------------------------- 1단계: 빛 번짐(블룸) — '더하기(lighter)'로 그린 것(불·마법·빛 효과)만 반 해상도 빛 버퍼에도 한 번 더 그려 흐리게 번진 빛을 화면에 더함
  //   게임 코드는 그대로 (지금 효과들이 lighter로 그리는 곳이 곧 빛나는 곳) · 끄기: localStorage aden_gl_bloom=0 · 세기 aden_gl_bloom=0.3~1.5
  const BLM = { on: LSG('aden_gl_bloom') !== '0', k: Math.max(0, Math.min(2, parseFloat(LSG('aden_gl_bloom')) || 0.6)), fb: null, tA: null, tB: null, w: 0, h: 0, used: false, pr: null, vao: null, uS: null, uD: null, uK: null };
  function bloomInit() { if (BLM.pr) return true; try { const G = gl, sh = (t, s) => { const o = G.createShader(t); G.shaderSource(o, s); G.compileShader(o); if (!G.getShaderParameter(o, G.COMPILE_STATUS)) throw new Error(G.getShaderInfoLog(o)); return o; };
      const p = G.createProgram(); G.attachShader(p, sh(G.VERTEX_SHADER, `#version 300 es
out vec2 v; void main(){ vec2 p=vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2)); v=p; gl_Position=vec4(p*2.-1.,0.,1.); }`));
      G.attachShader(p, sh(G.FRAGMENT_SHADER, `#version 300 es
precision mediump float; uniform sampler2D uS; uniform vec2 uD; uniform float uK; in vec2 v; out vec4 o;
void main(){ vec4 c=texture(uS,v)*.227027; c+=(texture(uS,v+uD*1.3846)+texture(uS,v-uD*1.3846))*.316216; c+=(texture(uS,v+uD*3.2308)+texture(uS,v-uD*3.2308))*.070270; o=c*uK; }`));
      G.linkProgram(p); if (!G.getProgramParameter(p, G.LINK_STATUS)) throw new Error(G.getProgramInfoLog(p));
      BLM.pr = p; BLM.uS = G.getUniformLocation(p, 'uS'); BLM.uD = G.getUniformLocation(p, 'uD'); BLM.uK = G.getUniformLocation(p, 'uK'); BLM.vao = G.createVertexArray(); BLM.fb = G.createFramebuffer(); return true;
    } catch (e) { BLM.on = false; note('bloom:' + String(e && e.message || e).slice(0, 60)); return false; } }
  function bloomSize(pw, ph) { const w = Math.max(1, Math.ceil(pw / 2)), h = Math.max(1, Math.ceil(ph / 2)); if (w === BLM.w && h === BLM.h) return; const G = gl;
    for (const k of ['tA', 'tB']) { if (BLM[k]) G.deleteTexture(BLM[k]); const t = G.createTexture(); G.bindTexture(G.TEXTURE_2D, t); G.texImage2D(G.TEXTURE_2D, 0, G.RGBA, w, h, 0, G.RGBA, G.UNSIGNED_BYTE, null);
      G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MIN_FILTER, G.LINEAR); G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MAG_FILTER, G.LINEAR); G.texParameteri(G.TEXTURE_2D, G.TEXTURE_WRAP_S, G.CLAMP_TO_EDGE); G.texParameteri(G.TEXTURE_2D, G.TEXTURE_WRAP_T, G.CLAMP_TO_EDGE); BLM[k] = t; }
    BLM.w = w; BLM.h = h; }
  // 배치 하나를 빛 버퍼에도 (flush 안에서 · 버퍼·텍스처·셰이더는 이미 묶여 있음)
  function bloomBatch(n) { const G = gl; G.bindFramebuffer(G.FRAMEBUFFER, BLM.fb); G.framebufferTexture2D(G.FRAMEBUFFER, G.COLOR_ATTACHMENT0, G.TEXTURE_2D, BLM.tA, 0); G.viewport(0, 0, BLM.w, BLM.h);
    if (!BLM.used) { BLM.used = true; G.clearColor(0, 0, 0, 0); G.clear(G.COLOR_BUFFER_BIT); }
    G.drawElements(G.TRIANGLES, n * 6, G.UNSIGNED_SHORT, 0); G.bindFramebuffer(G.FRAMEBUFFER, null); G.viewport(0, 0, PW, PH); ST.bloomQ += n; }
  // 프레임 끝: 빛 버퍼 흐리기(가로·세로 두 번씩) → 화면에 더함
  function bloomEnd() { if (!BLM.used) return; BLM.used = false; const G = gl, t0 = performance.now();
    G.useProgram(BLM.pr); curProg = null; G.bindVertexArray(BLM.vao); G.activeTexture(G.TEXTURE0); G.bindSampler(0, null); G.uniform1i(BLM.uS, 0); G.blendFunc(G.ONE, G.ZERO); curBl = -1;
    G.bindFramebuffer(G.FRAMEBUFFER, BLM.fb); G.viewport(0, 0, BLM.w, BLM.h);
    const pass = (src, dst, dx, dy, k) => { G.framebufferTexture2D(G.FRAMEBUFFER, G.COLOR_ATTACHMENT0, G.TEXTURE_2D, dst, 0); G.bindTexture(G.TEXTURE_2D, src); G.uniform2f(BLM.uD, dx / BLM.w, dy / BLM.h); G.uniform1f(BLM.uK, k); G.drawArrays(G.TRIANGLES, 0, 3); };
    pass(BLM.tA, BLM.tB, 1, 0, 1); pass(BLM.tB, BLM.tA, 0, 1, 1); pass(BLM.tA, BLM.tB, 2.5, 0, 1);
    G.bindFramebuffer(G.FRAMEBUFFER, null); G.viewport(0, 0, PW, PH); G.blendFunc(G.ONE, G.ONE); G.bindTexture(G.TEXTURE_2D, BLM.tB); G.uniform2f(BLM.uD, 0, 2.5 / BLM.h); G.uniform1f(BLM.uK, BLM.k);
    if (!DBG.nodraw) G.drawArrays(G.TRIANGLES, 0, 3); G.bindVertexArray(vao); ST.tBloom = performance.now() - t0; ST.bloom = 1; }


  // ---------------------------------------------------------------- 1단계: 그림자 흐림(shadowBlur)을 GL로
  //   그림자가 켜진 그리기는 바로 그리지 않고 모아 둠(SHG) → 같은 그림자 설정이 끝나면: 모양의 알파만 그림자 색으로 그림자 버퍼에(오프셋만큼 밀어서) → 가우스 흐림(가로·세로, 그 영역만) → 화면에 합성 → 모은 모양을 그 위에
  //   (2D와 다른 점: 같은 설정으로 연달아 그린 것끼리는 그림자가 모두 먼저 깔림 — 글자 빛 등에서 거의 차이 없음)
  const SHG = { cap: false, key: '', list: [], col: null, ox: 0, oy: 0, sg: 0, bl: 0, fb: null, tA: null, tB: null, w: 0, h: 0, pr: null, uS: null, uD: null, uN: null, uQ: null, vao: null, ok: true };
  function shBegin() { const V_ = V, c = parseColor(V_.shadowColor), key = V_.shadowColor + '|' + V_.shadowBlur + '|' + V_.shadowOffsetX + '|' + V_.shadowOffsetY + '|' + C.st.bl;
    if (SHG.list.length && key !== SHG.key) shFlush(); if (RUN.open) runFlush();
    if (!c || !SHG.ok) return false; SHG.key = key; SHG.col = c; SHG.ox = V_.shadowOffsetX; SHG.oy = V_.shadowOffsetY; SHG.sg = Math.max(0, V_.shadowBlur) / 2; SHG.bl = C.st.bl; SHG.cap = true; return true; }
  function shInit() { if (SHG.pr) return true; try { const G = gl, sh = (t, s) => { const o = G.createShader(t); G.shaderSource(o, s); G.compileShader(o); if (!G.getShaderParameter(o, G.COMPILE_STATUS)) throw new Error(G.getShaderInfoLog(o)); return o; };
      const p = G.createProgram(); G.attachShader(p, sh(G.VERTEX_SHADER, `#version 300 es
out vec2 v; void main(){ vec2 p=vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2)); v=p; gl_Position=vec4(p*2.-1.,0.,1.); }`));
      G.attachShader(p, sh(G.FRAGMENT_SHADER, `#version 300 es
precision highp float; uniform sampler2D uS; uniform vec2 uD; uniform int uN; uniform float uQ; in vec2 v; out vec4 o;
void main(){ vec4 c=vec4(0.); float ws=0.; for(int i=-64;i<=64;i++){ if(i<-uN||i>uN) continue; float x=float(i), w=exp(-x*x*uQ); c+=texture(uS,v+uD*x)*w; ws+=w; } o=c/ws; }`));
      G.linkProgram(p); if (!G.getProgramParameter(p, G.LINK_STATUS)) throw new Error(G.getProgramInfoLog(p));
      SHG.pr = p; for (const k of ['uS', 'uD', 'uN', 'uQ']) SHG[k] = G.getUniformLocation(p, k); SHG.vao = G.createVertexArray(); SHG.fb = G.createFramebuffer(); return true;
    } catch (e) { SHG.ok = false; note('shadow:' + String(e && e.message || e).slice(0, 60)); return false; } }
  function shSize() { if (SHG.w === PW && SHG.h === PH) return; const G = gl;
    for (const k of ['tA', 'tB']) { if (SHG[k]) G.deleteTexture(SHG[k]); const t = G.createTexture(); G.bindTexture(G.TEXTURE_2D, t); G.texImage2D(G.TEXTURE_2D, 0, G.RGBA, PW, PH, 0, G.RGBA, G.UNSIGNED_BYTE, null);
      G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MIN_FILTER, G.LINEAR); G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MAG_FILTER, G.LINEAR); G.texParameteri(G.TEXTURE_2D, G.TEXTURE_WRAP_S, G.CLAMP_TO_EDGE); G.texParameteri(G.TEXTURE_2D, G.TEXTURE_WRAP_T, G.CLAMP_TO_EDGE); SHG[k] = t; }
    SHG.w = PW; SHG.h = PH; }
  // 모아 둔 그림자 묶음 그리기
  function shFlush() { const L = SHG.list; if (!L.length) return; SHG.list = []; const cap0 = SHG.cap; SHG.cap = false; flush();
    const G = gl, t0 = performance.now(), c = SHG.col, ox = SHG.ox, oy = SHG.oy, sg = SHG.sg, pad = Math.ceil(sg * 3) + 2;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const q of L) for (let i = 0; i < 8; i += 2) { x0 = Math.min(x0, q.X[i]); x1 = Math.max(x1, q.X[i]); y0 = Math.min(y0, q.X[i + 1]); y1 = Math.max(y1, q.X[i + 1]); }
    const sx0 = Math.max(0, Math.floor(x0 + ox - pad)), sy0 = Math.max(0, Math.floor(y0 + oy - pad)), sx1 = Math.min(PW, Math.ceil(x1 + ox + pad)), sy1 = Math.min(PH, Math.ceil(y1 + oy + pad));
    const sa = c[3]; if (sa > 0.002 && sx1 > sx0 && sy1 > sy0 && shInit()) { shSize();
      G.bindFramebuffer(G.FRAMEBUFFER, SHG.fb); G.framebufferTexture2D(G.FRAMEBUFFER, G.COLOR_ATTACHMENT0, G.TEXTURE_2D, SHG.tA, 0); G.viewport(0, 0, PW, PH);
      G.enable(G.SCISSOR_TEST); G.scissor(sx0, PH - sy1, sx1 - sx0, sy1 - sy0); G.clearColor(0, 0, 0, 0); G.clear(G.COLOR_BUFFER_BIT); STN = true;
      for (const q of L) { for (let i = 0; i < 8; i += 2) { QX[i] = q.X[i] + ox; QX[i + 1] = q.X[i + 1] + oy; QU[i] = q.U[i]; QU[i + 1] = q.U[i + 1]; QG[i] = q.G[i]; QG[i + 1] = q.G[i + 1]; }
        const A = q.a[8]; emitRaw(q.a[0], q.a[1], 0, q.a[3], q.a[4] | 16, c[0] * sa * A, c[1] * sa * A, c[2] * sa * A, sa * A, q.a[9], q.a[10], q.a[11], q.a[12]); }
      flush(); STN = false;
      G.useProgram(SHG.pr); curProg = null; G.bindVertexArray(SHG.vao); G.activeTexture(G.TEXTURE0); G.bindSampler(0, null); G.uniform1i(SHG.uS, 0); blendSet(8);
      if (sg > 0.3) { const st = Math.max(1, sg * 3 / 48), n = Math.ceil(sg * 3 / st), q = 1 / (2 * (sg / st) * (sg / st));
        G.uniform1i(SHG.uN, n); G.uniform1f(SHG.uQ, q);
        G.framebufferTexture2D(G.FRAMEBUFFER, G.COLOR_ATTACHMENT0, G.TEXTURE_2D, SHG.tB, 0); G.clear(G.COLOR_BUFFER_BIT); G.bindTexture(G.TEXTURE_2D, SHG.tA); G.uniform2f(SHG.uD, st / PW, 0); G.drawArrays(G.TRIANGLES, 0, 3);
        G.framebufferTexture2D(G.FRAMEBUFFER, G.COLOR_ATTACHMENT0, G.TEXTURE_2D, SHG.tA, 0); G.bindTexture(G.TEXTURE_2D, SHG.tB); G.uniform2f(SHG.uD, 0, st / PH); G.drawArrays(G.TRIANGLES, 0, 3); }
      G.bindFramebuffer(G.FRAMEBUFFER, null); G.viewport(0, 0, PW, PH); blendSet(SHG.bl); G.bindTexture(G.TEXTURE_2D, SHG.tA); G.uniform1i(SHG.uN, 0); G.uniform1f(SHG.uQ, 0); G.uniform2f(SHG.uD, 0, 0);
      if (!DBG.nodraw) G.drawArrays(G.TRIANGLES, 0, 3); G.disable(G.SCISSOR_TEST); G.bindVertexArray(vao); ST.shadow++; ST.tShadow += performance.now() - t0; }
    for (const q of L) { for (let i = 0; i < 8; i++) { QX[i] = q.X[i]; QU[i] = q.U[i]; QG[i] = q.G[i]; } emitRaw(...q.a); }
    SHG.cap = cap0; }

  // ---------------------------------------------------------------- 배치
  const BL = { 'source-over': 0, lighter: 1, multiply: 2, screen: 3, 'destination-out': 4, 'source-atop': 5, 'destination-over': 6, clear: 7, copy: 8 };
  let nQ = 0, slots = [], cBl = 0, cF = null, curBl = -1;
  function blendSet(b) { if (b === curBl) return; curBl = b; const G = gl;
    switch (b) { case 1: G.blendFunc(G.ONE, G.ONE); break; case 2: G.blendFunc(G.DST_COLOR, G.ONE_MINUS_SRC_ALPHA); break; case 3: G.blendFunc(G.ONE, G.ONE_MINUS_SRC_COLOR); break;
      case 4: G.blendFunc(G.ZERO, G.ONE_MINUS_SRC_ALPHA); break; case 5: G.blendFunc(G.DST_ALPHA, G.ONE_MINUS_SRC_ALPHA); break; case 6: G.blendFunc(G.ONE_MINUS_DST_ALPHA, G.ONE); break;
      case 7: G.blendFunc(G.ZERO, G.ZERO); break; case 8: G.blendFunc(G.ONE, G.ZERO); break; default: G.blendFunc(G.ONE, G.ONE_MINUS_SRC_ALPHA); } }
  function flush() { if (!nQ) return; const G = gl;
    G.bindBuffer(G.ARRAY_BUFFER, vbo); G.bufferSubData(G.ARRAY_BUFFER, 0, VF, 0, nQ * 4 * FL);
    for (let i = 0; i < slots.length; i++) { G.activeTexture(G.TEXTURE0 + i); G.bindTexture(G.TEXTURE_2D, slots[i].t); G.bindSampler(i, SMP[slots[i].s]); }
    blendSet(cBl); const pr = bCx ? PR[1] : PR[0]; if (pr !== curProg) { G.useProgram(pr.p); curProg = pr; }
    if (bCx && pr.f !== cF) { pr.f = cF; if (cF) { G.uniform1i(pr.uN, cF.n); G.uniformMatrix4fv(pr.uM, false, cF.M); G.uniform4fv(pr.uO, cF.O); } else G.uniform1i(pr.uN, 0); }
    if (!DBG.nodraw) { G.drawElements(G.TRIANGLES, nQ * 6, G.UNSIGNED_SHORT, 0); if (cBl === 1 && BLM.on && BLM.w && !STN) bloomBatch(nQ); } /* nodraw: 시험용 (GPU 일을 빼고 CPU 쪽 비용만 잼) */ ST.batches++; ST.quads += nQ; nQ = 0; slots = []; bid++; bCx = false; }
  // 사각형 하나: QX(기기 픽셀 네 꼭짓점) · QU(텍스처 좌표 또는 모양 안 좌표) · QG(그라데이션 좌표) — t: GL 텍스처, s: 표본, md: 모양|칠<<2, 색은 미리 곱한 RGBA(0~1)
  const QX = new Float64Array(8), QU = new Float64Array(8), QG = new Float64Array(8);
  const c8 = v => (v <= 0 ? 0 : v >= 1 ? 255 : Math.round(v * 255));
  function emit(t, s, bl, F, md, r, g_, b, a, p0, p1, p2, p3) {   // 그림자 모으는 중이면 모아 두고, 아니면 모아 둔 그림자부터 그린 뒤 그림
    if (SHG.cap) { SHG.list.push({ X: Float64Array.from(QX), U: Float64Array.from(QU), G: Float64Array.from(QG), a: [t, s, bl, F, md, r, g_, b, a, p0, p1, p2, p3] }); return; }
    if (SHG.list.length) shFlush(); emitRaw(t, s, bl, F, md, r, g_, b, a, p0, p1, p2, p3); }
  function emitRaw(t, s, bl, F, md, r, g_, b, a, p0, p1, p2, p3) {
    if (bl !== cBl || F !== cF || nQ >= MAXQ) { flush(); cBl = bl; cF = F; }
    let k = -1; for (let i = 0; i < slots.length; i++) if (slots[i].t === t && slots[i].s === s) { k = i; break; }
    if (k < 0) { if (slots.length >= NS) { flush(); cBl = bl; cF = F; } k = slots.length; slots.push({ t, s }); }
    const col = ((c8(a) << 24) | (c8(b) << 16) | (c8(g_) << 8) | c8(r)) >>> 0; if (md || F) bCx = true;
    let o = nQ * 4 * FL;
    for (let v = 0; v < 4; v++, o += FL) { const j = v * 2; VF[o] = QX[j]; VF[o + 1] = QX[j + 1]; VF[o + 2] = QU[j]; VF[o + 3] = QU[j + 1]; VF[o + 4] = QG[j]; VF[o + 5] = QG[j + 1];
      VU[o + 6] = col; VF[o + 7] = k; VF[o + 8] = md; VF[o + 9] = p0; VF[o + 10] = p1; VF[o + 11] = p2; VF[o + 12] = p3; }
    nQ++; }
  const uvRect = (u0, v0, u1, v1) => { QU[0] = u0; QU[1] = v0; QU[2] = u1; QU[3] = v0; QU[4] = u1; QU[5] = v1; QU[6] = u0; QU[7] = v1; };

  // ---------------------------------------------------------------- 글자 아틀라스 (2048² 한 장 · 가득 차면 비우고 다시)
  const TA = { tex: null, m: new Map(), x: 0, y: 0, rh: 0, S: 2048, c: null, g: null };
  function taReset() { shFlush(); flush(); TA.m.clear(); TA.x = 0; TA.y = 0; TA.rh = 0; }
  function taPut(w, h) { const S = TA.S; if (w > S || h > S) return null; if (TA.x + w > S) { TA.x = 0; TA.y += TA.rh + 1; TA.rh = 0; } if (TA.y + h > S) return null; const p = [TA.x, TA.y]; TA.x += w + 1; TA.rh = Math.max(TA.rh, h); return p; }

  // ---------------------------------------------------------------- 보조 2D 캔버스 (복잡한 경로 등) 묶음
  const RUN = { open: false, bl: 0, x0: 0, y0: 0, x1: 0, y1: 0, n: 0, who: '' }, DBG = { on: false, fin: false, nodraw: false };   // 개발용 (dev/tests/gl_*.js)
  let V = null, Vc = null;
  function runFlush() { if (!RUN.open) return; RUN.open = false;
    const x0 = Math.max(0, Math.floor(RUN.x0)), y0 = Math.max(0, Math.floor(RUN.y0)), x1 = Math.min(PW, Math.ceil(RUN.x1)), y1 = Math.min(PH, Math.ceil(RUN.y1)); if (x1 <= x0 || y1 <= y0) return;
    const w = x1 - x0, h = y1 - y0; flush();
    const t0 = performance.now(); gl.bindTexture(gl.TEXTURE_2D, layer); gl.texSubImage2D(gl.TEXTURE_2D, 0, x0, y0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, V.getImageData(x0, y0, w, h).data); ST.tRun += performance.now() - t0;   // 그 부분만 읽어서 올림 (캔버스 통째 복사 안 함)
    QX[0] = x0; QX[1] = y0; QX[2] = x1; QX[3] = y0; QX[4] = x1; QX[5] = y1; QX[6] = x0; QX[7] = y1; uvRect(x0 / layerW, y0 / layerH, x1 / layerW, y1 / layerH);
    { const c0 = SHG.cap; SHG.cap = false; emit(layer, 0, RUN.bl, null, 0, 1, 1, 1, 1, 0, 0, 0, 0); SHG.cap = c0; } flush();
    if (DBG.on) (ST.rl || (ST.rl = [])).push([RUN.who, RUN.n, w, h, RUN.bl]);
    if (C.st.clip) { C.reset = true; } else { V.save(); V.setTransform(1, 0, 0, 1, 0, 0); V.clearRect(x0, y0, w, h); V.restore(); } C.vd = true; ST.runs++; ST.runPx += w * h; }

  // ---------------------------------------------------------------- 가짜 2D 컨텍스트
  // 상태: m 변환(기기 픽셀) · a 투명도 · op 합성 · F 색 필터(null 없음 · false 못 씀) · sm 부드럽게 · q 품질 · clip 클립 수 · sh 그림자 · dash 점선
  const NEWST = () => ({ m: [1, 0, 0, 1, 0, 0], a: 1, op: 'source-over', bl: 0, F: null, sm: true, q: 'low', clip: 0, sh: false, dash: false });
  // 경로 모양 (GL로 바로 그릴 수 있는 것만 따로 기억): k 0 비었음 · 1 타원 하나 · 2 사각형 하나 · 3 선 한 줄 · -1 복잡함
  const PK = { k: 0, mv: false, mx: 0, my: 0, cx: 0, cy: 0, ax: 0, ay: 0, bx: 0, by: 0, q: new Float64Array(8) };
  const C = { st: NEWST(), stack: [], vd: true, px0: 1e9, py0: 1e9, px1: -1e9, py1: -1e9, reset: false };

  // 일반 경로 (11/1 · 1단계): 점 목록(기기 픽셀)으로 따로 기록 → 채우기 = 귀 자르기 삼각형 · 테두리 = 선 조각마다 사각형 (못 하는 모양이면 bad → 2D)
  const PP = { s: [], cur: null, bad: false, n: 0 };
  const ppRe = () => { PP.s.length = 0; PP.cur = null; PP.bad = false; PP.n = 0; };
  const ppM = (X, Y) => { PP.cur = { p: [X, Y], c: false }; PP.s.push(PP.cur); PP.n++; };
  const ppL = (X, Y) => { if (!PP.cur) { ppM(X, Y); return; } const p = PP.cur.p, k = p.length; if (Math.abs(p[k - 2] - X) < 1e-3 && Math.abs(p[k - 1] - Y) < 1e-3) return; p.push(X, Y); if (++PP.n > 4000) PP.bad = true; };
  const ppLast = () => { const p = PP.cur && PP.cur.p; return p ? [p[p.length - 2], p[p.length - 1]] : null; };
  const dvX = (x, y) => { const m = C.st.m; return m[0] * x + m[2] * y + m[4]; }, dvY = (x, y) => { const m = C.st.m; return m[1] * x + m[3] * y + m[5]; };
  // 호(타원 일부): 기기 좌표 중심 X,Y · 축 (ax,ay),(bx,by) · 2D와 같은 각도 규칙
  function ppArc(X, Y, ax, ay, bx, by, a0, a1, ccw) { const T = Math.PI * 2; let sw = a1 - a0;
    if (!ccw) { if (sw >= T) sw = T; else { sw %= T; if (sw < 0) sw += T; } } else { if (-sw >= T) sw = -T; else { sw %= T; if (sw > 0) sw -= T; } }
    const R = Math.max(Math.hypot(ax, ay), Math.hypot(bx, by)), st = R > 0.3 ? 2 * Math.acos(Math.max(-1, 1 - 0.2 / R)) : Math.PI / 2, n = Math.max(1, Math.min(160, Math.ceil(Math.abs(sw) / st)));
    for (let i = 0; i <= n; i++) { const a = a0 + sw * i / n, c = Math.cos(a), s = Math.sin(a); ppL(X + ax * c + bx * s, Y + ay * c + by * s); } }
  // 귀 자르기 (단순 다각형 · 점 n개) → 삼각형 꼭짓점 번호 / 실패 null
  function ears(p) { const n = p.length >> 1; if (n < 3) return []; let A = 0; for (let i = 0, j = n - 1; i < n; j = i++) A += p[j * 2] * p[i * 2 + 1] - p[i * 2] * p[j * 2 + 1]; if (Math.abs(A) < 1e-6) return [];
    const s = A > 0 ? 1 : -1, V_ = []; for (let i = 0; i < n; i++) V_.push(i); const out = []; let g = 0;
    const cr = (a, b, c) => ((p[b * 2] - p[a * 2]) * (p[c * 2 + 1] - p[a * 2 + 1]) - (p[b * 2 + 1] - p[a * 2 + 1]) * (p[c * 2] - p[a * 2])) * s;
    while (V_.length > 3) { if (++g > n * n + 10) return null; let cut = false;
      for (let i = 0; i < V_.length; i++) { const a = V_[(i + V_.length - 1) % V_.length], b = V_[i], c = V_[(i + 1) % V_.length]; const k = cr(a, b, c); if (k < 1e-9) { if (Math.abs(k) < 1e-9) { V_.splice(i, 1); cut = true; break; } continue; }
        let ok = true; for (const q of V_) { if (q === a || q === b || q === c) continue; if (cr(a, b, q) >= 0 && cr(b, c, q) >= 0 && cr(c, a, q) >= 0) { ok = false; break; } }
        if (ok) { out.push(a, b, c); V_.splice(i, 1); cut = true; break; } }
      if (!cut) return null; }
    if (V_.length === 3 && Math.abs(cr(V_[0], V_[1], V_[2])) > 1e-12) out.push(V_[0], V_[1], V_[2]); return out; }
  // 선분끼리 교차 (꼬인 다각형이면 2D로)
  function selfX(p) { const n = p.length >> 1; if (n > 120) return true; for (let i = 0; i < n; i++) { const a = i, b = (i + 1) % n; for (let j = i + 2; j < n; j++) { const c = j, d = (j + 1) % n; if (d === a) continue;
    const d1 = (p[b * 2] - p[a * 2]) * (p[c * 2 + 1] - p[a * 2 + 1]) - (p[b * 2 + 1] - p[a * 2 + 1]) * (p[c * 2] - p[a * 2]), d2 = (p[b * 2] - p[a * 2]) * (p[d * 2 + 1] - p[a * 2 + 1]) - (p[b * 2 + 1] - p[a * 2 + 1]) * (p[d * 2] - p[a * 2]);
    const d3 = (p[d * 2] - p[c * 2]) * (p[a * 2 + 1] - p[c * 2 + 1]) - (p[d * 2 + 1] - p[c * 2 + 1]) * (p[a * 2] - p[c * 2]), d4 = (p[d * 2] - p[c * 2]) * (p[b * 2 + 1] - p[c * 2 + 1]) - (p[d * 2 + 1] - p[c * 2 + 1]) * (p[b * 2] - p[c * 2]);
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true; } } return false; }
  const bbOf = p => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i < p.length; i += 2) { const x = p[i], y = p[i + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return [x0, y0, x1, y1]; };
  // 채우기: 성공(그렸거나 그릴 것 없음) true / 2D로 가야 하면 false
  function ppFill(P, eo) { if (PP.bad) { note('pf:bad'); return false; } const L = PP.s.filter(s => s.p.length >= 6); if (!L.length) return true;
    const B = L.map(s => bbOf(s.p)); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const b of B) { x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]); }
    if (x1 < 0 || y1 < 0 || x0 > PW || y0 > PH) return true;
    let simple = L.length <= 24; const T = [];
    if (simple) for (let i = 0; i < B.length && simple; i++) for (let j = i + 1; j < B.length; j++) if (B[i][0] < B[j][2] && B[j][0] < B[i][2] && B[i][1] < B[j][3] && B[j][1] < B[i][3]) { simple = false; break; }   // 겹치는 하위 경로(구멍 등)
    if (simple) for (const s of L) { if (selfX(s.p)) { simple = false; break; } const t = ears(s.p); if (!t) { simple = false; break; } T.push(t); }   // 꼬인 다각형
    if (gOpen(x0, y0, x1, y1)) { note('pf:run'); return false; }
    if (!simple) return stFill(P, L, eo, x0, y0, x1, y1);
    const st = C.st; uvRect(0, 0, 1, 1);
    for (let k = 0; k < L.length; k++) { const p = L[k].p, t = T[k]; for (let i = 0; i < t.length; i += 3) { const a = t[i] * 2, b = t[i + 1] * 2, c = t[i + 2] * 2;
      QX[0] = p[a]; QX[1] = p[a + 1]; QX[2] = p[b]; QX[3] = p[b + 1]; QX[4] = p[c]; QX[5] = p[c + 1]; QX[6] = p[c]; QX[7] = p[c + 1];
      if (P.pa && !gradCoords(P)) return true; emit(P.t, P.s, st.bl, null, P.pa << 2, P.r, P.g, P.b, P.a, P.p0, P.p1, P.p2, 0); } }
    ST.poly++; return true; }
  // 아무 모양 채우기 (꼬인 다각형·구멍·하위 경로 여럿): 스텐실에 부채꼴 삼각형으로 감은 수를 세고(0이 아닌 곳/짝홀) → 그 영역만 칠하고 스텐실 0으로 되돌림
  let STC = false, STN = false;
  function stFill(P, L, eo, x0, y0, x1, y1) { if (!STC) { note('pf:nostencil'); return false; } if (SHG.cap) { note('pf:stshadow'); return false; } const G = gl, st = C.st; flush(); STN = true;
    G.enable(G.STENCIL_TEST); G.colorMask(false, false, false, false); G.stencilMask(255); G.stencilFunc(G.ALWAYS, 0, 255);
    if (eo) G.stencilOp(G.KEEP, G.KEEP, G.INVERT); else { G.stencilOpSeparate(G.FRONT, G.KEEP, G.KEEP, G.INCR_WRAP); G.stencilOpSeparate(G.BACK, G.KEEP, G.KEEP, G.DECR_WRAP); }
    uvRect(0, 0, 1, 1);
    for (const s of L) { const p = s.p, n = p.length >> 1; for (let i = 1; i < n - 1; i++) { QX[0] = p[0]; QX[1] = p[1]; QX[2] = p[i * 2]; QX[3] = p[i * 2 + 1]; QX[4] = p[i * 2 + 2]; QX[5] = p[i * 2 + 3]; QX[6] = QX[4]; QX[7] = QX[5]; emit(white, 0, 0, null, 0, 1, 1, 1, 1, 0, 0, 0, 0); } }
    flush(); G.colorMask(true, true, true, true); G.stencilFunc(G.NOTEQUAL, 0, 255); G.stencilOp(G.ZERO, G.ZERO, G.ZERO);
    QX[0] = x0 - 1; QX[1] = y0 - 1; QX[2] = x1 + 1; QX[3] = y0 - 1; QX[4] = x1 + 1; QX[5] = y1 + 1; QX[6] = x0 - 1; QX[7] = y1 + 1; uvRect(0, 0, 1, 1);
    if (!(P.pa && !gradCoords(P))) emit(P.t, P.s, st.bl, null, P.pa << 2, P.r, P.g, P.b, P.a, P.p0, P.p1, P.p2, 0);
    flush(); G.disable(G.STENCIL_TEST); STN = false; ST.stn++; return true; }
  // 선 한 조각 (기기 좌표 · 양 끝 늘림 ca/cb) → 모양 3
  function segQ(x0, y0, x1, y1, hw, ca, cb, P, bl) { let dx = x1 - x0, dy = y1 - y0; const L = Math.hypot(dx, dy); if (L < 1e-6 && !(ca + cb)) return; const ux = L ? dx / L : 1, uy = L ? dy / L : 0;
    x0 -= ux * ca; y0 -= uy * ca; x1 += ux * cb; y1 += uy * cb; const h = (L + ca + cb) / 2, nx = -uy, ny = ux, ea = h + 1, eb = hw + 1, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    QX[0] = mx - ux * ea - nx * eb; QX[1] = my - uy * ea - ny * eb; QX[2] = mx + ux * ea - nx * eb; QX[3] = my + uy * ea - ny * eb; QX[4] = mx + ux * ea + nx * eb; QX[5] = my + uy * ea + ny * eb; QX[6] = mx - ux * ea + nx * eb; QX[7] = my - uy * ea + ny * eb;
    uvRect(-ea, -eb, ea, eb); if (P.pa && !gradCoords(P)) return; emit(P.t, P.s, bl, null, 3 | (P.pa << 2), P.r, P.g, P.b, P.a, P.p0, 0, h, hw); }
  function ppStroke(P, hw) { if (PP.bad) { note('ps:bad'); return false; } const L = PP.s.filter(s => s.p.length >= 4); if (!L.length) return true;
    const op = P.a >= 0.85 && C.st.bl === 0, cap = V.lineCap === 'butt' ? 0 : hw, jn = op ? hw : Math.min(hw, 1);   // 거의 불투명하면 이음매를 겹쳐 메움 · 반투명이면 겹침을 작게
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const s of L) { const b = bbOf(s.p); x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]); }
    const k = hw + 2; x0 -= k; y0 -= k; x1 += k; y1 += k;
    if (jn < 0) { for (const s of L) { const p = s.p, n = p.length >> 1; for (let i = 1; i < n - 1 + (s.c ? 1 : 0); i++) { const a = (i - 1) * 2, b = (i % n) * 2, c = ((i + 1) % n) * 2;   // 두꺼운 반투명 선이 많이 꺾이면 2D
      const u = Math.atan2(p[b + 1] - p[a + 1], p[b] - p[a]), v = Math.atan2(p[c + 1] - p[b + 1], p[c] - p[b]); let d = Math.abs(u - v); if (d > Math.PI) d = Math.PI * 2 - d; if (d > 0.35) { note('ps:join'); return false; } } } }
    if (x1 < 0 || y1 < 0 || x0 > PW || y0 > PH) return true; if (gOpen(x0, y0, x1, y1)) { note('ps:run'); return false; }
    const J = Math.max(jn, 0), bl = C.st.bl;
    for (const s of L) { const p = s.p, n = p.length >> 1; const m = s.c ? n : n - 1;
      for (let i = 0; i < m; i++) { const a = i * 2, b = ((i + 1) % n) * 2; segQ(p[a], p[a + 1], p[b], p[b + 1], hw, !s.c && i === 0 ? cap : J, !s.c && i === m - 1 ? cap : op ? J : 0, P, bl); } }
    ST.pline++; return true; }
  const vs = () => { if (C.vd) { const m = C.st.m; V.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]); C.vd = false; } };
  const pt = (x, y) => { const m = C.st.m, X = m[0] * x + m[2] * y + m[4], Y = m[1] * x + m[3] * y + m[5]; if (X < C.px0) C.px0 = X; if (X > C.px1) C.px1 = X; if (Y < C.py0) C.py0 = Y; if (Y > C.py1) C.py1 = Y; };
  const box = (x0, y0, x1, y1) => { pt(x0, y0); pt(x1, y0); pt(x1, y1); pt(x0, y1); };
  const shOn = () => { const c = V.shadowColor; return !(c === 'rgba(0, 0, 0, 0)' || /,\s*0\)$/.test(c)) && (V.shadowBlur > 0 || V.shadowOffsetX !== 0 || V.shadowOffsetY !== 0); };
  // 2D로 그리기: 묶음 열기(합성이 다르면 앞 묶음 먼저 올림) → V에 그대로 → 영역 넓힘
  function rOpen(x0, y0, x1, y1) { const st = C.st; let bl = BL[st.op]; if (bl === undefined || bl > 6) { bl = 0; ST.approx++; note('op:' + st.op); }
    if (RUN.open && RUN.bl !== bl && !st.clip) runFlush();
    if (!RUN.open) { RUN.open = true; RUN.bl = bl; RUN.x0 = 1e9; RUN.y0 = 1e9; RUN.x1 = -1e9; RUN.y1 = -1e9; RUN.n = 0; if (DBG.on) RUN.who = String(new Error().stack).split('\n').slice(3, 7).map(s => (/at (\S+)/.exec(s) || [])[1]).join('<'); }
    RUN.n++; if (DBG.on) { const w = String(new Error().stack).split('\n').slice(3, 5).map(s => (/at (\S+)/.exec(s) || [])[1]).join('<'); (ST.rw || (ST.rw = {}))[w] = (ST.rw[w] || 0) + 1; }
    if (st.sh) { const k = Math.abs(V.shadowBlur) * 2 + Math.max(Math.abs(V.shadowOffsetX), Math.abs(V.shadowOffsetY)) * Math.max(Math.abs(st.m[0]), Math.abs(st.m[3]), 1) + 2; x0 -= k; y0 -= k; x1 += k; y1 += k; }
    if (st.F === false) { x0 -= 40; y0 -= 40; x1 += 40; y1 += 40; }   // 흐림·그림자 필터는 둘레로 번짐
    if (x0 < RUN.x0) RUN.x0 = x0; if (y0 < RUN.y0) RUN.y0 = y0; if (x1 > RUN.x1) RUN.x1 = x1; if (y1 > RUN.y1) RUN.y1 = y1;
    vs(); const fix = bl >= 4 && bl <= 6; if (fix) V.globalCompositeOperation = 'source-over'; return fix; }   // 지우기·아래 깔기·위에만: V(투명)에는 보통으로 그리고 GL 합성에서 그 효과를 냄
  const rClose = fix => { if (fix) V.globalCompositeOperation = C.st.op; };
  // GL로 그리기 전: 열린 2D 묶음과 겹치면 그 묶음을 먼저 올림 (안 겹치면 GL을 먼저 그려도 결과가 같으니 묶음을 계속 이어 감)
  //   겹치는데 묶음이 작으면(코드로 그린 몹 하나 등) 그 그림도 2D 묶음에 넣어 버림 → true (부른 쪽이 2D로 그림) — 작은 묶음이 잘게 쪼개져 여러 번 올라가는 것을 막음
  const ABS = 512 * 512;
  function gOpen(x0, y0, x1, y1) { if (!RUN.open) return false; if (x1 <= RUN.x0 || x0 >= RUN.x1 || y1 <= RUN.y0 || y0 >= RUN.y1) { ST.defer++; return false; }
    if (RUN.bl === C.st.bl && (Math.max(x1, RUN.x1) - Math.min(x0, RUN.x0)) * (Math.max(y1, RUN.y1) - Math.min(y0, RUN.y0)) <= ABS) { ST.abs++; return true; }
    runFlush(); return false; }
  function gOpenNo(x0, y0, x1, y1) { if (RUN.open && !(x1 <= RUN.x0 || x0 >= RUN.x1 || y1 <= RUN.y0 || y0 >= RUN.y1)) runFlush(); }
  const gOpenQ = () => gOpen(Math.min(QX[0], QX[2], QX[4], QX[6]), Math.min(QX[1], QX[3], QX[5], QX[7]), Math.max(QX[0], QX[2], QX[4], QX[6]), Math.max(QX[1], QX[3], QX[5], QX[7]));
  const glOK = () => { const s = C.st; return !s.clip && (!s.sh || SHG.cap) && s.F !== false && s.bl >= 0; };   // 그림자는 모으는 중(SHG.cap)일 때만 GL
  function tx4(m, x, y, w, h, out) { const a = m[0], b = m[1], c = m[2], d = m[3], e = m[4], f = m[5];
    out[0] = a * x + c * y + e; out[1] = b * x + d * y + f; out[2] = a * (x + w) + c * y + e; out[3] = b * (x + w) + d * y + f;
    out[4] = a * (x + w) + c * (y + h) + e; out[5] = b * (x + w) + d * (y + h) + f; out[6] = a * x + c * (y + h) + e; out[7] = b * x + d * (y + h) + f; return out; }
  const Q8 = new Float64Array(8);
  const bb = q => [Math.min(q[0], q[2], q[4], q[6]), Math.min(q[1], q[3], q[5], q[7]), Math.max(q[0], q[2], q[4], q[6]), Math.max(q[1], q[3], q[5], q[7])];
  // 칠하기 준비: 단색·그라데이션·무늬 → {pa(칠 종류), t, s, r,g,b,a(미리 곱함), p0..p2} · 못 하면 null
  const PNT = { pa: 0, t: null, s: 0, r: 0, g: 0, b: 0, a: 0, p0: 0, p1: 0, p2: 0, gr: null, pat: null };
  function paint(sty, allowPat) { const A = C.st.a; PNT.gr = null; PNT.pat = null;
    if (typeof sty === 'string') { const c = parseColor(sty); if (!c) return null; const k = c[3] * A; PNT.pa = 0; PNT.t = white; PNT.s = 0; PNT.r = c[0] * k; PNT.g = c[1] * k; PNT.b = c[2] * k; PNT.a = k; PNT.p0 = PNT.p1 = PNT.p2 = 0; return PNT; }
    const gr = sty && GREC.get(sty);
    if (gr) { const a = gr.a; PNT.t = white; PNT.s = 0; PNT.r = PNT.g = PNT.b = PNT.a = A; PNT.gr = gr;
      if (gr.type === 'L') { const dx = a[2] - a[0], dy = a[3] - a[1]; if (!(dx * dx + dy * dy > 1e-12)) return 'skip'; PNT.pa = 1; }
      else { if (Math.abs(a[0] - a[3]) > 1e-6 || Math.abs(a[1] - a[4]) > 1e-6 || !(a[5] > a[2]) || a[2] < 0) return null; PNT.pa = 2; PNT.p1 = a[2]; PNT.p2 = a[5]; }
      PNT.p0 = (rampRow(gr) + 0.5) / RAMP.H; return PNT; }
    const pt_ = allowPat && sty && PREC.get(sty);
    if (pt_ && !pt_.xf && (pt_.rep === 'repeat' || pt_.rep === '')) { const z = srcSize(pt_.img); if (!z || !z[0] || !z[1] || z[0] > MAXT || z[1] > MAXT) return null; PNT.pa = 0; PNT.pat = pt_; PNT.r = PNT.g = PNT.b = PNT.a = A; PNT.p0 = PNT.p1 = PNT.p2 = 0; return PNT; }
    return null; }
  // 꼭짓점 QX(기기)의 그라데이션 좌표: 지금 변환을 거꾸로 돌려 사용자 좌표로 → 선형은 t, 원형은 중심에서 뺀 값
  function gradCoords(P) { const m = C.st.m, det = m[0] * m[3] - m[1] * m[2]; if (Math.abs(det) < 1e-12) return false; const ia = m[3] / det, ib = -m[1] / det, ic = -m[2] / det, id = m[0] / det, a = P.gr.a;
    for (let v = 0; v < 4; v++) { const X = QX[v * 2] - m[4], Y = QX[v * 2 + 1] - m[5], ux = ia * X + ic * Y, uy = ib * X + id * Y;
      if (P.pa === 1) { const dx = a[2] - a[0], dy = a[3] - a[1]; QG[v * 2] = ((ux - a[0]) * dx + (uy - a[1]) * dy) / (dx * dx + dy * dy); QG[v * 2 + 1] = 0; } else { QG[v * 2] = ux - a[0]; QG[v * 2 + 1] = uy - a[1]; } }
    return true; }
  // 사각형(QX 채워 둠) 칠하기 — 무늬는 사용자 좌표 / 그림 크기 (반복)
  function fillQuad(P) { const st = C.st; if (gOpenQ()) return false;
    if (P.pat) { const z = srcSize(P.pat.img), T = texOf(P.pat.img, z[0], z[1], z[2]), m = st.m, det = m[0] * m[3] - m[1] * m[2]; if (Math.abs(det) < 1e-12) return true; const ia = m[3] / det, ib = -m[1] / det, ic = -m[2] / det, id = m[0] / det;
      for (let v = 0; v < 4; v++) { const X = QX[v * 2] - m[4], Y = QX[v * 2 + 1] - m[5]; QU[v * 2] = (ia * X + ic * Y) / z[0]; QU[v * 2 + 1] = (ib * X + id * Y) / z[1]; }
      emit(T.t[0].tex, st.sm ? 4 : 3, st.bl, null, 0, P.r, P.g, P.b, P.a, 0, 0, 0, 0); T.b = bid; return true; }
    if (P.pa) { if (!gradCoords(P)) return true; ST.grad++; } uvRect(0, 0, 1, 1); emit(P.t, P.s, st.bl, null, P.pa << 2, P.r, P.g, P.b, P.a, P.p0, P.p1, P.p2, 0); return true; }

  class Ctx {
    get canvas() { return cvs; }
    // ---- 상태
    save() { const s = C.st; C.stack.push({ m: s.m.slice(), a: s.a, op: s.op, bl: s.bl, F: s.F, sm: s.sm, q: s.q, clip: s.clip, sh: s.sh, dash: s.dash }); V.save(); }
    restore() { if (!C.stack.length) return; C.st = C.stack.pop(); V.restore(); C.vd = true; }
    reset() { this.resetTransform(); }
    get globalAlpha() { return C.st.a; } set globalAlpha(v) { V.globalAlpha = v; C.st.a = V.globalAlpha; }
    get globalCompositeOperation() { return C.st.op; } set globalCompositeOperation(v) { V.globalCompositeOperation = v; const o = V.globalCompositeOperation; C.st.op = o; const b = BL[o]; C.st.bl = b === undefined ? -1 : b; }
    get filter() { return V.filter; } set filter(v) { V.filter = v; C.st.F = parseFilter(V.filter); }
    get imageSmoothingEnabled() { return C.st.sm; } set imageSmoothingEnabled(v) { V.imageSmoothingEnabled = !!v; C.st.sm = !!v; }
    get imageSmoothingQuality() { return C.st.q; } set imageSmoothingQuality(v) { V.imageSmoothingQuality = v; C.st.q = V.imageSmoothingQuality; }
    get shadowBlur() { return V.shadowBlur; } set shadowBlur(v) { V.shadowBlur = v; C.st.sh = shOn(); }
    get shadowColor() { return V.shadowColor; } set shadowColor(v) { V.shadowColor = v; C.st.sh = shOn(); }
    get shadowOffsetX() { return V.shadowOffsetX; } set shadowOffsetX(v) { V.shadowOffsetX = v; C.st.sh = shOn(); }
    get shadowOffsetY() { return V.shadowOffsetY; } set shadowOffsetY(v) { V.shadowOffsetY = v; C.st.sh = shOn(); }
    setLineDash(a) { V.setLineDash(a); C.st.dash = V.getLineDash().length > 0; } getLineDash() { return V.getLineDash(); }
    // ---- 변환 (JS에서 계산 · V에는 2D로 그릴 때만 맞춤)
    setTransform(a, b, c, d, e, f) { if (typeof a === 'object' && a) { const o = a; a = o.a ?? o.m11 ?? 1; b = o.b ?? o.m12 ?? 0; c = o.c ?? o.m21 ?? 0; d = o.d ?? o.m22 ?? 1; e = o.e ?? o.m41 ?? 0; f = o.f ?? o.m42 ?? 0; } else if (a === undefined) { a = 1; b = 0; c = 0; d = 1; e = 0; f = 0; }
      if (!(isFinite(a) && isFinite(b) && isFinite(c) && isFinite(d) && isFinite(e) && isFinite(f))) return; const m = C.st.m; m[0] = a; m[1] = b; m[2] = c; m[3] = d; m[4] = e; m[5] = f; C.vd = true; }
    resetTransform() { this.setTransform(1, 0, 0, 1, 0, 0); }
    getTransform() { const m = C.st.m; return new DOMMatrix([m[0], m[1], m[2], m[3], m[4], m[5]]); }
    translate(x, y) { if (!isFinite(x) || !isFinite(y)) return; const m = C.st.m; m[4] += m[0] * x + m[2] * y; m[5] += m[1] * x + m[3] * y; C.vd = true; }
    scale(x, y) { if (!isFinite(x) || !isFinite(y)) return; const m = C.st.m; m[0] *= x; m[1] *= x; m[2] *= y; m[3] *= y; C.vd = true; }
    rotate(r) { if (!isFinite(r)) return; const m = C.st.m, cs = Math.cos(r), sn = Math.sin(r), a = m[0], b = m[1], c = m[2], d = m[3]; m[0] = a * cs + c * sn; m[1] = b * cs + d * sn; m[2] = c * cs - a * sn; m[3] = d * cs - b * sn; C.vd = true; }
    transform(a, b, c, d, e, f) { if (!(isFinite(a) && isFinite(b) && isFinite(c) && isFinite(d) && isFinite(e) && isFinite(f))) return; const m = C.st.m, A = m[0], B = m[1], Cc = m[2], D = m[3]; m[4] += A * e + Cc * f; m[5] += B * e + D * f; m[0] = A * a + Cc * b; m[1] = B * a + D * b; m[2] = A * c + Cc * d; m[3] = B * c + D * d; C.vd = true; }
    // ---- 경로 (V에도 그대로 · 영역과 '단순한 모양'은 따로 셈)
    beginPath() { V.beginPath(); C.px0 = C.py0 = 1e9; C.px1 = C.py1 = -1e9; PK.k = 0; PK.mv = false; ppRe(); }
    closePath() { V.closePath(); const c = PP.cur; if (c) { c.c = true; ppM(c.p[0], c.p[1]); } }
    moveTo(x, y) { vs(); V.moveTo(x, y); pt(x, y); ppM(dvX(x, y), dvY(x, y)); if (PK.k === 0) { const m = C.st.m; PK.mv = true; PK.mx = m[0] * x + m[2] * y + m[4]; PK.my = m[1] * x + m[3] * y + m[5]; } else PK.k = -1; }
    lineTo(x, y) { vs(); V.lineTo(x, y); pt(x, y); const m = C.st.m, X = m[0] * x + m[2] * y + m[4], Y = m[1] * x + m[3] * y + m[5]; ppL(X, Y);
      if (PK.k === 0) { if (PK.mv) { PK.k = 3; PK.cx = PK.mx; PK.cy = PK.my; PK.ax = X; PK.ay = Y; } else { PK.mv = true; PK.mx = X; PK.my = Y; } } else PK.k = -1; }
    rect(x, y, w, h) { vs(); V.rect(x, y, w, h); box(x, y, x + w, y + h); ppM(dvX(x, y), dvY(x, y)); ppL(dvX(x + w, y), dvY(x + w, y)); ppL(dvX(x + w, y + h), dvY(x + w, y + h)); ppL(dvX(x, y + h), dvY(x, y + h)); PP.cur.c = true; ppM(dvX(x, y), dvY(x, y)); if (PK.k === 0) { PK.k = 2; tx4(C.st.m, x, y, w, h, PK.q); } else PK.k = -1; }
    roundRect(x, y, w, h, r) { vs(); V.roundRect(x, y, w, h, r); box(x, y, x + w, y + h); PK.k = -1; PP.bad = true; }
    arc(x, y, r, a0, a1, ccw) { vs(); V.arc(x, y, r, a0, a1, ccw); box(x - r, y - r, x + r, y + r); { const m = C.st.m; ppArc(dvX(x, y), dvY(x, y), m[0] * r, m[1] * r, m[2] * r, m[3] * r, a0, a1, ccw); } this._ell(x, y, r, r, 0, a0, a1); }
    ellipse(x, y, rx, ry, rot, a0, a1, ccw) { vs(); V.ellipse(x, y, rx, ry, rot, a0, a1, ccw); const R = Math.max(Math.abs(rx), Math.abs(ry)); box(x - R, y - R, x + R, y + R); { const m = C.st.m, cs = Math.cos(rot), sn = Math.sin(rot), ux = rx * cs, uy = rx * sn, vx = -ry * sn, vy = ry * cs; ppArc(dvX(x, y), dvY(x, y), m[0] * ux + m[2] * uy, m[1] * ux + m[3] * uy, m[0] * vx + m[2] * vy, m[1] * vx + m[3] * vy, a0, a1, ccw); } this._ell(x, y, rx, ry, rot, a0, a1); }
    _ell(x, y, rx, ry, rot, a0, a1) { if (PK.k !== 0 || !(Math.abs(a1 - a0) >= 6.28) || !(rx > 0) || !(ry > 0)) { PK.k = -1; return; }
      const m = C.st.m, cs = Math.cos(rot), sn = Math.sin(rot), X = m[0] * x + m[2] * y + m[4], Y = m[1] * x + m[3] * y + m[5];
      const ux = rx * cs, uy = rx * sn, vx = -ry * sn, vy = ry * cs, ax = m[0] * ux + m[2] * uy, ay = m[1] * ux + m[3] * uy, bx = m[0] * vx + m[2] * vy, by = m[1] * vx + m[3] * vy;
      if (PK.mv) { const s0 = Math.cos(a0), s1 = Math.sin(a0), sx = X + ax * s0 + bx * s1, sy = Y + ay * s0 + by * s1; if (Math.abs(sx - PK.mx) > 0.5 || Math.abs(sy - PK.my) > 0.5) { PK.k = -1; return; } }   // 앞의 moveTo 점에서 시작해야 (아니면 선이 하나 더 생김)
      PK.k = 1; PK.cx = X; PK.cy = Y; PK.ax = ax; PK.ay = ay; PK.bx = bx; PK.by = by; }
    arcTo(x1, y1, x2, y2, r) { vs(); V.arcTo(x1, y1, x2, y2, r); pt(x1, y1); pt(x2, y2); PK.k = -1; PP.bad = true; }
    quadraticCurveTo(cx, cy, x, y) { vs(); V.quadraticCurveTo(cx, cy, x, y); pt(cx, cy); pt(x, y); PK.k = -1; { const s = ppLast(), X1 = dvX(cx, cy), Y1 = dvY(cx, cy), X2 = dvX(x, y), Y2 = dvY(x, y); if (!s) { ppM(X1, Y1); ppL(X2, Y2); } else { const n = Math.max(2, Math.min(48, Math.ceil(Math.sqrt((Math.hypot(X1 - s[0], Y1 - s[1]) + Math.hypot(X2 - X1, Y2 - Y1)) * 2)))); for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; ppL(u * u * s[0] + 2 * u * t * X1 + t * t * X2, u * u * s[1] + 2 * u * t * Y1 + t * t * Y2); } } } }
    bezierCurveTo(a, b, c, d, x, y) { vs(); V.bezierCurveTo(a, b, c, d, x, y); pt(a, b); pt(c, d); pt(x, y); PK.k = -1; { const s = ppLast(), X1 = dvX(a, b), Y1 = dvY(a, b), X2 = dvX(c, d), Y2 = dvY(c, d), X3 = dvX(x, y), Y3 = dvY(x, y); if (!s) { ppM(X1, Y1); } const S = ppLast(), n = Math.max(2, Math.min(64, Math.ceil(Math.sqrt((Math.hypot(X1 - S[0], Y1 - S[1]) + Math.hypot(X2 - X1, Y2 - Y1) + Math.hypot(X3 - X2, Y3 - Y2)) * 2)))); for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; ppL(u * u * u * S[0] + 3 * u * u * t * X1 + 3 * u * t * t * X2 + t * t * t * X3, u * u * u * S[1] + 3 * u * u * t * Y1 + 3 * u * t * t * Y2 + t * t * t * Y3); } } }
    clip(a, b) { vs(); if (b !== undefined) V.clip(a, b); else if (a !== undefined) V.clip(a); else V.clip(); C.st.clip++; }
    fill(a, b) { const full = a && typeof a === 'object';
      if (!full && (PK.k === 1 || PK.k === 2) && glOK() && !C.st.F) { const P = paint(V.fillStyle, PK.k === 2); if (P === 'skip') return;
        if (P) { if (PK.k === 2) { for (let i = 0; i < 8; i++) QX[i] = PK.q[i]; if (fillQuad(P)) { ST.rect++; return; } }
          else if (!this._ellQuad(0)) return; else if (!gOpenQ()) { if (P.pa && !gradCoords(P)) return; ST.ell++; emit(P.t, P.s, C.st.bl, null, 1 | (P.pa << 2), P.r, P.g, P.b, P.a, P.p0, P.p1, P.p2, 0); return; } } }
      else if (!full && PK.k !== 1 && PK.k !== 2 && glOK() && !C.st.F && !DBG.nopath) { const P = paint(V.fillStyle, false); if (P === 'skip') return; if (!P) note('pf:paint'); else if (ppFill(P, a === 'evenodd')) return; }
      ST.path++; if (DBG.on) note('f:' + (full ? 'full' : C.st.clip ? 'clip' : C.st.sh ? 'shadow' : C.st.F === false ? 'filt' : C.st.F ? 'cfilt' : C.st.bl < 0 ? 'op' : 'k' + PK.k)); const fx = full ? rOpen(0, 0, PW, PH) : rOpen(C.px0 - 1, C.py0 - 1, C.px1 + 1, C.py1 + 1);
      if (b !== undefined) V.fill(a, b); else if (a !== undefined) V.fill(a); else V.fill(); rClose(fx); }
    _ellQuad(hw) { const la = Math.hypot(PK.ax, PK.ay), lb = Math.hypot(PK.bx, PK.by), mn = Math.min(la, lb); if (!(mn > 1e-4)) return false; const e = Math.min(8, 1 + (hw + 1.5) / mn);
      const X = PK.cx, Y = PK.cy, ax = PK.ax * e, ay = PK.ay * e, bx = PK.bx * e, by = PK.by * e;
      QX[0] = X - ax - bx; QX[1] = Y - ay - by; QX[2] = X + ax - bx; QX[3] = Y + ay - by; QX[4] = X + ax + bx; QX[5] = Y + ay + by; QX[6] = X - ax + bx; QX[7] = Y - ay + by; uvRect(-e, -e, e, e); return true; }
    stroke(p) { const st = C.st, m = st.m, sc = Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
      if (!p && glOK() && !st.F && !st.dash) { const P = paint(V.strokeStyle, false); if (P === 'skip') return;
        if (P && P.pa !== 2) { const hw = V.lineWidth * sc / 2;
          if (PK.k === 1 && !P.pa) { if (!this._ellQuad(hw)) return; if (!gOpenQ()) { ST.ell++; emit(P.t, P.s, st.bl, null, 2, P.r, P.g, P.b, P.a, 0, 0, 0, hw); return; } }
          else if (PK.k === 3) { const cap = V.lineCap === 'butt' ? 0 : hw, k = hw + cap + 2; if (!gOpen(Math.min(PK.cx, PK.ax) - k, Math.min(PK.cy, PK.ay) - k, Math.max(PK.cx, PK.ax) + k, Math.max(PK.cy, PK.ay) + k)) { ST.seg++; segQ(PK.cx, PK.cy, PK.ax, PK.ay, hw, cap, cap, P, st.bl); return; } }
          else if (!DBG.nopath && ppStroke(P, hw)) return; }
        else note('ps:paint'); }
      ST.path++; if (DBG.on) note('s:' + (p ? 'full' : C.st.clip ? 'clip' : C.st.sh ? 'shadow' : C.st.F === false ? 'filt' : C.st.F ? 'cfilt' : C.st.dash ? 'dash' : C.st.bl < 0 ? 'op' : 'k' + PK.k)); const k = V.lineWidth * Math.max(Math.hypot(m[0], m[1]), Math.hypot(m[2], m[3])) * (V.lineJoin === 'miter' ? Math.max(1, V.miterLimit) : 1) + 2;
      const fx = p ? rOpen(0, 0, PW, PH) : rOpen(C.px0 - k, C.py0 - k, C.px1 + k, C.py1 + k); if (p) V.stroke(p); else V.stroke(); rClose(fx); }
    isPointInPath(...a) { vs(); return V.isPointInPath(...a); } isPointInStroke(...a) { vs(); return V.isPointInStroke(...a); }
    // ---- 사각형
    fillRect(x, y, w, h) { if (!w || !h) return; const st = C.st;
      if (glOK() && !st.F) { const P = paint(V.fillStyle, true); if (P === 'skip') return; if (P) { tx4(st.m, x, y, w, h, QX); if (fillQuad(P)) { ST.rect++; return; } } }
      ST.rectR++; const q = bb(tx4(st.m, x, y, w, h, Q8)), fx = rOpen(q[0], q[1], q[2], q[3]); V.fillRect(x, y, w, h); rClose(fx); }
    strokeRect(x, y, w, h) { ST.rectR++; const m = C.st.m, k = V.lineWidth * Math.max(Math.hypot(m[0], m[1]), Math.hypot(m[2], m[3])) + 2, q = bb(tx4(m, x, y, w, h, Q8)); const fx = rOpen(q[0] - k, q[1] - k, q[2] + k, q[3] + k); V.strokeRect(x, y, w, h); rClose(fx); }
    clearRect(x, y, w, h) { const st = C.st; if (st.clip) { const q = bb(tx4(st.m, x, y, w, h, Q8)), fx = rOpen(q[0], q[1], q[2], q[3]); V.clearRect(x, y, w, h); rClose(fx); return; }
      tx4(st.m, x, y, w, h, QX); gOpenNo(Math.min(QX[0], QX[2], QX[4], QX[6]), Math.min(QX[1], QX[3], QX[5], QX[7]), Math.max(QX[0], QX[2], QX[4], QX[6]), Math.max(QX[1], QX[3], QX[5], QX[7])); uvRect(0, 0, 1, 1); emit(white, 0, 7, null, 0, 0, 0, 0, 0, 0, 0, 0, 0); }
    // ---- 글자: 같은 모양은 아틀라스에 한 번만 그림
    fillText(t, x, y, mw) { this._t(0, t, x, y, mw); } strokeText(t, x, y, mw) { this._t(1, t, x, y, mw); }
    _t(sk, t, x, y, mw) { t = String(t); if (!t) return; const st = C.st, m = st.m, sty = sk ? V.strokeStyle : V.fillStyle;
      if (glOK() && m[1] === 0 && m[2] === 0 && m[0] > 0 && Math.abs(m[0] - m[3]) < 1e-6 && typeof sty === 'string' && mw === undefined) {
        const s = m[0], ix = Math.round(m[0] * x + m[4]), iy = Math.round(m[3] * y + m[5]), fx = 0, fy = 0;   // 글자는 기기 픽셀에 맞춰 찍음 (올라가는 피해 숫자가 프레임마다 새로 그려지지 않게 · 2D와 0.5px 안 차이)
        const key = (sk ? 'S' + V.lineWidth + V.lineJoin : 'F') + '|' + V.font + '|' + V.textAlign + V.textBaseline + '|' + sty + '|' + s.toFixed(3) + '|' + t;
        let e = TA.m.get(key);
        if (!e) { const M = V.measureText(t), pad = Math.ceil((sk ? V.lineWidth / 2 : 0) * s + 2), L = M.actualBoundingBoxLeft || 0, R = M.actualBoundingBoxRight || 0, A = M.actualBoundingBoxAscent || 0, D = M.actualBoundingBoxDescent || 0;
          const ox = Math.ceil(pad + L * s), oy = Math.ceil(pad + A * s), w = ox + Math.ceil(R * s + pad) + 1, h = oy + Math.ceil(D * s + pad) + 1;
          const fits = w > 0 && h > 0 && w <= 1024 && h <= 512; let p = fits ? taPut(w, h) : null; if (!p && fits) { taReset(); p = taPut(w, h); }
          if (p) { const g = TA.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w + 2, h + 2); g.setTransform(s, 0, 0, s, ox + fx, oy + fy); g.font = V.font; g.textAlign = V.textAlign; g.textBaseline = V.textBaseline;
            if (sk) { g.lineWidth = V.lineWidth; g.lineJoin = V.lineJoin; g.miterLimit = V.miterLimit; g.strokeStyle = sty; g.strokeText(t, 0, 0); } else { g.fillStyle = sty; g.fillText(t, 0, 0); }
            const t0 = performance.now(); gl.bindTexture(gl.TEXTURE_2D, TA.tex); gl.texSubImage2D(gl.TEXTURE_2D, 0, p[0], p[1], w, h, gl.RGBA, gl.UNSIGNED_BYTE, g.getImageData(0, 0, w, h).data); ST.txtNew++; ST.tTxt += performance.now() - t0;
            e = { x: p[0], y: p[1], w, h, ox, oy }; if (TA.m.size > 6000) taReset(); TA.m.set(key, e); } }
        if (e) { const X = ix - e.ox, Y = iy - e.oy, S = TA.S, A = st.a; QX[0] = X; QX[1] = Y; QX[2] = X + e.w; QX[3] = Y; QX[4] = X + e.w; QX[5] = Y + e.h; QX[6] = X; QX[7] = Y + e.h;
          if (!gOpen(X, Y, X + e.w, Y + e.h)) { ST.txt++; uvRect(e.x / S, e.y / S, (e.x + e.w) / S, (e.y + e.h) / S); emit(TA.tex, 0, st.bl, st.F, 0, A, A, A, A, 0, 0, 0, 0); return; } } }
      ST.txtR++; note('text'); const s = Math.max(Math.hypot(m[0], m[1]), 1), M = V.measureText(t), w = (Math.max(M.width, (M.actualBoundingBoxRight || 0) + (M.actualBoundingBoxLeft || 0)) + 40) * s, hh = 60 * s;
      const X = m[0] * x + m[2] * y + m[4], Y = m[1] * x + m[3] * y + m[5]; const fx_ = rOpen(X - w, Y - hh, X + w, Y + hh); if (sk) { if (mw !== undefined) V.strokeText(t, x, y, mw); else V.strokeText(t, x, y); } else { if (mw !== undefined) V.fillText(t, x, y, mw); else V.fillText(t, x, y); } rClose(fx_); }
    measureText(t) { return V.measureText(t); }
    // ---- 그림
    drawImage(img, a, b, c, d, e, f, g, h) { const n = arguments.length; if (n < 3 || !img) return; const z = srcSize(img);
      let sx = 0, sy = 0, sw, sh, dx, dy, dw, dh;
      if (!z) { ST.other++; note('src'); return this._rImg(arguments); }
      const W = z[0], H = z[1]; if (!W || !H) return;
      if (n === 3) { sw = W; sh = H; dx = a; dy = b; dw = W; dh = H; } else if (n === 5) { sw = W; sh = H; dx = a; dy = b; dw = c; dh = d; } else if (n === 9) { sx = a; sy = b; sw = c; sh = d; dx = e; dy = f; dw = g; dh = h; } else return;
      if (!sw || !sh || !dw || !dh) return;
      if (sw < 0) { sx += sw; sw = -sw; dx += dw; dw = -dw; } if (sh < 0) { sy += sh; sh = -sh; dy += dh; dh = -dh; }   // 원본 사각형이 음수면 뒤집어 맞춤 (2D와 같게)
      // 원본 사각형을 그림 안으로 자르고 대상도 같은 비율로
      if (sx < 0) { const k = -sx / sw; dx += dw * k; dw -= dw * k; sw += sx; sx = 0; } if (sy < 0) { const k = -sy / sh; dy += dh * k; dh -= dh * k; sh += sy; sy = 0; }
      if (sx + sw > W) { const k = (sx + sw - W) / sw; dw -= dw * k; sw = W - sx; } if (sy + sh > H) { const k = (sy + sh - H) / sh; dh -= dh * k; sh = H - sy; }
      if (sw <= 0 || sh <= 0) return;
      const st = C.st; if (!glOK()) { ST.imgR++; note(st.clip ? 'clip' : st.sh ? 'shadow' : st.F === false ? 'filter' : 'op:' + st.op); return this._rImg(arguments); }
      tx4(st.m, dx, dy, dw, dh, QX); const x0 = Math.min(QX[0], QX[2], QX[4], QX[6]), y0 = Math.min(QX[1], QX[3], QX[5], QX[7]), x1 = Math.max(QX[0], QX[2], QX[4], QX[6]), y1 = Math.max(QX[1], QX[3], QX[5], QX[7]);
      if (x1 < 0 || y1 < 0 || x0 > PW || y0 > PH) return;   // 화면 밖
      if (gOpen(x0, y0, x1, y1)) { ST.imgR++; return this._rImg(arguments); }
      const T = texOf(img, W, H, z[2]); ST.img++; const smp = !st.sm ? 0 : T.mip && st.q !== 'low' ? 2 : 1, A = st.a; tx4(st.m, dx, dy, dw, dh, QX);
      if (T.t.length === 1) { uvRect(sx / W, sy / H, (sx + sw) / W, (sy + sh) / H); emit(T.t[0].tex, smp, st.bl, st.F, 0, A, A, A, A, 0, 0, 0, 0); T.b = bid; return; }
      const m = st.m, kx = dw / sw, ky = dh / sh;   // 큰 그림(조각 여러 장): 겹치는 조각마다 따로
      for (const u of T.t) { const ax = Math.max(sx, u.x), ay = Math.max(sy, u.y), bx = Math.min(sx + sw, u.x + u.w), by = Math.min(sy + sh, u.y + u.h); if (bx <= ax || by <= ay) continue;
        tx4(m, dx + (ax - sx) * kx, dy + (ay - sy) * ky, (bx - ax) * kx, (by - ay) * ky, QX); uvRect((ax - u.x) / u.w, (ay - u.y) / u.h, (bx - u.x) / u.w, (by - u.y) / u.h);
        emit(u.tex, smp, st.bl, st.F, 0, A, A, A, A, 0, 0, 0, 0); }
      T.b = bid; }
    _rImg(args) { const n = args.length, m = C.st.m; let x, y, w, h; const z = srcSize(args[0]) || [args[0].width || 0, args[0].height || 0];
      if (n === 3) { x = args[1]; y = args[2]; w = z[0]; h = z[1]; if (!w || !h) { x = -m[4] / (m[0] || 1); y = -m[5] / (m[3] || 1); w = PW * 4; h = PH * 4; } } else if (n === 5) { x = args[1]; y = args[2]; w = args[3]; h = args[4]; } else { x = args[5]; y = args[6]; w = args[7]; h = args[8]; }
      const q = bb(tx4(m, x, y, w, h, Q8)); const fx = rOpen(q[0] - 1, q[1] - 1, q[2] + 1, q[3] + 1); V.drawImage(...args); rClose(fx); }
    putImageData(im, x, y, ...r) { const fx = rOpen(x, y, x + im.width, y + im.height); V.save(); V.setTransform(1, 0, 0, 1, 0, 0); V.putImageData(im, x, y, ...r); V.restore(); C.vd = true; rClose(fx); ST.other++; }
    // ---- 나머지는 V 그대로 (그라데이션·무늬는 만든 값을 따로 기억 → GL로 칠할 수 있게)
    createLinearGradient(x0, y0, x1, y1) { return V.createLinearGradient(x0, y0, x1, y1); }
    createRadialGradient(x0, y0, r0, x1, y1, r1) { return V.createRadialGradient(x0, y0, r0, x1, y1, r1); }
    createConicGradient(...a) { return V.createConicGradient(...a); } createPattern(img, rep) { return V.createPattern(img, rep); }
    createImageData(...a) { return V.createImageData(...a); } getImageData(...a) { note('getImageData'); return V.getImageData(...a); }
    getContextAttributes() { return { alpha: false }; }
  }
  // 그림자 켜진 그리기: 모으기 시작 → 원래 함수(GL로 되면 SHG에 모임 · 안 되면 2D가 그림자까지 그림) → 끝
  for (const n of ['drawImage', 'fillRect', 'fill', 'stroke', 'fillText', 'strokeText']) { const o = Ctx.prototype[n];
    Ctx.prototype[n] = function (...a) { if (!C.st.sh || DBG.noshadow) return o.apply(this, a); if (!shBegin()) return o.apply(this, a); try { return o.apply(this, a); } finally { SHG.cap = false; } }; }
  for (const k of ['fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'miterLimit', 'lineDashOffset', 'font', 'textAlign', 'textBaseline', 'direction', 'letterSpacing', 'wordSpacing', 'fontKerning', 'fontStretch', 'fontVariantCaps', 'textRendering'])
    Object.defineProperty(Ctx.prototype, k, { get() { return V[k]; }, set(v) { V[k] = v; }, configurable: true });
  const CTX = new Ctx();

  // ---------------------------------------------------------------- 한 프레임
  let cssAt = -99, cssKey = '';
  function begin(pw, ph, s, smooth, cv) {
    if (cvs.width !== pw || cvs.height !== ph) { cvs.width = pw; cvs.height = ph; }
    if (layerW !== pw || layerH !== ph) { if (layer) gl.deleteTexture(layer); layer = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, layer); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, pw, ph, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); layerW = pw; layerH = ph; }
    if (!V || Vc.width !== pw || Vc.height !== ph) { if (!Vc) Vc = document.createElement('canvas'); Vc.width = pw; Vc.height = ph; V = Vc.getContext('2d', { willReadFrequently: true }); }   // 보조 캔버스: 작은 부분만 자주 읽으므로 CPU 캔버스
    if (!TA.tex) { TA.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, TA.tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TA.S, TA.S, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); TA.c = document.createElement('canvas'); TA.c.width = 1026; TA.c.height = 514; TA.g = TA.c.getContext('2d', { willReadFrequently: true }); }
    if (frameNo - cssAt > 30 || cssKey !== pw + 'x' + ph) { cssAt = frameNo; cssKey = pw + 'x' + ph; const r = cv.getBoundingClientRect(), S = cvs.style; S.left = r.left + 'px'; S.top = r.top + 'px'; S.width = r.width + 'px'; S.height = r.height + 'px'; }
    if (cvs.style.display !== 'block') cvs.style.display = 'block';
    PW = pw; PH = ph; ST = ZST(); ST.t0 = performance.now();
    gl.viewport(0, 0, pw, ph); for (const pr of PR) { gl.useProgram(pr.p); gl.uniform2f(pr.uR, pw, ph); pr.f = undefined; } curProg = null; gl.bindVertexArray(vao); curBl = -1; blendSet(0);
    gl.activeTexture(gl.TEXTURE0 + NS); gl.bindTexture(gl.TEXTURE_2D, RAMP.tex); gl.bindSampler(NS, SMP[1]); gl.activeTexture(gl.TEXTURE0);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | (STC ? gl.STENCIL_BUFFER_BIT : 0)); BLM.used = false; if (BLM.on && bloomInit()) bloomSize(pw, ph); else BLM.w = 0;
    if (C.stack.length || C.reset) { C.stack.length = 0; C.reset = false; if (V.reset) V.reset(); else Vc.width = Vc.width; }
    C.st = NEWST(); C.st.m = [s, 0, 0, s, 0, 0]; C.st.sm = !!smooth; C.st.q = 'high'; C.vd = true; RUN.open = false; PK.k = 0; PK.mv = false; ppRe(); SHG.list.length = 0; SHG.cap = false;
    V.setTransform(1, 0, 0, 1, 0, 0); V.globalAlpha = 1; V.globalCompositeOperation = 'source-over'; V.filter = 'none'; V.imageSmoothingEnabled = !!smooth; V.imageSmoothingQuality = 'high';
    V.shadowBlur = 0; V.shadowColor = 'rgba(0,0,0,0)'; V.shadowOffsetX = 0; V.shadowOffsetY = 0; V.fillStyle = '#000'; V.strokeStyle = '#000'; V.lineWidth = 1; V.lineCap = 'butt'; V.lineJoin = 'miter'; V.miterLimit = 10; V.setLineDash([]); V.lineDashOffset = 0;
    V.font = '10px sans-serif'; V.textAlign = 'start'; V.textBaseline = 'alphabetic'; V.beginPath();
    return CTX; }
  function end() { if (C.stack.length) { while (C.stack.length) CTX.restore(); note('unbalanced'); }
    runFlush(); shFlush(); flush(); if (BLM.on && BLM.w) bloomEnd(); ST.ms = performance.now() - ST.t0; if (DBG.fin) { const t = performance.now(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, DBG.px || (DBG.px = new Uint8Array(4))); ST.gpu = performance.now() - t; } LAST = ST; frameNo++; if (frameNo % 120 === 0) sweep(); return true; }

  // ---------------------------------------------------------------- 게임이 부르는 것 (game.js의 frame 한 군데: // GL:)
  let LA = null;   // 마지막 프레임 인자 (시험용 _redraw)
  function frame(drawWorld, drawUI, lc, ctx, low, cv, pw, ph, s, smooth, vw, vh) {
    if (!on() || !init()) return false; LA = arguments;
    try { drawWorld(begin(pw, ph, s, smooth, cv), vw, vh); end(); }
    catch (e) { FAILED = true; why = String(e && e.stack || e); hide(); try { console.warn('[GL] 그리다 오류가 나서 원래 그래픽으로 돌아갑니다:', e); } catch (x) {} return false; }
    // UI(아래 칸·HUD)는 화면 캔버스에 바로 2D로 (투명 바탕 · GL 화면 위에 겹침) — 2D 판처럼 low에 그려 통째로 복사하지 않음
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.setTransform(s, 0, 0, s, 0, 0); ctx.imageSmoothingEnabled = smooth; ctx.imageSmoothingQuality = 'high';
    try { drawUI(ctx, vw, vh); } finally { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; } return true; }
  function on() { return WANT && !FAILED && !LOST; }
  function set(v) { WANT = !!v; try { localStorage.setItem('aden_gl', WANT ? (FORCE ? 'force' : '1') : '0'); } catch (e) {} if (!WANT) hide(); syncBtn(); return on(); }
  // 시험용: 멈춘 장면을 GL 켬/끔으로 다시 한 번 그림 (dev/tests/gl_parity.js)
  function redraw(useGL) { const A = LA; if (!A) return 'GL 프레임이 아직 없음'; const [dw, du, lc, ctx, low, , , , s, smooth, vw, vh] = A;
    if (useGL) { const w0 = WANT; WANT = true; const ok = frame(...A); WANT = w0; return ok ? { ...LAST } : 'fail: ' + why; }
    hide(); lc.setTransform(s, 0, 0, s, 0, 0); lc.imageSmoothingEnabled = smooth; lc.imageSmoothingQuality = 'high'; dw(lc, vw, vh); du(lc, vw, vh); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(low, 0, 0); return '2d'; }

  // 시험용: 마지막 프레임 크기로 fn(가짜 컨텍스트)만 그려 봄 (dev/tests/gl_shadow.js) → 그 프레임 통계
  function frameWith(fn) { const A = LA; if (!A || !init()) return 'GL 프레임이 아직 없음'; const cv = A[5], pw = A[6], ph = A[7], s = A[8], smooth = A[9]; const g = begin(pw, ph, s, smooth, cv); g.setTransform(1, 0, 0, 1, 0, 0); fn(g); end(); return { ...LAST, pw, ph }; }

  // ---------------------------------------------------------------- 테스트 페이지(DEMO) ESC 메뉴 버튼 [새 그래픽(시험)]
  function syncBtn() { const b = document.getElementById('esc-gl'); if (!b) return; b.textContent = '새 그래픽(시험): ' + (on() ? '켬' : FAILED || LOST ? '못 씀 (원래 그래픽)' : '끔'); b.setAttribute('aria-pressed', on() ? 'true' : 'false'); }
  function addBtn() { if (!window.DEMO_MODE || document.getElementById('esc-gl')) return; const ref = document.getElementById('esc-mob') || document.getElementById('esc-save'); if (!ref || !ref.parentNode) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'esc-gl'; b.title = 'WebGL로 화면을 그리는 시험 기능 (테스트 페이지 전용)'; b.onclick = () => { set(!WANT); }; ref.parentNode.insertBefore(b, ref.nextSibling); syncBtn(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addBtn); else addBtn();
  if (WANT) patch();   // 처음부터 켜져 있으면 게임이 시작하기 전에 설치 (게임이 미리 만들어 두는 무늬·그라데이션도 기억) · 꺼져 있으면 아무것도 안 바꿈

  window.GLR = { on, set, frame, ctx: CTX, stats: () => LAST, why: () => ({ ...why_ }), info: () => ({ want: WANT, failed: FAILED, lost: LOST, why, maxTex: MAXT, slots: NS, tex: TX.size, texMB: Math.round(tAll / 1048576), text: TA.m.size, ramps: RAMP.m.size, frame: frameNo, renderer: gl ? (() => { try { const d = gl.getExtension('WEBGL_debug_renderer_info'); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch (e) { return '?'; } })() : null }),
    _parseFilter: parseFilter, _redraw: redraw, _frameWith: frameWith, _dbg: DBG,
    bloom: (v, k) => { if (v !== undefined) { BLM.on = !!v; try { localStorage.setItem('aden_gl_bloom', v ? String(k || BLM.k) : '0'); } catch (e) {} } if (k !== undefined) BLM.k = +k; return { on: BLM.on, k: BLM.k }; } };
})();
