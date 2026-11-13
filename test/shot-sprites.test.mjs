import test from 'node:test';
import assert from 'node:assert/strict';
import { VOLLEY_BALLS, paintShotSprite, volleyLayout, volleyTier } from '../src/shot-sprites.mjs';

const opaque = ({ pixels }) => pixels.filter((_, index) => index % 4 === 3 && pixels[index] === 255).length;

test('volley size picks a small, medium or big volley', () => {
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

test('volleys grow in balls, not ball size, and string out across the flight', () => {
  assert.deepEqual(VOLLEY_BALLS, [3, 6, 10]);
  for (const tier of [0, 1, 2]) {
    const layout = volleyLayout(tier);
    assert.equal(layout.length, VOLLEY_BALLS[tier]);
    assert.deepEqual(layout[0], [0, 0], 'one ball sits on the hit point');
    const span = (values) => Math.max(...values) - Math.min(...values);
    assert.ok(span(layout.map(([x]) => x)) > span(layout.map(([, y]) => y)), 'wider across the flight than along it');
    for (const [index, [x, y]] of layout.entries()) {
      for (const [ox, oy] of layout.slice(index + 1)) assert.ok(Math.hypot(x - ox, y - oy) >= 2.4, 'balls stay apart');
    }
  }
  // Flying east the volley is tall; flying north it is wide.
  const east = paintShotSprite({ tier: 2, detail: 1, direction: 64 });
  const north = paintShotSprite({ tier: 2, detail: 1, direction: 0 });
  const extent = ({ pixels, width, height }) => {
    let [minX, maxX, minY, maxY] = [width, 0, height, 0];
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] !== 255) continue;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    return { w: maxX - minX, h: maxY - minY };
  };
  assert.ok(extent(east).h > extent(east).w);
  assert.ok(extent(north).w > extent(north).h);
});
