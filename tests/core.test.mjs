import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildSearchIndex, normalizeText, searchDocs } from '../src/data/search.ts';
import { loadMapData } from '../src/data/load.ts';
import { LANG_IDS } from '../src/i18n/types.ts';
import {
  greatCirclePoint, greatCircleSegments, haversineKm, isValidLatLng,
  MAX_MAP_LAT, parseCoordinate, pathLengthKm,
} from '../src/lib/geo.ts';
import { decodeHash, DEFAULT_VIEW, encodeHash } from '../src/lib/share.ts';

const countries = JSON.parse(await readFile('public/data/countries.geojson', 'utf8'));
const places = JSON.parse(await readFile('public/data/places.geojson', 'utf8'));
const docs = buildSearchIndex({ countries, places });
const state = {
  view: { lat: 31.2304, lng: 121.4737, zoom: 5.5 },
  lang: 'en', theme: 'night', labels: false, graticule: true,
  markers: [{ id: 'test', lat: 0, lng: 0, name: '上海~서울;Россия & 100% + <b>Tokyo</b> 🌏' }],
  measure: [{ lat: 35, lng: 170 }, { lat: 40, lng: -170 }],
};

for (const lang of LANG_IDS) {
  test(`sharing restores ${lang} and all map annotations`, () => {
    const decoded = decodeHash(encodeHash({ ...state, lang }));
    assert.equal(decoded.lang, lang);
    assert.deepEqual(decoded.view, state.view);
    assert.equal(decoded.theme, state.theme);
    assert.equal(decoded.labels, state.labels);
    assert.equal(decoded.graticule, state.graticule);
    assert.equal(decoded.markers[0].name, state.markers[0].name);
    assert.deepEqual(decoded.measure, state.measure);
  });
  test(`search matches actual ${lang} country names`, () => {
    const country = countries.features.find((feature) => feature.properties.id === 'CHN');
    assert.equal(searchDocs(docs, country.properties.names[lang], lang)[0]?.id, 'CHN');
  });
}

test('empty or malformed URL fields do not become zero coordinates', () => {
  for (const hash of ['', '#', '#lat=&lng=&z=', '#lat=no&lng=999&z=no']) {
    assert.deepEqual(decodeHash(hash).view, DEFAULT_VIEW);
  }
  const state = decodeHash('#lat=90&lng=-180&z=12&lbl=invalid&grat=false&lang=invalid');
  assert.equal(state.view.lat, MAX_MAP_LAT);
  assert.equal(state.view.zoom, 8);
  assert.equal(state.labels, undefined);
  assert.equal(state.graticule, false);
  assert.equal(state.lang, undefined);
  assert.equal(decodeHash('#z=3.2').view.zoom, 3);
});

test('malformed annotation pairs are skipped and legacy names preserve tildes', () => {
  const decoded = decodeHash('#mk=,~empty;1,2,3~extra;91,0~range;0,0~A~B&ms=1,2,3;,;0,0');
  assert.equal(decoded.markers.length, 1);
  assert.equal(decoded.markers[0].name, 'A~B');
  assert.deepEqual(decoded.measure, [{ lat: 0, lng: 0 }]);
  assert.equal(decodeHash('#mk=0,0~%25ZZ').markers[0].name, '%ZZ');
});

test('search preserves Korean, Cyrillic, kana and compatibility characters', () => {
  for (const query of ['서울', 'Россия', 'ソウル']) assert.ok(searchDocs(docs, query, 'en').length, query);
  assert.equal(normalizeText('Ｓｅｏｕｌ'), normalizeText('Seoul'));
  assert.equal(normalizeText('서울'.normalize('NFD')), normalizeText('서울'));
  assert.equal(normalizeText("Côte d'Ivoire"), 'cotedivoire');
  assert.equal(searchDocs(docs, 'cotedivoire', 'en')[0]?.id, 'CIV');
  assert.deepEqual(searchDocs(docs, '!?', 'en'), []);
});

test('ISO codes rank their countries above incidental substring matches', () => {
  for (const [query, id] of [['US', 'USA'], ['usa', 'USA'], ['CN', 'CHN'], ['JPN', 'JPN'], ['KOR', 'KOR']]) {
    assert.equal(searchDocs(docs, query, 'en')[0]?.id, id, query);
  }
});

test('coordinate input accepts localized decimals and rejects silent coercion', () => {
  for (const [input, value] of [['31,2304', 31.2304], [' －１２１．５° ', -121.5], ['−.5', -0.5], ['90', 90]]) {
    assert.equal(parseCoordinate(input), value, input);
  }
  for (const input of ['', 'abc31.2', '31°20′', '1e2', '1 2', '0x10', '1,2,3', 'Infinity']) {
    assert.equal(parseCoordinate(input), undefined, input);
  }
  assert.ok(isValidLatLng(90, -180));
  assert.equal(isValidLatLng(NaN, 0), false);
  assert.equal(isValidLatLng(0, Infinity), false);
  assert.equal(isValidLatLng(-91, 0), false);
});

test('great-circle midpoint follows the measured route rather than a flat line', () => {
  const a = { lat: 40, lng: -70 };
  const b = { lat: 40, lng: 70 };
  const middle = greatCirclePoint(a, b, 0.5);
  assert.ok(middle.lat > 60);
  assert.ok(Math.abs(middle.lng) < 1e-8);
  assert.ok(Math.abs(haversineKm(a, middle) - haversineKm(middle, b)) < 1e-8);
  assert.ok(Math.abs(pathLengthKm([a, middle, b]) - haversineKm(a, b)) < 1e-8);
});

test('date-line crossings split at the same latitude without a world-spanning chord', () => {
  for (const [a, b] of [
    [{ lat: 35, lng: 170 }, { lat: 40, lng: -170 }],
    [{ lat: 40, lng: -170 }, { lat: 35, lng: 170 }],
  ]) {
    const segments = greatCircleSegments(a, b);
    assert.equal(segments.length, 2);
    assert.ok(Math.abs(segments[0].at(-1)[1]) === 180);
    assert.equal(segments[0].at(-1)[0], segments[1][0][0]);
    assert.equal(segments[0].at(-1)[1], -segments[1][0][1]);
    for (const segment of segments) {
      for (let i = 1; i < segment.length; i++) {
        assert.ok(Math.abs(segment[i][1] - segment[i - 1][1]) <= 180);
      }
    }
    const km = segments.reduce((sum, segment) => sum + pathLengthKm(segment.map(([lat, lng]) => ({ lat, lng }))), 0);
    assert.ok(Math.abs(km - haversineKm(a, b)) < 1e-5);
  }
});

test('coincident, polar and antipodal routes remain finite', () => {
  for (const [a, b] of [
    [{ lat: 0, lng: 0 }, { lat: 0, lng: 0 }],
    [{ lat: 0, lng: 0 }, { lat: 0, lng: 180 }],
    [{ lat: 90, lng: 0 }, { lat: -90, lng: 0 }],
  ]) {
    assert.deepEqual(greatCirclePoint(a, b, 0), a);
    assert.deepEqual(greatCirclePoint(a, b, 1), b);
    for (const segment of greatCircleSegments(a, b)) {
      for (const [lat, lng] of segment) assert.ok(isValidLatLng(lat, lng));
    }
  }
});

test('map data requests deduplicate across consumers and retry after failures', async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  try {
    globalThis.fetch = async () => {
      requests += 1;
      return new Response('', { status: 404 });
    };
    await assert.rejects(loadMapData(), /HTTP 404/);
    await assert.rejects(loadMapData(), /HTTP 404/);
    assert.equal(requests, 10);
    const files = { 'countries.geojson': countries, 'places.geojson': places };
    globalThis.fetch = async (url) => {
      requests += 1;
      return new Response(JSON.stringify(files[String(url).split('/').at(-1)] ?? {}));
    };
    const first = loadMapData();
    const second = loadMapData();
    assert.equal(first, second);
    const [loaded, again] = await Promise.all([first, second]);
    assert.equal(loaded, again);
    assert.ok(loaded.countryById.has('CHN'));
    assert.equal(loaded.countryByIso2.get('CN')?.properties.id, 'CHN');
    assert.equal(await loadMapData(), loaded);
    assert.equal(requests, 15);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
