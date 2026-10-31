# 아덴 월드 24시간 봇 서버 (봇 호스트)

필드 봇(반왕·라인 혈맹)은 그 지역에 들어와 있는 **지역 호스트** PC가 계산합니다. 아무도 없는 지역은 계산이 멈추죠.
이 서버는 **2구역 8곳(2·4·6·8·10·12·17·23번)에 항상 들어가 있는 보이지 않는 접속자 8명**을 작은 리눅스 서버에서 돌려서, 사람이 없어도 봇이 24시간 사냥·전투·보스 사냥을 하게 합니다.

- 게임 코드의 **봇 호스트 모드**(`?bothost=1&zone=N`): 그림·소리·화면 그리기 없이 게임 논리만 돌아가는 접속자. 다른 유저에게 안 보이고 공격도 못 받고, 접속자 목록·전투력 후보·지원군 머릿수에도 안 셉니다. 그 지역에 들어오면 호스트를 넘겨받고, 저장은 하지 않습니다.
- `run.js`: 헤드리스 크로뮴 1개에 지역마다 탭 1개를 열고 로그인 → 상태 확인(30초) → 게임 새 버전이 나오면 자동 새로 고침(5분) → 메모리가 넘치면 재시작.
- 측정(샌드박스 헤드리스): 일반 게임 탭은 1개에 1.1~1.8GB, 봇 호스트 탭은 8개 합쳐서 **약 0.75GB**(렌더러 프로세스 공유 켠 기본값 · 끄면 약 1.6GB). CPU는 8지역 기준 1코어의 약 25~30%.

> **비밀번호·키는 저장소에 절대 넣지 않습니다.** 계정·비밀번호는 서버 안의 `config.json`에만 적고, 이 파일은 `.gitignore`에 있어 git에 올라가지 않아요. (`config.example.json`만 올라감)

---

## ① 봇 호스트용 계정 만들기 (게임에서)

1. 평소 쓰는 게임(PC 실행 파일이나 휴대폰 웹 https://jungkyu9797.github.io/aden-world/)에서 **로그아웃**한 뒤 로그인 화면의 **[처음이신가요? 새 계정 만들기]**로 새 계정을 하나 만듭니다.
   - 계정 이름 추천: `bothost` (영문·숫자 4~16자) · 비밀번호 4자 이상.
2. 캐릭터를 **하나** 만듭니다. 직업·이름은 아무거나 (레벨 1이어도 됩니다 — 이 캐릭터는 화면에 안 나오고 봇 계산만 해요).
3. 마을에 들어가지는 것까지 확인하고 **로그아웃**합니다.
4. 이 계정은 **봇 서버 전용**으로만 쓰세요. 같은 계정으로 다른 곳에서 플레이하면 서버 쪽 접속이 끊길 수 있어요.

## ② AWS 서버 준비 (서울 리전)

| 항목 | 추천 |
|---|---|
| 리전 | 아시아 태평양(서울) `ap-northeast-2` |
| 인스턴스 | **t4g.medium** (ARM · 2 vCPU · 4GB · 가장 쌈) 또는 **t3.medium** (x86 · 2 vCPU · 4GB) |
| 더 싸게 | `t4g.small`(2GB)도 측정상 돌아가요(8탭 0.75GB). 다만 여유가 적어 업데이트 재시작·몹이 많을 때를 생각하면 4GB가 안전합니다. |
| OS | Ubuntu Server 24.04 LTS (22.04도 됨) · arm64(t4g) / x86_64(t3) |
| 저장 공간 | 16GB gp3 |
| 보안 그룹 | **인바운드 포트는 SSH(22)만, 내 IP에서만.** 게임 포트는 열 필요 없음(서버가 밖으로만 접속). |
| 기존 중계 서버 | 지금 중계 서버 인스턴스(`t4g.micro` 1GB)는 메모리가 모자라 같이 못 돌립니다 → **새 인스턴스**를 만드세요 (또는 중계 서버 인스턴스를 t4g.medium으로 크기 변경 — 중계 서버 재시작 필요). |
| 월 요금 | 바뀌니 요금표로 확인: https://aws.amazon.com/ko/ec2/pricing/on-demand/ (대략 t4g.medium 시간당 $0.04 전후 → 한 달 $30 안팎 + 저장 공간 $1~2 · t4g.small은 그 절반) |

키 페어(.pem)는 내 컴퓨터에만 보관하세요.

## ③ 설치

SSH로 들어간 뒤 (Ubuntu 기본 사용자 `ubuntu`):

```bash
sudo apt-get update && sudo apt-get install -y git
git clone https://github.com/jungkyu9797/aden-world.git
cd aden-world
bash server/bothost/install.sh          # node 20 · playwright · 크로뮴 · systemd 서비스 등록 (5~10분)
nano server/bothost/config.json         # account · password 두 줄만 고치고 저장 (Ctrl+O, Enter, Ctrl+X)
sudo systemctl start aden-bothost       # 시작 (부팅할 때마다 자동으로 켜짐)
sudo systemctl status aden-bothost      # 켜졌는지
sudo journalctl -u aden-bothost -f      # 로그 보기 (Ctrl+C 로 나옴)
```

`config.json` 예:

```json
{
  "url": "https://jungkyu9797.github.io/aden-world/",
  "account": "bothost",
  "password": "비밀번호",
  "zones": [2, 4, 6, 8, 10, 12, 17, 23],
  "healthSec": 30,
  "versionSec": 300,
  "memCapMB": 3000,
  "shareProcess": true
}
```

- `url` 게임 주소(GitHub Pages) · `zones` 봇 호스트를 둘 지역 번호 · `healthSec` 상태 확인 간격(초) · `versionSec` 새 버전 확인 간격(초) · `memCapMB` 크로뮴 메모리 합이 이것을 넘으면 재시작 · `shareProcess` 탭 8개가 렌더러 프로세스 하나를 같이 씀(메모리 절반 · 끄면 탭마다 따로) · `killStray`(기본 true) 재시작할 때 남은 크로뮴 프로세스를 정리 — 이 서버에서 다른 크로뮴을 같이 쓰면 false.
- 계정·비밀번호는 환경 변수 `ADEN_BH_ACCOUNT` · `ADEN_BH_PASSWORD`로도 넣을 수 있어요.

### 로그 읽는 법

```
[z2] 로그인 입력
[z2] 입장 완료 phase=run err=- host=true v205
[health] 2:host b8 m84 20Hz · 4:host b0 m64 20Hz · … · rss 706MB
[z2] [BH] {"ok":true,"zone":2,"host":true,"bots":8,"mobs":80,"fps":20,...}
```

- `[health]` 30초마다 한 줄: 지역마다 `host`(호스트임) · `b봇 수` · `m몬스터 수` · `루프 Hz`(정상 20) · `p보는 사람 수` · 끝에 크로뮴 메모리. 지역 앞에 `!`가 붙으면 그 지역이 이상한 상태(60초 넘으면 그 탭만 새로 고침 · 5번 연속이면 브라우저 전체 재시작).
- `[BH]` 지역마다 1분에 한 줄(게임 안 상태 그대로).
- `[ver] 새 버전 v206` → `[restart] 게임 v205 → v206 반영` : 배포가 나오면 5분 안에 알아서 새로 고침. GitHub Pages 반영이 늦으면 "아직 페이지가 v205"라고 하고 5분 뒤 다시 합니다.
- 봇 수가 `b0`인 지역이 있는 건 정상이에요 — 봇은 일과표에 따라 자기 레벨에 맞는 사냥터에만 있습니다.

## ④ Firestore 규칙 (봇이 실제 유저 캐릭터를 복사하려면)

봇 능력치는 서버에 저장된 유저 캐릭터 정보(`worldbot_chars`) 중 전투력 1등을 2시간마다 '사진'(`worldbot`)으로 찍어 씁니다. 봇 호스트 계정이 접속해 있으면 **봇 호스트가 그 사진을 만듭니다.** Firebase 콘솔 → Firestore → 규칙에 아래가 있어야 해요 (없으면 403이라 봇 호스트는 사진을 못 만들고, 접속한 유저 중 1등이 대신 만듭니다 · 아무도 없으면 봇이 레벨 1 기준이 되어 거의 안 나와요):

```
match /worldbot/{id} { allow read: if request.auth != null; allow create: if request.auth != null; }
match /worldbot_chars/{uid} { allow read: if request.auth != null; allow write: if request.auth != null && request.auth.uid == uid; }
```

## ⑤ 문제가 생겼을 때

| 증상 | 할 일 |
|---|---|
| 아무 반응이 없다 | `sudo systemctl restart aden-bothost` 그리고 `sudo journalctl -u aden-bothost -n 100` |
| `[z2] 로그인 실패: 없는 계정…/비밀번호가 맞지 않습니다` | `config.json`의 account·password 확인 → `sudo systemctl restart aden-bothost` |
| `입장 못 함 phase=fail err=nochar` | 그 계정에 캐릭터가 없음 → ① 다시 |
| `입장 못 함 phase=load` 또는 `err=load` | 계정 서버(Firebase)에 못 닿음 — 인터넷·Firebase 상태 확인. 러너가 60초마다 다시 시도 |
| `host=false`가 계속 | 같은 지역에 다른 봇 호스트 탭이 있음 (서버를 두 대 켰거나 `zones`에 같은 번호). 하나만 두세요 |
| `[restart] 메모리 …MB > 3000MB` 가 자주 | `memCapMB`를 올리거나(4GB 인스턴스면 3500) `zones`를 줄이기 |
| 봇이 게임에서 안 보인다 | 게임에서 `/혈맹`을 쳐 보면 "봇 복사: 이름 Lv.N …"이 나와야 함. "실시간 기준 · 서버 저장 안 됨"이면 ④ 규칙 확인. 접속자 목록에 봇 호스트 계정은 **원래 안 보입니다** |
| 서버 코드(run.js)가 새로 나왔다 | `cd ~/aden-world && git pull && sudo systemctl restart aden-bothost` (`npm install`이 필요하면 `bash server/bothost/install.sh` 다시) |
| 잠깐 끄기 / 완전히 끄기 | `sudo systemctl stop aden-bothost` / `sudo systemctl disable --now aden-bothost` |

서비스는 `Restart=always`라 죽어도 10초 뒤 다시 켜지고, 러너 자체도 브라우저가 끊기면 다시 띄웁니다. 재시작 중(약 1~2분)에는 그 지역 봇이 잠깐 멈췄다가 이어집니다 (일과표가 시각 기준이라 자리는 그대로).

## ⑥ 비용 줄이기

- `zones`를 줄이면 메모리·CPU가 그만큼 줍니다 (예: 유저가 자주 가는 사냥터 4곳만).
- 인스턴스를 **중지(stop)** 하면 그동안 인스턴스 요금은 안 나오고 저장 공간 요금만 나옵니다 (다시 시작하면 서비스가 자동으로 켜짐).
- `t4g.small`(2GB)로 시작해 보고 `[health]`의 rss가 1.2GB를 넘지 않으면 그대로 써도 됩니다. 이때 `memCapMB`는 1400 정도로.
- 예약 인스턴스/Savings Plan(1년)을 걸면 30~40% 쌉니다 — 계속 돌릴 생각이 확실해진 뒤에.

## 안전

- 이 폴더의 `config.json`(계정·비밀번호)은 git에 안 올라갑니다. 혹시 올릴 일이 생겨도 `git status`에 `config.json`이 보이면 안 됩니다.
- 서버에는 운영자 키(`admin_key.js`)를 두지 마세요. 봇 호스트는 운영자 권한이 필요 없습니다.
- 봇 호스트 계정은 다른 유저가 공격할 수도, 거래·파티를 걸 수도 없고 전투력 후보·접속자 수에도 안 들어갑니다.
