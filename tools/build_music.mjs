#!/usr/bin/env node
// Builds the game's music from the song arrangements in assets/music/songs/:
//
//   - each song's source MIDI (assets/music/sources/) gets the arrangement's
//     instruments and muted channels applied with SpessaSynth's
//     BasicMIDI.modify and is written to assets/music/<id>.mid;
//   - FluidR3_GM.sf2 is trimmed to the presets and keys those songs play,
//     its samples compressed to Ogg Vorbis (ffmpeg's libvorbis), and written
//     as one SoundFont 3 bank, assets/music/bank.sf3.
//
// src/music.mjs plays the result with SpessaSynth (src/vendor/spessasynth/).
// Provenance: assets/music/PROVENANCE.md.
//
//   node tools/build_music.mjs path/to/FluidR3_GM.sf2
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { BasicMIDI, SoundBankLoader } from '../src/vendor/spessasynth/spessasynth.min.js';

const ROOT = new URL('../assets/music/', import.meta.url);
// Ogg Vorbis quality (libvorbis -q:a, 0-10) for the bank's samples.
const VORBIS_QUALITY = 6;

// The arrangements name period instruments; these are their GM stand-ins.
export const INSTRUMENTS = {
  harpsichord: 6,
  lute: 24,          // nylon guitar
  'viol-tenor': 41,  // viola
  'viol-bass': 42,   // cello
  sackbut: 57,       // trombone
  'shawm-treble': 68, // oboe
  curtal: 70,        // bassoon
  recorder: 74,
  shawm: 111,        // shanai
};

// The BasicMIDI.modify options for an arrangement's `channels`
// ({ "<1-16>": "<instrument>" | "mute" }).
export function arrangement(channels) {
  const changes = new Map();
  for (const [channel, part] of Object.entries(channels)) {
    const index = Number(channel) - 1;
    if (part === 'mute') changes.set(index, 'clear');
    else if (Object.hasOwn(INSTRUMENTS, part)) {
      changes.set(index, { patch: { program: INSTRUMENTS[part], bankMSB: 0, bankLSB: 0, isGMGSDrum: false } });
    } else throw new Error(`Unknown instrument "${part}" on channel ${channel}`);
  }
  return { channels: changes };
}

function vorbis(audioData, sampleRate) {
  const pcm = Buffer.from(audioData.buffer, audioData.byteOffset, audioData.byteLength);
  const result = spawnSync('ffmpeg', [
    '-loglevel', 'error', '-f', 'f32le', '-ar', String(sampleRate), '-ac', '1', '-i', 'pipe:0',
    '-c:a', 'libvorbis', '-q:a', String(VORBIS_QUALITY), '-map_metadata', '-1', '-f', 'ogg', 'pipe:1',
  ], { input: pcm, maxBuffer: 1 << 28 });
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${result.stderr}`);
  return Promise.resolve(new Uint8Array(result.stdout));
}

const toArrayBuffer = (buffer) => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

async function main() {
  const [sf2Path] = process.argv.slice(2);
  if (!sf2Path) {
    console.error('usage: node tools/build_music.mjs path/to/FluidR3_GM.sf2');
    process.exit(1);
  }
  const bank = SoundBankLoader.fromArrayBuffer(toArrayBuffer(readFileSync(sf2Path)));
  const used = new Map();
  const songs = readdirSync(new URL('songs/', ROOT)).filter((file) => file.endsWith('.json'));
  for (const file of songs) {
    const id = file.slice(0, -'.json'.length);
    const song = JSON.parse(readFileSync(new URL(`songs/${file}`, ROOT)));
    const midi = BasicMIDI.fromArrayBuffer(toArrayBuffer(readFileSync(new URL(`sources/${song.midi}`, ROOT))), song.midi);
    midi.modify(arrangement(song.channels));
    writeFileSync(new URL(`${id}.mid`, ROOT), Buffer.from(midi.writeMIDI()));
    for (const [preset, keys] of midi.getUsedProgramsAndKeys(bank)) {
      if (!used.has(preset)) used.set(preset, new Set());
      for (const key of keys) used.get(preset).add(key);
    }
    console.log(`${id}.mid: ${song.title}`);
  }
  bank.trim(used);
  await bank.setSampleFormat({ format: 'compressed', compressionFunction: vorbis });
  const sf3 = Buffer.from(bank.writeSF2());
  writeFileSync(new URL('bank.sf3', ROOT), sf3);
  console.log(`bank.sf3: ${bank.presets.length} presets, ${bank.samples.length} samples, ${(sf3.length / 1024).toFixed(0)} KiB`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
