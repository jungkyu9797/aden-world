# 서먼·보스 밸런스 작업방 (갈래 `work/summon`, 작업판 `tasks/summon`)

## 목표
마법사가 서먼 몬스터로 보스를 혼자 잡을 수 있게.

## 프로듀서 결정 (10/29)
- 1~4 모두 + ① + ② 적용:
  1. 소환수가 보스에게 주는 피해 −50% 해제 (펫은 그대로)
  2. 소환수에게 맞은 보스는 소환수를 계속 노림 (탱커)
  3. 소환수가 보스에게 받는 피해 −50% (범위 마법 포함)
  4. 소환 단계 레벨보다 마법사 레벨이 1 높을 때마다 소환수 HP·공격 +3%
  ① 보스가 소환수를 노리는 동안에는 범위 마법도 소환수 쪽에
  ② 보스전에서 서먼 MP 30→15, 소환수가 하나 쓰러질 때마다 바로 다시 부르기(그때 MP 5)
- PvP(AI 봇·사람)에게 쓰러졌을 때는 하나씩 바로 부르기 없음 → 다 쓰러져야 다시 (PvP는 아직 없지만 미리)

## 코드
- `src/game.js` PET 모듈: `const SUMB = { bossK, tank, take, lv, hp, dmg, heroLv }` (기본값 = 예전 그대로), `sumSpawn`·`petRange`·펫 공격·`hurt`, 기사 근접 타격의 어그로(`strike`).
- 자동 서먼: `skAuto` 안 `holdSum`·`kind === 'summon'`.

## 시뮬
- `python3 dev/mkkt.py && python3 dev/mksim.py` → `bash dev/runkt.sh "dev/sim/summon_boss_sim.js A baphomet,kaspar,deathknight,ice_queen,drake_king dev/out/A.json 1"`
- 조건: 카리스마 12(3마리), 촐기·용기, 맑은 물약 55%, Lv40·45 중급 장비, Lv48+ 영웅급 +5~7 (`dev/sim/pvpbuilds.js`). 미로 보스(카스파·데스나이트)는 13번 지역에서.
- 10/29 결과(한 번씩): 지금 = 얼음여왕만 성공(6분) · 1~4 = 얼음여왕 3분 50초·드레이크 킹 11분 30초 성공 · 바포메트(Lv40) 20~35% 남기고 사망 · 카스파 패밀리 7초 사망 · 데스나이트 30~78초 사망. 원인은 마법사가 먼저 죽음(범위 마법·MP 0).
