// Browser smoke check for the family quest: a promotion names a villain, the
// bartender's gossip points to him, a duel in his town gives a map piece or
// lets him escape, and a rescue wipes the villains, at a desktop and a narrow
// viewport (local ?preview= states).
import { S, VIEWPORTS, dialogTitle, withBrowser } from './browser-harness.mjs';

await withBrowser({ name: 'villains', portOffset: 3, screenshotEnv: 'VILLAIN_SCREENSHOTS' }, async ({ evaluate, until, clickButton, screenshot, open, setViewport }) => {

  const bodyText = `document.querySelector('#dialog-body').textContent`;
  const expectBody = async (where, fragment) => {
    const text = await evaluate(bodyText);
    if (!text.includes(fragment)) throw new Error(`${where}: "${fragment}" not in: ${text}`);
  };

  for (const viewport of VIEWPORTS) {
    await setViewport(viewport);
    await evaluate(`localStorage.clear(), true`).catch(() => {});

    // A promotion names the first villain.
    await open('governor-promotion');
    await until('the promotion', `${dialogTitle}?.startsWith('Promotion to')`);
    await clickButton('Continue the audience');
    await until('the villain news', `${dialogTitle} === 'News of your long-lost sister'`);
    await expectBody(viewport.name, 'knows the whereabouts of your sister');
    await screenshot(`${viewport.name}-news`);
    const created = await evaluate(`${S}.villains.filter(Boolean).length`);
    if (created !== 1) throw new Error(`${viewport.name}: ${created} villains after a promotion`);
    if (!await evaluate(`${S}.towns[${S}.villains[0].townIndex].nation === 'Spain'`)) throw new Error(`${viewport.name}: the villain is not in a Spanish town`);

    // The bartender in the town he left says where he went.
    await open('villain-rumour');
    await clickButton('Ask the bartender');
    await until('the news', `${dialogTitle} === 'News from across the Caribbean'`);
    await clickButton('Return to the tavern');
    await until('the gossip', `${dialogTitle} === 'Comings and goings'`);
    await screenshot(`${viewport.name}-gossip`);
    await clickButton('Captain Ribault');
    await until('the report', `${dialogTitle} === 'Captain Ribault'`);
    await expectBody(viewport.name, 'left for');
    await clickButton('Continue');
    await until('the tavern', `${dialogTitle} === 'Rumours, recruits, and strong drink'`);

    // In his town he can be followed; a lost duel lets him escape.
    await open('villain-tavern');
    await clickButton('Follow the man');
    await until('the confrontation', `${dialogTitle} === 'Sneaking out a back entrance'`);
    await clickButton('Cutlass');
    await until('the duel', `${S}.mode === 'sword' && globalThis.piratesPreview.settleFight('defeated')`);
    await until('the escape', `${dialogTitle} === 'He escapes'`);
    if (await evaluate(`${S}.player.reputation`) !== -1) throw new Error(`${viewport.name}: a lost duel did not set reputation to -1`);
    if (await evaluate(`${S}.villains[0] === null`)) throw new Error(`${viewport.name}: the villain did not survive winning`);

    // A won duel clears the villain and gives a piece of the relative's map.
    await open('villain-tavern');
    await clickButton('Follow the man');
    await until('the confrontation', `${dialogTitle} === 'Sneaking out a back entrance'`);
    await clickButton('Cutlass');
    await until('the duel', `${S}.mode === 'sword' && globalThis.piratesPreview.settleFight('won')`);
    await until('the confession', `${dialogTitle} === 'Your sister is held captive'`);
    await screenshot(`${viewport.name}-map`);
    if (!await evaluate(`${S}.villains[0] === null && ${S}.treasureMaps[1].pieces !== 0`)) throw new Error(`${viewport.name}: the win did not give the map piece`);
    await clickButton('Continue');
    await until('the tavern', `${dialogTitle} === 'Rumours, recruits, and strong drink'`);
    if (await evaluate(`[...document.querySelectorAll('#dialog-actions button')].some((b) => b.textContent.startsWith('Follow the man'))`)) throw new Error(`${viewport.name}: the beaten villain is still in the tavern`);

    // A rescue wipes the villains and starts the lost-city map.
    await open('reunion-niece');
    await until('the rescue', `${dialogTitle} === 'Treasure!'`);
    await expectBody(viewport.name, 'ancient Olmec capital');
    if (!await evaluate(`${S}.villains.every((villain) => villain === null) && ${S}.relativesRescued === 3 && ${S}.treasureMaps[2].pieces !== 0`)) throw new Error(`${viewport.name}: the rescue did not wipe the villains`);
    console.log(`${viewport.name}: news, gossip, both duel results and the rescue all work.`);
  }
});
