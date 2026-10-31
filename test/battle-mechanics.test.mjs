import test from 'node:test';
import assert from 'node:assert/strict';
import { SPEED_TABLE_1560 } from '../src/data.mjs';
import {
  BATTLE_SAIL_TRANSITION_FRAMES, BATTLE_WIND_SHIFT_FRAMES,
  PLAYER_RUDDER_INTERVAL, PLAYER_RUDDER_STEP,
  applyCannonHit, battleDistance, battleSpeed, comparisonScore, createBattle,
  damageLevel, embarkedForBattle, enemyReloadTime, enemyTacticForScores, enemyWantedHeading,
  gunnerySkill, playerReloadTime, shipRecord, stepBattle,
} from '../src/battle-mechanics.mjs';
import { renderBattle } from '../src/battle-renderer.mjs';

const zeroRng = { int: () => 0 };

test('ship records migrate names without inventing damage', () => {
  assert.deepEqual(shipRecord('Barque'), { type: 'Barque', damage: 0 });
  assert.deepEqual(shipRecord({ type: 'Sloop', damage: 32 }), { type: 'Sloop', damage: 32 });
});

test('flagship setup leaves eight hands aboard each reserve ship and applies type caps', () => {
  const setup = embarkedForBattle({ crew: 220, cannon: 40, ships: ['Pinnace', 'Galleon', 'Sloop'] });
  assert.deepEqual(setup, {
    flagship: { type: 'Pinnace', damage: 0 }, men: 64, reserveMen: 156, guns: 8, reserveGuns: 32,
  });
  const galleon = embarkedForBattle({ crew: 400, cannon: 50, ships: ['Pinnace', 'Galleon'], flagshipIndex: 1 });
  assert.equal(galleon.men, 288);
  assert.equal(galleon.guns, 36);
});

test('documented reload and gunnery skill bounds are preserved', () => {
  assert.equal(playerReloadTime(-20), 144);
  assert.equal(playerReloadTime(24), 16);
  assert.equal(enemyReloadTime(3), 120);
  assert.equal(enemyReloadTime(9), 72);
  assert.equal(gunnerySkill(0, true), 0);
  assert.equal(gunnerySkill(4, false, 2), 4);
});

test('battle speed accounts for sails, damage, wind class, stopping, and fort halving', () => {
  const common = { heading: 0, wind: 0, speedRow: SPEED_TABLE_1560.Barque, type: 2, damage: 0, windStrength: 2 };
  assert.equal(battleSpeed({ ...common, sails: 'battle' }), 21);
  assert.equal(battleSpeed({ ...common, sails: 'full' }), 32);
  assert.equal(battleSpeed({ ...common, sails: 'battle', damage: 16 }), 16);
  assert.equal(battleSpeed({ ...common, sails: 'battle', fort: true }), 10);
  assert.equal(battleSpeed({ heading: 128, wind: 0, speedRow: SPEED_TABLE_1560.Galleon, type: 7, damage: 32, sails: 'battle', windStrength: 0 }), 0);
  assert.equal(battleSpeed({ heading: 128, wind: 0, speedRow: SPEED_TABLE_1560.Barque, type: 2, damage: 0, sails: 'battle', windStrength: 2 }), 5);
});

test('shot distance uses the decoded quarter-diagonal approximation and minimum', () => {
  assert.equal(battleDistance(3, 4), 16);
  assert.equal(battleDistance(80, 40), 90);
  assert.equal(battleDistance(-40, -80), 90);
});

test('cannon damage honors battle sails, skill-zero bonus, and player one-man floor', () => {
  const target = { type: 2, damage: 0, men: 40, guns: 10, sails: 'battle' };
  const enemy = applyCannonHit(target, 16, { playerShot: true, skill: 0, rng: zeroRng });
  assert.equal(enemy.damage, 12);
  assert.equal(enemy.men, 32);
  assert.equal(enemy.guns, 8);
  assert.equal(applyCannonHit({ ...target, type: 2 }, 3, { playerShot: true, skill: 0, rng: zeroRng }).damage, 1);
  const player = applyCannonHit({ ...target, men: 1 }, 36, { playerShot: false, skill: 4, rng: zeroRng });
  assert.equal(player.men, 1);
  assert.equal(damageLevel(48), 'Hull leaking');
  assert.equal(damageLevel(64), 'Ship sinking');
});

test('all 27 enemy comparison entries match the decoded table', () => {
  const expected = [
    'flee', 'duel', 'close', 'duel', 'duel', 'duel', 'duel', 'duel', 'duel',
    'flee', 'close', 'close', 'duel', 'duel', 'close', 'duel', 'duel', 'duel',
    'flee', 'flee', 'close', 'duel', 'duel', 'close', 'duel', 'duel', 'close',
  ];
  assert.deepEqual(Array.from({ length: 27 }, (_, index) => enemyTacticForScores(Math.floor(index / 9), Math.floor(index / 3) % 3, index % 3)), expected);
  assert.deepEqual(comparisonScore(
    { damage: 40, guns: 2, men: 10 },
    { damage: 10, guns: 20, men: 40, kind: 8 },
  ), { damage: 2, guns: 2, men: 2 });
  assert.equal(comparisonScore(
    { damage: 40, guns: 10, men: 40 },
    { damage: 30, guns: 10, men: 10, kind: 3 },
  ).damage, 1);
});

function battleFixture() {
  const battle = createBattle({
    player: { ships: ['Barque'], crew: 80, cannon: 12, wind: 192 },
    enemy: { ship: 'Sloop', flag: 'Spain', crew: 12, guns: 8, kind: 5, gold: 10, cargo: 10 },
    speedRows: SPEED_TABLE_1560, difficulty: 1, ability: 'navigation', crewMorale: 4, rng: zeroRng,
  });
  battle.speedRows = Object.fromEntries(Object.keys(SPEED_TABLE_1560).map((name) => [name, Array(16).fill(0)]));
  battle.enemy.guns = 0;
  return battle;
}

test('battle setup is serializable and sail commands finish after 160 frames', () => {
  let battle = battleFixture();
  assert.doesNotThrow(() => JSON.stringify(battle));
  battle = stepBattle(battle, { turn: 0, firePressed: false, raiseSailsPressed: true, lowerSailsPressed: false }, zeroRng);
  assert.equal(battle.player.sailTransition, BATTLE_SAIL_TRANSITION_FRAMES);
  for (let index = 1; index <= BATTLE_SAIL_TRANSITION_FRAMES; index += 1) {
    battle = stepBattle(battle, { turn: 0, firePressed: false, raiseSailsPressed: false, lowerSailsPressed: false }, zeroRng);
  }
  assert.equal(battle.player.sails, 'full');
});

test('player rudder applies the decoded sixteenth-turn every eight frames', () => {
  let battle = battleFixture();
  const input = { turn: 1, firePressed: false, raiseSailsPressed: false, lowerSailsPressed: false };
  for (let frame = 0; frame < PLAYER_RUDDER_INTERVAL - 1; frame += 1) battle = stepBattle(battle, input, zeroRng);
  assert.equal(battle.player.heading, 0);
  battle = stepBattle(battle, input, zeroRng);
  assert.equal(battle.player.heading, PLAYER_RUDDER_STEP);
});

test('battle wind changes on frame 512 and stays within strength range', () => {
  let battle = battleFixture();
  battle.enemy.guns = 0;
  battle.player.x = 220; battle.enemy.x = 260;
  const initial = battle.wind.direction;
  const rng = { int: (limit) => limit === 4 ? 3 : 0 };
  for (let index = 0; index < BATTLE_WIND_SHIFT_FRAMES; index += 1) {
    battle = stepBattle(battle, { turn: 0, firePressed: false, raiseSailsPressed: false, lowerSailsPressed: false }, rng);
    if (battle.event) break;
  }
  if (!battle.event) {
    assert.equal(battle.wind.direction, (initial + 32) & 0xff);
    assert.ok(battle.wind.strength >= 0 && battle.wind.strength <= 2);
  }
});

test('a beam-on broadside lands after the decoded travel delay and starts reload', () => {
  let battle = battleFixture();
  const initialMen = battle.enemy.men;
  battle = stepBattle(battle, { turn: 0, firePressed: true, raiseSailsPressed: false, lowerSailsPressed: false }, zeroRng);
  assert.equal(battle.player.reload, battle.player.reloadTime);
  assert.equal(battle.projectiles.length, 1);
  while (battle.projectiles.length) {
    battle = stepBattle(battle, { turn: 0, firePressed: false, raiseSailsPressed: false, lowerSailsPressed: false }, zeroRng);
  }
  assert.ok(battle.enemy.damage > 0);
  assert.ok(battle.enemy.men < initialMen);
  assert.equal(battle.noHitFrames, 0);
});

test('battle terminal boundaries cover sinking, collision, separation, and sunset', () => {
  const quiet = { turn: 0, firePressed: false, raiseSailsPressed: false, lowerSailsPressed: false };
  let battle = battleFixture();
  battle.player.damage = 64;
  assert.equal(stepBattle(battle, quiet, zeroRng).event, 'player-sunk');
  battle = battleFixture(); battle.enemy.damage = 64;
  assert.equal(stepBattle(battle, quiet, zeroRng).event, 'enemy-sunk');
  battle = battleFixture(); battle.enemy.x = battle.player.x;
  assert.equal(stepBattle(battle, quiet, zeroRng).event, 'boarding');
  battle = battleFixture(); battle.player.x = 100; battle.enemy.x = 341;
  assert.equal(stepBattle(battle, quiet, zeroRng).event, 'escaped');
  battle = battleFixture(); battle.noHitFrames = 4499;
  assert.equal(stepBattle(battle, quiet, zeroRng).event, 'sunset');
});

test('open-sea chases recenter instead of inventing land at the arena edge', () => {
  const battle = battleFixture();
  battle.player.x = -1; battle.enemy.x = 100;
  const result = stepBattle(battle, { turn: 0, firePressed: false, raiseSailsPressed: false, lowerSailsPressed: false }, zeroRng);
  assert.equal(result.event, null);
  assert.ok(result.player.x > 0 && result.enemy.x < result.arena.width);
  assert.equal(Math.round(result.enemy.x - result.player.x), 101);
});

test('an outclassed nearby enemy strikes on the 64-frame decision boundary', () => {
  const battle = battleFixture();
  battle.frame = 63;
  battle.player.x = 200; battle.player.y = 160;
  battle.enemy.x = 225; battle.enemy.y = 160;
  battle.player.damage = 0; battle.player.guns = 12; battle.player.men = 80;
  battle.enemy.damage = 20; battle.enemy.guns = 1; battle.enemy.men = 4;
  const result = stepBattle(battle, { turn: 0, firePressed: false, raiseSailsPressed: false, lowerSailsPressed: false }, zeroRng);
  assert.equal(result.event, 'enemy-struck');
});

test('battle renderer supports desktop and narrow viewports', () => {
  const context = new Proxy({}, {
    get(target, property) {
      if (!(property in target)) target[property] = () => {};
      return target[property];
    },
    set(target, property, value) { target[property] = value; return true; },
  });
  const battle = battleFixture();
  assert.doesNotThrow(() => renderBattle(context, battle, 1440, 900));
  assert.doesNotThrow(() => renderBattle(context, battle, 390, 700));
});

test('a duelling enemy takes the beam that keeps him off the wind (0x8AC1)', () => {
  // Wind 0 blows towards heading 0; heading 128 is dead into the wind.
  // You bear 64: the beams are 128 and 0. Heading 112 is nearer 128, but that
  // beam is 128 from downwind, so he takes the downwind beam instead.
  assert.equal(enemyWantedHeading({ bearing: 64, heading: 112, wind: 0, tactic: 'duel' }), 0);
  // A beam 80 from downwind is acceptable and the nearer one is kept.
  assert.equal(enemyWantedHeading({ bearing: 16, heading: 80, wind: 0, tactic: 'duel' }), 80);
  // A beam 96 from downwind (within about 46° of the wind) is refused.
  assert.equal(enemyWantedHeading({ bearing: 32, heading: 96, wind: 0, tactic: 'duel' }), 224);
});

test('closing and fleeing courses stay within 80 units of downwind and are truncated to 16', () => {
  assert.equal(enemyWantedHeading({ bearing: 128, heading: 0, wind: 0, tactic: 'close' }), 176);
  assert.equal(enemyWantedHeading({ bearing: 0, heading: 0, wind: 0, tactic: 'flee' }), 176);
  assert.equal(enemyWantedHeading({ bearing: 37, heading: 0, wind: 0, tactic: 'close' }), 32);
});
