import test from 'node:test';
import assert from 'node:assert/strict';
import { SPEED_TABLE_1560 } from '../src/data.mjs';
import {
  BATTLE_EVENT, BATTLE_SAIL_TRANSITION_FRAMES, BATTLE_SHOT_SPLASH_END, BATTLE_WIND_SHIFT_FRAMES,
  PLAYER_RUDDER_INTERVAL, PLAYER_RUDDER_STEP,
  applyCannonHit, battleDistance, battleSpeed, broadsideDirection, broadsideState, frameOutcome, shiftBattleWind, comparisonScore, cosScaled, createBattle,
  damageLevel, embarkedForBattle, enemyReloadTime, enemyTacticForScores, enemyWantedHeading,
  gunnerySkill, hitBox, initialPlacement, moveShip, playerReloadTime, shipRecord, shipsCloseEnoughToStrike,
  shipsTouch, shotHitsShip, sinScaled, stepBattle, stepPlayerSailsAndReload,
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
