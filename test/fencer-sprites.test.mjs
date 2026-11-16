import test from 'node:test';
import assert from 'node:assert/strict';
import { NATIONS } from '../src/data.mjs';
import { LOOKS, coatLooksLikeYours, hueAndSaturation, lookForOpponent, paintFencer } from '../src/fencer-sprites.mjs';
import { MOVE } from '../src/sword-mechanics.mjs';

const TITLES = ['Captain', 'Guard', 'Suitor', 'Mutineer', 'Villain', 'Sparring partner'];
const NATION_KEYS = [...Object.keys(NATIONS), undefined];
const opponentLooks = () => TITLES.flatMap((title) => NATION_KEYS.map((nation) => ({ label: `${title} (${nation ?? 'no flag'})`, look: lookForOpponent(title, nation, NATIONS) })));

// The opaque pixels of a painted fencer.
const outline = (look, move = MOVE.guardMid) => Array.from(paintFencer({ move, look }).pixels.filter((_, index) => index % 4 === 3), (alpha) => (alpha === 255 ? 1 : 0)).join('');

test('issue #134: you fence in the blue coat and red sash of the scene pictures’ captain', () => {
  const { hue, saturation } = hueAndSaturation(LOOKS.player.coat);
  assert.ok(hue >= 200 && hue <= 240 && saturation > .4, `a blue coat (${LOOKS.player.coat})`);
  assert.equal(hueAndSaturation(LOOKS.player.sash).hue < 15, true, 'a red sash');
  assert.equal(LOOKS.player.hat, 'hair', 'bareheaded, hair tied back');
  assert.equal(coatLooksLikeYours(LOOKS.player.coat), true);
});

test('no opponent wears a coat or shirt like your blue one, whatever his flag', () => {
  // France's colour is blue: its captains and guards keep their red coats.
  assert.equal(coatLooksLikeYours(NATIONS.France.color), true);
  assert.equal(lookForOpponent('Captain', 'France', NATIONS).coat, LOOKS.captain.coat);
  assert.equal(lookForOpponent('Guard', 'France', NATIONS).coat, LOOKS.guard.coat);
  assert.equal(lookForOpponent('Guard', 'Spain', NATIONS).coat, NATIONS.Spain.color, 'other flags still dress their men');
  for (const { label, look } of opponentLooks()) {
    assert.equal(coatLooksLikeYours(look.coat ?? look.shirt), false, label);
  }
});

test('you and every opponent differ in outline, not only in colour', () => {
  for (const move of [MOVE.guardMid, MOVE.slashHigh, MOVE.thrustLow, MOVE.advance]) {
    const yours = outline(LOOKS.player, move);
    for (const { label, look } of opponentLooks()) assert.notEqual(outline(look, move), yours, `${label}, move ${move}`);
    for (const look of [LOOKS.sailor, LOOKS.soldier]) assert.notEqual(outline(look, move), yours, `a crewman, move ${move}`);
  }
});
