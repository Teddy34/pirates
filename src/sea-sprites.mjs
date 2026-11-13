// Pixel-art sea and wind dial for the sea battle, in the ships' style.
// DOM-free: each painter returns RGBA pixels plus an anchor, like the ships.
// Presentation only; nothing here touches the battle mechanics.

import { createArt, rasterize } from './pixel-art.mjs';

const DEEP = '#124a58';
const SEA = '#165566';
const SWELL = '#195d6d';
const CREST = '#4f9199';
const FOAM = '#a9d3cf';

// Frames in the sea's swell cycle; the renderer picks one by battle frame.
export const SEA_FRAMES = 4;

// A small integer hash, so the sea is the same every time it is painted.
function hash(x, y, salt = 0) {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// 4×4 ordered dither thresholds, for the soft pixel-art swell.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((value) => (value + .5) / 16);

// Wave crests sit one to a cell of this grid, jittered inside it.
const CREST_CELL_WIDTH = 36;
const CREST_CELL_HEIGHT = 18;

// The whole arena at one art pixel per battle pixel. Broad, slow swells
// (ordered-dithered between three blues) run across it, with sparse short
// wave crests: a bright top pixel row over a darker trough, drifting with
// `frame`.
export function paintSea({ width, height, frame = 0 }) {
  const art = createArt(width, height);
  const phase = frame % SEA_FRAMES;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) art.set(x, y, swellColor(x, y, phase));
  }
  // Wave crests on a jittered grid, so they never line up into stripes.
  for (let row = 0; row * CREST_CELL_HEIGHT < height + CREST_CELL_HEIGHT; row += 1) {
    for (let col = -1; col * CREST_CELL_WIDTH < width + CREST_CELL_WIDTH; col += 1) paintCrest(art, col, row, phase);
  }
  return { pixels: rasterize(art, { outline: null, shadow: false }), width, height, anchor: { x: 0, y: 0 } };
}

// Swells lean a little and shift one pixel a frame.
function swellColor(x, y, phase) {
  const swell = Math.sin(((y + x / 6 + phase) / 40) * Math.PI * 2) * .6
    + Math.sin(((x - y / 3) / 90) * Math.PI * 2) * .4;
  const threshold = BAYER[(y & 3) * 4 + (x & 3)];
  if (swell > .35 && (swell - .35) * 1.6 > threshold) return SWELL;
  if (swell < -.45 && (-swell - .45) * 1.6 > threshold) return DEEP;
  return SEA;
}

// The crest, if any, in grid cell (col, row): a bright top row over a
// darker trough. Crests swell and fade over the cycle: longest, with foam,
// at drift 1.
function paintCrest(art, col, row, phase) {
  if (hash(col, row, 7) < .45) return;
  const length = 3 + Math.floor(hash(col, row, 3) * 4);
  const drift = (phase + Math.floor(hash(col, row, 5) * SEA_FRAMES)) % SEA_FRAMES;
  const x0 = col * CREST_CELL_WIDTH + Math.floor(hash(col, row, 1) * (CREST_CELL_WIDTH - length)) + drift;
  const y0 = row * CREST_CELL_HEIGHT + Math.floor(hash(col, row, 2) * (CREST_CELL_HEIGHT - 2));
  const visible = drift === 3 ? length - 2 : length;
  for (let index = 0; index < visible; index += 1) {
    const inner = index > 0 && index < visible - 1;
    art.set(x0 + index, y0, drift === 1 && inner ? FOAM : CREST);
    if (inner) art.set(x0 + index, y0 + 1, DEEP);
  }
}

const RIM = '#c8a25a';
const RIM_DARK = '#7d5f2c';
const FACE = '#0d2f39';
const MARK = '#f3e5c5';
const STREAMER = '#f3e5c5';
const STREAMER_SHADE = '#c7b897';

export const WIND_DIAL_SIZE = 25;

// A brass dial with a north mark and a streamer through its centre, its head
// pointing where the wind blows (the wind value is where it blows towards,
// sailing.md §2). Barbs on the tail count the strength: 1 light .. 3 strong.
export function paintWindDial({ direction = 0, strength = 0 }) {
  const size = WIND_DIAL_SIZE;
  const art = createArt(size, size);
  const c = (size - 1) / 2;
  const radius = c - 1;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const d = Math.hypot(x - c, y - c);
      if (d <= radius - 1.5) art.set(x, y, FACE);
      else if (d <= radius + .5) art.set(x, y, x + y < 2 * c ? RIM : RIM_DARK);
    }
  }
  art.rect(Math.round(c), 2, 1, 2, MARK); // north
  const angle = (direction / 256) * Math.PI * 2;
  const [dx, dy] = [Math.sin(angle), -Math.cos(angle)];
  const [px, py] = [-dy, dx];
  const reach = radius - 3;
  const point = (along, across = 0) => [c + .5 + dx * along + px * across, c + .5 + dy * along + py * across];
  art.line(point(-reach), point(reach - 3), STREAMER);
  art.line(point(-reach, .6), point(reach - 3, .6), STREAMER_SHADE);
  art.polygon([point(reach + .5), point(reach - 4, 3), point(reach - 4, -3)], STREAMER);
  for (let barb = 0; barb <= Math.min(2, strength); barb += 1) {
    const along = -reach + 1 + barb * 2.5;
    art.line(point(along), point(along - 2, 3), STREAMER);
  }
  return { pixels: rasterize(art, { shadow: false }), width: size, height: size, anchor: { x: 0, y: 0 } };
}
