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
  'port-quay': 'Ships at anchor beyond a busy quay',
  'town-square': 'A colonial town square on market day',
  shipwreck: 'A ship breaking up on a reef',
  marooned: 'Washed ashore on an uncharted island',
  merchant: 'Portrait of the merchant',
  shipwright: 'Portrait of the shipwright',
  barmaid: 'Portrait of the barmaid',
  bartender: 'Portrait of the bartender',
  traveller: 'Portrait of a traveller selling information',
  'map-seller': 'Portrait of a pirate selling a scrap of treasure map',
  'open-court': 'A young captain kneels before a noble patron at court',
  'open-plantation': 'A labourer meets smugglers at the edge of the cane fields',
  'open-quarterdeck': 'Two rivals draw swords on a quarterdeck before the crew',
  'open-boarded': 'A Spanish officer draws his sword on your deck',
  'open-landfall': 'Your ship reaches a green West Indian island',
  'open-prison': 'A prisoner in a moonlit stone cell',
  'open-night-raid': 'Smugglers row toward an anchored ship by moonlight',
  'open-buccaneers': 'A buccaneer camp on a beach',
  'open-colony': 'Angry settlers confront their captain in a poor colony',
  'open-swords': 'Two swords cross on a ship’s deck',
  'open-chart': 'A sea chart with dividers and a compass rose',
  'sailing-master': 'Portrait of the sailing master',
  'villain-news': 'Portrait of a scarred nobleman with a cruel smile',
  'dig-found': 'Your crew opens an oak chest of gold in a fresh pit',
  'dig-nothing': 'Tired sailors lean on their spades among empty holes',
  reunion: 'A lost relative runs into the captain’s arms at a plantation gate',
  'lost-city-inca': 'Lost Inca gold in a sea cave beside an old wreck',
  'lost-city-aztec': 'Lost Aztec gold in a sea cave beside an old wreck',
  'lost-city-olmec': 'Lost Olmec gold in a sea cave beside an old wreck',
  'lost-city-maya': 'Lost Maya gold in a sea cave beside an old wreck',
  'sail-ho': 'The lookout points out a tiny sail on the horizon',
  boarding: 'Two ships grind together as boarders swing across through the smoke',
  'hostage-talks': 'A bound enemy captain offers a secret in the stern cabin',
  'crew-recruits': 'Sailors crowd around as the captain writes their names in the articles',
  'treasure-fleet': 'Gold passes from a beaten royal galleon to the captain’s ship',
  'silver-train': 'Buccaneers lift silver bars from a broken mule train',
  mutiny: 'An armed crew confronts the captain on the quarterdeck at dawn',
  prison: 'The wounded captain sits in a stone cell with tally marks on the wall',
  'hall-of-fame': 'A hall of captains’ portraits, with an open record and an empty frame',
  'alley-duel': 'Two swordsmen square off in a moonlit alley',
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

// The town's waterfront from the quay: a warehouse and its hoist, stevedores
// among the cargo, and the ships lying at anchor in the bay under the fort.
function drawPortQuay(p, { flag = 'Spain' } = {}) {
  sky(p, ['#8fc0d0', '#a4cdd6', '#bcd9d6', '#d4e4d0'], 50);
  for (const [cx, cy, w] of [[92, 12, 34], [176, 20, 28]]) { p.rect(cx, cy, w, 4, '#eef3ee'); p.rect(cx + 5, cy - 3, w - 12, 3, '#eef3ee'); }
  // The far headland and its fort across the bay.
  for (let row = 0; row < 12; row += 1) p.rect(140 - row * 3, 38 + row, 90 + row * 3, 1, row % 5 === 0 ? '#4a8a4a' : '#5a9a4a');
  p.outlined([[176, 30, 30, 10, '#b4a68a']]);
  for (let x = 176; x < 206; x += 6) p.rect(x, 28, 3, 2, '#b4a68a');
  flagpole(p, 190, 30, flag, 14);
  sea(p, 50, '#3a8a8a', '#7ab8b0');
  ship(p, 164, 80, { facing: -1, flag, scale: 0.8 });
  ship(p, 122, 70, { facing: 1, flag, scale: 0.4 });
  p.outlined([[120, 84, 12, 3, WOOD]]);
  p.rect(123, 85, 3, 1, PARCHMENT);
  // The warehouse on the left, with an arcade and a hoist over the quay.
  p.outlined([[0, 26, 74, 66, '#e8e0cc']]);
  for (let row = 0; row < 10; row += 1) p.rect(0, 16 + row, 74 + row - 9, 1, row % 3 === 2 ? '#8a3a22' : '#b8562e');
  p.rect(0, 26, 76, 2, '#8a3a22');
  for (const x of [8, 32, 56]) { p.rect(x, 34, 10, 12, WOOD_DARK); p.rect(x + 4, 34, 1, 12, OUTLINE); }
  for (const x of [4, 28, 52]) { p.rect(x, 62, 18, 30, WOOD_DARK); p.rect(x + 2, 58, 14, 4, WOOD_DARK); }
  p.rect(0, 48, 74, 2, '#c9bfa6');
  p.outlined([[74, 40, 22, 3, WOOD]]);
  p.rect(92, 43, 1, 19, OUTLINE);
  p.outlined([[86, 62, 13, 9, '#c9b07a']]);
  p.rect(86, 66, 13, 1, WOOD);
  // The stone quay, in courses, with its mooring posts.
  p.rect(0, 92, 224, 36, '#a8a08c');
  p.rect(0, 92, 224, 2, '#c9c0a8');
  for (let row = 98; row < 128; row += 6) {
    p.rect(0, row, 224, 1, '#8a8270');
    for (let x = (row % 12) * 2; x < 224; x += 16) p.rect(x, row, 1, 6, '#8a8270');
  }
  for (const x of [136, 206]) p.outlined([[x, 86, 5, 8, WOOD_DARK]]);
  // Cargo waiting on the quay.
  for (const x of [10, 22]) { p.outlined([[x, 96, 10, 14, '#6b4a2e']]); p.rect(x, 100, 10, 1, OUTLINE); p.rect(x, 106, 10, 1, OUTLINE); }
  p.outlined([[16, 84, 10, 12, '#7a5a36']]);
  p.rect(16, 89, 10, 1, OUTLINE);
  p.outlined([[176, 102, 18, 10, '#c9b07a'], [180, 94, 12, 8, '#b8a37a']]);
  p.rect(176, 106, 18, 1, WOOD);
  // Stevedores at the hoist, and the captain looking over his ships.
  figure(p, 84, 104, { coat: '#7a3a2a', legs: PARCHMENT, hair: WOOD_DARK });
  figure(p, 102, 108, { coat: '#d8ccb0', legs: '#4a5a3a', skin: '#8a5a3a', hat: '#a8331f' });
  captain(p, 150, 122);
}

// A landlocked town's plaza at noon: the church, the governor's arcaded
// house under the town's flag, market stalls, a well, soldiers and an ox cart.
function drawTownSquare(p, { flag = 'Spain' } = {}) {
  sky(p, ['#8fc0d0', '#a4cdd6', '#bcd9d6'], 44);
  // Green hills beyond the rooftops: no sea anywhere in this view.
  for (let x = 0; x < 224; x += 2) p.rect(x, 26 + Math.round(Math.sin(x / 26) * 4), 2, 24, '#6a9a5a');
  for (let x = 0; x < 224; x += 2) p.rect(x, 34 + Math.round(Math.sin(x / 15 + 1) * 3), 2, 16, '#5a8a4a');
  p.rect(0, 62, 224, 66, '#d4bc8c');
  for (const [x, y] of [[16, 96], [58, 118], [118, 120], [150, 84], [190, 112], [100, 92], [30, 74]]) p.rect(x, y, 7, 1, '#c0a678');
  // The white church with its bell gable.
  p.outlined([[12, 30, 64, 34, '#e8e0cc'], [32, 12, 24, 18, '#e8e0cc']]);
  p.rect(36, 2, 16, 10, OUTLINE);
  p.rect(37, 3, 14, 9, '#e8e0cc');
  p.rect(41, 5, 6, 7, WOOD_DARK);
  p.rect(43, 6, 2, 4, BRASS);
  p.rect(43, 0, 2, 3, OUTLINE);
  p.outlined([[36, 44, 16, 20, WOOD]]);
  p.rect(43, 44, 2, 20, WOOD_DARK);
  p.disc(44, 22, 3, WOOD_DARK);
  for (const x of [20, 62]) p.rect(x, 40, 4, 10, WOOD_DARK);
  // The governor's house: a roofed upper floor over an arcade.
  p.outlined([[112, 28, 104, 36, '#d9c8a4']]);
  for (let row = 0; row < 6; row += 1) p.rect(108 + row, 22 + row, 112 - 2 * row + 8, 1, row % 3 === 2 ? '#8a3a22' : '#b8562e');
  for (let x = 118; x < 208; x += 16) { p.rect(x, 33, 7, 9, WOOD_DARK); p.rect(x - 1, 42, 9, 1, OUTLINE); }
  for (let x = 116; x < 212; x += 16) { p.rect(x, 50, 11, 14, '#5a4630'); p.disc(x + 5, 50, 5, '#5a4630'); }
  flagpole(p, 164, 22, flag, 16);
  // Market stalls with striped awnings.
  for (const [x, stripe] of [[86, '#a8331f'], [150, '#2f5a7a']]) {
    for (let at = 0; at < 30; at += 1) p.rect(x + at, 70, 1, 6, Math.floor(at / 5) % 2 ? PARCHMENT : stripe);
    p.rect(x, 69, 30, 1, OUTLINE);
    p.rect(x + 1, 76, 1, 14, WOOD_DARK); p.rect(x + 28, 76, 1, 14, WOOD_DARK);
    p.outlined([[x, 84, 30, 6, WOOD_LIGHT]]);
    for (let at = 3; at < 27; at += 5) p.rect(x + at, 82, 3, 2, ['#e0b33a', '#a8331f', '#3f7a3a'][at % 3]);
  }
  // The well, with its windlass.
  p.disc(60, 86, 8, OUTLINE);
  p.disc(60, 86, 7, '#a8a08c');
  p.disc(60, 86, 4, '#2a2a2a');
  p.rect(52, 72, 2, 14, WOOD_DARK); p.rect(67, 72, 2, 14, WOOD_DARK); p.rect(52, 72, 17, 2, WOOD);
  // Soldiers with halberds, and the captain crossing the square.
  for (const x of [196, 212]) {
    p.rect(x + 8, 74, 1, 30, WOOD_DARK);
    p.outlined([[x + 6, 71, 5, 3, '#c9c9c9']]);
    figure(p, x, 104, { coat: '#a8331f', legs: WOOD_DARK, hat: '#9a9a9a' });
  }
  captain(p, 112, 118);
  // An ox cart and some chickens in the foreground.
  p.outlined([[8, 104, 34, 10, WOOD_LIGHT], [42, 108, 12, 2, WOOD_DARK]]);
  for (const x of [12, 22, 32]) p.rect(x, 104, 1, 10, WOOD_DARK);
  p.disc(24, 118, 6, OUTLINE);
  p.disc(24, 118, 5, WOOD);
  p.disc(24, 118, 1, OUTLINE);
  p.outlined([[54, 104, 20, 12, '#8a6a4a'], [74, 102, 8, 8, '#7a5a3a'], [56, 116, 3, 6, '#7a5a3a'], [69, 116, 3, 6, '#7a5a3a']]);
  p.rect(78, 100, 1, 2, PARCHMENT); p.rect(75, 100, 1, 2, PARCHMENT);
  for (const [x, y] of [[138, 112], [150, 118], [168, 108]]) {
    p.outlined([[x, y, 5, 3, '#f4f0e4'], [x + 5, y - 2, 2, 2, '#f4f0e4']]);
    p.rect(x + 7, y - 1, 1, 1, '#e07a2a');
    p.rect(x + 5, y - 3, 2, 1, '#a8331f');
  }
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

// The career opening's scenes (src/opening.mjs).

// A patron on a dais hears a young captain who kneels, hat in hand.
function drawCourt(p) {
  p.rect(0, 0, 224, 128, '#6a2a2a');
  for (let x = 6; x < 224; x += 18) p.rect(x, 0, 2, 96, '#7a3a30');
  p.rect(0, 0, 224, 8, BRASS);
  for (const x of [34, 190]) { p.rect(x - 7, 0, 14, 96, '#c9b48a'); p.rect(x - 7, 0, 3, 96, '#e0d0a8'); p.rect(x - 9, 90, 18, 6, '#a8946a'); }
  p.rect(0, 96, 224, 32, '#7a5a36');
  for (let x = 0; x < 224; x += 28) p.rect(x, 96, 1, 32, WOOD);
  p.rect(84, 96, 56, 32, '#a8331f');
  p.rect(84, 96, 2, 32, GOLD); p.rect(138, 96, 2, 32, GOLD);
  // Dais and canopy behind the seated patron.
  p.outlined([[126, 86, 72, 10, '#8a6a42'], [136, 80, 52, 6, '#a07a4a']]);
  p.outlined([[146, 44, 32, 36, '#8a2a3a'], [150, 40, 24, 4, GOLD]]);
  figure(p, 162, 82, { coat: '#3a2a6a', legs: '#2a2050', hair: '#d8d0c0', collar: '#f4f0e4', sash: GOLD });
  // The charter held out, its seal hanging.
  p.outlined([[140, 62, 13, 9, PARCHMENT]]);
  p.rect(145, 71, 3, 3, '#a8331f');
  // Kneeling: the floor hides the lower legs.
  captain(p, 104, 112, { hatInHand: true });
  p.rect(92, 106, 24, 8, '#a8331f');
  p.outlined([[100, 104, 16, 3, WOOD_DARK]]);
}

function caneRows(p, top, colors) {
  for (let row = top; row < 128; row += 4) {
    for (let x = (row * 3) % 7; x < 224; x += 5) p.rect(x, row - 6, 2, 8, colors[(x + row) % colors.length]);
  }
}

// A labourer talks in secret with smugglers at the edge of the cane at dusk.
function drawPlantation(p) {
  sky(p, ['#3a2f55', '#7a4a5a', '#c47a4a', '#e8b060'], 54);
  p.disc(170, 52, 9, '#f4d58a');
  sea(p, 54, '#3a4a5a', '#7a6a60');
  ship(p, 176, 64, { scale: 0.45, sails: '#a8946a' });
  p.rect(0, 66, 224, 62, '#4a5a2a');
  caneRows(p, 74, ['#6a8a3a', '#7a9a44', '#587a30']);
  p.rect(70, 100, 100, 28, '#6a5a3a');
  figure(p, 92, 120, { coat: '#b8ac94', legs: '#7a6a50', hair: '#3a2a1e' });
  figure(p, 124, 122, { coat: '#3a4a5a', legs: WOOD_DARK, hat: '#1d1710' });
  figure(p, 142, 124, { coat: '#5a3a2a', legs: '#2a2a2a', hair: '#1d1710', sash: '#a8331f' });
  p.outlined([[150, 112, 10, 9, '#8a6a42']]);
}

function shipDeck(p, top) {
  p.rect(0, top, 224, 128 - top, '#8a6a42');
  for (let y = top + 7; y < 128; y += 8) p.rect(0, y, 224, 1, WOOD);
  for (let x = 13; x < 224; x += 41) for (let y = top; y < 128; y += 16) p.rect(x, y, 1, 8, WOOD);
}

function shipRail(p, y) {
  p.rect(0, y, 224, 3, WOOD);
  for (let x = 4; x < 224; x += 12) p.rect(x, y + 3, 3, 12, WOOD_DARK);
}

const blade = (p, x, y, length, direction) => {
  for (let step = 0; step < length; step += 1) p.rect(x + direction * step, y - Math.round(step * 0.4), 1, 1, '#dfe6ea');
};

// The hero faces a brutal captain while the crew looks on.
function drawQuarterdeck(p) {
  sky(p, ['#6a7a90', '#8a98a8', '#b8b8a8'], 60);
  sea(p, 60, '#3a6a7a', '#7aa8a8');
  shipRail(p, 66);
  shipDeck(p, 84);
  p.rect(26, 0, 7, 92, WOOD); p.rect(26, 0, 2, 92, WOOD_LIGHT);
  for (const [x, coat] of [[58, '#7a4a3a'], [78, '#3a5a5a'], [150, '#8a7a4a'], [168, '#5a4a6a'], [190, '#7a4a3a']]) figure(p, x, 92, { coat, hair: '#2a1e14' });
  figure(p, 88, 120, { coat: '#d8ccb0', legs: '#2c3f63', hair: '#6b4a2e' });
  blade(p, 96, 106, 18, 1);
  figure(p, 136, 122, { coat: '#3a1f1f', legs: '#1d1710', hat: '#1d1710', sash: GOLD });
  blade(p, 128, 108, 16, -1);
}

// A Spanish officer draws his sword on your deck, his ship alongside.
function drawBoarded(p, { flag = 'pirate' } = {}) {
  sky(p, ['#8fc0d8', '#b0d4e0', '#d4e4dc'], 52);
  sea(p, 52, '#2f7a8a', '#6ab0b0');
  ship(p, 158, 74, { facing: -1, flag: 'Spain', scale: 1.1 });
  ship(p, 40, 70, { flag, scale: 0.7 });
  shipRail(p, 78);
  shipDeck(p, 94);
  for (let step = 0; step < 16; step += 1) p.rect(100 + step * 3, 82 - step, 1, 1, OUTLINE);
  figure(p, 80, 120, { coat: '#d8ccb0', legs: '#2c3f63', hat: '#1d1710' });
  figure(p, 146, 122, { coat: '#a8331f', legs: '#e0b33a', hat: '#1d1710', sash: GOLD, collar: '#f4f0e4' });
  blade(p, 138, 110, 20, -1);
  for (const x of [176, 196]) figure(p, x, 116, { coat: '#b8a040', legs: '#7a3a2a', hat: '#6a6a70' });
}

function islandShore(p, y) {
  p.rect(0, y + 8, 110, 8, '#d8c890');
  for (let row = 0; row < 22; row += 1) p.rect(0, y + 8 - row, 104 - row * 3, 1, row < 12 ? '#3f7a3a' : '#2f6a4a');
}

// Your ship running in on a green West Indian island.
function drawLandfall(p, { flag = 'pirate' } = {}) {
  sky(p, ['#5aa8d8', '#7ac0e0', '#a8d8e4', '#d4ecdc'], 62);
  for (const [x, y, w] of [[130, 14, 50], [40, 24, 40], [176, 34, 34]]) { p.rect(x, y, w, 5, '#f4f4ec'); p.rect(x + 6, y - 3, w - 14, 3, '#f4f4ec'); }
  sea(p, 62, '#2a8aa0', '#7ac8c8');
  islandShore(p, 52);
  palm(p, 22, 62, 24); palm(p, 46, 62, 20); palm(p, 66, 62, 16);
  ship(p, 146, 108, { flag, scale: 1.2, facing: -1 });
}

// Stone walls, floor and an iron-bound door, shared by both prison scenes.
function stoneCell(p) {
  p.rect(0, 0, 224, 128, '#4a4a50');
  for (let y = 0; y < 104; y += 12) {
    p.rect(0, y, 224, 1, '#35353a');
    for (let x = (y % 24) * 2; x < 224; x += 34) p.rect(x, y, 1, 12, '#35353a');
  }
  p.rect(0, 104, 224, 24, '#3a3430');
  p.outlined([[172, 40, 40, 64, WOOD_DARK]]);
  for (const y of [50, 86]) p.rect(172, y, 40, 3, '#2a2a2a');
  p.outlined([[186, 54, 12, 8, OUTLINE]]);
  for (const x of [189, 193]) p.rect(x, 54, 1, 8, '#6a6a70');
}

// A stone cell, moonlight through the bars, a prisoner on the straw.
function drawPrison(p) {
  stoneCell(p);
  // Barred window and the shaft of light under it.
  p.rect(82, 14, 44, 30, OUTLINE);
  p.rect(84, 16, 40, 26, '#2a3a6a');
  p.disc(112, 26, 5, '#e8ecd8');
  for (let x = 90; x < 124; x += 8) p.rect(x, 16, 2, 26, OUTLINE);
  for (let row = 0; row < 62; row += 1) p.rect(84 - row / 3, 44 + row, 40 + row / 2, 1, row % 2 ? '#5a5a62' : '#55555e');
  // Straw, then the prisoner slumped against the wall, chained.
  for (let x = 20; x < 84; x += 3) p.rect(x, 110 + (x % 5), 7, 1, '#b8a060');
  figure(p, 56, 118, { coat: '#8a7a64', legs: '#5a4a3a', hair: '#3a2a1e' });
  p.rect(42, 118, 30, 3, '#3a3430');
  for (let step = 0; step < 16; step += 2) p.rect(48 - step, 104 - step, 1, 1, '#9a9aa2');
}

// Moonlit water: a boatload of smugglers creeps up on an anchored ship.
function drawNightRaid(p) {
  sky(p, ['#0f1a3a', '#16244a', '#1f3058'], 66);
  for (const [x, y] of [[20, 12], [60, 30], [96, 10], [128, 24], [206, 18], [180, 40], [36, 46]]) p.rect(x, y, 1, 1, '#e8ecd8');
  p.disc(170, 22, 10, '#e8ecd8');
  p.disc(166, 20, 2, '#c8ccb8');
  sea(p, 66, '#101f3a', '#3a5a7a');
  for (let row = 70; row < 128; row += 5) p.rect(160, row, 20, 1, '#a8b8c8');
  ship(p, 156, 88, { sails: '#26324a', scale: 1.1, flag: 'Spain' });
  // Rope to the anchor, then the boat, oars out.
  p.rect(186, 80, 1, 18, '#3a4a5a');
  p.outlined([[32, 112, 62, 7, WOOD]]);
  for (const x of [42, 58, 74]) { p.outlined([[x, 102, 7, 10, '#3a3a4a'], [x + 1, 96, 5, 6, '#a8826a']]); p.rect(x + 3, 116, 1, 11, WOOD_LIGHT); }
}

// The buccaneers' camp: a rough lean-to, smoke, a boat drawn up on the sand.
function drawBuccaneers(p) {
  sky(p, ['#7ab0c8', '#a0c8d0', '#c8dcc8'], 50);
  sea(p, 50, '#3a8a8a', '#7ab8b0');
  for (let row = 0; row < 62; row += 1) p.rect(0, 66 + row, 224, 1, row < 2 ? '#e8f0ee' : '#e0d09c');
  for (let row = 0; row < 16; row += 1) p.rect(0, 66 + row * 2, 66 - row * 4, 2, '#3f7a3a');
  palm(p, 14, 92, 46); palm(p, 196, 96, 44);
  p.outlined([[52, 66, 44, 4, '#a08a54'], [56, 70, 3, 22, WOOD], [90, 70, 3, 22, WOOD]]);
  // A boat hauled out and the smoking fire.
  p.outlined([[150, 78, 40, 6, WOOD]]);
  p.rect(116, 112, 22, 3, '#6b4a2e');
  p.rect(121, 104, 12, 8, '#e07a2a');
  p.rect(124, 100, 6, 6, GOLD);
  for (let step = 0; step < 16; step += 2) p.rect(126 + step % 5, 96 - step * 3, 4, 4, '#b8b0a0');
  figure(p, 92, 120, { coat: '#6a4a2a', legs: '#3a3a3a', hat: '#2a2a1e', sash: '#a8331f' });
  figure(p, 162, 122, { coat: '#d8ccb0', legs: '#5a3a2a', hair: '#1d1710' });
  p.rect(100, 104, 16, 1, WOOD_DARK);
  p.rect(146, 106, 14, 1, WOOD_DARK);
}

// A poor new colony: stakes, thatch, thin fields, angry settlers.
function drawColony(p) {
  sky(p, ['#a8b8b8', '#c0c8b8', '#d4d0b0'], 54);
  p.rect(0, 54, 224, 74, '#7a7a4a');
  for (let row = 58; row < 128; row += 7) p.rect((row * 5) % 30, row, 190, 1, '#6a6a3a');
  // Stockade.
  for (let x = 0; x < 224; x += 6) { p.rect(x, 38 + (x % 4), 5, 26, '#6b4a2e'); p.rect(x, 38 + (x % 4), 1, 26, '#8a6a42'); }
  for (const x of [34, 104, 168]) {
    p.outlined([[x, 62, 34, 18, '#b8a888'], [x + 13, 70, 8, 10, WOOD_DARK]]);
    for (let row = 0; row < 12; row += 1) p.rect(x - 4 + row, 61 - row, 42 - row * 2, 1, '#a08a54');
  }
  for (const [x, y, coat] of [[120, 112, '#6a5a44'], [138, 116, '#7a4a3a'], [156, 110, '#4a5a4a'], [172, 118, '#6a4a5a'], [192, 112, '#5a5a6a']]) figure(p, x, y, { coat, hair: '#3a2a1e' });
  blade(p, 112, 96, 14, -1);
  captain(p, 70, 120, {});
  blade(p, 78, 106, 14, 1);
}

// Blades crossed, seen close.
function drawSwords(picture) {
  sky(picture, ['#3a2f45', '#6a4040', '#a8603a'], 76);
  shipRail(picture, 68);
  shipDeck(picture, 84);
  const p = zoomed(picture, 2.2, 112, 128);
  figure(p, 84, 128, { coat: '#d8ccb0', legs: '#2c3f63', hair: '#6b4a2e' });
  figure(p, 140, 128, { coat: '#3a1f1f', legs: '#1d1710', hat: '#1d1710', sash: GOLD });
  for (let step = 0; step < 52; step += 1) {
    picture.rect(78 + step * 1.3, 96 - step * 0.8, 2, 1, '#dfe6ea');
    picture.rect(146 - step * 1.3, 96 - step * 0.8, 2, 1, '#c8d0d4');
  }
  picture.disc(112, 75, 3, '#f4e8b0');
}

// A sea chart pinned on the binnacle, with dividers and a compass rose.
function drawChart(p) {
  p.rect(0, 0, 224, 128, WOOD);
  for (let y = 12; y < 128; y += 16) p.rect(0, y, 224, 1, WOOD_DARK);
  p.outlined([[16, 8, 192, 112, PARCHMENT]]);
  for (let x = 40; x < 208; x += 30) p.rect(x, 8, 1, 112, '#d4bf8e');
  for (let y = 32; y < 120; y += 26) p.rect(16, y, 192, 1, '#d4bf8e');
  // Coasts.
  for (const [x, y, w, h] of [[20, 14, 70, 10], [20, 24, 42, 8], [20, 32, 20, 16], [112, 34, 46, 8], [122, 42, 30, 6], [170, 62, 10, 6], [182, 74, 8, 6], [40, 104, 120, 14], [60, 96, 70, 8]]) p.rect(x, y, w, h, '#a8b070');
  // Rose.
  for (const [x, y] of [[0, -14], [0, 14], [-14, 0], [14, 0]]) for (let step = 1; step < 5; step += 1) p.rect(176 + (x * step) / 5, 96 + (y * step) / 5, 2, 2, '#7a3a2a');
  p.disc(177, 97, 3, '#7a3a2a');
  // Dotted course and the dividers.
  for (let step = 0; step < 12; step += 1) p.rect(66 + step * 7, 60 + step, 3, 1, '#a8331f');
  for (let step = 0; step < 34; step += 1) { p.rect(96 + step * 0.5, 40 + step * 1, 1, 1, '#4a4a50'); p.rect(96 - step * 0.2, 40 + step, 1, 1, '#4a4a50'); }
  p.disc(96, 40, 2, BRASS);
}

// A stocky, weather-beaten sailing master with a grey queue and a pipe, on
// the quarterdeck by the wheel.
function drawSailingMaster(picture) {
  sky(picture, ['#8fb8d0', '#b0d0dc', '#d4e4e0'], 56);
  picture.rect(0, 56, 96, 18, '#3a7a8a');
  picture.rect(0, 74, 96, 54, WOOD);
  picture.rect(0, 74, 96, 3, WOOD_LIGHT);
  picture.rect(14, 0, 2, 74, WOOD_DARK);
  picture.outlined([[4, 12, 22, 30, PARCHMENT]]);
  picture.disc(82, 96, 15, OUTLINE);
  picture.disc(82, 96, 13, '#7a5a36');
  picture.disc(82, 96, 9, WOOD);
  const p = zoomed(picture, 1.2, 48, 0);
  for (let row = 0; row < 64; row += 1) {
    const half = Math.min(42, 17 + row * 2.2);
    p.rect(48 - half - 1, 66 + row, half * 2 + 2, 1, OUTLINE);
    p.rect(48 - half, 66 + row, half * 2, 1, row < 1 ? OUTLINE : '#2f3f4f');
  }
  p.outlined([[40, 66, 16, 34, '#d8ccb0']]);
  for (let y = 82; y < 128; y += 10) p.rect(32, y, 3, 3, BRASS);
  // Grey queue, broad face, knotted brow.
  p.outlined([[63, 34, 7, 22, '#a0a0a0']]);
  p.outlined([[40, 56, 16, 12, '#b07a54'], [30, 24, 36, 36, '#c9926a']]);
  p.rect(30, 24, 36, 7, '#a8a8a8');
  p.rect(28, 26, 4, 18, '#a8a8a8'); p.rect(64, 26, 4, 18, '#a8a8a8');
  p.outlined([[28, 16, 40, 8, '#2a2a30']]);
  p.rect(22, 22, 52, 3, OUTLINE);
  for (const x of [36, 52]) { p.rect(x - 1, 33, 10, 2, '#7a7a7a'); p.rect(x + 1, 36, 5, 2, '#f4f0e4'); p.rect(x + 2, 36, 2, 2, '#1d2a3a'); }
  p.outlined([[45, 38, 6, 9, '#b07a54']]);
  p.rect(34, 50, 28, 8, '#b8b8b8');
  p.rect(40, 51, 16, 2, '#8a3a2a');
  // Clay pipe.
  p.rect(52, 54, 24, 2, '#e8e0d0');
  p.outlined([[72, 46, 6, 8, '#e8e0d0']]);
  p.rect(73, 40, 3, 4, '#c8c8c8'); p.rect(75, 34, 3, 4, '#d8d8d8');
}

const spade = (p, x, y) => {
  p.rect(x, y, 2, 20, WOOD_LIGHT);
  p.outlined([[x - 2, y + 20, 6, 6, '#9a9a9a']]);
};

// An open oak chest whose lid stands behind it, heaped with gold.
function openChest(p, x, y) {
  p.outlined([[x, y - 22, 28, 10, WOOD], [x, y - 12, 28, 12, WOOD_LIGHT]]);
  p.rect(x, y - 8, 28, 2, BRASS);
  p.rect(x + 12, y - 9, 4, 5, BRASS);
  for (const [dx, width] of [[2, 24], [5, 18], [9, 10]]) p.rect(x + dx, y - 14 - (dx >> 1), width, 3, GOLD);
  for (const dx of [6, 13, 20]) p.rect(x + dx, y - 15, 2, 1, '#fff0b0');
}

// A treasure map held out in front of a figure at (x, y).
const heldMap = (p, x, y) => p.outlined([[x + 6, y - 20, 11, 8, PARCHMENT]]);

// A jungle clearing by a strange rock: the crew around a prised-open chest.
function drawDigFound(p) {
  sky(p, ['#8fc8d0', '#b4dcc8'], 40);
  for (let x = -8; x < 232; x += 18) p.disc(x, 38 + (x * 7) % 9, 15, x % 4 ? '#2f6a3a' : '#3f7a3a');
  p.rect(0, 46, 224, 12, '#2f6a3a');
  p.rect(0, 58, 224, 70, '#8a7a45');
  for (let x = 3; x < 224; x += 11) p.rect(x, 62 + (x * 5) % 58, 5, 1, '#73683a');
  palm(p, 22, 84, 52); palm(p, 204, 88, 56);
  // The strange rock that marks the spot.
  p.outlined([[150, 38, 26, 34, '#7c7a72'], [158, 28, 14, 12, '#8e8c84']]);
  p.rect(154, 44, 5, 2, '#5e5c56'); p.rect(162, 56, 8, 2, '#5e5c56');
  // The pit, its spoil heaped behind.
  p.disc(60, 84, 9, '#6b5230'); p.disc(160, 84, 11, '#6b5230');
  p.rect(66, 88, 92, 28, '#2f2416');
  p.rect(70, 84, 84, 6, '#4a3a22');
  openChest(p, 98, 112);
  figure(p, 58, 118, { coat: '#d8ccb0', legs: '#7a3a2a' });
  spade(p, 44, 92);
  figure(p, 170, 118, { coat: '#b8a040', legs: '#2c3f63' });
  spade(p, 180, 92);
  captain(p, 112, 82);
  heldMap(p, 112, 82);
}

// A beach scarred with empty holes at sunset.
function drawDigNothing(p) {
  sky(p, ['#5a4a7a', '#a8564a', '#e08a4a', '#f2c070'], 50);
  p.disc(168, 48, 10, '#fff0b0');
  sea(p, 50, '#7a4a5a', '#e0a060');
  p.rect(0, 66, 224, 62, '#d0b47a');
  for (let x = 2; x < 224; x += 13) p.rect(x, 70 + (x * 3) % 54, 6, 1, '#b89c64');
  palm(p, 18, 78, 46);
  for (const [x, y] of [[50, 80], [92, 76], [142, 82], [190, 78], [30, 106], [118, 112], [176, 110]]) {
    p.rect(x - 11, y - 1, 26, 4, '#b89c64');
    p.rect(x - 9, y, 22, 7, '#4a3a22');
    p.rect(x - 7, y + 5, 18, 2, '#2f2416');
  }
  // Two spent sailors, a hat thrown down, the captain with his useless map.
  figure(p, 62, 118, { coat: '#d8ccb0', legs: '#7a3a2a' });
  spade(p, 72, 92);
  figure(p, 196, 122, { coat: '#b8a040', legs: '#2c3f63' });
  spade(p, 184, 96);
  captain(p, 134, 104, { hatInHand: true });
  heldMap(p, 134, 104);
  p.outlined([[94, 118, 10, 2, '#1d1710'], [97, 115, 5, 3, '#1d1710']]);
}

// At a remote plantation's gate a thin, older relative runs to the captain.
function drawReunion(p, { female = true } = {}) {
  sky(p, ['#7aa0c0', '#c8a890', '#f0c88a'], 64);
  for (let row = 0; row < 12; row += 1) p.rect(0, 52 + row, 224, 1, row < 6 ? '#3f7a3a' : '#4f8a3f');
  p.rect(0, 64, 224, 64, '#a89058');
  // The cane fields and the stockade with its gate standing open.
  for (let x = 0; x < 62; x += 3) p.rect(x, 50 + (x % 7), 1, 18, '#6a9a3a');
  for (let x = 66; x < 224; x += 7) if (x < 118 || x > 150) p.outlined([[x, 42 + (x % 3), 5, 34, WOOD_LIGHT]]);
  p.outlined([[118, 28, 5, 48, WOOD], [150, 28, 5, 48, WOOD], [118, 28, 37, 5, WOOD]]);
  // Broken chains on the ground.
  for (let step = 0; step < 9; step += 1) p.rect(136 + step * 3, 118 + (step % 2), 2, 2, '#6a6a70');
  p.outlined([[160, 116, 7, 5, '#6a6a70']]);
  // The crew stands back.
  for (const [x, coat] of [[28, '#d8ccb0'], [46, '#b8a040']]) figure(p, x, 112, { coat, legs: '#2c3f63', hat: '#6a4a2e' });
  // The embrace: arms overlap across the two figures.
  captain(p, 92, 116, { hatInHand: true });
  if (female) {
    figure(p, 106, 116, { coat: '#a89a84', legs: '#a89a84', hair: '#c8c4bc' });
    p.outlined([[100, 102, 13, 14, '#a89a84']]);
  } else {
    figure(p, 106, 116, { coat: '#8a7a64', legs: '#5a4a3a', hair: '#c8c4bc' });
    p.outlined([[103, 90, 6, 5, '#c8c4bc']]);
  }
  p.rect(97, 97, 8, 3, female ? '#a89a84' : '#8a7a64');
}

// One culture's marks on the cave wall behind the gold.
const LOST_CITY_ART = {
  inca(p) {
    p.disc(56, 44, 15, GOLD); p.disc(56, 44, 10, BRASS); p.disc(56, 44, 5, GOLD);
    for (const [dx, dy] of [[-20, 0], [20, 0], [0, -20], [0, 20], [-14, -14], [14, -14], [-14, 14], [14, 14]]) p.rect(55 + dx, 43 + dy, 3, 3, GOLD);
    // A gold llama on the heap.
    p.outlined([[170, 86, 14, 7, GOLD], [182, 76, 4, 12, GOLD], [172, 93, 2, 6, GOLD], [181, 93, 2, 6, GOLD]]);
  },
  aztec(p) {
    p.disc(56, 44, 17, '#8a8a84'); p.disc(56, 44, 12, '#a8a8a0'); p.disc(56, 44, 5, '#6a6a64');
    for (let angle = 0; angle < 16; angle += 1) p.rect(56 + Math.cos(angle * Math.PI / 8) * 15, 44 + Math.sin(angle * Math.PI / 8) * 15, 2, 2, '#5a5a54');
    // A turquoise mask on the heap.
    p.outlined([[170, 78, 16, 20, '#3aa8a0']]);
    p.rect(173, 84, 3, 3, OUTLINE); p.rect(180, 84, 3, 3, OUTLINE); p.rect(175, 92, 6, 2, '#f4f0e4');
  },
  olmec(p) {
    // A colossal basalt head half buried in the cave floor.
    p.outlined([[34, 28, 46, 54, '#5a5e5a'], [30, 24, 54, 12, '#4a4e4a']]);
    p.rect(42, 44, 10, 4, OUTLINE); p.rect(62, 44, 10, 4, OUTLINE);
    p.rect(53, 50, 8, 12, '#4a4e4a'); p.rect(46, 66, 22, 5, '#3a3e3a');
    p.outlined([[172, 82, 8, 14, '#5aa87a']]);
    p.rect(174, 85, 4, 2, OUTLINE);
  },
  maya(p) {
    // A carved stela of glyphs.
    p.outlined([[42, 18, 30, 64, '#9a9484']]);
    for (let row = 0; row < 5; row += 1) for (let col = 0; col < 2; col += 1) {
      p.rect(46 + col * 12, 22 + row * 12, 10, 9, '#6a6454');
      p.rect(48 + col * 12, 24 + row * 12, 4 + (row + col) % 3, 3, '#9a9484');
    }
    p.outlined([[170, 78, 16, 20, '#3a8a5a']]);
    p.rect(173, 84, 3, 3, OUTLINE); p.rect(180, 84, 3, 3, OUTLINE); p.rect(174, 92, 8, 3, GOLD);
  },
};

// A hidden sea cave: an old wreck's ribs, spilled gold, torchlit crew, and
// the marks of the culture that lost it.
function drawLostCity(p, { culture }) {
  p.rect(0, 0, 224, 128, '#2f2a2a');
  for (let y = 0; y < 90; y += 9) for (let x = (y % 18) * 2; x < 224; x += 37) p.rect(x, y, 16, 2, '#3f3838');
  // The drowned mouth of the cave.
  p.disc(190, 48, 26, '#6ab0c8');
  p.rect(164, 54, 52, 22, '#2f7a8a');
  p.rect(0, 74, 224, 8, '#2f7a8a');
  for (let x = 4; x < 224; x += 15) p.rect(x, 76 + (x % 4), 7, 1, '#6ab0b0');
  p.rect(0, 82, 224, 46, '#6a5a3e');
  // The ribs of the foundered galleon.
  for (let rib = 0; rib < 6; rib += 1) {
    const x = 100 + rib * 11;
    p.rect(x, 44 + rib * 3, 3, 40 - rib * 3, WOOD_DARK);
    p.rect(x, 44 + rib * 3, 7, 3, WOOD_DARK);
  }
  p.rect(92, 80, 74, 4, WOOD_DARK);
  LOST_CITY_ART[culture](p);
  // The spilled hoard.
  for (const [dx, y, width] of [[0, 112, 104], [10, 108, 84], [24, 104, 54]]) p.rect(84 + dx, y, width, 5, dx ? GOLD : BRASS);
  for (let x = 90; x < 184; x += 9) p.rect(x, 106 + (x % 3) * 3, 2, 1, '#fff0b0');
  openChest(p, 122, 110);
  // Stunned crewmen with torches.
  for (const [x, coat, side] of [[34, '#d8ccb0', 8], [208, '#b8a040', -9]]) {
    figure(p, x, 122, { coat, legs: '#2c3f63' });
    p.rect(x + side, 88, 2, 16, WOOD_LIGHT);
    p.disc(x + side, 86, 3, '#e07a2a'); p.disc(x + side, 85, 1, GOLD);
  }
  captain(p, 74, 124);
}

// A menacing nobleman by a candle: thin moustache, cruel smile, a scar.
function drawVillain(picture) {
  picture.rect(0, 0, 96, 128, '#2a1a2e');
  picture.rect(0, 0, 96, 6, '#160d18');
  picture.rect(72, 58, 16, 3, WOOD_LIGHT);
  picture.rect(78, 42, 4, 16, PARCHMENT);
  picture.disc(80, 38, 3, '#e07a2a');
  picture.disc(80, 37, 1, GOLD);
  const p = zoomed(picture, 1.15, 40, 0);
  // Black coat with a gold edge, and a white lace collar.
  for (let row = 0; row < 62; row += 1) {
    const half = Math.min(38, 14 + row * 2.2);
    p.rect(40 - half - 1, 66 + row, half * 2 + 2, 1, OUTLINE);
    p.rect(40 - half, 66 + row, half * 2, 1, '#201a2a');
  }
  p.rect(37, 72, 6, 56, GOLD);
  p.rect(38, 72, 4, 56, '#6a1f2e');
  p.rect(28, 62, 24, 8, OUTLINE);
  p.rect(29, 63, 22, 6, PARCHMENT);
  // A long pale face under a plumed black hat.
  p.rect(26, 30, 28, 34, OUTLINE);
  p.rect(27, 31, 26, 32, '#d0a888');
  p.rect(20, 26, 40, 5, OUTLINE);
  p.rect(26, 12, 28, 15, OUTLINE);
  p.rect(27, 13, 26, 13, '#201a2a');
  p.rect(27, 22, 26, 3, GOLD);
  p.rect(50, 6, 4, 18, '#8a2a3a');
  // Narrow eyes, a pointed brow, the scar, a thin moustache and a smirk.
  p.rect(30, 40, 8, 2, OUTLINE);
  p.rect(42, 38, 8, 2, OUTLINE);
  p.rect(32, 43, 3, 2, OUTLINE);
  p.rect(44, 43, 3, 2, OUTLINE);
  for (let step = 0; step < 12; step += 1) p.rect(47 - step, 35 + step * 2, 1, 2, '#8a3a3a');
  p.rect(30, 53, 20, 1, OUTLINE);
  p.rect(28, 52, 3, 1, OUTLINE);
  p.rect(49, 51, 3, 1, OUTLINE);
  p.rect(34, 57, 12, 1, '#6a2a2a');
  p.rect(46, 56, 2, 1, '#6a2a2a');
  p.rect(38, 60, 4, 3, OUTLINE);
}

// The scenes that close out the sea, capture, captivity and hall-of-fame
// dialogs (scene-vignettes.md §4.4–§4.10).

// The lookout points from the crow's nest; the captain raises his spyglass
// toward a tiny sail on the horizon.
function drawSailHo(p) {
  sky(p, ['#4f9ac8', '#7ab8d8', '#a8d4e0', '#d4e8e0'], 66);
  for (const [x, y, w] of [[92, 14, 46], [160, 28, 38]]) { p.rect(x, y, w, 4, '#f4f4ec'); p.rect(x + 8, y - 3, w - 18, 3, '#f4f4ec'); }
  sea(p, 66, '#1f6a8a', '#6ab0c0');
  p.rect(186, 52, 1, 12, OUTLINE);
  p.rect(181, 54, 11, 7, '#f4f0e4');
  p.rect(180, 64, 13, 2, WOOD_DARK);
  p.rect(30, 0, 7, 128, WOOD);
  p.rect(30, 0, 2, 128, WOOD_LIGHT);
  for (let step = 0; step < 66; step += 1) { p.rect(37 + step * 0.9, 34 + step, 1, 1, WOOD_DARK); p.rect(37 + step * 0.5, 34 + step, 1, 1, WOOD_DARK); }
  figure(p, 34, 44, { coat: '#7a3a2a', legs: PARCHMENT, hat: '#a8331f' });
  p.outlined([[39, 23, 18, 2, '#7a3a2a'], [57, 23, 3, 2, SKIN], [14, 38, 40, 11, WOOD_LIGHT]]);
  p.rect(14, 42, 40, 1, WOOD_DARK);
  shipRail(p, 100);
  shipDeck(p, 114);
  captain(p, 130, 126);
  p.outlined([[135, 101, 2, 8, '#2c3f63'], [133, 99, 18, 3, BRASS]]);
}

// Two hulls grind together in the smoke: grapnels taut, men swinging across,
// and the enemy captain drawing on his own deck.
function drawBoarding(p, { flag = 'Spain' } = {}) {
  sky(p, ['#6a6470', '#8a7a78', '#b89a78', '#d8b880'], 76);
  sea(p, 76, '#2a5a64', '#6a9a9a');
  ship(p, 68, 112, { flag: 'pirate', scale: 1.4 });
  ship(p, 156, 112, { facing: -1, flag, scale: 1.4, sails: '#d8cfb4' });
  for (const [x, y, r] of [[112, 42, 16], [96, 56, 11], [132, 58, 13], [112, 70, 10]]) { p.disc(x, y, r, '#a8a096'); p.disc(x - 3, y - 2, r - 4, '#c4bcb0'); }
  for (const [fromX, fromY] of [[86, 74], [96, 62]]) {
    for (let step = 0; step < 42; step += 1) p.rect(fromX + step, fromY + step * 0.45, 1, 1, OUTLINE);
  }
  captain(p, 62, 98);
  blade(p, 70, 84, 14, 1);
  p.rect(116, 0, 1, 70, OUTLINE);
  figure(p, 116, 84, { coat: '#7a3a2a', legs: PARCHMENT, hat: '#a8331f' });
  blade(p, 123, 70, 10, 1);
  figure(p, 160, 98, { coat: '#3a1f1f', legs: '#1d1710', hat: '#1d1710', sash: GOLD, collar: '#f4f0e4' });
  blade(p, 152, 86, 15, -1);
}

// The stern cabin: a bound enemy captain leans over the table and offers a
// secret under the lantern.
function drawHostageTalks(picture) {
  picture.rect(0, 0, 224, 128, '#3f2a1a');
  for (let x = 12; x < 224; x += 26) picture.rect(x, 0, 1, 128, WOOD_DARK);
  picture.rect(0, 0, 224, 8, WOOD_DARK);
  for (const x of [56, 92, 128]) {
    picture.rect(x - 1, 15, 38, 36, OUTLINE);
    picture.rect(x, 16, 36, 22, '#c47a4a');
    picture.rect(x, 38, 36, 12, '#2a4a5a');
    picture.rect(x + 17, 16, 2, 34, WOOD);
  }
  picture.rect(111, 8, 1, 12, OUTLINE);
  picture.outlined([[107, 20, 9, 11, GOLD]]);
  picture.rect(109, 23, 5, 5, '#fff2c0');
  const p = zoomed(picture, 1.5, 112, 128);
  captain(p, 62, 128);
  figure(p, 162, 128, { coat: '#7a2a2a', legs: '#4a3a2c', hair: '#3a2a1e', collar: '#f4f0e4' });
  picture.outlined([[34, 104, 166, 5, WOOD_LIGHT], [46, 109, 5, 19, WOOD], [184, 109, 5, 19, WOOD]]);
  picture.outlined([[76, 99, 34, 5, PARCHMENT], [116, 101, 12, 3, '#6a6a70'], [146, 99, 28, 4, '#7a2a2a'], [138, 97, 8, 7, SKIN]]);
  picture.rect(90, 101, 8, 1, '#a8331f');
  picture.rect(138, 100, 8, 2, '#c9b07a');
}

// Mixed sailors crowd a tavern table as the captain enters their names in
// the articles, coins and the rum jug beside him.
function drawCrewRecruits(picture) {
  picture.rect(0, 0, 224, 128, '#6a4c30');
  picture.rect(0, 0, 224, 12, '#2c1e14');
  for (const x of [40, 118, 196]) picture.rect(x, 0, 6, 88, '#2c1e14');
  picture.rect(0, 88, 224, 40, '#4a3220');
  picture.rect(82, 12, 1, 8, OUTLINE);
  picture.outlined([[78, 20, 9, 10, GOLD]]);
  picture.rect(80, 23, 5, 4, '#fff2c0');
  const p = zoomed(picture, 1.35, 112, 128);
  // Tarred pigtail, a tall freedman with a boarding axe, a grizzled gunner
  // and a boy with a knife.
  figure(p, 100, 104, { coat: '#3a5a5a', legs: PARCHMENT, hair: '#1d1710' });
  figure(p, 124, 100, { coat: '#d8ccb0', legs: '#7a3a2a', hair: '#1d1710', skin: '#6a4228' });
  p.outlined([[134, 62, 2, 26, WOOD_LIGHT], [130, 60, 7, 6, '#9a9a9a']]);
  figure(p, 148, 104, { coat: '#6a4a2a', legs: '#3a3a3a', hair: '#c8c4bc' });
  figure(p, 170, 110, { coat: '#a8331f', legs: '#c9b07a', hat: '#d8ccb0' });
  captain(p, 58, 128);
  picture.outlined([[52, 98, 126, 6, WOOD_LIGHT], [62, 104, 6, 24, WOOD], [162, 104, 6, 24, WOOD]]);
  picture.outlined([[82, 92, 34, 6, PARCHMENT], [146, 86, 10, 12, '#7a7a68']]);
  for (const y of [94, 96]) picture.rect(86, y, 22, 1, '#7a6a50');
  picture.rect(110, 88, 1, 6, '#f4f0e4');
  for (const [x, y] of [[124, 94], [130, 96], [136, 94]]) picture.rect(x, y, 4, 2, GOLD);
}

// The beaten royal galleon alongside: gold goes hand to hand across a plank.
function drawTreasureFleet(p) {
  sky(p, ['#6ab0d8', '#8fc8e0', '#b8dce4', '#e0e8d4'], 66);
  sea(p, 66, '#1f7a8a', '#7ac8c0');
  ship(p, 158, 96, { facing: -1, flag: 'Spain', scale: 1.5, struck: true, sails: '#d8cfb4' });
  ship(p, 44, 104, { flag: 'pirate', scale: 1.05 });
  p.rect(64, 82, 62, 2, WOOD_LIGHT);
  for (const x of [76, 96, 116]) {
    figure(p, x, 82, { coat: x === 96 ? '#4a5a3a' : '#7a3a2a', legs: PARCHMENT });
    p.outlined([[x + 4, 64, 8, 3, GOLD]]);
  }
  // The heap already aboard, on the near deck.
  shipDeck(p, 108);
  for (const [x, y, width] of [[60, 118, 104], [72, 113, 80], [88, 108, 48]]) p.rect(x, y, width, 5, x === 60 ? BRASS : GOLD);
  for (let x = 64; x < 160; x += 9) p.rect(x, 110 + (x % 4) * 3, 2, 1, '#fff0b0');
  openChest(p, 98, 118);
  for (const [x, y] of [[160, 106], [170, 112], [180, 106]]) p.outlined([[x, y, 13, 4, GOLD]]);
}

function pannierMule(p, x, y) {
  p.outlined([[x, y - 18, 28, 12, '#7a6a5a'], [x + 27, y - 25, 8, 9, '#7a6a5a'], [x + 3, y - 6, 3, 6, '#5a4a3e'], [x + 21, y - 6, 3, 6, '#5a4a3e']]);
  p.rect(x + 29, y - 28, 2, 3, '#5a4a3e');
  p.outlined([[x + 7, y - 21, 14, 11, '#8a6a42']]);
  p.rect(x + 7, y - 14, 14, 1, WOOD_DARK);
  p.outlined([[x + 8, y - 6, 11, 3, '#d4dce0']]);
}

// A broken mule train in a dusty street: spilled silver, cheering buccaneers,
// the escort running past the church.
function drawSilverTrain(p) {
  sky(p, ['#8fc0d0', '#b4d4d0', '#dcdcc0'], 44);
  p.rect(0, 44, 224, 84, '#d4bc8c');
  for (const [x, y] of [[20, 70], [80, 118], [142, 84], [196, 108], [110, 74]]) p.rect(x, y, 8, 1, '#c0a678');
  p.outlined([[150, 22, 66, 40, '#e8e0cc'], [172, 6, 22, 16, '#e8e0cc']]);
  p.rect(182, 0, 2, 6, OUTLINE);
  p.outlined([[176, 42, 14, 20, WOOD]]);
  house(p, 4, 34, 54, 28);
  house(p, 72, 38, 46, 24);
  figure(p, 142, 80, { coat: '#a8331f', legs: WOOD_DARK, hat: '#9a9a9a' });
  figure(p, 124, 76, { coat: '#a8331f', legs: WOOD_DARK, hat: '#9a9a9a' });
  pannierMule(p, 28, 106);
  pannierMule(p, 96, 112);
  for (const [x, y] of [[66, 116], [80, 120], [140, 116], [150, 122], [70, 110]]) p.outlined([[x, y, 12, 4, '#d4dce0']]);
  for (const [x, coat] of [[18, '#7a3a2a'], [174, '#4a5a3a'], [200, '#8a6a3a']]) {
    figure(p, x, 122, { coat, legs: PARCHMENT, hat: x === 174 ? '#a8331f' : undefined });
    p.outlined([[x - 8, 80, 16, 4, '#d4dce0']]);
    p.rect(x - 7, 84, 2, 16, SKIN); p.rect(x + 5, 84, 2, 16, SKIN);
  }
  captain(p, 62, 126);
  blade(p, 69, 112, 12, 1);
}

// Dawn on the quarterdeck: a huge bare-chested ringleader points his cutlass
// at the captain, alone at the rail, with the crew armed behind him.
function drawMutiny(picture) {
  sky(picture, ['#4a4a70', '#a86a70', '#e8a070', '#f4d090'], 66);
  picture.disc(36, 66, 8, '#fff0b0');
  sea(picture, 66, '#4a5a70', '#c89878');
  shipRail(picture, 70);
  shipDeck(picture, 86);
  picture.rect(202, 0, 7, 90, WOOD);
  picture.rect(202, 0, 2, 90, WOOD_LIGHT);
  const crew = [[104, '#6a4a2a'], [122, '#3a5a5a'], [160, '#8a7a4a'], [178, '#5a4a6a'], [196, '#7a4a3a']];
  crew.forEach(([x, coat], index) => {
    figure(picture, x, 98, { coat, legs: PARCHMENT, hat: index % 2 ? '#a8331f' : undefined, hair: '#2a1e14' });
    picture.rect(x + 7, 76, 2, 10, index === 2 ? '#9a9a9a' : WOOD_DARK);
  });
  figure(picture, 138, 96, { coat: '#3a5a5a', legs: PARCHMENT, hair: '#2a1e14' });
  picture.outlined([[144, 68, 2, 18, WOOD_LIGHT], [141, 66, 7, 6, '#9a9a9a']]);
  captain(picture, 44, 124);
  blade(picture, 52, 110, 14, 1);
  const p = zoomed(picture, 1.5, 112, 128);
  figure(p, 134, 128, { coat: SKIN, legs: '#4a3a2c', hair: '#1d1710', sash: '#a8331f' });
  picture.outlined([[126, 106, 12, 3, SKIN]]);
  blade(picture, 126, 106, 44, -1);
}

// A stone cell by day, the same room as the opening's night prison; the
// captain, wounded, has been counting the months on the wall.
function drawImprisoned(p) {
  stoneCell(p);
  p.rect(36, 12, 34, 26, OUTLINE);
  p.rect(38, 14, 30, 22, '#d8e8e4');
  for (const x of [44, 52, 60]) p.rect(x, 14, 2, 22, OUTLINE);
  for (let row = 0; row < 16; row += 1) p.rect(82 + row * 2, 106 + row, 44, 1, row % 2 ? '#8a8270' : '#7a7464');
  for (let group = 0; group < 3; group += 1) {
    for (let mark = 0; mark < 4; mark += 1) p.rect(90 + group * 22 + mark * 3, 56, 1, 10, '#2a2a30');
    for (let step = 0; step < 13; step += 1) p.rect(89 + group * 22 + step, 64 - step * 0.7, 1, 1, '#2a2a30');
  }
  for (let x = 20; x < 84; x += 3) p.rect(x, 112 + (x % 4), 7, 1, '#b8a060');
  figure(p, 52, 118, { coat: '#2c3f63', legs: WOOD_DARK, hair: WOOD_DARK });
  p.rect(38, 118, 30, 3, '#3a3430');
  p.rect(45, 97, 2, 7, '#f4f0e4');
  p.rect(49, 90, 6, 2, '#6a5a4a');
  // A guard's shadow falls across the door.
  p.rect(182, 76, 20, 26, '#2f2118');
  p.disc(192, 70, 6, '#2f2118');
}

// A panelled hall of famous captains; the record lies open for a new name
// beneath an empty frame.
function drawHallOfFame(p) {
  p.rect(0, 0, 224, 128, '#5a3b22');
  p.rect(0, 0, 224, 6, '#2c1e14');
  for (let x = 0; x < 224; x += 32) p.rect(x, 6, 1, 98, WOOD_DARK);
  p.rect(0, 74, 224, 2, WOOD_LIGHT);
  p.rect(0, 104, 224, 24, '#3b2b1d');
  for (let x = 6; x < 224; x += 28) p.rect(x, 104, 1, 24, '#2c1e14');
  for (const [x, coat, hat] of [[10, '#2c3f63', '#1d1710'], [46, '#7a2a2a', undefined], [152, '#3a5a3a', '#1d1710'], [188, '#4a3a6a', undefined]]) {
    p.outlined([[x, 14, 26, 34, BRASS]]);
    p.rect(x + 2, 16, 22, 30, '#3a3230');
    p.rect(x + 5, 36, 16, 10, coat);
    p.rect(x + 9, 24, 8, 12, SKIN);
    p.rect(x + 8, 22, 10, 3, hat ?? '#6a5a4a');
  }
  p.outlined([[92, 12, 40, 44, BRASS]]);
  p.rect(95, 15, 34, 38, '#4a3120');
  p.rect(95, 15, 34, 2, '#2c1e14');
  p.outlined([[100, 84, 24, 6, WOOD_LIGHT], [108, 90, 8, 30, WOOD], [98, 118, 28, 4, WOOD_DARK]]);
  p.outlined([[86, 72, 25, 12, '#f4ecd4'], [112, 72, 25, 12, '#f4ecd4']]);
  p.rect(111, 72, 1, 12, '#b8a888');
  for (const y of [75, 78, 81]) { p.rect(89, y, 19, 1, '#8a7a5a'); if (y < 78) p.rect(115, y, 18, 1, '#8a7a5a'); }
  for (let step = 0; step < 14; step += 1) p.rect(128 + step * 0.7, 76 - step, 2, 1, '#f4f0e4');
  p.outlined([[148, 74, 8, 3, BRASS], [150, 62, 4, 12, PARCHMENT]]);
  p.disc(152, 58, 2, '#e07a2a');
  p.rect(152, 57, 1, 2, GOLD);
}

// A moonlit alley of whitewashed houses: two swordsmen square off, a shutter
// opens above and a cat bolts.
function drawAlleyDuel(p) {
  sky(p, ['#0f1a3a', '#16244a', '#1f3058'], 44);
  p.disc(112, 14, 7, '#e8ecd8');
  for (const [x, y] of [[92, 8], [134, 22], [120, 34]]) p.rect(x, y, 1, 1, '#e8ecd8');
  // The house closing the far end of the alley.
  p.rect(84, 44, 56, 42, '#5a6078');
  for (let row = 0; row < 8; row += 1) p.rect(82 + row, 44 - row, 60 - row * 2, 1, '#3a3f58');
  p.rect(106, 58, 12, 26, '#2a2f44');
  p.rect(0, 84, 224, 44, '#4a4a58');
  for (let row = 88; row < 128; row += 7) for (let x = (row * 3) % 19; x < 224; x += 19) p.rect(x, row, 12, 1, '#3a3a48');
  for (const [x, width, wall] of [[0, 84, '#8a92aa'], [140, 84, '#7a829a']]) {
    p.rect(x, 0, width, 88, wall);
    p.rect(x, 86, width, 2, '#4a5068');
  }
  // A long lit balcony on each side, with laundry on a line between them.
  for (const x of [16, 158]) {
    p.rect(x, 26, 16, 22, '#2a2f44');
    p.rect(x + 18, 26, 14, 22, x === 16 ? '#2a2f44' : '#d8a050');
    for (let bar = 0; bar < 36; bar += 4) p.rect(x - 2 + bar, 44, 1, 8, OUTLINE);
    p.rect(x - 2, 44, 36, 1, OUTLINE);
    p.rect(x - 2, 52, 36, 1, OUTLINE);
  }
  p.outlined([[186, 26, 4, 22, '#4a3a2c']]);
  for (let x = 84; x < 140; x += 1) p.rect(x, 20 + Math.round((1 - ((x - 112) / 28) ** 2) * 3), 1, 1, OUTLINE);
  p.outlined([[92, 22, 10, 13, '#c8d0d8'], [108, 21, 12, 10, '#a84a4a'], [124, 22, 8, 12, '#c8d0d8']]);
  p.rect(28, 56, 16, 28, '#3a2a22');
  p.rect(180, 56, 16, 28, '#3a2a22');
  for (let row = 0; row < 8; row += 1) p.rect(70 + row * 11, 120 - row * 2, 16, 1, '#2a2a38');
  captain(p, 84, 118);
  blade(p, 92, 104, 18, 1);
  figure(p, 140, 118, { coat: '#3a1f1f', legs: '#1d1710', hat: '#1d1710', sash: '#a8331f' });
  blade(p, 132, 104, 18, -1);
  p.rect(200, 118, 11, 4, '#1a1a22');
  p.rect(209, 114, 4, 4, '#1a1a22');
  p.rect(198, 112, 2, 7, '#1a1a22');
  p.rect(210, 112, 1, 2, '#1a1a22');
}

const SCENES = {
  governor: { shape: 'portrait', draw: drawGovernor },
  'villain-news': { shape: 'portrait', draw: drawVillain },
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
  'port-quay': { shape: 'landscape', draw: drawPortQuay },
  'town-square': { shape: 'landscape', draw: drawTownSquare },
  shipwreck: { shape: 'landscape', draw: drawShipwreck },
  marooned: { shape: 'landscape', draw: drawMarooned },
  'open-court': { shape: 'landscape', draw: drawCourt },
  'open-plantation': { shape: 'landscape', draw: drawPlantation },
  'open-quarterdeck': { shape: 'landscape', draw: drawQuarterdeck },
  'open-boarded': { shape: 'landscape', draw: drawBoarded },
  'open-landfall': { shape: 'landscape', draw: drawLandfall },
  'open-prison': { shape: 'landscape', draw: drawPrison },
  'open-night-raid': { shape: 'landscape', draw: drawNightRaid },
  'open-buccaneers': { shape: 'landscape', draw: drawBuccaneers },
  'open-colony': { shape: 'landscape', draw: drawColony },
  'open-swords': { shape: 'landscape', draw: drawSwords },
  'open-chart': { shape: 'landscape', draw: drawChart },
  'sailing-master': { shape: 'portrait', draw: drawSailingMaster },
  'dig-found': { shape: 'landscape', draw: drawDigFound },
  'dig-nothing': { shape: 'landscape', draw: drawDigNothing },
  reunion: { shape: 'landscape', draw: drawReunion },
  'lost-city-inca': { shape: 'landscape', draw: (p) => drawLostCity(p, { culture: 'inca' }) },
  'lost-city-aztec': { shape: 'landscape', draw: (p) => drawLostCity(p, { culture: 'aztec' }) },
  'lost-city-olmec': { shape: 'landscape', draw: (p) => drawLostCity(p, { culture: 'olmec' }) },
  'lost-city-maya': { shape: 'landscape', draw: (p) => drawLostCity(p, { culture: 'maya' }) },
  'sail-ho': { shape: 'landscape', draw: drawSailHo },
  boarding: { shape: 'landscape', draw: drawBoarding },
  'hostage-talks': { shape: 'landscape', draw: drawHostageTalks },
  'crew-recruits': { shape: 'landscape', draw: drawCrewRecruits },
  'treasure-fleet': { shape: 'landscape', draw: drawTreasureFleet },
  'silver-train': { shape: 'landscape', draw: drawSilverTrain },
  mutiny: { shape: 'landscape', draw: drawMutiny },
  prison: { shape: 'landscape', draw: drawImprisoned },
  'hall-of-fame': { shape: 'landscape', draw: drawHallOfFame },
  'alley-duel': { shape: 'landscape', draw: drawAlleyDuel },
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
