// Pixel-art cannonballs for the sea battle, in the ships' style. The original
// fires one ball per broadside whatever the gun count, so the sprite only
// hints at the volley's weight: one ball, a pair, or a cluster of three.
// DOM-free: returns RGBA pixels plus the anchor pixel on the ball's position.
// Presentation only; the hit test still uses the single point (sea_battles.md).

import { createArt, rasterize } from './pixel-art.mjs';

const IRON = '#34343a';
const IRON_LIT = '#6e7078';
const GLINT = '#c9ccd2';

// Gun-count steps for the three sprites. Battle guns top out at
// 4 * (type + 2), 8 for the smallest hull and 36 for the largest.
export const VOLLEY_TIERS = [8, 20];
export const volleyTier = (guns) => VOLLEY_TIERS.filter((limit) => guns > limit).length;

// Ball centres and radii in battle pixels, relative to the anchor.
const BALLS = [
  [[0, 0, 1.5]],
  [[-1.4, 1, 1.5], [1.4, -1, 1.5]],
  [[0, -1.6, 1.7], [-1.9, 1.3, 1.7], [1.9, 1.3, 1.7]],
];

// `detail` art pixels per battle pixel, as for the ships.
export function paintShotSprite({ tier = 0, detail = 1 }) {
  const balls = BALLS[Math.max(0, Math.min(2, tier))];
  const reach = Math.max(...balls.map(([x, y, r]) => Math.max(Math.abs(x), Math.abs(y)) + r));
  // A border of 3 art pixels leaves room for the outline and the shadow.
  const half = Math.ceil(reach * detail) + 3;
  const size = 2 * half + 1;
  const art = createArt(size, size);
  for (const [bx, by, radius] of balls) {
    const cx = half + .5 + bx * detail;
    const cy = half + .5 + by * detail;
    const r = radius * detail;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y += 1) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x += 1) {
        const dx = x + .5 - cx;
        const dy = y + .5 - cy;
        if (dx * dx + dy * dy > r * r) continue;
        // Lit from the north-west like the ships and clouds.
        const lit = dx + dy < -r * .5;
        art.set(x, y, lit ? IRON_LIT : IRON);
      }
    }
    art.set(Math.floor(cx - r * .45), Math.floor(cy - r * .45), GLINT);
  }
  return { pixels: rasterize(art), width: size, height: size, anchor: { x: half, y: half } };
}
