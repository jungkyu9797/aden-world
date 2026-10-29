# 작업방 전용 테스트 아티팩트를 새로 만들 때: 메인 테스트 아티팩트에 있는 에셋을 서버에서 그대로 복사하는 files 목록(JSON)을 출력
# 한 번에 255개까지라 두 번에 나눠 올림:  python3 dev/asset_map.py 1  → 첫 묶음 / python3 dev/asset_map.py 2 → 두 번째 묶음
# 첫 publish: file_path=dev/out/publish.html, root=<저장소>, files=<1번 출력>  →  두 번째 publish: 같은 url 로 files=<2번 출력>
import os, sys, json
MAIN = 'https://claude.ai/artifact/MZNnyPab1VtMTqbtEyuay6'
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
paths = sorted(os.path.relpath(os.path.join(dp, f), R).replace(os.sep, '/') for dp, dn, fn in os.walk(os.path.join(R, 'assets')) for f in fn)
part = int(sys.argv[1]) if len(sys.argv) > 1 else 1; half = (len(paths) + 1) // 2
chunk = paths[:half] if part == 1 else paths[half:]
print(json.dumps({p: {'artifact': MAIN, 'path': p} for p in chunk}, ensure_ascii=False))
