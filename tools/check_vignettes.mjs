// Browser smoke check for the sea, capture, captivity and hall-of-fame scene
// pictures: each dialog shows its picture and fits the viewport, at a desktop
// and a narrow size (local ?preview= states).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const gamePort = Number(process.env.PLUNDER_TEST_PORT ?? 8011);
const debugPort = Number(process.env.PLUNDER_CDP_PORT ?? 9223) + 4;
const screenshotDirectory = process.env.VIGNETTE_SCREENSHOTS ?? '';
const base = `http://127.0.0.1:${gamePort}`;
const debugUrl = `http://127.0.0.1:${debugPort}`;
const profile = mkdtempSync(join(tmpdir(), 'pirates-vignettes-'));
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

  const expectPicture = async (where, description) => {
    const shown = await evaluate(`({
      label: document.querySelector('#dialog-vignette canvas').getAttribute('aria-label'),
      hidden: document.querySelector('#dialog-vignette').classList.contains('hidden'),
      // The dialog scrolls vertically by design, so check what must not: the
      // picture inside its width, and no sideways overflow.
      fits: document.querySelector('#dialog-vignette canvas').getBoundingClientRect().right <= document.querySelector('#event-dialog').getBoundingClientRect().right,
      inside: document.querySelector('#event-dialog').scrollWidth <= document.querySelector('#event-dialog').clientWidth,
    })`);
    if (shown.hidden || !shown.label.includes(description)) throw new Error(`${where}: picture "${description}" not shown: ${shown.label}`);
    if (!shown.fits || !shown.inside) throw new Error(`${where}: the dialog overflows sideways`);
  };

  const scenes = [
    ['sail-ho', 'tiny sail'],
    ['boarding', 'Two ships grind'],
    ['hostage-talks', 'bound enemy captain'],
    ['crew-recruits', 'names in the articles'],
    ['treasure-fleet-capture', 'beaten royal galleon'],
    ['silver-train-capture', 'broken mule train'],
    ['mutiny', 'armed crew'],
    ['prison', 'stone cell'],
    ['hall-of-fame', 'empty frame'],
    ['alley-duel', 'moonlit alley'],
  ];
  for (const viewport of [{ name: 'desktop', width: 1280, height: 800, mobile: false }, { name: 'narrow', width: 390, height: 780, mobile: true }]) {
    await command('Emulation.setDeviceMetricsOverride', {
      width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile,
    });
    for (const [preview, description] of scenes) {
      await open(preview);
      await expectPicture(`${viewport.name} ${preview}`, description);
      await screenshot(`${viewport.name}-${preview}`);
    }

    // The follow-up dialog of each flow keeps its picture.
    await open('prison');
    await clickButton('Continue');
    await until('the months in prison', `${dialogTitle}?.endsWith('months pass')`);
    await expectPicture(`${viewport.name} release`, 'stone cell');
    await open('hostage-talks');
    await clickButton('Ask about the treasure fleet');
    await until('the prisoner\'s report', `${dialogTitle} !== 'The Spain captain yields'`);
    await expectPicture(`${viewport.name} report`, 'bound enemy captain');
    await open('hall-of-fame');
    await clickButton('Yes');
    await until('the record', `document.querySelector('#dialog-body .hall-of-fame')`);
    await evaluate(`document.querySelector('#dialog-actions button').scrollIntoView()`);
    if (!await evaluate(`document.querySelector('#dialog-actions button').getBoundingClientRect().bottom <= innerHeight`)) throw new Error(`${viewport.name}: the record's Continue cannot be reached`);
    await expectPicture(`${viewport.name} record`, 'empty frame');
    console.log(`${viewport.name}: all ten scene pictures show and fit.`);
  }
} finally {
  socket?.close();
  browser.kill('SIGTERM');
  server.kill('SIGTERM');
  rmSync(profile, { recursive: true, force: true });
}
