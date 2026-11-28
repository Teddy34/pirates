import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { BasicMIDI, SoundBankLoader } from '../src/vendor/spessasynth/spessasynth.min.js';
import { INSTRUMENTS, arrangement } from '../tools/build_music.mjs';

const MUSIC = new URL('../assets/music/', import.meta.url);
const load = (path) => {
  const buffer = readFileSync(new URL(path, MUSIC));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
};
const songs = readdirSync(new URL('songs/', MUSIC)).filter((file) => file.endsWith('.json'))
  .map((file) => ({ id: file.slice(0, -5), ...JSON.parse(readFileSync(new URL(`songs/${file}`, MUSIC))) }));

test('arrangement turns 1-based channels into BasicMIDI.modify changes', () => {
  const { channels } = arrangement({ 1: 'recorder', 8: 'mute' });
  assert.deepEqual(channels.get(0), { patch: { program: 74, bankMSB: 0, bankLSB: 0, isGMGSDrum: false } });
  assert.equal(channels.get(7), 'clear');
  assert.throws(() => arrangement({ 2: 'kazoo' }), /Unknown instrument/);
});

test('each built song plays its arrangement within eight voices', () => {
  for (const song of songs) {
    const midi = BasicMIDI.fromArrayBuffer(load(`${song.id}.mid`));
    const parts = Object.entries(song.channels).filter(([, part]) => part !== 'mute');
    assert.ok(parts.length <= 8, `${song.id} has ${parts.length} parts`);
    const programs = new Map();
    const sounding = new Set();
    for (const track of midi.tracks) {
      for (const event of track.events) {
        const status = event.statusByte & 0xf0;
        const channel = (event.statusByte & 0x0f) + 1;
        if (status === 0xc0) programs.set(channel, event.data[0]);
        if (status === 0x90 && event.data[1] > 0) sounding.add(channel);
      }
    }
    for (const [channel, part] of Object.entries(song.channels)) {
      if (part === 'mute') assert.ok(!sounding.has(Number(channel)), `${song.id} channel ${channel} should be silent`);
      else assert.equal(programs.get(Number(channel)), INSTRUMENTS[part], `${song.id} channel ${channel} plays ${part}`);
    }
  }
});

test('the bank holds every preset the songs use, compressed', () => {
  const bank = SoundBankLoader.fromArrayBuffer(load('bank.sf3'));
  const programs = new Set(bank.presets.map((preset) => preset.program));
  for (const song of songs) {
    for (const part of Object.values(song.channels)) if (part !== 'mute') assert.ok(programs.has(INSTRUMENTS[part]), `bank lacks ${part}`);
  }
  assert.ok(bank.samples.every((sample) => sample.isCompressed), 'every sample is Ogg Vorbis');
});
