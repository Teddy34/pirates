import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/mechanics.mjs';
import {
  createVillain, emptyVillains, moveVillains, villainDescription, villainFlees, villainHeardHere, villainInTown,
  villainName, villainReport, villainsKnownIn,
} from '../src/villains.mjs';

const scripted = (...values) => ({
  int(limit) {
    assert.ok(values.length, `unscripted roll rnd(${limit})`);
    const value = values.shift();
    assert.ok(value < limit, `rnd(${limit}) scripted ${value}`);
    return value;
  },
});

const town = (nation, x, y, more = {}) => ({ nation, x, y, mood: 0, gold: 0, soldiers: 0, ...more });
const villain = (townIndex, history = [null, null, null, null]) => ({ townIndex, history, surname: 5, title: 2, nationality: 2 });

test('a villain has a title, a surname of his nationality, and a nationality word', () => {
  assert.equal(villainName(villain(0)), 'Captain Ribault');
  assert.equal(villainDescription(villain(0)), 'Frenchman Captain Ribault');
  assert.equal(villainName({ title: 7, surname: 15, nationality: 0 }), 'Count Enriquez');
});

test('a new villain takes the first free slot in a random Spanish town with no history', () => {
  const towns = [town('France', 0, 0), town('Spain', 0, 0), town('Spain', 0, 0), town('Spain', 0, 0)];
  const start = [villain(1), null, villain(2), null];
  const { villains, slot } = createVillain({ villains: start, towns, rng: scripted(0, 2, 9, 3, 1) });
  assert.equal(slot, 1);
  assert.deepEqual(villains[1], { townIndex: 2, history: [null, null, null, null], surname: 9, title: 3, nationality: 1 });
  assert.equal(start[1], null);
  assert.equal(towns[2].villainStaying, undefined);
});

test('no villain appears while the fourth slot is taken or Spain has no town', () => {
  const towns = [town('Spain', 0, 0), town('Spain', 0, 0)];
  const full = [null, null, null, villain(0)];
  assert.equal(createVillain({ villains: full, towns, rng: scripted() }).slot, -1);
  assert.equal(createVillain({ villains: emptyVillains(), towns: [town('France', 0, 0), town('Spain', 0, 0)], rng: scripted() }).slot, -1);
});

test('a monthly move takes the best town in reach and shifts the history', () => {
  const towns = [
    town('Spain', 0, 0, { villainStaying: true }), // he is here
    town('Spain', 5, 0, { mood: 1 }),
    town('Spain', 4, 0, { mood: 3 }), // best score
    town('Spain', 30, 0, { mood: 9 }), // beyond the radius
    town('France', 1, 0, { mood: 9 }), // not Spanish
    town('Spain', 0, 1), // last town of the range is never reached
  ];
  const start = [villain(0, [7, 8, 9, 10]), null, null, null];
  const [moved] = moveVillains({ villains: start, towns, difficulty: 0, alertedTownIndex: 0, rng: scripted(3, 3, 1) });
  assert.equal(moved.townIndex, 2);
  assert.deepEqual(moved.history, [0, 7, 8, 9]);
  assert.equal(towns[0].villainStaying, false);
  assert.equal(towns[2].villainStaying, true);
});

test('the score favours towns far from where you left the alert', () => {
  const towns = () => [town('Spain', 0, 0, { villainStaying: true }), town('Spain', 0, 3), town('Spain', 3, 0), town('Spain', 100, 0)];
  const moveFrom = (alertedTownIndex) => moveVillains({
    villains: [villain(0), null, null, null], towns: towns(), difficulty: 0, alertedTownIndex, rng: scripted(4, 4),
  })[0].townIndex;
  assert.equal(moveFrom(3), 1);
  assert.equal(moveFrom(1), 2);
});

test('money over soldiers puts him off', () => {
  const towns = [town('Spain', 0, 0, { villainStaying: true }), town('Spain', 1, 0, { gold: 80 }), town('Spain', 1, 1, { soldiers: 8 }), town('Spain', 0, 2)];
  const [moved] = moveVillains({ villains: [villain(0), null, null, null], towns, difficulty: 0, alertedTownIndex: 0, rng: scripted(4, 4) });
  assert.equal(moved.townIndex, 2);
});

test('a villain with nowhere better stays and keeps his history', () => {
  const towns = [town('Spain', 0, 0, { villainStaying: true }), town('France', 1, 0), town('France', 2, 0)];
  const start = [villain(0), null, null, null];
  assert.equal(moveVillains({ villains: start, towns, difficulty: 3, alertedTownIndex: 0, rng: scripted() })[0], start[0]);
});

test('once heard of here, a month without a better town wears away his trail', () => {
  const towns = [town('Spain', 0, 0, { villainStaying: true }), town('France', 1, 0), town('France', 2, 0)];
  const start = villainHeardHere([villain(0, [1, 2, null, null]), null, null, null], 0);
  const [worn] = moveVillains({ villains: start, towns, difficulty: 0, alertedTownIndex: 0, rng: scripted() });
  assert.equal(worn.townIndex, 0);
  assert.deepEqual(worn.history, [0, 1, 2, null]);
  assert.equal(towns[0].villainStaying, true);
});

test('his own town winning the score is no move, heard of or not', () => {
  const towns = [town('Spain', 0, 0), town('France', 1, 0), town('France', 2, 0)];
  const start = villainHeardHere([villain(0), null, null, null], 0);
  assert.equal(moveVillains({ villains: start, towns, difficulty: 0, alertedTownIndex: 0, rng: scripted(1) })[0], start[0]);
});

test('a real move or a flight clears what the gossip placed', () => {
  const towns = [town('Spain', 0, 0, { villainStaying: true }), town('Spain', 1, 0), town('France', 2, 0)];
  const start = villainHeardHere([villain(0), null, null, null], 0);
  assert.equal(moveVillains({ villains: start, towns, difficulty: 0, alertedTownIndex: 0, rng: scripted(4) })[0].heardHere, false);
  assert.equal(villainFlees({ villains: start, slot: 0, towns, rng: scripted(1) })[0].heardHere, false);
});

test('gossip offers villains whose town or last four towns match', () => {
  const villains = [villain(1, [2, 3, null, null]), null, villain(4, [5, 6, 7, 8]), null];
  assert.deepEqual(villainsKnownIn(villains, 1), [0]);
  assert.deepEqual(villainsKnownIn(villains, 3), [0]);
  assert.deepEqual(villainsKnownIn(villains, 8), [2]);
  assert.deepEqual(villainsKnownIn(villains, 9), []);
});

test('the answers lead along the chain of towns to the villain', () => {
  const chased = villain(1, [2, 3, 2, null]);
  assert.deepEqual(villainReport(chased, 1), { present: true, townIndex: 1 });
  assert.deepEqual(villainReport(chased, 2), { present: false, townIndex: 1 });
  assert.deepEqual(villainReport(chased, 3), { present: false, townIndex: 2 });
});

test('a confrontation finds the first villain here and sends him to a random town', () => {
  const towns = [town('France', 0, 0), town('Spain', 0, 0), town('England', 0, 0), town('Spain', 0, 0)];
  const start = [null, villain(1, [3, null, null, null]), villain(1), null];
  assert.equal(villainInTown(start, 1), 1);
  assert.equal(villainInTown(start, 2), -1);
  const villains = villainFlees({ villains: start, slot: 1, towns, rng: scripted(2) });
  assert.equal(villains[1].townIndex, 2);
  assert.deepEqual(villains[1].history, [3, null, null, null]);
  assert.deepEqual(villainReport(villains[1], 3), { present: false, townIndex: 2 });
});

test('villains stay among Spanish towns over a seeded century of months', () => {
  const towns = Array.from({ length: 12 }, (_, index) => town(index % 3 ? 'Spain' : 'France', index * 20, (index % 4) * 20));
  const rng = createRng(7);
  let { villains } = createVillain({ villains: emptyVillains(), towns, rng });
  ({ villains } = createVillain({ villains, towns, rng }));
  let moves = 0;
  for (let month = 0; month < 1200; month += 1) {
    const next = moveVillains({ villains, towns, difficulty: 4, alertedTownIndex: rng.int(12), rng });
    if (next[0] !== villains[0]) moves += 1;
    villains = next;
    for (const active of villains.filter(Boolean)) assert.equal(towns[active.townIndex].nation, 'Spain');
  }
  assert.ok(moves > 0);
});
