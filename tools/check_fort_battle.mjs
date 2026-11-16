// Browser smoke check for the fort battle: the briefing names the shore by
// the town as the landing place, the battle draws the coast round the town
// with one battery per fort (the preview town has several), landing by the
// town leads to storming the walls, and running aground under a fort away
// from the town or being driven off ends the attack. Runs at a desktop and a
// narrow size (?preview=fort-battle, and fort-battle-island for a small
// island whose fort stands by the town). Set
// FORT_SCREENSHOTS to a directory to keep screenshots.
import { S, VIEWPORTS, delay, dialogTitle, withBrowser } from './browser-harness.mjs';

await withBrowser({ name: 'fort', portOffset: 8, screenshotEnv: 'FORT_SCREENSHOTS' }, async ({ evaluate, until, clickButton, screenshot, open, setViewport }) => {
  const inBattle = `${S}?.mode === 'battle' && Boolean(${S}.battle?.fort)`;
  const startBattle = async (where, preview = 'fort-battle') => {
    await open(preview);
    const body = await evaluate("document.querySelector('#event-dialog[open] #dialog-body').textContent");
    if (!/ashore by the town/.test(body) || !/fort’s walls/.test(body)) throw new Error(`${where}: the briefing does not point to the town instead of the forts`);
    await screenshot(`${where}-briefing`);
    await clickButton('Command');
    await until(`${where}: the fort battle`, inBattle);
  };
  // Puts your ship on a point of the field; the next frame decides.
  const placeShip = (x, y) => evaluate(`Object.assign(${S}.battle.player, { x: ${x}, y: ${y} }), true`);
  const placeShipAt = (point) => evaluate(`Object.assign(${S}.battle.player, { x: ${S}.battle.${point}.x, y: ${S}.battle.${point}.y }), true`);

  for (const viewport of VIEWPORTS) {
    await setViewport(viewport);
    const where = viewport.name;

    await startBattle(where);
    await delay(1500);
    await screenshot(`${where}-battle`);
    const drawn = await evaluate(`(() => {
      const canvas = document.querySelector('#game');
      const pixel = canvas.getContext('2d').getImageData(canvas.width >> 1, canvas.height >> 1, 1, 1).data;
      return pixel[3] === 255;
    })()`);
    if (!drawn) throw new Error(`${where}: the fort battle is not drawn`);
    if (await evaluate('document.documentElement.scrollWidth > innerWidth')) throw new Error(`${where}: the page scrolls sideways`);
    if (!await evaluate(`${S}.battle.frame > 0`)) throw new Error(`${where}: the fort battle does not run`);
    if (!await evaluate(`${S}.battle.forts.length > 1 && ${S}.battle.forts.length === Math.min(4, ${S}.towns[${S}.battle.townIndex].forts)`)) {
      throw new Error(`${where}: the town's forts are not each a battery`);
    }

    // The shore by the town lands the crew, and storming the walls follows.
    await placeShipAt('field.landing');
    await until(`${where}: the landing`, `${dialogTitle}?.startsWith('Attack ') && document.querySelector('#dialog-actions').textContent.includes('Storm the walls')`);
    await screenshot(`${where}-landed`);
    await clickButton('Storm the walls');
    await until(`${where}: the weapon choice`, `document.querySelector('#event-dialog[open] #dialog-actions')?.textContent.includes('Cutlass')`);

    // A fort's shore away from the town is not a landing place.
    await startBattle(`${where}-aground`);
    await placeShipAt('forts[0]');
    await until(`${where}: aground`, `${dialogTitle} === 'Aground'`);
    await clickButton('Continue');
    await until(`${where}: back at sea`, `${S}.mode === 'sailing' && !document.querySelector('#event-dialog[open]')`);

    // Leaving the field: the fort drives you off, and the gunfire still
    // alerts the town.
    await startBattle(`${where}-driven-off`);
    const alertBefore = await evaluate(`${S}.alert`);
    await placeShip(3, 3);
    await until(`${where}: driven off`, `${dialogTitle} === 'Driven off'`);
    if (await evaluate(`${S}.alert`) <= alertBefore) throw new Error(`${where}: being driven off by the fort does not alert the town`);
    await clickButton('Continue');
    await until(`${where}: back at sea`, `${S}.mode === 'sailing' && !document.querySelector('#event-dialog[open]')`);

    // Issue #120: on a small island the fort stands by the town, and running
    // ashore beside it lands the crew.
    await startBattle(`${where}-island`, 'fort-battle-island');
    if (await evaluate(`${S}.towns[${S}.battle.townIndex].name`) !== 'St. Eustatius') throw new Error(`${where}: the island preview is not St. Eustatius`);
    await placeShipAt('forts[0]');
    await until(`${where}: landed beside the island's fort`, `${dialogTitle}?.startsWith('Attack ') && document.querySelector('#dialog-actions').textContent.includes('Storm the walls')`);
    await screenshot(`${where}-island-landed`);
    console.log(`${where}: the fort battle briefs, draws, lands by the town, runs aground, is driven off and lands beside a small island's fort.`);
  }
});
