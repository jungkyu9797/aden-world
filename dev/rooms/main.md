지금 메인방: https://claude.ai/code/session_01PSbXoDoYAy5czXPAwG2P4a (10/30 교대 · 예약 작업으로 연 방은 PC에 안 보여서 이 방 유지)

# 메인방(배포 담당 방) 인수인계 — 10/30 교대

예전 메인방: https://claude.ai/code/session_01CV4TroADTYCEHxYpHJTZ7D (대화가 길어져 교대). 이 파일과 CLAUDE.md를 먼저 읽는다.

## 교대하자마자 할 일
1. 저장소 연결 → `git fetch` → `git checkout -B main origin/main` (메인방은 main에서 일하고, 배포 때 `rel/NNN` 갈래로 합친다).
2. 내 대화방 주소(커밋 끝 `Claude-Session:` 줄의 주소)를 확인해서
   - 작업판 db `meta/main` = `{ url: <내 주소>, at: <지금 ISO>, prev: "https://claude.ai/code/session_01CV4TroADTYCEHxYpHJTZ7D" }` (ArtifactData set, 작업판 https://claude.ai/artifact/XemyTMkY4DDuWZsAUJ3pQX) → 작업판의 [메인방 열기]·[메인방에서 업데이트] 버튼이 내 방으로 바뀜
   - CLAUDE.md의 메인방 주소를 내 주소로 고쳐서 main에 commit·push (게임 파일이 아니라서 배포 아님)
3. 프로듀서에게 한 줄: "메인방 교대했어요 · 이제 여기서 말씀해 주세요" + 아래 '지금 상태' 요약 3줄.

## 프로듀서와 일하는 방식 (요약 — 자세한 건 CLAUDE.md)
- 한국어로 짧게, 결과 위주. 사소한 건 알아서, 갈리는 것만 AskUserQuestion 팝업.
- 승인 대기 항목이 있으면 놓치지 않게 팝업으로 한 번 알려 주기를 원함 (승인 자체는 작업판 [승인] 버튼).
- 배포는 프로듀서가 이 방에 "업데이트"라고 할 때만, 업데이트 대기(queued) 카드만.
- 작업·테스트 결과는 원래 컴퓨터(hjk97) 게임 폴더 `C:\Users\hjk97\Downloads\AdenWorld\aden-survivors_1\game\`에 반영 (배포할 때). 컴퓨터가 꺼져 있으면 알려 준다.
- **리니지 클라이언트에서 뽑은 그림·소리는 절대 게임에 넣지 않는다.** 프로듀서가 자주 참고 자료로 클라이언트 추출 스프라이트 시트(`sprite00 / 39704~` 같은 번호)나 번호 붙은 wav(`라바골렘_공격_640.wav`)를 준다 → 컨셉만 참고하고 직접 만든다고 한 줄 안내. 10/30 프로듀서가 "오리지널 소리로 새로"를 골랐음(이후 같은 경우도 같은 방식).
  - 그림: 기존 우리 렌더에 색·무늬 입히기(`MS_ALIAS` + `lava` 같은 절차 무늬) 또는 캔버스로 직접 그리기(`drawDragonfly`·`drawBombFlower`·`drawAnt` 등 `ART` 종류).
  - 소리: `dev/sfx/fn_sfx.py`처럼 numpy로 합성 → `assets/sound/sfx/<몹>_<attack|attack2|hit|death>.mp3` → `MSFX`의 `has` 목록에 몹 이름 추가(보스 스킬음이 있으면 `K2`에도).
- 이름이 부적절한 Lv55 기사 캐릭터는 '기준 캐릭터'라고만 부른다. 장비 정보: `dev/sim/builds/ref_knight.json`.

## 지금 상태 (10/31 18:50 KST)
- 마지막 배포 **v205** (전설 변신 레벨 제한 없음 leglv · 요정 펫 3마리 elfpet · [전설 재뽑기] 버튼 비용 rrcost). v204: 전설 무기 칸 황금빛·줄임말 leggold · 렉 최적화 perf · 잠수: 테스트 페이지 캐릭터 복사 charcopy). v203: [다시 뽑기]에 소모·보유 골드. v202: 변신 카드 polymon + 전설 무기 legitem. v201: 할로윈 몹 경험치 감소 없음. v200: 게임 기록 서버 저장(Firestore `worldlog`).
  - 변신 카드(`work/polygacha`): 상단 [변신] 창 · 1회 5만/11회 50만 · TGFX 홀 연출(희귀 이상 금빛 · 공개 전 등급 색 숨김) · 합성(희귀/영웅은 홀 연출 · 11장 넘으면 [다음 카드]) · 마일리지 1000 = 무작위 전설 · 전설 재뽑기 300만→600만→1200만→무료 고르기(D.rr · 횟수는 카드를 따라감) · 소드 = 옛 아크 모습 · 아크 3종 금빛 효과(rcSpec·rcGround·rcSwing·rcFlash·rcHitFx) · 전설 카드 변신 금빛 오로라(polyAura) · 특별상점 변신 카드 탭 없음. 인수인계 `dev/rooms/polymon.md`. 테스트 polygacha·polygacha3·pcg_all·pcg_rr·arck·legaura (polygacha2.js는 2단계 화면용이라 안 맞음).
  - 전설 무기(`work/legitem`): 집행검·가이아의 격노·수정결정체 지팡이 · LEG_ROWS · +0 공격 = 직업별 용 무기 +9(LEG_DMG9) · 명중+15 추피+10 · [심판] 20%+강화당 2% · 내 피해 100%(마법사는 칼질 × spellMul · 공격 마법 X · 대인전 X) · 하늘 금빛 기둥 · 안전 강화 +0 · 강화당 +3 · 연금술 영웅 3개 → 전설 3%(축데이·축젤 10장당 +1%p 최대 +3%p · 직업 무작위) · 특별상점 장비 변경 주문서 1,000만(eq_change) · 방패 같이 들 수 있음 · 도감 '연금술' 표시(프로듀서 결정). 테스트 legitem.js. 시뮬 `dev/sim/wpn_probe.js` + `dev/sim/builds/ref_knight58.json`(기준 캐릭터 Lv58).
  - 합칠 때(rerere 기록): legitem↔polygacha — strike()에 rcHitFx와 judgeHit 둘 다 · RARITY_C 전설색 #ffa630 · 특별상점 탭은 legitem 줄(변신 카드 탭 없음) · 가방/장비 칸은 legFx 쪽.
  - 렉 최적화(`work/perf`, v204): 코드로 그린 몹(PROCFX: 거미·개미·전갈·잠자리·폭탄꽃·불알·아스타지오·이프리트)은 번쩍임·광폭화 필터가 있으면 procLayer로 한 장에 그린 뒤 필터 한 번 · 고른 대상 테두리(drawTgtOutline)는 작은 캔버스 1/30초마다·정수 칸 · 채팅 줄 나누기 CHWRAP · tintFrame LRU · 반딧불 스프라이트. 측정 스크립트는 세션 scratchpad의 cmp.js·prof5.js 방식(CDP Profiler + 긴 프레임 표본). 새 코드 그림 몹을 만들 때 번쩍임을 g.filter로 하면 PROCFX에 넣을 것.
  - 캐릭터 복사(`work/charcopy`, v204 잠수): 본섭 운영자 [살펴보기 → 복사 코드] → 테스트 페이지 갓 모드 [캐릭터 복사]. charcopy_adm.js의 '받는 중' 확인은 응답이 빠르면 실패(타이밍) — 버그 아님.
- **승인 대기**: aibot(`work/aibot` 혈맹·필드 봇 1단계 · 전투력 1등 복사 · Firestore worldbot 규칙은 프로듀서가 넣음). 테스트 판 = `work/stage-all` = main + aibot.
- 보조 작업자 worktree `.claude/worktrees/agent-a8224c55fd10ac7e6`(work/legitem)은 끝나면 지워도 됨. 원격 `work/polyrr`는 지우기가 막혀 남아 있음(안 씀).
- 휴대폰 알림: 작업 끝·승인 대기·팝업 질문 때 PushNotification.
- 결정 대기: 기사 리덕션 아머 레벨 비례(추천 20%+51렙부터 1%, 최대 35%) · 다음 사냥터 컨셉(nextzone) · 밤 전용 재료(달빛 조각 등) 아이디어.
- 시뮬: `dev/sim/fn_sim.js` (NIGHT=1 밤 고정 · NOMANA=1 마나 물약 없이 · DEF='{"spSoft":40}' · SUMB='{"dmg":0.75}') · 빌드 `dev/sim/builds/ref_wizard57.json`·`ref_knight57.json`(10/31 실제 두 캐릭터). 법사 시뮬은 판마다 편차가 커서 5번 이상 평균.
- 동시 작업: Agent + `isolation: worktree` + 서로 다른 `KT_PORT`. 테스트 동시 2개까지(OOM). `pgrep -f`에 포트를 넣지 말 것(자기 셸이 걸림) — 끝 표시 파일로 기다림.

## 메인방 도구·요령
- 묶음 테스트 판: 작업판에서 ready·test·queued 카드의 branch → `python3 dev/stage_test.py <갈래들>` → 테스트 아티팩트(https://claude.ai/artifact/MZNnyPab1VtMTqbtEyuay6) publish `file_path=dev/out/publish.html`, `root=<저장소>`, `files={}` → 테스트 db `tbuild/cur` = build.json의 {id, at, n} → 작업판 db `meta/test` = 같은 값 + branches. (다른 대화에서 처음 올릴 때는 먼저 Artifact read 한 번 — 페이지가 4.5MB라 읽기가 막히면 publish를 바로 해 보고, 거절되면 돌려준 판 위에 다시 올린다.)
- **테스트 아티팩트 파일은 511개 한도(지금 509개)**. 효과음 mp3는 `dev/build_test.py`가 페이지 안에 넣으므로 files에 넣지 않는다. 새 그림 파일이 많아지면 같은 방식으로 넣거나 안 쓰는 파일을 `null`로 뺀다.
- 작업판 원본: `dev/board/board.html` (10/30 메인방이 올린 v9: 메인방 버튼 주소를 db `meta/main`에서 읽음). 고칠 때: 작업판을 Artifact read 한 번 → 이 파일 고쳐서 같은 url로 publish.
- 배포 순서는 CLAUDE.md '배포 담당 방 규칙' 그대로 (rel/NNN 갈래에 queued 갈래 합치기 → GAME_VER +1 → 소식 목록 → 테스트 → `python3 dev/release.py` → `bash dev/keycheck.sh` → commit → main ff → push → 원래 컴퓨터 게임 폴더에 device_commit_files(force) → 작업판 releases/vNNN·meta/live·카드 done+ver → dev/notes 비우기 → 남은 승인 대기로 테스트 판 다시).
- 새 에셋(mp3·webp)이 있는 배포는 원래 컴퓨터에도 그 파일들을 같이 넣는다(device_commit_files는 staged 경로가 /mnt/user-data/outputs/ 아래여야 함 → 먼저 그곳에 복사).
- 시뮬: `BUILD=dev/sim/builds/ref_knight.json bash dev/runkt.sh "dev/sim/zone_scale_sim.js <지역> 600 HPxDMG[xSPD[xDENS]] <반복>"`.
- 몬스터 그림 확인: `dev/tests/fn_art_sfx.js` (화둥 몹 공격·사망·효과음 열림), `dev/tests/fn_look.js`.
- 자동 판정기가 막는 것(돌아가지 말 것): 반복 예약 작업, fire_trigger, delete_trigger, 운영자 키 업로드.
- 예전 메인방에 남은 한 번짜리 알림(send_later `trig_01Tc8yQBN8ZhUFwrByCxWq2t`, 10/30 19:36 KST)이 예전 방으로 울림 — 무시해도 됨.
