// Browser smoke check for the fort battle: the briefing names the harbor
// quay as the landing place, the battle draws its field with one battery per
// fort (the preview town has several), landing at the quay
// leads to storming the walls, and running aground or being driven off ends
// the attack. Runs at a desktop and a narrow size (?preview=fort-battle). Set
// FORT_SCREENSHOTS to a directory to keep screenshots.
import { S, VIEWPORTS, delay, dialogTitle, withBrowser } from './browser-harness.mjs';

await withBrowser({ name: 'fort', portOffset: 8, screenshotEnv: 'FORT_SCREENSHOTS' }, async ({ evaluate, until, clickButton, screenshot, open, setViewport }) => {
  const inBattle = `${S}?.mode === 'battle' && Boolean(${S}.battle?.fort)`;
  const startBattle = async (where) => {
    await open('fort-battle');
    const body = await evaluate("document.querySelector('#event-dialog[open] #dialog-body').textContent");
    if (!/town quay/.test(body) || !/fort’s rocks/.test(body)) throw new Error(`${where}: the briefing does not point to the quay instead of the fort`);
    await screenshot(`${where}-briefing`);
    await clickButton('Command');
    await until(`${where}: the fort battle`, inBattle);
  };
  // Puts your ship on a point of the field; the next frame decides.
  const placeShip = (x, y) => evaluate(`Object.assign(${S}.battle.player, { x: ${x}, y: ${y} }), true`);

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

    // The quay lands the crew, and storming the walls follows.
    await placeShip(340, 40);
    await until(`${where}: the landing`, `${dialogTitle}?.startsWith('Attack ') && document.querySelector('#dialog-actions').textContent.includes('Storm the walls')`);
    await screenshot(`${where}-landed`);
    await clickButton('Storm the walls');
    await until(`${where}: the weapon choice`, `document.querySelector('#event-dialog[open] #dialog-actions')?.textContent.includes('Cutlass')`);

    // The fort's rocks are not a landing place.
    await startBattle(`${where}-aground`);
    await placeShip(220, 90);
    await until(`${where}: aground`, `${dialogTitle} === 'Aground'`);
    await clickButton('Continue');
    await until(`${where}: back at sea`, `${S}.mode === 'sailing' && !document.querySelector('#event-dialog[open]')`);

    // Leaving the field: the fort drives you off.
    await startBattle(`${where}-driven-off`);
    await placeShip(240, 236);
    await until(`${where}: driven off`, `${dialogTitle} === 'Driven off'`);
    await clickButton('Continue');
    await until(`${where}: back at sea`, `${S}.mode === 'sailing' && !document.querySelector('#event-dialog[open]')`);
    console.log(`${where}: the fort battle briefs, draws, lands at the quay, runs aground and is driven off.`);
  }
});
