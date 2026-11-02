// Browser smoke check for the family quest: a promotion names a villain, the
// bartender's gossip points to him, a duel in his town gives a map piece or
// lets him escape, and a rescue wipes the villains, at a desktop and a narrow
// viewport (local ?preview= states).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const gamePort = Number(process.env.PLUNDER_TEST_PORT ?? 8011);
const debugPort = Number(process.env.PLUNDER_CDP_PORT ?? 9223) + 3;
const screenshotDirectory = process.env.VILLAIN_SCREENSHOTS ?? '';
const base = `http://127.0.0.1:${gamePort}`;
const debugUrl = `http://127.0.0.1:${debugPort}`;
const profile = mkdtempSync(join(tmpdir(), 'pirates-villains-'));
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

  const bodyText = `document.querySelector('#dialog-body').textContent`;
  const expectBody = async (where, fragment) => {
    const text = await evaluate(bodyText);
    if (!text.includes(fragment)) throw new Error(`${where}: "${fragment}" not in: ${text}`);
  };

  for (const viewport of [{ name: 'desktop', width: 1280, height: 800, mobile: false }, { name: 'narrow', width: 390, height: 780, mobile: true }]) {
    await command('Emulation.setDeviceMetricsOverride', {
      width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile,
    });
    await evaluate(`localStorage.clear(), true`).catch(() => {});

    // A promotion names the first villain.
    await open('governor-promotion');
    await until('the promotion', `${dialogTitle}?.startsWith('Promotion to')`);
    await clickButton('Continue the audience');
    await until('the villain news', `${dialogTitle} === 'News of your long-lost sister'`);
    await expectBody(viewport.name, 'knows the whereabouts of your sister');
    await screenshot(`${viewport.name}-news`);
    const created = await evaluate(`${S}.villains.filter(Boolean).length`);
    if (created !== 1) throw new Error(`${viewport.name}: ${created} villains after a promotion`);
    if (!await evaluate(`${S}.towns[${S}.villains[0].townIndex].nation === 'Spain'`)) throw new Error(`${viewport.name}: the villain is not in a Spanish town`);

    // The bartender in the town he left says where he went.
    await open('villain-rumour');
    await clickButton('Ask the bartender');
    await until('the news', `${dialogTitle} === 'News from across the Caribbean'`);
    await clickButton('Return to the tavern');
    await until('the gossip', `${dialogTitle} === 'Comings and goings'`);
    await screenshot(`${viewport.name}-gossip`);
    await clickButton('Captain Ribault');
    await until('the report', `${dialogTitle} === 'Captain Ribault'`);
    await expectBody(viewport.name, 'left for');
    await clickButton('Continue');
    await until('the tavern', `${dialogTitle} === 'Rumours, recruits, and strong drink'`);

    // In his town he can be followed; a lost duel lets him escape.
    await open('villain-tavern');
    await clickButton('Follow the man');
    await until('the confrontation', `${dialogTitle} === 'Sneaking out a back entrance'`);
    await clickButton('Lose the duel');
    await until('the escape', `${dialogTitle} === 'He escapes'`);
    if (await evaluate(`${S}.player.reputation`) !== -1) throw new Error(`${viewport.name}: a lost duel did not set reputation to -1`);
    if (await evaluate(`${S}.villains[0] === null`)) throw new Error(`${viewport.name}: the villain did not survive winning`);

    // A won duel clears the villain and gives a piece of the relative's map.
    await open('villain-tavern');
    await clickButton('Follow the man');
    await until('the confrontation', `${dialogTitle} === 'Sneaking out a back entrance'`);
    await clickButton('Win the duel');
    await until('the confession', `${dialogTitle} === 'Your sister is held captive'`);
    await screenshot(`${viewport.name}-map`);
    if (!await evaluate(`${S}.villains[0] === null && ${S}.treasureMaps[1].pieces !== 0`)) throw new Error(`${viewport.name}: the win did not give the map piece`);
    await clickButton('Continue');
    await until('the tavern', `${dialogTitle} === 'Rumours, recruits, and strong drink'`);
    if (await evaluate(`[...document.querySelectorAll('#dialog-actions button')].some((b) => b.textContent.startsWith('Follow the man'))`)) throw new Error(`${viewport.name}: the beaten villain is still in the tavern`);

    // A rescue wipes the villains and starts the lost-city map.
    await open('reunion-niece');
    await until('the rescue', `${dialogTitle} === 'Treasure!'`);
    await expectBody(viewport.name, 'ancient Olmec capital');
    if (!await evaluate(`${S}.villains.every((villain) => villain === null) && ${S}.relativesRescued === 3 && ${S}.treasureMaps[2].pieces !== 0`)) throw new Error(`${viewport.name}: the rescue did not wipe the villains`);
    console.log(`${viewport.name}: news, gossip, both duel results and the rescue all work.`);
  }
} finally {
  socket?.close();
  browser.kill('SIGTERM');
  server.kill('SIGTERM');
  rmSync(profile, { recursive: true, force: true });
}
