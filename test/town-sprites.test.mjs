import test from 'node:test';
import assert from 'node:assert/strict';
import { NATIONS } from '../src/data.mjs';
import { TOWN_SPRITE_ANCHOR, TOWN_SPRITE_HEIGHT, TOWN_SPRITE_WIDTH, paintTownSprite, prosperityLevel } from '../src/town-sprites.mjs';

const paint = (key, prosperity, forts) => paintTownSprite({ nation: { key, ...NATIONS[key] }, prosperity, forts });
const opaque = (pixels) => pixels.filter((_, index) => index % 4 === 3 && pixels[index] === 255).length;
// Pixels that differ between two sprites.
const differing = (a, b) => a.filter((value, index) => value !== b[index]).length;

test('prosperity follows town growth in quarters of 64', () => {
  assert.deepEqual([0, 63, 64, 127, 128, 191, 192, 255].map(prosperityLevel), [0, 0, 1, 1, 2, 2, 3, 3]);
});

test('town sprites grow with prosperity and forts and stay on the anchor', () => {
  const sizes = [0, 1, 2, 3].map((level) => opaque(paint('France', level, 0)));
  assert.ok(sizes[0] < sizes[1] && sizes[1] < sizes[2] && sizes[2] < sizes[3]);
  assert.ok(opaque(paint('France', 2, 3)) > opaque(paint('France', 2, 0)));
  assert.equal(paint('France', 0, 0).length, TOWN_SPRITE_WIDTH * TOWN_SPRITE_HEIGHT * 4);
  const anchor = (TOWN_SPRITE_ANCHOR.y * TOWN_SPRITE_WIDTH + TOWN_SPRITE_ANCHOR.x) * 4;
  for (const [level, forts] of [[0, 0], [1, 2], [3, 4]]) assert.equal(paint('Spain', level, forts)[anchor + 3], 255);
});

test('only the flag shows allegiance', () => {
  const spain = paint('Spain', 2, 1);
  const holland = paint('Holland', 2, 1);
  // A 6x3 flag (18 pixels, 4 channels each) is the only difference.
  assert.ok(differing(spain, holland) > 0);
  assert.ok(differing(spain, holland) <= 18 * 4);
});
