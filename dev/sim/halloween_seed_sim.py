import random, math, sys
def sim(hat=5, N=44, nN=27, nC=3, resp=9.0, T=7200, seed=1, overhead=0.35):
    rnd=random.Random(seed)
    ATK=0.9/0.7/(1.2*1.4)      # 근거리 공격 간격 (촐기+용기)
    SPD=3.2*0.7*(1.2*1.4)      # 이동 칸/초
    dmg=1+hat
    mobs=[]
    for k in range(nN+nC):
        cap=k>=nN; h=(rnd.randrange(3,N-3),rnd.randrange(3,N-3))
        mobs.append({'cap':cap,'home':h,'pos':h,'dead_until':-1})
    t=0; x,y=N//2,N//2; kills=[0,0]; seeds=0; scr=0; bscr=0
    while t<T:
        alive=[m for m in mobs if m['dead_until']<=t]
        if not alive:
            t=min(m['dead_until'] for m in mobs); continue
        m=min(alive,key=lambda m:max(abs(m['pos'][0]-x),abs(m['pos'][1]-y)))
        d=max(abs(m['pos'][0]-x),abs(m['pos'][1]-y))
        t+=max(0,d-1)/SPD + overhead
        hp=25 if m['cap'] else 15; hits=math.ceil(hp/dmg)
        t+=(hits-1)*ATK+0.3
        if t>T: break
        x,y=m['pos'][0]-1,m['pos'][1]
        if m['cap']:
            kills[1]+=1; seeds+=rnd.randint(3,8); scr+=rnd.random()<0.2; bscr+=rnd.random()<0.1
        else:
            kills[0]+=1; seeds+=rnd.randint(1,3); scr+=rnd.random()<0.1
        m['dead_until']=t+resp; hx,hy=m['home']; m['pos']=(min(N-2,max(1,hx+rnd.randint(-3,3))),min(N-2,max(1,hy+rnd.randint(-3,3))))
    return kills,seeds,scr,bscr
for hat in [0,3,5,7,9]:
    r=[sim(hat=hat,seed=s) for s in range(20)]
    k0=sum(a[0][0] for a in r)/20; k1=sum(a[0][1] for a in r)/20; sd=sum(a[1] for a in r)/20; sc=sum(a[2] for a in r)/20; bs=sum(a[3] for a in r)/20
    print(f'+{hat}: 일반 {k0:.0f} 대장 {k1:.0f} 합 {k0+k1:.0f}마리  호박씨 {sd:.0f}개  호박강화 {sc:.0f}장 축복 {bs:.1f}장  분당 {(k0+k1)/120:.1f}마리')
print('--- +5, 맵 크기 영향')
for N in [36,44,56]:
    r=[sim(hat=5,N=N,seed=s) for s in range(20)]; print(N, round(sum(a[1] for a in r)/20), round(sum(a[0][0]+a[0][1] for a in r)/20))
