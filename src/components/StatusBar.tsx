import { useCallback, useState } from 'react';

import { useI18n } from '../i18n';
import type { DataMeta } from '../data/types';
import { formatLatLng, formatLatLngDms, type LatLng } from '../lib/geo';
import type { ViewState } from '../lib/share';
import { copyText } from '../lib/clipboard';
import { Icon } from './ui/icons';

export interface StatusBarProps {
  pointer: LatLng | null;
  view: ViewState;
  meta: DataMeta;
}

export function StatusBar({ pointer, view, meta }: StatusBarProps) {
  const { t, lang } = useI18n();
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    if (!pointer) return;
    const ok = await copyText(`${pointer.lat.toFixed(6)}, ${pointer.lng.toFixed(6)}`);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }, [pointer]);

  return (
    <footer className="statusbar">
      <div className="statusbar__item">
        <span className="statusbar__key">{t('status.coords')}</span>
        {pointer ? (
          <button
            type="button"
            className="statusbar__coords"
            onClick={copy}
            title={t(copied ? 'status.copied' : 'status.copy')}
          >
            <span className="statusbar__value">{formatLatLng(pointer, lang)}</span>
            <span className="statusbar__muted">{formatLatLngDms(pointer, lang)}</span>
            <Icon name={copied ? 'check' : 'copy'} size={13} />
          </button>
        ) : (
          <span className="statusbar__muted">{t('status.hint')}</span>
        )}
      </div>
      <div className="statusbar__meta">
        <span>
          {t('status.zoom')} {view.zoom.toFixed(1)}
        </span>
        <span>{t('status.data', { level: meta.level })}</span>
        <span className="statusbar__muted">{t('status.attribution')}</span>
      </div>
    </footer>
  );
}
