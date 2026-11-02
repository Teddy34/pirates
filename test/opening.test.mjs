import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { openingSteps, sailingMasterBriefing } from '../src/opening.mjs';
import { vignetteDescription } from '../src/vignettes.mjs';

const { eras } = JSON.parse(readFileSync(new URL('../assets/scenarios.json', import.meta.url)));

test('every start in every era tells a story with one duel', () => {
  Object.values(eras).forEach((era, eraIndex) => {
    for (const nationality of Object.keys(era.starts)) {
      const steps = openingSteps(eraIndex, nationality);
      assert.equal(steps.filter((step) => step.duel).length, 1, `${eraIndex} ${nationality}`);
      assert.ok(steps.filter((step) => !step.duel).every((step) => step.text && !/[`^"]/.test(step.text)));
    }
  });
});

test('every story screen has a known picture, never the same one twice running', () => {
  Object.values(eras).forEach((era, eraIndex) => {
    for (const nationality of Object.keys(era.starts)) {
      const pictures = openingSteps(eraIndex, nationality).map((step) => step.vignette);
      pictures.forEach((id, index) => {
        assert.ok(id && vignetteDescription(id) !== `Placeholder picture: ${id}.`, `${id} has no scene`);
        assert.notEqual(id, pictures[index - 1], `${eraIndex} ${nationality}`);
      });
    }
  });
});

test('the story follows the start record order, not the nation order', () => {
  assert.match(openingSteps(0, 'England')[0].text, /^Through long, hard work/);
  assert.match(openingSteps(0, 'Spain')[0].text, /^Years ago your family settled/);
  assert.match(openingSteps(5, 'Spain')[0].text, /^The governor of San Juan/);
  assert.match(openingSteps(1, 'France').at(-1).text, /^You and your sturdy band/);
});

const towns = [
  { name: 'Home', nation: 'Spain', x: 100, y: 100 },
  { name: 'Other Spanish', nation: 'Spain', x: 101, y: 100 },
  { name: 'Near English', nation: 'England', x: 110, y: 90 },
  { name: 'Far English', nation: 'England', x: 200, y: 100 },
  { name: 'French', nation: 'France', x: 150, y: 110 },
  { name: 'Dutch', nation: 'Holland', x: 104, y: 60 },
  { name: 'Past the range', nation: 'Holland', x: 100, y: 99 },
];

test('the briefing names the closest city of each other nation', () => {
  const { greeting, cities } = sailingMasterBriefing({ towns, townIndex: 0, townRange: 6 });
  assert.match(greeting, /Here in Home, .* the Spanish governor/);
  assert.deepEqual(cities, [
    '“The closest English city is Near English, which lies a few days to the northeast.',
    '“The closest French city is French, which lies many days to the east.',
    '“The closest Dutch city is Dutch, which lies many days to the north.”',
  ]);
});
