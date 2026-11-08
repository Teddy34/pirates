import test from 'node:test';
import assert from 'node:assert/strict';
import { paintShotSprite, volleyTier } from '../src/shot-sprites.mjs';

const opaque = ({ pixels }) => pixels.filter((_, index) => index % 4 === 3 && pixels[index] === 255).length;

test('volley size picks one of three cannonball sprites', () => {
  assert.deepEqual([1, 8, 9, 20, 21, 36].map(volleyTier), [0, 0, 1, 1, 2, 2]);
});

test('heavier volleys paint more iron, and the anchor sits on the ball', () => {
  for (const detail of [1, 2, 3]) {
    const sprites = [0, 1, 2].map((tier) => paintShotSprite({ tier, detail }));
    for (const sprite of sprites) {
      assert.equal(sprite.pixels.length, sprite.width * sprite.height * 4);
      assert.ok(sprite.anchor.x >= 0 && sprite.anchor.x < sprite.width);
    }
    assert.ok(opaque(sprites[0]) < opaque(sprites[1]) && opaque(sprites[1]) < opaque(sprites[2]));
    const single = sprites[0];
    assert.equal(single.pixels[(single.anchor.y * single.width + single.anchor.x) * 4 + 3], 255);
  }
});
