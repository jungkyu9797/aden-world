지금 메인방: https://claude.ai/code/session_01PSbXoDoYAy5czXPAwG2P4a (10/30 교대 · 예약 작업으로 연 방은 PC에 안 보여서 이 방 유지)

## 11/2 2D 종료 → 11/3 다시 계속
- **11/3 프로듀서: 2D는 이전처럼 이 메인방에서 업데이트·배포를 계속한다. 3D는 'Aden World 3D 프로젝트 시작' 대화방(aden-world-3d 저장소)에서.**
- 프로듀서 결정: 2D 아덴 월드 개발 종료 (배포 안 함 · v218 마지막). 11/3: 친구 3명이 v218을 당분간 플레이 → AWS aden-bothost·aden-relay는 **켜 둠**(크레딧 $118.86 남음 · 2027-10-29 만료 · 11월 1~3일 사용 $1.14) · 새 친구용 PC판 AdenWorld_v218.zip(Electron 44.10.1)을 채팅으로 줌. 멈출 때는 프로듀서가 콘솔에서 (Claude는 AWS 접근 없음). Firebase(계정·Firestore)와 이 저장소는 3D판 로그인·이전·참고용으로 보존. 3D판은 비공개 저장소 aden-world-3d의 별도 대화방에서 진행. 예약 작업 없음(11/2 확인).

# 메인방(배포 담당 방) 인수인계 — 10/30 교대

예전 메인방: https://claude.ai/code/session_01CV4TroADTYCEHxYpHJTZ7D (대화가 길어져 교대). 이 파일과 CLAUDE.md를 먼저 읽는다.

## 교대하자마자 할 일
1. 저장소 연결 → `git fetch` → `git checkout -B main origin/main` (메인방은 main에서 일하고, 배포 때 `rel/NNN` 갈래로 합친다).
2. 내 대화방 주소(커밋 끝 `Claude-Session:` 줄의 주소)를 확인해서
   - 작업판 db `meta/main` = `{ url: <내 주소>, at: <지금 ISO>, prev: "https://claude.ai/code/session_01CV4TroADTYCEHxYpHJTZ7D" }` (ArtifactData set, 작업판 https://claude.ai/artifact/XemyTMkY4DDuWZsAUJ3pQX) → 작업판의 [메인방 열기]·[메인방에서 업데이트] 버튼이 내 방으로 바뀜
   - CLAUDE.md의 메인방 주소를 내 주소로 고쳐서 main에 commit·push (게임 파일이 아니라서 배포 아님)
   - **작업판 [업데이트] 버튼 다시 잇기 (11/5~)**: 내 세션에서 `send_later`(at = 1년 뒤 · name '작업판 [업데이트] 버튼 → 메인방' · message는 예전 예약과 같은 문구 — `list_triggers`로 예전 것을 보고 그대로) → 나온 `trigger_id`를 작업판 db `meta/main.trig`에 update. 예전 메인방의 예약은 `delete_trigger`(그 방으로 울리지 않게).
3. 프로듀서에게 한 줄: "메인방 교대했어요 · 이제 여기서 말씀해 주세요" + 아래 '지금 상태' 요약 3줄.

## 프로듀서와 일하는 방식 (요약 — 자세한 건 CLAUDE.md)
- 한국어로 짧게, 결과 위주. 사소한 건 알아서, 갈리는 것만 AskUserQuestion 팝업.
- 승인 대기 항목이 있으면 놓치지 않게 팝업으로 한 번 알려 주기를 원함 (승인 자체는 작업판 [승인] 버튼).
- 배포는 프로듀서가 이 방에 "업데이트"라고 할 때만, 업데이트 대기(queued) 카드만.
- 원래 컴퓨터 게임 폴더에는 파일을 직접 넣지 않는다 (11/5 프로듀서: PC 자동 업데이트가 있으니 안 해도 됨). 배포 보고에 '컴퓨터에 못 넣었다'는 말도 하지 않는다.
- **리니지 클라이언트에서 뽑은 그림·소리는 절대 게임에 넣지 않는다.** 프로듀서가 자주 참고 자료로 클라이언트 추출 스프라이트 시트(`sprite00 / 39704~` 같은 번호)나 번호 붙은 wav(`라바골렘_공격_640.wav`)를 준다 → 컨셉만 참고하고 직접 만든다고 한 줄 안내. 10/30 프로듀서가 "오리지널 소리로 새로"를 골랐음(이후 같은 경우도 같은 방식).
  - 그림: 기존 우리 렌더에 색·무늬 입히기(`MS_ALIAS` + `lava` 같은 절차 무늬) 또는 캔버스로 직접 그리기(`drawDragonfly`·`drawBombFlower`·`drawAnt` 등 `ART` 종류).
  - 소리: `dev/sfx/fn_sfx.py`처럼 numpy로 합성 → `assets/sound/sfx/<몹>_<attack|attack2|hit|death>.mp3` → `MSFX`의 `has` 목록에 몹 이름 추가(보스 스킬음이 있으면 `K2`에도).
- 이름이 부적절한 Lv55 기사 캐릭터는 '기준 캐릭터'라고만 부른다. 장비 정보: `dev/sim/builds/ref_knight.json`.

## 지금 상태 (10/31 18:50 KST)
- **서버(11/2)**: AWS 계정 **aden-world-seoul**(서울 · 유료 전환 · 예산 알림 aden-monthly-15usd → 36달러) — 중계 서버 EC2 `aden-relay`(t4g.micro · 탄력적 IP 3.39.241.77 · 절대 중지 금지) + 봇 서버 EC2 `aden-bothost`(t4g.small 2GB · Ubuntu 24.04 arm64 · 16GiB · 키 없음 · 접속은 콘솔 [연결]→EC2 Instance Connect · 보안 그룹 launch-wizard-1 SSH 13.209.1.56/29만). 봇 서버: `~/aden-world`(main) · `server/bothost/config.json`(bothost 계정 · memCapMB 1400 · git에 안 올라감) · systemd `aden-bothost` (11/2 03:51 UTC부터 실행 · 8지역 host · rss ~630MB · 20Hz) · 로그 `sudo journalctl -u aden-bothost -f` · 서버 코드 바뀌면 `cd ~/aden-world && git pull && sudo systemctl restart aden-bothost` (게임 배포는 러너가 5분 안에 자동 새로 고침). 다른 계정 'Sunlit Servers'(시드니 전용 무료)는 안 씀.
- 마지막 배포 **v218** (메모리 줄이기 mem: 배경음 트는 곡+바로 전 곡만 · MIMG Proxy로 지역 들어갈 때 받기·20초 안 그린 종류 놓기 MIMG_TRIM · 가호/도감/카드는 mIdle(idle 한 장) · 바닥 그림 지금+바로 전 지역만 · 예전 통짜 기사·마을 사람 그림 IM_LAZY · 몽환의 섬 그림 들어갈 때 · 인형 그림 아이콘 뒤 놓기 · TINTED/TFR 화소 상한 · 측정 dev/tests/mem.js). v217: (렉 줄이기 lag: 저사양 그래픽 LOWG — ESC [그래픽] · PC에서 10초씩 두 번 초당 24프레임 아래면 자동(aden_low=a) · 배율 1·그리기 30fps·입자 줄임·타격 멈춤 없음 / 게스트 몹 follow를 호스트 속도(nv · presence q 번호)로 / ornate 캐시 / main.js ignore-gpu-blocklist(+gpu_safe) · gpu:status / 채팅 /렉 진단 · 새 그래픽 눈부심 glaura). v216: (필드 봇 aibot + 24시간 봇 서버 코드 bothost(서버 가동 중 — 위 '서버') · 콜로세움 5분 colowin5 · 절전 오늘 할 일 savertodo · 새 그래픽(베타) webgl·webgl2(ESC 메뉴 · 기본 끔 · src/gl.js) · 타격감 hitfeel). v215: (창 최소화·가려도 게임 계속 bgrun: 워커 타이머 50ms · 화면 프레임 0.15초 없으면 BGRUN으로 그리기 없이 frame). v214: (자동사냥 시작 가운데 안내 4초 autoretmsg · 공용 centerNote). v213: (자동사냥 복귀 = 켠 자리 4칸 안 autoret · 전설 재뽑기 장마다 횟수 따로 rrsplit). v212: (같은 속성 피해 안 줄임 elnoloss: 무기 속성 same 0→1 · 마법 ×0.5 없앰 · DREAM.EL_SAME 1). v211: (절전 화면 saverinfo: 위치·좌표·몽환의 섬 방위 · 할로윈/몽환의 섬/콜로세움 남은 시간 · 전투 중 보스 HP · 혼자 잡은 몹 처치 수 · 업데이트 뒤 절전 이어서). v210: (콜로세움 리뉴얼 colo2: 입장권 없이 캐릭터마다 하루 1번 · 혼자 가능 · 1·2·3라운드 가호 보스 1·2·3마리 · 보스마다 모두에게 가호 완성품 · 클리어마다 주홍·맑은 물약 각 50 · 콜로세움 바닥 400개·시간 만료 없음·퇴장 때 정리). v209: 가방 [재료]·[가호] 탭 invtab · 전설 축복 1%·전설 무기 3단 공속 legbless. v208: 몽환의 섬 dream: 지역 24 · N133 · 정령/대정령 실사 렌더 assets/dream/*.webp · 유니콘 · 퓨어엘릭서·엘릭서 · 하루 4시간 DRM · 월드맵 남은 시간 / 할로윈 피해 = 모자 강화 hwhat). v207: [게임 기록] 창·worldlog 서버 저장/읽기 아예 없앰 — 프로듀서 지시 · GLOG는 빈 껍데기). v206: 핫픽스: 게임 기록 받아오기 새 글만·10분 — Firestore 무료 읽기 한도 초과로 접속 불가 'Quota exceeded' 고침 · CLOUD.query에 gt 인자). v205: 전설 변신 레벨 제한 없음 leglv · 요정 펫 3마리 elfpet · [전설 재뽑기] 버튼 비용 rrcost). v204: 전설 무기 칸 황금빛·줄임말 leggold · 렉 최적화 perf · 잠수: 테스트 페이지 캐릭터 복사 charcopy). v203: [다시 뽑기]에 소모·보유 골드. v202: 변신 카드 polymon + 전설 무기 legitem. v201: 할로윈 몹 경험치 감소 없음. v200: 게임 기록 서버 저장(Firestore `worldlog`).
  - 변신 카드(`work/polygacha`): 상단 [변신] 창 · 1회 5만/11회 50만 · TGFX 홀 연출(희귀 이상 금빛 · 공개 전 등급 색 숨김) · 합성(희귀/영웅은 홀 연출 · 11장 넘으면 [다음 카드]) · 마일리지 1000 = 무작위 전설 · 전설 재뽑기 300만→600만→1200만→무료 고르기(D.rr · 횟수는 카드를 따라감) · 소드 = 옛 아크 모습 · 아크 3종 금빛 효과(rcSpec·rcGround·rcSwing·rcFlash·rcHitFx) · 전설 카드 변신 금빛 오로라(polyAura) · 특별상점 변신 카드 탭 없음. 인수인계 `dev/rooms/polymon.md`. 테스트 polygacha·polygacha3·pcg_all·pcg_rr·arck·legaura (polygacha2.js는 2단계 화면용이라 안 맞음).
  - 전설 무기(`work/legitem`): 집행검·가이아의 격노·수정결정체 지팡이 · LEG_ROWS · +0 공격 = 직업별 용 무기 +9(LEG_DMG9) · 명중+15 추피+10 · [심판] 20%+강화당 2% · 내 피해 100%(마법사는 칼질 × spellMul · 공격 마법 X · 대인전 X) · 하늘 금빛 기둥 · 안전 강화 +0 · 강화당 +3 · 연금술 영웅 3개 → 전설 3%(축데이·축젤 10장당 +1%p 최대 +3%p · 직업 무작위) · 특별상점 장비 변경 주문서 1,000만(eq_change) · 방패 같이 들 수 있음 · 도감 '연금술' 표시(프로듀서 결정). 테스트 legitem.js. 시뮬 `dev/sim/wpn_probe.js` + `dev/sim/builds/ref_knight58.json`(기준 캐릭터 Lv58).
  - 합칠 때(rerere 기록): legitem↔polygacha — strike()에 rcHitFx와 judgeHit 둘 다 · RARITY_C 전설색 #ffa630 · 특별상점 탭은 legitem 줄(변신 카드 탭 없음) · 가방/장비 칸은 legFx 쪽.
  - 렉 최적화(`work/perf`, v204): 코드로 그린 몹(PROCFX: 거미·개미·전갈·잠자리·폭탄꽃·불알·아스타지오·이프리트)은 번쩍임·광폭화 필터가 있으면 procLayer로 한 장에 그린 뒤 필터 한 번 · 고른 대상 테두리(drawTgtOutline)는 작은 캔버스 1/30초마다·정수 칸 · 채팅 줄 나누기 CHWRAP · tintFrame LRU · 반딧불 스프라이트. 측정 스크립트는 세션 scratchpad의 cmp.js·prof5.js 방식(CDP Profiler + 긴 프레임 표본). 새 코드 그림 몹을 만들 때 번쩍임을 g.filter로 하면 PROCFX에 넣을 것.
  - 캐릭터 복사(`work/charcopy`, v204 잠수): 본섭 운영자 [살펴보기 → 복사 코드] → 테스트 페이지 갓 모드 [캐릭터 복사]. charcopy_adm.js의 '받는 중' 확인은 응답이 빠르면 실패(타이밍) — 버그 아님.
- **승인 대기 (11/1 밤 기준)** — 테스트 판 = `work/stage-all` = main + `work/bothost`(= aibot 포함) + `work/dream`. 합칠 때 dream↔aibot 충돌 4곳은 rerere에 기록됨(killCheck의 FB_KILLER+spirit 드랍 · lunge의 elAdd · hurtHero의 'elem' 종류 · addDraw의 dreamShrineDraw · mkkt.py의 __T 목록 = 둘 다).
  - **aibot** `work/aibot` 244b0ed (카드 ready): 1단계 + 2단계 ①(전투를 사람처럼) + ②(파티·보스·뒷치기·보스 알림·지원군) + 이름 38개 고정(FBOT.TAB · 고구마·발라카스 예비) · 분배(반왕 100×4/90×4/80×5/70×5 · 라인 100×4/90×6/80×5/70×5) · 100% 봇만 전설 변신 · 법사 슬로우(wslow) · 요정 게일/똥물/어바 · `worldbot_chars/{uid}` 3분 저장 + 구간마다 cp 1등 사진. **프로듀서가 넣을 Firestore 규칙**: `match /worldbot_chars/{uid} { allow read: if request.auth != null; allow write: if request.auth != null && request.auth.uid == uid; }`. 상세 `dev/rooms/aibot.md` 맨 위 4개 섹션. 테스트 fieldbot·fieldbot2·fieldbot3·fieldbot4·fieldbot_copy.
  - **botserver** `work/bothost` bba0f92 (카드 ready · 잠수 · aibot 위): 게임 `?bothost=1&zone=N` 봇 호스트 모드(BOTHOST · 그림/바닥/소리 없음 · 워커 타이머 20Hz · 안 보임 · hostOf 우선 · presence 최소) + `server/bothost/`(run.js·install.sh·README·config.example.json · config.json은 gitignore) + 배경음 <audio> preload=none. 8탭 ≈ 700MB → t4g.medium 추천. 프로듀서가 할 일은 README·카드 next. 상세 `dev/rooms/bothost.md`.
  - **dream** `work/dream` 8d36028 (카드 test — 프로듀서 기획을 메인방 판단으로 만듦 · 승인 전 확인 요청): 지역 24 몽환의 섬 N94 단층 · 정령/대정령 8종 · 유니콘 2시간 · 퓨어엘릭서→엘릭서(5개 상한) · 제작 창 [엘릭서 교환] 탭. 상세 `dev/rooms/dream.md`. 봇 없음(nobot).
- 프로듀서 결정(11/1 밤): AWS 월 5만 원까지 OK(CLAUDE.md 고침) · 봇이 보스를 실제로 뺏음 · 봇 줍기는 자기 것만 · 1단계는 2단계와 같이 배포 · 자는 동안은 메인방이 판단해서 진행하고 나중에 보고.
- 원격 `work/polyrr`는 지우기가 막혀 남아 있음(안 씀). 끝난 갈래(leggold·perf·charcopy·leglv·elfpet·rrcost)는 main에 들어감.
- 휴대폰 알림: 작업 끝·승인 대기·팝업 질문 때 PushNotification.
- 결정 대기: 기사 리덕션 아머 레벨 비례(추천 20%+51렙부터 1%, 최대 35%) · 다음 사냥터 컨셉(nextzone) · 밤 전용 재료(달빛 조각 등) 아이디어.
- 시뮬: `dev/sim/fn_sim.js` (NIGHT=1 밤 고정 · NOMANA=1 마나 물약 없이 · DEF='{"spSoft":40}' · SUMB='{"dmg":0.75}') · 빌드 `dev/sim/builds/ref_wizard57.json`·`ref_knight57.json`(10/31 실제 두 캐릭터). 법사 시뮬은 판마다 편차가 커서 5번 이상 평균.
- 동시 작업: Agent + `isolation: worktree` + 서로 다른 `KT_PORT`. 테스트 동시 2개까지(OOM). `pgrep -f`에 포트를 넣지 말 것(자기 셸이 걸림) — 끝 표시 파일로 기다림.

## 메인방 도구·요령
- 묶음 테스트 판: 작업판에서 ready·test·queued 카드의 branch → `python3 dev/stage_test.py <갈래들>` → 테스트 아티팩트(https://claude.ai/artifact/MZNnyPab1VtMTqbtEyuay6) publish `file_path=dev/out/publish.html`, `root=<저장소>`, `files={}` → 테스트 db `tbuild/cur` = build.json의 {id, at, n} → 작업판 db `meta/test` = 같은 값 + branches. (다른 대화에서 처음 올릴 때는 먼저 Artifact read 한 번 — 페이지가 4.5MB라 읽기가 막히면 publish를 바로 해 보고, 거절되면 돌려준 판 위에 다시 올린다.)
- **테스트 아티팩트 파일은 511개 한도(지금 509개)**. 효과음 mp3는 `dev/build_test.py`가 페이지 안에 넣으므로 files에 넣지 않는다. 새 그림 파일이 많아지면 같은 방식으로 넣거나 안 쓰는 파일을 `null`로 뺀다.
- 작업판 원본: `dev/board/board.html` (10/30 메인방이 올린 v9: 메인방 버튼 주소를 db `meta/main`에서 읽음). 고칠 때: 작업판을 Artifact read 한 번 → 이 파일 고쳐서 같은 url로 publish.
- 배포 순서는 CLAUDE.md '배포 담당 방 규칙' 그대로 (rel/NNN 갈래에 queued 갈래 합치기 → GAME_VER +1 → 소식 목록 → 테스트 → `python3 dev/release.py` → `bash dev/keycheck.sh` → commit → main ff → push → 작업판 releases/vNNN·meta/live·카드 done+ver → dev/notes 비우기 → 남은 승인 대기로 테스트 판 다시).
- 시뮬: `BUILD=dev/sim/builds/ref_knight.json bash dev/runkt.sh "dev/sim/zone_scale_sim.js <지역> 600 HPxDMG[xSPD[xDENS]] <반복>"`.
- 몬스터 그림 확인: `dev/tests/fn_art_sfx.js` (화둥 몹 공격·사망·효과음 열림), `dev/tests/fn_look.js`.
- 자동 판정기가 막는 것(돌아가지 말 것): 반복 예약 작업, fire_trigger, delete_trigger, 운영자 키 업로드.
- 예전 메인방에 남은 한 번짜리 알림(send_later `trig_01Tc8yQBN8ZhUFwrByCxWq2t`, 10/30 19:36 KST)이 예전 방으로 울림 — 무시해도 됨.
