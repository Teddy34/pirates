// Browser smoke check for landing, walking, entering a town on foot,
// re-boarding, digging and reefs, at a desktop and a narrow viewport.
// Uses the local ?preview= states and the piratesPreview hook they expose.
import { S, VIEWPORTS, delay, dialogTitle, withBrowser } from './browser-harness.mjs';

await withBrowser({ name: 'landing', portOffset: 1, screenshotEnv: 'LANDING_SCREENSHOTS' }, async ({ command, evaluate, until, press, clickButton, screenshot, navigate, open: openPreview, setViewport }) => {
  // A preview is ready once the voyage runs or a dialog is open.
  const open = (preview) => openPreview(preview, `${S}?.player && !${S}.paused || Boolean(${dialogTitle})`);

  for (const viewport of VIEWPORTS) {
    await setViewport(viewport);

    // A new career opens in the town screen, and putting to sea starts sailing.
    await navigate(`/`);
    const dialogKicker = "document.querySelector('#event-dialog[open] #dialog-kicker')?.textContent";
    // The form ignores a submit until the scenario data has loaded.
    await until('the opening story', `${dialogKicker}?.endsWith('Your story') || (document.querySelector('#new-game-form')?.requestSubmit(), false)`);
    await screenshot(`${viewport.name}-opening-story`);
    // Esc must not dismiss a dialog and strand the opening.
    for (let press = 0; press < 3; press += 1) {
      await command('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    }
    await delay(200);
    if (!await evaluate(`Boolean(document.querySelector('#event-dialog[open]'))`)) throw new Error('Esc dismissed the opening dialog');
    // The first button is Continue, then the practice bout is fought by
    // attacking until it ends.
    await until('the sword fight', `${dialogTitle} === 'Sword fight' || (document.querySelector('#event-dialog[open] button')?.click(), false)`);
    await screenshot(`${viewport.name}-opening-duel`);
    await clickButton('Draw your sword');
    await evaluate(`dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })), true`);
    await until('the end of the bout', `Boolean(document.querySelector('#event-dialog[open]'))`, 90000);
    await evaluate(`dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' })), true`);
    await until('the briefing', `${dialogTitle} === 'The sailing master' || (document.querySelector('#event-dialog[open] button')?.click(), false)`);
    await screenshot(`${viewport.name}-briefing`);
    await until('the starting town', `${dialogKicker}?.endsWith(' port') || (document.querySelector('#event-dialog[open] button')?.click(), false)`);
    const startTown = await evaluate(dialogTitle);
    await screenshot(`${viewport.name}-start-town`);
    await clickButton('Put to sea');
    await until('the ship at sea', `!document.querySelector('#event-dialog[open]') && !document.querySelector('#hud').classList.contains('hidden')`);
    await evaluate(`localStorage.clear()`);
    console.log(`${viewport.name}: the career opened in ${startTown} and put to sea.`);

    // Declining to disembark turns the ship round and puts it back aboard.
    await open('landing');
    await until('the disembark prompt', `${dialogTitle} === 'Disembark?'`);
    await press('n');
    await until('the ship turned round', `!${S}.player.onFoot && ${S}.player.heading === 128 && !${S}.paused`);

    // Land: the ship sails onto the Panama coast and asks to disembark.
    await open('landing');
    await until('the disembark prompt', `${dialogTitle} === 'Disembark?'`);
    await press('y');
    await until('the party ashore', `${S}.player.onFoot && !${S}.paused`);
    const ashore = await evaluate(`({ ship: ${S}.player.ship, landing: ${S}.player.landing, label: document.querySelector('[data-hold="left"]').getAttribute('aria-label') })`);
    if (ashore.label !== 'Walk west') throw new Error(`${viewport.name}: on-foot controls not relabelled (${ashore.label})`);
    if (ashore.ship.y <= ashore.landing.y) throw new Error(`${viewport.name}: the ship should wait south of the landing spot`);
    await screenshot(`${viewport.name}-ashore`);

    // Every direction button lights while held, by pointer or by its arrow key.
    const directionButtons = { west: '[data-hold="left"]', east: '[data-hold="right"]', north: '#raise-sails-button', south: '#lower-sails-button' };
    const arrows = { west: 'ArrowLeft', east: 'ArrowRight', north: 'ArrowUp', south: 'ArrowDown' };
    // Walking persists after release, so put the party back where it stood.
    await evaluate(`window.__party = { x: ${S}.player.x, y: ${S}.player.y, walk: { ...${S}.player.walk } }, true`);
    for (const [direction, selector] of Object.entries(directionButtons)) {
      const lit = `document.querySelector('${selector}').classList.contains('pressed')`;
      await evaluate(`document.querySelector('${selector}').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), true`);
      await until(`the ${direction} button lit by pointer`, lit);
      await evaluate(`document.querySelector('${selector}').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })), true`);
      await until(`the ${direction} button released`, `!${lit}`);
      await evaluate(`dispatchEvent(new KeyboardEvent('keydown', { key: '${arrows[direction]}' })), true`);
      await until(`the ${direction} button lit by key`, lit);
      await evaluate(`dispatchEvent(new KeyboardEvent('keyup', { key: '${arrows[direction]}' })), true`);
      await until(`the ${direction} button released by key`, `!${lit}`);
      await evaluate(`Object.assign(${S}.player, window.__party), true`);
    }
    if (!await evaluate(`${S}.player.onFoot`)) throw new Error(`${viewport.name}: testing the direction buttons put the party back aboard`);

    // Walk west into Panama on foot (pointer on the relabelled control).
    const westButton = await evaluate(`(() => { const r = document.querySelector('[data-hold="left"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: westButton.x, y: westButton.y, button: 'left', clickCount: 1 });
    await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: westButton.x, y: westButton.y, button: 'left', clickCount: 1 });
    await press('t');
    await until('the approach to Panama', `${dialogTitle} === 'Panama' && [...document.querySelectorAll('#dialog-actions button')].some((b) => b.textContent === 'March into town')`, 30000);
    await clickButton('Leave town');
    await until('the party outside Panama', `${S}.player.onFoot && !${S}.paused && Math.floor(${S}.player.x) === ${S}.towns.find((t) => t.name === 'Panama').x`);

    // Walking into water away from the boat is blocked, and the HUD says so.
    await evaluate(`Object.assign(${S}.player, { x: 322.5, y: 441.7 })`);
    await press('s');
    await until('the search prompt from S', `${dialogTitle} === 'Search for treasure?'`);
    await clickButton('Keep walking');
    await press('ArrowDown');
    await until('the blocked warning', `${S}.player.blockedByWater && document.querySelector('#speed-label').textContent.includes('Blocked')`);
    await screenshot(`${viewport.name}-blocked`);
    await press('w');
    await until('walking north again', `!${S}.player.blockedByWater && ${S}.player.walk.y < 0`);

    // Walk back to the boat: stand just north of the landing spot and walk south.
    await evaluate(`Object.assign(${S}.player, { x: ${S}.player.landing.x, y: ${S}.player.landing.y - .2 })`);
    await press('ArrowDown');
    await until('the party back aboard', `!${S}.player.onFoot && ${S}.player.heading === 128 && ${S}.player.speed <= 6`);
    console.log(`${viewport.name}: landed, walked into Panama, left on foot and re-boarded at the landing spot.`);

    // Dig with three pieces of a buried-treasure map.
    await open('dig');
    await until('the dig preview ashore', `${S}.player.onFoot && !${S}.paused`);
    await press('m');
    await until('the treasure map', `${dialogTitle} === 'Pirate treasure map' && document.querySelector('.treasure-map img')?.alt.includes('3 of 4')`);
    await screenshot(`${viewport.name}-map`);
    await clickButton('Done');
    const goldBefore = await evaluate(`${S}.player.partyGold`);
    await until('dig controls', `!document.querySelector('#dock-button').disabled`);
    await evaluate(`document.querySelector('#dock-button').click()`);
    await until('the search prompt', `${dialogTitle} === 'Search for treasure?'`);
    await press('s');
    await until('the treasure', `${dialogTitle} === 'Treasure!'`);
    const found = await evaluate(`${S}.player.partyGold`) - goldBefore;
    if (found < 5000 || found > 13000) throw new Error(`${viewport.name}: buried treasure paid ${found}`);
    if (await evaluate(`${S}.treasureMaps[0].pieces`) !== 0) throw new Error(`${viewport.name}: the found map was not cleared`);
    await clickButton('Continue');
    await until('the search ended', `!${S}.paused`);
    await press('s');
    await until('the second search prompt', `${dialogTitle} === 'Search for treasure?'`);
    await clickButton('Dig here');
    await until('an empty dig', `${dialogTitle} === 'Nothing here'`);
    await clickButton('Continue');
    console.log(`${viewport.name}: studied the map, dug up ${found} gold, then found nothing.`);

    // A frigate over the shallows is wrecked; the sloop sails on.
    await open('reef');
    await until('the reef wreck', `${dialogTitle} === 'The Frigate is lost'`);
    const fleet = await evaluate(`({ ships: ${S}.player.ships.map((s) => s.type), crew: ${S}.player.crew })`);
    if (fleet.ships.join() !== 'Sloop' || fleet.crew > 96) throw new Error(`${viewport.name}: reef left ${JSON.stringify(fleet)}`);
    await screenshot(`${viewport.name}-reef`);
    await clickButton('Continue');
    console.log(`${viewport.name}: the reef wrecked the frigate; ${fleet.crew} men fit in the sloop.`);
  }
});
