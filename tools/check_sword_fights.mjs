// Browser smoke check for sword fights: a duel, boarding, the guard and
// mutiny weapon choices and practice play through at a desktop and a narrow
// size (local ?preview= states). Set SWORD_SCREENSHOTS to a directory to
// keep screenshots.
import { S, VIEWPORTS, delay, dialogTitle, withBrowser } from './browser-harness.mjs';

await withBrowser({ name: 'sword', portOffset: 5, screenshotEnv: 'SWORD_SCREENSHOTS' }, async ({ evaluate, until, clickButton, screenshot, navigate, setViewport }) => {

  const holdKey = (key, down) => evaluate(`dispatchEvent(new KeyboardEvent('${down ? 'keydown' : 'keyup'}', { key: ${JSON.stringify(key)}, bubbles: true })), true`);
  const inFight = `${S}?.mode === 'sword'`;
  // Attack on changing lines until the fight ends; returns the log's last line.
  const fightItOut = async (where) => {
    await until(`${where}: the fight`, inFight);
    await delay(400);
    await screenshot(where);
    const canvasDrawn = await evaluate(`(() => {
      const canvas = document.querySelector('#game');
      const pixel = canvas.getContext('2d').getImageData(canvas.width >> 1, canvas.height >> 1, 1, 1).data;
      return pixel[3] === 255;
    })()`);
    if (!canvasDrawn) throw new Error(`${where}: the fight scene is not drawn`);
    if (await evaluate('document.documentElement.scrollWidth > innerWidth')) throw new Error(`${where}: the page scrolls sideways`);
    await holdKey('ArrowLeft', true);
    const lines = ['ArrowUp', 'ArrowDown', null];
    for (let round = 0; round < 400 && await evaluate(inFight); round += 1) {
      const line = lines[round % 3];
      if (line) await holdKey(line, true);
      await delay(150);
      if (line) await holdKey(line, false);
      if (round === 5) await screenshot(`${where}-close`);
    }
    await holdKey('ArrowLeft', false);
    if (await evaluate(inFight)) throw new Error(`${where}: the fight never ended`);
  };

  for (const viewport of VIEWPORTS) {
    await setViewport(viewport);

    // A duel straight away; its result reaches the caller and the map.
    await navigate(`/?preview=sword-duel`);
    await fightItOut(`${viewport.name}-duel`);
    await until('the map after the duel', `${S}.mode === 'sailing' && document.querySelector('#log').textContent.includes('Preview duel')`);

    // Pausing stops the fight clock.
    await navigate(`/?preview=sword-duel`);
    await until('the fight', inFight);
    // The controls under the fight are its keys' icon buttons (#136).
    const fightControls = await evaluate(`[...document.querySelectorAll('#controls button')].map((b) => b.getAttribute('aria-label') + ' [' + b.title + '] ' + Boolean(b.querySelector('img.action-icon')?.src.startsWith('data:image/png')) + ' ' + JSON.stringify(b.textContent.trim())).join('; ')`);
    for (const expected of ['Attack (hold) [Attack (hold) (← or A)] true ""', 'Quick thrust (hold with Attack) [Quick thrust (hold with Attack) (Shift)] true ""']) {
      if (!fightControls.includes(expected)) throw new Error(`${viewport.name}: sword-fight controls are ${fightControls}`);
    }
    await holdKey('p', true); await holdKey('p', false);
    const frame = await evaluate(`${S}.paused`);
    if (!frame) throw new Error(`${viewport.name}: P does not pause the fight`);

    // Boarding: the weapon choice, then a battle with crews.
    await navigate(`/?preview=boarding`);
    await until('the weapon choice', `${dialogTitle}?.startsWith('Boarding')`);
    await clickButton('Rapier');
    await fightItOut(`${viewport.name}-boarding`);
    await until('the boarding result', `${dialogTitle} || ${S}.mode === 'sailing'`);
    await screenshot(`${viewport.name}-boarding-result`);

    // The guard and the mutineer choose a weapon first, too.
    for (const [preview, title] of [['alley-duel', 'Halt'], ['mutiny', 'Your men confront']]) {
      await navigate(`/?preview=${preview}`);
      await until(`${preview} weapon choice`, `${dialogTitle}?.includes(${JSON.stringify(title)})`);
      await clickButton('Cutlass');
      await until(`${preview} fight`, inFight);
      await screenshot(`${viewport.name}-${preview}`);
    }

    // An assault, by sea and overland, ends in storming the walls: a battle
    // with crews, then the capture or the failure.
    for (const preview of ['fort-walls', 'land-attack']) {
      await navigate(`/?preview=${preview}`);
      await until(`${preview} assault`, `${dialogTitle}?.startsWith('Attack ')`);
      await clickButton('Storm the walls');
      await until(`${preview} weapon choice`, `document.querySelector('#event-dialog[open] #dialog-actions')?.textContent.includes('Cutlass')`);
      await clickButton('Cutlass');
      await fightItOut(`${viewport.name}-${preview}`);
      await until(`${preview} result`, `/Stormed the walls|Failed to capture/.test(document.querySelector('#log').textContent) && Boolean(${dialogTitle})`);
    }

    // Yielding in a battle with crews is a capture (0x16647): wounds +1,
    // prison, the exchange and a fresh fleet, never a ransom.
    for (const [preview, start, weapon] of [['boarding', 'Boarding', 'Rapier'], ['fort-walls', 'Attack ', null]]) {
      await navigate(`/?preview=${preview}`);
      await until(`${preview} start`, `${dialogTitle}?.startsWith(${JSON.stringify(start)})`);
      if (!weapon) {
        await clickButton('Storm the walls');
        await until(`${preview} weapon choice`, `document.querySelector('#event-dialog[open] #dialog-actions')?.textContent.includes('Cutlass')`);
      }
      const before = await evaluate(`JSON.stringify({ wounds: ${S}.player.wounds ?? 0, difficulty: ${S}.difficulty })`).then(JSON.parse);
      await clickButton(weapon ?? 'Cutlass');
      await until(`${preview} lost fight`, `${inFight} && globalThis.piratesPreview.settleFight('defeated')`);
      await until(`${preview} capture`, `${dialogTitle}?.startsWith('Imprisoned')`);
      // The assaulted town holds the captain.
      if (!weapon && !await evaluate(`${dialogTitle}.startsWith('Imprisoned in ')`)) throw new Error(`${viewport.name}: the assaulted town does not hold the captain`);
      await screenshot(`${viewport.name}-${preview}-captured`);
      if (await evaluate(`${S}.player.wounds`) !== before.wounds + 1) throw new Error(`${viewport.name}: ${preview} capture did not add a wound`);
      if (await evaluate(`/ransom/i.test(document.querySelector('#log').textContent)`)) throw new Error(`${viewport.name}: ${preview} defeat still pays a ransom`);
      await clickButton('Continue');
      await until(`${preview} release`, `/months pass$/.test(${dialogTitle} ?? '')`);
      if (await evaluate(`${S}.player.ships.length`) !== 1) throw new Error(`${viewport.name}: ${preview} capture did not refit a fresh fleet`);
      if (await evaluate(`${S}.difficulty`) !== Math.max(0, before.difficulty - 1)) throw new Error(`${viewport.name}: ${preview} capture did not lower the difficulty`);
      await clickButton('Continue');
      await until(`${preview} back at sea`, `${S}.mode === 'sailing' && !${dialogTitle} && /Released after|Failed to capture/.test(document.querySelector('#log').textContent)`);
    }

    // Practice raises the hit bonus by 5, won or lost.
    await navigate(`/?preview=sword-practice`);
    await until('the practice offer', `${dialogTitle} === 'Fencing practice'`);
    await clickButton('Longsword');
    // Practice happens in town, so it is fought in the town's street, not
    // on a deck (#140), and returns to the town menu.
    await until('the practice fight', inFight);
    const practiceScene = await evaluate('globalThis.piratesPreview.swordScene');
    if (practiceScene !== 'alley') throw new Error(`${viewport.name}: practice is fought on the ${practiceScene} backdrop, not in the town's alley`);
    await fightItOut(`${viewport.name}-practice`);
    await until('the practice bonus', `${S}.player.fencingPractice === 5`);
    await until('the town menu after practice', `${S}.mode === 'town' && [...document.querySelectorAll('#event-dialog[open] #dialog-actions button')].some((b) => b.textContent === 'Practice fencing')`);
    console.log(`${viewport.name}: duel, pause, boarding, guard, mutiny, assault and practice fights play through.`);
  }
});
