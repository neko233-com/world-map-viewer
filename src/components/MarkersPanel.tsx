import { useI18n } from '../i18n';
import { formatLatLng } from '../lib/geo';
import type { MapMarker } from '../lib/share';
import { Icon } from './ui/icons';

export interface MarkersPanelProps {
  markers: MapMarker[];
  onRename(id: string, name: string): void;
  onRemove(id: string): void;
  onClear(): void;
  onZoomTo(marker: MapMarker): void;
}

export function MarkersPanel({ markers, onRename, onRemove, onClear, onZoomTo }: MarkersPanelProps) {
  const { t, lang } = useI18n();

  return (
    <section className="group group--card">
      <div className="card-head">
        <h2 className="group__title">
          {t('panel.markers')}
          <span className="badge">{markers.length}</span>
        </h2>
        {markers.length > 0 ? (
          <button type="button" className="button button--plain button--small" onClick={onClear}>
            {t('panel.markers.clear')}
          </button>
        ) : null}
      </div>

      {markers.length === 0 ? (
        <p className="hint">{t('panel.markers.empty')}</p>
      ) : (
        <ul className="rows">
          {markers.map((marker) => (
            <li key={marker.id} className="rows__item">
              <input
                className="rows__input"
                value={marker.name}
                aria-label={t('panel.marker.rename')}
                onChange={(event) => onRename(marker.id, event.target.value)}
              />
              <span className="rows__meta">{formatLatLng(marker, lang)}</span>
              <div className="rows__actions">
                <button
                  type="button"
                  className="icon-button tone-plain"
                  style={{ width: 28, height: 28 }}
                  title={t('panel.markers')}
                  aria-label={t('panel.markers')}
                  onClick={() => onZoomTo(marker)}
                >
                  <Icon name="target" size={15} />
                </button>
                <button
                  type="button"
                  className="icon-button tone-danger"
                  style={{ width: 28, height: 28 }}
                  aria-label={t('panel.marker.remove')}
                  title={t('panel.marker.remove')}
                  onClick={() => onRemove(marker.id)}
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
