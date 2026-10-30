import {
  WORLD, NATIONS, SHIPS, LAND_SHAPES, MONTHS,
} from './data.mjs';
import {
  TICKS_PER_DAY, TICKS_PER_HALF_DAY, TICKS_PER_WIND_SHIFT,
  clamp, createRng, targetSailingSpeed, stepSailingSpeed,
  shiftWind, cloudCountForMonth, navigationSkill, turnHeadingDownwind,
  createVoyageClouds, driftClouds, nearestCloudDistancePixels, cloudWrapOpacity,
  applyProvisionalBoardingOutcome,
  capturedShipPlunder, capturedTownPlunder, applyTownCapture, capturedShipRecruits,
  acceptsRudderInput,
  consumeDailyFood, foodDays, starvationDesertion, encounterRoll, chooseEncounterTier,
  triggerTownAt, nearestTriggerTown, townDistanceCells, alertAfterNearestTownCheck,
  isEncounterHunter, hunterOvertakes,
  harborAttempt, sneakAttempt, tavernRecruits, morale, dividePlunder, startNewExpedition,
  pirateCaptainTerms, governorPromotion, convoyReport,
  diplomaticBriefing, tavernSpecialEncounters,
  merchantCash, shipRepairPrice, shipSalePrice, shipwrightCash,
  merchantCommodityPrice, merchantFoodPrice, merchantStock, updateTownMonthly, advanceDate,
  fleetIsUndermanned, abandonShip, restartAfterLastShip, findShore, INLAND_RELEASE_OFFSETS,
} from './mechanics.mjs';
import {
  BATTLE_FRAME_SECONDS, BATTLE_SAIL_TRANSITION_FRAMES,
  createBattle, damageLevel, shipName, shipRecord, stepBattle,
} from './battle-mechanics.mjs';
import { renderBattle } from './battle-renderer.mjs';
import { CELL, PIXEL, decodeNavigationMap, gunzip, isNavigableAt, pixelClassAt } from './world-map.mjs';

const SAVE_KEY = 'fortune-and-freedom-save-v5';
const LEGACY_SAVE_KEY = 'fortune-and-freedom-save-v1';
const PREVIOUS_SAVE_KEY = 'fortune-and-freedom-save-v4';
const SAVE_VERSION = 6;
const TICK_SECONDS = 0.125;
const ZOOM_STEP = 4;
const MIN_ZOOM = 16;
const MAX_ZOOM = 64;
const NATION_ORDER = ['Spain', 'England', 'France', 'Holland'];
const RANK_NAMES = ['Mister', 'Ensign', 'Captain', 'Major', 'Colonel', 'Admiral', 'Baron', 'Count', 'Marquis', 'Duke'];
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
let battleAccumulator = 0;
let previousSailingPose = null;
let previousSailingClouds = null;
let lastFrame = performance.now();
let viewWidth = innerWidth;
let viewHeight = innerHeight;
let worldMap = null;
let worldMapLayer = null;
let scenarios = null;
let cameraZoom = MIN_ZOOM;
let wheelZoomDelta = 0;
const mapCache = new Map();
const input = {
  left: false, right: false, firePressed: false,
  raiseSailsPressed: false, lowerSailsPressed: false,
};

function sailingPose() {
  return state?.player
    ? { x: state.player.x, y: state.player.y, heading: state.player.heading, sails: state.player.sails }
    : null;
}

function resetSailingInterpolation() {
  previousSailingPose = sailingPose();
  previousSailingClouds = state?.clouds?.map((cloud) => ({ ...cloud })) ?? null;
  accumulator = 0;
}

function sailingInterpolationProgress() {
  return state.paused || state.mode !== 'sailing' || dialog.open
    ? 1
    : clamp(accumulator / TICK_SECONDS, 0, 1);
}

function interpolatedSailingPose() {
  const current = sailingPose();
  if (!current || !previousSailingPose) return current;
  const progress = sailingInterpolationProgress();
  const headingDelta = ((current.heading - previousSailingPose.heading + 128) & 0xff) - 128;
  return {
    x: previousSailingPose.x + (current.x - previousSailingPose.x) * progress,
    y: previousSailingPose.y + (current.y - previousSailingPose.y) * progress,
    heading: (previousSailingPose.heading + headingDelta * progress + 256) % 256,
    sails: current.sails,
  };
}

function interpolatedSailingClouds() {
  const current = state.clouds ?? [];
  if (!previousSailingClouds?.length) return current;
  const progress = sailingInterpolationProgress();
  return current.map((cloud, index) => {
    const previous = previousSailingClouds[index];
    // A large jump is the documented edge wrap. Drawing the new endpoint
    // avoids sliding the cloud across the entire viewport between ticks.
    if (!previous || Math.abs(cloud.x - previous.x) > 2 || Math.abs(cloud.y - previous.y) > 2) return cloud;
    return {
      ...cloud,
      x: previous.x + (cloud.x - previous.x) * progress,
      y: previous.y + (cloud.y - previous.y) * progress,
    };
  });
}

const statsFor = (ship) => SHIPS[shipName(ship)];
const describeShip = (ship) => {
  const record = shipRecord(ship);
  return `${record.type}${record.damage ? ` (${record.damage / 16} damage)` : ''}`;
};

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
  const logs = ['A westward trade wind fills the sails.', `The ${start.name} expedition begins.`];
  if (favour[nationality] >= 2) logs.push(`Your ${nationality} letter of marque is in good standing.`);
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
      ships: start.ships.map(shipRecord), crew: start.crew, cannon: start.cannon,
      foodFixed: start.food * 256, goods: start.goods, specialGoods: 0, partyGold: start.gold,
      personalWealth: 0, land: 0, reputation: 0, monthsAtSea: -16,
      capturedCaptains: [],
      barmaidRapport: {}, barmaidInformants: [],
      favour, ranks,
    },
    towns: scenario.towns.map((town) => ({ ...town })),
    nearestTownIndex: 0,
    // One alert counter belongs to whichever town is nearest; it resets when
    // the nearest town changes (town_attack_and_plunder.md §1).
    alert: 0,
    diplomacy,
    worldNews: initialDiplomacyNews(diplomacy, { month: 0, year: Number(era) }),
    treasureMap: { pieces: 0, clueTownIndex: null },
    portTrade: { townIndex: null, merchantCash: null, shipwrightCash: null },
    logs,
    visit: null,
  };
}

function initialDiplomacyNews(diplomacy, calendar) {
  const news = [];
  for (let first = 0; first < NATION_ORDER.length; first += 1) {
    for (let second = first + 1; second < NATION_ORDER.length; second += 1) {
      const nationA = NATION_ORDER[first];
      const nationB = NATION_ORDER[second];
      const relation = diplomacy[nationA][nationB];
      if (relation === -1) news.push({ message: `${nationA} is at war with ${nationB}.`, ...calendar });
      if (relation === 1) news.push({ message: `${nationA} is allied with ${nationB}.`, ...calendar });
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
  state.player.ships = state.player.ships.map(shipRecord);
  state.diplomacy ??= newState({ era: state.era, captain: state.captain, nationality: state.nationality, difficulty: state.difficulty, ability: state.ability }).diplomacy;
  state.worldNews ??= initialDiplomacyNews(state.diplomacy, state.calendar);
  state.treasureMap ??= { pieces: 0, clueTownIndex: null };
  state.player.barmaidRapport ??= {};
  state.player.barmaidInformants ??= [];
  state.player.capturedCaptains ??= [];
  state.player.land ??= 0;
  state.player.specialGoods ??= 0;
  state.portTrade ??= { townIndex: null, merchantCash: null, shipwrightCash: null };
  await loadWorldMap(state.era);
  movePlayerToNavigableCell();
  // A game saved in port resumes at sea beside the town's trigger cells.
  state.player.arrivalGuard = true;
  rng = createRng(state.seed);
  if (state.rngState && state.rngState !== 1) rng.state = state.rngState;
  // Loading begins a fresh sailing session in the original: trade wind,
  // reset cloud distance, and a new seasonal cloud arrangement.
  state.player.wind = 192;
  setupClouds();
  state.paused = false;
  state.mode = 'sailing';
  resetSailingInterpolation();
  startScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  controls.classList.remove('hidden');
  logElement.classList.remove('hidden');
  updateNearestTown();
  updateLog();
  updateInterface();
  resumeSailing();
}

function saveGame(showMessage = true) {
  if (!state || state.mode === 'battle') return;
  state.rngState = rng.state;
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  if (showMessage) addLog('Voyage saved in this browser.');
}

function loadGame() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) ?? localStorage.getItem(PREVIOUS_SAVE_KEY) ?? localStorage.getItem(LEGACY_SAVE_KEY));
    if (![1, 2, 3, 4, 5, SAVE_VERSION].includes(saved?.version) || !saved.player || !saved.towns) return null;
    // Version 6 replaces per-town alert with the original's single counter,
    // keeping the value of the town that was nearest when the game was saved.
    if (saved.alert === undefined) saved.alert = saved.towns[saved.nearestTownIndex ?? 0]?.alert ?? 0;
    for (const town of saved.towns) delete town.alert;
    // Version 4 stores fleet ships as damage-bearing records. The old storage
    // key remains readable so existing browser voyages are not discarded.
    saved.player.ships = saved.player.ships.map(shipRecord);
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
  if (payload.version !== 5) throw new Error('unsupported scenario data version');
  scenarios = payload.eras;
}

async function loadWorldMap(era) {
  if (mapCache.has(era)) {
    ({ map: worldMap, layer: worldMapLayer } = mapCache.get(era));
    return;
  }
  const response = await fetch(new URL(`../assets/world-${era}.bin`, import.meta.url));
  if (!response.ok) throw new Error(`map request failed: ${response.status}`);
  worldMap = decodeNavigationMap(await gunzip(await response.arrayBuffer()), WORLD.width, WORLD.height);
  worldMapLayer = buildWorldMapLayer(worldMap);
  mapCache.set(era, { map: worldMap, layer: worldMapLayer });
}

function buildWorldMapLayer(map) {
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
    [[34, 102, 112], [38, 110, 118], [31, 96, 106]],
  ];
  for (let y = 0; y < WORLD.height; y += 1) {
    for (let x = 0; x < WORLD.width; x += 1) {
      const cell = map.cells[y * WORLD.width + x];
      const shade = Math.abs((x * 17 + y * 31) % 3);
      for (let py = 0; py < 2; py += 1) {
        for (let px = 0; px < 2; px += 1) {
          // Mixed coastal cells sample the pixel class at each quarter's centre.
          let tone = cell;
          if (cell === CELL.MIXED) {
            const pixel = pixelClassAt(map, x + px / 2 + .25, y + py / 2 + .25);
            tone = pixel === PIXEL.LAND ? CELL.MIXED : pixel === PIXEL.SHALLOW ? 4 : CELL.WATER;
          }
          const color = palette[tone][shade];
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
  if (!worldMap) return true;
  if (x < 0 || y < 0 || x >= WORLD.width || y >= WORLD.height) return false;
  return isNavigableAt(worldMap, x, y);
}

function movePlayerToNavigableCell() {
  if (isNavigable(state.player.x, state.player.y)) return;
  const originX = Math.floor(state.player.x);
  const originY = Math.floor(state.player.y);
  for (let distance = 1; distance <= 12; distance += 1) {
    for (let dy = -distance; dy <= distance; dy += 1) {
      const dx = distance - Math.abs(dy);
      for (const xDirection of dx === 0 ? [0] : [-dx, dx]) {
        // Place the ship at the cell centre, so test that exact map pixel.
        const x = originX + xDirection + .5;
        const y = originY + dy + .5;
        if (isNavigable(x, y)) {
          state.player.x = x;
          state.player.y = y;
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

function townTriggers() {
  return scenarios[state.era].townTriggers;
}

function playerCell() {
  return [Math.floor(state.player.x), Math.floor(state.player.y)];
}

// The original picks the nearest town from the trigger-cell table, then
// measures town_dist to that town's record (x, y) (porting_guide.md §7).
function updateNearestTown() {
  const [cellX, cellY] = playerCell();
  state.nearestTownIndex = nearestTriggerTown(townTriggers(), cellX, cellY);
  return nearestTownDistance();
}

function nearestTownDistance() {
  const [cellX, cellY] = playerCell();
  return townDistanceCells(nearestTown(), cellX, cellY);
}

function isInlandTown(index) {
  const [x, y] = scenarios[state.era].towns[index].harbors[1];
  return x === 0 || y === 0;
}

// ASSUMED: landing parties are not playable yet (K1). A ship lying beside the
// coast may send a party to an inland town within this many map cells.
const OVERLAND_MARCH_RANGE_CELLS = 16;

function overlandMarchTargets() {
  const [cellX, cellY] = playerCell();
  const besideCoast = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]
    .some(([dx, dy]) => !isNavigable(cellX + dx + .5, cellY + dy + .5));
  if (!besideCoast) return [];
  return state.towns.flatMap((town, index) => {
    if (!isInlandTown(index)) return [];
    const distance = townDistanceCells(town, cellX, cellY);
    return distance <= OVERLAND_MARCH_RANGE_CELLS ? [{ town, index, distance }] : [];
  });
}

function fleetCapacity() {
  return state.player.ships.reduce((sum, ship) => sum + statsFor(ship).capacity, 0);
}

function cargoCapacity() {
  return state.player.ships.reduce((sum, ship) => sum + statsFor(ship).cargo, 0);
}

function cargoUsed() {
  return Math.floor(state.player.foodFixed / 256) + state.player.goods
    + state.player.specialGoods + Math.floor(state.player.cannon / 2);
}

function cargoRoom() {
  return Math.max(0, cargoCapacity() - cargoUsed());
}

function showOverfullHold(done, reason = 'The sold ship’s hold is gone. Choose exactly what to throw overboard before leaving the yard.') {
  const excess = cargoUsed() - cargoCapacity();
  if (excess <= 0) {
    done();
    return;
  }
  const actions = [];
  const food = Math.floor(state.player.foodFixed / 256);
  if (food > 0) actions.push({ label: 'Jettison 1 ton of food', run: () => { state.player.foodFixed -= 256; showOverfullHold(done, reason); } });
  if (state.player.goods > 0) actions.push({ label: 'Jettison 1 ton of goods', run: () => { state.player.goods -= 1; showOverfullHold(done, reason); } });
  if (state.player.specialGoods > 0) actions.push({ label: `Jettison 1 ton of ${specialGoodsName().toLowerCase()}`, run: () => { state.player.specialGoods -= 1; showOverfullHold(done, reason); } });
  if (state.player.cannon > 0) actions.push({ label: 'Jettison 1 cannon', run: () => { state.player.cannon -= 1; showOverfullHold(done, reason); } });
  showDialog({
    kicker: 'Overloaded fleet', title: `${excess} ton${excess === 1 ? '' : 's'} over capacity`,
    body: `<p>${reason}</p>`,
    actions,
  });
}

// Fleet check (0x1F65F, ships.md §5). The original runs it at the top of
// every voyage, after dividing the plunder and after a town assault. It
// repeats until every ship has eight men and the cargo fits in the hold.
function runFleetCheck({ inTown = false, done }) {
  const player = state.player;
  state.paused = true;
  if (fleetIsUndermanned({ crew: player.crew, shipCount: player.ships.length })) {
    if (player.ships.length === 1) {
      showDialog({
        kicker: 'Too few hands', title: 'The last ship is abandoned',
        body: '<p>You do not have enough crewmen to man your last ship, so regretfully you abandon it.</p>',
        actions: [{ label: 'Continue', run: () => loseLastShip({ inTown, done }) }],
      });
      return;
    }
    showDialog({
      kicker: 'Too few hands', title: 'Which ship will you abandon?',
      body: `<p>Your crew is too small to man your ships! Which will you abandon?</p><p>${player.crew} men can sail at most ${Math.floor(player.crew / 8)} ship${Math.floor(player.crew / 8) === 1 ? '' : 's'}; all cargo is moved to the ships you keep.</p>`,
      actions: player.ships.map((ship, slot) => ({
        label: `${slot === 0 ? 'Flagship' : `Ship ${slot + 1}`}: ${describeShip(ship)}`,
        run: () => {
          const result = abandonShip(state.player, slot);
          state.player = result.player;
          addLog(`Abandoned the ${shipName(result.lost)}: too few hands to sail her.`);
          runFleetCheck({ inTown, done });
        },
      })),
    });
    return;
  }
  showOverfullHold(done, 'You have more cargo than will fit in your hold! You must throw some overboard!');
}

// Last-ship path of remove_ship (0x1F2A1): prison in a town (0x1C056) or a
// shipwreck at sea (0x1BE71), then the fresh fleet 0x1EF87 with no gold.
function loseLastShip({ inTown, done }) {
  const town = state.visit ? state.towns[state.visit.townIndex] : nearestTown();
  const lost = state.player.ships[0];
  state.player = restartAfterLastShip(state.player, lost, SHIPS);
  const release = inTown ? releaseFromTown(town) : shoreNear(state.player.x, state.player.y);
  if (release) {
    state.player.x = release.x + .5;
    state.player.y = release.y + .5;
    if (release.heading !== undefined) state.player.heading = release.heading;
  }
  state.player.speed = 0;
  addLog(inTown ? `Imprisoned in ${town.name}; released with a new ${shipName(lost)}.` : `Washed ashore after losing the ${shipName(lost)}; a new expedition begins.`);
  showDialog({
    kicker: inTown ? 'Imprisoned' : 'Shipwrecked', title: inTown ? `Imprisoned in ${town.name}` : 'Washed ashore',
    body: inTown
      ? `<p>You are imprisoned in ${town.name}.</p><p>On your release, backers fund a new ${shipName(lost)} with ${state.player.partyGold.toLocaleString()} gold and ${state.player.crew} hands.</p>`
      : `<p>With your last ship gone, you are washed ashore on an uncharted island. The local Indians feed you and help you to regain your strength.</p><p>Backers fund a new ${shipName(lost)} with ${state.player.partyGold.toLocaleString()} gold and ${state.player.crew} hands.</p>`,
    // ASSUMED: the restart can leave fewer than eight men when reputation is
    // below -8, which would loop the original check forever; the port runs
    // the last-ship path once and continues.
    actions: [{ label: 'Continue', run: () => {
      if (state.mode !== 'town') { done(); return; }
      // Released from a port visit: the new voyage starts at the release point.
      state.visit = null;
      state.mode = 'sailing';
      setupClouds();
      startVoyage();
    } }],
  });
}

// 0x1C056: a coastal town releases you on its departure cell; an inland town
// shifts the point by its fixed offset and then searches for the shore.
function releaseFromTown(town) {
  const [departureX, departureY] = town.harbors?.[1] ?? [0, 0];
  // ASSUMED: the departure heading (w28) is not in the scenario data yet
  // (report item D5), so the current heading is kept on a coastal release.
  if (departureX && departureY) return { x: departureX, y: departureY };
  const [dx, dy] = INLAND_RELEASE_OFFSETS[town.name] ?? [0, 0];
  return shoreNear(town.x + dx, town.y + dy);
}

// find_shore wants LAND = tiles >= 60 and OPEN_WATER = tiles 0-39. In the
// navigation map those are cells holding a land pixel and all-water cells;
// shallow tiles 40-59 are mixed cells with no land pixel, so they are neither.
function shoreNear(x, y) {
  const cellClass = (cellX, cellY) => (worldMap ? worldMap.cells[cellY * WORLD.width + cellX] : CELL.WATER);
  const hasLandPixel = (cellX, cellY) => {
    for (let pixel = 0; pixel < 256; pixel += 1) {
      const px = cellX + ((pixel & 15) + .5) / 16;
      const py = cellY + ((pixel >> 4) + .5) / 16;
      if (pixelClassAt(worldMap, px, py) === PIXEL.LAND) return true;
    }
    return false;
  };
  return findShore(Math.floor(x), Math.floor(y), {
    width: WORLD.width, height: WORLD.height,
    isLand: (cellX, cellY) => {
      const kind = cellClass(cellX, cellY);
      return kind === CELL.MIXED ? hasLandPixel(cellX, cellY) : kind !== CELL.WATER;
    },
    isOpenWater: (cellX, cellY) => cellClass(cellX, cellY) === CELL.WATER,
  });
}

function specialGoodsName() {
  const year = Number(state.era);
  if (year <= 1600) return 'Hides';
  if (year <= 1640) return 'Tobacco';
  return 'Sugar';
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
    statsFor(ship).sizeClass > statsFor(slowest).sizeClass ? ship : slowest, state.player.ships[0]);
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
  const previousPlayerX = player.x;
  const previousPlayerY = player.y;
  previousSailingPose = sailingPose();
  previousSailingClouds = state.clouds.map((cloud) => ({ ...cloud }));
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
    speedRow: scenarios[state.era].speeds[shipName(fleetSpeedRow())],
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
  if (checkTownArrival(nextX, nextY, previousPlayerX, previousPlayerY)) return;

  if (player.voyageTick % TICKS_PER_WIND_SHIFT === 0) player.wind = shiftWind(player.wind, rng);
  if (state.tick % TICKS_PER_HALF_DAY === 0) halfDayUpdate();
  if (state.tick % TICKS_PER_DAY === 0) dailyUpdate();
  state.clouds = driftClouds({
    clouds: state.clouds, playerX: player.x, playerY: player.y,
    playerDeltaX: player.x - previousPlayerX, playerDeltaY: player.y - previousPlayerY,
    wind: player.wind, rng,
  });
  player.cloudDistancePixels = nearestCloudDistancePixels(state.clouds, player.x, player.y);
}

// Arrival is immediate when the ship touches one of a town's trigger cells
// (entering_towns.md §0). The original moves first and checks arrival before
// the land/sea switch (porting_guide.md §5, steps 5, 10 and 11), so a move
// that land would block here still counts as touching the trigger cell.
function checkTownArrival(attemptedX, attemptedY, previousX, previousY) {
  const triggers = townTriggers();
  const cells = [playerCell(), [Math.floor(attemptedX), Math.floor(attemptedY)]];
  const touched = cells.find(([x, y]) => triggerTownAt(triggers, x, y) >= 0);
  if (!touched) {
    state.player.arrivalGuard = false;
    return false;
  }
  if (state.player.arrivalGuard) return false;
  // The original restores the position from before this tick's move.
  state.player.x = previousX;
  state.player.y = previousY;
  state.nearestTownIndex = nearestTriggerTown(triggers, touched[0], touched[1]);
  approachTown();
  return true;
}

function halfDayUpdate() {
  const previousTownIndex = state.nearestTownIndex;
  const distance = updateNearestTown();
  const town = nearestTown();
  state.alert = alertAfterNearestTownCheck(state.alert, previousTownIndex, state.nearestTownIndex);
  const result = encounterRoll(distance, state.alert, rng);
  state.alert = result.alert;
  if (result.sighted) openSighting(town, distance);
}

function dailyUpdate() {
  const player = state.player;
  player.foodFixed = consumeDailyFood(player.foodFixed, player.crew);
  const remaining = foodDays(player.foodFixed, player.crew);
  if (remaining > 0 && remaining <= 20 && remaining % 4 === 0) addLog(`Only ${remaining} days of food remain.`);
  if (remaining === 0 && player.crew > 0) {
    const starving = starvationDesertion(player);
    player.crew = starving.crew;
    player.partyGold = starving.partyGold;
    player.foodFixed = starving.foodFixed;
    addLog(`Out of food: ${starving.deserters} men deserted with ${starving.goldLost} gold; the rest foraged 5 tons of food.`);
  }
  // Event 5: too few men for the fleet ends the voyage, and the next one
  // starts with the fleet check. An open encounter runs it on resuming.
  if (!state.paused && fleetIsUndermanned({ crew: player.crew, shipCount: player.ships.length })) resumeSailing();

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
  state.worldNews.unshift({ message, month: state.calendar.month, year: state.calendar.year });
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
      { label: 'Continue the voyage', secondary: true, run: () => { state.alert += 16; resumeAfterEncounter(); } },
    ],
  });
}

function revealEncounter(town, distance) {
  let nation = town.nation;
  let tier = chooseEncounterTier({ crew: state.player.crew, alert: state.alert, governorMood: town.mood, rng });
  if (distance > 12 || rng.int(15) < 4) {
    const roll = rng.int(20);
    tier = Math.floor(roll / 4);
    nation = NATION_ORDER[roll % 4];
  }
  const [ship, flag, crew, guns, kind, gold, cargo] = scenarios[state.era].encounters[nation][tier];
  const hostile = isEncounterHunter({ kind, favour: state.player.favour[flag] });
  const enemy = { ship, flag, crew, guns, kind, gold, cargo, hostile, namedCaptain: hostile };
  showDialog({
    kicker: 'The sail draws nearer', title: `She looks like a ${ship}`,
    body: '<p>The lookout cannot yet make out her colors. Will you close the distance?</p>',
    actions: [
      { label: 'Investigate', run: () => identifyEncounter(enemy, town) },
      // A hunter ignores this answer (0xD560) and closes regardless.
      { label: 'Sail away', secondary: true, run: () => (enemy.hostile ? identifyEncounter(enemy, town) : escapeEncounter(enemy, town)) },
    ],
  });
}

function identifyEncounter(enemy, town) {
  showDialog({
    kicker: `${enemy.flag === 'pirate' ? 'Pirate' : enemy.flag} colors`, title: `The ${enemy.ship}`,
    body: `<p>She carries about ${enemy.crew * 4} hands and ${enemy.guns} guns. ${enemy.hostile ? 'She alters course and gives chase.' : 'Her crew watches your approach.'}</p>`,
    actions: [
      { label: 'Close for battle', run: () => closeForBattle(enemy) },
      { label: 'Hail for news', run: () => evadeHunter(enemy, () => hailForNews(enemy, town)) },
      { label: 'Sail away', secondary: true, run: () => evadeHunter(enemy, () => escapeEncounter(enemy, town)) },
    ],
  });
}

function evadeHunter(enemy, next) {
  if (!hunterOvertakes({ hunter: enemy.hostile, difficulty: state.difficulty, rng })) {
    next();
    return;
  }
  showDialog({
    kicker: 'Overtaken', title: 'She is overtaking us',
    body: `<p>The ${enemy.ship} closes too quickly to escape. You will have to fight.</p>`,
    actions: [{ label: 'Prepare for battle', run: () => closeForBattle(enemy) }],
  });
}

function escapeEncounter(enemy, town) {
  state.alert += 16;
  addLog(`You leave the ${enemy.ship} astern.`);
  resumeAfterEncounter();
}

function hailForNews(enemy, town) {
  if (state.player.favour[enemy.flag] <= -4) {
    showDialog({
      kicker: 'No reply', title: 'Your hail goes unanswered',
      body: `<p>The ${enemy.ship} runs out her guns and prepares for battle.</p>`,
      actions: [{ label: 'Prepare for battle', run: () => closeForBattle(enemy) }],
    });
    return;
  }
  const items = state.worldNews.slice(0, 6);
  // Hailing returns "no battle" from 0xD1FC, so the caller raises the alert
  // by 16 just as when sailing away (0x284EF).
  state.alert += 16;
  showDialog({
    kicker: 'Ship’s News', title: 'News from across the Caribbean',
    body: newsBody(items, 'The other captain has heard nothing of consequence.'),
    actions: [{ label: 'Continue the voyage', run: () => { addLog(`Exchanged news with a ${enemy.flag} ${enemy.ship}.`); resumeAfterEncounter(); } }],
  });
}

function closeForBattle(enemy) {
  const choices = state.player.ships.map((ship, index) => ({
    label: `Command ${describeShip(ship)}${index === 0 ? ' (flagship)' : ''}`,
    run: () => beginTacticalBattle(enemy, index),
  }));
  showDialog({
    kicker: 'Battle stations', title: `Closing with the ${enemy.ship}`,
    body: `<p>Choose the ship you will command. Eight hands remain aboard every reserve ship.</p><p>Steer with Left/Right or A/D, fire with Space, and change sail with Up/Down.</p>`,
    actions: choices,
  });
}

function beginTacticalBattle(enemy, flagshipIndex) {
  state.battle = createBattle({
    player: state.player,
    enemy,
    flagshipIndex,
    speedRows: scenarios[state.era].speeds,
    difficulty: state.difficulty,
    ability: state.ability,
    playerFlag: state.nationality,
    crewMorale: morale({ ...state.player, difficulty: state.difficulty }),
    rng,
  });
  state.player.ships = state.battle.fleet.map(shipRecord);
  state.mode = 'battle';
  state.paused = false;
  battleAccumulator = 0;
  input.firePressed = false;
  input.raiseSailsPressed = false;
  input.lowerSailsPressed = false;
  canvas.setAttribute('aria-label', 'Tactical sea battle');
  addLog(`Battle joined with the ${enemy.flag} ${enemy.ship}.`);
  updateInterface();
}

function applyBattleSurvivors(battle) {
  state.player.crew = Math.max(1, battle.player.men + battle.player.reserveMen);
  state.player.cannon = Math.max(0, battle.player.guns + battle.player.reserveGuns);
  const damage = Math.min(48, battle.player.damage & 0xf0);
  state.player.ships = battle.fleet.map(shipRecord);
  if (state.player.ships.length) state.player.ships[0] = { ...state.player.ships[0], damage };
  const distance = nearestTownDistance();
  if (distance < 12) state.alert += 24 - 2 * distance;
}

function capacitySafeFleet() {
  if (state.player.ships.length === 0) {
    // ASSUMED recovery bridge until capture/prison and career-ending states exist.
    state.player.ships.push({ type: 'Pinnace', damage: 0 });
  }
  state.player.crew = Math.min(state.player.crew, fleetCapacity());
  state.player.cannon = Math.min(state.player.cannon, state.player.ships.reduce((sum, ship) => sum + statsFor(ship).guns, 0));
  const hold = Math.max(0, cargoCapacity() - Math.floor(state.player.cannon / 2));
  state.player.goods = Math.min(state.player.goods, hold);
  state.player.specialGoods = Math.min(state.player.specialGoods, Math.max(0, hold - state.player.goods));
  state.player.foodFixed = Math.min(state.player.foodFixed, Math.max(0, hold - state.player.goods - state.player.specialGoods) * 256);
}

function endBattleToSailing(message) {
  state.battle = null;
  state.mode = 'sailing';
  state.paused = false;
  canvas.setAttribute('aria-label', 'Caribbean sailing map');
  addLog(message);
  saveGame(false);
  resumeAfterEncounter();
}

function finishTacticalBattle() {
  const battle = state.battle;
  if (!battle?.event || state.paused) return;
  state.paused = true;
  applyBattleSurvivors(battle);
  const enemy = {
    ...battle.encounter,
    crew: Math.max(1, Math.ceil(battle.enemy.men / 4)),
    guns: battle.enemy.guns,
  };

  if (battle.event === 'enemy-struck') {
    state.battle = null;
    state.mode = 'sailing';
    addLog(`The ${enemy.ship} struck her colors.`);
    beginShipCapture(enemy);
    return;
  }
  if (battle.event === 'boarding') {
    offerProvisionalBoarding(enemy);
    return;
  }
  if (battle.event === 'player-sunk') {
    state.player.ships.shift();
    state.player.wounds = (state.player.wounds ?? 0) + 1;
    state.player.crew = Math.max(1, Math.floor(state.player.crew / 2));
    capacitySafeFleet();
    endBattleToSailing('Your flagship sank; survivors were taken aboard the remaining fleet.');
    return;
  }
  if (battle.event === 'enemy-sunk') {
    state.player.reputation += 1;
    // Likely trade-loss target per sea_battles.md; the nearest-town pointer is not fully confirmed.
    nearestTown().growth = Math.max(0, nearestTown().growth - 10);
    endBattleToSailing(`The ${enemy.ship} exploded and sank. No prize remained.`);
    return;
  }
  if ((battle.event === 'escaped' || battle.event === 'sunset') && state.player.ships.length > 1
      && battle.enemy.damage < 16 && battle.enemy.tactic !== 'flee') {
    let slowest = 1;
    for (let index = 2; index < state.player.ships.length; index += 1) {
      if (statsFor(state.player.ships[index]).type > statsFor(state.player.ships[slowest]).type) slowest = index;
    }
    const [lost] = state.player.ships.splice(slowest, 1);
    capacitySafeFleet();
    endBattleToSailing(`The enemy overtook and captured your reserve ${shipName(lost)} during the escape.`);
    return;
  }
  const messages = {
    escaped: battle.enemy.tactic === 'flee' ? `The ${enemy.ship} escaped.` : 'Your flagship sailed out of range.',
    sunset: 'The sun set after a long chase; both ships withdrew.',
    beached: 'The flagship touched land and withdrew from the engagement.',
  };
  if (battle.event === 'beached') state.player.reputation -= 1;
  endBattleToSailing(messages[battle.event] ?? 'The battle ended.');
}

function offerProvisionalBoarding(enemy) {
  showDialog({
    kicker: 'Ships grappled', title: `Boarding the ${enemy.ship}`,
    body: '<p>Interactive boarding and sword fighting are not playable yet. Choose the provisional outcome; it will update the voyage and captain’s log.</p>',
    actions: [
      { label: 'Win and capture the ship', run: () => resolveProvisionalBoarding(enemy, 'won') },
      { label: 'Be driven back', secondary: true, run: () => resolveProvisionalBoarding(enemy, 'driven-back') },
      { label: 'Lose and pay ransom', run: () => resolveProvisionalBoarding(enemy, 'defeated') },
    ],
  });
}

function resolveProvisionalBoarding(enemy, outcome) {
  if (outcome === 'won') {
    state.battle = null;
    state.mode = 'sailing';
    addLog(`Provisional boarding victory: captured the ${enemy.ship}.`);
    beginShipCapture(enemy);
    return;
  }
  const result = applyProvisionalBoardingOutcome(state.player, state.battle.player.men, outcome);
  state.player = result.player;
  state.alert += 16;
  if (outcome === 'defeated') {
    endBattleToSailing(`Provisional boarding defeat: lost ${result.casualties} crew and paid ${result.ransom} gold in ransom.`);
    return;
  }
  endBattleToSailing('Provisional boarding result: the boarding party was driven back and broke away.');
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
    state.player.ships.push({ type: enemy.ship, damage: 0 });
    state.player.crew = Math.max(state.player.crew, slotIndex * 8);
    addLog(`Sent a prize crew aboard the captured ${enemy.ship}.`);
    finishPrizeDecision(enemy, true);
    return;
  }
  showDialog({
    kicker: 'Fleet at capacity', title: 'Choose a ship to abandon',
    body: '<p>The fleet can carry no more than eight ships. Choose one vessel to strip and replace with the prize.</p>',
    actions: state.player.ships.map((ship, index) => ({
      label: `Abandon ${describeShip(ship)} (${index + 1})`,
      run: () => {
        state.player.ships[index] = { type: enemy.ship, damage: 0 };
        addLog(`Abandoned a ${shipName(ship)} and kept the captured ${enemy.ship}.`);
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

  if (enemy.flag === 'pirate') {
    resolvePirateCaptain(enemy, () => openShipPlunder(enemy));
    return;
  }
  if (enemy.namedCaptain) {
    resolveNamedCaptain(enemy, () => openShipPlunder(enemy));
    return;
  }
  openShipPlunder(enemy);
}

function resolvePirateCaptain(enemy, next) {
  const terms = pirateCaptainTerms(enemy.kind);
  const hasRoom = state.player.capturedCaptains.filter(({ pirate }) => pirate).length < 8;
  showDialog({
    kicker: 'A pirate prisoner', title: 'The pirate captain yields',
    body: `<p>You may hold the captain for delivery to a governor. A governor is expected to pay ${terms.bounty} gold and improve your standing with that nation.</p>`,
    actions: [
      ...(hasRoom ? [{ label: 'Take the captain prisoner', run: () => {
        state.player.capturedCaptains.push({ pirate: true, ship: enemy.ship, value: enemy.kind, ...terms });
        addLog(`Captured a pirate captain worth a ${terms.bounty}-gold bounty.`);
        next();
      } }] : []),
      { label: hasRoom ? 'Release the captain' : 'No room for another prisoner', secondary: true, run: next },
    ],
  });
}

function resolveNamedCaptain(enemy, next) {
  state.player.capturedCaptains ??= [];
  if (enemy.flag !== 'Spain') {
    if (state.player.capturedCaptains.length < 8) {
      state.player.capturedCaptains.push({ nation: enemy.flag, ship: enemy.ship, pirate: false });
      addLog(`The ${enemy.flag} captain is held for delivery to a governor.`);
    }
    next();
    return;
  }
  showDialog({
    kicker: 'A notable prisoner', title: `The ${enemy.flag} captain yields`,
    body: '<p>The original offers information about Spanish treasure movements, or lets you hold the captain for ransom.</p>',
    actions: [
      { label: 'Ask about the treasure fleet', run: () => showConvoyReport('treasureFleet', next) },
      { label: 'Ask about the silver train', run: () => showConvoyReport('silverTrain', next) },
      { label: 'Hold for ransom', run: () => { if (state.player.capturedCaptains.length < 8) state.player.capturedCaptains.push({ nation: enemy.flag, ship: enemy.ship, pirate: false }); addLog(`Held the ${enemy.flag} captain for ransom.`); next(); } },
    ],
  });
}

function showConvoyReport(kind, next) {
  const label = kind === 'treasureFleet' ? 'treasure fleet' : 'silver train';
  const report = convoyReport({
    kind,
    route: scenarios[state.era].convoyRoutes[kind],
    towns: state.towns,
    calendar: state.calendar,
    eraIndex: Object.keys(scenarios).indexOf(state.era),
  });
  const message = report.location
    ? `The ${label} was last reported at ${report.location}${report.next ? `, bound next for ${report.next}` : ''}.`
    : `The ${label} has completed its Caribbean run and sailed for Spain.`;
  addLog(message);
  showDialog({
    kicker: 'Intelligence from a prisoner', title: report.location ?? 'Gone to Spain',
    body: `<p>${message}</p>`,
    actions: [{ label: 'Continue to the captured ship', run: next }],
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
  const remaining = {
    food: loot.food,
    goods: loot.goods,
    specialGoods: loot.specialGoods ?? 0,
    cannon: loot.cannon,
  };
  let repeatDelay = 0;
  let repeatInterval = 0;

  const stopTransferRepeat = () => {
    clearTimeout(repeatDelay);
    clearInterval(repeatInterval);
    repeatDelay = 0;
    repeatInterval = 0;
  };
  addEventListener('pointerup', stopTransferRepeat);
  addEventListener('pointercancel', stopTransferRepeat);
  addEventListener('blur', stopTransferRepeat);

  const stowCargo = (kind, requested) => {
    const amount = Math.min(requested, remaining[kind], cargoRoom());
    if (kind === 'food') state.player.foodFixed += amount * 256;
    else state.player[kind] += amount;
    remaining[kind] -= amount;
    return amount;
  };

  const returnCargo = (kind, requested) => {
    const aboard = kind === 'food' ? Math.floor(state.player.foodFixed / 256) : state.player[kind];
    const amount = Math.min(requested, aboard);
    if (kind === 'food') state.player.foodFixed -= amount * 256;
    else state.player[kind] -= amount;
    remaining[kind] += amount;
    return amount;
  };

  const mountCannon = (requested) => {
    const room = cargoRoom();
    const gunRoom = Math.max(0, state.player.ships.reduce((sum, ship) => sum + statsFor(ship).guns, 0) - state.player.cannon);
    const cannonByHold = room * 2 + (state.player.cannon % 2 === 0 ? 1 : 0);
    const amount = Math.min(requested, remaining.cannon, gunRoom, cannonByHold);
    state.player.cannon += amount;
    remaining.cannon -= amount;
    return amount;
  };

  const returnCannon = (requested) => {
    const amount = Math.min(requested, state.player.cannon);
    state.player.cannon -= amount;
    remaining.cannon += amount;
    return amount;
  };

  function showTransfer(preferredTransfer = '', preferredKind = '') {
    const food = Math.floor(state.player.foodFixed / 256);
    const room = cargoRoom();
    const gunRoom = Math.max(0, state.player.ships.reduce((sum, ship) => sum + statsFor(ship).guns, 0) - state.player.cannon);
    const cannonByHold = room * 2 + (state.player.cannon % 2 === 0 ? 1 : 0);
    const cannonAmount = Math.min(gunRoom, remaining.cannon, cannonByHold);
    const rows = [
      { kind: 'food', label: 'Food', aboard: food, available: remaining.food, maximum: Math.min(room, remaining.food), unit: 'ton of food' },
      { kind: 'goods', label: 'Goods', aboard: state.player.goods, available: remaining.goods, maximum: Math.min(room, remaining.goods), unit: 'ton of goods' },
      { kind: 'specialGoods', label: specialGoodsName(), aboard: state.player.specialGoods, available: remaining.specialGoods, maximum: Math.min(room, remaining.specialGoods), unit: `ton of ${specialGoodsName().toLowerCase()}` },
      { kind: 'cannon', label: 'Cannon', aboard: state.player.cannon, available: remaining.cannon, maximum: cannonAmount, unit: 'cannon' },
    ];
    const canTakeAnything = rows.some(row => row.maximum > 0);
    const rowMarkup = rows.map(row => `<tr>
      <th scope="row">${row.label}</th>
      <td><div class="plunder-cell"><button type="button" class="plunder-arrow" data-transfer="take" data-kind="${row.kind}" aria-label="Take one ${row.unit}" title="Take one ${row.unit}"${row.maximum === 0 ? ' disabled' : ''}>←</button><strong>${row.aboard}</strong></div></td>
      <td><div class="plunder-cell plunder-source"><strong>${row.available}</strong><button type="button" class="plunder-arrow" data-transfer="return" data-kind="${row.kind}" aria-label="Move one ${row.unit} to the looted ship or town" title="Move one ${row.unit} to the looted ship or town"${row.aboard === 0 ? ' disabled' : ''}>→</button><button type="button" class="plunder-take-all" data-transfer="take-all" data-kind="${row.kind}"${row.maximum === 0 ? ' disabled' : ''}>Take all</button></div></td>
    </tr>`).join('');

    const finish = () => {
      stopTransferRepeat();
      removeEventListener('pointerup', stopTransferRepeat);
      removeEventListener('pointercancel', stopTransferRepeat);
      removeEventListener('blur', stopTransferRepeat);
      const left = [
        remaining.food > 0 ? `${remaining.food} ${remaining.food === 1 ? 'ton' : 'tons'} of food` : '',
        remaining.goods > 0 ? `${remaining.goods} ${remaining.goods === 1 ? 'ton' : 'tons'} of goods` : '',
        remaining.specialGoods > 0 ? `${remaining.specialGoods} ${remaining.specialGoods === 1 ? 'ton' : 'tons'} of ${specialGoodsName().toLowerCase()}` : '',
        remaining.cannon > 0 ? `${remaining.cannon} cannon` : '',
      ].filter(Boolean);
      if (left.length === 0) addLog('Transferred all useful plunder.');
      else if (canTakeAnything) addLog(`Left behind by choice: ${left.join(', ')}.`);
      else addLog(`The fleet could carry no more. Left behind: ${left.join(', ')}.`);
      done();
    };
    showDialog({
      kicker: 'Prizes and plunder', title,
      body: `<p>Gold is taken automatically. Use the arrows to move one unit at a time.</p>
        <dl class="plunder-summary"><dt>Gold taken</dt><dd>${loot.gold}</dd><dt>Free hold</dt><dd>${room} tons</dd></dl>
        <table class="plunder-manifest">
          <thead><tr><th>Type</th><th>Our fleet</th><th>Looted ship / town</th></tr></thead>
          <tbody>${rowMarkup}</tbody>
        </table>
        <button type="button" class="plunder-take-everything" data-transfer="take-everything"${canTakeAnything ? '' : ' disabled'}>Take everything that fits</button>`,
      actions: [{ label: 'Finish looting', secondary: true, run: finish }],
    });

    const transferButtons = [...dialogBody.querySelectorAll('[data-transfer]')];
    const applyTransfer = (transfer, kind) => {
      let moved = 0;
      if (transfer === 'take-everything') {
        for (const cargoKind of ['food', 'goods', 'specialGoods']) moved += stowCargo(cargoKind, Number.MAX_SAFE_INTEGER);
        moved += mountCannon(Number.MAX_SAFE_INTEGER);
      } else if (transfer === 'take') {
        moved = kind === 'cannon' ? mountCannon(1) : stowCargo(kind, 1);
      } else if (transfer === 'take-all') {
        moved = kind === 'cannon' ? mountCannon(Number.MAX_SAFE_INTEGER) : stowCargo(kind, Number.MAX_SAFE_INTEGER);
      } else if (transfer === 'return') {
        moved = kind === 'cannon' ? returnCannon(1) : returnCargo(kind, 1);
      }
      if (moved > 0) showTransfer(transfer, kind);
      return moved;
    };
    for (const button of transferButtons) {
      button.addEventListener('click', () => {
        const { transfer, kind } = button.dataset;
        applyTransfer(transfer, kind);
      });
      if (['take', 'return'].includes(button.dataset.transfer)) {
        button.addEventListener('pointerdown', (event) => {
          if (event.button !== 0 || button.disabled) return;
          event.preventDefault();
          stopTransferRepeat();
          const { transfer, kind } = button.dataset;
          if (applyTransfer(transfer, kind) === 0) return;
          repeatDelay = setTimeout(() => {
            repeatInterval = setInterval(() => {
              if (applyTransfer(transfer, kind) === 0) stopTransferRepeat();
            }, 90);
          }, 320);
        });
      }
    }
    const nextFocus = transferButtons.find(button => !button.disabled && button.dataset.transfer === preferredTransfer && button.dataset.kind === preferredKind)
      ?? transferButtons.find(button => !button.disabled && preferredKind && button.dataset.kind === preferredKind)
      ?? transferButtons.find(button => !button.disabled && button.dataset.transfer === 'take')
      ?? transferButtons.find(button => !button.disabled);
    nextFocus?.focus();
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

function approachTown({ overland = false } = {}) {
  const town = nearestTown();
  state.paused = true;
  state.approach = { overland };
  // ASSUMED: the original puts the ship on the departure cell after the
  // approach menu (D5). Until then this guard, cleared once the ship is off
  // every trigger cell, stops an immediate re-arrival on the cell it touches.
  state.player.arrivalGuard = true;
  const fortText = town.forts === 0 ? 'No fort guards the harbor.' : `${town.forts === 1 ? 'One fort guards' : `${town.forts} forts guard`} the harbor.`;
  showDialog({
    kicker: `${town.nation} · ${prosperity(town.growth)}`, title: town.name,
    body: `<p>You have arrived at ${town.name}. ${fortText}</p><dl><dt>Citizens</dt><dd>${town.population * 100}</dd><dt>Soldiers</dt><dd>${town.soldiers * 5}</dd><dt>Treasury</dt><dd>${town.gold * 1000} gold</dd></dl>`,
    actions: [
      { label: overland ? 'March into town' : 'Sail into the harbor', run: () => tryHarbor(town) },
      { label: 'Sneak into town', run: () => trySneak(town) },
      { label: 'Attack the town', run: () => attackTown(town) },
      { label: 'Leave town', secondary: true, run: resumeSailing },
    ],
  });
}

function showOverlandMarch() {
  const targets = overlandMarchTargets();
  if (!state || state.mode !== 'sailing' || !targets.length) return;
  state.paused = true;
  showDialog({
    kicker: 'Landing party', title: 'March inland',
    body: '<p>Landing and overland travel are not playable yet. Choose a provisional outcome: the party marches two map cells a day while the fleet waits at anchor.</p>',
    actions: [
      ...targets.map(({ town, index, distance }) => {
        const days = Math.ceil(distance / 2);
        return { label: `March to ${town.name} (${days} day${days === 1 ? '' : 's'})`, run: () => marchOverland(index, days) };
      }),
      { label: 'Stay aboard', secondary: true, run: resumeSailing },
    ],
  });
}

function marchOverland(townIndex, days) {
  for (let day = 0; day < days; day += 1) dailyUpdate();
  state.nearestTownIndex = townIndex;
  addLog(`The landing party marches to ${state.towns[townIndex].name}.`);
  approachTown({ overland: true });
}

function attackTown(town) {
  showDialog({
    kicker: 'Assault', title: `Attack ${town.name}`,
    body: `<p>Town and land combat are not playable yet. Choose the provisional result of the assault; capture now leads into the documented plunder sequence.</p>`,
    actions: [
      { label: 'Capture the town', run: () => captureTown(town) },
      { label: 'Repelled with losses', run: () => { const lost = Math.min(state.player.crew - 1, Math.max(1, Math.floor(state.player.crew / 5))); state.player.crew -= lost; state.alert += 16; state.player.reputation -= 2; addLog(`Lost ${lost} crew attacking ${town.name}.`); runFleetCheck({ inTown: true, done: startVoyage }); } },
      { label: 'Withdraw from the assault', secondary: true, run: () => { state.alert += 16; addLog(`Withdrew from the assault on ${town.name}.`); resumeSailing(); } },
    ],
  });
}

function captureTown(town) {
  if (state.alert >= 12) {
    const hidden = ['Some', 'Much', 'Most'][Math.min(2, Math.floor((state.alert - 12) / 15))];
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
    runFleetCheck({ inTown: true, done: startVoyage });
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
  // Fort fire can only sink a ship that arrived by sea (0x1953A).
  if (result.shipLost && !state.approach?.overland && state.player.ships.length > 1) {
    const lost = state.player.ships.splice(rng.int(state.player.ships.length), 1)[0];
    showNotice('The fort opens fire', `An accurate salvo sinks your ${shipName(lost)}. The fleet withdraws to open water.`);
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
  if (state.portTrade.townIndex !== state.nearestTownIndex) {
    state.portTrade = { townIndex: state.nearestTownIndex, merchantCash: null, shipwrightCash: null };
  }
  addLog(`Made port at ${town.name}.`);
  showTownMenu();
}

function showTownMenu() {
  const town = state.towns[state.visit.townIndex];
  const commission = state.player.favour[town.nation] >= 2
    ? `${town.nation} letter of marque`
    : 'None';
  const actions = [
    { label: 'Governor', run: showGovernor },
    { label: 'Tavern', run: showTavern },
    { label: 'Merchant', run: openMerchant },
    { label: 'Shipwright', run: showShipwright },
    { label: 'Divide the plunder', run: showPlunderDivision },
    { label: 'Save voyage', secondary: true, run: () => { saveGame(); showTownMenu(); } },
    { label: 'Put to sea', secondary: true, run: leaveTown },
  ];
  if (state.visit.sneaking) actions.splice(2, 1);
  showDialog({
    kicker: `${town.nation} port`, title: town.name,
    body: `<p>${state.visit.sneaking ? 'You move through the streets under a borrowed name.' : 'Your ships lie safely at anchor.'}</p><dl><dt>Standing</dt><dd>${commission}</dd><dt>Crew</dt><dd>${state.player.crew}</dd><dt>Food</dt><dd>${Math.floor(state.player.foodFixed / 256)}</dd><dt>Gold</dt><dd>${state.player.partyGold}</dd></dl>`,
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
    flagshipSizeClass: statsFor(flagship).sizeClass,
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
    body: `<p>Ending this expedition will disperse the crew and divide every ship, cannon, and cargo except your flagship.</p><dl><dt>Each crew member receives</dt><dd>${division.crewShare.toLocaleString()} gold</dd><dt>Crew reaction</dt><dd>${satisfaction}</dd><dt>Your share (${division.officerShares} portions)</dt><dd>${division.captainTake.toLocaleString()} gold</dd><dt>Funds for the next voyage</dt><dd>${division.expeditionGold.toLocaleString()} gold</dd><dt>Flagship retained</dt><dd>${describeShip(flagship)}</dd></dl>`,
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
    actions: [{ label: 'Return to town', run: () => runFleetCheck({ inTown: true, done: showTownMenu }) }],
  });
}

function showGovernor(offerPrisoners = true) {
  const town = state.towns[state.visit.townIndex];
  const favour = state.player.favour[town.nation];
  const briefing = diplomaticBriefing(state.diplomacy, town.nation);
  const briefingBody = briefing.length
    ? `<p>The governor describes the present affairs of the Crown:</p><ul class="ship-news">${briefing.map(({ message }) => `<li>${message}</li>`).join('')}</ul>`
    : `<p>The governor reports that ${town.nation} is at peace with every European power in the Caribbean.</p>`;
  if (state.visit.sneaking) {
    showDialog({ kicker: 'Governor’s residence', title: 'The doors stay shut', body: '<p>The governor will not receive a visitor who slipped past his guards.</p>', actions: [{ label: 'Return to town', run: showTownMenu }] });
    return;
  }
  const capturedPirates = state.player.capturedCaptains.filter(({ pirate }) => pirate);
  if (offerPrisoners && capturedPirates.length > 0) {
    const bounty = capturedPirates.reduce((sum, captain) => sum + (captain.bounty ?? pirateCaptainTerms(captain.value).bounty), 0);
    const favourGain = capturedPirates.reduce((sum, captain) => sum + (captain.favourGain ?? pirateCaptainTerms(captain.value).favourGain), 0);
    showDialog({
      kicker: `${town.nation} governor`, title: capturedPirates.length === 1 ? 'A pirate brought to justice' : `${capturedPirates.length} pirates brought to justice`,
      body: `<p>The governor offers ${bounty.toLocaleString()} gold for the ${capturedPirates.length === 1 ? 'captain' : 'captains'} and promises that the service will be remembered.</p><dl><dt>Bounty</dt><dd>${bounty.toLocaleString()} gold</dd><dt>${town.nation} favour reward</dt><dd>+${favourGain}</dd><dt>Current national favour</dt><dd>${favour}</dd><dt>Governor mood (debug)</dt><dd>${town.mood}</dd></dl>`,
      actions: [
        { label: `Turn ${capturedPirates.length === 1 ? 'him' : 'them'} over`, run: () => {
          state.player.partyGold += bounty;
          state.player.favour[town.nation] += favourGain;
          state.player.capturedCaptains = state.player.capturedCaptains.filter(({ pirate }) => !pirate);
          addLog(`Turned over ${capturedPirates.length} pirate ${capturedPirates.length === 1 ? 'captain' : 'captains'} in ${town.name} for ${bounty} gold.`);
          showGovernor();
        } },
        { label: 'Discuss other business', secondary: true, run: () => showGovernor(false) },
      ],
    });
    return;
  }
  const promotion = governorPromotion({
    favour,
    rank: state.player.ranks[town.nation],
    governorMood: town.mood,
  });
  if (promotion) {
    const oldRank = state.player.ranks[town.nation];
    state.player.ranks[town.nation] = promotion.rank;
    state.player.favour[town.nation] = promotion.favour;
    state.player.land += promotion.landUnits;
    addLog(`${town.nation} promoted you from ${RANK_NAMES[oldRank]} to ${RANK_NAMES[promotion.rank]}.`);
    showDialog({
      kicker: `${town.nation} governor`, title: `Promotion to ${RANK_NAMES[promotion.rank]}`,
      body: `<p>The Crown recognizes your service to ${town.nation}.</p><dl><dt>New rank</dt><dd>${RANK_NAMES[promotion.rank]}</dd><dt>${town.nation} national favour</dt><dd>${promotion.favour}</dd>${promotion.landUnits > 0 ? `<dt>Land grant</dt><dd>${(promotion.landUnits * 50).toLocaleString()} acres</dd>` : ''}<dt>Governor mood (debug)</dt><dd>${town.mood}</dd></dl>`,
      actions: [{ label: 'Continue the audience', run: () => showGovernor(false) }],
    });
    return;
  }
  const governorStatus = `<dl><dt>${town.nation} national favour</dt><dd>${favour}</dd><dt>${town.nation} rank</dt><dd>${RANK_NAMES[state.player.ranks[town.nation]]}</dd><dt>Governor mood (debug)</dt><dd>${town.mood}</dd></dl>`;
  // The original governor driver delivers matching captives before checking
  // whether favour is <= -4, and its direct favour addition may cross +2.
  // Preserve both effects: turning in a pirate can restore an audience and
  // earn a commission without buying amnesty.
  if (favour <= -4) {
    showDialog({ kicker: `${town.nation} governor`, title: 'An enemy of the Crown', body: `<p>The governor refuses to see you.</p>${governorStatus}`, actions: [{ label: 'Return to town', run: showTownMenu }] });
    return;
  }
  if (favour < 2) {
    const price = 200 * (4 - favour ** 3);
    showDialog({
      kicker: `${town.nation} governor`, title: 'A chance for amnesty',
      body: `<p>The governor offers a letter of marque for ${price} gold pieces.</p>${governorStatus}${briefingBody}`,
      actions: [
        { label: 'Buy the commission', run: () => { if (state.player.partyGold >= price) { state.player.partyGold -= price; state.player.favour[town.nation] = Math.min(favour + 2, 2); addLog(`${town.nation} granted you a letter of marque.`); } else addLog('You cannot afford the commission.'); showTownMenu(); } },
        { label: 'Decline', secondary: true, run: showTownMenu },
      ],
    });
    return;
  }
  showDialog({ kicker: `${town.nation} governor`, title: 'A cordial audience', body: `<p>The governor welcomes a proven friend of ${town.nation}. Your letter of marque remains in good standing.</p>${governorStatus}${briefingBody}`, actions: [{ label: 'Return to town', run: showTownMenu }] });
}

function showTavern() {
  const town = state.towns[state.visit.townIndex];
  if (!state.visit.tavernEncounters) {
    state.visit.tavernEncounters = tavernSpecialEncounters({ mapPieces: state.treasureMap.pieces, rng })
      .map((encounter) => ({
        ...encounter,
        resolved: false,
        townIndex: encounter.kind === 'traveller'
          ? (state.visit.townIndex + 1 + rng.int(state.towns.length - 1)) % state.towns.length
          : null,
      }));
  }
  const encounters = state.visit.tavernEncounters.filter(({ resolved }) => !resolved);
  const map = state.treasureMap;
  const actions = [];
  if (!state.visit.recruited) actions.push({ label: 'Speak with unemployed sailors', run: showTavernRecruits });
  actions.push(
    { label: 'Ask the bartender for news', run: showBartenderNews },
    { label: 'Talk to the barmaid', run: showBarmaid },
  );
  for (const encounter of encounters) {
    actions.push({
      label: encounter.kind === 'map-seller' ? 'Approach the map seller' : 'Speak with the traveller',
      run: () => showTavernSpecialEncounter(encounter),
    });
  }
  if (map.pieces >= 1) actions.push({ label: 'Study the treasure map', run: showTreasureMap });
  actions.push({ label: 'Return to town', secondary: true, run: showTownMenu });

  const visitor = encounters.length
    ? encounters.map(({ kind }) => kind === 'map-seller'
      ? 'A weather-beaten pirate guards a scrap of parchment in a shadowed booth.'
      : 'A traveller watches the room, waiting for someone willing to buy information.').join(' ')
    : 'No unusual visitors draw your attention tonight.';
  showDialog({
    kicker: `The tavern · ${town.name}`,
    title: 'Rumours, recruits, and strong drink',
    body: `<p>${visitor}</p><dl><dt>Sailors</dt><dd>${state.visit.recruited ? 'Already approached' : 'Available'}</dd><dt>Treasure map</dt><dd>${map.pieces}/4 pieces</dd><dt>Your gold</dt><dd>${state.player.partyGold}</dd></dl>`,
    actions,
  });
}

function showTavernRecruits() {
  const town = state.towns[state.visit.townIndex];
  if (state.visit.recruited) {
    showDialog({ kicker: 'The tavern', title: 'No more volunteers', body: '<p>Every willing sailor in the room has already heard your offer.</p>', actions: [{ label: 'Return to the tavern', run: showTavern }] });
    return;
  }
  const recruits = tavernRecruits({ townPopulation: town.population, reputation: state.player.reputation, difficulty: state.difficulty, crew: state.player.crew, capacity: fleetCapacity(), rng });
  state.visit.recruited = true;
  showDialog({
    kicker: 'The tavern', title: `${recruits} sailors volunteer`,
    body: '<p>They will join for a share of future plunder.</p>',
    actions: [
      { label: 'Welcome them aboard', run: () => { state.player.crew += recruits; addLog(`${recruits} sailors joined the crew.`); showTavern(); } },
      { label: 'Leave them drinking', secondary: true, run: showTavern },
    ],
  });
}

function newsBody(items, emptyMessage = 'There is no fresh news.') {
  return items.length
    ? `<ul class="ship-news">${items.map((item) => {
      if (typeof item === 'string') return `<li>${item}</li>`;
      return `<li><time>${MONTHS[item.month]} ${item.year}</time> — ${item.message}</li>`;
    }).join('')}</ul>`
    : `<p>${emptyMessage}</p>`;
}

function showBartenderNews() {
  const items = state.worldNews.slice(0, 6);
  showDialog({
    kicker: 'The bartender', title: 'News from across the Caribbean',
    body: newsBody(items, 'The bartender has heard nothing of consequence.'),
    actions: [{ label: 'Return to the tavern', run: showTavern }],
  });
}

function showBarmaid() {
  const town = state.towns[state.visit.townIndex];
  const key = String(state.visit.townIndex);
  const isInformant = state.player.barmaidInformants.includes(key);
  if (isInformant) {
    showDialog({
      kicker: `The barmaid · ${town.name}`, title: 'Your informant has been listening',
      body: newsBody(state.worldNews.slice(0, 4), 'Even your informant has heard nothing new.'),
      actions: [{ label: 'Return to the tavern', run: showTavern }],
    });
    return;
  }
  const rapport = state.player.barmaidRapport[key] ?? 0;
  showDialog({
    kicker: `The barmaid · ${town.name}`, title: '“What would you be looking for, Captain?”',
    body: `<p>Buy a drink, or spend the evening earning the trust of someone who hears every conversation in the room.</p><dl><dt>Trust</dt><dd>${rapport}/10</dd></dl>`,
    actions: [
      { label: `Buy a drink${state.player.partyGold ? ' · 1 gold' : ''}`, run: () => spendEveningWithBarmaid(Math.min(1, state.player.partyGold), 0) },
      { label: 'A drink and company · 5 gold', run: () => spendEveningWithBarmaid(5, 1) },
      { label: 'Nothing, thanks', secondary: true, run: showTavern },
    ],
  });
}

function spendEveningWithBarmaid(cost, rapportGain) {
  if (state.player.partyGold < cost) {
    showDialog({ kicker: 'An empty purse', title: 'No drinks on credit', body: '<p>The barmaid points you back toward your ship.</p>', actions: [{ label: 'Return to the tavern', run: showTavern }] });
    return;
  }
  state.player.partyGold -= cost;
  const key = String(state.visit.townIndex);
  const rapport = Math.min(10, (state.player.barmaidRapport[key] ?? 0) + rapportGain);
  state.player.barmaidRapport[key] = rapport;
  let title = 'A useful conversation';
  if (rapport >= 10 && !state.player.barmaidInformants.includes(key)) {
    state.player.barmaidInformants.push(key);
    title = 'A trusted informant';
    addLog(`Won the trust of an informant in ${state.towns[state.visit.townIndex].name}.`);
  }
  showDialog({
    kicker: 'The barmaid', title,
    body: '<p>You share a pleasant conversation while sailors trade rumours around you.</p>',
    actions: [{ label: 'Return to the tavern', run: showTavern }],
  });
}

function showTavernSpecialEncounter(encounter) {
  if (!encounter || encounter.resolved) {
    showTavern();
    return;
  }
  if (encounter.kind === 'traveller') {
    showDialog({
      kicker: 'A far-travelled stranger', title: 'Information has its price',
      body: `<p>The traveller offers reports gathered in distant ports for ${encounter.price} gold pieces.</p>`,
      actions: [
        { label: `Pay ${encounter.price} gold`, run: () => buyTravellerNews(encounter) },
        { label: 'Decline', secondary: true, run: () => declineTavernEncounter(encounter) },
      ],
    });
    return;
  }
  showDialog({
    kicker: 'A map seller', title: 'A scrap of an old treasure map',
    body: `<p>The seller asks ${encounter.price} gold pieces for one fragment. Four pieces reveal the cache.</p>`,
    actions: [
      { label: `Buy it · ${encounter.price} gold`, run: () => buyTreasureMapPiece(encounter) },
      { label: 'Decline', secondary: true, run: () => declineTavernEncounter(encounter) },
    ],
  });
}

function declineTavernEncounter(encounter) {
  encounter.resolved = true;
  showTavern();
}

function buyTravellerNews(encounter) {
  if (state.player.partyGold < encounter.price) {
    showDialog({ kicker: 'The traveller', title: 'Information is not free', body: '<p>Your purse cannot meet the traveller’s price.</p>', actions: [{ label: 'Return to the tavern', run: showTavern }] });
    return;
  }
  state.player.partyGold -= encounter.price;
  encounter.resolved = true;
  addLog(`Bought intelligence in ${state.towns[state.visit.townIndex].name} for ${encounter.price} gold.`);
  const reportedTown = state.towns[encounter.townIndex];
  // ASSUMED: prominent-person quests are not implemented yet, so the paid
  // traveller report exposes useful facts about the same remote town instead.
  showDialog({
    kicker: 'The traveller’s report', title: `Intelligence from ${reportedTown.name}`,
    body: `<dl><dt>Flag</dt><dd>${reportedTown.nation}</dd><dt>Prosperity</dt><dd>${prosperity(reportedTown.growth)}</dd><dt>Garrison</dt><dd>${reportedTown.soldiers}</dd><dt>Forts</dt><dd>${reportedTown.forts}</dd></dl>${newsBody(state.worldNews.slice(0, 3), 'No wider news reached the traveller.')}`,
    actions: [{ label: 'Return to the tavern', run: showTavern }],
  });
}

function buyTreasureMapPiece(encounter) {
  if (state.player.partyGold < encounter.price) {
    showDialog({ kicker: 'The map seller', title: 'No bargain', body: '<p>The seller snatches the parchment back when he sees your purse.</p>', actions: [{ label: 'Return to the tavern', run: showTavern }] });
    return;
  }
  state.player.partyGold -= encounter.price;
  encounter.resolved = true;
  const map = state.treasureMap;
  if (map.clueTownIndex === null) {
    map.clueTownIndex = (state.visit.townIndex + 1 + rng.int(state.towns.length - 1)) % state.towns.length;
  }
  map.pieces = state.difficulty === 0 ? 4 : Math.min(4, map.pieces + 1);
  const clueTown = state.towns[map.clueTownIndex];
  addLog(`Bought treasure-map piece ${map.pieces}/4 near ${clueTown.name}.`);
  showDialog({
    kicker: 'The treasure map', title: map.pieces >= 4 ? 'The route is complete' : `Fragment ${map.pieces} of 4`,
    body: `<p>The markings point toward the countryside somewhere near ${clueTown.name}.</p>`,
    actions: [{ label: 'Return to the tavern', run: showTavern }],
  });
}

function showTreasureMap() {
  const clueTown = state.towns[state.treasureMap.clueTownIndex];
  showDialog({
    kicker: state.treasureMap.pieces >= 4 ? 'Completed treasure map' : 'Partial treasure map', title: `Somewhere near ${clueTown.name}`,
    body: '<p>The original permits a search with even one fragment. Overland searching is not yet simulated, so choose whether to resolve the expedition provisionally now or keep collecting pieces.</p>',
    actions: [
      { label: 'Find the cache · provisional', run: resolveTreasureMap },
      { label: 'Keep the map', secondary: true, run: showTavern },
    ],
  });
}

function resolveTreasureMap() {
  const clueTown = state.towns[state.treasureMap.clueTownIndex];
  const gold = (5 + rng.int(9)) * 1000;
  state.player.partyGold += gold;
  state.treasureMap = { pieces: 0, clueTownIndex: null };
  addLog(`Found a provisional treasure cache near ${clueTown.name}: ${gold} gold.`);
  showDialog({
    kicker: 'Provisional treasure outcome', title: `${gold.toLocaleString()} gold recovered`,
    body: '<p>Your party follows the completed clues, recovers the cache, and returns safely to port.</p>',
    actions: [{ label: 'Return to the tavern', run: showTavern }],
  });
}

function showShipwright() {
  const town = state.towns[state.visit.townIndex];
  if (town.nation === 'Spain' && 25 * state.player.ranks.Spain + scenarios[state.era].merchantThreshold < town.growth) {
    showDialog({ kicker: 'The shipwright', title: '“We do not trade with pirates!”', body: '<p>The shipwright dismisses you and calls for his guards.</p>', actions: [{ label: 'Return to town', run: showTownMenu }] });
    return;
  }
  state.portTrade.shipwrightCash ??= shipwrightCash({
    month: state.calendar.month,
    population: town.population,
    growth: town.growth,
  });
  const damaged = state.player.ships.filter((ship) => ship.damage > 0).length;
  showDialog({
    kicker: `The shipwright · ${town.name}`, title: 'What business brings you to the yard?',
    body: `<dl><dt>Your fleet</dt><dd>${state.player.ships.length} ship${state.player.ships.length === 1 ? '' : 's'}</dd><dt>Damaged</dt><dd>${damaged}</dd><dt>Your gold</dt><dd>${state.player.partyGold}</dd><dt>Shipwright’s cash</dt><dd>${state.portTrade.shipwrightCash}</dd></dl>`,
    actions: [
      { label: 'Repair a ship', run: showRepairShips },
      { label: 'Sell a ship', run: showSellShips },
      { label: 'Sell cannon', run: showSellCannon },
      { label: 'Part company', secondary: true, run: showTownMenu },
    ],
  });
}

function showRepairShips() {
  const damaged = state.player.ships
    .map((ship, index) => ({ ship, index }))
    .filter(({ ship }) => ship.damage > 0);
  if (!damaged.length) {
    showDialog({ kicker: 'The shipwright', title: 'Nothing needs repair', body: '<p>The shipwright finds no damage worth his attention.</p>', actions: [{ label: 'Return to the yard', run: showShipwright }] });
    return;
  }
  showDialog({
    kicker: 'The shipwright', title: 'Choose a ship to repair',
    body: '<p>The quoted price clears all recorded damage from the selected ship.</p>',
    actions: [
      ...damaged.map(({ ship, index }) => {
        const price = shipRepairPrice({ type: statsFor(ship).type, damage: ship.damage });
        return { label: `${ship.type} · ${damageLevel(ship.damage)} · ${price} gold`, run: () => repairShip(index, price) };
      }),
      { label: 'None, thanks', secondary: true, run: showShipwright },
    ],
  });
}

function repairShip(index, price) {
  if (state.player.partyGold <= price) {
    showDialog({ kicker: 'The shipwright', title: 'You cannot afford the work', body: `<p>The repair costs ${price} gold, and the shipwright insists you keep something in your purse.</p>`, actions: [{ label: 'Return to the yard', run: showShipwright }] });
    return;
  }
  const ship = state.player.ships[index];
  state.player.partyGold -= price;
  state.portTrade.shipwrightCash += price;
  state.player.ships[index] = { ...ship, damage: 0 };
  addLog(`Repaired the ${ship.type} at ${state.towns[state.visit.townIndex].name} for ${price} gold.`);
  showShipwright();
}

function showSellShips() {
  if (state.player.ships.length < 2) {
    showDialog({ kicker: 'The shipwright', title: 'Your only ship', body: '<p>The shipwright will not leave you stranded ashore.</p>', actions: [{ label: 'Return to the yard', run: showShipwright }] });
    return;
  }
  showDialog({
    kicker: 'The shipwright', title: 'Choose a ship to sell',
    body: '<p>Crew, cannon, and cargo remain with your fleet. You cannot sell your last ship.</p>',
    actions: [
      ...state.player.ships.map((ship, index) => {
        const price = shipSalePrice({ type: statsFor(ship).type, damage: ship.damage });
        return { label: `${describeShip(ship)} · ${price} gold`, run: () => sellShip(index, price) };
      }),
      { label: 'None, thanks', secondary: true, run: showShipwright },
    ],
  });
}

function sellShip(index, price) {
  if (state.player.ships.length < 2) {
    showShipwright();
    return;
  }
  if (state.portTrade.shipwrightCash < price) {
    showDialog({ kicker: 'The shipwright', title: 'The yard lacks the cash', body: `<p>The shipwright cannot cover the ${price}-gold price.</p>`, actions: [{ label: 'Return to the yard', run: showShipwright }] });
    return;
  }
  const [ship] = state.player.ships.splice(index, 1);
  state.player.partyGold += price;
  state.portTrade.shipwrightCash -= price;
  addLog(`Sold the ${ship.type} at ${state.towns[state.visit.townIndex].name} for ${price} gold.`);
  if (cargoUsed() > cargoCapacity()) showOverfullHold(showShipwright);
  else showShipwright();
}

function showSellCannon() {
  const available = Math.max(0, state.player.cannon - 1);
  const affordable = Math.min(available, Math.floor(state.portTrade.shipwrightCash / 50));
  if (available === 0) {
    showDialog({ kicker: 'The shipwright', title: 'Your only cannon', body: '<p>The shipwright refuses to buy the last gun protecting your fleet.</p>', actions: [{ label: 'Return to the yard', run: showShipwright }] });
    return;
  }
  if (affordable === 0) {
    showDialog({ kicker: 'The shipwright', title: 'The yard lacks the cash', body: '<p>The shipwright cannot afford another cannon.</p>', actions: [{ label: 'Return to the yard', run: showShipwright }] });
    return;
  }
  showDialog({
    kicker: 'The shipwright', title: 'Cannon fetch 50 gold apiece',
    body: `<p>The yard can buy up to ${affordable}. At least one cannon must remain with your fleet.</p>`,
    actions: [
      { label: 'Sell one cannon · 50 gold', run: () => sellCannon(1) },
      ...(affordable > 1 ? [{ label: `Sell ${affordable} cannon · ${affordable * 50} gold`, run: () => sellCannon(affordable) }] : []),
      { label: 'Keep them', secondary: true, run: showShipwright },
    ],
  });
}

function sellCannon(amount) {
  state.player.cannon -= amount;
  state.player.partyGold += amount * 50;
  state.portTrade.shipwrightCash -= amount * 50;
  addLog(`Sold ${amount} cannon for ${amount * 50} gold.`);
  showShipwright();
}

function openMerchant() {
  state.visit.merchant = null;
  showMerchant();
}

function finishMerchantVisit() {
  const town = state.towns[state.visit.townIndex];
  const market = state.visit.merchant;
  if (market && Math.abs(state.player.partyGold - market.startingGold) > 20) {
    town.growth = Math.min(255, Math.floor((town.growth * 19) / 20) + 12);
  }
  state.visit.merchant = null;
  showTownMenu();
}

function showMerchant() {
  const town = state.towns[state.visit.townIndex];
  if (town.nation === 'Spain' && 25 * state.player.ranks.Spain + scenarios[state.era].merchantThreshold < town.growth) {
    showDialog({ kicker: 'The merchant', title: '“We do not trade with pirates!”', body: '<p>The merchant dismisses you and calls for his guards.</p>', actions: [{ label: 'Return to town', run: showTownMenu }] });
    return;
  }
  if (!state.visit.merchant?.prices) {
    const common = { growth: town.growth, month: state.calendar.month };
    state.visit.merchant = {
      prices: {
        food: merchantFoodPrice({ ...common, producesFood: Boolean(town.flags & 0x08) }),
        goods: merchantCommodityPrice({ ...common, kind: 'goods', produces: Boolean(town.flags & 0x04) }),
        specialGoods: merchantCommodityPrice({ ...common, kind: 'special', produces: Boolean(town.flags & 0x02), demand: Boolean(town.flags & 0x10) }),
      },
      stocks: {
        food: merchantStock({ ...common, population: town.population, rng }),
        goods: merchantStock({ ...common, population: town.population, rng }),
        specialGoods: merchantStock({ ...common, population: town.population, rng }),
      },
      cash: state.portTrade.merchantCash ?? merchantCash({ ...common, population: town.population }),
      startingGold: state.player.partyGold,
    };
    state.portTrade.merchantCash = state.visit.merchant.cash;
  }
  const market = state.visit.merchant;
  const food = Math.floor(state.player.foodFixed / 256);
  const room = cargoRoom();
  const amounts = { food, goods: state.player.goods, specialGoods: state.player.specialGoods };
  const labels = { food: 'food', goods: 'goods', specialGoods: specialGoodsName().toLowerCase() };
  const actions = [];
  for (const kind of ['food', 'goods', 'specialGoods']) {
    const price = market.prices[kind];
    const buyMaximum = Math.min(market.stocks[kind], room, Math.floor(state.player.partyGold / price));
    const sellMaximum = Math.min(amounts[kind], Math.floor(market.cash / price));
    if (buyMaximum > 0) {
      actions.push({ label: `Buy 1 ton of ${labels[kind]} · ${price}`, run: () => tradeWithMerchant(kind, 1, 1) });
      if (buyMaximum > 1) actions.push({ label: `Buy max ${labels[kind]} (${buyMaximum})`, run: () => tradeWithMerchant(kind, 1, buyMaximum) });
    }
    if (sellMaximum > 0) {
      actions.push({ label: `Sell 1 ton of ${labels[kind]} · ${price}`, run: () => tradeWithMerchant(kind, -1, 1) });
      if (sellMaximum > 1) actions.push({ label: `Sell max ${labels[kind]} (${sellMaximum})`, run: () => tradeWithMerchant(kind, -1, sellMaximum) });
    }
  }
  actions.push({ label: 'Return to town', secondary: true, run: finishMerchantVisit });
  showDialog({
    kicker: `The merchant · ${town.name}`, title: 'Buy or sell by the ton',
    body: `<p>Use one-ton trades for an exact manifest, or the maximum shortcuts for speed.</p><dl><dt>Food: aboard / stock / price</dt><dd>${food} / ${market.stocks.food} / ${market.prices.food}</dd><dt>Goods: aboard / stock / price</dt><dd>${state.player.goods} / ${market.stocks.goods} / ${market.prices.goods}</dd><dt>${specialGoodsName()}: aboard / stock / price</dt><dd>${state.player.specialGoods} / ${market.stocks.specialGoods} / ${market.prices.specialGoods}</dd><dt>Free hold</dt><dd>${room} tons</dd><dt>Your gold</dt><dd>${state.player.partyGold}</dd><dt>Merchant cash</dt><dd>${market.cash}</dd></dl>`,
    actions,
  });
}

function tradeWithMerchant(kind, direction, requested) {
  const market = state.visit.merchant;
  const price = market.prices[kind];
  const aboard = kind === 'food' ? Math.floor(state.player.foodFixed / 256) : state.player[kind];
  const amount = direction > 0
    ? Math.min(requested, market.stocks[kind], cargoRoom(), Math.floor(state.player.partyGold / price))
    : Math.min(requested, aboard, Math.floor(market.cash / price));
  if (amount <= 0) {
    showMerchant();
    return;
  }
  const delta = direction * amount;
  if (kind === 'food') state.player.foodFixed += delta * 256;
  else state.player[kind] += delta;
  market.stocks[kind] -= delta;
  state.player.partyGold -= delta * price;
  market.cash += delta * price;
  state.portTrade.merchantCash = market.cash;
  const label = kind === 'specialGoods' ? specialGoodsName().toLowerCase() : kind;
  addLog(`${direction > 0 ? 'Bought' : 'Sold'} ${amount} ton${amount === 1 ? '' : 's'} of ${label}.`);
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
  state.player.arrivalGuard = true;
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

// Every return to the sailing map starts a new voyage, and each voyage begins
// with the fleet check (porting_guide.md §4).
function resumeSailing() {
  runFleetCheck({ done: startVoyage });
}

function startVoyage() {
  state.paused = false;
  state.approach = null;
  state.mode = 'sailing';
  state.battle = null;
  resetSailingInterpolation();
  canvas.setAttribute('aria-label', 'Caribbean sailing map');
  updateInterface();
}

function togglePause() {
  if (!state || !['sailing', 'battle'].includes(state.mode) || dialog.open) return;
  state.paused = !state.paused;
  if (state.paused) {
    input.firePressed = false;
    input.raiseSailsPressed = false;
    input.lowerSailsPressed = false;
  }
  if (!state.paused && state.mode === 'sailing') resetSailingInterpolation();
  pauseButton.firstChild.textContent = state.paused ? '▶ ' : 'Ⅱ ';
  addLog(state.paused ? `${state.mode === 'battle' ? 'Battle' : 'Voyage'} paused.` : `${state.mode === 'battle' ? 'Battle' : 'Voyage'} resumed.`);
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
  const inBattle = state.mode === 'battle' && state.battle;
  dockButton.querySelector('span').textContent = inBattle ? 'Fire' : 'Land';
  dockButton.setAttribute('aria-label', inBattle ? 'Fire loaded broadside' : 'Land a party to march inland');
  dockButton.firstChild.textContent = inBattle ? '● ' : '⚓ ';
  zoomOutButton.disabled = Boolean(inBattle);
  zoomInButton.disabled = Boolean(inBattle);
  if (inBattle) {
    const battle = state.battle;
    labels.captain.textContent = `Captain ${state.captain} · Battle`;
    labels.date.textContent = `Engaging ${battle.encounter.flag} ${battle.enemy.name}`;
    labels.speed.textContent = `${Math.abs(battle.player.speed ?? 0)} battle speed`;
    labels.wind.textContent = `${WIND_NAMES[(battle.wind.direction >> 4) & 15]} · ${['light', 'medium', 'strong'][battle.wind.strength]}`;
    labels.sails.textContent = battle.player.sailTransition
      ? `${battle.player.targetSails === 'full' ? 'Raising' : 'Lowering'} · ${Math.round((1 - battle.player.sailTransition / BATTLE_SAIL_TRANSITION_FRAMES) * 100)}%`
      : battle.player.sails === 'full' ? 'Full' : 'Battle';
    labels.food.textContent = 'Clock stopped';
    labels.crew.textContent = `${battle.player.men} aboard`;
    labels.gold.textContent = battle.player.reload > 0 ? `Reload ${battle.player.reload}` : 'Loaded';
    labels.nearest.textContent = `${battle.enemy.men} crew · ${battle.enemy.guns} guns`;
    dockButton.disabled = state.paused || battle.player.reload > 0 || battle.player.guns <= 0;
    return;
  }
  const town = nearestTown();
  const distance = nearestTownDistance();
  labels.captain.textContent = `Captain ${state.captain} · ${state.nationality}`;
  labels.date.textContent = `${state.calendar.day + 1} ${MONTHS[state.calendar.month]} ${state.calendar.year}`;
  labels.speed.textContent = `${player.speed.toFixed(1)} cells/day`;
  labels.wind.textContent = WIND_NAMES[(player.wind >> 4) & 15];
  labels.sails.textContent = { furled: 'Closed', battle: 'Low', full: 'High' }[player.sails];
  labels.food.textContent = `${foodDays(player.foodFixed, player.crew)} days`;
  labels.crew.textContent = player.crew.toLocaleString();
  labels.gold.textContent = player.partyGold.toLocaleString();
  labels.nearest.textContent = `${town.name} · ${distance}`;
  dockButton.disabled = state.paused || overlandMarchTargets().length === 0;
  zoomOutButton.disabled = false;
  zoomInButton.disabled = false;
}

function render() {
  const width = viewWidth;
  const height = viewHeight;
  ctx.clearRect(0, 0, width, height);
  const sea = ctx.createLinearGradient(0, 0, 0, height);
  sea.addColorStop(0, '#1a5969'); sea.addColorStop(1, '#0d3c4b');
  ctx.fillStyle = sea; ctx.fillRect(0, 0, width, height);
  if (!state) return;
  if (state.mode === 'battle' && state.battle) {
    renderBattle(ctx, state.battle, width, height);
    if (state.paused && !dialog.open) drawPaused(width, height, 'Battle paused');
    return;
  }

  const playerPose = interpolatedSailingPose();
  const clouds = interpolatedSailingClouds();
  const zoom = cameraZoom;
  const visibleWidth = width / zoom;
  const visibleHeight = height / zoom;
  const camera = {
    x: visibleWidth >= WORLD.width ? WORLD.width / 2 : clamp(playerPose.x, visibleWidth / 2, WORLD.width - visibleWidth / 2),
    y: visibleHeight >= WORLD.height ? WORLD.height / 2 : clamp(playerPose.y, visibleHeight / 2, WORLD.height - visibleHeight / 2),
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
  drawClouds(zoom, playerPose, clouds);
  drawTowns(zoom);
  drawShip(zoom, playerPose);
  ctx.restore();
  drawMinimap(width, height, camera, zoom, playerPose);
  if (state.paused && state.mode === 'sailing' && !dialog.open) drawPaused(width, height, 'Voyage paused');
}

function drawClouds(zoom, playerPose, clouds) {
  for (const cloud of clouds) {
    const opacity = cloudWrapOpacity(cloud, playerPose.x, playerPose.y);
    if (opacity <= 0) continue;
    ctx.save();
    ctx.globalAlpha = opacity;
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

function drawShip(zoom, player) {
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

function drawMinimap(width, height, camera, zoom, playerPose) {
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
  ctx.fillStyle = '#f3e5c5'; ctx.beginPath(); ctx.arc(playerPose.x, playerPose.y, 5, 0, Math.PI * 2); ctx.fill();
  const visibleWidth = width / zoom, visibleHeight = height / zoom;
  ctx.strokeStyle = '#d6a447'; ctx.lineWidth = 2.5; ctx.strokeRect(camera.x - visibleWidth / 2, camera.y - visibleHeight / 2, visibleWidth, visibleHeight);
  ctx.restore();
}

function drawPaused(width, height, message) {
  ctx.fillStyle = 'rgba(4,18,23,.45)'; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#f3e5c5'; ctx.textAlign = 'center'; ctx.font = '32px "IM Fell English", Georgia, serif'; ctx.fillText(message, width / 2, height / 2);
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
dockButton.addEventListener('click', () => {
  if (state?.mode === 'battle') input.firePressed = true;
  else showOverlandMarch();
});
zoomOutButton.addEventListener('click', () => changeZoom(-ZOOM_STEP));
zoomInButton.addEventListener('click', () => changeZoom(ZOOM_STEP));
lowerSailsButton.addEventListener('click', () => changeSails(-1));
raiseSailsButton.addEventListener('click', () => changeSails(1));
dialog.addEventListener('cancel', (event) => event.preventDefault());

function changeZoom(delta) {
  if (state?.mode === 'battle') return;
  cameraZoom = clamp(cameraZoom + delta, MIN_ZOOM, MAX_ZOOM);
}

function changeSails(delta) {
  if (!state || state.paused) return;
  if (state.mode === 'battle') {
    if (delta > 0) input.raiseSailsPressed = true;
    if (delta < 0) input.lowerSailsPressed = true;
    return;
  }
  if (state.mode !== 'sailing') return;
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
  if (event.key === ' ' && !event.repeat) {
    if (state?.mode === 'battle' && !state.paused) input.firePressed = true;
    else togglePause();
  }
  if ((event.key === 'Escape' || event.key.toLowerCase() === 'p') && !event.repeat) togglePause();
  if (event.key.toLowerCase() === 'e' && !dockButton.disabled && state?.mode === 'sailing') showOverlandMarch();
  if (event.key === '+' || event.key === '=') changeZoom(ZOOM_STEP);
  if (event.key === '-' || event.key === '_') changeZoom(-ZOOM_STEP);
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Escape'].includes(event.key)) event.preventDefault();
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

function stepBattleSimulation() {
  if (!state?.battle || state.paused || state.mode !== 'battle') return;
  state.battle = stepBattle(state.battle, {
    turn: Number(input.right) - Number(input.left),
    firePressed: input.firePressed,
    raiseSailsPressed: input.raiseSailsPressed,
    lowerSailsPressed: input.lowerSailsPressed,
  }, rng);
  input.firePressed = false;
  input.raiseSailsPressed = false;
  input.lowerSailsPressed = false;
  if (state.battle.event) finishTacticalBattle();
}

function frame(now) {
  const elapsed = Math.min(.25, (now - lastFrame) / 1000);
  lastFrame = now;
  if (state?.mode === 'battle') {
    battleAccumulator += elapsed;
    let catchup = 0;
    while (battleAccumulator >= BATTLE_FRAME_SECONDS && catchup < 8) {
      stepBattleSimulation();
      battleAccumulator -= BATTLE_FRAME_SECONDS;
      catchup += 1;
    }
    if (catchup === 8) battleAccumulator = 0;
  } else {
    accumulator += elapsed;
    while (accumulator >= TICK_SECONDS) { stepSimulation(); accumulator -= TICK_SECONDS; }
  }
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
  const preview = new URLSearchParams(location.search).get('preview');
  if (preview === 'plunder' && ['localhost', '127.0.0.1'].includes(location.hostname)) {
    const previewState = newState({ era: '1680', captain: 'Preview', nationality: 'France', difficulty: 1, ability: 'navigation' });
    startGame(previewState).then(() => {
      state.paused = true;
      beginPlunderTransfer('Spoils from the Cargo fluyt', {
        gold: 70, food: 4, goods: 11, specialGoods: 6, cannon: 4,
      }, () => {});
    });
    return;
  }
  if (preview === 'governor-promotion' && ['localhost', '127.0.0.1'].includes(location.hostname)) {
    const previewState = newState({ era: '1680', captain: 'Preview', nationality: 'France', difficulty: 1, ability: 'navigation' });
    startGame(previewState).then(() => {
      state.nearestTownIndex = state.towns.findIndex(({ nation }) => nation === 'France');
      state.player.favour.France = 6;
      state.mode = 'town';
      state.paused = true;
      state.visit = { townIndex: state.nearestTownIndex, sneaking: false, recruited: false, merchant: null };
      showGovernor();
    });
    return;
  }
  if (preview === 'news' && ['localhost', '127.0.0.1'].includes(location.hostname)) {
    const previewState = newState({ era: '1680', captain: 'Preview', nationality: 'France', difficulty: 1, ability: 'navigation' });
    startGame(previewState).then(() => {
      state.calendar = { day: 12, month: 9, year: 1680 };
      addWorldNews('A new gold mine has opened at Havana.');
      showDialog({
        kicker: 'The bartender', title: 'News from across the Caribbean',
        body: newsBody(state.worldNews.slice(0, 6)),
        actions: [{ label: 'Return to the tavern', run: () => {} }],
      });
    });
    return;
  }
  if (preview === 'arrival' && ['localhost', '127.0.0.1'].includes(location.hostname)) {
    // Havana 1560: the coast cell (244, 178) south of the ship is a trigger cell.
    const previewState = newState({ era: '1560', captain: 'Preview', nationality: 'France', difficulty: 1, ability: 'navigation' });
    Object.assign(previewState.player, { x: 244.5, y: 176.5, heading: 128, speed: 12 });
    startGame(previewState);
    return;
  }
  if (preview === 'landing' && ['localhost', '127.0.0.1'].includes(location.hostname)) {
    // Panama 1560 is inland; the fleet lies at anchor four cells away.
    const previewState = newState({ era: '1560', captain: 'Preview', nationality: 'France', difficulty: 1, ability: 'navigation' });
    Object.assign(previewState.player, { x: 318.5, y: 443.5, speed: 0, sails: 'furled' });
    startGame(previewState);
    return;
  }
  continueButton.classList.toggle('hidden', !loadGame());
}).catch((error) => {
  console.error('Scenario data unavailable:', error);
  beginButton.textContent = 'Scenario data failed to load';
});
requestAnimationFrame(frame);
