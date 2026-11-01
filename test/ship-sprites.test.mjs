import test from 'node:test';
import assert from 'node:assert/strict';
import { NATIONS } from '../src/data.mjs';
import { headingSector, paintShipSprite, shipArtLength } from '../src/ship-sprites.mjs';

const paint = (options) => paintShipSprite({ type: 4, heading: 64, sails: 'full', nation: { key: 'England', ...NATIONS.England }, wind: 64, ...options });
const opaque = ({ pixels }) => pixels.filter((_, index) => index % 4 === 3 && pixels[index] === 255).length;
const same = (a, b) => a.width === b.width && a.height === b.height && a.pixels.every((value, index) => value === b.pixels[index]);

test('ship sprites follow the sixteen heading sectors', () => {
  assert.deepEqual([0, 7, 8, 23, 24, 232, 248, 255].map(headingSector), [0, 0, 1, 1, 2, 15, 0, 0]);
  assert.ok(same(paint({ heading: 60 }), paint({ heading: 64 })));
  assert.ok(!same(paint({ heading: 64 }), paint({ heading: 80 })));
});

test('ship sprites are sized to fit and anchored on the hull at the waterline', () => {
  for (let type = 0; type < 8; type += 1) {
    for (let sector = 0; sector < 16; sector += 1) {
      const sprite = paint({ type, heading: sector * 16, length: shipArtLength(type, 'battle') });
      assert.equal(sprite.pixels.length, sprite.width * sprite.height * 4);
      const { x, y } = sprite.anchor;
      assert.equal(sprite.pixels[(y * sprite.width + x) * 4 + 3], 255, `type ${type} sector ${sector}`);
    }
  }
});

test('bigger ships and more canvas paint more pixels', () => {
  assert.ok(opaque(paint({ type: 7, length: shipArtLength(7) })) > opaque(paint({ type: 0, length: shipArtLength(0) })));
  assert.ok(opaque(paint({ sails: 'full' })) > opaque(paint({ sails: 'battle' })));
  assert.ok(opaque(paint({ sails: 'battle' })) > opaque(paint({ sails: 'furled' })));
});

test('only the flag shows allegiance, and damage shows on the rig', () => {
  const english = paint({});
  const spanish = paint({ nation: { key: 'Spain', ...NATIONS.Spain } });
  const differing = english.pixels.filter((value, index) => value !== spanish.pixels[index]).length;
  assert.ok(differing > 0 && differing <= 15 * 4);
  // Level 2 (lost a mast) takes the foremast and its sails.
  assert.ok(opaque(paint({ damage: 32 })) < opaque(paint({ damage: 0 })));
  assert.ok(!same(paint({ damage: 16 }), paint({ damage: 0 })));
  for (const type of [0, 1]) for (const heading of [0, 64]) assert.ok(!same(paint({ type, heading, damage: 16 }), paint({ type, heading })), `type ${type}`);
  assert.ok(!same(paint({ changing: true }), paint({})));
});
