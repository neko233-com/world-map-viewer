import { useEffect, useRef, type ReactNode } from 'react';

import { Icon, type IconName } from './icons';

/** iOS 开关 */
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`switch${checked ? ' is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="switch__knob" />
    </button>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

/** iOS 分段控件（语义上是单选组） */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  block,
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  label: string;
  block?: boolean;
}) {
  return (
    <div className={`segmented${block ? ' segmented--block' : ''}`} role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`segmented__item${selected ? ' is-selected' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.icon ? <Icon name={option.icon} size={16} /> : null}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** 圆形图标按钮；tone=accent 时为主题色填充 */
export function IconButton({
  icon,
  label,
  onClick,
  active,
  tone = 'plain',
  size = 34,
  busy,
}: {
  icon: IconName;
  label: string;
  onClick?: () => void;
  active?: boolean;
  tone?: 'plain' | 'accent';
  size?: number;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      className={`icon-button tone-${tone}${active ? ' is-active' : ''}${busy ? ' is-busy' : ''}`}
      style={{ width: size, height: size }}
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
    >
      <Icon name={icon} size={Math.round(size * 0.52)} />
    </button>
  );
}

/** 侧栏/气泡里的分组卡片 */
export function Group({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`group${className ? ` ${className}` : ''}`}>
      {title ? <h2 className="group__title">{title}</h2> : null}
      <div className="group__body">{children}</div>
    </section>
  );
}

/** 设置行：左侧标题，右侧控件 */
export function Row({
  label,
  hint,
  children,
  stacked,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  stacked?: boolean;
}) {
  return (
    <div className={`row${stacked ? ' row--stacked' : ''}`}>
      <div className="row__text">
        <span className="row__label">{label}</span>
        {hint ? <span className="row__hint">{hint}</span> : null}
      </div>
      <div className="row__control">{children}</div>
    </div>
  );
}

/**
 * 锚定气泡：触发器 + 面板 + 透明遮罩（点击外部关闭）、Esc 关闭。
 * 用 fixed 遮罩而不做 portal，避免额外的层级管理成本。
 */
export function Popover({
  open,
  onOpenChange,
  trigger,
  title,
  children,
  align = 'end',
  width,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  title: string;
  children: ReactNode;
  align?: 'start' | 'end';
  width?: number;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onOpenChange(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = [
        ...panel.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((element) => !element.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!panel.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  // 关闭后把焦点还给触发按钮（WCAG 2.4.3）
  useEffect(() => {
    if (wasOpen.current && !open) {
      anchorRef.current?.querySelector<HTMLElement>('button, [href]')?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  return (
    <div className="popover-anchor" ref={anchorRef}>
      {trigger}
      {open ? (
        <>
          <div className="popover-scrim" onClick={() => onOpenChange(false)} aria-hidden="true" />
          <div
            className={`popover-panel popover-panel--${align}`}
            role="dialog"
            aria-label={title}
            tabIndex={-1}
            ref={panelRef}
            style={width ? { width } : undefined}
          >
            <div className="popover-panel__title">{title}</div>
            <div className="popover-panel__body">{children}</div>
          </div>
        </>
      ) : null}
    </div>
  );
}
