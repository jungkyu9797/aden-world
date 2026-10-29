#!/bin/bash
# 테스트할 때만 저장소 루트를 http://127.0.0.1:8766 으로 잠깐 열고, 인자로 받은 node 스크립트를 차례로 실행한 뒤 끔
# 예) python3 dev/mkkt.py && bash dev/runkt.sh dev/tests/sample_item_detail.js
R="$(cd "$(dirname "$0")/.." && pwd)"; mkdir -p "$R/dev/out"
pkill -f "^python3 -m http[.]server 8766" 2>/dev/null && sleep 0.5   # 예전에 남은 테스트 서버가 있으면 끔 (다른 폴더를 열고 있으면 엉뚱한 코드로 테스트됨)
(cd "$R" && exec python3 -m http.server 8766 --bind 127.0.0.1 >/dev/null 2>&1) & SP=$!
for i in $(seq 1 30); do curl -s -o /dev/null http://127.0.0.1:8766/ && break; sleep 0.2; done
cd "$R"; for f in "$@"; do timeout ${KT_TO:-300} node $f 2>&1 | grep -v "agent-proxy\|broker\|githubuser\|identitytool\|Allowed domains\|For details\|and 1 more\|connections through"; done
kill $SP 2>/dev/null; wait $SP 2>/dev/null
