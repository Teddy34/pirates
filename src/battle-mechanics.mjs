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
// Each ship has one shot counter (0x44A02 you, 0x44A40 him) and fires only
// when it is 0 (0x8284, 0x8EDF). Firing sets it to −n, n = distance/2
// (0x8395, 0x9029); every later frame moves the ball and adds 1, and the ball
// lands when it reaches 0 (0x85B0, 0x923B), n frames after firing. The counter
// is then 1 and counts up through the splash; at 39 it clears (0x84EC, 0x9177).
// So a ship can fire again 39 frames after its ball lands.
export const BATTLE_SHOT_SPLASH_END = 39;
// The ball moves 4·sin(direction, 128) per axis per frame in 24.8, about two
// pixels (0x854A, 0x91D5).
const BALL_SPEED = 128;

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

// Ship-battle placement (0x9A79-0x9BD4). For each axis r = rnd, the offset is
// 32 + (r & 15), negated when r & 0x80; you sit at centre + offset and he at
// centre − offset, so he is always 64-94 px off on both axes. His wanted
// heading is a random byte (0x9B2B); you point at him in one of eight
// directions; his heading is yours − 96 + (rnd & 31) − 16. The original centre
// is pixel 240 of its battle map; the port uses its arena's centre.
export function initialPlacement(arena, rng) {
  const offset = () => {
    const r = rng.int(256);
    const value = 32 + (r & 15);
    return r & 0x80 ? -value : value;
  };
  const offsetX = offset();
  const offsetY = offset();
  const player = { x: arena.width / 2 + offsetX, y: arena.height / 2 + offsetY };
  const enemy = { x: arena.width / 2 - offsetX, y: arena.height / 2 - offsetY };
  const wantedHeading = rng.int(256);
  let heading;
  if (player.x > enemy.x) heading = player.y === enemy.y ? 0xc0 : player.y > enemy.y ? 0xe0 : 0xa0;
  else heading = player.y === enemy.y ? 0x40 : player.y > enemy.y ? 0x20 : 0x60;
  const enemyHeading = (heading + (rng.int(256) & 31) - 16 - 0x60) & 0xff;
  return {
    player: { ...player, heading },
    enemy: { ...enemy, heading: enemyHeading, wantedHeading },
  };
}

function initialShip({ name, x, y, heading, damage, men, guns, reloadTime, sails = 'battle' }) {
  const stats = SHIPS[name];
  return {
    name, type: stats.type, x, y, heading, damage, men, guns,
    reload: 0, reloadTime, sails, targetSails: sails, sailTransition: 0,
    groundedCooldown: 0, shotTimer: 0,
  };
}

export function createBattle({ player, enemy, flagshipIndex = 0, speedRows, difficulty, ability, crewMorale, playerFlag = 'pirate', rng }) {
  const embarked = embarkedForBattle({ ...player, flagshipIndex });
  const fleet = player.ships.map(shipRecord);
  const [selected] = fleet.splice(flagshipIndex, 1);
  fleet.unshift(selected);
  const windStrength = rng.int(3); // ASSUMED: encounter wind-strength source is not traced.
  const placement = initialPlacement(BATTLE_ASSUMPTIONS.arena, rng);
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
        name: embarked.flagship.type, ...placement.player,
        damage: embarked.flagship.damage, men: embarked.men, guns: embarked.guns,
        reloadTime: playerReloadTime(crewMorale),
      }),
      flag: playerFlag,
      reserveMen: embarked.reserveMen,
      reserveGuns: embarked.reserveGuns,
    },
    enemy: {
      ...initialShip({
        name: enemy.ship, x: placement.enemy.x, y: placement.enemy.y, heading: placement.enemy.heading,
        damage: 0, men: 4 * enemy.crew, guns: enemy.guns,
        reloadTime: enemyReloadTime(enemy.kind),
      }),
      kind: enemy.kind,
      flag: enemy.flag,
      tactic: 'duel',
      wantedHeading: placement.enemy.wantedHeading,
      aiCooldown: 0,
    },
    encounter: { ...enemy },
    projectiles: [], effects: [], event: null, frameEvent: 0,
    assumptions: [
      'Wall-clock battle frame duration is assumed.',
      'Encounter gunnery extra is zero and wind strength is randomly chosen.',
    ],
  };
}

// Your sails and reload (0x7EE3-0x7F82). While a sail change runs, its timer
// counts down and the reload doesn't; the frame a change is asked for starts
// the 160-frame timer and doesn't count the reload either. A request during a
// change is ignored. Otherwise the reload counts down, and if it reaches 0
// while your ball is out it is held at 1 (0x7F82), so the guns read loaded
// only when you can fire.
export function stepPlayerSailsAndReload(ship, requestedSails = null) {
  if (ship.sailTransition > 0) {
    const sailTransition = ship.sailTransition - 1;
    return sailTransition === 0
      ? { ...ship, sailTransition, sails: ship.targetSails }
      : { ...ship, sailTransition };
  }
  if (requestedSails && requestedSails !== ship.sails) {
    return { ...ship, targetSails: requestedSails, sailTransition: BATTLE_SAIL_TRANSITION_FRAMES };
  }
  if (ship.reload <= 0) return ship;
  const reload = ship.reload - 1;
  return { ...ship, reload: reload === 0 && ship.shotTimer !== 0 ? 1 : reload };
}

// His reload counts down every frame (0x8729). His sails change at once when
// his tactic is set (0x8A57): full to close or flee, battle sails to duel,
// unless an event code was already set earlier in the frame (0x8A25).
function stepEnemyReload(ship) {
  return { ...ship, reload: Math.max(0, ship.reload - 1) };
}

// What the HUD shows for a ship's guns, and whether the fire command works.
export function broadsideState(ship) {
  if (ship.guns <= 0) return { ready: false, label: 'Disarmed' };
  if (ship.shotTimer < 0) return { ready: false, label: 'Ball in flight' };
  if (ship.shotTimer > 0) return { ready: false, label: 'Ball landing' };
  if (ship.reload > 0) return { ready: false, label: `Reload ${ship.reload}` };
  return { ready: true, label: 'Loaded' };
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
    projectiles: battle.projectiles.map(shiftPoint),
    effects: battle.effects.map(shiftPoint),
  };
}

// Broadside direction (0x82EB you, 0x8F86 him): heading + 64·sign(a), where
// `a` is the signed byte of your heading minus his bearing to you, or of that
// bearing minus his heading. So you fire forward when he is dead astern and
// to port when he is dead ahead; he fires forward at you dead ahead and to
// port when you are dead astern.
export function broadsideDirection(owner, shooterHeading, bearingEnemyToPlayer) {
  const difference = owner === 'player'
    ? signedAngleDifference(shooterHeading, bearingEnemyToPlayer)
    : signedAngleDifference(bearingEnemyToPlayer, shooterHeading);
  return (shooterHeading + 64 * Math.sign(difference)) & 0xff;
}

function fire(shooter, target, owner, battle) {
  if (shooter.shotTimer !== 0 || shooter.reload > 0 || shooter.guns <= 0) return battle;
  const enemyToPlayer = owner === 'player'
    ? bearingByte(shooter.x - target.x, shooter.y - target.y)
    : bearingByte(target.x - shooter.x, target.y - shooter.y);
  const direction = broadsideDirection(owner, shooter.heading, enemyToPlayer);
  const frames = Math.floor(battleDistance(target.x - shooter.x, target.y - shooter.y) / 2);
  // The ball starts from the whole-pixel position ((0x449DA + 0x449C0) << 8).
  const projectile = { owner, x: Math.floor(shooter.x), y: Math.floor(shooter.y), direction, remaining: frames, total: frames };
  return {
    ...battle,
    [owner]: { ...shooter, reload: shooter.reloadTime, shotTimer: -frames },
    projectiles: [...battle.projectiles, projectile],
    effects: [...battle.effects, { kind: 'smoke', x: shooter.x, y: shooter.y, life: 18 }],
  };
}

// One frame of a ship's shot when it didn't fire this frame: count the splash
// up, or move the ball and land it when its counter reaches 0. A landing ball
// is tested where it is. The damage uses the shooter's guns at that moment
// (0x85C4, 0x924F).
function advanceShot(battle, owner, rng) {
  const shooter = battle[owner];
  if (shooter.shotTimer === 0) return battle;
  if (shooter.shotTimer > 0) {
    const shotTimer = shooter.shotTimer + 1;
    return { ...battle, [owner]: { ...shooter, shotTimer: shotTimer === BATTLE_SHOT_SPLASH_END ? 0 : shotTimer } };
  }
  const projectile = battle.projectiles.find((shot) => shot.owner === owner);
  const moved = {
    ...projectile,
    x: projectile.x + 4 * sinScaled(projectile.direction, BALL_SPEED) / 256,
    y: projectile.y - 4 * cosScaled(projectile.direction, BALL_SPEED) / 256,
    remaining: projectile.remaining - 1,
  };
  const others = battle.projectiles.filter((shot) => shot !== projectile);
  const shotTimer = shooter.shotTimer + 1;
  if (shotTimer < 0) return { ...battle, [owner]: { ...shooter, shotTimer }, projectiles: [...others, moved] };
  const targetKey = owner === 'player' ? 'enemy' : 'player';
  const target = battle[targetKey];
  const hit = shotHitsShip(moved, target, { skill: owner === 'player' ? battle.skill : null });
  let next = {
    ...battle,
    [owner]: { ...shooter, shotTimer: 1 },
    projectiles: others,
    effects: [...battle.effects, { kind: hit ? 'hit' : 'splash', x: moved.x, y: moved.y, life: 24 }],
  };
  if (hit) {
    next = {
      ...next,
      [targetKey]: applyCannonHit(target, shooter.guns, { playerShot: owner === 'player', skill: battle.skill, rng }),
      noHitFrames: 0,
      frameEvent: BATTLE_EVENT.hit,
    };
    // Your hit turns him downwind: his wanted heading becomes the wind (0x8650).
    if (owner === 'player') next.enemy = { ...next.enemy, wantedHeading: next.wind.direction };
  }
  return next;
}

// Fire if asked and able (only with the counter at 0), else advance the shot.
// Your broadside sets event 1 (0x83E1); his sets none.
function stepShot(battle, owner, wantsFire, rng) {
  const target = battle[owner === 'player' ? 'enemy' : 'player'];
  if (battle[owner].shotTimer !== 0) return advanceShot(battle, owner, rng);
  if (!wantsFire) return battle;
  const next = fire(battle[owner], target, owner, battle);
  return owner === 'player' && next !== battle ? { ...next, frameEvent: BATTLE_EVENT.fired } : next;
}

// The battle wind (0x87F6, every 512 frames): the direction moves by −16, 0,
// +16 or +32; only if it changed, the strength moves by (rnd(4) − 1) >> 1,
// that is −1, 0, 0 or +1, kept to 0–2, and event 4 is set.
export function shiftBattleWind(wind, rng) {
  const direction = (wind.direction + 16 * (rng.int(4) - 1)) & 0xff;
  if (direction === wind.direction) return { wind, changed: false };
  const strength = clamp(wind.strength + ((rng.int(4) - 1) >> 1), 0, 2);
  return { wind: { direction, strength }, changed: true };
}

// The engine keeps one event code per frame (0x44A12): it is cleared at the
// start of the frame (0x7DEF), each event overwrites it, and the frame ends
// the engine's run if it is set (0x9433). The battle driver then shows a
// message for 1, 2, 4, 10, 11 and 12; checks the damage levels for 7, yours
// first (0xEBD7: −1 if you sink, then −2 if he does); and ends the battle on
// 5, 6, 8, 9 and 13 (0xEF06, table 0x33030). So the last event of a frame
// wins: a strike (9) on a frame where your ball sank him earlier makes him
// strike rather than explode, his hit on you after your boarding contact makes
// that frame a hit, and a sinking whose hit is overwritten that frame waits for
// the next hit, as in the original.
export const BATTLE_EVENT = Object.freeze({
  fired: 1, loaded: 2, wind: 4, contact: 5, outOfRange: 6, hit: 7, sunset: 8,
  struck: 9, sailStart: 10, sailDone: 11, enemySails: 12,
});

export function frameOutcome(code, battle) {
  if (code === BATTLE_EVENT.hit) {
    if (battle.player.damage >= 64) return 'player-sunk';
    if (battle.enemy.damage >= 64) return 'enemy-sunk';
    return null;
  }
  return {
    [BATTLE_EVENT.contact]: 'boarding',
    [BATTLE_EVENT.outOfRange]: 'escaped',
    [BATTLE_EVENT.sunset]: 'sunset',
    [BATTLE_EVENT.struck]: 'enemy-struck',
  }[code] ?? null;
}

// Frame order follows the engine: the sunset count, your rudder, sails and
// reload, movement and shot (0x7E22-0x8729); then his reload, boarding
// contact, the wind, separation, his captain, movement and shot
// (0x8729-0x938C).
export function stepBattle(original, input, rng) {
  if (original.event) return original;
  let battle = {
    ...original,
    frame: original.frame + 1,
    noHitFrames: original.noHitFrames + 1,
    frameEvent: 0,
    effects: original.effects.map((effect) => ({ ...effect, life: effect.life - 1 })).filter((effect) => effect.life > 1),
  };
  const setEvent = (code) => { battle = { ...battle, frameEvent: code }; };
  // 0x7E38: `cmp 0x44A16, 0x1194; jle`, so the sun sets after 4,501 frames.
  if (battle.noHitFrames > BATTLE_SUNSET_FRAMES) setEvent(BATTLE_EVENT.sunset);

  if (input.turn && battle.frame % PLAYER_RUDDER_INTERVAL === 0) {
    battle.player = { ...battle.player, heading: (battle.player.heading + input.turn * PLAYER_RUDDER_STEP) & 0xff };
  }
  const requestedSails = input.raiseSailsPressed ? 'full' : input.lowerSailsPressed ? 'battle' : null;
  const before = battle.player;
  battle.player = stepPlayerSailsAndReload(battle.player, requestedSails);
  if (before.sailTransition === 0 && battle.player.sailTransition > 0) setEvent(BATTLE_EVENT.sailStart);
  else if (before.sailTransition > 0 && battle.player.sailTransition === 0) setEvent(BATTLE_EVENT.sailDone);
  else if (before.reload > 0 && battle.player.reload === 0) setEvent(BATTLE_EVENT.loaded);
  battle.player = moveShip(battle.player, battle);
  battle = stepShot(battle, 'player', Boolean(input.firePressed), rng);

  battle.enemy = stepEnemyReload(battle.enemy);
  if (shipsTouch(battle.player, battle.enemy)) setEvent(BATTLE_EVENT.contact);
  if (battle.frame % BATTLE_WIND_SHIFT_FRAMES === 0) {
    const shifted = shiftBattleWind(battle.wind, rng);
    battle = { ...battle, wind: shifted.wind };
    if (shifted.changed) setEvent(BATTLE_EVENT.wind);
  }
  if (Math.abs(battle.player.x - battle.enemy.x) > 240 || Math.abs(battle.player.y - battle.enemy.y) > 240) {
    setEvent(BATTLE_EVENT.outOfRange);
  }
  if (battle.frame % 64 === 0) {
    if (canEnemyStrike(battle.player, battle.enemy)) setEvent(BATTLE_EVENT.struck);
    const tactic = chooseEnemyTactic(battle.player, battle.enemy);
    battle.enemy = { ...battle.enemy, tactic };
    if (battle.frameEvent === 0) {
      const sails = tactic === 'duel' ? 'battle' : 'full';
      if (sails !== battle.enemy.sails) setEvent(BATTLE_EVENT.enemySails);
      battle.enemy = { ...battle.enemy, sails, targetSails: sails };
    }
    battle.enemy = aimEnemy(battle);
  }
  if (battle.frame % 8 === 0) battle.enemy = steerEnemy(battle.enemy);
  battle.enemy = moveShip(battle.enemy, battle, { enemySkill: battle.skill });
  // 0x8EDF: he fires whenever he is loaded, has guns, has no ball out, and you
  // are less than 6 units off either beam (0x8F6E `cmp ax,6; jge`), whatever
  // his tactic.
  battle = stepShot(battle, 'enemy', beamDifference(battle.enemy, battle.player) < 6, rng);

  battle = recenterOpenSea(battle);
  const event = frameOutcome(battle.frameEvent, battle);
  return event ? { ...battle, event } : battle;
}
