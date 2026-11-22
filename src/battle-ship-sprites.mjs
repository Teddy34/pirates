// Pixel-art ships for the tactical sea battle: one hand-tuned design per
// ship type (SHIPS[name].type), painted at a fixed, coarse art resolution
// and drawn at a whole number of device pixels per art pixel, so the
// pixels stay chunky at every screen size. The view is the sailing map's
// oblique one from the south (ship-sprites.mjs): hull side showing, masts
// upright, the sprite chosen from the sixteen heading sectors. Square sails
// keep their yards level and face the viewer; fore-and-aft sails (gaff,
// lateen, jibs) lie along the hull, so a sloop seen bow-on is a thin wedge
// of canvas while a square-rigged pinnace shows broad sails.
// DOM-free and presentation only: no rule depends on this module, and the
// hit boxes stay in battle-mechanics.mjs. Original art.

import { FLAG_DARK, createArt, rasterize } from './pixel-art.mjs';
import { headingSector } from './ship-sprites.mjs';

// Screen y per unit of hull length or beam: the deck is seen at a slant.
const SLANT = .6;

// Battle pixels per art pixel the renderer aims for; the drawn size is
// then rounded to whole device pixels (battleShipPixelScale). The
// sprite-stacked ships (ship-stacks.mjs) are drawn at one art pixel per
// battle pixel; these flat designs, half their resolution and the stand-in
// until the stacks load, at two.
export const BATTLE_PIXELS_PER_ART_PIXEL = 1;
export const FLAT_BATTLE_PIXELS_PER_ART_PIXEL = 2;

const HULLS = {
  // Merchant timber: warm brown sides, light deck.
  merchant: { side: '#7a4a27', sideDark: '#4e2f19', deck: '#b08049', deckLight: '#c99a5c', wale: '#5a3820', port: '#2a1a10' },
  // The fluyt's pale, tarred-and-oiled pine.
  fluyt: { side: '#93673b', sideDark: '#5e4026', deck: '#c29a62', deckLight: '#d8b47a', wale: '#6b4a2b', port: '#2a1a10' },
  // Warships: dark sides, a yellow band pierced by black gunports.
  war: { side: '#3b2a1f', sideDark: '#251912', deck: '#8a6038', deckLight: '#a8784a', wale: '#d9b04a', port: '#151010' },
  // Spanish-built galleons: red-brown sides with gilded trim.
  galleon: { side: '#6a2f1f', sideDark: '#431c13', deck: '#ad7a45', deckLight: '#c89659', wale: '#d6a73c', port: '#1c120c' },
};

const COLORS = {
  pole: '#3a2614', yard: '#5a3d24', sail: '#f2e6c2', sailShade: '#cdb581', changing: '#c2a874', changingShade: '#9f8656',
  furled: '#d5c08c', hole: '#4f3f2c', glow: '#f6cf5c', window: '#20150d', scorch: '#1c1612', rail: '#2e1f14',
};

// One design per ship type, 0 pinnace … 7 galleon. `length` is the hull in
// art pixels, `beam` the half-beam as a fraction of it, `depth` the
// freeboard in art pixels. `shape` sets the deck outline: `sharp` a fine
// entry and square stern, `round` the fluyt's bluff bow and narrow
// pear-shaped stern, `beak` a galleon's projecting beakhead. `fore` and
// `aft` raise castles (pixels above the deck, and the aft one's share of
// the hull). Masts give their place along the hull (bow positive), height
// as a share of the mainmast, and rig: `square` with 1–3 tiers (course,
// topsail, topgallant), `gaff` a gaff-and-boom mainsail, `lateen` a
// mizzen's triangular sail, with `topsail` adding a square sail above.
// `jibs` counts triangular headsails on the bowsprit.
export const BATTLE_SHIP_DESIGNS = Object.freeze([
  // Pinnace: a small, open, square-rigged two-master with a low half-deck aft.
  { name: 'Pinnace', length: 14, beam: .2, depth: 2, shape: 'sharp', hull: 'merchant', aft: [1, .3], sprit: .14, mastHeight: .95,
    masts: [{ at: .2, height: .8, rig: 'square', tiers: 1 }, { at: -.1, height: 1, rig: 'square', tiers: 2 }] },
  // Sloop: one raked mast, a big gaff mainsail on a boom over the stern, a
  // square topsail, and a long bowsprit carrying two jibs. Flush deck.
  { name: 'Sloop', length: 15, beam: .19, depth: 2, shape: 'sharp', hull: 'merchant', sprit: .34, jibs: 2, mastHeight: 1.05,
    masts: [{ at: .14, height: 1, rig: 'gaff', topsail: true }] },
  // Barque: a three-master of modest size, square fore and main, lateen
  // mizzen, a quarterdeck aft.
  { name: 'Barque', length: 17, beam: .2, depth: 3, shape: 'sharp', hull: 'merchant', aft: [1, .3], sprit: .16, mastHeight: .9,
    masts: [{ at: .26, height: .85, rig: 'square', tiers: 2 }, { at: 0, height: 1, rig: 'square', tiers: 2 }, { at: -.3, height: .62, rig: 'lateen' }] },
  // Cargo fluyt: bluff bow, broad belly, tall narrow stern; tall masts with
  // short yards and no gun deck.
  { name: 'Cargo fluyt', length: 19, beam: .25, depth: 3, shape: 'round', hull: 'fluyt', aft: [2, .24], sprit: .12, mastHeight: .95, yard: .8,
    masts: [{ at: .27, height: .85, rig: 'square', tiers: 2 }, { at: .01, height: 1, rig: 'square', tiers: 2 }, { at: -.27, height: .66, rig: 'lateen' }] },
  // Merchantman: a deep-hulled armed trader with forecastle and sterncastle,
  // one row of ports, topgallant on the main.
  { name: 'Merchantman', length: 21, beam: .22, depth: 3, shape: 'sharp', hull: 'merchant', fore: 1, aft: [2, .3], gunRows: 1, sprit: .18, mastHeight: .9,
    masts: [{ at: .27, height: .85, rig: 'square', tiers: 2 }, { at: .02, height: 1, rig: 'square', tiers: 3 }, { at: -.28, height: .66, rig: 'lateen' }] },
  // Frigate: long, low and narrow, flush-decked with a low quarterdeck, a
  // full gun deck on a yellow band and a tall rig.
  { name: 'Frigate', length: 23, beam: .16, depth: 3, shape: 'sharp', hull: 'war', aft: [1, .28], gunRows: 1, sprit: .2, jibs: 1, mastHeight: .92,
    masts: [{ at: .28, height: .88, rig: 'square', tiers: 3 }, { at: .02, height: 1, rig: 'square', tiers: 3 }, { at: -.27, height: .72, rig: 'lateen', topsail: true }] },
  // War galleon: four masts (two lateen aft), towering castles fore and aft,
  // a beakhead and two rows of guns.
  { name: 'War galleon', length: 25, beam: .2, depth: 4, shape: 'beak', hull: 'war', fore: 2, aft: [3, .34], poop: 1, gunRows: 2, sprit: .16, mastHeight: .85,
    masts: [{ at: .28, height: .85, rig: 'square', tiers: 2 }, { at: .06, height: 1, rig: 'square', tiers: 3 }, { at: -.18, height: .7, rig: 'lateen' }, { at: -.36, height: .56, rig: 'lateen' }] },
  // Galleon: the broad treasure ship, three-masted, with a high gilded
  // sterncastle and its lantern, a beakhead and one row of guns.
  { name: 'Galleon', length: 25, beam: .24, depth: 4, shape: 'beak', hull: 'galleon', fore: 2, aft: [4, .36], poop: 1, gunRows: 1, sprit: .16, mastHeight: .85, lantern: true,
    masts: [{ at: .26, height: .85, rig: 'square', tiers: 2 }, { at: .03, height: 1, rig: 'square', tiers: 3 }, { at: -.26, height: .68, rig: 'lateen' }] },
]);

export function battleShipDesign(type) {
  return BATTLE_SHIP_DESIGNS[Math.max(0, Math.min(BATTLE_SHIP_DESIGNS.length - 1, type | 0))];
}

// Device pixels per art pixel for a battle drawn at `scale` CSS pixels per
// battle pixel on a screen of `deviceRatio` device pixels per CSS pixel, for
// art of `perArtPixel` battle pixels per art pixel: always a whole number,
// at least one.
export function battleShipPixelScale(scale, deviceRatio = 1, perArtPixel = BATTLE_PIXELS_PER_ART_PIXEL) {
  return Math.max(1, Math.round(scale * deviceRatio * perArtPixel));
}

// The deck outline as [u, v] fractions of (half-length, half-beam).
const OUTLINES = {
  sharp: [[1, 0], [.62, .72], [.2, 1], [-.55, .95], [-1, .72]],
  round: [[1, 0], [.86, .62], [.55, .95], [-.2, 1], [-.65, .78], [-1, .36]],
  beak: [[.86, 0], [.6, .8], [.2, 1], [-.6, .95], [-1, .8]],
};

// Paints a battle ship. `nation` is { key, color, dark } from NATIONS;
// `wind` the direction the wind blows towards (an angle byte); `damage`
// follows the battle levels (16 per level); `changing` marks sails being
// raised or lowered (drawn in a darker canvas).
export function paintBattleShipSprite({ type, heading, sails = 'full', changing = false, nation, wind = 0, damage = 0 }) {
  const design = battleShipDesign(type);
  const palette = HULLS[design.hull];
  const length = design.length;
  const half = length / 2;
  const beam = Math.max(2, length * design.beam);
  const depth = design.depth;
  const mastHeight = Math.round(length * design.mastHeight);
  const level = Math.min(4, damage >> 4);
  const angle = (headingSector(heading) * 16) / 256 * Math.PI * 2;
  const sin = Math.sin(angle), cos = Math.cos(angle);
  const canvas = changing ? COLORS.changing : COLORS.sail;
  const shade = changing ? COLORS.changingShade : COLORS.sailShade;
  // (u along the hull, v to starboard, h up) → screen, before centring.
  const project = (u, v, h) => [u * sin + v * cos, (-u * cos + v * sin) * SLANT - h];
  const bow = [sin, -cos * SLANT];
  const ops = [];
  const points = [];
  const add = (depthKey, draw, shape) => { ops.push({ depthKey, draw }); points.push(...shape); };

  const half1 = OUTLINES[design.shape];
  const outline = [...half1, ...half1.slice(1).reverse().map(([u, v]) => [u, -v])]
    .filter(([, v], index, all) => index === 0 || v !== 0 || all[index - 1][1] !== 0)
    .map(([u, v]) => [u * half, v * beam]);
  // The visible side (screen-down) and whether the stern faces the viewer.
  const side = sin >= 0 ? 1 : -1;
  const broadside = Math.abs(sin) > .35;
  const sternShows = cos > .35;

  // The hull: one outline per pixel of freeboard, darkest at the waterline,
  // the top strake banded (warships' band carries the gunports).
  const gunRows = design.gunRows ?? 0;
  const hullLayers = [];
  for (let h = 0; h <= depth; h += 1) {
    let color = palette.side;
    if (h === depth) color = palette.deck;
    else if (h === 0) color = palette.sideDark;
    else if (gunRows && h >= depth - gunRows) color = palette.wale;
    hullLayers.push({ shape: outline.map(([u, v]) => project(u, v, h)), color });
  }
  const spritBase = design.shape === 'beak' ? half * .86 : half;
  const spritTip = project(spritBase + length * design.sprit, 0, depth + 2);
  const spritFoot = project(spritBase, 0, depth);
  const beakhead = design.shape === 'beak' ? [project(half * .86, 0, depth - 1), project(half * 1.08, 0, depth - 1)] : null;
  add(-Infinity, (art, at) => {
    for (const layer of hullLayers) art.polygon(layer.shape.map(at), layer.color);
    // A plank seam along the deck.
    art.line(at(project(half * .5, 0, depth)), at(project(-half * .7, 0, depth)), palette.deckLight);
    if (beakhead) art.line(at(beakhead[0]), at(beakhead[1]), palette.side);
    art.line(at(spritFoot), at(spritTip), COLORS.pole);
    // Gunports along the visible side, every other pixel.
    if (gunRows && broadside) {
      const step = 2 / Math.abs(sin);
      for (let row = 0; row < gunRows; row += 1) {
        const h = depth - 1 - row;
        for (let u = -half * .62; u <= half * .58; u += step) {
          const [x, y] = at(project(u, side * (beam - .7), h));
          art.set(Math.floor(x), Math.floor(y), palette.port);
        }
      }
    }
    // Heavy damage: scorched, splintered planks along the side.
    if (level >= 3) {
      for (const u of [half * .3, -half * .25, half * -.05].slice(0, level - 1)) {
        const [x, y] = at(project(u, side * (beam - .7), 1));
        art.set(Math.floor(x), Math.floor(y), COLORS.scorch);
        art.set(Math.floor(x) + 1, Math.floor(y) - 1, COLORS.scorch);
      }
    }
  }, [...hullLayers.flatMap((layer) => layer.shape), spritTip, ...(beakhead ?? [])]);

  // Castles: stepped decks over the stern (and bow), one outline per pixel.
  const castle = (from, to, height, key) => {
    const slice = outline.filter(([u]) => u >= from && u <= to);
    const ends = [from, to].map((u) => [u, edgeBeam(outline, u)]);
    const deckShape = [[ends[1][0], ends[1][1]], ...slice.filter(([u, v]) => v > 0).sort((a, b) => b[0] - a[0]), [ends[0][0], ends[0][1]],
      [ends[0][0], -ends[0][1]], ...slice.filter(([u, v]) => v < 0).sort((a, b) => a[0] - b[0]), [ends[1][0], -ends[1][1]]];
    const layers = [];
    for (let h = depth + 1; h <= depth + height; h += 1) {
      layers.push({ shape: deckShape.map(([u, v]) => project(u, v, h)), color: h === depth + height ? palette.deckLight : palette.side });
    }
    const top = depth + height;
    add(key, (art, at) => {
      for (const layer of layers) art.polygon(layer.shape.map(at), layer.color);
      // A rail of darker pixels round the castle's top deck edge.
      const [x1, y1] = at(project(from, 0, top)), [x2, y2] = at(project(to, 0, top));
      art.line([x1, y1], [x2, y2], palette.deckLight);
    }, layers.flatMap((layer) => layer.shape));
    return top;
  };
  let sternTop = depth;
  if (design.aft) {
    const [height, share] = design.aft;
    sternTop = castle(-half, -half + share * length, height, project(-half * .7, 0, depth)[1] - .5);
    if (design.poop) sternTop = castle(-half, -half + share * length * .45, height + design.poop, project(-half * .85, 0, depth)[1] - .4);
  }
  if (design.fore) castle(half * .55, half * (design.shape === 'beak' ? .86 : .95), design.fore, project(half * .75, 0, depth)[1] - .5);

  // The stern seen from astern: a row of windows (lit on a galleon) and the
  // lantern above the taffrail.
  if (design.aft) {
    const lantern = project(-half, 0, sternTop + 1);
    add(project(-half, 0, depth)[1] + .5, (art, at) => {
      if (sternShows) {
        for (const v of [-beam * .45, 0, beam * .45]) {
          const [x, y] = at(project(-half - .4, v, sternTop - 1));
          art.set(Math.floor(x), Math.floor(y), design.lantern ? COLORS.glow : COLORS.window);
        }
      }
      if (design.lantern) {
        const [x, y] = at(lantern);
        art.set(Math.floor(x), Math.floor(y), COLORS.glow);
        art.set(Math.floor(x), Math.floor(y) + 1, COLORS.pole);
      }
    }, design.lantern ? [lantern] : []);
  }

  // Masts and their sails, drawn back to front. A lost mast (damage level
  // 2) takes the foremast; a single mast is shot down to a stump.
  let masts = design.masts.map((mast) => ({ ...mast, u: mast.at * length, top: mast.height * mastHeight }));
  if (level >= 2) masts = masts.length > 1 ? masts.slice(1) : [{ ...masts[0], top: masts[0].top * .45, stump: true }];
  const mainmast = masts.reduce((best, mast) => (mast.top > best.top ? mast : best), masts[0]);
  // Fore-and-aft sails swing out to leeward.
  const leeward = (((wind - heading) & 0xff) < 128 ? 1 : -1);
  const face = .5 + .5 * Math.abs(cos);
  const yardHalf = (beam + 1.5) * (design.yard ?? 1);
  const foremast = masts.reduce((best, mast) => (mast.u > best.u ? mast : best), masts[0]);

  masts.forEach((mast, index) => {
    const deckAt = mast.u < -half + (design.aft?.[1] ?? 0) * length ? sternTop : depth;
    const foot = project(mast.u, 0, deckAt);
    const top = project(mast.u, 0, depth + mast.top);
    const at = (fraction, du = 0, dv = 0) => project(mast.u + du, dv, depth + fraction * mast.top);
    const sailOps = [];
    const shapes = [foot, top];
    const squareSail = (from, to, width, set) => {
      const [, upperY] = at(to);
      const upper = [top[0], upperY];
      const bottom = at(from);
      const halfWidth = Math.max(1, yardHalf * width * face);
      if (!set) {
        sailOps.push({ line: [[upper[0] - halfWidth, upper[1]], [upper[0] + halfWidth, upper[1]]], color: COLORS.furled });
        shapes.push([upper[0] - halfWidth, upper[1]], [upper[0] + halfWidth, upper[1]]);
        return;
      }
      const belly = 1.2 * width;
      const lower = [bottom[0] + bow[0] * belly, bottom[1] + bow[1] * belly];
      const quad = [[upper[0] - halfWidth * .85, upper[1]], [upper[0] + halfWidth * .85, upper[1]], [lower[0] + halfWidth, lower[1]], [lower[0] - halfWidth, lower[1]]];
      sailOps.push({ quad, split: [upper, lower], color: canvas, shaded: true });
      shapes.push(...quad);
    };
    if (mast.stump) {
      // Nothing but the broken stick.
    } else if (mast.rig === 'square') {
      const tiers = [{ from: .26, to: .56, width: 1, course: true }, { from: .6, to: .82, width: .78 }, { from: .85, to: 1, width: .55 }].slice(0, mast.tiers);
      for (const tier of tiers) squareSail(tier.from, tier.to, tier.width, sails === 'full' || (sails === 'battle' && !tier.course));
    } else if (mast.rig === 'gaff') {
      const reach = sails === 'full' ? .78 : .56;
      const swing = leeward * (beam * .9);
      const boomEnd = -mast.u - half - 1.5;
      const quad = [at(.12), at(.12, boomEnd, swing), at(reach + .08, boomEnd * .78, swing * .9), at(reach)];
      if (sails === 'furled') sailOps.push({ line: [quad[0], quad[1]], color: COLORS.furled });
      else sailOps.push({ quad, color: canvas, edge: [quad[0], quad[3]] });
      shapes.push(...quad);
      if (mast.topsail) squareSail(.82, 1, .62, sails !== 'furled');
    } else if (mast.rig === 'lateen') {
      // The long yard slants up aft; the sail hangs below it to the deck.
      const swing = leeward * (beam * .7);
      const yardLow = at(.22, length * .12, swing * .3), yardHigh = at(mast.topsail ? .72 : 1, -length * .2, swing);
      const clew = at(.12, -length * .16, swing);
      if (sails === 'furled') sailOps.push({ line: [yardLow, yardHigh], color: COLORS.furled });
      else sailOps.push({ quad: [yardLow, yardHigh, clew], color: canvas, edge: [yardLow, yardHigh] });
      shapes.push(yardLow, yardHigh, clew);
      if (mast.topsail) squareSail(.76, 1, .5, sails === 'full' || sails === 'battle');
    }
    // Jibs run from the bowsprit to the foremast, and go with it.
    if (mast === foremast && design.jibs && sails !== 'furled' && level < 2) {
      const tip = project(spritBase + length * design.sprit, 0, depth + 2);
      const stem = project(spritBase + length * design.sprit * .45, 0, depth + 1);
      const jibs = [[tip, at(.92), at(.2, length * .06)], [stem, at(.7), at(.16, length * .04)]].slice(0, design.jibs);
      for (const jib of jibs) {
        sailOps.unshift({ quad: jib, color: jib === jibs[0] ? canvas : shade, edge: [jib[0], jib[1]] });
        shapes.push(...jib);
      }
    }
    const flag = mast === mainmast && !mast.stump ? top : null;
    if (flag) shapes.push([flag[0] - 6, flag[1] - 3], [flag[0] + 6, flag[1] - 3]);
    add(foot[1] + index * 1e-3, (art, toArt) => {
      art.line(toArt(foot), toArt(top), COLORS.pole);
      for (const sail of sailOps) {
        if (sail.line) { art.line(toArt(sail.line[0]), toArt(sail.line[1]), sail.color); continue; }
        const quad = sail.quad.map(toArt);
        art.polygon(quad, sail.color);
        if (sail.shaded) {
          // The starboard half of the canvas (screen right) is in shade.
          const [splitTop, splitBottom] = sail.split.map(toArt);
          art.polygon([splitTop, quad[1], quad[2], splitBottom], shade);
          art.line(quad[0], quad[1], COLORS.yard);
        }
        if (sail.edge) art.line(toArt(sail.edge[0]), toArt(sail.edge[1]), COLORS.yard);
        if (level >= 1) paintHoles(art, quad);
      }
      art.line(toArt(foot), toArt(project(mast.u, 0, depth + mast.top * .26)), COLORS.pole);
      if (flag) paintFlag(art, nation, toArt(flag), wind);
    }, shapes);
  });

  // Size the canvas to everything drawn, with room for outline and shadow.
  const xs = points.map(([x]) => x), ys = points.map(([, y]) => y);
  const left = Math.floor(Math.min(...xs)) - 2, top = Math.floor(Math.min(...ys)) - 2;
  const width = Math.ceil(Math.max(...xs)) - left + 4, height = Math.ceil(Math.max(...ys)) - top + 4;
  const toArt = ([x, y]) => [x - left, y - top];
  const art = createArt(width, height);
  for (const op of ops.sort((a, b) => a.depthKey - b.depthKey)) op.draw(art, toArt);
  return { pixels: rasterize(art), width, height, anchor: { x: -left, y: -top } };
}

// The half-beam of the outline at `u` (linear between its points).
function edgeBeam(outline, u) {
  const starboard = outline.filter(([, v]) => v >= 0).sort((a, b) => a[0] - b[0]);
  for (let index = 0; index + 1 < starboard.length; index += 1) {
    const [u1, v1] = starboard[index], [u2, v2] = starboard[index + 1];
    if (u >= u1 && u <= u2) return u2 === u1 ? Math.max(v1, v2) : v1 + ((u - u1) * (v2 - v1)) / (u2 - u1);
  }
  return u < starboard[0][0] ? starboard[0][1] : starboard.at(-1)[1];
}

// Two shot holes low in a sail's canvas.
function paintHoles(art, quad) {
  const xs = quad.map(([x]) => x), ys = quad.map(([, y]) => y);
  if (Math.max(...xs) - Math.min(...xs) < 3 || Math.max(...ys) - Math.min(...ys) < 2) return;
  const x = Math.floor((Math.min(...xs) + Math.max(...xs)) / 2), y = Math.floor((Math.min(...ys) + 2 * Math.max(...ys)) / 3);
  art.set(x - 1, y, COLORS.hole);
  art.set(x + 1, y - 1, COLORS.hole);
}

// A pennant at the masthead, streaming to the downwind side of the screen.
function paintFlag(art, nation, [x, y], wind) {
  const drift = Math.sin((wind / 256) * Math.PI * 2);
  const flagSide = drift >= 0 ? 1 : -1;
  const length = 3 + Math.round(2 * Math.abs(drift));
  const col = Math.floor(x), row = Math.floor(y) - 1;
  art.set(col, row, COLORS.pole);
  art.set(col, row + 1, COLORS.pole);
  for (let step = 1; step <= length; step += 1) {
    const flagX = col + flagSide * step;
    art.set(flagX, row - 1, nation.color);
    art.set(flagX, row, step === 2 ? FLAG_DARK[nation.key] ?? nation.dark : nation.color);
    if (step < length) art.set(flagX, row + 1, nation.dark);
  }
}
