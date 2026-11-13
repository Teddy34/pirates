import { NATIONS } from './data.mjs';
import { BATTLE_SAIL_TRANSITION_FRAMES, broadsideState, damageLevel } from './battle-mechanics.mjs';
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

function shipStatus(ship, compact = false) {
  const sailProgress = Math.round((1 - ship.sailTransition / BATTLE_SAIL_TRANSITION_FRAMES) * 100);
  const sails = ship.sailTransition
    ? compact
      ? `Sails ${ship.targetSails === 'full' ? '↑' : '↓'}${sailProgress}%`
      : `${ship.targetSails === 'full' ? 'Raising' : 'Lowering'} sail (${sailProgress}%)`
    : ship.sails === 'full' ? 'Full sails' : 'Battle sails';
  const reload = broadsideState(ship).label;
  const condition = damageLevel(ship.damage) || 'Sound';
  // The original's HUD shows each ship's battle speed / 4 (0xF602, 0xF65C).
  const speed = `speed ${Math.floor((ship.speed ?? 0) / 4)}`;
  if (compact) return `${ship.men} crew · ${ship.guns} guns · ${sails} · ${speed}`;
  return `${ship.men} crew · ${ship.guns} guns · ${reload} · ${condition} · ${sails} · ${speed}`;
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
  context.fillStyle = '#e8c48a'; context.fillText(`${compact ? 'Enemy' : `${battle.encounter.flag} ${battle.enemy.name}`}: ${shipStatus(battle.enemy, compact)}`, 25, top + 34);
  const tactic = { close: 'closing rapidly', duel: 'turning to trade broadsides', flee: 'trying to escape' }[battle.enemy.tactic];
  context.fillStyle = '#c7b897'; context.fillText(`Enemy is ${tactic}.`, 25, top + 56);
  context.restore();
}

const seaCache = new Map();

// The pixel-art sea (sea-sprites.mjs), one art pixel per battle pixel,
// cycling through its swell frames about twice a second.
function drawSea(context, battle) {
  const { width, height } = battle.arena;
  const frame = Math.floor(battle.frame / 16) % SEA_FRAMES;
  const sea = cachedSprite(seaCache, `${width}|${height}|${frame}`, () => paintSea({ width, height, frame }));
  if (!sea) return;
  context.save();
  context.imageSmoothingEnabled = false;
  context.drawImage(sea.image, 0, 0, width, height);
  context.restore();
}

const windDialCache = new Map();
const WIND_DIAL_PIXEL = 2; // CSS pixels per art pixel

// The wind dial in the arena's top-left corner, kept one size on screen.
function drawWindDial(context, battle, left, top) {
  const sector = Math.round(battle.wind.direction / 16) & 15;
  const strength = battle.wind.strength;
  const dial = cachedSprite(windDialCache, `${sector}|${strength}`, () => paintWindDial({ direction: sector * 16, strength }));
  const pixel = WIND_DIAL_PIXEL * devicePixelScale();
  const x = left + 10;
  const y = top + 10;
  context.save();
  if (dial) drawPixelSprite(context, dial, x, y, pixel);
  context.font = '11px system-ui, sans-serif';
  context.textBaseline = 'top';
  context.fillStyle = '#f3e5c5';
  context.fillText(`Wind ${['light', 'medium', 'strong'][strength]}`, x, y + WIND_DIAL_SIZE * WIND_DIAL_PIXEL + 4);
  context.restore();
}

export function renderBattle(context, battle, width, height) {
  const statusTop = width <= 760 ? 140 : 82;
  const playTop = statusTop + 86;
  const playBottom = height - (width <= 1100 ? 130 : 80);
  const availableHeight = Math.max(120, playBottom - playTop);
  const scale = Math.min((width - 24) / battle.arena.width, availableHeight / battle.arena.height);
  const offsetX = (width - battle.arena.width * scale) / 2;
  const offsetY = playTop + Math.max(0, (availableHeight - battle.arena.height * scale) / 2);
  context.save();
  context.translate(offsetX, offsetY);
  context.scale(scale, scale);
  context.fillStyle = '#165566'; context.fillRect(0, 0, battle.arena.width, battle.arena.height);
  drawSea(context, battle);
  for (const effect of battle.effects) {
    const radius = Math.max(2, (24 - effect.life) / 2);
    context.strokeStyle = effect.kind === 'hit' ? '#f2ad4e' : effect.kind === 'smoke' ? 'rgba(230,225,205,.45)' : '#d5edf0';
    context.beginPath(); context.arc(effect.x, effect.y, radius, 0, Math.PI * 2); context.stroke();
  }
  // The nearer ship (lower on screen) is drawn last; balls fly above both.
  for (const ship of [battle.player, battle.enemy].sort((a, b) => a.y - b.y)) drawShip(context, ship, battle.wind.direction, scale);
  for (const shot of battle.projectiles) drawShot(context, shot, battle[shot.owner].guns, scale);
  context.restore();
  drawWindDial(context, battle, offsetX, offsetY);
  drawStatus(context, battle, width, statusTop);
}
