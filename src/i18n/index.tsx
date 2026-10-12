import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { translate, type MessageKey } from './messages';
import { LANG_IDS, matchLang, type Lang } from './types';

export type { Lang, LanguageInfo } from './types';
export { LANGUAGES, LANG_IDS, matchLang } from './types';
export { MESSAGES } from './messages';
export type { MessageKey } from './messages';
export {
  CONTINENTS,
  ECONOMIES,
  INCOMES,
  REGIONS,
  SUBREGIONS,
  localizeRankedValue,
  localizeValue,
} from './data-values';

export type LangPref = 'auto' | Lang;
export const LANG_PREFS: LangPref[] = ['auto', ...LANG_IDS];

export type AppearanceSetting = 'system' | 'light' | 'dark';
export type Appearance = 'light' | 'dark';
export const APPEARANCE_SETTINGS: AppearanceSetting[] = ['system', 'light', 'dark'];

const STORAGE = {
  lang: 'world-map-viewer.lang',
  appearance: 'world-map-viewer.appearance',
};

/** 读取浏览器语言并映射到支持的语言，优先中文 */
export function detectSystemLang(): Lang {
  if (typeof navigator === 'undefined') return 'en';
  const tags = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of tags) {
    const matched = matchLang(String(tag));
    if (matched) return matched;
  }
  return 'en';
}

function readStored<T extends string>(key: string, allowed: readonly string[]): T | undefined {
  try {
    const stored = localStorage.getItem(key);
    if (stored && allowed.includes(stored)) return stored as T;
  } catch {
    /* 隐私模式下 localStorage 可能不可用 */
  }
  return undefined;
}

function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 忽略写入失败 */
  }
}

function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

interface I18nValue {
  lang: Lang;
  pref: LangPref;
  setPref: (pref: LangPref) => void;
  t: Translate;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<LangPref>(
    () => readStored<LangPref>(STORAGE.lang, LANG_PREFS) ?? 'auto',
  );
  const lang: Lang = pref === 'auto' ? detectSystemLang() : pref;

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = translate(lang, 'app.title');
  }, [lang]);

  const setPref = useCallback((next: LangPref) => {
    setPrefState(next);
    writeStored(STORAGE.lang, next);
  }, []);

  const t = useCallback<Translate>((key, vars) => translate(lang, key, vars), [lang]);

  const value = useMemo<I18nValue>(() => ({ lang, pref, setPref, t }), [lang, pref, setPref, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n 必须在 I18nProvider 内部使用');
  return value;
}

interface AppearanceValue {
  setting: AppearanceSetting;
  resolved: Appearance;
  setSetting: (setting: AppearanceSetting) => void;
}

const AppearanceContext = createContext<AppearanceValue | null>(null);

/** 界面外观（浅色/深色/跟随系统），与地图图层相互独立 */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [setting, setSettingState] = useState<AppearanceSetting>(
    () => readStored<AppearanceSetting>(STORAGE.appearance, APPEARANCE_SETTINGS) ?? 'system',
  );
  const [systemDark, setSystemDark] = useState(prefersDark);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolved: Appearance = setting === 'system' ? (systemDark ? 'dark' : 'light') : setting;

  useEffect(() => {
    // 同步到 <html>，让原生控件、滚动条与页面底色一起跟随
    document.documentElement.dataset.appearance = resolved;
    document.documentElement.style.colorScheme = resolved;
  }, [resolved]);

  const setSetting = useCallback((next: AppearanceSetting) => {
    setSettingState(next);
    writeStored(STORAGE.appearance, next);
  }, []);

  const value = useMemo<AppearanceValue>(
    () => ({ setting, resolved, setSetting }),
    [setting, resolved, setSetting],
  );
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceValue {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error('useAppearance 必须在 AppearanceProvider 内部使用');
  return value;
}
