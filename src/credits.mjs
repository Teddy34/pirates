// The start screen's credits: who made or released the material the game
// uses. Keep in step with the PROVENANCE.md files under assets/.

export const CREDITS = [
  {
    heading: 'Game',
    lines: [
      'RetroPirates!: original code. Rules reconstructed from the documented systems of Pirates! Gold (MicroProse, 1993); no material from the original game is used.',
    ],
  },
  {
    heading: 'Music',
    lines: [
      'Title: “Spagnoletta”, from Terpsichore (1612) by Michael Praetorius.',
      'MIDI arrangement and sequencing © 1995 MJ Starke, found at <a href="https://www.midi-karaoke.info/21751ded.html" target="_blank" rel="noopener">midi-karaoke.info</a>; the file states no licence.',
      'Instrument samples: Fluid (R3) General MIDI SoundFont © 2000–2002, 2008 Frank Wen, MIT licence.',
      'Synthesizer: SpessaSynth (spessasynth_lib and spessasynth_core) © Spessasus, Apache License 2.0, with stbvorbis.js (Apache License 2.0), fflate © Arjun Barrett (MIT licence) and OpenMPT code © Olivier Lapicque and the OpenMPT Project (BSD licence).',
    ],
  },
  {
    heading: 'Pictures',
    lines: [
      'Scene illustrations and fencers: generated from text prompts for this game, then reduced and pixelated.',
      'Governor portraits: public-domain paintings of 1560–1690 from Wikimedia Commons, pixelated (artists listed in assets/vignettes/PROVENANCE.md).',
      'Ships, towns and other sprites: drawn in code; the ship stacks use Daniel White’s sprite-stacking tool (MIT licence).',
    ],
  },
  {
    heading: 'Type',
    lines: ['“Pirates!” is set in Pinyon Script © 2024 The Pinyon Project Authors, SIL Open Font License 1.1.'],
  },
];

// The credits as dialog HTML (the lines are trusted, hand-written markup).
export function creditsHtml(credits = CREDITS) {
  return credits.map(({ heading, lines }) => `<section class="credits-section"><h3>${heading}</h3>${lines.map((line) => `<p>${line}</p>`).join('')}</section>`).join('');
}
