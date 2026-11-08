// Browser smoke check for sword fights: a duel, boarding, the guard and
// mutiny weapon choices and practice play through at a desktop and a narrow
// size (local ?preview= states). Set SWORD_SCREENSHOTS to a directory to
// keep screenshots.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const gamePort = Number(process.env.PLUNDER_TEST_PORT ?? 8011);
const debugPort = Number(process.env.PLUNDER_CDP_PORT ?? 9223) + 5;
const screenshotDirectory = process.env.SWORD_SCREENSHOTS ?? '';
const base = `http://127.0.0.1:${gamePort}`;
const debugUrl = `http://127.0.0.1:${debugPort}`;
const profile = mkdtempSync(join(tmpdir(), 'pirates-sword-'));
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

  const holdKey = (key, down) => evaluate(`dispatchEvent(new KeyboardEvent('${down ? 'keydown' : 'keyup'}', { key: ${JSON.stringify(key)}, bubbles: true })), true`);
  const inFight = `${S}?.mode === 'sword'`;
  // Attack on changing lines until the fight ends; returns the log's last line.
  const fightItOut = async (where) => {
    await until(`${where}: the fight`, inFight);
    await delay(400);
    await screenshot(where);
    const canvasDrawn = await evaluate(`(() => {
      const canvas = document.querySelector('#game');
      const pixel = canvas.getContext('2d').getImageData(canvas.width >> 1, canvas.height >> 1, 1, 1).data;
      return pixel[3] === 255;
    })()`);
    if (!canvasDrawn) throw new Error(`${where}: the fight scene is not drawn`);
    if (await evaluate('document.documentElement.scrollWidth > innerWidth')) throw new Error(`${where}: the page scrolls sideways`);
    await holdKey('ArrowLeft', true);
    const lines = ['ArrowUp', 'ArrowDown', null];
    for (let round = 0; round < 400 && await evaluate(inFight); round += 1) {
      const line = lines[round % 3];
      if (line) await holdKey(line, true);
      await delay(150);
      if (line) await holdKey(line, false);
    }
    await holdKey('ArrowLeft', false);
    if (await evaluate(inFight)) throw new Error(`${where}: the fight never ended`);
  };

  for (const viewport of [{ name: 'desktop', width: 1280, height: 800, mobile: false }, { name: 'narrow', width: 390, height: 780, mobile: true }]) {
    await command('Emulation.setDeviceMetricsOverride', {
      width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile,
    });

    // A duel straight away; its result reaches the caller and the map.
    await command('Page.navigate', { url: `${base}/?preview=sword-duel` });
    await fightItOut(`${viewport.name}-duel`);
    await until('the map after the duel', `${S}.mode === 'sailing' && document.querySelector('#log').textContent.includes('Preview duel')`);

    // Pausing stops the fight clock.
    await command('Page.navigate', { url: `${base}/?preview=sword-duel` });
    await until('the fight', inFight);
    await holdKey('p', true); await holdKey('p', false);
    const frame = await evaluate(`${S}.paused`);
    if (!frame) throw new Error(`${viewport.name}: P does not pause the fight`);

    // Boarding: the weapon choice, then a battle with crews.
    await command('Page.navigate', { url: `${base}/?preview=boarding` });
    await until('the weapon choice', `${dialogTitle}?.startsWith('Boarding')`);
    await clickButton('Rapier');
    await fightItOut(`${viewport.name}-boarding`);
    await until('the boarding result', `${dialogTitle} || ${S}.mode === 'sailing'`);
    await screenshot(`${viewport.name}-boarding-result`);

    // The guard and the mutineer choose a weapon first, too.
    for (const [preview, title] of [['alley-duel', 'Halt'], ['mutiny', 'Your men confront']]) {
      await command('Page.navigate', { url: `${base}/?preview=${preview}` });
      await until(`${preview} weapon choice`, `${dialogTitle}?.includes(${JSON.stringify(title)})`);
      await clickButton('Cutlass');
      await until(`${preview} fight`, inFight);
      await screenshot(`${viewport.name}-${preview}`);
    }

    // Practice raises the hit bonus by 5, won or lost.
    await command('Page.navigate', { url: `${base}/?preview=sword-practice` });
    await until('the practice offer', `${dialogTitle} === 'Fencing practice'`);
    await clickButton('Draw your sword');
    await fightItOut(`${viewport.name}-practice`);
    await until('the practice bonus', `${S}.player.fencingPractice === 5`);
    console.log(`${viewport.name}: duel, pause, boarding, guard, mutiny and practice fights play through.`);
  }
} finally {
  socket?.close();
  const closed = new Promise((resolve) => browser.once('exit', resolve));
  browser.kill('SIGTERM');
  server.kill('SIGTERM');
  // Chromium writes its profile until it exits.
  await Promise.race([closed, delay(3000)]);
  // Chromium's helper processes can outlive it for a moment.
  for (let attempt = 0; ; attempt += 1) {
    try { rmSync(profile, { recursive: true, force: true }); break; } catch (error) {
      if (attempt >= 20) throw error;
      await delay(250);
    }
  }
}
