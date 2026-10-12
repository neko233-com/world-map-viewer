import type { Lang } from '../i18n';

export interface LatLng {
  lat: number;
  lng: number;
}

/** Leaflet 使用的 [lat, lng] 顺序 */
export type LatLngTuple = [number, number];

export const MAX_MAP_LAT = 85.0511287798066;
export const MIN_MAP_ZOOM = 2;
export const MAX_MAP_ZOOM = 8;

const EARTH_RADIUS_KM = 6371.0088;
const RAD = Math.PI / 180;

/** 大圆距离（km） */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * RAD;
  const dLng = (b.lng - a.lng) * RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pathLengthKm(points: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += haversineKm(points[i - 1], points[i]);
  return total;
}

/** 球面插值，与大圆距离一致；对重合点和对跖点保持有限、确定的结果。 */
export function greatCirclePoint(a: LatLng, b: LatLng, fraction: number): LatLng {
  if (fraction <= 0) return { ...a };
  if (fraction >= 1) return { ...b };
  const vector = (point: LatLng) => [
    Math.cos(point.lat * RAD) * Math.cos(point.lng * RAD),
    Math.cos(point.lat * RAD) * Math.sin(point.lng * RAD),
    Math.sin(point.lat * RAD),
  ];
  const start = vector(a);
  const end = vector(b);
  const dot = Math.max(-1, Math.min(1, start.reduce((sum, v, i) => sum + v * end[i], 0)));
  const angle = Math.acos(dot);
  if (angle < 1e-12) return { ...a };
  let tangent = end.map((v, i) => v - dot * start[i]);
  let length = Math.hypot(...tangent);
  if (length < 1e-12) {
    // 对跖点有无限条大圆，选一个与起点垂直的方向。
    tangent = Math.abs(start[2]) < 0.9 ? [-start[1], start[0], 0] : [0, -start[2], start[1]];
    length = Math.hypot(...tangent);
  }
  const theta = angle * fraction;
  const point = start.map((v, i) => v * Math.cos(theta) + tangent[i] / length * Math.sin(theta));
  return {
    lat: Math.atan2(point[2], Math.hypot(point[0], point[1])) / RAD,
    lng: Math.atan2(point[1], point[0]) / RAD,
  };
}

/** 采样大圆并在 ±180° 拆段，避免跨日期变更线时横穿整张地图。 */
export function greatCircleSegments(a: LatLng, b: LatLng): LatLngTuple[][] {
  const count = Math.max(1, Math.ceil(haversineKm(a, b) / EARTH_RADIUS_KM / RAD / 2));
  const segments: LatLngTuple[][] = [[[a.lat, a.lng]]];
  let previous = a;
  for (let i = 1; i <= count; i += 1) {
    const point = greatCirclePoint(a, b, i / count);
    let segment = segments[segments.length - 1];
    if (Math.abs(point.lng - previous.lng) > 180) {
      const boundary = previous.lng >= 0 ? 180 : -180;
      let low = (i - 1) / count;
      let high = i / count;
      for (let n = 0; n < 32; n += 1) {
        const middle = (low + high) / 2;
        const lng = greatCirclePoint(a, b, middle).lng;
        if ((boundary === 180 && lng >= 0) || (boundary === -180 && lng < 0)) low = middle;
        else high = middle;
      }
      const crossing = greatCirclePoint(a, b, (low + high) / 2);
      segment.push([crossing.lat, boundary]);
      segment = [[crossing.lat, -boundary]];
      segments.push(segment);
    }
    segment.push([point.lat, point.lng]);
    previous = point;
  }
  return segments;
}

export function formatDistance(km: number, lang: Lang): string {
  if (!Number.isFinite(km)) return '—';
  if (km < 1) {
    return `${new Intl.NumberFormat(lang, { maximumFractionDigits: 0 }).format(km * 1000)} m`;
  }
  return `${new Intl.NumberFormat(lang, {
    maximumFractionDigits: km < 100 ? 1 : 0,
  }).format(km)} km`;
}

export function formatNumber(value: number, lang: Lang, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(lang, { maximumFractionDigits }).format(value);
}

interface DirectionSet {
  /** 方位词是否写在数值前面（中日韩为前置，拉丁/西里尔为后置） */
  prefix: boolean;
  lat: [string, string];
  lng: [string, string];
}

const DIRECTIONS: Record<Lang, DirectionSet> = {
  'zh-CN': { prefix: true, lat: ['北纬', '南纬'], lng: ['东经', '西经'] },
  en: { prefix: false, lat: ['N', 'S'], lng: ['E', 'W'] },
  ja: { prefix: true, lat: ['北緯', '南緯'], lng: ['東経', '西経'] },
  ko: { prefix: true, lat: ['북위', '남위'], lng: ['동경', '서경'] },
  fr: { prefix: false, lat: ['N', 'S'], lng: ['E', 'O'] },
  de: { prefix: false, lat: ['N', 'S'], lng: ['O', 'W'] },
  es: { prefix: false, lat: ['N', 'S'], lng: ['E', 'O'] },
  ru: { prefix: false, lat: ['с.ш.', 'ю.ш.'], lng: ['в.д.', 'з.д.'] },
};

function degrees(value: number, lang: Lang, digits: number): string {
  return new Intl.NumberFormat(lang, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function dms(value: number): string {
  const abs = Math.abs(value);
  let deg = Math.floor(abs);
  let min = Math.floor((abs - deg) * 60);
  let sec = Math.round(((abs - deg) * 60 - min) * 60);
  if (sec === 60) {
    sec = 0;
    min += 1;
  }
  if (min === 60) {
    min = 0;
    deg += 1;
  }
  return `${deg}°${String(min).padStart(2, '0')}′${String(sec).padStart(2, '0')}″`;
}

function compose(dir: DirectionSet, text: string, word: string): string {
  return dir.prefix ? `${word} ${text}` : `${text} ${word}`;
}

/** 十进制经纬度，如 "北纬 31.2304° · 东经 121.4737°" / "31.2304° N · 121.4737° E" */
export function formatLatLng(point: LatLng, lang: Lang, digits = 4): string {
  const dir = DIRECTIONS[lang] ?? DIRECTIONS.en;
  const lat = compose(dir, `${degrees(Math.abs(point.lat), lang, digits)}°`, dir.lat[point.lat < 0 ? 1 : 0]);
  const lng = compose(dir, `${degrees(Math.abs(point.lng), lang, digits)}°`, dir.lng[point.lng < 0 ? 1 : 0]);
  return `${lat} · ${lng}`;
}

/** 度分秒形式 */
export function formatLatLngDms(point: LatLng, lang: Lang): string {
  const dir = DIRECTIONS[lang] ?? DIRECTIONS.en;
  const lat = compose(dir, dms(point.lat), dir.lat[point.lat < 0 ? 1 : 0]);
  const lng = compose(dir, dms(point.lng), dir.lng[point.lng < 0 ? 1 : 0]);
  return `${lat} · ${lng}`;
}

/** 解析用户输入的坐标：容忍逗号小数、前后空格、全角符号 */
export function parseCoordinate(value: string): number | undefined {
  const normalized = value
    .normalize('NFKC')
    .trim()
    .replace(/[,、]/g, '.')
    .replace(/[−–—]/g, '-')
    .replace(/\s*°$/, '');
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** 校验经纬度范围 */
export function isValidLatLng(lat: number | undefined, lng: number | undefined): boolean {
  return (
    lat !== undefined &&
    lng !== undefined &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}
