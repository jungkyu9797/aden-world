#!/bin/bash
# 아덴 월드 24시간 봇 서버 설치 (Ubuntu 22.04 / 24.04 · x86_64 · arm64 모두)
#   node 20 LTS → npm install(playwright) → 크로뮴 + 필요한 리눅스 패키지 → systemd 서비스(aden-bothost) 등록
# 쓰는 법:  bash server/bothost/install.sh     (저장소를 git clone 한 뒤 · sudo 를 쓸 수 있는 계정에서)
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"; U="$(id -un)"
echo "== 1/5 node 20 LTS"
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node -v; npm -v
echo "== 2/5 playwright 설치"
cd "$DIR"
if [ -f package-lock.json ]; then npm ci --omit=dev --no-audit --no-fund; else npm install --omit=dev --no-audit --no-fund; fi
echo "== 3/5 크로뮴 + 리눅스 라이브러리 (몇 분 걸려요)"
npx playwright install --with-deps chromium
echo "== 4/5 설정 파일"
if [ ! -f config.json ]; then cp config.example.json config.json; echo "   config.json 을 만들었어요 → account · password 를 적어 주세요:  nano $DIR/config.json"; fi
chmod 600 config.json
echo "== 5/5 systemd 서비스 aden-bothost"
MEM="${ADEN_BH_MEMMAX:-3500M}"
sudo tee /etc/systemd/system/aden-bothost.service >/dev/null <<EOF
[Unit]
Description=Aden World 24h bot host (headless chromium)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$U
WorkingDirectory=$DIR
ExecStart=/usr/bin/env node $DIR/run.js
Restart=always
RestartSec=10
MemoryMax=$MEM
Environment=NODE_ENV=production
Environment=PLAYWRIGHT_BROWSERS_PATH=$HOME/.cache/ms-playwright
KillSignal=SIGTERM
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable aden-bothost >/dev/null
if grep -q '"password": *"여기에' config.json; then
  echo; echo "설치 끝. config.json 에 계정·비밀번호를 적은 뒤 시작하세요:"
  echo "  nano $DIR/config.json"
  echo "  sudo systemctl start aden-bothost && sudo journalctl -u aden-bothost -f"
else
  sudo systemctl restart aden-bothost
  echo; echo "설치 끝 · 서비스 시작함. 로그:  sudo journalctl -u aden-bothost -f"
fi
