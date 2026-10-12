/** 复制文本：优先用剪贴板 API，非安全上下文（如局域网 http）回落到临时输入框 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 继续尝试回落方案 */
  }

  const area = document.createElement('textarea');
  const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  try {
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
    focused?.focus({ preventScroll: true });
  }
}
