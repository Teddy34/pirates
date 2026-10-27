import {
  WORLD, NATIONS, SHIPS, LAND_SHAPES, MONTHS,
} from './data.mjs';
import {
  TICKS_PER_DAY, TICKS_PER_HALF_DAY, TICKS_PER_WIND_SHIFT,
  clamp, createRng, targetSailingSpeed, stepSailingSpeed,
  shiftWind, cloudCountForMonth, navigationSkill, turnHeadingDownwind,
  createVoyageClouds, driftClouds, nearestCloudDistancePixels, applyProvisionalBattleOutcome,
  capturedShipPlunder, capturedTownPlunder, applyTownCapture, capturedShipRecruits,
  acceptsRudderInput,
  consumeDailyFood, foodDays, encounterRoll, chooseEncounterTier,
  harborAttempt, sneakAttempt, tavernRecruits, morale, dividePlunder, startNewExpedition,
  merchantFoodPrice, merchantStock, updateTownMonthly, advanceDate,
} from './mechanics.mjs';

const SAVE_KEY = 'fortune-and-freedom-save-v1';
const SAVE_VERSION = 3;
const TICK_SECONDS = 0.125;
const ZOOM_STEP = 4;
const MIN_ZOOM = 16;
const MAX_ZOOM = 64;
const NATION_ORDER = ['Spain', 'England', 'France', 'Holland'];
const DIFFICULTY_NAMES = ['Apprentice', 'Journeyman', 'Adventurer', 'Swashbuckler'];
const WIND_NAMES = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const startScreen = document.querySelector('#start-screen');
const form = document.querySelector('#new-game-form');
const continueButton = document.querySelector('#continue-button');
const dialog = document.querySelector('#event-dialog');
const dialogKicker = document.querySelector('#dialog-kicker');
const dialogTitle = document.querySelector('#dialog-title');
const dialogBody = document.querySelector('#dialog-body');
const dialogActions = document.querySelector('#dialog-actions');
const hud = document.querySelector('#hud');
const controls = document.querySelector('#controls');
const logElement = document.querySelector('#log');
const dockButton = document.querySelector('#dock-button');
const pauseButton = document.querySelector('#pause-button');
const zoomOutButton = document.querySelector('#zoom-out-button');
const zoomInButton = document.querySelector('#zoom-in-button');
const lowerSailsButton = document.querySelector('#lower-sails-button');
const raiseSailsButton = document.querySelector('#raise-sails-button');

const labels = {
  captain: document.querySelector('#captain-label'), date: document.querySelector('#date-label'),
  speed: document.querySelector('#speed-label'), wind: document.querySelector('#wind-label'),
  sails: document.querySelector('#sails-label'),
  food: document.querySelector('#food-label'), crew: document.querySelector('#crew-label'),
  gold: document.querySelector('#gold-label'), nearest: document.querySelector('#nearest-label'),
};

let state = null;
let rng = createRng();
let accumulator = 0;
let lastFrame = performance.now();
let viewWidth = innerWidth;
let viewHeight = innerHeight;
let worldCells = null;
let worldMapLayer = null;
let scenarios = null;
let cameraZoom = MIN_ZOOM;
let wheelZoomDelta = 0;
const mapCache = new Map();
const input = { left: false, right: false };

function newState(options) {
  const era = String(options.era || 1680);
  const scenario = scenarios[era];
  const difficulty = Number(options.difficulty ?? 1);
  const requestedNationality = options.nationality || 'France';
  const nationality = scenario.starts[requestedNationality] ? requestedNationality : 'France';
  const start = scenario.starts[nationality];
  const [startX, startY] = start.points[difficulty];
  const favour = Object.fromEntries([...NATION_ORDER, 'pirate'].map((nation, index) => [nation, start.favour[index]]));
  const ranks = Object.fromEntries(NATION_ORDER.map((nation, index) => [nation, start.ranks[index]]));
  const diplomacy = Object.fromEntries(NATION_ORDER.map((nation, row) => [
    nation, Object.fromEntries(NATION_ORDER.map((other, column) => [other, start.diplomacy[row][column]])),
  ]));
  return {
    version: SAVE_VERSION,
    era,
    captain: options.captain || 'Anonymous',
    nationality,
    difficulty,
    ability: options.ability,
    seed: (Date.now() ^ Math.floor(performance.now() * 1000)) >>> 0,
    rngState: 1,
    mode: 'sailing', paused: false, tick: 0,
    calendar: { day: 0, month: 0, year: Number(era) },
    player: {
      x: startX, y: startY, heading: 128, speed: 4, wind: 192, sails: 'full',
      ships: [...start.ships], crew: start.crew, cannon: start.cannon,
      foodFixed: start.food * 256, goods: start.goods, partyGold: start.gold,
      personalWealth: 0, reputation: 0, monthsAtSea: -16,
      favour, ranks,
    },
    towns: scenario.towns.map((town) => ({ ...town, alert: 0 })),
    nearestTownIndex: 0,
    diplomacy,
    worldNews: initialDiplomacyNews(diplomacy),
    logs: ['A westward trade wind fills the sails.', `The ${start.name} expedition begins.`],
    visit: null,
  };
}

function initialDiplomacyNews(diplomacy) {
  const news = [];
  for (let first = 0; first < NATION_ORDER.length; first += 1) {
    for (let second = first + 1; second < NATION_ORDER.length; second += 1) {
      const nationA = NATION_ORDER[first];
      const nationB = NATION_ORDER[second];
      const relation = diplomacy[nationA][nationB];
      if (relation === -1) news.push(`${nationA} is at war with ${nationB}.`);
      if (relation === 1) news.push(`${nationA} is allied with ${nationB}.`);
    }
  }
  return news;
}

async function startGame(nextState) {
  state = nextState;
  state.clouds ??= [];
  // State becomes visible to animation frames before the asynchronous map
  // load completes. Keep those frames inert until every sailing field exists.
  state.paused = true;
  state.era ??= '1560';
  state.nationality ??= 'France';
  state.player.favour.pirate ??= 0;
  state.player.sails ??= 'full';
  state.diplomacy ??= newState({ era: state.era, captain: state.captain, nationality: state.nationality, difficulty: state.difficulty, ability: state.ability }).diplomacy;
  state.worldNews ??= initialDiplomacyNews(state.diplomacy);
  await loadWorldMap(state.era);
  movePlayerToNavigableCell();
  rng = createRng(state.seed);
  if (state.rngState && state.rngState !== 1) rng.state = state.rngState;
  // Loading begins a fresh sailing session in the original: trade wind,
  // reset cloud distance, and a new seasonal cloud arrangement.
  state.player.wind = 192;
  setupClouds();
  state.paused = false;
  state.mode = 'sailing';
  startScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  controls.classList.remove('hidden');
  logElement.classList.remove('hidden');
  updateNearestTown();
  updateLog();
  updateInterface();
}

function saveGame(showMessage = true) {
  if (!state) return;
  state.rngState = rng.state;
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  if (showMessage) addLog('Voyage saved in this browser.');
}

function loadGame() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (![1, 2, SAVE_VERSION].includes(saved?.version) || !saved.player || !saved.towns) return null;
    // Version 2 added voyage cloud state; version 3 adds captain nationality.
    // Older saves used the French career and migrate to that flag in startGame.
    saved.version = SAVE_VERSION;
    return saved;
  } catch {
    return null;
  }
}

function resize() {
  const pixelRatio = Math.min(devicePixelRatio || 1, 2);
  viewWidth = innerWidth;
  viewHeight = innerHeight;
  canvas.width = Math.round(viewWidth * pixelRatio);
  canvas.height = Math.round(viewHeight * pixelRatio);
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

async function loadScenarios() {
  const response = await fetch(new URL('../assets/scenarios.json', import.meta.url));
  if (!response.ok) throw new Error(`scenario request failed: ${response.status}`);
  const payload = await response.json();
  if (payload.version !== 3) throw new Error('unsupported scenario data version');
  scenarios = payload.eras;
}

async function loadWorldMap(era) {
  if (mapCache.has(era)) {
    ({ cells: worldCells, layer: worldMapLayer } = mapCache.get(era));
    return;
  }
  const response = await fetch(new URL(`../assets/world-${era}.bin`, import.meta.url));
  if (!response.ok) throw new Error(`map request failed: ${response.status}`);
  const packed = new Uint8Array(await response.arrayBuffer());
  if (packed.length !== WORLD.width * WORLD.height / 4) throw new Error('unexpected navigation map size');

  worldCells = new Uint8Array(WORLD.width * WORLD.height);
  for (let index = 0; index < worldCells.length; index += 1) {
    worldCells[index] = (packed[index >> 2] >> ((index & 3) * 2)) & 3;
  }
  worldMapLayer = buildWorldMapLayer(worldCells);
  mapCache.set(era, { cells: worldCells, layer: worldMapLayer });
}

function buildWorldMapLayer(cells) {
  const layer = document.createElement('canvas');
  layer.width = WORLD.width * 2;
  layer.height = WORLD.height * 2;
  const layerContext = layer.getContext('2d');
  const image = layerContext.createImageData(layer.width, layer.height);
  const palette = [
    [[18, 70, 87], [22, 78, 94], [17, 66, 84]],
    [[91, 111, 67], [103, 119, 72], [82, 103, 61]],
    [[184, 157, 88], [166, 143, 78], [198, 170, 96]],
    [[214, 184, 91], [226, 198, 106], [194, 157, 69]],
  ];
  for (let y = 0; y < WORLD.height; y += 1) {
    for (let x = 0; x < WORLD.width; x += 1) {
      const cell = cells[y * WORLD.width + x];
      const color = palette[cell][Math.abs((x * 17 + y * 31) % 3)];
      for (let py = 0; py < 2; py += 1) {
        for (let px = 0; px < 2; px += 1) {
          const offset = ((y * 2 + py) * layer.width + x * 2 + px) * 4;
          image.data[offset] = color[0] + (px === py ? 2 : -2);
          image.data[offset + 1] = color[1] + (px === py ? 2 : -2);
          image.data[offset + 2] = color[2] + (px === py ? 2 : -2);
          image.data[offset + 3] = 255;
        }
      }
    }
  }
  layerContext.putImageData(image, 0, 0);
  return layer;
}

function isNavigable(x, y) {
  if (!worldCells) return true;
  const col = Math.floor(x);
  const row = Math.floor(y);
  if (col < 0 || row < 0 || col >= WORLD.width || row >= WORLD.height) return false;
  return worldCells[row * WORLD.width + col] === 0;
}

function movePlayerToNavigableCell() {
  if (isNavigable(state.player.x, state.player.y)) return;
  const originX = Math.floor(state.player.x);
  const originY = Math.floor(state.player.y);
  for (let distance = 1; distance <= 12; distance += 1) {
    for (let dy = -distance; dy <= distance; dy += 1) {
      const dx = distance - Math.abs(dy);
      for (const xDirection of dx === 0 ? [0] : [-dx, dx]) {
        const x = originX + xDirection;
        const y = originY + dy;
        if (isNavigable(x, y)) {
          state.player.x = x + .5;
          state.player.y = y + .5;
          return;
        }
      }
    }
  }
  throw new Error(`no navigable water near start point ${originX},${originY}`);
}

function nearestTown() {
  return state.towns[state.nearestTownIndex];
}

function updateNearestTown() {
  let bestIndex = 0;
  let bestDistance = Infinity;
  state.towns.forEach((town, index) => {
    const distance = Math.abs(state.player.x - town.x) + Math.abs(state.player.y - town.y);
    if (distance < bestDistance) { bestDistance = distance; bestIndex = index; }
  });
  state.nearestTownIndex = bestIndex;
  return bestDistance;
}

function fleetCapacity() {
  return state.player.ships.reduce((sum, ship) => sum + SHIPS[ship].capacity, 0);
}

function cargoCapacity() {
  return state.player.ships.reduce((sum, ship) => sum + SHIPS[ship].cargo, 0);
}

function cargoRoom() {
  return Math.max(0, cargoCapacity() - Math.floor(state.player.foodFixed / 256)
    - state.player.goods - Math.floor(state.player.cannon / 2));
}

function propagateFavour(nation, delta) {
  const adjustWithoutCrossingCommission = (value, change) => {
    const next = value + change;
    return value < 2 ? Math.min(1, next) : Math.max(2, next);
  };
  state.player.favour[nation] = adjustWithoutCrossingCommission(state.player.favour[nation], delta);
  for (const other of NATION_ORDER) {
    if (other === nation) continue;
    const relation = state.diplomacy[nation]?.[other] ?? 0;
    state.player.favour[other] = adjustWithoutCrossingCommission(
      state.player.favour[other], delta * relation,
    );
  }
}

function fleetSpeedRow() {
  return state.player.ships.reduce((slowest, ship) =>
    SHIPS[ship].sizeClass > SHIPS[slowest].sizeClass ? ship : slowest, state.player.ships[0]);
}

function setupClouds() {
  state.clouds = createVoyageClouds({
    count: cloudCountForMonth(state.calendar.month),
    playerX: state.player.x,
    playerY: state.player.y,
    rng,
  });
  // The original voyage reset starts at 999; the first cloud update at the
  // end of the tick supplies the distance used by the following tick.
  state.player.cloudDistancePixels = 999;
  state.player.voyageTick = 63;
}

function stepSimulation() {
  if (!state || state.paused || state.mode !== 'sailing') return;
  const player = state.player;
  state.tick += 1;
  player.voyageTick = (player.voyageTick ?? 63) + 1;

  if (acceptsRudderInput(state.tick)) {
    if (input.left) player.heading = (player.heading - 16) & 0xff;
    if (input.right) player.heading = (player.heading + 16) & 0xff;
  }

  const cloudDistancePixels = player.cloudDistancePixels ?? 999;
  const skill = navigationSkill(state.difficulty, state.ability === 'navigation');

  const windTarget = targetSailingSpeed({
    heading: player.heading, wind: player.wind,
    speedRow: scenarios[state.era].speeds[fleetSpeedRow()],
    difficulty: state.difficulty, hasNavigation: state.ability === 'navigation',
    cloudDistancePixels,
  });
  if (player.voyageTick % 16 === 0 && cloudDistancePixels < 64 * skill) {
    player.heading = turnHeadingDownwind(player.heading, player.wind);
  }
  player.speed = stepSailingSpeed(player.speed, windTarget, player.sails);
  const angle = player.heading / 256 * Math.PI * 2;
  const nextX = clamp(player.x + Math.sin(angle) * player.speed / TICKS_PER_DAY, 1, WORLD.width - 1);
  const nextY = clamp(player.y - Math.cos(angle) * player.speed / TICKS_PER_DAY, 1, WORLD.height - 1);
  if (isNavigable(nextX, nextY)) {
    player.x = nextX;
    player.y = nextY;
  } else if (isNavigable(nextX, player.y)) {
    player.x = nextX;
  } else if (isNavigable(player.x, nextY)) {
    player.y = nextY;
  }

  if (player.voyageTick % TICKS_PER_WIND_SHIFT === 0) player.wind = shiftWind(player.wind, rng);
  if (state.tick % TICKS_PER_HALF_DAY === 0) halfDayUpdate();
  if (state.tick % TICKS_PER_DAY === 0) dailyUpdate();
  state.clouds = driftClouds({
    clouds: state.clouds, playerX: player.x, playerY: player.y, wind: player.wind, rng,
  });
  player.cloudDistancePixels = nearestCloudDistancePixels(state.clouds, player.x, player.y);
  updateNearestTown();
}

function halfDayUpdate() {
  const town = nearestTown();
  const distance = updateNearestTown();
  const result = encounterRoll(distance, town.alert, rng);
  town.alert = result.alert;
  if (result.sighted) openSighting(town, distance);
}

function dailyUpdate() {
  const player = state.player;
  player.foodFixed = consumeDailyFood(player.foodFixed, player.crew);
  const remaining = foodDays(player.foodFixed, player.crew);
  if (remaining <= 20 && remaining % 4 === 0) addLog(`Only ${remaining} days of food remain.`);
  if (player.foodFixed === 0) {
    const lost = Math.max(1, Math.floor(player.crew / 20));
    player.crew = Math.max(1, player.crew - lost);
    addLog(`${lost} starving crewmen have deserted.`);
  }

  const nextDate = advanceDate(state.calendar);
  state.calendar = { day: nextDate.day, month: nextDate.month, year: nextDate.year };
  if (nextDate.newMonth) monthlyUpdate();
  if ((state.calendar.day + state.calendar.month * 30) % 5 === 0) saveGame(false);
}

function monthlyUpdate() {
  const player = state.player;
  player.monthsAtSea += player.partyGold > 32767 ? 2 : 1;
  player.reputation -= Math.trunc(player.reputation / 8);
  for (const nation of NATION_ORDER) player.favour[nation] = clamp(player.favour[nation], -100, 100);
  state.towns = state.towns.map((town) => updateTownMonthly(town, state.calendar.month, rng));
  updateDiplomacy();
  applyRandomTownEvent();
  const crewMood = morale({ ...player, difficulty: state.difficulty });
  if (crewMood < 0) addLog('The crew grows restless and calls for plunder.');
  addLog(`${MONTHS[state.calendar.month]} begins. The Caribbean shifts around you.`);
}

function addWorldNews(message) {
  state.worldNews.unshift(message);
  state.worldNews = state.worldNews.slice(0, 24);
}

function updateDiplomacy() {
  const roll = rng.int(scenarios[state.era].diplomacyK);
  if (roll >= 28) return;
  const first = roll & 3;
  const second = (roll >> 2) & 3;
  if (first === second) return;
  const nationA = NATION_ORDER[first];
  const nationB = NATION_ORDER[second];
  const delta = roll & 16 ? 1 : -1;
  const current = state.diplomacy[nationA][nationB];
  if (current === delta) return;
  const next = current + delta;
  state.diplomacy[nationA][nationB] = next;
  state.diplomacy[nationB][nationA] = next;
  if (next === -1) addWorldNews(`${nationA} is at war with ${nationB}.`);
  else if (next === 0 && current === -1) addWorldNews(`${nationA} and ${nationB} have made peace.`);
  else if (next === 1) {
    addWorldNews(`${nationA} has allied with ${nationB}.`);
    state.player.favour[nationA] = Math.max(-3, state.player.favour[nationA]);
  }
}

function applyRandomTownEvent() {
  const townIndex = rng.int(64);
  if (townIndex >= state.towns.length - 2) return;
  const town = state.towns[townIndex];
  switch (rng.int(5)) {
    case 0:
      town.soldiers = Math.floor(town.soldiers / 2);
      addWorldNews(`Indians have attacked ${town.name}.`);
      break;
    case 1:
      town.growth = Math.min(255, town.growth + 64);
      town.gold = Math.min(255, town.gold + 12);
      addWorldNews(`A new gold mine has opened at ${town.name}.`);
      break;
    case 2:
      town.soldiers = Math.floor(town.soldiers / 2);
      town.population = Math.floor(town.population / 2);
      addWorldNews(`Malaria has struck ${town.name}.`);
      break;
    case 3:
      town.mood = 0;
      addWorldNews(`${town.name} has a new governor.`);
      break;
    default:
      town.gold = 0;
      town.growth -= Math.floor(town.growth / 4);
      addWorldNews(`Pirates have plundered ${town.name}.`);
  }
}

function openSighting(town, distance) {
  state.paused = true;
  showDialog({
    kicker: 'Sail ho!', title: 'A sail on the horizon',
    body: state.difficulty < 2
      ? `<p>The sailing master reports that these are ${distance > 12 ? 'unknown' : town.nation} waters.</p><p>Will you investigate?</p>`
      : '<p>A distant sail crosses the horizon. Will you investigate?</p>',
    actions: [
      { label: 'Investigate', run: () => revealEncounter(town, distance) },
      { label: 'Continue the voyage', secondary: true, run: () => { town.alert += 16; resumeAfterEncounter(); } },
    ],
  });
}

function revealEncounter(town, distance) {
  let nation = town.nation;
  let tier = chooseEncounterTier({ crew: state.player.crew, alert: town.alert, governorMood: town.mood, rng });
  if (distance > 12 || rng.int(15) < 4) {
    const roll = rng.int(20);
    tier = Math.floor(roll / 4);
    nation = NATION_ORDER[roll % 4];
  }
  const [ship, flag, crew, guns, kind, gold, cargo] = scenarios[state.era].encounters[nation][tier];
  const hostile = kind >= 6 && state.player.favour[flag] < 0;
  const enemy = { ship, flag, crew, guns, kind, gold, cargo, hostile, namedCaptain: hostile };
  showDialog({
    kicker: 'The sail draws nearer', title: `She looks like a ${ship}`,
    body: '<p>The lookout cannot yet make out her colors. Will you close the distance?</p>',
    actions: [
      { label: 'Investigate', run: () => identifyEncounter(enemy, town) },
      { label: 'Sail away', secondary: true, run: () => escapeEncounter(enemy, town) },
    ],
  });
}

function identifyEncounter(enemy, town) {
  showDialog({
    kicker: `${enemy.flag === 'pirate' ? 'Pirate' : enemy.flag} colors`, title: `The ${enemy.ship}`,
    body: `<p>She carries about ${enemy.crew * 4} hands and ${enemy.guns} guns. ${enemy.hostile ? 'She alters course and gives chase.' : 'Her crew watches your approach.'}</p>`,
    actions: [
      { label: 'Close for battle', run: () => closeForBattle(enemy) },
      { label: 'Hail for news', run: () => hailForNews(enemy) },
      { label: enemy.hostile ? 'Break away' : 'Sail away', secondary: true, run: () => escapeEncounter(enemy, town) },
    ],
  });
}

function escapeEncounter(enemy, town) {
  town.alert += 16;
  addLog(`You leave the ${enemy.ship} astern.`);
  resumeAfterEncounter();
}

function hailForNews(enemy) {
  if (state.player.favour[enemy.flag] <= -4) {
    showDialog({
      kicker: 'No reply', title: 'Your hail goes unanswered',
      body: `<p>The ${enemy.ship} runs out her guns and prepares for battle.</p>`,
      actions: [{ label: 'Prepare for battle', run: () => closeForBattle(enemy) }],
    });
    return;
  }
  const items = state.worldNews.slice(0, 6);
  showDialog({
    kicker: 'Ship’s News', title: 'News from across the Caribbean',
    body: items.length
      ? `<ul class="ship-news">${items.map((item) => `<li>${item}</li>`).join('')}</ul>`
      : '<p>The other captain has heard nothing of consequence.</p>',
    actions: [{ label: 'Continue the voyage', run: () => { addLog(`Exchanged news with a ${enemy.flag} ${enemy.ship}.`); resumeAfterEncounter(); } }],
  });
}

function closeForBattle(enemy) {
  showDialog({
    kicker: 'Battle stations', title: `Closing with the ${enemy.ship}`,
    body: '<p>Tactical sea combat is not playable yet. Choose a provisional outcome; it will be applied to this voyage and entered in the captain’s log.</p>',
    actions: [
      { label: 'Victory — capture her', run: () => resolveProvisionalBattle(enemy, 'captured') },
      { label: 'Lose the fight', run: () => resolveProvisionalBattle(enemy, 'lost') },
      { label: 'Our ship is sunk', run: () => resolveProvisionalBattle(enemy, 'sunk') },
      { label: 'Escape the battle', secondary: true, run: () => resolveProvisionalBattle(enemy, 'escaped') },
      { label: `Sink the ${enemy.ship}`, run: () => resolveProvisionalBattle(enemy, 'enemy-sunk') },
    ],
  });
}

function resolveProvisionalBattle(enemy, outcome) {
  if (outcome === 'captured') {
    beginShipCapture(enemy);
    return;
  }
  const result = applyProvisionalBattleOutcome(state.player, enemy, outcome, SHIPS);
  state.player = result.player;
  addLog(result.message);
  saveGame(false);
  resumeAfterEncounter();
}

function beginShipCapture(enemy) {
  const stats = SHIPS[enemy.ship];
  const freeHold = cargoRoom();
  showDialog({
    kicker: 'Prize taken', title: `The ${enemy.ship} has struck`,
    body: `<p>She is a ${stats.cargo}-ton ${enemy.ship} carrying ${enemy.guns} guns. Your fleet has ${freeHold} tons of empty hold space.</p><p>Will you keep her or strip and sink her?</p>`,
    actions: [
      { label: 'Send a prize crew', run: () => keepPrizeShip(enemy) },
      { label: 'Plunder and sink her', secondary: true, run: () => finishPrizeDecision(enemy, false) },
    ],
  });
}

function keepPrizeShip(enemy) {
  if (state.player.ships.length < 8) {
    const slotIndex = state.player.ships.length;
    state.player.ships.push(enemy.ship);
    state.player.crew = Math.max(state.player.crew, slotIndex * 8);
    addLog(`Sent a prize crew aboard the captured ${enemy.ship}.`);
    finishPrizeDecision(enemy, true);
    return;
  }
  showDialog({
    kicker: 'Fleet at capacity', title: 'Choose a ship to abandon',
    body: '<p>The fleet can carry no more than eight ships. Choose one vessel to strip and replace with the prize.</p>',
    actions: state.player.ships.map((ship, index) => ({
      label: `Abandon ${ship} (${index + 1})`,
      run: () => {
        state.player.ships[index] = enemy.ship;
        addLog(`Abandoned a ${ship} and kept the captured ${enemy.ship}.`);
        finishPrizeDecision(enemy, true);
      },
    })),
  });
}

function finishPrizeDecision(enemy, keepShip) {
  if (!keepShip) {
    addLog(`Stripped and sank the captured ${enemy.ship}.`);
  }
  state.player.reputation += 1;
  if (enemy.flag !== 'pirate') propagateFavour(enemy.flag, -1);
  const nearbyTown = nearestTown();
  const distance = Math.round(Math.abs(state.player.x - nearbyTown.x) + Math.abs(state.player.y - nearbyTown.y));
  if (SHIPS[enemy.ship].type + 5 > distance) {
    nearbyTown.growth = Math.max(0, nearbyTown.growth - 10);
    addWorldNews(`Shipping losses have hurt trade at ${nearbyTown.name}.`);
  }

  if (enemy.namedCaptain) {
    resolveNamedCaptain(enemy, () => openShipPlunder(enemy));
    return;
  }
  openShipPlunder(enemy);
}

function resolveNamedCaptain(enemy, next) {
  state.player.capturedCaptains ??= [];
  if (enemy.flag !== 'pirate' && enemy.flag !== 'Spain') {
    if (state.player.capturedCaptains.length < 8) {
      state.player.capturedCaptains.push({ nation: enemy.flag, ship: enemy.ship, pirate: false });
      addLog(`The ${enemy.flag} captain is held for delivery to a governor.`);
    }
    next();
    return;
  }
  showDialog({
    kicker: 'A notable prisoner', title: `The ${enemy.flag} captain yields`,
    body: '<p>The original offers information about Spanish treasure movements, or lets you hold the captain for delivery to a governor.</p>',
    actions: [
      { label: 'Ask about the treasure fleet', run: () => { addWorldNews('A captive captain reports the treasure fleet’s latest route.'); addLog('Questioned a captive about the treasure fleet.'); next(); } },
      { label: 'Ask about the silver train', run: () => { addWorldNews('A captive captain reports the silver train’s latest route.'); addLog('Questioned a captive about the silver train.'); next(); } },
      { label: 'Hold for a governor', run: () => { if (state.player.capturedCaptains.length < 8) state.player.capturedCaptains.push({ nation: enemy.flag, ship: enemy.ship, pirate: enemy.flag === 'pirate' }); addLog(`Held the ${enemy.flag} captain for a governor.`); next(); } },
    ],
  });
}

function openShipPlunder(enemy) {
  const loot = capturedShipPlunder({ enemy, nearbyTownGrowth: nearestTown().growth, shipStats: SHIPS, rng });
  beginPlunderTransfer(`Spoils from the ${enemy.ship}`, loot, () => offerCapturedRecruits(enemy));
}

function offerCapturedRecruits(enemy) {
  const recruits = capturedShipRecruits({
    enemyCrew: enemy.crew, reputation: state.player.reputation,
    crew: state.player.crew, capacity: fleetCapacity(), rng,
  });
  if (recruits === 0) {
    finishCaptureFlow();
    return;
  }
  showDialog({
    kicker: 'Former enemies', title: `${recruits} sailors ask to join`,
    body: '<p>They offer to sail under your flag for a share of future plunder.</p>',
    actions: [
      { label: 'Take them', run: () => { state.player.crew += recruits; addLog(`${recruits} captured sailors joined the crew.`); finishCaptureFlow(); } },
      { label: 'Leave them', secondary: true, run: finishCaptureFlow },
    ],
  });
}

function beginPlunderTransfer(title, loot, done) {
  state.player.partyGold += loot.gold;
  if (loot.gold > 0) addLog(`Took ${loot.gold} gold in plunder.`);
  const remaining = { food: loot.food, goods: loot.goods, cannon: loot.cannon };

  function showTransfer() {
    const food = Math.floor(state.player.foodFixed / 256);
    const room = cargoRoom();
    const gunRoom = Math.max(0, state.player.ships.reduce((sum, ship) => sum + SHIPS[ship].guns, 0) - state.player.cannon);
    const actions = [];
    if (remaining.food > 0 && room > 0) actions.push({ label: `Stow food (${Math.min(room, remaining.food)})`, run: () => { const amount = Math.min(room, remaining.food); state.player.foodFixed += amount * 256; remaining.food -= amount; showTransfer(); } });
    if (remaining.goods > 0 && room > 0) actions.push({ label: `Stow goods (${Math.min(room, remaining.goods)})`, run: () => { const amount = Math.min(room, remaining.goods); state.player.goods += amount; remaining.goods -= amount; showTransfer(); } });
    const cannonByHold = room * 2 + (state.player.cannon % 2 === 0 ? 1 : 0);
    const cannonAmount = Math.min(gunRoom, remaining.cannon, cannonByHold);
    if (cannonAmount > 0) actions.push({ label: `Mount cannon (${cannonAmount})`, run: () => { state.player.cannon += cannonAmount; remaining.cannon -= cannonAmount; showTransfer(); } });
    if (food > 0 && room === 0 && remaining.goods > 0) actions.push({ label: `Jettison food (${Math.min(10, food)})`, secondary: true, run: () => { state.player.foodFixed -= Math.min(10, food) * 256; showTransfer(); } });
    if (state.player.goods > 0 && room === 0 && remaining.food > 0) actions.push({ label: `Jettison goods (${Math.min(10, state.player.goods)})`, secondary: true, run: () => { state.player.goods -= Math.min(10, state.player.goods); showTransfer(); } });
    actions.push({ label: 'Finish looting', secondary: true, run: () => {
      const left = remaining.food + remaining.goods + remaining.cannon;
      addLog(left > 0 ? `Left ${left} units of plunder behind.` : 'Transferred all useful plunder.');
      done();
    } });
    showDialog({
      kicker: 'Prizes and plunder', title,
      body: `<p>Gold is taken automatically. Choose what the fleet will carry and what will be left behind.</p><dl><dt>Gold taken</dt><dd>${loot.gold}</dd><dt>Food aboard / available</dt><dd>${food} / ${remaining.food}</dd><dt>Goods aboard / available</dt><dd>${state.player.goods} / ${remaining.goods}</dd><dt>Cannon aboard / available</dt><dd>${state.player.cannon} / ${remaining.cannon}</dd><dt>Free hold</dt><dd>${room} tons</dd></dl>`,
      actions,
    });
  }
  showTransfer();
}

function finishCaptureFlow() {
  saveGame(false);
  resumeAfterEncounter();
}

function resumeAfterEncounter() {
  state.player.cloudDistancePixels = 999;
  state.player.voyageTick = 63;
  resumeSailing();
}

function approachTown() {
  if (!state || state.mode !== 'sailing' || updateNearestTown() > 7) return;
  const town = nearestTown();
  state.paused = true;
  const fortText = town.forts === 0 ? 'No fort guards the harbor.' : `${town.forts === 1 ? 'One fort guards' : `${town.forts} forts guard`} the harbor.`;
  showDialog({
    kicker: `${town.nation} · ${prosperity(town.growth)}`, title: town.name,
    body: `<p>You have arrived at ${town.name}. ${fortText}</p><dl><dt>Citizens</dt><dd>${town.population * 100}</dd><dt>Soldiers</dt><dd>${town.soldiers * 5}</dd><dt>Treasury</dt><dd>${town.gold * 1000} gold</dd></dl>`,
    actions: [
      { label: 'Sail into the harbor', run: () => tryHarbor(town) },
      { label: 'Sneak into town', run: () => trySneak(town) },
      { label: 'Attack the town', run: () => attackTown(town) },
      { label: 'Leave town', secondary: true, run: resumeSailing },
    ],
  });
}

function attackTown(town) {
  showDialog({
    kicker: 'Assault', title: `Attack ${town.name}`,
    body: `<p>Town and land combat are not playable yet. Choose the provisional result of the assault; capture now leads into the documented plunder sequence.</p>`,
    actions: [
      { label: 'Capture the town', run: () => captureTown(town) },
      { label: 'Repelled with losses', run: () => { const lost = Math.min(state.player.crew - 1, Math.max(1, Math.floor(state.player.crew / 5))); state.player.crew -= lost; town.alert += 16; state.player.reputation -= 2; addLog(`Lost ${lost} crew attacking ${town.name}.`); resumeSailing(); } },
      { label: 'Withdraw from the assault', secondary: true, run: () => { town.alert += 16; addLog(`Withdrew from the assault on ${town.name}.`); resumeSailing(); } },
    ],
  });
}

function captureTown(town) {
  if (town.alert >= 12) {
    const hidden = ['Some', 'Much', 'Most'][Math.min(2, Math.floor((town.alert - 12) / 15))];
    showDialog({
      kicker: 'The town was warned', title: `${hidden} of the gold is hidden`,
      body: '<p>The inhabitants had time to conceal part of the treasury before your force arrived.</p>',
      actions: [{ label: 'Continue the capture', run: () => resolveTownCapture(town) }],
    });
    return;
  }
  resolveTownCapture(town);
}

function resolveTownCapture(town) {
  const oldNation = town.nation;
  town.growth = Math.max(0, town.growth - 20);
  const loot = capturedTownPlunder({ town, rng });
  Object.assign(town, applyTownCapture(town, loot));
  state.player.reputation += loot.gold > 990 ? 2 : 0;
  propagateFavour(oldNation, -1);
  if (loot.gold > 990) propagateFavour(oldNation, -2);
  const threshold = 10 * town.population + rng.int(10 * town.population);
  addLog(`Captured ${town.name} from ${oldNation}.`);

  const proceed = () => beginPlunderTransfer(`Plunder of ${town.name}`, loot, () => {
    saveGame(false);
    resumeSailing();
  });
  if (state.player.crew < threshold) {
    proceed();
    return;
  }
  showDialog({
    kicker: 'The governor has fled', title: `Choose a flag for ${town.name}`,
    body: '<p>Your force is large enough to install a new governor before the town is plundered.</p>',
    actions: NATION_ORDER.map((nation) => ({ label: nation, run: () => {
      town.nation = nation;
      town.mood = 2;
      town.governorRelative = rng.int(16);
      if (nation !== oldNation) {
        state.player.favour[nation] += 3;
        propagateFavour(oldNation, -2);
      }
      addLog(`Installed a ${nation} governor in ${town.name}.`);
      proceed();
    } })),
  });
}

function tryHarbor(town) {
  const result = harborAttempt({ favour: state.player.favour[town.nation], governorMood: town.mood, crew: state.player.crew, forts: town.forts, rng });
  if (result.admitted) { enterTown(town, false); return; }
  if (result.shipLost && state.player.ships.length > 1) {
    const lost = state.player.ships.splice(rng.int(state.player.ships.length), 1)[0];
    showNotice('The fort opens fire', `An accurate salvo sinks your ${lost}. The fleet withdraws to open water.`);
  } else {
    showNotice('The fort opens fire', 'Cannon fire throws up columns of water. The fleet withdraws beyond range.');
  }
}

function trySneak(town) {
  const unseen = sneakAttempt({ governorMood: town.mood, reputation: state.player.reputation, rng });
  if (unseen) { enterTown(town, true); return; }
  showNotice('Recognized!', 'A governor’s guard spots you in the street. You escape the patrol and return to your ship.');
}

function enterTown(town, sneaking) {
  state.mode = 'town';
  state.paused = true;
  const currentMorale = morale({ ...state.player, difficulty: state.difficulty });
  const deserters = Math.min(state.player.crew - 1, Math.floor(((3 - currentMorale) * state.player.crew) / 15));
  if (deserters > 1) {
    state.player.crew -= deserters;
    addLog(`${deserters} crewmen deserted at ${town.name}.`);
  }
  state.visit = { townIndex: state.nearestTownIndex, sneaking, recruited: false, merchant: null };
  addLog(`Made port at ${town.name}.`);
  showTownMenu();
}

function showTownMenu() {
  const town = state.towns[state.visit.townIndex];
  const actions = [
    { label: 'Governor', run: showGovernor },
    { label: 'Tavern', run: showTavern },
    { label: 'Merchant', run: showMerchant },
    { label: 'Divide the plunder', run: showPlunderDivision },
    { label: 'Save voyage', secondary: true, run: () => { saveGame(); showTownMenu(); } },
    { label: 'Put to sea', secondary: true, run: leaveTown },
  ];
  if (state.visit.sneaking) actions.splice(2, 1);
  showDialog({
    kicker: `${town.nation} port`, title: town.name,
    body: `<p>${state.visit.sneaking ? 'You move through the streets under a borrowed name.' : 'Your ships lie safely at anchor.'}</p><dl><dt>Crew</dt><dd>${state.player.crew}</dd><dt>Food</dt><dd>${Math.floor(state.player.foodFixed / 256)}</dd><dt>Gold</dt><dd>${state.player.partyGold}</dd></dl>`,
    actions,
  });
}

function showPlunderDivision() {
  const player = state.player;
  const flagship = player.ships[0];
  const division = dividePlunder({
    partyGold: player.partyGold,
    crew: player.crew,
    reputation: player.reputation,
    difficulty: state.difficulty,
    flagshipSizeClass: SHIPS[flagship].sizeClass,
  });
  const satisfaction = ['angry', 'unhappy', 'pleased', 'happy'][division.satisfaction];
  const actions = [
    { label: 'Begin a new expedition', run: () => finishPlunderDivision(division, state.difficulty) },
  ];
  if (state.difficulty < 3) {
    actions.push({
      label: `Raise to ${DIFFICULTY_NAMES[state.difficulty + 1]} and begin`,
      run: () => finishPlunderDivision(division, state.difficulty + 1),
    });
  }
  actions.push({ label: 'Keep sailing together', secondary: true, run: showTownMenu });

  showDialog({
    kicker: 'The counting house', title: 'Divide the plunder?',
    body: `<p>Ending this expedition will disperse the crew and divide every ship, cannon, and cargo except your flagship.</p><dl><dt>Each crew member receives</dt><dd>${division.crewShare.toLocaleString()} gold</dd><dt>Crew reaction</dt><dd>${satisfaction}</dd><dt>Your share (${division.officerShares} portions)</dt><dd>${division.captainTake.toLocaleString()} gold</dd><dt>Funds for the next voyage</dt><dd>${division.expeditionGold.toLocaleString()} gold</dd><dt>Flagship retained</dt><dd>${flagship}</dd></dl>`,
    actions,
  });
}

function finishPlunderDivision(division, nextDifficulty) {
  const oldCrew = state.player.crew;
  const flagship = state.player.ships[0];
  state.player = startNewExpedition(state.player, division);
  const player = state.player;
  state.difficulty = nextDifficulty;
  // The decoded new-expedition initializer clears the current visit flags,
  // including clandestine entry and one-off tavern/merchant state.
  state.visit = { ...state.visit, sneaking: false, recruited: false, merchant: null };
  addLog(`Divided the plunder: ${oldCrew} crew received ${division.crewShare} gold each.`);
  addLog(`A new expedition begins aboard the ${flagship} with ${player.crew} loyal hands.`);
  saveGame(false);
  showDialog({
    kicker: 'A new account', title: 'The company disperses',
    body: `<p>Your share of ${division.captainTake.toLocaleString()} gold is secured as personal wealth. Your backers provide ${division.expeditionGold.toLocaleString()} gold for a new expedition.</p><dl><dt>Personal wealth</dt><dd>${player.personalWealth.toLocaleString()}</dd><dt>Reputation</dt><dd>${player.reputation}</dd><dt>New crew</dt><dd>${player.crew}</dd></dl>`,
    actions: [{ label: 'Return to town', run: showTownMenu }],
  });
}

function showGovernor() {
  const town = state.towns[state.visit.townIndex];
  const favour = state.player.favour[town.nation];
  if (state.visit.sneaking) {
    showDialog({ kicker: 'Governor’s residence', title: 'The doors stay shut', body: '<p>The governor will not receive a visitor who slipped past his guards.</p>', actions: [{ label: 'Return to town', run: showTownMenu }] });
    return;
  }
  if (favour <= -4) {
    showDialog({ kicker: `${town.nation} governor`, title: 'An enemy of the Crown', body: '<p>The governor refuses to see you.</p>', actions: [{ label: 'Return to town', run: showTownMenu }] });
    return;
  }
  if (favour < 2) {
    const price = 200 * (4 - favour ** 3);
    showDialog({
      kicker: `${town.nation} governor`, title: 'A chance for amnesty',
      body: `<p>The governor offers a letter of marque for ${price} gold pieces.</p>`,
      actions: [
        { label: 'Buy the commission', run: () => { if (state.player.partyGold >= price) { state.player.partyGold -= price; state.player.favour[town.nation] = Math.min(favour + 2, 2); addLog(`${town.nation} granted you a letter of marque.`); } else addLog('You cannot afford the commission.'); showTownMenu(); } },
        { label: 'Decline', secondary: true, run: showTownMenu },
      ],
    });
    return;
  }
  showDialog({ kicker: `${town.nation} governor`, title: 'A cordial audience', body: `<p>The governor welcomes a proven friend of ${town.nation} and shares the latest court gossip.</p>`, actions: [{ label: 'Return to town', run: showTownMenu }] });
}

function showTavern() {
  const town = state.towns[state.visit.townIndex];
  if (state.visit.recruited) {
    showDialog({ kicker: 'The tavern', title: 'No more volunteers', body: '<p>Every willing sailor in the room has already heard your offer.</p>', actions: [{ label: 'Return to town', run: showTownMenu }] });
    return;
  }
  const recruits = tavernRecruits({ townPopulation: town.population, reputation: state.player.reputation, difficulty: state.difficulty, crew: state.player.crew, capacity: fleetCapacity(), rng });
  state.visit.recruited = true;
  showDialog({
    kicker: 'The tavern', title: `${recruits} sailors volunteer`,
    body: '<p>They will join for a share of future plunder.</p>',
    actions: [
      { label: 'Welcome them aboard', run: () => { state.player.crew += recruits; addLog(`${recruits} sailors joined the crew.`); showTownMenu(); } },
      { label: 'Leave them drinking', secondary: true, run: showTownMenu },
    ],
  });
}

function showMerchant() {
  const town = state.towns[state.visit.townIndex];
  if (town.nation === 'Spain' && 25 * state.player.ranks.Spain + scenarios[state.era].merchantThreshold < town.growth) {
    showDialog({ kicker: 'The merchant', title: '“We do not trade with pirates!”', body: '<p>The merchant dismisses you and calls for his guards.</p>', actions: [{ label: 'Return to town', run: showTownMenu }] });
    return;
  }
  if (!state.visit.merchant) {
    state.visit.merchant = {
      price: merchantFoodPrice({ growth: town.growth, month: state.calendar.month, producesFood: Boolean(town.flags & 0x08) }),
      stock: merchantStock({ growth: town.growth, population: town.population, month: state.calendar.month, rng }),
    };
  }
  const market = state.visit.merchant;
  const food = Math.floor(state.player.foodFixed / 256);
  const room = Math.max(0, cargoCapacity() - food - state.player.goods);
  const canBuy = market.stock > 0 && room > 0 && state.player.partyGold >= market.price;
  showDialog({
    kicker: 'The merchant', title: `${market.price} gold per ton of food`,
    body: `<p>The warehouse holds ${market.stock} tons. Your fleet has room for ${room} more.</p><dl><dt>Your food</dt><dd>${food}</dd><dt>Your gold</dt><dd>${state.player.partyGold}</dd></dl>`,
    actions: [
      ...(canBuy ? [{ label: 'Buy one ton', run: () => buyFood(1) }, { label: 'Buy up to ten', run: () => buyFood(10) }] : []),
      { label: 'Return to town', secondary: true, run: showTownMenu },
    ],
  });
}

function buyFood(requested) {
  const market = state.visit.merchant;
  const food = Math.floor(state.player.foodFixed / 256);
  const room = Math.max(0, cargoCapacity() - food - state.player.goods);
  const amount = Math.min(requested, market.stock, room, Math.floor(state.player.partyGold / market.price));
  state.player.partyGold -= amount * market.price;
  state.player.foodFixed += amount * 256;
  market.stock -= amount;
  if (amount > 0) addLog(`Bought ${amount} ton${amount === 1 ? '' : 's'} of food.`);
  showMerchant();
}

function leaveTown() {
  const town = state.towns[state.visit.townIndex];
  const angle = state.player.heading / 256 * Math.PI * 2;
  const departureX = clamp(state.player.x + Math.sin(angle) * 8, 1, WORLD.width - 1);
  const departureY = clamp(state.player.y - Math.cos(angle) * 8, 1, WORLD.height - 1);
  if (isNavigable(departureX, departureY)) {
    state.player.x = departureX;
    state.player.y = departureY;
  }
  state.visit = null;
  state.mode = 'sailing';
  setupClouds();
  resumeSailing();
  addLog(`Put to sea from ${town.name}.`);
}

function showNotice(title, body) {
  showDialog({ kicker: 'Captain’s log', title, body: `<p>${body}</p>`, actions: [{ label: 'Continue', run: resumeSailing }] });
}

function showDialog({ kicker, title, body, actions }) {
  if (dialog.open) dialog.close();
  dialogKicker.textContent = kicker;
  dialogTitle.textContent = title;
  dialogBody.innerHTML = body;
  dialogActions.replaceChildren();
  actions.forEach((action) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = action.label;
    if (action.secondary) button.classList.add('secondary');
    button.addEventListener('click', () => { dialog.close(); action.run(); }, { once: true });
    dialogActions.append(button);
  });
  dialog.showModal();
  dialogActions.querySelector('button')?.focus();
}

function resumeSailing() {
  state.paused = false;
  state.mode = 'sailing';
  updateInterface();
}

function togglePause() {
  if (!state || state.mode !== 'sailing') return;
  state.paused = !state.paused;
  pauseButton.firstChild.textContent = state.paused ? '▶ ' : 'Ⅱ ';
  addLog(state.paused ? 'Voyage paused.' : 'Voyage resumed.');
}

function addLog(message) {
  state.logs.push(message);
  state.logs = state.logs.slice(-4);
  updateLog();
}

function updateLog() {
  logElement.replaceChildren(...state.logs.map((line) => {
    const paragraph = document.createElement('p');
    paragraph.textContent = line;
    return paragraph;
  }));
}

function prosperity(growth) {
  return ['struggling', 'surviving', 'prospering', 'wealthy'][Math.min(3, growth >> 6)];
}

function updateInterface() {
  if (!state) return;
  const player = state.player;
  const town = nearestTown();
  const distance = Math.round(Math.abs(player.x - town.x) + Math.abs(player.y - town.y));
  labels.captain.textContent = `Captain ${state.captain} · ${state.nationality}`;
  labels.date.textContent = `${state.calendar.day + 1} ${MONTHS[state.calendar.month]} ${state.calendar.year}`;
  labels.speed.textContent = `${player.speed.toFixed(1)} cells/day`;
  labels.wind.textContent = WIND_NAMES[(player.wind >> 4) & 15];
  labels.sails.textContent = { furled: 'Closed', battle: 'Low', full: 'High' }[player.sails];
  labels.food.textContent = `${foodDays(player.foodFixed, player.crew)} days`;
  labels.crew.textContent = player.crew.toLocaleString();
  labels.gold.textContent = player.partyGold.toLocaleString();
  labels.nearest.textContent = `${town.name} · ${distance}`;
  dockButton.disabled = distance > 7 || state.paused;
}

function render() {
  const width = viewWidth;
  const height = viewHeight;
  ctx.clearRect(0, 0, width, height);
  const sea = ctx.createLinearGradient(0, 0, 0, height);
  sea.addColorStop(0, '#1a5969'); sea.addColorStop(1, '#0d3c4b');
  ctx.fillStyle = sea; ctx.fillRect(0, 0, width, height);
  if (!state) return;

  const zoom = cameraZoom;
  const visibleWidth = width / zoom;
  const visibleHeight = height / zoom;
  const camera = {
    x: visibleWidth >= WORLD.width ? WORLD.width / 2 : clamp(state.player.x, visibleWidth / 2, WORLD.width - visibleWidth / 2),
    y: visibleHeight >= WORLD.height ? WORLD.height / 2 : clamp(state.player.y, visibleHeight / 2, WORLD.height - visibleHeight / 2),
  };
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-camera.x, -camera.y);
  if (worldMapLayer) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(worldMapLayer, 0, 0, worldMapLayer.width, worldMapLayer.height, 0, 0, WORLD.width, WORLD.height);
  } else {
    drawSeaTexture(camera, visibleWidth, visibleHeight);
    drawLand();
  }
  drawClouds(zoom);
  drawTowns(zoom);
  drawShip(zoom);
  ctx.restore();
  drawMinimap(width, height, camera, zoom);
  if (state.paused && state.mode === 'sailing' && !dialog.open) drawPaused(width, height);
}

function drawClouds(zoom) {
  for (const cloud of state.clouds ?? []) {
    ctx.save();
    ctx.translate(cloud.x, cloud.y);
    ctx.scale(1 / zoom, 1 / zoom);

    ctx.fillStyle = 'rgba(2, 20, 27, .3)';
    drawCloudShape(cloud.shape, -30, 30);
    ctx.fill();

    const cloudGradient = ctx.createLinearGradient(0, -18, 0, 18);
    cloudGradient.addColorStop(0, 'rgba(255, 252, 229, .96)');
    cloudGradient.addColorStop(1, 'rgba(190, 211, 204, .92)');
    ctx.fillStyle = cloudGradient;
    ctx.strokeStyle = 'rgba(72, 95, 96, .55)';
    ctx.lineWidth = 1.2;
    drawCloudShape(cloud.shape, 0, 0);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawCloudShape(shape, offsetX, offsetY) {
  const forms = [
    [[-24, 6, 14], [-8, -3, 18], [11, 0, 16], [25, 7, 11]],
    [[-27, 7, 11], [-15, 0, 16], [1, -6, 20], [20, 2, 15], [30, 8, 9]],
    [[-22, 8, 13], [-7, 1, 15], [5, -7, 18], [18, 2, 13], [28, 8, 8]],
  ];
  ctx.beginPath();
  for (const [x, y, radius] of forms[shape] ?? forms[0]) {
    ctx.moveTo(offsetX + x + radius, offsetY + y);
    ctx.arc(offsetX + x, offsetY + y, radius, 0, Math.PI * 2);
  }
}

function drawSeaTexture(camera, visibleWidth, visibleHeight) {
  ctx.strokeStyle = 'rgba(203,232,224,.11)';
  ctx.lineWidth = .45;
  const left = Math.floor((camera.x - visibleWidth / 2) / 12) * 12;
  const top = Math.floor((camera.y - visibleHeight / 2) / 10) * 10;
  for (let y = top; y < top + visibleHeight + 10; y += 10) {
    for (let x = left; x < left + visibleWidth + 12; x += 12) {
      const offset = ((x * 13 + y * 7) % 9) / 3;
      ctx.beginPath(); ctx.moveTo(x + offset, y); ctx.quadraticCurveTo(x + 4, y - 1.3, x + 8, y); ctx.stroke();
    }
  }
}

function drawLand() {
  ctx.lineJoin = 'round';
  for (const points of LAND_SHAPES) {
    ctx.beginPath();
    points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
    ctx.fillStyle = '#76835a'; ctx.fill();
    ctx.strokeStyle = '#d0bd75'; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.strokeStyle = '#43583f'; ctx.lineWidth = .8; ctx.stroke();
  }
}

function drawTowns(zoom) {
  ctx.textBaseline = 'middle';
  ctx.font = `${12 / zoom}px "IM Fell English", Georgia, serif`;
  for (const town of state.towns) {
    const nation = NATIONS[town.nation];
    const markerX = town.x + .5;
    const markerY = town.y + .5;
    drawTownSprite(town, nation, zoom, markerX, markerY);
    ctx.lineWidth = 2 / zoom; ctx.strokeStyle = 'rgba(4,15,17,.75)'; ctx.strokeText(town.name, markerX + 9 / zoom, markerY);
    ctx.fillStyle = '#fff1c8'; ctx.fillText(town.name, markerX + 9 / zoom, markerY);
  }
}

function drawTownSprite(town, nation, zoom, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1 / zoom, 1 / zoom);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = '#2b2418';
  ctx.fillStyle = '#d6bd7d';
  ctx.beginPath();
  ctx.rect(-6, 0, 12, 5);
  ctx.moveTo(-7, 0); ctx.lineTo(-3.5, -4); ctx.lineTo(0, 0);
  ctx.moveTo(-1, 0); ctx.lineTo(2.5, -5); ctx.lineTo(7, 0);
  ctx.fill(); ctx.stroke();
  if (town.forts > 0) {
    ctx.fillStyle = '#8b7952';
    ctx.fillRect(-7, 4, 14, 3);
    ctx.strokeRect(-7, 4, 14, 3);
  }
  ctx.strokeStyle = '#2b2418';
  ctx.beginPath(); ctx.moveTo(-1, -1); ctx.lineTo(-1, -9); ctx.stroke();
  ctx.fillStyle = nation.color;
  ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6, -7); ctx.lineTo(0, -5); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.font = 'bold 6px system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 1.5; ctx.strokeStyle = '#241a10';
  const nationMark = town.nation[0].toUpperCase();
  ctx.strokeText(nationMark, 2.4, -7);
  ctx.fillStyle = '#fff4d0'; ctx.fillText(nationMark, 2.4, -7);
  ctx.textAlign = 'start';
  ctx.restore();
}

function drawShip(zoom) {
  const player = state.player;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.heading / 256 * Math.PI * 2);
  ctx.scale(2.3 / zoom, 2.3 / zoom);
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(1.5, 1.8, 3.7, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5c321b'; ctx.strokeStyle = '#29170e'; ctx.lineWidth = .8;
  ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(3.1, 4.5); ctx.lineTo(0, 6); ctx.lineTo(-3.1, 4.5); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#2b2116'; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 4); ctx.stroke();
  drawShipSails(player.sails);
  ctx.strokeStyle = '#2b2116'; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, -8); ctx.stroke();
  ctx.fillStyle = NATIONS[state.nationality]?.color ?? NATIONS.pirate.color;
  ctx.beginPath(); ctx.moveTo(.2, -8); ctx.lineTo(3.2, -6.8); ctx.lineTo(.2, -5.8); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawShipSails(sailState) {
  if (sailState === 'furled') {
    ctx.strokeStyle = '#d5c18e'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-2.6, -.8); ctx.lineTo(2.8, -.8); ctx.moveTo(-2.1, 2); ctx.lineTo(2.3, 2); ctx.stroke();
    return;
  }
  const spread = sailState === 'full' ? 1 : .58;
  ctx.fillStyle = '#eee0b8'; ctx.beginPath(); ctx.moveTo(.4, -3.5); ctx.lineTo(3.8 * spread, 1.2); ctx.lineTo(.4, 2.2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d5c18e'; ctx.beginPath(); ctx.moveTo(-.4, -2.7); ctx.lineTo(-3.3 * spread, 1.7); ctx.lineTo(-.4, 2.5); ctx.closePath(); ctx.fill();
}

function drawMinimap(width, height, camera, zoom) {
  const compact = width <= 1100;
  const mapWidth = compact ? 128 : 192;
  const mapHeight = mapWidth * .75;
  const x = width - mapWidth - 16;
  const y = height - mapHeight - (compact ? 132 : 80);
  ctx.save(); ctx.globalAlpha = .88; ctx.fillStyle = '#0a2932'; ctx.fillRect(x, y, mapWidth, mapHeight);
  ctx.strokeStyle = 'rgba(235,211,161,.5)'; ctx.strokeRect(x, y, mapWidth, mapHeight);
  ctx.translate(x, y); ctx.scale(mapWidth / WORLD.width, mapHeight / WORLD.height);
  if (worldMapLayer) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(worldMapLayer, 0, 0, worldMapLayer.width, worldMapLayer.height, 0, 0, WORLD.width, WORLD.height);
  } else {
    ctx.fillStyle = '#7d835a';
    LAND_SHAPES.forEach((points) => { ctx.beginPath(); points.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath(); ctx.fill(); });
  }
  ctx.fillStyle = '#f3e5c5'; ctx.beginPath(); ctx.arc(state.player.x, state.player.y, 5, 0, Math.PI * 2); ctx.fill();
  const visibleWidth = width / zoom, visibleHeight = height / zoom;
  ctx.strokeStyle = '#d6a447'; ctx.lineWidth = 2.5; ctx.strokeRect(camera.x - visibleWidth / 2, camera.y - visibleHeight / 2, visibleWidth, visibleHeight);
  ctx.restore();
}

function drawPaused(width, height) {
  ctx.fillStyle = 'rgba(4,18,23,.45)'; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#f3e5c5'; ctx.textAlign = 'center'; ctx.font = '32px "IM Fell English", Georgia, serif'; ctx.fillText('Voyage paused', width / 2, height / 2);
  ctx.textAlign = 'start';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!scenarios) return;
  const next = newState({ era: document.querySelector('#era').value, captain: document.querySelector('#captain-name').value.trim(), nationality: document.querySelector('#nationality').value, difficulty: document.querySelector('#difficulty').value, ability: document.querySelector('#ability').value });
  next.rngState = next.seed;
  await startGame(next);
});

continueButton.addEventListener('click', async () => { const saved = loadGame(); if (saved && scenarios) await startGame(saved); });
pauseButton.addEventListener('click', togglePause);
dockButton.addEventListener('click', approachTown);
zoomOutButton.addEventListener('click', () => changeZoom(-ZOOM_STEP));
zoomInButton.addEventListener('click', () => changeZoom(ZOOM_STEP));
lowerSailsButton.addEventListener('click', () => changeSails(-1));
raiseSailsButton.addEventListener('click', () => changeSails(1));
dialog.addEventListener('cancel', (event) => event.preventDefault());

function changeZoom(delta) {
  cameraZoom = clamp(cameraZoom + delta, MIN_ZOOM, MAX_ZOOM);
}

function changeSails(delta) {
  if (!state || state.paused || state.mode !== 'sailing') return;
  const states = ['furled', 'battle', 'full'];
  const next = clamp(states.indexOf(state.player.sails) + delta, 0, states.length - 1);
  if (states[next] === state.player.sails) return;
  state.player.sails = states[next];
  addLog({ furled: 'The sails are closed.', battle: 'The sails are lowered.', full: 'The sails are raised high.' }[state.player.sails]);
}

for (const button of document.querySelectorAll('[data-hold]')) {
  const direction = button.dataset.hold;
  const press = (event) => { event.preventDefault(); input[direction] = true; };
  const release = (event) => { event.preventDefault(); input[direction] = false; };
  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('pointerleave', release);
}

addEventListener('keydown', (event) => {
  if (dialog.open) return;
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') input.left = true;
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') input.right = true;
  if (event.key === 'ArrowUp' && !event.repeat) changeSails(1);
  if (event.key === 'ArrowDown' && !event.repeat) changeSails(-1);
  if (event.key === ' ' && !event.repeat) togglePause();
  if (event.key.toLowerCase() === 'e' && !dockButton.disabled) approachTown();
  if (event.key === '+' || event.key === '=') changeZoom(ZOOM_STEP);
  if (event.key === '-' || event.key === '_') changeZoom(-ZOOM_STEP);
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) event.preventDefault();
});
addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') input.left = false;
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') input.right = false;
});
addEventListener('blur', () => { input.left = false; input.right = false; });
addEventListener('resize', resize);
canvas.addEventListener('wheel', (event) => {
  if (event.deltaY === 0) return;
  event.preventDefault();
  wheelZoomDelta += event.deltaY;
  if (Math.abs(wheelZoomDelta) < 60) return;
  changeZoom(wheelZoomDelta < 0 ? ZOOM_STEP : -ZOOM_STEP);
  wheelZoomDelta = 0;
}, { passive: false });
function updateNationalityOptions() {
  if (!scenarios) return;
  const era = document.querySelector('#era').value;
  const select = document.querySelector('#nationality');
  for (const option of select.options) option.disabled = !scenarios[era].starts[option.value];
  if (select.selectedOptions[0]?.disabled) select.value = Object.keys(scenarios[era].starts)[0];
}

document.querySelector('#era').addEventListener('change', (event) => {
  document.querySelector('#start-era-label').textContent = `The Caribbean · ${event.target.value}`;
  updateNationalityOptions();
});

function frame(now) {
  const elapsed = Math.min(.25, (now - lastFrame) / 1000);
  lastFrame = now;
  accumulator += elapsed;
  while (accumulator >= TICK_SECONDS) { stepSimulation(); accumulator -= TICK_SECONDS; }
  updateInterface();
  render();
  requestAnimationFrame(frame);
}

resize();
const beginButton = form.querySelector('button[type="submit"]');
beginButton.disabled = true;
loadScenarios().then(() => {
  updateNationalityOptions();
  beginButton.disabled = false;
  continueButton.classList.toggle('hidden', !loadGame());
}).catch((error) => {
  console.error('Scenario data unavailable:', error);
  beginButton.textContent = 'Scenario data failed to load';
});
requestAnimationFrame(frame);
