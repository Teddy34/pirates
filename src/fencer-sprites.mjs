// Pixel-art fencers for sword fights, and the fight backdrop's size. DOM-free:
// each paint returns RGBA pixels plus the anchor pixel (between the feet for
// a fencer). Presentation only; no rule depends on anything in this module.
// The bodies are generated art (assets/sprites/fencers.png, built by
// tools/build_fencers.py, provenance in assets/sprites/PROVENANCE.md); the
// sword arm and blade are drawn here over them, so every weapon, line and
// strike keeps its pose. Until the sheet loads, a code-drawn body stands in.
// Nothing here comes from the original game's sprites.

import { createArt, rasterize } from './pixel-art.mjs';
import { MOVE, MOVE_FRAMES } from './sword-mechanics.mjs';

export const FENCER_ART = { width: 64, height: 64, anchorX: 26, groundY: 61 };
// Fight x units per art pixel: a blade at full stretch reaches about one
// cutlass length (sword_fights.md §2) beyond the opponent's body.
export const FIGHT_UNITS_PER_ART_PIXEL = 2;

const SKIN = '#e0a878';
const SKIN_DARK = '#b97e55';
const STEEL = '#e3e7ea';
const STEEL_DARK = '#8f989f';
const GOLD = '#d8b04a';
const BOOT = '#3a2618';

// Blade length in art pixels by weapon index (rapier, longsword, cutlass).
const BLADE_LENGTH = [21, 18, 14];

// Looks: coat colours, headgear and clothes. You are the scene pictures'
// recurring captain (docs/scene-vignettes.md): bareheaded, dark hair tied
// back, short beard, dark-blue coat with brass buttons and a red sash. Every
// opponent wears headgear, so the two fencers differ in outline as well as
// in colour.
// `body` names the fencer's row of generated bodies (BODY_ROWS); a captain's
// or guard's coat and a sailor's headscarf there take the look's `coat` and
// `hatColor`.
export const LOOKS = {
  player: { body: 'player', coat: '#3b62a8', coatDark: '#26427a', trim: GOLD, sash: '#b8322a', breeches: '#c9b48a', hat: 'hair', hatColor: '#2a1b12', beard: true },
  captain: { body: 'captain', coat: '#a8331f', coatDark: '#6e2013', trim: GOLD, breeches: '#bfae86', hat: 'wide', hatColor: '#1f1b1a' },
  guard: { body: 'guard', coat: '#a8331f', coatDark: '#6e2013', trim: '#e3bd43', breeches: '#3f3a30', hat: 'morion', hatColor: '#c3c8cc' },
  villain: { body: 'villain', coat: '#2a2630', coatDark: '#16131a', trim: '#8a2f6b', breeches: '#2f2a33', hat: 'wide', hatColor: '#141215', feather: '#8a2f6b' },
  mutineer: { body: 'sailor', coat: null, shirt: '#ecd49a', shirtDark: '#c0a26a', breeches: '#7a5230', hat: 'bandana', hatColor: '#b8322a' },
  sparring: { body: 'sailor', coat: null, shirt: '#ecd49a', shirtDark: '#c0a26a', breeches: '#7a5230', hat: 'bandana', hatColor: '#2f5a8a' },
  sailor: { body: 'sailor', coat: null, shirt: '#ecd49a', shirtDark: '#c0a26a', breeches: '#7a5230', hat: 'bandana', hatColor: '#9b3a2a' },
  soldier: { body: 'guard', coat: '#a8331f', coatDark: '#6e2013', trim: '#e3bd43', breeches: '#3f3a30', hat: 'morion', hatColor: '#c3c8cc' },
};

// The generated body sheet: one row per BODY_ROWS entry, one FENCER_ART cell
// per BODY_POSES entry, each body's feet on the cell's anchor. Keep in step
// with CHARACTERS and BODY_POSES in tools/build_fencers.py.
export const BODY_ROWS = ['player', 'captain', 'guard', 'villain', 'sailor'];
export const BODY_POSES = ['guard', 'lunge', 'walk-a', 'walk-b', 'back', 'kneel'];
// The front shoulder of each body pose, from the anchor (art pixels, y down):
// where the sword arm starts.
const BODY_SHOULDER = { guard: [3, -30], lunge: [7, -25], 'walk-a': [1, -31], 'walk-b': [1, -31], back: [0, -30], kneel: [4, -21] };
// Alpha marks in the sheet: a coat and a headscarf to recolour.
const COAT_ALPHA = 254;
const CAP_ALPHA = 253;

// Hue in degrees and saturation (0-1) of a '#rrggbb' colour.
export function hueAndSaturation(hex) {
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const saturation = max === 0 ? 0 : chroma / max;
  if (chroma === 0) return { hue: 0, saturation };
  const sector = max === r ? ((g - b) / chroma + 6) % 6 : max === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4;
  return { hue: sector * 60, saturation };
}

// A coat an opponent must not wear: a hue within 40 degrees of your blue.
export function coatLooksLikeYours(hex) {
  const coat = hueAndSaturation(hex);
  if (coat.saturation < .25) return false;
  const yours = hueAndSaturation(LOOKS.player.coat).hue;
  const apart = Math.abs(coat.hue - yours) % 360;
  return Math.min(apart, 360 - apart) < 40;
}

// Each nation's coat for guards, soldiers and captains (an opponent's flag),
// except a nation whose colour is blue like yours (France): its men keep
// their own red coats, so you are the only fencer in blue.
export function lookForOpponent(title, nation, nationColors) {
  const base = { Guard: LOOKS.guard, Suitor: LOOKS.captain, Mutineer: LOOKS.mutineer, Villain: LOOKS.villain, 'Sparring partner': LOOKS.sparring }[title] ?? LOOKS.captain;
  const colors = nationColors?.[nation];
  if (!colors || !base.coat || title === 'Villain' || coatLooksLikeYours(colors.color)) return base;
  return { ...base, coat: colors.color, coatDark: colors.dark };
}

const lerp = (a, b, t) => a + (b - a) * t;
const blend = (from, to, t) => ({
  hand: [lerp(from.hand[0], to.hand[0], t), lerp(from.hand[1], to.hand[1], t)],
  angle: lerp(from.angle, to.angle, t),
});

// Sword-arm poses, relative to the shoulder (art pixels, y up; angle in
// degrees, 0 pointing at the opponent, positive upwards). Lines: 0 middle,
// 1 low, 2 high.
const GUARD_POSE = [{ hand: [6, -2], angle: 22 }, { hand: [6, -7], angle: -24 }, { hand: [4, 7], angle: 38 }];
const WINDUP_POSE = [{ hand: [-2, 7], angle: 125 }, { hand: [-1, 3], angle: 150 }, { hand: [-1, 10], angle: 105 }];
const STRIKE_POSE = [{ hand: [11, 0], angle: 2 }, { hand: [10, -7], angle: -26 }, { hand: [10, 6], angle: 16 }];
const THRUST_POSE = [{ hand: [14, -1], angle: 0 }, { hand: [13, -7], angle: -12 }, { hand: [13, 5], angle: 10 }];
const DRAW_POSE = [{ hand: [1, -1], angle: 4 }, { hand: [1, -6], angle: -12 }, { hand: [1, 5], angle: 10 }];

const STANCE = { front: 5, back: -6, crouch: 1, lean: 0 };
const LUNGE = { front: 10, back: -8, crouch: 3, lean: 2 };

// The frame of each attack on which its blow lands (the attack bits of
// sword-mechanics.mjs): slashes on 3 (high slash on 4), thrusts on 2.
function strikeFrame(move) {
  if (move === MOVE.slashHigh) return 4;
  return move >= MOVE.thrustMid ? 2 : 3;
}

// The pose of a fencer for one animation frame of one move. After the blow
// an attack stays overextended, arm out and in the lunge: its last frame is
// also the pose held for RECOVERY_FRAMES, when the fencer is open, so it
// must not read as a guard.
const OVEREXTENDED = .25;

function slashPose(move, frame, line) {
  const hit = strikeFrame(move);
  if (frame < hit - 1) return { arm: blend(GUARD_POSE[line], WINDUP_POSE[line], (frame + 1) / (hit - 1)), legs: STANCE, body: 'guard' };
  if (frame === hit - 1) return { arm: blend(WINDUP_POSE[line], STRIKE_POSE[line], .5), legs: STANCE, body: 'guard' };
  if (frame === hit) return { arm: STRIKE_POSE[line], legs: LUNGE, body: 'lunge', strike: true };
  return { arm: blend(STRIKE_POSE[line], GUARD_POSE[line], (OVEREXTENDED * (frame - hit)) / (MOVE_FRAMES[move] - 1 - hit)), legs: LUNGE, body: 'lunge' };
}

function thrustPose(frame, line) {
  if (frame === 0) return { arm: DRAW_POSE[line], legs: STANCE, body: 'guard' };
  if (frame === 1) return { arm: blend(DRAW_POSE[line], THRUST_POSE[line], .5), legs: LUNGE, body: 'lunge' };
  if (frame === 2) return { arm: THRUST_POSE[line], legs: LUNGE, body: 'lunge', strike: true };
  return { arm: blend(THRUST_POSE[line], GUARD_POSE[line], OVEREXTENDED), legs: LUNGE, body: 'lunge' };
}

function yieldPose(frame) {
  const t = Math.min(1, frame / 4);
  const kneel = frame >= 4;
  return { kind: 'yield', kneel, arm: blend(GUARD_POSE[1], { hand: [4, -10], angle: -70 }, t), legs: kneel ? { front: 6, back: -5, crouch: 7, lean: 1 } : STANCE, body: kneel ? 'kneel' : 'guard' };
}

// Walking feet swing through a six-frame cycle, backwards when retreating.
// The generated bodies take two strides with the guard between them.
const WALK_BODIES = ['guard', 'walk-a', 'walk-a', 'guard', 'walk-b', 'walk-b'];
function stepPose(move, frame) {
  const phase = (frame / 6) * Math.PI * 2 * (move === MOVE.retreat ? -1 : 1);
  const body = WALK_BODIES[(((move === MOVE.retreat ? -frame : frame) % 6) + 6) % 6];
  return { arm: GUARD_POSE[0], body, legs: { front: 3 + Math.round(3 * Math.cos(phase)), back: -4 + Math.round(3 * Math.cos(phase + Math.PI)), crouch: frame % 3 === 1 ? 2 : 1, lean: 0 } };
}

export function fencerPose(move, frame) {
  const line = move >= 0 && move < 12 ? move % 3 : 0;
  if (move === MOVE.yield) return yieldPose(frame);
  if (move >= MOVE.slashMid && move <= MOVE.slashHigh) return slashPose(move, frame, line);
  if (move >= MOVE.thrustMid && move <= MOVE.thrustHigh) return thrustPose(frame, line);
  if (move === MOVE.advance || move === MOVE.retreat) return stepPose(move, frame);
  if (move >= MOVE.backMid && move <= MOVE.backHigh && frame === 0) {
    return { arm: GUARD_POSE[line], legs: { front: 2, back: -8, crouch: 2, lean: -1 }, body: 'back' };
  }
  // A stand guard sways a little with its frame (the guard bits relax too).
  return { arm: GUARD_POSE[line], legs: { ...STANCE, crouch: frame >= 4 ? 2 : 1 }, body: 'guard' };
}

function thickLine(art, from, to, color) {
  art.line(from, to, color);
  art.line([from[0] + 1, from[1]], [to[0] + 1, to[1]], color);
}

function drawHat(art, look, headX, headTop) {
  const { hat, hatColor, feather } = look;
  if (hat === 'tricorne') {
    art.rect(headX - 5, headTop - 1, 11, 2, hatColor);
    art.rect(headX - 3, headTop - 3, 7, 2, hatColor);
    art.set(headX - 5, headTop - 2, hatColor); art.set(headX + 5, headTop - 2, hatColor);
    art.rect(headX - 4, headTop, 9, 1, GOLD);
    if (feather) { art.line([headX - 2, headTop - 3], [headX - 6, headTop - 6], feather); art.set(headX - 7, headTop - 6, feather); }
  } else if (hat === 'morion') {
    art.rect(headX - 6, headTop, 13, 1, hatColor);
    art.rect(headX - 3, headTop - 3, 7, 3, hatColor);
    art.rect(headX - 1, headTop - 5, 3, 2, hatColor);
    art.set(headX, headTop - 6, STEEL_DARK);
    art.rect(headX - 2, headTop - 2, 2, 1, STEEL);
  } else if (hat === 'wide') {
    art.rect(headX - 6, headTop, 13, 1, hatColor);
    art.rect(headX - 3, headTop - 3, 7, 3, hatColor);
    if (feather) art.line([headX + 3, headTop - 3], [headX + 6, headTop - 6], feather);
  } else if (hat === 'hair') {
    // Bareheaded: dark hair over the crown and the back of the head, tied
    // in a short queue behind.
    art.rect(headX - 2, headTop - 1, 5, 2, hatColor);
    art.rect(headX - 3, headTop, 1, 3, hatColor);
    art.set(headX - 4, headTop + 2, hatColor);
    art.set(headX - 5, headTop + 3, hatColor);
  } else {
    art.rect(headX - 3, headTop, 7, 2, hatColor);
    art.line([headX - 3, headTop + 1], [headX - 6, headTop + 3], hatColor);
  }
}

function drawBlade(art, hand, angleDegrees, length, weapon) {
  const radians = (angleDegrees * Math.PI) / 180;
  const dx = Math.cos(radians), dy = -Math.sin(radians);
  // Cross guard, perpendicular to the blade.
  const guard = weapon === 0 ? 2 : 3;
  art.line([hand[0] - dy * guard, hand[1] + dx * guard], [hand[0] + dy * guard, hand[1] - dx * guard], GOLD);
  let previous = hand;
  for (let step = 1; step <= length; step += 1) {
    // The cutlass curves back towards its tip.
    const curve = weapon === 2 ? (step * step) / (length * 6) : 0;
    const point = [hand[0] + dx * step - dy * curve, hand[1] + dy * step + dx * curve];
    art.line(previous, point, step === length ? '#ffffff' : STEEL);
    if (weapon !== 0 && step < length - 1) art.set(Math.floor(point[0] + dy), Math.floor(point[1] - dx), STEEL_DARK);
    previous = point;
  }
}

const hex = (r, g, b) => `#${[r, g, b].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`;
const luma = (r, g, b) => .299 * r + .587 * g + .114 * b;

// One generated body as colour strings (null where empty), its coat and
// headscarf recoloured to the look: each marked pixel keeps its brightness
// relative to the marked pixels' mean, so the art's folds stay.
// `bodies` is the decoded sheet, { width, height, data } (RGBA).
export function bodyPixels(bodies, look, bodyPose) {
  const { width, height } = FENCER_ART;
  const row = BODY_ROWS.indexOf(look.body);
  const column = BODY_POSES.indexOf(bodyPose);
  if (row < 0 || column < 0 || (row + 1) * height > bodies.height || (column + 1) * width > bodies.width) return null;
  const at = (x, y) => ((row * height + y) * bodies.width + column * width + x) * 4;
  const means = {};
  for (const mark of [COAT_ALPHA, CAP_ALPHA]) {
    let sum = 0, count = 0;
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const index = at(x, y);
      if (bodies.data[index + 3] === mark) { sum += luma(bodies.data[index], bodies.data[index + 1], bodies.data[index + 2]); count += 1; }
    }
    means[mark] = count ? sum / count : 1;
  }
  const targets = { [COAT_ALPHA]: look.coat, [CAP_ALPHA]: look.hatColor };
  const pixels = new Array(width * height).fill(null);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const index = at(x, y);
    const [r, g, b, alpha] = bodies.data.slice(index, index + 4);
    if (alpha < 200) continue;
    const target = targets[alpha];
    if (target) {
      const factor = luma(r, g, b) / means[alpha];
      const [tr, tg, tb] = [1, 3, 5].map((offset) => parseInt(target.slice(offset, offset + 2), 16));
      pixels[y * width + x] = hex(tr * factor, tg * factor, tb * factor);
    } else pixels[y * width + x] = hex(r, g, b);
  }
  return pixels;
}

// Paints a fencer facing right (towards +x); `mirror` turns him to face left.
// `weapon` is the weapon index; `shade` darkens a figure in the crowd.
// `bodies`, the decoded body sheet, gives him his generated body; without it
// (until the sheet loads, and in the Node tests) a code-drawn body stands in.
export function paintFencer({ move = 0, frame = 0, look = LOOKS.player, weapon = 2, mirror = false, shade = 0, bodies = null }) {
  const { width, height, anchorX, groundY } = FENCER_ART;
  const art = createArt(width, height);
  const pose = fencerPose(move, frame);
  const { legs, arm } = pose;
  const body = bodies ? bodyPixels(bodies, look, pose.body) : null;
  const x0 = anchorX + legs.lean;
  const hipY = groundY - 17 + legs.crouch;
  const shoulderY = groundY - 29 + legs.crouch + (pose.kneel ? 1 : 0);
  const torsoX = anchorX + legs.lean + (pose.strike ? 1 : 0);
  const breeches = look.breeches;
  const coat = look.coat ?? look.shirt;
  const coatDark = look.coatDark ?? look.shirtDark;

  if (body) body.forEach((colour, index) => { art.pixels[index] = colour; });
  else paintCodeBody();
  // The code-drawn body: legs, back arm, torso, head and headgear.
  function paintCodeBody() {
    // Legs: the back leg first, then the front leg (thigh, shin, boot).
    const leg = (footX, kneeing) => {
      const foot = [anchorX + footX, groundY];
      const knee = kneeing ? [anchorX + footX - 1, groundY - 1] : [(x0 + foot[0]) / 2 + (footX > 0 ? 1 : -1), (hipY + groundY) / 2 - 1];
      thickLine(art, [x0, hipY], knee, breeches);
      thickLine(art, knee, [foot[0], groundY - 3], kneeing ? breeches : BOOT);
      if (kneeing) art.rect(knee[0] - 2, groundY - 2, 4, 2, BOOT);
      else art.rect(foot[0] - (footX > 0 ? 0 : 1), groundY - 1, 4, 2, BOOT);
    };
    leg(legs.back, pose.kneel);
    leg(legs.front, false);

    // Back arm raised behind for balance (or hanging when yielding).
    const backShoulder = [torsoX - 2, shoulderY + 1];
    if (pose.kind === 'yield') thickLine(art, backShoulder, [torsoX - 4, shoulderY + 10], coatDark);
    else {
      thickLine(art, backShoulder, [torsoX - 7, shoulderY + 1], coatDark);
      thickLine(art, [torsoX - 7, shoulderY + 1], [torsoX - 9, shoulderY - 4], coatDark);
      art.rect(torsoX - 10, shoulderY - 6, 2, 2, SKIN_DARK);
    }

    // Torso, with coat tails and a belt.
    art.polygon([[torsoX - 3, shoulderY], [torsoX + 4, shoulderY], [torsoX + 3, hipY + 1], [torsoX - 4, hipY + 1]], coat);
    if (look.coat) {
      art.polygon([[torsoX - 4, hipY], [torsoX + 3, hipY], [torsoX + 4, hipY + 6], [torsoX - 6, hipY + 6]], coatDark);
      art.line([torsoX + 3, shoulderY + 1], [torsoX + 3, hipY + 5], look.trim);
    } else {
      art.line([torsoX - 1, shoulderY + 2], [torsoX - 2, hipY], coatDark);
    }
    if (look.sash) {
      // A sash knotted at the hip, its end hanging down.
      art.rect(torsoX - 4, hipY - 1, 8, 2, look.sash);
      art.rect(torsoX - 4, hipY + 1, 1, 3, look.sash);
    } else {
      art.rect(torsoX - 4, hipY - 1, 8, 2, '#3a2a1a');
      art.set(torsoX, hipY - 1, GOLD);
    }
    if (look.trim && look.coat && look.trim === GOLD) {
      // Brass buttons down the coat's front.
      for (let y = shoulderY + 2; y < hipY - 1; y += 3) art.set(torsoX + 2, y, GOLD);
    }

    // Head and headgear.
    const headX = torsoX + 1;
    const headTop = shoulderY - 8;
    art.rect(headX - 1, shoulderY - 2, 3, 2, SKIN_DARK);
    art.rect(headX - 2, headTop + 1, 5, 5, SKIN);
    art.set(headX + 3, headTop + 3, SKIN);
    art.set(headX + 2, headTop + 2, '#2a1a12');
    art.rect(headX - 2, headTop + 5, 2, 1, '#5a3a22');
    if (look.beard) {
      // A short beard along the jaw.
      art.rect(headX - 1, headTop + 5, 4, 1, look.hatColor);
      art.set(headX + 2, headTop + 4, look.hatColor);
    }
    drawHat(art, look, headX, headTop + 1);
  }

  // Sword arm and blade (y up in the pose tables).
  const shoulder = body
    ? [anchorX + BODY_SHOULDER[pose.body][0], groundY + BODY_SHOULDER[pose.body][1]]
    : [torsoX + 2, shoulderY + 2];
  const hand = [shoulder[0] + arm.hand[0], shoulder[1] - arm.hand[1]];
  const elbow = [(shoulder[0] + hand[0]) / 2, (shoulder[1] + hand[1]) / 2 + 2];
  thickLine(art, shoulder, elbow, coat);
  thickLine(art, elbow, hand, coat);
  if (pose.kind === 'yield' && pose.kneel) {
    // The sword lies on the ground before him.
    art.line([anchorX + 6, groundY], [anchorX + 6 + BLADE_LENGTH[weapon], groundY], STEEL);
    art.line([anchorX + 6, groundY - 2], [anchorX + 6, groundY + 1], GOLD);
  } else drawBlade(art, hand, arm.angle, BLADE_LENGTH[weapon], weapon);
  art.rect(Math.floor(hand[0]) - 1, Math.floor(hand[1]) - 1, 2, 2, SKIN);

  let pixels = art.pixels;
  if (shade) pixels = pixels.map((color) => (color ? darken(color, shade) : color));
  if (mirror) pixels = mirrorPixels(pixels, width, height);
  return {
    pixels: rasterize({ pixels, width, height }),
    width, height,
    anchor: { x: mirror ? width - 1 - anchorX : anchorX, y: groundY },
  };
}

function mirrorPixels(pixels, width, height) {
  const out = new Array(pixels.length);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) out[y * width + x] = pixels[y * width + width - 1 - x];
  return out;
}

function darken(hex, amount) {
  const channel = (index) => Math.round(parseInt(hex.slice(index, index + 2), 16) * (1 - amount));
  return `#${[1, 3, 5].map((index) => channel(index).toString(16).padStart(2, '0')).join('')}`;
}

// A small star where a blow lands or blades meet.
export function paintSpark(kind = 'hit') {
  const art = createArt(9, 9);
  const color = kind === 'hit' ? '#f6d36b' : '#f4f2ea';
  const core = kind === 'hit' ? '#fff6d8' : '#ffffff';
  art.line([0, 4], [8, 4], color); art.line([4, 0], [4, 8], color);
  art.line([1, 1], [7, 7], color); art.line([7, 1], [1, 7], color);
  art.rect(3, 3, 3, 3, core);
  return { pixels: rasterize(art, { shadow: false }), width: 9, height: 9, anchor: { x: 4, y: 4 } };
}

// The backdrop art (sword-renderer.mjs) is wide enough for the whole fight
// (0-520 fight units) and bottom-aligned on the ground line.
export const BACKDROP = { width: 260, height: 132, groundY: 112 };
