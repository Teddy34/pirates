// Browser smoke check for the title music: nothing plays before the player
// interacts with the page; Shift alone (not a user activation) leaves audio
// suspended but a later click starts the title song, measured as sound at
// the music's output; the Settings dialog's volume slider changes and
// remembers the volume; the Credits name the music and sample sources; and
// beginning a voyage fades the music to silence.
import { delay, dialogTitle, withBrowser } from './browser-harness.mjs';

await withBrowser({ name: 'music', portOffset: 14 }, async ({ evaluate, until, press, click, clickButton, navigate }) => {
  await navigate('/');
  await until('the start screen', `!document.querySelector('#career-brief').classList.contains('hidden')`);
  // The music's first gain node is its output: tap it with an analyser.
  await evaluate(`(() => {
    localStorage.removeItem('retropirates-settings');
    globalThis.musicErrors = [];
    const warn = console.warn;
    console.warn = (...args) => { globalThis.musicErrors.push(args.join(' ')); warn(...args); };
    const Context = AudioContext;
    globalThis.AudioContext = class extends Context {
      constructor(...args) {
        super(...args);
        globalThis.musicContext = this;
        const createGain = this.createGain;
        this.createGain = function () {
          const gain = createGain.call(this);
          if (!globalThis.musicAnalyser) {
            const analyser = this.createAnalyser();
            analyser.fftSize = 2048;
            gain.connect(analyser);
            globalThis.musicAnalyser = analyser;
          }
          return gain;
        };
      }
    };
    globalThis.musicPeak = () => {
      const data = new Float32Array(2048);
      musicAnalyser.getFloatTimeDomainData(data);
      return data.reduce((peak, value) => Math.max(peak, Math.abs(value)), 0);
    };
    return true;
  })()`);
  await delay(500);
  if (await evaluate('Boolean(globalThis.musicContext)')) throw new Error('audio started before any interaction');

  await press('Shift');
  await delay(500);
  if (await evaluate(`musicContext?.state === 'running'`)) throw new Error('Shift alone should not start audio');
  const lede = await evaluate(`(() => { const r = document.querySelector('#start-screen .lede').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
  await click(...lede);
  await until('the title music', `musicContext.state === 'running' && musicPeak() > 0.02`, 30000);
  const errors = await evaluate('musicErrors');
  if (errors.length) throw new Error(`music errors: ${errors.join('; ')}`);

  await evaluate(`document.querySelector('#settings-button').click(), true`);
  await until('the settings dialog', `${dialogTitle} === 'Settings'`);
  const shown = await evaluate(`document.querySelector('#music-volume').value`);
  if (shown !== '60') throw new Error(`default volume shows ${shown}`);
  await evaluate(`(() => { const input = document.querySelector('#music-volume'); input.value = '25'; input.dispatchEvent(new Event('input')); return true; })()`);
  const saved = await evaluate(`JSON.parse(localStorage.getItem('retropirates-settings')).musicVolume`);
  if (saved !== 0.25) throw new Error(`volume saved as ${saved}`);
  if ((await evaluate(`document.querySelector('#music-volume-value').textContent`)) !== '25%') throw new Error('volume label did not follow the slider');
  await clickButton('Done');

  await evaluate(`document.querySelector('#credits-button').click(), true`);
  await until('the credits', `${dialogTitle} === 'Credits'`);
  const credits = await evaluate(`document.querySelector('#dialog-body').textContent`);
  for (const name of ['Praetorius', 'MJ Starke', 'Frank Wen', 'SpessaSynth', 'Pinyon Script']) if (!credits.includes(name)) throw new Error(`the credits miss ${name}`);
  await clickButton('Done');

  await evaluate(`document.querySelector('#new-game-form button[type="submit"]').click(), true`);
  await until('silence after the voyage begins', 'musicPeak() < 0.0005', 6000);
  await delay(1000);
  const after = await evaluate('musicPeak()');
  if (after >= 0.0005) throw new Error(`music kept playing after the voyage began (peak ${after})`);
  console.log('music: the title song sounded after a click, volume saved, credits shown, silent on Begin');
});
