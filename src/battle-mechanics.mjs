import { SHIPS } from './data.mjs';
import { clamp, relativeHeadingSector } from './mechanics.mjs';

export const BATTLE_FRAME_SECONDS = 1 / 30; // ASSUMED: original wall-clock frame duration is untraced.
export const BATTLE_SAIL_TRANSITION_FRAMES = 160;
export const BATTLE_WIND_SHIFT_FRAMES = 512;
export const BATTLE_SUNSET_FRAMES = 4500;
export const PLAYER_RUDDER_STEP = 16;
export const PLAYER_RUDDER_INTERVAL = 8;

export const BATTLE_ASSUMPTIONS = Object.freeze({
  frameSeconds: BATTLE_FRAME_SECONDS,
  arena: { width: 480, height: 320 },
});

// Hit-box half-sizes in battle pixels by ship type (tables 0x32B0C / 0x32B20,
// loaded at 0xE367 / 0xE4C3). The boxes are axis-aligned and do not turn with
// the ship. The fort's 32 × 32 is set directly at 0xE410.
export const BATTLE_HIT_HALF_WIDTH = Object.freeze([20, 20, 20, 30, 30, 30, 40, 40]);
export const BATTLE_HIT_HALF_HEIGHT = Object.freeze([10, 10, 10, 20, 20, 20, 30, 30]);
export const FORT_HIT_HALF_SIZE = 32;
// Quarter-steps added to the enemy's box for your shots, by gunnery skill
// (0x325AE, used at 0x9E38): half + k·(half >> 2).
export const PLAYER_SHOT_BOX_STEPS = Object.freeze([3, 2, 1, 1, 1]);
// After a ball lands, its splash counter runs from 1 up to 39 before it clears
// (0x84EC you, 0x9177 him), and a ship can't fire while its counter is
// non-zero (0x8284, 0x8EDF). So each ship has one ball out at a time.
export const BATTLE_SHOT_SPLASH_FRAMES = 38;

// 0x36628: 128-byte half-sine, round(255·sin(i·π/128)); it matches the binary
// byte for byte.
const SINE_TABLE = Object.freeze(Array.from({ length: 128 }, (_, index) => Math.round(255 * Math.sin(index * Math.PI / 128))));

// sin(angle, magnitude) at 0x23150: magnitude·table >> 8, floored, with the
// magnitude negated for angles 128–255. cos is sin(angle + 64) (0x23146).
export function sinScaled(angle, magnitude) {
  let index = angle & 0xff;
  let value = magnitude;
  if (index >= 128) { value = -value; index -= 128; }
  return Math.floor(value * SINE_TABLE[index] / 256);
}

export function cosScaled(angle, magnitude) {
  return sinScaled(angle + 64, magnitude);
}

const TACTICS = [
  'flee', 'duel', 'close', 'duel', 'duel', 'duel', 'duel', 'duel', 'duel',
  'flee', 'close', 'close', 'duel', 'duel', 'close', 'duel', 'duel', 'duel',
  'flee', 'flee', 'close', 'duel', 'duel', 'close', 'duel', 'duel', 'close',
];

export function shipName(ship) {
  return typeof ship === 'string' ? ship : ship.type;
}
export function shipRecord(ship) {
  return typeof ship === 'string' ? { type: ship, damage: 0 } : { type: ship.type, damage: ship.damage ?? 0 };
}

export function embarkedForBattle({ crew, cannon, ships, flagshipIndex = 0 }) {
  const flagship = shipRecord(ships[flagshipIndex]);
  const stats = SHIPS[flagship.type];
  const availableMen = Math.max(1, crew - 8 * Math.max(0, ships.length - 1));
  const men = Math.min(availableMen, 32 * (stats.type + 2));
  const guns = Math.min(cannon, Math.floor(men / 4), 4 * (stats.type + 2));
  return {
    flagship,
    men,
    reserveMen: Math.max(0, crew - men),
    guns,
    reserveGuns: Math.max(0, cannon - guns),
  };
}

export function playerReloadTime(crewMorale) {
  const value = clamp(Math.trunc(crewMorale / 2) + 4, 0, 16);
  return Math.abs(144 - 8 * value);
}

export function enemyReloadTime(kind) {
  return Math.abs(144 - 8 * kind);
}

export function gunnerySkill(difficulty, hasGunnery, extra = 0) {
  return clamp(difficulty + extra - (hasGunnery ? 1 : 0), 0, 4);
}

export function battleDistance(dx, dy) {
  const major = Math.max(Math.abs(dx), Math.abs(dy));
  const minor = Math.min(Math.abs(dx), Math.abs(dy));
  return Math.max(16, major + Math.floor(minor / 4));
}

// `enemySkill` is your gunnery skill, passed only for the enemy's ship: when
// his signed table value equals it he uses one less (0x8BA0, quirk 19).
// DELIBERATE DEVIATION (quirk 18): the original reads your ship's table value
// unsigned (0x7FBB), so a square-rigger's −1 dead upwind becomes 255 and top
// speed 40. The port reads it signed for both ships, so you stop there too.
export function battleSpeed({ heading, wind, speedRow, type, damage = 0, sails = 'battle', windStrength = 0, fort = false, enemySkill = null }) {
  let tableValue = speedRow[relativeHeadingSector(heading, wind)];
  if (enemySkill !== null && tableValue === enemySkill) tableValue -= 1;
  let speed = 4 * tableValue - Math.floor(damage / 4);
  if (sails === 'full') speed = Math.trunc(speed * 3 / 2);
  const windClass = Math.floor((type + 2) / 4);
  // 0x9C5E returns 0 below 1, so a ship into the wind or badly damaged stops;
  // the original's downwind-drift branch (0x8045) and −12 clamp never run.
  const divisor = 8 - windClass * windStrength;
  speed = 8 * speed < divisor ? 0 : Math.min(40, Math.floor((8 * speed) / divisor));
  return fort ? Math.trunc(speed / 2) : speed;
}

export function bearingByte(dx, dy) {
  return (Math.round(Math.atan2(dx, -dy) * 256 / (Math.PI * 2)) + 256) & 0xff;
}

export function signedAngleDifference(target, current) {
  return ((target - current + 128) & 0xff) - 128;
}

export function beamDifference(shooter, target) {
  const bearing = bearingByte(target.x - shooter.x, target.y - shooter.y);
  const port = Math.abs(signedAngleDifference(bearing, (shooter.heading - 64) & 0xff));
  const starboard = Math.abs(signedAngleDifference(bearing, (shooter.heading + 64) & 0xff));
  return Math.min(port, starboard);
}

export function damageLevel(damage) {
  return ['', 'Sail damage', 'Lost a mast', 'Hull leaking', 'Ship sinking'][clamp(Math.floor(damage / 16), 0, 4)];
}

export function applyCannonHit(target, shooterGuns, { playerShot = false, skill = 4, rng }) {
  let hull = Math.max(1, Math.floor((4 * shooterGuns) / (target.type + 2)));
  if (target.sails === 'battle') hull = Math.floor(hull / 2);
  hull = Math.max(1, hull);
  if (playerShot && skill === 0) hull += Math.floor(hull / 2);
  const men = Math.floor((4 * Math.floor((target.men * shooterGuns) / (target.type + 3)) + rng.int(64)) / 64);
  const guns = Math.floor((Math.floor((4 * target.guns * shooterGuns) / (target.type + 3)) + rng.int(64)) / 64);
  return {
    ...target,
    damage: target.damage + hull,
    men: Math.max(playerShot ? 0 : 1, target.men - men),
    guns: Math.max(0, target.guns - guns),
  };
}

export function comparisonScore(player, enemy) {
  const score = (one, two) => Number(one) + Number(two);
  const enemyStrength = enemy.men * enemy.kind / 8;
  return {
    damage: score(player.damage / 2 + 1 > enemy.damage, 2 * player.damage > enemy.damage),
    guns: score(player.guns / 2 + 1 < enemy.guns, 2 * player.guns < enemy.guns),
    men: score(player.men / 2 + 1 < enemyStrength, 2 * player.men < enemyStrength),
  };
}

export function chooseEnemyTactic(player, enemy) {
  const score = comparisonScore(player, enemy);
  return enemyTacticForScores(score.damage, score.guns, score.men);
}

export function enemyTacticForScores(damage, guns, men) {
  return TACTICS[9 * damage + 3 * guns + men];
}

export function hitBox(ship) {
  if (ship.fort) return { halfWidth: FORT_HIT_HALF_SIZE, halfHeight: FORT_HIT_HALF_SIZE };
  return { halfWidth: BATTLE_HIT_HALF_WIDTH[ship.type], halfHeight: BATTLE_HIT_HALF_HEIGHT[ship.type] };
}

// Ship positions here are box centres. The original stores the sprite corner
// and adds a centre offset (40, 30 for ships, 16 for the fort) in every test,
// so the comparisons come out the same. Tests use the whole-pixel part of the
// 24.8 position (`shr eax, 8`).
function pixel(value) {
  return Math.floor(value);
}

// The two boxes, each half-size scaled the way the original shifts it, overlap
// on both axes. Edges count as overlapping (`jl` / `jg`).
function boxesOverlap(first, second, scaleHalf, { secondWhole = false } = {}) {
  const one = hitBox(first);
  const two = hitBox(second);
  const reachX = scaleHalf(one.halfWidth) + (secondWhole ? two.halfWidth : scaleHalf(two.halfWidth));
  const reachY = scaleHalf(one.halfHeight) + (secondWhole ? two.halfHeight : scaleHalf(two.halfHeight));
  return Math.abs(pixel(first.x) - pixel(second.x)) <= reachX
    && Math.abs(pixel(first.y) - pixel(second.y)) <= reachY;
}

// Boarding contact (0x9C84): a quarter of each half-size. In a fort battle the
// fort's box is used whole.
export function shipsTouch(player, enemy) {
  return boxesOverlap(player, enemy, (half) => half >> 2, { secondWhole: Boolean(enemy.fort) });
}

// "Close enough to strike" (0x9D53): twice each half-size.
export function shipsCloseEnoughToStrike(player, enemy) {
  return boxesOverlap(player, enemy, (half) => half * 2);
}

export function canEnemyStrike(player, enemy) {
  const score = comparisonScore(player, enemy);
  return score.damage === 0 && score.guns === 0 && score.men === 0 && shipsCloseEnoughToStrike(player, enemy);
}

// Shot hit test. Your shots (0x9E38) test the enemy's box enlarged by skill:
// half + k·(half >> 2), k = 3, 2, 1, 1, 1 for skill 0–4. His shots (0x9EDA)
// test your exact box (pass no skill).
export function shotHitsShip({ x, y }, target, { skill = null } = {}) {
  const box = hitBox(target);
  const enlarge = (half) => (skill === null ? half : half + PLAYER_SHOT_BOX_STEPS[skill] * (half >> 2));
  return Math.abs(pixel(x) - pixel(target.x)) <= enlarge(box.halfWidth)
    && Math.abs(pixel(y) - pixel(target.y)) <= enlarge(box.halfHeight);
}

function initialShip({ name, x, y, heading, damage, men, guns, reloadTime, sails = 'battle' }) {
  const stats = SHIPS[name];
  return {
    name, type: stats.type, x, y, heading, damage, men, guns,
    reload: 0, reloadTime, sails, targetSails: sails, sailTransition: 0,
    groundedCooldown: 0, shotSplash: 0,
  };
}

export function createBattle({ player, enemy, flagshipIndex = 0, speedRows, difficulty, ability, crewMorale, playerFlag = 'pirate', rng }) {
  const embarked = embarkedForBattle({ ...player, flagshipIndex });
  const fleet = player.ships.map(shipRecord);
  const [selected] = fleet.splice(flagshipIndex, 1);
  fleet.unshift(selected);
  const windStrength = rng.int(3); // ASSUMED: encounter wind-strength source is not traced.
  return {
    frame: 0,
    noHitFrames: 0,
    wind: { direction: player.wind, strength: windStrength },
    terrain: 'open-sea',
    arena: { ...BATTLE_ASSUMPTIONS.arena },
    skill: gunnerySkill(difficulty, ability === 'gunnery', 0), // ASSUMED encounter extra = 0.
    speedRows,
    fleet,
    player: {
      ...initialShip({
        name: embarked.flagship.type, x: 170, y: 160, heading: 0,
        damage: embarked.flagship.damage, men: embarked.men, guns: embarked.guns,
        reloadTime: playerReloadTime(crewMorale),
      }),
      flag: playerFlag,
      reserveMen: embarked.reserveMen,
      reserveGuns: embarked.reserveGuns,
    },
    enemy: {
      ...initialShip({
        name: enemy.ship, x: 310, y: 160, heading: 0,
        damage: 0, men: 4 * enemy.crew, guns: enemy.guns,
        reloadTime: enemyReloadTime(enemy.kind),
      }),
      kind: enemy.kind,
      flag: enemy.flag,
      tactic: 'duel',
      wantedHeading: 0, // 0x9B2B: the starting heading
      aiCooldown: 0,
    },
    encounter: { ...enemy },
    projectiles: [], effects: [], event: null,
    assumptions: [
      'Wall-clock battle frame duration is assumed.',
      'Encounter gunnery extra is zero and wind strength is randomly chosen.',
    ],
  };
}

function requestSails(ship, sails) {
  if (ship.sails === sails || ship.targetSails === sails) return ship;
  return { ...ship, targetSails: sails, sailTransition: BATTLE_SAIL_TRANSITION_FRAMES };
}

function stepSails(ship) {
  if (ship.sailTransition <= 0) return ship;
  const sailTransition = ship.sailTransition - 1;
  return sailTransition === 0
    ? { ...ship, sailTransition, sails: ship.targetSails }
    : { ...ship, sailTransition };
}

function turnToward(current, target, amount) {
  const difference = signedAngleDifference(target, current);
  return (current + Math.sign(difference) * Math.min(Math.abs(difference), amount)) & 0xff;
}

function constrainedDownwindCourse(course, wind) {
  const difference = signedAngleDifference(course, wind);
  return Math.abs(difference) <= 80 ? course : (wind + Math.sign(difference) * 80) & 0xff;
}

// Wanted heading (0x8A5D-0x8B21), recomputed with the tactic every 64 frames.
// Close and flee courses are clamped to within 80 units of downwind. A duel
// course takes the beam nearer the current heading, then switches to the other
// beam if that one lies more than 95 units from downwind (within about 46° of
// the wind), so a dueller never heads into the wind. The result is truncated
// to a multiple of 16. The rules are the same for every ship type; only the
// turn rate differs.
export function enemyWantedHeading({ bearing, heading, wind, tactic }) {
  let target;
  if (tactic === 'close') target = constrainedDownwindCourse(bearing, wind);
  else if (tactic === 'flee') target = constrainedDownwindCourse((bearing + 128) & 0xff, wind);
  else {
    target = (bearing + 64) & 0xff;
    if (Math.abs(signedAngleDifference(target, heading)) > 64) target = (target + 128) & 0xff;
    if (Math.abs(signedAngleDifference(target, wind)) > 95) target = (target + 128) & 0xff;
  }
  return target & 0xf0;
}

function aimEnemy(battle) {
  const { enemy, player } = battle;
  const bearing = bearingByte(player.x - enemy.x, player.y - enemy.y);
  return { ...enemy, wantedHeading: enemyWantedHeading({ bearing, heading: enemy.heading, wind: battle.wind.direction, tactic: enemy.tactic }) };
}

function steerEnemy(enemy) {
  const rate = 3 - Math.floor((enemy.type + 2) / 4);
  return { ...enemy, heading: turnToward(enemy.heading, enemy.wantedHeading, rate) };
}

// Movement (0x8077 you, the same for him): the 24.8 position moves by
// 4·sin(heading, s) and −4·cos(heading, s) per frame, about s/64 pixels. The
// steps are multiples of 1/256, so plain numbers hold the 24.8 value exactly.
export function moveShip(ship, battle, { enemySkill = null } = {}) {
  const speed = battleSpeed({
    heading: ship.heading, wind: battle.wind.direction,
    speedRow: battle.speedRows[ship.name], type: ship.type,
    damage: ship.damage, sails: ship.sails, windStrength: battle.wind.strength,
    enemySkill,
  });
  return {
    ...ship,
    x: ship.x + 4 * sinScaled(ship.heading, speed) / 256,
    y: ship.y - 4 * cosScaled(ship.heading, speed) / 256,
    speed,
  };
}

function recenterOpenSea(battle) {
  if (battle.terrain !== 'open-sea') return battle;
  const midpointX = (battle.player.x + battle.enemy.x) / 2;
  const midpointY = (battle.player.y + battle.enemy.y) / 2;
  // Whole-pixel shifts keep positions on the 24.8 grid.
  const shiftX = midpointX < 120 || midpointX > battle.arena.width - 120
    ? Math.round(battle.arena.width / 2 - midpointX) : 0;
  const shiftY = midpointY < 80 || midpointY > battle.arena.height - 80
    ? Math.round(battle.arena.height / 2 - midpointY) : 0;
  if (shiftX === 0 && shiftY === 0) return battle;
  const shiftPoint = (point) => ({ ...point, x: point.x + shiftX, y: point.y + shiftY });
  return {
    ...battle,
    player: shiftPoint(battle.player),
    enemy: shiftPoint(battle.enemy),
    projectiles: battle.projectiles.map((shot) => ({
      ...shiftPoint(shot), landingX: shot.landingX + shiftX, landingY: shot.landingY + shiftY,
    })),
    effects: battle.effects.map(shiftPoint),
  };
}

function shotOut(battle, owner) {
  return battle[owner].shotSplash > 0 || battle.projectiles.some((shot) => shot.owner === owner);
}

function fire(shooter, target, owner, battle) {
  if (shooter.reload > 0 || shooter.guns <= 0 || shotOut(battle, owner)) return battle;
  const targetBearing = bearingByte(target.x - shooter.x, target.y - shooter.y);
  const port = (shooter.heading - 64) & 0xff;
  const starboard = (shooter.heading + 64) & 0xff;
  const firingAngle = Math.abs(signedAngleDifference(targetBearing, port)) < Math.abs(signedAngleDifference(targetBearing, starboard)) ? port : starboard;
  const distance = battleDistance(target.x - shooter.x, target.y - shooter.y);
  const radians = firingAngle / 256 * Math.PI * 2;
  const projectile = {
    owner, x: shooter.x, y: shooter.y,
    landingX: shooter.x + Math.sin(radians) * distance,
    landingY: shooter.y - Math.cos(radians) * distance,
    remaining: Math.max(1, Math.floor(distance / 2)), total: Math.max(1, Math.floor(distance / 2)),
    guns: shooter.guns,
  };
  return {
    ...battle,
    [owner]: { ...shooter, reload: shooter.reloadTime },
    projectiles: [...battle.projectiles, projectile],
    effects: [...battle.effects, { kind: 'smoke', x: shooter.x, y: shooter.y, life: 18 }],
  };
}

function landProjectiles(battle, rng) {
  let next = battle;
  const flying = [];
  for (const projectile of battle.projectiles) {
    if (projectile.remaining > 1) {
      flying.push({ ...projectile, remaining: projectile.remaining - 1 });
      continue;
    }
    const targetKey = projectile.owner === 'player' ? 'enemy' : 'player';
    const target = next[targetKey];
    const hit = shotHitsShip(
      { x: projectile.landingX, y: projectile.landingY }, target,
      { skill: projectile.owner === 'player' ? next.skill : null },
    );
    next = { ...next, [projectile.owner]: { ...next[projectile.owner], shotSplash: BATTLE_SHOT_SPLASH_FRAMES } };
    const effect = { kind: hit ? 'hit' : 'splash', x: projectile.landingX, y: projectile.landingY, life: 24 };
    next = { ...next, effects: [...next.effects, effect] };
    if (hit) {
      next = {
        ...next,
        [targetKey]: applyCannonHit(target, projectile.guns, { playerShot: projectile.owner === 'player', skill: next.skill, rng }),
        noHitFrames: 0,
      };
    }
  }
  return { ...next, projectiles: flying };
}

function shiftBattleWind(wind, rng) {
  const directionSteps = [-16, 0, 16, 32];
  const strengthSteps = [-1, 0, 0, 1];
  return {
    direction: (wind.direction + directionSteps[rng.int(4)]) & 0xff,
    strength: clamp(wind.strength + strengthSteps[rng.int(4)], 0, 2),
  };
}

function terminalEvent(battle) {
  if (battle.player.damage >= 64) return 'player-sunk';
  if (battle.enemy.damage >= 64) return 'enemy-sunk';
  if (shipsTouch(battle.player, battle.enemy)) return 'boarding';
  if (Math.abs(battle.player.x - battle.enemy.x) > 240 || Math.abs(battle.player.y - battle.enemy.y) > 240) return 'escaped';
  if (battle.noHitFrames >= BATTLE_SUNSET_FRAMES) return 'sunset';
  return null;
}

function countDown(ship) {
  return {
    ...ship,
    reload: Math.max(0, ship.reload - 1),
    shotSplash: Math.max(0, (ship.shotSplash ?? 0) - 1),
  };
}

export function stepBattle(original, input, rng) {
  if (original.event) return original;
  let battle = {
    ...original,
    frame: original.frame + 1,
    noHitFrames: original.noHitFrames + 1,
    effects: original.effects.map((effect) => ({ ...effect, life: effect.life - 1 })).filter((effect) => effect.life > 1),
    player: stepSails(countDown(original.player)),
    enemy: stepSails(countDown(original.enemy)),
  };

  if (input.raiseSailsPressed) battle.player = requestSails(battle.player, 'full');
  if (input.lowerSailsPressed) battle.player = requestSails(battle.player, 'battle');
  if (input.turn && battle.frame % PLAYER_RUDDER_INTERVAL === 0) {
    battle.player = { ...battle.player, heading: (battle.player.heading + input.turn * PLAYER_RUDDER_STEP) & 0xff };
  }

  if (battle.frame % 64 === 0) {
    if (canEnemyStrike(battle.player, battle.enemy)) return { ...battle, event: 'enemy-struck' };
    battle.enemy = { ...battle.enemy, tactic: chooseEnemyTactic(battle.player, battle.enemy) };
    battle.enemy = requestSails(battle.enemy, battle.enemy.tactic === 'duel' ? 'battle' : 'full');
    battle.enemy = aimEnemy(battle);
  }
  if (battle.frame % 8 === 0) battle.enemy = steerEnemy(battle.enemy);

  if (input.firePressed) battle = fire(battle.player, battle.enemy, 'player', battle);
  // 0x8EDF: he fires whenever he is loaded, has guns, has no ball out, and you
  // are less than 6 units off either beam (0x8F6E `cmp ax,6; jge`), whatever
  // his tactic.
  if (beamDifference(battle.enemy, battle.player) < 6) {
    battle = fire(battle.enemy, battle.player, 'enemy', battle);
  }

  battle = {
    ...battle,
    player: moveShip(battle.player, battle),
    enemy: moveShip(battle.enemy, battle, { enemySkill: battle.skill }),
  };
  battle = recenterOpenSea(battle);
  battle = landProjectiles(battle, rng);
  if (battle.frame % BATTLE_WIND_SHIFT_FRAMES === 0) battle = { ...battle, wind: shiftBattleWind(battle.wind, rng) };
  const event = terminalEvent(battle);
  return event ? { ...battle, event } : battle;
}
