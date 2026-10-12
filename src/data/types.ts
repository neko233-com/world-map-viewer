import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon } from 'geojson';

/** 国家/地区的裁剪后属性（由 scripts/fetch-data.mjs 生成） */
export interface CountryProps {
  id: string;
  iso2?: string;
  iso3?: string;
  /** 语言代码 → 名称，如 { "zh-CN": "中国", en: "China" } */
  names: Record<string, string>;
  /** 用于搜索命中的全称、旧称、异体译名 */
  aliases: string[];
  formal?: string;
  continent?: string;
  region?: string;
  subregion?: string;
  pop?: number;
  popYear?: number;
  /** 单位：百万美元 */
  gdp?: number;
  economy?: string;
  income?: string;
  /** Natural Earth 的标注优先级，0/1 为大国 */
  rank: number;
  /** 标注锚点 [lng, lat] */
  label: [number, number];
  color: number;
  tiny: number;
  wiki?: string;
}

export interface PlaceProps {
  id: string;
  iso2?: string;
  names: Record<string, string>;
  aliases: string[];
  admin1?: string;
  pop?: number;
  tz?: string;
  capital?: true;
  lat: number;
  lng: number;
  wiki?: string;
}

export type CountryFeature = Feature<Polygon | MultiPolygon, CountryProps>;
export type CountryCollection = FeatureCollection<Polygon | MultiPolygon, CountryProps>;
export type PlaceFeature = Feature<Point, PlaceProps>;
export type PlaceCollection = FeatureCollection<Point, PlaceProps>;
/** 只有几何、没有属性的底图图层（陆地、湖泊） */
export type PlainCollection = FeatureCollection<Polygon | MultiPolygon, Record<string, never>>;

export interface DataMeta {
  level: string;
  generatedAt: string;
  attribution: string;
  source: string;
  languages: string[];
  counts: Record<string, number>;
}

export interface MapData {
  countries: CountryCollection;
  land: PlainCollection;
  lakes: PlainCollection;
  places: PlaceCollection;
  meta: DataMeta;
  countryById: Map<string, CountryFeature>;
  countryByIso2: Map<string, CountryFeature>;
  placeById: Map<string, PlaceFeature>;
}

/** 取当前语言名称，缺失时依次回退到英文、中文、任意一个名称 */
export function localizedName(names: Record<string, string>, lang: string): string {
  return names[lang] || names.en || names['zh-CN'] || Object.values(names)[0] || '';
}

/** 结果列表里展示的"另一语言"名称 */
export function secondaryName(names: Record<string, string>, lang: string): string | undefined {
  const other = Object.entries(names).find(([code, value]) => code !== lang && value);
  return other?.[1];
}
