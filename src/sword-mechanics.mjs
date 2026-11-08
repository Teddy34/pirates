// Sword fights (sword_fights.md): the one engine behind duels, boarding
// actions, storming the walls and practice. DOM-free and deterministic: one
// call to stepFight is one animation frame of the original's loop
// (0x2747C-0x28480), with randomness drawn from the injected rng in the
// original's order.
//
// Coordinates are the original's fight x pixels: you stand on the right and
// face left, the opponent on the left facing right. Distance = your x - his x.
//
// The frame tables below were read from image32.bin at the addresses given
// (numbers only: mechanics data, not artwork). Move numbers:
//   0-2   stand guarding the middle, low and high line
//   3-5   step back 14 px guarding the middle, low and high line
//   6-8   slash at the middle, low and high line (6 frames)
//   9-11  quick thrust at the middle, low and high line (4 frames, half points)
//   12    advance 14 px, 13 retreat 14 px, 14 yield (10 frames)
// sword_fights.md §4 lists 3-5 and 6-8 as "high, middle, low". The guard and
// attack bits show the triplet order is joystick-centred: centre (line 0,
// bit 2), down (line 1, bit 1), up (line 2, bit 4). The port follows the
// bits, so "middle, low, high".

import { clamp } from './mechanics.mjs';

export const FIGHT_MODE = { duel: 'duel', battle: 'battle', practice: 'practice' };
export const FIGHT_RESULT = { won: 'won', drivenBack: 'driven-back', defeated: 'defeated' };
export const WEAPONS = ['Rapier', 'Longsword', 'Cutlass'];
export const DEFAULT_WEAPON = 2; // 0x16E56 preselects the cutlass.

export const MOVE = {
  guardMid: 0, guardLow: 1, guardHigh: 2,
  backMid: 3, backLow: 4, backHigh: 5,
  slashMid: 6, slashLow: 7, slashHigh: 8,
  thrustMid: 9, thrustLow: 10, thrustHigh: 11,
  advance: 12, retreat: 13, yield: 14,
};

// 0x338AC: frames per move.
export const MOVE_FRAMES = [6, 6, 6, 6, 6, 6, 6, 6, 6, 4, 4, 4, 6, 6, 10, 2];
// 0x389BD / 0x389C1: weapon reach, yours and his, by weapon index.
const PLAYER_REACH = [50, 40, 30];
const OPPONENT_REACH = [35, 25, 15];
// Indexed by skill (0-4).
const REACH_BONUS = [15, 10, 5, 0, 0]; // 0x389B8
const HIT_ROLL = [48, 56, 64, 72, 80]; // 0x389E4 (yours) = 0x389E9 (his)
const CLOSE_GUARD_CHANCE = [5, 3, 2, 1, 1]; // 0x38C72: rnd(16) <= x
const FRAME_TICKS = [12, 11, 10, 9]; // 0x389C4, indexed by skill & 3
// 0x389FA: at 60 px or more apart, attacks become advances and guards
// stepping back become retreats.
const FAR_MOVE = [0, 1, 2, 13, 13, 13, 12, 12, 12, 12, 12, 12, 0, 0, 0, 0];
// 0x38D47: the line (0 middle, 1 low, 2 high) of each move.
const MOVE_LINE = [0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 0, 0, 0];

// Per (move · 6 + frame). 0x38A1A guard bits, 0x38A7A attack bits (bit 2
// middle, 1 low, 4 high), 0x38ADA forward step, 0x38B3A backward step. The
// 10-frame yield runs on into row 15, as in the original.
const rows = (list) => list.flat();
const GUARD = rows([
  [6, 7, 2, 2, 0, 0], [0, 3, 3, 1, 1, 0], [4, 6, 6, 4, 0, 0],
  [6, 7, 2, 2, 0, 0], [0, 3, 3, 1, 1, 0], [4, 6, 6, 4, 0, 4],
  ...Array(8).fill([0, 0, 0, 0, 0, 0]), [7, 7, 7, 7, 7, 7], [0, 0, 0, 0, 0, 0],
]);
const ATTACK = rows([
  ...Array(6).fill([0, 0, 0, 0, 0, 0]),
  [0, 0, 0, 2, 0, 0], [0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 4, 0],
  [0, 0, 2, 0, 0, 0], [0, 0, 1, 0, 0, 0], [0, 0, 4, 0, 0, 0],
  ...Array(4).fill([0, 0, 0, 0, 0, 0]),
]);
const STEP_FORWARD = rows([
  ...Array(6).fill([0, 0, 0, 0, 0, 0]),
  [0, 0, 0, 0, 0, 4], [0, 0, 0, 0, 0, 4], [0, 0, 0, 0, 0, 4],
  [0, 0, 0, 4, 0, 0], [0, 0, 0, 4, 0, 0], [0, 0, 0, 4, 0, 0],
  [0, 0, 0, 0, 0, 14], ...Array(3).fill([0, 0, 0, 0, 0, 0]),
]);
const STEP_BACK = rows([
  ...Array(3).fill([0, 0, 0, 0, 0, 0]),
  [14, 0, 0, 0, 0, 0], [14, 0, 0, 0, 0, 0], [14, 0, 0, 0, 0, 0],
  ...Array(7).fill([0, 0, 0, 0, 0, 0]),
  [14, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0],
]);
// 0x38C5A: his move when 20 px or more apart.
const OPPONENT_FAR = [12, 12, 12, 12, 12, 0, 0, 13];
// 0x38C87: three sets (by skill) of eight 8-move patterns used up close.
// 0x90 guards your line; 0x92 slashes and 0x93 thrusts at another line.
const PATTERNS = [
  [[9, 9, 0, 0, 11, 11, 2, 2], [1, 10, 0, 9, 2, 9, 3, 5], [9, 8, 4, 11, 5, 8, 3, 9], [10, 11, 10, 11, 1, 0, 2, 0],
    [10, 10, 2, 2, 11, 11, 1, 1], [7, 0, 9, 2, 8, 1, 0, 2], [6, 0, 10, 6, 9, 4, 10, 2], [0, 10, 7, 1, 9, 2, 10, 11]],
  [[10, 5, 11, 0x90, 9, 0, 1, 6], [0, 11, 0, 0x93, 1, 9, 1, 10], [8, 11, 11, 0x92, 0, 1, 2, 2], [3, 1, 2, 0x93, 4, 0, 2, 7],
    [5, 7, 9, 0x90, 10, 0, 6, 9], [7, 0, 2, 0x92, 1, 11, 3, 4], [9, 11, 1, 0x93, 2, 10, 11, 8], [6, 0, 9, 0x90, 11, 10, 1, 2]],
  [[1, 10, 0, 0x93, 0, 2, 1, 0x92], [11, 1, 10, 0x90, 6, 2, 9, 0x90], [9, 0, 10, 0x90, 11, 10, 2, 0x93], [5, 11, 10, 0x92, 4, 9, 9, 0x92],
    [0, 8, 2, 0x92, 3, 10, 1, 0x93], [8, 7, 6, 0x90, 8, 7, 6, 0x90], [1, 0, 2, 0x93, 2, 0, 1, 0x93], [0, 9, 11, 0x93, 5, 1, 7, 0x92]],
];

const START = { duel: [320, 240], battle: [340, 220] }; // 0x27FF6
const RIGHT_EDGE = 442; // 0x389DC: you are driven back
const LEFT_EDGE = 60; // 0x389DE: he is driven back
const FAR_APART = 60;
const OPPONENT_CLOSE = 20;
const STEP_MIN_DISTANCE = 10; // forward steps stop this close
const HIT_PUSH = 4;
const CREW_CLASH_FRAMES = 16;
const MAX_MEN = 9999;
export const PRACTICE_STEP = 5;
export const PRACTICE_MAX = 30;

// ASSUMED: the fight timer's rate is untraced (porting_guide.md §5). 200
// ticks a second gives about 17 animation frames a second at skill 0, so a
// slash takes 0.36 s; 120 ticks a second played too slowly.
export const FENCING_TICK_SECONDS = 1 / 200;

// 0x1B087 with ability 1.
export function fencingSkill(difficulty, hasFencing, extra = 0) {
  return clamp(difficulty + extra - (hasFencing ? 1 : 0), 0, 4);
}

export function frameSeconds(skill) {
  return FRAME_TICKS[skill & 3] * FENCING_TICK_SECONDS;
}

// 0x167CE: the two morale values always add up to 47.
export function startingMorale(yourMen, yourQuality, theirMen, theirQuality) {
  const yours = yourMen * yourQuality;
  const total = yours + theirMen * theirQuality;
  const morale = 8 + (total > 0 ? Math.trunc((yours * 31) / total) : 15);
  return [morale, 47 - morale];
}

// The joystick of 0x27638 as the port's keys: `x` -1 towards him (left),
// 1 away; `y` -1 up (high line), 1 down (low line); `quick` turns an attack
// into the quick thrust. No input at all is the middle guard.
// ASSUMED: the original's keyboard path latches a key press until a move
// that consumes it starts (0x38A0A), so a single tap of "away" keeps you
// backing off. The port reads held keys instead, plus one latched tap per
// move (the caller clears it when `startedMove` is set).
export function inputMove(input) {
  if (!input) return MOVE.guardMid;
  const line = input.y > 0 ? 1 : input.y < 0 ? 2 : 0;
  if (input.x < 0) return (input.quick ? MOVE.thrustMid : MOVE.slashMid) + line;
  if (input.x > 0) return MOVE.backMid + line;
  return line;
}

const fighter = (x, men, morale) => ({ x, move: 0, frame: 0, guard: 0, attack: 0, men, morale });

// `record` is the 12-byte fight record of sword_fights.md §1:
// { yourMen, yourQuality, theirMen, theirQuality, extraSkill, mode,
//   opponent: { title, nation, name } }.
export function createFight({ record, difficulty = 1, hasFencing = false, practice = 0, weapon = DEFAULT_WEAPON, rng }) {
  const mode = record.mode ?? FIGHT_MODE.duel;
  const skill = fencingSkill(difficulty, hasFencing, record.extraSkill ?? 0);
  const [yourMorale, theirMorale] = startingMorale(record.yourMen, record.yourQuality, record.theirMen, record.theirQuality);
  // 0x168A5: a crew's leader fights with a longsword or cutlass, a duellist
  // with the rapier.
  const opponentWeapon = mode === FIGHT_MODE.battle ? rng.int(2) + 1 : 0;
  const [yourX, theirX] = mode === FIGHT_MODE.battle ? START.battle : START.duel;
  const you = { ...fighter(yourX, record.yourMen, yourMorale), move: -1 };
  const foe = fighter(theirX, record.theirMen, theirMorale);
  const patternSet = skill < 1 ? 0 : skill === 1 ? 1 : 2;
  const patternRow = rng.int(8);
  return {
    mode, skill, weapon, opponentWeapon,
    practice: clamp(practice, 0, PRACTICE_MAX),
    opponent: record.opponent ?? {},
    menBefore: record.yourMen,
    you, foe,
    pattern: { set: patternSet, row: patternRow, index: 0 },
    hits: { you: 0, foe: 0 }, // 0x389B4 / 0x389B6, reset with a new pattern row
    thrust: { you: false, foe: false },
    yielding: null, // 0x44B88: 'foe' or 'you' once morale or crew runs out
    frame: 1,
    result: null,
    startedMove: false,
    events: [],
  };
}

const index = (fencer) => fencer.move * 6 + fencer.frame;

// Each point moves one morale from loser to winner (0x27F4F / 0x27F9C).
// Every eighth morale gained returns REDRAW (state 4): the caller redraws
// and carries on, and that 4 replaces any result set earlier in the frame.
const REDRAW = 4;
function transferMorale(fight, winner, state) {
  const gain = winner === 'you' ? fight.you : fight.foe;
  const lose = winner === 'you' ? fight.foe : fight.you;
  if (lose.morale <= 0) return state;
  gain.morale += 1;
  lose.morale -= 1;
  if (lose.morale < 1) fight.yielding = winner === 'you' ? 'foe' : 'you';
  return (gain.morale & 7) === 0 ? REDRAW : state;
}

function scorePoints(fight, winner, thrust, slashIterations, state) {
  let next = state;
  for (let iteration = 0; iteration < slashIterations; iteration += 1) {
    next = transferMorale(fight, winner, next);
    if (!thrust) next = transferMorale(fight, winner, next);
  }
  return { points: thrust ? slashIterations : 2 * slashIterations, state: next };
}

// 0x28426: his counter-move reads your current line.
function counterMove(code, yourMove, rng) {
  const line = MOVE_LINE[yourMove] ?? 0;
  if (code === 0x90) return line;
  if (code === 0x91) return line + 3;
  let other = rng.int(2) + 1 + line;
  if (other >= 3) other = 0; // as coded: from the high line he always picks the middle
  return other + (code === 0x92 ? 6 : 9);
}

// 0x280EF: his next move when an animation ends.
function chooseOpponentMove(fight, rng) {
  const { foe, you, pattern, hits, skill } = fight;
  if (foe.move === MOVE.yield) return;
  fight.thrust.foe = false;
  const distance = you.x - foe.x;
  let move;
  if (distance < 0 || distance >= OPPONENT_CLOSE) move = OPPONENT_FAR[rng.int(8)]; // unsigned, as above
  else if (rng.int(16) <= CLOSE_GUARD_CHANCE[skill]) move = MOVE.guardLow;
  else {
    pattern.index = (pattern.index + 1) & 7;
    // After a full pattern, stronger opponents change pattern once you have
    // been hitting them.
    if (pattern.index === 0) {
      const change = skill === 1 ? hits.you > 2 : skill === 2 ? hits.you !== 0 : skill === 3 ? (hits.you | hits.foe) !== 0 : false;
      if (change) { pattern.row = rng.int(8); hits.you = 0; }
    }
    move = PATTERNS[pattern.set][pattern.row][pattern.index];
    if (move >= 0x80) move = counterMove(move, you.move, rng);
  }
  foe.move = move;
  foe.frame = 0;
  if (move >= MOVE.thrustMid && move <= MOVE.thrustHigh) fight.thrust.foe = true;
}

const isAttack = (move) => move >= MOVE.slashMid && move <= MOVE.thrustHigh;

// One animation frame. `input` is { x, y, quick } or null (see inputMove).
// Returns the new fight; `result` is set once it is over, and `events`
// lists this frame's strokes for the presentation.
export function stepFight(previous, input, rng) {
  if (previous.result) return previous;
  const fight = structuredClone(previous);
  const { you, foe } = fight;
  let state = 0; // 0x44B86: 1 won, 2 driven back, 3 defeated
  fight.events = [];
  fight.startedMove = false;
  fight.frame += 1;
  let distance = you.x - foe.x;
  const requested = inputMove(input);

  // 0x276F8: your yield has played out.
  if (you.move === MOVE.yield && you.frame >= 9) return finish(fight, 3);

  if (you.move < 0 || ++you.frame >= MOVE_FRAMES[you.move]) {
    // Unsigned in the original (`jb`): crossed fencers count as far apart.
    let move = distance < 0 || distance >= FAR_APART ? FAR_MOVE[requested] : requested;
    if (foe.move === MOVE.yield) move = MOVE.guardLow;
    you.move = move;
    you.frame = 0;
    fight.thrust.you = move >= MOVE.thrustMid && move <= MOVE.thrustHigh;
    fight.startedMove = true;
  }
  you.guard = GUARD[index(you)];
  you.attack = ATTACK[index(you)];
  if (you.attack) {
    you.guard = 0;
    if (foe.guard & you.attack) fight.events.push({ type: 'parry', by: 'you', close: distance <= 35 });
    else if (distance > PLAYER_REACH[fight.weapon] + REACH_BONUS[fight.skill]) fight.events.push({ type: 'miss', by: 'you' });
    else if (rng.int(256) + fight.practice >= HIT_ROLL[fight.skill]) {
      you.guard = 7;
      foe.x -= HIT_PUSH;
      let points;
      ({ points, state } = scorePoints(fight, 'you', fight.thrust.you, 2 * fight.weapon + 1, state));
      fight.hits.you += 1;
      fight.events.push({ type: 'hit', by: 'you', points });
      if (fight.yielding === 'foe' && foe.move !== MOVE.yield) { foe.move = MOVE.yield; foe.frame = 0; }
    } else fight.events.push({ type: 'miss', by: 'you' });
  }
  if (distance >= STEP_MIN_DISTANCE) you.x -= STEP_FORWARD[index(you)];
  you.x += STEP_BACK[index(you)];
  if (you.x >= RIGHT_EDGE) state = 2;
  distance = you.x - foe.x;

  if (++foe.frame >= MOVE_FRAMES[foe.move & 15]) chooseOpponentMove(fight, rng);
  foe.guard = GUARD[index(foe)];
  foe.attack = ATTACK[index(foe)];
  if (foe.attack) {
    foe.guard = 0;
    if (you.guard & foe.attack) fight.events.push({ type: 'parry', by: 'foe', close: distance < 35 });
    else if (distance > OPPONENT_REACH[fight.opponentWeapon]) fight.events.push({ type: 'miss', by: 'foe' });
    else if (rng.int(256) >= HIT_ROLL[fight.skill]) {
      foe.guard = 7;
      you.x += HIT_PUSH;
      let points;
      ({ points, state } = scorePoints(fight, 'foe', fight.thrust.foe, fight.opponentWeapon + 1, state));
      fight.hits.foe += 1;
      fight.events.push({ type: 'hit', by: 'foe', points });
      if (fight.yielding === 'you') { you.move = MOVE.yield; you.frame = 0; }
    } else fight.events.push({ type: 'miss', by: 'foe' });
  }
  if (distance >= STEP_MIN_DISTANCE) foe.x += STEP_FORWARD[index(foe)];
  foe.x -= STEP_BACK[index(foe)];
  if (foe.x <= LEFT_EDGE) state = 1;

  // 0x27CFF: the crews clash every 16 frames in a battle.
  if (fight.mode === FIGHT_MODE.battle && (fight.frame & (CREW_CLASH_FRAMES - 1)) === 0) {
    const yourRoll = rng.int(((you.men + 8) >> 2) * you.morale);
    const theirRoll = rng.int(((foe.men + 8) >> 2) * foe.morale);
    const loser = theirRoll < yourRoll ? foe : you; // ties go against you
    const losses = ((you.men + foe.men) >> 6) + 1;
    loser.men = clamp(loser.men - losses, 1, MAX_MEN);
    const winner = loser === foe ? 'you' : 'foe';
    if (loser.men === 1) fight.yielding = winner === 'you' ? 'foe' : 'you';
    state = transferMorale(fight, winner, state);
    fight.events.push({ type: 'clash', winner });
  }

  if (you.move === MOVE.yield && you.frame >= 9) state = 3;
  if (foe.move === MOVE.yield && foe.frame >= 9) state = 1;
  return state && state !== REDRAW ? finish(fight, state) : fight;
}

function finish(fight, state) {
  fight.result = [null, FIGHT_RESULT.won, FIGHT_RESULT.drivenBack, FIGHT_RESULT.defeated][state];
  return fight;
}

// What 0x16205 hands back to its caller: your crew's losses (battles only)
// and the survivors on both sides.
export function fightOutcome(fight) {
  return {
    result: fight.result,
    yourMen: fight.you.men,
    theirMen: fight.foe.men,
    casualties: fight.mode === FIGHT_MODE.battle ? fight.menBefore - fight.you.men : 0,
  };
}

// 0xBDAE: every practice bout adds 5 to the hit-roll bonus, won or lost.
export function practiceAfterBout(practice) {
  return Math.min(PRACTICE_MAX, (practice ?? 0) + PRACTICE_STEP);
}

// Fight records for each caller (sword_fights.md §1).
export function duelRecord({ title, nation, name, extraSkill = 0 }) {
  return { yourMen: 1, yourQuality: 9, theirMen: 1, theirQuality: 9, extraSkill, mode: FIGHT_MODE.duel, opponent: { title, nation, name } };
}

// Town practice is mode 0xFE (0xBDAE) and gets the weapon choice. The
// opening's bout is mode 0xFF, which skips the menu and fights with the
// rapier (0x1622F, 0x16563); pass weapon 0 for it.
export function practiceRecord() {
  return { yourMen: 200, yourQuality: 32, theirMen: 200, theirQuality: 32, extraSkill: 0, mode: FIGHT_MODE.practice, opponent: { title: 'Sparring partner' } };
}

// 0xF235: `damage` values are the battle's hull damage (16 per level); `kind`
// is the enemy template's kind byte (3 traders ... 9 warships).
// ASSUMED: men and quality are held at 1 or more; the original (0xF1B3,
// 0xF1D9) does not clamp, so heavy damage gives a quality of 0 or less.
export function boardingRecord({ yourMen, yourDamage = 0, theirMen, theirDamage = 0, kind, nation, name, extraSkill = 0 }) {
  return {
    yourMen: Math.max(1, yourMen), yourQuality: Math.max(1, 7 - (yourDamage >> 4)),
    theirMen: Math.max(1, theirMen), theirQuality: Math.max(1, kind - (theirDamage >> 4)),
    extraSkill, mode: FIGHT_MODE.battle, opponent: { title: 'Captain', nation, name },
  };
}
