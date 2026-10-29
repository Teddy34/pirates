import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const gamePort = Number(process.env.PLUNDER_TEST_PORT ?? 8011);
const debugPort = Number(process.env.PLUNDER_CDP_PORT ?? 9223);
const gameUrl = `http://127.0.0.1:${gamePort}/?preview=plunder`;
const debugUrl = `http://127.0.0.1:${debugPort}`;
const profile = mkdtempSync(join(tmpdir(), 'pirates-plunder-'));
const server = spawn(process.execPath, ['server.js'], {
  cwd: new URL('..', import.meta.url),
  env: { ...process.env, PORT: String(gamePort), HOST: '127.0.0.1' },
  stdio: 'ignore',
});
const browser = spawn('chromium', [
  '--headless', '--disable-gpu', '--no-sandbox',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });

const delay = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));
async function waitFor(url) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

let socket;
try {
  await Promise.all([waitFor(gameUrl), waitFor(`${debugUrl}/json/version`)]);
  if (server.exitCode !== null) throw new Error(`Test server exited with code ${server.exitCode}; port ${gamePort} may already be in use`);
  if (browser.exitCode !== null) throw new Error(`Chromium exited with code ${browser.exitCode}; debug port ${debugPort} may already be in use`);
  const tab = await fetch(`${debugUrl}/json/new?${encodeURIComponent(gameUrl)}`, { method: 'PUT' }).then(response => response.json());
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
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };

  let foundFoodButton = false;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    foundFoodButton = await evaluate("Boolean(document.querySelector('[data-transfer=\"take\"][data-kind=\"food\"]'))");
    if (foundFoodButton) break;
    await delay(100);
  }
  if (!foundFoodButton) throw new Error('Timed out waiting for the food transfer button');
  const before = await evaluate("Number(document.querySelector('.plunder-manifest tbody tr strong').textContent)");
  const foodButtonPoint = () => evaluate(`(() => {
    const rect = document.querySelector('[data-transfer="take"][data-kind="food"]').getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  })()`);
  let point = await foodButtonPoint();
  await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await delay(20);
  await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await delay(100);
  const afterClick = await evaluate("Number(document.querySelector('.plunder-manifest tbody tr strong').textContent)");
  if (afterClick - before !== 1) throw new Error(`A short click moved ${afterClick - before} tons instead of 1`);

  point = await foodButtonPoint();
  await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await delay(650);
  await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await delay(100);
  const after = await evaluate("Number(document.querySelector('.plunder-manifest tbody tr strong').textContent)");
  if (after - afterClick <= 1) throw new Error(`Holding the arrow moved only ${after - afterClick} ton`);
  await delay(250);
  const afterRelease = await evaluate("Number(document.querySelector('.plunder-manifest tbody tr strong').textContent)");
  if (afterRelease !== after) throw new Error(`Transfer continued after release: ${after} became ${afterRelease}`);
  console.log(`Plunder hold check passed: click moved 1 ton; hold increased food from ${afterClick} to ${after}.`);
} finally {
  socket?.close();
  browser.kill('SIGTERM');
  server.kill('SIGTERM');
  rmSync(profile, { recursive: true, force: true });
}
