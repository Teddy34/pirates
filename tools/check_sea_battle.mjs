// Browser smoke check for the sea battle's ships (battle-ship-sprites.mjs):
// in ?preview=battle the enemy is switched through every ship type: sails
// must show on the canvas, and with the battle paused each type must change
// the picture to one no other type draws. The page must not scroll sideways. Runs at
// a desktop and a narrow size. Set SEA_BATTLE_SCREENSHOTS to a directory to
// keep a screenshot per ship type.
import { S, VIEWPORTS, delay, withBrowser } from './browser-harness.mjs';

const TYPES = ['Pinnace', 'Sloop', 'Barque', 'Cargo fluyt', 'Merchantman', 'Frigate', 'War galleon', 'Galleon'];

await withBrowser({ name: 'sea-battle', portOffset: 12, screenshotEnv: 'SEA_BATTLE_SCREENSHOTS' }, async ({ evaluate, until, screenshot, navigate, setViewport }) => {
  for (const viewport of VIEWPORTS) {
    await setViewport(viewport);
    const where = viewport.name;
    await navigate('/?preview=battle');
    await until(`${where}: the sea battle`, `${S}?.mode === 'battle' && ${S}.battle?.frame > 0`);
    // Count the canvas's sail pixels and hash the whole picture.
    const measure = () => evaluate(`(() => {
        const canvas = document.querySelector('#game');
        const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
        let sail = 0, hash = 0;
        for (let index = 0; index < data.length; index += 4) {
          const [r, g, b] = [data[index], data[index + 1], data[index + 2]];
          if ((r === 242 && g === 230 && b === 194) || (r === 205 && g === 181 && b === 129)) sail += 1;
          hash = (hash * 31 + r + g * 7 + b * 13) | 0;
        }
        return { sail, hash };
      })()`);
    // Only the type changes: the status line (drawn on the canvas) keeps the
    // enemy's name, so the picture differs only by the ship's sprite.
    const setEnemy = (type) => evaluate(`Object.assign(${S}.battle.enemy, { type: ${type} }), true`);
    // Under way: every type is drawn, in full sail.
    await evaluate(`(() => {
      const { battle } = ${S};
      battle.player.sails = 'full'; battle.enemy.sails = 'full';
      battle.player.sailTransition = 0; battle.enemy.sailTransition = 0;
      return true;
    })()`);
    for (const [type, name] of TYPES.entries()) {
      await setEnemy(type);
      await delay(250);
      if (!(await measure()).sail) throw new Error(`${where}: with a ${name} as the enemy, no sails are drawn`);
      await screenshot(`${where}-${name.replace(' ', '-').toLowerCase()}`);
    }
    // Paused, the picture holds still: only the enemy's type changes it, and
    // no two types draw the same.
    await evaluate('(globalThis.piratesPreview.state.paused = true, true)');
    await delay(250);
    const still = (await measure()).hash;
    await delay(250);
    if ((await measure()).hash !== still) throw new Error(`${where}: the paused battle does not hold still`);
    const hashes = [];
    for (const [type, name] of TYPES.entries()) {
      await setEnemy(type);
      await delay(250);
      const { hash } = await measure();
      if (hashes.includes(hash)) throw new Error(`${where}: the ${name} is drawn like another type`);
      hashes.push(hash);
    }
    if (await evaluate('document.documentElement.scrollWidth > innerWidth')) throw new Error(`${where}: the page scrolls sideways`);
    console.log(`${where}: all ${TYPES.length} ship types draw in the sea battle, each in its own outline.`);
  }
});
