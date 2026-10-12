import type { Lang } from '../i18n';
import type { CountryProps, MapData, PlaceProps } from './types';
import { localizedName } from './types';

export type SearchKind = 'country' | 'city';

export interface SearchDoc {
  id: string;
  kind: SearchKind;
  names: Record<string, string>;
  /** 归一化后的候选词（各国语言名 + 别名），用于跨语言匹配 */
  terms: string[];
  /** 各语言的归一化主名称，命中优先级最高 */
  primaryByLang: Record<string, string>;
  lat: number;
  lng: number;
  zoom: number;
  pop: number;
  iso2?: string;
  codes?: string[];
}

/** 保留各语言文字，兼容全角输入、分解韩文与无音标的拉丁名称。 */
export function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, '');
}

function buildTerms(props: CountryProps | PlaceProps): string[] {
  const raw = [...Object.values(props.names), ...props.aliases];
  if ('rank' in props) raw.push(props.id, props.iso2 ?? '', props.iso3 ?? '');
  const terms = new Set<string>();
  for (const value of raw) {
    const normalized = normalizeText(value);
    if (normalized) terms.add(normalized);
  }
  return [...terms];
}

function buildPrimary(props: CountryProps | PlaceProps): Record<string, string> {
  const primary: Record<string, string> = {};
  for (const [lang, value] of Object.entries(props.names)) {
    primary[lang] = normalizeText(value);
  }
  return primary;
}

/** 国家定位缩放级：标注优先级越小（国家越大）越拉远 */
export function countryZoom(rank: number): number {
  if (rank <= 1) return 3;
  if (rank === 2) return 4;
  if (rank <= 4) return 5;
  return 6;
}

function cityZoom(pop: number): number {
  if (pop >= 10_000_000) return 5;
  if (pop >= 2_000_000) return 6;
  if (pop >= 500_000) return 7;
  return 8;
}

export function buildSearchIndex(data: MapData): SearchDoc[] {
  const docs: SearchDoc[] = [];

  for (const feature of data.countries.features) {
    const props = feature.properties;
    // label 字段是 [lng, lat]
    const [lng, lat] = props.label;
    docs.push({
      id: props.id,
      kind: 'country',
      names: props.names,
      terms: buildTerms(props),
      primaryByLang: buildPrimary(props),
      lat,
      lng,
      zoom: countryZoom(props.rank),
      pop: props.pop ?? 0,
      iso2: props.iso2,
      codes: [props.id, props.iso2 ?? '', props.iso3 ?? ''].map(normalizeText).filter(Boolean),
    });
  }

  for (const feature of data.places.features) {
    const props = feature.properties;
    docs.push({
      id: props.id,
      kind: 'city',
      names: props.names,
      terms: buildTerms(props),
      primaryByLang: buildPrimary(props),
      lat: props.lat,
      lng: props.lng,
      zoom: cityZoom(props.pop ?? 0),
      pop: props.pop ?? 0,
      iso2: props.iso2,
    });
  }

  return docs;
}

function scoreDoc(doc: SearchDoc, query: string, lang: Lang): number {
  if (doc.codes?.includes(query)) return 1400;
  const primary = doc.primaryByLang[lang] || doc.primaryByLang.en || '';
  if (primary) {
    if (primary === query) return 1200;
    if (primary.startsWith(query)) return 1000 - primary.length;
    if (primary.includes(query)) return 800 - primary.length;
  }
  let best = 0;
  for (const term of doc.terms) {
    if (term === query) best = Math.max(best, 700);
    else if (term.startsWith(query)) best = Math.max(best, 600 - term.length);
    else if (term.includes(query)) best = Math.max(best, 400 - term.length);
  }
  return best;
}

export function searchDocs(docs: SearchDoc[], rawQuery: string, lang: Lang, limit = 10): SearchDoc[] {
  const query = normalizeText(rawQuery);
  if (!query) return [];

  const scored: { doc: SearchDoc; score: number }[] = [];
  for (const doc of docs) {
    const score = scoreDoc(doc, query, lang);
    if (score > 0) scored.push({ doc, score });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.doc.pop !== a.doc.pop) return b.doc.pop - a.doc.pop;
    return localizedName(a.doc.names, lang).localeCompare(localizedName(b.doc.names, lang), lang);
  });

  return scored.slice(0, limit).map((item) => item.doc);
}
