import { SHIPS } from './data.mjs';
import { clamp, relativeHeadingSector } from './mechanics.mjs';
import { PIXEL, pixelClassAt } from './world-map.mjs';

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
export function battleSpeed({ heading, wind, speedRow, type, damage = 0, sails = 'battle', windStrength = 0, enemySkill = null }) {
  let tableValue = speedRow[relativeHeadingSector(heading, wind)];
  if (enemySkill !== null && tableValue === enemySkill) tableValue -= 1;
  let speed = 4 * tableValue - Math.floor(damage / 4);
  if (sails === 'full') speed = Math.trunc(speed * 3 / 2);
  const windClass = Math.floor((type + 2) / 4);
  // 0x9C5E returns 0 below 1, so a ship into the wind or badly damaged stops;
  // the original's downwind-drift branch (0x8045) and −12 clamp never run.
  const divisor = 8 - windClass * windStrength;
  return 8 * speed < divisor ? 0 : Math.min(40, Math.floor((8 * speed) / divisor));
}

export function bearingByte(dx, dy) {
  return (Math.round(Math.atan2(dx, -dy) * 256 / (Math.PI * 2)) + 256) & 0xff;
}

export function signedAngleDifference(target, current) {
  return ((target - current + 128) & 0xff) - 128;
}

// Who opened the range when the ships part: each ship's speed along the line
// from him to you (headings: 0 north, 64 east; speed as moveShip uses it).
// True when your motion away from him is at least his motion away from you,
// so the escape is yours; false when he sailed off and you could not follow.
export function playerOpenedRange(battle) {
  const { player, enemy } = battle;
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const length = Math.hypot(dx, dy) || 1;
  const along = (ship) => {
    const angle = (ship.heading * Math.PI * 2) / 256;
    return (ship.speed ?? 0) * (Math.sin(angle) * dx - Math.cos(angle) * dy) / length;
  };
  const yoursAway = along(player);
  const hisAway = -along(enemy);
  return yoursAway >= hisAway;
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

// A fort is type 8, so its hits use divisors 10 and 11. Its hull hits go to
// a separate counter (0x8634) that skips the skill-0 bonus (0x8604).
export function applyCannonHit(target, shooterGuns, { playerShot = false, skill = 4, rng }) {
  let hull = Math.max(1, Math.floor((4 * shooterGuns) / (target.type + 2)));
  if (target.sails === 'battle') hull = Math.floor(hull / 2);
  hull = Math.max(1, hull);
  if (playerShot && skill === 0 && !target.fort) hull += Math.floor(hull / 2);
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
  // By the side he lies on, then the sign of your y offset from him
  // (less, level, greater).
  const headings = player.x > enemy.x ? [0xa0, 0xc0, 0xe0] : [0x60, 0x40, 0x20];
  const heading = headings[Math.sign(player.y - enemy.y) + 1];
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
    effects: [...battle.effects, ...gunSmoke(shooter, direction, battle.frame)],
  };
}

// Gun smoke (presentation only; the original's is not documented). A
// broadside leaves three puffs along the firing side of the hull, blown out
// from the gun ports; each frame the wind carries them downwind and their
// outward push dies away, until they thin out after SMOKE_LIFE_FRAMES.
// Battle pixels and frames; no random draws, so the battle's rng sequence is
// unchanged.
export const SMOKE_LIFE_FRAMES = 120;
const SMOKE_PUFFS = [-7, 0, 7]; // along the hull from the ship's centre
// From the centre line toward the guns: a ship's gun ports, or a fort's wall
// (its 44 px square, battle-renderer.mjs).
const SMOKE_OUT = 4;
const FORT_SMOKE_OUT = 24;
const SMOKE_PUSH = .7; // first outward speed, px per frame
const SMOKE_PUSH_DECAY = .9;
// Downwind drift by wind strength (light, medium, strong), px per frame.
export const SMOKE_DRIFT = Object.freeze([.15, .3, .45]);

function gunSmoke(shooter, direction, frame) {
  const out = [sinScaled(direction, 256) / 256, -cosScaled(direction, 256) / 256];
  const reach = shooter.fort ? FORT_SMOKE_OUT : SMOKE_OUT;
  const along = [sinScaled(shooter.heading, 256) / 256, -cosScaled(shooter.heading, 256) / 256];
  return SMOKE_PUFFS.map((offset, index) => ({
    kind: 'smoke',
    x: shooter.x + out[0] * reach + along[0] * offset,
    y: shooter.y + out[1] * reach + along[1] * offset,
    vx: out[0] * SMOKE_PUSH,
    vy: out[1] * SMOKE_PUSH,
    variant: (frame + index) % 3,
    // Staggered a little, so the puffs don't all fade on one frame.
    life: SMOKE_LIFE_FRAMES - 6 * index,
  }));
}

// One frame of a smoke puff: its push, the wind's drift, and the push easing.
export function driftSmoke(puff, wind) {
  const drift = SMOKE_DRIFT[wind.strength] ?? SMOKE_DRIFT[0];
  return {
    ...puff,
    x: puff.x + puff.vx + drift * sinScaled(wind.direction, 256) / 256,
    y: puff.y + puff.vy - drift * cosScaled(wind.direction, 256) / 256,
    vx: puff.vx * SMOKE_PUSH_DECAY,
    vy: puff.vy * SMOKE_PUSH_DECAY,
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
  struck: 9, sailStart: 10, sailDone: 11, enemySails: 12, beached: 13,
});

// The fort can't be sunk (sea_battles.md §8), so a hit only checks you.
export function frameOutcome(code, battle) {
  if (code === BATTLE_EVENT.hit) {
    if (battle.player.damage >= 64) return 'player-sunk';
    if (battle.enemy.damage >= 64 && !battle.enemy.fort) return 'enemy-sunk';
    return null;
  }
  return {
    [BATTLE_EVENT.contact]: battle.fort ? 'landed' : 'boarding',
    [BATTLE_EVENT.outOfRange]: 'escaped',
    [BATTLE_EVENT.sunset]: 'sunset',
    [BATTLE_EVENT.struck]: 'enemy-struck',
    [BATTLE_EVENT.beached]: 'beached',
  }[code] ?? null;
}

function requestedSails({ raiseSailsPressed, lowerSailsPressed }) {
  if (raiseSailsPressed) return 'full';
  if (lowerSailsPressed) return 'battle';
  return null;
}

// The event your sails or guns raise this frame, or 0.
function playerSailsEvent(before, after) {
  if (before.sailTransition === 0 && after.sailTransition > 0) return BATTLE_EVENT.sailStart;
  if (before.sailTransition > 0 && after.sailTransition === 0) return BATTLE_EVENT.sailDone;
  if (before.reload > 0 && after.reload === 0) return BATTLE_EVENT.loaded;
  return 0;
}

// Every 64 frames his captain may strike, picks a tactic, sets his sails to
// suit it (unless something else happened this frame) and takes aim.
// `battle` is this frame's working copy; returns it with any event set.
function enemyCaptainTurn(battle) {
  let next = battle;
  if (canEnemyStrike(next.player, next.enemy)) next = { ...next, frameEvent: BATTLE_EVENT.struck };
  const tactic = chooseEnemyTactic(next.player, next.enemy);
  next.enemy = { ...next.enemy, tactic };
  if (next.frameEvent === 0) {
    const sails = tactic === 'duel' ? 'battle' : 'full';
    if (sails !== next.enemy.sails) next = { ...next, frameEvent: BATTLE_EVENT.enemySails };
    next.enemy = { ...next.enemy, sails, targetSails: sails };
  }
  next.enemy = aimEnemy(next);
  return next;
}

// Frame order follows the engine: the sunset count, your rudder, sails and
// reload, movement and shot (0x7E22-0x8729); then his reload, boarding
// contact, the wind, separation, his captain, movement and shot
// (0x8729-0x938C).
export function stepBattle(original, input, rng) {
  if (original.event) return original;
  if (original.fort) return stepFortBattle(original, input, rng);
  let battle = stepPlayerHalf(original, input, rng);
  const setEvent = (code) => { battle = { ...battle, frameEvent: code }; };

  battle.enemy = stepEnemyReload(battle.enemy);
  if (shipsTouch(battle.player, battle.enemy)) setEvent(BATTLE_EVENT.contact);
  battle = stepBattleWind(battle, rng);
  if (Math.abs(battle.player.x - battle.enemy.x) > 240 || Math.abs(battle.player.y - battle.enemy.y) > 240) {
    setEvent(BATTLE_EVENT.outOfRange);
  }
  if (battle.frame % 64 === 0) battle = enemyCaptainTurn(battle);
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

// The frame's start and your half of it, the same in both kinds of battle:
// the sunset count, your rudder, sails and reload, movement and shot.
// DELIBERATE DEVIATION: the original halves your movement against a fort
// (`sar` at 0x809D and 0x80D9); the port keeps ship-battle speed so the
// forts' broadsides can be dodged.
function stepPlayerHalf(original, input, rng) {
  let battle = {
    ...original,
    frame: original.frame + 1,
    noHitFrames: original.noHitFrames + 1,
    frameEvent: 0,
    effects: original.effects
      .map((effect) => ({ ...(effect.kind === 'smoke' ? driftSmoke(effect, original.wind) : effect), life: effect.life - 1 }))
      .filter((effect) => effect.life > 1),
  };
  const setEvent = (code) => { battle = { ...battle, frameEvent: code }; };
  // 0x7E38: `cmp 0x44A16, 0x1194; jle`, so the sun sets after 4,501 frames.
  if (battle.noHitFrames > BATTLE_SUNSET_FRAMES) setEvent(BATTLE_EVENT.sunset);

  if (input.turn && battle.frame % PLAYER_RUDDER_INTERVAL === 0) {
    battle.player = { ...battle.player, heading: (battle.player.heading + input.turn * PLAYER_RUDDER_STEP) & 0xff };
  }
  const before = battle.player;
  battle.player = stepPlayerSailsAndReload(battle.player, requestedSails(input));
  const sailsEvent = playerSailsEvent(before, battle.player);
  if (sailsEvent) setEvent(sailsEvent);
  battle.player = moveShip(battle.player, battle);
  if (battle.fort) {
    // 0x81B6-0x8269: the map pixel under you. The port's landing zone
    // replaces the original's "touching the fort" test; see FORT_FIELD.
    const ground = fortFieldGround(battle.field, battle.player);
    if (ground === 'landing') setEvent(BATTLE_EVENT.contact);
    else if (ground === 'land') setEvent(BATTLE_EVENT.beached);
  }
  return stepShot(battle, 'player', Boolean(input.firePressed), rng);
}

function stepBattleWind(battle, rng) {
  if (battle.frame % BATTLE_WIND_SHIFT_FRAMES !== 0) return battle;
  const shifted = shiftBattleWind(battle.wind, rng);
  return { ...battle, wind: shifted.wind, frameEvent: shifted.changed ? BATTLE_EVENT.wind : battle.frameEvent };
}

// Attacking a fort from the sea (sea_battles.md §8, 0x18D67). Each fort is
// an enemy "ship" of type 8 that never moves, never strikes and runs no AI
// (0x891C). Its kind 0 gives a 144-frame reload.
//
// DELIBERATE DEVIATION: the original draws each town's fort battle on the
// town's own hand-made harbor map (map number at town record +0x1C, set at
// 0x18CC9), with the fort and your start tile and heading stored in the
// record (+0x22 to +0x2A, read at 0xD16C), on a field bounded at 5–470 px
// (0x9A14). That art is not the port's to use. The port cuts the field from
// the navigation map around the town instead, north up, `cellPixels` battle
// pixels to a map cell, and paints it like the sailing map; the forts stand
// on the shore beside the town. In the original you get through by touching
// the fort or running ashore next to it (event 5); here you land by bringing
// the flagship's centre onto the shore near the town (the landing zone),
// a fort standing in the zone included, as running ashore next to the fort
// is in the original. Any other shore, a fort's outside the zone included,
// is running aground (event 13, CSTR 173), and leaving the field is being
// driven off (event 6, CSTR 196).
export const FORT_FIELD = Object.freeze({ width: 600, height: 400, margin: 10, cellPixels: 10 });
// `home` is land joined to the town's own; it reads as 'land'.
const GROUND = Object.freeze({ water: 0, land: 1, landing: 2, home: 3 });
const GROUND_NAMES = Object.freeze(['water', 'land', 'landing', 'land']);

// Unit vector from the town toward the open sea: the mean direction of the
// water cells within 20 cells.
function seaDirection(map, town) {
  let dx = 0;
  let dy = 0;
  for (let y = -20; y <= 20; y += 1) {
    for (let x = -20; x <= 20; x += 1) {
      const distance = Math.hypot(x, y);
      if (distance === 0 || distance > 20) continue;
      if (pixelClassAt(map, town.x + x + .5, town.y + y + .5) === PIXEL.LAND) continue;
      dx += x / distance;
      dy += y / distance;
    }
  }
  const length = Math.hypot(dx, dy);
  return length ? { x: dx / length, y: dy / length } : { x: 0, y: 1 };
}

// The field's top-left map cell: the town sits toward the landward side, so
// most of the field is the sea it is approached from.
export function fortFieldWindow(map, town) {
  const { width, height, cellPixels } = FORT_FIELD;
  const cellsWide = width / cellPixels;
  const cellsHigh = height / cellPixels;
  const sea = seaDirection(map, town);
  const centreX = town.x + .5 + sea.x * (cellsWide / 2 - 14);
  const centreY = town.y + .5 + sea.y * (cellsHigh / 2 - 11);
  return {
    left: clamp(Math.round(centreX - cellsWide / 2), 0, map.width - cellsWide),
    top: clamp(Math.round(centreY - cellsHigh / 2), 0, map.height - cellsHigh),
  };
}

// The field's ground at battle-pixel resolution, read from the navigation
// map: water (shallows included), land, the town's own landmass, and the
// landing zone (the town's landmass within reach of the town: its nearest
// water plus two cells, at least three cells). `landing` is the zone's shore
// point nearest the town.
export function buildFortField(map, town) {
  const { width, height, cellPixels } = FORT_FIELD;
  const { left, top } = fortFieldWindow(map, town);
  const cells = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const land = pixelClassAt(map, left + (x + .5) / cellPixels, top + (y + .5) / cellPixels) === PIXEL.LAND;
      cells[y * width + x] = land ? GROUND.land : GROUND.water;
    }
  }
  const centre = { x: (town.x + .5 - left) * cellPixels, y: (town.y + .5 - top) * cellPixels };
  markHomeLand(cells, width, height, centre);
  const at = (x, y) => (x < 0 || y < 0 || x >= width || y >= height ? GROUND.water : cells[y * width + x]);
  const reach = 10 * cellPixels;
  const box = (radius, visit) => {
    for (let y = Math.max(0, Math.floor(centre.y - radius)); y < Math.min(height, centre.y + radius); y += 1) {
      for (let x = Math.max(0, Math.floor(centre.x - radius)); x < Math.min(width, centre.x + radius); x += 1) visit(x, y);
    }
  };
  let nearestWater = Infinity;
  box(reach, (x, y) => {
    if (at(x, y) === GROUND.water) nearestWater = Math.min(nearestWater, Math.hypot(x - centre.x, y - centre.y));
  });
  const landingRadius = Math.max(3 * cellPixels, Math.min(reach, nearestWater) + 2 * cellPixels);
  let landing = null;
  let landingDistance = Infinity;
  box(landingRadius, (x, y) => {
    const distance = Math.hypot(x - centre.x, y - centre.y);
    if (distance > landingRadius || at(x, y) !== GROUND.home) return;
    cells[y * width + x] = GROUND.landing;
    const shore = [[2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => at(x + dx, y + dy) === GROUND.water);
    if (shore && distance < landingDistance) { landing = { x, y }; landingDistance = distance; }
  });
  return {
    left, top, cellPixels, width, height, town: centre, landingRadius,
    landing: landing ?? { x: Math.round(centre.x), y: Math.round(centre.y) }, cells,
  };
}

// Marks the land joined to the town's pixel (4-connected) as home. A town
// pixel that is not land (never on the real maps) makes all land home.
function markHomeLand(cells, width, height, centre) {
  const start = Math.floor(centre.y) * width + Math.floor(centre.x);
  if (cells[start] !== GROUND.land) {
    cells.forEach((cell, index) => { if (cell === GROUND.land) cells[index] = GROUND.home; });
    return;
  }
  const stack = [start];
  cells[start] = GROUND.home;
  while (stack.length) {
    const index = stack.pop();
    const x = index % width;
    for (const next of [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, index - width, index + width]) {
      if (next < 0 || next >= cells.length || cells[next] !== GROUND.land) continue;
      cells[next] = GROUND.home;
      stack.push(next);
    }
  }
}

// 'water', 'land' or 'landing' under a point: the whole-pixel ship centre,
// as the original reads one map pixel (0x81B6). Outside the field is water;
// leaving the field is tested on its own.
export function fortFieldGround(field, { x, y }) {
  const px = pixel(x);
  const py = pixel(y);
  if (px < 0 || py < 0 || px >= field.width || py >= field.height) return 'water';
  return GROUND_NAMES[field.cells[py * field.width + px]];
}

// Water all round a point, `radius` px out in eight directions.
function openWater(field, x, y, radius) {
  return [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [.7, .7], [.7, -.7], [-.7, .7], [-.7, -.7]]
    .every(([dx, dy]) => fortFieldGround(field, { x: x + dx * radius, y: y + dy * radius }) === 'water');
}

// Where the forts stand: shore points of the town's own landmass beside the
// town, outside the landing zone, the first the nearest to the town and
// each next one well apart from the others while staying close to the town.
// A short coast packs them closer; on an island too small to hold them
// outside the landing zone they stand on its shore within the zone, at least
// 18 px from the town. Their ground stays in the zone: carving it out made
// the shore right beside a small island's town run aground (issue #120).
// Only when the town's land has no room at all do they stand on other land.
export function fortPlaces(field, count) {
  const { width, height, town, landingRadius, cells } = field;
  const home = [];
  const near = [];
  const other = [];
  for (let y = 24; y < height - 24; y += 4) {
    for (let x = 24; x < width - 24; x += 4) {
      const cell = cells[y * width + x];
      if (cell === GROUND.water) continue;
      const distance = Math.hypot(x - town.x, y - town.y);
      const shore = () => [[6, 0], [-6, 0], [0, 6], [0, -6]].some(([dx, dy]) => fortFieldGround(field, { x: x + dx, y: y + dy }) === 'water');
      if (cell === GROUND.landing) {
        if (distance >= 18 && shore()) near.push({ x, y, distance });
        continue;
      }
      if (distance < landingRadius + 12 || distance > landingRadius + (cell === GROUND.home ? 200 : 120) || !shore()) continue;
      (cell === GROUND.home ? home : other).push({ x, y, distance });
    }
  }
  const places = [];
  const pick = (candidates, spacing) => {
    let best = null;
    let bestScore = -Infinity;
    for (const candidate of candidates) {
      const apart = places.length ? Math.min(...places.map((place) => Math.hypot(place.x - candidate.x, place.y - candidate.y))) : Infinity;
      if (apart < spacing) continue;
      const score = places.length ? Math.min(apart, 160) - candidate.distance : -candidate.distance;
      if (score > bestScore) { best = candidate; bestScore = score; }
    }
    return best;
  };
  const tiers = [[home, 60], [home, 30], [near, 24], [near, 12], [other, 60], [home, 1], [near, 1], [other, 1]];
  for (const [candidates, spacing] of tiers) {
    while (places.length < count) {
      const best = pick(candidates, spacing);
      if (!best) break;
      places.push({ x: best.x, y: best.y });
    }
  }
  // No shore left at all (never on the real maps): the rest stand at the town.
  while (places.length < count) places.push({ x: Math.round(town.x), y: Math.round(town.y) });
  return places;
}

// The fort's damage display: min(3, hits/20) (0xECF0).
export function fortDamageLevel(damage) {
  return Math.min(3, Math.floor(damage / 20));
}

// sea_battles.md §8: after you get through, the garrison is
// (soldiers + 1)/2 + the fort's surviving men/10.
export function garrisonAfterFortBattle({ soldiers, fortMenLeft }) {
  return ((soldiers + 1) >> 1) + Math.trunc(fortMenLeft / 10);
}

// ASSUMED: the original's start is the town record's tile and heading, on
// its own map. The port starts you favourably: in open water upwind of the
// town (the wind byte is where the wind blows toward), as near straight
// upwind as the coast allows, 230 px out or closer, with a clear run to the
// landing where there is one, pointed at it.
export function fortStart(field, wind) {
  const { width, height, town, landing } = field;
  const upwind = (wind + 128) & 0xff;
  const pointed = (x, y) => ({ x, y, heading: bearingByte(landing.x - x, landing.y - y) });
  // Sailing straight for the landing stays in water until the landing zone.
  const clearRun = (x, y) => {
    const length = Math.hypot(landing.x - x, landing.y - y);
    for (let travelled = 0; travelled < length; travelled += 4) {
      const ground = fortFieldGround(field, { x: x + (landing.x - x) * travelled / length, y: y + (landing.y - y) * travelled / length });
      if (ground === 'landing') return true;
      if (ground === 'land') return false;
    }
    return true;
  };
  for (const needClearRun of [true, false]) {
    for (const distance of [230, 190, 150, 110]) {
      for (let step = 0; step <= 16; step += 1) {
        for (const sign of step ? [1, -1] : [1]) {
          const radians = ((upwind + sign * step * 8) & 0xff) * Math.PI * 2 / 256;
          const x = Math.round(town.x + Math.sin(radians) * distance);
          const y = Math.round(town.y - Math.cos(radians) * distance);
          if (x < 40 || y < 40 || x > width - 40 || y > height - 40 || !openWater(field, x, y, 28)) continue;
          if (needClearRun && !clearRun(x, y)) continue;
          return pointed(x, y);
        }
      }
    }
  }
  // No open water near the town: the first clear water in the field.
  for (let y = 40; y < height - 40; y += 8) {
    for (let x = 40; x < width - 40; x += 8) {
      if (openWater(field, x, y, 28)) return pointed(x, y);
    }
  }
  return pointed(width / 2, height / 2);
}

// DELIBERATE DEVIATION: the original fights all of a town's forts as one
// enemy with 12 guns a fort (sea_battles.md §8). The port gives each fort its
// own battery of 12 guns at its own place on the field (at most four), with
// an equal share of the gunners, so you can silence them one at a time and a
// distant battery's scatter makes it miss more often. Each battery is a
// type-8 "ship" with the fort's rules.
export const MAX_FORT_BATTERIES = 4;
export function createFortBatteries({ forts, men, flag, places }) {
  const count = Math.min(forts & 7, MAX_FORT_BATTERIES, places.length);
  return places.slice(0, count).map((place, index) => {
    const share = Math.floor(men / count) + (index < men % count ? 1 : 0);
    return {
      name: 'Fort', type: 8, fort: true, x: place.x, y: place.y, heading: 0,
      // ASSUMED: the fort's sail flag is not traced; its hits are not halved.
      damage: 0, men: share, startMen: share, guns: 12,
      reload: 0, reloadTime: enemyReloadTime(0), sails: 'none', targetSails: 'none', sailTransition: 0,
      shotTimer: 0, speed: 0, kind: 0, flag, tactic: null,
    };
  });
}

// The town's forts taken together, for the status line, the HUD and the
// garrison afterwards. A town without forts has an empty, silent summary.
export function fortSummary(forts, startMen, flag) {
  const total = (key) => forts.reduce((sum, fort) => sum + fort[key], 0);
  return {
    name: 'Fort', type: 8, fort: true,
    x: forts[0]?.x ?? 0, y: forts[0]?.y ?? 0, heading: 0,
    damage: total('damage'), men: total('men'), startMen, guns: total('guns'),
    firing: forts.filter((fort) => fort.guns > 0).length,
    reload: 0, reloadTime: enemyReloadTime(0), sails: 'none', targetSails: 'none', sailTransition: 0,
    shotTimer: 0, speed: 0, kind: 0, flag, tactic: null,
  };
}

// The fort your broadside is laid on: the nearest one with guns left, or the
// nearest one once all are silent.
export function fortTargetIndex(player, forts) {
  const distance = (fort) => battleDistance(fort.x - player.x, fort.y - player.y);
  const pick = (candidates) => candidates.reduce((best, index) => (
    best === -1 || distance(forts[index]) < distance(forts[best]) ? index : best), -1);
  const armed = forts.map((fort, index) => (fort.guns > 0 ? index : -1)).filter((index) => index >= 0);
  return pick(armed.length ? armed : forts.map((_, index) => index));
}

export function createFortBattle({ player, town, map, flagshipIndex = 0, speedRows, difficulty, ability, crewMorale, playerFlag = 'pirate', rng }) {
  const embarked = embarkedForBattle({ ...player, flagshipIndex });
  const fleet = player.ships.map(shipRecord);
  const [selected] = fleet.splice(flagshipIndex, 1);
  fleet.unshift(selected);
  const windStrength = rng.int(3); // sea_battles.md §1: rnd(3) for a fort.
  const field = buildFortField(map, town);
  const fortMen = 4 * ((town.soldiers + 1) >> 1);
  const count = Math.min(town.forts & 7, MAX_FORT_BATTERIES);
  const places = fortPlaces(field, count);
  const start = fortStart(field, player.wind);
  const forts = createFortBatteries({ forts: town.forts, men: fortMen, flag: town.nation, places });
  return {
    frame: 0,
    noHitFrames: 0,
    fort: true,
    field,
    wind: { direction: player.wind & 0xff, strength: windStrength },
    terrain: 'fort',
    arena: { width: field.width, height: field.height },
    skill: gunnerySkill(difficulty, ability === 'gunnery', 0), // extra is 0 for a fort.
    speedRows,
    fleet,
    player: {
      ...initialShip({
        name: embarked.flagship.type, ...start,
        damage: embarked.flagship.damage, men: embarked.men, guns: embarked.guns,
        reloadTime: playerReloadTime(crewMorale),
      }),
      flag: playerFlag,
      reserveMen: embarked.reserveMen,
      reserveGuns: embarked.reserveGuns,
    },
    forts,
    enemy: fortSummary(forts, fortMen, town.nation),
    encounter: { ship: 'Fort', flag: town.nation, town: town.name, forts: town.forts },
    projectiles: [], effects: [], event: null, frameEvent: 0,
    assumptions: [
      'Wall-clock battle frame duration is assumed.',
      'The field is cut from the navigation map; the start and the landing zone are the port\'s own.',
      'Each of the town\'s forts is its own battery of 12 guns.',
    ],
  };
}

// The forts' half of the frame. Your ball is laid on one fort and tested
// against that fort when it lands. Then each fort's reload, the wind, leaving
// the field, and each fort's aim and shot. A fort's heading is reset to
// bearing + 60 + rnd(8) every frame, so it is always beam-on and fires
// whenever it is loaded, with a scatter of a few degrees (0x8F25).
function stepFortBattle(original, input, rng) {
  const forts = [...original.forts];
  const { startMen, flag } = original.enemy;
  const inFlight = original.projectiles.find((shot) => shot.owner === 'player');
  const target = inFlight?.target ?? (forts.length ? fortTargetIndex(original.player, forts) : -1);
  let battle = stepPlayerHalf(target >= 0 ? { ...original, enemy: forts[target] } : original, input, rng);
  if (target >= 0) forts[target] = battle.enemy;
  battle.projectiles = battle.projectiles.map((shot) => (
    shot.owner === 'player' && shot.target === undefined ? { ...shot, target } : shot));
  forts.forEach((fort, index) => { forts[index] = stepEnemyReload(fort); });
  battle = stepBattleWind(battle, rng);
  const { margin } = FORT_FIELD;
  const { width, height } = battle.field;
  const { x, y } = battle.player;
  if (x < margin || x > width - margin || y < margin || y > height - margin) {
    battle = { ...battle, frameEvent: BATTLE_EVENT.outOfRange };
  }
  forts.forEach((fort, index) => {
    const bearing = bearingByte(battle.player.x - fort.x, battle.player.y - fort.y);
    const aimed = { ...fort, heading: (bearing + 60 + rng.int(8)) & 0xff };
    const own = (shot) => shot.owner === 'enemy' && shot.battery === index;
    const others = battle.projectiles.filter((shot) => !own(shot));
    const next = stepShot({ ...battle, enemy: aimed, projectiles: battle.projectiles.filter(own) },
      'enemy', beamDifference(aimed, battle.player) < 6, rng);
    forts[index] = next.enemy;
    battle = {
      ...next,
      projectiles: [...others, ...next.projectiles.map((shot) => (shot.owner === 'enemy' ? { ...shot, battery: index } : shot))],
    };
  });
  battle = { ...battle, forts, enemy: fortSummary(forts, startMen, flag) };
  const event = frameOutcome(battle.frameEvent, battle);
  return event ? { ...battle, event } : battle;
}
