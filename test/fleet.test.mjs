import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fleetIsUndermanned, abandonShip, removeShipWithCargo, restartAfterLastShip, findShore, INLAND_RELEASE_OFFSETS,
  CAPTIVITY_STEP_DAYS, captivityContinues, healthLevel, releaseFromCaptivity,
} from '../src/mechanics.mjs';
import { SHIPS } from '../src/data.mjs';

const player = (overrides = {}) => ({
  ships: [{ type: 'Frigate', damage: 32 }, { type: 'Sloop', damage: 0 }, { type: 'Galleon', damage: 16 }],
  crew: 20, cannon: 40, foodFixed: 50 * 256, goods: 30, specialGoods: 5, partyGold: 4000,
  personalWealth: 12345, reputation: 4,
  ...overrides,
});

test('the fleet check needs eight men for every ship', () => {
  assert.equal(fleetIsUndermanned({ crew: 24, shipCount: 3 }), false);
  assert.equal(fleetIsUndermanned({ crew: 23, shipCount: 3 }), true);
  assert.equal(fleetIsUndermanned({ crew: 7, shipCount: 1 }), true);
  assert.equal(fleetIsUndermanned({ crew: 8, shipCount: 1 }), false);
});

test('abandoning a ship for lack of crew keeps every cargo', () => {
  const before = player();
  const { player: after, lost } = abandonShip(before, 2);
  assert.deepEqual(lost, { type: 'Galleon', damage: 16 });
  assert.deepEqual(after.ships, [{ type: 'Frigate', damage: 32 }, { type: 'Sloop', damage: 0 }]);
  for (const key of ['crew', 'cannon', 'foodFixed', 'goods', 'specialGoods', 'partyGold']) {
    assert.equal(after[key], before[key]);
  }
  assert.throws(() => abandonShip(player({ ships: [{ type: 'Sloop', damage: 0 }] }), 0));
});

test('a lost ship takes its share of the hold with the decoded rounding', () => {
  // Units: Frigate 12, Sloop 4, Galleon 16, so the Galleon's share is 16/32.
  const before = player({ partyGold: 4001, foodFixed: 50 * 256 + 3, goods: 31, specialGoods: 5, cannon: 41 });
  const { player: after, lost } = removeShipWithCargo(before, 2, SHIPS);
  assert.deepEqual(lost, { type: 'Galleon', damage: 16 });
  assert.deepEqual(after.ships.map(({ type }) => type), ['Frigate', 'Sloop']);
  assert.equal(after.partyGold, 4001 - 2000);
  assert.equal(after.foodFixed, 12803 - 6402);
  assert.equal(after.goods, 31 - 16);
  assert.equal(after.specialGoods, 5 - 3);
  assert.equal(after.cannon, 41 - 21);
  assert.equal(after.crew, before.crew);
  // The Sloop's share is 4/32: gold truncates (500.125), goods round (3.875).
  const sloop = removeShipWithCargo(before, 1, SHIPS).player;
  assert.equal(sloop.partyGold, 4001 - 500);
  assert.equal(sloop.goods, 31 - 4);
  assert.throws(() => removeShipWithCargo(player({ ships: [{ type: 'Sloop', damage: 0 }] }), 0, SHIPS));
});

test('losing the last ship restarts with the decoded fresh fleet and no gold', () => {
  const after = restartAfterLastShip(player(), { type: 'Frigate', damage: 32 }, SHIPS);
  assert.equal(after.personalWealth, 12345 - 1234);
  assert.equal(after.partyGold, 1111);
  assert.deepEqual(after.ships, [{ type: 'Frigate', damage: 0 }]);
  assert.equal(after.cannon, 2 * 5 + 6);
  assert.equal(after.foodFixed, 15 * 256);
  assert.equal(after.goods, 0);
  assert.equal(after.specialGoods, 0);
  assert.equal(after.crew, 20);
  assert.equal(after.monthsAtSea, 0);
  assert.equal(restartAfterLastShip(player({ reputation: -12, crew: 3 }), { type: 'Sloop' }, SHIPS).crew, 8);
  assert.equal(restartAfterLastShip(player({ reputation: -40, crew: 3 }), { type: 'Sloop' }, SHIPS).crew, 8);
});

test('the shore search finds the first land cell on clockwise rings and faces away from it', () => {
  // Land is the column x >= 10; everything else is open water.
  const map = { width: 20, height: 20, isLand: (x) => x >= 10, isOpenWater: (x) => x < 10 };
  assert.deepEqual(findShore(8, 5, map), { x: 9, y: 3, heading: 192 });
  // Land to the north (y <= 2): the first ring hit is the top-left corner.
  const north = { width: 20, height: 20, isLand: (_, y) => y <= 2, isOpenWater: (_, y) => y > 2 };
  assert.deepEqual(findShore(5, 4, north), { x: 3, y: 3, heading: 128 });
  assert.equal(findShore(5, 5, { width: 4, height: 4, isLand: () => false, isOpenWater: () => true }), null);
});

test('inland towns carry the documented release offsets', () => {
  assert.deepEqual(INLAND_RELEASE_OFFSETS['Gran Granada'], [50, 0]);
  assert.deepEqual(INLAND_RELEASE_OFFSETS.Panama, [0, -20]);
  assert.equal(Object.keys(INLAND_RELEASE_OFFSETS).length, 6);
});

test('captivity lasts while the step count is within reputation/2 + 6', () => {
  const steps = (reputation) => { let n = 0; while (captivityContinues(reputation, n)) n += 1; return n; };
  assert.equal(CAPTIVITY_STEP_DAYS, 27);
  assert.equal(steps(0), 7);
  assert.equal(steps(5), 9);
  assert.equal(steps(-3), 6);
  assert.equal(steps(-14), 0);
  assert.equal(steps(-15), 0);
});

test('health counts years and wounds in thirds, quarters with medicine', () => {
  assert.equal(healthLevel({ yearsElapsed: 2, wounds: 0 }), 0);
  assert.equal(healthLevel({ yearsElapsed: 2, wounds: 1 }), 1);
  assert.equal(healthLevel({ yearsElapsed: 3, wounds: 0, medicine: true }), 0);
  assert.equal(healthLevel({ yearsElapsed: 20, wounds: 0 }), 3);
});

test('release from captivity frees every prisoner and lowers the difficulty', () => {
  // 0x1F88F clears all eight 0x4720A slots, hunters as well as pirates.
  const captives = [{ pirate: true }, { pirate: false, nation: 'Spain' }];
  const released = releaseFromCaptivity({ capturedCaptains: captives }, 2);
  assert.deepEqual(released.player.capturedCaptains, []);
  assert.equal(released.difficulty, 1);
  assert.equal(releaseFromCaptivity({}, 0).difficulty, 0);
});
