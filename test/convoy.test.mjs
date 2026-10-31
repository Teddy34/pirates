import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CONVOY_CAPTURED_POSITION, convoyRouteIndices, convoyRestartMonth, initialConvoys, stepConvoy,
  monthlyConvoyStep, convoysInTown, meetsTreasureFleet, convoyGarrison, captureConvoys, convoyReport,
  capturedTownPlunder,
} from '../src/mechanics.mjs';

const scripted = (...values) => {
  const calls = [];
  return {
    calls,
    int(limit) {
      calls.push(limit);
      if (values.length === 0) throw new Error(`unscripted roll rnd(${limit})`);
      return values.shift();
    },
  };
};

const towns = () => Array.from({ length: 16 }, (_, index) => ({
  name: `Town ${index}`, nation: index === 3 || index === 4 ? 'Holland' : 'Spain', gold: 50, growth: 100,
}));
const ROUTE = Array.from({ length: 15 }, (_, index) => index);
const routes = { treasureFleet: ROUTE, silverTrain: [...ROUTE].reverse() };

test('the convoys restart in October and April, a month earlier in odd eras (0xCEB8)', () => {
  assert.equal(convoyRestartMonth('treasureFleet', 0), 9);
  assert.equal(convoyRestartMonth('treasureFleet', 1), 8);
  assert.equal(convoyRestartMonth('silverTrain', 4), 3);
  assert.equal(convoyRestartMonth('silverTrain', 5), 2);
});

test('a new game places the convoys from the day of the year (0x136AD)', () => {
  assert.deepEqual(initialConvoys({ routes, dayOfYear: 0, eraIndex: 0 }), {
    treasureFleet: { position: 6, townIndex: 6 },
    silverTrain: { position: 18, townIndex: null },
  });
  assert.deepEqual(initialConvoys({ routes, dayOfYear: 0, eraIndex: 1 }), {
    treasureFleet: { position: 8, townIndex: 8 },
    silverTrain: { position: 20, townIndex: null },
  });
  // The start stop is not checked for Spain: day 300 puts the train at stop 14.
  assert.deepEqual(initialConvoys({ routes, dayOfYear: 300, eraIndex: 0 }), {
    treasureFleet: { position: 2, townIndex: 2 },
    silverTrain: { position: 14, townIndex: 0 },
  });
});

test('a convoy moves one or two stops and skips non-Spanish stops with a new roll (0xCDE9)', () => {
  const world = towns();
  const rng = scripted(1, 0, 1);
  const next = stepConvoy({ convoy: { position: 1, townIndex: 1 }, route: ROUTE, towns: world, restart: false, loadsTreasure: true, rng });
  // 1+1+1 = 3 (Dutch) -> base 2: 2+1+0 = 3 (Dutch) -> base 3: 3+1+1 = 5.
  assert.deepEqual(next, { position: 5, townIndex: 5 });
  assert.deepEqual(rng.calls, [2, 2, 2]);
  assert.equal(world[5].growth, 110);
  assert.equal(world[5].gold, 12);
  assert.equal(world[3].growth, 100);
});

test('the town a convoy reaches grows by 10 to at most 255, and only the fleet takes gold', () => {
  const world = towns();
  world[2].growth = 245;
  world[1].growth = 244;
  stepConvoy({ convoy: { position: 0 }, route: ROUTE, towns: world, restart: false, loadsTreasure: false, rng: scripted(1) });
  stepConvoy({ convoy: { position: 0 }, route: ROUTE, towns: world, restart: false, loadsTreasure: false, rng: scripted(0) });
  assert.equal(world[2].growth, 255);
  assert.equal(world[1].growth, 254);
  assert.equal(world[2].gold, 50);
});

test('past stop 14 a convoy is away and keeps counting until its restart', () => {
  const world = towns();
  const gone = stepConvoy({ convoy: { position: 14 }, route: ROUTE, towns: world, restart: false, loadsTreasure: true, rng: scripted(0) });
  assert.deepEqual(gone, { position: 15, townIndex: null });
  assert.deepEqual(stepConvoy({ convoy: gone, route: ROUTE, towns: world, restart: false, loadsTreasure: true, rng: scripted(1) }), { position: 17, townIndex: null });
  assert.ok(world.every((town) => town.gold === 50 && town.growth === 100));
});

test('the monthly step moves the fleet first and restarts it in its month', () => {
  const world = towns();
  const rng = scripted(0, 1);
  const convoys = { treasureFleet: { position: 20, townIndex: null }, silverTrain: { position: 5, townIndex: 9 } };
  const next = monthlyConvoyStep({ convoys, routes, towns: world, month: 9, eraIndex: 0, rng });
  assert.deepEqual(next.treasureFleet, { position: 0, townIndex: 0 });
  // The train's route is reversed: stop 7 is town 7.
  assert.deepEqual(next.silverTrain, { position: 7, townIndex: 7 });
  assert.equal(world[0].gold, 12);
  assert.equal(world[7].gold, 50);
});

test('the treasure fleet is met only in its town’s waters, when rnd(24) > alert (0xD44F)', () => {
  const convoys = { treasureFleet: { position: 3, townIndex: 6 }, silverTrain: { position: 20, townIndex: null } };
  const none = scripted();
  assert.equal(meetsTreasureFleet({ convoys, nearestTownIndex: 5, alert: 0, rng: none }), false);
  assert.deepEqual(none.calls, []);
  assert.equal(meetsTreasureFleet({ convoys, nearestTownIndex: 6, alert: 4, rng: scripted(5) }), true);
  assert.equal(meetsTreasureFleet({ convoys, nearestTownIndex: 6, alert: 4, rng: scripted(4) }), false);
  const away = { ...convoys, treasureFleet: { position: 16, townIndex: null } };
  assert.equal(meetsTreasureFleet({ convoys: away, nearestTownIndex: 6, alert: 0, rng: none }), false);
});

test('taking a town with both convoys adds 20 x byte 5 each before the treasury loss', () => {
  const convoys = { treasureFleet: { position: 4, townIndex: 2 }, silverTrain: { position: 9, townIndex: 2 } };
  assert.deepEqual(convoysInTown(convoys, 2), ['treasureFleet', 'silverTrain']);
  const result = captureConvoys({ convoys, townIndex: 2, goldByte: 255 });
  assert.equal(result.bonus, 10200);
  assert.deepEqual(result.captured, ['treasureFleet', 'silverTrain']);
  assert.deepEqual(result.convoys.treasureFleet, { position: CONVOY_CAPTURED_POSITION, townIndex: null });
  assert.deepEqual(result.convoys.silverTrain, { position: 16, townIndex: null });
  assert.deepEqual(captureConvoys({ convoys, townIndex: 3, goldByte: 255 }).bonus, 0);

  const loot = capturedTownPlunder({ town: { gold: 10, growth: 1, forts: 0 }, alert: 0, convoyBonus: 5100, rng: scripted(0, 0, 0, 0) });
  assert.equal(loot.gold, 61000);
  assert.equal(loot.treasuryLoss, 122);
});

test('a convoy in town adds ten soldiers each to the garrison under attack (0x18B9C)', () => {
  assert.equal(convoyGarrison(20, 0), 20);
  assert.equal(convoyGarrison(20, 2), 40);
  assert.equal(convoyGarrison(250, 1), 255);
});

test('convoy reports use the original sentence, with Spain and Peru when away', () => {
  const world = towns();
  assert.equal(convoyReport('treasureFleet', { townIndex: 2 }, world).message, 'The Treasure Fleet is in Town 2.');
  assert.equal(convoyReport('treasureFleet', { townIndex: null }, world).message, 'The Treasure Fleet is in Spain.');
  assert.equal(convoyReport('silverTrain', { townIndex: null }, world).message, 'The Silver Train is in Peru.');
});

test('every era’s routes name its towns and carry the decoded fleet template', () => {
  const { eras } = JSON.parse(readFileSync(new URL('../assets/scenarios.json', import.meta.url), 'utf8'));
  for (const era of Object.values(eras)) {
    for (const kind of ['treasureFleet', 'silverTrain']) {
      assert.equal(convoyRouteIndices(era.convoyRoutes[kind], era.towns).length, 15);
    }
    assert.equal(era.treasureFleet[0], 'Galleon');
    assert.equal(era.treasureFleet[1], 'Spain');
  }
  assert.deepEqual(eras['1560'].treasureFleet, ['Galleon', 'Spain', 72, 26, 5, 255, 90]);
  assert.equal(eras['1680'].treasureFleet[5], 100);
});
