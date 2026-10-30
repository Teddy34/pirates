import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acceptsRudderInput, advanceDate, VOYAGE_START_TICK, isHalfDayTick, isDailyTick, voyageDays, consumeDailyFood, encounterRoll, foodDays, starvationDesertion, monthEndCrewEvent, mutinyOutcome,
  isEncounterHunter, drawHunterCaptain, captainName, captainRenown, prizeMoraleBonus, startFromRecord, createRng, hunterOvertakes, escapeCostsShip, harborAttempt,
  merchantCommodityPrice, merchantFoodPrice, morale, relativeHeadingSector, tavernRecruits,
  diplomaticBriefing, tavernSpecialEncounters,
  merchantCash, shipRepairPrice, shipSalePrice, shipwrightCash,
  dividePlunder, startNewExpedition, pirateCaptainTerms, governorPromotion, convoyReport,
  approximateDistance, cloudCountForMonth, targetSailingSpeed,
  turnHeadingDownwind, shiftWind, createVoyageClouds, driftClouds,
  nearestCloudDistancePixels, cloudWrapOpacity, applyProvisionalBattleOutcome, stepSailingSpeed,
  applyProvisionalBoardingOutcome,
  capturedShipPlunder, capturedTownPlunder, applyTownCapture, capturedShipRecruits,
  triggerTownAt, nearestTriggerTown, departurePose, townDistanceCells, alertAfterNearestTownCheck,
} from '../src/mechanics.mjs';
import { SHIPS, SPEED_TABLE_1560 } from '../src/data.mjs';

const fixedRng = ({ integer = 0, unit = 0 } = {}) => ({ int: () => integer, unit: () => unit });

test('relative heading uses sixteen compass sectors', () => {
  assert.equal(relativeHeadingSector(192, 192), 0);
  assert.equal(relativeHeadingSector(64, 192), 8);
  assert.equal(relativeHeadingSector(176, 192), 15);
});

test('rudder input follows the binary tick-bit gate', () => {
  assert.deepEqual(Array.from({ length: 8 }, (_, tick) => acceptsRudderInput(tick)), [true, true, true, true, false, false, false, false]);
});

test('documented wind table produces the unclamped sailing target', () => {
  assert.equal(targetSailingSpeed({ heading: 192, wind: 192, speedRow: SPEED_TABLE_1560.Barque, difficulty: 1, hasNavigation: true }), 18);
  assert.equal(targetSailingSpeed({ heading: 64, wind: 192, speedRow: SPEED_TABLE_1560.Galleon, difficulty: 3, hasNavigation: false }), 0);
});

test('cloud distance uses the decoded diagonal approximation', () => {
  assert.equal(approximateDistance(80, 40), 100);
  assert.equal(approximateDistance(-40, -80), 100);
});

test('clouds modify the unclamped wind target', () => {
  const sailing = { heading: 64, wind: 192, speedRow: SPEED_TABLE_1560.Sloop, difficulty: 2, hasNavigation: false };
  assert.equal(targetSailingSpeed(sailing), 9);
  assert.equal(targetSailingSpeed({ ...sailing, cloudDistancePixels: 99 }), 9);
  assert.equal(targetSailingSpeed({ ...sailing, cloudDistancePixels: 100 }), 4);
  assert.equal(targetSailingSpeed({ ...sailing, cloudDistancePixels: 128 }), 9);
});

test('a fair-weather cloud can lift a slow square-rigger above minimum speed', () => {
  const sailing = { heading: 64, wind: 192, speedRow: SPEED_TABLE_1560.Galleon, difficulty: 0, hasNavigation: false };
  assert.equal(targetSailingSpeed(sailing), 3);
  assert.equal(targetSailingSpeed({ ...sailing, cloudDistancePixels: 99 }), 6);
});

test('season fixes zero to three clouds for a voyage', () => {
  assert.deepEqual(Array.from({ length: 12 }, (_, month) => cloudCountForMonth(month)), [3, 2, 2, 1, 1, 0, 1, 1, 2, 2, 3, 3]);
});

test('a close cloud turns the heading one sector downwind', () => {
  assert.equal(turnHeadingDownwind(64, 192), 48);
  assert.equal(turnHeadingDownwind(224, 192), 208);
  assert.equal(turnHeadingDownwind(192, 192), 192);
});

test('wind shift follows the documented mean-reverting sector formula', () => {
  assert.equal(shiftWind(192, fixedRng({ integer: 0 })), 176);
  assert.equal(shiftWind(192, fixedRng({ integer: 7 })), 224);
});

test('clouds use one voyage shape and documented drift rates', () => {
  const rng = { int: () => 2, unit: () => .5 };
  const clouds = createVoyageClouds({ count: 3, playerX: 100, playerY: 100, rng });
  assert.deepEqual(clouds.map((cloud) => cloud.shape), [2, 2, 2]);
  const drifted = driftClouds({ clouds, playerX: 100, playerY: 100, wind: 192, rng });
  assert.deepEqual(drifted.map((cloud) => cloud.x), [99.90625, 99.84375, 99.78125]);
  assert.equal(nearestCloudDistancePixels(drifted, 100, 100), 1.5);
});

test('clouds fade across their fixed-view wrap so browser zoom cannot expose a jump', () => {
  assert.equal(cloudWrapOpacity({ x: 100, y: 100 }, 100, 100), 1);
  assert.equal(cloudWrapOpacity({ x: 118, y: 100 }, 100, 100), 0.5);
  assert.equal(cloudWrapOpacity({ x: 120, y: 100 }, 100, 100), 0);
  assert.equal(cloudWrapOpacity({ x: 100, y: 115 }, 100, 100), 0);
});

test('a fast westbound ship wraps an outrun cloud to the upstream edge only once', () => {
  const playerX = 99.8125;
  const [cloud] = driftClouds({
    clouds: [{ x: 120, y: 100, shape: 0, index: 0 }],
    playerX, playerY: 100, playerDeltaX: -0.1875, wind: 192,
    rng: { unit: () => 0.5 },
  });
  assert.equal(cloud.x, playerX - 20);
  assert.equal(cloud.y, 100);

  const [next] = driftClouds({
    clouds: [cloud], playerX: playerX - 0.1875, playerY: 100,
    playerDeltaX: -0.1875, wind: 192, rng: { unit: () => 0.1 },
  });
  assert.ok(next.x > playerX - 0.1875 - 20);
  assert.equal(next.y, 100);
});

test('a fast northbound ship wraps an outrun cloud to the upstream vertical edge', () => {
  const playerY = 99.8125;
  const [cloud] = driftClouds({
    clouds: [{ x: 100, y: 115, shape: 1, index: 0 }],
    playerX: 100, playerY, playerDeltaX: 0, playerDeltaY: -0.1875,
    wind: 0, rng: { unit: () => 0.5 },
  });
  assert.equal(cloud.x, 100);
  assert.equal(cloud.y, playerY - 15);

  const nextPlayerY = playerY - 0.1875;
  const [next] = driftClouds({
    clouds: [cloud], playerX: 100, playerY: nextPlayerY,
    playerDeltaX: 0, playerDeltaY: -0.1875,
    wind: 0, rng: { unit: () => 0.1 },
  });
  assert.ok(next.y > nextPlayerY - 15);
  assert.equal(next.x, 100);
});

test('a provisional sinking preserves a capacity-safe playable fleet', () => {
  const player = {
    ships: ['Galleon'], crew: 200, cannon: 30, goods: 30, foodFixed: 30 * 256,
    partyGold: 1000, reputation: 0,
  };
  const result = applyProvisionalBattleOutcome(player, { ship: 'Sloop', flag: 'Spain' }, 'sunk', SHIPS);
  assert.deepEqual(result.player.ships, ['Pinnace']);
  assert.equal(result.player.crew, 64);
  assert.equal(result.player.cannon, 8);
  assert.equal(result.player.goods, 16);
  assert.equal(result.player.foodFixed, 0);
  assert.equal(result.player.partyGold, 500);
  assert.deepEqual(player.ships, ['Galleon']);
});

test('provisional capture, defeat, escape, and enemy sinking have distinct outcomes', () => {
  const player = { ships: ['Sloop'], crew: 40, cannon: 8, goods: 0, foodFixed: 0, partyGold: 1000, reputation: 0 };
  const enemy = { ship: 'Barque', flag: 'pirate' };
  assert.deepEqual(applyProvisionalBattleOutcome(player, enemy, 'captured', SHIPS).player.ships, ['Sloop', 'Barque']);
  assert.equal(applyProvisionalBattleOutcome(player, enemy, 'lost', SHIPS).player.crew, 30);
  assert.equal(applyProvisionalBattleOutcome(player, enemy, 'escaped', SHIPS).player.reputation, 0);
  assert.equal(applyProvisionalBattleOutcome(player, enemy, 'enemy-sunk', SHIPS).player.reputation, 1);
});

test('provisional boarding choices apply distinct, capacity-safe consequences', () => {
  const player = { crew: 40, partyGold: 1000, reputation: 3 };
  assert.deepEqual(applyProvisionalBoardingOutcome(player, 32, 'won').player, player);
  assert.deepEqual(applyProvisionalBoardingOutcome(player, 32, 'driven-back').player, { ...player, reputation: 1 });
  assert.deepEqual(applyProvisionalBoardingOutcome(player, 32, 'defeated'), {
    player: { crew: 32, partyGold: 900, reputation: 1 }, casualties: 8, ransom: 100,
  });
  assert.equal(applyProvisionalBoardingOutcome({ ...player, crew: 1 }, 32, 'defeated').player.crew, 1);
});

test('captured ship plunder follows the decoded gold and cargo bounds', () => {
  const calls = [];
  const rng = { int: (limit) => { calls.push(limit); return Math.max(0, limit - 1); }, unit: () => 0 };
  const loot = capturedShipPlunder({
    enemy: { ship: 'Barque', crew: 9, guns: 4, gold: 25, cargo: 25 },
    nearbyTownGrowth: 100, shipStats: SHIPS, rng,
  });
  assert.equal(loot.gold, 2490);
  assert.equal(loot.cannon, 4);
  assert.ok(loot.food + loot.goods + loot.specialGoods + Math.floor(loot.cannon / 2) <= SHIPS.Barque.cargo);
  assert.deepEqual(calls.slice(0, 3), [250, 0x7fff, 0x7fff]);
});

test('captured cargo preserves the binary two-stage fixed-point rounding', () => {
  const results = [0, 26755, 0];
  const loot = capturedShipPlunder({
    enemy: { ship: 'Barque', crew: 0, guns: 0, gold: 1, cargo: 3 },
    nearbyTownGrowth: 0, shipStats: SHIPS, rng: { int: () => results.shift() },
  });
  assert.equal(loot.goods, 0);
  assert.equal(loot.specialGoods, 0);
});

test('town capture computes plunder before damaging the town economy', () => {
  const town = { gold: 40, growth: 80, forts: 2, mood: 1 };
  const originalTown = { ...town };
  const loot = capturedTownPlunder({ town, alert: 0, rng: fixedRng({ integer: 7 }) });
  assert.deepEqual(loot, { gold: 40000, food: 7, goods: 7, specialGoods: 7, cannon: 12, treasuryLoss: 80 });
  assert.deepEqual(applyTownCapture(town, loot), { gold: 0, growth: 60, forts: 2, mood: -2 });
  // A warned town hides gold: 40·1500 / (45 + 15) = 1000 → 10000 gold.
  assert.equal(capturedTownPlunder({ town, alert: 45, rng: fixedRng() }).gold, 10000);
  assert.deepEqual(town, originalTown, 'capture rules must not mutate shared town data');
});

test('captured sailors volunteer only when the offer fits fleet capacity', () => {
  assert.equal(capturedShipRecruits({ enemyCrew: 40, reputation: 1, crew: 50, capacity: 100, rng: fixedRng({ integer: 12 }) }), 12);
  assert.equal(capturedShipRecruits({ enemyCrew: 40, reputation: 1, crew: 95, capacity: 100, rng: fixedRng({ integer: 12 }) }), 0);
});

test('sailing speed steps by two, clamps, then applies reduced sail', () => {
  assert.equal(stepSailingSpeed(4, 12, 'full'), 6);
  assert.equal(stepSailingSpeed(10, 30, 'full'), 12);
  assert.equal(stepSailingSpeed(5, 9, 'full'), 7);
  assert.equal(stepSailingSpeed(8, 9, 'full'), 10);
  assert.equal(stepSailingSpeed(8, 12, 'battle'), 5);
  assert.equal(stepSailingSpeed(5, 12, 'battle'), 3);
  assert.equal(stepSailingSpeed(8, 12, 'furled'), 0);
});

test('cloud multipliers change speed when the unclamped wind target has room', () => {
  const sailing = { heading: 64, wind: 192, speedRow: SPEED_TABLE_1560.Galleon, difficulty: 0, hasNavigation: false };
  const clearTarget = targetSailingSpeed(sailing);
  const cloudTarget = targetSailingSpeed({ ...sailing, cloudDistancePixels: 99 });
  assert.equal(stepSailingSpeed(4, clearTarget, 'full'), 4);
  assert.equal(stepSailingSpeed(4, cloudTarget, 'full'), 6);
});

test('food is stored in 8.8 fixed point', () => {
  const remaining = consumeDailyFood(20 * 256, 80);
  assert.equal(remaining, 5040);
  assert.equal(foodDays(remaining, 80), 63);
});

test('starvation sends a third of the crew away with their share of gold', () => {
  assert.deepEqual(starvationDesertion({ crew: 80, partyGold: 1000, foodFixed: 40 }), {
    deserters: 26, goldLost: 325, crew: 54, partyGold: 675, foodFixed: 5 * 256 + 40,
  });
  assert.deepEqual(starvationDesertion({ crew: 2, partyGold: 99, foodFixed: 0 }), {
    deserters: 0, goldLost: 0, crew: 2, partyGold: 99, foodFixed: 1280,
  });
});

test('far-sea encounter chance uses a 4-in-64 roll', () => {
  assert.equal(encounterRoll(40, 0, fixedRng({ integer: 3 })).sighted, true);
  assert.equal(encounterRoll(40, 0, fixedRng({ integer: 4 })).sighted, false);
});

test('approaching a town without forts always succeeds', () => {
  assert.deepEqual(harborAttempt({ favour: -100, governorMood: -3, crew: 500, forts: 0, rng: fixedRng({ unit: 1 }) }), { admitted: true, fired: false, shipLost: false });
});

test('fort fire thresholds follow the decoded approach formula', () => {
  assert.deepEqual(harborAttempt({ favour: 0, governorMood: 0, crew: 200, forts: 1, rng: fixedRng({ unit: .75 }) }), { admitted: false, fired: true, shipLost: true });
});

test('Havana food prices match the reverse-engineering example', () => {
  assert.equal(merchantFoodPrice({ growth: 130, month: 6, producesFood: true }), 45);
  assert.equal(merchantFoodPrice({ growth: 130, month: 0, producesFood: true }), 75);
});

test('merchant prices distinguish ordinary and era-specific goods', () => {
  assert.equal(merchantCommodityPrice({ growth: 130, month: 6, kind: 'goods' }), 75);
  assert.equal(merchantCommodityPrice({ growth: 130, month: 6, kind: 'special', demand: true }), 240);
});

test('tavern offer respects fleet capacity', () => {
  assert.equal(tavernRecruits({ townPopulation: 50, reputation: 4, difficulty: 1, crew: 190, capacity: 192, rng: fixedRng({ integer: 20 }) }), 2);
});

test('governor briefing reports current wars and alliances for that nation', () => {
  const diplomacy = {
    France: { Spain: -1, England: -1, France: 0, Holland: 1 },
  };
  assert.deepEqual(diplomaticBriefing(diplomacy, 'France'), [
    { nation: 'Spain', relation: -1, message: 'France is at war with Spain.' },
    { nation: 'England', relation: -1, message: 'France is at war with England.' },
    { nation: 'Holland', relation: 1, message: 'France is allied with Holland.' },
  ]);
});

test('tavern prepares traveller and map seller independently in decoded order', () => {
  const rolls = [3, 0];
  assert.deepEqual(tavernSpecialEncounters({ mapPieces: 0, rng: { int: () => rolls.shift() } }), [
    { kind: 'traveller', price: 80 },
    { kind: 'map-seller', price: 500 },
  ]);
  assert.deepEqual(tavernSpecialEncounters({ mapPieces: 4, rng: fixedRng({ integer: 0 }) }), []);
  assert.deepEqual(tavernSpecialEncounters({ mapPieces: 0, rng: fixedRng({ integer: 4 }) }), [
    { kind: 'traveller', price: 90 },
  ]);
});

test('shipwright prices account for type, damage, season, and town size', () => {
  assert.equal(shipRepairPrice({ type: 2, damage: 32 }), 300);
  assert.equal(shipSalePrice({ type: 2, damage: 32 }), 1200);
  assert.equal(shipwrightCash({ month: 6, population: 20, growth: 150 }), 18000);
  assert.equal(shipwrightCash({ month: 6, population: 20, growth: 131 }), 15600);
  assert.equal(merchantCash({ month: 6, population: 20, growth: 131 }), 15600);
  assert.equal(shipwrightCash({ month: 0, population: 100, growth: 255 }), 50000);
});

test('morale declines with time at sea and difficulty', () => {
  assert.equal(morale({ partyGold: 1000, crew: 100, monthsAtSea: 0, difficulty: 0 }), 6);
  assert.equal(morale({ partyGold: 1000, crew: 100, monthsAtSea: 6, difficulty: 3 }), -3);
});

test('dividing plunder follows the decoded shares and starts a fresh expedition', () => {
  assert.deepEqual(dividePlunder({
    partyGold: 10000, crew: 80, reputation: 2, difficulty: 1, flagshipSizeClass: 2,
  }), {
    crewShare: 100,
    satisfaction: 0,
    reputation: 6,
    captainTake: 1000,
    officerShares: 4,
    expeditionGold: 1000,
    crew: 22,
    cannon: 10,
    foodFixed: 3840,
    monthsAtSea: -16,
  });
});

test('plunder satisfaction and captain share are capped at documented values', () => {
  const result = dividePlunder({
    partyGold: 200000, crew: 1, reputation: -10, difficulty: 3, flagshipSizeClass: 0,
  });
  assert.equal(result.satisfaction, 3);
  assert.equal(result.captainTake, 40000);
  assert.equal(result.officerShares, 8);
  assert.equal(result.expeditionGold, 20000);
  assert.equal(result.reputation, -61);
  assert.equal(result.crew, 1);
});

test('a new expedition retains only the flagship and banks the captain share', () => {
  const player = {
    ships: ['Barque', 'Pinnace'], crew: 80, cannon: 12, foodFixed: 40 * 256,
    goods: 20, partyGold: 10000, personalWealth: 500, reputation: 2,
    monthsAtSea: 8, capturedCaptains: [{ nation: 'Spain' }], heading: 64,
  };
  const division = dividePlunder({
    partyGold: player.partyGold, crew: player.crew, reputation: player.reputation,
    difficulty: 1, flagshipSizeClass: 2,
  });
  const next = startNewExpedition(player, division);
  assert.deepEqual(next.ships, ['Barque']);
  assert.equal(next.personalWealth, 1500);
  assert.equal(next.partyGold, 1000);
  assert.equal(next.crew, 22);
  assert.equal(next.cannon, 10);
  assert.equal(next.foodFixed, 15 * 256);
  assert.equal(next.goods, 0);
  assert.deepEqual(next.capturedCaptains, []);
  assert.equal(next.heading, 64);
  assert.deepEqual(player.ships, ['Barque', 'Pinnace']);
});

test('a captured pirate earns the documented favour gain and an assumed bounty', () => {
  assert.deepEqual(pirateCaptainTerms(7), { favourGain: 4, bounty: 1000 });
  assert.deepEqual(pirateCaptainTerms(2), { favourGain: 2, bounty: 500 });
});

test('a governor awards one documented promotion and converts excess favour into land', () => {
  assert.deepEqual(governorPromotion({ favour: 6, rank: 0, governorMood: 0 }), {
    rank: 1, favour: 3, excess: 3, landUnits: 3,
  });
  assert.deepEqual(governorPromotion({ favour: 6, rank: 1, governorMood: -1 }), {
    rank: 2, favour: 6, excess: 0, landUnits: 0,
  });
  assert.equal(governorPromotion({ favour: 5, rank: 1, governorMood: 2 }), null);
  assert.equal(governorPromotion({ favour: 100, rank: 9, governorMood: 2 }), null);
});

test('captured-captain convoy intelligence names the current and next Spanish stops', () => {
  const route = ['Curacao', 'Margarita', 'Trinidad'];
  const towns = [
    { name: 'Curacao', nation: 'Holland' },
    { name: 'Margarita', nation: 'Spain' },
    { name: 'Trinidad', nation: 'Spain' },
  ];
  assert.deepEqual(convoyReport({
    kind: 'treasureFleet', route, towns,
    calendar: { month: 8, day: 0 }, eraIndex: 5,
  }), { location: 'Margarita', next: 'Trinidad' });
  assert.deepEqual(convoyReport({
    kind: 'silverTrain', route, towns,
    calendar: { month: 1, day: 0 }, eraIndex: 5,
  }), { location: null, next: null });
});

test('the calendar uses thirty-day months and 360-day years', () => {
  assert.deepEqual(advanceDate({ day: 29, month: 0, year: 1560 }), { day: 0, month: 1, year: 1560, newMonth: true });
  assert.deepEqual(advanceDate({ day: 29, month: 11, year: 1560 }), { day: 0, month: 0, year: 1561, newMonth: true });
});

test('town triggers use exact cells, first-entry ties, and record distance', () => {
  const triggers = [[10, 10, 0], [12, 10, 1], [11, 12, 1]];
  assert.equal(triggerTownAt(triggers, 12, 10), 1);
  assert.equal(triggerTownAt(triggers, 11, 10), -1);
  assert.equal(nearestTriggerTown(triggers, 11, 10), 0);
  assert.equal(nearestTriggerTown(triggers, 11, 13), 1);
  assert.equal(townDistanceCells({ x: 5, y: 5 }, 5, 5), 1);
  assert.equal(townDistanceCells({ x: 5, y: 5 }, 8, 1), 7);
});

test('a hunter is a kind-6+ template of a nation that dislikes you', () => {
  assert.equal(isEncounterHunter({ kind: 6, favour: -1 }), true);
  assert.equal(isEncounterHunter({ kind: 5, favour: -1 }), false);
  assert.equal(isEncounterHunter({ kind: 7, favour: 0 }), false);
});

test('a hunter overtakes a fleeing captain when rnd(3) is below the difficulty', () => {
  const roll = (value) => ({ int: (n) => { assert.equal(n, 3); return value; } });
  assert.equal(hunterOvertakes({ hunter: true, difficulty: 0, rng: roll(0) }), false);
  assert.equal(hunterOvertakes({ hunter: true, difficulty: 2, rng: roll(1) }), true);
  assert.equal(hunterOvertakes({ hunter: true, difficulty: 2, rng: roll(2) }), false);
  assert.equal(hunterOvertakes({ hunter: false, difficulty: 3, rng: roll(0) }), false);
});

test('the single town alert resets only when the nearest town changes', () => {
  assert.equal(alertAfterNearestTownCheck(27, 4, 4), 27);
  assert.equal(alertAfterNearestTownCheck(27, 4, 5), 0);
  // The half-day roll then builds alert again near the new town.
  assert.equal(encounterRoll(3, alertAfterNearestTownCheck(27, 4, 5), fixedRng({ integer: 7 })).alert, 5);
});

test('leaving a town starts at the departure cell centre with its heading', () => {
  assert.deepEqual(departurePose([401, 205, 192]), { x: 401.5, y: 205.5, heading: 192 });
  assert.equal(departurePose(null), null);
});

test('only escaping, not sunset, lets an undamaged pursuer take a reserve ship', () => {
  const base = { event: 'escaped', shipCount: 2, enemyDamage: 15, enemyTactic: 'close' };
  assert.equal(escapeCostsShip(base), true);
  assert.equal(escapeCostsShip({ ...base, event: 'sunset' }), false);
  assert.equal(escapeCostsShip({ ...base, shipCount: 1 }), false);
  assert.equal(escapeCostsShip({ ...base, enemyDamage: 16 }), false);
  assert.equal(escapeCostsShip({ ...base, enemyTactic: 'flee' }), false);
});

test('the voyage clock starts at 63 and charges tick / 64 + 1 days on leaving', () => {
  const ticks = (count, check) => Array.from({ length: count }, (_, n) => VOYAGE_START_TICK + 1 + n).filter(check);
  // First half-day step at tick 92, first meal at 126 (porting_guide.md §5.1).
  assert.deepEqual(ticks(70, isHalfDayTick), [92, 124]);
  assert.deepEqual(ticks(130, isDailyTick), [126, 190]);
  assert.equal(voyageDays(VOYAGE_START_TICK + 1), 2);
  assert.equal(voyageDays(VOYAGE_START_TICK + 64), 2);
  assert.equal(voyageDays(VOYAGE_START_TICK + 65), 3);
});

test('the month-end crew check mutinies at morale -4 and warns below 0', () => {
  const base = { crew: 60, monthsAtSea: 3, aboard: true };
  assert.equal(monthEndCrewEvent({ ...base, morale: -4 }), 'mutiny');
  assert.equal(monthEndCrewEvent({ ...base, morale: -3 }), 'restless');
  assert.equal(monthEndCrewEvent({ ...base, morale: -1, monthsAtSea: 12 }), 'divide');
  assert.equal(monthEndCrewEvent({ ...base, morale: 0 }), null);
  assert.equal(monthEndCrewEvent({ ...base, morale: -9, crew: 1 }), null);
  assert.equal(monthEndCrewEvent({ ...base, morale: -9, aboard: false }), null);
});

test('a mutiny costs a third of the crew with their gold and four reputation', () => {
  assert.deepEqual(mutinyOutcome({ crew: 90, partyGold: 900, reputation: 6, duelWon: true }), {
    deserters: 30, goldLost: 300, crew: 60, partyGold: 600, reputation: 2,
  });
  assert.equal(mutinyOutcome({ crew: 90, partyGold: 900, reputation: 6, duelWon: false }).reputation, -5);
});

test('new game start picks one of four record points at random and makes pirates wary', () => {
  const start = { favour: [0, 0, 2, 0, 0], points: [[602, 242], [602, 242], [407, 231], [401, 204]] };
  const picks = new Set();
  const rng = createRng(12345);
  for (let draw = 0; draw < 40; draw += 1) picks.add(String(startFromRecord(start, rng).point));
  assert.deepEqual([...picks].sort(), ['401,204', '407,231', '602,242']);
  const { favour } = startFromRecord(start, createRng(1));
  assert.deepEqual(favour, [0, 0, 2, 0, -1]);
  assert.deepEqual(start.favour, [0, 0, 2, 0, 0]);
});

test('a captured prize raises stored crew morale by 1, or 2 above kind 5', () => {
  assert.equal(prizeMoraleBonus(3), 1);
  assert.equal(prizeMoraleBonus(5), 1);
  assert.equal(prizeMoraleBonus(6), 2);
  assert.equal(prizeMoraleBonus(7), 2);
});

test('hunter captains are named from their id like the original', () => {
  // Row 1 (Delgado), title index 2 (Colonel), Spain.
  assert.equal(captainName(1 * 8 + 2), 'Colonel Delgado');
  // Row 4, title 3 (Admiral), Holland (nation 3).
  assert.equal(captainName(4 * 8 + 3 + 64 * 3), 'Admiral de Graff');
  assert.equal(captainRenown(2), 'cowardly');
  assert.equal(captainRenown(3), 'promising');
  assert.equal(captainRenown(7), 'well known');
});

test('hunter names use each of five rows before any repeats', () => {
  const rng = createRng(99);
  let usedRows = 0;
  const rows = [];
  for (let draw = 0; draw < 5; draw += 1) {
    const captain = drawHunterCaptain({ usedRows, nationIndex: 2, rng });
    usedRows = captain.usedRows;
    rows.push((captain.id >> 3) & 7);
    assert.equal((captain.id >> 6) & 3, 2);
  }
  assert.deepEqual([...rows].sort(), [0, 1, 2, 3, 4]);
  assert.equal(usedRows, 31);
  // A full mask starts over: one row taken, or two if id 0 forced a redraw.
  const next = drawHunterCaptain({ usedRows, nationIndex: 0, rng });
  const taken = [0, 1, 2, 3, 4].filter((row) => next.usedRows & (1 << row)).length;
  assert.ok(taken === 1 || taken === 2);
  assert.ok(next.id > 0);
});
