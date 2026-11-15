// Pixel-art fort for the fort battle, in the style of the sailing map's town
// markers (town-sprites.mjs): stone bastion, battlements, a gun and the
// holder's flag. DOM-free; original art.
import { FLAG_DARK, createArt, rasterize } from './pixel-art.mjs';

export const FORT_SPRITE_WIDTH = 18;
export const FORT_SPRITE_HEIGHT = 18;
export const FORT_SPRITE_ANCHOR = Object.freeze({ x: 9, y: 12 });

const STONE = { light: '#c2bba6', stone: '#a49d8b', dark: '#706a5c', gap: '#3b2b1d', cannon: '#1d1d1f', pole: '#3a2a1a', rubble: '#8a8270' };

// `nation` is { key, color, dark } from NATIONS. `level` is the walls'
// damage level (0–3, fortDamageLevel); a silenced fort has struck its flag.
export function paintFortSprite({ nation, level = 0, silenced = false }) {
  const art = createArt(FORT_SPRITE_WIDTH, FORT_SPRITE_HEIGHT);
  // The curtain wall, shaded on its south and east faces.
  art.rect(2, 10, 14, 6, STONE.stone);
  art.rect(2, 10, 14, 1, STONE.light);
  art.rect(2, 15, 14, 1, STONE.dark);
  art.rect(15, 10, 1, 6, STONE.dark);
  for (let col = 2; col < 16; col += 2) art.set(col, 9, STONE.stone);
  // Corner bastions.
  for (const x of [0, 13]) {
    art.rect(x, 8, 5, 9, STONE.stone);
    art.rect(x, 8, 1, 9, STONE.light);
    art.rect(x + 4, 8, 1, 9, STONE.dark);
    art.set(x, 7, STONE.stone); art.set(x + 2, 7, STONE.stone); art.set(x + 4, 7, STONE.stone);
  }
  // The keep in the middle, with the flag above it.
  art.rect(6, 6, 6, 5, STONE.stone);
  art.rect(6, 6, 6, 1, STONE.light);
  art.rect(11, 6, 1, 5, STONE.dark);
  art.set(6, 5, STONE.stone); art.set(8, 5, STONE.stone); art.set(10, 5, STONE.stone);
  art.rect(8, 8, 2, 2, STONE.gap);
  // Guns in the embrasures, unless silenced.
  if (!silenced) {
    art.rect(1, 12, 2, 1, STONE.cannon);
    art.rect(15, 12, 2, 1, STONE.cannon);
    art.rect(8, 14, 2, 1, STONE.cannon);
  }
  // Breaches: one more gap and rubble per damage level.
  const breaches = [[5, 12], [11, 13], [3, 9]];
  for (const [x, y] of breaches.slice(0, level)) {
    art.rect(x, y, 2, 2, STONE.gap);
    art.set(x + 1, y + 3 > 17 ? 17 : y + 3, STONE.rubble);
  }
  art.rect(9, 0, 1, 6, STONE.pole);
  if (!silenced) {
    art.rect(10, 0, 5, 3, nation.color);
    art.rect(10, 2, 5, 1, nation.dark);
    art.set(12, 0, FLAG_DARK[nation.key]);
    art.set(12, 1, FLAG_DARK[nation.key]);
    art.set(11, 1, FLAG_DARK[nation.key]);
    art.set(13, 1, FLAG_DARK[nation.key]);
  }
  return rasterize(art);
}
