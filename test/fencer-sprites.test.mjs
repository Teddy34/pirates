import test from 'node:test';
import assert from 'node:assert/strict';
import { NATIONS } from '../src/data.mjs';
import { BODY_POSES, BODY_ROWS, FENCER_ART, LOOKS, bodyPixels, coatLooksLikeYours, fencerPose, hueAndSaturation, lookForOpponent, paintFencer } from '../src/fencer-sprites.mjs';
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

// A one-colour body sheet: every cell a 2×3 block, the captain's coat marked.
function fakeBodies() {
  const width = FENCER_ART.width * BODY_POSES.length, height = FENCER_ART.height * BODY_ROWS.length;
  const data = new Uint8ClampedArray(width * height * 4);
  BODY_ROWS.forEach((_, row) => BODY_POSES.forEach((__, column) => {
    for (let y = 40; y < 43; y += 1) for (let x = 20; x < 22; x += 1) {
      const index = ((row * FENCER_ART.height + y) * width + column * FENCER_ART.width + x) * 4;
      data.set([200, 50, 30, row === BODY_ROWS.indexOf('captain') ? 254 : 255], index);
    }
  }));
  return { width, height, data };
}

test('generated bodies replace the code-drawn body, and a coat takes the nation colour', () => {
  const bodies = fakeBodies();
  const plain = bodyPixels(bodies, LOOKS.player, 'guard');
  assert.equal(plain.filter(Boolean).length, 6);
  assert.equal(plain[40 * FENCER_ART.width + 20], '#c8321e');
  const coat = bodyPixels(bodies, { ...LOOKS.captain, coat: '#2f4f9a' }, 'lunge');
  assert.equal(coat[40 * FENCER_ART.width + 20], '#2f4f9a', 'the marked coat takes the look’s colour at its mean brightness');
  assert.notEqual(outline(LOOKS.player), Array.from(paintFencer({ look: LOOKS.player, bodies }).pixels.filter((_, index) => index % 4 === 3), (alpha) => (alpha === 255 ? 1 : 0)).join(''));
});

test('every pose names a body pose of the sheet', () => {
  for (let move = 0; move <= MOVE.yield; move += 1) {
    for (let frame = 0; frame < 8; frame += 1) assert.ok(BODY_POSES.includes(fencerPose(move, frame).body), `move ${move} frame ${frame}`);
  }
});
