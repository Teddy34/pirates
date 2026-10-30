// Pixel-art town markers for the sailing map. DOM-free: paints RGBA sprites
// from a town's nation, population and forts, so the marker shows at a
// glance who holds a town, how large it is and how well it is defended.
// Presentation only; no rule depends on anything in this module.

export const TOWN_SPRITE_WIDTH = 26;
export const TOWN_SPRITE_HEIGHT = 26;
// The art pixel that sits on the town's map cell centre.
export const TOWN_SPRITE_ANCHOR = { x: 13, y: 19 };

const rgb = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));

// Building styles per flag: wall, wall shade, roof light, roof, roof dark.
const STYLES = {
  Spain: { wall: '#efe4c8', wallShade: '#c9b892', roofLight: '#d36f4d', roof: '#b5533a', roofDark: '#86392a' },
  England: { wall: '#ddd0ad', wallShade: '#b09f7a', roofLight: '#7c8790', roof: '#5d6670', roofDark: '#414850', timber: '#5a3f2a' },
  France: { wall: '#ede1c2', wallShade: '#c5b58e', roofLight: '#6c89ae', roof: '#4f6a8f', roofDark: '#384c69' },
  Holland: { wall: '#b5593f', wallShade: '#8c4330', roofLight: '#5a524b', roof: '#433d38', roofDark: '#2b2724', gable: true },
  pirate: { wall: '#9c7c56', wallShade: '#775c3e', roofLight: '#8a7651', roof: '#6c5a3d', roofDark: '#4c3f2a' },
};

const COMMON = {
  outline: '#21180f', window: '#3b2b1d', glow: '#f2c55c', door: '#5a3b22',
  stone: '#a49d8b', stoneLight: '#c2bba6', stoneDark: '#706a5c', pole: '#3a2a1a', cannon: '#1d1d1f',
};

const FLAG_DARK = { Spain: '#a8331f', England: '#f4f0e4', France: '#f4f0e4', Holland: '#2f4f9a', pirate: '#1b1b1b' };

export function townSizeClass(population) {
  if (population >= 25) return 2;
  if (population >= 12) return 1;
  return 0;
}

function canvas() {
  const pixels = new Array(TOWN_SPRITE_WIDTH * TOWN_SPRITE_HEIGHT).fill(null);
  const set = (x, y, color) => {
    if (x < 0 || y < 0 || x >= TOWN_SPRITE_WIDTH || y >= TOWN_SPRITE_HEIGHT) return;
    pixels[y * TOWN_SPRITE_WIDTH + x] = color;
  };
  const rect = (x, y, w, h, color) => {
    for (let row = y; row < y + h; row += 1) for (let col = x; col < x + w; col += 1) set(col, row, color);
  };
  return { pixels, set, rect };
}

// A house whose wall spans x..x+w-1 and stands on row `base` (exclusive).
// The roof is a stepped gable lit from the north-west, like the terrain.
function house(art, style, { x, base, w, h, roofRows, windows = 1, door = true, lit = false }) {
  const top = base - h;
  art.rect(x, top, w, h, style.wall);
  art.rect(x + w - 1, top, 1, h, style.wallShade);
  if (style.timber) {
    art.rect(x, top, w, 1, style.timber);
    for (let col = x + 2; col < x + w - 1; col += 3) art.rect(col, top, 1, h, style.timber);
  }
  for (let row = 0; row < roofRows; row += 1) {
    const inset = style.gable ? Math.floor(row / 2) * 2 : row;
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

// Paints a town marker. `nation` is { key, color, dark } from NATIONS.
export function paintTownSprite({ nation, population, forts: fortCount }) {
  const art = canvas();
  const style = STYLES[nation.key] ?? STYLES.pirate;
  const size = townSizeClass(population);
  let flagAt;
  if (size === 0) {
    house(art, style, { x: 6, base: 18, w: 5, h: 4, roofRows: 3 });
    house(art, style, { x: 12, base: 19, w: 6, h: 5, roofRows: 3, windows: 2, lit: true });
    flagAt = { x: 14, top: 10 };
  } else if (size === 1) {
    house(art, style, { x: 4, base: 17, w: 5, h: 4, roofRows: 3 });
    flagAt = church(art, style, { x: 9, base: 17, towerHeight: 9 });
    house(art, style, { x: 7, base: 20, w: 5, h: 4, roofRows: 3, lit: true });
    house(art, style, { x: 14, base: 20, w: 6, h: 5, roofRows: 3, windows: 2 });
  } else {
    house(art, style, { x: 2, base: 16, w: 5, h: 4, roofRows: 3 });
    house(art, style, { x: 19, base: 16, w: 5, h: 5, roofRows: 3, windows: 2 });
    flagAt = church(art, style, { x: 8, base: 16, towerHeight: 11 });
    house(art, style, { x: 4, base: 20, w: 6, h: 5, roofRows: 3, windows: 2, lit: true });
    house(art, style, { x: 11, base: 20, w: 5, h: 4, roofRows: 3 });
    house(art, style, { x: 17, base: 20, w: 6, h: 5, roofRows: 3, windows: 2 });
  }
  forts(art, fortCount);
  flag(art, nation, flagAt);
  return rasterize(art.pixels);
}

// Outline every painted pixel, then drop a soft shadow to the south-east.
function rasterize(pixels) {
  const width = TOWN_SPRITE_WIDTH, height = TOWN_SPRITE_HEIGHT;
  const painted = (x, y) => x >= 0 && y >= 0 && x < width && y < height && pixels[y * width + x] !== null;
  const out = new Uint8ClampedArray(width * height * 4);
  const outline = rgb(COMMON.outline);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const color = pixels[y * width + x];
      if (color !== null) {
        const [r, g, b] = rgb(color);
        out[offset] = r; out[offset + 1] = g; out[offset + 2] = b; out[offset + 3] = 255;
      } else if (painted(x - 1, y) || painted(x + 1, y) || painted(x, y - 1) || painted(x, y + 1)) {
        out[offset] = outline[0]; out[offset + 1] = outline[1]; out[offset + 2] = outline[2]; out[offset + 3] = 255;
      } else if (painted(x - 2, y - 1) || painted(x - 1, y - 2)) {
        out[offset + 3] = 80;
      }
    }
  }
  return out;
}
