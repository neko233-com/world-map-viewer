import { useAppearance, useI18n, LANGUAGES } from '../i18n';
import type { Theme } from '../lib/share';
import { Icon } from './ui/icons';
import { Row, Segmented, Switch } from './ui/controls';

export interface SettingsPanelProps {
  theme: Theme;
  onTheme(theme: Theme): void;
  showLabels: boolean;
  onLabels(value: boolean): void;
  showGraticule: boolean;
  onGraticule(value: boolean): void;
}

/** 设置气泡内容：界面外观、地图图层、语言、显示开关 */
export function SettingsPanel({
  theme,
  onTheme,
  showLabels,
  onLabels,
  showGraticule,
  onGraticule,
}: SettingsPanelProps) {
  const { t, pref, setPref } = useI18n();
  const { setting: appearance, setSetting: setAppearance } = useAppearance();

  return (
    <div className="settings">
      <Row label={t('appearance.label')} stacked>
        <Segmented
          value={appearance}
          onChange={setAppearance}
          label={t('appearance.label')}
          block
          options={[
            { value: 'system', label: t('appearance.system'), icon: 'auto' },
            { value: 'light', label: t('appearance.light'), icon: 'sun' },
            { value: 'dark', label: t('appearance.dark'), icon: 'moon' },
          ]}
        />
      </Row>

      <Row label={t('theme.label')} stacked>
        <Segmented
          value={theme}
          onChange={onTheme}
          label={t('theme.label')}
          block
          options={[
            { value: 'political', label: t('theme.political'), icon: 'layers' },
            { value: 'night', label: t('theme.night'), icon: 'moon' },
          ]}
        />
      </Row>

      <div className="row row--stacked">
        <span className="row__label">{t('lang.label')}</span>
        <ul className="menu">
          <li>
            <button
              type="button"
              className={`menu__item${pref === 'auto' ? ' is-selected' : ''}`}
              onClick={() => setPref('auto')}
            >
              <span>{t('lang.auto')}</span>
              {pref === 'auto' ? <Icon name="check" size={16} /> : null}
            </button>
          </li>
          {LANGUAGES.map((language) => (
            <li key={language.id}>
              <button
                type="button"
                className={`menu__item${pref === language.id ? ' is-selected' : ''}`}
                lang={language.id}
                onClick={() => setPref(language.id)}
              >
                <span>{language.endonym}</span>
                {pref === language.id ? <Icon name="check" size={16} /> : null}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <Row label={t('layer.labels')}>
        <Switch checked={showLabels} onChange={onLabels} label={t('layer.labels')} />
      </Row>
      <Row label={t('layer.graticule')}>
        <Switch checked={showGraticule} onChange={onGraticule} label={t('layer.graticule')} />
      </Row>
    </div>
  );
}
