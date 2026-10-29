# 배포 담당 대화방 전용: 저장소 index.html에 웹 앱 정보 넣기(이미 있으면 다시 넣음) + version.json(파일별 크기·sha256) 다시 만들기
# 순서: GAME_VER·업데이트 소식 반영 → python3 dev/release.py → bash dev/keycheck.sh → commit → push main
import os, re, json, hashlib
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); os.chdir(R)
ver = int(re.search(r'const GAME_VER = (\d+);', open('src/game.js', encoding='utf8').read()).group(1))
PWA = ('<link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#120e0a"><meta name="mobile-web-app-capable" content="yes">'
       '<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="아덴 월드">'
       '<link rel="apple-touch-icon" href="assets/app/icon-180.png"><link rel="icon" type="image/png" href="assets/app/icon-192.png">')
t = open('index.html', encoding='utf8').read()
t = re.sub(r'<link rel="manifest".*?</head><body>', '</head><body>', t, count=1, flags=re.S)
k = '</style></head><body>'; assert t.count(k) == 1, 'head 끝을 못 찾음'
t = t.replace(k, '</style>' + PWA + '</head><body>').replace('<title>클래식 사냥터</title>', '<title>아덴 월드</title>', 1)
open('index.html', 'w', encoding='utf8').write(t)
files = ['index.html', 'src/game.js', 'src/map_data.js', 'main.js', 'preload.js', 'update.json', 'manifest.webmanifest', 'sw.js']
for dp, dn, fn in os.walk('assets'):
    for f in fn: files.append(os.path.join(dp, f).replace(os.sep, '/'))
assert (json.load(open('update.json')).get('base') or '').strip(), 'update.json base 비어 있음'
man = {'ver': ver, 'name': 'v%d' % ver, 'files': {}}
for rel in sorted(files):
    b = open(rel, 'rb').read(); man['files'][rel] = [len(b), hashlib.sha256(b).hexdigest()]
json.dump(man, open('version.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('v%d' % ver, len(man['files']), 'files', sum(v[0] for v in man['files'].values()) // 1024, 'KB')
