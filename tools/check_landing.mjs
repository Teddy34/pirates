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
    const vignetteLabel = "document.querySelector('#dialog-vignette canvas')?.getAttribute('aria-label') ?? ''";
    await until('the sword-fight art', `${vignetteLabel}.includes('cross curved swords')`);
    await screenshot(`${viewport.name}-opening-duel`);
    await clickButton('Draw your sword');
    await evaluate(`dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })), true`);
    await until('the end of the bout', `Boolean(document.querySelector('#event-dialog[open]'))`, 90000);
    await evaluate(`dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' })), true`);
    await until('the briefing', `${dialogTitle} === 'The sailing master' || (document.querySelector('#event-dialog[open] button')?.click(), false)`);
    await until('the sailing master art', `${vignetteLabel}.includes('grey-bearded sailing master')`);
    await screenshot(`${viewport.name}-briefing`);
    await until('the starting town', `${dialogKicker}?.endsWith(' port') || (document.querySelector('#event-dialog[open] button')?.click(), false)`);
    const startTown = await evaluate(dialogTitle);
    await screenshot(`${viewport.name}-start-town`);
    await clickButton('Put to sea');
    await until('the ship at sea', `!document.querySelector('#event-dialog[open]') && !document.querySelector('#hud').classList.contains('hidden')`);
    await evaluate(`localStorage.clear()`);
    console.log(`${viewport.name}: the career opened in ${startTown} and put to sea.`);

    // The controls under the map are icon-only pixel buttons with a name and
    // a tooltip, all on screen, and the HUD has no speed readout (#136).
    const controlProblems = await evaluate(`[...document.querySelectorAll('#controls button')].flatMap((button) => {
      const icon = button.querySelector('img.action-icon');
      const r = button.getBoundingClientRect();
      const problems = [];
      if (!icon?.src.startsWith('data:image/png') || !icon.complete || !icon.naturalWidth) problems.push('no icon');
      if (button.textContent.trim()) problems.push('visible text');
      if (!button.getAttribute('aria-label') || !button.title) problems.push('no name or tooltip');
      if (r.left < 0 || r.right > innerWidth || r.bottom > innerHeight || r.width < 44 || r.height < 44) problems.push('off screen or too small');
      return problems.map((problem) => (button.id || button.dataset.hold) + ': ' + problem);
    }).concat(document.querySelector('#speed-label') ? ['the speed readout is still shown'] : [])`);
    if (controlProblems.length) throw new Error(`${viewport.name}: ${controlProblems.join('; ')}`);
    const pauseNames = await evaluate(`(() => { const b = document.querySelector('#pause-button'); const src = b.querySelector('img').src; b.click(); const paused = [b.getAttribute('aria-label'), b.querySelector('img').src !== src]; b.click(); return [...paused, b.getAttribute('aria-label'), b.querySelector('img').src === src]; })()`);
    if (pauseNames.join() !== 'Resume,true,Pause,true') throw new Error(`${viewport.name}: the pause control does not swap its icon (${pauseNames})`);
    await screenshot(`${viewport.name}-controls`);

    // The shore stops the ship without a prompt; turning away sails on.
    await open('landing');
    await until('the ship stopped by the shore', `${S}.player.aground && !${S}.paused && !document.querySelector('#event-dialog[open]')`);
    const landControl = await evaluate(`({ label: document.querySelector('#dock-button').getAttribute('aria-label'), disabled: document.querySelector('#dock-button').disabled })`);
    if (landControl.label !== 'Land a party ashore' || landControl.disabled) throw new Error(`${viewport.name}: no Land control against the shore (${JSON.stringify(landControl)})`);
    await screenshot(`${viewport.name}-aground`);
    await evaluate(`Object.assign(${S}.player, { heading: 128 }), true`);
    await until('the ship sailing away', `!${S}.player.aground && !${S}.player.onFoot`);

    // Land: the ship sails onto the Panama coast and G puts a party ashore.
    await open('landing');
    await until('the ship stopped by the shore', `${S}.player.aground && !${S}.paused`);
    await press('g');
    await until('the party ashore', `${S}.player.onFoot && !${S}.paused`);
    const ashore = await evaluate(`({ ship: ${S}.player.ship, landing: ${S}.player.landing, label: document.querySelector('[data-hold="left"]').getAttribute('aria-label') })`);
    if (ashore.label !== 'Walk west') throw new Error(`${viewport.name}: on-foot controls not relabelled (${ashore.label})`);
    if (ashore.ship.y <= ashore.landing.y) throw new Error(`${viewport.name}: the ship should wait south of the landing spot`);
    await screenshot(`${viewport.name}-ashore`);

    // Running ashore beside a town's trigger cells enters the town.
    await open('shore-town');
    await until('the approach to Port Royale', `${dialogTitle} === 'Port Royale'`, 30000);
    await open('landing');
    await until('the ship stopped by the shore', `${S}.player.aground && !${S}.paused`);
    await evaluate(`document.querySelector('#dock-button').click(), true`);
    await until('the party ashore by the Land control', `${S}.player.onFoot && !${S}.paused`);

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

    // Walking into water away from the boat is blocked, and the log says so.
    await evaluate(`Object.assign(${S}.player, { x: 322.5, y: 441.7 })`);
    await press('s');
    await until('the search prompt from S', `${dialogTitle} === 'Search for treasure?'`);
    await clickButton('Keep walking');
    await press('ArrowDown');
    await until('the blocked warning', `${S}.player.blockedByWater && document.querySelector('#log').textContent.includes('Water blocks the party')`);
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
