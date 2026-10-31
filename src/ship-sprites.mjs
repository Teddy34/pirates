// Pixel-art ships for the sailing map and sea battles, in the towns' style:
// an oblique view from the south with the hull's side showing, masts
// standing upright, sails lit from the north-west and the nation's flag
// streaming downwind. DOM-free: returns RGBA pixels plus the anchor pixel
// that sits on the ship's position (mid-hull at the waterline).
// Presentation only; no rule depends on anything in this module.

import { FLAG_DARK, createArt, rasterize } from './pixel-art.mjs';

// Screen y per unit of hull length or beam: the deck is seen at a slant.
const SLANT = .6;

const WOOD = { side: '#6b3f22', sideDark: '#4a2a17', deck: '#a0703f', deckLight: '#b9864f' };
const WARSHIP = { side: '#3e2a1d', sideDark: '#2a1b12', deck: '#9a6a3b', deckLight: '#b38049' };
const COLORS = {
  pole: '#3a2a1a', yard: '#5a3d24', sail: '#f1e4bd', sailShade: '#c9b27c', furled: '#cdb784', hole: '#5b4a35',
  wale: '#c9a14a', glow: '#f2c55c',
};

// Rig by ship type (SHIPS[name].type, 0 pinnace … 7 galleon). Masts list
// their position along the hull (fraction of length, bow positive) and
// height (fraction of the mainmast).
const RIGS = [
  { masts: [[.08, 1]], gaff: true, beam: .2 },
  { masts: [[.12, 1]], gaff: true, jib: true, beam: .2 },
  { masts: [[.2, .9], [-.14, 1]], beam: .2 },
  { masts: [[.28, .85], [.02, 1], [-.26, .7]], castle: 1, beam: .23 },
  { masts: [[.28, .85], [.02, 1], [-.26, .7]], castle: 1, beam: .21 },
  { masts: [[.3, .85], [.04, 1], [-.24, .72]], castle: 1, beam: .17, warship: true },
  { masts: [[.32, .82], [.1, 1], [-.14, .8], [-.33, .62]], castle: 3, beam: .2, warship: true },
  { masts: [[.32, .82], [.1, 1], [-.14, .8], [-.33, .62]], castle: 3, beam: .23, lantern: true },
];

// Hull length in art pixels: the sailing map uses a small sprite, battles a
// larger one sized to the hit box by the renderer.
export function shipArtLength(type, view = 'map') {
  return view === 'battle' ? 18 + 2 * type : 11 + type;
}

// The sprite is chosen from the sixteen heading sectors, like the original's.
export function headingSector(heading) {
  return ((heading + 8) >> 4) & 15;
}

// Paints a ship. `nation` is { key, color, dark } from NATIONS; `wind` is
// the direction the wind blows towards (an angle byte, as the speed tables
// use it); `damage` follows the battle levels (16 per level).
// `changing` marks sails being raised or lowered (drawn in the shade colour).
export function paintShipSprite({ type, heading, sails = 'full', changing = false, nation, wind = 0, damage = 0, length = shipArtLength(type) }) {
  const rig = RIGS[Math.max(0, Math.min(7, type))];
  const angle = (headingSector(heading) * 16) / 256 * Math.PI * 2;
  const sin = Math.sin(angle), cos = Math.cos(angle);
  const half = length / 2;
  const beam = Math.max(1.5, length * rig.beam);
  const depth = Math.max(2, Math.round(length * .16));
  const mastHeight = Math.round(length * .9);
  const level = damage >> 4;
  const canvas = changing ? COLORS.sailShade : COLORS.sail;
  // (u along the hull, v to starboard, h up) → screen, before centring.
  const project = (u, v, h) => [u * sin + v * cos, (-u * cos + v * sin) * SLANT - h];
  const bow = [sin, -cos * SLANT];
  const ops = [];
  const points = [];
  const add = (depthKey, draw, shape) => { ops.push({ depthKey, draw }); points.push(...shape); };

  // The deck outline: a pointed bow and a square stern.
  const outline = [
    [half, 0], [half * .55, beam * .8], [half * .1, beam], [-half * .6, beam * .92], [-half, beam * .7],
    [-half, -beam * .7], [-half * .6, -beam * .92], [half * .1, -beam], [half * .55, -beam * .8],
  ];
  const palette = rig.warship ? WARSHIP : WOOD;
  const hullLayers = [];
  for (let h = 0; h <= depth; h += 1) {
    const color = h === depth ? palette.deck : h === 0 ? palette.sideDark : rig.warship && h === depth - 1 ? COLORS.wale : palette.side;
    hullLayers.push({ shape: outline.map(([u, v]) => project(u, v, h)), color });
  }
  if (type >= 1) {
    const sprit = [project(half, 0, depth), project(half + length * .16, 0, depth + 2)];
    hullLayers.push({ line: sprit, color: COLORS.pole });
  }
  add(-Infinity, (art, at) => {
    for (const layer of hullLayers) {
      if (layer.line) art.line(at(layer.line[0]), at(layer.line[1]), layer.color);
      else art.polygon(layer.shape.map(at), layer.color);
    }
    // A plank seam along the deck.
    art.line(at(project(half * .5, 0, depth)), at(project(-half * .8, 0, depth)), palette.deckLight);
  }, hullLayers.flatMap((layer) => layer.shape ?? layer.line));

  // The stern castle rises over the aft deck.
  if (rig.castle) {
    const aft = [[-half * .55, beam * .9], [-half, beam * .7], [-half, -beam * .7], [-half * .55, -beam * .9]];
    const layers = [];
    for (let h = depth + 1; h <= depth + rig.castle; h += 1) {
      layers.push({ shape: aft.map(([u, v]) => project(u, v, h)), color: h === depth + rig.castle ? palette.deckLight : palette.side });
    }
    const lantern = project(-half, 0, depth + rig.castle + 1);
    add(project(-half * .8, 0, depth)[1], (art, at) => {
      for (const layer of layers) art.polygon(layer.shape.map(at), layer.color);
      if (rig.lantern) { const [x, y] = at(lantern); art.set(Math.floor(x), Math.floor(y), COLORS.glow); }
    }, [...layers.flatMap((layer) => layer.shape), lantern]);
  }

  // Masts and their sails, drawn back to front. A lost mast (damage level
  // 2) takes the foremast; a single mast is shot down to a stump.
  let masts = rig.masts.map(([position, height]) => ({ u: position * length, height: height * mastHeight }));
  if (level >= 2) masts = masts.length > 1 ? masts.slice(1) : [{ ...masts[0], height: masts[0].height * .45 }];
  const mainmast = masts.reduce((best, mast) => (mast.height > best.height ? mast : best), masts[0]);
  // Gaff sails swing out to leeward.
  const leeward = (((wind - heading) & 0xff) < 128 ? 1 : -1);
  const yard = beam * 1.25 + .5;
  const face = .55 + .45 * Math.abs(cos);

  masts.forEach((mast, index) => {
    const foot = project(mast.u, 0, depth);
    const top = project(mast.u, 0, depth + mast.height);
    const shapes = [foot, top];
    const sailOps = [];
    const sailAt = (from, to) => [project(mast.u, 0, depth + from * mast.height), project(mast.u, 0, depth + to * mast.height)];
    if (rig.gaff) {
      const reach = sails === 'full' ? .95 : .65;
      const swing = leeward * (yard + 1);
      const quad = [
        project(mast.u, 0, depth + 1), project(mast.u - length * .42, swing, depth + 1),
        project(mast.u - length * .3, swing * .8, depth + reach * mast.height), project(mast.u, 0, depth + reach * mast.height),
      ];
      if (sails === 'furled') sailOps.push({ line: [quad[0], quad[1]], color: COLORS.furled });
      else sailOps.push({ quad, color: canvas, shade: false, holes: level >= 1 });
      if (rig.jib && sails !== 'furled') {
        sailOps.push({ quad: [project(half + length * .16, 0, depth + 2), top, project(mast.u, -swing * .2, depth + 1)], color: COLORS.sailShade });
      }
      shapes.push(...quad);
    } else {
      const tiers = [{ from: .3, to: .6, width: 1, course: true }, { from: .67, to: .94, width: .75 }];
      for (const tier of tiers) {
        const [bottom, upper] = sailAt(tier.from, tier.to);
        const width = yard * tier.width * face;
        const set = sails === 'full' || (sails === 'battle' && !tier.course);
        if (!set) {
          sailOps.push({ line: [[upper[0] - width, upper[1]], [upper[0] + width, upper[1]]], color: COLORS.furled });
          continue;
        }
        const belly = 1.5 * tier.width;
        const lower = [bottom[0] + bow[0] * belly, bottom[1] + bow[1] * belly];
        sailOps.push({
          quad: [[upper[0] - width * .85, upper[1]], [upper[0] + width * .85, upper[1]], [lower[0] + width, lower[1]], [lower[0] - width, lower[1]]],
          split: [[upper[0], upper[1]], [lower[0], lower[1]]],
          color: canvas, shade: true, holes: level >= 1,
        });
        shapes.push([upper[0] - width, upper[1]], [upper[0] + width, upper[1]], [lower[0] + width, lower[1]], [lower[0] - width, lower[1]]);
      }
    }
    const flag = mast === mainmast ? top : null;
    if (flag) shapes.push([flag[0] - 6, flag[1] - 3], [flag[0] + 6, flag[1] - 3]);
    add(foot[1] + index * 1e-3, (art, at) => {
      art.line(at(foot), at(top), COLORS.pole);
      for (const sail of sailOps) {
        if (sail.line) { art.line(at(sail.line[0]), at(sail.line[1]), sail.color); continue; }
        const quad = sail.quad.map(at);
        art.polygon(quad, sail.color);
        if (sail.shade) {
          // The starboard half of the canvas (screen right) is in shade.
          const [splitTop, splitBottom] = sail.split.map(at);
          art.polygon([splitTop, quad[1], quad[2], splitBottom], COLORS.sailShade);
          art.line(quad[0], quad[1], COLORS.yard);
        }
        if (sail.holes) {
          const xs = quad.map(([x]) => x), ys = quad.map(([, y]) => y);
          const x = (Math.min(...xs) + Math.max(...xs)) / 2, y = (Math.min(...ys) + 2 * Math.max(...ys)) / 3;
          art.set(Math.floor(x) - 2, Math.floor(y) - 1, COLORS.hole);
          art.set(Math.floor(x) + 1, Math.floor(y) - 2, COLORS.hole);
        }
      }
      if (flag) paintFlag(art, nation, at(flag), wind);
    }, shapes);
  });

  // Size the canvas to everything drawn, with room for outline and shadow.
  const xs = points.map(([x]) => x), ys = points.map(([, y]) => y);
  const left = Math.floor(Math.min(...xs)) - 2, top = Math.floor(Math.min(...ys)) - 2;
  const width = Math.ceil(Math.max(...xs)) - left + 4, height = Math.ceil(Math.max(...ys)) - top + 4;
  const at = ([x, y]) => [x - left, y - top];
  const art = createArt(width, height);
  for (const op of ops.sort((a, b) => a.depthKey - b.depthKey)) op.draw(art, at);
  return { pixels: rasterize(art), width, height, anchor: { x: -left, y: -top } };
}

// A pennant at the masthead, streaming to the downwind side of the screen.
function paintFlag(art, nation, [x, y], wind) {
  const drift = Math.sin((wind / 256) * Math.PI * 2);
  const side = drift >= 0 ? 1 : -1;
  const length = 3 + Math.round(2 * Math.abs(drift));
  const col = Math.floor(x), row = Math.floor(y) - 1;
  art.set(col, row, '#3a2a1a');
  art.set(col, row + 1, '#3a2a1a');
  for (let step = 1; step <= length; step += 1) {
    const flagX = col + side * step;
    art.set(flagX, row - 1, nation.color);
    art.set(flagX, row, step === 2 ? FLAG_DARK[nation.key] ?? nation.dark : nation.color);
    if (step < length) art.set(flagX, row + 1, nation.dark);
  }
}
