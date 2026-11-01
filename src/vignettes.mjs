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
  'harbour-arrival': 'Sailing into a colonial harbour town',
  'shore-arrival': 'A landing party comes out of the jungle above a town',
  shipwreck: 'A ship breaking up on a reef',
  marooned: 'Washed ashore on an uncharted island',
  merchant: 'Portrait of the merchant',
  shipwright: 'Portrait of the shipwright',
  barmaid: 'Portrait of the barmaid',
  bartender: 'Portrait of the bartender',
  traveller: 'Portrait of a traveller selling information',
  'map-seller': 'Portrait of a pirate selling a scrap of treasure map',
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

function house(p, x, y, w, h, wall = '#e8e0cc') {
  p.outlined([[x, y, w, h, wall]]);
  for (let row = 0; row < 4; row += 1) p.rect(x - 1 + row, y - 4 + row, w + 2 - 2 * row, 1, '#b8562e');
  p.rect(x - 2, y - 1, w + 4, 1, '#8a3a22');
  p.rect(x + 2, y + 3, 2, 3, WOOD_DARK);
  if (w > 9) p.rect(x + w - 5, y + 3, 2, 3, WOOD_DARK);
}

function flagpole(p, x, y, nation, height = 14) {
  const [field, mark] = FLAGS[nation] ?? FLAGS.pirate;
  p.rect(x, y - height, 1, height, OUTLINE);
  p.rect(x + 1, y - height, 9, 6, field);
  p.rect(x + 4, y - height + 1, 3, 4, mark);
}

function palm(p, x, y, height = 20) {
  for (let row = 0; row < height; row += 1) p.rect(x + Math.round(Math.sin(row / 6) * 2), y - row, 2, 1, '#6b4a2e');
  const top = y - height;
  for (const [dx, dy, w] of [[-9, 1, 9], [2, 1, 9], [-6, -2, 6], [2, -2, 6], [-11, 3, 3], [10, 3, 3]]) p.rect(x + dx, top + dy, w, 2, '#3f7a3a');
  p.rect(x - 1, top + 1, 4, 2, '#2f5a2a');
}

// Seen over the bow rail: a whitewashed town climbing a green hill above
// the harbour, a fort at the harbour mouth flying the town's flag, a
// moored merchantman and fishing boats.
function drawHarbourArrival(p, { flag = 'Spain' } = {}) {
  sky(p, ['#8fc0d0', '#a4cdd6', '#bcd9d6', '#d4e4d0'], 60);
  for (const [cx, cy, w] of [[20, 10, 30], [120, 16, 40]]) { p.rect(cx, cy, w, 4, '#eef3ee'); p.rect(cx + 5, cy - 3, w - 12, 3, '#eef3ee'); }
  // The hill.
  for (let row = 0; row < 40; row += 1) {
    const half = 30 + row * 2.2;
    p.rect(120 - half, 30 + row, half * 2, 1, row % 9 === 0 ? '#4a8a4a' : '#5a9a4a');
  }
  p.rect(0, 64, 224, 6, '#5a9a4a');
  // Houses up the hill and a church.
  for (const [x, y, w] of [[96, 44, 12], [112, 40, 10], [126, 46, 12], [84, 54, 10], [100, 56, 12], [118, 54, 14], [138, 56, 10], [150, 60, 12], [72, 62, 12], [90, 64, 10], [106, 66, 12], [124, 64, 12], [140, 66, 10]]) house(p, x, y, w, 6);
  p.outlined([[112, 26, 8, 14, '#e8e0cc']]);
  p.rect(115, 22, 2, 4, OUTLINE); p.rect(114, 23, 4, 1, OUTLINE);
  p.rect(114, 30, 4, 4, WOOD_DARK);
  // The fort on a headland at the harbour mouth.
  p.outlined([[160, 58, 44, 14, '#b4a68a'], [168, 50, 20, 8, '#b4a68a']]);
  for (let x = 160; x < 204; x += 6) p.rect(x, 56, 3, 2, '#b4a68a');
  for (const x of [166, 178, 190]) p.rect(x, 64, 4, 2, OUTLINE);
  flagpole(p, 178, 50, flag, 16);
  palm(p, 30, 72, 22); palm(p, 46, 72, 16); palm(p, 210, 60, 14);
  sea(p, 72, '#3a8a8a', '#7ab8b0');
  p.rect(0, 72, 224, 1, '#e8f0e0');
  ship(p, 70, 88, { facing: 1, flag, scale: 0.6 });
  for (const x of [130, 150]) { p.outlined([[x, 84, 10, 3, WOOD]]); p.rect(x + 5, 76, 1, 8, OUTLINE); p.rect(x + 2, 77, 3, 5, PARCHMENT); }
  // Our bow and rail in the foreground, the captain seen from behind.
  p.rect(0, 112, 224, 16, WOOD);
  p.rect(0, 110, 224, 3, WOOD_LIGHT);
  for (let x = 4; x < 224; x += 14) p.rect(x, 113, 3, 15, WOOD_DARK);
  p.rect(150, 98, 74, 12, WOOD_LIGHT);
  p.rect(150, 98, 74, 2, BRASS);
  captain(p, 54, 128, { skin: WOOD_DARK });
}

// A landing party at the jungle's edge looks down a dirt road on a
// palisaded town with a church tower and the town's flag.
function drawShoreArrival(p, { flag = 'Spain' } = {}) {
  sky(p, ['#b4cdc4', '#c4d6c4', '#d4dcc4'], 44);
  // Far hills and the town in the valley below.
  for (let row = 0; row < 20; row += 1) p.rect(0, 30 + row, 224, 1, row < 6 ? '#7aa07a' : '#6a9a5a');
  p.rect(0, 50, 224, 30, '#6a9a5a');
  p.rect(110, 46, 92, 2, '#8a6a42');
  for (let x = 110; x < 202; x += 3) p.rect(x, 40, 2, 7, '#8a6a42');
  for (const [x, y, w] of [[118, 40, 12], [134, 38, 10], [160, 40, 12], [178, 38, 12]]) house(p, x, y, w, 6);
  p.outlined([[148, 26, 7, 18, '#e8e0cc']]);
  p.rect(150, 30, 3, 3, WOOD_DARK);
  p.rect(151, 22, 1, 4, OUTLINE); p.rect(150, 23, 3, 1, OUTLINE);
  flagpole(p, 194, 38, flag, 14);
  // The dirt road winding down from the party.
  for (let row = 0; row < 48; row += 1) p.rect(70 + row * 1.2 + Math.sin(row / 7) * 6, 128 - row * 1.7, 14 - row * 0.2, 2, '#b89a6a');
  // Hazy jungle edge on both sides.
  for (const [x, h] of [[0, 30], [14, 40], [196, 36], [210, 28]]) palm(p, x, 128, h);
  for (let x = 0; x < 50; x += 6) p.disc(x, 108 - (x % 12), 9, x % 12 ? '#2f6a32' : '#3f7a3a');
  for (let x = 176; x < 230; x += 6) p.disc(x, 106 - (x % 12), 9, x % 12 ? '#2f6a32' : '#3f7a3a');
  // The landing party, the captain in front with a hand raised.
  const coats = ['#7a3a2a', '#4a5a3a', '#6a5a7a', '#8a6a3a', '#5a3a2a', '#3a4a5a'];
  coats.forEach((coat, index) => figure(p, 92 + (index % 3) * 13 + (index > 2 ? 6 : 0), 108 + (index > 2 ? 10 : 0), { coat, legs: PARCHMENT, hat: index % 2 ? '#a8331f' : undefined, skin: index === 4 ? '#8a5a3a' : SKIN }));
  for (const x of [98, 111, 124]) p.rect(x, 78, 1, 14, '#3a3a3a');
  captain(p, 76, 124);
  p.outlined([[82, 94, 2, 8, SKIN]]);
}

// A ship heeled over on a reef, masts gone by the board, the sea breaking
// over her and her crew in the water and on a spar.
function drawShipwreck(p) {
  sky(p, ['#5a6a7a', '#6a7a86', '#7a8a90', '#8a9a98'], 64);
  for (const [cx, cy, w] of [[10, 12, 60], [96, 20, 70], [170, 8, 50]]) { p.rect(cx, cy, w, 6, '#4a5a68'); p.rect(cx + 6, cy - 4, w - 14, 4, '#4a5a68'); }
  sea(p, 64, '#2a5a60', '#5a8a88');
  // The wreck, hull canted on the reef.
  for (let row = 0; row < 18; row += 1) {
    const x = 76 + row * 0.8;
    p.rect(x - 1, 92 - row, 70 - row * 1.4 + 2, 1, OUTLINE);
    p.rect(x, 92 - row, 70 - row * 1.4, 1, row === 6 ? BRASS : row % 5 === 0 ? WOOD_DARK : WOOD);
  }
  p.rect(84, 78, 6, 6, '#2a5a60'); p.rect(110, 84, 8, 4, '#1f3a45');
  // Masts leaning, one snapped, with torn sails.
  for (let step = 0; step < 34; step += 1) p.rect(100 + step * 0.7, 74 - step, 2, 1, WOOD_DARK);
  for (let step = 0; step < 18; step += 1) p.rect(126 + step * 1.1, 76 - step * 0.6, 2, 1, WOOD_DARK);
  p.outlined([[106, 52, 12, 10, '#c7b48a'], [110, 62, 6, 4, '#c7b48a']]);
  p.outlined([[136, 64, 8, 4, '#c7b48a']]);
  // Reef rocks and the breaking sea.
  for (const [x, w] of [[64, 14], [140, 20], [170, 10]]) { p.rect(x, 90, w, 4, '#3a3a36'); p.rect(x + 2, 88, w - 4, 2, '#4a4a44'); }
  for (const [x, y, w] of [[60, 86, 24], [138, 84, 30], [96, 94, 50], [168, 86, 14]]) { p.rect(x, y, w, 2, '#e8f0ee'); p.rect(x + 4, y - 2, w - 10, 2, '#cfe0dc'); }
  // Crew clinging to a spar and swimming.
  p.rect(30, 104, 40, 3, WOOD);
  for (const x of [36, 50, 62]) p.outlined([[x, 100, 5, 5, SKIN], [x - 1, 105, 7, 3, '#7a3a2a']]);
  for (const [x, y] of [[164, 110], [186, 102]]) { p.outlined([[x, y, 5, 5, SKIN]]); p.rect(x - 4, y + 5, 13, 1, '#e8f0ee'); }
  p.outlined([[150, 112, 18, 4, WOOD_LIGHT]]);
}

// A castaway on a palm-fringed beach shares a driftwood fire with island
// people who bring him fruit and fish; the wreck lies broken on the reef.
function drawMarooned(p) {
  sky(p, ['#8fc0d0', '#a8d0d4', '#c4dcd0'], 54);
  sea(p, 54, '#3a8a8a', '#7ab8b0');
  // The wreck far out on the reef.
  for (let row = 0; row < 6; row += 1) p.rect(168 + row, 64 - row, 30 - row * 2, 1, WOOD_DARK);
  p.rect(178, 46, 1, 14, WOOD_DARK);
  for (let step = 0; step < 10; step += 1) p.rect(186 + step, 58 - step, 1, 1, WOOD_DARK);
  p.rect(160, 64, 46, 1, '#e8f0ee');
  // Beach and surf.
  for (let row = 0; row < 56; row += 1) p.rect(0, 72 + row, 224, 1, row < 2 ? '#e8f0ee' : row < 6 ? '#d8c890' : '#e4d4a0');
  for (let x = 0; x < 224; x += 9) p.rect(x, 74 + (x % 4), 4, 1, '#c8b880');
  palm(p, 20, 112, 50); palm(p, 40, 106, 36); palm(p, 206, 108, 44);
  // Driftwood fire.
  p.rect(100, 112, 22, 3, '#6b4a2e');
  p.rect(104, 110, 14, 2, '#8a6a42');
  p.rect(107, 102, 8, 8, '#e07a2a');
  p.rect(109, 98, 4, 6, GOLD);
  p.rect(110, 90, 2, 6, '#b8b0a0');
  // The castaway captain, ragged, beside two islanders with fruit and fish.
  figure(p, 88, 120, { coat: '#d8ccb0', legs: '#2c3f63', hair: WOOD_DARK });
  for (const x of [134, 152]) figure(p, x, 120, { coat: '#8a5a3a', legs: '#c46a3a', skin: '#8a5a3a', hair: '#1d1710' });
  p.outlined([[126, 104, 6, 4, '#e0b33a'], [140, 100, 4, 3, '#a8331f']]);
  p.outlined([[158, 104, 10, 3, '#9ab0b4']]);
}

// A burly, bald shipwright with a short beard, rolled sleeves and a
// leather apron, an adze on his shoulder, before the ribs of a hull on the
// slipway.
function drawShipwright(picture) {
  ['#8fc0d0', '#a4cdd6', '#bcd9d6'].forEach((color, band) => picture.rect(0, band * 16, 96, 16, color));
  picture.rect(0, 48, 96, 80, '#d8c890');
  // The ribs and keel of a hull under construction.
  picture.rect(0, 96, 96, 4, WOOD_DARK);
  for (let x = 2; x < 96; x += 9) {
    for (let row = 0; row < 60; row += 1) picture.rect(x + Math.round((row * row) / 300), 96 - row, 3, 1, row < 2 ? WOOD_DARK : '#a87a4a');
  }
  picture.rect(0, 50, 96, 2, '#7a5a36');
  const p = zoomed(picture, 1.2, 48, 0);
  // Heavy shoulders and arms in a rolled-sleeve shirt, under a leather apron.
  for (let row = 0; row < 64; row += 1) {
    const half = Math.min(46, 14 + row * 3);
    p.rect(48 - half - 1, 60 + row, half * 2 + 2, 1, OUTLINE);
    p.rect(48 - half, 60 + row, half * 2, 1, row < 1 ? OUTLINE : '#d8ccb0');
  }
  p.rect(6, 82, 12, 46, SKIN); p.rect(78, 82, 12, 46, SKIN);
  p.rect(6, 80, 12, 3, '#b8ac90'); p.rect(78, 80, 12, 3, '#b8ac90');
  p.outlined([[30, 72, 36, 56, '#8a5a32']]);
  p.rect(30, 72, 4, 56, '#6b4422'); p.rect(62, 72, 4, 56, '#6b4422');
  p.rect(34, 64, 2, 9, '#6b4422'); p.rect(60, 64, 2, 9, '#6b4422');
  p.outlined([[40, 92, 16, 10, '#7a4a2a']]);
  p.rect(43, 90, 1, 6, '#b8b0a0'); p.rect(47, 89, 1, 7, '#8a6a42');
  // The adze over his right shoulder.
  for (let step = 0; step < 40; step += 1) p.rect(66 + step * 0.45, 92 - step, 3, 1, '#8a6a42');
  p.outlined([[78, 46, 12, 5, '#8a8a8a']]);
  p.rect(78, 50, 4, 3, '#6a6a6a');
  // A broad bald head with a fringe, heavy brows and a short beard.
  p.outlined([[40, 54, 16, 10, '#c08a64'], [30, 18, 36, 40, SKIN]]);
  p.rect(36, 19, 14, 3, '#f0c8a0');
  p.rect(29, 30, 4, 14, '#5a4030'); p.rect(63, 30, 4, 14, '#5a4030');
  p.rect(26, 34, 4, 8, SKIN); p.rect(66, 34, 4, 8, SKIN);
  p.rect(36, 32, 9, 3, '#4a3526'); p.rect(51, 32, 9, 3, '#4a3526');
  for (const ex of [38, 53]) { p.rect(ex, 36, 5, 2, '#f4f0e4'); p.rect(ex + 2, 36, 2, 2, '#2a1e14'); }
  p.rect(46, 36, 4, 9, '#c08a64');
  p.rect(45, 44, 6, 2, '#a8714a');
  p.outlined([[33, 47, 30, 11, '#5a4030']]);
  p.rect(41, 50, 14, 2, '#8a3a2a');
  p.rect(37, 49, 22, 1, '#4a3526');
}

// A cheerful, winking barmaid with loose curls and a ribbon, in a linen
// blouse and laced bodice, raising a tankard, before a candlelit bar shelf.
function drawBarmaid(picture) {
  picture.rect(0, 0, 96, 128, '#4a3424');
  picture.rect(0, 0, 96, 10, '#2c1e14');
  picture.rect(0, 10, 96, 3, WOOD_DARK);
  for (const x of [0, 66]) picture.rect(x, 13, 5, 115, '#2c1e14');
  // A shelf of bottles, and a candle in a sconce with its glow.
  picture.rect(6, 42, 34, 2, WOOD_LIGHT);
  for (let x = 8; x < 38; x += 6) {
    picture.rect(x, 32, 4, 10, OUTLINE);
    picture.rect(x + 1, 33, 2, 9, ['#3f6a3a', '#7a3a2a', '#2f4f6a'][(x / 6) % 3 | 0]);
  }
  picture.disc(84, 26, 11, '#5a3f2a');
  picture.disc(84, 26, 6, '#7a5634');
  picture.rect(82, 26, 4, 9, PARCHMENT);
  picture.rect(80, 35, 8, 2, BRASS);
  picture.rect(83, 22, 2, 4, GOLD);
  picture.rect(83, 24, 2, 1, '#fff2c0');
  const p = zoomed(picture, 1.2, 48, 0);
  // Curls falling behind the head onto the shoulders.
  const hair = '#6a3a1e';
  p.outlined([[24, 16, 48, 52, hair]]);
  for (let y = 22; y < 68; y += 7) { p.rect(22, y, 3, 4, hair); p.rect(71, y + 3, 3, 4, hair); p.rect(26, y + 2, 4, 2, '#4a2814'); p.rect(66, y + 5, 4, 2, '#4a2814'); }
  // Shoulders in a linen blouse, under a laced bodice.
  for (let row = 0; row < 64; row += 1) {
    const half = Math.min(42, 18 + row * 2);
    p.rect(48 - half - 1, 64 + row, half * 2 + 2, 1, OUTLINE);
    p.rect(48 - half, 64 + row, half * 2, 1, row < 1 ? OUTLINE : '#f4f0e4');
  }
  for (let x = 12; x < 84; x += 6) p.rect(x, 74, 2, 1, '#c9c3b4');
  p.outlined([[30, 82, 36, 46, '#2f4a3a']]);
  p.rect(30, 82, 36, 2, '#a8331f');
  for (let y = 88; y < 128; y += 6) { p.rect(44, y, 8, 1, PARCHMENT); p.rect(47, y - 2, 2, 5, OUTLINE); }
  // A sleeve rolled to the elbow on the left.
  p.outlined([[8, 104, 16, 5, '#d8ccb0']]);
  p.rect(10, 109, 12, 19, SKIN);
  // Neck and a round, rosy face.
  p.outlined([[42, 54, 12, 12, SKIN], [32, 22, 32, 36, SKIN]]);
  p.rect(42, 62, 12, 2, '#c08a64');
  p.rect(60, 26, 4, 30, '#c08a64');
  p.rect(35, 43, 6, 4, '#e2928a'); p.rect(55, 43, 6, 4, '#e2928a');
  // A fringe of curls and a red ribbon.
  p.outlined([[30, 14, 36, 9, hair]]);
  for (const x of [32, 40, 48, 56]) p.rect(x, 23, 5, 3, hair);
  p.rect(34, 16, 10, 2, '#8a5230');
  p.outlined([[58, 12, 9, 5, '#a8331f'], [64, 16, 3, 6, '#a8331f']]);
  // One eye open under a raised brow, the other closed in a wink.
  p.rect(37, 31, 8, 2, '#4a2814');
  p.rect(51, 33, 8, 2, '#4a2814');
  p.rect(38, 35, 6, 3, '#f4f0e4'); p.rect(40, 35, 3, 3, '#3a5a2a'); p.rect(41, 35, 1, 1, '#f4f0e4');
  p.rect(37, 34, 8, 1, OUTLINE);
  p.rect(52, 37, 6, 1, OUTLINE); p.rect(51, 36, 1, 1, OUTLINE); p.rect(58, 36, 1, 1, OUTLINE);
  // A small nose and a broad smile.
  p.rect(47, 38, 2, 6, '#c08a64');
  p.rect(46, 43, 4, 1, '#a8714a');
  p.rect(41, 48, 14, 3, '#a8331f');
  p.rect(39, 46, 2, 2, '#a8331f'); p.rect(55, 46, 2, 2, '#a8331f');
  p.rect(43, 48, 10, 1, '#f4f0e4');
  // A foaming tankard raised in her right hand.
  p.outlined([[72, 66, 10, 30, '#f4f0e4']]);
  p.outlined([[70, 40, 14, 18, '#9a9a9a'], [69, 36, 16, 5, '#f4f0e4'], [84, 44, 3, 10, '#7a7a7a']]);
  p.rect(70, 44, 14, 1, '#7a7a7a'); p.rect(70, 52, 14, 1, '#7a7a7a');
  p.rect(72, 41, 2, 15, '#c9c9c9');
  p.outlined([[71, 56, 12, 9, SKIN]]);
}

// A one-eyed bartender with a big moustache, drying a pewter mug, before
// shelves of rum bottles, stacked casks and a slate with a chalked tally.
function drawBartender(picture) {
  picture.rect(0, 0, 96, 128, '#4a3424');
  picture.rect(0, 0, 96, 8, '#2c1e14');
  // Rum bottles on two shelves.
  for (const y of [22, 46]) {
    picture.rect(0, y, 96, 3, WOOD_LIGHT);
    for (let x = 2; x < 96; x += 7) {
      picture.rect(x, y - 11, 5, 11, OUTLINE);
      picture.rect(x + 1, y - 10, 3, 10, ['#3f6a3a', '#7a3a2a', '#5a3a1a', '#2f4f6a'][(x / 7) % 4 | 0]);
      picture.rect(x + 2, y - 13, 1, 3, OUTLINE);
    }
  }
  // Casks stacked on the left, and the tally slate on the right.
  for (const [cx, cy] of [[8, 64], [8, 84], [26, 74]]) {
    picture.disc(cx, cy, 9, OUTLINE);
    picture.disc(cx, cy, 8, '#6b4a2e');
    picture.rect(cx - 8, cy - 4, 17, 1, OUTLINE); picture.rect(cx - 8, cy + 4, 17, 1, OUTLINE);
  }
  picture.rect(74, 54, 20, 18, OUTLINE);
  picture.rect(75, 55, 18, 16, '#2a2a2a');
  for (let x = 77; x < 90; x += 3) picture.rect(x, 58, 1, 5, PARCHMENT);
  picture.rect(76, 60, 14, 1, PARCHMENT);
  picture.rect(77, 66, 8, 1, PARCHMENT);
  const p = zoomed(picture, 1.2, 48, 0);
  // Broad shoulders in a linen shirt and a dark waistcoat.
  for (let row = 0; row < 64; row += 1) {
    const half = Math.min(44, 18 + row * 2.4);
    p.rect(48 - half - 1, 64 + row, half * 2 + 2, 1, OUTLINE);
    p.rect(48 - half, 64 + row, half * 2, 1, row < 1 ? OUTLINE : '#d8ccb0');
  }
  p.outlined([[18, 76, 18, 52, '#4a2e2a'], [60, 76, 18, 52, '#4a2e2a']]);
  for (let y = 84; y < 128; y += 9) p.rect(56, y, 2, 2, BRASS);
  // Thick neck and a broad, weathered face with a balding crown.
  p.outlined([[40, 54, 16, 12, '#c08a64'], [30, 20, 36, 38, SKIN]]);
  p.rect(60, 24, 6, 32, '#c08a64');
  p.rect(29, 28, 4, 16, '#3a2a1e'); p.rect(63, 28, 4, 16, '#3a2a1e');
  p.rect(36, 21, 14, 3, '#f0c8a0');
  // Black eyepatch on a cord over one eye; the other eye narrowed.
  p.rect(30, 27, 36, 1, OUTLINE);
  p.outlined([[36, 31, 9, 8, '#1b1b1b']]);
  p.rect(36, 29, 9, 2, '#3a2a1e');
  p.rect(51, 31, 9, 3, '#3a2a1e');
  p.rect(52, 35, 6, 2, '#f4f0e4'); p.rect(54, 35, 3, 2, '#2a1e14');
  // A bulbous nose and a great drooping moustache.
  p.outlined([[45, 37, 7, 9, '#c9876a']]);
  p.outlined([[34, 47, 28, 5, '#3a2a1e'], [30, 50, 6, 7, '#3a2a1e'], [60, 50, 6, 7, '#3a2a1e']]);
  p.rect(42, 53, 12, 1, '#8a3a2a');
  // Drying a pewter mug with a cloth.
  p.outlined([[8, 98, 20, 30, SKIN], [70, 96, 20, 32, SKIN]]);
  p.outlined([[30, 92, 22, 26, '#9a9a9a'], [52, 98, 5, 14, '#7a7a7a']]);
  p.rect(30, 98, 22, 1, '#7a7a7a'); p.rect(30, 110, 22, 1, '#7a7a7a');
  p.rect(33, 93, 3, 24, '#c9c9c9');
  p.outlined([[56, 100, 22, 14, '#f4f0e4']]);
  p.rect(58, 104, 18, 1, '#c9c3b4'); p.rect(58, 109, 18, 1, '#c9c3b4');
}

// A dusty, well-dressed traveller in a wide hat and travelling cloak, a
// satchel strap across his chest, holding up a sealed letter, in a quiet
// corner of the tavern by a shuttered window.
function drawTraveller(picture) {
  picture.rect(0, 0, 96, 128, '#3e2c20');
  for (let x = 0; x < 96; x += 16) picture.rect(x, 0, 1, 128, '#2c1e14');
  // A window with half-open shutters on a grey evening.
  picture.rect(56, 10, 34, 36, OUTLINE);
  picture.rect(58, 12, 30, 32, '#6a7a86');
  picture.rect(58, 34, 30, 10, '#4a5a66');
  picture.rect(72, 12, 2, 32, OUTLINE);
  picture.rect(50, 10, 6, 36, WOOD); picture.rect(90, 10, 6, 36, WOOD);
  picture.rect(54, 46, 38, 3, WOOD_LIGHT);
  const p = zoomed(picture, 1.2, 48, 0);
  // Shoulders under a dusty travelling cloak, a satchel strap across them.
  for (let row = 0; row < 64; row += 1) {
    const half = Math.min(44, 18 + row * 2.2);
    p.rect(48 - half - 1, 64 + row, half * 2 + 2, 1, OUTLINE);
    p.rect(48 - half, 64 + row, half * 2, 1, row < 1 ? OUTLINE : '#7a6a52');
  }
  p.rect(38, 66, 20, 62, '#3a4a5a');
  p.rect(42, 66, 12, 6, '#f4f0e4');
  for (let y = 76; y < 128; y += 8) p.rect(47, y, 2, 2, BRASS);
  for (let row = 0; row < 56; row += 1) p.rect(26 + row * 0.8, 70 + row, 5, 1, '#5a3b22');
  for (let y = 80; y < 128; y += 12) p.rect(8, y, 14, 1, '#9a8a6e');
  // A lean face, dusty and unshaven, with a thin moustache.
  p.outlined([[42, 54, 12, 12, '#c08a64'], [33, 22, 30, 36, SKIN]]);
  p.rect(58, 24, 5, 32, '#c08a64');
  p.rect(36, 48, 24, 8, '#b88a6a');
  p.rect(37, 34, 8, 2, '#3a2a1e'); p.rect(51, 34, 8, 2, '#3a2a1e');
  for (const ex of [38, 52]) { p.rect(ex, 37, 6, 2, '#f4f0e4'); p.rect(ex + 3, 37, 2, 2, '#2a3a4a'); }
  p.rect(47, 38, 3, 8, '#c08a64');
  p.rect(46, 45, 5, 1, '#a8714a');
  p.rect(40, 48, 16, 2, '#3a2a1e');
  p.rect(43, 51, 10, 1, '#8a3a2a');
  p.rect(30, 30, 4, 20, '#3a2a1e'); p.rect(62, 30, 4, 20, '#3a2a1e');
  // A wide, dusty hat with a band, tipped low.
  p.outlined([[14, 22, 68, 5, '#4a3e30'], [32, 8, 32, 15, '#4a3e30']]);
  p.rect(32, 18, 32, 3, '#2a2018');
  p.rect(34, 9, 20, 2, '#6a5a46');
  p.rect(16, 23, 64, 1, '#6a5a46');
  // A sealed letter held up in a gloved hand.
  p.outlined([[66, 84, 22, 15, PARCHMENT], [70, 98, 14, 10, '#5a3b22']]);
  p.rect(68, 88, 18, 1, '#b8a37a'); p.rect(68, 92, 14, 1, '#b8a37a');
  p.outlined([[74, 93, 5, 4, '#a8331f']]);
}

// A toothless old pirate in a filthy head-scarf with a gold earring,
// grinning over a torn scrap of treasure map, by a guttering candle.
function drawMapSeller(picture) {
  picture.rect(0, 0, 96, 128, '#22180f');
  picture.disc(14, 84, 22, '#3a2818');
  picture.disc(14, 84, 12, '#4e3620');
  picture.rect(0, 0, 96, 6, OUTLINE);
  for (let x = 30; x < 96; x += 22) picture.rect(x, 6, 2, 122, '#1a120a');
  const p = zoomed(picture, 1.2, 48, 0);
  // Hunched shoulders in a patched, threadbare coat.
  for (let row = 0; row < 64; row += 1) {
    const half = Math.min(44, 16 + row * 2.6);
    p.rect(48 - half - 1, 62 + row, half * 2 + 2, 1, OUTLINE);
    p.rect(48 - half, 62 + row, half * 2, 1, row < 1 ? OUTLINE : '#4a3e2a');
  }
  p.rect(38, 64, 20, 64, '#8a7a5a');
  for (let y = 70; y < 128; y += 5) p.rect(40, y, 16, 1, '#6a5a40');
  p.outlined([[12, 90, 10, 9, '#6a5a3a'], [72, 100, 11, 8, '#5a3a2a']]);
  // A gaunt, stubbled face with a hooked nose and a gap-toothed grin.
  p.outlined([[42, 52, 12, 12, '#b07a54'], [32, 20, 32, 36, '#c8946a']]);
  p.rect(58, 22, 6, 32, '#a8714a');
  p.rect(34, 44, 28, 12, '#9a7458');
  p.rect(36, 32, 8, 2, '#8a8a7a'); p.rect(52, 31, 8, 3, '#8a8a7a');
  p.rect(37, 35, 6, 3, '#e8dcc0'); p.rect(40, 35, 2, 3, '#2a1e14');
  p.rect(53, 35, 6, 2, '#e8dcc0'); p.rect(54, 35, 2, 2, '#2a1e14');
  p.rect(36, 39, 4, 1, '#8a5a3a'); p.rect(57, 39, 4, 1, '#8a5a3a');
  p.outlined([[46, 36, 5, 9, '#b07a54']]);
  p.rect(49, 44, 3, 2, '#9a6040');
  p.rect(38, 47, 20, 5, '#3a1414');
  p.rect(37, 46, 2, 2, '#3a1414'); p.rect(57, 46, 2, 2, '#3a1414');
  p.rect(41, 47, 3, 2, '#e0d4a0'); p.rect(50, 47, 2, 3, '#e0d4a0');
  // A filthy red head-scarf with knotted tails, and a gold earring.
  p.outlined([[28, 12, 40, 12, '#8a2a20'], [66, 18, 8, 5, '#8a2a20'], [70, 22, 5, 12, '#8a2a20']]);
  for (const x of [32, 42, 52, 60]) p.rect(x, 15, 3, 3, '#5a1a14');
  p.rect(28, 22, 40, 2, '#5a1a14');
  p.outlined([[29, 44, 3, 5, GOLD]]);
  // The torn scrap of map, held up with a red X.
  p.outlined([[52, 76, 34, 24, '#d8c08a']]);
  for (const [x, y] of [[52, 76], [80, 76], [52, 96], [84, 92], [66, 98]]) p.rect(x, y, 2, 2, OUTLINE);
  p.rect(56, 82, 14, 1, '#7a6a4a'); p.rect(60, 88, 18, 1, '#7a6a4a');
  for (let i = 0; i < 6; i += 1) { p.rect(70 + i, 84 + i, 2, 1, '#a8331f'); p.rect(75 - i, 84 + i, 2, 1, '#a8331f'); }
  p.rect(58, 92, 8, 4, '#6a8a5a');
  p.outlined([[50, 98, 10, 8, '#b07a54'], [84, 96, 8, 10, '#b07a54']]);
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
  shipwright: { shape: 'portrait', draw: drawShipwright },
  barmaid: { shape: 'portrait', draw: drawBarmaid },
  bartender: { shape: 'portrait', draw: drawBartender },
  traveller: { shape: 'portrait', draw: drawTraveller },
  'map-seller': { shape: 'portrait', draw: drawMapSeller },
  'harbour-arrival': { shape: 'landscape', draw: drawHarbourArrival },
  'shore-arrival': { shape: 'landscape', draw: drawShoreArrival },
  shipwreck: { shape: 'landscape', draw: drawShipwreck },
  marooned: { shape: 'landscape', draw: drawMarooned },
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
