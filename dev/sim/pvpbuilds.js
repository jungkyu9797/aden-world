// 같은 투자 수준(Lv55 · 영웅급 +5~7 축복 · 같은 장신구)으로 세 직업 빌드
const ACC = [['cx_am6', 'amulet', 5, 1], ['snow_cloak', 'cloak', 5, 1], ['cx_ts4', 'shirt', 7, 1], ['cx_be7', 'belt', 0, 1], ['cx_rg7', 'ring1', 0, 1], ['cx_rg6', 'ring2', 0, 1], ['doll_cerberus', 'doll', 0, 0]];
module.exports = {
  knight: { cls: 'knight', lv: 55, hpMax: 719, mpMax: 61, main: 'str', bag: [['cx_hm3', 'helm', 6, 1], ['dk_armor', 'armor', 5, 1], ['cx_sh6', 'shield', 5, 1], ['cx_gl5', 'gloves', 5, 1], ['dk_boots', 'boots', 5, 1], ['dv_sword', 'weapon', 7, 1], ...ACC] },
  elf: { cls: 'elf', lv: 55, baseHP: 14 + 54 * 7.5, baseMP: 5 + 54 * 1.5, main: 'dex', bag: [['cx_hm13', 'helm', 6, 1], ['cx_ar10', 'armor', 5, 1], ['cx_gl12', 'gloves', 5, 1], ['cx_bt11', 'boots', 5, 1], ['dv_bow', 'weapon', 7, 1], ...ACC] },
  wizard: { cls: 'wizard', lv: 55, baseHP: 12 + 54 * 6.5, baseMP: 8 + 54 * 4, main: 'int', bag: [['cx_hm9', 'helm', 6, 1], ['cx_ar8', 'armor', 5, 1], ['cx_sh12', 'shield', 5, 1], ['cx_gl9', 'gloves', 5, 1], ['cx_bt9', 'boots', 5, 1], ['dv_staff', 'weapon', 7, 1], ...ACC] } };
