import type { ReactNode } from 'react';

import {
  CONTINENTS,
  ECONOMIES,
  INCOMES,
  REGIONS,
  SUBREGIONS,
  localizeRankedValue,
  localizeValue,
  useI18n,
  type Lang,
} from '../i18n';
import type { CountryFeature, MapData, PlaceFeature } from '../data/types';
import { localizedName } from '../data/types';
import { formatLatLng, formatLatLngDms, formatNumber } from '../lib/geo';
import { Icon } from './ui/icons';

export interface InfoCardProps {
  country: CountryFeature | null;
  city: PlaceFeature | null;
  data: MapData;
  onClose(): void;
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function countryRows(country: CountryFeature, lang: Lang, t: ReturnType<typeof useI18n>['t']) {
  const p = country.properties;
  const population = p.pop
    ? `${formatNumber(p.pop, lang)}${p.popYear ? ` ${t('card.popYear', { year: p.popYear })}` : ''}`
    : undefined;
  const point = { lat: p.label[1], lng: p.label[0] };

  return (
    <>
      <Row label={t('card.formal')} value={p.formal} />
      <Row label={t('card.continent')} value={localizeValue(lang, p.continent, CONTINENTS)} />
      <Row label={t('card.region')} value={localizeValue(lang, p.region, REGIONS)} />
      <Row label={t('card.subregion')} value={localizeValue(lang, p.subregion, SUBREGIONS)} />
      <Row label={t('card.population')} value={population} />
      <Row
        label={t('card.gdp')}
        value={p.gdp ? `${formatNumber(p.gdp, lang)} ${t('card.gdpUnit')}` : undefined}
      />
      <Row label={t('card.economy')} value={localizeRankedValue(lang, p.economy, ECONOMIES)} />
      <Row label={t('card.income')} value={localizeRankedValue(lang, p.income, INCOMES)} />
      <Row
        label={t('card.codes')}
        value={[...new Set([p.iso2, p.iso3, p.id].filter(Boolean))].join(' · ')}
      />
      <Row label={t('card.coords')} value={formatLatLng(point, lang)} />
      <Row label="" value={<span className="detail-row__muted">{formatLatLngDms(point, lang)}</span>} />
    </>
  );
}

function cityRows(
  city: PlaceFeature,
  lang: Lang,
  t: ReturnType<typeof useI18n>['t'],
  data: MapData,
) {
  const p = city.properties;
  const country = p.iso2 ? data.countryByIso2.get(p.iso2) : undefined;
  const point = { lat: p.lat, lng: p.lng };

  return (
    <>
      <Row
        label={t('card.countryName')}
        value={country ? localizedName(country.properties.names, lang) : undefined}
      />
      <Row label={t('card.admin1')} value={p.admin1} />
      <Row label={t('card.population')} value={p.pop ? formatNumber(p.pop, lang) : undefined} />
      <Row label={t('card.timezone')} value={p.tz} />
      <Row label={t('card.capital')} value={p.capital ? '✓' : undefined} />
      <Row label={t('card.coords')} value={formatLatLng(point, lang)} />
      <Row label="" value={<span className="detail-row__muted">{formatLatLngDms(point, lang)}</span>} />
    </>
  );
}

export function InfoCard({ country, city, data, onClose }: InfoCardProps) {
  const { t, lang } = useI18n();

  if (!country && !city) {
    return (
      <section className="group group--card">
        <h2 className="group__title">{t('panel.details')}</h2>
        <div className="group__body">
          <p className="hint">{t('panel.details.empty')}</p>
        </div>
      </section>
    );
  }

  const names = country ? country.properties.names : city!.properties.names;
  const wiki = country?.properties.wiki ?? city?.properties.wiki;

  return (
    <section className="group group--card">
      <div className="card-head">
        <span className="card-head__kind">{t(country ? 'card.country' : 'card.city')}</span>
        <button type="button" className="icon-button tone-plain" aria-label={t('card.close')} onClick={onClose}>
          <Icon name="close" size={15} />
        </button>
      </div>
      <h2 className="card-title">{localizedName(names, lang)}</h2>
      <dl className="detail-list">
        {country ? countryRows(country, lang, t) : cityRows(city!, lang, t, data)}
      </dl>
      {wiki ? (
        <a
          className="card-link"
          href={`https://www.wikidata.org/wiki/${wiki}`}
          target="_blank"
          rel="noreferrer"
        >
          {t('card.wiki')}
          <Icon name="external" size={13} />
        </a>
      ) : null}
    </section>
  );
}
