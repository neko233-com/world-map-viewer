/** 语言标识与清单。只放类型与常量，避免与其他 i18n 模块形成循环依赖。 */

export type Lang = 'zh-CN' | 'en' | 'ja' | 'ko' | 'fr' | 'de' | 'es' | 'ru';

export const LANG_IDS: Lang[] = ['zh-CN', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'ru'];

export interface LanguageInfo {
  id: Lang;
  /** 语言自称，语言菜单里始终用自称显示 */
  endonym: string;
  /** 用于 Intl 格式化（数字、小数分隔符） */
  intl: string;
}

export const LANGUAGES: LanguageInfo[] = [
  { id: 'zh-CN', endonym: '中文（简体）', intl: 'zh-CN' },
  { id: 'en', endonym: 'English', intl: 'en' },
  { id: 'ja', endonym: '日本語', intl: 'ja' },
  { id: 'ko', endonym: '한국어', intl: 'ko' },
  { id: 'fr', endonym: 'Français', intl: 'fr' },
  { id: 'de', endonym: 'Deutsch', intl: 'de' },
  { id: 'es', endonym: 'Español', intl: 'es' },
  { id: 'ru', endonym: 'Русский', intl: 'ru' },
];

/** 浏览器语言标签 → 应用语言，按前缀匹配 */
export function matchLang(tag: string): Lang | undefined {
  const value = tag.toLowerCase();
  const exact = LANG_IDS.find((id) => id.toLowerCase() === value);
  if (exact) return exact;
  const prefix = value.split('-')[0];
  if (prefix === 'zh') return 'zh-CN';
  return LANG_IDS.find((id) => id === prefix || id.split('-')[0] === prefix);
}
