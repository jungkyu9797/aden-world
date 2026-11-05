#!/usr/bin/env python3
# 11/5: 잊혀진 섬 보스 '에이션트 자이언트' 오프라인 렌더러 — dev/render_dream.py 와 같은 방식 (numpy SDF 표면 · 외부 모델·그림·텍스처 없음)
#   컨셉(말로 받은 분위기)만 따서 새로 만든 오리지널: 맨발 근육질 거인 · 회색빛 도는 올리브 피부 · 헝클어진 검은 머리 · 점박이 짐승 가죽 허리옷
#     · 어깨에서 대각선으로 두른 가죽 띠 · 왼쪽 어깨 쇠 견갑 · 팔목·발목 쇠 띠 · 긴 자루 끝 가시 쇠공(모닝스타)
#   사용:  python3 dev/render_giant.py                    (전부 190장 · 2코어로 약 2분)
#          python3 dev/render_giant.py --skip             (캐시에 이미 있는 프레임은 건너뜀)
#          python3 dev/render_giant.py --pack             (렌더 캐시 dev/out/giant_cache/*.npz 로 아틀라스·메타만 다시 만듦)
#          python3 dev/render_giant.py --quick --only attack --rows 2 [--frames 3] [--full]   (빠른 미리 보기 · 캐시·아틀라스 안 건드림 → dev/out/giant_quick.png)
#   결과:  assets/forgotten/giant.webp · src/game.js 의 /*GIA_META_BEGIN*/ … /*GIA_META_END*/ (프레임 자리·기준점·쇠공 위치) · dev/out/giant_sheet_preview.png
#   카메라·빛·방향: render_dream.py 그대로 (정사영 쿼터뷰 · 8줄 중 0·7·6줄은 2·3·4줄을 좌우로 뒤집어 씀)
#   좌표: GU = 거인 키 단위 (머리 꼭대기 ≈ 1) · 세계 px = GU × G_WORLD · 출력 px = 세계 px × RS · 모델 x = 앞 · y = 위 · z = 오른쪽 (무기는 오른손)
import sys, os, math, json, time, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import cv2
from PIL import Image
import render_dream as RD
from render_dream import (nrm, sstep, fbm, sd_round_cone, sd_ell, frame_from, Prim, P_sph, P_cone, P_ell, P_ell_ax, Vol, View, trace, soft_shadow,
                          ambient_occ, finish, crop_alpha, shelf_pack, rot_row, LKEY_W, KEY_COL, SKY_UP, SKY_DN, NZ, NZ2, NZ3)

ROOT = RD.ROOT
CACHE = os.path.join(ROOT, 'dev', 'out', 'giant_cache')
RS = 0.85                # 출력 px / 세계 px (게임 확대 2 기준 화면 2.35배 · 임시 그림(오우거 ×1.45)은 2.9배)
G_WORLD = 222.0          # 세계 px / GU (서 있을 때 머리 꼭대기 ≈ 196px · 지금 임시 그림과 비슷)
S = G_WORLD * RS         # 출력 px / GU
ANIMS = [('idle', 8), ('walk', 8), ('attack', 8), ('cast', 8), ('death', 6)]
ROWS = [1, 2, 3, 4, 5]   # 렌더하는 방향 줄 (0·7·6 = 2·3·4 좌우 뒤집기)
SKIN, HAIR, HIDE, LEATH, IRON, WOOD, EYE, MOUTH, NAIL = 1, 2, 3, 4, 5, 6, 7, 8, 9
L_UP, L_FO, L_TH, L_SH = 0.20, 0.19, 0.215, 0.215   # 위팔 · 아래팔(손 쥔 곳까지 +0.045) · 넓적다리 · 정강이
ANK = 0.047              # 발목 높이
WL = 0.40                # 무기: 쥔 곳 → 쇠공 가운데
HS = 1.16                # 머리 크기 배율


def Rx(a):
    a = math.radians(a); c, s = math.cos(a), math.sin(a); return np.array([[1.0, 0, 0], [0, c, -s], [0, s, c]])


def Ry(a):   # + = 왼쪽으로 돎 (위에서 볼 때 반시계)
    a = math.radians(a); c, s = math.cos(a), math.sin(a); return np.array([[c, 0, s], [0, 1.0, 0], [-s, 0, c]])


def Rz(a):
    a = math.radians(a); c, s = math.cos(a), math.sin(a); return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1.0]])


def bend(a):   # 앞으로 a도 숙임 (위 → 앞)
    return Rz(-a)


def V(*a):
    return np.array(a, float)


def lerp(a, b, t):
    return a + (b - a) * t


def ik2(a, t, l1, l2, pole):
    """두 마디 IK: 뿌리 a · 목표 t · 길이 l1·l2 · pole 쪽으로 꺾임 → (가운데 관절, 끝)"""
    a = np.asarray(a, float); t = np.asarray(t, float); v = t - a; d0 = float(np.linalg.norm(v)); dv = v / max(d0, 1e-9)
    d = min(max(d0, abs(l1 - l2) + 1e-4), l1 + l2 - 1e-4)
    ca = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d); sa = math.sqrt(max(0.0, 1 - ca * ca))
    p = np.asarray(pole, float); p = p - (p @ dv) * dv
    p = p / np.linalg.norm(p) if np.linalg.norm(p) > 1e-6 else frame_from(dv)[1]
    return a + dv * l1 * ca + p * l1 * sa, a + dv * d


# ------------------------------------------------------------------ 자세 (동작 · 프레임 → 값)
def base_pose():
    return dict(pel=V(0.0, 0.487, 0.0), yaw=0.0, bend=7.0, twist=0.0, roll=0.0, hp=-9.0, hy=0.0, br=0.0, jaw=0.0, brow=0.0,
                FL=V(0.005, ANK, -0.112), FR=V(-0.005, ANK, 0.118), fpL=0.0, fpR=0.0, kpL=V(1.0, 0, -0.25), kpR=V(1.0, 0, 0.25),
                HR=V(0.10, 0.455, 0.245), HL=None, epR=V(-0.6, -0.3, 0.55), epL=V(-0.6, -0.3, -0.55),
                ball=V(0.29, 0.077, 0.31), wdir=None, two=False, drop=None, fist=1.0)


def foot_cycle(ph, A=0.12, lift=0.055, duty=0.58):
    ph %= 1.0
    if ph < duty:
        s = ph / duty; return A * (1 - 2 * s), 0.0, 0.0
    s = (ph - duty) / (1 - duty); e = s * s * (3 - 2 * s)
    return A * (-1 + 2 * e), lift * math.sin(math.pi * s), 18 * math.sin(math.pi * s) - 10 * s


def gi_pose(anim, fi):
    nf = dict(ANIMS)[anim]; ph = fi / nf; T2 = 2 * math.pi; P = base_pose()
    if anim == 'idle':   # 숨쉬기 · 어깨가 오르내림 · 머리 살짝 돌림 · 무기는 땅에 짚음
        w = math.sin(T2 * ph); w2 = math.sin(T2 * ph + 1.3)
        P['br'] = 0.022 * w; P['pel'] = V(0.0, 0.487 - 0.004 * w, 0.0); P['bend'] = 7 - 1.2 * w; P['hp'] = -9 + 2.5 * w2; P['hy'] = 7 * math.sin(T2 * ph + 0.4)
        P['HR'] = V(0.10, 0.455 + 0.006 * w, 0.245); P['HL'] = V(0.035 + 0.012 * w2, 0.44 + 0.008 * w, -0.255); P['twist'] = 2.5 * w2
    elif anim == 'walk':   # 무거운 걸음 · 오른손은 무기를 뒤로 끎 (쇠공이 땅에 끌림)
        xL, yL, pL = foot_cycle(ph + 0.5); xR, yR, pR = foot_cycle(ph)
        P['FL'] = V(xL, ANK + yL, -0.105); P['FR'] = V(xR, ANK + yR, 0.112); P['fpL'] = pL; P['fpR'] = pR
        P['pel'] = V(0.0, 0.478 + 0.013 * math.cos(T2 * 2 * ph), 0.0); P['bend'] = 17 + 1.5 * math.cos(T2 * 2 * ph)
        P['yaw'] = 6 * math.sin(T2 * ph); P['twist'] = -9 * math.sin(T2 * ph); P['roll'] = 3.5 * math.sin(T2 * ph + 0.5); P['hp'] = -13
        P['HL'] = V(0.03 - 0.13 * math.cos(T2 * ph), 0.40 + 0.03 * abs(math.cos(T2 * ph)), -0.245)
        P['HR'] = V(-0.10 + 0.02 * math.sin(T2 * ph), 0.375 + 0.01 * math.cos(T2 * 2 * ph), 0.255); P['epR'] = V(-0.5, -0.3, 0.6)
        P['ball'] = V(-0.38 + 0.015 * math.sin(T2 * ph), 0.077 + 0.006 * abs(math.sin(T2 * 2 * ph)), 0.33 + 0.012 * math.sin(T2 * ph))
    elif anim == 'attack':   # 옆으로 크게 휘두르기 (오른쪽 뒤로 젖힘 → 앞을 가로질러 → 왼쪽으로 따라감 → 돌아옴)
        K = [  # yaw, twist, bend, HR(손), 무기 방향, HL, 오른발 x, 엉덩이 높이
            (-8, -22, 12, (-0.02, 0.62, 0.31), (-0.55, 0.62, 0.55), (0.12, 0.45, -0.24), -0.03, 0.482),
            (-15, -38, 10, (-0.13, 0.70, 0.27), (-0.85, 0.40, 0.35), (0.20, 0.53, -0.20), -0.07, 0.474),
            (-4, -8, 15, (0.10, 0.62, 0.30), (-0.12, 0.05, 1.0), (0.12, 0.50, -0.22), -0.06, 0.466),
            (9, 20, 19, (0.31, 0.58, 0.07), (0.85, -0.04, 0.52), (-0.06, 0.48, -0.25), -0.05, 0.458),
            (15, 36, 20, (0.27, 0.56, -0.13), (0.82, -0.10, -0.56), (-0.14, 0.47, -0.25), -0.04, 0.458),
            (18, 44, 18, (0.12, 0.54, -0.27), (0.18, -0.30, -1.0), (-0.16, 0.45, -0.25), -0.03, 0.462),
            (10, 24, 15, (0.11, 0.48, -0.10), (0.62, -0.75, -0.28), (-0.06, 0.43, -0.25), -0.02, 0.472),
            (3, 7, 13, (0.10, 0.44, 0.15), (0.45, -0.86, 0.22), (0.02, 0.41, -0.25), -0.01, 0.484)][fi]
        yaw, tw, bd, hr, wd, hl, fx, py = K
        P['yaw'] = yaw; P['twist'] = tw; P['bend'] = bd; P['HR'] = V(*hr); P['wdir'] = nrm(V(*wd)); P['HL'] = V(*hl); P['ball'] = None
        P['FL'] = V(0.07, ANK, -0.12); P['FR'] = V(fx, ANK, 0.13); P['pel'] = V(0.0, py, 0.0); P['hp'] = -12; P['hy'] = -tw * 0.35
        P['epR'] = V(-0.4, -0.5, 0.6) if fi < 3 else V(-0.3, -0.7, 0.4); P['jaw'] = 0.6 if fi in (3, 4) else 0.0; P['brow'] = 1.0 if 2 <= fi <= 5 else 0.0
    elif anim == 'cast':   # 두 손으로 머리 위로 들어 올렸다가 땅을 내려찍음 (발 구르기 · 바위 던지기 · 포효 시전)
        K = [  # 쥔 곳(오른손), 무기 방향, bend, 엉덩이 높이, 머리 숙임, 입, 팔꿈치 방향
            ((0.16, 0.43, 0.10), (0.50, -0.86, 0.10), 18, 0.466, -10, 0.0, (-0.5, -0.4, 0.6)),
            ((0.17, 0.60, 0.04), (0.62, 0.78, 0.0), 12, 0.474, -12, 0.0, (-0.4, -0.6, 0.6)),
            ((0.09, 0.81, 0.03), (0.12, 0.99, 0.0), 4, 0.484, -18, 0.2, (0.0, -0.5, 1.0)),
            ((0.01, 0.98, 0.02), (-0.55, 0.83, 0.0), -5, 0.490, -24, 0.7, (0.2, -0.2, 1.0)),
            ((-0.03, 1.00, 0.02), (-0.86, 0.50, 0.0), -9, 0.492, -26, 1.0, (0.2, -0.2, 1.0)),
            ((0.19, 0.85, 0.02), (0.72, 0.69, 0.0), 12, 0.476, -12, 0.8, (-0.2, -0.6, 0.8)),
            ((0.31, 0.43, 0.02), (0.52, -0.855, 0.0), 34, 0.405, 12, 0.6, (-0.3, -0.5, 0.8)),
            ((0.30, 0.44, 0.02), (0.53, -0.85, 0.0), 31, 0.415, 6, 0.3, (-0.3, -0.5, 0.8))][fi]
        hr, wd, bd, py, hp, jw, ep = K
        P['HR'] = V(*hr); P['wdir'] = nrm(V(*wd)); P['two'] = True; P['bend'] = bd; P['pel'] = V(0.0, py, 0.0); P['hp'] = hp; P['jaw'] = jw; P['brow'] = 1.0
        P['epR'] = V(*ep); P['epL'] = V(ep[0], ep[1], -ep[2]); P['ball'] = None
        w = 1.0 if fi >= 6 else 0.0
        P['FL'] = V(0.06 + 0.06 * w, ANK, -0.13 - 0.02 * w); P['FR'] = V(-0.05 - 0.03 * w, ANK, 0.13 + 0.02 * w)
    elif anim == 'death':   # 비틀 → 무릎 꿇음 → 앞으로 쓰러짐 (무기는 손에서 놓침)
        P['ball'] = None
        drop = (V(0.02, 0.03, 0.36), nrm(V(0.30, 0.11, 0.95)))   # 땅에 떨어진 무기 (쥔 자리, 방향)
        if fi == 0:
            P['pel'] = V(-0.03, 0.482, 0.0); P['bend'] = -8; P['hp'] = -26; P['jaw'] = 0.8; P['brow'] = 1.0
            P['HR'] = V(-0.02, 0.47, 0.31); P['HL'] = V(-0.02, 0.49, -0.30); P['ball'] = V(-0.10, 0.077, 0.62); P['FL'] = V(0.05, ANK, -0.12)
        elif fi == 1:
            P['pel'] = V(0.03, 0.37, 0.0); P['bend'] = 14; P['hp'] = -6; P['jaw'] = 0.5; P['drop'] = drop; P['HR'] = V(0.10, 0.34, 0.27); P['HL'] = V(0.10, 0.33, -0.26)
            P['FL'] = V(-0.06, ANK, -0.12); P['FR'] = V(-0.08, ANK, 0.12); P['fist'] = 0.4
        elif fi == 2:   # 무릎 꿇음 (정강이가 땅에)
            P['pel'] = V(0.0, 0.29, 0.0); P['bend'] = 28; P['hp'] = 10; P['drop'] = drop; P['HR'] = V(0.18, 0.20, 0.25); P['HL'] = V(0.17, 0.20, -0.25)
            P['FL'] = V(-0.21, 0.04, -0.11); P['FR'] = V(-0.21, 0.04, 0.12); P['fpL'] = P['fpR'] = -160; P['fist'] = 0.2
        else:   # 앞으로 쓰러짐 → 엎어짐 → 가라앉음
            k = [0.0, 0.0, 0.0, 0.55, 0.92, 1.0][fi]
            P['pel'] = V(lerp(0.04, 0.10, k), lerp(0.25, 0.115, k), 0.0); P['bend'] = lerp(58, 92, k); P['hp'] = lerp(10, -20, k); P['hy'] = 55 * k; P['drop'] = drop
            P['HR'] = V(lerp(0.38, 0.50, k), lerp(0.10, 0.05, k), lerp(0.24, 0.32, k)); P['HL'] = V(lerp(0.36, 0.40, k), lerp(0.10, 0.05, k), lerp(-0.24, -0.34, k))
            P['epR'] = V(-0.2, 0.6, 0.8); P['epL'] = V(-0.2, 0.6, -0.8)
            P['FL'] = V(lerp(-0.26, -0.36, k), lerp(0.04, 0.035, k), -0.11); P['FR'] = V(lerp(-0.26, -0.37, k), lerp(0.04, 0.035, k), 0.13); P['fpL'] = P['fpR'] = -165
            P['kpL'] = V(0.4, -1.0, -0.2); P['kpR'] = V(0.4, -1.0, 0.2); P['fist'] = 0.0; P['roll'] = -6 * k
    return P


# ------------------------------------------------------------------ 뼈대 → SDF 도형
def P_slabcut(f, c, n, w):
    """도형 f 를 판(가운데 c · 법선 n · 반두께 w) 안쪽만 남김"""
    c = np.asarray(c, float); n = nrm(n)
    return lambda X, Y, Z: np.maximum(f(X, Y, Z), np.abs((X - c[0]) * n[0] + (Y - c[1]) * n[1] + (Z - c[2]) * n[2]) - w)


def gi_skel(P):
    """자세 → 관절 위치 (GU)"""
    J = {}; pel = P['pel']
    Rp = Ry(P['yaw']) @ Rx(P['roll'] * 0.5)
    Rw = Rp @ Ry(P['twist'] * 0.45) @ bend(P['bend'] * 0.5) @ Rx(P['roll'] * 0.25)
    Rc = Rp @ Ry(P['twist']) @ bend(P['bend']) @ Rx(P['roll'] * 0.5)
    Rh = Rc @ Ry(P['hy']) @ bend(P['hp'] - P['bend'] * 0.55)
    J.update(Rp=Rp, Rw=Rw, Rc=Rc, Rh=Rh, pel=pel)
    J['waist'] = pel + Rw @ V(0.0, 0.10, 0.0)
    J['chest'] = J['waist'] + Rc @ V(0.0, 0.11, 0.0)
    br = 1 + P['br']
    J['neck'] = J['chest'] + Rc @ V(0.035, 0.105 + 0.005 * P['br'] / 0.02, 0.0)
    J['head'] = J['neck'] + Rh @ V(0.03, 0.062, 0.0)
    for sd, sg in (('L', -1), ('R', 1)):
        J['hip' + sd] = pel + Rp @ V(0.0, -0.03, sg * 0.087)
        J['sh' + sd] = J['chest'] + Rc @ V(0.0, 0.09 + 0.004 * P['br'] / 0.02, sg * 0.185 * (1 + 0.15 * P['br']))
    # 다리
    for sd, sg in (('L', -1), ('R', 1)):
        F = P['F' + sd]; kn, an = ik2(J['hip' + sd], F, L_TH, L_SH, P['kp' + sd]); J['kn' + sd] = kn; J['an' + sd] = an
    # 무기 · 손
    if P['drop'] is not None:
        G, u = P['drop']; J['wG'] = np.asarray(G, float); J['wu'] = nrm(u)
    else:
        G = P['HR']; J['wG'] = None
    el, hd = ik2(J['shR'], P['HR'], L_UP, L_FO + 0.045, P['epR']); J['elR'] = el; J['hdR'] = hd
    if P['drop'] is None:
        u = P['wdir'] if P['wdir'] is not None else nrm(P['ball'] - hd)
        J['wG'] = hd; J['wu'] = u
    if P['two']:
        tL = J['wG'] - J['wu'] * 0.105
    else:
        tL = P['HL'] if P['HL'] is not None else J['shL'] + V(0.02, -0.40, -0.05)
    el, hd = ik2(J['shL'], tL, L_UP, L_FO + 0.045, P['epL']); J['elL'] = el; J['hdL'] = hd
    return J


def gi_build(P):
    """자세 → (몸통 도형, 나머지 도형, 띠 정보, 덤 정보)"""
    J = gi_skel(P); torso = []; rest = []; cur = torso; rs = [1.0]   # rs: 반지름 배율 (머리는 HS)
    Rp, Rw, Rc, Rh = J['Rp'], J['Rw'], J['Rc'], J['Rh']; br = 1 + P['br']

    def E(c, R, r, mat=SKIN, k=0.02, op='u'):
        cur.append(P_ell(np.asarray(c) * S, np.asarray(R).T, np.asarray(r) * S * rs[0], mat, k * S * rs[0], op))

    def EA(a, b, rw, rd, mat=SKIN, k=0.02, up=(0, 1, 0), extra=1.0):
        cur.append(P_ell_ax(np.asarray(a) * S, np.asarray(b) * S, rw * S * rs[0], rd * S * rs[0], mat, k * S * rs[0], up, extra))

    def C(a, b, r1, r2, mat=SKIN, k=0.015, op='u'):
        cur.append(P_cone(np.asarray(a) * S, np.asarray(b) * S, r1 * S * rs[0], r2 * S * rs[0], mat, k * S * rs[0], op))

    def Sp(c, r, mat=SKIN, k=0.01, op='u'):
        cur.append(P_sph(np.asarray(c) * S, r * S * rs[0], mat, k * S * rs[0], op))

    pel, waist, chest, neck, head = J['pel'], J['waist'], J['chest'], J['neck'], J['head']
    # ---- 몸통 (가죽 띠·허리띠는 이 겉면을 따라 두름)
    E(pel + Rp @ V(0.0, 0.012, 0.0), Rp, (0.098, 0.088, 0.132), k=0.03)
    for sg in (-1, 1): E(pel + Rp @ V(-0.052, -0.012, sg * 0.062), Rp, (0.062, 0.072, 0.066), k=0.03)          # 엉덩이
    E(waist + Rw @ V(0.028, -0.005, 0.0), Rw, (0.108 * br, 0.088, 0.125), k=0.04)                               # 배 (불룩)
    E(chest + Rc @ V(-0.005, 0.0, 0.0), Rc, (0.112 * br, 0.118, 0.152 * br), k=0.04)                           # 갈비
    for sg in (-1, 1):
        E(chest + Rc @ V(0.074, 0.038, sg * 0.072), Rc @ Ry(sg * 12), (0.048 * br, 0.062, 0.078), k=0.03)        # 가슴
        E(chest + Rc @ V(-0.035, -0.015, sg * 0.112), Rc, (0.07, 0.105, 0.052), k=0.04)                         # 등 넓은 근육
        E(chest + Rc @ V(0.055, -0.088, sg * 0.05), Rc, (0.035, 0.03, 0.045), k=0.03)                           # 배 근육 위
    E(neck + Rc @ V(-0.05, -0.02, 0.0), Rc, (0.072, 0.065, 0.125), k=0.04)                                     # 목 뒤 큰 승모근
    for sd, sg in (('L', -1), ('R', 1)):
        sh = J['sh' + sd]
        EA(neck + Rc @ V(-0.025, 0.0, sg * 0.02), sh + Rc @ V(-0.01, 0.02, 0.0), 0.06, 0.05, k=0.035)          # 승모근 비탈
        a = nrm(J['el' + sd] - sh); E(sh + a * 0.012 + Rc @ V(0.0, 0.006, sg * 0.012), frame_from(a).T, (0.085, 0.074, 0.076), k=0.03)   # 어깨 세모근
    C(neck + Rc @ V(-0.01, -0.02, 0.0), head + Rh @ V(-0.02, -0.04, 0.0), 0.072, 0.056, k=0.03)                # 목
    cur = rest
    # ---- 허리옷: 점박이 짐승 가죽 (허리에서 넓적다리 중간까지 · 끝이 들쭉날쭉) — 옷이 다리를 따라 조금 밀림
    knee_mid = (J['knL'] + J['knR']) / 2; shift = Rp.T @ (knee_mid - pel); sx = float(np.clip(shift[0] * 0.45, -0.06, 0.08))
    yt, yb = 0.072, -0.138
    pelS = pel * S; RpT = Rp.T

    def skirt(X, Y, Z):
        px = (X - pelS[0]) / S; py = (Y - pelS[1]) / S; pz = (Z - pelS[2]) / S
        qx = RpT[0, 0] * px + RpT[0, 1] * py + RpT[0, 2] * pz; qy = RpT[1, 0] * px + RpT[1, 1] * py + RpT[1, 2] * pz; qz = RpT[2, 0] * px + RpT[2, 1] * py + RpT[2, 2] * pz
        t = np.clip((yt - qy) / (yt - yb), 0, 1.2); cx = sx * t * t + 0.008; rx = 0.106 + 0.055 * t; rz = 0.134 + 0.06 * t
        e = np.sqrt(((qx - cx) / rx) ** 2 + (qz / rz) ** 2); th = np.arctan2(qz, qx - cx)
        hem = yb + 0.035 * np.abs(np.sin(th)) ** 1.5 + 0.016 * (np.sin(5 * th + 1.0) + 0.55 * np.sin(11 * th + 2.3) + 0.35 * np.sin(19 * th + 0.4)) + 0.01 * np.cos(th)
        d = np.maximum((e - 1) * np.minimum(rx, rz), np.maximum(qy - yt, hem - qy))
        return d * S
    lo = pelS - 0.30 * S; hi = pelS + 0.30 * S
    rest.append(Prim(skirt, lo, hi, HIDE, 0.003 * S))
    # ---- 다리
    for sd, sg in (('L', -1), ('R', 1)):
        hp_, kn, an = J['hip' + sd], J['kn' + sd], J['an' + sd]; th = nrm(kn - hp_); sh_ = nrm(an - kn)
        C(hp_ + th * -0.02, kn, 0.09, 0.062, k=0.03)
        kp = nrm(P['kp' + sd]); front = nrm(kp - (kp @ th) * th); fs = nrm(kp - (kp @ sh_) * sh_)   # 무릎이 향하는 쪽 (넓적다리·정강이 앞)
        EA(hp_ + th * 0.06 + front * 0.03, hp_ + th * 0.19 + front * 0.03, 0.062, 0.058, k=0.03)                 # 허벅지 앞 근육
        Sp(kn + front * 0.012, 0.058, k=0.02)                                                                      # 무릎
        C(kn, an, 0.06, 0.04, k=0.02)
        EA(kn + sh_ * 0.03 - fs * 0.028, kn + sh_ * 0.13 - fs * 0.022, 0.052, 0.05, k=0.025)               # 종아리
        # 발 (맨발 · 발가락 다섯)
        fp = P['fp' + sd]; fdir = nrm(Rp @ V(1.0, 0.0, sg * 0.12)); fdir = nrm(Rz(fp) @ fdir) if fp else fdir
        Sp(an, 0.042, k=0.015)
        fc = an + fdir * 0.038 + V(0, -0.022, 0); E(fc, frame_from(fdir).T, (0.072, 0.026, 0.044), k=0.02)
        Sp(an - fdir * 0.02 + V(0, -0.02, 0), 0.03, k=0.015)                                                     # 뒤꿈치
        lat = nrm(np.cross(fdir, V(0, 1.0, 0))) * -sg
        for q in range(5):
            o = (q - 1.6) * 0.017; Sp(fc + fdir * (0.066 - abs(q - 1.0) * 0.006) + lat * o * -1 + V(0, -0.012, 0), 0.0135 - 0.0013 * q if q else 0.016, k=0.006)
    # ---- 팔
    for sd, sg in (('L', -1), ('R', 1)):
        sh, el, hd = J['sh' + sd], J['el' + sd], J['hd' + sd]; ua = nrm(el - sh); fa = nrm(hd - el); wr = el + fa * L_FO
        C(sh, el, 0.064, 0.05, k=0.025)
        fw_ = Rc @ V(1.0, 0, 0); bn = nrm(np.cross(ua, np.cross(fa, ua))) if np.linalg.norm(np.cross(fa, ua)) > 0.05 else nrm(fw_ - (fw_ @ ua) * ua)
        EA(sh + ua * 0.05 + bn * 0.025, sh + ua * 0.17 + bn * 0.02, 0.05, 0.052, k=0.025)                       # 이두
        EA(sh + ua * 0.04 - bn * 0.03, sh + ua * 0.16 - bn * 0.025, 0.048, 0.05, k=0.025)                       # 삼두
        C(el, wr, 0.054, 0.038, k=0.02)
        EA(el + fa * 0.015, el + fa * 0.11, 0.062, 0.056, k=0.025)                                               # 아래팔 굵은 근육
        # 주먹 (쥔 곳 = hd)
        hf = frame_from(fa, V(0, 0, sg) if abs(fa[2]) < 0.9 else V(0, 1, 0))
        E(hd - fa * 0.008, hf.T, (0.05, 0.044 + 0.006 * (1 - P['fist']), 0.042), k=0.015)
        EA(hd + fa * 0.02 - hf[1] * 0.012, hd + fa * 0.045 - hf[1] * 0.01, 0.04, 0.02, k=0.012)               # 손가락 마디
        C(hd - fa * 0.02 + hf[2] * 0.03 * sg, hd + fa * 0.015 + hf[2] * 0.035 * sg, 0.016, 0.013, k=0.01)
    # ---- 머리 (무거운 눈두덩 · 큰 코 · 넓은 턱 · 작은 귀)
    H = lambda x, y, z=0.0: head + Rh @ (V(x, y, z) * HS)
    jd = P['jaw']; rs[0] = HS
    E(H(0.0, 0.006), Rh, (0.068, 0.072, 0.061), k=0.02)                                                         # 머리뼈
    E(H(0.036, -0.04 - 0.012 * jd), Rh @ bend(-12 * jd), (0.052, 0.036, 0.054), k=0.022)                        # 턱
    for sg in (-1, 1):
        Sp(H(0.046, -0.008, sg * 0.036), 0.024, k=0.015)                                                        # 광대
        E(H(-0.004, -0.004, sg * 0.062), Rh, (0.016, 0.026, 0.01), k=0.008)                                     # 귀
    EA(H(0.058, 0.022 - 0.004 * P['brow'], -0.046), H(0.058, 0.022 - 0.004 * P['brow'], 0.046), 0.017, 0.015, k=0.012)   # 눈두덩
    C(H(0.062, 0.012), H(0.088, -0.022), 0.013, 0.018, k=0.012)                                                 # 코
    for sg in (-1, 1): Sp(H(0.082, -0.026, sg * 0.016), 0.011, k=0.008)                                         # 콧볼
    Sp(H(0.03, -0.035), 0.03, mat=MOUTH, k=0.0)                                                                   # 입 속 (빈 곳은 어두운 색)
    for sg in (-1, 1):
        Sp(H(0.064, 0.002, sg * 0.025), 0.0135, k=0.006, op='s')                                                 # 눈구멍
        Sp(H(0.058, 0.002, sg * 0.025), 0.0095, mat=EYE, k=0.002)                                                # 눈
    EA(H(0.086, -0.052 - 0.01 * jd, -0.028), H(0.086, -0.052 - 0.01 * jd, 0.028), 0.0045 + 0.012 * jd, 0.004 + 0.016 * jd, mat=MOUTH, k=0.004)
    cur[-1].op = 's'
    # ---- 머리카락 (덩어리 + 들쭉날쭉한 가닥 · 뒤로 목까지)
    E(H(-0.014, 0.024), Rh, (0.077, 0.068, 0.067), mat=HAIR, k=0.012)
    rng = np.random.default_rng(31)
    for q in range(16):
        a = -2.3 + q / 15 * 4.6; ud = Rh @ nrm(V(-0.55 - 0.3 * abs(math.sin(a)), 0.55 - 0.9 * (q % 3 == 0) * 0.5, math.sin(a) * 0.85))
        b = H(-0.02 + 0.03 * math.cos(a), 0.05 - 0.02 * abs(math.sin(a)), 0.05 * math.sin(a))
        L = 0.05 + 0.04 * rng.random() + 0.03 * (abs(a) < 1.2)
        tip = b + ud * L + V(0, -0.045 * L / 0.08, 0)
        C(b, tip, 0.022, 0.006, mat=HAIR, k=0.012)
    for q in range(5):   # 앞머리 몇 가닥 (이마 위로 흐트러짐)
        z = (q - 2) * 0.022; b = H(0.045, 0.06, z); C(b, b + Rh @ nrm(V(0.6, -0.5, z * 6)) * 0.035, 0.014, 0.005, mat=HAIR, k=0.008)
    rs[0] = 1.0
    # ---- 왼쪽 어깨 쇠 견갑 (두 겹 · 징) + 위팔 가죽 끈
    sh, el = J['shL'], J['elL']; ua = nrm(el - sh); o = nrm(Rc @ V(0, 0, -1.0)); yc = Rc @ V(0, 1.0, 0); up = nrm(yc - (yc @ ua) * ua + 1e-6)
    c1 = sh - ua * 0.01 - up * 0.012; o2 = nrm(np.cross(ua, up)); o2 = o2 if o2 @ o > 0 else -o2; Rf = np.array([ua, up, o2])
    for (cc, rad, lo_, hi_) in ((c1, (0.094, 0.082, 0.094), -1.0, 0.03), (c1 + ua * 0.042, (0.086, 0.078, 0.088), 0.012, 0.078)):
        c_ = cc * S; rr = np.array(rad) * S; ua_ = ua.copy(); o_ = o.copy(); l0 = lo_ * S; h0 = hi_ * S; c0 = c1 * S

        def pauld(X, Y, Z, c_=c_, rr=rr, ua_=ua_, o_=o_, l0=l0, h0=h0, c0=c0):
            s = sd_ell(X, Y, Z, c_, Rf, rr)
            a = (X - c0[0]) * ua_[0] + (Y - c0[1]) * ua_[1] + (Z - c0[2]) * ua_[2]; b = (X - c0[0]) * o_[0] + (Y - c0[1]) * o_[1] + (Z - c0[2]) * o_[2]
            return np.maximum(np.maximum(s, a - h0), np.maximum(l0 - a, -0.05 * S - b))
        rest.append(Prim(pauld, cc * S - rr.max(), cc * S + rr.max(), IRON, 0.0025 * S))
    for q in range(5):   # 징
        ang = -0.9 + q * 0.45; d = nrm(o2 * math.cos(ang) * 0.094 + up * math.sin(ang) * 0.082 - ua * 0.02); Sp(c1 + d * 0.0905, 0.008, mat=IRON, k=0.002)
    bc = sh + ua * 0.125; rest.append(Prim(P_slabcut(lambda X, Y, Z, a=sh * S, b=el * S: sd_round_cone(X, Y, Z, a, b, 0.064 * S + 0.012 * S, 0.05 * S + 0.012 * S), bc * S, ua, 0.014 * S),
                                       np.minimum(sh, el) * S - 0.1 * S, np.maximum(sh, el) * S + 0.1 * S, LEATH, 0.002 * S))
    # ---- 팔목·발목 쇠 띠 (+ 징)
    for sd in 'LR':
        el, hd = J['el' + sd], J['hd' + sd]; fa = nrm(hd - el); wr = el + fa * L_FO; bcn = wr - fa * 0.04
        rest.append(Prim(P_slabcut(lambda X, Y, Z, a=el * S, b=wr * S: sd_round_cone(X, Y, Z, a, b, 0.054 * S + 0.013 * S, 0.038 * S + 0.013 * S), bcn * S, fa, 0.036 * S),
                         np.minimum(el, wr) * S - 0.1 * S, np.maximum(el, wr) * S + 0.1 * S, IRON, 0.002 * S))
        kn, an = J['kn' + sd], J['an' + sd]; sv = nrm(an - kn); bcn = an - sv * 0.035
        rest.append(Prim(P_slabcut(lambda X, Y, Z, a=kn * S, b=an * S: sd_round_cone(X, Y, Z, a, b, 0.06 * S + 0.012 * S, 0.04 * S + 0.012 * S), bcn * S, sv, 0.022 * S),
                         np.minimum(kn, an) * S - 0.1 * S, np.maximum(kn, an) * S + 0.1 * S, IRON, 0.002 * S))
    # ---- 무기: 긴 나무 자루 + 쇠 고리 + 가시 박힌 쇠공
    G, u = J['wG'], J['wu']; Wf = frame_from(u)
    C(G - u * 0.07, G + u * (WL - 0.06), 0.019, 0.023, mat=WOOD, k=0.003)
    Sp(G - u * 0.075, 0.026, mat=IRON, k=0.004)
    C(G - u * 0.045, G + u * 0.075, 0.025, 0.025, mat=LEATH, k=0.002)
    for t in (0.17, 0.26): C(G + u * t, G + u * (t + 0.022), 0.029, 0.029, mat=IRON, k=0.002)
    C(G + u * (WL - 0.13), G + u * (WL - 0.05), 0.027, 0.038, mat=IRON, k=0.003)
    bc = G + u * WL; Sp(bc, 0.074, mat=IRON, k=0.004)
    n = 22; ga = math.pi * (3 - math.sqrt(5))
    for q in range(n):
        y = 1 - 2 * (q + 0.5) / n; r = math.sqrt(1 - y * y); d_l = V(y, r * math.cos(ga * q), r * math.sin(ga * q))
        if d_l[0] < -0.72: continue
        d = Wf.T @ d_l; C(bc + d * 0.055, bc + d * 0.128, 0.019, 0.003, mat=IRON, k=0.003)
    # ---- 띠 (몸통 겉면을 따라): 왼쪽 어깨 → 오른쪽 허리 가죽 띠 · 허리띠
    sl = chest + Rc @ V(0.0, 0.10, -0.12); hr = pel + Rp @ V(0.0, 0.06, 0.14); dd = nrm(sl - hr); fw = Rc @ V(1.0, 0, 0)
    n_strap = nrm(np.cross(dd, fw))
    bands = [dict(c=(sl + hr) / 2, n=n_strap, w=0.024, th=0.013, mat=LEATH, ymin=(pel + Rp @ V(0, 0.06, 0))[1]),
             dict(c=pel + Rp @ V(0.0, 0.066, 0.0), n=Rp @ V(0, 1.0, 0), w=0.021, th=0.030, mat=LEATH, ymin=-9)]
    ex = dict(J=J, ball=G + u * WL, head=head, bands=bands, buckle=pel + Rp @ V(0.125, 0.066, 0.0))
    Sp(ex['buckle'], 0.02, mat=IRON, k=0.002)
    return torso, rest, ex


# ------------------------------------------------------------------ 부피 만들기 (몸통 → 겉면 복사 → 나머지 → 띠 → 머리카락 결)
def gi_vol(torso, rest, ex, h=1.0, margin=10.0):
    allp = torso + rest
    lo = np.min([p.lo for p in allp if p.op == 'u'], axis=0) - margin - 3 * h
    hi = np.max([p.hi for p in allp if p.op == 'u'], axis=0) + margin + 3 * h
    lo[1] = min(lo[1], -margin)
    v = Vol(lo, hi, h, margin)
    for p in torso: v.add(p)
    # 몸통 겉면 (띠를 두를 자리) — 몸통 상자 부분만 복사
    tlo = np.min([p.lo for p in torso], axis=0) - 6 * h; thi = np.max([p.hi for p in torso], axis=0) + 6 * h
    i0 = np.maximum(0, np.floor((tlo - v.lo) / h).astype(int)); i1 = np.minimum(np.array(v.n), np.ceil((thi - v.lo) / h).astype(int) + 1)
    sl = tuple(slice(a, b) for a, b in zip(i0, i1)); Dt = v.d[sl].copy()
    for p in rest: v.add(p)
    X = (v.lo[0] + np.arange(i0[0], i1[0]) * h).astype(np.float32)[:, None, None]
    Y = (v.lo[1] + np.arange(i0[1], i1[1]) * h).astype(np.float32)[None, :, None]
    Z = (v.lo[2] + np.arange(i0[2], i1[2]) * h).astype(np.float32)[None, None, :]
    for b in ex['bands']:
        c = b['c'] * S; n = b['n']; slab = np.abs((X - c[0]) * n[0] + (Y - c[1]) * n[1] + (Z - c[2]) * n[2]) - b['w'] * S
        band = np.maximum(Dt - b['th'] * S, slab)
        if b['ymin'] > -5: band = np.maximum(band, (b['ymin'] * S - Y))
        band = np.maximum(band, -Dt - 0.03 * S)   # 속은 비움 (겉껍질만)
        cur = v.d[sl]; m = band < cur; v.m[sl] = np.where(m, b['mat'], v.m[sl]); v.d[sl] = np.minimum(cur, band)
    # 머리카락 결: 머리카락 둘레만 잡음으로 들쭉날쭉
    hc = ex['head'] * S; r = 0.17 * S
    j0 = np.maximum(0, np.floor((hc - r - v.lo) / h).astype(int)); j1 = np.minimum(np.array(v.n), np.ceil((hc + r - v.lo) / h).astype(int) + 1)
    if np.all(j1 > j0):
        sl2 = tuple(slice(a, b) for a, b in zip(j0, j1)); sub = v.d[sl2]; mm = v.m[sl2] == HAIR
        Xh = (v.lo[0] + np.arange(j0[0], j1[0]) * h).astype(np.float32)[:, None, None]; Yh = (v.lo[1] + np.arange(j0[1], j1[1]) * h).astype(np.float32)[None, :, None]
        Zh = (v.lo[2] + np.arange(j0[2], j1[2]) * h).astype(np.float32)[None, None, :]
        sc = 0.016 * S; nz = fbm(NZ2, Xh / sc, Yh / (sc * 2.2), Zh / sc, 3)
        v.d[sl2] = np.where(mm & (sub < 4 * h), sub + (nz * 0.013 * S).astype(np.float32), sub)
    Yg = (v.lo[1] + np.arange(v.n[1]) * h).astype(np.float32)[None, :, None]; v.d = np.maximum(v.d, -Yg)   # 땅 아래는 잘라냄 (쇠공 가시·발바닥이 땅에 박힌 것처럼)
    v.crop(); return v


# ------------------------------------------------------------------ 표면 색
def shade_giant(vol, P, N, mat, view, Lm, ex):
    K = len(P); Vv = view.c; g = S
    def n3(nz, Q, s): return nz(Q[:, 0] / s, Q[:, 1] / s, Q[:, 2] / s)
    Nn = N.copy()
    # 잔 굴곡 (피부 결 · 쇠 두들긴 자국 · 가죽 털결)
    e = 0.8; bump = np.zeros_like(P); bs = 0.03 * g; f0 = n3(NZ, P, bs)
    for k in range(3):
        o = np.zeros(3); o[k] = e; bump[:, k] = (n3(NZ, P + o, bs) - f0) / e
    bt = bump - (np.sum(bump * N, 1))[:, None] * N
    amp = np.select([mat == SKIN, mat == HIDE, mat == IRON, mat == LEATH, mat == HAIR, mat == WOOD], [0.05, 0.25, 0.15, 0.15, 0.45, 0.10], 0.0)
    Nn = nrm(N - amp[:, None] * bt * bs)
    lo_ = n3(NZ2, P, 0.09 * g); mi_ = n3(NZ3, P, 0.03 * g)
    alb = np.zeros((K, 3)); ks = np.full(K, 0.08); kp = np.full(K, 14.0); emi = np.zeros((K, 3)); metal = np.zeros(K)
    m = mat == SKIN   # 회색빛 올리브 피부 · 얼룩 · 굴곡에 따라 붉은 기
    if m.any():
        base = np.array([0.118, 0.135, 0.098]); blot = np.array([0.098, 0.104, 0.082])
        t = np.clip(0.5 + 0.9 * lo_[m], 0, 1)[:, None]
        alb[m] = (base * (1 - t) + blot * t) * (0.95 + 0.08 * mi_[m])[:, None]
        ks[m] = 0.13; kp[m] = 16
    m = mat == HAIR
    if m.any(): alb[m] = np.array([0.016, 0.014, 0.013]) * (0.8 + 0.4 * mi_[m])[:, None]; ks[m] = 0.10; kp[m] = 20
    m = mat == HIDE   # 황토빛 가죽에 짙은 점박이 무늬
    if m.any():
        sp = fbm(NZ3, P[m, 0] / (0.03 * g), P[m, 1] / (0.03 * g), P[m, 2] / (0.03 * g), 2)
        spot = sstep(0.12, 0.2, sp)[:, None]; ring = (sstep(0.05, 0.12, sp) - sstep(0.12, 0.2, sp))[:, None]
        tan = np.array([0.36, 0.22, 0.095]) * (0.85 + 0.25 * lo_[m])[:, None]
        alb[m] = tan * (1 - spot) * (1 - 0.35 * ring) + np.array([0.045, 0.028, 0.016]) * spot; ks[m] = 0.06; kp[m] = 10
    m = mat == LEATH
    if m.any(): alb[m] = np.array([0.085, 0.045, 0.022]) * (0.8 + 0.35 * mi_[m])[:, None]; ks[m] = 0.22; kp[m] = 22
    m = mat == IRON   # 어두운 쇠 · 녹 얼룩
    if m.any():
        rust = sstep(0.32, 0.55, n3(NZ2, P[m], 0.035 * g))[:, None] * 0.8
        alb[m] = np.array([0.08, 0.082, 0.09]) * (1 - rust) + np.array([0.13, 0.065, 0.03]) * rust
        ks[m] = (1.4 * (1 - rust[:, 0]) + 0.25 * rust[:, 0]); kp[m] = 46; metal[m] = 1 - rust[:, 0] * 0.8
    m = mat == WOOD   # 자루: 결이 길게
    if m.any():
        J = ex['J']; u = J['wu']; G = J['wG'] * S; s = (P[m] - G) @ u
        grain = np.sin(s / (0.006 * g) + 6 * n3(NZ, P[m], 0.02 * g)) * 0.5 + 0.5
        alb[m] = np.array([0.10, 0.055, 0.025]) * (0.75 + 0.35 * grain)[:, None]; ks[m] = 0.12; kp[m] = 18
    m = mat == EYE
    if m.any(): alb[m] = [0.02, 0.016, 0.01]; ks[m] = 2.0; kp[m] = 120; emi[m] = [0.10, 0.065, 0.015]
    m = mat == MOUTH
    if m.any(): alb[m] = [0.05, 0.012, 0.012]; ks[m] = 0.2
    ndl = Nn @ Lm
    sh = soft_shadow(vol, P + N * 1.2, Lm, tmax=1.3 * g)
    ao = ambient_occ(vol, P, N, 0.022 * g, 5, 0.9)
    diff = np.clip((ndl + 0.06) / 1.06, 0, 1) ** 1.15
    sky = (SKY_DN[None] * (0.5 - 0.5 * Nn[:, 1:2]) + SKY_UP[None] * (0.5 + 0.5 * Nn[:, 1:2])) * ao[:, None]
    nv = np.clip(Nn @ Vv, 0, 1)
    rim = ((1 - nv) ** 3.0)[:, None] * np.array([0.42, 0.50, 0.56]) * (0.35 + 0.65 * ao[:, None])
    Hh = nrm(Lm + Vv); spec = (np.clip(Nn @ Hh, 0, 1) ** kp * ks)[:, None] * KEY_COL[None] * sh[:, None]
    sss = np.exp(-((ndl - 0.05) / 0.25) ** 2)[:, None] * np.array([0.022, 0.012, 0.009]) * (mat == SKIN)[:, None] * (0.4 + 0.6 * sh[:, None])
    # 쇠: 하늘 반사 (위를 볼수록 밝게)
    R = -Vv[None] + 2 * (Nn @ Vv)[:, None] * Nn
    env = (SKY_DN[None] * (0.5 - 0.5 * R[:, 1:2]) + SKY_UP[None] * 1.6 * (0.5 + 0.5 * R[:, 1:2])) * (0.25 + 0.75 * (1 - nv) ** 2)[:, None]
    col = alb * (KEY_COL[None] * (diff * sh)[:, None] + sky * 1.75) + rim * (0.5 + 0.5 * alb) * (1 - 0.5 * metal[:, None]) + spec + emi + sss * KEY_COL[None] + env * metal[:, None] * ao[:, None] * 0.9
    return col


def render_frame(anim, fi, rows=ROWS, ss=2, quick=False):
    P = gi_pose(anim, fi); torso, rest, ex = gi_build(P)
    vol = gi_vol(torso, rest, ex, 1.0 if not quick else 1.6, 10.0)
    out = []
    for row in rows:
        M = rot_row(row); Lm = M.T @ LKEY_W
        cs = np.array([[x, y, z] for x in (vol.lo[0] - 8, vol.hi[0] + 8) for y in (0.0, vol.hi[1]) for z in (vol.lo[2] - 8, vol.hi[2] + 8)])   # 땅 그림자가 칸에 다 들어가게 (몸 꼭대기까지)
        shp = cs - Lm[None] * (cs[:, 1] / Lm[1])[:, None]
        view = View(M, vol.lo, vol.hi, ss, shp)
        O, D, W, H = view.rays()
        hit, t = trace(vol, O, D)
        rgb = np.zeros((H * W, 3)); A = np.zeros(H * W)
        hid = np.nonzero(hit)[0]
        if len(hid):
            Ph = O[hid] + t[hid, None] * D; Nh = vol.grad(Ph); mat = vol.mat_at(Ph)
            rgb[hid] = shade_giant(vol, Ph, Nh, mat, view, Lm, ex); A[hid] = 1.0
        # 땅 그림자
        O1, D1, W1, H1 = view.rays(1)
        tg = -O1[:, 1] / D1[1]; Pg = O1 + tg[:, None] * D1
        near = np.zeros(len(Pg), bool)
        for hq in np.linspace(0, vol.hi[1], 7):
            Pq = Pg + Lm[None] * (hq / Lm[1])
            near |= (Pq[:, 0] > vol.lo[0] - 10) & (Pq[:, 0] < vol.hi[0] + 10) & (Pq[:, 2] > vol.lo[2] - 10) & (Pq[:, 2] < vol.hi[2] + 10)
        sha = np.zeros(H1 * W1)
        if near.any():
            Q = Pg[near] + np.array([0, 0.6, 0]); vis = soft_shadow(vol, Q, Lm, tmax=1.5 * S, k=5.0)
            dq = vol.sample(Q); ct = np.where(dq > vol.margin * 0.9, 1.0, np.clip(dq / (0.04 * S), 0, 1) ** 0.8)
            sha[near] = np.clip(np.maximum(1 - vis, (1 - ct) * 0.85), 0, 1) * 0.5
        sha = cv2.GaussianBlur(sha.reshape(H1, W1).astype(np.float32), (0, 0), 1.2)
        sha = np.repeat(np.repeat(sha, ss, 0), ss, 1).reshape(-1)
        rgb = rgb.reshape(H, W, 3); A = A.reshape(H, W); sha = sha.reshape(H, W)
        base_a = A + sha * (1 - A); base_c = rgb * A[..., None]
        img = finish(base_c, base_a, ss)
        b = ex['ball'] * S; bx, by = b @ view.r, b @ view.u
        out.append(dict(row=row, img=img, ax=-view.x0, ay=view.y1, tip=(float(bx), float(-by))))
    return out


# ------------------------------------------------------------------ 캐시 · 아틀라스 · 메타 · 미리 보기
def cache_path(anim, fi): return os.path.join(CACHE, f'{anim}_{fi}.npz')


def save_cache(anim, fi, out):
    os.makedirs(CACHE, exist_ok=True)
    d = {f'img{i}': o['img'] for i, o in enumerate(out)}
    d['meta'] = np.array(json.dumps([dict(row=o['row'], ax=o['ax'], ay=o['ay'], tip=o['tip']) for o in out]))
    np.savez_compressed(cache_path(anim, fi), **d)


def load_cache(anim, fi):
    z = np.load(cache_path(anim, fi)); M = json.loads(str(z['meta']))
    return [dict(img=z[f'img{i}'], **m) for i, m in enumerate(M)]


def run_task(t):
    anim, fi = t; t0 = time.time(); out = render_frame(anim, fi); save_cache(anim, fi, out)
    return f'{anim} {fi} {time.time() - t0:.1f}s'


FILES = ['giant']


def build_atlas(q=80, aq=88, write_meta=True):
    recs = []; an = {}; idx = 0
    for a, n in ANIMS:
        an[a] = [n, idx]
        for fi in range(n):
            for o in load_cache(a, fi):
                img, cx, cy = crop_alpha(o['img'], 3)
                recs.append(dict(img=img, ox=cx - int(round(o['ax'])), oy=cy - int(round(o['ay'])), tip=o['tip'], fid=0)); idx += 1
    area = sum(r['img'].shape[0] * r['img'].shape[1] for r in recs) * 1.1; Wd = int(min(4096, max(512, math.ceil(math.sqrt(area) / 64) * 64)))
    pos, Ht = shelf_pack([(r['img'].shape[1], r['img'].shape[0]) for r in recs], Wd)
    if Ht > 4096: print(f'!! atlas {Wd}x{Ht} > 4096')
    A = np.zeros((Ht, Wd, 4), np.uint8)
    for r, (x, y) in zip(recs, pos):
        h, w = r['img'].shape[:2]; A[y:y + h, x:x + w] = r['img']; r['sx'] = x; r['sy'] = y
    A[A[..., 3] == 0, :3] = 0
    p = os.path.join(ROOT, 'assets', 'forgotten', 'giant.webp'); os.makedirs(os.path.dirname(p), exist_ok=True)
    Image.fromarray(A, 'RGBA').save(p, 'WEBP', quality=q, alpha_quality=aq, method=6)
    print(f'giant.webp {Wd}x{Ht} {os.path.getsize(p) / 1024:.0f}KB  ({len(recs)} frames · decoded {Wd * Ht * 4 / 1e6:.1f}MB)')
    f = []
    for r in recs: f += [r['fid'], r['sx'], r['sy'], r['img'].shape[1], r['img'].shape[0], r['ox'], r['oy'], int(round(r['tip'][0])), int(round(r['tip'][1]))]
    js = {'files': FILES, 'rs': RS, 'rows': ROWS, 'an': an, 'f': f}
    txt = 'const GIA_META = ' + json.dumps(js, separators=(',', ':')) + ';'
    if write_meta:
        gp = os.path.join(ROOT, 'src', 'game.js'); s = open(gp, encoding='utf8').read(); a = s.find('/*GIA_META_BEGIN*/'); b = s.find('/*GIA_META_END*/')
        if a >= 0 and b > a and s.count('/*GIA_META_BEGIN*/') == 1:
            s = s[:a + len('/*GIA_META_BEGIN*/')] + txt + s[b:]; open(gp, 'w', encoding='utf8').write(s); print('game.js GIA_META', len(txt), 'bytes')
        else: print('!! game.js 에 /*GIA_META_BEGIN*/ … /*GIA_META_END*/ 표시가 없어 메타를 안 씀')
    return recs, an


def paste(can, im, x0, y0):
    h, w = im.shape[:2]; xa, ya = max(0, x0), max(0, y0); xb, yb = min(can.shape[1], x0 + w), min(can.shape[0], y0 + h)
    if xb <= xa or yb <= ya: return
    sub = im[ya - y0:yb - y0, xa - x0:xb - x0].astype(np.float32); a = sub[..., 3:4] / 255
    can[ya:yb, xa:xb] = sub[..., :3] * a + can[ya:yb, xa:xb] * (1 - a)


def contact_sheet(recs, an, path):
    """미리 보기: 줄마다 동작 하나 (2번 방향 · 모든 프레임) + 맨 아래 서 있기 8방향 (0·7·6은 뒤집기)"""
    nr = len(ROWS); CW, CH = 250, 320; ncol = max(n for _, n in ANIMS)
    can = np.zeros((CH * (len(ANIMS) + 1) + 30, CW * max(ncol, 8), 3), np.float32)
    for li in range(len(ANIMS) + 1):
        can[li * CH:(li + 1) * CH] = np.array([84, 92, 86], np.float32) if li % 2 == 0 else np.array([92, 98, 90], np.float32)
    for li, (a, n) in enumerate(ANIMS):
        st = an[a][1]
        for fi in range(n):
            r = recs[st + fi * nr + ROWS.index(2)]; paste(can, r['img'], int(fi * CW + CW / 2 + r['ox']), int(li * CH + CH - 50 + r['oy']))
    st = an['idle'][1]; li = len(ANIMS)
    for k, row in enumerate([1, 2, 3, 4, 5, 6, 7, 0]):
        rr = row if row in ROWS else {0: 2, 7: 3, 6: 4}[row]; r = recs[st + ROWS.index(rr)]; img = r['img']; ox = r['ox']
        if rr != row: img = img[:, ::-1]; ox = -(ox + img.shape[1])
        paste(can, img, int(k * CW + CW / 2 + ox), int(li * CH + CH - 50 + r['oy']))
    out = np.clip(can, 0, 255).astype(np.uint8)
    for li, (a, n) in enumerate(ANIMS + [('8 dirs', 8)]):
        cv2.putText(out, a, (8, li * CH + 22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (230, 230, 220), 1, cv2.LINE_AA)
    os.makedirs(os.path.dirname(path), exist_ok=True); Image.fromarray(out).save(path); print('preview', path)


def quick(anims, rows, frames=None, full=False):
    """빠른 미리 보기 (ss 1 · 성긴 부피) → dev/out/giant_quick.png"""
    cells = []
    for a in anims:
        n = dict(ANIMS)[a]
        for fi in (frames if frames is not None else range(n)):
            if fi >= n: continue
            t0 = time.time(); o = render_frame(a, fi, rows, 2 if full else 1, quick=not full); print(a, fi, f'{time.time() - t0:.1f}s', flush=True); cells.append(o)
    CW, CH = 250, 320; ncol = max(len(c) for c in cells); can = np.full((CH * len(cells), CW * ncol, 3), 88, np.float32)
    for i, outs in enumerate(cells):
        for k, o in enumerate(outs):
            img, cx, cy = crop_alpha(o['img']); paste(can, img, int(k * CW + CW / 2 + cx - o['ax']), int(i * CH + CH - 50 + cy - o['ay']))
    p = os.path.join(ROOT, 'dev', 'out', 'giant_quick.png'); im = Image.fromarray(np.clip(can, 0, 255).astype(np.uint8)); im = im.resize((im.width * 2, im.height * 2), Image.LANCZOS) if full and im.width <= 700 else im; im.save(p); print('quick', p)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--only', default=','.join(a for a, _ in ANIMS)); ap.add_argument('--jobs', type=int, default=2)
    ap.add_argument('--pack', action='store_true'); ap.add_argument('--skip', action='store_true'); ap.add_argument('--q', type=int, default=80)
    ap.add_argument('--quick', action='store_true'); ap.add_argument('--rows', default='2'); ap.add_argument('--frames', default=''); ap.add_argument('--full', action='store_true')
    a = ap.parse_args(); only = a.only.split(',')
    if a.quick:
        quick(only, [int(x) for x in a.rows.split(',')], [int(x) for x in a.frames.split(',')] if a.frames else None, a.full); return
    if not a.pack:
        T = [(an_, fi) for an_, n in ANIMS if an_ in only for fi in range(n)]
        if a.skip: T = [t for t in T if not os.path.exists(cache_path(*t))]
        t0 = time.time(); print(len(T), 'frames to render', flush=True)
        if a.jobs > 1:
            import multiprocessing as mp
            with mp.get_context('fork').Pool(a.jobs) as pool:
                for i, r in enumerate(pool.imap_unordered(run_task, T)): print(f'[{i + 1}/{len(T)}] {r}', flush=True)
        else:
            for i, t in enumerate(T): print(f'[{i + 1}/{len(T)}] {run_task(t)}', flush=True)
        print(f'render {time.time() - t0:.0f}s', flush=True)
    if all(os.path.exists(cache_path(an_, fi)) for an_, n in ANIMS for fi in range(n)):
        recs, an = build_atlas(a.q); contact_sheet(recs, an, os.path.join(ROOT, 'dev', 'out', 'giant_sheet_preview.png'))
    else: print('캐시가 다 없어서 아틀라스는 안 만듦')


if __name__ == '__main__':
    main()
