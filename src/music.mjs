// Period music: public-domain dances played from MIDI files by SpessaSynth
// (src/vendor/spessasynth/, Apache-2.0), a full SoundFont synthesizer in an
// AudioWorklet, with its reverb and chorus, on a General MIDI bank trimmed
// from FluidR3 (assets/music/bank.sf3).
//
// Songs are assets/music/<id>.mid, built with their period instruments by
// tools/build_music.mjs from the arrangements in assets/music/songs/.
// The synthesizer loads only when music first plays, after a user gesture.

const VENDOR = new URL('./vendor/spessasynth/', import.meta.url);
const MUSIC_URL = 'assets/music/';
// The title song through SpessaSynth peaks near 0.25 at full volume: doubled,
// it peaks near 0.5, loud enough at the default volume without clipping.
const OUTPUT_GAIN = 2;

export function createMusicPlayer({ volume = 0.6 } = {}) {
  let context = null;
  let output = null;
  let engine = null; // Promise of { synth, sequencer }
  let current = null;
  let level = volume;

  function audio() {
    if (!context) {
      const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      if (!Context?.prototype || !('audioWorklet' in Context.prototype)) return null;
      context = new Context();
      output = context.createGain();
      output.gain.value = level * OUTPUT_GAIN;
      output.connect(context.destination);
    }
    return context;
  }

  function loadEngine() {
    engine ??= (async () => {
      const [lib, bank] = await Promise.all([
        import(new URL('spessasynth.min.js', VENDOR).href),
        fetch(`${MUSIC_URL}bank.sf3`).then((response) => {
          if (!response.ok) throw new Error(`bank.sf3: HTTP ${response.status}`);
          return response.arrayBuffer();
        }),
        context.audioWorklet.addModule(new URL('spessasynth_processor.min.js', VENDOR).href),
      ]);
      const synth = new lib.WorkletSynthesizer(context);
      synth.connect(output);
      await synth.isReady;
      await synth.soundBankManager.addSoundBank(bank, 'main');
      const sequencer = new lib.Sequencer(synth);
      return { synth, sequencer };
    })();
    engine.catch(() => { engine = null; });
    return engine;
  }

  async function song(id) {
    const response = await fetch(`${MUSIC_URL}${id}.mid`);
    if (!response.ok) throw new Error(`${id}.mid: HTTP ${response.status}`);
    return response.arrayBuffer();
  }

  return {
    // Starts song `id`, looping (a no-op if it is already playing). Browsers
    // keep audio suspended until a user gesture; call unlock() from one.
    async play(id) {
      if (current === id || !audio()) return;
      current = id;
      try {
        const [{ sequencer }, binary] = await Promise.all([loadEngine(), song(id)]);
        if (current !== id) return;
        output.gain.cancelScheduledValues(context.currentTime);
        output.gain.setValueAtTime(level * OUTPUT_GAIN, context.currentTime);
        sequencer.loadNewSongList([{ binary, fileName: `${id}.mid` }]);
        sequencer.loopCount = Infinity;
        sequencer.play();
      } catch (error) {
        if (current === id) current = null;
        throw error;
      }
    },
    // Fades the current song out over `fade` seconds, then stops it.
    stop(fade = 0) {
      if (!current || !context) return;
      current = null;
      const now = context.currentTime;
      const length = Math.max(fade, 0.02);
      output.gain.cancelScheduledValues(now);
      output.gain.setValueAtTime(output.gain.value, now);
      output.gain.linearRampToValueAtTime(0, now + length);
      setTimeout(async () => {
        if (current || !engine) return;
        const { sequencer, synth } = await engine;
        sequencer.pause();
        synth.stopAll(true);
      }, length * 1000);
    },
    // Resumes audio from a user gesture; true once audio is running.
    unlock() {
      const ctx = audio();
      if (ctx?.state === 'suspended') ctx.resume();
      return ctx?.state === 'running';
    },
    get playing() { return current; },
    get volume() { return level; },
    set volume(value) {
      level = Math.max(0, Math.min(1, value));
      if (output && current) output.gain.setTargetAtTime(level * OUTPUT_GAIN, context.currentTime, 0.05);
    },
  };
}
