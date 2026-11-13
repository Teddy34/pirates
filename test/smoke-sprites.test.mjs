import test from 'node:test';
import assert from 'node:assert/strict';
import { SMOKE_STAGES, SMOKE_VARIANTS, paintSmokeSprite } from '../src/smoke-sprites.mjs';
import { paintCloudSprite } from '../src/cloud-sprites.mjs';

const opaque = ({ pixels }) => pixels.filter((_, index) => index % 4 === 3 && pixels[index] === 255).length;
const colours = ({ pixels }) => {
  const set = new Set();
  for (let index = 0; index < pixels.length; index += 4) if (pixels[index + 3]) set.add(pixels.slice(index, index + 3).join(','));
  return set;
};

test('smoke puffs spread and thin out as they age', () => {
  for (const detail of [1, 2, 3]) {
    for (let variant = 0; variant < SMOKE_VARIANTS; variant += 1) {
      const stages = Array.from({ length: SMOKE_STAGES }, (_, stage) => paintSmokeSprite({ stage, variant, detail }));
      for (const sprite of stages) {
        assert.equal(sprite.pixels.length, sprite.width * sprite.height * 4);
        assert.ok(opaque(sprite) > 0);
      }
      assert.ok(stages.at(-1).width > stages[0].width, 'spreads');
      const fill = (sprite) => opaque(sprite) / (sprite.width * sprite.height);
      assert.ok(fill(stages.at(-1)) < fill(stages[0]) / 2, 'thins');
    }
  }
});

test('smoke is its own sprite, not a cloud', () => {
  const smoke = paintSmokeSprite({ stage: 1 });
  const cloud = paintCloudSprite(0);
  const shared = [...colours(smoke)].filter((colour) => colours(cloud).has(colour));
  assert.deepEqual(shared, []);
  // No outline or soft shadow: every pixel is fully painted or fully clear.
  for (let index = 3; index < smoke.pixels.length; index += 4) assert.ok([0, 255].includes(smoke.pixels[index]));
});

test('a fresh puff has a hot flash at its heart that later stages lose', () => {
  const flash = '255,242,184';
  assert.ok(colours(paintSmokeSprite({ stage: 0 })).has(flash));
  assert.ok(!colours(paintSmokeSprite({ stage: 2 })).has(flash));
});
