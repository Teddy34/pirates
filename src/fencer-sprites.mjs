// Pixel-art fencers and fight backdrops for sword fights, in the style of the
// ship and town sprites. DOM-free: each paint returns RGBA pixels plus the
// anchor pixel (between the feet for a fencer). Presentation only; no rule
// depends on anything in this module. Original art: nothing here comes from
// the original game's sprites.

import { createArt, rasterize } from './pixel-art.mjs';
import { MOVE, MOVE_FRAMES } from './sword-mechanics.mjs';

export const FENCER_ART = { width: 64, height: 52, anchorX: 26, groundY: 49 };
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

// Looks: coat colours, headgear and clothes.
export const LOOKS = {
  player: { coat: '#7c2a2a', coatDark: '#55191b', trim: GOLD, breeches: '#c9b48a', hat: 'tricorne', hatColor: '#1f1b1a', feather: '#e9e2cf' },
  captain: { coat: '#3e4f7a', coatDark: '#27324f', trim: GOLD, breeches: '#bfae86', hat: 'tricorne', hatColor: '#1f1b1a' },
  guard: { coat: '#a8331f', coatDark: '#6e2013', trim: '#e3bd43', breeches: '#3f3a30', hat: 'morion', hatColor: '#c3c8cc' },
  villain: { coat: '#2a2630', coatDark: '#16131a', trim: '#8a2f6b', breeches: '#2f2a33', hat: 'wide', hatColor: '#141215', feather: '#8a2f6b' },
  mutineer: { coat: null, shirt: '#e9e0c8', shirtDark: '#bfb399', breeches: '#5a4a35', hat: 'bandana', hatColor: '#b8322a' },
  sparring: { coat: null, shirt: '#e9e0c8', shirtDark: '#bfb399', breeches: '#6b5a40', hat: 'bandana', hatColor: '#2f5a8a' },
  sailor: { coat: null, shirt: '#d9d2bd', shirtDark: '#a99f86', breeches: '#3d4a5e', hat: 'bandana', hatColor: '#9b3a2a' },
  soldier: { coat: '#a8331f', coatDark: '#6e2013', trim: '#e3bd43', breeches: '#3f3a30', hat: 'morion', hatColor: '#c3c8cc' },
};

// Each nation's coat for guards, soldiers and captains (an opponent's flag).
export function lookForOpponent(title, nation, nationColors) {
  const base = { Guard: LOOKS.guard, Suitor: LOOKS.captain, Mutineer: LOOKS.mutineer, Villain: LOOKS.villain, 'Sparring partner': LOOKS.sparring }[title] ?? LOOKS.captain;
  const colors = nationColors?.[nation];
  if (!colors || !base.coat || title === 'Villain') return base;
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
const strikeFrame = (move) => (move === MOVE.slashHigh ? 4 : move >= MOVE.thrustMid ? 2 : 3);

// The pose of a fencer for one animation frame of one move.
export function fencerPose(move, frame) {
  const line = move >= 0 && move < 12 ? move % 3 : 0;
  if (move === MOVE.yield) {
    const t = Math.min(1, frame / 4);
    return { kind: 'yield', kneel: frame >= 4, arm: blend(GUARD_POSE[1], { hand: [4, -10], angle: -70 }, t), legs: frame >= 4 ? { front: 6, back: -5, crouch: 7, lean: 1 } : STANCE };
  }
  if (move >= MOVE.slashMid && move <= MOVE.slashHigh) {
    const hit = strikeFrame(move);
    if (frame < hit - 1) return { arm: blend(GUARD_POSE[line], WINDUP_POSE[line], (frame + 1) / (hit - 1)), legs: STANCE };
    if (frame === hit - 1) return { arm: blend(WINDUP_POSE[line], STRIKE_POSE[line], .5), legs: STANCE };
    if (frame === hit) return { arm: STRIKE_POSE[line], legs: LUNGE, strike: true };
    return { arm: blend(STRIKE_POSE[line], GUARD_POSE[line], (frame - hit) / (MOVE_FRAMES[move] - hit)), legs: frame === hit + 1 ? LUNGE : STANCE };
  }
  if (move >= MOVE.thrustMid && move <= MOVE.thrustHigh) {
    if (frame === 0) return { arm: DRAW_POSE[line], legs: STANCE };
    if (frame === 1) return { arm: blend(DRAW_POSE[line], THRUST_POSE[line], .5), legs: LUNGE };
    if (frame === 2) return { arm: THRUST_POSE[line], legs: LUNGE, strike: true };
    return { arm: blend(THRUST_POSE[line], GUARD_POSE[line], .5), legs: STANCE };
  }
  if (move === MOVE.advance || move === MOVE.retreat) {
    const phase = (frame / 6) * Math.PI * 2 * (move === MOVE.retreat ? -1 : 1);
    return { arm: GUARD_POSE[0], legs: { front: 3 + Math.round(3 * Math.cos(phase)), back: -4 + Math.round(3 * Math.cos(phase + Math.PI)), crouch: frame % 3 === 1 ? 2 : 1, lean: 0 } };
  }
  if (move >= MOVE.backMid && move <= MOVE.backHigh && frame === 0) {
    return { arm: GUARD_POSE[line], legs: { front: 2, back: -8, crouch: 2, lean: -1 } };
  }
  // A stand guard sways a little with its frame (the guard bits relax too).
  return { arm: GUARD_POSE[line], legs: { ...STANCE, crouch: frame >= 4 ? 2 : 1 } };
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

// Paints a fencer facing right (towards +x); `mirror` turns him to face left.
// `weapon` is the weapon index; `shade` darkens a figure in the crowd.
export function paintFencer({ move = 0, frame = 0, look = LOOKS.player, weapon = 2, mirror = false, shade = 0 }) {
  const { width, height, anchorX, groundY } = FENCER_ART;
  const art = createArt(width, height);
  const pose = fencerPose(move, frame);
  const { legs, arm } = pose;
  const x0 = anchorX + legs.lean;
  const hipY = groundY - 17 + legs.crouch;
  const shoulderY = groundY - 29 + legs.crouch + (pose.kneel ? 1 : 0);
  const torsoX = anchorX + legs.lean + (pose.strike ? 1 : 0);
  const breeches = look.breeches;
  const coat = look.coat ?? look.shirt;
  const coatDark = look.coatDark ?? look.shirtDark;

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
  art.rect(torsoX - 4, hipY - 1, 8, 2, '#3a2a1a');
  art.set(torsoX, hipY - 1, GOLD);

  // Head and headgear.
  const headX = torsoX + 1;
  const headTop = shoulderY - 8;
  art.rect(headX - 1, shoulderY - 2, 3, 2, SKIN_DARK);
  art.rect(headX - 2, headTop + 1, 5, 5, SKIN);
  art.set(headX + 3, headTop + 3, SKIN);
  art.set(headX + 2, headTop + 2, '#2a1a12');
  art.rect(headX - 2, headTop + 5, 2, 1, '#5a3a22');
  drawHat(art, look, headX, headTop + 1);

  // Sword arm and blade (y up in the pose tables).
  const shoulder = [torsoX + 2, shoulderY + 2];
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

// Backdrops are wide enough for the whole fight (0-520 fight units) and
// bottom-aligned on the ground line.
export const BACKDROP = { width: 260, height: 132, groundY: 112 };

export function paintBackdrop(scene) {
  const { width, height, groundY } = BACKDROP;
  const art = createArt(width, height);
  const bands = (colors, top, bottom) => {
    const step = (bottom - top) / colors.length;
    colors.forEach((color, index) => art.rect(0, Math.round(top + index * step), width, Math.ceil(step) + 1, color));
  };
  if (scene === 'alley' || scene === 'walls') {
    bands(['#14203a', '#1a2847', '#223258', '#2b3c66'], 0, 70);
    for (let index = 0; index < 28; index += 1) art.set((index * 89) % width, (index * 37) % 50, '#f1ead2');
    art.rect(200, 10, 6, 6, '#efe6c4'); art.rect(201, 9, 4, 8, '#efe6c4');
  } else {
    bands(['#8fc3d8', '#a5d0de', '#bcdbe1', '#d3e5e0'], 0, 56);
    bands(['#2d7189', '#25657c', '#1f5a70'], 56, 78);
    for (let index = 0; index < 18; index += 1) art.rect((index * 53) % width, 60 + ((index * 7) % 16), 4, 1, '#8ac2cf');
  }
  if (scene === 'alley') {
    // House fronts with lit windows and doors, then the cobbles.
    const houses = [[0, 22, 58, '#6f5a45'], [58, 32, 52, '#7d6750'], [110, 14, 46, '#665241'], [156, 28, 54, '#76604b'], [210, 18, 50, '#6a5544']];
    for (const [x, top, w, color] of houses) {
      art.rect(x, top, w, groundY - top, color);
      art.rect(x, top - 4, w, 4, '#4a3a2c');
      for (let wx = x + 6; wx < x + w - 8; wx += 16) {
        art.rect(wx, top + 10, 6, 8, (wx + top) % 3 ? '#f0c55f' : '#2a2a2f');
        art.rect(wx, top + 10, 6, 1, '#3a2c20');
      }
      art.rect(x + Math.floor(w / 2) - 4, groundY - 18, 9, 18, '#3e2b1c');
      art.rect(x + Math.floor(w / 2) - 4, groundY - 18, 9, 1, '#2a1c12');
    }
    art.rect(0, groundY, width, height - groundY, '#5d5550');
    for (let row = groundY + 1; row < height; row += 4) {
      for (let col = (row % 8) * 2; col < width; col += 9) art.rect(col, row, 6, 2, '#6f6660');
    }
  } else if (scene === 'walls') {
    art.rect(0, 30, width, groundY - 30, '#8b8577');
    for (let x = 0; x < width; x += 16) art.rect(x, 22, 9, 8, '#8b8577');
    for (let row = 34; row < groundY; row += 8) for (let col = (row % 16); col < width; col += 16) art.rect(col, row, 14, 1, '#6f6a5e');
    art.rect(120, 2, 2, 22, '#3a2a1a');
    art.rect(122, 3, 14, 9, '#e3bd43'); art.rect(122, 6, 14, 3, '#a8331f');
    art.rect(0, groundY, width, height - groundY, '#7a6648');
    for (let col = 0; col < width; col += 7) art.set(col, groundY + 3 + (col % 5), '#5e4e36');
  } else {
    // A ship's waist: masts, shrouds and the bulwark, then the deck planks.
    for (const mast of [70, 190]) {
      art.rect(mast, 0, 5, groundY - 30, '#5a3d24');
      art.rect(mast - 30, 8, 65, 3, '#5a3d24');
      art.rect(mast - 26, 11, 57, 18, '#efe2bc');
      art.rect(mast - 26, 27, 57, 2, '#c9b27c');
      for (let line = -24; line <= 24; line += 8) art.line([mast + 2, 2], [mast + 2 + line * 1.4, groundY - 30], '#3a2a1a');
    }
    art.rect(0, groundY - 30, width, 4, '#8a5a32');
    art.rect(0, groundY - 26, width, 18, '#6b4226');
    for (let x = 4; x < width; x += 12) art.rect(x, groundY - 24, 3, 14, '#4f301b');
    art.rect(0, groundY - 8, width, 8, '#7a4c2b');
    art.rect(0, groundY, width, height - groundY, '#a0703f');
    for (let row = groundY + 3; row < height; row += 4) art.rect(0, row, width, 1, '#86592f');
    for (let row = groundY; row < height; row += 4) for (let col = (row * 7) % 40; col < width; col += 40) art.set(col, row + 1, '#6b4426');
  }
  return { pixels: rasterize(art, { outline: null, shadow: false }), width, height, anchor: { x: 0, y: groundY } };
}
