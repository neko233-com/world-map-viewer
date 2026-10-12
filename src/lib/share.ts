import type { Lang } from '../i18n';
import type { LatLng } from './geo';

export type Theme = 'political' | 'night';

export interface ViewState {
  lat: number;
  lng: number;
  zoom: number;
}

export interface MapMarker extends LatLng {
  id: string;
  name: string;
}

export interface UrlState {
  view: ViewState;
  lang?: Lang;
  theme?: Theme;
  labels?: boolean;
  graticule?: boolean;
  markers: MapMarker[];
  measure: LatLng[];
}

export const DEFAULT_VIEW: ViewState = { lat: 20, lng: 0, zoom: 2 };

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function parseLatLngPair(text: string): LatLng | null {
  const [lat, lng] = text.split(',').map(Number);
  if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function parseBool(value: string | null): boolean | undefined {
  if (value === null) return undefined;
  return value === '1' || value === 'true';
}

/** 解析地址栏 hash；容错处理，任何异常字段都退回到默认值 */
export function decodeHash(hash: string): UrlState {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));
  const zoom = Number(params.get('z'));

  const langParam = params.get('lang');
  const themeParam = params.get('theme');

  const markers: MapMarker[] = [];
  const markerText = params.get('mk');
  if (markerText) {
    for (const item of markerText.split(';')) {
      const [pair, encodedName] = item.split('~');
      const point = parseLatLngPair(pair ?? '');
      if (!point) continue;
      let name = '';
      if (encodedName) {
        try {
          name = decodeURIComponent(encodedName);
        } catch {
          name = encodedName;
        }
      }
      markers.push({ ...point, id: `m${markers.length}`, name });
    }
  }

  const measure: LatLng[] = [];
  const measureText = params.get('ms');
  if (measureText) {
    for (const item of measureText.split(';')) {
      const point = parseLatLngPair(item);
      if (point) measure.push(point);
    }
  }

  return {
    view: {
      lat: isFiniteNumber(lat) && lat >= -90 && lat <= 90 ? lat : DEFAULT_VIEW.lat,
      lng: isFiniteNumber(lng) && lng >= -180 && lng <= 180 ? lng : DEFAULT_VIEW.lng,
      zoom: isFiniteNumber(zoom) && zoom >= 1 && zoom <= 12 ? zoom : DEFAULT_VIEW.zoom,
    },
    lang: langParam === 'zh-CN' || langParam === 'en' ? langParam : undefined,
    theme: themeParam === 'political' || themeParam === 'night' ? themeParam : undefined,
    labels: parseBool(params.get('lbl')),
    graticule: parseBool(params.get('grat')),
    markers,
    measure,
  };
}

export interface EncodeInput {
  view: ViewState;
  lang: Lang;
  theme: Theme;
  labels: boolean;
  graticule: boolean;
  markers: MapMarker[];
  measure: LatLng[];
}

/** 把视图与状态编码进 hash，便于分享与刷新恢复 */
export function encodeHash(input: EncodeInput): string {
  const params = new URLSearchParams();
  params.set('lat', input.view.lat.toFixed(4));
  params.set('lng', input.view.lng.toFixed(4));
  params.set('z', String(Math.round(input.view.zoom * 100) / 100));
  params.set('lang', input.lang);
  params.set('theme', input.theme);
  params.set('lbl', input.labels ? '1' : '0');
  params.set('grat', input.graticule ? '1' : '0');

  if (input.markers.length) {
    params.set(
      'mk',
      input.markers
        .map(
          (marker) =>
            `${marker.lat.toFixed(4)},${marker.lng.toFixed(4)}~${encodeURIComponent(marker.name)}`,
        )
        .join(';'),
    );
  }
  if (input.measure.length) {
    params.set(
      'ms',
      input.measure.map((point) => `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`).join(';'),
    );
  }

  return `#${params.toString()}`;
}
