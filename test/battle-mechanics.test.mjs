import test from 'node:test';
import assert from 'node:assert/strict';
import { SPEED_TABLE_1560 } from '../src/data.mjs';
import {
  BATTLE_EVENT, BATTLE_SAIL_TRANSITION_FRAMES, BATTLE_SHOT_SPLASH_END, BATTLE_WIND_SHIFT_FRAMES,
  PLAYER_RUDDER_INTERVAL, PLAYER_RUDDER_STEP, SMOKE_DRIFT, SMOKE_LIFE_FRAMES, driftSmoke,
  applyCannonHit, battleDistance, battleSpeed, broadsideDirection, broadsideState, frameOutcome, shiftBattleWind, comparisonScore, cosScaled, createBattle,
  damageLevel, embarkedForBattle, enemyReloadTime, enemyTacticForScores, enemyWantedHeading,
  gunnerySkill, hitBox, initialPlacement, moveShip, playerReloadTime, shipRecord, shipsCloseEnoughToStrike,
  shipsTouch, shotHitsShip, sinScaled, stepBattle, stepPlayerSailsAndReload,
  FORT_FIELD, createFortBattle, fortTargetIndex, fieldToCompass, fortDamageLevel, fortFieldGround, fortOrientation, fortStart, garrisonAfterFortBattle,
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
  // A fixed beam-on layout: he lies 140 px due east, both heading north.
  Object.assign(battle.player, { x: 170, y: 160, heading: 0 });
  Object.assign(battle.enemy, { x: 310, y: 160, heading: 0, wantedHeading: 0 });
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
  // A sinking is checked only on a frame whose last event is a hit (0xEBD7),
  // yours first.
  battle.player.damage = 64;
  assert.equal(stepBattle(battle, quiet, zeroRng).event, null);
  assert.equal(frameOutcome(BATTLE_EVENT.hit, battle), 'player-sunk');
  battle = battleFixture(); battle.enemy.damage = 64;
  assert.equal(frameOutcome(BATTLE_EVENT.hit, battle), 'enemy-sunk');
  battle.player.damage = 64;
  assert.equal(frameOutcome(BATTLE_EVENT.hit, battle), 'player-sunk');
  battle = battleFixture(); battle.enemy.x = battle.player.x;
  assert.equal(stepBattle(battle, quiet, zeroRng).event, 'boarding');
  battle = battleFixture(); battle.player.x = 100; battle.enemy.x = 341;
  assert.equal(stepBattle(battle, quiet, zeroRng).event, 'escaped');
  // 0x7E38 `jle`: the sun sets once the count passes 4,500.
  battle = battleFixture(); battle.noHitFrames = 4499;
  assert.equal(stepBattle(battle, quiet, zeroRng).event, null);
  battle = battleFixture(); battle.noHitFrames = 4500;
  assert.equal(stepBattle(battle, quiet, zeroRng).event, 'sunset');
});

test('the last event of a frame wins: a strike after a sinking hit is a strike (0x44A12)', () => {
  const quiet = { turn: 0, firePressed: false, raiseSailsPressed: false, lowerSailsPressed: false };
  const sinkingShot = (fireFrame, { canStrike = true } = {}) => {
    let battle = battleFixture();
    battle.enemy.x = 230; // 60 px: the ball flies 30 frames
    battle.enemy.damage = 60;
    // Out-gunning you (G > 0) he never strikes; his reload keeps him silent.
    if (!canStrike) Object.assign(battle.enemy, { guns: 20, reload: 9999 });
    battle.frame = fireFrame - 1;
    battle = stepBattle(battle, { ...quiet, firePressed: true }, zeroRng);
    while (!battle.event && battle.player.shotTimer < 0) battle = stepBattle(battle, quiet, zeroRng);
    return battle;
  };
  // Landing on frame 128, a strike check: the hit (7) then the strike (9).
  const struck = sinkingShot(98);
  assert.equal(struck.frame, 128);
  assert.ok(struck.enemy.damage >= 64);
  assert.equal(struck.event, 'enemy-struck');
  // When he can't strike, the same hit is the frame's last event: he explodes.
  const sunk = sinkingShot(98, { canStrike: false });
  assert.equal(sunk.frame, 128);
  assert.equal(sunk.event, 'enemy-sunk');
});

test('broadsides follow the sign of the bearing, firing forward at the sign-0 bearing (0x82EB, 0x8F86)', () => {
  // You: heading 0; he bears 64 from you (so 192 from him to you): starboard.
  assert.equal(broadsideDirection('player', 0, 192), 64);
  assert.equal(broadsideDirection('player', 0, 64), 192);
  // He is dead astern of you (bearing to you 0): forward. Dead ahead (128): port.
  assert.equal(broadsideDirection('player', 0, 0), 0);
  assert.equal(broadsideDirection('player', 0, 128), 192);
  // Him: heading 0, you dead ahead: forward; dead astern: port.
  assert.equal(broadsideDirection('enemy', 0, 0), 0);
  assert.equal(broadsideDirection('enemy', 0, 128), 192);
  assert.equal(broadsideDirection('enemy', 0, 64), 64);
});

test('the battle wind changes strength only when its direction changed (0x87F6)', () => {
  const draws = (values) => { let index = 0; return { int: () => values[index++] }; };
  // rnd 1 → direction +0: no second draw, no event.
  assert.deepEqual(shiftBattleWind({ direction: 64, strength: 1 }, draws([1, 3])), { wind: { direction: 64, strength: 1 }, changed: false });
  // rnd 3 → +32; strength (3 − 1) >> 1 = +1. rnd 0 → −16; (0 − 1) >> 1 = −1.
  assert.deepEqual(shiftBattleWind({ direction: 64, strength: 1 }, draws([3, 3])), { wind: { direction: 96, strength: 2 }, changed: true });
  assert.deepEqual(shiftBattleWind({ direction: 0, strength: 0 }, draws([0, 0])), { wind: { direction: 240, strength: 0 }, changed: true });
  assert.equal(shiftBattleWind({ direction: 0, strength: 1 }, draws([2, 2])).wind.strength, 1);
});

test('the wind shifts after his reload and before his captain, on frame 512', () => {
  const battle = battleFixture();
  battle.frame = 511;
  battle.wind = { direction: 0, strength: 1 };
  const rng = { int: (limit) => (limit === 4 ? 3 : 0) };
  const next = stepBattle(battle, { turn: 0, firePressed: false, raiseSailsPressed: false, lowerSailsPressed: false }, rng);
  assert.deepEqual(next.wind, { direction: 32, strength: 2 });
  assert.equal(next.frameEvent, BATTLE_EVENT.wind);
});

test('his sails stay as they are on a 64-frame tick that already has an event (0x8A25)', () => {
  const quiet = { turn: 0, firePressed: false, raiseSailsPressed: false, lowerSailsPressed: false };
  const battle = battleFixture();
  battle.frame = 63;
  battle.enemy.men = 200; // close, so he wants full sails
  assert.equal(stepBattle(battle, quiet, zeroRng).enemy.sails, 'full');
  // Your broadside on that frame sets event 1 first.
  const busy = stepBattle(battle, { ...quiet, firePressed: true }, zeroRng);
  assert.equal(busy.enemy.tactic, 'close');
  assert.equal(busy.enemy.sails, 'battle');
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

test('sin and cos follow the original byte table and floor (0x23150)', () => {
  assert.equal(sinScaled(0, 24), 0);
  assert.equal(sinScaled(64, 24), 23);
  assert.equal(sinScaled(192, 24), -24);
  assert.equal(cosScaled(0, 40), 39);
  assert.equal(cosScaled(128, 40), -40);
});

test('ships move 4·sin(heading, s) in 24.8 units per frame, about s/64 pixels', () => {
  const battle = battleFixture();
  battle.speedRows = SPEED_TABLE_1560;
  battle.wind = { direction: 0, strength: 0 };
  // Barque at rel 4 (beam reach), battle sails, light wind: table 5, s = 20.
  const ship = { ...battle.player, heading: 64, x: 100, y: 100 };
  const moved = moveShip(ship, battle);
  assert.equal(moved.speed, 20);
  assert.equal(moved.x - 100, 4 * 19 / 256); // sin(64, 20) = floor(20·255/256) = 19
  assert.equal(moved.y, 100);
  // Top speed 40 north for 64 frames: 64 · 4 · cos(0, 40) / 256 = 39 pixels.
  let north = { ...battle.player, heading: 0, x: 100, y: 200, sails: 'full', name: 'War galleon', type: 6 };
  const strong = { ...battle, wind: { direction: 0, strength: 2 } };
  for (let frame = 0; frame < 64; frame += 1) north = moveShip(north, strong);
  assert.equal(north.speed, 40);
  assert.equal(200 - north.y, 39);
});

test('hit boxes are fixed axis-aligned half-sizes by type (0x32B0C / 0x32B20)', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map((type) => hitBox({ type })), [
    { halfWidth: 20, halfHeight: 10 }, { halfWidth: 20, halfHeight: 10 }, { halfWidth: 20, halfHeight: 10 },
    { halfWidth: 30, halfHeight: 20 }, { halfWidth: 30, halfHeight: 20 }, { halfWidth: 30, halfHeight: 20 },
    { halfWidth: 40, halfHeight: 30 }, { halfWidth: 40, halfHeight: 30 },
  ]);
  assert.deepEqual(hitBox({ type: 8, fort: true }), { halfWidth: 32, halfHeight: 32 });
  // The box does not turn with the ship.
  const pinnace = { type: 0, x: 100, y: 100, heading: 64 };
  assert.equal(shotHitsShip({ x: 120, y: 110 }, pinnace), true);
  assert.equal(shotHitsShip({ x: 121, y: 100 }, pinnace), false);
  assert.equal(shotHitsShip({ x: 100, y: 111 }, pinnace), false);
  assert.equal(shotHitsShip({ x: 120, y: 110 }, { ...pinnace, heading: 0 }), true);
});

test('your shots test a box enlarged by gunnery skill; his test your exact box (0x9E38, 0x9EDA)', () => {
  const pinnace = { type: 0, x: 100, y: 100 };
  // Skill 0: 20 + 3·5 = 35 wide, 10 + 3·2 = 16 high.
  assert.equal(shotHitsShip({ x: 135, y: 116 }, pinnace, { skill: 0 }), true);
  assert.equal(shotHitsShip({ x: 136, y: 100 }, pinnace, { skill: 0 }), false);
  assert.equal(shotHitsShip({ x: 100, y: 117 }, pinnace, { skill: 0 }), false);
  // Skill 1: 30 × 14. Skill 2–4: 25 × 12.
  assert.equal(shotHitsShip({ x: 130, y: 114 }, pinnace, { skill: 1 }), true);
  assert.equal(shotHitsShip({ x: 131, y: 100 }, pinnace, { skill: 1 }), false);
  for (const skill of [2, 3, 4]) {
    assert.equal(shotHitsShip({ x: 125, y: 112 }, pinnace, { skill }), true);
    assert.equal(shotHitsShip({ x: 126, y: 100 }, pinnace, { skill }), false);
  }
  assert.equal(shotHitsShip({ x: 121, y: 100 }, pinnace), false);
});

test('boarding contact uses a quarter of each half-size, striking twice (0x9C84, 0x9D53)', () => {
  const barque = { type: 2, x: 100, y: 100 };
  const galleon = { type: 7, x: 100, y: 100 };
  // Quarter reach on x: 5 + 10 = 15; on y: 2 + 7 = 9.
  assert.equal(shipsTouch(barque, { ...galleon, x: 115, y: 109 }), true);
  assert.equal(shipsTouch(barque, { ...galleon, x: 116 }), false);
  assert.equal(shipsTouch(barque, { ...galleon, y: 110 }), false);
  // A fort's box counts whole: 5 + 32.
  assert.equal(shipsTouch(barque, { type: 8, fort: true, x: 137, y: 100 }), true);
  assert.equal(shipsTouch(barque, { type: 8, fort: true, x: 138, y: 100 }), false);
  // Twice: 40 + 80 = 120 on x, 20 + 60 = 80 on y.
  assert.equal(shipsCloseEnoughToStrike(barque, { ...galleon, x: 220, y: 180 }), true);
  assert.equal(shipsCloseEnoughToStrike(barque, { ...galleon, x: 221 }), false);
  assert.equal(shipsCloseEnoughToStrike(barque, { ...galleon, y: 181 }), false);
});

test('the enemy uses one less when his speed value equals your skill (quirk 19)', () => {
  const common = { heading: 0, wind: 0, speedRow: SPEED_TABLE_1560.Barque, type: 2, sails: 'battle', windStrength: 0 };
  // rel 0 has table value 4: 16·8/8 = 16, or 12 with the quirk.
  assert.equal(battleSpeed(common), 16);
  assert.equal(battleSpeed({ ...common, enemySkill: 4 }), 12);
  assert.equal(battleSpeed({ ...common, enemySkill: 3 }), 16);
});

test('your ship reads the speed table signed: dead upwind stops a square-rigger (quirk 18 not kept)', () => {
  const upwind = { heading: 128, wind: 0, speedRow: SPEED_TABLE_1560.Merchantman, type: 4, sails: 'battle', windStrength: 0 };
  assert.equal(SPEED_TABLE_1560.Merchantman[8], -1);
  assert.equal(battleSpeed(upwind), 0);
  assert.equal(battleSpeed({ ...upwind, sails: 'full', windStrength: 2 }), 0);
});

test('the enemy fires whenever loaded, armed and within 6 of his beam, whatever his tactic (0x8EDF)', () => {
  const quiet = { turn: 0, firePressed: false, raiseSailsPressed: false, lowerSailsPressed: false };
  for (const tactic of ['close', 'duel', 'flee']) {
    const battle = battleFixture();
    battle.enemy.guns = 8; battle.enemy.tactic = tactic;
    // You bear 192 from him; heading 0 puts you exactly on his port beam.
    const fired = stepBattle(battle, quiet, zeroRng);
    assert.equal(fired.projectiles.filter((shot) => shot.owner === 'enemy').length, 1, tactic);
  }
  const off = battleFixture();
  off.enemy.guns = 8; off.enemy.heading = 6; off.enemy.wantedHeading = 6;
  assert.equal(stepBattle(off, quiet, zeroRng).projectiles.length, 0);
  const near = battleFixture();
  near.enemy.guns = 8; near.enemy.heading = 5; near.enemy.wantedHeading = 5;
  assert.equal(stepBattle(near, quiet, zeroRng).projectiles.length, 1);
});

test('a ball lands n = d/2 frames after firing and the ship refires 39 frames later', () => {
  const quiet = { turn: 0, firePressed: false, raiseSailsPressed: false, lowerSailsPressed: false };
  const fire = { ...quiet, firePressed: true };
  let battle = battleFixture();
  battle.player.reloadTime = 1;
  battle = stepBattle(battle, fire, zeroRng); // frame 1: fired, 140 px away, so n = 70
  assert.equal(battle.player.shotTimer, -70);
  assert.equal(battle.projectiles[0].x, 170);
  // The reload is held at 1 while the ball is out, so the guns don't read loaded.
  battle = stepBattle(battle, fire, zeroRng);
  assert.equal(battle.player.reload, 1);
  assert.deepEqual(broadsideState(battle.player), { ready: false, label: 'Ball in flight' });
  while (battle.frame < 70) battle = stepBattle(battle, fire, zeroRng);
  assert.equal(battle.projectiles.length, 1);
  battle = stepBattle(battle, fire, zeroRng); // frame 71 = 1 + 70: it lands
  assert.equal(battle.projectiles.length, 0);
  assert.equal(battle.player.shotTimer, 1);
  // It flew 70 steps of 4·sin(64, 128)/256 = 4·127/256 px.
  assert.equal(battle.effects.at(-1).x, 170 + 70 * 4 * 127 / 256);
  assert.deepEqual(broadsideState(battle.player), { ready: false, label: 'Ball landing' });
  while (battle.frame < 71 + BATTLE_SHOT_SPLASH_END - 2) battle = stepBattle(battle, fire, zeroRng);
  assert.equal(battle.projectiles.length, 0);
  battle = stepBattle(battle, fire, zeroRng); // frame 109: the counter clears
  assert.equal(battle.player.shotTimer, 0);
  // The held reload is released on the next frame's countdown, before the fire check.
  assert.equal(battle.player.reload, 1);
  battle = stepBattle(battle, fire, zeroRng); // frame 110 = landing + 39: fires again
  assert.equal(battle.projectiles.length, 1);
  assert.deepEqual(broadsideState({ guns: 4, reload: 0, shotTimer: 0 }), { ready: true, label: 'Loaded' });
  assert.deepEqual(broadsideState({ guns: 0, reload: 0, shotTimer: 0 }), { ready: false, label: 'Disarmed' });
});

test('your reload stands still while a sail change is asked for or runs (0x7EE3)', () => {
  const ship = { sails: 'battle', targetSails: 'battle', sailTransition: 0, reload: 50, shotTimer: 0 };
  const asked = stepPlayerSailsAndReload(ship, 'full');
  assert.equal(asked.reload, 50);
  assert.equal(asked.sailTransition, BATTLE_SAIL_TRANSITION_FRAMES);
  let changing = asked;
  for (let frame = 0; frame < BATTLE_SAIL_TRANSITION_FRAMES; frame += 1) changing = stepPlayerSailsAndReload(changing, 'battle');
  assert.equal(changing.sails, 'full');
  assert.equal(changing.reload, 50);
  assert.equal(stepPlayerSailsAndReload(changing).reload, 49);
  assert.equal(stepPlayerSailsAndReload({ ...ship, reload: 1 }).reload, 0);
  assert.equal(stepPlayerSailsAndReload({ ...ship, reload: 1, shotTimer: 5 }).reload, 1);
});

test('the enemy sets his sails at once with his tactic (0x8A57)', () => {
  const battle = battleFixture();
  battle.frame = 63;
  battle.enemy.men = 200; // D 1, G 0, M 1: close
  const next = stepBattle(battle, { turn: 0, firePressed: false, raiseSailsPressed: false, lowerSailsPressed: false }, zeroRng);
  assert.equal(next.enemy.tactic, 'close');
  assert.equal(next.enemy.sails, 'full');
  assert.equal(next.enemy.sailTransition, 0);
});

test('ships start mirrored about the centre, you pointing at him (0x9A79)', () => {
  const arena = { width: 480, height: 320 };
  const draws = (values) => { let index = 0; return { int: () => values[index++] }; };
  // x: r = 5 → +37; y: r = 0x83 → −35; wanted 200; jitter 31 → +15.
  const placed = initialPlacement(arena, draws([5, 0x83, 200, 31]));
  assert.deepEqual(placed.player, { x: 277, y: 125, heading: 0xa0 });
  assert.deepEqual(placed.enemy, { x: 203, y: 195, heading: (0xa0 + 15 - 0x60) & 0xff, wantedHeading: 200 });
  // He is east and south of you: you head south-east.
  const other = initialPlacement(arena, draws([0x80, 0x8f, 0, 0]));
  assert.deepEqual(other.player, { x: 208, y: 113, heading: 0x60 });
  assert.equal(other.enemy.x, 272);
  assert.equal(other.enemy.heading, (0x60 - 16 - 0x60) & 0xff);
});

test('the escape is yours only when your motion opened the range more than his', async () => {
  const { playerOpenedRange } = await import('../src/battle-mechanics.mjs');
  // You are due east of him. Heading 64 is east, 192 west, 0 north.
  const parting = (player, enemy) => playerOpenedRange({ player: { x: 100, y: 0, ...player }, enemy: { x: 0, y: 0, ...enemy } });
  assert.equal(parting({ heading: 64, speed: 30 }, { heading: 0, speed: 20 }), true, 'you run while he duels broadside');
  assert.equal(parting({ heading: 64, speed: 30 }, { heading: 64, speed: 20 }), true, 'you outrun him while he chases');
  assert.equal(parting({ heading: 192, speed: 20 }, { heading: 192, speed: 30 }), false, 'he runs off and you chase');
  assert.equal(parting({ heading: 0, speed: 20 }, { heading: 192, speed: 30 }), false, 'he sails away while you cross');
});

const quiet = { turn: 0, firePressed: false, raiseSailsPressed: false, lowerSailsPressed: false };

function fortFixture(overrides = {}) {
  return createFortBattle({
    player: { ships: ['Sloop'], crew: 60, cannon: 12, wind: 0 },
    town: { name: 'Havana', nation: 'Spain', soldiers: 29, forts: 2, ...overrides },
    speedRows: SPEED_TABLE_1560, difficulty: 1, ability: 'navigation', crewMorale: 4, rng: zeroRng,
  });
}

test('each fort is a type-8 battery of 12 guns with a 144-frame reload, sharing twice the soldiers', () => {
  const battle = fortFixture();
  assert.equal(battle.fort, true);
  assert.equal(battle.forts.length, 2);
  assert.equal(battle.enemy.men, 60, '4·((29 + 1)/2)');
  assert.equal(battle.enemy.guns, 24);
  for (const [index, fort] of battle.forts.entries()) {
    assert.equal(fort.type, 8);
    assert.equal(fort.guns, 12);
    assert.equal(fort.men, 30);
    assert.equal(fort.reloadTime, 144);
    assert.deepEqual({ x: fort.x, y: fort.y }, FORT_FIELD.forts[index]);
    assert.equal(fortFieldGround(fort), 'land');
  }
  assert.deepEqual(fortFixture({ soldiers: 31, forts: 3 }).forts.map((fort) => fort.men), [22, 21, 21], '64 gunners');
  assert.equal(fortFixture({ forts: 9 }).forts.length, 1, 'forts & 7');
  assert.equal(fortFixture({ forts: 7 }).forts.length, 4, 'at most four places');
  assert.equal(fortFieldGround(battle.player), 'water');
  assert.doesNotThrow(() => JSON.stringify(battle));
});

test('the forts never move, stay beam-on and each fires as soon as it is loaded', () => {
  let battle = fortFixture();
  const places = battle.forts.map(({ x, y }) => ({ x, y }));
  battle = stepBattle(battle, quiet, zeroRng);
  assert.deepEqual(battle.projectiles.filter((shot) => shot.owner === 'enemy').map((shot) => shot.battery), [0, 1]);
  assert.deepEqual(battle.forts.map((fort) => fort.reload), [144, 144]);
  for (let frame = 0; frame < 200; frame += 1) {
    battle = stepBattle(battle, quiet, { int: (n) => n - 1 });
    assert.deepEqual(battle.forts.map(({ x, y }) => ({ x, y })), places);
    assert.ok(battle.projectiles.filter((shot) => shot.owner === 'enemy').length <= 2, 'one ball a fort');
  }
});

test('your broadside is laid on the nearest fort with guns, and its hits silence that fort alone', () => {
  const battle = fortFixture();
  const [west, east] = battle.forts;
  assert.equal(fortTargetIndex({ x: west.x, y: 150 }, battle.forts), 0);
  assert.equal(fortTargetIndex({ x: east.x, y: 150 }, battle.forts), 1);
  battle.forts[1] = { ...east, guns: 0 };
  assert.equal(fortTargetIndex({ x: east.x, y: 150 }, battle.forts), 0, 'a silenced fort is passed over');
  battle.forts[0] = { ...west, guns: 0 };
  assert.equal(fortTargetIndex({ x: east.x, y: 150 }, battle.forts), 1, 'the nearest once all are silent');

  // A ball landing on the eastern fort: only its guns and gunners suffer.
  let next = fortFixture();
  next.forts = next.forts.map((fort) => ({ ...fort, reload: 500 })); // they hold their fire
  Object.assign(next.player, { x: next.forts[1].x, y: 150, heading: 0, shotTimer: -1 });
  next.projectiles = [{ owner: 'player', x: next.forts[1].x, y: next.forts[1].y, direction: 0, remaining: 0, total: 10, target: 1 }];
  next = stepBattle(next, quiet, { int: (n) => n - 1 });
  assert.equal(next.frameEvent, BATTLE_EVENT.hit);
  assert.equal(next.forts[0].guns, 12);
  assert.ok(next.forts[1].guns < 12 && next.forts[1].men < 30);
  assert.equal(next.enemy.guns, 12 + next.forts[1].guns);
  assert.equal(next.enemy.men, 30 + next.forts[1].men);
  assert.equal(next.enemy.startMen, 60);
});

test('a silenced fort holds its fire', () => {
  let battle = fortFixture();
  battle.forts[0] = { ...battle.forts[0], guns: 0 };
  battle = stepBattle(battle, quiet, zeroRng);
  assert.deepEqual(battle.projectiles.filter((shot) => shot.owner === 'enemy').map((shot) => shot.battery), [1]);
  assert.equal(battle.enemy.firing, 1);
});

test('you sail at half speed against a fort', () => {
  const ship = fortFixture();
  const open = createBattle({
    player: { ships: ['Sloop'], crew: 60, cannon: 12, wind: 0 },
    enemy: { ship: 'Sloop', flag: 'Spain', crew: 12, guns: 0, kind: 5 },
    speedRows: SPEED_TABLE_1560, difficulty: 1, ability: 'navigation', crewMorale: 4, rng: zeroRng,
  });
  for (const battle of [ship, open]) Object.assign(battle.player, { heading: 128 });
  const fortSpeed = stepBattle(ship, quiet, zeroRng).player.speed;
  const seaSpeed = stepBattle(open, quiet, zeroRng).player.speed;
  assert.ok(seaSpeed > 0);
  assert.equal(fortSpeed, Math.trunc(seaSpeed / 2));
});

test('the fort cannot be sunk; its hits only raise the damage shown', () => {
  const battle = fortFixture();
  battle.enemy.damage = 200;
  battle.forts[0].damage = 200;
  battle.frameEvent = BATTLE_EVENT.hit;
  assert.equal(frameOutcome(BATTLE_EVENT.hit, battle), null);
  assert.equal(fortDamageLevel(19), 0);
  assert.equal(fortDamageLevel(40), 2);
  assert.equal(fortDamageLevel(500), 3);
  // No skill-0 bonus against the fort: 4·12/10 = 4.
  const hit = applyCannonHit(battle.forts[1], 12, { playerShot: true, skill: 0, rng: zeroRng });
  assert.equal(hit.damage - battle.forts[1].damage, 4);
});

test('reaching the quay lands the crew; any other shore, the fort included, is running aground', () => {
  const at = (x, y) => {
    const battle = fortFixture({ forts: 0 }); // no guns, so nothing else happens
    Object.assign(battle.player, { x, y, heading: 0 });
    battle.speedRows = Object.fromEntries(Object.keys(SPEED_TABLE_1560).map((name) => [name, Array(16).fill(0)]));
    return stepBattle(battle, quiet, zeroRng).event;
  };
  const { quay, forts } = FORT_FIELD;
  assert.equal(at(quay.x + 10, quay.y + 5), 'landed');
  for (const fort of forts) assert.equal(at(fort.x, fort.y), 'beached');
  assert.equal(at(40, 30), 'beached');
  assert.equal(at(240, 200), null);
  assert.equal(at(5, 200), 'escaped');
  assert.equal(at(240, FORT_FIELD.height - 5), 'escaped');
});

test('a fort battle runs out at sunset like a ship battle', () => {
  const battle = fortFixture({ forts: 0 });
  battle.speedRows = Object.fromEntries(Object.keys(SPEED_TABLE_1560).map((name) => [name, Array(16).fill(0)]));
  battle.noHitFrames = 4500;
  assert.equal(stepBattle(battle, quiet, zeroRng).event, 'sunset');
});

test('the garrison after getting through keeps the fort survivors at a tenth', () => {
  assert.equal(garrisonAfterFortBattle({ soldiers: 30, fortMenLeft: 60 }), 21);
  assert.equal(garrisonAfterFortBattle({ soldiers: 30, fortMenLeft: 9 }), 15);
});

test('battle renderer draws the fort field', () => {
  const context = new Proxy({}, {
    get(target, property) {
      if (!(property in target)) target[property] = () => {};
      return target[property];
    },
    set(target, property, value) { target[property] = value; return true; },
  });
  for (const forts of [0, 1, 4]) {
    const battle = fortFixture({ forts });
    if (forts) battle.forts[0] = { ...battle.forts[0], guns: 0, damage: 70 };
    assert.doesNotThrow(() => renderBattle(context, battle, 1440, 900));
    assert.doesNotThrow(() => renderBattle(context, battle, 390, 700));
  }
});

test('the fort field turns so the harbor lies within 45° of downwind, and the compass wind is kept', () => {
  for (let wind = 0; wind < 256; wind += 4) {
    const battle = createFortBattle({
      player: { ships: ['Sloop'], crew: 60, cannon: 12, wind },
      town: { name: 'Havana', nation: 'Spain', soldiers: 29, forts: 2 },
      speedRows: SPEED_TABLE_1560, difficulty: 1, ability: 'navigation', crewMorale: 4, rng: zeroRng,
    });
    assert.equal(battle.orientation, fortOrientation(wind));
    assert.equal(fieldToCompass(battle.wind.direction, battle.orientation), wind, 'the wind you sailed in');
    const fieldWind = ((battle.wind.direction + 128) & 0xff) - 128;
    assert.ok(fieldWind >= -32 && fieldWind < 32, `wind ${wind}: the harbor (north) is within 45° of downwind`);
  }
});

test('you start in open water on a broad reach pointed at the harbor', () => {
  const { margin, width, height } = FORT_FIELD;
  for (let fieldWind = -32; fieldWind < 32; fieldWind += 1) {
    const start = fortStart(fieldWind & 0xff);
    assert.equal(fortFieldGround(start), 'water', `wind ${fieldWind}`);
    assert.ok(start.x > margin && start.x < width - margin && start.y > margin && start.y < height - margin);
    const sector = ((start.heading + 8 - (fieldWind & 0xff)) >> 4) & 15;
    assert.ok([1, 2, 14, 15].includes(sector), `wind ${fieldWind}: sector ${sector}`);
  }
});

test('the renderer draws a fort field turned a quarter turn', () => {
  const context = new Proxy({}, {
    get(target, property) {
      if (!(property in target)) target[property] = () => {};
      return target[property];
    },
    set(target, property, value) { target[property] = value; return true; },
  });
  const battle = createFortBattle({
    player: { ships: ['Sloop'], crew: 60, cannon: 12, wind: 64 },
    town: { name: 'Havana', nation: 'Spain', soldiers: 29, forts: 2 },
    speedRows: SPEED_TABLE_1560, difficulty: 1, ability: 'navigation', crewMorale: 4, rng: zeroRng,
  });
  assert.equal(battle.orientation, 1);
  assert.doesNotThrow(() => renderBattle(context, battle, 1440, 900));
  assert.doesNotThrow(() => renderBattle(context, battle, 390, 700));
});

test('a broadside leaves gun smoke on its firing side that the wind carries off', () => {
  const quiet = { turn: 0, firePressed: false, raiseSailsPressed: false, lowerSailsPressed: false };
  let battle = battleFixture();
  battle.wind = { direction: 128, strength: 2 }; // blowing south
  battle = stepBattle(battle, { ...quiet, firePressed: true }, zeroRng);
  const smoke = battle.effects.filter((effect) => effect.kind === 'smoke');
  assert.equal(smoke.length, 3);
  // He lies due east, so the guns fire east: the puffs start east of the
  // hull, strung along it, and are pushed east.
  for (const puff of smoke) { assert.ok(puff.x > 170); assert.ok(puff.vx > 0); }
  assert.ok(Math.max(...smoke.map((puff) => puff.y)) - Math.min(...smoke.map((puff) => puff.y)) >= 10);
  const start = smoke[1];
  for (let frame = 0; frame < 60; frame += 1) battle = stepBattle(battle, quiet, zeroRng);
  const later = battle.effects.find((effect) => effect.kind === 'smoke' && effect.variant === start.variant);
  assert.ok(later.y - start.y > 60 * SMOKE_DRIFT[2] * .9, 'drifted south with the wind');
  assert.ok(later.x - start.x < 7.5, 'the outward push dies away');
  while (battle.frame < SMOKE_LIFE_FRAMES + 1) battle = stepBattle(battle, quiet, zeroRng);
  assert.equal(battle.effects.filter((effect) => effect.kind === 'smoke').length, 0, 'gone once its life is spent');
});

test('smoke drifts faster in a stronger wind, straight downwind', () => {
  const puff = { kind: 'smoke', x: 0, y: 0, vx: 0, vy: 0, variant: 0, life: 50 };
  const drift = (strength) => driftSmoke(puff, { direction: 64, strength }).x;
  assert.ok(drift(0) < drift(1) && drift(1) < drift(2));
  assert.equal(driftSmoke(puff, { direction: 64, strength: 1 }).y, 0);
});
