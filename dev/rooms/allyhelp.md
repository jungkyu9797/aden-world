# 아군(반왕) 봇 지원·원정 (갈래 `work/allyhelp`, 작업판 `tasks/allyhelp`, 분류 AI 봇) — 봇 전체 맥락은 `dev/rooms/aibot.md`, 지원군 줄이기는 `dev/rooms/reinfcut.md`

## 프로듀서 원문 (11/6)
- "적 봇이 지원이나 원정 오듯이 아군 봇도 같은 확률과 인원수로 지원과 원정 오게 해줘"

## 결정·결과
- 지원군(`reinfTick`): 라인(B) 쪽에 지원군을 부르면 같은 인원만큼 반왕(A) 지원군도 부름(`pick(tm, k, mir)` · 지역 자리 `room`을 반씩 · `STAT.reinf`는 원래 쪽만 · 거울은 `STAT.reinfA`). 반왕이 적어서 반왕을 부를 때(원래 규칙)는 라인을 거울로 안 부름.
- 보스(`bossTick`): 유저가 보스를 치는 중(`playerOn`)이면 보스로 온 이 지역 라인 봇 수만큼 이 지역 반왕 봇이 `bx.guard`(보스 곁 · `formSpot`으로 둘러섬 · 6칸 넘게 멀어지면 다시 'follow') — 보스는 치지 않음(`mobOk`가 보스를 뺌 · `bx.boss` 안 씀) · 라인 봇·유저를 때리는 적은 원래 규칙대로 상대. 유저가 빠지면 이 지역 반왕은 원래대로.
- 원정: 라인 원정 파티(`callParty('B')`)가 n명 오면 `callParty('A', m, key, n, true)` = 반왕 원정(VIS `guard`) n명 — 파티가 n명보다 적으면 다른 반왕 봇으로 채움. 보스가 끝나면 30초 뒤 돌아감(라인 원정과 같은 규칙). 도착 멘트는 '지원'(reinf).
- 테스트 `dev/tests/allyhelp.js`(①②) · reinfcut.js · fieldbot.js(⑤는 main에서도 실패하던 것).
