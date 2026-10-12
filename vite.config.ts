import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * 生产构建时注入严格的 CSP：只允许加载同源资源。
 * 这样"离线"不只是约定，而是浏览器层面被强制保证的（任何外部请求都会被拒绝）。
 * 单独只在 build 阶段注入，避免破坏 dev 服务器的 HMR（需要 ws 与内联脚本）。
 */
const OFFLINE_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "form-action 'none'",
].join('; ');

export default defineConfig({
  // 相对基路径，便于把 dist 放到任意子目录/内网静态服务下运行
  base: './',
  plugins: [
    react(),
    {
      name: 'offline-csp',
      apply: 'build',
      transformIndexHtml(html: string) {
        return html.replace(
          '<head>',
          `<head>\n    <meta http-equiv="Content-Security-Policy" content="${OFFLINE_CSP}" />`,
        );
      },
    },
  ],
  build: {
    // Leaflet 单包体积较大，调高告警阈值避免噪音
    chunkSizeWarningLimit: 1200,
  },
});
