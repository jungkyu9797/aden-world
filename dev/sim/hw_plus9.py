# 일반 호박 강화 주문서만으로 할로윈 모자 +9 만들기 (몬테카를로) — python3 dev/sim/hw_plus9.py
# 규칙: +4까지 안전 · 그 위는 성공 1/3, 실패하면 증발 · 최대 +9. 주문서 수급(시간당)은 hw_hunt_sim.js 결과(Lv55 기사 · 초록+용기 · 자동사냥).
# 방식 A: 모자 하나만 계속 강화(깨지면 새 모자) · B: 가장 높은 모자는 사냥용으로 두고 새 모자(100골드)로 도전
import random, statistics as st
RATE = {0: 44 / 2, 4: 81 / 2, 7: 89 / 2, 9: 106 / 2}   # 시간당 일반 주문서 (모자 +0/+4/+7/+9 · 2시간 시뮬 ÷2 · 강화 1당 타수 −1 방식)
def rate(b):
    if b >= 7: return RATE[7] + (RATE[9] - RATE[7]) * min(1, (b - 7) / 2)
    if b >= 4: return RATE[4] + (RATE[7] - RATE[4]) * (b - 4) / 3
    return RATE[0] + (RATE[4] - RATE[0]) * b / 4
def run(rnd, keep):
    best, cur, hats, scr, hours = 0, 0, 1, 0, 0.0
    while max(best, cur) < 9:
        hours += 1 / rate(max(best, cur) if keep else cur); scr += 1   # 주문서 1장 얻는 데 드는 시간 (사냥 속도는 가방에서 가장 높은 모자)
        if cur < 4 or rnd.random() < 1 / 3:
            cur += 1
            if keep and cur > best and cur < 9: best = cur; cur = 0; hats += 1   # 기록 갱신 → 사냥용으로 두고 새 모자
        else: cur = 0; hats += 1   # 증발 → 새 모자
    return hats, scr, hours
for keep, title in [(False, '[A] 모자 하나에 계속 (깨지면 새 모자)'), (True, '[B] 가장 높은 모자는 사냥용으로 두고 새 모자로 도전')]:
  print(title); R = [run(random.Random(s), keep) for s in range(20000)]
  for k, nm in [(0, '모자(개)'), (1, '일반 주문서(장)'), (2, '사냥 시간(시간)')]:
    v = sorted(x[k] for x in R); print('  ' + f'{nm}: 평균 {st.mean(v):,.0f} · 중간 {v[len(v)//2]:,.0f} · 운 좋은 10% {v[len(v)//10]:,.0f} · 운 나쁜 10% {v[len(v)*9//10]:,.0f}')
print('이론: 모자 1개가 +4→+9 성공할 확률 (1/3)^5 = 1/243 → 모자 약 243개 · 주문서 약', round(243 * (4 + sum((1/3)**k for k in range(5)))))
for t in [4, 7]:
    p = (1/3) ** (t - 4); print(f'+{t}: 모자 약 {1/p:.0f}개 · 주문서 약 {1/p*(4+sum((1/3)**k for k in range(t-4))):.0f}장')
