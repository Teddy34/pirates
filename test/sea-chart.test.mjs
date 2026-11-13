import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { WORLD, NATIONS } from '../src/data.mjs';
import { decodeNavigationMap } from '../src/world-map.mjs';
import {
  CHART_BORDER, MARKER_ANCHOR, MARKER_SIZE, compassPointTo, distanceField, filterTowns, layoutLabels, paintChartBase, paintTownMarker,
} from '../src/sea-chart.mjs';

const map = decodeNavigationMap(gunzipSync(readFileSync(new URL('../assets/world-1660.bin', import.meta.url))), WORLD.width, WORLD.height);
const towns = JSON.parse(readFileSync(new URL('../assets/scenarios.json', import.meta.url))).eras['1660'].towns;

test('the chart is one pixel per world cell inside its frame, fully opaque', () => {
  const chart = paintChartBase(map);
  assert.equal(chart.width, WORLD.width + CHART_BORDER * 2);
  assert.equal(chart.height, WORLD.height + CHART_BORDER * 2);
  for (let index = 3; index < chart.pixels.length; index += 4) assert.equal(chart.pixels[index], 255);
  // The compass rose sits in open water, well clear of any coast.
  assert.ok(chart.rose.distance >= 20);
});

test('land is drawn darker than the sea around it', () => {
  const chart = paintChartBase(map);
  const brightness = (x, y) => {
    const offset = ((y + CHART_BORDER) * chart.width + x + CHART_BORDER) * 4;
    return chart.pixels[offset] + chart.pixels[offset + 1] + chart.pixels[offset + 2];
  };
  // Inland Mexico versus the open Gulf beside the compass rose.
  assert.ok(brightness(30, 330) < brightness(chart.rose.x + 25, chart.rose.y + 25));
});

test('distance fields count chessboard steps up to the cap', () => {
  const classes = Uint8Array.from([
    0, 0, 0, 0, 0,
    0, 0, 0, 0, 0,
    0, 0, 2, 0, 0,
    0, 0, 0, 0, 0,
  ]);
  const distance = distanceField(classes, 5, 4, (value) => value === 2, 2);
  assert.deepEqual([...distance], [
    2, 2, 2, 2, 2,
    2, 1, 1, 1, 2,
    2, 1, 0, 1, 2,
    2, 1, 1, 1, 2,
  ]);
});

test('compass points follow the chart, with y growing south', () => {
  assert.equal(compassPointTo(0, 0, 0, -10), 'N');
  assert.equal(compassPointTo(0, 0, 10, 0), 'E');
  assert.equal(compassPointTo(0, 0, 10, 10), 'SE');
  assert.equal(compassPointTo(0, 0, -10, 4), 'WSW');
  assert.equal(compassPointTo(5, 5, 5, 5), null);
});

test('the gazetteer filter ignores case and accents and keeps town indices', () => {
  const sample = [{ name: 'Santo Domingo', nation: 'Spain' }, { name: 'Petit-Goâve', nation: 'France' }, { name: 'San Juan', nation: 'Spain' }];
  assert.deepEqual(filterTowns(sample, { query: 'goave' }).map(({ index }) => index), [1]);
  assert.deepEqual(filterTowns(sample, { query: ' SAN' }).map(({ town }) => town.name), ['San Juan', 'Santo Domingo']);
  assert.deepEqual(filterTowns(sample, { nation: 'France' }).map(({ index }) => index), [1]);
  assert.equal(filterTowns(towns).length, towns.length);
});

test('labels avoid each other and the markers, and give up when crowded', () => {
  const markers = [{ x: 100, y: 100, radius: 6 }, { x: 110, y: 100, radius: 6 }];
  const items = markers.map(({ x, y }, id) => ({ id, x, y, width: 60, height: 14, gap: 8 }));
  const bounds = { left: 0, top: 0, right: 400, bottom: 300 };
  const placed = layoutLabels(items, markers, bounds);
  const boxes = [...placed.values()].filter(Boolean).map(({ x, y }) => ({ left: x, top: y, right: x + 60, bottom: y + 14 }));
  assert.equal(boxes.length, 2);
  const [a, b] = boxes;
  assert.ok(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
  for (const box of boxes) {
    for (const { x, y, radius } of markers) {
      assert.ok(box.right <= x - radius || box.left >= x + radius || box.bottom <= y - radius || box.top >= y + radius);
    }
  }
  // A label wider than the screen has nowhere to go.
  assert.equal(layoutLabels([{ id: 0, x: 50, y: 50, width: 500, height: 14, gap: 8 }], [], bounds).get(0), null);
});

test('town markers are opaque at their anchor for every flag', () => {
  for (const key of Object.keys(NATIONS)) {
    for (const fortified of [false, true]) {
      const pixels = paintTownMarker({ ...NATIONS[key], fortified });
      assert.equal(pixels.length, MARKER_SIZE * MARKER_SIZE * 4);
      assert.equal(pixels[(MARKER_ANCHOR.y * MARKER_SIZE + MARKER_ANCHOR.x) * 4 + 3], 255);
    }
  }
});
