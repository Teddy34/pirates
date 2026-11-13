// Browser smoke check for the sea, capture, captivity, assault, battle-end,
// retirement and hall-of-fame scene pictures: each dialog shows its picture and fits the viewport, at a desktop
// and a narrow size (local ?preview= states).
import { S, VIEWPORTS, dialogTitle, withBrowser } from './browser-harness.mjs';

await withBrowser({ name: 'vignettes', portOffset: 4, screenshotEnv: 'VIGNETTE_SCREENSHOTS' }, async ({ evaluate, until, clickButton, screenshot, open, setViewport }) => {

  const expectPicture = async (where, description) => {
    const shown = await evaluate(`({
      label: document.querySelector('#dialog-vignette canvas').getAttribute('aria-label'),
      hidden: document.querySelector('#dialog-vignette').classList.contains('hidden'),
      // The dialog scrolls vertically by design, so check what must not: the
      // picture inside its width, and no sideways overflow.
      fits: document.querySelector('#dialog-vignette canvas').getBoundingClientRect().right <= document.querySelector('#event-dialog').getBoundingClientRect().right,
      inside: document.querySelector('#event-dialog').scrollWidth <= document.querySelector('#event-dialog').clientWidth,
    })`);
    if (shown.hidden || !shown.label.includes(description)) throw new Error(`${where}: picture "${description}" not shown: ${shown.label}`);
    if (!shown.fits || !shown.inside) throw new Error(`${where}: the dialog overflows sideways`);
  };

  const scenes = [
    ['sail-ho', 'tiny sail'],
    ['boarding', 'Two ships grind'],
    ['hostage-talks', 'bound enemy captain'],
    ['crew-recruits', 'names in the articles'],
    ['treasure-fleet-capture', 'beaten royal galleon'],
    ['silver-train-capture', 'broken mule train'],
    ['mutiny', 'armed crew'],
    ['prison', 'stone cell'],
    ['hall-of-fame', 'empty frame'],
    ['alley-duel', 'moonlit alley'],
    ['retire-1', 'seaside cottage'],
    ['retire-2', 'plantation veranda'],
    ['retire-3', 'former flagship'],
    ['retire-4', 'beside the king'],
    ['land-attack', 'palisade'],
    ['fort-walls', 'ramparts'],
    ['sinking', 'settles by the stern'],
    ['outrun', 'last shot falls short'],
    ['nightfall', 'night ends the chase'],
  ];
  for (const viewport of VIEWPORTS) {
    await setViewport(viewport);
    for (const [preview, description] of scenes) {
      await open(preview);
      await expectPicture(`${viewport.name} ${preview}`, description);
      await screenshot(`${viewport.name}-${preview}`);
    }

    // The follow-up dialog of each flow keeps its picture.
    await open('prison');
    await clickButton('Continue');
    await until('the months in prison', `${dialogTitle}?.endsWith('months pass')`);
    await expectPicture(`${viewport.name} release`, 'stone cell');
    await open('hostage-talks');
    await clickButton('Ask about the treasure fleet');
    await until('the prisoner\'s report', `${dialogTitle} !== 'The Spain captain yields'`);
    await expectPicture(`${viewport.name} report`, 'bound enemy captain');
    await open('hall-of-fame');
    await clickButton('Yes');
    await until('the record', `document.querySelector('#dialog-body .hall-of-fame')`);
    await evaluate(`document.querySelector('#dialog-actions button').scrollIntoView()`);
    if (!await evaluate(`document.querySelector('#dialog-actions button').getBoundingClientRect().bottom <= innerHeight`)) throw new Error(`${viewport.name}: the record's Continue cannot be reached`);
    await expectPicture(`${viewport.name} record`, 'empty frame');
    // Your last ship sinking goes on to the island, and an escape returns to
    // the map.
    await open('sinking');
    await clickButton('Continue');
    await until('the island', `${dialogTitle} === 'Washed ashore'`);
    await open('outrun');
    if (await evaluate(`${dialogTitle}`) !== 'The Merchantman escapes') throw new Error(`${viewport.name}: the fleeing enemy's escape has the wrong title`);
    await clickButton('Continue');
    await until('the map', `!document.querySelector('#event-dialog[open]') && ${S}.mode === 'sailing'`);
    console.log(`${viewport.name}: all ${scenes.length} scene pictures show and fit.`);
  }
});
