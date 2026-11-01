// Pixel-art clouds for the sailing map, in the towns' and ships' style:
// puffs lit from the north-west with a soft blue-grey outline, plus a
// matching flat silhouette for the shadow they cast on the sea.
// DOM-free; presentation only.

import { createArt, rasterize } from './pixel-art.mjs';

// The three cloud forms as [x, y, radius] puffs in screen pixels, centred on
// the cloud; art pixels are CLOUD_ART_PIXEL screen pixels.
const FORMS = [
  [[-24, 6, 14], [-8, -3, 18], [11, 0, 16], [25, 7, 11]],
  [[-27, 7, 11], [-15, 0, 16], [1, -6, 20], [20, 2, 15], [30, 8, 9]],
  [[-22, 8, 13], [-7, 1, 15], [5, -7, 18], [18, 2, 13], [28, 8, 8]],
];
export const CLOUD_ART_PIXEL = 2;

const COLORS = { highlight: '#fffbe8', body: '#eef0de', shade: '#c4d4cd', deep: '#9fb5b2', outline: '#4d6670', shadow: '#02141b' };

// Paints cloud form `shape`; with `shadow` the silhouette is one flat colour.
export function paintCloudSprite(shape, { shadow = false } = {}) {
  const puffs = (FORMS[shape] ?? FORMS[0]).map(([x, y, radius]) => [x / CLOUD_ART_PIXEL, y / CLOUD_ART_PIXEL, radius / CLOUD_ART_PIXEL]);
  const left = Math.floor(Math.min(...puffs.map(([x, , r]) => x - r))) - 2;
  const top = Math.floor(Math.min(...puffs.map(([, y, r]) => y - r))) - 2;
  const width = Math.ceil(Math.max(...puffs.map(([x, , r]) => x + r))) - left + 3;
  const height = Math.ceil(Math.max(...puffs.map(([, y, r]) => y + r))) - top + 3;
  // Height of the cloud's dome over each pixel centre; 0 outside.
  const dome = (col, row) => {
    const x = left + col + .5, y = top + row + .5;
    let best = 0;
    for (const [cx, cy, r] of puffs) {
      const d2 = (x - cx) ** 2 + (y - cy) ** 2;
      if (d2 < r * r) best = Math.max(best, Math.sqrt(r * r - d2));
    }
    return best;
  };
  const art = createArt(width, height);
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const h = dome(col, row);
      if (h <= 0) continue;
      if (shadow) { art.set(col, row, COLORS.shadow); continue; }
      // Light from the north-west: compare with the pixel up and to the left.
      const slope = h - dome(col - 1, row - 1);
      const bottom = dome(col, row + 1) <= 0 || dome(col, row + 2) <= 0;
      const color = bottom ? COLORS.deep : slope > .9 ? COLORS.highlight : slope < -.6 ? COLORS.shade : COLORS.body;
      art.set(col, row, color);
    }
  }
  const pixels = rasterize(art, shadow ? { outline: null, shadow: false } : { outline: COLORS.outline, shadow: false });
  return { pixels, width, height, anchor: { x: -left, y: -top } };
}
