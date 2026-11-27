import { delay, withBrowser } from './browser-harness.mjs';

await withBrowser({ name: 'plunder', portOffset: 0 }, async ({ command, evaluate, until, navigate }) => {
  // Both transfer windows share the arrow behaviour: a click moves one ton,
  // holding moves more, and releasing stops.
  const scenarios = [
    { name: 'Plunder', preview: 'plunder', button: '[data-transfer="take"][data-kind="food"]' },
    { name: 'Merchant', preview: 'merchant', button: '[data-transfer="buy"][data-kind="food"]' },
  ];
  const aboardFood = "Number(document.querySelector('.plunder-manifest tbody tr strong').textContent)";
  for (const scenario of scenarios) {
    await navigate(`/?preview=${scenario.preview}`);
    await until(`${scenario.name}: the food transfer button`, `Boolean(document.querySelector('${scenario.button}'))`, 5000);
    const before = await evaluate(aboardFood);
    const buttonPoint = () => evaluate(`(() => {
      const rect = document.querySelector('${scenario.button}').getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    })()`);
    let point = await buttonPoint();
    await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await delay(20);
    await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await delay(100);
    const afterClick = await evaluate(aboardFood);
    if (afterClick - before !== 1) throw new Error(`${scenario.name}: a short click moved ${afterClick - before} tons instead of 1`);

    point = await buttonPoint();
    await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await delay(650);
    await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await delay(100);
    const after = await evaluate(aboardFood);
    if (after - afterClick <= 1) throw new Error(`${scenario.name}: holding the arrow moved only ${after - afterClick} ton`);
    await delay(250);
    const afterRelease = await evaluate(aboardFood);
    if (afterRelease !== after) throw new Error(`${scenario.name}: transfer continued after release: ${after} became ${afterRelease}`);
    console.log(`${scenario.name} hold check passed: click moved 1 ton; hold increased food from ${afterClick} to ${after}.`);
  }

  // The plunder window opens on "Take all", which takes everything that fits
  // and finishes looting.
  await navigate('/?preview=plunder');
  await until('the plunder window', `Boolean(document.querySelector('.plunder-manifest'))`, 5000);
  const focused = await evaluate('document.activeElement?.textContent.trim()');
  if (focused !== 'Take all') throw new Error(`Plunder: the window opened with the focus on "${focused}", not "Take all"`);
  await evaluate('document.activeElement.click()');
  await until('the plunder window closing', `!document.querySelector('#event-dialog').open`, 5000);
  await until('the take-all log line', `/Transferred all useful plunder|could carry no more/.test(document.body.textContent)`, 5000);
  console.log('Take all check passed: the plunder window opened on "Take all", which took the spoils and closed it.');
});
