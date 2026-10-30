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

## 지금 상태 (10/30 18:40 KST)
- 마지막 배포 **v193** (화룡의 둥지 · 화룡 갑옷 3종 · 강화 BGM OFF). v191·v192·v193 모두 원래 컴퓨터 폴더에는 못 넣음(클라우드 방 · 컴퓨터 연결 없음).
- **승인 대기 6개** (테스트 판 = 다 합친 `work/stage-all`): polymon(`work/polygacha` 변신 카드 + 소드·아크) · aibot(혈맹·필드 봇) · tgtline(고른 대상 빨간 테두리 4px) · phxresp(피닉스 5~6시간) · aggro1(선공 +1칸) · fnminhit(몹 공격 회피 구간 — 사냥터별 기준 구간 20%, AC 10방마다 5%, 캐릭터 창 [몹 공격 회피]).
  - 배포 때 겹치는 곳(rerere에 기록됨): tgtline↔aibot(drawMobBody 첫 줄 — 테두리 분기 + `fb_` 조건 유지) · aggro1↔fnminhit(파일 끝 블록 — 지금 fnminhit은 끝 블록 없음) · polygacha↔main(이미 해결).
- 동시 작업: Agent + `isolation: worktree` + 서로 다른 `KT_PORT` (예약 작업으로 방 열기는 자동 권한 검사에서 막힘). 큰 일은 20~30분 조각으로. 끝나면 `git worktree remove --force`.
- 메모리 부족: 테스트를 3개 이상 동시에 돌리면 OOM으로 브라우저가 죽을 수 있음(dmesg). 2개까지만.
- 보류: 아시타지오·이프리트 공격 때 끊김(프로듀서: 더 확인되면 알려 줌 — 테스트 기기에선 재현 안 됨, 측정 스크립트는 지움).
- 다음 후보: 변신 카드 2단계(합성·도감 보너스) · 필드 봇 2단계 · 대인전 대상 빨간 테두리 · 용계 등 다른 사냥터 몹 마법 명중.

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
