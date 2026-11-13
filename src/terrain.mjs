// Pixel-art terrain painter for the sailing map. DOM-free: paints RGBA chunks
// from the navigation map so the coastline drawn is the coastline sailed.
// Presentation only; no rule depends on anything in this module.
import { CELL, PIXEL, PIXELS_PER_CELL, pixelClassAt } from './world-map.mjs';

export const TERRAIN_CHUNK_CELLS = 32;
export const TERRAIN_PIXELS_PER_CELL = PIXELS_PER_CELL;
const CHUNK_PIXELS = TERRAIN_CHUNK_CELLS * TERRAIN_PIXELS_PER_CELL;
// Fine coast distances are measured this far past the chunk edge, so the
// surf and beach bands join seamlessly across chunks.
const PAD = 24;

const rgb = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
const COLORS = Object.fromEntries(Object.entries({
  abyss: '#0b3646', deep: '#0f4456', sea: '#145466', mid: '#1a6676', reach: '#22798a',
  shelf: '#2b8e98', surf: '#47aba6', lagoon: '#5cc0b1', foam: '#e4f3ea', glint: '#2a7a8c', glintDeep: '#1d6070',
  wetSand: '#b6905a', sand: '#e2c47f', sandDark: '#cfad69', dune: '#d8b872',
  grassLight: '#8db45a', grass: '#78a24e', grassDark: '#628c43', scrub: '#9aa45c',
  canopyLight: '#5f9a46', canopy: '#467d3a', canopyDark: '#2f5a2c', shade: '#3b6431',
  rock: '#8f8a62', rockLight: '#aaa47a', rockDark: '#6e6a4b', peak: '#c9c3a0',
}).map(([name, hex]) => [name, rgb(hex)]));

const pack = ([r, g, b]) => (r << 16) | (g << 8) | b;
const WATER_NAMES = ['abyss', 'deep', 'sea', 'mid', 'reach', 'shelf', 'surf', 'lagoon', 'foam', 'glint', 'glintDeep'];
// Packed RGB values each medium may be painted with, so a test can check
// that every land pixel looks like land and every sea pixel like sea.
export const TERRAIN_TONES = Object.freeze({
  water: new Set(WATER_NAMES.map((name) => pack(COLORS[name]))),
  land: new Set(Object.keys(COLORS).filter((name) => !WATER_NAMES.includes(name)).map((name) => pack(COLORS[name]))),
});

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((value) => (value + .5) / 16);
const dither = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

function hash(x, y, seed = 0) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(x, y, scale, seed) {
  const fx = x / scale, fy = y / scale;
  const ix = Math.floor(fx), iy = Math.floor(fy);
  const tx = fx - ix, ty = fy - iy;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const top = hash(ix, iy, seed) + (hash(ix + 1, iy, seed) - hash(ix, iy, seed)) * sx;
  const bottom = hash(ix, iy + 1, seed) + (hash(ix + 1, iy + 1, seed) - hash(ix, iy + 1, seed)) * sx;
  return top + (bottom - top) * sy;
}

// Two-pass chamfer distance (in cells) from every cell to the nearest cell of
// the other medium. Water cells measure to land, land cells to water; mixed
// cells are the coast itself.
export function buildCoastField(map) {
  const { width, height, cells } = map;
  const sea = new Float32Array(width * height);
  const land = new Float32Array(width * height);
  const far = width + height;
  for (let index = 0; index < cells.length; index += 1) {
    sea[index] = cells[index] === CELL.WATER ? far : 0;
    land[index] = cells[index] === CELL.LAND || cells[index] === CELL.TOWN ? far : 0;
  }
  chamfer(sea, width, height, 1, Math.SQRT2);
  chamfer(land, width, height, 1, Math.SQRT2);
  return { width, height, sea, land };
}

// One chamfer pass. `step` +1 scans forward and relaxes each cell from its
// already-visited neighbours above and to the left; -1 scans backward and
// mirrors them (below and to the right).
function chamferPass(field, width, height, straight, diagonal, step) {
  const first = step > 0 ? 0 : height - 1;
  for (let row = 0; row < height; row += 1) {
    const y = first + row * step;
    for (let column = 0; column < width; column += 1) {
      const x = step > 0 ? column : width - 1 - column;
      const index = y * width + x;
      let value = field[index];
      if (!value) continue;
      const back = x - step; // the visited neighbour along the row
      const ahead = x + step;
      const previousRow = y - step;
      const rowInside = previousRow >= 0 && previousRow < height;
      if (back >= 0 && back < width) value = Math.min(value, field[index - step] + straight);
      if (rowInside) {
        const above = index - step * width;
        value = Math.min(value, field[above] + straight);
        if (back >= 0 && back < width) value = Math.min(value, field[above - step] + diagonal);
        if (ahead >= 0 && ahead < width) value = Math.min(value, field[above + step] + diagonal);
      }
      field[index] = value;
    }
  }
}

function chamfer(field, width, height, straight, diagonal) {
  chamferPass(field, width, height, straight, diagonal, 1);
  chamferPass(field, width, height, straight, diagonal, -1);
}

// Bilinear sample at a world-cell position, with values held at cell centres.
function sampleField(field, coast, x, y) {
  const fx = Math.min(Math.max(x - .5, 0), coast.width - 1.001);
  const fy = Math.min(Math.max(y - .5, 0), coast.height - 1.001);
  const ix = Math.floor(fx), iy = Math.floor(fy);
  const tx = fx - ix, ty = fy - iy;
  const index = iy * coast.width + ix;
  const top = field[index] + (field[index + 1] - field[index]) * tx;
  const bottom = field[index + coast.width] + (field[index + coast.width + 1] - field[index + coast.width]) * tx;
  return top + (bottom - top) * ty;
}

// Mix between two palette colours with an ordered dither, so gradients stay
// in a fixed retro palette instead of blending smoothly.
const pick = (from, to, t, x, y) => (t > dither(x, y) ? to : from);

// Open water deepens through these bands, by depth in cells.
const DEPTH_BANDS = [
  [0, COLORS.shelf], [.7, COLORS.reach], [1.8, COLORS.mid], [4, COLORS.sea], [9, COLORS.deep], [18, COLORS.abyss],
];

function depthColor(px, py, depthCells) {
  const depth = depthCells + (valueNoise(px, py, 40, 5) - .5) * 1.4;
  for (let index = 0; index < DEPTH_BANDS.length - 1; index += 1) {
    const [start, from] = DEPTH_BANDS[index];
    const [end, to] = DEPTH_BANDS[index + 1];
    if (depth < end) return pick(from, to, (depth - start) / (end - start), px, py);
  }
  return DEPTH_BANDS[DEPTH_BANDS.length - 1][1];
}

// Short wave crests: one possible dash per 12x8 block, offset per block.
function isWaveCrest(px, py) {
  const bx = Math.floor(px / 12), by = Math.floor(py / 8);
  if (hash(bx, by, 17) >= .32) return false;
  const dashX = bx * 12 + Math.floor(hash(bx, by, 19) * 6);
  const dashY = by * 8 + Math.floor(hash(bx, by, 23) * 6);
  const dx = px - dashX;
  return (py === dashY && dx >= 1 && dx <= 3) || (py === dashY + 1 && (dx === 0 || dx === 4));
}

function paintWater(px, py, cls, coastPixels, depthCells) {
  if (coastPixels <= 1.5 && valueNoise(px, py, 5, 7) > .28) return COLORS.foam;
  if (coastPixels <= 2.5 && hash(px, py, 3) > .55) return COLORS.foam;
  if (coastPixels <= 6) return pick(COLORS.lagoon, COLORS.surf, (coastPixels - 2.5) / 3.5, px, py);
  if (cls === PIXEL.SHALLOW) return pick(COLORS.surf, COLORS.shelf, valueNoise(px, py, 9, 11), px, py);
  const base = depthColor(px, py, depthCells);
  if (!isWaveCrest(px, py)) return base;
  return depthCells > 6 ? COLORS.glintDeep : COLORS.glint;
}

// Hills rise with distance inland, broken up by two octaves of noise.
function elevationAt(px, py, inlandCells) {
  return inlandCells * .85 + (valueNoise(px, py, 56, 41) - .5) * 3.4 + (valueNoise(px, py, 17, 43) - .5) * 1.2;
}

// Bare rock above the tree line, shaded by `light` (-1 to 1, lit from the
// north-west), with snowy peaks on the lit faces.
function rockColor(px, py, elevation, light) {
  if (elevation < 5.6 && hash(px, py, 37) > .5) return COLORS.rockDark;
  let tone = COLORS.rock;
  if (light > .18) tone = COLORS.rockLight;
  else if (light < -.18) tone = COLORS.rockDark;
  if (elevation > 7.5 && light > -.1) return pick(tone, COLORS.peak, (elevation - 7.5) / 1.5, px, py);
  return tone;
}

// `facing` runs from -1 (away from the light) to 1 (toward it).
function canopyColor(facing) {
  if (facing > .55) return COLORS.canopyLight;
  if (facing < -.75) return COLORS.canopyDark;
  return COLORS.canopy;
}

// Trees: jittered 7px grid of round canopies, lit from the north-west, each
// casting a shadow to the south-east. The colour at (px, py), or null where
// no tree or shadow falls.
function treeColor(px, py, forest) {
  for (let gy = Math.floor(py / 7) - 1; gy <= Math.floor(py / 7) + 1; gy += 1) {
    for (let gx = Math.floor(px / 7) - 1; gx <= Math.floor(px / 7) + 1; gx += 1) {
      if (hash(gx, gy, 59) > .2 + (forest - .52) * 2.5) continue;
      const cx = gx * 7 + 3 + Math.floor(hash(gx, gy, 61) * 3) - 1;
      const cy = gy * 7 + 3 + Math.floor(hash(gx, gy, 67) * 3) - 1;
      const dx = px - cx, dy = py - cy;
      const radius = 3.2 + hash(gx, gy, 71) * .8;
      if (dx * dx + dy * dy <= radius * radius) return canopyColor(-(dx + dy) / radius);
      const sx = dx - 1.5, sy = dy - 1.5;
      if (sx * sx + sy * sy <= radius * radius) return COLORS.shade;
    }
  }
  return null;
}

function grassColor(px, py, light) {
  const grass = valueNoise(px, py, 11, 47) + light * .35;
  if (grass > .68) return COLORS.grassLight;
  if (grass < .32) return COLORS.grassDark;
  return COLORS.grass;
}

function paintLand(px, py, coastPixels, inlandCells, light) {
  if (coastPixels <= 1.5) return COLORS.wetSand;
  const beach = 4.5 + valueNoise(px, py, 14, 29) * 3;
  if (coastPixels <= beach) return hash(px, py, 31) > .9 ? COLORS.sandDark : COLORS.sand;
  if (coastPixels <= beach + 2) return pick(COLORS.dune, COLORS.scrub, (coastPixels - beach) / 2, px, py);

  const elevation = elevationAt(px, py, inlandCells);
  if (elevation > 5.2) return rockColor(px, py, elevation, light);
  if (elevation > 4.4) return pick(COLORS.grassDark, COLORS.scrub, (elevation - 4.4) / .8, px, py);
  const forest = valueNoise(px, py, 36, 53) + Math.min(inlandCells, 3) * .08;
  return (forest > .52 && treeColor(px, py, forest)) || grassColor(px, py, light);
}

// A land pixel at terrain pixel (px, py), world cell (wx, wy), `toWater`
// pixels from the nearest water inside the chunk's padded window.
function landPixel(coast, px, py, wx, wy, toWater) {
  const inland = Math.max(toWater / TERRAIN_PIXELS_PER_CELL, sampleField(coast.land, coast, wx, wy) - .5);
  // Slope of the elevation, lit from the north-west.
  const step = 3 / TERRAIN_PIXELS_PER_CELL;
  const light = inland < 2 ? 0 : (
    elevationAt(px + 3, py + 3, sampleField(coast.land, coast, wx + step, wy + step) - .5)
    - elevationAt(px - 3, py - 3, sampleField(coast.land, coast, wx - step, wy - step) - .5)) * .8;
  return paintLand(px, py, toWater, inland, Math.max(-1, Math.min(1, light)));
}

// A water pixel, as landPixel; beyond the padded window the depth comes from
// the world-wide coast field.
function waterPixel(coast, px, py, wx, wy, cls, toLand) {
  const depth = toLand < PAD
    ? toLand / TERRAIN_PIXELS_PER_CELL
    : Math.max(PAD / TERRAIN_PIXELS_PER_CELL, sampleField(coast.sea, coast, wx, wy) - .5);
  return paintWater(px, py, cls, toLand, depth);
}

// Paints one TERRAIN_CHUNK_CELLS square chunk whose top-left cell is
// (chunkX, chunkY) in chunk units. Returns RGBA bytes, CHUNK_PIXELS square.
export function paintTerrainChunk(map, coast, chunkX, chunkY) {
  const size = CHUNK_PIXELS;
  const span = size + PAD * 2;
  const originX = chunkX * size - PAD;
  const originY = chunkY * size - PAD;
  const classes = new Uint8Array(span * span);
  const toLand = new Float32Array(span * span);
  const toWater = new Float32Array(span * span);
  const maxPixelX = map.width * TERRAIN_PIXELS_PER_CELL - 1;
  const maxPixelY = map.height * TERRAIN_PIXELS_PER_CELL - 1;
  for (let y = 0; y < span; y += 1) {
    for (let x = 0; x < span; x += 1) {
      const index = y * span + x;
      // Off-map padding repeats the edge pixel, so open sea at the world
      // edge is not painted with surf against an imaginary coast.
      const sampleX = Math.min(Math.max(originX + x, 0), maxPixelX);
      const sampleY = Math.min(Math.max(originY + y, 0), maxPixelY);
      const cls = pixelClassAt(map, (sampleX + .5) / TERRAIN_PIXELS_PER_CELL, (sampleY + .5) / TERRAIN_PIXELS_PER_CELL);
      classes[index] = cls;
      toLand[index] = cls === PIXEL.LAND ? 0 : PAD;
      toWater[index] = cls === PIXEL.LAND ? PAD : 0;
    }
  }
  chamfer(toLand, span, span, 1, Math.SQRT2);
  chamfer(toWater, span, span, 1, Math.SQRT2);

  const pixels = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y + PAD) * span + x + PAD;
      const px = originX + PAD + x, py = originY + PAD + y;
      const wx = (px + .5) / TERRAIN_PIXELS_PER_CELL, wy = (py + .5) / TERRAIN_PIXELS_PER_CELL;
      const color = classes[index] === PIXEL.LAND
        ? landPixel(coast, px, py, wx, wy, toWater[index])
        : waterPixel(coast, px, py, wx, wy, classes[index], toLand[index]);
      const offset = (y * size + x) * 4;
      pixels[offset] = color[0]; pixels[offset + 1] = color[1]; pixels[offset + 2] = color[2]; pixels[offset + 3] = 255;
    }
  }
  return pixels;
}
