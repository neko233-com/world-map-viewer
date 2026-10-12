import { useState } from 'react';

import { useI18n } from '../i18n';
import type { Theme } from '../lib/share';
import type { InteractionMode } from './MapView';
import { SettingsPanel } from './SettingsPanel';
import { IconButton, Popover, Segmented } from './ui/controls';

export interface ToolbarProps {
  theme: Theme;
  onTheme(theme: Theme): void;
  showLabels: boolean;
  onLabels(value: boolean): void;
  showGraticule: boolean;
  onGraticule(value: boolean): void;
  mode: InteractionMode;
  onMode(mode: InteractionMode): void;
  panelOpen: boolean;
  onTogglePanel(): void;
  onShare(): void;
  onReset(): void;
  onLocate(): void;
  locating: boolean;
}

export function Toolbar(props: ToolbarProps) {
  const { t } = useI18n();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="toolbar">
      <div className="toolbar__leading">
        <IconButton
          icon="menu"
          label={t(props.panelOpen ? 'app.panelHide' : 'app.panelShow')}
          onClick={props.onTogglePanel}
          active={props.panelOpen}
        />
        <div className="toolbar__titles">
          <h1>{t('app.title')}</h1>
          <p>{t('app.subtitle')}</p>
        </div>
      </div>

      <div className="toolbar__trailing">
        <Segmented
          value={props.mode}
          onChange={props.onMode}
          label={t('mode.label')}
          options={[
            { value: 'pan', label: t('mode.pan') },
            { value: 'marker', label: t('mode.marker') },
            { value: 'measure', label: t('mode.measure') },
          ]}
        />
        <div className="toolbar__actions">
          <IconButton
            icon="locate"
            label={t('locate.self')}
            onClick={props.onLocate}
            busy={props.locating}
          />
          <IconButton icon="reset" label={t('app.reset')} onClick={props.onReset} />
          <IconButton icon="share" label={t('app.share')} onClick={props.onShare} />
          <Popover
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            title={t('app.settings')}
            width={292}
            trigger={
              <IconButton
                icon="settings"
                label={t('app.settings')}
                active={settingsOpen}
                onClick={() => setSettingsOpen((open) => !open)}
              />
            }
          >
            <SettingsPanel
              theme={props.theme}
              onTheme={props.onTheme}
              showLabels={props.showLabels}
              onLabels={props.onLabels}
              showGraticule={props.showGraticule}
              onGraticule={props.onGraticule}
            />
          </Popover>
        </div>
      </div>
    </header>
  );
}
