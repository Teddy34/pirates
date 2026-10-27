import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { WORLD } from '../src/data.mjs';

const scenarios = JSON.parse(await readFile(new URL('../assets/scenarios.json', import.meta.url), 'utf8')).eras;
const readMap = async (era) => new Uint8Array(await readFile(new URL(`../assets/world-${era}.bin`, import.meta.url)));
const cell = (packed, x, y) => (packed[(y * WORLD.width + x) >> 2] >> (((y * WORLD.width + x) & 3) * 2)) & 3;

test('all six eras contain complete maps and scenario data', async () => {
  assert.deepEqual(Object.keys(scenarios), ['1560', '1600', '1620', '1640', '1660', '1680']);
  for (const era of Object.keys(scenarios)) {
    assert.equal((await readMap(era)).length, WORLD.width * WORLD.height / 4);
    assert.ok(scenarios[era].towns.length >= 34);
    const expectedNations = era === '1560'
      ? ['England', 'France', 'Spain']
      : ['England', 'France', 'Holland', 'Spain'];
    assert.deepEqual(Object.keys(scenarios[era].starts), expectedNations);
  }
});

test('national careers retain their decoded record and relation ordering', () => {
  assert.equal(scenarios['1600'].starts.Holland.name, 'Dutch Trader');
  assert.equal(scenarios['1620'].starts.France.diplomacy[1][2], -1);
  assert.equal(scenarios['1680'].starts.Spain.favour[0], 4);
  assert.equal(scenarios['1680'].starts.Spain.ranks[0], 1);
});

test('every coastal town in every era has a navigable sea approach', async () => {
  for (const [era, scenario] of Object.entries(scenarios)) {
    const packed = await readMap(era);
    for (const town of scenario.towns) {
      if (town.flags & 0x40) continue; // Inland villages are reached overland.
      let nearestSea = Infinity;
      for (let dy = -7; dy <= 7; dy += 1) {
        for (let dx = -7; dx <= 7; dx += 1) {
          const x = town.x + dx;
          const y = town.y + dy;
          if (x < 0 || y < 0 || x >= WORLD.width || y >= WORLD.height) continue;
          if (cell(packed, x, y) === 0) nearestSea = Math.min(nearestSea, Math.abs(dx) + Math.abs(dy));
        }
      }
      assert.ok(nearestSea <= 7, `${era} ${town.name} has no reachable approach within seven cells`);
    }
  }
});

test('all difficulty start points have nearby navigable water', async () => {
  for (const [era, scenario] of Object.entries(scenarios)) {
    const packed = await readMap(era);
    for (const [nation, start] of Object.entries(scenario.starts)) {
      for (const [startX, startY] of start.points) {
        let found = false;
        for (let distance = 0; distance <= 12 && !found; distance += 1) {
          for (let dy = -distance; dy <= distance; dy += 1) {
            const dx = distance - Math.abs(dy);
            found ||= cell(packed, startX - dx, startY + dy) === 0 || cell(packed, startX + dx, startY + dy) === 0;
          }
        }
        assert.ok(found, `${era} ${nation} start ${startX},${startY} has no nearby water`);
      }
    }
  }
});
