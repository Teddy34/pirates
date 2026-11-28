# SpessaSynth (vendored)

The music synthesizer: a SoundFont 2/3 and MIDI player in an AudioWorklet.

- `spessasynth.min.js`: `spessasynth_lib` 4.4.8 with `spessasynth_core`
  4.4.10 (and its dependencies `fflate` 0.8.3 and `stb-vorbis` 0.0.7)
  bundled into one minified ES module, which also exports `BasicMIDI`,
  `SoundBankLoader` and `BasicSoundBank` for `tools/build_music.mjs`.
- `spessasynth_processor.min.js`: the AudioWorklet processor from
  `spessasynth_lib` 4.4.8 (`dist/spessasynth_processor.min.js`), unchanged.

Licences: `spessasynth_lib` and `spessasynth_core` (Spessasus) and
`stb-vorbis` are Apache License 2.0; `fflate` (Arjun Barrett) is MIT. Their
licence files are copied here. The bundles keep their embedded legal
comments, including the BSD notice of the OpenMPT code (Olivier Lapicque,
OpenMPT Project Developers and Contributors) used for tracker modules.

Rebuild (in an empty scratch directory, not in this repository):

```sh
npm init -y
npm install --ignore-scripts spessasynth_lib@4.4.8 spessasynth_core@4.4.10 esbuild@0.25.10
node node_modules/esbuild/install.js
printf "export * from 'spessasynth_lib';\nexport { BasicMIDI, SoundBankLoader, BasicSoundBank } from 'spessasynth_core';\n" > entry.mjs
npx esbuild entry.mjs --bundle --format=esm --minify --legal-comments=eof --outfile=spessasynth.min.js
cp node_modules/spessasynth_lib/dist/spessasynth_processor.min.js .
```
