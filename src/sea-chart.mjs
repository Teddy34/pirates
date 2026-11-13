// The sea chart: a full-screen, old-map rendering of the whole Caribbean with
// every town on it. DOM-free: paints RGBA buffers from the navigation map and
// lays out labels; `chart-view.mjs` puts them on screen.
// Presentation only; no rule depends on anything in this module.

import { PIXEL, pixelClassAt } from './world-map.mjs';
import { OUTLINE, createArt, rasterize } from './pixel-art.mjs';

// One chart pixel per world cell, inside a patterned frame.
export const CHART_BORDER = 6;

const SEA = 0;
const SHALLOW = 1;
const LAND = 2;

const PAPER = {
  sea: [233, 216, 172], seaDeep: [226, 207, 160], seaNear: [190, 196, 160], shallow: [207, 207, 166],
  waterLine: [160, 166, 134], wave: [168, 160, 120],
  coast: [61, 42, 24], land: [215, 182, 121], landInner: [201, 163, 101], landDeep: [188, 148, 90], hill: [129, 92, 52],
  rhumb: [176, 150, 108], frameDark: [52, 36, 21], frameLight: [228, 208, 160], frameMid: [140, 103, 60],
};

// Deterministic per-position noise in [0, 1).
function hash(x, y, salt = 0) {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Smooth value noise for paper stains, one lattice point every `size` pixels.
function stain(x, y, size, salt) {
  const gx = Math.floor(x / size);
  const gy = Math.floor(y / size);
  const fx = x / size - gx;
  const fy = y / size - gy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const top = hash(gx, gy, salt) * (1 - sx) + hash(gx + 1, gy, salt) * sx;
  const bottom = hash(gx, gy + 1, salt) * (1 - sx) + hash(gx + 1, gy + 1, salt) * sx;
  return top * (1 - sy) + bottom * sy;
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dither = (x, y, amount) => BAYER[(y & 3) * 4 + (x & 3)] < amount * 16;

// Each cell's class, sampled at its centre like the original samples the
// pixel under a ship.
export function chartClasses(map) {
  const { width, height } = map;
  const classes = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = pixelClassAt(map, x + .5, y + .5);
      classes[y * width + x] = pixel === PIXEL.LAND ? LAND : pixel === PIXEL.SHALLOW ? SHALLOW : SEA;
    }
  }
  return classes;
}

// Chessboard steps from each cell to the nearest cell where `isTarget`
// holds, capped at `cap` (breadth-first, 8-connected).
export function distanceField(classes, width, height, isTarget, cap) {
  const distance = new Uint8Array(width * height).fill(cap);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  for (let index = 0; index < classes.length; index += 1) {
    if (isTarget(classes[index])) { distance[index] = 0; queue[tail++] = index; }
  }
  while (head < tail) {
    const index = queue[head++];
    const next = distance[index] + 1;
    if (next >= cap) continue;
    const x = index % width;
    const y = (index - x) / width;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const nx = x + dx;
        const ny = y + dy;
        if ((dx || dy) && nx >= 0 && ny >= 0 && nx < width && ny < height) {
          const neighbour = ny * width + nx;
          if (distance[neighbour] > next) { distance[neighbour] = next; queue[tail++] = neighbour; }
        }
      }
    }
  }
  return distance;
}

// The open-sea point for the compass rose: the cell farthest from land in
// the western Gulf, clear of the towns along its shores.
export function compassRoseCentre(seaDistance, width, height) {
  let best = { x: Math.round(width * .22), y: Math.round(height * .25), distance: -1 };
  for (let y = Math.round(height * .1); y < Math.round(height * .45); y += 1) {
    for (let x = Math.round(width * .08); x < Math.round(width * .4); x += 1) {
      const distance = seaDistance[y * width + x];
      if (distance > best.distance) best = { x, y, distance };
    }
  }
  return best;
}

// The chart's base image: sea, coasts, land, rhumb lines, compass rose and
// frame, with the world's (x, y) cell at chart pixel (x + border, y + border).
export function paintChartBase(map) {
  const { width, height } = map;
  const classes = chartClasses(map);
  const seaDistance = distanceField(classes, width, height, (value) => value === LAND, 40);
  const landDistance = distanceField(classes, width, height, (value) => value !== LAND, 12);
  const rose = compassRoseCentre(seaDistance, width, height);
  const chartWidth = width + CHART_BORDER * 2;
  const chartHeight = height + CHART_BORDER * 2;
  const pixels = new Uint8ClampedArray(chartWidth * chartHeight * 4);
  const put = (x, y, [r, g, b], shade = 1) => {
    const offset = ((y + CHART_BORDER) * chartWidth + x + CHART_BORDER) * 4;
    pixels[offset] = r * shade; pixels[offset + 1] = g * shade; pixels[offset + 2] = b * shade; pixels[offset + 3] = 255;
  };

  // Rhumb lines radiate from the rose over open water, as on a portolan chart.
  const rhumb = new Uint8Array(width * height);
  for (let point = 0; point < 16; point += 1) {
    const angle = (point / 16) * Math.PI * 2;
    const dx = Math.sin(angle);
    const dy = -Math.cos(angle);
    for (let step = 22; step < 900; step += 1) {
      const x = Math.round(rose.x + dx * step);
      const y = Math.round(rose.y + dy * step);
      if (x < 0 || y < 0 || x >= width || y >= height) break;
      if (step % 3 !== 2) rhumb[y * width + x] = point % 2 ? 1 : 2;
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const value = classes[index];
      // Aged paper: darker toward the edges, with faint broad stains.
      const edge = Math.min(x, y, width - 1 - x, height - 1 - y);
      const shade = (1 - Math.max(0, 1 - edge / 70) ** 2 * .16) * (1 - stain(x, y, 48, 3) * .07 - stain(x, y, 13, 7) * .03);
      if (value === LAND) {
        const inland = landDistance[index];
        let color = inland <= 1 ? PAPER.coast : inland === 2 ? PAPER.landInner
          : dither(x, y, Math.min(1, (inland - 2) / 8)) ? PAPER.landDeep : PAPER.land;
        // Little hills dot the interior in staggered rows.
        if (inland >= 5 && (x + (y >> 2) * 3) % 7 < 3 && (y & 3) < 2) {
          const cx = Math.floor((x + (y >> 2) * 3) / 7);
          if (hash(cx, y >> 2, 11) < .28 && (((x + (y >> 2) * 3) % 7 === 1 && (y & 3) === 0) || (y & 3) === 1)) color = PAPER.hill;
        }
        put(x, y, color, shade);
        continue;
      }
      const near = seaDistance[index];
      let color = value === SHALLOW ? PAPER.shallow : near <= 2 ? PAPER.seaNear : dither(x, y, Math.min(.5, near / 60)) ? PAPER.seaDeep : PAPER.sea;
      // Water-lining: dotted rings echo the coast offshore.
      if ((near === 4 || near === 8) && (x + y) % 2 === 0) color = PAPER.waterLine;
      else if (near >= 3 && rhumb[index]) color = rhumb[index] === 2 ? PAPER.waterLine : PAPER.rhumb;
      // Sparse wave strokes in open sea.
      else if (near >= 7) {
        const cellX = Math.floor(x / 12);
        const cellY = Math.floor(y / 9);
        const waveX = cellX * 12 + Math.floor(hash(cellX, cellY, 5) * 8);
        const waveY = cellY * 9 + Math.floor(hash(cellX, cellY, 6) * 7);
        if (hash(cellX, cellY, 9) < .45 && ((y === waveY && (x === waveX || x === waveX + 3)) || (y === waveY - 1 && (x === waveX + 1 || x === waveX + 2)))) color = PAPER.wave;
      }
      put(x, y, color, shade);
    }
  }

  const art = paintCompassRose();
  const roseLeft = rose.x - (art.width >> 1);
  const roseTop = rose.y - (art.height >> 1);
  for (let y = 0; y < art.height; y += 1) {
    for (let x = 0; x < art.width; x += 1) {
      const offset = (y * art.width + x) * 4;
      if (!art.pixels[offset + 3]) continue;
      const cx = roseLeft + x;
      const cy = roseTop + y;
      if (cx < 0 || cy < 0 || cx >= width || cy >= height) continue;
      put(cx, cy, [art.pixels[offset], art.pixels[offset + 1], art.pixels[offset + 2]]);
    }
  }

  paintFrame(pixels, chartWidth, chartHeight);
  return { pixels, width: chartWidth, height: chartHeight, rose };
}

// A 16-point compass rose with a fleur-de-lis north.
function paintCompassRose() {
  const size = 39;
  const c = 19;
  const art = createArt(size, size);
  const ink = '#4a3320';
  const red = '#a8402a';
  const pale = '#efe0b8';
  const tan = '#c8a46a';
  const ring = (radius, color, gap) => {
    for (let step = 0; step < 160; step += 1) {
      if (gap && step % gap) continue;
      const angle = (step / 160) * Math.PI * 2;
      art.set(Math.round(c + Math.sin(angle) * radius), Math.round(c - Math.cos(angle) * radius), color);
    }
  };
  ring(17, ink, 2);
  ring(14, ink);
  // Eight long points, alternately light and shaded halves.
  for (let point = 0; point < 8; point += 1) {
    const angle = (point / 8) * Math.PI * 2;
    const length = point % 2 ? 11 : 17;
    const halfWidth = point % 2 ? 2.2 : 3.2;
    const tip = [c + .5 + Math.sin(angle) * length, c + .5 - Math.cos(angle) * length];
    const left = [c + .5 + Math.sin(angle - Math.PI / 2) * halfWidth, c + .5 - Math.cos(angle - Math.PI / 2) * halfWidth];
    const right = [c + .5 + Math.sin(angle + Math.PI / 2) * halfWidth, c + .5 - Math.cos(angle + Math.PI / 2) * halfWidth];
    const centre = [c + .5, c + .5];
    art.polygon([centre, left, tip], point === 0 ? red : point % 2 ? tan : pale);
    art.polygon([centre, tip, right], point === 0 ? '#7a2a1a' : ink);
  }
  art.rect(c - 1, c - 1, 3, 3, red);
  art.set(c, c, pale);
  // The fleur-de-lis above north.
  art.rect(c, 0, 1, 2, red);
  art.set(c - 1, 1, red);
  art.set(c + 1, 1, red);
  return { width: size, height: size, pixels: rasterize(art, { outline: null, shadow: false }) };
}

// A frame of alternating ink and paper bars, like a chart's degree scale.
function paintFrame(pixels, width, height) {
  const set = (x, y, [r, g, b]) => {
    const offset = (y * width + x) * 4;
    pixels[offset] = r; pixels[offset + 1] = g; pixels[offset + 2] = b; pixels[offset + 3] = 255;
  };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const edge = Math.min(x, y, width - 1 - x, height - 1 - y);
      if (edge >= CHART_BORDER) continue;
      if (edge === 0 || edge === CHART_BORDER - 1) set(x, y, PAPER.frameDark);
      else if (edge === 1 || edge === CHART_BORDER - 2) set(x, y, PAPER.frameMid);
      else {
        const along = y < CHART_BORDER || y >= height - CHART_BORDER ? x : y;
        set(x, y, Math.floor((along - CHART_BORDER) / 20) % 2 ? PAPER.frameLight : PAPER.frameDark);
      }
    }
  }
}

// Town markers: a ring with the holder's colour and a pennant, or a small
// keep for a fortified town. Allegiance is also written beside the name.
export const MARKER_SIZE = 11;
export const MARKER_ANCHOR = { x: 5, y: 7 };

export function paintTownMarker({ color, dark, fortified = false, selected = false }) {
  const art = createArt(MARKER_SIZE, MARKER_SIZE);
  const { x: cx, y: cy } = MARKER_ANCHOR;
  if (fortified) {
    art.rect(cx - 2, cy - 2, 5, 4, '#e8dcbc');
    art.rect(cx - 2, cy - 3, 1, 1, '#e8dcbc');
    art.rect(cx, cy - 3, 1, 1, '#e8dcbc');
    art.rect(cx + 2, cy - 3, 1, 1, '#e8dcbc');
    art.rect(cx - 1, cy, 3, 2, color);
    art.set(cx, cy + 1, dark);
  } else {
    art.rect(cx - 1, cy - 2, 3, 5, color);
    art.rect(cx - 2, cy - 1, 5, 3, color);
    art.set(cx, cy, dark);
  }
  // The pennant on its pole.
  art.rect(cx, cy - 6, 1, 3, OUTLINE);
  art.rect(cx + 1, cy - 6, 3, 2, color);
  art.set(cx + 3, cy - 5, dark);
  if (selected) {
    for (const [x, y] of [[0, cy + 3], [MARKER_SIZE - 1, cy + 3], [0, cy - 3], [MARKER_SIZE - 1, cy - 3]]) art.set(x, y, '#a8402a');
  }
  return rasterize(art, { shadow: false });
}

// The captain's ship on the chart: a small hull and sail.
export const CHART_SHIP_SIZE = 11;
export const CHART_SHIP_ANCHOR = { x: 5, y: 8 };

export function paintChartShip({ onFoot = false } = {}) {
  const art = createArt(CHART_SHIP_SIZE, CHART_SHIP_SIZE);
  if (onFoot) {
    // A landing party: a small flag planted on a cross.
    art.rect(5, 1, 1, 8, '#3a2a1a');
    art.rect(6, 1, 3, 2, '#a8402a');
    art.rect(3, 8, 5, 1, '#3a2a1a');
    return rasterize(art, { shadow: false });
  }
  art.polygon([[1, 7], [10, 7], [8.5, 9.5], [2.5, 9.5]], '#6b4524');
  art.rect(5, 1, 1, 6, '#3a2a1a');
  art.polygon([[2, 2], [5, 1.5], [5, 6.5], [2.5, 6.5]], '#f4ead0');
  art.polygon([[6, 2.5], [9, 4.5], [6, 6.5]], '#f4ead0');
  art.rect(5, 0, 3, 1, '#a8402a');
  return rasterize(art, { shadow: false });
}

const COMPASS_16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

// The compass point from one world position toward another; y grows south.
export function compassPointTo(fromX, fromY, toX, toY) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (dx === 0 && dy === 0) return null;
  const turns = Math.atan2(dx, -dy) / (Math.PI * 2);
  return COMPASS_16[(Math.round(turns * 16) + 16) % 16];
}

const fold = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Towns whose name contains the query (ignoring case and accents), held by
// `nation` when one is given, sorted by name. Keeps each town's index.
export function filterTowns(towns, { query = '', nation = '' } = {}) {
  const wanted = fold(query.trim());
  return towns
    .map((town, index) => ({ town, index }))
    .filter(({ town }) => (!nation || town.nation === nation) && (!wanted || fold(town.name).includes(wanted)))
    .sort((a, b) => a.town.name.localeCompare(b.town.name));
}

// Greedy label placement: each label, in priority order, takes the first
// spot beside its marker that stays on screen and overlaps no marker or
// earlier label; labels with no room are hidden. Items: { id, x, y, width,
// height, gap }, with (x, y) the marker centre in screen pixels and markers
// given as { x, y, radius }. Returns Map id -> { x, y } (top-left) or null.
export function layoutLabels(items, markers, bounds) {
  const placed = [];
  const blocks = markers.map(({ x, y, radius }) => ({ left: x - radius, top: y - radius, right: x + radius, bottom: y + radius }));
  const overlaps = (box, list) => list.some((other) => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top);
  const result = new Map();
  for (const item of items) {
    const { x, y, width, height, gap } = item;
    const spots = [
      [x + gap, y - height / 2], [x - gap - width, y - height / 2],
      [x - width / 2, y - gap - height], [x - width / 2, y + gap],
      [x + gap * .7, y - gap * .7 - height], [x + gap * .7, y + gap * .7],
      [x - gap * .7 - width, y - gap * .7 - height], [x - gap * .7 - width, y + gap * .7],
    ];
    let chosen = null;
    for (const [left, top] of spots) {
      const box = { left, top, right: left + width, bottom: top + height };
      if (left < bounds.left || top < bounds.top || box.right > bounds.right || box.bottom > bounds.bottom) continue;
      if (overlaps(box, placed) || overlaps(box, blocks)) continue;
      chosen = box;
      break;
    }
    if (chosen) placed.push(chosen);
    result.set(item.id, chosen && { x: chosen.left, y: chosen.top });
  }
  return result;
}
