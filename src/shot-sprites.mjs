// Pixel-art cannonballs for the sea battle, in the ships' style. The original
// fires one ball per broadside whatever the gun count, so the sprite only
// shows the volley's weight: a small, medium or big volley of small balls,
// strung out across the line of flight like a broadside.
// DOM-free: returns RGBA pixels plus the anchor pixel on the volley's centre.
// Presentation only; the hit test still uses the single point (sea_battles.md).

import { createArt, rasterize } from './pixel-art.mjs';

const IRON = '#34343a';
const IRON_LIT = '#6e7078';
const GLINT = '#c9ccd2';

// Gun-count steps for the three volleys. Battle guns top out at
// 4 * (type + 2), 8 for the smallest hull and 36 for the largest.
export const VOLLEY_TIERS = [8, 20];
export const volleyTier = (guns) => VOLLEY_TIERS.filter((limit) => guns > limit).length;

// Balls per volley, in staggered rows across the line of flight (a loose
// broadside), BALL_SPACING battle pixels apart so each reads as its own ball.
export const VOLLEY_BALLS = [3, 6, 10];
const VOLLEY_ROWS = [[2, 1], [3, 3], [5, 5]];
const BALL_SPACING = 3;
const BALL_RADIUS = .8;

// A fixed jitter per ball, so a volley keeps its shape in flight.
const jitter = (index, salt) => {
  const h = Math.imul((index + 1) * 2654435761 + salt * 40503, 2246822519) >>> 0;
  return (h % 1000) / 1000 - .5;
};

// Ball offsets (across, along) in battle pixels; the first sits on the anchor.
export function volleyLayout(tier) {
  const balls = [];
  VOLLEY_ROWS[tier].forEach((count, row) => {
    for (let column = 0; column < count; column += 1) {
      const index = balls.length;
      // A full second row sits half a gap over, like bricks.
      const stagger = row % 2 && count === VOLLEY_ROWS[tier][0] ? BALL_SPACING / 2 : 0;
      const across = (column - (count - 1) / 2) * BALL_SPACING + stagger;
      balls.push([across + jitter(index, 1) * .6, row * BALL_SPACING * .85 + jitter(index, 2) * .6]);
    }
  });
  // Centre the volley on the ball nearest its middle, listed first.
  const middle = balls.reduce(([x, y], [bx, by]) => [x + bx / balls.length, y + by / balls.length], [0, 0]);
  const distance = ([x, y]) => Math.hypot(x - middle[0], y - middle[1]);
  const centre = balls.reduce((best, ball) => (distance(ball) < distance(best) ? ball : best));
  return [centre, ...balls.filter((ball) => ball !== centre)].map(([x, y]) => [x - centre[0], y - centre[1]]);
}

// `direction` is the flight heading (0 north, 64 east); the volley is drawn
// for its 16-sector. `detail` art pixels per battle pixel, as for the ships.
export function paintShotSprite({ tier = 0, detail = 1, direction = 0 }) {
  const clampedTier = Math.max(0, Math.min(2, tier));
  const angle = ((Math.round(direction / 16) * 16) / 256) * Math.PI * 2;
  const [dx, dy] = [Math.sin(angle), -Math.cos(angle)];
  const [px, py] = [-dy, dx];
  const balls = volleyLayout(clampedTier).map(([across, along]) => [across * px + along * dx, across * py + along * dy]);
  const reach = Math.max(...balls.map(([x, y]) => Math.max(Math.abs(x), Math.abs(y)))) + BALL_RADIUS;
  // A border of 2 art pixels leaves room for the outline.
  const half = Math.ceil(reach * detail) + 2;
  const size = 2 * half + 1;
  const art = createArt(size, size);
  const r = BALL_RADIUS * detail;
  for (const [bx, by] of balls) {
    const cx = half + .5 + Math.round(bx * detail);
    const cy = half + .5 + Math.round(by * detail);
    if (r < 1) {
      // At one art pixel per battle pixel a ball is a 2×2 block, lit
      // top-left, with no outline: an outline would weld the volley shut.
      const [x, y] = [Math.floor(cx), Math.floor(cy)];
      art.rect(x, y, 2, 2, IRON);
      art.set(x, y, IRON_LIT);
      continue;
    }
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y += 1) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x += 1) {
        const ox = x + .5 - cx;
        const oy = y + .5 - cy;
        if (ox * ox + oy * oy > r * r) continue;
        // Lit from the north-west like the ships and clouds.
        art.set(x, y, ox + oy < -r * .5 ? IRON_LIT : IRON);
      }
    }
    if (r >= 2) art.set(Math.floor(cx - r * .45), Math.floor(cy - r * .45), GLINT);
  }
  return { pixels: rasterize(art, { outline: r < 1 ? null : undefined, shadow: false }), width: size, height: size, anchor: { x: half, y: half } };
}
