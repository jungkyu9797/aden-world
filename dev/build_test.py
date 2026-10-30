# 테스트 아티팩트용 한 파일 페이지 만들기: dev/out/publish.html (게임 스크립트를 안에 넣고 데모 모드 · 웹 앱 정보·운영자 키 줄은 뺌)
# 아티팩트로 올릴 때: file_path=<저장소>/dev/out/publish.html, root=<저장소>, files={} (에셋은 아티팩트에 이미 있음 · 효과음 mp3는 페이지 안에 들어 있으니 files에 넣지 않음)
import os, re, json
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
# 몬스터 효과음(assets/sound/sfx/*.mp3)은 페이지 안에 넣음 — 아티팩트 한 판에 파일을 511개까지만 올릴 수 있어서 (게임이 그 주소로 부르면 안에 넣은 소리를 줌)
import base64, glob
SFX = {os.path.basename(f)[:-4]: base64.b64encode(open(f, 'rb').read()).decode() for f in sorted(glob.glob('assets/sound/sfx/*.mp3'))}
SHIM = ('<script>/* 테스트 판: 효과음을 페이지 안에서 꺼내 씀 */(()=>{const S=' + json.dumps(SFX) + ';const U={};'
  "const blob=k=>{if(U[k])return U[k];const b=atob(S[k]),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return U[k]=URL.createObjectURL(new Blob([a],{type:'audio/mpeg'}));};"
  "const key=u=>{const m=String(u||'').match(/assets\\/sound\\/sfx\\/([\\w-]+)\\.mp3/);return m&&S[m[1]]?m[1]:null;};"
  "const F=window.fetch;window.fetch=function(u,o){const k=key(typeof u==='string'?u:u&&u.url);return k?F.call(this,blob(k),o):F.apply(this,arguments);};"
  "const A=window.Audio;const W=function(u){const k=key(u);return k?new A(blob(k)):(arguments.length?new A(u):new A());};W.prototype=A.prototype;window.Audio=W;})();</script>\n")
s = s.replace('<script>window.DEMO_MODE=true;</script>', SHIM + '<script>window.DEMO_MODE=true;</script>', 1)
# 판 번호: 열려 있는 테스트 페이지가 새 판을 알아채고 새로고침 (아티팩트 db tbuild/cur 에 같은 번호를 적으면 다른 판으로 봄)
import hashlib, datetime
BUILD = hashlib.sha1(s.encode('utf8')).hexdigest()[:12]
WATCH = """<script>/* 테스트 판 바뀜 알림 */(()=>{const BUILD='%s';let shown=false;
function bar(b,stuck){shown=true;const el=document.createElement('div');el.setAttribute('role','status');el.style.cssText='position:fixed;left:50%%;top:10px;transform:translateX(-50%%);z-index:2147483000;background:#1a1e26;color:#fff;border:1px solid #e09a4a;border-radius:10px;padding:9px 14px;font:600 14px/1.4 sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.45);display:flex;gap:10px;align-items:center;flex-wrap:wrap;max-width:calc(100%% - 24px)';
const what=b&&b.n?(' ('+b.n+'건)'):'';if(stuck){el.innerHTML='<span>🆕 테스트 판이 새로 올라왔어요'+what+' · 이 창을 닫았다가 다시 열어 주세요</span>';document.body.appendChild(el);return;}
let left=10;el.innerHTML='<span>🆕 승인 대기에 새 항목이 들어왔어요'+what+' · <b id="tb-left">'+left+'</b>초 뒤 새로고침</span>';
const now=document.createElement('button'),wait=document.createElement('button');[now,wait].forEach(x=>{x.style.cssText='font:700 13px sans-serif;border:0;border-radius:7px;padding:5px 10px;cursor:pointer';});now.textContent='지금';now.style.background='#e09a4a';now.style.color='#1a1e26';wait.textContent='잠깐만';wait.style.background='#3a4150';wait.style.color='#fff';
el.append(now,wait);document.body.appendChild(el);const go=()=>{try{sessionStorage.setItem('tb_try',b.id)}catch(e){}location.reload();};
const iv=setInterval(()=>{left--;const s=document.getElementById('tb-left');if(s)s.textContent=left;if(left<=0){clearInterval(iv);go();}},1000);
now.onclick=go;wait.onclick=()=>{clearInterval(iv);el.firstChild.textContent='🆕 승인 대기에 새 항목이 들어왔어요'+what+' · 준비되면 새로고침을 눌러 주세요';wait.remove();now.textContent='새로고침';};}
async function start(){let db=null;try{if(window.claude&&claude.use)db=await claude.use('db');}catch(e){}if(!db)return;
try{db.doc('tbuild/cur').onSnapshot(d=>{const b=d.exists?d.data():null;if(!b||!b.id||b.id===BUILD||shown)return;let tried=null;try{tried=sessionStorage.getItem('tb_try')}catch(e){}bar(b,tried===b.id);},()=>{});}catch(e){}}
setTimeout(start,4000);})();</script>""" % BUILD
assert s.count('</body>') == 1, 'body 끝을 못 찾음'
s = s.replace('</body>', WATCH + '</body>')
os.makedirs('dev/out', exist_ok=True)
json.dump({'id': BUILD, 'at': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}, open('dev/out/build.json', 'w'))
print('build', BUILD, '(publish 뒤 테스트 아티팩트 db tbuild/cur 에 {id, at, n} 적기)')
os.makedirs('dev/out', exist_ok=True); open('dev/out/publish.html', 'w', encoding='utf8').write(s); print('built dev/out/publish.html', len(s))
