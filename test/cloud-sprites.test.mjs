import test from 'node:test';
import assert from 'node:assert/strict';
import { paintCloudSprite } from '../src/cloud-sprites.mjs';

const colours = ({ pixels }) => {
  const seen = new Set();
  for (let index = 0; index < pixels.length; index += 4) if (pixels[index + 3] === 255) seen.add(pixels.slice(index, index + 3).join(','));
  return seen;
};

test('every cloud form is anchored inside its sprite', () => {
  for (const shape of [0, 1, 2]) {
    const sprite = paintCloudSprite(shape);
    assert.equal(sprite.pixels.length, sprite.width * sprite.height * 4);
    assert.equal(sprite.pixels[(sprite.anchor.y * sprite.width + sprite.anchor.x) * 4 + 3], 255);
  }
});

test('clouds are shaded from the north-west and their shadow is one flat colour', () => {
  // Outline, highlight, body, shade and the deep underside.
  assert.equal(colours(paintCloudSprite(1)).size, 5);
  const shadow = paintCloudSprite(1, { shadow: true });
  assert.equal(colours(shadow).size, 1);
  const body = paintCloudSprite(1);
  assert.equal(shadow.width, body.width);
  assert.deepEqual(shadow.anchor, body.anchor);
});
