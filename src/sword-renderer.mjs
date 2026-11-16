// Draws a sword fight: the backdrop, the crews, the two fencers and the
// morale panel, all from cached pixel sprites (fencer-sprites.mjs). Reads the
// fight record of sword-mechanics.mjs and never changes it.

import { BACKDROP, FIGHT_UNITS_PER_ART_PIXEL, LOOKS, paintFencer, paintSpark } from './fencer-sprites.mjs';
import { FIGHT_MODE, MOVE, WEAPONS } from './sword-mechanics.mjs';
import { cachedSprite, devicePixelScale, drawPixelSprite } from './sprite-canvas.mjs';
import { harbourRow } from './vignettes.mjs';

const SCENE_UNITS = BACKDROP.width * FIGHT_UNITS_PER_ART_PIXEL; // 520 fight x units
// Narrow screens show at least this much of the fight around the fencers.
const MIN_VISIBLE_UNITS = 300;
// Each fencer stands this far behind his fight x. Forward steps stop 10
// apart, and at that range the guarding blades cross while a strike just
// reaches the other fencer's body.
const BODY_OFFSET = 30;
// The crews keep to the deck: they line up from closer to the fight x.
const CREW_OFFSET = 12;
// 0x167CE: the two sides' morale always adds up to 47, so one bar shows
// both: his share from the left, yours from the right.
const TOTAL_MORALE = 47;
const PANEL_HEIGHT = 78;
const spriteCache = new Map();

// Real art for the backdrops (assets/vignettes/PROVENANCE.md), built by
// tools/build_vignette.py at the backdrop's size. The walls hold one row per
// town flag, in the order of the harbour pictures (harbourRow). There is no
// code-drawn stand-in: until an image loads, the fight plays over plain sky
// and ground.
const BACKDROP_ART_URLS = {
  deck: new URL('../assets/vignettes/fight-deck.png', import.meta.url).href,
  alley: new URL('../assets/vignettes/fight-alley.png', import.meta.url).href,
  walls: new URL('../assets/vignettes/fight-walls.png', import.meta.url).href,
};
const backdropArt = {};
let backdropArtLoading = null;

// Starts loading the backdrop art once; the fight's frame loop picks each
// picture up as it arrives.
export function loadBackdropArt() {
  if (backdropArtLoading || typeof Image === 'undefined') return backdropArtLoading ?? Promise.resolve();
  backdropArtLoading = Promise.all(Object.entries(BACKDROP_ART_URLS).map(([scene, url]) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => { backdropArt[scene] = image; resolve(); };
    image.onerror = () => resolve();
    image.src = url;
  }))).then(() => {});
  return backdropArtLoading;
}

const backdropArtScene = (scene) => (scene === 'alley' || scene === 'walls' ? scene : 'deck');

// The backdrop as a sprite, with the colours of its top and bottom rows to
// fill the screen above and below it; until the art has loaded, no sprite
// and the plain colours of its sky and ground.
function backdropSprite(view) {
  const scene = backdropArtScene(view.scene);
  const row = scene === 'walls' ? harbourRow({ flag: view.flag, era: view.era }) : 0;
  const image = backdropArt[scene];
  if (image && row !== null) {
    const art = cachedSprite(spriteCache, `art|${scene}|${row}`, () => {
      const { width, height, groundY } = BACKDROP;
      const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : new OffscreenCanvas(width, height);
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, row * height, width, height, 0, 0, width, height);
      return { pixels: context.getImageData(0, 0, width, height).data, width, height, anchor: { x: 0, y: groundY } };
    });
    if (art) return { sprite: art, sky: edgeColour(art, 0), ground: edgeColour(art, BACKDROP.height - 1) };
  }
  return scene === 'deck' ? { sprite: null, sky: '#a5d0de', ground: '#86592f' } : { sprite: null, sky: '#14203a', ground: '#3a3633' };
}

// The commonest colour of one row of a sprite (the sky, not a mast or a
// sail crossing it), cached on the sprite.
function edgeColour(sprite, row) {
  sprite.edges ??= {};
  if (!sprite.edges[row]) {
    const pixels = sprite.image.getContext('2d').getImageData(0, row, sprite.width, 1).data;
    const counts = new Map();
    for (let index = 0; index < pixels.length; index += 4) {
      const colour = `rgb(${pixels[index]},${pixels[index + 1]},${pixels[index + 2]})`;
      counts.set(colour, (counts.get(colour) ?? 0) + 1);
    }
    sprite.edges[row] = [...counts].reduce((best, entry) => (entry[1] > best[1] ? entry : best))[0];
  }
  return sprite.edges[row];
}

const lookKey = (look) => Object.values(look).join(',');

function fencerSprite({ move, frame, look, weapon, mirror, shade = 0 }) {
  const safeMove = move < 0 ? 0 : move;
  return cachedSprite(spriteCache, `f|${safeMove}|${frame}|${lookKey(look)}|${weapon}|${mirror}|${shade}`, () => paintFencer({ move: safeMove, frame, look, weapon, mirror, shade }));
}

// Height of a blow above the ground, in art pixels, by line (middle, low, high).
const LINE_HEIGHT = [25, 17, 32];

// `centre` is the fight x the camera follows when the scene is wider than
// the screen.
export function swordLayout(width, height, centre = SCENE_UNITS / 2) {
  const compact = width <= 760;
  // The voyage HUD is hidden in a fight, so the panel takes the top.
  const panelTop = 14;
  const top = panelTop + PANEL_HEIGHT + 12;
  const bottom = height - (width <= 1100 ? 150 : 96);
  const available = Math.max(140, bottom - top);
  const dpr = devicePixelScale();
  const cssPerUnit = Math.min((width - 16) / Math.min(SCENE_UNITS, MIN_VISIBLE_UNITS), available / (BACKDROP.height * FIGHT_UNITS_PER_ART_PIXEL));
  // Whole device pixels per art pixel keep every sprite pixel square.
  const pixelScale = Math.max(1, Math.floor(cssPerUnit * FIGHT_UNITS_PER_ART_PIXEL * dpr));
  const unit = pixelScale / dpr / FIGHT_UNITS_PER_ART_PIXEL;
  const visible = width / unit;
  const cameraX = visible >= SCENE_UNITS ? SCENE_UNITS / 2 : Math.max(visible / 2, Math.min(SCENE_UNITS - visible / 2, centre));
  const sceneHeight = BACKDROP.height * FIGHT_UNITS_PER_ART_PIXEL * unit;
  const left = Math.round(width / 2 - cameraX * unit);
  const sceneTop = Math.round(top + Math.max(0, (available - sceneHeight) / 2));
  const ground = sceneTop + BACKDROP.groundY * FIGHT_UNITS_PER_ART_PIXEL * unit;
  return { pixelScale, unit, left, ground, bottom, panelTop, compact };
}

// `view` is { fight, scene, flag, era, yourLook, foeLook, yourName, foeName }.
export function renderSwordFight(context, view, width, height) {
  const { fight } = view;
  const layout = swordLayout(width, height, (fight.you.x + fight.foe.x) / 2);
  const { pixelScale, unit, left, ground } = layout;
  const toX = (x) => left + x * unit;
  const art = FIGHT_UNITS_PER_ART_PIXEL * unit;

  const { sprite: backdrop, sky, ground: floor } = backdropSprite(view);
  context.fillStyle = sky;
  context.fillRect(0, 0, width, ground);
  context.fillStyle = floor;
  context.fillRect(0, ground, width, height - ground);
  if (backdrop) drawPixelSprite(context, backdrop, left, ground, pixelScale);

  // The crews of a battle stand behind their leaders, further back.
  if (fight.mode === FIGHT_MODE.battle) {
    drawCrew(context, fight, fight.you.men, 1, toX(fight.you.x + CREW_OFFSET), ground - 5 * art, pixelScale, art);
    drawCrew(context, fight, fight.foe.men, -1, toX(fight.foe.x - CREW_OFFSET), ground - 5 * art, pixelScale, art, view.foeCrewLook);
  }

  const foeSprite = fencerSprite({ move: fight.foe.move, frame: fight.foe.frame, look: view.foeLook, weapon: fight.opponentWeapon, mirror: false });
  const youSprite = fencerSprite({ move: fight.you.move, frame: fight.you.frame, look: view.yourLook, weapon: fight.weapon, mirror: true });
  if (foeSprite) drawPixelSprite(context, foeSprite, toX(fight.foe.x - BODY_OFFSET), ground, pixelScale);
  if (youSprite) drawPixelSprite(context, youSprite, toX(fight.you.x + BODY_OFFSET), ground, pixelScale);

  for (const event of fight.events) {
    if (event.type !== 'hit' && event.type !== 'parry') continue;
    const attacker = event.by === 'you' ? fight.you : fight.foe;
    const line = attacker.move >= 0 && attacker.move < 12 ? attacker.move % 3 : 0;
    const x = event.type === 'hit'
      ? (event.by === 'you' ? toX(fight.foe.x - BODY_OFFSET) + 3 * art : toX(fight.you.x + BODY_OFFSET) - 3 * art)
      : toX((fight.you.x + fight.foe.x) / 2);
    const spark = cachedSprite(spriteCache, `s|${event.type}`, () => paintSpark(event.type));
    if (spark) drawPixelSprite(context, spark, x, ground - LINE_HEIGHT[line] * art, pixelScale);
  }

  drawPanel(context, view, width, layout);
  drawHint(context, width, layout.bottom + 4, layout.compact);
}

function drawCrew(context, fight, men, side, startX, y, pixelScale, art, look = LOOKS.sailor) {
  const figures = men > 1 ? Math.min(5, Math.ceil(men / 12)) : 0;
  for (let index = figures - 1; index >= 0; index -= 1) {
    const sway = (fight.frame + index * 3) % 12;
    const move = sway < 4 ? [MOVE.slashMid, MOVE.guardHigh, MOVE.slashLow][index % 3] : index % 3;
    const sprite = fencerSprite({ move, frame: sway % 6, look, weapon: 2, mirror: side > 0, shade: .3 });
    if (sprite) drawPixelSprite(context, sprite, startX + side * (26 + 20 * index) * art, y - (index % 2) * 3 * art, pixelScale);
  }
}

const PANEL = { fill: '#0b1d24', frame: '#c99a45', outline: '#21180f', empty: '#24343a', foe: '#d36b4c', foeDark: '#8f3a26', you: '#6fb6c6', youDark: '#2f6f80', ink: '#f3e5c5', foeInk: '#e8c48a' };

// A tug of war in 47 chunky cells: his morale fills from the left, yours from
// the right. The cells and the numbers beside the names carry the split, not
// the colours alone.
function moraleBar(context, x, y, width, height, fight) {
  const cell = Math.max(3, Math.floor((width - 4) / TOTAL_MORALE));
  const barWidth = cell * TOTAL_MORALE + 4;
  const left = x + Math.floor((width - barWidth) / 2);
  context.fillStyle = PANEL.outline;
  context.fillRect(left, y, barWidth, height);
  const foeCells = Math.max(0, Math.min(TOTAL_MORALE, fight.foe.morale));
  const yourCells = Math.max(0, Math.min(TOTAL_MORALE - foeCells, fight.you.morale));
  const gap = cell >= 6 ? 1 : 0;
  for (let index = 0; index < TOTAL_MORALE; index += 1) {
    const cx = left + 2 + index * cell;
    const side = index < foeCells ? 'foe' : index >= TOTAL_MORALE - yourCells ? 'you' : null;
    context.fillStyle = side ? PANEL[side] : PANEL.empty;
    context.fillRect(cx, y + 2, cell - gap, height - 4);
    if (side) {
      context.fillStyle = PANEL[`${side}Dark`];
      context.fillRect(cx, y + height - 5, cell - gap, 3);
    }
  }
}

// A little pixel sailor, 5×7 cells, beside a crew count.
const CREW_ICON = ['.xxx.', '.xxx.', '..x..', 'xxxxx', '..x..', '.x.x.', 'x...x'];
function crewIcon(context, x, y, scale, colour) {
  context.fillStyle = colour;
  CREW_ICON.forEach((row, cy) => [...row].forEach((c, cx) => {
    if (c === 'x') context.fillRect(x + cx * scale, y + cy * scale, scale, scale);
  }));
}

// One side's figures under the bar, from the panel's edge inwards: the crew
// (in a battle) with a sailor icon, then the morale. `side` is 1 from the
// left edge, -1 from the right.
function sideFigures(context, { x, y, morale, men, side, colour, scale }) {
  context.fillStyle = colour;
  context.textAlign = 'left';
  const items = [];
  if (men != null) items.push({ icon: true, text: `${men} ${men === 1 ? 'man' : 'men'}` });
  items.push({ text: `Morale ${morale}` });
  const iconWidth = 5 * scale + 5;
  let edge = x;
  for (const item of items) {
    const width = (item.icon ? iconWidth : 0) + context.measureText(item.text).width;
    const start = side > 0 ? edge : edge - width;
    if (item.icon) crewIcon(context, Math.round(start), y + 1, scale, colour);
    context.fillText(item.text, start + (item.icon ? iconWidth : 0), y);
    edge += side * (width + 18);
  }
}

function drawPanel(context, view, width, layout) {
  const { fight } = view;
  const { compact } = layout;
  const panelWidth = Math.min(width - 24, 760);
  const x = Math.round((width - panelWidth) / 2);
  const y = layout.panelTop;
  const pad = compact ? 10 : 14;
  const half = panelWidth / 2 - pad - 4;
  context.save();
  // A chunky pixel frame: dark outline, brass band, dark fill.
  context.fillStyle = PANEL.outline;
  context.fillRect(x - 3, y - 3, panelWidth + 6, PANEL_HEIGHT + 6);
  context.fillStyle = PANEL.frame;
  context.fillRect(x, y, panelWidth, PANEL_HEIGHT);
  context.fillStyle = PANEL.outline;
  context.fillRect(x + 3, y + 3, panelWidth - 6, PANEL_HEIGHT - 6);
  context.fillStyle = PANEL.fill;
  context.fillRect(x + 5, y + 5, panelWidth - 10, PANEL_HEIGHT - 10);
  context.textBaseline = 'top';
  context.font = `bold ${compact ? 12 : 14}px system-ui, sans-serif`;
  const battle = fight.mode === FIGHT_MODE.battle;
  // His side on the left, as on the deck below.
  context.fillStyle = PANEL.foeInk;
  context.textAlign = 'left';
  context.fillText(view.foeName, x + pad, y + 10, half);
  context.fillStyle = PANEL.ink;
  context.textAlign = 'right';
  context.fillText(`${view.yourName} · ${WEAPONS[fight.weapon]}`, x + panelWidth - pad, y + 10, half);
  moraleBar(context, x + pad, y + 29, panelWidth - 2 * pad, 18, fight);
  context.font = `${compact ? 11 : 13}px system-ui, sans-serif`;
  const scale = 2;
  sideFigures(context, { x: x + pad, y: y + 54, morale: fight.foe.morale, men: battle ? fight.foe.men : null, side: 1, colour: PANEL.foeInk, scale });
  sideFigures(context, { x: x + panelWidth - pad, y: y + 54, morale: fight.you.morale, men: battle ? fight.you.men : null, side: -1, colour: PANEL.ink, scale });
  context.restore();
}

function drawHint(context, width, y, compact) {
  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'top';
  context.font = `${compact ? 11 : 13}px system-ui, sans-serif`;
  context.fillStyle = 'rgba(243,229,197,.85)';
  const text = compact
    ? '← attack · → back off · ↑↓ line · ⚡ quick thrust'
    : '← or A attacks · → or D backs off · ↑/W high line · ↓/S low line · hold Shift for a quick thrust · P pauses';
  context.fillText(text, width / 2, y);
  context.restore();
}
