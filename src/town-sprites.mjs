// Pixel-art town markers for the sailing map. DOM-free: paints RGBA sprites
// whose buildings follow the town's prosperity and whose walls follow its
// forts; only the flag shows who holds the town.
// Presentation only; no rule depends on anything in this module.

import { FLAG_DARK, createArt, rasterize } from './pixel-art.mjs';

export const TOWN_SPRITE_WIDTH = 26;
export const TOWN_SPRITE_HEIGHT = 26;
// The art pixel that sits on the town's map cell centre.
export const TOWN_SPRITE_ANCHOR = { x: 13, y: 19 };

// One building style for every town: the flag alone shows allegiance. A
// struggling settlement has thatched huts; better-off towns have tiled roofs.
const STYLE = { wall: '#ece0c2', wallShade: '#c3b28b', roofLight: '#cf6c4b', roof: '#ae5139', roofDark: '#823a29' };
const THATCH = { wall: '#c9b48a', wallShade: '#a08a62', roofLight: '#d9be72', roof: '#b99a52', roofDark: '#8a7038' };

const COMMON = {
  window: '#3b2b1d', glow: '#f2c55c', door: '#5a3b22',
  stone: '#a49d8b', stoneLight: '#c2bba6', stoneDark: '#706a5c', pole: '#3a2a1a', cannon: '#1d1d1f',
};

// Prosperity level from town growth (CSTN 9, town_economy.md): 0 struggling,
// 1 surviving, 2 prospering, 3 wealthy.
export function prosperityLevel(growth) {
  return Math.min(3, Math.max(0, growth >> 6));
}

// A house whose wall spans x..x+w-1 and stands on row `base` (exclusive).
// The roof is a stepped gable lit from the north-west, like the terrain.
function house(art, style, { x, base, w, h, roofRows, windows = 1, door = true, lit = false }) {
  const top = base - h;
  art.rect(x, top, w, h, style.wall);
  art.rect(x + w - 1, top, 1, h, style.wallShade);
  for (let row = 0; row < roofRows; row += 1) {
    const inset = row;
    const left = x - 1 + inset;
    const width = w + 2 - inset * 2;
    if (width <= 0) break;
    const y = top - 1 - row;
    art.rect(left, y, width, 1, style.roof);
    art.set(left, y, style.roofLight);
    if (width > 2) art.set(left + 1, y, style.roofLight);
    art.set(left + width - 1, y, style.roofDark);
  }
  art.rect(x - 1, top - 1, w + 2, 1, style.roofDark);
  art.set(x - 1, top - 1, style.roof);
  const windowRow = top + 1;
  for (let index = 0; index < windows; index += 1) {
    const col = x + 1 + index * 2;
    if (col < x + w - 1) art.set(col, windowRow, lit && index === 0 ? COMMON.glow : COMMON.window);
  }
  if (door && h >= 4) art.rect(x + Math.floor(w / 2), base - 2, 1, 2, COMMON.door);
}

// A church with a bell tower and spire; the tallest building carries the flag.
function church(art, style, { x, base, towerHeight }) {
  house(art, style, { x, base, w: 6, h: 4, roofRows: 2, windows: 2 });
  const towerX = x + 5;
  const towerTop = base - towerHeight;
  art.rect(towerX, towerTop, 3, towerHeight, style.wall);
  art.rect(towerX + 2, towerTop, 1, towerHeight, style.wallShade);
  art.set(towerX + 1, towerTop + 1, COMMON.window);
  art.rect(towerX, towerTop - 1, 3, 1, style.roof);
  art.set(towerX, towerTop - 1, style.roofLight);
  art.set(towerX + 1, towerTop - 2, style.roof);
  art.set(towerX + 1, towerTop - 3, style.roofDark);
  return { x: towerX + 1, top: towerTop - 3 };
}

function battlements(art, x, y, w) {
  for (let col = x; col < x + w; col += 2) art.set(col, y, COMMON.stone);
}

function forts(art, count) {
  if (count <= 0) return;
  if (count >= 3) {
    // A curtain wall with two towers and a gate.
    art.rect(1, 18, 24, 4, COMMON.stone);
    art.rect(1, 18, 24, 1, COMMON.stoneLight);
    art.rect(1, 21, 24, 1, COMMON.stoneDark);
    battlements(art, 1, 17, 24);
    for (const towerX of [0, 21]) {
      art.rect(towerX, 14, 5, 8, COMMON.stone);
      art.rect(towerX, 14, 1, 8, COMMON.stoneLight);
      art.rect(towerX + 4, 14, 1, 8, COMMON.stoneDark);
      battlements(art, towerX, 13, 5);
      art.set(towerX + 2, 16, COMMON.window);
    }
    art.rect(12, 19, 2, 3, COMMON.window);
    if (count >= 4) { art.set(7, 19, COMMON.cannon); art.set(18, 19, COMMON.cannon); }
    return;
  }
  // One or two harbour bastions, each with a gun.
  const bastions = count === 1 ? [1] : [1, 19];
  for (const bastionX of bastions) {
    art.rect(bastionX, 17, 6, 5, COMMON.stone);
    art.rect(bastionX, 17, 6, 1, COMMON.stoneLight);
    art.rect(bastionX + 5, 17, 1, 5, COMMON.stoneDark);
    battlements(art, bastionX, 16, 6);
    art.rect(bastionX + 2, 19, 2, 1, COMMON.cannon);
  }
}

function flag(art, nation, { x, top }) {
  const poleTop = Math.max(0, top - 5);
  art.rect(x, poleTop, 1, top - poleTop, COMMON.pole);
  art.rect(x + 1, poleTop, 5, 3, nation.color);
  art.rect(x + 1, poleTop + 2, 5, 1, nation.dark);
  // A stripe or cross in the flag's second colour keeps flags apart.
  art.set(x + 3, poleTop, FLAG_DARK[nation.key]);
  art.set(x + 3, poleTop + 1, FLAG_DARK[nation.key]);
  art.set(x + 2, poleTop + 1, FLAG_DARK[nation.key]);
  art.set(x + 4, poleTop + 1, FLAG_DARK[nation.key]);
}

// A wide two-storey residence with a hipped roof, for the governor's house.
function mansion(art, style, { x, base }) {
  house(art, style, { x, base, w: 8, h: 6, roofRows: 3, windows: 4, lit: true });
  art.rect(x, base - 3, 8, 1, style.wallShade);
}

// Paints a town marker. `nation` is { key, color, dark } from NATIONS.
export function paintTownSprite({ nation, prosperity, forts: fortCount }) {
  const art = createArt(TOWN_SPRITE_WIDTH, TOWN_SPRITE_HEIGHT);
  let flagAt;
  if (prosperity <= 0) {
    // Struggling: two thatched huts and a woodpile.
    house(art, THATCH, { x: 6, base: 19, w: 5, h: 3, roofRows: 3, door: false });
    house(art, THATCH, { x: 13, base: 19, w: 5, h: 4, roofRows: 3 });
    art.rect(19, 17, 3, 2, '#7a5a36');
    art.rect(19, 17, 3, 1, '#9b7647');
    flagAt = { x: 15, top: 11 };
  } else if (prosperity === 1) {
    // Surviving: a cluster of plain houses.
    house(art, STYLE, { x: 4, base: 17, w: 5, h: 4, roofRows: 3 });
    house(art, STYLE, { x: 13, base: 17, w: 5, h: 4, roofRows: 3 });
    house(art, STYLE, { x: 8, base: 20, w: 6, h: 5, roofRows: 3, windows: 2 });
    flagAt = { x: 10, top: 11 };
  } else if (prosperity === 2) {
    // Prospering: a church with a bell tower among lit houses.
    house(art, STYLE, { x: 3, base: 17, w: 5, h: 4, roofRows: 3, lit: true });
    flagAt = church(art, STYLE, { x: 9, base: 17, towerHeight: 9 });
    house(art, STYLE, { x: 6, base: 20, w: 5, h: 4, roofRows: 3, lit: true });
    house(art, STYLE, { x: 14, base: 20, w: 6, h: 5, roofRows: 3, windows: 2 });
  } else {
    // Wealthy: a tall church, the governor's mansion and a crowded skyline.
    house(art, STYLE, { x: 1, base: 16, w: 5, h: 5, roofRows: 3, windows: 2 });
    house(art, STYLE, { x: 20, base: 16, w: 5, h: 5, roofRows: 3, windows: 2, lit: true });
    flagAt = church(art, STYLE, { x: 7, base: 16, towerHeight: 12 });
    mansion(art, STYLE, { x: 3, base: 21 });
    house(art, STYLE, { x: 12, base: 21, w: 5, h: 5, roofRows: 3, lit: true });
    house(art, STYLE, { x: 18, base: 21, w: 6, h: 6, roofRows: 3, windows: 2 });
  }
  forts(art, fortCount);
  flag(art, nation, flagAt);
  return rasterize(art);
}
