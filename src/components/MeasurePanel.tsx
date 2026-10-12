import { memo, useMemo } from 'react';

import { useI18n } from '../i18n';
import { formatDistance, haversineKm, pathLengthKm, type LatLng } from '../lib/geo';

export interface MeasurePanelProps {
  points: LatLng[];
  onUndo(): void;
  onClear(): void;
}

export const MeasurePanel = memo(function MeasurePanel({ points, onUndo, onClear }: MeasurePanelProps) {
  const { t, lang } = useI18n();

  const segments = useMemo(
    () =>
      points.slice(1).map((point, index) => ({
        key: `${index}-${point.lat}-${point.lng}`,
        km: haversineKm(points[index], point),
      })),
    [points],
  );
  const total = useMemo(() => pathLengthKm(points), [points]);

  return (
    <section className="group group--card measure-panel">
      <div className="card-head">
        <h2 className="group__title">
          {t('panel.measure')}
          <span className="badge">{points.length}</span>
        </h2>
        {points.length > 0 ? (
          <div className="card-head__actions">
            <button type="button" className="button button--plain button--small" onClick={onUndo}>
              {t('panel.measure.undo')}
            </button>
            <button type="button" className="button button--plain button--small" onClick={onClear}>
              {t('panel.measure.clear')}
            </button>
          </div>
        ) : null}
      </div>

      {points.length === 0 ? (
        <p className="hint">{t('panel.measure.empty')}</p>
      ) : (
        <>
          <p className="measure-total">
            <span>{t('panel.measure.total')}</span>
            <strong>{formatDistance(total, lang)}</strong>
          </p>
          {segments.length > 0 ? (
            <ol className="measure-segments">
              {segments.map((segment, index) => (
                <li key={segment.key}>
                  <span>
                    {t('panel.measure.segment')} {index + 1}
                  </span>
                  <strong>{formatDistance(segment.km, lang)}</strong>
                </li>
              ))}
            </ol>
          ) : null}
        </>
      )}
    </section>
  );
});
