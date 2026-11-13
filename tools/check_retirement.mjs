// Browser smoke check for retirement: the voluntary ending through the
// hall of fame, and forced retirement in poor health with a return to
// pirating, at a desktop and a narrow viewport (local ?preview= states).
import { S, VIEWPORTS, dialogTitle, withBrowser } from './browser-harness.mjs';

await withBrowser({ name: 'retirement', portOffset: 2, screenshotEnv: 'RETIREMENT_SCREENSHOTS' }, async ({ evaluate, until, press, clickButton, screenshot, open, setViewport }) => {

  for (const viewport of VIEWPORTS) {
    await setViewport(viewport);
    await evaluate(`localStorage.clear(), true`).catch(() => {});

    // Retire at the counting house, stay retired and enter the hall of fame.
    await open('retirement');
    await until('the division', `${dialogTitle} === 'Divide the plunder?'`);
    await clickButton('Retire from privateering');
    await until('the confirmation', `${dialogTitle} === 'Retire from privateering?'`);
    await press('y');
    await until('the career summary', `${dialogTitle}?.startsWith('The Further Adventures of the Pirate Preview')`);
    const summary = await evaluate(`document.querySelector('#dialog-body').textContent`);
    for (const fragment of ['an English Captain and a French Colonel', 'at the age of 31', 'rescuing one member']) {
      if (!summary.includes(fragment)) throw new Error(`${viewport.name}: summary lacks "${fragment}": ${summary}`);
    }
    await screenshot(`${viewport.name}-summary`);
    await clickButton('Continue');
    await until('the new life', `${dialogTitle} === 'Your pirating days are over'`);
    const life = await evaluate(`document.querySelector('#dialog-body').textContent`);
    // The division averages reputation down from 20 before the score (0x180C8), so the Colonel's 37 points drop a little.
    if (!/a Colonel in Guadeloupe, where/.test(life) || !/points3\d\/100/.test(life)) throw new Error(`${viewport.name}: unexpected ending: ${life}`);
    await clickButton('Continue');
    await until('the lure of the sea', `${dialogTitle} === 'The lure of the sea'`);
    await clickButton('Remain in retirement');
    await until('the hall of fame offer', `${dialogTitle} === 'The Pirate Hall of Fame'`);
    if (await evaluate(`localStorage.getItem('fortune-and-freedom-save-v5') !== null`)) throw new Error(`${viewport.name}: the save survived retirement`);
    await press('y');
    await until('the hall of fame', `document.querySelector('.hall-of-fame [aria-current]')?.textContent.includes('Colonel in Guadeloupe')`);
    await screenshot(`${viewport.name}-hall`);
    await clickButton('Continue');
    await until('another game', `${dialogTitle} === 'Another game?'`);
    await press('n');
    await until('farewell', `${dialogTitle} === 'Farewell'`);
    console.log(`${viewport.name}: retired as a Colonel in Guadeloupe and entered the hall of fame.`);

    // Poor health ends the career at the division; the lure of the sea returns to a new expedition.
    await open('retirement-poor');
    await until('the poor-health division', `${dialogTitle} === 'Divide the plunder?' && document.querySelector('#dialog-body').textContent.includes('Your health is poor')`);
    if (await evaluate(`[...document.querySelectorAll('#dialog-actions button')].some((b) => b.textContent.startsWith('Begin a new expedition'))`)) throw new Error(`${viewport.name}: poor health still offers a new expedition`);
    const wealthBefore = await evaluate(`${S}.player.personalWealth`);
    await clickButton('Divide the plunder');
    await until('forced retirement', `${dialogTitle} === 'Time to retire'`);
    await clickButton('Continue');
    await until('the career summary', `${dialogTitle}?.startsWith('The Further Adventures')`);
    await clickButton('Continue');
    await until('the new life', `${dialogTitle} === 'Your pirating days are over'`);
    await clickButton('Continue');
    await until('the lure of the sea', `${dialogTitle} === 'The lure of the sea'`);
    await clickButton('Return to pirating');
    await until('the refit', `${dialogTitle} === 'The company disperses'`);
    const after = await evaluate(`({ wealth: ${S}.player.personalWealth, months: ${S}.player.monthsAtSea })`);
    // One captain's take of 800 plus the refit's monthly land income (10 a month), not two takes.
    const gained = after.wealth - wealthBefore;
    if (gained < 800 || gained >= 1600) throw new Error(`${viewport.name}: personal wealth rose by ${gained}, expected one captain's take of 800`);
    await clickButton('Return to town');
    await until('the town menu', `${dialogTitle} === 'Guadeloupe'`);
    console.log(`${viewport.name}: poor health forced retirement; the captain returned to pirating with one captain's take.`);
  }
});
