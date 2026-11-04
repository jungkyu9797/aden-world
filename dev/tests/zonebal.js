// 11/4 사냥터 난이도·보상 규칙 (카드 zonebal) — python3 dev/mkkt.py && KT_PORT=8901 bash dev/runkt.sh dev/tests/zonebal.js
//   프로듀서: 펫·파티 봇이 같이 사냥하니 몹 난이도(HP·공격·방어)가 보상(경험치·골드)보다 빨리 오름 · 아이템 드랍 확률은 그대로
//   기준 = 화룡의 둥지 2구역 평균(FG_BASE) → 몽환의 섬 난이도 × 1.23 · 보상 × 1.17 → 잊혀진 섬 × 1.46 · × 1.33 · 용의 계곡·화룡의 둥지는 그대로
//   ① 몽섬 정령·대정령·유니콘 수치 ② 잊섬 일반 5종 평균 ÷ 화둥 평균 ③ 에이션트 자이언트 = 피닉스 × 1.46 / × 1.33 ④ 경험치÷HP 화둥2 ≥ 몽섬 ≥ 잊섬 (완만하게) ⑤ 용계·화둥 몹 그대로 (origin/main v231 값)
const { chromium } = require('playwright'); const login = require('../tq.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// origin/main v231 (3f652bf)에서 읽은 실제 MOB 값 (용의 계곡 1·2구역 · 화룡의 둥지 1·2구역 · 보스)
const BASE = {"dv_skel":{"lv":47,"hp":800,"dmg":[45,75],"mac":2,"mr":10,"hit":0.92,"exp":1750,"coin":[450,800]},"dv_archer":{"lv":48,"hp":700,"dmg":[40,65],"mac":3,"mr":10,"hit":0.92,"exp":1550,"coin":[420,760]},"wyvern":{"lv":53,"hp":650,"dmg":[55,90],"mac":2,"mr":20,"hit":0.94,"exp":2250,"coin":[550,900]},"drake":{"lv":52,"hp":750,"dmg":[60,95],"mac":1,"mr":30,"hit":0.93,"exp":2550,"coin":[600,950]},"lesser_dragon":{"lv":54,"hp":1000,"dmg":[60,90],"mac":1,"mr":50,"hit":0.95,"exp":3500,"coin":[900,1600]},"fn_warrior":{"lv":54,"hp":1800,"dmg":[74,120],"mac":2,"mr":20,"hit":0.93,"exp":9350,"coin":[2200,3650]},"fn_archer":{"lv":54,"hp":1550,"dmg":[68,108],"mac":3,"mr":20,"hit":0.93,"exp":8500,"coin":[2000,3350]},"fn_golem":{"lv":55,"hp":2800,"dmg":[85,130],"mac":-1,"mr":30,"hit":0.9,"exp":12600,"coin":[2800,4900]},"fn_bomb":{"lv":53,"hp":800,"dmg":[45,70],"mac":4,"mr":10,"hit":0.9,"exp":4100,"coin":[1000,1650]},"fn_salamander":{"lv":55,"hp":2250,"dmg":[90,143],"mac":1,"mr":35,"hit":0.94,"exp":14150,"coin":[3250,5200]},"fn_hcerberus":{"lv":56,"hp":1950,"dmg":[83,135],"mac":2,"mr":25,"hit":0.94,"exp":12600,"coin":[3050,4900]},"fn_ashtazio":{"lv":57,"hp":3000,"dmg":[90,135],"mac":1,"mr":55,"hit":0.95,"exp":19500,"coin":[4900,8700]},"fn_egg":{"lv":55,"hp":400,"dmg":[30,45],"mac":6,"mr":10,"hit":0.85,"exp":4400,"coin":[1150,2200]},"fn_ifrit":{"lv":58,"hp":18000,"dmg":[89,144],"mac":0,"mr":40,"hit":0.96,"exp":75000,"coin":[17500,29000]},"phoenix":{"lv":60,"hp":150000,"dmg":[39,66],"mac":-2,"mr":55,"hit":0.96,"exp":162000,"coin":[260000,432000]}};
(async () => { const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1000, height: 700 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, { cls: 'knight', name: 'zb' + Date.now() % 1e4 });
  const st = await p.evaluate(K => { const M = __T.MOB, D = __T.DREAM, F = __FG, pick = S => S ? { lv: S.lv, hp: S.hp, dmg: S.dmg, mac: S.mac, mr: S.mr, hit: S.hit, exp: S.exp, coin: S.coin } : null;
    const sp = ['fire', 'water', 'earth', 'wind'].map(el => ({ s: pick(M['dr_' + el]), g: pick(M['dr_g' + el]), sa: M['dr_' + el].elAdd, ga: M['dr_g' + el].elAdd }));
    const fg = Object.keys(F.FG_DEF).map(k => ({ k, mid: !!M[k].fgMid, ...pick(M[k]) }));
    return { B: F.FG_BASE, FGI: { X: F.FGI.X, HX: F.FGI.HX, BX: F.FGI.BX, XR: F.FGI.XR, MR_K: F.FGI.MR_K, MAC: F.FGI.MAC }, sp, uni: pick(M.unicorn), ch: D.UNI_CHARGE, horn: D.UNI_HORN, fg, giant: pick(M.fg_giant), phx: pick(M.phoenix), cur: Object.fromEntries(K.map(k => [k, pick(M[k])])) }; }, Object.keys(BASE));
  const B = st.B; console.log('화둥 2구역 평균(FG_BASE):', JSON.stringify(Object.fromEntries(Object.entries(B).map(([k, v]) => [k, Math.round(v * 100) / 100]))));
  ok(Math.abs(B.hp - 2400) < 0.01 && Math.abs(B.d0 - 87.67) < 0.01 && Math.abs(B.d1 - 137.67) < 0.01 && Math.abs(B.exp - 15416.67) < 0.01 && Math.abs(B.c0 - 3733.33) < 0.01 && Math.abs(B.c1 - 6266.67) < 0.01 && Math.abs(B.mr - 38.33) < 0.01, '기준 FG_BASE = 화둥 2구역 평균 그대로 (HP 2400 · 피해 87.67~137.67 · 경험치 15416.7 · 골드 3733.3~6266.7 · MR 38.33)');
  // ---------- ① 몽환의 섬
  const S = st.sp[0].s, G = st.sp[0].g, U = st.uni; console.log('① 정령', JSON.stringify(S), 'elAdd', st.sp[0].sa, '\n   대정령', JSON.stringify(G), 'elAdd', st.sp[0].ga, '\n   유니콘', JSON.stringify(U), '돌진', st.ch, '뿔', st.horn);
  ok(st.sp.every(o => eq(o.s, S) && eq(o.g, G) && eq(o.sa, st.sp[0].sa) && eq(o.ga, st.sp[0].ga)), '① 정령 4종 · 대정령 4종 수치가 속성끼리 같음');
  ok(S.hp === 2952 && eq(S.dmg, [108, 169]) && S.mac === 0 && S.mr === 47 && S.exp === 18038 && eq(S.coin, [4368, 7332]) && S.lv === 60 && S.hit === 0.95 && eq(st.sp[0].sa, [18, 30]), `① 정령 = 화둥 평균 × 1.23 (HP ${S.hp} · 피해 ${S.dmg} · MR ${S.mr} · AC ${S.mac}) · 보상 × 1.17 (경험치 ${S.exp} · 골드 ${S.coin}) · 속성 추가 ${st.sp[0].sa}`);
  ok(S.hp === Math.round(B.hp * 1.23) && S.dmg[0] === Math.round(B.d0 * 1.23) && S.dmg[1] === Math.round(B.d1 * 1.23) && S.mr === Math.round(B.mr * 1.23) && S.exp === Math.round(B.exp * 1.17) && S.coin[0] === Math.round(B.c0 * 1.17) && S.coin[1] === Math.round(B.c1 * 1.17), '① 정령 수치 = FG_BASE × 1.23 / × 1.17 (반올림)');
  ok(G.hp === 4428 && eq(G.dmg, [135, 211]) && G.mac === -1 && G.mr === 60 && G.exp === 36076 && eq(G.coin, [8736, 14664]) && G.lv === 65 && eq(st.sp[0].ga, [26, 42]), `① 대정령 HP ${G.hp} · 피해 ${G.dmg} · AC ${G.mac} · MR ${G.mr} · 경험치 ${G.exp} · 골드 ${G.coin} · 속성 추가 ${st.sp[0].ga}`);
  ok(G.hp === S.hp * 1.5 && G.dmg.every((v, i) => Math.abs(v - S.dmg[i] * 1.25) <= 1) && G.exp === S.exp * 2 && G.coin.every((v, i) => v === S.coin[i] * 2), '① 대정령 = 정령의 HP × 1.5 · 피해 × 1.25 · 경험치·골드 × 2 (예전과 같은 비율)');
  ok(U.hp === 184500 && eq(U.dmg, [48, 81]) && U.exp === 189540 && eq(U.coin, [304200, 505440]) && U.mac === -3 && U.mr === 70 && U.lv === 66, `① 유니콘 = 피닉스 × 1.23 (HP ${U.hp} · 피해 ${U.dmg}) · × 1.17 (경험치 ${U.exp} · 골드 ${U.coin})`);
  ok(U.hp === Math.round(st.phx.hp * 1.23) && U.dmg.every((v, i) => v === Math.round(st.phx.dmg[i] * 1.23)) && U.exp === Math.round(st.phx.exp * 1.17) && U.coin.every((v, i) => v === Math.round(st.phx.coin[i] * 1.17)), '① 유니콘 수치 = 피닉스 × 1.23 / × 1.17 (반올림)');
  ok(eq(st.ch, [19, 28]) && eq(st.horn, [26, 38]), `① 유니콘 돌진 ${st.ch} · 뿔 빛기둥 ${st.horn} (22~32 · 30~44 × 48/55)`);
  // ---------- ② 잊혀진 섬 일반 5종
  const F = st.FGI; console.log('② FGI', JSON.stringify(F)); for (const r of st.fg) console.log(`   ${r.k.padEnd(11)} Lv${r.lv} HP ${r.hp} 피해 ${r.dmg} AC ${r.mac} MR ${r.mr} 경험치 ${r.exp} 골드 ${r.coin}`);
  ok(F.X === 1.46 && F.HX === 1.46 && F.BX === 1.46 && F.XR === 1.33 && F.MR_K === 1.46 && F.MAC === -2, '② FGI: X·HX·BX·MR_K 1.46 · XR 1.33 · MAC −2');
  const N5 = st.fg.filter(r => !r.mid), av = f => N5.reduce((x, r) => x + f(r), 0) / N5.length,
    R = { hp: av(r => r.hp) / B.hp, d0: av(r => r.dmg[0]) / B.d0, d1: av(r => r.dmg[1]) / B.d1, exp: av(r => r.exp) / B.exp, c0: av(r => r.coin[0]) / B.c0, c1: av(r => r.coin[1]) / B.c1 };
  console.log('   일반 5종 평균 ÷ 화둥 평균:', JSON.stringify(Object.fromEntries(Object.entries(R).map(([k, v]) => [k, +v.toFixed(3)]))));
  ok(['hp', 'd0', 'd1'].every(k => Math.abs(R[k] - 1.46) < 0.01) && ['exp', 'c0', 'c1'].every(k => Math.abs(R[k] - 1.33) < 0.01), `② 일반 5종 평균 HP·공격 = 화둥의 1.46배 · 경험치·골드 = 1.33배 (${Object.entries(R).map(([k, v]) => k + ' ' + v.toFixed(3)).join(' · ')})`);
  ok(st.fg.every(r => r.mac === -2 && r.mr === Math.round(B.mr * 1.46)), `② 잊섬 몹 AC −2 (몽섬 정령 0 · 대정령 −1보다 단단) · MR ${Math.round(B.mr * 1.46)} = 화둥 평균 × 1.46`);
  const dr = st.fg.find(r => r.mid); ok(dr && dr.exp === Math.round(B.exp * 1.33 * 2) && dr.hp === Math.round(B.hp * 1.46 * 1.6), `② 드레이크 HP ${dr && dr.hp} (× 1.6) · 경험치 ${dr && dr.exp} (× 2)`);
  // ---------- ③ 에이션트 자이언트
  const GI = st.giant, P = st.phx; console.log(`③ 에이션트 자이언트 HP ${GI.hp} · 피해 ${GI.dmg} · AC ${GI.mac} · MR ${GI.mr} · 경험치 ${GI.exp} · 골드 ${GI.coin} (피닉스 ${P.hp} · ${P.dmg} · ${P.exp} · ${P.coin})`);
  ok(GI.hp === Math.round(P.hp * 1.46) && GI.dmg.every((v, i) => v === Math.round(P.dmg[i] * 1.46)) && GI.exp === Math.round(P.exp * 1.33) && GI.coin.every((v, i) => v === Math.round(P.coin[i] * 1.33)) && Number.isInteger(GI.hp) && Number.isInteger(GI.exp) && GI.coin.every(Number.isInteger),
    `③ 에이션트 자이언트 = 피닉스 HP·피해 × 1.46 · 경험치·골드 × 1.33 (정수)`);
  ok(GI.hp > U.hp && GI.dmg[1] > U.dmg[1] && GI.exp > U.exp, '③ 에이션트 자이언트가 유니콘보다 강하고 보상도 큼');
  // ---------- ④ 경험치 ÷ HP
  const e2 = B.exp / B.hp, eD = S.exp / S.hp, eF = av(r => r.exp) / av(r => r.hp); console.log(`④ 경험치÷HP: 화둥2 ${e2.toFixed(3)} · 몽섬 정령 ${eD.toFixed(3)} (${(eD / e2 * 100).toFixed(1)}%) · 잊섬 평균 ${eF.toFixed(3)} (${(eF / e2 * 100).toFixed(1)}%)`);
  ok(e2 >= eD && eD >= eF && eD / e2 > 0.9 && eF / eD > 0.9, '④ 경험치÷HP 화둥2 ≥ 몽섬 ≥ 잊섬 · 한 단계마다 10% 안쪽으로 완만하게 줄어듦');
  const hD = S.hp / B.hp, hF = av(r => r.hp) / B.hp, xD = S.exp / B.exp, xF = av(r => r.exp) / B.exp; ok(hD > xD && hF > xF && hF > hD && xF > xD, `④ 난이도 배율(몽섬 ${hD.toFixed(2)} · 잊섬 ${hF.toFixed(2)})이 보상 배율(${xD.toFixed(2)} · ${xF.toFixed(2)})보다 큼`);
  // ---------- ⑤ 용계·화둥 그대로
  const diff = Object.keys(BASE).filter(k => !eq(st.cur[k], BASE[k]));
  ok(!diff.length, `⑤ 용의 계곡·화룡의 둥지 몹 ${Object.keys(BASE).length}종 수치 그대로 (origin/main v231과 같음)${diff.length ? ' 다름: ' + diff.map(k => k + ' ' + JSON.stringify(st.cur[k])).join(' / ') : ''}`);
  ok(!errs.length, `페이지 오류 없음 ${errs.slice(0, 3).join(' / ')}`);
  console.log(fails ? `FAIL ${fails}` : 'ALL OK'); await b.close(); process.exit(fails ? 1 : 0); })();
