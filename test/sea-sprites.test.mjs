import test from 'node:test';
import assert from 'node:assert/strict';
import { SEA_FRAMES, WIND_DIAL_SIZE, paintSea, paintWindDial } from '../src/sea-sprites.mjs';

test('the pixel sea fills the arena, is repeatable and moves between frames', () => {
  const frames = Array.from({ length: SEA_FRAMES }, (_, frame) => paintSea({ width: 96, height: 64, frame }));
  for (const sea of frames) {
    assert.equal(sea.pixels.length, 96 * 64 * 4);
    for (let index = 3; index < sea.pixels.length; index += 4) assert.equal(sea.pixels[index], 255, 'every pixel is opaque sea');
  }
  assert.deepEqual(paintSea({ width: 96, height: 64, frame: 1 }).pixels, frames[1].pixels);
  assert.notDeepEqual(frames[0].pixels, frames[1].pixels);
});

test('the wind dial streamer points where the wind blows', () => {
  // The arrowhead sits in the half of the dial the wind blows towards.
  const brightest = (direction) => {
    const { pixels } = paintWindDial({ direction, strength: 0 });
    const c = (WIND_DIAL_SIZE - 1) / 2;
    let sum = [0, 0];
    for (let y = 0; y < WIND_DIAL_SIZE; y += 1) for (let x = 0; x < WIND_DIAL_SIZE; x += 1) {
      const offset = (y * WIND_DIAL_SIZE + x) * 4;
      if (pixels[offset] === 0xf3 && pixels[offset + 1] === 0xe5 && !(x === Math.round(c) && y < 5)) sum = [sum[0] + x - c, sum[1] + y - c];
    }
    return sum;
  };
  assert.ok(brightest(192)[0] < 0, 'blowing west: head on the left');
  assert.ok(brightest(64)[0] > 0, 'blowing east: head on the right');
  assert.ok(brightest(128)[1] > 0, 'blowing south: head below');
});
