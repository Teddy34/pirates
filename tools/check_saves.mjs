// Save slots (issue #87) and resuming a voyage saved in a town (issue #86).
// `?preview=start-screen` names no preview: the start screen shows, with the
// live state still exposed to the check.
import { S, VIEWPORTS, dialogTitle, withBrowser } from './browser-harness.mjs';

await withBrowser({ name: 'saves', portOffset: 9, screenshotEnv: 'SAVE_SCREENSHOTS' }, async ({ evaluate, until, clickButton, screenshot, navigate, open, setViewport }) => {
  const slotSaved = (slot) => `Boolean(localStorage.getItem('fortune-and-freedom-slot-${slot}'))`;
  const visible = (id) => `(() => { const b = document.querySelector('#${id}'); return Boolean(b && !b.classList.contains('hidden') && b.getBoundingClientRect().width > 0); })()`;
  const townMenu = `${S}?.mode === 'town' && Boolean(${dialogTitle}) && [...document.querySelectorAll('#dialog-actions button')].some((b) => b.textContent === 'Save voyage')`;
  const guadeloupe = `${S}.towns.findIndex((town) => town.name === 'Guadeloupe')`;

  await setViewport(VIEWPORTS[0]);
  await open('in-port', townMenu);
  await evaluate('localStorage.clear(), true');

  // An empty slot saves at once and returns to the town menu.
  await clickButton('Save voyage');
  await until('the slot list', `${dialogTitle} === 'Choose a save slot'`);
  if (await evaluate("document.querySelectorAll('#dialog-actions button').length") !== 11) throw new Error('expected 10 slots and Back');
  await clickButton('1 · Empty');
  await until('the town menu after saving', townMenu);
  if (!await evaluate(slotSaved(1))) throw new Error('slot 1 was not written');
  if (!await evaluate("Boolean(localStorage.getItem('fortune-and-freedom-save-v5'))")) throw new Error('saving to a slot did not refresh the autosave');

  // A used slot asks before overwriting.
  await clickButton('Save voyage');
  await until('the slot list', `${dialogTitle} === 'Choose a save slot'`);
  await clickButton('1 · ');
  await until('the overwrite question', `${dialogTitle} === 'Overwrite slot 1?'`);
  await clickButton('Overwrite');
  await until('the town menu after overwriting', townMenu);
  await clickButton('Save voyage');
  await until('the slot list', `${dialogTitle} === 'Choose a save slot'`);
  await clickButton('3 · Empty');
  await until('the town menu', townMenu);
  if (!await evaluate(slotSaved(3))) throw new Error('slot 3 was not written');
  console.log('Saving: empty slots save at once, used slots ask first, the autosave follows.');

  for (const viewport of VIEWPORTS) {
    await setViewport(viewport);
    // Loading a slot saved in port reopens that town's menu (#86).
    await navigate('/?preview=start-screen');
    await until('the Load a voyage button', visible('load-slot-button'));
    if (!await evaluate(visible('continue-button'))) throw new Error(`${viewport.name}: Continue is hidden`);
    await screenshot(`start-${viewport.name}`);
    await evaluate("document.querySelector('#load-slot-button').click(), true");
    await until('the load list', `${dialogTitle} === 'Load a voyage'`);
    await screenshot(`load-${viewport.name}`);
    await clickButton('1 · ');
    await until(`${viewport.name}: the town menu after loading slot 1`, townMenu);
    if (await evaluate(`${S}.visit.townIndex !== ${guadeloupe}`)) throw new Error('loaded into the wrong town');

    // Continue resumes the autosave, also in port.
    await navigate('/?preview=start-screen');
    await until('the Continue button', visible('continue-button'));
    await evaluate("document.querySelector('#continue-button').click(), true");
    await until(`${viewport.name}: the town menu after Continue`, townMenu);
    console.log(`${viewport.name}: loading a slot or the autosave saved in port reopens the town menu.`);
  }

  // Deleting a slot asks first and leaves the others.
  await navigate('/?preview=start-screen');
  await until('the Load a voyage button', visible('load-slot-button'));
  await evaluate("document.querySelector('#load-slot-button').click(), true");
  await until('the load list', `${dialogTitle} === 'Load a voyage'`);
  await clickButton('Delete a save');
  await until('the delete list', `${dialogTitle} === 'Delete a save'`);
  await clickButton('Delete 3 · ');
  await until('the delete question', `${dialogTitle} === 'Delete slot 3?'`);
  await clickButton('Delete');
  await until('slot 3 removed', `!${slotSaved(3)}`);
  if (!await evaluate(slotSaved(1))) throw new Error('deleting slot 3 removed slot 1');
  console.log('Deleting: a slot is removed after confirmation; the others stay.');
});
