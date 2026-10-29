# 할로윈 1주일(하루 2시간 × 7일) 호박 주머니 통계 — 모자 강화가 오르는 것까지 (일반 주문서만 · 가장 높은 모자는 사냥용으로 두고 새 모자로 도전)
# 시간당 수급은 hw_hunt_sim.js 결과 (Lv55 기사 · 초록+용기 · 자동사냥 · 강화 1당 타수 −1)
import random, statistics as st
SEED = {0: 1098, 4: 1334, 5: 1512, 7: 1823, 9: 2224}; SCR = {0: 44, 4: 81, 5: 73, 7: 89, 9: 106}   # 2시간당
def lerp(T, b):
    ks = sorted(T); lo = max(k for k in ks if k <= b); hi = min([k for k in ks if k >= b] or [9])
    return (T[lo] if hi == lo else T[lo] + (T[hi] - T[lo]) * (b - lo) / (hi - lo)) / 7200
# 주머니 사슬: 호박 → 고급 인형 60% / 희귀 주머니 40% → 희귀 인형 60% / 영웅 주머니 40% → 영웅 장비 70% / 영웅 인형 30%
import sys
A, B, C = (float(x) for x in (sys.argv[1:4] if len(sys.argv) > 3 else (0.6, 0.6, 0.7)))   # 고급 인형 확률 · 희귀 인형 확률 · 영웅 장비 확률
def openP(r):
    if r.random() < A: return '고급 마법인형'
    if r.random() < B: return '희귀 마법인형'
    return '영웅 장비' if r.random() < C else '영웅 마법인형'
def week(seed, days=7):
    r = random.Random(seed); best = cur = 0; seeds = 0.0; scr = 0.0; dt = 10; got = {}; daily = []; hats = 1
    for d in range(days):
        s0 = seeds
        for _ in range(7200 // dt):
            seeds += lerp(SEED, best) * dt; scr += lerp(SCR, best) * dt
            while scr >= 1 and best < 9:
                scr -= 1
                if cur < 4 or r.random() < 1 / 3:
                    cur += 1
                    if cur > best: best = cur; cur = 0; hats += 1
                else: cur = 0; hats += 1
        daily.append((int(seeds) // 100) - (int(s0) // 100))
    n = int(seeds) // 100
    for _ in range(n): k = openP(r); got[k] = got.get(k, 0) + 1
    return n, daily, got, best, hats
R = [week(s) for s in range(5000)]
print('하루 주머니 (1일차~7일차 평균):', ' · '.join(f'{st.mean(x[1][d] for x in R):.1f}' for d in range(7)))
n = [x[0] for x in R]; print(f'1주일 주머니: 평균 {st.mean(n):.0f}개 (하루 평균 {st.mean(n)/7:.1f}) · 모자 평균 +{st.mean(x[3] for x in R):.1f} · 산 모자 평균 {st.mean(x[4] for x in R):.0f}개')
for k in ['고급 마법인형', '희귀 마법인형', '영웅 장비', '영웅 마법인형']:
    v = sorted(x[2].get(k, 0) for x in R); print(f'  {k}: 평균 {st.mean(v):.1f}개 · 운 나쁜 10% {v[len(v)//10]} · 운 좋은 10% {v[len(v)*9//10]} · 0개일 확률 {sum(1 for a in v if a == 0)/len(v)*100:.1f}%')
