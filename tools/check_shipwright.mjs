// Browser smoke check for the shipwright's yard: one screen lists every ship
// with its hold and guns, and repairs, sales and cannon all happen in place,
// at a desktop and a narrow viewport. The buttons hold still between clicks
// (issue #118). Uses the local ?preview=sell-ship state
// (a sound ship and a damaged Merchantman whose hold the cargo needs).
import { S, VIEWPORTS, delay, dialogTitle, withBrowser } from './browser-harness.mjs';

await withBrowser({ name: 'shipwright', portOffset: 8, screenshotEnv: 'SHIPWRIGHT_SCREENSHOTS' }, async ({ command, evaluate, until, clickButton, screenshot, open, setViewport }) => {
  const yardTitle = 'What business brings you to the yard?';
  const inYard = `${dialogTitle} === ${JSON.stringify(yardTitle)}`;
  const rows = `[...document.querySelectorAll('.shipwright-manifest tbody tr')].map((row) => [...row.children].map((cell) => cell.textContent.trim()))`;
  const clickTransfer = (transfer, kind = '') => evaluate(`(() => {
    const button = document.querySelector('[data-transfer="${transfer}"][data-kind="${kind}"]');
    if (!button || button.disabled) throw new Error('no enabled ${transfer} ${kind} button');
    button.click();
    return true;
  })()`);

  for (const viewport of VIEWPORTS) {
    await setViewport(viewport);
    await open('sell-ship', inYard);
    await evaluate(`Object.assign(${S}.player, { partyGold: 5000, cannon: 30, crew: 100 }), true`);
    // Re-render with the new purse: any in-place action redraws the yard.
    await evaluate(`document.querySelector('#dialog-actions button').click(), true`);
    await until('the town menu', `${dialogTitle} !== ${JSON.stringify(yardTitle)}`);
    await clickButton('Shipwright');
    await until('the yard', inYard);
    const fleet = await evaluate(rows);
    if (fleet.length !== 3) throw new Error(`${viewport.name}: expected two ships and the cannon row, got ${JSON.stringify(fleet)}`);
    const [flagship, merchantman, cannonRow] = fleet;
    if (!merchantman[0].startsWith('Merchantman') || merchantman[1] !== '100 t') throw new Error(`${viewport.name}: the Merchantman's hold is not shown: ${merchantman}`);
    // The flagship shows the guns she takes into battle: eight hands stay on
    // the Merchantman, and a gun needs four men (embarkedForBattle).
    const flagshipPorts = Number(flagship[2].split(' / ')[1]);
    const flagshipMen = Math.min(100 - 8, 8 * flagshipPorts);
    if (flagship[2] !== `${Math.min(30, Math.floor(flagshipMen / 4), flagshipPorts)} / ${flagshipPorts}`) throw new Error(`${viewport.name}: the flagship does not show her battle guns: ${flagship}`);
    if (cannonRow[0] !== 'Cannon' || cannonRow[2] !== `30 / ${Number(flagship[2].split(' / ')[1]) + 24}`) throw new Error(`${viewport.name}: wrong cannon row: ${cannonRow}`);
    await screenshot(`${viewport.name}-yard`);

    // The yard redraws in place, so the Sell buttons stay under the pointer
    // click after click (issue #118), even with the page scrolled and with the
    // first action's note appearing above the table.
    const cannonButton = () => evaluate(`(() => { const r = document.querySelector('[data-transfer="sell-cannon"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    const box = (selector) => evaluate(`(() => { const r = document.querySelector('${selector}')?.getBoundingClientRect(); return r ? [r.x, r.y, r.width, r.height].map(Math.round).join() : 'missing'; })()`);
    const steady = async (what, selector, before) => {
      const after = await box(selector);
      if (after !== before) throw new Error(`${viewport.name}: ${what} moved from ${before} to ${after}`);
    };
    await evaluate(`(() => { for (const element of [document.querySelector('#event-dialog'), document.querySelector('.dialog-text')]) element.scrollTop = 60; return true; })()`);
    const sellOne = await box('[data-transfer="sell-cannon"]');
    const sellAll = await box('[data-transfer="sell-cannon-all"]');

    // Repairing stays in the yard.
    const goldBefore = await evaluate(`${S}.player.partyGold`);
    await clickTransfer('repair', '1');
    await until('the repaired Merchantman', `${inYard} && ${S}.player.ships[1].damage === 0`);
    if (await evaluate(`${S}.player.partyGold`) >= goldBefore) throw new Error(`${viewport.name}: the repair was free`);
    if (!await evaluate(`document.querySelector('.shipwright-note')?.textContent.startsWith('Repaired the Merchantman')`)) throw new Error(`${viewport.name}: no note of the repair`);
    await steady('the Sell 1 cannon button after a repair', '[data-transfer="sell-cannon"]', sellOne);

    // Cannon: one click sells one, holding sells more, and the yard stays open.
    let point = await cannonButton();
    for (const left of [29, 28]) {
      await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
      await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
      await until(`${30 - left} cannon sold`, `${inYard} && ${S}.player.cannon === ${left}`);
      await steady('the Sell 1 cannon button', '[data-transfer="sell-cannon"]', sellOne);
      await steady('the Sell-all cannon button', '[data-transfer="sell-cannon-all"]', sellAll);
    }
    point = await cannonButton();
    await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await delay(650);
    await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await delay(150);
    const held = await evaluate(`${S}.player.cannon`);
    if (held >= 27) throw new Error(`${viewport.name}: holding sold too few cannon (${held} left)`);
    await steady('the Sell 1 cannon button after holding', '[data-transfer="sell-cannon"]', sellOne);
    await clickTransfer('sell-cannon-all');
    await until('all spare cannon sold', `${inYard} && ${S}.player.cannon === 1`);
    if (!await evaluate(`document.querySelector('[data-transfer="sell-cannon"]').disabled`)) throw new Error(`${viewport.name}: the last cannon is still for sale`);
    if (!await evaluate(`document.querySelector('[data-transfer="sell-cannon-all"]')?.disabled`)) throw new Error(`${viewport.name}: the Sell-all button left or stayed enabled with no cannon to spare`);
    await steady('the Sell 1 cannon button with none to spare', '[data-transfer="sell-cannon"]', sellOne);
    // With nothing left to repair or sell, focus must not fall onto a Sell-ship
    // button, where a held Enter would sell ships unasked.
    const focused = await evaluate(`document.activeElement?.dataset.transfer ?? document.activeElement?.textContent`);
    if (focused === 'sell-ship') throw new Error(`${viewport.name}: focus fell onto a Sell-ship button`);
    if (!await evaluate(`document.querySelector('.shipwright-refusals')?.textContent.includes('only cannon')`)) throw new Error(`${viewport.name}: the refusal for the last cannon is not shown`);
    // Leaving logs the cannon sold during the visit once.
    await clickButton('Part company');
    await until('the town menu', `${dialogTitle} !== ${JSON.stringify(yardTitle)}`);
    const cannonLogs = await evaluate(`${S}.logs.filter((line) => line.includes('cannon'))`);
    if (cannonLogs.length !== 1 || !cannonLogs[0].startsWith('Sold 29 cannon')) throw new Error(`${viewport.name}: wrong cannon log ${JSON.stringify(cannonLogs)}`);
    await clickButton('Shipwright');
    await until('the yard', inYard);

    // Selling a ship leaves a Sold row in her place, so the rows below stay put.
    await evaluate(`${S}.player.ships.push({ type: 'Sloop', damage: 0 }), true`);
    await clickButton('Part company');
    await until('the town menu', `${dialogTitle} !== ${JSON.stringify(yardTitle)}`);
    await clickButton('Shipwright');
    await until('the yard', inYard);
    const cannonRowBox = await box('.shipwright-cannon');
    await clickTransfer('sell-ship', '2');
    await until('the Sloop sold', `${inYard} && ${S}.player.ships.length === 2`);
    await steady('the cannon row after a ship sale', '.shipwright-cannon', cannonRowBox);
    const soldRow = await evaluate(`[...document.querySelectorAll('.shipwright-manifest tbody tr')].findIndex((row) => row.classList.contains('shipwright-sold'))`);
    if (soldRow !== 2) throw new Error(`${viewport.name}: the Sold row is at ${soldRow}, not where the Sloop stood`);

    // Selling the Merchantman warns about her hold, then returns to the yard.
    await clickTransfer('sell-ship', '1');
    await until('the hold warning', `${dialogTitle} === 'Not enough hold'`);
    await clickButton('Keep her');
    await until('the yard again', inYard);
    await clickTransfer('sell-ship', '1');
    await until('the hold warning', `${dialogTitle} === 'Not enough hold'`);
    await clickButton('Sell her');
    await until('the overboard screen or the yard', `${S}.player.ships.length === 1`);
    if (await evaluate(`${inYard}`) && await evaluate(`[...document.querySelectorAll('.shipwright-sold th')].map((cell) => cell.textContent).join()`) !== 'Merchantman,Sloop') throw new Error(`${viewport.name}: wrong Sold rows after two sales`);
    await screenshot(`${viewport.name}-after-sale`);
    console.log(`${viewport.name}: repaired, sold cannon one by one, by holding and all at once, and sold a ship without leaving the yard.`);
  }
});
