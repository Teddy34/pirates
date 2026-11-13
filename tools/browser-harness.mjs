// Shared harness for the browser smoke checks (tools/check_*.mjs): it starts
// the game server and a headless Chromium, drives the page over the Chrome
// DevTools Protocol, and cleans both up. Each check passes its own debug-port
// offset so the checks can run side by side.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800, mobile: false },
  { name: 'narrow', width: 390, height: 780, mobile: true },
];

// The live game state the ?preview= states expose, and the open dialog's title.
export const S = 'globalThis.piratesPreview?.state';
export const dialogTitle = "document.querySelector('#event-dialog[open] #dialog-title')?.textContent";

export const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const keyCodes = { Enter: 13, Escape: 27, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 };

async function waitFor(url) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function connect(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
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
  return { socket, command };
}

// Page helpers built on one DevTools connection.
function pageHelpers({ command, base, screenshotDirectory }) {
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
  const press = async (key) => {
    const single = key.length === 1;
    const windowsVirtualKeyCode = keyCodes[key] ?? key.toUpperCase().charCodeAt(0);
    const code = single ? `Key${key.toUpperCase()}` : key;
    let text;
    if (single) text = key;
    else if (key === 'Enter') text = '\r';
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode, text });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode });
  };
  // A real mouse click at viewport point (x, y).
  const click = async (x, y) => {
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await command('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', clickCount: type === 'mouseMoved' ? 0 : 1 });
    }
  };
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
  const navigate = (path) => command('Page.navigate', { url: `${base}${path}` });
  // Opens a ?preview= state and waits until it is ready (by default, a dialog).
  const open = async (preview, ready = `Boolean(${dialogTitle})`) => {
    await navigate(`/?preview=${preview}`);
    await until(`${preview} preview`, ready);
  };
  const setViewport = ({ width, height, mobile }) => command('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile,
  });
  return { evaluate, until, press, click, clickButton, screenshot, navigate, open, setViewport };
}

// Chromium's helper processes can outlive it for a moment, so removal is
// retried. A leftover profile in the temp directory only earns a warning: it
// must never hide the check's own result.
async function removeProfile(profile) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      rmSync(profile, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt >= 20) {
        console.warn(`Could not remove the browser profile ${profile}: ${error.message}`);
        return;
      }
      await delay(250);
    }
  }
}

// Runs `check(page)` against a fresh server and browser, then shuts both down.
// `portOffset` is added to PLUNDER_CDP_PORT (default 9223) for the debug port;
// `screenshotEnv` names the variable that holds a screenshot directory.
export async function withBrowser({ name, portOffset = 0, screenshotEnv }, check) {
  const gamePort = Number(process.env.PLUNDER_TEST_PORT ?? 8011);
  const debugPort = Number(process.env.PLUNDER_CDP_PORT ?? 9223) + portOffset;
  const screenshotDirectory = (screenshotEnv && process.env[screenshotEnv]) ?? '';
  const base = `http://127.0.0.1:${gamePort}`;
  const debugUrl = `http://127.0.0.1:${debugPort}`;
  const profile = mkdtempSync(join(tmpdir(), `pirates-${name}-`));
  const server = spawn(process.execPath, ['server.js'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, PORT: String(gamePort), HOST: '127.0.0.1' },
    stdio: 'ignore',
  });
  const browser = spawn('chromium', [
    '--headless', '--disable-gpu', '--no-sandbox',
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore' });

  let socket;
  try {
    await Promise.all([waitFor(base), waitFor(`${debugUrl}/json/version`)]);
    if (server.exitCode !== null) throw new Error(`Test server exited with code ${server.exitCode}; port ${gamePort} may already be in use`);
    if (browser.exitCode !== null) throw new Error(`Chromium exited with code ${browser.exitCode}; debug port ${debugPort} may already be in use`);
    const tab = await fetch(`${debugUrl}/json/new?about:blank`, { method: 'PUT' }).then((response) => response.json());
    const connection = await connect(tab.webSocketDebuggerUrl);
    socket = connection.socket;
    const { command } = connection;
    await check({ base, command, ...pageHelpers({ command, base, screenshotDirectory }) });
  } finally {
    socket?.close();
    const browserExited = browser.exitCode === null
      ? new Promise((resolve) => browser.once('exit', resolve))
      : Promise.resolve();
    browser.kill('SIGTERM');
    server.kill('SIGTERM');
    // Chromium keeps writing its profile until it exits.
    await Promise.race([browserExited, delay(5000)]);
    await removeProfile(profile);
  }
}
