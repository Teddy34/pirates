import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTION_ICON_NAMES, ACTION_ICON_SIZE, actionIconName, paintActionIcon } from '../src/action-icons.mjs';

test('every icon is a full square with some opaque pixels', () => {
  for (const name of ACTION_ICON_NAMES) {
    const { width, height, pixels } = paintActionIcon(name);
    assert.equal(width, ACTION_ICON_SIZE);
    assert.equal(height, ACTION_ICON_SIZE);
    assert.equal(pixels.length, width * height * 4);
    assert.ok(pixels.some((value, index) => index % 4 === 3 && value === 255), name);
  }
});

test('labels pick the icon of their action', () => {
  const cases = {
    'Attack the town': 'cannon', 'Storm the walls': 'swords', Governor: 'crown', Tavern: 'mug', Merchant: 'coins',
    Shipwright: 'hammer', 'Divide the plunder': 'chest', 'Practice fencing': 'swords', Logbook: 'book', 'Save voyage': 'quill',
    'Put to sea': 'ship', 'Leave town': 'ship', 'Leave on foot': 'boot', 'Sail into the harbor': 'anchor', 'Sneak into town': 'mask',
    Investigate: 'spyglass', 'Return to town': 'back', Continue: 'tick', Done: 'tick', 'Keep walking': 'boot', 'Study the treasure maps (M)': 'map',
    'Continue the voyage': 'ship', 'Close for battle': 'cannon', Delete: 'cross', 'Delete slot 2': 'cross', Back: 'back',
    'Withdraw your offer': 'back', 'Wait for a better offer': 'hourglass', 'Decline the mission': 'back', 'Leave them drinking': 'back',
  };
  for (const [label, icon] of Object.entries(cases)) assert.equal(actionIconName(label), icon, label);
  assert.equal(actionIconName('Something unheard of'), null);
});

test('the sailing controls have their icons, turned and mirrored to match', () => {
  const rows = (name) => {
    const { pixels } = paintActionIcon(name);
    return Array.from({ length: ACTION_ICON_SIZE }, (_, y) => Array.from({ length: ACTION_ICON_SIZE }, (_, x) => pixels.slice((y * ACTION_ICON_SIZE + x) * 4, (y * ACTION_ICON_SIZE + x) * 4 + 4).join()));
  };
  for (const name of ['turn-port', 'turn-starboard', 'sails-up', 'sails-down', 'pause', 'play', 'zoom-in', 'zoom-out', 'up', 'down', 'shovel', 'treasure-map', 'bolt']) {
    assert.ok(ACTION_ICON_NAMES.includes(name), name);
  }
  const port = rows('turn-port');
  assert.deepEqual(rows('turn-starboard'), port.map((row) => [...row].reverse()));
  // The back arrow points left; up and down are it turned a quarter.
  const back = rows('back');
  const at = (grid, x, y) => grid[y][x];
  for (let y = 0; y < ACTION_ICON_SIZE; y += 1) {
    for (let x = 0; x < ACTION_ICON_SIZE; x += 1) {
      assert.equal(at(rows('up'), ACTION_ICON_SIZE - 1 - y, x), at(back, x, y));
      assert.equal(at(rows('down'), y, ACTION_ICON_SIZE - 1 - x), at(back, x, y));
    }
  }
});
