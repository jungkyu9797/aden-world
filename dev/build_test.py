# 테스트 아티팩트용 한 파일 페이지 만들기: dev/out/publish.html (게임 스크립트를 안에 넣고 데모 모드 · 웹 앱 정보·운영자 키 줄은 뺌)
# 아티팩트로 올릴 때: file_path=<저장소>/dev/out/publish.html, root=<저장소>, files={} (에셋은 아티팩트에 이미 있음)
import os, re
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); os.chdir(R)
s = open('index.html', encoding='utf8').read()
s = re.sub(r'<link rel="manifest".*?</head><body>', '</head><body>', s, count=1, flags=re.S)   # 저장소 index.html의 웹 앱 정보는 빼기
s = s.replace('<title>아덴 월드</title>', '<title>클래식 사냥터</title>', 1)
mark = '[hidden]:not([hidden=until-found i]){display:none!important}'
a = s.index(mark) + len(mark); b = s.index('</style></head>', a); css = s[a:b]; s = s[:a] + s[b:]
s = s.replace('<style>\n/* Layout:', '<style>\n' + css.strip() + '\n/* Layout:', 1)
s = s.replace('<script src="admin_key.js" onerror="this.remove()"></script>\n', '')
s = s.replace('<script src="src/map_data.js"></script>', '<script>window.DEMO_MODE=true;</script>\n<script src="src/map_data.js"></script>', 1)
for f, h in [('src/map_data.js', '// 맵·스프라이트 메타데이터 (그래픽/맵 팀)'), ('src/game.js', '')]:
    tag = f'<script src="{f}"></script>'; assert tag in s, tag
    s = s.replace(tag, '<script>\n' + h + '\n' + open(f, encoding='utf8').read() + '\n</script>')
assert s.count('"d":"') == 0, '운영자 키가 들어 있음 — 올리지 마세요'
os.makedirs('dev/out', exist_ok=True); open('dev/out/publish.html', 'w', encoding='utf8').write(s); print('built dev/out/publish.html', len(s))
