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
  // At the line's end the focus stays rather than jumping to the other line.
  assert.equal(move('Put to sea', 'ArrowRight'), undefined);
  assert.equal(move('Logbook', 'ArrowLeft'), undefined);
  assert.equal(move('Practice fencing', 'ArrowRight'), undefined);
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

test('a taller or shorter button sharing part of the row is in line; one only touching it is not', () => {
  const row = [box(0, 0, 100, 40), box(300, 30, 100, 80), box(150, 40, 100, 40)];
  // The far button shares 10 px of the row; the near one only touches it.
  assert.equal(spatialNeighbour(row[0], row, 'ArrowRight'), 1);
  // The tall one shares the near button's row too, so left goes there first.
  assert.equal(spatialNeighbour(row[1], row, 'ArrowLeft'), 2);
  // Of two buttons the same distance below, the one more nearly under wins.
  const pair = [box(100, 0, 100, 40), box(20, 60, 100, 40), box(160, 60, 100, 40)];
  assert.equal(spatialNeighbour(pair[0], pair, 'ArrowDown'), 2);
});

test('up and down with nothing in the column take the nearest button that way', () => {
  // A lone button below and to the right of two stacked ones.
  const stacked = [box(0, 0, 100, 40), box(0, 50, 100, 40), box(150, 120, 100, 40)];
  assert.equal(spatialNeighbour(stacked[0], stacked, 'ArrowDown'), 1);
  assert.equal(spatialNeighbour(stacked[1], stacked, 'ArrowDown'), 2);
  // Left and right never leave the line, even for a button alone on it.
  assert.equal(spatialNeighbour(stacked[0], stacked, 'ArrowRight'), -1);
  assert.equal(spatialNeighbour(stacked[2], stacked, 'ArrowLeft'), -1);
  assert.equal(spatialNeighbour(stacked[0], stacked, 'Enter'), -1);
});
