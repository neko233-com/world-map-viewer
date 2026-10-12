import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AppearanceProvider, I18nProvider, useAppearance, useI18n } from './i18n';
import { loadMapData } from './data/load';
import { buildSearchIndex, countryZoom, type SearchDoc } from './data/search';
import type { CountryFeature, MapData } from './data/types';
import { MapView, type InteractionMode, type MapApi } from './components/MapView';
import { Toolbar } from './components/Toolbar';
import { SearchPanel } from './components/SearchPanel';
import { InfoCard } from './components/InfoCard';
import { MarkersPanel } from './components/MarkersPanel';
import { MeasurePanel } from './components/MeasurePanel';
import { StatusBar } from './components/StatusBar';
import { copyText } from './lib/clipboard';
import { isValidLatLng, type LatLng } from './lib/geo';
import { decodeHash, encodeHash, type MapMarker, type Theme, type ViewState } from './lib/share';

import './styles.css';

function MapApp() {
  const { t, lang, setPref: setLangPref } = useI18n();
  const { resolved: appearance } = useAppearance();

  // 初始状态来自地址栏 hash，便于分享与刷新恢复
  const initialState = useMemo(() => decodeHash(window.location.hash), []);

  const [data, setData] = useState<MapData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>(initialState.view);
  const [theme, setTheme] = useState<Theme>(initialState.theme ?? 'political');
  const [showLabels, setShowLabels] = useState(initialState.labels ?? true);
  const [showGraticule, setShowGraticule] = useState(initialState.graticule ?? false);
  const [mode, setMode] = useState<InteractionMode>('pan');
  const [markers, setMarkers] = useState<MapMarker[]>(initialState.markers);
  const [measure, setMeasure] = useState<LatLng[]>(initialState.measure);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [pointer, setPointer] = useState<LatLng | null>(null);
  const [myLocation, setMyLocation] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(() => !window.matchMedia('(max-width: 900px)').matches);

  const apiRef = useRef<MapApi | null>(null);
  const markerSeq = useRef(initialState.markers.length);
  const lastPointerAt = useRef(0);
  const urlTimerRef = useRef<number | undefined>(undefined);
  const locatingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadMapData()
      .then((loaded) => {
        if (!cancelled) setData(loaded);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const searchIndex = useMemo(() => (data ? buildSearchIndex(data) : []), [data]);
  const countries = useMemo(() => data?.countries.features ?? [], [data]);

  useEffect(() => {
    if (initialState.lang) setLangPref(initialState.lang);
  }, [initialState.lang, setLangPref]);

  // 视图与状态写入 URL（节流 250ms，replaceState 不污染历史记录）
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const hash = encodeHash({
        view,
        lang,
        theme,
        labels: showLabels,
        graticule: showGraticule,
        markers,
        measure,
      });
      window.history.replaceState(null, '', hash);
    }, 250);
    urlTimerRef.current = timer;
    return () => window.clearTimeout(timer);
  }, [view, lang, theme, showLabels, showGraticule, markers, measure]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // 同标签页内编辑地址栏 hash（粘贴分享链接）时同步恢复状态；
  // 自身写入用的是 replaceState，不会触发 hashchange，因此没有回环风险
  useEffect(() => {
    const onHashChange = () => {
      const next = decodeHash(window.location.hash);
      window.clearTimeout(urlTimerRef.current);
      setView(next.view);
      setTheme(next.theme ?? 'political');
      setShowLabels(next.labels ?? true);
      setShowGraticule(next.graticule ?? false);
      setMarkers(next.markers);
      setMeasure(next.measure);
      markerSeq.current = next.markers.length;
      setSelectedCountryId(null);
      setSelectedCityId(null);
      setMode('pan');
      if (next.lang) setLangPref(next.lang);
      apiRef.current?.restoreView(next.view);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [setLangPref]);

  // 指针坐标节流更新，避免每次 mousemove 都触发整棵树重渲染
  const handlePointerMove = useCallback((point: LatLng | null) => {
    if (!point) {
      // 保留最后的位置，让用户移到状态栏后仍能复制坐标。
      return;
    }
    if (!isValidLatLng(point.lat, point.lng)) return;
    const now = performance.now();
    if (now - lastPointerAt.current < 60) return;
    lastPointerAt.current = now;
    setPointer(point);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCountryId(null);
    setSelectedCityId(null);
  }, []);

  const handleMapClick = useCallback(
    (point: LatLng) => {
      if (!isValidLatLng(point.lat, point.lng)) return;
      if (mode === 'marker') {
        markerSeq.current += 1;
        const seq = markerSeq.current;
        setMarkers((previous) => [
          ...previous,
          {
            id: `marker-${Date.now().toString(36)}-${seq}`,
            name: t('panel.marker.default', { n: seq }),
            lat: point.lat,
            lng: point.lng,
          },
        ]);
        return;
      }
      if (mode === 'measure') {
        setMeasure((previous) => [...previous, point]);
        return;
      }
      clearSelection();
    },
    [mode, t, clearSelection],
  );

  const handleCountryClick = useCallback(
    (point: LatLng, id: string) => {
      if (mode !== 'pan') {
        handleMapClick(point);
        return;
      }
      setSelectedCountryId(id);
      setSelectedCityId(null);
      setPanelOpen(true);
    },
    [mode, handleMapClick],
  );

  const handleCityClick = useCallback(
    (point: LatLng, id: string) => {
      if (mode !== 'pan') {
        handleMapClick(point);
        return;
      }
      setSelectedCityId(id);
      setSelectedCountryId(null);
      setPanelOpen(true);
    },
    [mode, handleMapClick],
  );

  const handlePick = useCallback((doc: SearchDoc) => {
    apiRef.current?.flyTo(doc.lat, doc.lng, doc.zoom);
    if (doc.kind === 'country') {
      setSelectedCountryId(doc.id);
      setSelectedCityId(null);
    } else {
      setSelectedCityId(doc.id);
      setSelectedCountryId(null);
    }
    setPanelOpen(true);
  }, []);

  const handlePickCountry = useCallback((country: CountryFeature) => {
    const [lng, lat] = country.properties.label;
    apiRef.current?.flyTo(lat, lng, countryZoom(country.properties.rank));
    setSelectedCountryId(country.properties.id);
    setSelectedCityId(null);
    setPanelOpen(true);
  }, []);

  const handleJump = useCallback(
    (point: LatLng) => {
      apiRef.current?.flyTo(point.lat, point.lng, Math.max(view.zoom, 6));
      if (window.matchMedia('(max-width: 900px)').matches) setPanelOpen(false);
    },
    [view.zoom],
  );

  const handleLocate = useCallback(() => {
    if (locatingRef.current) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setToast(t('locate.unavailable'));
      return;
    }
    setLocating(true);
    locatingRef.current = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        locatingRef.current = false;
        const point = { lat: position.coords.latitude, lng: position.coords.longitude };
        setMyLocation(point);
        apiRef.current?.flyTo(point.lat, point.lng, 8);
        setToast(t('locate.myPosition'));
      },
      (error) => {
        setLocating(false);
        locatingRef.current = false;
        setToast(
          t(
            error.code === error.PERMISSION_DENIED
              ? 'locate.denied'
              : error.code === error.TIMEOUT
                ? 'locate.timeout'
                : 'locate.unavailable',
          ),
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }, [t]);

  const handleShare = useCallback(async () => {
    const hash = encodeHash({
      view: apiRef.current?.getView() ?? view,
      lang, theme, labels: showLabels, graticule: showGraticule, markers, measure,
    });
    window.clearTimeout(urlTimerRef.current);
    window.history.replaceState(null, '', hash);
    const ok = await copyText(window.location.href);
    setToast(t(ok ? 'app.share.done' : 'app.share.fail'));
  }, [view, lang, theme, showLabels, showGraticule, markers, measure, t]);

  const togglePanel = useCallback(() => setPanelOpen((open) => !open), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);
  const changeMode = useCallback((next: InteractionMode) => {
    setMode(next);
    if (next !== 'pan' && window.matchMedia('(max-width: 900px)').matches) setPanelOpen(false);
  }, []);

  const handleReset = useCallback(() => {
    apiRef.current?.reset();
    clearSelection();
  }, [clearSelection]);

  const renameMarker = useCallback((id: string, name: string) => {
    setMarkers((previous) =>
      previous.map((marker) => (marker.id === id ? { ...marker, name } : marker)),
    );
  }, []);

  const removeMarker = useCallback((id: string) => {
    setMarkers((previous) => previous.filter((marker) => marker.id !== id));
  }, []);

  const clearMarkers = useCallback(() => setMarkers([]), []);

  const zoomToMarker = useCallback(
    (marker: MapMarker) => {
      apiRef.current?.flyTo(marker.lat, marker.lng, Math.max(view.zoom, 6));
    },
    [view.zoom],
  );

  const undoMeasure = useCallback(() => setMeasure((previous) => previous.slice(0, -1)), []);
  const clearMeasure = useCallback(() => setMeasure([]), []);

  // Esc：退出标记/测距模式（输入框内的 Esc 交给各自处理）
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      setMode((current) => (current === 'pan' ? current : 'pan'));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (loadError) {
    return (
      <div className="screen">
        <h1>{t('app.error.title')}</h1>
        <p>{t('app.error.body')}</p>
        <code>{loadError}</code>
        <button type="button" className="button button--filled" onClick={() => window.location.reload()}>
          {t('app.reload')}
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="screen">
        <div className="spinner" />
        <p>{t('app.loading')}</p>
      </div>
    );
  }

  const selectedCountry = selectedCountryId ? data.countryById.get(selectedCountryId) ?? null : null;
  const selectedCity = selectedCityId ? data.placeById.get(selectedCityId) ?? null : null;

  return (
    <div className="app" data-layer={theme} data-appearance={appearance}>
      <Toolbar
        theme={theme}
        onTheme={setTheme}
        showLabels={showLabels}
        onLabels={setShowLabels}
        showGraticule={showGraticule}
        onGraticule={setShowGraticule}
        mode={mode}
        onMode={changeMode}
        panelOpen={panelOpen}
        onTogglePanel={togglePanel}
        onShare={handleShare}
        onReset={handleReset}
        onLocate={handleLocate}
        locating={locating}
      />

      <div className="workspace">
        {panelOpen ? <button className="sidebar-scrim" type="button" aria-label={t('app.panelHide')} onClick={closePanel} /> : null}
        <aside className={`sidebar${panelOpen ? '' : ' is-collapsed'}`} aria-label={t('panel.details')}>
          <div className="sidebar__scroll">
            <SearchPanel
              docs={searchIndex}
              countries={countries}
              lang={lang}
              locating={locating}
              onPick={handlePick}
              onPickCountry={handlePickCountry}
              onJump={handleJump}
              onLocate={handleLocate}
            />
            <InfoCard
              country={selectedCountry}
              city={selectedCity}
              data={data}
              onClose={clearSelection}
            />
            <MarkersPanel
              markers={markers}
              onRename={renameMarker}
              onRemove={removeMarker}
              onClear={clearMarkers}
              onZoomTo={zoomToMarker}
            />
            <MeasurePanel points={measure} onUndo={undoMeasure} onClear={clearMeasure} />
          </div>
        </aside>

        <main className="map-area">
          <MapView
            data={data}
            lang={lang}
            theme={theme}
            appearance={appearance}
            showLabels={showLabels}
            showGraticule={showGraticule}
            markers={markers}
            measure={measure}
            myLocation={myLocation}
            mode={mode}
            selectedCountryId={selectedCountryId}
            selectedCityId={selectedCityId}
            initialView={view}
            apiRef={apiRef}
            onViewChange={setView}
            onPointerMove={handlePointerMove}
            onCountryClick={handleCountryClick}
            onCityClick={handleCityClick}
            onMapClick={handleMapClick}
          />

          {mode !== 'pan' ? (
            <div className="map-hint">{t(mode === 'marker' ? 'hint.marker' : 'hint.measure')}</div>
          ) : null}

          {theme === 'night' ? (
            <div className="map-legend">
              <span className="map-legend__swatch" />
              {t('legend.night')}
            </div>
          ) : null}

          <div className="map-zoom">
            <button type="button" aria-label={t('zoom.in')} onClick={() => apiRef.current?.zoomBy(1)}>
              +
            </button>
            <button type="button" aria-label={t('zoom.out')} onClick={() => apiRef.current?.zoomBy(-1)}>
              −
            </button>
          </div>

          {toast ? (
            <div className="toast" role="status">
              {toast}
            </div>
          ) : null}
        </main>
      </div>

      <StatusBar pointer={pointer} view={view} meta={data.meta} />
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppearanceProvider>
        <MapApp />
      </AppearanceProvider>
    </I18nProvider>
  );
}
