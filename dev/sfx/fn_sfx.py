# 화룡의 둥지 몬스터 효과음 — 코드로 직접 합성한 오리지널 소리 (녹음·추출 소리 없음)
# 쓰는 법: python3 dev/sfx/fn_sfx.py  → assets/sound/sfx/<몹>_<attack|attack2|hit|death>.mp3 (44.1kHz 모노 96kbps)
#   미리 듣기용 wav: python3 dev/sfx/fn_sfx.py --wav <폴더>  ·  한 몹만: --only fn_ifrit
import os, sys, subprocess, numpy as np
from scipy import signal

SR = 44100
rng = np.random.default_rng(20261030)
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')

def N(d): return int(round(SR * d))
def T(d): return np.arange(N(d)) / SR
def env(n, a, d, shape=4.0):   # 빠르게 올라와서 지수로 사라짐
    t = np.arange(n) / SR; e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) * shape / max(d, 1e-4)); return e
def place(buf, x, at):
    i = int(at * SR); j = min(len(buf), i + len(x)); buf[i:j] += x[:j - i]; return buf
def noise(d): return rng.standard_normal(N(d))
def bp(x, lo, hi, order=2): return signal.sosfilt(signal.butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def lp(x, f, order=2): return signal.sosfilt(signal.butter(order, f, 'lowpass', fs=SR, output='sos'), x)
def hp(x, f, order=2): return signal.sosfilt(signal.butter(order, f, 'highpass', fs=SR, output='sos'), x)
def sweep_bp(x, f0, f1, q=2.0, steps=48):   # 시간에 따라 움직이는 대역 필터 (휙 · 우웅)
    out = np.zeros_like(x); n = len(x); seg = max(1, n // steps); win = np.hanning(seg * 2)
    for k in range(0, n, seg):
        f = f0 * (f1 / f0) ** (k / max(1, n)); lo, hi = f / (1 + 1 / q), min(SR / 2 - 100, f * (1 + 1 / q))
        a, b = max(0, k - seg), min(n, k + seg); y = bp(x[a:b], lo, hi); w = win[:b - a] if b - a == len(win) else np.hanning(b - a); out[a:b] += y * w
    return out
def osc(freq, d, kind='sine', phase=0.0):   # freq: 숫자 또는 배열(시간에 따라 변함)
    n = N(d); f = np.full(n, float(freq)) if np.isscalar(freq) else np.asarray(freq)[:n]; ph = 2 * np.pi * np.cumsum(f) / SR + phase
    if kind == 'sine': return np.sin(ph)
    if kind == 'saw': return 2 * ((ph / (2 * np.pi)) % 1) - 1
    if kind == 'square': return np.sign(np.sin(ph))
    if kind == 'tri': return 2 * np.abs(2 * ((ph / (2 * np.pi)) % 1) - 1) - 1
def glide(f0, f1, d, curve=1.0): t = np.linspace(0, 1, N(d)) ** curve; return f0 * (f1 / f0) ** t

# ---- 재료 소리 ----
def crackle(d, rate=60, amp=0.5, lo=1800, hi=7000, fade=True):   # 불이 탁탁 튀는 소리
    n = N(d); x = np.zeros(n); k = rng.random(n) < rate / SR; x[k] = rng.uniform(-1, 1, k.sum()) * rng.uniform(.3, 1, k.sum())
    x = bp(x, lo, hi) * 6; e = np.linspace(1, 0.15, n) if fade else 1; return x * amp * e
def roar(d, lo=120, hi=900):   # 불길이 솟는 우웅 (낮은 잡음 + 흔들림)
    x = lp(noise(d), hi, 3) + 0.4 * bp(noise(d), lo, lo * 3); wob = 1 + 0.35 * np.sin(2 * np.pi * 7 * T(d)) * rng.uniform(.6, 1); return x * wob
def whoosh(d, f0, f1, q=1.6): x = sweep_bp(noise(d), f0, f1, q); e = np.sin(np.pi * np.linspace(0, 1, len(x))) ** 1.5; return x * e
def thump(d, f0=90, f1=38, dec=0.25): return osc(glide(f0, f1, d, .6), d) * env(N(d), .004, dec, 5)
def clank(d, base=420, dec=0.35):   # 쇠붙이 부딪힘 (어울리지 않는 배음 여러 개)
    x = np.zeros(N(d))
    for r, a in [(1, 1), (2.76, .6), (5.4, .45), (8.93, .3), (13.3, .18)]: x += a * osc(base * r * rng.uniform(.99, 1.01), d) * env(len(x), .001, dec / (1 + r * .25), 5)
    return x + 0.4 * hp(noise(d), 3000) * env(len(x), .001, .03, 5)
def rocks(d, n=14, lo=500, hi=3500, spread=None):   # 돌 부스러기 우수수
    x = np.zeros(N(d)); spread = spread or d * .8
    for _ in range(n):
        at = rng.random() ** 1.6 * spread; m = int(SR * rng.uniform(.02, .06)); g = bp(noise(m / SR), rng.uniform(lo, lo * 1.6), rng.uniform(hi * .6, hi)) * env(m, .001, m / SR * .6, 5) * rng.uniform(.3, 1)
        place(x, g, at)
    return x
def sizzle(d, amp=0.3): x = hp(noise(d), 4000, 3) * (0.6 + 0.4 * np.abs(lp(noise(d), 30) * 8).clip(0, 1)); return x * amp
def growl(d, f0=85, f1=70, form=(420, 900), vib=6, rough=.5):   # 짐승·괴물 으르렁 (톱니파 + 입 모양 필터 + 거친 떨림)
    f = glide(f0, f1, d) * (1 + .04 * np.sin(2 * np.pi * vib * T(d))) * (1 + rough * .03 * lp(noise(d), 40) * 10)
    x = osc(f, d, 'saw') + .5 * osc(f * 1.01, d, 'saw'); y = bp(x, *form) + .35 * bp(x, form[1] * 1.6, form[1] * 2.6) + .25 * lp(noise(d), 600) * rough
    return y
def screech(d, f0=1500, f1=2600, f2=1200, vib=11):   # 새 울음 (높게 치솟았다 떨어짐)
    n = N(d); h = n // 3; f = np.concatenate([glide(f0, f1, h / SR, .7), glide(f1, f2, (n - h) / SR, 1.3)])[:n]; f = f * (1 + .025 * np.sin(2 * np.pi * vib * T(d)))
    x = osc(f, d) + .45 * osc(f * 2.01, d) + .25 * osc(f * 3.02, d, 'tri') + .2 * bp(noise(d), 2000, 6000)
    return x * (1 + .3 * np.sin(2 * np.pi * 23 * T(d)))
def flap(d, n=2, gap=.16):   # 날개 퍼덕임
    x = np.zeros(N(d))
    for k in range(n): m = N(.14); g = lp(noise(m / SR), 1100, 2) * env(m, .02, .1, 4) * (1 - k * .15); place(x, g * 1.4, k * gap)
    return x
def twang(d, f=196, bright=.6):   # 활시위 (뜯는 줄 · 카플러스-스트롱)
    n = N(d); P = int(SR / f); buf = rng.uniform(-1, 1, P); out = np.zeros(n)
    for i in range(n): v = buf[i % P]; out[i] = v; buf[i % P] = (v + buf[(i + 1) % P]) * .5 * (.992 + .006 * bright)
    return out * env(n, .001, d * .45, 4)
def finish(x, peak=.86, tail=.03):
    n = N(tail); x = x.copy(); x[-n:] *= np.linspace(1, 0, n); x = hp(x, 35, 2); m = np.abs(x).max() or 1; x = x / m
    g = 1.0
    while np.sqrt((x ** 2).mean()) * (np.tanh(g) and 1) < .085 and g < 6: g *= 1.25; y = np.tanh(x * g) / np.tanh(g); x = y / (np.abs(y).max() or 1)   # 너무 작게 들리는 소리는 살짝 눌러서 키움
    return (x * peak).astype(np.float32)

# ---- 몬스터별 소리 ----
def S():
    out = {}
    # 불꽃 전사: 불붙은 대검 — 무거운 휘두름(휙) + 불길 확 + 탁탁 / 맞으면 그을린 갑옷 쨍 + 지글 / 쓰러지면 낮은 신음 + 갑옷 와르르 + 불 꺼짐
    d = .78; x = np.zeros(N(d)); place(x, whoosh(.42, 300, 2200) * 1.0, 0); place(x, roar(.5) * env(N(.5), .05, .35, 3) * .55, .12); place(x, crackle(.6, 70, .45), .1); place(x, thump(.3, 120, 60, .12) * .35, .3)
    out['fn_warrior_attack'] = finish(x)
    d = .5; x = np.zeros(N(d)); place(x, clank(.45, 380, .3) * .8, 0); place(x, sizzle(.4, .35) * env(N(.4), .01, .3, 3), .02); place(x, crackle(.35, 50, .35), .03)
    out['fn_warrior_hit'] = finish(x, .8)
    d = 2.3; x = np.zeros(N(d)); g = growl(1.1, 95, 55, (350, 800)) * env(N(1.1), .08, .9, 2.5); place(x, g * .9, 0); place(x, rocks(1.0, 16, 900, 5000) * .5, .55); place(x, clank(.6, 300, .4) * .35, .6); place(x, clank(.5, 250, .35) * .25, .82)
    place(x, roar(1.6) * np.linspace(.6, 0, N(1.6)) * .35, .5); place(x, crackle(1.7, 45, .4), .5); place(x, sizzle(1.2, .25) * np.linspace(.2, 1, N(1.2)) * np.linspace(1, 0, N(1.2)), 1.0)
    out['fn_warrior_death'] = finish(x, .84)
    # 불꽃 궁수: 활시위 팅 + 불화살이 날아가는 쉭 / 맞으면 짧은 쇠소리 + 불티 / 쓰러지면 짧은 신음 + 활 떨어짐 + 불 꺼짐
    d = .62; x = np.zeros(N(d)); place(x, twang(.5, 185) * .8, 0); place(x, whoosh(.45, 900, 3800, 2.2) * .9, .05); place(x, crackle(.5, 80, .5, 2500, 8000), .06); place(x, roar(.35) * env(N(.35), .02, .25, 3) * .3, .06)
    out['fn_archer_attack'] = finish(x, .82)
    d = .42; x = np.zeros(N(d)); place(x, clank(.35, 560, .2) * .6, 0); place(x, bp(noise(.12), 600, 2500) * env(N(.12), .002, .08, 4) * .8, 0); place(x, crackle(.35, 60, .4), .02); place(x, sizzle(.3, .25) * env(N(.3), .01, .2, 3), .03)
    out['fn_archer_hit'] = finish(x, .78)
    d = 1.9; x = np.zeros(N(d)); place(x, growl(.75, 150, 95, (500, 1200), 7, .4) * env(N(.75), .05, .6, 2.5) * .75, 0); place(x, twang(.4, 140) * .35, .55); place(x, rocks(.5, 6, 1200, 4500) * .4, .6)
    place(x, crackle(1.3, 40, .35), .4); place(x, sizzle(1.0, .25) * np.linspace(1, 0, N(1.0)), .8)
    out['fn_archer_death'] = finish(x, .82)
    # 용암 골렘: 바위 주먹 쿵 + 땅울림 + 용암 철퍽 / 맞으면 바위 깨지는 딱 + 지글 / 쓰러지면 길게 무너지는 바위 + 용암 쉬익 + 땅울림
    d = 1.05; x = np.zeros(N(d)); place(x, whoosh(.35, 150, 700, 1.3) * .7, 0); place(x, thump(.7, 85, 32, .45) * 1.2, .25); place(x, lp(noise(.5), 300, 3) * env(N(.5), .005, .35, 4) * 1.4, .25); place(x, rocks(.6, 12, 400, 2500) * .6, .27)
    place(x, bp(noise(.35), 300, 1400) * env(N(.35), .02, .25, 3) * .45, .3); place(x, sizzle(.6, .25) * env(N(.6), .05, .5, 2.5), .35)
    out['fn_golem_attack'] = finish(x, .88)
    d = .55; x = np.zeros(N(d)); place(x, bp(noise(.1), 900, 4500) * env(N(.1), .001, .05, 5) * 1.2, 0); place(x, thump(.3, 140, 60, .12) * .7, 0); place(x, rocks(.4, 7, 700, 4000) * .5, .02); place(x, sizzle(.45, .35) * env(N(.45), .02, .35, 3), .03)
    out['fn_golem_hit'] = finish(x, .82)
    d = 3.1; x = np.zeros(N(d)); place(x, growl(1.0, 60, 38, (180, 520), 4, .8) * env(N(1.0), .1, .8, 2) * .8, 0); place(x, rocks(2.2, 40, 300, 3200, 1.6) * .75, .35)
    for k, at in enumerate([.45, .9, 1.35]): place(x, thump(.8, 75 - k * 8, 30, .5) * (1 - k * .2) * 1.1, at)
    place(x, lp(noise(2.2), 160, 3) * np.sin(np.pi * np.linspace(0, 1, N(2.2))) * 1.6, .3); place(x, sizzle(1.8, .35) * np.linspace(0, 1, N(1.8)) ** .5 * np.linspace(1, 0, N(1.8)), 1.2)
    out['fn_golem_death'] = finish(x, .86)
    # 폭탄꽃: 씨앗 주머니가 부풀었다 퉤 쏘는 펑 / 맞으면 물컹 / 죽으면 펑 터지며 불꽃
    d = .7; x = np.zeros(N(d)); place(x, sweep_bp(noise(.3), 250, 900, 2.5) * np.linspace(0, 1, N(.3)) ** 2 * .7, 0); place(x, thump(.25, 180, 70, .1) * .9, .28); place(x, bp(noise(.08), 400, 2400) * env(N(.08), .001, .05, 4), .28)
    place(x, whoosh(.35, 700, 2400, 2) * .5, .3); place(x, crackle(.35, 70, .4), .32)
    out['fn_bomb_attack'] = finish(x, .82)
    d = .35; x = np.zeros(N(d)); w = bp(noise(.25), 250, 1200) * env(N(.25), .005, .15, 4); w *= 1 + .6 * np.sin(2 * np.pi * 38 * T(.25)); place(x, w * .9, 0); place(x, osc(glide(320, 160, .18), .18) * env(N(.18), .003, .12, 4) * .4, 0)
    out['fn_bomb_hit'] = finish(x, .74)
    d = 1.5; x = np.zeros(N(d)); place(x, thump(.9, 110, 30, .5) * 1.3, 0); place(x, lp(noise(1.0), 1800, 2) * env(N(1.0), .003, .6, 3.5) * 1.2, 0); place(x, bp(noise(.1), 1500, 7000) * env(N(.1), .001, .05, 4) * .8, 0)
    place(x, crackle(1.3, 90, .55), .05); place(x, roar(1.0) * env(N(1.0), .02, .7, 3) * .5, .02)
    out['fn_bomb_death'] = finish(x, .88)
    # 불새 알: 껍질 속에서 톡톡 + 작은 불꽃 퐁 / 맞으면 껍질 딱 / 깨지면 쩍 갈라지며 불꽃 화르륵
    d = .55; x = np.zeros(N(d))
    for k, at in enumerate([0, .09, .17]): m = N(.03); place(x, bp(noise(.03), 2500, 7000) * env(m, .0005, .015, 5) * (.7 + .15 * k), at); place(x, osc(1800 + 300 * k, .05) * env(N(.05), .0005, .03, 5) * .25, at)
    place(x, roar(.3) * env(N(.3), .02, .2, 3) * .35, .25); place(x, crackle(.3, 60, .35), .25)
    out['fn_egg_attack'] = finish(x, .76)
    d = .3; x = np.zeros(N(d)); place(x, bp(noise(.05), 2000, 8000) * env(N(.05), .0005, .02, 5), 0)
    for r in (2300, 3700, 5900): place(x, osc(r, .25) * env(N(.25), .0005, .12, 5) * .25, 0)
    out['fn_egg_hit'] = finish(x, .72)
    d = 1.4; x = np.zeros(N(d))
    for k in range(5): at = k * .045 + rng.uniform(0, .02); place(x, bp(noise(.05), 1800, 8000) * env(N(.05), .0005, .025, 5) * (1 - k * .1), at)
    place(x, rocks(.5, 10, 1500, 7000) * .5, .05); place(x, whoosh(.8, 200, 1800, 1.4) * 1.1, .15); place(x, roar(1.0) * env(N(1.0), .08, .8, 2.5) * .5, .15); place(x, crackle(1.1, 70, .5), .15)
    out['fn_egg_death'] = finish(x, .84)
    # 피닉스: 날카로운 울음 + 날갯짓 / 불꽃 마법(attack2): 날갯짓 두 번 + 불길이 크게 솟는 우웅 / 맞으면 짧은 비명 / 쓰러지면 길게 떨어지는 울음 + 불꽃이 확 퍼짐
    d = 1.1; x = np.zeros(N(d)); place(x, screech(.55, 1400, 2500, 1500) * env(N(.55), .03, .45, 2.5) * .55, 0); place(x, flap(.5, 2, .17) * .8, .25); place(x, roar(.6) * env(N(.6), .05, .45, 3) * .35, .3); place(x, crackle(.7, 60, .35), .3)
    out['phoenix_attack'] = finish(x, .86)
    d = 1.6; x = np.zeros(N(d)); place(x, flap(.6, 3, .16) * .9, 0); place(x, sweep_bp(noise(1.1), 150, 1400, 1.2) * np.sin(np.pi * np.linspace(0, 1, N(1.1))) ** .8 * 1.1, .3); place(x, roar(1.2) * env(N(1.2), .2, .9, 2.5) * .6, .35)
    place(x, screech(.5, 1600, 2800, 2000) * env(N(.5), .02, .4, 2.5) * .35, .4); place(x, crackle(1.2, 90, .5), .4)
    out['phoenix_attack2'] = finish(x, .88)
    d = .42; x = np.zeros(N(d)); place(x, screech(.3, 1900, 2700, 1700, 15) * env(N(.3), .005, .22, 3) * .6, 0); place(x, bp(noise(.08), 800, 3000) * env(N(.08), .001, .05, 4) * .5, 0); place(x, crackle(.3, 50, .3), .02)
    out['phoenix_hit'] = finish(x, .78)
    d = 3.0; x = np.zeros(N(d)); place(x, screech(1.5, 2200, 2700, 700, 8) * env(N(1.5), .02, 1.3, 2) * .6, 0); place(x, flap(.7, 3, .2) * .7, .1); place(x, thump(.8, 90, 35, .5) * .9, 1.35)
    place(x, lp(noise(1.6), 1500, 2) * env(N(1.6), .01, 1.1, 3) * .9, 1.35); place(x, roar(1.6) * env(N(1.6), .05, 1.2, 2.5) * .5, 1.35); place(x, crackle(1.6, 80, .5), 1.35)
    out['phoenix_death'] = finish(x, .86)
    # 아시타지오(불의 마령): 불길에 싸인 낮은 포효 + 화염 / 맞으면 불꽃 튐 + 낮은 신음 / 쓰러지면 불길이 빨려 들어가며 사그라듦
    d = 1.2; x = np.zeros(N(d)); place(x, growl(.8, 75, 60, (300, 750), 5, .7) * env(N(.8), .06, .6, 2.5) * .6, 0); place(x, roar(1.0) * env(N(1.0), .1, .7, 2.5) * .7, .1); place(x, whoosh(.5, 250, 1800, 1.4) * .6, .2); place(x, crackle(1.0, 70, .45), .15)
    out['fn_ashtazio_attack'] = finish(x, .86)
    d = 1.5; x = np.zeros(N(d)); place(x, sweep_bp(noise(1.2), 120, 1600, 1.3) * np.linspace(0, 1, N(1.2)) ** 1.5 * 1.2, 0); place(x, thump(.5, 100, 40, .3) * 1.1, 1.05); place(x, lp(noise(.45), 1200, 2) * env(N(.45), .003, .3, 3) * 1.1, 1.05); place(x, crackle(1.4, 80, .45), .1)
    out['fn_ashtazio_attack2'] = finish(x, .88)
    d = .5; x = np.zeros(N(d)); place(x, growl(.35, 110, 85, (350, 900), 6, .6) * env(N(.35), .01, .25, 3) * .6, 0); place(x, bp(noise(.1), 700, 3000) * env(N(.1), .001, .06, 4) * .6, 0); place(x, crackle(.4, 60, .4), .02)
    out['fn_ashtazio_hit'] = finish(x, .8)
    d = 2.6; x = np.zeros(N(d)); place(x, growl(1.4, 80, 40, (260, 700), 4, .8) * env(N(1.4), .05, 1.2, 2) * .7, 0); place(x, sweep_bp(noise(1.8), 1600, 140, 1.3) * np.linspace(1, 0, N(1.8)) ** .7 * 1.1, .2)
    place(x, roar(2.0) * np.linspace(.8, 0, N(2.0)) * .5, .2); place(x, crackle(2.0, 50, .4), .3); place(x, sizzle(1.0, .2) * np.linspace(1, 0, N(1.0)), 1.5)
    out['fn_ashtazio_death'] = finish(x, .84)
    # 드래곤플라이: 날갯짓 붕붕(빠른 떨림) + 휙 돌진 + 턱 딱 / 맞으면 껍질 톡 + 날갯짓 흔들림 / 죽으면 붕붕이 잦아들며 툭 떨어짐
    def buzz(d, f0=110, f1=120, am=28, lo=180, hi=2600):
        f = glide(f0, f1, d) * (1 + .03 * np.sin(2 * np.pi * 5 * T(d))); x = osc(f, d, 'saw') + .5 * osc(f * 2.02, d, 'saw') + .5 * bp(noise(d), 300, 3000)
        return bp(x, lo, hi) * (.55 + .45 * np.sin(2 * np.pi * am * T(d)) ** 2)
    d = .62; x = np.zeros(N(d)); place(x, buzz(.55, 115, 160) * np.sin(np.pi * np.linspace(0, 1, N(.55))) ** .6 * .7, 0); place(x, whoosh(.3, 500, 2600, 2) * .6, .1)
    place(x, bp(noise(.03), 1800, 6000) * env(N(.03), .0005, .015, 5) * 1.1, .38); place(x, osc(1400, .05) * env(N(.05), .0005, .03, 5) * .3, .38); place(x, crackle(.3, 50, .3), .32)
    out['fn_fly_attack'] = finish(x, .8)
    d = .4; x = np.zeros(N(d)); place(x, bp(noise(.04), 2200, 7500) * env(N(.04), .0005, .02, 5), 0); place(x, osc(2600, .08) * env(N(.08), .0005, .05, 5) * .3, 0)
    b_ = buzz(.35, 140, 95, 40) * env(N(.35), .005, .25, 3); b_ *= (np.sin(2 * np.pi * 9 * T(.35)) > -.2); place(x, b_ * .6, .02)
    out['fn_fly_hit'] = finish(x, .74)
    d = 1.6; x = np.zeros(N(d)); b_ = buzz(1.1, 130, 45, 26) * np.linspace(1, 0, N(1.1)) ** 1.3; place(x, b_ * .8, 0); place(x, bp(noise(.05), 1500, 5000) * env(N(.05), .0005, .03, 5) * .6, 0)
    place(x, thump(.3, 160, 70, .1) * .7, 1.1); place(x, rocks(.25, 4, 1500, 5000) * .35, 1.12); place(x, crackle(.5, 40, .25), 1.1)
    out['fn_fly_death'] = finish(x, .8)
    # 이프리트(불의 정령 중간 보스 · 10/30): 낮은 으르렁 + 불꽃 주먹이 휙 내려와 쿵 + 불길 확 / 기술(attack2): 불길이 빨려 들며 커지다가 펑 터짐 / 맞으면 불꽃 확 + 짧은 신음 / 쓰러지면 길게 꺼지는 포효 + 불꽃이 사방으로 흩어지는 쉬익
    d = 1.2; x = np.zeros(N(d)); place(x, growl(.5, 68, 58, (240, 620), 5, .8) * env(N(.5), .03, .4, 2.5) * .55, 0); place(x, whoosh(.36, 170, 1500, 1.3) * .95, .02); place(x, thump(.8, 82, 30, .5) * 1.3, .3)
    place(x, lp(noise(.5), 650, 3) * env(N(.5), .004, .35, 4) * 1.2, .3); place(x, roar(.75) * env(N(.75), .02, .55, 3) * .75, .3); place(x, crackle(.8, 85, .5), .3)
    out['fn_ifrit_attack'] = finish(x, .88)
    d = 1.7; x = np.zeros(N(d)); place(x, sweep_bp(noise(1.0), 110, 1700, 1.2) * np.linspace(0, 1, N(1.0)) ** 1.6 * 1.2, 0); place(x, growl(.9, 60, 72, (220, 600), 4, .9) * env(N(.9), .15, .7, 2) * .5, .05)
    place(x, thump(.7, 95, 32, .45) * 1.25, .95); place(x, lp(noise(.6), 1500, 2) * env(N(.6), .003, .4, 3.5) * 1.2, .95); place(x, roar(.7) * env(N(.7), .02, .5, 3) * .6, .95); place(x, crackle(1.5, 90, .5), .15)
    out['fn_ifrit_attack2'] = finish(x, .9)
    d = .55; x = np.zeros(N(d)); place(x, bp(noise(.14), 500, 2800) * env(N(.14), .002, .09, 4) * .9, 0); place(x, growl(.38, 95, 72, (300, 800), 6, .7) * env(N(.38), .01, .28, 3) * .6, .02); place(x, crackle(.45, 70, .45), .02); place(x, roar(.3) * env(N(.3), .01, .2, 3) * .35, 0)
    out['fn_ifrit_hit'] = finish(x, .8)
    d = 3.2; x = np.zeros(N(d)); place(x, growl(1.7, 74, 34, (220, 620), 4, .9) * env(N(1.7), .06, 1.4, 2) * .75, 0); place(x, thump(.9, 90, 28, .6) * 1.1, .5); place(x, lp(noise(1.2), 1200, 2) * env(N(1.2), .01, .8, 3) * 1.0, .5)
    place(x, sweep_bp(noise(1.6), 260, 3200, 1.1) * np.sin(np.pi * np.linspace(0, 1, N(1.6))) ** .7 * 1.1, .55); place(x, roar(2.0) * np.linspace(.9, 0, N(2.0)) * .55, .5); place(x, crackle(2.4, 70, .5), .5); place(x, sizzle(1.4, .25) * np.linspace(1, 0, N(1.4)), 1.6)
    out['fn_ifrit_death'] = finish(x, .86)
    return out

if __name__ == '__main__':
    snd = S(); wav = '--wav' in sys.argv; only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else ''   # --only fn_ifrit → 그 몹 소리만 새로 씀 (다른 소리 파일은 그대로)
    if only: snd = {k: v for k, v in snd.items() if k.startswith(only)}
    dst = sys.argv[sys.argv.index('--wav') + 1] if wav else os.path.join(ROOT, 'assets', 'sound', 'sfx'); os.makedirs(dst, exist_ok=True)
    for k, x in snd.items():
        raw = x.tobytes(); p = os.path.join(dst, k + ('.wav' if wav else '.mp3'))
        args = ['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-'] + (['-c:a', 'pcm_s16le'] if wav else ['-c:a', 'libmp3lame', '-b:a', '96k']) + [p]
        subprocess.run(args, input=raw, check=True); print(k, round(len(x) / SR, 2), 's', 'rms', round(float(np.sqrt((x.astype(float) ** 2).mean())), 3))
