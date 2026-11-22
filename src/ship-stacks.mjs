// Sprite-stacked ships (the sprite-stacking skill in tools/sprite-stacking):
// each ship type and rig state is a strip of top-down slices carved from
// four code-drawn orthographic views by tools/build_ship_stacks.py
// (assets/sprites/ship-stacks-<size>.png, rows in ship-stack-data.mjs).
// Drawing a ship rotates every slice by its heading, squashes it for the
// oblique camera and lifts it one art pixel per slice, bottom to top, into
// one art-pixel buffer; the buffer is outlined once, as a whole, and gets
// the usual shadow (pixel-art.mjs). The nation's pennant is painted at the
// mainmast's head; sails being changed are drawn in a darker canvas and a
// damaged rig shows shot holes. The `battle` size serves the sea battle,
// the `map` size the sailing map.
// DOM-free and presentation only: the atlas pixels come in as RGBA.

import { FLAG_DARK, rasterize } from './pixel-art.mjs';
import { SHIP_STACK_DATA } from './ship-stack-data.mjs';

// Screen y per unit of deck seen from above: the oblique camera of the
// flat sprites (ship-sprites.mjs SLANT). Each slice lifts one art pixel.
export const SHIP_STACK_SQUASH = .6;
const SPACING = 1;

// Headings are drawn in 64 steps (the flat sprites used the original's 16).
export const SHIP_STACK_TURNS = 64;

export function shipStackTurn(heading) {
  return ((Math.round(heading) + 2) >> 2) & (SHIP_STACK_TURNS - 1);
}

const CHANGING = { '#f2e6c2': '#c2a874', '#cdb581': '#9f8656', '#d9c79a': '#b09a6c' };
const HOLE = '#4f3f2c';
const SCORCH = '#1c1612';
const POLE = '#3a2614';

export function shipStackSize(size) {
  return SHIP_STACK_DATA.sizes[size];
}

// The atlas row of a ship type and rig state: `sails` full, battle or
// furled; a rig at damage level 2 or more has lost its foremast.
export function shipStackRow(size, type, sails = 'full', dismasted = false) {
  const { rows } = shipStackSize(size);
  const clamped = Math.max(0, Math.min(7, type | 0));
  const state = ['full', 'battle', 'furled'].includes(sails) ? sails : 'full';
  return rows.findIndex((row) => row.type === clamped && row.sails === state && row.dismasted === dismasted);
}

const hex = (r, g, b) => `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;

// Paints a stacked ship from `atlas` ({ width, height, pixels } of the
// size's PNG). Options follow paintBattleShipSprite: `nation` is
// { key, color, dark }, `wind` the angle byte the wind blows towards,
// `damage` the battle's damage (16 per level), `changing` sails being
// raised or lowered. Returns { pixels, width, height, anchor }, the anchor
// being the hull's centre at the waterline.
export function paintStackedShip(atlas, { size = 'battle', type, heading, sails = 'full', changing = false, nation, wind = 0, damage = 0 }) {
  const cell = shipStackSize(size);
  const level = Math.min(4, damage >> 4);
  const rowIndex = shipStackRow(size, type, sails, level >= 2);
  const row = cell.rows[rowIndex];
  const { width: W, length: L, slices } = cell;
  if (atlas.width !== W * slices || atlas.height % L !== 0) throw new Error('ship stack atlas does not match its data');
  const turn = (shipStackTurn(heading) / SHIP_STACK_TURNS) * Math.PI * 2 + Math.PI;
  const cos = Math.cos(turn), sin = Math.sin(turn);
  const cx = (W - 1) / 2, cy = (L - 1) / 2;
  const sailColours = new Set(SHIP_STACK_DATA.sails);

  // A buffer big enough for any heading, with room for the pennant.
  const radius = Math.ceil(Math.hypot(W, L) / 2) + 1;
  const ax = radius + 8, ay = Math.ceil(radius * SHIP_STACK_SQUASH) + slices + 6;
  const bw = 2 * ax + 1, bh = ay + Math.ceil(radius * SHIP_STACK_SQUASH) + 4;
  const colours = new Array(bw * bh).fill(null);
  const sail = new Uint8Array(bw * bh);
  const low = new Uint8Array(bw * bh);
  const top = rowIndex * L;

  for (let z = 0; z < slices; z += 1) {
    const lift = Math.round(z * SPACING);
    const sliceLeft = z * W;
    for (let py = 0; py < bh; py += 1) {
      const v = (py - ay + lift) / SHIP_STACK_SQUASH;
      for (let px = 0; px < bw; px += 1) {
        const u = px - ax;
        // Undo the turn: screen (u, v) back to the slice's (x, y).
        const sx = Math.round(u * cos + v * sin + cx);
        const sy = Math.round(-u * sin + v * cos + cy);
        if (sx < 0 || sy < 0 || sx >= W || sy >= L) continue;
        const offset = ((top + sy) * atlas.width + sliceLeft + sx) * 4;
        if (atlas.pixels[offset + 3] < 128) continue;
        const index = py * bw + px;
        const colour = hex(atlas.pixels[offset], atlas.pixels[offset + 1], atlas.pixels[offset + 2]);
        colours[index] = changing && CHANGING[colour] ? CHANGING[colour] : colour;
        sail[index] = sailColours.has(colour) ? 1 : 0;
        low[index] = z >= 1 && z <= 2 ? 1 : 0;
      }
    }
  }

  // Shot holes in the canvas, and scorched planks on a battered hull,
  // spread evenly over the visible pixels.
  const pick = (mask, count, colour) => {
    const spots = [];
    for (let index = 0; index < mask.length; index += 1) if (mask[index] && colours[index]) spots.push(index);
    if (!spots.length || !count) return;
    const step = spots.length / count;
    for (let n = 0; n < count; n += 1) colours[spots[Math.floor(n * step + step / 2)]] = colour;
  };
  if (level >= 1) pick(sail, Math.min(12, 2 + 3 * level), HOLE);
  if (level >= 3) pick(low, 2 * (level - 2), SCORCH);

  // The pennant at the mainmast's head.
  if (nation && row) {
    const [mw, ml, mz] = row.masthead;
    const x = mw - cx, y = ml - cy;
    const u = x * cos - y * sin, v = (x * sin + y * cos) * SHIP_STACK_SQUASH - mz * SPACING;
    paintPennant((px, py, colour) => {
      if (px >= 0 && py >= 0 && px < bw && py < bh) colours[py * bw + px] = colour;
    }, nation, Math.round(ax + u), Math.round(ay + v), wind);
  }

  // Crop to what was painted, with room for the outline and shadow.
  let minX = bw, minY = bh, maxX = -1, maxY = -1;
  for (let py = 0; py < bh; py += 1) {
    for (let px = 0; px < bw; px += 1) {
      if (colours[py * bw + px] === null) continue;
      minX = Math.min(minX, px); maxX = Math.max(maxX, px);
      minY = Math.min(minY, py); maxY = Math.max(maxY, py);
    }
  }
  const left = minX - 2, upper = minY - 2;
  const width = maxX - minX + 6, height = maxY - minY + 6;
  const cropped = new Array(width * height).fill(null);
  for (let py = minY; py <= maxY; py += 1) {
    for (let px = minX; px <= maxX; px += 1) cropped[(py - upper) * width + px - left] = colours[py * bw + px];
  }
  return { pixels: rasterize({ pixels: cropped, width, height }), width, height, anchor: { x: ax - left, y: ay - upper } };
}

// A pennant at the masthead, streaming to the downwind side of the screen
// (as on the flat sprites).
function paintPennant(set, nation, col, top, wind) {
  const drift = Math.sin((wind / 256) * Math.PI * 2);
  const side = drift >= 0 ? 1 : -1;
  const length = 3 + Math.round(2 * Math.abs(drift));
  const row = top - 1;
  set(col, row, POLE);
  set(col, row + 1, POLE);
  for (let step = 1; step <= length; step += 1) {
    const x = col + side * step;
    set(x, row - 1, nation.color);
    set(x, row, step === 2 ? FLAG_DARK[nation.key] ?? nation.dark : nation.color);
    if (step < length) set(x, row + 1, nation.dark);
  }
}
