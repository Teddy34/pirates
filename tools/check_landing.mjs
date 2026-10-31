// Browser smoke check for landing, walking, entering a town on foot,
// re-boarding, digging and reefs, at a desktop and a narrow viewport.
// Uses the local ?preview= states and the piratesPreview hook they expose.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const gamePort = Number(process.env.PLUNDER_TEST_PORT ?? 8011);
const debugPort = Number(process.env.PLUNDER_CDP_PORT ?? 9223) + 1;
const screenshotDirectory = process.env.LANDING_SCREENSHOTS ?? '';
const base = `http://127.0.0.1:${gamePort}`;
const debugUrl = `http://127.0.0.1:${debugPort}`;
const profile = mkdtempSync(join(tmpdir(), 'pirates-landing-'));
const server = spawn(process.execPath, ['server.js'], {
  cwd: new URL('..', import.meta.url),
  env: { ...process.env, PORT: String(gamePort), HOST: '127.0.0.1' },
  stdio: 'ignore',
});
const browser = spawn('chromium', [
  '--headless', '--disable-gpu', '--no-sandbox',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function waitFor(url) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

let socket;
try {
  await Promise.all([waitFor(base), waitFor(`${debugUrl}/json/version`)]);
  if (server.exitCode !== null) throw new Error(`Test server exited with code ${server.exitCode}; port ${gamePort} may already be in use`);
  if (browser.exitCode !== null) throw new Error(`Chromium exited with code ${browser.exitCode}; debug port ${debugPort} may already be in use`);
  const tab = await fetch(`${debugUrl}/json/new?about:blank`, { method: 'PUT' }).then((response) => response.json());
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await command('Runtime.evaluate', { expression, returnByValue: true });
    if (result.exceptionDetails) throw new Error(`${expression}: ${result.exceptionDetails.exception?.description ?? result.exceptionDetails.text}`);
    return result.result.value;
  };
  const until = async (description, expression, timeout = 15000) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const value = await evaluate(expression).catch(() => null);
      if (value) return value;
      await delay(50);
    }
    throw new Error(`Timed out waiting for ${description}`);
  };
  const keyCodes = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 };
  const press = async (key) => {
    const code = keyCodes[key] ?? key.toUpperCase().charCodeAt(0);
    const text = key.length === 1 ? key : undefined;
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key, windowsVirtualKeyCode: code, text });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key, windowsVirtualKeyCode: code });
  };
  const S = 'globalThis.piratesPreview?.state';
  const dialogTitle = "document.querySelector('#event-dialog[open] #dialog-title')?.textContent";
  const clickButton = (label) => evaluate(`(() => {
    const button = [...document.querySelectorAll('#dialog-actions button')].find((b) => b.textContent.startsWith(${JSON.stringify(label)}));
    if (!button) throw new Error('no button ${label}');
    button.click();
    return true;
  })()`);
  const screenshot = async (name) => {
    if (!screenshotDirectory) return;
    const { data } = await command('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(screenshotDirectory, `${name}.png`), Buffer.from(data, 'base64'));
  };
  const open = async (preview) => {
    await command('Page.navigate', { url: `${base}/?preview=${preview}` });
    await until(`${preview} preview`, `${S}?.player && !${S}.paused || Boolean(${dialogTitle})`);
  };

  for (const viewport of [{ name: 'desktop', width: 1280, height: 800, mobile: false }, { name: 'narrow', width: 390, height: 780, mobile: true }]) {
    await command('Emulation.setDeviceMetricsOverride', {
      width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile,
    });

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
} finally {
  socket?.close();
  browser.kill('SIGTERM');
  server.kill('SIGTERM');
  rmSync(profile, { recursive: true, force: true });
}
