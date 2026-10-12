import { memo, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

import { useI18n, localizeValue, CONTINENTS, type Lang } from '../i18n';
import { searchDocs, type SearchDoc } from '../data/search';
import { localizedName, secondaryName, type CountryFeature } from '../data/types';
import { formatLatLng, isValidLatLng, parseCoordinate } from '../lib/geo';
import { Icon } from './ui/icons';

export interface SearchPanelProps {
  docs: SearchDoc[];
  countries: CountryFeature[];
  lang: Lang;
  locating: boolean;
  onPick(doc: SearchDoc): void;
  onPickCountry(country: CountryFeature): void;
  onJump(point: { lat: number; lng: number }): void;
  onLocate(): void;
}

const ALL = '__all__';

/** 侧栏顶部卡片：搜索、定位、坐标跳转、按大洲浏览 */
export const SearchPanel = memo(function SearchPanel({
  docs,
  countries,
  lang,
  locating,
  onPick,
  onPickCountry,
  onJump,
  onLocate,
}: SearchPanelProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [continent, setContinent] = useState<string>(ALL);
  const [latText, setLatText] = useState('');
  const [lngText, setLngText] = useState('');
  const [jumpError, setJumpError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const results = useMemo(() => searchDocs(docs, query, lang, 8), [docs, query, lang]);

  useEffect(() => {
    setActive(0);
  }, [query, lang]);

  // 键盘上下选择时保证活动项可见
  useEffect(() => {
    const list = resultsRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>('.is-active');
    active?.scrollIntoView({ block: 'nearest' });
  }, [active, results]);

  const compactFormat = useMemo(
    () => new Intl.NumberFormat(lang, { notation: 'compact', maximumFractionDigits: 1 }),
    [lang],
  );
  const compact = (value?: number) =>
    value === undefined
      ? ''
      : compactFormat.format(value);

  // 大洲分组：按国家数量从多到少排列，只显示数据里真实存在的大洲
  const continents = useMemo(() => {
    const counts = new Map<string, number>();
    for (const country of countries) {
      const key = country.properties.continent;
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key);
  }, [countries]);

  const grouped = useMemo(() => {
    const list = continent === ALL ? countries : countries.filter((c) => c.properties.continent === continent);
    const byContinent = new Map<string, CountryFeature[]>();
    for (const country of list) {
      const key = country.properties.continent ?? '';
      const bucket = byContinent.get(key);
      if (bucket) bucket.push(country);
      else byContinent.set(key, [country]);
    }
    for (const bucket of byContinent.values()) {
      bucket.sort((a, b) =>
        localizedName(a.properties.names, lang).localeCompare(localizedName(b.properties.names, lang), lang),
      );
    }
    return [...byContinent.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [countries, continent, lang]);

  const total = grouped.reduce((sum, [, list]) => sum + list.length, 0);

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === 'ArrowDown') {
      if (!results.length) return;
      event.preventDefault();
      setActive((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      if (!results.length) return;
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      const doc = results[active];
      if (doc) onPick(doc);
    } else if (event.key === 'Escape') {
      setQuery('');
    }
  };

  const handleJump = (event: FormEvent) => {
    event.preventDefault();
    const lat = parseCoordinate(latText);
    const lng = parseCoordinate(lngText);
    if (!isValidLatLng(lat, lng)) {
      setJumpError(t('locate.invalid'));
      return;
    }
    setJumpError(null);
    onJump({ lat: lat as number, lng: lng as number });
  };

  return (
    <section className="search-panel">
      <div className="search-field">
        <Icon name="search" size={16} />
        <input
          id="wmv-search"
          type="search"
          value={query}
          placeholder={t('search.placeholder')}
          autoComplete="off"
          spellCheck={false}
          aria-label={t('search.label')}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={Boolean(query && results.length)}
          aria-controls={query && results.length ? 'wmv-search-results' : undefined}
          aria-activedescendant={query && results[active] ? `wmv-result-${active}` : undefined}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleSearchKeyDown}
        />
        {query ? (
          <button
            type="button"
            className="search-field__clear"
            aria-label={t('search.clear')}
            onClick={() => setQuery('')}
          >
            <Icon name="close" size={14} />
          </button>
        ) : null}
        <button
          type="button"
          className={`search-field__locate${locating ? ' is-busy' : ''}`}
          aria-label={t('locate.self')}
          title={t('locate.self')}
          disabled={locating}
          aria-busy={locating}
          onClick={onLocate}
        >
          <Icon name="locate" size={16} />
        </button>
      </div>

      <form className="coord-jump" onSubmit={handleJump}>
        <input
          className="coord-jump__input"
          value={latText}
          inputMode="decimal"
          placeholder={t('locate.lat')}
          aria-label={t('locate.lat')}
          aria-invalid={Boolean(jumpError)}
          aria-describedby={jumpError ? 'wmv-coord-error' : undefined}
          onChange={(event) => { setLatText(event.target.value); setJumpError(null); }}
        />
        <input
          className="coord-jump__input"
          value={lngText}
          inputMode="decimal"
          placeholder={t('locate.lng')}
          aria-label={t('locate.lng')}
          aria-invalid={Boolean(jumpError)}
          aria-describedby={jumpError ? 'wmv-coord-error' : undefined}
          onChange={(event) => { setLngText(event.target.value); setJumpError(null); }}
        />
        <button type="submit" className="button button--tinted button--small">
          {t('locate.go')}
        </button>
      </form>

      {jumpError ? <p className="inline-error" id="wmv-coord-error" role="alert">{jumpError}</p> : null}

      {query ? (
        <div className="list" ref={resultsRef}>
          <div className="list__heading">{t('search.results')}</div>
          {results.length === 0 ? (
            <p className="hint">{t('search.none')}</p>
          ) : (
            <ul className="rows rows--plain search-results" id="wmv-search-results" role="listbox" aria-label={t('search.results')}>
              {results.map((doc, index) => {
                const secondary = secondaryName(doc.names, lang);
                return (
                  <li key={doc.id} role="presentation">
                    <button
                      type="button"
                      id={`wmv-result-${index}`}
                      role="option"
                      aria-selected={index === active}
                      className={`list-row${index === active ? ' is-active' : ''}`}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => onPick(doc)}
                    >
                      <span className="list-row__main">
                        <span className="list-row__name">{localizedName(doc.names, lang)}</span>
                        <span className="list-row__sub">
                          {secondary ? `${secondary} · ` : ''}
                          {t(doc.kind === 'country' ? 'search.kind.country' : 'search.kind.city')}
                        </span>
                      </span>
                      <Icon name={doc.kind === 'country' ? 'globe' : 'pin'} size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="list">
          <div className="chips" role="group" aria-label={t('browse.title')}>
            <button
              type="button"
              className={`chip${continent === ALL ? ' is-active' : ''}`}
              aria-pressed={continent === ALL}
              onClick={() => setContinent(ALL)}
            >
              {t('browse.all')}
            </button>
            {continents.map((key) => (
              <button
                key={key}
                type="button"
                className={`chip${continent === key ? ' is-active' : ''}`}
                aria-pressed={continent === key}
                onClick={() => setContinent(key)}
              >
                {localizeValue(lang, key, CONTINENTS) ?? key}
              </button>
            ))}
          </div>

          <div className="list__heading">{t('browse.count', { n: total })}</div>

          {grouped.length === 0 ? (
            <p className="hint">{t('browse.empty')}</p>
          ) : (
            <div className="browse-results">
              {grouped.map(([key, list]) => (
              <div key={key} className="list__group">
                {continent === ALL ? (
                  <div className="list__group-title">{localizeValue(lang, key, CONTINENTS) ?? key}</div>
                ) : null}
                <ul className="rows rows--plain">
                  {list.map((country) => (
                    <li key={country.properties.id}>
                      <button
                        type="button"
                        className="list-row"
                        onClick={() => onPickCountry(country)}
                      >
                        <span className="list-row__main">
                          <span className="list-row__name">
                            {localizedName(country.properties.names, lang)}
                          </span>
                          <span className="list-row__sub">
                            {formatLatLng(
                              { lat: country.properties.label[1], lng: country.properties.label[0] },
                              lang,
                              2,
                            )}
                          </span>
                        </span>
                        <span className="list-row__trailing">
                          {compact(country.properties.pop)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
});
