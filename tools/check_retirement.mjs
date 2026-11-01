// Browser smoke check for retirement: the voluntary ending through the
// hall of fame, and forced retirement in poor health with a return to
// pirating, at a desktop and a narrow viewport (local ?preview= states).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const gamePort = Number(process.env.PLUNDER_TEST_PORT ?? 8011);
const debugPort = Number(process.env.PLUNDER_CDP_PORT ?? 9223) + 2;
const screenshotDirectory = process.env.RETIREMENT_SCREENSHOTS ?? '';
const base = `http://127.0.0.1:${gamePort}`;
const debugUrl = `http://127.0.0.1:${debugPort}`;
const profile = mkdtempSync(join(tmpdir(), 'pirates-retirement-'));
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
    await until(`${preview} preview`, `Boolean(${dialogTitle})`);
  };

  for (const viewport of [{ name: 'desktop', width: 1280, height: 800, mobile: false }, { name: 'narrow', width: 390, height: 780, mobile: true }]) {
    await command('Emulation.setDeviceMetricsOverride', {
      width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile,
    });
    await evaluate(`localStorage.clear(), true`).catch(() => {});

    // Retire at the counting house, stay retired and enter the hall of fame.
    await open('retirement');
    await until('the division', `${dialogTitle} === 'Divide the plunder?'`);
    await clickButton('Retire from privateering');
    await until('the confirmation', `${dialogTitle} === 'Retire from privateering?'`);
    await press('y');
    await until('the career summary', `${dialogTitle}?.startsWith('The Further Adventures of the Pirate Preview')`);
    const summary = await evaluate(`document.querySelector('#dialog-body').textContent`);
    for (const fragment of ['an English Captain and a French Colonel', 'at the age of 31', 'rescuing one member']) {
      if (!summary.includes(fragment)) throw new Error(`${viewport.name}: summary lacks "${fragment}": ${summary}`);
    }
    await screenshot(`${viewport.name}-summary`);
    await clickButton('Continue');
    await until('the new life', `${dialogTitle} === 'Your pirating days are over'`);
    const life = await evaluate(`document.querySelector('#dialog-body').textContent`);
    // The division averages reputation down from 20 before the score (0x180C8), so the Colonel's 37 points drop a little.
    if (!/a Colonel in Guadeloupe, where/.test(life) || !/points3\d\/100/.test(life)) throw new Error(`${viewport.name}: unexpected ending: ${life}`);
    await clickButton('Continue');
    await until('the lure of the sea', `${dialogTitle} === 'The lure of the sea'`);
    await clickButton('Remain in retirement');
    await until('the hall of fame offer', `${dialogTitle} === 'The Pirate Hall of Fame'`);
    if (await evaluate(`localStorage.getItem('fortune-and-freedom-save-v5') !== null`)) throw new Error(`${viewport.name}: the save survived retirement`);
    await press('y');
    await until('the hall of fame', `document.querySelector('.hall-of-fame [aria-current]')?.textContent.includes('Colonel in Guadeloupe')`);
    await screenshot(`${viewport.name}-hall`);
    await clickButton('Continue');
    await until('another game', `${dialogTitle} === 'Another game?'`);
    await press('n');
    await until('farewell', `${dialogTitle} === 'Farewell'`);
    console.log(`${viewport.name}: retired as a Colonel in Guadeloupe and entered the hall of fame.`);

    // Poor health ends the career at the division; the lure of the sea returns to a new expedition.
    await open('retirement-poor');
    await until('the poor-health division', `${dialogTitle} === 'Divide the plunder?' && document.querySelector('#dialog-body').textContent.includes('Your health is poor')`);
    if (await evaluate(`[...document.querySelectorAll('#dialog-actions button')].some((b) => b.textContent.startsWith('Begin a new expedition'))`)) throw new Error(`${viewport.name}: poor health still offers a new expedition`);
    const wealthBefore = await evaluate(`${S}.player.personalWealth`);
    await clickButton('Divide the plunder');
    await until('forced retirement', `${dialogTitle} === 'Time to retire'`);
    await clickButton('Continue');
    await until('the career summary', `${dialogTitle}?.startsWith('The Further Adventures')`);
    await clickButton('Continue');
    await until('the new life', `${dialogTitle} === 'Your pirating days are over'`);
    await clickButton('Continue');
    await until('the lure of the sea', `${dialogTitle} === 'The lure of the sea'`);
    await clickButton('Return to pirating');
    await until('the refit', `${dialogTitle} === 'The company disperses'`);
    const after = await evaluate(`({ wealth: ${S}.player.personalWealth, months: ${S}.player.monthsAtSea })`);
    // One captain's take of 800 plus the refit's monthly land income (10 a month), not two takes.
    const gained = after.wealth - wealthBefore;
    if (gained < 800 || gained >= 1600) throw new Error(`${viewport.name}: personal wealth rose by ${gained}, expected one captain's take of 800`);
    await clickButton('Return to town');
    await until('the town menu', `${dialogTitle} === 'Guadeloupe'`);
    console.log(`${viewport.name}: poor health forced retirement; the captain returned to pirating with one captain's take.`);
  }
} finally {
  socket?.close();
  browser.kill('SIGTERM');
  server.kill('SIGTERM');
  rmSync(profile, { recursive: true, force: true });
}
