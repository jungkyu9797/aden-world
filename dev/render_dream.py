#!/usr/bin/env python3
# 11/1 3차: 몽환의 섬 유니콘·정령 8종 오프라인 렌더러 — 외부 모델·그림·텍스처 없이 numpy로 직접 만든 3D(SDF 표면 + 볼륨) 렌더
#   사용:  python3 dev/render_dream.py                 (전부 · 2코어로 약 30~40분)
#          python3 dev/render_dream.py --only unicorn   (유니콘만 · fire/water/earth/wind 도 가능 · 여러 개는 쉼표)
#          python3 dev/render_dream.py --skip           (캐시에 이미 있는 프레임은 건너뜀)
#          python3 dev/render_dream.py --pack           (렌더 캐시 dev/out/dream_cache/*.npz 로 아틀라스·메타만 다시 만듦 · 캐시는 저장소에 안 올라감 — 처음엔 전부 렌더)
#   결과:  assets/dream/unicorn.webp · spirits_a.webp(불·물) · spirits_b.webp(땅·바람) · auras.webp(오로라 프레임) — 4장 (테스트 판에는 build_test.py가 페이지 안에 넣음)
#          src/game.js 의 /*DRA_META_BEGIN*/ … /*DRA_META_END*/ 사이 메타(프레임 자리·기준점) · dev/out/dream3_sheet_preview.png
#   카메라: 게임과 같은 정사영 쿼터뷰 (방위 45° · 높이각 30°) · 방향 8줄 중 대칭인 3줄(0·6·7)은 2·4·3줄을 좌우로 뒤집어 씀(빛도 좌우 대칭으로 둠)
#   좌표: 모델 단위 = 출력 픽셀 (RS = 세계 1px당 출력 px) · 모델 x = 앞 · y = 위 · z = 오른쪽
import numpy as np, math, os, sys, json, time, argparse, hashlib
from scipy import ndimage as ndi
import cv2
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
CACHE = os.path.join(ROOT, 'dev', 'out', 'dream_cache')
SQ2 = math.sqrt(2.0)
TH = math.radians(30.0)
CAMV = np.array([math.cos(TH) / SQ2, math.sin(TH), math.cos(TH) / SQ2])   # 카메라 쪽 (월드)
SRV = np.array([1 / SQ2, 0.0, -1 / SQ2])                                     # 화면 오른쪽
SUV = np.cross(CAMV, SRV)                                                   # 화면 위
DIRV = [(0, 1), (0.7071, 0.7071), (1, 0), (0.7071, -0.7071), (0, -1), (-0.7071, -0.7071), (-1, 0), (-0.7071, 0.7071)]   # 게임 META.dirs


def rot_row(row):
    dx, dz = DIRV[row]; n = math.hypot(dx, dz); dx /= n; dz /= n
    return np.array([[dx, 0, -dz], [0, 1, 0], [dz, 0, dx]])   # 월드 = M @ 모델


def nrm(v):
    v = np.asarray(v, float); return v / (np.linalg.norm(v, axis=-1, keepdims=True) + 1e-12)


def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)


# ------------------------------------------------------------------ 잡음 (주기 격자 값 잡음 · 5차 보간)
class Noise3:
    def __init__(s, seed, P=64):
        r = np.random.default_rng(seed); s.P = P; s.t = (r.random(P * P * P, dtype=np.float32) * 2 - 1)

    def __call__(s, x, y, z):
        P = s.P
        xf = np.floor(x); yf = np.floor(y); zf = np.floor(z)
        fx = (x - xf).astype(np.float32); fy = (y - yf).astype(np.float32); fz = (z - zf).astype(np.float32)
        xi = xf.astype(np.int64) % P; yi = yf.astype(np.int64) % P; zi = zf.astype(np.int64) % P
        x1 = (xi + 1) % P; y1 = (yi + 1) % P; z1 = (zi + 1) % P
        ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10); uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10); uz = fz * fz * fz * (fz * (fz * 6 - 15) + 10)
        t = s.t; a0 = xi * P * P; a1 = x1 * P * P; b0 = yi * P; b1 = y1 * P
        n00 = t[a0 + b0 + zi] + (t[a0 + b0 + z1] - t[a0 + b0 + zi]) * uz
        n01 = t[a0 + b1 + zi] + (t[a0 + b1 + z1] - t[a0 + b1 + zi]) * uz
        n10 = t[a1 + b0 + zi] + (t[a1 + b0 + z1] - t[a1 + b0 + zi]) * uz
        n11 = t[a1 + b1 + zi] + (t[a1 + b1 + z1] - t[a1 + b1 + zi]) * uz
        n0 = n00 + (n01 - n00) * uy; n1 = n10 + (n11 - n10) * uy
        return n0 + (n1 - n0) * ux


NZ = Noise3(7, 64); NZ2 = Noise3(19, 64); NZ3 = Noise3(31, 32)


def fbm(nz, x, y, z, oct=4, gain=0.5):
    s = 0.0; a = 1.0; f = 1.0; tot = 0.0
    for o in range(oct):
        s = s + a * nz(x * f + o * 17.3, y * f + o * 7.1, z * f + o * 3.7); tot += a; a *= gain; f *= 2.0
    return s / tot


# ------------------------------------------------------------------ SDF 기본 도형 (X·Y·Z는 서로 브로드캐스트되는 배열)
def sd_round_cone(X, Y, Z, a, b, r1, r2):
    a = np.asarray(a, float); b = np.asarray(b, float)
    ba = b - a; l2 = float(ba @ ba); rr = r1 - r2; a2 = l2 - rr * rr; il2 = 1.0 / l2
    px = X - a[0]; py = Y - a[1]; pz = Z - a[2]
    y = px * ba[0] + py * ba[1] + pz * ba[2]; z = y - l2
    qx = px * l2 - ba[0] * y; qy = py * l2 - ba[1] * y; qz = pz * l2 - ba[2] * y
    x2 = qx * qx + qy * qy + qz * qz; y2 = y * y * l2; z2 = z * z * l2
    k = np.sign(rr) * rr * rr * x2
    d3 = (np.sqrt(np.maximum(x2 * a2 * il2, 0)) + y * rr) * il2 - r1
    d1 = np.sqrt(x2 + z2) * il2 - r2
    d2 = np.sqrt(x2 + y2) * il2 - r1
    return np.where(np.sign(z) * a2 * z2 > k, d1, np.where(np.sign(y) * a2 * y2 < k, d2, d3))


def sd_ell(X, Y, Z, c, R, r):
    px = X - c[0]; py = Y - c[1]; pz = Z - c[2]
    q0 = (R[0, 0] * px + R[0, 1] * py + R[0, 2] * pz) / r[0]
    q1 = (R[1, 0] * px + R[1, 1] * py + R[1, 2] * pz) / r[1]
    q2 = (R[2, 0] * px + R[2, 1] * py + R[2, 2] * pz) / r[2]
    k0 = np.sqrt(q0 * q0 + q1 * q1 + q2 * q2)
    k1 = np.sqrt((q0 / r[0]) ** 2 + (q1 / r[1]) ** 2 + (q2 / r[2]) ** 2)
    return k0 * (k0 - 1.0) / np.maximum(k1, 1e-6)


def frame_from(x_axis, up_hint=(0, 1, 0)):
    """x_axis 방향을 첫 축으로 하는 직교 축 3개 (행 = 지역 축)"""
    a = nrm(x_axis); u = np.asarray(up_hint, float)
    if abs(a @ nrm(u)) > 0.97: u = np.array([1.0, 0, 0]) if abs(a[0]) < 0.9 else np.array([0, 0, 1.0])
    c = nrm(np.cross(a, u)); b = np.cross(c, a)
    return np.array([a, b, c])


class Prim:
    __slots__ = ('f', 'lo', 'hi', 'mat', 'k', 'op')

    def __init__(s, f, lo, hi, mat=1, k=0.0, op='u'):
        s.f = f; s.lo = np.asarray(lo, float); s.hi = np.asarray(hi, float); s.mat = mat; s.k = k; s.op = op


def P_sph(c, r, mat=1, k=0.0, op='u'):
    c = np.asarray(c, float)
    return Prim(lambda X, Y, Z: np.sqrt((X - c[0]) ** 2 + (Y - c[1]) ** 2 + (Z - c[2]) ** 2) - r, c - r, c + r, mat, k, op)


def P_cone(a, b, r1, r2, mat=1, k=0.0, op='u'):
    a = np.asarray(a, float); b = np.asarray(b, float); m = max(r1, r2)
    return Prim(lambda X, Y, Z: sd_round_cone(X, Y, Z, a, b, r1, r2), np.minimum(a, b) - m, np.maximum(a, b) + m, mat, k, op)


def P_conez(a, b, r1, r2, sz, mat=1, k=0.0, op='u'):
    """옆(z)으로 1/sz 만큼 납작한 둥근 원뿔 (목·몸통 같은 납작한 단면)"""
    a = np.asarray(a, float); b = np.asarray(b, float); m = max(r1, r2); cz = (a[2] + b[2]) / 2
    a2 = a.copy(); b2 = b.copy(); lo = np.minimum(a, b) - m; hi = np.maximum(a, b) + m; lo[2] = cz - m / sz; hi[2] = cz + m / sz
    return Prim(lambda X, Y, Z: sd_round_cone(X, Y, (Z - cz) * sz + cz, a2, b2, r1, r2) / sz, lo, hi, mat, k, op)


def catmull(pts, n):
    """점들을 지나는 매끈한 곡선 위 n개"""
    P = np.asarray(pts, float); P = np.vstack([2 * P[0] - P[1], P, 2 * P[-1] - P[-2]]); out = []
    for t in np.linspace(0, len(pts) - 1, n):
        i = min(int(t), len(pts) - 2); u = t - i; p0, p1, p2, p3 = P[i], P[i + 1], P[i + 2], P[i + 3]
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3))
    return np.array(out)


def P_ell(c, R, r, mat=1, k=0.0, op='u'):
    c = np.asarray(c, float); R = np.asarray(R, float); r = np.asarray(r, float); m = r.max()
    return Prim(lambda X, Y, Z: sd_ell(X, Y, Z, c, R, r), c - m, c + m, mat, k, op)


def P_ell_ax(a, b, rw, rd, mat=1, k=0.0, up=(0, 1, 0), extra=1.0):
    """a→b 를 긴 축으로 하는 타원체 (rd = up 쪽 두께 · rw = 옆 두께)"""
    a = np.asarray(a, float); b = np.asarray(b, float); c = (a + b) / 2; L = np.linalg.norm(b - a) / 2 * extra
    return P_ell(c, frame_from(b - a, up), (max(L, 1e-3), rd, rw), mat, k)


# ------------------------------------------------------------------ 부피 (모델 공간 격자 SDF + 재질)
class Vol:
    def __init__(s, lo, hi, h, margin):
        s.lo = np.asarray(lo, float).copy(); s.h = float(h); s.margin = float(margin)
        s.n = tuple(int(v) for v in (np.ceil((np.asarray(hi, float) - s.lo) / h) + 1))
        s.d = np.full(s.n, margin, np.float32); s.m = np.zeros(s.n, np.uint8)

    @property
    def hi(s):
        return s.lo + (np.array(s.n) - 1) * s.h

    def add(s, p):
        pad = s.margin + p.k + s.h
        i0 = np.maximum(0, np.floor((p.lo - pad - s.lo) / s.h).astype(int))
        i1 = np.minimum(np.array(s.n), np.ceil((p.hi + pad - s.lo) / s.h).astype(int) + 1)
        if np.any(i1 <= i0): return
        X = (s.lo[0] + np.arange(i0[0], i1[0]) * s.h).astype(np.float32)[:, None, None]
        Y = (s.lo[1] + np.arange(i0[1], i1[1]) * s.h).astype(np.float32)[None, :, None]
        Z = (s.lo[2] + np.arange(i0[2], i1[2]) * s.h).astype(np.float32)[None, None, :]
        d = np.minimum(p.f(X, Y, Z), s.margin + p.k).astype(np.float32)
        sl = (slice(i0[0], i1[0]), slice(i0[1], i1[1]), slice(i0[2], i1[2]))
        a = s.d[sl]
        if p.op == 'u':
            if p.k > 0:
                hh = np.clip(0.5 + 0.5 * (d - a) / p.k, 0, 1); r = d * (1 - hh) + a * hh - p.k * hh * (1 - hh)
            else:
                r = np.minimum(a, d)
            s.m[sl] = np.where(d < a, p.mat, s.m[sl])
        else:   # 빼기
            if p.k > 0:
                hh = np.clip(0.5 - 0.5 * (a + d) / p.k, 0, 1); r = a * (1 - hh) + (-d) * hh + p.k * hh * (1 - hh)
            else:
                r = np.maximum(a, -d)
        s.d[sl] = r

    def crop(s, pad=3):
        occ = s.d < s.margin * 0.95
        if not occ.any(): return
        idx = [np.nonzero(occ.any(axis=tuple(j for j in range(3) if j != i)))[0] for i in range(3)]
        i0 = [max(0, ix[0] - pad) for ix in idx]; i1 = [min(s.n[i], ix[-1] + pad + 1) for i, ix in enumerate(idx)]
        sl = tuple(slice(a, b) for a, b in zip(i0, i1))
        s.d = np.ascontiguousarray(s.d[sl]); s.m = np.ascontiguousarray(s.m[sl]); s.lo = s.lo + np.array(i0) * s.h; s.n = s.d.shape

    def ground_y(s):
        occ = (s.d < 0).any(axis=(0, 2)); iy = np.nonzero(occ)[0]
        if not len(iy): return 0.0
        j = iy[0]; col = s.d[:, j, :].min(); col0 = s.d[:, max(0, j - 1), :].min()
        f = col0 / max(col0 - col, 1e-6) if j > 0 else 0.0     # 칸 사이 보간
        return s.lo[1] + (j - 1 + f) * s.h

    def sample(s, P, arr=None):
        v = s.d if arr is None else arr
        g = (P - s.lo) / s.h
        nx, ny, nz = s.n
        x = np.clip(g[:, 0], 0, nx - 1.001); y = np.clip(g[:, 1], 0, ny - 1.001); z = np.clip(g[:, 2], 0, nz - 1.001)
        x0 = x.astype(np.int64); y0 = y.astype(np.int64); z0 = z.astype(np.int64)
        fx = (x - x0).astype(np.float32); fy = (y - y0).astype(np.float32); fz = (z - z0).astype(np.float32)
        f = v.ravel(); s0 = ny * nz; s1 = nz; i = x0 * s0 + y0 * s1 + z0
        c00 = f[i] + (f[i + 1] - f[i]) * fz; c01 = f[i + s1] + (f[i + s1 + 1] - f[i + s1]) * fz
        c10 = f[i + s0] + (f[i + s0 + 1] - f[i + s0]) * fz; c11 = f[i + s0 + s1] + (f[i + s0 + s1 + 1] - f[i + s0 + s1]) * fz
        c0 = c00 + (c01 - c00) * fy; c1 = c10 + (c11 - c10) * fy
        out = c0 + (c1 - c0) * fx
        if arr is None:   # 부피 밖은 상자까지 거리만큼 더함 (빛 추적이 밖으로 나가면 빨리 끝나게)
            out = out + np.linalg.norm(np.maximum(0, np.maximum(s.lo - P, P - s.hi)), axis=1)
        return out

    def mat_at(s, P):
        g = np.rint((P - s.lo) / s.h).astype(np.int64)
        for k in range(3): np.clip(g[:, k], 0, s.n[k] - 1, out=g[:, k])
        return s.m[g[:, 0], g[:, 1], g[:, 2]]

    def grad(s, P, e=None):
        e = e or s.h * 0.75
        g = np.empty_like(P)
        for k in range(3):
            o = np.zeros(3); o[k] = e
            g[:, k] = s.sample(P + o) - s.sample(P - o)
        return nrm(g)

    def inside(s, P):
        return np.all((P >= s.lo - 1e-3) & (P <= s.hi + 1e-3), axis=1)


def build_vol(prims, h, margin, pad_lo=None):
    lo = np.min([p.lo for p in prims if p.op == 'u'], axis=0) - margin - 3 * h
    hi = np.max([p.hi for p in prims if p.op == 'u'], axis=0) + margin + 3 * h
    v = Vol(lo, hi, h, margin)
    for p in prims: v.add(p)
    v.crop(); return v


# ------------------------------------------------------------------ 시점 · 광선
class View:
    def __init__(s, M, lo, hi, ss, extra_pts=None, pad=3):
        s.M = M; s.c = M.T @ CAMV; s.r = M.T @ SRV; s.u = M.T @ SUV; s.ss = ss
        cs = np.array([[x, y, z] for x in (lo[0], hi[0]) for y in (lo[1], hi[1]) for z in (lo[2], hi[2])])
        if extra_pts is not None and len(extra_pts): cs = np.vstack([cs, extra_pts])
        sx = cs @ s.r; sy = cs @ s.u
        s.x0 = math.floor(sx.min()) - pad; s.x1 = math.ceil(sx.max()) + pad; s.y0 = math.floor(sy.min()) - pad; s.y1 = math.ceil(sy.max()) + pad
        s.Wd = int(s.x1 - s.x0); s.Hd = int(s.y1 - s.y0); s.W = s.Wd * ss; s.H = s.Hd * ss

    def rays(s, ss=None):
        ss = ss or s.ss; W = s.Wd * ss; H = s.Hd * ss
        gx = s.x0 + (np.arange(W) + 0.5) / ss; gy = s.y1 - (np.arange(H) + 0.5) / ss
        O = (gx[None, :, None] * s.r + gy[:, None, None] * s.u + 2000.0 * s.c).reshape(-1, 3)
        return O, -s.c, W, H

    def proj(s, P, ss=None):
        ss = ss or s.ss
        return np.stack([(P @ s.r - s.x0) * ss - 0.5, (s.y1 - P @ s.u) * ss - 0.5], 1), P @ s.c


def box_t(O, D, lo, hi):
    with np.errstate(divide='ignore', invalid='ignore'):
        inv = 1.0 / np.where(np.abs(D) < 1e-9, 1e-9, D)
        t0 = (lo - O) * inv; t1 = (hi - O) * inv
    tmin = np.max(np.minimum(t0, t1), axis=1); tmax = np.min(np.maximum(t0, t1), axis=1)
    return tmin, tmax


def trace(vol, O, D, eps=None, maxit=160):
    N = len(O); tmin, tmax = box_t(O, D, vol.lo, vol.hi)
    t = np.maximum(tmin, 0).astype(np.float64); hit = np.zeros(N, bool)
    idx = np.nonzero(tmax > tmin)[0]; eps = eps or vol.h * 0.2; ms = vol.h * 0.15
    for it in range(maxit):
        if not len(idx): break
        P = O[idx] + t[idx, None] * D
        d = vol.sample(P)
        h = d < eps
        hit[idx[h]] = True
        t[idx] += np.maximum(d * 0.85, ms)
        keep = (~h) & (t[idx] < tmax[idx])
        idx = idx[keep]
    hid = np.nonzero(hit)[0]
    # 마무리: 표면으로 몇 번 더 다가감 (안쪽이면 뒤로)
    for it in range(4):
        P = O[hid] + t[hid, None] * D; d = vol.sample(P); t[hid] += d * 0.9
    return hit, t


def soft_shadow(vol, P, L, tmax, k=10.0, steps=40):
    N = len(P); res = np.ones(N)
    LL = np.broadcast_to(L, P.shape); b0, b1 = box_t(P, LL, vol.lo, vol.hi)   # 부피 상자 안을 지나는 구간만 걸음
    t = np.maximum(vol.h * 1.5, b0); te = np.minimum(tmax, b1); idx = np.nonzero(te > t)[0]
    far = vol.margin * 0.9
    for i in range(steps):
        if not len(idx): break
        Q = P[idx] + t[idx, None] * L; d = vol.sample(Q)
        res[idx] = np.minimum(res[idx], k * np.where(d > far, 1e3, d) / t[idx])   # 여백 값(실제 거리 아님)은 반그림자에 안 씀
        t[idx] += np.clip(d, vol.h * 0.6, vol.h * 14)
        keep = (res[idx] > 0.02) & (t[idx] < te[idx])
        idx = idx[keep]
    r = np.clip(res, 0, 1); return r * r * (3 - 2 * r)


def ambient_occ(vol, P, N, step, n=5, k=1.0):
    occ = np.zeros(len(P)); w = 1.0; tot = 0.0
    for i in range(1, n + 1):
        hh = step * i; d = vol.sample(P + N * hh); occ += w * np.clip(hh - d, 0, None) / hh; tot += w; w *= 0.7
    return np.clip(1 - k * occ / tot, 0, 1)


def aces(x):
    return np.clip(x * (2.51 * x + 0.03) / (x * (2.43 * x + 0.59) + 0.14), 0, 1)


def to_srgb(x):
    x = np.clip(x, 0, 1); return np.where(x <= 0.0031308, 12.92 * x, 1.055 * np.power(x, 1 / 2.4) - 0.055)


# 빛 (월드): 위 + 카메라 쪽에서 오는 주광 (화면 좌우 대칭 → 좌우 뒤집은 방향 줄도 빛이 맞음) · 하늘빛 · 양쪽 뒤 테두리 빛
LKEY_W = nrm(np.array([0.0, 1.0, 0.0]) + 0.16 * nrm(np.array([1.0, 0.0, 1.0])) - 0.34 * SRV)   # 위·조금 왼쪽·조금 앞 (뒤집은 줄은 오른쪽에서 — 그림자를 짧게 해서 티가 덜 나게)
KEY_COL = np.array([1.0, 0.95, 0.87]) * 1.9
SKY_UP = np.array([0.24, 0.29, 0.42]); SKY_DN = np.array([0.12, 0.11, 0.11])


def downsample(img, ss):
    if ss == 1: return img
    H, W = img.shape[:2]; return img.reshape(H // ss, ss, W // ss, ss, -1).mean(axis=(1, 3))


def splat(acc_c, acc_a, xy, col, cov, W, H):
    """점들을 쌍선형으로 흩뿌림 (색×덮임 · 덮임 누적)"""
    x = xy[:, 0]; y = xy[:, 1]; x0 = np.floor(x).astype(np.int64); y0 = np.floor(y).astype(np.int64); fx = x - x0; fy = y - y0
    for dx, dy, w in ((0, 0, (1 - fx) * (1 - fy)), (1, 0, fx * (1 - fy)), (0, 1, (1 - fx) * fy), (1, 1, fx * fy)):
        xi = x0 + dx; yi = y0 + dy; ok = (xi >= 0) & (yi >= 0) & (xi < W) & (yi < H)
        li = (yi[ok] * W + xi[ok]); ww = (w * cov)[ok]
        acc_a += np.bincount(li, ww, minlength=W * H)
        for ch in range(3): acc_c[:, ch] += np.bincount(li, ww * col[ok, ch], minlength=W * H)


# ================================================================== 유니콘 (흰 말 · 나선 뿔 · 휘날리는 갈기·꼬리)
#   뼈대(앞다리·뒷다리 4마디 · 목 4마디 · 머리)를 각도로 움직이고, 근육 덩어리(타원체·둥근 원뿔)를 부드럽게 합쳐 몸을 만듦
#   단위 HU = 기갑(어깨) 높이 · 세계 95px × RS_U
RS_U = 1.25
U_WH = 95.0
HU = U_WH * RS_U
U_ANIMS = [('idle', 8), ('walk', 8), ('attack', 8), ('cast', 6), ('death', 5)]
U_ROWS = [1, 2, 3, 4, 5]      # 렌더하는 방향 줄 (0·7·6 = 2·3·4 좌우 뒤집기)


def sagv(a):   # 수직 아래에서 앞으로 a도 돌린 단위 벡터 (다리)
    a = math.radians(a); return np.array([math.sin(a), -math.cos(a), 0.0])


def angv(a):   # 수평 앞에서 위로 a도 (목·머리)
    a = math.radians(a); return np.array([math.cos(a), math.sin(a), 0.0])


def Rz(a):
    a = math.radians(a); c, s = math.cos(a), math.sin(a); return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1.0]])


def Rx(a):
    a = math.radians(a); c, s = math.cos(a), math.sin(a); return np.array([[1.0, 0, 0], [0, c, -s], [0, s, c]])


def gallop_leg(front, ph, duty=0.42):
    ph %= 1.0; A = 30 if front else 27
    if ph < duty:
        s = ph / duty; S = A * (1 - 2 * s); f = 0.0; fl = 0.0; load = math.sin(math.pi * s)
    else:
        s = (ph - duty) / (1 - duty); e = s * s * (3 - 2 * s); S = A * (-1 + 2 * e); f = math.sin(math.pi * s); fl = math.sin(math.pi * min(1, s * 1.15)); load = 0.0
    if front:
        return [-35 + 0.5 * S + 22 * f, S + 28 * f, S + 28 * f - 118 * fl, S + 28 * f - 118 * fl + 35 - 30 * fl + 14 * load]
    return [40 + 0.75 * S + 22 * f, -42 + 0.5 * S - 32 * f, -4 + S + 62 * f, -4 + S + 62 * f + 40 + 18 * f + 10 * load]


def uni_pose(anim, fi):
    """동작·프레임 → 자세 값 (각도는 도)"""
    nf = dict(U_ANIMS)[anim]; ph = fi / nf; T2 = 2 * math.pi
    P = dict(pitch=0.0, roll=0.0, bob=0.0, br=0.0, dx=0.0, neck=[46, 56, 68, 80], nk=0.0, head=-60.0, earL=0.0, earR=0.0,
             tail=-128.0, tsw=0.0, wind=(-0.85, 0.42, 0.18), grav=0.55, wav=1.0, wph=ph, glow=0.0, anchor=None,
             FL=[-35, 0, 0, 38], FR=[-35, 0, 0, 38], HL=[40, -42, -4, 38], HR=[40, -42, -4, 38], legrel=0.0, eye=1.0)
    if anim == 'idle':
        P['br'] = 0.014 * math.sin(T2 * ph); P['nk'] = 2.0 * math.sin(T2 * ph); P['head'] = -60 + 3.0 * math.sin(T2 * ph + 0.6)
        P['earL'] = -38 * max(0, math.sin(T2 * (ph - 0.3))) ** 2; P['earR'] = 6 * math.sin(T2 * ph)
        P['tsw'] = 14 * math.sin(T2 * ph); P['tail'] = -124 + 4 * math.sin(T2 * ph + 1)
        P['HL'] = [44, -46, 8, 58]           # 왼 뒷다리를 살짝 쉬게
        P['FR'] = [-33, 1, 1, 39]; P['FL'] = [-35, -1, -1, 37]
        P['wind'] = (-0.85, 0.55, 0.2); P['grav'] = 0.42
    elif anim == 'walk':   # 구보 (가로 갤럽) · 8장 한 바퀴
        P['FL'] = gallop_leg(True, ph + 0.45); P['FR'] = gallop_leg(True, ph + 0.58)
        P['HL'] = gallop_leg(False, ph + 0.0); P['HR'] = gallop_leg(False, ph + 0.12)
        P['pitch'] = 4.5 * math.sin(T2 * (ph + 0.1)); P['bob'] = 0.025 * math.sin(T2 * 2 * (ph + 0.05))
        P['nk'] = -10 + 5 * math.sin(T2 * (ph + 0.3)); P['head'] = -48 + 6 * math.sin(T2 * (ph + 0.35))
        P['tail'] = -160 + 8 * math.sin(T2 * ph); P['tsw'] = 6 * math.sin(T2 * ph)
        P['wind'] = (-1.7, 0.3, 0.1); P['grav'] = 0.32; P['wav'] = 1.4; P['earL'] = P['earR'] = -18
    elif anim == 'attack':  # 앞발 들어 올림 → 정점 → 내려오며 뿔 찌르기
        K = [  # pitch, nk, head, dx, 앞다리 접힘, 허우적, 뒷다리 웅크림
            (-4, -6, -66, -0.02, 0.0, 0.0, 0.1), (17, 6, -52, -0.04, 0.6, 0.0, 0.5), (36, 12, -40, -0.05, 1.0, 1.0, 0.9), (44, 14, -36, -0.05, 1.0, -1.0, 1.0),
            (24, -4, -70, 0.03, 0.8, 0.0, 0.7), (5, -16, -94, 0.10, 0.2, 0.0, 0.2), (1, -10, -80, 0.07, 0.0, 0.0, 0.05), (-1, -3, -64, 0.02, 0.0, 0.0, 0.0)][fi]
        pt, nk, hd, dx, fold, paw, cr = K
        P['pitch'] = pt; P['nk'] = nk; P['head'] = hd; P['dx'] = dx
        for side, sg in (('FL', 1), ('FR', -1)):
            r = [-20 + 10 * paw * sg, 72 + 28 * paw * sg, -32 - 20 * paw * sg, -12]
            st = [-35, 0, 0, 38]
            P[side] = [st[i] * (1 - fold) + (r[i] + pt) * fold for i in range(4)]
        for side in ('HL', 'HR'):
            P[side] = [40 + 22 * cr, -42 - 6 * cr - pt * 0.55, -4 - 8 * cr - pt * 0.2, 38 + 6 * cr]
        P['tail'] = -150 + 10 * fold; P['wind'] = (-1.1, 0.9 * fold + 0.3, 0.2); P['grav'] = 0.45; P['earL'] = P['earR'] = -30 * (fi in (4, 5, 6))
        P['anchor'] = 'hind'
    elif anim == 'cast':    # 머리 높이 들고 뿔에 빛 · 앞발 하나씩 구름
        w = math.sin(T2 * ph)
        P['pitch'] = 11 + 2 * w; P['nk'] = 14; P['head'] = -30 + 3 * w; P['glow'] = 0.75 + 0.25 * math.sin(T2 * ph + 1)
        a = max(0, w); b = max(0, -w); st = [-35, 0, 0, 38]; up = [-10, 85, -25, -5]
        P['FL'] = [(st[i] * (1 - a) + up[i] * a) + 11 for i in range(4)]
        P['FR'] = [(st[i] * (1 - b) + up[i] * b) + 11 for i in range(4)]
        for side in ('HL', 'HR'): P[side] = [48, -56, -8, 40]
        P['wind'] = (-0.55, 1.15, 0.25); P['grav'] = 0.25; P['wav'] = 1.3; P['tail'] = -140; P['anchor'] = 'hind'
    elif anim == 'death':   # 비틀 → 앞무릎 꺾임 → 엎드림 → 기울어짐 → 옆으로 쓰러짐
        if fi == 0:
            P['pitch'] = -5; P['nk'] = -14; P['head'] = -84; P['FL'] = [-30, 12, -6, 34]; P['FR'] = [-36, -6, -4, 40]; P['HL'] = [44, -50, 0, 42]
        elif fi == 1:
            P['pitch'] = -16; P['nk'] = -18; P['head'] = -90
            P['FL'] = [-48, 62, -100, -70]; P['FR'] = [-40, 50, -95, -60]; P['HL'] = [46, -48, -2, 40]; P['HR'] = [44, -46, -6, 38]
        else:
            P['pitch'] = -3 if fi == 2 else -2; P['nk'] = -12 if fi == 2 else -24; P['head'] = -72 if fi == 2 else (-86 if fi == 3 else -20)
            fold = 1.0 if fi < 4 else 0.35
            FLd = [-62, 82, -96, -92]; HLd = [88, -98, 78, 120]; FLs = [-30, 5, 5, 40]; HLs = [60, -10, 10, 50]
            P['FL'] = [FLd[i] * fold + FLs[i] * (1 - fold) for i in range(4)]; P['FR'] = [v + 6 for v in P['FL']]
            P['HL'] = [HLd[i] * fold + HLs[i] * (1 - fold) for i in range(4)]; P['HR'] = [v - 6 for v in P['HL']]
            P['roll'] = [0, 0, 0, 30, 78][fi]
        P['tail'] = -100 - 10 * fi; P['wind'] = (-0.5, 0.15, 0.25); P['grav'] = 0.9; P['wav'] = 0.5; P['eye'] = 0.0 if fi >= 3 else 1.0
        P['anchor'] = 'center'
    return P


def _roll_prims(prims, Rr):
    """도형마다 함수를 감싸 회전 (점을 거꾸로 돌려 원래 함수에 넣음)"""
    out = []; Ri = Rr.T
    for p in prims:
        f = p.f

        def g(X, Y, Z, f=f):
            x = Ri[0, 0] * X + Ri[0, 1] * Y + Ri[0, 2] * Z; y = Ri[1, 0] * X + Ri[1, 1] * Y + Ri[1, 2] * Z; z = Ri[2, 0] * X + Ri[2, 1] * Y + Ri[2, 2] * Z
            return f(x, y, z)
        cs = np.array([[x, y, z] for x in (p.lo[0], p.hi[0]) for y in (p.lo[1], p.hi[1]) for z in (p.lo[2], p.hi[2])]) @ Rr.T
        out.append(Prim(g, cs.min(0), cs.max(0), p.mat, p.k, p.op))
    return out


def uni_build(P):
    """자세 → SDF 도형들 + 갈기·꼬리 뿌리 + 뿔 자리 (도형은 px · 나머지는 HU)"""
    S = HU; prim = []; pitch = P['pitch']; Rp = Rz(pitch); br = 1 + P['br']; zz = np.array([0, 0, 1.0])
    root = np.array([P['dx'], 0.745 + P['bob'], 0.0])
    B = lambda x, y, z=0.0: root + Rp @ np.array([x, y, z])

    def E(c, r, mat=1, k=0.05, R=None):
        prim.append(P_ell(np.asarray(c) * S, (Rp.T if R is None else R), np.asarray(r) * S, mat, k * S))

    def EA(a, b, rw, rd, mat=1, k=0.05, up=(0, 1, 0), extra=1.0):
        prim.append(P_ell_ax(np.asarray(a) * S, np.asarray(b) * S, rw * S, rd * S, mat, k * S, up, extra))

    def C(a, b, r1, r2, mat=1, k=0.03, op='u'):
        prim.append(P_cone(np.asarray(a) * S, np.asarray(b) * S, r1 * S, r2 * S, mat, k * S, op))

    def Sp(c, r, mat=1, k=0.03, op='u'):
        prim.append(P_sph(np.asarray(c) * S, r * S, mat, k * S, op))

    # ---- 몸통
    E(B(-0.02, 0.0), (0.40, 0.212 * br, 0.192 * br), k=0.0)
    E(B(0.30, 0.0), (0.18, 0.232 * br, 0.162), k=0.06)
    Sp(B(0.41, -0.015), 0.128, k=0.05)
    EA(B(0.23, 0.215), B(0.43, 0.035), 0.168, 0.082, k=0.05)                # 어깨뼈 덩어리
    E(B(0.19, 0.19), (0.14, 0.065, 0.075), k=0.05)                          # 기갑
    E(B(-0.10, 0.14), (0.30, 0.09, 0.148), k=0.06)                           # 등
    E(B(-0.33, 0.06), (0.20, 0.215, 0.183), k=0.06)                          # 엉덩이
    E(B(-0.37, 0.155), (0.16, 0.105, 0.148), k=0.05)                         # 엉덩이 위
    Sp(B(-0.47, 0.05), 0.128, k=0.05)
    E(B(0.02, -0.075), (0.33, 0.15, 0.178 * br), k=0.06)                     # 배
    # ---- 목 (4마디 · 등 쪽 볼록한 갈기선)
    na = [a + P['nk'] + pitch for a in P['neck']]; nl = [0.17, 0.17, 0.16, 0.14]
    rad = [(0.19, 0.142), (0.155, 0.112), (0.125, 0.090), (0.103, 0.076), (0.086, 0.068)]
    N = [B(0.285, 0.10)]
    for a, l in zip(na, nl): N.append(N[-1] + l * angv(a))
    NS = 16; sp = catmull(N, NS); rq = np.linspace(0, 4, NS); rdq = np.interp(rq, range(5), [r[0] for r in rad]); rwq = np.interp(rq, range(5), [r[1] for r in rad])
    crest = []
    for i in range(NS - 1):
        prim.append(P_conez(sp[i] * S, sp[i + 1] * S, rdq[i] * S, rdq[i + 1] * S, rdq[i] / rwq[i], 1, (0.09 if i < 3 else 0.035) * S))
    for i in range(NS):
        tg = nrm(sp[min(i + 1, NS - 1)] - sp[max(i - 1, 0)]); up = np.array([-tg[1], tg[0], 0])
        crest.append((sp[i] + up * rdq[i] * 0.9, up))
    poll = N[-1]
    # ---- 머리
    ha = P['head'] + pitch + P['nk'] * 0.5; hd = angv(ha); hn = angv(ha + 90)
    HF = np.array([hd, hn, zz])
    hs = 1.1   # 머리 크기
    H = lambda a, b, c=0.0: poll + hs * (a * hd + b * hn + c * zz)
    E(H(0.075, 0.005), np.array((0.13, 0.088, 0.082)) * hs, k=0.03, R=HF)                   # 머리뼈
    E(H(0.16, -0.066), np.array((0.125, 0.098, 0.078)) * hs, k=0.045, R=HF)                 # 볼
    prim.append(P_conez(H(0.12, 0.010) * S, H(0.50, -0.020) * S, 0.080 * S * hs, 0.060 * S * hs, 1.25, 1, 0.05 * S))   # 콧등 (옆이 납작)
    E(H(0.525, -0.034), np.array((0.050, 0.056, 0.050)) * hs, mat=2, k=0.06, R=HF)          # 주둥이 (콧등에 녹아듦)
    E(H(0.475, -0.083), np.array((0.048, 0.024, 0.034)) * hs, mat=2, k=0.03, R=HF)          # 아래턱
    for sg in (-1, 1):
        prim.append(P_ell(H(0.565, 0.012, 0.033 * sg) * S, HF, np.array([0.022, 0.011, 0.009]) * S, 2, 0.008 * S, op='s'))   # 콧구멍
        Sp(H(0.20, 0.040, 0.060 * sg), 0.030, k=0.02)                                                                       # 눈두덩
        Sp(H(0.215, 0.026, 0.068 * sg), 0.021, mat=4, k=0.004)                                                              # 눈
        ea = P['earL'] if sg > 0 else P['earR']
        ed = nrm(hn * 0.92 - hd * 0.30 + zz * 0.26 * sg)
        if ea: ed = nrm(Rz(ea) @ ed)
        eb = H(0.0, 0.07, 0.045 * sg); C(eb, eb + 0.115 * ed, 0.030, 0.008, mat=6, k=0.015)
    hb = H(0.135, 0.08); hdir = nrm(Rz(10) @ hn); htip = hb + 0.42 * hdir
    C(hb, htip, 0.034, 0.004, mat=5, k=0.006)
    Sp(hb - 0.005 * hdir, 0.032, k=0.018)
    # ---- 다리 (월드 각도 · 몸이 들리면 붙은 자리만 따라감)
    legs = {}
    for nm, top, front, zs in (('FL', B(0.40, 0.03, 0.105), True, 1), ('FR', B(0.40, 0.03, -0.105), True, -1), ('HL', B(-0.33, 0.05, 0.12), False, 1), ('HR', B(-0.33, 0.05, -0.12), False, -1)):
        L = [0.32, 0.325, 0.23, 0.09] if front else [0.35, 0.42, 0.23, 0.09]   # 다리를 실제 말보다 조금 길게 (날렵한 유니콘)
        pts = [top]
        for a, l in zip(P[nm], L): pts.append(pts[-1] + l * sagv(a))
        zt = top[2]; zb = 0.085 * zs
        pts = [p_ + np.array([0, 0, (zb - zt) * (i / 4.0)]) for i, p_ in enumerate(pts)]
        legs[nm] = pts
        a0, a1, a2, a3, a4 = pts
        if front:
            EA(a0 + (a0 - a1) * 0.15, a1, 0.075, 0.09, k=0.05)
            Sp(a1 + np.array([-0.012, 0, 0]), 0.046, k=0.03)
            C(a1, a2, 0.050, 0.031, k=0.025); EA(a1, a1 + (a2 - a1) * 0.5, 0.046, 0.056, k=0.025)
            Sp(a2, 0.034, k=0.015)
        else:
            EA(a0 + (a0 - a1) * 0.2, a1, 0.10, 0.14, k=0.06)
            Sp(a1, 0.055, k=0.04)
            C(a1, a2, 0.062, 0.034, k=0.025); EA(a1, a1 + (a2 - a1) * 0.55, 0.052, 0.074, k=0.025)
            back = nrm(np.cross(a3 - a2, zz))
            Sp(a2, 0.036, k=0.015); Sp(a2 + back * 0.03 + (a2 - a3) * 0.10, 0.022, k=0.012)
        C(a2, a3, 0.024, 0.022, k=0.012)
        bk = nrm(np.cross(a3 - a2, zz)) * 0.012
        C(a2 + bk, a3 + bk, 0.017, 0.016, k=0.008)
        Sp(a3 + bk * 0.6, 0.029, k=0.012)
        C(a3, a4, 0.025, 0.024, k=0.01)
        hdv = nrm((a4 - a3) * 0.4 / 0.085 + np.array([0, -1.0, 0]) * 0.6)
        C(a4, a4 + hdv * 0.05, 0.030, 0.037, mat=3, k=0.005)
    # ---- 꼬리뿌리
    tb = B(-0.505, 0.19); td = nrm(Rx(P['tsw']) @ angv(P['tail'] + pitch)); tt = tb + 0.17 * td
    C(tb, tt, 0.05, 0.03, k=0.03)
    # ---- 갈기·꼬리·앞머리 뿌리 (HU): (자리, 처음 방향, 길이, 종류 0 갈기 · 1 앞머리 · 2 꼬리)
    roots = []
    for (p_, up) in crest[1:-1]: roots.append((p_, nrm(up * 1.0 + zz * 0.25), 0.44, 0))   # 갈기는 위로 솟아 뒤로 흐름 (양쪽에서 다 보이게)
    for q in np.linspace(0, 1, 5): roots.append((B(0.24 - 0.10 * q, 0.232 - 0.02 * q), nrm(Rp @ np.array([-0.6, 1.0, 0.3])), 0.30 - 0.12 * q, 0))
    for q in np.linspace(0, 1, 4): roots.append((H(0.02 + 0.06 * q, 0.088, 0.0), nrm(hd * 0.8 + hn * 0.5), 0.17, 1))
    for q in np.linspace(0, 1, 9): roots.append((tb + (tt - tb) * q, nrm(td * 0.6 + np.array([0, 0.35, 0])), 0.95 - 0.25 * q, 2))
    ex = dict(poll=poll, htip=htip, hb=hb, hd=hd, hn=hn, legs=legs, tb=tb, td=td, barrel=B(-0.02, 0.0))
    if P['roll']:
        Rr = Rx(-P['roll'])
        prim = _roll_prims(prim, Rr)
        roots = [(Rr @ p_, Rr @ d, l, t) for (p_, d, l, t) in roots]
        for k in ('poll', 'htip', 'hb', 'barrel'): ex[k] = Rr @ ex[k]
        ex['hd'] = Rr @ ex['hd']; ex['hn'] = Rr @ ex['hn']
    return prim, roots, ex


# ------------------------------------------------------------------ 털 가닥 (갈기·꼬리): 굵은 다발(가이드)을 바람·중력·물결로 흘리고 몸에 부딪히면 밀어냄 → 다발마다 잔가닥
HAIR = {0: dict(ng=5, nc=7, sp=0.010, cov=0.42, off=1.4, wl=1.0),     # 갈기
        1: dict(ng=5, nc=5, sp=0.008, cov=0.40, off=1.2, wl=0.6),     # 앞머리
        2: dict(ng=12, nc=8, sp=0.016, cov=0.36, off=2.0, wl=1.15)}   # 꼬리


def hair_sim(roots, vol, P, shift, seed=5, nseg=18, S=HU):
    rng = np.random.default_rng(seed)
    gp = []; gd = []; gl = []; gt = []; gph = []; gws = []
    for (p, d0, L, t) in roots:
        H = HAIR[t]
        for j in range(H['ng']):
            if t == 2:
                a = rng.uniform(0, 2 * math.pi); o = np.array([rng.normal(0, 0.012), math.cos(a) * 0.03, math.sin(a) * 0.03])
            else:
                o = rng.normal(0, H['sp'], 3) * np.array([1.0, 0.5, 1.0])
            gp.append((np.asarray(p) + o) * S + shift); gd.append(nrm(np.asarray(d0) + rng.normal(0, 0.18, 3))); gl.append(L * S * rng.uniform(0.72, 1.12))
            gt.append(t); gph.append(rng.uniform(0, 2 * math.pi)); gws.append(rng.uniform(0.75, 1.25))
    gp = np.array(gp); gd = np.array(gd); gl = np.array(gl); gt = np.array(gt); gph = np.array(gph); gws = np.array(gws)
    W = np.array(P['wind'], float); G = np.array([0, -1.0, 0]) * P['grav']; T2 = 2 * math.pi
    pts = [gp.copy()]; pos = gp.copy()
    for k in range(1, nseg + 1):
        s = k / nseg
        stiff = (1 - s) ** 2 * 1.7
        ph = T2 * (s * 1.5 - P['wph']) + gph
        wv = P['wav'] * (0.2 + 0.8 * s) * (np.sin(ph)[:, None] * np.array([0, 1.0, 0.25]) + 0.7 * np.cos(1.3 * ph + 1)[:, None] * np.array([0.15, 0.2, 1.0]))
        d = nrm(gd * stiff + (W[None] * (0.35 + 0.65 * s) * gws[:, None]) + G[None] * (0.5 + 0.5 * s) + wv * 0.55)
        pos = pos + d * (gl / nseg)[:, None]
        dd = vol.sample(pos); off = np.array([HAIR[t]['off'] for t in gt]); bad = dd < off
        if bad.any():
            g = vol.grad(pos[bad]); pos[bad] += g * (off[bad] - dd[bad])[:, None]
        pts.append(pos.copy())
    pts = np.stack(pts, 1)   # (가이드, 마디, 3)
    # 잔가닥: 가이드 둘레에 흩어졌다가 끝으로 갈수록 모임 (다발 느낌) + 가늘게 흔들림
    strands = []; info = []
    sarr = np.linspace(0, 1, nseg + 1)
    for gi in range(len(gp)):
        H = HAIR[gt[gi]]
        for c in range(H['nc']):
            o = rng.normal(0, H['sp'] * S * 0.9, 3); w = rng.normal(0, 1.0, 3) * 0.9; f = rng.uniform(2, 5); p0 = rng.uniform(0, 6.28)
            ln = rng.uniform(0.8, 1.0)
            pp = pts[gi] + o[None] * (1 - 0.72 * sarr)[:, None] + (np.sin(sarr * f * 6.28 + p0)[:, None] * w[None]) * sarr[:, None] * 1.4
            strands.append(pp[: max(4, int(round((nseg + 1) * ln)))]); info.append((gt[gi], gi, c))
    # 잔가닥도 몸 밖으로
    allp = np.concatenate(strands); dd = vol.sample(allp); off = 0.9; bad = dd < off
    if bad.any(): g = vol.grad(allp[bad]); allp[bad] += g * (off - dd[bad])[:, None]
    i = 0
    for k in range(len(strands)): n = len(strands[k]); strands[k] = allp[i:i + n]; i += n
    return strands, info


def hair_render(strands, info, view, Lm, body_depth, vol, seed=9):
    """가닥을 화면에 점으로 흩뿌림 (몸 뒤에 가린 점은 버림) → 털 층 (선형 RGB, 덮임)"""
    ss = view.ss; W = view.W; H = view.H; rng = np.random.default_rng(seed)
    V = view.c; Hh = nrm(Lm + V)
    allP = []; allT = []; allS = []; allC = []; allK = []
    for st, (t, gi, c) in zip(strands, info):
        seg = st[1:] - st[:-1]; n = len(seg)
        sl = np.linalg.norm(seg @ np.array([view.r, view.u]).T, axis=1) * ss
        sub = max(2, int(math.ceil(sl.max() / 0.6)))
        q = np.linspace(0, 1, sub, endpoint=False)
        P = (st[:-1, None, :] + seg[:, None, :] * q[None, :, None]).reshape(-1, 3)
        T = np.repeat(nrm(seg), sub, axis=0)
        s = ((np.arange(n)[:, None] + q[None]) / max(1, len(st) - 1)).reshape(-1)
        allP.append(P); allT.append(T); allS.append(s)
        hue = rng.uniform(0, 6.28); br = rng.uniform(0.62, 1.0) * (0.85 + 0.15 * math.sin(gi * 1.7))
        allC.append(np.full((len(P), 2), (hue, br))); allK.append(np.full(len(P), t))
    P = np.concatenate(allP); T = np.concatenate(allT); s = np.concatenate(allS); C = np.concatenate(allC); tp = np.concatenate(allK)
    xy, dep = view.proj(P)
    ix = np.clip(np.rint(xy[:, 0]).astype(int), 0, W - 1); iy = np.clip(np.rint(xy[:, 1]).astype(int), 0, H - 1)
    vis = dep > body_depth[iy, ix] - 1.2
    P = P[vis]; T = T[vis]; s = s[vis]; C = C[vis]; tp = tp[vis]; xy = xy[vis]
    TL = T @ Lm; TH_ = T @ Hh
    diff = np.sqrt(np.clip(1 - TL * TL, 0, 1)); sinh = np.sqrt(np.clip(1 - TH_ * TH_, 0, 1))
    spec = sinh ** 90 * 0.55 + sinh ** 18 * 0.10
    dbody = vol.sample(P); occ = 0.45 + 0.55 * np.clip(dbody / 12.0, 0, 1)
    occ *= (0.7 + 0.3 * np.clip(s * 3, 0, 1))
    hue = C[:, 0] + s * 4.0
    tint = 1 + 0.07 * np.stack([np.sin(hue), np.sin(hue + 2.1), np.sin(hue + 4.2)], 1)
    alb = np.array([0.86, 0.87, 0.92])[None] * tint * C[:, 1:2]
    sky = SKY_UP * 1.4
    col = alb * (KEY_COL[None] * diff[:, None] * 0.7 + sky[None]) * occ[:, None] + KEY_COL[None] * spec[:, None] * occ[:, None] \
        + np.array([0.07, 0.08, 0.11])[None] * (0.5 + 0.5 * s[:, None])   # 은은한 빛 (마법 털)
    cov = np.array([HAIR[t]['cov'] for t in range(3)])[tp] * (1 - 0.6 * s) * 0.9
    acc_c = np.zeros((W * H, 3)); acc_a = np.zeros(W * H)
    splat(acc_c, acc_a, xy, col, cov, W, H)
    A = 1 - np.exp(-acc_a * 1.6); Cc = acc_c / np.maximum(acc_a, 1e-6)[:, None]
    return Cc.reshape(H, W, 3), A.reshape(H, W)


# ------------------------------------------------------------------ 유니콘 표면 색
def shade_unicorn(vol, P, N, mat, view, Lm, ex, Pp):
    S = HU; K = len(P); V = view.c
    # 털결: 몸 축(x)을 따라 길게 늘인 잔 잡음 + 근육 굴곡
    def fur(Q):
        return 0.55 * NZ(Q[:, 0] / 6.0, Q[:, 1] / 1.3, Q[:, 2] / 1.3) + 0.45 * NZ2(Q[:, 0] / 22.0, Q[:, 1] / 14.0, Q[:, 2] / 14.0)
    e = 0.5; g = np.zeros_like(P); f0 = fur(P)
    for k in range(3):
        o = np.zeros(3); o[k] = e; g[:, k] = (fur(P + o) - f0) / e
    furm = (mat == 1) | (mat == 6)
    Nn = N.copy(); gt = g - (np.sum(g * N, 1))[:, None] * N
    Nn[furm] = nrm(N[furm] - Pp.get('fur', 0.10) * gt[furm])
    # 재질
    alb = np.tile(np.array([0.86, 0.855, 0.84]), (K, 1)) * (0.965 + 0.035 * NZ2(P[:, 0] / 30, P[:, 1] / 30, P[:, 2] / 30))[:, None]
    mc = ex['poll'] * S + 1.1 * (0.525 * ex['hd'] - 0.03 * ex['hn']) * S + ex['shift']
    wm = 1 - sstep(0.045 * S, 0.095 * S, np.linalg.norm(P - mc, axis=1))
    skin = np.array([0.33, 0.28, 0.30]) * (0.85 + 0.3 * NZ(P[:, 0] / 2.5, P[:, 1] / 2.5, P[:, 2] / 2.5))[:, None]
    alb = alb * (1 - wm[:, None]) + skin * wm[:, None]
    ks = np.full(K, 0.10); kp = np.full(K, 18.0); emi = np.zeros((K, 3))
    m = mat == 3; alb[m] = [0.50, 0.47, 0.45]; ks[m] = 0.35; kp[m] = 40
    m = mat == 4; alb[m] = [0.010, 0.009, 0.012]; ks[m] = 3.5; kp[m] = 160; emi[m] = np.array([0.004, 0.012, 0.03]) * Pp['eye']
    m = mat == 2; ks[m] = 0.22; kp[m] = 30
    m = mat == 5
    if m.any():   # 뿔: 상아빛 + 나선 홈 + 진주빛 은은한 빛
        hb = ex['hb'] * S + ex['shift']; ht = ex['htip'] * S + ex['shift']; ax = nrm(ht - hb); L = np.linalg.norm(ht - hb)
        q = P[m] - hb; s = np.clip(q @ ax / L, 0, 1); pr = q - np.outer(q @ ax, ax)
        b1 = nrm(np.cross(ax, [0, 0, 1.0])); b2 = np.cross(ax, b1); th = np.arctan2(pr @ b2, pr @ b1)
        gro = np.sin(th * 2 + s * 2 * math.pi * 4.5)
        Nn[m] = nrm(Nn[m] + 0.35 * gro[:, None] * ax[None])
        alb[m] = np.array([0.93, 0.87, 0.72])[None] * (0.88 + 0.12 * gro[:, None])
        ks[m] = 0.7; kp[m] = 60
        pearl = 0.5 + 0.5 * np.stack([np.sin(s * 9 + th), np.sin(s * 9 + th + 2.1), np.sin(s * 9 + th + 4.2)], 1)
        emi[m] = (np.array([1.0, 0.95, 0.85])[None] * (0.12 + 1.6 * Pp['glow'] * (0.25 + 0.75 * s[:, None] ** 1.5)) + 0.08 * pearl) * (0.8 + 0.2 * gro[:, None])
    ndl = Nn @ Lm
    sh = soft_shadow(vol, P + N * 1.2, Lm, tmax=2.2 * S)
    ao = ambient_occ(vol, P, N, 0.03 * S)
    diff = np.clip((ndl + 0.08) / 1.08, 0, 1) ** 1.25
    sss = np.exp(-((ndl - 0.0) / 0.22) ** 2)[:, None] * np.array([0.14, 0.06, 0.04]) * (0.4 + 0.6 * sh[:, None])
    sky = (SKY_DN[None] * (0.5 - 0.5 * Nn[:, 1:2]) + SKY_UP[None] * (0.5 + 0.5 * Nn[:, 1:2])) * ao[:, None]
    nv = np.clip(Nn @ V, 0, 1)
    rim = ((1 - nv) ** 3.5)[:, None] * np.array([0.55, 0.60, 0.72]) * (0.4 + 0.6 * ao[:, None])
    Hh = nrm(Lm + V); spec = (np.clip(Nn @ Hh, 0, 1) ** kp * ks)[:, None] * KEY_COL[None] * sh[:, None]
    col = alb * (KEY_COL[None] * (diff * sh)[:, None] + sky * 1.05 + sss * KEY_COL[None] * 0.5) + rim * (0.6 + 0.4 * alb) + spec + emi
    return col


def finish_vol(L, A, exposure=1.0, floor=0.85):
    """볼륨(불·바람) 결과: 빛 L(선형·곱한 알파) · 덮임 A → 8비트 RGBA (밝고 얇은 곳은 덮임을 조금 올려 밝기를 살림)"""
    tm = to_srgb(aces(L * exposure)); mx = tm.max(axis=-1)
    a = np.clip(np.maximum(A, floor * mx), 0, 1)
    rgb = np.clip(tm / np.maximum(a, 1e-6)[..., None], 0, 1)
    out = np.zeros(A.shape + (4,), np.uint8); out[..., :3] = (rgb * 255 + 0.5).astype(np.uint8); out[..., 3] = (a * 255 + 0.5).astype(np.uint8)
    return out


def tonemap(lin, exposure=0.82):
    return to_srgb(aces(lin * exposure))


def finish(rgb_lin_prem, A, ss):
    """SS 선형 RGB(곱한 알파) + 알파 → 톤맵 → 내려 뽑기 → 8비트 RGBA"""
    a = np.clip(A, 0, 1)
    col = tonemap(rgb_lin_prem / np.maximum(a, 1e-6)[..., None])
    prem = col * a[..., None]
    prem = downsample(prem, ss); a2 = downsample(a[..., None], ss)[..., 0]
    rgb = prem / np.maximum(a2, 1e-6)[..., None]
    out = np.zeros(a2.shape + (4,), np.uint8)
    out[..., :3] = np.clip(rgb * 255 + 0.5, 0, 255).astype(np.uint8); out[..., 3] = np.clip(a2 * 255 + 0.5, 0, 255).astype(np.uint8)
    return out


def render_unicorn_frame(anim, fi, rows=U_ROWS, ss=2, hair=True):
    P = uni_pose(anim, fi); prims, roots, ex = uni_build(P); S = HU
    vol = build_vol(prims, 1.0, 10.0)
    shift = np.zeros(3); shift[1] = -vol.ground_y()
    if P['anchor'] == 'hind':
        hx = (ex['legs']['HL'][4][0] + ex['legs']['HR'][4][0]) / 2 * S; shift[0] = -0.33 * S - hx
    elif P['anchor'] == 'center':
        b = ex['barrel'] * S; shift[0] = -0.02 * S - b[0]; shift[2] = -b[2]
    vol.lo = vol.lo + shift; ex['shift'] = shift
    strands, sinfo = hair_sim(roots, vol, P, shift) if hair else ([], [])
    spts = np.concatenate(strands) if strands else None
    out = []
    for row in rows:
        M = rot_row(row); Lm = M.T @ LKEY_W
        cs = np.array([[x, y, z] for x in (vol.lo[0], vol.hi[0]) for y in (0.0, vol.hi[1] * 0.75) for z in (vol.lo[2], vol.hi[2])])
        shp = cs - Lm[None] * (cs[:, 1] / Lm[1])[:, None]     # 땅 그림자 자리도 칸에 넣음
        view = View(M, vol.lo, vol.hi, ss, np.vstack([spts, shp]) if spts is not None else shp)
        O, D, W, H = view.rays()
        hit, t = trace(vol, O, D)
        rgb = np.zeros((H * W, 3)); A = np.zeros(H * W); depth = np.full(H * W, -1e9)
        hid = np.nonzero(hit)[0]
        if len(hid):
            Ph = O[hid] + t[hid, None] * D
            Nh = vol.grad(Ph); mat = vol.mat_at(Ph)
            rgb[hid] = shade_unicorn(vol, Ph, Nh, mat, view, Lm, ex, P); A[hid] = 1.0; depth[hid] = Ph @ view.c
        # 땅 그림자 (1배 해상도로 계산해 늘림)
        O1, D1, W1, H1 = view.rays(1)
        tg = -O1[:, 1] / D1[1]; Pg = O1 + tg[:, None] * D1
        near = np.zeros(len(Pg), bool)
        for hq in np.linspace(0, vol.hi[1], 7):   # 빛 쪽으로 올라가며 몸 상자 위를 지나는 땅만
            Pq = Pg + Lm[None] * (hq / Lm[1])
            near |= (Pq[:, 0] > vol.lo[0] - 10) & (Pq[:, 0] < vol.hi[0] + 10) & (Pq[:, 2] > vol.lo[2] - 10) & (Pq[:, 2] < vol.hi[2] + 10)
        sha = np.zeros(H1 * W1)
        if near.any():
            Q = Pg[near] + np.array([0, 0.6, 0]); vis = soft_shadow(vol, Q, Lm, tmax=2.5 * S, k=5.0)
            dq = vol.sample(Q); ct = np.where(dq > vol.margin * 0.9, 1.0, np.clip(dq / (0.05 * S), 0, 1) ** 0.8)
            sha[near] = np.clip(np.maximum(1 - vis, (1 - ct) * 0.85), 0, 1) * 0.55
        sha = cv2.GaussianBlur(sha.reshape(H1, W1).astype(np.float32), (0, 0), 1.2)
        sha = np.repeat(np.repeat(sha, ss, 0), ss, 1).reshape(-1)
        rgb = rgb.reshape(H, W, 3); A = A.reshape(H, W); depth = depth.reshape(H, W); sha = sha.reshape(H, W)
        base_a = A + sha * (1 - A); base_c = rgb * A[..., None]   # 그림자는 검정
        if strands:
            hc, ha = hair_render(strands, sinfo, view, Lm, depth, vol)
            base_c = hc * ha[..., None] + base_c * (1 - ha[..., None]); base_a = ha + base_a * (1 - ha)
        img = finish(base_c, base_a, ss)
        ax, ay = -view.x0, view.y1
        tip = ex['htip'] * S + shift; tx, ty = tip @ view.r, tip @ view.u
        out.append(dict(row=row, img=img, ax=ax, ay=ay, tip=(float(tx), float(-ty))))
    return out


# ================================================================== 정령 4속성 × (정령 · 대정령)
#   뼈대: 떠 있는 상체(가슴·머리·두 팔) + 속성별 아랫몸 (불 = 불기둥 · 물 = 소용돌이 물줄기 · 땅 = 짧은 바위 다리 · 바람 = 회오리 깔때기)
#   그리기: 불·바람 = 볼륨(빛을 내며 흡수하는 매질 · 잡음으로 일렁임) · 물 = 반투명 표면(프레넬 반사·두께에 따른 투명도·속 빛무늬) · 땅 = 불투명 바위 표면 + 틈에서 호박빛
#   단위: 정령 세계 px × RS_N · 대정령 = 1.5배 크기 × RS_G
RS_N = 1.15; RS_G = 0.9
SP_ANIMS = [('idle', 8), ('atk', 6), ('cast', 4)]
SP_ROWS = [1, 2, 3, 5]      # 0 = 2 뒤집기 · 7 = 3 뒤집기 · 4·6 = 5 (등 쪽)
SP_ATK = [  # 오른팔 (어깨 기준 · z는 바깥쪽): 팔꿈치, 손, 앞으로 기울기, 몸 비틀기(도)
    ((-8, 2, 8), (-12, 14, 4), -2, -12), ((-11, 5, 7), (-14, 19, 2), -4, -20), ((9, -2, 2), (24, -2, -6), 3, 10),
    ((15, -1, -2), (33, -1, -10), 7, 22), ((9, -7, 4), (20, -12, 0), 4, 10), ((5, -14, 5), (9, -26, 4), 1, 2)]


def rotY(v, a, c=(0, 0, 0)):
    a = math.radians(a); cc, s = math.cos(a), math.sin(a); v = np.asarray(v, float) - c
    return np.array([v[0] * cc + v[2] * s, v[1], -v[0] * s + v[2] * cc]) + c


def sp_skel(el, pose, fi):
    E = el == 'earth'; nf = dict(SP_ANIMS)[pose]; ph = 2 * math.pi * fi / nf
    bob = 0.0 if E else (2.2 if pose == 'idle' else 1.0) * math.sin(ph)
    if E: W = (0, 44, 0); C = (0, 68, 0); Nk = (2, 82, 0); Hd = (5, 90, 0); sy = 79; sw = 23; k = 1.25
    else: W = (0, 56, 0); C = (0, 77, 0); Nk = (0.5, 92, 0); Hd = (1.5, 103, 0); sy = 87; sw = 17; k = 1.0
    lean = 0.0; tw = 0.0; up = 0.0
    if pose == 'idle':
        s1, c1 = math.sin(ph), math.cos(ph)
        eR = (3 + c1, -18 * k, 5); hR = (6 + 1.5 * c1, -34 * k + 1.2 * s1, 6 * k); eL = (3 - c1, -18 * k, 5); hL = (6 - 1.5 * c1, -34 * k - 1.2 * s1, 6 * k)
        tw = 3 * s1
    elif pose == 'atk':
        e_, h_, lean, tw = SP_ATK[fi]; eR = tuple(np.array(e_) * k); hR = tuple(np.array(h_) * k)
        g = [0.6, 0.8, 0.2, 0.0, 0.3, 0.6][fi]
        eL = (5 - 6 * g, -14 * k, 6 + 2 * g); hL = (11 - 10 * g, -24 * k + 4 * g, 2 + 4 * g)
    else:   # cast: 두 손을 머리 위 앞으로 모음 (4장 맥동)
        s1 = math.sin(ph); up = 2.0
        eR = (5, 10 * k, 6); hR = (8 + 2 * s1, 28 * k + 2 * math.cos(ph), -4); eL = (5, 10 * k, 6); hL = (8 + 2 * s1, 28 * k + 2 * math.cos(ph), -4)
        lean = -2
    J = dict(W=np.array(W, float), C=np.array(C, float), N=np.array(Nk, float), H=np.array(Hd, float) + (lean * 0.3, up, 0))
    for sd, sg, e_, h_ in (('R', 1, eR, hR), ('L', -1, eL, hL)):
        S0 = np.array([0, sy, sg * sw], float); J['S' + sd] = S0
        J['E' + sd] = S0 + np.array([e_[0], e_[1], sg * e_[2]]); J['A' + sd] = S0 + np.array([h_[0], h_[1], sg * h_[2]])
    yW = J['W'][1]
    for key in ('C', 'N', 'H', 'SR', 'SL', 'ER', 'EL', 'AR', 'AL'):
        v = rotY(J[key], tw, (0, 0, 0)); f = max(0.0, (v[1] - yW) / (J['H'][1] - yW + 1e-6)); v[0] += lean * f; J[key] = v
    for key in J: J[key] = J[key] + np.array([0, bob, 0])
    if E:   # 다리 (몸무게 옮김)
        s1 = math.sin(ph) if pose == 'idle' else 0.0; st = 4.0 if pose == 'atk' and fi in (2, 3) else 0.0
        for sd, sg in (('R', 1), ('L', -1)):
            J['P' + sd] = np.array([0, 42, sg * 10.0]); J['K' + sd] = np.array([4 + st * (sg > 0), 23 + s1 * sg * 0.8, sg * 12.5]); J['F' + sd] = np.array([2 + st * 1.5 * (sg > 0), 6, sg * 13.5])
    J['bob'] = bob; J['k'] = k
    return J


def sp_humanoid(J, S, el, mat=1, fat=1.0, k=4.0):
    """상체 SDF 도형 (가슴·허리·목·머리·어깨·팔·주먹)"""
    pr = []; f = fat
    T = lambda v: np.asarray(v) * S
    pr.append(P_ell(T(J['C']), np.eye(3), np.array([13.5, 15, 10.5]) * f * S, mat, k * S))
    pr.append(P_cone(T(J['C']), T(J['W']), 12 * f * S, 8.5 * f * S, mat, k * S))
    pr.append(P_cone(T(J['C'] + (0, 8, 0)), T(J['N']), 6 * f * S, 4.5 * f * S, mat, k * S))
    pr.append(P_ell(T(J['H']), np.eye(3), np.array([8.5, 10.5, 8.5]) * S * (1.0 if el != 'earth' else 1.05), mat, 3.0 * S))
    for sd in 'RL':
        pr.append(P_sph(T(J['S' + sd]), 7.0 * f * S, mat, k * S))
        pr.append(P_cone(T(J['S' + sd]), T(J['E' + sd]), 6.2 * f * S, 4.8 * f * S, mat, 2.5 * S))
        pr.append(P_cone(T(J['E' + sd]), T(J['A' + sd]), 4.8 * f * S, 4.2 * f * S, mat, 2.0 * S))
        pr.append(P_sph(T(J['A' + sd]), 5.6 * f * S, mat, 2.0 * S))
    return pr


def vol_integrate(G, fn, view, step, seed=0):
    """앞에서 뒤로 볼륨 쌓기: fn(P) → (흡수 σ, 빛 색 C)"""
    O, D, W, H = view.rays(1); N = len(O); tmin, tmax = box_t(O, D, G.lo, G.hi)
    rng = np.random.default_rng(seed); t = tmin + rng.random(N) * step
    L = np.zeros((N, 3)); Tr = np.ones(N); idx = np.nonzero(tmax > tmin)[0]
    while len(idx):
        P = O[idx] + t[idx, None] * D
        sig, C = fn(P)
        a = 1 - np.exp(-sig * step)
        L[idx] += (Tr[idx] * a)[:, None] * C
        Tr[idx] *= 1 - a
        t[idx] += step
        idx = idx[(t[idx] < tmax[idx]) & (Tr[idx] > 0.004)]
    return L.reshape(H, W, 3), (1 - Tr).reshape(H, W)


def loop_noise(nz, X, Y, Z, sc, vel, ph, oct=4, sy=1.0):
    """위로 흐르는 잡음을 한 바퀴(ph 0→1)에 끊김 없이 (두 시점을 섞음)"""
    a = fbm(nz, X / sc, (Y - vel * ph) / (sc * sy), Z / sc, oct); b = fbm(nz, X / sc, (Y - vel * (ph - 1)) / (sc * sy), Z / sc, oct)
    w = ph; return (a * (1 - w) + b * w) / math.sqrt((1 - w) ** 2 + w ** 2)


def grid_xyz(G):
    X = (G.lo[0] + np.arange(G.n[0]) * G.h).astype(np.float32)[:, None, None]
    Y = (G.lo[1] + np.arange(G.n[1]) * G.h).astype(np.float32)[None, :, None]
    Z = (G.lo[2] + np.arange(G.n[2]) * G.h).astype(np.float32)[None, None, :]
    return X, Y, Z


def crop_grid(G, arr, thr):
    m = arr > thr
    if not m.any(): return G, arr
    idx = [np.nonzero(m.any(axis=tuple(j for j in range(3) if j != i)))[0] for i in range(3)]
    i0 = [max(0, ix[0] - 2) for ix in idx]; i1 = [min(G.n[i], ix[-1] + 3) for i, ix in enumerate(idx)]
    sl = tuple(slice(a, b) for a, b in zip(i0, i1)); arr = np.ascontiguousarray(arr[sl])
    G2 = Vol(G.lo + np.array(i0) * G.h, G.lo + (np.array(i1) - 1) * G.h, G.h, 0); G2.d = arr; G2.n = arr.shape; G2.lo = G.lo + np.array(i0) * G.h
    return G2, arr


FIRE_RAMP = np.array([[0.0, 0.02, 0.01, 0.0], [0.12, 0.35, 0.03, 0.005], [0.3, 1.1, 0.16, 0.02], [0.5, 2.2, 0.62, 0.08], [0.7, 3.4, 1.7, 0.35], [0.86, 5.0, 3.6, 1.4], [1.0, 7.0, 6.2, 4.4]])


def fire_col(T):
    r = np.interp(T, FIRE_RAMP[:, 0], FIRE_RAMP[:, 1]); g = np.interp(T, FIRE_RAMP[:, 0], FIRE_RAMP[:, 2]); b = np.interp(T, FIRE_RAMP[:, 0], FIRE_RAMP[:, 3])
    return np.stack([r, g, b], -1)


def spirit_fields_fire(J, S, great, pose, fi):
    pr = sp_humanoid(J, S, 'fire', fat=1.12, k=5.0)
    T_ = lambda v: np.asarray(v) * S
    pr.append(P_cone(T_(J['W']), T_(J['W'] * (0.3, 0, 0.3) + (0, 12, 0)), 11 * S, 2.5 * S, 1, 6 * S))     # 아랫몸 불기둥
    pr.append(P_sph(T_(J['H'] + (-2, 7, 0)), 5.5 * S, 1, 3 * S))                                            # 머리 위 불꽃 머리칼 뿌리
    if great:
        for a in range(7):   # 불꽃 왕관
            an = a / 7 * 2 * math.pi; pr.append(P_sph(T_(J['H'] + (math.cos(an) * 6, 8, math.sin(an) * 6)), 3.2 * S, 1, 2 * S))
        for sg in (1, -1):   # 불꽃 날개 (등 뒤 어깨에서 위·옆으로 솟는 불기둥 다발)
            for q in range(5):
                c = J['C'] + (-9 - q * 1.5, 12 + q * 6, sg * (16 + q * 6)); pr.append(P_sph(T_(c), (5.5 - q * 0.6) * S, 1, 5 * S))
    G = build_vol(pr, 0.95 * S, 34 * S)
    X, Y, Z = grid_xyz(G); h = G.h
    F = G.d
    nf = dict(SP_ANIMS)[pose]; ph = fi / nf if pose == 'idle' else (fi + 0.5) / nf * 0.6
    # 몸: 또렷한 사람 꼴 (속은 뜨겁고 가장자리는 붉게) · 속에 흐르는 녹은 무늬
    n_in = loop_noise(NZ2, X, Y, Z, 6 * S, 40 * S, ph, 3, sy=1.3)
    core = sstep(1.5 * S, -4.5 * S, F + 1.6 * S * n_in)
    # 불꽃 혀: 몸에서 위로 새는 거리(e) + 세로로 늘인 잡음 → 어깨·머리·팔에서 위로 날리는 불꽃
    c = 0.22
    yi = np.arange(G.n[1], dtype=np.float32)[None, :, None] * h
    e = np.minimum.accumulate(F - c * yi, axis=1) + c * yi
    tur = loop_noise(NZ3, X, Y, Z, 6.5 * S, 85 * S, ph, 5, sy=3.0)
    tf = loop_noise(NZ, X, Y, Z, 2.6 * S, 85 * S, ph, 3, sy=2.4)      # 잔불꽃 (표면에서 핥아 오르는 작은 혀)
    above = np.clip((e - F) / (-c * 30 * S) + 1, 0, 1)   # 몸에서 위로 멀어질수록 0
    fl = sstep(5 * S, -2.5 * S, e + 13 * S * tur + 3 * S * tf) * (0.3 + 0.7 * sstep(-0.25, 0.5, tur + 0.2))
    Tm = np.maximum(core * (0.66 + 0.28 * n_in + 0.08 * tf), fl * (0.6 + 0.22 * tur)) * (0.85 + 0.15 * above)
    # 가슴 속 녹은 핵 · 머리는 조금 식혀 눈이 보이게 · 흰 눈 · 주먹
    def blob(c, r): return np.exp(-(((X - c[0] * S) ** 2 + (Y - c[1] * S) ** 2 + (Z - c[2] * S) ** 2) / (r * S) ** 2))
    Tm = Tm + 0.22 * blob(J['C'] + (3, 0, 0), 8)
    hd = J['H']; Tm = Tm - 0.28 * blob(hd + (4, 0.5, 0), 6.5)
    for sg in (1, -1): Tm = Tm + 1.3 * blob(hd + (7.8, 0.5, sg * 3.6), 1.8)
    for sd in 'RL': Tm = Tm + 0.18 * blob(J['A' + sd], 5)
    Tm = np.clip(Tm, 0, 1.2).astype(np.float32)
    G, Tm = crop_grid(G, Tm, 0.03)
    return G, Tm


def spirit_fields_wind(J, S, great, pose, fi):
    pr = sp_humanoid(J, S, 'wind', fat=0.95, k=4.0)
    G = build_vol(pr, 1.0, 20 * S)
    lo = G.lo.copy(); hi = G.hi.copy(); lo[1] = -2 * S; lo[0] = min(lo[0], -36 * S); lo[2] = min(lo[2], -36 * S); hi[0] = max(hi[0], 36 * S); hi[2] = max(hi[2], 36 * S)
    if great: lo[0] = min(lo[0], -54 * S); lo[2] = min(lo[2], -54 * S); hi[0] = max(hi[0], 54 * S); hi[2] = max(hi[2], 54 * S)
    G2 = Vol(lo, hi, 0.8 * S, 20 * S)
    for p in pr: G2.add(p)
    X, Y, Z = grid_xyz(G2); F = G2.d; nf = dict(SP_ANIMS)[pose]; ph = fi / nf if pose == 'idle' else (fi + 0.5) / nf * 0.5
    W = J['W'] * S; R = np.sqrt((X - W[0] * 0.3) ** 2 + (Z - W[2] * 0.3) ** 2); th = np.arctan2(Z, X)
    n1 = fbm(NZ2, X / (10 * S), Y / (10 * S), Z / (10 * S), 3); n2 = fbm(NZ, X / (3 * S), Y / (3 * S), Z / (3 * S), 2)
    def streak(kk, tw, rot, sharp):
        s = np.sin(kk * th + Y * tw / S - rot + 2.4 * n1 + 0.5 * n2); return np.clip(s, 0, 1) ** sharp
    rot = 2 * math.pi * ph * 2   # 한 바퀴에 줄무늬 2칸 돌기
    # 상체: 표면 껍질에 감기는 가는 바람 줄기 + 아주 옅은 속 공기
    shell = np.exp(-((F + 0.8 * S) / (1.7 * S)) ** 2) * (0.15 + 0.85 * streak(7, 0.36, rot, 7)) + 0.10 * np.exp(-((F + 4 * S) / (3.5 * S)) ** 2)
    # 아랫몸: 깔때기 회오리 (아래가 가늘고 위가 넓음) · 여러 겹
    yy = Y / S; rr = 2.5 + np.clip(yy / 58, 0, 1.2) ** 1.4 * (17 if not great else 19); wf = 1.6 + yy * 0.04
    fun = (np.exp(-((R / S - rr) / wf) ** 2) * (0.1 + 0.9 * streak(5, -0.24, rot * 1.25, 8)) + np.exp(-((R / S - rr * 0.6) / wf) ** 2) * 0.6 * streak(4, -0.3, rot * 1.6, 8)) * (yy < 64) * np.clip(yy / 4, 0, 1)
    D = shell + fun * 1.0
    if great:   # 폭풍 고리 (어깨 높이)
        cy = J['C'][1] + 6; ring = np.exp(-(((R / S - 34) / 5.0) ** 2 + ((yy - cy) / 4.0) ** 2)) * (0.15 + 0.85 * streak(7, 0.0, rot * 0.8, 5))
        D = D + ring * 1.1
    # 희미한 가면 (머리 앞쪽) + 눈 구멍
    hd = J['H'] * S
    def blob(c, r): return np.exp(-(((X - c[0]) ** 2 + (Y - c[1]) ** 2 + (Z - c[2]) ** 2) / (r * S) ** 2))
    mask = np.exp(-((F + 0.6 * S) / (1.4 * S)) ** 2) * ((X - hd[0]) > 2 * S) * blob(hd, 9)
    D = D + mask * 1.4
    for sg in (1, -1): D = D - 1.6 * blob(hd + np.array([7.5, 0.5, sg * 3.5]) * S, 1.9)
    D = np.clip(D, 0, 2).astype(np.float32)
    G2, D = crop_grid(G2, D, 0.02)
    return G2, D


def render_fire_view(G, Tm, view, S):
    def fn(P):
        T = G.sample(P, Tm); sig = 0.2 / S * sstep(0.04, 0.5, T)
        return sig, fire_col(np.clip(T, 0, 1)) * 0.5
    L, A = vol_integrate(G, fn, view, 0.6 * S)
    return finish_vol(L, A, 1.0, 0.8)


def render_wind_view(G, D, view, S):
    def fn(P):
        d = G.sample(P, D); sig = d * 0.2 / S
        w = np.clip(d, 0, 1.2)[:, None] / 1.2   # 진한 줄기일수록 밝은 민트 · 옅은 곳은 짙은 청록 (밝은 바닥에서도 보이게)
        C = np.array([0.04, 0.24, 0.18])[None] * (1 - w) + np.array([0.70, 1.30, 0.92])[None] * w
        return sig, C
    L, A = vol_integrate(G, fn, view, 0.55 * S)
    return finish_vol(L, A, 1.0, 0.6)


# ----- 물: 반투명 표면
def spirit_sdf_water(J, S, great, pose, fi):
    pr = sp_humanoid(J, S, 'water', fat=0.95, k=6.0)
    T_ = lambda v: np.asarray(v) * S
    nf = dict(SP_ANIMS)[pose]; ph = fi / nf if pose == 'idle' else (fi + 0.5) / nf * 0.5; rot = 2 * math.pi * ph
    # 아랫몸: 꼬이며 내려가는 물줄기 (구슬을 나선으로)
    W = J['W']; n = 14; hp = []
    for i in range(n):
        q = i / (n - 1); y = W[1] * (1 - q) + 5 * q; rad = 11.5 * (1 - q) ** 0.8 + 3.6 * q; hr = 1.0 + 6.5 * q ** 1.3
        a = rot + q * 4.5; hp.append(((W[0] * (1 - q) + math.cos(a) * hr, y, W[2] * (1 - q) + math.sin(a) * hr), rad))
    for (c0, r0), (c1, r1) in zip(hp[:-1], hp[1:]): pr.append(P_cone(T_(c0), T_(c1), r0 * S, r1 * S, 1, 4 * S))   # 꼬이며 내려가는 물줄기
    for i in range(12):   # 땅의 물웅덩이 고리 (물마루)
        a = i / 12 * 2 * math.pi + rot * 0.5; a2 = a + 2 * math.pi / 12
        p0 = (math.cos(a) * 11, 2.2 + 1.4 * math.sin(a * 3 + rot * 2), math.sin(a) * 11); p1 = (math.cos(a2) * 11, 2.2 + 1.4 * math.sin(a2 * 3 + rot * 2), math.sin(a2) * 11)
        pr.append(P_cone(T_(p0), T_(p1), 3.4 * S, 3.4 * S, 1, 3 * S))
    hd = J['H']   # 뒤로 흐르는 물결 머리칼 (한 줄기)
    p0 = hd + (-4, 6, 0); p1 = hd + (-13, 1 + 2 * math.sin(rot), 0); p2 = hd + (-17, -12 + 2 * math.sin(rot + 1), 0); p3 = hd + (-13, -22 + 2 * math.sin(rot + 2), 0)
    pr.append(P_conez(T_(p0), T_(p1), 5.0 * S, 4.0 * S, 1.6, 1, 3 * S)); pr.append(P_conez(T_(p1), T_(p2), 4.0 * S, 2.6 * S, 1.6, 1, 2 * S)); pr.append(P_cone(T_(p2), T_(p3), 2.6 * S, 1.0 * S, 1, 2 * S))
    if great:
        for a in range(7):   # 얼음 왕관
            an = (a - 3) / 6 * math.pi * 0.9; d = np.array([math.cos(an) * 0.35 + 0.2, 1.0, math.sin(an) * 0.6]); b = hd + (math.cos(an) * 5, 7, math.sin(an) * 7)
            pr.append(P_cone(T_(b), T_(b + d / np.linalg.norm(d) * (9 + 4 * (a % 2 == 1) + 3 * (a == 3))), 1.8 * S, 0.3 * S, 2, 0.6 * S))
        for sg in (1, -1):   # 어깨 얼음 · 물결 망토
            s0 = J['S' + ('R' if sg > 0 else 'L')]
            for q in range(3): pr.append(P_cone(T_(s0 + (q * 2 - 3, 4, sg * 2)), T_(s0 + (q * 3 - 6, 12 + q * 2, sg * (6 + q * 2))), 2.2 * S, 0.3 * S, 2, 0.6 * S))
            pr.append(P_ell(T_(J['C'] + (-9, -8, sg * 9)), frame_from((-0.25, -1, sg * 0.3), (-1, 0, 0)), np.array([30, 2.2, 9]) * S, 1, 5 * S))
    G = build_vol(pr, 1.0, 8 * S)
    X, Y, Z = grid_xyz(G)
    rip = loop_noise(NZ2, X, Y, Z, 7 * S, -40 * S, ph, 2, sy=0.6)
    G.d = (G.d + (0.45 * S) * rip * (G.m == 1)).astype(np.float32)
    return G


def render_water_view(G, view, S, Lm):
    O, D, W, H = view.rays(view.ss); hit, t = trace(G, O, D)
    hid = np.nonzero(hit)[0]; rgbA = np.zeros((H * W, 3)); A = np.zeros(H * W)
    if len(hid):
        P = O[hid] + t[hid, None] * D; N = G.grad(P); mat = G.mat_at(P); V = view.c
        # 두께: 안쪽으로 들어가 나올 때까지
        inside = P + D * (1.5 * G.h); th = np.zeros(len(P)); tt = np.zeros(len(P)); idx = np.arange(len(P))
        for it in range(48):
            if not len(idx): break
            Q = inside[idx] + tt[idx, None] * D; d = -G.sample(Q); tt[idx] += np.maximum(d * 0.9, 0.5 * G.h)
            idx = idx[(d > 0.05) & (tt[idx] < 90 * S)]
        th = tt + 1.5 * G.h
        nv = np.clip(N @ V, 0, 1); F = 0.03 + 0.97 * (1 - nv) ** 5
        R = 2 * (N @ V)[:, None] * N - V[None]   # 반사 방향
        sky = np.where(R[:, 1:2] > 0, np.array([0.38, 0.62, 1.05])[None] * (0.6 + 0.6 * R[:, 1:2]), np.array([0.05, 0.12, 0.22])[None])
        Hh = nrm(Lm + V); spec = np.clip(N @ Hh, 0, 1) ** 220 * 9.0 + np.clip(N @ Hh, 0, 1) ** 30 * 0.35
        # 굴절된 자리의 빛무늬 (물속 일렁이는 빛)
        Pr = P + (D * 0.7 - N * 0.5) * th[:, None] * 0.5
        cn = NZ(Pr[:, 0] / (5 * S), Pr[:, 1] / (5 * S), Pr[:, 2] / (5 * S)); cau = np.clip(1 - np.abs(cn) * 6, 0, 1) ** 3
        cn2 = NZ2(Pr[:, 0] / (2.5 * S), Pr[:, 1] / (2.5 * S), Pr[:, 2] / (2.5 * S)); bub = np.clip(cn2 - 0.62, 0, 1) * 6
        absorb = 1 - np.exp(-th / (34 * S))
        sca = np.array([0.02, 0.30, 0.80])[None] * (0.5 + 0.8 * np.clip(N @ Lm, 0, 1))[:, None] + np.array([0.45, 1.0, 1.4])[None] * (cau * 1.1 + bub * 0.5)[:, None]
        rimc = np.array([0.45, 0.85, 1.2])[None] * ((1 - nv) ** 2.5)[:, None] * 0.9
        col = sky * F[:, None] + (sca * (0.4 + 0.6 * absorb[:, None]) + rimc) * (1 - F[:, None]) + spec[:, None] * np.array([1.0, 1.0, 1.0])[None]
        a = np.clip(F + (1 - F) * (0.30 + 0.5 * absorb + 0.35 * (1 - nv) ** 2) + 0.4 * np.clip(spec, 0, 1), 0, 1)
        ice = mat == 2
        if ice.any():
            ndl = np.clip(N[ice] @ Lm, 0, 1); col[ice] = np.array([0.55, 0.85, 1.05])[None] * (0.35 + 0.9 * ndl[:, None]) + np.array([0.6, 0.9, 1.0])[None] * (1 - nv[ice, None]) ** 2 * 0.8 + spec[ice, None]
            a[ice] = 0.92
        rgbA[hid] = col * a[:, None]; A[hid] = a
    rgbA = rgbA.reshape(H, W, 3); A = A.reshape(H, W)
    return finish(rgbA, A, view.ss)


# ----- 땅: 바위 거인
def spirit_sdf_earth(J, S, great, pose, fi):
    pr = []; T_ = lambda v: np.asarray(v) * S
    rng = np.random.default_rng(77 + (1 if great else 0))
    def rock(c, r, k=1.5, mat=1, ax=None):
        rr = np.array(r) * (0.9 + 0.2 * rng.random(3)); R = frame_from(ax if ax is not None else rng.normal(0, 1, 3), rng.normal(0, 1, 3))
        pr.append(P_ell(T_(c), R, rr * S, mat, k * S))
    C = J['C']; Wp = J['W']; H = J['H']
    rock(C + (0, 2, 0), (17, 14, 13), 3.5); rock(C + (2, -6, 0), (14, 11, 12), 3.5); rock((C + Wp) / 2, (12, 10, 11), 3.5); rock(Wp + (0, 2, 0), (12, 8, 11), 3.5)
    rock(C + (3, 6, 7), (9, 7, 7), 2.5); rock(C + (3, 6, -7), (9, 7, 7), 2.5); rock(C + (-5, 8, 0), (10, 8, 11), 3)
    rock(H, (7.5, 7, 7.5), 1.6); rock(H + (2, 3, 0), (5, 3, 6.5), 1.2, ax=(1, 0, 0))   # 머리 · 눈썹 바위
    for sd in 'RL':
        s, e, a = J['S' + sd], J['E' + sd], J['A' + sd]
        rock(s + (0, 2, 0), (11.5, 9.5, 10.5), 3)
        for q in (0.15, 0.5, 0.85): rock(s + (e - s) * q, (6.5, 6.8, 6.8), 2.2, ax=e - s)
        for q in (0.15, 0.5, 0.85): rock(e + (a - e) * q, (6.2, 6.4, 6.4), 2.2, ax=a - e)
        rock(a, (8.5, 8, 8), 2)
        if 'P' + sd in J:
            p, k_, f = J['P' + sd], J['K' + sd], J['F' + sd]
            rock((p + k_) / 2, (8.5, 11, 8.5), 2.6, ax=k_ - p); rock((k_ + f) / 2, (7.5, 10, 7.5), 2.6, ax=f - k_); rock(f + (2, -1, 0), (9.5, 5, 7.5), 2, ax=(1, 0, 0))
    # 어깨 호박 수정 · 대정령: 등 수정 가시 · 수정 왕관
    for sd, sg in (('R', 1), ('L', -1)):
        s = J['S' + sd]
        for q in range(2 if not great else 4):
            d = nrm(np.array([-0.3 - 0.15 * q, 1.0, sg * (0.5 + 0.2 * q)])); b = s + (-2 - 2 * q, 6, sg * (2 + q))
            pr.append(P_cone(T_(b), T_(b + d * (8 + 4 * great + 2 * (q % 2))), 2.6 * S, 0.4 * S, 2, 0.8 * S))
    if great:
        for q in range(5):
            b = C + (-11, 4 + q * 3, (q - 2) * 5); d = nrm(np.array([-1.0, 0.8 + 0.1 * q, (q - 2) * 0.35]))
            pr.append(P_cone(T_(b), T_(b + d * (15 + 4 * (q == 2))), 3.4 * S, 0.5 * S, 2, 1.0 * S))
        for q in range(5):
            an = (q - 2) * 0.5; b = H + (math.cos(an) * 3, 6, math.sin(an) * 6); d = nrm(np.array([0.2, 1.0, math.sin(an) * 0.5]))
            pr.append(P_cone(T_(b), T_(b + d * (7 + 3 * (q == 2))), 1.8 * S, 0.3 * S, 2, 0.6 * S))
    G = build_vol(pr, 1.0, 8 * S)
    X, Y, Z = grid_xyz(G)
    rk = fbm(NZ, X / (7 * S), Y / (7 * S), Z / (7 * S), 4)
    rg = 1 - np.abs(fbm(NZ2, X / (4 * S), Y / (4 * S), Z / (4 * S), 3))   # 날 선 능선 (각진 바위)
    G.d = (G.d + ((2.0 * S) * rk - (1.1 * S) * rg ** 3) * (G.m == 1)).astype(np.float32)
    return G


def render_earth_view(G, view, S, Lm, glow=1.0):
    O, D, W, H = view.rays(view.ss); hit, t = trace(G, O, D)
    hid = np.nonzero(hit)[0]; rgbA = np.zeros((H * W, 3)); A = np.zeros(H * W)
    if len(hid):
        P = O[hid] + t[hid, None] * D; N = G.grad(P); mat = G.mat_at(P); V = view.c
        ndl = N @ Lm; sh = soft_shadow(G, P + N * 1.2, Lm, tmax=60 * S, k=8); ao = ambient_occ(G, P, N, 2.2 * S, 5, 1.3)
        n1 = NZ(P[:, 0] / (9 * S), P[:, 1] / (9 * S), P[:, 2] / (9 * S)); n2 = NZ2(P[:, 0] / (3 * S), P[:, 1] / (3 * S), P[:, 2] / (3 * S))
        alb = np.array([0.34, 0.25, 0.17])[None] * (0.75 + 0.35 * n1[:, None]) + np.array([0.08, 0.07, 0.06])[None] * n2[:, None]
        top = np.clip(N[:, 1], 0, 1) ** 2; alb = alb * (1 - 0.35 * top[:, None]) + np.array([0.46, 0.38, 0.26])[None] * 0.35 * top[:, None]   # 위쪽은 먼지 낀 밝은 흙
        diff = np.clip(ndl, 0, 1)
        sky = (SKY_DN[None] * (0.5 - 0.5 * N[:, 1:2]) + SKY_UP[None] * (0.5 + 0.5 * N[:, 1:2])) * ao[:, None]
        rim = ((1 - np.clip(N @ V, 0, 1)) ** 3)[:, None] * np.array([0.25, 0.22, 0.2])
        col = alb * (KEY_COL[None] * (diff * sh)[:, None] * 0.95 + sky * 1.3) + rim * ao[:, None]
        # 틈에서 새는 호박빛 (깊은 틈 = 어두운 곳) + 갈라진 금
        cr = np.abs(fbm(NZ3, P[:, 0] / (8 * S), P[:, 1] / (8 * S), P[:, 2] / (8 * S), 3)); crack = np.clip(1 - cr / 0.035, 0, 1) ** 2
        gap = np.clip((0.56 - ao) / 0.3, 0, 1) ** 1.8
        hot = (gap * 0.75 + crack * 0.7) * glow
        col = col * (1 - 0.7 * np.clip(hot, 0, 1)[:, None]) + hot[:, None] * np.array([2.3, 0.62, 0.06])[None]
        cry = mat == 2
        if cry.any():
            Hh = nrm(Lm + V); sp = np.clip(N[cry] @ Hh, 0, 1) ** 60 * 4
            col[cry] = np.array([1.6, 0.85, 0.18])[None] * (0.45 + 0.7 * np.clip(ndl[cry], 0, 1))[:, None] + np.array([1.4, 0.9, 0.35])[None] * ((1 - np.clip(N[cry] @ V, 0, 1)) ** 2)[:, None] + sp[:, None] + np.array([0.6, 0.25, 0.03])[None] * glow
        rgbA[hid] = col; A[hid] = 1
    return finish(rgbA.reshape(H, W, 3), A.reshape(H, W), view.ss)


def render_spirit_frame(el, great, pose, fi, rows=SP_ROWS, ss=2):
    S = (1.5 * RS_G) if great else RS_N
    J = sp_skel(el, pose, fi)
    out = []
    if el == 'fire': G, F = spirit_fields_fire(J, S, great, pose, fi)
    elif el == 'wind': G, F = spirit_fields_wind(J, S, great, pose, fi)
    elif el == 'water': G = spirit_sdf_water(J, S, great, pose, fi)
    else: G = spirit_sdf_earth(J, S, great, pose, fi)
    for row in rows:
        M = rot_row(row); Lm = M.T @ LKEY_W
        view = View(M, G.lo, G.hi, ss if el in ('water', 'earth') else 1, None, 3)
        if el == 'fire': img = render_fire_view(G, F, view, S)
        elif el == 'wind': img = render_wind_view(G, F, view, S)
        elif el == 'water': img = render_water_view(G, view, S, Lm)
        else: img = render_earth_view(G, view, S, Lm, 1.0 + (0.4 if pose == 'cast' else 0))
        hp = J['H'] * S; hx, hy = hp @ view.r, hp @ view.u
        out.append(dict(row=row, img=img, ax=-view.x0, ay=view.y1, tip=(float(hx), float(-hy))))
    return out


# ================================================================== 오로라 (방향 없는 2D 빛 · 8장 반복 · 절반 해상도 · 게임에서 더하기 합성으로 몸 뒤에)
AU_RS = 0.5; AU_N = 8


def _aura_grid(x0, x1, y0, y1):
    xs = (np.arange(int((x1 - x0) * AU_RS)) + 0.5) / AU_RS + x0; ys = (np.arange(int((y1 - y0) * AU_RS)) + 0.5) / AU_RS + y0
    return xs[None, :], ys[:, None]


def _loop2(nz, x, y, sc, vy, ph, oct=3, sy=1.0, z=0.0):
    a = fbm(nz, x / sc, (y + vy * ph) / (sc * sy), np.full_like(x + y, z), oct); b = fbm(nz, x / sc, (y + vy * (ph - 1)) / (sc * sy), np.full_like(x + y, z + 0.0), oct)
    return (a * (1 - ph) + b * ph) / math.sqrt((1 - ph) ** 2 + ph ** 2)


def _aura_img(I, C):
    out = np.zeros(I.shape + (4,), np.uint8); a = np.clip(I, 0, 1)
    out[..., :3] = np.clip(C * 255 + 0.5, 0, 255).astype(np.uint8); out[..., 3] = (a * 255 + 0.5).astype(np.uint8); return out


def _dots(shape, pts, rad, val):
    """작은 빛 알갱이 (가우스 점)"""
    H, W = shape; I = np.zeros(shape, np.float32)
    for (x, y), r, v in zip(pts, rad, val):
        x0, x1 = int(max(0, x - 3 * r)), int(min(W, x + 3 * r + 1)); y0, y1 = int(max(0, y - 3 * r)), int(min(H, y + 3 * r + 1))
        if x1 <= x0 or y1 <= y0: continue
        xx = np.arange(x0, x1)[None, :]; yy = np.arange(y0, y1)[:, None]; I[y0:y1, x0:x1] += v * np.exp(-((xx - x) ** 2 + (yy - y) ** 2) / (2 * r * r))
    return I


def aura_frames(kind):
    rng = np.random.default_rng({'u': 1, 'fire': 2, 'water': 3, 'earth': 4, 'wind': 5}[kind]); out = []
    if kind == 'u': x0, x1, y0, y1 = -160, 160, -215, 45
    else: x0, x1, y0, y1 = -125, 125, -300, 40
    X, Y = _aura_grid(x0, x1, y0, y1); H, W = Y.shape[0], X.shape[1]
    nm = 30 if kind in ('u', 'earth') else 18
    mo = [(rng.uniform(-1, 1), rng.uniform(0, 1), rng.uniform(0.6, 1.4), rng.uniform(0, 6.28)) for _ in range(nm)]
    for fi in range(AU_N):
        ph = fi / AU_N; T2 = 2 * math.pi; pu = 0.88 + 0.12 * math.sin(T2 * ph)
        if kind == 'u':
            Rx, Ry, Hc = 112.0, 46.0, 175.0; I = np.zeros((H, W)); col = np.zeros((H, W, 3))
            cth = np.clip(X / Rx, -1, 1); inside = np.abs(X) < Rx
            for sg in (1, -1):   # 뒤(sg -1)·앞 커튼
                sth = sg * np.sqrt(1 - cth ** 2); th = np.arctan2(sth, cth); by = Ry * sth - 6; h = by - Y
                thw = th + 0.28 * np.sin(2 * th + T2 * ph) + 0.12 * np.sin(5 * th - T2 * ph * 2)
                ray = 0.35 + 0.65 * np.sin(thw * 7 + 1.7 * _loop2(NZ2, X, np.zeros_like(Y) + 0 * X, 40, 0, ph, 2)) ** 2
                fine = 0.7 + 0.3 * np.sin(thw * 31 + 3 * np.sin(thw * 5 + T2 * ph))
                Hv = Hc * (0.45 + 0.4 * (0.5 + 0.5 * np.sin(thw * 3 + 1.3 + T2 * ph)))   # 커튼 높이가 들쭉날쭉
                prof = sstep(0, 28, h) * np.exp(-h / 80) * (1 - sstep(Hv * 0.4, Hv, h))
                v = prof * ray * fine * inside * (0.5 if sg < 0 else 0.2)
                hue = np.clip(h / Hc, 0, 1)[..., None]
                c = np.array([0.80, 0.95, 1.0]) * (1 - hue) + np.array([1.0, 0.88, 1.0]) * hue
                I = I + v; col = col + c * v[..., None]
            col = col / np.maximum(I, 1e-6)[..., None]
            halo = np.exp(-((X / 90.0) ** 2 + ((Y + 62) / 60.0) ** 2) * 1.8) * 0.32
            col = (col * I[..., None] + np.array([1.0, 1.0, 1.0]) * halo[..., None]) / np.maximum(I + halo, 1e-6)[..., None]; I = (I + halo) * pu
            pts = []; rad = []; val = []
            for (mx, my, sp, p0) in mo:   # 떠오르는 흰 빛 알갱이
                f = (my + ph * sp) % 1.0; x = mx * 110 + 7 * math.sin(T2 * (ph * 2) + p0); y = 10 - f * 170
                pts.append(((x - x0) * AU_RS, (y - y0) * AU_RS)); rad.append(0.75); val.append(math.sin(math.pi * f) * 1.1)
            D = _dots((H, W), pts, rad, val); col = (col * I[..., None] + D[..., None]) / np.maximum(I + D, 1e-6)[..., None]; I = I + D
        else:
            cx, cy, rx, ry = 0.0, -105.0, 62.0, 118.0
            rn = np.sqrt((X / rx) ** 2 + ((Y - cy) / ry) ** 2); dd = (rn - 1) * 62
            if kind == 'fire':   # 몸 둘레를 핥아 오르는 불꽃
                n = _loop2(NZ3, X, Y, 8, 150, ph, 5, sy=3.4)
                up = sstep(30, -80, Y - cy)   # 위쪽일수록 불꽃이 길게
                reach = 14 + 34 * up
                fl = sstep(reach, 0, dd + reach * 1.1 * (n + 0.05)) * sstep(-36, -12, dd)
                fl = fl * (0.35 + 0.65 * sstep(-0.25, 0.45, n))
                I = fl * pu * 0.9 + 0.22 * np.exp(-np.maximum(dd + 8, 0) / 22) * sstep(-50, -5, dd)
                k = np.clip(fl * (1 - np.clip(dd / 50, 0, 1)), 0, 1)[..., None]; col = np.array([1.0, 0.20, 0.03]) * (1 - k) + np.array([1.0, 0.72, 0.25]) * k
            elif kind == 'water':   # 퍼지는 물결 빛 + 일렁이는 빛줄기
                rip = np.sin(rn * 16 - T2 * ph * 2 + 1.5 * _loop2(NZ2, X, Y, 22, 0, ph, 2)) ** 8
                cau = np.clip(1 - np.abs(_loop2(NZ, X, Y, 16, 60, ph, 3)) * 5, 0, 1) ** 2
                ring = sstep(-26, 4, dd) * sstep(46, 8, dd)
                I = (rip * 0.45 + cau * 0.55) * ring * pu + 0.22 * np.exp(-np.maximum(dd + 6, 0) / 24) * sstep(-50, 0, dd)
                col = np.zeros((H, W, 3)) + np.array([0.30, 0.72, 1.0]) + 0.25 * cau[..., None] * np.array([0.6, 0.3, 0.0])
            elif kind == 'earth':   # 호박빛 먼지 아지랑이 + 도는 먼지
                hz = _loop2(NZ2, X, Y, 26, 40, ph, 3)
                I = (0.30 + 0.18 * hz) * np.exp(-np.maximum(dd + 4, 0) / 30) * sstep(-70, -10, dd) * pu
                I = I + 0.18 * sstep(-60, 0, Y) * np.exp(-(X / 90) ** 2) * (0.6 + 0.4 * hz)
                col = np.zeros((H, W, 3)) + np.array([1.0, 0.62, 0.20])
                pts = []; rad = []; val = []
                for (mx, my, sp, p0) in mo:
                    a = p0 + T2 * ph * (1 if sp > 1 else -1) * (1 if sp > 1.2 else 1); rr = 50 + 30 * abs(mx); y = -20 - my * 190
                    x = math.cos(a) * rr; yy = y + math.sin(a) * rr * 0.35; fr = 0.5 + 0.5 * math.sin(a)
                    pts.append(((x - x0) * AU_RS, (yy - y0) * AU_RS)); rad.append(0.9); val.append(0.6 + 0.6 * fr)
                D = _dots((H, W), pts, rad, val); col = (col * I[..., None] + np.array([1.0, 0.85, 0.5]) * D[..., None]) / np.maximum(I + D, 1e-6)[..., None]; I = I + D
            else:   # 바람: 몸을 감아 도는 옅은 초록 바람 줄기
                I = np.zeros((H, W))
                for q in range(11):
                    yc = -22 - q * 17; rr = 52 + 16 * math.sin(q * 1.7); a0 = T2 * ph * (1 if q % 2 else -1) + q * 0.9
                    for side in range(2):
                        a = np.linspace(a0 + side * math.pi, a0 + side * math.pi + 2.0, 80); px = np.cos(a) * rr; py = yc + np.sin(a) * rr * 0.32 - (a - a0) * 5
                        pts = list(zip((px - x0) * AU_RS, (py - y0) * AU_RS)); w = np.sin(np.linspace(0, math.pi, 80)) ** 1.5
                        I = I + _dots((H, W), pts, [0.75] * 80, list(w * (0.35 if np.sin(a[40]) < 0 else 0.7) * 0.42))
                I = cv2.GaussianBlur(I.astype(np.float32), (0, 0), 0.8) + 0.16 * np.exp(-np.maximum(dd + 4, 0) / 26) * sstep(-60, 0, dd)
                I = I * pu; col = np.zeros((H, W, 3)) + np.array([0.62, 1.0, 0.78])
        ex = np.minimum(np.minimum(X - x0, x1 - X) / ((x1 - x0) * 0.16), np.minimum(Y - y0, y1 - Y) / ((y1 - y0) * 0.14))   # 상자 가장자리로 갈수록 0 (네모 테가 안 보이게)
        I = I * sstep(0, 1, ex) * {'u': 0.8, 'fire': 0.85, 'water': 0.55, 'earth': 0.6, 'wind': 0.65}[kind]   # 속성별 세기 (밝은 바닥에서 하얗게 타지 않게)
        img = _aura_img(I, np.clip(col, 0, 1))
        out.append(dict(row=0, img=img, ax=int(round(-x0 * AU_RS)), ay=int(round(-y0 * AU_RS)), tip=(0.0, 0.0)))
    return out


# ================================================================== 작업 목록 · 캐시 · 아틀라스 · 메타
ELS = ['fire', 'water', 'earth', 'wind']
SHEETS = {'u': dict(rs=RS_U, rows=U_ROWS, anims=U_ANIMS, file=0)}
for _el, _f in zip(ELS, (1, 1, 2, 2)):
    SHEETS[_el + '0'] = dict(rs=RS_N, rows=SP_ROWS, anims=SP_ANIMS, file=_f)
    SHEETS[_el + '1'] = dict(rs=RS_G, rows=SP_ROWS, anims=SP_ANIMS, file=_f)   # 대정령: 모델이 이미 1.5배 (출력 px = 세계 px × RS_G)
for _k in ['u'] + ELS: SHEETS['a' + _k] = dict(rs=AU_RS, rows=[0], anims=[('loop', AU_N)], file=0 if _k == 'u' else 3)
FILES = ['unicorn', 'spirits_a', 'spirits_b', 'auras']


def task_list(only):
    T = []
    if 'unicorn' in only:
        for a, n in U_ANIMS:
            for fi in range(n): T.append(('u', a, fi))
    for el in ELS:
        if el in only:
            for g in (0, 1):
                for a, n in SP_ANIMS:
                    for fi in range(n): T.append((el + str(g), a, fi))
    return T


def cache_path(key, anim, fi):
    return os.path.join(CACHE, f'{key}_{anim}_{fi}.npz')


def save_cache(key, anim, fi, out):
    os.makedirs(CACHE, exist_ok=True)
    d = {f'img{i}': o['img'] for i, o in enumerate(out)}
    d['meta'] = np.array(json.dumps([dict(row=o['row'], ax=o['ax'], ay=o['ay'], tip=o['tip']) for o in out]))
    np.savez_compressed(cache_path(key, anim, fi), **d)


def load_cache(key, anim, fi):
    z = np.load(cache_path(key, anim, fi)); M = json.loads(str(z['meta']))
    return [dict(img=z[f'img{i}'], **m) for i, m in enumerate(M)]


def run_task(t):
    key, anim, fi = t; t0 = time.time()
    if key == 'u': out = render_unicorn_frame(anim, fi, U_ROWS, 2, True)
    else: out = render_spirit_frame(key[:-1], key[-1] == '1', anim, fi, SP_ROWS, 2)
    save_cache(key, anim, fi, out)
    return f'{key} {anim} {fi} {time.time() - t0:.1f}s'


def crop_alpha(img, thr=3):
    a = img[..., 3] >= thr
    if not a.any(): return img[:1, :1], 0, 0
    ys = np.nonzero(a.any(1))[0]; xs = np.nonzero(a.any(0))[0]
    y0, y1, x0, x1 = ys[0], ys[-1] + 1, xs[0], xs[-1] + 1
    return img[y0:y1, x0:x1], int(x0), int(y0)


def shelf_pack(sizes, width, gap=2):
    order = sorted(range(len(sizes)), key=lambda i: -sizes[i][1]); pos = [None] * len(sizes); x = gap; y = gap; sh = 0
    for i in order:
        w, h = sizes[i]
        if x + w + gap > width: x = gap; y += sh + gap; sh = 0
        pos[i] = (x, y); x += w + gap; sh = max(sh, h)
    return pos, y + sh + gap


def build_atlases(q=76, aq=85, write_meta=True):
    frames = {i: [] for i in range(len(FILES))}; meta = {}
    for key, S in SHEETS.items():
        an = {}; idx = 0; recs = []
        for a, n in S['anims']:
            an[a] = [n, idx]
            for fi in range(n):
                if key.startswith('a'):
                    if fi == 0: AF = aura_frames(key[1:])
                    outs = [AF[fi]]
                else:
                    outs = load_cache(key, a, fi)
                for o in outs:
                    if key.startswith('a'):   # 오로라: 아주 옅은 빛(알파 24 아래)을 0으로 내리고 나머지를 늘려 → 잘린 네모 테가 안 보이게 + 그리는 넓이를 줄임
                        im2 = o['img'].copy(); a = im2[..., 3].astype(np.float32); im2[..., 3] = np.clip((a - 24) * 255 / 231, 0, 255).astype(np.uint8); o = dict(o, img=im2)
                    img, cx, cy = crop_alpha(o['img'], 1 if key.startswith('a') else 3)
                    rec = dict(img=img, ox=cx - int(round(o['ax'])), oy=cy - int(round(o['ay'])), tip=o['tip'])
                    frames[S['file']].append(rec); recs.append(rec); idx += 1
        meta[key] = dict(rs=round(S['rs'], 4), rows=S['rows'], an=an, recs=recs)
    sizes_total = {}
    for fid, L in frames.items():
        if not L: continue
        area = sum(r['img'].shape[0] * r['img'].shape[1] for r in L) * 1.12; Wd = int(min(4096, max(512, math.ceil(math.sqrt(area) / 64) * 64)))
        pos, Ht = shelf_pack([(r['img'].shape[1], r['img'].shape[0]) for r in L], Wd)
        if Ht > 4096: print(f'!! {FILES[fid]} atlas {Wd}x{Ht} > 4096');
        A = np.zeros((Ht, Wd, 4), np.uint8)
        for r, (x, y) in zip(L, pos):
            h, w = r['img'].shape[:2]; A[y:y + h, x:x + w] = r['img']; r['sx'] = x; r['sy'] = y; r['fid'] = fid
        A[A[..., 3] == 0, :3] = 0
        p = os.path.join(ROOT, 'assets', 'dream', FILES[fid] + '.webp'); os.makedirs(os.path.dirname(p), exist_ok=True)
        Image.fromarray(A, 'RGBA').save(p, 'WEBP', quality=q, alpha_quality=aq, method=6)
        sizes_total[FILES[fid]] = (Wd, Ht, os.path.getsize(p)); print(f'{FILES[fid]}.webp {Wd}x{Ht} {os.path.getsize(p) / 1024:.0f}KB  ({len(L)} frames · decoded {Wd * Ht * 4 / 1e6:.1f}MB)')
    js = {'files': FILES, 's': {}}
    for key, m in meta.items():
        f = []
        for r in m['recs']: f += [r['fid'], r['sx'], r['sy'], r['img'].shape[1], r['img'].shape[0], r['ox'], r['oy'], int(round(r['tip'][0])), int(round(r['tip'][1]))]
        js['s'][key] = dict(rs=m['rs'], rows=m['rows'], an=m['an'], f=f)
    txt = 'const DRA_META = ' + json.dumps(js, separators=(',', ':')) + ';'
    if write_meta:
        gp = os.path.join(ROOT, 'src', 'game.js'); s = open(gp, encoding='utf8').read(); a = s.find('/*DRA_META_BEGIN*/'); b = s.find('/*DRA_META_END*/')
        if a >= 0 and b > a and s.count('/*DRA_META_BEGIN*/') == 1:
            s = s[:a + len('/*DRA_META_BEGIN*/')] + txt + s[b:]; open(gp, 'w', encoding='utf8').write(s); print('game.js DRA_META', len(txt), 'bytes')
        else: print('!! game.js 에 /*DRA_META_BEGIN*/ … /*DRA_META_END*/ 표시가 없어 메타를 안 씀')
    return meta, sizes_total


def contact_sheet(meta, path):
    """렌더 프레임 한눈에 보기: 종류마다 한 줄(방향 줄 2 · 동작별 몇 장)"""
    cells = []
    for key in ['u', 'fire0', 'fire1', 'water0', 'water1', 'earth0', 'earth1', 'wind0', 'wind1']:
        m = meta[key]; nr = len(m['rows']); line = []
        for a, (n, st) in m['an'].items():
            for fi in range(0, n, max(1, n // 4)):
                ri = m['rows'].index(2) if 2 in m['rows'] else 0; line.append(m['recs'][st + fi * nr + ri])
        cells.append((key, line))
    CW, CH = 170, 200; ncol = max(len(l) for _, l in cells)
    can = np.zeros((CH * len(cells), CW * ncol, 3), np.float32)
    for li, (key, line) in enumerate(cells):
        bg = np.array([[96, 84, 70], [70, 40, 34], [70, 40, 34], [60, 78, 96], [60, 78, 96], [128, 106, 72], [128, 106, 72], [92, 92, 90], [92, 92, 90]][li], np.float32)
        can[li * CH:(li + 1) * CH] = bg
        sc = 0.55 if key == 'u' else 0.8
        for k, r in enumerate(line):
            im = cv2.resize(r['img'], None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA) if sc != 1 else r['img']
            h, w = im.shape[:2]; x0 = int(k * CW + CW / 2 + r['ox'] * sc); y0 = int(li * CH + CH - 14 + r['oy'] * sc)
            xa, ya = max(0, x0), max(li * CH, y0); xb, yb = min(can.shape[1], x0 + w), min((li + 1) * CH, y0 + h)
            if xb <= xa or yb <= ya: continue
            sub = im[ya - y0:yb - y0, xa - x0:xb - x0].astype(np.float32); a = sub[..., 3:4] / 255
            can[ya:yb, xa:xb] = sub[..., :3] * a + can[ya:yb, xa:xb] * (1 - a)
    os.makedirs(os.path.dirname(path), exist_ok=True); Image.fromarray(can.astype(np.uint8)).save(path); print('preview', path)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--only', default='unicorn,fire,water,earth,wind'); ap.add_argument('--jobs', type=int, default=2)
    ap.add_argument('--pack', action='store_true'); ap.add_argument('--skip', action='store_true', help='캐시가 있는 프레임은 건너뜀'); ap.add_argument("--q", type=int, default=76)
    a = ap.parse_args(); only = a.only.split(',')
    if not a.pack:
        T = task_list(only)
        if a.skip: T = [t for t in T if not os.path.exists(cache_path(*t))]
        t0 = time.time(); print(len(T), 'frames to render')
        if a.jobs > 1:
            import multiprocessing as mp
            with mp.get_context('fork').Pool(a.jobs) as pool:
                for i, r in enumerate(pool.imap_unordered(run_task, T)): print(f'[{i + 1}/{len(T)}] {r}', flush=True)
        else:
            for i, t in enumerate(T): print(f'[{i + 1}/{len(T)}] {run_task(t)}', flush=True)
        print(f'render {time.time() - t0:.0f}s')
    meta, sz = build_atlases(a.q)
    contact_sheet(meta, os.path.join(ROOT, 'dev', 'out', 'dream3_sheet_preview.png'))


if __name__ == '__main__':
    main()
