import type { Lang } from './types';

/** 一行一个数据值、8 种语言并排；同样由类型保证不漏翻 */
export type ValueRow = Record<Lang, string>;

/** 大洲（对应 Natural Earth 的 CONTINENT 字段） */
export const CONTINENTS: Record<string, ValueRow> = {
  Africa: { 'zh-CN': '非洲', en: 'Africa', ja: 'アフリカ', ko: '아프리카', fr: 'Afrique', de: 'Afrika', es: 'África', ru: 'Африка' },
  Antarctica: { 'zh-CN': '南极洲', en: 'Antarctica', ja: '南極大陸', ko: '남극', fr: 'Antarctique', de: 'Antarktis', es: 'Antártida', ru: 'Антарктида' },
  Asia: { 'zh-CN': '亚洲', en: 'Asia', ja: 'アジア', ko: '아시아', fr: 'Asie', de: 'Asien', es: 'Asia', ru: 'Азия' },
  Europe: { 'zh-CN': '欧洲', en: 'Europe', ja: 'ヨーロッパ', ko: '유럽', fr: 'Europe', de: 'Europa', es: 'Europa', ru: 'Европа' },
  'North America': { 'zh-CN': '北美洲', en: 'North America', ja: '北アメリカ', ko: '북아메리카', fr: 'Amérique du Nord', de: 'Nordamerika', es: 'América del Norte', ru: 'Северная Америка' },
  Oceania: { 'zh-CN': '大洋洲', en: 'Oceania', ja: 'オセアニア', ko: '오세아니아', fr: 'Océanie', de: 'Ozeanien', es: 'Oceanía', ru: 'Океания' },
  'South America': { 'zh-CN': '南美洲', en: 'South America', ja: '南アメリカ', ko: '남아메리카', fr: 'Amérique du Sud', de: 'Südamerika', es: 'América del Sur', ru: 'Южная Америка' },
  'Seven seas (open ocean)': { 'zh-CN': '公海', en: 'Open ocean', ja: '公海', ko: '공해', fr: 'Haute mer', de: 'Hohe See', es: 'Alta mar', ru: 'Открытое море' },
};

/** 地区（REGION_UN 字段） */
export const REGIONS: Record<string, ValueRow> = {
  Africa: { 'zh-CN': '非洲', en: 'Africa', ja: 'アフリカ', ko: '아프리카', fr: 'Afrique', de: 'Afrika', es: 'África', ru: 'Африка' },
  Americas: { 'zh-CN': '美洲', en: 'Americas', ja: 'アメリカ大陸', ko: '아메리카', fr: 'Amériques', de: 'Amerika', es: 'América', ru: 'Америка' },
  Antarctica: { 'zh-CN': '南极洲', en: 'Antarctica', ja: '南極大陸', ko: '남극', fr: 'Antarctique', de: 'Antarktis', es: 'Antártida', ru: 'Антарктида' },
  Asia: { 'zh-CN': '亚洲', en: 'Asia', ja: 'アジア', ko: '아시아', fr: 'Asie', de: 'Asien', es: 'Asia', ru: 'Азия' },
  Europe: { 'zh-CN': '欧洲', en: 'Europe', ja: 'ヨーロッパ', ko: '유럽', fr: 'Europe', de: 'Europa', es: 'Europa', ru: 'Европа' },
  Oceania: { 'zh-CN': '大洋洲', en: 'Oceania', ja: 'オセアニア', ko: '오세아니아', fr: 'Océanie', de: 'Ozeanien', es: 'Oceanía', ru: 'Океания' },
  'Seven seas (open ocean)': { 'zh-CN': '公海', en: 'Open ocean', ja: '公海', ko: '공해', fr: 'Haute mer', de: 'Hohe See', es: 'Alta mar', ru: 'Открытое море' },
};

/** 次区域（SUBREGION 字段） */
export const SUBREGIONS: Record<string, ValueRow> = {
  'Eastern Africa': { 'zh-CN': '东部非洲', en: 'Eastern Africa', ja: '東アフリカ', ko: '동아프리카', fr: 'Afrique orientale', de: 'Ostafrika', es: 'África Oriental', ru: 'Восточная Африка' },
  'Middle Africa': { 'zh-CN': '中部非洲', en: 'Middle Africa', ja: '中部アフリカ', ko: '중앙아프리카', fr: 'Afrique centrale', de: 'Zentralafrika', es: 'África Central', ru: 'Центральная Африка' },
  'Northern Africa': { 'zh-CN': '北部非洲', en: 'Northern Africa', ja: '北アフリカ', ko: '북아프리카', fr: 'Afrique du Nord', de: 'Nordafrika', es: 'África del Norte', ru: 'Северная Африка' },
  'Southern Africa': { 'zh-CN': '南部非洲', en: 'Southern Africa', ja: '南部アフリカ', ko: '남아프리카', fr: 'Afrique australe', de: 'Südliches Afrika', es: 'África Austral', ru: 'Южная Африка' },
  'Western Africa': { 'zh-CN': '西部非洲', en: 'Western Africa', ja: '西アフリカ', ko: '서아프리카', fr: 'Afrique occidentale', de: 'Westafrika', es: 'África Occidental', ru: 'Западная Африка' },
  Caribbean: { 'zh-CN': '加勒比地区', en: 'Caribbean', ja: 'カリブ海', ko: '카리브', fr: 'Caraïbes', de: 'Karibik', es: 'Caribe', ru: 'Карибы' },
  'Central America': { 'zh-CN': '中美洲', en: 'Central America', ja: '中央アメリカ', ko: '중앙아메리카', fr: 'Amérique centrale', de: 'Mittelamerika', es: 'América Central', ru: 'Центральная Америка' },
  'Northern America': { 'zh-CN': '北美地区', en: 'Northern America', ja: '北アメリカ', ko: '북아메리카', fr: 'Amérique du Nord', de: 'Nordamerika', es: 'América del Norte', ru: 'Северная Америка' },
  'South America': { 'zh-CN': '南美洲', en: 'South America', ja: '南アメリカ', ko: '남아메리카', fr: 'Amérique du Sud', de: 'Südamerika', es: 'América del Sur', ru: 'Южная Америка' },
  'Central Asia': { 'zh-CN': '中亚', en: 'Central Asia', ja: '中央アジア', ko: '중앙아시아', fr: 'Asie centrale', de: 'Zentralasien', es: 'Asia Central', ru: 'Центральная Азия' },
  'Eastern Asia': { 'zh-CN': '东亚', en: 'Eastern Asia', ja: '東アジア', ko: '동아시아', fr: 'Asie orientale', de: 'Ostasien', es: 'Asia Oriental', ru: 'Восточная Азия' },
  'South-Eastern Asia': { 'zh-CN': '东南亚', en: 'South-Eastern Asia', ja: '東南アジア', ko: '동남아시아', fr: 'Asie du Sud-Est', de: 'Südostasien', es: 'Sudeste Asiático', ru: 'Юго-Восточная Азия' },
  'Southern Asia': { 'zh-CN': '南亚', en: 'Southern Asia', ja: '南アジア', ko: '남아시아', fr: 'Asie du Sud', de: 'Südasien', es: 'Asia Meridional', ru: 'Южная Азия' },
  'Western Asia': { 'zh-CN': '西亚', en: 'Western Asia', ja: '西アジア', ko: '서아시아', fr: 'Asie occidentale', de: 'Westasien', es: 'Asia Occidental', ru: 'Западная Азия' },
  'Eastern Europe': { 'zh-CN': '东欧', en: 'Eastern Europe', ja: '東ヨーロッパ', ko: '동유럽', fr: 'Europe de l’Est', de: 'Osteuropa', es: 'Europa Oriental', ru: 'Восточная Европа' },
  'Northern Europe': { 'zh-CN': '北欧', en: 'Northern Europe', ja: '北ヨーロッパ', ko: '북유럽', fr: 'Europe du Nord', de: 'Nordeuropa', es: 'Europa del Norte', ru: 'Северная Европа' },
  'Southern Europe': { 'zh-CN': '南欧', en: 'Southern Europe', ja: '南ヨーロッパ', ko: '남유럽', fr: 'Europe du Sud', de: 'Südeuropa', es: 'Europa del Sur', ru: 'Южная Европа' },
  'Western Europe': { 'zh-CN': '西欧', en: 'Western Europe', ja: '西ヨーロッパ', ko: '서유럽', fr: 'Europe de l’Ouest', de: 'Westeuropa', es: 'Europa Occidental', ru: 'Западная Европа' },
  'Australia and New Zealand': { 'zh-CN': '澳大利亚与新西兰', en: 'Australia and New Zealand', ja: 'オーストラリアとニュージーランド', ko: '오스트레일리아와 뉴질랜드', fr: 'Australie et Nouvelle-Zélande', de: 'Australien und Neuseeland', es: 'Australia y Nueva Zelanda', ru: 'Австралия и Новая Зеландия' },
  Melanesia: { 'zh-CN': '美拉尼西亚', en: 'Melanesia', ja: 'メラネシア', ko: '멜라네시아', fr: 'Mélanésie', de: 'Melanesien', es: 'Melanesia', ru: 'Меланезия' },
  Micronesia: { 'zh-CN': '密克罗尼西亚', en: 'Micronesia', ja: 'ミクロネシア', ko: '미크로네시아', fr: 'Micronésie', de: 'Mikronesien', es: 'Micronesia', ru: 'Микронезия' },
  Polynesia: { 'zh-CN': '波利尼西亚', en: 'Polynesia', ja: 'ポリネシア', ko: '폴리네시아', fr: 'Polynésie', de: 'Polynesien', es: 'Polinesia', ru: 'Полинезия' },
  Antarctica: { 'zh-CN': '南极洲', en: 'Antarctica', ja: '南極大陸', ko: '남극', fr: 'Antarctique', de: 'Antarktis', es: 'Antártida', ru: 'Антарктида' },
  'Seven seas (open ocean)': { 'zh-CN': '公海', en: 'Open ocean', ja: '公海', ko: '공해', fr: 'Haute mer', de: 'Hohe See', es: 'Alta mar', ru: 'Открытое море' },
};

/** 经济体分类（ECONOMY 字段以序号开头，用序号建表） */
export const ECONOMIES: Record<string, ValueRow> = {
  '1': { 'zh-CN': '发达经济体：G7', en: 'Developed: G7', ja: '先進国：G7', ko: '선진국: G7', fr: 'Développé : G7', de: 'Entwickelt: G7', es: 'Desarrollado: G7', ru: 'Развитая: G7' },
  '2': { 'zh-CN': '发达经济体：非 G7', en: 'Developed: non-G7', ja: '先進国：G7以外', ko: '선진국: G7 외', fr: 'Développé : hors G7', de: 'Entwickelt: nicht G7', es: 'Desarrollado: no G7', ru: 'Развитая: не G7' },
  '3': { 'zh-CN': '新兴经济体：金砖', en: 'Emerging: BRIC', ja: '新興国：BRIC', ko: '신흥국: BRIC', fr: 'Émergent : BRIC', de: 'Schwellenland: BRIC', es: 'Emergente: BRIC', ru: 'Развивающаяся: БРИК' },
  '4': { 'zh-CN': '新兴经济体：MIKT', en: 'Emerging: MIKT', ja: '新興国：MIKT', ko: '신흥국: MIKT', fr: 'Émergent : MIKT', de: 'Schwellenland: MIKT', es: 'Emergente: MIKT', ru: 'Развивающаяся: MIKT' },
  '5': { 'zh-CN': '新兴经济体：G20', en: 'Emerging: G20', ja: '新興国：G20', ko: '신흥국: G20', fr: 'Émergent : G20', de: 'Schwellenland: G20', es: 'Emergente: G20', ru: 'Развивающаяся: G20' },
  '6': { 'zh-CN': '发展中地区', en: 'Developing region', ja: '発展途上地域', ko: '개발도상 지역', fr: 'Région en développement', de: 'Entwicklungsregion', es: 'Región en desarrollo', ru: 'Развивающийся регион' },
  '7': { 'zh-CN': '最不发达地区', en: 'Least developed region', ja: '後発開発途上地域', ko: '최빈개발 지역', fr: 'Pays les moins avancés', de: 'Am wenigsten entwickelt', es: 'País menos adelantado', ru: 'Наименее развитый регион' },
};

/** 收入分组（INCOME_GRP 字段以序号开头） */
export const INCOMES: Record<string, ValueRow> = {
  '1': { 'zh-CN': '高收入：OECD', en: 'High income: OECD', ja: '高所得：OECD', ko: '고소득: OECD', fr: 'Revenu élevé : OCDE', de: 'Hohes Einkommen: OECD', es: 'Renta alta: OCDE', ru: 'Высокий доход: ОЭСР' },
  '2': { 'zh-CN': '高收入：非 OECD', en: 'High income: non-OECD', ja: '高所得：OECD以外', ko: '고소득: OECD 외', fr: 'Revenu élevé : hors OCDE', de: 'Hohes Einkommen: nicht OECD', es: 'Renta alta: no OCDE', ru: 'Высокий доход: не ОЭСР' },
  '3': { 'zh-CN': '中等偏上收入', en: 'Upper middle income', ja: '上位中間所得', ko: '중상위 소득', fr: 'Revenu intermédiaire supérieur', de: 'Oberes mittleres Einkommen', es: 'Renta media alta', ru: 'Доход выше среднего' },
  '4': { 'zh-CN': '中等偏下收入', en: 'Lower middle income', ja: '下位中間所得', ko: '중하위 소득', fr: 'Revenu intermédiaire inférieur', de: 'Unteres mittleres Einkommen', es: 'Renta media baja', ru: 'Доход ниже среднего' },
  '5': { 'zh-CN': '低收入', en: 'Low income', ja: '低所得', ko: '저소득', fr: 'Revenu faible', de: 'Niedriges Einkommen', es: 'Renta baja', ru: 'Низкий доход' },
};

/** 按语言取数据值；查不到时原样返回 */
export function localizeValue(
  lang: Lang,
  value: string | undefined,
  table: Record<string, ValueRow>,
): string | undefined {
  if (!value) return undefined;
  const row = table[value];
  if (!row) return value;
  return row[lang] ?? row.en;
}

/** 形如 "3. Upper middle income" 的字段按前缀序号查表 */
export function localizeRankedValue(
  lang: Lang,
  value: string | undefined,
  table: Record<string, ValueRow>,
): string | undefined {
  if (!value) return undefined;
  const rank = value.match(/^(\d)/)?.[1];
  if (rank && table[rank]) return table[rank][lang] ?? table[rank].en;
  return value;
}
