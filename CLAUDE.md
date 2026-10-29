# 아덴 월드 — 모든 대화방 공통 규칙

리니지 클래식 느낌의 쿼터뷰 MMORPG. 프로듀서(저장소 주인)와 Claude가 여러 대화방에서 나눠 만든다.
이 저장소는 **공개**다. 비밀번호·키·개인 정보는 절대 넣지 않는다.

## 프로듀서와 일하는 방식
- 한국어로, 짧게, 결과 위주로 말한다. 영어로 답하지 않는다.
- 사소한 건 알아서 정하고, 방향이 갈리는 것만 짧은 팝업 질문(AskUserQuestion)으로 묻는다.
- 게임 업데이트는 바로 배포하지 않는다. 최종 업데이트 소식안을 대화창에 먼저 보여 주고 승인 팝업 → 승인하면 배포, 안 하면 보류. 승인 대기 중인 게 있으면 팝업으로 다시 알린다. **배포는 배포 담당 방에서만.**
- 일일 제한·초기화 기준은 새벽 5시.
- 몬스터·아이템은 리니지 DB 사이트(인벤 리마스터/클래식 DB, 린클인포 등)의 컨셉·분위기·밸런스를 참고하되 그림은 직접 만든 오리지널. 복사·트레이싱 금지. 리니지 클라이언트에서 뽑은 리소스는 게임에 쓰지 않는다.
- 이름이 부적절한 Lv55 기사 캐릭터는 '기준 캐릭터'라고만 부른다.
- 유튜브 등에서 음원을 뽑지 않는다. 프로듀서가 직접 준 파일만 쓰고, 공개 저장소라 출처·사용 허락 확인을 한 줄 안내한다.

## 보안
- 비밀번호·인증 정보는 입력하지 않는다 (계정은 프로듀서가 직접).
- 다운로드는 파일명·출처·크기를 알리고 허락받는다. 사용자 데이터는 지우지 말고 옮긴다.
- `admin_key.js`(운영자 개인키)는 절대 커밋·공유·출력하지 않는다. 커밋·배포 전 `bash dev/keycheck.sh` (모두 0이어야 함).
- 유료 리소스는 확인 후. AWS는 무료 범위만(서울).

## 파일 구조
- `index.html` 화면·CSS · `src/game.js` 게임 전체(한 파일, 약 1.7MB) · `src/map_data.js` · `assets/` 그림·소리
- `main.js` `preload.js` `update.json` PC 실행 파일 · `manifest.webmanifest` `sw.js` 모바일 웹 · `version.json` PC 업데이트 목록(`dev/release.py`가 만듦)
- PC 클라이언트: 로그인 화면 [업데이트]가 main의 version.json을 보고 바뀐 파일만 받는다. 모바일 웹: GitHub Pages(main 루트).
- 저장: 구글 파이어베이스 Firestore `users/{uid}/chars/{직업}` — 그 계정 로그인으로만 열림. 실시간: 서울 AWS 중계 서버(`wss://3-39-241-77.sslip.io/mqtt`) — 저장은 안 함.
- 작업판(진행 상황): https://claude.ai/artifact/XemyTMkY4DDuWZsAUJ3pQX

## 작업판 운영 (모든 방 공통)
- 작업판: https://claude.ai/artifact/XemyTMkY4DDuWZsAUJ3pQX · 데이터는 ArtifactData로 `tasks/<id>` 문서.
- 프로듀서가 새로 말한 일은 내용을 보고 직접 분류해서 카드로 만든다(묻지 않음). `cat`:
  - `new` 신규 컨텐츠 — 새로 만드는 창작(새 지역·이벤트·몬스터·아이템·시스템·연출)
  - `balance` 밸런스 — 수치·확률·전투·보상·성장 조정
  - `fix` 기타 수정 — 기존 것의 수정·버그·편의·UI·작은 변경
  - `bot` AI 봇 — 수호탑 봇·필드 상주 봇
- `status`(누구 차례): `doing` Claude 작업 중(`phase`에 단계: 제작 중·테스트 중·시뮬 중 등) · `wait` 내 차례·답변 필요 · `test` 내 차례·테스트 확인 · `ready` 내 차례·배포 승인 · `queued` 다음 배포에 포함(결정 끝, 배포 담당 방이 묶을 때 넣음 — 잠수패치 포함) · `hold` 보류 · `done` 끝남. 상태가 바뀌는 순간 바로 고친다. 작업판에서 프로듀서는 상태를 고르지 않고 보기만 한다 — 상태는 그 작업 방이 실제 진행에 맞게 적는다.
- 카드 필드: `title`, `cat`, `status`, `phase`, `next`(다음 할 일 — 내 차례면 프로듀서가 할 일), `note`, `room`, `room_url`(그 작업 대화방 주소), `branch`, `test`(테스트 페이지), `updated`(ISO). 프로듀서가 카드에 남긴 메모는 `pnote` — 방은 작업을 시작할 때와 보고하기 전에 꼭 읽는다.
- 작업방은 시작하자마자 자기 카드의 `room_url`에 이 대화방 주소(커밋 끝 `Claude-Session:` 줄의 주소)를 적는다.
- 메모장으로 전달된 아이디어(`ideas` 문서, status `new`)는 배포 담당 방이 분류해서 카드로 옮기고 그 아이디어의 status를 `taken`으로 바꾼다.
- 작업량이 크거나 오래 걸리는 새 작업은 배포 담당 방이 새 대화방을 만든다: `create_trigger`(run_once_at = 1~2분 뒤, 한 번만)로 첫 메시지에 "저장소 연결 → CLAUDE.md·dev/rooms/<이름>.md 읽기 → work/<이름> 갈래 → 작업판 카드 room_url 등록 후 진행"을 넣는다. 필요하면 먼저 `dev/rooms/<이름>.md`를 써서 main에 올린다.

## 대화방 역할
- **배포 담당 방**: 작업방 결과 합치기, GAME_VER·업데이트 소식, 승인, 배포, 메인 테스트 페이지, 원래 컴퓨터 게임 폴더 반영, 서버 관리.
- **작업방**(할로윈 / 서먼·보스 밸런스 / AI 봇 / 버그·작은 수정 …): 자기 갈래(브랜치)에서만 작업. 방마다 `dev/rooms/<이름>.md`에 할 일과 맥락이 있다.

## 작업방 규칙
1. 시작: 저장소 연결 → `git fetch` → `git checkout -B work/<이름> origin/work/<이름>` (없으면 `origin/main`에서 새로 만들고 push).
2. main에 직접 push하지 않는다. 자기 갈래에만 commit·push.
3. `GAME_VER`와 게임 안 업데이트 소식 목록은 건드리지 않는다. 소식안은 `dev/notes/<이름>.md`에 적는다.
4. 수정은 `dev/rep.py`의 `apply(path, [(old, new)])`(정확히 한 번 일치해야 바꿈)로 하고, 매번 `node --check src/game.js`.
5. 테스트: `python3 dev/mkkt.py` → `bash dev/runkt.sh <테스트.js>` (로그인은 `dev/tq.js`, 예시 `dev/tests/`). 스크린샷은 `dev/out/`. 빠른 시뮬은 `python3 dev/mksim.py` 뒤 `_sim2.html`.
6. 테스트 페이지는 **메인 테스트 페이지 하나만** 쓴다 (프로듀서 계정·캐릭터가 그 페이지에만 저장돼 있음). 작업방은 따로 아티팩트를 만들지 않고, 갈래를 push한 뒤 작업판 카드 `next`에 "메인 테스트 페이지에 올려 주세요"를 적고 프로듀서에게 배포 담당 방에 넘겨 달라고 한다.
7. 끝나면: `origin/main`을 자기 갈래에 merge해서 충돌 정리·재테스트 → push → 작업판 카드를 '다음 배포 묶음'(status `ready`)으로 바꾸고 소식안 파일을 note에 적기 → 프로듀서에게 "배포 담당 방에 넘겨 주세요" 한 줄.
8. 작업판은 진행할 때마다 갱신: ArtifactData로 `tasks/<id>` 문서 update (`status` doing·wait·test·ready·hold·done, `next`, `note`, `room`, `branch`, `test`(https 주소), `updated`(ISO 시각)). 새 작업이면 새 문서.

## 배포 담당 방 규칙
- 묶음 배포: 작업판 '다음 배포 묶음'을 모아 하루 1~2번. 급한 버그는 바로.
- 순서: `git fetch` → main에 `work/*` merge(충돌 정리) → `GAME_VER` +1, 소식 목록에 `dev/notes/*` 반영(첫 줄이 `# 잠수패치`인 파일은 소식에 안 넣고 조용히 같이 배포) → 테스트 → `python3 dev/build_test.py` → 메인 테스트 페이지 publish → 소식안 채팅 + 승인 팝업 → 승인 시 `python3 dev/release.py` → `bash dev/keycheck.sh` → commit(끝에 Co-Authored-By 줄) → `git push origin main` → `git ls-remote origin HEAD` 확인 → 원래 컴퓨터 `C:\Users\hjk97\Downloads\AdenWorld\aden-survivors_1\game\`에 `src/game.js`·`index.html`(+새 에셋) 넣기(device_commit_files, force). 컴퓨터가 연결 안 돼 있으면 프로듀서에게 알린다 → 작업판 카드 '배포됨', `releases/v<번호>`·`meta/live` 기록 → 반영한 `dev/notes` 파일 비우기.

## 테스트 아티팩트
- 메인: https://claude.ai/artifact/MZNnyPab1VtMTqbtEyuay6 (배포 담당 방). 올리기: `file_path=dev/out/publish.html`, `root=<저장소>`, `files={}` (새 에셋이 있으면 그 경로만 files에).
- 배포 담당 방은 작업방이 테스트를 부탁하면 대기 중인 배포 후보(release/*)와 그 갈래를 임시로 합친 판을 메인 테스트 페이지에 올린다 (main·갈래에는 push하지 않음). 프로듀서 계정은 메인 테스트 페이지에만 있다.
- (예전 방식 · 쓰지 않음) 작업방 전용 새로 만들기: `python3 dev/build_test.py` → 새 아티팩트 publish(`file_path=dev/out/publish.html`, `root=<저장소>`, `files=`첫 묶음 `python3 dev/asset_map.py 1` 출력) → 같은 url로 `files=`두 번째 묶음(`... 2`) → 그 뒤로는 `files={}`로 갱신.

## 코드·테스트 팁
- 테스트 중 Math.random을 바꾸면 게임 루프가 먹는다 → 클릭 직후 바로 되돌린다.
- `INV.load`로 장비를 넣을 때 `on`은 부위 이름('weapon', 'helm' …).
- 자동 물약은 `INV.auto('hp').ps` (빨·주·맑 3칸, on·pct).
- 죽으면 필드에 DEATH 상태로 남는다 → `#death-town` 클릭.
- 미로 던전(9·10번 지역)은 벽 때문에 보스 시뮬은 8번 지역에서 한다 (13번 소환의 제단은 자동사냥이 안 됨).
- 테스트 서버는 8766번 하나 — 다른 폴더를 연 서버가 남아 있으면 엉뚱한 코드로 테스트됨 (dev/runkt.sh가 시작할 때 끔).
- 커밋 메시지 끝:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  ```
