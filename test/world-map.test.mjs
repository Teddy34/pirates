import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { WORLD } from '../src/data.mjs';
import { CELL, PIXEL, decodeNavigationMap, isNavigableAt, pixelClassAt } from '../src/world-map.mjs';
import { nearestTriggerTown } from '../src/mechanics.mjs';

const scenarios = JSON.parse(await readFile(new URL('../assets/scenarios.json', import.meta.url), 'utf8')).eras;
const readMap = async (era) => decodeNavigationMap(
  new Uint8Array(gunzipSync(await readFile(new URL(`../assets/world-${era}.bin`, import.meta.url)))),
  WORLD.width, WORLD.height,
);
// A cell offers a sea approach when any of its 16x16 pixels is water or shallows.
const cellHasWater = (map, x, y) => {
  const kind = map.cells[y * WORLD.width + x];
  if (kind === CELL.WATER) return true;
  if (kind !== CELL.MIXED) return false;
  for (let py = 0; py < 16; py += 1) {
    for (let px = 0; px < 16; px += 1) {
      if (isNavigableAt(map, x + (px + .5) / 16, y + (py + .5) / 16)) return true;
    }
  }
  return false;
};

test('all six eras contain complete maps and scenario data', async () => {
  assert.deepEqual(Object.keys(scenarios), ['1560', '1600', '1620', '1640', '1660', '1680']);
  for (const era of Object.keys(scenarios)) {
    assert.equal((await readMap(era)).cells.length, WORLD.width * WORLD.height);
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
          if (cellHasWater(packed, x, y)) nearestSea = Math.min(nearestSea, Math.abs(dx) + Math.abs(dy));
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
        // Mirrors movePlayerToNavigableCell: the start itself, else a cell centre.
        let found = isNavigableAt(packed, startX, startY);
        for (let distance = 1; distance <= 12 && !found; distance += 1) {
          for (let dy = -distance; dy <= distance; dy += 1) {
            const dx = distance - Math.abs(dy);
            found ||= isNavigableAt(packed, startX - dx + .5, startY + dy + .5)
              || isNavigableAt(packed, startX + dx + .5, startY + dy + .5);
          }
        }
        assert.ok(found, `${era} ${nation} start ${startX},${startY} has no nearby water`);
      }
    }
  }
});

test('land and sea are classified per map pixel, including shallows', async () => {
  const map = await readMap('1560');
  const counts = [0, 0, 0, 0];
  for (const kind of map.cells) counts[kind] += 1;
  // Measured from MAP1560 with MAP.IMB: tiles 68-79 and 128-254 mix land and
  // water, and tiles 40-59 hold shallow pixels, so all of them are mixed.
  assert.equal(counts[CELL.MIXED], 10166);
  let shallow = 0;
  let mixedLand = 0;
  for (let row = 0; row < WORLD.height; row += 1) {
    for (let col = 0; col < WORLD.width; col += 1) {
      if (map.cells[row * WORLD.width + col] !== CELL.MIXED) continue;
      for (let py = 0; py < 16; py += 4) {
        for (let px = 0; px < 16; px += 4) {
          const kind = pixelClassAt(map, col + px / 16, row + py / 16);
          if (kind === PIXEL.SHALLOW) shallow += 1;
          if (kind === PIXEL.LAND) mixedLand += 1;
        }
      }
    }
  }
  assert.ok(shallow > 0, 'shallow water pixels are present');
  assert.ok(mixedLand > 0, 'coastal cells hold land pixels');
  assert.equal(pixelClassAt(map, -1, 10), PIXEL.LAND);
});

test('trigger tables match the documented era counts and test vectors', () => {
  const counts = Object.fromEntries(Object.entries(scenarios).map(([era, { townTriggers }]) => [era, townTriggers.length]));
  assert.deepEqual(counts, { 1560: 223, 1600: 230, 1620: 267, 1640: 300, 1660: 305, 1680: 314 });
  assert.equal(new Set(scenarios['1560'].townTriggers.map(([x, y]) => `${x},${y}`)).size, 210);
  for (const scenario of Object.values(scenarios)) {
    assert.equal(new Set(scenario.townTriggers.map(([, , town]) => town)).size, scenario.towns.length);
  }
  const towns1660 = scenarios['1660'].towns;
  const tie = nearestTriggerTown(scenarios['1660'].townTriggers, 401, 205);
  assert.equal(towns1660[tie].name, 'Port-de-Paix');
});

// Inland towns are not asserted dry: Panama faces the Pacific and Gran Granada
// Lake Nicaragua, neither of which a ship can reach from the Caribbean.
test('every coastal town has a trigger cell beside water', async () => {
  for (const [era, scenario] of Object.entries(scenarios)) {
    const map = await readMap(era);
    const besideSea = ([x, y]) => [-1, 0, 1].some((dx) => [-1, 0, 1].some((dy) => cellHasWater(map, x + dx, y + dy)));
    scenario.towns.forEach((town, index) => {
      const cells = scenario.townTriggers.filter(([, , owner]) => owner === index);
      const inland = town.harbors[1][0] === 0 || town.harbors[1][1] === 0;
      if (!inland) assert.ok(cells.some(besideSea), `${era} ${town.name}`);
    });
  }
});
