// 클래식 사냥터 게임 본체
(() => {
const META = window.MAP_META, IMG = {
 "ground": "assets/classic/ground.webp",
 "tree0": "assets/classic/tree0.webp",
 "tree1": "assets/classic/tree1.webp",
 "tree2": "assets/classic/tree2.webp",
 "rock0": "assets/classic/rock0.webp",
 "rock1": "assets/classic/rock1.webp",
 "rock2": "assets/classic/rock2.webp",
 "bush0": "assets/classic/bush0.webp",
 "bush1": "assets/classic/bush1.webp",
 "bush2": "assets/classic/bush2.webp",
 "fox_Survey": "assets/classic/fox_Survey.webp",
 "fox_Walk": "assets/classic/fox_Walk.webp",
 "fox_Run": "assets/classic/fox_Run.webp",
 "knight_idle": "assets/classic/knight_idle.webp",
 "knight_look": "assets/classic/knight_look.webp",
 "knight_walk": "assets/classic/knight_walk.webp",
 "villager_m_idle": "assets/classic/villager_m_idle.webp",
 "villager_m_walk": "assets/classic/villager_m_walk.webp",
 "villager_f_idle": "assets/classic/villager_f_idle.webp",
 "villager_f_walk": "assets/classic/villager_f_walk.webp",
 "knight_attack": "assets/classic/knight_attack.webp",
 "knight_attack2": "assets/classic/knight_attack2.webp"
};
const im = {}; for (const k in IMG){ const i = new Image(); i.src = IMG[k]; im[k] = i;
  // 나무·바위·덤불: 렌더 칸 경계에서 잘린 그림자가 네모로 보이지 않게 가장자리를 부드럽게 지움
  if (/^(tree|rock|bush)\d$/.test(k)) i.onload = () => { const w = i.naturalWidth, h = i.naturalHeight, c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(i, 0, 0);
    x.globalCompositeOperation = 'destination-out'; const e = Math.round(Math.min(w, h) * 0.12);
    [[0, 0, e, 0, 0, 0, e, h], [w, 0, w - e, 0, w - e, 0, e, h], [0, 0, 0, e, 0, 0, w, e], [0, h, 0, h - e, 0, h - e, w, e]].forEach(([x0, y0, x1, y1, rx, ry, rw, rh]) => { const gr = x.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(rx, ry, rw, rh); });
    c.complete = true; c.naturalWidth = w; c.naturalHeight = h; im[k] = c; }; }
const G = META.ground, K = Math.SQRT1_2*META.S; let MAP = META.MAP;
// 높낮이: 이야기섬 지역에 높이지도(hmap, 꼭짓점 (N+1)²)가 있으면 그만큼 위로 그림
const VPXG = META.S*Math.cos(Math.PI/6);
function hAt(x,z){ const Z=ISLE, hm=Z&&Z.hmap; if (!hm) return 0; const n=Z.N; x=Math.max(0,Math.min(n-0.001,x)); z=Math.max(0,Math.min(n-0.001,z));
  const i=Math.floor(x), j=Math.floor(z), fx=x-i, fz=z-j, w=n+1, a=hm[j*w+i], b=hm[j*w+i+1], c=hm[(j+1)*w+i], d=hm[(j+1)*w+i+1];
  return (a*(1-fx)+b*fx)*(1-fz)+(c*(1-fx)+d*fx)*fz; }
const W2P = (x,z) => [G.ax + (x-z)*K, G.ay + (x+z)*K*0.5 - hAt(x,z)*VPXG];
const P2W = (px,py) => { const u=(px-G.ax)/K, v=(py-G.ay)/(K*0.5); return [(u+v)/2, (v-u)/2]; };
let blockedT = META.blocked.map(r=>r.slice());
const FIELD_BLOCKED = blockedT;
let SCENE='field', ZONE='새벽 들판', PROPS=META.props, ISLE=null;
const propAt = new Map(); META.props.forEach(p=>propAt.set(p.j*MAP+p.i,p));
// ============================================================ 낮과 밤 (24분 주기: 낮 16분 · 밤 8분, 전환 1분)
const DN = (() => {
  const DAY = 16*60, NIGHT = 8*60, CYC = DAY + NIGHT, FADE = 60;
  let t = 3*60, was = null, dark = 0, force = null;
  const BLOCK = new Set(['tree','rock','house','wall','dwall']);
  let bset = null, bsrc = null, vis = new Map(), vkey = '';
  function target(){ if (ISLE && ISLE.def && ISLE.def.dark) return 1; if (force!=null) return force; const u = t % CYC;
    if (u < DAY - FADE) return 0; if (u < DAY) return (u-(DAY-FADE))/FADE; if (u < CYC - FADE) return 1; return 1-(u-(CYC-FADE))/FADE; }
  const isNight = () => dark > 0.5;
  function blockers(){ if (bsrc!==PROPS){ bsrc=PROPS; bset=new Set(); for (const p of PROPS) if (BLOCK.has(p.type)) bset.add(p.j*MAP+p.i); } return bset; }
  const R = () => ISLE && ISLE.def && ISLE.def.dark ? 7.5 + (BUFF.light > 0 ? 3 : 0) : 13 - 7*dark + (BUFF.light > 0 ? 3*dark : 0);   // 던전: 6.5칸 (양초 +3)   // 시야 반경(칸): 낮 13 → 밤 6
  function los(i0,j0,i1,j1,B){ const x0=i0+.5, y0=j0+.5, x1=i1+.5, y1=j1+.5, n=Math.ceil(Math.hypot(x1-x0,y1-y0)*3);
    for (let k=1;k<n;k++){ const x=Math.floor(x0+(x1-x0)*k/n), y=Math.floor(y0+(y1-y0)*k/n); if ((x!==i0||y!==j0)&&(x!==i1||y!==j1)&&B.has(y*MAP+x)) return false; } return true; }
  let quietT = 0;
  function update(dt){ t += dt; dark += (target()-dark)*Math.min(1,dt*1.5);
    if (ISLE && ISLE.def && ISLE.def.dark) quietT = 5; else quietT = Math.max(0, quietT - dt);
    const n = isNight(); if (quietT > 0) { was = n; return; } if (was!==null && n!==was) say(n ? '밤이 되었습니다. 시야가 좁아지고 언데드 몬스터가 강해집니다.' : '날이 밝았습니다.', n ? '#a8b8f0' : '#f2e6a8'); was = n; }
  const limited = () => SCENE==='field' && dark > 0.05;
  function visMap(){ const key=hero.i+','+hero.j+','+Math.round(R()*4)+','+(PROPS.length)+SCENE; if (key===vkey) return vis; vkey=key; vis=new Map();
    const r=R(), B=blockers(), rr=Math.ceil(r)+2;
    for (let j=hero.j-rr;j<=hero.j+rr;j++) for (let i=hero.i-rr;i<=hero.i+rr;i++){ const d=Math.hypot(i-hero.i,j-hero.j); vis.set(j*MAP+i, d<=r && los(hero.i,hero.j,i,j,B)); } return vis; }
  function seen(i,j){ if (!limited()) return true; return !!visMap().get(j*MAP+i); }
  let oc=null; const MS=8; let mk=null, mkKey='';
  function shadowMask(){ const V=visMap(); if (mkKey===vkey && mk) return mk; mkKey=vkey;
    const rr=Math.ceil(R())+3, n=2*rr+1, i0=hero.i-rr, j0=hero.j-rr;
    const raw=document.createElement('canvas'); raw.width=raw.height=n; const r=raw.getContext('2d'), id=r.createImageData(n,n);
    for (let j=0;j<n;j++) for (let i=0;i<n;i++){ const gi=i0+i, gj=j0+j, o=(j*n+i)*4; const v=V.get(gj*MAP+gi); id.data[o]=4; id.data[o+1]=7; id.data[o+2]=22; id.data[o+3]=(v===false)?255:0; }
    r.putImageData(id,0,0);
    const cv=mk&&mk.cv.width===n*MS?mk.cv:document.createElement('canvas'); cv.width=cv.height=n*MS; const x=cv.getContext('2d'); x.clearRect(0,0,cv.width,cv.height);
    x.filter=`blur(${MS*0.55}px)`; x.imageSmoothingEnabled=true; x.drawImage(raw,0,0,n*MS,n*MS); x.filter='none';
    mk={cv,i0,j0}; return mk; }
  function draw(g, vw, vh, ox, oy){ if (dark<0.01) return; if (!oc) oc=document.createElement('canvas'); if (oc.width!==vw||oc.height!==vh){ oc.width=vw; oc.height=vh; }
    const c=oc.getContext('2d'), town=SCENE==='town', A=(town?0.5:ISLE&&ISLE.def&&ISLE.def.dark?0.95:0.86)*dark; c.globalCompositeOperation='source-over'; c.clearRect(0,0,vw,vh);
    c.fillStyle=`rgba(4,7,22,${A})`; c.fillRect(0,0,vw,vh);
    const [hx,hy]=W2P(hero.x,hero.z), X=hx+ox, Y=hy+oy-20;
    if (!town){ const r=R()*K*1.414; c.globalCompositeOperation='destination-out'; c.save(); c.translate(X,Y); c.scale(1,0.5);
      const gr=c.createRadialGradient(0,0,r*0.25,0,0,r); gr.addColorStop(0,'rgba(0,0,0,1)'); gr.addColorStop(0.7,'rgba(0,0,0,.85)'); gr.addColorStop(1,'rgba(0,0,0,0)');
      c.fillStyle=gr; c.beginPath(); c.arc(0,0,r,0,7); c.fill(); c.restore();
      for (const L of MXLIT){ const lx=L.x+ox, ly=L.y+oy, lg=c.createRadialGradient(lx,ly,0,lx,ly,L.r); lg.addColorStop(0,`rgba(0,0,0,${L.a})`); lg.addColorStop(0.5,`rgba(0,0,0,${L.a*0.6})`); lg.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=lg; c.fillRect(lx-L.r,ly-L.r,L.r*2,L.r*2); }   // 마법 빛이 어둠을 밝힘
      // 나무·바위에 가려진 곳: 칸 단위 마스크를 작게 그려 흐리게 늘림 (칸 모양 안 보이게)
      const M=shadowMask(); if (M){ c.globalCompositeOperation='source-over'; c.save(); c.globalAlpha=Math.min(1,A*1.05);
        c.setTransform(K/MS, K/2/MS, -K/MS, K/2/MS, G.ax+ox+(M.i0-M.j0)*K, G.ay+oy+(M.i0+M.j0)*K/2); c.imageSmoothingEnabled=true; c.drawImage(M.cv,0,0); c.restore(); } litSprites(c, ox, oy); }
    else { c.globalCompositeOperation='destination-out'; const gr=c.createRadialGradient(X,Y,10,X,Y,160); gr.addColorStop(0,'rgba(0,0,0,.6)'); gr.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=gr; c.fillRect(0,0,vw,vh); }
    g.drawImage(oc,0,0); }
  function litSprites(c, ox, oy){ c.save(); c.globalCompositeOperation='destination-out';
    const lit=(wx,wz,hh,hw,a)=>{ const [px,py]=W2P(wx,wz), X0=px+ox, Y0=py+oy-hh*0.48, rx=hw+16, ry=hh*0.62+14; c.save(); c.translate(X0,Y0); c.scale(1,ry/rx); const lg=c.createRadialGradient(0,0,rx*0.15,0,0,rx); lg.addColorStop(0,`rgba(0,0,0,${a})`); lg.addColorStop(0.65,`rgba(0,0,0,${a*0.75})`); lg.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=lg; c.beginPath(); c.arc(0,0,rx,0,7); c.fill(); c.restore(); };
    for (const f of foxes){ if (f.dead||f.gone||!seen(f.i,f.j)) continue; const S=MOB[f.kind]; lit(f.x,f.z,S.hh||Math.round(62*S.sc),S.hw||Math.round(14*S.sc+6),0.9); }
    lit(hero.x,hero.z,74,24,0.85); c.restore(); }
  function label(){ if (ISLE && ISLE.def && ISLE.def.dark) return '☾ 던전 · 항상 어두움'; const u=t%CYC, n=isNight(), left=n ? (u<DAY?CYC:CYC)-u : DAY-u; const m=Math.max(0,Math.ceil((n?(CYC-u):(DAY-u))/60)); return (n?'☾ 밤':'☀ 낮')+(force!=null?' (고정)':` · ${m}분 뒤 ${n?'낮':'밤'}`); }
  return { update, draw, seen, isNight, dark: () => dark, label, toggle(){ force = force==null ? (isNight()?0:1) : (force===1?0:1); } };
})();
const nightUp = S => S.undead && DN.isNight() && !MAZE();   // 던전은 늘 어두워서 밤 보너스 없음 (수치에 이미 반영)
const mobDmg = S => Math.round(rint(S.dmg) * (nightUp(S) ? 1.5 : 1));
const mobHit = S => Math.max(0.3, Math.min(0.95, 0.6 + 0.03 * (S.lv - hero.lv) + INV.ac() * 0.01 + (nightUp(S) ? 0.1 : 0)));   // v100: AC 1당 1% · 최저 30%
const mobHitM = S => Math.max(0.6, Math.min(0.95, 0.85 + 0.02 * (S.lv - hero.lv) + (nightUp(S) ? 0.05 : 0)));   // 몬스터 마법: AC 무시
const walkable = (i,j) => i>=0&&j>=0&&i<MAP&&j<MAP&&!blockedT[j][i];
const DIRV = META.dirs;
const rowFor = (dx,dz) => { let b=0,bd=-9; DIRV.forEach((d,i)=>{ const s=d[0]*dx+d[1]*dz; if (s>bd){bd=s;b=i;} }); return b; };

// ---------- audio ----------
let AC=null, master;
function initAudio(){ if (!AC){ AC=new (window.AudioContext||window.webkitAudioContext)(); master=AC.createGain(); master.gain.value=SFX_ON?0.4*SND.sfxK():0; master.connect(AC.destination); } if (AC.state==='suspended') AC.resume(); }
function tone(t,type,f0,f1,dur,peak){ const o=AC.createOscillator(); o.type=type; o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(f1,t+dur); const g=AC.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(peak,t+0.004); g.gain.exponentialRampToValueAtTime(0.0001,t+dur); o.connect(g); g.connect(master); o.start(t); o.stop(t+dur+0.05); }
function nz(t,dur,f0,f1,peak){ const b=AC.createBuffer(1,Math.max(1,AC.sampleRate*dur|0),AC.sampleRate), d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; const s=AC.createBufferSource(); s.buffer=b; const f=AC.createBiquadFilter(); f.type='bandpass'; f.frequency.setValueAtTime(f0,t); f.frequency.exponentialRampToValueAtTime(f1,t+dur); const g=AC.createGain(); g.gain.setValueAtTime(peak,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur); s.connect(f); f.connect(g); g.connect(master); s.start(t); }
const sfx = { swing(){ if(AC) nz(AC.currentTime,0.16,500,2200,0.2); },
  hit(c){ if(!AC) return; const t=AC.currentTime; tone(t,'sine',150,45,0.14,0.7); nz(t,0.07,2600,1400,0.5); tone(t,'square',1900,1700,0.06,0.05); if (c) tone(t,'sawtooth',90,40,0.25,0.3); },
  bite(){ if(!AC) return; const t=AC.currentTime; nz(t,0.08,1200,700,0.35); tone(t,'sine',110,60,0.12,0.45); },
  die(){ if(!AC) return; const t=AC.currentTime; nz(t,0.35,1800,200,0.3); tone(t,'triangle',300,80,0.4,0.12); } };

// 몬스터 효과음 (사운드팀 합성: 공격·피격·죽음) — assets/sound/sfx/<몬스터>_<종류>.mp3
let SFX_ON = true;   // ESC 메뉴: 효과음 켜기/끄기
// 소리 설정 (배경음·효과음 켜기/끄기 + 볼륨 0~100%) — 이 기기에 저장되고, 캐릭터 저장에도 함께 들어가 다른 PC에서도 그대로
const SND = (() => { const s = { bgmOn: true, sfxOn: true, bgm: 100, sfx: 100 }; try { Object.assign(s, JSON.parse(localStorage.getItem('aden_snd') || '{}')); } catch (e) {}
  const keep = () => { try { localStorage.setItem('aden_snd', JSON.stringify(s)); } catch (e) {} };
  const set = o => { for (const k in o || {}) if (k in s) s[k] = typeof s[k] === 'boolean' ? !!o[k] : Math.max(0, Math.min(100, Math.round(+o[k] || 0))); keep(); };
  return { get: () => Object.assign({}, s), set, bgmK: () => s.bgm / 100, sfxK: () => s.sfx / 100,
    apply(o) { if (!o) return; set(o); SFX_ON = s.sfxOn; applySfxVol(); if (typeof TOWN !== 'undefined' && TOWN.setBgm) TOWN.setBgm(s.bgmOn); } }; })();
SFX_ON = SND.get().sfxOn;
function applySfxVol() { if (master) master.gain.value = SFX_ON ? 0.4 * SND.sfxK() : 0; }
const MSFX = (() => { const pool = {}, has = new Set(['goblin','orc','orc_archer','dwarf','hobgoblin','orc_warrior','werewolf','shelob','lizardman','giant_ant','fire_ant','scorpion','basilisk','queen_ant','roba_orc','dudamara_orc','orc_wizard','dark_elf','atuba_orc','gast','ogre','elf','skeleton_archer','zombie','bugbear','cerberus','king_bugbear','baphomet']);   // 사막 6종 · 오크숲 7종 (코드 합성음·기존 소리 변형)
  const AL = { elmore_soldier: 'atuba_orc', elmore_warrior: 'orc_warrior', elmore_mage: 'orc_wizard', ettin: 'ogre', ice_golem: 'ogre', sabertooth: 'cerberus', ice_queen: 'orc_wizard', dg_kbugbear: 'king_bugbear', dg_cerberus: 'cerberus', ghoul: 'zombie', ungoliant: 'shelob', spartoi: 'skeleton_archer', necromancer: 'orc_wizard', kaspar: 'orc_wizard', merkyor: 'orc_wizard', balthazar: 'orc_wizard', sema: 'orc_wizard', deathknight: 'baphomet' };
  return (kind, type, vol = 0.55) => { kind = AL[kind] || kind; if (!has.has(kind) || !AC) return false; if (!SFX_ON) return true; const k = kind + '_' + type; let base = pool[k];
    if (!base) { base = pool[k] = new Audio('assets/sound/sfx/' + k + '.mp3'); base.preload = 'auto'; }
    const a = base.cloneNode(); a.volume = Math.min(1, vol * SND.sfxK()); a.play().catch(() => {}); return true; }; })();
// ---------- entities ----------
function mk(kind,i,j){ return {kind,i,j,fi:i,fj:j,t:1,x:i+0.5,z:j+0.5,row:0,dist:0,hp:kind==='fox'?10:100,max:kind==='fox'?10:100,atk:null,cool:0,target:null,flash:0,dead:false,deadT:0,aggro:false,wander:Math.random()*3,hi:i,hj:j}; }
const hero = mk('hero', META.spawn[0], META.spawn[1]); hero.row = 1;
let foxes = []; const FIELD_FOXES = foxes;
let PETS_HERE = [];   // 지금 지역에 나와 있는 내 펫 (PET 모듈이 매 프레임 갱신)
let PEER_OCC = null;   // 다른 플레이어가 서 있는 칸 (NET 이 채움)
function occ(i,j){ if (hero.i===i&&hero.j===j) return hero; for (const f of foxes) if (!f.dead&&f.i===i&&f.j===j) return f; for (const p of PETS_HERE) if (!p.dead&&p.i===i&&p.j===j) return p; if (PEER_OCC) { const o=PEER_OCC(i,j); if (o) return o; } return null; }
function freeTile(minD){ for (let t=0;t<400;t++){ const i=2+Math.floor(Math.random()*(MAP-4)), j=2+Math.floor(Math.random()*(MAP-4)); if (walkable(i,j)&&!occ(i,j)&&Math.max(Math.abs(i-hero.i),Math.abs(j-hero.j))>=minD) return [i,j]; } return [3,3]; }
for (let k=0;k<7;k++){ const [i,j]=freeTile(5); foxes.push(mk('fox',i,j)); }
const DIRS8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const cheb=(a,b,c,d)=>Math.max(Math.abs(a-c),Math.abs(b-d));
function astar(e, goal, ti, tj){
  const N=MAP, g=new Float32Array(N*N).fill(1e9), came=new Int32Array(N*N).fill(-1), closed=new Uint8Array(N*N), s=e.j*N+e.i; g[s]=0; const open=[s]; let best=s,bh=1e9,n=0;
  while (open.length&&n++<700){ let bi=0,bf=1e9; for (let q=0;q<open.length;q++){ const k=open[q], f=g[k]+cheb(k%N,(k/N)|0,ti,tj); if (f<bf){bf=f;bi=q;} }
    const k=open.splice(bi,1)[0]; if (closed[k]) continue; closed[k]=1; const i=k%N, j=(k/N)|0;
    if (goal(i,j)){ best=k; break; } const h=cheb(i,j,ti,tj); if (h<bh){bh=h;best=k;}
    for (const [di,dj] of DIRS8){ const ni=i+di, nj=j+dj; if (!walkable(ni,nj)) continue; if (di&&dj&&(!walkable(i+di,j)||!walkable(i,j+dj))) continue;
      const o=occ(ni,nj); if (o&&o!==e&&!(e===hero&&o.isPet)&&cheb(ni,nj,e.i,e.j)<=2) continue; const nk=nj*N+ni, ng=g[k]+(di&&dj?1.001:1); if (ng<g[nk]){ g[nk]=ng; came[nk]=k; open.push(nk); } } }
  const path=[]; let k=best; while (k!==s&&k!==-1){ path.unshift([k%N,(k/N)|0]); k=came[k]; } return path; }
function beginStep(e,[i,j]){ const di=i-e.i, dj=j-e.j; if (Math.abs(di)>1||Math.abs(dj)>1) return false; if (di&&dj&&(!walkable(e.i+di,e.j)||!walkable(e.i,e.j+dj))) return false;
  if (!walkable(i,j)) return false; const o=occ(i,j); if (o){ if (e===hero&&o.isPet&&o.t>=1){ o.fi=o.i; o.fj=o.j; o.i=e.i; o.j=e.j; o.t=0; o.row=rowFor(-di,-dj); } else return false; }   // 내 펫과는 자리를 바꿔 지나감
  e.fi=e.i; e.fj=e.j; e.i=i; e.j=j; e.t=0; e.row=rowFor(di,dj); return true; }
function stepMove(e,dt,sp){ if (e.t<1){ e.t=Math.min(1,e.t+sp*dt); e.dist+=sp*dt; } e.x=e.fi+0.5+(e.i-e.fi)*e.t; e.z=e.fj+0.5+(e.j-e.fj)*e.t; }
function face(e,t){ const di=Math.sign(t.i-e.i), dj=Math.sign(t.j-e.j); if (di||dj) e.row=rowFor(di,dj); }

// ---------- input ----------
const cv=document.getElementById('cv'), ctx=cv.getContext('2d'); let W=0,H=0,DPR=1;
const low=document.createElement('canvas'), lc=low.getContext('2d');
function resize(){ DPR=Math.min(2,devicePixelRatio||1); W=cv.clientWidth; H=cv.clientHeight; cv.width=W*DPR; cv.height=H*DPR; }
addEventListener('resize',resize); resize();
let curZ=2, zoom=2, zoomT=2, pixel=true, cam=W2P(hero.x,hero.z), moveGoal=null, holding=false, hover=null;
document.getElementById('px-on').onclick=()=>{ pixel=true; document.getElementById('px-on').setAttribute('aria-pressed',true); document.getElementById('px-off').setAttribute('aria-pressed',false); };
document.getElementById('px-off').onclick=()=>{ pixel=false; document.getElementById('px-on').setAttribute('aria-pressed',false); document.getElementById('px-off').setAttribute('aria-pressed',true); };
const toWorldPx=(sx,sy)=>[ (sx-W/2)/curZ+cam[0], (sy-H/2)/curZ+cam[1] ];
function pickFox(sx,sy){ const [px,py]=toWorldPx(sx,sy); let b=null,bd=-1; for (const f of foxes){ if (f.dead||!DN.seen(f.i,f.j)) continue; const S=MOB[f.kind], hw=S.hw||Math.round(14*S.sc+6), hh=S.hh||Math.round(62*S.sc); const [fx,fy]=W2P(f.x,f.z); if (px>fx-hw&&px<fx+hw&&py>fy-hh&&py<fy+8&&f.x+f.z>bd){ bd=f.x+f.z; b=f; } } return b; }
function P2Wh(px,py){ let [x,z]=P2W(px,py); for (let k=0;k<4;k++){ const h=hAt(x,z); [x,z]=P2W(px,py+h*VPXG); } return [x,z]; }
function pickTile(sx,sy){ const [x,z]=P2Wh(...toWorldPx(sx,sy)); return [Math.floor(x),Math.floor(z)]; }
cv.addEventListener('pointerdown',ev=>{ if (ev.button!==0) return; initAudio(); TOWN.unlockAudio(); cv.setPointerCapture(ev.pointerId); const r=cv.getBoundingClientRect(), sx=ev.clientX-r.left, sy=ev.clientY-r.top;
  { const lx=sx/curZ, ly=sy/curZ; if (STATRECT.some(([x,y,w,h])=>lx>=x&&lx<=x+w&&ly>=y&&ly<=y+h)){ const cw=document.getElementById('charwin'); if (cw) cw.hidden=false; INV.render(); return; } if (ZONERECT.some(([x,y,w,h])=>lx>=x&&lx<=x+w&&ly>=y&&ly<=y+h)){ const bm=document.getElementById('btn-map'); if (bm) bm.click(); return; } } if (sy > H - PH*curZ){ const lx=sx/curZ, ly=sy/curZ; { const hk=HOTRECT.findIndex(([x,y,w,h])=>lx>=x&&lx<=x+w&&ly>=y&&ly<=y+h); if (hk>=0){ INV.hotPick(hk); if (INV.hot(hk)){ hotDrag={k:hk,id:INV.hot(hk),sx:lx,sy:ly,mx:lx,my:ly,moved:false}; INV.holdHot(ev,hk); } return; } }
    const a=AUTORECT.find(([x,y,w,h])=>lx>=x&&lx<=x+w&&ly>=y&&ly<=y+h); if (a) INV.openAuto(); const hb=HUNTRECT.find(([x,y,w,h])=>lx>=x&&lx<=x+w&&ly>=y&&ly<=y+h); if (hb) { hb[4]==='toggle' ? AUTO.toggle() : AUTO.openSet(); } return; }
  { const lx=sx/curZ, ly=sy/curZ, pr=PETRECT.find(([x,y,w,h])=>lx>=x&&lx<=x+w&&ly>=y&&ly<=y+h); if (pr){ PET.openWin(pr[4].e); return; } }
  if (MM.click(sx/curZ, sy/curZ)) return;
  { const op=SCENE==='town'?NET.peerAt(sx,sy):null; if (op){ NET.openMenu(op, ev.clientX, ev.clientY); return; } }   // 다른 플레이어 클릭 → 파티 초대 메뉴 (마을에서만 · 필드는 오른쪽 클릭)
  if (SCENE==='town' && TOWN.click(sx,sy)) return;
  if (INV.targeting()) return;
  if (PET.click(sx,sy)) return;
  { const gd=GROUND.at(sx,sy); if (gd){ GROUND.go(gd); return; } }
  const f=pickFox(sx,sy); if (f){ hero.target=f; moveGoal=null; holding=false; return; } const t=pickTile(sx,sy); if (!walkable(...t)) return; hero.target=null; moveGoal=t; holding=true; mark={t,life:0.5}; });
cv.addEventListener('pointermove',ev=>{ const r=cv.getBoundingClientRect(), sx=ev.clientX-r.left, sy=ev.clientY-r.top;
  if (hotDrag){ hotDrag.mx=sx/curZ; hotDrag.my=sy/curZ; if (Math.hypot(hotDrag.mx-hotDrag.sx,hotDrag.my-hotDrag.sy)>4) hotDrag.moved=true; cv.style.cursor='grabbing'; return; } const gh=GROUND.hoverAt(sx,sy,ev.clientX,ev.clientY); const ph=gh?null:NET.peerAt(sx,sy); NET.setHover(ph); const phT=ph&&SCENE==='town'; hover=gh||phT?null:pickFox(sx,sy); const th=SCENE==='town'?TOWN.hoverAt(sx,sy):null; const zr=ZONERECT.some(([x,y,w,h])=>sx/curZ>=x&&sx/curZ<=x+w&&sy/curZ>=y&&sy/curZ<=y+h); cv.style.cursor=zr||gh||phT?'pointer':hover?SWORD_CUR:(th?'pointer':'default'); mouse=[sx,sy];
  if (holding){ const t=pickTile(sx,sy); if (walkable(...t)) moveGoal=t; } });
cv.addEventListener('pointerup',ev=>{ holding=false; if (!hotDrag) return; const D=hotDrag; hotDrag=null; cv.style.cursor='default'; if (!D.moved) return;
  const r=cv.getBoundingClientRect(), lx=(ev.clientX-r.left)/curZ, ly=(ev.clientY-r.top)/curZ, k2=HOTRECT.findIndex(([x,y,w,h])=>lx>=x&&lx<=x+w&&ly>=y&&ly<=y+h);
  if (k2>=0){ if (k2!==D.k) INV.hotSwap(D.k,k2); } else if (ev.clientY-r.top < H - PH*curZ) INV.hotClear(D.k); });   // 단축키 칸 끌어서 옮기기: 다른 칸에 놓으면 서로 바꿈, 화면 위쪽에 놓으면 등록 해제
let hotDrag=null;
// 몬스터 상태 아이콘 (선택하거나 마우스를 올린 몬스터 이름 위): 디버프 = 붉은 테 · 버프 = 초록 테 · 정보(속성·언데드) = 금색 테 · 아래 숫자 = 남은 초 · 아이콘에 마우스를 올리면 이름
function mobStatus(f){ const S=MOB[f.kind], L=[];
  if (S.el) L.push({ k:'el', n:`${ATTR_N[S.el]} 속성 (약점: ${ATTR_N[ATTR_OPP[S.el]]} 속성)`, ty:'info', el:S.el });
  if (S.undead) L.push({ k:'undead', n:'언데드 — 턴 언데드 가능 · 밤에 강해짐', ty:'info' });
  if (f.stunT>0) L.push({ k:'stun', n:'스턴 — 움직이지도 공격하지도 못함', t:f.stunT, ty:'de', ic:'sk_stun' });
  if (f.slowT>0) L.push({ k:'slow', n:'슬로우 — 이동·공격 1.3배 느림', t:f.slowT, ty:'de', ic:'sk_slow' });
  if (f.bleed) L.push({ k:'bleed', n:`출혈 — 초당 ${f.bleed.dps} 피해`, t:f.bleed.t, ty:'de' });
  if (f.hitDn>0) L.push({ k:'hitdn', n:`명중 저하 −${f.hitDnV||0}`, t:f.hitDn, ty:'de' });
  if (f.regenOn) L.push({ k:'regen', n:'체력 회복 중 — 2분 동안 아무도 때리지 않음', ty:'buf' });
  if (nightUp(S)) L.push({ k:'night', n:'밤의 힘 — 공격력 1.5배 · 명중 +10%', ty:'buf' });
  return L; }
function stGlyph(g, q, x, y){ g.save(); g.translate(x,y); g.textAlign='center'; g.textBaseline='middle';
  if (q.k==='el'){ g.fillStyle=ATTR_C[q.el]; g.beginPath(); g.moveTo(0,-4.6); g.lineTo(4.6,0); g.lineTo(0,4.6); g.lineTo(-4.6,0); g.closePath(); g.fill(); g.fillStyle='#120e08'; g.font='900 5.5px "Noto Sans KR",sans-serif'; g.fillText(ATTR_N[q.el][0],0,0.4); }
  else if (q.k==='undead'){ g.fillStyle='#ece6d6'; g.beginPath(); g.arc(0,-1,3.6,0,7); g.fill(); g.fillRect(-2.3,1.4,4.6,2.7); g.fillStyle='#120e08'; g.fillRect(-2.1,-1.8,1.6,1.7); g.fillRect(0.5,-1.8,1.6,1.7); g.fillRect(-0.4,2.1,0.8,1.8); }
  else if (q.k==='bleed'){ g.fillStyle='#ff4a4a'; g.beginPath(); g.moveTo(0,-4.6); g.bezierCurveTo(3.6,-0.4,3.6,4.2,0,4.2); g.bezierCurveTo(-3.6,4.2,-3.6,-0.4,0,-4.6); g.fill(); }
  else if (q.k==='hitdn'){ g.strokeStyle='#c9a0ff'; g.lineWidth=1.1; g.beginPath(); g.arc(0,-1.2,2.8,0,7); g.stroke(); g.fillStyle='#c9a0ff'; g.fillRect(-0.6,-1.8,1.2,1.2); g.beginPath(); g.moveTo(-2.6,2.2); g.lineTo(2.6,2.2); g.lineTo(0,4.8); g.closePath(); g.fill(); }
  else if (q.k==='regen'){ g.fillStyle='#6ae06a'; g.fillRect(-1.2,-4,2.4,8); g.fillRect(-4,-1.2,8,2.4); }
  else if (q.k==='night'){ g.fillStyle='#b8ccff'; g.beginPath(); g.arc(0,0,4,0,7); g.fill(); g.fillStyle='#0a0806'; g.beginPath(); g.arc(1.9,-1.3,3.3,0,7); g.fill(); }
  g.restore(); }
function drawMobStatus(g, f, cx, by){ const L=mobStatus(f); if (!L.length) return; const s=12, gap=2, w=L.length*(s+gap)-gap; let x=Math.round(cx-w/2); const y=Math.round(by-s);
  const mw=mouse?toWorldPx(mouse[0],mouse[1]):null; let tip=null;
  for (const q of L){ const bc=q.ty==='de'?'#ff6a5a':q.ty==='buf'?'#7be07b':'#d8c07a'; g.fillStyle='rgba(10,8,6,.9)'; g.fillRect(x,y,s,s);
    const im2=q.ic?iconImg(q.ic):null; if (im2&&im2.complete&&im2.naturalWidth){ g.save(); g.imageSmoothingEnabled=true; g.drawImage(im2,x+1,y+1,s-2,s-2); g.restore(); } else stGlyph(g,q,x+s/2,y+s/2);
    g.strokeStyle=bc; g.lineWidth=1; g.strokeRect(x+0.5,y+0.5,s-1,s-1);
    if (q.t>0){ const tt=String(Math.ceil(q.t)); g.font='800 7px "Noto Sans KR",sans-serif'; g.textAlign='center'; g.textBaseline='top'; g.fillStyle='#000'; g.fillText(tt,x+s/2+0.6,y+s+0.6); g.fillStyle='#fff'; g.fillText(tt,x+s/2,y+s); g.textBaseline='alphabetic'; }
    if (mw&&mw[0]>=x&&mw[0]<=x+s&&mw[1]>=y&&mw[1]<=y+s) tip=[q.n,x+s/2,y];
    x+=s+gap; }
  if (tip){ g.font='700 9px "Noto Sans KR",sans-serif'; const tw=Math.ceil(g.measureText(tip[0]).width)+10, tx=Math.round(tip[1]-tw/2), ty=tip[2]-16; g.fillStyle='rgba(16,12,8,.95)'; g.fillRect(tx,ty,tw,13); g.strokeStyle='#a8894c'; g.lineWidth=1; g.strokeRect(tx+0.5,ty+0.5,tw-1,12); g.fillStyle='#f2e6c8'; g.textAlign='center'; g.fillText(tip[0],tx+tw/2,ty+10); } }
// 단축 슬롯(F5~F12)에 마우스를 올리면: 이름 · 서클·MP (공격 마법은 지금 예상 피해) / 아이템은 보유 개수
function drawHotTip(g, vw){ if (!mouse||hotDrag) return; const mx=mouse[0]/curZ, my=mouse[1]/curZ, k=HOTRECT.findIndex(([x,y,w,h])=>mx>=x&&mx<=x+w&&my>=y&&my<=y+h); if (k<0) return; const id=INV.hot(k); if (!id) return;
  let t1, t2='', t3='', c1='#ffe9a0';
  if (id.startsWith('sk:')){ const sk=id.slice(3), q=SK[sk]; if (!q) return; t1=q.name; t2=(q.kind==='magic'?q.circle+'서클 마법':q.kind==='spirit'?'정령마법':'기술')+' · MP '+q.mp+(LEARNED.has(sk)?'':' · 아직 안 배움'); if (SPELL[sk]){ const [a,b]=spellRange(sk), T0=hero.target&&!hero.target.dead?hero.target:null, cp=Math.round(spellCritP(T0?MOB[T0.kind]:{lv:hero.lv})*100); t3='지금 예상 피해 '+a+'~'+b+(SPELL[sk].box?' (가로·세로 '+SPELL[sk].box*2+'칸 범위)':'')+' · 치명타 '+cp+'%'+(T0?' ('+MOB[T0.kind].name+')':''); } }
  else { const d=ITEMS[id]; if (!d) return; t1=d.name; c1=rarC(id); if (d.stack) t2='보유 '+(GOD_INF(id)?'∞':INV.count(id).toLocaleString())+'개'; }
  const F='"Noto Sans KR",sans-serif', [x,y,w]=HOTRECT[k]; g.save(); g.font='800 11px '+F; let bw=g.measureText(t1).width; g.font='600 9px '+F; bw=Math.max(bw,t2?g.measureText(t2).width:0,t3?g.measureText(t3).width:0); bw=Math.ceil(bw)+14;
  const bh=8+13+(t2?12:0)+(t3?12:0), bx=Math.max(4,Math.min(vw-bw-4,Math.round(x+w/2-bw/2))), by=y-bh-6;
  g.fillStyle='rgba(14,10,6,.96)'; g.fillRect(bx,by,bw,bh); g.strokeStyle='#c9a24a'; g.lineWidth=1; g.strokeRect(bx+0.5,by+0.5,bw-1,bh-1);
  g.textAlign='left'; g.textBaseline='top'; g.font='800 11px '+F; g.fillStyle=c1; g.fillText(t1,bx+7,by+5); let yy=by+19; g.font='600 9px '+F;
  if (t2){ g.fillStyle='#b8ae96'; g.fillText(t2,bx+7,yy); yy+=12; } if (t3){ g.fillStyle='#ffb27a'; g.fillText(t3,bx+7,yy); }
  g.restore(); }
function drawHotGhost(g){ const D=hotDrag, sw=HOTRECT[0]?HOTRECT[0][2]:30, k2=HOTRECT.findIndex(([x,y,w,h])=>D.mx>=x&&D.mx<=x+w&&D.my>=y&&D.my<=y+h);
  if (k2>=0){ const [x,y,w,h]=HOTRECT[k2]; g.save(); g.strokeStyle='#ffe08a'; g.lineWidth=2; g.shadowColor='#ffd86a'; g.shadowBlur=8; g.strokeRect(x+0.5,y-0.5,w,h); g.restore(); }
  const im2=D.id.startsWith('sk:')?iconImg('sk_'+D.id.slice(3)):iconImg(ITEMS[D.id].icon); g.save(); g.globalAlpha=0.8; g.imageSmoothingEnabled=true; if (im2.complete&&im2.naturalWidth) g.drawImage(im2,D.mx-sw/2,D.my-sw/2,sw,sw); g.restore();
  if (k2<0&&D.my<HOTRECT[0][1]-14){ g.save(); g.font='700 9px "Noto Sans KR",sans-serif'; g.textAlign='center'; g.fillStyle='#000'; g.fillText('놓으면 등록 해제',D.mx+1,D.my-sw/2-3); g.fillStyle='#f08a7a'; g.fillText('놓으면 등록 해제',D.mx,D.my-sw/2-4); g.restore(); } }
const SWORD_CUR = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M3 3 L7 3 L21 17 L17 21 L3 7 Z" fill="#e8edf2" stroke="#1e2226" stroke-width="1.4" stroke-linejoin="round"/><path d="M5 5 L19 19" stroke="#8a929c" stroke-width="1"/><path d="M15 23 L23 15 L25.5 17.5 L17.5 25.5 Z" fill="#e8b84a" stroke="#3a2408" stroke-width="1.2"/><path d="M21 21 L27.5 27.5" stroke="#4a2c14" stroke-width="3.4" stroke-linecap="round"/><circle cx="28.3" cy="28.3" r="2.2" fill="#e8b84a" stroke="#3a2408" stroke-width="1"/></svg>')}") 3 3, crosshair`;   // 몬스터 위: 칼 커서
cv.addEventListener('pointerleave',()=>{ mouse=null; GROUND.hoverAt(-1e4,-1e4,0,0); NET.setHover(null); });
cv.addEventListener('wheel',ev=>{ ev.preventDefault(); const r=cv.getBoundingClientRect(), lx=(ev.clientX-r.left)/curZ, ly=(ev.clientY-r.top)/curZ, [cx,cy,cw2,ch2]=CHATRECT;
  if (lx>=cx&&lx<=cx+cw2&&ly>=cy&&ly<=cy+ch2){ logScroll=Math.max(0,logScroll+(ev.deltaY>0?-1:1)); return; }   // 대화창 위: 기록 스크롤
  INV.hotMove(ev.deltaY>0?1:-1); },{passive:false});   // 휠: 단축키 칸 선택 (리니지식)
cv.addEventListener('auxclick',ev=>{ if (ev.button===1) ev.preventDefault(); });
cv.addEventListener('contextmenu',ev=>{ { const r0=cv.getBoundingClientRect(), op=NET.peerAt(ev.clientX-r0.left, ev.clientY-r0.top); if (op){ ev.preventDefault(); NET.openMenu(op, ev.clientX, ev.clientY); return; } }   // 다른 플레이어 오른쪽 클릭 → 메뉴 (어디서나)
  const r=cv.getBoundingClientRect(), lx=(ev.clientX-r.left)/curZ, ly=(ev.clientY-r.top)/curZ, hk=HOTRECT.findIndex(([x,y,w,h])=>lx>=x&&lx<=x+w&&ly>=y&&ly<=y+h); if (hk>=0){ ev.preventDefault(); INV.openHot(hk, ev.clientX, ev.clientY); } });   // 단축키 칸 오른쪽 클릭: 스킬·아이템 상세
cv.addEventListener('mousedown',ev=>{ if (ev.button===1){ ev.preventDefault(); initAudio(); const r=cv.getBoundingClientRect(), f=pickFox(ev.clientX-r.left, ev.clientY-r.top); INV.useHot(INV.hotSel(), f); } });   // 휠 클릭: 선택한 칸 사용 (마법이면 마우스가 가리킨 대상에게)   // 휠 클릭: 선택한 칸 사용
// 인벤토리 아이템을 단축키 칸으로 끌어다 놓기
cv.addEventListener('dragover',ev=>{ if (ev.dataTransfer.types.includes('text/plain')) ev.preventDefault(); });
cv.addEventListener('drop',ev=>{ ev.preventDefault(); const id=ev.dataTransfer.getData('text/plain'); const r=cv.getBoundingClientRect(), lx=(ev.clientX-r.left)/curZ, ly=(ev.clientY-r.top)/curZ;
  const a=AUTORECT.find(([x,y,w,h])=>lx>=x&&lx<=x+w&&ly>=y&&ly<=y+h); if (a&&ITEMS[id]){ INV.setAuto(a[4],id); return; } const k=HOTRECT.findIndex(([x,y,w,h])=>lx>=x&&lx<=x+w&&ly>=y&&ly<=y+h); if (k>=0&&(ITEMS[id]||(id.startsWith('sk:')&&SK[id.slice(3)]))) INV.setHot(k,id); });   // 줌 기능 잠시 끔 (카메라 배율 2 고정)
let mark=null, mouse=null;

// ---------- combat ----------
// 떠오르는 글자 (피해 숫자 · CRITICAL · MISS) + 크리티컬 섬광
const floats=[], bursts=[];
function floatText(x,y,text,o={}){ floats.push({x,y,text,t:0,life:o.life||0.9,color:o.color||'#fff',size:o.size||11,rise:o.rise||26,big:!!o.big,dx:(Math.random()-0.5)*8}); }
function headY(f){ const S=MOB[f.kind]; return (S.hh||Math.round(62*S.sc)); }
let hitstop=0, shake=0, hurt=0; const parts=[];
function heroHit(S, mode){ const st=INV.stat(), sb = mode==='bow' ? (st.dex>=16?0.05:0)+(st.dex>=18?0.05:0) : mode==='magic' ? 0.12+(st.int>=16?0.05:0)+(st.int>=18?0.05:0) : (st.str>=16?0.05:0)+(st.str>=18?0.05:0);
  return Math.max(0.2,Math.min(0.97, 0.6 + (BUFF.bounce>0&&!mode?0.15:0) + 0.05*(hero.lv-S.lv) + (10-(S.mac??10))*(mode==='magic'?-0.015:-0.03) + sb + INV.cx('hit')*0.03)); }
// 마법사 기본 공격(마력탄) 피해: 지능·SP·레벨
function magicDmg(){ const st=INV.stat(), sp=INV.sp(), ib=Math.max(0,Math.floor((st.int-12)/2)); return [1+ib+sp, 4+Math.floor(hero.lv/2)+ib+sp*2]; }
const heroRange = () => { if (CLASS==='elf'){ const w=INV.equipped('weapon'); return w&&ITEMS[w]&&ITEMS[w].wtype==='bow'?6:1; } return 1; };
const inRng = T => { const d=cheb(T.i,T.j,hero.i,hero.j); return d>=1&&d<=heroRange()&&(d<=1||DGLOS(hero,T)); };   // 던전: 벽 너머는 못 쏨
function heroAttack(T){ face(hero,T); const R=heroRange()>1; hero.atk={t:0,v:R||CLASS!=='knight'?'attack':(Math.random()<0.5?'attack':'attack2'),dur:(R?0.8:0.7)/GSPD,hit:false,f:T,rng:R}; hero.cool=(CLASS==='wizard'?1.15:R?1.0:0.9)/GSPD; if (!R) sfx.swing(); }
function heroRelease(f){   // 활시위를 놓는 순간 / 마력탄을 쏘는 순간 — 날아가 닿으면 판정
  if (CLASS==='elf'){ const W=INV.equipped('weapon'); if (!(W&&ITEMS[W]&&ITEMS[W].noArrow) && !INV.take('arrow',1)){ say('화살이 없습니다. 잡화상점에서 화살을 사 주세요.','#f08a7a'); hero.target=null; return; } }
  const mage=CLASS==='wizard', [x0,y0]=W2P(hero.x,hero.z), [x1,y1]=W2P(f.x,f.z), d=cheb(f.i,f.j,hero.i,hero.j);
  arrows.push({ pl:true, kind:mage?'bolt':'arrow', col:mage?['140,100,255','175,185,255','245,240,255']:null, x0:x0+(mage?6:0), y0:y0-(mage?64:42), x1, y1:y1-headY(f)*0.55, t:0, dur:(mage?0.16:0.1)+d*(mage?0.06:0.05), onHit:()=>{ if (!f.dead) strike(f, mage?'magic':'bow'); } });
  if (AC&&SFX_ON){ const t=AC.currentTime; if (mage){ tone(t,'sine',480,980,0.2,0.07); tone(t+0.02,'triangle',1460,1900,0.14,0.03); nz(t,0.22,2400,5200,0.05); } else if (!MSFX('elf','bow',0.6)) { tone(t,'triangle',230,140,0.14,0.09); nz(t,0.14,3000,6500,0.07); } } }
function strike(f, mode){ const S=MOB[f.kind]; breakInvis(); if (!GOD_OHK && Math.random()>heroHit(S, mode)){ const [mx,my]=W2P(f.x,f.z); floatText(mx+(Math.random()*18-9),my-headY(f)-12,'MISS',{color:'#c8d0d8',size:11}); f.aggro=true; if (f.grp) f.grp.forEach(m=>{ if (!m.dead) m.aggro=true; }); return; } const crit=Math.random()<0.12+INV.cx('crit')/100; const DR=mode==='magic'?magicDmg():INV.dmg(); let d=DR[0]+Math.floor(Math.random()*(DR[1]-DR[0]+1)); { const A=mode!=='magic'&&INV.wAttr(); if (A){ const am=attrMult(A.el,f); d=Math.max(1,d+ATTR_DMG[A.lv]*(am-1)); if (am===2&&Math.random()<0.35){ const [ax,ay]=W2P(f.x,f.z); floatText(ax+16,ay-headY(f)-22,'약점!',{color:ATTR_C[A.el],size:10}); } } } if (ISLE&&ISLE.def.sand) d+=INV.cx('sandDmg'); if (S.undead) d+=INV.cx('undeadDmg'); if (crit) d=Math.round(d*1.8); if (GOD_OHK) d=Math.max(d,f.hp);
  dmgMob(f, d); if (INV.blessHit()&&f.hp>0&&Math.random()<0.35){ const ex=1+Math.floor(Math.random()*2); dmgMob(f, ex); const [ex1,ey1]=W2P(f.x,f.z); floatText(ex1+10,ey1-headY(f)-18,'추가 타격 '+ex,{color:'#ffd86a',size:11}); } cxProcs(f);
  if (f.hp>0) MSFX(f.kind,'hit',0.5); f.flash=0.09; mobHitFx(f,crit); hero.lastHit=f; hero.lastHitT=time; if (f.tgt&&Math.random()<0.4) f.tgt=null; f.aggro=true; if (f.grp) f.grp.forEach(m=>{ if (!m.dead) m.aggro=true; }); hitstop=crit?0.12:0.07; if (crit) shake=0.18; if (mode==='bow') { if (!MSFX('elf','arrowhit',crit?0.75:0.6)) sfx.hit(crit); } else sfx.hit(crit);
  { const [fx,fy]=W2P(f.x,f.z), top=fy-headY(f)-4;
    if (crit){ floatText(fx,top-12,'CRITICAL!',{color:'#ffd24a',size:14,big:true,life:1.1,rise:30}); floatText(fx,top+4,String(d),{color:'#ff9a3a',size:16,big:true,life:1.0}); bursts.push({x:fx,y:fy-headY(f)*0.5,t:0}); }
    else floatText(fx+(Math.random()*18-9),top-8,String(d),{color:'#ffffff',size:12}); }
  const [x,y]=W2P(f.x,f.z), hy=(S.hh||62*S.sc)*0.45; for (let k=0;k<(crit?16:9);k++){ const a=Math.random()*6.28, s=60+Math.random()*90; parts.push({x,y:y-hy,vx:Math.cos(a)*s,vy:Math.sin(a)*s*0.6-30,life:0.3,max:0.3,crit}); }
  killCheck(f); }
// ===== 강화 결과 대형 연출: 캐릭터를 중심으로 빛줄기·충격파·반짝이·화면 번쩍임 + 큰 결과 글씨 (화면 좌표로 그림)
const BIGFX = [];
function bigFx(kind, text) { BIGFX.push({ kind, text, t0: time, life: kind === 'boom' ? 2.1 : 1.9, seed: Math.random() * 1000 }); if (kind === 'boom') shake = Math.max(shake, 0.7); else if (kind !== 'fail') shake = Math.max(shake, 0.12); }
function enchSfx(kind) { if (!AC || !SFX_ON) return; const t = AC.currentTime; nz(t, 0.55, kind === 'boom' ? 300 : 500, kind === 'boom' ? 2000 : 5000, kind === 'fail' ? 0.08 : 0.18);   // 휙(whoosh)
  if (kind === 'ok' || kind === 'bless') { tone(t + 0.12, 'sine', 2093, 2100, 0.9, 0.05); tone(t + 0.2, 'triangle', 2637, 2640, 0.8, 0.04); } if (kind === 'boom') { nz(t + 0.02, 0.05, 9000, 4000, 0.5); tone(t, 'square', 2400, 800, 0.08, 0.06); } }
const FXC = { ok: ['200,235,255', '110,180,255'], bless: ['255,224,140', '140,200,255'], earth: ['255,190,100', '140,90,40'], fail: ['200,195,185', '120,115,110'], boom: ['255,90,50', '40,8,4'], curse: ['205,130,255', '70,10,100'] };
function drawBigFx(g, vw, vh, ox, oy) { if (!BIGFX.length) return; const [hx, hy] = W2P(hero.x, hero.z), cx = hx + ox, cy = hy + oy - 46, R = Math.max(vw, vh) * 0.62;
  for (let n = BIGFX.length - 1; n >= 0; n--) { const f = BIGFX[n], tt = time - f.t0, k = tt / f.life; if (k >= 1) { BIGFX.splice(n, 1); continue; } const [c1, c2] = FXC[f.kind] || FXC.ok, a = 1 - k, rnd = q => { const x = Math.sin(f.seed + q * 12.9898) * 43758.5453; return x - Math.floor(x); };
    g.save();
    if (k < 0.3) { g.globalCompositeOperation = f.kind === 'boom' || f.kind === 'curse' ? 'source-over' : 'lighter'; g.fillStyle = `rgba(${f.kind === 'boom' ? '120,10,0' : c1},${(0.3 - k) * (f.kind === 'boom' ? 1.6 : 1.2)})`; g.fillRect(0, 0, vw, vh); }
    g.globalCompositeOperation = 'lighter';
    if (f.kind !== 'fail') { const L = R * Math.min(1, k * 3.2), rot = tt * 0.7, nr = f.kind === 'bless' ? 24 : 18; for (let q = 0; q < nr; q++) { const an = q * 6.283 / nr + rot, w = 0.05 + 0.03 * rnd(q), col = f.kind === 'bless' && q % 2 ? c2 : c1;
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, L); gr.addColorStop(0, `rgba(${col},${0.55 * a})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(an - w) * L, cy + Math.sin(an - w) * L * 0.8); g.lineTo(cx + Math.cos(an + w) * L, cy + Math.sin(an + w) * L * 0.8); g.closePath(); g.fill(); } }
    for (let q = 0; q < 3; q++) { const kk = (tt - q * 0.13) / 0.9; if (kk <= 0 || kk >= 1) continue; const rr = 12 + kk * R * 0.9; g.strokeStyle = `rgba(${q === 1 ? c2 : c1},${(1 - kk) * 0.9})`; g.lineWidth = 5 * (1 - kk) + 1; g.beginPath(); g.ellipse(cx, cy + 30, rr, rr * 0.5, 0, 0, 7); g.stroke(); }
    if (k < 0.4) { const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 60 + k * 120); gr.addColorStop(0, `rgba(255,255,255,${(0.4 - k) * 2.2})`); gr.addColorStop(0.35, `rgba(${c1},${(0.4 - k) * 1.6})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 60 + k * 120, 0, 7); g.fill(); }
    const grav = f.kind === 'earth' || f.kind === 'boom' ? 260 : 30;
    for (let q = 0; q < 80; q++) { const an = rnd(q) * 6.283, sp = 60 + rnd(q + 99) * 260, px = cx + Math.cos(an) * sp * tt, py = cy + Math.sin(an) * sp * tt * 0.7 + grav * tt * tt - 40 * tt; if (px < -10 || px > vw + 10 || py < -10 || py > vh + 10) continue;
      g.globalAlpha = a * (0.5 + 0.5 * rnd(q + 7)); g.fillStyle = q % 4 === 0 ? '#ffffff' : `rgb(${q % 3 ? c1 : c2})`; const sz = 1.5 + rnd(q + 3) * 2.5; g.fillRect(px - sz / 2, py - sz / 2, sz, sz); }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    if (f.kind === 'earth' || f.kind === 'boom') for (let q = 0; q < 18; q++) { const an = rnd(q + 50) * 6.283, sp = 90 + rnd(q + 60) * 220, px = cx + Math.cos(an) * sp * tt, py = cy + Math.sin(an) * sp * tt * 0.7 + 320 * tt * tt - 60 * tt, s_ = 4 + rnd(q + 70) * 6, r_ = tt * (4 + rnd(q) * 6);
      g.save(); g.translate(px, py); g.rotate(r_); g.globalAlpha = a; g.fillStyle = f.kind === 'boom' ? (q % 2 ? '#2a0806' : '#c83a20') : (q % 2 ? '#7a5230' : '#b88a50'); g.beginPath(); g.moveTo(-s_, -s_ * 0.6); g.lineTo(s_, -s_ * 0.2); g.lineTo(s_ * 0.3, s_); g.closePath(); g.fill(); g.restore(); }
    if (f.kind === 'fail' || f.kind === 'boom' || f.kind === 'curse') for (let q = 0; q < 14; q++) { const an = rnd(q + 30) * 6.283, d = 10 + tt * (40 + rnd(q + 31) * 70), px = cx + Math.cos(an) * d, py = cy + Math.sin(an) * d * 0.6 - tt * 40;
      g.globalAlpha = a * 0.55; g.fillStyle = f.kind === 'boom' ? (q % 2 ? '#1a0604' : '#5a1208') : f.kind === 'curse' ? '#3a1050' : '#8a867c'; g.beginPath(); g.arc(px, py, 8 + tt * 22, 0, 7); g.fill(); }
    g.globalAlpha = 1;
    if (f.text) { const pop = tt < 0.25 ? 0.5 + 2.4 * (tt / 0.25) * (1 - tt / 0.25) + 0.5 * (tt / 0.25) : 1, ty = cy - 70 - Math.min(1, tt / 1.2) * 26; g.translate(cx, ty); g.scale(pop, pop); g.globalAlpha = Math.min(1, (1 - k) * 2.5);
      g.font = '900 26px "Noto Serif KR","Nanum Myeongjo","Noto Sans KR",serif'; g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.9)'; g.strokeText(f.text, 0, 0);
      const tg = g.createLinearGradient(0, -22, 0, 4); const cc = { ok: ['#ffffff', '#8ad0ff'], bless: ['#fff6c8', '#ffc84a'], earth: ['#fff0c8', '#e0a050'], fail: ['#e8e4dc', '#9a968c'], boom: ['#ffd0c0', '#ff4a30'], curse: ['#f0d8ff', '#b060f0'] }[f.kind] || ['#fff', '#ccc'];
      tg.addColorStop(0, cc[0]); tg.addColorStop(1, cc[1]); g.fillStyle = tg; g.fillText(f.text, 0, 0); }
    g.restore(); } }
// 경험치는 각자 가한 피해만큼 나눠 먹음 (나 vs 펫, 넘친 피해는 안 셈)
function addDmg(f, who, d){ if (!f||d<=0) return; f.lastDmgAt=Date.now(); f.regenAt=0; f.regenOn=false; (f.dmgBy||(f.dmgBy=new Map())).set(who,(f.dmgBy.get(who)||0)+d); }
function shareExp(f, S){ const M=f.dmgBy; let tot=0; if (M) for (const v of M.values()) tot+=v; const hd=M?(M.get(hero)||0):0; const heroExp=tot>0?Math.round(S.exp*hd/tot):S.exp; const parts=[];
  if (heroExp>0){ gainExp(heroExp); parts.push('나 +'+heroExp); }
  if (M&&tot>0) for (const [w,v] of M) if (w!==hero&&w.isPet){ const pe=Math.round(S.exp*v/tot); if (pe>0){ PET.gainExp(w,pe); parts.push(w.d.name+' +'+pe); } }
  if (parts.length) say('경험치 '+parts.join(' · '),'#d8e8a8'); f.dmgBy=null; }
function killCheck(f){ const S=MOB[f.kind]; if (f.hp<=0&&!f.dead){ f.dead=true; TELE.kill(f.kind); f.deadT=0; f.stunT=0; f.bleed=null; f.hitDn=0; if (!MSFX(f.kind,'death',0.6)) sfx.die(); if (hero.target===f) hero.target=null; if (S.boss) say(S.name+'을(를) 쓰러뜨렸습니다.');
  const D=NET.distribute(f,S); if (!D){ shareExp(f,S); const c=rint(S.coin); coins+=c; say('골드('+c+') 획득: '+S.name, '#cfe4a8'); }   // 같은 지역에 다른 플레이어가 있으면 공헌도대로 나눔
  GROUND.capStart(); if (S.boss) { GROUND.bossLoot(f); if (f.summoned) say('갓 모드: 소환한 '+S.name+'을(를) 쓰러뜨렸습니다. (보스 등장 시간에는 영향 없음)', '#ffd86a'); else ISLAND.bossDown(f.kind, D ? NET.nameOf([...D.shares.entries()].sort((a,b)=>b[1]-a[1])[0][0]) : PNAME()); } else { let got=false; if (MOB_DROPS[f.kind]) for (const [id,pr] of MOB_DROPS[f.kind]) if (Math.random()<pr){ GROUND.drop(id,1,f.i,f.j); const D_=ITEMS[id]; if (!lowRar(id)) say(`${rarTag(id)}${JOSA(D_.name,'이','가')} 떨어졌습니다!`, rarC(id)); got=true; break; } if (!got) got=regionDrop(f); if (!got) cxZoneDrop(f); }
  const items=GROUND.capEnd(); if (D) NET.assignLoot(items, D.shares); } }   // 드랍 우선권: 공헌도 비율만큼 아이템 개수 · 5초
function dmgMob(f, d, who){ if (NET.guestMob(f)) { NET.hit(f, d); f.hp=Math.max(1, f.hp-d); return; } addDmg(f, who||hero, Math.min(d, Math.max(0,f.hp))); f.hp-=d; }
function mobHurt(f,d,color,src,crit){ if (!f||f.dead) return; if (!src||src===hero) breakInvis(); dmgMob(f, d, src||hero); f.flash=0.09; mobHitFx(f,!!crit); f.aggro=true; if (f.grp) f.grp.forEach(m=>{ if (!m.dead) m.aggro=true; }); const [fx,fy]=W2P(f.x,f.z);
  if (crit){ floatText(fx,fy-headY(f)-20,'CRITICAL!',{color:'#ff8ae0',size:14,big:true,life:1.15,rise:32}); floatText(fx,fy-headY(f)-2,String(d),{color:'#ffd6f6',size:17,big:true,life:1.05}); bursts.push({x:fx,y:fy-headY(f)*0.5,t:0}); shake=Math.max(shake,0.16); if (AC&&SFX_ON){ const t=AC.currentTime; tone(t,'triangle',1760,2640,0.18,0.06); tone(t+0.05,'sine',2640,3520,0.22,0.05); } }   // 마법 치명타: 분홍빛 큰 글씨
  else floatText(fx,fy-headY(f)-4,String(d),{color:color||'#ffffff',size:12}); if (f.hp>0) MSFX(f.kind,'hit',0.4); killCheck(f); }
// 가속: 1단(초록 물약) 1.2배, 2단(용기의 물약) 1.4배 — 이동·공격·마법 시전 속도 모두. 두 개 함께면 1.2×1.4배
const GSPD = 0.7;   // 기본 속도 배율 (이동·공격 30% 느리게)
const BUFF = { haste1: 0, haste2: 0, root: 0, slow: 0, poison: 0, reduction: 0, bounce: 0, solid: 0, counter: 0, shieldm: 0, light: 0, enchant: 0, mana: 0, rmagic: 0, relem: 0, cmind: 0, decwt: 0, medit: 0, counterm: 0, immune: 0 };
const BUFF_DEF = { haste1: { name: '1단 가속 (초록 물약)', desc: '이동·공격·마법 시전 속도 1.2배', icon: 'pot_gr', dur: 600, c: '#a8f08a' },
                   haste2: { name: '2단 가속 (용기의 물약)', desc: '이동·공격·마법 시전 속도 1.4배', icon: 'pot_br', dur: 600, c: '#f2c060' },
                   mana: { name: '마나 회복 (마나 회복 물약)', desc: 'MP 자연 회복 초당 +0.5', icon: 'pot_bl', dur: 600, c: '#8ab8ff' },
                   root: { name: '거미줄 속박', desc: '움직일 수 없음 (공격은 가능)', icon: 'web', dur: 2.5, c: '#ff7a6a', bad: true },
                   slow: { name: '거미줄 둔화', desc: '이동·공격 속도 40% 감소', icon: 'web', dur: 3, c: '#c9a0ff', bad: true },
                   reduction: { name: '리덕션 아머', desc: '받는 모든 피해 25% 감소', icon: 'sk_reduction', dur: 180, c: '#8ab0d8' },
                   bounce: { name: '바운스 어택', desc: '근거리 명중률 +15%', icon: 'sk_bounce', dur: 180, c: '#f0c060' },
                   solid: { name: '솔리드 캐리지', desc: '원거리 공격 회피 +25%', icon: 'sk_solid', dur: 180, c: '#c0c8d0' },
                   counter: { name: '카운터 배리어', desc: '받은 피해의 30%를 공격자에게 되돌림', icon: 'sk_counter', dur: 120, c: '#e07070' },
                   shieldm: { name: '실드', desc: '방어 AC -2', icon: 'sk_shieldm', dur: 600, c: '#9fb8ff' },
                   light: { name: '양초', desc: '밤 시야가 넓어짐', icon: 'candle', dur: 600, c: '#fff2a0' },
                   enchant: { name: '인챈트 웨폰', desc: '공격력 +1', icon: 'sk_enchant', dur: 300, c: '#a0e0ff' },
                   rmagic: { name: '레지스트 매직', desc: '마법 방어 MR +10', icon: 'sk_resist_magic', dur: 600, c: '#8ae0a8' },
                   relem: { name: '레지스트 엘리멘탈', desc: '모든 속성 저항 +10', icon: 'sk_resist_elem', dur: 600, c: '#c0c8e0' },
                   cmind: { name: '클리어 마인드', desc: 'MP 자연 회복 초당 +0.4', icon: 'sk_clear_mind', dur: 600, c: '#d0b8f0' },
                   decwt: { name: '디크리즈 웨이트', desc: '가방 무게 10% 가볍게', icon: 'sk_decwt', dur: 600, c: '#e8d8a0' },
                   medit: { name: '메디테이션', desc: 'MP 회복 초당 +0.5 (가만히 있으면 2배)', icon: 'sk_medit', dur: 600, c: '#a8c0ff' },
                   poison: { name: '독', desc: '초당 최대 HP 1.5% 피해 (큐어 포이즌·해독제로 치료)', icon: 'poison', dur: 5, c: '#8ae05a', bad: true },
                   counterm: { name: '카운터 매직', desc: '받는 마법 공격 1회 무효', icon: 'sk_counterm', dur: 600, c: '#d8a8ff' },
                   immune: { name: '이뮨 투 함', desc: '받는 모든 피해 30% 감소', icon: 'sk_immune', dur: 20, c: '#ffe08a' } };
const BUFFRECT = [], PETRECT = [];
const heroSpd = () => (BUFF.haste1 > 0 ? 1.2 : 1) * (BUFF.haste2 > 0 ? 1.4 : 1) * (BUFF.slow > 0 ? 0.6 : 1);
function buffTick(dt){ for (const k in BUFF) if (BUFF[k] > 0){ BUFF[k] -= dt; if (BUFF[k] <= 0 && !BUFF_DEF[k].bad && !k.startsWith('haste')){ BUFF[k] = 0; say(`${BUFF_DEF[k].name} 효과가 끝났습니다.`, '#9c9682'); continue; } if (BUFF[k] <= 0 && !BUFF_DEF[k].bad){ BUFF[k] = 0; say(k === 'haste1' ? '1단 가속(초록 물약) 효과가 끝났습니다.' : '2단 가속(용기의 물약) 효과가 끝났습니다.', '#9c9682'); } } }
// 가방 무게: 80% 이상이면 이동 20% 느림, 100% 이상이면 절반 — 넘을 때 경고, 내려가면 알림
let heavyLv = -1;
const heavyK = () => heavyLv === 2 ? 0.5 : heavyLv === 1 ? 0.8 : 1;
function heavyCheck() { const wp = INV.wPct(), lv = wp >= 1 ? 2 : wp >= 0.8 ? 1 : 0; if (lv === heavyLv) return; const first = heavyLv < 0, up = lv > heavyLv; heavyLv = lv; if (first && !lv) return; const pc = Math.floor(wp * 100);
  if (up) { say(lv === 2 ? `가방이 너무 무겁습니다! 이동 속도가 절반으로 느려졌습니다. (무게 ${pc}% · 물건을 팔거나 창고에 맡기세요)` : `가방이 무겁습니다! 이동 속도가 느려졌습니다. (무게 ${pc}% · 80% 이상이면 20% 느려짐)`, '#ff7a5a'); const [hx, hy] = W2P(hero.x, hero.z); floatText(hx, hy - 112, lv === 2 ? '가방이 너무 무겁습니다!' : '가방이 무겁습니다!', { color: '#ff7a5a', size: 14, big: true, life: 2, rise: 22 }); if (AC && SFX_ON) tone(AC.currentTime, 'square', 330, 220, 0.25, 0.05); }
  else say(lv === 1 ? `아직 가방이 무겁습니다. (무게 ${pc}% · 이동 20% 느림)` : `가방이 가벼워져 이동 속도가 돌아왔습니다. (무게 ${pc}%)`, '#9fd08a'); }
function updateHero(dt){
  if (BUFF.poison>0){ hero.psnAcc=(hero.psnAcc||0)+dt; if (hero.psnAcc>=1){ hero.psnAcc=0; if (!GOD_INV&&hero.hp>1){ const pd=Math.min(hero.hp-1, Math.max(1, Math.ceil(hero.max*0.015))); hero.hp-=pd; const [hx,hy]=W2P(hero.x,hero.z); floatText(hx+10,hy-92,String(pd),{color:'#8ae05a',size:11}); mxP(hx+mxR(-10,10),hy-mxR(20,60),{k:'bubble',c:'140,230,90',s:mxR(2,3.5),vy:-mxR(20,40),life:0.8}); } } }   // 독: 초당 최대 HP 1.5% (죽지는 않음)
  if (hero.burnT>0){ hero.burnT-=dt; hero.burnAcc=(hero.burnAcc||0)+dt; if (hero.burnAcc>=1){ hero.burnAcc=0; if (!GOD_INV&&hero.hp>1){ hero.hp-=1; const [hx,hy]=W2P(hero.x,hero.z); floatText(hx,hy-96,'1',{color:'#ff9a3a',size:11}); } } }
  const sp=heroSpd(), AS=sp*(1+INV.cx('atkSpd')/100); buffTick(dt); if (GOD_MP) hero.mp=hero.maxmp; hero.cool=Math.max(0,hero.cool-dt*AS); hurt=Math.max(0,hurt-dt); if (!foxes.some(f=>f.aggro&&!f.dead)) hero.hp=Math.min(hero.max,hero.hp+dt*(0.25+hero.lv*0.05)); hero.mp=Math.min(hero.maxmp,hero.mp+dt*(0.12+INV.stat().wis*0.01+INV.cx('mpRegen')*0.1+(BUFF.mana>0?0.5:0)+Math.max(BUFF.cmind>0?0.4:0, BUFF.medit>0?(hero.t>=1?1.0:0.5):0)));
  stepMove(hero,dt,3.2*GSPD*sp*(GOD_FAST?1.5:1)*(1+INV.cx('moveSpd')/100)*heavyK());
  if (hero.atk){ hero.atk.t+=dt*AS; if (!hero.atk.hit&&hero.atk.t>=hero.atk.dur*0.5){ hero.atk.hit=true; const f=hero.atk.f; if (f&&!f.dead){ if (hero.atk.rng){ if (cheb(f.i,f.j,hero.i,hero.j)<=heroRange()+1) heroRelease(f); } else if (cheb(f.i,f.j,hero.i,hero.j)===1) strike(f); } } if (hero.atk.t>=hero.atk.dur) hero.atk=null; return; }
  if (hero.t<1) return;
  if (BUFF.root>0){ const T=hero.target; if (T&&!T.dead&&inRng(T)){ face(hero,T); if (hero.cool<=0) heroAttack(T); } return; }
  const T=hero.target;
  if (T){ if (T.dead){ hero.target=null; return; } if (inRng(T)){ face(hero,T); if (hero.cool<=0) heroAttack(T); return; }
    const RR=heroRange(), p=MAZE()?mzPath(hero,T.i,T.j):astar(hero,(i,j)=>{ const d=cheb(i,j,T.i,T.j); return d>=1&&d<=RR; },T.i,T.j); if (p.length) beginStep(hero,p[0]); return; }
  if (moveGoal){ if (hero.i===moveGoal[0]&&hero.j===moveGoal[1]){ if (!holding) moveGoal=null; return; }
    const p=MAZE()?mzPath(hero,moveGoal[0],moveGoal[1]):astar(hero,(i,j)=>i===moveGoal[0]&&j===moveGoal[1],moveGoal[0],moveGoal[1]); if (!p.length||!beginStep(hero,p[0])){ if (!holding) moveGoal=null; } }
}
function updateFox(f,dt){
  if (NET.guestMob(f)) { NET.follow(f, dt); return; }
  if (f.hitT>0) f.hitT=Math.max(0,f.hitT-dt);
  const S=MOB[f.kind];
  if (f.dead){ f.deadT+=dt; if (S.boss||f.summoned){ if (f.deadT>(S.boss?3:1.6)) f.gone=true; return; }
    if (f.deadT>9){ const L=f.leader, c=L&&!L.dead?[L.i,L.j]:f.home; const p=(c&&spotNear(c[0],c[1],L?2:3))||freeTile(7);
      const keep={home:f.home,leader:f.leader,grp:f.grp,uid:f.uid}; Object.assign(f,mkMob(f.kind,p[0],p[1]),keep); if (f.home){ f.hi=f.home[0]; f.hj=f.home[1]; } } return; }
  if (S.boss && f.hp < f.max) { const now = Date.now(); if (!f.lastDmgAt) f.lastDmgAt = now;   // 보스: 2분 동안 아무도 못 때리면 체력 회복 — 초당 최대 HP의 2% (오래 비워 둔 지역이면 들어오자마자 그만큼 한꺼번에)
    if (now - f.lastDmgAt >= 120000) { const base = Math.max(f.lastDmgAt + 120000, f.regenAt || 0); f.hp = Math.min(f.max, f.hp + f.max * 0.02 * (now - base) / 1000); f.regenAt = now;
      if (!f.regenOn) { f.regenOn = true; if (foxes.includes(f)) say(`${JOSA(S.name, '이', '가')} 상처를 회복하기 시작합니다!`, '#ff9a7a'); }
      if (f.hp >= f.max) { f.hp = f.max; f.dmgBy = null; f.regenOn = false; f.regenAt = 0; } } }
  if (f.hitDn>0) f.hitDn-=dt;   // 혼돈의 활: 명중 저하 시간
  if (f.bleed){ const B=f.bleed; B.t-=dt; B.acc+=dt; if (B.acc>=1){ B.acc-=1; addDmg(f,hero,Math.min(B.dps,Math.max(0,f.hp))); f.hp-=B.dps; f.flash=0.06; f.aggro=true; const [bx,by]=W2P(f.x,f.z); floatText(bx+8,by-headY(f)-4,String(B.dps),{color:'#ff5a5a',size:11}); killCheck(f); if (f.dead) return; } if (B.t<=0) f.bleed=null; }   // 출혈 (초당 피해)
  if (f.slowT>0) f.slowT-=dt;
  if (f.stunT>0){ f.stunT-=dt; f.flash=Math.max(0,f.flash-dt); f.lunge=0; f.atkT=null; f.dingT=(f.dingT||0)-dt; if (f.dingT<=0&&f.stunT>0.05){ f.dingT=0.45; stunDing(f); } return; }
  f.flash=Math.max(0,f.flash-dt); f.cool=Math.max(0,f.cool-dt*(f.slowT>0?1/1.3:1)); if (f.atkT!=null){ f.atkT+=dt; if (f.atkT>=ATK_T) f.atkT=null; }
  stepMove(f,dt,(f.aggro?S.run:S.walk)*GSPD*(f.slowT>0?1/1.3:1));
  if (f.tgt && (f.tgt.dead || !(PETS_HERE.includes(f.tgt) || (f.tgt.isRemote && NET.alive(f.tgt))))) f.tgt=null;
  const TG=f.tgt||hero;   // 펫에게 어그로가 옮겨가면 펫을 노림
  if (f.lunge>0){ const was=f.lunge; f.lunge-=dt; const LT=f.lt||hero; if (was>0.15&&f.lunge<=0.15&&!(LT.dead)&&cheb(f.i,f.j,LT.i,LT.j)===1){ if (LT===hero){ f.hitMeT=time; if (!(BUFF.invis>0) && Math.random()<mobHit(S)-(f.hitDn>0?0.03*(f.hitDnV||2):0)){ hurtHero(mobDmg(S), f, 'melee'); if (S.poison&&!GOD_INV&&Math.random()<S.poison){ if (!(BUFF.poison>0)) say(JOSA(S.name,'에게','에게')+' 할퀴어 독에 걸렸습니다! (큐어 포이즌·해독제로 치료)','#9ae06a'); BUFF.poison=BUFF_DEF.poison.dur; } if (S.chill&&!GOD_INV&&Math.random()<S.chill){ BUFF.slow=Math.max(BUFF.slow,2.5); say('얼음 주먹에 맞아 몸이 얼어붙습니다!','#a8e8ff'); } if (S.web&&!GOD_INV&&Math.random()<S.web){ BUFF.slow=Math.max(BUFF.slow,2); say('끈적한 거미줄에 걸려 몸이 둔해집니다!','#c9a0ff'); } if (S.burn&&Math.random()<0.35*Math.max(0.2,1-elemRes('fire')/50)&&!GOD_INV){ hero.burnT=3; say(JOSA(S.name,'에게','에게')+' 물려 화상을 입었습니다!','#ff9a5a'); } } else heroMiss(); } else if (LT.isRemote) NET.hitRemote(LT, f, S); else PET.hurtBy(LT, f, S); } }
  if (S.boss && bossSkills(f,S,dt)) return;
  if (f.t<1) return;
  const dh=cheb(f.i,f.j,hero.i,hero.j), dt_=cheb(f.i,f.j,TG.i,TG.j);
  if (BUFF.invis>0 && f.aggro && !f.tgt) f.aggro=false;   // 투명: 나를 노리던 몬스터가 놓침
  if (!f.aggro && S.aggr && !(BUFF.invis>0) && dh>S.aggr){ const rp=NET.nearRemote(f, S.aggr); if (rp){ f.aggro=true; f.tgt=rp; } }
  if (!f.aggro && S.aggr && dh<=S.aggr && !(BUFF.invis>0) && DGLOS(f, hero)){ f.aggro=true; if (S.boss) say(JOSA(S.name,'이','가')+' 당신을 노려봅니다!','#ff8070'); }
  if (f.aggro){ if (dh>14 && !(f.tgt && f.tgt.isRemote && dt_<=14)){ f.aggro=false; f.tgt=null; return; }
    if (S.range && dt_>1 && dt_<=S.range && DGLOS(f, TG)){ face(f,TG); if (f.cool<=0){ f.cool=S.cd/GSPD; f.atkT=0; MSFX(f.kind,'attack',0.5); if (S.spell) mobCast(f,S,TG); else shoot(f,S,TG); } return; }
    if (dt_===1){ face(f,TG); if (f.cool<=0){ f.cool=S.cd/GSPD; f.lunge=0.3/GSPD; f.lt=TG; f.atkT=0; MSFX(f.kind,'attack',0.5); } return; }
    const p=MAZE()?mzPath(f,TG.i,TG.j):astar(f,(i,j)=>cheb(i,j,TG.i,TG.j)===1,TG.i,TG.j); if (p.length) beginStep(f,p[0]); return; }
  f.wander-=dt; if (f.wander<=0){ const L=f.leader&&!f.leader.dead?f.leader:null; f.wander=(L?0.8:1.5)+Math.random()*(L?1.5:3.5);
    const c=L?[L.i,L.j]:[f.hi,f.hj], r=L?2:4; let st=null;
    for (let k=0;k<4&&!st;k++){ const [di,dj]=DIRS8[Math.floor(Math.random()*8)]; if (cheb(f.i+di,f.j+dj,c[0],c[1])<=r) st=[di,dj]; }
    if (!st && L) st=[Math.sign(c[0]-f.i),Math.sign(c[1]-f.j)];
    if (st&&(st[0]||st[1])) beginStep(f,[f.i+st[0],f.j+st[1]]); }
}

// ============================================================ 보스 고유 스킬
// 셸로브: ① 거미줄 발사 — 한 명에게 거미줄을 쏴 잠시 이동 불가 ② 거미줄 뿌리기 — 바닥에 범위를 미리 보여 주고
// 잠시 뒤 떨어짐(후판정). 그 자리에 있으면 피해 + 둔화, 떨어진 거미줄 위를 밟으면 계속 느려짐 (시간이 지나면 사라짐)
const webShots = [], webZones = [];
// 범위 공격(미리 표시 → 후판정): 산성 웅덩이(계속 피해) · 땅 울림(한 번 큰 피해). 나와 펫 모두 맞음
const AOES = [];
const BOSS_MAGIC = 1.5;   // v102: 보스 마법(범위 기술) 피해 +50%
function aoeTick(dt) { for (let n = AOES.length - 1; n >= 0; n--) { const a = AOES[n]; a.t += dt; const inR = e => Math.hypot(e.x - a.x, e.z - a.z) <= a.r;
    if (!a.landed && a.t >= a.warn) { a.landed = true; const [ax, ay] = W2P(a.x, a.z); if (a.onLand) a.onLand(a);
      if (a.kind === 'mag') { if (AC && SFX_ON) { nz(AC.currentTime, 0.35, 1400, 400, 0.22); tone(AC.currentTime, 'sine', 220, 80, 0.35, 0.1); } }
      else if (a.kind === 'slam') { shake = Math.max(shake, 0.35); impact(ax, ay, 'quake', '#6a4a2a'); if (AC && SFX_ON) { nz(AC.currentTime, 0.5, 260, 60, 0.6); tone(AC.currentTime, 'sine', 90, 40, 0.5, 0.4); } }
      else { impact(ax, ay - 4, 'hit', '#9af06a'); if (AC && SFX_ON) { nz(AC.currentTime, 0.35, 1800, 600, 0.25); tone(AC.currentTime, 'sine', 300, 120, 0.3, 0.08); } }
      const g0 = a.grp ? AOES.filter(b => b.grp === a.grp) : [a], first = g0.every(b => b === a || !b.landed), hitAny = hero.hp > 0 && g0.some(b => Math.hypot(hero.x - b.x, hero.z - b.z) <= b.r);   // 산성 분사는 한 묶음으로 한 번만 판정
      if (a.fire) fireBurst(ax, ay - 10);
      if (first) { if (hitAny) { hurtHero(Math.round(rint(a.dmg) * BOSS_MAGIC)); if (a.slow && !GOD_INV) BUFF.slow = Math.max(BUFF.slow, a.slow); if (!a.quiet) say(a.msg ? a.msg[0] : a.kind === 'slam' ? '땅 울림에 휩쓸렸습니다!' : '산성액을 뒤집어썼습니다!', '#ff9a7a'); if (a.fire && !GOD_INV && Math.random() < 0.5 * Math.max(0.2, 1 - elemRes('fire') / 50)) { hero.burnT = 3; say('지옥불에 화상을 입었습니다!', '#ff9a5a'); } } else if (hero.hp > 0 && !a.quiet) say(a.msg ? a.msg[1] : a.kind === 'slam' ? '땅 울림을 피했습니다.' : '산성액을 피했습니다.', '#9fd0e8'); }
      for (const pt of PETS_HERE) if (!pt.dead && inR(pt)) PET.hurt(pt, Math.round(rint(a.dmg) * BOSS_MAGIC), null); }
    if (a.landed && a.dot && a.t < a.life) { if (a.dotSlow && hero.hp > 0 && inR(hero) && !GOD_INV) BUFF.slow = Math.max(BUFF.slow, 0.6); a.acc = (a.acc || 0) + dt; if (a.acc >= 1) { a.acc = 0; if (hero.hp > 0 && inR(hero)) hurtHero(Math.round(a.dot * BOSS_MAGIC)); for (const pt of PETS_HERE) if (!pt.dead && inR(pt)) PET.hurt(pt, Math.round(a.dot * BOSS_MAGIC), null); } }
    if (a.t >= a.life) AOES.splice(n, 1); }
  if (SCENE === 'town' && AOES.length) AOES.length = 0; }
function drawAoes(g) { for (const a of AOES) { const [x, y] = W2P(a.x, a.z), rx = a.r * K * 1.42, ry = rx * 0.5; g.save();
    if (!a.landed) { const k = Math.min(1, a.t / a.warn), col = a.c || (a.kind === 'slam' ? '255,90,60' : '150,240,90');
      g.fillStyle = `rgba(${col},${0.12 + 0.18 * k})`; g.beginPath(); g.ellipse(x, y, rx * k, ry * k, 0, 0, 7); g.fill();
      g.strokeStyle = `rgba(${col},.9)`; g.lineWidth = 1.6; g.setLineDash([6, 4]); g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.stroke(); }
    else if (a.kind === 'mag') { if (a.dot && a.t < a.life) { const fade = Math.min(1, (a.life - a.t) / 0.8); g.globalAlpha = 0.5 * fade; g.strokeStyle = `rgba(${a.c || '220,240,255'},.9)`; g.lineWidth = 1.5; g.setLineDash([5, 4]); g.lineDashOffset = -time * 20; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.stroke(); g.setLineDash([]); } }
    else if (a.kind === 'slam') { const k = Math.min(1, (a.t - a.warn) / 0.4); g.globalAlpha = 1 - k; g.strokeStyle = '#ffd0a0'; g.lineWidth = 3 * (1 - k) + 1; g.beginPath(); g.ellipse(x, y, rx * (0.6 + k * 0.6), ry * (0.6 + k * 0.6), 0, 0, 7); g.stroke(); }
    else { const fade = Math.min(1, (a.life - a.t) / 1.2), gr = g.createRadialGradient(x, y, 0, x, y, rx); gr.addColorStop(0, `rgba(150,230,60,${0.55 * fade})`); gr.addColorStop(0.7, `rgba(90,170,30,${0.4 * fade})`); gr.addColorStop(1, 'rgba(60,120,20,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(200,255,140,${0.6 * fade})`;
      for (let q = 0; q < 6; q++) { const ph = (q * 0.31 + a.t * 0.8) % 1, an = q * 2.3 + a.s; g.globalAlpha = Math.sin(ph * Math.PI); g.beginPath(); g.arc(x + Math.cos(an) * rx * 0.6, y + Math.sin(an) * ry * 0.6 - ph * 4, 1 + ph * 1.6, 0, 7); g.fill(); } }
    g.restore(); } }
let GOD = false, GOD_INV = false, GOD_OHK = false, GOD_FAST = false, GOD_MP = false;   // 데모 테스트용 갓 모드 (패널·무한 주문서·착용 제한 없음) · 무적 · 몹 한 방 · 빠른 이동은 패널에서 따로
const BOSS_SKILL = {
  shelob: [
    { id: 'webshot', cd: [8, 11], range: 7, cast: 0.6, use(f){ say('셸로브가 거미줄을 쏩니다!', '#ff9a8a'); const [x0,y0]=W2P(f.x,f.z); webShots.push({ x0, y0:y0-40, t:0, dur:0.12+cheb(f.i,f.j,hero.i,hero.j)*0.06 }); } },
    { id: 'webspray', cd: [12, 16], range: 9, cast: 0.8, use(f){ const r = 2.2; say('셸로브가 거미줄을 뿌리려 합니다! 붉은 범위를 피하세요!', '#ff7a6a');
        webZones.push({ x: hero.x, z: hero.z, r, warn: 1.6, t: 0, life: 9, landed: false }); } },
  ],
  // 거대 여왕개미: ① 산성 분사(앞으로 이어지는 초록 범위 → 산성 웅덩이) ② 일개미 소환 ③ 땅 울림(주변 붉은 원)
  queen_ant: [
    { id: 'acid', cd: [9, 12], range: 8, cast: 0.7, use(f){ say('거대 여왕개미가 산성액을 뿜으려 합니다! 초록 범위를 피하세요!', '#b8f08a'); const dx = hero.x - f.x, dz = hero.z - f.z, L = Math.hypot(dx, dz) || 1;
        const grp = Math.random(); for (let k = 1; k <= 3; k++) AOES.push({ grp, kind: 'acid', x: f.x + dx / L * k * 1.7, z: f.z + dz / L * k * 1.7, r: 0.9 + k * 0.35, warn: 1.2, t: 0, life: 7, landed: false, dmg: [5, 9], dot: 2, s: Math.random() * 6 }); } },
    { id: 'summon', cd: [16, 22], range: 10, cast: 1.0, use(f){ say('거대 여왕개미가 일개미를 부릅니다!', '#ffb07a'); let n = 0;
        for (let t = 0; t < 40 && n < 3 + (Math.random() < 0.5 ? 1 : 0); t++) { const i = f.i + Math.round((Math.random() * 2 - 1) * 3), j = f.j + Math.round((Math.random() * 2 - 1) * 3); if (!walkable(i, j) || occ(i, j)) continue;
          const m = mkMob('giant_ant', i, j); m.aggro = true; m.summoned = true; m.home = [i, j]; foxes.push(m); n++; const [mx, my] = W2P(i + 0.5, j + 0.5); impact(mx, my, 'quake', '#6a4a2a'); }
        if (AC && SFX_ON) tone(AC.currentTime, 'square', 700, 300, 0.3, 0.06); } },
    { id: 'slam', cd: [11, 15], range: 4, cast: 0.9, use(f){ say('거대 여왕개미가 땅을 울립니다! 붉은 원 밖으로 피하세요!', '#ff8a6a'); AOES.push({ kind: 'slam', x: f.x, z: f.z, r: 3.2, warn: 1.3, t: 0, life: 1.8, landed: false, dmg: [10, 16] }); } },
  ],
  // 오우거: ① 내려찍기(주변 큰 붉은 원) ② 바위 던지기(내 자리에 떨어짐) ③ 포효 — 아투바 오크 부하 2~3마리를 부름
  ogre: [
    { id: 'smash', cd: [10, 14], range: 4, cast: 1.0, use(f){ say('오우거가 몽둥이를 높이 치켜듭니다! 붉은 원 밖으로 피하세요!', '#ff8a6a'); AOES.push({ kind: 'slam', x: f.x, z: f.z, r: 3.6, warn: 1.3, t: 0, life: 1.8, landed: false, dmg: [16, 26] }); } },
    { id: 'boulder', cd: [8, 12], range: 9, cast: 0.8, use(f){ say('오우거가 바위를 집어 던집니다!', '#ff9a7a'); AOES.push({ kind: 'slam', x: hero.x, z: hero.z, r: 1.7, warn: 1.1, t: 0, life: 1.6, landed: false, dmg: [12, 20] }); } },
    { id: 'roar', cd: [20, 26], range: 10, cast: 1.1, use(f){ say('오우거가 포효합니다! 오크 부하들이 달려옵니다!', '#ffb07a'); shake = Math.max(shake, 0.4); let n = 0;
        for (let t = 0; t < 40 && n < 2 + (Math.random() < 0.5 ? 1 : 0); t++) { const i = f.i + Math.round((Math.random() * 2 - 1) * 3), j = f.j + Math.round((Math.random() * 2 - 1) * 3); if (!walkable(i, j) || occ(i, j)) continue;
          const m = mkMob('atuba_orc', i, j); m.aggro = true; m.summoned = true; m.home = [i, j]; foxes.push(m); n++; const [mx, my] = W2P(i + 0.5, j + 0.5); impact(mx, my, 'quake', '#4a3a2a'); }
        if (AC && SFX_ON) { const t0 = AC.currentTime; tone(t0, 'sawtooth', 90, 55, 0.9, 0.2); nz(t0, 0.8, 400, 120, 0.3); } } },
  ],
  // 바포메트: ① 대도끼 휘두르기(주변 큰 붉은 원) ② 지옥불(내 주변 불기둥 세 개, 화상) ③ 소환 — 버그베어·켈베로스 2~3마리 ④ 공포의 울부짖음(가까이 있으면 느려짐)
  baphomet: [
    { id: 'cleave', cd: [9, 13], range: 4, cast: 1.0, use(f){ say('바포메트가 거대한 도끼를 치켜듭니다! 붉은 원 밖으로 피하세요!', '#ff8a6a'); AOES.push({ kind: 'slam', x: f.x, z: f.z, r: 3.8, warn: 1.2, t: 0, life: 1.7, landed: false, dmg: [18, 30], msg: ['바포메트의 도끼에 휩쓸렸습니다!', '바포메트의 도끼를 피했습니다.'] }); } },
    { id: 'hellfire', cd: [7, 10], range: 9, cast: 0.8, use(f){ say('바포메트가 지옥불을 부릅니다! 붉은 원을 피하세요!', '#ff9a7a'); const grp = Math.random(), a0 = Math.random() * 6.283;
        for (let k = 0; k < 3; k++) { const rr = k ? 1.6 : 0, an = a0 + k * 2.1; AOES.push({ grp, kind: 'slam', fire: true, x: hero.x + Math.cos(an) * rr, z: hero.z + Math.sin(an) * rr, r: 1.4, warn: 1.1, t: 0, life: 1.6, landed: false, dmg: [12, 20], msg: ['지옥불에 휩싸였습니다!', '지옥불을 피했습니다.'] }); } } },
    { id: 'summon', cd: [18, 24], range: 10, cast: 1.1, use(f){ say('바포메트가 지옥의 하수인들을 부릅니다!', '#ffb07a'); shake = Math.max(shake, 0.4); let n = 0;
        for (let t = 0; t < 40 && n < 2 + (Math.random() < 0.5 ? 1 : 0); t++) { const i = f.i + Math.round((Math.random() * 2 - 1) * 3), j = f.j + Math.round((Math.random() * 2 - 1) * 3); if (!walkable(i, j) || occ(i, j)) continue;
          const m = mkMob(Math.random() < 0.5 ? 'bugbear' : 'cerberus', i, j); m.aggro = true; m.summoned = true; m.home = [i, j]; foxes.push(m); n++; const [mx, my] = W2P(i + 0.5, j + 0.5); impact(mx, my, 'bolt', '#ff4a2a'); }
        if (AC && SFX_ON) { const t0 = AC.currentTime; tone(t0, 'sawtooth', 70, 40, 1.0, 0.22); nz(t0, 0.9, 300, 90, 0.3); } } },
    { id: 'howl', cd: [22, 28], range: 7, cast: 0.9, use(f){ say('바포메트가 울부짖습니다! 공포에 질려 몸이 굳습니다!', '#c9a0ff'); shake = Math.max(shake, 0.3);
        if (hero.hp > 0 && cheb(f.i, f.j, hero.i, hero.j) <= 7 && !GOD_INV) BUFF.slow = Math.max(BUFF.slow, 4);
        if (AC && SFX_ON) { const t0 = AC.currentTime; tone(t0, 'sawtooth', 140, 60, 1.2, 0.2); tone(t0 + 0.1, 'square', 95, 50, 1.0, 0.08); } } },
  ],
  // 카스파 패밀리: 넷이 붙어 다니며 원소 마법 (기본 공격도 마법) · 각자 범위 마법 하나
  kaspar: [{ id: 'frost', cd: [9, 13], range: 8, cast: 0.9, use(f){ say('카스파가 얼음 폭풍을 부릅니다! 푸른 범위를 피하세요!', '#a8e8ff'); AOES.push({ kind: 'mag', c: '120,200,255', x: hero.x, z: hero.z, r: 1.9, warn: 1.1, t: 0, life: 1.4, landed: false, dmg: [13, 22], slow: 3, onLand: DG_LAND.frost, msg: ['얼음 기둥에 휩쓸렸습니다! 몸이 얼어붙습니다.', '얼음 폭풍을 피했습니다.'] }); } }],
  merkyor: [{ id: 'firerain', cd: [9, 13], range: 8, cast: 0.9, use(f){ say('메르키오르가 불비를 내립니다! 붉은 원을 피하세요!', '#ffab6a'); const grp = Math.random(), a0 = Math.random() * 6.283;
      for (let k = 0; k < 3; k++) { const rr = k ? 1.5 : 0, an = a0 + k * 2.1; AOES.push({ grp, kind: 'slam', fire: true, x: hero.x + Math.cos(an) * rr, z: hero.z + Math.sin(an) * rr, r: 1.3, warn: 1.1, t: 0, life: 1.5, landed: false, dmg: [11, 20], onLand: DG_LAND.fire, msg: ['불비에 맞았습니다!', '불비를 피했습니다.'] }); } } }],
  balthazar: [{ id: 'quake', cd: [10, 14], range: 8, cast: 1.0, use(f){ say('발터자르가 땅을 뒤흔듭니다! 갈색 범위를 피하세요!', '#e6bf80'); AOES.push({ kind: 'mag', c: '210,150,70', x: hero.x, z: hero.z, r: 2.2, warn: 1.2, t: 0, life: 1.5, landed: false, dmg: [15, 25], onLand: DG_LAND.quake, msg: ['솟구친 바위에 휩쓸렸습니다!', '지진을 피했습니다.'] }); } }],
  sema: [{ id: 'tempest', cd: [8, 12], range: 8, cast: 0.8, use(f){ say('세마가 회오리바람을 일으킵니다! 초록 범위를 피하세요!', '#b8f8dc'); AOES.push({ kind: 'mag', c: '140,240,190', x: hero.x, z: hero.z, r: 1.8, warn: 0.9, t: 0, life: 1.2, landed: false, dmg: [9, 17], slow: 3, onLand: DG_LAND.wind, msg: ['회오리에 휘말렸습니다! 몸이 둔해집니다.', '회오리를 피했습니다.'] }); } }],
  ice_queen: [
    { id: 'blizzard', cd: [13, 17], range: 8, cast: 1.2, use(f){ say('얼음여왕이 블리자드를 부릅니다! 하얀 범위 밖으로 피하세요!', '#c8f0ff'); AOES.push({ kind: 'mag', c: '210,240,255', x: hero.x, z: hero.z, r: 2.8, warn: 1.3, t: 0, life: 5.0, landed: false, dmg: [16, 26], dot: 5, dotSlow: true, slow: 3, onLand: DG_LAND.blizzard, msg: ['블리자드에 휩쓸렸습니다! 몸이 얼어붙습니다.', '블리자드를 피했습니다.'] }); } },
    { id: 'coc', cd: [8, 11], range: 8, cast: 0.9, use(f){ say('얼음여왕이 콘 오브 콜드를 씁니다!', '#a8e8ff'); AOES.push({ kind: 'mag', c: '120,200,255', x: hero.x, z: hero.z, r: 2.0, warn: 1.0, t: 0, life: 1.3, landed: false, dmg: [22, 34], slow: 3, onLand: DG_LAND.frost, msg: ['얼음 기둥에 꿰뚫렸습니다!', '얼음 기둥을 피했습니다.'] }); } },
    { id: 'golem', cd: [20, 26], range: 10, cast: 1.0, use(f){ const alive = foxes.filter(m => m.kind === 'ice_golem' && m.summoned && !m.dead).length; if (alive >= 3) return; say('얼음여왕이 아이스 골렘을 빚어냅니다!', '#c8f0ff'); let n = 0;
        for (let t = 0; t < 40 && n < Math.min(2, 3 - alive); t++) { const i = f.i + Math.round((Math.random() * 2 - 1) * 3), j = f.j + Math.round((Math.random() * 2 - 1) * 3); if (!walkable(i, j) || occ(i, j)) continue;
          const m = mkMob('ice_golem', i, j); m.aggro = true; m.summoned = true; m.home = [i, j]; foxes.push(m); n++; mxAdd('icespikes', m, { life: 0.9, sp: Array.from({ length: 5 }, (_, q) => ({ a: q * 1.25, d: q ? 16 : 0, h: q ? 30 : 50, w: q ? 7 : 11, dl: q * 0.04 })) }); mxAdd('ring', m, { gnd: 1, c: '210,245,255', r0: 6, r1: 50, w: 3, life: 0.6 }); } } },
  ],
  // 데스나이트: ① 헬파이어(주변 큰 붉은 원 → 지옥불 폭발, 화상) ② 스파토이 일으키기(최대 4마리) ③ 불검 휘두르기
  deathknight: [
    { id: 'hellfire', cd: [11, 15], range: 6, cast: 1.3, use(f){ say('데스나이트가 헬파이어를 일으킵니다! 붉은 원 밖으로 피하세요!', '#ff7a5a'); AOES.push({ kind: 'slam', fire: true, x: f.x, z: f.z, r: 3.6, warn: 1.5, t: 0, life: 2.0, landed: false, dmg: [22, 34], onLand: DG_LAND.hell, msg: ['헬파이어에 휩싸였습니다!', '헬파이어를 피했습니다.'] }); } },
    { id: 'raise', cd: [15, 20], range: 10, cast: 1.0, use(f){ const alive = foxes.filter(m => m.kind === 'spartoi' && m.summoned && !m.dead).length; if (alive >= 4) return; say('데스나이트가 땅속의 스파토이를 일으킵니다!', '#c9a0ff'); shake = Math.max(shake, 0.25); let n = 0;
        for (let t = 0; t < 40 && n < Math.min(2, 4 - alive); t++) { const i = f.i + Math.round((Math.random() * 2 - 1) * 3), j = f.j + Math.round((Math.random() * 2 - 1) * 3); if (!walkable(i, j) || occ(i, j)) continue;
          const m = mkMob('spartoi', i, j); m.aggro = true; m.summoned = true; m.home = [i, j]; foxes.push(m); n++; mxAdd('circle', m, { gnd: 1, sch: 'dark', r: 30, life: 1.1 }); mxAdd('pillar', m, { c: '150,70,255', l: '230,200,255', w: 22, life: 0.8 }); const [mx, my] = W2P(i + 0.5, j + 0.5); mxBurst(mx, my - 6, 12, () => ({ k: 'rock', c: '90,80,70', s: mxR(2, 4), g: 400, vr: mxR(-8, 8), life: mxR(0.6, 0.9), fl: my + 4 }), 40, 110, 140); }
        if (AC && SFX_ON) { const t0 = AC.currentTime; tone(t0, 'sawtooth', 110, 45, 0.9, 0.16); nz(t0, 0.7, 500, 120, 0.25); } } },
    { id: 'slash', cd: [7, 10], range: 3, cast: 0.8, use(f){ say('데스나이트가 불검을 크게 휘두릅니다! 붉은 원을 피하세요!', '#ff8a6a'); AOES.push({ kind: 'slam', fire: true, x: f.x, z: f.z, r: 2.3, warn: 0.9, t: 0, life: 1.3, landed: false, dmg: [18, 28], msg: ['불검에 베였습니다!', '불검을 피했습니다.'] }); } },
  ],
};
function bossSkills(f, S, dt){
  const list = BOSS_SKILL[f.kind]; if (!list || f.dead || !f.aggro) return false;
  f.sk = f.sk || {}; if (f.casting){ f.casting.t -= dt; face(f, hero); if (f.casting.t <= 0){ const k = f.casting.k; f.casting = null; k.use(f); } return true; }
  const dh = cheb(f.i, f.j, hero.i, hero.j);
  for (const k of list){ if (f.sk[k.id] == null) f.sk[k.id] = 2 + Math.random() * 3; f.sk[k.id] -= dt; }
  if (f.t < 1) return false;
  for (const k of list){ if (f.sk[k.id] <= 0 && dh <= k.range && hero.hp > 0 && SCENE !== 'town' && !(BUFF.invis > 0)){ f.sk[k.id] = k.cd[0] + Math.random() * (k.cd[1] - k.cd[0]); f.casting = { k, t: k.cast }; f.atkT = 0; MSFX(f.kind, 'attack', 0.6); return true; } }
  return false;
}
function skillTick(dt){
  for (let n = webShots.length - 1; n >= 0; n--){ const w = webShots[n]; w.t += dt; if (w.t >= w.dur){ webShots.splice(n, 1); { const [ix, iy] = W2P(hero.x, hero.z); impact(ix, iy - 40, 'hit', '#f0eef8'); }
      if (hero.hp > 0){ BUFF.root = BUFF_DEF.root.dur; hero.target = hero.target; moveGoal = null; say('거미줄에 묶여 움직일 수 없습니다!', '#ff7a6a'); const [hx,hy]=W2P(hero.x,hero.z); floatText(hx, hy-100, '속박!', { color:'#ffb0a0', size:12 }); if (AC) tone(AC.currentTime,'sawtooth',300,90,0.25,0.07); } } }
  let onWeb = false;
  for (let n = webZones.length - 1; n >= 0; n--){ const z = webZones[n]; z.t += dt;
    if (!z.landed && z.t >= z.warn){ z.landed = true; if (AC) tone(AC.currentTime,'triangle',160,60,0.3,0.08); shake = Math.max(shake, 0.12);
      if (Math.hypot(hero.x - z.x, hero.z - z.z) <= z.r){ hurtHero(Math.round((4 + Math.floor(Math.random()*5)) * BOSS_MAGIC)); BUFF.slow = Math.max(BUFF.slow, BUFF_DEF.slow.dur); say('거미줄에 맞았습니다! 움직임이 느려집니다.', '#c9a0ff'); }
      else say('거미줄을 피했습니다.', '#9fd0e8');
      for (const pt of PETS_HERE) if (!pt.dead && Math.hypot(pt.x - z.x, pt.z - z.z) <= z.r) PET.hurt(pt, Math.round((4 + Math.floor(Math.random()*5)) * BOSS_MAGIC), null); }
    if (z.landed && z.t < z.life && Math.hypot(hero.x - z.x, hero.z - z.z) <= z.r) onWeb = true;
    if (z.t >= z.life) webZones.splice(n, 1); }
  if (onWeb) BUFF.slow = Math.max(BUFF.slow, 1.0);
  if (SCENE === 'town' && (webZones.length || webShots.length)) { webZones.length = 0; webShots.length = 0; BUFF.root = 0; }
  aoeTick(dt);
}
// 거미줄 그림 (한 번 만들어 재사용)
const WEBTEX = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.translate(128, 128); g.strokeStyle = 'rgba(240,238,250,.85)'; g.lineCap = 'round';
  const R = 120, sp = 16; const ang = Array.from({ length: sp }, (_, k) => k / sp * Math.PI * 2 + (Math.random() - 0.5) * 0.15);
  g.lineWidth = 1.6; ang.forEach(a => { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * R, Math.sin(a) * R); g.stroke(); });
  g.lineWidth = 1.1; for (let r = 10; r < R; r += 9 + r * 0.06){ g.beginPath(); ang.concat([ang[0]]).forEach((a, k) => { const rr = r * (0.93 + Math.random() * 0.1); const x = Math.cos(a) * rr, y = Math.sin(a) * rr; k ? g.quadraticCurveTo(Math.cos(a - 0.2) * rr * 0.97, Math.sin(a - 0.2) * rr * 0.97, x, y) : g.moveTo(x, y); }); g.stroke(); }
  return c; })();
function drawWebZones(g){
  for (const z of webZones){ const [x, y] = W2P(z.x, z.z), rx = z.r * K * 1.414, ry = rx * 0.5;
    if (!z.landed){ const k = z.t / z.warn; g.save(); g.fillStyle = `rgba(200,30,20,${0.12 + 0.1 * Math.sin(time * 12)})`; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,60,40,.28)'; g.beginPath(); g.ellipse(x, y, rx * k, ry * k, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(255,120,100,.9)'; g.lineWidth = 1.6; g.setLineDash([6, 4]); g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.stroke(); g.restore(); }
    else { const age = z.t - z.warn, pop = Math.min(1, age / 0.18), fade = Math.min(1, (z.life - z.t) / 1.2); g.save(); g.globalAlpha = 0.85 * fade; g.translate(x, y); g.scale(pop, pop * 0.5);
      g.drawImage(WEBTEX, -rx * 1.05, -rx * 1.05, rx * 2.1, rx * 2.1); g.restore(); } } }
function drawWebShots(g){
  for (const w of webShots){ const [x1, y1] = W2P(hero.x, hero.z), k = Math.min(1, w.t / w.dur), x = w.x0 + (x1 - w.x0) * k, y = w.y0 + (y1 - 40 - w.y0) * k - Math.sin(k * Math.PI) * 20;
    g.save(); g.strokeStyle = 'rgba(235,232,245,.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(w.x0, w.y0); g.quadraticCurveTo((w.x0 + x) / 2, Math.min(w.y0, y) - 20, x, y); g.stroke();
    g.lineWidth = 0.7; g.strokeStyle = 'rgba(235,232,245,.5)'; for (let q = -1; q <= 1; q += 2) { g.beginPath(); g.moveTo(w.x0, w.y0); g.quadraticCurveTo((w.x0 + x) / 2 + q * 8, Math.min(w.y0, y) - 20 + q * 4, x, y); g.stroke(); }
    g.fillStyle = 'rgba(40,36,48,.6)'; g.beginPath(); g.arc(x, y, 7.5, 0, 7); g.fill(); g.fillStyle = '#f4f2fa'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill();
    g.strokeStyle = 'rgba(150,140,170,.9)'; g.lineWidth = 0.8; g.beginPath(); for (let q = 0; q < 4; q++) { const an = q * 0.785 + time * 4; g.moveTo(x - Math.cos(an) * 6, y - Math.sin(an) * 6); g.lineTo(x + Math.cos(an) * 6, y + Math.sin(an) * 6); } g.stroke(); g.restore(); }
  if (BUFF.root > 0){ const [x, y] = W2P(hero.x, hero.z); g.save(); g.globalAlpha = Math.min(1, BUFF.root * 2) * 0.9; g.translate(x, y - 34); g.scale(0.32, 0.55); g.drawImage(WEBTEX, -128, -128); g.restore();
    g.save(); g.strokeStyle = 'rgba(240,238,250,.75)'; g.lineWidth = 1; for (let k = 0; k < 6; k++){ const yy = y - 8 - k * 9; g.beginPath(); g.ellipse(x, yy, 12, 4, 0, 0, 7); g.stroke(); } g.restore(); }
}

// ============================================================ 분위기 연출: 구름 그림자 · 새 떼 · 밤 반딧불
const AMB = (() => {
  const cloudTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 300; const g = c.getContext('2d');
    for (let k = 0; k < 14; k++) { const x = 90 + Math.random() * 330, y = 80 + Math.random() * 140, r = 50 + Math.random() * 70;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(8,12,20,.42)'); gr.addColorStop(1, 'rgba(8,12,20,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    return c; })();
  const clouds = [], birds = [], flies = []; let birdT = 6 + Math.random() * 10;
  const WIND = [16, 7];   // 화면 기준 px/초
  function update(dt, vw, vh) {
    while (clouds.length < 3) clouds.push({ x: cam[0] - vw + Math.random() * vw * 2, y: cam[1] - vh + Math.random() * vh * 2, s: 1.6 + Math.random() * 1.6, a: 0.55 + Math.random() * 0.45 });
    for (const c of clouds) { c.x += WIND[0] * dt; c.y += WIND[1] * dt;
      if (c.x - cam[0] > vw * 1.4 || c.y - cam[1] > vh * 1.4 || c.x - cam[0] < -vw * 2.2 || c.y - cam[1] < -vh * 2.2) { c.x = cam[0] - vw * (1.1 + Math.random() * 0.6); c.y = cam[1] - vh * (0.4 + Math.random() * 1.0); c.s = 1.6 + Math.random() * 1.6; } }
    birdT -= dt; if (birdT <= 0 && DN.dark() < 0.5) { birdT = 18 + Math.random() * 35; const n = 5 + Math.floor(Math.random() * 6), fromLeft = Math.random() < 0.5, y = -vh * 0.35 + Math.random() * vh * 0.5;
      const vx = (fromLeft ? 1 : -1) * (70 + Math.random() * 30), vy = (Math.random() - 0.5) * 20;
      for (let k = 0; k < n; k++) { const row = Math.ceil(k / 2), side = k % 2 ? 1 : -1; birds.push({ x: (fromLeft ? -vw * 0.65 : vw * 0.65) - Math.sign(vx) * row * 16, y: y + side * row * 9, vx, vy, ph: Math.random() * 6, life: 30 }); } }
    for (let k = birds.length - 1; k >= 0; k--) { const b = birds[k]; b.x += b.vx * dt; b.y += b.vy * dt; b.ph += dt * 9; b.life -= dt; if (b.life <= 0 || Math.abs(b.x) > vw) birds.splice(k, 1); }
    const night = DN.dark() > 0.5 && SCENE === 'field';
    if (night) { while (flies.length < 26) flies.push({ x: hero.x + (Math.random() - 0.5) * 22, z: hero.z + (Math.random() - 0.5) * 22, h: 0.4 + Math.random() * 1.4, ph: Math.random() * 6, sp: 0.5 + Math.random() }); }
    else flies.length = 0;
    for (const f of flies) { f.ph += dt * f.sp; f.x += Math.cos(f.ph * 0.7) * dt * 0.4; f.z += Math.sin(f.ph * 0.9) * dt * 0.4; if (Math.hypot(f.x - hero.x, f.z - hero.z) > 14) { f.x = hero.x + (Math.random() - 0.5) * 20; f.z = hero.z + (Math.random() - 0.5) * 20; } }
  }
  function draw(g, vw, vh, ox, oy) {
    const day = 1 - DN.dark();
    if (day > 0.05) { g.save(); for (const c of clouds) { const x = c.x + ox, y = c.y + oy, w = cloudTex.width * c.s, h = cloudTex.height * c.s * 0.75; if (x + w < 0 || y + h < 0 || x > vw || y > vh) continue; g.globalAlpha = c.a * day; g.drawImage(cloudTex, x, y, w, h); } g.restore(); }
    if (birds.length) { g.save(); for (const b of birds) { const x = vw / 2 + b.x, y = vh / 2 + b.y, f = Math.sin(b.ph) * 3.2;
        g.globalAlpha = 0.25 * day; g.fillStyle = '#000'; g.beginPath(); g.ellipse(x + 40, y + 120, 3, 1.3, 0, 0, 7); g.fill();   // 땅에 비친 그림자
        g.globalAlpha = 0.9; g.strokeStyle = '#1a1814'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(x - 6, y - f); g.quadraticCurveTo(x - 3, y - 2 - f * 0.4, x, y); g.quadraticCurveTo(x + 3, y - 2 - f * 0.4, x + 6, y - f); g.stroke(); } g.restore(); }
  }
  function drawFlies(g, ox, oy) { if (!flies.length || MAZE()) return; g.save(); g.globalCompositeOperation = 'lighter';
    for (const f of flies) { const [x, y] = W2P(f.x, f.z), a = 0.45 + 0.55 * Math.max(0, Math.sin(f.ph * 2.3)); const X = x + ox, Y = y + oy - f.h * 30;
      const gr = g.createRadialGradient(X, Y, 0, X, Y, 6); gr.addColorStop(0, `rgba(220,255,140,${a})`); gr.addColorStop(1, 'rgba(160,255,90,0)'); g.fillStyle = gr; g.fillRect(X - 6, Y - 6, 12, 12); }
    g.restore(); }
  return { update, draw, drawFlies };
})();

// ============================================================ 스킬: 마법(서클당 3개, 기사는 2서클까지 · 마법서) + 기사 기술 5종(기술서)
const GAME_VER = 107;   // 업데이트할 때마다 올림 (로그인 화면에 표시 · PC 업데이트 비교)
let CLASS = 'knight'; const CLASS_NAME = { knight: '기사', elf: '요정', wizard: '마법사' };
// 직업별 시작 능력치·HP/MP·레벨업 성장·시작 장비 (리니지 클래식 감각의 임시안)
const CLS_DEF = {
  knight: { hp: 16, mp: 2, hpLv: [8, 12], mpLv: [0, 1], st: { str: 16, dex: 12, con: 14, int: 8, wis: 9, cha: 12 }, desc: '한손검과 방패 · 근접 전투 · 기사 기술', kit: ['old_sword', 'wood_shield', 'cloth_shirt'] },
  elf:    { hp: 14, mp: 5, hpLv: [6, 9], mpLv: [1, 2], st: { str: 11, dex: 16, con: 12, int: 12, wis: 12, cha: 9 }, desc: '활 · 원거리 공격(화살 소모) · 정령마법 · 6서클 마법', kit: ['단궁', 'cloth_shirt', '가죽 장갑'] },
  wizard: { hp: 12, mp: 8, hpLv: [4, 7], mpLv: [2, 4], st: { str: 8, dex: 9, con: 12, int: 16, wis: 14, cha: 9 }, desc: '지팡이 근접 공격 · 원소 공격 마법', kit: ['참나무 지팡이', '천 로브', 'cloth_shirt'] },
};
const MAGIC_MAX = { knight: 2, elf: 6, wizard: 10 };          // 배울 수 있는 최대 서클
const CIRCLE_LV = c => c * 4;                                  // 4레벨마다 한 서클
// 마법: 리니지 기반 핵심 마법 서클당 3개 (임시 구성 — 추후 조정)
const MAGIC_LIST = [
  [1, 'heal', '힐', 'HP를 6~10 회복합니다.', 3], [1, 'shieldm', '실드', '10분 동안 방어 AC -2.', 2], [1, 'ebolt', '에너지 볼트', '6칸 안의 대상에게 무속성 마법 피해 4~8.', 4],
  [2, 'decwt', '디크리즈 웨이트', '10분 동안 가방 무게가 10% 가볍게 계산됩니다. (느려짐·자동판매 기준에도 적용 · 벨트 무게 감소와 함께 적용)', 4], [2, 'icedagger', '아이스 대거', '6칸 안의 대상에게 얼음 단검을 날려 수속성 피해 5~10. (요정·마법사 전용)', 4], [2, 'cure', '큐어 포이즌', '독을 치료합니다. (독 몬스터는 추후)', 3],
  [3, 'xheal', '익스트라 힐', 'HP를 18~27 회복합니다.', 6], [3, 'turnund', '턴 언데드', '언데드 몬스터를 성공하면 한 번에 쓰러뜨립니다. 실패하면 피해가 없어요. (보스 면역 · 성공률 = 내 레벨·지능 vs 대상 레벨, 최대 75%)', 4], [3, 'farrow', '파이어 애로우', '6칸 안의 대상에게 불화살을 날려 불속성 피해 6~12.', 4],
  [4, 'fball', '파이어볼', '대상을 중심으로 가로·세로 6칸 범위를 폭발시켜 범위 안 모든 몬스터에게 불속성 피해 6~10. (기본 피해 · SP로 커짐)', 10], [4, 'slow', '슬로우', '대상의 이동·공격 속도를 1.3배 느리게 합니다. (10초 · 보스 4초 · 성공률 = 내 레벨·지능 vs 대상 레벨·마법 방어, 최대 75%)', 10], [4, 'medit', '메디테이션', '10분 동안 MP 회복 초당 +0.5. 가만히 서 있으면 2배. (클리어 마인드와는 큰 쪽만)', 8],
  [5, 'clight', '콜 라이트닝', '하늘에서 번개를 떨어뜨려 무속성 피해 12~20.', 14], [5, 'gheal', '그레이터 힐', 'HP를 36~51 회복합니다.', 12], [5, 'counterm', '카운터 매직', '10분 동안 받는 마법 공격(보스 범위 공격·거미줄 포함) 1회를 무효로 합니다.', 10],
  [6, 'coc', '콘 오브 콜드', '대상 발밑에서 얼음 기둥이 솟구쳐 수속성 피해 13~22. (기본 피해 · SP로 커짐)', 16], [6, 'eruption', '이럽션', '대상 발밑에 지진을 일으켜 땅속성 피해 13~22. (기본 피해 · SP로 커짐)', 18], [6, 'sunburst', '선버스트', '대상에게 점점 모여드는 강한 빛으로 불속성 피해 15~25.', 20],
  [7, 'blizzard', '블리자드', '범위 냉기 공격 + 둔화.', 22], [7, 'rcurse', '리무브 커스', '저주를 풉니다.', 16], [7, 'immune', '이뮨 투 함', '20초 동안 받는 모든 피해 30% 감소. 나에게, 또는 마우스로 가리킨 파티원에게 걸어요. (리덕션 아머와 함께 적용)', 24],
  [8, 'healall', '힐 올', '주변 아군 모두 회복.', 26], [8, 'ghaste', '그레이터 헤이스트', '주변 아군 가속.', 26], [8, 'disint', '디스인티그레이트', '강력한 단일 공격.', 30],
  [9, 'meteor', '미티어 스트라이크', '거대한 운석 범위 공격.', 36], [9, 'abarrier', '앱솔루트 배리어', '잠시 모든 피해 무효.', 34], [9, 'resur', '리저렉션', '쓰러진 아군을 되살립니다.', 40],
  [10, 'tornado', '토네이도', '회오리 범위 공격.', 44], [10, 'quake', '어스퀘이크', '지진 범위 공격.', 46], [10, 'fstorm', '파이어 스톰', '화염 폭풍 범위 공격.', 48],
];
const BUFF_OF = { shieldm: 'shieldm', decwt: 'decwt', medit: 'medit', counterm: 'counterm', immune: 'immune' };
const SPELL_CD = { turnund: 1.0, farrow: 1.2, fball: 1.5 }, SPELL_CLS = { icedagger: ['elf', 'wizard'] };
const SK = {};
for (const [c, id, name, desc, mp] of MAGIC_LIST) SK[id] = { name, kind: 'magic', circle: c, lv: CIRCLE_LV(c), mp, cd: SPELL_CD[id] || (c <= 2 ? 1.2 : 2), desc, buff: BUFF_OF[id], book: '마법서: ' + name, ready: c <= 6 || id === 'immune', cls: SPELL_CLS[id] };
// 기술: 기사 전용 (기술서)
Object.assign(SK, {
  stun:      { name: '스턴', kind: 'skill', lv: 5, mp: 5, cd: 8, desc: '근접한 대상을 1~4초 기절. 성공률은 나와 대상의 레벨 차이로 정해짐.', book: '기술서: 스턴', ready: true, shop: '마법상점' },
  reduction: { name: '리덕션 아머', kind: 'skill', lv: 15, mp: 4, cd: 2, buff: 'reduction', desc: '3분 동안 받는 모든 피해 25% 감소.', book: '기술서: 리덕션 아머', ready: true, shop: '마법상점' },
  bounce:    { name: '바운스 어택', kind: 'skill', lv: 25, mp: 3, cd: 2, buff: 'bounce', desc: '3분 동안 근거리 명중률 +15%.', book: '기술서: 바운스 어택', ready: true, shop: '몬스터 드랍' },
  solid:     { name: '솔리드 캐리지', kind: 'skill', lv: 35, mp: 4, cd: 2, buff: 'solid', desc: '3분 동안 원거리 공격 회피 +25%.', book: '기술서: 솔리드 캐리지', ready: true, shop: '몬스터 드랍' },
  counter:   { name: '카운터 배리어', kind: 'skill', lv: 45, mp: 6, cd: 2, buff: 'counter', desc: '2분 동안 받은 피해의 30%를 공격자에게 되돌림.', book: '기술서: 카운터 배리어', ready: true, shop: '몬스터 드랍' },
});

// 정령마법: 요정 전용 (정령수정으로 배움) — 수치는 임시안
Object.assign(SK, {
  resist_magic: { name: '레지스트 매직', kind: 'spirit', lv: 10, mp: 5, cd: 2, buff: 'rmagic', desc: '10분 동안 마법 방어 MR +10.', book: '정령수정: 레지스트 매직', shop: '마법상점' },
  body_mind:    { name: '바디 투 마인드', kind: 'spirit', lv: 10, mp: 0, cd: 2, desc: 'HP 10을 소모해 MP 5를 회복합니다.', book: '정령수정: 바디 투 마인드', shop: '마법상점' },
  tele_tree:    { name: '텔레포트 투 마더트리', kind: 'spirit', lv: 10, mp: 8, cd: 5, desc: '세계수의 힘으로 마을로 순간이동합니다. (요정숲이 생기기 전까지는 마을)', book: '정령수정: 텔레포트 투 마더트리', shop: '마법상점' },
  clear_mind:   { name: '클리어 마인드', kind: 'spirit', lv: 20, mp: 10, cd: 2, buff: 'cmind', desc: '10분 동안 MP 자연 회복 초당 +0.4.', book: '정령수정: 클리어 마인드', shop: '마법상점' },
  resist_elem:  { name: '레지스트 엘리멘탈', kind: 'spirit', lv: 20, mp: 10, cd: 2, buff: 'relem', desc: '10분 동안 모든 속성 저항 +10.', book: '정령수정: 레지스트 엘리멘탈', shop: '마법상점' },
});
const LEARNED = new Set(); const SKCD = {};
function learnSkill(id){ const k = SK[id]; if (!k) return false; if (LEARNED.has(id)) { say(`이미 배운 ${k.kind === 'magic' ? '마법' : k.kind === 'spirit' ? '정령마법' : '기술'}입니다.`, '#9c9682'); return false; }
  if (k.kind === 'skill' && CLASS !== 'knight') { say('기술은 기사만 배울 수 있습니다.', '#f08a7a'); return false; }
  if (k.kind === 'spirit' && CLASS !== 'elf') { say(`정령마법은 요정만 배울 수 있습니다. (${CLASS_NAME[CLASS]}는 배울 수 없음)`, '#f08a7a'); return false; }
  if (k.cls && !k.cls.includes(CLASS)) { say(`${k.name}은(는) ${k.cls.map(c => CLASS_NAME[c]).join('·')}만 배울 수 있습니다.`, '#f08a7a'); return false; }
  if (k.kind === 'magic' && k.circle > MAGIC_MAX[CLASS]) { say(`${CLASS_NAME[CLASS]}는 ${MAGIC_MAX[CLASS]}서클 마법까지만 배울 수 있습니다.`, '#f08a7a'); return false; }
  if (hero.lv < k.lv) { say(`${k.name}은(는) 레벨 ${k.lv}부터 배울 수 있습니다.`, '#f08a7a'); return false; }
  LEARNED.add(id); say(`${k.name}을(를) 배웠습니다! 스킬창(Tab)에서 끌어다 단축키에 등록하세요.`, '#f2e6a8'); INV.render(); return true; }
function castSkill(id, onto){ const k = SK[id]; if (!k) return; if (!LEARNED.has(id)) { say(`아직 배우지 않은 ${k.kind === 'magic' ? '마법' : k.kind === 'spirit' ? '정령마법' : '기술'}입니다.`, '#f08a7a'); return; }
  if ((SKCD[id] || 0) > 0) return; if (!GOD_MP && hero.mp < k.mp) { say('MP가 부족합니다.', '#8aa8ff'); return; }
  const OT = onto && !onto.dead ? onto : null, T = OT || (hero.target && !hero.target.dead ? hero.target : null), [hx, hy] = W2P(hero.x, hero.z);
  if (id === 'stun') { if (!T || cheb(T.i, T.j, hero.i, hero.j) > 1) { say('스턴: 바로 옆의 대상을 선택하세요.', '#9c9682'); return; }
    if (!GOD_MP) hero.mp -= k.mp; SKCD[id] = k.cd / heroSpd(); face(hero, T); hero.atk = { t: 0, dur: 0.5, hit: true, f: T };
    const S = MOB[T.kind], ch = Math.max(0.1, Math.min(0.9, 0.5 + 0.05 * (hero.lv - S.lv) - (S.boss ? 0.25 : 0))); const [fx, fy] = W2P(T.x, T.z);
    if (Math.random() < ch) { const t = 1 + Math.random() * 3; T.stunT = t; T.stunMax = t; T.dingT = 0.18; T.aggro = true; floatText(fx, fy - headY(T) - 14, `스턴! ${t.toFixed(1)}초`, { color: '#ffe066', size: 19, big: true, life: 1.4, rise: 34 }); spellFx('stun', T); spellSfx('stun');
      { const hy = fy - headY(T) * 0.6; impact(fx, hy, 'bolt', '#ffe066'); impact(fx, fy - headY(T) - 4, 'bolt', '#fff6c0'); shake = Math.max(shake, 0.18); hitstop = Math.max(hitstop, 0.06);   // 큰 섬광 + 별 파편 + 쾅
        for (let n = 0; n < 22; n++) { const a = Math.random() * 6.283, sp = 60 + Math.random() * 90; parts.push({ x: fx, y: hy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.55 - 30, life: 0.7, max: 0.7, crit: n % 3 !== 0 }); }
        if (AC && SFX_ON) { const t0 = AC.currentTime; nz(t0, 0.18, 1800, 300, 0.35); tone(t0, 'square', 220, 70, 0.22, 0.12); tone(t0 + 0.02, 'triangle', 1320, 1760, 0.16, 0.06); } } }
    else { floatText(fx, fy - headY(T) - 10, '스턴 실패', { color: '#c8d0d8', size: 11 }); spellSfx('stunfail'); }
    return; }
  const spellTgt = rng => { if (!T || cheb(T.i, T.j, hero.i, hero.j) > rng) { say(`${k.name}: ${rng}칸 안의 대상을 선택하세요.`, '#9c9682'); return false; } if (!DGLOS(hero, T)) { say(`${k.name}: 벽에 가로막혀 있습니다.`, '#9c9682'); return false; } return true; };
  const spend = () => { if (!GOD_MP) hero.mp -= k.mp; SKCD[id] = k.cd / heroSpd(); face(hero, T); if (CLASS !== 'knight' && !hero.atk) hero.atk = { t: 0, dur: 0.5 / GSPD, hit: true, v: 'cast' }; };
  const resist = (S, mr) => Math.max(0.05, Math.min(0.75, 0.35 + 0.03 * (hero.lv - S.lv) + 0.01 * (INV.stat().int - 12) - (mr ? (S.mr || 0) / 200 + (S.boss ? 0.15 : 0) : 0)));
  if (SPELL[id]) { const P = SPELL[id]; if (!spellTgt(P.rng)) return; spend(); const d = cheb(T.i, T.j, hero.i, hero.j);
    mxFire(id, hero, T, false, [hx, hy]); mxCast(id, hero); NET.mx(id, T); spellSfx(id); return; }
  if (id === 'turnund') { if (!spellTgt(6)) return; const S = MOB[T.kind]; if (!S.undead) { say('턴 언데드: 언데드 몬스터에게만 쓸 수 있어요.', '#9c9682'); return; } spend(); const [fx, fy] = W2P(T.x, T.z);
    mxCast(id, hero); const ok = !S.boss && Math.random() < resist(S, false), vid = ok ? 'turnund' : 'turnund_x';
    mxSelf(vid, T); NET.mx(vid, T); spellSfx(vid);
    if (ok) { floatText(fx, fy - headY(T) - 16, '정화! 턴 언데드', { color: '#ffe680', size: 16, big: true, life: 1.4 }); mobHurt(T, Math.max(1, Math.ceil(T.hp)), '#fff6c0'); }
    else floatText(fx, fy - headY(T) - 12, S.boss ? '보스는 면역 — 튕겨냄' : '저항! 턴 언데드 실패', { color: '#b9a6d8', size: 12, big: true, life: 1.1 });
    return; }
  if (id === 'slow') { if (!spellTgt(6)) return; const S = MOB[T.kind]; spend(); const [fx, fy] = W2P(T.x, T.z); spellSfx('slow'); mxCast(id, hero); NET.mx(id, T);
    if (Math.random() < resist(S, true)) { T.slowT = S.boss ? 4 : 10; T.aggro = true; mxSelf('slow', T); floatText(fx, fy - headY(T) - 14, `슬로우! ${T.slowT}초`, { color: '#c9a0ff', size: 13, big: true }); }
    else floatText(fx, fy - headY(T) - 12, '슬로우 실패', { color: '#c8d0d8', size: 11 });
    return; }
  if (!GOD_MP) hero.mp -= k.mp; SKCD[id] = k.cd / heroSpd(); if ((k.kind === 'magic' || k.kind === 'spirit') && CLASS !== 'knight' && !hero.atk) hero.atk = { t: 0, dur: 0.5 / GSPD, hit: true, v: 'cast' };
  if (id === 'body_mind') { if (hero.hp <= 12) { say('HP가 너무 낮아 바디 투 마인드를 쓸 수 없습니다.', '#f08a7a'); return; } hero.hp -= 10; const g = Math.max(0, Math.min(hero.maxmp - hero.mp, 5)); hero.mp += g; floatText(hx, hy - 100, `MP +${Math.round(g)}`, { color: '#8ab8ff', size: 12 }); mxCast(id, hero); mxSelf(id, hero); NET.mx(id, hero); spellSfx(id); say('바디 투 마인드! (HP -10 · MP +5)', '#cfe4ff'); return; }
  if (id === 'tele_tree') { if (SCENE === 'town') { say('이미 마을에 있습니다.', '#9c9682'); hero.mp += k.mp; SKCD[id] = 0; return; } spellSfx(id); say('텔레포트 투 마더트리! 세계수의 힘으로 마을로 돌아갑니다.', '#cfe4ff'); TOWN.goTown(); mxCast(id, hero, true); mxSelf(id, hero); return; }
  // 힐: 마우스로 가리킨 대상(몬스터 포함, 리니지식)에게도, 없으면 나에게
  if (id === 'heal' || id === 'xheal' || id === 'gheal') { const [b0, r0] = ({ heal: [6, 5], xheal: [18, 10], gheal: [36, 16] })[id], amt = b0 + Math.floor(Math.random() * r0), PM = OT ? null : NET.hoverParty();   // 마우스로 가리킨 파티원에게도 (공헌도에 쌓임)
    if (PM) { const h = NET.healPeer(PM, amt); face(hero, { i: Math.floor(PM.pr.x), j: Math.floor(PM.pr.y) }); say(`${k.name} → ${String(PM.pr.n).slice(0, 12)} (+${h})`, '#cfe4ff'); }
    else if (OT) { const M_ = MOB[OT.kind], cap = OT.max || M_.hp, h = Math.max(0, Math.min(cap - OT.hp, amt)); OT.hp = Math.min(cap, OT.hp + h); const [fx, fy] = W2P(OT.x, OT.z); face(hero, OT); floatText(fx, fy - headY(OT) - 6, `+${h}`, { color: '#8af08a', size: 13 }); mxSelf(id, OT); NET.mx(id, OT); say(`힐 → ${M_.name} (+${h})`, '#cfe4ff'); }
    else { const h = Math.max(0, Math.min(Math.ceil(hero.max - hero.hp), amt)); hero.hp = Math.min(hero.max, hero.hp + h); floatText(hx, hy - 100, `+${h}`, { color: '#8af08a', size: 13 }); mxSelf(id, hero); NET.mx(id, hero); say(`${k.name}!`, '#cfe4ff'); }
    mxCast(id, hero); spellSfx('heal'); return; }
  if (id === 'healall') { const amt = 20 + Math.floor(Math.random() * 10), h = Math.max(0, Math.min(Math.ceil(hero.max - hero.hp), amt)); hero.hp = Math.min(hero.max, hero.hp + h); floatText(hx, hy - 100, `+${h}`, { color: '#8af08a', size: 13 }); mxSelf('healall', hero); mxCast(id, hero); const P_ = NET.partyNear(7); for (const o of P_) NET.healPeer(o, amt); say(`${k.name}!${P_.length ? ` (파티원 ${P_.length}명 회복)` : ''}`, '#cfe4ff'); spellSfx('heal'); return; }
  if (id === 'immune') { const PM = NET.hoverParty(), D = BUFF_DEF.immune.dur;
    if (PM) { NET.buffPeer(PM, 'immune', D); face(hero, { i: Math.floor(PM.pr.x), j: Math.floor(PM.pr.y) }); say(`이뮨 투 함 → ${String(PM.pr.n).slice(0, 12)} (20초 · 받는 피해 30% 감소)`, '#ffe9a0'); }
    else { BUFF.immune = D; mxSelf('immune', hero); NET.mx('immune', hero); floatText(hx, hy - 100, '이뮨 투 함', { color: '#ffe08a', size: 12 }); say('이뮨 투 함! 20초 동안 받는 피해 30% 감소', '#ffe9a0'); }
    mxCast(id, hero); spellSfx(id); return; }
  if (id === 'cure') { floatText(hx, hy - 100, '해독', { color: '#8af08a', size: 12 }); if (BUFF.poison > 0) { BUFF.poison = 0; say('독이 깨끗이 나았습니다.', '#9ae06a'); } mxSelf('cure', hero); }
  else if (k.buff) { BUFF[k.buff] = BUFF_DEF[k.buff].dur; if (k.kind === 'magic' && id !== 'light') NET.buffParty(k.buff, BUFF_DEF[k.buff].dur); mxSelf(id, hero); }
  else mxSelf(id, hero);
  mxCast(id, hero); NET.mx(id, hero); say(`${k.name}!`, '#cfe4ff'); spellSfx(id); }
// ===== 마법 효과음 (합성) — 효과음 끄면 master 볼륨 0이라 같이 꺼짐
function spellSfx(id) { if (!AC || !SFX_ON) return; const t = AC.currentTime, T = (dt, ...a) => tone(t + dt, ...a);
  switch (id) {
    case 'heal': [784, 988, 1175, 1568].forEach((f, n) => T(n * 0.07, 'sine', f, f * 1.01, 0.5, 0.07)); T(0, 'triangle', 392, 784, 0.6, 0.04); break;
    case 'shieldm': T(0, 'sine', 220, 230, 0.7, 0.09); T(0, 'sine', 330, 336, 0.7, 0.05); T(0.02, 'triangle', 660, 1320, 0.25, 0.04); break;
    case 'ebolt': T(0, 'sawtooth', 180, 1400, 0.18, 0.06); nz(t, 0.22, 3000, 6000, 0.12); T(0.05, 'square', 1200, 600, 0.15, 0.03); break;
    case 'light': [1047, 1319, 1568, 2093].forEach((f, n) => T(n * 0.05, 'sine', f, f, 0.45, 0.05)); nz(t, 0.4, 7000, 9000, 0.04); break;
    case 'enchant': T(0, 'triangle', 1568, 1580, 0.9, 0.06); T(0, 'sine', 2349, 2360, 0.7, 0.04); nz(t, 0.08, 5000, 3000, 0.1); break;
    case 'cure': T(0, 'sine', 523, 1047, 0.35, 0.06); T(0.1, 'sine', 659, 1319, 0.35, 0.05); break;
    case 'icedagger': T(0, 'triangle', 2400, 1800, 0.18, 0.05); T(0.02, 'sine', 3200, 3600, 0.12, 0.03); nz(t, 0.15, 6000, 9000, 0.06); break;
    case 'farrow': nz(t, 0.3, 900, 2600, 0.14); T(0, 'sawtooth', 220, 520, 0.22, 0.05); break;
    case 'fball': nz(t, 0.45, 600, 200, 0.22); T(0, 'sine', 140, 60, 0.45, 0.12); break;
    case 'clight': nz(t, 0.35, 8000, 1500, 0.2); T(0, 'sawtooth', 2600, 200, 0.25, 0.06); T(0.12, 'sine', 70, 40, 0.5, 0.12); break;
    case 'coc': T(0, 'triangle', 1800, 900, 0.35, 0.06); nz(t, 0.3, 5000, 2000, 0.1); T(0.1, 'sine', 2600, 2800, 0.3, 0.03); break;
    case 'eruption': T(0, 'sine', 70, 35, 0.8, 0.22); nz(t, 0.7, 500, 120, 0.25); break;
    case 'sunburst': [880, 1175, 1568, 2093].forEach((f, n) => T(n * 0.12, 'sine', f, f, 0.4, 0.05)); nz(t + 0.55, 0.3, 3000, 800, 0.16); break;
    case 'immune': T(0, 'sine', 330, 660, 0.4, 0.06); T(0.06, 'triangle', 990, 1320, 0.35, 0.04); T(0.14, 'sine', 1320, 1324, 0.5, 0.03); break;
    case 'turnund': [523, 659, 784, 1047].forEach((f, n) => T(n * 0.07, 'sine', f, f * 2, 0.6, 0.07)); T(0.3, 'triangle', 2093, 2100, 0.7, 0.04); nz(t + 0.28, 0.5, 6000, 9000, 0.04); break;
    case 'turnund_x': T(0, 'sine', 440, 420, 0.18, 0.05); T(0.12, 'square', 180, 90, 0.22, 0.05); T(0.12, 'sawtooth', 190, 95, 0.25, 0.03); nz(t + 0.1, 0.3, 1500, 400, 0.08); break;
    case 'slow': T(0, 'sine', 600, 200, 0.6, 0.06); T(0.05, 'triangle', 300, 120, 0.5, 0.04); break;
    case 'decwt': T(0, 'sine', 400, 900, 0.4, 0.05); break;
    case 'medit': [392, 494, 587].forEach((f, n) => T(n * 0.1, 'sine', f, f, 0.8, 0.04)); break;
    case 'counterm': T(0, 'triangle', 1200, 600, 0.35, 0.06); T(0.05, 'sine', 300, 310, 0.6, 0.06); break;
    case 'stun': T(0, 'sine', 120, 40, 0.25, 0.5); nz(t, 0.12, 800, 300, 0.4); T(0.03, 'square', 1400, 700, 0.18, 0.05); break;
    case 'stunfail': nz(t, 0.1, 600, 300, 0.2); break;
    case 'resist_magic': T(0, 'triangle', 880, 1760, 0.4, 0.05); T(0.08, 'sine', 1320, 1330, 0.6, 0.04); break;
    case 'resist_elem': [523, 659, 784, 988].forEach((f, n) => T(n * 0.06, 'triangle', f, f, 0.45, 0.05)); nz(t, 0.3, 2000, 4000, 0.05); break;
    case 'clear_mind': T(0, 'sine', 1568, 1560, 0.9, 0.05); T(0.15, 'sine', 2093, 2090, 0.7, 0.03); nz(t, 0.5, 3000, 6000, 0.03); break;
    case 'body_mind': T(0, 'sawtooth', 160, 120, 0.3, 0.05); T(0.2, 'sine', 660, 1320, 0.4, 0.05); break;
    case 'tele_tree': nz(t, 0.8, 1500, 5000, 0.08); [392, 523, 659, 784, 1047].forEach((f, n) => T(n * 0.07, 'sine', f, f, 0.6, 0.05)); break;
    case 'gheal': [523, 659, 784, 1047, 1319].forEach((f, n) => T(n * 0.06, 'sine', f, f * 1.01, 0.7, 0.07)); T(0, 'triangle', 262, 523, 0.8, 0.05); break;
    case 'xheal': [659, 880, 1175, 1568].forEach((f, n) => T(n * 0.06, 'sine', f, f * 1.01, 0.55, 0.07)); break;
    case 'reduction': nz(t, 0.18, 1800, 900, 0.3); T(0, 'square', 300, 290, 0.25, 0.06); T(0.06, 'triangle', 180, 170, 0.35, 0.08); break;
    case 'bounce': T(0, 'triangle', 300, 900, 0.12, 0.08); T(0.1, 'triangle', 450, 1200, 0.12, 0.07); break;
    case 'solid': T(0, 'sine', 140, 130, 0.5, 0.15); nz(t, 0.2, 400, 200, 0.2); break;
    case 'counter': T(0, 'sawtooth', 500, 250, 0.3, 0.05); T(0.08, 'sawtooth', 750, 300, 0.3, 0.04); break;
    case 'slow': T(0, 'sine', 600, 150, 0.8, 0.07); T(0.1, 'sine', 450, 110, 0.8, 0.05); break;
    case 'eruption': nz(t, 0.9, 200, 60, 0.6); T(0, 'sawtooth', 70, 35, 0.9, 0.2); break;
    default: T(0, 'triangle', 520, 1040, 0.25, 0.07); } }
// ===== 마법 이펙트: 대상(나/몬스터)을 따라다니며 그림
const SPELLFX = [];
function spellFx(kind, ent, c) { SPELLFX.push({ kind, ent, c: c || '#ffffff', t: 0, life: ({ heal: 1.1, shield: 0.9, light: 1.2, enchant: 1.0, stun: 0.6, aura: 0.9, cure: 0.9, cast: 0.35, levelup: 2.4, enok: 1.0, enbless: 1.3, earth: 1.4, puff: 0.8, boom: 1.2 })[kind] || 0.8 }); }
function spellFxTick(dt) { for (let n = SPELLFX.length - 1; n >= 0; n--) { const f = SPELLFX[n]; f.t += dt; if (f.t >= f.life) SPELLFX.splice(n, 1); } }
function drawSpellFx(g) { for (const f of SPELLFX) { const e = f.ent; if (!e || (e !== hero && e.dead && f.kind !== 'levelup')) continue; const [x, y] = W2P(e.x, e.z), k = f.t / f.life, a = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85, top = e === hero || e.pl ? y - 70 : y - headY(e);
    g.save(); g.globalCompositeOperation = 'lighter';
    if (f.kind === 'heal' || f.kind === 'cure') { const c1 = f.kind === 'heal' ? '120,255,140' : '160,255,200';
      g.strokeStyle = `rgba(${c1},${0.8 * a})`; g.lineWidth = 2; const R = 14 + k * 22; g.beginPath(); g.ellipse(x, y, R, R * 0.5, 0, 0, 7); g.stroke();
      const gr = g.createRadialGradient(x, y - 30, 0, x, y - 30, 40); gr.addColorStop(0, `rgba(${c1},${0.35 * a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y - 30, 40, 0, 7); g.fill();
      for (let q = 0; q < 16; q++) { const ph = (q * 0.37 + f.t * 1.3) % 1, px = x + Math.sin(q * 2.4 + f.t * 3) * (12 + (q % 3) * 4), py = y - 4 - ph * 70; g.globalAlpha = Math.sin(ph * Math.PI) * a; g.fillStyle = q % 3 ? `rgb(${c1})` : '#ffe890'; g.fillRect(Math.round(px), Math.round(py), 2, q % 4 ? 2 : 4); } }
    else if (f.kind === 'shield') { const R = 26 + k * 6; g.globalAlpha = 0.9 * a; g.strokeStyle = '#8fc8ff'; g.lineWidth = 1.3;
      for (let q = 0; q < 6; q++) { const an = q * Math.PI / 3 + f.t; g.beginPath(); for (let v = 0; v <= 6; v++) { const b = an + v * Math.PI / 3, rr = 7; const cx = x + Math.cos(an) * R * 0.55, cy = y - 34 + Math.sin(an) * R * 0.8; v ? g.lineTo(cx + Math.cos(b) * rr, cy + Math.sin(b) * rr) : g.moveTo(cx + Math.cos(b) * rr, cy + Math.sin(b) * rr); } g.stroke(); }
      const gr = g.createRadialGradient(x, y - 34, 4, x, y - 34, R + 8); gr.addColorStop(0, 'rgba(120,180,255,0)'); gr.addColorStop(0.75, `rgba(120,180,255,${0.35 * a})`); gr.addColorStop(1, 'rgba(120,180,255,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y - 34, R + 8, R + 14, 0, 0, 7); g.fill(); }
    else if (f.kind === 'light') { const R = 30 + 40 * Math.min(1, k * 2); const gr = g.createRadialGradient(x, y - 40, 0, x, y - 40, R); gr.addColorStop(0, `rgba(255,250,220,${0.8 * a})`); gr.addColorStop(1, 'rgba(255,240,180,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y - 40, R, 0, 7); g.fill();
      g.strokeStyle = `rgba(255,245,200,${0.7 * a})`; g.lineWidth = 1.2; g.beginPath(); for (let q = 0; q < 12; q++) { const an = q * 0.5236 + f.t * 0.8, r0 = 12, r1 = 22 + R * 0.5; g.moveTo(x + Math.cos(an) * r0, y - 40 + Math.sin(an) * r0); g.lineTo(x + Math.cos(an) * r1, y - 40 + Math.sin(an) * r1); } g.stroke(); }
    else if (f.kind === 'enchant') { for (let q = 0; q < 10; q++) { const ph = (q * 0.29 + f.t * 1.8) % 1, an = q * 2.1 + f.t * 5, px = x + 10 + Math.cos(an) * (6 + ph * 10), py = y - 50 - ph * 22 + Math.sin(an) * 4; g.globalAlpha = Math.sin(ph * Math.PI) * a; g.fillStyle = q % 2 ? '#ffe28a' : '#bfe6ff'; g.fillRect(Math.round(px) - 1, Math.round(py), 3, 1); g.fillRect(Math.round(px), Math.round(py) - 1, 1, 3); }
      g.globalAlpha = a * 0.6; const gr = g.createRadialGradient(x + 10, y - 55, 0, x + 10, y - 55, 22); gr.addColorStop(0, f.c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x + 10, y - 55, 22, 0, 7); g.fill(); }
    else if (f.kind === 'stun') { const R = 6 + k * 26; g.globalAlpha = a; g.strokeStyle = '#ffe066'; g.lineWidth = 2; g.beginPath(); for (let q = 0; q < 10; q++) { const an = q * 0.628 + 0.2, r0 = R * 0.3, r1 = R * (q % 2 ? 0.8 : 1.2); g.moveTo(x + Math.cos(an) * r0, top - 6 + Math.sin(an) * r0 * 0.7); g.lineTo(x + Math.cos(an) * r1, top - 6 + Math.sin(an) * r1 * 0.7); } g.stroke();
      const gr = g.createRadialGradient(x, top - 6, 0, x, top - 6, R); gr.addColorStop(0, `rgba(255,240,150,${0.9 * a})`); gr.addColorStop(1, 'rgba(255,200,60,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, top - 6, R, 0, 7); g.fill(); }
    else if (f.kind === 'enok' || f.kind === 'enbless') { const gold = f.kind === 'enbless', c1 = gold ? '255,220,120' : '140,210,255';
      for (let w = 0; w < (gold ? 2 : 1); w++) { const kk = Math.min(1, Math.max(0, (f.t - w * 0.22) / 0.6)); if (kk <= 0 || kk >= 1) continue; const R = 8 + kk * 30, gr = g.createRadialGradient(x, y - 50, 0, x, y - 50, R); gr.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - kk)})`); gr.addColorStop(0.4, `rgba(${w ? '140,210,255' : c1},${0.7 * (1 - kk)})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = 1; g.fillStyle = gr; g.beginPath(); g.arc(x, y - 50, R, 0, 7); g.fill(); }
      g.globalAlpha = a; g.strokeStyle = `rgb(${c1})`; g.lineWidth = 1.2; g.beginPath(); for (let q = 0; q < 12; q++) { const an = q * 0.5236 + 0.2, r0 = 6 + k * 14, r1 = r0 + 8 + (q % 2) * 6; g.moveTo(x + Math.cos(an) * r0, y - 50 + Math.sin(an) * r0); g.lineTo(x + Math.cos(an) * r1, y - 50 + Math.sin(an) * r1); } g.stroke();
      for (let q = 0; q < 14; q++) { const ph = (q * 0.31 + f.t * 1.5) % 1, an = q * 2.4; g.globalAlpha = Math.sin(ph * Math.PI) * a; g.fillStyle = q % 3 ? `rgb(${c1})` : '#ffffff'; g.fillRect(Math.round(x + Math.cos(an) * (10 + ph * 18)), Math.round(y - 50 + Math.sin(an) * (6 + ph * 12) - ph * 14), 2, 2); } }
    else if (f.kind === 'earth') { g.globalCompositeOperation = 'source-over'; for (let q = 0; q < 3; q++) { const an = f.t * 4 + q * 2.09; g.strokeStyle = `rgba(170,120,60,${0.8 * a})`; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y - 20 - q * 10, 16 + q * 4, 6 + q * 2, 0, an, an + 2.2); g.stroke(); }
      for (let q = 0; q < 10; q++) { const ph = (q * 0.27 + f.t * 0.9) % 1, an = q * 2.1 + f.t * 3; g.globalAlpha = Math.sin(ph * Math.PI) * a; g.fillStyle = q % 2 ? '#7a5230' : '#c89a5a'; g.fillRect(Math.round(x + Math.cos(an) * (14 + q % 3 * 3)), Math.round(y - 4 - ph * 46), 3, 2); }
      g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(x, y - 30, 0, x, y - 30, 30); gr.addColorStop(0, `rgba(255,190,90,${0.45 * a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = 1; g.fillStyle = gr; g.beginPath(); g.arc(x, y - 30, 30, 0, 7); g.fill(); }
    else if (f.kind === 'puff') { g.globalCompositeOperation = 'source-over'; for (let q = 0; q < 6; q++) { const an = q * 1.05 + 0.3, r = 4 + k * 16; g.globalAlpha = 0.45 * (1 - k); g.fillStyle = '#9a968c'; g.beginPath(); g.arc(x + Math.cos(an) * r, y - 50 + Math.sin(an) * r * 0.6 - k * 8, 4 + k * 5, 0, 7); g.fill(); } }
    else if (f.kind === 'boom') { g.globalCompositeOperation = 'source-over'; for (let q = 0; q < 9; q++) { const an = q * 0.698 + 0.2, r = 6 + k * 28; g.globalAlpha = 0.55 * (1 - k); g.fillStyle = q % 2 ? '#3a0c08' : '#8a1a10'; g.beginPath(); g.arc(x + Math.cos(an) * r, y - 50 + Math.sin(an) * r * 0.7 - k * 14, 5 + k * 8, 0, 7); g.fill(); }
      g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(255,120,90,${a})`; g.lineWidth = 1.4; g.beginPath(); for (let q = 0; q < 10; q++) { const an = q * 0.628 + 0.1, r0 = 4 + k * 20, r1 = r0 + 6; g.moveTo(x + Math.cos(an) * r0, y - 50 + Math.sin(an) * r0); g.lineTo(x + Math.cos(an + 0.15) * r1, y - 50 + Math.sin(an + 0.15) * r1); } g.stroke();
      if (k < 0.2) { const gr = g.createRadialGradient(x, y - 50, 0, x, y - 50, 34); gr.addColorStop(0, 'rgba(255,240,220,.95)'); gr.addColorStop(1, 'rgba(255,60,30,0)'); g.globalAlpha = 1 - k * 5; g.fillStyle = gr; g.beginPath(); g.arc(x, y - 50, 34, 0, 7); g.fill(); } }
    else if (f.kind === 'cast') { const R = 10 + k * 20; g.globalAlpha = a; g.strokeStyle = f.c; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y, R, R * 0.5, 0, 0, 7); g.stroke(); }
    else if (f.kind === 'levelup') { const ph = Math.min(1, f.t / 0.35) * (e === hero ? 1 : 0.55), fade = f.t > f.life - 0.6 ? (f.life - f.t) / 0.6 : 1;
      const pw = 34 * (0.6 + 0.4 * ph), gr = g.createLinearGradient(0, y - 190, 0, y); gr.addColorStop(0, 'rgba(255,220,120,0)'); gr.addColorStop(0.6, `rgba(255,210,100,${0.32 * fade})`); gr.addColorStop(1, `rgba(255,236,170,${0.5 * fade})`);
      g.fillStyle = gr; g.beginPath(); g.moveTo(x - pw * 0.5, y); g.lineTo(x - pw * 0.25, y - 190 * ph); g.lineTo(x + pw * 0.25, y - 190 * ph); g.lineTo(x + pw * 0.5, y); g.closePath(); g.fill();
      for (let q = 0; q < 3; q++) { const kk = (f.t - q * 0.25) / 0.9; if (kk <= 0 || kk >= 1) continue; const R = 10 + kk * 60; g.globalAlpha = (1 - kk) * fade; g.strokeStyle = '#ffd86a'; g.lineWidth = 2.2 * (1 - kk) + 0.6; g.beginPath(); g.ellipse(x, y, R, R * 0.48, 0, 0, 7); g.stroke(); }
      for (let q = 0; q < 26; q++) { const p2 = (q * 0.173 + f.t * 0.9) % 1, px = x + Math.sin(q * 1.7 + f.t * 2) * (8 + (q % 5) * 5), py = y - p2 * 150; g.globalAlpha = Math.sin(p2 * Math.PI) * fade; g.fillStyle = q % 3 ? '#ffe9a0' : '#ffffff'; g.fillRect(Math.round(px), Math.round(py), q % 4 ? 2 : 3, q % 4 ? 2 : 3); } }
    else { const R = 20 + k * 16; g.globalAlpha = a * 0.8; g.strokeStyle = f.c; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, R, R * 0.5, 0, 0, 7); g.stroke(); g.beginPath(); g.ellipse(x, y - 30, R * 0.8, R, 0, 0, 7); g.globalAlpha = a * 0.35; g.stroke();
      const gr = g.createRadialGradient(x, y - 30, 0, x, y - 30, 34); gr.addColorStop(0, f.c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = a * 0.35; g.fillStyle = gr; g.beginPath(); g.arc(x, y - 30, 34, 0, 7); g.fill(); }
    g.restore();
    if (f.kind === 'levelup') { const sm = e === hero ? 1 : 0.62, pop = (f.t < 0.25 ? 0.4 + 2.6 * (f.t / 0.25) * (1 - f.t / 0.25) + 0.6 * (f.t / 0.25) : 1) * sm, fade = f.t > f.life - 0.7 ? (f.life - f.t) / 0.7 : 1, ty = y - (e === hero ? 118 : 70) - Math.max(0, f.t - 0.6) * 10;
      g.save(); g.globalAlpha = Math.max(0, fade); g.translate(x, ty); g.scale(pop, pop); g.font = '900 22px "Noto Serif KR","Noto Sans KR",serif'; g.textAlign = 'center'; g.lineJoin = 'round';
      g.lineWidth = 5; g.strokeStyle = 'rgba(40,20,0,.9)'; g.strokeText('LEVEL UP!', 0, 0); const tg = g.createLinearGradient(0, -18, 0, 4); tg.addColorStop(0, '#fff6c8'); tg.addColorStop(0.5, '#ffd24a'); tg.addColorStop(1, '#c07a10'); g.fillStyle = tg; g.fillText('LEVEL UP!', 0, 0);
      g.lineWidth = 1; g.strokeStyle = 'rgba(255,250,220,.8)'; g.strokeText('LEVEL UP!', 0, 0); g.font = '800 11px "Noto Sans KR",sans-serif'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.85)'; const lvT = e === hero ? `레벨 ${hero.lv}` : `${e.d ? e.d.name + ' Lv.' + e.d.lv : ''}`; g.strokeText(lvT, 0, 15); g.fillStyle = '#ffe9a0'; g.fillText(lvT, 0, 15); g.restore(); } } }
function levelUpFx() { TELE.ev('lv', { lv: hero.lv }); spellFx('levelup', hero); if (AC && SFX_ON) { const t = AC.currentTime; [523, 659, 784, 1047].forEach((f, n) => tone(t + n * 0.09, 'triangle', f, f, 0.32, 0.12)); [1047, 1319, 1568].forEach(f => tone(t + 0.4, 'triangle', f, f * 1.003, 0.9, 0.08)); tone(t + 0.4, 'sine', 262, 262, 1.0, 0.1); nz(t + 0.4, 0.6, 6000, 9000, 0.05); } }
const BOLTS = [], SKYFX = [];
// 공격 마법: 사거리 · 피해(지능 보너스·SP 별도) · 속성(약점 +50% · 같은 속성 -50%) · 연출
const SPELL = { ebolt: { rng: 6, dmg: [4, 8], el: null, fx: 'bolt', col: '#9fd8ff' }, icedagger: { rng: 6, dmg: [5, 10], el: 'water', fx: 'ice', col: '#bff0ff' }, farrow: { rng: 6, dmg: [6, 12], el: 'fire', fx: 'fire', col: '#ffab6a' },
  fball: { rng: 6, dmg: [7, 13], el: 'fire', fx: 'fball', col: '#ff8a3a', box: 3, mul: 0.8 }, clight: { rng: 7, dmg: [12, 20], el: null, fx: 'sky', col: '#e0f4ff' }, coc: { rng: 6, dmg: [13, 22], el: 'water', fx: 'icep', col: '#a8e8ff' },
  eruption: { rng: 6, dmg: [13, 22], el: 'earth', fx: 'quake', col: '#d8b070' }, sunburst: { rng: 6, dmg: [15, 25], el: 'fire', fx: 'sun', col: '#fff0a0', delay: 0.6 } };
const BOLT_C = { bolt: ['#5aa8ff', '235,250,255', '140,210,255', '60,130,255', 1], ice: ['#a8f0ff', '255,255,255', '190,240,255', '90,190,255', 0.85], fire: ['#ff8a3a', '255,250,220', '255,170,80', '255,80,20', 1], fball: ['#ff7a2a', '255,245,200', '255,150,60', '230,60,10', 1.6], icep: ['#a8e8ff', '255,255,255', '180,235,255', '70,170,255', 1.5] };
// 마법 피해 (리니지식)
//  · 마법 레벨: 마법사 레벨÷4 · 요정 레벨÷8 · 기사 0
//  · 마법 보너스(지능): 11 이하 0 · 12~14: 1 · 15~17: 2 · 18부터 지능−15
//  · SP = 마법 레벨 + 마법 보너스 + 장비 SP(지팡이·축복)
//  · 공격 마법 피해 = 기본 피해 × (1 + (지능 + SP − 12) × 3/32)  — 지능·SP 1당 약 9.4%씩 곱으로 커짐
const intMB = i => i <= 11 ? 0 : i <= 14 ? 1 : i <= 17 ? 2 : i - 15;
const magicLv = () => CLASS === 'wizard' ? Math.floor(hero.lv / 4) : CLASS === 'elf' ? Math.floor(hero.lv / 8) : 0;
const heroSP = () => magicLv() + intMB(INV.stat().int) + INV.sp();
const spellMul = () => Math.max(1, 1 + (INV.stat().int + heroSP() - 12) * 3 / 32);
const spellCritP = S => Math.max(0.02, Math.min(0.30, 0.05 + (hero.lv - (S.lv || 1)) * 0.005 + (INV.stat().int - 12) * 0.01 - (S.mr || 0) * 0.001));   // 마법 치명타 확률 (대상마다)
function spellRange(id) { const P = SPELL[id], m = spellMul() * (P.mul || 1); return [Math.max(1, Math.round(P.dmg[0] * m)), Math.max(1, Math.round(P.dmg[1] * m))]; }
function spellHit(f, id) { const P = SPELL[id]; if (!P || !f || f.dead) return; const st = INV.stat(), ib = Math.max(0, Math.floor((st.int - 12) / 2)), sp = INV.sp(); const [fx, fy] = W2P(f.x, f.z);
  const L = P.box ? foxes.filter(m => !m.dead && !m.gone && Math.abs(m.x - f.x) <= P.box && Math.abs(m.z - f.z) <= P.box && DGLOS(f, m)) : [f], MUL = spellMul();   // 파이어볼: 대상 중심 가로·세로 6칸 (던전은 벽 너머 X)
  for (const m of L) { let d = (P.dmg[0] + Math.floor(Math.random() * (P.dmg[1] - P.dmg[0] + 1))) * MUL; const me = MOB[m.kind] && MOB[m.kind].el; let wk = false;
    if (P.el && me) { if (ATTR_OPP[me] === P.el) { d *= 1.5; wk = true; } else if (me === P.el) d *= 0.5; } if (P.mul) d *= P.mul; const cr = Math.random() < spellCritP(MOB[m.kind] || {}); if (cr) d *= 1.5; d = Math.max(1, Math.round(d));
    mobHurt(m, d, P.col, null, cr); if (wk) { const [mx, my] = W2P(m.x, m.z); floatText(mx + 16, my - headY(m) - 22, '약점!', { color: ATTR_C[P.el], size: 10 }); } }
}
function skillFxTick(dt){ for (const id in SKCD) SKCD[id] = Math.max(0, SKCD[id] - dt); mxTick(dt);
  for (let n = BOLTS.length - 1; n >= 0; n--) { const b = BOLTS[n]; b.t += dt; if (b.t >= b.dur) { BOLTS.splice(n, 1); mxHit(b.id || 'ebolt', b.f); if (b.id === 'fball') mxFbZone(b.f); if (b.onHit) b.onHit(); if (!b.cos && !b.f.dead) spellHit(b.f, b.id || 'ebolt'); } else mxBoltTrail(b, dt); }
  for (let n = SKYFX.length - 1; n >= 0; n--) { const q = SKYFX[n]; q.t += dt; if (q.kind === 'sunc' && !q.done && q.t >= q.dur) { q.done = true; mxHit('sunburst', q.f); if (!q.cos && !q.f.dead) spellHit(q.f, 'sunburst'); } if (q.t >= q.dur + (q.kind === 'sunc' ? 0.05 : 0)) SKYFX.splice(n, 1); } }
function drawMxTop(g){ for (const b of BOLTS) mxBoltDraw(g, b); mxDraw(g, false); }   // 마법은 어둠·안개 위에 (스스로 빛남)
function drawSkillFx(g){
  if (BUFF.immune > 0) { const [x, y] = W2P(hero.x, hero.z), a = Math.min(1, BUFF.immune / 1.5) * (0.55 + 0.15 * Math.sin(time * 4)); g.save(); g.globalCompositeOperation = 'lighter'; g.translate(x, y); g.scale(1, 0.5); g.globalAlpha = a; g.strokeStyle = 'rgba(255,220,120,.85)'; g.lineWidth = 1.6; g.beginPath(); g.arc(0, 0, 21, 0, 7); g.stroke(); g.globalAlpha = a * 0.5; g.lineWidth = 4; g.stroke(); g.restore(); if (Math.random() < 0.12) mxP(x + mxR(-14, 14), y - mxR(10, 60), { k: 'dot', c: '255,232,150', s: 1.6, vy: -mxR(10, 30), life: 0.6 }); }
  for (const f of foxes) if (f.slowT > 0 && !f.dead) { const [x, y] = W2P(f.x, f.z), a = Math.min(1, f.slowT / 0.5) * 0.9; g.save(); g.globalCompositeOperation = 'lighter'; g.translate(x, y); g.scale(1, 0.5); mxG(g, '150,80,255', 0, 0, 30, 0.35 * a); g.globalAlpha = a; g.strokeStyle = 'rgba(205,165,255,.9)'; g.lineWidth = 1.6; g.beginPath(); g.arc(0, 0, 22, 0, 7); g.stroke(); g.lineWidth = 1.2; g.beginPath(); for (let i = 0; i < 12; i++) { const an = i * Math.PI / 6; g.moveTo(Math.cos(an) * 18, Math.sin(an) * 18); g.lineTo(Math.cos(an) * 21, Math.sin(an) * 21); } g.moveTo(0, 0); g.lineTo(Math.cos(time * 0.9) * 16, Math.sin(time * 0.9) * 16); g.stroke(); g.restore(); if (Math.random() < 0.06) mxP(x + mxR(-12, 12), y - mxH(f) - 6, { k: 'dot', c: '170,110,255', s: 2, vy: 70, life: 0.5, fl: y }); }
  for (const f of foxes) if (f.stunT > 0 && !f.dead) { const [x, y] = W2P(f.x, f.z), top = y - headY(f) - 6, fade = Math.min(1, f.stunT / 0.3); g.save(); g.globalAlpha = fade;   // 스턴: 머리 위 노란 고리 + 도는 별 5개 (크게)
    g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(x, top, 2, x, top, 26); gr.addColorStop(0, 'rgba(255,230,110,.55)'); gr.addColorStop(1, 'rgba(255,200,60,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, top, 26, 11, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,236,140,.85)'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(x, top, 19, 7, 0, 0, 7); g.stroke(); g.globalCompositeOperation = 'source-over';
    const st = []; for (let n = 0; n < 5; n++) { const a = time * 4.2 + n * 1.2566; st.push([Math.sin(a), x + Math.cos(a) * 19, top + Math.sin(a) * 7]); } st.sort((p, q) => p[0] - q[0]);
    for (const [z, sx, sy] of st) { const sz = 13 + z * 4; g.font = `900 ${sz}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3; g.strokeStyle = 'rgba(60,40,0,.85)'; g.strokeText('★', sx, sy); g.fillStyle = z > 0 ? '#fff3a0' : '#ffd23a'; g.fillText('★', sx, sy); } g.textBaseline = 'alphabetic'; g.restore(); } }

// ============================================================ 마법 연출 v2: 마법마다 성향에 맞는 고유 이펙트 (시전 마법진 → 투사체/강림 → 명중 → 잔상) · 크고 밝게 · 어둠 속에서도 빛남
// 성향(학파)별 색: c=진한빛, l=밝은빛 (rgb) · h=글자색 · rune=마법진 문양
const MXS = {
  holy:   { c: '255,206,90',  l: '255,246,205', h: '#ffe9a0', rune: 'cross' },
  life:   { c: '80,225,110',  l: '215,255,205', h: '#9cf5a8', rune: 'leaf' },
  arcane: { c: '80,140,255',  l: '205,228,255', h: '#a8c8ff', rune: 'hex' },
  fire:   { c: '255,100,25',  l: '255,222,150', h: '#ffab6a', rune: 'flame' },
  water:  { c: '80,195,255',  l: '225,250,255', h: '#bff0ff', rune: 'snow' },
  earth:  { c: '205,140,55',  l: '255,218,150', h: '#e6bf80', rune: 'square' },
  wind:   { c: '110,235,180', l: '228,255,242', h: '#b8f8dc', rune: 'spiral' },
  dark:   { c: '155,80,255',  l: '228,205,255', h: '#c9a0ff', rune: 'star' },
  mind:   { c: '100,160,255', l: '218,236,255', h: '#a8d0ff', rune: 'lotus' },
  steel:  { c: '170,185,210', l: '245,248,255', h: '#dfe6f0', rune: 'hex' },
  blood:  { c: '255,60,60',   l: '255,205,195', h: '#ff8a7a', rune: 'star' },
};
const MX_SCH = { immune: 'holy', heal: 'life', xheal: 'life', gheal: 'life', cure: 'life', healall: 'life', shieldm: 'arcane', ebolt: 'arcane', decwt: 'wind', icedagger: 'water', turnund: 'holy', farrow: 'fire', fball: 'fire', slow: 'dark', medit: 'mind',
  clight: 'arcane', counterm: 'dark', coc: 'water', eruption: 'earth', sunburst: 'holy', light: 'holy', enchant: 'holy',
  resist_magic: 'arcane', body_mind: 'blood', tele_tree: 'life', clear_mind: 'water', resist_elem: 'earth', reduction: 'steel', bounce: 'holy', solid: 'earth', counter: 'blood', stun: 'holy' };
const MXL = [], MXP = [], MXLIT = []; let MXF = null;
const mxEO = k => 1 - (1 - k) ** 3, mxEB = k => { const c = 1.9; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };
const mxEnv = (k, i = 0.12, o = 0.35) => k < i ? k / i : k > 1 - o ? Math.max(0, (1 - k) / o) : 1;
const mxR = (a, b) => a + Math.random() * (b - a);
const MXGC = {}, MXSC = {};
function mxSmokeImg(c) { let cv = MXSC[c]; if (cv) return cv; cv = MXSC[c] = document.createElement('canvas'); cv.width = cv.height = 48; const x = cv.getContext('2d'), gr = x.createRadialGradient(24, 24, 0, 24, 24, 24); gr.addColorStop(0, `rgba(${c},.85)`); gr.addColorStop(0.5, `rgba(${c},.45)`); gr.addColorStop(1, `rgba(${c},0)`); x.fillStyle = gr; x.fillRect(0, 0, 48, 48); return cv; }
function mxGlow(c) { let cv = MXGC[c]; if (cv) return cv; cv = MXGC[c] = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(${c},1)`); gr.addColorStop(0.22, `rgba(${c},.62)`); gr.addColorStop(0.55, `rgba(${c},.2)`); gr.addColorStop(1, `rgba(${c},0)`); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return cv; }
function mxG(g, c, x, y, r, a, sy = 1) { if (a <= 0.004 || r <= 0.5) return; g.globalAlpha = Math.min(1, a); g.drawImage(mxGlow(c), x - r, y - r * sy, r * 2, r * 2 * sy); }
function mxLight(x, y, r, a) { if (MXLIT.length < 28 && a > 0.02) MXLIT.push({ x, y, r, a: Math.min(1, a) }); }
function mxFlash(c, a, life = 0.3) { if (!MXF || MXF.a * (1 - MXF.t / MXF.life) < a) MXF = { c, a, t: 0, life }; }
function mxH(e) { if (!e) return 60; if (e.h0) return e.h0; if (e === hero || e.pl || !e.kind || !MOB[e.kind]) return 72; return headY(e); }
function mxAdd(k, e, o) { const q = { k, e: e || null, wx: e ? e.x : 0, wz: e ? e.z : 0, t: 0, life: 1, sd: Math.random() * 100, ...o }; if (q.h == null) q.h = mxH(e); MXL.push(q); if (MXL.length > 160) MXL.shift(); return q; }
const mxAt = (x, z, h) => ({ x, z, dead: false, h0: h || 60 });
function mxFbZone(f) { if (!f) return; const fx = f.x, fz = f.z, n = SPELL.fball.box; mxAdd('fbzone', mxAt(fx, fz, 0), { gnd: 1, n, life: 0.9 });
  for (let q = 0; q < 7; q++) { const dx = (Math.random() * 2 - 1) * (n - 0.4), dz = (Math.random() * 2 - 1) * (n - 0.4); setTimeout(() => { const e = mxAt(fx + dx, fz + dz, 24); mxAdd('fballx', e, { life: 0.55, hy: 14 }); const [x, y] = W2P(e.x, e.z); mxBurst(x, y - 10, 8, () => ({ k: 'flame', s: mxR(4, 8), life: mxR(0.3, 0.55), dr: 2 }), 40, 140, 40); }, 50 + q * 50); } }   // 고정 위치(다른 사람 마법 연출)
function mxP(x, y, o) { if (MXP.length >= 700) return; const p = { x, y, vx: 0, vy: 0, g: 0, dr: 0, life: 0.8, s: 2, k: 'dot', c: '255,255,255', r: Math.random() * 6.28, vr: 0, ...o }; p.max = p.life; MXP.push(p); }
function mxBurst(x, y, n, o, v0 = 60, v1 = 140, up = 0, flat = 0.6) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = mxR(v0, v1); mxP(x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v * flat - up, ...(typeof o === 'function' ? o(i) : o) }); } }
const mxPos = q => W2P(q.wx, q.wz);
// ---------- 마법진 문양
function mxShape(g, s, R) { const P = (n, off) => Array.from({ length: n }, (_, i) => [Math.cos(off + i * 6.2832 / n) * R, Math.sin(off + i * 6.2832 / n) * R]);
  const poly = (L, st = 1) => { const n = L.length; for (let i = 0; i <= n; i++) { const [px, py] = L[(i * st) % n]; i ? g.lineTo(px, py) : g.moveTo(px, py); } };
  if (s === 'hex') { const L = P(6, -Math.PI / 2); g.moveTo(...L[0]); g.lineTo(...L[2]); g.lineTo(...L[4]); g.closePath(); g.moveTo(...L[1]); g.lineTo(...L[3]); g.lineTo(...L[5]); g.closePath(); }
  else if (s === 'star') poly(P(5, -Math.PI / 2), 2);
  else if (s === 'cross') { for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4, l = i % 2 ? R * 0.55 : R; g.moveTo(0, 0); g.lineTo(Math.cos(an) * l, Math.sin(an) * l); } g.moveTo(R * 0.45, 0); g.arc(0, 0, R * 0.45, 0, 7); }
  else if (s === 'flame') { for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3, c = Math.cos(an), sn = Math.sin(an); g.moveTo(c * R * 0.3, sn * R * 0.3); g.quadraticCurveTo(Math.cos(an + 0.55) * R * 0.78, Math.sin(an + 0.55) * R * 0.78, c * R, sn * R); g.quadraticCurveTo(Math.cos(an - 0.3) * R * 0.62, Math.sin(an - 0.3) * R * 0.62, c * R * 0.3, sn * R * 0.3); } }
  else if (s === 'snow') { for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3, c = Math.cos(an), sn = Math.sin(an); g.moveTo(0, 0); g.lineTo(c * R, sn * R); for (const f of [0.45, 0.72]) { const bx = c * R * f, by = sn * R * f, l = R * 0.22; g.moveTo(bx, by); g.lineTo(bx + Math.cos(an + 0.75) * l, by + Math.sin(an + 0.75) * l); g.moveTo(bx, by); g.lineTo(bx + Math.cos(an - 0.75) * l, by + Math.sin(an - 0.75) * l); } } }
  else if (s === 'square') { poly(P(4, 0)); poly(P(4, Math.PI / 4)); }
  else if (s === 'spiral') { for (let k = 0; k < 3; k++) { const o = k * 2.094; for (let i = 0; i <= 22; i++) { const tt = i / 22, an = o + tt * 3.4, rr = R * (0.12 + 0.88 * tt); i ? g.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : g.moveTo(Math.cos(an) * rr, Math.sin(an) * rr); } } }
  else { const n = s === 'lotus' ? 8 : 6, w = s === 'lotus' ? 0.34 : 0.26; for (let i = 0; i < n; i++) { const an = i * 6.2832 / n, c = Math.cos(an), sn = Math.sin(an); g.moveTo(c * R * 0.22, sn * R * 0.22); g.quadraticCurveTo(Math.cos(an + w) * R * 0.78, Math.sin(an + w) * R * 0.78, c * R, sn * R); g.quadraticCurveTo(Math.cos(an - w) * R * 0.78, Math.sin(an - w) * R * 0.78, c * R * 0.22, sn * R * 0.22); } } }
function mxCircle(g, x, y, r, S, rot, a, shape, glowA = 0.6) { g.save(); g.translate(x, y); g.scale(1, 0.5); g.globalCompositeOperation = 'lighter';
  mxG(g, S.c, 0, 0, r * 1.3, a * glowA);
  g.globalAlpha = a; g.lineCap = 'round'; g.strokeStyle = `rgba(${S.l},.95)`; g.lineWidth = 2.6; g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke();
  g.strokeStyle = `rgba(${S.c},.95)`; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, r * 0.8, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, r * 0.34, 0, 7); g.stroke();
  g.save(); g.rotate(rot); g.lineWidth = 1.7; g.strokeStyle = `rgba(${S.l},.92)`; g.beginPath(); for (let i = 0; i < 24; i++) { const an = i * Math.PI / 12, r0 = r * 0.83, r1 = r * (i % 3 ? 0.9 : 0.97); g.moveTo(Math.cos(an) * r0, Math.sin(an) * r0); g.lineTo(Math.cos(an) * r1, Math.sin(an) * r1); } g.stroke();
  g.fillStyle = `rgba(${S.l},.95)`; for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2 + 0.4; g.beginPath(); g.arc(Math.cos(an) * r * 0.9, Math.sin(an) * r * 0.9, 2.4, 0, 7); g.fill(); } g.restore();
  g.save(); g.rotate(-rot * 0.7); g.strokeStyle = `rgba(${S.l},.95)`; g.lineWidth = 1.6; g.beginPath(); mxShape(g, shape || S.rune, r * 0.78); g.stroke(); g.restore(); g.restore(); }
// 작은 룬 글자 (선으로 그림 · 글꼴 없이)
const MX_RUNES = [[[0, -1, 0, 1], [0, -0.4, 0.6, -1], [0, 0.1, 0.6, -0.5]], [[0, -1, 0, 1], [0, -1, 0.6, -0.3], [0.6, -0.3, 0, 0.4]], [[-0.5, -1, -0.5, 1], [0.5, -1, 0.5, 1], [-0.5, -0.3, 0.5, 0.3]], [[0, -1, 0, 1], [-0.6, -0.4, 0, 0], [0.6, -0.4, 0, 0]], [[-0.6, -1, 0.6, 1], [0.6, -1, -0.6, 1], [0, -1, 0, 1]], [[0, -1, 0.6, 0], [0.6, 0, 0, 1], [0, 1, -0.6, 0], [-0.6, 0, 0, -1]]];
function mxRune(g, i, x, y, s) { g.beginPath(); for (const [a, b, c, d] of MX_RUNES[i % MX_RUNES.length]) { g.moveTo(x + a * s, y + b * s); g.lineTo(x + c * s, y + d * s); } g.stroke(); }
function mxJag(x0, y0, x1, y1, n, amp) { const L = [[x0, y0]]; for (let i = 1; i < n; i++) { const t = i / n; L.push([x0 + (x1 - x0) * t + (Math.random() - 0.5) * amp * Math.sin(t * Math.PI) * 2, y0 + (y1 - y0) * t + (Math.random() - 0.5) * amp * 0.25]); } L.push([x1, y1]); return L; }
function mxStroke(g, L) { g.beginPath(); L.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); }

// ---------- 시전: 발밑 마법진 + 빛기둥 + 떠오르는 빛 + 마법 이름
function mxCast(id, e, noName) { const sch = MX_SCH[id] || 'arcane', S = MXS[sch], c = (SK[id] && SK[id].circle) || 1, r = 26 + Math.min(6, c) * 4.5, [x, y] = W2P(e.x, e.z);
  mxAdd('circle', e, { gnd: 1, sch, r, life: 0.55 + c * 0.06 }); mxAdd('cpillar', e, { sch, r, life: 0.5 + c * 0.05 });
  for (let i = 0; i < 10 + c * 2; i++) { const an = Math.random() * 6.283; mxP(x + Math.cos(an) * r * 0.8, y + Math.sin(an) * r * 0.4, { k: 'dot', c: S.l, s: mxR(1.6, 2.8), vy: -mxR(50, 110), vx: Math.cos(an) * 8, life: mxR(0.5, 0.9), dr: 0.6 }); }
  if (!noName && SK[id]) floatText(x, y - (e === hero || e.pl ? 112 : mxH(e) + 30), SK[id].name, { color: S.h, size: 15, big: true, life: 1.15, rise: 26 });
  mxLight(x, y - 30, 70, 0.6); }
// ---------- 투사체 (BOLTS: 위치·궤적)
function mxBoltPos(b) { const f = b.f, [x1, y10] = W2P(f.x, f.z), y1 = y10 - Math.max(26, Math.min(60, mxH(f) * 0.55)), k = Math.min(1, b.t / b.dur), arc = b.id === 'fball' ? 46 : b.id === 'farrow' ? 18 : 0;
  const x = b.x0 + (x1 - b.x0) * k, y = b.y0 + (y1 - b.y0) * k - Math.sin(k * Math.PI) * arc, k2 = Math.min(1, k + 0.02), x2 = b.x0 + (x1 - b.x0) * k2, y2 = b.y0 + (y1 - b.y0) * k2 - Math.sin(k2 * Math.PI) * arc;
  return [x, y, Math.atan2(y2 - y, x2 - x || 0.001)]; }
function mxBoltTrail(b, dt) { const [x, y, an] = mxBoltPos(b), bx = -Math.cos(an), by = -Math.sin(an); b.em = (b.em || 0) + dt;
  const n = Math.floor(b.em / 0.016); if (!n) return; b.em -= n * 0.016;
  for (let i = 0; i < n; i++) switch (b.id) {
    case 'ebolt': mxP(x + mxR(-3, 3), y + mxR(-3, 3), { k: 'dot', c: '120,170,255', s: mxR(2, 3.4), vx: bx * 30 + mxR(-20, 20), vy: by * 30 + mxR(-20, 20), life: mxR(0.25, 0.45), dr: 3 }); if (Math.random() < 0.35) mxP(x, y, { k: 'spark', c: '200,225,255', s: 1.2, vx: mxR(-160, 160), vy: mxR(-160, 160), life: 0.15 }); break;
    case 'icedagger': mxP(x + mxR(-2, 2), y + mxR(-2, 2), { k: 'dot', c: '200,245,255', s: mxR(1.5, 2.6), vx: bx * 20, vy: by * 20 + 10, life: mxR(0.3, 0.55), dr: 2 }); if (Math.random() < 0.4) mxP(x, y, { k: 'snow', c: '235,252,255', s: mxR(2.5, 4), vx: mxR(-20, 20), vy: mxR(5, 25), vr: mxR(-3, 3), life: mxR(0.5, 0.8) }); break;
    case 'farrow': mxP(x + bx * 8, y + by * 8, { k: 'flame', s: mxR(3, 5), vx: bx * 40 + mxR(-15, 15), vy: by * 40 - mxR(10, 40), life: mxR(0.22, 0.4) }); if (Math.random() < 0.5) mxP(x, y, { k: 'ember', c: '255,170,60', s: 1.6, vx: mxR(-40, 40), vy: -mxR(20, 70), g: 40, life: mxR(0.4, 0.8) }); break;
    case 'fball': for (let j = 0; j < 2; j++) mxP(x + mxR(-6, 6), y + mxR(-6, 6), { k: 'flame', s: mxR(5, 9), vx: bx * 60 + mxR(-25, 25), vy: by * 60 - mxR(10, 50), life: mxR(0.3, 0.5) }); if (Math.random() < 0.45) mxP(x, y, { k: 'smoke', c: '60,50,46', s: mxR(4, 7), vx: bx * 30, vy: -mxR(10, 30), life: mxR(0.6, 1.0), a0: 0.4 }); if (Math.random() < 0.5) mxP(x, y, { k: 'ember', c: '255,190,90', s: 1.8, vx: mxR(-60, 60), vy: -mxR(20, 90), g: 60, life: mxR(0.5, 0.9) }); break;
    case 'wind': mxP(x + mxR(-4, 4), y + mxR(-4, 4), { k: 'dot', c: '170,255,215', s: mxR(1.6, 2.6), vx: bx * 40 + mxR(-20, 20), vy: by * 40 + mxR(-20, 20), life: mxR(0.2, 0.4), dr: 3 }); if (Math.random() < 0.3) mxP(x, y, { k: 'leaf', c: '160,230,170', s: 3, vx: mxR(-40, 40), vy: mxR(-40, 40), vr: mxR(-8, 8), life: 0.5 }); break;
    default: mxP(x, y, { k: 'dot', c: '160,210,255', s: 2.4, vx: bx * 30, vy: by * 30, life: 0.3 }); } }
function mxBoltDraw(g, b) { const [x, y, an] = mxBoltPos(b); g.save(); g.globalCompositeOperation = 'lighter';
  switch (b.id) {
    case 'icedagger': { mxG(g, '120,215,255', x, y, 34, 0.75); g.save(); g.translate(x, y); g.rotate(an); g.globalAlpha = 1;
      const gr = g.createLinearGradient(-16, 0, 20, 0); gr.addColorStop(0, 'rgba(120,200,255,.2)'); gr.addColorStop(0.6, 'rgba(210,248,255,.95)'); gr.addColorStop(1, '#ffffff'); g.fillStyle = gr;
      g.beginPath(); g.moveTo(22, 0); g.lineTo(-2, -6); g.lineTo(-16, 0); g.lineTo(-2, 6); g.closePath(); g.fill(); g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 1; g.beginPath(); g.moveTo(20, 0); g.lineTo(-14, 0); g.stroke();
      g.strokeStyle = 'rgba(150,225,255,.9)'; g.beginPath(); g.moveTo(-2, -6); g.lineTo(-7, -10); g.moveTo(-2, 6); g.lineTo(-7, 10); g.stroke(); g.restore(); break; }
    case 'farrow': { const fl = 1 + Math.sin(time * 40) * 0.12; mxG(g, '255,120,30', x, y, 42, 0.8); g.save(); g.translate(x, y); g.rotate(an);
      for (const [c, l, w] of [['255,70,10', 30, 8], ['255,150,40', 22, 5.5], ['255,240,190', 12, 3]]) { const gr = g.createLinearGradient(-l * fl, 0, 8, 0); gr.addColorStop(0, `rgba(${c},0)`); gr.addColorStop(1, `rgba(${c},.95)`); g.fillStyle = gr; g.beginPath(); g.moveTo(10, 0); g.quadraticCurveTo(-l * 0.4, -w, -l * fl, Math.sin(time * 30) * 2); g.quadraticCurveTo(-l * 0.4, w, 10, 0); g.fill(); }
      g.globalCompositeOperation = 'source-over'; g.strokeStyle = '#3a2410'; g.lineWidth = 2; g.beginPath(); g.moveTo(-14, 0); g.lineTo(8, 0); g.stroke(); g.fillStyle = '#ffe6a0'; g.beginPath(); g.moveTo(15, 0); g.lineTo(7, -4); g.lineTo(7, 4); g.closePath(); g.fill(); g.restore(); mxLight(x, y, 70, 0.6); break; }
    case 'fball': { const fl = 1 + Math.sin(time * 33) * 0.08 + Math.sin(time * 51) * 0.05; mxG(g, '255,80,10', x, y, 62 * fl, 0.85); mxG(g, '255,160,50', x, y, 30 * fl, 0.95);
      g.save(); g.translate(x, y); g.rotate(an); for (let i = 0; i < 5; i++) { const o = (i - 2) * 3.5, l = 26 + Math.sin(time * 25 + i * 1.7) * 6; g.globalAlpha = 0.75; g.fillStyle = i % 2 ? 'rgba(255,120,30,.8)' : 'rgba(255,200,80,.75)'; g.beginPath(); g.ellipse(-l * 0.5, o, l * 0.6, 5, 0, 0, 7); g.fill(); } g.restore();
      mxG(g, '255,240,190', x, y, 14 * fl, 1); g.globalAlpha = 1; g.fillStyle = '#fffbe8'; g.beginPath(); g.arc(x, y, 5.5, 0, 7); g.fill(); mxLight(x, y, 140, 0.85); break; }
    case 'wind': { g.save(); g.translate(x, y); g.rotate(an); mxG(g, '120,240,180', 0, 0, 30, 0.6); g.globalAlpha = 0.95; for (const [r0, w, c] of [[16, 5, 'rgba(160,255,210,.85)'], [12, 3, 'rgba(240,255,250,.95)']]) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.arc(-6, 0, r0, -1.1, 1.1); g.stroke(); } g.restore(); break; }
    default: { // 에너지 볼트: 비전 구체 + 도는 빛 + 전기 줄기
      mxG(g, '70,120,255', x, y, 36, 0.8); mxG(g, '170,210,255', x, y, 15, 1); g.globalAlpha = 1; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, 4.5, 0, 7); g.fill();
      for (let i = 0; i < 3; i++) { const a2 = time * 14 + i * 2.094; mxG(g, '200,225,255', x + Math.cos(a2) * 11, y + Math.sin(a2) * 6, 5, 0.9); }
      g.strokeStyle = 'rgba(210,235,255,.9)'; g.lineWidth = 1.1; for (let i = 0; i < 2; i++) { const a2 = Math.random() * 6.283; mxStroke(g, mxJag(x, y, x + Math.cos(a2) * 18, y + Math.sin(a2) * 14, 4, 8)); } mxLight(x, y, 70, 0.6); } }
  g.restore(); }

// ---------- 명중
function mxHit(id, f) { if (!f) return; const [x, y0] = W2P(f.x, f.z), h = mxH(f), y = y0 - Math.max(26, Math.min(60, h * 0.55));
  switch (id) {
    case 'ebolt': mxAdd('burst', f, { c: '120,170,255', l: '220,235,255', life: 0.45, r: 42, n: 10, hy: y0 - y }); mxAdd('ring', f, { gnd: 1, c: '120,170,255', r0: 6, r1: 52, w: 3, life: 0.45 });
      mxBurst(x, y, 18, () => ({ k: 'spark', c: '190,220,255', s: 1.4, life: mxR(0.18, 0.35), dr: 2 }), 120, 260); mxBurst(x, y, 10, () => ({ k: 'dot', c: '110,160,255', s: mxR(2, 3.5), life: mxR(0.3, 0.6), dr: 3 }), 30, 90);
      shake = Math.max(shake, 0.08); break;
    case 'icedagger': mxAdd('glow', f, { c: '120,215,255', r: 46, life: 0.4, hy: y0 - y }); mxAdd('ring', f, { gnd: 1, c: '200,245,255', r0: 6, r1: 46, w: 3, life: 0.5 });
      mxBurst(x, y, 16, () => ({ k: 'shard', c: Math.random() < 0.5 ? '200,240,255' : '130,205,255', s: mxR(3, 6), g: 380, vr: mxR(-12, 12), life: mxR(0.5, 0.8), fl: y0 + mxR(-4, 6) }), 70, 170, 90);
      mxBurst(x, y, 12, () => ({ k: 'snow', c: '235,252,255', s: mxR(2.5, 4.5), vr: mxR(-3, 3), g: 12, life: mxR(0.7, 1.2), dr: 2 }), 20, 70); break;
    case 'farrow': mxAdd('glow', f, { c: '255,120,30', r: 54, life: 0.45, hy: y0 - y }); mxAdd('scorch', f, { gnd: 1, r: 18, life: 1.6 });
      mxBurst(x, y, 16, () => ({ k: 'flame', s: mxR(4, 7), life: mxR(0.3, 0.55), dr: 3 }), 40, 110, 50); mxBurst(x, y, 14, () => ({ k: 'ember', c: '255,180,70', s: 1.8, g: 120, life: mxR(0.5, 1.0) }), 50, 150, 110);
      shake = Math.max(shake, 0.08); break;
    case 'fball': { mxFlash('255,150,60', 0.22, 0.32); mxAdd('fballx', f, { life: 0.7, hy: y0 - y }); mxAdd('ring', f, { gnd: 1, c: '255,190,110', r0: 10, r1: 118, w: 5, life: 0.55 }); mxAdd('ring', f, { gnd: 1, c: '255,120,40', r0: 4, r1: 80, w: 3, life: 0.7 }); mxAdd('scorch', f, { gnd: 1, r: 46, life: 3.2 });
      mxBurst(x, y, 34, () => ({ k: 'flame', s: mxR(6, 12), life: mxR(0.35, 0.7), dr: 2.5 }), 60, 200, 60); mxBurst(x, y - 10, 12, () => ({ k: 'smoke', c: '86,74,66', s: mxR(7, 12), life: mxR(1.0, 1.7), dr: 1.5, a0: 0.32, vy: -mxR(20, 50) }), 20, 70, 50);
      mxBurst(x, y, 28, () => ({ k: 'ember', c: '255,200,100', s: 2, g: 200, life: mxR(0.7, 1.3), fl: y0 + mxR(0, 18) }), 80, 260, 160);
      for (const m of foxes) if (m !== f && !m.dead && !m.gone && cheb(m.i, m.j, f.i, f.j) <= 1) { const [mx, my] = W2P(m.x, m.z); mxBurst(mx, my - mxH(m) * 0.5, 8, () => ({ k: 'flame', s: mxR(4, 7), life: mxR(0.3, 0.5), dr: 3 }), 30, 80, 40); }
      shake = Math.max(shake, 0.3); hitstop = Math.max(hitstop, 0.05); break; }
    case 'clight': { mxFlash('225,240,255', 0.13, 0.22); mxAdd('lightning', f, { life: 0.42, c: '170,205,255' }); mxAdd('ring', f, { gnd: 1, c: '170,210,255', r0: 6, r1: 54, w: 3, life: 0.45 }); mxAdd('arc', f, { life: 0.8 }); mxAdd('scorch', f, { gnd: 1, r: 22, life: 1.8 });
      mxBurst(x, y0 - 8, 14, () => ({ k: 'spark', c: '220,235,255', s: 1.4, g: 260, life: mxR(0.22, 0.4) }), 80, 200, 100); shake = Math.max(shake, 0.1); hitstop = Math.max(hitstop, 0.03); break; }
    case 'coc': { mxFlash('190,235,255', 0.06, 0.25); mxAdd('icespikes', f, { life: 0.95, sp: Array.from({ length: 7 }, (_, i) => i ? { a: (i - 1) * 1.047 + mxR(-0.2, 0.2), d: mxR(15, 25), h: mxR(20, 34), w: mxR(5, 7), dl: i * 0.035 } : { a: 0, d: 0, h: 50, w: 9.5, dl: 0 }) });
      mxAdd('ring', f, { gnd: 1, c: '210,245,255', r0: 6, r1: 50, w: 3, life: 0.5 }); mxAdd('frost', f, { gnd: 1, r: 36, life: 1.3 });
      mxBurst(x, y0 - 10, 8, () => ({ k: 'smoke', c: '210,240,255', s: mxR(5, 8), life: mxR(0.6, 1.0), dr: 2, a0: 0.22 }), 20, 60, 20); mxBurst(x, y0 - 16, 11, () => ({ k: 'snow', c: '240,252,255', s: mxR(2, 3.5), vr: mxR(-3, 3), g: 20, life: mxR(0.7, 1.1), dr: 1.5 }), 20, 70, 40);
      shake = Math.max(shake, 0.08); break; }
    case 'eruption': { mxFlash('255,150,60', 0.05, 0.28); mxAdd('crack', f, { gnd: 1, life: 2.0, L: Array.from({ length: 7 }, (_, i) => { const a = i * 0.898 + mxR(-0.25, 0.25), len = mxR(30, 54); return mxJag(0, 0, Math.cos(a) * len, Math.sin(a) * len * 0.5, 6, 14); }) });
      mxAdd('rockspikes', f, { life: 1.15, sp: Array.from({ length: 6 }, (_, i) => ({ a: i * 1.047 + mxR(-0.3, 0.3), d: i ? mxR(12, 27) : 0, h: i ? mxR(14, 25) : 33, w: i ? mxR(6, 9) : 11.5, dl: i * 0.03, tone: mxR(0.75, 1.1) })) });
      mxBurst(x, y0 - 6, 11, () => ({ k: 'ember', c: '255,150,40', s: mxR(1.6, 2.4), g: 320, life: mxR(0.5, 0.9), fl: y0 + mxR(0, 10) }), 40, 130, 150); mxBurst(x, y0 - 6, 8, () => ({ k: 'rock', c: Math.random() < 0.5 ? '120,86,52' : '86,62,40', s: mxR(2, 4), g: 520, vr: mxR(-10, 10), life: mxR(0.6, 0.9), fl: y0 + mxR(0, 10) }), 40, 110, 150);
      mxBurst(x, y0 - 4, 8, () => ({ k: 'smoke', c: '140,112,80', s: mxR(5, 9), life: mxR(0.8, 1.2), dr: 1.8, a0: 0.28 }), 20, 65, 20); shake = Math.max(shake, 0.18); hitstop = Math.max(hitstop, 0.03); break; }
    case 'sunburst': { mxFlash('255,245,210', 0.14, 0.3); mxAdd('flare', f, { life: 0.75, hy: y0 - y }); mxAdd('ring', f, { gnd: 1, c: '255,225,140', r0: 6, r1: 76, w: 3.5, life: 0.6 }); mxAdd('scorch', f, { gnd: 1, r: 22, life: 2.0 });
      mxBurst(x, y, 15, () => ({ k: 'ember', c: '255,230,140', s: 1.6, g: 60, life: mxR(0.5, 0.9), dr: 1 }), 50, 150); mxBurst(x, y, 8, () => ({ k: 'dot', c: '255,240,190', s: mxR(2, 3), life: mxR(0.4, 0.7), dr: 2 }), 30, 90);
      shake = Math.max(shake, 0.12); hitstop = Math.max(hitstop, 0.03); break; }
    case 'wind': mxAdd('windring', f, { life: 0.7, c: '170,255,220' }); mxAdd('ring', f, { gnd: 1, c: '190,255,225', r0: 6, r1: 44, w: 3, life: 0.45 }); mxBurst(x, y, 12, () => ({ k: 'leaf', c: Math.random() < 0.5 ? '150,230,160' : '210,255,220', s: mxR(2.5, 4), vr: mxR(-9, 9), life: mxR(0.5, 0.9), dr: 2 }), 60, 160); mxBurst(x, y, 10, () => ({ k: 'spark', c: '200,255,230', s: 1.2, life: 0.25, dr: 2 }), 100, 220); break;
    case 'rock': mxAdd('rockspikes', f, { life: 0.9, sp: Array.from({ length: 4 }, (_, i) => ({ a: i * 1.57 + mxR(-0.3, 0.3), d: i ? mxR(8, 16) : 0, h: i ? mxR(16, 26) : 34, w: i ? mxR(6, 9) : 11, dl: i * 0.03, tone: mxR(0.8, 1.05) })) }); mxBurst(x, y0 - 4, 10, () => ({ k: 'smoke', c: '130,104,76', s: mxR(5, 9), life: mxR(0.6, 1), dr: 2, a0: 0.4 }), 20, 70, 20); mxBurst(x, y0 - 6, 8, () => ({ k: 'rock', c: '110,84,56', s: mxR(2, 4), g: 480, vr: mxR(-9, 9), life: mxR(0.6, 0.9), fl: y0 + 4 }), 40, 110, 150); shake = Math.max(shake, 0.1); break;
    default: mxAdd('glow', f, { c: '200,220,255', r: 40, life: 0.4, hy: y0 - y }); }
  mxLight(x, y0 - 30, id === 'fball' ? 230 : id === 'sunburst' || id === 'clight' ? 150 : 110, 1); }
// 선버스트 모으기 (발동 전 0.6초)
function mxSunCharge(f, dur) { mxAdd('sunc', f, { life: dur }); }
// ---------- 버프·회복·정령마법·기사 기술: 대상(나/파티원/몬스터)에게
function mxSelf(id, e) { if (!e) return; const [x, y] = W2P(e.x, e.z), h = mxH(e), S = MXS[MX_SCH[id] || 'arcane'];
  switch (id) {
    case 'heal': case 'xheal': { const big = id === 'xheal'; mxAdd('healrain', e, { life: big ? 1.3 : 1.05, big }); mxAdd('ring', e, { gnd: 1, c: '120,255,150', r0: 8, r1: big ? 62 : 46, w: 3, life: 0.7 }); if (big) mxAdd('ring', e, { gnd: 1, c: '255,240,170', r0: 4, r1: 40, w: 2, life: 0.9 });
      for (let i = 0; i < (big ? 22 : 14); i++) mxP(x + mxR(-22, 22), y - mxR(0, 20), { k: 'dot', c: i % 3 ? '140,255,160' : '255,240,170', s: mxR(1.8, 3), vy: -mxR(40, 90), wob: 6, life: mxR(0.7, 1.2), dr: 0.5 });
      if (big) for (let i = 0; i < 8; i++) mxP(x + mxR(-18, 18), y - mxR(0, 30), { k: 'leaf', c: i % 2 ? '120,220,110' : '170,240,130', s: mxR(3, 4.5), vx: mxR(-30, 30), vy: -mxR(30, 70), vr: mxR(-6, 6), wob: 5, life: mxR(1, 1.5), dr: 0.6 });
      mxLight(x, y - 40, big ? 110 : 80, 0.8); break; }
    case 'gheal': case 'healall': mxAdd('pillar', e, { c: '120,255,150', l: '235,255,215', w: 46, life: 1.3 }); mxAdd('circle', e, { gnd: 1, sch: 'life', r: 58, life: 1.3 }); mxAdd('healrain', e, { life: 1.3, big: true });
      mxAdd('ring', e, { gnd: 1, c: '255,240,170', r0: 10, r1: 90, w: 4, life: 0.9 }); mxFlash('180,255,190', 0.08, 0.4);
      for (let i = 0; i < 26; i++) mxP(x + mxR(-28, 28), y - mxR(0, 30), { k: 'dot', c: i % 3 ? '150,255,170' : '255,240,170', s: mxR(2, 3.4), vy: -mxR(60, 140), wob: 7, life: mxR(0.9, 1.5), dr: 0.4 });
      for (let i = 0; i < 12; i++) mxP(x + mxR(-24, 24), y - mxR(0, 40), { k: 'leaf', c: i % 2 ? '120,220,110' : '190,245,140', s: mxR(3, 5), vx: mxR(-40, 40), vy: -mxR(40, 90), vr: mxR(-6, 6), wob: 5, life: mxR(1.2, 1.8), dr: 0.6 }); mxLight(x, y - 40, 160, 1); break;
    case 'cure': mxAdd('ring', e, { gnd: 1, c: '200,255,220', r0: 6, r1: 50, w: 3, life: 0.7 }); mxAdd('glow', e, { c: '140,255,180', r: 44, life: 0.8, hy: h * 0.5 });
      for (let i = 0; i < 14; i++) mxP(x + mxR(-18, 18), y - mxR(0, 50), { k: 'bubble', c: '170,255,200', s: mxR(2.5, 5), vy: -mxR(30, 70), wob: 8, life: mxR(0.8, 1.3) });
      mxBurst(x, y - h * 0.5, 12, () => ({ k: 'smoke', c: '110,60,130', s: mxR(4, 7), life: mxR(0.6, 1), dr: 2, a0: 0.5 }), 60, 120); break;
    case 'shieldm': mxAdd('dome', e, { life: 1.4, c: '110,170,255', l: '210,232,255' }); mxAdd('ring', e, { gnd: 1, c: '140,190,255', r0: 10, r1: 52, w: 3, life: 0.6 }); mxLight(x, y - 36, 90, 0.7); break;
    case 'decwt': mxAdd('windring', e, { life: 1.3, c: '150,255,210' }); for (let i = 0; i < 12; i++) mxP(x + mxR(-20, 20), y - mxR(0, 20), { k: 'feather', c: '245,255,250', s: mxR(4, 6), vx: mxR(-20, 20), vy: -mxR(40, 80), vr: mxR(-3, 3), wob: 6, life: mxR(1.1, 1.7), dr: 0.8 }); break;
    case 'medit': mxAdd('lotus', e, { gnd: 1, life: 1.9, r: 46 }); mxAdd('mindorb', e, { life: 1.9 }); mxLight(x, y - 30, 90, 0.7); break;
    case 'counterm': mxAdd('runering', e, { life: 1.5, c: '170,110,255', l: '235,220,255', mirror: true }); mxAdd('circle', e, { gnd: 1, sch: 'dark', r: 40, life: 1.2 }); break;
    case 'resist_magic': mxAdd('runering', e, { life: 1.3, c: '110,150,255', l: '220,235,255' }); mxAdd('circle', e, { gnd: 1, sch: 'arcane', r: 38, life: 1.1 }); break;
    case 'body_mind': mxAdd('lifemana', e, { life: 1.3 }); break;
    case 'tele_tree': mxAdd('leafstorm', e, { life: 1.6 }); mxAdd('pillar', e, { c: '110,230,120', l: '220,255,210', w: 40, life: 1.1 }); mxAdd('circle', e, { gnd: 1, sch: 'life', r: 44, life: 1.2 }); break;
    case 'clear_mind': mxAdd('ripple', e, { life: 1.4 }); for (let i = 0; i < 10; i++) mxP(x + mxR(-16, 16), y - h - mxR(0, 10), { k: 'dot', c: '150,230,255', s: mxR(1.6, 2.6), vy: mxR(30, 70), g: 80, life: mxR(0.6, 1) }); break;
    case 'resist_elem': mxAdd('orbit4', e, { life: 1.5 }); mxAdd('circle', e, { gnd: 1, sch: 'earth', r: 40, life: 1.3 }); break;
    case 'reduction': mxAdd('plates', e, { life: 1.1 }); mxAdd('ring', e, { gnd: 1, c: '210,220,235', r0: 8, r1: 54, w: 4, life: 0.5 }); break;
    case 'bounce': mxAdd('chev', e, { life: 1.1, c: '255,220,110' }); break;
    case 'solid': mxAdd('stonewall', e, { life: 1.3 }); mxAdd('ring', e, { gnd: 1, c: '220,170,100', r0: 8, r1: 56, w: 4, life: 0.6 }); shake = Math.max(shake, 0.1); break;
    case 'counter': mxAdd('thorns', e, { life: 1.0 }); mxAdd('ring', e, { gnd: 1, c: '255,90,80', r0: 8, r1: 60, w: 3, life: 0.6 }); break;
    case 'immune': mxAdd('ring', e, { gnd: 1, c: '255,224,130', r0: 4, r1: 40, w: 3, life: 0.6 }); mxAdd('glow', e, { c: '255,214,110', r: 34, life: 0.8, hy: h * 0.55 }); for (let i = 0; i < 14; i++) { const an = i * 0.449; mxP(x + Math.cos(an) * 20, y - h * 0.5 + Math.sin(an) * 26, { k: 'dot', c: '255,236,160', s: mxR(1.6, 2.6), vx: -Math.cos(an) * 18, vy: -Math.sin(an) * 22 - 10, life: mxR(0.5, 0.8) }); } break;
    case 'turnund': mxAdd('pillar', e, { c: '255,215,110', l: '255,252,230', w: 54, life: 1.25 }); mxAdd('cross', e, { life: 1.3 }); mxAdd('ring', e, { gnd: 1, c: '255,225,120', r0: 8, r1: 104, w: 6, life: 0.75 }); mxAdd('ring', e, { gnd: 1, c: '255,250,225', r0: 4, r1: 66, w: 3, life: 0.6 }); mxFlash('255,240,190', 0.22, 0.4);
      mxBurst(x, y - h * 0.5, 30, () => ({ k: 'dot', c: Math.random() < 0.5 ? '255,236,150' : '255,255,235', s: mxR(2, 4), life: mxR(0.6, 1.1), dr: 1.5, vy: -mxR(40, 120) }), 50, 170, 60); mxPurge(e); break;
    case 'turnund_x': mxAdd('pillar', e, { c: '150,145,165', l: '215,210,228', w: 20, life: 0.42 }); mxAdd('glow', e, { c: '110,50,170', r: 42, life: 0.7, hy: h * 0.5 }); mxAdd('ring', e, { gnd: 1, c: '140,80,200', r0: 6, r1: 58, w: 5, life: 0.5 });
      for (let i = 0; i < 16; i++) mxP(x + mxR(-10, 10), y - h * 0.75 + mxR(-8, 8), { k: 'dot', c: '205,200,215', s: mxR(1.8, 3), vx: mxR(-110, 110), vy: -mxR(10, 70), g: 340, life: mxR(0.55, 0.9) });   // 깨진 빛 조각이 떨어짐
      for (let i = 0; i < 6; i++) mxP(x + mxR(-14, 14), y - mxR(8, h), { k: 'smoke', c: '70,34,96', s: mxR(5, 9), vx: mxR(-20, 20), vy: -mxR(8, 26), life: mxR(0.7, 1.1), a0: 0.5 }); break;
    case 'slow': mxAdd('clock', e, { gnd: 1, life: 1.2, r: 34 }); for (let i = 0; i < 12; i++) mxP(x + mxR(-18, 18), y - h - mxR(10, 30), { k: 'dot', c: '170,110,255', s: mxR(2, 3.2), vy: mxR(60, 120), life: mxR(0.5, 0.8), fl: y }); break;
    default: mxAdd('glow', e, { c: S.c, r: 46, life: 0.8, hy: h * 0.5 }); mxAdd('ring', e, { gnd: 1, c: S.l, r0: 8, r1: 50, w: 3, life: 0.6 }); }
  }
// 언데드가 정화될 때 (턴 언데드 성공)
function mxPurge(f) { const [x, y] = W2P(f.x, f.z), h = mxH(f); for (let i = 0; i < 10; i++) mxP(x + mxR(-14, 14), y - mxR(10, h), { k: 'wisp', c: '235,245,255', s: mxR(3, 5), vy: -mxR(40, 90), wob: 4, life: mxR(1, 1.6), dr: 0.3 }); mxBurst(x, y - h * 0.5, 22, () => ({ k: 'dot', c: '255,245,200', s: mxR(2, 3.5), life: mxR(0.5, 1), dr: 2 }), 40, 140); }

// ---------- 그리기: 바닥(몸보다 먼저) / 공중(몸 위)
function mxDraw(g, gnd) { g.save();
  for (const q of MXL) { if (!!q.gnd !== gnd) continue; const [x, y] = mxPos(q), k = Math.min(1, q.t / q.life), h = q.h || 60;
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1; g.lineCap = 'round';
    switch (q.k) {
      case 'circle': { const S = MXS[q.sch] || MXS.arcane, sc = mxEB(Math.min(1, q.t / 0.2)), a = mxEnv(k, 0.06, 0.4); mxCircle(g, x, y, q.r * sc, S, time * 1.8 + q.sd, a, S.rune); break; }
      case 'cpillar': { const S = MXS[q.sch] || MXS.arcane, a = mxEnv(k, 0.1, 0.55), H = 70 + q.r * 1.3, w = q.r * 0.75; mxG(g, S.c, x, y - H * 0.42, w, 0.42 * a, H / w * 0.5); mxG(g, S.l, x, y - H * 0.3, w * 0.42, 0.55 * a, H / w * 0.75); mxG(g, S.l, x, y - 4, q.r * 0.9, 0.35 * a, 0.45); break; }
      case 'fbzone': { const a = k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88, hw = 2 * q.n * K, hh = q.n * K; g.translate(x, y); g.beginPath(); g.moveTo(0, -hh); g.lineTo(hw, 0); g.lineTo(0, hh); g.lineTo(-hw, 0); g.closePath(); const gr = g.createRadialGradient(0, 0, 0, 0, 0, hw); gr.addColorStop(0, `rgba(255,170,60,${0.42 * a})`); gr.addColorStop(0.7, `rgba(255,90,20,${0.24 * a})`); gr.addColorStop(1, `rgba(255,60,10,${0.1 * a})`); g.fillStyle = gr; g.fill(); g.strokeStyle = `rgba(255,205,120,${0.9 * a})`; g.lineWidth = 2.2; g.stroke(); break; }
      case 'ring': { const r = q.r0 + (q.r1 - q.r0) * mxEO(k), a = 1 - k; g.translate(x, y); g.scale(1, 0.5); g.globalAlpha = a; g.strokeStyle = `rgba(${q.c},1)`; g.lineWidth = q.w * (1 - k * 0.6); g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); g.globalAlpha = a * 0.45; g.lineWidth = q.w * 3.2; g.stroke(); break; }
      case 'scorch': { const a = Math.min(1, (1 - k) * 1.6); g.globalCompositeOperation = 'source-over'; g.translate(x, y); g.scale(1, 0.5); const gr = g.createRadialGradient(0, 0, 0, 0, 0, q.r); gr.addColorStop(0, `rgba(20,12,8,${0.55 * a})`); gr.addColorStop(0.7, `rgba(30,18,10,${0.3 * a})`); gr.addColorStop(1, 'rgba(30,18,10,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, q.r, 0, 7); g.fill();
        if (k < 0.45) { g.globalCompositeOperation = 'lighter'; mxG(g, '255,110,30', 0, 0, q.r * 0.8, (0.45 - k) * 1.4); } break; }
      case 'frost': { const a = mxEnv(k, 0.08, 0.5); g.translate(x, y); g.scale(1, 0.5); mxG(g, '170,230,255', 0, 0, q.r, 0.55 * a); g.strokeStyle = `rgba(230,250,255,${0.7 * a})`; g.lineWidth = 1.4; g.beginPath(); mxShape(g, 'snow', q.r * 0.8); g.stroke(); break; }
      case 'crack': { const grow = Math.min(1, q.t / 0.22), heat = Math.max(0, 1 - q.t / (q.life * 0.75)), a = Math.min(1, (1 - k) * 3); g.translate(x, y);
        g.globalCompositeOperation = 'source-over'; g.strokeStyle = `rgba(28,18,10,${0.75 * a})`; g.lineWidth = 4; for (const L of q.L) mxStroke(g, L.slice(0, Math.max(2, Math.ceil(L.length * grow))));
        g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(255,${120 + 100 * heat},40,${heat})`; g.lineWidth = 2.2; for (const L of q.L) mxStroke(g, L.slice(0, Math.max(2, Math.ceil(L.length * grow)))); g.scale(1, 0.5); mxG(g, '255,120,30', 0, 0, 70, heat * 0.7); break; }
      case 'lotus': { const a = mxEnv(k, 0.12, 0.35), r = q.r * mxEB(Math.min(1, q.t / 0.3)); g.translate(x, y); g.scale(1, 0.5); g.rotate(time * 0.5); mxG(g, '100,160,255', 0, 0, r * 1.3, 0.5 * a); g.globalAlpha = a;
        for (const [rr, w, c] of [[r, 2, '210,232,255'], [r * 0.66, 1.6, '130,185,255']]) { g.strokeStyle = `rgba(${c},.95)`; g.lineWidth = w; g.beginPath(); mxShape(g, 'lotus', rr); g.stroke(); } g.beginPath(); g.arc(0, 0, r * 1.04, 0, 7); g.stroke(); break; }
      case 'clock': { const a = mxEnv(k, 0.1, 0.35), r = q.r * mxEB(Math.min(1, q.t / 0.25)); g.translate(x, y); g.scale(1, 0.5); mxG(g, '150,80,255', 0, 0, r * 1.3, 0.55 * a); g.globalAlpha = a; g.strokeStyle = 'rgba(215,180,255,.95)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke();
        g.lineWidth = 1.5; g.beginPath(); for (let i = 0; i < 12; i++) { const an = i * Math.PI / 6; g.moveTo(Math.cos(an) * r * 0.82, Math.sin(an) * r * 0.82); g.lineTo(Math.cos(an) * r * 0.95, Math.sin(an) * r * 0.95); } g.stroke(); const sp = 9 * (1 - mxEO(k)) + 0.4; g.lineWidth = 2.4; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(q.t * sp) * r * 0.75, Math.sin(q.t * sp) * r * 0.75); g.moveTo(0, 0); g.lineTo(Math.cos(q.t * sp / 12 + 1) * r * 0.5, Math.sin(q.t * sp / 12 + 1) * r * 0.5); g.stroke(); break; }
      // ----- 공중
      case 'glow': mxG(g, q.c, x, y - (q.hy ?? h * 0.5), q.r * (0.7 + 0.5 * mxEO(k)), 1 - k); break;
      case 'burst': { const cy = y - (q.hy ?? h * 0.5), a = 1 - k, r = q.r * (0.4 + 0.8 * mxEO(k)); mxG(g, q.c, x, cy, r * 1.2, a); mxG(g, q.l, x, cy, r * 0.45, a); g.globalAlpha = a; g.strokeStyle = `rgba(${q.l},1)`; g.lineWidth = 2;
        g.beginPath(); for (let i = 0; i < q.n; i++) { const an = i * 6.2832 / q.n + q.sd, r0 = r * 0.25, r1 = r * (i % 2 ? 0.8 : 1.25); g.moveTo(x + Math.cos(an) * r0, cy + Math.sin(an) * r0 * 0.7); g.lineTo(x + Math.cos(an) * r1, cy + Math.sin(an) * r1 * 0.7); } g.stroke(); break; }
      case 'fballx': { const cy = y - (q.hy ?? 30), r = 18 + 78 * mxEO(Math.min(1, k * 1.6)), a = k < 0.6 ? 1 : (1 - k) / 0.4; mxG(g, '255,60,10', x, cy, r * 1.5, a * 0.9); mxG(g, '255,150,40', x, cy, r, a); mxG(g, '255,240,190', x, cy, r * 0.45, a * (1 - k)); mxLight(x, cy, 240, a); break; }
      case 'lightning': { const top = y - 560, bx = x + Math.sin(q.sd) * 40; if (!q.L || q.t - (q.rt || 0) > 0.045) { q.rt = q.t; q.L = mxJag(bx, top, x, y - 6, 14, 46); q.B = [0, 1].map(j => { const s = q.L[4 + j * 4], an = (j ? 1 : -1) * mxR(0.4, 0.9); return mxJag(s[0], s[1], s[0] + Math.sin(an) * mxR(60, 110), s[1] + mxR(70, 130), 6, 24); }); }
        const a = (k < 0.5 ? 1 : (1 - k) / 0.5) * (0.65 + Math.random() * 0.35); g.globalAlpha = a * 0.8; g.strokeStyle = 'rgba(140,180,255,.35)'; g.lineWidth = 8; mxStroke(g, q.L); g.strokeStyle = 'rgba(190,215,255,.85)'; g.lineWidth = 3.2; mxStroke(g, q.L); g.strokeStyle = '#ffffff'; g.lineWidth = 1.4; mxStroke(g, q.L);
        g.lineWidth = 1.6; g.strokeStyle = 'rgba(200,225,255,.85)'; for (const B of q.B) mxStroke(g, B); mxG(g, '200,225,255', x, y - 10, 40, a * 0.7); mxLight(x, y - 40, 160, a); break; }
      case 'blizzard': { const a = mxEnv(k, 0.06, 0.2), R = q.r; mxG(g, '215,238,255', x, y - 16, R * 1.15, 0.38 * a, 0.5); g.strokeStyle = `rgba(245,252,255,${0.75 * a})`; g.lineWidth = 2;
        for (let i = 0; i < 52; i++) { const an = q.t * (2.0 + (i % 5) * 0.35) + i * 0.8657, rr = R * (0.15 + ((i * 0.618) % 1) * 0.88), px = x + Math.cos(an) * rr, py = y - 10 - (i % 7) * 7 + Math.sin(an) * rr * 0.5; g.beginPath(); g.moveTo(px, py); g.lineTo(px - Math.sin(an) * 12, py + Math.cos(an) * 6); g.stroke(); }
        if (Math.random() < 0.85 * a) mxP(x + mxR(-R, R) * 0.9, y - 240, { k: 'shard', c: Math.random() < 0.5 ? '220,245,255' : '160,215,255', s: mxR(3, 6), vy: mxR(420, 560), vx: mxR(-80, 10), r: 1.9, vr: 0, life: 0.6, fl: y + mxR(-R * 0.4, R * 0.4) });
        mxLight(x, y - 20, R * 1.2, 0.5 * a); break; }
      case 'arc': { const cy = y - h * 0.5, a = 1 - k; g.globalAlpha = a; g.strokeStyle = 'rgba(200,230,255,.95)'; g.lineWidth = 1.3; for (let i = 0; i < 3; i++) { const a0 = Math.random() * 6.283, a1 = a0 + mxR(1, 2.2); mxStroke(g, mxJag(x + Math.cos(a0) * 18, cy + Math.sin(a0) * h * 0.45, x + Math.cos(a1) * 18, cy + Math.sin(a1) * h * 0.45, 5, 10)); } break; }
      case 'icespikes': { const fade = k > 0.72 ? (1 - k) / 0.28 : 1; if (k > 0.72 && !q.sh) { q.sh = 1; for (const s of q.sp) { const sx = x + Math.cos(s.a) * s.d, sy = y + Math.sin(s.a) * s.d * 0.5; mxBurst(sx, sy - s.h * 0.5, 4, () => ({ k: 'shard', c: '210,245,255', s: mxR(3, 5), g: 360, vr: mxR(-10, 10), life: mxR(0.4, 0.7), fl: sy }), 40, 110, 60); } }
        const L = q.sp.map(s => ({ ...s, sx: x + Math.cos(s.a) * s.d, sy: y + Math.sin(s.a) * s.d * 0.5 })).sort((p, r) => p.sy - r.sy); g.globalCompositeOperation = 'source-over';
        for (const s of L) { const gk = mxEO(Math.min(1, Math.max(0, (q.t - s.dl) / 0.14))); if (gk <= 0) continue; const hh = s.h * gk, w = s.w; g.globalAlpha = 0.92 * fade;
          const gr = g.createLinearGradient(s.sx - w, 0, s.sx + w, 0); gr.addColorStop(0, 'rgba(110,190,240,.95)'); gr.addColorStop(0.45, 'rgba(225,250,255,.98)'); gr.addColorStop(1, 'rgba(140,210,250,.9)'); g.fillStyle = gr;
          g.beginPath(); g.moveTo(s.sx - w, s.sy); g.lineTo(s.sx - w * 0.15, s.sy - hh); g.lineTo(s.sx + w * 0.3, s.sy - hh * 0.92); g.lineTo(s.sx + w, s.sy); g.closePath(); g.fill(); g.strokeStyle = `rgba(255,255,255,${0.9 * fade})`; g.lineWidth = 1; g.beginPath(); g.moveTo(s.sx - w * 0.15, s.sy - hh); g.lineTo(s.sx, s.sy); g.stroke(); }
        g.globalCompositeOperation = 'lighter'; mxG(g, '150,220,255', x, y - 30, 80, 0.6 * fade); mxLight(x, y - 30, 160, fade); break; }
      case 'rockspikes': { const fade = k > 0.7 ? (1 - k) / 0.3 : 1; const L = q.sp.map(s => ({ ...s, sx: x + Math.cos(s.a) * s.d, sy: y + Math.sin(s.a) * s.d * 0.5 })).sort((p, r) => p.sy - r.sy); g.globalCompositeOperation = 'source-over';
        for (const s of L) { const gk = mxEO(Math.min(1, Math.max(0, (q.t - s.dl) / 0.12))) * (k > 0.7 ? 1 - (k - 0.7) / 0.3 * 0.6 : 1); if (gk <= 0) continue; const hh = s.h * gk, w = s.w, t2 = s.tone; g.globalAlpha = fade;
          g.fillStyle = `rgb(${Math.round(110 * t2)},${Math.round(80 * t2)},${Math.round(52 * t2)})`; g.beginPath(); g.moveTo(s.sx - w, s.sy); g.lineTo(s.sx - w * 0.3, s.sy - hh); g.lineTo(s.sx + w * 0.2, s.sy - hh * 0.85); g.lineTo(s.sx + w, s.sy); g.closePath(); g.fill();
          g.fillStyle = `rgba(255,${Math.round(150 + 60 * (1 - k))},70,${0.8 * (1 - k)})`; g.beginPath(); g.moveTo(s.sx - w * 0.3, s.sy - hh); g.lineTo(s.sx + w * 0.2, s.sy - hh * 0.85); g.lineTo(s.sx, s.sy - hh * 0.5); g.closePath(); g.fill();
          g.fillStyle = `rgba(40,26,16,${0.5 * fade})`; g.beginPath(); g.moveTo(s.sx + w * 0.2, s.sy - hh * 0.85); g.lineTo(s.sx + w, s.sy); g.lineTo(s.sx + w * 0.3, s.sy); g.closePath(); g.fill(); } break; }
      case 'sunc': { const f = q.e, kk = mxEO(k), cy = y - Math.max(26, Math.min(60, h * 0.55)); g.globalAlpha = 1;
        for (let i = 0; i < 12; i++) { const an = i * 0.524 + time * 1.8, rr = 86 * (1 - kk) + 8, ln = 16 + 12 * kk; g.strokeStyle = `rgba(255,236,150,${0.2 + 0.5 * kk})`; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x + Math.cos(an) * rr, cy + Math.sin(an) * rr * 0.6); g.lineTo(x + Math.cos(an) * (rr + ln), cy + Math.sin(an) * (rr + ln) * 0.6); g.stroke(); }
        if (Math.random() < 0.5) { const an = Math.random() * 6.283, rr = 74; mxP(x + Math.cos(an) * rr, cy + Math.sin(an) * rr * 0.6, { k: 'dot', c: '255,235,160', s: 2.6, vx: -Math.cos(an) * rr / 0.45, vy: -Math.sin(an) * rr * 0.6 / 0.45, life: 0.42 }); }
        mxG(g, '255,200,80', x, cy, 14 + 36 * kk, 0.4 + 0.4 * kk); mxG(g, '255,250,220', x, cy, 6 + 13 * kk, 0.8 * kk); g.translate(x, y); g.scale(1, 0.5); g.strokeStyle = `rgba(255,225,140,${0.7 * kk})`; g.lineWidth = 1.8; g.beginPath(); g.arc(0, 0, 55 * (1 - kk) + 14, 0, 7); g.stroke(); mxLight(x, cy, 60 + 80 * kk, 0.4 + 0.5 * kk); break; }
      case 'flare': { const cy = y - (q.hy ?? 30), a = (1 - k) * 0.7, r = 18 + 46 * mxEO(Math.min(1, k * 2)); mxG(g, '255,190,70', x, cy, r * 1.3, a * 0.8); mxG(g, '255,250,225', x, cy, r * 0.45, a);
        g.globalAlpha = a * 0.75; g.strokeStyle = 'rgba(255,240,190,1)'; g.lineWidth = 2 * a + 0.8; g.beginPath(); for (let i = 0; i < 12; i++) { const an = i * 0.5236 + q.sd, r0 = r * 0.3, r1 = r * (i % 2 ? 0.95 : 1.3); g.moveTo(x + Math.cos(an) * r0, cy + Math.sin(an) * r0 * 0.75); g.lineTo(x + Math.cos(an) * r1, cy + Math.sin(an) * r1 * 0.75); } g.stroke(); mxLight(x, cy, 170, a); break; }
      case 'pillar': { const a = mxEnv(k, 0.1, 0.45), w = q.w * (0.6 + 0.4 * mxEB(Math.min(1, q.t / 0.2))), H = 520; const gr = g.createLinearGradient(x - w, 0, x + w, 0); gr.addColorStop(0, `rgba(${q.c},0)`); gr.addColorStop(0.3, `rgba(${q.c},${0.35 * a})`); gr.addColorStop(0.5, `rgba(${q.l},${0.75 * a})`); gr.addColorStop(0.7, `rgba(${q.c},${0.35 * a})`); gr.addColorStop(1, `rgba(${q.c},0)`);
        g.fillStyle = gr; g.fillRect(x - w, y - H, w * 2, H); mxG(g, q.l, x, y - 6, w * 1.6, a, 0.5); g.globalAlpha = a; g.fillStyle = `rgba(${q.l},.9)`; for (let i = 0; i < 6; i++) { const ph = (q.t * 1.4 + i / 6) % 1; g.fillRect(x + Math.sin(i * 2.3 + q.t * 3) * w * 0.5, y - ph * 200, 2, 6); } mxLight(x, y - 60, 150, a); break; }
      case 'healrain': { const a = mxEnv(k, 0.1, 0.4), top = y - h - 30; mxG(g, '150,255,170', x, top, q.big ? 52 : 40, 0.5 * a); mxG(g, '255,245,190', x, top, q.big ? 20 : 14, 0.7 * a);
        g.globalAlpha = a; for (let i = 0; i < (q.big ? 16 : 10); i++) { const ph = (q.t * 1.2 + i * 0.137) % 1, px = x + Math.sin(i * 2.7) * (q.big ? 24 : 18), py = top + ph * (h + 28); g.fillStyle = i % 3 ? 'rgba(170,255,180,.95)' : 'rgba(255,245,190,.95)'; g.fillRect(px - 1, py - 4, 2, 7); }
        const cs = (q.big ? 9 : 7) * mxEB(Math.min(1, q.t / 0.25)); g.strokeStyle = `rgba(235,255,225,${a})`; g.lineWidth = 3; g.beginPath(); g.moveTo(x - cs, top); g.lineTo(x + cs, top); g.moveTo(x, top - cs); g.lineTo(x, top + cs); g.stroke(); break; }
      case 'cross': { const a = mxEnv(k, 0.1, 0.4), cy = y - h - 26 - 10 * mxEO(k), s = 14 * mxEB(Math.min(1, q.t / 0.25)); mxG(g, '255,225,140', x, cy, 46, 0.7 * a); g.globalAlpha = a; g.fillStyle = 'rgba(255,250,225,.98)'; g.fillRect(x - s * 0.22, cy - s * 1.2, s * 0.44, s * 2.4); g.fillRect(x - s * 0.8, cy - s * 0.55, s * 1.6, s * 0.4); break; }
      case 'dome': { const a = mxEnv(k, 0.06, 0.35), cy = y - 36, R = 34 + 4 * Math.sin(q.t * 9) * (1 - k); mxG(g, q.c, x, cy, R * 1.3, 0.45 * a, 1.25); g.globalAlpha = a; g.strokeStyle = `rgba(${q.c},.9)`; g.lineWidth = 1.1;
        const cells = [[0, 0], [1, 0], [-1, 0], [0.5, -0.85], [-0.5, -0.85], [0.5, 0.85], [-0.5, 0.85], [1.5, -0.85], [-1.5, -0.85], [1.5, 0.85], [-1.5, 0.85], [0, -1.7], [0, 1.7], [1, -1.7], [-1, -1.7]];
        cells.forEach(([cx, cyy], i) => { const ap = Math.min(1, Math.max(0, (q.t - i * 0.035) / 0.12)); if (ap <= 0) return; g.globalAlpha = a * Math.max(0.25, 1 - Math.max(0, q.t - i * 0.035 - 0.15) * 1.6); const px = x + cx * R * 0.42, py = cy + cyy * R * 0.42, rr = R * 0.24 * ap * (1 - 0.18 * Math.abs(cx) / 1.5); g.beginPath(); for (let v = 0; v <= 6; v++) { const b = v * Math.PI / 3 + Math.PI / 6; v ? g.lineTo(px + Math.cos(b) * rr, py + Math.sin(b) * rr) : g.moveTo(px + Math.cos(b) * rr, py + Math.sin(b) * rr); } g.stroke(); });
        g.globalAlpha = a; g.strokeStyle = `rgba(${q.l},.9)`; g.beginPath(); g.ellipse(x, cy, R, R * 1.15, 0, 0, 7); g.lineWidth = 1.8; g.stroke(); if (k > 0.55) { const pk = (k - 0.55) / 0.45; g.globalAlpha = (1 - pk) * 0.8; g.lineWidth = 3; g.beginPath(); g.ellipse(x, cy, R * (1 + pk * 0.4), R * 1.15 * (1 + pk * 0.4), 0, 0, 7); g.stroke(); } break; }
      case 'windring': { const a = mxEnv(k, 0.08, 0.35); for (let i = 0; i < 3; i++) { const kk = Math.min(1, Math.max(0, (k - i * 0.15) / 0.7)); if (kk <= 0 || kk >= 1) continue; const yy = y - kk * (h + 20), r = 22 + 8 * Math.sin(kk * Math.PI); g.globalAlpha = a * (1 - kk) * 1.3; g.strokeStyle = `rgba(${q.c},.95)`; g.lineWidth = 2.4; g.beginPath(); g.ellipse(x, yy, r, r * 0.38, 0, q.t * 8 + i, q.t * 8 + i + 4.6); g.stroke(); }
        mxG(g, q.c, x, y - h * 0.5, 44, 0.3 * a); break; }
      case 'mindorb': { const a = mxEnv(k, 0.1, 0.3), cy = y - h - 8; mxG(g, '120,175,255', x, cy, 26 + 6 * Math.sin(q.t * 5), 0.75 * a); mxG(g, '230,242,255', x, cy, 9, a);
        if (k < 0.8 && Math.random() < 0.7) { const an = Math.random() * 6.283, rr = mxR(40, 60); mxP(x + Math.cos(an) * rr, y - 10 + Math.sin(an) * rr * 0.45, { k: 'dot', c: '150,200,255', s: 2.4, vx: -Math.cos(an) * rr / 0.6, vy: (cy - (y - 10 + Math.sin(an) * rr * 0.45)) / 0.6, life: 0.58 }); } break; }
      case 'runering': { const a = mxEnv(k, 0.1, 0.3), cy = y - h * 0.45 - k * 12; g.globalAlpha = a; g.strokeStyle = `rgba(${q.c},.7)`; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, cy, 30, 11, 0, 0, 7); g.stroke(); g.strokeStyle = `rgba(${q.l},1)`; g.lineWidth = 1.6;
        for (let i = 0; i < 8; i++) { const an = q.t * 2.6 + i * 0.785, px = x + Math.cos(an) * 30, py = cy + Math.sin(an) * 11, dep = Math.sin(an); g.globalAlpha = a * (0.55 + 0.45 * dep); mxG(g, q.c, px, py - 5, 9, 0.6 * a); g.globalAlpha = a * (0.55 + 0.45 * dep); mxRune(g, i, px, py - 5, 4.5); }
        if (q.mirror && k > 0.6) { const pk = (k - 0.6) / 0.4; g.globalAlpha = (1 - pk) * 0.7; const gr = g.createLinearGradient(x - 26, 0, x + 26, 0); gr.addColorStop(0, `rgba(${q.l},0)`); gr.addColorStop(0.5, `rgba(${q.l},.8)`); gr.addColorStop(1, `rgba(${q.l},0)`); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y - h * 0.5, 26 + pk * 10, h * 0.6, 0, 0, 7); g.fill(); } break; }
      case 'lifemana': { const a = mxEnv(k, 0.1, 0.3), cy = y - h - 14, kk = Math.min(1, k / 0.6); if (k < 0.6 && Math.random() < 0.85) mxP(x + mxR(-14, 14), y - mxR(10, h * 0.8), { k: 'dot', c: '255,80,80', s: 2.6, vx: 0, vy: 0, life: 0.45, tx: x, ty: cy, k2: 1 });
        mxG(g, '90,140,255', x, cy, 10 + 20 * kk, a); mxG(g, '220,235,255', x, cy, 4 + 6 * kk, a); if (k > 0.65) { const dk = (k - 0.65) / 0.35; mxG(g, '120,170,255', x, cy + dk * h * 0.6, 22 * (1 - dk), 1 - dk); } break; }
      case 'leafstorm': { const a = mxEnv(k, 0.08, 0.3); for (let i = 0; i < 26; i++) { const ph = (q.t * 0.8 + i / 26) % 1, an = i * 2.4 + q.t * 6, rr = 14 + ph * 26, px = x + Math.cos(an) * rr, py = y - ph * (h + 50) + Math.sin(an) * rr * 0.35; g.globalCompositeOperation = 'source-over'; g.globalAlpha = a * Math.sin(ph * Math.PI);
          g.fillStyle = i % 3 ? '#6fd25a' : '#b8f080'; g.save(); g.translate(px, py); g.rotate(an); g.beginPath(); g.ellipse(0, 0, 4, 1.8, 0, 0, 7); g.fill(); g.restore(); } g.globalCompositeOperation = 'lighter'; mxG(g, '140,255,140', x, y - h * 0.5, 50, 0.4 * a); break; }
      case 'ripple': { const a = mxEnv(k, 0.06, 0.3), cy = y - h - 6; for (let i = 0; i < 3; i++) { const kk = ((k * 1.6) - i * 0.25); if (kk <= 0 || kk >= 1) continue; g.globalAlpha = a * (1 - kk); g.strokeStyle = 'rgba(170,235,255,.95)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, cy, 8 + kk * 34, (8 + kk * 34) * 0.35, 0, 0, 7); g.stroke(); } mxG(g, '150,230,255', x, cy, 26, 0.5 * a); break; }
      case 'orbit4': { const a = mxEnv(k, 0.08, 0.2), merge = k > 0.7 ? (k - 0.7) / 0.3 : 0, cols = ['255,90,40', '80,180,255', '110,240,160', '220,160,70'];
        for (let i = 0; i < 4; i++) { const an = q.t * 5 + i * 1.5708, rr = 30 * (1 - merge), px = x + Math.cos(an) * rr, py = y - h * 0.5 - k * 10 + Math.sin(an) * rr * 0.4; mxG(g, cols[i], px, py, 14, a); mxG(g, '255,255,255', px, py, 4, a); }
        if (merge > 0) mxG(g, '255,240,210', x, y - h * 0.5, 40 * (1 - merge * 0.5), (1 - merge) * 0.9); break; }
      case 'plates': { const a = mxEnv(k, 0.06, 0.3), kk = mxEO(Math.min(1, k / 0.45)); g.globalAlpha = a; for (let i = 0; i < 8; i++) { const an = i * 0.785 + q.sd, rr = 60 * (1 - kk) + 18, px = x + Math.cos(an) * rr, py = y - h * 0.5 + Math.sin(an) * rr * 0.5;
          g.globalCompositeOperation = 'source-over'; g.fillStyle = '#b8c2d0'; g.strokeStyle = '#eef3fa'; g.lineWidth = 1; g.beginPath(); for (let v = 0; v <= 6; v++) { const b = v * Math.PI / 3; v ? g.lineTo(px + Math.cos(b) * 6, py + Math.sin(b) * 6) : g.moveTo(px + Math.cos(b) * 6, py + Math.sin(b) * 6); } g.fill(); g.stroke(); }
        g.globalCompositeOperation = 'lighter'; if (k > 0.4) mxG(g, '230,240,255', x, y - h * 0.5, 46, (1 - k) * 1.2); break; }
      case 'chev': { const a = mxEnv(k, 0.06, 0.3); g.globalAlpha = a; g.strokeStyle = `rgba(${q.c},1)`; g.lineWidth = 3; for (let i = 0; i < 6; i++) { const ph = (q.t * 1.3 + i / 6) % 1, px = x + Math.cos(i * 1.05) * 24, py = y - ph * (h + 30); g.globalAlpha = a * Math.sin(ph * Math.PI); g.beginPath(); g.moveTo(px - 6, py + 4); g.lineTo(px, py - 3); g.lineTo(px + 6, py + 4); g.stroke(); } mxG(g, q.c, x, y - h * 0.5, 40, 0.3 * a); break; }
      case 'stonewall': { const a = mxEnv(k, 0.05, 0.3), kk = mxEO(Math.min(1, k / 0.25)); g.globalCompositeOperation = 'source-over'; for (let i = 0; i < 7; i++) { const an = Math.PI * 0.15 + i * Math.PI * 0.7 / 6, px = x + Math.cos(an) * 34, py = y + Math.sin(an) * 17, hh = (16 + (i % 3) * 5) * kk; g.globalAlpha = a; g.fillStyle = i % 2 ? '#8a6a44' : '#a07c50'; g.fillRect(px - 6, py - hh, 12, hh); g.fillStyle = 'rgba(255,230,180,.5)'; g.fillRect(px - 6, py - hh, 12, 2); } break; }
      case 'thorns': { const a = mxEnv(k, 0.05, 0.4), kk = mxEO(Math.min(1, k / 0.3)); g.globalAlpha = a; g.fillStyle = 'rgba(255,90,80,.95)'; for (let i = 0; i < 12; i++) { const an = i * 0.5236, r0 = 14, r1 = 14 + 34 * kk, cy = y - h * 0.45; g.beginPath(); g.moveTo(x + Math.cos(an - 0.12) * r0, cy + Math.sin(an - 0.12) * r0 * 0.6); g.lineTo(x + Math.cos(an) * r1, cy + Math.sin(an) * r1 * 0.6); g.lineTo(x + Math.cos(an + 0.12) * r0, cy + Math.sin(an + 0.12) * r0 * 0.6); g.closePath(); g.fill(); } mxG(g, '255,70,60', x, y - h * 0.45, 44, 0.5 * a); break; }
    }
    g.restore(); }
  if (!gnd) mxDrawP(g); g.restore(); }
const MX_SOLID = { smoke: 1, shard: 1, rock: 1, leaf: 1, feather: 1 };
function mxDrawP(g) { for (let pass = 0; pass < 2; pass++) for (const p of MXP) { if (!MX_SOLID[p.k] === !pass) continue; const k = p.life / p.max, a = (p.a0 ?? 1) * (k < 0.3 ? k / 0.3 : 1);   // 연기·파편 먼저, 빛나는 입자는 위에
    if (p.tx != null) { p.x += (p.tx - p.x) * Math.min(1, 0.016 * 9); p.y += (p.ty - p.y) * Math.min(1, 0.016 * 9); }
    switch (p.k) {
      case 'dot': g.globalCompositeOperation = 'lighter'; mxG(g, p.c, p.x, p.y, p.s * 2.6, a); break;
      case 'spark': g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.strokeStyle = `rgb(${p.c})`; g.lineWidth = p.s; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045); g.stroke(); break;
      case 'ember': g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.fillStyle = `rgb(${p.c})`; g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); mxG(g, p.c, p.x, p.y, p.s * 2.2, a * 0.5); break;
      case 'flame': { g.globalCompositeOperation = 'lighter'; const c = k > 0.62 ? '255,232,160' : k > 0.32 ? '255,140,40' : '210,55,20', s = p.s * (0.6 + (1 - k) * 0.9); mxG(g, c, p.x, p.y, s * 2, a * 0.95); break; }
      case 'smoke': { g.globalCompositeOperation = 'source-over'; g.globalAlpha = Math.min(1, a * 0.75); const r = p.s * (1.3 + (1 - k) * 1.8); g.drawImage(mxSmokeImg(p.c), p.x - r, p.y - r, r * 2, r * 2); break; }
      case 'shard': g.globalCompositeOperation = 'source-over'; g.globalAlpha = a; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = `rgb(${p.c})`; g.beginPath(); g.moveTo(p.s * 1.6, 0); g.lineTo(-p.s * 0.6, -p.s * 0.55); g.lineTo(-p.s, 0); g.lineTo(-p.s * 0.6, p.s * 0.55); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(-p.s * 0.4, -0.5, p.s * 1.6, 1); g.restore(); break;
      case 'rock': g.globalCompositeOperation = 'source-over'; g.globalAlpha = a; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = `rgb(${p.c})`; g.beginPath(); g.moveTo(p.s, 0); g.lineTo(p.s * 0.3, -p.s * 0.9); g.lineTo(-p.s * 0.8, -p.s * 0.5); g.lineTo(-p.s * 0.7, p.s * 0.6); g.lineTo(p.s * 0.4, p.s * 0.8); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,220,170,.35)'; g.fillRect(-p.s * 0.5, -p.s * 0.5, p.s * 0.8, p.s * 0.3); g.restore(); break;
      case 'leaf': g.globalCompositeOperation = 'source-over'; g.globalAlpha = a; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.scale(1, 0.3 + 0.7 * Math.abs(Math.sin(p.r * 1.7))); g.fillStyle = `rgb(${p.c})`; g.beginPath(); g.ellipse(0, 0, p.s, p.s * 0.45, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(40,90,30,.6)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(-p.s, 0); g.lineTo(p.s, 0); g.stroke(); g.restore(); break;
      case 'feather': g.globalCompositeOperation = 'source-over'; g.globalAlpha = a * 0.95; g.save(); g.translate(p.x, p.y); g.rotate(Math.sin(p.r) * 0.8); g.fillStyle = `rgb(${p.c})`; g.beginPath(); g.moveTo(0, -p.s); g.quadraticCurveTo(p.s * 0.55, 0, 0, p.s); g.quadraticCurveTo(-p.s * 0.35, 0, 0, -p.s); g.fill(); g.strokeStyle = 'rgba(150,200,190,.7)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(0, -p.s); g.lineTo(0, p.s * 1.2); g.stroke(); g.restore(); break;
      case 'snow': g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.strokeStyle = `rgb(${p.c})`; g.lineWidth = 1; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.beginPath(); for (let i = 0; i < 3; i++) { const an = i * 1.047; g.moveTo(-Math.cos(an) * p.s, -Math.sin(an) * p.s); g.lineTo(Math.cos(an) * p.s, Math.sin(an) * p.s); } g.stroke(); g.restore(); break;
      case 'bubble': g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.strokeStyle = `rgba(${p.c},.95)`; g.lineWidth = 1; g.beginPath(); g.arc(p.x, p.y, p.s, 0, 7); g.stroke(); g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(p.x - p.s * 0.45, p.y - p.s * 0.5, 1.5, 1.5); break;
      case 'wisp': g.globalCompositeOperation = 'lighter'; mxG(g, p.c, p.x, p.y, p.s * 3, a * 0.8); g.globalAlpha = a * 0.6; g.fillStyle = `rgba(${p.c},.8)`; g.beginPath(); g.ellipse(p.x, p.y + p.s * 1.5, p.s * 0.5, p.s * 1.6, 0, 0, 7); g.fill(); break;
    } } g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
// 화면 섬광 (큰 마법) — 어둠·밤 위에 그림
function mxDrawFlash(g, vw, vh) { MXLIT.length = 0; if (!MXF) return; const a = MXF.a * (1 - MXF.t / MXF.life) ** 1.5; if (a <= 0) return; g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(${MXF.c},${a})`; g.fillRect(0, 0, vw, vh); g.restore(); }
function mxTick(dt) {
  for (let n = MXL.length - 1; n >= 0; n--) { const q = MXL[n]; q.t += dt; if (q.e) { q.wx = q.e.x; q.wz = q.e.z; } if (q.t >= q.life) MXL.splice(n, 1); }
  for (let n = MXP.length - 1; n >= 0; n--) { const p = MXP[n]; p.life -= dt; if (p.life <= 0) { MXP.splice(n, 1); continue; } if (p.dr) { const f = Math.max(0, 1 - p.dr * dt); p.vx *= f; p.vy *= f; } p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; if (p.wob) p.x += Math.sin(p.life * p.wob + p.r * 3) * 0.5; if (p.fl != null && p.y > p.fl && p.vy > 0) { p.y = p.fl; p.vy *= -0.3; p.vx *= 0.5; if (Math.abs(p.vy) < 20) { p.vy = 0; p.g = 0; } } }
  if (MXF) { MXF.t += dt; if (MXF.t >= MXF.life) MXF = null; } }
// 공격 마법 발동: 내 마법(cos=false)은 맞으면 피해 · 다른 사람/몬스터 연출(cos=true)은 그림만
const MX_PROJ = { ebolt: 1, icedagger: 1, farrow: 1, fball: 1 };
function mxFire(id, src, T, cos, from) { const P = SPELL[id]; if (!P || !T) return; const [hx, hy] = from || W2P(src.x, src.z), d = Math.max(1, Math.hypot(T.x - src.x, T.z - src.z));
  if (MX_PROJ[id]) BOLTS.push({ x0: hx, y0: hy - 52, f: T, t: 0, dur: (0.22 + d * 0.045) * (id === 'fball' ? 1.25 : id === 'icedagger' ? 0.8 : 1), kind: P.fx, id, cos });
  else if (id === 'sunburst') { SKYFX.push({ kind: 'sunc', f: T, t: 0, dur: P.delay, cos }); mxSunCharge(T, P.delay); }
  else { mxHit(id, T); if (!cos && !T.dead) spellHit(T, id); } }

// ============================================================ 장비 외형: 속옷만 입은 몸 + 부위별 장비 레이어 (착용한 부위만 그림)
const KL_LAYERS = ["body", "boots", "shirt", "armor", "belt", "gloves", "cloak", "helm", "shield", "sword"];
const KL_SLOT = { boots: 'boots', shirt: 'shirt', armor: 'armor', belt: 'belt', gloves: 'gloves', cloak: 'cloak', helm: 'helm', shield: 'shield', sword: 'weapon' };
const KLM = {"body":{"idle":{"W":156,"H":165,"ax":48,"ay":148,"n":8},"walk":{"W":156,"H":170,"ax":48,"ay":147,"n":8},"attack":{"W":185,"H":174,"ax":62,"ay":152,"n":8},"attack2":{"W":166,"H":195,"ax":47,"ay":178,"n":8},"look":{"W":174,"H":176,"ax":66,"ay":148,"n":8}},"boots_l":{"idle":{"W":72,"H":70,"ax":36,"ay":53,"n":8},"walk":{"W":94,"H":81,"ax":47,"ay":58,"n":8},"attack":{"W":72,"H":70,"ax":36,"ay":53,"n":8},"attack2":{"W":72,"H":70,"ax":36,"ay":53,"n":8},"look":{"W":102,"H":79,"ax":51,"ay":63,"n":8}},"boots_p":{"idle":{"W":72,"H":73,"ax":36,"ay":56,"n":8},"walk":{"W":96,"H":79,"ax":48,"ay":59,"n":8},"attack":{"W":72,"H":73,"ax":36,"ay":56,"n":8},"attack2":{"W":72,"H":73,"ax":36,"ay":56,"n":8},"look":{"W":100,"H":85,"ax":50,"ay":70,"n":8}},"shirt":{"idle":{"W":96,"H":68,"ax":48,"ay":132,"n":8},"walk":{"W":96,"H":70,"ax":48,"ay":132,"n":8},"attack":{"W":108,"H":74,"ax":54,"ay":136,"n":8},"attack2":{"W":96,"H":84,"ax":48,"ay":144,"n":8},"look":{"W":106,"H":74,"ax":53,"ay":135,"n":8}},"armor_l":{"idle":{"W":100,"H":81,"ax":50,"ay":132,"n":8},"walk":{"W":100,"H":83,"ax":50,"ay":131,"n":8},"attack":{"W":102,"H":88,"ax":51,"ay":136,"n":8},"attack2":{"W":100,"H":88,"ax":50,"ay":133,"n":8},"look":{"W":102,"H":89,"ax":51,"ay":136,"n":8}},"armor_p":{"idle":{"W":100,"H":113,"ax":50,"ay":137,"n":8},"walk":{"W":100,"H":117,"ax":50,"ay":136,"n":8},"attack":{"W":112,"H":127,"ax":56,"ay":150,"n":8},"attack2":{"W":100,"H":142,"ax":50,"ay":163,"n":8},"look":{"W":122,"H":112,"ax":61,"ay":138,"n":8}},"belt":{"idle":{"W":67,"H":37,"ax":37,"ay":101,"n":8},"walk":{"W":67,"H":38,"ax":37,"ay":100,"n":8},"attack":{"W":73,"H":39,"ax":37,"ay":101,"n":8},"attack2":{"W":73,"H":41,"ax":37,"ay":101,"n":8},"look":{"W":74,"H":38,"ax":37,"ay":100,"n":8}},"gloves_l":{"idle":{"W":68,"H":69,"ax":32,"ay":112,"n":8},"walk":{"W":69,"H":70,"ax":33,"ay":111,"n":8},"attack":{"W":126,"H":110,"ax":63,"ay":153,"n":8},"attack2":{"W":86,"H":136,"ax":43,"ay":179,"n":8},"look":{"W":134,"H":86,"ax":67,"ay":108,"n":8}},"gloves_p":{"idle":{"W":58,"H":61,"ax":27,"ay":108,"n":8},"walk":{"W":58,"H":62,"ax":27,"ay":107,"n":8},"attack":{"W":118,"H":105,"ax":59,"ay":152,"n":8},"attack2":{"W":77,"H":128,"ax":39,"ay":175,"n":8},"look":{"W":132,"H":82,"ax":66,"ay":107,"n":8}},"cloak":{"idle":{"W":106,"H":138,"ax":53,"ay":134,"n":8},"walk":{"W":106,"H":140,"ax":53,"ay":134,"n":8},"attack":{"W":106,"H":140,"ax":53,"ay":134,"n":8},"attack2":{"W":108,"H":143,"ax":54,"ay":134,"n":8},"look":{"W":116,"H":140,"ax":58,"ay":134,"n":8}},"helm_l":{"idle":{"W":62,"H":42,"ax":31,"ay":150,"n":8},"walk":{"W":62,"H":42,"ax":31,"ay":149,"n":8},"attack":{"W":66,"H":44,"ax":33,"ay":150,"n":8},"attack2":{"W":70,"H":46,"ax":35,"ay":152,"n":8},"look":{"W":78,"H":50,"ax":39,"ay":150,"n":8}},"helm_p":{"idle":{"W":64,"H":56,"ax":32,"ay":157,"n":8},"walk":{"W":62,"H":56,"ax":31,"ay":156,"n":8},"attack":{"W":65,"H":59,"ax":32,"ay":157,"n":8},"attack2":{"W":70,"H":63,"ax":35,"ay":159,"n":8},"look":{"W":84,"H":62,"ax":42,"ay":158,"n":8}},"shield":{"idle":{"W":122,"H":88,"ax":61,"ay":137,"n":8},"walk":{"W":124,"H":96,"ax":62,"ay":140,"n":8},"attack":{"W":146,"H":94,"ax":73,"ay":137,"n":8},"attack2":{"W":131,"H":100,"ax":66,"ay":137,"n":8},"look":{"W":167,"H":92,"ax":83,"ay":139,"n":8}},"sword":{"idle":{"W":116,"H":70,"ax":58,"ay":84,"n":8},"walk":{"W":129,"H":75,"ax":64,"ay":85,"n":8},"attack":{"W":220,"H":198,"ax":110,"ay":206,"n":8},"attack2":{"W":189,"H":216,"ax":95,"ay":225,"n":8},"look":{"W":147,"H":86,"ax":73,"ay":119,"n":8}}};   // [레이어][동작] = 잘라낸 칸 크기·기준점·장수 (가죽 _l / 판금 _p)
const KL = {};
const KL_VAR = { boots: 1, armor: 1, gloves: 1, helm: 1 };   // 아이템 look('l' 가죽 / 'p' 판금)에 따라 다른 그림
function klName(L, id) { return KL_VAR[L] ? L + '_' + ((ITEMS[id] && ITEMS[id].look) || 'l') : L; }
function klImg(L, a) { const m = KLM[L] && KLM[L][a]; if (!m) return null; const T = KL[L] || (KL[L] = {}); let i = T[a]; if (!i) { i = new Image(); i.decoding = 'async'; i.src = `assets/classic/knight_${L}_${a}.webp`; T[a] = i; } return i; }
// 장비 → 색 톤 (같은 부위 그림을 아이템에 맞게 물들임)
const LOOK = {
  weapon: { old_sword: 'sepia(.7) saturate(1.25) brightness(.72) contrast(1.1)', short_sword: null, long_sword: 'brightness(1.18) saturate(.6) contrast(1.12)', dk_sword: 'sepia(1) saturate(5) hue-rotate(-22deg) brightness(1.1) contrast(1.2)' },
  helm: { dk_helm: 'grayscale(1) brightness(.34) contrast(1.7)' }, armor: { dk_armor: 'grayscale(1) brightness(.34) contrast(1.7)' }, gloves: { dk_gloves: 'grayscale(1) brightness(.34) contrast(1.7)' }, boots: { dk_boots: 'grayscale(1) brightness(.34) contrast(1.7)' },
  shield: { wood_shield: null },
};
const TINTED = {};
function tintSheet(img, f) { if (!f) return img; const k = img.src + '|' + f; if (TINTED[k]) return TINTED[k];
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const g = c.getContext('2d'); g.filter = f; g.drawImage(img, 0, 0); return TINTED[k] = c; }
let klT = 0;
function klPreload() { if (time - klT < 0.5 && klT) return; klT = time || 0.001; for (const a of ['idle', 'walk', 'attack', 'attack2', 'look']) klImg('body', a); for (const L of KL_LAYERS) { if (L === 'body') continue; const id = INV.equipped(KL_SLOT[L]); if (id) for (const a of ['idle', 'walk', 'attack', 'attack2', 'look']) klImg(klName(L, id), a); } }
const CLS_FILE = { elf: 'elf', wizard: 'mage' }, CLSI = {};
const CLSM = { elf: {"idle":{"W":121,"H":149,"ax":35,"ay":138,"n":8},"walk":{"W":126,"H":155,"ax":35,"ay":137,"n":8},"attack":{"W":238,"H":205,"ax":92,"ay":170,"n":8}}, wizard: {"idle":{"W":167,"H":195,"ax":42,"ay":177,"n":8},"walk":{"W":192,"H":205,"ax":54,"ay":184,"n":8},"attack":{"W":351,"H":280,"ax":133,"ay":228,"n":8}} };   // 그래픽팀 렌더 (몸 하나, 기사와 같은 80px/m·줄 순서)
function clsImg(cls, a) { const f = CLS_FILE[cls]; if (!f || !CLSM[cls]) return null; const k = f + '_' + a; let m = CLSI[k]; if (!m) { m = CLSI[k] = new Image(); m.decoding = 'async'; m.src = 'assets/classic/' + k + '.webp'; } return m.complete && m.naturalWidth ? m : null; }
// ===== 강화 빛: 안전 강화를 넘은 단계마다 색이 다름 (안전 강화까지는 빛 없음) — 1 은은한 초록 · 2 진한 파랑 · 3 강한 보라 · 4 이상 더 강한 보라 + 반짝임
const EN_GLOW = [null, { c: '110,255,140', a: 0.42, tin: 0.1, b: 2.4, n: 0 }, { c: '70,150,255', a: 0.72, tin: 0.18, b: 3.0, n: 0 }, { c: '185,80,255', a: 0.92, tin: 0.26, b: 3.6, n: 2 }, { c: '215,105,255', a: 1.0, tin: 0.34, b: 4.4, n: 5 }];
const EN_ARMOR = ['armor', 'helm', 'gloves', 'boots', 'shield', 'cloak', 'shirt', 'belt'];
const enTierOf = (id, en) => { const d = id && ITEMS[id]; if (!d || !d.slot || !(en > 0)) return 0; return Math.max(0, Math.min(4, en - SAFE_EN(d))); };
const myGlowT = sl => enTierOf(INV.equipped(sl), INV.enOf(sl));
function glowOut() { const o = {}; let any = false; for (const sl of ['weapon', ...EN_ARMOR]) { const t = myGlowT(sl); if (t) { o[sl] = t; any = true; } } return any ? o : null; }   // 다른 유저에게 보내는 강화 빛 단계
// 장비 그림 한 장(한 칸)의 빛: 실루엣을 그 색으로 칠해 흐리게 번진 판 + 실루엣 자체 — 칸마다 한 번 만들어 저장 (매 프레임 filter는 느림)
const GLC = new Map();
function glowFrame(img, M, k, row, sc, t, key, rim) { let c = GLC.get(key); if (c) return c; if (GLC.size > 360) GLC.clear();
  const T = EN_GLOW[t], pad = Math.ceil(T.b * 3 + 3), w = Math.ceil(M.W * sc) + pad * 2, hh = Math.ceil(M.H * sc) + pad * 2, [cr, cg_, cb] = T.c.split(',').map(Number);
  const sil = document.createElement('canvas'); sil.width = w; sil.height = hh; const sg = sil.getContext('2d', { willReadFrequently: true }); sg.imageSmoothingEnabled = true; sg.imageSmoothingQuality = 'high';
  sg.drawImage(img, k * M.W, row * M.H, M.W, M.H, pad, pad, M.W * sc, M.H * sc); let bb = null;
  try { const I = sg.getImageData(0, 0, w, hh), D = I.data; let x0 = w, y0 = hh, x1 = -1, y1 = -1;   // 실루엣만 그 색으로 (바닥 그림자 = 거의 검은 점묘는 뺌)
    for (let q = 0, n = w * hh; q < n; q++) { const o = q * 4; if (D[o + 3] > 40 && Math.max(D[o], D[o + 1], D[o + 2]) >= 22) { D[o] = cr; D[o + 1] = cg_; D[o + 2] = cb; D[o + 3] = 255; const x = q % w, y = (q / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } else D[o + 3] = 0; }
    sg.putImageData(I, 0, 0); if (x1 >= 0) bb = [x0, y0, x1, y1]; } catch (e) { sg.globalCompositeOperation = 'source-in'; sg.fillStyle = `rgb(${T.c})`; sg.fillRect(0, 0, w, hh); }
  c = document.createElement('canvas'); c.width = w; c.height = hh; const cg = c.getContext('2d'); cg.filter = `blur(${T.b}px)`; cg.drawImage(sil, 0, 0); cg.drawImage(sil, 0, 0); cg.filter = 'none';
  if (rim) { cg.globalCompositeOperation = 'destination-out'; cg.globalAlpha = 0.85; cg.drawImage(sil, 0, 0); cg.globalAlpha = 1; cg.globalCompositeOperation = 'source-over'; }   // 몸 전체 빛은 테두리만 (얼굴·옷 색이 그대로 보이게)
  c.sil = sil; c.pad = pad; c.bb = bb; GLC.set(key, c); return c; }
const glH = v => { const q = Math.sin(v * 12.9898) * 43758.5453; return q - Math.floor(q); };
function layerGlow(g, img, M, k, row, X, Y, sc, t, key, mul, rim) { const T = EN_GLOW[Math.min(4, t)]; if (!T || !img) return; const c = glowFrame(img, M, k, row, sc, Math.min(4, t), key + '|' + k + '|' + row + '|' + t + '|' + sc.toFixed(3) + (rim ? '|r' : ''), rim);
  const strong = t >= 4, pulse = (strong ? 0.74 : 0.86) + (strong ? 0.32 : 0.14) * Math.sin(time * (strong ? 5.5 : 2.2) + X * 0.013), a0 = g.globalAlpha;
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a0 * Math.min(1, T.a * pulse * (mul || 1)); g.drawImage(c, X - c.pad, Y - c.pad);
  g.globalAlpha = a0 * T.tin * (rim ? 0.35 : 1) * (mul || 1) * (0.8 + 0.2 * pulse); g.drawImage(c.sil, X - c.pad, Y - c.pad);
  if (T.n && c.bb) { const [bx0, by0, bx1, by1] = c.bb; for (let q = 0; q < T.n; q++) { const ph = time * (strong ? 1.9 : 1.3) + q * 0.618 + glH(X * 0.37 + q) * 3, cyc = Math.floor(ph), f = ph - cyc, al = Math.sin(f * Math.PI);
      const px = X - c.pad + bx0 + glH(cyc * 3.17 + q * 7.1 + key.length) * (bx1 - bx0), py = Y - c.pad + by0 + glH(cyc * 5.31 + q * 2.3) * (by1 - by0), r = (strong ? 4.2 : 3) * al;
      g.globalAlpha = a0 * al; const gr = g.createRadialGradient(px, py, 0, px, py, r * 2.2); gr.addColorStop(0, 'rgba(255,245,255,.95)'); gr.addColorStop(0.4, `rgba(${T.c},.75)`); gr.addColorStop(1, `rgba(${T.c},0)`); g.fillStyle = gr; g.fillRect(px - r * 2.2, py - r * 2.2, r * 4.4, r * 4.4);
      g.strokeStyle = 'rgba(255,240,255,.9)'; g.lineWidth = 1; g.beginPath(); g.moveTo(px - r * 1.8, py); g.lineTo(px + r * 1.8, py); g.moveTo(px, py - r * 1.8); g.lineTo(px, py + r * 1.8); g.stroke(); } }
  g.restore(); }
// 몸 그림이 한 장인 직업(요정·마법사): 몸 전체 실루엣에 빛 (무기·방어구 중 높은 단계) — 무기 단계가 있으면 반짝임 추가
function bodyGlow(g, img, M, k, row, x, y, gl) { const wt = gl('weapon') || 0, at = Math.max(0, ...EN_ARMOR.map(sl => gl(sl) || 0)), t = Math.max(wt, at); if (!t) return;
  const sc = M.s || 1; layerGlow(g, img, M, k, row, Math.round(x - M.ax * sc), Math.round(y - M.ay * sc), sc, t, 'body:' + (img.src || '').slice(-24), wt ? 1 : 0.85, true); }
// ===== 요정·마법사 장비 외형: 기본 모습(지금 옷) + 부위별 장비 레이어 (착용한 부위만) · 무기는 종류별(활·지팡이·칼) 레이어
const CL_DEF = { elf: { pfx: 'elfl', layers: ["body", "boots_l", "armor_l", "armor_p", "belt", "gloves_l", "gloves_p", "cloak", "helm_l", "helm_p", "shield", "bow", "sword"], meta: {"body":{"idle":{"W":121,"H":148,"ax":35,"ay":138,"n":8},"walk":{"W":121,"H":155,"ax":35,"ay":137,"n":8},"attack":{"W":152,"H":152,"ax":46,"ay":139,"n":8},"attack_m":{"W":182,"H":164,"ax":62,"ay":143,"n":8}},"boots_l":{"idle":{"W":44,"H":54,"ax":22,"ay":43,"n":8},"walk":{"W":72,"H":71,"ax":36,"ay":52,"n":8},"attack":{"W":54,"H":59,"ax":27,"ay":45,"n":8},"attack_m":{"W":51,"H":57,"ax":25,"ay":45,"n":8}},"armor_l":{"idle":{"W":60,"H":65,"ax":30,"ay":119,"n":8},"walk":{"W":60,"H":69,"ax":30,"ay":121,"n":8},"attack":{"W":60,"H":69,"ax":30,"ay":123,"n":8},"attack_m":{"W":60,"H":70,"ax":30,"ay":122,"n":8}},"armor_p":{"idle":{"W":62,"H":68,"ax":31,"ay":122,"n":8},"walk":{"W":62,"H":70,"ax":31,"ay":122,"n":8},"attack":{"W":62,"H":70,"ax":31,"ay":124,"n":8},"attack_m":{"W":62,"H":72,"ax":31,"ay":123,"n":8}},"belt":{"idle":{"W":45,"H":28,"ax":23,"ay":83,"n":8},"walk":{"W":46,"H":30,"ax":23,"ay":82,"n":8},"attack":{"W":46,"H":28,"ax":23,"ay":83,"n":8},"attack_m":{"W":46,"H":30,"ax":23,"ay":82,"n":8}},"gloves_l":{"idle":{"W":54,"H":39,"ax":27,"ay":87,"n":8},"walk":{"W":58,"H":40,"ax":29,"ay":88,"n":8},"attack":{"W":94,"H":86,"ax":47,"ay":134,"n":8},"attack_m":{"W":126,"H":103,"ax":63,"ay":143,"n":8}},"gloves_p":{"idle":{"W":54,"H":39,"ax":27,"ay":87,"n":8},"walk":{"W":58,"H":42,"ax":29,"ay":89,"n":8},"attack":{"W":94,"H":87,"ax":47,"ay":134,"n":8},"attack_m":{"W":126,"H":103,"ax":63,"ay":143,"n":8}},"cloak":{"idle":{"W":62,"H":111,"ax":31,"ay":117,"n":8},"walk":{"W":62,"H":112,"ax":31,"ay":116,"n":8},"attack":{"W":62,"H":111,"ax":31,"ay":117,"n":8},"attack_m":{"W":62,"H":112,"ax":31,"ay":116,"n":8}},"helm_l":{"idle":{"W":24,"H":24,"ax":12,"ay":135,"n":8},"walk":{"W":26,"H":25,"ax":13,"ay":134,"n":8},"attack":{"W":30,"H":27,"ax":15,"ay":136,"n":8},"attack_m":{"W":37,"H":27,"ax":18,"ay":135,"n":8}},"helm_p":{"idle":{"W":26,"H":27,"ax":13,"ay":136,"n":8},"walk":{"W":28,"H":29,"ax":14,"ay":135,"n":8},"attack":{"W":32,"H":28,"ax":16,"ay":136,"n":8},"attack_m":{"W":40,"H":34,"ax":20,"ay":136,"n":8}},"shield":{"idle":{"W":108,"H":64,"ax":54,"ay":109,"n":8},"walk":{"W":108,"H":64,"ax":54,"ay":108,"n":8},"attack":{"W":114,"H":110,"ax":57,"ay":154,"n":8},"attack_m":{"W":114,"H":67,"ax":57,"ay":116,"n":8}},"bow":{"idle":{"W":56,"H":103,"ax":28,"ay":121,"n":8},"walk":{"W":64,"H":105,"ax":32,"ay":121,"n":8},"attack":{"W":184,"H":153,"ax":92,"ay":170,"n":8}},"sword":{"idle":{"W":112,"H":58,"ax":56,"ay":97,"n":8},"walk":{"W":105,"H":88,"ax":52,"ay":139,"n":8},"attack":{"W":112,"H":130,"ax":56,"ay":169,"n":8},"attack_m":{"W":234,"H":200,"ax":117,"ay":194,"n":8}}} },
  wizard: { pfx: 'magel', layers: ["body", "armor_l", "belt", "gloves_l", "cloak", "helm_l", "staff", "sword"], meta: {"body":{"idle":{"W":125,"H":160,"ax":37,"ay":142,"n":8},"walk":{"W":131,"H":162,"ax":42,"ay":141,"n":8},"attack":{"W":188,"H":187,"ax":60,"ay":167,"n":8},"cast":{"W":175,"H":170,"ax":57,"ay":150,"n":8}},"armor_l":{"idle":{"W":56,"H":73,"ax":28,"ay":119,"n":8},"walk":{"W":56,"H":75,"ax":28,"ay":119,"n":8},"attack":{"W":62,"H":85,"ax":31,"ay":126,"n":8},"cast":{"W":56,"H":82,"ax":28,"ay":128,"n":8}},"belt":{"idle":{"W":44,"H":24,"ax":22,"ay":85,"n":8},"walk":{"W":42,"H":26,"ax":22,"ay":84,"n":8},"attack":{"W":46,"H":46,"ax":24,"ay":101,"n":8},"cast":{"W":44,"H":30,"ax":22,"ay":91,"n":8}},"gloves_l":{"idle":{"W":70,"H":47,"ax":35,"ay":100,"n":8},"walk":{"W":74,"H":49,"ax":37,"ay":99,"n":8},"attack":{"W":122,"H":124,"ax":61,"ay":167,"n":8},"cast":{"W":116,"H":97,"ax":58,"ay":150,"n":8}},"cloak":{"idle":{"W":66,"H":117,"ax":33,"ay":121,"n":8},"walk":{"W":66,"H":118,"ax":33,"ay":119,"n":8},"attack":{"W":68,"H":122,"ax":34,"ay":120,"n":8},"cast":{"W":66,"H":118,"ax":33,"ay":122,"n":8}},"helm_l":{"idle":{"W":28,"H":29,"ax":14,"ay":142,"n":8},"walk":{"W":30,"H":29,"ax":15,"ay":141,"n":8},"attack":{"W":58,"H":43,"ax":29,"ay":142,"n":8},"cast":{"W":38,"H":33,"ax":19,"ay":144,"n":8}},"staff":{"idle":{"W":84,"H":171,"ax":42,"ay":177,"n":8},"walk":{"W":102,"H":175,"ax":51,"ay":179,"n":8},"attack":{"W":286,"H":272,"ax":143,"ay":243,"n":8},"cast":{"W":266,"H":222,"ax":133,"ay":228,"n":8}},"sword":{"idle":{"W":142,"H":92,"ax":71,"ay":147,"n":8},"walk":{"W":171,"H":77,"ax":85,"ay":94,"n":8},"attack":{"W":241,"H":226,"ax":120,"ay":219,"n":8},"cast":{"W":142,"H":115,"ax":71,"ay":170,"n":8}}} } };
const CL_IMG = {}, CL_SLOT = { boots: 'boots', armor: 'armor', gloves: 'gloves', helm: 'helm', belt: 'belt', cloak: 'cloak', shield: 'shield', bow: 'weapon', staff: 'weapon', sword: 'weapon' };
function clImg(cls, L, a) { const D = CL_DEF[cls], m = D && D.meta[L] && D.meta[L][a]; if (!m) return null; const k = D.pfx + '_' + L + '_' + a; let i = CL_IMG[k]; if (!i) { i = CL_IMG[k] = new Image(); i.decoding = 'async'; i.src = `assets/classic/${k}.webp`; } return i.complete && i.naturalWidth ? i : null; }
const wKind = id => { const w = id && ITEMS[id] && ITEMS[id].wtype; return w === 'bow' ? 'bow' : w === 'staff' ? 'staff' : id ? 'sword' : null; };
function clLayerId(cls, L, eqf) { const v = /_([lp])$/.exec(L), base = v ? L.slice(0, -2) : L, slot = CL_SLOT[base]; if (!slot) return null; const id = eqf(slot); if (!id || !ITEMS[id]) return null;
  if (v) { const want = ITEMS[id].look === 'p' && CL_DEF[cls].layers.includes(base + '_p') ? 'p' : 'l'; if (want !== v[1]) return null; }
  if (slot === 'weapon' && wKind(id) !== base) return null; return id; }
function clAnim(cls, anim, eqf) { if (cls === 'elf' && (anim === 'attack' || anim === 'attack2')) return wKind(eqf('weapon')) === 'bow' || !eqf('weapon') ? 'attack' : 'attack_m'; if (anim === 'attack2') return 'attack'; if (anim === 'cast' && cls !== 'wizard') return 'attack'; return anim === 'look' ? 'idle' : anim; }
function drawClassLayers(g, cls, anim, fr, row, x, y, hurtF, eqf, gl) { const D = CL_DEF[cls]; if (!D) return false; eqf = eqf || INV.equipped; let a = clAnim(cls, anim, eqf);
  if (!D.meta.body[a]) a = D.meta.body.attack ? 'attack' : 'idle'; const body = clImg(cls, 'body', a); if (!body) { for (const aa of ['idle', 'walk', a]) clImg(cls, 'body', aa); return false; }
  const sc = KN.s || 1;
  for (const L of D.layers) { let id = null; if (L !== 'body') { id = clLayerId(cls, L, eqf); if (!id) continue; }
    const img = clImg(cls, L, a); if (!img) continue; const M = D.meta[L][a], k = Math.min(fr, M.n - 1), f = L === 'body' ? null : ((LOOK[CL_SLOT[L.replace(/_[lp]$/, '')]] || {})[id] ?? null), src = f ? tintSheet(img, f) : img;
    g.save(); if (hurtF) g.filter = hurtF; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(src, k * M.W, row * M.H, M.W, M.H, Math.round(x - M.ax * sc), Math.round(y - M.ay * sc), M.W * sc, M.H * sc); g.restore();
    if (gl && L !== 'body') { const t = gl(CL_SLOT[L.replace(/_[lp]$/, '')]); if (t) layerGlow(g, img, M, k, row, Math.round(x - M.ax * sc), Math.round(y - M.ay * sc), sc, t, D.pfx + L + ':' + a, CL_SLOT[L.replace(/_[lp]$/, '')] === 'weapon' ? 1 : 0.85); } }
  return true; }
function drawHeroSprite(g, anim, fr, row, x, y, hf, cls, eqf, gl) { cls = cls || CLASS; if (gl === undefined) gl = eqf ? null : myGlowT;
  { const pm = polyOf(eqf || INV.equipped); if (pm && drawPoly(g, pm, anim, fr, row, x, y, hf)) return true; }   // 변신 (데스나이트 세트 등)
  if (cls !== 'knight' && CL_DEF[cls] && drawClassLayers(g, cls, anim, fr, row, x, y, hf, eqf, gl)) return true;
  if (cls !== 'knight') { const M = CLSM[cls], a = anim === 'walk' ? 'walk' : (anim === 'attack' || anim === 'attack2') ? 'attack' : 'idle', img = M && clsImg(cls, a);
    if (img) { const m = M[a]; g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; drawSheet(g, img, { W: m.W, H: m.H, ax: m.ax, ay: m.ay, s: KN.s || 1 }, Math.min(fr, m.n - 1), row, x, y, 1, hf); if (gl) bodyGlow(g, img, { W: m.W, H: m.H, ax: m.ax, ay: m.ay, s: KN.s || 1 }, Math.min(fr, m.n - 1), row, x, y, gl); g.restore(); return true; }
    return drawKnightLayers(g, anim === 'look' ? 'idle' : anim, fr, row, x, y, hf || (cls === 'elf' ? 'hue-rotate(75deg) saturate(.85) brightness(1.05)' : 'grayscale(.85) brightness(1.45)'), eqf, gl); }
  return drawKnightLayers(g, anim, fr, row, x, y, hf, eqf, gl); }
function drawKnightLayers(g, anim, fr, row, x, y, hurtF, eqf, gl) {
  klPreload(); const body = klImg('body', anim); if (!body || !body.complete || !body.naturalWidth) return false;
  const sc = KN.s || 1;
  for (const L of KL_LAYERS) {
    let id = null; if (L !== 'body') { id = (eqf || INV.equipped)(KL_SLOT[L]); if (!id) continue; }
    const LN = L === 'body' ? 'body' : klName(L, id); const img = klImg(LN, anim); if (!img || !img.complete || !img.naturalWidth) continue;
    const M = KLM[LN][anim], k = Math.min(fr, M.n - 1), f = L === 'body' ? null : ((LOOK[KL_SLOT[L]] || {})[id] ?? null);
    const src = f ? tintSheet(img, f) : img;
    g.save(); if (hurtF) g.filter = hurtF; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(src, k * M.W, row * M.H, M.W, M.H, Math.round(x - M.ax * sc), Math.round(y - M.ay * sc), M.W * sc, M.H * sc); g.restore();
    if (gl && L !== 'body') { const t = gl(KL_SLOT[L]); if (t) layerGlow(g, img, M, k, row, Math.round(x - M.ax * sc), Math.round(y - M.ay * sc), sc, t, LN + ':' + anim, L === 'sword' ? 1 : 0.85); } }   // 강화 빛 (장비 부위마다 자기 단계)
  return true; }

// ---------- drawing ----------
const KN=META.knight, FX=META.fox;
// ============================================================ 전투 연출: 투사체(화살·볼트·거미줄) · 타격 불꽃 · 몬스터 공격/피격 모션
const IMPACTS = [];
function stunDing(f){ if (!AC||!SFX_ON||!DN.seen(f.i,f.j)) return; const d=Math.hypot(f.x-hero.x,f.z-hero.z), v=Math.max(0.25,1-d/14); const t=AC.currentTime;   // 스턴 중 머리 위 별: 띵·띵 종소리
  tone(t,'sine',2093,2093,0.16,0.05*v); tone(t,'triangle',4186,4186,0.08,0.012*v); tone(t+0.11,'sine',2637,2637,0.2,0.045*v); tone(t+0.11,'triangle',5274,5274,0.08,0.01*v); }
function impact(x, y, kind, c) { IMPACTS.push({ x, y, t: 0, life: kind === 'quake' ? 2.2 : kind === 'bolt' ? 0.42 : kind === 'miss' ? 0.35 : 0.3, kind, c: c || '#ffe2a0', s: Math.random() * 6.28 }); }
function drawImpacts(g) { if (!IMPACTS.length) return; g.save(); g.globalCompositeOperation = 'lighter';
  for (const p of IMPACTS) { const k = p.t / p.life, a = 1 - k;
    if (p.kind === 'quake') { g.globalCompositeOperation = 'source-over'; const R = 18 + k * 40; g.strokeStyle = `rgba(30,18,8,${0.85 * a})`; g.lineWidth = 2.2; g.beginPath();
      for (let q = 0; q < 9; q++) { const an = p.s + q * 0.698, r1 = R * (0.6 + 0.4 * ((q * 5) % 3) / 2); g.moveTo(p.x + Math.cos(an) * 4, p.y + Math.sin(an) * 2); g.lineTo(p.x + Math.cos(an + 0.15) * r1 * 0.55, p.y + Math.sin(an + 0.15) * r1 * 0.3); g.lineTo(p.x + Math.cos(an) * r1, p.y + Math.sin(an) * r1 * 0.5); } g.stroke();
      g.fillStyle = `rgba(120,96,64,${0.35 * a})`; g.beginPath(); g.ellipse(p.x, p.y, R * 1.2, R * 0.55, 0, 0, 7); g.fill(); g.globalCompositeOperation = 'lighter'; continue; }
    if (p.kind === 'miss') { g.globalCompositeOperation = 'source-over'; g.fillStyle = `rgba(190,180,160,${0.45 * a})`; for (let n = 0; n < 5; n++) { const an = p.s + n * 1.26, r = 4 + k * 12; g.beginPath(); g.arc(p.x + Math.cos(an) * r, p.y + Math.sin(an) * r * 0.5, 2.5 + k * 3, 0, 7); g.fill(); } g.globalCompositeOperation = 'lighter'; continue; }
    const R = (p.kind === 'bolt' ? 22 : 13) * (0.35 + k);
    g.strokeStyle = p.c; g.globalAlpha = 0.85 * a; g.lineWidth = p.kind === 'bolt' ? 2.2 : 1.5; g.beginPath(); g.ellipse(p.x, p.y, R, R * 0.55, 0, 0, 7); g.stroke();
    const n = p.kind === 'bolt' ? 9 : 6; g.lineWidth = 1.3; g.beginPath();
    for (let q = 0; q < n; q++) { const an = p.s + q * 6.283 / n, r0 = R * 0.35, r1 = R * (0.8 + 0.5 * ((q * 7) % 3) / 2); g.moveTo(p.x + Math.cos(an) * r0, p.y + Math.sin(an) * r0 * 0.6); g.lineTo(p.x + Math.cos(an) * r1, p.y + Math.sin(an) * r1 * 0.6); }
    g.stroke(); if (k < 0.35) { const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, R); gr.addColorStop(0, p.c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = (0.35 - k) * 2; g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, R, 0, 7); g.fill(); } }
  g.restore(); }
// 화살: 살대 + 촉 + 깃, 날아가는 방향으로 회전, 잔상·빛 꼬리
const ARC_H = 0;   // 화살은 곧게 날아감 (포물선 없음)
const arrowAt = (a, k) => [a.x0 + (a.x1 - a.x0) * k, a.y0 + (a.y1 - a.y0) * k - Math.sin(k * Math.PI) * ARC_H];
function drawArrowShape(g, x, y, ang, al) { g.save(); g.translate(x, y); g.rotate(ang); g.globalAlpha = al;
  g.lineCap = 'round'; g.strokeStyle = '#2a1a0c'; g.lineWidth = 3; g.beginPath(); g.moveTo(-24, 0); g.lineTo(-3, 0); g.stroke();
  g.strokeStyle = '#d0a870'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-24, 0); g.lineTo(-3, 0); g.stroke();
  g.fillStyle = '#e4eaf2'; g.strokeStyle = '#30343a'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(4, 0); g.lineTo(-5, -3.6); g.lineTo(-3, 0); g.lineTo(-5, 3.6); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#c0342a'; g.beginPath(); g.moveTo(-17, 0); g.lineTo(-25, -4.2); g.lineTo(-22.5, 0); g.closePath(); g.fill(); g.beginPath(); g.moveTo(-17, 0); g.lineTo(-25, 4.2); g.lineTo(-22.5, 0); g.closePath(); g.fill();
  g.strokeStyle = '#f4ece0'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(-18, 0); g.lineTo(-24, -2.6); g.moveTo(-18, 0); g.lineTo(-24, 2.6); g.stroke(); g.restore(); }
// 불덩이(오크 마법사)·마력탄(마법사) — 곧게 날아가는 빛 구슬 + 꼬리
function fireBurst(x, y) { impact(x, y, 'bolt', '#ff7a2a'); for (let n = 0; n < 14; n++) { const an = Math.random() * 6.283, sp = 40 + Math.random() * 80; parts.push({ x, y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp * 0.6 - 30, life: 0.5, max: 0.5, ember: true }); }
  if (AC && SFX_ON) { const t = AC.currentTime; nz(t, 0.25, 900, 300, 0.12); } }
function drawOrb(g, a) { const k = Math.min(1, a.t / a.dur), P = q => [a.x0 + (a.x1 - a.x0) * q, a.y0 + (a.y1 - a.y0) * q - Math.sin(q * Math.PI) * 6], [x, y] = P(k), fire = a.kind === 'fireball';
  const C = fire ? ['255,120,30', '255,200,90', '255,250,220'] : (a.col || ['150,110,255', '170,200,255', '240,240,255']);
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let q = 7; q >= 1; q--) { const kq = Math.max(0, k - q * 0.035), [qx, qy] = P(kq); g.globalAlpha = (0.5 - q * 0.055) * (fire ? 1 : 0.9); g.fillStyle = `rgb(${C[0]})`; g.beginPath(); g.arc(qx + (fire ? Math.sin(time * 40 + q) * 1.5 : 0), qy + (fire ? Math.cos(time * 37 + q) * 1.5 : 0), (fire ? 10 : 8) - q * 1.0, 0, 7); g.fill(); }
  g.globalAlpha = 1; const r0 = fire ? 20 : 17, gr = g.createRadialGradient(x, y, 0, x, y, r0); gr.addColorStop(0, `rgba(${C[2]},1)`); gr.addColorStop(0.3, `rgba(${C[1]},.9)`); gr.addColorStop(1, `rgba(${C[0]},0)`); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r0, 0, 7); g.fill();
  if (fire) { for (let q = 0; q < 5; q++) { const an = time * 18 + q * 1.26; g.fillStyle = `rgba(255,${150 + q * 20},60,.6)`; g.beginPath(); g.ellipse(x + Math.cos(an) * 5, y + Math.sin(an) * 4, 3.5, 6, an, 0, 7); g.fill(); } if (Math.random() < 0.5) parts.push({ x: x + (Math.random() - 0.5) * 6, y, vx: (Math.random() - 0.5) * 20, vy: -10 - Math.random() * 20, life: 0.4, max: 0.4, ember: true }); }
  else { g.strokeStyle = 'rgba(230,220,255,.85)'; g.lineWidth = 1; g.beginPath(); for (let q = 0; q < 3; q++) { const an = time * 23 + q * 2.1; g.moveTo(x, y); g.lineTo(x + Math.cos(an) * 9, y + Math.sin(an * 1.3) * 6); g.lineTo(x + Math.cos(an + 0.6) * 13, y + Math.sin(an * 1.3 + 0.5) * 9); } g.stroke(); }
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, 3.2, 0, 7); g.fill(); g.restore(); }
function drawArrows(g) { for (const a of arrows) { if (a.kind === 'fireball' || a.kind === 'bolt') { drawOrb(g, a); continue; } const k = Math.min(1, a.t / a.dur), [x, y] = arrowAt(a, k), ang = Math.atan2((a.y1 - a.y0) - Math.cos(k * Math.PI) * Math.PI * ARC_H, a.x1 - a.x0);
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; const k0 = Math.max(0, k - 0.22), [tx, ty] = arrowAt(a, k0), gr = g.createLinearGradient(tx, ty, x, y);
    gr.addColorStop(0, 'rgba(255,220,150,0)'); gr.addColorStop(1, 'rgba(255,230,170,.55)'); g.strokeStyle = gr; g.lineWidth = 3.2; g.beginPath(); g.moveTo(tx, ty); for (let q = 1; q <= 4; q++) { const [qx, qy] = arrowAt(a, k0 + (k - k0) * q / 4); g.lineTo(qx, qy); } g.stroke();
    const hg = g.createRadialGradient(x, y, 0, x, y, 9); hg.addColorStop(0, 'rgba(255,240,200,.5)'); hg.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = hg; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); g.restore();
    for (const [dk, al] of [[0.1, 0.18], [0.05, 0.32]]) if (k - dk > 0) { const [px, py] = arrowAt(a, k - dk); drawArrowShape(g, px, py, ang, al); }
    drawArrowShape(g, x, y, ang, 1); } }
// 몬스터 공격·피격 자세: 준비(뒤로 당기며 웅크림) → 돌진(앞으로 늘어남) → 복귀, 맞으면 뒤로 밀리며 찌그러짐·기울어짐
const MP = { lx: 0, ly: 0, sx: 1, sy: 1, rot: 0, red: false };
function mobPose(f, atkScale) { MP.lx = 0; MP.ly = 0; MP.sx = 1; MP.sy = 1; MP.rot = 0; MP.red = false;
  const L_ = 0.3 / GSPD;
  if (f.lunge > 0 && !f.dead) { const u = 1 - f.lunge / L_, d = DIRV[f.row], ux = (d[0] - d[1]) * K, uy = (d[0] + d[1]) * K * 0.5; let m, sq;
    if (u < 0.35) { const e = u / 0.35; m = -0.14 * Math.sin(e * Math.PI / 2); sq = 0.08 * e; }
    else if (u < 0.55) { const e = (u - 0.35) / 0.2; m = -0.14 + 0.58 * (1 - (1 - e) * (1 - e)); sq = 0.08 - 0.18 * e; }
    else { const e = (u - 0.55) / 0.45; m = 0.44 * (1 - e) * (1 - e) - 0.05 * Math.sin(e * Math.PI); sq = -0.1 * (1 - e) * (1 - e); }
    m *= atkScale; MP.lx = ux * m; MP.ly = uy * m; MP.sx = 1 + sq * atkScale; MP.sy = 1 - sq * atkScale; MP.rot = Math.sign(ux || 1) * Math.max(0, -sq) * 0.9 * atkScale; }
  if (f.dead) { const kd = Math.min(1, f.deadT / 0.25), sink = Math.min(1, f.deadT / 1.4); MP.lx += (f.kx || 0) * (f.kmag || 4) * 1.6 * kd; MP.ly += (f.ky || 0) * (f.kmag || 4) * 1.6 * kd + sink * 5; MP.sy *= 1 - 0.22 * sink; MP.sx *= 1 + 0.08 * sink; MP.rot += (f.kx || 0) * 0.25 * kd; return; }
  if (f.hitT > 0) { const a = 1 - f.hitT / f.hitD, push = a < 0.2 ? a / 0.2 : (1 - (a - 0.2) / 0.8) ** 2;
    MP.lx += f.kx * f.kmag * push; MP.ly += f.ky * f.kmag * push; MP.sx *= 1 + 0.1 * push; MP.sy *= 1 - 0.1 * push; MP.rot += f.kx * 0.13 * push; MP.red = f.flash <= 0 && a < 0.55; } }
function mobHitFx(f, crit) { const [fx, fy] = W2P(f.x, f.z), [hx, hy] = W2P(hero.x, hero.z); const vx = fx - hx, vy = fy - hy, L = Math.hypot(vx, vy) || 1;
  f.kx = vx / L; f.ky = vy / L; f.hitD = crit ? 0.42 : 0.3; f.hitT = f.hitD; f.kmag = (crit ? 9 : 5) * (MOB[f.kind].boss ? 0.5 : 1);
  for (let n = 0; n < (crit ? 8 : 4); n++) parts.push({ x: fx + (Math.random() - 0.5) * 18, y: fy - 2, vx: (Math.random() - 0.5) * 40 + f.kx * 30, vy: -14 - Math.random() * 26, life: 0.5, max: 0.5, dust: true }); }
// 큰 렌더 그림(나무·소품)을 매 프레임 축소해 그리면 느림 → 그릴 크기로 한 번 줄여 저장해 두고 1:1로 그림
const PRESC = new Map();
function prescaled(img, sc) { const W0 = img && (img.naturalWidth || img.width); if (!W0 || sc >= 0.999) return sc >= 0.999 ? img : null; let m = PRESC.get(img); if (!m) PRESC.set(img, m = {}); const k = sc.toFixed(3); if (m[k]) return m[k];
  const w = Math.max(1, Math.round(W0 * sc)), h = Math.max(1, Math.round((img.naturalHeight || img.height) * sc)), c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, w, h); return (m[k] = c); }
// 임시로 물들인 몬스터(오크숲): 그릴 크기로 줄인 프레임을 한 번 물들여 저장 (매 프레임 filter는 아주 느림)
const TFR = new Map();
function tintFrame(k, a, img, M, fr, row) { const key = k + a + fr + '_' + row; let c = TFR.get(key); if (c) return c; if (TFR.size > 900) TFR.clear();
  const sc = M.s || 1, w = Math.ceil(M.W * sc), h = Math.ceil(M.H * sc); c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.filter = M.tint; g.drawImage(img, fr * M.W, row * M.H, M.W, M.H, 0, 0, w, h); TFR.set(key, c); return c; }
function drawSheet(g, img, meta, frame, row, x, y, alpha=1, filter=null){
  if (!img.complete) return; g.save(); g.globalAlpha=alpha; const flash=filter&&filter.startsWith('brightness(2.6)'); if (filter&&!flash) g.filter=filter;
  const sc=meta.s||1; if (sc<1){ g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high'; }
  const a=[img, frame*meta.W, row*meta.H, meta.W, meta.H, Math.round(x-meta.ax*sc), Math.round(y-meta.ay*sc), meta.W*sc, meta.H*sc];
  g.drawImage(...a); if (flash){ g.globalCompositeOperation='lighter'; g.globalAlpha=alpha*0.8; g.drawImage(...a); g.drawImage(...a); } g.restore(); }
let time=0;
// 맵 가장자리를 부드럽게 지워 숲 배경과 자연스럽게 섞음
function edgeFade(g, q, w){ g.save(); g.setTransform(1,0,0,1,0,0); g.globalCompositeOperation='destination-out'; g.filter=`blur(${Math.round(w*0.45)}px)`;
  g.strokeStyle='rgba(0,0,0,1)'; g.lineWidth=w; g.lineJoin='round'; g.beginPath(); q.forEach(([x,y],k)=>k?g.lineTo(x,y):g.moveTo(x,y)); g.closePath(); g.stroke(); g.restore(); }
// 맵 밖 숲 배경: 나무·덤불 그림을 빽빽하게 깐 이음매 없는 무늬 (한 번만 만듦)
let forestCv=null, forestP=null;
function forestPat(g){ if (forestP) return forestP; const ks=['tree0','tree1','tree2','bush0','bush1','bush2']; if (!ks.every(k=>im[k]&&im[k].complete&&im[k].naturalWidth)) return null;
  const PW=768, PH2=512, c=document.createElement('canvas'); c.width=PW; c.height=PH2; const x=c.getContext('2d');
  x.fillStyle='#1a2312'; x.fillRect(0,0,PW,PH2);
  for (let k=0;k<1400;k++){ const a=Math.random()*PW, b=Math.random()*PH2, r=2+Math.random()*7; x.fillStyle=`rgba(${20+Math.random()*30|0},${30+Math.random()*30|0},${12+Math.random()*14|0},.5)`; x.beginPath(); x.ellipse(a,b,r*2,r,0,0,7); x.fill(); }
  let seed=7; const R=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
  const items=[]; for (let k=0;k<70;k++) items.push({k:ks[k%5<3?k%3:3+k%3], x:R()*PW, y:R()*PH2}); items.sort((a,b)=>a.y-b.y);
  x.imageSmoothingEnabled=true; x.imageSmoothingQuality='high';
  for (const it of items){ const S=META.sprites[it.k], sc=(S.s||1)*(0.85+R()*0.3), w=S.W*sc, h=S.H*sc;
    for (const dx of [-PW,0,PW]) for (const dy of [-PH2,0,PH2]){ const X=it.x+dx-S.ax*sc, Y=it.y+dy-S.ay*sc; if (X>PW||Y>PH2||X+w<0||Y+h<0) continue; x.drawImage(im[it.k],X,Y,w,h); } }
  x.fillStyle='rgba(8,14,6,.38)'; x.fillRect(0,0,PW,PH2);
  forestCv=c; forestP=g.createPattern(c,'repeat'); return forestP; }
// 사막 소품: 바위는 햇빛에 바랜 모래빛, 덤불은 말라 죽은 갈색 (한 번 물들여 저장)
const SANDP = {};
function sandProp(key, type) { if (SANDP[key]) return SANDP[key]; const src = im[key]; if (!src || !src.naturalWidth) return src; const c = document.createElement('canvas'); c.width = src.naturalWidth; c.height = src.naturalHeight; const g = c.getContext('2d');
  g.filter = type === 'bush' ? 'sepia(1) saturate(.55) hue-rotate(-12deg) brightness(.82) contrast(1.15)' : 'sepia(.6) saturate(.85) brightness(1.2) contrast(.95)'; g.drawImage(src, 0, 0); return (SANDP[key] = c); }
// ===== 사막 소품 (코드로 그린 임시 그림, 2배 해상도로 한 번 그려 저장): 선인장 3종 · 야자수 · 죽은 나무 · 바위 기둥 · 해골 · 갈대
const PROPC = {};
function propCanvas(type, v) { const key = type + v; if (PROPC[key] !== undefined) return PROPC[key]; const DIM = { cactus: [60, 70, 30, 64], palm: [110, 110, 50, 102], deadtree: [80, 80, 40, 74], spire: [50, 90, 25, 84], skull: [36, 22, 18, 16], reeds: [40, 40, 20, 34], tent: [86, 76, 43, 62], totem: [44, 104, 22, 98], bonfire: [48, 30, 24, 20], palisade: [64, 76, 32, 58], banner: [44, 104, 14, 98], rack: [56, 58, 28, 46], bones: [36, 22, 18, 14], stump: [44, 32, 22, 22] }[type];
  if (!DIM) return (PROPC[key] = null); const [W, H, ax, ay] = DIM, S2 = 2, c = document.createElement('canvas'); c.width = W * S2; c.height = H * S2; const g = c.getContext('2d'); g.scale(S2, S2); g.translate(ax, ay); g.lineJoin = 'round'; g.lineCap = 'round';
  const shadow = (rx, ry) => { g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(4, 1, rx, ry, 0, 0, 7); g.fill(); };
  const lg = (x0, x1, a, b) => { const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; };
  if (type === 'cactus') { const G1 = '#86b25a', G2 = '#2e5a22', OL = '#1a3010';
    if (v === 0) { shadow(14, 5); const limb = (pts, w) => { g.lineWidth = w + 2.4; g.strokeStyle = OL; g.beginPath(); pts.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.lineWidth = w; g.strokeStyle = lg(-6, 6, G1, G2); g.stroke(); g.lineWidth = 1; g.strokeStyle = 'rgba(220,255,180,.35)'; g.stroke(); };
      limb([[0, 0], [0, -50]], 9); limb([[-1, -24], [-10, -24], [-10, -38]], 6); limb([[1, -30], [9, -30], [9, -42]], 5.5);
      g.fillStyle = '#f0e8c0'; for (let k = 0; k < 14; k++) g.fillRect(-3 + (k % 3) * 3, -6 - k * 3.2, 0.7, 0.7); g.fillStyle = '#ffd860'; g.beginPath(); g.arc(0, -51, 1.6, 0, 7); g.fill(); }
    else if (v === 1) { shadow(11, 4); const gr = g.createRadialGradient(-3, -13, 1, 0, -10, 12); gr.addColorStop(0, G1); gr.addColorStop(1, G2); g.fillStyle = gr; g.strokeStyle = OL; g.lineWidth = 1.2; g.beginPath(); g.ellipse(0, -9, 10, 10, 0, 0, 7); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(20,50,12,.6)'; g.lineWidth = 0.9; for (let k = -2; k <= 2; k++) { g.beginPath(); g.ellipse(0, -9, Math.abs(k) * 2.6 + 0.4, 9.6, 0, -Math.PI / 2, Math.PI / 2, k < 0); g.stroke(); }
      g.fillStyle = '#ff7a8a'; for (const [x, y] of [[-3, -19], [1, -20], [4, -18]]) { g.beginPath(); g.arc(x, y, 1.8, 0, 7); g.fill(); } }
    else { shadow(16, 5); const pad = (x, y, r, rot) => { g.save(); g.translate(x, y); g.rotate(rot); const gr = g.createRadialGradient(-2, -2, 1, 0, 0, 8); gr.addColorStop(0, '#9cc26a'); gr.addColorStop(1, '#3e6a2a'); g.fillStyle = gr; g.strokeStyle = OL; g.lineWidth = 1; g.beginPath(); g.ellipse(0, 0, r * 0.7, r, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#e8e0b8'; for (let k = 0; k < 5; k++) g.fillRect(-2 + (k * 3) % 5, -4 + k * 2, 0.7, 0.7); g.restore(); };
      pad(-6, -7, 7, -0.3); pad(6, -8, 7, 0.35); pad(0, -16, 7.5, 0); pad(-8, -19, 5.5, -0.6); pad(8, -21, 5, 0.5); g.fillStyle = '#c03a5a'; for (const [x, y] of [[-1, -24], [3, -24], [-9, -25]]) { g.beginPath(); g.ellipse(x, y, 1.6, 2, 0, 0, 7); g.fill(); } } }
  else if (type === 'palm') { shadow(26, 7); const lean = v ? -1 : 1, top = [lean * 12, -66]; g.strokeStyle = '#3a2814'; g.lineWidth = 7.5; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(lean * 2, -34, top[0], top[1]); g.stroke(); g.strokeStyle = lg(-4, 6, '#a8804e', '#5a3e20'); g.lineWidth = 5.5; g.stroke();
    g.strokeStyle = 'rgba(40,24,10,.55)'; g.lineWidth = 0.9; for (let k = 1; k < 12; k++) { const t = k / 12, x = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * lean * 2 + t * t * top[0], y = 2 * (1 - t) * t * -34 + t * t * top[1]; g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x + 3, y + 1); g.stroke(); }
    for (let q = 0; q < 8; q++) { const a = -Math.PI / 2 + (q - 3.5) * 0.48 + (q % 2 ? 0.1 : -0.1), L = 30 + (q % 3) * 5, ex = top[0] + Math.cos(a) * L, ey = top[1] + Math.sin(a) * L * 0.55 + 16 + Math.abs(q - 3.5) * 2, mx = top[0] + Math.cos(a) * L * 0.5, my = top[1] + Math.sin(a) * L * 0.4 - 6;
      g.strokeStyle = '#1e3a12'; g.lineWidth = 3.2; g.beginPath(); g.moveTo(top[0], top[1]); g.quadraticCurveTo(mx, my, ex, ey); g.stroke(); g.strokeStyle = q % 2 ? '#5a8a32' : '#6a9a3a'; g.lineWidth = 2; g.stroke();
      g.lineWidth = 1.1; for (let k = 2; k < 9; k++) { const t = k / 9, px = (1 - t) * (1 - t) * top[0] + 2 * (1 - t) * t * mx + t * t * ex, py = (1 - t) * (1 - t) * top[1] + 2 * (1 - t) * t * my + t * t * ey; g.beginPath(); g.moveTo(px, py); g.lineTo(px + 2, py + 5 - t * 2); g.moveTo(px, py); g.lineTo(px - 2, py + 5 - t * 2); g.stroke(); } }
    g.fillStyle = '#5a3a14'; for (const [dx, dy] of [[-2, 2], [2, 3], [0, 5]]) { g.beginPath(); g.arc(top[0] + dx, top[1] + dy, 2.2, 0, 7); g.fill(); } }
  else if (type === 'deadtree') { shadow(18, 5); const br = (x, y, a, L, w, d) => { if (d > 3 || L < 4) return; const ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L; g.strokeStyle = '#2a2018'; g.lineWidth = w + 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke(); g.strokeStyle = '#7a6a58'; g.lineWidth = w; g.stroke(); br(ex, ey, a - 0.5, L * 0.66, w * 0.62, d + 1); br(ex, ey, a + 0.45, L * 0.6, w * 0.6, d + 1); };
    br(0, 0, -Math.PI / 2 - 0.08, 30, 5, 0); }
  else if (type === 'spire') { const Hh = v ? 62 : 78, wb = v ? 13 : 11; shadow(16, 6); g.beginPath(); g.moveTo(-wb, 0); g.lineTo(-wb + 2, -Hh * 0.45); g.lineTo(-wb * 0.55, -Hh * 0.8); g.lineTo(-2, -Hh); g.lineTo(wb * 0.4, -Hh * 0.92); g.lineTo(wb * 0.7, -Hh * 0.55); g.lineTo(wb, 0); g.closePath();
    g.fillStyle = lg(-wb, wb, '#e8b880', '#8a5a34'); g.fill(); g.save(); g.clip(); for (let k = 0; k < 9; k++) { g.fillStyle = k % 2 ? 'rgba(120,70,30,.22)' : 'rgba(255,230,190,.14)'; g.fillRect(-wb - 2, -k * Hh / 9 - Hh / 9, wb * 2 + 4, Hh / 18); } g.fillStyle = 'rgba(60,30,10,.28)'; g.fillRect(wb * 0.15, -Hh, wb, Hh); g.restore(); g.strokeStyle = '#4a2c14'; g.lineWidth = 1.1; g.stroke(); }
  else if (type === 'skull') { g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(2, 1, 12, 4, 0, 0, 7); g.fill(); g.strokeStyle = '#e8e2cc'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-10, -2); g.lineTo(8, 2); g.moveTo(-9, 3); g.lineTo(7, -3); g.stroke();
    g.fillStyle = '#f2ecd8'; g.strokeStyle = '#6a604c'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(2, -6, 6, 5, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#3a3020'; g.beginPath(); g.arc(0, -6, 1.3, 0, 7); g.arc(4, -6, 1.3, 0, 7); g.fill(); g.fillRect(1.5, -3, 1, 1.5); }
  else if (type === 'reeds') { for (let k = 0; k < 7; k++) { const x = (k - 3) * 2.4, h = 14 + (k * 7) % 10, bend = (k % 3 - 1) * 3; g.strokeStyle = k % 2 ? '#5a8a3a' : '#7aa850'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + bend * 0.3, -h * 0.6, x + bend, -h); g.stroke();
      if (k % 2 === 0) { g.fillStyle = '#6a4220'; g.beginPath(); g.ellipse(x + bend, -h - 2, 1.4, 3.2, 0, 0, 7); g.fill(); } } }
  else if (type === 'tent') { shadow(36, 11); const dir = v ? -1 : 1;
    const hide = g.createLinearGradient(-34, 0, 34, 0); hide.addColorStop(0, '#8a6a44'); hide.addColorStop(0.55, '#6e5034'); hide.addColorStop(1, '#3e2a18');
    g.fillStyle = hide; g.strokeStyle = '#24160a'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(-34, 0); g.quadraticCurveTo(-26, -30, -2, -50); g.quadraticCurveTo(26, -28, 34, 0); g.quadraticCurveTo(0, 8, -34, 0); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(36,22,10,.6)'; g.lineWidth = 0.9; for (const k of [-0.6, -0.2, 0.25, 0.65]) { g.beginPath(); g.moveTo(k * 34, 3 - Math.abs(k) * 4); g.quadraticCurveTo(k * 20, -26, -2, -50); g.stroke(); }   // 가죽 이음새
    g.strokeStyle = '#d8c8a0'; g.lineWidth = 0.7; for (let k = 0; k < 9; k++) { const y = -8 - k * 4.5, w = 30 - k * 3.2; g.beginPath(); g.moveTo(-w * 0.18, y); g.lineTo(-w * 0.12, y - 1.6); g.stroke(); }   // 바느질
    g.fillStyle = '#1a1008'; g.beginPath(); g.moveTo(dir * 2, 2); g.quadraticCurveTo(dir * 6, -16, dir * 12, -22); g.quadraticCurveTo(dir * 18, -10, dir * 22, 2); g.closePath(); g.fill();   // 입구
    g.fillStyle = '#8a6a44'; g.beginPath(); g.moveTo(dir * 12, -22); g.quadraticCurveTo(dir * 20, -12, dir * 25, 1); g.lineTo(dir * 18, 1); g.closePath(); g.fill();
    g.strokeStyle = '#3a2410'; g.lineWidth = 2.2; for (const [x1, y1] of [[-8, -62], [-1, -66], [6, -61]]) { g.beginPath(); g.moveTo(-2, -48); g.lineTo(x1, y1); g.stroke(); }   // 장대 끝
    g.fillStyle = '#e8e0c8'; g.beginPath(); g.ellipse(-2, -40, 4, 3.2, 0, 0, 7); g.fill(); g.fillStyle = '#2a1a0a'; g.fillRect(-4, -41, 1.4, 1.4); g.fillRect(-1, -41, 1.4, 1.4);   // 걸어 둔 해골
    g.fillStyle = '#a02818'; g.beginPath(); g.moveTo(-20, -14); g.lineTo(-12, -16); g.lineTo(-14, -8); g.closePath(); g.fill(); }
  else if (type === 'totem') { shadow(12, 4); g.fillStyle = lg(-7, 7, '#7a5a38', '#3a2614'); g.strokeStyle = '#1e1208'; g.lineWidth = 1.1; g.beginPath(); g.rect(-6, -74, 12, 74); g.fill(); g.stroke();
    for (const [y, c] of [[-20, '#a83a24'], [-42, '#d8b048'], [-62, '#3a6a8a']]) { g.fillStyle = 'rgba(20,10,4,.55)'; g.fillRect(-6, y - 9, 12, 2); g.fillStyle = c; g.fillRect(-4.5, y - 4, 3, 2.2); g.fillRect(1.5, y - 4, 3, 2.2); g.fillStyle = '#1a0e06'; g.fillRect(-3, y + 1, 6, 2.4); g.fillStyle = '#f0e8d0'; g.fillRect(-2.5, y + 1, 1, 1.4); g.fillRect(1.5, y + 1, 1, 1.4); }   // 새긴 얼굴 3개
    g.strokeStyle = '#e8dcc0'; g.lineWidth = 3; g.beginPath(); g.moveTo(-5, -80); g.quadraticCurveTo(-16, -84, -15, -94); g.moveTo(5, -80); g.quadraticCurveTo(16, -84, 15, -94); g.stroke();   // 뿔
    g.fillStyle = '#f2ecd6'; g.strokeStyle = '#5a5040'; g.lineWidth = 0.9; g.beginPath(); g.ellipse(0, -79, 6.5, 6, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#20160c'; g.beginPath(); g.arc(-2.4, -80, 1.6, 0, 7); g.arc(2.4, -80, 1.6, 0, 7); g.fill();
    for (const [x, c] of [[-7, '#c83a2a'], [7, '#2a2a2a']]) { g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); g.moveTo(x, -50); g.quadraticCurveTo(x * 1.5, -44, x * 1.3, -36); g.stroke(); } }   // 깃털
  else if (type === 'bonfire') { g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(2, 1, 20, 7, 0, 0, 7); g.fill();
    for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283, x = Math.cos(a) * 15, y = Math.sin(a) * 6.5; g.fillStyle = k % 2 ? '#6a6660' : '#8a857c'; g.strokeStyle = '#2a2824'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(x, y - 2, 4.6, 3.4, 0, 0, 7); g.fill(); g.stroke(); }   // 돌 둘레
    g.fillStyle = '#1a120c'; g.beginPath(); g.ellipse(0, -1, 10, 4, 0, 0, 7); g.fill();
    for (const [x0, y0, x1, y1] of [[-9, 1, 7, -6], [-7, -6, 9, 1], [0, 3, 0, -8]]) { g.strokeStyle = '#2a180a'; g.lineWidth = 4.2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.strokeStyle = '#6a4424'; g.lineWidth = 2.6; g.stroke(); }
    g.fillStyle = '#ff7a2a'; g.beginPath(); g.ellipse(0, -2, 5, 2, 0, 0, 7); g.fill(); }
  else if (type === 'palisade') { shadow(26, 7); const dir = v ? -1 : 1;
    for (let k = 0; k < 5; k++) { const x = (k - 2) * 9 * dir, y = (k - 2) * -4.5, h = 40 + (k * 7) % 9, lean = dir * 3;
      g.fillStyle = lg(x - 4, x + 4, '#8a6a42', '#3e2a16'); g.strokeStyle = '#1e1208'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x - 4 + lean, y - h); g.lineTo(x + lean * 1.1, y - h - 9); g.lineTo(x + 4 + lean, y - h); g.lineTo(x + 4, y); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(30,18,8,.5)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x - 1, y - 4); g.lineTo(x - 1 + lean, y - h + 4); g.stroke(); }
    g.strokeStyle = '#3a2410'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-20 * dir, -14 + 9); g.lineTo(20 * dir, -14 - 9); g.moveTo(-20 * dir, -30 + 9); g.lineTo(20 * dir, -30 - 9); g.stroke(); }   // 묶은 가로대
  else if (type === 'banner') { shadow(10, 3); g.strokeStyle = '#2a1a0a'; g.lineWidth = 3.4; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -88); g.stroke(); g.strokeStyle = '#6a4a28'; g.lineWidth = 2; g.stroke();
    const t = 0.5; g.fillStyle = '#7a1a12'; g.strokeStyle = '#2a0806'; g.lineWidth = 1; g.beginPath(); g.moveTo(1, -84); g.lineTo(24, -82); g.lineTo(23, -60); g.lineTo(27, -54); g.lineTo(20, -50); g.lineTo(22, -44); g.lineTo(12, -48); g.lineTo(6, -42); g.lineTo(1, -46); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#1a0a06'; g.fillRect(1, -84, 23, 4); g.fillStyle = '#e8dcc0'; g.beginPath(); g.ellipse(12, -66, 5, 4.5, 0, 0, 7); g.fill(); g.fillStyle = '#7a1a12'; g.beginPath(); g.arc(10, -67, 1.2, 0, 7); g.arc(14, -67, 1.2, 0, 7); g.fill(); g.strokeStyle = '#e8dcc0'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(6, -58); g.lineTo(18, -54); g.moveTo(18, -58); g.lineTo(6, -54); g.stroke();
    g.fillStyle = '#e8e0c8'; g.beginPath(); g.moveTo(-3, -88); g.lineTo(0, -97); g.lineTo(3, -88); g.closePath(); g.fill(); }
  else if (type === 'rack') { shadow(22, 6); g.strokeStyle = '#2a1a0a'; g.lineWidth = 3; g.beginPath(); g.moveTo(-18, 0); g.lineTo(-12, -34); g.moveTo(18, 0); g.lineTo(12, -34); g.moveTo(-15, -26); g.lineTo(15, -26); g.stroke(); g.strokeStyle = '#7a5430'; g.lineWidth = 1.8; g.stroke();
    for (const [x, c] of [[-9, '#c8ccd2'], [-2, '#b0b4ba'], [5, '#c8ccd2'], [11, '#9aa0a8']]) { g.strokeStyle = '#4a3018'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(x - 3, 2); g.lineTo(x + 2, -40); g.stroke(); g.fillStyle = c; g.strokeStyle = '#2a2e34'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x + 2, -48); g.lineTo(x - 0.5, -40); g.lineTo(x + 4.5, -40); g.closePath(); g.fill(); g.stroke(); }
    g.fillStyle = '#9aa0a8'; g.strokeStyle = '#2a2e34'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(-16, -22); g.quadraticCurveTo(-24, -16, -18, -8); g.lineTo(-14, -16); g.closePath(); g.fill(); g.stroke(); }   // 도끼
  else if (type === 'bones') { g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(2, 1, 15, 5, 0, 0, 7); g.fill(); g.strokeStyle = '#e8e2cc'; g.lineWidth = 2.2;
    for (const [x0, y0, x1, y1] of [[-13, -1, 5, 3], [-11, 4, 9, -3], [-4, 5, 13, 1], [-14, 2, -2, -4]]) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.fillStyle = '#f0ead6'; g.beginPath(); g.arc(x0, y0, 1.6, 0, 7); g.arc(x1, y1, 1.6, 0, 7); g.fill(); }
    g.fillStyle = '#f2ecd8'; g.strokeStyle = '#6a604c'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(4, -6, 6, 5, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#3a3020'; g.beginPath(); g.arc(2, -6, 1.3, 0, 7); g.arc(6, -6, 1.3, 0, 7); g.fill(); g.fillRect(3.5, -3, 1, 1.5); }
  else if (type === 'stump') { if (v === 0) { shadow(14, 5); g.fillStyle = lg(-11, 11, '#6a4a2a', '#2e1e10'); g.strokeStyle = '#1a1008'; g.lineWidth = 1; g.beginPath(); g.moveTo(-11, 0); g.lineTo(-10, -12); g.lineTo(10, -12); g.lineTo(11, 0); g.quadraticCurveTo(0, 5, -11, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#b08a5a'; g.beginPath(); g.ellipse(0, -12, 10, 4.2, 0, 0, 7); g.fill(); g.stroke(); g.strokeStyle = 'rgba(90,60,30,.7)'; g.lineWidth = 0.7; for (const r of [2.5, 5, 7.5]) { g.beginPath(); g.ellipse(0, -12, r, r * 0.42, 0, 0, 7); g.stroke(); }
      g.fillStyle = 'rgba(80,120,40,.75)'; g.beginPath(); g.ellipse(-7, -3, 4, 2.4, 0.3, 0, 7); g.fill(); g.strokeStyle = '#2e1e10'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-10, -1); g.quadraticCurveTo(-16, 1, -18, 4); g.moveTo(9, -1); g.quadraticCurveTo(15, 2, 17, 4); g.stroke(); }
    else { shadow(20, 5); g.save(); g.rotate(-0.42); g.fillStyle = lg(0, 0, '#5a3e22', '#5a3e22'); const gr = g.createLinearGradient(0, -8, 0, 4); gr.addColorStop(0, '#7a5a34'); gr.addColorStop(1, '#2e1e10'); g.fillStyle = gr; g.strokeStyle = '#1a1008'; g.lineWidth = 1; g.beginPath(); g.rect(-18, -8, 34, 11); g.fill(); g.stroke();
      g.fillStyle = '#b08a5a'; g.beginPath(); g.ellipse(16, -2.5, 3.2, 5.5, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = 'rgba(80,120,40,.7)'; g.beginPath(); g.ellipse(-6, -8, 7, 2.2, 0, 0, 7); g.fill(); g.restore(); } }
  return (PROPC[key] = { c, w: W, h: H, ax, ay }); }
// 모닥불 불꽃 (매 프레임) — 야영지 가운데
function campFlame(g, x, y) { const fl = 1 + Math.sin(time * 17 + x) * 0.12 + Math.sin(time * 29 + y) * 0.07; g.save(); g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(x, y - 8, 0, x, y - 8, 64); gr.addColorStop(0, 'rgba(255,140,50,.32)'); gr.addColorStop(1, 'rgba(255,140,50,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y - 8, 64, 0, 7); g.fill();
  for (const [c, w, h] of [['rgba(255,90,20,.85)', 8, 18], ['rgba(255,180,60,.9)', 5, 12], ['rgba(255,245,200,.9)', 2.4, 6]]) { g.fillStyle = c; g.beginPath(); g.ellipse(x, y - 4 - h * fl * 0.55, w, h * fl * 0.6, 0, 0, 7); g.fill(); }
  g.restore(); if (Math.random() < 0.25) parts.push({ x: x + (Math.random() - 0.5) * 8, y: y - 12, vx: (Math.random() - 0.5) * 10, vy: -30 - Math.random() * 25, life: 1, max: 1, ember: true }); }
// 오크숲 소품 렌더 그림 (assets/orcforest/<이름>.webp) — OSPR[이름] = { ax, ay, s }(그림 안 기준점·배율), OSET = 소품 종류 → 변형 그림들. 그래픽팀 납품 전엔 비어 있어 위 코드 그림으로 그림
const OSPR = {"tent_cone":{"ax":117,"ay":216,"s":0.5},"tent_dome":{"ax":112,"ay":147,"s":0.5},"totem":{"ax":48,"ay":242,"s":0.5},"bonfire":{"ax":55,"ay":56,"s":0.5},"palisade_a":{"ax":74,"ay":190,"s":0.5},"palisade_b":{"ax":74,"ay":198,"s":0.5},"spikes_a":{"ax":92,"ay":134,"s":0.5},"spikes_b":{"ax":87,"ay":143,"s":0.5},"banner":{"ax":50,"ay":258,"s":0.5},"rack":{"ax":76,"ay":194,"s":0.5},"bones":{"ax":47,"ay":49,"s":0.5},"stump_a":{"ax":58,"ay":37,"s":0.5},"stump_b":{"ax":50,"ay":38,"s":0.5},"log_a":{"ax":42,"ay":55,"s":0.5},"tree_a":{"ax":230,"ay":515,"s":0.33},"tree_b":{"ax":146,"ay":594,"s":0.33},"tree_c":{"ax":159,"ay":633,"s":0.33},"tree_d":{"ax":104,"ay":519,"s":0.33},"sapling":{"ax":74,"ay":150,"s":0.5},"fern_a":{"ax":50,"ay":45,"s":0.5},"fern_b":{"ax":38,"ay":39,"s":0.5},"rock_a":{"ax":30,"ay":58,"s":0.5},"rock_b":{"ax":72,"ay":67,"s":0.5},"rock_c":{"ax":46,"ay":47,"s":0.5}};
const OSET = {"tent0":["tent_cone"],"tent1":["tent_dome"],"totem0":["totem"],"bonfire0":["bonfire"],"palisade0":["palisade_a","spikes_a"],"palisade1":["palisade_b","spikes_b"],"banner0":["banner"],"rack0":["rack"],"bones0":["bones"],"stump0":["stump_a","stump_b"],"stump1":["log_a"],"tree0":["tree_a","tree_b","tree_c","tree_d"],"sapling0":["sapling"],"fern0":["fern_a","fern_b"],"mossrock0":["rock_a","rock_b","rock_c"],"tree1":["tree_a","tree_b","tree_c","tree_d"],"tree2":["tree_a","tree_b","tree_c","tree_d"],"rock0":["rock_a","rock_b","rock_c"],"rock1":["rock_a","rock_b","rock_c"],"rock2":["rock_a","rock_b","rock_c"]};
const OIMG = {};
function oImg(k) { if (!OSPR[k]) return null; let m = OIMG[k]; if (!m) { m = OIMG[k] = new Image(); m.src = 'assets/orcforest/' + k + '.webp'; } return m.complete && m.naturalWidth ? m : null; }
function orcSprite(p) { if (!ISLE || !(ISLE.def.forest || ISLE.def.snow)) return null; const set = OSET[p.type + p.v]; if (!set) return null; const k = set[(p.i * 7 + p.j * 13) % set.length], m = oImg(k); return m ? { m: ISLE.def.snow && p.type !== 'bonfire' ? snowImg(m) : m, a: OSPR[k] } : null; }
// ===== 사막 소품 렌더 그림 (assets/desert/*.webp): 우물·상점·몬스터와 같은 카메라·조명·마감(80px/m) → 0.5배로 그림. 불러오기 전엔 위 코드 그림(propCanvas)·물들인 덤불
// DSPR[이름] = 그림 안 기준점(소품 바닥 중심, 원본 픽셀). DSET = 소품 종류 → 변형 그림들(칸 위치로 하나 고름)
const DSPR = {"saguaro_a":[41,252],"saguaro_b":[52,223],"barrel_a":[30,56],"barrel_b":[24,45],"pear_a":[58,85],"pear_b":[17,84],"deadtree_a":[78,218],"deadtree_b":[86,257],"skull":[17,42],"tumble_a":[19,42],"brush_a":[38,71],"brush_b":[44,69],"brush_c":[35,78]};
const DSET = { cactus0: ['saguaro_a', 'saguaro_b'], cactus1: ['barrel_a', 'barrel_b'], cactus2: ['pear_a', 'pear_b'], deadtree0: ['deadtree_a', 'deadtree_b'], skull0: ['skull'], bush0: ['brush_a', 'brush_b'], bush1: ['brush_b', 'brush_c'], bush2: ['brush_c', 'brush_a'] };
const DIMG = {};
function dImg(k) { if (!DSPR[k]) return null; let m = DIMG[k]; if (!m) { m = DIMG[k] = new Image(); m.src = 'assets/desert/' + k + '.webp'; } return m.complete && m.naturalWidth ? m : null; }
function desertSprite(p) { if (!ISLE || !ISLE.def.sand) return null; const set = DSET[p.type + p.v]; if (!set) return null; const k = set[(p.i * 7 + p.j * 13) % set.length], m = dImg(k); return m ? { m, a: DSPR[k] } : null; }
// ===== 버그베어밭(살육터) 소품: assets/bugbear/*.webp (PC 렌더 80px/m, 시체·꼬챙이·교수대 우리·정육 걸이·해골 더미·꽂힌 무기·고목·바위) + 오크숲 천막·모닥불·무기 걸이·뼈, 사막 해골을 어둡게 물들여 재사용
// GSPR[이름] = { f: 그림 경로, ax, ay: 그림 안 기준점(원본 픽셀), s: 배율, t: 물들임 } · GSET = 소품 종류 → 변형 그림들 (칸 위치로 하나 고름)
const GSPR = {"corpse0":{"f":"bugbear/corpse0","ax":100,"ay":62,"s":0.5},"corpse1":{"f":"bugbear/corpse1","ax":131,"ay":59,"s":0.5},"corpse2":{"f":"bugbear/corpse2","ax":76,"ay":64,"s":0.5},"stakes0":{"f":"bugbear/stakes0","ax":60,"ay":176,"s":0.5},"stakes1":{"f":"bugbear/stakes1","ax":25,"ay":155,"s":0.5},"gibbet":{"f":"bugbear/gibbet","ax":55,"ay":234,"s":0.5},"meatrack":{"f":"bugbear/meatrack","ax":132,"ay":156,"s":0.5},"skullpile":{"f":"bugbear/skullpile","ax":98,"ay":75,"s":0.5},"weapons0":{"f":"bugbear/weapons0","ax":40,"ay":84,"s":0.5},"weapons1":{"f":"bugbear/weapons1","ax":39,"ay":195,"s":0.5},"dtree0":{"f":"bugbear/dtree0","ax":168,"ay":483,"s":0.36},"dtree1":{"f":"bugbear/dtree1","ax":412,"ay":515,"s":0.31},"dtree3":{"f":"bugbear/dtree3","ax":434,"ay":506,"s":0.33},"rock0":{"f":"bugbear/rock0","ax":53,"ay":71,"s":0.5},"rock1":{"f":"bugbear/rock1","ax":46,"ay":40,"s":0.5},"rock2":{"f":"bugbear/rock2","ax":80,"ay":72,"s":0.5},"stump0":{"f":"bugbear/stump0","ax":56,"ay":36,"s":0.5},"stump1":{"f":"bugbear/stump1","ax":48,"ay":36,"s":0.5},"log0":{"f":"bugbear/log0","ax":39,"ay":52,"s":0.5},"root0":{"f":"bugbear/root0","ax":45,"ay":67,"s":0.5},"branch0":{"f":"bugbear/branch0","ax":39,"ay":34,"s":0.5},"tent_cone":{"f":"orcforest/tent_cone","ax":117,"ay":216,"s":0.5,"t":"saturate(.55) brightness(.62) contrast(1.1) sepia(.25)"},"tent_dome":{"f":"orcforest/tent_dome","ax":112,"ay":147,"s":0.5,"t":"saturate(.55) brightness(.62) contrast(1.1) sepia(.25)"},"bonfire":{"f":"orcforest/bonfire","ax":55,"ay":56,"s":0.5,"t":"saturate(.55) brightness(.62) contrast(1.1) sepia(.25)"},"rack":{"f":"orcforest/rack","ax":76,"ay":194,"s":0.5,"t":"saturate(.55) brightness(.62) contrast(1.1) sepia(.25)"},"bones":{"f":"orcforest/bones","ax":47,"ay":49,"s":0.5,"t":"saturate(.6) brightness(.8)"},"skull":{"f":"desert/skull","ax":17,"ay":42,"s":0.5,"t":"saturate(.5) brightness(.72) sepia(.2)"}};
const GSET = {"deadtree0":["dtree0","dtree3"],"deadtree1":["dtree1","dtree0"],"deadtree2":["dtree3","dtree1"],"rock0":["rock2","rock0"],"rock1":["rock1","rock2"],"rock2":["rock2","rock0","rock1"],"stump0":["stump0","stump1"],"stump1":["log0"],"root0":["root0"],"branch0":["branch0"],"corpse0":["corpse0"],"corpse1":["corpse1"],"corpse2":["corpse2"],"bones0":["bones"],"skull0":["skull"],"weapons0":["weapons0"],"weapons1":["weapons1"],"stakes0":["stakes0"],"stakes1":["stakes1"],"gibbet0":["gibbet"],"meatrack0":["meatrack"],"skullpile0":["skullpile"],"tent0":["tent_cone"],"tent1":["tent_dome"],"bonfire0":["bonfire"],"rack0":["rack"]};
const GIMG = {}, GCV = {};
function goreSprite(p) { if (!ISLE || !(ISLE.def.gore || ISLE.def.maze)) return null; const set = GSET[p.type + p.v]; if (!set) return null; const k = set[(p.i * 7 + p.j * 13) % set.length]; if (GCV[k]) return GCV[k]; const a = GSPR[k]; let m = GIMG[k];
  if (!m) { m = GIMG[k] = new Image(); m.src = 'assets/' + a.f + '.webp'; } if (!m.complete || !m.naturalWidth) return null;
  const w = Math.max(1, Math.round(m.naturalWidth * a.s)), hh = Math.max(1, Math.round(m.naturalHeight * a.s)), c = document.createElement('canvas'); c.width = w; c.height = hh; const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; if (a.t) g.filter = a.t; g.drawImage(m, 0, 0, w, hh);
  return (GCV[k] = { c, ax: Math.round(a.ax * a.s), ay: Math.round(a.ay * a.s) }); }
// 살육터 화면 연출: 핏빛으로 가라앉은 어둠 · 낮게 깔려 흐르는 안개 · 시체 위를 맴도는 파리 · 짙은 테두리 그늘
const GFOG = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  for (let k = 0; k < 18; k++) { const x = 60 + Math.random() * 390, y = 60 + Math.random() * 140, r = 40 + Math.random() * 70; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(150,130,125,.16)'); gr.addColorStop(1, 'rgba(150,130,125,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  return c; })();
function goreFx(g, vw, vh, ox, oy) { if (!ISLE || !ISLE.def.gore) return; g.save();
  g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(150,104,96,.42)'; g.fillRect(0, 0, vw, vh);
  g.globalCompositeOperation = 'source-over'; for (let q = 0; q < 4; q++) { const sp = 9 + q * 4, W = GFOG.width * (2.2 + q * 0.4), Hh = GFOG.height * (1.6 + q * 0.3), x = ((q * 331 + time * sp - cam[0] * 0.15) % (vw + W)) - W * 0.6, y = (q * 0.27 * vh + Math.sin(time * 0.2 + q) * 30 - cam[1] * 0.08) % vh;
    g.globalAlpha = 0.28 + 0.14 * Math.sin(time * 0.3 + q * 1.7); g.drawImage(GFOG, x, y - Hh * 0.3, W, Hh); g.drawImage(GFOG, x - vw - W * 0.4, y + vh * 0.35, W, Hh); }
  g.globalAlpha = 1; g.fillStyle = '#0a0806';
  for (const p of PROPS) { if (p.type !== 'corpse' && p.type !== 'meatrack') continue; const [x, y] = W2P(p.i + 0.5, p.j + 0.5), X = x + ox, Y = y + oy; if (X < -40 || Y < -60 || X > vw + 40 || Y > vh + 40) continue;
    for (let q = 0; q < 6; q++) { const t = time * (2.6 + q * 0.37) + q * 2.1 + p.i, fx = X + Math.cos(t) * (10 + q * 2) + Math.sin(t * 2.3) * 3, fy = Y - 10 - (p.type === 'meatrack' ? 34 : 0) + Math.sin(t * 1.3) * 6 + Math.cos(t * 3.1) * 2; g.fillRect(Math.round(fx), Math.round(fy), 1.6, 1.6); } }
  const vg = g.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.28, vw / 2, vh / 2, Math.max(vw, vh) * 0.72); vg.addColorStop(0, 'rgba(20,0,0,0)'); vg.addColorStop(1, 'rgba(24,2,2,.55)'); g.fillStyle = vg; g.fillRect(0, 0, vw, vh);
  g.restore(); }
// 오아시스 물: 잔물결·반짝임 (매 프레임)
function drawWater(g) { for (const o of ISLE.oases) { const [x, y] = W2P(o.x, o.z), rx = o.r * K * 1.42, ry = rx / 2; g.save();
    const gr = g.createRadialGradient(x, y - ry * 0.2, 2, x, y, rx); gr.addColorStop(0, '#5ab4c8'); gr.addColorStop(0.65, '#2a7a98'); gr.addColorStop(1, '#174e66'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(30,50,40,.6)'; g.lineWidth = 2; g.stroke(); g.clip();
    for (let q = 0; q < 3; q++) { const k = (((time * 0.35 + q / 3) % 1) + 1) % 1; g.strokeStyle = `rgba(220,245,255,${0.35 * (1 - k)})`; g.lineWidth = 1; g.beginPath(); g.ellipse(x + Math.sin(q * 2) * rx * 0.2, y + Math.cos(q) * ry * 0.2, rx * 0.15 + k * rx * 0.6, (ry * 0.15 + k * ry * 0.6), 0, 0, 7); g.stroke(); }
    g.globalCompositeOperation = 'lighter'; for (let q = 0; q < 10; q++) { const a = q * 2.4 + time * 0.3, rr = (q % 4 + 1) / 5, sx = x + Math.cos(a) * rx * rr, sy = y + Math.sin(a) * ry * rr, al = 0.25 + 0.25 * Math.sin(time * 3 + q * 1.7); g.strokeStyle = `rgba(255,255,240,${Math.max(0, al)})`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(sx - 4, sy); g.lineTo(sx + 4, sy); g.stroke(); }
    g.restore(); } }
// 굴러다니는 회전초 (바람 따라)
const TUMBLE = []; let tumbleT = 0, tumbleLast = 0;
function drawTumble(g, vw, vh) { if (!ISLE || !ISLE.def.sand) { TUMBLE.length = 0; return; } const dt = Math.min(0.05, time - tumbleLast); tumbleLast = time; tumbleT -= dt;
  if (tumbleT <= 0 && TUMBLE.length < 3) { tumbleT = 5 + Math.random() * 8; TUMBLE.push({ x: cam[0] - vw / 2 - 20, y: cam[1] + (Math.random() - 0.5) * vh * 0.7, vx: 34 + Math.random() * 26, rot: 0, ph: Math.random() * 6 }); }
  for (let n = TUMBLE.length - 1; n >= 0; n--) { const t = TUMBLE[n]; t.x += t.vx * dt; t.rot += t.vx * dt / 9; t.ph += dt * 5; if (t.x > cam[0] + vw / 2 + 30) { TUMBLE.splice(n, 1); continue; } const hop = Math.abs(Math.sin(t.ph)) * 6;
    const tm = dImg(t.k || (t.k = Math.random() < 0.5 ? 'tumble_a' : 'tumble_b')) || dImg('tumble_a') || dImg('tumble_b');
    if (tm) { const w = tm.naturalWidth * 0.5, h = tm.naturalHeight * 0.5, r = Math.max(w, h) / 2; t.rot += t.vx * dt / r - t.vx * dt / 9;   // 렌더 그림: 공 크기에 맞춰 굴림
      g.save(); g.fillStyle = 'rgba(0,0,0,.24)'; g.beginPath(); g.ellipse(t.x + 2, t.y + 1, r * 0.95, r * 0.36, 0, 0, 7); g.fill(); g.translate(t.x, t.y - r - hop); g.rotate(t.rot); g.imageSmoothingEnabled = true; g.drawImage(tm, -w / 2, -h / 2, w, h); g.restore(); continue; }
    g.save(); g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(t.x, t.y + 1, 8, 3, 0, 0, 7); g.fill(); g.translate(t.x, t.y - 8 - hop); g.rotate(t.rot); g.strokeStyle = '#8a6a40'; g.lineWidth = 1;
    for (let q = 0; q < 9; q++) { const a = q * 0.7; g.beginPath(); g.ellipse(0, 0, 8, 4 + (q % 3), a, 0, 7); g.stroke(); } g.restore(); } }
// 사막 하늘빛: 낮엔 따뜻한 빛 + 아지랑이(아른거리는 띠), 밤엔 차가운 푸른빛
function desertFx(g, vw, vh) { if (!ISLE || !ISLE.def.sand) return; const dk = DN.dark(); g.save();
  if (dk < 0.6) { const a = 1 - dk / 0.6; g.globalCompositeOperation = 'soft-light'; g.fillStyle = `rgba(255,190,110,${0.35 * a})`; g.fillRect(0, 0, vw, vh); g.globalCompositeOperation = 'lighter';
    for (let q = 0; q < 6; q++) { const yy = ((q * 97 + time * 14) % (vh + 60)) - 30, w = vw * (0.5 + 0.4 * Math.sin(q * 1.7 + time * 0.3)), xx = (vw - w) / 2 + Math.sin(time * 0.8 + q) * 30; const gr = g.createLinearGradient(0, yy - 6, 0, yy + 6); gr.addColorStop(0, 'rgba(255,230,180,0)'); gr.addColorStop(0.5, `rgba(255,230,180,${0.05 * a})`); gr.addColorStop(1, 'rgba(255,230,180,0)'); g.fillStyle = gr; g.fillRect(xx, yy - 6, w, 12); } }
  { g.globalCompositeOperation = 'source-over'; g.strokeStyle = 'rgba(235,205,150,.35)'; g.lineWidth = 1; for (let q = 0; q < 16; q++) { const sp = 120 + (q * 37) % 90, x = ((q * 211 + time * sp) % (vw + 200)) - 100, y = (q * 97 + Math.sin(time * 0.7 + q) * 20) % vh; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 18 + (q % 3) * 8, y + 2); g.stroke(); } }   // 모래바람
  if (dk > 0.05) { g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgba(110,140,210,${Math.min(1, dk) * 0.55})`; g.fillRect(0, 0, vw, vh); }
  g.restore(); }
function drawWorld(g, vw, vh){
  const ox=Math.round(vw/2-cam[0]+(shake?(Math.random()-0.5)*4:0)), oy=Math.round(vh/2-cam[1]);
  const SNOWBG=!!(ISLE&&ISLE.def&&ISLE.def.snow), FP=MAZE()||SNOWBG?null:forestPat(g); if (MAZE()){ g.fillStyle='#030203'; g.fillRect(0,0,vw,vh); } else if (SNOWBG){ const bg=g.createLinearGradient(0,0,0,vh); bg.addColorStop(0,'#aebccc'); bg.addColorStop(1,'#d4dde6'); g.fillStyle=bg; g.fillRect(0,0,vw,vh); } else if (FP){ g.save(); g.translate(ox,oy); g.fillStyle=FP; g.fillRect(-ox,-oy,vw,vh); g.restore(); } else { g.fillStyle='#141a10'; g.fillRect(0,0,vw,vh); }
  g.save(); g.translate(ox,oy);
  if (SCENE==='town') { if (TOWN.ground) g.drawImage(TOWN.ground,0,0); } else if (ISLE) { if (ISLE.ground){ g.save(); g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high'; g.drawImage(ISLE.ground,0,0,G.W,G.H); g.restore(); } } else if (im.ground.complete){ g.save(); g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high'; g.drawImage(im.ground,0,0,G.W,G.H); g.restore(); }
  const tile=(i,j)=>{ const a=W2P(i,j),b=W2P(i+1,j),c=W2P(i+1,j+1),d=W2P(i,j+1); g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.lineTo(...c); g.lineTo(...d); g.closePath(); };
  if (ISLE && ISLE.oases && ISLE.oases.length && !ISLE.def.snow) drawWater(g);
  if (mouse && !hover){ const [x,z]=P2Wh(...toWorldPx(...mouse)); const i=Math.floor(x), j=Math.floor(z); if (walkable(i,j)){ tile(i,j); g.strokeStyle='rgba(235,225,185,.35)'; g.lineWidth=1; g.stroke(); } }
  if (mark){ tile(...mark.t); g.strokeStyle=`rgba(201,162,74,${mark.life*2})`; g.lineWidth=1.5; g.stroke(); }
  const T=hero.target; if (T&&!T.dead){ const [x,y]=W2P(T.x,T.z); g.strokeStyle='rgba(200,60,50,.85)'; g.lineWidth=1.2; g.beginPath(); g.ellipse(x,y,18,9,0,0,7); g.stroke(); }
  if (SCENE!=='town') { drawWebZones(g); drawAoes(g); } GROUND.draw(g); mxDraw(g, true);   // 바닥 아이템은 마을에서도 보임 (갓 모드 소환 테스트)
  const list=[];
  if (SCENE==='town') TOWN.addDraw(list, g, vw, vh);
  if (ISLE) ISLAND.addDraw(list, g);
  PET.draw(list, g); NET.addDraw(list, g);
  for (const p of PROPS){ const [x,y]=W2P(p.i+0.5,p.j+0.5); if (x<cam[0]-vw/2-170||x>cam[0]+vw/2+120||y<cam[1]-vh/2-20||y>cam[1]+vh/2+260) continue;   // 왼쪽은 넉넉히: 렌더 그림의 그림자가 오른쪽으로 길게 뻗음
    list.push({d:p.i+p.j+(p.deco?0.2:1), f:()=>{ if (p.type==='dwall'){ dgDrawWall(g,p,x,y); return; } const fade = (p.type==='tree'||p.type==='palm'||p.type==='spire'||p.type==='deadtree'||p.type==='tent'||p.type==='totem'||p.type==='banner'||p.type==='sapling'||p.type==='gibbet'||p.type==='meatrack'||p.type==='stakes'||(p.type==='cactus'&&p.v===0)) && p.i+p.j > hero.i+hero.j && Math.abs(p.i-hero.i)<=3 && Math.abs(p.j-hero.j)<=3; const s=META.sprites[p.type+p.v];
      { const dsp = desertSprite(p); if (dsp){ g.save(); g.globalAlpha=fade?0.4:1; g.drawImage(prescaled(dsp.m, 0.5), Math.round(x-dsp.a[0]*0.5), Math.round(y-dsp.a[1]*0.5)); g.restore(); return; } }   // 사막 렌더 그림
      { const gs=goreSprite(p); if (gs){ g.save(); g.globalAlpha=fade?0.4:1; g.drawImage(gs.c, Math.round(x-gs.ax), Math.round(y-gs.ay)); g.restore(); if (p.type==='bonfire') campFlame(g,x,y); return; } if (ISLE && ISLE.def.gore) return; }   // 버그베어밭 렌더 그림 (불러오는 동안은 비워 둠)
      { const rs=orcSprite(p); if (rs){ const sc=rs.a.s||0.5; g.save(); g.globalAlpha=fade?0.4:1; { const ps=prescaled(rs.m, sc); if (ps) g.drawImage(ps, Math.round(x-rs.a.ax*sc), Math.round(y-rs.a.ay*sc)); else g.drawImage(rs.m, Math.round(x-rs.a.ax*sc), Math.round(y-rs.a.ay*sc), rs.m.naturalWidth*sc, rs.m.naturalHeight*sc); } g.restore(); if (p.type==='bonfire') campFlame(g,x,y); return; } }
      if (!s || !im[p.type+p.v]){ const pc=propCanvas(p.type, p.v); if (pc){ g.save(); g.globalAlpha=fade?0.4:1; g.drawImage(pc.c, Math.round(x-pc.ax), Math.round(y-pc.ay), pc.w, pc.h); g.restore(); } if (p.type==='bonfire') campFlame(g,x,y); return; }   // 사막 소품(코드 그림) — im['cactus0'] 등 정식 그림이 들어오면 위의 스프라이트 경로로
      if (im[p.type+p.v].complete){ const pim = ISLE && ISLE.def.sand ? sandProp(p.type+p.v, p.type) : ISLE && ISLE.def.snow ? snowImg(im[p.type+p.v]) : im[p.type+p.v]; g.save(); g.globalAlpha=fade?0.4:1; const sc=s.s||1, ps=prescaled(pim, sc); if (ps) g.drawImage(ps, Math.round(x-s.ax*sc), Math.round(y-s.ay*sc)); else { if (sc<1){ g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high'; } g.drawImage(pim, Math.round(x-s.ax*sc), Math.round(y-s.ay*sc), s.W*sc, s.H*sc); } g.restore(); } }}); }
  for (const f of foxes){ if (f.dead&&f.deadT>1.4) continue; if (!DN.seen(f.i,f.j)) continue; list.push({d:f.x+f.z, f:()=>{ const S=MOB[f.kind], [x,y]=W2P(f.x,f.z), moving=f.t<1;
    const sheetAtk = S.art==='sheet' && !f.dead && f.atkT!=null; mobPose(f, sheetAtk?0.5:1);
    const al=f.dead?Math.max(0,1-f.deadT/1.4):1, fl=f.flash>0?'brightness(2.6) saturate(0)':MP.red?'sepia(.55) saturate(2.4) hue-rotate(-38deg) brightness(1.08)':null;
    g.save(); g.translate(Math.round(x+MP.lx), Math.round(y+MP.ly)); if (MP.rot) g.rotate(MP.rot); if (MP.sx!==1||MP.sy!==1) g.scale(MP.sx,MP.sy);
    const SI=MIMG[f.kind], ART=S.art==='sheet'&&!(SI&&SI.idle.naturalWidth&&SI.walk.naturalWidth&&SI.attack.naturalWidth)?S.art0:S.art;   // 렌더 그림이 아직(또는 못) 불러와졌으면 원래 그림
    if (ART==='spider'){ g.globalAlpha=al; drawSpider(g,0,0,f); g.restore(); return; }
    if (ART==='ant'){ g.globalAlpha=al; drawAnt(g,0,0,f); g.restore(); return; }
    if (ART==='scorpion'){ g.globalAlpha=al; drawScorpion(g,0,0,f); g.restore(); return; }
    if (ART==='sheet'){ const M=MSHEET[f.kind], I=MIMG[f.kind]; let a='idle', fr=Math.floor(time*6+f.hi)%8;
      if (sheetAtk){ a='attack'; const af=M.af||16; fr=Math.min(af-1,Math.floor(f.atkT/ATK_T*af)); } else if (moving&&!f.dead){ a='walk'; fr=Math.floor(f.dist*4)%8; } else if (f.dead) fr=0;
      if (I[a].complete && I[a].naturalWidth){ if (M.tint && !fl){ const c=tintFrame(f.kind, a, I[a], M, fr, f.row), sc=M.s||1; g.globalAlpha=al; g.drawImage(c, Math.round(-M.ax*sc), Math.round(-M.ay*sc)); } else drawSheet(g, I[a], M, fr, f.row, 0, 0, al, fl || M.tint || null); } g.restore(); return; }
    if (ART==='fox'){ const anim = f.dead ? 'Survey' : moving ? (f.aggro?'Run':'Walk') : 'Survey';
      const fr = f.dead ? 0 : moving ? Math.floor(f.dist*(f.aggro?3:4))%8 : Math.floor(time*6+f.hi)%8;
      const img = S.tint ? tinted(f.kind,anim) : im['fox_'+anim]; if (img) drawSheet(g, img, S.sc!==1?{...FX,s:S.sc}:FX, fr, f.row, 0, 0, al, fl); g.restore(); return; }
    const anim=moving&&!f.dead?'walk':'idle', fr=f.dead?0:moving?Math.floor(f.dist*4)%8:Math.floor(time*6+f.hi)%8;
    const img=tinted(f.kind,anim); if (img) drawSheet(g, img, {W:144,H:160,ax:72,ay:128,s:0.86*S.sc}, fr, f.row, 0, 0, al, fl); g.restore(); }}); }
  list.push({d:hero.x+hero.z, f:()=>{ const [x,y]=W2P(hero.x,hero.z); const NF=a=>KN.anims[a].frames; let anim='idle', fr=Math.floor(time*6)%NF('idle');
    if (hero.atk){ anim=hero.atk.v||'attack'; const nf=KN.anims[anim]?NF(anim):8; fr=Math.min(nf-1,Math.floor(hero.atk.t/hero.atk.dur*nf)); if (!KN.anims[anim]&&CLASS==='knight') anim='attack'; } else if (hero.t<1){ anim='walk'; fr=Math.floor(hero.dist*4)%8; } else if (SCENE==='town' && KN.anims.look && CLASS==='knight'){ anim='look'; fr=Math.floor(time*2.5)%NF('look'); }
    const hf=hurt>0?'sepia(1) saturate(4) hue-rotate(-40deg)':null; const iv=BUFF.invis>0; if (iv){ g.save(); g.globalAlpha=0.42+0.1*Math.sin(time*5); }   // 투명: 반투명하게 아른거림
    if (!drawHeroSprite(g, anim, fr, hero.row, x, y, hf)) { const ki=im['knight_'+anim]||im.knight_idle; if (ki) drawSheet(g, ki, KN, fr, hero.row, x, y, 1, hf); } if (iv) g.restore(); }});
  // fire
  if (SCENE==='field' && !ISLE) { const [x,y]=W2P(META.fire[0]+0.5,META.fire[1]+0.5); list.push({d:META.fire[0]+META.fire[1]+1, f:()=>{ const fl=1+Math.sin(time*17)*0.12+Math.sin(time*29)*0.07;
    g.save(); g.globalCompositeOperation='lighter';
    const gr=g.createRadialGradient(x,y-6,0,x,y-6,70); gr.addColorStop(0,'rgba(255,140,50,.35)'); gr.addColorStop(1,'rgba(255,140,50,0)'); g.fillStyle=gr; g.beginPath(); g.arc(x,y-6,70,0,7); g.fill();
    for (const [c,w,h] of [['rgba(255,90,20,.85)',7,16],['rgba(255,180,60,.9)',4.5,11],['rgba(255,245,200,.9)',2.2,5]]){ g.fillStyle=c; g.beginPath(); g.ellipse(x,y-h*fl*0.55,w,h*fl*0.6,0,0,7); g.fill(); }
    g.restore(); if (Math.random()<0.3) parts.push({x:x+(Math.random()-0.5)*8,y:y-10,vx:(Math.random()-0.5)*10,vy:-30-Math.random()*25,life:1,max:1,ember:true}); }}); }
  list.sort((a,b)=>a.d-b.d); for (const o of list) o.f();
  drawTumble(g, vw, vh);
  GROUND.drawPillars(g);
  drawWebShots(g); drawSkillFx(g); drawSpellFx(g);
  drawArrows(g); drawImpacts(g);
  for (const p of parts) if (p.dust){ const k=p.life/p.max; g.fillStyle=`rgba(150,128,96,${0.55*k})`; g.beginPath(); g.arc(p.x,p.y,1.4+(1-k)*2.2,0,7); g.fill(); }
  g.globalCompositeOperation='lighter';
  for (const p of parts){ if (p.dust) continue; const k=p.life/p.max; if (p.ember){ g.fillStyle=`rgba(255,${120+k*100},40,${k})`; g.fillRect(p.x,p.y,1.5,1.5); } else { g.strokeStyle=p.crit?`rgba(255,200,90,${k})`:`rgba(255,240,200,${k})`; g.lineWidth=1.2; g.beginPath(); g.moveTo(p.x,p.y); g.lineTo(p.x-p.vx*0.03,p.y-p.vy*0.03); g.stroke(); } }
  g.globalCompositeOperation='source-over';
  for (const b of bursts){ const k=b.t/0.35, r=8+k*34; g.save(); g.globalCompositeOperation='lighter'; g.globalAlpha=1-k;
    const gr=g.createRadialGradient(b.x,b.y,0,b.x,b.y,r); gr.addColorStop(0,'rgba(255,240,180,.9)'); gr.addColorStop(0.5,'rgba(255,170,60,.45)'); gr.addColorStop(1,'rgba(255,120,30,0)');
    g.fillStyle=gr; g.beginPath(); g.arc(b.x,b.y,r,0,7); g.fill(); g.strokeStyle='rgba(255,230,150,.9)'; g.lineWidth=2*(1-k)+0.5; g.beginPath(); g.ellipse(b.x,b.y,r*1.2,r*0.6,0,0,7); g.stroke();
    for (let q=0;q<8;q++){ const a=q*Math.PI/4+0.3, r1=r*0.6, r2=r*1.35; g.beginPath(); g.moveTo(b.x+Math.cos(a)*r1,b.y+Math.sin(a)*r1*0.7); g.lineTo(b.x+Math.cos(a)*r2,b.y+Math.sin(a)*r2*0.7); g.stroke(); }
    g.restore(); }

  g.restore();
  AMB.update(Math.min(0.05, 1/60), vw, vh); AMB.draw(g, vw, vh, ox, oy);
  desertFx(g, vw, vh); goreFx(g, vw, vh, ox, oy); DN.draw(g, vw, vh, ox, oy); snowFx(g, vw, vh); g.save(); g.translate(ox, oy); drawMxTop(g);
  // 이름·피바·피해 숫자·말풍선은 어둠·눈보라 위에 (던전 그림자에 묻히지 않게)
  for (const f of floats){ const k=f.t/f.life, pop=f.big?(k<0.15?1+(0.15-k)*4:1):1, a=k<0.7?1:1-(k-0.7)/0.3, y=f.y-f.rise*Math.min(1,k*1.6);
    g.save(); g.globalAlpha=Math.max(0,a); g.font=`900 ${Math.round(f.size*pop)}px "Noto Sans KR",sans-serif`; g.textAlign='center'; g.lineJoin='round';
    g.lineWidth=3; g.strokeStyle='rgba(0,0,0,.85)'; g.strokeText(f.text,f.x+f.dx,y); g.fillStyle=f.color; g.fillText(f.text,f.x+f.dx,y); g.restore(); }
  PET.drawLabels(g);
  if (hero.chat && time < hero.chat.until) CHAT.bubble(g, hero);
  { const [hx,hy]=W2P(hero.x,hero.z); g.fillStyle='#000'; g.fillRect(Math.round(hx)-14,Math.round(hy)-90,28,4); g.fillStyle='#c8302a'; g.fillRect(Math.round(hx)-13,Math.round(hy)-89,Math.round(26*hero.hp/hero.max),2); }
  const tg0 = hover&&!hover.dead ? hover : (T&&!T.dead?T:null), tg = tg0&&DN.seen(tg0.i,tg0.j)?tg0:null;
  if (tg){ const S=MOB[tg.kind], [x,y]=W2P(tg.x,tg.z), hh=(S.hh||Math.round(62*S.sc))+4, nm=S.name+(S.boss?' (보스)':''), bw=S.boss?60:30;
    g.font='700 10px "Noto Sans KR",sans-serif'; g.textAlign='center'; g.fillStyle='rgba(0,0,0,.8)'; g.fillText(nm,x+1,y-hh+1); g.fillStyle=S.boss?'#ff7060':tg.aggro?'#f08a7a':'#f2eedf'; g.fillText(nm,x,y-hh);
    g.fillStyle='rgba(0,0,0,.6)'; g.fillRect(x-bw/2,y-hh+4,bw,3); g.fillStyle='#b8352b'; g.fillRect(x-bw/2,y-hh+4,bw*Math.max(0,tg.hp)/tg.max,3); drawMobStatus(g, tg, x, y-hh-20); }
  g.restore(); mxDrawFlash(g, vw, vh); AMB.drawFlies(g, ox, oy);
  const vg=g.createRadialGradient(vw/2,vh/2,Math.min(vw,vh)*0.35,vw/2,vh/2,Math.max(vw,vh)*0.75); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.45)'); g.fillStyle=vg; g.fillRect(0,0,vw,vh);
  drawBigFx(g, vw, vh, ox, oy);
}
// ---------- classic bottom UI (original design) ----------
const HOTRECT=[], AUTORECT=[], HUNTRECT=[], STATRECT=[], ZONERECT=[]; const ICONIMG={};
function iconImg(k, bl){ const key=k+(bl?'|b':''); if (ICONIMG[key]) return ICONIMG[key]; const i=new Image(); i.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(ICON(k, bl).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="68" height="68" ')); return ICONIMG[key]=i; }
const PH = 104; const log = [];
let logScroll=0; const CHATRECT=[0,0,0,0];
function say(t, c='#e8e2cc', ch=0){ log.push({t,c,ch}); if (log.length>20){ const nc=log.reduce((a,m)=>a+(m.ch?1:0),0); const k=nc>12?log.findIndex(m=>m.ch):log.findIndex(m=>!m.ch); log.splice(k<0?0:k,1); } if (logScroll>0) logScroll++; }
// 지역 이름 (공지·접속자 목록용)
function zoneTitle(z){ if (z==null) z = SCENE==='town' ? 'town' : ISLE ? 'isle'+ISLE.id : 'field'; if (z==='town') return '마을'; const m=/^isle(\d+)$/.exec(z); if (m){ const d=ISLAND.def(+m[1]); return d&&d.name||'사냥터'; } return '필드'; }
// 관찰 기록기: PC 실행 파일에서만 동작 — 30초마다 상태 한 줄 + 일이 생길 때 한 줄(사망·보스·드랍·강화·연금술·구입·오류·끼임)을 logs/play-날짜.jsonl 에, 10분마다 게임 창 캡처
const TELE = (() => { const N = () => (window.native && native.logAppend) ? native : null;
  let buf = [], kills = {}, uses = {}, taken = {}, xp = 0, fr = 0, fSum = 0, fN = 0, fMin = 999, lastPos = '', still = 0, zk0 = '', started = false; const errs = new Map();
  const day = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `play-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.jsonl`; };
  const zkey = () => SCENE === 'town' ? 'town' : ISLE ? 'isle' + ISLE.id : 'field';
  function ev(k, o) { if (!N()) return; try { buf.push(JSON.stringify(Object.assign({ t: Date.now(), k }, o || {}))); } catch (e) {} if (buf.length > 600) buf.splice(0, buf.length - 600); }
  function flush() { const n = N(); if (!n || !buf.length) return; const tx = buf.join('\n') + '\n'; buf = []; try { const r = n.logAppend(day(), tx); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
  function snap() { if (!N() || !window.__gameOn) return; if (!started) { started = true; ev('start', { v: GAME_VER, cls: CLASS, lv: hero.lv, nm: PNAME() }); }
    const pos = Math.round(hero.x) + ',' + Math.round(hero.z), au = !!(typeof AUTO !== 'undefined' && AUTO.on && AUTO.on()), nk = Object.values(kills).reduce((a, b) => a + b, 0);
    if (au && SCENE !== 'town' && pos === lastPos && !nk) { still++; if (still === 2) ev('stuck', { z: zkey(), pos, st: String((AUTO.status && AUTO.status()) || '').slice(0, 40) }); } else still = 0; lastPos = pos;
    let bf = []; try { bf = Object.keys(BUFF).filter(k => BUFF[k] > 0); } catch (e) {}
    ev('snap', { v: GAME_VER, cls: CLASS, lv: hero.lv, ex: +(hero.exp / Math.max(1, needExp(hero.lv))).toFixed(4), z: zkey(), g: coins, hp: Math.ceil(hero.hp), hm: hero.max, mp: Math.floor(hero.mp), mm: hero.maxmp,
      au: au ? 1 : 0, w: +(INV.wPct ? INV.wPct() : 0).toFixed(2), xp: Math.round(xp), kl: kills, us: uses, dt: taken, fps: fN ? Math.round(fSum / fN) : 0, fmin: fMin === 999 ? 0 : fMin, pl: NET.count(), pt: NET.inParty() ? 1 : 0, bf, ac: INV.ac ? INV.ac() : 0 });
    kills = {}; uses = {}; taken = {}; xp = 0; fSum = 0; fN = 0; fMin = 999; flush(); }
  { let t0 = performance.now(); const loop = () => { fr++; const t = performance.now(); if (t - t0 >= 1000) { const f = Math.round(fr * 1000 / (t - t0)); if (document.visibilityState === 'visible') { fSum += f; fN++; fMin = Math.min(fMin, f); } fr = 0; t0 = t;
      if (window.__gameOn && N()) { const z = zkey(); if (z !== zk0) { if (zk0) ev('zone', { z }); zk0 = z; } } } requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  const err = (msg, st) => { const k = String(msg || '').slice(0, 200), c = (errs.get(k) || 0) + 1; errs.set(k, c); if (c <= 3) ev('err', { m: k, s: String(st || '').slice(0, 800), c }); };
  window.addEventListener('error', e => err(e.message, e.error && e.error.stack || (e.filename + ':' + e.lineno)));
  window.addEventListener('unhandledrejection', e => { const r = e.reason; err('promise: ' + (r && r.message || r), r && r.stack); });
  setInterval(snap, 30000); setInterval(flush, 10000);
  setInterval(() => { const n = N(); if (n && n.logShot && window.__gameOn && document.visibilityState === 'visible') { try { const r = n.logShot(); if (r && r.then) r.then(nm => { if (nm) ev('shot', { f: nm }); }).catch(() => {}); } catch (e) {} } }, 600000);
  window.addEventListener('beforeunload', () => { try { snap(); } catch (e) {} });
  return { ev, flush, on: () => !!N(), kill: k => { kills[k] = (kills[k] || 0) + 1; }, use: id => { uses[id] = (uses[id] || 0) + 1; }, hurt: (k, d) => { taken[k] = (taken[k] || 0) + Math.round(d); }, xp: n => { xp += n; }, shot: () => { const n = N(); return n && n.logShot ? n.logShot() : Promise.resolve(false); } }; })();
// 전체 공지: 게임 화면 위쪽 가운데에 큰 글씨로 6초간 (보스 등장·토벌, 영웅 아이템 획득, 고강화 성공) — 채팅창에도 남김
const PNAME = () => hero.pname || (() => { try { return localStorage.getItem('aden_pname'); } catch (e) { return null; } })() || '용사';
function announce(t, c = '#ffd86a', kind = '') {
  say('[공지] ' + t, c);
  let box = document.getElementById('announce');
  if (!box) { box = document.createElement('div'); box.id = 'announce'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
    Object.assign(box.style, { position: 'fixed', left: '50%', top: 'calc(64px + env(safe-area-inset-top,0px))', transform: 'translateX(-50%)', zIndex: 35, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', pointerEvents: 'none', width: 'min(760px,calc(100vw - 32px))' });
    document.body.appendChild(box); }
  const el = document.createElement('div'); el.textContent = t;
  Object.assign(el.style, { font: '800 20px "Nanum Myeongjo",serif', color: c, letterSpacing: '.03em', textAlign: 'center', padding: '7px 34px 8px', textShadow: '0 2px 0 #000,0 0 10px ' + c + '88',
    background: 'linear-gradient(90deg,transparent,rgba(10,6,2,.82) 18%,rgba(10,6,2,.82) 82%,transparent)', borderTop: '1px solid ' + c + '66', borderBottom: '1px solid ' + c + '66',
    opacity: 0, transform: 'translateY(-8px) scale(.96)', transition: 'opacity .35s, transform .35s' });
  box.appendChild(el); while (box.children.length > 3) box.firstChild.remove();
  requestAnimationFrame(() => { el.style.opacity = 1; el.style.transform = 'none'; });
  setTimeout(() => { el.style.opacity = 0; el.style.transform = 'translateY(-6px)'; setTimeout(() => el.remove(), 400); }, 6000);
  if (AC && SFX_ON) { const t0 = AC.currentTime; tone(t0, 'triangle', kind === 'boss' ? 330 : 660, kind === 'boss' ? 220 : 990, 0.35, 0.07); tone(t0 + 0.18, 'triangle', kind === 'boss' ? 247 : 880, kind === 'boss' ? 165 : 1320, 0.45, 0.06); }
}
hero.lv = 1; hero.exp = 0; hero.baseHP = 16; hero.baseMP = 2; hero.hp = hero.max = 16; hero.mp = hero.maxmp = 2; hero.bonusPts = 0; let coins = 100, potions = 20, potCd = 0;
// 단축키: 브라우저·윈도우 기본 기능(F5 새로고침 등)을 막고 게임 기능으로만 씀
function usePotion(){ INV.usePotion(); }
addEventListener('keydown', ev=>{ const k=ev.key;
  if (/^F([1-9]|1[0-2])$/.test(k) || ((ev.ctrlKey||ev.metaKey) && /^[rRwWsSpPfFgGhHjJdDuUoOnNtT+\-=0]$/.test(k)) || k==='Tab' || k==='Backspace' && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName||'')) { ev.preventDefault(); }
  const fm=/^F([5-9]|1[0-2])$/.exec(k); if (fm && !ev.repeat) INV.useHot(+fm[1]-5); }, {capture:true});
addEventListener('help', ev=>ev.preventDefault());
const needExp = lv => Math.floor(15*Math.pow(lv,1.7)*(lv<10?1:lv<20?1+(lv-9)*0.35:4.5+(lv-19)*0.6));   // v100: Lv10까지는 그대로, 그 뒤로 점점 무겁게 (Lv15 약 55마리 · Lv20 110 · Lv25 210 · Lv30 330마리)
function gainExp(n){ TELE.xp(n); hero.exp += n; while (hero.exp >= needExp(hero.lv)){ hero.exp -= needExp(hero.lv); hero.lv++; { const C=CLS_DEF[CLASS]; hero.baseHP += rint(C.hpLv); hero.baseMP += rint(C.mpLv); } INV.render(); hero.hp = hero.max; hero.mp = hero.maxmp; say('레벨이 올랐습니다. (레벨 '+hero.lv+')', '#f2e6a8'); levelUpFx();
    if (hero.lv % 5 === 0){ hero.bonusPts++; say('보너스 능력치 1개를 받았습니다. 캐릭터 정보창에서 찍어 주세요.', '#f2d98a'); const cw=document.getElementById('charwin'); if (cw && cw.hidden){ cw.hidden=false; INV.render(); } } } }
const LEATHER = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#1e1813'; g.fillRect(0, 0, 128, 128);
  for (let k = 0; k < 2600; k++) { const x = Math.random() * 128, y = Math.random() * 128, a = Math.random() * 0.06; g.fillStyle = Math.random() < 0.5 ? `rgba(255,220,170,${a})` : `rgba(0,0,0,${a * 1.6})`; g.fillRect(x, y, 1 + Math.random() * 2, 1); }
  for (let k = 0; k < 14; k++) { g.strokeStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.08})`; g.lineWidth = 0.6; g.beginPath(); let x = Math.random() * 128, y = Math.random() * 128; g.moveTo(x, y); for (let q = 0; q < 4; q++) { x += (Math.random() - 0.5) * 30; y += (Math.random() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); }
  return c; })();
let LEATHER_P = null;
function ornate(g,x,y,w,h,inner){   // 금장 이중 테두리 + 모서리 장식 + 가죽 바탕
  if (!LEATHER_P) LEATHER_P = g.createPattern(LEATHER, 'repeat');
  g.save(); g.fillStyle = LEATHER_P; g.fillRect(x,y,w,h); if (inner){ g.fillStyle = inner; g.fillRect(x+3,y+3,w-6,h-6); }
  const gr = g.createLinearGradient(x,y,x,y+h); gr.addColorStop(0,'#e8c878'); gr.addColorStop(0.5,'#8a6a34'); gr.addColorStop(1,'#c9a24a');
  g.strokeStyle = '#0c0a08'; g.lineWidth = 3; g.strokeRect(x+0.5,y+0.5,w-1,h-1);
  g.strokeStyle = gr; g.lineWidth = 1; g.strokeRect(x+1.5,y+1.5,w-3,h-3); g.globalAlpha = 0.55; g.strokeRect(x+3.5,y+3.5,w-7,h-7); g.globalAlpha = 1;
  const corner = (cx,cy,sx,sy) => { g.save(); g.translate(cx,cy); g.scale(sx,sy); g.fillStyle = gr; g.beginPath(); g.moveTo(0,0); g.lineTo(10,0); g.quadraticCurveTo(4,1,3,3); g.quadraticCurveTo(1,4,0,10); g.closePath(); g.fill();
    g.fillStyle = '#f2d98a'; g.beginPath(); g.arc(4,4,1.6,0,7); g.fill(); g.strokeStyle = '#6a4e20'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(11,1.5); g.quadraticCurveTo(16,1.5,18,4); g.moveTo(1.5,11); g.quadraticCurveTo(1.5,16,4,18); g.stroke(); g.restore(); };
  corner(x+1,y+1,1,1); corner(x+w-1,y+1,-1,1); corner(x+1,y+h-1,1,-1); corner(x+w-1,y+h-1,-1,-1);
  const mid = x + w/2; g.fillStyle = gr; g.beginPath(); g.moveTo(mid-7,y+1); g.lineTo(mid,y+5); g.lineTo(mid+7,y+1); g.closePath(); g.fill();   // 위쪽 가운데 장식
  g.restore(); }
function bevel(g,x,y,w,h,fill){ g.fillStyle=fill; g.fillRect(x,y,w,h); g.fillStyle='rgba(255,240,210,.18)'; g.fillRect(x,y,w,1); g.fillRect(x,y,1,h); g.fillStyle='rgba(0,0,0,.55)'; g.fillRect(x,y+h-1,w,1); g.fillRect(x+w-1,y,1,h); }
function bar(g,x,y,w,h,k,c1,c2,label){ g.fillStyle='#0c0a08'; g.fillRect(x-1,y-1,w+2,h+2); g.fillStyle='#2a1f1a'; g.fillRect(x,y,w,h);
  const gr=g.createLinearGradient(0,y,0,y+h); gr.addColorStop(0,c1); gr.addColorStop(0.5,c2); gr.addColorStop(1,c1); g.fillStyle=gr; g.fillRect(x,y,Math.round(w*Math.max(0,Math.min(1,k))),h);
  g.fillStyle='rgba(255,255,255,.18)'; g.fillRect(x,y,w,1);
  g.font='700 9px "Noto Sans KR",sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillStyle='#000'; g.fillText(label,x+w/2+1,y+h/2+1); g.fillStyle='#f4eedc'; g.fillText(label,x+w/2,y+h/2); }
// ============================================================ 미니맵 (왼쪽 아래 지역 이름 위): 지형은 한 번 그려 두고 점만 매 프레임
const PARTY = [];   // 파티원 {x, z, name} — 파티 기능이 생기면 여기에 넣으면 미니맵에 초록 점으로 표시 (다른 유저는 표시 안 함)
const MM = (() => { let on = true, op = 0.85, key = '', img = null, rect = [0, 0, 0, 0], N = 0; const S = 3, RANGE = 12;
  try { const a = localStorage.getItem('mm_on'), b = localStorage.getItem('mm_op'); if (a != null) on = a === '1'; if (b != null) op = Math.max(0.2, Math.min(1, +b || 0.85)); } catch (e) {}
  const save = () => { try { localStorage.setItem('mm_on', on ? '1' : '0'); localStorage.setItem('mm_op', String(op)); } catch (e) {} };
  const zkey = () => SCENE + ':' + (ISLE ? ISLE.id : '') + ':' + MAP;
  const P = (i, j) => [(i - j + N) * S, (i + j) * S / 2];
  function build() { N = MAP; const c = document.createElement('canvas'); c.width = 2 * N * S; c.height = N * S + 2; const g = c.getContext('2d');
    const town = SCENE === 'town', hm = ISLE && ISLE.hmap, w = N + 1, propAt = new Map(); for (const q of PROPS || []) propAt.set(q.j * 1000 + q.i, q.type);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const [x, y] = P(i, j), bl = !walkable(i, j), pt = propAt.get(j * 1000 + i);
      let col; if (ISLE && ISLE.def.maze) col = bl ? '#15110f' : '#5a524a'; else if (!bl) { const h = hm ? hm[j * w + i] : 0; const L = Math.min(1, h / 2.6); col = town ? '#7a7466' : ISLE && ISLE.def.snow ? `rgb(${Math.round(196 + 40 * L)},${Math.round(212 + 30 * L)},${Math.round(228 + 20 * L)})` : ISLE && ISLE.def.gore ? `rgb(${Math.round(72 + 40 * L)},${Math.round(58 + 30 * L)},${Math.round(50 + 24 * L)})` : ISLE && ISLE.def.sand ? `rgb(${Math.round(176 + 40 * L)},${Math.round(146 + 34 * L)},${Math.round(96 + 26 * L)})` : `rgb(${Math.round(78 + 50 * L)},${Math.round(92 + 40 * L)},${Math.round(48 + 26 * L)})`; }
      else if (!(ISLE && ISLE.def.maze)) col = ISLE && ISLE.water && ISLE.water.has(j * 1000 + i) ? (ISLE.def.snow ? '#8ac8e8' : '#3a8ab0') : ISLE && ISLE.def.snow ? (pt === 'tree' ? '#2a4a3a' : pt === 'bonfire' ? '#ff8a3a' : pt === 'tent' || pt === 'banner' || pt === 'palisade' || pt === 'rack' ? '#4a5a8a' : '#7a8698') : ISLE && ISLE.def.gore ? (pt === 'bonfire' ? '#ff8a3a' : pt === 'deadtree' ? '#3a332c' : pt === 'rock' ? '#6a6460' : pt ? '#5a3a30' : '#2a2018') : pt === 'tree' || pt === 'palm' || pt === 'sapling' ? '#1f3a1a' : pt === 'cactus' ? '#4a7a32' : pt === 'rock' || pt === 'spire' ? '#77736a' : pt === 'bush' || pt === 'deadtree' ? '#2f4c24' : pt === 'bonfire' ? '#ff8a3a' : pt === 'tent' || pt === 'totem' || pt === 'palisade' || pt === 'banner' || pt === 'rack' || pt === 'stump' ? '#6a4a2a' : town ? '#5a4232' : ISLE && ISLE.def.sand ? '#8a6040' : ISLE && ISLE.def.forest ? '#26341a' : '#3c2e22';
      g.fillStyle = col; g.beginPath(); g.moveTo(x, y); g.lineTo(x + S, y + S / 2); g.lineTo(x, y + S); g.lineTo(x - S, y + S / 2); g.closePath(); g.fill(); }
    img = c; key = zkey(); fog = null; fogKey = ''; }
  // 던전 안개: 내가 본 칸만 밝힘 (지역마다 기억 · 같은 접속 동안)
  let fog = null, fogKey = '';
  function fogUpdate() { if (!(ISLE && ISLE.def.maze)) return null; const z = ISLE; if (!z.explored) z.explored = new Uint8Array(N * N);
    if (!fog) { fog = document.createElement('canvas'); fog.width = img.width; fog.height = img.height; const f = fog.getContext('2d'); f.fillStyle = '#080605'; f.fillRect(0, 0, fog.width, fog.height); f.globalCompositeOperation = 'destination-out'; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (z.explored[j * N + i]) dia(f, i, j); }
    const k2 = hero.i + ',' + hero.j; if (k2 !== fogKey) { fogKey = k2; const f = fog.getContext('2d'); f.globalCompositeOperation = 'destination-out'; for (let j = hero.j - 8; j <= hero.j + 8; j++) for (let i = hero.i - 8; i <= hero.i + 8; i++) { if (i < 0 || j < 0 || i >= N || j >= N || z.explored[j * N + i]) continue; if (DN.seen(i, j) || (Math.abs(i - hero.i) <= 1 && Math.abs(j - hero.j) <= 1)) { z.explored[j * N + i] = 1; dia(f, i, j); for (const [a, b] of DIRS8) { const x = i + a, y = j + b; if (x >= 0 && y >= 0 && x < N && y < N && !walkable(x, y) && !z.explored[y * N + x]) { z.explored[y * N + x] = 1; dia(f, x, y); } } } } }
    return fog; }
  const dia = (f, i, j) => { const [x, y] = P(i, j); f.beginPath(); f.moveTo(x, y - 0.5); f.lineTo(x + S + 0.5, y + S / 2); f.lineTo(x, y + S + 0.5); f.lineTo(x - S - 0.5, y + S / 2); f.closePath(); f.fill(); };
  function draw(g, vw, y0) { if (!on || (SCENE !== 'town' && !ISLE)) { rect = [0, 0, 0, 0]; return; } if (zkey() !== key) build();
    const W_ = 132, H_ = Math.round(W_ * img.height / img.width), x0 = 6, yy = y0 - 26 - H_, k = W_ / img.width; rect = [x0, yy, W_, H_];
    g.save(); g.globalAlpha = op; g.fillStyle = 'rgba(10,8,5,.55)'; g.beginPath(); g.moveTo(x0 + W_ / 2, yy - 4); g.lineTo(x0 + W_ + 6, yy + H_ / 2); g.lineTo(x0 + W_ / 2, yy + H_ + 4); g.lineTo(x0 - 6, yy + H_ / 2); g.closePath(); g.fill();
    g.strokeStyle = '#a8884a'; g.lineWidth = 1; g.stroke(); g.imageSmoothingEnabled = true; g.drawImage(img, x0, yy, W_, H_); { const fg = fogUpdate(); if (fg) { const ga = g.globalAlpha; g.globalAlpha = 1; g.drawImage(fg, x0, yy, W_, H_); g.globalAlpha = ga; } }
    const dot = (i, j, r, c, ring) => { const [px, py] = P(i, j); const X = x0 + px * k, Y = yy + (py + S / 2) * k; g.fillStyle = c; g.beginPath(); g.arc(X, Y, r, 0, 7); g.fill(); if (ring) { g.strokeStyle = ring; g.lineWidth = 0.8; g.stroke(); } return [X, Y]; };
    if (SCENE === 'town') for (const m of TOWN.mapMarks()) m.portal ? dot(m.i + 0.5, m.j + 0.5, 2.6, '#9fc8ff', '#e8f2ff') : dot(m.i + 0.5, m.j + 0.5, 1.6, m.c);
    else for (const q of ISLE.portals) { if (ISLE.def.maze && !(ISLE.explored && ISLE.explored[q.j * N + q.i])) continue; dot(q.i + 0.5, q.j + 0.5, 2.6, q.stairs ? '#ffb070' : '#9fc8ff', '#fff2e0'); }
    for (const f of foxes) { if (f.dead || cheb(f.i, f.j, hero.i, hero.j) > RANGE || (ISLE && ISLE.def.maze && !DN.seen(f.i, f.j))) continue; const b = MOB[f.kind].boss; dot(f.x, f.z, b ? 2.8 + Math.sin(time * 6) * 0.6 : 1.4, b ? '#ff3020' : '#ff5a4a', b ? '#ffd0c0' : null); }
    for (const m of PARTY) dot(m.x, m.z, 2.4, '#6cf08a', '#eaffef');
    for (const pt of PETS_HERE) dot(pt.x, pt.z, 1.7, pt.dead ? '#6a7a8a' : '#5ab8ff', '#e0f4ff');
    { const [X, Y] = dot(hero.x, hero.z, 0.01, '#000'); const d = DIRV[hero.row], a = Math.atan2((d[0] + d[1]) * 0.5, d[0] - d[1]); g.translate(X, Y); g.rotate(a); g.fillStyle = '#fff2a0'; g.strokeStyle = '#3a2a00'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(4.5, 0); g.lineTo(-3, -3); g.lineTo(-1.5, 0); g.lineTo(-3, 3); g.closePath(); g.fill(); g.stroke(); }
    g.restore(); }
  function click(lx, ly) { const [x0, yy, W_, H_] = rect; if (!W_ || lx < x0 - 6 || lx > x0 + W_ + 6 || ly < yy - 4 || ly > yy + H_ + 4) return false;
    const k = W_ / img.width, px = (lx - x0) / k, py = (ly - yy) / k - S / 2, a = px / S - N, b = 2 * py / S, i = Math.floor((a + b) / 2), j = Math.floor((b - a) / 2);
    if (i >= 0 && j >= 0 && i < N && j < N && walkable(i, j) && !(ISLE && ISLE.def.maze && !(ISLE.explored && ISLE.explored[j * N + i]))) { hero.target = null; moveGoal = [i, j]; holding = false; mark = { t: [i, j], life: 0.6 }; } return true; }
  return { draw, click, on: () => on, op: () => op, setOn(v) { on = !!v; save(); }, setOp(v) { op = Math.max(0.2, Math.min(1, v)); save(); }, rebuild() { key = ''; } };
})();
function drawUI(g, vw, vh){
  const y0 = vh-PH, F='"Noto Sans KR",sans-serif';
  const L = Math.min(170, Math.floor(vw*0.2)), SLOT = 30, R = Math.min(SLOT*4+20, Math.floor(vw*0.26));
  // 바탕 프레임
  if (!LEATHER_P) LEATHER_P=g.createPattern(LEATHER,'repeat'); g.fillStyle=LEATHER_P; g.fillRect(0,y0,vw,PH); const fg=g.createLinearGradient(0,y0,0,vh); fg.addColorStop(0,'rgba(80,60,36,.55)'); fg.addColorStop(0.15,'rgba(20,16,12,.3)'); fg.addColorStop(1,'rgba(0,0,0,.55)'); g.fillStyle=fg; g.fillRect(0,y0,vw,PH);
  g.fillStyle='#8a7348'; g.fillRect(0,y0,vw,1); g.fillStyle='#1a1410'; g.fillRect(0,y0+1,vw,1);
  // 경험치 바 (프레임 맨 위, 전체 폭)
  const ek=hero.exp/needExp(hero.lv);
  g.fillStyle='#0c0a08'; g.fillRect(0,y0+2,vw,8); g.fillStyle='#2a1d10'; g.fillRect(1,y0+3,vw-2,6);
  const eg=g.createLinearGradient(0,y0+3,0,y0+9); eg.addColorStop(0,'#f0b850'); eg.addColorStop(1,'#a8641c'); g.fillStyle=eg; g.fillRect(1,y0+3,(vw-2)*ek,6);
  for (let k=1;k<10;k++){ g.fillStyle='rgba(0,0,0,.5)'; g.fillRect(Math.round(vw*k/10),y0+3,1,6); }
  g.font='700 8px '+F; g.textAlign='center'; g.textBaseline='middle'; g.fillStyle='#000'; g.fillText('EXP '+(ek*100).toFixed(2)+'%',vw/2+1,y0+7); g.fillStyle='#fff3d0'; g.fillText('EXP '+(ek*100).toFixed(2)+'%',vw/2,y0+6);
  const top=y0+13, hgt=PH-17;
  // ── 왼쪽: 캐릭터 정보
  ornate(g,3,top,L-6,hgt);
  g.textBaseline='alphabetic'; g.textAlign='left';
  g.font='800 15px '+F; g.fillStyle='#e8c87a'; g.fillText('Lv.'+hero.lv,10,top+20);
  { const nm=PNAME(); g.font='800 12px '+F; g.textAlign='right'; g.fillStyle='#f2e2b4'; g.fillText(nm.length>10?nm.slice(0,10)+'…':nm,L-10,top+19); g.textAlign='left'; }   // 아이디 (캐릭터 만들 때 정함)
  g.font='500 11px '+F;
  // 자동사냥 버튼 · 설정 · 상태 · 골드
  { HUNTRECT.length=0; const on=AUTO.on(), bw2=L-16, tw=Math.round(bw2*0.62), yb=top+27;
    bevel(g,8,yb,tw,16,on?'#4a3a16':'#26201b'); g.strokeStyle=on?'#f2d98a':'#5a4a34'; g.lineWidth=1; g.strokeRect(8.5,yb+0.5,tw-1,15);
    g.textAlign='center'; { const t='자동사냥 '+(on?'켜짐':'꺼짐'); let fs=10; g.font='800 '+fs+'px '+F; while (fs>6.5&&g.measureText(t).width>tw-6){ fs-=0.5; g.font='800 '+fs+'px '+F; } g.fillStyle=on?'#f2d98a':'#cfc6ae'; g.fillText(t,8+tw/2,yb+12); } HUNTRECT.push([8,yb,tw,16,'toggle']);
    bevel(g,10+tw,yb,bw2-tw-2,16,'#26201b'); g.strokeStyle='#5a4a34'; g.strokeRect(10.5+tw,yb+0.5,bw2-tw-3,15); g.fillStyle='#cfc6ae'; g.font='700 10px '+F; g.fillText('설정',10+tw+(bw2-tw-2)/2,yb+12); HUNTRECT.push([10+tw,yb,bw2-tw-2,16,'set']);
    g.textAlign='left'; g.font='600 9px '+F; g.fillStyle=on?'#e8d8a8':'#7a7262'; g.fillText(AUTO.status(),10,top+56);
    const yy=top+74; bevel(g,8,yy-12,L-16,15,'#26201b'); g.textAlign='left'; g.font='500 11px '+F; g.fillStyle='#a89e86'; g.fillText('골드',13,yy); g.textAlign='right'; g.fillStyle='#e8d080'; g.fillText(coins.toLocaleString(),L-13,yy); }
  // ── 가운데: HP/MP (크게) + 대화창
  const cx0=L+2, cw=vw-L-R-4, bw=Math.min(280, Math.floor(cw*0.42)), chX=cx0+bw+6, chW=cw-bw-6;
  ornate(g,cx0,top,bw,hgt);
  const big=(y,lab,k,cur,max,c1,c2)=>{ g.textAlign='left'; g.font='800 11px '+F; g.fillStyle=c2; g.fillText(lab,cx0+8,y+13);
    const bx=cx0+32, w=bw-40; g.fillStyle='#0c0a08'; g.fillRect(bx-1,y-1,w+2,20); g.fillStyle='#2a1f1a'; g.fillRect(bx,y,w,18);
    const gr=g.createLinearGradient(0,y,0,y+18); gr.addColorStop(0,c1); gr.addColorStop(0.45,c2); gr.addColorStop(1,c1); g.fillStyle=gr; g.fillRect(bx,y,Math.round(w*Math.max(0,Math.min(1,k))),18);
    g.fillStyle='rgba(255,255,255,.22)'; g.fillRect(bx,y,w,1);
    g.font='800 12px '+F; g.textAlign='center'; g.textBaseline='middle'; const t=Math.ceil(cur)+' / '+max;
    g.fillStyle='#000'; g.fillText(t,bx+w/2+1,y+10); g.fillStyle='#fff8e8'; g.fillText(t,bx+w/2,y+9); g.textBaseline='alphabetic'; };
  const hpLow = hero.hp/hero.max < 0.3 && Math.floor(time*4)%2===0;
  big(top+5,'HP',hero.hp/hero.max,hero.hp,hero.max, hpLow?'#a02018':'#6a1410', hpLow?'#ff6050':'#d8402e');
  big(top+29,'MP',hero.mp/hero.maxmp,hero.mp,hero.maxmp,'#16206a','#4a68e0');
  // 안 쓴 능력치 포인트가 있으면 HP 바 위에 반짝이는 알림 (클릭: 캐릭터 창)
  STATRECT.length=0; if (hero.bonusPts>0){ const h=19, by=top-h-6, t=`능력치 포인트 +${hero.bonusPts}`; g.font='800 10px '+F; const w=Math.ceil(g.measureText(t).width)+30, bx=cx0+bw-w-2, p=0.5+0.5*Math.sin(time*4);
    g.save(); g.shadowColor=`rgba(255,210,90,${0.45+0.4*p})`; g.shadowBlur=6+8*p; g.fillStyle='rgba(28,18,6,.93)'; g.fillRect(bx,by,w,h); g.restore();
    g.strokeStyle=`rgba(240,200,100,${0.7+0.3*p})`; g.lineWidth=1.2; g.strokeRect(bx+0.5,by+0.5,w-1,h-1);
    g.fillStyle='#e8b830'; g.beginPath(); g.arc(bx+10,by+h/2,6.5,0,7); g.fill(); g.fillStyle='#2a1a06'; g.fillRect(bx+6.4,by+h/2-1.2,7.2,2.4); g.fillRect(bx+8.8,by+h/2-3.6,2.4,7.2);
    g.textAlign='left'; g.textBaseline='middle'; g.fillStyle='#000'; g.fillText(t,bx+21,by+h/2+1.5); g.fillStyle='#ffe9a8'; g.fillText(t,bx+20,by+h/2+0.5); g.textBaseline='alphabetic'; STATRECT.push([bx,by,w,h]); }
  // 자동 물약 칸 (HP/MP 바 밑) — 클릭: 설정창 · 인벤토리 물약을 끌어다 놓기
  { const ay=top+51, half=Math.floor((bw-12)/2); AUTORECT.length=0; g.textAlign='left';
    ['hp','mp'].forEach((k,n)=>{ const A=INV.auto(k), x=cx0+6+n*(half+2), y=ay, w=half-2, h=Math.max(30,hgt-54);
      AUTORECT.push([x,y,w,h,k]); bevel(g,x,y,w,h,A.on?'#262017':'#17140f'); g.strokeStyle=A.on?(k==='hp'?'#b84a3a':'#4a68c0'):'#3a3226'; g.lineWidth=1; g.strokeRect(x+0.5,y+0.5,w-1,h-1);
      let sz=Math.min(h-8,20); if (w-sz-12<56) sz=Math.max(0,w-12-56); if (sz<12) sz=0; g.save(); g.beginPath(); g.rect(x+1,y+1,w-2,h-2); g.clip(); if (A.id&&sz){ const im2=iconImg(ITEMS[A.id].icon); if (im2.complete&&im2.naturalWidth){ g.save(); g.globalAlpha=A.on?1:0.4; g.imageSmoothingEnabled=true; g.drawImage(im2,x+3,y+(h-sz)/2,sz,sz); g.restore(); } }
      g.textBaseline='middle'; const fs=w-sz-12<62?8:9; g.font=`800 ${fs+1}px `+F; g.fillStyle=A.on?(k==='hp'?'#ff8a70':'#8aa8ff'):'#6a6252';
      g.fillText(`${k.toUpperCase()} ${A.pct}%↓`,x+sz+6,y+h/2-6); g.font=`600 ${fs}px `+F; g.fillStyle=A.on?'#d8cfb6':'#6a6252';
      { const t2=A.on?(A.id?`${INV.count(A.id)}개 · 켜짐`:'물약 없음'):'꺼짐', mw=w-sz-9; let f2=fs; while (f2>6&&g.measureText(t2).width>mw){ f2-=0.5; g.font=`600 ${f2}px `+F; } g.fillText(t2,x+sz+6,y+h/2+7); } g.restore(); g.textBaseline='alphabetic'; }); }
  // 대화창
  ornate(g,chX,top,chW,hgt,'rgba(8,8,10,.82)');
  g.font='500 11px '+F; g.textAlign='left';
  g.save(); g.beginPath(); g.rect(chX+2,top+2,chW-4,hgt-4); g.clip();
  // 긴 메시지는 두 줄로, 최근 20개 기록, 휠로 위아래
  CHATRECT[0]=chX; CHATRECT[1]=top; CHATRECT[2]=chW; CHATRECT[3]=hgt;
  const maxW=chW-18, rows=[];
  for (const m of log){ let a=m.t, b='';
    if (g.measureText(a).width>maxW){ let k=a.length; while (k>1&&g.measureText(a.slice(0,k)).width>maxW) k--; const sp=a.lastIndexOf(' ',k); if (sp>k*0.6) k=sp; b=a.slice(k).trim(); a=a.slice(0,k);
      if (g.measureText(b).width>maxW){ let q=b.length; while (q>1&&g.measureText(b.slice(0,q)+'…').width>maxW) q--; b=b.slice(0,q)+'…'; } }
    rows.push({t:a,c:m.c}); if (b) rows.push({t:'  '+b,c:m.c}); }
  const vis=Math.floor((hgt-6-22)/14.5), maxS=Math.max(0,rows.length-vis); logScroll=Math.max(0,Math.min(logScroll,maxS));   // 맨 아래 한 줄은 채팅 입력칸 · 스크롤은 기록 범위 안에서만
  rows.slice(Math.max(0,rows.length-vis-logScroll), rows.length-logScroll).forEach((m,i)=>{ const yy=top+15+i*14.5; g.fillStyle='#000'; g.fillText(m.t,chX+8,yy+1); g.fillStyle=m.c; g.fillText(m.t,chX+7,yy); });
  g.restore();
  if (maxS>0){ const tx=chX+chW-6, th=hgt-8, kh=Math.max(10,th*vis/rows.length), ky=top+4+(th-kh)*(1-logScroll/maxS);
    g.fillStyle='rgba(255,255,255,.08)'; g.fillRect(tx,top+4,3,th); g.fillStyle=logScroll?'#d2a94c':'rgba(210,169,76,.55)'; g.fillRect(tx,ky,3,kh); }
  CHAT.place(chX, top, chW, hgt);
  // ── 오른쪽: 단축키 F5~F12
  const rx=vw-R+2; ornate(g,rx-2,top,R-3,hgt);
  const sw=Math.min(SLOT, Math.floor((R-14)/4)), gx=rx+Math.floor((R-6-sw*4)/2);
  HOTRECT.length=0;
  for (let r=0;r<2;r++) for (let c=0;c<4;c++){ const x=gx+c*sw, y=top+6+r*(sw+6), idx=r*4+c, sel=idx===INV.hotSel();
    HOTRECT.push([x+1,y,sw-3,sw-3]);
    g.fillStyle='#0e0c0a'; g.fillRect(x+1,y,sw-3,sw-3); g.strokeStyle=sel?'#f2d98a':'#5a4a34'; g.lineWidth=sel?1.6:1; g.strokeRect(x+1.5,y+0.5,sw-4,sw-4);
    const id=INV.hot(idx);
    if (id&&id.startsWith('sk:')){ const sk=id.slice(3), im2=iconImg('sk_'+sk); if (im2.complete&&im2.naturalWidth){ g.save(); g.imageSmoothingEnabled=true; g.globalAlpha=LEARNED.has(sk)?1:0.35; g.drawImage(im2,x+3,y+2,sw-7,sw-7); g.restore(); }
      const cdv=SKCD[sk]||0; if (cdv>0){ g.fillStyle='rgba(0,0,0,.6)'; g.fillRect(x+3,y+2,sw-7,(sw-7)*Math.min(1,cdv/SK[sk].cd)); }
      if (INV.autoSk(sk)){ const bx=x+sw-9, by=y+8, on=!!(SK[sk].buff&&BUFF[SK[sk].buff]>0); g.save(); g.beginPath(); g.arc(bx,by,5.4,0,7); g.fillStyle='rgba(16,10,4,.92)'; g.fill(); g.lineWidth=1.2; g.strokeStyle=on?'#8af08a':'#ffd86a'; g.stroke(); g.font='900 7.5px '+F; g.textAlign='center'; g.textBaseline='middle'; g.fillStyle=on?'#c8ffc0':'#ffe08a'; g.fillText('A',bx,by+0.5); g.restore(); } }
    else if (id){ const im2=iconImg(ITEMS[id].icon, INV.bag().some(x=>x.id===id&&x.blessed)); if (im2.complete&&im2.naturalWidth){ g.save(); g.imageSmoothingEnabled=true; g.drawImage(im2,x+3,y+2,sw-7,sw-7); g.restore(); }
      if (ITEMS[id].stack){ const inf=GOD_INF(id), pc=INV.count(id), pt=inf?'∞':String(pc); g.textAlign='right'; g.textBaseline='bottom'; g.font='800 '+(inf?10:8)+'px '+F; g.fillStyle='#000'; g.fillText(pt,x+sw-3,y+sw-3); g.fillStyle=pc||inf?(inf?'#ffd86a':'#fff'):'#f08a7a'; g.fillText(pt,x+sw-4,y+sw-4); } }
    g.font='700 7px '+F; g.textAlign='left'; g.textBaseline='top'; g.fillStyle='#000'; g.fillText('F'+(5+idx),x+4,y+3); g.fillStyle=sel?'#f2d98a':'#a89e86'; g.fillText('F'+(5+idx),x+3,y+2); }
  if (hotDrag&&hotDrag.moved) drawHotGhost(g); else drawHotTip(g, vw);
  g.textBaseline='alphabetic';
  MM.draw(g, vw, y0);
  // 지역 이름
  g.font='700 12px '+F; g.textAlign='left'; g.fillStyle='#000'; g.fillText(ZONE,7,y0-6); g.fillStyle='#f0e8cc'; g.fillText(ZONE,6,y0-7);
  { const zw=g.measureText(ZONE).width; ZONERECT.length=0; ZONERECT.push([0,y0-24,zw+12,22]); { g.font='700 11px '+F; ZONERECT.r=zw+18+g.measureText(DN.label()).width+8; g.font='700 12px '+F; } const on=NET.count(); if (on>1){ const lb=DN.label(); g.font='700 11px '+F; const lx=zw+18+g.measureText(lb).width+14, t='● 온라인 '+on+'명'; ZONERECT.r=lx+g.measureText(t).width+4; g.fillStyle='#000'; g.fillText(t,lx+1,y0-6); g.fillStyle='#8fe08a'; g.fillText(t,lx,y0-7); g.font='700 12px '+F; } }   // 지역 이름을 누르면 월드맵 · 접속자 수
  // 자동사냥 표시: 경험치바 위 가운데, 시계처럼 도는 아이콘
  if (AUTO.on()) { g.save(); g.font = '800 12px '+F; const label = '자동사냥 중', w = g.measureText(label).width + 40, cx = Math.max(vw/2, (ZONERECT.r || 0) + w/2 + 10), cy = y0 - 18, r = 9, st = AUTO.status() || '';   // 지역·온라인 글자와 겹치지 않게

    g.fillStyle = 'rgba(12,9,6,.72)'; g.strokeStyle = '#8a6a34'; g.lineWidth = 1; g.beginPath(); g.roundRect ? g.roundRect(cx - w/2, cy - 13, w, 26, 13) : g.rect(cx - w/2, cy - 13, w, 26); g.fill(); g.stroke();
    const ix = cx - w/2 + 16; g.strokeStyle = '#f2d98a'; g.lineWidth = 1.6; g.beginPath(); g.arc(ix, cy, r - 2, 0, 7); g.stroke();
    for (let k = 0; k < 12; k++) { const a2 = k / 12 * 6.283; g.fillStyle = 'rgba(242,217,138,.6)'; g.fillRect(ix + Math.cos(a2) * (r - 4.5) - 0.5, cy + Math.sin(a2) * (r - 4.5) - 0.5, 1, 1); }
    const a1 = time * 5, a0 = time * 0.6; g.lineCap = 'round';
    g.strokeStyle = '#ffe08a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(ix, cy); g.lineTo(ix + Math.cos(a1) * (r - 3.5), cy + Math.sin(a1) * (r - 3.5)); g.stroke();
    g.strokeStyle = '#d2a94c'; g.lineWidth = 2; g.beginPath(); g.moveTo(ix, cy); g.lineTo(ix + Math.cos(a0) * (r - 5.5), cy + Math.sin(a0) * (r - 5.5)); g.stroke();
    g.beginPath(); g.strokeStyle = 'rgba(255,224,138,.35)'; g.lineWidth = 2.5; g.arc(ix, cy, r + 1, a1 - 1.2, a1); g.stroke();
    g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#000'; g.fillText(label, ix + 14, cy + 1); g.fillStyle = '#ffe6a0'; g.fillText(label, ix + 13, cy);
    g.restore(); g.textBaseline = 'alphabetic'; }
  // 버프 아이콘: 경험치바 위 오른쪽부터 가로로 (마우스를 올리면 이름·효과·남은 시간)
  { BUFFRECT.length=0; let bx=vw-8; const sz=26, by=y0-sz-6; const mp=mouse?[mouse[0]/curZ,mouse[1]/curZ]:null; let tip=null, ptip=null;
    // 소환한 펫: 목걸이 아이콘 + HP 막대 (쓰러지면 회색 + 해골) — 누르면 펫 창
    PETRECT.length=0; for (const pt of PET.list()){ bx-=sz; const d=pt.d, im2=iconImg('collar'); g.save(); g.fillStyle='rgba(10,8,6,.62)'; g.fillRect(bx-1,by-1,sz+2,sz+2); g.strokeStyle=pt.dead?'#6a6a6a':'#5ab8ff'; g.lineWidth=1; g.strokeRect(bx-0.5,by-0.5,sz+1,sz+1);
      if (pt.dead) g.filter='grayscale(1) brightness(.6)'; if (im2.complete&&im2.naturalWidth){ g.imageSmoothingEnabled=true; g.drawImage(im2,bx+2,by+1,sz-4,sz-4); } g.filter='none';
      if (pt.dead){ g.font='12px sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillStyle='#f2eedf'; g.fillText('☠',bx+sz/2,by+sz/2); g.textBaseline='alphabetic'; }
      g.fillStyle='rgba(0,0,0,.65)'; g.fillRect(bx,by+sz-3,sz,3); g.fillStyle=d.hp/d.maxhp<0.35?'#e8503a':'#5ad06a'; g.fillRect(bx,by+sz-3,sz*Math.max(0,d.hp)/d.maxhp,3); g.restore();
      PETRECT.push([bx,by,sz,sz,pt]); if (mp&&mp[0]>=bx&&mp[0]<=bx+sz&&mp[1]>=by&&mp[1]<=by+sz) ptip={pt,x:bx,y:by}; bx-=6; }
    if (PET.list().length) bx-=4;
    for (const k of ['invis','root','slow','counter','solid','bounce','reduction','enchant','shieldm','light','haste2','haste1','mana','rmagic','relem','cmind','decwt','medit','counterm','immune']) if (BUFF[k]>0){ const D=BUFF_DEF[k]; bx-=sz; const im2=iconImg(D.icon);
      g.save(); g.globalAlpha=0.78; g.fillStyle='rgba(10,8,6,.55)'; g.fillRect(bx-1,by-1,sz+2,sz+2); g.strokeStyle=D.c; g.lineWidth=1; g.strokeRect(bx-0.5,by-0.5,sz+1,sz+1);
      if (im2.complete&&im2.naturalWidth){ g.imageSmoothingEnabled=true; g.drawImage(im2,bx+2,by+2,sz-4,sz-4); }
      const k2=Math.min(1,BUFF[k]/D.dur); g.globalAlpha=0.9; g.fillStyle='rgba(0,0,0,.6)'; g.fillRect(bx,by+sz-3,sz,3); g.fillStyle=D.c; g.fillRect(bx,by+sz-3,sz*k2,3);
      if (BUFF[k]<30 && BUFF[k]>10 && Math.floor(time*3)%2) { g.fillStyle='rgba(255,255,255,.18)'; g.fillRect(bx,by,sz,sz); }
      if (BUFF[k]<=10) { const n=Math.ceil(BUFF[k]), pop=1+0.35*Math.max(0,1-(n-BUFF[k])*4); g.globalAlpha=1; g.fillStyle='rgba(0,0,0,.45)'; g.fillRect(bx,by,sz,sz-3); g.font=`900 ${Math.round(15*pop)}px "Noto Sans KR",sans-serif`; g.textAlign='center'; g.textBaseline='middle'; g.lineWidth=3; g.strokeStyle='rgba(0,0,0,.9)'; g.strokeText(String(n),bx+sz/2,by+sz/2-1); g.fillStyle=n<=3?'#ff6a5a':'#ffe08a'; g.fillText(String(n),bx+sz/2,by+sz/2-1); g.textBaseline='alphabetic'; }   // 10초 남으면 10·9·8… 숫자
      g.restore(); BUFFRECT.push([bx,by,sz,sz,k]);
      if (mp&&mp[0]>=bx&&mp[0]<=bx+sz&&mp[1]>=by&&mp[1]<=by+sz) tip={k,x:bx,y:by};
      bx-=6; }
    if (ptip){ const d=ptip.pt.d, lines=[d.name, `Lv.${d.lv} ${PET_KIND[d.kind].name} · ${ptip.pt.dead?'쓰러짐':'HP '+Math.ceil(d.hp)+'/'+d.maxhp}`, '클릭: 펫 창 열기'];
      g.font='600 11px '+F; const w=Math.max(...lines.map(l=>g.measureText(l).width))+16, h=lines.length*15+10, tx=Math.min(vw-w-4,Math.max(4,ptip.x+13-w/2)), ty=ptip.y-h-6; g.fillStyle='rgba(16,13,10,.94)'; g.fillRect(tx,ty,w,h); g.strokeStyle='#8a7348'; g.strokeRect(tx+0.5,ty+0.5,w-1,h-1);
      lines.forEach((l,n)=>{ g.textAlign='left'; g.fillStyle=n===0?'#9fe0ff':n===2?'#9c937c':'#e9e2cf'; g.font=(n===0?'800 ':'500 ')+'11px '+F; g.fillText(l,tx+8,ty+17+n*15); }); }
    if (tip){ const D=BUFF_DEF[tip.k], t=BUFF[tip.k], lines=[D.name, D.desc, D.bad?`남은 시간 ${t.toFixed(1)}초`:`남은 시간 ${Math.floor(t/60)}분 ${String(Math.floor(t%60)).padStart(2,'0')}초`];
      g.font='600 11px '+F; const w=Math.max(...lines.map(l=>g.measureText(l).width))+16, h=lines.length*15+10, tx=Math.min(vw-w-4,Math.max(4,tip.x+13-w/2)), ty=tip.y-h-6;
      g.fillStyle='rgba(16,13,10,.94)'; g.fillRect(tx,ty,w,h); g.strokeStyle='#8a7348'; g.strokeRect(tx+0.5,ty+0.5,w-1,h-1);
      lines.forEach((l,n)=>{ g.textAlign='left'; g.textBaseline='alphabetic'; g.fillStyle=n===0?D.c:n===2?'#f2eedf':'#cfc6ae'; g.font=(n===0?'800 ':'500 ')+'11px '+F; g.fillText(l,tx+8,ty+17+n*15); }); }
    g.font='700 12px '+F; g.textAlign='left'; }
  { const zw=g.measureText(ZONE).width, lb=DN.label(); g.font='700 11px '+F; g.fillStyle='#000'; g.fillText(lb,zw+19,y0-6); g.fillStyle=DN.isNight()?'#a8b8f0':'#f2d98a'; g.fillText(lb,zw+18,y0-7); }
}

// ============================================================ 몬스터 도감 · 이야기섬 (Lv 1~10)
// 수치: 리니지 클래식 커뮤니티 자료를 참고해 자체 조정 (밸런스팀 확정 전 임시값)
const MOB = {
  fox:        { name: '여우', lv: 2, hp: 10, dmg: [1, 3], mac: 9, hit: 0.7, exp: 6, coin: [8, 27], walk: 1.4, run: 3.4, cd: 1.2, art: 'fox', sc: 1, hw: 22, hh: 34 },
  goblin:     { name: '고블린', lv: 1, hp: 10, dmg: [1, 3], mac: 10, hit: 0.65, exp: 4, coin: [3, 12], walk: 1.3, run: 3.0, cd: 1.3, art: 'vil', tint: 'hue-rotate(75deg) saturate(1.4) brightness(.85)', sc: 0.8 },
  orc:        { name: '오크', lv: 3, hp: 15, dmg: [1, 4], mac: 9, hit: 0.7, exp: 8, coin: [6, 18], walk: 1.2, run: 3.0, cd: 1.3, art: 'vil', tint: 'hue-rotate(100deg) saturate(1.1) brightness(.68)', sc: 1 },
  orc_archer: { name: '오크 궁수', lv: 4, hp: 12, dmg: [1, 3], mac: 9, hit: 0.65, exp: 10, coin: [8, 20], walk: 1.2, run: 2.8, cd: 1.8, range: 5, art: 'vil', tint: 'hue-rotate(55deg) saturate(.9) brightness(.8)', sc: 0.95 },
  dwarf:      { name: '난쟁이', lv: 4, hp: 18, dmg: [1, 5], mac: 7, hit: 0.7, exp: 10, coin: [10, 24], walk: 1.0, run: 2.6, cd: 1.4, art: 'vil', tint: 'sepia(.7) saturate(1.5) brightness(.78)', sc: 0.72 },
  hobgoblin:  { name: '홉고블린', lv: 6, hp: 30, dmg: [2, 6], mac: 7, hit: 0.72, exp: 18, coin: [14, 34], walk: 1.3, run: 3.1, cd: 1.3, art: 'vil', tint: 'hue-rotate(35deg) saturate(1.6) brightness(.9)', sc: 1.05 },
  orc_warrior:{ name: '오크 전사', lv: 7, hp: 42, dmg: [2, 7], mac: 5, hit: 0.75, exp: 22, coin: [18, 40], walk: 1.2, run: 3.0, cd: 1.4, art: 'vil', tint: 'hue-rotate(115deg) saturate(1.3) brightness(.55) contrast(1.2)', sc: 1.2 },
  werewolf:   { name: '늑대인간', lv: 8, hp: 55, dmg: [3, 8], mac: 6, hit: 0.75, exp: 28, coin: [20, 50], walk: 1.6, run: 3.8, cd: 1.1, art: 'fox', tint: 'grayscale(1) brightness(.55) contrast(1.4)', sc: 1.7, hw: 30, hh: 52 },
  // ----- 사막필드 (Lv10~20) — 그림은 임시(코드로 그린 개미·전갈, 물들인 사람·짐승 그림). MSHEET에 같은 이름을 넣고 mon_<이름>_{idle,walk,attack}.webp를 두면 자동으로 정식 그림 사용
  lizardman:  { name: '리자드맨', lv: 11, hp: 70, dmg: [3, 9], mac: 5, hit: 0.75, exp: 40, coin: [30, 60], walk: 1.2, run: 3.0, cd: 1.4, art: 'vil', tint: 'hue-rotate(70deg) saturate(1.6) brightness(.72) contrast(1.25)', sc: 1.12 },
  giant_ant:  { name: '거대개미', lv: 12, hp: 80, dmg: [4, 9], mac: 4, hit: 0.75, exp: 45, coin: [25, 55], walk: 1.4, run: 3.2, cd: 1.3, art: 'ant', body: ['#3a2a1e', '#1a120c'], sc: 1, hw: 30, hh: 34 },
  scorpion:   { name: '스콜피온', lv: 14, hp: 95, dmg: [5, 11], mac: 3, hit: 0.78, exp: 60, coin: [40, 80], walk: 1.3, run: 3.4, cd: 1.5, art: 'scorpion', aggr: 5, sc: 1, hw: 32, hh: 36 },
  basilisk:   { name: '바실리스크', lv: 16, hp: 130, dmg: [6, 13], mac: 3, hit: 0.78, exp: 80, coin: [50, 100], walk: 1.1, run: 2.8, cd: 1.6, art: 'fox', tint: 'grayscale(.6) sepia(.5) hue-rotate(50deg) saturate(1.4) brightness(.62) contrast(1.3)', sc: 1.9, hw: 34, hh: 56 },
  fire_ant:   { name: '거대불개미', lv: 17, hp: 110, dmg: [6, 12], mac: 3, hit: 0.8, exp: 85, coin: [45, 90], walk: 1.5, run: 3.4, cd: 1.3, art: 'ant', body: ['#a8341a', '#3a0c06'], fire: true, burn: true, sc: 1.08, hw: 32, hh: 36 },
  queen_ant:  { name: '거대 여왕개미', lv: 22, hp: 2400, dmg: [10, 22], mac: 0, hit: 0.85, exp: 2500, coin: [5000, 9000], walk: 0.9, run: 2.4, cd: 1.7, art: 'ant', body: ['#5a3a20', '#1e120a'], queen: true, sc: 2.5, boss: true, aggr: 6, hw: 80, hh: 90 },
  // ----- 오크숲 (Lv15~25) — 1구간: 로바(주먹)·두다마라(창)·오크 마법사(파이어볼)·다크엘프(활, 선공, 소수) / 2구간: 다크엘프·아투바(검)·가스트(꼽추, 선공) + 보스 오우거
  roba_orc:     { name: '로바 오크', lv: 15, hp: 120, dmg: [5, 11], mac: 4, hit: 0.78, exp: 70, coin: [40, 80], walk: 1.2, run: 3.0, cd: 1.1, art: 'vil', tint: 'hue-rotate(80deg) saturate(1.2) brightness(.7)', sc: 1.1, atkTxt: '주먹' },
  dudamara_orc: { name: '두다마라 오크', lv: 17, hp: 140, dmg: [6, 13], mac: 4, hit: 0.8, exp: 82, coin: [45, 90], walk: 1.2, run: 3.0, cd: 1.5, art: 'vil', tint: 'hue-rotate(60deg) saturate(1.1) brightness(.66)', sc: 1.12, atkTxt: '창' },
  orc_wizard:   { name: '오크 마법사', lv: 18, hp: 105, dmg: [8, 15], mac: 6, hit: 0.86, exp: 88, coin: [50, 95], walk: 1.1, run: 2.8, cd: 2.4, range: 5, fireball: true, art: 'vil', tint: 'hue-rotate(230deg) saturate(1.1) brightness(.7)', sc: 1.0, atkTxt: '파이어볼' },
  dark_elf:     { name: '다크엘프', lv: 20, hp: 150, dmg: [7, 14], mac: 3, hit: 0.82, exp: 100, coin: [55, 110], walk: 1.4, run: 3.4, cd: 1.6, range: 6, aggr: 6, art: 'vil', tint: 'grayscale(.5) hue-rotate(220deg) saturate(1.6) brightness(.55)', sc: 1.0, atkTxt: '활' },
  atuba_orc:    { name: '아투바 오크', lv: 22, hp: 200, dmg: [8, 17], mac: 2, hit: 0.82, exp: 120, coin: [60, 120], walk: 1.2, run: 3.0, cd: 1.4, art: 'vil', tint: 'hue-rotate(20deg) saturate(1.3) brightness(.6) contrast(1.2)', sc: 1.2, atkTxt: '검' },
  gast:         { name: '가스트', lv: 23, hp: 235, dmg: [9, 19], mac: 2, hit: 0.84, exp: 140, coin: [70, 130], walk: 1.0, run: 3.2, cd: 1.5, aggr: 5, art: 'vil', tint: 'sepia(.6) hue-rotate(50deg) saturate(1.2) brightness(.6)', sc: 1.15, atkTxt: '몽둥이' },
  ogre:         { name: '오우거', lv: 28, hp: 3600, dmg: [14, 30], mac: 0, hit: 0.88, exp: 4000, coin: [7000, 12000], walk: 0.9, run: 2.4, cd: 1.9, art: 'vil', tint: 'sepia(.5) saturate(1.3) hue-rotate(-20deg) brightness(.8)', sc: 2.4, boss: true, aggr: 6, hw: 70, hh: 150 },
  // ----- 버그베어밭 (Lv20~30) — 살육의 땅. 1구간: 해골 궁수(활, 선공)·좀비(느리고 질김)·버그베어 / 2구간: 버그베어·켈베로스(불 물기)·킹 버그베어(선공) + 보스 바포메트. 해골·좀비는 언데드(밤에 강해짐)
  skeleton_archer: { name: '해골 궁수', lv: 21, hp: 140, dmg: [7, 15], mac: 4, hit: 0.84, exp: 108, coin: [55, 110], walk: 1.1, run: 3.0, cd: 1.7, range: 6, aggr: 6, undead: true, art: 'vil', tint: 'grayscale(1) brightness(1.5) contrast(1.2)', sc: 1.0, atkTxt: '활' },
  zombie:       { name: '좀비', lv: 22, hp: 240, dmg: [8, 16], mac: 5, hit: 0.78, exp: 118, coin: [50, 100], walk: 0.6, run: 1.8, cd: 1.8, undead: true, art: 'vil', tint: 'grayscale(.7) sepia(.5) hue-rotate(35deg) brightness(.6)', sc: 1.05, atkTxt: '할퀴기' },
  bugbear:      { name: '버그베어', lv: 24, hp: 270, dmg: [9, 19], mac: 3, hit: 0.84, exp: 145, coin: [70, 135], walk: 1.2, run: 3.1, cd: 1.5, art: 'vil', tint: 'sepia(.9) saturate(1.4) hue-rotate(-12deg) brightness(.7)', sc: 1.25, atkTxt: '몽둥이' },
  cerberus:     { name: '켈베로스', lv: 27, hp: 310, dmg: [11, 22], mac: 3, hit: 0.86, exp: 178, coin: [80, 150], walk: 1.6, run: 4.0, cd: 1.2, burn: true, art: 'fox', tint: 'sepia(1) saturate(2.6) hue-rotate(-28deg) brightness(.5) contrast(1.5)', sc: 1.6, hw: 30, hh: 46, atkTxt: '물기' },
  king_bugbear: { name: '킹 버그베어', lv: 29, hp: 420, dmg: [13, 26], mac: 2, hit: 0.88, exp: 235, coin: [100, 190], walk: 1.2, run: 3.2, cd: 1.6, aggr: 6, art: 'vil', tint: 'sepia(.6) saturate(1.1) hue-rotate(-25deg) brightness(.5) contrast(1.2)', sc: 1.45, atkTxt: '도끼' },
  baphomet:     { name: '바포메트', lv: 33, hp: 5200, dmg: [16, 34], mac: 0, hit: 0.9, exp: 5600, coin: [9000, 15000], walk: 1.0, run: 2.6, cd: 1.8, art: 'vil', tint: 'sepia(.7) hue-rotate(-38deg) saturate(1.8) brightness(.45)', sc: 2.5, boss: true, aggr: 6, hw: 72, hh: 160 },
  // 펫 그림(임시): 모델이 나오기 전까지 여우 그림을 검정·황갈색 도베르만처럼 물들여 씀
  pet_doberman:{ name: '도베르만', lv: 1, hp: 26, dmg: [1, 4], mac: 8, hit: 0.72, exp: 0, coin: [0, 0], walk: 1.6, run: 3.7, cd: 1.1, art: 'fox', tint: 'sepia(1) saturate(2.1) hue-rotate(-14deg) brightness(.62) contrast(1.9)', sc: 1.22, hw: 24, hh: 40, pet: true },
  // ----- 본토던전 (Lv35~45) — 모두 선공. 1층: 킹 버그베어·웅골리언트(거미줄 둔화)·구울(독) + 보스 카스파 패밀리(물·불·땅·바람 마법사 넷) / 2층: 킹 버그베어·켈베로스·네크로맨서(저주 폭발) + 보스 데스나이트(헬파이어·스파토이 소환)
  dg_kbugbear: { name: '킹 버그베어', lv: 35, hp: 500, dmg: [15, 29], mac: 1, hit: 0.88, exp: 300, coin: [120, 220], walk: 1.2, run: 3.2, cd: 1.6, aggr: 6, art: 'vil', tint: 'sepia(.6) saturate(1.1) hue-rotate(-25deg) brightness(.5) contrast(1.2)', sc: 1.45, atkTxt: '도끼' },
  ungoliant:   { name: '웅골리언트', lv: 36, hp: 440, dmg: [14, 27], mac: 2, hit: 0.9, exp: 310, coin: [120, 220], walk: 1.5, run: 3.8, cd: 1.3, aggr: 6, web: 0.2, art: 'spider', sc: 0.6, hw: 40, hh: 46, atkTxt: '독니' },
  ghoul:       { name: '구울', lv: 33, hp: 300, dmg: [11, 21], mac: 3, hit: 0.86, exp: 250, coin: [100, 180], walk: 1.0, run: 3.0, cd: 1.4, aggr: 5, undead: true, poison: 0.35, art: 'vil', tint: 'grayscale(.75) sepia(.35) hue-rotate(55deg) saturate(1.2) brightness(.82) contrast(1.25)', sc: 1.05, atkTxt: '할퀴기' },
  dg_cerberus: { name: '켈베로스', lv: 38, hp: 520, dmg: [16, 31], mac: 1, hit: 0.9, exp: 340, coin: [130, 240], walk: 1.6, run: 4.0, cd: 1.2, burn: true, aggr: 6, art: 'fox', tint: 'sepia(1) saturate(2.6) hue-rotate(-28deg) brightness(.5) contrast(1.5)', sc: 1.6, hw: 30, hh: 46, atkTxt: '불 물기' },
  necromancer: { name: '네크로맨서', lv: 39, hp: 420, dmg: [14, 24], mac: 3, hit: 0.9, exp: 360, coin: [140, 250], walk: 1.0, run: 2.6, cd: 2.6, range: 6, spell: 'necro', mr: 25, aggr: 7, art: 'vil', tint: 'grayscale(1) brightness(.4)', sc: 1.0, atkTxt: '저주 폭발' },
  spartoi:     { name: '스파토이', lv: 36, hp: 320, dmg: [12, 24], mac: 2, hit: 0.88, exp: 60, coin: [20, 60], walk: 1.1, run: 3.0, cd: 1.4, undead: true, aggr: 6, art: 'vil', tint: 'grayscale(1) brightness(1.4)', sc: 1.05, atkTxt: '칼' },
  kaspar:      { name: '카스파', lv: 40, hp: 2300, dmg: [12, 22], mac: 0, hit: 0.9, exp: 2200, coin: [2500, 4000], walk: 1.0, run: 2.6, cd: 2.3, range: 6, spell: 'water', el: 'water', mr: 30, boss: true, aggr: 7, art: 'vil', sc: 1.2, hw: 40, hh: 104, atkTxt: '얼음 마법' },
  merkyor:     { name: '메르키오르', lv: 40, hp: 2300, dmg: [13, 23], mac: 0, hit: 0.9, exp: 2200, coin: [2500, 4000], walk: 1.0, run: 2.6, cd: 2.6, range: 6, spell: 'fire', el: 'fire', mr: 30, boss: true, aggr: 7, art: 'vil', sc: 1.2, hw: 40, hh: 104, atkTxt: '불 마법' },
  balthazar:   { name: '발터자르', lv: 40, hp: 2600, dmg: [12, 22], mac: -1, hit: 0.9, exp: 2200, coin: [2500, 4000], walk: 0.9, run: 2.4, cd: 2.5, range: 6, spell: 'earth', el: 'earth', mr: 30, boss: true, aggr: 7, art: 'vil', sc: 1.2, hw: 40, hh: 104, atkTxt: '땅 마법' },
  sema:        { name: '세마', lv: 40, hp: 2100, dmg: [11, 20], mac: 1, hit: 0.92, exp: 2200, coin: [2500, 4000], walk: 1.2, run: 3.0, cd: 2.0, range: 6, spell: 'wind', el: 'wind', mr: 30, boss: true, aggr: 7, art: 'vil', sc: 1.2, hw: 40, hh: 104, atkTxt: '바람 마법' },
  deathknight: { name: '데스나이트', lv: 45, hp: 7200, dmg: [20, 36], mac: -2, hit: 0.92, exp: 9000, coin: [12000, 20000], walk: 1.0, run: 2.7, cd: 1.6, el: 'fire', undead: true, mr: 35, boss: true, aggr: 7, art: 'vil', sc: 1.6, hw: 52, hh: 150, atkTxt: '불검' },
  // ----- 오렌설원지역 (수속성) — 1구역: 엘모어 병사(검·방패)·전사(대검)·마법사(얼음 마법) 무리 · 2구역: 에틴(선공)·아이스 골렘(맞으면 둔화)·샤벨타이거(선공, 빠름) + 보스 얼음여왕
  elmore_soldier: { name: '엘모어 병사', undead: true, lv: 39, hp: 430, dmg: [13, 25], mac: 1, hit: 0.88, exp: 330, coin: [130, 230], walk: 1.2, run: 3.1, cd: 1.5, el: 'water', art: 'vil', tint: 'hue-rotate(190deg) saturate(1.3) brightness(.8)', sc: 1.0, atkTxt: '검' },
  elmore_warrior: { name: '엘모어 전사', undead: true, lv: 41, hp: 560, dmg: [16, 30], mac: -1, hit: 0.9, exp: 400, coin: [150, 260], walk: 1.1, run: 3.0, cd: 1.7, el: 'water', art: 'vil', tint: 'grayscale(.6) brightness(1.2)', sc: 1.05, atkTxt: '대검' },
  elmore_mage:    { name: '엘모어 마법사', undead: true, lv: 40, hp: 380, dmg: [14, 24], mac: 3, hit: 0.9, exp: 360, coin: [140, 240], walk: 1.0, run: 2.7, cd: 2.5, range: 6, spell: 'water', mr: 25, el: 'water', art: 'vil', tint: 'hue-rotate(200deg) saturate(1.6)', sc: 1.0, atkTxt: '얼음 마법' },
  ettin:          { name: '에틴', lv: 45, hp: 780, dmg: [20, 36], mac: 0, hit: 0.9, exp: 520, coin: [180, 320], walk: 1.0, run: 2.8, cd: 1.8, aggr: 6, el: 'water', art: 'vil', tint: 'grayscale(.5) hue-rotate(170deg) brightness(.95)', sc: 1.4, atkTxt: '몽둥이' },
  ice_golem:      { name: '아이스 골렘', lv: 44, hp: 900, dmg: [18, 32], mac: -3, hit: 0.86, exp: 500, coin: [160, 300], walk: 0.7, run: 1.9, cd: 2.0, el: 'water', chill: 0.3, art: 'vil', tint: 'grayscale(1) brightness(1.6) hue-rotate(160deg)', sc: 1.3, atkTxt: '얼음 주먹' },
  sabertooth:     { name: '샤벨타이거', lv: 46, hp: 640, dmg: [19, 34], mac: 0, hit: 0.93, exp: 540, coin: [180, 320], walk: 1.7, run: 4.3, cd: 1.1, aggr: 6, el: 'water', art: 'fox', tint: 'grayscale(1) brightness(1.5)', sc: 1.6, hw: 32, hh: 48, atkTxt: '송곳니' },
  ice_queen:      { name: '얼음여왕', lv: 50, hp: 8400, dmg: [20, 34], mac: -2, hit: 0.92, exp: 11000, coin: [14000, 24000], walk: 1.0, run: 2.6, cd: 2.2, range: 6, spell: 'water', el: 'water', mr: 40, boss: true, aggr: 7, art: 'vil', sc: 1.5, hw: 46, hh: 140, atkTxt: '얼음 마법' },
  shelob:     { name: '셸로브', lv: 12, hp: 700, dmg: [6, 15], mac: 2, hit: 0.8, exp: 400, coin: [800, 1500], walk: 1.0, run: 2.6, cd: 1.6, art: 'spider', sc: 1, boss: true, aggr: 6, hw: 46, hh: 58 },
};
// v100 난이도: Lv15 이상 몬스터(보스 포함)는 HP +25%, 공격력 +20%
for (const k in MOB) { const S = MOB[k]; if (S.pet || (S.lv || 0) < 15) continue; S.hp = Math.round(S.hp * 1.25); S.dmg = S.dmg.map(v => Math.round(v * 1.2)); }
// 렌더링된 몬스터 스프라이트 (그래픽팀) — 있는 몬스터는 정식 그림, 없으면 임시 그림
const MSHEET = {
  goblin: { W: 144, H: 137, ax: 56, ay: 112, s: 0.5, af: 8, hh: 56, hw: 18 },
  dwarf: { W: 151, H: 123, ax: 63, ay: 94, s: 0.5, af: 8, hh: 58, hw: 20 },
  hobgoblin: { W: 233, H: 213, ax: 93, ay: 171, s: 0.5, af: 8, hh: 90, hw: 26 },
  orc_warrior: { W: 287, H: 260, ax: 127, ay: 202, s: 0.5, af: 8, hh: 100, hw: 28 },
  orc: { W: 240, H: 199, ax: 96, ay: 157, s: 0.5, af: 8, hh: 80, hw: 24 },
  orc_archer: { W: 249, H: 205, ax: 105, ay: 156, s: 0.5, af: 8, hh: 78, hw: 24 },
  werewolf: { W: 269, H: 239, ax: 109, ay: 188, s: 0.5, af: 8, hh: 90, hw: 30 },
  shelob: { W: 353, H: 218, ax: 176, ay: 128, s: 1.0, af: 8, hh: 110, hw: 120 },   // 보스: 2배 크기, 공격 8장
  // 사막필드 (PC 렌더 MON_DESERT) — 그림이 못 불러와지면 원래 그림(art0)으로 그림
  scorpion: { W: 182, H: 136, ax: 82, ay: 95, s: 0.5, af: 8, hh: 40, hw: 34 },
  basilisk: { W: 321, H: 199, ax: 154, ay: 122, s: 0.5, af: 6, hh: 50, hw: 44 },   // 공격 6장 (렌더의 7·8번째 장면은 몸이 칸 밖으로 미끄러져 잘려서 뺌)
  // 2차 (MON_FIX — 훅 수정 후 다시 렌더): 개미 3종 · 리자드맨(걷기만 새로) · 도베르만 펫
  giant_ant: { W: 200, H: 137, ax: 88, ay: 95, s: 0.5, af: 8, hh: 26, hw: 29 },
  fire_ant: { W: 200, H: 135, ax: 88, ay: 94, s: 0.5, af: 8, hh: 26, hw: 29 },
  queen_ant: { W: 415, H: 284, ax: 187, ay: 196, s: 0.5, af: 8, hh: 62, hw: 61 },   // 보스 (4.2m)
  lizardman: { W: 181, H: 190, ax: 70, ay: 161, s: 0.5, af: 8, hh: 76, hw: 37 },
  pet_doberman: { W: 129, H: 111, ax: 55, ay: 84, s: 0.5, af: 8, hh: 30, hw: 20 },   // 펫 (펫 그림 경로 PET.draw)
  // 오크숲 (PC 렌더 OFM): 오크 모델 하나에 색·장비·동작을 코드로 다르게 · 다크엘프는 요정 모델을 어둡게 · 보스 오우거(약 4m)
  roba_orc: { W: 122, H: 100, ax: 46, ay: 80, s: 1.0, af: 8, hh: 70, hw: 40 },
  dudamara_orc: { W: 168, H: 139, ax: 73, ay: 105, s: 1.0, af: 8, hh: 74, hw: 41 },
  orc_wizard: { W: 170, H: 146, ax: 80, ay: 112, s: 1.0, af: 8, hh: 80, hw: 40 },
  dark_elf: { W: 153, H: 132, ax: 59, ay: 109, s: 0.7692, af: 8, hh: 66, hw: 31 },
  atuba_orc: { W: 181, H: 142, ax: 81, ay: 107, s: 1.0, af: 8, hh: 78, hw: 44 },
  gast: { W: 209, H: 191, ax: 98, ay: 146, s: 0.7692, af: 8, hh: 63, hw: 37 },
  ogre: { W: 336, H: 295, ax: 166, ay: 225, s: 1.0, af: 8, hh: 134, hw: 73 },
  // 버그베어밭 (PC 렌더 BBF): 해골 궁수(해골 모델+요정 활 동작) · 좀비 · 버그베어/킹 버그베어(같은 몸, 킹은 짙은 갈색+쇠 투구) · 켈베로스(용암 지옥견) · 보스 바포메트(약 4m, 양날 대도끼)
  skeleton_archer: { W: 118, H: 102, ax: 46, ay: 84, s: 1.0, af: 8, hh: 64, hw: 23 },
  zombie: { W: 100, H: 91, ax: 35, ay: 78, s: 1.0, af: 8, hh: 63, hw: 28 },
  bugbear: { W: 196, H: 136, ax: 82, ay: 100, s: 1.0, af: 8, hh: 74, hw: 49 },
  king_bugbear: { W: 222, H: 172, ax: 95, ay: 126, s: 1.0, af: 8, hh: 90, hw: 61 },
  cerberus: { W: 154, H: 108, ax: 69, ay: 74, s: 1.0, af: 8, hh: 56, hw: 42 },
  baphomet: { W: 311, H: 280, ax: 140, ay: 212, s: 1.0, af: 8, hh: 149, hw: 81 },
  // 본토던전 보스 (그래픽팀 합성): 카스파 패밀리 = 마법사 레이어(로브·망토·지팡이)를 원소색으로 · 데스나이트 = 기사 판금 레이어를 검게 그을린 강철·핏빛 망토·달군 불검으로
  kaspar: { W: 266, H: 249, ax: 133, ay: 228, s: 0.62, af: 8, hh: 104, hw: 40, tint: 'sepia(1) saturate(3.4) hue-rotate(172deg) brightness(.92)' },
  deathknight: { W: 214, H: 248, ax: 95, ay: 225, s: 0.78, af: 8, hh: 150, hw: 52 },
  // PC 렌더(DGN): 스파토이 = 해골 + 넓은 칼·둥근 방패 · 네크로맨서 = 해골 + 로브·두건 + 초록 눈빛 해골 지팡이
  spartoi: { W: 310, H: 254, ax: 125, ay: 200, s: 1.0, af: 8, hh: 66, hw: 24 },
  // 오렌설원 엘모어 군단 (그래픽팀 합성): 병사 = 기사 몸 + 남빛 강철 갑옷·가죽 투구·방패·검 / 전사 = 푸른 빛 은빛 판금·금장식·왕실 파랑 망토·대검(내려찍기)
  elmore_soldier: { W: 233, H: 229, ax: 110, ay: 206, s: 0.5, af: 8, hh: 96, hw: 30 },
  elmore_warrior: { W: 214, H: 248, ax: 95, ay: 225, s: 0.53, af: 8, hh: 104, hw: 32 },
  necromancer: { W: 335, H: 271, ax: 133, ay: 217, s: 1.0, af: 8, hh: 66, hw: 26, tint: 'sepia(.3) hue-rotate(230deg) saturate(1.6) brightness(.88)' },
};
// 오크숲 몬스터 임시 그림: [원본 렌더, 크기 배율, 물들임] — 정식 렌더(mon_<이름>_*.webp)가 MSHEET에 들어오면 이 별칭은 쓰지 않음
const MS_ALIAS = { roba_orc: ['orc', 1.08, 'hue-rotate(-28deg) saturate(1.25) brightness(.92)'], dudamara_orc: ['orc_warrior', 0.96, 'hue-rotate(-50deg) saturate(.9) brightness(.95)'],
  orc_wizard: ['orc', 1.0, 'hue-rotate(210deg) saturate(1.3) brightness(.85)'], dark_elf: ['orc_archer', 0.98, 'grayscale(.55) hue-rotate(225deg) saturate(1.8) brightness(.62) contrast(1.15)'],
  atuba_orc: ['orc_warrior', 1.08, 'hue-rotate(-12deg) saturate(1.2) brightness(.72) contrast(1.15)'], gast: ['hobgoblin', 1.12, 'sepia(.55) hue-rotate(35deg) saturate(1.1) brightness(.68) contrast(1.1)'],
  ogre: ['orc_warrior', 2.3, 'sepia(.45) saturate(1.25) hue-rotate(-25deg) brightness(.82) contrast(1.08)'],
  // 버그베어밭 임시 그림 (정식 렌더 전): 해골 궁수=오크 궁수를 뼈빛으로 · 좀비=오크를 썩은 잿빛으로 · 버그베어=오우거를 줄여 살색(원작: 대머리·배 나온 거인)·킹 버그베어는 짙은 갈색 · 켈베로스=도베르만을 검붉게 · 바포메트=오우거를 검붉게
  skeleton_archer: ['orc_archer', 0.95, 'grayscale(1) sepia(.2) brightness(1.45) contrast(1.35)'], zombie: ['orc', 1.0, 'grayscale(.7) sepia(.5) hue-rotate(35deg) saturate(.9) brightness(.6) contrast(1.1)'],
  bugbear: ['ogre', 0.58, 'sepia(.35) saturate(1.1) hue-rotate(-8deg) brightness(1.08)'], king_bugbear: ['ogre', 0.56, 'sepia(.6) saturate(1.2) hue-rotate(-18deg) brightness(.62) contrast(1.15)'],
  cerberus: ['pet_doberman', 1.7, 'sepia(1) saturate(2.6) hue-rotate(-28deg) brightness(.5) contrast(1.5)'], baphomet: ['ogre', 1.05, 'grayscale(.4) sepia(.7) hue-rotate(-38deg) saturate(1.8) brightness(.45) contrast(1.3)'],
  // 본토던전 임시 그림 (정식 렌더가 들어오면 MSHEET가 대신함): 구울=좀비를 창백한 잿빛 초록으로 · 웅골리언트=셸로브를 작고 검보랏빛으로 · 스파토이=해골 · 네크로맨서=검보라 로브 마법사
  dg_kbugbear: ['king_bugbear', 1.0, ''], dg_cerberus: ['cerberus', 1.06, 'saturate(1.3) brightness(.85)'], ghoul: ['zombie', 1.0, 'grayscale(.75) sepia(.35) hue-rotate(55deg) saturate(1.2) brightness(.82) contrast(1.25)'],
  ungoliant: ['shelob', 0.46, 'grayscale(.8) brightness(.5) contrast(1.5) sepia(.4) hue-rotate(225deg) saturate(2.2)'], spartoi: ['skeleton_archer', 1.05, 'sepia(.55) saturate(1.2) brightness(.92)'],
  necromancer: ['kaspar', 0.78, 'grayscale(1) brightness(.62) contrast(1.5) sepia(.5) hue-rotate(225deg) saturate(2.6)'], merkyor: ['kaspar', 1.0, 'sepia(1) saturate(4) hue-rotate(-28deg) brightness(.95)'],
  elmore_mage: ['kaspar', 0.8, 'sepia(1) saturate(2.4) hue-rotate(185deg) brightness(.95)'], ice_queen: ['kaspar', 1.3, 'grayscale(.4) sepia(.35) hue-rotate(165deg) saturate(1.6) brightness(1.35) contrast(1.05)'],
  ettin: ['king_bugbear', 1.18, 'grayscale(.45) sepia(.25) hue-rotate(175deg) saturate(.9) brightness(.95) contrast(1.1)'], ice_golem: ['ogre', 0.62, 'grayscale(1) brightness(1.55) contrast(1.15) sepia(.3) hue-rotate(160deg) saturate(2.2)'],
  sabertooth: ['cerberus', 1.12, 'grayscale(1) brightness(1.6) contrast(1.2) sepia(.15)'],
  balthazar: ['kaspar', 1.02, 'sepia(1) saturate(2.2) hue-rotate(-8deg) brightness(.72) contrast(1.1)'], sema: ['kaspar', 0.98, 'sepia(1) saturate(3) hue-rotate(58deg) brightness(.98)'] };
for (const k in MS_ALIAS) if (!MSHEET[k]) { const [src, sc, tint] = MS_ALIAS[k], M = MSHEET[src]; MSHEET[k] = { ...M, s: M.s * sc, hh: Math.round(M.hh * sc), hw: Math.round(M.hw * sc), src, tint }; }
// 선공 몬스터(먼저 덤비는 몹, 보스 제외)는 1.3배 크게 그려 멀리서도 잘 보이게
const AGGR_SC = 1.3; for (const k in MOB) { const S = MOB[k]; if (!S.aggr || S.boss || S.pet) continue; S.sc = (S.sc || 1) * AGGR_SC; if (S.hw) S.hw = Math.round(S.hw * AGGR_SC); if (S.hh) S.hh = Math.round(S.hh * AGGR_SC); const M = MSHEET[k]; if (M) { M.s *= AGGR_SC; if (M.hh) M.hh = Math.round(M.hh * AGGR_SC); if (M.hw) M.hw = Math.round(M.hw * AGGR_SC); } }
// v107: 본토던전 몬스터가 너무 커서 캐릭터 크기에 맞춤 — [그림 배율, 이름 높이] (화면 키: 기사 81 · 스파토이 88 · 네크로맨서 90 · 킹 버그베어 96 · 켈베로스 76 · 데스나이트 126)
const SIZE_FIX = { spartoi: [0.473, 85], necromancer: [0.425, 91], dg_kbugbear: [0.706, 82], dg_cerberus: [0.745, 63], deathknight: [1, 124] };
for (const k in SIZE_FIX) { const M = MSHEET[k], S = MOB[k]; if (!M || !S) continue; const [f, hh] = SIZE_FIX[k]; M.s *= f; M.hh = hh; if (M.hw) M.hw = Math.max(18, Math.round(M.hw * f)); S.sc = (S.sc || 1) * f; }
const MIMG = {}; for (const k in MSHEET) { MIMG[k] = {}; for (const a of ['idle', 'walk', 'attack']) { const i = new Image(); i.src = `assets/classic/mon_${MSHEET[k].src || k}_${a}.webp`; i.decode && i.decode().catch(() => {}); MIMG[k][a] = i; }
  Object.assign(MOB[k], { art0: MOB[k].art, art: 'sheet', hh: MSHEET[k].hh, hw: MSHEET[k].hw }); }
const ATK_T = 0.8 / 0.7;   // 몬스터 공격 동작 길이(초)
const rint = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1));
let UIDN = 0; const newUid = () => 10000 + Math.floor(Math.random() * 80000) * 10 + (UIDN++ % 10);
// 몬스터의 마나 (마나 지팡이로 빨아들일 수 있는 총량): 기본 = 4 + 레벨×0.5 → 유형 배율 (보스 ×5 · 마법형 ×2 · 인간형 ×1 · 짐승·곤충 ×0.6 · 언데드 ×0.5 · 골렘 ×0.3) · 다시 태어나면 채워짐
const MANA_BEAST = new Set(['fox', 'spider', 'ant', 'scorpion']), MANA_BEAST_K = /cerberus|werewolf|sabertooth|basilisk|doberman|ungoliant|shelob|ant\b|_ant|scorpion/;
function mobManaType(kind) { const S = MOB[kind] || {}; if (S.boss) return ['보스', 5]; if (S.spell || S.fireball || /마법사|주술|네크로/.test(S.name || '')) return ['마법형', 2]; if (S.undead) return ['언데드', 0.5]; if (/golem/.test(kind)) return ['골렘', 0.3]; if (MANA_BEAST.has(S.art0 || S.art) || MANA_BEAST_K.test(kind)) return ['짐승·곤충', 0.6]; return ['인간형', 1]; }
function mobMana(kind) { const S = MOB[kind] || {}; return Math.max(1, Math.round((4 + (S.lv || 1) * 0.5) * mobManaType(kind)[1])); }
function mkMob(kind, i, j) { const e = mk('fox', i, j); e.kind = kind; e.hp = e.max = MOB[kind].hp; e.uid = newUid(); e.mpLeft = mobMana(kind); return e; }
const GEO0 = { ax: G.ax, ay: G.ay, W: G.W, H: G.H };
function setGeom(N) { MAP = N; if (N === 30) Object.assign(G, GEO0); else Object.assign(G, { ax: N * K + 24, ay: 24, W: 2 * N * K + 48, H: N * K + 48 }); }
const arrows = [];
function heroMiss() { const [hx, hy] = W2P(hero.x, hero.z); floatText(hx, hy - 96, 'MISS', { color: '#9fd0ff', size: 11 }); }
function hurtHero(d, src, kind) { if (src && typeof src === 'object') src.hitMeT = time; if (GOD_INV) { const [hx, hy] = W2P(hero.x, hero.z); floatText(hx, hy - 96, '무적', { color: '#f2d98a', size: 11 }); return; } const magic = kind === 'magic' || !src; if (magic && BUFF.counterm > 0) { BUFF.counterm = 0; const [hx, hy] = W2P(hero.x, hero.z); floatText(hx, hy - 100, '카운터 매직!', { color: '#d8a8ff', size: 14, big: true }); spellFx('aura', hero, '#d8a8ff'); say('카운터 매직이 마법 공격을 막았습니다! (효과 끝)', '#d8a8ff'); return; } if (!magic) { const A = INV.ac(); if (A < 0) d = Math.max(1, d - Math.floor(Math.random() * (Math.floor(-A / 3) + 1))); } if (BUFF.reduction > 0) d = Math.max(1, Math.round(d * 0.75)); if (BUFF.immune > 0) d = Math.max(1, Math.round(d * 0.7));   // 이뮨 투 함: 30% 감소
    // AC 피해 감소: 0~(−AC÷3) 무작위 (마법은 AC 무시) · 리덕션 아머 25% 감소
  { const MS = src && MOB[src.kind]; if (kind === 'melee') d -= INV.cx('drMelee'); d -= INV.cx('dr');   // 장비: 받는 피해 감소 · 근접 피해 감소
    if (magic) d = Math.round(d * (1 - Math.min(0.5, mrTotal() / 200)));   // 보스 범위 공격·거미줄 같은 마법 피해: MR로 감소 (MR 100 = 절반)
    { const el = MS && (MS.el || (MS.fire ? 'fire' : null)); if (el) d = Math.round(d * (1 - Math.min(0.6, elemRes(el) / 100))); } d = Math.max(1, d); }   // 화염 저항: 불 몬스터 피해 감소
  if (BUFF.counter > 0 && src && !src.dead) { const rd = Math.max(1, Math.round(d * 0.3)); setTimeout(() => mobHurt(src, rd, '#c9a0ff'), 120); }
  hero.hp -= d; TELE.hurt(src && src.kind || kind || 'etc', d); { const [hx, hy] = W2P(hero.x, hero.z); floatText(hx, hy - 96, String(d), { color: '#ff5a4a', size: 12 }); } hurt = 0.25; sfx.bite(); hitstop = Math.max(hitstop, 0.04);
  if (hero.hp <= 0) { TELE.ev('death', { by: src && src.kind || kind || '?', z: zoneTitle(), lv: hero.lv, d }); hero.hp = Math.ceil(hero.max * 0.5); hero.target = null; say('당신은 쓰러졌습니다... 마을에서 깨어납니다.', '#f08a7a'); AUTO.died(); TOWN.goTown(); } }
function shoot(f, S, TG) { TG = TG || hero; if (TG === hero) f.hitMeT = time; const [x0, y0] = W2P(f.x, f.z), [x1, y1] = W2P(TG.x, TG.z); arrows.push({ kind: S.fireball ? 'fireball' : 'arrow', x0, y0: y0 - (S.fireball ? 44 : 30), x1, y1: y1 - (TG === hero ? 30 : 16), t: 0, dur: (S.fireball ? 0.22 : 0.12) + cheb(f.i, f.j, TG.i, TG.j) * (S.fireball ? 0.1 : 0.07), dmg: mobDmg(S), hit: (S.fireball ? mobHitM(S) : mobHit(S)) - (f.hitDn > 0 ? 0.03 * (f.hitDnV || 2) : 0), src: f, tg: TG === hero ? null : TG }); }
function spotNear(ci, cj, r) { for (let t = 0; t < 60; t++) { const i = ci + Math.round((Math.random() * 2 - 1) * r), j = cj + Math.round((Math.random() * 2 - 1) * r); if (walkable(i, j) && !occ(i, j) && cheb(i, j, hero.i, hero.j) >= 6) return [i, j]; } return null; }
// 몬스터 그림: 정식 모델이 나오기 전까지 주민·여우 그림을 색만 바꿔 임시로 씀
const TINT = {};
function tinted(kind, anim) { const S = MOB[kind], key = kind + anim; if (TINT[key]) return TINT[key];
  const src = S.art === 'fox' ? im['fox_' + anim] : im['villager_m_' + anim]; if (!src || !src.complete || !src.naturalWidth) return null;
  const k = S.art === 'fox' ? 1 : 0.5, c = document.createElement('canvas'); c.width = Math.round(src.naturalWidth * k); c.height = Math.round(src.naturalHeight * k);
  const g = c.getContext('2d'); if (S.tint) g.filter = S.tint; g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, c.width, c.height); c.complete = true; return (TINT[key] = c); }
// 개미: 다리 6개 · 마디 몸통 · 큰 턱 (불개미는 붉은 빛, 여왕은 2.5배 + 날개 자국)
function drawAnt(g, x, y, f) { const S = MOB[f.kind], sc = S.sc || 1, mv = f.t < 1, t = time * (mv ? 10 : 2.2), [c1, c2] = S.body; const d = DIRV[f.row] || [1, 0], fx = (d[0] - d[1]), fy = (d[0] + d[1]) * 0.5, L = Math.hypot(fx, fy) || 1, ux = fx / L, uy = fy / L;
  g.save(); g.translate(x, y); g.scale(sc, sc); g.fillStyle = 'rgba(0,0,0,.33)'; g.beginPath(); g.ellipse(0, 1, 24, 9, 0, 0, 7); g.fill(); if (f.flash > 0) g.filter = 'brightness(2.4) saturate(0)';
  const P = k => [ux * k, uy * k - 12]; const [hx, hy] = P(13), [tx, ty] = P(0), [ax, ay] = P(-13);
  g.strokeStyle = c2; g.lineCap = 'round'; g.lineWidth = 2.2;
  for (let s = -1; s <= 1; s += 2) for (let k = 0; k < 3; k++) { const ph = Math.sin(t + k * 2.1 + (s > 0 ? 0 : 1.05)) * (mv ? 1 : 0.3), bx = tx + ux * (k - 1) * 4, by = ty + uy * (k - 1) * 4, nx = -uy * s, ny = ux * s;
    const kx = bx + nx * 11 + ux * (k - 1) * 5 + ux * ph * 3, ky = by + ny * 6 - 7, ex = bx + nx * 18 + ux * ((k - 1) * 8 + ph * 5), ey = by + ny * 9 + 10;
    g.beginPath(); g.moveTo(bx, by); g.lineTo(kx, ky); g.lineTo(ex, ey); g.stroke(); }
  const body = (cx, cy, rx, ry) => { const gr = g.createRadialGradient(cx - 3, cy - 4, 1, cx, cy, Math.max(rx, ry)); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, rx, ry, Math.atan2(uy, ux), 0, 7); g.fill(); };
  body(ax, ay - 1, S.queen ? 14 : 11, S.queen ? 10 : 8); body(tx, ty - 2, 7, 5.5); body(hx, hy - 2, 6.5, 5.5);
  if (S.queen) { g.fillStyle = 'rgba(220,210,180,.35)'; for (let s = -1; s <= 1; s += 2) { g.beginPath(); g.ellipse(tx - uy * s * 9, ty - 8, 12, 4, Math.atan2(uy, ux) + s * 0.9, 0, 7); g.fill(); } }
  g.strokeStyle = c2; g.lineWidth = 1.8; for (let s = -1; s <= 1; s += 2) { const mx = hx + ux * 5, my = hy - 2 + uy * 3; g.beginPath(); g.moveTo(mx - uy * s * 2, my); g.quadraticCurveTo(mx + ux * 6 - uy * s * 5, my + uy * 6 - 1, mx + ux * 3 + uy * s * 1, my + uy * 3 + 2); g.stroke();
    g.lineWidth = 1; g.beginPath(); g.moveTo(hx, hy - 6); g.quadraticCurveTo(hx - uy * s * 6, hy - 16, hx + ux * 6 - uy * s * 9, hy - 18); g.stroke(); g.lineWidth = 1.8; }
  g.fillStyle = S.fire ? '#ffb040' : '#d8c890'; for (let s = -1; s <= 1; s += 2) { g.beginPath(); g.arc(hx + ux * 2 - uy * s * 3, hy - 4, 1.2, 0, 7); g.fill(); }
  if (S.fire) { g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(ax, ay, 0, ax, ay, 16); gr.addColorStop(0, `rgba(255,140,40,${0.35 + 0.15 * Math.sin(time * 6)})`); gr.addColorStop(1, 'rgba(255,80,20,0)'); g.fillStyle = gr; g.beginPath(); g.arc(ax, ay, 16, 0, 7); g.fill(); }
  g.restore(); }
// 전갈: 다리 8개 · 집게 2개 · 말려 올라간 꼬리와 독침 (모래빛)
function drawScorpion(g, x, y, f) { const mv = f.t < 1, t = time * (mv ? 9 : 2), d = DIRV[f.row] || [1, 0], fx = (d[0] - d[1]), fy = (d[0] + d[1]) * 0.5, L = Math.hypot(fx, fy) || 1, ux = fx / L, uy = fy / L, a = Math.atan2(uy, ux);
  g.save(); g.translate(x, y); g.fillStyle = 'rgba(0,0,0,.33)'; g.beginPath(); g.ellipse(0, 1, 26, 9, 0, 0, 7); g.fill(); if (f.flash > 0) g.filter = 'brightness(2.4) saturate(0)';
  const c1 = '#c89a5a', c2 = '#5a3a1a'; g.strokeStyle = c2; g.lineCap = 'round'; g.lineWidth = 2;
  for (let s = -1; s <= 1; s += 2) for (let k = 0; k < 4; k++) { const ph = Math.sin(t + k * 1.6 + (s > 0 ? 0 : 0.8)) * (mv ? 1 : 0.25), bx = ux * (4 - k * 4), by = uy * (4 - k * 4) - 8, nx = -uy * s, ny = ux * s;
    g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + nx * 10 + ux * ph * 3, by + ny * 5 - 6); g.lineTo(bx + nx * 17 + ux * (ph * 5 - k * 2), by + ny * 8 + 8); g.stroke(); }
  const gr = g.createRadialGradient(-2, -12, 1, 0, -8, 16); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.beginPath(); g.ellipse(0, -8, 15, 9, a, 0, 7); g.fill();
  g.lineWidth = 2.6; for (let s = -1; s <= 1; s += 2) { const nx = -uy * s, ny = ux * s, sx = ux * 12 + nx * 5, sy = uy * 12 - 8 + ny * 3, ex = sx + ux * 9 + nx * 4, ey = sy + uy * 6 + ny * 2;
    g.strokeStyle = c2; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke(); g.fillStyle = c1; g.beginPath(); g.ellipse(ex + ux * 4, ey + uy * 3, 5, 3, a + s * 0.3, 0, 7); g.fill(); g.stroke(); }
  const sw = Math.sin(time * 3 + f.hi) * 0.15 + (f.lunge > 0 ? 0.5 : 0); let px = -ux * 14, py = -uy * 14 - 9; g.strokeStyle = c2; g.lineWidth = 4.5;
  g.beginPath(); g.moveTo(px, py); for (let k = 1; k <= 5; k++) { const th = k * 0.55 + sw; px += -ux * 6 * Math.cos(th); py += -uy * 3 * Math.cos(th) - 6 * Math.sin(th); g.lineTo(px, py); } g.stroke(); g.strokeStyle = c1; g.lineWidth = 2.5; g.stroke();
  g.fillStyle = '#2a1a0a'; g.beginPath(); g.moveTo(px, py); g.lineTo(px + ux * 7, py + 5); g.lineTo(px + ux * 2, py + 2); g.closePath(); g.fill();
  g.restore(); }
function drawSpider(g, x, y, f) { const t = time * (f.t < 1 ? 9 : 2.5); g.save(); g.translate(x, y);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(0, 2, 48, 18, 0, 0, 7); g.fill();
  if (f.flash > 0) g.filter = 'brightness(2.4) saturate(0)';
  g.strokeStyle = '#17110d'; g.lineCap = 'round'; g.lineJoin = 'round';
  for (let s = -1; s <= 1; s += 2) for (let k = 0; k < 4; k++) { const ph = Math.sin(t + k * 1.3 + (s > 0 ? 0 : 1.6));
    const bx = s * 6, by = -24 + k * 4, kx = s * (24 + k * 4), ky = -46 + k * 8 + ph * 4, ex = s * (40 + k * 5) + ph * 3 * s, ey = -2 + k * 5;
    g.lineWidth = 4.5 - k * 0.4; g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + (kx - bx) * 0.4, ky - 10, kx, ky); g.lineTo(ex, ey); g.stroke(); }
  const gr = g.createRadialGradient(8, -38, 3, 10, -30, 30); gr.addColorStop(0, '#6a5646'); gr.addColorStop(1, '#120d0a');
  g.fillStyle = gr; g.beginPath(); g.ellipse(12, -32, 27, 21, -0.3, 0, 7); g.fill();
  g.fillStyle = 'rgba(170,40,28,.75)'; g.beginPath(); g.ellipse(16, -38, 9, 5, -0.3, 0, 7); g.fill(); g.fillRect(12, -30, 8, 2);
  g.fillStyle = '#21180f'; g.beginPath(); g.ellipse(-12, -22, 14, 11, 0, 0, 7); g.fill();
  g.fillStyle = '#ff3020'; for (const [a, b] of [[-19, -25], [-14, -27], [-9, -25], [-16, -21], [-11, -21]]) { g.beginPath(); g.arc(a, b, 1.6, 0, 7); g.fill(); }
  g.restore(); }
function portalFx(g, x, y, label) { const p = 0.5 + 0.5 * Math.sin(time * 2.4); g.save(); g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(x, y, 2, x, y, 34); gr.addColorStop(0, `rgba(140,190,255,${0.55 + 0.25 * p})`); gr.addColorStop(1, 'rgba(90,140,255,0)');
  g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, 34, 17, 0, 0, 7); g.fill(); g.strokeStyle = `rgba(200,225,255,${0.6 + 0.3 * p})`; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y, 22, 11, 0, 0, 7); g.stroke(); g.restore();
  g.font = '700 10px "Noto Sans KR",sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(0,0,0,.85)'; g.fillText(label, x + 1, y - 29); g.fillStyle = '#bcd4ff'; g.fillText(label, x, y - 30); }

// ============================================================ 본토던전 공통: 미로 시야(벽에 가려지면 못 봄) · 미로 길찾기(거리장) · 벽·계단·횃불 그림 · 몬스터 마법 · 변신
const MAZE = () => !!(ISLE && ISLE.def && ISLE.def.maze);
// 벽 시야: 두 칸 사이 직선에 벽 칸이 있으면 안 보임 (몬스터·사람은 시야를 안 막음)
function DGLOS(a, b) { if (!MAZE()) return true; const i0 = a.i, j0 = a.j, i1 = b.i, j1 = b.j, n = Math.ceil(Math.hypot(i1 - i0, j1 - j0) * 3); const B = ISLE.blocked;
  for (let k = 1; k < n; k++) { const x = Math.floor(i0 + 0.5 + (i1 - i0) * k / n), y = Math.floor(j0 + 0.5 + (j1 - j0) * k / n); if ((x !== i0 || y !== j0) && (x !== i1 || y !== j1) && B[y] && B[y][x]) return false; } return true; }
// 거리장: 목표 칸에서 모든 칸까지의 걸음 수 (벽만 피함, 대각선은 모서리를 못 자름) — 최근 8개 기억
const DGF = (() => { const C = new Map();
  function field(ti, tj) { const N = MAP, key = (ISLE ? ISLE.id : 0) + ':' + ti + ',' + tj; let F = C.get(key); if (F) { C.delete(key); C.set(key, F); return F; }
    F = new Int16Array(N * N).fill(-1); if (ti < 0 || tj < 0 || ti >= N || tj >= N) return F; const q = new Int32Array(N * N); let h = 0, t = 0; F[tj * N + ti] = 0; q[t++] = tj * N + ti;
    const ok = (i, j) => i >= 0 && j >= 0 && i < N && j < N && !blockedT[j][i];
    while (h < t) { const k = q[h++], i = k % N, j = (k / N) | 0, d = F[k] + 1; for (const [di, dj] of DIRS8) { const a = i + di, b = j + dj; if (!ok(a, b) || F[b * N + a] >= 0) continue; if (di && dj && (!ok(i + di, j) || !ok(i, j + dj))) continue; F[b * N + a] = d; q[t++] = b * N + a; } }
    C.set(key, F); if (C.size > 8) C.delete(C.keys().next().value); return F; }
  return { field, clear: () => C.clear() }; })();
// 미로에서 한 걸음: 목표까지 거리가 줄어드는 이웃 칸 (막혔으면 기다림) — astar와 같은 꼴 [[i,j]]
function mzPath(e, ti, tj) { const N = MAP, F = DGF.field(ti, tj), cur = F[e.j * N + e.i]; if (cur < 0) return []; let best = null, bd = cur;
  for (const [di, dj] of DIRS8) { const a = e.i + di, b = e.j + dj; if (a < 0 || b < 0 || a >= N || b >= N) continue; const d = F[b * N + a]; if (d < 0 || d >= bd && !(d === bd && best && Math.random() < 0.3)) continue;
    if (di && dj && (!walkable(e.i + di, e.j) || !walkable(e.i, e.j + dj))) continue; const o = occ(a, b); if (o && o !== e && !(e === hero && o.isPet)) continue; if (d < bd || !best) { bd = d; best = [a, b]; } }
  return best && bd < cur ? [best] : []; }

// ---------- 벽: 돌 벽돌 블록 (위·왼쪽·오른쪽 면) · 변형(이끼·핏자국·금·해골 감실·쇠사슬) · 기둥
const DGWH = 66;   // 벽 높이(px)
const DGWC = {};
function dgRand(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function dgWallImg(v, floor) { const key = v + ':' + floor; if (DGWC[key]) return DGWC[key]; const W = Math.ceil(2 * K) + 4, H = Math.ceil(K + DGWH) + 4, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), R = dgRand(1000 + v * 97 + floor * 13), cx = W / 2, top = 2, h = DGWH;   // 블록 위 꼭짓점 (cx, top) · 바닥 마름모 꼭짓점 아래로 h
  const T = [cx, top], Rr = [cx + K, top + K / 2], Bt = [cx, top + K], L = [cx - K, top + K / 2];
  const base = floor === 2 ? [52, 46, 52] : [58, 52, 46];   // 2층은 조금 더 차갑고 붉은 기
  const face = (o, ax, shade) => { g.save(); g.transform(ax[0], ax[1], 0, h, o[0], o[1]); g.beginPath(); g.rect(0, 0, 1, 1); g.clip();   // (u, v) 단위 사각형 → 면 (u: 가로, v: 아래로 h)
    const col = base.map(c0 => Math.round(c0 * shade)); g.fillStyle = `rgb(${col.map(c0 => Math.round(c0 * 0.45))})`; g.fillRect(0, 0, 1, 1);   // 줄눈(어두움)
    const rows = 6, cols = 3; for (let r = 0; r < rows; r++) for (let b = -1; b < cols; b++) { const off = (r % 2) * 0.5 / cols, u0 = b / cols + off, tone = 0.8 + R() * 0.34, cc = col.map(c0 => Math.min(255, Math.round(c0 * tone)));
      g.fillStyle = `rgb(${cc})`; g.fillRect(u0 + 0.014, r / rows + 0.012, 1 / cols - 0.028, 1 / rows - 0.026); if (R() < 0.25) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(u0 + 0.05 + R() * 0.15, r / rows + 0.04, 0.06, 0.05); } }
    const gr = g.createLinearGradient(0, 0, 0, 1); gr.addColorStop(0, 'rgba(255,240,220,.07)'); gr.addColorStop(0.6, 'rgba(0,0,0,.12)'); gr.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = gr; g.fillRect(0, 0, 1, 1); g.restore(); };
  const down = ([x, y]) => [x, y + h];
  face(L, [K, K / 2], 0.6);      // 왼쪽(남서) 면: 어두움
  face(Bt, [K, -K / 2], 0.82);   // 오른쪽(남동) 면
  // 윗면: 갓돌
  g.save(); g.beginPath(); [T, Rr, Bt, L].forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fillStyle = `rgb(${base.map(c0 => Math.round(c0 * 1.05))})`; g.fill();
  g.clip(); for (let q = 0; q < 14; q++) { g.fillStyle = `rgba(${R() < 0.5 ? '255,240,220' : '0,0,0'},${0.05 + R() * 0.08})`; g.beginPath(); g.ellipse(cx + (R() - 0.5) * K * 1.4, top + K / 2 + (R() - 0.5) * K * 0.6, 3 + R() * 6, 1.5 + R() * 3, 0, 0, 7); g.fill(); } g.restore();
  g.strokeStyle = 'rgba(150,135,115,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(...L); g.lineTo(...Bt); g.lineTo(...Rr); g.stroke();   // 모서리 빛
  g.strokeStyle = 'rgba(0,0,0,.6)'; g.beginPath(); g.moveTo(...Bt); g.lineTo(...down(Bt)); g.stroke();
  const onL = (u, vv) => [L[0] + (Bt[0] - L[0]) * u, L[1] + (Bt[1] - L[1]) * u + h * vv], onR = (u, vv) => [Bt[0] + (Rr[0] - Bt[0]) * u, Bt[1] + (Rr[1] - Bt[1]) * u + h * vv];
  if (v === 1 || v === 5) { for (let q = 0; q < 22; q++) { const [x, y] = (R() < 0.5 ? onL : onR)(R(), 0.55 + R() * 0.45); g.fillStyle = `rgba(${40 + R() * 30 | 0},${70 + R() * 40 | 0},${30 + R() * 20 | 0},${0.35 + R() * 0.3})`; g.beginPath(); g.ellipse(x, y, 2 + R() * 4, 1 + R() * 2, 0, 0, 7); g.fill(); } }   // 이끼
  if (v === 2 || v === 5) { for (let q = 0; q < 3; q++) { const side = R() < 0.5 ? onL : onR, u = 0.15 + R() * 0.7, [x, y] = side(u, 0.1 + R() * 0.3), len = 14 + R() * 30; const gr = g.createLinearGradient(x, y, x, y + len); gr.addColorStop(0, 'rgba(110,12,10,.85)'); gr.addColorStop(1, 'rgba(60,6,6,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x - 2.5, y); g.quadraticCurveTo(x - 1, y + len * 0.6, x, y + len); g.quadraticCurveTo(x + 1, y + len * 0.6, x + 2.5, y); g.fill(); g.fillStyle = 'rgba(90,8,8,.8)'; g.beginPath(); g.ellipse(x, y, 4, 2.2, 0, 0, 7); g.fill(); } }   // 핏자국 흘러내림
  if (v === 3) { g.strokeStyle = 'rgba(12,10,10,.8)'; g.lineWidth = 1.2; for (let q = 0; q < 2; q++) { const side = R() < 0.5 ? onL : onR; let [x, y] = side(0.2 + R() * 0.6, 0.15 + R() * 0.2); g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 6; s++) { x += (R() - 0.5) * 7; y += 4 + R() * 5; g.lineTo(x, y); } g.stroke(); } }   // 금
  if (v === 4) { const [x, y] = onR(0.5, 0.45); g.fillStyle = 'rgba(8,6,6,.9)'; g.beginPath(); g.ellipse(x, y, 7, 9, -0.45, 0, 7); g.fill(); g.fillStyle = '#c8bca0'; g.beginPath(); g.arc(x, y + 2, 4.2, 0, 7); g.fill(); g.fillStyle = '#100c0a'; g.fillRect(x - 2.6, y + 1, 1.8, 1.8); g.fillRect(x + 0.8, y + 1, 1.8, 1.8); }   // 해골 감실
  if (v === 6) { g.strokeStyle = 'rgba(70,64,60,.95)'; g.lineWidth = 1.6; for (const u of [0.35, 0.65]) { const [x, y] = onL(u, 0.12); g.beginPath(); for (let s = 0; s < 7; s++) g.ellipse(x, y + s * 4.2, 1.6, 2.2, 0, 0, 7); g.stroke(); } }   // 쇠사슬
  if (v === 7) { g.clearRect(0, 0, W, H); const w2 = K * 0.62, pc = [cx, top + K / 2];   // 기둥 (방 가운데)
    for (const [sx, sh] of [[-1, 0.6], [1, 0.82]]) { g.fillStyle = `rgb(${base.map(c0 => Math.round(c0 * sh))})`; g.beginPath(); g.moveTo(pc[0], pc[1] + w2 * 0.5); g.lineTo(pc[0] + sx * w2, pc[1]); g.lineTo(pc[0] + sx * w2, pc[1] + h); g.lineTo(pc[0], pc[1] + h + w2 * 0.5); g.closePath(); g.fill(); }
    g.fillStyle = `rgb(${base.map(c0 => Math.round(c0 * 1.1))})`; g.beginPath(); g.moveTo(pc[0], pc[1] - w2 * 0.5); g.lineTo(pc[0] + w2, pc[1]); g.lineTo(pc[0], pc[1] + w2 * 0.5); g.lineTo(pc[0] - w2, pc[1]); g.closePath(); g.fill();
    for (const yy of [6, h - 6]) { g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(pc[0] - w2, pc[1] + yy); g.lineTo(pc[0], pc[1] + yy + w2 * 0.5); g.lineTo(pc[0] + w2, pc[1] + yy); g.stroke(); } }
  c.ax = cx; c.ay = top + K / 2 + h;   // 기준점: 칸 가운데 바닥
  return DGWC[key] = c; }
// 벽 그리기: 앞쪽(화면 아래)에 있어 캐릭터를 가리는 벽은 반투명 · 횃불은 불꽃 + 빛
function dgDrawWall(g, p, x, y) { const img = dgWallImg(p.pillar ? 7 : p.v, ISLE.def.floor || 1), di = p.i - hero.i, dj = p.j - hero.j;
  const front = di + dj > 0 && di + dj <= 7 && Math.abs(di - dj) <= 6 && di >= -1 && dj >= -1;   // 내 앞(아래쪽)의 가까운 벽
  g.save(); if (front) g.globalAlpha = 0.22 + 0.1 * Math.min(1, Math.max(0, (di + dj - 2) / 5)); g.drawImage(img, Math.round(x - img.ax), Math.round(y - img.ay)); g.restore();
  if (p.torch) dgTorch(g, p, x, y, front); }
function dgTorch(g, p, x, y, faded) { const L = p.torch === 'L', fx = x + (L ? -K * 0.5 : K * 0.5), fy = y + (L ? K * 0.25 : K * 0.25) - DGWH * 0.62, fl = 1 + Math.sin(time * 13 + p.i) * 0.12 + Math.sin(time * 23 + p.j) * 0.08;
  g.save(); if (faded) g.globalAlpha = 0.4; g.fillStyle = '#2a1e14'; g.fillRect(Math.round(fx - 1.5), Math.round(fy), 3, 11); g.fillStyle = '#5a4630'; g.fillRect(Math.round(fx - 3), Math.round(fy + 8), 6, 2);
  g.globalCompositeOperation = 'lighter'; mxG(g, '255,140,50', fx, fy - 2, 34 * fl, 0.55); for (const [c, w, hh] of [['rgba(255,90,20,.9)', 4.5, 10], ['rgba(255,190,70,.95)', 3, 7], ['rgba(255,250,210,.95)', 1.5, 3.5]]) { g.fillStyle = c; g.beginPath(); g.ellipse(fx, fy - hh * fl * 0.55, w, hh * fl * 0.6, 0, 0, 7); g.fill(); } g.restore();
  if (Math.random() < 0.08) parts.push({ x: fx + (Math.random() - 0.5) * 4, y: fy - 8, vx: (Math.random() - 0.5) * 8, vy: -24 - Math.random() * 18, life: 0.8, max: 0.8, ember: true });
  if (MXLIT.length < 40) MXLIT.push({ x: fx, y: fy + 14, r: 120 * fl, a: 0.72 }); }
// 계단: 내려가는 계단(어둠 속으로 꺾여 내려감) · 올라가는 계단(위로 빛)
function dgStairs(g, x, y, p) { const down = p.stairs === 'down', pulse = 0.5 + 0.5 * Math.sin(time * 2.2); g.save();
  const st = 6; for (let s = 0; s < st; s++) { const k = s / st, w = K * (1.15 - k * 0.5), yy = y - K * 0.35 + (down ? s * 4.2 : -s * 5.5), sh = down ? 0.75 - k * 0.6 : 0.55 + k * 0.35;
    g.fillStyle = `rgb(${Math.round(92 * sh)},${Math.round(84 * sh)},${Math.round(76 * sh)})`; g.beginPath(); g.moveTo(x - w, yy); g.lineTo(x, yy - w * 0.5); g.lineTo(x + w, yy); g.lineTo(x, yy + w * 0.5); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1; g.stroke(); }
  if (down) { const gr = g.createRadialGradient(x, y + 18, 2, x, y + 18, K * 0.9); gr.addColorStop(0, 'rgba(0,0,0,.95)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y + 18, K * 0.9, K * 0.45, 0, 0, 7); g.fill(); }
  g.globalCompositeOperation = 'lighter'; mxG(g, down ? '255,120,70' : '150,190,255', x, y - 6, 46 + pulse * 10, 0.35 + pulse * 0.2, 0.55);
  for (let q = 0; q < 5; q++) { const ph = (time * 0.6 + q / 5) % 1; g.globalAlpha = Math.sin(ph * Math.PI) * 0.8; g.fillStyle = down ? '#ffb080' : '#c8dcff'; g.fillRect(x + Math.sin(q * 2.3) * K * 0.5, y - 4 + (down ? ph * 14 : -ph * 30), 2, 2); }
  g.restore(); g.save(); g.font = '800 11px "Noto Sans KR",sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.85)'; g.strokeText(p.label, x, y - 40); g.fillStyle = down ? '#ffc0a0' : '#c8dcff'; g.fillText(p.label, x, y - 40); g.restore();
  if (MXLIT.length < 40) MXLIT.push({ x, y: y - 10, r: 110, a: 0.6 }); }

// ---------- 몬스터 마법 (카스파 패밀리·네크로맨서): 연출은 마법 연출(mx)로, 피해는 맞을 때 (AC 무시 · MR·속성 저항으로 감소)
function mobSpellHit(f, S, T, mul = 1, extra) { if (T === hero) { if (hero.hp <= 0 || SCENE === 'town') return; if (Math.random() < mobHitM(S)) { hurtHero(Math.round(rint(S.dmg) * mul), f, 'magic'); if (extra) extra(); } else heroMiss(); }
  else if (T.isRemote) NET.hitRemote(T, f, S); else if (T.isPet && !T.dead) PET.hurt(T, Math.round(rint(S.dmg) * mul), f); }
function mobCast(f, S, T) { T = T || hero; const [x0, y0] = W2P(f.x, f.z), d = Math.max(1, Math.hypot(T.x - f.x, T.z - f.z)), sp = S.spell;
  const bolt = (id, kind, k = 1, onHit) => BOLTS.push({ x0, y0: y0 - Math.min(80, mxH(f) * 0.7), f: T, t: 0, dur: (0.24 + d * 0.05) * k, kind, id, cos: true, onHit });
  if (sp === 'water') bolt('icedagger', 'ice', 0.85, () => mobSpellHit(f, S, T, 1, () => { if (!GOD_INV && Math.random() < 0.3) BUFF.slow = Math.max(BUFF.slow, 1.5); }));
  else if (sp === 'fire') bolt('fball', 'fball', 1.2, () => { mobSpellHit(f, S, T, 1, () => { if (!GOD_INV && Math.random() < 0.3 * Math.max(0.2, 1 - elemRes('fire') / 50)) { hero.burnT = 3; say('불덩이에 화상을 입었습니다!', '#ff9a5a'); } }); });
  else if (sp === 'wind') bolt('wind', 'bolt', 0.7, () => mobSpellHit(f, S, T, 1, () => { if (!GOD_INV && Math.random() < 0.35) BUFF.slow = Math.max(BUFF.slow, 2); }));
  else if (sp === 'earth') { mxHit('rock', T); setTimeout(() => mobSpellHit(f, S, T), 180); }
  else if (sp === 'necro') AOES.push({ kind: 'mag', c: '170,90,255', x: T.x, z: T.z, r: 1.35, warn: 0.85, t: 0, life: 1.1, landed: false, dmg: S.dmg.map(v => Math.round(v / BOSS_MAGIC)), quiet: true, onLand: DG_LAND.dark });   // 저주 폭발: 보라 범위를 피하면 안 맞음
  mxCast(MOB_CAST_ID[sp] || 'ebolt', f, true); }
const MOB_CAST_ID = { water: 'icedagger', fire: 'fball', wind: 'decwt', earth: 'eruption', necro: 'slow' };
// 범위 마법(미리 표시 → 후판정)용 연출: 떨어질 때
const DG_LAND = {
  frost: a => { mxHit('coc', mxAt(a.x, a.z, 40)); },
  fire: a => { mxHit('fball', mxAt(a.x, a.z, 40)); },
  quake: a => { mxHit('eruption', mxAt(a.x, a.z, 40)); },
  wind: a => { const e = mxAt(a.x, a.z, 50); mxAdd('windring', e, { life: 1.0, c: '170,255,220' }); mxAdd('ring', e, { gnd: 1, c: '190,255,225', r0: 8, r1: 70, w: 4, life: 0.6 }); const [x, y] = W2P(a.x, a.z); mxBurst(x, y - 20, 18, () => ({ k: 'leaf', c: Math.random() < 0.5 ? '150,230,160' : '200,255,210', s: mxR(3, 5), vr: mxR(-8, 8), life: mxR(0.7, 1.1), dr: 1.2 }), 80, 200, 60); shake = Math.max(shake, 0.12); },
  blizzard: a => { const e = mxAt(a.x, a.z, 40); mxAdd('blizzard', e, { life: Math.max(1, a.life - a.warn), r: a.r * K * 1.42 }); mxAdd('frost', e, { gnd: 1, r: a.r * K * 1.3, life: Math.max(1, a.life - a.warn) }); mxFlash('225,242,255', 0.16, 0.45); shake = Math.max(shake, 0.15); },
  dark: a => { const e = mxAt(a.x, a.z, 40); mxAdd('burst', e, { c: '140,60,220', l: '230,200,255', life: 0.6, r: 60, n: 12, hy: 22 }); mxAdd('ring', e, { gnd: 1, c: '170,90,255', r0: 8, r1: 64, w: 4, life: 0.6 }); mxAdd('clock', e, { gnd: 1, life: 0.9, r: 30 }); const [x, y] = W2P(a.x, a.z); mxBurst(x, y - 20, 16, () => ({ k: 'smoke', c: '50,20,70', s: mxR(6, 10), life: mxR(0.7, 1.1), dr: 2, a0: 0.5 }), 30, 90); mxBurst(x, y - 20, 14, () => ({ k: 'wisp', c: '200,160,255', s: mxR(2.5, 4), vy: -mxR(30, 70), life: mxR(0.8, 1.2), dr: 0.5 }), 10, 40); },
  hell: a => { const c = mxAt(a.x, a.z, 40); mxHit('fball', c); mxFlash('255,90,40', 0.3, 0.45); mxAdd('ring', c, { gnd: 1, c: '255,80,30', r0: 20, r1: a.r * K * 1.45, w: 6, life: 0.8 }); mxAdd('scorch', c, { gnd: 1, r: a.r * K * 1.2, life: 4 });
    for (let q = 0; q < 8; q++) { const an = q * 0.785 + Math.random() * 0.4, rr = a.r * (0.45 + Math.random() * 0.5); setTimeout(() => { const e = mxAt(a.x + Math.cos(an) * rr, a.z + Math.sin(an) * rr, 30); mxAdd('fballx', e, { life: 0.6, hy: 18 }); const [x, y] = W2P(e.x, e.z); mxBurst(x, y - 14, 10, () => ({ k: 'flame', s: mxR(6, 10), life: mxR(0.35, 0.6), dr: 2.5 }), 40, 130, 70); }, q * 60); }
    shake = Math.max(shake, 0.45); },
};

// ---------- 변신: 데스나이트 세트(투구·갑옷·장갑·장화)를 모두 입으면 데스나이트 모습 (기사 전용) · 나중에 변신 주문서도 같은 표로
const POLY = { deathknight: { name: '데스나이트', sheet: 'deathknight', s: 0.6, set: { helm: 'dk_helm', armor: 'dk_armor', gloves: 'dk_gloves', boots: 'dk_boots' } } };
function polyOf(eqf) { if (!eqf) return null; for (const k in POLY) { const st = POLY[k].set; if (Object.keys(st).every(sl => eqf(sl) === st[sl])) return k; } return null; }
function drawPoly(g, pk, anim, fr, row, x, y, hf) { const P = POLY[pk], M = MSHEET[P.sheet], I = MIMG[P.sheet]; if (!M || !I) return false; const a = anim === 'walk' ? 'walk' : (anim === 'attack' || anim === 'attack2' || anim === 'cast') ? 'attack' : 'idle', img = I[a];
  if (!img || !img.complete || !img.naturalWidth) return false; g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; drawSheet(g, img, { W: M.W, H: M.H, ax: M.ax, ay: M.ay, s: P.s }, Math.min(7, fr), row, x, y, 1, hf); g.restore();
  if (Math.random() < 0.18) mxP(x + mxR(-14, 14), y - mxR(0, 50), { k: 'ember', c: '255,110,50', s: 1.6, vy: -mxR(20, 50), vx: mxR(-8, 8), life: mxR(0.5, 0.9) });
  return true; }
// 데스나이트 세트 효과 (네 부위 모두): AC -3 · 추가 피해 +2 · 불 저항 +20
const DK_SET_BONUS = { ac: 3, xdmg: 2, fireRes: 20 };

// ============================================================ 오렌설원지역: 눈 덮인 소품(윗면에 눈) · 눈보라 날씨 · 얼음여왕 블리자드
const SNOWC = new Map();
// 소품 그림을 차갑게 + 위를 향한 모서리(나무 가지·바위 윗면·천막 지붕)에 눈을 얹음 — 그림마다 한 번만 만들어 둠
function snowImg(src) { if (!src) return src; let c = SNOWC.get(src); if (c) return c; const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height; if (!w) return src;
  c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.filter = 'grayscale(.5) sepia(.15) hue-rotate(170deg) saturate(.8) brightness(1.06) contrast(1.05)'; g.drawImage(src, 0, 0); g.filter = 'none';
  try { const D = g.getImageData(0, 0, w, h), a = D.data, cap = Math.max(2, Math.round(h * 0.012));
    for (let y = h - 1; y >= cap; y--) for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; if (a[o + 3] < 40) continue; const up = ((y - cap) * w + x) * 4; if (a[up + 3] > 30) continue;
      const k = 0.78 + 0.18 * ((x * 7 + y * 13) % 5) / 5; a[o] = a[o] + (246 - a[o]) * k; a[o + 1] = a[o + 1] + (250 - a[o + 1]) * k; a[o + 2] = a[o + 2] + (255 - a[o + 2]) * k;
      const o2 = o + w * 4; if (y + 1 < h && a[o2 + 3] > 40) { a[o2] = (a[o2] + 235) / 2; a[o2 + 1] = (a[o2 + 1] + 242) / 2; a[o2 + 2] = (a[o2 + 2] + 252) / 2; } }
    g.putImageData(D, 0, 0); } catch (e) {}
  SNOWC.set(src, c); return c; }
// 눈보라: 화면 공간 눈송이(가까운 것·먼 것) + 바람 줄기 + 가끔 휘몰아치는 돌풍(하얗게 흐려짐) + 차가운 빛
const SNOWF = []; let snowGust = 0, snowGustT = 8;
function snowFx(g, vw, vh) { if (!ISLE || !ISLE.def.snow) { SNOWF.length = 0; return; } const dt = 1 / 60; snowGustT -= dt; if (snowGustT <= 0) { snowGust = snowGust > 0 ? 0 : 1; snowGustT = snowGust ? 4 + Math.random() * 3 : 14 + Math.random() * 10; }
  const gk = (window.__gk = (window.__gk || 0) + ((snowGust ? 1 : 0) - (window.__gk || 0)) * Math.min(1, dt * 1.2)), want = Math.round(180 + 260 * gk), wind = 60 + 260 * gk;
  while (SNOWF.length < want) SNOWF.push({ x: Math.random() * vw, y: Math.random() * vh, z: 0.3 + Math.random() * 0.7, ph: Math.random() * 6.28 });
  if (SNOWF.length > want) SNOWF.length = want;
  g.save(); g.globalCompositeOperation = 'source-over'; g.fillStyle = `rgba(200,220,245,${0.06 + 0.1 * gk})`; g.fillRect(0, 0, vw, vh);   // 차가운 빛
  for (const f of SNOWF) { f.ph += dt * 2; f.x += (wind * f.z + Math.sin(f.ph) * 14) * dt; f.y += (40 + 70 * f.z) * dt; if (f.x > vw + 10) f.x -= vw + 20; if (f.y > vh + 10) { f.y = -10; f.x = Math.random() * vw; }
    const s = 0.8 + f.z * 2.2; g.globalAlpha = 0.45 + f.z * 0.5; g.fillStyle = '#ffffff'; if (gk > 0.3 && f.z > 0.6) { g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = s * 0.7; g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x - wind * 0.03 * f.z, f.y - 3); g.stroke(); } else g.fillRect(f.x, f.y, s, s); }
  g.globalAlpha = 1; for (let q = 0; q < 5; q++) { const yy = ((q * 151 + time * (40 + 90 * gk)) % (vh + 80)) - 40, gr = g.createLinearGradient(0, yy - 30, 0, yy + 30); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, `rgba(240,248,255,${0.04 + 0.08 * gk})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, yy - 30, vw, 60); }   // 바람에 날리는 눈 띠
  if (gk > 0.02) { const vg = g.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.25, vw / 2, vh / 2, Math.max(vw, vh) * 0.7); vg.addColorStop(0, 'rgba(235,245,255,0)'); vg.addColorStop(1, `rgba(235,245,255,${0.42 * gk})`); g.fillStyle = vg; g.fillRect(0, 0, vw, vh); }   // 돌풍: 가장자리가 하얗게
  g.restore(); }

const ISLAND = (() => {
  const N0 = 44;                    // 기본 크기(기존 사냥터 30×30의 약 2배 넓이) — 2구간은 한 변 1.5배(66)
  const DEF = {
    1: { name: '이야기섬 1구간', tier: 1, seed: 11, portals: [{ i: 5, j: 5, to: 2, label: '2구간으로 ▲' }, { i: 40, j: 40, to: 'town', label: '▼ 마을로' }], tone: null,
         mobs: [['goblin', 10], ['orc', 8], ['orc_archer', 6], ['dwarf', 6]], groups: [] },
    // 2구간: 한 변 1.5배(66칸) — 언덕 위치·크기도 1.5배, 몬스터 수는 넓이(2.25배)만큼 늘려 밀도 유지
    2: { name: '이야기섬 2구간', tier: 2, seed: 23, N: 66, hills: [{ x: 22.5, z: 37.5, h: 2.6, r: 7.5 }, { x: 43.5, z: 22.5, h: 2.0, r: 6.3, plateau: true, ramp: [-1, 1] }, { x: 36, z: 49.5, h: 1.5, r: 5.1 }, { x: 52, z: 46, h: 1.8, r: 5.6 }], portals: [{ i: 60, j: 60, to: 1, label: '▼ 1구간으로' }], tone: 'rgba(60,34,10,.22)',
         mobs: [['werewolf', 13]], groups: [['orc_warrior', [['orc', 2], ['orc_archer', 1]], 9], ['hobgoblin', [['goblin', 3]], 9]] },
    // 사막필드: 1구간(56칸, Lv10~15) · 2구간(66칸, Lv15~20, 보스 거대 여왕개미). 모래빛 바닥 + 완만한 모래 언덕(사구)
    // 규칙: 모든 지역의 1구간은 평지, 2구간은 언덕·절벽 고원(경사로)·능선 지형 (정해 둔 언덕이 없으면 시드로 자동 생성 + 연결 확인)
    3: { name: '사막필드 1구간', tier: 1, seed: 31, N: 56, sand: true, oases: 2,
         portals: [{ i: 4, j: 4, to: 4, label: '2구간으로 ▲' }, { i: 51, j: 51, to: 'town', label: '▼ 마을로' }], tone: null,
         hello: '모래바람이 붑니다. 스콜피온은 먼저 덤비니 조심하세요! 북쪽 끝 포털로 2구간에 갈 수 있어요.',
         mobs: [['lizardman', 18], ['giant_ant', 18], ['scorpion', 3]], groups: [] },
    4: { name: '사막필드 2구간', tier: 2, seed: 47, N: 66, sand: true, oases: 1,
         portals: [{ i: 60, j: 60, to: 3, label: '▼ 1구간으로' }], tone: null,
         hello: '뜨거운 모래 아래 개미굴이 있다고 합니다. 보스 거대 여왕개미를 조심하세요!',
         mobs: [['scorpion', 16], ['basilisk', 14], ['fire_ant', 18]], groups: [['giant_ant', [['fire_ant', 2]], 5]] },
    // 오크숲: 울창한 숲 + 곳곳의 오크 부족 야영지(천막·토템·모닥불·목책·깃발·무기 걸이·뼈 무더기). 1구간(56칸, Lv15~20) · 2구간(66칸, Lv20~25, 보스 오우거)
    5: { name: '오크숲 1구간', tier: 1, seed: 53, N: 56, forest: true, camps: 2,
         portals: [{ i: 4, j: 4, to: 6, label: '2구간으로 ▲' }, { i: 51, j: 51, to: 'town', label: '▼ 마을로' }], tone: null,
         hello: '울창한 숲 곳곳에 오크 부족의 흔적이 보입니다. 다크엘프는 먼저 덤비니 조심하세요! 북쪽 끝 포털로 2구간에 갈 수 있어요.',
         mobs: [['roba_orc', 16], ['dudamara_orc', 14], ['orc_wizard', 10], ['dark_elf', 3]], groups: [] },
    6: { name: '오크숲 2구간', tier: 2, seed: 61, N: 66, forest: true, camps: 3,
         portals: [{ i: 60, j: 60, to: 5, label: '▼ 1구간으로' }], tone: 'rgba(60,90,50,.12)',
         hello: '오크 부족의 본거지입니다. 가스트와 다크엘프는 먼저 덤빕니다. 보스 오우거를 조심하세요!',
         mobs: [['dark_elf', 14], ['atuba_orc', 18], ['gast', 13]], groups: [] },
    // 버그베어밭: 어둡고 칙칙한 살육의 땅 — 핏자국·시체·해골 더미·꼬챙이·교수대 우리·고목. 곳곳에 살육터(시체 무더기), 2구간엔 버그베어 야영지
    7: { name: '버그베어밭 1구간', tier: 1, seed: 71, N: 56, gore: true, sites: 3, camps: 1,
         portals: [{ i: 4, j: 4, to: 8, label: '2구간으로 ▲' }, { i: 51, j: 51, to: 'town', label: '▼ 마을로' }], tone: 'rgba(80,36,30,.28)',
         hello: '피비린내가 진동합니다... 곳곳에 시체가 널려 있어요. 해골 궁수는 멀리서 먼저 활을 쏩니다! 해골·좀비는 밤에 더 강해져요. 북쪽 끝 포털로 2구간에 갈 수 있어요.',
         mobs: [['skeleton_archer', 8], ['zombie', 16], ['bugbear', 16]], groups: [] },
    8: { name: '버그베어밭 2구간', tier: 2, seed: 83, N: 66, gore: true, sites: 3, camps: 3,
         portals: [{ i: 60, j: 60, to: 7, label: '▼ 1구간으로' }], tone: 'rgba(70,26,24,.36)',
         hello: '버그베어 부족의 학살터입니다. 킹 버그베어는 먼저 덤빕니다. 바포메트가 나타나면 도망치세요...!',
         mobs: [['bugbear', 18], ['cerberus', 16], ['king_bugbear', 9]], groups: [] },
    // 본토던전 (상급): 벽과 골목의 미로 · 항상 밤처럼 어두움 · 모든 몬스터 선공(같은 골목에서 보여야 덤빔) · 1층 Lv35~40(보스 카스파 패밀리) · 2층 Lv40~45(보스 데스나이트)
    9: { name: '본토던전 1층', tier: 1, seed: 9001, N: 65, maze: true, dark: true, floor: 1, down: 10, hills: [], portals: [], tone: null,
         hello: '피비린내와 썩은 냄새가 가득한 어둠... 벽 너머의 몬스터는 당신을 보지 못하지만, 같은 골목에 들어서면 모두 덤빕니다. 구울에게 할퀴이면 독에 걸려요(큐어 포이즌·해독제). 미로 끝 어딘가에 2층으로 내려가는 계단이 있습니다.',
         mobs: [['dg_kbugbear', 12], ['ungoliant', 12], ['ghoul', 18]], groups: [] },
    10: { name: '본토던전 2층', tier: 2, seed: 10007, N: 65, maze: true, dark: true, floor: 2, up: 9, hills: [], portals: [], tone: null,
         hello: '더 깊은 어둠입니다. 네크로맨서의 저주 폭발(보라 범위)을 피하세요. 어딘가에 데스나이트가 잠들어 있습니다... 올라가는 계단은 바로 옆에 있어요.',
         mobs: [['dg_kbugbear', 12], ['dg_cerberus', 14], ['necromancer', 10]], groups: [] },
    // 오렌설원지역 (상급, 수속성): 눈보라가 몰아치는 눈 덮인 설원 · 1구역(Lv40~45) 엘모어 군단 야영지 — 선공은 없지만 3~5마리씩 무리, 하나를 치면 무리 전체가 반격 · 2구역(Lv45~50) 언덕 설원 + 얼어붙은 호수, 에틴·샤벨타이거(선공)·아이스 골렘, 보스 얼음여왕
    11: { name: '오렌설원지역 1구역', tier: 1, seed: 1103, N: 60, snow: true, camps: 3,
         portals: [{ i: 4, j: 4, to: 12, label: '2구역으로 ▲' }, { i: 55, j: 55, to: 'town', label: '▼ 마을로' }], tone: null,
         hello: '살을 에는 눈보라가 몰아칩니다. 엘모어 군단은 먼저 덤비지 않지만 3~5명씩 무리를 지어 다니며, 하나를 치면 무리 전체가 반격합니다! 북쪽 끝 포털로 2구역에 갈 수 있어요.',
         mobs: [], groups: [['elmore_warrior', [['elmore_soldier', 2], ['elmore_mage', 1]], 5], ['elmore_soldier', [['elmore_soldier', 1], ['elmore_mage', 1]], 6], ['elmore_mage', [['elmore_soldier', 2], ['elmore_warrior', 1], ['elmore_mage', 1]], 3], ['elmore_warrior', [['elmore_warrior', 1], ['elmore_soldier', 2], ['elmore_mage', 1]], 2]] },
    12: { name: '오렌설원지역 2구역', tier: 2, seed: 1217, N: 66, snow: true, oases: 2,
         portals: [{ i: 60, j: 60, to: 11, label: '▼ 1구역으로' }], tone: null,
         hello: '얼어붙은 호수와 눈 덮인 언덕입니다. 에틴과 샤벨타이거는 먼저 덤빕니다. 아이스 골렘에게 맞으면 몸이 얼어 느려져요. 얼음여왕이 나타나면 블리자드를 조심하세요!',
         mobs: [['ettin', 14], ['ice_golem', 13], ['sabertooth', 14]], groups: [] },
  };
  const ARRIVE = { 1: { town: [37, 37], 2: [8, 8] }, 2: { 1: [56, 56], town: [56, 56] }, 3: { town: [48, 48], 4: [7, 7] }, 4: { 3: [57, 57], town: [57, 57] }, 5: { town: [48, 48], 6: [7, 7] }, 6: { 5: [57, 57], town: [57, 57] }, 7: { town: [48, 48], 8: [7, 7] }, 8: { 7: [57, 57], town: [57, 57] }, 11: { town: [52, 52], 12: [7, 7] }, 12: { 11: [57, 57], town: [57, 57] } };
  function rng(seed) { return () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function affine(p) { const [s0, t0] = p[0], [s1, t1] = p[1], [s2, t2] = p[2];
    const a1 = s1[0] - s0[0], b1 = s1[1] - s0[1], a2 = s2[0] - s0[0], b2 = s2[1] - s0[1], det = a1 * b2 - a2 * b1;
    const i11 = b2 / det, i12 = -a2 / det, i21 = -b1 / det, i22 = a1 / det;
    const c1x = t1[0] - t0[0], c1y = t1[1] - t0[1], c2x = t2[0] - t0[0], c2y = t2[1] - t0[1];
    const A = c1x * i11 + c2x * i21, C = c1x * i12 + c2x * i22, B = c1y * i11 + c2y * i21, D = c1y * i12 + c2y * i22;
    return [A, B, C, D, t0[0] - A * s0[0] - C * s0[1], t0[1] - B * s0[0] - D * s0[1]]; }
  // 바닥: 사냥터 실사 바닥(30×30 m)을 거울 반복으로 이어 붙여 이음매 없이 넓힘
  function buildGround(d, hm) { const N = d.N || N0, sc = N > 50 ? 1.2 : 1.5,   // 넓은 맵은 바닥 해상도를 조금 낮춰 메모리·굽는 시간 절약
 ax = N * K + 24, ay = 24, c = document.createElement('canvas');
    c.width = Math.ceil((2 * N * K + 48) * sc); c.height = Math.ceil((N * K + 48) * sc);
    const g = c.getContext('2d'), src = im.ground, sx = src.naturalWidth / GEO0.W, sy = src.naturalHeight / GEO0.H;
    const T = (x, z) => [sc * (ax + (x - z) * K), sc * (ay + (x + z) * K / 2)];
    const dia = (x0, z0, x1, z1) => { g.beginPath(); [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].forEach(([x, z], k) => { const q = T(x, z); k ? g.lineTo(...q) : g.moveTo(...q); }); g.closePath(); };
    g.clearRect(0, 0, c.width, c.height);   // 맵 밖은 투명 (숲 배경이 보이게)
    g.save(); dia(0, 0, N, N); g.clip(); g.fillStyle = '#2a2a1c'; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingQuality = 'high';
    for (let a = 0; a * 30 < N; a++) for (let b = 0; b * 30 < N; b++) {
      const fx = a % 2 ? -1 : 1, fz = b % 2 ? -1 : 1, ox = a * 30 + (a % 2 ? 30 : 0), oz = b * 30 + (b % 2 ? 30 : 0);
      const q = v => 0.6 + v * 28.8 / 30;   // 원본 바닥 가장자리(어두운 테두리)는 피해서 안쪽만 씀
      const M = affine([[0, 0], [30, 0], [0, 30]].map(([xs, zs]) => [[sx * (GEO0.ax + (q(xs) - q(zs)) * K), sy * (GEO0.ay + (q(xs) + q(zs)) * K / 2)], T(ox + fx * xs, oz + fz * zs)]));
      g.save(); dia(a * 30 - 0.08, b * 30 - 0.08, a * 30 + 30.08, b * 30 + 30.08); g.clip(); g.setTransform(...M); if (d.sand) g.filter = 'grayscale(.55) sepia(1) saturate(1.35) hue-rotate(-8deg) brightness(1.42) contrast(.78)'; else if (d.forest) g.filter = 'saturate(1.3) brightness(.92) contrast(1.06) hue-rotate(16deg)'; else if (d.gore) g.filter = 'grayscale(.55) sepia(.55) hue-rotate(-18deg) saturate(.9) brightness(.5) contrast(1.18)'; else if (d.snow) g.filter = 'grayscale(1) brightness(2.15) contrast(.5) sepia(.1) hue-rotate(175deg) saturate(1.4)'; else if (d.maze) g.filter = d.floor === 2 ? 'grayscale(.9) sepia(.25) hue-rotate(-30deg) brightness(.3) contrast(1.4)' : 'grayscale(.92) sepia(.18) brightness(.34) contrast(1.38)'; g.drawImage(src, 0, 0); g.restore(); }
    if (d.sand) { const Rr = rng(d.seed + 9);   // 모래 물결 무늬
      for (let q = 0; q < N * 3; q++) { const x = 2 + Rr() * (N - 4), z = 2 + Rr() * (N - 4), [px, py] = T(x, z), w = (10 + Rr() * 22) * sc; g.lineWidth = 1.1 * sc;
        for (let l = 0; l < 3; l++) { const yy = py + l * 3.2 * sc; g.strokeStyle = 'rgba(255,236,190,.22)'; g.beginPath(); g.moveTo(px - w, yy); g.quadraticCurveTo(px, yy - 3 * sc, px + w, yy); g.stroke(); g.strokeStyle = 'rgba(120,80,40,.16)'; g.beginPath(); g.moveTo(px - w, yy + 1.2 * sc); g.quadraticCurveTo(px, yy - 1.8 * sc, px + w, yy + 1.2 * sc); g.stroke(); } }
      for (const o of d.oasisList || []) { const [ox_, oy_] = T(o.x, o.z), rx = (o.r + 2) * K * 1.414 * sc, ry = rx / 2;   // 오아시스 둘레: 젖은 모래 · 풀
        const gr = g.createRadialGradient(ox_, oy_, 0, ox_, oy_, rx); gr.addColorStop(0, 'rgba(60,46,26,.75)'); gr.addColorStop((o.r) / (o.r + 2), 'rgba(80,62,34,.55)'); gr.addColorStop(1, 'rgba(90,70,40,0)'); g.save(); g.translate(ox_, oy_); g.scale(1, 0.5); g.translate(-ox_, -oy_); g.fillStyle = gr; g.beginPath(); g.arc(ox_, oy_, rx, 0, 7); g.fill(); g.restore();
        for (let q = 0; q < 160; q++) { const a = Rr() * 6.283, rr = o.r + 0.15 + Rr() * 1.6, [gx, gy] = T(o.x + Math.cos(a) * rr, o.z + Math.sin(a) * rr); g.strokeStyle = `rgba(${70 + Rr() * 40 | 0},${120 + Rr() * 50 | 0},${40 + Rr() * 20 | 0},.85)`; g.lineWidth = 1.2 * sc; g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + (Rr() - 0.5) * 3 * sc, gy - (3 + Rr() * 4) * sc); g.stroke(); } } }
    if (d.forest) { const Rr = rng(d.seed + 9), ell = (x, z, r, col0, col1) => { const [px, py] = T(x, z), rx = r * K * 1.414 * sc; const gr = g.createRadialGradient(px, py, 0, px, py, rx); gr.addColorStop(0, col0); gr.addColorStop(1, col1); g.save(); g.translate(px, py); g.scale(1, 0.5); g.translate(-px, -py); g.fillStyle = gr; g.beginPath(); g.arc(px, py, rx, 0, 7); g.fill(); g.restore(); };
      for (let q = 0; q < N * 1.6; q++) ell(2 + Rr() * (N - 4), 2 + Rr() * (N - 4), 2 + Rr() * 4, 'rgba(6,26,8,.3)', 'rgba(6,26,8,0)');        // 나무 그늘
      for (let q = 0; q < N * 1.6; q++) ell(2 + Rr() * (N - 4), 2 + Rr() * (N - 4), 1.2 + Rr() * 2.6, 'rgba(76,128,36,.36)', 'rgba(76,128,36,0)');   // 이끼·풀
      for (let q = 0; q < N * 14; q++) { const [px, py] = T(1 + Rr() * (N - 2), 1 + Rr() * (N - 2)); g.fillStyle = ['rgba(120,84,40,.55)', 'rgba(90,100,40,.5)', 'rgba(150,110,50,.45)', 'rgba(60,40,20,.5)'][q % 4]; g.beginPath(); g.ellipse(px, py, (1.6 + Rr() * 1.8) * sc, (0.8 + Rr()) * sc, Rr() * 3, 0, 7); g.fill(); }   // 낙엽
      for (const cp of d.campList || []) { ell(cp.x, cp.z, cp.r + 1.6, 'rgba(96,72,44,.92)', 'rgba(96,72,44,0)'); ell(cp.x, cp.z, 1.4, 'rgba(30,20,12,.7)', 'rgba(30,20,12,0)');   // 야영지: 밟혀 다져진 맨흙 + 가운데 그을음
        for (let q = 0; q < 40; q++) { const an = Rr() * 6.283, rr = Rr() * (cp.r + 1), [px, py] = T(cp.x + Math.cos(an) * rr, cp.z + Math.sin(an) * rr); g.fillStyle = q % 2 ? 'rgba(60,44,26,.5)' : 'rgba(140,110,70,.35)'; g.beginPath(); g.ellipse(px, py, 2.5 * sc, 1.2 * sc, 0, 0, 7); g.fill(); } } }
    if (d.gore) { const Rr = rng(d.seed + 9), ell = (x, z, r, col0, col1) => { const [px, py] = T(x, z), rx = r * K * 1.414 * sc; const gr = g.createRadialGradient(px, py, 0, px, py, rx); gr.addColorStop(0, col0); gr.addColorStop(1, col1); g.save(); g.translate(px, py); g.scale(1, 0.5); g.translate(-px, -py); g.fillStyle = gr; g.beginPath(); g.arc(px, py, rx, 0, 7); g.fill(); g.restore(); };
      const splat = (x, z, r, a) => { const [px, py] = T(x, z), R0 = r * K * 1.414 * sc, n = 16, ph = Rr() * 6.283, w = [Rr(), Rr(), Rr()]; g.save(); g.translate(px, py); g.scale(1, 0.5);   // 튄 피: 울퉁불퉁한 덩어리 + 마른 테두리 + 둘레 핏방울
        const blob = (k0, col) => { g.fillStyle = col; g.beginPath(); for (let q = 0; q <= n; q++) { const an = q / n * 6.283, rr = R0 * k0 * (0.7 + 0.18 * Math.sin(an * 3 + ph) * w[0] + 0.14 * Math.sin(an * 5 + ph * 2) * w[1] + 0.1 * w[2]); q ? g.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : g.moveTo(Math.cos(an) * rr, Math.sin(an) * rr); } g.closePath(); g.fill(); };
        blob(1.15, `rgba(34,6,4,${a * 0.55})`); blob(1, `rgba(${62 + Rr() * 28 | 0},${6 + Rr() * 6 | 0},4,${a})`); blob(0.55, `rgba(${86 + Rr() * 24 | 0},10,7,${a * 0.6})`);
        for (let q = 0; q < 9; q++) { const an = Rr() * 6.283, dd = R0 * (1.05 + Rr() * 1.3), rr = R0 * (0.04 + Rr() * 0.09); g.fillStyle = `rgba(${50 + Rr() * 30 | 0},6,4,${a * 0.9})`; g.beginPath(); g.arc(Math.cos(an) * dd, Math.sin(an) * dd, rr, 0, 7); g.fill(); }
        g.restore(); };
      const trail = (x0, z0, len, an) => { for (let q = 0; q < len * 5; q++) { const k = q / (len * 5), x = x0 + Math.cos(an) * len * k + (Rr() - 0.5) * 0.25, z = z0 + Math.sin(an) * len * k + (Rr() - 0.5) * 0.25, [px, py] = T(x, z); g.fillStyle = `rgba(${58 + Rr() * 20 | 0},6,4,${0.55 * (1 - k * 0.7)})`; g.beginPath(); g.ellipse(px, py, (2.6 - k * 1.4) * sc * (0.7 + Rr() * 0.6), (1.1 - k * 0.5) * sc, an * 0.5, 0, 7); g.fill(); } };   // 끌고 간 핏자국
      for (let q = 0; q < N * 1.5; q++) ell(2 + Rr() * (N - 4), 2 + Rr() * (N - 4), 1.5 + Rr() * 3.5, 'rgba(14,8,5,.45)', 'rgba(14,8,5,0)');            // 진흙·그을음
      for (let q = 0; q < N * 0.5; q++) ell(2 + Rr() * (N - 4), 2 + Rr() * (N - 4), 1 + Rr() * 2, 'rgba(70,52,34,.28)', 'rgba(70,52,34,0)');          // 마른 흙
      for (let q = 0; q < N * 10; q++) { const [px, py] = T(1 + Rr() * (N - 2), 1 + Rr() * (N - 2)); g.strokeStyle = ['rgba(118,98,66,.5)', 'rgba(88,74,50,.5)', 'rgba(66,56,38,.5)'][q % 3]; g.lineWidth = 0.9 * sc;   // 말라 죽은 풀
        for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(px + k * 1.3 * sc, py); g.lineTo(px + (k - 1) * 2.2 * sc + Rr() * sc, py - (2.5 + Rr() * 4) * sc); g.stroke(); } }
      for (let q = 0; q < N * 1.2; q++) splat(2 + Rr() * (N - 4), 2 + Rr() * (N - 4), 0.25 + Rr() * 0.7, 0.45 + Rr() * 0.35);
      for (let q = 0; q < N * 0.22; q++) trail(3 + Rr() * (N - 6), 3 + Rr() * (N - 6), 2 + Rr() * 4, Rr() * 6.283);
      for (const st of d.siteList || []) { ell(st.x, st.z, st.r + 2, 'rgba(38,6,4,.78)', 'rgba(38,6,4,0)');   // 살육터: 검붉게 젖은 땅 + 큰 피 웅덩이 + 사방으로 끌린 자국
        for (let q = 0; q < 12; q++) { const an = Rr() * 6.283, rr = Rr() * st.r; splat(st.x + Math.cos(an) * rr, st.z + Math.sin(an) * rr, 0.6 + Rr() * 1.1, 0.75); }
        for (let q = 0; q < 4; q++) { const an = Rr() * 6.283; trail(st.x + Math.cos(an) * st.r * 0.6, st.z + Math.sin(an) * st.r * 0.6, 3 + Rr() * 4, an); } }
      for (const cp of d.campList || []) { ell(cp.x, cp.z, cp.r + 1.6, 'rgba(52,38,24,.9)', 'rgba(52,38,24,0)'); ell(cp.x, cp.z, 1.4, 'rgba(14,9,6,.8)', 'rgba(14,9,6,0)');   // 버그베어 야영지: 밟힌 맨흙 + 그을음 + 핏자국
        for (let q = 0; q < 5; q++) { const an = Rr() * 6.283, rr = 1.5 + Rr() * cp.r; splat(cp.x + Math.cos(an) * rr, cp.z + Math.sin(an) * rr, 0.4 + Rr() * 0.6, 0.7); } } }
    if (d.snow) { const Rr = rng(d.seed + 9), ell = (x, z, r, col0, col1, sy = 0.5) => { const [px, py] = T(x, z), rx = r * K * 1.414 * sc; const gr = g.createRadialGradient(px, py, 0, px, py, rx); gr.addColorStop(0, col0); gr.addColorStop(1, col1); g.save(); g.translate(px, py); g.scale(1, sy); g.translate(-px, -py); g.fillStyle = gr; g.beginPath(); g.arc(px, py, rx, 0, 7); g.fill(); g.restore(); };
      for (let q = 0; q < N * 1.8; q++) { const x = 2 + Rr() * (N - 4), z = 2 + Rr() * (N - 4), r = 1.2 + Rr() * 3; ell(x + 0.4, z + 0.4, r, 'rgba(120,150,190,.22)', 'rgba(120,150,190,0)'); ell(x, z, r * 0.9, 'rgba(255,255,255,.55)', 'rgba(255,255,255,0)'); }   // 눈더미 (그늘 + 볼록한 흰 눈)
      for (let q = 0; q < N * 0.5; q++) ell(2 + Rr() * (N - 4), 2 + Rr() * (N - 4), 0.8 + Rr() * 2.2, 'rgba(170,215,240,.45)', 'rgba(170,215,240,0)');   // 얼음판
      for (let q = 0; q < N * 0.35; q++) { let x = 3 + Rr() * (N - 6), z = 3 + Rr() * (N - 6); const an = Rr() * 6.283; for (let k = 0; k < 18; k++) { x += Math.cos(an) * 0.35; z += Math.sin(an) * 0.35; const [px, py] = T(x + (k % 2 ? 0.12 : -0.12), z); g.fillStyle = 'rgba(110,135,170,.35)'; g.beginPath(); g.ellipse(px, py, 1.6 * sc, 0.8 * sc, 0, 0, 7); g.fill(); } }   // 발자국
      for (let q = 0; q < N * 12; q++) { const [px, py] = T(1 + Rr() * (N - 2), 1 + Rr() * (N - 2)); g.fillStyle = `rgba(255,255,255,${0.5 + Rr() * 0.5})`; g.fillRect(px, py, sc * (Rr() < 0.15 ? 2 : 1), sc); }   // 반짝이는 눈 결정
      for (const o of d.oasisList || []) { ell(o.x, o.z, o.r + 1.4, 'rgba(255,255,255,.7)', 'rgba(255,255,255,0)'); ell(o.x, o.z, o.r, 'rgba(120,185,225,.95)', 'rgba(150,205,235,.9)'); ell(o.x - o.r * 0.3, o.z - o.r * 0.3, o.r * 0.6, 'rgba(230,248,255,.55)', 'rgba(230,248,255,0)');   // 얼어붙은 호수: 푸른 얼음 + 금
        g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1 * sc; for (let k = 0; k < 7; k++) { let a = Rr() * 6.283, rr = Rr() * o.r * 0.5; let [px, py] = T(o.x + Math.cos(a) * rr, o.z + Math.sin(a) * rr); g.beginPath(); g.moveTo(px, py); for (let s2 = 0; s2 < 4; s2++) { a += (Rr() - 0.5) * 1.2; rr += o.r * 0.15; [px, py] = T(o.x + Math.cos(a) * rr, o.z + Math.sin(a) * rr); g.lineTo(px, py); } g.stroke(); } } }
    if (d.maze) { const Rr = rng(d.seed + 9);   // 던전 바닥: 칸마다 판석(밝기 차이 · 줄눈 · 금) + 핏자국 · 끌린 자국 · 고인 물
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const q4 = [T(i, j), T(i + 1, j), T(i + 1, j + 1), T(i, j + 1)], tone = Rr();
        g.fillStyle = tone < 0.5 ? `rgba(0,0,0,${0.08 + tone * 0.2})` : `rgba(200,190,170,${(tone - 0.5) * 0.09})`; g.beginPath(); q4.forEach((p_, k) => k ? g.lineTo(...p_) : g.moveTo(...p_)); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.42)'; g.lineWidth = 1.1 * sc; g.stroke(); if (Rr() < 0.12) { const [ax_, ay_] = q4[0], [bx_, by_] = q4[2]; g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 0.8 * sc; g.beginPath(); g.moveTo(ax_ + (bx_ - ax_) * 0.3, ay_ + (by_ - ay_) * 0.3); g.lineTo(ax_ + (bx_ - ax_) * 0.5 + 4 * sc, ay_ + (by_ - ay_) * 0.55); g.lineTo(ax_ + (bx_ - ax_) * 0.7, ay_ + (by_ - ay_) * 0.75); g.stroke(); } }
      const blob = (x, z, r, col) => { const [px, py] = T(x, z), R0 = r * K * 1.414 * sc, ph = Rr() * 6.283; g.save(); g.translate(px, py); g.scale(1, 0.5); g.fillStyle = col; g.beginPath(); for (let q = 0; q <= 16; q++) { const an = q / 16 * 6.283, rr = R0 * (0.75 + 0.2 * Math.sin(an * 3 + ph) + 0.1 * Math.sin(an * 5 + ph * 2)); q ? g.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : g.moveTo(Math.cos(an) * rr, Math.sin(an) * rr); } g.closePath(); g.fill(); g.restore(); };
      for (let q = 0; q < N * 1.4; q++) { const x = 2 + Rr() * (N - 4), z = 2 + Rr() * (N - 4), r = 0.25 + Rr() * 0.8; blob(x, z, r * 1.15, 'rgba(20,4,3,.45)'); blob(x, z, r, `rgba(${70 + Rr() * 30 | 0},6,5,.8)`); for (let k = 0; k < 6; k++) { const an = Rr() * 6.283, dd = r * (1.1 + Rr() * 1.2); blob(x + Math.cos(an) * dd, z + Math.sin(an) * dd, 0.05 + Rr() * 0.08, 'rgba(70,6,5,.8)'); } }
      for (let q = 0; q < N * 0.3; q++) { let x = 3 + Rr() * (N - 6), z = 3 + Rr() * (N - 6); const an = Rr() * 6.283, len = 2 + Rr() * 4; for (let k = 0; k < len * 5; k++) { x += Math.cos(an) * 0.2; z += Math.sin(an) * 0.2; const [px, py] = T(x, z); g.fillStyle = `rgba(${55 + Rr() * 20 | 0},6,4,${0.5 * (1 - k / (len * 5))})`; g.beginPath(); g.ellipse(px, py, 2.4 * sc, 1 * sc, 0, 0, 7); g.fill(); } }
      for (let q = 0; q < N * 0.35; q++) { const x = 2 + Rr() * (N - 4), z = 2 + Rr() * (N - 4); blob(x, z, 0.4 + Rr() * 0.7, 'rgba(10,14,18,.55)'); const [px, py] = T(x, z); g.fillStyle = 'rgba(160,180,200,.12)'; g.beginPath(); g.ellipse(px - 3 * sc, py - 1 * sc, 5 * sc, 1.4 * sc, 0, 0, 7); g.fill(); } }
    if (d.tone) { g.globalCompositeOperation = 'multiply'; g.fillStyle = d.tone; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'source-over'; }
    g.restore(); edgeFade(g, [T(0, 0), T(N, 0), T(N, N), T(0, N)], 26 * sc);
    if (!hm) return c;
    // 픽셀 단위로 높이만큼 들어 올림 (가까운 면이 먼 면을 가림) + 경사 음영 — 이음매 없음
    const hf = hillFn(d.hills), F = 4, FW = N * F + 1, fine = new Float32Array(FW * FW); let hmax = 0;
    for (let j = 0; j < FW; j++) for (let i = 0; i < FW; i++) { const v = hf(i / F, j / F); fine[j * FW + i] = v; if (v > hmax) hmax = v; }
    const hb = (x, z) => { x = Math.max(0, Math.min(N - 0.001, x)) * F; z = Math.max(0, Math.min(N - 0.001, z)) * F; const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, o = j * FW + i;
      return (fine[o] * (1 - fx) + fine[o + 1] * fx) * (1 - fz) + (fine[o + FW] * (1 - fx) + fine[o + FW + 1] * fx) * fz; };
    const W2 = c.width, H2 = c.height;
    const kk = sc * VPXG, toXZ = (X, Y) => { const u = (X / sc - ax) / K, v = (Y / sc - ay) / (K / 2); return [(u + v) / 2, (v - u) / 2]; };
    const Lx = -0.62, Ly = 0.95, Lz = -0.25, Ln = Math.hypot(Lx, Ly, Lz), up = Ly / Ln;
    // 언덕이 걸친 영역만 계산
    let x0 = W2, x1 = 0, y0 = H2, y1 = 0;
    for (const Hh of d.hills) { const R2 = Hh.r + 6; for (const [qx, qz] of [[Hh.x - R2, Hh.z - R2], [Hh.x + R2, Hh.z - R2], [Hh.x + R2, Hh.z + R2], [Hh.x - R2, Hh.z + R2]]) { const q = T(qx, qz); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1] - hmax * kk); y1 = Math.max(y1, q[1]); } }
    x0 = Math.max(0, Math.floor(x0)); x1 = Math.min(W2 - 1, Math.ceil(x1)); y0 = Math.max(0, Math.floor(y0)); y1 = Math.min(H2 - 1, Math.ceil(y1));
    const RW = x1 - x0 + 1, RH = y1 - y0 + 1, srcD = g.getImageData(x0, y0, RW, RH), out = new ImageData(new Uint8ClampedArray(srcD.data), RW, RH), S = srcD.data, O = out.data;   // 언덕 영역만 읽고 씀
    const f = (X, Ys, Y) => { const [x, z] = toXZ(X, Ys); return Ys - hb(x, z) * kk - Y; };
    // 언덕 굽기는 프레임을 멈추지 않게 조금씩(8ms) 나눠서 — 그동안은 평평한 바닥이 보이고, 끝나면 같은 캔버스에 덮어씀
    let Y = y0; const step = () => { const tEnd = performance.now() + 8; for (; Y <= y1 && performance.now() < tEnd; Y++) for (let X = x0; X <= x1; X++) {
      { const D = hmax * kk; let any = false; for (let q = 0; q <= 4 && !any; q++) { const [qx, qz] = toXZ(X, Y + D * q / 4); if (hb(qx, qz) > 0.005) any = true; } if (!any) continue; }   // 언덕 없는 픽셀은 건너뜀
      let hi = Math.min(H2 - 1, Y + hmax * kk + 1), lo = hi; if (f(X, hi, Y) < 0) continue;         // 가장 가까운(아래쪽) 면부터 찾음
      let found = false; for (let st = 0; st < 40; st++) { lo = hi - 10; if (lo < Y - 1) lo = Y - 1; if (f(X, lo, Y) <= 0) { found = true; break; } hi = lo; if (lo <= Y - 1) break; }
      if (!found) continue;
      for (let b = 0; b < 6; b++) { const m = (lo + hi) / 2; if (f(X, m, Y) > 0) hi = m; else lo = m; }
      const Ys = Math.round((lo + hi) / 2), [x, z] = toXZ(X, Ys), h = hb(x, z), di = ((Y - y0) * RW + (X - x0)) * 4;
      if (h < 0.005) continue;
      const si = ((Math.min(y1, Math.max(y0, Ys)) - y0) * RW + (X - x0)) * 4; if (S[si + 3] === 0) continue;
      const e = 0.25, dx = (hb(x + e, z) - hb(x - e, z)) / (2 * e), dz = (hb(x, z + e) - hb(x, z - e)) / (2 * e), nl = Math.hypot(dx, 1, dz);
      let br = ((-dx * Lx + Ly - dz * Lz) / nl / Ln) / up - 1, sl = Math.hypot(dx, dz);
      let m = 1 + (br < 0 ? br * 0.9 : br * 0.55); m = Math.max(0.35, Math.min(1.3, m));
      let r = S[si] * m, gg = S[si + 1] * m, bb = S[si + 2] * m;
      if (sl > 0.8) { const t = Math.min(1, (sl - 0.8) / 0.8) * (d.sand ? 0.8 : 0.55), band = d.sand ? (Math.floor(h * 6) % 2 ? 0.84 : 1.04) : 1; const [cr, cg, cb] = d.sand ? [178, 122, 78] : [92, 76, 58]; r = r * (1 - t) + cr * m * t * band; gg = gg * (1 - t) + cg * m * t * band; bb = bb * (1 - t) + cb * m * t * band; }   // 사막 절벽: 사암 줄무늬   // 가파른 비탈: 흙·바위빛
      O[di] = r; O[di + 1] = gg; O[di + 2] = bb; O[di + 3] = S[si + 3]; }
      if (Y <= y1) setTimeout(step, 0); else { g.putImageData(out, x0, y0); c.baked = true; } };
    step(); return c; }
  function hillFn(hills) { return (x, z) => { let h = 0;
      for (const H of hills) { const dx = x - H.x, dz = z - H.z, r = Math.hypot(dx, dz);
        if (H.plateau) { let t = Math.max(0, Math.min(1, (H.r + 0.9 - r) / 1.6));
          for (const rp of H.ramps || (H.ramp ? [H.ramp] : [])) { const L = Math.hypot(...rp), along = (dx * rp[0] + dz * rp[1]) / L, side = Math.abs(dx * rp[1] - dz * rp[0]) / L;
            if (along > 0) { const k = Math.max(0, Math.min(1, (2.2 - side) / 1.2)); t = Math.max(t, k * Math.max(0, Math.min(1, (H.r + 5 - r) / 5))); } }
          h = Math.max(h, H.h * t * t * (3 - 2 * t)); }
        else h = Math.max(h, H.h * Math.exp(-(r * r) / (H.r * H.r * 0.55))); }
      return h; }; }
  const faceOf = hf => (i, j) => { const x = i + 0.5, z = j + 0.5, e = 0.35; return Math.hypot((hf(x + e, z) - hf(x - e, z)) / (2 * e), (hf(x, z + e) - hf(x, z - e)) / (2 * e)) > 1.1; };
  function reach(N, blocked, from) { const seen = new Uint8Array(N * N), q = [from]; seen[from[1] * N + from[0]] = 1; const ok = (i, j) => i > 0 && j > 0 && i < N - 1 && j < N - 1 && !blocked(i, j);
    while (q.length) { const [i, j] = q.pop(); for (const [di, dj] of DIRS8) { const a = i + di, b = j + dj; if (!ok(a, b) || seen[b * N + a]) continue; if (di && dj && (!ok(i + di, j) || !ok(i, j + dj))) continue; seen[b * N + a] = 1; q.push([a, b]); } } return seen; }
  // 2구간 지형 자동 생성: 절벽 고원(경사로 1~2개) + 능선(완만한 언덕 줄) + 둥근 언덕. 맵 크기에 비례, 포털·도착지·고원 꼭대기가 모두 이어질 때까지 다시 굴림
  function genTerrain(d, N, keep) { const area = N * N;
    for (let att = 0; att < 24; att++) { const R2 = rng(d.seed * 7 + att * 101), H = [], plats = [];
      const okAt = (x, z, r) => x > r + 4 && z > r + 4 && x < N - r - 4 && z < N - r - 4 && keep.every(([a, b]) => Math.hypot(a + 0.5 - x, b + 0.5 - z) > r + 7) && H.every(h => Math.hypot(h.x - x, h.z - z) > (h.plateau ? h.r + r + 4 : h.r * 0.5 + r * 0.5));
      const nP = Math.max(1, Math.round(area / 2400 * (att < 16 ? 1 : 0.5))), nR = Math.max(1, Math.round(area / 2200)), nH = Math.round(area / 1500);
      for (let k = 0, t = 0; k < nP && t < 200; t++) { const r = 4.2 + R2() * 2.4, x = R2() * N, z = R2() * N; if (!okAt(x, z, r)) continue; const ramps = [], a0 = R2() * 6.283; ramps.push([Math.cos(a0), Math.sin(a0)]); if (R2() < 0.6) { const a1 = a0 + 2 + R2() * 2.2; ramps.push([Math.cos(a1), Math.sin(a1)]); }
        const P_ = { x, z, r, h: 2.0 + R2() * 0.6, plateau: true, ramps }; H.push(P_); plats.push(P_); k++; }
      for (let k = 0, t = 0; k < nR && t < 200; t++) { const x = R2() * N, z = R2() * N, a = R2() * 6.283, n = 3 + Math.floor(R2() * 3), r = 2.6 + R2() * 1.2, hh = 0.9 + R2() * 0.5; const pts = [];
        for (let q = 0; q < n; q++) pts.push([x + Math.cos(a) * q * r * 1.1, z + Math.sin(a) * q * r * 1.1]); if (!pts.every(([px, pz]) => okAt(px, pz, r))) continue; pts.forEach(([px, pz]) => H.push({ x: px, z: pz, r, h: hh * (0.85 + R2() * 0.3) })); k++; }
      for (let k = 0, t = 0; k < nH && t < 200; t++) { const r = 3.5 + R2() * 2.5, x = R2() * N, z = R2() * N; if (!okAt(x, z, r)) continue; H.push({ x, z, r, h: 0.8 + R2() * 0.8 }); k++; }
      const face = faceOf(hillFn(H)), seen = reach(N, face, keep[0]);
      if (keep.every(([a, b]) => seen[b * N + a]) && plats.every(p_ => seen[Math.floor(p_.z) * N + Math.floor(p_.x)])) return H; }
    return []; }
  // 오아시스: 평평한 곳에 물웅덩이(못 지나감) + 젖은 모래·풀 띠 + 야자수·갈대
  function genOases(d, N, keep, hf, R) { const out = []; for (let k = 0, t = 0; k < (d.oases || 0) && t < 300; t++) { const r = 2.2 + R() * 1.1, x = 8 + R() * (N - 16), z = 8 + R() * (N - 16);
      if (keep.some(([a, b]) => Math.hypot(a + 0.5 - x, b + 0.5 - z) < r + 9) || out.some(o => Math.hypot(o.x - x, o.z - z) < o.r + r + 10)) continue; if (hf && [[0, 0], [r + 2, 0], [-r - 2, 0], [0, r + 2], [0, -r - 2]].some(([u, v]) => hf(x + u, z + v) > 0.05)) continue; out.push({ x, z, r }); k++; } return out; }
  // 오크 야영지: 평평하고 포털·도착지에서 먼 곳에 반지름 3~4칸
  function genCamps(d, N, keep, hf, R) { const out = []; for (let k = 0, t = 0; k < (d.camps || 0) && t < 400; t++) { const r = 3.1 + R() * 1.1, x = 9 + R() * (N - 18), z = 9 + R() * (N - 18);
      if (keep.some(([a, b]) => Math.hypot(a + 0.5 - x, b + 0.5 - z) < r + 10) || out.some(o => Math.hypot(o.x - x, o.z - z) < o.r + r + 12)) continue; if (hf && [[0, 0], [r + 2, 0], [-r - 2, 0], [0, r + 2], [0, -r - 2]].some(([u, v]) => hf(x + u, z + v) > 0.05)) continue; out.push({ x, z, r }); k++; } return out; }
  // ===== 본토던전 미로: 고정 시드(모든 PC 같은 모양) · 4칸 간격 격자(통로 3칸 · 벽 1칸), 일부 통로는 2칸으로 좁힘 · 되돌아오는 고리 길 · 넓은 방(보스 방은 3×3칸)
  // 입구(1층: 마을 포털 / 2층: 올라가는 계단)는 아래쪽 모서리, 1층 내려가는 계단은 입구에서 걸어서 가장 먼 곳
  function buildMaze(id, d) { let best = null;   // 계단까지 걸음이 충분히 길게 나올 때까지 (모든 PC가 같은 순서로 같은 결과)
    const score = r => (r.cover >= 0.42 ? 1000 : 0) + (d.floor === 1 ? r.farD : 0) + r.cover * 100;   // 광장 42% 이상 우선 · 1층은 계단이 멀수록
    for (let att = 0; att < 14; att++) { const r = genMaze(id, d, d.seed + att * 7919); if (!best || score(r) > score(best)) best = r; if (r.cover >= 0.45 && (d.floor !== 1 || r.farD >= 120)) { best = r; break; } }
    ARRIVE[id] = best.arrive; d.portals = best.portals; d.siteList = []; d.campList = []; delete best.farD; delete best.arrive; return best; }
  function genMaze(id, d, seed) { const N = d.N, R = rng(seed), C = (N - 1) >> 2;   // N=65 → 16×16칸
    const B = Array.from({ length: N }, () => Array(N).fill(1)), P = [];
    const openT = (i, j) => { if (i > 0 && j > 0 && i < N - 1 && j < N - 1) B[j][i] = 0; };
    const cell0 = (cx, cy) => [cx * 4 + 1, cy * 4 + 1], cid = (cx, cy) => cy * C + cx;
    for (let cy = 0; cy < C; cy++) for (let cx = 0; cx < C; cx++) { const [x, y] = cell0(cx, cy); for (let u = 0; u < 3; u++) for (let t = 0; t < 3; t++) openT(x + t, y + u); }
    const link = new Set(), lk = (a, b) => (a < b ? a + ':' + b : b + ':' + a);
    const carve = (ax, ay, bx, by) => { link.add(lk(cid(ax, ay), cid(bx, by))); if (ay === by) { const x = Math.max(ax, bx) * 4, [, y] = cell0(ax, ay); for (let u = 0; u < 3; u++) openT(x, y + u); } else { const y = Math.max(ay, by) * 4, [x] = cell0(ax, ay); for (let t = 0; t < 3; t++) openT(x + t, y); } };
    // 1) 완전 미로 (되돌아가며 파기)
    const ent = [C - 1, C - 1], seen = new Uint8Array(C * C), st = [ent]; seen[cid(...ent)] = 1;
    while (st.length) { const [cx, cy] = st[st.length - 1], nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [cx + a, cy + b]).filter(([a, b]) => a >= 0 && b >= 0 && a < C && b < C && !seen[cid(a, b)]);
      if (!nb.length) { st.pop(); continue; } const [nx, ny] = nb[Math.floor(R() * nb.length)]; carve(cx, cy, nx, ny); seen[cid(nx, ny)] = 1; st.push([nx, ny]); }
    // 2) 고리 길: 막힌 벽 일부를 뚫음 (막다른 길이 너무 많지 않게)
    for (let cy = 0; cy < C; cy++) for (let cx = 0; cx < C; cx++) for (const [a, b] of [[1, 0], [0, 1]]) { const nx = cx + a, ny = cy + b; if (nx >= C || ny >= C || link.has(lk(cid(cx, cy), cid(nx, ny)))) continue; if (R() < 0.06) carve(cx, cy, nx, ny); }
    // 칸 그래프 거리 (입구 기준)
    const adj = (cx, cy) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [cx + a, cy + b]).filter(([a, b]) => a >= 0 && b >= 0 && a < C && b < C && link.has(lk(cid(cx, cy), cid(a, b))));
    const dist = new Int16Array(C * C).fill(-1), q = [ent]; dist[cid(...ent)] = 0; for (let h = 0; h < q.length; h++) { const [cx, cy] = q[h]; for (const [a, b] of adj(cx, cy)) if (dist[cid(a, b)] < 0) { dist[cid(a, b)] = dist[cid(cx, cy)] + 1; q.push([a, b]); } }
    let maxD = 0; for (const v of dist) maxD = Math.max(maxD, v);
    // 3) 계단(1층) / 보스 방 위치: 가장 먼 칸들 중 직선으로도 가장 먼 곳
    const far = []; for (let cy = 0; cy < C; cy++) for (let cx = 0; cx < C; cx++) if (dist[cid(cx, cy)] >= maxD * 0.9) far.push([cx, cy]);
    far.sort((p_, r_) => Math.hypot(r_[0] - ent[0], r_[1] - ent[1]) - Math.hypot(p_[0] - ent[0], p_[1] - ent[1])); const farC = far[0];
    const rooms = [], inRoom = (cx, cy) => rooms.some(r_ => cx >= r_.x && cy >= r_.y && cx < r_.x + r_.w && cy < r_.y + r_.h);
    const room = (rx, ry, w, h, tag) => { for (let cy = ry; cy < ry + h; cy++) for (let cx = rx; cx < rx + w; cx++) { if (cx + 1 < rx + w) carve(cx, cy, cx + 1, cy); if (cy + 1 < ry + h) carve(cx, cy, cx, cy + 1); }
      for (let cy = ry; cy < ry + h - 1; cy++) for (let cx = rx; cx < rx + w - 1; cx++) openT((cx + 1) * 4, (cy + 1) * 4);   // 방 안의 벽 교차점(기둥 자리)도 뚫음
      const r_ = { x: rx, y: ry, w, h, tag, ci: rx * 4 + 1 + (w * 4 - 1) / 2 | 0, cj: ry * 4 + 1 + (h * 4 - 1) / 2 | 0 }; rooms.push(r_); return r_; };
    let hall = null;
    if (d.floor === 1) {   // 카스파 패밀리의 방: 입구에서 걸어서 55~80% 거리 · 계단 칸과 겹치지 않게
      const cand = []; for (let ry = 1; ry <= C - 4; ry++) for (let rx = 1; rx <= C - 4; rx++) { const dc = dist[cid(rx + 1, ry + 1)]; if (dc < maxD * 0.5 || dc > maxD * 0.82) continue; if (farC[0] >= rx - 1 && farC[0] <= rx + 3 && farC[1] >= ry - 1 && farC[1] <= ry + 3) continue; if (Math.abs(rx + 1 - ent[0]) + Math.abs(ry + 1 - ent[1]) < 8) continue; cand.push([rx, ry]); }
      const pk = cand.length ? cand[Math.floor(R() * cand.length)] : [3, 3]; hall = room(pk[0], pk[1], 3, 3, 'boss'); }
    else {   // 데스나이트의 방: 가장 먼 칸을 품는 3×3
      const rx = Math.max(0, Math.min(C - 3, farC[0] - 1)), ry = Math.max(0, Math.min(C - 3, farC[1] - 1)); hall = room(rx, ry, 3, 3, 'boss'); }
    // 광장 (v107): 바닥 칸의 절반 가까이를 3~5칸 크기 광장으로 — 광장 사이는 골목 · 입구 바로 앞은 골목
    const plazaGoal = Math.round(C * C * 0.5), plazas = []; let cover = rooms.reduce((s_, r_) => s_ + r_.w * r_.h, 0);
    for (let t = 0; cover < plazaGoal && t < 2500; t++) { const w = 3 + Math.floor(R() * 3), h = 3 + Math.floor(R() * 3), rx = Math.floor(R() * (C - w + 1)), ry = Math.floor(R() * (C - h + 1));
      if (rooms.some(r_ => rx < r_.x + r_.w + 1 && rx + w + 1 > r_.x && ry < r_.y + r_.h + 1 && ry + h + 1 > r_.y)) continue;
      if (rx + w > ent[0] - 1 && ry + h > ent[1] - 1) continue;
      if (d.floor === 1 && farC[0] >= rx && farC[0] < rx + w && farC[1] >= ry && farC[1] < ry + h) continue;
      plazas.push(room(rx, ry, w, h, 'plaza')); cover += w * h; }
    // 광장 네 귀퉁이 기둥 (2개는 횃불) — 넓은 광장이 너무 휑하지 않게 · 빛
    for (const pz of plazas) { const ix0 = pz.x + 1, iy0 = pz.y + 1, ix1 = pz.x + pz.w - 1, iy1 = pz.y + pz.h - 1; let lit = 0;
      for (const [ix, iy] of [[ix0, iy0], [ix1, iy1], [ix1, iy0], [ix0, iy1]]) { const i = ix * 4, j = iy * 4; if (!B[j] || B[j][i]) continue; B[j][i] = 1; const pr = { type: 'dwall', v: 0, i, j, pillar: true }; if (lit < 2) { pr.torch = lit ? 'R' : 'L'; lit++; } P.push(pr); } }
    // 4) 좁은 길: 칸의 막힌 쪽 한 줄을 벽으로 채워 통로를 2칸으로 (방·입구·계단 칸은 제외)
    for (let cy = 0; cy < C; cy++) for (let cx = 0; cx < C; cx++) { if (inRoom(cx, cy) || (cx === ent[0] && cy === ent[1]) || (cx === farC[0] && cy === farC[1]) || R() > 0.22) continue;
      const sides = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => { const nx = cx + a, ny = cy + b; return !(nx >= 0 && ny >= 0 && nx < C && ny < C && link.has(lk(cid(cx, cy), cid(nx, ny)))); }); if (!sides.length) continue;
      const [a, b] = sides[Math.floor(R() * sides.length)], [x, y] = cell0(cx, cy); for (let u = 0; u < 3; u++) { const i = a ? (a > 0 ? x + 2 : x) : x + u, j = b ? (b > 0 ? y + 2 : y) : y + u; B[j][i] = 1; } }
    // 입구 · 계단: 1층 계단은 입구에서 실제로 걸어서 가장 먼 칸 (대각선은 모서리를 못 자름)
    const [ex, ey] = cell0(...ent), portals = []; let arrive, farD = 0;
    const tileDist = (si, sj) => { const D = new Int16Array(N * N).fill(-1), qq = [si, sj]; D[sj * N + si] = 0; const ok = (i, j) => i >= 0 && j >= 0 && i < N && j < N && !B[j][i];
      for (let h = 0; h < qq.length; h += 2) { const i = qq[h], j = qq[h + 1], dd = D[j * N + i] + 1; for (const [a, b] of DIRS8) { const x = i + a, y = j + b; if (!ok(x, y) || D[y * N + x] >= 0) continue; if (a && b && (!ok(i + a, j) || !ok(i, j + b))) continue; D[y * N + x] = dd; qq.push(x, y); } } return D; };
    if (d.floor === 1) { portals.push({ i: ex + 2, j: ey + 2, to: 'town', label: '▼ 마을로' }); const D = tileDist(ex + 1, ey + 1); let bi = 0; for (let k = 0; k < N * N; k++) if (D[k] > D[bi]) bi = k;
      const si = bi % N, sj = (bi / N) | 0; farD = D[bi]; let ar = null; for (const [a, b] of DIRS8) { const x = si + a, y = sj + b; if (x > 0 && y > 0 && x < N - 1 && y < N - 1 && !B[y][x] && (!ar || D[y * N + x] < D[ar[1] * N + ar[0]])) ar = [x, y]; }
      portals.push({ i: si, j: sj, to: d.down, label: '▼ 2층으로 내려가는 계단', stairs: 'down' }); arrive = { town: [ex + 1, ey + 1], [d.down]: ar || [si, sj] }; }
    else { portals.push({ i: ex + 2, j: ey + 2, to: d.up, label: '▲ 1층으로 올라가는 계단', stairs: 'up' }); arrive = { [d.up]: [ex + 1, ey + 1], town: [ex + 1, ey + 1] }; }
    for (const p of portals) B[p.j][p.i] = 0;
    // 보스 방 장식 기둥 4개 (가운데에서 대각선으로) — 길은 막지 않음
    if (hall) for (const [a, b] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) { const i = hall.ci + a, j = hall.cj + b; if (B[j] && !B[j][i]) { B[j][i] = 1; P.push({ type: 'dwall', v: 0, i, j, pillar: true }); } }
    // 연결 확인: 입구에서 못 가는 빈 칸은 막음 (몬스터가 갇혀 생기지 않게)
    { const s0 = arrive[Object.keys(arrive)[0]], vis = new Uint8Array(N * N), qq = [s0]; vis[s0[1] * N + s0[0]] = 1;
      for (let h = 0; h < qq.length; h++) { const [i, j] = qq[h]; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = j + b; if (x < 0 || y < 0 || x >= N || y >= N || B[y][x] || vis[y * N + x]) continue; vis[y * N + x] = 1; qq.push([x, y]); } }
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (!B[j][i] && !vis[j * N + i]) B[j][i] = 1; }
    // 벽 소품: 바닥과 닿은 벽만 그림 (안쪽에 파묻힌 벽은 안 그림) · 변형 · 횃불(통로 쪽 면에, 서로 7칸 이상 떨어지게)
    const flr = (i, j) => i >= 0 && j >= 0 && i < N && j < N && !B[j][i], torches = [], hasP = new Set(P.map(p_ => p_.j * N + p_.i));
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { if (!B[j][i] || hasP.has(j * N + i)) continue; let nb = false; for (const [a, b] of DIRS8) if (flr(i + a, j + b)) { nb = true; break; } if (!nb) continue;
      const r = R(), v = r < 0.5 ? 0 : r < 0.62 ? 1 : r < 0.74 ? 2 : r < 0.84 ? 3 : r < 0.88 ? 4 : r < 0.93 ? 5 : 6; const p_ = { type: 'dwall', v, i, j };
      const fL = flr(i, j + 1), fR = flr(i + 1, j); if ((fL || fR) && R() < 0.07 && torches.every(t_ => Math.abs(t_.i - i) + Math.abs(t_.j - j) >= 8)) { p_.torch = fL && (!fR || R() < 0.5) ? 'L' : 'R'; torches.push(p_); }
      P.push(p_); }
    // 바닥 장식 (안 막음): 시체·뼈·해골·꽂힌 무기 · 방엔 더 많이 · 보스 방엔 해골 더미
    const keepT = portals.map(p => [p.i, p.j]).concat(Object.values(arrive));
    const nearKeep = (i, j, r) => keepT.some(([a, b]) => Math.max(Math.abs(a - i), Math.abs(b - j)) <= r);
    for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) { if (B[j][i] || nearKeep(i, j, 2)) continue; const rm = rooms.find(r_ => i >= r_.x * 4 + 1 && j >= r_.y * 4 + 1 && i < (r_.x + r_.w) * 4 && j < (r_.y + r_.h) * 4), r = R() * (rm ? 0.55 : 1);
      const t = r < 0.012 ? ['corpse', Math.floor(R() * 3)] : r < 0.026 ? ['bones', 0] : r < 0.034 ? ['skull', 0] : r < 0.038 ? ['weapons', Math.floor(R() * 2)] : null; if (t) P.push({ type: t[0], v: t[1], i, j, deco: true }); }
    if (hall) P.push({ type: 'skullpile', v: 0, i: hall.ci + 1, j: hall.cj - 1, deco: true });
    // 몬스터: 입구·계단 6칸 밖 무작위 (모든 PC 같은 자리)
    const mobs = [], taken = new Set();
    const free = () => { for (let t = 0; t < 400; t++) { const i = 1 + Math.floor(R() * (N - 2)), j = 1 + Math.floor(R() * (N - 2)); if (B[j][i] || taken.has(j * N + i) || nearKeep(i, j, 6)) continue; taken.add(j * N + i); return [i, j]; } return null; };
    const add = (kind, p) => { const m = mkMob(kind, ...p); m.home = p; m.uid = mobs.length; mobs.push(m); return m; };
    d.mobs.forEach(([k, n]) => { for (let q2 = 0; q2 < n; q2++) { const p = free(); if (p) add(k, p); } });
    return { id, N, name: d.name, blocked: B, props: P, ground: null, def: d, mobs, portals, hmap: null, water: new Set(), oases: [], torches, hall: hall ? [hall.ci, hall.cj] : null, rooms, farD, arrive, cover: rooms.filter(r_ => r_.tag === 'plaza').reduce((s_, r_) => s_ + r_.w * r_.h, 0) / (C * C) }; }
  function build(id) { if (DEF[id] && DEF[id].maze) return buildMaze(id, DEF[id]); const d = DEF[id], N = d.N || N0, B = Array.from({ length: N }, () => Array(N).fill(0)), P = [];
    const keep = [...Object.values(ARRIVE[id] || {}), ...d.portals.map(p => [p.i, p.j])];
    const nearKeep = (i, j) => keep.some(([a, b]) => Math.max(Math.abs(a - i), Math.abs(b - j)) <= 3);
    if (d.tier === 1) d.hills = null; else if (d.tier === 2 && !d.hills) d.hills = genTerrain(d, N, keep);
    const R = rng(d.seed); let hmap = null, hf = null, face = () => false;
    if (d.hills && d.hills.length) { const w = N + 1; hmap = new Float32Array(w * w); hf = hillFn(d.hills); for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) hmap[j * w + i] = hf(i, j);
      face = faceOf(hf); for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) if (face(i, j)) B[j][i] = 1; }   // 절벽면(가장 가파른 한 줄)만 못 지나감
    const water = new Set(); if (d.sand || d.snow) { d.oasisList = d.oasisList || genOases(d, N, keep, hf, rng(d.seed + 5)); for (const o of d.oasisList) for (let j = Math.floor(o.z - o.r - 1); j <= o.z + o.r + 1; j++) for (let i = Math.floor(o.x - o.r - 1); i <= o.x + o.r + 1; i++) if (i > 0 && j > 0 && i < N - 1 && j < N - 1 && Math.hypot(i + 0.5 - o.x, j + 0.5 - o.z) <= o.r) { water.add(j * 1000 + i); B[j][i] = 1; } }
    const nearOasis = (i, j, pad) => (d.oasisList || []).some(o => Math.hypot(i + 0.5 - o.x, j + 0.5 - o.z) <= o.r + pad);
    if (d.forest || d.snow) d.campList = d.campList || genCamps(d, N, keep, hf, rng(d.seed + 5));
    if (d.gore && !d.siteList) { const all = genCamps({ camps: (d.camps || 0) + (d.sites || 0) }, N, keep, hf, rng(d.seed + 5)); d.campList = all.slice(0, d.camps || 0); d.siteList = all.slice(d.camps || 0); }   // 야영지·살육터가 서로 겹치지 않게 한 번에 뽑음
    const nearSite = (i, j, pad) => (d.siteList || []).some(o => Math.hypot(i + 0.5 - o.x, j + 0.5 - o.z) <= o.r + pad);
    const nearCamp = (i, j, pad) => (d.campList || []).some(o => Math.hypot(i + 0.5 - o.x, j + 0.5 - o.z) <= o.r + pad);
    const road = (i, j) => Math.abs((i - j) / 2 - Math.sin((i + j) * 0.17) * 4);   // 구불구불한 큰 길 (남→북)
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      if (i === 0 || j === 0 || i === N - 1 || j === N - 1) { B[j][i] = 1; if ((i + j) % 2 === 0 || d.forest) P.push({ type: d.sand ? (R() < 0.7 ? 'rock' : 'bush') : d.forest ? (R() < 0.85 ? 'tree' : 'bush') : d.gore ? (R() < 0.45 ? 'deadtree' : 'rock') : R() < 0.8 ? 'tree' : 'rock', v: Math.floor(R() * 3), i, j }); continue; }
      if (B[j][i] || nearKeep(i, j) || road(i, j) < 1.6) continue;
      if (d.sand) { if (nearOasis(i, j, 2.6)) continue; const r = R();   // 사막: 선인장 · 죽은 나무 · 바위 기둥 · 사암 바위 · 마른 덤불 · (안 막는) 해골·뼈
        const t = r < 0.016 ? ['cactus', Math.floor(R() * 3)] : r < 0.02 ? ['deadtree', 0] : r < 0.024 ? ['spire', Math.floor(R() * 2)] : r < 0.034 ? ['rock', Math.floor(R() * 3)] : r < 0.042 ? ['bush', Math.floor(R() * 3)] : r < 0.047 ? ['skull', 0] : null;
        if (t) { const deco = t[0] === 'skull'; P.push({ type: t[0], v: t[1], i, j, deco }); if (!deco) B[j][i] = 1; } continue; }
      if (d.gore) { if (nearCamp(i, j, 1.4) || nearSite(i, j, 1.0)) continue; const r = R();   // 살육터: 고목 1.5% · 바위 · 그루터기 · 뿌리 · (안 막는) 시체·뼈·해골·꽂힌 무기·마른 가지 · 꼬챙이 · 교수대 우리
        const t = r < 0.015 ? ['deadtree', Math.floor(R() * 3)] : r < 0.026 ? ['rock', Math.floor(R() * 3)] : r < 0.032 ? ['stump', Math.floor(R() * 2)] : r < 0.035 ? ['root', 0] : r < 0.042 ? ['corpse', Math.floor(R() * 3)] : r < 0.05 ? ['bones', 0] : r < 0.054 ? ['skull', 0] : r < 0.058 ? ['weapons', Math.floor(R() * 2)] : r < 0.064 ? ['branch', 0] : r < 0.067 ? ['stakes', Math.floor(R() * 2)] : r < 0.0682 ? ['gibbet', 0] : null;
        if (t) { const deco = ['corpse', 'bones', 'skull', 'weapons', 'branch'].includes(t[0]); P.push({ type: t[0], v: t[1], i, j, deco }); if (!deco) B[j][i] = 1; } continue; }
      if (d.forest) { if (nearCamp(i, j, 1.4)) continue; const r = R();   // 오크숲: 나무 7.5% · 덤불 4% · 바위 1% · 그루터기/쓰러진 통나무 · (안 막는) 뼈 무더기
        const t = r < 0.072 ? ['tree', Math.floor(R() * 3)] : r < 0.082 ? ['sapling', 0] : r < 0.11 ? ['bush', Math.floor(R() * 3)] : r < 0.14 ? ['fern', 0] : r < 0.15 ? ['rock', Math.floor(R() * 3)] : r < 0.156 ? ['stump', Math.floor(R() * 2)] : r < 0.159 ? ['bones', 0] : null;
        if (t) { const deco = t[0] === 'bones' || t[0] === 'fern'; P.push({ type: t[0], v: t[1], i, j, deco }); if (!deco) B[j][i] = 1; } continue; }
      const r = R(); const t = r < 0.045 ? 'tree' : r < 0.065 ? 'rock' : r < 0.095 ? 'bush' : null;
      if (t) { P.push({ type: t, v: Math.floor(R() * 3), i, j }); B[j][i] = 1; } }
    // 오아시스 둘레: 야자수(막음) · 갈대(안 막음)
    if (!d.snow) for (const o of d.oasisList || []) { for (let q = 0, n = 3 + Math.floor(R() * 3); q < n; q++) { const a = R() * 6.283, rr = o.r + 1.1 + R() * 1.2, i = Math.floor(o.x + Math.cos(a) * rr), j = Math.floor(o.z + Math.sin(a) * rr); if (!B[j][i] && !nearKeep(i, j)) { P.push({ type: 'palm', v: q % 2, i, j }); B[j][i] = 1; } }
      for (let q = 0; q < 6; q++) { const a = R() * 6.283, rr = o.r + 0.55, i = Math.floor(o.x + Math.cos(a) * rr), j = Math.floor(o.z + Math.sin(a) * rr); if (!B[j][i]) P.push({ type: 'reeds', v: 0, i, j, deco: true }); } }
    // 오크 야영지: 가운데 모닥불, 둘레에 천막 3·토템·깃발·무기 걸이, 뼈 무더기, 한쪽엔 문을 낸 목책
    // 살육터: 가운데 해골 더미, 둘레에 시체 3~4구·꽂힌 무기·뼈, 바깥쪽에 꼬챙이 둘·교수대 우리·정육 걸이
    for (const st of d.siteList || []) { const Rc = rng(d.seed * 17 + Math.floor(st.x) * 5 + Math.floor(st.z));
      const put = (type, v, i, j, deco) => { if (i < 2 || j < 2 || i >= N - 2 || j >= N - 2 || B[j][i] || nearKeep(i, j) || P.some(q => q.i === i && q.j === j)) return false; P.push({ type, v, i, j, deco }); if (!deco) B[j][i] = 1; return true; };
      const at = (a, rr) => [Math.round(st.x - 0.5 + Math.cos(a) * rr), Math.round(st.z - 0.5 + Math.sin(a) * rr)]; const a0 = Rc() * 6.283;
      put('skullpile', 0, Math.floor(st.x), Math.floor(st.z), true);
      for (let q = 0; q < 3 + (Rc() < 0.5 ? 1 : 0); q++) put('corpse', q % 3, ...at(a0 + q * 1.7 + (Rc() - 0.5) * 0.5, 1.6 + Rc() * (st.r - 1.4)), true);
      for (let q = 0; q < 2; q++) put('weapons', q, ...at(Rc() * 6.283, 1.2 + Rc() * (st.r - 1)), true);
      for (let q = 0; q < 2; q++) put('bones', 0, ...at(Rc() * 6.283, 1 + Rc() * st.r), true);
      put('stakes', 0, ...at(a0 + 0.8, st.r + 0.6)); put('stakes', 1, ...at(a0 + 2.6, st.r + 0.8)); put('gibbet', 0, ...at(a0 + 4.1, st.r + 0.5)); put('meatrack', 0, ...at(a0 + 5.4, st.r + 0.7)); }
    // 버그베어 야영지: 모닥불 · 가죽 천막 2~3 · 정육 걸이 · 해골 더미 · 무기 걸이 · 꼬챙이 울타리
    if (d.gore) for (const cp of d.campList || []) { const Rc = rng(d.seed * 13 + Math.floor(cp.x) * 7 + Math.floor(cp.z));
      const put = (type, v, i, j, deco) => { if (i < 2 || j < 2 || i >= N - 2 || j >= N - 2 || B[j][i] || nearKeep(i, j) || P.some(q => q.i === i && q.j === j)) return false; P.push({ type, v, i, j, deco }); if (!deco) B[j][i] = 1; return true; };
      const at = (a, rr) => [Math.round(cp.x - 0.5 + Math.cos(a) * rr), Math.round(cp.z - 0.5 + Math.sin(a) * rr)];
      put('bonfire', 0, Math.floor(cp.x), Math.floor(cp.z)); const a0 = Rc() * 6.283;
      for (let q = 0; q < 2 + (Rc() < 0.5 ? 1 : 0); q++) put('tent', q % 2, ...at(a0 + q * 2.1 + (Rc() - 0.5) * 0.4, cp.r - 0.4));
      put('meatrack', 0, ...at(a0 + 1.05, cp.r - 0.9)); put('skullpile', 0, ...at(a0 + 3.15, cp.r - 1.4), true); put('rack', 0, ...at(a0 + 5.2, cp.r - 1.0));
      for (let q = 0; q < 2; q++) put('corpse', (q + 1) % 3, ...at(Rc() * 6.283, 1.6 + Rc() * (cp.r - 2)), true);
      for (let q = -4; q <= 4; q++) { if (Math.abs(q) <= 1) continue; put('stakes', 1, ...at(a0 + Math.PI + 0.55 + q * 0.2, cp.r + 1.5)); } }
    if (!d.gore) for (const cp of d.campList || []) { const Rc = rng(d.seed * 13 + Math.floor(cp.x) * 7 + Math.floor(cp.z));
      const put = (type, v, i, j, deco) => { if (i < 2 || j < 2 || i >= N - 2 || j >= N - 2 || B[j][i] || nearKeep(i, j) || P.some(q => q.i === i && q.j === j)) return false; P.push({ type, v, i, j, deco }); if (!deco) B[j][i] = 1; return true; };
      const at = (a, rr) => [Math.round(cp.x - 0.5 + Math.cos(a) * rr), Math.round(cp.z - 0.5 + Math.sin(a) * rr)];
      put('bonfire', 0, Math.floor(cp.x), Math.floor(cp.z)); const a0 = Rc() * 6.283;
      for (let q = 0; q < 3; q++) put('tent', q % 2, ...at(a0 + q * 2.1 + (Rc() - 0.5) * 0.4, cp.r - 0.4));
      put(d.snow ? 'banner' : 'totem', 0, ...at(a0 + 1.05, cp.r - 0.9)); put('banner', 0, ...at(a0 + 3.15, cp.r - 1.1)); put('rack', 0, ...at(a0 + 5.2, cp.r - 1.0));
      for (let q = 0; q < 3; q++) put('bones', 0, ...at(Rc() * 6.283, 1.3 + Rc() * (cp.r - 1.6)), true);
      for (let q = -4; q <= 4; q++) { if (Math.abs(q) <= 1) continue; put('palisade', q < 0 ? 0 : 1, ...at(a0 + Math.PI + 0.55 + q * 0.2, cp.r + 1.5)); } }
    // 절벽면 일부엔 바위 (나머지는 맨 절벽)
    for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) if (face(i, j) && !P.some(q => q.i === i && q.j === j) && (i * 7 + j * 3) % 3 !== 0) P.push({ type: d.sand ? 'rock' : d.forest ? (R() < 0.5 ? 'rock' : R() < 0.5 ? 'tree' : 'bush') : d.gore ? (R() < 0.6 ? 'rock' : 'deadtree') : R() < 0.75 ? 'rock' : 'bush', v: Math.floor(R() * 3), i, j });
    // 연결 확인: 포털·도착지가 막혀 있으면 길에 놓인 소품을 치움 → 그래도 못 가는 빈 칸은 막아 둠(몬스터가 갇혀 생기지 않게)
    { const terrainBlk = (i, j) => face(i, j) || water.has(j * 1000 + i); let seen = reach(N, (i, j) => B[j][i], keep[0]);
      for (const [a, b] of keep) { if (seen[b * N + a]) continue; const prev = new Int32Array(N * N).fill(-1), q = [keep[0]], st = keep[0][1] * N + keep[0][0]; prev[st] = st;
        while (q.length) { const [i, j] = q.shift(); if (i === a && j === b) break; for (const [di, dj] of DIRS8) { const x = i + di, y = j + dj; if (x < 1 || y < 1 || x >= N - 1 || y >= N - 1 || terrainBlk(x, y) || prev[y * N + x] >= 0) continue; prev[y * N + x] = j * N + i; q.push([x, y]); } }
        let k = b * N + a; while (prev[k] >= 0 && k !== st) { const i = k % N, j = (k / N) | 0; if (B[j][i] && !terrainBlk(i, j)) { B[j][i] = 0; for (let m = P.length - 1; m >= 0; m--) if (P[m].i === i && P[m].j === j && !P[m].deco) P.splice(m, 1); } k = prev[k]; } }
      seen = reach(N, (i, j) => B[j][i], keep[0]); for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) if (!B[j][i] && !seen[j * N + i]) B[j][i] = 1; }
    const mobs = [], taken = new Set();
    const free = (ci, cj, r) => { for (let t = 0; t < 300; t++) {
      const i = ci == null ? 2 + Math.floor(R() * (N - 4)) : ci + Math.round((R() * 2 - 1) * r), j = cj == null ? 2 + Math.floor(R() * (N - 4)) : cj + Math.round((R() * 2 - 1) * r);
      if (i < 1 || j < 1 || i >= N - 1 || j >= N - 1 || B[j][i] || taken.has(j * N + i) || keep.some(([a, b]) => Math.max(Math.abs(a - i), Math.abs(b - j)) <= 6)) continue;
      taken.add(j * N + i); return [i, j]; } return null; };
    const add = (kind, p) => { const m = mkMob(kind, ...p); m.home = p; m.uid = mobs.length; mobs.push(m); return m; };   // 지역 처음 몬스터는 순서대로 번호 (모두 같은 시드라 같은 번호)
    d.mobs.forEach(([k, n]) => { for (let q = 0; q < n; q++) { const p = free(); if (p) add(k, p); } });
    d.groups.forEach(([lk, mem, n]) => { for (let q = 0; q < n; q++) { const p = free(); if (!p) continue; const L = add(lk, p), grp = [L]; L.grp = grp;
      mem.forEach(([k, c]) => { for (let u = 0; u < c; u++) { const s = free(p[0], p[1], 2); if (!s) continue; const m = add(k, s); m.leader = L; m.grp = grp; grp.push(m); } }); } });
    return { id, N, name: d.name, blocked: B, props: P, ground: null, def: d, mobs, portals: d.portals, hmap, water, oases: d.oasisList || [] }; }
  const DEMO = !!window.DEMO_MODE;      // 데모 페이지: 셸로브 테스트용으로 2구간에 항상 등장
  const Z = {};
  // 보스: 셸로브(이야기섬 2구간, 1~30분) · 거대 여왕개미(사막 2구간, 잡은 뒤 3시간~3시간30분 · 첫 등장 5~20분). 데모 페이지는 짧게(셸로브 20초, 여왕개미 40초)
  // 보스 시간표 (모든 PC 공통): 시계 기준 구간(P초)마다 같은 시각(구간 안 R초 범위)·같은 자리에 등장, 잡힐 때까지 있음
  // 누가 잡으면 '잡힌 구간 번호'를 presence(bk)로 서로 알려서 모두 같은 상태 — 이 기기에도 기억 (aden_bk)
  const BOSS = {
    shelob: { zone: 2, ent: null, P: DEMO ? 90 : 1800, R: DEMO ? 60 : 1800, title: '대왕거미 셸로브', where: '이야기섬 2구간', againTxt: DEMO ? '데모: 1~3분 안에' : '다음 30분 구간 안에' },
    queen_ant: { zone: 4, ent: null, P: DEMO ? 180 : 12600, R: DEMO ? 60 : 1800, title: '거대 여왕개미', where: '사막필드 2구간', againTxt: DEMO ? '데모: 3~4분 뒤' : '약 3시간 30분 뒤' },
    ogre: { zone: 6, ent: null, P: DEMO ? 180 : 12600, R: DEMO ? 60 : 1800, title: '오우거', where: '오크숲 2구간', againTxt: DEMO ? '데모: 3~4분 뒤' : '약 3시간 30분 뒤' },
    baphomet: { zone: 8, ent: null, P: DEMO ? 180 : 12600, R: DEMO ? 60 : 1800, title: '바포메트', where: '버그베어밭 2구간', againTxt: DEMO ? '데모: 3~4분 뒤' : '약 3시간 30분 뒤' },
    kaspar: { zone: 9, ent: null, P: DEMO ? 180 : 7200, R: DEMO ? 60 : 900, title: '카스파 패밀리', where: '본토던전 1층', againTxt: DEMO ? '데모: 3~4분 뒤' : '약 2시간 뒤', fam: ['kaspar', 'merkyor', 'balthazar', 'sema'] },
    ice_queen: { zone: 12, ent: null, P: DEMO ? 180 : 10800, R: DEMO ? 60 : 1200, title: '얼음여왕', where: '오렌설원지역 2구역', againTxt: DEMO ? '데모: 3~4분 뒤' : '약 3시간 뒤' },
    deathknight: { zone: 10, ent: null, P: DEMO ? 180 : 10800, R: DEMO ? 60 : 1200, title: '데스나이트', where: '본토던전 2층', againTxt: DEMO ? '데모: 3~4분 뒤' : '약 3시간 뒤' },
  };
  const KILL = (() => { try { return JSON.parse(localStorage.getItem('aden_bk') || '{}') || {}; } catch (e) { return {}; } })(), keepK = () => { try { localStorage.setItem('aden_bk', JSON.stringify(KILL)); } catch (e) {} };
  const hsh = str => { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
  const rngOf = seed => () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const nowS = () => Date.now() / 1000, atOf = (k, n) => n * BOSS[k].P + rngOf(hsh(k + ':' + n))() * BOSS[k].R;
  const lastSlot = k => { const t = nowS(); let n = Math.floor(t / BOSS[k].P); if (atOf(k, n) > t) n--; return n; };   // 이미 등장 시각이 지난 가장 최근 구간
  const killedK = k => (KILL[k] && KILL[k].k) || -1, isAlive = k => lastSlot(k) > killedK(k);
  const nextAt = k => { const t = nowS(); let n = Math.floor(t / BOSS[k].P); if (atOf(k, n) <= t) n++; return atOf(k, n); };
  const BUID = k => 90000 + Object.keys(BOSS).indexOf(k);
  function removeBoss(k) { const B = BOSS[k], z = get(B.zone), e = B.ent; if (B.fam) for (const m of z.mobs.filter(m_ => B.fam.includes(m_.kind) && m_ !== e)) { m.dead = true; m.gone = true; z.mobs.splice(z.mobs.indexOf(m), 1); if (hero.target === m) hero.target = null; } if (e) { e.dead = true; e.gone = true; const i = z.mobs.indexOf(e); if (i >= 0) z.mobs.splice(i, 1); if (hero.target === e) hero.target = null; } B.ent = null; }
  const get = id => Z[id] || (Z[id] = build(id));
  function enter(id, from) { const z = get(id); if (!z.ground && im.ground.complete) z.ground = buildGround(z.def, z.hmap);
    ISLE = z; setGeom(z.N); SCENE = 'field'; ZONE = z.name; blockedT = z.blocked; PROPS = z.props; foxes = z.mobs; arrows.length = 0;
    const [i, j] = ARRIVE[id][from] || ARRIVE[id].town || [37, 37];
    hero.i = hero.fi = i; hero.j = hero.fj = j; hero.x = i + 0.5; hero.z = j + 0.5; hero.t = 1; hero.target = null; hero.atk = null; moveGoal = null; holding = false; hero.row = 5;
    const c = W2P(hero.x, hero.z); cam[0] = c[0]; cam[1] = c[1] - 20;
    say(`***** ${z.name}에 입장했습니다 *****`, '#f2e6a8');
    if (z.def.hello) say(z.def.hello, '#f0c080');
    else if (id === 1) say('먼저 덤비는 몬스터가 없는 초보 사냥터입니다. 북쪽 끝 포털로 2구간에 갈 수 있어요.', '#9fd0e8');
    else say('무리 중 하나를 때리면 무리 전체가 덤빕니다. 보스 셸로브를 조심하세요!', '#f0c080'); }
  // 보스 등장: 자리도 모든 PC가 같게 (구간 번호로 정한 무작위) · 막 등장한 순간 근처(12칸)에 있으면 극적인 연출
  function spawnBoss(kind, n, fresh) { const B = BOSS[kind], z = get(B.zone);
    const ex = z.mobs.find(m => m.kind === kind && !m.dead && !m.gone && !m.summoned); if (ex) { B.ent = ex; return; }   // 호스트에게서 받은 보스가 이미 있으면 그대로
    const R = rngOf(hsh(kind + ':pos:' + n)); let p = null; const ok = (i, j) => i > 1 && j > 1 && i < z.N - 2 && j < z.N - 2 && !z.blocked[j][i] && !z.portals.some(q => cheb(i, j, q.i, q.j) < 6);
    for (let t = 0; t < 800 && !p; t++) { const i = 2 + Math.floor(R() * (z.N - 4)), j = 2 + Math.floor(R() * (z.N - 4)); if (ok(i, j)) p = [i, j]; } if (!p) p = [z.N >> 1, z.N >> 1];
    if (z.hall) p = [z.hall[0], z.hall[1]];   // 던전 보스: 보스 방 가운데
    const boss = mkMob(kind, ...p); boss.home = p; boss.uid = BUID(kind); z.mobs.push(boss); B.ent = boss;
    if (B.fam) { const grp = [boss]; boss.grp = grp; B.fam.slice(1).forEach((k2, q) => { const [a, b] = [[2, 0], [0, 2], [2, 2]][q]; let pp = [p[0] + a, p[1] + b]; if (!ok(pp[0], pp[1])) pp = [p[0] - a, p[1] - b]; if (!ok(pp[0], pp[1])) pp = p;
      const m = mkMob(k2, ...pp); m.home = pp; m.uid = BUID(kind) + 100 + q; m.leader = boss; m.grp = grp; grp.push(m); z.mobs.push(m); }); }
    if (fresh && ISLE === z && cheb(p[0], p[1], hero.i, hero.j) <= 12) { const [bx, by] = W2P(p[0] + 0.5, p[1] + 0.5); shake = 0.7; impact(bx, by, 'quake', '#6a4a2a'); impact(bx, by - 20, 'bolt', '#ff7a5a');
      for (let q = 0; q < 26; q++) { const a = Math.random() * 6.283, sp = 40 + Math.random() * 70; parts.push({ x: bx + Math.cos(a) * 10, y: by, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.4 - 20, life: 0.9, max: 0.9, dust: true }); }
      if (AC && SFX_ON) { const t = AC.currentTime; nz(t, 1.1, 300, 70, 0.7); tone(t, 'sawtooth', 110, 45, 1.0, 0.25); tone(t + 0.15, 'sawtooth', 160, 60, 0.8, 0.12); }
      say(`***** 땅이 갈라지며 바로 근처에서 ${JOSA(B.title, '이', '가')} 튀어나왔습니다! *****`, '#ff5040'); } }
  function prebake(id) { const z = get(id); if (!z.ground && im.ground.complete) z.ground = buildGround(z.def, z.hmap); }
  return {
    enter, prebake, def: id => DEF[id],
    bossDown(kind, by) { { const fk = Object.keys(BOSS).find(k => BOSS[k].fam && BOSS[k].fam.includes(kind)); if (fk) { const F = BOSS[fk], left = get(F.zone).mobs.filter(m => F.fam.includes(m.kind) && !m.dead && !m.gone).length;
        if (left) { say(`${MOB[kind].name}을(를) 쓰러뜨렸습니다! 카스파 패밀리가 아직 ${left}명 남았습니다.`, '#f2e6a8'); return; } kind = fk; } }
      const B = BOSS[kind || 'shelob']; if (!B) return; TELE.ev('bossdown', { b: kind || 'shelob', by: String(by || PNAME()).slice(0, 12) }); B.ent = null; KILL[kind] = { k: Math.max(killedK(kind), lastSlot(kind)), by: String(by || PNAME()).slice(0, 12) }; keepK(); B.was = false; announce(`${KILL[kind].by}님이 ${JOSA(B.title, '을', '를')} 토벌했습니다!`, '#ffd86a', 'boss'); say(`${B.title.split(' ').pop()}${kind === 'queen_ant' ? '를' : '를'} 쓰러뜨렸습니다! (${B.againTxt} 다시 나타납니다)`, '#f2e6a8'); },
    bossTimers: () => Object.fromEntries(Object.keys(BOSS).map(k => [k, isAlive(k) ? 'alive' : Math.round(nextAt(k) - nowS())])),
    bossKills: () => KILL,
    // 다른 사람이 잡은 소식: 더 최근 구간이면 받아들이고, 내 화면의 보스는 치움 + 토벌 공지
    mergeKills(o) { if (!o || typeof o !== 'object') return; for (const k in o) { const B = BOSS[k], x = o[k]; if (!B || !x || !(+x.k > killedK(k))) continue; const was = isAlive(k);
        KILL[k] = { k: +x.k, by: String(x.by || '누군가').slice(0, 12) }; keepK(); if (was && !isAlive(k)) { announce(`${KILL[k].by}님이 ${JOSA(B.title, '을', '를')} 토벌했습니다!`, '#ffd86a', 'boss'); B.was = false; if (B.ent && !B.ent.dead) removeBoss(k); } } },
    tick(dt) {
      for (const k in BOSS) { const B = BOSS[k], alive = isAlive(k), fresh = B.was === false && alive; if (B.was === undefined) B.was = alive;
        if (B.fam && B.ent && (B.ent.dead || B.ent.gone)) { const nx = get(B.zone).mobs.find(m => B.fam.includes(m.kind) && !m.dead && !m.gone); if (nx) B.ent = nx; }   // 카스파 패밀리: 남은 형제가 있으면 계속
        if (fresh) announce(`${B.where} 어딘가에 ${JOSA(B.title, '이', '가')} 나타났습니다!`, '#ff7a5a', 'boss'); B.was = alive;   // 모든 PC가 같은 시각에 공지
        if (B.ent && (B.ent.gone || B.ent.dead)) { if (B.ent.gone) B.ent = null; continue; }
        if (alive && !B.ent && !NET.guestIn('isle' + B.zone)) spawnBoss(k, lastSlot(k), fresh); else if (!alive && B.ent && !B.ent.dead) removeBoss(k); }
      for (let k = arrows.length - 1; k >= 0; k--) { const a = arrows[k]; a.t += dt; if (a.t >= a.dur) { arrows.splice(k, 1); if (a.pl) { if (a.onHit) a.onHit(); continue; } if (a.kind === 'fireball') { const [bx, by] = a.tg ? W2P(a.tg.x, a.tg.z) : W2P(hero.x, hero.z); fireBurst(bx, by - (a.tg ? 16 : 30)); } if (a.tg) { if (!a.tg.dead) { const [ix, iy] = W2P(a.tg.x, a.tg.z); if (a.tg.isRemote) { NET.hitRemote(a.tg, a.src, MOB[a.src.kind], a.dmg, a.hit, a.kind === 'fireball'); continue; } if (Math.random() < 0.75) { PET.hurt(a.tg, a.dmg, a.src); impact(ix, iy - 16, 'hit', '#ffd890'); } else impact(ix, iy + 2, 'miss'); } continue; } const [ix, iy] = W2P(hero.x, hero.z); if (Math.random() < a.hit - (BUFF.solid > 0 && a.kind !== 'fireball' ? 0.25 : 0)) { hurtHero(a.dmg, a.src, a.kind === 'fireball' ? 'magic' : 'ranged'); impact(ix, iy - 30, 'hit', a.kind === 'fireball' ? '#ff8a3a' : '#ffd890'); if (a.kind !== 'fireball') MSFX('elf', 'arrowhit', 0.45); if (a.kind === 'fireball' && !GOD_INV && Math.random() < 0.25 * Math.max(0.2, 1 - elemRes('fire') / 50)) { hero.burnT = 3; say('파이어볼에 맞아 화상을 입었습니다!', '#ff9a5a'); } } else { heroMiss(); impact(ix + (Math.random() - 0.5) * 20, iy + 2, 'miss'); } } }
      if (!ISLE) return;
      if (!ISLE.ground && im.ground.complete) ISLE.ground = buildGround(ISLE.def);
      for (let k = foxes.length - 1; k >= 0; k--) if (foxes[k].gone) foxes.splice(k, 1);
      if (hero.t >= 1 && !hero.atk) for (const p of ISLE.portals) if (hero.i === p.i && hero.j === p.j) { if (p.to === 'town') { hero.target = null; moveGoal = null; TOWN.goTown(); } else enter(p.to, ISLE.id); break; } },
    addDraw(list, g) { for (const p of ISLE.portals) { const [x, y] = W2P(p.i + 0.5, p.j + 0.5); list.push({ d: p.i + p.j + (p.stairs ? 0.3 : 0.6), f: () => p.stairs ? dgStairs(g, x, y, p) : portalFx(g, x, y, p.label) }); } },
  };
})();

// ============================================================ 바닥 드랍 아이템 (보스 전리품): 아이콘으로 보이고, 마우스를 올리면 정보, 클릭하면 걸어가서 주움
// 셸로브 드랍표 — 칸마다 따로 굴림(희귀할수록 낮게), 최소 1개는 보장
const JOSA = (w, a, b) => { const c = String(w).charCodeAt(String(w).length - 1); return w + (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? a : b); };
const DROP_MIN = { ice_queen: 3, queen_ant: 2, ogre: 2, baphomet: 3, kaspar: 2, merkyor: 2, balthazar: 2, sema: 2, deathknight: 3 };
const DROP_TABLE = {
  shelob: [['scroll_armor', 0.40], ['scroll_weapon', 0.30], ['scroll_earth', 0.15], ['scroll_water', 0.10], ['bless_scroll', 0.18, 1, 3], ['book_slow', 0.10], ['bscroll_armor', 0.08], ['bscroll_weapon', 0.05], ['book_eruption', 0.03]],
  // 거대 여왕개미: 최소 2개. [아이템, 확률, 최소 수량, 최대 수량]
  queen_ant: [['scroll_armor', 0.35], ['scroll_weapon', 0.30], ['scroll_earth', 0.30, 1, 5], ['scroll_fire', 0.20, 1, 3], ['bless_scroll', 0.25, 1, 3], ['long_sword', 0.22], ['leather_armor', 0.22], ['cscroll_armor', 0.15], ['cscroll_weapon', 0.12],
    ['silver_wing', 0.10], ['plate_helm', 0.06], ['plate_gloves', 0.06], ['plate_boots', 0.06], ['plate_armor', 0.04], ['scale_armor', 0.10], ['scimitar', 0.08], ['book_healall', 0.06], ['book_eruption', 0.05], ['book_solid', 0.04], ['gold_wing', 0.04], ['book_counter', 0.03], ['book_tornado', 0.03]],
  // 오우거 (기획): 최소 2개 · 주문서 넉넉히 · 판금 세트 · 희귀(여왕개미·셸로브 희귀 전부, 각 2.5%) · 영웅 고유 드랍 오우거의 장갑 3%, 거인의 벨트 2% (+ 다른 보스와 같은 영웅 굴림)
  ogre: [['scroll_armor', 0.40], ['scroll_weapon', 0.35], ['scroll_earth', 0.35, 1, 5], ['scroll_wind', 0.25, 1, 3], ['scroll_water', 0.15, 1, 3], ['bless_scroll', 0.30, 1, 3], ['cscroll_armor', 0.15], ['cscroll_weapon', 0.12], ['bscroll_armor', 0.10], ['bscroll_weapon', 0.07],
    ['silver_wing', 0.12], ['gold_wing', 0.06], ['plate_helm', 0.08], ['plate_gloves', 0.08], ['plate_boots', 0.08], ['plate_armor', 0.06], ['scale_armor', 0.12], ['scimitar', 0.10], ['book_healall', 0.08], ['book_eruption', 0.06], ['book_solid', 0.05], ['book_counter', 0.04], ['book_tornado', 0.04]],
  // 바포메트: 최소 3개 · 주문서 가장 넉넉히 · 판금 세트 · 희귀 전부(각 2.5%) · 바포메트의 지팡이 6% · 영웅 고유 드랍 아크메이지의 지팡이 3%, 암살자의 단검 2% (+ 다른 보스와 같은 영웅 굴림)
  baphomet: [['scroll_armor', 0.45], ['scroll_weapon', 0.40], ['scroll_earth', 0.35, 1, 5], ['scroll_fire', 0.25, 1, 5], ['scroll_wind', 0.25, 1, 5], ['scroll_water', 0.25, 1, 5], ['bless_scroll', 0.30, 1, 3], ['cscroll_armor', 0.15], ['cscroll_weapon', 0.12], ['bscroll_armor', 0.12], ['bscroll_weapon', 0.09],
    ['silver_wing', 0.12], ['gold_wing', 0.08], ['plate_helm', 0.08], ['plate_gloves', 0.08], ['plate_boots', 0.08], ['plate_armor', 0.07], ['scale_armor', 0.12], ['scimitar', 0.10], ['book_healall', 0.08], ['book_eruption', 0.07], ['book_solid', 0.05], ['book_counter', 0.05], ['book_tornado', 0.05]],
  // 카스파 패밀리: 넷이 각자 떨어뜨림 (원소 주문서 · 그 원소의 마법서)
  kaspar: [['scroll_water', 0.40, 1, 3], ['scroll_armor', 0.30], ['scroll_weapon', 0.25], ['bless_scroll', 0.20, 1, 2], ['book_coc', 0.06], ['book_icedagger', 0.08], ['silver_wing', 0.08], ['bscroll_armor', 0.06], ['bscroll_weapon', 0.04]],
  merkyor: [['scroll_fire', 0.40, 1, 3], ['scroll_armor', 0.30], ['scroll_weapon', 0.25], ['bless_scroll', 0.20, 1, 2], ['book_fball', 0.08], ['book_sunburst', 0.04], ['silver_wing', 0.08], ['bscroll_armor', 0.06], ['bscroll_weapon', 0.04]],
  balthazar: [['scroll_earth', 0.40, 1, 3], ['scroll_armor', 0.30], ['scroll_weapon', 0.25], ['bless_scroll', 0.20, 1, 2], ['book_eruption', 0.06], ['book_solid', 0.04], ['silver_wing', 0.08], ['bscroll_armor', 0.06], ['bscroll_weapon', 0.04]],
  sema: [['scroll_wind', 0.40, 1, 3], ['scroll_armor', 0.30], ['scroll_weapon', 0.25], ['bless_scroll', 0.20, 1, 2], ['book_decwt', 0.10], ['book_counterm', 0.05], ['silver_wing', 0.08], ['bscroll_armor', 0.06], ['bscroll_weapon', 0.04]],
  // 얼음여왕: 최소 3개 · 물 주문서 넉넉히 · 설원의 망토(희귀) · 얼음여왕의 지팡이(영웅)
  ice_queen: [['book_immune', 0.06], ['scroll_water', 0.45, 1, 5], ['scroll_armor', 0.45], ['scroll_weapon', 0.40], ['bscroll_armor', 0.15], ['bscroll_weapon', 0.10], ['bless_scroll', 0.30, 1, 3], ['gold_wing', 0.10], ['book_coc', 0.08], ['book_clight', 0.05], ['snow_cloak', 0.12], ['iq_staff', 0.04]],
  // 데스나이트: 최소 3개 · 데스나이트 세트(기사 전용) · 불검(영웅) · 주문서 넉넉히
  deathknight: [['book_immune', 0.06], ['dk_helm', 0.10], ['dk_armor', 0.07], ['dk_gloves', 0.10], ['dk_boots', 0.10], ['dk_sword', 0.04], ['scroll_armor', 0.45], ['scroll_weapon', 0.40], ['bscroll_armor', 0.15], ['bscroll_weapon', 0.10], ['scroll_fire', 0.30, 1, 5], ['bless_scroll', 0.30, 1, 3], ['gold_wing', 0.10], ['book_clight', 0.05], ['book_gheal', 0.05]],
  };
// 일반 몬스터 드랍 (아주 낮은 확률, 바닥에 기둥빛과 함께): 기사 상위 기술서는 몬스터 드랍 전용
const MOB_DROPS = { // 버그베어·킹 버그베어: 갑옷·무기 마법 주문서를 다른 몬스터보다 잘 떨어뜨림 (다른 몬스터는 지역 드랍으로만 약 2%)
  bugbear: [['scroll_armor', 0.03], ['scroll_weapon', 0.025], ['book_bounce', 0.006], ['book_solid', 0.0015], ['book_counter', 0.0015]], king_bugbear: [['scroll_armor', 0.05], ['scroll_weapon', 0.04], ['book_bounce', 0.008], ['book_solid', 0.002], ['book_counter', 0.002]],
  skeleton_archer: [['book_bounce', 0.006], ['book_solid', 0.0015], ['book_counter', 0.0015]], zombie: [['book_bounce', 0.006], ['book_solid', 0.0015], ['book_counter', 0.0015]], cerberus: [['book_bounce', 0.007], ['book_solid', 0.002], ['book_counter', 0.002]],
  roba_orc: [['book_bounce', 0.004]], dudamara_orc: [['book_bounce', 0.004]], orc_wizard: [['book_bounce', 0.004], ['book_solid', 0.001]], dark_elf: [['book_bounce', 0.006], ['book_solid', 0.0015], ['book_counter', 0.0015]], atuba_orc: [['book_bounce', 0.006], ['book_solid', 0.0015], ['book_counter', 0.0015]], gast: [['book_bounce', 0.006], ['book_solid', 0.0015], ['book_counter', 0.0015]],
  dg_kbugbear: [['scroll_armor', 0.05], ['scroll_weapon', 0.04], ['book_bounce', 0.008], ['book_solid', 0.003], ['book_counter', 0.003]], ungoliant: [['book_bounce', 0.008], ['book_solid', 0.003], ['book_counter', 0.003]], ghoul: [['book_bounce', 0.008], ['book_solid', 0.003], ['book_counter', 0.003]],
  elmore_soldier: [['book_bounce', 0.008], ['book_solid', 0.003], ['book_counter', 0.003]], elmore_warrior: [['scroll_armor', 0.04], ['book_bounce', 0.009], ['book_solid', 0.003], ['book_counter', 0.003]], elmore_mage: [['book_immune', 0.002], ['scroll_water', 0.04], ['book_icedagger', 0.006], ['book_coc', 0.002]],
  ettin: [['scroll_weapon', 0.04], ['book_bounce', 0.01], ['book_solid', 0.004], ['book_counter', 0.004]], ice_golem: [['scroll_water', 0.05], ['book_bounce', 0.01], ['book_solid', 0.004]], sabertooth: [['book_bounce', 0.01], ['book_counter', 0.004], ['book_solid', 0.004]],
  dg_cerberus: [['book_bounce', 0.009], ['book_solid', 0.003], ['book_counter', 0.003]], necromancer: [['book_slow', 0.01], ['book_counterm', 0.004], ['book_solid', 0.003]],
  scorpion: [['book_bounce', 0.005], ['book_solid', 0.001], ['book_counter', 0.001]], basilisk: [['book_bounce', 0.005], ['book_solid', 0.001], ['book_counter', 0.001]], fire_ant: [['book_bounce', 0.005], ['book_solid', 0.001], ['book_counter', 0.001]],
};
// 일반 몬스터: 그 지역 보스 드랍표 중 일반·고급 등급만 · 몬스터 레벨이 높을수록 잘 떨어짐 (한 마리당 최대 1개, 수량 1)
const REGION_BOSS = { fox: 'shelob', goblin: 'shelob', orc: 'shelob', orc_archer: 'shelob', dwarf: 'shelob', hobgoblin: 'shelob', orc_warrior: 'shelob', werewolf: 'shelob', lizardman: 'queen_ant', giant_ant: 'queen_ant', scorpion: 'queen_ant', basilisk: 'queen_ant', fire_ant: 'queen_ant', roba_orc: 'ogre', dudamara_orc: 'ogre', orc_wizard: 'ogre', dark_elf: 'ogre', atuba_orc: 'ogre', gast: 'ogre', skeleton_archer: 'baphomet', zombie: 'baphomet', bugbear: 'baphomet', cerberus: 'baphomet', king_bugbear: 'baphomet', dg_kbugbear: 'kaspar', ungoliant: 'kaspar', ghoul: 'kaspar', dg_cerberus: 'deathknight', necromancer: 'deathknight', elmore_soldier: 'ice_queen', elmore_warrior: 'ice_queen', elmore_mage: 'ice_queen', ettin: 'ice_queen', ice_golem: 'ice_queen', sabertooth: 'ice_queen' };
const regionDropP = lv => Math.min(0.12, 0.02 + 0.004 * lv);   // Lv1 2.4% · Lv8 5.2% · Lv14 7.6% · Lv17 8.8%
function regionDrop(f) { const b = REGION_BOSS[f.kind], T = b && DROP_TABLE[b]; if (!T || Math.random() >= regionDropP(MOB[f.kind].lv || 1)) return false;
  const pool = T.filter(([id]) => ITEMS[id] && ['일반', '고급'].includes(ITEMS[id].rar || '일반')); if (!pool.length) return false;
  const tot = pool.reduce((a, r) => a + r[1], 0); let x = Math.random() * tot; const row = pool.find(r => (x -= r[1]) < 0) || pool[0];
  GROUND.drop(row[0], 1, f.i, f.j); if (!lowRar(row[0])) say(`${rarTag(row[0])}${JOSA(ITEMS[row[0]].name, '이', '가')} 떨어졌습니다!`, rarC(row[0])); return true; }
const GROUND = (() => {
  const L = [], IMG = {}, LIFE = Infinity, CAP = 400; let want = null, hov = null, tipOn = false, cap = null, SH = null;   // SH: 게스트일 때 호스트가 보내 준 바닥 아이템 (같은 지역)
  const now = () => performance.now(), newGid = () => 1 + Math.floor(Math.random() * 2e9);
  const prio = d => !d.owner || !(d.until > now()) ? 0 : d.owner === NET.me() ? 1 : 2;   // 0 없음 · 1 내 우선권 · 2 남의 우선권   // 바닥 아이템은 사라지지 않음 (마을·다른 맵 다녀와도 그 자리에 유지), 지역당 최대 150개
  const zk = () => SCENE === 'town' ? 'town' : ISLE ? 'isle' + ISLE.id : 'field';
  function img(k, bl) { const key = k + (bl ? '|b' : ''); let m = IMG[key]; if (!m) { m = IMG[key] = new Image(); m.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ICON(k, bl).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="68" height="68" ')); } return m; }
  function drop(id, n, i, j) { if (!ITEMS[id]) return; { const z = zk(), mine = L.filter(d => d.zone === z); if (mine.length >= CAP) L.splice(L.indexOf(mine[0]), 1); } const d = { gid: newGid(), id, n: n || 1, i, j, x: i + 0.5, z: j + 0.5, zone: zk(), t: 0, ph: Math.random() * 6.28, owner: null, until: 0 }; L.push(d); if (cap) cap.push(d); img(ITEMS[id].icon); return d; }
  function spots(ci, cj, k) { const out = [], used = new Set(L.filter(d => d.zone === zk()).map(d => d.j * 1000 + d.i));
    for (let r = 0; r <= 3 && out.length < k; r++) { const ring = [];
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (Math.max(Math.abs(di), Math.abs(dj)) === r) ring.push([ci + di, cj + dj]);
      ring.sort(() => Math.random() - 0.5); for (const [i, j] of ring) { if (out.length >= k) break; if ((r === 0 || walkable(i, j)) && !used.has(j * 1000 + i)) { used.add(j * 1000 + i); out.push([i, j]); } } }
    while (out.length < k) out.push([ci, cj]); return out; }
  function bossLoot(f) { const T = DROP_TABLE[f.kind]; if (!T) return; let got = T.filter(([, p]) => Math.random() < p);
    const tot = T.reduce((a, x) => a + x[1], 0); while (got.length < (DROP_MIN[f.kind] || 1)) { let r = Math.random() * tot; const pk = T.find(x => (r -= x[1]) < 0) || T[0]; if (!got.includes(pk)) got.push(pk); }
    if (CX_BOSS[f.kind] && CX_HERO.length && Math.random() < (HERO_P[f.kind] || 0)) got.push([CX_HERO[Math.floor(Math.random() * CX_HERO.length)], 1]);   // 영웅 장비: 보스마다 정해진 확률로 1개 (HERO_P)
    const P = spots(f.i, f.j, got.length); got.forEach((row, k) => drop(row[0], row[2] ? row[2] + Math.floor(Math.random() * (row[3] - row[2] + 1)) : 1, P[k][0], P[k][1])); got = got.map(x => x[0]); TELE.ev('boss', { b: f.kind, items: got });
    say(`${JOSA(MOB[f.kind].name, '이', '가')} 전리품 ${got.length}개를 떨어뜨렸습니다! (마우스를 올려 확인 · 클릭해서 줍기)`, '#f2e6a8');
    for (const id of got) { const d = ITEMS[id]; if (d.rar === '희귀' || d.rar === '영웅') say(`[${d.rar}] ${JOSA(d.name, '이', '가')} 떨어졌습니다!`, RARITY_C[d.rar]); } }
  const here = () => SH && SH.zone === zk() ? SH.list.filter(d => !(d.pend > time)) : L.filter(d => d.zone === zk());
  function setShared(list, zone) { if (!list) { SH = null; return; } const old = SH && SH.zone === zone ? new Map(SH.list.map(d => [d.gid, d])) : null, out = [];
    for (const s of list) { let d = old && old.get(s.gid); if (!d) { d = { gid: s.gid, id: s.id, i: s.i, j: s.j, x: s.i + 0.5, z: s.j + 0.5, zone, t: old ? 0 : 1, ph: Math.random() * 6.28, shared: true }; img(ITEMS[s.id].icon); } d.n = s.n; d.owner = s.owner; d.until = s.left ? now() + s.left * 100 : 0; d.blessed = !!s.bl; out.push(d); }
    if (old) for (const d of old.values()) if (!out.includes(d)) { if (!(d.pend > time)) FADE.push({ d, t: 0 }); if (hov === d) setTip(null); if (want === d) want = null; }
    SH = { zone, list: out }; }
  function adoptShared() { if (!SH) return; for (const d of SH.list) if (!L.some(x => x.gid === d.gid)) L.push({ gid: d.gid, id: d.id, n: d.n, i: d.i, j: d.j, x: d.x, z: d.z, zone: SH.zone, t: d.t, ph: d.ph, owner: d.owner, until: d.until }); SH = null; want = null; }   // 호스트가 바뀌면 내가 이어서 관리
  function gotShared(gid) { if (!SH) return; const d = SH.list.find(x => x.gid === gid); if (!d) return; SH.list.splice(SH.list.indexOf(d), 1); FADE.push({ d, t: 0 }); if (hov === d) setTip(null); }
  function unpend(gid) { const d = SH && SH.list.find(x => x.gid === gid); if (d) d.pend = 0; }
  function takeFor(gid, peer) { const d = L.find(x => x.gid === gid && x.zone === zk()); if (!d) return { err: 'gone' }; if (d.owner && d.owner !== peer && d.until > now()) return { err: 'prio', owner: d.owner, left: Math.ceil((d.until - now()) / 100) };
    L.splice(L.indexOf(d), 1); FADE.push({ d, t: 0 }); if (hov === d) setTip(null); if (want === d) want = null; return { ok: true, id: d.id, n: d.n }; }
  const pos = d => { const [x, y] = W2P(d.x, d.z); const k = Math.min(1, d.t / 0.45), b = d.t < 0.45 ? -30 * (1 - k) * (1 - k) : d.t < 0.7 ? -4 * Math.sin((d.t - 0.45) / 0.25 * Math.PI) : 0; return [x, y - 10 + b + Math.sin(time * 2.4 + d.ph) * 1.1]; };
  function at(sx, sy) { const [px, py] = toWorldPx(sx, sy); let best = null, bd = 1e9;
    for (const d of here()) { if (!DN.seen(d.i, d.j)) continue; const [x, y] = pos(d), dx = px - x, dy = py - y; if (Math.abs(dx) < 13 && dy > -14 && dy < 13) { const q = dx * dx + dy * dy; if (q < bd) { bd = q; best = d; } } } return best; }
  function pick(d) { if (prio(d) === 2) { const s = Math.ceil((d.until - now()) / 1000); say(`우선권이 ${NET.nameOf(d.owner)}님에게 있어요. (${s}초 뒤 누구나 주울 수 있어요)`, '#f0c080'); want = null; moveGoal = null; d._try = (d._try || 0) + 1; return; }
    if (d.shared) { if (d.pend > time) return; d.pend = time + 2.5; want = null; moveGoal = null; if (hov === d) setTip(null); NET.requestPick(d); return; }   // 게스트: 호스트에게 줍기 요청
    const k = L.indexOf(d); if (k < 0) return; L.splice(k, 1); FADE.push({ d, t: 0 }); want = null; moveGoal = null; const it = ITEMS[d.id];
    INV.add(d.id, d.n, true); if (it.rar && it.rar !== '일반') TELE.ev('pick', { id: d.id, n: d.n, r: it.rar, z: zoneTitle() }); if (it.rar === '영웅') { const m = `${PNAME()}님이 ${zoneTitle()}에서 영웅 아이템 ${JOSA(it.name, '을', '를')} 획득했습니다!`; announce(m, RARITY_C['영웅'] || '#c77dff'); NET.announceAll(m); } say(`${rarTag(d.id)}${d.n > 1 ? it.name + ' ' + d.n + '개를' : JOSA(it.name, '을', '를')} 주웠습니다.`, rarC(d.id));
    if (AC) tone(AC.currentTime, 'triangle', 700, 1180, 0.16, 0.09); if (hov === d) setTip(null); }
  function go(d) { hero.target = null; holding = false; want = d; if (cheb(hero.i, hero.j, d.i, d.j) <= 1 && hero.t >= 1 && !hero.atk) { pick(d); return; } moveGoal = [d.i, d.j]; mark = { t: [d.i, d.j], life: 0.5 }; }
  function setTip(d, cx, cy) { const tip = document.getElementById('stat-tip'); if (!tip) return; hov = d;
    if (!d) { if (tipOn) { tip.hidden = true; tipOn = false; } return; }
    const it = ITEMS[d.id], rc = rarC(d.id), k = it.use === 'learn' ? SK[it.learn] : null;
    const eff = k ? `${k.kind === 'magic' ? k.circle + '서클 마법' : k.kind === 'spirit' ? '정령마법 · 요정 전용' : '기사 기술'} · Lv.${k.lv} 이상<br>${k.desc}` : (it.desc || '');
    const pv = prio(d), ps = pv ? Math.ceil((d.until - now()) / 1000) : 0, pl = pv === 1 ? `<br><span style="color:#ffd86a">내 우선권 · ${ps}초 남음</span>` : pv === 2 ? `<br><span style="color:#f0c080">우선권: ${NET.nameOf(d.owner)} · ${ps}초 뒤 누구나</span>` : '';
    tip.innerHTML = `<b style="color:${rc}">${it.name}${d.n > 1 ? ' (' + d.n + ')' : ''}</b> <span style="color:${rc}">[${it.rar || '일반'}]</span>${pl}`; void eff;   // 바닥 아이템: 이름만 (줍고 나서 가방에서 꾹 누르면 상세)
    tip.hidden = false; tipOn = true; const w = tip.offsetWidth, h = tip.offsetHeight; tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, cx + 16)) + 'px'; tip.style.top = Math.max(8, Math.min(innerHeight - h - 8, cy - h - 10)) + 'px'; }
  function hoverAt(sx, sy, cx, cy) { const d = at(sx, sy); setTip(d, cx, cy); return d; }
  function tick(dt) { for (let k = L.length - 1; k >= 0; k--) { L[k].t += dt; if (L[k].t > LIFE) { if (L[k] === hov) setTip(null); L.splice(k, 1); } }
    if (want) { if (!here().includes(want)) want = null; else if (hero.t >= 1 && !hero.atk && cheb(hero.i, hero.j, want.i, want.j) <= 1) pick(want); else if (!moveGoal && !hero.target && hero.t >= 1) want = null; } }
  function draw(g) { for (const d of here()) { if (!DN.seen(d.i, d.j)) continue; const it = ITEMS[d.id], m = img(it.icon, d.blessed), rc = rarC(d.id);
      const left = LIFE - d.t; if (left < 30 && Math.floor(time * 4) % 2) continue;
      const [x0, y0] = W2P(d.x, d.z), [x, y] = pos(d), on = d === hov, pulse = 0.55 + 0.25 * Math.sin(time * 3 + d.ph);
      g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(x0, y0, 0, x0, y0, on ? 17 : 14); gr.addColorStop(0, rc); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = (on ? 0.75 : 0.45) * pulse; g.fillStyle = gr; g.beginPath(); g.ellipse(x0, y0, on ? 17 : 14, on ? 8 : 6.5, 0, 0, 7); g.fill();
      if (it.rar === '희귀' || it.rar === '영웅') { g.globalAlpha = 0.8; g.fillStyle = rc; for (let q = 0; q < 3; q++) { const a = time * 1.6 + d.ph + q * 2.09, r = 9 + 2 * Math.sin(time * 2 + q); g.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y - 2 + Math.sin(a) * r * 0.5 - 4), 1, 1); } }
      g.restore(); g.save(); g.globalAlpha = 0.35; g.fillStyle = '#000'; g.beginPath(); g.ellipse(x0, y0 + 1, 6, 2.5, 0, 0, 7); g.fill(); g.restore();
      const pv = prio(d);
      if (m.complete && m.naturalWidth) { g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; const S_ = on ? 25 : 22; if (pv === 2) g.globalAlpha = 0.5;
        if (on) { g.shadowColor = rc; g.shadowBlur = 6; } g.drawImage(m, Math.round(x - S_ / 2), Math.round(y - S_ / 2), S_, S_); g.restore(); }
      if (pv) { const s = Math.ceil((d.until - now()) / 1000), t = pv === 1 ? '내 것 ' + s : s + '초'; g.save(); if (pv === 1) { g.strokeStyle = 'rgba(255,216,106,.85)'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(x0, y0, 13, 6, 0, 0, 7); g.stroke(); }
        g.font = '800 9px "Noto Sans KR",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.lineWidth = 2.5; g.strokeStyle = 'rgba(0,0,0,.85)'; g.strokeText(t, x, y - 14); g.fillStyle = pv === 1 ? '#ffd86a' : '#b8b0a0'; g.fillText(t, x, y - 14); g.restore(); } } }
  // 기둥빛: 지형·몬스터에 가려도 보이도록 깊이 정렬 뒤에 덧그림 (캐릭터 키 정도), 주우면 서서히 사라짐
  const FADE = [];
  function drawPillars(g) { const items = here().filter(d => DN.seen(d.i, d.j)).map(d => [d, 1]).concat(FADE.map(f => [f.d, 1 - f.t / 0.5])); if (!items.length) return; g.save(); g.globalCompositeOperation = 'lighter';
    for (const [d, al] of items) { const it = ITEMS[d.id], rc = rarC(d.id), [x, y] = W2P(d.x, d.z), H_ = 92, pulse = 0.75 + 0.25 * Math.sin(time * 2.6 + d.ph), w = 9;
      const gr = g.createLinearGradient(0, y - H_, 0, y); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.55, rc); gr.addColorStop(1, rc); g.globalAlpha = 0.28 * pulse * al; g.fillStyle = gr; g.fillRect(Math.round(x - w / 2), Math.round(y - H_), w, H_ - 6);
      g.globalAlpha = 0.5 * pulse * al; g.fillRect(Math.round(x - 1.5), Math.round(y - H_ * 0.85), 3, H_ * 0.85 - 6);
      g.fillStyle = rc; for (let q = 0; q < 4; q++) { const ph = (q * 0.25 + time * 0.45 + d.ph * 0.1) % 1; g.globalAlpha = Math.sin(ph * Math.PI) * 0.9 * al; g.fillRect(Math.round(x + Math.sin(q * 2.3 + time) * 4), Math.round(y - 8 - ph * (H_ - 12)), 2, 2); } }
    g.restore(); }
  function fadeTick(dt) { for (let k = FADE.length - 1; k >= 0; k--) { FADE[k].t += dt; if (FADE[k].t >= 0.5) FADE.splice(k, 1); } }
  return { clear() { const n = L.length; L.length = 0; want = null; setTip(null); return n; }, drop, bossLoot, at, go, pick, tick(dt) { tick(dt); fadeTick(dt); }, draw, drawPillars, hoverAt, list: () => L, here, fade(d) { FADE.push({ d, t: 0 }); },
    capStart() { cap = []; }, capEnd() { const c = cap || []; cap = null; return c; }, setShared, adoptShared, gotShared, unpend, takeFor, blocked: d => prio(d) === 2 };
})();

// ============================================================ 펫 (도베르만): 펫상인에게서 목걸이 구매 → '펫을 찾는다'로 소환 → 따라다니며 함께 사냥·성장
// 배고픔 없음. 목걸이(가방의 개별 아이템)가 펫 데이터를 들고 있음: {name, kind, lv, exp, hp, maxhp, inv[4], state:'stored'|'out'|'dead', mode:'attack'|'wait'|'rest'}
const PET_KIND = { doberman: { name: '도베르만', hp: 26, hpLv: 7, dmg: [1, 4], dmgLv: 0.6, hit: 0.72, ac: 8, spd: 3.7, mob: 'pet_doberman' } };
const petNeed = lv => Math.round(18 * Math.pow(lv, 1.55));
function mkPetData(kind) { const K = PET_KIND[kind]; return { kind, name: K.name, lv: 1, exp: 0, hp: K.hp, maxhp: K.hp, inv: [null, null, null, null], state: 'stored', mode: 'attack', haste: 0, hasteLv: 0 }; }
const PET = (() => {
  const L = []; let reviveMode = false, winE = null;
  const zk = () => SCENE === 'town' ? 'town' : ISLE ? 'isle' + ISLE.id : 'field';
  const maxOut = () => 1 + Math.max(0, Math.floor((INV.stat().cha - 12) / 6));   // 카리스마가 높으면 더 많이 데리고 다님
  const K_ = p => PET_KIND[p.d.kind];
  const nm = d => d.name;
  function spotAround(ci, cj, r0, r1) { for (let r = r0; r <= r1; r++) { const ring = []; for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (Math.max(Math.abs(di), Math.abs(dj)) === r) ring.push([ci + di, cj + dj]);
      ring.sort(() => Math.random() - 0.5); for (const [i, j] of ring) if (walkable(i, j) && !occ(i, j)) return [i, j]; } return null; }
  function place(p) { const s_ = spotAround(hero.i, hero.j, 1, 4) || [hero.i, hero.j]; p.i = p.fi = s_[0]; p.j = p.fj = s_[1]; p.x = p.i + 0.5; p.z = p.j + 0.5; p.t = 1; p.zone = zk(); p.scatter = null; p.scatterT = 0; p.target = null; }
  function spawn(e) { const p = { isPet: true, kind: PET_KIND[e.pet.kind].mob, e, d: e.pet, i: 0, j: 0, fi: 0, fj: 0, t: 1, x: 0, z: 0, row: 4, dist: 0, cool: 0, lunge: 0, atkT: null, hitT: 0, hitD: 0.3, kx: 0, ky: 0, kmag: 4, flash: 0, dead: false, deadT: 0, potCd: 0, scatter: null, scatterT: 0, zone: '', hi: Math.random() * 8, target: null };
    place(p); L.push(p); return p; }
  const entOf = e => L.find(p => p.e === e);
  function summon(e) { const d = e.pet; if (!d) return false; if (d.state === 'out') { say(`${nm(d)}은(는) 이미 나와 있습니다.`, '#9c9682'); return false; } if (d.state === 'dead') { say(`${nm(d)}은(는) 쓰러져 있습니다. 부활 주문서로 되살려 주세요.`, '#f08a7a'); return false; }
    if (L.filter(p => !p.dead).length >= maxOut()) { say(`지금은 펫을 ${maxOut()}마리까지 데리고 다닐 수 있습니다. (카리스마)`, '#f08a7a'); return false; }
    d.state = 'out'; d.hp = Math.max(1, d.hp); const p = spawn(e); sfxBark(); spellFx('cast', p, '#9fd8ff'); say(`${JOSA(nm(d), '이', '가')} 나타났습니다! (Lv.${d.lv})`, '#9fe0ff'); refresh(); return true; }
  function store(e, quiet) { const d = e.pet; if (!d) return; const p = entOf(e); if (p) { L.splice(L.indexOf(p), 1); for (const f of foxes) if (f.tgt === p) f.tgt = null; }
    if (d.state === 'out') d.state = 'stored'; if (!quiet) say(`${JOSA(nm(d), '을', '를')} 펫 보관소에 맡겼습니다.`, '#9fe0ff'); refresh(); }
  function storeAll() { let n = 0; INV.bag().forEach(e => { if (e.pet && e.pet.state === 'out') { store(e, true); n++; } }); if (n) say(`펫 ${n}마리를 펫 보관소에 맡겼습니다.`, '#9fe0ff'); }
  function sfxBark() { if (!AC || !SFX_ON) return; const t = AC.currentTime; for (const dt of [0, 0.16]) { nz(t + dt, 0.07, 1400, 700, 0.35); tone(t + dt, 'square', 520, 300, 0.09, 0.07); } }
  function sfxBite() { if (!AC || !SFX_ON) return; const t = AC.currentTime; nz(t, 0.06, 2600, 900, 0.3); tone(t, 'sine', 180, 70, 0.1, 0.4); }
  const petDmg = d => { const K = PET_KIND[d.kind], a = K.dmg[0] + Math.floor((d.lv - 1) * K.dmgLv * 0.5), b = K.dmg[1] + Math.floor((d.lv - 1) * K.dmgLv); return a + Math.floor(Math.random() * (b - a + 1)); };
  const petHit = (d, S) => Math.max(0.2, Math.min(0.95, PET_KIND[d.kind].hit + 0.02 * (d.lv - S.lv) - (10 - (S.mac ?? 10)) * 0.02));
  function gainExp(p, n) { const d = p.d; d.exp += n; while (d.exp >= petNeed(d.lv)) { d.exp -= petNeed(d.lv); d.lv++; const K = K_(p); d.maxhp += K.hpLv; d.hp = d.maxhp; spellFx('levelup', p); say(`${nm(d)}의 레벨이 올랐습니다! (Lv.${d.lv})`, '#9fe0ff');
      if (AC && SFX_ON) { const t = AC.currentTime; [659, 784, 1047].forEach((f, k) => tone(t + k * 0.08, 'triangle', f, f, 0.25, 0.08)); } } refresh(); }
  function hurt(p, dmg, src) { if (!p || p.dead) return; const d = p.d; dmg = Math.max(1, dmg - Math.floor(Math.max(0, 10 - K_(p).ac) / 3)); d.hp -= dmg; p.flash = 0.09;
    const [px, py] = W2P(p.x, p.z); floatText(px, py - 46, String(dmg), { color: '#ff8a6a', size: 11 });
    if (src) { const [sx, sy] = W2P(src.x, src.z); const vx = px - sx, vy = py - sy, l = Math.hypot(vx, vy) || 1; p.kx = vx / l; p.ky = vy / l; } p.hitD = 0.3; p.hitT = 0.3; p.kmag = 4;
    if (d.hp <= 0) { d.hp = 0; p.dead = true; p.deadT = 0; d.state = 'dead'; p.lunge = 0; for (const f of foxes) if (f.tgt === p) f.tgt = null; say(`${JOSA(nm(d), '이', '가')} 쓰러졌습니다... 부활 주문서로 되살릴 수 있습니다.`, '#f08a7a'); if (AC && SFX_ON) tone(AC.currentTime, 'sine', 420, 120, 0.5, 0.12); }
    refresh(); }
  function hurtBy(p, f, S) { if (Math.random() < Math.max(0.2, Math.min(0.95, 0.55 + 0.04 * (S.lv - p.d.lv) + (K_(p).ac - 8) * 0.03))) hurt(p, mobDmg(S), f); else { const [px, py] = W2P(p.x, p.z); floatText(px, py - 46, 'MISS', { color: '#c8d0d8', size: 10 }); } }
  function revive(e, ent) { const d = e.pet; if (!d || d.state !== 'dead') { say('부활시킬 대상이 아닙니다.', '#9c9682'); return false; } if (!INV.take('revive_scroll')) { say('부활 주문서가 없습니다.', '#f08a7a'); return false; }
    d.state = 'out'; d.hp = Math.max(1, Math.round(d.maxhp * 0.5)); let p = ent || entOf(e); if (p) { p.dead = false; p.deadT = 0; if (p.zone !== zk()) place(p); } else p = spawn(e);
    spellFx('heal', p); spellFx('levelup', p); sfxBark(); say(`${JOSA(nm(d), '이', '가')} 되살아났습니다! (HP ${d.hp}/${d.maxhp})`, '#c8f0a0'); reviveMode = false; refresh(); return true; }
  function useRevive() { const dead = INV.bag().filter(e => e.pet && e.pet.state === 'dead');
    if (!dead.length) { say('부활시킬 대상이 없습니다. (쓰러진 펫이나 동료에게만 쓸 수 있고, 몬스터는 되살릴 수 없습니다)', '#9c9682'); return; }
    if (dead.length === 1) { revive(dead[0]); return; } reviveMode = true; say('부활 주문서: 되살릴 펫을 클릭하세요. (펫 창의 부활 버튼도 됩니다 · Esc 취소)', '#f2e6a8'); }
  function at(sx, sy, wantDead) { const [px, py] = toWorldPx(sx, sy); let b = null, bd = -1; for (const p of PETS_HERE) { if (!!p.dead !== !!wantDead) continue; const [x, y] = W2P(p.x, p.z); if (px > x - 22 && px < x + 22 && py > y - 40 && py < y + 8 && p.x + p.z > bd) { bd = p.x + p.z; b = p; } } return b; }
  function click(sx, sy) { if (reviveMode) { const dp = at(sx, sy, true); if (dp) { revive(dp.e, dp); return true; } const f = pickFox(sx, sy); if (f) { say('몬스터는 부활시킬 수 없습니다.', '#f08a7a'); return true; } reviveMode = false; say('부활을 취소했습니다.', '#9c9682'); return true; }
    return false; }   // 화면의 펫을 눌러도 창은 안 뜸 (목걸이를 쓸 때만)
  function setMode(e, m) { const d = e.pet; if (!d || d.state !== 'out') return; d.mode = m; const p = entOf(e); if (p) { p.target = null; p.scatter = null; p.scatterT = 0; }
    say(`${nm(d)}: ${({ attack: '공격 — 내가 공격하는 몬스터를 함께 공격합니다', wait: '공격 대기 — 따라다니기만 하고 공격하지 않습니다', rest: '휴식 — 이 자리에서 기다립니다' })[m]}`, '#9fe0ff'); sfxBark(); refresh(); }
  function scatter() { let n = 0; for (const p of PETS_HERE) { if (p.dead) continue; let t = null; for (let k = 0; k < 40 && !t; k++) { const r = 2 + Math.floor(Math.random() * 3), a = Math.random() * 6.283, i = Math.round(p.i + Math.cos(a) * r), j = Math.round(p.j + Math.sin(a) * r); if (cheb(i, j, p.i, p.j) >= 2 && walkable(i, j) && !occ(i, j)) t = [i, j]; }
      if (t) { p.scatter = t; p.scatterT = 5; p.target = null; n++; } } say(n ? '펫이 흩어집니다. (산개)' : '흩어질 펫이 없습니다.', '#9fe0ff'); }
  // 펫 물약: 체력 물약은 내 가방 것을 같이 먹음 (HP 50% 아래) · 가속 물약만 펫 가방에 넣어 두면 펫이 따로 먹음
  const petItemOK = id => { const d = ITEMS[id]; return d && d.use === 'haste'; };
  const HEAL_IDS = () => { const pref = (INV.auto('hp') || {}).id; return [pref, 'red_potion', 'orange_potion', 'clear_potion', ...Object.keys(ITEMS).filter(id => ITEMS[id].use === 'heal')].filter((id, k, a) => id && ITEMS[id] && ITEMS[id].use === 'heal' && a.indexOf(id) === k); };
  function giveItem(e, id, n) { const d = e.pet; if (!d || !petItemOK(id)) { say(ITEMS[id] && ITEMS[id].use === 'heal' ? '체력 물약은 펫 가방에 넣지 않아도 돼요. 펫이 내 가방의 물약을 같이 먹어요.' : '펫 가방에는 가속 물약만 넣을 수 있습니다.', '#f0c080'); return; } n = Math.min(n, INV.count(id)); if (n <= 0) return;
    let slot = d.inv.findIndex(x => x && x.id === id); if (slot < 0) slot = d.inv.findIndex(x => !x); if (slot < 0) { say('펫 가방이 가득 찼습니다. (4칸)', '#f08a7a'); return; }
    INV.take(id, n); d.inv[slot] = d.inv[slot] ? { id, n: d.inv[slot].n + n } : { id, n }; say(`${nm(d)}의 가방에 ${ITEMS[id].name} ${n}개를 넣었습니다.`, '#cfe4a8'); refresh(); }
  function takeItem(e, k) { const d = e.pet, it = d && d.inv[k]; if (!it) return; INV.add(it.id, it.n, true); d.inv[k] = null; say(`${nm(d)}의 가방에서 ${ITEMS[it.id].name} ${it.n}개를 꺼냈습니다.`, '#cfe4a8'); refresh(); }
  function petUse(p) { const d = p.d; if (p.potCd > 0) return;
    if (d.hp < d.maxhp * 0.5) { const k = d.inv.findIndex(x => x && ITEMS[x.id].use === 'heal'); let I = null;
      if (k >= 0) { const it = d.inv[k]; I = ITEMS[it.id]; if (--it.n <= 0) d.inv[k] = null; }   // 예전에 펫 가방에 넣어 둔 체력 물약부터
      else { const id = HEAL_IDS().find(x => INV.count(x) > 0); if (id && INV.take(id, 1)) I = ITEMS[id]; }   // 없으면 내 가방 물약
      if (I) { const h = Math.min(d.maxhp - d.hp, rint(I.heal)); d.hp += h; p.potCd = 1;
        const [px, py] = W2P(p.x, p.z); floatText(px, py - 50, `+${h}`, { color: '#8af08a', size: 11 }); spellFx('heal', p); if (AC && SFX_ON) tone(AC.currentTime, 'sine', 520, 880, 0.15, 0.07); refresh(); return; } }
    if (d.haste <= 0) { const k = d.inv.findIndex(x => x && ITEMS[x.id].use === 'haste'); if (k >= 0) { const it = d.inv[k], I = ITEMS[it.id]; d.haste = I.dur; d.hasteLv = I.haste; if (--it.n <= 0) d.inv[k] = null; p.potCd = 1; refresh(); } } }
  let lastHI = null, lastHJ = null;   // 순간이동 감지: 한 프레임에 3칸 넘게 뛰면 텔레포트로 봄
  function tick(dt) { const z = zk(), jump = lastHI !== null && cheb(hero.i, hero.j, lastHI, lastHJ) > 3; lastHI = hero.i; lastHJ = hero.j;
    for (const p of L) { if (p.zone !== z || (p.dead && jump)) { const dd = p.dead, dt0 = p.deadT; place(p); if (dd) { p.dead = true; p.deadT = Math.max(dt0, 1.4); } } }   // 쓰러진 펫: 걸어갈 땐 그 자리에 누워 있고, 텔레포트·맵 이동 땐 옆에 같이 떨어짐
    PETS_HERE = L.filter(p => p.zone === z);
    for (const p of PETS_HERE) { const d = p.d; if (p.barkT > 0) p.barkT = Math.max(0, p.barkT - dt); if (p.hitT > 0) p.hitT = Math.max(0, p.hitT - dt); p.flash = Math.max(0, p.flash - dt); if (p.dead) { p.deadT += dt; continue; }
      p.cool = Math.max(0, p.cool - dt); p.potCd = Math.max(0, p.potCd - dt); if (d.haste > 0) d.haste = Math.max(0, d.haste - dt); const hm = d.haste > 0 ? (d.hasteLv === 2 ? 1.4 : 1.2) : 1;
      if (!foxes.some(f => f.tgt === p && !f.dead)) d.hp = Math.min(d.maxhp, d.hp + dt * (0.15 + d.lv * 0.04));
      petUse(p); stepMove(p, dt, K_(p).spd * GSPD * hm); if (p.atkT != null) { p.atkT += dt; if (p.atkT > 0.5) p.atkT = null; }
      if (p.lunge > 0) { const was = p.lunge; p.lunge -= dt; const T = p.target; if (was > 0.15 && p.lunge <= 0.15 && T && !T.dead && cheb(p.i, p.j, T.i, T.j) === 1) { const S = MOB[T.kind];
          if (Math.random() < petHit(d, S)) { const dm = petDmg(d); sfxBite(); mobHurt(T, dm, '#ffd27a', p); if (!T.dead && Math.random() < 0.35) T.tgt = p; }
          else { const [fx, fy] = W2P(T.x, T.z); floatText(fx, fy - headY(T) - 4, 'MISS', { color: '#c8d0d8', size: 10 }); } } }
      if (p.t < 1) continue;
      if (cheb(p.i, p.j, hero.i, hero.j) > 16 && d.mode !== 'rest') { place(p); continue; }
      if (p.scatterT > 0) { p.scatterT -= dt; if (p.scatter && (p.i !== p.scatter[0] || p.j !== p.scatter[1])) { const st = astar(p, (i, j) => i === p.scatter[0] && j === p.scatter[1], p.scatter[0], p.scatter[1]); if (!st.length || !beginStep(p, st[0])) p.scatter = null; } continue; }
      if (d.mode === 'rest') continue;
      if (d.mode === 'attack') { let T = hero.target && !hero.target.dead ? hero.target : hero.lastHit && !hero.lastHit.dead && time - hero.lastHitT < 4 ? hero.lastHit : null;
        if (!T) T = foxes.find(f => !f.dead && f.tgt === p) || null; if (T && (cheb(T.i, T.j, hero.i, hero.j) > 12 || !DN.seen(T.i, T.j))) T = null; p.target = T;
        if (T) { if (cheb(p.i, p.j, T.i, T.j) === 1) { face(p, T); if (p.cool <= 0 && p.lunge <= 0) { p.cool = 1.1 / GSPD / hm; p.lunge = 0.3 / GSPD; p.atkT = 0; } continue; }
          const st = astar(p, (i, j) => cheb(i, j, T.i, T.j) === 1, T.i, T.j); if (st.length) beginStep(p, st[0]); continue; } }
      else p.target = null;
      const dist = cheb(p.i, p.j, hero.i, hero.j);
      if (dist > 2) { const st = astar(p, (i, j) => cheb(i, j, hero.i, hero.j) <= 1 && !(i === hero.i && j === hero.j), hero.i, hero.j); if (st.length) beginStep(p, st[0]); }
      else if (dist === 0) { const s_ = spotAround(p.i, p.j, 1, 1); if (s_) beginStep(p, s_); } } }
  function draw(list, g) { for (const p of PETS_HERE) { if (!DN.seen(p.i, p.j)) continue; list.push({ d: p.x + p.z, f: () => { const S = MOB[p.kind], [x, y] = W2P(p.x, p.z), moving = p.t < 1;
      mobPose(p, 1); if (p.barkT > 1.1) MP.ly -= Math.abs(Math.sin((1.5 - p.barkT) / 0.4 * Math.PI * 2)) * 6;
      if (S.art === 'sheet' && MSHEET[p.kind] && MIMG[p.kind] && ['idle', 'walk', 'attack'].every(a => MIMG[p.kind][a].naturalWidth)) { /* 렌더 그림을 못 불러오면 아래 예전(물들인 여우) 그림 */ const M = MSHEET[p.kind], I = MIMG[p.kind]; let a = 'idle', fr = Math.floor(time * 6 + p.hi) % 8; if (p.lunge > 0 && !p.dead) { a = 'attack'; fr = Math.min((M.af || 8) - 1, Math.floor((1 - p.lunge / (0.3 / GSPD)) * (M.af || 8))); } else if (moving && !p.dead) { a = 'walk'; fr = Math.floor(p.dist * 4) % 8; } else if (p.dead) fr = 0;   // 정식 도베르만 그림이 들어오면 이쪽으로
        const al2 = p.dead ? Math.max(0.5, 1 - p.deadT / 1.4) : 1; g.save(); g.translate(Math.round(x + MP.lx), Math.round(y + MP.ly)); if (MP.rot) g.rotate(MP.rot); if (MP.sx !== 1 || MP.sy !== 1) g.scale(MP.sx, MP.sy); if (I[a] && I[a].complete && I[a].naturalWidth) drawSheet(g, I[a], M, fr, p.row, 0, 0, al2, p.flash > 0 ? 'brightness(2.6) saturate(0)' : null); g.restore(); return; }
      const anim = p.dead ? 'Survey' : moving ? 'Run' : 'Survey', fr = p.dead ? 0 : moving ? Math.floor(p.dist * 3) % 8 : Math.floor(time * 6 + p.hi) % 8, img = tinted(p.kind, anim);
      const al = p.dead ? Math.max(0.5, 1 - p.deadT / 1.4) : 1, fl = p.flash > 0 ? 'brightness(2.6) saturate(0)' : MP.red ? 'sepia(.55) saturate(2.4) hue-rotate(-38deg) brightness(1.08)' : null;
      g.save(); g.translate(Math.round(x + MP.lx), Math.round(y + MP.ly)); if (MP.rot) g.rotate(MP.rot); if (MP.sx !== 1 || MP.sy !== 1) g.scale(MP.sx, MP.sy); if (img) drawSheet(g, img, { ...FX, s: S.sc }, fr, p.row, 0, 0, al, fl); g.restore(); } }); } }
  function drawLabels(g) { for (const p of PETS_HERE) { if (!DN.seen(p.i, p.j)) continue; const d = p.d, [x, y] = W2P(p.x, p.z), top = y - headY(p) - 6;
      g.save(); g.font = '700 9px "Noto Sans KR",sans-serif'; g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.85)'; const t = d.name + (p.dead ? ' (쓰러짐)' : ''); g.strokeText(t, x, top - 4); g.fillStyle = p.dead ? '#a8a090' : '#9fe0ff'; g.fillText(t, x, top - 4);
      if (p.barkT > 0 && !p.dead) { const a = Math.min(1, p.barkT / 0.3), bx = x + 16, by = top - 26; g.globalAlpha = a; g.fillStyle = '#fffaf0'; g.strokeStyle = '#3a2a1a'; g.lineWidth = 1.2; g.beginPath(); g.roundRect ? g.roundRect(bx - 22, by - 10, 44, 18, 8) : g.rect(bx - 22, by - 10, 44, 18); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(bx - 10, by + 8); g.lineTo(bx - 15, by + 15); g.lineTo(bx - 3, by + 8); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#3a2010'; g.font = '800 10px "Noto Sans KR",sans-serif'; g.textAlign = 'center'; g.fillText('왈! 왈!', bx, by + 3); g.globalAlpha = 1; }
      if (!p.dead) { g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(x - 13, top - 1, 26, 4); g.fillStyle = d.hp / d.maxhp < 0.35 ? '#e8503a' : '#5ad06a'; g.fillRect(x - 12, top, Math.round(24 * d.hp / d.maxhp), 2); } g.restore(); } }
  // ----- 펫 창: 목걸이를 더블클릭하거나 화면의 펫을 클릭하면 열림
  const $ = id => document.getElementById(id);
  function openWin(e) { winE = e; const w = $('petwin'); const p = entOf(e); if (p && !p.dead) { p.barkT = 1.5; sfxBark(); } if (!w) return; w.hidden = false; w.dataset.h = ''; renderWin(); }
  function refresh() { if (winE && $('petwin') && !$('petwin').hidden) renderWin(); INV.render(); }
  function renderWin() { const w = $('petwin'), e = winE; if (!w || !e || !e.pet || !INV.bag().includes(e)) { if (w) w.hidden = true; return; } const d = e.pet, p = entOf(e), need = petNeed(d.lv);
    const st = ({ out: '소환 중', stored: '펫 보관소에 있음', dead: '쓰러짐' })[d.state], mb = (m, t) => `<button type="button" data-pm="${m}" aria-pressed="${d.mode === m}">${t}</button>`;
    const bagPots = Object.keys(ITEMS).filter(id => petItemOK(id) && INV.count(id) > 0);
    const html = `<div class="pw-head"><canvas id="pw-face" width="76" height="76"></canvas><div><b class="pw-name">${esc(d.name)}</b><span class="pw-sub">Lv.${d.lv} ${PET_KIND[d.kind].name} · <em class="st-${d.state}">${st}</em></span>
      <div class="pw-bar hp"><i style="width:${Math.round(100 * d.hp / d.maxhp)}%"></i><span>HP ${Math.ceil(d.hp)} / ${d.maxhp}</span></div><div class="pw-bar ex"><i style="width:${Math.round(100 * d.exp / need)}%"></i><span>EXP ${(100 * d.exp / need).toFixed(1)}%</span></div></div></div>
      ${d.state === 'out' ? `<div class="pw-cmd">${mb('attack', '공격')}${mb('wait', '공격 대기')}${mb('rest', '휴식')}<button type="button" data-pm="scatter" class="sc">산개</button></div>` : d.state === 'dead' ? `<div class="pw-cmd"><button type="button" data-pm="revive" class="rv">부활 주문서 사용 (${INV.count('revive_scroll')}개)</button></div>` : `<p class="pw-note">펫상인 루피에게서 '펫을 찾는다'로 소환할 수 있습니다.</p>`}
      <div class="pw-inv-t">펫 가방 <small>가속 물약을 넣어 두면 스스로 먹어요 · 체력 물약은 내 가방 것을 같이 먹어요 (HP 50% 아래) · 칸 클릭: 꺼내기</small></div><div class="pw-inv">${d.inv.map((it, k) => `<button type="button" class="slot pw-slot" data-k="${k}"${it ? ` title="${ITEMS[it.id].name} ${it.n}개 [${ITEMS[it.id].rar}]" style="border-color:${rarC(it.id)}"` : ' aria-label="빈 칸"'}>${it ? `%ICON${k}%<b>${it.n}</b>` : ''}</button>`).join('')}</div>
      ${bagPots.length ? `<div class="pw-give">${bagPots.map(id => `<button type="button" data-give="${id}" title="${ITEMS[id].name} 5개 넣기">%GIVE_${id}%<span>${INV.count(id)}</span></button>`).join('')}<small>눌러서 5개씩 넣기 · 가방에서 끌어다 놓아도 됩니다</small></div>` : ''}`;
    if (html === w.dataset.h) return; w.dataset.h = html;
    $('pw-body').innerHTML = html.replace(/%ICON(\d)%/g, (_, k) => ICON(ITEMS[d.inv[k].id].icon)).replace(/%GIVE_(\w+)%/g, (_, id) => ICON(ITEMS[id].icon));
    const fc = $('pw-face'), g = fc.getContext('2d'), img = tinted(PET_KIND[d.kind].mob, 'Survey'); if (img) { g.imageSmoothingEnabled = true; const M = FX, k = 1.15; g.drawImage(img, 0, 2 * M.H, M.W, M.H, 38 - M.ax * k, 64 - M.ay * k, M.W * k, M.H * k); }
    w.querySelectorAll('[data-pm]').forEach(b => b.onclick = () => { const m = b.dataset.pm; if (m === 'scatter') scatter(); else if (m === 'revive') revive(e); else setMode(e, m); });
    w.querySelectorAll('.pw-slot').forEach(b => { const k = +b.dataset.k; b.onclick = () => takeItem(e, k); b.ondragover = ev => ev.preventDefault(); b.ondrop = ev => { ev.preventDefault(); const id = ev.dataTransfer.getData('text/plain'); if (ITEMS[id]) giveItem(e, id, 10); }; });
    w.querySelectorAll('[data-give]').forEach(b => b.onclick = () => giveItem(e, b.dataset.give, 5)); }
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  function rename(e, name) { const d = e.pet; name = String(name || '').trim().slice(0, 8); if (!d) return false; if (!name) { say('펫 이름을 1~8글자로 정해 주세요.', '#f08a7a'); return false; } d.name = name; say(`펫 이름을 '${name}'(으)로 바꿨습니다.`, '#9fe0ff'); refresh(); return true; }
  // 펫상인 메뉴: 펫을 찾는다(보관소 → 소환) / 펫을 맡긴다(소환 → 보관소)
  function shopPanel(kind, list) { const cs = INV.bag().filter(e => e.pet); list.innerHTML = '';
    if (!cs.length) { list.innerHTML = '<p class="muted pw-empty">펫 목걸이가 없습니다. \'펫 구매\'에서 목걸이를 사 주세요.</p>'; return; }
    for (const e of cs) { const d = e.pet, row = document.createElement('div'); row.className = 'item pet-row';
      const can = kind === 'find' ? d.state === 'stored' : d.state === 'out' || d.state === 'dead';
      row.innerHTML = `<span class="ic">${ICON(ITEMS[e.id].icon)}</span><span class="nm">${esc(d.name)} <small>Lv.${d.lv} ${PET_KIND[d.kind].name}</small></span><span class="info">HP ${Math.ceil(d.hp)}/${d.maxhp} · ${({ out: '소환 중', stored: '보관소에 있음', dead: '쓰러짐' })[d.state]}</span><button type="button" class="buy"${can ? '' : ' disabled'}>${kind === 'find' ? '소환' : '맡기기'}</button>`;
      row.querySelector('.buy').onclick = () => { if (kind === 'find') summon(e); else store(e); shopPanel(kind, list); }; list.appendChild(row); } }
  return { gainExp, summon, store, storeAll, hurt, hurtBy, revive, useRevive, tick, draw, drawLabels, click, at, openWin, refresh, rename, shopPanel, setMode, scatter, giveItem, list: () => L, reviveMode: () => reviveMode, cancelRevive() { if (reviveMode) { reviveMode = false; say('부활을 취소했습니다.', '#9c9682'); return true; } return false; } };
})();

// ============================================================ 인벤토리 · 캐릭터 정보 (기획팀)
const CXI = {};   // 장비 도감 아이콘 그림 (아래 장비 도감 블록에서 채움)
const ICON = (() => {
  const g = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
  const defs = '<defs>' + g('st', '#eef2f6', '#7d8794') + g('wd', '#a8723e', '#4e2f14') + g('lt', '#a07850', '#4a3420') + g('gd', '#f6dc86', '#9a7424') + g('cl', '#6a5a8a', '#2a2238') + g('gr', '#a8ff86', '#1e6a1a') + g('br', '#ffd77a', '#8a3a0c') + g('rd', '#ff6a5a', '#8a1010') + g('or', '#ffb05a', '#a8500a') + g('bl', '#7ab0ff', '#1a3a8a') + g('pp', '#efe2bf', '#a8946a') + g('wh', '#ffffff', '#aebccc') + g('pu', '#e0a8ff', '#4a1878') + g('pb', '#dfe8f6', '#8ea4c4') + g('pc', '#d8f4f2', '#7ab0aa') + g('pr', '#f4d8cc', '#b08070') + g('pg', '#fff2c0', '#c8a050') + '</defs>';
  const P = {
    sword: '<path d="M27 4 L30 7 L14 23 L11 20 Z" fill="url(#st)" stroke="#2a2e34" stroke-width=".8"/><path d="M8 19 L15 26 L13 28 L6 21 Z" fill="url(#gd)"/><path d="M8 26 L5 29" stroke="url(#wd)" stroke-width="3" stroke-linecap="round"/>',
    arrow: '<path d="M8 27 L24 11" stroke="#2a1a0c" stroke-width="3.2" stroke-linecap="round"/><path d="M8 27 L24 11" stroke="url(#wd)" stroke-width="1.8" stroke-linecap="round"/><path d="M28 7 L20 10 L25 15 Z" fill="url(#st)" stroke="#2a2e34" stroke-width=".7"/><path d="M10 25 L4 25 L7 22 Z M10 25 L10 31 L13 28 Z" fill="#c0342a" stroke="#5a120c" stroke-width=".5"/><path d="M13 22 L8 21 L10 19 Z M13 22 L14 27 L16 24 Z" fill="#e8dcc0"/>',
    shield: '<path d="M17 4 L28 8 C28 18 24 25 17 30 C10 25 6 18 6 8 Z" fill="url(#wd)" stroke="#2a1a0c" stroke-width="1"/><path d="M17 4 L28 8 C28 18 24 25 17 30 C10 25 6 18 6 8 Z" fill="none" stroke="url(#st)" stroke-width="2"/><circle cx="17" cy="16" r="3" fill="url(#st)"/>',
    helm: '<path d="M8 20 C8 10 12 5 17 5 C22 5 26 10 26 20 L26 26 L21 26 L21 18 L13 18 L13 26 L8 26 Z" fill="url(#lt)" stroke="#2a1a0c" stroke-width="1"/><path d="M17 5 L17 18" stroke="#3a2614" stroke-width="1.5"/>',
    cloak: '<path d="M12 5 L22 5 L28 29 L6 29 Z" fill="url(#cl)" stroke="#1a1424" stroke-width="1"/><path d="M12 5 L22 5 L20 9 L14 9 Z" fill="url(#gd)"/>',
    armor: '<path d="M10 6 L14 5 L17 8 L20 5 L24 6 L29 11 L26 15 L24 13 L24 29 L10 29 L10 13 L8 15 L5 11 Z" fill="url(#lt)" stroke="#2a1a0c" stroke-width="1"/><path d="M12 18 L22 18 M12 23 L22 23" stroke="#3a2614" stroke-width="1.2"/>',
    shirt: '<path d="M11 6 L14 5 C15 7 19 7 20 5 L23 6 L29 11 L26 15 L24 13 L24 29 L10 29 L10 13 L8 15 L5 11 Z" fill="#d8d0bc" stroke="#6a6250" stroke-width="1"/>',
    belt: '<rect x="3" y="13" width="28" height="8" rx="2" fill="url(#lt)" stroke="#2a1a0c"/><rect x="13" y="11" width="8" height="12" rx="1" fill="none" stroke="url(#gd)" stroke-width="2.4"/>',
    ring: '<ellipse cx="17" cy="19" rx="9" ry="7" fill="none" stroke="url(#gd)" stroke-width="3.5"/><circle cx="17" cy="11" r="3.2" fill="url(#bl)" stroke="#fff" stroke-width=".6"/>',
    boots: '<path d="M10 5 L18 5 L18 21 L28 24 L28 29 L8 29 L8 22 Z" fill="url(#lt)" stroke="#2a1a0c" stroke-width="1"/><path d="M8 25 L28 25" stroke="#2a1a0c"/>',
    amulet: '<path d="M8 5 C8 15 26 15 26 5" fill="none" stroke="url(#gd)" stroke-width="1.8"/><path d="M17 15 L22 21 L17 29 L12 21 Z" fill="url(#rd)" stroke="url(#gd)" stroke-width="1.4"/>',
    gloves: '<path d="M9 29 L9 14 L11 6 L13 6 L13 13 L15 4 L17 4 L17 13 L19 5 L21 5 L21 14 L23 9 L25 10 L23 20 L23 29 Z" fill="url(#lt)" stroke="#2a1a0c" stroke-width="1"/>',
    pot_red: '<path d="M14 4 L20 4 L20 9 C26 11 28 16 28 20 C28 26 23 30 17 30 C11 30 6 26 6 20 C6 16 8 11 14 9 Z" fill="url(#rd)" stroke="#3a0a0a"/><rect x="13" y="2" width="8" height="4" fill="#8a6a40"/><ellipse cx="13" cy="18" rx="2.5" ry="4" fill="#fff" opacity=".35"/>',
    pot_or: '<path d="M14 4 L20 4 L20 9 C26 11 28 16 28 20 C28 26 23 30 17 30 C11 30 6 26 6 20 C6 16 8 11 14 9 Z" fill="url(#or)" stroke="#3a1a0a"/><rect x="13" y="2" width="8" height="4" fill="#8a6a40"/><ellipse cx="13" cy="18" rx="2.5" ry="4" fill="#fff" opacity=".35"/>',
    candle: '<path d="M13 14 L21 14 L21 29 L13 29 Z" fill="#f2ead0" stroke="#8a7a50" stroke-width=".8"/><path d="M12 29 L22 29 L23 31 L11 31 Z" fill="#9a7a40"/><path d="M17 14 L17 11" stroke="#3a2a1a" stroke-width="1"/><path d="M17 3 C20 7 20 10 17 11.5 C14 10 14 7 17 3 Z" fill="#ffc040"/><path d="M17 6 C18.4 8 18.4 9.6 17 10.6 C15.6 9.6 15.6 8 17 6 Z" fill="#fff6c0"/><circle cx="17" cy="8" r="7" fill="rgba(255,220,120,.25)"/>',
    pot_bl: '<path d="M14 4 L20 4 L20 9 C26 11 28 16 28 20 C28 26 23 30 17 30 C11 30 6 26 6 20 C6 16 8 11 14 9 Z" fill="url(#bl)" stroke="#0a1a3a"/><rect x="13" y="2" width="8" height="4" fill="#8a6a40"/><ellipse cx="13" cy="18" rx="2.5" ry="4" fill="#fff" opacity=".35"/>',
    pot_gr: '<path d="M14 4 L20 4 L20 9 C26 11 28 16 28 20 C28 26 23 30 17 30 C11 30 6 26 6 20 C6 16 8 11 14 9 Z" fill="url(#gr)" stroke="#0a2a0a"/><rect x="13" y="2" width="8" height="4" fill="#8a6a40"/><ellipse cx="13" cy="18" rx="2.5" ry="4" fill="#fff" opacity=".35"/>',
    pot_br: '<path d="M14 4 L20 4 L20 9 C26 11 28 16 28 20 C28 26 23 30 17 30 C11 30 6 26 6 20 C6 16 8 11 14 9 Z" fill="url(#pu)" stroke="#2a0a3a"/><rect x="13" y="2" width="8" height="4" fill="#8a6a40"/><ellipse cx="13" cy="18" rx="2.5" ry="4" fill="#fff" opacity=".35"/><circle cx="20" cy="22" r="1.4" fill="#f4dcff" opacity=".8"/><circle cx="16" cy="25" r="1" fill="#f4dcff" opacity=".7"/>',
    pot_wh: '<path d="M14 4 L20 4 L20 9 C26 11 28 16 28 20 C28 26 23 30 17 30 C11 30 6 26 6 20 C6 16 8 11 14 9 Z" fill="url(#wh)" stroke="#5a6878"/><rect x="13" y="2" width="8" height="4" fill="#8a6a40"/><ellipse cx="13" cy="18" rx="2.5" ry="4" fill="#fff" opacity=".35"/><path d="M9 21 C12 24 22 24 25 21" fill="none" stroke="#c8d4e0" stroke-width="1"/>',
    poison: '<path d="M17 3 C22 11 26 15 26 21 C26 27 22 31 17 31 C12 31 8 27 8 21 C8 15 12 11 17 3 Z" fill="url(#gr)" stroke="#0a2a0a"/><circle cx="14" cy="20" r="2.2" fill="#0a200a"/><circle cx="20" cy="20" r="2.2" fill="#0a200a"/><path d="M13 26 L21 26" stroke="#0a200a" stroke-width="1.6"/>',
    antidote: '<path d="M14 4 L20 4 L20 9 C26 11 28 16 28 20 C28 26 23 30 17 30 C11 30 6 26 6 20 C6 16 8 11 14 9 Z" fill="#d8f0c0" stroke="#2a4a1a"/><path d="M10 21 C10 16 24 16 24 21 C24 26 10 26 10 21 Z" fill="url(#gr)"/><rect x="13" y="2" width="8" height="4" fill="#8a6a40"/><path d="M15 20 L19 20 M17 18 L17 22" stroke="#fff" stroke-width="1.4"/>',
    dk_helm: '<path d="M8 21 C8 9 12 4 17 4 C22 4 26 9 26 21 L26 28 L8 28 Z" fill="#2a2830" stroke="#0a0a0e" stroke-width="1"/><path d="M11 16 L23 16 L23 18 L11 18 Z" fill="#ff4a2a"/><path d="M17 4 L17 12 M10 8 L6 3 M24 8 L28 3" stroke="#8a2a20" stroke-width="1.6"/>',
    dk_armor: '<path d="M10 6 L14 5 L17 8 L20 5 L24 6 L29 11 L26 15 L24 13 L24 29 L10 29 L10 13 L8 15 L5 11 Z" fill="#26242c" stroke="#0a0a0e" stroke-width="1"/><path d="M12 14 L22 14 M12 19 L22 19 M12 24 L22 24" stroke="#7a1a14" stroke-width="1.4"/><circle cx="17" cy="10" r="2" fill="#ff4a2a"/>',
    dk_gloves: '<path d="M9 29 L9 14 L11 6 L13 6 L13 13 L15 4 L17 4 L17 13 L19 5 L21 5 L21 14 L23 9 L25 10 L23 20 L23 29 Z" fill="#2a2830" stroke="#0a0a0e" stroke-width="1"/><path d="M9 24 L23 24" stroke="#8a2018" stroke-width="1.6"/>',
    dk_boots: '<path d="M10 5 L18 5 L18 21 L28 24 L28 29 L8 29 L8 22 Z" fill="#2a2830" stroke="#0a0a0e" stroke-width="1"/><path d="M8 25 L28 25 M10 10 L18 10" stroke="#8a2018" stroke-width="1.4"/>',
    dk_sword: '<path d="M27 4 L30 7 L14 23 L11 20 Z" fill="#ff6a2a" stroke="#3a0a04" stroke-width=".8"/><path d="M26 6 L15 18" stroke="#ffe0a0" stroke-width="1"/><path d="M8 19 L15 26 L13 28 L6 21 Z" fill="#3a3440"/><path d="M8 26 L5 29" stroke="#2a1010" stroke-width="3" stroke-linecap="round"/>',
    snow_cloak: '<path d="M12 5 L22 5 L28 29 L6 29 Z" fill="#eef6ff" stroke="#7a90b0" stroke-width="1"/><path d="M12 5 L22 5 L20 9 L14 9 Z" fill="url(#bl)"/><path d="M10 18 L24 18 M9 23 L25 23" stroke="#a8c8e8" stroke-width="1"/>',
    iq_staff: '<path d="M8 30 L22 10" stroke="#c8e8ff" stroke-width="2.6" stroke-linecap="round"/><path d="M24 3 L28 8 L24 14 L20 8 Z" fill="#a8e8ff" stroke="#ffffff" stroke-width=".8"/><circle cx="24" cy="8.5" r="7" fill="#bfefff" opacity=".3"/>',
    web: '<g fill="none" stroke="#e8e4f0" stroke-width="1.1"><path d="M17 3 L17 31 M3 17 L31 17 M7 7 L27 27 M27 7 L7 27"/><circle cx="17" cy="17" r="4"/><circle cx="17" cy="17" r="8.5"/><circle cx="17" cy="17" r="13"/></g><circle cx="17" cy="17" r="2" fill="#2a2030"/>',
    paw: '<g fill="#6a4a2e" stroke="#2a1a0c" stroke-width=".8"><ellipse cx="17" cy="22" rx="7" ry="6"/><ellipse cx="9" cy="14" rx="2.6" ry="3.4"/><ellipse cx="14" cy="9" rx="2.6" ry="3.4"/><ellipse cx="20" cy="9" rx="2.6" ry="3.4"/><ellipse cx="25" cy="14" rx="2.6" ry="3.4"/></g>',
    food: '<path d="M6 18 C6 26 28 26 28 18 Z" fill="url(#wd)" stroke="#2a1a0c"/><circle cx="12" cy="16" r="3" fill="#c88a4a"/><circle cx="18" cy="15" r="3" fill="#b0703a"/><circle cx="23" cy="16.5" r="2.6" fill="#c88a4a"/>',
    skbook: '<rect x="6" y="5" width="22" height="25" rx="2" fill="#5a2a1c" stroke="#2a120a"/><rect x="9" y="8" width="16" height="19" fill="#e8dcc0"/><path d="M13 23 L21 11 M17 11 L21 11 L21 15" stroke="#7a3a1c" stroke-width="2" fill="none"/>',
    sk_heal: '<defs><radialGradient id="g_heal" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#8af08a"/><stop offset="1" stop-color="#1a5a1a"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_heal)" stroke="#1a1410"/><path d="M17 8 L17 26 M8 17 L26 17" stroke="#f0fff0" stroke-width="4"/>',
    sk_decwt: '<defs><radialGradient id="g_decwt" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#f0e0b0"/><stop offset="1" stop-color="#5a4a20"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_decwt)" stroke="#1a1410"/><path d="M24 6 C14 8 9 15 9 26 L11 26 C12 18 16 13 24 6 Z" fill="#fff8e0" stroke="#7a6a3a" stroke-width=".8"/><path d="M11 25 L22 9" stroke="#7a6a3a" stroke-width="1"/><path d="M8 29 L26 29" stroke="#fff8e0" stroke-width="1.6"/>',
    sk_icedagger: '<defs><radialGradient id="g_icedagger" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#d0f6ff"/><stop offset="1" stop-color="#164a7a"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_icedagger)" stroke="#1a1410"/><path d="M26 8 L14 20 L12 18 Z" fill="#f4feff" stroke="#6ac8f0" stroke-width=".8"/><path d="M11 17 L17 23 M12 22 L8 26" stroke="#e8faff" stroke-width="2.2" stroke-linecap="round"/>',
    sk_turnund: '<defs><radialGradient id="g_turnund" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fff4c8"/><stop offset="1" stop-color="#6a5418"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_turnund)" stroke="#1a1410"/><path d="M17 6 L17 28 M10 13 L24 13" stroke="#fffbe6" stroke-width="3" stroke-linecap="round"/><circle cx="17" cy="13" r="9" fill="none" stroke="rgba(255,250,220,.6)" stroke-width="1.2"/>',
    sk_medit: '<defs><radialGradient id="g_medit" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#c8d8ff"/><stop offset="1" stop-color="#22325e"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_medit)" stroke="#1a1410"/><circle cx="17" cy="10" r="3.2" fill="#eef4ff"/><path d="M17 14 L11 22 L23 22 Z" fill="#eef4ff"/><path d="M7 25 C12 22 22 22 27 25" stroke="#eef4ff" stroke-width="2" fill="none"/><circle cx="17" cy="16" r="11" fill="none" stroke="rgba(220,235,255,.45)" stroke-width="1"/>',
    sk_immune: '<defs><radialGradient id="g_immune" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fff3c4"/><stop offset="1" stop-color="#7a4a08"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_immune)" stroke="#1a1410"/><circle cx="17" cy="17.5" r="11" fill="none" stroke="#fffbe6" stroke-width="1.8" opacity=".95"/><circle cx="17" cy="12.6" r="3.4" fill="#fffbe6"/><path d="M10.5 25.5 C10.5 20 13.5 17.6 17 17.6 C20.5 17.6 23.5 20 23.5 25.5 Z" fill="#fffbe6"/><path d="M6.5 15 A11 11 0 0 1 27.5 15" fill="none" stroke="#ffd04a" stroke-width="2"/>',
    sk_counterm: '<defs><radialGradient id="g_counterm" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#e8c8ff"/><stop offset="1" stop-color="#3e1468"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_counterm)" stroke="#1a1410"/><path d="M17 6 L25 9 C25 17 22 23 17 27 C12 23 9 17 9 9 Z" fill="none" stroke="#f6eaff" stroke-width="2"/><path d="M13 13 L21 21 M21 13 L13 21" stroke="#ffd0ff" stroke-width="2.2" stroke-linecap="round"/>',
    sk_coc: '<defs><radialGradient id="g_coc" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#d8f6ff"/><stop offset="1" stop-color="#123e6a"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_coc)" stroke="#1a1410"/><path d="M9 28 L12 12 L15 28 Z M14 28 L17 6 L20 28 Z M19 28 L22 14 L25 28 Z" fill="#f0fcff" stroke="#7ad0f8" stroke-width=".7"/>',
    sk_sunburst: '<defs><radialGradient id="g_sunburst" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fff4b0"/><stop offset="1" stop-color="#9a4810"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_sunburst)" stroke="#1a1410"/><circle cx="17" cy="17" r="4.5" fill="#fffde8"/><path d="M17 4 L17 11 M17 23 L17 30 M4 17 L11 17 M23 17 L30 17 M8 8 L12.5 12.5 M21.5 21.5 L26 26 M26 8 L21.5 12.5 M8 26 L12.5 21.5" stroke="#fffbe0" stroke-width="1.8" stroke-linecap="round"/>',
    sk_light: '<defs><radialGradient id="g_light" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fff6b0"/><stop offset="1" stop-color="#8a7a20"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_light)" stroke="#1a1410"/><circle cx="17" cy="17" r="5" fill="#fffbe0"/><path d="M17 5 L17 9 M17 25 L17 29 M5 17 L9 17 M25 17 L29 17 M9 9 L11.5 11.5 M22.5 22.5 L25 25 M25 9 L22.5 11.5 M9 25 L11.5 22.5" stroke="#fffbe0" stroke-width="2"/>',
    sk_shieldm: '<defs><radialGradient id="g_shieldm" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#9fb8ff"/><stop offset="1" stop-color="#1a2a6a"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_shieldm)" stroke="#1a1410"/><path d="M17 6 L26 10 C26 19 22 25 17 28 C12 25 8 19 8 10 Z" fill="none" stroke="#e8f0ff" stroke-width="2.2"/>',
    sk_ebolt: '<defs><radialGradient id="g_ebolt" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#a0e0ff"/><stop offset="1" stop-color="#103a6a"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_ebolt)" stroke="#1a1410"/><circle cx="17" cy="17" r="6" fill="#e8f8ff"/><path d="M6 28 L13 21 M28 6 L21 13" stroke="#e8f8ff" stroke-width="2"/>',
    sk_enchant: '<defs><radialGradient id="g_enchant" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#a0e0ff"/><stop offset="1" stop-color="#2a3a5a"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_enchant)" stroke="#1a1410"/><path d="M23 6 L27 10 L13 24 L10 21 Z" fill="#e8f0ff"/><path d="M8 20 L14 26 M6 28 L9 25" stroke="#ffd86a" stroke-width="2"/><circle cx="25" cy="25" r="2" fill="#ffd86a"/>',
    sk_cure: '<defs><radialGradient id="g_cure" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#b0f0a0"/><stop offset="1" stop-color="#2a5a3a"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_cure)" stroke="#1a1410"/><path d="M12 8 L22 8 L20 14 C25 16 25 26 17 27 C9 26 9 16 14 14 Z" fill="#eaffea"/><path d="M14 20 L20 20 M17 17 L17 23" stroke="#2a7a3a" stroke-width="2"/>',
    sk_stun: '<defs><radialGradient id="g_stun" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#ffd84a"/><stop offset="1" stop-color="#8a5a00"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_stun)" stroke="#1a1410"/><path d="M19 4 L10 19 L17 19 L14 30 L25 13 L18 13 Z" fill="#fff4b0" stroke="#5a3a00" stroke-width="1"/>',
    sk_reduction: '<defs><radialGradient id="g_reduction" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#8ab0d8"/><stop offset="1" stop-color="#2a4a6a"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_reduction)" stroke="#1a1410"/><path d="M17 6 L27 10 C27 19 23 25 17 29 C11 25 7 19 7 10 Z" fill="none" stroke="#e8f0ff" stroke-width="2"/><path d="M12 17 L22 17" stroke="#e8f0ff" stroke-width="2.4"/>',
    sk_bounce: '<defs><radialGradient id="g_bounce" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#f0c060"/><stop offset="1" stop-color="#7a4a10"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_bounce)" stroke="#1a1410"/><path d="M8 26 L24 10 M18 10 L24 10 L24 16" fill="none" stroke="#fff6dc" stroke-width="2.4"/><circle cx="11" cy="11" r="3" fill="#fff6dc"/>',
    sk_solid: '<defs><radialGradient id="g_solid" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#c0c8d0"/><stop offset="1" stop-color="#3a4048"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_solid)" stroke="#1a1410"/><path d="M17 5 L28 9 C28 19 24 26 17 30 C10 26 6 19 6 9 Z" fill="#e8ecf0" stroke="#2a2e34" stroke-width="1.2"/><path d="M17 9 L17 26 M10 15 L24 15" stroke="#5a6068" stroke-width="2"/>',
    sk_counter: '<defs><radialGradient id="g_counter" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#e07070"/><stop offset="1" stop-color="#5a1a1a"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_counter)" stroke="#1a1410"/><circle cx="17" cy="17" r="10" fill="none" stroke="#ffe0e0" stroke-width="2"/><path d="M11 17 L23 17 M19 13 L23 17 L19 21" fill="none" stroke="#ffe0e0" stroke-width="2"/>',
    scr_w: '<rect x="8" y="6" width="18" height="22" rx="1.5" fill="url(#pp)" stroke="#5a4a2a"/><rect x="6" y="4" width="22" height="4.5" rx="2.2" fill="url(#wd)" stroke="#2a1a0c" stroke-width=".6"/><rect x="6" y="25.5" width="22" height="4.5" rx="2.2" fill="url(#wd)" stroke="#2a1a0c" stroke-width=".6"/><path d="M21.5 9.5 L23.5 11.5 L15.5 19.5 L13.5 17.5 Z" fill="url(#st)" stroke="#2a2e34" stroke-width=".6"/><path d="M11.5 16.5 L16.5 21.5" stroke="url(#gd)" stroke-width="1.8"/><path d="M12.6 20.4 L10.6 22.4" stroke="#4e2f14" stroke-width="2" stroke-linecap="round"/>',
    scr_a: '<rect x="8" y="6" width="18" height="22" rx="1.5" fill="url(#pp)" stroke="#5a4a2a"/><rect x="6" y="4" width="22" height="4.5" rx="2.2" fill="url(#wd)" stroke="#2a1a0c" stroke-width=".6"/><rect x="6" y="25.5" width="22" height="4.5" rx="2.2" fill="url(#wd)" stroke="#2a1a0c" stroke-width=".6"/><path d="M17 9.5 L23 11.8 C23 17.5 20.6 21 17 23.2 C13.4 21 11 17.5 11 11.8 Z" fill="url(#st)" stroke="#2a2e34" stroke-width=".8"/><path d="M17 11.5 L17 21.5 M13 14.5 L21 14.5" stroke="#8a2a1a" stroke-width="1.3"/>',
    scr_bw: '<rect x="8" y="6" width="18" height="22" rx="1.5" fill="url(#gd)" stroke="#5a4a2a"/><rect x="6" y="4" width="22" height="4.5" rx="2.2" fill="url(#wd)" stroke="#2a1a0c" stroke-width=".6"/><rect x="6" y="25.5" width="22" height="4.5" rx="2.2" fill="url(#wd)" stroke="#2a1a0c" stroke-width=".6"/><path d="M21.5 9.5 L23.5 11.5 L15.5 19.5 L13.5 17.5 Z" fill="url(#st)" stroke="#2a2e34" stroke-width=".6"/><path d="M11.5 16.5 L16.5 21.5" stroke="url(#gd)" stroke-width="1.8"/><path d="M12.6 20.4 L10.6 22.4" stroke="#4e2f14" stroke-width="2" stroke-linecap="round"/><path d="M25 6 L26 8.5 L28.5 9.5 L26 10.5 L25 13 L24 10.5 L21.5 9.5 L24 8.5 Z" fill="#fff6c8"/><path d="M9 20 L9.7 21.6 L11.3 22.3 L9.7 23 L9 24.6 L8.3 23 L6.7 22.3 L8.3 21.6 Z" fill="#fff6c8"/>',
    scr_ba: '<rect x="8" y="6" width="18" height="22" rx="1.5" fill="url(#gd)" stroke="#5a4a2a"/><rect x="6" y="4" width="22" height="4.5" rx="2.2" fill="url(#wd)" stroke="#2a1a0c" stroke-width=".6"/><rect x="6" y="25.5" width="22" height="4.5" rx="2.2" fill="url(#wd)" stroke="#2a1a0c" stroke-width=".6"/><path d="M17 9.5 L23 11.8 C23 17.5 20.6 21 17 23.2 C13.4 21 11 17.5 11 11.8 Z" fill="url(#st)" stroke="#2a2e34" stroke-width=".8"/><path d="M17 11.5 L17 21.5 M13 14.5 L21 14.5" stroke="#8a2a1a" stroke-width="1.3"/><path d="M25 6 L26 8.5 L28.5 9.5 L26 10.5 L25 13 L24 10.5 L21.5 9.5 L24 8.5 Z" fill="#fff6c8"/><path d="M9 20 L9.7 21.6 L11.3 22.3 L9.7 23 L9 24.6 L8.3 23 L6.7 22.3 L8.3 21.6 Z" fill="#fff6c8"/>',
    scr_earth: '<rect x="8" y="6" width="18" height="22" rx="1.5" fill="#c8a878" stroke="#5a4a2a"/><rect x="6" y="4" width="22" height="4.5" rx="2.2" fill="url(#wd)" stroke="#2a1a0c" stroke-width=".6"/><rect x="6" y="25.5" width="22" height="4.5" rx="2.2" fill="url(#wd)" stroke="#2a1a0c" stroke-width=".6"/><path d="M11 11 L23 11 L17 22 Z" fill="#7a4a1e" stroke="#f0d8a0" stroke-width="1"/><path d="M12.8 15.2 L21.2 15.2" stroke="#f0d8a0" stroke-width="1.1"/>',
    scr_water: '<rect x="8" y="6" width="18" height="22" rx="1.5" fill="#c8a878" stroke="#5a4a2a"/><rect x="6" y="4" width="22" height="4.5" rx="2.2" fill="url(#wd)" stroke="#2a1a0c" stroke-width=".6"/><rect x="6" y="25.5" width="22" height="4.5" rx="2.2" fill="url(#wd)" stroke="#2a1a0c" stroke-width=".6"/><path d="M17 10 C14.5 14.5 12.3 16.6 12.3 19.3 A4.7 4.7 0 0 0 21.7 19.3 C21.7 16.6 19.5 14.5 17 10 Z" fill="#2a6ab8" stroke="#d8f0ff" stroke-width="1"/><path d="M15 19.5 A2 2 0 0 0 17 21.5" stroke="#d8f0ff" stroke-width=".9" fill="none"/>',
    scr_fire: '<rect x="8" y="6" width="18" height="22" rx="1.5" fill="#c8a878" stroke="#5a4a2a"/><rect x="6" y="4" width="22" height="4.5" rx="2.2" fill="url(#wd)" stroke="#2a1a0c" stroke-width=".6"/><rect x="6" y="25.5" width="22" height="4.5" rx="2.2" fill="url(#wd)" stroke="#2a1a0c" stroke-width=".6"/><path d="M17 9.5 C19.2 13 22 14.6 21.6 18.6 C21.2 21.6 19.2 23 17 23 C14.6 23 12.5 21.2 12.5 18.6 C12.5 16 14.4 15 15 12.6 C16 14 16.5 15 17.1 15.6 C17.6 13.6 17.6 11.6 17 9.5 Z" fill="#c8401a" stroke="#ffe0a0" stroke-width="1"/><path d="M17 23 C15.6 23 14.8 21.8 15.2 20.4 C15.6 19.2 16.6 18.6 17 17.4 C17.6 18.8 18.9 19.6 18.8 21.2 C18.7 22.3 17.9 23 17 23 Z" fill="#ffc040"/>',
    scr_wind: '<rect x="8" y="6" width="18" height="22" rx="1.5" fill="#c8a878" stroke="#5a4a2a"/><rect x="6" y="4" width="22" height="4.5" rx="2.2" fill="url(#wd)" stroke="#2a1a0c" stroke-width=".6"/><rect x="6" y="25.5" width="22" height="4.5" rx="2.2" fill="url(#wd)" stroke="#2a1a0c" stroke-width=".6"/><path d="M10.5 14 H19.5 A2.6 2.6 0 1 0 17 11.3 M10.5 17.6 H22 A2.6 2.6 0 1 1 19.4 20.3 M12 21.2 H16.6" fill="none" stroke="#1e7a4a" stroke-width="1.8" stroke-linecap="round"/>',
    crystal: '<path d="M17 3 L25 12 L21 30 L13 30 L9 12 Z" fill="url(#gr)" stroke="#0e3a12" stroke-width="1"/><path d="M17 3 L17 30 M9 12 L25 12 M13 30 L17 12 L21 30" stroke="#d8ffd0" stroke-width=".8" opacity=".7"/><path d="M12 10 L15 6" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".8"/>',
    wing_gold: '<path d="M6 26 C8 14 16 6 29 4 C26 10 25 15 20 19 C22 19 24 18 26 17 C23 22 18 25 12 26 C14 24 15 23 16 21 C12 23 9 25 6 26 Z" fill="url(#gd)" stroke="#6a4a10" stroke-width=".9"/><path d="M8 24 C12 18 18 12 26 7 M12 24 C15 21 19 18 23 15" fill="none" stroke="#fff3c0" stroke-width=".8" opacity=".8"/>',
    wing_silver: '<path d="M6 26 C8 14 16 6 29 4 C26 10 25 15 20 19 C22 19 24 18 26 17 C23 22 18 25 12 26 C14 24 15 23 16 21 C12 23 9 25 6 26 Z" fill="url(#st)" stroke="#3a4048" stroke-width=".9"/><path d="M8 24 C12 18 18 12 26 7 M12 24 C15 21 19 18 23 15" fill="none" stroke="#ffffff" stroke-width=".8" opacity=".85"/>',
    scr_curse: '<rect x="8" y="6" width="18" height="22" rx="1.5" fill="#8a7a8e" stroke="#2a1a2e"/><rect x="6" y="4" width="22" height="4.5" rx="2.2" fill="#2a1430" stroke="#0e0410" stroke-width=".6"/><rect x="6" y="25.5" width="22" height="4.5" rx="2.2" fill="#2a1430" stroke="#0e0410" stroke-width=".6"/><circle cx="17" cy="17" r="6" fill="#3a0e4a" stroke="#12041a"/><path d="M14 15 L16 17 L14 19 M20 15 L18 17 L20 19 M14.5 21 C16 20 18 20 19.5 21" fill="none" stroke="#e080ff" stroke-width="1.1"/>',
    pouch_arka: '<circle cx="17" cy="22" r="9" fill="#b08aff" opacity=".16"/><path d="M10 13 C6 17 5 25 9 29 C13 32 21 32 25 29 C29 25 28 17 24 13 Z" fill="url(#cl)" stroke="#1a1028" stroke-width="1"/><path d="M11.5 13 C13 10.5 21 10.5 22.5 13 L21 8.5 C19 6.8 15 6.8 13 8.5 Z" fill="#5a3a8a" stroke="#1a1028" stroke-width=".8"/><path d="M10.5 13.4 C14 15.2 20 15.2 23.5 13.4" fill="none" stroke="url(#gd)" stroke-width="1.9"/><circle cx="24.6" cy="15" r="1.7" fill="url(#gd)" stroke="#5a3e14" stroke-width=".4"/><path d="M24.8 16.6 L26.4 21.5" stroke="url(#gd)" stroke-width="1.1"/><path d="M17 17.5 L19.8 22 L17 26.5 L14.2 22 Z" fill="#d6c0ff" stroke="#fbf4ff" stroke-width=".7"/><path d="M17 19.5 L18.3 22 L17 24.5 L15.7 22 Z" fill="#8a5ae0"/><path d="M12 6.5 L12.8 4.6 M22 6.5 L21.2 4.6 M17 5.2 L17 3" stroke="#efe2ff" stroke-width=".8" opacity=".85"/>',
    scr_bless: '<rect x="8" y="6" width="18" height="22" rx="1.5" fill="#fff6dc" stroke="#8a6a20"/><rect x="6" y="4" width="22" height="4.5" rx="2.2" fill="url(#gd)" stroke="#5a3e14" stroke-width=".6"/><rect x="6" y="25.5" width="22" height="4.5" rx="2.2" fill="url(#gd)" stroke="#5a3e14" stroke-width=".6"/><ellipse cx="17" cy="11.5" rx="5" ry="1.6" fill="none" stroke="#e0b030" stroke-width="1.2"/><path d="M17 14 L18.6 18 L22.8 18.3 L19.6 21 L20.6 25 L17 22.8 L13.4 25 L14.4 21 L11.2 18.3 L15.4 18 Z" fill="#ffd24a" stroke="#8a5a10" stroke-width=".6"/>',
    scr_home: '<rect x="8" y="6" width="18" height="22" rx="1.5" fill="url(#pb)" stroke="#5a4a2a"/><rect x="6" y="4" width="22" height="4.5" rx="2.2" fill="#2a4a7a" stroke="#2a1a0c" stroke-width=".6"/><rect x="6" y="25.5" width="22" height="4.5" rx="2.2" fill="#2a4a7a" stroke="#2a1a0c" stroke-width=".6"/><circle cx="17" cy="17" r="6.2" fill="#2a5aa8" stroke="#0e2a5a" stroke-width=".8"/><path d="M13.2 17.5 L17 13.8 L20.8 17.5 M14.4 16.6 L14.4 20.4 L19.6 20.4 L19.6 16.6" fill="none" stroke="#e8f0ff" stroke-width="1.2" stroke-linejoin="round"/>',
    scr_tele: '<rect x="8" y="6" width="18" height="22" rx="1.5" fill="url(#pc)" stroke="#5a4a2a"/><rect x="6" y="4" width="22" height="4.5" rx="2.2" fill="#1e5a5a" stroke="#2a1a0c" stroke-width=".6"/><rect x="6" y="25.5" width="22" height="4.5" rx="2.2" fill="#1e5a5a" stroke="#2a1a0c" stroke-width=".6"/><path d="M17 17 m0 0 c1.5-1.2 3.6 0 3.4 2 c-.3 2.8-4 3.8-6.2 2 c-2.8-2.3-1.6-6.8 1.6-7.8 c4-1.3 7.6 1.8 7 5.8" fill="none" stroke="#1a8a9a" stroke-width="1.6" stroke-linecap="round"/><circle cx="17" cy="17" r="1.2" fill="#1a8a9a"/>',
    scr_reset: '<rect x="8" y="6" width="18" height="22" rx="1.5" fill="url(#pr)" stroke="#5a4a2a"/><rect x="6" y="4" width="22" height="4.5" rx="2.2" fill="#6a1e14" stroke="#2a1a0c" stroke-width=".6"/><rect x="6" y="25.5" width="22" height="4.5" rx="2.2" fill="#6a1e14" stroke="#2a1a0c" stroke-width=".6"/><circle cx="17" cy="17" r="6.2" fill="#a8261a" stroke="#5a0e08" stroke-width=".8"/><path d="M13.6 16 A3.6 3.6 0 0 1 20.2 15.4 M20.4 18 A3.6 3.6 0 0 1 13.8 18.6" fill="none" stroke="#ffe8e0" stroke-width="1.2"/><path d="M20.6 13 L20.4 15.8 L17.8 15.2 M13.4 21 L13.6 18.2 L16.2 18.8" fill="none" stroke="#ffe8e0" stroke-width="1.1"/>',
    scr_rev: '<rect x="8" y="6" width="18" height="22" rx="1.5" fill="url(#pg)" stroke="#5a4a2a"/><rect x="6" y="4" width="22" height="4.5" rx="2.2" fill="#8a6a20" stroke="#2a1a0c" stroke-width=".6"/><rect x="6" y="25.5" width="22" height="4.5" rx="2.2" fill="#8a6a20" stroke="#2a1a0c" stroke-width=".6"/><path d="M17 10.5 C14.6 10.5 14 14.5 17 16.4 C20 14.5 19.4 10.5 17 10.5 Z" fill="none" stroke="#b07a10" stroke-width="1.6"/><path d="M12.6 17.2 L21.4 17.2 M17 16.4 L17 24" stroke="#b07a10" stroke-width="1.8" stroke-linecap="round"/><path d="M24 8 C21 10 20.5 13 21.8 15 C23.6 13.6 24.6 11 24 8 Z" fill="#fff6d0" stroke="#c8a050" stroke-width=".6"/>',
    collar: '<path d="M7 12 C7 22 27 22 27 12" fill="none" stroke="#3a1a0e" stroke-width="5" stroke-linecap="round"/><path d="M7 12 C7 22 27 22 27 12" fill="none" stroke="#a83a22" stroke-width="3" stroke-linecap="round"/><g fill="#e8d8a8"><circle cx="10" cy="16.5" r="1"/><circle cx="24" cy="16.5" r="1"/><circle cx="13.5" cy="18.8" r="1"/><circle cx="20.5" cy="18.8" r="1"/></g><path d="M17 19 L17 22" stroke="#8a7a50" stroke-width="1.2"/><path d="M17 21.5 L21 25 L17 30 L13 25 Z" fill="url(#gd)" stroke="#5a3e14" stroke-width=".8"/><path d="M15.5 25.5 C16 24 18 24 18.5 25.5" fill="none" stroke="#5a3e14" stroke-width=".7"/>',
    sk_xheal: '<defs><radialGradient id="g_xheal" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#8af08a"/><stop offset="1" stop-color="#1a5a1a"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_xheal)" stroke="#1a1410"/><path d="M13 9 L13 21 M7 15 L19 15 M22 14 L22 26 M16 20 L28 20" stroke="#f0fff0" stroke-width="3" stroke-linecap="round"/>',
    sk_barmor: '<defs><radialGradient id="g_barmor" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#7a5a10"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_barmor)" stroke="#1a1410"/><path d="M17 6 L27 10 C27 19 23 25 17 29 C11 25 7 19 7 10 Z" fill="#fff4c8" stroke="#8a6010" stroke-width="1.2"/><path d="M17 11 L17 24 M11 16 L23 16" stroke="#c89020" stroke-width="2"/>',
    sk_farrow: '<defs><radialGradient id="g_farrow" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#ff9a50"/><stop offset="1" stop-color="#7a1a08"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_farrow)" stroke="#1a1410"/><path d="M7 27 L24 10" stroke="#fff0d0" stroke-width="2.4"/><path d="M24 10 L27 7 L26 13 Z M21 8 L27 7 L22 12 Z" fill="#fff0d0"/><path d="M9 25 C6 22 8 18 11 20 C10 16 14 15 14 19" fill="#ffd060" stroke="#ff7020"/>',
    sk_fball: '<defs><radialGradient id="g_fball" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#ff7a40"/><stop offset="1" stop-color="#6a0a04"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_fball)" stroke="#1a1410"/><circle cx="17" cy="18" r="7" fill="#fff0a0"/><path d="M10 18 C8 11 14 6 17 8 C16 4 24 6 23 12 C27 13 26 20 24 22" fill="none" stroke="#ffd060" stroke-width="2"/>',
    sk_slow: '<defs><radialGradient id="g_slow" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#b0a0d8"/><stop offset="1" stop-color="#3a2a5a"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_slow)" stroke="#1a1410"/><path d="M11 7 L23 7 L23 9 C23 13 19 15 17 17 C19 19 23 21 23 25 L23 27 L11 27 L11 25 C11 21 15 19 17 17 C15 15 11 13 11 9 Z" fill="none" stroke="#f0e8ff" stroke-width="1.8"/><path d="M13 25 L21 25 L17 21 Z M14 10 L20 10 L17 14 Z" fill="#f0e8ff"/>',
    sk_edex: '<defs><radialGradient id="g_edex" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#8ae0c0"/><stop offset="1" stop-color="#1a5a4a"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_edex)" stroke="#1a1410"/><path d="M24 6 C14 9 10 18 10 28 C14 22 20 18 24 6 Z" fill="#e8fff0" stroke="#3a6a4a"/><path d="M10 28 L22 10" stroke="#3a6a4a"/>',
    sk_clight: '<defs><radialGradient id="g_clight" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#7a9ae0"/><stop offset="1" stop-color="#101a4a"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_clight)" stroke="#1a1410"/><path d="M9 13 C9 9 14 8 16 10 C18 6 25 8 24 12 C27 12 27 16 24 16 L10 16 C7 16 7 13 9 13 Z" fill="#e8f0ff"/><path d="M17 16 L13 23 L17 23 L14 29 L22 20 L18 20 L20 16 Z" fill="#fff080" stroke="#806000" stroke-width=".6"/>',
    sk_emight: '<defs><radialGradient id="g_emight" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#e07070"/><stop offset="1" stop-color="#5a0c0c"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_emight)" stroke="#1a1410"/><path d="M17 5 L20 9 L18 9 L18 22 L16 22 L16 9 L14 9 Z" fill="#fff0e0"/><path d="M11 22 L23 22 M17 22 L17 28" stroke="#fff0e0" stroke-width="2.4"/>',
    sk_haste: '<defs><radialGradient id="g_haste" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#ffd060"/><stop offset="1" stop-color="#8a4a00"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_haste)" stroke="#1a1410"/><path d="M8 12 L16 12 M6 17 L15 17 M8 22 L16 22" stroke="#fffbe0" stroke-width="2"/><path d="M18 9 L26 17 L18 25 Z" fill="#fffbe0"/>',
    sk_gheal: '<defs><radialGradient id="g_gheal" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#a0ffa0"/><stop offset="1" stop-color="#1a6a20"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_gheal)" stroke="#1a1410"/><path d="M17 7 L17 27 M7 17 L27 17" stroke="#f8fff0" stroke-width="5" stroke-linecap="round"/><circle cx="17" cy="17" r="11" fill="none" stroke="#e0ffd0" stroke-width="1" stroke-dasharray="2 2"/>',
    sk_cdetect: '<defs><radialGradient id="g_cdetect" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#8a8ae0"/><stop offset="1" stop-color="#1a1a5a"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_cdetect)" stroke="#1a1410"/><path d="M5 17 C10 9 24 9 29 17 C24 25 10 25 5 17 Z" fill="#f0f4ff" stroke="#203050"/><circle cx="17" cy="17" r="4.5" fill="#3a6ac8"/><circle cx="17" cy="17" r="2" fill="#0a1020"/>',
    sk_czombie: '<defs><radialGradient id="g_czombie" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#9ab070"/><stop offset="1" stop-color="#2a3a14"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_czombie)" stroke="#1a1410"/><path d="M10 16 C10 9 24 9 24 16 C24 20 22 21 22 24 L12 24 C12 21 10 20 10 16 Z" fill="#e8f0d8"/><circle cx="14" cy="16" r="2" fill="#1a2a10"/><circle cx="20" cy="16" r="2" fill="#1a2a10"/><path d="M14 24 L14 27 M17 24 L17 27 M20 24 L20 27" stroke="#e8f0d8" stroke-width="1.6"/>',
    sk_blizzard: '<defs><radialGradient id="g_blizzard" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#a8e0ff"/><stop offset="1" stop-color="#14406a"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_blizzard)" stroke="#1a1410"/><g stroke="#f0faff" stroke-width="1.8" stroke-linecap="round"><path d="M17 6 L17 28 M7.5 11.5 L26.5 22.5 M7.5 22.5 L26.5 11.5"/><path d="M14 8 L17 11 L20 8 M14 26 L17 23 L20 26"/></g>',
    sk_eruption: '<defs><radialGradient id="g_eruption" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#e0904a"/><stop offset="1" stop-color="#4a1a06"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_eruption)" stroke="#1a1410"/><path d="M5 28 L13 14 L17 18 L21 12 L29 28 Z" fill="#6a3a1a" stroke="#2a1006"/><path d="M15 12 C14 7 18 5 17 2 M19 11 C21 7 24 7 23 4" stroke="#ffb040" stroke-width="2" fill="none"/><path d="M13 14 L17 18 L21 12" stroke="#ff6020" stroke-width="1.6" fill="none"/>',
    sk_rcurse: '<defs><radialGradient id="g_rcurse" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#c0a0f0"/><stop offset="1" stop-color="#3a1a6a"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_rcurse)" stroke="#1a1410"/><g fill="none" stroke="#f0e8ff" stroke-width="2.2"><rect x="6" y="13" width="10" height="7" rx="3.5"/><rect x="18" y="13" width="10" height="7" rx="3.5"/></g><path d="M15 9 L17 13 M19 9 L17 13 M17 21 L15 25 M17 21 L19 25" stroke="#ffe080" stroke-width="1.4"/>',
    sk_healall: '<defs><radialGradient id="g_healall" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#c8f08a"/><stop offset="1" stop-color="#3a6a1a"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_healall)" stroke="#1a1410"/><g stroke="#f0fff0" stroke-width="2.6" stroke-linecap="round"><path d="M17 6 L17 14 M13 10 L21 10"/><path d="M10 17 L10 25 M6 21 L14 21"/><path d="M24 17 L24 25 M20 21 L28 21"/></g>',
    sk_ghaste: '<defs><radialGradient id="g_ghaste" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#ffb050"/><stop offset="1" stop-color="#7a3000"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_ghaste)" stroke="#1a1410"/><path d="M7 9 L15 17 L7 25 M16 9 L24 17 L16 25" fill="none" stroke="#fffbe0" stroke-width="3" stroke-linejoin="round"/>',
    sk_disint: '<defs><radialGradient id="g_disint" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#d070d0"/><stop offset="1" stop-color="#3a0a3a"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_disint)" stroke="#1a1410"/><path d="M4 17 L30 17" stroke="#fff" stroke-width="3"/><circle cx="17" cy="17" r="6" fill="none" stroke="#ffd0ff" stroke-width="1.6"/><path d="M11 11 L8 8 M23 11 L26 8 M11 23 L8 26 M23 23 L26 26" stroke="#ffd0ff" stroke-width="1.4"/>',
    sk_meteor: '<defs><radialGradient id="g_meteor" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#c05030"/><stop offset="1" stop-color="#2a0804"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_meteor)" stroke="#1a1410"/><circle cx="21" cy="21" r="6" fill="#ffb040" stroke="#6a2a00"/><path d="M16 16 L6 6 M18 13 L10 4 M13 18 L4 10" stroke="#ffe0a0" stroke-width="2" stroke-linecap="round"/>',
    sk_abarrier: '<defs><radialGradient id="g_abarrier" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#c8d8f0"/><stop offset="1" stop-color="#2a3a5a"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_abarrier)" stroke="#1a1410"/><circle cx="17" cy="17" r="11" fill="rgba(255,255,255,.18)" stroke="#f0f8ff" stroke-width="2"/><path d="M17 10 L22 12 C22 17 20 20 17 22 C14 20 12 17 12 12 Z" fill="#f0f8ff"/>',
    sk_resur: '<defs><radialGradient id="g_resur" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fff0b0"/><stop offset="1" stop-color="#8a6a10"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_resur)" stroke="#1a1410"/><path d="M17 6 C13.5 6 13 12 17 14.5 C21 12 20.5 6 17 6 Z" fill="none" stroke="#fff6d0" stroke-width="2.2"/><path d="M11 16 L23 16 M17 14.5 L17 28" stroke="#fff6d0" stroke-width="2.6" stroke-linecap="round"/>',
    sk_tornado: '<defs><radialGradient id="g_tornado" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#9ad8c8"/><stop offset="1" stop-color="#1a4a42"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_tornado)" stroke="#1a1410"/><g fill="none" stroke="#e8fff8" stroke-width="2" stroke-linecap="round"><path d="M7 8 L27 8"/><path d="M9 13 L25 13"/><path d="M12 18 L23 18"/><path d="M14 23 L20 23"/><path d="M16 28 L18 28"/></g>',
    sk_quake: '<defs><radialGradient id="g_quake" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#c09060"/><stop offset="1" stop-color="#3a220a"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_quake)" stroke="#1a1410"/><path d="M4 20 L30 20 L30 28 L4 28 Z" fill="#6a4a2a"/><path d="M8 20 L12 26 L15 21 L19 28 L22 22 L26 27" fill="none" stroke="#1a0e04" stroke-width="1.6"/><path d="M10 14 L13 9 M18 13 L18 7 M25 14 L22 9" stroke="#ffd080" stroke-width="1.6"/>',
    sk_fstorm: '<defs><radialGradient id="g_fstorm" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#ff6a30"/><stop offset="1" stop-color="#5a0800"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_fstorm)" stroke="#1a1410"/><path d="M17 28 C9 26 8 18 13 14 C13 18 16 19 16 16 C16 11 19 9 18 5 C24 9 27 16 24 22 C23 18 21 18 21 20 C21 24 19 27 17 28 Z" fill="#ffb030" stroke="#8a2a00"/><path d="M17 26 C14 24 14 20 17 18 C18 21 20 22 19 25" fill="#fff0a0"/>',
    sk_resist_magic: '<defs><radialGradient id="g_resist_magic" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#8ae0a8"/><stop offset="1" stop-color="#14502a"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_resist_magic)" stroke="#1a1410"/><path d="M17 6 L27 10 C27 19 23 25 17 29 C11 25 7 19 7 10 Z" fill="none" stroke="#e0fff0" stroke-width="2"/><path d="M17 11 L18.8 15.4 L23.5 15.6 L19.8 18.5 L21 23 L17 20.4 L13 23 L14.2 18.5 L10.5 15.6 L15.2 15.4 Z" fill="#e0fff0"/>',
    sk_body_mind: '<defs><radialGradient id="g_body_mind" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#e0a0c8"/><stop offset="1" stop-color="#4a1a3a"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_body_mind)" stroke="#1a1410"/><path d="M12 9 C8 9 7 14 12 19 L17 23 L22 19 C27 14 26 9 22 9 C19 9 17 12 17 12 C17 12 15 9 12 9 Z" fill="#ffb0b0"/><path d="M17 23 L17 28" stroke="#a0c8ff" stroke-width="2"/><path d="M14 27 Q17 31 20 27" fill="#a0c8ff"/>',
    sk_tele_tree: '<defs><radialGradient id="g_tele_tree" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#a0d8f0"/><stop offset="1" stop-color="#1a4a6a"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_tele_tree)" stroke="#1a1410"/><path d="M17 28 L17 17" stroke="#6a4020" stroke-width="3"/><circle cx="17" cy="13" r="8" fill="#9ae070" stroke="#2a5a1a"/><circle cx="12" cy="16" r="4" fill="#7ac050"/><circle cx="22" cy="16" r="4" fill="#7ac050"/>',
    sk_clear_mind: '<defs><radialGradient id="g_clear_mind" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#d0b8f0"/><stop offset="1" stop-color="#3a2a5a"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_clear_mind)" stroke="#1a1410"/><path d="M17 24 C12 22 10 17 12 12 C15 14 17 18 17 24 Z M17 24 C22 22 24 17 22 12 C19 14 17 18 17 24 Z M17 24 C15 18 15 12 17 8 C19 12 19 18 17 24 Z" fill="#f0e0ff" stroke="#6a4a8a" stroke-width=".8"/>',
    sk_resist_elem: '<defs><radialGradient id="g_resist_elem" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#8a8a9a"/><stop offset="1" stop-color="#1a1a24"/></radialGradient></defs><rect x="2" y="2" width="30" height="30" rx="4" fill="url(#g_resist_elem)" stroke="#1a1410"/><circle cx="17" cy="9" r="3.5" fill="#ff7040"/><circle cx="25" cy="17" r="3.5" fill="#60c0ff"/><circle cx="17" cy="25" r="3.5" fill="#c08a40"/><circle cx="9" cy="17" r="3.5" fill="#a0f0c0"/><circle cx="17" cy="17" r="3" fill="#fff"/>',
    scroll: '<rect x="7" y="7" width="20" height="20" rx="2" fill="url(#pp)" stroke="#6a5a3a"/><path d="M11 12 L23 12 M11 16 L23 16 M11 20 L19 20" stroke="#8a2a1a" stroke-width="1.4"/>',
    book: '<rect x="7" y="5" width="20" height="24" rx="2" fill="url(#bl)" stroke="#0a1a3a"/><rect x="10" y="5" width="2" height="24" fill="#0a1a3a"/><path d="M16 13 L22 13 L19 19 Z" fill="url(#gd)"/>',
  };
  for (const k of ['helm', 'armor', 'gloves', 'boots']) P[k + '_p'] = P[k].replace(/url\(#lt\)/g, 'url(#st)').replace(/#2a1a0c/g, '#2a2e34').replace(/#3a2614/g, '#5a606a');   // 판금: 강철빛
  // 마법서·기술서·정령수정: 표지에 그 마법의 문양(sk_ 아이콘)을 메달처럼 박음 + 마법서는 서클 숫자
  const TIER = c => c <= 2 ? ['#4a6ad0', '#14204a'] : c <= 4 ? ['#2a9a9a', '#0c3434'] : c <= 6 ? ['#8a4ac8', '#2a0c4a'] : c <= 8 ? ['#c84a3a', '#4a0c0c'] : ['#4a4a52', '#0a0a0e'];
  const medal = (id, cx, cy, r) => `<clipPath id="mc"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath><circle cx="${cx}" cy="${cy}" r="${r + 1.3}" fill="url(#gd)" stroke="#3a2808" stroke-width=".6"/><g clip-path="url(#mc)"><g transform="translate(${cx} ${cy}) scale(${(r * 2.2) / 30}) translate(-17 -17)">${P['sk_' + id] || P.scroll}</g></g>`;
  function bookSVG(id) { const k = SK[id]; if (!k) return P.book;
    if (k.kind === 'spirit') return `<path d="M17 2 L27 12 L22 31 L12 31 L7 12 Z" fill="url(#gr)" stroke="#0e3a12" stroke-width="1"/><path d="M17 2 L17 8 M7 12 L12 13 M27 12 L22 13" stroke="#d8ffd0" stroke-width=".7" opacity=".7"/>${medal(id, 17, 18.5, 6.4)}`;
    if (k.kind === 'skill') return `<defs><linearGradient id="bkl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9a6a3a"/><stop offset="1" stop-color="#3a2210"/></linearGradient></defs><rect x="5" y="4" width="23" height="26" rx="2" fill="url(#bkl)" stroke="#1e1006"/><rect x="5" y="4" width="3.5" height="26" fill="#2a1808"/><rect x="9.5" y="6" width="17" height="22" rx="1" fill="none" stroke="#c8a060" stroke-width=".7" stroke-dasharray="1.5 1"/>${medal(id, 17.5, 16, 7.4)}<rect x="25" y="13" width="5" height="7" rx="1" fill="#9aa2ac" stroke="#2a2e34" stroke-width=".7"/><circle cx="27.5" cy="16.5" r="1" fill="#2a2e34"/>`;
    const [c1, c2] = TIER(k.circle); return `<defs><linearGradient id="bkm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect x="5" y="4" width="23" height="26" rx="2" fill="url(#bkm)" stroke="#0a0a1a"/><rect x="5" y="4" width="3.5" height="26" fill="${c2}"/><rect x="9.5" y="6" width="17" height="22" rx="1" fill="none" stroke="url(#gd)" stroke-width=".9"/>${medal(id, 18, 17, 7.2)}<circle cx="26.5" cy="7.5" r="4.6" fill="#f2d98a" stroke="#3a2a10" stroke-width=".8"/><text x="26.5" y="9.9" font-size="${k.circle >= 10 ? 5.6 : 6.8}" font-weight="800" text-anchor="middle" fill="#2a1a08" font-family="sans-serif">${k.circle}</text>`; }
  let uid = 0;
  const BLF = '<filter id="blf" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="1.6" result="d"/><feFlood flood-color="#fff2b8"/><feComposite in2="d" operator="in" result="o"/><feGaussianBlur in="o" stdDeviation="1.4" result="gl"/>'
    + '<feMorphology in="SourceAlpha" operator="dilate" radius="0.8" result="d2"/><feFlood flood-color="#ffd24a"/><feComposite in2="d2" operator="in" result="rim"/><feMorphology in="SourceAlpha" operator="erode" radius="0.7" result="er"/><feComposite in="SourceAlpha" in2="er" operator="out" result="edge"/><feFlood flood-color="#ffffff" flood-opacity=".85"/><feComposite in2="edge" operator="in" result="inner"/>'
    + '<feMerge><feMergeNode in="gl"/><feMergeNode in="gl"/><feMergeNode in="rim"/><feMergeNode in="SourceGraphic"/><feMergeNode in="inner"/></feMerge></filter>';
  return (k, blessed) => { const u = 'i' + (++uid).toString(36), body = P[k] || CXI[k] || (String(k).startsWith('bk_') ? bookSVG(k.slice(3)) : P.scroll); return `<svg viewBox="0 0 34 34" aria-hidden="true"${blessed ? ' class="bl-svg"' : ''}>${defs}${blessed ? `<defs>${BLF}</defs><g filter="url(#blf)">${body}</g>` : body}</svg>`.replace(/id="([\w-]+)"/g, `id="$1_${u}"`).replace(/url\(#([\w-]+)\)/g, `url(#$1_${u})`); };
})();
const SLOTS = [['helm', '투구'], ['amulet', '목걸이'], ['cloak', '망토'], ['armor', '갑옷'], ['shirt', '티셔츠'], ['weapon', '무기'], ['belt', '벨트'], ['shield', '방패'], ['ring1', '반지'], ['gloves', '장갑'], ['ring2', '반지'], ['boots', '부츠']];
// 아이템 도감 (수치는 기획팀 임시안)
const ITEMS = {
  old_sword: { wtype: 'sword', name: '낡은 한손검', slot: 'weapon', icon: 'sword', dmg: [1, 5], w: 5 },
  short_sword: { wtype: 'sword', name: '한손검', slot: 'weapon', icon: 'sword', dmg: [1, 8], w: 6 },
  long_sword: { wtype: 'sword', name: '장검', slot: 'weapon', icon: 'sword', dmg: [2, 10], w: 7 },
  wood_shield: { name: '나무 방패', slot: 'shield', icon: 'shield', ac: 1, w: 6 },
  leather_helm: { name: '가죽 투구', slot: 'helm', icon: 'helm', ac: 1, w: 3, look: 'l' },
  leather_armor: { name: '가죽 갑옷', slot: 'armor', icon: 'armor', ac: 2, w: 10, look: 'l' },
  cloth_shirt: { name: '천 티셔츠', slot: 'shirt', icon: 'shirt', ac: 0, w: 1 },
  cloak: { name: '천 망토', slot: 'cloak', icon: 'cloak', ac: 1, w: 2 },
  leather_belt: { name: '가죽 벨트', slot: 'belt', icon: 'belt', ac: 0, w: 1, mp: 2 },
  leather_boots: { name: '가죽 장화', slot: 'boots', icon: 'boots', ac: 1, w: 3, look: 'l' },
  leather_gloves: { name: '가죽 장갑', slot: 'gloves', icon: 'gloves', ac: 1, w: 2, look: 'l' },
  // 판금 방어구 (기사 렌더용 외형 look:'p' → 레이어 <부위>_p)
  plate_helm: { name: '판금 투구', slot: 'helm', icon: 'helm_p', ac: 2, w: 8, look: 'p', desc: '강철 판을 두드려 만든 투구.' },
  plate_armor: { name: '판금 갑옷', slot: 'armor', icon: 'armor_p', ac: 5, w: 25, look: 'p', desc: '온몸을 강철 판으로 감싸는 무거운 갑옷.' },
  plate_gloves: { name: '판금 장갑', slot: 'gloves', icon: 'gloves_p', ac: 1, w: 5, look: 'p', desc: '강철 마디를 덧댄 장갑.' },
  dk_helm: { name: '데스나이트 투구', slot: 'helm', icon: 'dk_helm', ac: 3, w: 10, look: 'p', rar: '희귀', only: 'knight', set: 'dk', desc: '검게 그을린 강철 투구. 눈구멍 너머로 붉은 빛이 일렁인다.' },
  dk_armor: { name: '데스나이트 갑옷', slot: 'armor', icon: 'dk_armor', ac: 6, w: 30, look: 'p', rar: '희귀', only: 'knight', set: 'dk', desc: '죽음의 기사가 입던 판금 갑옷.' },
  dk_gloves: { name: '데스나이트 장갑', slot: 'gloves', icon: 'dk_gloves', ac: 2, w: 6, look: 'p', rar: '희귀', only: 'knight', set: 'dk', desc: '손등에 핏빛 문양이 새겨진 강철 장갑.' },
  dk_boots: { name: '데스나이트 장화', slot: 'boots', icon: 'dk_boots', ac: 2, w: 8, look: 'p', rar: '희귀', only: 'knight', set: 'dk', desc: '무거운 강철 장화.' },
  dk_sword: { wtype: 'sword', name: '데스나이트의 불검', slot: 'weapon', icon: 'dk_sword', dmg: [6, 18], xdmg: 2, w: 12, rar: '영웅', only: 'knight', desc: '지옥불로 달군 칼날. 휘두를 때마다 불티가 흩날린다.' },
  snow_cloak: { name: '설원의 망토', slot: 'cloak', icon: 'snow_cloak', ac: 1, waterRes: 20, mr: 5, w: 4, rar: '희귀', desc: '얼음여왕의 눈보라를 견딘 흰 털 망토. (물 저항 +20 · MR +5)' },
  iq_staff: { wtype: 'staff', name: '얼음여왕의 지팡이', slot: 'weapon', icon: 'iq_staff', dmg: [4, 10], sp: 3, mr: 5, w: 6, rar: '영웅', desc: '서리꽃이 피어나는 수정 지팡이. (SP +3 · MR +5)' },
  plate_boots: { name: '판금 장화', slot: 'boots', icon: 'boots_p', ac: 2, w: 8, look: 'p', desc: '강철 정강이 보호대가 달린 장화.' },
  silver_ring: { name: '은 반지', slot: 'ring', icon: 'ring', ac: 1, w: 1, hp: 5 },
  amulet: { name: '수호의 목걸이', slot: 'amulet', icon: 'amulet', ac: 1, w: 1 },
  red_potion: { name: '빨간 물약', icon: 'pot_red', use: 'heal', heal: [15, 20], w: 0.5, stack: true },
  orange_potion: { name: '주홍 물약', icon: 'pot_or', use: 'heal', heal: [30, 40], w: 0.5, stack: true },
  clear_potion: { name: '맑은 물약', icon: 'pot_wh', use: 'heal', heal: [50, 60], w: 0.5, stack: true },
  antidote: { name: '해독제', icon: 'antidote', use: 'antidote', w: 0.3, stack: true, desc: '독을 바로 치료합니다. (본토던전 구울 대비)' },
  candle: { name: '양초', icon: 'candle', use: 'candle', buff: 'light', w: 0.3, stack: true, desc: '켜면 10분 동안 밤 시야가 넓어져요.' },
  mana_potion: { name: '마나 회복 물약', icon: 'pot_bl', use: 'mana', buff: 'mana', w: 0.5, stack: true, desc: '10분 동안 MP 자연 회복이 초당 0.5씩 늘어납니다. (즉시 회복은 없음 · 다시 마시면 남은 시간이 10분으로)' },
  green_potion: { name: '초록 물약', icon: 'pot_gr', use: 'haste', haste: 1, dur: 600, w: 0.5, stack: true },
  brave_potion: { name: '용기의 물약', icon: 'pot_br', use: 'haste', haste: 2, dur: 600, w: 0.5, stack: true },
  ...Object.fromEntries(Object.entries(SK).map(([k, v]) => ['book_' + k, { name: v.book, icon: 'bk_' + k, use: 'learn', learn: k, w: 0.5, stack: true }])),
  scroll_weapon: { name: '무기 마법 주문서', icon: 'scr_w', use: 'enchant', ench: 'weapon', w: 0.6, stack: true, rar: '고급', desc: '무기의 강화 수치를 +1 올립니다. 안전 강화(일반 +6 · 고급 +5 · 희귀 +4 · 영웅 +3)를 넘기면 실패할 때 무기가 증발합니다. 높은 등급일수록 강화 1당 공격이 많이 올라요. (일반 +1 · 고급 +1.5 · 희귀 +2 · 영웅 +3)' },
  scroll_armor: { name: '갑옷 마법 주문서', icon: 'scr_a', use: 'enchant', ench: 'armor', w: 0.6, stack: true, rar: '고급', desc: '방어구(투구·갑옷·방패·망토·티셔츠·장갑·부츠)의 강화 수치를 +1 올립니다. 안전 강화(일반 +6 · 고급 +5 · 희귀 +4 · 영웅 +3)를 넘기면 실패할 때 증발합니다. 높은 등급일수록 강화 1당 방어가 많이 올라요. (일반 +1 · 고급 +1.25 · 희귀 +1.5 · 영웅 +2)' },
  bscroll_weapon: { name: '축복받은 무기 마법 주문서', icon: 'scr_bw', use: 'enchant', ench: 'weapon', bless: true, w: 0.6, stack: true, rar: '영웅', desc: '무기의 강화 수치를 +1~2 올립니다. (+7 이상부터는 +1) 안전 강화를 넘긴 무기는 실패하면 증발합니다.' },
  bscroll_armor: { name: '축복받은 갑옷 마법 주문서', icon: 'scr_ba', use: 'enchant', ench: 'armor', bless: true, w: 0.6, stack: true, rar: '희귀', desc: '방어구의 강화 수치를 +1~2 올립니다. (+7 이상부터는 +1) 안전 강화를 넘긴 방어구는 실패하면 증발합니다.' },
  scroll_earth: { name: '땅 속성 강화 주문서', icon: 'scr_earth', use: 'attr', el: 'earth', w: 0.6, stack: true, rar: '희귀', desc: '무기에 땅 속성을 부여합니다. 1단 +1 · 2단 +3 · 3단 +5 추가 피해 — 바람 몬스터에게는 2배, 땅 몬스터에게는 0. 다른 속성이 붙은 무기에 쓰면 성공 시 땅 1단으로 바뀝니다. 실패해도 무기는 그대로입니다. (성공률 1단 80% · 2단 45% · 3단 20%)' },
  scroll_water: { name: '물 속성 강화 주문서', icon: 'scr_water', use: 'attr', el: 'water', w: 0.6, stack: true, rar: '희귀', desc: '무기에 물 속성을 부여합니다. 1단 +1 · 2단 +3 · 3단 +5 추가 피해 — 불 몬스터에게는 2배, 물 몬스터에게는 0. 다른 속성이 붙은 무기에 쓰면 성공 시 물 1단으로 바뀝니다. 실패해도 무기는 그대로입니다. (성공률 1단 80% · 2단 45% · 3단 20%)' },
  scroll_fire: { name: '불 속성 강화 주문서', icon: 'scr_fire', use: 'attr', el: 'fire', w: 0.6, stack: true, rar: '희귀', desc: '무기에 불 속성을 부여합니다. 1단 +1 · 2단 +3 · 3단 +5 추가 피해 — 물 몬스터에게는 2배, 불 몬스터에게는 0. 다른 속성이 붙은 무기에 쓰면 성공 시 불 1단으로 바뀝니다. 실패해도 무기는 그대로입니다. (성공률 1단 80% · 2단 45% · 3단 20%)' },
  scroll_wind: { name: '바람 속성 강화 주문서', icon: 'scr_wind', use: 'attr', el: 'wind', w: 0.6, stack: true, rar: '희귀', desc: '무기에 바람 속성을 부여합니다. 1단 +1 · 2단 +3 · 3단 +5 추가 피해 — 땅 몬스터에게는 2배, 바람 몬스터에게는 0. 다른 속성이 붙은 무기에 쓰면 성공 시 바람 1단으로 바뀝니다. 실패해도 무기는 그대로입니다. (성공률 1단 80% · 2단 45% · 3단 20%)' },
  gold_wing: { name: '금빛 날개', icon: 'wing_gold', w: 1, stack: true, rar: '영웅', desc: '희귀 재료. 거대 여왕개미의 금빛 날개. 비싸게 팔 수 있고, 나중에 제작 재료로 쓰입니다.', price: 50000 },
  silver_wing: { name: '은빛 날개', icon: 'wing_silver', w: 1, stack: true, rar: '희귀', desc: '희귀 재료. 거대 여왕개미의 은빛 날개. 비싸게 팔 수 있고, 나중에 제작 재료로 쓰입니다.', price: 15000 },
  cscroll_weapon: { name: '저주받은 무기 마법 주문서', icon: 'scr_curse', use: 'enchant', ench: 'weapon', curse: true, w: 0.6, stack: true, rar: '희귀', desc: '무기의 강화 수치를 -1 낮춥니다. (성공률 100% · 최저 -7)' },
  cscroll_armor: { name: '저주받은 갑옷 마법 주문서', icon: 'scr_curse', use: 'enchant', ench: 'armor', curse: true, w: 0.6, stack: true, rar: '희귀', desc: '방어구의 강화 수치를 -1 낮춥니다. (성공률 100% · 최저 -7)' },
  arka_pouch: { name: '아르카의 마법주머니', icon: 'pouch_arka', use: 'pouch', w: 0.5, stack: true, rar: '희귀', desc: '대마법사 아르카가 온갖 보물을 담아 봉인한 주머니. 열면 하나가 나옵니다 — 갑옷·무기 마법 주문서 51% · 축복 부여 주문서 9% · 축복받은 갑옷/무기 마법 주문서 7% · 모든 직업의 희귀 장비 30% · 영웅 장비 3%. (잡화상점 10,000골드)' },
  bless_scroll: { name: '축복 부여 주문서', icon: 'scr_bless', use: 'blessit', w: 0.6, stack: true, rar: '희귀', desc: '장비를 20% 확률로 축복받은 장비로 만듭니다. 검·활: 추가 타격 · 지팡이: SP(마법 공격력) +1~2 · 방어구: 방어 +1. 실패해도 장비는 그대로입니다.' },
  scale_armor: { name: '비늘 갑옷', slot: 'armor', icon: 'armor', ac: 4, w: 18, rar: '희귀', desc: '사막 도마뱀 비늘로 엮은 갑옷.' },
  scimitar: { name: '사막의 곡도', slot: 'weapon', wtype: 'sword', icon: 'sword', dmg: [2, 12], w: 7, rar: '희귀', desc: '사막 전사들이 쓰는 휘어진 칼.' },
  pet_collar: { name: '펫 목걸이', icon: 'collar', use: 'pet', petKind: 'doberman', w: 1, desc: '도베르만이 깃든 목걸이. 펫상인에게서 \'펫을 찾는다\'로 소환하고, 더블클릭하면 펫 창(레벨·HP·가방·명령)이 열립니다. 꾹 눌러 이름을 바꿀 수 있어요.' },
  revive_scroll: { name: '부활 주문서', icon: 'scr_rev', use: 'revive', w: 0.6, stack: true, desc: '쓰러진 펫이나 동료를 되살립니다. (HP 50%로 부활 · 몬스터는 불가)' },
  stat_reset: { name: '능력치 초기화 주문서', icon: 'scr_reset', use: 'statreset', w: 0.5, stack: true },
  arrow: { name: '화살', icon: 'arrow', w: 0.01, stack: true, desc: '요정이 활을 쏠 때마다 1개씩 씁니다.' },
  return_scroll: { name: '귀환 주문서', icon: 'scr_home', use: 'home', w: 0.6, stack: true },
  tele_scroll: { name: '순간이동 주문서', icon: 'scr_tele', use: 'tele', w: 0.6, stack: true },
  spellbook: { name: '마법서', icon: 'book', w: 2 },
};

// ===== 장비 도감 아이콘: 아이템마다 모양·색이 다른 그림 (코드로 그림, 영웅은 은은하게 빛남) =====
const CXB = (() => {
  const LG = (id, a, b, v) => `<linearGradient id="${id}" x1="0" y1="0" x2="${v ? 0 : 1}" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
  const RG = (id, a, b) => `<radialGradient id="${id}" cx=".38" cy=".32" r=".85"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`;
  const AURA = c => `<circle cx="17" cy="17" r="15.5" fill="${c}" opacity=".16"><animate attributeName="opacity" values=".06;.3;.06" dur="2.4s" repeatCount="indefinite"/></circle>`;
  const STAR = (x, y, c, d = '1.7s') => `<path d="M${x} ${y - 2.6} L${x + .7} ${y - .7} L${x + 2.6} ${y} L${x + .7} ${y + .7} L${x} ${y + 2.6} L${x - .7} ${y + .7} L${x - 2.6} ${y} L${x - .7} ${y - .7} Z" fill="${c}"><animate attributeName="opacity" values="0;1;0" dur="${d}" repeatCount="indefinite"/></path>`;
  const OL = '#1a1410';
  // ---- 한손검 ----
  const BLADE = {
    straight: 'M27 4 L30 7 L14 23 L11 20 Z', long: 'M29 2 L31.5 4.5 L14 23 L11 20 Z', dwarf: 'M25 5 L30 10 L15.5 24 L10 18.5 Z',
    katana: 'M11 20 Q21 12 30 3 Q27.5 11.5 14 23 Z', damascus: 'M28 3 L31 6 L14 23 L11 20 Z', scimitar: 'M11 20 Q24 17 25.5 4 Q32.5 12 14 23 Z',
    thunder: 'M28 3 L31 6 L14 23 L11 20 Z', samurai: 'M30 2 L31.5 4 Q23 15 14 23 L11 20 Q20 10 30 2 Z', kurtz: 'M23 3 L31 11 L16 25.5 L8.5 18 Z',
    flame: 'M27 3 L31 7 L29 9 L30.5 11 L27.5 12 L27.5 14.5 L24.5 15 L24 18 L21 18 L20 21 L15 23.5 L11 20 L13.5 15.5 L16 15.5 L16.5 12.5 L19.5 12.5 L19.5 9.5 L22.5 9.5 L23 6.5 L26 6.5 Z' };
  function sword(o) { const d = `<defs>${LG('b', o.c1, o.c2)}${LG('gd', o.g1 || '#f6dc86', o.g2 || '#9a7424')}</defs>`; let fx = '';
    if (o.fx === 'spark') fx = `<path d="M27.5 5 L23 10.5 L25.5 11 L19.5 16.5 L22 17 L15 22.5" fill="none" stroke="#bff4ff" stroke-width="1.3" stroke-linejoin="round"/><path d="M27.5 5 L23 10.5 L25.5 11 L19.5 16.5 L22 17 L15 22.5" fill="none" stroke="#5ac8ff" stroke-width="3" opacity=".35"/>${STAR(29, 4, '#e8fbff')}`;
    if (o.fx === 'flame') fx = `<path d="M24 5 C26 1 30 2 29 6 C31 5 32 9 29 10 M18 11 C19 7 23 8 22 11 M14 17 C14 13 18 14 17 17" fill="none" stroke="#ff8a2a" stroke-width="1.6" stroke-linecap="round"/><path d="M26 6 C27 4 29 5 28.5 7" fill="none" stroke="#ffe08a" stroke-width="1"/>`;
    if (o.fx === 'rune') fx = `<g fill="#9fe8ff"><circle cx="24" cy="10" r=".9"/><circle cx="21" cy="13" r=".9"/><circle cx="18" cy="16" r=".9"/></g>`;
    if (o.fx === 'wave') fx = `<path d="M27 6 Q25 7 24.5 9 Q22.5 9.5 22 11.5 Q20 12 19.5 14 Q17.5 14.5 17 16.5" fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".8"/>`;
    if (o.fx === 'sand') fx = `<path d="M13 21.5 Q23 18 25 6" fill="none" stroke="#ffe7a8" stroke-width=".9" opacity=".8"/>`;
    if (o.fx === 'blood') fx = `<path d="M25 7 L16 16" stroke="#c81e1e" stroke-width="1.6" opacity=".85"/><path d="M17 16.5 Q16.5 19 17.5 19.5 Q18.5 19 17.8 16.5" fill="#c81e1e"/>`;
    const guard = { cross: 'M8 19 L15 26 L13 28 L6 21 Z', wide: 'M5.5 16.5 L17.5 28.5 L15.5 30.5 L3.5 18.5 Z', bar: 'M9 19.5 L14.5 25 L13.5 26 L8 20.5 Z',
      wing: 'M6 17 Q10 21 12 21 Q12 23 16 27.5 Q11 26 9 23 Q7 23 6 17 Z', skull: 'M7.5 18.5 L15.5 26.5 L13.5 28.5 L5.5 20.5 Z' }[o.gu || 'cross'];
    const tsuba = o.gu === 'disc' ? `<ellipse cx="12.5" cy="21.5" rx="4.6" ry="2.4" transform="rotate(-45 12.5 21.5)" fill="url(#gd)" stroke="${OL}" stroke-width=".7"/>` : `<path d="${guard}" fill="url(#gd)" stroke="${OL}" stroke-width=".7"/>`;
    return d + (o.hero ? AURA(o.aura || '#ffd86a') : '') + `<path d="${BLADE[o.b]}" fill="url(#b)" stroke="${o.ol || '#2a2e34'}" stroke-width=".8"/>${o.b !== 'flame' && o.b !== 'kurtz' ? `<path d="M28 5 L13.5 21" stroke="rgba(255,255,255,.4)" stroke-width=".7"/>` : `<path d="M27 6 L13.5 21" stroke="${o.fl || 'rgba(255,90,40,.6)'}" stroke-width="1.1"/>`}${fx}${tsuba}
      <path d="M9.5 25 L4.5 30" stroke="${o.h || '#4e2f14'}" stroke-width="3.2" stroke-linecap="round"/><path d="M8.6 25.8 L7.2 27.2 M7.2 27.2 L5.8 28.6" stroke="rgba(0,0,0,.4)" stroke-width="3.4" stroke-dasharray=".6 1.2"/><circle cx="4" cy="30.5" r="2.1" fill="${o.gem || '#c9a24a'}" stroke="${OL}" stroke-width=".6"/>`; }
  // ---- 활 ----
  function bow(o) { const L = { short: 'M12 5 Q24 17 12 29', long: 'M9.5 2.5 Q29 17 9.5 31.5', elf: 'M10 3 Q15 5 17.5 9 Q25 17 17.5 25 Q15 29 10 31', flame: 'M10 3 Q16 5 18 9 Q26 17 18 25 Q16 29 10 31',
      master: 'M9 2.5 Q14 4 17 8.5 Q27 17 17 25.5 Q14 30 9 31.5', wind: 'M8.5 2 Q12 6 16 7.5 Q28 17 16 26.5 Q12 28 8.5 32', chaos: 'M10 3 L15 6 L19 10 L22.5 17 L19 24 L15 28 L10 31' }[o.t];
    if (o.t === 'cross') return `<defs>${LG('w', o.c1, o.c2)}</defs><path d="M6 27 L22 11" stroke="${OL}" stroke-width="5" stroke-linecap="round"/><path d="M6 27 L22 11" stroke="url(#w)" stroke-width="3.4" stroke-linecap="round"/><path d="M14 7 Q24 9 28 19" fill="none" stroke="${OL}" stroke-width="4"/><path d="M14 7 Q24 9 28 19" fill="none" stroke="#8a8f98" stroke-width="2.4"/><path d="M14 7 L28 19" stroke="#e8e0c8" stroke-width=".8"/><path d="M12 22 L27 7" stroke="#d8d0b8" stroke-width="1.2"/><path d="M27 7 L29 5 L28.5 8.5 Z" fill="#c8ccd4"/><rect x="5" y="25" width="5" height="3" rx="1" transform="rotate(-45 7.5 26.5)" fill="#3a2614"/>`;
    const tip = o.t === 'long' ? [9.5, 2.5, 9.5, 31.5] : o.t === 'short' ? [12, 5, 12, 29] : o.t === 'wind' ? [8.5, 2, 8.5, 32] : [10, 3, 10, 31];
    let fx = ''; if (o.fx === 'leaf') fx = `<path d="M10 3 Q6 1 5 4 Q8 6 10 3 Z M10 31 Q6 33 5 30 Q8 28 10 31 Z" fill="#6ac04a" stroke="#2a5a1a" stroke-width=".5"/>`;
    if (o.fx === 'flame') fx = `<path d="M19 13 C21 9 25 11 23 14 C26 14 25 19 22 18 C24 21 20 23 19 20" fill="#ff8a2a" opacity=".9"/><path d="M20.5 14.5 C21.5 13 23 14 22 15.5" fill="#ffe08a"/>`;
    if (o.fx === 'wind') fx = `<path d="M20 9 Q26 11 25 15 M22 21 Q27 22 26 26 M14 7 Q19 6 21 3" fill="none" stroke="#9af0c0" stroke-width="1.1" stroke-linecap="round"/>${STAR(26, 15, '#e0fff0')}`;
    if (o.fx === 'chaos') fx = `<circle cx="22.5" cy="17" r="2.6" fill="#ff3030" stroke="#2a0606" stroke-width=".6"/><ellipse cx="22.5" cy="17" rx=".6" ry="2" fill="#120202"/><path d="M15 6 L13 3 M19 10 L21 7 M19 24 L21 27" stroke="#b040ff" stroke-width="1"/>`;
    if (o.fx === 'grip') fx = `<path d="M20.5 14 Q22 17 20.5 20" stroke="#c9a24a" stroke-width="2.4" fill="none"/>`;
    return `<defs>${LG('w', o.c1, o.c2)}</defs>` + (o.hero ? AURA(o.aura) : '') + `<path d="${L}" fill="none" stroke="${OL}" stroke-width="4.2" stroke-linejoin="round" stroke-linecap="round"/><path d="${L}" fill="none" stroke="url(#w)" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="M${tip[0]} ${tip[1]} L${tip[2]} ${tip[3]}" stroke="${o.str || '#efe6cc'}" stroke-width=".8"/><path d="M${tip[0]} 17 L29 17" stroke="#d8c8a0" stroke-width="1.1"/><path d="M29 17 L26.5 15.3 L26.5 18.7 Z" fill="#cfd5dd" stroke="#2a2e34" stroke-width=".4"/><path d="M${tip[0] + .5} 17 L${tip[0] + 3} 15.3 M${tip[0] + .5} 17 L${tip[0] + 3} 18.7" stroke="${o.fl || '#d84a3a'}" stroke-width="1.2"/>${fx}`; }
  // ---- 지팡이 ----
  function staff(o) { const d = `<defs>${LG('s', o.s1, o.s2)}${RG('g', o.g1, o.g2)}</defs>`; let head = '';
    if (o.h === 'knob') head = `<circle cx="24.5" cy="8" r="4" fill="url(#s)" stroke="${OL}" stroke-width=".7"/><path d="M22 6.5 Q24 5 26 6" stroke="#7a9a3a" stroke-width="1.4" fill="none"/><path d="M26 10 Q28 11 27 13 Q25 12 26 10 Z" fill="#6aa83a"/>`;
    if (o.h === 'crystal') head = `<path d="M24.5 1.5 L28 6 L26.5 12 L22.5 12 L21 6 Z" fill="url(#g)" stroke="#1e3a5a" stroke-width=".7"/><path d="M24.5 1.5 L24.5 12 M21 6 L28 6" stroke="rgba(255,255,255,.55)" stroke-width=".5"/>`;
    if (o.h === 'orb') head = `<path d="M20 11 Q19 5 24.5 4 Q30 5 29 11" fill="none" stroke="#c9a24a" stroke-width="1.4"/><circle cx="24.5" cy="8.5" r="4" fill="url(#g)"/><circle cx="23" cy="7" r="1.2" fill="#fff" opacity=".7"/>`;
    if (o.h === 'skull') head = `<path d="M20.5 8 C20.5 3 28.5 3 28.5 8 C28.5 10.5 27 11 27 12.5 L22 12.5 C22 11 20.5 10.5 20.5 8 Z" fill="#ece6d0" stroke="#4a4030" stroke-width=".7"/><circle cx="23" cy="8" r="1.3" fill="${o.g1}"/><circle cx="26" cy="8" r="1.3" fill="${o.g1}"/>`;
    if (o.h === 'ice') head = `<path d="M24.5 0.5 L26.5 7 L24.5 12 L22.5 7 Z M20 3.5 L24 8.5 L21.5 11 Z M29 3.5 L25 8.5 L27.5 11 Z" fill="url(#g)" stroke="#2a6a9a" stroke-width=".6"/>${STAR(29, 2, '#ffffff', '2.2s')}`;
    if (o.h === 'horn') head = `<path d="M22 11 C17 9 17 3 21 2 C20 5 21 7 23.5 8 M27 11 C32 9 32 3 28 2 C29 5 28 7 25.5 8" fill="none" stroke="#3a2a20" stroke-width="2"/><circle cx="24.5" cy="9" r="2.6" fill="url(#g)" stroke="#2a0606" stroke-width=".6"/>`;
    if (o.h === 'arch') head = `<path d="M24.5 0.5 L26 4 L30 4.5 L27 7 L28 11 L24.5 9 L21 11 L22 7 L19 4.5 L23 4 Z" fill="none" stroke="#f2d98a" stroke-width="1.2"/><circle cx="24.5" cy="6.5" r="2.6" fill="url(#g)"/>${STAR(28.5, 2.5, '#fff6c8')}`;
    if (o.h === 'eye') head = `<path d="M20 8 C22 3 27 3 29 8 C27 13 22 13 20 8 Z" fill="#1a0a24" stroke="#7a3ab8" stroke-width="1"/><circle cx="24.5" cy="8" r="2.4" fill="url(#g)"/><ellipse cx="24.5" cy="8" rx=".6" ry="1.8" fill="#0a0410"/><path d="M21 12 Q23 15 21 17 M28 12 Q26 15 28 17" stroke="#3a1a4a" stroke-width="1.4" fill="none"/>`;
    return d + (o.hero ? AURA(o.aura) : '') + `<path d="M7 31.5 L23 11.5" stroke="${OL}" stroke-width="3.8" stroke-linecap="round"/><path d="M7 31.5 L23 11.5" stroke="url(#s)" stroke-width="2.4" stroke-linecap="round"/>${o.wrap ? `<path d="M13 24 L15 25.5 M15 21.5 L17 23 M17 19 L19 20.5" stroke="${o.wrap}" stroke-width="1.4"/>` : ''}${head}`; }
  // ---- 단검 ----
  const DBL = { plain: 'M25 6 L28 9 L16.5 20.5 L13.5 17.5 Z', dwarf: 'M23.5 6 L29 11.5 L17.5 22 L12 16.5 Z', kris: 'M26.5 5 L28.5 7 L27 9.5 L27.5 11.5 L25 12.5 L25 14.5 L22.5 15.5 L22 18 L16.5 20.5 L13.5 17.5 L17 13.5 L19.5 13.5 L19.5 11.5 L22 10.5 L22 8.5 Z',
    wind: 'M14 18.5 Q23 16 28.5 4.5 Q25.5 14 16.5 21 Z', assassin: 'M14 18 Q20 9 28.5 6 Q27 9 24 11 Q22 16 16.5 21 Z', shadow: 'M24.5 5.5 L28.5 9.5 L17 21 L13 17 Z' };
  function dagger(o) { let fx = ''; if (o.fx === 'blood') fx = `<path d="M24 8.5 L16 16.5" stroke="#c81e1e" stroke-width="1.8"/><path d="M15.5 17 Q15 20 16 20.5 Q17 20 16.3 17" fill="#c81e1e"/>`;
    if (o.fx === 'wind') fx = `<path d="M24 14 Q28 15 30 13 M21 18 Q24 20 27 19" stroke="#bff0e0" stroke-width="1" fill="none" stroke-linecap="round"/>`;
    if (o.fx === 'shadow') fx = `<path d="M26 7 Q30 10 28 14 Q25 13 26 7 Z M22 11 Q25 16 21 18" fill="#5a2a8a" opacity=".55"/>${STAR(28, 5, '#d8b0ff')}`;
    if (o.fx === 'venom') fx = `<path d="M24.5 8 L17 15.5" stroke="#7aff6a" stroke-width="1" opacity=".8"/>${STAR(27, 6, '#e0ffd8')}`;
    if (o.fx === 'gleam') fx = `<path d="M24 8 L16.5 15.5" stroke="#fff6c8" stroke-width=".9"/>`;
    return `<defs>${LG('b', o.c1, o.c2)}</defs>` + (o.hero ? AURA(o.aura) : '') + `<path d="${DBL[o.b]}" fill="url(#b)" stroke="${o.ol || '#2a2e34'}" stroke-width=".8"/>${fx}<path d="M10.5 16.5 L17 23" stroke="${o.g || '#9a7424'}" stroke-width="2.4" stroke-linecap="round"/><path d="M13 21 L8.5 25.5" stroke="${o.h || '#3a2614'}" stroke-width="3" stroke-linecap="round"/><circle cx="8" cy="26" r="1.7" fill="${o.gem || '#9a7424'}" stroke="${OL}" stroke-width=".5"/>`; }
  // ---- 방패 ----
  const SHP = { heater: 'M17 4 L28 8 C28 18 24 25 17 30 C10 25 6 18 6 8 Z', round: 'M17 4.5 A12.5 12.5 0 1 0 17.01 4.5 Z', kite: 'M17 3 L27.5 8.5 L24.5 21 L17 31.5 L9.5 21 L6.5 8.5 Z',
    tower: 'M7 5 Q17 2 27 5 L27 25 Q17 32 7 25 Z', leaf: 'M17 2.5 C28 8 28.5 20 17 31.5 C5.5 20 6 8 17 2.5 Z', spiked: 'M17 3.5 L29 7.5 C29 18 24.5 25.5 17 30.5 C9.5 25.5 5 18 5 7.5 Z' };
  function shield(o) { const em = { boss: `<circle cx="17" cy="16" r="3.2" fill="url(#r)" stroke="${OL}" stroke-width=".6"/>`, cross: `<path d="M17 8 L17 25 M10.5 14 L23.5 14" stroke="${o.ec}" stroke-width="2.6"/>`,
      tree: `<path d="M17 25 L17 15" stroke="${o.ec}" stroke-width="1.8"/><circle cx="17" cy="12.5" r="4.5" fill="${o.ec}"/><circle cx="13.5" cy="15" r="2.5" fill="${o.ec}"/><circle cx="20.5" cy="15" r="2.5" fill="${o.ec}"/>`,
      lion: `<path d="M12 21 C11 14 14 10 17 10 C20 10 23 14 22 21 L19 19 L17 22 L15 19 Z" fill="${o.ec}" stroke="#3a1a08" stroke-width=".6"/><circle cx="15.5" cy="15" r=".9" fill="#2a1006"/><circle cx="18.5" cy="15" r=".9" fill="#2a1006"/>`,
      wing: `<path d="M17 11 Q11 9 8 13 Q12 13 13 16 Q15 14 17 17 Q19 14 21 16 Q22 13 26 13 Q23 9 17 11 Z" fill="${o.ec}"/>`,
      flame: `<path d="M17 25 C11 23 11 16 15 13 C15 16 17 17 17 14 C17 10 20 9 19 6 C24 10 25 18 22 22 C22 19 20 19 20 21 C20 23 19 25 17 25 Z" fill="${o.ec}"/><path d="M17 23 C15 21 15 19 17 17.5 C18 19.5 19.5 20.5 18.5 22.5" fill="#ffe08a"/>`,
      skull: `<path d="M12 15 C12 9 22 9 22 15 C22 18 20.5 18.5 20.5 21 L13.5 21 C13.5 18.5 12 18 12 15 Z" fill="${o.ec}"/><circle cx="15" cy="15" r="1.5" fill="#1a0404"/><circle cx="19" cy="15" r="1.5" fill="#1a0404"/>`,
      star: `<path d="M17 8.5 L19 13.5 L24.5 13.8 L20.2 17.2 L21.6 22.5 L17 19.6 L12.4 22.5 L13.8 17.2 L9.5 13.8 L15 13.5 Z" fill="${o.ec}" stroke="#5a3e14" stroke-width=".6"/>`,
      bands: `<path d="M7 11 Q17 8 27 11 M7.5 19 Q17 16 26.5 19" stroke="${o.ec}" stroke-width="1.6" fill="none"/><circle cx="17" cy="15" r="2.2" fill="url(#r)"/>` }[o.em];
    const spikes = o.s === 'spiked' ? `<path d="M5 7.5 L2 5 L6 6.5 M29 7.5 L32 5 L28 6.5 M17 30.5 L17 33" stroke="#2a2e34" stroke-width="1.4"/>` : '';
    return `<defs>${LG('f', o.c1, o.c2)}${LG('r', o.r1 || '#eef2f6', o.r2 || '#7d8794')}</defs>` + (o.hero ? AURA(o.aura) : '') + spikes + `<path d="${SHP[o.s]}" fill="url(#f)" stroke="${OL}" stroke-width="1"/><path d="${SHP[o.s]}" fill="none" stroke="url(#r)" stroke-width="1.8" transform="translate(17 17) scale(.9) translate(-17 -17)"/>${em}`; }
  // ---- 투구 ----
  function helm(o) { const d = `<defs>${LG('a', o.c1, o.c2)}</defs>`; let b = '';
    if (o.s === 'cap') b = `<path d="M8 20 C8 10 12 5 17 5 C22 5 26 10 26 20 L26 26 L21 26 L21 18 L13 18 L13 26 L8 26 Z" fill="url(#a)" stroke="${OL}"/><path d="M17 5 L17 18" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/>`;
    if (o.s === 'iron') b = `<path d="M7.5 21 C7.5 10 12 5 17 5 C22 5 26.5 10 26.5 21 L26.5 25 L7.5 25 Z" fill="url(#a)" stroke="${OL}"/><path d="M15.5 14 L18.5 14 L18.5 27 L15.5 27 Z" fill="url(#a)" stroke="${OL}" stroke-width=".7"/><path d="M7.5 18.5 L26.5 18.5" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/><g fill="#d8dce4"><circle cx="10" cy="21.5" r=".7"/><circle cx="24" cy="21.5" r=".7"/></g>`;
    if (o.s === 'great') b = `<path d="M7 28 L7 12 C7 7 11 4 17 4 C23 4 27 7 27 12 L27 28 Z" fill="url(#a)" stroke="${OL}"/><path d="M10 15 L24 15" stroke="#14161a" stroke-width="2"/><path d="M17 17 L17 27 M12 19 L12.5 24 M22 19 L21.5 24" stroke="#14161a" stroke-width="1"/>`;
    if (o.s === 'hood') b = `<path d="M6 29 C6 14 10 4 17 4 C24 4 28 14 28 29 L22 29 C22 20 20 15 17 15 C14 15 12 20 12 29 Z" fill="url(#a)" stroke="${OL}"/><path d="M17 6 L17 13" stroke="${o.ac}" stroke-width="1.2"/><circle cx="17" cy="9.5" r="1.6" fill="${o.ac}"/>`;
    if (o.s === 'crest') b = `<path d="M7.5 22 C7.5 11 12 6 17 6 C22 6 26.5 11 26.5 22 L26.5 27 L20 27 L20 20 L14 20 L14 27 L7.5 27 Z" fill="url(#a)" stroke="${OL}"/><path d="M17 6 C17 2 21 1 25 2 C22 3 20 5 19 7" fill="${o.ac}" stroke="#4a0c0c" stroke-width=".6"/><path d="M9 17 L25 17" stroke="#f2d98a" stroke-width="1.2"/>`;
    if (o.s === 'wizard') b = `<path d="M5 26 Q17 21 29 26 L26 28 Q17 25 8 28 Z" fill="url(#a)" stroke="${OL}"/><path d="M10 25 L19 3 Q20 2 21 4 L24 24 Z" fill="url(#a)" stroke="${OL}"/>${STAR(18.5, 14, o.ac, '2.6s')}<circle cx="19.5" cy="3.5" r="1.2" fill="${o.ac}"/>`;
    if (o.s === 'horned') b = `<path d="M8 23 C8 12 12 7 17 7 C22 7 26 12 26 23 L26 28 L8 28 Z" fill="url(#a)" stroke="${OL}"/><path d="M9 13 C4 11 3 5 6 2 C6 6 8 8 11 9 M25 13 C30 11 31 5 28 2 C28 6 26 8 23 9" fill="#d8ccb0" stroke="#3a2a1a" stroke-width=".7"/><path d="M11 18 L23 18" stroke="${o.ac}" stroke-width="2.2"/>`;
    if (o.s === 'skull') b = `<path d="M7 26 C7 11 11 5 17 5 C23 5 27 11 27 26 L22 29 L12 29 Z" fill="url(#a)" stroke="${OL}"/><path d="M10.5 15 L15.5 17 L15 20 L11 19 Z M23.5 15 L18.5 17 L19 20 L23 19 Z" fill="${o.ac}"/><path d="M14 24 L14 27 M17 24 L17 28 M20 24 L20 27" stroke="#0a0a0e" stroke-width="1.1"/><path d="M12 6 L9 1 M22 6 L25 1" stroke="#2a2a30" stroke-width="1.6"/>`;
    return d + (o.hero ? AURA(o.aura) : '') + b; }
  // ---- 갑옷 ----
  function armor(o) { const d = `<defs>${LG('a', o.c1, o.c2)}</defs>`, base = 'M10 6 L14 5 L17 8 L20 5 L24 6 L29 11 L26 15 L24 13 L24 29 L10 29 L10 13 L8 15 L5 11 Z'; let x = '';
    if (o.s === 'vest') x = `<path d="${base}" fill="url(#a)" stroke="${OL}"/><path d="M12 18 L22 18 M12 23 L22 23" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>`;
    if (o.s === 'robe') x = `<path d="M11 5 L14 4 L17 7 L20 4 L23 5 L28 12 L25 14 L25 30 Q17 32 9 30 L9 14 L6 12 Z" fill="url(#a)" stroke="${OL}"/><path d="M17 7 L17 31" stroke="${o.tr}" stroke-width="1.4"/><path d="M9 26 Q17 28 25 26" stroke="${o.tr}" stroke-width="1" fill="none"/>`;
    if (o.s === 'chain') x = `<path d="${base}" fill="url(#a)" stroke="${OL}"/><g fill="none" stroke="rgba(30,34,40,.55)" stroke-width=".6">${Array.from({ length: 6 }, (_, r) => `<path d="M11 ${14 + r * 2.5} Q12 ${15 + r * 2.5} 13 ${14 + r * 2.5} Q14 ${15 + r * 2.5} 15 ${14 + r * 2.5} Q16 ${15 + r * 2.5} 17 ${14 + r * 2.5} Q18 ${15 + r * 2.5} 19 ${14 + r * 2.5} Q20 ${15 + r * 2.5} 21 ${14 + r * 2.5} Q22 ${15 + r * 2.5} 23 ${14 + r * 2.5}"/>`).join('')}</g>`;
    if (o.s === 'plate') x = `<path d="${base}" fill="url(#a)" stroke="${OL}"/><path d="M5 11 L10 6 L13 9 L9 14 Z M29 11 L24 6 L21 9 L25 14 Z" fill="url(#a)" stroke="${OL}" stroke-width=".8"/><path d="M12 15 Q17 17 22 15 M12 20 Q17 22 22 20 M12 25 Q17 27 22 25" stroke="rgba(0,0,0,.35)" stroke-width="1" fill="none"/><path d="M17 9 L17 28" stroke="rgba(255,255,255,.35)" stroke-width=".8"/>`;
    if (o.s === 'scale') x = `<path d="${base}" fill="url(#a)" stroke="${OL}"/><g fill="none" stroke="rgba(20,40,20,.6)" stroke-width=".7">${Array.from({ length: 5 }, (_, r) => Array.from({ length: 4 }, (_, c) => `<path d="M${11 + c * 3 + (r % 2) * 1.5} ${14 + r * 3} q1.5 2 3 0"/>`).join('')).join('')}</g>`;
    if (o.s === 'sage') x = `<path d="M11 5 L14 4 L17 7 L20 4 L23 5 L28 12 L25 14 L25 30 Q17 32 9 30 L9 14 L6 12 Z" fill="url(#a)" stroke="${OL}"/><path d="M14 4 L17 12 L20 4" fill="none" stroke="${o.tr}" stroke-width="1.4"/><path d="M17 12 L17 31" stroke="${o.tr}" stroke-width="1.6"/>${STAR(13, 21, '#fff6c8', '2.4s')}${STAR(21, 25, '#fff6c8', '3s')}`;
    if (o.s === 'heavy') x = `<path d="${base}" fill="url(#a)" stroke="${OL}"/><path d="M4 10 L10 5 L14 9 L9 15 Z M30 10 L24 5 L20 9 L25 15 Z" fill="url(#a)" stroke="${OL}"/><path d="M5 9 L2 6 M29 9 L32 6" stroke="#2a2a30" stroke-width="1.4"/><path d="M13 13 L21 13 L20 22 L17 25 L14 22 Z" fill="${o.tr}" opacity=".85"/><path d="M12 26 L22 26" stroke="${o.tr}" stroke-width="1.2"/>`;
    return d + (o.hero ? AURA(o.aura) : '') + x; }
  // ---- 장갑 ----
  function gloves(o) { const d = `<defs>${LG('a', o.c1, o.c2)}</defs>`, base = 'M9 29 L9 14 L11 6 L13 6 L13 13 L15 4 L17 4 L17 13 L19 5 L21 5 L21 14 L23 9 L25 10 L23 20 L23 29 Z'; let x = `<path d="${base}" fill="url(#a)" stroke="${OL}"/>`;
    if (o.s === 'cloth') x += `<path d="M9 25 L23 25" stroke="${o.ac}" stroke-width="1.6"/>`;
    if (o.s === 'plate') x += `<path d="M9 18 L23 18 M9 22 L23 22 M11 10 L13 10 M15 9 L17 9 M19 10 L21 10" stroke="rgba(0,0,0,.4)" stroke-width="1"/><path d="M8 25 L24 25 L24 30 L8 30 Z" fill="url(#a)" stroke="${OL}" stroke-width=".8"/>`;
    if (o.s === 'steel') x += `<path d="M9 19 L23 19" stroke="rgba(0,0,0,.4)" stroke-width="1.4"/><g fill="#eef2f6"><circle cx="11.5" cy="16" r=".8"/><circle cx="15" cy="15.5" r=".8"/><circle cx="18.5" cy="15.5" r=".8"/><circle cx="21.5" cy="16" r=".8"/></g>`;
    if (o.s === 'power') x += `<path d="M10.5 13 L22 13 L22 16 L10.5 16 Z" fill="${o.ac}" stroke="#3a0606" stroke-width=".6"/><g fill="#ffd0a0"><circle cx="12" cy="14.5" r=".9"/><circle cx="15.5" cy="14.5" r=".9"/><circle cx="19" cy="14.5" r=".9"/></g>`;
    if (o.s === 'mage') x += `<circle cx="16" cy="21" r="3" fill="none" stroke="${o.ac}" stroke-width="1.1"/><path d="M16 18.5 L16 23.5 M13.5 21 L18.5 21" stroke="${o.ac}" stroke-width=".8"/>`;
    if (o.s === 'ogre') x = `<path d="M7 30 L7 14 L9 5 L12 5 L12 12 L14 3 L17 3 L17 12 L19.5 4 L22.5 4.5 L21.5 14 L24 8 L27 9.5 L24.5 20 L24.5 30 Z" fill="url(#a)" stroke="${OL}"/><path d="M9 5 L10.5 2 L12 5 M14 3 L15.5 0.5 L17 3 M19.5 4 L21.5 1.5 L22.5 4.5" fill="#e8e0c8" stroke="#3a3020" stroke-width=".5"/><path d="M8 24 L24 24" stroke="${o.ac}" stroke-width="1.6"/>`;
    if (o.s === 'dk') x += `<path d="M11 6 L12 2.5 L13 6 M15 4 L16 0.5 L17 4 M19 5 L20 1.5 L21 5" fill="#3a3a44" stroke="#0a0a0e" stroke-width=".5"/><path d="M9 22 L23 22" stroke="${o.ac}" stroke-width="1.6"/><path d="M14 15 L18 15 L16 19 Z" fill="${o.ac}"/>`;
    return d + (o.hero ? AURA(o.aura) : '') + x; }
  // ---- 장화 ----
  function boots(o) { const d = `<defs>${LG('a', o.c1, o.c2)}</defs>`, base = 'M10 5 L18 5 L18 21 L28 24 L28 29 L8 29 L8 22 Z'; let x = '';
    if (o.s === 'boot') x = `<path d="${base}" fill="url(#a)" stroke="${OL}"/><path d="M10 8 L18 8" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>`;
    if (o.s === 'shoe') x = `<path d="M9 17 L17 17 L18 21 L28 24 L28 29 L8 29 L8 21 Z" fill="url(#a)" stroke="${OL}"/><path d="M11 19 L16 21" stroke="${o.ac}" stroke-width="1"/>`;
    if (o.s === 'plate') x = `<path d="${base}" fill="url(#a)" stroke="${OL}"/><path d="M9 11 L19 11 M9 16 L19 16" stroke="rgba(0,0,0,.4)" stroke-width="1"/><path d="M8 22 L13 19 L18 21" fill="none" stroke="rgba(255,255,255,.4)" stroke-width=".8"/><path d="M8 25 L28 25" stroke="rgba(0,0,0,.35)" stroke-width="1"/>`;
    if (o.s === 'elf') x = `<path d="M10 5 L18 5 L18 21 Q26 21 30 26 L28 29 L8 29 L8 22 Z" fill="url(#a)" stroke="${OL}"/><path d="M10 5 Q14 9 18 5" fill="none" stroke="${o.ac}" stroke-width="1.2"/><path d="M11 13 Q14 11 16 14" stroke="${o.ac}" stroke-width="1" fill="none"/>`;
    if (o.s === 'wing') x = `<path d="${base}" fill="url(#a)" stroke="${OL}"/><path d="M10 10 C4 8 2 3 3 1 C5 5 8 6 10 7 M10 14 C5 13 3 10 3 8 C5 10 8 11 10 11" fill="#f2f6ff" stroke="#6a7a9a" stroke-width=".6"/>`;
    if (o.s === 'mana') x = `<path d="${base}" fill="url(#a)" stroke="${OL}"/><circle cx="14" cy="14" r="2.4" fill="${o.ac}"/><path d="M8 26 L28 26" stroke="${o.ac}" stroke-width="1.2"/>`;
    if (o.s === 'heavy') x = `<path d="M9.5 4 L18.5 4 L18.5 21 L28.5 24 L28.5 30 L7.5 30 L7.5 22 Z" fill="url(#a)" stroke="${OL}"/><path d="M8 12 L20 12 M8 17 L20 17" stroke="${o.ac}" stroke-width="1.4"/><path d="M18.5 6 L22 4 M18.5 10 L22 9" stroke="#2a2a30" stroke-width="1.3"/>`;
    return d + (o.hero ? AURA(o.aura) : '') + x; }
  // ---- 망토 ----
  function cloak(o) { const d = `<defs>${LG('a', o.c1, o.c2)}</defs>`; let x = '';
    const cape = 'M12 5 L22 5 L28 29 L6 29 Z';
    if (o.s === 'cape') x = `<path d="${cape}" fill="url(#a)" stroke="${OL}"/><path d="M12 5 L22 5 L20 9 L14 9 Z" fill="${o.cl}"/>`;
    if (o.s === 'tattered') x = `<path d="M12 5 L22 5 L28 26 L25 29 L22 26 L19 30 L16 26 L12 30 L9 26 L6 28 Z" fill="url(#a)" stroke="${OL}"/><circle cx="17" cy="7" r="2" fill="${o.cl}"/>`;
    if (o.s === 'elf') x = `<path d="${cape}" fill="url(#a)" stroke="${OL}"/><path d="M6 29 Q9 25 12 29 Q15 25 17 29 Q20 25 23 29 Q26 25 28 29" fill="none" stroke="${o.cl}" stroke-width="1.2"/><path d="M15 6 Q17 2 19 6 Q17 9 15 6 Z" fill="${o.cl}"/>`;
    if (o.s === 'rune') x = `<path d="${cape}" fill="url(#a)" stroke="${OL}"/><circle cx="17" cy="19" r="4.5" fill="none" stroke="${o.cl}" stroke-width="1.1"/><path d="M17 15 L17 23 M13.5 19 L20.5 19" stroke="${o.cl}" stroke-width=".9"/><path d="M12 5 L22 5 L20 8 L14 8 Z" fill="${o.cl}"/>`;
    if (o.s === 'guard') x = `<path d="${cape}" fill="url(#a)" stroke="${OL}"/><path d="M14 13 L20 13 L19.5 19 L17 21.5 L14.5 19 Z" fill="${o.cl}"/><path d="M12 5 L22 5 L20 9 L14 9 Z" fill="#f2d98a"/>`;
    if (o.s === 'invis') x = `<path d="${cape}" fill="url(#a)" stroke="#a8c8e8" stroke-width=".9" opacity=".75"><animate attributeName="opacity" values=".45;.85;.45" dur="2.6s" repeatCount="indefinite"/></path><path d="M10 12 Q17 9 24 12 M9 19 Q17 16 25 19 M8 25 Q17 22 26 25" fill="none" stroke="#e8f6ff" stroke-width=".8" opacity=".7"/>${STAR(22, 10, '#ffffff')}${STAR(11, 22, '#e0f0ff', '2.3s')}`;
    if (o.s === 'royal') x = `<path d="M11 5 L23 5 L29 30 L5 30 Z" fill="url(#a)" stroke="${OL}"/><path d="M5 30 L29 30 L28.4 27.5 L5.6 27.5 Z" fill="${o.cl}"/><path d="M11 5 L23 5 L21 9 L13 9 Z" fill="${o.cl}"/><circle cx="17" cy="7" r="1.6" fill="#ff3030"/>`;
    return d + (o.hero ? AURA(o.aura) : '') + x; }
  // ---- 벨트 ----
  function belt(o) { const d = `<defs>${LG('a', o.c1, o.c2, 1)}${LG('k', o.k1, o.k2)}</defs>`; let bk = '';
    if (o.b === 'square') bk = `<rect x="13" y="11" width="8" height="12" rx="1" fill="none" stroke="url(#k)" stroke-width="2.4"/>`;
    if (o.b === 'sash') bk = `<path d="M15 12 L19 12 L22 26 L18 24 L17 27 L15 23 L12 26 Z" fill="url(#k)" stroke="${OL}" stroke-width=".6"/>`;
    if (o.b === 'round') bk = `<circle cx="17" cy="17" r="5" fill="url(#k)" stroke="${OL}" stroke-width=".7"/><circle cx="17" cy="17" r="2" fill="${o.gem || '#2a2e34'}"/>`;
    if (o.b === 'tusk') bk = `<rect x="12.5" y="12" width="9" height="10" rx="1.5" fill="url(#k)" stroke="${OL}" stroke-width=".6"/><path d="M13 22 C11 26 12 29 14 30 C14 27 14.5 25 15.5 22 M21 22 C23 26 22 29 20 30 C20 27 19.5 25 18.5 22" fill="#f2ead2" stroke="#4a4030" stroke-width=".5"/>`;
    if (o.b === 'gem') bk = `<path d="M17 10.5 L23 17 L17 23.5 L11 17 Z" fill="url(#k)" stroke="${OL}" stroke-width=".6"/><circle cx="17" cy="17" r="2.4" fill="${o.gem}"/>`;
    if (o.b === 'wide') bk = `<rect x="11" y="9.5" width="12" height="15" rx="2" fill="url(#k)" stroke="${OL}" stroke-width=".7"/><path d="M14 13 L20 13 L20 21 L14 21 Z" fill="none" stroke="#5a3e14" stroke-width="1"/><circle cx="17" cy="17" r="1.6" fill="${o.gem}"/>`;
    if (o.b === 'crown') bk = `<rect x="11.5" y="11" width="11" height="12" rx="1.5" fill="url(#k)" stroke="${OL}" stroke-width=".6"/><path d="M13 19 L13 14.5 L15 16.5 L17 13.5 L19 16.5 L21 14.5 L21 19 Z" fill="#fff0b0" stroke="#7a5a10" stroke-width=".5"/><circle cx="17" cy="21" r="1" fill="${o.gem}"/>`;
    return d + (o.hero ? AURA(o.aura) : '') + `<rect x="2" y="${o.wd ? 11.5 : 13}" width="30" height="${o.wd ? 11 : 8}" rx="2" fill="url(#a)" stroke="${OL}"/>${o.studs ? `<g fill="${o.studs}"><circle cx="6" cy="17" r=".9"/><circle cx="9.5" cy="17" r=".9"/><circle cx="24.5" cy="17" r=".9"/><circle cx="28" cy="17" r=".9"/></g>` : ''}${bk}`; }
  // ---- 반지 ----
  function ring(o) { const d = `<defs>${LG('a', o.c1, o.c2)}${RG('g', o.g1, o.g2)}</defs>`; let gem = '';
    if (o.gm === 'round') gem = `<circle cx="17" cy="9.5" r="4.2" fill="url(#g)" stroke="${OL}" stroke-width=".6"/><circle cx="15.8" cy="8.2" r="1.1" fill="#fff" opacity=".75"/>`;
    if (o.gm === 'square') gem = `<rect x="13" y="5.5" width="8" height="8" rx="1" fill="url(#g)" stroke="${OL}" stroke-width=".6" transform="rotate(45 17 9.5)"/>`;
    if (o.gm === 'shield') gem = `<path d="M17 4.5 L21.5 6.5 C21.5 10.5 19.5 13 17 14.5 C14.5 13 12.5 10.5 12.5 6.5 Z" fill="url(#g)" stroke="${OL}" stroke-width=".6"/>`;
    if (o.gm === 'heart') gem = `<path d="M17 14 L12.8 9.6 C11 7.5 13 4.6 15.4 5.6 L17 7 L18.6 5.6 C21 4.6 23 7.5 21.2 9.6 Z" fill="url(#g)" stroke="${OL}" stroke-width=".6"/>`;
    if (o.gm === 'drop') gem = `<path d="M17 3.5 C19.5 7 21.5 9 21.5 11 C21.5 13.5 19.5 15 17 15 C14.5 15 12.5 13.5 12.5 11 C12.5 9 14.5 7 17 3.5 Z" fill="url(#g)" stroke="${OL}" stroke-width=".6"/>`;
    if (o.gm === 'eye') gem = `<path d="M10.5 9.5 C13 5 21 5 23.5 9.5 C21 14 13 14 10.5 9.5 Z" fill="url(#g)" stroke="#5a3e14" stroke-width=".8"/><ellipse cx="17" cy="9.5" rx="1" ry="3.4" fill="#120804"/><path d="M9 9.5 L7 7 M25 9.5 L27 7" stroke="#c9a24a" stroke-width="1.2"/>`;
    if (o.gm === 'crown') gem = `<path d="M11 13 L11 6 L14 9 L17 4.5 L20 9 L23 6 L23 13 Z" fill="url(#a)" stroke="${OL}" stroke-width=".6"/><circle cx="17" cy="10.5" r="2" fill="url(#g)"/><circle cx="12.5" cy="11.5" r=".9" fill="#ff5050"/><circle cx="21.5" cy="11.5" r=".9" fill="#50a0ff"/>`;
    if (o.gm === 'claw') gem = `<circle cx="17" cy="9.5" r="3.6" fill="url(#g)" stroke="${OL}" stroke-width=".6"/><path d="M12.5 12 L11.5 7.5 L13.5 9.5 M21.5 12 L22.5 7.5 L20.5 9.5" fill="none" stroke="url(#a)" stroke-width="1.3"/>`;
    return d + (o.hero ? AURA(o.aura) : '') + `<ellipse cx="17" cy="21" rx="9" ry="8" fill="none" stroke="${OL}" stroke-width="4.6"/><ellipse cx="17" cy="21" rx="9" ry="8" fill="none" stroke="url(#a)" stroke-width="3"/>${o.eng ? `<ellipse cx="17" cy="21" rx="9" ry="8" fill="none" stroke="${o.eng}" stroke-width=".6" stroke-dasharray="1.5 1.5"/>` : ''}${gem}`; }
  // ---- 목걸이 ----
  function amulet(o) { const d = `<defs>${LG('a', o.c1, o.c2)}${RG('g', o.g1, o.g2)}</defs>`; let p = '';
    if (o.p === 'shield') p = `<path d="M17 15 L23 17.5 C23 23 20.5 27 17 29.5 C13.5 27 11 23 11 17.5 Z" fill="url(#a)" stroke="${OL}"/><circle cx="17" cy="21.5" r="2.4" fill="url(#g)"/>`;
    if (o.p === 'wood') p = `<rect x="12.5" y="15" width="9" height="13" rx="2" fill="url(#a)" stroke="#3a2210"/><path d="M15 18 L19 18 M15 21 L19 21 M15 24 L18 24" stroke="#2a1608" stroke-width="1"/>`;
    if (o.p === 'heart') p = `<path d="M17 29 L10.5 22.5 C8 19.5 11 15 14.5 16.5 L17 18.5 L19.5 16.5 C23 15 26 19.5 23.5 22.5 Z" fill="url(#g)" stroke="${OL}" stroke-width=".7"/>`;
    if (o.p === 'drop') p = `<path d="M17 15 C20 19 22.5 21.5 22.5 24 C22.5 27 20 29 17 29 C14 29 11.5 27 11.5 24 C11.5 21.5 14 19 17 15 Z" fill="url(#g)" stroke="${OL}" stroke-width=".7"/><circle cx="15.5" cy="23" r="1.2" fill="#fff" opacity=".7"/>`;
    if (o.p === 'book') p = `<rect x="12" y="16" width="10" height="12" rx="1" fill="url(#a)" stroke="${OL}"/><path d="M17 16 L17 28" stroke="#f2d98a" stroke-width=".8"/><circle cx="17" cy="21.5" r="1.8" fill="url(#g)"/>`;
    if (o.p === 'feather') p = `<path d="M21 14 C15 17 12 23 13 30 C16 26 20 22 21 14 Z" fill="url(#g)" stroke="#2a5a3a" stroke-width=".6"/><path d="M13 30 L20 16" stroke="#2a5a3a" stroke-width=".7"/>`;
    if (o.p === 'dragon') p = `<path d="M11 18 L17 15 L23 18 L22 25 L17 30 L12 25 Z" fill="url(#a)" stroke="${OL}"/><path d="M11 18 L8 15 M23 18 L26 15" stroke="url(#a)" stroke-width="1.6"/><path d="M13 22.5 C15 19.5 19 19.5 21 22.5 C19 25.5 15 25.5 13 22.5 Z" fill="url(#g)"/><ellipse cx="17" cy="22.5" rx=".6" ry="2" fill="#140804"/>`;
    if (o.p === 'holy') p = `<circle cx="17" cy="22" r="6.5" fill="none" stroke="url(#a)" stroke-width="1.6"/><path d="M17 15.5 L17 28.5 M11 21 L23 21" stroke="url(#a)" stroke-width="2.4"/><circle cx="17" cy="21" r="1.8" fill="url(#g)"/>${STAR(23, 16, '#fffbe0')}`;
    return d + (o.hero ? AURA(o.aura) : '') + `<path d="M8 5 C8 13 12 16 17 16 C22 16 26 13 26 5" fill="none" stroke="${o.ch || '#c9a24a'}" stroke-width="1.4" stroke-dasharray="${o.cord ? '0' : '1.6 .8'}"/>${p}`; }
  // ---- 티셔츠 ----
  function shirt(o) { const d = `<defs>${LG('a', o.c1, o.c2)}</defs>`, tee = 'M11 6 L14 5 C15 7 19 7 20 5 L23 6 L29 11 L26 15 L24 13 L24 29 L10 29 L10 13 L8 15 L5 11 Z', lng = 'M11 6 L14 5 C15 7 19 7 20 5 L23 6 L30 19 L27 21 L24 14 L24 29 L10 29 L10 14 L7 21 L4 19 Z'; let x = '';
    if (o.s === 'tee') x = `<path d="${tee}" fill="url(#a)" stroke="${o.ol || '#6a6250'}"/>`;
    if (o.s === 'long') x = `<path d="${lng}" fill="url(#a)" stroke="${o.ol || '#6a6250'}"/><path d="M12 9 L22 9" stroke="${o.ac}" stroke-width="1"/>`;
    if (o.s === 'elf') x = `<path d="${tee}" fill="url(#a)" stroke="#2a4a2a"/><path d="M17 12 Q14 17 17 22 Q20 17 17 12 Z" fill="${o.ac}"/><path d="M10 27 L24 27" stroke="${o.ac}" stroke-width="1"/>`;
    if (o.s === 'mail') x = `<path d="${lng}" fill="url(#a)" stroke="${OL}"/><g fill="none" stroke="rgba(30,34,40,.55)" stroke-width=".55">${Array.from({ length: 6 }, (_, r) => `<path d="M11 ${11 + r * 3} Q12 ${12 + r * 3} 13 ${11 + r * 3} Q14 ${12 + r * 3} 15 ${11 + r * 3} Q16 ${12 + r * 3} 17 ${11 + r * 3} Q18 ${12 + r * 3} 19 ${11 + r * 3} Q20 ${12 + r * 3} 21 ${11 + r * 3} Q22 ${12 + r * 3} 23 ${11 + r * 3}"/>`).join('')}</g>`;
    if (o.s === 'guard') x = `<path d="${tee}" fill="url(#a)" stroke="${OL}"/><path d="M14 12 L20 12 L19.5 19 L17 21.5 L14.5 19 Z" fill="${o.ac}" stroke="#2a2010" stroke-width=".5"/>`;
    if (o.s === 'magic') x = `<path d="${tee}" fill="url(#a)" stroke="${OL}"/>${STAR(14, 15, o.ac, '2.2s')}${STAR(20, 21, o.ac, '2.8s')}<circle cx="17" cy="25" r="1.2" fill="${o.ac}"/>`;
    if (o.s === 'dark') x = `<path d="${tee}" fill="url(#a)" stroke="${OL}"/><path d="M11 6 L14 5 C15 7 19 7 20 5 L23 6 L21 10 L13 10 Z" fill="${o.ac}"/><path d="M17 12 L19 16 L17 22 L15 16 Z" fill="${o.ac}"/>`;
    if (o.s === 'holy') x = `<path d="${tee}" fill="url(#a)" stroke="#8a6a20"/><path d="M17 11 L17 25 M13 15.5 L21 15.5" stroke="${o.ac}" stroke-width="2.2"/>${STAR(22.5, 11, '#fffbe0')}`;
    return d + (o.hero ? AURA(o.aura) : '') + x; }
  const B = { sword, bow, staff, dagger, shield, helm, armor, gloves, boots, cloak, belt, ring, amulet, shirt };
  return (type, o) => B[type](o);
})();
// 아이템 이름 → 아이콘 설계 (모양·색·효과). 영웅(hero:1)은 은은하게 빛남
const CX_SPEC = {
  // 한손검
  '장검': ['sword', { b: 'long', c1: '#f4f8fc', c2: '#8a94a2', gu: 'cross', h: '#3a2614', gem: '#7a8a9a' }],
  '난쟁이족 검': ['sword', { b: 'dwarf', c1: '#d8c8a8', c2: '#6a5a40', gu: 'wide', g1: '#b8a080', g2: '#5a4428', h: '#5a3a1a', gem: '#c86a2a' }],
  '일본도': ['sword', { b: 'katana', c1: '#ffffff', c2: '#a8b4c4', gu: 'disc', g1: '#3a3a42', g2: '#121216', h: '#2a2a6a', gem: '#1a1a1a', fx: 'wave' }],
  '다마스커스 검': ['sword', { b: 'damascus', c1: '#c8ccd8', c2: '#5a6070', gu: 'bar', h: '#4a2a1a', gem: '#5ad0c0', fx: 'wave' }],
  '사막의 곡도': ['sword', { b: 'scimitar', c1: '#fff0c8', c2: '#b89048', gu: 'wing', g1: '#e8c070', g2: '#8a5a20', h: '#8a2a1a', gem: '#2ab0a0', fx: 'sand' }],
  '뇌신검': ['sword', { b: 'thunder', c1: '#e8faff', c2: '#3a8ad8', gu: 'wing', g1: '#c8e8ff', g2: '#3a5a9a', h: '#1a2a4a', gem: '#7af0ff', fx: 'spark', ol: '#1a3a6a' }],
  '싸울아비 장검': ['sword', { b: 'samurai', c1: '#fffaf0', c2: '#9aa0aa', gu: 'disc', g1: '#c8a050', g2: '#5a3a10', h: '#7a1a1a', gem: '#c81e1e', fx: 'blood' }],
  '커츠의 검': ['sword', { b: 'kurtz', c1: '#3a3a44', c2: '#0e0e12', gu: 'wide', g1: '#8a1a1a', g2: '#3a0606', h: '#1a0a0a', gem: '#ff2020', ol: '#000', fl: 'rgba(255,40,40,.75)', hero: 1, aura: '#ff3030' }],
  '데스나이트의 불검': ['sword', { b: 'flame', c1: '#5a2a1a', c2: '#160606', gu: 'skull', g1: '#3a3a44', g2: '#0e0e12', h: '#2a0a0a', gem: '#ff8a2a', fx: 'flame', ol: '#000', hero: 1, aura: '#ff7a2a' }],
  // 활
  '단궁': ['bow', { t: 'short', c1: '#c08850', c2: '#6a4220' }],
  '장궁': ['bow', { t: 'long', c1: '#a07040', c2: '#4a2a10', fl: '#e8e0c8' }],
  '요정족 활': ['bow', { t: 'elf', c1: '#c8e8a0', c2: '#5a8a3a', str: '#e8ffe0', fl: '#5ac85a', fx: 'leaf' }],
  '석궁': ['bow', { t: 'cross', c1: '#8a6040', c2: '#3a2414' }],
  '화염의 활': ['bow', { t: 'flame', c1: '#ff9a50', c2: '#7a1a08', str: '#ffe8c0', fl: '#ff6a2a', fx: 'flame' }],
  '장인의 활': ['bow', { t: 'master', c1: '#e8c890', c2: '#7a5020', fl: '#3a6ad8', fx: 'grip' }],
  '사이하의 활': ['bow', { t: 'wind', c1: '#a8f8d0', c2: '#1a7a5a', str: '#e8fff4', fl: '#e8fff0', fx: 'wind', hero: 1, aura: '#5af0b0' }],
  '혼돈의 활': ['bow', { t: 'chaos', c1: '#5a3a7a', c2: '#14081e', str: '#ff6060', fl: '#b040ff', fx: 'chaos', hero: 1, aura: '#a040ff' }],
  // 지팡이
  '참나무 지팡이': ['staff', { h: 'knob', s1: '#a87848', s2: '#5a3a1a', g1: '#8ac85a', g2: '#3a6a1a' }],
  '수정 지팡이': ['staff', { h: 'crystal', s1: '#c8c8d0', s2: '#5a5a68', g1: '#e8f8ff', g2: '#5aa8e8' }],
  '마나의 지팡이': ['staff', { h: 'orb', s1: '#6a8ac8', s2: '#1a2a5a', g1: '#a8e0ff', g2: '#1a5ad8', wrap: '#c9a24a' }],
  '해골 지팡이': ['staff', { h: 'skull', s1: '#8a8070', s2: '#3a3428', g1: '#7aff6a', g2: '#1a6a1a', wrap: '#5a2a2a' }],
  '얼음 여왕의 지팡이': ['staff', { h: 'ice', s1: '#e8f8ff', s2: '#5a9ac8', g1: '#ffffff', g2: '#6ac8ff' }],
  '바포메트의 지팡이': ['staff', { h: 'horn', s1: '#5a2a2a', s2: '#1a0606', g1: '#ff6040', g2: '#7a0a0a', wrap: '#c9a24a' }],
  '아크메이지의 지팡이': ['staff', { h: 'arch', s1: '#f6e8c0', s2: '#8a6a30', g1: '#ffffff', g2: '#a060ff', wrap: '#5a3aa8', hero: 1, aura: '#c88aff' }],
  '흑장로의 지팡이': ['staff', { h: 'eye', s1: '#3a2a4a', s2: '#0a0610', g1: '#d070ff', g2: '#4a0a7a', wrap: '#7a3ab8', hero: 1, aura: '#9a40ff' }],
  // 단검
  '단검': ['dagger', { b: 'plain', c1: '#eef2f6', c2: '#7d8794' }],
  '난쟁이족 단검': ['dagger', { b: 'dwarf', c1: '#d8c8a8', c2: '#6a5a40', g: '#5a4428', gem: '#c86a2a' }],
  '오리하루콘 단검': ['dagger', { b: 'plain', c1: '#fff4c0', c2: '#c89a30', g: '#5a8a8a', gem: '#5ad0c0', fx: 'gleam' }],
  '크리스': ['dagger', { b: 'kris', c1: '#d8dce8', c2: '#5a6070', g: '#7a4a1a', h: '#5a2a10', gem: '#3a8a3a' }],
  '혈풍의 단검': ['dagger', { b: 'plain', c1: '#f0d8d8', c2: '#7a2a2a', g: '#3a0a0a', gem: '#ff2020', fx: 'blood' }],
  '바람칼날의 단검': ['dagger', { b: 'wind', c1: '#e8fff8', c2: '#5ab09a', g: '#2a6a5a', gem: '#9af0d0', fx: 'wind' }],
  '암살자의 단검': ['dagger', { b: 'assassin', c1: '#4a4a52', c2: '#0e0e12', g: '#2a2a30', h: '#0a0a0a', gem: '#7aff6a', fx: 'venom', ol: '#000', hero: 1, aura: '#6aff6a' }],
  '그림자 단검': ['dagger', { b: 'shadow', c1: '#6a5a8a', c2: '#14101e', g: '#2a1a3a', h: '#0a0610', gem: '#b070ff', fx: 'shadow', ol: '#0a0410', hero: 1, aura: '#8a5aff' }],
  // 방패
  '나무 방패': ['shield', { s: 'heater', c1: '#a8723e', c2: '#4e2f14', em: 'boss' }],
  '둥근 철방패': ['shield', { s: 'round', c1: '#9aa2ac', c2: '#3a4048', em: 'bands', ec: '#5a606a' }],
  '요정족 방패': ['shield', { s: 'leaf', c1: '#a8d880', c2: '#3a6a2a', r1: '#f6dc86', r2: '#9a7424', em: 'tree', ec: '#f2f6d8' }],
  '강철 연방패': ['shield', { s: 'kite', c1: '#d8dce4', c2: '#5a606a', em: 'cross', ec: '#3a4a7a' }],
  '붉은 기사의 방패': ['shield', { s: 'heater', c1: '#d84a3a', c2: '#5a0a08', r1: '#f6dc86', r2: '#9a7424', em: 'lion', ec: '#f2d98a' }],
  '수호의 방패': ['shield', { s: 'tower', c1: '#5a8ad8', c2: '#1a2a6a', r1: '#f6dc86', r2: '#9a7424', em: 'wing', ec: '#f4f6ff' }],
  '반역자의 방패': ['shield', { s: 'spiked', c1: '#3a3a44', c2: '#0e0e12', r1: '#a8343a', r2: '#3a0606', em: 'star', ec: '#c8303a', hero: 1, aura: '#ff3a3a' }],
  '데스나이트의 방패': ['shield', { s: 'kite', c1: '#4a2a1e', c2: '#120606', r1: '#5a5a64', r2: '#141418', em: 'flame', ec: '#ff7a2a', hero: 1, aura: '#ff7a2a' }],
  // 투구
  '가죽 투구': ['helm', { s: 'cap', c1: '#a07850', c2: '#4a3420' }],
  '철 투구': ['helm', { s: 'iron', c1: '#c8ccd4', c2: '#5a606a' }],
  '판금 투구': ['helm', { s: 'great', c1: '#eef2f6', c2: '#7d8794' }],
  '마법 방어 투구': ['helm', { s: 'hood', c1: '#6a5aa8', c2: '#1e1640', ac: '#9fe8ff' }],
  '지휘관의 투구': ['helm', { s: 'crest', c1: '#d8dce4', c2: '#4a5060', ac: '#c81e1e' }],
  '마나의 투구': ['helm', { s: 'wizard', c1: '#4a6ad8', c2: '#121e5a', ac: '#fff2a0' }],
  '커츠의 투구': ['helm', { s: 'horned', c1: '#3a3a44', c2: '#0e0e12', ac: '#ff2a2a', hero: 1, aura: '#ff3030' }],
  '데스나이트의 투구': ['helm', { s: 'skull', c1: '#4a3a34', c2: '#120a08', ac: '#ff7a2a', hero: 1, aura: '#ff7a2a' }],
  // 갑옷
  '가죽 갑옷': ['armor', { s: 'vest', c1: '#a07850', c2: '#4a3420' }],
  '천 로브': ['armor', { s: 'robe', c1: '#d8d0bc', c2: '#8a8070', tr: '#5a4a8a' }],
  '사슬 갑옷': ['armor', { s: 'chain', c1: '#c8ccd4', c2: '#6a707a' }],
  '판금 갑옷': ['armor', { s: 'plate', c1: '#eef2f6', c2: '#6d7784' }],
  '비늘 갑옷': ['armor', { s: 'scale', c1: '#9ac07a', c2: '#2e5a2a' }],
  '수호성의 로브': ['armor', { s: 'sage', c1: '#ffffff', c2: '#c8c0e8', tr: '#c9a24a' }],
  '커츠의 갑옷': ['armor', { s: 'heavy', c1: '#3a3a44', c2: '#0e0e12', tr: '#c81e1e', hero: 1, aura: '#ff3030' }],
  '데스나이트의 갑옷': ['armor', { s: 'heavy', c1: '#4a2e24', c2: '#140806', tr: '#ff7a2a', hero: 1, aura: '#ff7a2a' }],
  // 장갑
  '가죽 장갑': ['gloves', { s: 'mitt', c1: '#a07850', c2: '#4a3420' }],
  '면 장갑': ['gloves', { s: 'cloth', c1: '#f6f2e6', c2: '#b8b0a0', ac: '#7a9ad8' }],
  '판금 장갑': ['gloves', { s: 'plate', c1: '#eef2f6', c2: '#6d7784' }],
  '강철 장갑': ['gloves', { s: 'steel', c1: '#8a929c', c2: '#2e343c' }],
  '파워 글로브': ['gloves', { s: 'power', c1: '#c86a3a', c2: '#5a1e0a', ac: '#e8c070' }],
  '마법사의 장갑': ['gloves', { s: 'mage', c1: '#8a6ac8', c2: '#2a1a5a', ac: '#fff2a0' }],
  '오우거의 장갑': ['gloves', { s: 'ogre', c1: '#8aa05a', c2: '#3a4a1a', ac: '#5a3a1a', hero: 1, aura: '#c8f07a' }],
  '데스나이트의 장갑': ['gloves', { s: 'dk', c1: '#4a3a34', c2: '#120a08', ac: '#ff7a2a', hero: 1, aura: '#ff7a2a' }],
  // 장화
  '가죽 장화': ['boots', { s: 'boot', c1: '#a07850', c2: '#4a3420' }],
  '천 신발': ['boots', { s: 'shoe', c1: '#e8e0cc', c2: '#a89a80', ac: '#7a6a50' }],
  '판금 장화': ['boots', { s: 'plate', c1: '#eef2f6', c2: '#6d7784' }],
  '요정족 장화': ['boots', { s: 'elf', c1: '#9ad07a', c2: '#2e5a2a', ac: '#f2d98a' }],
  '신속의 장화': ['boots', { s: 'wing', c1: '#e8d8b0', c2: '#8a6a3a' }],
  '마나의 장화': ['boots', { s: 'mana', c1: '#4a6ad8', c2: '#121e5a', ac: '#9fe8ff' }],
  '커츠의 장화': ['boots', { s: 'heavy', c1: '#3a3a44', c2: '#0e0e12', ac: '#c81e1e', hero: 1, aura: '#ff3030' }],
  '데스나이트의 장화': ['boots', { s: 'heavy', c1: '#4a2e24', c2: '#140806', ac: '#ff7a2a', hero: 1, aura: '#ff7a2a' }],
  // 망토
  '천 망토': ['cloak', { s: 'cape', c1: '#6a5a8a', c2: '#2a2238', cl: '#c9a24a' }],
  '가죽 망토': ['cloak', { s: 'tattered', c1: '#8a6040', c2: '#3a2414', cl: '#c9a24a' }],
  '요정족 망토': ['cloak', { s: 'elf', c1: '#7ac05a', c2: '#1e4a1a', cl: '#f2d98a' }],
  '마법 방어 망토': ['cloak', { s: 'rune', c1: '#3a5ab8', c2: '#0e1a4a', cl: '#9fe8ff' }],
  '보호의 망토': ['cloak', { s: 'guard', c1: '#f4f4f8', c2: '#a8b0c8', cl: '#5a8ad8' }],
  '투명 망토': ['cloak', { s: 'invis', c1: 'rgba(200,230,255,.9)', c2: 'rgba(120,160,210,.6)' }],
  '커츠의 망토': ['cloak', { s: 'royal', c1: '#2a2a32', c2: '#08080c', cl: '#a81e1e', hero: 1, aura: '#ff3030' }],
  '데스나이트의 망토': ['cloak', { s: 'royal', c1: '#5a2418', c2: '#140604', cl: '#3a3a44', hero: 1, aura: '#ff7a2a' }],
  // 벨트
  '가죽 벨트': ['belt', { b: 'square', c1: '#a07850', c2: '#4a3420', k1: '#f6dc86', k2: '#9a7424' }],
  '천 허리띠': ['belt', { b: 'sash', c1: '#d8c8a8', c2: '#8a7a5a', k1: '#c84a3a', k2: '#6a1a10' }],
  '강철 벨트': ['belt', { b: 'round', c1: '#8a929c', c2: '#3a4048', k1: '#eef2f6', k2: '#7d8794', studs: '#eef2f6' }],
  '오크 족장의 벨트': ['belt', { b: 'tusk', c1: '#6a5a3a', c2: '#2a2010', k1: '#8a6a3a', k2: '#3a2810', studs: '#c8c0a8' }],
  '힘의 벨트': ['belt', { b: 'gem', c1: '#8a3a2a', c2: '#3a0e08', k1: '#f6dc86', k2: '#9a7424', gem: '#ff7030' }],
  '마나의 벨트': ['belt', { b: 'gem', c1: '#2a4a8a', c2: '#0a1438', k1: '#e8eef8', k2: '#8a9ab8', gem: '#5ab8ff' }],
  '거인의 벨트': ['belt', { b: 'wide', wd: 1, c1: '#7a5a30', c2: '#2a1a08', k1: '#ffe8a0', k2: '#b88a20', gem: '#ff4040', studs: '#ffe8a0', hero: 1, aura: '#ffd060' }],
  '지배자의 벨트': ['belt', { b: 'crown', wd: 1, c1: '#4a1a5a', c2: '#14061e', k1: '#ffe8a0', k2: '#b88a20', gem: '#c87aff', studs: '#ffe8a0', hero: 1, aura: '#c87aff' }],
  // 반지
  '은 반지': ['ring', { gm: 'round', c1: '#f4f6fa', c2: '#8a929c', g1: '#c8e8ff', g2: '#4a8ac8' }],
  '보호의 반지': ['ring', { gm: 'shield', c1: '#d8dce4', c2: '#6a707a', g1: '#a8c8ff', g2: '#2a4a9a' }],
  '체력의 반지': ['ring', { gm: 'heart', c1: '#f6dc86', c2: '#9a7424', g1: '#ff9090', g2: '#a81e1e' }],
  '마나의 반지': ['ring', { gm: 'drop', c1: '#e8eef8', c2: '#7a8aa8', g1: '#a8e0ff', g2: '#1a5ad8' }],
  '힘의 반지': ['ring', { gm: 'square', c1: '#c8a070', c2: '#5a3a14', g1: '#ffb070', g2: '#c84a0a', eng: '#3a2008' }],
  '민첩의 반지': ['ring', { gm: 'square', c1: '#c8e8c8', c2: '#3a6a3a', g1: '#b0ffb0', g2: '#1a8a3a' }],
  '용의 반지': ['ring', { gm: 'eye', c1: '#ffe8a0', c2: '#9a6a10', g1: '#ffd040', g2: '#c83a08', eng: '#7a4a08', hero: 1, aura: '#ffb030' }],
  '군주의 반지': ['ring', { gm: 'crown', c1: '#ffe8a0', c2: '#9a6a10', g1: '#e8b0ff', g2: '#6a1aa8', hero: 1, aura: '#c87aff' }],
  // 목걸이
  '수호의 목걸이': ['amulet', { p: 'shield', c1: '#d8dce4', c2: '#6a707a', g1: '#a8c8ff', g2: '#2a4a9a' }],
  '나무 부적': ['amulet', { p: 'wood', c1: '#c09060', c2: '#6a4020', g1: '#fff', g2: '#ccc', ch: '#8a6a40', cord: 1 }],
  '체력의 목걸이': ['amulet', { p: 'heart', c1: '#f6dc86', c2: '#9a7424', g1: '#ff9090', g2: '#a81e1e' }],
  '마나의 목걸이': ['amulet', { p: 'drop', c1: '#e8eef8', c2: '#7a8aa8', g1: '#a8e0ff', g2: '#1a5ad8', ch: '#c8d4e8' }],
  '지식의 목걸이': ['amulet', { p: 'book', c1: '#5a3a8a', c2: '#1e0e3a', g1: '#fff2a0', g2: '#c89a20' }],
  '민첩의 목걸이': ['amulet', { p: 'feather', c1: '#c8e8c8', c2: '#3a6a3a', g1: '#e8fff0', g2: '#5ac88a', ch: '#8ac08a' }],
  '용의 목걸이': ['amulet', { p: 'dragon', c1: '#c8a050', c2: '#5a3a08', g1: '#ffd040', g2: '#c83a08', hero: 1, aura: '#ffb030' }],
  '신성한 목걸이': ['amulet', { p: 'holy', c1: '#fff6d0', c2: '#c89a30', g1: '#ffffff', g2: '#8ad0ff', ch: '#ffe8a0', hero: 1, aura: '#fff0a0' }],
  // 티셔츠
  '천 티셔츠': ['shirt', { s: 'tee', c1: '#e8e0cc', c2: '#b8ae96' }],
  '면 티셔츠': ['shirt', { s: 'long', c1: '#f4f4f0', c2: '#c8c8c0', ac: '#7a9ad8' }],
  '요정족 티셔츠': ['shirt', { s: 'elf', c1: '#b8e0a0', c2: '#4a7a3a', ac: '#f2d98a' }],
  '사슬 티셔츠': ['shirt', { s: 'mail', c1: '#c8ccd4', c2: '#6a707a' }],
  '수호의 티셔츠': ['shirt', { s: 'guard', c1: '#6a9ae0', c2: '#1e3a7a', ac: '#f2d98a' }],
  '마력의 티셔츠': ['shirt', { s: 'magic', c1: '#8a5ac8', c2: '#2a1050', ac: '#fff2a0' }],
  '커츠의 티셔츠': ['shirt', { s: 'dark', c1: '#3a3a44', c2: '#0e0e12', ac: '#c81e1e', hero: 1, aura: '#ff3030' }],
  '신성한 티셔츠': ['shirt', { s: 'holy', c1: '#ffffff', c2: '#e8dcb0', ac: '#c9a24a', hero: 1, aura: '#fff0a0' }],
};

// ===== 장비 도감 113종 (equip_codex.html 표 그대로) — 모든 장비를 상점·몬스터·보스에게서 얻고 낄 수 있게
// 열: 부위, 등급, 이름, 직업, 착용 Lv, 공격, AC, 명중, 추가 피해, MR, 고정 옵션, 무게, 안전 강화, 얻는 곳, (예전부터 있던 것)
const CODEX_ROWS = [
// 한손검
['한손검','일반','장검','기사',1,'2~10',0,0,0,0,'현재 게임의 롱소드를 이 이름으로 변경',7,6,'무기 상점',1],
['한손검','일반','난쟁이족 검','기사',5,'2~11',0,1,0,0,'—',8,6,'무기 상점 · 난쟁이 드랍',0],
['한손검','고급','일본도','기사',10,'3~13',0,0,1,0,'—',6,6,'사막 1구간 몬스터',0],
['한손검','고급','다마스커스 검','기사',14,'3~14',0,1,0,0,'—',7,6,'사막 2구간 몬스터',0],
['한손검','고급','사막의 곡도','기사',12,'3~13',0,0,0,0,'모래 지역 몬스터 추가 피해 +1',6,6,'사막 몬스터',1],
['한손검','희귀','뇌신검','기사',20,'4~16',0,1,0,0,'타격 시 10% 번개 추가 피해 4~8',8,4,'거대 여왕개미',0],
['한손검','희귀','싸울아비 장검','기사',24,'5~16',0,1,2,0,'—',9,4,'셸로브',0],
['한손검','영웅','커츠의 검','기사',30,'6~18',0,3,2,0,'힘 +1',10,2,'커츠 (추후)',0],
['한손검','영웅','데스나이트의 불검','기사',35,'7~20',0,2,1,0,'타격 시 15% 화염 추가 피해 6~12',12,2,'데스나이트 (추후)',0],
// 활
['활','일반','단궁','요정',1,'1~6',0,0,0,0,'—',4,6,'무기 상점',0],
['활','일반','장궁','요정',5,'2~8',0,1,0,0,'—',6,6,'무기 상점',0],
['활','고급','요정족 활','요정',10,'2~10',0,2,0,0,'민첩 +1',5,6,'요정 숲 상점(추후) · 사막 드랍',0],
['활','고급','석궁','요정',14,'3~11',0,1,1,0,'—',9,6,'사막 2구간 몬스터',0],
['활','희귀','화염의 활','요정',20,'3~13',0,2,0,0,'타격 시 10% 화염 추가 피해 3~6',7,4,'거대 여왕개미',0],
['활','희귀','장인의 활','요정',24,'4~13',0,3,1,0,'—',7,4,'셸로브',0],
['활','영웅','사이하의 활','요정',30,'5~16',0,3,2,0,'민첩 +1 · 화살 소모 없음',6,2,'상위 보스 (추후)',0],
['활','영웅','혼돈의 활','요정',35,'6~17',0,2,3,0,'타격 시 10% 상대 명중 -2 (3초)',8,2,'상위 보스 (추후)',0],
// 지팡이
['지팡이','일반','참나무 지팡이','마법사',1,'1~5',0,0,0,0,'SP +1',4,6,'무기 상점',0],
['지팡이','일반','수정 지팡이','마법사',5,'1~6',0,0,0,0,'SP +1 · MP +5',5,6,'무기 상점',0],
['지팡이','고급','마나의 지팡이','마법사',10,'2~7',0,0,0,0,'SP +2 · 타격 시 MP 1~3 흡수',6,6,'사막 1구간 몬스터',0],
['지팡이','고급','해골 지팡이','마법사',14,'2~8',0,0,0,0,'SP +2 · 언데드 추가 피해 +2',6,6,'사막 2구간 몬스터',0],
['지팡이','희귀','얼음 여왕의 지팡이','마법사',20,'3~9',0,0,0,0,'SP +3 · 냉기 마법 피해 +10%',7,4,'거대 여왕개미',0],
['지팡이','희귀','바포메트의 지팡이','마법사',24,'3~10',0,0,0,0,'SP +3 · HP +10',8,4,'셸로브',0],
['지팡이','영웅','아크메이지의 지팡이','마법사',30,'4~11',0,0,0,0,'SP +4 · MP +30',7,2,'상위 보스 (추후)',0],
['지팡이','영웅','흑장로의 지팡이','마법사',35,'4~12',0,0,0,0,'SP +5 · 마법 성공률 +5%',8,2,'상위 보스 (추후)',0],
// 단검
['단검','일반','단검','공용',1,'1~6',0,0,0,0,'—',3,6,'무기 상점',0],
['단검','일반','난쟁이족 단검','공용',5,'1~7',0,1,0,0,'—',3,6,'무기 상점 · 난쟁이 드랍',0],
['단검','고급','오리하루콘 단검','공용',10,'2~9',0,0,1,0,'—',3,6,'사막 1구간 몬스터',0],
['단검','고급','크리스','공용',14,'2~10',0,1,0,0,'—',4,6,'사막 2구간 몬스터',0],
['단검','희귀','혈풍의 단검','공용',20,'3~11',0,1,1,0,'타격 시 8% 출혈 (3초, 초당 2)',4,4,'거대 여왕개미',0],
['단검','희귀','바람칼날의 단검','공용',24,'3~12',0,2,0,0,'공격 속도 +5%',3,4,'셸로브',0],
['단검','영웅','암살자의 단검','공용',30,'4~14',0,2,2,0,'치명타 확률 +5%',4,2,'상위 보스 (추후)',0],
['단검','영웅','그림자 단검','공용',35,'4~15',0,3,2,0,'민첩 +1',4,2,'상위 보스 (추후)',0],
// 방패
['방패','일반','나무 방패','기사·요정',1,'',1,0,0,0,'—',6,4,'방어구 상점',1],
['방패','일반','둥근 철방패','기사',5,'',2,0,0,0,'—',10,4,'방어구 상점',0],
['방패','고급','요정족 방패','기사·요정',10,'',2,0,0,5,'—',5,4,'사막 1구간 몬스터',0],
['방패','고급','강철 연방패','기사',14,'',3,0,0,0,'—',12,4,'사막 2구간 몬스터',0],
['방패','희귀','붉은 기사의 방패','기사',20,'',4,0,0,5,'받는 근접 피해 -1',11,2,'거대 여왕개미',0],
['방패','희귀','수호의 방패','기사·요정',24,'',4,0,0,0,'HP +20',10,2,'셸로브',0],
['방패','영웅','반역자의 방패','기사',30,'',5,0,0,10,'받는 피해 -2',12,0,'상위 보스 (추후)',0],
['방패','영웅','데스나이트의 방패','기사',35,'',6,0,0,5,'화염 저항 +20',14,0,'데스나이트 (추후)',0],
// 투구
['투구','일반','가죽 투구','공용',1,'',1,0,0,0,'—',3,4,'방어구 상점',1],
['투구','일반','철 투구','기사·요정',5,'',2,0,0,0,'—',6,4,'방어구 상점',0],
['투구','고급','판금 투구','기사',10,'',2,0,0,3,'—',8,4,'방어구 상점(고가) · 여왕개미',1],
['투구','고급','마법 방어 투구','공용',14,'',1,0,0,10,'—',4,4,'사막 2구간 몬스터',0],
['투구','희귀','지휘관의 투구','기사',20,'',3,0,0,0,'HP +15 · 힘 +1',9,2,'거대 여왕개미',0],
['투구','희귀','마나의 투구','마법사',24,'',2,0,0,5,'MP +15 · 지능 +1',4,2,'셸로브',0],
['투구','영웅','커츠의 투구','기사',30,'',4,2,0,5,'—',10,0,'커츠 (추후)',0],
['투구','영웅','데스나이트의 투구','기사',35,'',5,0,0,10,'—',12,0,'데스나이트 (추후)',0],
// 갑옷
['갑옷','일반','가죽 갑옷','공용',1,'',2,0,0,0,'—',10,4,'방어구 상점',1],
['갑옷','일반','천 로브','마법사',1,'',1,0,0,3,'MP +5',4,4,'방어구 상점',0],
['갑옷','고급','사슬 갑옷','기사·요정',10,'',4,0,0,0,'—',20,4,'사막 1구간 몬스터',0],
['갑옷','고급','판금 갑옷','기사',14,'',5,0,0,0,'—',25,4,'방어구 상점(고가) · 여왕개미',1],
['갑옷','희귀','비늘 갑옷','기사·요정',20,'',6,0,0,5,'—',18,2,'거대 여왕개미',1],
['갑옷','희귀','수호성의 로브','마법사',24,'',4,0,0,15,'MP +20',6,2,'셸로브',0],
['갑옷','영웅','커츠의 갑옷','기사',30,'',8,0,0,5,'HP +30',28,0,'커츠 (추후)',0],
['갑옷','영웅','데스나이트의 갑옷','기사',35,'',9,0,0,5,'화염 저항 +20',30,0,'데스나이트 (추후)',0],
// 장갑
['장갑','일반','가죽 장갑','공용',1,'',1,0,0,0,'—',2,4,'방어구 상점',1],
['장갑','일반','면 장갑','마법사',1,'',0,0,0,0,'MP +3',1,4,'방어구 상점',0],
['장갑','고급','판금 장갑','기사',10,'',1,1,0,0,'—',5,4,'방어구 상점(고가) · 여왕개미',1],
['장갑','고급','강철 장갑','기사·요정',14,'',2,0,0,0,'—',6,4,'사막 2구간 몬스터',0],
['장갑','희귀','파워 글로브','기사',20,'',2,0,1,0,'—',5,2,'거대 여왕개미',0],
['장갑','희귀','마법사의 장갑','마법사',24,'',1,0,0,5,'지능 +1 · MP +10',2,2,'셸로브',0],
['장갑','영웅','오우거의 장갑','기사',30,'',3,0,1,0,'힘 +1',7,0,'상위 보스 (추후)',0],
['장갑','영웅','데스나이트의 장갑','기사',35,'',3,2,0,0,'—',7,0,'데스나이트 (추후)',0],
// 장화
['장화','일반','가죽 장화','공용',1,'',1,0,0,0,'—',3,4,'방어구 상점',1],
['장화','일반','천 신발','마법사',1,'',0,0,0,0,'MP +3',1,4,'방어구 상점',0],
['장화','고급','판금 장화','기사',10,'',2,0,0,0,'—',8,4,'방어구 상점(고가) · 여왕개미',1],
['장화','고급','요정족 장화','요정',14,'',1,0,0,0,'민첩 +1',3,4,'사막 2구간 몬스터',0],
['장화','희귀','신속의 장화','공용',20,'',2,0,0,0,'이동 속도 +5%',5,2,'거대 여왕개미',0],
['장화','희귀','마나의 장화','마법사',24,'',1,0,0,5,'MP +15',3,2,'셸로브',0],
['장화','영웅','커츠의 장화','기사',30,'',3,0,0,0,'HP +20',9,0,'커츠 (추후)',0],
['장화','영웅','데스나이트의 장화','기사',35,'',3,0,0,5,'화염 저항 +10',10,0,'데스나이트 (추후)',0],
// 망토
['망토','일반','천 망토','공용',1,'',1,0,0,0,'—',2,4,'방어구 상점',1],
['망토','일반','가죽 망토','공용',5,'',1,0,0,0,'HP +5',3,4,'방어구 상점',0],
['망토','고급','요정족 망토','공용',10,'',1,0,0,5,'바람 저항 +10',2,4,'사막 1구간 몬스터',0],
['망토','고급','마법 방어 망토','공용',14,'',1,0,0,10,'—',3,4,'사막 2구간 몬스터',0],
['망토','희귀','보호의 망토','공용',20,'',2,0,0,10,'모든 속성 저항 +10',3,2,'거대 여왕개미',0],
['망토','희귀','투명 망토','공용',24,'',1,0,0,0,'사용 시 10초 투명 (재사용 5분)',2,2,'셸로브',0],
['망토','영웅','커츠의 망토','기사',30,'',3,0,0,15,'모든 속성 저항 +10',4,0,'커츠 (추후)',0],
['망토','영웅','데스나이트의 망토','기사',35,'',3,0,0,10,'HP +20',5,0,'데스나이트 (추후)',0],
// 벨트
['벨트','일반','가죽 벨트','공용',1,'',0,0,0,0,'MP +2',1,4,'방어구 상점',1],
['벨트','일반','천 허리띠','공용',1,'',0,0,0,0,'HP +5',1,4,'방어구 상점',0],
['벨트','고급','강철 벨트','기사',10,'',1,0,0,0,'—',3,4,'사막 1구간 몬스터',0],
['벨트','고급','오크 족장의 벨트','공용',14,'',0,0,0,0,'HP +15 · 땅 저항 +10',2,4,'사막 2구간 몬스터',0],
['벨트','희귀','힘의 벨트','공용',20,'',0,0,0,0,'힘 +1',2,2,'거대 여왕개미',0],
['벨트','희귀','마나의 벨트','공용',24,'',0,0,0,0,'MP +20',2,2,'셸로브',0],
['벨트','영웅','거인의 벨트','공용',30,'',1,0,0,0,'힘 +2 · HP +30',4,0,'상위 보스 (추후)',0],
['벨트','영웅','지배자의 벨트','공용',35,'',2,0,0,10,'HP +20 · 모든 속성 저항 +5',3,0,'상위 보스 (추후)',0],
// 반지
['반지','일반','은 반지','공용',1,'',1,0,0,0,'HP +5',1,0,'잡화 상점',1],
['반지','일반','보호의 반지','공용',5,'',1,0,0,0,'—',1,0,'잡화 상점',0],
['반지','고급','체력의 반지','공용',10,'',1,0,0,0,'HP +15',1,0,'사막 1구간 몬스터',0],
['반지','고급','마나의 반지','공용',14,'',1,0,0,0,'MP +15',1,0,'사막 2구간 몬스터',0],
['반지','희귀','힘의 반지','공용',20,'',1,0,0,0,'힘 +1',1,0,'거대 여왕개미',0],
['반지','희귀','민첩의 반지','공용',24,'',1,0,0,0,'민첩 +1',1,0,'셸로브',0],
['반지','영웅','용의 반지','공용',30,'',1,0,0,5,'HP +30',1,0,'상위 보스 (추후)',0],
['반지','영웅','군주의 반지','공용',35,'',1,0,0,0,'모든 능력치 +1',1,0,'상위 보스 (추후)',0],
// 목걸이
['목걸이','일반','수호의 목걸이','공용',1,'',1,0,0,0,'—',1,0,'잡화 상점',1],
['목걸이','일반','나무 부적','공용',1,'',1,0,0,0,'HP +5',1,0,'잡화 상점',0],
['목걸이','고급','체력의 목걸이','공용',10,'',1,0,0,0,'HP +20',1,0,'사막 1구간 몬스터',0],
['목걸이','고급','마나의 목걸이','공용',14,'',1,0,0,0,'MP +15',1,0,'사막 2구간 몬스터',0],
['목걸이','희귀','지식의 목걸이','공용',20,'',1,0,0,0,'지능 +1 · MP +10',1,0,'거대 여왕개미',0],
['목걸이','희귀','민첩의 목걸이','공용',24,'',1,0,0,0,'민첩 +1',1,0,'셸로브',0],
['목걸이','영웅','용의 목걸이','공용',30,'',2,0,0,0,'HP +30',1,0,'상위 보스 (추후)',0],
['목걸이','영웅','신성한 목걸이','공용',35,'',1,0,0,5,'지혜 +2 · MP 회복 +3',1,0,'상위 보스 (추후)',0],
// 티셔츠
['티셔츠','일반','천 티셔츠','공용',1,'',0,0,0,0,'—',1,4,'잡화 상점',1],
['티셔츠','일반','면 티셔츠','공용',5,'',0,0,0,0,'HP +3',1,4,'잡화 상점',0],
['티셔츠','고급','요정족 티셔츠','공용',10,'',0,0,0,5,'바람 저항 +5',1,4,'사막 1구간 몬스터',0],
['티셔츠','고급','사슬 티셔츠','기사·요정',14,'',1,0,0,0,'—',4,4,'사막 2구간 몬스터',0],
['티셔츠','희귀','수호의 티셔츠','공용',20,'',1,0,0,0,'HP +10 · 물 저항 +10',1,2,'거대 여왕개미',0],
['티셔츠','희귀','마력의 티셔츠','공용',24,'',0,0,0,0,'MP +15',1,2,'셸로브',0],
['티셔츠','영웅','커츠의 티셔츠','기사',30,'',2,0,0,5,'—',1,0,'커츠 (추후)',0],
['티셔츠','영웅','신성한 티셔츠','공용',35,'',2,0,0,0,'HP +20',1,0,'상위 보스 (추후)',0],
];
const CX_SLOT = { 한손검: ['weapon', 'sword', 'sw'], 활: ['weapon', 'bow', 'bw'], 지팡이: ['weapon', 'staff', 'st'], 단검: ['weapon', 'dagger', 'dg'], 방패: ['shield', null, 'sh'], 투구: ['helm', null, 'hm'], 갑옷: ['armor', null, 'ar'],
  장갑: ['gloves', null, 'gl'], 장화: ['boots', null, 'bt'], 망토: ['cloak', null, 'cl'], 벨트: ['belt', null, 'be'], 반지: ['ring', null, 'rg'], 목걸이: ['amulet', null, 'am'], 티셔츠: ['shirt', null, 'ts'] };
const CX_GROUPS = Object.keys(CX_SLOT);
const CX_CLS = { 기사: ['knight'], 요정: ['elf'], 마법사: ['wizard'], 공용: null, '기사·요정': ['knight', 'elf'] };
// 원래 있던 아이템은 id를 그대로 두고 수치만 표대로 (롱소드 → 장검)
const CODEX_ID = { 장검: 'long_sword', '사막의 곡도': 'scimitar', '나무 방패': 'wood_shield', '가죽 투구': 'leather_helm', '판금 투구': 'plate_helm', '가죽 갑옷': 'leather_armor', '판금 갑옷': 'plate_armor', '비늘 갑옷': 'scale_armor',
  '가죽 장갑': 'leather_gloves', '판금 장갑': 'plate_gloves', '가죽 장화': 'leather_boots', '판금 장화': 'plate_boots', '천 망토': 'cloak', '가죽 벨트': 'leather_belt', '은 반지': 'silver_ring', '수호의 목걸이': 'amulet', '천 티셔츠': 'cloth_shirt' };
// 아직 그 시스템이 없는 옵션: 수치는 갖고 있고 상세창에 표시만 (시스템이 생기면 바로 적용)
const CX_LATER = { noArrow: '화살이 생기면 적용', undeadDmg: '언데드 몬스터가 생기면 적용', coldMagic: '냉기 마법이 생기면 적용', magicSucc: '마법 성공 판정이 생기면 적용' };
function cxOpt(txt) { const o = {}; if (!txt || txt === '—' || /롱소드/.test(txt)) return o;
  for (const p of txt.split('·').map(s => s.trim()).filter(Boolean)) { let m;
    if ((m = p.match(/^HP \+(\d+)$/))) o.hp = +m[1];
    else if ((m = p.match(/^MP \+(\d+)$/))) o.mp = +m[1];
    else if ((m = p.match(/^힘 \+(\d+)$/))) o.str = +m[1];
    else if ((m = p.match(/^민첩 \+(\d+)$/))) o.dex = +m[1];
    else if ((m = p.match(/^지능 \+(\d+)$/))) o.int = +m[1];
    else if ((m = p.match(/^지혜 \+(\d+)$/))) o.wis = +m[1];
    else if ((m = p.match(/^모든 능력치 \+(\d+)$/))) o.all = +m[1];
    else if ((m = p.match(/^SP \+(\d+)$/))) o.sp = +m[1];
    else if ((m = p.match(/^이동 속도 \+(\d+)%$/))) o.moveSpd = +m[1];
    else if ((m = p.match(/^공격 속도 \+(\d+)%$/))) o.atkSpd = +m[1];
    else if ((m = p.match(/^치명타 확률 \+(\d+)%$/))) o.crit = +m[1];
    else if ((m = p.match(/^받는 근접 피해 -(\d+)$/))) o.drMelee = +m[1];
    else if ((m = p.match(/^받는 피해 -(\d+)$/))) o.dr = +m[1];
    else if ((m = p.match(/^화염 저항 \+(\d+)$/))) o.fireRes = (o.fireRes || 0) + +m[1];
    else if ((m = p.match(/^(물|바람|땅) 저항 \+(\d+)$/))) { const k = { 물: 'waterRes', 바람: 'windRes', 땅: 'earthRes' }[m[1]]; o[k] = (o[k] || 0) + +m[2]; }
    else if ((m = p.match(/^모든 속성 저항 \+(\d+)$/))) for (const k of ['fireRes', 'waterRes', 'windRes', 'earthRes']) o[k] = (o[k] || 0) + +m[1];
    else if ((m = p.match(/^MP 회복 \+(\d+)$/))) o.mpRegen = +m[1];
    else if ((m = p.match(/^타격 시 (\d+)% (번개|화염) 추가 피해 (\d+)~(\d+)$/))) o.proc = { kind: m[2] === '번개' ? 'lightning' : 'fire', p: m[1] / 100, dmg: [+m[3], +m[4]] };
    else if ((m = p.match(/^타격 시 (\d+)% 출혈 \((\d+)초, 초당 (\d+)\)$/))) o.proc = { kind: 'bleed', p: m[1] / 100, dur: +m[2], dps: +m[3] };
    else if ((m = p.match(/^타격 시 (\d+)% 상대 명중 -(\d+) \((\d+)초\)$/))) o.proc = { kind: 'hitdown', p: m[1] / 100, v: +m[2], dur: +m[3] };
    else if ((m = p.match(/^타격 시 MP (\d+)~(\d+) 흡수$/))) o.mpDrain = [+m[1], +m[2]];
    else if ((m = p.match(/^모래 지역 몬스터 추가 피해 \+(\d+)$/))) o.sandDmg = +m[1];
    else if ((m = p.match(/^언데드 추가 피해 \+(\d+)$/))) o.undeadDmg = +m[1];
    else if ((m = p.match(/^냉기 마법 피해 \+(\d+)%$/))) o.coldMagic = +m[1];
    else if ((m = p.match(/^마법 성공률 \+(\d+)%$/))) o.magicSucc = +m[1];
    else if (p === '화살 소모 없음') o.noArrow = 1;
    else if ((m = p.match(/^사용 시 (\d+)초 투명 \(재사용 (\d+)분\)$/))) o.invis = { dur: +m[1], cd: m[2] * 60 };
    else console.warn('장비 도감: 해석하지 못한 옵션', p); }
  return o; }
const CX_METAL = /철|판금|사슬|강철|비늘|커츠|데스나이트|지휘관/;   // 기사 그림: 금속 방어구는 판금 그림(p), 나머지는 가죽 그림(l)
const CX_PRICE = { long_sword: 3000, wood_shield: 300, leather_armor: 400, leather_boots: 150, plate_helm: 3000, plate_armor: 8000, plate_gloves: 2500, plate_boots: 3000, leather_helm: 250, leather_gloves: 200, cloak: 200, leather_belt: 150, silver_ring: 600, amulet: 800, cloth_shirt: 100 };
const CX_LIST = [], CX_HERO = [], CX_ZONE = { 3: [], 4: [], 5: [], 6: [], 7: [], 8: [] }, CX_ZONE_R = { 6: [], 8: [] }, CX_BOSS = { ice_queen: [], queen_ant: [], shelob: [], ogre: [], baphomet: [], kaspar: [], merkyor: [], balthazar: [], sema: [], deathknight: [] }, CX_SHOP = { weapon: [], armor: [], general: [] };
const CX_P = { zone: 0.003, dwarf: 0.01, rare: 0.04, hero: 0.007 };
const HERO_P = { ice_queen: 0.12, shelob: 0.02, queen_ant: 0.08, ogre: 0.08, baphomet: 0.10, kaspar: 0.03, merkyor: 0.03, balthazar: 0.03, sema: 0.03, deathknight: 0.12 };   // 영웅 장비가 나올 확률 (한 번 잡을 때) — 셸로브는 30분마다라 낮게   // 고급: 사막 몬스터 아이템마다 0.3% (한 번에 1개) · 난쟁이 1% · 희귀: 보스 4% · 영웅: 보스 아이템마다 0.7% (한 번에 1개)
for (const k in ITEMS) { const d = ITEMS[k]; if (/주문서/.test(d.name || '') || /scroll/.test(k) || d.use === 'learn') d.w = 0; }   // v107: 모든 주문서·마법서·기술서·정령수정 무게 0
const BELT_WR = { 일반: 3, 고급: 5, 희귀: 8, 영웅: 12 };   // 벨트 무게 감소 % (등급별)
{ const cnt = {};
  for (const [sl, grade, name, cls, lv, rng, ac, hit, xd, mr, opt, w, safe, src] of CODEX_ROWS) { const [slot, wtype, code] = CX_SLOT[sl];
    const id = CODEX_ID[name] || `cx_${code}${cnt[code] = (cnt[code] || 0) + 1}`, o = cxOpt(opt), old = ITEMS[id];
    const d = old || (ITEMS[id] = {}); for (const k of ['hp', 'mp']) delete d[k];
    Object.assign(d, { name, slot, icon: 'ic_' + id, ac, w, safe, lv, cls: CX_CLS[cls], rar: grade, src, codex: true, grp: sl, optTxt: opt && opt !== '—' && !/롱소드/.test(opt) ? opt.split('·').map(s => s.trim()) : [] }, o);
    if (wtype) d.wtype = wtype; if (rng) d.dmg = rng.split('~').map(Number); if (hit) d.hit = hit; if (xd) d.xdmg = xd; if (mr) d.mr = mr;
    if (slot === 'belt') { d.wr = BELT_WR[grade] || 3; d.optTxt.push(`가방 무게 −${d.wr}%`); }   // 벨트: 가방 무게 감소 (등급별)
    if (['helm', 'armor', 'gloves', 'boots'].includes(slot)) d.look = CX_METAL.test(name) ? 'p' : 'l';
    const r50 = v => Math.max(50, Math.round(v / 50) * 50);
    d.price = CX_PRICE[id] ?? r50((d.dmg ? 300 + (d.dmg[0] + d.dmg[1]) * 120 : 150 + ac * 350) * (1 + lv / 4) + (d.hp || 0) * 30 + (d.mp || 0) * 40 + (d.mr || 0) * 40 + (d.hit || 0) * 400 + (d.sp || 0) * 500);
    CX_LIST.push(id);
    // 얻는 곳
    if (grade === '일반') CX_SHOP[slot === 'weapon' ? 'weapon' : ['ring', 'amulet', 'shirt'].includes(slot) ? 'general' : 'armor'].push(id);
    if (grade === '고급') { if (/상점\(고가\)/.test(src)) CX_SHOP.armor.push(id); if (/사막 1구간|사막 몬스터|사막 드랍/.test(src)) CX_ZONE[3].push(id); if (/사막 2구간|사막 몬스터|사막 드랍/.test(src)) CX_ZONE[4].push(id); }
    if (grade === '고급' && /사막 2구간 몬스터/.test(src)) { CX_ZONE[5].push(id); CX_ZONE[6].push(id); CX_ZONE[7].push(id); CX_ZONE[8].push(id); d.src = src + ' · 오크숲·버그베어밭 몬스터'; }   // 오크숲: Lv14 고급 장비 (1·2구간)
    if (grade === '희귀') { if (/여왕개미/.test(src)) CX_BOSS.queen_ant.push(id); if (/셸로브/.test(src)) CX_BOSS.shelob.push(id); CX_BOSS.ogre.push(id); CX_BOSS.baphomet.push(id); for (const b of ['kaspar', 'merkyor', 'balthazar', 'sema', 'deathknight', 'ice_queen']) CX_BOSS[b].push(id); if (lv <= 20) CX_ZONE_R[6].push(id); CX_ZONE_R[8].push(id); }
    if (name === '오우거의 장갑' || name === '거인의 벨트') d.src = '오우거 (오크숲 2구간)';
    if (name === '아크메이지의 지팡이' || name === '암살자의 단검') d.src = '바포메트 (버그베어밭 2구간)';
    if (name === '바포메트의 지팡이') d.src = src + ' · 바포메트';
    if (grade === '영웅') CX_HERO.push(id);
    // 아이콘 (아이템마다 다른 그림). 그라디언트 id가 공용 정의와 겹치지 않게 접두어
    const sp = CX_SPEC[name]; if (sp) CXI[d.icon] = CXB(sp[0], sp[1]).replace(/id="([\w-]+)"/g, 'id="c_$1"').replace(/url\(#([\w-]+)\)/g, 'url(#c_$1)'); else console.warn('장비 도감: 아이콘 없음', name); }
  // 희귀: 보스 드랍표에 추가 (이미 들어 있는 건 그대로)
  for (const b in CX_BOSS) for (const id of CX_BOSS[b]) if (!DROP_TABLE[b].some(r => r[0] === id)) DROP_TABLE[b].push([id, ({ kaspar: 0.01, merkyor: 0.01, balthazar: 0.01, sema: 0.01, deathknight: 0.03, ice_queen: 0.03 })[b] || (b === 'ogre' || b === 'baphomet' ? 0.025 : CX_P.rare)]);
  for (const [nm, pr] of [['오우거의 장갑', 0.03], ['거인의 벨트', 0.02]]) { const id = CX_LIST.find(x => ITEMS[x].name === nm); if (id) DROP_TABLE.ogre.push([id, pr]); }   // 오우거 고유 영웅 드랍
  for (const [nm, pr] of [['아크메이지의 지팡이', 0.03], ['암살자의 단검', 0.02], ['바포메트의 지팡이', 0.06]]) { const id = CX_LIST.find(x => ITEMS[x].name === nm); if (!id) continue; const r = DROP_TABLE.baphomet.find(x => x[0] === id); if (r) r[1] = Math.max(r[1], pr); else DROP_TABLE.baphomet.push([id, pr]); }   // 바포메트 고유 드랍
  // 난쟁이: 난쟁이족 검·단검
  MOB_DROPS.dwarf = (MOB_DROPS.dwarf || []).concat(CX_LIST.filter(id => /^난쟁이족/.test(ITEMS[id].name)).map(id => [id, CX_P.dwarf]));
  // 투명 망토: 버프
  const iv = CX_LIST.find(id => ITEMS[id].invis); BUFF.invis = 0; BUFF_DEF.invis = { name: '투명 (투명 망토)', desc: '몬스터가 나를 보지 못함 · 공격하면 풀림', icon: 'ic_' + iv, dur: ITEMS[iv].invis.dur, c: '#bfe0ff' }; }
// 사막 몬스터(보스 제외)를 잡으면: 그 구간 고급 장비 중 하나가 아주 낮은 확률로 (한 번에 최대 1개)
function cxZoneDrop(f) { const L = ISLE && CX_ZONE[ISLE.id]; if (!L || !L.length) return false; let hit = L.filter(() => Math.random() < CX_P.zone); const LR = CX_ZONE_R[ISLE.id]; if (!hit.length && LR) hit = LR.filter(() => Math.random() < 0.0003); if (!hit.length) return false;   // 오크숲 2구간: 희귀(Lv20) 아이템마다 0.03%
  const id = hit[Math.floor(Math.random() * hit.length)]; GROUND.drop(id, 1, f.i, f.j); if (!lowRar(id)) say(`${rarTag(id)}${JOSA(ITEMS[id].name, '이', '가')} 떨어졌습니다!`, rarC(id)); return true; }
const cxClsName = d => d.cls ? d.cls.map(c => CLASS_NAME[c]).join('·') : '공용';
const cxReq = d => { const okC = !d.cls || d.cls.includes(CLASS), okL = !d.lv || hero.lv >= d.lv; return { okC, okL, ok: okC && okL, txt: `착용 가능: ${cxClsName(d)}${d.lv > 1 ? ` · Lv.${d.lv} 이상` : ''}` }; };
const cxInfo = d => [cxClsName(d), d.lv > 1 ? 'Lv.' + d.lv : '', d.dmg ? `공격 ${d.dmg[0]}~${d.dmg[1]}` : d.ac ? `방어 +${d.ac}` : '', d.hit ? '명중 +' + d.hit : '', d.xdmg ? '추가 피해 +' + d.xdmg : '', d.mr ? 'MR +' + d.mr : '', ...d.optTxt].filter(Boolean).join(' · ');
function breakInvis() { if (BUFF.invis > 0) { BUFF.invis = 0; say('공격하면서 투명 상태가 풀렸습니다.', '#9c9682'); } }
// 기사 그림 색 (부위 그림을 아이템에 맞게 물들임)
Object.assign(LOOK.weapon, {
  cx_sw1: 'sepia(.55) saturate(1.3) brightness(.86)', cx_sw2: 'brightness(1.3) saturate(.25) contrast(1.2)', cx_sw3: 'saturate(.4) hue-rotate(150deg) brightness(.92) contrast(1.15)', scimitar: 'sepia(.7) saturate(1.7) brightness(1.08)',
  cx_sw4: 'sepia(1) hue-rotate(165deg) saturate(3.2) brightness(1.15)', cx_sw5: 'sepia(1) hue-rotate(-28deg) saturate(2.2) brightness(.98)', cx_sw6: 'sepia(1) hue-rotate(-40deg) saturate(3.2) brightness(.52) contrast(1.45)', cx_sw7: 'sepia(1) hue-rotate(-12deg) saturate(4.2) brightness(.78) contrast(1.3)',
  cx_dg1: 'brightness(1.12) saturate(.7)', cx_dg2: 'sepia(.55) saturate(1.3) brightness(.86)', cx_dg3: 'sepia(1) hue-rotate(5deg) saturate(2.6) brightness(1.15)', cx_dg4: 'sepia(.5) hue-rotate(80deg) saturate(1.2)', cx_dg5: 'sepia(1) hue-rotate(-35deg) saturate(3) brightness(.85)',
  cx_dg6: 'sepia(1) hue-rotate(110deg) saturate(1.8) brightness(1.1)', cx_dg7: 'grayscale(1) brightness(.42) contrast(1.6)', cx_dg8: 'sepia(1) hue-rotate(225deg) saturate(2) brightness(.55) contrast(1.3)',
  cx_bw1: 'sepia(.6) brightness(.9)', cx_bw2: 'sepia(.8) brightness(.75)', cx_bw3: 'sepia(1) hue-rotate(50deg) saturate(1.8)', cx_bw4: 'sepia(.7) brightness(.7) contrast(1.2)', cx_bw5: 'sepia(1) hue-rotate(-25deg) saturate(3.2)', cx_bw6: 'sepia(1) saturate(2) brightness(1.1)', cx_bw7: 'sepia(1) hue-rotate(100deg) saturate(2.4) brightness(1.15)', cx_bw8: 'sepia(1) hue-rotate(230deg) saturate(2.2) brightness(.6)',
  cx_st1: 'sepia(.7) brightness(.85)', cx_st2: 'grayscale(.6) brightness(1.2)', cx_st3: 'sepia(1) hue-rotate(185deg) saturate(2.6)', cx_st4: 'grayscale(.8) sepia(.3) brightness(.9)', cx_st5: 'sepia(.5) hue-rotate(170deg) saturate(1.5) brightness(1.35)', cx_st6: 'sepia(1) hue-rotate(-40deg) saturate(2.5) brightness(.6)', cx_st7: 'sepia(1) hue-rotate(230deg) saturate(1.8) brightness(1.2)', cx_st8: 'sepia(1) hue-rotate(240deg) saturate(2.4) brightness(.5) contrast(1.3)' });
Object.assign(LOOK.shield, {
  cx_sh1: 'grayscale(1) brightness(1.05) contrast(1.1)', cx_sh2: 'sepia(1) hue-rotate(50deg) saturate(1.7) brightness(1.05)', cx_sh3: 'grayscale(.85) brightness(1.3) contrast(1.15)', cx_sh4: 'sepia(1) hue-rotate(-30deg) saturate(3) brightness(.92)',
  cx_sh5: 'sepia(1) hue-rotate(185deg) saturate(2.6) brightness(.95)', cx_sh6: 'grayscale(1) brightness(.38) contrast(1.6)', cx_sh7: 'sepia(1) hue-rotate(-18deg) saturate(2.4) brightness(.45) contrast(1.4)' });
LOOK.cloak = { cloak: null, cx_cl1: 'sepia(1) saturate(1.1) brightness(.72)', cx_cl2: 'sepia(1) hue-rotate(55deg) saturate(1.8) brightness(.9)', cx_cl3: 'sepia(1) hue-rotate(190deg) saturate(2.6) brightness(.85)', cx_cl4: 'grayscale(.7) brightness(1.6)', cx_cl5: 'grayscale(.4) brightness(1.5) opacity(.55)', cx_cl6: 'sepia(1) hue-rotate(-40deg) saturate(3) brightness(.42) contrast(1.4)', cx_cl7: 'sepia(1) hue-rotate(-15deg) saturate(2.2) brightness(.5) contrast(1.3)' };
const CX_DARK_K = 'grayscale(.7) sepia(.4) hue-rotate(-30deg) saturate(2.2) brightness(.42) contrast(1.4)', CX_DARK_D = 'sepia(1) hue-rotate(-18deg) saturate(2.2) brightness(.45) contrast(1.35)';
LOOK.armor = { cx_ar1: 'sepia(.2) brightness(1.35) saturate(.6)', cx_ar2: 'grayscale(.9) brightness(1.05)', scale_armor: 'sepia(1) hue-rotate(55deg) saturate(1.8) brightness(.85)', cx_ar3: 'brightness(1.45) saturate(.4) sepia(.2)', cx_ar4: CX_DARK_K, cx_ar5: CX_DARK_D };
LOOK.helm = { cx_hm1: 'grayscale(.9) brightness(.95)', cx_hm2: 'sepia(1) hue-rotate(205deg) saturate(2.2) brightness(.8)', cx_hm3: 'grayscale(.6) brightness(1.15) contrast(1.1)', cx_hm4: 'sepia(1) hue-rotate(195deg) saturate(2.6) brightness(.85)', cx_hm5: CX_DARK_K, cx_hm6: CX_DARK_D };
LOOK.gloves = { cx_gl1: 'brightness(1.5) saturate(.2)', cx_gl2: 'grayscale(.8) brightness(.8) contrast(1.2)', cx_gl3: 'sepia(1) hue-rotate(-20deg) saturate(2) brightness(.9)', cx_gl4: 'sepia(1) hue-rotate(230deg) saturate(1.8)', cx_gl5: 'sepia(1) hue-rotate(40deg) saturate(1.5) brightness(.8)', cx_gl6: CX_DARK_D };
LOOK.boots = { cx_bt1: 'brightness(1.4) saturate(.3)', cx_bt2: 'sepia(1) hue-rotate(55deg) saturate(1.6)', cx_bt3: 'sepia(.6) brightness(1.2)', cx_bt4: 'sepia(1) hue-rotate(195deg) saturate(2.4) brightness(.85)', cx_bt5: CX_DARK_K, cx_bt6: CX_DARK_D };
LOOK.shirt = { cx_ts6: CX_DARK_K }; LOOK.belt = { cx_be4: 'sepia(1) hue-rotate(-30deg) saturate(2) brightness(.8)', cx_be6: 'sepia(1) saturate(1.8) brightness(.95)', cx_be7: 'sepia(1) hue-rotate(240deg) saturate(1.8) brightness(.7)' };
const cxRow = id => { const d = ITEMS[id], R = cxReq(d); return [d.name, d.price, cxInfo(d) + (R.okC ? '' : ` · ${CLASS_NAME[CLASS]} 착용 불가`), id]; };
function cxWhere(id) { const W = [], d = ITEMS[id];
  if (CX_SHOP.weapon.includes(id)) W.push('장비상점 (무기)'); if (CX_SHOP.armor.includes(id)) W.push('장비상점 (방어구)'); if (CX_SHOP.general.includes(id)) W.push('잡화상점 (장신구)');
  if (CX_ZONE[3].includes(id)) W.push('사막 1구간 몬스터'); if (CX_ZONE[4].includes(id)) W.push('사막 2구간 몬스터');
  for (const k in MOB_DROPS) if (MOB_DROPS[k].some(r => r[0] === id)) W.push(MOB[k].name);
  for (const k in DROP_TABLE) if (DROP_TABLE[k].some(r => r[0] === id)) W.push(MOB[k].name);
  if (CX_HERO.includes(id)) W.push('거대 여왕개미·셸로브·오우거·바포메트 (아주 드묾)');
  return W.join(' · ') || d.src; }
// 타격 시 발동 옵션: 번개·화염 추가 피해, 출혈, 상대 명중 저하, MP 흡수
function cxProcs(f) { const [fx, fy] = W2P(f.x, f.z), top = fy - headY(f);
  for (const [s] of SLOTS) { const id = INV.equipped(s); if (!id) continue; const d = ITEMS[id];
    if (d.mpDrain && hero.mp < hero.maxmp) { if (f.mpLeft == null) f.mpLeft = mobMana(f.kind); const v = Math.min(rint(d.mpDrain), f.mpLeft, Math.ceil(hero.maxmp - hero.mp));   // 몬스터 마나가 다 떨어지면 더는 못 빨아들임
      if (v > 0) { f.mpLeft -= v; hero.mp = Math.min(hero.maxmp, hero.mp + v); const [hx, hy] = W2P(hero.x, hero.z); floatText(hx + 14, hy - 84, 'MP +' + v, { color: '#8ab8ff', size: 10 }); if (f.mpLeft <= 0) floatText(fx + 14, top - 26, '마나 고갈', { color: '#8a9ab8', size: 10 }); } }
    const P_ = d.proc; if (!P_ || f.hp <= 0 || Math.random() >= P_.p) continue;
    if (P_.kind === 'lightning' || P_.kind === 'fire') { const L = P_.kind === 'lightning', v = rint(P_.dmg); dmgMob(f, v);
      floatText(fx - 14, top - 20, (L ? '번개 ' : '화염 ') + v, { color: L ? '#9fe8ff' : '#ff9a4a', size: 13, big: true, life: 1 }); impact(fx, fy - headY(f) * 0.5, L ? 'bolt' : 'hit', L ? '#bff4ff' : '#ff8a3a');
      if (AC && SFX_ON) { const T0 = AC.currentTime; if (L) { tone(T0, 'sawtooth', 2200, 300, 0.14, 0.05); nz(T0, 0.18, 7000, 2500, 0.12); } else { nz(T0, 0.3, 1400, 300, 0.14); tone(T0, 'sine', 180, 90, 0.25, 0.06); } } }
    else if (P_.kind === 'bleed') { f.bleed = { t: P_.dur, dps: P_.dps, acc: 0 }; floatText(fx + 12, top - 18, '출혈', { color: '#ff5a5a', size: 11 }); }
    else if (P_.kind === 'hitdown') { f.hitDn = P_.dur; f.hitDnV = P_.v; floatText(fx + 12, top - 18, '명중 -' + P_.v, { color: '#c9a0ff', size: 11 }); } } }

// 희귀도 색 (바닥 드랍·아이템 정보)
const RARITY_C = { 일반: '#f2f2f2', 고급: '#5fd35f', 희귀: '#62c8ff', 영웅: '#c77dff' };   // 일반 흰색 · 고급 초록 · 희귀 하늘 · 영웅 보라
// 모든 아이템에 희귀도 (정해 둔 것 + 종류별 기본값, 나머지는 일반)
(() => { const R = { long_sword: '고급', leather_helm: '고급', leather_armor: '고급', leather_boots: '고급', leather_gloves: '고급', silver_ring: '고급', amulet: '고급', scroll_weapon: '고급', scroll_armor: '고급', cscroll_weapon: '고급', cscroll_armor: '고급',
    plate_helm: '희귀', plate_armor: '희귀', plate_gloves: '희귀', plate_boots: '희귀', scale_armor: '희귀', scimitar: '희귀', scroll_earth: '희귀', bscroll_weapon: '희귀', bscroll_armor: '희귀',
    gold_wing: '영웅', silver_wing: '영웅', bless_scroll: '영웅', book_tornado: '영웅', book_eruption: '영웅', book_immune: '영웅', book_healall: '영웅' };
  for (const [id, d] of Object.entries(ITEMS)) { if (d.codex) continue; if (R[id]) { d.rar = R[id]; continue; } if (d.use === 'learn') { const k = SK[d.learn]; d.rar = k.kind === 'magic' ? (k.circle >= 3 ? '희귀' : '일반') : k.shop === '몬스터 드랍' ? '희귀' : '고급'; continue; } if (d.rar) continue; d.rar = '일반'; } })();   // v107: 아이템에 직접 적어 둔 등급(데스나이트 세트·설원 장비 등)은 그대로
const rarC = id => RARITY_C[(ITEMS[id] && ITEMS[id].rar) || '일반'];
const lowRar = id => { const r = (ITEMS[id] && ITEMS[id].rar) || '일반'; return r === '일반' || r === '고급'; };   // 일반·고급은 떨어질 때 메시지 없이 (주울 때만)
const rarTag = id => { const r = ITEMS[id] && ITEMS[id].rar; return r && r !== '일반' ? '[' + r + '] ' : ''; };
const ATTR_N = { earth: '땅', water: '물', fire: '불', wind: '바람' }, ATTR_OPP = { fire: 'water', water: 'fire', earth: 'wind', wind: 'earth' }, ATTR_C = { earth: '#d0a060', water: '#6ab8ff', fire: '#ff7a4a', wind: '#8ae0a8' }, ATTR_DMG = [0, 1, 3, 5], ARMOR_SLOTS = new Set(['helm', 'armor', 'shield', 'cloak', 'shirt', 'gloves', 'boots']);
const nameHTML = e => String(nameOf(e)).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]).replace('축복받은', '<span class="bl">축복받은</span>');
const GOD_SCROLLS = ['scroll_weapon', 'scroll_armor', 'bscroll_weapon', 'bscroll_armor', 'cscroll_weapon', 'cscroll_armor', 'scroll_earth', 'scroll_water', 'scroll_fire', 'scroll_wind', 'bless_scroll'];
// 몬스터 속성 — 무기 속성이 몬스터 속성의 반대(불⇄물, 땅⇄바람)면 속성 추가 피해 2배, 같은 속성이면 0 · 속성 몬스터의 공격은 그 속성 저항으로 줄어듦
const MOB_EL = { fox: 'wind', goblin: 'earth', hobgoblin: 'earth', orc: 'earth', orc_warrior: 'earth', orc_archer: 'wind', dwarf: 'earth', werewolf: 'wind', lizardman: 'water', giant_ant: 'earth', scorpion: 'earth', basilisk: 'water', fire_ant: 'fire', queen_ant: 'earth',
  roba_orc: 'water', dudamara_orc: 'fire', orc_wizard: 'fire', dark_elf: 'wind', atuba_orc: 'wind', gast: 'water', ogre: 'earth', skeleton_archer: 'wind', zombie: 'water', bugbear: 'earth', cerberus: 'fire', king_bugbear: 'earth', baphomet: 'fire', shelob: 'water' };
for (const k in MOB_EL) if (MOB[k]) MOB[k].el = MOB_EL[k];
const attrMult = (el, f) => { const me = f && MOB[f.kind] && MOB[f.kind].el; return !me ? 1 : ATTR_OPP[me] === el ? 2 : me === el ? 0 : 1; };
const RES_K = { fire: 'fireRes', water: 'waterRes', wind: 'windRes', earth: 'earthRes' };
const elemRes = el => (INV.cx(RES_K[el]) || 0) + (BUFF.relem > 0 ? 10 : 0), mrTotal = () => INV.cx('mr') + (BUFF.rmagic > 0 ? 10 : 0);   // 갓 모드: 강화 테스트용 무한 주문서
const GOD_INF = id => GOD && (id === 'tele_scroll' || id === 'return_scroll' || GOD_SCROLLS.includes(id));   // 갓 모드: 순간이동·귀환·강화 주문서 무한
// v107 강화 개편: 같은 등급이면 부위와 상관없이 안전 강화가 같음 · 높은 등급일수록 강화 1당 오르는 수치가 큼 (내림)
const RAR_OF = d => (d && d.rar) || '일반';
const SAFE_BY_RAR = { 일반: 6, 고급: 5, 희귀: 4, 영웅: 3 };
const SAFE_EN = d => SAFE_BY_RAR[RAR_OF(d)] ?? 6;
const EN_MUL = { weapon: { 일반: 1, 고급: 1.5, 희귀: 2, 영웅: 3 }, armor: { 일반: 1, 고급: 1.25, 희귀: 1.5, 영웅: 2 } };
const enMul = d => (d.slot === 'weapon' ? EN_MUL.weapon : EN_MUL.armor)[RAR_OF(d)] || 1;
const enBonus = (d, en) => en ? Math.sign(en) * Math.floor(Math.abs(en) * enMul(d) + 1e-9) : 0;   // 강화 수치 → 실제 공격(무기)·방어(방어구) 상승
const nameOf = e => { const d = ITEMS[e.id]; if (e.pet) return `펫 목걸이(Lv.${e.pet.lv} ${e.pet.name})`; return (e.en ? (e.en > 0 ? '+' : '') + e.en + ' ' : '') + (e.blessed ? '축복받은 ' : '') + d.name + (e.attr ? ` (${ATTR_N[e.attr.el]} ${e.attr.lv}단)` : ''); };
const SHOP2ITEM = { ...Object.fromEntries(Object.entries(SK).map(([k, v]) => [v.book, 'book_' + k])), '빨간 물약': 'red_potion', '주홍 물약': 'orange_potion', '맑은 물약': 'clear_potion', '귀환 주문서': 'return_scroll', '순간이동 주문서': 'tele_scroll',
  '장검': 'long_sword', '한손검': 'short_sword', '능력치 초기화 주문서': 'stat_reset', '초록 물약': 'green_potion', '용기의 물약': 'brave_potion', '나무 방패': 'wood_shield', '가죽 갑옷': 'leather_armor', '가죽 장화': 'leather_boots', '마나 회복 물약': 'mana_potion', '펫 목걸이(Lv.1 도베르만)': 'pet_collar', '판금 투구': 'plate_helm', '판금 갑옷': 'plate_armor', '판금 장갑': 'plate_gloves', '판금 장화': 'plate_boots', '부활 주문서': 'revive_scroll' };
for (const id of CX_LIST) if (!SHOP2ITEM[ITEMS[id].name]) SHOP2ITEM[ITEMS[id].name] = id;
SHOP2ITEM['아르카의 마법주머니'] = 'arka_pouch';
// 아르카의 마법주머니 뽑기표 [아이템, 확률(%), 수량 후보] — 갑옷 마법 주문서 28%(1장 70%·2장 30%) · 무기 마법 주문서 23%(1장 75%·2장 25%) · 축복 부여 9% · 축복받은 갑옷 4% · 축복받은 무기 3%
//   + 희귀 장비 Lv20 19% · Lv24 11% · 영웅 장비 Lv30 2.4% · Lv35 0.6% (전 직업, 같은 등급 안에서는 가치가 높을수록 드묾: 가치^-0.5 비례)
const POUCH = (() => { const T = [['scroll_armor', 28, [1, 1, 1, 1, 1, 1, 1, 2, 2, 2]], ['scroll_weapon', 23, [1, 1, 1, 2]], ['bless_scroll', 9], ['bscroll_armor', 4], ['bscroll_weapon', 3]];
  const tier = (rar, lv, tot) => { const L = CX_LIST.filter(id => ITEMS[id].rar === rar && ITEMS[id].lv === lv), W = L.map(id => Math.pow(Math.max(100, ITEMS[id].price || 1000), -0.5)), S = W.reduce((a, b) => a + b, 0); L.forEach((id, k) => T.push([id, tot * W[k] / S])); };
  tier('희귀', 20, 19); tier('희귀', 24, 11); tier('영웅', 30, 2.4); tier('영웅', 35, 0.6);
  const tot = T.reduce((a, r) => a + r[1], 0);
  return { table: T, roll() { let x = Math.random() * tot; const r = T.find(q => (x -= q[1]) < 0) || T[T.length - 1]; return [r[0], r[2] ? r[2][Math.floor(Math.random() * r[2].length)] : 1]; } }; })();
const INV = (() => {
  let bagDrag = false;     // 가방 칸을 끄는 동안은 다시 그리지 않음
  const bag = [];          // {id, n, on}
  const eq = {};           // slot → bag entry
  const BASE = { str: 16, dex: 12, con: 14, int: 8, wis: 9, cha: 12 };   // 기사 시작 능력치 (직업별 고정)
  const BONUS = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };     // 5레벨마다 1개씩 받는 보너스로 찍은 값
  function eqSt(k) { if (!(k in BASE)) return 0; let n = 0; for (const e of Object.values(eq)) { const d = ITEMS[e.id]; n += (d[k] || 0) + (d.all || 0); } return n; }   // 장비 능력치 (힘·민첩·지능·지혜 + 모든 능력치)
  const STAT = new Proxy({}, { get: (_, k) => (BASE[k] || 0) + (BONUS[k] || 0) + eqSt(k), ownKeys: () => Object.keys(BASE), getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }) });
  const NAMES_ST = { str: '힘', dex: '민첩', con: '체력', int: '지능', wis: '지혜', cha: '카리스마' };
  function addStat(k) { if (hero.bonusPts <= 0 || !(k in BASE)) return; BONUS[k]++; hero.bonusPts--; say(`${NAMES_ST[k]}이(가) 1 올랐습니다. (${STAT[k]})`, '#f2e6a8'); render(); }
  function resetStats() { const n = Object.values(BONUS).reduce((a, b) => a + b, 0); if (!n) { say('되돌릴 보너스 능력치가 없습니다.', '#9c9682'); return false; }
    for (const k in BONUS) BONUS[k] = 0; hero.bonusPts += n; say(`보너스 능력치 ${n}개를 되돌렸습니다. 다시 찍을 수 있습니다.`, '#f2e6a8'); render(); return true; }
  function add(id, n = 1, silent) { const d = ITEMS[id]; if (!d) return;
    const e = d.stack ? bag.find(x => x.id === id) : null; if (e) e.n += n; else for (let k = 0; k < (d.stack ? 1 : n); k++) bag.push({ id, n: d.stack ? n : 1, on: false, ...(d.petKind ? { pet: mkPetData(d.petKind) } : {}) });
    if (!silent) say(`${rarTag(id)}${d.name}${n > 1 ? ' (' + n + ')' : ''}을(를) 얻었습니다.`, rarC(id)); render(); }
  const count = id => bag.filter(x => x.id === id).reduce((s, x) => s + x.n, 0);
  function take(id, n = 1) { if (GOD_INF(id)) return true; const e = bag.find(x => x.id === id); if (!e || e.n < n) return false; e.n -= n; if (e.n <= 0) bag.splice(bag.indexOf(e), 1); render(); return true; }
  function slotFor(d) { if (d.slot !== 'ring') return d.slot; return !eq.ring1 ? 'ring1' : !eq.ring2 ? 'ring2' : 'ring1'; }
  function equip(e) { const d = ITEMS[e.id];
    if (d.codex && !GOD) { const R = cxReq(d);   // 착용 제한: 직업 · 레벨 (갓 모드는 무시)
      if (!R.okC) { say(`${d.name}: ${cxClsName(d)} 전용 장비라 ${CLASS_NAME[CLASS]}는 착용할 수 없습니다.`, '#ff5a4a'); return; }
      if (!R.okL) { say(`${d.name}: Lv.${d.lv} 이상부터 착용할 수 있습니다. (현재 Lv.${hero.lv})`, '#ff5a4a'); return; } }
    if (d.only && d.only !== CLASS && !GOD) { say(`${d.name}: ${CLASS_NAME[d.only]} 전용 장비라 ${CLASS_NAME[CLASS]}는 착용할 수 없습니다.`, '#ff5a4a'); return; }
    const s = slotFor(d);
    if (eq[s]) unequip(eq[s], true); eq[s] = e; e.on = s; say(`${nameOf(e)}을(를) 착용했습니다.`, '#e8d8a8'); render(); }
  function unequip(e, quiet) { if (!e.on) return; delete eq[e.on]; e.on = false; if (!quiet) say(`${nameOf(e)}을(를) 벗었습니다.`, '#9c9682'); render(); }
  let cd = 0;
  const AUTO = { hp: { on: true, id: 'red_potion', pct: 50, warn: 0 }, mp: { on: false, id: 'mana_potion', pct: 30, warn: 0 } };
  const potOK = (k, id) => ITEMS[id] && ITEMS[id].use === (k === 'hp' ? 'heal' : 'mana');
  // 버프 아이템(자동 사용 가능): 가속 물약 + 앞으로 buff 키가 있는 아이템이면 자동으로 포함
  const buffKeyOf = d => d.use === 'haste' ? 'haste' + d.haste : d.buff || null;
  const AUTOBUFF = Object.fromEntries(Object.keys(ITEMS).filter(id => !ITEMS[id].slot && buffKeyOf(ITEMS[id])).map(id => [id, false]));
  function setAutoBuff(id, on) { if (!(id in AUTOBUFF)) return; AUTOBUFF[id] = !!on; say(`자동 사용: ${ITEMS[id].name} ${on ? '켬' : '끔'}`, '#9fd0e8'); const el = document.getElementById('au-' + id); if (el) el.checked = !!on; if (dwE && dwE.id === id && !$('itemwin').hidden) showDetail(dwE); }
  function buffAuto() { if (SCENE === 'town' || hero.hp <= 0 || cd > 0) return;
    for (const id in AUTOBUFF) { if (!AUTOBUFF[id]) continue; const d = ITEMS[id], k = buffKeyOf(d); if (!k || BUFF[k] > 0) continue; const e = bag.find(x => x.id === id); if (e) { use(e); return; } } }
  function autoTick(dt) { buffAuto(); skAuto(dt); for (const k of ['hp', 'mp']) { const A = AUTO[k]; A.warn = Math.max(0, A.warn - dt); if (!A.on || !A.id || hero.hp <= 0) continue;
      const cur = k === 'hp' ? hero.hp / hero.max : hero.mp / Math.max(1, hero.maxmp); if (cur * 100 > A.pct || cd > 0) continue; { const bk = ITEMS[A.id] && ITEMS[A.id].buff; if (bk && BUFF[bk] > 0) continue; }   // 버프식 물약(마나 회복)은 효과가 남아 있으면 안 마심
      const e = bag.find(x => x.id === A.id); if (!e) { if (!A.warn) { say(`자동 물약: ${ITEMS[A.id].name}이(가) 없습니다.`, '#f08a7a'); A.warn = 15; } continue; }
      use(e); } }
  function autoUI() { const w = document.getElementById('autowin'); if (!w || w.hidden) return;
    for (const k of ['hp', 'mp']) { const A = AUTO[k], sel = document.getElementById('au-' + k + '-id');
      const opts = Object.keys(ITEMS).filter(id => potOK(k, id)); sel.innerHTML = opts.map(id => `<option value="${id}"${id === A.id ? ' selected' : ''}>${ITEMS[id].name} (${count(id)}개)</option>`).join('');
      document.getElementById('au-' + k + '-on').checked = A.on; document.getElementById('au-' + k + '-pct').value = A.pct; document.getElementById('au-' + k + '-v').textContent = A.pct + '%'; } }
  function openAuto() { const w = document.getElementById('autowin'); w.hidden = false; autoUI();
    for (const id in AUTOBUFF) { const el = document.getElementById('au-' + id); if (el) { el.checked = AUTOBUFF[id]; el.onchange = ev => setAutoBuff(id, ev.target.checked); const c = document.getElementById('au-' + id + '-n'); if (c) c.textContent = count(id) + '개'; } }
    for (const k of ['hp', 'mp']) { const A = AUTO[k];
      document.getElementById('au-' + k + '-on').onchange = ev => { A.on = ev.target.checked; };
      document.getElementById('au-' + k + '-id').onchange = ev => { A.id = ev.target.value; };
      document.getElementById('au-' + k + '-pct').oninput = ev => { A.pct = +ev.target.value; document.getElementById('au-' + k + '-v').textContent = A.pct + '%'; }; } }
  function setAuto(k, id) { if (!potOK(k, id)) { say(k === 'hp' ? 'HP 칸에는 체력 물약만 넣을 수 있습니다.' : 'MP 칸에는 마나 물약만 넣을 수 있습니다.', '#f08a7a'); return; }
    AUTO[k].id = id; AUTO[k].on = true; say(`자동 물약(${k.toUpperCase()})에 ${ITEMS[id].name}을(를) 넣었습니다.`, '#e8d8a8'); autoUI(); }
  function useInvis(e) { const d = ITEMS[e.id]; if (!d || !d.invis) return; if (!e.on) { say(`${d.name}: 착용해야 쓸 수 있습니다.`, '#9c9682'); return; }
    const left = (e.invisAt || 0) - time; if (left > 0) { say(`${d.name}: ${Math.floor(left / 60)}분 ${Math.ceil(left % 60)}초 뒤에 다시 쓸 수 있습니다.`, '#9c9682'); return; }
    BUFF.invis = d.invis.dur; e.invisAt = time + d.invis.cd; for (const f of foxes) if (f.aggro && !f.tgt) f.aggro = false; if (hero.target) hero.target = null;
    say(`${JOSA(d.name, '을', '를')} 둘렀습니다. ${d.invis.dur}초 동안 몬스터가 나를 보지 못합니다. (공격하면 풀림 · 재사용 ${d.invis.cd / 60}분)`, '#bfe0ff'); spellFx('enbless', hero);
    if (AC && SFX_ON) { const T0 = AC.currentTime; nz(T0, 0.6, 3000, 800, 0.12); tone(T0, 'sine', 880, 1760, 0.5, 0.05); } render(); }
  function use(e) { const d = ITEMS[e.id]; if (d && !d.slot) TELE.use(e.id);
    if (d.slot) { e.on ? unequip(e) : equip(e); return; }
    if (cd > 0) return;
    if (d.use === 'heal') { if (hero.hp >= hero.max) { say('체력이 가득 차 있습니다.', '#9c9682'); return; } const h = Math.max(1, Math.min(Math.ceil(hero.max - hero.hp), rint(d.heal))); hero.hp = Math.min(hero.max, hero.hp + h); take(e.id); cd = 0.5; if (AC) tone(AC.currentTime, 'sine', 520, 880, 0.18, 0.12); return; }
    if (d.use === 'antidote') { if (!(BUFF.poison > 0)) { say('독에 걸려 있지 않습니다.', '#9c9682'); return; } take(e.id); cd = 0.5; BUFF.poison = 0; mxSelf('cure', hero); say('해독제를 마셨습니다. 독이 나았습니다.', '#9ae06a'); return; }
    if (d.use === 'candle') { take(e.id); cd = 0.5; BUFF.light = BUFF_DEF.light.dur; spellFx('light', hero, '#fff2a0'); say('양초를 켰습니다. 10분 동안 밤 시야가 넓어져요.', '#fff2a0'); return; }
    if (d.use === 'mana') { take(e.id); cd = 0.5; BUFF.mana = BUFF_DEF.mana.dur; spellFx('enok', hero, '#8ab8ff'); if (AC) tone(AC.currentTime, 'sine', 440, 760, 0.2, 0.1); return; }
    if (d.use === 'haste') { const k = 'haste' + d.haste; take(e.id); BUFF[k] = d.dur; if (AC) tone(AC.currentTime, 'triangle', 440, 990, 0.25, 0.1); return; }
    if (d.use === 'enchant' || d.use === 'attr' || d.use === 'blessit') { const ok = bag.some(x => canScroll(d, ITEMS[x.id]));
      if (!ok) { say(d.use === 'attr' ? '속성을 부여할 무기가 없습니다.' : d.ench === 'weapon' ? '강화할 무기가 없습니다.' : '강화할 방어구가 없습니다.', '#9c9682'); return; }
      tgtScroll = e.id; if ($('invwin').hidden) { $('invwin').hidden = false; render(); } $('invwin').classList.add('targeting'); document.body.classList.add('cursor-hammer'); say(`${d.name}: 강화할 장비를 클릭하세요. (취소: Esc · 오른쪽 클릭)`, '#f2e6a8'); return; }
    if (d.use === 'pouch') { const [id, n] = POUCH.roll(), it = ITEMS[id], nm = it.name + (n > 1 ? ` ${n}장` : ''); take(e.id); cd = 0.6; add(id, n, true); TELE.ev('pouch', { id, n, r: it.rar || '' });
      say(`아르카의 마법주머니를 열었습니다... ${rarTag(id)}${JOSA(nm, '이', '가')} 나왔습니다!`, rarC(id));
      if (it.rar === '영웅') { spellFx('enbless', hero, RARITY_C['영웅']); announce(`${PNAME()}님이 아르카의 마법주머니에서 [영웅] ${JOSA(it.name, '을', '를')} 얻었습니다!`, RARITY_C['영웅']); NET.announceAll(`${PNAME()}님이 아르카의 마법주머니에서 [영웅] ${JOSA(it.name, '을', '를')} 얻었습니다!`); }
      else if (it.rar === '희귀' && it.slot) spellFx('enbless', hero, RARITY_C['희귀']); else spellFx('enok', hero, '#e8d8ff');
      if (AC && SFX_ON) { const t0 = AC.currentTime; nz(t0, 0.18, 2600, 900, 0.12); tone(t0 + 0.08, 'triangle', 660, 1320, 0.25, 0.1); if (it.rar === '영웅') [784, 988, 1175, 1568].forEach((f, k) => tone(t0 + 0.2 + k * 0.09, 'triangle', f, f, 0.35, 0.12)); }
      return; }
    if (d.use === 'pet') { PET.openWin(e); return; }
    if (d.use === 'revive') { PET.useRevive(); return; }
    if (d.use === 'learn') { if (learnSkill(d.learn)) take(e.id); return; }
    if (d.use === 'statreset') { if (resetStats()) take(e.id); return; }
    if (d.use === 'home') { take(e.id); say('귀환 주문서를 읽었습니다.', '#e8d8a8'); TOWN.goTown(); return; }
    if (d.use === 'tele') { if (SCENE === 'town') { say('마을에서는 쓸 수 없습니다.', '#9c9682'); return; } const p = freeTile(4); take(e.id); hero.i = hero.fi = p[0]; hero.j = hero.fj = p[1]; hero.x = p[0] + .5; hero.z = p[1] + .5; hero.t = 1; hero.target = null; moveGoal = null; say('순간이동 했습니다.', '#e8d8a8'); return; }
    say(`${d.name}은(는) 지금 쓸 수 없습니다.`, '#9c9682'); }
  // ===== 강화 (리니지식): 안전 강화 = 등급별 (일반 +6 · 고급 +5 · 희귀 +4 · 영웅 +3), 넘기면 1/3 확률로 성공·실패 시 증발. 속성(땅)은 무기 1~3단
  let tgtScroll = null;
  const canScroll = (sd, td) => sd.use === 'blessit' ? td.slot === 'weapon' || ARMOR_SLOTS.has(td.slot) : sd.use === 'attr' ? td.slot === 'weapon' : sd.ench === 'weapon' ? td.slot === 'weapon' : ARMOR_SLOTS.has(td.slot);
  function cancelTarget(quiet) { if (!tgtScroll) return; tgtScroll = null; $('invwin').classList.remove('targeting'); document.body.classList.remove('cursor-hammer'); if (!quiet) say('강화를 취소했습니다.', '#9c9682'); }
  function enFx(color, txt) { const [hx, hy] = W2P(hero.x, hero.z); floatText(hx, hy - 90, txt, { color, size: 14, big: true, life: 1.3, rise: 30 }); }
  // 강화 결과 연출: 인벤 칸(또는 상세창 아이콘) 위에 CSS 효과 + 캐릭터 위 이펙트 + 효과음
  function slotFx(t, kind) { const k = bag.indexOf(t), grid = $('inv-grid'), cells = []; if (k >= 0 && grid && !$('invwin').hidden && grid.children[k]) cells.push(grid.children[k]);
    if (t.on && !$('charwin').hidden) { const el = $('eq-' + t.on); if (el) cells.push(el); } if (dwE === t && !$('itemwin').hidden) { const ic = $('itemwin').querySelector('.iw-ic'); if (ic) cells.push(ic); }
    for (const c of cells) { const r = c.getBoundingClientRect(), o = document.createElement('div'); o.className = 'slotfx fx-' + kind; Object.assign(o.style, { left: r.left - 8 + 'px', top: r.top - 8 + 'px', width: r.width + 16 + 'px', height: r.height + 16 + 'px' }); document.body.appendChild(o); setTimeout(() => o.remove(), 1400); } }
  function enchantFx(t, kind, text) { TELE.ev('ench', { kind, tx: String(text || '').slice(0, 40), id: t && t.id || '' }); slotFx(t, kind); bigFx(kind, text || ''); enchSfx(kind); NET.fx(kind, text, nameOf(t)); spellFx({ ok: 'enok', bless: 'enbless', earth: 'earth', fail: 'puff', boom: 'boom', curse: 'puff' }[kind], hero);
    if (kind === 'curse' && AC && SFX_ON) { const T1 = AC.currentTime; tone(T1, 'sawtooth', 300, 150, 0.4, 0.06); tone(T1 + 0.05, 'sine', 220, 110, 0.5, 0.08); return; } if (!AC || !SFX_ON) return; const T0 = AC.currentTime;
    if (kind === 'ok') { tone(T0, 'triangle', 1047, 1060, 0.5, 0.09); tone(T0 + 0.06, 'sine', 1568, 1580, 0.6, 0.06); nz(T0, 0.25, 6000, 9000, 0.05); }
    else if (kind === 'bless') { [1047, 1319, 1568, 2093].forEach((f, n) => tone(T0 + n * 0.07, 'triangle', f, f, 0.5, 0.08)); tone(T0 + 0.35, 'sine', 2093, 2100, 0.8, 0.06); nz(T0, 0.5, 6000, 9000, 0.06); }
    else if (kind === 'earth') { tone(T0, 'sine', 110, 70, 0.7, 0.3); nz(T0, 0.6, 400, 150, 0.3); tone(T0 + 0.15, 'triangle', 392, 523, 0.5, 0.07); }
    else if (kind === 'fail') { nz(T0, 0.25, 500, 200, 0.22); tone(T0, 'sine', 220, 150, 0.25, 0.05); }
    else { tone(T0, 'sawtooth', 1800, 400, 0.12, 0.08); nz(T0, 0.07, 7000, 3000, 0.4); nz(T0 + 0.05, 0.6, 2500, 300, 0.3); tone(T0 + 0.05, 'sawtooth', 200, 50, 0.6, 0.12); } }
  // ===== 장비 일괄 강화: 창을 연 채 인벤토리 장비를 클릭해 넣고 빼기 · 같은 장비 모두 넣기 · 목표 수치까지 / 안전 강화까지 =====
  const BK = { list: [], busy: false, stop: false };
  const bkOK = e => !!(e && ITEMS[e.id] && (ITEMS[e.id].slot === 'weapon' || ARMOR_SLOTS.has(ITEMS[e.id].slot)));
  const bkScroll = (td, bless) => { const w = td.slot === 'weapon', n = w ? 'scroll_weapon' : 'scroll_armor', b = w ? 'bscroll_weapon' : 'bscroll_armor'; return bless && count(b) ? b : count(n) ? n : count(b) ? b : null; };
  function enchOnce(t, sid) { const sd = ITEMS[sid], td = ITEMS[t.id], safe = SAFE_EN(td), cur = t.en || 0; if (!take(sid)) return 'none'; const before = nameOf(t);
    if (cur >= safe && Math.random() >= 1 / 3) { if (t.on) unequip(t, true); const k = bag.indexOf(t); if (k >= 0) bag.splice(k, 1); say(`${JOSA(before, '이', '가')} 강렬하게 빛나더니 증발되어 사라집니다.`, '#ff6a5a'); return 'boom'; }
    const add = sd.bless && cur < 7 ? 1 + Math.floor(Math.random() * 2) : 1; t.en = cur + add;
    if (t.en >= (td.slot === 'weapon' ? 8 : 7)) announce(`${PNAME()}님이 ${JOSA('+' + t.en + ' ' + td.name, '을', '를')} 만들어 냈습니다!`, t.en >= 9 ? '#ff9a3a' : '#9fe0ff');
    return add; }
  function bkRender() { const w = $('bulkwin'); if (!w || w.hidden) return; BK.list = BK.list.filter(e => bag.includes(e));
    $('bk-list').innerHTML = BK.list.length ? BK.list.map((e, k) => { const d = ITEMS[e.id], sf = SAFE_EN(d); return `<button type="button" class="bk-it" data-k="${k}" title="클릭: 빼기"${BK.busy ? ' disabled' : ''}><span class="ic">${ICON(d.icon, e.blessed)}</span><b style="color:${rarC(e.id)}">${nameHTML(e)}</b><small>안전 강화 +${sf}${(e.en || 0) >= sf ? ' · <em>안전 넘음</em>' : ''}${e.on ? ' · 착용 중' : ''}</small></button>`; }).join('') : '<p class="bk-empty">인벤토리에서 무기·방어구를 클릭하면 여기에 들어옵니다.<br>다시 클릭하면 빠집니다.</p>';
    const c = id => GOD_INF(id) ? '∞' : count(id);
    $('bk-scrolls').textContent = `무기 주문서 ${c('scroll_weapon')} · 축복 ${c('bscroll_weapon')}   |   갑옷 주문서 ${c('scroll_armor')} · 축복 ${c('bscroll_armor')}`;
    $('bk-go').textContent = BK.busy ? '중지' : '목표까지 강화'; ['bk-safe', 'bk-same', 'bk-clear'].forEach(id => $(id).disabled = BK.busy); }
  function bulkToggle(e) { if (BK.busy) return; if (e.locked) { say(`${nameOf(e)}: 잠긴 아이템은 일괄 강화에 넣을 수 없습니다.`, '#f08a7a'); return; } if (!bkOK(e)) { say('일괄 강화에는 무기와 방어구만 넣을 수 있습니다.', '#f08a7a'); return; }
    const k = BK.list.indexOf(e); if (k >= 0) BK.list.splice(k, 1); else BK.list.push(e); render(); bkRender(); }
  function bulkSame() { const base = BK.list[BK.list.length - 1]; if (!base) { say('먼저 장비를 하나 넣어 주세요.', '#f08a7a'); return; } let n = 0;
    for (const e of bag) if (e.id === base.id && !BK.list.includes(e)) { BK.list.push(e); n++; } say(n ? `${ITEMS[base.id].name} ${n}개를 더 넣었습니다.` : `더 넣을 ${ITEMS[base.id].name}이(가) 없습니다.`, '#e8d8a8'); render(); bkRender(); }
  function bulkRun(mode) { if (BK.busy) { BK.stop = true; return; } BK.list = BK.list.filter(e => bag.includes(e)); if (!BK.list.length) { say('일괄 강화할 장비를 먼저 넣어 주세요.', '#f08a7a'); return; }
    const tgt = Math.max(1, Math.min(15, Math.floor(+$('bk-target').value || 0))); $('bk-target').value = tgt;
    const goalOf = e => mode === 'safe' ? SAFE_EN(ITEMS[e.id]) : tgt, todo = BK.list.filter(e => !e.locked && (e.en || 0) < goalOf(e));
    if (!todo.length) { say(mode === 'safe' ? '모두 이미 안전 강화 수치 이상입니다.' : `모두 이미 +${tgt} 이상입니다.`, '#9c9682'); return; }
    const start = () => { BK.busy = true; BK.stop = false; const q = todo.slice(); let ok = 0, boom = 0, used = 0; const ol = $('bk-log');
      const log = t => { const li = document.createElement('li'); li.innerHTML = t; ol.prepend(li); while (ol.children.length > 60) ol.lastChild.remove(); };
      log(`— ${mode === 'safe' ? '안전 강화까지' : '+' + tgt + '까지'} 시작 (${q.length}개) —`);
      const finish = why => { BK.busy = false; if (why) log(why); log(`— 끝: 성공 ${ok}회 · 파괴 ${boom}개 · 주문서 ${used}장 —`); say(`일괄 강화 끝: 성공 ${ok}회 · 파괴 ${boom}개 · 주문서 ${used}장`, '#cfe4a8'); render(); bkRender(); };
      const tick = () => { if (BK.stop) return finish('<span class="no">중지했습니다.</span>'); if (!q.length) return finish();
        const e = q[0], d = ITEMS[e.id]; if (!bag.includes(e) || (e.en || 0) >= goalOf(e)) { if (bag.includes(e)) log(`<b style="color:${rarC(e.id)}">${nameHTML(e)}</b> 목표 도달 ✔`); q.shift(); return setTimeout(tick, 60); }
        const sid = bkScroll(d, $('bk-bless').checked); if (!sid) return finish(`<span class="no">${d.slot === 'weapon' ? '무기' : '갑옷'} 마법 주문서가 없어 멈췄습니다.</span>`);
        const before = nameHTML(e), bn = nameOf(e), r = enchOnce(e, sid); if (r === 'none') return finish('<span class="no">주문서를 쓸 수 없어 멈췄습니다.</span>'); used++;
        if (r === 'boom') { boom++; log(`<span class="no">${before} — 증발해 사라졌습니다</span>`); enchSfx('boom'); q.shift(); enFx('#ff6a5a', '파괴!'); NET.fx('boom', '증발…', bn); }
        else { ok++; log(`${before} → <b style="color:${rarC(e.id)}">${nameHTML(e)}</b>${r > 1 ? ' <small>(축복 +' + r + ')</small>' : ''}`); enchSfx(r > 1 ? 'bless' : 'ok'); NET.fx(r > 1 ? 'bless' : 'ok', `+${e.en} 강화 성공!`, nameOf(e)); }
        render(); bkRender(); setTimeout(tick, 170); };
      bkRender(); tick(); };
    const risky = todo.filter(e => goalOf(e) > SAFE_EN(ITEMS[e.id]));
    if (mode !== 'safe' && risky.length) askYesNo(`+${tgt}까지 일괄 강화할까요?`, `안전 강화를 넘어서는 장비가 ${risky.length}개 있습니다. 안전 강화 수치를 넘긴 뒤 실패하면 장비가 파괴(증발)됩니다.`, start); else start(); }
  function bulkOpen() { const w = $('bulkwin'); if (!w) return; if (!w.hidden) { bulkClose(); return; } w.hidden = false; if ($('invwin').hidden) toggle('invwin'); bkRender(); render(); say('장비 일괄 강화: 인벤토리에서 장비를 클릭해 넣고 빼세요.', '#9fd0e8'); }
  function bulkClose() { const w = $('bulkwin'); if (w) w.hidden = true; if (BK.busy) BK.stop = true; render(); }
  { const w = document.getElementById('bulkwin'); if (w) new MutationObserver(() => render()).observe(w, { attributes: true, attributeFilter: ['hidden'] }); }
  { const $b = id => document.getElementById(id);
    if ($b('bulkwin')) { $b('bk-list').onclick = ev => { const b = ev.target.closest('button[data-k]'); if (b && !BK.busy) { BK.list.splice(+b.dataset.k, 1); render(); bkRender(); } };
      $b('bk-same').onclick = bulkSame; $b('bk-clear').onclick = () => { if (BK.busy) return; BK.list.length = 0; render(); bkRender(); };
      $b('bk-m').onclick = () => { $b('bk-target').value = Math.max(1, (+$b('bk-target').value || 1) - 1); }; $b('bk-p').onclick = () => { $b('bk-target').value = Math.min(15, (+$b('bk-target').value || 0) + 1); };
      $b('bk-target').onkeydown = ev => ev.stopPropagation(); $b('bk-safe').onclick = () => bulkRun('safe'); $b('bk-go').onclick = () => bulkRun('goal'); } }
  function applyScroll(t) { const sid = tgtScroll, sd = ITEMS[sid], td = ITEMS[t.id];
    if (!sd || !count(sid)) { cancelTarget(true); return; }
    if (t.locked) { say(`${nameOf(t)}: 잠긴 아이템이라 주문서를 쓸 수 없습니다. (상세 정보에서 잠금 해제)`, '#f08a7a'); cancelTarget(true); return; }
    if (!canScroll(sd, td)) { say((sd.use === 'attr' ? '속성 강화 주문서는 무기에만 쓸 수 있습니다.' : sd.ench === 'weapon' ? '무기 마법 주문서는 무기에만 쓸 수 있습니다.' : '갑옷 마법 주문서는 투구·갑옷·방패·망토·티셔츠·장갑·부츠에만 쓸 수 있습니다.') + ' 강화를 취소했습니다.', '#f08a7a'); cancelTarget(true); return; }
    if (sd.use === 'attr') { const lv = t.attr && t.attr.el === sd.el ? t.attr.lv : 0;
      if (lv >= 3) { say(`${nameOf(t)}: 이미 최고 단계(3단) 속성입니다.`, '#9c9682'); return; }
      if (t.attr && t.attr.el !== sd.el && !t._attrOk) { askYesNo(`${ATTR_N[sd.el]} 속성으로 바꾸시겠습니까?`, `지금 붙은 ${ATTR_N[t.attr.el]} ${t.attr.lv}단은 성공하면 사라지고 ${ATTR_N[sd.el]} 1단이 됩니다. (실패하면 그대로)`, () => { if (!bag.includes(t) || !bag.some(x => x.id === sid)) return; tgtScroll = sid; t._attrOk = 1; try { applyScroll(t); } finally { delete t._attrOk; } }); cancelTarget(true); return; }
      cancelTarget(true); take(sid);
      if (Math.random() < [0.8, 0.45, 0.2][lv]) { t.attr = { el: sd.el, lv: lv + 1 }; say(`${ITEMS[t.id].name}에 ${ATTR_N[sd.el]}의 기운이 깃듭니다! → ${nameOf(t)} · 추가 피해 +${ATTR_DMG[lv + 1]} (${ATTR_N[ATTR_OPP[sd.el]]} 몬스터 2배)`, ATTR_C[sd.el]); enFx(ATTR_C[sd.el], `${ATTR_N[sd.el]} ${lv + 1}단`); render(); enchantFx(t, 'earth', '속성 부여 성공!'); return; }
      else { say(`${nameOf(t)}: 아무 일도 일어나지 않았습니다. (${ATTR_N[sd.el]} 속성 강화 실패 · 변화 없음)`, '#c0b8a0'); render(); enchantFx(t, 'fail', '속성 부여 실패…'); return; }
      render(); return; }
    if (sd.use === 'blessit') { if (t.blessed) { say(`${nameOf(t)}: 이미 축복받은 장비입니다. 강화를 취소했습니다.`, '#9c9682'); cancelTarget(true); return; }
      cancelTarget(true); take(sid); const before = nameOf(t);
      if (Math.random() < 0.2) { t.blessed = true; if (td.wtype === 'staff') t.blessSp = 1 + Math.floor(Math.random() * 2);
        say(`${JOSA(before, '이', '가')} 성스러운 금빛에 휩싸입니다! → ${nameOf(t)} (${td.slot === 'weapon' ? td.wtype === 'staff' ? 'SP +' + t.blessSp : '추가 타격' : '방어 +1'})`, '#ffd86a'); enFx('#ffd86a', '축복!'); render(); enchantFx(t, 'bless', '축복 부여 성공!'); }
      else { say(`${before}: 아무 일도 일어나지 않았습니다. (축복 부여 실패)`, '#c0b8a0'); render(); enchantFx(t, 'fail', '축복 부여 실패…'); } return; }
    if (sd.curse) { const cur0 = t.en || 0; if (cur0 <= -7) { say(`${nameOf(t)}: 더 이상 낮출 수 없습니다. (최저 -7) 강화를 취소했습니다.`, '#9c9682'); cancelTarget(true); return; }
      cancelTarget(true); take(sid); const before = nameOf(t); t.en = cur0 - 1; say(`${JOSA(before, '이', '가')} 한순간 검게 빛납니다. → ${nameOf(t)}`, '#c890e8'); enFx('#c890e8', String(t.en)); render(); enchantFx(t, 'curse', `${t.en} 저주…`); return; }
    const safe = SAFE_EN(td), cur = t.en || 0;
    const go = () => { if (!take(sid)) return; const before = nameOf(t);
      if (cur >= safe && Math.random() >= 1 / 3) { enchantFx(t, 'boom', '증발…'); if (t.on) unequip(t, true); const k = bag.indexOf(t); if (k >= 0) bag.splice(k, 1);
        say(`${JOSA(before, '이', '가')} 강렬하게 빛나더니 증발되어 사라집니다.`, '#ff6a5a'); enFx('#ff6a5a', '증발!'); render(); return; }
      const add = sd.bless && cur < 7 ? 1 + Math.floor(Math.random() * 2) : 1; t.en = cur + add; if (t.en >= (td.slot === 'weapon' ? 8 : 7)) announce(`${PNAME()}님이 ${JOSA('+' + t.en + ' ' + td.name, '을', '를')} 만들어 냈습니다!`, t.en >= 9 ? '#ff9a3a' : '#9fe0ff');   // 축복 주문서: +1~2, 현재 +7 이상이면 +1만
      say(`${JOSA(before, '이', '가')} 한순간 ${add > 1 ? '은빛으로 ' + add + '번' : '파랗게'} 빛납니다. → ${nameOf(t)}`, add > 1 ? '#e8e0ff' : '#8ad0ff'); enFx(add > 1 ? '#e8e0ff' : '#8ad0ff', '+' + t.en);
      render(); enchantFx(t, add > 1 ? 'bless' : 'ok', `+${t.en} 강화 성공!`); };
    cancelTarget(true);
    if (cur >= safe) askYesNo(`${nameOf(t)}에 ${sd.name}을(를) 읽으시겠습니까?`, `${safe ? `안전 강화(+${safe})를 넘었습니다.` : '안전 강화가 없는 장비입니다. (안전 +0)'} 실패하면 장비가 증발할 수 있습니다. (성공 1/3)`, go); else go(); }
  // 계산 수치
  const dkSet = () => ['helm', 'armor', 'gloves', 'boots'].every(sl => eq[sl] && ITEMS[eq[sl].id].set === 'dk');
  const sum = k => Object.values(eq).reduce((s, e) => s + (ITEMS[e.id][k] || 0), 0) + (DK_SET_BONUS[k] && dkSet() ? DK_SET_BONUS[k] : 0);   // 데스나이트 세트 효과
  const enSum = () => Object.values(eq).reduce((s, e) => s + (ITEMS[e.id].slot !== 'weapon' ? enBonus(ITEMS[e.id], e.en || 0) : 0), 0);
  const blessAc = () => Object.values(eq).reduce((s, e) => s + (e.blessed && ITEMS[e.id].slot !== 'weapon' ? 1 : 0), 0);
  const ac0 = () => 10 - sum('ac') - enSum() - blessAc();                                    // 리니지식: 낮을수록 단단함
  const ac = () => ac0() - (BUFF.shieldm > 0 ? 2 : 0);
  const strB = () => STAT.str >= 20 ? 3 : STAT.str >= 18 ? 2 : STAT.str >= 16 ? 1 : 0;   // 힘 보너스 (근거리 공격)
  const dexB = () => STAT.dex >= 20 ? 3 : STAT.dex >= 18 ? 2 : STAT.dex >= 16 ? 1 : 0;   // 민첩 보너스 (활)
  const dmg = () => { const W_ = eq.weapon, w = W_ ? ITEMS[W_.id].dmg : [1, 2]; const b = (W_ && ITEMS[W_.id].wtype === 'bow' ? dexB() : strB()) + sum('xdmg') + (BUFF.enchant > 0 ? 1 : 0) + (W_ ? enBonus(ITEMS[W_.id], W_.en || 0) + (W_.attr ? ATTR_DMG[W_.attr.lv] : 0) : 0); return [Math.max(1, w[0] + b), Math.max(1, w[1] + b)]; };
  const blessHit = () => { const W_ = eq.weapon; return W_ && W_.blessed && ITEMS[W_.id].wtype !== 'staff'; };
  const sp = () => { const W_ = eq.weapon; return sum('sp') + (W_ && W_.blessed && ITEMS[W_.id].wtype === 'staff' ? W_.blessSp || 1 : 0); };
  const weight = () => bag.reduce((s, e) => s + (ITEMS[e.id].w || 0) * e.n, 0);
  const maxW = () => 150 + (STAT.str + STAT.con) * 6;
  const beltWR = () => Math.min(50, sum('wr'));   // 벨트: 가방 무게 −%
  const wPct = () => Math.max(0, weight() * (1 - beltWR() / 100) / Math.max(1, maxW()) - (BUFF.decwt > 0 ? 0.1 : 0));   // 벨트 감소 후 · 디크리즈 웨이트: 10% 가볍게
  const $ = id => document.getElementById(id);
  const typeOf = d => d.slot ? (d.slot === 'ring' ? '반지' : (SLOTS.find(([k]) => k === d.slot) || [0, '장비'])[1]) : d.use === 'learn' ? ({ magic: '마법서', skill: '기술서', spirit: '정령수정' })[SK[d.learn].kind] : /scroll/.test(d.icon) || /^scr_/.test(d.icon) ? '주문서' : /^pot_/.test(d.icon) ? '물약' : '기타';
  function infoLines(e) { const d = ITEMS[e.id], L = [], en = e.en || 0;
    if (d.dmg) { const a = enBonus(d, en) + (e.attr ? ATTR_DMG[e.attr.lv] : 0); L.push(`공격 ${d.dmg[0] + a}~${d.dmg[1] + a}` + (a ? ` (기본 ${d.dmg[0]}~${d.dmg[1]})` : '')); }
    const acv = (d.ac || 0) + (ARMOR_SLOTS.has(d.slot) ? enBonus(d, en) + (e.blessed ? 1 : 0) : 0); if (d.slot && acv) L.push(`방어 AC -${acv}`);
    { const mk = d.slot === 'weapon' ? '공격' : '방어', per = `${RAR_OF(d)} · 강화 1당 ${mk} +${enMul(d)}`; if (en) L.push(`강화 ${en > 0 ? '+' : ''}${en} → ${mk} ${enBonus(d, en) >= 0 ? '+' : ''}${enBonus(d, en)} (${per} · 안전 강화 +${SAFE_EN(d)})`); else if (d.slot === 'weapon' || ARMOR_SLOTS.has(d.slot)) L.push(`안전 강화 +${SAFE_EN(d)} (${per})`); }
    if (e.blessed) L.push(d.slot === 'weapon' ? (d.wtype === 'staff' ? `축복: SP +${e.blessSp || 1}` : '축복: 추가 타격 (공격 시 가끔 한 번 더 피해)') : '축복: 방어 +1');
    if (e.attr) L.push(`${ATTR_N[e.attr.el]} 속성 ${e.attr.lv}단 · 추가 피해 +${ATTR_DMG[e.attr.lv]} (${ATTR_N[ATTR_OPP[e.attr.el]]} 몬스터 2배 · ${ATTR_N[e.attr.el]} 몬스터 0)`);
    if (d.hp && !d.codex) L.push(`HP +${d.hp}`); if (d.mp && !d.codex) L.push(`MP +${d.mp}`);
    if (d.codex) { if (d.hit) L.push(`명중 +${d.hit}`); if (d.xdmg) L.push(`추가 피해 +${d.xdmg}`); if (d.mr) L.push(`마법 방어 MR +${d.mr}`);
      for (const t of d.optTxt) { const k = Object.keys(cxOpt(t)).find(q => CX_LATER[q]); L.push(t + (k ? ` (${CX_LATER[k]})` : '')); }
      L.push(`얻는 곳: ${cxWhere(e.id)}`); }
    if (d.heal) L.push(`${d.use === 'mana' ? 'MP' : 'HP'} ${d.heal[0]}~${d.heal[1]} 회복`);
    if (d.use === 'learn') { const k = SK[d.learn]; L.push(`${k.kind === 'magic' ? k.circle + '서클 마법' : k.kind === 'spirit' ? '정령마법 · 요정 전용' : '기사 기술'} · Lv.${k.lv} 이상`, k.desc); if (k.kind === 'magic') L.push(`배울 수 있는 직업: ${['knight', 'elf', 'wizard'].filter(c => k.circle <= MAGIC_MAX[c]).map(c => CLASS_NAME[c]).join(' · ')}`); }
    if (e.pet) { const P_ = e.pet; L.push(`Lv.${P_.lv} ${PET_KIND[P_.kind].name} · HP ${Math.ceil(P_.hp)}/${P_.maxhp} · EXP ${(100 * P_.exp / petNeed(P_.lv)).toFixed(1)}%`, `상태: ${({ out: '소환 중', stored: '펫 보관소에 있음', dead: '쓰러짐' })[P_.state]} · 명령: ${({ attack: '공격', wait: '공격 대기', rest: '휴식' })[P_.mode]}`); }
    if (d.use === 'home') L.push('마을로 즉시 귀환'); if (d.use === 'tele') L.push('같은 지역 임의 이동'); if (d.only) L.push(`${CLASS_NAME[d.only]} 전용`); if (d.set === 'dk') L.push('데스나이트 세트 (투구·갑옷·장갑·장화): 모두 입으면 데스나이트로 변신 · AC -3 · 추가 피해 +2 · 불 저항 +20'); if (d.use === 'statreset') L.push('보너스 능력치를 되돌려 다시 찍습니다.');
    if (d.use === 'haste') L.push(`${d.haste}단 가속 ${d.haste === 1 ? '1.2' : '1.4'}배 · 이동·공격·마법 속도 · ${d.dur / 60}분`);
    return L; }
  { let cur = null; const T = () => document.getElementById('stat-tip');   // 아이템 툴팁: 마우스를 올리면 바로 (브라우저 title 지연 없이)
    const place = (x, y) => { const t = T(); const w = t.offsetWidth, h = t.offsetHeight; t.style.left = Math.max(8, Math.min(innerWidth - w - 8, x + 16)) + 'px'; t.style.top = Math.max(8, Math.min(innerHeight - h - 8, y + 14)) + 'px'; };
    document.addEventListener('mouseover', ev => { const el = ev.target.closest ? ev.target.closest('[data-itip]') : null; if (el === cur) return; cur = el; const t = T(); if (!t) return;
      if (!el || ev.buttons) { t.hidden = true; return; } const L = el.dataset.itip.split('\n'); t.innerHTML = `<b style="color:${el.dataset.ic || '#f2d98a'}">${esc_(L[0])}</b>`; t.hidden = false; place(ev.clientX, ev.clientY); });   // 올리면 이름만
    document.addEventListener('mousemove', ev => { if (cur && T() && !T().hidden) place(ev.clientX, ev.clientY); });
    document.addEventListener('pointerdown', () => { if (cur && T()) { T().hidden = true; cur = null; } }, true);
    // 꾹 누르고 있으면(0.45초) 전체 정보 — 가방·장비 칸처럼 자체 상세 정보창이 뜨는 곳은 그 창으로
    let lpT = 0, lpOn = false; const lpEnd = () => { clearTimeout(lpT); lpT = 0; if (lpOn && T()) { T().hidden = true; lpOn = false; } };
    document.addEventListener('pointerdown', ev => { lpEnd(); if (ev.button !== 0) return; const el = ev.target.closest ? ev.target.closest('[data-itip]') : null; if (!el) return; const x = ev.clientX, y = ev.clientY;
      lpT = setTimeout(() => { lpT = 0; const iw = document.getElementById('itemwin'); if ((iw && !iw.hidden) || !el.isConnected) return; const t = T(); if (!t) return; const L = el.dataset.itip.split('\n');
        t.innerHTML = `<b style="color:${el.dataset.ic || '#f2d98a'}">${esc_(L[0])}</b>` + (L.length > 1 ? '<br>' + L.slice(1).map(esc_).join('<br>') : ''); t.hidden = false; lpOn = true; place(x, y); }, 450); });
    for (const ev of ['pointerup', 'pointercancel', 'dragstart', 'scroll']) document.addEventListener(ev, lpEnd, true); }
  function tip(e) { const d = ITEMS[e.id]; const a = [nameOf(e) + (d.stack && e.n > 1 ? ` (${e.n})` : '') + ` [${d.rar || '일반'}]`, ...infoLines(e)]; if (d.desc) a.push(d.desc); if (d.codex) { const R = cxReq(d); a.splice(1, 0, R.txt + (R.ok || GOD ? '' : ' — 착용 불가')); }
    a.push(d.slot ? (e.on ? '더블클릭: 벗기' : '더블클릭: 착용') : d.use ? '더블클릭: 사용 · 아래 단축키 칸으로 끌어다 놓으면 등록' : '', '꾹 누르고 있기: 상세 정보'); return a.filter(Boolean).join('\n'); }
  // ===== 아이템 상세 정보창: 아이템을 꾹 누르고 있으면(0.42초) 뜸. 버프 아이템은 여기서 자동 사용 켜기
  let dwE = null, dwPos = [0, 0], holdT = 0, holdP = null, lastApplyT = -1e9, cdTimer = 0;
  // ===== 스킬 상세 정보창 + 자동 사용 (단축키 칸·스킬창에서 꾹 누르기 / 단축키 칸 오른쪽 클릭)
  const AUTOSK = {}; let dwSk = null, skTimer = 0, skT = 0;
  function skAutoKind(id) { const k = SK[id]; if (!k) return null; if (k.buff && BUFF_DEF[k.buff]) return 'buff'; if (['heal', 'xheal', 'gheal', 'healall'].includes(id)) return 'heal'; if (id === 'stun' || id === 'ebolt') return 'attack'; return null; }
  function setAutoSk(id, on) { if (!skAutoKind(id)) return; if (on) AUTOSK[id] = true; else delete AUTOSK[id]; say(`자동 사용: ${SK[id].name} ${on ? '켬' : '끔'}`, '#9fd0e8'); skKey = ''; renderSkills(); if (dwSk === id && !$('itemwin').hidden) showSkill(id); }
  // 한 번에 하나만, 0.3초마다 확인 (마을·쓰러짐·MP 부족·재사용 대기 중이면 건너뜀)
  function skAuto(dt) { skT -= dt; if (skT > 0) return; skT = 0.3; if (SCENE === 'town' || hero.hp <= 0) return;
    for (const id in AUTOSK) { const k = SK[id], kind = skAutoKind(id); if (!k || !kind || !LEARNED.has(id) || (SKCD[id] || 0) > 0 || hero.mp < k.mp) continue;
      if (kind === 'buff') { if (BUFF[k.buff] > 0) continue; }
      else if (kind === 'heal') { if (hero.hp / hero.max > 0.5) continue; }
      else { const T = hero.target; if (hero.atk || !T || T.dead || T.isRemote || !foxes.includes(T)) continue; const dd = cheb(T.i, T.j, hero.i, hero.j); if (id === 'stun' ? dd > 1 || T.stunT > 0 : dd > 6) continue; }
      castSkill(id, kind === 'attack' ? hero.target : null); return; } }
  function holdSkill(ev, id) { if (ev.button !== 0) return; holdCancel(); holdP = [ev.clientX, ev.clientY]; holdT = setTimeout(() => { holdT = 0; showSkill(id, holdP[0], holdP[1]); }, 420); }
  function holdHot(ev, i) { const id = hot[i]; if (!id) return; if (id.startsWith('sk:')) { if (SK[id.slice(3)]) holdSkill(ev, id.slice(3)); return; } const e = bag.find(x => x.id === id); if (e) holdStart(ev, e); }
  function openHot(i, x, y) { const id = hot[i]; if (!id) return false; if (id.startsWith('sk:')) { if (!SK[id.slice(3)]) return false; showSkill(id.slice(3), x, y); return true; } const e = bag.find(x_ => x_.id === id); if (!e) return false; showDetail(e, x, y); return true; }
  function showSkill(id, x, y) { const w = $('itemwin'), k = SK[id]; if (!w || !k) return; dwE = null; dwSk = id; if (x != null) dwPos = [x, y]; { const c = $('cmpwin'); if (c) c.hidden = true; const tp = $('stat-tip'); if (tp) tp.hidden = true; }
    const has = LEARNED.has(id), kind = skAutoKind(id), lvOK = hero.lv >= k.lv, cdv = SKCD[id] || 0, bk = k.buff && BUFF_DEF[k.buff] ? k.buff : null, bleft = bk ? BUFF[bk] || 0 : 0;
    const typ = k.kind === 'magic' ? `${k.circle}서클 마법` : k.kind === 'skill' ? '기사 기술' : '정령마법';
    const fmtT = v => v >= 60 ? `${Math.floor(v / 60)}분${Math.round(v % 60) ? ' ' + Math.round(v % 60) + '초' : ''}` : `${Math.max(0, Math.round(v))}초`;
    const lines = [`<li class="req${lvOK ? '' : ' no'}">필요 레벨 Lv.${k.lv}${lvOK ? '' : ' <small>(레벨 부족)</small>'}</li>`, `<li>MP 소모 ${k.mp}${hero.mp < k.mp ? ' <small style="color:#8aa8ff">(MP 부족)</small>' : ''}</li>`, `<li>재사용 대기 ${k.cd}초${cdv > 0 ? ` <small>(남은 ${cdv.toFixed(1)}초)</small>` : ''}</li>`];
    if (bk) lines.push(`<li>지속 시간 ${fmtT(BUFF_DEF[bk].dur)}${bleft > 0 ? ` <small style="color:${BUFF_DEF[bk].c}">(지금 ${fmtT(bleft)} 남음)</small>` : ''}</li>`);
    lines.push(`<li class="d">${esc_(k.desc)}</li>`);
    const why = { buff: '버프가 끝나면 자동으로 다시 시전 (마을 제외 · MP가 있을 때)', heal: 'HP가 50% 이하로 떨어지면 자동으로 시전 (마을 제외)', attack: id === 'stun' ? '사냥 중 바로 옆 대상에게 재사용 대기마다 자동 시전' : '사냥 중 6칸 안의 대상에게 재사용 대기마다 자동 시전' }[kind];
    const ctl = [has ? `<button type="button" data-act="cast"${cdv > 0 ? ' disabled' : ''}>${cdv > 0 ? `재사용 대기 ${cdv.toFixed(1)}초` : '사용하기'}</button>` : `<p class="iw-st">아직 배우지 않았습니다 · ${esc_(k.book || '')}${k.book ? '(으)로 배움' : ''}</p>`,
      kind ? `<label class="iw-chk${has ? '' : ' dis'}"><input type="checkbox" data-act="autosk"${AUTOSK[id] ? ' checked' : ''}${has ? '' : ' disabled'}><span>자동 사용 <small>${why}${has ? '' : ' · 배운 뒤에 켤 수 있어요'}</small></span></label>`
           : '<label class="iw-chk dis"><input type="checkbox" disabled><span>자동 사용 <small>이 스킬은 자동 사용을 지원하지 않아요</small></span></label>'];
    const html = `<div class="iw-head"><div class="iw-ic">%ICON%${AUTOSK[id] ? '<i class="sk-auto">A</i>' : ''}</div><div><b class="iw-name" style="color:#bfe0ff">${esc_(k.name)}</b><span class="iw-type"><em style="color:#9fd0e8">[${typ}]</em> ${has ? '<em style="color:#9fd08a">배움</em>' : '<em style="color:#f08a7a">미습득</em>'}${AUTOSK[id] ? ' · <em style="color:#ffd86a">자동 사용 중</em>' : ''}</span></div></div>`
      + `<ul class="iw-lines">${lines.join('')}</ul><div class="iw-ctl">${ctl.join('')}</div><p class="iw-hint">${has ? '단축키(F5~F12)·스킬창 더블클릭: 사용 · ' : ''}끌어다 단축키 칸에 등록 · Esc: 닫기</p>`;
    const wasHidden = w.hidden; if (!(html === w.dataset.h && !wasHidden && x == null)) { w.dataset.h = html; w.querySelector('#iw-body').innerHTML = html.replace('%ICON%', ICON('sk_' + id));
      w.querySelectorAll('[data-act]').forEach(el => { const a = el.dataset.act; if (a === 'autosk') el.onchange = () => setAutoSk(id, el.checked); else if (a === 'cast') el.onclick = () => { castSkill(id); showSkill(id); }; }); }
    { const pl = w.querySelector('.gw-plate'); if (pl) pl.textContent = '스킬 정보'; } w.hidden = false;
    if (wasHidden || x != null) { const W_ = w.offsetWidth, H_ = w.offsetHeight; let L_ = dwPos[0] + 18, T_ = dwPos[1] > innerHeight * 0.68 ? dwPos[1] - H_ - 16 : dwPos[1] - 20; if (L_ + W_ > innerWidth - 8) L_ = dwPos[0] - W_ - 18; L_ = Math.max(8, L_); T_ = Math.max(8, Math.min(innerHeight - H_ - 8, T_)); w.style.left = L_ + 'px'; w.style.top = T_ + 'px'; w.style.right = 'auto'; }
    clearTimeout(skTimer); skTimer = setTimeout(() => { if (dwSk === id && !w.hidden) showSkill(id); }, 500); }   // 열려 있는 동안 남은 시간 갱신
  const esc_ = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  let pvEn = null, pvFor = null;   // 강화 미리보기 수치 (null = 실제 강화)
  const canPv = d => d && (d.slot === 'weapon' || ARMOR_SLOTS.has(d.slot));
  function showDetail(e, x, y) { const w = $('itemwin'); if (!w || (!bag.includes(e) && !e.preview)) { hideDetail(); return; } const d = ITEMS[e.id]; if (pvFor !== e) { pvEn = null; pvFor = e; } dwE = e; dwSk = null; if (x != null) dwPos = [x, y]; { const pl = w.querySelector('.gw-plate'); if (pl) pl.textContent = '아이템 정보'; }
    const ve = pvEn != null && canPv(d) ? Object.assign({}, e, { en: pvEn }) : e;   // 미리보기면 강화 수치만 바꾼 가상 장비
    const rc = rarC(e.id), A = AUTO, ctl = [];
    if (d.slot) ctl.push(`<button type="button" data-act="use">${e.on ? '벗기' : '착용하기'}</button>`);
    ctl.push(`<label class="iw-chk iw-lock"><input type="checkbox" data-act="lock"${e.locked ? ' checked' : ''}><span>아이템 잠금 <small>${e.locked ? '잠김 · 강화·축복·속성 부여와 판매를 막는 중' : '켜면 실수로 강화·판매되지 않게 막습니다'}</small></span></label>`);
    if (d.invis) { const left = (e.invisAt || 0) - time; ctl.push(!e.on ? '<p class="iw-st">착용하면 투명 기능을 쓸 수 있습니다.</p>' : left > 0 ? `<button type="button" disabled>투명 재사용 대기 ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}</button>` : `<button type="button" data-act="invis" class="iw-invis">투명 사용 (${d.invis.dur}초)</button>`);
      clearTimeout(cdTimer); if (e.on && left > 0) cdTimer = setTimeout(() => { if (dwE === e && !$('itemwin').hidden) showDetail(e); }, 1000); }
    else if (d.use) ctl.push(`<button type="button" data-act="use">${d.use === 'pet' ? '펫 창 열기' : d.use === 'learn' ? '배우기' : d.use === 'enchant' || d.use === 'attr' ? '사용하기 (장비 선택)' : '사용하기'}</button>`);
    if (e.pet && !e.preview) { const ps = e.pet.state; ctl.unshift(ps === 'out' ? '<button type="button" data-act="pet-store">펫 보관하기 (넣기)</button>' : ps === 'dead' ? `<button type="button" data-act="pet-revive">부활 주문서로 되살리기 (${count('revive_scroll')}개)</button>` : '<button type="button" data-act="pet-summon" class="iw-pet">펫 소환하기 (꺼내기)</button>'); }   // 어디서든 소환·보관
    if (e.pet) ctl.push(`<div class="iw-rename"><input type="text" id="iw-petname" maxlength="8" value="${esc_(e.pet.name)}" aria-label="펫 이름"><button type="button" data-act="rename">이름 변경</button></div>`);
    if (e.id in AUTOBUFF) ctl.push(`<label class="iw-chk"><input type="checkbox" data-act="autobuff"${AUTOBUFF[e.id] ? ' checked' : ''}><span>자동 사용 <small>버프가 끝나면 자동으로 사용 (마을 제외)</small></span></label>`);
    for (const k of ['hp', 'mp']) if (potOK(k, e.id)) { const on = A[k].on && A[k].id === e.id;
      ctl.push(on ? `<p class="iw-st">✔ ${k.toUpperCase()} 자동물약으로 사용 중 · ${k.toUpperCase()} ${A[k].pct}% 이하</p>` : `<button type="button" data-act="auto-${k}">${k.toUpperCase()} 자동물약에 넣기</button>`); }
    if (e.preview) ctl.length = 0;
    if (canPv(d)) { const cur = pvEn != null ? pvEn : (e.en || 0); ctl.unshift(`<div class="iw-pv"><span>강화 미리보기</span><button type="button" data-act="pv-dn" aria-label="강화 -1">−</button><b class="${pvEn != null ? 'on' : ''}">${cur > 0 ? '+' : ''}${cur}</b><button type="button" data-act="pv-up" aria-label="강화 +1">+</button>${[0, 4, 6, 7, 9].map(v => `<button type="button" class="q" data-act="pv-${v}">+${v}</button>`).join('')}${pvEn != null ? '<button type="button" class="rs" data-act="pv-real">실제로</button>' : ''}</div>${pvEn != null ? `<p class="iw-st pv">미리보기: +${pvEn} 기준 능력치 · 착용 장비도 +${pvEn}로 맞춰 비교해요 (실제 강화는 그대로)</p>` : ''}`); }
    const lines = (d.codex ? (R => `<li class="req${R.ok ? '' : ' no'}">${esc_(R.txt)}${R.ok ? '' : GOD ? ' <small>(갓 모드라 착용 가능)</small>' : ` <small>(${!R.okC ? CLASS_NAME[CLASS] + ' 착용 불가' : '레벨 부족'})</small>`}</li>`)(cxReq(d)) : '') + infoLines(ve).map(t => `<li>${esc_(t)}</li>`).join('') + (d.desc ? `<li class="d">${esc_(d.desc)}</li>` : '');
    const html = `<div class="iw-head"><div class="iw-ic">%ICON%${ve.en ? `<i class="en${ve.en < 0 ? ' neg' : ''}">${ve.en > 0 ? '+' : ''}${ve.en}</i>` : ''}</div><div><b class="iw-name" style="color:${rc}">${nameHTML(ve)}${ve !== e ? ' <small class="pvtag">미리보기</small>' : ''}</b><span class="iw-type"><em style="color:${rc}">[${d.rar || '일반'}]</em> ${e.blessed ? '<em class="bl-tag">축복</em> ' : ''}${typeOf(d)}${d.stack ? ` · ${e.n}개` : ''}${e.on ? ' · <em style="color:#7fe0ff">착용 중</em>' : ''}</span></div></div>`
      + (lines ? `<ul class="iw-lines">${lines}</ul>` : '') + `<p class="iw-meta">무게 ${d.w || 0}${d.stack && e.n > 1 ? ` · 합계 ${Math.round((d.w || 0) * e.n * 10) / 10}` : ''}</p>`
      + (ctl.length ? `<div class="iw-ctl">${ctl.join('')}</div>` : '') + `<p class="iw-hint">${d.slot ? '더블클릭: 착용/벗기' : d.use ? '더블클릭·오른쪽 클릭: 사용' : ''}${d.use || d.slot ? ' · ' : ''}끌어다 단축키 칸에 등록 · Esc: 닫기</p>`;
    const wasHidden = w.hidden; if (html === w.dataset.h && !wasHidden && x == null) return; if (!wasHidden && x == null && document.activeElement && document.activeElement.id === 'iw-petname') return; w.dataset.h = html; w.querySelector('#iw-body').innerHTML = html.replace('%ICON%', ICON(d.icon, e.blessed) + (e.blessed ? '<i class="bl-spark"></i>' : '')); if (e.preview) { const h = w.querySelector('.iw-hint'); if (h) h.textContent = '상점 미리보기 · 구입하면 인벤토리에 들어갑니다 · Esc: 닫기'; }
    w.querySelectorAll('[data-act]').forEach(el => { const act = el.dataset.act;
      if (act === 'autobuff') el.onchange = () => setAutoBuff(e.id, el.checked);
      else if (act === 'lock') el.onchange = () => { e.locked = el.checked; say(`${nameOf(e)}: ${e.locked ? '잠금 — 강화·판매할 수 없습니다.' : '잠금을 풀었습니다.'}`, e.locked ? '#f2d98a' : '#9c9682'); render(); w.dataset.h = ''; showDetail(e); };
      else if (act === 'rename') { const inp = w.querySelector('#iw-petname'); el.onclick = () => { if (PET.rename(e, inp.value)) { w.dataset.h = ''; showDetail(e); } }; inp.onkeydown = ev => { ev.stopPropagation(); if (ev.key === 'Enter') el.click(); }; }
      else if (act === 'invis') el.onclick = () => { useInvis(e); if (bag.includes(e)) showDetail(e); };
      else if (act === 'pet-summon') el.onclick = () => { PET.summon(e); w.dataset.h = ''; showDetail(e); };
      else if (act === 'pet-store') el.onclick = () => { PET.store(e); w.dataset.h = ''; showDetail(e); };
      else if (act === 'pet-revive') el.onclick = () => { PET.revive(e); w.dataset.h = ''; showDetail(e); };
      else if (act.startsWith('pv-')) el.onclick = () => { const v = act.slice(3), cur = pvEn != null ? pvEn : (e.en || 0); pvEn = v === 'real' ? null : v === 'up' ? Math.min(15, cur + 1) : v === 'dn' ? Math.max(0, cur - 1) : +v; w.dataset.h = ''; showDetail(e); };
      else el.onclick = () => { if (act === 'use') { const keep = !(d.use === 'enchant' || d.use === 'attr'); use(e); if (keep && bag.includes(e)) showDetail(e); else hideDetail(); } else { setAuto(act.slice(5), e.id); showDetail(e); } }; });
    w.hidden = false; if (!wasHidden && x == null) { showCompare(e, pvEn); return; } const W_ = w.offsetWidth, H_ = w.offsetHeight; let L_ = dwPos[0] + 18, T_ = dwPos[1] - 20; if (L_ + W_ > innerWidth - 8) L_ = dwPos[0] - W_ - 18; L_ = Math.max(8, L_); T_ = Math.max(8, Math.min(innerHeight - H_ - 8, T_));
    w.style.left = L_ + 'px'; w.style.top = T_ + 'px'; w.style.right = 'auto'; showCompare(e, pvEn); }
  function hideDetail() { const w = $('itemwin'); if (w) w.hidden = true; const c = $('cmpwin'); if (c) c.hidden = true; dwE = null; dwSk = null; }
  // 안 낀 장비를 꾹 누르면 옆에 지금 낀 장비와 비교 (초록=좋아짐, 빨강=나빠짐)
  function statOf(e) { const d = ITEMS[e.id], en = e.en || 0, at = e.attr ? ATTR_DMG[e.attr.lv] : 0; const eb = enBonus(d, en); return { dmg: d.dmg ? [d.dmg[0] + eb + at, d.dmg[1] + eb + at] : null, ac: (d.ac || 0) + (ARMOR_SLOTS.has(d.slot) ? eb + (e.blessed ? 1 : 0) : 0), hp: d.hp || 0, mp: d.mp || 0, hit: d.hit || 0, xdmg: d.xdmg || 0, mr: d.mr || 0, wr: d.wr || 0, en, attr: e.attr ? e.attr.lv : 0, blessed: !!e.blessed, w: d.w || 0 }; }
  function showCompare(e, pv) { const c = $('cmpwin'); if (!c) return; const d = ITEMS[e.id]; if (!d.slot || e.on) { c.hidden = true; return; }
    const cur = d.slot === 'ring' ? [eq.ring1, eq.ring2].filter(Boolean) : eq[d.slot] ? [eq[d.slot]] : [];
    const PV = pv != null && canPv(d), V = o => PV ? Object.assign({}, o, { en: pv }) : o;   // 미리보기: 둘 다 같은 강화 수치로
    const N_ = statOf(V(e)), sgn = v => v > 0 ? 'up' : v < 0 ? 'dn' : 'same', fmt = v => (v > 0 ? '+' : '') + v;
    const block = o => { const O = statOf(V(o)), rows = [];
      const row = (lab, a, b, diff) => rows.push(`<tr><th>${lab}</th><td>${a}</td><td>${b}</td><td class="${sgn(diff)}">${diff === 0 ? '—' : fmt(diff)}</td></tr>`);
      if (O.dmg || N_.dmg) { const a = O.dmg || [0, 0], b = N_.dmg || [0, 0]; row('공격', O.dmg ? a.join('~') : '-', N_.dmg ? b.join('~') : '-', Math.round(((b[0] + b[1]) - (a[0] + a[1])) / 2)); }
      if (O.ac || N_.ac) row('방어 AC', O.ac ? '-' + O.ac : '0', N_.ac ? '-' + N_.ac : '0', N_.ac - O.ac);
      if (O.hp || N_.hp) row('HP', '+' + O.hp, '+' + N_.hp, N_.hp - O.hp); if (O.mp || N_.mp) row('MP', '+' + O.mp, '+' + N_.mp, N_.mp - O.mp);
      if (O.hit || N_.hit) row('명중', '+' + O.hit, '+' + N_.hit, N_.hit - O.hit); if (O.xdmg || N_.xdmg) row('추가 피해', '+' + O.xdmg, '+' + N_.xdmg, N_.xdmg - O.xdmg); if (O.mr || N_.mr) row('MR', '+' + O.mr, '+' + N_.mr, N_.mr - O.mr); if (O.wr || N_.wr) row('가방 무게', '−' + O.wr + '%', '−' + N_.wr + '%', N_.wr - O.wr);
      row('강화', fmt(O.en), fmt(N_.en), N_.en - O.en); if (O.attr || N_.attr) row('속성', O.attr + '단', N_.attr + '단', N_.attr - O.attr);
      if (O.blessed || N_.blessed) row('축복', O.blessed ? '있음' : '없음', N_.blessed ? '있음' : '없음', (N_.blessed ? 1 : 0) - (O.blessed ? 1 : 0));
      rows.push(`<tr class="wt"><th>무게</th><td>${O.w}</td><td>${N_.w}</td><td class="${sgn(O.w - N_.w)}">${N_.w === O.w ? '—' : fmt(Math.round((N_.w - O.w) * 10) / 10)}</td></tr>`);
      return `<div class="cw-cur"><span class="cw-ic">%ICON_${bag.indexOf(o)}%</span><div><b style="color:${rarC(o.id)}">${nameHTML(V(o))}</b><small>착용 중 · ${({ ring1: '반지 1', ring2: '반지 2' })[o.on] || (SLOTS.find(([k]) => k === o.on) || [0, ''])[1]}${PV ? ` · <em class="pvtag">+${pv} 기준 비교</em>` : ''}</small></div></div><table class="cw-t"><thead><tr><th></th><td>착용 중${PV ? ` (+${pv})` : ''}</td><td>이 장비${PV ? ` (+${pv})` : ''}</td><td>차이</td></tr></thead><tbody>${rows.join('')}</tbody></table>`; };
    const html = cur.length ? cur.map(block).join('<hr>') : '<p class="cw-none">착용 중인 장비 없음<br><small>이 장비를 끼면 그대로 더해집니다.</small></p>';
    if (c.dataset.h !== html || c.hidden) { c.dataset.h = html; c.querySelector('#cw-body').innerHTML = html.replace(/%ICON_(\d+)%/g, (_, k) => ICON(ITEMS[bag[k].id].icon, bag[k].blessed) + (bag[k].blessed ? '<i class="bl-spark"></i>' : '')); }
    c.hidden = false; const w = $('itemwin'), r = w.getBoundingClientRect(), W_ = c.offsetWidth, H_ = c.offsetHeight; let L = r.left - W_ - 8; if (L < 8) L = r.right + 8; L = Math.min(innerWidth - W_ - 8, Math.max(8, L));
    Object.assign(c.style, { left: L + 'px', top: Math.max(8, Math.min(innerHeight - H_ - 8, r.top)) + 'px', right: 'auto' }); }
  function holdCancel() { if (holdT) clearTimeout(holdT); holdT = 0; }
  function holdStart(ev, e) { if (ev.button !== 0) return; holdCancel(); holdP = [ev.clientX, ev.clientY]; holdT = setTimeout(() => { holdT = 0; showDetail(e, holdP[0], holdP[1]); }, 420); }
  addEventListener('pointermove', ev => { if (holdT && Math.hypot(ev.clientX - holdP[0], ev.clientY - holdP[1]) > 5) holdCancel(); }, true);
  ['pointerup', 'pointercancel', 'dragstart'].forEach(t => addEventListener(t, holdCancel, true)); addEventListener('blur', ev => { if (ev.target === window) holdCancel(); });
  addEventListener('pointerdown', ev => { const w = $('itemwin'), cw = $('cmpwin'); if (w && !w.hidden && !w.contains(ev.target) && !(cw && cw.contains(ev.target))) hideDetail();
    if (tgtScroll && ev.button === 0) { const c = ev.target.closest && ev.target.closest('#inv-grid .slot, .eq'); if (!c || c.disabled || (c.classList.contains('eq') && !c.classList.contains('has'))) { cancelTarget(); ev.stopPropagation(); } } }, true);
  addEventListener('keydown', ev => { if (ev.key !== 'Escape' || !$('askwin').hidden) return;
    if ($('itemwin') && !$('itemwin').hidden) { ev.preventDefault(); ev.stopImmediatePropagation(); hideDetail(); } else if (PET.cancelRevive()) { ev.preventDefault(); ev.stopImmediatePropagation(); } else if (tgtScroll) { ev.preventDefault(); ev.stopImmediatePropagation(); cancelTarget(); } }, true);
  addEventListener('contextmenu', ev => { if (!tgtScroll) return; ev.preventDefault(); ev.stopImmediatePropagation(); cancelTarget(); }, true);
  const recentApply = () => performance.now() - lastApplyT < 600;
  function render() {
    hero.max = hero.baseHP + sum('hp') + Math.max(0, STAT.con - 14); hero.maxmp = hero.baseMP + sum('mp') + Math.max(0, Math.floor((STAT.wis - 9) / 2)); hero.hp = Math.min(hero.hp, hero.max); hero.mp = Math.min(hero.mp, hero.maxmp);
    const grid = $('inv-grid'); if (!grid) return; if (!$('invwin').hidden) renderSkills();
    if (!$('invwin').hidden && !bagDrag) {
      grid.innerHTML = ''; const N = Math.max(48, Math.ceil((bag.length + 1) / 4) * 4);
      for (let k = 0; k < N; k++) { const e = bag[k], c = document.createElement('button'); c.type = 'button'; c.className = 'slot';
        c.ondragover = ev => { if ([...ev.dataTransfer.types].includes('text/x-bag')) { ev.preventDefault(); c.classList.add('dropk'); } }; c.ondragleave = () => c.classList.remove('dropk');
        c.ondrop = ev => { c.classList.remove('dropk'); const a = ev.dataTransfer.getData('text/x-bag'); if (a === '') return; ev.preventDefault(); ev.stopPropagation(); moveBag(+a, k); };   // 칸끼리 끌어서 자리 바꾸기
        if (e) { c.draggable = true; c.ondragstart = ev => { bagDrag = true; ev.dataTransfer.setData('text/plain', e.id); ev.dataTransfer.setData('text/x-bag', String(bag.indexOf(e))); }; c.innerHTML = ICON(ITEMS[e.id].icon, e.blessed) + (e.blessed ? '<i class="bl-spark"></i>' : '') + (e.on ? '<i class="on">ON</i>' : '') + (e.en ? `<i class="en${e.en < 0 ? ' neg' : ''}">${e.en > 0 ? '+' : ''}${e.en}</i>` : '') + (ITEMS[e.id].stack ? `<b>${GOD_INF(e.id) ? '∞' : e.n}</b>` : ''); c.dataset.itip = tip(e) + (e.locked ? '\n잠김 — 강화·판매 불가' : ''); c.dataset.ic = rarC(e.id); { const rr = ITEMS[e.id].rar || '일반'; c.style.setProperty('--rar', rr === '일반' ? '#b9b4a8' : RARITY_C[rr]); c.classList.add('rar', 'r-' + ({ '일반': 0, '고급': 1, '희귀': 2, '영웅': 3 }[rr] || 0)); } if (e.blessed) c.classList.add('blessed'); { const t_ = enTierOf(e.id, e.en); if (t_) c.classList.add('eg' + t_); } if (e.locked) c.insertAdjacentHTML('beforeend', '<i class="lk" title="잠김"><svg viewBox="0 0 10 12" aria-hidden="true"><rect x="1" y="5" width="8" height="6.5" rx="1.2" fill="#f2d98a" stroke="#3a2810" stroke-width=".6"/><path d="M3 5V3.6a2 2 0 0 1 4 0V5" fill="none" stroke="#f2d98a" stroke-width="1.4"/></svg></i>');
          c.onpointerdown = ev => holdStart(ev, e); c.onclick = () => { if (tgtScroll) { lastApplyT = performance.now(); applyScroll(e); } else if ($('bulkwin') && !$('bulkwin').hidden) { lastApplyT = performance.now(); bulkToggle(e); } else if (window.ALCH && ALCH.open() && ITEMS[e.id].slot) { lastApplyT = performance.now(); ALCH.toggle(e); } }; if (BK.list.includes(e) && document.getElementById('bulkwin') && !document.getElementById('bulkwin').hidden) c.classList.add('bk-on'); if (window.ALCH && ALCH.open() && ALCH.has(e)) c.classList.add('al-on'); c.ondblclick = () => { if (!recentApply()) use(e); }; c.oncontextmenu = ev => { ev.preventDefault(); if ($('storewin') && !$('storewin').hidden) { lastApplyT = performance.now(); STORE.depositAsk(e); } else if (window.ALCH && ALCH.open() && ITEMS[e.id].slot) { lastApplyT = performance.now(); ALCH.toggle(e); } else use(e); }; }   // 창고가 열려 있으면 우클릭 = 창고로
        else { c.classList.add('empty'); c.tabIndex = -1; c.setAttribute('aria-disabled', 'true'); }
        grid.appendChild(c); }
      if (dwE && !$('itemwin').hidden) { if (bag.includes(dwE)) showDetail(dwE); else hideDetail(); }
      $('inv-w').textContent = Math.round(wPct() * 100) + '%'; $('inv-w').style.color = wPct() >= 1 ? '#ff5a4a' : wPct() >= 0.8 ? '#ffb050' : ''; $('inv-coin').textContent = coins.toLocaleString();
    }
    if (!$('charwin').hidden) {
      const s = (id, v) => { const el = $(id); if (el) el.textContent = v; };
      s('cw-lv', hero.lv); s('cw-exp', (hero.exp / needExp(hero.lv) * 100).toFixed(2) + '%'); s('cw-hp', `${Math.ceil(hero.hp)}/${hero.max}`); s('cw-mp', `${Math.ceil(hero.mp)}/${hero.maxmp}`);
      s('cw-ac', ac()); s('cw-w', Math.round(wPct() * 100) + '%' + [beltWR() ? `벨트 −${beltWR()}%` : '', BUFF.decwt > 0 ? '디크리즈' : ''].filter(Boolean).map(t => ' (' + t + ')').join('')); s('cw-food', '100%'); const d = dmg(); s('cw-dmg', `${d[0]} ~ ${d[1]}`);
      for (const k in BASE) { const el = $('cw-' + k); if (el) { const h = `${STAT[k]}${BONUS[k] ? ` <small>(+${BONUS[k]})</small>` : ''}${hero.bonusPts > 0 ? ` <button type="button" class="sp" data-st="${k}" aria-label="${NAMES_ST[k]} 올리기">+</button>` : ''}`; if (el.dataset.h !== h) { el.dataset.h = h; el.innerHTML = h; } } }
      s('cw-bp', hero.bonusPts); const cw = $('charwin'); if (!cw.dataset.sp) { cw.dataset.sp = 1; cw.addEventListener('click', ev => { const b = ev.target.closest('button.sp'); if (b) askYesNo(`${NAMES_ST[b.dataset.st]}을(를) 올리시겠습니까?`, `보너스 포인트 1개를 사용합니다. (남은 포인트 ${hero.bonusPts})`, () => addStat(b.dataset.st)); }); } s('cw-er', Math.floor(STAT.dex / 3)); s('cw-mb', intMB(STAT.int)); s('cw-ml', magicLv()); s('cw-sp', heroSP()); s('cw-mm', '×' + spellMul().toFixed(2)); s('cw-mc', Math.round(spellCritP({ lv: hero.lv }) * 100) + '%'); s('cw-mr', sum('mr') + (BUFF.rmagic > 0 ? 10 : 0)); s('cw-res', `${sum('earthRes') + (BUFF.relem > 0 ? 10 : 0)} / ${sum('waterRes') + (BUFF.relem > 0 ? 10 : 0)} / ${sum('fireRes') + (BUFF.relem > 0 ? 10 : 0)} / ${sum('windRes') + (BUFF.relem > 0 ? 10 : 0)}`);
      if (window.LOOKPV) LOOKPV.kick();
      SLOTS.forEach(([k]) => { const el = $('eq-' + k); if (!el) return; const e = eq[k]; el.innerHTML = e ? ICON(ITEMS[e.id].icon, e.blessed) + (e.blessed ? '<i class="bl-spark"></i>' : '') + (e.en ? `<i class="en${e.en < 0 ? ' neg' : ''}">${e.en > 0 ? '+' : ''}${e.en}</i>` : '') + (e.locked ? '<i class="lk" title="잠김"><svg viewBox="0 0 10 12" aria-hidden="true"><rect x="1" y="5" width="8" height="6.5" rx="1.2" fill="#f2d98a" stroke="#3a2810" stroke-width=".6"/><path d="M3 5V3.6a2 2 0 0 1 4 0V5" fill="none" stroke="#f2d98a" stroke-width="1.4"/></svg></i>' : '') : ''; { const rr = e ? ITEMS[e.id].rar || '일반' : null; el.classList.toggle('rar', !!e); if (e) el.style.setProperty('--rar', rr === '일반' ? '#b9b4a8' : RARITY_C[rr]); } el.dataset.itip = e ? tip(e) : el.dataset.label; el.dataset.ic = e ? rarC(e.id) : '#d9cfb5'; el.removeAttribute('title'); el.classList.toggle('has', !!e); { const t_ = e ? enTierOf(e.id, e.en) : 0; for (let q = 1; q <= 4; q++) el.classList.toggle('eg' + q, t_ === q); } el.ondblclick = () => e && !recentApply() && unequip(e);
        el.onclick = () => { if (tgtScroll && e) { lastApplyT = performance.now(); applyScroll(e); } }; el.onpointerdown = ev => e && holdStart(ev, e); });
    }
  }
  // 시작 장비·소지품
  ['old_sword', 'wood_shield', 'cloth_shirt'].forEach(id => add(id, 1, true));
  bag.slice().forEach(e => { const d = ITEMS[e.id]; eq[slotFor(d)] = e; e.on = slotFor(d); });
  add('red_potion', 10, true); add('return_scroll', 2, true);
  function toggle(id) { const w = $(id); w.hidden = !w.hidden; render(); }
  function setClass(cls) { const C = CLS_DEF[cls]; Object.assign(BASE, C.st); for (const k in BONUS) BONUS[k] = 0; bag.length = 0; for (const k in eq) delete eq[k]; BK.list = [];
    const idOf = x => ITEMS[x] ? x : Object.keys(ITEMS).find(id => ITEMS[id].name === x);
    C.kit.map(idOf).filter(Boolean).forEach(id => add(id, 1, true)); bag.slice().forEach(e => { const d = ITEMS[e.id]; if (!d.slot) return; const sl = slotFor(d); if (!eq[sl]) { eq[sl] = e; e.on = sl; } });
    add('red_potion', 10, true); add('return_scroll', 2, true); if (cls === 'elf') add('arrow', 500, true);
    ['red_potion', 'orange_potion', 'return_scroll', 'tele_scroll', null, null, null, null].forEach((v, k) => { hot[k] = v; }); render(); }
  // 정렬: 착용 장비 → 안 낀 장비 → 소모품 → 기타 (같은 묶음 안에서는 부위 순·이름 순)
  function sortBag() { const so = id => { const d = ITEMS[id], k = SLOTS.findIndex(([s]) => s === d.slot || (d.slot === 'ring' && s.startsWith('ring'))); return k < 0 ? 99 : k; };
    const grp = e => { const d = ITEMS[e.id]; return d.slot ? (e.on ? 0 : 1) : d.use ? 2 : 3; };
    bag.sort((a, b) => grp(a) - grp(b) || so(a.id) - so(b.id) || ITEMS[a.id].name.localeCompare(ITEMS[b.id].name, 'ko'));
    render(); say('인벤토리를 정렬했습니다.', '#9c9682'); }
  // 스킬창: 1서클·2서클 마법(각 3칸) + 기사 기술 5칸. 안 배운 건 흐리게
  let skKey = '';
  let skTab = 'magic';
  function renderSkills() { const gEl = $('sk-grid'); if (!gEl) return; const key = skTab + '|' + hero.lv + '|' + [...LEARNED].join(',') + '|' + Object.keys(AUTOSK).join(','); if (key === skKey) return; skKey = key; gEl.innerHTML = '';
    { const st = document.querySelector('.sk-tab[data-tab="skill"]'); if (st) { st.textContent = CLASS === 'elf' ? '정령마법' : '기술'; st.hidden = CLASS === 'wizard'; } if (CLASS === 'wizard' && skTab === 'skill') skTab = 'magic'; }
    document.querySelectorAll('.sk-tab').forEach(b => { b.setAttribute('aria-selected', b.dataset.tab === skTab); b.onclick = () => { skTab = b.dataset.tab; skKey = ''; renderSkills(); }; });
    const maxC = MAGIC_MAX[CLASS], rows = [];
    if (skTab === 'magic') { for (let c = 1; c <= 10; c++) rows.push([`${c}서클`, MAGIC_LIST.filter(m => m[0] === c).map(m => m[1]), c > maxC]); }
    else if (CLASS === 'elf') { const sp = Object.keys(SK).filter(id => SK[id].kind === 'spirit').sort((a, b) => SK[a].lv - SK[b].lv); for (const lv of [...new Set(sp.map(id => SK[id].lv))]) rows.push([`Lv.${lv}`, sp.filter(id => SK[id].lv === lv), false]); }
    else rows.push(['기사', ['stun', 'reduction', 'bounce', 'solid', 'counter'], CLASS !== 'knight']);
    $('sk-cls').textContent = skTab === 'magic' ? `${CLASS_NAME[CLASS]}: ${maxC}서클까지 (4레벨마다 1서클)` : CLASS === 'elf' ? '요정 전용 · 정령수정으로 배움 (마법상점)' : '기사 전용 · 기술서로 배움';
    for (const [title, ids, banned] of rows) { if (banned && skTab === 'magic' && rows.indexOf(rows.find(r => r[2])) !== rows.findIndex(r => r[0] === title)) continue;
      const r = document.createElement('div'); r.className = 'sk-row' + (banned ? ' banned' : ''); r.innerHTML = `<span class="sk-t">${banned ? '3서클~' : title}</span>`; const box = document.createElement('div'); box.className = 'sk-cells'; r.appendChild(box);
      if (banned) { box.innerHTML = `<span class="sk-ban">${CLASS_NAME[CLASS]}는 배울 수 없음 (요정 6서클 · 마법사 10서클)</span>`; gEl.appendChild(r); continue; }
      for (const id of ids) { const k = SK[id], has = LEARNED.has(id), c = document.createElement('div'); c.className = 'sk' + (has ? ' learned' : ' lock');
        c.innerHTML = ICON('sk_' + id) + (has ? '' : `<b>${k.lv}</b>`) + (AUTOSK[id] ? '<i class="sk-auto" title="자동 사용 중">A</i>' : ''); c.onpointerdown = ev => holdSkill(ev, id); if (has) { c.draggable = true; c.ondragstart = ev => ev.dataTransfer.setData('text/plain', 'sk:' + id); c.ondblclick = () => castSkill(id); }
        const tipH = `<b>${k.name} · ${k.kind === 'magic' ? k.circle + '서클 마법' : k.kind === 'spirit' ? '정령마법' : '기사 기술'}</b>${k.desc}<br>MP ${k.mp} · 재사용 ${k.cd}초<br><span style="color:${has ? '#9fd08a' : '#f08a7a'}">${has ? '배움 · 더블클릭 사용 · 단축키 칸으로 끌어 등록 · 꾹 누르면 상세·자동 사용' : `Lv.${k.lv} 이상 · ${k.book}으로 배움 (${k.shop || (k.kind === 'magic' ? (k.circle <= 3 ? '마법상점' : '판매처 추후') : '장비상점')})`}</span>`;
        c.onmouseenter = () => { const tip = $('stat-tip'); tip.innerHTML = tipH; tip.hidden = false; };
        c.onmousemove = ev => { const tip = $('stat-tip'), w = tip.offsetWidth, h2 = tip.offsetHeight; tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, ev.clientX - w - 12)) + 'px'; tip.style.top = Math.min(innerHeight - h2 - 8, ev.clientY + 12) + 'px'; };
        c.onmouseleave = () => { $('stat-tip').hidden = true; }; box.appendChild(c); }
      gEl.appendChild(r); } }
  // 예/아니오 확인 창
  function askYesNo(q, sub, yes, no) { const w = $('askwin'); $('ask-q').textContent = q; $('ask-sub').textContent = sub || ''; w.hidden = false;
    const close = () => { w.hidden = true; removeEventListener('keydown', key, true); };
    const key = ev => { if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); close(); yes(); } else if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); close(); if (no) no(); } };
    $('ask-yes').onclick = () => { close(); yes(); }; $('ask-no').onclick = () => { close(); if (no) no(); }; addEventListener('keydown', key, true); $('ask-yes').focus(); }
  addEventListener('dragend', () => { if (bagDrag) { bagDrag = false; render(); } }, true);
  function trashAsk(e) { if (!e || !bag.includes(e)) return; const d = ITEMS[e.id];
    if (e.on) { say('착용 중인 아이템은 삭제할 수 없습니다. 먼저 벗어 주세요.', '#f08a7a'); return; } if (e.locked) { say('잠긴 아이템은 삭제할 수 없습니다.', '#f08a7a'); return; } if (e.pet && e.pet.state === 'out') { say('소환 중인 펫의 목걸이는 삭제할 수 없습니다. 먼저 보관해 주세요.', '#f08a7a'); return; }
    const nm = nameOf(e) + (d.stack && e.n > 1 ? ` ${e.n}개` : '');
    askYesNo(`${JOSA(nm, '을', '를')} 삭제하시겠습니까?`, e.pet ? `펫(${e.pet.name} Lv.${e.pet.lv})도 함께 사라집니다. 되돌릴 수 없습니다.` : '삭제한 아이템은 되돌릴 수 없습니다.', () => { if (!bag.includes(e) || e.on || e.locked) return; bag.splice(bag.indexOf(e), 1); BK.list = BK.list.filter(x => bag.includes(x)); if (tgtScroll === e.id && !bag.some(x => x.id === e.id)) tgtScroll = null; render(); say(`${JOSA(nm, '을', '를')} 삭제했습니다.`, '#c9b98a'); }); }
  { const TR = $('inv-trash'); if (TR) { TR.addEventListener('dragover', ev => { if ([...ev.dataTransfer.types].includes('text/x-bag')) { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; TR.classList.add('over'); } }); TR.addEventListener('dragleave', () => TR.classList.remove('over'));
      TR.addEventListener('drop', ev => { TR.classList.remove('over'); const a = ev.dataTransfer.getData('text/x-bag'); if (a === '') return; ev.preventDefault(); ev.stopPropagation(); bagDrag = false; const e = bag[+a]; render(); trashAsk(e); }); } }
  function moveBag(a, b) { bagDrag = false; if (a === b || !bag[a]) return; if (b >= bag.length) { const [e] = bag.splice(a, 1); bag.push(e); } else { const t = bag[a]; bag[a] = bag[b]; bag[b] = t; } render(); }
  function toggleBoth() { const open = $('invwin').hidden || $('charwin').hidden; $('invwin').hidden = !open; $('charwin').hidden = !open; skKey = ''; render(); renderSkills(); }
  // 단축키 칸 F5~F12 (휠로 선택, 휠 클릭·F키로 사용)
  const hot = ['red_potion', 'orange_potion', 'return_scroll', 'tele_scroll', null, null, null, null]; let hsel = 0;
  function useHot(i, onto) { const id = hot[i]; hsel = i; if (!id) return; if (id.startsWith('sk:')) { castSkill(id.slice(3), onto); return; } const e = bag.find(x => x.id === id) || (GOD_INF(id) ? { id, n: 0, on: false } : null); if (!e) { say(`${ITEMS[id].name}이(가) 없습니다.`, '#f08a7a'); return; } use(e); }
  return { tipOf: e => tip(e), removeEntry(e) { if (!bag.includes(e) || e.on) return false; bag.splice(bag.indexOf(e), 1); BK.list = BK.list.filter(x => bag.includes(x)); render(); return true; }, insertEntry(e) { const d = ITEMS[e.id]; const x = d && d.stack ? bag.find(y => y.id === e.id) : null; if (x) x.n += e.n; else bag.push(e); render(); }, askYesNo, sellEntry(e, n) { if (!bag.includes(e) || e.on || e.locked) return false; n = Math.min(n || e.n, e.n); e.n -= n; if (e.n <= 0) bag.splice(bag.indexOf(e), 1); BK.list = BK.list.filter(x => bag.includes(x)); render(); return true; }, bulkOpen, bulkClose, holdStart, setClass, add, take, count, use, ac, dmg, stat: () => STAT, addStat, equipped: s => eq[s] ? eq[s].id : null, render, toggle, toggleBoth, sortBag, useHot, hot: i => hot[i], hotSel: () => hsel, hotMove(d) { hsel = (hsel + d + 8) % 8; }, hotPick(i) { hsel = i; }, hotSwap(a, b) { [hot[a], hot[b]] = [hot[b], hot[a]]; hsel = b; say(`단축키 F${5 + a} ↔ F${5 + b} 자리를 바꿨습니다.`, '#e8d8a8'); }, hotClear(i) { if (!hot[i]) return; const id = hot[i]; hot[i] = null; say(`F${5 + i} 칸의 ${id.startsWith('sk:') ? SK[id.slice(3)].name : ITEMS[id].name} 등록을 해제했습니다.`, '#9c9682'); }, setHot(i, id) { hot[i] = id; say(`${id.startsWith('sk:') ? SK[id.slice(3)].name : ITEMS[id].name}을(를) F${5 + i} 칸에 등록했습니다.`, '#e8d8a8'); }, tick(dt) { cd = Math.max(0, cd - dt); autoTick(dt); }, auto: k => AUTO[k], blessHit, sp, openAuto, cx: sum, wAttr: () => (eq.weapon && eq.weapon.attr) || null, useInvis,
    godScrolls(on) { for (const id of GOD_SCROLLS) { let e = bag.find(x => x.id === id);   // 켜면 종류별로 1칸씩(없을 때만, 표시는 ∞), 끄면 그 1장만 빼서 원래 수로
        if (on) { if (!e) { bag.push({ id, n: 1, on: false, godTemp: true }); } } else if (e && e.godTemp) { e.n -= 1; delete e.godTemp; if (e.n <= 0) bag.splice(bag.indexOf(e), 1); } } render(); },
    trashAsk, setLevelPts(total) { const spent = Object.values(BONUS).reduce((a, b) => a + b, 0); if (spent > total) { for (const k in BONUS) BONUS[k] = 0; hero.bonusPts = total; } else hero.bonusPts = total - spent; render(); }, setAuto, setAutoBuff, autoBuff: id => AUTOBUFF[id], showDetail, hideDetail, showSkill, holdHot, openHot, setAutoSk, autoSk: id => !!AUTOSK[id], applyScroll, targeting: () => tgtScroll, bag: () => bag, nameOf, wPct, maxW, weightNow: weight, enOf: sl => eq[sl] ? (eq[sl].en || 0) : 0,
    dump() { const cl = x => JSON.parse(JSON.stringify(x, (k, v) => k && k[0] === '_' ? undefined : v)); const B = cl(bag.filter(e => !e.godTemp || e.n > 1).map(e => e.godTemp ? Object.assign({}, e, { n: e.n - 1, godTemp: undefined }) : e)); B.forEach(e => { delete e.godTemp; if (e.pet && e.pet.state === 'out') e.pet.state = 'stored'; });
      return { bag: B, bonus: Object.assign({}, BONUS), hot: hot.slice(), auto: cl(AUTO), ab: cl(AUTOBUFF), ask: Object.keys(AUTOSK) }; },
    load(o) { if (!o) return; bag.length = 0; for (const k in eq) delete eq[k]; BK.list = []; for (const e of o.bag || []) { if (!e || !ITEMS[e.id]) continue; if (e.on && !eq[e.on]) eq[e.on] = e; else e.on = false; bag.push(e); }
      for (const k in BONUS) BONUS[k] = (o.bonus && +o.bonus[k]) || 0; if (o.hot) for (let i = 0; i < 8; i++) { const h = o.hot[i]; hot[i] = h && (String(h).startsWith('sk:') ? SK[h.slice(3)] : ITEMS[h]) ? h : null; }
      if (o.auto) for (const k in o.auto) if (AUTO[k]) Object.assign(AUTO[k], o.auto[k]); if (o.ab) for (const k in o.ab) if (k in AUTOBUFF) AUTOBUFF[k] = !!o.ab[k]; for (const k in AUTOSK) delete AUTOSK[k]; if (Array.isArray(o.ask)) for (const k of o.ask) if (skAutoKind(k)) AUTOSK[k] = true; skKey = ''; render(); },
    usePotion() { const e = bag.find(x => x.id === 'red_potion'); if (!e) { say('빨간 물약이 없습니다.', '#f08a7a'); return; } use(e); } };
})();

// ============================================================ 연금술: 같은 등급 장비 3개 → 확률로 한 단계 위 등급의 '내 직업' 장비 (실패하면 재료 사라짐) · 성공하면 전체 공지
window.ALCH = (() => { const $ = id => document.getElementById(id);
  const NEXT = { 일반: '고급', 고급: '희귀', 희귀: '영웅' }, RATE = { 일반: 0.3, 고급: 0.1, 희귀: 0.03 };
  const S = [null, null, null]; let busy = false, outT = 0;
  const isOpen = () => { const w = $('alchwin'); return !!(w && !w.hidden); };
  const rarOf = e => ITEMS[e.id].rar || '일반';
  const valid = e => !!e && INV.bag().includes(e) && !!ITEMS[e.id] && !!ITEMS[e.id].slot && !e.on && !e.locked && !e.pet;
  const clean = () => { for (let k = 0; k < 3; k++) if (S[k] && !valid(S[k])) S[k] = null; };
  const pool = g => CX_LIST.filter(id => { const d = ITEMS[id]; return d.slot && (d.rar || '일반') === g && (!d.cls || d.cls.includes(CLASS)); });
  function why(e) { const d = ITEMS[e.id]; if (!d.slot) return '장비 아이템만 올릴 수 있어요.'; if (e.on) return '착용 중인 장비는 올릴 수 없어요. 먼저 벗어 주세요.'; if (e.locked) return '잠긴 장비는 올릴 수 없어요.';
    if (!NEXT[rarOf(e)]) return '영웅 등급은 더 올릴 수 없어요.'; const g = S.find(x => x && x !== e); if (g && rarOf(g) !== rarOf(e)) return `같은 등급끼리만 조합할 수 있어요. (지금 올린 등급: ${rarOf(g)})`; return ''; }
  const plain = e => !((e.en || 0) > 0 || e.blessed || e.attr);
  const cands = g => INV.bag().filter(e => valid(e) && rarOf(e) === g && plain(e)).sort((a, b) => (ITEMS[a.id].price || 0) - (ITEMS[b.id].price || 0));
  function fill(g) { if (busy) return; S.fill(null); const L = cands(g).slice(0, 3); L.forEach((e, k) => { S[k] = e; }); if (L.length < 3) say(L.length ? `${g} 장비가 ${L.length}개뿐이에요. (강화·축복·속성이 붙은 장비는 일괄 등록에서 빠져요 · 직접 올릴 수 있어요)` : `일괄 등록할 ${g} 장비가 없어요. (착용 중·잠긴·강화·축복·속성 장비는 빠져요)`, '#f0c080'); render(); INV.render(); }
  function put(k, e) { clean(); if (!e || !INV.bag().includes(e)) return; const w = why(e); if (w) { say(w, '#f08a7a'); return; } const i = S.indexOf(e); if (i >= 0) S[i] = null; if (k == null || S[k]) k = S.indexOf(null); if (k < 0) { say('칸이 가득 찼어요. 올린 장비를 눌러 빼 주세요.', '#f08a7a'); return; } S[k] = e; render(); INV.render(); }
  function toggle(e) { clean(); const i = S.indexOf(e); if (i >= 0) { S[i] = null; render(); INV.render(); } else put(null, e); }
  function render() { if (!isOpen()) return; clean(); const el = [...document.querySelectorAll('#alchwin .al-slot')];
    el.forEach((c, k) => { const e = S[k]; c.innerHTML = e ? ICON(ITEMS[e.id].icon, e.blessed) + (e.en ? `<b>${e.en > 0 ? '+' : ''}${e.en}</b>` : '') : ''; c.dataset.itip = e ? INV.tipOf(e) : '빈 칸 — 가방에서 장비를 클릭하거나 끌어다 놓으세요'; c.style.borderColor = e ? RARITY_C[rarOf(e)] : ''; });
    const n = S.filter(Boolean).length, g = S.find(x => x) ? rarOf(S.find(x => x)) : null, nx = g && NEXT[g];
    $('al-info').innerHTML = !g ? '가방에서 <b>같은 등급</b>의 장비 3개를 골라 주세요.' : `<span style="color:${RARITY_C[g]}">${g}</span> 장비 ${n}/3 → 성공하면 <span style="color:${RARITY_C[nx]}">${nx}</span> 등급 ${CLASS_NAME[CLASS]} 장비 · 성공 확률 <b>${Math.round(RATE[g] * 100)}%</b>` + (S.some(x => x && ((x.en || 0) > 0 || x.blessed || x.attr)) ? '<br><span style="color:#f0a080">강화·축복·속성이 붙은 장비가 있어요. 실패하면 함께 사라져요.</span>' : '');
    $('al-go').disabled = busy || n < 3; document.querySelectorAll('#alchwin [data-alg]').forEach(b => { const c = cands(b.dataset.alg).length; b.querySelector('b').textContent = c; b.disabled = busy || c === 0; }); }
  function showOut(id, ok) { const o = $('al-out'); clearTimeout(outT); o.classList.remove('ok', 'fail', 'spin'); void o.offsetWidth; if (id) { o.innerHTML = ICON(ITEMS[id].icon); o.style.borderColor = RARITY_C[ITEMS[id].rar || '일반']; o.dataset.itip = INV.tipOf({ id, n: 1, on: false }); } else { o.textContent = ok === false ? '✕' : '?'; o.style.borderColor = ''; delete o.dataset.itip; }
    if (ok === true) o.classList.add('ok'); else if (ok === false) o.classList.add('fail'); if (ok != null) outT = setTimeout(() => showOut(null), 6000); }
  function go() { clean(); if (busy || S.some(x => !x)) return; const g = rarOf(S[0]); if (S.some(x => rarOf(x) !== g) || !NEXT[g]) return; const nx = NEXT[g], P = pool(nx); if (!P.length) { say(`${CLASS_NAME[CLASS]}가 얻을 수 있는 ${nx} 장비가 없어요.`, '#f08a7a'); return; }
    INV.askYesNo(`${g} 장비 3개로 조합하시겠습니까?`, `성공 확률 ${Math.round(RATE[g] * 100)}% · 성공하면 ${nx} 등급 ${CLASS_NAME[CLASS]} 장비를 얻고, 실패하면 재료 3개가 사라집니다.`, () => { clean(); if (busy || S.some(x => !x)) return;
      const mats = S.slice(); for (const e of mats) if (!INV.removeEntry(e)) { say('재료가 바뀌어서 조합을 취소했어요.', '#f08a7a'); render(); return; }
      S.fill(null); busy = true; render(); INV.render(); const o = $('al-out'); o.classList.remove('ok', 'fail'); o.textContent = '…'; o.classList.add('spin'); spellFx('enchant', hero, '#c9a0ff');
      if (AC && SFX_ON) { const t0 = AC.currentTime; for (let q = 0; q < 6; q++) tone(t0 + q * 0.14, 'triangle', 520 + q * 110, 560 + q * 110, 0.14, 0.05); }
      setTimeout(() => { busy = false; const ok = Math.random() < RATE[g];
        if (ok) { const id = P[Math.floor(Math.random() * P.length)], it = ITEMS[id]; INV.add(id, 1, true); TELE.ev('alch', { g, ok: 1, id }); showOut(id, true); spellFx('enbless', hero, RARITY_C[nx]);
          say(`연금술 성공! [${nx}] ${JOSA(it.name, '을', '를')} 얻었습니다!`, RARITY_C[nx]); const msg = `${PNAME()}님이 연금술로 [${nx}] ${JOSA(it.name, '을', '를')} 만들어 냈습니다!`; announce(msg, RARITY_C[nx]); NET.announceAll(msg);
          if (AC && SFX_ON) [784, 988, 1175, 1568].forEach((f, k) => tone(AC.currentTime + k * 0.09, 'triangle', f, f, 0.35, 0.12)); }
        else { TELE.ev('alch', { g, ok: 0 }); showOut(null, false); spellFx('puff', hero, '#8a7a6a'); say('연금술에 실패했습니다... 재료가 모두 사라졌습니다.', '#c9b98a'); if (AC && SFX_ON) { tone(AC.currentTime, 'sawtooth', 300, 110, 0.4, 0.07); nz(AC.currentTime, 0.3, 900, 200, 0.12); } }
        render(); INV.render(); }, 1300); }); }
  function open() { const w = $('alchwin'); if (!w) return; if (!w.hidden) { w.hidden = true; return; } w.hidden = false; if ($('invwin').hidden) { $('invwin').hidden = false; INV.render(); } render(); }
  { const b = $('btn-alch'); if (b) b.onclick = open; const go_ = $('al-go'); if (go_) go_.onclick = go; const cl = $('al-clear'); if (cl) cl.onclick = () => { S.fill(null); render(); INV.render(); }; document.querySelectorAll('#alchwin [data-alg]').forEach(b => b.onclick = () => fill(b.dataset.alg));
    document.querySelectorAll('#alchwin .al-slot').forEach(c => { const k = +c.dataset.k; c.onclick = () => { if (S[k]) { S[k] = null; render(); INV.render(); } };
      c.addEventListener('dragover', ev => { if ([...ev.dataTransfer.types].includes('text/x-bag')) { ev.preventDefault(); c.classList.add('over'); } }); c.addEventListener('dragleave', () => c.classList.remove('over'));
      c.addEventListener('drop', ev => { c.classList.remove('over'); const a = ev.dataTransfer.getData('text/x-bag'); if (a === '') return; ev.preventDefault(); ev.stopPropagation(); put(k, INV.bag()[+a]); }); });
    const w = $('alchwin'); if (w) new MutationObserver(() => { if (w.hidden) INV.render(); else render(); }).observe(w, { attributes: true, attributeFilter: ['hidden'] }); }
  return { open: isOpen, toggle, put, fill, has: e => S.includes(e), render, rates: () => Object.assign({}, RATE) }; })();

document.addEventListener('click', ev => { const t = ev.target, lb = t && t.closest && t.closest('#huntwin label.hw-row'); if (!lb) return; if (/^(INPUT|SELECT|OPTION|BUTTON|TEXTAREA)$/.test(t.tagName)) return; ev.preventDefault(); }, true);
// ============================================================ 마을 · 월드맵
const TOWN = (() => {
  const N = MAP, VPX = META.S * Math.cos(Math.PI / 6);
  const P = (x, z, y = 0) => { const [px, py] = W2P(x, z); return [px, py - y * VPX]; };
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const vnoise = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1); return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy; };
  const fbm = (x, y) => vnoise(x, y) * 0.55 + vnoise(x * 2.1, y * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3) * 0.15;

  // ---- 건물 배치 (i,j = 북쪽 모서리, w×d 타일). door: 'i' = 오른쪽 앞면, 'j' = 왼쪽 앞면
  const SHOPS = [
    { id: 'general', name: '잡화상점', npc: '잡화상인 판도라', icon: 'potion', i: 3, j: 13, w: 6, d: 6, h: 3.5, door: 'i', roof: [122, 58, 40], npcType: 'f',
      hello: '어서 오세요! 사냥 전에 물약은 넉넉히 챙기셨나요?',
      tabs: [['물약·주문서', [['빨간 물약', 25, 'HP를 조금 회복'], ['주홍 물약', 100, 'HP를 많이 회복'], ['맑은 물약', 300, 'HP를 크게 회복'], ['초록 물약', 200, '1단 가속 1.2배 · 10분'], ['용기의 물약', 500, '2단 가속 1.4배 · 10분'], ['귀환 주문서', 40, '마을로 즉시 귀환'], ['화살', 2, '요정 전용 · 활을 쏠 때마다 1개씩 소모', 'arrow'], ['순간이동 주문서', 60, '같은 지역 임의 이동'], ['능력치 초기화 주문서', 5000, '보너스 능력치 다시 찍기'], ['마나 회복 물약', 120, 'MP 자연 회복 초당 +0.5 · 10분'], ['양초', 30, '10분 동안 밤 시야가 넓어짐', 'candle'], ['해독제', 60, '독을 바로 치료', 'antidote'], ['부활 주문서', 300, '쓰러진 펫·동료 부활']]], ['특별', [['아르카의 마법주머니', 10000, '열면 강화·축복 주문서 또는 모든 직업의 희귀~영웅 장비 중 하나가 무작위로 나옴 (확률은 아이템 상세 정보)', 'arka_pouch']]], ['장신구', CX_SHOP.general.map(cxRow)]] },
    { id: 'equip', name: '장비상점', npc: '장비상인 발신', icon: 'sword', i: 3, j: 4, w: 6, d: 6, h: 3.5, door: 'i', roof: [74, 79, 92], npcType: 'm',
      hello: '좋은 무기가 좋은 기사를 만들지. 천천히 둘러보게.',
      get tabs() { return [['무기', [['한손검', 800, '공용 · 공격 1~8 · 처음 쓰기 좋은 검'], ...CX_SHOP.weapon.map(cxRow)]], ['방어구', CX_SHOP.armor.map(cxRow)]]; } },
    { id: 'magic', name: '마법상점', npc: '마법상인 엘리스', icon: 'book', i: 11, j: 2, w: 6, d: 6, h: 3.5, door: 'j', roof: [61, 63, 110], npcType: 'f',
      hello: '마력의 흐름이 느껴지나요? 1서클 마법부터 시작해 보세요.',
      get tabs() { return [['마법서', MAGIC_LIST.filter(m => m[0] <= 3).map(([c, id, name, desc]) => [SK[id].book, ({ heal: 300, shieldm: 400, ebolt: 500, decwt: 800, icedagger: 1500, cure: 1000, xheal: 3500, turnund: 3000, farrow: 4000 })[id] || c * 1200, `${c}서클 · Lv.${CIRCLE_LV(c)} · ${desc}${c > MAGIC_MAX[CLASS] ? ` · ${CLASS_NAME[CLASS]} 불가 (요정·마법사)` : ''}`])],
        ['기술서', [['기술서: 스턴', 500, '기사 기술 · Lv.5 · ' + SK.stun.desc], ['기술서: 리덕션 아머', 2000, '기사 기술 · Lv.15 · ' + SK.reduction.desc]]],
        ['정령수정', ['resist_magic', 'body_mind', 'tele_tree', 'clear_mind', 'resist_elem'].map((id, k) => [SK[id].book, [1000, 1000, 1500, 3000, 3000][k], `정령마법 · Lv.${SK[id].lv} · 요정 전용${CLASS !== 'elf' ? ` (${CLASS_NAME[CLASS]} 불가)` : ''} · ${SK[id].desc}`])]]; } },
    { id: 'pet', name: '펫상점', npc: '펫상인 루피', icon: 'paw', i: 19, j: 2, w: 6, d: 6, h: 3.5, door: 'j', roof: [63, 106, 58], npcType: 'f',
      hello: '든든한 동료가 필요하신가요? 도베르만이 아주 영리하답니다. 보관소의 펫도 여기서 찾고 맡길 수 있어요.',
      tabs: [['펫 구매', [['펫 목걸이(Lv.1 도베르만)', 100, '도베르만 · Lv.1 · 배고픔 없음 · 사서 \'펫을 찾는다\'로 소환']]], ['펫을 찾는다', 'find'], ['펫을 맡긴다', 'store']] },
  ];
  const STORAGE = { id: 'storage', name: '창고', npc: '창고지기 하딘', icon: 'chest',  door: 'i', roof: [107, 82, 50], npcType: 'm',
      hello: '맡길 물건이 있나? 여기 두면 다른 캐릭터도 꺼내 쓸 수 있다네.', storage: true };
  // 상점 칸 좌표: u = 문에서 안쪽으로 0..5, v = 옆으로 0..5 (문은 u=0, v=3)
  const L2T = (b, u, v) => b.door === 'i' ? [b.i + 5 - u, b.j + v] : [b.i + v, b.j + 5 - u];
  SHOPS.forEach(b => { [b.di, b.dj] = L2T(b, -1, 3); b.dIn = L2T(b, 0, 3); b.npcT = L2T(b, 4, 3); b.stand = L2T(b, 2, 3); b.open = false;
    b.img = {}; ['ext_open', 'int_back', 'int_counter', 'int_front'].forEach(k => { const im2 = new Image(); im2.src = `assets/town/${b.id}_${k}.webp`; b.img[k] = im2; }); });
  const STORE_NPC = { i: 16, j: 13 }, STORE_PROPS = { x: 18, z: 13 };
  // 테스트 상점 (우물 옆): 지금 게임에 있는 모든 장비를 0골드에 — ITEMS에서 매번 새로 목록을 만들어 새 장비도 자동 포함
  const TEST_NPC = { i: 13, j: 15 }, SELL_NPC = { i: 19, j: 14 };   // 아덴상단: 창고 옆
  const RAR_ORD = { '일반': 0, '고급': 1, '희귀': 2, '영웅': 3 };
  const TEST_GROUPS = [['무기', ['weapon']], ['갑옷·방패', ['armor', 'shield', 'shirt']], ['투구·장갑·부츠', ['helm', 'gloves', 'boots']], ['망토·벨트', ['cloak', 'belt']], ['장신구', ['ring', 'amulet']]];
  const testInfo = d => [d.rar || '일반', d.dmg ? `공격 ${d.dmg[0]}~${d.dmg[1]}` : '', d.ac ? `방어 +${d.ac}` : '', d.lv ? `Lv.${d.lv}` : '', d.codex ? cxClsName(d) : ''].filter(Boolean).join(' · ');
  const TESTSHOP = { id: 'test', name: '테스트 상점', npc: '테스트 상인 (개발용)', icon: 'chest', npcType: 'f',
    hello: '개발 테스트용 상점이에요. 지금 구현된 모든 장비를 0골드에 가져가세요!',
    get tabs() { const all = Object.keys(ITEMS).filter(id => ITEMS[id].slot); const used = new Set();
      const tabs = TEST_GROUPS.map(([nm, slots]) => [nm, all.filter(id => slots.includes(ITEMS[id].slot) && used.add(id)).sort((a, b) => (RAR_ORD[ITEMS[a].rar] || 0) - (RAR_ORD[ITEMS[b].rar] || 0) || (ITEMS[a].lv || 0) - (ITEMS[b].lv || 0)).map(id => [ITEMS[id].name, 0, testInfo(ITEMS[id]), id])]);
      const rest = all.filter(id => !used.has(id)); if (rest.length) tabs.push(['기타', rest.map(id => [ITEMS[id].name, 0, testInfo(ITEMS[id]), id])]); return tabs; } };
  const storeImg = new Image(); storeImg.src = 'assets/town/storage_props.webp';
  const PORTAL = { i: 24, j: 15 };
  const WELL = { x: 15, z: 15 };
  // 우물: 건물과 같은 카메라·조명으로 렌더한 그림(well.webp). ax/ay = 그림 안에서 우물 중심(바닥) 위치(원본 픽셀). 그림이 안 읽히면 drawWell로 그림
  const wellImg = new Image(); wellImg.src = 'assets/town/well.webp'; const WELL_AX = 130, WELL_AY = 281;
  const SPAWN = [15, 18];

  // ---- 막힘 지도
  const TB = Array.from({ length: N }, () => Array(N).fill(0));
  for (let k = 0; k < N; k++) { TB[0][k] = TB[N - 1][k] = TB[k][0] = TB[k][N - 1] = 1; }
  SHOPS.forEach(b => { for (let j = b.j; j < b.j + b.d; j++) for (let i = b.i; i < b.i + b.w; i++) TB[j][i] = 1;
    for (let u = 1; u <= 4; u++) for (let v = 1; v <= 4; v++) { const [i, j] = L2T(b, u, v); TB[j][i] = 0; }
    [[3, 2], [3, 3], [3, 4], [4, 3]].forEach(([u, v]) => { const [i, j] = L2T(b, u, v); TB[j][i] = 1; });   // 카운터·상인 자리
  });
  const setDoor = (b, open) => { b.open = open; const [i, j] = b.dIn; TB[j][i] = open ? 0 : 1; };
  [[17, 12], [18, 12], [17, 13], [18, 13]].forEach(([i, j]) => TB[j][i] = 1);      // 창고 소품
  TB[STORE_NPC.j][STORE_NPC.i] = 1; TB[SELL_NPC.j][SELL_NPC.i] = 1;
  SHOPS.forEach(b => setDoor(b, true));   // 문 없음: 항상 열린 입구
  for (let j = 14; j <= 15; j++) for (let i = 14; i <= 15; i++) TB[j][i] = 1;            // 우물
  // ---- 가장자리 나무·덤불
  const TPROPS = [];
  for (let k = 0; k < N; k += 2) { [[k, 0], [0, k], [k, N - 1], [N - 1, k]].forEach(([i, j]) => TPROPS.push({ type: 'tree', v: (i * 3 + j) % 3, i, j })); }
  [[10, 10], [18, 9], [26, 6], [9, 23], [24, 21], [21, 25], [12, 26], [26, 11]].forEach(([i, j], k) => { TPROPS.push({ type: 'bush', v: k % 3, i, j }); TB[j][i] = 1; });
  [[26, 26], [26, 3], [3, 25], [27, 8]].forEach(([i, j], k) => { TPROPS.push({ type: 'tree', v: k % 3, i, j }); TB[j][i] = 1; });

  // ---- 바닥 (돌길·광장·잔디) 생성: 사냥터 바닥과 같은 투영 40px/m
  const segDist = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz; let t = ((x - a[0]) * dx + (z - a[1]) * dz) / (L || 1); t = Math.max(0, Math.min(1, t)); const ex = a[0] + dx * t - x, ez = a[1] + dz * t - z; return Math.sqrt(ex * ex + ez * ez); };
  const roads = SHOPS.map(b => [[b.di + 0.5, b.dj + 0.5], [15, 15]]).concat([[[PORTAL.i + 0.5, PORTAL.j + 0.5], [15, 15]], [[15, 15], [15, 28]]]);
  function stoneAt(x, z) {                                                        // 0=잔디 … 1=돌
    const pl = Math.hypot(x - 15, z - 15) - (6.6 + (fbm(x * 0.7, z * 0.7) - 0.5) * 1.4);
    let rd = 9; for (const [a, b] of roads) rd = Math.min(rd, segDist(x, z, a, b));
    const r = Math.min(pl, rd - 1.05 - (fbm(x * 1.3 + 9, z * 1.3) - 0.5) * 0.6);
    return Math.max(0, Math.min(1, 0.5 - r * 2.2));
  }
  let ground = null;
  function buildGround() {
    const Wd = G.W, Hd = G.H, c = document.createElement('canvas'); c.width = Wd; c.height = Hd;
    const g = c.getContext('2d'), img = g.createImageData(Wd, Hd), D = img.data;
    for (let py = 0; py < Hd; py++) for (let px = 0; px < Wd; px++) {
      const [x, z] = P2W(px + 0.5, py + 0.5), o = (py * Wd + px) * 4;
      if (x < 0 || z < 0 || x >= N || z >= N) { D[o + 3] = 0; continue; }
      const st = stoneAt(x, z), n = fbm(x * 3, z * 3), n2 = vnoise(x * 11, z * 11);
      // 잔디 / 흙
      const dirt = Math.max(0, fbm(x * 0.35 + 30, z * 0.35) - 0.55) * 3;
      let r = 52 + n * 34 + n2 * 14, gg = 74 + n * 40 + n2 * 16, b = 28 + n * 16;
      r += dirt * 40; gg += dirt * 8; b += dirt * 14;
      if (st > 0) {
        const u = x * 3.6, v = z * 3.6, cu = Math.floor(u), cv = Math.floor(v); let f1 = 9, f2 = 9, id = 0;
        for (let a = -1; a <= 1; a++) for (let bb = -1; bb <= 1; bb++) { const hx = cu + a, hy = cv + bb, jx = hx + 0.15 + hash(hx, hy) * 0.7, jy = hy + 0.15 + hash(hy, hx + 7) * 0.7, dd = Math.hypot(u - jx, v - jy);
          if (dd < f1) { f2 = f1; f1 = dd; id = hash(hx * 3 + 1, hy * 5 + 2); } else if (dd < f2) f2 = dd; }
        const edge = f2 - f1, base = 112 + id * 46 + n2 * 14, warm = id * 14;
        let sr = base + warm, sg = base + warm * 0.6 - 4, sb = base - 10;
        const lit = 1.08 - f1 * 0.38;
        sr *= lit; sg *= lit; sb *= lit;
        if (edge < 0.09) { const m = edge / 0.09; sr = 46 + sr * 0.35 * m; sg = 44 + sg * 0.35 * m; sb = 36 + sb * 0.35 * m; }
        r = r * (1 - st) + sr * st; gg = gg * (1 - st) + sg * st; b = b * (1 - st) + sb * st;
      }
      D[o] = Math.min(255, r); D[o + 1] = Math.min(255, gg); D[o + 2] = Math.min(255, b); D[o + 3] = 255;
    }
    g.putImageData(img, 0, 0); edgeFade(g, [W2P(0, 0), W2P(N, 0), W2P(N, N), W2P(0, N)], 26);
    ground = c;
  }

  // ---- 건물 그림 (절차적: 석조 기단 · 회벽 · 목재 골조 · 기와 지붕 · 문 · 간판)
  const rgb = (a, k = 1) => `rgb(${a.map(v => Math.max(0, Math.min(255, Math.round(v * k)))).join(',')})`;
  function face(g, origin, u, w, h, light, opt) {           // 벽면을 (s,t) 미터 좌표로 그림
    g.save(); g.translate(origin[0], origin[1]); g.transform(u[0], u[1], 0, -VPX, 0, 0);
    g.fillStyle = rgb([214, 198, 164], light); g.fillRect(0, 0, w, h);
    for (let s = 0; s < w; s += 0.18) for (let t = 0.55; t < h; t += 0.18) { const n = hash(Math.round(s * 50 + w * 7), Math.round(t * 50)); if (n > 0.72) { g.fillStyle = `rgba(80,60,40,${(n - 0.72) * 0.35})`; g.fillRect(s, t, 0.18, 0.18); } }
    g.fillStyle = rgb([120, 112, 100], light); g.fillRect(0, 0, w, 0.55);           // 석조 기단
    g.strokeStyle = rgb([70, 64, 56], light); g.lineWidth = 0.04;
    for (let s = 0; s < w; s += 0.45) { g.strokeRect(s + (Math.floor(s / 0.45) % 2) * 0.2, 0, 0.45, 0.27); g.strokeRect(s, 0.27, 0.45, 0.28); }
    const beam = rgb([74, 48, 30], light); g.fillStyle = beam;                     // 목재 골조
    g.fillRect(0, 0.55, 0.16, h - 0.55); g.fillRect(w - 0.16, 0.55, 0.16, h - 0.55); g.fillRect(0, h - 0.16, w, 0.16); g.fillRect(0, 0.55, w, 0.12); g.fillRect(0, h * 0.62, w, 0.12);
    for (let s = 1; s < w; s += 1.33) g.fillRect(s, 0.55, 0.12, h - 0.55);
    g.lineWidth = 0.1; g.strokeStyle = beam; g.beginPath(); g.moveTo(0.2, 0.7); g.lineTo(1.2, h * 0.62); g.moveTo(w - 0.2, 0.7); g.lineTo(w - 1.2, h * 0.62); g.stroke();
    if (opt.windows) for (const s of opt.windows) { g.fillStyle = rgb([40, 34, 30], light); g.fillRect(s, h * 0.68, 0.6, 0.62); g.fillStyle = 'rgba(255,214,140,.55)'; g.fillRect(s + 0.06, h * 0.7, 0.48, 0.5); g.fillStyle = beam; g.fillRect(s + 0.27, h * 0.68, 0.06, 0.62); g.fillRect(s - 0.25, h * 0.68, 0.22, 0.62); g.fillRect(s + 0.63, h * 0.68, 0.22, 0.62); }
    if (opt.door != null) { const s = opt.door; g.fillStyle = rgb([58, 38, 24], light); g.fillRect(s - 0.62, 0, 1.24, 2.15);
      g.fillStyle = rgb([104, 70, 42], light); g.fillRect(s - 0.52, 0, 1.04, 2.02); g.strokeStyle = rgb([60, 40, 24], light); g.lineWidth = 0.05;
      for (let k = -0.35; k <= 0.36; k += 0.26) { g.beginPath(); g.moveTo(s + k, 0); g.lineTo(s + k, 2.02); g.stroke(); }
      g.fillStyle = rgb([40, 36, 30], light); g.fillRect(s - 0.52, 0.5, 1.04, 0.07); g.fillRect(s - 0.52, 1.5, 1.04, 0.07); g.fillStyle = '#c9a24a'; g.fillRect(s + 0.3, 1.0, 0.08, 0.08); }
    g.restore();
  }
  function quad(g, pts, fill) { g.beginPath(); pts.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fillStyle = fill; g.fill(); }
  function icon(g, kind, cx, cy, s) {
    g.save(); g.translate(cx, cy); g.scale(s, s); g.lineJoin = 'round';
    if (kind === 'potion') { g.fillStyle = '#d8d2c0'; g.fillRect(-1.2, -6, 2.4, 2.4); g.fillStyle = '#8a5a30'; g.fillRect(-1.6, -7, 3.2, 1.4); g.fillStyle = '#c42a22'; g.beginPath(); g.arc(0, 0.5, 4.2, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(-1.4, -0.8, 1.1, 0, 7); g.fill(); }
    if (kind === 'sword') { g.fillStyle = '#8a8f99'; g.beginPath(); g.moveTo(-1, -7); g.lineTo(1, -7); g.lineTo(1, 3); g.lineTo(-1, 3); g.fill(); g.beginPath(); g.moveTo(-1, -7); g.lineTo(0, -8.5); g.lineTo(1, -7); g.fill();
      g.fillStyle = '#c9a24a'; g.fillRect(-3.4, 3, 6.8, 1.3); g.fillStyle = '#5a3a22'; g.fillRect(-0.8, 4.3, 1.6, 2.8); g.fillStyle = '#c9a24a'; g.beginPath(); g.arc(0, 7.6, 1.1, 0, 7); g.fill();
      g.fillStyle = '#7a2a22'; g.beginPath(); g.moveTo(3, -2); g.lineTo(7.5, -2); g.lineTo(7.5, 2); g.quadraticCurveTo(7.5, 5.5, 5.25, 7); g.quadraticCurveTo(3, 5.5, 3, 2); g.fill(); g.fillStyle = '#c9a24a'; g.fillRect(4.9, -1.2, 0.7, 6.5); }
    if (kind === 'book') { g.fillStyle = '#3b2f6e'; g.fillRect(-5, -5, 10, 10); g.fillStyle = '#e6dcc0'; g.fillRect(-4.2, 4.2, 8.4, 1.2); g.fillStyle = '#d8b850';
      g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 1.4 : 3.4; g.lineTo(Math.cos(a) * r, Math.sin(a) * r - 0.4); } g.fill(); }
    if (kind === 'chest') { g.fillStyle = '#7a4e26'; g.fillRect(-6, -2, 12, 7); g.beginPath(); g.moveTo(-6, -2); g.quadraticCurveTo(0, -7.5, 6, -2); g.fill(); g.fillStyle = '#c9a24a'; g.fillRect(-6, -2.4, 12, 1); g.fillRect(-1.1, -1.5, 2.2, 3); g.fillStyle = '#2a1a10'; g.fillRect(-0.4, -0.6, 0.8, 1.2); }
    if (kind === 'paw') { g.fillStyle = '#3a2a1e'; g.beginPath(); g.ellipse(0, 2.2, 3.6, 3, 0, 0, 7); g.fill(); [[-4, -2.2], [-1.5, -4.6], [1.5, -4.6], [4, -2.2]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 1.4, 1.8, 0, 0, 7); g.fill(); }); }
    g.restore();
  }
  function buildShop(b) {
    const o = 0.35, rh = Math.min(b.w, b.d) * 0.55, h = b.h;
    const pts = { A: P(b.i, b.j), B: P(b.i + b.w, b.j), C: P(b.i + b.w, b.j + b.d), D: P(b.i, b.j + b.d) };
    const all = [];
    const roofF = [P(b.i - o, b.j + b.d + o, h - 0.1), P(b.i + b.w + o, b.j + b.d + o, h - 0.1), P(b.i + b.w + o, b.j + b.d / 2, h + rh), P(b.i - o, b.j + b.d / 2, h + rh)];
    const roofB = [P(b.i - o, b.j - o, h - 0.1), P(b.i + b.w + o, b.j - o, h - 0.1), P(b.i + b.w + o, b.j + b.d / 2, h + rh), P(b.i - o, b.j + b.d / 2, h + rh)];
    const gable = [P(b.i + b.w, b.j, h), P(b.i + b.w, b.j + b.d, h), P(b.i + b.w, b.j + b.d / 2, h + rh)];
    [pts.A, pts.B, pts.C, pts.D, ...roofF, ...roofB, P(b.i + b.w + 1.2, b.j + b.d + 1.2, 3.2)].forEach(p => all.push(p));
    const minx = Math.floor(Math.min(...all.map(p => p[0]))) - 24, maxx = Math.ceil(Math.max(...all.map(p => p[0]))) + 24;
    const miny = Math.floor(Math.min(...all.map(p => p[1]))) - 24, maxy = Math.ceil(Math.max(...all.map(p => p[1]))) + 10;
    const c = document.createElement('canvas'); c.width = maxx - minx; c.height = maxy - miny; const g = c.getContext('2d');
    g.translate(-minx, -miny);
    quad(g, roofB, rgb(b.roof, 0.62));
    const uJ = [(pts.C[0] - pts.D[0]) / b.w, (pts.C[1] - pts.D[1]) / b.w], uI = [(pts.B[0] - pts.C[0]) / b.d, (pts.B[1] - pts.C[1]) / b.d];
    face(g, pts.D, uJ, b.w, h, 1.0, { door: b.door === 'j' ? b.w / 2 : null, windows: b.door === 'j' ? [0.5, b.w - 1.1] : [0.6, b.w / 2 - 0.3, b.w - 1.2] });
    face(g, pts.C, uI, b.d, h, 0.74, { door: b.door === 'i' ? b.d / 2 : null, windows: b.door === 'i' ? [0.5, b.d - 1.1] : [0.6, b.d - 1.2] });
    quad(g, gable, rgb([196, 178, 146], 0.72)); g.strokeStyle = rgb([74, 48, 30], 0.72); g.lineWidth = 2; g.beginPath(); g.moveTo(...gable[0]); g.lineTo(...gable[2]); g.lineTo(...gable[1]); g.stroke();
    quad(g, roofF, rgb(b.roof, 1.0));
    g.strokeStyle = rgb(b.roof, 0.6); g.lineWidth = 1;                          // 기와 줄
    for (let k = 1; k < 7; k++) { const t = k / 7, a = roofF[0].map((v, q) => v + (roofF[3][q] - v) * t), e = roofF[1].map((v, q) => v + (roofF[2][q] - v) * t); g.beginPath(); g.moveTo(...a); g.lineTo(...e); g.stroke(); }
    for (let k = 1; k < b.w * 3; k++) { const t = k / (b.w * 3), a = roofF[0].map((v, q) => v + (roofF[1][q] - v) * t), e = roofF[3].map((v, q) => v + (roofF[2][q] - v) * t); g.strokeStyle = `rgba(0,0,0,${0.12 + 0.1 * hash(k, b.i)})`; g.beginPath(); g.moveTo(...a); g.lineTo(...e); g.stroke(); }
    g.strokeStyle = rgb(b.roof, 0.45); g.lineWidth = 2.2; g.beginPath(); g.moveTo(...roofF[3]); g.lineTo(...roofF[2]); g.stroke();
    // 굴뚝
    const ch = [b.i + b.w * 0.72, b.j + b.d * 0.35]; const c0 = P(ch[0], ch[1], h + rh * 0.55), c1 = P(ch[0] + 0.5, ch[1], h + rh * 0.55), c2 = P(ch[0] + 0.5, ch[1], h + rh + 0.9), c3 = P(ch[0], ch[1], h + rh + 0.9);
    quad(g, [c0, c1, c2, c3], '#6e665c'); g.fillStyle = '#3a342e'; g.fillRect(c3[0], c3[1] - 2, c2[0] - c3[0], 3);
    // 간판 (문 옆 기둥 + 아이콘 판)
    const sp = b.door === 'i' ? [b.i + b.w + 0.55, b.dj - 1.0] : [b.di - 1.0, b.j + b.d + 0.55];
    const base = P(sp[0], sp[1]), top = P(sp[0], sp[1], 2.6);
    g.fillStyle = '#4a3020'; g.fillRect(base[0] - 1.5, top[1], 3, base[1] - top[1]); g.fillRect(base[0] - 1.5, top[1], 15, 2.5);
    g.strokeStyle = '#2a1a10'; g.lineWidth = 1; g.beginPath(); g.moveTo(base[0] + 4, top[1] + 2); g.lineTo(base[0] + 4, top[1] + 6); g.moveTo(base[0] + 12, top[1] + 2); g.lineTo(base[0] + 12, top[1] + 6); g.stroke();
    const bx = base[0] - 3, by = top[1] + 6; g.fillStyle = '#2a1c12'; g.fillRect(bx, by, 22, 22); g.fillStyle = '#8a6440'; g.fillRect(bx + 1, by + 1, 20, 20); g.fillStyle = '#e8dcc0'; g.fillRect(bx + 3, by + 3, 16, 16);
    icon(g, b.icon, bx + 11, by + 11, 0.95);
    b.sprite = c; b.ox = minx; b.oy = miny; b.box = [minx, miny, maxx, maxy];
  }

  // ---- 마을 주민 NPC
  const NPCS = [];
  const SHEET = { W: 288, H: 320, ax: 144, ay: 256, s: 0.43 };
  const npcImg = {}; ['villager_m', 'villager_f'].forEach(k => ['idle', 'walk'].forEach(a => { const i = new Image(); i.src = IMG[k + '_' + a] || ''; npcImg[k + '_' + a] = i; }));
  const NAMES = [['m', '농부 톰'], ['f', '빵집 딸 메리'], ['m', '대장간 견습생 한스'], ['f', '꽃 파는 소녀 릴리'], ['m', '떠돌이 음유시인'], ['f', '우유 배달부 안나']];
  const TALK = ['요즘 들판에 여우가 부쩍 늘었어요.', '마법상점 엘리스 씨는 정말 똑똑하다니까요.', '방패는 기사의 자존심이죠!', '오늘은 시장이 북적이네요.', '이야기섬 쪽으로 가면 초보 모험가가 많대요.', '창고에 물건 맡겨 두는 거 잊지 마세요.'];
  function spawnNPCs() {
    NAMES.forEach(([t, name], k) => { let i, j, n = 0; do { i = 10 + Math.floor(Math.random() * 11); j = 10 + Math.floor(Math.random() * 11); } while ((!TB[j][i]) === false && n++ < 50);
      const e = mk('npc', i, j); e.kind = 'npc'; e.sheet = 'villager_' + t; e.name = name; e.talk = TALK[k % TALK.length]; e.wait = 1 + Math.random() * 3; e.path = []; e.row = Math.floor(Math.random() * 8); NPCS.push(e); });
  }
  const inTown = (i, j) => Math.hypot(i - 15, j - 15) < 8.5;
  function updateNPC(e, dt) {
    stepMove(e, dt, 1.25); if (e.t < 1) return;
    if (e.path.length) { const nx = e.path.shift(); if (!beginStep(e, nx)) e.path = []; return; }
    e.wait -= dt; if (e.wait > 0) return; e.wait = 2 + Math.random() * 5;
    for (let k = 0; k < 10; k++) { const ti = 9 + Math.floor(Math.random() * 13), tj = 9 + Math.floor(Math.random() * 13); if (TB[tj][ti] || !inTown(ti, tj)) continue; e.path = astar(e, (i, j) => i === ti && j === tj, ti, tj).slice(0, 10); break; }
  }

  // ---- 상호작용 (문 열고 닫기 · 상점 안 상인 · 우물 옆 창고지기)
  let pending = null, hoverObj = null;
  const worldAt = (sx, sy) => toWorldPx(sx, sy);
  const SHOPKEEP = SHOPS.map(b => ({ b, i: b.npcT[0], j: b.npcT[1], sheet: 'villager_' + b.npcType, name: b.npc, row: rowFor(b.door === 'i' ? 1 : 0, b.door === 'j' ? 1 : 0) }));
  const KEEPER = { i: STORE_NPC.i, j: STORE_NPC.j, sheet: 'villager_m', name: STORAGE.npc, row: rowFor(0, 1), store: true };
  const TESTER = { i: TEST_NPC.i, j: TEST_NPC.j, sheet: 'villager_f', name: '테스트 상인', row: rowFor(1, 1), test: true };
  const TRADER = { i: SELL_NPC.i, j: SELL_NPC.j, sheet: 'villager_m', name: '아덴상단 로이드', row: rowFor(-1, 1), sell: true };
  const insideOf = (i, j) => SHOPS.find(b => i >= b.i && i < b.i + b.w && j >= b.j && j < b.j + b.d);
  const heroIn = () => insideOf(hero.i, hero.j);
  const doorPt = b => b.door === 'i' ? [b.i + b.w, b.j + 3] : [b.i + 3, b.j + b.d];
  function hitDoor() { return null; }
  function hitDoorOld(sx, sy) { const [px, py] = worldAt(sx, sy); return SHOPS.find(b => { const [x, z] = doorPt(b), [dx, dy] = P(x, z, 1.1); return Math.abs(px - dx) < 16 && Math.abs(py - dy) < 30; }); }
  function hitShop(sx, sy) { if (heroIn()) return null; const [px, py] = worldAt(sx, sy);
    return SHOPS.find(b => { const [cx, cy] = W2P(b.i + 3, b.j + 3); return px > cx - 160 && px < cx + 160 && py > cy - 260 && py < cy + 70 && Math.abs(px - cx) / 170 + Math.abs(py - (cy - 60)) / 230 < 1; }); }
  function hitNPC(sx, sy) { const [px, py] = worldAt(sx, sy), inn = heroIn();
    return [...SHOPKEEP.filter(n => n.b === inn), KEEPER, TRADER].find(e => { const [x, y] = W2P(e.i + 0.5, e.j + 0.5); return px > x - 13 && px < x + 13 && py > y - 64 && py < y + 4; }); }
  function hitPortal(sx, sy) { const [px, py] = worldAt(sx, sy), [x, y] = W2P(PORTAL.i + 0.5, PORTAL.j + 0.5); return Math.hypot(px - x, (py - y) * 2) < 30; }
  function go(i, j, act) { hero.target = null; moveGoal = [i, j]; holding = false; pending = { i, j, act }; mark = { t: [i, j], life: 0.5 }; }
  function toggleDoor(b) { const [i, j] = b.dIn; if (b.open && hero.i === i && hero.j === j) { say('문 앞을 비켜야 닫을 수 있습니다.', '#9c9682'); return; }
    setDoor(b, !b.open); if (AC) tone(AC.currentTime, 'square', b.open ? 180 : 140, b.open ? 120 : 90, 0.12, 0.05); }
  function nearDoor(b) { const inn = heroIn() === b; const t = inn ? L2T(b, 1, 3) : [b.di, b.dj]; return { t, ok: cheb(hero.i, hero.j, t[0], t[1]) <= 0 || cheb(hero.i, hero.j, b.dIn[0], b.dIn[1]) <= 1 }; }
  const api = {
    get ground() { return ground; },
    priceOf(id) { if (!api._pm) { const M = api._pm = {}; const scan = arr => Array.isArray(arr) && arr.forEach(r => { if (!Array.isArray(r)) return; const iid = r[3] || SHOP2ITEM[r[0]]; if (iid && r[1] > 0 && !(iid in M)) M[iid] = r[1]; }); SHOPS.forEach(b => { scan(b.items); (b.tabs || []).forEach(t => scan(t[1])); }); } return api._pm[id] || 0; },
    shop(id) { const b = SHOPS.find(x => x.id === id); if (b) openShop(b); },
    mapMarks() { return [...SHOPS.filter(b => b.npcT).map(b => ({ i: b.npcT[0], j: b.npcT[1], c: '#7fd0ff' })), ...NPCS.filter(n => n.store).map(n => ({ i: n.i, j: n.j, c: '#7fd0ff' })), { i: SELL_NPC.i, j: SELL_NPC.j, c: '#9fe0a0' }, { i: PORTAL.i, j: PORTAL.j, portal: true }]; },
    hoverAt(sx, sy) { hoverObj = hitNPC(sx, sy) || hitDoor(sx, sy) && { door: hitDoor(sx, sy) } || hitShop(sx, sy) || (hitPortal(sx, sy) ? PORTAL : null); return hoverObj; },
    click(sx, sy) {
      const n = hitNPC(sx, sy);
      if (n) { if (n.sell) { go(n.i - 1, n.j + 1, () => SELL.open()); if (cheb(hero.i, hero.j, n.i, n.j) <= 1) { pending = null; moveGoal = null; SELL.open(); } return true; }
        if (n.test) { go(n.i + 1, n.j + 1, () => openShop(TESTSHOP)); if (cheb(hero.i, hero.j, n.i, n.j) <= 1) { pending = null; moveGoal = null; openShop(TESTSHOP); } return true; }
        if (n.store) { go(n.i, n.j + 1, () => STORE.open()); if (cheb(hero.i, hero.j, n.i, n.j) <= 1) { pending = null; moveGoal = null; STORE.open(); } return true; }
        const [ti, tj] = n.b.stand; if (cheb(hero.i, hero.j, n.i, n.j) <= 2 && heroIn() === n.b) { openShop(n.b); return true; } go(ti, tj, () => openShop(n.b)); return true; }
      const d = hitDoor(sx, sy); if (d) { const nd = nearDoor(d); if (nd.ok) toggleDoor(d); else go(nd.t[0], nd.t[1], () => toggleDoor(d)); return true; }
      if (hitPortal(sx, sy)) { go(PORTAL.i, PORTAL.j, () => openMap()); return true; }
      const b = hitShop(sx, sy); if (b) { go(b.dIn[0], b.dIn[1], () => {}); return true; }
      pending = null; return false;
    },
    update(dt) {
      if (pending && hero.t >= 1 && hero.i === pending.i && hero.j === pending.j) { const a = pending.act; pending = null; a(); }
      if (pending && moveGoal == null && hero.t >= 1 && cheb(hero.i, hero.j, pending.i, pending.j) <= 1) { const a = pending.act; pending = null; a(); }
    },
    addDraw(list, g, vw, vh) {
      const inn = heroIn(), S2 = 0.5, AX = 400, AY = 700;
      const blit = (img, b) => { if (img.complete && img.naturalWidth) { const [x, y] = W2P(b.i + 3, b.j + 3); g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(img, Math.round(x - AX * S2), Math.round(y - AY * S2), img.naturalWidth * S2, img.naturalHeight * S2); g.restore(); } };
      SHOPS.forEach(b => {
        if (b === inn) {
          list.push({ d: b.i + b.j - 0.5, f: () => blit(b.img.int_back, b) });
          list.push({ d: b.i + b.j + 11.5, f: () => blit(b.img.int_front, b) });
          const n = SHOPKEEP.find(k => k.b === b); list.push({ d: n.i + n.j + 1, f: () => drawKeeper(g, n) });
          const ct = L2T(b, 3, 3); list.push({ d: ct[0] + ct[1] + 1.5, f: () => blit(b.img.int_counter, b) });   // 카운터는 상인 앞에
        } else {
          list.push({ d: b.i + b.j + 6, f: () => { blit(b.img.ext_open, b); drawSign(g, b);
            if (hoverObj === b) { const [x, y] = P(b.i + 3, b.j + 3, 7.4); label(g, b.name, x, y, '#f2d98a'); }
            if (hoverObj && hoverObj.door === b) { const [x, z] = doorPt(b), [px, py] = P(x, z, 2.6); label(g, b.open ? '문 닫기' : '문 열기', px, py, '#ffffff'); } } });
        }
      });
      list.push({ d: STORE_PROPS.x + STORE_PROPS.z + 0.5, f: () => { if (storeImg.complete && storeImg.naturalWidth) { const [x, y] = W2P(STORE_PROPS.x, STORE_PROPS.z); g.save(); g.imageSmoothingEnabled = true; g.drawImage(storeImg, Math.round(x - 180 * S2), Math.round(y - 230 * S2), storeImg.naturalWidth * S2, storeImg.naturalHeight * S2); g.restore(); } } });
      list.push({ d: KEEPER.i + KEEPER.j + 1, f: () => drawKeeper(g, KEEPER) });
      list.push({ d: TRADER.i + TRADER.j + 1, f: () => { drawKeeper(g, TRADER); const [x, y] = W2P(TRADER.i + 0.5, TRADER.j + 0.5); if (hoverObj !== TRADER) label(g, '아덴상단', x, y - 66, '#9fe0a0'); } });
      // 테스트 상점은 없앰 (아이템은 갓 모드 패널의 '아이템 지급'으로)
      list.push({ d: WELL.x + WELL.z, f: () => { if (wellImg.complete && wellImg.naturalWidth) { const [x, y] = W2P(WELL.x, WELL.z); g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
        { const hv = hero.x + hero.z - WELL.x - WELL.z, hu = hero.x - hero.z - WELL.x + WELL.z; if (hv < 0 && hv > -7 && hu > -2.4 && hu < 2) g.globalAlpha = 0.55; }   // 기사가 우물 뒤(지붕에 가림)면 반투명
        g.drawImage(wellImg,Math.round(x - WELL_AX * S2), Math.round(y - WELL_AY * S2), wellImg.naturalWidth * S2, wellImg.naturalHeight * S2); g.restore(); } else drawWell(g); } });
      { const [x, y] = W2P(PORTAL.i + 0.5, PORTAL.j + 0.5); list.push({ d: PORTAL.i + PORTAL.j + 0.6, f: () => { const p = 0.5 + 0.5 * Math.sin(time * 2.4);
        g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(x, y, 2, x, y, 34); gr.addColorStop(0, `rgba(140,190,255,${0.55 + 0.25 * p})`); gr.addColorStop(1, 'rgba(90,140,255,0)');
        g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, 34, 17, 0, 0, 7); g.fill(); g.strokeStyle = `rgba(200,225,255,${0.6 + 0.3 * p})`; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y, 22, 11, 0, 0, 7); g.stroke();
        for (let k = 0; k < 3; k++) { const a = time * 1.5 + k * 2.09; g.fillStyle = 'rgba(220,235,255,.8)'; g.fillRect(x + Math.cos(a) * 18, y + Math.sin(a) * 9 - 6 - ((time * 20 + k * 9) % 26), 1.5, 1.5); } g.restore();
        label(g, '월드맵', x, y - 30, hoverObj === PORTAL ? '#ffffff' : '#bcd4ff'); } }); }
    },
    enter() {
      if (!ground) buildGround();
      blockedT = TB; PROPS = TPROPS; foxes = [];
    },
    SPAWN,
  };
  function drawKeeper(g, e) { const [x, y] = W2P(e.i + 0.5, e.j + 0.5), im2 = npcImg[e.sheet + '_idle'];
    if (im2 && im2.complete && im2.naturalWidth) drawSheet(g, im2, SHEET, Math.floor(time * 6 + e.i) % 8, e.row, x, y);
    if (hoverObj === e) label(g, e.name, x, y - 66, '#f2eedf'); }
  function drawSign(g, b) { const p = b.door === 'i' ? P(b.i + 6.35, b.j + 4.55, 2.55) : P(b.i + 4.55, b.j + 6.35, 2.55);
    g.save(); g.fillStyle = '#2a1c12'; g.fillRect(p[0] - 1, p[1] - 6, 2, 6); g.fillRect(p[0] - 9, p[1], 18, 18); g.fillStyle = '#7a5636'; g.fillRect(p[0] - 8, p[1] + 1, 16, 16); g.fillStyle = '#e6dac0'; g.fillRect(p[0] - 6.5, p[1] + 2.5, 13, 13);
    icon(g, b.icon, p[0], p[1] + 9, 0.72); g.restore(); }
  function label(g, t, x, y, c) { g.font = '700 10px "Noto Sans KR",sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(0,0,0,.85)'; g.fillText(t, x + 1, y + 1); g.fillStyle = c; g.fillText(t, x, y); }
  function drawWell(g) { const [x, y] = W2P(15, 15);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x + 8, y + 5, 30, 15, 0, 0, 7); g.fill();
    g.fillStyle = '#6e685e'; g.beginPath(); g.ellipse(x, y, 26, 13, 0, 0, 7); g.fill(); g.fillRect(x - 26, y - 14, 52, 14); g.fillStyle = '#8a8478'; g.beginPath(); g.ellipse(x, y - 14, 26, 13, 0, 0, 7); g.fill();
    g.fillStyle = '#20343c'; g.beginPath(); g.ellipse(x, y - 14, 19, 9, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(150,200,220,.35)'; g.beginPath(); g.ellipse(x - 4, y - 16, 8, 3, 0, 0, 7); g.fill();
    g.strokeStyle = '#4a4238'; g.lineWidth = 1; for (let k = 0; k < 9; k++) { const a = Math.PI * k / 8; g.beginPath(); g.moveTo(x - 26 * Math.cos(a), y - 14 + 13 * Math.sin(a)); g.lineTo(x - 26 * Math.cos(a), y + 13 * Math.sin(a) - 1); g.stroke(); }
    g.fillStyle = '#4a3020'; g.fillRect(x - 22, y - 52, 4, 40); g.fillRect(x + 18, y - 52, 4, 40); g.fillStyle = '#6a2a22'; g.beginPath(); g.moveTo(x - 30, y - 50); g.lineTo(x, y - 66); g.lineTo(x + 30, y - 50); g.lineTo(x + 26, y - 46); g.lineTo(x, y - 59); g.lineTo(x - 26, y - 46); g.fill();
    g.fillStyle = '#3a2a1a'; g.fillRect(x - 18, y - 42, 36, 3); g.strokeStyle = '#8a7a60'; g.beginPath(); g.moveTo(x + 2, y - 40); g.lineTo(x + 2, y - 26); g.stroke(); g.fillStyle = '#6a4a2a'; g.fillRect(x - 2, y - 26, 8, 7); }

  // ---- 패널 (상점 · 창고 · 월드맵)
  const $ = id => document.getElementById(id);
  function closeAll() { ['shop', 'wmap'].forEach(id => $(id).hidden = true); }
  function portrait(cv2, type) { const g = cv2.getContext('2d'); g.clearRect(0, 0, cv2.width, cv2.height); const im2 = npcImg['villager_' + type + '_idle'];
    if (im2 && im2.complete && im2.naturalWidth) { g.imageSmoothingEnabled = true; g.drawImage(im2, 0, 1 * SHEET.H, SHEET.W, SHEET.H, -40, -38, SHEET.W * 0.62, SHEET.H * 0.62); } }
  function openShop(b) {
    closeAll(); ['petwin', 'itemwin'].forEach(id => { const w = $(id); if (w) w.hidden = true; }); const p = $('shop'); p.hidden = false; $('shop-title').textContent = b.name; $('shop-npc').textContent = b.npc; $('shop-hello').textContent = b.hello;
    portrait($('shop-face'), b.npcType); const list = $('shop-list'); list.innerHTML = '';
    if (b.storage) { list.innerHTML = '<div class="slots">' + Array.from({ length: 24 }, () => '<i></i>').join('') + '</div><p class="muted">맡긴 물건이 없습니다. 인벤토리가 생기면 여기서 맡기고 찾을 수 있어요.</p>'; return; }
    const fmt = n => n.toLocaleString();
    const foot = () => { const rows = [...list.querySelectorAll('.item')], tot = rows.reduce((a, r) => a + (r._tot || 0), 0), left = coins - tot;
      $('shop-coins').textContent = fmt(coins);
      $('shop-sum').innerHTML = tot ? `보유 <b>${fmt(coins)}</b> − 합계 <b>${fmt(tot)}</b> = <b class="${left < 0 ? 'neg' : 'ok'}">${left < 0 ? '−' + fmt(-left) + ' (부족)' : fmt(left)}</b>` : '<span class="muted">수량을 정하면 일괄 구매할 수 있어요</span>';
      const bb = $('shop-buyall'); bb.disabled = !tot || left < 0; bb.onclick = () => { if (!tot || coins < tot) return; let n = 0;
        rows.forEach(r => { if (r._q > 0) { r._buy(true); n++; } }); say(`일괄 구매: ${n}종 · -${fmt(tot)} 골드`, '#cfe4a8'); upd(); }; };
    const upd = () => { list.querySelectorAll('.item').forEach(r => r._calc && r._calc(true)); foot(); };
    const shopIcon = n => SHOP2ITEM[n] && ITEMS[SHOP2ITEM[n]] ? ITEMS[SHOP2ITEM[n]].icon : /마법서/.test(n) ? 'book' : /먹이/.test(n) ? 'food' : /목걸이/.test(n) ? 'amulet' : /강아지|늑대/.test(n) ? 'paw' : /물약/.test(n) ? 'pot_bl' : 'scroll';
    const tb = $('shop-tabs'); tb.hidden = !b.tabs; tb.innerHTML = '';
    const rowsFor = items => { list.innerHTML = ''; if (typeof items === 'string') { PET.shopPanel(items, list); foot(); return; } items.forEach(addRow); foot(); };
    if (b.tabs) { b.tab = b.tab || 0; b.tabs.forEach(([nm], k) => { const t = document.createElement('button'); t.type = 'button'; t.className = 'shop-tab'; t.setAttribute('role', 'tab'); t.textContent = nm; t.setAttribute('aria-selected', k === b.tab);
        t.onclick = () => { b.tab = k; tb.querySelectorAll('.shop-tab').forEach((x, q) => x.setAttribute('aria-selected', q === k)); rowsFor(b.tabs[k][1]); }; tb.appendChild(t); }); }
    const addRow = ([n, price, info, iid]) => { const row = document.createElement('div'); row.className = 'item'; let q = 0; const IID = iid || SHOP2ITEM[n];   // iid: 테스트 상점처럼 아이템 id를 직접 줄 때
      row.innerHTML = `<span class="ic">${ICON(iid && ITEMS[iid] ? ITEMS[iid].icon : shopIcon(n))}</span><span class="nm" style="color:${IID ? rarC(IID) : '#f2f2f2'}">${n}</span><span class="info">${info}</span><span class="pr">${price.toLocaleString()} 골드</span>
        <span class="qty"><button type="button" class="qb" data-d="-10" aria-label="10개 빼기">−10</button><button type="button" class="qb" data-d="-1" aria-label="1개 빼기">−</button><input type="number" min="0" max="999" value="0" aria-label="${n} 수량"><button type="button" class="qb" data-d="1" aria-label="1개 더하기">+</button><button type="button" class="qb" data-d="10" aria-label="10개 더하기">+10</button></span>
        <span class="calc"></span><button type="button" class="buy">구입</button>`;
      const inp = row.querySelector('input'), calc = row.querySelector('.calc'), buy = row.querySelector('.buy');
      row._calc = quiet => { q = Math.max(0, Math.min(999, Math.floor(+inp.value || 0))); const tot = price * q, left = coins - tot; row._q = q; row._tot = tot;
        calc.innerHTML = q ? `${fmt(coins)} − ${fmt(tot)} = <b class="${left < 0 ? 'neg' : 'ok'}">${left < 0 ? '−' + fmt(-left) + ' (부족)' : fmt(left)}</b>` : '<span class="muted">수량 0</span>'; buy.disabled = !q || left < 0; row.classList.toggle('picked', q > 0); if (!quiet) foot(); };
      row._buy = bulk => { const tot = price * q; if (!q || coins < tot) return false; coins -= tot; TELE.ev('buy', { id: IID || '', q, g: tot }); if (IID) INV.add(IID, q, true);
        if (!bulk) say(`${n} ${q}개를 구입했습니다. -${fmt(tot)} 골드`, '#cfe4a8'); inp.value = 0; return true; };
      row.querySelectorAll('.qb').forEach(bt => bt.onclick = () => { inp.value = Math.max(0, Math.min(999, (Math.floor(+inp.value) || 0) + +bt.dataset.d)); row._calc(); });
      inp.oninput = () => row._calc();
      if (IID && ITEMS[IID]) row.onpointerdown = ev => { if (ev.target.closest('button,input')) return; INV.holdStart(ev, { id: IID, n: 1, preview: true }); };   // 꾹 누르면 상세 정보
      buy.onclick = () => { row._calc(true); if (row._buy(false)) upd(); else say('골드가 부족합니다. (' + n + ')', '#f08a7a'); };
      list.appendChild(row); row._calc(true); };
    rowsFor(b.tabs ? b.tabs[b.tab][1] : b.items);
    $('shop-coins').textContent = coins.toLocaleString();
    say(b.npc + ': ' + b.hello, '#e8d8a8');
  }
  const REGIONS = [
    ['talking_island', '이야기섬', '초보', '1~10', 205, 560, '1구간(Lv 1~5): 고블린·오크·오크 궁수·난쟁이, 먼저 덤비지 않음. 2구간(Lv 5~10): 오크 전사·홉고블린 무리와 늑대인간, 그리고 수시로 나타나는 대왕거미 셸로브.'],
    ['knight_village', '사막필드', '중급', '10~20', 420, 470, '기사마을 남쪽의 뜨거운 사막. 1구간(Lv 10~15): 리자드맨·거대개미, 드물게 먼저 덤비는 스콜피온. 2구간(Lv 15~20): 스콜피온·바실리스크·거대불개미, 그리고 보스 거대 여왕개미(잡으면 3시간~3시간 30분 뒤 다시 등장).'],
    ['orc_forest', '오크숲', '중급', '15~25', 560, 395, '오크 부족이 터를 잡은 울창한 숲. 1구간(Lv 15~20): 로바 오크(주먹)·두다마라 오크(창)·오크 마법사(파이어볼), 드물게 먼저 덤비는 다크엘프(활). 2구간(Lv 20~25): 다크엘프·아투바 오크(검)·먼저 덤비는 꼽추 오크 가스트, 그리고 보스 오우거(잡으면 3시간~3시간 30분 뒤 다시 등장).'],
    ['bugbear_field', '버그베어밭', '중급', '20~30', 470, 300, '시체와 핏자국이 널린 어둡고 끔찍한 살육의 땅. 1구간(Lv 20~25): 먼저 활을 쏘는 해골 궁수·좀비(해골·좀비는 밤에 강해짐)·버그베어. 2구간(Lv 25~30): 버그베어·불을 무는 켈베로스·먼저 덤비는 킹 버그베어, 그리고 보스 바포메트(잡으면 3시간~3시간 30분 뒤 다시 등장). 버그베어와 킹 버그베어는 갑옷·무기 마법 주문서를 잘 떨어뜨린다.'],
    ['dark_knight_field', '본토던전', '상급', '35~45', 720, 330, '피와 시체가 널린 어둠의 미로. 항상 밤처럼 어둡고 모든 몬스터가 먼저 덤빕니다(같은 골목에 보일 때). 1층(Lv 35~40): 킹 버그베어·웅골리언트·독을 거는 구울, 보스 카스파 패밀리(2시간마다). 미로 끝의 계단으로 2층(Lv 40~45): 킹 버그베어·켈베로스·네크로맨서, 보스 데스나이트(3시간마다, 데스나이트 세트). 월드맵에서는 1층으로만 들어갑니다.'],
    ['dragon_valley', '용의계곡', '상급', 32, 900, 300, '용족이 지배하는 협곡. 하늘과 땅 모두에서 위협이 몰려온다.'],
    ['fire_dragon_nest', '화룡의둥지', '상급', 40, 1070, 230, '용암이 흐르는 화산 지대. 화룡 발라카스가 둥지를 틀고 있다.'],
    ['oren_elmore', '오렌설원지역', '상급', '40~50', 800, 130, '눈보라가 몰아치는 북쪽의 눈 덮인 설원 (수속성 — 불 속성 무기·마법이 잘 듭니다). 1구역(Lv 40~45): 엘모어 병사·전사·마법사가 3~5명씩 무리 지어 다니며 하나를 치면 무리 전체가 반격. 2구역(Lv 45~50): 먼저 덤비는 에틴·샤벨타이거, 맞으면 얼어붙는 아이스 골렘, 그리고 보스 얼음여왕(약 3시간마다, 블리자드·콘 오브 콜드).'],
  ];
  let sel = null;
  function openMap() {
    closeAll(); $('wmap').hidden = false; const st = $('wm-stage');
    if (!st.dataset.built) { st.dataset.built = 1;
      REGIONS.forEach(r => { const m = document.createElement('button'); m.type = 'button'; m.className = 'mk g' + ['초보', '중급', '상급'].indexOf(r[2]); m.style.left = r[4] / 12.8 + '%'; m.style.top = r[5] / 7.2 + '%';
        m.innerHTML = `<i></i><b>${r[1]}</b><small>${r[2]} · 권장 Lv.${r[3]}</small>`; m.onclick = () => pick(r, m); st.appendChild(m); });
      { const R = Object.fromEntries(REGIONS.map(r => [r[0], [r[4], r[5]]])), TWN = [600, 520], seg = (a, b, k = 0.18, cls = '') => { const mx = (a[0] + b[0]) / 2 - (b[1] - a[1]) * k, my = (a[1] + b[1]) / 2 + (b[0] - a[0]) * k; return `<path class="${cls}" d="M${a[0]} ${a[1]} Q${mx} ${my} ${b[0]} ${b[1]}"/>`; };
        const chain = ['knight_village', 'orc_forest', 'bugbear_field', 'dark_knight_field', 'dragon_valley', 'fire_dragon_nest'].map(id => R[id]); let d = seg(TWN, R.talking_island, -0.12, 'sea') + seg(TWN, chain[0]);
        for (let q = 0; q < chain.length - 1; q++) d += seg(chain[q], chain[q + 1], q % 2 ? 0.15 : -0.15); d += seg(R.dark_knight_field, R.oren_elmore, 0.2);
        st.insertAdjacentHTML('afterbegin', `<svg class="wm-routes" viewBox="0 0 1280 720" preserveAspectRatio="none" aria-hidden="true">${d}</svg>`); }
      const t = document.createElement('button'); t.type = 'button'; t.className = 'mk town'; t.style.left = 600 / 12.8 + '%'; t.style.top = 520 / 7.2 + '%'; t.innerHTML = '<i></i><b>아덴 마을</b><small>메인 마을</small>';
      t.onclick = () => askTown(); st.appendChild(t); }
    pick(REGIONS[0], st.querySelector('.mk'));
  }
  // 월드맵 오른쪽: 사냥터 도감 (구간별 몬스터 · 보스 · 얻을 수 있는 아이템)
  const REGION_INFO = { talking_island: { zones: [[1, '1구간 · Lv 1~5'], [2, '2구간 · Lv 5~10']], boss: 'shelob', bossTxt: '2구간 어딘가에 수시로 나타남' },
    knight_village: { zones: [[3, '1구간 · Lv 10~15'], [4, '2구간 · Lv 15~20']], boss: 'queen_ant', bossTxt: '2구간 · 잡으면 3시간~3시간 30분 뒤 다시 나타남' },
    orc_forest: { zones: [[5, '1구간 · Lv 15~20'], [6, '2구간 · Lv 20~25']], boss: 'ogre', bossTxt: '2구간 · 잡으면 3시간~3시간 30분 뒤 다시 나타남' },
    bugbear_field: { zones: [[7, '1구간 · Lv 20~25'], [8, '2구간 · Lv 25~30']], boss: 'baphomet', bossTxt: '2구간 · 잡으면 3시간~3시간 30분 뒤 다시 나타남' },
    oren_elmore: { zones: [[11, '1구역 · Lv 40~45'], [12, '2구역 · Lv 45~50']], boss: 'ice_queen', bossTxt: '2구역 · 약 3시간마다 (블리자드·콘 오브 콜드)' },
    dark_knight_field: { zones: [[9, '1층 · Lv 35~40'], [10, '2층 · Lv 40~45']], boss: 'deathknight', bossTxt: '', bosses: [['kaspar', '1층 보스 카스파 패밀리 · 넷 모두 쓰러지면 약 2시간 뒤', ['kaspar', 'merkyor', 'balthazar', 'sema']], ['deathknight', '2층 보스 · 약 3시간마다', ['deathknight']]] } };
  const RORD = { '영웅': 0, '희귀': 1, '고급': 2, '일반': 3 };
  function zoneKinds(id) { const d = ISLAND.def(id); if (!d) return []; const ks = new Set(); (d.mobs || []).forEach(([k]) => ks.add(k)); (d.groups || []).forEach(([k, mem]) => { ks.add(k); (mem || []).forEach(([m]) => ks.add(m)); }); return [...ks].filter(k => MOB[k] && !MOB[k].boss); }
  function codexHTML(r) { const R_ = REGION_INFO[r[0]]; if (!R_) return '<p class="wc-none">이 사냥터의 몬스터·아이템 도감은 맵이 열리면 채워집니다.</p>';
    const mobCell = k => { const S = MOB[k]; return `<div class="wc-mob${S.boss ? ' boss' : ''}"><canvas width="56" height="56" data-k="${k}"></canvas><b>${S.name}</b><small>Lv.${S.lv}${S.el ? ` · <em style="color:${ATTR_C[S.el]}">${ATTR_N[S.el]}</em>` : ''}${S.aggr && !S.boss ? ' · <em>선공</em>' : ''}${S.boss ? ' · <em>보스</em>' : ''}</small></div>`; };
    const itemCell = (id, src) => { const d = ITEMS[id]; if (!d) return ''; const rr = d.rar || '일반'; const tipTxt = INV.tipOf({ id, n: 1, on: false }).split('\n').filter(l => !/더블클릭|꾹 누르고/.test(l)).concat('획득: ' + src).join('\n').replace(/"/g, '&quot;'); return `<span class="wc-it" data-itip="${tipTxt}" data-ic="${rarC(id)}" style="--rar:${rr === '일반' ? '#b9b4a8' : RARITY_C[rr]}">${ICON(d.icon)}</span>`; };
    const sortIds = ids => [...new Set(ids)].filter(id => ITEMS[id]).sort((a, b) => (RORD[ITEMS[a].rar || '일반'] - RORD[ITEMS[b].rar || '일반']) || ITEMS[a].name.localeCompare(ITEMS[b].name, 'ko'));
    const zoneIds = R_.zones.map(z => z[0]), kinds = new Set(zoneIds.flatMap(zoneKinds));
    const BX = R_.bosses || [[R_.boss, R_.bossTxt, [R_.boss]]], BK = BX.flatMap(x => x[2]);
    const bossIds = sortIds(BK.flatMap(b => (DROP_TABLE[b] || []).map(x => x[0])));
    const normIds = sortIds([...BK.flatMap(b => (DROP_TABLE[b] || []).map(x => x[0])).filter(id => ITEMS[id] && ['일반', '고급'].includes(ITEMS[id].rar || '일반')), ...zoneIds.flatMap(z => CX_ZONE[z] || []), ...zoneIds.flatMap(z => CX_ZONE_R[z] || []), ...[...kinds].flatMap(k => (MOB_DROPS[k] || []).map(x => x[0]))]);
    const cnt = ids => ['영웅', '희귀', '고급', '일반'].map(g => [g, ids.filter(id => (ITEMS[id].rar || '일반') === g).length]).filter(x => x[1]).map(([g, n]) => `<span style="color:${g === '일반' ? '#6a5a40' : RARITY_C[g]}">${g} ${n}</span>`).join(' · ');
    return `<h3 class="wc-h">몬스터</h3>` + R_.zones.map(([z, lab]) => `<div class="wc-zone"><span class="wc-zl">${lab}</span><div class="wc-mobs">${zoneKinds(z).map(mobCell).join('')}</div></div>`).join('')
      + BX.map(([, txt, ks]) => `<div class="wc-zone"><span class="wc-zl">보스 · ${txt}</span><div class="wc-mobs">${ks.map(mobCell).join('')}</div></div>`).join('')
      + `<h3 class="wc-h">보스 드랍 <small>${cnt(bossIds)}</small></h3><div class="wc-items">${bossIds.map(id => itemCell(id, '보스 ' + BK.filter(b => (DROP_TABLE[b] || []).some(x => x[0] === id)).map(b => MOB[b].name).join('·') + ' 드랍')).join('')}</div>`
      + `<h3 class="wc-h">일반 몬스터 드랍 <small>${cnt(normIds)}</small></h3><div class="wc-items">${normIds.map(id => itemCell(id, '이 사냥터 일반 몬스터 드랍 (레벨이 높을수록 잘 떨어짐)')).join('')}</div>`
      + `<p class="wc-note">아이콘에 마우스를 올리면 아이템 상세 정보가 보여요.</p>`; }
  function drawPortraits(root) { root.querySelectorAll('canvas[data-k]').forEach(cv2 => { const k = cv2.dataset.k, g = cv2.getContext('2d'), M = MSHEET[k], I = MIMG[k] && MIMG[k].idle;
      const draw = () => { g.clearRect(0, 0, 56, 56); if (M && I && I.complete && I.naturalWidth) { const t = document.createElement('canvas'); t.width = M.W; t.height = M.H; const tg = t.getContext('2d'); if (M.tint) tg.filter = M.tint; tg.drawImage(I, 0, 1 * M.H, M.W, M.H, 0, 0, M.W, M.H); tg.filter = 'none';
          const D = tg.getImageData(0, 0, M.W, M.H).data; let x0 = M.W, y0 = M.H, x1 = 0, y1 = 0; for (let y = 0; y < M.H; y++) for (let x = 0; x < M.W; x++) if (D[(y * M.W + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
          if (x1 <= x0) return; const bw = x1 - x0 + 1, bh = y1 - y0 + 1, sc = Math.min(50 / bw, 50 / bh); g.imageSmoothingEnabled = true; g.drawImage(t, x0, y0, bw, bh, 28 - bw * sc / 2, 53 - bh * sc, bw * sc, bh * sc); }
        else { g.fillStyle = '#3a2a18'; g.font = '800 22px "Nanum Myeongjo",serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(MOB[k].name[0], 28, 30); } };
      if (I && !I.complete) I.addEventListener('load', draw, { once: true }); draw(); }); }
  function pick(r, m) { sel = r; { const b = $('wm-go'), fee = feeOf(r); if (b) b.innerHTML = `사냥 시작 <small>(${fee ? fee.toLocaleString() + ' 골드' : '무료'})</small>`; } document.querySelectorAll('#wm-stage .mk').forEach(x => x.classList.toggle('on', x === m));
    $('wm-name').textContent = r[1]; $('wm-grade').textContent = `${r[2]} 사냥터 · 권장 Lv.${r[3]}`; $('wm-grade').className = 'g' + ['초보', '중급', '상급'].indexOf(r[2]); $('wm-desc').textContent = r[6]; { const cx_ = $('wm-codex'); if (cx_) { cx_.innerHTML = codexHTML(r); drawPortraits(cx_); } }
    $('wm-warn').hidden = hero.lv >= parseInt(r[3], 10) - 3; }
  const WM_FEE = 1000, feeOf = r => r && r[1] === '이야기섬' ? 0 : WM_FEE, feeShort = fee => say(`이동 비용 ${fee.toLocaleString()} 골드가 부족해요. (가진 골드 ${coins.toLocaleString()})`, '#f08a7a');
  $('wm-go').onclick = () => { if (!sel) return; const r = sel, fee = feeOf(r); if (coins < fee) { feeShort(fee); return; } INV.askYesNo(`${JOSA(r[1], '으로', '로')} 이동하시겠습니까?`, `${r[2]} 사냥터 · 권장 Lv.${r[3]} · 이동 비용 ${fee ? fee.toLocaleString() + ' 골드' : '무료'}`, () => { if (coins < fee) { feeShort(fee); return; } if (fee) { coins -= fee; TELE.ev('buy', { id: 'teleport', q: 1, g: fee }); say(`이동 비용 ${fee.toLocaleString()} 골드를 냈습니다.`, '#f2e6a8'); INV.render(); } closeAll(); toField(r[1]); }); };   // 이동 전 확인
  $('wm-town').onclick = () => askTown();
  function askTown() { if (SCENE === 'town') { closeAll(); return; } INV.askYesNo('아덴 마을로 이동하시겠습니까?', '귀환 주문서 1장을 사용합니다.', () => { closeAll(); scrollHome(); }); }
  document.querySelectorAll('[data-close]').forEach(b => b.onclick = closeAll);
  // ESC: 열린 창을 마지막에 연 것부터 하나씩 닫음 → 다 닫혀 있으면 게임 메뉴
  const POPS = ['shop', 'wmap', 'invwin', 'charwin', 'autowin', 'huntwin', 'petwin', 'bulkwin', 'sellwin', 'storewin', 'godpanel', 'itemwin'], popStack = [];
  POPS.forEach(id => { const el = $(id); if (!el) return; new MutationObserver(() => { const k = popStack.indexOf(id); if (k >= 0) popStack.splice(k, 1); if (!el.hidden) popStack.push(id); }).observe(el, { attributes: true, attributeFilter: ['hidden'] }); });
  function closePop(id) { if (id === 'shop' || id === 'wmap') closeAll(); else if (id === 'itemwin') INV.hideDetail(); else if (id === 'bulkwin') INV.bulkClose(); else $(id).hidden = true; }
  function closeTop() { for (let k = popStack.length - 1; k >= 0; k--) { const id = popStack[k], el = $(id); if (!el || el.hidden) { popStack.splice(k, 1); continue; } closePop(id); return true; }
    const vis = POPS.find(id => $(id) && !$(id).hidden); if (vis) { closePop(vis); return true; } return false; }
  addEventListener('keydown', ev => { if (ev.key === 'Escape') { if (!$('askwin').hidden) return; ev.stopImmediatePropagation();
      if (!$('escmenu').hidden) { escMenu(false); return; } if (closeTop()) return; escMenu(true); return; } });   // M(월드맵)·R(귀환) 단축키는 뺌 — 글자 키는 앞으로 채팅 입력에 씀
  addEventListener('keydown', ev => { const k = ev.key; if (['loginscr', 'charsel', 'namescr'].some(id => { const el = document.getElementById(id); return el && !el.hidden; })) return; { const ae = document.activeElement; if (ae && ae.id !== 'chat-in' && /INPUT|TEXTAREA/.test(ae.tagName)) return; }
    if (k === 'Tab') { ev.preventDefault(); INV.toggleBoth(); }
  });
  $('btn-inv').onclick = () => INV.toggleBoth();
  // ===== ESC 메뉴: 배경음악 · 효과음 · 캐릭터 선택 · 게임 종료
  { const cb = document.getElementById('esc-credit'); if (cb) cb.onclick = () => { const t = document.getElementById('esc-credit-t'); t.hidden = !t.hidden; }; }
  function escMenu(on) { const m = $('escmenu'); m.hidden = !on; if (!on) return;
    const sync = () => { $('esc-bgm').textContent = '배경음악: ' + ($('btn-bgm').getAttribute('aria-pressed') === 'true' ? '켜짐' : '꺼짐'); $('esc-sfx').textContent = '효과음: ' + (SFX_ON ? '켜짐' : '꺼짐'); };
    const mmSync = () => { $('esc-mm').textContent = '미니맵: ' + (MM.on() ? '켜짐' : '꺼짐'); $('esc-mm-op').value = Math.round(MM.op() * 100); $('esc-mm-v').textContent = Math.round(MM.op() * 100) + '%'; };
    mmSync(); $('esc-mm').onclick = () => { MM.setOn(!MM.on()); mmSync(); say(`미니맵을 ${MM.on() ? '켰' : '껐'}습니다.`, '#9c9682'); }; $('esc-mm-op').oninput = ev => { MM.setOp(+ev.target.value / 100); mmSync(); };
    sync(); $('esc-bgm').onclick = () => { $('btn-bgm').click(); SND.set({ bgmOn: $('btn-bgm').getAttribute('aria-pressed') === 'true' }); sync(); };
    $('esc-sfx').onclick = () => { SFX_ON = !SFX_ON; applySfxVol(); SND.set({ sfxOn: SFX_ON }); sync(); say(`효과음을 ${SFX_ON ? '켰' : '껐'}습니다.`, '#9c9682'); };
    // 볼륨: 배경음·효과음 따로 (0~100%) — 바꾸면 바로 적용·저장
    const vSync = () => { const v = SND.get(); $('esc-bgmv').value = v.bgm; $('esc-bgmv-t').textContent = v.bgm + '%'; $('esc-sfxv').value = v.sfx; $('esc-sfxv-t').textContent = v.sfx + '%'; };
    vSync(); $('esc-bgmv').oninput = ev => { SND.set({ bgm: +ev.target.value }); TOWN.syncBGM(); vSync(); };
    $('esc-sfxv').oninput = ev => { SND.set({ sfx: +ev.target.value }); applySfxVol(); vSync(); };
    $('esc-sfxv').onchange = () => { initAudio(); if (AC && SFX_ON) tone(AC.currentTime, 'triangle', 880, 1320, 0.16, 0.09); };
    for (const id of ['esc-bgmv', 'esc-sfxv', 'esc-mm-op']) $(id).onkeydown = ev => { if (ev.key !== 'Escape') ev.stopPropagation(); };
    $('esc-char').onclick = () => { escMenu(false); ACCOUNT.openSel(true); };
    $('esc-quit').onclick = async () => { escMenu(false); PET.storeAll(); await SAVE.now(false, true); $('quitscr').hidden = false; };
    { const b = $('esc-notes'); if (b) b.onclick = () => { escMenu(false); NOTES.showAll(); }; }
    { const b = $('esc-save'); if (b) b.onclick = () => { escMenu(false); if (!SAVE.on()) { say('캐릭터를 고른 뒤에 저장할 수 있어요.', '#9c9682'); return; } SAVE.now(true); }; }
    $('esc-back').onclick = () => escMenu(false); }
  window.escMenu = escMenu;
  $('quit-back').onclick = () => { $('quitscr').hidden = true; };
  document.querySelectorAll('[data-closewin]').forEach(b => b.onclick = () => { $(b.dataset.closewin).hidden = true; if (b.dataset.closewin === 'itemwin') INV.hideDetail(); if (b.dataset.closewin === 'bulkwin') INV.bulkClose(); });   // 아이템 정보 닫기 → 비교 창도 같이 닫힘
  $('btn-map').onclick = () => openMap(); $('btn-home').onclick = () => { if (SCENE === 'field') scrollHome(); };

  // ---- 배경음악
  // 배경음악: 마을 = Village Market Day, 이야기섬 = 이야기섬 테마, 사막 = Desert Pulse, 보스 전투 = 보스 테마
  // Web Audio로 재생 (아티팩트 화면 등 미디어 태그가 막히는 환경 대비), 안 되면 <audio> 태그로
  const SRC = { town: 'assets/sound/bgm_town.mp3', island: 'assets/sound/bgm_island.mp3', desert: 'assets/sound/bgm_desert.mp3', orc: 'assets/sound/bgm_orc.mp3', bugbear: 'assets/sound/bgm_bugbear.mp3', dungeon: 'assets/sound/bgm_dungeon.mp3', snow: 'assets/sound/bgm_snow.mp3', boss: 'assets/sound/bgm_boss.mp3' };
  const EL = { town: $('bgm'), island: $('bgm-island'), desert: $('bgm-desert'), orc: $('bgm-orc'), bugbear: $('bgm-bugbear'), boss: $('bgm-boss') };
  const T = {}; let unlocked = false, muted = !SND.get().bgmOn, curWant = null;
  function track(k) { if (T[k]) return T[k]; const t = T[k] = { buf: null, src: null, gain: null, loading: null, failed: false };
    t.loading = fetch(SRC[k]).then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(b => new Promise((ok, no) => AC.decodeAudioData(b, ok, no))).then(buf => { t.buf = buf; }).catch(() => { t.failed = true; });
    return t; }
  function setVol(k, v) {
    if (!AC) return; const t = track(k);
    if (t.failed) { const a = EL[k]; if (!a) return; if (v > 0) { if (a.paused) { if (k === 'boss') a.currentTime = 0; a.play().catch(() => {}); } a.volume = v; } else if (!a.paused) a.pause(); return; }
    if (!t.buf) { if (v > 0) t.loading.then(() => { if (curWant === k) setVol(k, v); else if (t.failed) setVol(k, 0); }); return; }
    const now = AC.currentTime;
    if (v > 0 && !t.src) { t.gain = AC.createGain(); t.gain.gain.value = 0; t.gain.connect(AC.destination); t.src = AC.createBufferSource(); t.src.buffer = t.buf; t.src.loop = true; t.src.connect(t.gain); t.src.start(); }
    if (!t.src) return;
    t.gain.gain.cancelScheduledValues(now); t.gain.gain.setValueAtTime(t.gain.gain.value, now); t.gain.gain.linearRampToValueAtTime(v, now + 1.2);
    if (v === 0) { const s0 = t.src, g0 = t.gain; t.src = null; t.gain = null; setTimeout(() => { try { s0.stop(); } catch (e) {} g0.disconnect(); }, 1300); }
  }
  const bossFight = () => foxes.some(f => !f.dead && MOB[f.kind] && MOB[f.kind].boss && f.aggro);   // 보스 전투 중이면 보스 음악
  function wantBGM() { return SCENE === 'town' ? 'town' : bossFight() ? 'boss' : ISLE ? (ISLE.def && ISLE.def.sand ? 'desert' : ISLE.def && ISLE.def.forest ? 'orc' : ISLE.def && (ISLE.def.gore || ISLE.def.maze) ? (ISLE.def.maze && SRC.dungeon ? 'dungeon' : 'bugbear') : ISLE.def && ISLE.def.snow && SRC.snow ? 'snow' : 'island') : null; }   // 사막 지역 = Desert Pulse
  function syncBGM() { const want = curWant = wantBGM(), K = SND.bgmK(); for (const k in SRC) setVol(k, k === want && unlocked && !muted && K > 0 ? (k === 'boss' ? 0.6 : 0.5) * K : 0); }
  const fadeTo = () => syncBGM();
  $('inv-sort').onclick = () => INV.sortBag(); if ($('inv-bulk')) $('inv-bulk').onclick = () => INV.bulkOpen();
  { const tip = $('stat-tip'); document.querySelectorAll('#charwin dt[data-tip]').forEach(dt => {   // 능력치 설명 말풍선
      dt.onmouseenter = () => { tip.innerHTML = `<b>${dt.textContent}</b>${dt.dataset.tip}`; tip.hidden = false; };
      dt.onmousemove = ev => { const w = tip.offsetWidth, h = tip.offsetHeight; tip.style.left = Math.min(innerWidth - w - 8, ev.clientX + 16) + 'px'; tip.style.top = Math.min(innerHeight - h - 8, ev.clientY + 14) + 'px'; };
      dt.onmouseleave = () => { tip.hidden = true; }; }); }
  if (window.DEMO_MODE) { $('btn-dn').hidden = false; $('btn-dn').onclick = () => DN.toggle();
    $('btn-god').hidden = false; $('btn-god').onclick = () => { GOD = !GOD; INV.godScrolls(GOD); { const gp = $('godpanel'); if (gp) gp.hidden = !GOD; } $('btn-god').setAttribute('aria-pressed', GOD); $('btn-god').textContent = GOD ? '갓 모드 켜짐' : '갓 모드 (테스트)'; if (GOD) { coins += 50000; say('갓 모드: 50,000 골드를 받았습니다.', '#ffd86a'); say('갓 모드: 순간이동·귀환·강화·축복·속성 주문서를 무한으로 쓸 수 있습니다. (테스트 패널 열림)', '#ffd86a'); } if (!GOD) { GOD_INV = GOD_OHK = GOD_FAST = GOD_MP = false; } window.godSync && godSync(); say(GOD ? '갓 모드: 테스트 패널에서 무적·몹 한 방·빠른 이동을 따로 켤 수 있어요.' : '갓 모드를 껐습니다. (무적·몹 한 방·빠른 이동도 꺼짐)', '#f2d98a'); }; }
  // 갓 모드 테스트 패널: 레벨 정하기 · 체력/마나 가득 · 골드 · 낮/밤
  { const gp = $('godpanel');
    if (gp) { const inp = $('gp-lv'), clampL = v => Math.max(1, Math.min(99, Math.round(+v || 1)));
      const setLevel = L => { L = clampL(L); const CD = CLS_DEF[CLASS]; let bh = CD.hp, bm = CD.mp; let sd = L * 977 + 13; const R0 = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);   // Lv1부터 레벨업 규칙대로 다시 계산 (HP +8~12, MP 절반 확률 +1)
        for (let l = 2; l <= L; l++) { bh += CD.hpLv[0] + Math.floor(R0() * (CD.hpLv[1] - CD.hpLv[0] + 1)); bm += CD.mpLv[0] + Math.floor(R0() * (CD.mpLv[1] - CD.mpLv[0] + 1)); }
        const up = L > hero.lv; hero.lv = L; hero.exp = 0; hero.baseHP = bh; hero.baseMP = bm; INV.setLevelPts(Math.floor(L / 5)); INV.render(); hero.hp = hero.max; hero.mp = hero.maxmp; if (up) levelUpFx();
        say(`갓 모드: 레벨 ${L}(으)로 설정했습니다. (HP ${hero.max} · MP ${hero.maxmp} · 보너스 능력치 ${hero.bonusPts} · 배울 수 있는 마법 ${Math.min(MAGIC_MAX[CLASS], Math.floor(L / 4))}서클)`, '#ffd86a'); inp.value = L; };
      let lvDirty = false;   // 숫자를 바꾸는 중에는 현재 레벨로 되돌리지 않음 (적용 누르면 해제)
      $('gp-minus').onclick = () => { inp.value = clampL(+inp.value - 1); lvDirty = true; }; $('gp-plus').onclick = () => { inp.value = clampL(+inp.value + 1); lvDirty = true; }; inp.oninput = () => { lvDirty = true; };
      $('gp-apply').onclick = () => { lvDirty = false; setLevel(inp.value); }; inp.onkeydown = ev => { ev.stopPropagation(); if (ev.key === 'Enter') { lvDirty = false; setLevel(inp.value); } };
      $('gp-full').onclick = () => { hero.hp = hero.max; hero.mp = hero.maxmp; say('갓 모드: 체력·마나를 가득 채웠습니다.', '#ffd86a'); };
      $('gp-gold').onclick = () => { coins += 100000; INV.render(); say('갓 모드: 골드 +100,000', '#ffd86a'); };
      $('gp-dn').onclick = () => { DN.toggle(); say('낮/밤을 바꿨습니다.', '#9c9682'); };
      // 무적 · 몹 한 방 · 빠른 이동: 따로 켜고 끔 (갓 모드를 끄면 모두 꺼짐)
      window.godSync = () => { for (const [id, v, nm] of [['gp-inv', GOD_INV, '무적'], ['gp-ohk', GOD_OHK, '몹 한 방'], ['gp-fast', GOD_FAST, '이동 1.5배'], ['gp-mp', GOD_MP, '마나 무제한']]) { const b = $(id); if (b) { b.textContent = `${nm} ${v ? 'ON' : 'OFF'}`; b.classList.toggle('on', v); b.setAttribute('aria-pressed', v); } } };
      $('gp-inv').onclick = () => { GOD_INV = !GOD_INV; godSync(); say(`갓 모드: 무적 ${GOD_INV ? '켜짐 (피해·화상·둔화 없음)' : '꺼짐'}`, '#ffd86a'); };
      $('gp-ohk').onclick = () => { GOD_OHK = !GOD_OHK; godSync(); say(`갓 모드: 몹 한 방 ${GOD_OHK ? '켜짐 (항상 명중·한 번에 처치)' : '꺼짐'}`, '#ffd86a'); };
      $('gp-fast').onclick = () => { GOD_FAST = !GOD_FAST; godSync(); say(`갓 모드: 이동 1.5배 ${GOD_FAST ? '켜짐' : '꺼짐'}`, '#ffd86a'); };
      $('gp-mp').onclick = () => { GOD_MP = !GOD_MP; godSync(); say(`갓 모드: 마나 무제한 ${GOD_MP ? '켜짐 (MP 소모 없음 · 항상 가득)' : '꺼짐'}`, '#ffd86a'); };
      $('gp-skills').onclick = () => { const L = Object.keys(SK).filter(id => { const k = SK[id]; if (!k || k.hidden) return false; if (k.kind === 'skill') return CLASS === 'knight'; if (k.kind === 'spirit') return CLASS === 'elf'; if (k.cls && !k.cls.includes(CLASS)) return false; if (k.kind === 'magic') return (k.circle || 1) <= MAGIC_MAX[CLASS]; return false; }); let n = 0; for (const id of L) if (!LEARNED.has(id)) { LEARNED.add(id); n++; } INV.render(); say(`갓 모드: ${CLASS_NAME[CLASS]} 스킬 ${L.length}개를 모두 배웠습니다. (새로 ${n}개 · 레벨 제한 무시)`, '#ffd86a'); };
      godSync();
      { const sel = $('gp-mon');   // 몬스터 소환: 고른 몬스터를 캐릭터 주변 빈칸에 n마리 (마을 제외)
        if (sel) { sel.innerHTML = Object.keys(MOB).filter(k => !k.startsWith('pet_')).sort((a, b) => (MOB[a].lv || 0) - (MOB[b].lv || 0)).map(k => `<option value="${k}">${MOB[k].name} (Lv.${MOB[k].lv || '?'}${MOB[k].boss ? ' · 보스' : ''})</option>`).join('');
          sel.onkeydown = ev => ev.stopPropagation(); $('gp-mn').onkeydown = ev => ev.stopPropagation();
          $('gp-msum').onclick = () => {   // 마을에서도 소환 가능 (테스트)
            const k = sel.value, n = Math.max(1, Math.min(100, Math.floor(+$('gp-mn').value || 1))); $('gp-mn').value = n;
            const used = new Set(foxes.filter(f => !f.dead).map(f => f.j * 1000 + f.i)); used.add(hero.j * 1000 + hero.i); let made = 0;
            for (let r = 1; r <= 12 && made < n; r++) { const ring = []; for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (Math.max(Math.abs(di), Math.abs(dj)) === r) ring.push([hero.i + di, hero.j + dj]);
              ring.sort(() => Math.random() - 0.5); for (const [i, j] of ring) { if (made >= n) break; if (!walkable(i, j) || used.has(j * 1000 + i)) continue; used.add(j * 1000 + i); const m = mkMob(k, i, j); m.home = [i, j]; m.summoned = true; foxes.push(m); made++; } }
            say(made ? `갓 모드: ${MOB[k].name} ${made}마리를 소환했습니다.` : '갓 모드: 주변에 빈 자리가 없습니다.', '#ffd86a'); };
          $('gp-mkill').onclick = () => { const L = foxes.filter(f => f.summoned && !f.dead); if (!L.length) { say('갓 모드: 퇴치할 소환 몬스터가 없습니다.', '#9c9682'); return; }   // 한꺼번에 처치 → 드랍률 확인용 집계
            const g0 = new Set(GROUND.list()), c0 = coins; for (const f of L) { f.hp = 0; killCheck(f); }
            const got = GROUND.list().filter(d => !g0.has(d)), by = {}, names = {}; for (const d of got) { const it = ITEMS[d.id], r = it.rar || '일반'; by[r] = (by[r] || 0) + 1; names[it.name] = (names[it.name] || 0) + d.n; }
            say(`갓 모드: 소환 몬스터 ${L.length}마리 퇴치 · 골드 +${(coins - c0).toLocaleString()} · 바닥 드랍 ${got.length}개 (${['일반', '고급', '희귀', '영웅'].map(r => r + ' ' + (by[r] || 0)).join(' · ')})`, '#ffd86a');
            const top = Object.entries(names).sort((a, b) => b[1] - a[1]); if (top.length) say('드랍 목록: ' + top.slice(0, 14).map(([n, c]) => `${n}×${c}`).join(', ') + (top.length > 14 ? ` 외 ${top.length - 14}종` : ''), '#e8d8a8'); };
          $('gp-gclear').onclick = () => { const n = GROUND.clear(); say(n ? `갓 모드: 바닥 아이템 ${n}개를 모두 지웠습니다. (모든 지역)` : '갓 모드: 지울 바닥 아이템이 없습니다.', '#9c9682'); };
          $('gp-mclear').onclick = () => { let n = 0; for (let q = foxes.length - 1; q >= 0; q--) if (foxes[q].summoned) { if (hero.target === foxes[q]) hero.target = null; foxes.splice(q, 1); n++; } say(`갓 모드: 소환한 몬스터 ${n}마리를 지웠습니다.`, '#9c9682'); }; } }
      setInterval(() => { if (!gp.hidden && !lvDirty && document.activeElement !== inp) inp.value = hero.lv; }, 500);
      { let gt = 0; const tabs = $('gp-tabs'), list = $('gp-list');   // 아이템 지급: 부위 탭 → 등급 색 목록 → 누르면 가방에 1개
        const draw = () => { tabs.innerHTML = CX_GROUPS.map((g_, k) => `<button type="button" role="tab" aria-selected="${k === gt}" data-k="${k}">${g_}</button>`).join('');
          list.innerHTML = CX_LIST.filter(id => ITEMS[id].grp === CX_GROUPS[gt]).map(id => { const d = ITEMS[id]; return `<button type="button" class="gp-it" data-id="${id}" title="${cxInfo(d)}"><span class="ic">${ICON(d.icon)}</span><b style="color:${rarC(id)}">${d.name}</b><small style="color:${rarC(id)}">${d.rar}</small><small>${cxClsName(d)} · Lv.${d.lv}</small></button>`; }).join(''); list.scrollTop = 0; };
        tabs.onclick = ev => { const b = ev.target.closest('button[data-k]'); if (!b) return; gt = +b.dataset.k; draw(); };
        list.onclick = ev => { const b = ev.target.closest('button[data-id]'); if (!b) return; INV.add(b.dataset.id, 1); b.classList.remove('got'); void b.offsetWidth; b.classList.add('got'); };
        draw(); } } }
  $('btn-bgm').onclick = ev => { muted = !muted; $('btn-bgm').setAttribute('aria-pressed', !muted); syncBGM(); if (ev && ev.isTrusted) SND.set({ bgmOn: !muted }); };   // 직접 누른 것만 저장 (자동사냥 음소거는 저장 안 함)
  $('btn-bgm').setAttribute('aria-pressed', !muted); api.syncBGM = () => syncBGM(); api.setBgm = on => { muted = !on; $('btn-bgm').setAttribute('aria-pressed', !!on); syncBGM(); };
  api.unlockAudio = () => { if (unlocked) return; unlocked = true; initAudio(); for (const k in SRC) track(k); syncBGM(); };
  // 소리는 사용자가 처음 뭔가를 눌러야 켤 수 있음 → 화면 어디를 누르든, 키를 누르든 바로 켜지게
  ['pointerdown', 'keydown'].forEach(t => addEventListener(t, () => { initAudio(); api.unlockAudio(); }, { capture: true }));
  api.bgmTick = () => { if (wantBGM() !== curWant) syncBGM(); };

  function place(i, j) { hero.i = hero.fi = i; hero.j = hero.fj = j; hero.x = i + 0.5; hero.z = j + 0.5; hero.t = 1; hero.target = null; hero.atk = null; moveGoal = null; pending = null; const t = W2P(hero.x, hero.z); cam[0] = t[0]; cam[1] = t[1] - 20; }
  function toTown() { ISLE = null; setGeom(30); arrows.length = 0; SCENE = 'town'; ZONE = '아덴 마을'; api.enter(); place(...SPAWN); hero.row = 5; say('***** 아덴 마을에 도착했습니다 *****', '#f2e6a8'); syncBGM(); syncButtons(); }
  function toField(name) { if (name === '이야기섬') { ISLAND.enter(1, 'town'); fadeTo(0); syncButtons(); return; }
    if (name === '사막필드') { ISLAND.enter(3, 'town'); fadeTo(0); syncButtons(); return; }
    if (name === '오크숲') { ISLAND.enter(5, 'town'); fadeTo(0); syncButtons(); return; }
    if (name === '버그베어밭') { ISLAND.enter(7, 'town'); fadeTo(0); syncButtons(); return; }
    if (name === '본토던전') { ISLAND.enter(9, 'town'); fadeTo(0); syncButtons(); return; }
    if (name === '오렌설원지역') { ISLAND.enter(11, 'town'); fadeTo(0); syncButtons(); return; } ISLE = null; setGeom(30); arrows.length = 0; SCENE = 'field'; ZONE = name; blockedT = FIELD_BLOCKED; PROPS = META.props; foxes = FIELD_FOXES; place(...META.spawn); hero.row = 1; say(`***** ${name}에 입장했습니다 *****`, '#f2e6a8'); say('여우를 클릭하면 공격합니다. R: 마을로 귀환', '#9fd0e8'); fadeTo(0); syncButtons(); }
  function syncButtons() { $('btn-home').hidden = true; }   // 위쪽 '마을로 귀환' 버튼은 쓰지 않음 (귀환 주문서·월드맵으로)
  // 사냥터 → 마을: 귀환 주문서 1장 사용 (없으면 1구간의 마을 포털을 쓰라고 안내)
  function scrollHome() { if (SCENE === 'town') return true; if (!INV.take('return_scroll')) { const [hx, hy] = W2P(hero.x, hero.z); floatText(hx, hy - 110, '귀환 주문서 없음', { color: '#ff9a8a', size: 13, big: true, life: 1.6 }); say('귀환 주문서가 없습니다. 1구간의 텔레포트(마을로 가는 포털)를 이용하세요.', '#ff8a7a'); if (AC && SFX_ON) tone(AC.currentTime, 'square', 300, 180, 0.18, 0.05); return false; }
    say('귀환 주문서를 사용했습니다.', '#a0c0f2'); toTown(); return true; }
  api.scrollHome = () => scrollHome();
  api.goTown = () => toTown();
  api.placeAt = (x, z) => { const i = Math.floor(x), j = Math.floor(z); if (walkable(i, j)) place(i, j); };
  api.toZone = (id, x, z) => { ISLAND.enter(id, 'town'); fadeTo(0); syncButtons(); if (x != null) api.placeAt(x, z); };   // 1·2구간 아무 데나 (자동사냥 복귀·업데이트 후 이어하기)
  api.toField = n => toField(n);
  api.start = () => { toTown(); say('상점 건물이나 주민을 클릭해 보세요. 월드맵은 위쪽 버튼이나 마을의 월드맵 포털로.', '#9fd0e8'); };
  return api;
})();
TOWN.start();

// ============================================================ 자동사냥 (모든 지역 1구간)

// ============================================================ 아덴상단: 장비·소모품 판매 (개별 · 일괄: 등급×종류)
const SELL = (() => {
  const $ = id => document.getElementById(id), fmt = n => n.toLocaleString();
  const GR = ['일반', '고급', '희귀', '영웅'], KINDS = [['weapon', '무기'], ['armor', '방어구'], ['acc', '장신구'], ['potion', '물약'], ['scroll', '주문서'], ['book', '마법서·기술서'], ['etc', '기타']];
  const kindOf = d => d.slot === 'weapon' ? 'weapon' : d.slot === 'ring' || d.slot === 'amulet' ? 'acc' : d.slot ? 'armor' : ['heal', 'mana', 'haste'].includes(d.use) ? 'potion' : ['enchant', 'attr', 'blessit', 'tele', 'home', 'statreset', 'revive'].includes(d.use) ? 'scroll' : d.use === 'learn' ? 'book' : 'etc';
  const BASE = { 일반: 40, 고급: 400, 희귀: 3000, 영웅: 15000 }, CONS = { 일반: 6, 고급: 40, 희귀: 250, 영웅: 1200 };
  function unit(e) { const d = ITEMS[e.id], r = d.rar || '일반', buy = TOWN.priceOf(e.id); let p = buy > 0 ? Math.floor(buy * 0.3) : d.slot ? Math.round(BASE[r] * (1 + (d.lv || 1) / 20)) : CONS[r];
    if (d.slot) { const en = e.en || 0; if (en > 0) p = Math.round(p * (1 + en * 0.25 + Math.max(0, en - 6) * 0.5)); if (e.blessed) p = Math.round(p * 1.5); if (e.attr) p = Math.round(p * (1 + e.attr.lv * 0.2)); }
    return Math.max(1, p); }
  const why = e => e.on ? '착용 중' : e.locked ? '잠김' : GOD_INF(e.id) ? '갓 모드 무한' : e.pet ? '펫 목걸이' : '';
  const sellable = () => INV.bag().filter(e => ITEMS[e.id] && !why(e));
  const st = { tab: 'one', pick: new Map(), g: new Set(['일반']), k: new Set(['weapon', 'armor']), noen: true, nobl: true };
  function bulkList() { return sellable().filter(e => { const d = ITEMS[e.id]; return st.g.has(d.rar || '일반') && st.k.has(kindOf(d)) && !(st.noen && d.slot && (e.en || 0) > 0) && !(st.nobl && e.blessed); }); }
  function row(e, sel) { const d = ITEMS[e.id], u = unit(e), n = sel ? sel : 0;
    return `<div class="sl-it${n ? ' on' : ''}" data-k="${INV.bag().indexOf(e)}"><span class="ic">${ICON(d.icon, e.blessed)}</span><span class="nm"><b style="color:${rarC(e.id)}">${nameHTML(e)}</b><small>${d.rar || '일반'} · ${KINDS.find(k => k[0] === kindOf(d))[1]} · 1개 ${fmt(u)}골드${d.stack ? ' · 보유 ' + e.n : ''}</small></span>`
      + (d.stack ? `<input type="number" class="sl-n" min="0" max="${e.n}" value="${n}" aria-label="${d.name} 판매 수량">` : `<span class="sl-ck" aria-hidden="true">${n ? '✔' : ''}</span>`) + `<span class="sl-p">${n ? fmt(u * n) : ''}</span></div>`; }
  function render() { const w = $('sellwin'); if (!w || w.hidden) return; const bag = INV.bag();
    for (const [e] of st.pick) if (!bag.includes(e) || why(e)) st.pick.delete(e);
    w.querySelectorAll('.sl-tabs [data-t]').forEach(b => b.setAttribute('aria-selected', b.dataset.t === st.tab)); $('sl-one').hidden = st.tab !== 'one'; $('sl-bulk').hidden = st.tab !== 'bulk';
    let tot = 0, cnt = 0;
    if (st.tab === 'one') { const L = sellable(); $('sl-list').innerHTML = L.length ? L.map(e => row(e, st.pick.get(e) || 0)).join('') : '<p class="sl-empty">팔 수 있는 물건이 없습니다. (착용 중·잠긴 물건은 팔 수 없어요)</p>';
      for (const [e, n] of st.pick) { tot += unit(e) * n; cnt++; } }
    else { $('sl-g').innerHTML = GR.map(g => `<button type="button" data-g="${g}" aria-pressed="${st.g.has(g)}" style="--c:${g === '일반' ? '#d8d2c4' : RARITY_C[g]}">${g}</button>`).join('');
      $('sl-k').innerHTML = KINDS.map(([k, nm]) => `<button type="button" data-kk="${k}" aria-pressed="${st.k.has(k)}">${nm}</button>`).join('');
      $('sl-noen').checked = st.noen; $('sl-nobl').checked = st.nobl;
      const L = bulkList(); for (const e of L) { tot += unit(e) * e.n; cnt++; }
      $('sl-prev').innerHTML = L.length ? L.map(e => `<div class="sl-pv"><span style="color:${rarC(e.id)}">${nameHTML(e)}${e.n > 1 ? ' ×' + e.n : ''}</span><b>${fmt(unit(e) * e.n)}</b></div>`).join('') : '<p class="sl-empty">조건에 맞는 물건이 없습니다.</p>'; }
    $('sl-sum').innerHTML = cnt ? `${st.tab === 'one' ? '선택' : '대상'} <b>${cnt}</b>종 · 합계 <b class="g">${fmt(tot)}</b> 골드` : `<span class="muted">보유 골드 ${fmt(coins)}</span>`;
    $('sl-go').textContent = st.tab === 'one' ? '선택 판매' : '일괄 판매'; $('sl-go').disabled = !cnt; }
  function doSell(items) { let tot = 0, n = 0; for (const [e, q] of items) { const u = unit(e); if (INV.sellEntry(e, q)) { tot += u * q; n++; } } coins += tot;
    if (n) { say(`아덴상단: ${n}종을 팔아 ${fmt(tot)} 골드를 받았습니다.`, '#9fe0a0'); if (AC && SFX_ON) { const t = AC.currentTime; tone(t, 'triangle', 1200, 1600, 0.08, 0.05); tone(t + 0.07, 'triangle', 1600, 2200, 0.1, 0.05); tone(t + 0.14, 'triangle', 2000, 2600, 0.12, 0.04); } }
    st.pick.clear(); render(); }
  function go() { const items = st.tab === 'one' ? [...st.pick].filter(([, q]) => q > 0) : bulkList().map(e => [e, e.n]); if (!items.length) return;
    const tot = items.reduce((a, [e, q]) => a + unit(e) * q, 0), rare = items.filter(([e]) => { const d = ITEMS[e.id]; return d.rar === '희귀' || d.rar === '영웅' || (e.en || 0) > 0 || e.blessed; }).length;
    INV.askYesNo(`${items.length}종을 ${fmt(tot)} 골드에 팔까요?`, (rare ? `희귀·영웅·강화·축복 물건 ${rare}종이 포함되어 있습니다. ` : '') + '판 물건은 되돌릴 수 없습니다.', () => doSell(items)); }
  function open() { const w = $('sellwin'); if (!w) return; w.hidden = false; st.pick.clear(); render(); say('아덴상단 로이드: 무엇이든 사들이지요. 착용 중이거나 잠근 물건은 받지 않습니다.', '#e8d8a8'); }
  { const w = $('sellwin');
    if (w) { w.querySelector('.sl-tabs').onclick = ev => { const b = ev.target.closest('[data-t]'); if (b) { st.tab = b.dataset.t; render(); } };
      $('sl-list').onclick = ev => { if (ev.target.closest('input')) return; const r = ev.target.closest('.sl-it'); if (!r) return; const e = INV.bag()[+r.dataset.k]; if (!e) return; if (st.pick.has(e)) st.pick.delete(e); else st.pick.set(e, e.n); render(); };
      $('sl-list').oninput = ev => { const inp = ev.target.closest('.sl-n'); if (!inp) return; const e = INV.bag()[+inp.closest('.sl-it').dataset.k]; if (!e) return; const q = Math.max(0, Math.min(e.n, Math.floor(+inp.value || 0))); if (q) st.pick.set(e, q); else st.pick.delete(e);
        const r = inp.closest('.sl-it'); r.classList.toggle('on', q > 0); r.querySelector('.sl-p').textContent = q ? fmt(unit(e) * q) : ''; let tot = 0, cnt = 0; for (const [x, n] of st.pick) { tot += unit(x) * n; cnt++; }
        $('sl-sum').innerHTML = cnt ? `선택 <b>${cnt}</b>종 · 합계 <b class="g">${fmt(tot)}</b> 골드` : `<span class="muted">보유 골드 ${fmt(coins)}</span>`; $('sl-go').disabled = !cnt; };
      $('sl-list').onkeydown = ev => ev.stopPropagation();
      $('sl-g').onclick = ev => { const b = ev.target.closest('[data-g]'); if (!b) return; const g = b.dataset.g; st.g.has(g) ? st.g.delete(g) : st.g.add(g); render(); };
      $('sl-k').onclick = ev => { const b = ev.target.closest('[data-kk]'); if (!b) return; const k = b.dataset.kk; st.k.has(k) ? st.k.delete(k) : st.k.add(k); render(); };
      $('sl-noen').onchange = ev => { st.noen = ev.target.checked; render(); }; $('sl-nobl').onchange = ev => { st.nobl = ev.target.checked; render(); };
      $('sl-go').onclick = go; } }
  return { open, render, unit };
})();

// ============================================================ 창고: 인벤토리와 같이 열림 · 끌어다 놓아 맡기기 / 더블클릭·끌어서 찾기
const STORE = (() => {
  const $ = id => document.getElementById(id), CAP = 80, box = [], RO = { '일반': 0, '고급': 1, '희귀': 2, '영웅': 3 };
  const why = e => e.on ? '착용 중인 장비는 맡길 수 없습니다. 먼저 벗어 주세요.' : GOD_INF(e.id) ? '갓 모드 무한 주문서는 맡길 수 없습니다.' : e.pet && e.pet.state === 'out' ? '소환 중인 펫의 목걸이는 맡길 수 없습니다.' : '';
  const label = e => INV.nameOf(e) + (ITEMS[e.id].stack && e.n > 1 ? ' ×' + e.n : '');
  function deposit(e, q) { if (!e || !ITEMS[e.id]) return false; const w = why(e); if (w) { say(w, '#f08a7a'); return false; } const d = ITEMS[e.id], same = d.stack ? box.find(x => x.id === e.id) : null;
    if (!same && box.length >= CAP) { say(`창고가 가득 찼습니다. (${CAP}칸)`, '#f08a7a'); return false; }
    q = Math.max(1, Math.min(e.n, q || e.n));
    if (d.stack && q < e.n) { e.n -= q; if (same) same.n += q; else box.push({ id: e.id, n: q, on: false }); INV.render(); say(`창고에 맡김: ${d.name} ×${q}`, '#9fd0e8'); render(); return true; }
    if (!INV.removeEntry(e)) return false; if (same) same.n += e.n; else box.push(e); say(`창고에 맡김: ${label(e)}`, '#9fd0e8'); render(); return true; }
  function withdraw(k, q) { const e = box[k]; if (!e) return; const d = ITEMS[e.id]; q = Math.max(1, Math.min(e.n, q || e.n));
    if (d.stack && q < e.n) { e.n -= q; INV.insertEntry({ id: e.id, n: q, on: false }); say(`창고에서 찾음: ${d.name} ×${q}`, '#9fd0e8'); render(); return; }
    box.splice(k, 1); INV.insertEntry(e); say(`창고에서 찾음: ${label(e)}`, '#9fd0e8'); render(); }
  // 겹치는 물건(물약·주문서 등)은 수량 묻기: 전부 / 수량 입력 / 취소
  function askQty(e, verb, cb) { const d = ITEMS[e.id]; if (!d.stack || e.n <= 1) { cb(e.n); return; }
    let w = $('qtywin'); if (!w) { w = document.createElement('div'); w.id = 'qtywin'; w.className = 'askwin'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true');
      w.innerHTML = '<div class="ask-box"><p class="ask-q" id="qty-q"></p><p class="ask-sub" id="qty-sub"></p><div class="qty-row"><button type="button" data-d="-10">−10</button><button type="button" data-d="-1">−</button><input id="qty-in" type="number" min="1" aria-label="수량"><button type="button" data-d="1">+</button><button type="button" data-d="10">+10</button></div><div class="ask-btns"><button type="button" id="qty-all"></button><button type="button" id="qty-ok"></button><button type="button" id="qty-no">취소</button></div></div>';
      document.body.appendChild(w); }
    const inp = $('qty-in'), close = () => { w.hidden = true; }, clamp = () => Math.max(1, Math.min(e.n, Math.floor(+inp.value || 1)));
    $('qty-q').textContent = `몇 개를 ${verb}하시겠습니까?`; $('qty-sub').textContent = `${d.name} · 보유 ${e.n}개`; inp.max = e.n; inp.value = e.n; $('qty-all').textContent = `전부 ${verb} (${e.n})`; $('qty-ok').textContent = `${verb}`;
    w.querySelectorAll('.qty-row [data-d]').forEach(b => b.onclick = () => { inp.value = Math.max(1, Math.min(e.n, (Math.floor(+inp.value) || 0) + +b.dataset.d)); });
    $('qty-all').onclick = () => { close(); cb(e.n); }; $('qty-ok').onclick = () => { const q = clamp(); close(); cb(q); }; $('qty-no').onclick = close;
    inp.onkeydown = ev => { ev.stopPropagation(); if (ev.key === 'Enter') { ev.preventDefault(); $('qty-ok').click(); } else if (ev.key === 'Escape') { ev.preventDefault(); close(); } };
    w.hidden = false; setTimeout(() => { inp.focus(); inp.select(); }, 30); }
  const depositAsk = e => { const w = why(e); if (w) { say(w, '#f08a7a'); return; } askQty(e, '보관', q => deposit(e, q)); };
  const withdrawAsk = k => { const e = box[k]; if (e) askQty(e, '찾기', q => withdraw(k, q)); };
  function render() { const w = $('storewin'); if (!w || w.hidden) return; const G = $('st-grid'); G.innerHTML = '';
    for (let k = 0; k < CAP; k++) { const e = box[k], c = document.createElement('button'); c.type = 'button'; c.className = 'slot';
      if (e) { const d = ITEMS[e.id], rr = d.rar || '일반'; c.innerHTML = ICON(d.icon, e.blessed) + (e.blessed ? '<i class="bl-spark"></i>' : '') + (e.en ? `<i class="en${e.en < 0 ? ' neg' : ''}">${e.en > 0 ? '+' : ''}${e.en}</i>` : '') + (d.stack ? `<b>${e.n}</b>` : '');
        c.classList.add('rar', 'r-' + RO[rr]); c.style.setProperty('--rar', rr === '일반' ? '#b9b4a8' : RARITY_C[rr]); if (e.blessed) c.classList.add('blessed');
        c.dataset.itip = INV.tipOf(e).split('\n').filter(l => !/더블클릭|꾹 누르고/.test(l)).concat('더블클릭·인벤토리로 끌어가기: 전부 찾기 · 우클릭: 수량 정해서 찾기').join('\n'); c.dataset.ic = rarC(e.id);
        c.draggable = true; c.ondragstart = ev => { ev.dataTransfer.setData('text/x-store', String(k)); ev.dataTransfer.effectAllowed = 'move'; }; c.ondblclick = () => withdraw(k); c.oncontextmenu = ev => { ev.preventDefault(); withdrawAsk(k); }; }
      else c.disabled = true; G.appendChild(c); }
    $('st-count').textContent = `${box.length} / ${CAP}`; }
  function open() { const w = $('storewin'); if (!w) return; w.hidden = false; const iw = $('invwin'); if (iw && iw.hidden) INV.toggle('invwin'); else INV.render(); render();
    say('창고지기 하딘: 맡길 물건은 인벤토리에서 이 창으로 끌어다 놓게나. 찾을 땐 더블클릭하거나 인벤토리로 끌어가면 되네.', '#e8d8a8'); }
  { const G = $('st-grid'), I = $('inv-grid');
    if (G) { const over = ev => { if ([...ev.dataTransfer.types].includes('text/x-bag')) { ev.preventDefault(); G.classList.add('drop'); } };
      G.addEventListener('dragover', over); G.addEventListener('dragenter', over); G.addEventListener('dragleave', () => G.classList.remove('drop'));
      G.addEventListener('drop', ev => { G.classList.remove('drop'); const k = ev.dataTransfer.getData('text/x-bag'); if (k === '') return; ev.preventDefault(); const e = INV.bag()[+k]; if (e) depositAsk(e); }); }
    if (I) { I.addEventListener('dragover', ev => { if ([...ev.dataTransfer.types].includes('text/x-store')) ev.preventDefault(); });
      I.addEventListener('drop', ev => { const k = ev.dataTransfer.getData('text/x-store'); if (k === '') return; ev.preventDefault(); withdraw(+k); }); }
    const sb = $('st-sort'); if (sb) sb.onclick = () => { box.sort((a, b) => { const A = ITEMS[a.id], B = ITEMS[b.id]; return (!!B.slot - !!A.slot) || (RO[B.rar || '일반'] - RO[A.rar || '일반']) || A.name.localeCompare(B.name, 'ko'); }); render(); }; }
  return { open, render, deposit, depositAsk, list: () => box, load(L) { box.length = 0; for (const e of L || []) if (e && ITEMS[e.id]) box.push(e); } };
})();

// 캐릭터 창: 장비 칸 아래 캐릭터 미리보기 (지금 착용한 장비 그대로 · 천천히 숨쉬는 대기 동작 · 클릭하면 방향 바꾸기)
window.LOOKPV = (() => { let row = 1, t0 = 0, raf = 0; const cvs = () => document.getElementById('cw-look');
  function draw(ts) { raf = 0; const c = cvs(), w = document.getElementById('charwin'); if (!c || !w || w.hidden) return; const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height);
    const gr = g.createRadialGradient(c.width / 2, c.height - 22, 4, c.width / 2, c.height - 22, c.width * 0.45); gr.addColorStop(0, 'rgba(255,230,170,.16)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(c.width / 2, c.height - 20, 34, 9, 0, 0, 7); g.fill();
    g.save(); g.translate(c.width / 2, c.height - 20); g.scale(1.8, 1.8); const fr = Math.floor((ts || 0) / 1000 * 6) % 8; drawHeroSprite(g, 'idle', fr, row, 0, 0); g.restore();
    raf = requestAnimationFrame(draw); }
  function kick() { if (!raf) raf = requestAnimationFrame(draw); }
  document.addEventListener('click', ev => { if (ev.target && ev.target.id === 'cw-look') { row = (row + 1) % 8; kick(); } });
  return { kick };
})();

// ============================================================ 채팅: 채팅창 맨 아래 입력칸 (항상 열림) — 글자 키를 누르면 바로 입력, Enter로 보내기
const CHAT = (() => {
  let inp = null;
  function el() { if (inp) return inp; inp = document.createElement('input'); inp.id = 'chat-in'; inp.type = 'text'; inp.maxLength = 80; inp.autocomplete = 'off'; inp.spellcheck = false;
    inp.setAttribute('aria-label', '채팅 입력'); Object.assign(inp.style, { position: 'fixed', zIndex: 6, background: 'rgba(8,6,4,.78)', border: '1px solid #6a5430', borderRadius: '2px', color: '#fff', caretColor: 'transparent', padding: '0 7px', outline: 'none', fontFamily: '"Noto Sans KR",sans-serif', boxSizing: 'border-box' });
    document.body.appendChild(inp); return inp; }
  function place(x, y, w, h) { const e = el(), r = cv.getBoundingClientRect(), z = curZ, ih = 19;
    const L = r.left + (x + 6) * z, T = r.top + (y + h - ih - 5) * z, W = (w - 14) * z, H = ih * z;
    if (e._k !== L + '|' + T + '|' + W) { e._k = L + '|' + T + '|' + W; Object.assign(e.style, { left: L + 'px', top: T + 'px', width: W + 'px', height: H + 'px', fontSize: Math.round(12 * z) + 'px' }); } }
  function send() { const e = el(), t = e.value.trim(); e.value = ''; if (!t) return;
    const all = t[0] === '!' && t.length > 1, tt = all ? t.slice(1).trim() : t; if (!tt) return; say(`${all ? '[전체] ' : ''}${PNAME()}: ${tt}`, all ? '#ffd28a' : '#ffffff', 1); hero.chat = { t: tt, until: time + 5 }; NET.chat(t); if (logScroll) logScroll = 0; }
  function bubble(g, h) { const [hx, hy] = W2P(h.x, h.z); g.save(); g.font = '700 11px "Noto Sans KR",sans-serif'; const maxW = 170, words = [...h.chat.t], lines = []; let cur = '';
    for (const ch of words) { if (g.measureText(cur + ch).width > maxW) { lines.push(cur); cur = ch; if (lines.length === 2) break; } else cur += ch; } if (lines.length < 2 && cur) lines.push(cur); else if (cur && lines.length === 2) lines[1] = lines[1].slice(0, -1) + '…';
    const nm = h.pname || PNAME(); g.font = '800 10px "Noto Sans KR",sans-serif'; const nw = g.measureText(nm).width; g.font = '700 11px "Noto Sans KR",sans-serif';
    const w = Math.max(nw, ...lines.map(l => g.measureText(l).width)) + 14, lh = 14, bh = lines.length * lh + 8 + 13, bx = Math.round(hx - w / 2), by = Math.round(hy - 100 - bh), left = h.chat.until - time, a = Math.min(1, left / 0.4);
    g.globalAlpha = a; g.fillStyle = 'rgba(12,10,8,.82)'; g.strokeStyle = 'rgba(240,226,190,.75)'; g.lineWidth = 1; g.beginPath(); g.roundRect ? g.roundRect(bx, by, w, bh, 5) : g.rect(bx, by, w, bh); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(hx - 5, by + bh); g.lineTo(hx, by + bh + 6); g.lineTo(hx + 5, by + bh); g.closePath(); g.fill(); g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = '#fff';
    g.font = '800 10px "Noto Sans KR",sans-serif'; g.fillStyle = '#ffd86a'; g.fillText(nm, hx, by + 3); g.font = '700 11px "Noto Sans KR",sans-serif'; g.fillStyle = '#fff';
    lines.forEach((l, i) => g.fillText(l, hx, by + 16 + i * lh)); g.restore(); }
  // 게임 화면을 한 번 클릭한 상태(armed)에서만 채팅 입력이 켜짐 — 창 밖을 누르거나 다른 창으로 가면 꺼짐. 커서(캐럿)는 숨겨서 깜빡임 없음
  // 켜진 동안엔 입력칸이 포커스를 유지 (한글 IME 첫 글자가 빠지지 않게) — Tab·F키·빈 칸에서의 ESC는 게임 단축키로 그대로 전달
  let armed = false;
  const setArmed = v => { armed = v; const e = el(); if (!v && document.activeElement === e) e.blur(); };
  const modal = () => ['askwin', 'qtywin', 'namescr', 'charsel', 'loginscr'].some(id => { const el = document.getElementById(id); return el && !el.hidden; });
  const refocus = () => { if (!armed || !document.hasFocus()) return; const e = el(), ae = document.activeElement; if (ae && ae !== document.body && ae !== e && /INPUT|TEXTAREA|SELECT/.test(ae.tagName)) return; if (modal()) return; e.focus({ preventScroll: true }); };
  setArmed(false);
  addEventListener('pointerdown', () => { if (!armed) setArmed(true); }, true);
  addEventListener('blur', () => setArmed(false));
  document.addEventListener('visibilitychange', () => { if (document.hidden) setArmed(false); });
  document.addEventListener('pointerup', () => setTimeout(refocus, 0)); setInterval(() => { if (document.activeElement === document.body) refocus(); }, 1000);
  document.addEventListener('keydown', ev => { const e = el(), ae = document.activeElement; if (!armed && ae !== e) return;
    if (ae === e) { if (ev.key === 'Enter' && !ev.isComposing) { ev.preventDefault(); send(); return; }
      if (ev.key === 'Escape') { if (e.value) { ev.preventDefault(); ev.stopImmediatePropagation(); e.value = ''; } return; }
      if (ev.key === 'Tab' || /^F\d+$/.test(ev.key)) return; ev.stopPropagation(); return; }
    if (ae && /INPUT|TEXTAREA|SELECT/.test(ae.tagName)) return; const ask = document.getElementById('askwin'); if (ask && !ask.hidden) return;
    if (ev.key === 'Enter') { ev.preventDefault(); e.focus(); return; }
    if ((ev.key.length === 1 || ev.key === 'Process') && !ev.ctrlKey && !ev.metaKey && !ev.altKey) e.focus(); }, true);
  return { place, bubble, send, el };
})();

// ============================================================ 아이디: 처음 캐릭터를 만들 때 정함 · 중복은 서버(아티팩트 공유 DB)에서 확인
// ============================================================ 계정 서버 (Firebase): 로그인(이메일=계정@aden.world) + Firestore 저장 — PC 실행 파일·웹 공통
// users/{uid} = { acc, chars(JSON: 직업→이름), store(JSON: 창고) } · users/{uid}/chars/{직업} = { name, data(JSON 세이브), ver, at } · names/{이름hex} = { uid, name, cls }
// 웹 API 키는 공개용 식별자(보안은 서버 규칙: 자기 uid 문서만 읽기·쓰기). 연결이 안 되면(오프라인·차단) 예전 방식(이 기기/아티팩트 DB)으로
const CLOUD = (() => {
  const C = Object.assign({ key: 'AIzaSyB7YIKj-XThk-T8sppqKdBAh8yjTTsqDUw', project: 'aden-world' }, window.ADEN_FB || {});
  const AUTH = C.auth || 'https://identitytoolkit.googleapis.com/v1/', TOK = C.token || 'https://securetoken.googleapis.com/v1/', FS = C.fs || `https://firestore.googleapis.com/v1/projects/${C.project}/databases/(default)/documents/`;
  let S = null, reach = null;
  const email = a => String(a).toLowerCase() + '@aden.world', pwOf = pw => 'aden:' + pw;   // 4자 비밀번호도 서버 최소 길이(6자)를 넘도록 앞에 고정 글자를 붙임
  const err = (j, st) => { const m = (j && j.error && (j.error.message || j.error.status)) || ('HTTP ' + st); const e = new Error(m); e.code = String(m).split(/[ :]/)[0]; e.status = st; return e; };
  async function post(url, body) { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json().catch(() => null); if (!r.ok) throw err(j, r.status); return j; }
  const setS = j => (S = { uid: j.localId || j.user_id, tok: j.idToken || j.id_token, ref: j.refreshToken || j.refresh_token, exp: Date.now() + ((+(j.expiresIn || j.expires_in) || 3600) - 180) * 1000 });
  async function ping() { if (reach !== null) return reach; try { const r = await Promise.race([fetch(`${AUTH}accounts:lookup?key=${C.key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 6000))]); reach = r.status > 0; } catch (e) { reach = false; } return reach; }
  const signUp = async (a, pw) => setS(await post(`${AUTH}accounts:signUp?key=${C.key}`, { email: email(a), password: pwOf(pw), returnSecureToken: true }));
  const signIn = async (a, pw) => setS(await post(`${AUTH}accounts:signInWithPassword?key=${C.key}`, { email: email(a), password: pwOf(pw), returnSecureToken: true }));
  async function token() { if (!S) throw err(null, 401); if (Date.now() > S.exp) { const r = await fetch(`${TOK}token?key=${C.key}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(S.ref) }); const j = await r.json().catch(() => null); if (!r.ok) throw err(j, r.status); setS(j); } return S.tok; }
  // 문서 필드는 모두 문자열 (객체는 JSON으로)
  const enc = o => ({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { stringValue: typeof v === 'string' ? v : JSON.stringify(v) }])) });
  const dec = d => { const o = {}; for (const [k, v] of Object.entries((d && d.fields) || {})) o[k] = v.stringValue != null ? v.stringValue : v.integerValue != null ? +v.integerValue : null; return o; };
  const mask = o => Object.keys(o).map(k => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
  async function get(path, pub) { const h = pub ? {} : { Authorization: 'Bearer ' + await token() }; const r = await fetch(FS + path, { headers: h }); if (r.status === 404) return null; const j = await r.json().catch(() => null); if (!r.ok) throw err(j, r.status); return dec(j); }
  async function set(path, o, merge) { const q = [merge ? mask(o) : '', ''].filter(Boolean).join('&'); const r = await fetch(FS + path + (q ? '?' + q : ''), { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await token() }, body: JSON.stringify(enc(o)) }); if (!r.ok) throw err(await r.json().catch(() => null), r.status); return true; }
  async function create(path, o) { const r = await fetch(FS + path + '?currentDocument.exists=false', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await token() }, body: JSON.stringify(enc(o)) }); if (r.ok) return true; if (r.status === 400 || r.status === 409 || r.status === 412 || r.status === 403) return false; throw err(await r.json().catch(() => null), r.status); }
  async function del(path) { const r = await fetch(FS + path, { method: 'DELETE', headers: { Authorization: 'Bearer ' + await token() } }); return r.ok; }
  // 창을 닫을 때: 응답을 기다릴 수 없어서 keepalive로 한 번 보냄 (토큰이 아직 유효할 때만, 64KB 이하)
  function beacon(path, o, merge) { if (!S || Date.now() > S.exp) return false; const body = JSON.stringify(enc(o)); if (body.length > 60000) return false; try { fetch(FS + path + (merge ? '?' + mask(o) : ''), { method: 'PATCH', keepalive: true, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + S.tok }, body }); return true; } catch (e) { return false; } }
  return { ping, signUp, signIn, get, set, create, del, beacon, uid: () => S && S.uid, on: () => !!S, out() { S = null; }, session: () => S, restore(s) { if (s && s.uid && s.ref) S = s; }, reachable: () => reach };
})();
// ============================================================ 캐릭터 저장: 레벨·경험치·능력치·가방·장비·골드·배운 마법·단축키·자동 설정 + 계정 창고 · 20초마다 바뀐 게 있으면 자동 저장
const SAVE = (() => {
  let on = false, cls = null, t = 0, busy = false, lastC = '', lastS = '', pend = null;
  const hex = s => [...new TextEncoder().encode(String(s).toLowerCase())].map(b => b.toString(16).padStart(2, '0')).join('');
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  let db; async function adb() { if (db !== undefined) return db; db = null; try { if (window.claude && claude.use) db = await claude.use('db'); } catch (e) { db = null; } return db; }
  function snap() { const b = {}; for (const k in BUFF) if (BUFF[k] > 0) b[k] = Math.round(BUFF[k]);
    return { v: 1, ver: GAME_VER, cls: CLASS, name: PNAME(), lv: hero.lv, exp: hero.exp, bhp: hero.baseHP, bmp: hero.baseMP, bp: hero.bonusPts, hp: Math.ceil(hero.hp), mp: Math.floor(hero.mp), coins: Math.floor(coins),
      learned: [...LEARNED], buff: b, inv: INV.dump(), auto: AUTO.cfg(), snd: SND.get() }; }
  function apply(s) { if (!s || s.cls !== CLASS) return false;
    hero.lv = Math.max(1, s.lv | 0); hero.exp = Math.max(0, +s.exp || 0); if (s.bhp) hero.baseHP = +s.bhp; if (s.bmp) hero.baseMP = +s.bmp; hero.bonusPts = s.bp | 0; coins = Math.max(0, s.coins | 0);
    LEARNED.clear(); for (const id of s.learned || []) if (SK[id]) LEARNED.add(id); for (const k in BUFF) BUFF[k] = (s.buff && +s.buff[k]) || 0;
    INV.load(s.inv); if (s.auto) AUTO.setCfg(s.auto); if (s.snd) SND.apply(s.snd); hero.hp = Math.max(1, Math.min(hero.max, s.hp || hero.max)); hero.mp = Math.max(0, Math.min(hero.maxmp, s.mp != null ? s.mp : hero.maxmp)); INV.render(); return true; }
  const cloud = () => ACCOUNT.mode() === 'cloud' && CLOUD.on();
  const lkey = c => 'aden_save_' + String(ACCOUNT.acc() || '').toLowerCase() + '_' + c;
  async function load(c) { try { if (cloud()) { const d = await CLOUD.get(`users/${CLOUD.uid()}/chars/${c}`); return d && d.data ? JSON.parse(d.data) : null; }
      const a = await adb(); if (a) { try { const sn = await a.doc(`saves/${hex(ACCOUNT.acc())}_${c}`).get(); if (sn.exists) return JSON.parse(sn.data().data); } catch (e) {} } const v = ls.get(lkey(c)); return v ? JSON.parse(v) : null; }
    catch (e) { console.warn('load', e); return undefined; } }   // undefined = 서버 오류 (null = 저장 없음)
  async function loadStore() { try { if (cloud()) { const d = await CLOUD.get(`users/${CLOUD.uid()}`); return d && d.store ? JSON.parse(d.store) : null; } const v = ls.get('aden_store_' + String(ACCOUNT.acc() || '').toLowerCase()); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function start(c, store) { cls = c; on = true; t = 0; lastC = JSON.stringify(snap()); lastS = JSON.stringify(STORE.list()); if (store) { STORE.load(store); lastS = JSON.stringify(STORE.list()); } }
  // 지금 저장 (바뀐 것만) — force면 같아도 저장
  async function now(force, quiet) { if (!on) return false; if (busy) { pend = pend || new Promise(r => setTimeout(r, 400)).then(() => now(force, quiet)); return pend; } busy = true; let ok = true;
    try { const S_ = snap(), j = JSON.stringify(S_), st = JSON.stringify(STORE.list());
      if (force || j !== lastC) { if (cloud()) await CLOUD.set(`users/${CLOUD.uid()}/chars/${cls}`, { name: S_.name, data: j, ver: String(GAME_VER), at: String(Date.now()) });
        else { const a = await adb(); let done = false; if (a) { try { await a.doc(`saves/${hex(ACCOUNT.acc())}_${cls}`).set({ data: j, at: Date.now() }); done = true; } catch (e) {} } if (!done) ls.set(lkey(cls), j); }
        lastC = j; }
      if (force || st !== lastS) { if (cloud()) await CLOUD.set(`users/${CLOUD.uid()}`, { store: st }, true); else ls.set('aden_store_' + String(ACCOUNT.acc() || '').toLowerCase(), st); lastS = st; }
      if (!quiet) say('저장했습니다.' + (cloud() ? ' (계정 서버)' : ' (이 기기)'), '#9fd08a'); }
    catch (e) { ok = false; console.warn('save', e); if (!quiet) say('저장하지 못했어요. 인터넷 연결을 확인해 주세요. (잠시 뒤 자동으로 다시 시도)', '#f08a7a'); }
    busy = false; pend = null; return ok; }
  function tick(dt) { if (!on) return; t += dt; if (t >= 20) { t = 0; now(false, true); } }
  // 창 닫기 직전: 기다릴 수 없으니 keepalive로 마지막 저장
  function flush() { if (!on) return; try { const S_ = snap(), j = JSON.stringify(S_); if (cloud()) { if (j !== lastC) CLOUD.beacon(`users/${CLOUD.uid()}/chars/${cls}`, { name: S_.name, data: j, ver: String(GAME_VER), at: String(Date.now()) }); const st = JSON.stringify(STORE.list()); if (st !== lastS) CLOUD.beacon(`users/${CLOUD.uid()}`, { store: st }, true); } else { ls.set(lkey(cls), j); ls.set('aden_store_' + String(ACCOUNT.acc() || '').toLowerCase(), JSON.stringify(STORE.list())); } } catch (e) {} }
  addEventListener('beforeunload', flush); addEventListener('pagehide', flush);
  if (window.native && window.native.onClosing) window.native.onClosing(async () => { try { await Promise.race([now(false, true), new Promise(r => setTimeout(r, 2500))]); } catch (e) {} window.native.closeNow && window.native.closeNow(); });   // PC: 창 닫을 때 저장 끝나고 닫힘
  return { snap, apply, load, loadStore, start, now, tick, flush, on: () => on, stop() { on = false; } };
})();
const NAMEREG = (() => {
  const $ = id => document.getElementById(id), KEY = 'aden_pname', RE = /^[가-힣a-zA-Z0-9]{2,12}$/;
  let db, user, uid, okName = null, busy = false, cb = null, back = null, curCls = 'knight';
  const me = () => (ACCOUNT.acc() ? 'acc:' + ACCOUNT.acc().toLowerCase() : uid);
  const hex = s => [...new TextEncoder().encode(s.toLowerCase())].map(b => b.toString(16).padStart(2, '0')).join('');
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const localId = () => { let v = store.get('aden_uid'); if (!v) { v = 'u' + Math.random().toString(36).slice(2) + Date.now().toString(36); store.set('aden_uid', v); } return v; };
  async function conn() { if (db !== undefined) return db; db = null; user = null;
    try { if (window.claude && claude.use) { db = await claude.use('db'); user = await claude.use('user'); } } catch (e) { db = null; }
    try { uid = (user && await user.id()) || localId(); } catch (e) { uid = localId(); } return db; }
  const msg = (t, ok) => { const m = $('nm-msg'); if (m) { m.textContent = t; m.className = 'nm-msg ' + (ok ? 'ok' : 'no'); } };
  const cloud = () => ACCOUNT.mode() === 'cloud' && CLOUD.on();
  async function check(name) { if (!RE.test(name)) return { ok: false, msg: '아이디는 한글·영문·숫자 2~12자로 정해 주세요. (띄어쓰기·특수문자 불가)' };
    if (cloud()) { try { const o = await CLOUD.get('names/' + hex(name), true); return o && o.uid !== CLOUD.uid() ? { ok: false, msg: '이미 다른 사람이 쓰고 있는 아이디입니다.' } : { ok: true, msg: '사용할 수 있는 아이디예요!' }; } catch (e) { return { ok: false, msg: '서버 확인에 실패했어요. 잠시 후 다시 눌러 주세요.' }; } }
    const d = await conn();
    if (!d) { const L = JSON.parse(store.get('aden_names') || '[]'); return L.includes(name.toLowerCase()) ? { ok: false, msg: '이미 이 기기에서 쓰고 있는 아이디입니다.' } : { ok: true, msg: '사용할 수 있어요. (서버에 연결되지 않아 이 기기 기준으로만 확인했어요)' }; }
    try { const sn = await d.doc('names/' + hex(name)).get(); const o = sn.exists ? (sn.data() || {}).owner : null;
      return o && o !== uid && o !== me() ? { ok: false, msg: '이미 다른 사람이 쓰고 있는 아이디입니다.' } : { ok: true, msg: '사용할 수 있는 아이디예요!' }; }
    catch (e) { return { ok: false, msg: '서버 확인에 실패했어요. 잠시 후 다시 눌러 주세요.' }; } }
  async function claim(name) { if (cloud()) { try { if (await CLOUD.create('names/' + hex(name), { uid: CLOUD.uid(), name, cls: curCls, at: String(Date.now()) })) return { ok: true }; const o = await CLOUD.get('names/' + hex(name), true); return o && o.uid === CLOUD.uid() ? { ok: true } : { ok: false, msg: '이미 다른 사람이 쓰고 있는 아이디입니다.' }; } catch (e) { return { ok: false, msg: '서버에 등록하지 못했어요. 잠시 후 다시 눌러 주세요.' }; } }
    const d = await conn();
    if (!d) { const L = JSON.parse(store.get('aden_names') || '[]'); if (!L.includes(name.toLowerCase())) L.push(name.toLowerCase()); store.set('aden_names', JSON.stringify(L)); return { ok: true }; }
    try { const ref = d.doc('names/' + hex(name)), lease = await ref.acquire({ holder: uid, ttlMs: 5000 }); if (!lease.acquired) return { ok: false, msg: '다른 사람이 지금 이 아이디를 만드는 중이에요. 다른 아이디를 골라 주세요.' };
      const sn = await ref.get(), o = sn.exists ? (sn.data() || {}).owner : null; if (o && o !== uid && o !== me()) return { ok: false, msg: '이미 다른 사람이 쓰고 있는 아이디입니다.' };
      await ref.set({ name, owner: me(), cls: curCls, at: Date.now() }); return { ok: true }; }
    catch (e) { const L = JSON.parse(store.get('aden_names') || '[]'); if (!L.includes(name.toLowerCase())) L.push(name.toLowerCase()); store.set('aden_names', JSON.stringify(L)); return { ok: true }; } }   // 서버에 쓸 권한이 없으면 이 브라우저 기준으로 등록
  function show(cls, done, onBack) { const w = $('namescr'); if (!w) return; curCls = cls || 'knight'; cb = done || null; back = onBack || null; const c = w.querySelector('.nm-cls'); if (c) c.innerHTML = `<b>${CLASS_NAME[curCls]}</b><span>${CLS_DEF[curCls].desc}</span>`;
    const i = $('nm-in'); if (i) i.value = ''; okName = null; msg('', true); $('nm-go').disabled = true; w.hidden = false; setTimeout(() => i && i.focus(), 50); }
  async function doCheck() { const i = $('nm-in'), n = i.value.trim(); if (busy) return; busy = true; $('nm-go').disabled = true; msg('서버에서 확인하는 중…', true); const r = await check(n); busy = false; okName = r.ok ? n : null; msg(r.msg, r.ok); $('nm-go').disabled = !r.ok; }
  async function doCreate() { const n = $('nm-in').value.trim(); if (busy) return; if (n !== okName) { await doCheck(); if ($('nm-in').value.trim() !== okName) return; }
    busy = true; $('nm-go').disabled = true; msg('아이디를 등록하는 중…', true); const r = await claim(n); busy = false;
    if (!r.ok) { okName = null; msg(r.msg, false); return; }
    $('namescr').hidden = true; if (cb) cb(n); }
  { const i = $('nm-in');
    if (i) { i.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter' && !ev.isComposing) { ev.preventDefault(); doCreate(); } });
      i.addEventListener('input', () => { if (i.value.trim() !== okName) { okName = null; msg('', true); } $('nm-go').disabled = !RE.test(i.value.trim()); });
      $('nm-chk').onclick = doCheck; $('nm-go').onclick = doCreate; const nb = $('nm-back'); if (nb) nb.onclick = () => { $('namescr').hidden = true; if (back) back(); }; } }
  return { show, check };
})();
// ============================================================ 멀티플레이: 같은 페이지(아티팩트)를 연 사람끼리 실시간 (room presence)
// 내 상태(위치·동작·장비·채팅)를 presence로 10번/초 보내고, 같은 지역 사람을 그림. 몬스터는 그 지역의 '호스트'(peer 이름이 가장 앞선 사람)가
// 움직이고 위치·체력을 보냄 → 게스트는 그대로 따라 보여 주고, 게스트가 때린 피해는 호스트에게 보내 호스트가 적용 · 몬스터가 게스트를 때린 피해는 호스트가 보냄
const NET = (() => {
  const KINDS = Object.keys(MOB), RCOL = '#a8d8ff', PCOL = '#8fe08a', TE = new TextEncoder();
  const esc_ = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  let IKS = null; const ik = () => IKS || (IKS = Object.keys(ITEMS));
  let anSeq = 0, anText = '', anL = [], roomAt = 0, initL = [], initDone = true; const anSeen = new Map(), goneAt = new Map();   // 전체 공지(영웅 획득 등): 번호가 바뀌면 한 번만 띄움
  let room = null, myPeer = null, sendT = 0, chatSeq = 0, lastChat = '', atkSeq = 0, lastAtk = null, hitSeq = 0, dmgSeq = 0, rwSeq = 0, gvSeq = 0, pkSeq = 0, suSeq = 0, invSeq = 0;
  let hostCache = null, wasGuest = false, known = new Set(), ready = false, partyId = null, invOut = null, ansOut = null, spTotal = 0, mySpUsed = 0, hoverPeer = null, uiT = 0, hadMem = false, lastRw = {}, ptGrace = 0;
  const extra = {};   // 다른 모듈이 덧붙이는 presence 필드 (교환 td 등)
  const myHits = [], toRemote = {}, rwOut = {}, gvOut = {}, pkOut = [], suOut = [], efOut = []; let efSeq = 0; const seenEf = new Map();
  const mxOut = []; let mxSeq = 0; const seenMx = new Map();
  function mx(id, T) { const self = !T || T === hero; mxOut.push([++mxSeq, id, self ? 0 : 1, T ? +T.x.toFixed(2) : 0, T ? +T.z.toFixed(2) : 0, T && !self ? Math.round(mxH(T)) : 0]); if (mxOut.length > 6) mxOut.splice(0, mxOut.length - 6); sendT = 0; }
  function applyMx(o) { const L = o.pr.mx; if (!L || !L.length) return; const last = seenMx.get(o.peer) || 0, fresh = L.filter(x => x[0] > last); if (!fresh.length) return; seenMx.set(o.peer, Math.max(...fresh.map(x => x[0])));
    if (o.pr.z !== zk() || last === 0 && fresh.length > 2) return; const v = peers.get(o.peer); if (!v) return; const dist = Math.max(Math.abs(v.x - hero.x), Math.abs(v.z - hero.z)); if (dist > 22) return;
    for (const [, id, tg, tx, tz, th] of fresh.slice(-3)) { const id0 = id === 'turnund_x' ? 'turnund' : id; if (!SK[id0]) continue; mxCast(id0, v, dist > 10); if (!tg) mxSelf(id, v); else { const T = mxAt(tx, tz, th || 60); if (SPELL[id]) mxFire(id, v, T, true); else mxSelf(id, T); } if (dist <= 12) spellSfx(id); } }

  // 강화 연출: 내 강화 결과를 보내고, 같은 지역 18칸 안의 다른 사람 강화는 그 사람 머리 위에 이펙트·글자·소리로
  const EFX = { ok: ['enok', '#9fe0ff'], bless: ['enbless', '#ffd86a'], earth: ['earth', '#c8a060'], fail: ['puff', '#c0b8a0'], boom: ['boom', '#ff6a5a'], curse: ['puff', '#c890e8'] };
  function fx(kind, text, item) { if (!EFX[kind]) return; efOut.push([++efSeq, kind, String(text || '').slice(0, 24), String(item || '').slice(0, 30)]); if (efOut.length > 6) efOut.splice(0, efOut.length - 6); sendT = 0; }
  function applyFx(o) { const L = o.pr.ef; if (!L || !L.length) return; const last = seenEf.get(o.peer) || 0, fresh = L.filter(x => x[0] > last); if (!fresh.length) return; seenEf.set(o.peer, Math.max(...fresh.map(x => x[0])));
    if (o.pr.z !== zk()) return; const v = peers.get(o.peer); if (!v) return; const dist = Math.max(Math.abs(v.x - hero.x), Math.abs(v.z - hero.z)); if (dist > 18) return;
    for (const [, kind, text, item] of fresh.slice(-2)) { const E = EFX[kind]; if (!E) continue; spellFx(E[0], v); const [x, y] = W2P(v.x, v.z);
      floatText(x, y - 104, text, { color: E[1], size: 13, big: true, life: 1.5, rise: 30 }); if (item) floatText(x, y - 120, item, { color: '#e8dcc0', size: 10, life: 1.5, rise: 30 });
      if (kind === 'boom') { impact(x, y - 40, 'hit', '#ff6a5a'); } if (dist <= 12) enchSfx(kind);
      const en = +((/\+(\d+)/.exec(text) || [])[1] || 0); if (kind === 'boom' || ((kind === 'ok' || kind === 'bless') && en >= 7)) say(`[강화] ${nmOf(o.pr)}님의 ${item || '장비'} — ${text}`, E[1]); } }
  const seenHit = new Map(), seenDmg = new Map(), seenRw = new Map(), seenGv = new Map(), seenPk = new Map(), seenSu = new Map(), seenInv = new Map(), seenAns = new Map(), spUsed = new Map();
  const peers = new Map(), proxies = new Map();
  const zk = () => SCENE === 'town' ? 'town' : ISLE ? 'isle' + ISLE.id : 'field';
  const nmOf = pr => String((pr && pr.n) || '다른 플레이어').slice(0, 12);
  const trim = (L, n) => { if (L.length > n) L.splice(0, L.length - n); return L; };
  const maxSeq = (L, k = 0) => Math.max(0, ...(L || []).map(x => (Array.isArray(x) ? x[k] : 0) || 0));
  // 같은 브라우저 탭끼리 시험용 (주소에 ?mp=bc): 실제 room이 없을 때만
  function bcRoom() { if (!/[?&]mp=bc/.test(location.search) || typeof BroadcastChannel === 'undefined') return null; const ch = new BroadcastChannel('aden-mp'), id = 'p' + Math.random().toString(36).slice(2, 10); let mine = {}; const others = new Map();
    ch.onmessage = ev => { const m = ev.data || {}; if (m.t === 'p' && m.peer !== id) others.set(m.peer, { peer: m.peer, presence: m.presence, at: Date.now() }); else if (m.t === 'bye') others.delete(m.peer); };
    setInterval(() => { const now = Date.now(); for (const [k, o] of others) if (now - o.at > 4000) others.delete(k); ch.postMessage({ t: 'p', peer: id, presence: mine }); }, 1000);
    addEventListener('beforeunload', () => ch.postMessage({ t: 'bye', peer: id }));
    return { presence: async patch => { mine = { ...mine, ...patch }; for (const k in patch) if (patch[k] === null) delete mine[k]; ch.postMessage({ t: 'p', peer: id, presence: mine }); },
      peers: () => [{ peer: id, isMe: true, sameTab: true, presence: mine }, ...[...others.values()].map(o => ({ peer: o.peer, isMe: false, sameTab: false, presence: o.presence || {} }))], connected: () => true }; }
  let artRoom = false;
  (async () => { try { if (window.claude && claude.use) room = await claude.use('room'); } catch (e) { room = null; } artRoom = !!room; if (!room) room = bcRoom(); ready = !!room; })();
  let OTH = [];
  PEER_OCC = (i, j) => { for (const o of OTH) { const pr = o.pr; if (!pr || pr.z !== zk() || !(pr.hp > 0)) continue; if (Math.floor(pr.x) === i && Math.floor(pr.y) === j) return o; } return null; };   // 살아 있는 다른 플레이어 칸은 막힘
  function setRoom(r) { room = r; ready = !!r; roomAt = performance.now(); initL = []; initDone = !r; if (r && partyId) ptGrace = Date.now() + 20000; OTH = []; known.clear(); peers.clear(); proxies.clear(); for (const M of [seenHit, seenDmg, seenRw, seenGv, seenPk, seenSu, seenInv, seenAns, spUsed]) M.clear(); hostCache = null; for (const f of foxes) f.nx = null; if (wasGuest) { GROUND.adoptShared(); wasGuest = false; } GROUND.setShared(null); renderParty(); }
  const others = () => { const out = []; if (!room) return out; let L; try { L = room.peers(); } catch (e) { return out; } for (const p of L) { if (p.isMe && p.sameTab) { myPeer = p.peer; continue; } if (p.kind === 'agent') continue; const pr = p.presence || {}; if (!pr.n) continue; out.push({ peer: p.peer, pr }); } return out; };
  const prOf = p => p === myPeer ? null : (OTH.find(o => o.peer === p) || {}).pr;
  // 지역 호스트: 같은 지역에 있는 사람(나 포함) 중 peer 이름이 가장 앞선 사람
  const hostOf = z => { let h = myPeer && zk() === z ? myPeer : null; for (const o of OTH) if (o.pr.z === z && (!h || o.peer < h)) h = o.peer; return h; };
  const isHost = () => !room || !myPeer || hostOf(zk()) === myPeer;
  const othersInZone = () => OTH.filter(o => o.pr.z === zk());
  function hostData() { if (!ISLE || isHost()) return null; const h = hostOf(zk()), o = OTH.find(q => q.peer === h); return o && o.pr.m && o.pr.mz === zk() ? o : null; }
  const guest = () => !!hostCache;
  function guestMob(f) { return !!hostCache && f && f.uid != null && foxes.includes(f); }
  // ----- 파티: 같은 파티 번호(pt)를 가진 사람끼리 · 초대(pi) → 수락(pa)
  const ptOf = p => p === myPeer ? partyId : ((prOf(p) || {}).pt || null);
  const members = () => partyId ? OTH.filter(o => o.pr.pt === partyId) : [];
  function invite(peer) { const o = OTH.find(q => q.peer === peer); if (!o) return; if (partyId && o.pr.pt === partyId) { say(`${nmOf(o.pr)}님은 이미 같은 파티예요.`, '#9c9682'); return; } if (members().length >= 7) { say('파티는 8명까지예요.', '#f08a7a'); return; }
    if (!partyId) partyId = 'P' + Math.random().toString(36).slice(2, 8); invOut = { to: peer, id: partyId, s: ++invSeq, at: Date.now() }; sendT = 0; say(`${nmOf(o.pr)}님에게 파티 초대를 보냈습니다.`, PCOL); renderParty(); }
  function leaveParty() { if (!partyId) return; partyId = null; invOut = null; hadMem = false; sendT = 0; say('파티에서 나왔습니다.', '#9c9682'); renderParty(); }
  function partyTick() { for (const o of OTH) { const pi = o.pr.pi;
      if (pi && pi.to === myPeer) { if (seenInv.get(o.peer) === pi.s) continue; seenInv.set(o.peer, pi.s); if (pi.id === partyId) continue;
        const from = o.peer, id = pi.id, s = pi.s, nm = nmOf(o.pr); if (AC && SFX_ON) tone(AC.currentTime, 'triangle', 880, 1320, 0.25, 0.06);
        INV.askYesNo(`${nm}님이 파티에 초대했습니다.`, '수락하시겠습니까?' + (partyId ? ' (지금 파티에서는 나가게 돼요)' : ''), () => { partyId = id; hadMem = true; ansOut = { to: from, id, s, ok: 1 }; sendT = 0; say(`${nm}님의 파티에 들어갔습니다.`, PCOL); renderParty(); }, () => { ansOut = { to: from, id, s, ok: 0 }; sendT = 0; }); }
      const pa = o.pr.pa; if (pa && pa.to === myPeer) { const key = pa.id + ':' + pa.s; if (seenAns.get(o.peer) === key) continue; seenAns.set(o.peer, key);
        if (invOut && pa.s === invOut.s) { say(pa.ok ? `${nmOf(o.pr)}님이 파티에 들어왔습니다.` : `${nmOf(o.pr)}님이 파티 초대를 거절했습니다.`, pa.ok ? PCOL : '#9c9682'); invOut = null; } } }
    if (invOut && Date.now() - invOut.at > 30000) { invOut = null; if (partyId && !members().length) say('파티 초대에 응답이 없습니다.', '#9c9682'); }
    if (partyId && !invOut && Date.now() > ptGrace) { const n = members().length; if (n) hadMem = true; else { if (hadMem) say('파티원이 모두 나가서 파티가 해산되었습니다.', '#9c9682'); partyId = null; hadMem = false; renderParty(); } } }
  // ----- 지원(힐·버프)을 파티원에게: 받는 쪽이 적용 · 준 양만큼 공헌도(지원 점수)에 쌓임
  function support(peer, k, v, pts) { suOut.push([++suSeq, peer, k, v]); trim(suOut, 10); spTotal += Math.max(0, pts); sendT = 0; }
  function partyNear(r) { const out = []; for (const o of members()) { if (o.pr.z !== zk() || !(o.pr.hp > 0)) continue; if (Math.max(Math.abs(o.pr.x - hero.x), Math.abs(o.pr.y - hero.z)) <= r) out.push(o); } return out; }
  function healPeer(o, amt) { const miss = Math.max(0, (o.pr.hm || 0) - (o.pr.hp || 0)), h = Math.min(amt, miss); support(o.peer, 'h', amt, h); const v = peers.get(o.peer); if (v) { const [x, y] = W2P(v.x, v.z); floatText(x, y - 100, '+' + amt, { color: '#8af08a', size: 13 }); spellFx('heal', v); } return h; }
  function buffPeer(o, key, dur) { support(o.peer, key, dur, 8); const v = peers.get(o.peer); if (v) { spellFx('aura', v, (BUFF_DEF[key] || {}).c || '#cfe4ff'); if (key === 'immune') mxSelf('immune', v); } }
  function buffParty(key, dur) { let n = 0; for (const o of partyNear(6)) { support(o.peer, key, dur, 8); n++; const v = peers.get(o.peer); if (v) spellFx('aura', v, (BUFF_DEF[key] || {}).c || '#cfe4ff'); } if (n) say(`파티원 ${n}명에게도 ${(BUFF_DEF[key] || {}).name || '버프'} 효과를 주었습니다.`, '#cfe4ff'); }
  function applySupport(o) { const L = o.pr.su; if (!L || !L.length) return; const last = seenSu.get(o.peer) || 0; let mx = last;
    for (const [sq, to, k, v] of L) { if (sq <= last) continue; mx = Math.max(mx, sq); if (to !== myPeer || hero.hp <= 0) continue; const [hx, hy] = W2P(hero.x, hero.z);
      if (k === 'h') { const h = Math.max(0, Math.min(Math.ceil(hero.max - hero.hp), v)); hero.hp = Math.min(hero.max, hero.hp + h); floatText(hx, hy - 100, '+' + h, { color: '#8af08a', size: 13 }); spellFx('heal', hero); say(`${nmOf(o.pr)}님의 힐 (+${h})`, '#cfe4ff'); }
      else if (BUFF_DEF[k]) { BUFF[k] = Math.max(BUFF[k] || 0, +v || 0); floatText(hx, hy - 100, BUFF_DEF[k].name, { color: BUFF_DEF[k].c, size: 12 }); spellFx('aura', hero, BUFF_DEF[k].c); say(`${nmOf(o.pr)}님의 ${BUFF_DEF[k].name}`, '#cfe4ff'); } }
    seenSu.set(o.peer, mx); }
  // ----- 처치 분배 (호스트, 같은 지역에 다른 플레이어가 있을 때): 공헌도 = 피해 + (같은 파티 15칸 안의) 지원 점수 → 경험치·골드 비율 분배, 파티는 +10%
  const posOf = p => { if (p === myPeer) return { x: hero.x, z: hero.z }; const pr = prOf(p); return pr && pr.z === zk() ? { x: pr.x, z: pr.y } : null; };
  const supBank = p => p === myPeer ? spTotal - mySpUsed : Math.max(0, ((prOf(p) || {}).sp || 0) - (spUsed.get(p) || 0));
  const useSup = p => { if (p === myPeer) mySpUsed = spTotal; else spUsed.set(p, (prOf(p) || {}).sp || 0); };
  const partyBonus = p => { const pt = ptOf(p); if (!pt) return false; const pool = [myPeer, ...othersInZone().map(o => o.peer)]; return pool.some(q => q !== p && ptOf(q) === pt); };
  function distribute(f, S) { if (!room || !myPeer || !othersInZone().length) return null;
    const C = new Map(), add = (p, v) => C.set(p, (C.get(p) || 0) + v), pets = [];
    if (f.dmgBy) for (const [w, v] of f.dmgBy) { if (!w || v <= 0) continue; if (w.isRemote) add(w.peer, v); else { add(myPeer, v); if (w.isPet) pets.push([w, v]); } }
    if (!C.size) add(myPeer, 1);
    const pts = new Set([...C.keys()].map(ptOf).filter(Boolean));
    for (const p of [myPeer, ...othersInZone().map(o => o.peer)]) { const pt = ptOf(p), pos = posOf(p); if (!pt || !pts.has(pt) || !pos || Math.max(Math.abs(pos.x - f.x), Math.abs(pos.z - f.z)) > 15) continue; const b = supBank(p); if (b > 0) { add(p, b); useSup(p); } }
    lastRw = {}; const tot = [...C.values()].reduce((a, b) => a + b, 0) || 1, shares = new Map([...C].map(([p, v]) => [p, v / tot])), gold = rint(S.coin), petSum = pets.reduce((a, x) => a + x[1], 0);
    for (const [p, s] of shares) { const bn = partyBonus(p) ? 1.1 : 1, gd = Math.round(gold * s * bn);
      if (p === myPeer) { for (const [w, v] of pets) { const pe = Math.round(S.exp * v / tot); if (pe > 0) PET.gainExp(w, pe); } const ex = Math.max(0, Math.round(S.exp * Math.max(0, s - petSum / tot) * bn)); if (ex > 0) gainExp(ex); coins += gd;
        say(`보상 (공헌도 ${Math.round(s * 100)}%${bn > 1 ? ' · 파티 +10%' : ''}) — 경험치 +${ex} · 골드 +${gd}`, '#d8e8a8'); }
      else { const L = rwOut[p] || (rwOut[p] = []), E = [++rwSeq, Math.round(S.exp * s * bn), gd, KINDS.indexOf(f.kind), Math.round(s * 100), bn > 1 ? 1 : 0, 0, 0]; L.push(E); lastRw[p] = E; trim(L, 8); } }
    f.dmgBy = null; sendT = 0; return { shares }; }
  // 드랍 우선권: 공헌도 비율대로 아이템 개수 배정 (정수 부분은 확정, 남는 건 비율 확률) · 5초 동안만
  function assignLoot(items, shares) { if (!items || !items.length || !shares) return; const n = items.length, owners = [], rems = [];
    for (const [p, s] of shares) { const q = s * n, b = Math.floor(q); for (let k = 0; k < b; k++) owners.push(p); rems.push([p, q - b]); }
    while (owners.length < n) { const tot = rems.reduce((a, r) => a + r[1], 0); if (tot <= 0) { owners.push([...shares.keys()][0]); continue; } let x = Math.random() * tot; const k = rems.findIndex(r => (x -= r[1]) < 0); const r = rems[k < 0 ? 0 : k]; owners.push(r[0]); r[1] = 0; }
    owners.sort(() => Math.random() - 0.5); const until = performance.now() + 5000; let mine = 0; items.forEach((d, k) => { d.owner = owners[k]; d.until = until; if (d.owner === myPeer) mine++; else if (lastRw[d.owner]) lastRw[d.owner][6]++; }); for (const p in lastRw) lastRw[p][7] = n;
    if (shares.size > 1 || !shares.has(myPeer)) say(`드랍 ${n}개 중 ${mine}개가 5초 동안 내 우선권이에요.`, '#f2e6a8'); sendT = 0; }
  // ----- 보낼 내 상태
  function eqIds() { const e = {}; for (const L in KL_SLOT) { const id = INV.equipped(KL_SLOT[L]); if (id) e[KL_SLOT[L]] = id; } return e; }
  function mobsOut() { const pos = [[hero.x, hero.z], ...othersInZone().map(o => [o.pr.x, o.pr.y])], L = []; for (const f of foxes) { if (f.gone || f.uid == null || f.summoned && f.dead) continue; if (!pos.some(([x, z]) => Math.max(Math.abs(f.x - x), Math.abs(f.z - z)) <= 24)) continue;
      L.push([f.uid, KINDS.indexOf(f.kind), Math.round(f.x * 10), Math.round(f.z * 10), f.row, Math.max(0, Math.round(f.hp / f.max * 100)), (f.dead ? 1 : 0) | (f.atkT != null ? 2 : 0) | (f.t < 1 ? 4 : 0)]); }
    const dn = r => Math.min(...pos.map(([x, z]) => Math.max(Math.abs(r[2] / 10 - x), Math.abs(r[3] / 10 - z)))); return L.sort((a, b) => dn(a) - dn(b)); }
  function groundOut() { const pos = [[hero.x, hero.z], ...othersInZone().map(o => [o.pr.x, o.pr.y])], ow = [], L = [], now = performance.now();
    for (const d of GROUND.here()) { if (!pos.some(([x, z]) => Math.max(Math.abs(d.x - x), Math.abs(d.z - z)) <= 18)) continue; const left = d.owner && d.until > now ? Math.ceil((d.until - now) / 100) : 0; let oi = -1; if (left) { oi = ow.indexOf(d.owner); if (oi < 0) { ow.push(d.owner); oi = ow.length - 1; } }
      L.push([d.gid, ik().indexOf(d.id), d.n, d.i, d.j, oi, left, d.blessed ? 1 : 0]); if (L.length >= 40) break; } return { gi: L, go: ow }; }
  function payload() { const P = { n: PNAME(), c: CLASS, lv: hero.lv, z: zk(), x: +hero.x.toFixed(2), y: +hero.z.toFixed(2), r: hero.row, a: hero.atk ? (hero.atk.v || 'attack') : 'idle', as: atkSeq, hp: Math.max(0, Math.ceil(hero.hp)), hm: hero.max, mp: Math.max(0, Math.floor(hero.mp)), mm: hero.maxmp,
      e: eqIds(), eg: glowOut(), iv: BUFF.invis > 0 ? 1 : 0, ch: chatSeq ? { i: chatSeq, t: lastChat } : null, an: anSeq ? { i: anSeq, t: anText, L: anL } : null, h: myHits.slice(-10), pt: partyId, pi: invOut ? { to: invOut.to, id: invOut.id, s: invOut.s } : null, pa: ansOut, sp: Math.round(spTotal), hs: +(heroSpd() * (1 + INV.cx('atkSpd') / 100)).toFixed(2), su: suOut.slice(-10), pk: pkOut.slice(-6), ef: efOut.length ? efOut.slice(-6) : null, mx: mxOut.length ? mxOut.slice(-6) : null, bf: myBuffs(), bk: ISLAND.bossKills(), tg: hero.target && !hero.target.dead && hero.target.uid != null && foxes.includes(hero.target) ? hero.target.uid : null };
    Object.assign(P, extra); const rw = {}, gv = {}; for (const k in rwOut) if (OTH.some(o => o.peer === k) && rwOut[k].length) rw[k] = rwOut[k].slice(-8); for (const k in gvOut) if (OTH.some(o => o.peer === k) && gvOut[k].length) gv[k] = gvOut[k].slice(-8); P.rw = Object.keys(rw).length ? rw : null; P.gv = Object.keys(gv).length ? gv : null;
    if (ISLE && isHost() && othersInZone().length) { P.m = mobsOut(); P.mz = zk(); const d = {}; for (const k in toRemote) if (OTH.some(o => o.peer === k)) d[k] = toRemote[k].slice(-10); P.d = d; const G = groundOut(); P.gi = G.gi; P.go = G.go; } else { P.m = null; P.mz = null; P.d = null; P.gi = null; P.go = null; }
    const sz = () => TE.encode(JSON.stringify(P)).length; while (sz() > 3900 && ((P.gi && P.gi.length) || (P.m && P.m.length))) { if (P.gi && P.gi.length > 10) P.gi.splice(-5); else if (P.m && P.m.length) P.m.splice(-5); else P.gi.splice(-1); } return P; }
  // ----- 게스트: 호스트 몬스터·바닥 아이템 반영
  function applyHost(o) { const list = o.pr.m; const seen = new Set();
    for (const [uid, k, x10, z10, row, pct, fl] of list) { seen.add(uid); let f = foxes.find(q => q.uid === uid);
      if (!f) { const kind = KINDS[k]; if (!MOB[kind]) continue; f = mkMob(kind, Math.floor(x10 / 10), Math.floor(z10 / 10)); f.uid = uid; f.home = [f.i, f.j]; f.x = x10 / 10; f.z = z10 / 10; f.netNew = true; foxes.push(f); }
      f.nx = x10 / 10; f.nz = z10 / 10; f.row = row; f.netMove = !!(fl & 4); const dead = !!(fl & 1);
      if (dead && !f.dead) netDeath(f); else if (!dead && f.dead) { f.dead = false; f.deadT = 0; f.hp = f.max; f.flash = 0; f.x = f.nx; f.z = f.nz; f.atkT = null; }
      if (!dead) { const hh = Math.max(1, Math.round(f.max * pct / 100)); f.hp = f.predUntil > time ? Math.min(f.hp, hh) : hh; }
      if ((fl & 2) && !f.wasAtk && !dead) { f.atkT = 0; MSFX(f.kind, 'attack', 0.35); } f.wasAtk = !!(fl & 2); }
    for (const f of foxes) if (f.uid != null && !seen.has(f.uid) && !f.dead && Math.max(Math.abs(f.x - hero.x), Math.abs(f.z - hero.z)) <= 20) f.gone = true;
    GROUND.setShared((o.pr.gi || []).map(([gid, ii, n, i, j, oi, left, bl]) => ({ gid, id: ik()[ii], n, i, j, owner: oi >= 0 ? (o.pr.go || [])[oi] : null, left, bl })).filter(x => ITEMS[x.id]), zk());
    const d = o.pr.d && myPeer && o.pr.d[myPeer]; if (d) { const last = seenDmg.get(o.peer) || 0; let mx = last;
      for (const [sq, dmg0, uid, rr, raw, mg] of d) { if (sq <= last) continue; mx = Math.max(mx, sq); if (hero.hp <= 0) continue; const src = foxes.find(q => q.uid === uid) || null, SS = src && MOB[src.kind]; const dmg = raw != null && SS ? (rr < (mg ? mobHitM(SS) : mobHit(SS)) ? raw : 0) : dmg0;   // 새 호스트: 내 AC·레벨로 명중 판정
        if (dmg > 0) { if (!(BUFF.invis > 0)) { hurtHero(dmg, src, mg ? 'magic' : 'melee'); const [ix, iy] = W2P(hero.x, hero.z); impact(ix, iy - 30, 'hit', '#ffd890'); } } else { heroMiss(); if (src) src.hitMeT = time; } }
      seenDmg.set(o.peer, mx); } }
  function follow(f, dt) { if (f.dead) { f.deadT += dt; return; } if (f.nx == null) return; const dx = f.nx - f.x, dz = f.nz - f.z, d = Math.hypot(dx, dz);
    if (d > 3) { f.x = f.nx; f.z = f.nz; } else if (d > 0.01) { const st = Math.min(d, dt * 4.2); f.x += dx / d * st; f.z += dz / d * st; f.dist = (f.dist || 0) + st; }
    f.i = f.fi = Math.floor(f.x); f.j = f.fj = Math.floor(f.z); f.t = d > 0.06 || f.netMove ? 0.5 : 1; f.flash = Math.max(0, f.flash - dt); if (f.atkT != null) { f.atkT += dt; if (f.atkT >= ATK_T) f.atkT = null; } }
  // 게스트 화면의 몬스터 죽음: 효과만 (보상은 호스트가 공헌도대로 보내 줌)
  function netDeath(f) { f.dead = true; f.deadT = 0; f.hp = 0; f.stunT = 0; f.atkT = null; f.myDmg = 0; if (!MSFX(f.kind, 'death', 0.6)) sfx.die(); if (hero.target === f) hero.target = null; }
  function hit(f, d) { myHits.push([++hitSeq, f.uid, d]); trim(myHits, 30); f.myDmg = (f.myDmg || 0) + d; f.predUntil = time + 1.2; sendT = 0; }
  // 보상·아이템 받기 (누가 보냈든 내 몫만, 번호로 한 번씩)
  function applyRewards(o) { const rw = o.pr.rw && myPeer && o.pr.rw[myPeer]; if (rw) { if (!seenRw.has(o.peer)) seenRw.set(o.peer, 0); const last = seenRw.get(o.peer); let mx = last;
      for (const [sq, ex, gd, k, pct, bn, li, ln] of rw) { if (sq <= last) continue; mx = Math.max(mx, sq); if (ex > 0) gainExp(ex); if (gd > 0) coins += gd; const S = MOB[KINDS[k]]; say(`${S ? S.name : '몬스터'} 처치 보상 (공헌도 ${pct}%${bn ? ' · 파티 +10%' : ''}) — 경험치 +${ex} · 골드 +${gd}`, '#d8e8a8'); if (ln) say(`드랍 ${ln}개 중 ${li || 0}개가 5초 동안 내 우선권이에요.`, '#f2e6a8'); }
      seenRw.set(o.peer, mx); }
    const gv = o.pr.gv && myPeer && o.pr.gv[myPeer]; if (gv) { if (!seenGv.has(o.peer)) seenGv.set(o.peer, 0); const last = seenGv.get(o.peer); let mx = last;
      for (const [sq, ii, n, gid, x4] of gv) { if (sq <= last) continue; mx = Math.max(mx, sq);
        if (ii >= 0) { const id = ik()[ii], it = ITEMS[id]; if (!it) continue; INV.add(id, n, true); GROUND.gotShared(gid); if (it.rar && it.rar !== '일반') TELE.ev('pick', { id, n, r: it.rar, z: zoneTitle() }); if (it.rar === '영웅') { const m = `${PNAME()}님이 ${zoneTitle()}에서 영웅 아이템 ${JOSA(it.name, '을', '를')} 획득했습니다!`; announce(m, RARITY_C['영웅'] || '#c77dff'); NET.announceAll(m); } say(`${rarTag(id)}${n > 1 ? it.name + ' ' + n + '개를' : JOSA(it.name, '을', '를')} 주웠습니다.`, rarC(id)); if (AC) tone(AC.currentTime, 'triangle', 700, 1180, 0.16, 0.09); }
        else { GROUND.unpend(gid); if (ii === -1) say(`우선권이 ${String(x4 || '다른 사람').slice(0, 12)}님에게 있어요. (${Math.ceil(n / 10)}초 뒤 누구나 주울 수 있어요)`, '#f0c080'); } }
      seenGv.set(o.peer, mx); } }
  function requestPick(d) { pkOut.push([++pkSeq, d.gid]); trim(pkOut, 6); sendT = 0; }
  // ----- 호스트: 원격 플레이어 대리 개체 · 피해 적용 · 줍기 요청 처리
  function proxy(peer) { let p = proxies.get(peer); if (!p) { p = { isRemote: true, peer, i: 0, j: 0, x: 0, z: 0, dead: false, hp: 1, max: 1 }; proxies.set(peer, p); } return p; }
  const alive = p => !!p && !p.dead && proxies.get(p.peer) === p && OTH.some(o => o.peer === p.peer && o.pr.z === zk());
  function nearRemote(f, r) { let b = null, bd = 1e9; for (const p of proxies.values()) { if (!alive(p)) continue; const d = cheb(f.i, f.j, p.i, p.j); if (d <= r && d < bd) { bd = d; b = p; } } return b; }
  function hitRemote(p, f, S, dmgIn, hitIn, magic) { if (!p || !alive(p) || !f) return; const r = Math.random(), raw = dmgIn || mobDmg(S), ok = r < (hitIn != null ? hitIn : magic ? mobHitM(S) : mobHit(S)), dmg = ok ? raw : 0; const L = toRemote[p.peer] || (toRemote[p.peer] = []); L.push([++dmgSeq, dmg, f.uid, Math.round(r * 1000) / 1000, raw, magic ? 1 : 0]); trim(L, 20); sendT = 0;
    const [ix, iy] = W2P(p.x, p.z); if (dmg > 0) { impact(ix, iy - 30, 'hit', '#ffd890'); floatText(ix, iy - 96, String(dmg), { color: '#ff7a6a', size: 11 }); } else impact(ix, iy + 2, 'miss'); }
  function applyHits(o) { const L = o.pr.h; if (!L || !L.length || !ISLE || o.pr.z !== zk()) return; const last = seenHit.get(o.peer) || 0; let mx = last;
    for (const [sq, uid, dmg] of L) { if (sq <= last) continue; mx = Math.max(mx, sq); const f = foxes.find(q => q.uid === uid); if (!f || f.dead) continue; const p = proxy(o.peer);
      addDmg(f, p, Math.min(dmg, Math.max(0, f.hp))); f.hp -= dmg; f.flash = 0.09; mobHitFx(f, false); f.aggro = true; if (!f.tgt || (f.tgt === hero && Math.random() < 0.4)) f.tgt = p; if (f.grp) f.grp.forEach(m => { if (!m.dead) m.aggro = true; });
      const [fx, fy] = W2P(f.x, f.z); floatText(fx, fy - headY(f) - 4, String(dmg), { color: RCOL, size: 12 }); if (f.hp > 0) MSFX(f.kind, 'hit', 0.4); killCheck(f); }
    seenHit.set(o.peer, mx); }
  function applyPicks(o) { const L = o.pr.pk; if (!L || !L.length || o.pr.z !== zk()) return; const last = seenPk.get(o.peer) || 0; let mx = last;
    for (const [sq, gid] of L) { if (sq <= last) continue; mx = Math.max(mx, sq); const r = GROUND.takeFor(gid, o.peer), G = gvOut[o.peer] || (gvOut[o.peer] = []);
      if (r.ok) G.push([++gvSeq, ik().indexOf(r.id), r.n, gid, 0]); else if (r.err === 'prio') G.push([++gvSeq, -1, r.left, gid, r.owner === myPeer ? PNAME() : nmOf(prOf(r.owner))]); else G.push([++gvSeq, -2, 0, gid, '']); trim(G, 8); }
    seenPk.set(o.peer, mx); sendT = 0; }
  // ----- 다른 플레이어 표시용 상태
  function view(o) { let v = peers.get(o.peer); const pr = o.pr; if (!v) { v = { pl: true, x: pr.x, z: pr.y, dist: 0, as: pr.as, atkT: null, chI: pr.ch ? pr.ch.i : 0, chat: null, zone: pr.z }; peers.set(o.peer, v); }
    v.pr = pr; if (pr.as !== v.as) { v.as = pr.as; v.atkT = 0; v.atkV = pr.a; }
    if (pr.ch && pr.ch.i !== v.chI) { v.chI = pr.ch.i; let ct = String(pr.ch.t || '').slice(0, 80); const all = ct[0] === '!' && ct.length > 1; if (all) ct = ct.slice(1).trim(); v.chat = { t: ct, until: time + 5 }; const pm = !!(pr.pt && pr.pt === partyId), same = pr.z === zk();
      if (all) say(`[전체] ${nmOf(pr)}: ${ct}`, '#ffd28a', 1); else if (pm) say(`[파티]${same ? '' : '(' + zoneTitle(pr.z) + ')'} ${nmOf(pr)}: ${ct}`, PCOL, 1); else if (same) say(`${nmOf(pr)}: ${ct}`, RCOL, 1); }
    return v; }
  function tick(dt) { if (!room) return;
    OTH = others(); const ids = new Set(OTH.map(o => o.peer));
    for (const o of OTH) if (!known.has(o.peer)) { known.add(o.peer); seenHit.set(o.peer, maxSeq(o.pr.h)); spUsed.set(o.peer, o.pr.sp || 0); seenSu.set(o.peer, maxSeq(o.pr.su)); seenPk.set(o.peer, maxSeq(o.pr.pk)); seenEf.set(o.peer, maxSeq(o.pr.ef)); seenInv.set(o.peer, o.pr.pi ? o.pr.pi.s : 0); seenAns.set(o.peer, o.pr.pa ? o.pr.pa.id + ':' + o.pr.pa.s : ''); if (ready) { const nm = nmOf(o.pr), back = (goneAt.get(nm) || 0) > Date.now() - 60000; if (!initDone && performance.now() - roomAt < 4000) initL.push(nm); else if (back) say(`[접속] ${nm}님이 다시 연결되었습니다.`, '#9c9682'); else announce(`${nm}님이 접속했습니다. (${CLASS_NAME[o.pr.c] || ''} Lv.${o.pr.lv || 1})`, PCOL); } }
    for (const k of [...known]) if (!ids.has(k)) { known.delete(k); const v = peers.get(k); if (v && v.pr) goneAt.set(nmOf(v.pr), Date.now()); say(`[접속 종료] ${v && v.pr ? nmOf(v.pr) : '다른 플레이어'}님이 나갔습니다.`, '#9c9682'); peers.delete(k); proxies.delete(k); seenHit.delete(k); delete toRemote[k]; delete rwOut[k]; delete gvOut[k]; }
    for (const o of OTH) { const v = view(o); if (o.pr.z === zk()) { const p = proxy(o.peer); p.x = o.pr.x; p.z = o.pr.y; p.i = Math.floor(p.x); p.j = Math.floor(p.z); p.hp = o.pr.hp; p.max = o.pr.hm || 1; p.dead = !(o.pr.hp > 0); }
      const dx = o.pr.x - v.x, dz = o.pr.y - v.z, d = Math.hypot(dx, dz); if (d > 4 || o.pr.z !== v.zone) { v.x = o.pr.x; v.z = o.pr.y; v.zone = o.pr.z; } else if (d > 0.005) { const st = Math.min(d, dt * Math.max(4, d * 6)); v.x += dx / d * st; v.z += dz / d * st; v.dist += st; } v.moving = d > 0.04;
      if (v.atkT != null) { v.atkT += dt * Math.min(3, Math.max(0.5, +o.pr.hs || 1)); if (v.atkT > 0.75 / GSPD) v.atkT = null; }
      applySupport(o); applyRewards(o); applyFx(o); applyMx(o); if (o.pr.bk) ISLAND.mergeKills(o.pr.bk); { const an = o.pr.an, ai = (an && an.i) || 0, was = anSeen.get(o.peer); anSeen.set(o.peer, ai); if (was !== undefined && ai && was !== ai) { const L = an && Array.isArray(an.L) && an.L.length ? an.L.filter(x => Array.isArray(x) && +x[0] > was) : [[ai, an.t]]; for (const x of L.slice(-5)) announce(String(x[1] || '').slice(0, 90), RARITY_C['영웅']); } } }
    if (!initDone && performance.now() - roomAt >= 4000) { initDone = true; say(initL.length ? `[월드] 지금 ${initL.length + 1}명이 접속 중이에요: ${initL.join(', ')}` : '[월드] 지금은 혼자 접속 중이에요.', PCOL); }
    partyTick(); PARTY.length = 0; for (const o of members()) { if (o.pr.z !== zk()) continue; const v = peers.get(o.peer); if (v) PARTY.push({ x: v.x, z: v.z, name: nmOf(o.pr) }); }   // 미니맵 초록 점
    if (isHost()) { if (hostCache || wasGuest) { hostCache = null; wasGuest = false; for (const f of foxes) { f.nx = null; f.netNew = false; } GROUND.adoptShared(); } for (const o of OTH) { applyHits(o); applyPicks(o); } }
    else { const h = hostData(); hostCache = h; if (h) { wasGuest = true; applyHost(h); } else if (wasGuest) { wasGuest = false; GROUND.adoptShared(); } }
    if (hero.atk && hero.atk !== lastAtk) atkSeq++; lastAtk = hero.atk;
    uiT -= dt; if (uiT <= 0) { uiT = 0.25; renderParty(); }
    sendT -= dt; if (sendT <= 0) { sendT = 0.1; try { room.presence(payload()).catch(() => {}); } catch (e) {} } }
  // ----- 파티 창 (화면 왼쪽): 파티원 HP·MP
  const myBuffs = () => { const o = {}; let n = 0; for (const k in BUFF) if (BUFF[k] > 0 && BUFF_DEF[k]) { o[k] = Math.ceil(BUFF[k]); n++; } return n ? o : null; };
  const icoC = {}, ico = k => icoC[k] || (icoC[k] = ICON(k));
  const tleft = s => s >= 60 ? Math.ceil(s / 60) + '분' : Math.ceil(s) + '초';
  const DEBUFF = new Set(['root', 'slow']);
  const bfRow = bf => { const ks = Object.keys(bf || {}).filter(k => BUFF_DEF[k] && bf[k] > 0); if (!ks.length) return '';
    return '<div class="pb-bf">' + ks.map(k => `<span class="pb-b${DEBUFF.has(k) ? ' bad' : ''}${bf[k] <= 10 ? ' cd' : ''}" title="${esc_(BUFF_DEF[k].name)} · ${tleft(bf[k])} 남음">${ico(BUFF_DEF[k].icon)}${bf[k] <= 10 ? `<i>${Math.ceil(bf[k])}</i>` : `<em>${tleft(bf[k])}</em>`}</span>`).join('') + '</div>'; };
  function renderParty() { const box = document.getElementById('partybox'); if (!box) return; if (!partyId || !room) { if (!box.hidden) box.hidden = true; return; } box.hidden = false;
    const ZN = z => z === 'town' ? '마을' : /^isle\d+$/.test(z || '') ? ((ISLAND.def(+z.slice(4)) || {}).name || '사냥터') : '필드';
    const row = (nm, cls, lv, hp, hm, mp, mm, z, me, bf) => `<div class="pb-m${me ? ' me' : ''}${hp > 0 ? '' : ' dead'}"><div class="pb-t"><b>${esc_(nm)}</b><span>${CLASS_NAME[cls] || ''} Lv.${lv || 1}</span></div><div class="pb-bar hp"><i style="width:${Math.max(0, Math.min(100, hp / Math.max(1, hm) * 100))}%"></i><em>${Math.ceil(hp)}/${hm}</em></div><div class="pb-bar mp"><i style="width:${Math.max(0, Math.min(100, mp / Math.max(1, mm) * 100))}%"></i><em>${Math.floor(mp)}/${mm}</em></div>${bfRow(bf)}${z !== zk() ? `<small>${esc_(ZN(z))}</small>` : ''}</div>`;
    const M = members(); const h = `<div class="pb-h">파티 <small>${M.length + 1}명${M.length ? '' : ' · 초대를 기다리는 중'}</small><button type="button" id="pb-leave">나가기</button></div>` + row(PNAME(), CLASS, hero.lv, hero.hp, hero.max, hero.mp, hero.maxmp, zk(), true, myBuffs()) + M.map(o => row(nmOf(o.pr), o.pr.c, o.pr.lv, o.pr.hp || 0, o.pr.hm || 1, o.pr.mp || 0, o.pr.mm || 1, o.pr.z, false, o.pr.bf)).join('');
    if (box.dataset.h !== h) { box.dataset.h = h; box.innerHTML = h; const b = document.getElementById('pb-leave'); if (b) b.onclick = () => INV.askYesNo('파티에서 나가시겠습니까?', '', leaveParty); } }
  // ----- 다른 플레이어 클릭 → 메뉴 (파티 초대)
  function peerAt(sx, sy) { if (!room) return null; const [px, py] = toWorldPx(sx, sy); let b = null, bd = 1e9; for (const o of othersInZone()) { const v = peers.get(o.peer); if (!v) continue; const [x, y] = W2P(v.x, v.z), dx = px - x, dy = py - (y - 40); if (Math.abs(dx) < 20 && Math.abs(dy) < 52) { const q = dx * dx + dy * dy; if (q < bd) { bd = q; b = o; } } } return b; }
  function openMenu(o, cx, cy) { const m = document.getElementById('pmenu'); if (!m) return; const same = partyId && o.pr.pt === partyId;
    m.innerHTML = `<b>${esc_(nmOf(o.pr))}</b><small>${CLASS_NAME[o.pr.c] || ''} Lv.${o.pr.lv || 1}</small>` + (same ? '<span class="pm-in">같은 파티원</span>' : '<button type="button" data-a="inv">파티 초대</button>') + (SCENE === 'town' && o.pr.z === 'town' ? '<button type="button" data-a="trade">교환 신청</button>' : '<span class="pm-in" style="color:#9c9682">교환은 마을에서만</span>') + '<button type="button" data-a="x">닫기</button>';
    m.hidden = false; const w = m.offsetWidth, h = m.offsetHeight; m.style.left = Math.max(8, Math.min(innerWidth - w - 8, cx + 10)) + 'px'; m.style.top = Math.max(8, Math.min(innerHeight - h - 8, cy - 10)) + 'px';
    m.onclick = ev => { const a = ev.target.dataset && ev.target.dataset.a; if (!a) return; m.hidden = true; if (a === 'inv') invite(o.peer); else if (a === 'trade') TRADE.request(o.peer); }; }
  addEventListener('pointerdown', ev => { const m = document.getElementById('pmenu'); if (m && !m.hidden && !m.contains(ev.target)) m.hidden = true; }, true);
  // ----- 그리기: 같은 지역의 다른 플레이어 (이름 · HP · 말풍선) — 파티원은 초록 이름
  function addDraw(list, g) { if (!room) return; for (const o of OTH) { if (o.pr.z !== zk()) continue; const v = peers.get(o.peer); if (!v) continue; if (ISLE && !DN.seen(Math.floor(v.x), Math.floor(v.z))) continue;
      list.push({ d: v.x + v.z, f: () => { const pr = o.pr, [x, y] = W2P(v.x, v.z), cls = CLS_DEF[pr.c] ? pr.c : 'knight', eq = pr.e || {}, eqf = s => eq[s] || null, pm = partyId && pr.pt === partyId;
        let anim = 'idle', fr = Math.floor(time * 6) % 8; if (v.atkT != null) { anim = v.atkV === 'cast' && cls !== 'knight' ? 'cast' : cls === 'knight' && v.atkV === 'attack2' ? 'attack2' : 'attack'; fr = Math.min(7, Math.floor(v.atkT / (0.7 / GSPD) * 8)); } else if (v.moving) { anim = 'walk'; fr = Math.floor(v.dist * 4) % 8; }
        if (hoverPeer === o.peer) { g.save(); g.strokeStyle = pm ? 'rgba(143,224,138,.8)' : 'rgba(168,216,255,.8)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y, 18, 9, 0, 0, 7); g.stroke(); g.restore(); }
        if (pr.hp <= 0) g.globalAlpha = 0.45; else if (pr.iv) g.globalAlpha = 0.42; drawHeroSprite(g, anim, fr, pr.r || 0, x, y, null, cls, eqf, sl => (pr.eg && +pr.eg[sl]) || 0); g.globalAlpha = 1;
        const top = y - 104, nm = (pm ? '[파티] ' : '') + nmOf(pr); g.save(); g.font = '800 11px "Noto Sans KR",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.85)'; g.strokeText(nm, x, top); g.fillStyle = pm ? PCOL : RCOL; g.fillText(nm, x, top);
        const w = 34, k = Math.max(0, Math.min(1, (pr.hp || 0) / (pr.hm || 1))); g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(x - w / 2 - 1, top + 3, w + 2, 5); g.fillStyle = '#c8322a'; g.fillRect(x - w / 2, top + 4, w * k, 3); g.restore();
        if (v.chat && time < v.chat.until) CHAT.bubble(g, { x: v.x, z: v.z, chat: v.chat, pname: nmOf(pr) }); } }); } }
  return { mx, setExtra(k, v) { extra[k] = v; sendT = 0; }, partyTargets: () => new Set(members().filter(o => o.pr.z === zk() && o.pr.tg != null).map(o => o.pr.tg)), partyId: () => partyId, setParty(id) { if (!id) return; partyId = id; hadMem = true; ptGrace = Date.now() + 20000; renderParty(); },
    fx, tick, addDraw, guestMob, guest, follow, hit, alive, nearRemote, hitRemote, distribute, assignLoot, requestPick, peerAt, openMenu, invite, leaveParty, healPeer, buffParty, buffPeer, partyNear,
    guestIn: z => !!room && !!myPeer && zk() === z && !isHost() && !!hostCache, me: () => myPeer, nameOf: p => p === myPeer ? PNAME() : nmOf(prOf(p)), inParty: () => !!partyId,
    setHover(o) { hoverPeer = o ? o.peer : null; }, hoverParty() { const o = hoverPeer && OTH.find(q => q.peer === hoverPeer); return o && partyId && o.pr.pt === partyId && o.pr.z === zk() ? o : null; },
    chat(t) { chatSeq++; lastChat = String(t).slice(0, 80); sendT = 0; }, announceAll(t) { anSeq++; anText = String(t).slice(0, 90); anL.push([anSeq, anText]); if (anL.length > 5) anL.shift(); sendT = 0; }, count: () => room ? OTH.length + 1 : 1, setRoom, hasArtRoom: () => artRoom, others: () => OTH };
})();
// ============================================================ 교환 (마을에서 다른 유저 클릭 → 교환 신청 → 수락하면 양쪽에 교환창)
// 각자 아이템·골드를 올리고 [확인] → 둘 다 확인하면 "교환하시겠습니까?" 한 번 더 → 둘 다 '예'면 서로 주고받음
// 상태는 presence td = { id, to, st: req|no|open|lock|ok|done|cancel, v(내 항목 번호), pv(내가 확인한 상대 항목 번호), g, it:[아이템…] }
const TRADE = (() => { const $ = id => document.getElementById(id), MAXIT = 10; const icoC = {}, ico = (k, b) => icoC[k + (b ? '|b' : '')] || (icoC[k + (b ? '|b' : '')] = ICON(k, b)); let tickT = 0;
  let S = null, offer = [], gold = 0, ver = 0, asked = false, doneT = 0, seenReq = new Map(), lastPv = -1;   // S = { id, peer, name, st, role }
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const partner = () => S && NET.others().find(o => o.peer === S.peer);
  const ptd = () => { const o = partner(), t = o && o.pr.td; return t && S && t.id === S.id && t.to === NET.me() ? t : null; };
  const clean = e => { const c = JSON.parse(JSON.stringify(e, (k, v) => k && k[0] === '_' ? undefined : v)); delete c.on; delete c.locked; delete c.godTemp; return c; };
  const tradable = e => !e.on && !e.locked && !e.godTemp && !GOD_INF(e.id) && !(e.pet && e.pet.state === 'out') && ITEMS[e.id];
  function push() { if (!S) { NET.setExtra('td', null); return; } NET.setExtra('td', { id: S.id, to: S.peer, st: S.st, v: ver, pv: S.pv == null ? -1 : S.pv, g: gold, it: offer.map(x => Object.assign(clean(x.e), { n: x.n })) }); }
  const hideTip = () => { const st = document.getElementById('stat-tip'); if (st) st.hidden = true; };
  function end(msg, c) { hideTip(); if (msg) say(msg, c || '#9c9682'); if (S && S.st !== 'done' && S.st !== 'cancel') { S.st = 'cancel'; push(); } setTimeout(() => { if (!S || S.st === 'cancel' || S.st === 'done') { S = null; offer = []; gold = 0; push(); } }, 2500); $('tradewin').hidden = true; asked = false; }
  // 신청 (내가)
  function request(peer) { const o = NET.others().find(q => q.peer === peer); if (!o) return; if (SCENE !== 'town' || o.pr.z !== 'town') { say('교환은 마을에서만 할 수 있어요.', '#f0c080'); return; }
    if (S && S.st !== 'cancel' && S.st !== 'done') { say('이미 교환 중이에요.', '#f0c080'); return; }
    S = { id: 'T' + Math.random().toString(36).slice(2, 9), peer, name: String(o.pr.n || '상대').slice(0, 12), st: 'req', at: Date.now(), pv: -1 }; offer = []; gold = 0; ver = 0; asked = false; push();
    say(`${S.name}님에게 교환을 신청했습니다.`, '#a8d8ff'); }
  // 받은 신청 확인 · 상대 상태 따라가기
  function tick(dt) { tickT -= dt || 0.1; if (tickT > 0) return; tickT = 0.1; const me = NET.me(); if (!me) return;
    for (const o of NET.others()) { const t = o.pr.td; if (!t || t.to !== me || t.st !== 'req') continue; if (seenReq.get(o.peer) === t.id) continue; seenReq.set(o.peer, t.id);
      if (S && S.st !== 'cancel' && S.st !== 'done') continue; if (SCENE !== 'town') continue; const nm = String(o.pr.n || '상대').slice(0, 12), id = t.id, peer = o.peer;
      if (AC && SFX_ON) tone(AC.currentTime, 'triangle', 660, 990, 0.2, 0.06);
      INV.askYesNo(`${nm}님이 교환을 신청했습니다.`, '수락하시겠습니까?', () => { S = { id, peer, name: nm, st: 'open', pv: -1 }; offer = []; gold = 0; ver = 0; asked = false; push(); open(); }, () => { S = { id, peer, name: nm, st: 'no', pv: -1 }; push(); setTimeout(() => { if (S && S.st === 'no') { S = null; push(); } }, 2500); }); }
    if (!S) return; const o = partner(), t = ptd();
    if (S.st === 'req') { if (t && t.st === 'no') { end(`${S.name}님이 교환을 거절했습니다.`); return; } if (t && t.st === 'open') { S.st = 'open'; push(); open(); return; } if (Date.now() - S.at > 30000 || !o) { end('교환 신청에 응답이 없습니다.'); } return; }
    if (S.st === 'no' || S.st === 'cancel' || S.st === 'done') return;
    if (!o || o.pr.z !== 'town' || SCENE !== 'town') { end('상대가 멀어져서 교환이 취소되었습니다.', '#f08a7a'); return; }
    if (t && t.st === 'cancel') { end(`${S.name}님이 교환을 취소했습니다.`, '#f08a7a'); return; }
    if (!t) return;
    if ((S.st === 'lock' || S.st === 'ok') && t.v !== S.pv && t.st !== 'done') { S.st = 'open'; S.pv = -1; asked = false; push(); say('상대가 항목을 바꿔서 확인이 풀렸어요. 다시 확인해 주세요.', '#f0c080'); }
    // 둘 다 확인 → 한 번 더 묻기
    if (S.st === 'lock' && (t.st === 'lock' || t.st === 'ok') && t.pv === ver && S.pv === t.v && !asked) { asked = true;
      INV.askYesNo('교환하시겠습니까?', `주는 것: ${summary(offer.map(x => Object.assign({}, x.e, { n: x.n })), gold)}  ·  받는 것: ${summary(t.it || [], t.g || 0)}`, () => { if (S && S.st === 'lock') { S.st = 'ok'; push(); render(); } }, () => { if (S) { S.st = 'open'; S.pv = -1; asked = false; push(); render(); } }); }
    // 둘 다 '예' → 주고받기
    if (S.st === 'ok' && (t.st === 'ok' || t.st === 'done') && t.pv === ver && S.pv === t.v) execute(t);
    render(); }
  function summary(list, g) { const a = list.map(e => (ITEMS[e.id] ? INV.nameOf(e) : '?') + (ITEMS[e.id] && ITEMS[e.id].stack && e.n > 1 ? ' ×' + e.n : '')); if (g > 0) a.push(g.toLocaleString() + ' 골드'); return a.length ? a.join(', ') : '없음'; }
  function execute(t) { if (!S || S.st !== 'ok') return; S.st = 'done'; push();
    for (const x of offer) { const bag = INV.bag(); if (!bag.includes(x.e)) continue; const d = ITEMS[x.e.id]; if (d.stack && x.n < x.e.n) { x.e.n -= x.n; INV.render(); } else INV.removeEntry(x.e); }
    coins = Math.max(0, coins - Math.min(gold, coins)) + Math.max(0, t.g | 0);
    for (const e of t.it || []) { const d = ITEMS[e.id]; if (!d) continue; if (d.stack) INV.add(e.id, Math.max(1, e.n | 0), true); else INV.insertEntry(Object.assign({}, e, { on: false, n: 1 })); }
    INV.render(); if (AC && SFX_ON) [784, 1047, 1319].forEach((f, k) => tone(AC.currentTime + k * 0.08, 'triangle', f, f, 0.3, 0.07));
    say(`***** ${S.name}님과 교환했습니다 — 받은 것: ${summary(t.it || [], t.g || 0)} *****`, '#9fd08a'); try { if (SAVE.on()) SAVE.now(true, true); } catch (e) {}
    $('tradewin').hidden = true; asked = false; setTimeout(() => { if (S && S.st === 'done') { S = null; offer = []; gold = 0; push(); } }, 3000); }
  // ----- 교환창
  function changed() { ver++; if (S && (S.st === 'lock' || S.st === 'ok')) { S.st = 'open'; S.pv = -1; asked = false; } push(); render(); }
  function addItem(e) { if (!S || S.st === 'done') return; if (!tradable(e)) { say('착용 중·잠금·소환 중인 것은 교환할 수 없어요.', '#f08a7a'); return; } if (offer.some(x => x.e === e)) return; if (offer.length >= MAXIT) { say(`한 번에 ${MAXIT}개까지 올릴 수 있어요.`, '#f08a7a'); return; }
    offer.push({ e, n: e.n }); changed(); }
  function open() { const w = $('tradewin'); if (!w || !S) return; w.hidden = false; $('tw-who').textContent = S.name; $('tw-gold').value = gold || ''; render(); }
  let lastH = '';
  function render() { const w = $('tradewin'); if (!w || w.hidden || !S) return; const t = ptd(), mine = S.st, his = t ? t.st : 'open';
    const tipA = (e, extra) => ` data-itip="${esc(INV.tipOf(Object.assign({ n: 1 }, e, { on: false })).split('\n').filter(l => !/더블클릭|꾹 누르고|우클릭/.test(l)).concat(extra ? [extra] : []).join('\n'))}" data-ic="${rarC(e.id)}"`;
    const enB = e => e.en ? `<i class="en${e.en < 0 ? ' neg' : ''}">${e.en > 0 ? '+' : ''}${e.en}</i>` : '';
    const row = (e, n, k, me) => { const d = ITEMS[e.id]; if (!d) return ''; return `<div class="tw-it"${me ? ` data-k="${k}"` : ''}${tipA(e, me ? '클릭: 교환창에서 빼기' : '')}><span class="ic">${ico(d.icon, e.blessed)}${enB(e)}</span><b style="color:${rarC(e.id)}">${esc(INV.nameOf(e))}</b>${d.stack ? (me ? `<input type="number" min="1" max="${e.n}" value="${n}" data-n="${k}" class="tw-n">` : `<small>×${n}</small>`) : ''}</div>`; };
    const stTxt = s => s === 'ok' ? '<span class="ok">교환 수락 ✔</span>' : s === 'lock' ? '<span class="ok">확인함 ✔</span>' : '<span>항목 고르는 중…</span>';
    const mineH = offer.map((x, k) => row(x.e, x.n, k, true)).join('') || '<p class="tw-empty">아래 내 가방에서 눌러 올리세요</p>';
    const hisH = ((t && t.it) || []).map(e => row(e, e.n, 0, false)).join('') || '<p class="tw-empty">아직 올린 것이 없어요</p>';
    const bagH = INV.bag().filter(e => tradable(e) && !offer.some(x => x.e === e)).map((e, k) => { const d = ITEMS[e.id]; return `<button type="button" class="tw-b" data-bag="${INV.bag().indexOf(e)}"${tipA(e, '클릭: 교환창에 올리기')}><span class="ic">${ico(d.icon, e.blessed)}</span>${enB(e)}${d.stack && e.n > 1 ? `<em>${e.n > 999 ? '999+' : e.n}</em>` : ''}</button>`; }).join('');
    const h = mineH + '|' + hisH + '|' + bagH + '|' + mine + his + (t ? t.g : 0) + coins;
    if (h !== lastH) { lastH = h; $('tw-mine').innerHTML = mineH; $('tw-his').innerHTML = hisH; $('tw-bag').innerHTML = bagH || '<p class="tw-empty">올릴 수 있는 물건이 없어요</p>'; $('tw-hisgold').textContent = ((t && t.g) || 0).toLocaleString(); $('tw-have').textContent = coins.toLocaleString(); }
    $('tw-mst').innerHTML = stTxt(mine); $('tw-hst').innerHTML = stTxt(his);
    const ok = $('tw-ok'); ok.textContent = mine === 'lock' || mine === 'ok' ? (his === 'lock' || his === 'ok' ? '교환 확인 중…' : '상대 확인 기다리는 중…') : '확인'; ok.disabled = mine !== 'open';
    w.classList.toggle('locked', mine !== 'open'); }
  { const w = $('tradewin');
    if (w) { w.addEventListener('keydown', ev => { if (ev.key === 'Escape') { ev.preventDefault(); end('교환을 취소했습니다.'); } ev.stopPropagation(); });
      $('tw-bag').onclick = ev => { const b = ev.target.closest('[data-bag]'); if (!b || !S || S.st !== 'open') return; const e = INV.bag()[+b.dataset.bag]; if (e) addItem(e); };
      $('tw-mine').onclick = ev => { if (ev.target.closest('input')) return; const r = ev.target.closest('[data-k]'); if (!r || !S || S.st !== 'open') return; offer.splice(+r.dataset.k, 1); changed(); };
      $('tw-mine').onchange = ev => { const i = ev.target.closest('[data-n]'); if (!i || !S) return; const x = offer[+i.dataset.n]; if (!x) return; x.n = Math.max(1, Math.min(x.e.n, Math.floor(+i.value || 1))); i.value = x.n; changed(); };
      $('tw-gold').oninput = ev => { if (!S || S.st !== 'open') { ev.target.value = gold || ''; return; } const v = Math.max(0, Math.min(coins, Math.floor(+ev.target.value || 0))); if (String(v) !== ev.target.value && ev.target.value !== '') ev.target.value = v || ''; gold = v; changed(); };
      $('tw-ok').onclick = () => { if (!S || S.st !== 'open') return; const t = ptd(); if (!t) { say('상대가 아직 교환창을 열지 않았어요.', '#f0c080'); return; } if (gold > coins) { say('골드가 부족해요.', '#f08a7a'); return; } S.st = 'lock'; S.pv = t.v; asked = false; push(); render(); };
      $('tw-cancel').onclick = () => end('교환을 취소했습니다.'); $('tw-x').onclick = () => end('교환을 취소했습니다.'); } }
  return { request, tick, active: () => !!S && S.st !== 'cancel' && S.st !== 'done' };
})();
// ============================================================ 업데이트 (로그인 화면): PC 실행 파일은 업데이트 서버에서 바뀐 파일만 받아 덮어씀 · 웹은 새로 불러오기
const UPD = (() => { const $ = id => document.getElementById(id), N = () => window.native; let busy = false;
  const updErr = e => { e = String(e || ''); return /손상|STALE/.test(e) ? '방금 나온 업데이트라 파일이 아직 서버에 퍼지는 중이에요. 1~2분 뒤에 다시 눌러 주세요.' : /EPERM|EACCES|EBUSY/.test(e) ? '게임 폴더에 파일을 쓸 수 없어요. 게임 폴더를 바탕화면이나 다운로드 폴더처럼 쓰기 가능한 곳으로 옮긴 뒤 다시 해 주세요.' : '업데이트하지 못했어요. 인터넷 연결을 확인해 주세요. (' + e.slice(0, 60) + ')'; };
  const msg = (t, c) => { const m = $('lg-upmsg'); if (m) { m.textContent = t; m.style.color = c || '#cfc4a8'; } };
  const btn = (t, on) => { const b = $('lg-update'); if (!b) return; b.textContent = t; b.classList.toggle('new', !!on); };
  async function run() { if (busy) return; const n = N();
    if (!n || !n.update) { msg('최신 버전으로 다시 불러옵니다…', '#9fd08a'); setTimeout(() => location.reload(), 500); return; }
    busy = true; $('lg-update').disabled = true; msg('최신 버전을 확인하는 중…');
    let r; try { r = await n.update(); } catch (e) { r = { ok: false, err: String(e && e.message || e) }; }
    if (r.ok && !r.latest) { msg(`v${r.ver} 업데이트 완료! (${r.n}개 파일) ${r.restart ? '게임을 다시 시작합니다…' : '다시 불러옵니다…'}`, '#9fd08a'); setTimeout(() => r.restart && n.relaunch ? n.relaunch() : location.reload(), 1000); return; }
    busy = false; $('lg-update').disabled = false;
    if (r.ok) { msg(`이미 최신 버전이에요. (v${Math.max(r.ver, GAME_VER)})`, '#9fd08a'); btn('업데이트', false); }
    else if (r.err === 'nobase') msg('업데이트 서버가 아직 연결되지 않았어요.', '#f0c080');
    else msg(updErr(r.err), '#f08a7a'); }
  { const b = $('lg-update'); if (b) b.onclick = run; const v = $('lg-ver'); if (v) v.textContent = 'v' + GAME_VER; const n = N();
    if (n && n.onUpdate) n.onUpdate(m => { if (m.step === 'file') msg(`파일 받는 중… ${m.n + 1} / ${m.total}`); });
    if (n && n.updateCheck) n.updateCheck().then(r => { if (r && r.ok && r.ver > GAME_VER) { btn(`업데이트 (새 버전 v${r.ver})`, true); msg('새 버전이 나왔어요. 업데이트를 눌러 주세요.', '#ffd86a'); } }).catch(() => {}); }
  // 게임 중: 5분마다 새 버전 확인 → 위쪽 [업데이트] 버튼 → 누르면 저장 → 받기 → 다시 불러온 뒤 같은 자리·같은 파티·같은 방에서 이어서
  let newVer = 0, gBusy = false;
  async function checkIn() { const n = N(); if (!n || !n.updateCheck || gBusy) return; try { const r = await n.updateCheck(); const b = $('btn-upd'); if (r && r.ok && r.ver > GAME_VER && b) { const first = b.hidden; newVer = r.ver; b.hidden = false; b.textContent = `⬇ 업데이트 (v${r.ver})`; if (first && ACCOUNT.started()) say(`새 버전(v${r.ver})이 나왔어요. 화면 위의 [업데이트]를 누르면 접속을 유지한 채 바로 업데이트돼요.`, '#ffd86a'); } } catch (e) {} }
  async function runIn() { const n = N(), b = $('btn-upd'); if (!n || !n.update || gBusy) return; gBusy = true; b.disabled = true; b.textContent = '업데이트 중…'; say('업데이트를 받는 중입니다… (캐릭터를 먼저 저장해요)', '#ffd86a');
    ACCOUNT.keepForUpdate(); try { if (SAVE.on()) await SAVE.now(true, true); } catch (e) {}
    let r; try { r = await n.update(); } catch (e) { r = { ok: false, err: String(e && e.message || e) }; }
    if (!r.ok || r.latest) { try { localStorage.removeItem('aden_resume'); } catch (e) {} }
    if (!r.ok) { gBusy = false; b.disabled = false; b.textContent = `⬇ 업데이트 (v${newVer})`; say(updErr(r.err), '#f08a7a'); return; }
    if (r.latest) { gBusy = false; b.hidden = true; b.disabled = false; say('이미 최신 버전이에요.', '#9fd08a'); return; }
    say(`v${r.ver} 업데이트 완료! 잠깐 다시 불러온 뒤 그 자리에서 이어집니다…`, '#9fd08a'); setTimeout(() => r.restart && n.relaunch ? n.relaunch() : location.reload(), 800); }
  { const b = $('btn-upd'), n = N(); if (b && n && n.update) { b.onclick = runIn; setTimeout(checkIn, 8000); setInterval(checkIn, 5 * 60 * 1000); }
    if (n && n.onUpdate) n.onUpdate(m => { if (gBusy && m.step === 'file') { const bb = $('btn-upd'); if (bb) bb.textContent = `업데이트 중… ${m.n + 1}/${m.total}`; } }); }
  return { run, check: checkIn }; })();
// ============================================================ 업데이트 소식: 버전이 올라간 뒤 처음 접속하면 팝업으로 (ESC 메뉴에서 다시 보기)
const NOTES = (() => { const $ = id => document.getElementById(id), KEY = 'aden_seen_ver';
  const LIST = [
    { v: 107, items: ['플레이어끼리 겹치지 않아요. 다른 유저가 서 있는 칸은 몬스터처럼 막혀서 피해 돌아가요. (쓰러진 유저는 안 막음)', '데스나이트 세트·데스나이트의 불검·설원의 망토·얼음여왕의 지팡이가 일반 등급으로 잘못 표시되던 문제를 고쳤어요. (원래 등급: 데스나이트 방어구 희귀 · 불검 영웅 · 설원의 망토 희귀 · 얼음여왕의 지팡이 영웅)', '장비 강화 개편: 높은 등급일수록 강화 1당 오르는 수치가 커졌어요. 무기 공격 = 일반 +1 · 고급 +1.5 · 희귀 +2 · 영웅 +3, 방어구 방어 = 일반 +1 · 고급 +1.25 · 희귀 +1.5 · 영웅 +2 (소수점 버림 · 예: +9 무기 = 일반 +9 · 고급 +13 · 희귀 +18 · 영웅 +27)', '안전 강화가 등급별로 통일됐어요. 무기·방어구 구분 없이 일반 +6 · 고급 +5 · 희귀 +4 · 영웅 +3. (아이템 정보에 강화 1당 상승치와 안전 강화 표시)', '모든 주문서와 마법서·기술서·정령수정의 무게가 0이 됐어요.', '필드에서 다른 유저를 클릭해도 메뉴 창이 뜨지 않아요. (사냥 중 몬스터를 누르다 잘못 뜨지 않게 · 파티 초대·거래 메뉴는 오른쪽 클릭 · 마을에서는 지금처럼 왼쪽 클릭도 됨)', '마법사 7서클 마법 [이뮨 투 함]이 생겼어요. 20초 동안 받는 모든 피해가 30% 줄어요. 그냥 쓰면 나에게, 파티원에게 마우스를 올리고 쓰면 그 파티원에게 걸려요. (MP 24 · Lv 28 · 리덕션 아머와 함께 적용 · 마법서: 얼음여왕·데스나이트, 드물게 엘모어 마법사)', '콜 라이트닝·콘 오브 콜드·이럽션·선버스트의 이펙트를 작고 덜 눈부시게 줄였어요. (크기 약 60% · 화면 번쩍임·흔들림 줄임 · 몬스터가 덜 가려져요)', '공격 마법에도 치명타가 터져요. (피해 1.5배 · 분홍빛 CRITICAL!) 확률 = 5% + (내 레벨 − 대상 레벨)×0.5% + (지능 − 12)×1% − 대상 마법 방어(MR)×0.1% · 최소 2% · 최대 30%. 캐릭터 창과 단축 슬롯 툴팁에 확률이 보여요.', '마나의 지팡이로 빨아들이는 마나에 한도가 생겼어요. 몬스터마다 가진 마나(레벨 × 종류: 보스 ×5 · 마법형 ×2 · 인간형 ×1 · 짐승·곤충 ×0.6 · 언데드 ×0.5 · 골렘 ×0.3)만큼만 흡수되고, 다 빨면 [마나 고갈]이 떠요. (다시 태어나면 채워짐)', '벨트에 [가방 무게 감소]가 생겼어요. 등급별로 일반 −3% · 고급 −5% · 희귀 −8% · 영웅 −12%. (디크리즈 웨이트와 함께 적용 · 아이템 정보·장비 비교·캐릭터 창 무게에 표시)', '턴 언데드의 성공·실패 연출이 확실히 달라졌어요. 성공하면 큰 금빛 기둥과 십자가가 내리고 몸이 빛으로 흩어져요. 실패하면 가는 빛이 깨져 떨어지고 보랏빛 어둠이 튕겨내요. (소리·글씨도 다름 · 다른 사람 화면에도 구분돼 보여요)', '본토던전이 덜 복잡해졌어요. 1·2층 모두 바닥의 절반 정도가 기둥이 선 넓은 광장이고, 나머지 절반은 골목이에요. (광장 기둥 일부엔 횃불) 2층으로 내려가는 계단은 여전히 입구에서 가장 먼 곳에 있어요.', '던전·밤에 몬스터가 어둠에 묻혀 안 보이던 문제를 고쳤어요. 내 시야 안의 몬스터와 내 캐릭터 주변은 어둠이 걷히고, 몬스터 이름·HP바·피해 숫자는 항상 어둠 위에 또렷하게 보여요.', '몬스터를 클릭하거나 마우스를 올리면 이름 위에 상태 아이콘이 떠요. 붉은 테 = 디버프(스턴·슬로우·출혈·명중 저하 · 아래 숫자는 남은 초), 초록 테 = 버프(체력 회복 중·밤의 힘), 금색 테 = 속성·언데드 정보. 아이콘에 마우스를 올리면 설명이 나와요.', '단축 슬롯(F5~F12)에 마우스를 올리면 이름이 떠요. 마법은 서클·MP와 지금 내 능력치로 들어가는 예상 피해까지, 아이템은 보유 개수를 보여 줘요.', '마법 피해 공식 개편 (리니지 방식): SP = 마법 레벨(마법사 레벨÷4 · 요정 레벨÷8) + 마법 보너스(지능) + 장비 SP. 공격 마법 피해 = 기본 피해 × (1 + (지능 + SP − 12) × 9.4%). 높은 서클 마법일수록 크게 강해져요. (예: Lv40·지능 18·SP+5 지팡이의 콘 오브 콜드 평균 32 → 57) 캐릭터 창에 SP와 마법 피해 배율이 표시돼요.', '파이어볼 범위가 3×3칸에서 대상을 중심으로 가로·세로 6칸으로 넓어졌어요. (범위가 바닥에 표시되고 곳곳에서 폭발 · 던전에서는 벽 너머로 안 퍼져요)', '오렌설원지역 1구역의 엘모어 병사·전사·마법사가 언데드가 됐어요. 턴 언데드가 통하고, 밤에는 강해져요. (공격력 1.5배)', '본토던전 몬스터를 캐릭터 크기에 맞게 줄였어요. 킹 버그베어·켈베로스·네크로맨서, 그리고 데스나이트가 일으키는 스파토이 (이제 데스나이트보다 확실히 작아요)'] },
    { v: 106, items: ['새 사냥터 [본토던전] (상급 · Lv 35~45)이 열렸어요. 피와 시체가 널린 벽과 골목의 미로이고, 언제나 밤처럼 아주 어두워요. (전용 배경음 · 미니맵은 내가 본 곳만 밝혀져요 · 양초를 켜면 시야가 넓어져요) 월드맵에서는 1층으로만 들어가요.', '본토던전의 모든 몬스터는 먼저 덤비지만, 벽 너머에 있으면 나를 못 봐요. 같은 골목에서 보일 때만 덤벼요. 나도 벽 너머로는 활·마법을 쏠 수 없어요. 내 캐릭터 앞을 가리는 벽은 반투명해지고, 곳곳의 횃불이 길을 비춰요. 자동사냥도 돼요. (미로를 따라 길을 찾아감)', '본토던전 1층 (Lv 35~40): 킹 버그베어 · 웅골리언트(물리면 거미줄에 걸려 둔화) · 구울(할퀴면 독: 5초 동안 초당 최대 HP 1.5% · 큐어 포이즌이나 새 물약 [해독제]로 치료). 보스 [카스파 패밀리]는 물·불·땅·바람 마법사 넷(카스파·메르키오르·발터자르·세마)이 붙어 다니며 원소 마법을 써요. 넷 모두 쓰러지면 약 2시간 뒤 다시 나타나요. (각자 따로 드랍)', '1층 미로 끝(입구에서 가장 먼 곳)에 2층으로 내려가는 계단이 있어요. 미로를 따라가거나 순간이동 주문서로 근처에 떨어지면 이용하세요. 2층 도착 자리 옆에는 1층으로 올라가는 계단이 있어요.', '본토던전 2층 (Lv 40~45): 킹 버그베어 · 켈베로스 · 네크로맨서(보라색 범위로 저주 폭발 — 피하면 안 맞아요). 보스 [데스나이트]는 약 3시간마다 나타나요. 헬파이어(큰 붉은 원 → 지옥불 폭발), 스파토이 일으키기(최대 4마리), 불검 휘두르기를 써요.', '데스나이트 세트(기사 전용): 투구·갑옷·장갑·장화 네 부위를 모두 입으면 데스나이트로 변신해요. (세트 효과 AC -3 · 추가 피해 +2 · 불 저항 +20 · 다른 사람에게도 변신한 모습으로 보여요) 데스나이트의 불검(영웅)도 드물게 떨어져요.', '새 사냥터 [오렌설원지역] (상급 · Lv 40~50 · 수속성)이 열렸어요. 눈보라가 몰아치는 눈 덮인 설원이에요. (전용 배경음 · 가끔 거센 돌풍이 불어요)', '오렌설원지역 1구역 (Lv 40~45): 엘모어 병사·전사·마법사가 3~5명씩 무리 지어 다녀요. 먼저 덤비지 않지만, 하나를 치면 그 무리 전체가 반격해요.', '오렌설원지역 2구역 (Lv 45~50): 먼저 덤비는 에틴·샤벨타이거, 맞으면 몸이 얼어 느려지는 아이스 골렘이 나와요. 보스 [얼음여왕]은 약 3시간마다 나타나 블리자드(넓은 범위에 계속 얼음 피해 + 둔화) · 콘 오브 콜드 · 아이스 골렘 부르기를 써요. 설원의 망토(희귀)·얼음여왕의 지팡이(영웅)를 떨어뜨려요.', '마법 연출을 모두 새로 만들었어요. 마법마다 성향에 맞는 색과 모양의 마법진이 발밑에 펼쳐지고, 마법 이름이 머리 위에 떠요. 에너지 볼트(푸른 비전 구체) · 아이스 대거(얼음 단검과 파편) · 파이어 애로우(불화살) · 파이어볼(큰 폭발과 연기) · 콜 라이트닝(하늘에서 내리치는 번개) · 콘 오브 콜드(솟구치는 얼음 기둥) · 이럽션(갈라지는 땅과 솟는 바위) · 선버스트(모여드는 빛과 대폭발) · 힐(내리는 빛) · 그레이터 힐(빛기둥) · 실드(육각 보호막) · 메디테이션(연꽃 마법진) · 슬로우(보랏빛 시계) 등 정령마법·기사 기술도 각자 다른 이펙트가 생겼어요.', '마법 빛이 어둠 속에서도 밝게 빛나 밤·던전에서도 잘 보여요. 같은 지역 다른 사람이 쓰는 마법도 이펙트가 보여요.', '요정·마법사도 장비를 입으면 겉모습이 바뀌어요. (투구·갑옷·장갑·장화·벨트·망토·방패, 무기는 활·지팡이·칼 모양) 마법사는 마법을 쓸 때 지팡이를 들어 올리는 주문 동작이, 요정은 칼을 들면 베기 동작이 나와요.', '[PC 게임] F11·F12 키가 창 전체화면·개발자 도구로 먹혀 단축키로 쓸 수 없던 문제를 고쳤어요. 이제 F5~F12 모두 게임 단축키예요. (창 전체화면은 Alt+Enter)', '기사 기술 [리덕션 아머]의 받는 피해 25% 감소가 실제로는 적용되지 않던 문제를 고쳤어요.', '마법 개편 (1~6서클): 실드 10분 · 에너지 볼트(무속성) / 2서클 디크리즈 웨이트(10분 무게 -10%)·아이스 대거(수속성 · 요정·마법사 전용) / 3서클 턴 언데드(언데드 한 방 · 성공률 최대 75% · 보스 면역)·파이어 애로우(불속성) / 4서클 파이어볼(3×3 폭발)·슬로우(1.3배 둔화 · 보스 4초)·메디테이션(10분 MP 회복, 가만히 있으면 2배) / 5서클 콜 라이트닝(무속성 번개)·그레이터 힐·카운터 매직(마법 공격 1회 무효) / 6서클 콘 오브 콜드(수속성)·이럽션(땅속성)·선버스트(불속성). 라이트·인챈트 웨폰·블레스드 아머·인챈트 덱스터리·인챈트 마이티·헤이스트·카운터 디텍션·크리에이트 좀비는 없어졌어요.', '속성 마법은 약점 몬스터에게 +50%, 같은 속성 몬스터에게 -50% 피해예요. 공격 마법 피해는 서클이 높을수록 커요. (지능 보너스 추가)', '잡화상점에 [양초](30골드)가 생겼어요. 켜면 10분 동안 밤 시야가 넓어져요. (라이트 마법 대신)', '화면 정리: [자동사냥 중] 표시가 지역 이름·온라인 인원 글자를 덮지 않게 옆으로 비켜요. 왼쪽 [자동사냥 켜짐] 글자가 버튼에 잘리지 않게 했고, 피해 숫자·MISS가 몬스터 이름과 덜 겹치게 조금씩 흩어져 떠요.', '요정 스킬창의 [기술] 탭이 [정령마법] 탭으로 바뀌었어요. (정령마법 5종 · 마법사는 기술 탭이 안 보여요)', '마법사의 기본 공격이 지팡이를 휘둘러 때리는 근거리 공격으로 바뀌었어요. (힘·무기 공격력으로 계산 · 원거리 공격은 마법으로)', '[데모] 갓 모드를 켜도 자동으로 무적·몹 한 방이 되지 않아요. 테스트 패널에서 무적 · 몹 한 방 · 이동 1.5배 · 마나 무제한을 따로 켜고, [모든 스킬 배우기]로 내 직업 스킬을 한 번에 배울 수 있어요.', '월드맵에서 이야기섬으로 가는 건 무료예요. (다른 사냥터는 1,000 골드 · 이동 버튼에 요금 표시)', '속성 시스템이 넓어졌어요. 무기 속성 주문서가 4종(땅·물·불·바람)이 되고, 몬스터마다 속성이 생겼어요. 무기 속성이 몬스터 속성의 반대(불⇄물 · 땅⇄바람)면 속성 추가 피해가 2배, 같은 속성이면 0이에요. (예: 물 3단 무기로 불 몬스터를 치면 +10 · 월드맵 사냥터 정보에 몬스터 속성 표시)', '다른 속성이 붙은 무기에 다른 속성 주문서를 쓰면 바꿀지 먼저 물어봐요. (성공하면 새 속성 1단 · 실패하면 그대로)', '새 주문서 드랍: 셸로브 물 · 거대 여왕개미 불 · 오우거 바람·물 · 바포메트 불·바람·물 (땅 주문서는 그대로)', '속성 몬스터의 공격은 그 속성 저항만큼 줄어들어요. (최대 60%) 저항 장비: 요정족 망토(바람 +10) · 요정족 티셔츠(바람 +5) · 수호의 티셔츠(물 +10) · 오크 족장의 벨트(땅 +10) · 보호의 망토·커츠의 망토(모든 속성 +10) · 지배자의 벨트(모든 속성 +5) · 데스나이트 장비(불) · 캐릭터 창에 땅/물/불/풍 저항 표시', '요정 정령마법 5종이 이제 실제로 효과가 있어요. 레지스트 매직(10분 MR +10) · 레지스트 엘리멘탈(10분 모든 속성 저항 +10) · 클리어 마인드(10분 MP 회복 초당 +0.4) · 바디 투 마인드(HP 10 → MP 5) · 텔레포트 투 마더트리(마을로 순간이동)', '연금술·일괄 강화에 올린 장비 표시가 보라색·파란색 테두리라 영웅·희귀 등급처럼 보이던 문제를 고쳤어요. 이제 점선 테두리(연금술 = 금색 ⚗ · 일괄 강화 = 흰색 ✓)로 보이고, 그 창이 열려 있을 때만 표시돼요.'] },
    { v: 105, items: ['연금술 창에 등급별 [일괄 등록] 버튼이 생겼어요. 일반·고급·희귀 버튼을 누르면 그 등급 장비 3개가 한 번에 올라가요. (버튼 옆 숫자 = 올릴 수 있는 개수 · 값싼 것부터 · 착용 중·잠긴 장비와 강화·축복·속성이 붙은 장비는 빠져요)'] },
    { v: 104, items: ['반지·목걸이에 기본 방어력(AC) 1이 붙었어요. 능력치 반지·목걸이(힘·민첩·군주의 반지, 지식·민첩·신성한 목걸이)와 HP·MP 반지·목걸이(은·체력·마나·용의 반지, 나무 부적, 체력·마나의 목걸이) 모두 · 원래 AC가 있던 보호의 반지·수호의 목걸이·용의 목걸이는 그대로 · 이미 가진 것도 바로 적용돼요.'] },
    { v: 103, items: ['마나 회복 물약이 즉시 회복 대신 버프로 바뀌었어요. 마시면 10분 동안 MP 자연 회복이 초당 0.5씩 늘어나요. (다시 마시면 남은 시간이 10분으로 · 버프 칸에 표시) 아이템 정보에서 자동 사용을 켜면 버프가 끝날 때 알아서 마셔요.', '아이템에 마우스를 올리면 이름만 보여서 화면을 덜 가려요. 꾹 누르고 있으면 상세 정보가 떠요. (가방·장비 칸은 상세 정보창 · 교환창·창고·상점·도감은 전체 정보 말풍선 · 바닥 아이템은 이름과 등급만)', '이제 게임을 켜면 자동으로 하나뿐인 월드 서버에 접속해서 모두 함께 플레이해요. (방 만들기·참가 없음 · 끊기면 알아서 다시 접속) 누가 접속하면 공지로 알려 주고, 위쪽 [접속 N명] 버튼으로 접속자 목록(직업·레벨·위치)을 보고 바로 파티 초대도 할 수 있어요.', '영웅 등급 아이템은 어디서 누가 얻어도 모두에게 전체 공지로 떠요. (위치 포함 · 공지가 연달아 나와도 빠지지 않게 고침)', '채팅: 파티원 채팅은 다른 지역에 있어도 [파티](지역) 표시와 함께 보여요. 일반 채팅은 같은 지역에만 보이고, 맨 앞에 !를 붙이면 전체 채팅이에요. 채팅 줄은 경험치·골드 메시지에 밀려 금방 사라지지 않게 더 오래 남아요.', '새 메뉴 [연금술]: 같은 등급의 장비 3개를 올리고 조합하면 확률로 한 단계 위 등급의 내 직업 장비를 얻어요. 일반→고급 30% · 고급→희귀 10% · 희귀→영웅 3% · 실패하면 재료 3개가 사라져요. 성공하면 전체 공지로 알려요.', '보스 영웅 장비 드랍률을 낮췄어요. (한 번 잡을 때 약 18% → 셸로브 2% · 거대 여왕개미·오우거 8% · 바포메트 10%)', '보스 등장 시각이 구간 안에서 매번 고르게 바뀌어요. (예전엔 셸로브가 늘 매시 6~7분·36~37분에 나왔어요) 모두 같은 버전이어야 보스 시간이 맞아요.', '다른 사람 화면에서도 초록 물약·용기의 물약 가속과 공격 속도가 공격 동작에 반영돼요. (예전엔 상대 화면에서 늘 기본 속도로 보여서 느려 보였어요)', '월드맵으로 사냥터에 이동하면 1,000 골드가 들어요. (골드가 모자라면 이동 안 됨 · 자동사냥 복귀·포털·귀환 주문서는 그대로 무료)', '자동사냥 설정에서 줄의 빈 곳이나 글자를 눌러도 체크가 바뀌지 않아요. 체크박스를 직접 눌러야 켜지고 꺼져요.', 'PC 실행 파일에 관찰 기록기가 들어갔어요. 플레이 상태(레벨·경험치·골드·사냥터·사망·보스 드랍·강화·오류 등)를 게임 폴더 logs 에 기록하고 10분마다 게임 창만 캡처해서, 밸런스·버그 점검 리포트에 써요. (이 PC에만 저장 · 채팅 내용은 기록하지 않아요) 이번 업데이트 후 게임이 한 번 다시 켜져요.'] },
    { v: 102, items: ['보스 몬스터(셸로브·거대 여왕개미·오우거·바포메트)는 2분 동안 아무도 피해를 주지 못하면 체력을 회복해요. 초당 최대 HP의 2%씩 차오르고, 다 차면 그동안의 공헌도도 초기화돼요. 공격을 다시 맞히면 회복이 바로 멈춰요.', '보스의 마법(범위 기술) 피해가 50% 올랐어요. 셸로브 거미줄, 거대 여왕개미 산성·땅 울림, 오우거 내려찍기·바위, 바포메트 도끼·지옥불이 해당돼요. (MR로 줄일 수 있어요)', '기사 기술 스턴의 MP 소모량이 3에서 5로 늘었어요.'] },
    { v: 101, items: ['버그베어밭 몬스터 6종이 정식 그림으로 바뀌었어요. 누렇게 바랜 해골 궁수, 썩은 좀비, 대머리에 배 나온 거인 버그베어(가시 몽둥이), 쇠 투구를 쓴 짙은 갈색의 킹 버그베어, 용암이 끓는 지옥견 켈베로스, 양날 대도끼를 든 염소 머리 마왕 바포메트예요.', '메시지 창 정리: 물약 마시는 메시지, 몬스터를 쓰러뜨린 메시지, 일반·고급 아이템이 떨어졌다는 메시지는 더 이상 뜨지 않아요. 주운 아이템과 경험치·골드 획득 메시지는 그대로 떠요. (희귀·영웅 아이템은 떨어질 때도 알려 줘요)'] },
    { v: 100, items: ['새 사냥터 [버그베어밭] (Lv 20~30)이 열렸어요. 월드맵에서 입장하세요. 핏자국과 시체, 해골 더미, 꼬챙이, 교수대 우리가 널린 어둡고 끔찍한 살육의 땅이에요. (전용 배경음)', '1구간 (Lv 20~25): 멀리서 먼저 활을 쏘는 해골 궁수, 느리지만 질긴 좀비, 버그베어가 나와요. 해골과 좀비는 언데드라 밤에 더 강해져요.', '2구간 (Lv 25~30): 버그베어, 물리면 화상을 입는 켈베로스, 먼저 덤비는 킹 버그베어가 나와요. 보스 바포메트는 잡히면 약 3시간 30분 뒤 다시 나타나요. 도끼 휘두르기, 지옥불, 하수인 소환, 공포의 울부짖음을 써요. 바포메트의 지팡이와 영웅 장비(아크메이지의 지팡이·암살자의 단검)를 떨어뜨려요.', '버그베어와 킹 버그베어는 갑옷·무기 마법 주문서를 다른 몬스터보다 잘 떨어뜨려요.', '성장 속도 조정: Lv 10까지는 그대로고, 그 뒤로 필요 경험치가 점점 늘어나요. (Lv 20대는 레벨당 몬스터 약 110~300마리) 지금 레벨은 그대로예요.', '몬스터 난이도: Lv 15 이상 몬스터의 HP가 25%, 공격력이 20% 올랐어요.', '전투 계산 변경: 방어력(AC)이 아무리 좋아도 몬스터 명중률이 30% 아래로 내려가지 않아요. (AC 1당 1%) AC 피해 감소는 고정값 대신 매번 0~(−AC÷3) 무작위예요. 몬스터 마법(파이어볼, 보스 범위기)은 AC를 무시하고 MR로만 줄어요. (MR 1당 0.5%, 최대 50%)', '강화 빛: 안전 강화를 넘긴 장비가 빛나요. (+1 초록 → +2 파랑 → +3 보라 → 그 이상은 반짝이는 강한 보라) 무기와 방어구 모두 캐릭터 외형에 보이고, 다른 유저 화면에도 보여요.', '자동사냥 자동판매: 설정에서 켜면 가방 무게가 정한 비율(기본 80%)을 넘을 때 귀환해서, 고른 등급의 장비를 아덴상단에 한꺼번에 팔고 돌아가요. 착용·잠금·강화된 장비와 물약·주문서는 팔지 않아요.', '잡화상점 [특별] 탭에 아르카의 마법주머니(10,000골드)를 팔아요. 열면 강화·축복 주문서나 모든 직업의 희귀~영웅 장비 중 하나가 나와요. 영웅 장비가 나오면 접속한 모두에게 공지가 떠요.', '인벤토리에 휴지통이 생겼어요. 아이템을 끌어다 놓으면 삭제할지 한 번 더 물어봐요. (착용·잠금 아이템은 삭제 불가)', '스킬 슬롯: 단축키 칸이나 스킬 상자에서 스킬을 꾹 누르거나 오른쪽 클릭하면 스킬 정보가 떠요. [자동 사용]을 켜면 버프는 끝날 때 다시 걸고, 회복은 HP 50% 이하일 때, 스턴과 에너지 볼트는 사냥 중 재사용될 때마다 써요. 자동 사용 중인 스킬에는 작은 A 표시가 붙어요.'] },
    { v: 99, items: ['교환창에서 아이템 정보 팝업이 교환창 뒤에 가려지던 문제를 고쳤어요.', '펫 목걸이의 아이템 정보에서 [펫 소환하기]·[펫 보관하기]로 어디서든 펫을 꺼내고 넣을 수 있어요. (쓰러졌으면 부활 주문서로 되살리기)', '장비 상세 정보에서 강화 수치를 임의로 넣어 볼 수 있어요. (+0·+4·+6·+7·+9 · ± 버튼) 착용 중인 장비도 같은 강화로 맞춰 비교해 줘요.', '가방 무게가 80% 이상이면 이동이 20% 느려지고, 100% 이상이면 절반으로 느려져요. 넘을 때 "가방이 무겁습니다" 경고가 떠요.', '자동사냥: 최근 나를 공격한 몬스터(멀리서 쏘는 다크엘프·오크마법사 포함)를 가장 먼저 잡아요. 지금 잡던 몹이 나를 안 때리는데 다른 몹이 때리면 바로 갈아타요.', '미니맵에 같은 지역 파티원 위치가 초록 점으로 보여요.', '업데이트를 더 안정적으로 받아요. (방금 나온 업데이트도 바로 받을 수 있게)'] },
    { v: 98, items: ['인벤토리에서 아이템을 끌어서 자리를 바꿀 수 있어요. (다른 아이템 위에 놓으면 서로 바뀌고, 빈 칸에 놓으면 맨 뒤로)', '교환창 가방·올린 물건에 마우스를 올리면 아이템 정보(이름·강화·옵션)가 보이고, 아이콘에 강화 수치(+7 등)가 표시돼요.', '게임 중 업데이트로 다시 접속돼도 소환해 둔 펫이 그대로 따라와요.', '화면 위의 [마을로 귀환] 버튼을 없앴어요. (귀환 주문서나 월드맵의 마을을 이용해 주세요)'] },
    { v: 97, items: ['펫이 체력 물약을 내 가방에서 같이 먹어요. (펫 HP 50% 아래 · 펫 가방에 따로 넣을 필요 없음)', '펫 가방에는 가속 물약만 넣어요. 넣어 두면 펫이 따로 먹어요. (예전에 넣어 둔 체력 물약은 먼저 먹고, 칸을 눌러 꺼낼 수도 있어요)'] },
    { v: 96, items: ['보스(셸로브·여왕개미·오우거)가 모든 사람에게 같은 시각·같은 자리에 나타나고, 등장·토벌 공지도 모두에게 보여요. 누가 잡으면 모두의 화면에서 사라져요.', '버프 남은 시간이 10초 이하가 되면 아이콘에 10, 9, 8… 숫자로 보여요. (파티창도)'] },
    { v: 95, items: ['교환: 마을에서 다른 유저를 클릭 → [교환 신청] → 상대가 수락하면 교환창이 열려요.', '각자 가방의 아이템(여러 개는 수량 지정)과 골드를 올리고 [확인] → 둘 다 확인하면 "교환하시겠습니까?"에서 한 번 더 확인하면 주고받아요.', '확인한 뒤 누구든 항목을 바꾸면 확인이 풀려서 다시 확인해야 해요. (착용 중·잠금 아이템은 교환 불가)'] },
    { v: 94, items: ['업데이트가 적용되면 바뀐 내용을 이 창으로 알려줘요. (ESC 메뉴 → 업데이트 소식에서 다시 볼 수 있어요)'] },
    { v: 93, items: ['모든 지역의 2구간에서도 자동사냥이 돼요. 마을에 다녀오면 사냥하던 구간으로 돌아가요.', '자동사냥 타겟팅 설정: 자율 공격 · 파티원과 같은 몬스터 · 파티원과 다른 몬스터', '새 버전이 나오면 화면 위에 [업데이트] 버튼이 생겨요. 누르면 그 자리·파티·멀티 방 그대로 이어서 플레이해요.', '파티창에 파티원의 버프(가속·실드·인챈트 등)와 남은 시간이 보여요.'] },
    { v: 92, items: ['ESC 메뉴에서 배경음·효과음 볼륨을 따로 조절할 수 있어요.', '소리 설정이 저장돼요. (같은 계정이면 다른 PC에서도 그대로)'] },
    { v: 90, items: ['강화 시도 이펙트가 주변 사람들에게도 보여요. +7 이상 성공·증발은 근처 채팅창에도 알려줘요.'] },
    { v: 89, items: ['자동사냥이 실제 걸음 수 기준으로 가장 가까운 몹부터 잡아요. 가는 중에 더 가까운 몹이 보이면 갈아타요.'] },
    { v: 88, items: ['계정·캐릭터가 서버에 저장돼요. 어느 PC에서든 같은 계정으로 접속하면 키우던 캐릭터 그대로 이어서 해요.', '20초마다 자동 저장 · ESC 메뉴 [지금 저장하기]'] },
    { v: 87, items: ['파티: 다른 유저 클릭 → 파티 초대 · 파티 사냥 시 공헌도(딜·힐·버프)대로 경험치·골드 분배 + 10% 보너스', '드랍 아이템 5초 우선권 (공헌도 비율대로)', '로그인 화면 업데이트 버튼'] },
  ];
  const esc = t => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  const seen = () => { try { return +localStorage.getItem(KEY) || 0; } catch (e) { return 0; } }, mark = () => { try { localStorage.setItem(KEY, String(GAME_VER)); } catch (e) {} };
  function show(from, title) { const w = $('notewin'); if (!w) return; const L = LIST.filter(n => n.v > from && n.v <= GAME_VER).slice(0, 6); if (!L.length) return;
    $('note-t').textContent = title || `업데이트 소식 · v${GAME_VER}`;
    $('note-body').innerHTML = L.map((n, k) => `<section class="${k ? '' : 'new'}"><h3>v${n.v}${k ? '' : ' <span>NEW</span>'}</h3><ul>${n.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>`).join('');
    w.hidden = false; mark(); setTimeout(() => $('note-ok') && $('note-ok').focus(), 50); }
  const close = () => { const w = $('notewin'); if (w) w.hidden = true; };
  { const w = $('notewin'); if (w) { $('note-ok').onclick = close; w.querySelector('[data-close]').onclick = close; w.addEventListener('keydown', ev => { if (ev.key === 'Escape' || ev.key === 'Enter') { ev.preventDefault(); close(); } ev.stopPropagation(); }); w.addEventListener('pointerdown', ev => { if (ev.target === w) close(); }); } }
  // 접속할 때: 전에 본 버전보다 올라갔으면 그 사이 소식을 보여 줌 (처음 설치한 사람은 조용히 현재 버전으로 기록)
  const wasOld = (() => { try { return !!(localStorage.getItem('aden_acc') && localStorage.getItem('aden_pname')); } catch (e) { return false; } })();   // 켜질 때(로그인 전) 기준: 예전에 접속한 적 있는 기기
  function onEnter() { const s0 = seen(); if (!s0) { if (wasOld) show(GAME_VER - 1); else mark(); return; } if (s0 < GAME_VER) show(s0); }   // 이 기능 전부터 하던 사람은 이번 소식부터 보여 줌
  return { onEnter, showAll: () => show(GAME_VER - 10, '업데이트 소식 (최근)') }; })();
// ============================================================ PC 멀티 (실행 파일·로컬 파일용): 방 코드로 친구와 연결
// 인터넷 공용 MQTT 서버(웹소켓)에 방 코드 주제로 내 상태를 10번/초 올리고 같은 방 사람 상태를 받음 — 포트 열기·설치 필요 없음. 테스트용(공용 서버라 내용이 암호화되지 않음)
const MQ = (() => {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const str = t => { const b = enc.encode(t); return [b.length >> 8, b.length & 255, ...b]; };
  const vlen = n => { const o = []; do { let b = n % 128; n = Math.floor(n / 128); if (n > 0) b |= 128; o.push(b); } while (n > 0); return o; };
  const pkt = (h, body) => new Uint8Array([h, ...vlen(body.length), ...body]);
  function connect(url, clientId, onMsg, onState) { const ws = new WebSocket(url, ['mqtt']); ws.binaryType = 'arraybuffer'; let buf = new Uint8Array(0), pid = 1, ok = false, ping = 0;
    const send = u8 => { if (ws.readyState === 1) ws.send(u8); };
    ws.onopen = () => send(pkt(0x10, [...str('MQTT'), 4, 0x02, 0, 60, ...str(clientId)]));
    ws.onmessage = ev => { const add = new Uint8Array(ev.data), nb = new Uint8Array(buf.length + add.length); nb.set(buf); nb.set(add, buf.length); buf = nb;
      for (;;) { if (buf.length < 2) break; let mul = 1, len = 0, i = 1, b; do { if (i >= buf.length) return; b = buf[i++]; len += (b & 127) * mul; mul *= 128; } while (b & 128); if (buf.length < i + len) break;
        const h = buf[0], body = buf.subarray(i, i + len); buf = buf.slice(i + len); const type = h >> 4;
        if (type === 2) { ok = body[1] === 0; onState(ok ? 'open' : 'refused'); if (ok) ping = setInterval(() => send(new Uint8Array([0xC0, 0])), 30000); }
        else if (type === 3) { const tl = (body[0] << 8) | body[1], topic = dec.decode(body.subarray(2, 2 + tl)); let p = 2 + tl; if ((h >> 1) & 3) p += 2; try { onMsg(topic, dec.decode(body.subarray(p))); } catch (e) {} } } };
    ws.onclose = () => { clearInterval(ping); onState(ok ? 'closed' : 'failed'); ok = false; }; ws.onerror = () => {};
    return { sub: t => send(pkt(0x82, [pid >> 8, pid++ & 255, ...str(t), 0])), pub: (t, msg) => send(pkt(0x30, [...str(t), ...enc.encode(msg)])), close: () => { try { send(new Uint8Array([0xE0, 0])); ws.close(); } catch (e) {} }, isOpen: () => ok }; }
  return { connect };
})();
const MPP = (() => {
  // 공용 MQTT 서버 (앞에서부터 시도) — window.ADEN_MQTT 로 바꿀 수 있음 (시험·자체 서버)
  const BROKERS = () => window.ADEN_MQTT ? [window.ADEN_MQTT] : ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];
  const $ = id => document.getElementById(id), CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', WORLD = window.ADEN_WORLD || 'WORLD1';   // 모든 PC가 같은 방(월드 서버) 하나에 접속
  let want = false, nextTry = 0;
  let cli = null, code = null, myId = null, mine = {}, others = new Map(), sendT = 0, state = 'off', tries = 0, timer = 0;
  const base = () => 'adenworld/w1/' + code.toLowerCase();
  const room = { presence: async patch => { mine = { ...mine, ...patch }; for (const k in patch) if (patch[k] === null) delete mine[k]; const now = performance.now(); if (cli && cli.isOpen() && now - sendT >= 95) { sendT = now; cli.pub(base() + '/p/' + myId, JSON.stringify(mine)); } },
    peers: () => { const now = Date.now(); for (const [k, o] of others) if (now - o.at > 6000) others.delete(k); return [{ peer: myId, isMe: true, sameTab: true, presence: mine }, ...[...others.values()].map(o => ({ peer: o.peer, isMe: false, sameTab: false, presence: o.presence }))]; },
    connected: () => !!cli && cli.isOpen() };
  function msg(t, ok) { const m = $('mp-msg'); if (m) { m.textContent = t; m.className = 'nm-msg ' + (ok ? 'ok' : 'no'); } render(); }
  function render() { const n = NET.count(), on = state === 'on' || NET.hasArtRoom(); const b = $('btn-mp'); if (b) b.textContent = on ? `접속 ${n}명` : '서버 연결 중…'; const w = $('mpwin'); if (!w || w.hidden) return;
    $('mp-status').textContent = on ? `월드 서버 · ${n}명 접속 중` : state === 'connecting' ? '월드 서버에 연결하는 중…' : '연결 대기 중 (자동으로 다시 시도해요)';
    const pid = NET.partyId(), me = { n: PNAME(), c: CLASS, lv: hero.lv, z: null, me: 1 }, L = [me, ...NET.others().map(o => ({ ...o.pr, peer: o.peer }))], E = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    $('mp-list').innerHTML = on ? L.map(p => { const pm = !p.me && pid && p.pt === pid; return `<div class="mp-pl${p.me ? ' me' : ''}"><b style="color:${p.me ? '#ffffff' : pm ? '#8fe08a' : '#a8d8ff'}">${pm ? '[파티] ' : ''}${E(p.n)}${p.me ? ' (나)' : ''}</b><span>${E(CLASS_NAME[p.c] || '')} Lv.${p.lv | 0}</span><span class="mp-z">${E(zoneTitle(p.z))}</span>${p.me || pm ? '<i></i>' : `<button type="button" class="mp-sm" data-inv="${E(p.peer)}">파티 초대</button>`}</div>`; }).join('') : '';
    $('mp-list').querySelectorAll('[data-inv]').forEach(x => x.onclick = () => NET.invite(x.dataset.inv)); }
  function start(c) { code = c; myId = 'w' + Math.random().toString(36).slice(2, 10); others.clear(); state = 'connecting'; tries = 0; render(); tryBroker(); }
  function tryBroker() { const L = BROKERS(); if (tries >= L.length) { state = 'off'; nextTry = performance.now() + 15000; msg('월드 서버에 연결하지 못했어요. 15초 뒤 다시 시도해요. (인터넷 연결을 확인해 주세요)', false); return; }
    const url = L[tries++]; msg(`서버 ${tries}/${L.length}에 연결하는 중…`, true); clearTimeout(timer); timer = setTimeout(() => { if (state === 'connecting') { try { cli && cli.close(); } catch (e) {} cli = null; tryBroker(); } }, 6000);
    cli = MQ.connect(url, myId + '_' + Math.random().toString(36).slice(2, 6), (topic, text) => { const id = topic.split('/').pop(); if (id === myId) return; let pr; try { pr = JSON.parse(text); } catch (e) { return; } if (!pr || typeof pr !== 'object') return; others.set(id, { peer: id, presence: pr, at: Date.now() }); },
      st => { if (st === 'open') { clearTimeout(timer); state = 'on'; cli.sub(base() + '/p/+'); NET.setRoom(room); msg('', true); say('***** 월드 서버에 접속했습니다 *****', '#8fe08a'); }
        else if (st === 'failed' && state === 'connecting') { clearTimeout(timer); tryBroker(); }
        else if (st === 'closed' && state === 'on') { NET.setRoom(null); state = 'off'; nextTry = performance.now() + 3000; msg('서버 연결이 끊겼어요. 잠시 뒤 자동으로 다시 접속해요.', false); say('월드 서버 연결이 끊겼습니다. 다시 접속하는 중…', '#f08a7a'); } }); }
  function leave() { clearTimeout(timer); if (cli) cli.close(); cli = null; NET.setRoom(null); others.clear(); if (state !== 'off') say('멀티플레이 방에서 나왔습니다.', '#9c9682'); state = 'off'; msg('', true); }
  function open() { const w = $('mpwin'); if (!w) return; w.hidden = !w.hidden; render(); }
  function autoJoin() { if (!window.__gameOn || NET.hasArtRoom() || /[?&]mp=bc/.test(location.search) || state !== 'off' || performance.now() < nextTry) return; want = true; start(WORLD); }
  setInterval(autoJoin, 1000);
  // 아티팩트(claude.ai)에서는 room이 있어 자동 멀티 — 버튼은 PC 실행 파일·로컬 파일에서만
  setTimeout(() => { const b = $('btn-mp'); if (b) { b.hidden = false; b.onclick = open; } const e = $('esc-mp'); if (e) { e.hidden = false; e.onclick = () => { window.escMenu && escMenu(false); open(); }; } }, 1500);
  setInterval(render, 1000);
  return { open, leave, start, state: () => state, code: () => (state !== 'off' ? code : null) };
})();
// 직업 적용: 처음 접속할 때(새 상태) 한 번 — 다른 직업으로 바꿀 땐 페이지를 새로 불러 깨끗한 상태에서 적용
function applyClass(cls, name) { CLASS = cls; const C = CLS_DEF[cls]; hero.pname = name; hero.lv = 1; hero.exp = 0; hero.baseHP = C.hp; hero.baseMP = C.mp; hero.bonusPts = 0; coins = 100;
  LEARNED.clear(); for (const k in SKCD) delete SKCD[k]; for (const k in BUFF) BUFF[k] = 0; INV.setClass(cls); hero.hp = hero.max; hero.mp = hero.maxmp; hero.target = null; hero.atk = null; }
// ============================================================ 계정: 게임을 켜면 맨 처음 계정·비밀번호 → 캐릭터 선택(기사·요정·마법사)
// 서버(아티팩트 공유 DB) accounts/<계정> = { acc, salt, hash(PBKDF2-SHA256), chars:{knight,elf,wizard} } — 비밀번호 원문은 저장하지 않음. 서버가 없으면(PC 파일) 이 기기에만 저장
const ACCOUNT = (() => {
  const $ = id => document.getElementById(id), RE = /^[a-zA-Z0-9]{4,16}$/;
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  let db, acc = null, chars = {}, mode = 'login', busy = false, sel = null, started = false, raf = 0, srv = 'legacy';   // srv: 'cloud' = 계정 서버(Firebase) · 'legacy' = 예전 방식(아티팩트 DB/이 기기)
  const hex = s => [...new TextEncoder().encode(s.toLowerCase())].map(b => b.toString(16).padStart(2, '0')).join('');
  async function conn() { if (db !== undefined) return db; db = null; try { if (window.claude && claude.use) db = await claude.use('db'); } catch (e) { db = null; } return db; }
  const rnd = n => { try { return [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join(''); } catch (e) { return Array.from({ length: n * 2 }, () => Math.floor(Math.random() * 16).toString(16)).join(''); } };
  async function hashPw(pw, salt) { try { const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']); const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 100000 }, k, 256); return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join(''); }
    catch (e) { let h = 2166136261 >>> 0; const t = salt + ':' + pw; for (let r = 0; r < 4000; r++) for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i) + r; h = Math.imul(h, 16777619) >>> 0; } return 'f' + h.toString(16); } }
  const localAll = () => { try { return JSON.parse(store.get('aden_accounts') || '{}'); } catch (e) { return {}; } };
  async function load(a) { const d = await conn(), loc = localAll()[a.toLowerCase()] || null; if (!d) return loc; try { const sn = await d.doc('accounts/' + hex(a)).get(); return sn.exists ? sn.data() : loc; } catch (e) { return loc; } }
  async function saveChars(a, ch) { if (srv === 'cloud' && CLOUD.on()) { await CLOUD.set(`users/${CLOUD.uid()}`, { chars: JSON.stringify(ch) }, true); return; } const L = localAll(), r = L[a.toLowerCase()]; if (r) { r.chars = ch; store.set('aden_accounts', JSON.stringify(L)); } const d = await conn(); if (!d || r) return; try { await d.doc('accounts/' + hex(a)).update({ chars: ch }); } catch (e) {} }
  async function createLegacy(a, pw) { const d = await conn(); if (await load(a)) return { ok: false, msg: '이미 있는 계정입니다. 다른 계정 이름을 써 주세요.' };
    const salt = rnd(12), r = { acc: a, salt, hash: await hashPw(pw, salt), chars: {}, at: Date.now() };
    let saved = false; if (d) { try { const ref = d.doc('accounts/' + hex(a)), lease = await ref.acquire({ holder: 'mk_' + rnd(6), ttlMs: 5000 }); if (!lease.acquired) return { ok: false, msg: '지금 다른 사람이 이 계정을 만드는 중이에요. 다른 이름을 써 주세요.' };
      const sn = await ref.get(); if (sn.exists) return { ok: false, msg: '이미 있는 계정입니다. 다른 계정 이름을 써 주세요.' }; await ref.set(r); saved = true; } catch (e) { saved = false; } }
    if (!saved) { r.local = 1; const L = localAll(); L[a.toLowerCase()] = r; store.set('aden_accounts', JSON.stringify(L)); }   // 서버에 쓸 권한이 없으면(보기 권한으로 공유받은 친구) 이 브라우저에 저장
    return { ok: true, chars: {} }; }
  const FBMSG = e => ({ EMAIL_EXISTS: '이미 있는 계정입니다. 다른 계정 이름을 써 주세요.', TOO_MANY_ATTEMPTS_TRY_LATER: '로그인 시도가 너무 많아요. 잠시 뒤에 다시 해 주세요.', USER_DISABLED: '사용이 중지된 계정입니다.' })[e && e.code] || null;
  async function create(a, pw) { if (window.ADEN_DEMO || !(await CLOUD.ping())) { srv = 'legacy'; return createLegacy(a, pw); } srv = 'cloud';
    try { await CLOUD.signUp(a, pw); } catch (e) { return { ok: false, msg: FBMSG(e) || '계정을 만들지 못했어요. (' + e.message + ')' }; }
    await CLOUD.set(`users/${CLOUD.uid()}`, { acc: a, chars: '{}', store: '[]', at: String(Date.now()) }); return { ok: true, chars: {} }; }
  async function login(a, pw) { if (window.ADEN_DEMO || !(await CLOUD.ping())) { srv = 'legacy'; return loginLegacy(a, pw); } srv = 'cloud';
    try { await CLOUD.signIn(a, pw); const d = await CLOUD.get(`users/${CLOUD.uid()}`); if (!d) await CLOUD.set(`users/${CLOUD.uid()}`, { acc: a, chars: '{}', store: '[]', at: String(Date.now()) }); let ch = {}; try { ch = JSON.parse((d && d.chars) || '{}'); } catch (e) {} return { ok: true, chars: ch }; }
    catch (e) { if (FBMSG(e)) return { ok: false, msg: FBMSG(e) }; if (!/INVALID_LOGIN_CREDENTIALS|EMAIL_NOT_FOUND|INVALID_PASSWORD/.test(e.message)) return { ok: false, msg: '서버에 연결하지 못했어요. (' + e.message + ')' }; }
    // 서버가 생기기 전에 만든 계정(이 기기/아티팩트 DB)이면 같은 비밀번호로 서버에 옮김 — 캐릭터 이름·이 기기 저장도 함께
    const r = await load(a); if (!r) return { ok: false, msg: '없는 계정이거나 비밀번호가 맞지 않습니다.' }; if ((await hashPw(pw, r.salt)) !== r.hash) return { ok: false, msg: '비밀번호가 맞지 않습니다.' };
    try { await CLOUD.signUp(a, pw); } catch (e) { return { ok: false, msg: e.code === 'EMAIL_EXISTS' ? '비밀번호가 맞지 않습니다.' : '계정을 서버로 옮기지 못했어요. (' + e.message + ')' }; }
    const ch = r.chars || {}, low = a.toLowerCase(); await CLOUD.set(`users/${CLOUD.uid()}`, { acc: a, chars: JSON.stringify(ch), store: store.get('aden_store_' + low) || '[]', at: String(Date.now()) });
    for (const c in ch) { try { await CLOUD.create('names/' + hex(ch[c]), { uid: CLOUD.uid(), name: ch[c], cls: c, at: String(Date.now()) }); const v = store.get('aden_save_' + low + '_' + c); if (v) await CLOUD.set(`users/${CLOUD.uid()}/chars/${c}`, { name: ch[c], data: v, ver: String(GAME_VER), at: String(Date.now()) }); } catch (e) {} }
    return { ok: true, chars: ch, moved: true }; }
  async function loginLegacy(a, pw) { const r = await load(a); if (!r) return { ok: false, msg: '없는 계정입니다. 아래 \'새 계정 만들기\'로 먼저 만들어 주세요.' }; if ((await hashPw(pw, r.salt)) !== r.hash) return { ok: false, msg: '비밀번호가 맞지 않습니다.' }; return { ok: true, chars: r.chars || {} }; }
  const msg = (t, ok) => { const m = $('lg-msg'); if (m) { m.textContent = t; m.className = 'nm-msg ' + (ok ? 'ok' : 'no'); } };
  function setMode(m) { mode = m; $('lg-pw2-row').hidden = m !== 'new'; $('lg-go').textContent = m === 'new' ? '계정 만들기' : '접속'; $('lg-mode').textContent = m === 'new' ? '이미 계정이 있어요 · 로그인으로' : '처음이신가요? 새 계정 만들기'; $('lg-sub').textContent = m === 'new' ? '사용할 계정과 비밀번호를 정해 주세요' : '계정과 비밀번호를 입력해 주세요'; $('lg-pw').autocomplete = m === 'new' ? 'new-password' : 'current-password'; msg('', true); }
  async function submit(ev) { if (ev) ev.preventDefault(); if (busy) return; const a = $('lg-acc').value.trim(), pw = $('lg-pw').value;
    if (!RE.test(a)) { msg('계정은 영문·숫자 4~16자로 입력해 주세요.', false); return; } if (pw.length < 4) { msg('비밀번호는 4자 이상으로 입력해 주세요.', false); return; }
    if (mode === 'new' && pw !== $('lg-pw2').value) { msg('비밀번호 확인이 맞지 않습니다.', false); return; }
    busy = true; $('lg-go').disabled = true; msg(mode === 'new' ? '계정을 만드는 중…' : '접속하는 중…', true); let r;
    try { r = mode === 'new' ? await create(a, pw) : await login(a, pw); } catch (e) { r = { ok: false, msg: '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' }; }
    busy = false; $('lg-go').disabled = false; if (!r.ok) { msg(r.msg, false); return; }
    acc = a; chars = r.chars || {}; store.set('aden_acc', a); $('lg-pw').value = ''; $('lg-pw2').value = ''; $('loginscr').hidden = true; openSel(false); if (r.moved) csMsg('예전 계정을 계정 서버로 옮겼어요. 이제 어느 PC에서든 이어서 할 수 있어요.', true); }
  const csMsg = (t, ok) => { const m = $('cs-msg'); if (m) { m.textContent = t || ''; m.className = 'nm-msg ' + (ok ? 'ok' : 'no'); } };
  // 캐릭터 선택: 직업 카드 3장 (만든 캐릭터는 이름, 없으면 새로 만들기) · 그림은 대기 동작
  function openSel(fromGame) { $('charsel').hidden = false; $('cs-acc').textContent = acc || '-'; if (!sel) sel = started ? CLASS : (['knight', 'elf', 'wizard'].find(c => chars[c]) || 'knight'); render(); if (!raf) raf = requestAnimationFrame(anim); }
  function render() { document.querySelectorAll('#charsel .cs-card').forEach(c => { const cls = c.dataset.cls, ch = chars[cls]; c.classList.toggle('on', sel === cls); c.classList.toggle('new', !ch);
      c.querySelector('.cs-ch').textContent = ch ? ch + (started && CLASS === cls ? ` · Lv.${hero.lv} · 접속 중` : '') : '새 캐릭터 만들기'; });
    const b = $('cs-start'); b.textContent = !chars[sel] ? '캐릭터 만들기' : started && sel === CLASS ? '게임으로 돌아가기' : '게임 시작'; }
  function anim(ts) { raf = 0; const w = $('charsel'); if (!w || w.hidden) return; const fr = Math.floor(ts / 1000 * 6) % 8;
    document.querySelectorAll('#charsel .cs-card canvas').forEach(cv2 => { const g = cv2.getContext('2d'), cls = cv2.parentNode.dataset.cls; g.clearRect(0, 0, cv2.width, cv2.height);
      const gr = g.createRadialGradient(cv2.width / 2, cv2.height - 16, 2, cv2.width / 2, cv2.height - 16, 50); gr.addColorStop(0, 'rgba(255,220,150,.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, cv2.width, cv2.height);
      g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(cv2.width / 2, cv2.height - 14, 26, 7, 0, 0, 7); g.fill();
      g.save(); g.translate(cv2.width / 2, cv2.height - 14); g.scale(1.25, 1.25); if (cls === 'knight') drawKnightPortrait(g, fr); else drawHeroSprite(g, 'idle', fr, 1, 0, 0, null, cls); g.restore(); });
    raf = requestAnimationFrame(anim); }
  function drawKnightPortrait(g, fr) { const sc = KN.s || 1; for (const L of ['body', 'shirt', 'sword', 'shield']) { const img = klImg(L, 'idle'), M = KLM[L] && KLM[L].idle; if (!img || !M || !img.complete || !img.naturalWidth) continue; g.imageSmoothingEnabled = true; g.drawImage(img, Math.min(fr, M.n - 1) * M.W, 1 * M.H, M.W, M.H, Math.round(-M.ax * sc), Math.round(-M.ay * sc), M.W * sc, M.H * sc); } }
  function start() { if (!sel) return; const ch = chars[sel];
    if (!ch) { $('charsel').hidden = true; NAMEREG.show(sel, async n => { chars = { ...chars, [sel]: n }; try { await saveChars(acc, chars); } catch (e) {} begin(sel, n); }, () => openSel(started)); return; }
    begin(sel, ch); }
  async function begin(cls, name) {
    if (started && cls === CLASS) { $('charsel').hidden = true; return; }
    if (started) { INV.askYesNo(`${name}(${CLASS_NAME[cls]})(으)로 바꿀까요?`, '지금 캐릭터를 저장한 뒤 게임을 새로 불러옵니다.', async () => { await SAVE.now(true, true);
        try { sessionStorage.setItem('aden_boot', JSON.stringify({ acc, cls, name, chars, srv, fb: CLOUD.session() })); location.reload(); } catch (e) { location.reload(); } }); return; }
    const b = $('cs-start'); if (b) b.disabled = true; csMsg('캐릭터 정보를 불러오는 중…', true); const sv = await SAVE.load(cls), st = await SAVE.loadStore(); if (b) b.disabled = false;
    if (sv === undefined) { csMsg('서버에서 캐릭터 정보를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.', false); $('charsel').hidden = false; return; }   // 불러오기 실패한 채로 시작하면 새 캐릭터로 덮어쓸 수 있어서 막음
    csMsg(''); $('charsel').hidden = true; applyClass(cls, name); started = true; window.__gameOn = true; store.set('aden_pname', name); const got = SAVE.apply(sv); TOWN.goTown(); SAVE.start(cls, st); setTimeout(() => UPD.check(), 3000); setTimeout(() => NOTES.onEnter(), 1200);
    if (got) { say(`***** ${name}님, 다시 오신 것을 환영합니다! (Lv.${hero.lv} · 골드 ${coins.toLocaleString()}) *****`, '#f2e6a8'); say(srv === 'cloud' ? '계정 서버에 저장된 진행 상황을 불러왔습니다. 20초마다 자동 저장돼요.' : '이 기기에 저장된 진행 상황을 불러왔습니다.', '#9fd08a'); return; }
    say(`***** ${name}님(${CLASS_NAME[cls]}), 아덴 월드에 오신 것을 환영합니다! *****`, '#f2e6a8'); if (srv === 'cloud') say('진행 상황은 계정 서버에 20초마다 자동 저장돼요. 다른 PC에서 같은 계정으로 접속해도 이어서 할 수 있어요.', '#9fd08a'); else say('지금은 계정 서버에 연결되지 않아 이 기기에만 저장돼요.', '#f0c080');
    if (cls === 'elf') say('요정: 활로 멀리서 공격합니다. 화살은 잡화상점에서 살 수 있어요.', '#9fd0e8'); else if (cls === 'wizard') say('마법사: 지팡이로 가까이에서 때리고, 멀리서는 마법으로 공격합니다. 마법상점에서 마법서를 배울 수 있어요.', '#9fd0e8'); }
  async function logout() { try { sessionStorage.removeItem('aden_boot'); } catch (e) {} if (started) { await SAVE.now(true, true); location.reload(); return; } CLOUD.out(); acc = null; chars = {}; sel = null; $('charsel').hidden = true; $('loginscr').hidden = false; setMode('login'); }
  { const f = $('lg-form'); if (f) { f.addEventListener('submit', submit); f.addEventListener('keydown', ev => ev.stopPropagation()); $('lg-mode').onclick = () => setMode(mode === 'new' ? 'login' : 'new');
      document.querySelectorAll('#charsel .cs-card').forEach(c => { c.onclick = () => { sel = c.dataset.cls; render(); }; c.ondblclick = () => { sel = c.dataset.cls; start(); }; });
      $('cs-start').onclick = start; $('cs-logout').onclick = logout; } }
  // 켤 때: 캐릭터를 바꾸느라 새로 불러온 경우엔 바로 그 캐릭터로, 아니면 로그인 화면
  setTimeout(() => { let boot = null; try { boot = JSON.parse(sessionStorage.getItem('aden_boot') || 'null'); sessionStorage.removeItem('aden_boot'); } catch (e) {}
    let rs = null; try { rs = JSON.parse(localStorage.getItem('aden_resume') || 'null'); localStorage.removeItem('aden_resume'); } catch (e) {}
    if (rs && rs.exp > Date.now() && rs.acc && CLS_DEF[rs.cls]) { acc = rs.acc; chars = rs.chars || {}; srv = rs.srv || 'legacy'; if (rs.fb) CLOUD.restore(rs.fb); sel = rs.cls;   // 게임 중 업데이트 → 다시 켜지면 그 자리에서
      begin(rs.cls, rs.name).then(() => { if (!started) return; const p = rs.pos || {}; if (p.isle && ISLAND.def(p.isle)) TOWN.toZone(p.isle, p.x, p.z); else if (p.scene === 'town') TOWN.placeAt(p.x, p.z);
        if (rs.pt) NET.setParty(rs.pt); if (rs.mp) MPP.start(rs.mp);
        for (const rid of rs.pets || []) { const e = INV.bag().find(x => x.pet && x.pet.rid === rid); if (e && e.pet.state === 'stored') PET.summon(e); } say(`***** 업데이트 완료 (v${GAME_VER}) — 그 자리에서 이어서 플레이합니다 *****`, '#9fd08a'); if (rs.auto) setTimeout(() => { if (!AUTO.on()) AUTO.toggle(); }, 800); }); return; }
    if (boot && boot.acc && CLS_DEF[boot.cls]) { acc = boot.acc; chars = boot.chars || {}; srv = boot.srv || 'legacy'; if (boot.fb) CLOUD.restore(boot.fb); sel = boot.cls; begin(boot.cls, boot.name); return; }
    const w = $('loginscr'); if (!w) return; w.hidden = false; { const sv = $('lg-srv'); if (sv) { if (window.ADEN_DEMO) { sv.textContent = '○ 데모 전용 계정 — 실제 계정 서버와 분리돼 이 데모 페이지에만 저장돼요'; sv.className = 'lg-srv no'; } else { sv.textContent = '계정 서버 확인 중…'; CLOUD.ping().then(ok => { sv.textContent = ok ? '● 계정 서버 연결됨 — 어느 PC에서든 이어서 플레이' : '○ 계정 서버에 연결되지 않음 — 이 기기에만 저장돼요'; sv.className = 'lg-srv ' + (ok ? 'ok' : 'no'); }); } } } const a = store.get('aden_acc'); $('lg-acc').value = a || ''; setMode('login'); setTimeout(() => (a ? $('lg-pw') : $('lg-acc')).focus(), 60); }, 120);
  function keepForUpdate() { if (!started) return false; const pos = { scene: SCENE, isle: ISLE ? ISLE.id : null, x: +hero.x.toFixed(2), z: +hero.z.toFixed(2) };
    const pets = INV.bag().filter(e => e.pet && e.pet.state === 'out').map(e => (e.pet.rid = e.pet.rid || 'p' + Math.random().toString(36).slice(2, 9)));
    try { localStorage.setItem('aden_resume', JSON.stringify({ acc, cls: CLASS, name: PNAME(), chars, srv, fb: CLOUD.session(), pos, auto: AUTO.on(), mp: MPP.code(), pt: NET.partyId(), pets, exp: Date.now() + 180000 })); return true; } catch (e) { return false; } }
  return { acc: () => acc, openSel, started: () => started, mode: () => srv, keepForUpdate };
})();
const AUTO = (() => {
  const C = { retHp: 30, lowPot: true, lowN: 3, buy: true, buyId: 'red_potion', buyN: 30, buyScroll: true, deathBack: true, backHp: 80, noBoss: true, aggrFirst: true,
    buyHaste: false, hasteId: 'green_potion', hasteN: 5, mute: true, tgtMode: 'free', loot: true, lootR: { 일반: true, 고급: true, 희귀: true, 영웅: true }, lootT: { weapon: true, armor: true, acc: true, cons: true, book: true, etc: true },
    sell: false, sellPct: 80, sellR: { 일반: true, 고급: false, 희귀: false, 영웅: false } };   // 자동판매: 가방 무게 sellPct% 이상이면 귀환해서 아덴상단에 고른 등급 장비를 일괄 판매
  const PRICE = { red_potion: 25, orange_potion: 100, return_scroll: 40, arrow: 2, green_potion: 200, brave_potion: 500 };
  // 아이템 줍기: 체크한 등급·종류만, 나를 때리는 몬스터가 없을 때 10칸 안의 가장 가까운 것부터 (못 가는 곳은 3번 시도 후 건너뜀)
  const typeOf = d => d.slot === 'weapon' ? 'weapon' : ['ring', 'amulet'].includes(d.slot) ? 'acc' : d.slot ? 'armor' : d.use === 'learn' ? 'book' : d.use ? 'cons' : 'etc';
  const wantLoot = id => { const d = ITEMS[id]; return !!d && !!C.lootR[d.rar || '일반'] && !!C.lootT[typeOf(d)]; };
  function lootTarget() { if (!C.loot) return null; let b = null, bd = 1e9; for (const d of GROUND.here()) { if ((d._try || 0) >= 3 || GROUND.blocked(d) || !wantLoot(d.id)) continue; const dd = cheb(d.i, d.j, hero.i, hero.j); if (dd > 10 || dd >= bd) continue; bd = dd; b = d; } return b; }
  // 켜면 배경음악·효과음을 끄고, 끄면 원래대로
  let snd = null;
  function muteOn() { if (!C.mute || snd) return; const bb = document.getElementById('btn-bgm'); snd = { bgm: !!bb && bb.getAttribute('aria-pressed') === 'true', sfx: SFX_ON }; if (snd.bgm) bb.click(); SFX_ON = false; if (master) master.gain.value = 0; say('자동사냥 중에는 배경음악·효과음을 끕니다. (끝나면 다시 켜짐)', '#9c9682'); }
  function muteOff() { if (!snd) return; const s0 = snd; snd = null; const bb = document.getElementById('btn-bgm'); if (s0.bgm && bb && bb.getAttribute('aria-pressed') !== 'true') bb.click(); SFX_ON = s0.sfx; applySfxVol(); }
  let state = 'off', wait = 0, selfMove = false, died = false, bought = false, sellGo = false, sellNoT = 0;
  // 자동판매 대상: 착용·잠금·강화(+1 이상)·축복·속성 강화·펫 목걸이·갓 모드 물건을 뺀 '장비'만 (물약·주문서·책·재료는 안 팖), 체크한 등급만
  const sellList = () => INV.bag().filter(e => { const d = ITEMS[e.id]; return !!d && !!d.slot && !e.on && !e.locked && !e.pet && !d.petKind && !((e.en || 0) > 0) && !e.blessed && !e.attr && !GOD_INF(e.id) && !!C.sellR[d.rar || '일반']; });
  const wpc = () => Math.floor(INV.wPct() * 100);
  function autoSell() { const L = sellList(); if (!L.length) { say('자동판매: 조건에 맞는 장비가 없어 팔지 않았습니다.', '#9c9682'); return; } const w0 = wpc(); let tot = 0, n = 0;
    const sold = {}; for (const e of L) { const q = e.n || 1, u = SELL.unit(e); if (INV.sellEntry(e, q)) { tot += u * q; n += q; const r = ITEMS[e.id].rar || '일반'; sold[r] = (sold[r] || 0) + u * q; } } coins += tot; TELE.ev('sell', { auto: 1, n, g: tot, by: sold });
    say(`자동판매(아덴상단): 장비 ${n}개를 팔아 ${tot.toLocaleString()} 골드를 받았습니다. (가방 무게 ${w0}% → ${wpc()}%)`, '#9fe0a0');
    if (AC && SFX_ON) { const t = AC.currentTime; tone(t, 'triangle', 1200, 1600, 0.08, 0.05); tone(t + 0.07, 'triangle', 1600, 2200, 0.1, 0.05); } }
  const inZ1 = () => SCENE === 'field' && ISLE && ISLE.def && (ISLE.def.tier === 1 || ISLE.def.tier === 2);   // 모든 지역의 1·2구간에서 자동사냥 가능
  let home = '이야기섬', homeId = 1;   // 마지막으로 사냥하던 지역 (마을 다녀온 뒤 이 지역 1구간으로 복귀)
  const regionOf = () => (ISLE && ISLE.name || '').replace(/\s*\d구간$/, '') || '이야기섬';
  const pct = () => Math.round(hero.hp / hero.max * 100);
  function goHome(why) { say('자동사냥: ' + why + ' → 마을로 귀환합니다.', '#9fd0e8'); selfMove = true; if (INV.count('return_scroll')) INV.take('return_scroll'); TOWN.goTown(); selfMove = false; state = 'town'; bought = false; wait = 0; }
  function buyAll() { const want = (id, n) => { const p = PRICE[id], k = Math.max(0, Math.min(n - INV.count(id), Math.floor(coins / p))); if (k) { coins -= k * p; INV.add(id, k, true); TELE.ev('buy', { id, q: k, g: k * p, auto: 1 }); } if (k) say(`자동사냥: ${ITEMS[id].name} ${k}개 구입 (-${k * p} 골드)`, '#cfe4a8'); else if (INV.count(id) < n) say(`자동사냥: 골드가 부족해 ${ITEMS[id].name}을(를) 못 샀습니다.`, '#f08a7a'); };
    if (C.buy) want(C.buyId, C.buyN); if (C.buyScroll) want('return_scroll', 2); if (C.buyHaste) want(C.hasteId, C.hasteN); if (CLASS === 'elf') want('arrow', 500); }
  // 실제 걸음 수(나무·바위·물을 돌아가는 길) — 직선으로만 가까운 몹을 가깝다고 착각하지 않게 (22걸음 안)
  function pathDist(R) { const W = 2 * R + 1, D = new Int16Array(W * W).fill(-1), i0 = hero.i - R, j0 = hero.j - R, q = [hero.i, hero.j]; D[R * W + R] = 0;
    for (let h = 0; h < q.length; h += 2) { const i = q[h], j = q[h + 1], d = D[(j - j0) * W + (i - i0)]; if (d >= R) continue;
      for (const [di, dj] of DIRS8) { const ni = i + di, nj = j + dj; if (ni < i0 || nj < j0 || ni >= i0 + W || nj >= j0 + W || !walkable(ni, nj)) continue; if (di && dj && (!walkable(i + di, j) || !walkable(i, j + dj))) continue;
        const k = (nj - j0) * W + (ni - i0); if (D[k] < 0) { D[k] = d + 1; q.push(ni, nj); } } }
    return (i, j) => i < i0 || j < j0 || i >= i0 + W || j >= j0 + W ? -1 : D[(j - j0) * W + (i - i0)]; }
  const stepsTo = (pd, f) => { let d = pd(f.i, f.j); if (d < 0) for (const [di, dj] of DIRS8) { const x = pd(f.i + di, f.j + dj); if (x >= 0 && (d < 0 || x + 1 < d)) d = x + 1; } return d; };
  // 가까운 몹 우선: 걸음 수가 가장 적은 몹 · 나를 노리고 달려오는 8걸음 안의 몹은 먼저 (멀리 있는 선공몹 때문에 멀리 가지 않음)
  // 타겟팅 모드 (파티 중일 때): same = 파티원이 때리는 몬스터 우선 · diff = 파티원이 때리는 몬스터는 피함 · free = 알아서 가까운 몹
  const partyT = () => C.tgtMode !== 'free' && NET.inParty() ? NET.partyTargets() : null;
  const atkMe = f => C.aggrFirst && !!f.hitMeT && time - f.hitMeT < 6 && !f.dead && !f.gone;   // 최근 6초 안에 나를 공격한(쏜·때린·빗나간) 몬스터
  function pick(pd) { pd = pd || pathDist(22); const PT = partyT();
    if (PT && PT.size) { const only = C.tgtMode === 'same' ? f => PT.has(f.uid) : f => !PT.has(f.uid) || (f.aggro && f.tgt === hero); const r = pickIn(pd, only); if (r) return r; }
    return pickIn(pd, null); }
  function pickIn(pd, only) { let b = null, bd = 1e9, fb = null, fd = 1e9;
    for (const f of foxes) { if (f.dead || f.gone) continue; const S = MOB[f.kind]; if (C.noBoss && S.boss) continue; if (only && !only(f)) continue;
      let d = stepsTo(pd, f); if (d < 0) { const c = cheb(f.i, f.j, hero.i, hero.j); if (c < fd) { fd = c; fb = f; } continue; }
      if (atkMe(f) || (C.aggrFirst && f.aggro && f.tgt === hero && d <= 8)) d -= 100; if (d < bd) { bd = d; b = f; } }
    return b ? { f: b, d: bd } : fb ? { f: fb, d: 999 } : null; }
  let rtT = 0;
  function tick(dt) {
    if (state === 'off') { if (snd) muteOff(); return; }
    if (state === 'hunting') {
      if (SCENE === 'town') { if (died) { died = false; if (C.deathBack) { state = 'town'; bought = false; wait = 0; say('자동사냥: 사망 — 회복 후 다시 사냥터로 갑니다.', '#9fd0e8'); } else { state = 'off'; say('자동사냥을 멈췄습니다.', '#9c9682'); } } else { state = 'off'; say('자동사냥을 멈췄습니다. (마을로 이동)', '#9c9682'); } return; }
      if (!inZ1()) { state = 'off'; say('자동사냥은 각 지역의 1·2구간에서만 됩니다. 멈췄습니다.', '#f08a7a'); return; }
      home = regionOf(); homeId = ISLE.def && ISLE.def.floor === 2 ? ISLE.def.up : ISLE.id;
      if (pct() <= C.retHp) { goHome(`HP ${pct()}%`); return; }
      if (C.lowPot && INV.count(C.buyId) <= C.lowN && INV.count('red_potion') + INV.count('orange_potion') <= C.lowN) { goHome('물약 부족'); return; }
      if (C.sell && wpc() >= C.sellPct) { const L = sellList(), sw = L.reduce((a, e) => a + (ITEMS[e.id].w || 0) * (e.n || 1), 0);   // 팔 장비가 가방 최대 무게의 5% 이상(또는 가방이 꽉 참)일 때만 귀환 — 못 파는 물건 때문에 마을을 계속 오가지 않게
        if (L.length && (sw >= INV.maxW() * 0.05 || wpc() >= 100)) { sellGo = true; goHome(`가방 무게 ${wpc()}% (자동판매)`); return; }
        if ((sellNoT -= dt) <= 0) { sellNoT = 60; say(`자동판매: 가방이 무겁지만(${wpc()}%) 팔 수 있는 장비가 거의 없어 계속 사냥합니다.`, '#9c9682'); } }
      if ((!hero.target || hero.target.dead) && !moveGoal && hero.t >= 1 && !hero.atk) { const threat = foxes.some(f => !f.dead && f.aggro && cheb(f.i, f.j, hero.i, hero.j) <= 2);
        const it = !threat && lootTarget(); if (it) { it._try = (it._try || 0) + 1; GROUND.go(it); return; }
        const p = pick(); if (p) hero.target = p.f; }
      // 가는 중에 더 가까운 몹이 보이면 갈아탐 (지금 대상이 나를 때리는 중이 아니고, 3걸음 이상 더 가까울 때)
      else if (hero.target && !hero.target.dead && !hero.atk && (rtT -= dt) <= 0) { rtT = 0.5; const T = hero.target, threat = !atkMe(T) && foxes.some(f => f !== T && atkMe(f));
        if (threat || (!(T.aggro && T.tgt === hero && cheb(T.i, T.j, hero.i, hero.j) <= 3) && cheb(T.i, T.j, hero.i, hero.j) > 1)) { const pd = pathDist(22), cur = stepsTo(pd, T), p = pick(pd), PT = partyT();
          const party = PT && PT.size && p && (C.tgtMode === 'same' ? PT.has(p.f.uid) && !PT.has(T.uid) : PT.has(T.uid) && !PT.has(p.f.uid));   // 파티 규칙에 맞는 몹이 생기면 바로 갈아탐
          if (p && p.f !== T && ((threat && atkMe(p.f)) || party || cur < 0 || p.d <= cur - 3)) hero.target = p.f; } }
      return; }
    if (state === 'town') {
      if (SCENE !== 'town') { if (!inZ1()) { state = 'off'; } return; }
      if (!bought) { bought = true; if (C.sell && (sellGo || wpc() >= C.sellPct)) autoSell(); sellGo = false; buyAll(); }
      hero.hp = Math.min(hero.max, hero.hp + hero.max * 0.05 * dt); hero.mp = Math.min(hero.maxmp, hero.mp + hero.maxmp * 0.05 * dt);
      if (pct() >= C.backHp) { if (wait <= 0) { wait = 2; say(`자동사냥: 2초 뒤 ${(ISLAND.def(homeId) || {}).name || home}(으)로 돌아갑니다.`, '#9fd0e8'); } else { wait -= dt; if (wait <= 0.0001) { wait = 0; state = 'hunting'; TOWN.toZone(homeId); } } }
    } }
  function toggle() { if (state !== 'off') { state = 'off'; hero.target = null; muteOff(); say('자동사냥을 껐습니다.', '#9c9682'); return; }
    if (!inZ1()) { say('자동사냥은 각 지역의 1·2구간에서만 켤 수 있습니다.', '#f08a7a'); return; } home = regionOf(); homeId = ISLE.def && ISLE.def.floor === 2 ? ISLE.def.up : ISLE.id; state = 'hunting'; died = false; say('자동사냥을 켰습니다.', '#f2e6a8'); muteOn(); }
  function status() { if (state === 'off') return inZ1() ? '이 구간에서 사용 가능' : '각 지역 1·2구간 전용'; if (state === 'hunting') return '사냥 중' + (hero.target && !hero.target.dead ? ' · ' + MOB[hero.target.kind].name : ''); return `마을 대기 · HP ${pct()}% / ${C.backHp}%`; }
  const $h = id => document.getElementById(id);
  function sync() { const w = $h('huntwin'); if (!w) return;
    w.querySelectorAll('[data-k]').forEach(el => { const k = el.dataset.k; if (el.type === 'checkbox') el.checked = !!C[k]; else el.value = C[k]; const out = w.querySelector(`[data-v="${k}"]`); if (out) out.textContent = C[k] + (el.type === 'range' ? '%' : ''); });
    w.querySelectorAll('[data-lr]').forEach(el => { el.checked = !!C.lootR[el.dataset.lr]; }); w.querySelectorAll('[data-lt]').forEach(el => { el.checked = !!C.lootT[el.dataset.lt]; }); w.querySelectorAll('[data-buff]').forEach(el => { el.checked = !!INV.autoBuff(el.dataset.buff); });
    w.querySelectorAll('.hw-chips:not(.hw-sell)').forEach(el => el.classList.toggle('off', !C.loot)); w.querySelectorAll('[data-sr]').forEach(el => { el.checked = !!C.sellR[el.dataset.sr]; }); w.querySelectorAll('.hw-sell').forEach(el => el.classList.toggle('off', !C.sell)); }
  function openSet() { const w = $h('huntwin'); w.hidden = false; sync();
    w.querySelectorAll('[data-k]').forEach(el => { el.oninput = el.onchange = () => { const k = el.dataset.k; C[k] = el.type === 'checkbox' ? el.checked : el.tagName === 'SELECT' ? el.value : +el.value; if (k === 'mute' && state !== 'off') { if (C.mute) muteOn(); else muteOff(); } sync(); }; });
    w.querySelectorAll('[data-lr]').forEach(el => { el.onchange = () => { C.lootR[el.dataset.lr] = el.checked; sync(); }; }); w.querySelectorAll('[data-lt]').forEach(el => { el.onchange = () => { C.lootT[el.dataset.lt] = el.checked; sync(); }; }); w.querySelectorAll('[data-sr]').forEach(el => { el.onchange = () => { C.sellR[el.dataset.sr] = el.checked; sync(); }; });
    w.querySelectorAll('[data-buff]').forEach(el => { el.onchange = () => { INV.setAutoBuff(el.dataset.buff, el.checked); sync(); }; });
    w.querySelectorAll('select,input').forEach(el => { el.onkeydown = ev => ev.stopPropagation(); }); }
  return { tick, toggle, openSet, status, on: () => state !== 'off', died() { if (state !== 'off') died = true; }, cfg: () => JSON.parse(JSON.stringify(C)), setCfg(o) { for (const k in o) if (k in C) { if (C[k] && typeof C[k] === 'object') Object.assign(C[k], o[k]); else C[k] = o[k]; } } };
})();

let last=performance.now(), invT=0;
function frame(now){
  const dt=Math.max(0,Math.min(0.05,(now-last)/1000)); last=now; time+=dt; zoom+=(zoomT-zoom)*Math.min(1,dt*10);
  shake=Math.max(0,shake-dt); potCd=Math.max(0,potCd-dt); if (mark){ mark.life-=dt; if (mark.life<=0) mark=null; }
  if (hitstop>0) hitstop-=dt; else { updateHero(dt); foxes.forEach(f=>updateFox(f,dt)); if (SCENE==='town') TOWN.update(dt); ISLAND.tick(dt); NET.tick(dt); TRADE.tick(dt); PET.tick(dt); SAVE.tick(dt); GROUND.tick(dt); skillTick(dt); skillFxTick(dt); spellFxTick(dt); DN.update(dt); INV.tick(dt); AUTO.tick(dt); invT-=dt; if (invT<=0){ invT=0.4; INV.render(); TOWN.bgmTick(); if (ACCOUNT.started()) heavyCheck(); }
    for (let k=floats.length-1;k>=0;k--){ floats[k].t+=dt; if (floats[k].t>=floats[k].life) floats.splice(k,1); }
    for (let k=bursts.length-1;k>=0;k--){ bursts[k].t+=dt; if (bursts[k].t>=0.35) bursts.splice(k,1); }
    for (let k=parts.length-1;k>=0;k--){ const p=parts[k]; p.life-=dt; if (p.life<=0){ parts.splice(k,1); continue; } p.x+=p.vx*dt; p.y+=p.vy*dt; if (p.dust){ p.vx*=0.92; p.vy+=50*dt; } else if (!p.ember) p.vy+=380*dt; }
    for (let k=IMPACTS.length-1;k>=0;k--){ IMPACTS[k].t+=dt; if (IMPACTS[k].t>=IMPACTS[k].life) IMPACTS.splice(k,1); } }
  const tgt=W2P(hero.x,hero.z); cam[0]+=(tgt[0]-cam[0])*Math.min(1,dt*7); cam[1]+=(tgt[1]-20-cam[1])*Math.min(1,dt*7);
  const z = pixel ? Math.max(1,Math.round(zoom)) : zoom;
  // 기기 해상도로 그림: 배경은 확대(도트), 고해상도 캐릭터는 0.5배로 선명하게
  const vw=Math.ceil(W/z), vh=Math.ceil(H/z), pw=Math.ceil(W*DPR), ph=Math.ceil(H*DPR);
  if (low.width!==pw||low.height!==ph){ low.width=pw; low.height=ph; }
  lc.setTransform(z*DPR,0,0,z*DPR,0,0); lc.imageSmoothingEnabled=!pixel; lc.imageSmoothingQuality='high';
  drawWorld(lc,vw,vh); drawUI(lc,vw,vh);
  ctx.setTransform(1,0,0,1,0,0); ctx.drawImage(low,0,0);
  curZ = z; requestAnimationFrame(frame);
}
// ============================================================ 창 끌어서 옮기기: 인벤·캐릭터·펫·아이템 정보·자동사냥·상점·월드맵·ESC 메뉴 (위치 기억)
(() => { const load = id => { try { return JSON.parse(localStorage.getItem('winpos_' + id) || 'null'); } catch (e) { return null; } }, save = (id, v) => { try { localStorage.setItem('winpos_' + id, JSON.stringify(v)); } catch (e) {} };
  const NOGRAB = 'button,input,select,textarea,a,label,.slot,.eq,.sk,canvas,.item,.mk';
  function setup(el, id, mode, handle, remember) { if (!el) return; const hd = handle ? el.querySelector(handle) : null; let st = null;
    const zoomOf = () => parseFloat(getComputedStyle(el).zoom) || 1;
    const clampFixed = (L, T) => { const r = el.getBoundingClientRect(); return [Math.max(0, Math.min(innerWidth - r.width, L)), Math.max(0, Math.min(innerHeight - r.height, T))]; };
    const applyFixed = (L, T) => { const z = zoomOf(); [L, T] = clampFixed(L, T); Object.assign(el.style, { left: L / z + 'px', top: T / z + 'px', right: 'auto', bottom: 'auto', transform: 'none', margin: '0' }); return [L, T]; };
    let off = [0, 0]; const applyOff = (dx, dy) => { el.style.transform = `translate(${dx}px, ${dy}px)`; const r = el.getBoundingClientRect(); let fx = 0, fy = 0; if (r.left < 0) fx = -r.left; if (r.top < 0) fy = -r.top; if (r.right > innerWidth) fx = innerWidth - r.right; if (r.bottom > innerHeight) fy = innerHeight - r.bottom; off = [dx + fx, dy + fy]; el.style.transform = `translate(${off[0]}px, ${off[1]}px)`; };
    const restore = () => { const v = remember && load(id); if (!v) return; requestAnimationFrame(() => { if (mode === 'fixed') applyFixed(v[0], v[1]); else applyOff(v[0], v[1]); }); };
    const host = mode === 'fixed' ? el : el.closest('.ovl, .escmenu') || el; new MutationObserver(() => { if (!host.hidden) restore(); }).observe(host, { attributes: true, attributeFilter: ['hidden'] }); if (!host.hidden) restore();
    el.addEventListener('pointerdown', ev => { if (ev.button !== 0) return; if (ev.target.closest(NOGRAB)) return; const r = el.getBoundingClientRect();
      const onHandle = hd ? hd.contains(ev.target) : (ev.clientY - r.top) < 30 * zoomOf(); if (!onHandle) return;
      st = { x: ev.clientX, y: ev.clientY, L: r.left, T: r.top, o: off.slice(), moved: false }; el.setPointerCapture(ev.pointerId); });
    el.addEventListener('pointermove', ev => { if (!st) return; const dx = ev.clientX - st.x, dy = ev.clientY - st.y; if (!st.moved && Math.hypot(dx, dy) < 3) return; st.moved = true; el.classList.add('dragging');
      if (mode === 'fixed') st.last = applyFixed(st.L + dx, st.T + dy); else { applyOff(st.o[0] + dx, st.o[1] + dy); st.last = off.slice(); } });
    const end = () => { if (st && st.moved && remember && st.last) save(id, st.last); st = null; el.classList.remove('dragging'); }; el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    if (hd) hd.style.cursor = 'move'; }
  const $ = id => document.getElementById(id);
  for (const id of ['charwin', 'invwin', 'autowin', 'huntwin', 'petwin', 'godpanel', 'bulkwin', 'sellwin', 'storewin']) setup($(id), id, 'fixed', null, true);
  setup($('itemwin'), 'itemwin', 'fixed', null, false);
  setup(document.querySelector('#shop .pn'), 'shop', 'off', 'h2', true);
  setup(document.querySelector('#wmap .pn'), 'wmap', 'off', '.wm-side h2', true);
  setup(document.querySelector('#escmenu .esc-box'), 'esc', 'off', 'h2', true);
})();
requestAnimationFrame(frame);
setTimeout(() => { try { ISLAND.prebake(2); } catch (e) {} }, 2500);   // 2구간 바닥(언덕)을 미리 조금씩 구워 둠 → 들어갈 때 멈춤 없음
})();
