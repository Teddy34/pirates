# Music provenance

## Sample bank (`bank.sf3`)

The instrument samples come from **Fluid (R3) General MIDI SoundFont**,
Copyright (c) 2000-2002, 2008 Frank Wen, released under the MIT licence. The
full notice is in `LICENSE-FluidR3.txt` and must stay with the bank.

- Source: Debian `fluid-soundfont_3.1.orig.tar.gz`
  (<http://deb.debian.org/debian/pool/main/f/fluid-soundfont/>), file
  `FluidR3_GM.sf2`, SHA-256
  `74594e8f4250680adf590507a306655a299935343583256f3b722c48a1bc1cb0`.
  The `.sf2` itself is not committed.
- Built with `node tools/build_music.mjs path/to/FluidR3_GM.sf2` (needs
  ffmpeg with libvorbis): SpessaSynth trims the bank to the presets and keys
  the songs play, and the samples are compressed to Ogg Vorbis (quality 6),
  written as a SoundFont 3 file. Nothing else in the presets is changed.

The arrangements in `songs/` name period instruments; their General MIDI
stand-ins are in `INSTRUMENTS` in `tools/build_music.mjs` (recorder, viola
for the tenor viol, cello for the bass viol, harpsichord, nylon guitar for
the lute, trombone for the sackbut, oboe and shanai for the shawms, bassoon
for the curtal).

## Scores (`songs/`)

### `sources/spagnoletta.mid` (title music: `songs/title.json`, built into `title.mid`)

- **Work:** “Spagnoletta”, from *Terpsichore* (1612) by Michael Praetorius
  (died 1621): public domain.
- **File:** a General MIDI arrangement and sequence by MJ Starke, 1995,
  downloaded from <https://www.midi-karaoke.info/21751ded.html> and supplied
  by the user on 2026-11-27, unchanged. Its text events read “Arranged and
  Sequenced by MJ Starke” and “©1995mjstarke”; no licence is stated. The
  user chose to use it on the assumption that it may be used freely, credited
  in the start screen's Credits.
- **Use:** `title.mid` is this file with the instruments of
  `songs/title.json` set (recorders, tenor viols, harpsichord, bass viol) and
  channel 8 removed (it doubles the bass of channel 9), leaving eight voices.
  Notes, timing, pan and reverb settings are the arranger's.

Each song's JSON names its source in `source`. Scores should be public-domain
compositions entered from a public-domain source (an original print or its
facsimile); a modern edition or MIDI transcription can carry its own
copyright and is used only when its licence allows it.
