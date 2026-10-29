# 승인 대기 묶음 테스트 판 만들기: origin/main + 승인 대기 갈래들을 임시로 합쳐 dev/out/publish.html 을 만든다 (어디에도 push하지 않음)
# 쓰는 법: python3 dev/stage_test.py work/aaa work/bbb ...   (작업판에서 status ready·test 인 카드들의 branch 전부)
# 끝나면: 메인 테스트 아티팩트에 publish(file_path=dev/out/publish.html, root=저장소, files={}+새 에셋)
#        → 테스트 아티팩트 db tbuild/cur = {id: dev/out/build.json의 id, at, n: 갈래 수}  (열려 있는 테스트 페이지가 새로고침)
#        → 작업판 db meta/test = {id, at, n, branches}
import os, sys, subprocess, json
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); os.chdir(R)
def git(*a, ok=False):
    r = subprocess.run(['git', *a], capture_output=True, text=True)
    if r.returncode and not ok: sys.exit(f'git {" ".join(a)} 실패:\n{r.stderr.strip()}')
    return r
if git('status', '--porcelain').stdout.strip(): sys.exit('커밋 안 한 변경이 있어요 — 먼저 commit·push 하세요')
back = git('rev-parse', '--abbrev-ref', 'HEAD').stdout.strip()
brs = [b.replace('origin/', '', 1) for b in sys.argv[1:]]
git('fetch', '-q', 'origin', '+refs/heads/main:refs/remotes/origin/main', *[f'+refs/heads/{b}:refs/remotes/origin/{b}' for b in brs])
git('checkout', '-q', '-B', 'stage/test', 'origin/main')
merged, skipped = [], []
for b in brs:
    r = git('merge', '--no-ff', '--no-edit', '-q', f'origin/{b}', ok=True)
    if r.returncode:
        git('merge', '--abort', ok=True); skipped.append(b); print(f'충돌로 뺌: {b}')
    else: merged.append(b)
r = subprocess.run(['node', '--check', 'src/game.js'])
if r.returncode: git('checkout', '-q', back); sys.exit('합친 game.js 문법 오류 — 테스트 판을 만들지 않았어요')
subprocess.run([sys.executable, 'dev/build_test.py'], check=True)
kc = subprocess.run(['bash', 'dev/keycheck.sh'], capture_output=True, text=True).stdout
if any(l.strip() and not l.strip().endswith(' 0') for l in kc.splitlines()): git('checkout', '-q', back); sys.exit('운영자 키 검사 실패 — 올리지 마세요\n' + kc)
b = json.load(open('dev/out/build.json')); b.update(n=len(merged), branches=merged, skipped=skipped)
json.dump(b, open('dev/out/build.json', 'w'), ensure_ascii=False)
git('checkout', '-q', back)
print(json.dumps(b, ensure_ascii=False))
