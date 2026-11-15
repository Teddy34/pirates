// Captures the main dialogs at several viewports for design review:
// MENU_SHOTS=<dir> node tools/shoot_menus.mjs
import { withBrowser, delay } from './browser-harness.mjs';

const previews = (process.env.MENU_PREVIEWS ?? 'merchant,shipwright,governor-promotion,in-town,arrival,prize,tavern,news,sail-ho').split(',');
const viewports = [
  { name: 'laptop', width: 1000, height: 577, mobile: false },
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: 'narrow', width: 390, height: 780, mobile: true },
];

await withBrowser({ name: 'menus', portOffset: 40, screenshotEnv: 'MENU_SHOTS' }, async ({ setViewport, open, screenshot }) => {
  for (const viewport of viewports) {
    await setViewport(viewport);
    for (const preview of previews) {
      await open(preview);
      await delay(400);
      await screenshot(`${preview}-${viewport.name}`);
    }
  }
});
