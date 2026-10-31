import { NATIONS } from './data.mjs';
import { BATTLE_SAIL_TRANSITION_FRAMES, broadsideState, damageLevel, hitBox } from './battle-mechanics.mjs';
import { headingSector, paintShipSprite, shipArtLength } from './ship-sprites.mjs';
import { cachedSprite, devicePixelScale, drawPixelSprite } from './sprite-canvas.mjs';

// The hit box is fixed and axis-aligned (sea_battles.md §3), so it is drawn
// unrotated as a faint outline, and the sprite's hull is drawn about as long
// as the box's half-width plus half-height.
function drawHitBox(context, ship, scale) {
  const { halfWidth, halfHeight } = hitBox(ship);
  context.save();
  context.strokeStyle = 'rgba(235,245,240,.16)';
  context.lineWidth = 1 / scale;
  context.setLineDash([3 / scale, 3 / scale]);
  context.strokeRect(ship.x - halfWidth, ship.y - halfHeight, 2 * halfWidth, 2 * halfHeight);
  context.restore();
}

const shipSpriteCache = new Map();

// The pixel-art ship (ship-sprites.mjs): one sprite per heading sector, sail
// state, flag, wind and damage level, drawn at a whole number of device
// pixels per art pixel.
function drawShip(context, ship, wind, scale) {
  const { halfWidth, halfHeight } = hitBox(ship);
  const length = shipArtLength(ship.type, 'battle');
  const key = NATIONS[ship.flag] ? ship.flag : 'pirate';
  const sector = headingSector(ship.heading);
  const windSector = headingSector(wind);
  const level = Math.min(4, ship.damage >> 4);
  const sprite = cachedSprite(shipSpriteCache, `${ship.type}|${sector}|${ship.sails}|${key}|${windSector}|${level}`, () => paintShipSprite({
    type: ship.type, heading: sector * 16, sails: ship.sails, nation: { key, ...NATIONS[key] },
    wind: windSector * 16, damage: level * 16, length,
  }));
  if (!sprite) return;
  const pixelScale = Math.max(1, Math.round(((halfWidth + halfHeight) * scale * devicePixelScale()) / length));
  drawPixelSprite(context, sprite, ship.x, ship.y, pixelScale);
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
  if (compact) return `${ship.men} crew · ${ship.guns} guns · ${sails}`;
  return `${ship.men} crew · ${ship.guns} guns · ${reload} · ${condition} · ${sails}`;
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
  context.strokeStyle = 'rgba(210,238,225,.13)'; context.lineWidth = 1 / scale;
  for (let y = 8; y < battle.arena.height; y += 16) {
    context.beginPath();
    for (let x = 0; x <= battle.arena.width; x += 16) {
      const wave = y + Math.sin((x + battle.frame) / 18) * 2;
      if (x === 0) context.moveTo(x, wave); else context.lineTo(x, wave);
    }
    context.stroke();
  }
  for (const shot of battle.projectiles) {
    context.fillStyle = '#19130f'; context.beginPath(); context.arc(shot.x, shot.y, 1.8, 0, Math.PI * 2); context.fill();
  }
  for (const effect of battle.effects) {
    const radius = Math.max(2, (24 - effect.life) / 2);
    context.strokeStyle = effect.kind === 'hit' ? '#f2ad4e' : effect.kind === 'smoke' ? 'rgba(230,225,205,.45)' : '#d5edf0';
    context.beginPath(); context.arc(effect.x, effect.y, radius, 0, Math.PI * 2); context.stroke();
  }
  drawHitBox(context, battle.player, scale);
  drawHitBox(context, battle.enemy, scale);
  // The nearer ship (lower on screen) is drawn last.
  for (const ship of [battle.player, battle.enemy].sort((a, b) => a.y - b.y)) drawShip(context, ship, battle.wind.direction, scale);
  const windAngle = battle.wind.direction / 256 * Math.PI * 2;
  context.strokeStyle = '#f3e5c5'; context.fillStyle = '#f3e5c5'; context.lineWidth = 2 / scale;
  context.beginPath(); context.moveTo(30, 35); context.lineTo(30 + Math.sin(windAngle) * 24, 35 - Math.cos(windAngle) * 24); context.stroke();
  context.font = `${11 / scale}px system-ui, sans-serif`; context.fillText(`Wind ${['light', 'medium', 'strong'][battle.wind.strength]}`, 8, 58);
  context.restore();
  drawStatus(context, battle, width, statusTop);
}
