import type {
  CountryCollection,
  CountryFeature,
  DataMeta,
  MapData,
  PlaceCollection,
  PlaceFeature,
  PlainCollection,
} from './types';

// 数据由 scripts/fetch-data.mjs 生成在 public/data 下，运行时只读本地文件
const DATA_BASE = `${import.meta.env.BASE_URL}data/`;

async function loadJson<T>(file: string): Promise<T> {
  const response = await fetch(`${DATA_BASE}${file}`);
  if (!response.ok) {
    throw new Error(`无法加载 data/${file}（HTTP ${response.status}）`);
  }
  return (await response.json()) as T;
}

let dataPromise: Promise<MapData> | undefined;

/** StrictMode / remounts share one request batch; failures remain retryable. */
export function loadMapData(): Promise<MapData> {
  if (!dataPromise) {
    dataPromise = readMapData().catch((error: unknown) => {
      dataPromise = undefined;
      throw error;
    });
  }
  return dataPromise;
}

async function readMapData(): Promise<MapData> {
  const [countries, land, lakes, places, meta] = await Promise.all([
    loadJson<CountryCollection>('countries.geojson'),
    loadJson<PlainCollection>('land.geojson'),
    loadJson<PlainCollection>('lakes.geojson'),
    loadJson<PlaceCollection>('places.geojson'),
    loadJson<DataMeta>('meta.json'),
  ]);

  const countryById = new Map<string, CountryFeature>();
  const countryByIso2 = new Map<string, CountryFeature>();
  for (const feature of countries.features) {
    countryById.set(feature.properties.id, feature);
    const iso2 = feature.properties.iso2;
    if (iso2 && !countryByIso2.has(iso2)) countryByIso2.set(iso2, feature);
  }

  const placeById = new Map<string, PlaceFeature>();
  for (const feature of places.features) placeById.set(feature.properties.id, feature);

  return { countries, land, lakes, places, meta, countryById, countryByIso2, placeById };
}
