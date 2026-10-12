#!/usr/bin/env node
/**
 * 抓取 Natural Earth 矢量数据，裁剪为紧凑的本地 GeoJSON，输出到 public/data/。
 *
 * 只在联网的开发/构建机上执行一次，产物随仓库分发；应用运行时零网络请求。
 *
 * 用法：
 *   node scripts/fetch-data.mjs                 # 110m 概览级（默认，合计约 0.4MB）
 *   node scripts/fetch-data.mjs --level=50m     # 50m 精细级（合计约 1.8MB）
 *   node scripts/fetch-data.mjs --if-missing    # 四个数据文件齐全则直接跳过
 *   node scripts/fetch-data.mjs --force         # 忽略已有文件强制重下
 *   node scripts/fetch-data.mjs --from=DIR      # 改用本地目录里的 ne_*.geojson（离线环境）
 */
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'data');

const MIRRORS = [
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/',
  'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/',
];

/**
 * 应用支持的语言 → Natural Earth 名称字段（新增语言只需在此加一行）。
 * en 取 NAME（通用短名）；NAME_EN / NAME_LONG 常是正式全称
 * （如 CHN 的 NAME_EN = "People's Republic of China"），只作为搜索别名使用。
 */
const LANGS = {
  'zh-CN': 'NAME_ZH',
  en: 'NAME',
  ja: 'NAME_JA',
  ko: 'NAME_KO',
  fr: 'NAME_FR',
  de: 'NAME_DE',
  es: 'NAME_ES',
  ru: 'NAME_RU',
};

/** 参与"别名"匹配的原始字段，让搜索能命中全称、旧称、异体译名 */
const ALT_FIELDS = [
  'NAME',
  'NAME_LONG',
  'NAME_EN',
  'NAME_ALT',
  'NAME_ZHT',
  'NAME_SORT',
  'NAMEASCII',
  'NAMEPAR',
];

/**
 * 名称覆盖表：Natural Earth 对少数条目给出的是官方全称（如 CHN = 中华人民共和国），
 * 直接当地图标注过长，这里按需逐条换成通用简称。只加确有必要的情况。
 */
const NAME_OVERRIDES = {
  CHN: { 'zh-CN': '中国', ja: '中国', ko: '중국', fr: 'Chine', de: 'China', ru: 'Китай' },
  PRK: { 'zh-CN': '朝鲜', ja: '北朝鮮', ko: '북한' },
  KOR: { 'zh-CN': '韩国', ja: '韓国', ko: '한국' },
  COD: { 'zh-CN': '刚果（金）' },
  CYN: {
    'zh-CN': '北塞浦路斯',
    ja: '北キプロス',
    ko: '북키프로스',
    fr: 'Chypre du Nord',
    de: 'Nordzypern',
    es: 'Chipre del Norte',
    ru: 'Северный Кипр',
  },
  ARE: { 'zh-CN': '阿联酋', ru: 'ОАЭ' },
  USA: { en: 'United States' },
};

const SOURCES = {
  countries: (level) => `ne_${level}_admin_0_countries.geojson`,
  land: (level) => `ne_${level}_land.geojson`,
  lakes: (level) => `ne_${level}_lakes.geojson`,
  places: (level) => `ne_${level}_populated_places.geojson`,
};

const args = new Set(process.argv.slice(2));
const readOpt = (name) => {
  const hit = [...args].find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};
const level = readOpt('level') === '50m' ? '50m' : '110m';
const force = args.has('--force');
const ifMissing = args.has('--if-missing');
const fromDir = readOpt('from');
// 坐标保留小数位：110m 数据本身已高度简化，3 位（约 110m 精度）足够
const PRECISION = level === '50m' ? 4 : 3;

const round = (value) => {
  const factor = 10 ** PRECISION;
  return Math.round(value * factor) / factor;
};

/** 递归压缩坐标精度：[lng, lat, ...] → 四舍五入 */
function roundCoords(coords) {
  if (typeof coords[0] === 'number') return coords.map(round);
  return coords.map(roundCoords);
}

function roundGeometry(geometry) {
  return { type: geometry.type, coordinates: roundCoords(geometry.coordinates) };
}

function cleanCode(value) {
  const code = String(value ?? '').trim();
  return !code || code === '-99' ? undefined : code;
}

function unique(list) {
  return [...new Set(list.map((s) => String(s ?? '').trim()).filter(Boolean))];
}

function aliasesFrom(props, primary) {
  const raw = ALT_FIELDS.flatMap((field) => String(props[field] ?? '').split('|'));
  return unique(raw).filter((name) => !primary.includes(name) && name !== '-99');
}

function namesFrom(props, id) {
  const override = NAME_OVERRIDES[id] ?? {};
  const names = {};
  for (const [lang, field] of Object.entries(LANGS)) {
    const value = String(override[lang] ?? props[field] ?? props.NAME ?? '').trim();
    if (value) names[lang] = value;
  }
  return names;
}

function mapCountry(props, index) {
  const id = cleanCode(props.ADM0_A3) ?? cleanCode(props.SOV_A3) ?? `country-${index}`;
  const names = namesFrom(props, id);
  return {
    id,
    iso2: cleanCode(props.ISO_A2),
    iso3: cleanCode(props.ISO_A3),
    names,
    aliases: aliasesFrom(props, Object.values(names)),
    formal: cleanCode(props.FORMAL_EN) ? String(props.FORMAL_EN).trim() : undefined,
    continent: props.CONTINENT || undefined,
    region: props.REGION_UN || undefined,
    subregion: props.SUBREGION || undefined,
    pop: Number.isFinite(props.POP_EST) ? props.POP_EST : undefined,
    popYear: Number.isFinite(props.POP_YEAR) ? props.POP_YEAR : undefined,
    gdp: Number.isFinite(props.GDP_MD) ? props.GDP_MD : undefined,
    economy: props.ECONOMY || undefined,
    income: props.INCOME_GRP || undefined,
    rank: Number.isFinite(props.LABELRANK) ? props.LABELRANK : 5,
    label: [round(props.LABEL_X ?? 0), round(props.LABEL_Y ?? 0)],
    color: Number.isFinite(props.MAPCOLOR9) ? props.MAPCOLOR9 : 0,
    tiny: props.TINY || 0,
    wiki: cleanCode(props.WIKIDATAID) ? String(props.WIKIDATAID).trim() : undefined,
  };
}

function mapPlace(props, index) {
  const id = cleanCode(props.NE_ID) ? `city-${props.NE_ID}` : `city-${index}`;
  const names = namesFrom(props, id);
  return {
    id,
    iso2: cleanCode(props.ISO_A2),
    names,
    aliases: aliasesFrom(props, Object.values(names)),
    admin1: props.ADM1NAME ? String(props.ADM1NAME).trim() : undefined,
    pop: Number.isFinite(props.POP_MAX) ? props.POP_MAX : undefined,
    tz: props.TIMEZONE ? String(props.TIMEZONE).trim() : undefined,
    capital: props.ADM0CAP === 1 ? true : undefined,
    lat: round(props.LATITUDE ?? 0),
    lng: round(props.LONGITUDE ?? 0),
    wiki: cleanCode(props.WIKIDATAID) ? String(props.WIKIDATAID).trim() : undefined,
  };
}

/** 只保留几何，丢掉属性，用于陆地/湖泊这类纯底图 */
function stripFeatures(collection) {
  return {
    type: 'FeatureCollection',
    features: collection.features.map((feature, index) => ({
      type: 'Feature',
      id: index,
      properties: {},
      geometry: roundGeometry(feature.geometry),
    })),
  };
}

function mapFeatures(collection, mapper) {
  return {
    type: 'FeatureCollection',
    features: collection.features.map((feature, index) => ({
      type: 'Feature',
      properties: mapper(feature.properties, index),
      geometry: roundGeometry(feature.geometry),
    })),
  };
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'world-map-viewer-fetch' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function loadRaw(name) {
  const file = SOURCES[name](level);
  if (fromDir) {
    const localPath = path.join(path.resolve(fromDir), file);
    process.stdout.write(`  · 读取本地 ${file}\n`);
    return JSON.parse(await readFile(localPath, 'utf8'));
  }
  let lastError;
  for (const base of MIRRORS) {
    try {
      process.stdout.write(`  · 下载 ${file} ← ${new URL(base).host}\n`);
      return JSON.parse(await fetchText(base + file));
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(
    `下载 ${file} 失败：${lastError?.message ?? '未知错误'}\n` +
      '可手动下载 https://www.naturalearthdata.com/ 对应的 GeoJSON，' +
      '放入同一目录后用 --from=DIR 指定该目录。',
  );
}

async function exists(file) {
  try {
    return (await stat(file)).size > 0;
  } catch {
    return false;
  }
}

async function allOutputsExist() {
  const names = ['countries.geojson', 'land.geojson', 'lakes.geojson', 'places.geojson', 'meta.json'];
  const checks = await Promise.all(names.map((name) => exists(path.join(OUT_DIR, name))));
  return checks.every(Boolean);
}

async function writeJson(file, data) {
  const text = JSON.stringify(data);
  await writeFile(file, text, 'utf8');
  return text.length;
}

const kb = (bytes) => `${(bytes / 1024).toFixed(0)}KB`;

async function main() {
  process.stdout.write(`Natural Earth 数据抓取（精度 ${level}）\n`);

  if (ifMissing && !force && (await allOutputsExist())) {
    process.stdout.write('  ✓ public/data 已就绪，跳过下载\n');
    return;
  }

  const [countriesRaw, landRaw, lakesRaw, placesRaw] = await Promise.all([
    loadRaw('countries'),
    loadRaw('land'),
    loadRaw('lakes'),
    loadRaw('places'),
  ]);

  const countries = mapFeatures(countriesRaw, mapCountry);
  const places = mapFeatures(placesRaw, mapPlace);
  const land = stripFeatures(landRaw);
  const lakes = stripFeatures(lakesRaw);

  await mkdir(OUT_DIR, { recursive: true });
  const sizes = {
    countries: await writeJson(path.join(OUT_DIR, 'countries.geojson'), countries),
    land: await writeJson(path.join(OUT_DIR, 'land.geojson'), land),
    lakes: await writeJson(path.join(OUT_DIR, 'lakes.geojson'), lakes),
    places: await writeJson(path.join(OUT_DIR, 'places.geojson'), places),
  };

  const meta = {
    level,
    generatedAt: new Date().toISOString(),
    attribution: 'Natural Earth (public domain)',
    source: fromDir ?? MIRRORS[0],
    languages: Object.keys(LANGS),
    counts: {
      countries: countries.features.length,
      land: land.features.length,
      lakes: lakes.features.length,
      places: places.features.length,
    },
  };
  sizes.meta = await writeJson(path.join(OUT_DIR, 'meta.json'), meta);

  for (const [name, bytes] of Object.entries(sizes)) {
    process.stdout.write(`  ✓ ${name.padEnd(10)} ${kb(bytes)}\n`);
  }

  const sample = countries.features
    .filter((f) => ['CHN', 'USA', 'JPN', 'FRA', 'BRA'].includes(f.properties.id))
    .map((f) => `${f.properties.names.en}/${f.properties.names['zh-CN'] ?? '(无中文名)'}`);
  process.stdout.write(`  抽查多语言名称：${sample.join('，')}\n`);
  process.stdout.write('完成。应用运行时不再需要网络。\n');
}

main().catch((error) => {
  process.stderr.write(`\n数据抓取失败：${error.message}\n`);
  process.exit(1);
});
