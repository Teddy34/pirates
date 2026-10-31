import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NATION_ORDER, WORLD_EVENT, TOWN_INFO_CURRENT, TOWN_INFO_OBSOLETE,
  townInfoStatus, learnTownInfo, obsoleteTownInfo, newGameTowns, installNewGovernor,
  randomTownRange, rollRandomTownEvent, applyRandomTownEvent, rollAiConquest,
  rollDiplomacyChange, applyDiplomacyChange, monthlyWorldUpdate, initialWorldNews,
  worldNewsMessage, createRng,
} from '../src/mechanics.mjs';

// A scripted random source: each int(limit) call returns the next value.
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

const peace = () => Object.fromEntries(NATION_ORDER.map((nation) => [nation, Object.fromEntries(NATION_ORDER.map((other) => [other, 0]))]));
const atWar = (diplomacy, a, b) => { diplomacy[a][b] = -1; diplomacy[b][a] = -1; return diplomacy; };
const town = (overrides = {}) => ({
  name: 'Town', nation: 'Spain', x: 100, y: 100, forts: 1, soldiers: 20, population: 20, gold: 50, growth: 100, flags: 0, mood: 1, ...overrides,
});

test('town information is current, obsolete or missing as 0x196D0 reads it', () => {
  assert.equal(townInfoStatus(TOWN_INFO_CURRENT), 'current');
  assert.equal(townInfoStatus(TOWN_INFO_CURRENT | TOWN_INFO_OBSOLETE), 'current');
  assert.equal(townInfoStatus(TOWN_INFO_OBSOLETE), 'obsolete');
  assert.equal(townInfoStatus(0x10), 'none');
  assert.equal(learnTownInfo(0x30), 0x90);
});

test('a random event turns current information into obsolete information', () => {
  // 0xCAF4: 0x20 = old 0x80, then 0x80 is cleared; static bits survive.
  assert.equal(obsoleteTownInfo(0x80 | 0x10), 0x30);
  assert.equal(obsoleteTownInfo(0x20 | 0x04), 0x04);
  assert.equal(obsoleteTownInfo(0x08), 0x08);
});

test('a new game knows each town when rnd(4) + 1 beats the difficulty', () => {
  const towns = [town({ flags: 0x10 }), town(), town()];
  const rng = scripted(0, 5, 1, 6, 3, 7);
  const result = newGameTowns(towns, 2, rng);
  assert.deepEqual(rng.calls, [4, 16, 4, 16, 4, 16]);
  assert.deepEqual(result.map(({ flags }) => flags), [0x10, 0, 0x80]);
  assert.deepEqual(result.map(({ governorRelative }) => governorRelative), [5, 6, 7]);
  assert.deepEqual(result.map(({ mood }) => mood), [0, 0, 0]);
  assert.equal(towns[0].flags, 0x10);
  // Apprentice knows every town.
  assert.ok(newGameTowns(towns, 0, createRng(9)).every(({ flags }) => flags & TOWN_INFO_CURRENT));
});

test('a new governor resets the mood and re-rolls the relative unless you married in', () => {
  const rng = scripted(9);
  assert.deepEqual(installNewGovernor(town({ mood: 3, governorRelative: 1 }), rng), town({ mood: 0, governorRelative: 9 }));
  const married = installNewGovernor(town({ mood: -2, governorRelative: 0x41 }), scripted());
  assert.equal(married.mood, 0);
  assert.equal(married.governorRelative, 0x41);
});

test('the random-town range leaves out the last real town', () => {
  // 0x4605A = header field 0x4607E (records - 1 = 35 in 1560) - 2 = 33:
  // 1560's 34 real towns minus one, so Yaguana (index 33) is never drawn (D28).
  const towns = Array.from({ length: 34 }, () => town());
  assert.equal(randomTownRange(towns), 33);
  assert.deepEqual(rollRandomTownEvent({ townCount: 33, rng: scripted(32, 4) }), { event: WORLD_EVENT.PIRATES, townIndex: 32 });
  assert.deepEqual(rollRandomTownEvent({ townCount: 33, rng: scripted(0, 0) }), { event: WORLD_EVENT.INDIANS, townIndex: 0 });
  assert.equal(rollRandomTownEvent({ townCount: 33, rng: scripted(33) }), null);
  assert.equal(rollRandomTownEvent({ townCount: 33, rng: scripted(63) }), null);
});

test('the mission governor is never replaced by a random event', () => {
  const rng = scripted(5, 3, 3, 1);
  assert.deepEqual(rollRandomTownEvent({ townCount: 34, protectedTownIndex: 5, rng }), { event: WORLD_EVENT.GOLD_MINE, townIndex: 5 });
  assert.deepEqual(rollRandomTownEvent({ townCount: 34, protectedTownIndex: 5, rng: scripted(6, 3) }), { event: WORLD_EVENT.NEW_GOVERNOR, townIndex: 6 });
});

test('random town events change the town as 0xCA7F does', () => {
  const rng = scripted(11);
  const apply = (event, overrides) => applyRandomTownEvent(town({ flags: 0x80, ...overrides }), event, rng);
  assert.deepEqual(apply(WORLD_EVENT.INDIANS, { soldiers: 21 }), town({ flags: 0x20, soldiers: 10 }));
  assert.deepEqual(apply(WORLD_EVENT.MALARIA, { soldiers: 21, population: 9 }), town({ flags: 0x20, soldiers: 10, population: 4 }));
  assert.deepEqual(apply(WORLD_EVENT.GOLD_MINE, { growth: 190, gold: 242 }), town({ flags: 0x20, growth: 254, gold: 254 }));
  assert.deepEqual(apply(WORLD_EVENT.GOLD_MINE, { growth: 191, gold: 243 }), town({ flags: 0x20, growth: 255, gold: 255 }));
  assert.deepEqual(apply(WORLD_EVENT.PIRATES, { growth: 103 }), town({ flags: 0x20, growth: 78, gold: 0 }));
  assert.deepEqual(apply(WORLD_EVENT.NEW_GOVERNOR, { mood: 2 }), town({ flags: 0x20, mood: 0, governorRelative: 11 }));
});

test('AI conquest needs war, a garrison twice as large and Manhattan distance below 150', () => {
  const towns = [
    town({ name: 'A', nation: 'England', soldiers: 41, x: 100, y: 100 }),
    town({ name: 'B', nation: 'Spain', soldiers: 20, x: 200, y: 149 }),
    town({ name: 'C', nation: 'Spain', soldiers: 20, x: 300, y: 100 }),
    town({ name: 'Last', nation: 'Spain', soldiers: 1, x: 110, y: 100 }), // outside the range
  ];
  const war = atWar(peace(), 'England', 'Spain');
  assert.deepEqual(rollAiConquest({ towns, diplomacy: war, rng: scripted(0, 1) }), { attackerIndex: 0, defenderIndex: 1 });
  assert.equal(rollAiConquest({ towns, diplomacy: peace(), rng: scripted(0, 1) }), null);
  assert.equal(rollAiConquest({ towns, diplomacy: war, rng: scripted(0, 2) }), null, 'distance 200');
  assert.equal(rollAiConquest({ towns: [town({ ...towns[0], soldiers: 40 }), towns[1], towns[3]], diplomacy: war, rng: scripted(0, 1) }), null, '2 * 20 is not below 40');
  assert.equal(rollAiConquest({ towns, diplomacy: war, playerTownIndex: 1, rng: scripted(0, 1) }), null);
  // The mission town is drawn again (0xC85B).
  const rng = scripted(0, 1, 1, 1, 2);
  assert.equal(rollAiConquest({ towns, diplomacy: war, protectedTownIndex: 1, rng }), null);
  assert.deepEqual(rng.calls, [3, 3, 3, 3, 3], 'both draws use the range, not the town count');
  // Nations at war conquer in either direction; a town never takes itself.
  assert.equal(rollAiConquest({ towns, diplomacy: war, rng: scripted(1, 1) }), null);
});

test('diplomacy moves one pair one step and logs the documented news', () => {
  // r = 16 + (1 << 2) + 0: Spain (0) and England (1) improve.
  const diplomacy = peace();
  const favour = { Spain: -10, England: 0, France: 0, Holland: 0 };
  const change = rollDiplomacyChange({ diplomacy, k: 150, rng: scripted(20) });
  assert.deepEqual(change, { nationA: 'Spain', nationB: 'England', from: 0, to: 1 });
  assert.deepEqual(applyDiplomacyChange(change, { diplomacy, favour }), [
    { event: WORLD_EVENT.ALLIANCE, nationA: 'Spain', nationB: 'England' },
    { event: WORLD_EVENT.AMNESTY, nation: 'Spain' },
  ]);
  assert.equal(diplomacy.England.Spain, 1);
  assert.equal(favour.Spain, -3);
  // Already allied: nothing. r >= 28 or a == b: nothing.
  assert.equal(rollDiplomacyChange({ diplomacy, k: 150, rng: scripted(20) }), null);
  assert.equal(rollDiplomacyChange({ diplomacy, k: 150, rng: scripted(28) }), null);
  assert.equal(rollDiplomacyChange({ diplomacy, k: 150, rng: scripted(5) }), null);
  // An alliance falling back to peace is silent; war and peace are logged.
  const back = rollDiplomacyChange({ diplomacy, k: 150, rng: scripted(4) });
  assert.deepEqual(applyDiplomacyChange(back, { diplomacy, favour }), []);
  const war = rollDiplomacyChange({ diplomacy, k: 150, rng: scripted(4) });
  assert.deepEqual(applyDiplomacyChange(war, { diplomacy, favour }), [{ event: WORLD_EVENT.WAR, nationA: 'Spain', nationB: 'England' }]);
  const peaceAgain = rollDiplomacyChange({ diplomacy, k: 150, rng: scripted(20) });
  assert.deepEqual(applyDiplomacyChange(peaceAgain, { diplomacy, favour }), [{ event: WORLD_EVENT.PEACE, nationA: 'Spain', nationB: 'England' }]);
});

test('the monthly world runs economy, conquest, diplomacy and the random event in order, in place', () => {
  const towns = [
    town({ name: 'Port Royale', nation: 'England', soldiers: 60, x: 100, y: 100, flags: 0x80 }),
    town({ name: 'Santiago', nation: 'Spain', soldiers: 20, x: 140, y: 120, flags: 0x80, governorRelative: 2 }),
    town({ name: 'Yaguana', nation: 'Spain', soldiers: 1, x: 120, y: 110 }),
  ];
  const lastTown = { ...towns[2] };
  const held = towns[1];
  const diplomacy = atWar(peace(), 'England', 'Spain');
  const favour = { Spain: 0, England: 0, France: 0, Holland: 0 };
  const rng = scripted(
    1, 1, // economy: neither town updates (rnd(4) != 0); the last town is not rolled
    0, 1, // conquest: Port Royale takes Santiago
    7, // new governor's relative
    149, // diplomacy: no change
    1, 0, // random event: Indians at Santiago
  );
  const news = monthlyWorldUpdate({ towns, diplomacy, favour, month: 3, diplomacyK: 150, rng });
  assert.deepEqual(news, [
    { event: WORLD_EVENT.CONQUEST, nation: 'England', previousNation: 'Spain', townIndex: 1 },
    { event: WORLD_EVENT.INDIANS, townIndex: 1 },
  ]);
  assert.equal(towns[1], held, 'town records keep their identity');
  assert.equal(held.nation, 'England');
  assert.equal(held.mood, 0);
  assert.equal(held.governorRelative, 7);
  assert.equal(held.soldiers, 10);
  assert.equal(held.flags, 0x20);
  assert.deepEqual(towns[2], lastTown, 'the last real town stays static');
  assert.deepEqual(news.map((entry) => worldNewsMessage(entry, towns)), [
    'England has captured Santiago from Spain.',
    'Indians have attacked Santiago.',
  ]);
});

test('the opening news reports wars and alliances, and a town event for each pair at peace', () => {
  const diplomacy = atWar(peace(), 'Spain', 'France');
  diplomacy.England.Holland = 1;
  diplomacy.Holland.England = 1;
  const towns = Array.from({ length: 10 }, (_, index) => town({ name: `T${index}` }));
  const rng = scripted(0, 3, 1, 4, 2, 5, 3, 6);
  const news = initialWorldNews({ diplomacy, townRange: towns.length, rng });
  assert.deepEqual(news.map((entry) => worldNewsMessage(entry, towns)), [
    'Indians have attacked T3.', // Spain-England at peace
    'Spain is at war with France.',
    'A new gold mine has opened at T4.', // Spain-Holland
    'Malaria has struck T5.', // England-France
    'England has allied with Holland.',
    'T6 has a new governor.', // France-Holland
  ]);
  assert.deepEqual(rng.calls, [5, 10, 5, 10, 5, 10, 5, 10]);
  assert.equal(towns[3].soldiers, 20, 'opening events are only reported');
});
