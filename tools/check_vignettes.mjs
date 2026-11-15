// Browser smoke check for the title screen picture and logo, and for the sea, capture, captivity, assault, battle-end,
// retirement and hall-of-fame scene pictures: each dialog shows its picture and fits the viewport, at a desktop
// and a narrow size (local ?preview= states).
import { S, VIEWPORTS, dialogTitle, withBrowser } from './browser-harness.mjs';

await withBrowser({ name: 'vignettes', portOffset: 4, screenshotEnv: 'VIGNETTE_SCREENSHOTS' }, async ({ evaluate, until, clickButton, screenshot, navigate, open, setViewport, press }) => {

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
    // The title screen: the pixel "Retro" and the ship artwork (once loaded) are painted,
    // the heading reads the whole name, and nothing overflows sideways.
    await navigate('/');
    await until('the title screen', `!document.querySelector('#start-screen')?.classList.contains('hidden') && document.querySelector('#start-screen').clientWidth > 0 && document.querySelector('#title-vignette').getAttribute('aria-label')?.includes('three-masted')`);
    const title = await evaluate(`(() => {
      const colours = (canvas) => {
        const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        const set = new Set();
        for (let i = 0; i < data.length; i += 4) if (data[i + 3]) set.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
        return set.size;
      };
      const panel = document.querySelector('#start-screen');
      return {
        heading: [...document.querySelector('#start-screen h1').childNodes].filter((node) => node.getAttribute?.('aria-hidden') !== 'true').map((node) => node.textContent).join(''),
        visible: !panel.classList.contains('hidden') && panel.clientWidth > 0,
        logo: colours(document.querySelector('#title-retro')),
        picture: colours(document.querySelector('#title-vignette')),
        inside: panel.scrollWidth <= panel.clientWidth,
      };
    })()`);
    if (!title.visible) throw new Error(`${viewport.name}: the title screen is not shown`);
    if (title.heading !== 'RetroPirates!') throw new Error(`${viewport.name}: the title reads "${title.heading}"`);
    if (title.logo < 5 || title.picture < 20) throw new Error(`${viewport.name}: the title art looks blank (${title.logo} and ${title.picture} colours)`);
    if (!title.inside) throw new Error(`${viewport.name}: the title screen overflows sideways`);
    await screenshot(`${viewport.name}-title`);
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
    // The merchant's portrait is his art.
    await open('merchant-family');
    await until('the merchant art', `document.querySelector('#dialog-vignette canvas').getAttribute('aria-label').includes('beaming merchant')`);
    await expectPicture(`${viewport.name} merchant`, 'beaming merchant');
    await screenshot(`${viewport.name}-merchant`);
    // So is the barmaid's.
    await open('barmaid');
    await until('the barmaid art', `document.querySelector('#dialog-vignette canvas').getAttribute('aria-label').includes('winking barmaid')`);
    await expectPicture(`${viewport.name} barmaid`, 'winking barmaid');
    await screenshot(`${viewport.name}-barmaid`);
    // And the bartender's, in the news dialog.
    await open('news');
    await until('the bartender art', `document.querySelector('#dialog-vignette canvas').getAttribute('aria-label').includes('one-eyed tavernkeeper')`);
    await expectPicture(`${viewport.name} bartender`, 'one-eyed tavernkeeper');
    await screenshot(`${viewport.name}-bartender`);
    // The harbour arrival shows its art, the fort flying the town's flag.
    await open('arrival');
    // The buttons carry icons; Enter's default is leaving, never the attack,
    // and the arrows move the focus between the buttons.
    const focused = "document.activeElement?.textContent";
    if (await evaluate(focused) !== 'Leave town') throw new Error(`${viewport.name}: the arrival opens on ${await evaluate(focused)}, not Leave town`);
    if (!await evaluate(`[...document.querySelectorAll('#dialog-actions button')].every((b) => b.querySelector('.action-icon'))`)) throw new Error(`${viewport.name}: an arrival button has no icon`);
    await press('ArrowUp');
    await press('ArrowLeft');
    const moved = await evaluate(focused);
    if (moved === 'Leave town' || !await evaluate(`document.querySelector('#dialog-actions').contains(document.activeElement)`)) throw new Error(`${viewport.name}: the arrows did not move the focus (${moved})`);
    await until('the harbour art', `document.querySelector('#dialog-vignette canvas').getAttribute('aria-label').includes('stone fort flying')`);
    await expectPicture(`${viewport.name} harbour`, 'stone fort flying');
    await screenshot(`${viewport.name}-harbour-arrival`);
    // So does the town menu of a coastal town, from the quay.
    await open('in-port');
    await until('the quay art', `document.querySelector('#dialog-vignette canvas').getAttribute('aria-label').includes('headland fort flying')`);
    await expectPicture(`${viewport.name} quay`, 'headland fort flying');
    await screenshot(`${viewport.name}-port-quay`);
    // The governor's portrait follows the era and the town's nation: the
    // 1680 French preview career's governor, then the gallery of all 24.
    await open('governor-promotion');
    await until('the governor portrait', `document.querySelector('#dialog-vignette canvas').getAttribute('aria-label').includes('period painting')`);
    await expectPicture(`${viewport.name} governor`, 'French governor in the dress of the 1680s');
    await open('governor-portraits');
    const seen = new Set();
    for (let index = 0; index < 24; index += 1) {
      const title = await evaluate(dialogTitle);
      const [nation, era] = title.split(', ');
      const adjective = { Spain: 'Spanish', England: 'English', France: 'French', Holland: 'Dutch' }[nation];
      await until(`${title} portrait`, `document.querySelector('#dialog-vignette canvas').getAttribute('aria-label').includes('period painting')`);
      await expectPicture(`${viewport.name} ${title}`, `${adjective} governor in the dress of the ${era}s`);
      // The cell is drawn, not left blank: sample the picture's pixels.
      const colours = await evaluate(`(() => {
        const canvas = document.querySelector('#dialog-vignette canvas');
        const data = canvas.getContext('2d').getImageData(8, 8, 96, 128).data;
        const set = new Set();
        for (let i = 0; i < data.length; i += 4) set.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
        return set.size;
      })()`);
      if (colours < 12) throw new Error(`${viewport.name} ${title}: the portrait looks blank (${colours} colours)`);
      seen.add(title);
      if (index === 9) await screenshot(`${viewport.name}-governor-portrait`);
      await clickButton('Next');
      await until('the next portrait', `${dialogTitle} !== ${JSON.stringify(title)}`);
    }
    if (seen.size !== 24) throw new Error(`${viewport.name}: the gallery showed ${seen.size} of 24 portraits`);
    console.log(`${viewport.name}: all ${scenes.length} scene pictures and 24 governor portraits show and fit.`);
  }
});
