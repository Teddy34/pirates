// Browser smoke check for the shipwright's yard: one screen lists every ship
// with its hold and guns, and repairs, sales and cannon all happen in place,
// at a desktop and a narrow viewport. Uses the local ?preview=sell-ship state
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
    await evaluate(`Object.assign(${S}.player, { partyGold: 5000, cannon: 30 }), true`);
    // Re-render with the new purse: any in-place action redraws the yard.
    await evaluate(`document.querySelector('#dialog-actions button').click(), true`);
    await until('the town menu', `${dialogTitle} !== ${JSON.stringify(yardTitle)}`);
    await clickButton('Shipwright');
    await until('the yard', inYard);
    const fleet = await evaluate(rows);
    if (fleet.length !== 3) throw new Error(`${viewport.name}: expected two ships and the cannon row, got ${JSON.stringify(fleet)}`);
    const [flagship, merchantman, cannonRow] = fleet;
    if (!merchantman[0].startsWith('Merchantman') || merchantman[1] !== '100 t') throw new Error(`${viewport.name}: the Merchantman's hold is not shown: ${merchantman}`);
    if (flagship[2] !== `${Math.min(30, Number(flagship[2].split(' / ')[1]))} / ${flagship[2].split(' / ')[1]}`) throw new Error(`${viewport.name}: the flagship's guns are not filled first: ${flagship}`);
    if (cannonRow[0] !== 'Cannon' || cannonRow[2] !== `30 / ${Number(flagship[2].split(' / ')[1]) + 24}`) throw new Error(`${viewport.name}: wrong cannon row: ${cannonRow}`);
    await screenshot(`${viewport.name}-yard`);

    // Repairing stays in the yard.
    const goldBefore = await evaluate(`${S}.player.partyGold`);
    await clickTransfer('repair', '1');
    await until('the repaired Merchantman', `${inYard} && ${S}.player.ships[1].damage === 0`);
    if (await evaluate(`${S}.player.partyGold`) >= goldBefore) throw new Error(`${viewport.name}: the repair was free`);
    if (!await evaluate(`document.querySelector('.shipwright-note')?.textContent.startsWith('Repaired the Merchantman')`)) throw new Error(`${viewport.name}: no note of the repair`);

    // Cannon: one click sells one, holding sells more, and the yard stays open.
    const cannonButton = () => evaluate(`(() => { const r = document.querySelector('[data-transfer="sell-cannon"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    let point = await cannonButton();
    await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await until('one cannon sold', `${inYard} && ${S}.player.cannon === 29`);
    point = await cannonButton();
    await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await delay(650);
    await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await delay(150);
    const held = await evaluate(`${S}.player.cannon`);
    if (held >= 28) throw new Error(`${viewport.name}: holding sold too few cannon (${held} left)`);
    await clickTransfer('sell-cannon-all');
    await until('all spare cannon sold', `${inYard} && ${S}.player.cannon === 1`);
    if (!await evaluate(`document.querySelector('[data-transfer="sell-cannon"]').disabled`)) throw new Error(`${viewport.name}: the last cannon is still for sale`);
    // Leaving logs the cannon sold during the visit once.
    await clickButton('Part company');
    await until('the town menu', `${dialogTitle} !== ${JSON.stringify(yardTitle)}`);
    const cannonLogs = await evaluate(`${S}.logs.filter((line) => line.includes('cannon'))`);
    if (cannonLogs.length !== 1 || !cannonLogs[0].startsWith('Sold 29 cannon')) throw new Error(`${viewport.name}: wrong cannon log ${JSON.stringify(cannonLogs)}`);
    await clickButton('Shipwright');
    await until('the yard', inYard);

    // Selling the Merchantman warns about her hold, then returns to the yard.
    await clickTransfer('sell-ship', '1');
    await until('the hold warning', `${dialogTitle} === 'Not enough hold'`);
    await clickButton('Keep her');
    await until('the yard again', inYard);
    await clickTransfer('sell-ship', '1');
    await until('the hold warning', `${dialogTitle} === 'Not enough hold'`);
    await clickButton('Sell her');
    await until('the overboard screen or the yard', `${S}.player.ships.length === 1`);
    await screenshot(`${viewport.name}-after-sale`);
    console.log(`${viewport.name}: repaired, sold cannon one by one, by holding and all at once, and sold a ship without leaving the yard.`);
  }
});
