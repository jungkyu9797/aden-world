# 24시간 봇 서버 (갈래 work/bothost · 작업판 tasks/botserver) — 11/1 프로듀서 결정

## 프로듀서 원문
"일단 서버로 운영되게 하자, 월5만원정도까지 라도 좀 안정적으로 돌아갈수 있게끔 하고싶어 최대한 트래픽 관련 문제로 렉이걸리나 최적화 되지 않게끔하고 봇도24시간 돌아가고, 그리고 짧은 주기로 실 유저 캐릭터의 모든 정보(봇이복제하는)를 서버에 저장을하고 봇은 그 정보를 2시간 마다 따서 봇 능력치가 부여되게끔"
(캐릭터 정보 저장 `worldbot_chars` + 2시간 사진 작성자 `bh` 우선은 work/aibot 244b0ed에 이미 들어감 — 이 작업은 그 위에서 '서버 쪽'을 만든다.)

## 현재 구조 (바꾸지 않는 전제)
- 게임 로직은 전부 브라우저(src/game.js 한 파일). 실시간은 서울 AWS 중계 서버(`wss://3-39-241-77.sslip.io/mqtt` · MQTT · 저장 안 함). 저장은 Firestore. 지역마다 '지역 호스트'(그 지역 접속자 중 peer 이름이 가장 작은 사람 · `NET.hostOf` ~7898 / `isHost` 7899) 한 명이 몬스터·필드 봇(`FBOT.tick`)을 계산해 presence로 뿌림. 운영자 모드(`ADMIN.on()`)는 호스트가 안 됨.
- 필드 봇은 2구역 8곳(2·4·6·8·10·12·17·23)에만 나옴. 아무도 없는 지역은 계산이 안 돼 봇이 멈춤 → 24시간 서버 = **그 8곳에 항상 들어가 있는 '봇 호스트' 접속자**를 서버에서 돌리는 것.

## 측정 (메인방 · 이 샌드박스 · 헤드리스 크로뮴)
- 일반 페이지(테스트 빌드 · 640×400)는 **탭 하나에 약 1.1~1.8GB RSS**(그림 90MB 디코딩 + 바닥 캔버스 등) → 탭 8개면 10GB. 그대로는 못 씀.
- 목표: **봇 호스트 모드 탭 하나 ≤ 250MB** → 8탭 ≈ 2GB → 메모리 4GB 인스턴스(t4g.medium ≈ 월 4만 원대 · t3.medium ≈ 5만 원대 — 정확한 값은 AWS 요금표). 측정 스크립트는 scratchpad `memtest.js`(/proc RSS 합산) 참고.

## 만들 것
### 1. 게임 '봇 호스트 모드' (src/game.js · index.html 최소 수정)
- 켜는 법: URL `?bothost=1` (+ `localStorage aden_bothost=1`로도). 켜지면:
  - **그림 안 불러옴**: 모든 Image 로딩(`im[...]`, MIMG, PMSHEET/PMGLOW, 아이콘, 타일 등)을 건너뛰거나 1×1 스텁으로 — 몹 `art:'sheet'`는 이미 그림이 없으면 `art0`으로 폴백하는 구조. `decode()`·`naturalWidth` 검사가 있는 곳이 깨지지 않게.
  - **바닥·언덕 캔버스 안 만듦**(타일 캔버스, 언덕 굽기 `step()`, 미니맵 캔버스 등) — 걷기 가능 여부(walkable)·길찾기 배열은 그대로.
  - **화면 안 그림**: `SAVER`(절전) 경로처럼 drawWorld/drawUI 건너뜀 · 캔버스 1×1 · DPR 1 · 오디오 없음 · 서비스워커 없음.
  - **루프**: 헤드리스에서 rAF가 느려지거나 멈추는 탭이 있을 수 있으니 `setInterval` 50ms로 `frame()`을 돌리고 dt를 실제 경과로(0.05 상한 유지 · 밀리면 2~3번 연속 호출). 봇 계산·몬스터·NET.tick이 정상 속도로 도는지 확인.
  - **보이지 않음**: 운영자 모드처럼 다른 유저·몬스터·봇에게 안 보이고 공격 못 받음 · 접속자 창(whois)·전투력 후보·`worldbot_chars` 저장·지원군 머릿수·`playerOn`(보스 뒷치기)·'플레이어 5칸 안 몹 금지' 같은 **FBOT의 모든 '플레이어' 판정에서 제외**(aibot 244b0ed의 presence `bh:1` 플래그와 `NET.extraOf`를 그대로 씀 — 이미 cp 후보·저장 제외는 되어 있음 · 나머지 판정을 점검).
  - **호스트 우선**: `hostOf`가 `bh` 피어를 먼저 고름(여럿이면 이름순). 봇 호스트가 들어오면 기존 호스트가 넘겨주고(몬스터 목록 인수인계는 기존 호스트 교체 로직 그대로), 나가면 다시 일반 규칙. 봇 호스트는 자기 지역에서 안 움직이고 죽지 않음(GOD_INV) · 귀환·텔레포트 금지.
  - **자동 입장**: `?bothost=1&zone=23` 이면 로그인(자동 로그인 `aden_auto`가 있으면 그것) 뒤 캐릭터 선택 → 그 지역으로 바로 들어감. 캐릭터는 봇 호스트 계정에 미리 만들어 둔 것(직업 아무거나 · 레벨 1) · 저장은 안 함(SAVE 비활성 — 그 계정의 Firestore 문서를 매번 덮어쓰지 않게).
  - **상태 노출**: `window.__BH = { ok, zone, host(내가 호스트인지), bots(지금 봇 수), mobs, fps(루프 Hz), mem?, since, ver }` + 1분마다 console.log 한 줄(러너가 읽음).
  - **트래픽**: 봇 호스트 presence는 꼭 필요한 칸만(장비·변신·인형 등 사람 표시용 칸 비움) · 몬스터 목록/`fbx`는 그대로(게스트가 봐야 하므로). presence 크기 전후 측정해서 보고. 중계 서버 부담(초당 메시지 수)도 탭 8개 기준 추정.
### 2. 러너 `server/bothost/` (Node + Playwright · 리포지토리에 포함)
- `run.js`: `config.json`(**gitignore** · `config.example.json`만 커밋 · 내용: 게임 주소(GitHub Pages 주소 · 기본값 넣기), 계정·비밀번호(프로듀서가 서버에서만 적음), zones [2,4,6,8,10,12,17,23], 헬스체크 간격) 읽고 크로뮴 1개 + 지역마다 페이지 1개. 로그인 화면에 계정/비번을 Playwright로 입력(게임 코드에 자격 증명 없음) → `?bothost=1&zone=N`. 
  - 헬스체크 30초: `__BH.ok`·`host`·루프 Hz·마지막 갱신 시각 — 60초 넘게 이상하면 그 페이지만 새로 고침, 5번 연속이면 브라우저 재시작.
  - 5분마다 `version.json`(GAME_VER) 확인 → 바뀌면 페이지 전부 순서대로 새로 고침(배포 자동 반영).
  - 로그: 시각·지역·봇 수·호스트 여부·RSS(MB) 한 줄씩 (journald/stdout).
  - 메모리 상한: RSS 합이 설정값(기본 3GB) 넘으면 브라우저 재시작.
- `install.sh`(Ubuntu 22.04/24.04 · arm64·x86 둘 다): node 20 LTS, `npm ci`, `npx playwright install --with-deps chromium`, systemd 유닛 `aden-bothost.service`(Restart=always · 메모리 상한 MemoryMax) 설치 · 시작.
- `README.md`(한국어 · 프로듀서용 단계별): ① 게임에서 봇 호스트용 계정 하나 만들고(일반 로그인 화면에서 · 이름 'bothost' 추천 · 직업 아무거나) 캐릭터 생성 ② AWS: 서울 리전 인스턴스 추천(4GB: t4g.medium(ARM·가장 쌈) 또는 t3.medium · 기존 중계 서버 인스턴스가 1GB(t2/t3.micro)면 같이 못 돌림 → 새 인스턴스 또는 크기 변경 · 인바운드 포트 필요 없음 · 월 예상 비용은 AWS 요금표 링크로 확인하라고) ③ SSH → `git clone` → `bash server/bothost/install.sh` → `config.json` 작성 → `systemctl status aden-bothost` · 로그 보는 법 ④ Firestore 규칙(worldbot_chars — aibot 카드에 있음) ⑤ 문제 생겼을 때(재시작·로그·메모리) ⑥ 비용 줄이는 법(지역 수 줄이기). 비밀번호·키는 절대 저장소에 넣지 않는다는 줄.
### 3. 테스트·측정
- `dev/tests/bothost.js`: 봇 호스트 모드 탭 + 일반 유저 탭(두 탭 · fieldbot 두 탭 방식) → 봇 호스트가 호스트가 됨 · 유저 탭에서 봇이 보이고 봇 호스트는 안 보임(이름표·접속자·whois·전투력 후보 없음) · 봇 호스트 탭 그림 없음·캔버스 1×1·루프 20Hz 이상 · 유저가 나가도 봇 계속 돎 · 봇 호스트 presence 작음 · `__BH` 값.
- 메모리: 봇 호스트 모드 탭 1·4·8개 RSS(위 memtest 방식)를 전/후로 재서 보고 (목표 ≤250MB/탭 · 못 맞추면 어디가 큰지와 다음 수를 적기).
- 러너는 이 샌드박스에서 로컬 테스트 서버(dev/runkt.sh의 http 서버 · `_kt2.html`)를 대상으로 smoke(페이지 8개 열고 헬스체크 2회 통과)까지.

---
# 인수인계 (11/1 보조 작업자 · 갈래 work/bothost · origin/work/aibot 244b0ed 위에서)

## 만든 것
- **게임 봇 호스트 모드** `src/game.js`
  - `const BOTHOST`(파일 맨 위 · `im` 그림 로더 앞): `?bothost=1&zone=N` 또는 localStorage `aden_bothost=1`·`aden_bothost_zone`. 켜지면 **`window.Image`를 빈 껍데기로 바꿈**(complete=false · naturalWidth=0 · decode() 실패) → 게임의 모든 그림 로딩(`im`·MIMG·PMSHEET·아이콘·펫·타운)이 '아직 없음'으로 떨어지고, 바닥 캔버스(`buildGround`는 `im.ground.complete` 뒤에서만)·언덕 굽기·미니맵도 안 만들어짐. `<audio preload>`도 src를 떼서 취소. `window.__BH` = 상태 객체(`ok·zone·zoneNow·host·bots·mobs·fps·peers·net·mem·since·ver·err·errN·phase·tick·timer`) · 1분마다 `console.log('[BH] {…}')`.
  - `BOTHOST.loop(frame)`: rAF 대신 **워커 타이머 50ms**(가려진 탭에서도 안 느려짐 · 워커가 안 되면 setInterval)로 `frame()` · 밀리면 50ms 단위로 최대 3번 연속 · frame 안 예외는 잡아서 `errN` · `BOTHOST.frameDone(dt)`가 fps·상태 갱신 + 매초 `BUFF.invis`·`GOD_INV`·HP 재확인.
  - 그리기 끔: `resize()` 캔버스 1×1·DPR 1 · `frame()`의 drawWorld/drawUI 건너뜀 · `initAudio`/`unlockAudio` 무시 · 서비스워커 등록 안 함 · 마을 바닥(`TOWN.enter`) 안 만듦 · `ISLAND.prebake` 안 함 · 서버 기록(GLOG) `pull` 안 함(읽기 절약 · 올리기는 함).
  - 로그인 뒤: `ACCOUNT.openSel`이 **캐릭터를 자동으로 골라 start()** (없으면 `__BH.phase='fail' err='nochar'`) → `begin()`에서 `SAVE.start`·접속 표시(sess)·오프라인 정산·업데이트 안내 없이 `BOTHOST.start()`: `NET.setExtra('bh', 1)` · `GOD_INV` · `BUFF.invis=1e9` · `TOWN.toZone(zone)` · 포털 옆 빈 칸으로 비켜섬 · `TOWN.goTown` 막힘(`BOTHOST.started()`) · 포털 밟기 무시.
  - **보이지 않음(받는 쪽)** `NET`: `admFilter()`가 presence `bh`인 접속자를 운영자처럼 `OTH`에서 빼 `BHS`에 둠 → 그리기·접속자 목록·whois·`count()`·파티·PvP·거래·`SESS.scan`·FBOT `teams()/playersPos()` 모두 자동 제외. 호스트가 주는 것만 따로 받음: `for (const o of BHS) { applyRewards; rpMerge; mergeKills; applyAn }`(전리품 분배·사신·보스 기록·전체 알림) · `hostData()`가 BHS에서도 찾음 · `FBOT.guestFx`가 `NET.bhs()`도 봄 · `NET.bhs()` 새 API · `FBOT.bhOn()`은 `NET.bhs().length`.
  - **호스트 우선** `hostOf(z)`: 봇 호스트(나 자신이 bh거나 BHS 중 그 지역)가 있으면 그것(여럿이면 peer 이름순) · 없으면 예전 규칙(bh인 나는 예전 규칙에서 빠짐). 인수인계는 기존 호스트 교체 로직 그대로.
  - **FBOT 판정 제외**: `heroOk()`·`playersPos()`에 `!BOTHOST.on()` (지원군 머릿수·`playerOn`·'플레이어 5칸 안 몹 금지'·보스 뒷치기 모두 여기서 나옴) · `mobsOut/groundOut`의 기준 위치에서 봇 호스트 자리 뺌 · `amWriter`는 `meBh() && bhLead()` — 봇 호스트 탭이 여럿이면 **지역 열쇠가 가장 작은 탭(isle10)만 사진 작성자**(worldbot_chars 200개 읽기를 8번 안 하게).
  - **presence 최소화** `BH_KEEP` = `n c lv z x y r hp hm bh m mz bt tk ao d gi go rw gv rp bk an fbx`(장비·변신·인형·버프·채팅·세션 ah/sd/st 없음) · 보는 사람이 없으면 **0.5초마다**(있으면 0.1초) · 크기: 보는 사람 없음 **221~353B**(bk 포함) · 유저 1명이 보는 중 몬스터 10개 포함 **~600B**(일반 호스트 1.8~2.2KB).
- **러너** `server/bothost/`: `run.js`(config.json · 크로뮴 1개 + 지역마다 페이지 1개 · 로그인 폼 입력 · 30초 헬스체크(`__BH.ok·host·fps≥10·tick 15초 안·phase run`) · 60초 이상이면 그 페이지만 다시(`badSec`) · 5번 연속이면 브라우저 재시작(`badMax`) · 5분마다 version.json → 오르면 새 컨텍스트(캐시 없음)로 전부 다시 · RSS 합 `memCapMB` 넘으면 재시작 · `shareProcess`(기본 켬 · `--process-per-site --renderer-process-limit=1`) · 그림·소리·글꼴 요청은 route로 차단(이중) · `killStray` · SIGTERM 정리) · `install.sh`(node 20 · npm install · playwright chromium --with-deps · systemd `aden-bothost` MemoryMax 3500M Restart=always) · `config.example.json` · `package.json`(playwright 1.63.0 · 샌드박스에 npm 레지스트리가 안 닿아 package-lock 없음 → install.sh가 `npm install`) · `README.md`(프로듀서용 단계별). `.gitignore`에 `server/bothost/config.json`.
- **테스트** `dev/tests/bothost.js`(두 탭 · 19개 모두 OK) · `dev/tests/bothost_run.js`(러너 smoke: 로컬 서버에 8페이지 · 헬스체크 2회 · version.json 올려 재시작 · SIGTERM · 모두 OK) · 기존 `fieldbot.js`(18)·`fieldbot2.js`(37)·`fieldbot3.js`(33)·`fieldbot4.js`(32)·`fieldbot_copy.js`(25) 그대로 통과. `dev/mkkt.py`의 `__T`에 `BOTHOST` 추가.

## 측정 (이 샌드박스 · 헤드리스 셸 · 2 vCPU)
- 일반 테스트 탭(640×400): 1개 **1,962MB**(브라우저 185 포함) · 2개 3,110MB → 탭당 1.1~1.8GB.
- 봇 호스트 탭(프로세스 따로): 1개 291MB(브라우저 195 제외) · 4개 207MB/탭 · 8개 **1,676MB 합(185MB/탭)** · 60초 뒤 1,584MB.
- 봇 호스트 탭(**렌더러 프로세스 공유** = run.js 기본): 1개 295MB · 4개 574MB 합 · 8개 **702~734MB 합(68MB/탭)** · JS 힙은 탭마다 12~21MB. 크로뮴 CPU 합 ≈ 1코어의 25~30%(봇 8명 사냥 중 · 유저 없음).
- 루프 20Hz 정확(워커 타이머) · 봇 계산 정상(봇 8명 · 몬스터 40~86).
- 중계 서버 부담 추정: 봇 호스트 8탭 유휴 = 초당 16개(약 300B) 올림 · 접속자마다 전부 받으므로 유저 2명이면 초당 (16+20)×9 ≈ 324개·~300KB/s. 유저가 봇 지역에 있으면 그 탭만 초당 10개·~1.5KB.
- **추천 인스턴스**: t4g.medium(4GB · ARM) — 측정상 t4g.small(2GB)도 되지만 재시작·몹 많은 때 여유용. 기존 중계 서버 t4g.micro(1GB)는 안 됨.

## 프로듀서가 할 일 (README 그대로)
① 게임에서 봇 전용 계정(`bothost`) + 캐릭터 1개 ② AWS 서울 t4g.medium Ubuntu 24.04 · 인바운드 SSH만 ③ `git clone` → `bash server/bothost/install.sh` → `config.json`에 계정·비번 → `systemctl start aden-bothost` → `journalctl -u aden-bothost -f` ④ Firestore 규칙 `worldbot`·`worldbot_chars` ⑤ 이상하면 README ⑤ 표.

## 위험·남은 것
- Firestore 규칙이 없으면(403) 봇 호스트는 사진을 못 만들고, 아무 유저도 없을 때는 봇 기준이 **봇 호스트 캐릭터(Lv1)** 가 되어 2·4·6…번에 봇이 거의 안 나옴 → 규칙 꼭 넣기. 유저가 접속하면 그 유저 기준(실시간)으로 바로 돌아감.
- 같은 계정 봇 호스트 탭 8개가 Firestore에 하는 일: `worldbot` 읽기(구간마다 1번 · 없으면 1분마다) · 사진 작성(isle10 탭만 · 2시간마다 `worldbot_chars` 최대 200 읽기) · GLOG 공지 올리기(보스 등장·토벌 — 중복 키라 1문서). 서버 기록 받기(`pull`)는 끔. **일반 유저 클라이언트의 GLOG `pull`(5분마다 최대 200문서 읽기)은 봇 서버와 무관하게 무료 한도(5만 읽기/일)를 누를 수 있음** — 별도 작업 권장.
- 봇 호스트가 새로 고침(배포 반영·재시작)되는 1~2분 동안 그 지역은 유저가 있으면 유저가 호스트, 없으면 봇이 멈춤(일과표 기준이라 돌아오면 같은 자리).
- presence `bh:1`은 서명이 없음(아무 클라이언트나 흉내 낼 수 있음) — 흉내 내면 '보이지 않는 호스트'가 될 수는 있지만 호스트는 원래 누구나 될 수 있고, OTH에서 빠지므로 남을 때리거나 받을 수는 없음. 운영자처럼 서명을 붙이려면 ADMIN 키 구조 재사용 가능(안 함).
- 헤드리스 크로뮴이 GitHub Pages·Firebase·MQTT(wss)에 붙어야 함 — AWS 아웃바운드는 기본 열려 있음.
- `package-lock.json` 없음(샌드박스에서 레지스트리 접근 불가) → 서버에서 `npm install`이 playwright 1.63.0을 받음. playwright 버전을 올릴 때는 `npx playwright install chromium`을 다시.
- 러너는 리눅스 `/proc`로 메모리를 재므로 리눅스 전용(맥·윈도에서는 -1 · 재시작 기준 꺼짐).
