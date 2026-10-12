

## Codely Structured Memories

### User

### Feedback

### Project
- [2026-10-12 10:38:58] 本机（Windows）环境变量 NODE_ENV=production，导致 npm install 默认跳过 devDependencies（omit=dev）；装开发依赖必须用 npm install --include=dev。2026-10-12 在 world-map-viewer 首次安装时踩到。
- [2026-10-12 11:39:08] headless 验证环境（world-map-viewer，2026-10-12）：本机 vite preview 默认只监听 [::1]，headless Chromium 经代理时 [::1] 回环被拒（ERR_NETWORK_ACCESS_DENIED），须用 `npx vite preview --host 127.0.0.1`。浏览器自动化用全局 dev-browser（npm i -g dev-browser 已装，Chromium 已下）：PowerShell here-string 管道脚本不产出输出，必须用 `dev-browser --headless run <script.js>`。
- [2026-10-12 11:39:08] styles.css 禁止手写 `-webkit-backdrop-filter`：Vite 构建会把与 `backdrop-filter` 同值的成对声明去重成只剩 -webkit- 版，而 Chrome 不支持该前缀（cssText 中直接消失）→ 毛玻璃静默失效。只写未前缀版，压缩器会自行补前缀并保留未前缀版。2026-10-12 在 world-map-viewer 踩过并修复（headless 验证发现）。

### Reference

