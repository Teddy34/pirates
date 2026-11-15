import assert from 'node:assert/strict';
import { test } from 'node:test';
import { drawVignette, vignetteDescription, vignetteShape, vignetteSize, VIGNETTE_FRAME_WIDTH } from '../src/vignettes.mjs';

const SCENES = [
  'sail-ho', 'boarding', 'hostage-talks', 'crew-recruits', 'treasure-fleet',
  'silver-train', 'mutiny', 'prison', 'hall-of-fame', 'alley-duel',
  'retire-1', 'retire-2', 'retire-3', 'retire-4', 'land-attack', 'fort-walls',
  'sinking', 'outrun', 'nightfall', 'title-ship',
];

// A context that records which art pixels were painted, after the clip the
// vignette sets on its picture area.
function paintedPixels(id) {
  const { width, height } = vignetteSize(id);
  const painted = new Set();
  let offset = [0, 0];
  const saved = [];
  drawVignette({
    save() { saved.push(offset); }, restore() { offset = saved.pop(); },
    translate(x, y) { offset = [offset[0] + x, offset[1] + y]; },
    clearRect() {}, beginPath() {}, rect() {}, clip() {},
    fillRect(x, y, w, h) {
      for (let row = 0; row < h; row += 1) {
        for (let column = 0; column < w; column += 1) painted.add((y + offset[1] + row) * width + x + offset[0] + column);
      }
    },
  }, id);
  return { painted, width, height };
}

test('each new scene is a described landscape picture', () => {
  for (const id of SCENES) {
    assert.equal(vignetteShape(id), id === 'title-ship' ? 'title' : 'landscape');
    assert.notEqual(vignetteDescription(id), `Placeholder picture: ${id}.`);
  }
});

test('each new scene paints its whole picture, with no transparent gaps', () => {
  for (const id of SCENES) {
    const { painted, width, height } = paintedPixels(id);
    for (let y = VIGNETTE_FRAME_WIDTH; y < height - VIGNETTE_FRAME_WIDTH; y += 1) {
      for (let x = VIGNETTE_FRAME_WIDTH; x < width - VIGNETTE_FRAME_WIDTH; x += 1) {
        assert.ok(painted.has(y * width + x), `${id} leaves (${x}, ${y}) unpainted`);
      }
    }
  }
});

test('the governor portrait cell follows the era and the nation', async () => {
  const { governorCell, loadVignetteArt, vignetteNeedsArt } = await import('../src/vignettes.mjs');
  assert.deepEqual(governorCell({ era: '1560', nation: 'Spain' }), { x: 0, y: 0 });
  assert.deepEqual(governorCell({ era: '1680', nation: 'France' }), { x: 192, y: 640 });
  // Saves may hold the era as a number.
  assert.deepEqual(governorCell({ era: 1640, nation: 'Holland' }), { x: 288, y: 384 });
  assert.equal(governorCell({ era: '1680', nation: 'pirate' }), null);
  assert.equal(governorCell({ era: '1700', nation: 'Spain' }), null);
  assert.equal(governorCell(), null);
  // Without a DOM the art never loads and the placeholder stands in.
  await loadVignetteArt();
  assert.equal(vignetteNeedsArt('governor'), true);
  assert.equal(vignetteNeedsArt('traveller'), false);
  assert.equal(vignetteNeedsArt('tavern'), true);
  assert.match(vignetteDescription('governor', { era: '1680', nation: 'France' }), /^Placeholder picture/);
});

test('the harbour arrival and the quay pick their sheet row by the fort flag and era', async () => {
  const { harbourRow } = await import('../src/vignettes.mjs');
  assert.equal(harbourRow({ flag: 'Spain', era: '1560' }), 0);
  assert.equal(harbourRow({ flag: 'England', era: '1680' }), 1);
  assert.equal(harbourRow({ flag: 'France', era: '1620' }), 2);
  assert.equal(harbourRow({ flag: 'Holland', era: '1640' }), 3);
  assert.equal(harbourRow({ flag: 'Holland', era: 1660 }), 4);
  assert.equal(harbourRow({ flag: 'pirate', era: '1660' }), null);
  // Without a DOM the art never loads and the placeholder stands in.
  assert.match(vignetteDescription('harbour-arrival', { flag: 'Spain', era: '1600' }), /^Placeholder picture/);
  assert.match(vignetteDescription('port-quay', { flag: 'Spain', era: '1600' }), /^Placeholder picture/);
  assert.match(vignetteDescription('merchant'), /^Placeholder picture/);
  assert.match(vignetteDescription('barmaid'), /^Placeholder picture/);
  assert.match(vignetteDescription('bartender'), /^Placeholder picture/);
  assert.match(vignetteDescription('sail-ho'), /^Placeholder picture/);
  assert.match(vignetteDescription('sailing-master'), /^Placeholder picture/);
  assert.match(vignetteDescription('open-swords'), /^Placeholder picture/);
  assert.match(vignetteDescription('open-chart'), /^Placeholder picture/);
  assert.match(vignetteDescription('open-buccaneers'), /^Placeholder picture/);
  assert.match(vignetteDescription('open-quarterdeck'), /^Placeholder picture/);
  assert.match(vignetteDescription('open-court'), /^Placeholder picture/);
  assert.match(vignetteDescription('open-plantation'), /^Placeholder picture/);
  assert.match(vignetteDescription('open-boarded'), /^Placeholder picture/);
  assert.match(vignetteDescription('open-landfall'), /^Placeholder picture/);
  assert.match(vignetteDescription('open-prison'), /^Placeholder picture/);
  assert.match(vignetteDescription('open-night-raid'), /^Placeholder picture/);
  assert.match(vignetteDescription('tavern'), /^Placeholder picture/);
  assert.match(vignetteDescription('shipwright'), /^Placeholder picture/);
  assert.match(vignetteDescription('divide-plunder'), /^Placeholder picture/);
});

test('the title logo spells Retro in outlined pixel letters inside its canvas', async () => {
  const { RETRO_LOGO_SIZE, drawRetroLogo } = await import('../src/title-logo.mjs');
  const fills = new Map();
  let colour = '';
  drawRetroLogo({
    clearRect() {},
    set fillStyle(value) { colour = value; },
    fillRect(x, y, w, h) {
      assert.ok(x >= 0 && y >= 0 && x + w <= RETRO_LOGO_SIZE.width && y + h <= RETRO_LOGO_SIZE.height, `(${x}, ${y}) is outside the logo`);
      fills.set(`${x},${y}`, colour);
    },
  });
  const colours = new Set(fills.values());
  assert.ok(colours.has('#21180f'), 'the letters have a dark outline');
  assert.ok(colours.size >= 5, 'the letters are banded, not flat');
  assert.deepEqual(RETRO_LOGO_SIZE, { width: 39, height: 11 });
});

test('the title picture keeps its 3 : 2 artwork inside the frame', () => {
  assert.deepEqual(vignetteSize('title-ship'), { width: 240 + 2 * VIGNETTE_FRAME_WIDTH, height: 160 + 2 * VIGNETTE_FRAME_WIDTH });
});

test('dialog pictures stay whole and framed at a whole-number scale that fits', async () => {
  const { dialogPictureLayout, vignetteSize } = await import('../src/vignettes.mjs');
  const boxes = [[976, 553], [1416, 876], [749, 548], [1656, 676], [788, 1038], [382, 772]];
  for (const id of ['merchant', 'tavern', 'arrival']) {
    const framed = vignetteSize(id);
    for (const [width, height] of boxes) {
      for (const table of [false, true]) {
        const narrow = width < 761;
        const layout = dialogPictureLayout(id, { width, height, narrow, table });
        assert.ok(Number.isInteger(layout.scale) && layout.scale >= 1);
        assert.deepEqual([layout.width, layout.height], [framed.width * layout.scale, framed.height * layout.scale]);
        if (layout.scale > 1) assert.ok(layout.width <= width && layout.height <= height, `${id} ${width}×${height}`);
      }
    }
  }
  // Laptop 1000×577 (inner box 964×541): the merchant beside his table, the
  // harbour in the corner; a pinned bar's room caps a portrait's height.
  assert.equal(dialogPictureLayout('merchant', { width: 964, height: 541, table: true }).scale, 2);
  assert.equal(dialogPictureLayout('merchant', { width: 964, height: 541 }).scale, 3);
  assert.equal(dialogPictureLayout('merchant', { width: 964, height: 541, room: 390 }).scale, 2);
  assert.equal(dialogPictureLayout('arrival', { width: 964, height: 541 }).scale, 2);
  assert.equal(dialogPictureLayout('tavern', { width: 382, height: 772, narrow: true, maxScale: 1 }).scale, 1);
});
