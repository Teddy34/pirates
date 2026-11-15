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
  assert.equal(vignetteNeedsArt('tavern'), false);
  assert.match(vignetteDescription('governor', { era: '1680', nation: 'France' }), /^Placeholder picture/);
});

test('the harbour arrival picks its sheet row by the fort flag and era', async () => {
  const { harbourRow } = await import('../src/vignettes.mjs');
  assert.equal(harbourRow({ flag: 'Spain', era: '1560' }), 0);
  assert.equal(harbourRow({ flag: 'England', era: '1680' }), 1);
  assert.equal(harbourRow({ flag: 'France', era: '1620' }), 2);
  assert.equal(harbourRow({ flag: 'Holland', era: '1640' }), 3);
  assert.equal(harbourRow({ flag: 'Holland', era: 1660 }), 4);
  assert.equal(harbourRow({ flag: 'pirate', era: '1660' }), null);
  // Without a DOM the art never loads and the placeholder stands in.
  assert.match(vignetteDescription('harbour-arrival', { flag: 'Spain', era: '1600' }), /^Placeholder picture/);
  assert.match(vignetteDescription('merchant'), /^Placeholder picture/);
  assert.match(vignetteDescription('barmaid'), /^Placeholder picture/);
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
