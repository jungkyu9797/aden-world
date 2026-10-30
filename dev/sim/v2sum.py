# 10/30 defbal v2: fn_sim.js 결과 줄(JSON)을 10분 기준 표로 · python3 dev/sim/v2sum.py dev/out/v2/r1_22.txt ...
# 순수 골드 = 몹 골드 − 물약값(빨강 25 · 주홍 80 · 맑은 200) · 10분(600초) 기준으로 맞춤
import json, sys
for fn in sys.argv[1:]:
    for ln in open(fn, encoding='utf8'):
        ln = ln.strip()
        if not ln.startswith('{"sec"'): continue
        r = json.loads(ln); k = 600 / max(1, r['sec']); red, org, clr = r['pots']; D = r.get('dmg') or {}
        pure = r['coins'] - red * 25 - org * 80 - clr * 200
        print(f"{fn.split('/')[-1]:14s} 처치 {r['total']*k:5.0f} · 경험치 {r['xp']*k/1e4:5.1f}만 · 골드 {r['coins']*k/1e4:4.1f}만 · 순수 {pure*k/1e4:4.1f}만 · 주홍 {org*k:4.0f} · 맑은 {clr*k:3.0f} · 최저 {r['minHp']*100:3.0f}% · 사망 {r['deaths']}"
              f" · 강타 물리 {D.get('#crit:p',0)*k:3.0f} 마법 {D.get('#crit:m',0)*k:3.0f} · 물리 {(D.get('melee',0)+D.get('ranged',0))*k:5.0f} 마법 {sum(v for kk,v in D.items() if kk.endswith(':m') and not kk.startswith('#'))*k:5.0f}"
              + (f" · 사망 {[d['t'] for d in r['dl']]}" if r['deaths'] else ''))
