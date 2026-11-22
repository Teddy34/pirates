import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { NATIONS, SHIPS } from '../src/data.mjs';
import { SHIP_STACK_DATA } from '../src/ship-stack-data.mjs';
import { paintStackedShip, shipStackRow, shipStackTurn } from '../src/ship-stacks.mjs';

// Decodes an 8-bit RGBA or RGB, non-interlaced PNG (what Pillow writes).
function readPng(path) {
  const data = readFileSync(path);
  let offset = 8, width = 0, height = 0, colourType = 0;
  const idat = [];
  while (offset < data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.toString('latin1', offset + 4, offset + 8);
    const body = data.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0); height = body.readUInt32BE(4);
      assert.equal(body[8], 8); assert.equal(body[12], 0);
      colourType = body[9];
    } else if (type === 'IDAT') idat.push(body);
    offset += 12 + length;
  }
  assert.ok(colourType === 6 || colourType === 2, `colour type ${colourType}`);
  const channels = colourType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const rows = new Uint8Array(height * stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x += 1) {
      const a = x >= channels ? rows[y * stride + x - channels] : 0;
      const b = y > 0 ? rows[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? rows[(y - 1) * stride + x - channels] : 0;
      let value = line[x];
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      rows[y * stride + x] = value & 255;
    }
  }
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    for (let channel = 0; channel < 3; channel += 1) pixels[index * 4 + channel] = rows[index * channels + channel];
    pixels[index * 4 + 3] = channels === 4 ? rows[index * channels + 3] : 255;
  }
  return { width, height, pixels };
}

const atlases = Object.fromEntries(['battle', 'map'].map((size) => [size, readPng(new URL(`../assets/sprites/ship-stacks-${size}.png`, import.meta.url))]));
const nation = (key) => ({ key, ...NATIONS[key] });
const paint = (options) => paintStackedShip(atlases[options.size ?? 'battle'], { type: 4, heading: 64, sails: 'full', nation: nation('England'), wind: 64, ...options });
const opaque = ({ pixels }) => pixels.filter((_, index) => index % 4 === 3 && pixels[index] === 255).length;
const same = (a, b) => a.width === b.width && a.height === b.height && a.pixels.every((value, index) => value === b.pixels[index]);

test('each atlas holds every ship type in every rig state, as its data says', () => {
  for (const [size, cell] of Object.entries(SHIP_STACK_DATA.sizes)) {
    const atlas = atlases[size];
    assert.equal(atlas.width, cell.width * cell.slices, size);
    assert.equal(atlas.height, cell.length * cell.rows.length, size);
    for (const [name, { type }] of Object.entries(SHIPS)) {
      for (const sails of ['full', 'battle', 'furled']) {
        for (const dismasted of [false, true]) {
          const index = shipStackRow(size, type, sails, dismasted);
          assert.ok(index >= 0, `${size} ${name} ${sails} ${dismasted}`);
          assert.equal(cell.rows[index].name, name);
        }
      }
    }
  }
});

test('stacked ships turn in 64 steps and are anchored on the hull', () => {
  assert.deepEqual([0, 1, 2, 5, 6, 254, 255].map(shipStackTurn), [0, 0, 1, 1, 2, 0, 0]);
  for (const size of ['battle', 'map']) {
    for (let type = 0; type < 8; type += 1) {
      for (let turn = 0; turn < 64; turn += 4) {
        for (const damage of [0, 32]) {
          const sprite = paint({ size, type, heading: turn * 4, damage });
          assert.equal(sprite.pixels.length, sprite.width * sprite.height * 4);
          const { x, y } = sprite.anchor;
          assert.ok(Number.isInteger(x) && Number.isInteger(y));
          assert.equal(sprite.pixels[(y * sprite.width + x) * 4 + 3], 255, `${size} type ${type} turn ${turn} damage ${damage}`);
        }
      }
    }
  }
  assert.ok(!same(paint({ heading: 64 }), paint({ heading: 68 })));
  assert.ok(same(paint({ heading: 63 }), paint({ heading: 64 })));
});

test('ship types differ, and a ship seen bow-on is narrower than broadside', () => {
  const shapes = Object.values(SHIPS).map(({ type }) => JSON.stringify(Array.from(paint({ type }).pixels)));
  assert.equal(new Set(shapes).size, shapes.length);
  for (let type = 0; type < 8; type += 1) assert.ok(paint({ type, heading: 0 }).width < paint({ type, heading: 64 }).width, `type ${type}`);
  assert.ok(opaque(paint({ type: 7 })) > opaque(paint({ type: 0 })));
  assert.ok(opaque(paint({ size: 'battle' })) > opaque(paint({ size: 'map' })));
});

test('stacked ships show sails, flag and damage', () => {
  for (let type = 0; type < 8; type += 1) {
    assert.ok(opaque(paint({ type, sails: 'full' })) > opaque(paint({ type, sails: 'furled' })), `type ${type}`);
    assert.ok(!same(paint({ type, changing: true }), paint({ type })), `type ${type} changing`);
    assert.ok(!same(paint({ type, damage: 16 }), paint({ type })), `type ${type} holes`);
    assert.ok(opaque(paint({ type, damage: 32 })) < opaque(paint({ type })), `type ${type} mast`);
  }
  assert.ok(opaque(paint({ sails: 'full' })) > opaque(paint({ sails: 'battle' })));
  // Allegiance shows only in the pennant.
  const english = paint({}), spanish = paint({ nation: nation('Spain') });
  const differing = english.pixels.filter((value, index) => value !== spanish.pixels[index]).length;
  assert.ok(differing > 0 && differing <= 15 * 4);
});
