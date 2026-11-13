// Browser smoke check for the sea chart: it opens full screen over a paused
// voyage, the gazetteer finds and filters towns, a picked town shows its
// figures and course, a click on the chart picks a town, and the chart closes
// back to the voyage or the logbook, at a desktop and a narrow viewport
// (local ?preview=chart).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const gamePort = Number(process.env.PLUNDER_TEST_PORT ?? 8011);
// +7, not +6: 9229 is Node's inspector port.
const debugPort = Number(process.env.PLUNDER_CDP_PORT ?? 9223) + 7;
const screenshotDirectory = process.env.CHART_SCREENSHOTS ?? '';
const base = `http://127.0.0.1:${gamePort}`;
const debugUrl = `http://127.0.0.1:${debugPort}`;
const profile = mkdtempSync(join(tmpdir(), 'pirates-chart-'));
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
  const keyCodes = { Escape: 27, Enter: 13 };
  const press = async (key) => {
    const code = keyCodes[key] ?? key.toUpperCase().charCodeAt(0);
    const text = key.length === 1 ? key : key === 'Enter' ? '\r' : undefined;
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key.length === 1 ? `Key${key.toUpperCase()}` : key, windowsVirtualKeyCode: code, text });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key.length === 1 ? `Key${key.toUpperCase()}` : key, windowsVirtualKeyCode: code });
  };
  const click = async (x, y) => {
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await command('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', clickCount: type === 'mouseMoved' ? 0 : 1 });
    }
  };
  const screenshot = async (name) => {
    if (!screenshotDirectory) return;
    const { data } = await command('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(screenshotDirectory, `${name}.png`), Buffer.from(data, 'base64'));
  };
  const S = 'globalThis.piratesPreview?.state';
  const chartOpen = `!document.querySelector('#sea-chart').classList.contains('hidden')`;
  const detailTitle = `document.querySelector('#chart-detail:not(.hidden) h3')?.textContent`;
  const dialogTitle = "document.querySelector('#event-dialog[open] #dialog-title')?.textContent";
  const listNames = `[...document.querySelectorAll('#chart-towns button b')].map((b) => b.textContent)`;
  const visible = (selector) => `getComputedStyle(document.querySelector(${JSON.stringify(selector)})).display !== 'none'`;
  const fail = (where, message) => { throw new Error(`${where}: ${message}`); };

  for (const viewport of [{ name: 'desktop', width: 1280, height: 800, mobile: false }, { name: 'narrow', width: 390, height: 780, mobile: true }]) {
    const where = viewport.name;
    await command('Emulation.setDeviceMetricsOverride', {
      width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile,
    });
    await evaluate(`localStorage.clear(), true`).catch(() => {});
    await command('Page.navigate', { url: `${base}/?preview=chart` });
    await until('the chart', `${S}?.mode === 'sailing' && ${chartOpen}`);
    if (!await evaluate(`${S}.paused`)) fail(where, 'the voyage runs under the chart');
    const rect = await evaluate(`(() => { const r = document.querySelector('#sea-chart').getBoundingClientRect(); return [r.width, r.height]; })()`);
    if (rect[0] !== viewport.width || rect[1] !== viewport.height) fail(where, `the chart is ${rect} rather than full screen`);
    if (await evaluate(`${listNames}.length`) !== await evaluate(`${S}.towns.length`)) fail(where, 'the gazetteer does not list every town');
    await screenshot(`${where}-chart`);

    // Search, then Enter picks the first match.
    await evaluate(`(() => { const input = document.querySelector('#chart-search'); input.focus(); input.value = 'havan'; input.dispatchEvent(new Event('input')); return true; })()`);
    if (JSON.stringify(await evaluate(listNames)) !== '["Havana"]') fail(where, `search found ${await evaluate(listNames)}`);
    await press('Enter');
    await until('Havana picked', `${detailTitle} === 'Havana'`);
    const detail = await evaluate(`document.querySelector('#chart-detail').textContent`);
    if (!/From your ship: \d+ cells to the [NSEW]+\./.test(detail)) fail(where, `no course in: ${detail}`);
    if (!/Treasury|no information|obsolete/i.test(detail)) fail(where, `no town figures in: ${detail}`);
    await screenshot(`${where}-havana`);
    if (viewport.mobile && await evaluate(visible('#chart-gazetteer'))) fail(where, 'the list still covers the picked town');
    await evaluate(`[...document.querySelectorAll('#chart-detail button')].find((b) => b.textContent === 'All towns').click(), true`);
    if (!await evaluate(visible('#chart-gazetteer')) || await evaluate(`Boolean(${detailTitle})`)) fail(where, '"All towns" does not bring the list back');

    // The flag filter keeps only that nation's towns.
    await evaluate(`(() => { const input = document.querySelector('#chart-search'); input.value = ''; input.dispatchEvent(new Event('input')); return true; })()`);
    await evaluate(`document.querySelector('#chart-nations [data-nation="Holland"]').click(), true`);
    const dutch = await evaluate(`${S}.towns.filter((town) => town.nation === 'Holland').map((town) => town.name).sort((a, b) => a.localeCompare(b))`);
    if (JSON.stringify(await evaluate(listNames)) !== JSON.stringify(dutch)) fail(where, `the Holland filter lists ${await evaluate(listNames)}`);
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
    if (await evaluate(`${S}.paused`)) fail(where, 'the voyage stays paused after the chart');
    // C opens it (without typing into the search, which a fine pointer
    // focuses) and C closes it again.
    // Headless Chromium has no fine pointer and cannot emulate one, so the
    // page's matchMedia answers for it.
    await evaluate(`(() => { const real = matchMedia.bind(window); window.matchMedia = (query) => query === '(pointer: fine)' ? { matches: true } : real(query); return true; })()`);
    await press('c');
    await until('the chart from C', chartOpen);
    if (await evaluate(`document.activeElement?.id`) !== 'chart-search') fail(where, 'the search does not take focus');
    if (await evaluate(`document.querySelector('#chart-search').value`) !== '') fail(where, 'C typed into the search');
    // The voyage underneath takes neither focus nor keys.
    if (!await evaluate(`document.querySelector('#controls').inert && document.querySelector('#event-dialog').inert`)) fail(where, 'the page under the chart is not inert');
    await evaluate(`document.querySelector('#pause-button').click(), true`);
    if (!await evaluate(`${S}.paused`)) fail(where, 'the voyage unpaused under the chart');
    await evaluate(`document.activeElement?.blur(), true`);
    await press('c');
    await delay(200);
    if (await evaluate(chartOpen)) fail(where, 'C does not close the chart');

    // From the logbook, closing the chart returns to the logbook.
    await evaluate(`document.querySelector('#logbook-button').click(), true`);
    await until('the logbook', `${dialogTitle} === 'The captain’s logbook'`);
    await evaluate(`[...document.querySelectorAll('#dialog-actions button')].find((b) => b.textContent === 'Sea chart').click(), true`);
    await until('the chart from the logbook', chartOpen);
    await evaluate(`document.querySelector('#chart-close').click(), true`);
    await until('back to the logbook', `${dialogTitle} === 'The captain’s logbook'`);
    // C and L still type into the start screen's captain name.
    await command('Page.navigate', { url: `${base}/` });
    // The begin button enables once the game script and its data are loaded.
    await until('the start screen', `document.querySelector('#new-game-form button[type="submit"]')?.disabled === false`);
    await evaluate(`(() => { const input = document.querySelector('#captain-name'); input.value = ''; input.focus(); return true; })()`);
    for (const key of 'calico jack') await press(key);
    const typed = await evaluate(`document.querySelector('#captain-name').value`);
    if (typed !== 'calico jack') fail(where, `the captain's name reads "${typed}"`);
    console.log(`${where}: the chart opens full screen, finds, filters and picks towns, and closes back to the voyage and the logbook.`);
  }
} finally {
  socket?.close();
  // Chromium keeps writing its profile until it exits.
  const browserExited = browser.exitCode !== null ? Promise.resolve() : new Promise((resolve) => browser.once('exit', resolve));
  browser.kill('SIGTERM');
  server.kill('SIGTERM');
  await Promise.race([browserExited, delay(5000)]);
  // A leftover profile in the temp directory must not hide the result.
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {}
}
