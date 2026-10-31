import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { SHIPS, WORLD } from '../src/data.mjs';
import { createRng, nearestTriggerTown } from '../src/mechanics.mjs';
import {
  DIR, MAP_KIND, COMPLETE_MAP, PARTY_CELLS_PER_TICK, REBOARD_REACH_CELLS,
  walkVectorForHeading, walkVectorForDirections, walkStep, boardingHeading, roundUpToHalfDay,
  stepOnFoot, fleetRow, reefVictim, crewAfterReef,
  emptyMapRecords, mapPieceCount, giveMapPiece, digForTreasure,
} from '../src/overland.mjs';
import { TREASURE_SITES } from '../src/treasure-sites.mjs';
import { PIXEL, decodeNavigationMap, pixelClassAt } from '../src/world-map.mjs';

const ship = (type) => ({ type, damage: 0 });
const bounds = { minX: 0, minY: 0, maxX: 640, maxY: 480 };

test('landing starts the party walking the way the ship sailed, rounded to eight directions', () => {
  assert.deepEqual(walkStep(walkVectorForHeading(0)), { dx: 0, dy: -1, dirBits: DIR.NORTH });
  // Heading 16 is (35, -75): the x component lies inside the ±50 dead zone.
  assert.deepEqual(walkStep(walkVectorForHeading(16)), { dx: 0, dy: -1, dirBits: DIR.NORTH });
  assert.deepEqual(walkStep(walkVectorForHeading(32)), { dx: 1, dy: -1, dirBits: DIR.NORTH | DIR.EAST });
  assert.deepEqual(walkStep(walkVectorForHeading(200)), { dx: -1, dy: 0, dirBits: DIR.WEST });
});

test('direction keys set a persistent ±150 vector and opposite keys cancel', () => {
  assert.deepEqual(walkVectorForDirections({ south: true, west: true }), { x: -150, y: 150 });
  assert.equal(walkVectorForDirections({ east: true, west: true }), null);
  assert.equal(walkVectorForDirections({}), null);
});

test('re-boarding faces the way the party walked; no direction faces north', () => {
  assert.equal(boardingHeading(0), 0);
  assert.equal(boardingHeading(DIR.EAST), 64);
  assert.equal(boardingHeading(DIR.SOUTH), 128);
  assert.equal(boardingHeading(DIR.WEST), 192);
  assert.equal(boardingHeading(DIR.SOUTH | DIR.WEST), 160);
  assert.equal(boardingHeading(DIR.NORTH | DIR.EAST), 32);
});

test('land/sea switches round the voyage clock up to the next half day', () => {
  assert.equal(roundUpToHalfDay(64), 95);
  assert.equal(roundUpToHalfDay(95), 95);
  assert.equal(roundUpToHalfDay(96), 127);
});

test('the party walks two cells a day, stops at water, and boards only at the landing spot', () => {
  const landEastOf = (limit) => (x) => x >= limit;
  const ship = { x: 9.5, y: 5 };
  const landing = { x: 10, y: 5 };
  const walk = { x: 150, y: 0 };
  const moved = stepOnFoot({ party: { x: 10, y: 5 }, walk, ship, landing, isLand: landEastOf(10), bounds });
  assert.equal(moved.outcome, 'walk');
  assert.equal(moved.x, 10 + PARTY_CELLS_PER_TICK);
  assert.equal(PARTY_CELLS_PER_TICK * 64, 2);

  const blocked = stepOnFoot({ party: { x: 20, y: 5 }, walk: { x: -150, y: 0 }, ship, landing, isLand: landEastOf(20), bounds });
  assert.deepEqual([blocked.outcome, blocked.x], ['blocked', 20]);
  assert.equal(blocked.toX, 20 - PARTY_CELLS_PER_TICK);

  const back = stepOnFoot({ party: { x: 10, y: 5 }, walk: { x: -150, y: 150 }, ship, landing, isLand: landEastOf(10), bounds });
  assert.equal(back.outcome, 'board');
  assert.deepEqual([back.x, back.y, back.heading], [9.5, 5, 160]);

  const farFromBoat = stepOnFoot({ party: { x: 10, y: 5 + REBOARD_REACH_CELLS + .1 }, walk: { x: -150, y: 0 }, ship, landing, isLand: landEastOf(10), bounds });
  assert.equal(farFromBoat.outcome, 'blocked');
  assert.equal(stepOnFoot({ party: { x: 12, y: 5 }, walk: { x: 10, y: -20 }, ship, landing, isLand: () => true, bounds }).outcome, 'idle');
});

test('reefs wreck the last ship bigger than a sloop, once per cooldown', () => {
  const ships = [ship('Sloop'), ship('Frigate'), ship('Barque'), ship('Pinnace')];
  assert.equal(fleetRow(ships, SHIPS), 5);
  const base = { onFoot: false, shallow: true, cooldown: 0, ships, shipStats: SHIPS };
  assert.equal(reefVictim(base), 2);
  assert.equal(reefVictim({ ...base, cooldown: 1 }), -1);
  assert.equal(reefVictim({ ...base, shallow: false }), -1);
  assert.equal(reefVictim({ ...base, onFoot: true }), -1);
  assert.equal(reefVictim({ ...base, ships: [ship('Sloop'), ship('Pinnace')] }), -1);
  // A lone big ship is the victim: the last-ship path follows.
  assert.equal(reefVictim({ ...base, ships: [ship('Galleon')] }), 0);
  // Remaining Sloop + Frigate + Pinnace hold 96 + 224 + 64 men.
  assert.equal(crewAfterReef(500, [ship('Sloop'), ship('Frigate'), ship('Pinnace')], SHIPS), 384);
  assert.equal(crewAfterReef(100, [ship('Sloop')], SHIPS), 96);
});

const sites = [[10, 10], [50, 50], [90, 90], [130, 130]];
const nearestTown = (x) => Math.floor(x / 40);

test('a new map rolls a site away from the current town and the other maps’ towns', () => {
  const rng = createRng(7);
  let records = emptyMapRecords();
  records = giveMapPiece({ records, kind: MAP_KIND.BURIED, sites, nearestTown, currentTownIndex: 0, difficulty: 1, rng });
  const buried = records[MAP_KIND.BURIED];
  assert.notEqual(buried.townIndex, 0);
  assert.equal(nearestTown(buried.site[0]), buried.townIndex);
  assert.equal(mapPieceCount(buried), 1);
  records = giveMapPiece({ records, kind: MAP_KIND.RELATIVE, sites, nearestTown, currentTownIndex: 0, difficulty: 1, rng });
  assert.notEqual(records[MAP_KIND.RELATIVE].townIndex, buried.townIndex);
  assert.notEqual(records[MAP_KIND.RELATIVE].townIndex, 0);
  // More pieces never move the site; a complete map stays complete.
  for (let piece = 0; piece < 6; piece += 1) {
    records = giveMapPiece({ records, kind: MAP_KIND.BURIED, sites, nearestTown, currentTownIndex: 3, difficulty: 1, rng });
    assert.deepEqual(records[MAP_KIND.BURIED].site, buried.site);
  }
  assert.equal(records[MAP_KIND.BURIED].pieces, COMPLETE_MAP);
});

test('Apprentice receives the whole map at once; the lost city is named by rescues so far', () => {
  const records = giveMapPiece({ records: emptyMapRecords(), kind: MAP_KIND.LOST_CITY, sites, nearestTown, currentTownIndex: 0, difficulty: 0, relativesRescued: 2, rng: createRng(3) });
  assert.equal(records[MAP_KIND.LOST_CITY].pieces, COMPLETE_MAP);
  assert.equal(records[MAP_KIND.LOST_CITY].city, 2);
});

test('digging needs one piece and a cell within one of the site', () => {
  const records = emptyMapRecords();
  records[MAP_KIND.BURIED] = { pieces: 4, site: [100, 100], townIndex: 2, city: 0 };
  records[MAP_KIND.LOST_CITY] = { pieces: 1, site: [101, 101], townIndex: 3, city: 1 };
  const miss = digForTreasure({ records, cellX: 102, cellY: 98, rng: createRng(1) });
  assert.equal(miss.finds.length, 0);
  assert.deepEqual(miss.records, records);

  const hit = digForTreasure({ records, cellX: 101, cellY: 100, rng: createRng(1) });
  assert.deepEqual(hit.finds.map(({ kind }) => kind), [MAP_KIND.BURIED, MAP_KIND.LOST_CITY]);
  const buriedGold = hit.finds[0].gold;
  assert.ok(buriedGold >= 5000 && buriedGold <= 13000 && buriedGold % 1000 === 0);
  assert.equal(hit.finds[1].gold, 100000);
  assert.equal(hit.gold, buriedGold + 100000);
  // The dig clears only the pieces (0xABB0); site and town stay.
  assert.deepEqual(hit.records.map(({ pieces }) => pieces), [0, 0, 0]);
  assert.equal(hit.records[MAP_KIND.BURIED].townIndex, 2);
});

test('a new map avoids the towns of earlier, already dug maps', () => {
  const records = emptyMapRecords();
  // Town 1 belonged to a dug buried map, town 2 to a dug lost-city map.
  records[MAP_KIND.BURIED] = { pieces: 0, site: [50, 50], townIndex: 1, city: 0 };
  records[MAP_KIND.LOST_CITY] = { pieces: 0, site: [90, 90], townIndex: 2, city: 0 };
  for (let seed = 1; seed < 40; seed += 1) {
    const next = giveMapPiece({ records, kind: MAP_KIND.BURIED, sites, nearestTown, currentTownIndex: 0, difficulty: 1, rng: createRng(seed) });
    assert.equal(next[MAP_KIND.BURIED].townIndex, 3);
  }
});

test('a rescue hands out a lost-city piece before the rescue count rises', () => {
  const records = emptyMapRecords();
  records[MAP_KIND.RELATIVE] = { pieces: 2, site: [40, 40], townIndex: 1, city: 0 };
  const result = digForTreasure({
    records, cellX: 40, cellY: 41, rng: createRng(1), relativesRescued: 1,
    giveLostCityPiece: (next, rescued) => giveMapPiece({ records: next, kind: MAP_KIND.LOST_CITY, sites, nearestTown, currentTownIndex: null, difficulty: 1, relativesRescued: rescued, rng: createRng(5) }),
  });
  assert.equal(result.relativesRescued, 2);
  assert.equal(result.finds[0].relative, 1);
  assert.equal(result.records[MAP_KIND.RELATIVE].pieces, 0);
  assert.equal(mapPieceCount(result.records[MAP_KIND.LOST_CITY]), 1);
  assert.equal(result.records[MAP_KIND.LOST_CITY].city, 1);
});

test('the dig-site table holds 256 cells, nearly all on land on the 1560 map', async () => {
  assert.equal(TREASURE_SITES.length, 256);
  const map = decodeNavigationMap(
    new Uint8Array(gunzipSync(await readFile(new URL('../assets/world-1560.bin', import.meta.url)))),
    WORLD.width, WORLD.height,
  );
  // treasure_fleet_silver_train.md §4: 254 of the 256 sites are on land
  // tiles; sample each site's cell centre.
  const onLand = TREASURE_SITES.filter(([x, y]) => pixelClassAt(map, x + .5, y + .5) === PIXEL.LAND).length;
  assert.ok(onLand >= 250, `${onLand} sites on land`);
  const scenarios = JSON.parse(await readFile(new URL('../assets/scenarios.json', import.meta.url), 'utf8')).eras;
  const triggers = scenarios['1560'].townTriggers;
  // The sites cluster in the west (Florida, Cuba, Yucatán, Central America).
  assert.ok(TREASURE_SITES.every(([x, y]) => nearestTriggerTown(triggers, x, y) >= 0));
});
