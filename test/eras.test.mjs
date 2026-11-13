import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ERA_BRIEFS, careerBrief, eraBrief } from '../src/eras.mjs';

const scenarios = JSON.parse(readFileSync(new URL('../assets/scenarios.json', import.meta.url))).eras;

test('every scenario era has a brief with a known difficulty', () => {
  assert.deepEqual(Object.keys(ERA_BRIEFS).sort(), Object.keys(scenarios).sort());
  for (const era of Object.keys(scenarios)) {
    const brief = eraBrief(era);
    assert.ok(brief.title && brief.description, era);
    assert.ok(brief.difficulty?.label && brief.difficulty.level >= 1, era);
    assert.ok(brief.highlights.length > 0, era);
  }
});

test('the manual ratings: 1660 is the suggested first career, the early eras the hardest', () => {
  assert.equal(eraBrief(1660).suggested, true);
  assert.equal(Object.values(ERA_BRIEFS).filter((brief) => brief.suggested).length, 1);
  assert.equal(eraBrief(1560).difficulty.label, 'Very hard');
  assert.equal(eraBrief(1600).difficulty.label, 'Very hard');
  assert.equal(eraBrief(1620).difficulty.label, 'Fairly hard');
  assert.equal(eraBrief(1640).difficulty.label, 'Easy');
  assert.equal(eraBrief(1680).difficulty.label, 'Somewhat hard');
  assert.equal(eraBrief(1700), null);
});

test('era highlights hold for every flag, not one career', () => {
  for (const [era, { starts }] of Object.entries(scenarios)) {
    const roles = Object.values(starts).map(({ name }) => name.split(' ').slice(1).join(' ').toLowerCase());
    for (const highlight of ERA_BRIEFS[era].highlights) {
      assert.doesNotMatch(highlight, /\bstarts?\b/i, `${era}: ${highlight}`);
      for (const role of roles) assert.ok(!highlight.toLowerCase().includes(role), `${era}: "${highlight}" names the ${role} career`);
    }
  }
});

test('every start record has career advice, and the brief reads the record', () => {
  for (const [era, { starts }] of Object.entries(scenarios)) {
    for (const [nationality, start] of Object.entries(starts)) {
      const career = careerBrief(era, nationality, start);
      assert.ok(career.advice, `${era} ${nationality}`);
      assert.equal(career.name, start.name);
    }
  }
  const seahawk = careerBrief('1560', 'England', scenarios['1560'].starts.England);
  assert.deepEqual(seahawk.force, ['Frigate + Pinnace', '156 crew', '20 guns', '1,000 gold']);
  assert.equal(seahawk.rank, 'Captain of England');
  assert.equal(careerBrief('1680', 'Spain', scenarios['1680'].starts.Spain).rank, 'Ensign of Spain');
  assert.equal(careerBrief('1640', 'France', scenarios['1640'].starts.France).force[0], '2 Pinnaces');
  assert.equal(careerBrief('1660', 'France', scenarios['1660'].starts.France).rank, null);
  assert.equal(careerBrief('1560', 'Holland', scenarios['1560'].starts.Holland), null);
});
