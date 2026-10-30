import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { WORLD } from '../src/data.mjs';
import { PIXEL, decodeNavigationMap, pixelClassAt } from '../src/world-map.mjs';
import { TERRAIN_CHUNK_CELLS, TERRAIN_PIXELS_PER_CELL, TERRAIN_TONES, buildCoastField, paintTerrainChunk } from '../src/terrain.mjs';

const map = decodeNavigationMap(
  new Uint8Array(gunzipSync(await readFile(new URL('../assets/world-1680.bin', import.meta.url)))),
  WORLD.width, WORLD.height,
);
const coast = buildCoastField(map);
const size = TERRAIN_CHUNK_CELLS * TERRAIN_PIXELS_PER_CELL;

test('terrain chunks paint land as land and sea as sea', () => {
  // Chunk (7, 5) holds western Cuba with open sea, shallows and inland hills.
  const pixels = paintTerrainChunk(map, coast, 7, 5);
  assert.equal(pixels.length, size * size * 4);
  const counts = { land: 0, water: 0 };
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const color = (pixels[offset] << 16) | (pixels[offset + 1] << 8) | pixels[offset + 2];
      const cls = pixelClassAt(map, 7 * TERRAIN_CHUNK_CELLS + (x + .5) / TERRAIN_PIXELS_PER_CELL, 5 * TERRAIN_CHUNK_CELLS + (y + .5) / TERRAIN_PIXELS_PER_CELL);
      const medium = cls === PIXEL.LAND ? 'land' : 'water';
      assert.ok(TERRAIN_TONES[medium].has(color), `${medium} pixel ${x},${y} painted #${color.toString(16)}`);
      counts[medium] += 1;
    }
  }
  assert.ok(counts.land > 10000 && counts.water > 10000);
});

test('terrain chunks are deterministic', () => {
  assert.deepEqual(paintTerrainChunk(map, coast, 18, 7), paintTerrainChunk(map, coast, 18, 7));
});
