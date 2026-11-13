// Pixel-art gun smoke for the sea battle: the billow a broadside leaves
// behind, which the wind then carries off (battle-mechanics.mjs drifts it).
// Unlike the sailing map's clouds (cloud-sprites.mjs: smooth lit domes with a
// blue-grey outline), smoke is lumpy, unoutlined and warm grey, starts with a
// hot flash at its heart, and thins out through an ordered dither as it ages
// and spreads, so the sea and ships show through before it is gone.
// DOM-free: returns RGBA pixels plus the anchor pixel on the puff's centre.
// Presentation only; the original's smoke is not documented.

import { createArt, rasterize } from './pixel-art.mjs';

// Stages a puff passes through over its life, from fresh to nearly gone.
export const SMOKE_STAGES = 6;
// Lumpy puff forms (variants) as [x, y, radius] blobs in battle pixels at
// stage 0, centred on the puff; later stages spread them out and swell them.
const FORMS = [
  [[0, 0, 3.2], [-2.6, 1, 2.2], [2.4, -.8, 2.4], [.6, 2.2, 1.8]],
  [[0, 0, 3], [2.8, .8, 2.2], [-1.8, -1.6, 2.2], [-2.4, 1.6, 1.6]],
  [[0, .4, 3.4], [-2.8, -.4, 2], [1.8, 2, 1.8], [2.2, -1.8, 1.6]],
];
export const SMOKE_VARIANTS = FORMS.length;

const COLORS = {
  flash: '#fff2b8', hot: '#f3ead2', body: '#d9d4c6', shade: '#aaa598', thin: '#8c897f',
};

// A 4×4 Bayer threshold (0–15): a pixel survives while its density beats it.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// Fixed per-pixel roughness, so the edge is ragged rather than round.
const roughness = (x, y, salt) => {
  const h = Math.imul(Math.imul(x + 101, 73856093) ^ Math.imul(y + 211, 19349663) ^ Math.imul(salt + 7, 83492791), 2654435761) >>> 0;
  return (h % 1000) / 1000;
};

// Paints puff `variant` at `stage` (0 fresh – SMOKE_STAGES − 1 thinnest),
// `detail` art pixels per battle pixel, as for the ships.
export function paintSmokeSprite({ stage = 0, variant = 0, detail = 1 } = {}) {
  const s = Math.max(0, Math.min(SMOKE_STAGES - 1, stage));
  const age = s / (SMOKE_STAGES - 1);
  const spread = 1 + age * 1.1;
  const swell = 1 + age * .9;
  const blobs = (FORMS[variant % FORMS.length]).map(([x, y, r]) => [x * spread * detail, y * spread * detail, r * swell * detail]);
  const reach = Math.ceil(Math.max(...blobs.map(([x, y, r]) => Math.max(Math.abs(x), Math.abs(y)) + r))) + 1;
  const size = 2 * reach + 1;
  // How much of the puff is still there: thinner with age, and thinnest at
  // the ragged edge.
  const density = 1 - age * .78;
  const art = createArt(size, size);
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const x = col - reach, y = row - reach;
      let depth = 0; // 0 outside, 1 at a blob's centre
      for (const [bx, by, r] of blobs) {
        const d = Math.hypot(x + .5 - bx, y + .5 - by) / r;
        if (d < 1) depth = Math.max(depth, 1 - d);
      }
      if (depth <= 0) continue;
      const edge = depth + (roughness(Math.floor(col / detail), Math.floor(row / detail), variant) - .5) * .35;
      if (edge <= .04) continue;
      const local = density * Math.min(1, edge * 2.4);
      if (local * 16 <= BAYER[(row % 4) * 4 + (col % 4)]) continue;
      // Shade from the north-west light by the depth toward the south-east.
      const lit = depth - (y + x) / (size * 1.6);
      let color;
      if (s === 0 && depth > .55) color = COLORS.flash;
      else if (age > .7) color = lit > .45 ? COLORS.shade : COLORS.thin;
      else if (lit > .55) color = COLORS.hot;
      else if (lit > .2) color = COLORS.body;
      else color = COLORS.shade;
      art.set(col, row, color);
    }
  }
  return { pixels: rasterize(art, { outline: null, shadow: false }), width: size, height: size, anchor: { x: reach, y: reach } };
}
