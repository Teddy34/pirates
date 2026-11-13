// Draws a sword fight: the backdrop, the crews, the two fencers and the
// morale panel, all from cached pixel sprites (fencer-sprites.mjs). Reads the
// fight record of sword-mechanics.mjs and never changes it.

import { BACKDROP, FENCER_ART, FIGHT_UNITS_PER_ART_PIXEL, LOOKS, paintBackdrop, paintFencer, paintSpark } from './fencer-sprites.mjs';
import { FIGHT_MODE, MOVE, WEAPONS } from './sword-mechanics.mjs';
import { cachedSprite, devicePixelScale, drawPixelSprite } from './sprite-canvas.mjs';

const SCENE_UNITS = BACKDROP.width * FIGHT_UNITS_PER_ART_PIXEL; // 520 fight x units
// Narrow screens show at least this much of the fight around the fencers.
const MIN_VISIBLE_UNITS = 300;
// Each fencer stands this far behind his fight x. Forward steps stop 10
// apart, and at that range the guarding blades cross while a strike just
// reaches the other fencer's body.
const BODY_OFFSET = 30;
// The crews keep to the deck: they line up from closer to the fight x.
const CREW_OFFSET = 12;
const MAX_MORALE = 47;
const spriteCache = new Map();

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
  const panelTop = compact ? 186 : 82; // below the three-row phone HUD
  const top = panelTop + 70;
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

// `view` is { fight, scene, flag, yourLook, foeLook, yourName, foeName }.
export function renderSwordFight(context, view, width, height) {
  const { fight } = view;
  const layout = swordLayout(width, height, (fight.you.x + fight.foe.x) / 2);
  const { pixelScale, unit, left, ground } = layout;
  const toX = (x) => left + x * unit;
  const art = FIGHT_UNITS_PER_ART_PIXEL * unit;

  context.fillStyle = view.scene === 'deck' ? '#a5d0de' : '#14203a';
  context.fillRect(0, 0, width, ground);
  const backdrop = cachedSprite(spriteCache, `b|${view.scene}|${view.flag}`, () => paintBackdrop(view.scene, view.flag));
  context.fillStyle = view.scene === 'deck' ? '#86592f' : '#3a3633';
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

function moraleBar(context, x, y, width, morale, color, alignRight) {
  context.fillStyle = 'rgba(0,0,0,.45)';
  context.fillRect(x, y, width, 10);
  const filled = Math.round((width * Math.max(0, morale)) / MAX_MORALE);
  context.fillStyle = color;
  context.fillRect(alignRight ? x + width - filled : x, y, filled, 10);
  context.strokeStyle = 'rgba(243,229,197,.6)';
  context.strokeRect(x + .5, y + .5, width - 1, 9);
}

function drawPanel(context, view, width, layout) {
  const { fight } = view;
  const { compact } = layout;
  const panelWidth = Math.min(width - 24, 760);
  const x = Math.round((width - panelWidth) / 2);
  const y = layout.panelTop;
  const half = panelWidth / 2 - 14;
  context.save();
  context.fillStyle = 'rgba(5,24,31,.88)';
  context.fillRect(x, y, panelWidth, 58);
  context.strokeStyle = 'rgba(235,211,161,.45)';
  context.strokeRect(x + .5, y + .5, panelWidth - 1, 57);
  context.textBaseline = 'top';
  context.font = `${compact ? 11 : 13}px system-ui, sans-serif`;
  const battle = fight.mode === FIGHT_MODE.battle;
  // His side on the left, as on the deck below.
  context.fillStyle = '#e8c48a';
  context.textAlign = 'left';
  context.fillText(view.foeName, x + 10, y + 7, half);
  context.fillText(`Morale ${fight.foe.morale}${battle ? ` · ${fight.foe.men} men` : ''}`, x + 10, y + 39, half);
  moraleBar(context, x + 10, y + 24, half, fight.foe.morale, '#d36b4c', false);
  context.fillStyle = '#f3e5c5';
  context.textAlign = 'right';
  context.fillText(`${view.yourName} · ${WEAPONS[fight.weapon]}`, x + panelWidth - 10, y + 7, half);
  context.fillText(`${battle ? `${fight.you.men} men · ` : ''}Morale ${fight.you.morale}`, x + panelWidth - 10, y + 39, half);
  moraleBar(context, x + panelWidth / 2 + 4, y + 24, half, fight.you.morale, '#6fb6c6', true);
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
