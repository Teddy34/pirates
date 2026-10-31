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
  movementDivisor: 16,
  arena: { width: 480, height: 320 },
});

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

export function battleSpeed({ heading, wind, speedRow, type, damage = 0, sails = 'battle', windStrength = 0, fort = false }) {
  let speed = 4 * speedRow[relativeHeadingSector(heading, wind)] - Math.floor(damage / 4);
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

export function shipsTouch(first, second) {
  const firstRadius = 7 + first.type;
  const secondRadius = 7 + second.type;
  return Math.hypot(first.x - second.x, first.y - second.y) <= firstRadius + secondRadius;
}

export function canEnemyStrike(player, enemy) {
  const score = comparisonScore(player, enemy);
  const closeDistance = 2 * ((7 + player.type) + (7 + enemy.type));
  return score.damage === 0 && score.guns === 0 && score.men === 0
    && Math.hypot(player.x - enemy.x, player.y - enemy.y) <= closeDistance;
}

function initialShip({ name, x, y, heading, damage, men, guns, reloadTime, sails = 'battle' }) {
  const stats = SHIPS[name];
  return {
    name, type: stats.type, x, y, heading, damage, men, guns,
    reload: 0, reloadTime, sails, targetSails: sails, sailTransition: 0,
    groundedCooldown: 0,
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
      'Ship collision dimensions are assumed.',
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

function moveShip(ship, battle) {
  const speed = battleSpeed({
    heading: ship.heading, wind: battle.wind.direction,
    speedRow: battle.speedRows[ship.name], type: ship.type,
    damage: ship.damage, sails: ship.sails, windStrength: battle.wind.strength,
  });
  const angle = ship.heading / 256 * Math.PI * 2;
  const distance = speed / BATTLE_ASSUMPTIONS.movementDivisor;
  return { ...ship, x: ship.x + Math.sin(angle) * distance, y: ship.y - Math.cos(angle) * distance, speed };
}

function recenterOpenSea(battle) {
  if (battle.terrain !== 'open-sea') return battle;
  const midpointX = (battle.player.x + battle.enemy.x) / 2;
  const midpointY = (battle.player.y + battle.enemy.y) / 2;
  const shiftX = midpointX < 120 || midpointX > battle.arena.width - 120
    ? battle.arena.width / 2 - midpointX : 0;
  const shiftY = midpointY < 80 || midpointY > battle.arena.height - 80
    ? battle.arena.height / 2 - midpointY : 0;
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

function fire(shooter, target, owner, battle) {
  if (shooter.reload > 0 || shooter.guns <= 0) return battle;
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

function pointHitsShip(projectile, target, enlargement) {
  const dx = projectile.landingX - target.x;
  const dy = projectile.landingY - target.y;
  const radians = -target.heading / 256 * Math.PI * 2;
  const localX = dx * Math.cos(radians) - dy * Math.sin(radians);
  const localY = dx * Math.sin(radians) + dy * Math.cos(radians);
  const halfWidth = (4 + target.type * .45) * enlargement;
  const halfLength = (8 + target.type * .7) * enlargement;
  return Math.abs(localX) <= halfWidth && Math.abs(localY) <= halfLength;
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
    const enlargement = projectile.owner === 'player' ? 1 + [3, 2, 1, 1, 1][next.skill] / 4 : 1;
    const hit = pointHitsShip(projectile, target, enlargement);
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

export function stepBattle(original, input, rng) {
  if (original.event) return original;
  let battle = {
    ...original,
    frame: original.frame + 1,
    noHitFrames: original.noHitFrames + 1,
    effects: original.effects.map((effect) => ({ ...effect, life: effect.life - 1 })).filter((effect) => effect.life > 1),
    player: stepSails({ ...original.player, reload: Math.max(0, original.player.reload - 1) }),
    enemy: stepSails({ ...original.enemy, reload: Math.max(0, original.enemy.reload - 1) }),
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
  if (battle.enemy.tactic === 'duel' && beamDifference(battle.enemy, battle.player) <= 6) {
    battle = fire(battle.enemy, battle.player, 'enemy', battle);
  }

  battle = { ...battle, player: moveShip(battle.player, battle), enemy: moveShip(battle.enemy, battle) };
  battle = recenterOpenSea(battle);
  battle = landProjectiles(battle, rng);
  if (battle.frame % BATTLE_WIND_SHIFT_FRAMES === 0) battle = { ...battle, wind: shiftBattleWind(battle.wind, rng) };
  const event = terminalEvent(battle);
  return event ? { ...battle, event } : battle;
}
