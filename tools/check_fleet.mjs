// Browser smoke check for the fleet view: every ship with her type's
// picture, crew, guns and hold, and renaming a ship (Enter names her, a
// name is shown as typed, clearing it restores the type), at a desktop and
// a narrow viewport, and choosing another flagship. Uses the local ?preview=fleet state (four ships, the
// flagship named Revenge).
import { S, VIEWPORTS, dialogTitle, withBrowser } from './browser-harness.mjs';

await withBrowser({ name: 'fleet', portOffset: 13, screenshotEnv: 'FLEET_SCREENSHOTS' }, async ({ command, evaluate, until, press, clickButton, screenshot, open, setViewport }) => {
  const inFleet = `${dialogTitle} === 'Your fleet'`;
  const rows = `[...document.querySelectorAll('.fleet-manifest tbody tr')].map((row) => ({
    name: row.querySelector('.fleet-name').textContent,
    cells: [...row.querySelectorAll('td')].map((cell) => cell.textContent.replace(/\\s+/g, ' ').trim()),
    icon: row.querySelector('img').naturalWidth,
  }))`;
  const rename = (index) => evaluate(`(() => {
    const button = document.querySelector('[data-transfer="rename"][data-kind="${index}"]');
    if (!button) throw new Error('no rename button ${index}');
    button.click();
    return true;
  })()`);

  for (const viewport of VIEWPORTS) {
    await setViewport(viewport);
    await evaluate(`localStorage.clear(), true`).catch(() => {});
    await open('fleet', inFleet);
    const fleet = await evaluate(rows);
    if (fleet.length !== 4) throw new Error(`${viewport.name}: expected four ships, got ${JSON.stringify(fleet)}`);
    if (fleet.some((ship) => ship.icon === 0)) throw new Error(`${viewport.name}: a ship picture did not load`);
    if (fleet[0].name !== 'Revenge' || fleet[1].name !== 'Sloop') throw new Error(`${viewport.name}: unexpected names ${JSON.stringify(fleet)}`);
    // 260 crew: eight each, then the Frigate (224) filled, the rest on the Sloop.
    const crew = fleet.map((ship) => ship.cells[1]);
    if (JSON.stringify(crew) !== JSON.stringify(['Crew 224 / 224', 'Crew 20 / 96', 'Crew 8 / 160', 'Crew 8 / 288'])) throw new Error(`${viewport.name}: crew ${JSON.stringify(crew)}`);
    const guns = fleet.map((ship) => ship.cells[2]);
    if (JSON.stringify(guns) !== JSON.stringify(['Guns 28 / 28', 'Guns 12 / 12', 'Guns 10 / 20', 'Guns 0 / 36'])) throw new Error(`${viewport.name}: guns ${JSON.stringify(guns)}`);
    const overflow = await evaluate(`(() => { const text = document.querySelector('.dialog-text') ?? document.querySelector('#event-dialog'); return text.scrollWidth - text.clientWidth; })()`);
    if (overflow > 1) throw new Error(`${viewport.name}: the fleet view scrolls sideways by ${overflow}px`);
    await screenshot(`${viewport.name}-fleet`);
    // The help box opens and closes in place and explains the gunners' rule.
    const toggleHelp = () => evaluate(`document.querySelector('.fleet-help-toggle').click(), true`);
    const helpShown = `!document.querySelector('#fleet-help').hidden && document.querySelector('.fleet-help-toggle').getAttribute('aria-expanded') === 'true'`;
    if (await evaluate(helpShown)) throw new Error(`${viewport.name}: the help box starts open`);
    await toggleHelp();
    await until('the help box', helpShown);
    if (!(await evaluate(`document.querySelector('#fleet-help').textContent.includes('A gun needs four men')`))) throw new Error(`${viewport.name}: the help box lacks the gunners' rule`);
    await screenshot(`${viewport.name}-help`);
    await toggleHelp();
    await until('the help box closed', `!(${helpShown})`);
    // The smallest phones: still no sideways scrolling.
    if (viewport.mobile) {
      await setViewport({ ...viewport, width: 320 });
      const tight = await evaluate(`(() => { const text = document.querySelector('.dialog-text') ?? document.querySelector('#event-dialog'); return text.scrollWidth - text.clientWidth; })()`);
      if (tight > 1) throw new Error(`320px: the fleet view scrolls sideways by ${tight}px`);
      await screenshot('small-fleet');
      await setViewport(viewport);
    }

    // Name the Sloop; spaces round the name are trimmed.
    await rename(1);
    await until('the name field', `${dialogTitle} === 'Name the Sloop' && document.activeElement?.id === 'ship-name'`);
    await command('Input.insertText', { text: '  Fair <Wind>  ' });
    await screenshot(`${viewport.name}-rename`);
    await press('Enter');
    await until('the fleet again', inFleet);
    const named = await evaluate(`${S}.player.ships[1].name`);
    if (named !== 'Fair <Wind>') throw new Error(`${viewport.name}: the Sloop was named ${JSON.stringify(named)}`);
    const shown = await evaluate(rows);
    if (shown[1].name !== 'Fair <Wind>') throw new Error(`${viewport.name}: the name shows as ${JSON.stringify(shown[1].name)}`);
    const saved = await evaluate(`Object.keys(localStorage).some((key) => localStorage.getItem(key).includes(${JSON.stringify(JSON.stringify({ name: 'Fair <Wind>' }).slice(1, -1))}))`);
    if (!saved) throw new Error(`${viewport.name}: the new name was not saved`);

    // Clear the flagship's name: she goes by her type again.
    await rename(0);
    await until('the name field', `${dialogTitle} === 'Name the Frigate'`);
    await clickButton('Clear the name');
    await until('the fleet again', inFleet);
    if (await evaluate(`'name' in ${S}.player.ships[0]`)) throw new Error(`${viewport.name}: the flagship kept a name`);

    // Make the Galleon (ship 4) the flagship: she moves to the head of the
    // fleet, the others keep their order, and the flagship has no button.
    if (await evaluate(`Boolean(document.querySelector('[data-transfer="flagship"][data-kind="0"]'))`)) throw new Error(`${viewport.name}: the flagship offers itself`);
    await evaluate(`document.querySelector('[data-transfer="flagship"][data-kind="3"]').click(), true`);
    await until('the new flagship', `${inFleet} && ${S}.player.ships[0].type === 'Galleon'`);
    const order = await evaluate(`${S}.player.ships.map((ship) => ship.type).join(',')`);
    if (order !== 'Galleon,Frigate,Sloop,Cargo fluyt') throw new Error(`${viewport.name}: fleet order ${order}`);
    const lead = (await evaluate(rows))[0];
    if (!lead.cells.join(' ').includes('Crew 236 / 288')) throw new Error(`${viewport.name}: the new flagship shows ${JSON.stringify(lead)}`);
    await screenshot(`${viewport.name}-flagship`);

    // Back to the sea, and F opens the fleet again.
    await clickButton('Done');
    await until('the sea', `!${dialogTitle} && ${S}.mode === 'sailing'`);
    await press('f');
    await until('the fleet by key', inFleet);
    await clickButton('Done');
    await until('the sea', `!${dialogTitle}`);
    console.log(`${viewport.name}: fleet view and renaming ok`);
  }
});
