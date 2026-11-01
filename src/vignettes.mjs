// Placeholder scene vignettes (docs/scene-vignettes.md). Each one is drawn
// in code at its fixed art size inside the shared 8 px frame, so the dialogs
// can be laid out before the real pictures exist.
// They are deliberately simple original shapes; replace a scene by drawing
// `assets/vignettes/<id>.png` into the picture area instead.

// Two picture shapes, both 128 art px tall: a 224 px landscape for places
// and events, shown above the dialog text, and a 96 px portrait (3 : 4) for
// people, shown beside it.
export const VIGNETTE_FRAME_WIDTH = 8;
const PICTURE_SIZES = {
  landscape: { width: 224, height: 128 },
  portrait: { width: 96, height: 128 },
};
const VIGNETTE_PICTURE_WIDTH = PICTURE_SIZES.landscape.width;
const VIGNETTE_PICTURE_HEIGHT = PICTURE_SIZES.landscape.height;

const OUTLINE = '#21180f';
const SKIN = '#d9a37a';
const GOLD = '#f2c55c';
const PARCHMENT = '#ead8ad';
const BRASS = '#d6a447';
const WOOD = '#5a3b22';
const WOOD_DARK = '#3b2b1d';
const WOOD_LIGHT = '#7a5a36';
// Flag field and mark, matching the nation colours of the map flags.
const FLAGS = {
  Spain: ['#e0b33a', '#a8331f'], England: ['#f4f0e4', '#b8322a'], France: ['#2f4f9a', '#f4f0e4'],
  Holland: ['#e07a2a', '#2f4f9a'], pirate: ['#1b1b1b', '#f4f0e4'],
};

const DESCRIPTIONS = {
  governor: 'Portrait of the governor',
  'prize-plunder': 'Your crew hauls the spoils from a captured ship',
  'enemy-destroyed': 'An enemy ship explodes at dusk',
  'divide-plunder': 'The plunder is counted and divided in a counting house',
  tavern: 'A smoky waterfront tavern',
  merchant: 'Portrait of the merchant',
};

export function vignetteDescription(id) {
  return `Placeholder picture: ${DESCRIPTIONS[id] ?? id}.`;
}

export function vignetteShape(id) {
  return SCENES[id]?.shape ?? 'landscape';
}

// The framed size in art pixels, for sizing the canvas.
export function vignetteSize(id) {
  const picture = PICTURE_SIZES[vignetteShape(id)];
  return { width: picture.width + 2 * VIGNETTE_FRAME_WIDTH, height: picture.height + 2 * VIGNETTE_FRAME_WIDTH };
}

// Draws the framed vignette into a context of vignetteSize(id).
export function drawVignette(ctx, id, options = {}) {
  const picture = PICTURE_SIZES[vignetteShape(id)];
  const framed = vignetteSize(id);
  ctx.save();
  ctx.clearRect(0, 0, framed.width, framed.height);
  ctx.translate(VIGNETTE_FRAME_WIDTH, VIGNETTE_FRAME_WIDTH);
  ctx.beginPath();
  ctx.rect(0, 0, picture.width, picture.height);
  ctx.clip();
  (SCENES[id]?.draw ?? drawMissing)(painter(ctx), options);
  ctx.restore();
  drawFrame(painter(ctx), framed.width, framed.height);
}

function painter(ctx) {
  const rect = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  // Filled disc, row by row so edges stay on whole art pixels.
  const disc = (cx, cy, r, color) => {
    for (let dy = -r; dy <= r; dy += 1) {
      const half = Math.round(Math.sqrt(r * r - dy * dy));
      rect(cx - half, cy + dy, half * 2 + 1, 1, color);
    }
  };
  // Parts are [x, y, w, h, color]; every outline goes down before any fill
  // so the 1 px outline only shows on the silhouette's edge.
  const outlined = (parts) => {
    parts.forEach(([x, y, w, h]) => rect(x - 1, y - 1, w + 2, h + 2, OUTLINE));
    parts.forEach(([x, y, w, h, color]) => rect(x, y, w, h, color));
  };
  return { rect, disc, outlined };
}

// A painter that magnifies drawing about (cx, cy), snapping both edges of
// every rect so neighbouring parts still meet without gaps; outlines stay
// one art pixel wide.
function zoomed(p, scale, cx, cy) {
  const map = (x, y, w, h) => {
    const x0 = Math.round(cx + (x - cx) * scale);
    const y0 = Math.round(cy + (y - cy) * scale);
    return [x0, y0, Math.round(cx + (x + w - cx) * scale) - x0, Math.round(cy + (y + h - cy) * scale) - y0];
  };
  const rect = (x, y, w, h, color) => p.rect(...map(x, y, w, h), color);
  const outlined = (parts) => {
    const mapped = parts.map(([x, y, w, h, color]) => [...map(x, y, w, h), color]);
    mapped.forEach(([x, y, w, h]) => p.rect(x - 1, y - 1, w + 2, h + 2, OUTLINE));
    mapped.forEach(([x, y, w, h, color]) => p.rect(x, y, w, h, color));
  };
  return { rect, outlined, disc: p.disc };
}

// A standing figure about 28 art px tall, feet centred on (x, y).
function figure(p, x, y, { coat, legs = '#4a3a2c', hair = WOOD_DARK, hat, sash, collar, skin = SKIN, holding } = {}) {
  const parts = [
    [x - 4, y - 11, 3, 11, legs], [x + 1, y - 11, 3, 11, legs],
    [x - 5, y - 22, 10, 12, coat],
    [x - 7, y - 21, 2, 9, coat], [x + 5, y - 21, 2, 9, coat],
    [x - 3, y - 28, 6, 6, skin],
  ];
  if (hat) parts.push([x - 5, y - 30, 10, 2, hat], [x - 3, y - 32, 6, 2, hat]);
  else parts.push([x - 3, y - 29, 6, 2, hair]);
  p.outlined(parts);
  if (sash) p.rect(x - 5, y - 14, 10, 2, sash);
  if (collar) p.rect(x - 4, y - 22, 8, 2, collar);
  p.rect(x - 7, y - 13, 2, 2, skin);
  p.rect(x + 5, y - 13, 2, 2, skin);
  if (holding) p.outlined([[x + 5, y - 15, 5, 4, holding]]);
}

function captain(p, x, y, options = {}) {
  figure(p, x, y, { coat: '#2c3f63', legs: WOOD_DARK, hat: options.hatInHand ? undefined : '#1d1710', sash: '#a8331f', ...options });
  if (options.hatInHand) p.outlined([[x - 11, y - 15, 5, 3, '#1d1710']]);
}

function sky(p, bands, bottom) {
  const height = bottom / bands.length;
  bands.forEach((color, index) => p.rect(0, Math.floor(index * height), VIGNETTE_PICTURE_WIDTH, Math.ceil(height), color));
}

function sea(p, top, base, light) {
  p.rect(0, top, VIGNETTE_PICTURE_WIDTH, VIGNETTE_PICTURE_HEIGHT - top, base);
  for (let row = top + 3; row < VIGNETTE_PICTURE_HEIGHT; row += 5) {
    for (let x = (row * 7) % 23; x < VIGNETTE_PICTURE_WIDTH; x += 23) p.rect(x, row, 6, 1, light);
  }
}

// A ship broadside, hull bottom on the waterline y. facing 1 = bow right.
function ship(p, x, y, { facing = 1, flag = 'pirate', sails = PARCHMENT, scale = 1, struck = false, burning = false } = {}) {
  const length = Math.round(56 * scale);
  const hullHeight = Math.round(10 * scale);
  const mastHeight = Math.round(40 * scale);
  for (let row = 0; row < hullHeight; row += 1) {
    const inset = Math.round(((hullHeight - row) / hullHeight) * 6 * scale);
    p.rect(x - length / 2 + inset, y - row - 1, length - 2 * inset, 1, row === hullHeight - 3 ? BRASS : WOOD);
  }
  // Raised stern castle at the back.
  const sternX = facing > 0 ? x - length / 2 : x + length / 2 - 14 * scale;
  p.rect(sternX, y - hullHeight - 5 * scale, 14 * scale, 5 * scale, WOOD_LIGHT);
  p.rect(x - length / 2, y - 2, length, 2, WOOD_DARK);
  const masts = [-0.28, 0.05, 0.32].map((at) => x + facing * at * length);
  masts.forEach((mx, index) => {
    const top = y - hullHeight - mastHeight * (index === 1 ? 1 : 0.82);
    p.rect(mx, top, 1, y - hullHeight - top, WOOD_DARK);
    if (burning) return;
    const sailWidth = Math.round((index === 1 ? 18 : 14) * scale);
    for (const [from, to] of [[0.12, 0.45], [0.5, 0.88]]) {
      const sy = top + (y - hullHeight - top) * from;
      const sh = (y - hullHeight - top) * (to - from);
      p.rect(mx - sailWidth / 2 - 1, sy - 1, sailWidth + 2, sh + 2, OUTLINE);
      p.rect(mx - sailWidth / 2, sy, sailWidth, sh, sails);
      p.rect(mx - sailWidth / 2, sy + sh - 2, sailWidth, 2, '#c7b48a');
    }
  });
  const mainTop = y - hullHeight - mastHeight;
  const [field, mark] = FLAGS[flag] ?? FLAGS.pirate;
  // A struck flag hangs half down the mast.
  const flagY = struck ? mainTop + mastHeight * 0.4 : mainTop;
  const flagX = facing > 0 ? masts[1] - 9 * scale : masts[1] + 1;
  p.rect(flagX, flagY, 8 * scale, 5 * scale, field);
  p.rect(flagX + 3 * scale, flagY + 1, 2 * scale, 3 * scale, mark);
}

// Head and shoulders of a governor in a plumed hat, periwig, lace falling
// collar and velvet doublet, before a curtain and a panelled wall.
function drawGovernor(picture) {
  picture.rect(0, 0, 96, 128, '#3a2418');
  // Drawn at 4 : 5 and magnified, a close head-and-shoulders crop.
  const p = zoomed(picture, 1.3, 48, 2);
  // Panelled wall behind, lit from the upper left.
  for (let x = 24; x < 96; x += 18) picture.rect(x, 0, 1, 128, '#2c1a10');
  picture.rect(20, 0, 76, 40, '#452c1d');
  // Red curtain, left, in folds.
  picture.rect(0, 0, 20, 128, '#6a1f24');
  for (const x of [3, 9, 15]) picture.rect(x, 0, 2, 128, '#4a1418');
  picture.rect(0, 0, 96, 4, BRASS);
  // Shoulders: a velvet doublet widening below the collar.
  for (let row = 0; row < 64; row += 1) {
    const half = Math.min(42, 20 + row * 1.4);
    p.rect(48 - half - 1, 64 + row, half * 2 + 2, 1, OUTLINE);
    p.rect(48 - half, 64 + row, half * 2, 1, row < 2 ? OUTLINE : '#3c2346');
  }
  p.rect(6, 90, 8, 38, '#2a1832');
  p.rect(82, 90, 8, 38, '#2a1832');
  // Sash across the chest, buttons, and the star of an order.
  for (let row = 0; row < 44; row += 1) p.rect(22 + row, 80 + row, 7, 1, row % 6 === 0 ? '#1f3f7a' : '#2f5aa0');
  for (let y = 76; y < 128; y += 7) p.rect(47, y, 3, 3, GOLD);
  p.rect(62, 84, 7, 1, GOLD); p.rect(65, 81, 1, 7, GOLD); p.rect(63, 82, 5, 5, GOLD); p.rect(64, 83, 3, 3, '#fff2c0');
  // Periwig falling past the jaw onto the shoulders.
  p.outlined([[23, 24, 13, 46, '#7a6650'], [60, 24, 13, 46, '#7a6650']]);
  for (let y = 28; y < 70; y += 6) { p.rect(24, y, 11, 2, '#5f4e3c'); p.rect(61, y + 3, 11, 2, '#5f4e3c'); }
  // Neck and face.
  p.outlined([[42, 56, 12, 8, '#c08a64'], [34, 22, 28, 36, SKIN]]);
  p.rect(58, 26, 4, 30, '#c08a64');
  p.rect(35, 54, 26, 4, '#c08a64');
  p.rect(34, 53, 3, 5, '#7a6650');
  p.rect(59, 53, 3, 5, '#7a6650');
  p.rect(37, 44, 4, 3, '#e2a68a');
  p.rect(54, 44, 3, 3, '#e2a68a');
  // Brows, eyes, nose.
  p.rect(37, 31, 8, 2, '#4a3526');
  p.rect(51, 31, 8, 2, '#4a3526');
  for (const ex of [38, 52]) { p.rect(ex, 35, 6, 3, '#f4f0e4'); p.rect(ex + 2, 35, 3, 3, '#2a3f3a'); p.rect(ex + 3, 35, 1, 1, '#f4f0e4'); p.rect(ex, 34, 6, 1, '#7a4a32'); }
  p.rect(47, 36, 3, 9, '#c08a64');
  p.rect(46, 44, 5, 2, '#a8714a');
  // Upturned moustache, mouth, and pointed beard.
  p.rect(40, 47, 16, 2, '#4a3526');
  p.rect(38, 46, 3, 2, '#4a3526');
  p.rect(55, 46, 3, 2, '#4a3526');
  p.rect(44, 50, 8, 1, '#8a3a2a');
  p.outlined([[45, 52, 6, 4, '#4a3526'], [46, 56, 4, 3, '#4a3526']]);
  // Lace falling collar over the doublet.
  p.outlined([[28, 63, 40, 9, '#f4f0e4']]);
  for (let x = 28; x < 68; x += 4) p.rect(x + 1, 71, 2, 2, '#f4f0e4');
  for (let x = 30; x < 66; x += 4) p.rect(x, 66, 2, 2, '#c9c3b4');
  // Broad cavalier hat, brim turned up on one side, with a plume.
  p.outlined([[18, 18, 58, 4, '#1d1710'], [33, 9, 30, 10, '#1d1710'], [18, 13, 6, 6, '#1d1710']]);
  p.rect(35, 8, 26, 1, '#1d1710');
  p.rect(33, 15, 30, 3, '#a8331f');
  p.outlined([[56, 5, 14, 4, '#f4f0e4'], [66, 8, 8, 5, '#f4f0e4'], [71, 12, 4, 6, '#f4f0e4']]);
  p.rect(58, 6, 10, 1, '#c9c3b4');
  p.rect(33, 18, 30, 1, '#3a2c20');
}

function drawPrizePlunder(p, { flag = 'Spain' } = {}) {
  sky(p, ['#8fb7c4', '#9fc3cc', '#b4d0d0', '#cfe0d4'], 70);
  for (const [cx, cy, w] of [[40, 16, 30], [150, 24, 44], [196, 12, 22]]) { p.rect(cx, cy, w, 4, '#eef3ee'); p.rect(cx + 4, cy - 3, w - 10, 3, '#eef3ee'); }
  sea(p, 70, '#2f6b6b', '#6fa3a0');
  // The captured ship lies alongside, flag struck; ours flies the black.
  ship(p, 160, 96, { facing: -1, flag, scale: 1.05, struck: true, sails: '#d8cfb4' });
  ship(p, 62, 102, { facing: 1, flag: 'pirate', scale: 1.15 });
  // A plank between the hulls with spoils passed across.
  p.rect(88, 84, 46, 2, WOOD_LIGHT);
  for (const x of [102, 118]) figure(p, x, 84, { coat: '#7a3a2a', legs: '#ead8ad', hair: WOOD_DARK });
  // Chests carried overhead, and a sack waiting on the plank.
  p.outlined([[97, 50, 10, 6, WOOD], [113, 50, 10, 6, WOOD_LIGHT], [126, 79, 5, 5, '#c9c9c9']]);
  p.rect(97, 51, 10, 1, GOLD);
  p.rect(113, 51, 10, 1, GOLD);
  captain(p, 82, 90);
}

function drawEnemyDestroyed(p, { flag = 'Spain' } = {}) {
  sky(p, ['#3a3150', '#5a3a50', '#8a4a4a', '#c46a3a', '#e39a4f'], 78);
  sea(p, 78, '#1f3a45', '#3f5f66');
  // Fireball over the enemy hull, with flying spars.
  p.disc(146, 56, 30, '#a8331f');
  p.disc(146, 58, 23, '#e07a2a');
  p.disc(146, 60, 15, GOLD);
  p.disc(146, 62, 7, '#fff2c0');
  for (const [x, y, w, h] of [[110, 30, 8, 2], [176, 26, 2, 9], [124, 18, 2, 7], [184, 46, 9, 2], [104, 52, 6, 2]]) p.rect(x, y, w, h, OUTLINE);
  ship(p, 146, 94, { facing: -1, flag, scale: 0.9, burning: true });
  p.rect(110, 94, 72, 3, '#e07a2a');
  // The captain's ship in silhouette in the foreground.
  const silhouette = { rect: (x, y, w, h) => p.rect(x, y, w, h, '#120d09'), disc: p.disc, outlined: (parts) => parts.forEach(([x, y, w, h]) => p.rect(x, y, w, h, '#120d09')) };
  ship(silhouette, 46, 122, { facing: 1, scale: 1.3 });
  p.rect(0, 122, 224, 6, '#152a33');
}

function drawDividePlunder(p) {
  // Plastered wall with barred windows and shafts of light.
  p.rect(0, 0, 224, 128, '#a88a62');
  p.rect(0, 74, 224, 54, '#6b4a2e');
  for (const wx of [40, 150]) {
    p.rect(wx - 1, 9, 26, 26, OUTLINE);
    p.rect(wx, 10, 24, 24, '#f4e6b8');
    for (let bar = 4; bar < 24; bar += 5) p.rect(wx + bar, 10, 2, 24, WOOD_DARK);
    for (let row = 0; row < 40; row += 1) {
      for (let x = row % 2; x < 22; x += 2) p.rect(wx + x + row * 0.8, 34 + row, 1, 1, '#c9ad80');
    }
  }
  // The clerk seated behind the table.
  figure(p, 86, 80, { coat: '#3a3a3a', collar: '#f4f0e4', hair: '#c7b897' });
  // Long table with columns of coins, an open chest and the clerk's ledger.
  p.rect(30, 70, 164, 4, WOOD_LIGHT);
  p.rect(30, 74, 164, 12, WOOD);
  p.rect(36, 86, 4, 24, WOOD_DARK);
  p.rect(184, 86, 4, 24, WOOD_DARK);
  for (let column = 0; column < 9; column += 1) {
    const height = 3 + ((column * 5) % 7) * 2;
    for (let coin = 0; coin < height; coin += 2) {
      p.rect(92 + column * 8, 69 - coin, 6, 1, GOLD);
      p.rect(92 + column * 8, 68 - coin, 6, 1, '#b8862a');
    }
  }
  p.outlined([[50, 58, 28, 12, WOOD], [50, 52, 28, 5, WOOD_LIGHT]]);
  p.rect(52, 58, 24, 3, GOLD);
  p.rect(50, 63, 28, 1, '#3a3a3a');
  for (const [x, y] of [[54, 57], [60, 56], [66, 57], [71, 56]]) p.rect(x, y, 2, 2, '#fff2c0');
  p.outlined([[80, 66, 12, 4, PARCHMENT]]);
  p.rect(90, 62, 1, 5, '#f4f0e4');
  // The captain at the head of the table, the crew lined up for their share.
  captain(p, 20, 112);
  const crew = ['#7a3a2a', '#4a5a3a', '#6a5a7a', '#8a6a3a'];
  crew.forEach((coat, index) => figure(p, 150 + index * 18, 110 + (index % 2) * 4, { coat, legs: PARCHMENT, hat: index === 2 ? '#a8331f' : undefined, skin: index === 1 ? '#8a5a3a' : SKIN }));
}

// A low-beamed waterfront tavern at dusk: the bar and casks on the left,
// card players and a fiddler, lanterns, a parrot on a beam, a hanging ship
// model, and the open door on the masts in the harbour.
function drawTavern(p) {
  p.rect(0, 0, 224, 128, '#4a3424');
  p.rect(0, 0, 224, 14, '#2c1e14');
  for (const x of [0, 56, 112, 168]) p.rect(x, 0, 6, 92, '#2c1e14');
  p.rect(0, 14, 224, 4, WOOD_DARK);
  p.rect(0, 92, 224, 36, '#5a3f2a');
  for (let x = 0; x < 224; x += 12) p.rect(x, 92, 1, 36, '#4a3220');
  // Open door on the harbour at dusk.
  p.rect(180, 30, 32, 62, OUTLINE);
  ['#5a3a50', '#8a4a4a', '#c46a3a'].forEach((color, band) => p.rect(182, 32 + band * 12, 28, 12, color));
  p.rect(182, 68, 28, 22, '#1f3a45');
  p.rect(182, 68, 28, 1, '#e39a4f');
  for (const x of [188, 202]) p.rect(x, 38, 1, 30, OUTLINE);
  p.rect(186, 64, 20, 4, OUTLINE);
  // Shelves of bottles and a slate behind the bar.
  for (const y of [30, 44]) {
    p.rect(8, y + 8, 44, 2, WOOD_LIGHT);
    for (let x = 10; x < 50; x += 6) p.outlined([[x, y, 3, 8, ['#3f6a3a', '#7a3a2a', '#2f4f6a'][(x + y) % 3]]]);
  }
  p.outlined([[64, 28, 20, 14, '#2a2a2a']]);
  for (let x = 67; x < 82; x += 3) p.rect(x, 31, 1, 4, PARCHMENT);
  // The bar, with casks below.
  p.outlined([[4, 62, 58, 6, WOOD_LIGHT], [6, 68, 54, 26, WOOD]]);
  for (const x of [10, 30]) { p.disc(x + 8, 82, 8, '#6b4a2e'); p.rect(x, 78, 17, 1, OUTLINE); p.rect(x, 86, 17, 1, OUTLINE); }
  figure(p, 34, 62, { coat: '#ead8ad', hair: '#2a1e14', collar: '#a8331f' });
  p.rect(28, 56, 6, 6, '#8a8a8a');
  // Lanterns hanging from the beam, with a warm pool of light.
  for (const lx of [100, 150]) {
    p.rect(lx, 18, 1, 8, OUTLINE);
    p.outlined([[lx - 3, 26, 7, 8, GOLD]]);
    p.rect(lx - 1, 28, 3, 4, '#fff2c0');
  }
  // Parrot on the beam and a ship model.
  p.outlined([[126, 8, 5, 6, '#3f9a4a'], [131, 9, 2, 2, GOLD], [125, 14, 3, 5, '#a8331f']]);
  p.rect(72, 18, 1, 6, OUTLINE);
  p.rect(64, 30, 18, 3, WOOD);
  p.rect(66, 24, 1, 6, OUTLINE); p.rect(74, 22, 1, 8, OUTLINE);
  p.rect(67, 24, 5, 4, PARCHMENT); p.rect(75, 22, 5, 5, PARCHMENT);
  // Card table with sailors, and a fiddler.
  for (const x of [94, 116, 138]) figure(p, x, 100, { coat: ['#7a3a2a', '#4a5a3a', '#6a5a7a'][(x / 22) % 3 | 0], legs: PARCHMENT, hat: x === 116 ? '#a8331f' : undefined, skin: x === 138 ? '#8a5a3a' : SKIN });
  p.outlined([[88, 86, 58, 4, WOOD_LIGHT], [94, 90, 4, 18, WOOD_DARK], [136, 90, 4, 18, WOOD_DARK]]);
  for (const [x, c] of [[100, '#f4f0e4'], [108, '#f4f0e4'], [126, GOLD]]) p.rect(x, 84, 4, 2, c);
  p.outlined([[118, 80, 4, 6, '#c9c9c9']]);
  figure(p, 168, 116, { coat: '#2f4f6a', legs: WOOD_DARK, hat: '#1d1710' });
  p.outlined([[170, 92, 8, 5, '#a85a2a']]);
  p.rect(166, 90, 14, 1, PARCHMENT);
  // The captain at the near table.
  p.outlined([[20, 108, 40, 4, WOOD_LIGHT]]);
  captain(p, 40, 128);
  p.outlined([[50, 102, 5, 6, '#8a8a8a']]);
}

// A plump merchant in a soft cap, spectacles and apron, before shelves of
// bales and casks and a hanging scale.
function drawMerchant(picture) {
  picture.rect(0, 0, 96, 128, '#8a6a46');
  for (const y of [24, 56]) {
    picture.rect(0, y, 96, 3, WOOD_DARK);
    for (let x = 2; x < 96; x += 16) {
      picture.rect(x, y - 13, 12, 13, OUTLINE);
      picture.rect(x + 1, y - 12, 10, 12, (x / 16) % 2 ? '#c9b07a' : '#7a5a36');
      picture.rect(x + 1, y - 7, 10, 1, '#5a3b22');
    }
  }
  picture.rect(80, 0, 1, 70, OUTLINE);
  picture.rect(72, 70, 17, 1, OUTLINE);
  picture.rect(72, 71, 6, 3, BRASS);
  picture.rect(83, 71, 6, 3, BRASS);
  const p = zoomed(picture, 1.12, 48, 0);
  // Broad, round shoulders; a brown coat with a linen shirt and an apron.
  for (let row = 0; row < 64; row += 1) {
    const half = Math.min(44, 24 + row * 1.6);
    p.rect(48 - half - 1, 64 + row, half * 2 + 2, 1, OUTLINE);
    p.rect(48 - half, 64 + row, half * 2, 1, row < 1 ? OUTLINE : '#6b4a2e');
  }
  p.rect(36, 66, 24, 62, '#f4f0e4');
  p.rect(34, 80, 28, 48, '#c9b48a');
  p.rect(34, 80, 28, 2, '#8a7a5a');
  p.rect(30, 80, 4, 2, '#8a7a5a'); p.rect(62, 80, 4, 2, '#8a7a5a');
  p.outlined([[42, 88, 12, 8, '#b8a37a']]);
  p.rect(44, 86, 1, 4, '#3a3a3a');
  // A round face with jowls and a grey fringe.
  p.outlined([[44, 56, 8, 8, '#c08a64'], [30, 20, 36, 40, SKIN]]);
  p.rect(30, 50, 3, 10, '#c08a64'); p.rect(63, 50, 3, 10, '#c08a64');
  p.rect(30, 20, 2, 2, '#8a6a46'); p.rect(64, 20, 2, 2, '#8a6a46');
  p.rect(28, 26, 4, 14, '#b8b0a0'); p.rect(64, 26, 4, 14, '#b8b0a0');
  p.rect(35, 42, 6, 4, '#e2a68a'); p.rect(55, 42, 6, 4, '#e2a68a');
  // Soft, floppy cap leaning to one side.
  p.outlined([[28, 14, 40, 8, '#3f5a3a'], [32, 9, 34, 6, '#3f5a3a'], [62, 11, 10, 6, '#3f5a3a']]);
  p.rect(28, 20, 40, 2, '#2c3f2a');
  p.rect(34, 10, 14, 2, '#5a7a50');
  // Spectacles, brows, a round nose and a broad smile.
  p.rect(36, 30, 8, 1, '#7a7a7a'); p.rect(52, 30, 8, 1, '#7a7a7a');
  for (const ex of [36, 52]) {
    p.rect(ex - 1, 32, 10, 1, OUTLINE); p.rect(ex - 1, 38, 10, 1, OUTLINE);
    p.rect(ex - 1, 32, 1, 7, OUTLINE); p.rect(ex + 8, 32, 1, 7, OUTLINE);
    p.rect(ex + 2, 34, 4, 2, '#2a1e14');
  }
  p.rect(44, 34, 8, 1, OUTLINE);
  p.rect(45, 40, 6, 5, '#e2a68a');
  p.rect(45, 44, 6, 1, '#a8714a');
  p.rect(40, 49, 16, 2, '#8a3a2a');
  p.rect(39, 47, 2, 2, '#8a3a2a'); p.rect(55, 47, 2, 2, '#8a3a2a');
  p.rect(42, 51, 12, 1, '#f4f0e4');
}

function drawMissing(p) {
  p.rect(0, 0, 224, 128, '#3b2b1d');
}

const SCENES = {
  governor: { shape: 'portrait', draw: drawGovernor },
  'prize-plunder': { shape: 'landscape', draw: drawPrizePlunder },
  'enemy-destroyed': { shape: 'landscape', draw: drawEnemyDestroyed },
  'divide-plunder': { shape: 'landscape', draw: drawDividePlunder },
  tavern: { shape: 'landscape', draw: drawTavern },
  merchant: { shape: 'portrait', draw: drawMerchant },
};

// The shared 8 px carved frame with a brass fillet and corner pieces
// (scene-vignettes.md §3).
function drawFrame(p, w, h) {
  const ring = (inset, color) => {
    p.rect(inset, inset, w - 2 * inset, 1, color);
    p.rect(inset, h - inset - 1, w - 2 * inset, 1, color);
    p.rect(inset, inset, 1, h - 2 * inset, color);
    p.rect(w - inset - 1, inset, 1, h - 2 * inset, color);
  };
  ring(0, OUTLINE);
  for (let inset = 1; inset < 6; inset += 1) ring(inset, inset === 1 ? WOOD_LIGHT : inset === 5 ? WOOD_DARK : WOOD);
  // Bevel: the bottom and right sides of the wood fall in shadow.
  for (let inset = 1; inset < 6; inset += 1) {
    p.rect(inset, h - inset - 1, w - 2 * inset, 1, inset === 1 ? WOOD_DARK : WOOD);
    p.rect(w - inset - 1, inset, 1, h - 2 * inset, inset === 1 ? WOOD_DARK : WOOD);
  }
  ring(6, BRASS);
  ring(7, OUTLINE);
  for (const [x, y] of [[0, 0], [w - 6, 0], [0, h - 6], [w - 6, h - 6]]) {
    p.rect(x, y, 6, 6, OUTLINE);
    p.rect(x + 1, y + 1, 4, 4, BRASS);
    p.rect(x + 2, y + 2, 2, 2, GOLD);
  }
}
