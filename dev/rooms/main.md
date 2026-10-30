지금 메인방: https://claude.ai/code/session_01PSbXoDoYAy5czXPAwG2P4a (10/30 교대)

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

## 지금 상태 (10/30 10시)
- 마지막 배포 **v190** (main 3f67033, 10/29). main 맨 위는 653900e(테스트 판 도구만 바뀜).
- **승인 대기**: `firenest` 화룡의 둥지 (`work/firenest`, 작업방 https://claude.ai/code/session_01PSbXoBvKAHzsPfe3GYuL7F 가 아직 일하는 중 — 벌이·시뮬 손봄). 메인방이 10/30에 같은 갈래에 그림 다듬기·드래곤플라이·폭탄꽃·전용 효과음·파이어 에그 이름을 넣었음(e47c585 → 1f7d2d0). 테스트 판 bc66b8a8b0cf(`meta/test`) = main + work/firenest. 프로듀서: "테스트해 보고 작업판에서 승인".
  - work/firenest는 아직 v190 이전 main에서 갈라져 있음(GAME_VER 189) → 배포 때 main과 합칠 때 충돌 정리.
  - 작업방이 push를 계속하니, 말 걸 때마다 `git ls-remote origin refs/heads/work/firenest`가 `meta/test` 판과 다르면 묶음 판을 다시 올린다.
- **내 답변 필요**: `aibot` (① 수호탑 봇 다듬기 ② 필드 봇 1단계(추천, 8번 지역) ③ PvP 규칙) · `polymon` 몬스터 변신 20종 — 그림이 따로 있는 35종을 레벨별로 보여 줬음(고블린 Lv1 … 와이번 Lv53, 보스 ★ 셸로브·여왕개미·오우거·바포메트·카스파) + 색만 바꾼 변종 20여 종. 프로듀서가 20종을 고르면 `create_trigger`로 작업방(`work/polymon`, `dev/rooms/polymon.md` 먼저 작성)을 연다. 지금 변신은 `POLY`(데스나이트 = 몬스터 그림 사용 예, 다크·실버 6종 = PMSHEET)로 되어 있어 같은 방식으로 붙이면 됨.
- 메모함(`ideas` status new)은 비어 있음.

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
