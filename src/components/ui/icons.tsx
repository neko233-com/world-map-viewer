import type { ReactNode } from 'react';

/** SF Symbols 风格的线性图标，统一 24 网格、currentColor 描边 */
export type IconName =
  | 'menu'
  | 'close'
  | 'search'
  | 'locate'
  | 'share'
  | 'settings'
  | 'reset'
  | 'plus'
  | 'minus'
  | 'chevron'
  | 'check'
  | 'pin'
  | 'ruler'
  | 'globe'
  | 'trash'
  | 'target'
  | 'layers'
  | 'sun'
  | 'moon'
  | 'auto'
  | 'compass'
  | 'copy'
  | 'external';

const PATHS: Record<IconName, ReactNode> = {
  menu: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="4" />
      <path d="M9.5 4.5v15" />
    </>
  ),
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </>
  ),
  locate: (
    <>
      <path d="M20.5 3.5L3.8 10.4l6.6 2.6 2.6 6.6z" />
      <path d="M10.4 13l4.2-4.2" />
    </>
  ),
  share: (
    <>
      <path d="M12 3.5v10" />
      <path d="M8.5 6.5L12 3l3.5 3.5" />
      <path d="M5.5 13v5.5a2 2 0 002 2h9a2 2 0 002-2V13" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7.5h8M16 7.5h4M4 16.5h4M12 16.5h8" />
      <circle cx="14" cy="7.5" r="2.2" />
      <circle cx="10" cy="16.5" r="2.2" />
    </>
  ),
  reset: (
    <>
      <path d="M4.5 10.5A8 8 0 1112 20a8 8 0 01-6.4-3.2" />
      <path d="M4 4.5v6h6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  chevron: <path d="M7 10l5 5 5-5" />,
  check: <path d="M5.5 13l4.2 4.2L18.5 8" />,
  pin: (
    <>
      <path d="M12 21c4.2-4.4 7-7.9 7-11.2A7 7 0 005 9.8C5 13.1 7.8 16.6 12 21z" />
      <circle cx="12" cy="9.8" r="2.4" />
    </>
  ),
  ruler: (
    <>
      <path d="M13.8 3.2l7 7L8.2 22.8l-7-7z" />
      <path d="M8.4 8.6l1.8 1.8M11.4 5.6l1.8 1.8M5.4 11.6l1.8 1.8" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M3.2 12h17.6" />
      <path d="M12 3.2c2.4 2.4 3.6 5.4 3.6 8.8s-1.2 6.4-3.6 8.8c-2.4-2.4-3.6-5.4-3.6-8.8S9.6 5.6 12 3.2z" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15" />
      <path d="M9.5 7V4.8h5V7" />
      <path d="M6.5 7l1 12.2h9L17.5 7" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="1.6" />
      <path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3l8.5 4.6L12 12.2 3.5 7.6z" />
      <path d="M3.5 12.4L12 17l8.5-4.6" />
      <path d="M3.5 16.6L12 21.2l8.5-4.6" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
    </>
  ),
  moon: <path d="M20.2 14.8A8.6 8.6 0 019.2 3.8a8.8 8.8 0 1011 11z" />,
  auto: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 3.2v17.6" />
      <path d="M12 3.2c3 0 5.4 3.9 5.4 8.8S15 20.8 12 20.8z" fill="currentColor" stroke="none" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M14.9 9.1l-1.6 4.2-4.2 1.6 1.6-4.2z" />
    </>
  ),
  external: (
    <>
      <path d="M14 4.5h5.5V10" />
      <path d="M19.5 4.5L12 12" />
      <path d="M17 14.5v3.5a2 2 0 01-2 2H5.5a2 2 0 01-2-2V8.5a2 2 0 012-2H9" />
    </>
  ),
  copy: (
    <>
      <rect x="8.8" y="8.8" width="11.2" height="11.2" rx="3" />
      <path d="M15.2 8.8V6.6A2.6 2.6 0 0012.6 4H6.6A2.6 2.6 0 004 6.6v6a2.6 2.6 0 002.6 2.6h2.2" />
    </>
  ),
};

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
