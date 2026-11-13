// Browser smoke check for the sea chart: it opens full screen over a paused
// voyage, the gazetteer finds and filters towns, a picked town shows its
// figures and course, a click on the chart picks a town, and the chart closes
// back to the voyage or the logbook, at a desktop and a narrow viewport
// (local ?preview=chart).
import { S, VIEWPORTS, delay, dialogTitle, withBrowser } from './browser-harness.mjs';

await withBrowser({ name: 'chart', portOffset: 7, screenshotEnv: 'CHART_SCREENSHOTS' }, async ({ evaluate, until, press, click, screenshot, navigate, setViewport }) => {
  const chartOpen = `!document.querySelector('#sea-chart').classList.contains('hidden')`;
  const detailTitle = `document.querySelector('#chart-detail:not(.hidden) h3')?.textContent`;
  const listNames = `[...document.querySelectorAll('#chart-towns button b')].map((b) => b.textContent)`;
  const visible = (selector) => `getComputedStyle(document.querySelector(${JSON.stringify(selector)})).display !== 'none'`;
  // Throws `${where}: ${message}` when `failed` holds.
  const failIf = (failed, where, message) => {
    if (failed) throw new Error(`${where}: ${message}`);
  };

  for (const viewport of VIEWPORTS) {
    const where = viewport.name;
    await setViewport(viewport);
    await evaluate(`localStorage.clear(), true`).catch(() => {});
    await navigate(`/?preview=chart`);
    await until('the chart', `${S}?.mode === 'sailing' && ${chartOpen}`);
    failIf(!await evaluate(`${S}.paused`), where, 'the voyage runs under the chart');
    const rect = await evaluate(`(() => { const r = document.querySelector('#sea-chart').getBoundingClientRect(); return [r.width, r.height]; })()`);
    failIf(rect[0] !== viewport.width || rect[1] !== viewport.height, where, `the chart is ${rect} rather than full screen`);
    failIf(await evaluate(`${listNames}.length`) !== await evaluate(`${S}.towns.length`), where, 'the gazetteer does not list every town');
    await screenshot(`${where}-chart`);

    // Search, then Enter picks the first match.
    await evaluate(`(() => { const input = document.querySelector('#chart-search'); input.focus(); input.value = 'havan'; input.dispatchEvent(new Event('input')); return true; })()`);
    const found = await evaluate(listNames);
    failIf(JSON.stringify(found) !== '["Havana"]', where, `search found ${found}`);
    await press('Enter');
    await until('Havana picked', `${detailTitle} === 'Havana'`);
    const detail = await evaluate(`document.querySelector('#chart-detail').textContent`);
    failIf(!/From your ship: \d+ cells to the [NSEW]+\./.test(detail), where, `no course in: ${detail}`);
    failIf(!/Treasury|no information|obsolete/i.test(detail), where, `no town figures in: ${detail}`);
    await screenshot(`${where}-havana`);
    failIf(viewport.mobile && await evaluate(visible('#chart-gazetteer')), where, 'the list still covers the picked town');
    await evaluate(`[...document.querySelectorAll('#chart-detail button')].find((b) => b.textContent === 'All towns').click(), true`);
    failIf(!await evaluate(visible('#chart-gazetteer')) || await evaluate(`Boolean(${detailTitle})`), where, '"All towns" does not bring the list back');

    // The flag filter keeps only that nation's towns.
    await evaluate(`(() => { const input = document.querySelector('#chart-search'); input.value = ''; input.dispatchEvent(new Event('input')); return true; })()`);
    await evaluate(`document.querySelector('#chart-nations [data-nation="Holland"]').click(), true`);
    const dutch = await evaluate(`${S}.towns.filter((town) => town.nation === 'Holland').map((town) => town.name).sort((a, b) => a.localeCompare(b))`);
    const filtered = await evaluate(listNames);
    failIf(JSON.stringify(filtered) !== JSON.stringify(dutch), where, `the Holland filter lists ${filtered}`);
    await evaluate(`document.querySelector('#chart-nations [data-nation="Holland"]').click(), true`);

    // A click on a town's marker picks it: Port Royale stands alone on Jamaica.
    await evaluate(`document.querySelector('[data-zoom="fit"]').click(), true`);
    const target = await evaluate(`(() => {
      const town = ${S}.towns.find(({ name }) => name === 'Port Royale');
      const canvas = document.querySelector('#chart-canvas');
      const r = canvas.getBoundingClientRect();
      const border = 6;
      const scale = Math.min(r.width / (640 + border * 2), r.height / (480 + border * 2));
      const left = r.left + (r.width - (640 + border * 2) * scale) / 2;
      const top = r.top + (r.height - (480 + border * 2) * scale) / 2;
      return [left + (town.x + .5 + border) * scale, top + (town.y + .5 + border) * scale - 3];
    })()`);
    await click(...target);
    await until('a town picked on the chart', `${detailTitle} === 'Port Royale'`);
    await screenshot(`${where}-port-royale`);

    // Escape closes the chart and the voyage carries on.
    await evaluate(`document.activeElement?.blur(), true`);
    await press('Escape');
    await until('the chart closed', `!(${chartOpen})`);
    failIf(await evaluate(`${S}.paused`), where, 'the voyage stays paused after the chart');
    // C opens it (without typing into the search, which a fine pointer
    // focuses) and C closes it again.
    // Headless Chromium has no fine pointer and cannot emulate one, so the
    // page's matchMedia answers for it.
    await evaluate(`(() => { const real = matchMedia.bind(window); window.matchMedia = (query) => query === '(pointer: fine)' ? { matches: true } : real(query); return true; })()`);
    await press('c');
    await until('the chart from C', chartOpen);
    failIf(await evaluate(`document.activeElement?.id`) !== 'chart-search', where, 'the search does not take focus');
    failIf(await evaluate(`document.querySelector('#chart-search').value`) !== '', where, 'C typed into the search');
    // The voyage underneath takes neither focus nor keys.
    failIf(!await evaluate(`document.querySelector('#controls').inert && document.querySelector('#event-dialog').inert`), where, 'the page under the chart is not inert');
    await evaluate(`document.querySelector('#pause-button').click(), true`);
    failIf(!await evaluate(`${S}.paused`), where, 'the voyage unpaused under the chart');
    await evaluate(`document.activeElement?.blur(), true`);
    await press('c');
    await delay(200);
    failIf(await evaluate(chartOpen), where, 'C does not close the chart');

    // From the logbook, closing the chart returns to the logbook.
    await evaluate(`document.querySelector('#logbook-button').click(), true`);
    await until('the logbook', `${dialogTitle} === 'The captain’s logbook'`);
    await evaluate(`[...document.querySelectorAll('#dialog-actions button')].find((b) => b.textContent === 'Sea chart').click(), true`);
    await until('the chart from the logbook', chartOpen);
    await evaluate(`document.querySelector('#chart-close').click(), true`);
    await until('back to the logbook', `${dialogTitle} === 'The captain’s logbook'`);
    // C and L still type into the start screen's captain name.
    await navigate(`/`);
    // The begin button enables once the game script and its data are loaded.
    await until('the start screen', `document.querySelector('#new-game-form button[type="submit"]')?.disabled === false`);
    await evaluate(`(() => { const input = document.querySelector('#captain-name'); input.value = ''; input.focus(); return true; })()`);
    for (const key of 'calico jack') await press(key);
    const typed = await evaluate(`document.querySelector('#captain-name').value`);
    failIf(typed !== 'calico jack', where, `the captain's name reads "${typed}"`);
    console.log(`${where}: the chart opens full screen, finds, filters and picks towns, and closes back to the voyage and the logbook.`);
  }
});
