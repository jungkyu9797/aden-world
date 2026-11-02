// 한 번만 돌려서 결과를 코드에 리터럴로 박음 (씨앗은 고정 · 이 스크립트는 기록용)
const rngS = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const CLS = { A: 'wwkwewkeewwkekekwe', B: 'eeekwekwwwekkekwkwkw' };   // 기존 명단(씨앗 1030)의 슬롯별 직업 그대로
const FIX = { A: { 6: '인범', 0: '포세이든', 11: '퉁탕', 8: '구문룡' }, B: { 6: '만만이', 2: '원큐', 14: '철구', 9: '해골' } };   // 100% 고정 (반왕 기사2·요정1·법사1 / 라인 기사2·요정1(원큐)·법사1)
const REST = ['킹받쥬', '불타는썽큰', 'x골리앗x', '악마혼', '천사혼', '가렌', '간달프', '막피의왕', '뿅가', '베르한다실시', '안타라스', '발라카스', '파푸리온', '이실로테', '군터', '흑기사', '노빤쮸', '갤럭시', '거지왕', '문도', '카드값줘체리', '쌈장', '멸치', '고구마', '닥터x', '진격의거인', '원피스', '루피', '조로', '나미', '손오공', '오징어게임'];
const PCT = { A: [.9, .9, .9, .9, .8, .8, .8, .8, .8, .7, .7, .7, .7, .7], B: [.9, .9, .9, .9, .9, .9, .8, .8, .8, .8, .8, .7, .7, .7, .7, .7] };
const seed = +process.argv[2] || 1101;
const R = rngS(seed * 7919 + 101);
const shuf = a => { a = a.slice(); for (let k = a.length - 1; k > 0; k--) { const q = Math.floor(R() * (k + 1)); [a[k], a[q]] = [a[q], a[k]]; } return a; };
const names = shuf(REST);
const out = {};
for (const t of ['A', 'B']) { const n = CLS[t].length, pc = shuf(PCT[t]); let k = 0; out[t] = [];
  for (let i = 0; i < n; i++) { const c = { k: 'knight', e: 'elf', w: 'wizard' }[CLS[t][i]]; if (FIX[t][i]) out[t].push([FIX[t][i], c, 1]); else out[t].push([names.shift(), c, pc[k++]]); } }
console.log('spare', names);
for (const t of ['A', 'B']) { console.log(t, JSON.stringify(out[t]));
  for (const p of [1, .9, .8, .7]) console.log(' ', p, ['knight', 'elf', 'wizard'].map(c => c[0] + out[t].filter(b => b[1] === c && b[2] === p).length).join(' '), out[t].filter(b => b[2] === p).map(b => b[0]).join('·')); }
