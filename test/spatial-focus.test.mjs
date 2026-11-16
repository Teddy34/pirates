import test from 'node:test';
import assert from 'node:assert/strict';
import { spatialNeighbour } from '../src/spatial-focus.mjs';

const box = (left, top, width, height) => ({ left, top, right: left + width, bottom: top + height });

// The town menu of issue #108: six buttons on the first line, three wider
// ones wrapped onto the second.
const townMenu = [
  ...['Governor', 'Tavern', 'Merchant', 'Shipwright', 'Divide the plunder', 'Practice fencing']
    .map((label, index) => ({ label, rect: box(50 + index * 225, 50, 210, 68) })),
  ...['Logbook', 'Save voyage', 'Put to sea'].map((label, index) => ({ label, rect: box(50 + index * 450, 133, 435, 64) })),
];
const rects = townMenu.map(({ rect }) => rect);
const move = (from, key) => townMenu[spatialNeighbour(rects[townMenu.findIndex(({ label }) => label === from)], rects, key)]?.label;

test('left and right stay on the wrapped second line', () => {
  assert.equal(move('Logbook', 'ArrowRight'), 'Save voyage');
  assert.equal(move('Save voyage', 'ArrowRight'), 'Put to sea');
  assert.equal(move('Put to sea', 'ArrowLeft'), 'Save voyage');
  assert.equal(move('Save voyage', 'ArrowLeft'), 'Logbook');
});

test('left and right walk the first line', () => {
  assert.equal(move('Governor', 'ArrowRight'), 'Tavern');
  assert.equal(move('Divide the plunder', 'ArrowRight'), 'Practice fencing');
  assert.equal(move('Tavern', 'ArrowLeft'), 'Governor');
});

test('up and down go to a button above or below in the same column', () => {
  assert.equal(move('Governor', 'ArrowDown'), 'Logbook');
  assert.equal(move('Tavern', 'ArrowDown'), 'Logbook');
  assert.equal(move('Merchant', 'ArrowDown'), 'Save voyage');
  assert.equal(move('Practice fencing', 'ArrowDown'), 'Put to sea');
  assert.equal(move('Logbook', 'ArrowUp'), 'Governor');
  assert.equal(move('Save voyage', 'ArrowUp'), 'Merchant');
  assert.equal(move('Logbook', 'ArrowDown'), undefined);
});

test('with nothing in line, the nearest button that way is chosen', () => {
  // A lone button below and to the right of two stacked ones.
  const stacked = [box(0, 0, 100, 40), box(0, 50, 100, 40), box(150, 120, 100, 40)];
  assert.equal(spatialNeighbour(stacked[0], stacked, 'ArrowRight'), 2);
  assert.equal(spatialNeighbour(stacked[0], stacked, 'ArrowDown'), 1);
  assert.equal(spatialNeighbour(stacked[0], stacked, 'Enter'), -1);
});
