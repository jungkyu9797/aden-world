#!/usr/bin/env python3
# 11/6: 기란감옥 몬스터 6종 오프라인 렌더러 — dev/render_giant.py · render_dream.py 와 같은 방식 (numpy SDF 표면 · 외부 모델·그림·텍스처 없음)
#   컨셉(말로 받은 분위기)만 따서 새로 만든 오리지널 (리니지 리소스·트레이싱 없음):
#     gp_bandit  칼 산적      — 마른 몸 · 민머리에 붉은 머리띠 · 맨 상체 · 헐렁한 회녹색 바지 · 붉은 허리띠 · 휜 외날 칼 (한 손 사선 베기)
#     gp_archer  활 산적      — 초록 민소매 조끼 · 챙 작은 모자 · 짙은 바지 · 등에 화살통 · 긴 활 (당겼다 놓기)
#     gp_chief   산적두목     — 다부진 몸 · 갈색 머리·수염 · 올리브 웃옷 · 크림색 바지 · 장화 · 큰 손도끼 (머리 위로 들어 내려찍기)
#     gp_ghost   파우스트의 악령 — 다리 없이 떠 있는 두건 쓴 망령 · 해진 창백한 녹보라 로브 · 빛나는 눈 · 긴 손톱 (할퀴기) · 반투명
#     gp_klein   두목 클라인  — 보스 (1.3배) · 근육질 · 노랑·검정 줄무늬 가죽 조끼 · 크림색 통바지 + 줄무늬 각반 · 넓은 휜 대도 (크게 휘둘러 베기)
#     gp_faust   파우스트     — 보스 (1.5배) · 검붉은 로브 · 뿔 · 붉게 빛나는 눈 · 빛나는 보주 지팡이 (들어 올렸다 내리꽂기)
#   사용:  python3 dev/render_giran.py                      (전부 · 2코어)
#          python3 dev/render_giran.py --only gp_bandit,gp_ghost
#          python3 dev/render_giran.py --skip               (캐시에 있는 프레임은 건너뜀)
#          python3 dev/render_giran.py --pack               (캐시 dev/out/giran_cache 로 시트만 다시 만듦)
#          python3 dev/render_giran.py --quick gp_bandit --anim attack --rows 2   (빠른 미리 보기 → dev/out/giran_quick.png)
#   결과:  assets/classic/mon_<키>_{idle,walk,attack}.webp (MSHEET 형식: 가로 8프레임 × 세로 8방향 · 칸 크기 같음) · 칸 크기·기준점은 dev/out/giran_meta.json
#          → src/game.js /*GIRAN_ART_BEGIN*/ … /*GIRAN_ART_END*/ 를 이 스크립트가 갱신 · 미리 보기 dev/out/giran_preview.png
#   카메라·빛·방향: render_dream.py 그대로 (정사영 쿼터뷰 · 8줄 중 0·7·6줄은 2·3·4줄을 좌우로 뒤집어 씀)
#   좌표: GU = 키 단위 (머리 꼭대기 ≈ 1) · 출력 px = GU × S(몹마다) · 모델 x = 앞 · y = 위 · z = 오른쪽 (무기는 오른손 · 활은 왼손)
import sys, os, math, json, time, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import cv2
from PIL import Image
import render_dream as RD
from render_dream import (nrm, sstep, fbm, sd_round_cone, sd_ell, frame_from, Prim, P_sph, P_cone, P_ell, Vol, View, trace, soft_shadow,
                          ambient_occ, finish, crop_alpha, rot_row, LKEY_W, KEY_COL, SKY_UP, SKY_DN, NZ, NZ2, NZ3)

ROOT = RD.ROOT
CACHE = os.path.join(ROOT, 'dev', 'out', 'giran_cache')
ANIMS = [('idle', 8), ('walk', 8), ('attack', 8)]
ROWS = [1, 2, 3, 4, 5]
MIRROR = {0: 2, 7: 3, 6: 4}
L_UP, L_FO, L_TH, L_SH, ANK = 0.17, 0.15, 0.235, 0.235, 0.04

# 재질 번호
SKIN, HAIR, PANTS, CLOTH, LEATH, STEEL, WOOD, EYE, MOUTH, STRIPE, RED, BOOT, ROBE, GLOW, HORN, DARK, GSKIN, STRING, FEATH, CREAM = range(1, 21)


def hexlin(h, k=1.0):
    h = h.lstrip('#'); c = np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]); return (c ** 2.2) * k


# 몹 설정: S = 출력 px / GU (s 0.5 로 그려짐 → 화면 키 ≈ S × 0.87 × 0.5) · bw = 몸 두께 배율 · 색은 재질별 (sRGB, 밝기 배율)
MOBS = {
    'gp_bandit': dict(S=192, bw=0.95, style='slash', weapon='sword', top='bare', head='bald', band=True, sash=True, boots=False, pants='baggy',
                      col={SKIN: ('#b9784c', .62), PANTS: ('#69735f', .6), RED: ('#8e2a20', .7), LEATH: ('#4a2e1a', .6), STEEL: ('#c4c8cc', .5), BOOT: ('#3a2a1c', .6)}),
    'gp_archer': dict(S=190, bw=0.92, style='bow', weapon='bow', top='vest', head='hat', band=False, sash=False, boots=True, pants='slim', quiver=True,
                      col={SKIN: ('#b98058', .62), CLOTH: ('#3f5a2e', .62), PANTS: ('#3c3f38', .6), LEATH: ('#5a3a20', .6), WOOD: ('#6b4424', .7), BOOT: ('#2e2218', .6), FEATH: ('#d8d2c0', .6), HAIR: ('#2a1c12', .6)}),
    'gp_chief': dict(S=198, bw=1.14, style='chop', weapon='axe', top='tunic', head='hair', beard=True, band=False, sash=False, boots=True, pants='baggy', belt=True,
                     col={SKIN: ('#c08a60', .62), CLOTH: ('#556032', .62), PANTS: ('#d6ccb0', .55), HAIR: ('#5a3218', .6), LEATH: ('#4a2c18', .6), STEEL: ('#b8bcc0', .5), WOOD: ('#6a4626', .7), BOOT: ('#3a2616', .6)}),
    'gp_klein': dict(S=250, bw=1.28, style='sweep', weapon='falchion', top='stripe', head='topknot', beard=True, band=False, sash=True, boots=True, pants='baggy', wraps=True,
                     col={SKIN: ('#b8784a', .62), STRIPE: ('#d0a028', .7), PANTS: ('#ddd2b4', .55), HAIR: ('#3a2414', .6), RED: ('#5a3a1a', .6), LEATH: ('#3a2414', .6), STEEL: ('#c8ccd0', .55), BOOT: ('#2a1e14', .6)}),
    'gp_ghost': dict(S=190, bw=0.9, style='claw', weapon='claws', top='robe', head='hood', ghost=True,
                     col={ROBE: ('#7d9a88', .55), DARK: ('#141a1c', .5), GSKIN: ('#9fb0a0', .55), GLOW: ('#7dffb0', 1.0), CLOTH: ('#5c4e74', .55)}),
    'gp_faust': dict(S=285, bw=1.2, style='cast', weapon='staff', top='robe', head='horned', faust=True,
                     col={ROBE: ('#5a1218', .6), DARK: ('#1a0e10', .55), SKIN: ('#7a3a2c', .6), HORN: ('#d8ccb0', .6), GLOW: ('#ff4a30', 1.0), WOOD: ('#2a1a14', .6), STEEL: ('#a08a5a', .55), CLOTH: ('#2a0a0e', .55)}),
}


def Rx(a):
    a = math.radians(a); c, s = math.cos(a), math.sin(a); return np.array([[1.0, 0, 0], [0, c, -s], [0, s, c]])


def Ry(a):
    a = math.radians(a); c, s = math.cos(a), math.sin(a); return np.array([[c, 0, s], [0, 1.0, 0], [-s, 0, c]])


def Rz(a):
    a = math.radians(a); c, s = math.cos(a), math.sin(a); return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1.0]])


def bend(a): return Rz(-a)
def V(*a): return np.array(a, float)
def lerp(a, b, t): return a + (b - a) * t


def ik2(a, t, l1, l2, pole):
    a = np.asarray(a, float); t = np.asarray(t, float); v = t - a; d0 = float(np.linalg.norm(v)); dv = v / max(d0, 1e-9)
    d = min(max(d0, abs(l1 - l2) + 1e-4), l1 + l2 - 1e-4)
    ca = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d); sa = math.sqrt(max(0.0, 1 - ca * ca))
    p = np.asarray(pole, float); p = p - (p @ dv) * dv
    p = p / np.linalg.norm(p) if np.linalg.norm(p) > 1e-6 else frame_from(dv)[1]
    return a + dv * l1 * ca + p * l1 * sa, a + dv * d


def foot_cycle(ph, A=0.13, lift=0.06, duty=0.58):
    ph %= 1.0
    if ph < duty:
        s = ph / duty; return A * (1 - 2 * s), 0.0, 0.0
    s = (ph - duty) / (1 - duty); e = s * s * (3 - 2 * s)
    return A * (-1 + 2 * e), lift * math.sin(math.pi * s), 18 * math.sin(math.pi * s) - 10 * s


# ------------------------------------------------------------------ 자세
def base_pose():
    return dict(pel=V(0.0, 0.50, 0.0), yaw=0.0, bend=4.0, twist=0.0, roll=0.0, hp=-4.0, hy=0.0, br=0.0, jaw=0.0,
                FL=V(0.0, ANK, -0.085), FR=V(-0.01, ANK, 0.09), fpL=0.0, fpR=0.0, kpL=V(1.0, 0, -0.2), kpR=V(1.0, 0, 0.2),
                HR=V(0.06, 0.47, 0.20), HL=V(0.02, 0.47, -0.20), epR=V(-0.6, -0.3, 0.5), epL=V(-0.6, -0.3, -0.5),
                wdir=nrm(V(0.55, -0.6, 0.12)), draw=0.0, arrow=False, glow=0.0, bob=0.0, hem=0.0)


def walk_legs(P, ph, A=0.13):
    T2 = 2 * math.pi
    xL, yL, pL = foot_cycle(ph + 0.5, A); xR, yR, pR = foot_cycle(ph, A)
    P['FL'] = V(xL, ANK + yL, -0.08); P['FR'] = V(xR, ANK + yR, 0.085); P['fpL'] = pL; P['fpR'] = pR
    P['pel'] = V(0.0, 0.49 + 0.012 * math.cos(T2 * 2 * ph), 0.0); P['yaw'] = 5 * math.sin(T2 * ph); P['twist'] = -8 * math.sin(T2 * ph)
    P['roll'] = 3 * math.sin(T2 * ph + 0.5)


KEYS = {   # 공격 키 프레임: (오른손, 무기 방향, yaw, twist, bend, 왼손, 앞발 x)
    'slash': [((0.12, 0.56, 0.20), (0.6, 0.55, 0.15), -4, -10, 6, (0.05, 0.50, -0.20), 0.06),
              ((0.00, 0.84, 0.22), (-0.45, 0.85, 0.25), -10, -28, 2, (0.15, 0.62, -0.18), 0.08),
              ((0.06, 0.94, 0.17), (-0.35, 0.92, 0.0), -12, -34, 0, (0.18, 0.66, -0.16), 0.10),
              ((0.30, 0.80, 0.08), (0.65, 0.72, -0.1), 4, 0, 10, (0.10, 0.58, -0.20), 0.14),
              ((0.40, 0.58, -0.04), (0.85, -0.15, -0.5), 12, 26, 16, (0.00, 0.52, -0.22), 0.16),
              ((0.32, 0.42, -0.16), (0.35, -0.65, -0.68), 14, 32, 18, (-0.04, 0.50, -0.22), 0.16),
              ((0.24, 0.42, -0.06), (0.35, -0.85, -0.3), 8, 18, 12, (0.00, 0.50, -0.21), 0.12),
              ((0.14, 0.50, 0.12), (0.6, 0.15, 0.2), 0, 2, 7, (0.04, 0.49, -0.20), 0.07)],
    'sweep': [((0.10, 0.62, 0.24), (-0.2, 0.7, 0.7), -6, -18, 8, (0.12, 0.55, -0.18), 0.06),
              ((-0.06, 0.72, 0.28), (-0.85, 0.35, 0.4), -14, -38, 6, (0.20, 0.60, -0.14), 0.08),
              ((0.02, 0.70, 0.30), (-0.3, 0.1, 0.95), -8, -20, 10, (0.18, 0.58, -0.16), 0.12),
              ((0.30, 0.66, 0.12), (0.85, 0.0, 0.52), 6, 12, 14, (0.08, 0.55, -0.20), 0.16),
              ((0.34, 0.62, -0.10), (0.8, -0.05, -0.58), 14, 34, 16, (-0.04, 0.52, -0.22), 0.17),
              ((0.16, 0.60, -0.28), (0.15, -0.2, -0.97), 18, 44, 14, (-0.10, 0.50, -0.22), 0.16),
              ((0.14, 0.52, -0.12), (0.55, -0.6, -0.5), 10, 22, 10, (-0.04, 0.50, -0.21), 0.12),
              ((0.12, 0.52, 0.14), (0.5, -0.2, 0.6), 2, 4, 8, (0.06, 0.50, -0.20), 0.07)],
    'chop':  [((0.14, 0.58, 0.18), (0.55, 0.65, 0.05), 0, -6, 6, (0.10, 0.52, -0.20), 0.06),
              ((0.06, 0.86, 0.16), (-0.15, 0.95, 0.05), -4, -14, 0, (0.20, 0.66, -0.16), 0.08),
              ((-0.04, 1.02, 0.12), (-0.75, 0.6, 0.0), -6, -18, -8, (0.26, 0.74, -0.14), 0.10),
              ((-0.07, 1.05, 0.10), (-0.97, 0.15, 0.0), -6, -20, -10, (0.26, 0.76, -0.14), 0.10),
              ((0.20, 0.94, 0.08), (0.45, 0.88, 0.0), 2, -4, 8, (0.18, 0.64, -0.18), 0.15),
              ((0.40, 0.62, 0.05), (0.9, -0.35, 0.0), 6, 8, 24, (0.10, 0.52, -0.20), 0.18),
              ((0.38, 0.40, 0.05), (0.45, -0.88, 0.0), 6, 10, 30, (0.08, 0.48, -0.20), 0.18),
              ((0.24, 0.48, 0.12), (0.65, -0.1, 0.05), 2, 4, 14, (0.08, 0.50, -0.20), 0.10)],
}


def pose(cfg, anim, fi):
    st = cfg['style']; nf = dict(ANIMS)[anim]; ph = fi / nf; T2 = 2 * math.pi; P = base_pose(); w = math.sin(T2 * ph); w2 = math.sin(T2 * ph + 1.3)
    if st in ('claw',):   # 망령: 떠 있음 · 다리 없음
        P['bob'] = 0.02 * math.sin(T2 * ph); P['pel'] = V(0.0, 0.50 + P['bob'], 0.0); P['hem'] = ph
        if anim == 'idle':
            P['bend'] = 10 + 2 * w; P['hp'] = 4; P['HR'] = V(0.20, 0.55 + 0.02 * w, 0.18); P['HL'] = V(0.20, 0.55 - 0.02 * w, -0.18)
            P['epR'] = V(-0.3, -0.6, 0.6); P['epL'] = V(-0.3, -0.6, -0.6); P['twist'] = 4 * w2
        elif anim == 'walk':
            P['bend'] = 22; P['hp'] = 8; P['pel'] = V(0.0, 0.52 + 0.025 * math.sin(T2 * ph * 2), 0.0)
            P['HR'] = V(0.02, 0.50 + 0.03 * w, 0.20); P['HL'] = V(0.02, 0.50 - 0.03 * w, -0.20); P['yaw'] = 4 * w
        else:
            K = [((0.22, 0.60, 0.20), 0, 10), ((0.02, 0.86, 0.30), -20, 6), ((-0.02, 0.92, 0.28), -26, 4), ((0.36, 0.74, 0.10), 6, 16),
                 ((0.44, 0.52, -0.10), 26, 24), ((0.30, 0.42, -0.24), 34, 26), ((0.24, 0.48, -0.06), 18, 18), ((0.22, 0.56, 0.16), 4, 12)][fi]
            P['HR'] = V(*K[0]); P['twist'] = K[1]; P['bend'] = K[2]; P['HL'] = V(0.24, 0.56, -0.18); P['epR'] = V(-0.4, -0.3, 0.7); P['hp'] = 6
            P['glow'] = 1.0 if 3 <= fi <= 5 else 0.3
        return P
    if st == 'cast':   # 파우스트: 긴 로브 (발은 로브 아래)
        P['hem'] = ph
        if anim == 'idle':
            P['br'] = 0.02 * w; P['bend'] = 3 + w; P['HR'] = V(0.10, 0.50 + 0.01 * w, 0.21); P['wdir'] = nrm(V(0.05, 1.0, 0.02)); P['HL'] = V(0.16, 0.56 + 0.015 * w2, -0.17)
            P['epL'] = V(-0.5, -0.4, -0.5); P['glow'] = 0.6 + 0.2 * w
        elif anim == 'walk':
            walk_legs(P, ph, 0.10); P['bend'] = 8; P['HR'] = V(0.10 + 0.03 * w, 0.52, 0.21); P['wdir'] = nrm(V(0.15 + 0.1 * w, 1.0, 0.02)); P['HL'] = V(0.04 - 0.06 * w, 0.48, -0.20); P['glow'] = 0.6
        else:
            K = [((0.12, 0.55, 0.21), (0.1, 1.0, 0.0), 2, (0.18, 0.58, -0.17), 0.6), ((0.10, 0.80, 0.20), (0.0, 1.0, 0.05), -4, (0.22, 0.70, -0.16), 0.8),
                 ((0.06, 1.02, 0.14), (-0.15, 1.0, 0.0), -10, (0.12, 0.92, -0.14), 1.0), ((0.04, 1.08, 0.12), (-0.3, 0.95, 0.0), -12, (0.08, 1.0, -0.12), 1.3),
                 ((0.30, 0.90, 0.10), (0.8, 0.6, 0.0), 10, (0.40, 0.80, -0.14), 1.5), ((0.40, 0.66, 0.08), (0.95, -0.1, 0.0), 22, (0.44, 0.66, -0.14), 1.4),
                 ((0.36, 0.58, 0.10), (0.85, -0.3, 0.0), 18, (0.34, 0.60, -0.16), 1.0), ((0.18, 0.54, 0.18), (0.3, 0.95, 0.0), 6, (0.20, 0.58, -0.17), 0.7)][fi]
            P['HR'] = V(*K[0]); P['wdir'] = nrm(V(*K[1])); P['bend'] = K[2]; P['HL'] = V(*K[3]); P['glow'] = K[4]; P['epL'] = V(-0.5, -0.4, -0.5); P['epR'] = V(-0.5, -0.3, 0.6)
            P['FL'] = V(0.06 if fi >= 4 else 0.0, ANK, -0.09)
        return P
    if st == 'bow':
        if anim == 'idle':
            P['br'] = 0.02 * w; P['HL'] = V(0.10, 0.50 + 0.01 * w, -0.19); P['HR'] = V(0.02, 0.47, 0.20); P['hp'] = -4 + 2 * w2; P['hy'] = 6 * math.sin(T2 * ph + 0.4)
        elif anim == 'walk':
            walk_legs(P, ph); P['bend'] = 9; P['HL'] = V(0.12 + 0.04 * math.cos(T2 * ph), 0.50, -0.19); P['HR'] = V(0.02 - 0.10 * math.cos(T2 * ph), 0.47, 0.20)
        else:   # 몸을 옆으로 돌려 왼팔을 앞으로 · 오른손으로 시위를 턱까지 당겼다 놓음
            dr = [0.0, 0.25, 0.6, 0.9, 1.0, 1.0, 0.0, 0.0][fi]
            P['twist'] = -42 if fi < 7 else -20; P['yaw'] = -12 if fi < 7 else -6; P['bend'] = 2; P['hp'] = -2; P['hy'] = 34 if fi < 7 else 16
            P['HL'] = V(0.40, 0.80, 0.02) if fi < 7 else V(0.24, 0.62, -0.12); P['epL'] = V(-0.2, -0.8, -0.4)
            nock = V(0.34, 0.80, 0.03); chin = V(0.04, 0.85, 0.10)
            P['HR'] = lerp(nock, chin, dr) if fi < 6 else (V(-0.04, 0.88, 0.16) if fi == 6 else V(0.04, 0.60, 0.18))
            P['epR'] = V(-0.3, 0.2, 0.9); P['draw'] = dr; P['arrow'] = fi < 6
            P['FL'] = V(0.10, ANK, -0.10); P['FR'] = V(-0.08, ANK, 0.10)
        return P
    # 칼·도끼·대도
    if anim == 'idle':
        P['br'] = 0.02 * w; P['pel'] = V(0.0, 0.50 - 0.004 * w, 0.0); P['hp'] = -4 + 2 * w2; P['hy'] = 6 * math.sin(T2 * ph + 0.4); P['twist'] = 2 * w2
        P['HR'] = V(0.08, 0.48 + 0.008 * w, 0.20); P['HL'] = V(0.03, 0.47 + 0.006 * w2, -0.20)
        if st == 'chop': P['wdir'] = nrm(V(0.35, -0.85, 0.15))
        if st == 'sweep': P['wdir'] = nrm(V(0.75, -0.55, 0.2)); P['HR'] = V(0.10, 0.50, 0.22)
    elif anim == 'walk':
        walk_legs(P, ph); P['bend'] = 9
        P['HR'] = V(0.06 - 0.10 * math.cos(T2 * ph), 0.48 + 0.02 * abs(math.cos(T2 * ph)), 0.20); P['HL'] = V(0.03 + 0.10 * math.cos(T2 * ph), 0.47, -0.20)
        P['wdir'] = nrm(V(0.55, -0.6, 0.15)) if st != 'chop' else nrm(V(0.3, -0.9, 0.15))
    else:
        hr, wd, yaw, tw, bd, hl, fx = KEYS[st][fi]
        P['HR'] = V(*hr); P['wdir'] = nrm(V(*wd)); P['yaw'] = yaw; P['twist'] = tw; P['bend'] = bd; P['HL'] = V(*hl); P['hy'] = -tw * 0.3
        P['FL'] = V(fx, ANK, -0.09); P['FR'] = V(-0.05, ANK, 0.10); P['pel'] = V(0.0, 0.49 - 0.03 * (bd > 14), 0.0)
        P['epR'] = V(-0.4, -0.5, 0.6) if fi < 3 else V(-0.3, -0.7, 0.4); P['jaw'] = 0.6 if fi in (3, 4) else 0.0
    return P


# ------------------------------------------------------------------ 뼈대
def skel(P, cfg):
    J = {}; pel = P['pel']; bw = cfg['bw']
    Rp = Ry(P['yaw']) @ Rx(P['roll'] * 0.5)
    Rw = Rp @ Ry(P['twist'] * 0.45) @ bend(P['bend'] * 0.5)
    Rc = Rp @ Ry(P['twist']) @ bend(P['bend'])
    Rh = Rc @ Ry(P['hy']) @ bend(P['hp'] - P['bend'] * 0.55)
    J.update(Rp=Rp, Rw=Rw, Rc=Rc, Rh=Rh, pel=pel)
    J['waist'] = pel + Rw @ V(0.0, 0.11, 0.0); J['chest'] = J['waist'] + Rc @ V(0.0, 0.13, 0.0)
    J['neck'] = J['chest'] + Rc @ V(0.012, 0.115, 0.0); J['head'] = J['neck'] + Rh @ V(0.018, 0.072, 0.0)
    for sd, sg in (('L', -1), ('R', 1)):
        J['hip' + sd] = pel + Rp @ V(0.0, -0.03, sg * 0.075 * bw)
        J['sh' + sd] = J['chest'] + Rc @ V(-0.005, 0.075, sg * 0.15 * bw)
        kn, an = ik2(J['hip' + sd], P['F' + sd], L_TH, L_SH, P['kp' + sd]); J['kn' + sd] = kn; J['an' + sd] = an
    el, hd = ik2(J['shR'], P['HR'], L_UP, L_FO + 0.035, P['epR']); J['elR'] = el; J['hdR'] = hd
    el, hd = ik2(J['shL'], P['HL'], L_UP, L_FO + 0.035, P['epL']); J['elL'] = el; J['hdL'] = hd
    return J


def P_slabcut(f, c, n, w):
    c = np.asarray(c, float); n = nrm(n)
    return lambda X, Y, Z: np.maximum(f(X, Y, Z), np.abs((X - c[0]) * n[0] + (Y - c[1]) * n[1] + (Z - c[2]) * n[2]) - w)


# ------------------------------------------------------------------ 모양
def build(P, cfg):
    S = cfg['S']; bw = cfg['bw']; J = skel(P, cfg); prims = []; ex = dict(J=J, glow=[])
    Rp, Rw, Rc, Rh = J['Rp'], J['Rw'], J['Rc'], J['Rh']; br = 1 + P['br']

    def E(c, R, r, mat=SKIN, k=0.012, op='u'):
        prims.append(P_ell(np.asarray(c) * S, np.asarray(R).T, np.asarray(r) * S, mat, k * S, op))

    def EA(a, b, rw, rd, mat=SKIN, k=0.012, up=(0, 1, 0)):
        a = np.asarray(a); b = np.asarray(b); c = (a + b) / 2; L = np.linalg.norm(b - a) / 2
        prims.append(P_ell(c * S, frame_from(b - a, up), np.array([max(L, 1e-3), rd, rw]) * S, mat, k * S))

    def C(a, b, r1, r2, mat=SKIN, k=0.008, op='u'):
        prims.append(P_cone(np.asarray(a) * S, np.asarray(b) * S, r1 * S, r2 * S, mat, k * S, op))

    def Sp(c, r, mat=SKIN, k=0.004, op='u'):
        prims.append(P_sph(np.asarray(c) * S, r * S, mat, k * S, op))

    def band(fsd, c, n, w, lo, hi, mat):   # 도형을 판으로 잘라 띠로
        prims.append(Prim(P_slabcut(fsd, np.asarray(c) * S, n, w * S), np.asarray(lo) * S, np.asarray(hi) * S, mat, 0.002 * S))

    pel, waist, chest, neck, head = J['pel'], J['waist'], J['chest'], J['neck'], J['head']
    top = cfg['top']; robe = top == 'robe'; ghost = cfg.get('ghost'); faust = cfg.get('faust')
    TM = {'bare': SKIN, 'vest': CLOTH, 'tunic': CLOTH, 'stripe': STRIPE, 'robe': ROBE}[top]
    # ---- 몸통
    if not ghost:
        E(pel + Rp @ V(0.0, 0.01, 0.0), Rp, (0.078 * bw, 0.072, 0.105 * bw), mat=PANTS if not robe else ROBE, k=0.02)
    E(waist + Rw @ V(0.012, 0.0, 0.0), Rw, (0.074 * bw * br, 0.075, 0.098 * bw), mat=TM, k=0.025)
    E(chest + Rc @ V(0.0, 0.0, 0.0), Rc, (0.085 * bw * br, 0.10, 0.125 * bw * br), mat=TM, k=0.025)
    if top == 'bare' or top == 'stripe':
        for sg in (-1, 1): E(chest + Rc @ V(0.042, 0.035, sg * 0.055 * bw), Rc @ Ry(sg * 10), (0.032 * bw, 0.042, 0.064 * bw), mat=SKIN if top == 'bare' else STRIPE, k=0.035)
    if top == 'stripe':   # 조끼 앞섶이 벌어져 가슴 가운데 맨살
        E(chest + Rc @ V(0.075 * bw, 0.0, 0.0), Rc, (0.03, 0.1, 0.03 * bw), mat=SKIN, k=0.01)
    for sd, sg in (('L', -1), ('R', 1)):
        sh = J['sh' + sd]; a = nrm(J['el' + sd] - sh)
        E(sh + a * 0.005 + Rc @ V(0, -0.005, 0), frame_from(a).T, (0.048 * bw, 0.044 * bw, 0.046 * bw), mat=TM if top in ('tunic', 'robe') else SKIN, k=0.035)   # 어깨
    C(neck + Rc @ V(-0.01, -0.02, 0.0), head + Rh @ V(-0.01, -0.03, 0.0), 0.04 * bw, 0.034, mat=SKIN if not ghost else DARK, k=0.015)
    # ---- 다리 (망령은 없음 · 파우스트는 로브 아래 발만)
    for sd, sg in (('L', -1), ('R', 1)):
        if ghost: break
        hp_, kn, an = J['hip' + sd], J['kn' + sd], J['an' + sd]; fp = P['fp' + sd]
        fdir = nrm(Rp @ V(1.0, 0.0, sg * 0.12)); fdir = nrm(Rz(fp) @ fdir) if fp else fdir
        if not robe:
            pm = cfg['pants'] == 'baggy'
            C(hp_, kn, 0.068 * bw * (1.12 if pm else 1.0), 0.056 * bw * (1.15 if pm else 1.0), mat=PANTS, k=0.02)
            Sp(kn, 0.054 * bw * (1.12 if pm else 1.0), mat=PANTS)
            if cfg.get('boots'):
                C(kn, lerp(kn, an, 0.45), 0.056 * bw * (1.15 if pm else 1.0), 0.05 * bw, mat=PANTS, k=0.015)
                C(lerp(kn, an, 0.4), an, 0.045 * bw, 0.04 * bw, mat=BOOT, k=0.01)
                Sp(lerp(kn, an, 0.42), 0.047 * bw, mat=BOOT)   # 장화 목
            else:
                C(kn, lerp(kn, an, 0.85), 0.058 * bw * (1.15 if pm else 1.0), 0.05 * bw * (1.2 if pm else 1.0), mat=PANTS, k=0.015)
                C(lerp(kn, an, 0.82), an, 0.036, 0.032, mat=SKIN if not cfg.get('wraps') else STRIPE, k=0.008)
                Sp(lerp(kn, an, 0.8), 0.04 * bw, mat=PANTS)   # 바짓단 묶음
            if cfg.get('wraps'):   # 줄무늬 각반
                C(lerp(kn, an, 0.45), an, 0.05 * bw, 0.044 * bw, mat=STRIPE, k=0.008)
        fm = BOOT if (cfg.get('boots') or robe) else LEATH
        fc = an + fdir * 0.035 + V(0, -0.02, 0); E(fc, frame_from(fdir).T, (0.065, 0.024, 0.036 * bw), mat=fm if not robe else DARK, k=0.012)
        Sp(an, 0.034, mat=fm if not robe else DARK, k=0.01)
    # ---- 웃옷 아랫단 (웃옷: 허리 아래로 넓적다리 위까지) · 허리띠 · 띠
    if top == 'tunic':
        def hem(X, Y, Z, pc=pel * S, RpT=Rp.T, s=S):
            px = (X - pc[0]) / s; py = (Y - pc[1]) / s; pz = (Z - pc[2]) / s
            qx = RpT[0, 0] * px + RpT[0, 1] * py + RpT[0, 2] * pz; qy = RpT[1, 0] * px + RpT[1, 1] * py + RpT[1, 2] * pz; qz = RpT[2, 0] * px + RpT[2, 1] * py + RpT[2, 2] * pz
            t = np.clip((0.08 - qy) / 0.2, 0, 1.2); rx = (0.085 + 0.03 * t) * bw; rz = (0.112 + 0.035 * t) * bw
            th = np.arctan2(qz, qx); yb = -0.11 + 0.01 * np.sin(6 * th)
            e = np.sqrt((qx / rx) ** 2 + (qz / rz) ** 2)
            return np.maximum((e - 1) * np.minimum(rx, rz), np.maximum(qy - 0.08, yb - qy)) * s
        prims.append(Prim(hem, pel * S - 0.3 * S, pel * S + 0.3 * S, CLOTH, 0.004 * S))
        for sd in 'LR':   # 짧은 소매
            sh, el = J['sh' + sd], J['el' + sd]; C(sh, lerp(sh, el, 0.55), 0.058 * bw, 0.05 * bw, mat=CLOTH, k=0.012)
    if top == 'vest':   # 조끼 아랫단 조금
        E(waist + Rw @ V(0.0, -0.06, 0.0), Rw, (0.08 * bw, 0.05, 0.104 * bw), mat=CLOTH, k=0.02)
    if cfg.get('sash') or cfg.get('belt'):
        c = waist + Rw @ V(0.01, -0.055, 0.0); n = Rw @ V(0, 1.0, 0); m = RED if cfg.get('sash') else LEATH
        band(lambda X, Y, Z, c_=c * S, R_=Rw.T, r_=np.array([0.088 * bw, 0.09, 0.112 * bw]) * S: sd_ell(X, Y, Z, c_, R_, r_), c, n, 0.026 if cfg.get('sash') else 0.018, c - 0.2, c + 0.2, m)
        if cfg.get('sash'):   # 매듭 끝자락
            k0 = c + Rw @ V(0.04, 0.0, 0.1 * bw); C(k0, k0 + Rw @ V(0.01, -0.12, 0.02), 0.022, 0.012, mat=m, k=0.008)
        else:
            Sp(c + Rw @ V(0.09 * bw, 0.0, 0.0), 0.018, mat=STEEL)
    if cfg.get('quiver'):   # 등에 화살통 (오른쪽 어깨 뒤로 비스듬히)
        a = chest + Rc @ V(-0.11, -0.12, -0.06); b = chest + Rc @ V(-0.12, 0.14, 0.09)
        C(a, b, 0.032, 0.036, mat=LEATH, k=0.004)
        for q in range(4):
            o = Rc @ V(0.0, 0.0, (q - 1.5) * 0.014); C(b + o, b + o + nrm(b - a) * 0.07, 0.006, 0.004, mat=WOOD); E(b + o + nrm(b - a) * 0.075, frame_from(nrm(b - a)).T, (0.028, 0.004, 0.012), mat=FEATH, k=0.002)
        band(lambda X, Y, Z, c_=chest * S, R_=Rc.T, r_=np.array([0.09 * bw, 0.105, 0.13 * bw]) * S: sd_ell(X, Y, Z, c_, R_, r_ * 1.06), chest, nrm(Rc @ V(0.0, 0.55, 0.85)), 0.012, chest - 0.2, chest + 0.2, LEATH)
    # ---- 로브 (망령·파우스트)
    if robe:
        y_top = (chest + Rc @ V(0, 0.06, 0))[1]; floor_y = 0.03 + (0.12 + P['bob'] if ghost else 0.0)
        cx = waist + Rw @ V(0.0, 0.0, 0.0); RpT = Rp.T; hph = P['hem'] * 2 * math.pi; lean = (Rc @ V(0, 1, 0))
        def robe_f(X, Y, Z, cxs=cx * S, s=S):
            px = (X - cxs[0]) / s; py = Y / s; pz = (Z - cxs[2]) / s
            t = np.clip((y_top - py) / max(y_top - floor_y, 0.1), 0, 1.15)
            sx = lean[0] / max(lean[1], 0.3) * (py - cx[1]) * 0.8
            qx = RpT[0, 0] * (px - sx) + RpT[0, 2] * pz; qz = RpT[2, 0] * (px - sx) + RpT[2, 2] * pz
            fl = 1.0 if not ghost else 0.85
            fl = fl if ghost else 0.7
            rx = (0.08 + (0.07 + 0.08 * t) * t * fl) * bw; rz = (0.11 + (0.08 + 0.08 * t) * t * fl) * bw
            th = np.arctan2(qz, qx)
            jag = (0.03 * (np.sin(7 * th + hph) + 0.6 * np.sin(13 * th - 2 * hph + 1.0) + 0.4 * np.sin(23 * th + 0.4))) if ghost else 0.006 * np.sin(5 * th + hph)
            e = np.sqrt((qx / rx) ** 2 + (qz / rz) ** 2) - (0 if ghost else 0.06 * t * np.abs(np.sin(5.5 * th)))
            return np.maximum((e - 1) * np.minimum(rx, rz), np.maximum(py - y_top, floor_y + jag + (0.02 if ghost else 0.0) - py)) * s
        lo = V(-0.5, -0.05, -0.5) * S + V(cx[0] * S, 0, cx[2] * S); hi = V(0.5, y_top + 0.05, 0.5) * S + V(cx[0] * S, 0, cx[2] * S)
        prims.append(Prim(robe_f, lo, hi, ROBE, 0.006 * S))
        if faust:   # 망토 깃 (어깨 위로 솟은 높은 깃) + 가슴 장식
            for sg in (-1, 1): C(chest + Rc @ V(-0.02, 0.09, sg * 0.10 * bw), chest + Rc @ V(-0.06, 0.22, sg * 0.15 * bw), 0.05, 0.012, mat=CLOTH, k=0.01)
            Sp(chest + Rc @ V(0.09 * bw, 0.02, 0.0), 0.022, mat=GLOW); ex['glow'].append((chest + Rc @ V(0.09 * bw, 0.02, 0.0), 0.018))
            band(lambda X, Y, Z, c_=(waist + Rw @ V(0, -0.02, 0)) * S, R_=Rw.T, r_=np.array([0.09 * bw, 0.09, 0.118 * bw]) * S: sd_ell(X, Y, Z, c_, R_, r_), waist + Rw @ V(0, -0.02, 0), Rw @ V(0, 1, 0), 0.02, waist - 0.25, waist + 0.25, STEEL)
        if ghost:   # 허리에 해진 보랏빛 천 띠
            c = waist + Rw @ V(0, -0.02, 0)
            band(lambda X, Y, Z, c_=c * S, R_=Rw.T, r_=np.array([0.088 * bw, 0.09, 0.115 * bw]) * S: sd_ell(X, Y, Z, c_, R_, r_), c, Rw @ V(0, 1, 0), 0.02, c - 0.25, c + 0.25, CLOTH)
            for q in range(3): k0 = c + Rw @ V(0.06, -0.01, (q - 1) * 0.05); C(k0, k0 + V(0.01, -0.14 - 0.03 * q, 0.0), 0.016, 0.005, mat=CLOTH, k=0.006)
    # ---- 팔
    for sd, sg in (('L', -1), ('R', 1)):
        sh, el, hd = J['sh' + sd], J['el' + sd], J['hd' + sd]; ua = nrm(el - sh); fa = nrm(hd - el); wr = el + fa * L_FO
        am = ROBE if robe else SKIN; fm_ = GSKIN if ghost else SKIN
        C(sh, el, 0.044 * bw, 0.036 * bw, mat=am, k=0.012)
        if top in ('bare', 'stripe', 'vest', 'tunic'): EA(sh + ua * 0.04, sh + ua * 0.14, 0.04 * bw, 0.042 * bw, mat=SKIN if top != 'tunic' else CLOTH, k=0.012)   # 이두
        if robe:   # 넓은 소매
            C(el - ua * 0.02, wr - fa * 0.02, 0.042 * bw, 0.062 * bw, mat=ROBE, k=0.01)
        else:
            C(el, wr, 0.036 * bw, 0.027 * bw, mat=SKIN, k=0.01)
            if cfg.get('boots') or top == 'stripe': C(wr - fa * 0.06, wr, 0.032 * bw, 0.03 * bw, mat=LEATH, k=0.004)   # 팔목 가죽
        hf = frame_from(fa, V(0, 0, sg) if abs(fa[2]) < 0.9 else V(0, 1, 0))
        E(hd - fa * 0.01, hf.T, (0.036, 0.03, 0.026), mat=fm_, k=0.01)
        if ghost:   # 긴 손톱
            for q in range(4):
                o = hf[2] * (q - 1.5) * 0.014; b = hd + fa * 0.02 + o; C(b, b + nrm(fa + hf[1] * -0.3) * 0.09, 0.008, 0.002, mat=DARK, k=0.002)
        if faust and sd == 'L':
            ex['glow'].append((hd + fa * 0.05 + hf[1] * 0.03, 0.028 * max(0, P['glow'] - 0.7)))
            for q in range(4):
                o = hf[2] * (q - 1.5) * 0.013; b = hd + fa * 0.02 + o; C(b, b + nrm(fa + hf[1] * 0.4) * 0.06, 0.008, 0.003, mat=DARK, k=0.002)
    # ---- 머리
    H = lambda x, y, z=0.0: head + Rh @ V(x, y, z)
    hs = cfg['head']
    if hs == 'hood':
        E(H(0.0, 0.0), Rh, (0.055, 0.06, 0.05), mat=DARK, k=0.01)
        E(H(-0.012, 0.012), Rh, (0.078, 0.085, 0.072), mat=ROBE, k=0.01)
        Sp(H(0.075, -0.005), 0.058, mat=DARK, op='s', k=0.01)   # 두건 앞 트임
        E(H(0.0, -0.005), Rh, (0.05, 0.055, 0.046), mat=DARK, k=0.01)
        C(H(-0.04, 0.06), H(-0.12, 0.0), 0.04, 0.01, mat=ROBE, k=0.01)   # 두건 꼬리
        for sg in (-1, 1): Sp(H(0.045, 0.005, sg * 0.02), 0.011, mat=GLOW, k=0.002); ex['glow'].append((H(0.05, 0.005, sg * 0.02), 0.03))
    else:
        E(H(0.0, 0.006), Rh, (0.058, 0.066, 0.052), mat=SKIN, k=0.015)
        E(H(0.03, -0.035 - 0.008 * P['jaw']), Rh, (0.044, 0.03, 0.044), mat=SKIN, k=0.015)
        for sg in (-1, 1):
            E(H(-0.004, -0.002, sg * 0.053), Rh, (0.013, 0.02, 0.008), mat=SKIN, k=0.006)
            Sp(H(0.05, 0.0, sg * 0.02), 0.011, mat=SKIN, op='s', k=0.004)
            Sp(H(0.046, 0.0, sg * 0.02), 0.0075, mat=EYE if not faust else GLOW, k=0.002)
            if faust: ex['glow'].append((H(0.05, 0.0, sg * 0.02), 0.012))
        EA(H(0.048, 0.017, -0.038), H(0.048, 0.017, 0.038), 0.013, 0.011, mat=SKIN, k=0.008)   # 눈두덩
        C(H(0.052, 0.008), H(0.072, -0.018), 0.01, 0.014, mat=SKIN, k=0.008)   # 코
        EA(H(0.068, -0.045, -0.02), H(0.068, -0.045, 0.02), 0.004 + 0.008 * P['jaw'], 0.004 + 0.01 * P['jaw'], mat=MOUTH, k=0.003); prims[-1].op = 's'
        if hs in ('hair', 'topknot', 'hat'):
            E(H(-0.012, 0.022), Rh, (0.064, 0.058, 0.058), mat=HAIR, k=0.008)
            if hs == 'hair':
                for q in range(9):
                    a = -2.0 + q / 8 * 4.0; ud = Rh @ nrm(V(-0.5, -0.85, math.sin(a) * 0.45)); b = H(-0.03 + 0.02 * math.cos(a), 0.02, 0.05 * math.sin(a))
                    C(b, b + ud * 0.07, 0.018, 0.006, mat=HAIR, k=0.008)
            if hs == 'topknot':
                Sp(H(-0.02, 0.08), 0.026, mat=HAIR, k=0.01); C(H(-0.02, 0.08), H(-0.06, 0.04), 0.014, 0.006, mat=HAIR)
                band(lambda X, Y, Z, c_=H(-0.02, 0.07) * S, r_=0.03 * S: np.sqrt((X - c_[0]) ** 2 + (Y - c_[1]) ** 2 + (Z - c_[2]) ** 2) - r_, H(-0.02, 0.07), Rh @ V(0, 1, 0), 0.008, H(-0.02, 0.07) - 0.1, H(-0.02, 0.07) + 0.1, RED)
        if cfg.get('beard'):
            E(H(0.035, -0.05), Rh @ bend(-10), (0.045, 0.04, 0.05), mat=HAIR, k=0.01)
            EA(H(0.06, -0.02, -0.03), H(0.06, -0.02, 0.03), 0.01, 0.008, mat=HAIR, k=0.006)   # 콧수염
        if hs == 'hat':   # 챙 작은 모자 (위가 둥근 펠트)
            E(H(-0.005, 0.03), Rh, (0.09, 0.012, 0.085), mat=CLOTH, k=0.004)
            E(H(-0.005, 0.06), Rh, (0.058, 0.045, 0.054), mat=CLOTH, k=0.008)
            band(lambda X, Y, Z, c_=H(-0.005, 0.05) * S, R_=Rh.T, r_=np.array([0.06, 0.05, 0.056]) * S: sd_ell(X, Y, Z, c_, R_, r_), H(-0.005, 0.042), Rh @ V(0, 1, 0), 0.008, head - 0.2, head + 0.2, LEATH)
            C(H(-0.03, 0.07, 0.04), H(-0.1, 0.12, 0.06), 0.006, 0.002, mat=FEATH)   # 깃털
        if cfg.get('band'):   # 붉은 머리띠 + 뒤로 늘어진 끈
            c = H(0.0, 0.03)
            band(lambda X, Y, Z, c_=H(0.0, 0.006) * S, R_=Rh.T, r_=np.array([0.061, 0.069, 0.055]) * S: sd_ell(X, Y, Z, c_, R_, r_), c, Rh @ V(0.25, 1.0, 0), 0.011, head - 0.2, head + 0.2, RED)
            k0 = H(-0.06, 0.02); C(k0, k0 + Rh @ V(-0.06, -0.08, 0.02), 0.011, 0.006, mat=RED); C(k0, k0 + Rh @ V(-0.07, -0.06, -0.025), 0.011, 0.006, mat=RED)
        if hs == 'horned':
            for sg in (-1, 1):
                pts = [H(-0.005, 0.045, sg * 0.04), H(-0.03, 0.10, sg * 0.075), H(-0.08, 0.13, sg * 0.09), H(-0.12, 0.11, sg * 0.10)]
                for q in range(3): C(pts[q], pts[q + 1], 0.022 - q * 0.007, 0.015 - q * 0.006, mat=HORN, k=0.004)
            for q in range(5): C(H(-0.02, 0.05, (q - 2) * 0.02), H(-0.04, 0.085, (q - 2) * 0.026), 0.008, 0.002, mat=HORN)   # 머리 위 작은 돌기
    # ---- 무기
    G, u = J['hdR'], P['wdir']
    zb = Rc @ V(0, 0, 1.0); yb = V(0, 1.0, 0)
    e = np.cross(yb, u) if cfg['style'] == 'sweep' else np.cross(u, zb)
    e = nrm(e) if np.linalg.norm(e) > 0.15 else frame_from(u)[1]   # 날이 휘두르는 쪽을 향하게
    w = cfg['weapon']
    if w in ('sword', 'falchion'):
        Lb, Wb, cv_ = (0.40, 0.024, 0.06) if w == 'sword' else (0.48, 0.05, 0.05)
        C(G - u * 0.06, G + u * 0.02, 0.012, 0.012, mat=LEATH, k=0.002)
        Sp(G - u * 0.065, 0.016, mat=STEEL)
        E(G + u * 0.03, frame_from(e, u).T, (0.04 if w == 'sword' else 0.055, 0.008, 0.016), mat=STEEL if w == 'sword' else LEATH, k=0.003)   # 코등이
        n = 16; prev = None
        for q in range(n + 1):
            t = q / n; p = G + u * (0.04 + Lb * t) + e * (cv_ * t * t) ; wid = Wb * (1.0 if t < 0.7 else (1 - (t - 0.7) / 0.3 * 0.85)) * (1 + (0.45 * t if w == 'falchion' else 0))
            if prev is not None:
                d = nrm(p - prev[0]); c = (p + prev[0]) / 2; L = np.linalg.norm(p - prev[0]) / 2 + 0.012
                E(c + e * (prev[1] + wid) * 0.25, frame_from(d, e).T, (L, (prev[1] + wid) * 0.5, 0.005), mat=STEEL, k=0.002)
            prev = (p, wid)
        ex['tip'] = G + u * (0.04 + Lb)
    elif w == 'axe':
        C(G - u * 0.08, G + u * 0.36, 0.014, 0.017, mat=WOOD, k=0.003); C(G - u * 0.04, G + u * 0.05, 0.017, 0.017, mat=LEATH)
        hc = G + u * 0.32; f_ = frame_from(u, e)   # 도끼날: 자루 끝 옆으로 넓게 퍼지는 쐐기
        def axe_f(X, Y, Z, hc=hc * S, F=f_, s=S):
            px = X - hc[0]; py = Y - hc[1]; pz = Z - hc[2]
            a = (F[0, 0] * px + F[0, 1] * py + F[0, 2] * pz) / s; b = (F[1, 0] * px + F[1, 1] * py + F[1, 2] * pz) / s; c = (F[2, 0] * px + F[2, 1] * py + F[2, 2] * pz) / s
            half = 0.03 + 0.075 * np.clip(b / 0.13, 0, 1) ** 1.3; edge = np.sqrt((b - 0.02) ** 2 * 0.25 + a * a) - (0.14)
            th = 0.012 * (1 - np.clip(b / 0.15, 0, 1)) + 0.002
            return np.maximum(np.maximum(np.abs(a) - half, np.abs(c) - th), np.maximum(-b - 0.01, b - 0.135 - 0.03 * (1 - (a / max(0.1, 1)) ** 2))) * s
        prims.append(Prim(axe_f, hc * S - 0.25 * S, hc * S + 0.25 * S, STEEL, 0.002 * S))
        C(hc - e * 0.02, hc - e * 0.06, 0.016, 0.006, mat=STEEL)   # 뒤 뿔
        ex['tip'] = hc + e * 0.13
    elif w == 'staff':
        C(G - u * 0.42, G + u * 0.50, 0.014, 0.016, mat=WOOD, k=0.003)
        tc = G + u * 0.56
        for q in range(3):   # 보주를 감싼 휜 갈퀴
            a = q * 2 * math.pi / 3; d = frame_from(u)[1] * math.cos(a) + frame_from(u)[2] * math.sin(a)
            C(G + u * 0.48, tc + d * 0.055 + u * 0.02, 0.01, 0.006, mat=STEEL); C(tc + d * 0.055 + u * 0.02, tc + d * 0.02 + u * 0.08, 0.006, 0.002, mat=STEEL)
        Sp(tc, 0.04, mat=GLOW, k=0.002); ex['glow'].append((tc, 0.035 * P['glow'] + 0.015)); ex['tip'] = tc
    elif w == 'bow':
        g = J['hdL']; upv = nrm(V(0.0, 1.0, 0.0) + (Rc @ V(0, 0, -1)) * 0.12); fwd = nrm(Rc @ V(1, 0, 0) - (Rc @ V(1, 0, 0) @ upv) * upv)
        if P['draw'] == 0 and P['HL'][1] < 0.6: upv = nrm(V(0.35, 1.0, 0.0)); fwd = nrm(V(1.0, -0.35, 0.0))
        pts = []
        for q in range(11):
            t = (q - 5) / 5.0; pts.append(g + upv * (0.40 * t) + fwd * (0.06 * (1 - t * t) - 0.02 * t * t * 0 + 0.035 * abs(t) ** 3 * -1 + 0.0))
        for q in range(10): C(pts[q], pts[q + 1], 0.012 - 0.005 * abs(q - 4.5) / 4.5, 0.012 - 0.005 * abs(q + 0.5 - 4.5) / 4.5, mat=WOOD, k=0.002)
        C(g - upv * 0.04, g + upv * 0.04, 0.016, 0.016, mat=LEATH)
        top_, bot_ = pts[0], pts[-1]; nockp = J['hdR'] if P['draw'] > 0.05 else (top_ + bot_) / 2 - fwd * 0.0
        C(top_, nockp, 0.0028, 0.0028, mat=STRING); C(bot_, nockp, 0.0028, 0.0028, mat=STRING)
        if P['arrow']:
            ad = nrm(g + fwd * 0.05 - nockp); C(nockp, nockp + ad * 0.48, 0.005, 0.005, mat=WOOD); C(nockp + ad * 0.46, nockp + ad * 0.5, 0.009, 0.001, mat=STEEL)
            for q in range(3): E(nockp + ad * 0.04, frame_from(ad, Rc @ V(0, math.cos(q * 2.1), math.sin(q * 2.1))).T, (0.035, 0.012, 0.002), mat=FEATH, k=0.001)
        ex['tip'] = g + fwd * 0.1
    else:
        ex['tip'] = J['hdR']
    return prims, ex


def make_vol(prims, h=1.0, margin=8.0):
    lo = np.min([p.lo for p in prims if p.op == 'u'], axis=0) - margin - 3 * h
    hi = np.max([p.hi for p in prims if p.op == 'u'], axis=0) + margin + 3 * h
    lo[1] = min(lo[1], -margin)
    v = Vol(lo, hi, h, margin)
    for p in prims: v.add(p)
    Yg = (v.lo[1] + np.arange(v.n[1]) * h).astype(np.float32)[None, :, None]; v.d = np.maximum(v.d, -Yg)
    v.crop(); return v


# ------------------------------------------------------------------ 표면 색
def shade(vol, P, N, mat, view, Lm, cfg, ex):
    S = cfg['S']; K = len(P); Vv = view.c; g = S; pal = cfg['col']
    def n3(nz, Q, s): return nz(Q[:, 0] / s, Q[:, 1] / s, Q[:, 2] / s)
    e = 0.8; bump = np.zeros_like(P); bs = 0.02 * g; f0 = n3(NZ, P, bs)
    for k in range(3):
        o = np.zeros(3); o[k] = e; bump[:, k] = (n3(NZ, P + o, bs) - f0) / e
    bt = bump - (np.sum(bump * N, 1))[:, None] * N
    AMP = {SKIN: 0.04, HAIR: 0.5, PANTS: 0.18, CLOTH: 0.18, LEATH: 0.15, STEEL: 0.04, WOOD: 0.12, ROBE: 0.1, BOOT: 0.12, STRIPE: 0.1, RED: 0.18, DARK: 0.2, HORN: 0.15}
    amp = np.zeros(K)
    for m_, a_ in AMP.items(): amp[mat == m_] = a_
    Nn = nrm(N - amp[:, None] * bt * bs)
    lo_ = n3(NZ2, P, 0.08 * g); mi_ = n3(NZ3, P, 0.025 * g)
    alb = np.full((K, 3), 0.1); ks = np.full(K, 0.08); kp = np.full(K, 14.0); emi = np.zeros((K, 3)); metal = np.zeros(K)
    DEF = {EYE: ('#141008', .5), MOUTH: ('#3a1210', .5), STRING: ('#d8d0b8', .6), FEATH: ('#e0d8c8', .6), DARK: ('#141010', .5), GLOW: ('#ffffff', 1), CREAM: ('#ddd2b4', .55),
           HORN: ('#d0c4a8', .6), BOOT: ('#2e2218', .6), LEATH: ('#4a2e1a', .6), WOOD: ('#6a4426', .7), STEEL: ('#b8bcc2', .5), HAIR: ('#241810', .6), RED: ('#8a2a20', .7)}
    for m_ in set(np.unique(mat).tolist()):
        mm = mat == m_
        hx, kk = pal.get(m_, DEF.get(m_, ('#808080', .6)))
        alb[mm] = hexlin(hx, kk) * (0.9 + 0.12 * mi_[mm])[:, None] * (0.92 + 0.12 * lo_[mm])[:, None]
    m = mat == SKIN
    if m.any(): ks[m] = 0.14; kp[m] = 16
    m = mat == HAIR
    if m.any(): ks[m] = 0.12; kp[m] = 22
    m = mat == STRIPE   # 노랑·검정 가로 줄무늬
    if m.any():
        hx, kk = pal.get(STRIPE, ('#d0a028', .7)); yel = hexlin(hx, kk); blk = hexlin('#1a1410', .55)
        sp = np.sin(P[m, 1] / (0.022 * g) * math.pi + 0.6 * n3(NZ, P[m], 0.05 * g)); t = sstep(-0.15, 0.15, sp)[:, None]
        alb[m] = yel * t + blk * (1 - t); ks[m] = 0.25; kp[m] = 24
    m = mat == STEEL
    if m.any(): ks[m] = 1.3; kp[m] = 50; metal[m] = 0.85
    m = mat == LEATH
    if m.any(): ks[m] = 0.22; kp[m] = 22
    m = mat == WOOD
    if m.any(): grain = np.sin(P[m, 1] / (0.004 * g) + 6 * n3(NZ, P[m], 0.02 * g)) * 0.5 + 0.5; alb[m] *= (0.75 + 0.35 * grain)[:, None]
    m = mat == EYE
    if m.any(): ks[m] = 2.0; kp[m] = 120; emi[m] = [0.05, 0.04, 0.02]
    m = mat == GLOW
    if m.any():
        hx, kk = pal.get(GLOW, ('#ffffff', 1)); emi[m] = hexlin(hx) * 2.4; alb[m] = hexlin(hx) * 0.3
    if cfg.get('ghost'):   # 로브는 아래로 갈수록 어둡고 끝이 희미하게 빛남
        m = mat == ROBE
        if m.any():
            t = np.clip(P[m, 1] / (0.6 * g), 0, 1)[:, None]; alb[m] *= (0.55 + 0.6 * t); emi[m] += hexlin('#3a7a5a') * 0.12 * (1 - t)
        m = mat == GSKIN
        if m.any(): emi[m] += hexlin('#2a5a40') * 0.15
    ndl = Nn @ Lm
    sh = soft_shadow(vol, P + N * 1.2, Lm, tmax=1.0 * g)
    ao = ambient_occ(vol, P, N, 0.02 * g, 5, 0.9)
    diff = np.clip((ndl + 0.06) / 1.06, 0, 1) ** 1.15
    sky = (SKY_DN[None] * (0.5 - 0.5 * Nn[:, 1:2]) + SKY_UP[None] * (0.5 + 0.5 * Nn[:, 1:2])) * ao[:, None]
    nv = np.clip(Nn @ Vv, 0, 1)
    rim = ((1 - nv) ** 3.0)[:, None] * np.array([0.42, 0.50, 0.56]) * (0.35 + 0.65 * ao[:, None])
    Hh = nrm(Lm + Vv); spec = (np.clip(Nn @ Hh, 0, 1) ** kp * ks)[:, None] * KEY_COL[None] * sh[:, None]
    R = -Vv[None] + 2 * (Nn @ Vv)[:, None] * Nn
    env = (SKY_DN[None] * (0.5 - 0.5 * R[:, 1:2]) + SKY_UP[None] * 1.6 * (0.5 + 0.5 * R[:, 1:2])) * (0.25 + 0.75 * (1 - nv) ** 2)[:, None]
    col = alb * (KEY_COL[None] * (diff * sh)[:, None] + sky * 1.75) + rim * (0.5 + 0.5 * alb) * (1 - 0.5 * metal[:, None]) + spec + emi + env * metal[:, None] * ao[:, None] * 0.9
    # 빛나는 것 둘레 은은한 빛 (보주·눈·손)
    for (c, r) in ex['glow']:
        if r <= 0: continue
        d = np.linalg.norm(P - c * S, axis=1) / (r * S * 2.5); hx, kk = pal.get(GLOW, ('#ffffff', 1))
        col += hexlin(hx)[None] * (np.exp(-d * d) * 0.35)[:, None]
    return col


def render_frame(key, anim, fi, rows=ROWS, ss=2, quick=False):
    cfg = MOBS[key]; S = cfg['S']; P = pose(cfg, anim, fi); prims, ex = build(P, cfg)
    vol = make_vol(prims, 1.0 if not quick else 1.8, 8.0)
    out = []
    for row in rows:
        M = rot_row(row); Lm = M.T @ LKEY_W
        cs = np.array([[x, y, z] for x in (vol.lo[0] - 8, vol.hi[0] + 8) for y in (0.0, vol.hi[1]) for z in (vol.lo[2] - 8, vol.hi[2] + 8)])
        shp = cs - Lm[None] * (cs[:, 1] / Lm[1])[:, None]
        view = View(M, vol.lo, vol.hi, ss, shp)
        O, D, W, H = view.rays()
        hit, t = trace(vol, O, D)
        rgb = np.zeros((H * W, 3)); A = np.zeros(H * W)
        hid = np.nonzero(hit)[0]
        if len(hid):
            Ph = O[hid] + t[hid, None] * D; Nh = vol.grad(Ph); mat = vol.mat_at(Ph)
            rgb[hid] = shade(vol, Ph, Nh, mat, view, Lm, cfg, ex); A[hid] = 1.0
            if cfg.get('ghost'): A[hid] = np.where(mat == GLOW, 1.0, 0.8)
        O1, D1, W1, H1 = view.rays(1)
        tg = -O1[:, 1] / D1[1]; Pg = O1 + tg[:, None] * D1
        near = (Pg[:, 0] > vol.lo[0] - 60) & (Pg[:, 0] < vol.hi[0] + 60) & (Pg[:, 2] > vol.lo[2] - 60) & (Pg[:, 2] < vol.hi[2] + 60)
        sha = np.zeros(H1 * W1)
        if near.any():
            Q = Pg[near] + np.array([0, 0.6, 0]); vis = soft_shadow(vol, Q, Lm, tmax=1.5 * S, k=5.0)
            sha[near] = np.clip(1 - vis, 0, 1) * (0.32 if cfg.get('ghost') else 0.48)
        sha = cv2.GaussianBlur(sha.reshape(H1, W1).astype(np.float32), (0, 0), 1.2)
        sha = np.repeat(np.repeat(sha, ss, 0), ss, 1).reshape(-1)
        rgb = rgb.reshape(H, W, 3); A = A.reshape(H, W); sha = sha.reshape(H, W)
        base_a = A + sha * (1 - A); base_c = rgb * A[..., None]
        img = finish(base_c, base_a, ss)
        # 빛 번짐 (보주·눈) — 2D로 덧그림
        if ex['glow']:
            hx, kk = cfg['col'].get(GLOW, ('#ffffff', 1)); gc = np.array([int(hx[1:3], 16), int(hx[3:5], 16), int(hx[5:7], 16)], np.float32)
            gl = np.zeros(img.shape[:2], np.float32)
            for (c, r) in ex['glow']:
                if r <= 0: continue
                pc = c * S; x = (pc @ view.r - view.x0); y = (view.y1 - pc @ view.u); rr = r * S * 1.6
                yy, xx = np.mgrid[0:img.shape[0], 0:img.shape[1]]; gl += np.exp(-((xx - x) ** 2 + (yy - y) ** 2) / (rr * rr)) * 0.4
            gl = np.clip(gl, 0, 1); a0 = img[..., 3].astype(np.float32) / 255; c0 = img[..., :3].astype(np.float32)
            na = np.clip(a0 + gl * (1 - a0) * 0.85, 0, 1); cc = (c0 * a0[..., None] + gc[None, None] * gl[..., None] * 0.9) / np.maximum(na, 1e-4)[..., None]
            img = np.dstack([np.clip(cc, 0, 255), na * 255]).astype(np.uint8)
        out.append(dict(row=row, img=img, ax=-view.x0, ay=view.y1))
    return out


# ------------------------------------------------------------------ 캐시 · 시트
def cache_path(key, anim, fi): return os.path.join(CACHE, f'{key}_{anim}_{fi}.npz')


def run_task(t):
    key, anim, fi = t; t0 = time.time(); out = render_frame(key, anim, fi)
    os.makedirs(CACHE, exist_ok=True)
    d = {f'img{i}': o['img'] for i, o in enumerate(out)}; d['meta'] = np.array(json.dumps([dict(row=o['row'], ax=o['ax'], ay=o['ay']) for o in out]))
    np.savez_compressed(cache_path(key, anim, fi), **d)
    return f'{key} {anim} {fi} {time.time() - t0:.1f}s'


def load_cache(key, anim, fi):
    z = np.load(cache_path(key, anim, fi)); M = json.loads(str(z['meta']))
    return [dict(img=z[f'img{i}'], **m) for i, m in enumerate(M)]


def cells(key):
    """{anim: {(fi,row): (img, ox, oy)}} — ox·oy = 발 기준점에서 그림 왼쪽 위까지 (8방향 · 뒤집은 줄 포함)"""
    C = {}
    for a, n in ANIMS:
        C[a] = {}
        for fi in range(n):
            for o in load_cache(key, a, fi):
                img, cx, cy = crop_alpha(o['img'], 3); ox = cx - int(round(o['ax'])); oy = cy - int(round(o['ay']))
                C[a][(fi, o['row'])] = (img, ox, oy)
            for r, src in MIRROR.items():
                img, ox, oy = C[a][(fi, src)]; C[a][(fi, r)] = (img[:, ::-1].copy(), -(ox + img.shape[1]), oy)
    return C


DS = {'gp_klein': 0.55, 'gp_faust': 0.48}   # 시트로 넣을 때 줄이는 배율 (기본 0.62 · 게임은 s = 0.5 / 배율로 다시 키워 그림 → 화면 크기 같음 · 용량·메모리 절약)


def build_sheets(key, q=70, aq=82):
    C = cells(key); L = R = U = D = 0; ds = DS.get(key, 0.62)
    for a in C:
        for kk, (img, ox, oy) in list(C[a].items()):
            h2, w2 = max(1, int(round(img.shape[0] * ds))), max(1, int(round(img.shape[1] * ds)))
            C[a][kk] = (cv2.resize(img, (w2, h2), interpolation=cv2.INTER_AREA), int(round(ox * ds)), int(round(oy * ds)))
    for a in C:
        for (img, ox, oy) in C[a].values():
            L = max(L, -ox); R = max(R, ox + img.shape[1]); U = max(U, -oy); D = max(D, oy + img.shape[0])
    pad = 2; W = L + R + 2 * pad; H = U + D + 2 * pad; ax = L + pad; ay = U + pad
    tot = 0
    for a, n in ANIMS:
        sh = np.zeros((H * 8, W * n, 4), np.uint8)
        for (fi, row), (img, ox, oy) in C[a].items():
            x0 = fi * W + ax + ox; y0 = row * H + ay + oy; sh[y0:y0 + img.shape[0], x0:x0 + img.shape[1]] = img
        sh[sh[..., 3] == 0, :3] = 0
        p = os.path.join(ROOT, 'assets', 'classic', f'mon_{key}_{a}.webp')
        Image.fromarray(sh, 'RGBA').save(p, 'WEBP', quality=q, alpha_quality=aq, method=6); tot += os.path.getsize(p)
    S = MOBS[key]['S']; s = round(0.5 / ds, 4); top = {'gp_faust': 1.08, 'gp_ghost': 1.02}.get(key, 0.98)
    hh = int(round(S * top * 0.866 * 0.5)); meta = dict(W=W, H=H, ax=ax, ay=ay, s=s, af=8, hh=hh, hw=int(round(hh * 0.36)))
    print(f'{key}: cell {W}x{H} anchor ({ax},{ay}) · 3 sheets {tot / 1024:.0f}KB · hh {meta["hh"]} hw {meta["hw"]}', flush=True)
    return meta, C


def write_meta(metas):
    p = os.path.join(ROOT, 'dev', 'out', 'giran_meta.json'); os.makedirs(os.path.dirname(p), exist_ok=True)
    allm = {}
    if os.path.exists(p): allm = json.load(open(p))
    allm.update(metas); json.dump(allm, open(p, 'w'), indent=1)
    gp = os.path.join(ROOT, 'src', 'game.js'); s = open(gp, encoding='utf8').read(); a = s.find('/*GIRAN_ART_BEGIN*/'); b = s.find('/*GIRAN_ART_END*/')
    body = ', '.join(f"{k}: {{ W: {m['W']}, H: {m['H']}, ax: {m['ax']}, ay: {m['ay']}, s: {m['s']}, af: 8, hh: {m['hh']}, hw: {m['hw']} }}" for k, m in allm.items())
    txt = f"/*GIRAN_ART_BEGIN*/ {{ const GIRAN_MS = {{ {body} }}; for (const k in GIRAN_MS) if (MOB[k]) MSHEET[k] = GIRAN_MS[k]; }}   // 11/6 기란감옥 오리지널 렌더 (dev/render_giran.py) — MOB에 그 몹이 있을 때만 /*GIRAN_ART_END*/"
    if a >= 0 and b > a: s = s[:a] + txt + s[b + len('/*GIRAN_ART_END*/'):]; open(gp, 'w', encoding='utf8').write(s); print('game.js GIRAN_ART 갱신')
    else: print('!! game.js 에 /*GIRAN_ART_BEGIN*/ 표시가 없음 — 아래를 넣어 주세요\n' + txt)


def paste(can, im, x0, y0):
    h, w = im.shape[:2]; xa, ya = max(0, x0), max(0, y0); xb, yb = min(can.shape[1], x0 + w), min(can.shape[0], y0 + h)
    if xb <= xa or yb <= ya: return
    sub = im[ya - y0:yb - y0, xa - x0:xb - x0].astype(np.float32); a = sub[..., 3:4] / 255
    can[ya:yb, xa:xb] = sub[..., :3] * a + can[ya:yb, xa:xb] * (1 - a)


def preview(keys, path):
    """몹마다 한 줄: 서 있기 8방향 중 4개 + 걷기 2장 + 공격 6장 (게임 크기 0.5배 · 2배로 키워 보기 쉽게)"""
    CW, CH = 150, 190; ncol = 4 + 2 + 6
    can = np.zeros((CH * len(keys), CW * ncol, 3), np.float32)
    for li, k in enumerate(keys):
        can[li * CH:(li + 1) * CH] = np.array([72, 68, 62], np.float32) if li % 2 == 0 else np.array([60, 58, 54], np.float32)
        C = cells(k); items = [('idle', 0, r) for r in (1, 2, 4, 5)] + [('walk', f, 2) for f in (1, 5)] + [('attack', f, 2) for f in (1, 2, 3, 4, 5, 6)]
        for ci, (a, fi, row) in enumerate(items):
            img, ox, oy = C[a][(fi, row)]; img2 = cv2.resize(img, (max(1, img.shape[1] // 2), max(1, img.shape[0] // 2)), interpolation=cv2.INTER_AREA)
            paste(can, img2, int(ci * CW + CW / 2 + ox / 2), int(li * CH + CH - 18 + oy / 2))
    can = np.clip(can, 0, 255).astype(np.uint8)
    for li, k in enumerate(keys): cv2.putText(can, k, (6, li * CH + 16), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (235, 230, 215), 1, cv2.LINE_AA)
    im = Image.fromarray(can); im.save(path); print('preview', path)


def quick(key, anims, rows, frames=None):
    cellsq = []
    for a in anims:
        n = dict(ANIMS)[a]
        for fi in (frames if frames is not None else range(n)):
            t0 = time.time(); o = render_frame(key, a, fi, rows, 1, quick=True); print(key, a, fi, f'{time.time() - t0:.1f}s', flush=True); cellsq.append(o)
    CW, CH = 300, 320; ncol = max(len(c) for c in cellsq); can = np.full((CH * len(cellsq), CW * ncol, 3), 70, np.float32)
    for i, outs in enumerate(cellsq):
        for k, o in enumerate(outs):
            img, cx, cy = crop_alpha(o['img']); paste(can, img, int(k * CW + CW / 2 + cx - o['ax']), int(i * CH + CH - 30 + cy - o['ay']))
    p = os.path.join(ROOT, 'dev', 'out', 'giran_quick.png'); os.makedirs(os.path.dirname(p), exist_ok=True); Image.fromarray(np.clip(can, 0, 255).astype(np.uint8)).save(p); print('quick', p)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--only', default=','.join(MOBS)); ap.add_argument('--jobs', type=int, default=2)
    ap.add_argument('--pack', action='store_true'); ap.add_argument('--skip', action='store_true')
    ap.add_argument('--quick', default=''); ap.add_argument('--anim', default='idle'); ap.add_argument('--rows', default='2'); ap.add_argument('--frames', default='')
    a = ap.parse_args(); keys = a.only.split(',')
    if a.quick:
        quick(a.quick, a.anim.split(','), [int(x) for x in a.rows.split(',')], [int(x) for x in a.frames.split(',')] if a.frames else None); return
    if not a.pack:
        T = [(k, an_, fi) for k in keys for an_, n in ANIMS for fi in range(n)]
        if a.skip: T = [t for t in T if not os.path.exists(cache_path(*t))]
        t0 = time.time(); print(len(T), 'frames', flush=True)
        import multiprocessing as mp
        with mp.get_context('fork').Pool(a.jobs) as pool:
            for i, r in enumerate(pool.imap_unordered(run_task, T)): print(f'[{i + 1}/{len(T)}] {r}', flush=True)
        print(f'render {time.time() - t0:.0f}s', flush=True)
    metas = {}
    for k in keys:
        if all(os.path.exists(cache_path(k, an_, fi)) for an_, n in ANIMS for fi in range(n)): metas[k], _ = build_sheets(k)
    if metas: write_meta(metas)
    done = [k for k in MOBS if all(os.path.exists(cache_path(k, an_, fi)) for an_, n in ANIMS for fi in range(n))]
    if done: preview(done, os.path.join(ROOT, 'dev', 'out', 'giran_preview.png'))


if __name__ == '__main__':
    main()
