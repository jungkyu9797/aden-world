# 빠른 시뮬 페이지: _sim2.html + src/_sim2.js (window.__FAST=n 이면 한 프레임에 n×0.05초 진행 · window.__HOOK 매 스텝 호출 · window.__S 내부 접근)
# 먼저 python3 dev/mkkt.py 를 돌려 src/_kt2.js 를 만든 뒤 실행
import os, re
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))
s=open('src/game.js',encoding='utf8').read()
fs=s.index('function frame(now){'); a=s.index('  const dt=Math.max(0,Math.min(0.05,(now-last)/1000));', fs); b=s.index('  const tgt=W2P(hero.x,hero.z);', fs)
body=s[a:b].replace('const dt=Math.max(0,Math.min(0.05,(now-last)/1000)); last=now; time+=dt;', 'time+=dt;')
step="function __step(dt){\n"+body+"  { const tgt=W2P(hero.x,hero.z); cam[0]=tgt[0]; cam[1]=tgt[1]-20; }\n}\n"
fast="function frame(now){\n  if (window.__FAST){ const n=window.__FAST; for (let q=0;q<n;q++){ holdTick(); __step(0.05); if (window.__HOOK) window.__HOOK(); } last=now; window.__FRAMES=(window.__FRAMES||0)+1; if (!window.__DRAW || window.__FRAMES % window.__DRAW) { requestAnimationFrame(frame); return; } }\n"
s=s[:fs]+step+fast+s[fs+len('function frame(now){\n'):]
i=s.rindex('})();')
kt=open('src/_kt2.js',encoding='utf8').read()
inj_start=kt.index('window.__T={'); inj=kt[inj_start:kt.index('\n',inj_start)+1] if '\n' in kt[inj_start:inj_start+20000] else None
s=s[:i]+inj+"window.__S={ get time(){return time}, CX_SHOP, CLS_DEF, mkMob, get PET(){return PET}, get foxes(){return foxes}, get STATE(){return {lv:hero.lv,hp:hero.hp,max:hero.max,mp:hero.mp,maxmp:hero.maxmp}} };\n"+s[i:]
open('src/_sim2.js','w',encoding='utf8').write(s)
h=open('index.html',encoding='utf8').read().replace('<script src="src/game.js"></script>','<script src="src/_sim2.js"></script>')
open('_sim2.html','w',encoding='utf8').write(h); print('sim ok', len(s))
