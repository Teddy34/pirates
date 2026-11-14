// The captain's health (issue #85): the logbook's Personal status page and
// the month-end notice when health worsens.
import { S, VIEWPORTS, dialogTitle, withBrowser } from './browser-harness.mjs';

await withBrowser({ name: 'health', portOffset: 11, screenshotEnv: 'HEALTH_SCREENSHOTS' }, async ({ evaluate, until, clickButton, screenshot, open, setViewport }) => {
  const field = (name) => `[...document.querySelectorAll('#dialog-body dt')].find((dt) => dt.textContent === ${JSON.stringify(name)})?.nextElementSibling.textContent`;
  for (const viewport of VIEWPORTS) {
    await setViewport(viewport);
    await open('in-port', `${S}?.mode === 'town' && Boolean(${dialogTitle})`);

    await clickButton('Logbook');
    await until('the logbook', `${dialogTitle} === 'The captain’s logbook'`);
    await clickButton('Personal status');
    await until('the Personal status page', `${dialogTitle} === 'Personal status'`);
    const health = await evaluate(field('Health'));
    const age = await evaluate(field('Age'));
    if (health !== 'Fine' || age !== '25') throw new Error(`${viewport.name}: a new captain shows age ${age}, health ${health}`);
    await screenshot(`status-${viewport.name}`);

    // Two wounds and three years: (3 + 2) / 3 = 1, good. Nothing is said
    // until the month ends; then the notice shows once.
    await evaluate(`(() => {
      const state = ${S};
      state.player.wounds = 2;
      state.calendar = { ...state.calendar, year: state.calendar.year + 3, day: 29 };
      state.player.voyageTick = 64;
      document.querySelector('#event-dialog').close();
      globalThis.piratesPreview.endVoyage(() => { globalThis.healthCheckDone = true; });
      return true;
    })()`);
    await until(`${viewport.name}: the health notice`, `${dialogTitle} === 'Your health'`);
    const notice = await evaluate("document.querySelector('#dialog-body').textContent");
    if (!notice.includes('good rather than fine')) throw new Error(`${viewport.name}: unexpected notice: ${notice}`);
    if (!await evaluate(`${S}.logs.some((line) => line === 'Your health is now good.')`)) throw new Error(`${viewport.name}: no log line`);
    await screenshot(`notice-${viewport.name}`);
    await clickButton('Continue');
    await until('the voyage to go on', 'globalThis.healthCheckDone === true');

    // The next month end at the same health says nothing.
    await evaluate(`(() => {
      const state = ${S};
      state.calendar = { ...state.calendar, day: 29 };
      state.player.voyageTick = 64;
      globalThis.healthCheckDone = false;
      globalThis.piratesPreview.endVoyage(() => { globalThis.healthCheckDone = true; });
      return true;
    })()`);
    await until('the second month end', 'globalThis.healthCheckDone === true');
    if (await evaluate(`${dialogTitle} === 'Your health'`)) throw new Error(`${viewport.name}: the notice repeated`);
    console.log(`${viewport.name}: Personal status shows age 25, health Fine; the worse health is announced once at month end.`);
  }
});
