# 몽환의 섬 정령 효과음 합성 (11/1 2차) — 외부 음원 없이 코드로만 만듦 (잡음·사인파 + 필터 + 소리 크기 곡선)
#   python3 dev/sfx_dream.py → assets/sound/sfx/dr_<속성>_<종류>.mp3 (속성 fire·water·earth·wind × attack·hit·death·cast = 16개 · 각 20KB 이하)
#   같은 씨앗(seed)이면 늘 같은 소리. 바꾸고 싶으면 아래 함수의 숫자만 고치고 다시 실행.
import os, subprocess, tempfile, wave
import numpy as np
SR = 22050
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'sound', 'sfx')

def T(d): return np.arange(int(SR * d)) / SR
def noise(d, seed): return np.random.default_rng(seed).uniform(-1, 1, int(SR * d))
def env(t, a, d, curve=2.0):   # 올라감 a초 → 내려감 (지수)
    e = np.minimum(1, t / max(a, 1e-4)); return e * np.exp(-np.maximum(0, t - a) / max(d, 1e-4) * curve / 2)
def bell(t, c, w): return np.exp(-((t - c) / w) ** 2)
def biquad(x, f, q, kind='bp'):   # 시간에 따라 바뀌는 RBJ 필터 (f·q는 숫자 또는 배열)
    n = len(x); f = np.broadcast_to(np.asarray(f, float), (n,)); q = np.broadcast_to(np.asarray(q, float), (n,)); y = np.zeros(n); x1 = x2 = y1 = y2 = 0.0
    for i in range(n):
        w = 2 * np.pi * min(f[i], SR * 0.45) / SR; cw, sw = np.cos(w), np.sin(w); al = sw / (2 * q[i])
        if kind == 'bp': b0, b1, b2 = al, 0.0, -al
        elif kind == 'lp': b0 = b2 = (1 - cw) / 2; b1 = 1 - cw
        else: b0 = b2 = (1 + cw) / 2; b1 = -(1 + cw)
        a0, a1, a2 = 1 + al, -2 * cw, 1 - al
        v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2, x1, y2, y1 = x1, x[i], y1, v; y[i] = v
    return y
def sweep(t, f0, f1, k=1.0): return f0 * (f1 / f0) ** np.clip(t / t[-1], 0, 1) ** k
def tone(t, f, ph=0.0): return np.sin(2 * np.pi * np.cumsum(np.broadcast_to(np.asarray(f, float), t.shape)) / SR + ph)
def crackle(d, rate, seed, dec=0.004):   # 불 타닥 소리: 무작위 짧은 딸깍
    r = np.random.default_rng(seed); n = int(SR * d); y = np.zeros(n); k = int(SR * dec * 6)
    for p in np.flatnonzero(r.random(n) < rate / SR):
        L = min(k, n - p); y[p:p + L] += r.uniform(-1, 1, L) * np.exp(-np.arange(L) / (SR * dec)) * r.uniform(0.3, 1)
    return y
def blips(d, n, seed, f0=400, f1=1400):   # 물 거품: 위로 올라가는 짧은 사인
    r = np.random.default_rng(seed); y = np.zeros(int(SR * d))
    for _ in range(n):
        p = int(r.uniform(0, d - 0.08) * SR); L = int(SR * r.uniform(0.03, 0.07)); tt = np.arange(L) / SR; f = r.uniform(f0, f1) * (1 + tt / tt[-1] * r.uniform(0.6, 1.4))
        y[p:p + L] += np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / tt[-1]) * r.uniform(0.3, 1)
    return y
def knocks(d, times, seed):   # 바위 부딪힘: 낮은 쿵 + 짧은 깨짐
    r = np.random.default_rng(seed); y = np.zeros(int(SR * d))
    for (at, amp) in times:
        p = int(at * SR); L = min(int(SR * 0.25), len(y) - p); tt = np.arange(L) / SR
        y[p:p + L] += amp * (np.sin(2 * np.pi * np.cumsum(70 * np.exp(-tt * 6) + 38) / SR) * np.exp(-tt * 18) + 0.6 * r.uniform(-1, 1, L) * np.exp(-tt * 60))
    return y

def fire_attack():
    d = 0.42; t = T(d); w = biquad(noise(d, 1), sweep(t, 300, 1800, 0.7), 1.2) * bell(t, 0.17, 0.11) * 2.2
    return w + 0.5 * biquad(crackle(d, 60, 2), 2500, 0.8, 'hp') * env(t, 0.05, 0.25) + 0.5 * tone(t, sweep(t, 110, 60)) * env(t, 0.01, 0.12)
def fire_hit():
    d = 0.2; t = T(d); return 1.4 * biquad(noise(d, 3), 3200, 0.9, 'hp') * env(t, 0.003, 0.07) + 0.7 * crackle(d, 140, 4) * env(t, 0.0, 0.12)
def fire_death():
    d = 1.15; t = T(d); roar = biquad(noise(d, 5), sweep(t, 1400, 160, 0.8), 0.9, 'lp') * env(t, 0.04, 0.7) * 1.3
    return roar + 0.6 * biquad(crackle(d, 90, 6), 2000, 0.7, 'hp') * env(t, 0.02, 0.6) + 0.35 * tone(t, sweep(t, 90, 45)) * env(t, 0.02, 0.5) + 0.4 * biquad(noise(d, 7), 6000, 0.7, 'hp') * bell(t, 0.9, 0.18)
def fire_cast():
    d = 0.95; t = T(d); rise = biquad(noise(d, 8), sweep(t, 200, 2600, 1.4), 2.5) * np.clip(t / 0.75, 0, 1) ** 1.6 * 2.4
    burst = biquad(noise(d, 9), 900, 0.7) * bell(t, 0.8, 0.08) * 1.6
    return rise * (t < 0.82) + burst + 0.6 * crackle(d, 120, 10) * np.clip(t / 0.8, 0, 1) + 0.3 * tone(t, sweep(t, 70, 140)) * np.clip(t / 0.8, 0, 1) * (t < 0.85)
def water_attack():
    d = 0.4; t = T(d); sl = biquad(noise(d, 11), sweep(t, 900, 300), 1.1, 'lp') * env(t, 0.02, 0.18) * 1.6
    return sl + 0.6 * tone(t, sweep(t, 520, 180, 0.6)) * env(t, 0.005, 0.12) + 0.45 * blips(d, 3, 12, 500, 1100)
def water_hit():
    d = 0.22; t = T(d); return 1.2 * biquad(noise(d, 13), 1600, 1.0) * env(t, 0.002, 0.06) + 0.7 * blips(d, 3, 14, 700, 1500)
def water_death():
    d = 1.15; t = T(d); sp = biquad(noise(d, 15), sweep(t, 2400, 400, 0.6), 0.8, 'lp') * env(t, 0.01, 0.45) * 1.6
    return sp + 0.8 * blips(d, 14, 16, 300, 1200) * np.clip(1.2 - t, 0, 1) + 0.4 * tone(t, sweep(t, 300, 70)) * env(t, 0.01, 0.4)
def water_cast():
    d = 0.95; t = T(d); r = np.random.default_rng(17); chime = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * r.uniform(2, 4)) * a for f, a in [(1320, 0.4), (1975, 0.3), (2637, 0.25), (3520, 0.15)]) * np.clip(t / 0.02, 0, 1)
    rush = biquad(noise(d, 18), sweep(t, 400, 1600, 1.2), 1.4) * np.clip(t / 0.7, 0, 1) ** 1.3 * (t < 0.85) * 1.6
    return 0.7 * chime + rush + 0.5 * blips(d, 6, 19, 800, 2000) * np.clip(t / 0.7, 0, 1)
def earth_attack():
    d = 0.42; t = T(d); thud = tone(t, 55 + 60 * np.exp(-t * 18)) * env(t, 0.004, 0.16) * 1.1
    return thud + 0.8 * biquad(noise(d, 21), 700, 0.6, 'lp') * env(t, 0.002, 0.1) + 0.35 * biquad(crackle(d, 50, 22, 0.006), 1800, 0.8) * env(t, 0.0, 0.2)
def earth_hit():
    d = 0.22; t = T(d); return 1.0 * biquad(noise(d, 23), 2200, 0.7) * env(t, 0.001, 0.035) + 0.9 * tone(t, 90 + 80 * np.exp(-t * 30)) * env(t, 0.002, 0.07)
def earth_death():
    d = 1.25; t = T(d); rum = biquad(noise(d, 25), 120, 0.7, 'lp') * env(t, 0.05, 0.8) * 3.0
    return rum * 1.4 + knocks(d, [(0.0, 1.0), (0.18, 0.7), (0.33, 0.8), (0.52, 0.5), (0.7, 0.45), (0.86, 0.3)], 26) + 0.1 * biquad(noise(d, 27), 3000, 0.7, 'hp') * env(t, 0.01, 0.35)
def earth_cast():
    d = 0.95; t = T(d); grind = biquad(crackle(d, 900, 28, 0.003), sweep(t, 300, 900), 1.0) * np.clip(t / 0.8, 0, 1) * 1.4
    return grind + biquad(noise(d, 29), sweep(t, 60, 160), 0.8, 'lp') * np.clip(t / 0.8, 0, 1) * (t < 0.85) * 3.0 + knocks(d, [(0.82, 1.0)], 30)
def wind_attack():
    d = 0.4; t = T(d); return 2.6 * biquad(noise(d, 31), sweep(t, 400, 2600, 0.9), 2.2) * bell(t, 0.18, 0.1)
def wind_hit():
    d = 0.18; t = T(d); return 1.6 * biquad(noise(d, 33), 1800, 1.2) * env(t, 0.004, 0.06)
def wind_death():
    d = 1.25; t = T(d); f = 700 + 300 * np.sin(2 * np.pi * 1.3 * t) - 300 * t; howl = biquad(noise(d, 35), f, 6.0) * env(t, 0.08, 0.8) * 4.0
    return howl + 1.2 * biquad(noise(d, 36), sweep(t, 2400, 300), 1.0) * env(t, 0.01, 0.5)
def wind_cast():
    d = 0.95; t = T(d); a = biquad(noise(d, 37), 500 + 400 * np.sin(2 * np.pi * 2.2 * t) + 600 * t, 5.0); b = biquad(noise(d, 38), 900 + 500 * np.sin(2 * np.pi * 1.7 * t + 1) + 900 * t, 5.0)
    return (a + b) * np.clip(t / 0.75, 0, 1) ** 1.2 * (t < 0.86) * 3.2 + 1.4 * biquad(noise(d, 39), 1400, 0.9) * bell(t, 0.84, 0.06)

def save(name, y):
    y = np.asarray(y, float); y -= np.mean(y); n = len(y); fade = int(SR * 0.012); y[:fade] *= np.linspace(0, 1, fade); y[-fade * 2:] *= np.linspace(1, 0, fade * 2)
    y = y / (np.max(np.abs(y)) + 1e-9) * 0.89
    tmp = tempfile.NamedTemporaryFile(suffix='.wav', delete=False).name
    with wave.open(tmp, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype('<i2').tobytes())
    out = os.path.join(OUT, name + '.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-ac', '1', '-ar', str(SR), '-c:a', 'libmp3lame', '-b:a', '64k', '-map_metadata', '-1', out], check=True); os.unlink(tmp)
    sz = os.path.getsize(out); assert sz <= 20 * 1024, (name, sz); print(f'{name}.mp3 {sz} B {n / SR:.2f}s')

if __name__ == '__main__':
    for el in ['fire', 'water', 'earth', 'wind']:
        for k in ['attack', 'hit', 'death', 'cast']: save(f'dr_{el}_{k}', globals()[f'{el}_{k}']())
