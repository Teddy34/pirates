import test from 'node:test';
import assert from 'node:assert/strict';
import { NATIONS, SHIPS } from '../src/data.mjs';
import { BATTLE_SHIP_DESIGNS, battleShipDesign, battleShipPixelScale, paintBattleShipSprite } from '../src/battle-ship-sprites.mjs';

const nation = (key) => ({ key, ...NATIONS[key] });
const paint = (options) => paintBattleShipSprite({ type: 4, heading: 64, sails: 'full', nation: nation('England'), wind: 64, ...options });
const opaque = ({ pixels }) => pixels.filter((_, index) => index % 4 === 3 && pixels[index] === 255).length;
const same = (a, b) => a.width === b.width && a.height === b.height && a.pixels.every((value, index) => value === b.pixels[index]);
// The sprite's shape alone: which pixels are painted, ignoring colour.
const silhouette = ({ pixels, width, height, anchor }) => ({ width, height, anchor, mask: pixels.filter((_, index) => index % 4 === 3).map((alpha) => (alpha === 255 ? 1 : 0)) });

test('every ship type in the game has its own battle design', () => {
  for (const [name, { type }] of Object.entries(SHIPS)) assert.equal(battleShipDesign(type).name, name);
  assert.equal(BATTLE_SHIP_DESIGNS.length, Object.keys(SHIPS).length);
  assert.equal(new Set(BATTLE_SHIP_DESIGNS.map((design) => JSON.stringify({ ...design, name: '' }))).size, BATTLE_SHIP_DESIGNS.length);
});

test('ship types differ in outline, not only in colour', () => {
  for (const heading of [0, 32, 64, 96, 128, 192]) {
    const shapes = Object.values(SHIPS).map(({ type }) => JSON.stringify(silhouette(paint({ type, heading }))));
    assert.equal(new Set(shapes).size, shapes.length, `heading ${heading}`);
  }
});

test('the sloop is a one-masted fore-and-aft rig, the pinnace a square-rigged two-master', () => {
  const sloop = battleShipDesign(SHIPS.Sloop.type), pinnace = battleShipDesign(SHIPS.Pinnace.type);
  assert.deepEqual(sloop.masts.map(({ rig }) => rig), ['gaff']);
  assert.ok(sloop.jibs >= 1);
  assert.deepEqual(pinnace.masts.map(({ rig }) => rig), ['square', 'square']);
  assert.ok(!pinnace.jibs);
  // Seen bow-on, the pinnace's square sails are broader than the sloop's
  // fore-and-aft canvas.
  assert.ok(opaque(paint({ type: 0, heading: 0 })) > opaque(paint({ type: 1, heading: 0 })));
});

test('battle ship sprites are anchored on the hull and drawn at whole device pixels', () => {
  for (let type = 0; type < 8; type += 1) {
    for (let sector = 0; sector < 16; sector += 1) {
      for (const damage of [0, 32, 64]) {
        const sprite = paint({ type, heading: sector * 16, damage });
        assert.equal(sprite.pixels.length, sprite.width * sprite.height * 4);
        assert.ok(Number.isInteger(sprite.width) && Number.isInteger(sprite.height));
        const { x, y } = sprite.anchor;
        assert.ok(Number.isInteger(x) && Number.isInteger(y));
        assert.equal(sprite.pixels[(y * sprite.width + x) * 4 + 3], 255, `type ${type} sector ${sector} damage ${damage}`);
      }
    }
  }
  for (const scale of [.3, .76, 1, 1.72, 2.6]) {
    for (const ratio of [1, 2]) {
      const pixels = battleShipPixelScale(scale, ratio);
      assert.ok(Number.isInteger(pixels) && pixels >= 1, `${scale} × ${ratio}`);
    }
  }
  // Stacked ships: one art pixel per battle pixel; the flat stand-in: two.
  assert.equal(battleShipPixelScale(1.72, 1), 2);
  assert.equal(battleShipPixelScale(1.72, 2), 3);
  assert.equal(battleShipPixelScale(1.72, 1, 2), 3);
  assert.equal(battleShipPixelScale(.76, 1, 2), 2);
});

test('battle sprites follow the heading sectors, sails, flag and damage', () => {
  assert.ok(same(paint({ heading: 60 }), paint({ heading: 64 })));
  assert.ok(!same(paint({ heading: 64 }), paint({ heading: 80 })));
  for (let type = 0; type < 8; type += 1) {
    assert.ok(opaque(paint({ type, sails: 'full' })) > opaque(paint({ type, sails: 'furled' })), `type ${type}`);
    assert.ok(!same(paint({ type, changing: true }), paint({ type })), `type ${type}`);
    for (const heading of [0, 64]) assert.ok(!same(paint({ type, heading, damage: 16 }), paint({ type, heading })), `type ${type} holes`);
    // A lost mast (level 2) shows in the outline.
    assert.ok(opaque(paint({ type, damage: 32 })) < opaque(paint({ type })), `type ${type} mast`);
  }
  assert.ok(opaque(paint({ sails: 'full' })) > opaque(paint({ sails: 'battle' })));
  // Allegiance shows only in the flag.
  const english = paint({}), spanish = paint({ nation: nation('Spain') });
  const differing = english.pixels.filter((value, index) => value !== spanish.pixels[index]).length;
  assert.ok(differing > 0 && differing <= 15 * 4);
});
