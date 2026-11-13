import { NATIONS } from './data.mjs';
import { BATTLE_SAIL_TRANSITION_FRAMES, FORT_FIELD, broadsideState, damageLevel, fieldToCompass, fortDamageLevel, fortFieldGround } from './battle-mechanics.mjs';
import { TOWN_SPRITE_ANCHOR, TOWN_SPRITE_HEIGHT, TOWN_SPRITE_WIDTH, paintTownSprite } from './town-sprites.mjs';
import { headingSector, paintShipSprite, shipArtLength } from './ship-sprites.mjs';
import { SEA_FRAMES, WIND_DIAL_SIZE, paintSea, paintWindDial } from './sea-sprites.mjs';
import { paintShotSprite, volleyTier } from './shot-sprites.mjs';
import { cachedSprite, devicePixelScale, drawPixelSprite } from './sprite-canvas.mjs';

const shipSpriteCache = new Map();

// The pixel-art ship (ship-sprites.mjs): one sprite per heading sector, sail
// state (shaded while changing), flag, wind and damage level. The hull is
// shipArtLength battle pixels long; on large screens the sprite is painted
// at `detail` art pixels per battle pixel so an art pixel stays at most
// about MAX_ART_PIXEL device pixels.
const MAX_ART_PIXEL = 3;
function drawShip(context, ship, wind, scale) {
  const devicePixels = scale * devicePixelScale();
  const detail = Math.max(1, Math.ceil(devicePixels / MAX_ART_PIXEL));
  const length = shipArtLength(ship.type, 'battle') * detail;
  const key = NATIONS[ship.flag] ? ship.flag : 'pirate';
  const sector = headingSector(ship.heading);
  const windSector = headingSector(wind);
  const level = Math.min(4, ship.damage >> 4);
  const changing = ship.sailTransition > 0;
  const sprite = cachedSprite(shipSpriteCache, `${ship.type}|${sector}|${ship.sails}|${changing}|${key}|${windSector}|${level}|${detail}`, () => paintShipSprite({
    type: ship.type, heading: sector * 16, sails: ship.sails, changing, nation: { key, ...NATIONS[key] },
    wind: windSector * 16, damage: level * 16, length,
  }));
  if (!sprite) return;
  const pixelScale = Math.max(1, Math.round(devicePixels / detail));
  drawPixelSprite(context, sprite, ship.x, ship.y, pixelScale);
}

const shotSpriteCache = new Map();

// A volley sprite sized by the shooter's current guns and turned to its
// flight (shot-sprites.mjs), with a faint streak trailing back.
// `spriteDirection` is the compass direction for the sprite; the trail is
// drawn in the field's frame.
function drawShot(context, shot, guns, scale, spriteDirection = shot.direction) {
  const devicePixels = scale * devicePixelScale();
  const detail = Math.max(1, Math.ceil(devicePixels / MAX_ART_PIXEL));
  const tier = volleyTier(guns);
  const sector = Math.round(spriteDirection / 16) & 15;
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

// Ring colours for hits, gun smoke and (any other effect) splashes.
const EFFECT_COLORS = { hit: '#f2ad4e', smoke: 'rgba(230,225,205,.45)', splash: '#d5edf0' };

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
    context.fillStyle = '#c7b897'; context.fillText(compact ? 'Make for the harbor quay to land.' : 'Make for the harbor quay beside the fort to land your men.', 25, top + 56);
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
  const sector = Math.round(fieldToCompass(battle.wind.direction, battle.orientation) / 16) & 15;
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

// A point of the turned field's picture (shown units) in the field's frame:
// the inverse of turnToCompass.
function shownToField(battle, sx, sy) {
  const { width, height } = battle.arena;
  return [
    { x: sx, y: sy },
    { x: sy, y: height - sx },
    { x: width - sx, y: height - sy },
    { x: width - sy, y: sx },
  ][battle.orientation ?? 0];
}

// The screen corner for the wind dial: the first of top-left, top-right,
// bottom-left and bottom-right where the dial's box covers only water.
function fortDialCorner(battle, { left, top, scale, width, height }) {
  const shown = shownSize(battle);
  const right = left + shown.width * scale - 10 - width;
  const bottom = top + shown.height * scale - 10 - height;
  const corners = [[left + 10, top + 10], [right, top + 10], [left + 10, bottom], [right, bottom]];
  const overWater = ([x, y]) => [[x, y], [x + width, y], [x, y + height], [x + width, y + height]].every(([px, py]) => (
    fortFieldGround(shownToField(battle, (px - left) / scale, (py - top) / scale)) === 'water'));
  const [x, y] = corners.find(overWater) ?? corners[0];
  return { x, y };
}

const townSpriteCache = new Map();

// The fort field (FORT_FIELD): the coast, the forts' rocky headlands, the
// town and its quay. Original placeholder shapes in battle pixels; the quay
// is labelled so the landing place does not rest on colour alone.
function drawFortField(context, battle, scale) {
  const { land, quay } = FORT_FIELD;
  context.save();
  for (const rect of land) {
    context.fillStyle = '#c9b07a';
    context.fillRect(rect.x, rect.y, rect.w, rect.h);
    context.fillStyle = '#5f7f45';
    context.fillRect(rect.x + 3, rect.y, Math.max(0, rect.w - 6), Math.max(0, rect.h - 5));
  }
  // Each headland's rocks along its waterline.
  context.fillStyle = '#6f6a5e';
  for (const headland of land.slice(3)) {
    for (let x = headland.x; x < headland.x + headland.w; x += 9) {
      context.beginPath(); context.arc(x + 4, headland.y + headland.h - 1, 4, 0, Math.PI * 2); context.fill();
    }
    for (let y = 64; y < headland.y + headland.h; y += 9) {
      for (const x of [headland.x, headland.x + headland.w]) {
        context.beginPath(); context.arc(x, y + 4, 4, 0, Math.PI * 2); context.fill();
      }
    }
  }
  // The quay: planking along the back of the cove, with its label.
  context.fillStyle = '#7a5532';
  context.fillRect(quay.x, quay.y - 4, quay.w, 6);
  context.strokeStyle = '#4b331d'; context.lineWidth = 1;
  for (let x = quay.x + 6; x < quay.x + quay.w; x += 8) {
    context.beginPath(); context.moveTo(x, quay.y - 4); context.lineTo(x, quay.y + 2); context.stroke();
  }
  context.setLineDash([3, 3]);
  context.strokeStyle = 'rgba(243,229,197,.7)';
  context.strokeRect(quay.x + .5, quay.y + 2.5, quay.w - 1, quay.h - 3);
  context.setLineDash([]);
  context.font = '9px system-ui, sans-serif';
  context.textAlign = 'center'; context.textBaseline = 'top';
  context.fillStyle = '#f3e5c5';
  upright(context, quay.x + quay.w / 2, quay.y + quay.h + 1, battle.orientation, () => context.fillText('Harbor quay', 0, 0));
  context.restore();

  // The town behind the quay (the sailing map's town art).
  const nation = NATIONS[battle.encounter.flag] ? battle.encounter.flag : 'Spain';
  const town = cachedSprite(townSpriteCache, nation, () => ({
    pixels: paintTownSprite({ nation: { key: nation, ...NATIONS[nation] }, prosperity: 2, forts: 0 }),
    width: TOWN_SPRITE_WIDTH, height: TOWN_SPRITE_HEIGHT, anchor: TOWN_SPRITE_ANCHOR,
  }));
  const pixel = Math.max(1, Math.round(scale * devicePixelScale() * .8));
  if (town) for (const x of [quay.x + 22, quay.x + 62]) drawPixelSprite(context, town, x, quay.y - 6, pixel);

  battle.forts.forEach((fort) => upright(context, fort.x, fort.y, battle.orientation, () => {
    drawFort(context, fort, { x: 0, y: 0 }, nation);
    if (fort.guns > 0) return;
    context.font = '9px system-ui, sans-serif';
    context.textAlign = 'center'; context.textBaseline = 'top';
    context.fillStyle = '#f3e5c5';
    context.fillText('Silenced', 0, 25);
  }));
}

// Draws with the origin at field point (x, y) and the field's quarter turns
// undone, so text and the fort's flag stand upright on a turned field.
function upright(context, x, y, orientation = 0, draw) {
  context.save();
  context.translate(x, y);
  context.rotate(-orientation * Math.PI / 2);
  draw();
  context.restore();
}

// The field's frame on screen: a fort field turned by `orientation` quarter
// turns clockwise (fortOrientation), so the picture matches the compass.
// The size is the one shown on screen.
function shownSize(battle) {
  const { width, height } = battle.arena;
  return (battle.orientation ?? 0) % 2 ? { width: height, height: width } : { width, height };
}

function turnToCompass(context, battle) {
  const { width, height } = battle.arena;
  const turns = battle.orientation ?? 0;
  const origin = [[0, 0], [height, 0], [width, height], [0, width]][turns];
  context.translate(origin[0], origin[1]);
  context.rotate(turns * Math.PI / 2);
}

// A square stone fort with corner bastions, gun ports, its flag (struck once
// its guns are silenced), and smoke and breaches as its damage level rises.
function drawFort(context, enemy, { x, y }, nation) {
  const level = fortDamageLevel(enemy.damage);
  context.save();
  context.translate(x, y);
  context.fillStyle = '#8d877a';
  context.fillRect(-22, -22, 44, 44);
  context.fillStyle = '#a7a090';
  for (const [bx, by] of [[-22, -22], [22, -22], [-22, 22], [22, 22]]) {
    context.beginPath(); context.moveTo(bx, by - 8); context.lineTo(bx + 8, by); context.lineTo(bx, by + 8); context.lineTo(bx - 8, by); context.closePath(); context.fill();
  }
  context.fillStyle = '#6d6759';
  context.fillRect(-14, -14, 28, 28);
  context.fillStyle = '#26221c';
  for (let gx = -15; gx <= 15; gx += 10) { context.fillRect(gx - 2, 20, 4, 3); context.fillRect(-23, gx - 2, 3, 4); context.fillRect(20, gx - 2, 3, 4); }
  // Breaches: dark gaps in the wall, one more per level.
  context.fillStyle = '#3a342b';
  for (const [bx, by] of [[-8, 18], [16, -6], [-20, 6]].slice(0, level)) context.fillRect(bx, by, 7, 5);
  context.strokeStyle = '#3a2a1a'; context.lineWidth = 1.5;
  context.beginPath(); context.moveTo(0, -4); context.lineTo(0, -26); context.stroke();
  context.fillStyle = NATIONS[nation]?.color ?? '#c9a24a';
  if (enemy.guns > 0) context.fillRect(0, -26, 12, 7);
  if (level) {
    context.fillStyle = 'rgba(70,64,58,.45)';
    for (let puff = 0; puff < level; puff += 1) { context.beginPath(); context.arc(-6 + 9 * puff, -30 - 5 * puff, 5 + puff, 0, Math.PI * 2); context.fill(); }
  }
  context.restore();
}

export function renderBattle(context, battle, width, height) {
  // On phones the HUD wraps onto three rows (style.css), so the status box
  // starts lower.
  const statusTop = width <= 760 ? 186 : 82;
  const playTop = statusTop + 86;
  const playBottom = height - (width <= 1100 ? 130 : 80);
  const availableHeight = Math.max(120, playBottom - playTop);
  const shown = shownSize(battle);
  const scale = Math.min((width - 24) / shown.width, availableHeight / shown.height);
  const offsetX = (width - shown.width * scale) / 2;
  const offsetY = playTop + Math.max(0, (availableHeight - shown.height * scale) / 2);
  context.save();
  context.translate(offsetX, offsetY);
  context.scale(scale, scale);
  context.fillStyle = '#165566'; context.fillRect(0, 0, shown.width, shown.height); // until the sea is painted, and in Node
  drawSea(context, battle, shown);
  // Everything below is in the field's frame; sprites stay upright and take
  // their compass heading.
  turnToCompass(context, battle);
  const compass = (angle) => fieldToCompass(angle, battle.orientation);
  if (battle.fort) drawFortField(context, battle, scale);
  for (const effect of battle.effects) {
    const radius = Math.max(2, (24 - effect.life) / 2);
    context.strokeStyle = EFFECT_COLORS[effect.kind] ?? EFFECT_COLORS.splash;
    context.beginPath(); context.arc(effect.x, effect.y, radius, 0, Math.PI * 2); context.stroke();
  }
  // The nearer ship (lower on screen) is drawn last; balls fly above both.
  const ships = battle.fort ? [battle.player] : [battle.player, battle.enemy].sort((a, b) => a.y - b.y);
  for (const ship of ships) drawShip(context, { ...ship, heading: compass(ship.heading) }, compass(battle.wind.direction), scale);
  // A fort's ball is sized by that fort's guns.
  const shotGuns = (shot) => (shot.battery === undefined ? battle[shot.owner] : battle.forts[shot.battery]).guns;
  for (const shot of battle.projectiles) drawShot(context, shot, shotGuns(shot), scale, compass(shot.direction));
  context.restore();
  drawWindDial(context, battle, offsetX, offsetY, scale);
  drawStatus(context, battle, width, statusTop);
}
