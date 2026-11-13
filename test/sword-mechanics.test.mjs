import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/mechanics.mjs';
import {
  FIGHT_MODE, FIGHT_RESULT, MOVE, RECOVERY_FRAMES, assaultRecord, boardingRecord, garrisonAfterAssault, createFight, duelRecord, fencingSkill, fightOutcome,
  frameSeconds, inputMove, practiceAfterBout, practiceRecord, startingMorale, stepFight,
} from '../src/sword-mechanics.mjs';

// A stub rng that answers every draw with `value` (clamped below the limit).
const fixed = (value) => ({ int: (limit) => Math.max(0, Math.min(limit - 1, value)) });

function fightUntilOver(fight, input, rng, limit = 5000) {
  let next = fight;
  for (let frame = 0; frame < limit && !next.result; frame += 1) {
    next = stepFight(next, typeof input === 'function' ? input(next) : input, rng);
    assert.equal(next.you.morale + next.foe.morale, 47, 'morale always sums to 47');
  }
  return next;
}

test('skill follows 0x1B087: difficulty plus the record, one step easier with Fencing', () => {
  assert.equal(fencingSkill(1, false, 0), 1);
  assert.equal(fencingSkill(1, true, 0), 0);
  assert.equal(fencingSkill(3, false, 2), 4);
  assert.equal(fencingSkill(0, true, 0), 0);
  assert.equal(frameSeconds(4), frameSeconds(0), 'the frame table is indexed by skill & 3');
});

test('starting morale splits 47 by men times quality', () => {
  assert.deepEqual(startingMorale(1, 9, 1, 9), [23, 24]);
  assert.deepEqual(startingMorale(200, 32, 200, 32), [23, 24]);
  assert.deepEqual(startingMorale(100, 7, 1, 1), [38, 9]);
  assert.deepEqual(startingMorale(1, 1, 100, 9), [8, 39]);
});

test('the joystick maps to guards, steps back, slashes and quick thrusts', () => {
  assert.equal(inputMove(null), MOVE.guardMid);
  assert.equal(inputMove({ x: 0, y: 1 }), MOVE.guardLow);
  assert.equal(inputMove({ x: 0, y: -1 }), MOVE.guardHigh);
  assert.equal(inputMove({ x: 1, y: -1 }), MOVE.backHigh);
  assert.equal(inputMove({ x: -1, y: 0 }), MOVE.slashMid);
  assert.equal(inputMove({ x: -1, y: 1, quick: true }), MOVE.thrustLow);
});

test('duels start closer than battles; a crew leader gets a heavier weapon', () => {
  const duel = createFight({ record: duelRecord({ title: 'Guard', nation: 'Spain' }), rng: fixed(1) });
  assert.deepEqual([duel.you.x, duel.foe.x, duel.opponentWeapon], [320, 240, 0]);
  const battle = createFight({ record: boardingRecord({ yourMen: 40, theirMen: 48, kind: 5, nation: 'Spain' }), rng: fixed(1) });
  assert.deepEqual([battle.you.x, battle.foe.x, battle.opponentWeapon], [340, 220, 2]);
});

test('far apart, an attack becomes an advance and the opponent closes in', () => {
  const fight = createFight({ record: duelRecord({ title: 'Guard' }), rng: fixed(0) });
  const next = stepFight(fight, { x: -1, y: 0 }, fixed(0));
  assert.equal(next.you.move, MOVE.advance, '80 apart is beyond the 60 px attack range');
  let advanced = next;
  for (let frame = 0; frame < 6; frame += 1) advanced = stepFight(advanced, { x: -1, y: 0 }, fixed(0));
  assert.ok(advanced.you.x < fight.you.x, 'the advance moves you towards him');
});

test('a hit within reach moves 2w+1 points (twice for a slash) and pushes him back 4', () => {
  const fight = createFight({ record: duelRecord({ title: 'Guard' }), difficulty: 0, weapon: 2, rng: fixed(0) });
  // Put him off guard, mid-advance, within reach.
  fight.you.x = 300; fight.foe.x = 270;
  fight.you.move = MOVE.slashMid; fight.you.frame = 2;
  fight.foe.move = MOVE.advance; fight.foe.frame = 0; fight.foe.guard = 0;
  const next = stepFight(fight, null, fixed(200));
  assert.deepEqual(next.events.find((event) => event.by === 'you'), { type: 'hit', by: 'you', points: 10 });
  assert.equal(next.you.morale, 33);
  assert.equal(next.foe.x, 266);
});

test('a guard on the attacked line parries the blow', () => {
  const fight = createFight({ record: duelRecord({ title: 'Guard' }), rng: fixed(0) });
  fight.you.x = 300; fight.foe.x = 270;
  fight.you.move = MOVE.slashMid; fight.you.frame = 2;
  fight.foe.move = MOVE.guardMid; fight.foe.frame = 0; fight.foe.guard = 2;
  const next = stepFight(fight, null, fixed(255));
  assert.equal(next.events[0].type, 'parry');
  assert.equal(next.you.morale, 23);
});

test('an idle captain is beaten, and losing all morale makes the loser yield', () => {
  const rng = createRng(77);
  const lost = fightUntilOver(createFight({ record: duelRecord({ title: 'Guard' }), rng }), null, rng);
  assert.equal(lost.result, FIGHT_RESULT.defeated);
  assert.equal(lost.you.move, MOVE.yield);
  assert.equal(fightOutcome(lost).casualties, 0, 'duels cost no crew');
});

test('steady attacking on changing lines wins duels and boarding actions', () => {
  const rng = createRng(5);
  let round = 0;
  const attack = () => ({ x: -1, y: [0, 1, -1][(round += 1) % 3] });
  const duel = fightUntilOver(createFight({ record: duelRecord({ title: 'Guard' }), difficulty: 2, rng }), attack, rng);
  assert.equal(duel.result, FIGHT_RESULT.won);
  const boarding = fightUntilOver(createFight({ record: boardingRecord({ yourMen: 60, theirMen: 50, kind: 6, nation: 'Spain' }), rng }), attack, rng);
  assert.equal(boarding.result, FIGHT_RESULT.won);
  const outcome = fightOutcome(boarding);
  assert.equal(outcome.casualties, 60 - boarding.you.men);
  assert.ok(outcome.theirMen < 50, 'the crews fought behind the leaders');
});

test('crews clash every 16 frames and the lower roll loses (men+men)/64+1', () => {
  const fight = createFight({ record: boardingRecord({ yourMen: 100, theirMen: 92, kind: 5, nation: 'Spain' }), rng: fixed(0) });
  fight.frame = 15;
  // Both rolls are 0, and ties go against you: (100+92)/64+1 = 4 men.
  const next = stepFight(fight, null, fixed(0));
  assert.equal(next.you.men, 96);
  assert.equal(next.foe.men, 92);
  assert.equal(next.events.at(-1).type, 'clash');
});

test('practice is a fixed bout that adds 5 to the hit bonus up to 30', () => {
  const record = practiceRecord();
  assert.equal(record.mode, FIGHT_MODE.practice);
  assert.deepEqual(startingMorale(record.yourMen, record.yourQuality, record.theirMen, record.theirQuality), [23, 24]);
  assert.equal(practiceAfterBout(0), 5);
  assert.equal(practiceAfterBout(28), 30);
  assert.equal(practiceAfterBout(undefined), 5);
});

test('boarding quality falls 1 per 16 points of hull damage', () => {
  const record = boardingRecord({ yourMen: 40, yourDamage: 32, theirMen: 48, theirDamage: 16, kind: 6, nation: 'England' });
  assert.equal(record.yourQuality, 5);
  assert.equal(record.theirQuality, 5);
  assert.equal(record.mode, FIGHT_MODE.battle);
});

test('crossed fencers count as far apart: attacks become advances (unsigned distance)', () => {
  const fight = createFight({ record: duelRecord({ title: 'Guard' }), rng: fixed(0) });
  fight.you.x = 250; fight.foe.x = 254;
  const next = stepFight(fight, { x: -1, y: 0 }, fixed(0));
  assert.equal(next.you.move, MOVE.advance);
});

test('an eighth morale gained (state 4) replaces a result set earlier in the frame', () => {
  const fight = createFight({ record: boardingRecord({ yourMen: 50, theirMen: 50, kind: 7, nation: 'Spain' }), rng: fixed(0) });
  fight.frame = 15;
  fight.you.x = 442; // at the right edge: driven back...
  fight.foe.morale = 23; fight.you.morale = 24;
  // ...but the clash (both rolls 0, a tie against you) lifts his morale to 24.
  const next = stepFight(fight, null, fixed(0));
  assert.equal(next.foe.morale, 24);
  assert.equal(next.result, null);
  const plain = stepFight({ ...structuredClone(fight), frame: 3 }, null, fixed(0));
  assert.equal(plain.result, FIGHT_RESULT.drivenBack);
});

test('storming the walls is a battle against ten men a soldier (0x18EFD)', () => {
  const record = assaultRecord({ yourMen: 120, crewMorale: 5, roll: 2, soldiers: 30, forts: 2, nation: 'Spain' });
  assert.deepEqual([record.yourMen, record.yourQuality, record.theirMen, record.theirQuality], [120, 7, 305, 7]);
  assert.equal(record.mode, FIGHT_MODE.battle);
  assert.equal(record.extraSkill, 0);
  assert.equal(record.opponent.title, 'Captain');
  assert.equal(assaultRecord({ yourMen: 50, crewMorale: -3, roll: 0, soldiers: 0, forts: 0 }).yourQuality, 2, 'morale/2 truncates towards zero');
  assert.equal(assaultRecord({ yourMen: 50, crewMorale: -12, roll: 0, soldiers: 0, forts: 0 }).yourQuality, 1, 'quality is held at 1');
  assert.equal(garrisonAfterAssault(305), 31);
  assert.equal(garrisonAfterAssault(1), 1);
});

test('after an attack he holds his follow-through, open and still, before his next move', () => {
  let fight = createFight({ record: duelRecord({ title: 'Guard' }), difficulty: 1, rng: fixed(15) });
  fight = { ...fight, you: { ...fight.you, x: 200, move: MOVE.guardMid, frame: 0 }, foe: { ...fight.foe, x: 185, move: MOVE.thrustMid, frame: 0 } };
  const thrustFrames = 4;
  for (let step = 1; step < thrustFrames; step += 1) fight = stepFight(fight, null, fixed(15));
  assert.equal(fight.foe.move, MOVE.thrustMid);
  const x = fight.foe.x;
  for (let step = 0; step < RECOVERY_FRAMES; step += 1) {
    fight = stepFight(fight, null, fixed(15));
    assert.equal(fight.foe.move, MOVE.thrustMid, 'still recovering');
    assert.equal(fight.foe.frame, thrustFrames - 1, 'holds the last frame');
    assert.equal(fight.foe.guard, 0, 'unguarded while recovering');
    assert.equal(fight.foe.x, x, 'no step while recovering');
  }
  fight = stepFight(fight, null, fixed(15));
  assert.equal(fight.foe.recovery, 0);
  assert.equal(fight.foe.frame, 0, 'then his next move starts');
});

test('your attacks hold the follow-through too, ignoring the keys until it ends', () => {
  let fight = createFight({ record: duelRecord({ title: 'Guard' }), difficulty: 1, rng: fixed(15) });
  fight = { ...fight, you: { ...fight.you, x: 300, move: MOVE.slashMid, frame: 0 }, foe: { ...fight.foe, x: 200 } };
  const slashFrames = 6;
  const attack = { x: -1, y: 0 };
  for (let step = 1; step < slashFrames; step += 1) fight = stepFight(fight, attack, fixed(15));
  const x = fight.you.x;
  for (let step = 0; step < RECOVERY_FRAMES; step += 1) {
    fight = stepFight(fight, attack, fixed(15));
    assert.equal(fight.you.move, MOVE.slashMid, 'still recovering');
    assert.equal(fight.you.frame, slashFrames - 1, 'holds the last frame');
    assert.equal(fight.you.guard, 0, 'unguarded while recovering');
    assert.equal(fight.startedMove, false, 'a latched key waits');
    assert.equal(fight.you.x, x, 'no step while recovering');
  }
  fight = stepFight(fight, attack, fixed(15));
  assert.equal(fight.startedMove, true, 'then your next move starts');
});
