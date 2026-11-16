import { NATIONS } from './data.mjs';
import { BATTLE_SAIL_TRANSITION_FRAMES, SMOKE_LIFE_FRAMES, broadsideState, damageLevel, fortDamageLevel, fortFieldGround } from './battle-mechanics.mjs';
import { FORT_SPRITE_ANCHOR, FORT_SPRITE_HEIGHT, FORT_SPRITE_WIDTH, paintFortSprite } from './fort-sprites.mjs';
import { TOWN_SPRITE_ANCHOR, TOWN_SPRITE_HEIGHT, TOWN_SPRITE_WIDTH, paintTownSprite } from './town-sprites.mjs';
import { headingSector } from './ship-sprites.mjs';
import { battleShipPixelScale, paintBattleShipSprite } from './battle-ship-sprites.mjs';
import { SEA_FRAMES, WIND_DIAL_SIZE, paintSea, paintWindDial } from './sea-sprites.mjs';
import { paintShotSprite, volleyTier } from './shot-sprites.mjs';
import { SMOKE_STAGES, paintSmokeSprite } from './smoke-sprites.mjs';
import { cachedSprite, devicePixelScale, drawPixelSprite } from './sprite-canvas.mjs';

const shipSpriteCache = new Map();

// The pixel-art ship (battle-ship-sprites.mjs): one design per ship type,
// one sprite per heading sector, sail state (darker while changing), flag,
// wind and damage level. The art has a fixed, coarse resolution and is drawn
// at a whole number of device pixels per art pixel, so it stays chunky on
// every screen.
function drawShip(context, ship, wind, scale) {
  const key = NATIONS[ship.flag] ? ship.flag : 'pirate';
  const sector = headingSector(ship.heading);
  const windSector = headingSector(wind);
  const level = Math.min(4, ship.damage >> 4);
  const changing = ship.sailTransition > 0;
  const sprite = cachedSprite(shipSpriteCache, `${ship.type}|${sector}|${ship.sails}|${changing}|${key}|${windSector}|${level}`, () => paintBattleShipSprite({
    type: ship.type, heading: sector * 16, sails: ship.sails, changing, nation: { key, ...NATIONS[key] },
    wind: windSector * 16, damage: level * 16,
  }));
  if (!sprite) return;
  drawPixelSprite(context, sprite, ship.x, ship.y, battleShipPixelScale(scale, devicePixelScale()));
}

// Shots and smoke are painted at `detail` art pixels per battle pixel on
// large screens, so their art pixel stays at most about MAX_ART_PIXEL
// device pixels.
const MAX_ART_PIXEL = 3;

const shotSpriteCache = new Map();

// A volley sprite sized by the shooter's current guns and turned to its
// flight (shot-sprites.mjs), with a faint streak trailing back.
function drawShot(context, shot, guns, scale) {
  const devicePixels = scale * devicePixelScale();
  const detail = Math.max(1, Math.ceil(devicePixels / MAX_ART_PIXEL));
  const tier = volleyTier(guns);
  const sector = Math.round(shot.direction / 16) & 15;
  const angle = shot.direction / 256 * Math.PI * 2;
  const trail = 6 + 2 * tier;
  context.save();
  context.strokeStyle = 'rgba(232,236,226,.25)';
  context.lineWidth = 1;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(shot.x, shot.y);
  context.lineTo(shot.x - Math.sin(angle) * trail, shot.y + Math.cos(angle) * trail);
  context.stroke();
  context.restore();
  const sprite = cachedSprite(shotSpriteCache, `${tier}|${sector}|${detail}`, () => paintShotSprite({ tier, detail, direction: sector * 16 }));
  if (!sprite) return;
  drawPixelSprite(context, sprite, shot.x, shot.y, Math.max(1, Math.round(devicePixels / detail)));
}

// The sails, or their change in progress (compact: an arrow and percent).
function sailsStatus(ship, compact) {
  if (!ship.sailTransition) return ship.sails === 'full' ? 'Full sails' : 'Battle sails';
  const sailProgress = Math.round((1 - ship.sailTransition / BATTLE_SAIL_TRANSITION_FRAMES) * 100);
  const raising = ship.targetSails === 'full';
  if (compact) return `Sails ${raising ? '↑' : '↓'}${sailProgress}%`;
  return `${raising ? 'Raising' : 'Lowering'} sail (${sailProgress}%)`;
}

const smokeSpriteCache = new Map();

// A gun-smoke puff (smoke-sprites.mjs) at the stage its age has reached.
function drawSmoke(context, puff, scale) {
  const devicePixels = scale * devicePixelScale();
  const detail = Math.max(1, Math.ceil(devicePixels / MAX_ART_PIXEL));
  const age = Math.max(0, SMOKE_LIFE_FRAMES - puff.life);
  const stage = Math.min(SMOKE_STAGES - 1, Math.floor(age * SMOKE_STAGES / SMOKE_LIFE_FRAMES));
  const sprite = cachedSprite(smokeSpriteCache, `${stage}|${puff.variant}|${detail}`, () => paintSmokeSprite({ stage, variant: puff.variant, detail }));
  if (!sprite) return;
  drawPixelSprite(context, sprite, puff.x, puff.y, Math.max(1, Math.round(devicePixels / detail)));
}

// Ring colours for hits and (any other effect) splashes.
const EFFECT_COLORS = { hit: '#f2ad4e', splash: '#d5edf0' };

function shipStatus(ship, compact = false) {
  const sails = sailsStatus(ship, compact);
  const reload = broadsideState(ship).label;
  const condition = damageLevel(ship.damage) || 'Sound';
  // The original's HUD shows each ship's battle speed / 4 (0xF602, 0xF65C).
  const speed = `speed ${Math.floor((ship.speed ?? 0) / 4)}`;
  if (compact) return `${ship.men} crew · ${ship.guns} guns · ${sails} · ${speed}`;
  return `${ship.men} crew · ${ship.guns} guns · ${reload} · ${condition} · ${sails} · ${speed}`;
}

// The forts' line: one fort's gunners, guns, loading and walls (min(3,
// hits/20), 0xECF0); for several, the gunners and guns left and how many
// still fire (each fort's walls show on the field).
const FORT_CONDITION = ['Walls intact', 'Walls scarred', 'Walls breached', 'Walls crumbling'];
function fortStatus(battle, compact) {
  const { forts, enemy } = battle;
  const counts = `${enemy.men} gunners · ${enemy.guns} guns`;
  if (forts.length > 1) return `${counts} · ${enemy.firing} of ${forts.length} firing`;
  const fort = forts[0] ?? enemy;
  const condition = FORT_CONDITION[fortDamageLevel(fort.damage)];
  if (compact) return `${counts} · ${condition}`;
  return `${counts} · ${broadsideState(fort).label} · ${condition}`;
}

function drawStatus(context, battle, width, top) {
  const compact = width <= 760;
  context.save();
  context.font = `${compact ? 11 : 13}px system-ui, sans-serif`;
  context.textBaseline = 'top';
  context.fillStyle = 'rgba(5,24,31,.9)';
  context.fillRect(14, top, Math.min(width - 28, 590), 74);
  context.strokeStyle = 'rgba(235,211,161,.45)'; context.strokeRect(14, top, Math.min(width - 28, 590), 74);
  context.fillStyle = '#f3e5c5'; context.fillText(`${compact ? 'You' : `Your ${battle.player.name}`}: ${shipStatus(battle.player, compact)}`, 25, top + 12);
  if (battle.fort) {
    context.fillStyle = '#e8c48a';
    const forts = battle.forts.length > 1 ? `${battle.forts.length} forts` : 'Fort';
    context.fillText(`${compact ? forts : `${forts} of ${battle.encounter.town}`}: ${fortStatus(battle, compact)}`, 25, top + 34);
    context.fillStyle = '#c7b897'; context.fillText(compact ? 'Run ashore by the town to land.' : 'Run your flagship ashore by the town to land your men.', 25, top + 56);
    context.restore();
    return;
  }
  context.fillStyle = '#e8c48a'; context.fillText(`${compact ? 'Enemy' : `${battle.encounter.flag} ${battle.enemy.name}`}: ${shipStatus(battle.enemy, compact)}`, 25, top + 34);
  const tactic = { close: 'closing rapidly', duel: 'turning to trade broadsides', flee: 'trying to escape' }[battle.enemy.tactic];
  context.fillStyle = '#c7b897'; context.fillText(`Enemy is ${tactic}.`, 25, top + 56);
  context.restore();
}

const seaCache = new Map();

// The pixel-art sea (sea-sprites.mjs), one art pixel per battle pixel,
// cycling through its swell frames about twice a second.
function drawSea(context, battle, { width, height }) {
  // Paint the whole swell cycle on first use, so it never hitches mid-battle.
  const frames = Array.from({ length: SEA_FRAMES }, (_, frame) => cachedSprite(seaCache, `${width}|${height}|${frame}`, () => paintSea({ width, height, frame })));
  const sea = frames[Math.floor(battle.frame / 16) % SEA_FRAMES];
  if (!sea) return;
  context.save();
  context.imageSmoothingEnabled = false;
  context.drawImage(sea.image, 0, 0, width, height);
  context.restore();
}

const windDialCache = new Map();
// The wind dial in the arena's top-left corner (in a fort battle, the first
// corner whose dial would lie over open water): 2 CSS pixels per art pixel,
// 1 on a small arena (phones) so it hides less of the sea. The sprite is
// drawn in whole device pixels, so the label is placed from the size it
// actually drew at (the context's own device-pixel ratio may be fractional).
function drawWindDial(context, battle, left, top, scale) {
  const sector = Math.round(battle.wind.direction / 16) & 15;
  const strength = battle.wind.strength;
  const dial = cachedSprite(windDialCache, `${sector}|${strength}`, () => paintWindDial({ direction: sector * 16, strength }));
  const cssPixel = scale < 1 ? 1 : 2;
  const deviceRatio = context.getTransform?.()?.a || 1;
  const pixel = Math.max(1, Math.round(cssPixel * deviceRatio));
  const size = (WIND_DIAL_SIZE * pixel) / deviceRatio;
  const { x, y } = battle.fort
    ? fortDialCorner(battle, { left, top, scale, width: Math.max(size, 70), height: size + 20 })
    : { x: left + 10, y: top + 10 };
  context.save();
  if (dial) drawPixelSprite(context, dial, x, y, pixel);
  context.font = '11px system-ui, sans-serif';
  context.textBaseline = 'top';
  context.fillStyle = '#f3e5c5';
  context.fillText(`Wind ${['light', 'medium', 'strong'][strength]}`, x, y + size + 4);
  context.restore();
}

// The screen corner for the wind dial: the first of top-left, top-right,
// bottom-left and bottom-right where the dial's box covers only water.
function fortDialCorner(battle, { left, top, scale, width, height }) {
  const right = left + battle.arena.width * scale - 10 - width;
  const bottom = top + battle.arena.height * scale - 10 - height;
  const corners = [[left + 10, top + 10], [right, top + 10], [left + 10, bottom], [right, bottom]];
  const overWater = ([x, y]) => [[x, y], [x + width, y], [x, y + height], [x + width, y + height]].every(([px, py]) => (
    fortFieldGround(battle.field, { x: (px - left) / scale, y: (py - top) / scale }) === 'water'));
  const [x, y] = corners.find(overWater) ?? corners[0];
  return { x, y };
}

const townSpriteCache = new Map();
const fortSpriteCache = new Map();
const groundCache = new WeakMap();

// The field's land and water in flat colours, one pixel per battle pixel:
// shown until the sailing map's painted terrain is ready (and in Node).
function groundImage(field) {
  return cachedSprite(groundCache, field, () => {
    const pixels = new Uint8ClampedArray(field.width * field.height * 4);
    for (let index = 0; index < field.cells.length; index += 1) {
      const [r, g, b] = field.cells[index] ? [120, 162, 78] : [20, 84, 102];
      pixels.set([r, g, b, 255], index * 4);
    }
    return { pixels, width: field.width, height: field.height, anchor: { x: 0, y: 0 } };
  });
}

// The fort field: the coast round the town cut from the navigation map
// (`backdrop` paints it as the sailing map does; flat colours until then),
// the town's marker and each fort, in the sailing map's pixel-art style. No
// landing place is marked: the town itself is the goal.
function drawFortField(context, battle, scale, backdrop) {
  const { field } = battle;
  const ground = groundImage(field);
  context.save();
  context.imageSmoothingEnabled = false;
  if (ground) context.drawImage(ground.image, 0, 0);
  backdrop?.(context, battle);
  context.restore();
  const nation = NATIONS[battle.encounter.flag] ? battle.encounter.flag : 'Spain';
  const pixel = Math.max(1, Math.round(scale * devicePixelScale() * .9));
  const town = cachedSprite(townSpriteCache, nation, () => ({
    pixels: paintTownSprite({ nation: { key: nation, ...NATIONS[nation] }, prosperity: 2, forts: 0 }),
    width: TOWN_SPRITE_WIDTH, height: TOWN_SPRITE_HEIGHT, anchor: TOWN_SPRITE_ANCHOR,
  }));
  if (town) drawPixelSprite(context, town, field.town.x, field.town.y, pixel);
  for (const fort of battle.forts) {
    const silenced = fort.guns <= 0;
    const level = fortDamageLevel(fort.damage);
    const sprite = cachedSprite(fortSpriteCache, `${nation}|${level}|${silenced}`, () => ({
      pixels: paintFortSprite({ nation: { key: nation, ...NATIONS[nation] }, level, silenced }),
      width: FORT_SPRITE_WIDTH, height: FORT_SPRITE_HEIGHT, anchor: FORT_SPRITE_ANCHOR,
    }));
    if (sprite) drawPixelSprite(context, sprite, fort.x, fort.y, pixel);
    if (!silenced) continue;
    context.save();
    context.font = `${Math.max(7, 10 / scale)}px system-ui, sans-serif`;
    context.textAlign = 'center'; context.textBaseline = 'top';
    context.fillStyle = '#f3e5c5';
    context.fillText('Silenced', fort.x, fort.y + 9);
    context.restore();
  }
}

// `backdrop(context, battle)`, if given, paints a fort field's terrain in
// field coordinates.
export function renderBattle(context, battle, width, height, { backdrop } = {}) {
  // On phones the HUD wraps onto three rows (style.css), so the status box
  // starts lower.
  const statusTop = width <= 760 ? 186 : 82;
  const playTop = statusTop + 86;
  const playBottom = height - (width <= 1100 ? 130 : 80);
  const availableHeight = Math.max(120, playBottom - playTop);
  const shown = battle.arena;
  const scale = Math.min((width - 24) / shown.width, availableHeight / shown.height);
  const offsetX = (width - shown.width * scale) / 2;
  const offsetY = playTop + Math.max(0, (availableHeight - shown.height * scale) / 2);
  context.save();
  context.translate(offsetX, offsetY);
  context.scale(scale, scale);
  context.fillStyle = '#165566'; context.fillRect(0, 0, shown.width, shown.height); // until the sea is painted, and in Node
  if (battle.fort) drawFortField(context, battle, scale, backdrop);
  else drawSea(context, battle, shown);
  for (const effect of battle.effects) {
    if (effect.kind === 'smoke') continue;
    const radius = Math.max(2, (24 - effect.life) / 2);
    context.strokeStyle = EFFECT_COLORS[effect.kind] ?? EFFECT_COLORS.splash;
    context.beginPath(); context.arc(effect.x, effect.y, radius, 0, Math.PI * 2); context.stroke();
  }
  // The nearer ship (lower on screen) is drawn last; balls fly above both.
  const ships = battle.fort ? [battle.player] : [battle.player, battle.enemy].sort((a, b) => a.y - b.y);
  for (const ship of ships) drawShip(context, ship, battle.wind.direction, scale);
  // Gun smoke hangs over the ships as it drifts downwind.
  for (const effect of battle.effects) if (effect.kind === 'smoke') drawSmoke(context, effect, scale);
  // A fort's ball is sized by that fort's guns.
  const shotGuns = (shot) => (shot.battery === undefined ? battle[shot.owner] : battle.forts[shot.battery]).guns;
  for (const shot of battle.projectiles) drawShot(context, shot, shotGuns(shot), scale);
  context.restore();
  drawWindDial(context, battle, offsetX, offsetY, scale);
  drawStatus(context, battle, width, statusTop);
}
