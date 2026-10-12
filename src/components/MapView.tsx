import { useEffect, useRef, type RefObject } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import type { Appearance, Lang } from '../i18n';
import { translate } from '../i18n/messages';
import { localizedName, type CountryFeature, type CountryProps, type MapData } from '../data/types';
import { formatDistance, haversineKm, type LatLng, type LatLngTuple } from '../lib/geo';
import type { MapMarker, Theme, ViewState } from '../lib/share';
import { nightPolygon, nextTerminatorDelayMs } from '../lib/sun';

export type InteractionMode = 'pan' | 'marker' | 'measure';

export interface MapApi {
  flyTo(lat: number, lng: number, zoom?: number): void;
  zoomBy(delta: number): void;
  reset(): void;
}

export interface MapViewProps {
  data: MapData;
  lang: Lang;
  theme: Theme;
  /** 界面外观，决定政治图层的明暗配色 */
  appearance: Appearance;
  showLabels: boolean;
  showGraticule: boolean;
  markers: MapMarker[];
  measure: LatLng[];
  /** 浏览器定位结果，null 表示尚未定位 */
  myLocation: LatLng | null;
  mode: InteractionMode;
  selectedCountryId: string | null;
  selectedCityId: string | null;
  initialView: ViewState;
  apiRef: RefObject<MapApi | null>;
  onViewChange(view: ViewState): void;
  onPointerMove(point: LatLng | null): void;
  onCountryClick(point: LatLng, id: string): void;
  onCityClick(point: LatLng, id: string): void;
  onMapClick(point: LatLng): void;
}

interface StyleSet {
  landFill: string;
  landLine: string;
  lakeFill: string;
  countryLine: string;
  countryFillOpacity: number;
  hoverLine: string;
  selectedLine: string;
  graticule: string;
  nightFill: string;
  nightLine: string;
  nightOpacity: number;
  accent: string;
  cityFill: string;
  cityLine: string;
}

/** 政治图层两套配色：浅色界面用浅色地图，深色界面用深色地图 */
const STYLES: Record<'politicalLight' | 'politicalDark' | 'night', StyleSet> = {
  politicalLight: {
    landFill: '#eef3f8',
    landLine: '#cbd8e6',
    lakeFill: '#cfe0f0',
    countryLine: '#ffffff',
    countryFillOpacity: 0.78,
    hoverLine: '#3d5a80',
    selectedLine: '#e5484d',
    graticule: '#a9b8c8',
    nightFill: '#0b1b33',
    nightLine: '#e0a33a',
    nightOpacity: 0.42,
    accent: '#007aff',
    cityFill: '#4a5a6b',
    cityLine: '#ffffff',
  },
  politicalDark: {
    landFill: '#232b36',
    landLine: '#333d4a',
    lakeFill: '#1d2733',
    countryLine: '#1b222b',
    countryFillOpacity: 0.62,
    hoverLine: '#8fb8d8',
    selectedLine: '#ff453a',
    graticule: '#39434f',
    nightFill: '#0b1b33',
    nightLine: '#e0a33a',
    nightOpacity: 0.42,
    accent: '#0a84ff',
    cityFill: '#e8eef6',
    cityLine: '#0b1220',
  },
  night: {
    landFill: '#131c28',
    landLine: '#2a3a4d',
    lakeFill: '#16283a',
    countryLine: '#3a4f68',
    countryFillOpacity: 0.85,
    hoverLine: '#8fb8d8',
    selectedLine: '#ffd166',
    graticule: '#2e3f53',
    nightFill: '#000000',
    nightLine: '#ffd166',
    nightOpacity: 0.5,
    accent: '#ffd166',
    cityFill: '#dbe7f3',
    cityLine: '#0b1220',
  },
};

/** 地图配色由「图层 + 界面外观」共同决定：夜间图层始终是暗色，政治图层跟随界面外观 */
function resolvedStyles(theme: Theme, appearance: Appearance): StyleSet {
  if (theme === 'night') return STYLES.night;
  return appearance === 'dark' ? STYLES.politicalDark : STYLES.politicalLight;
}

/** 政治图层配色（按 Natural Earth 的 MAPCOLOR9 索引取色） */
const POLITICAL_PALETTE = [
  '#9dc6e0',
  '#f2c14e',
  '#8fbf7f',
  '#e9a17c',
  '#b9aee0',
  '#e79ab4',
  '#8fd0c8',
  '#d9c98a',
];

/** 图层窗格及其层级，数字越大越靠上 */
const PANES: Record<string, number> = {
  wmvLand: 200,
  wmvLake: 220,
  wmvCountry: 300,
  wmvGraticule: 350,
  wmvNight: 400,
  wmvMeasure: 420,
  wmvCity: 500,
  wmvMarker: 600,
};

interface LabelEntry {
  marker: L.Marker;
  kind: 'country' | 'city';
  rank: number;
  pop: number;
  names: Record<string, string>;
}

interface GraticuleLine {
  layer: L.Polyline;
  strong: boolean;
}

interface LayerBundle {
  land: L.GeoJSON;
  lakes: L.GeoJSON;
  countries: L.GeoJSON<CountryProps>;
  countryShapes: Map<string, L.Path>;
  cityMarkers: Map<string, L.CircleMarker>;
  cityRadii: Map<string, number>;
  cityMajor: L.LayerGroup;
  cityMinor: L.LayerGroup;
  labels: LabelEntry[];
  labelGroup: L.LayerGroup;
  markerGroup: L.LayerGroup;
  myLocationGroup: L.LayerGroup;
  measureGroup: L.LayerGroup;
  graticuleGroup: L.LayerGroup;
  graticuleLines: GraticuleLine[];
  nightGroup: L.LayerGroup;
}

function countryLabelVisible(rank: number, zoom: number): boolean {
  if (zoom < 3) return rank <= 2;
  if (zoom < 4) return rank <= 3;
  if (zoom < 5) return rank <= 4;
  if (zoom < 6) return rank <= 6;
  return true;
}

function cityLabelVisible(pop: number, zoom: number): boolean {
  if (pop >= 10_000_000) return zoom >= 3.5;
  if (pop >= 2_000_000) return zoom >= 4.5;
  if (pop >= 500_000) return zoom >= 5.5;
  return zoom >= 6.5;
}

function cityRadius(pop: number): number {
  if (pop >= 10_000_000) return 4.6;
  if (pop >= 2_000_000) return 3.4;
  return 2.6;
}

function countryStyle(
  feature: CountryFeature,
  hovered: boolean,
  theme: Theme,
  appearance: Appearance,
  selectedCountryId: string | null,
): L.PathOptions {
  const style = resolvedStyles(theme, appearance);
  const props = feature.properties;
  const selected = props.id === selectedCountryId;

  let fill: string;
  let fillOpacity: number;

  if (selected) {
    fill = '#2b3f58';
    fillOpacity = 0.95;
  } else if (theme === 'political') {
    fill = POLITICAL_PALETTE[props.color % POLITICAL_PALETTE.length];
    fillOpacity = style.countryFillOpacity;
  } else {
    fill = '#0f1723';
    fillOpacity = style.countryFillOpacity;
  }

  return {
    pane: 'wmvCountry',
    color: selected ? style.selectedLine : hovered ? style.hoverLine : style.countryLine,
    weight: selected ? 2 : hovered ? 1.5 : 0.6,
    opacity: selected || hovered ? 1 : 0.9,
    fillColor: fill,
    fillOpacity,
  };
}

export function MapView(props: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const bundleRef = useRef<LayerBundle | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  // ── 初始化：地图、窗格与全部图层只创建一次 ─────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const { data, initialView } = propsRef.current;
    const initialTheme = propsRef.current.theme;

    const map = L.map(container, {
      center: [initialView.lat, initialView.lng],
      zoom: initialView.zoom,
      minZoom: 2,
      maxZoom: 8,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      maxBounds: L.latLngBounds([-90, -180], [90, 180]),
      maxBoundsViscosity: 1,
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: false,
    });
    mapRef.current = map;

    for (const [name, zIndex] of Object.entries(PANES)) {
      const pane = map.createPane(name);
      pane.style.zIndex = String(zIndex);
      // 底图与夜间图层不拦截鼠标事件
      if (name === 'wmvNight' || name === 'wmvGraticule') pane.style.pointerEvents = 'none';
    }

    const style = resolvedStyles(initialTheme, propsRef.current.appearance);

    const land = L.geoJSON(data.land, {
      pane: 'wmvLand',
      interactive: false,
      style: {
        pane: 'wmvLand',
        color: style.landLine,
        weight: 0.5,
        fillColor: style.landFill,
        fillOpacity: 1,
      },
    }).addTo(map);

    const lakes = L.geoJSON(data.lakes, {
      pane: 'wmvLake',
      interactive: false,
      style: {
        pane: 'wmvLake',
        color: style.landLine,
        weight: 0.4,
        fillColor: style.lakeFill,
        fillOpacity: 1,
      },
    }).addTo(map);

    const countryShapes = new Map<string, L.Path>();
    const countries = L.geoJSON<CountryProps>(data.countries, {
      pane: 'wmvCountry',
      bubblingMouseEvents: false,
      style: (feature) =>
        countryStyle(
          feature as CountryFeature,
          false,
          propsRef.current.theme,
          propsRef.current.appearance,
          propsRef.current.selectedCountryId,
        ),
      onEachFeature: (feature, layer) => {
        const country = feature as CountryFeature;
        const path = layer as L.Path;
        countryShapes.set(country.properties.id, path);

        path.on('mouseover', () => {
          path.setStyle(
            countryStyle(
              country,
              true,
              propsRef.current.theme,
              propsRef.current.appearance,
              propsRef.current.selectedCountryId,
            ),
          );
          path.bringToFront();
        });
        path.on('mouseout', () => {
          path.setStyle(
            countryStyle(
              country,
              false,
              propsRef.current.theme,
              propsRef.current.appearance,
              propsRef.current.selectedCountryId,
            ),
          );
        });
        path.on('click', (event: L.LeafletMouseEvent) => {
          propsRef.current.onCountryClick(
            { lat: event.latlng.lat, lng: event.latlng.lng },
            country.properties.id,
          );
        });
      },
    }).addTo(map);

    // 城市点：前 45 个始终显示，其余在高缩放级别显示
    const cityMarkers = new Map<string, L.CircleMarker>();
    const cityRadii = new Map<string, number>();
    const cityMajor = L.layerGroup([], { pane: 'wmvCity' }).addTo(map);
    const cityMinor = L.layerGroup([], { pane: 'wmvCity' });

    const cityLabels: LabelEntry[] = [];
    const sortedCities = [...data.places.features].sort(
      (a, b) => (b.properties.pop ?? 0) - (a.properties.pop ?? 0),
    );

    sortedCities.forEach((feature, index) => {
      const city = feature.properties;
      const radius = cityRadius(city.pop ?? 0);
      const dot = L.circleMarker([city.lat, city.lng], {
        pane: 'wmvCity',
        radius,
        color: style.cityLine,
        weight: 1,
        fillColor: style.cityFill,
        fillOpacity: 0.95,
        bubblingMouseEvents: false,
      });
      dot.on('click', (event: L.LeafletMouseEvent) => {
        propsRef.current.onCityClick(
          { lat: event.latlng.lat, lng: event.latlng.lng },
          city.id,
        );
      });
      dot.addTo(index < 45 ? cityMajor : cityMinor);
      cityMarkers.set(city.id, dot);
      cityRadii.set(city.id, radius);

      const anchor = L.marker([city.lat, city.lng], {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({ className: 'wmv-anchor', html: '', iconSize: [0, 0] }),
      });
      anchor.bindTooltip(localizedName(city.names, propsRef.current.lang), {
        permanent: true,
        direction: 'right',
        offset: [7, 0],
        className: 'wmv-label wmv-label--city',
      });
      cityLabels.push({
        marker: anchor,
        kind: 'city',
        rank: 9,
        pop: city.pop ?? 0,
        names: city.names,
      });
    });

    // 国名锚点用 Natural Earth 的标注坐标，避免多变体国家用几何中心定位
    const countryLabels: LabelEntry[] = data.countries.features.map((feature) => {
      const country = feature.properties;
      const anchor = L.marker([country.label[1], country.label[0]], {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({ className: 'wmv-anchor', html: '', iconSize: [0, 0] }),
      });
      anchor.bindTooltip(localizedName(country.names, propsRef.current.lang), {
        permanent: true,
        direction: 'center',
        className: 'wmv-label wmv-label--country',
      });
      return {
        marker: anchor,
        kind: 'country',
        rank: country.rank,
        pop: country.pop ?? 0,
        names: country.names,
      };
    });

    const labelGroup = L.layerGroup([], { pane: 'wmvMarker' }).addTo(map);
    const markerGroup = L.layerGroup([], { pane: 'wmvMarker' }).addTo(map);
    const myLocationGroup = L.layerGroup([], { pane: 'wmvMarker' }).addTo(map);
    const measureGroup = L.layerGroup([], { pane: 'wmvMeasure' }).addTo(map);
    const graticuleGroup = L.layerGroup([], { pane: 'wmvGraticule' });
    const nightGroup = L.layerGroup([], { pane: 'wmvNight' }).addTo(map);

    // 经纬网：每 30° 一条，赤道与本初子午线加粗
    const graticuleLines: GraticuleLine[] = [];
    const lineSpecs: { points: LatLngTuple[]; strong: boolean }[] = [];
    for (let lng = -180; lng <= 180; lng += 30) {
      lineSpecs.push({ points: [[-84, lng], [84, lng]], strong: lng === 0 });
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      lineSpecs.push({ points: [[lat, -180], [lat, 180]], strong: lat === 0 });
    }
    for (const spec of lineSpecs) {
      const layer = L.polyline(spec.points, {
        pane: 'wmvGraticule',
        interactive: false,
        color: style.graticule,
        weight: spec.strong ? 1.1 : 0.6,
        opacity: spec.strong ? 0.9 : 0.7,
      }).addTo(graticuleGroup);
      graticuleLines.push({ layer, strong: spec.strong });
    }

    bundleRef.current = {
      land,
      lakes,
      countries,
      countryShapes,
      cityMarkers,
      cityRadii,
      cityMajor,
      cityMinor,
      labels: [...countryLabels, ...cityLabels],
      labelGroup,
      markerGroup,
      myLocationGroup,
      measureGroup,
      graticuleGroup,
      graticuleLines,
      nightGroup,
    };

    map.on('click', (event: L.LeafletMouseEvent) => {
      propsRef.current.onMapClick({ lat: event.latlng.lat, lng: event.latlng.lng });
    });
    map.on('mousemove', (event: L.LeafletMouseEvent) => {
      propsRef.current.onPointerMove({ lat: event.latlng.lat, lng: event.latlng.lng });
    });
    map.on('mouseout', () => propsRef.current.onPointerMove(null));
    map.on('moveend', () => {
      const center = map.getCenter();
      propsRef.current.onViewChange({
        lat: center.lat,
        lng: center.lng,
        zoom: map.getZoom(),
      });
    });

    propsRef.current.apiRef.current = {
      flyTo: (lat, lng, zoom) => map.flyTo([lat, lng], zoom ?? map.getZoom(), { duration: 0.7 }),
      zoomBy: (delta) => map.setZoom(map.getZoom() + delta),
      reset: () => map.flyTo([20, 0], 2, { duration: 0.7 }),
    };

    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      propsRef.current.apiRef.current = null;
      bundleRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  // ── 主题切换：底图、经纬网、城市点配色 ─────────────────────────────
  useEffect(() => {
    const bundle = bundleRef.current;
    if (!bundle) return;
    const style = resolvedStyles(props.theme, props.appearance);

    bundle.land.setStyle({
      pane: 'wmvLand',
      color: style.landLine,
      weight: 0.5,
      fillColor: style.landFill,
      fillOpacity: 1,
    });
    bundle.lakes.setStyle({
      pane: 'wmvLake',
      color: style.landLine,
      weight: 0.4,
      fillColor: style.lakeFill,
      fillOpacity: 1,
    });
    for (const line of bundle.graticuleLines) {
      line.layer.setStyle({
        color: style.graticule,
        weight: line.strong ? 1.1 : 0.6,
        opacity: line.strong ? 0.9 : 0.7,
      });
    }
    bundle.cityMarkers.forEach((dot) => {
      dot.setStyle({ color: style.cityLine, fillColor: style.cityFill });
    });
  }, [props.theme, props.appearance]);

  // ── 夜间图层：实时昼夜分界线，每分钟刷新 ──────────────────────────
  useEffect(() => {
    const bundle = bundleRef.current;
    if (!bundle) return;

    if (props.theme !== 'night') {
      bundle.nightGroup.clearLayers();
      return;
    }

    const draw = () => {
      const style = STYLES.night;
      bundle.nightGroup.clearLayers();
      L.polygon(nightPolygon(new Date()), {
        pane: 'wmvNight',
        interactive: false,
        color: style.nightLine,
        weight: 1,
        opacity: 0.8,
        dashArray: '5 5',
        fillColor: style.nightFill,
        fillOpacity: style.nightOpacity,
      }).addTo(bundle.nightGroup);
    };

    draw();
    const timer = window.setInterval(draw, nextTerminatorDelayMs());
    return () => window.clearInterval(timer);
  }, [props.theme]);

  // ── 标注显隐：开关 + 按缩放分级 ───────────────────────────────────
  useEffect(() => {
    const bundle = bundleRef.current;
    const map = mapRef.current;
    if (!bundle || !map) return;

    const syncLabels = () => {
      const zoom = map.getZoom();
      for (const entry of bundle.labels) {
        const visible = props.showLabels
          ? entry.kind === 'country'
            ? countryLabelVisible(entry.rank, zoom)
            : cityLabelVisible(entry.pop, zoom)
          : false;
        const attached = bundle.labelGroup.hasLayer(entry.marker);
        if (visible && !attached) bundle.labelGroup.addLayer(entry.marker);
        else if (!visible && attached) bundle.labelGroup.removeLayer(entry.marker);
      }
    };

    const syncCities = () => {
      const showMinor = map.getZoom() >= 4.5;
      if (showMinor && !map.hasLayer(bundle.cityMinor)) map.addLayer(bundle.cityMinor);
      else if (!showMinor && map.hasLayer(bundle.cityMinor)) map.removeLayer(bundle.cityMinor);
    };

    syncLabels();
    syncCities();
    map.on('zoomend', syncLabels);
    map.on('zoomend', syncCities);

    return () => {
      map.off('zoomend', syncLabels);
      map.off('zoomend', syncCities);
    };
  }, [props.showLabels]);

  // ── 语言切换：刷新全部标注文本 ────────────────────────────────────
  useEffect(() => {
    const bundle = bundleRef.current;
    if (!bundle) return;
    for (const entry of bundle.labels) {
      entry.marker.setTooltipContent(localizedName(entry.names, props.lang));
    }
  }, [props.lang]);

  // ── 经纬网开关 ───────────────────────────────────────────────────
  useEffect(() => {
    const bundle = bundleRef.current;
    const map = mapRef.current;
    if (!bundle || !map) return;
    if (props.showGraticule && !map.hasLayer(bundle.graticuleGroup)) {
      map.addLayer(bundle.graticuleGroup);
    } else if (!props.showGraticule && map.hasLayer(bundle.graticuleGroup)) {
      map.removeLayer(bundle.graticuleGroup);
    }
  }, [props.showGraticule]);

  // ── 标记点 ───────────────────────────────────────────────────────
  useEffect(() => {
    const bundle = bundleRef.current;
    if (!bundle) return;
    bundle.markerGroup.clearLayers();
    const icon = L.divIcon({
      className: 'wmv-pin',
      html: '<span></span>',
      iconSize: [20, 20],
      iconAnchor: [10, 20],
    });
    for (const marker of props.markers) {
      L.marker([marker.lat, marker.lng], { icon, pane: 'wmvMarker', riseOnHover: true })
        .bindTooltip(marker.name, {
          direction: 'top',
          offset: [0, -18],
          className: 'wmv-tip',
        })
        .addTo(bundle.markerGroup);
    }
  }, [props.markers]);

  // ── 我的位置（浏览器定位结果）─────────────────────────────────────
  useEffect(() => {
    const bundle = bundleRef.current;
    if (!bundle) return;
    bundle.myLocationGroup.clearLayers();
    if (!props.myLocation) return;

    const icon = L.divIcon({
      className: 'wmv-locate',
      html: '<span class="wmv-locate__pulse"></span><span class="wmv-locate__dot"></span>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
    L.marker([props.myLocation.lat, props.myLocation.lng], {
      icon,
      pane: 'wmvMarker',
      zIndexOffset: 500,
    })
      .bindTooltip(translate(props.lang, 'locate.myPosition'), {
        direction: 'top',
        offset: [0, -12],
        className: 'wmv-tip',
      })
      .addTo(bundle.myLocationGroup);
  }, [props.myLocation, props.lang]);

  // ── 测距路径 ─────────────────────────────────────────────────────
  useEffect(() => {
    const bundle = bundleRef.current;
    if (!bundle) return;
    bundle.measureGroup.clearLayers();
    const points = props.measure;
    if (!points.length) return;

    const style = resolvedStyles(props.theme, props.appearance);
    const latlngs = points.map((point) => [point.lat, point.lng] as LatLngTuple);
    if (latlngs.length > 1) {
      L.polyline(latlngs, {
        pane: 'wmvMeasure',
        color: style.accent,
        weight: 2.5,
        dashArray: '6 4',
      }).addTo(bundle.measureGroup);
    }

    points.forEach((point, index) => {
      L.circleMarker([point.lat, point.lng], {
        pane: 'wmvMeasure',
        radius: 4,
        color: '#ffffff',
        weight: 1.5,
        fillColor: style.accent,
        fillOpacity: 1,
      }).addTo(bundle.measureGroup);

      if (index > 0) {
        const previous = points[index - 1];
        const middle: LatLngTuple = [
          (point.lat + previous.lat) / 2,
          (point.lng + previous.lng) / 2,
        ];
        L.marker(middle, {
          interactive: false,
          keyboard: false,
          icon: L.divIcon({ className: 'wmv-anchor', html: '', iconSize: [0, 0] }),
        })
          .bindTooltip(formatDistance(haversineKm(previous, point), props.lang), {
            permanent: true,
            direction: 'center',
            className: 'wmv-tip wmv-tip--measure',
          })
          .addTo(bundle.measureGroup);
      }
    });
  }, [props.measure, props.lang, props.theme, props.appearance]);

  // ── 选中高亮 ─────────────────────────────────────────────────────
  useEffect(() => {
    const bundle = bundleRef.current;
    if (!bundle) return;

    bundle.countries.setStyle((feature) =>
      countryStyle(
        feature as CountryFeature,
        false,
        props.theme,
        props.appearance,
        props.selectedCountryId,
      ),
    );

    const shape = props.selectedCountryId
      ? bundle.countryShapes.get(props.selectedCountryId)
      : undefined;
    shape?.bringToFront();

    const style = resolvedStyles(props.theme, props.appearance);
    bundle.cityMarkers.forEach((dot, id) => {
      const selected = id === props.selectedCityId;
      dot.setRadius(selected ? (bundle.cityRadii.get(id) ?? 3) * 1.9 : bundle.cityRadii.get(id) ?? 3);
      dot.setStyle({
        color: selected ? style.accent : style.cityLine,
        weight: selected ? 2 : 1,
      });
    });
  }, [props.selectedCountryId, props.selectedCityId, props.theme, props.appearance]);

  // ── 交互模式：光标样式 ────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.classList.toggle('is-mode-marker', props.mode === 'marker');
    container.classList.toggle('is-mode-measure', props.mode === 'measure');
  }, [props.mode]);

  return <div className="wmv-map" ref={containerRef} data-mode={props.mode} />;
}
