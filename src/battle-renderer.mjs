import { NATIONS } from './data.mjs';
import { BATTLE_SAIL_TRANSITION_FRAMES, damageLevel } from './battle-mechanics.mjs';

function sailSpread(ship) {
  const current = ship.sails === 'full' ? 7 : 4;
  if (!ship.sailTransition) return current;
  const target = ship.targetSails === 'full' ? 7 : 4;
  const progress = 1 - ship.sailTransition / BATTLE_SAIL_TRANSITION_FRAMES;
  return current + (target - current) * progress;
}

function drawShip(context, ship, color) {
  context.save();
  context.translate(ship.x, ship.y);
  context.rotate(ship.heading / 256 * Math.PI * 2);
  context.fillStyle = 'rgba(0,0,0,.25)';
  context.beginPath(); context.ellipse(2, 3, 6 + ship.type * .35, 11 + ship.type * .55, 0, 0, Math.PI * 2); context.fill();
  context.fillStyle = '#63371f'; context.strokeStyle = '#24150d'; context.lineWidth = 1;
  context.beginPath(); context.moveTo(0, -10 - ship.type * .5); context.lineTo(5 + ship.type * .3, 7); context.lineTo(0, 11 + ship.type * .5); context.lineTo(-5 - ship.type * .3, 7); context.closePath(); context.fill(); context.stroke();
  context.strokeStyle = '#2b2116'; context.beginPath(); context.moveTo(0, -8); context.lineTo(0, 7); context.stroke();
  const spread = sailSpread(ship);
  context.fillStyle = ship.sailTransition ? '#c9b886' : '#ead9aa';
  context.beginPath(); context.moveTo(0, -6); context.lineTo(spread, 2); context.lineTo(0, 5); context.closePath(); context.fill();
  context.beginPath(); context.moveTo(0, -5); context.lineTo(-spread, 2); context.lineTo(0, 5); context.closePath(); context.fill();
  context.fillStyle = color; context.beginPath(); context.moveTo(0, -10); context.lineTo(7, -7); context.lineTo(0, -5); context.closePath(); context.fill();
  context.restore();
}

function shipStatus(ship, compact = false) {
  const sailProgress = Math.round((1 - ship.sailTransition / BATTLE_SAIL_TRANSITION_FRAMES) * 100);
  const sails = ship.sailTransition
    ? compact
      ? `Sails ${ship.targetSails === 'full' ? '↑' : '↓'}${sailProgress}%`
      : `${ship.targetSails === 'full' ? 'Raising' : 'Lowering'} sail (${sailProgress}%)`
    : ship.sails === 'full' ? 'Full sails' : 'Battle sails';
  const reload = ship.reload > 0 ? `Reload ${ship.reload}` : ship.guns > 0 ? 'Loaded' : 'Disarmed';
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
    const progress = 1 - shot.remaining / shot.total;
    const x = shot.x + (shot.landingX - shot.x) * progress;
    const y = shot.y + (shot.landingY - shot.y) * progress;
    context.fillStyle = '#19130f'; context.beginPath(); context.arc(x, y, 1.8, 0, Math.PI * 2); context.fill();
  }
  for (const effect of battle.effects) {
    const radius = Math.max(2, (24 - effect.life) / 2);
    context.strokeStyle = effect.kind === 'hit' ? '#f2ad4e' : effect.kind === 'smoke' ? 'rgba(230,225,205,.45)' : '#d5edf0';
    context.beginPath(); context.arc(effect.x, effect.y, radius, 0, Math.PI * 2); context.stroke();
  }
  drawShip(context, battle.player, NATIONS[battle.player.flag]?.color ?? NATIONS.pirate.color);
  drawShip(context, battle.enemy, NATIONS[battle.enemy.flag]?.color ?? NATIONS.pirate.color);
  const windAngle = battle.wind.direction / 256 * Math.PI * 2;
  context.strokeStyle = '#f3e5c5'; context.fillStyle = '#f3e5c5'; context.lineWidth = 2 / scale;
  context.beginPath(); context.moveTo(30, 35); context.lineTo(30 + Math.sin(windAngle) * 24, 35 - Math.cos(windAngle) * 24); context.stroke();
  context.font = `${11 / scale}px system-ui, sans-serif`; context.fillText(`Wind ${['light', 'medium', 'strong'][battle.wind.strength]}`, 8, 58);
  context.restore();
  drawStatus(context, battle, width, statusTop);
}
