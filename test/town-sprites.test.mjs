import test from 'node:test';
import assert from 'node:assert/strict';
import { NATIONS } from '../src/data.mjs';
import { TOWN_SPRITE_ANCHOR, TOWN_SPRITE_HEIGHT, TOWN_SPRITE_WIDTH, paintTownSprite, townSizeClass } from '../src/town-sprites.mjs';

const paint = (key, population, forts) => paintTownSprite({ nation: { key, ...NATIONS[key] }, population, forts });
const opaque = (pixels) => pixels.filter((_, index) => index % 4 === 3 && pixels[index] === 255).length;

test('town size follows population', () => {
  assert.deepEqual([7, 11, 12, 24, 25, 60].map(townSizeClass), [0, 0, 1, 1, 2, 2]);
});

test('town sprites grow with population and forts and stay within the sprite', () => {
  const village = paint('France', 8, 0);
  assert.equal(village.length, TOWN_SPRITE_WIDTH * TOWN_SPRITE_HEIGHT * 4);
  assert.ok(opaque(paint('France', 30, 0)) > opaque(village));
  assert.ok(opaque(paint('France', 30, 3)) > opaque(paint('France', 30, 0)));
  // The anchor pixel, on the town's map cell, is part of the drawing.
  const anchor = (TOWN_SPRITE_ANCHOR.y * TOWN_SPRITE_WIDTH + TOWN_SPRITE_ANCHOR.x) * 4;
  for (const [population, forts] of [[8, 0], [15, 2], [45, 4]]) {
    assert.equal(paint('Spain', population, forts)[anchor + 3], 255);
  }
});

test('every flag paints a distinct sprite', () => {
  const sprites = Object.keys(NATIONS).map((key) => paint(key, 15, 1).join(','));
  assert.equal(new Set(sprites).size, sprites.length);
});
