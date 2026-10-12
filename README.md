# 世界地图查看器（World Map Viewer）

完全离线的世界地图 Web 应用：不依赖 Google Maps、不请求任何瓦片服务器或 CDN，所有地理数据都是仓库内的本地文件。
界面与地名支持 **8 种语言**（中文 / English / 日本語 / 한국어 / Français / Deutsch / Español / Русский），默认跟随系统语言。

数据来源：[Natural Earth](https://www.naturalearthdata.com/)（公有领域）矢量数据，覆盖 177 个国家/地区与 243 座城市。

---

## 能力范围（请先读这一节）

**能做到**

- 缩放/平移浏览全球，政治地图与夜间地图两套图层主题
- 8 种语言的地名标注（按缩放级别分级显示，避免糊成一团）、经纬网
- 点击国家或城市弹出信息卡：正式名称、所属大洲/地区/次区域、人口、GDP、经济体分类、收入分组、ISO 代码、坐标、Wikidata 链接
- 搜索国家与城市并飞行定位（支持八语言文字、别名、全角输入、ISO 国家代码及 "cotedivoire" 这种去掉音标的写法）
- 标记点：增删改、定位、随链接分享
- 测距：多段大圆路径、分段距离与总距离，跨日期变更线自动拆段
- 公里比例尺、严格校验的经纬度跳转；支持全角数字与逗号小数
- 夜间地图：按当前时刻实时计算太阳直射点，绘制昼夜分界线与夜半球
- 视角、语言、图层、开关、标记与路径全部编码进地址栏，可分享、可刷新恢复
- **旅游顾问 / 行程推荐**：搜目的地看时区、首都等信息 → 沿行程打多个标记点（可命名）→ 大圆测距估算路程 → 复制链接发给客户，对方打开即完整恢复标记、路径与视角

**做不到（这是国界级矢量地图，不是街景地图）**

- 没有街道、建筑、门牌号、实时路况、导航路径规划、卫星影像
- 数据精度为 Natural Earth 110m（默认，约 1:1 亿比例尺），只适合国家级浏览；需要更细可用 `--level=50m` 重新生成
- 采用 Web 墨卡托投影，南极洲在 ±85° 之外被裁掉（与 Google 地图一致）
- 搜索不做拼音/罗马字转写，"beijing" 能命中是因为英文名本身如此，"Beijing" 的拼音检索需要额外词典
- 国界与地名遵循 Natural Earth 的命名与划界习惯，对有争议地区的表述不代表本项目立场
- 夜间分界线用低精度天文公式计算（误差 < 0.02°），仅用于可视化，不可用于天文用途

## 环境要求

- Node.js ≥ 20.19（开发用，运行时不需要）
- 现代浏览器（Chrome / Edge / Firefox / Safari）
- 仅**首次生成数据**时需要联网；`public/data` 一旦生成，运行与部署全程无网络

> 本机若设置了 `NODE_ENV=production`，`npm install` 会跳过 devDependencies，请用 `npm install --include=dev`。

## 快速开始

```bash
npm install --include=dev     # 安装依赖
npm run fetch:data            # 抓取 Natural Earth 数据 → public/data（只需一次，约 0.4MB）
npm run dev                   # 开发服务器 http://localhost:5173
npm run build && npm run preview   # 生产构建 + 本地预览 http://localhost:4173
```

`public/data` 已随仓库提供，可直接 `npm run dev`；`dev` 与 `build` 都会先执行 `fetch-data --if-missing`，数据齐全时自动跳过下载。

`dist/` 是纯静态产物，丢到任意静态服务器或内网即可运行。注意：必须通过 HTTP 提供服务（`file://` 打开会因浏览器 CORS 限制无法读取 GeoJSON）。

## 验证

```bash
npm test          # 使用已提供的数据验证八语言搜索、URL 往返、坐标校验与大圆路径
npm run typecheck # TypeScript 静态检查
npm run build     # 生产构建，自动确认本地数据齐全
```

测试复用现有 Vite 编译 TypeScript，使用 Node.js 内置测试运行器；临时产物写入已忽略的 `.cache/tests`，无需额外测试依赖或联网下载数据。

## 数据生成脚本

```bash
node scripts/fetch-data.mjs                 # 110m 概览级（默认，合计约 0.4MB）
node scripts/fetch-data.mjs --level=50m     # 50m 精细级（合计约 1.8MB，国界明显更顺滑）
node scripts/fetch-data.mjs --force         # 强制重新下载
node scripts/fetch-data.mjs --if-missing    # 数据齐全则跳过（dev/build 前置钩子用）
node scripts/fetch-data.mjs --from=D:\ne    # 从本地目录读取 ne_*.geojson（离线机器）
```

脚本会：下载 → 裁剪属性（只留用得到的字段）→ 压缩坐标精度 → 写出 `public/data/{countries,land,lakes,places}.geojson` 与 `meta.json`。
两个镜像可自动回退；`--from` 用于完全离线的机器（先从 [Natural Earth](https://www.naturalearthdata.com/downloads/) 下载对应 GeoJSON 放到同一目录）。

## 离线保证

1. 运行时不引用任何外部地址：地图不加载瓦片，地名来自本地 GeoJSON，不加载外部字体。
2. 生产构建会往 `index.html` 注入严格 CSP，浏览器层面直接拒绝一切外部请求：

   ```
   default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;
   font-src 'self' data:; connect-src 'self'; base-uri 'none'; object-src 'none'; form-action 'none'
   ```

   该 CSP 只在 `vite build` 时注入，不影响开发服务器的 HMR。
3. 自查方式（打包产物中只应有 XML 命名空间、React/Leaflet 报错链接和用户主动点击的 Wikidata 外链）：

   ```bash
   npx vite build
   node -e "const fs=require('fs');const s=fs.readFileSync('dist/assets/'+fs.readdirSync('dist/assets').filter(f=>f.endsWith('.js'))[0],'utf8');console.log([...new Set(s.match(/https?:\/\/[\w.\-\/:%?#=&]+/g)||[])].join('\n'))"
   ```

## 多语言

- 支持 8 种语言：`zh-CN` / `en` / `ja` / `ko` / `fr` / `de` / `es` / `ru`
- 默认「跟随系统」：按 `navigator.languages` 依次匹配，匹配不上回落英文
- 顶栏设置里可手动切换语言，选择记在 `localStorage`
- 分享链接里带 `lang`，打开链接会按链接语言显示
- 界面文案在 `src/i18n/messages.ts`，数据值（大洲/次区域/经济体/收入分组）在 `src/i18n/data-values.ts`；两者都是**一行一个 key、8 种语言并排**，`satisfies Record<Lang, string>` 约束，漏翻任何一种语言会直接编译报错
- 地名来自 Natural Earth 原生的 8 个 `NAME_*` 字段，缺失该语言时自动回退英文名

### 新增一种语言

1. `scripts/fetch-data.mjs`：`LANGS` 里加一行（Natural Earth 原生带 30+ 语言字段），执行 `npm run fetch-data -- --force`
2. `src/i18n/types.ts`：`Lang` 联合类型与 `LANG_IDS`、`LANGUAGES` 里加上新语言
3. `src/i18n/messages.ts` 与 `src/i18n/data-values.ts`：每个 key 补一列翻译（漏了编译报错，按提示逐个补）
4. `src/lib/geo.ts` 的 `DIRECTIONS` 里补经纬度方位词；`src/i18n/types.ts` 的 `matchLang` 按需调整前缀匹配

## 项目结构

```
scripts/fetch-data.mjs     数据抓取与裁剪
public/data/               生成的离线数据（GeoJSON + meta.json）
src/
  i18n/                    文案词典、系统语言检测、数据值本地化
  data/                    数据加载、类型、多语言搜索索引
  lib/geo.ts               大圆距离、经纬度/DMS 格式化
  lib/sun.ts               太阳直射点、昼夜分界线多边形
  lib/share.ts             URL hash 状态编解码
  lib/clipboard.ts         复制链接（含非安全上下文回落）
  components/MapView.tsx   Leaflet 地图：窗格、图层、标注、选中、测距
  components/*.tsx         工具栏、搜索、信息卡、标记、测距、状态栏
  App.tsx                  状态编排与 URL 同步
```

## URL 状态格式

```
#lat=36.14&lng=138.44&z=4&lang=zh-CN&theme=night&lbl=1&grat=0
 &mk=31.2304,121.4737~Mark;39.9042,116.4074~Beijing
 &ms=31.2304,121.4737;39.9042,116.4074
```

`lat/lng/z` 视角、`lang` 语言、`theme` 图层、`lbl` 国名标注、`grat` 经纬网、`mk` 标记点、`ms` 测距路径。
状态用 `history.replaceState` 节流 250ms 写入，不产生历史记录条目；同一个标签页里编辑地址栏 hash（粘贴分享链接）也会立即同步到界面。
点击「复制链接」会先序列化最新状态，不必等待节流；八种语言均可恢复。标记名中的 `~`、`;`、`%` 和表情等按原文保留，地图提示以纯文本显示。
缺失或无效字段回退默认值；视角纬度限制在 Web 墨卡托的 ±85.0511°，缩放限制在 2～8 级并按半级对齐。

## 许可与致谢

- 地理数据：Natural Earth，公有领域（public domain）
- 地图库：Leaflet（BSD-2-Clause）；UI：React（MIT）
- 本项目代码：[MIT](LICENSE)

## 快捷键与操作

| 操作 | 说明 |
| --- | --- |
| 滚轮 / 双击 / +− 按钮 | 缩放（2 ～ 8 级） |
| 拖拽 | 平移，边界限制在经度 ±180°、纬度 ±85.0511° |
| 点击国家或城市点 | 查看信息卡 |
| 搜索框 ↑ ↓ / Enter / Esc | 选择、定位、清空 |
| 切到「标记」后点地图 | 放置标记点 |
| 切到「测距」后点地图 | 追加路径点，面板里可撤销/清空 |
| Esc | 退出标记 / 测距模式；设置气泡打开时关闭气泡并把焦点还给按钮 |
| 分段控件内 ← → / ↑ ↓ | 方向键切换选项（浏览/标记/测距、外观、图层） |

窄屏默认收起侧栏，点左上角按钮展开，点击侧栏外侧收起。选择国家或城市时自动滚动到详情；切到标记/测距或执行坐标跳转时收起侧栏，方便操作地图。浏览器「减少动态效果」设置也会关闭飞行动画。
