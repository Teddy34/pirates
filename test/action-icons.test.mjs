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
    'Put to sea': 'ship', 'Leave town': 'ship', 'Sail into the harbor': 'anchor', 'Sneak into town': 'mask',
    Investigate: 'spyglass', 'Return to town': 'back', Continue: 'next', 'Study the treasure maps (M)': 'map',
    'Continue the voyage': 'ship', 'Close for battle': 'cannon', Delete: 'cross', 'Delete slot 2': 'cross', Back: 'back',
    'Withdraw your offer': 'back', 'Wait for a better offer': 'next', 'Decline the mission': 'back', 'Leave them drinking': 'back',
  };
  for (const [label, icon] of Object.entries(cases)) assert.equal(actionIconName(label), icon, label);
  assert.equal(actionIconName('Something unheard of'), null);
});
