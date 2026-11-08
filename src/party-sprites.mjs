// Pixel-art landing party for the map, in the towns' and ships' style: the
// captain in front, a musketeer and a sailor carrying the colours, on the
// original's 4-frame walk cycle ((tick >> 2) & 3, landing_and_overland.md).
// DOM-free: returns RGBA pixels plus the anchor pixel that sits on the
// party's position (between the walkers' feet). Presentation only.

import { createArt, rasterize } from './pixel-art.mjs';
import { FLAGS } from './vignettes.mjs';

export const PARTY_ART = { width: 25, height: 22, anchorX: 12, footY: 19 };

const SKIN = '#e2b88a';
const BOOT = '#2b1d13';
const IRON = '#4a4a50';
const WOOD = '#6b4a2e';

const CAPTAIN = { hat: '#1d1a1f', hatTrim: '#d9b45a', coat: '#8c2f26', coatDark: '#5e1d18', breeches: '#3b2f4a' };
const MUSKETEER = { hat: '#a8331f', coat: '#d8d0bd', coatDark: '#9c9686', breeches: '#3b5170' };
const BEARER = { hat: '#2f4f9a', coat: '#7a6a4e', coatDark: '#554a36', breeches: '#5c4630' };

// Feet by walk frame: [back foot, front foot] offsets from the hip, and the
// body's bob (frames 1 and 3 pass the legs together, one pixel higher).
const STRIDE = [[-1, 2, 0], [0, 1, -1], [2, -1, 0], [1, 0, -1]];

// One walker facing east, feet on `footY`, centred on `x`.
function walker(art, x, footY, look, frame, { captain = false } = {}) {
  const [back, front, bob] = STRIDE[frame & 3];
  const hip = footY - 3 + bob;
  // Legs, then the body over them.
  art.line([x, hip], [x + back, footY - 1], look.breeches);
  art.line([x + 1, hip], [x + 1 + front, footY - 1], look.breeches);
  art.set(x + back, footY, BOOT); art.set(x + back + 1, footY, BOOT);
  art.set(x + 1 + front, footY, BOOT); art.set(x + 2 + front, footY, BOOT);
  const top = hip - 4;
  art.rect(x - 1, top, 3, 4, look.coat);
  art.rect(x - 1, top + 2, 1, 2, look.coatDark);
  if (captain) {
    // Coat tails and a gold button line.
    art.set(x - 2, hip, look.coatDark); art.set(x - 1, hip, look.coatDark);
    art.set(x + 1, top + 1, CAPTAIN.hatTrim); art.set(x + 1, top + 3, CAPTAIN.hatTrim);
  }
  // Head and hat.
  art.rect(x - 1, top - 2, 3, 2, SKIN);
  art.set(x + 1, top - 2, '#3a2418'); // the eye, looking ahead
  if (captain) {
    art.rect(x - 2, top - 3, 5, 1, look.hat);
    art.rect(x - 1, top - 4, 3, 1, look.hat);
    art.set(x + 2, top - 3, CAPTAIN.hatTrim);
  } else {
    art.rect(x - 1, top - 3, 3, 1, look.hat);
    art.set(x - 2, top - 2, look.hat); // the knot of the kerchief
  }
  return { top, hip };
}

// `facing` is 1 (east) or -1 (west); `nation` picks the flag.
export function paintPartySprite({ frame = 0, facing = 1, nation = 'pirate' }) {
  const { width, height, anchorX, footY } = PARTY_ART;
  const art = createArt(width, height);
  // Back to front: the colour bearer, the musketeer, then the captain.
  const bearer = walker(art, 5, footY - 1, BEARER, frame + 2);
  const pole = 7;
  art.line([pole, bearer.hip], [pole, 0], WOOD);
  art.set(pole - 1, bearer.top + 1, SKIN); // his hand on the pole
  // The flag flies above the heads, streaming back and rippling with the walk.
  const [field, mark] = FLAGS[nation] ?? FLAGS.pirate;
  const ripple = frame & 1;
  art.rect(pole - 6, 0, 6, 4, field);
  art.rect(pole - 4, 1, 2, 2, mark);
  art.set(pole - 6, ripple ? 0 : 3, null);
  const musketeer = walker(art, 11, footY, MUSKETEER, frame + 1);
  // A musket shouldered, muzzle up and back.
  art.line([12, musketeer.top + 2], [9, musketeer.top - 4], IRON);
  art.set(12, musketeer.top + 3, WOOD);
  const captain = walker(art, 17, footY, CAPTAIN, frame, { captain: true });
  // A drawn cutlass held forward.
  art.line([19, captain.top + 2], [22, captain.top - 1], '#d8dde2');
  art.set(19, captain.top + 3, CAPTAIN.hatTrim);
  if (facing < 0) mirror(art);
  return { pixels: rasterize(art), width, height, anchor: { x: facing < 0 ? width - 1 - anchorX : anchorX, y: footY } };
}

function mirror(art) {
  const { width, height, pixels } = art;
  for (let y = 0; y < height; y += 1) {
    const row = pixels.slice(y * width, (y + 1) * width).reverse();
    for (let x = 0; x < width; x += 1) pixels[y * width + x] = row[x];
  }
}
