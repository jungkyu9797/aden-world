# 봇 지원군·보스 원정 줄이기 (갈래 `work/reinfcut`, 작업판 `tasks/reinfcut`, 분류 AI 봇) — 봇 전체 맥락은 `dev/rooms/aibot.md`

- 프로듀서: 기준 캐릭터가 1:1은 다 이기는데 조금만 싸우면 적이 떼로 오고 보스 칠 때도 떼로 옴(화둥 2구역 자동 반격 사냥·보스) → 팝업 '지원군·원정만 줄이기'.
- `REINF_AT` 25→60 · 새 `REINF_MAX` 2(한 번에 부르는 수) · 새 `REINF_CD` 180(부른 뒤 쉼 · `FT.cd` · 지역 옮기면 0 · 테스트용 `DBG.reinfCd`) · `BS_PT` 0.5→0.2(원정 파티). 그 맵 봇 꼬장(`BS_SPAWN` 0.5 · `BS_P` 0.7)은 그대로.
- 테스트 `dev/tests/reinfcut.js`(①~④) · fieldbot3.js ⑦을 60초 기준으로 바꿈. fieldbot3.js ⑤·⑦은 main에서도 실패(테스트 캐릭터가 Lv1 = 중립이라 봇이 안 덤빔 — 11/3 중립 규칙 뒤로 테스트가 낡음).

