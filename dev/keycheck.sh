#!/bin/bash
# 운영자 개인키(admin_key.js)가 섞여 들어가지 않았는지 확인 — 0이 아니면 절대 커밋·배포하지 말 것
R="$(cd "$(dirname "$0")/.." && pwd)"; bad=0
for f in "$R/index.html" "$R/src/game.js" "$R/dev/out/publish.html"; do [ -f "$f" ] || continue; n=$(grep -c '"d":"' "$f"); echo "$(basename $f) $n"; [ "$n" != "0" ] && bad=1; done
[ -f "$R/admin_key.js" ] && { echo "admin_key.js 가 저장소 안에 있음 — 지우지 말고 저장소 밖으로 옮길 것"; bad=1; }
exit $bad
