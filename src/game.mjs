import {
  WORLD, NATIONS, SHIPS, LAND_SHAPES, MONTHS,
} from './data.mjs';
import {
  TICKS_PER_DAY, TICKS_PER_WIND_SHIFT, VOYAGE_START_TICK, isHalfDayTick, isDailyTick, voyageDays,
  clamp, createRng, startFromRecord, targetSailingSpeed, stepSailingSpeed,
  shiftWind, cloudCountForMonth, navigationSkill, turnHeadingDownwind,
  createVoyageClouds, driftClouds, nearestCloudDistancePixels, cloudWrapOpacity,
  applyProvisionalBoardingOutcome,
  capturedShipPlunder, capturedTownPlunder, applyTownCapture, capturedShipRecruits,
  acceptsRudderInput,
  consumeDailyFood, foodDays, starvationDesertion, encounterRoll, chooseEncounterTier,
  triggerTownAt, nearestTriggerTown, departurePose, townDistanceCells, alertAfterNearestTownCheck,
  isEncounterHunter, hunterOvertakes, drawHunterCaptain, captainName, captainRenown,
  MISSION, rollGovernorMission, missionPirateId, isMissionPirateId,
  harborAttempt, sneakAttempt, tavernRecruits, morale, prizeMoraleBonus, dividePlunder, beginDivisionRefit, freshFleet,
  captiveWord, governorPirateHandover, prisonerEscape, portDesertion, governorPromotion, nationalStanding, governorAmnestyTerms,
  captainRansomOffers, monthlyLandIncome,
  convoyRouteIndices, initialConvoys, monthlyConvoyStep, convoysInTown, meetsTreasureFleet, convoyGarrison,
  captureConvoys, convoyReport,
  diplomaticBriefing, tavernSpecialEncounters,
  merchantCash, shipRepairPrice, shipSalePrice, shipwrightCash,
  merchantCommodityPrice, merchantFoodPrice, merchantStock, advanceDate,
  NATION_ORDER, monthlyWorldUpdate, initialWorldNews, randomTownRange, worldNewsMessage, newGameTowns,
  townInfoStatus, learnTownInfo, TOWN_INFO_CURRENT,
  fleetIsUndermanned, abandonShip, keepPrize, removeShipWithCargo, restartAfterLastShip, findShore, INLAND_RELEASE_OFFSETS,
  escapeCostsShip,
  monthEndCrewEvent, mutinyOutcome,
  CAPTIVITY_STEP_DAYS, captivityContinues, healthLevel, releaseFromCaptivity,
} from './mechanics.mjs';
import {
  BATTLE_FRAME_SECONDS, BATTLE_SAIL_TRANSITION_FRAMES,
  broadsideState, createBattle, damageLevel, shipName, shipRecord, stepBattle,
} from './battle-mechanics.mjs';
import { renderBattle } from './battle-renderer.mjs';
import { CELL, PIXEL, decodeNavigationMap, gunzip, isNavigableAt, pixelClassAt } from './world-map.mjs';
import { TERRAIN_CHUNK_CELLS, TERRAIN_PIXELS_PER_CELL } from './terrain.mjs';
import {
  MAP_KIND, COMPLETE_MAP, RELATIVE_NAMES, LOST_CITY_NAMES, REEF_COOLDOWN_TICKS, REBOARD_REACH_CELLS,
  walkVectorForHeading, walkVectorForDirections, roundUpToHalfDay, stepOnFoot,
  reefVictim, crewAfterReef, emptyMapRecords, mapPieceCount, giveMapPiece, digForTreasure,
} from './overland.mjs';
import { TREASURE_SITES } from './treasure-sites.mjs';
import { TOWN_SPRITE_ANCHOR, TOWN_SPRITE_HEIGHT, TOWN_SPRITE_WIDTH, paintTownSprite, prosperityLevel } from './town-sprites.mjs';
import { headingSector, paintShipSprite } from './ship-sprites.mjs';
import { CLOUD_ART_PIXEL, paintCloudSprite } from './cloud-sprites.mjs';
import { cachedSprite, devicePixelScale, drawPixelSprite } from './sprite-canvas.mjs';

const SAVE_KEY = 'fortune-and-freedom-save-v5';
const LEGACY_SAVE_KEY = 'fortune-and-freedom-save-v1';
const PREVIOUS_SAVE_KEY = 'fortune-and-freedom-save-v4';
const SAVE_VERSION = 9;
const TICK_SECONDS = 0.125;
const ZOOM_STEP = 4;
const MIN_ZOOM = 16;
const MAX_ZOOM = 64;
const RANK_NAMES = ['Mr.', 'Ensign', 'Captain', 'Major', 'Colonel', 'Admiral', 'Baron', 'Count', 'Marquis', 'Duke'];
const DIFFICULTY_NAMES = ['Apprentice', 'Journeyman', 'Adventurer', 'Swashbuckler'];
// 0x184F8: the refit after a division runs the calendar four times, 26 days each.
const DIVISION_REFIT_STEPS = 4;
const DIVISION_REFIT_STEP_DAYS = 26;
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
const logbookButton = document.querySelector('#logbook-button');
const zoomOutButton = document.querySelector('#zoom-out-button');
const zoomInButton = document.querySelector('#zoom-in-button');
const lowerSailsButton = document.querySelector('#lower-sails-button');
const raiseSailsButton = document.querySelector('#raise-sails-button');
const turnLeftButton = document.querySelector('[data-hold="left"]');
const turnRightButton = document.querySelector('[data-hold="right"]');

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
let autosaveDue = false;
let battleAccumulator = 0;
let previousSailingPose = null;
let previousSailingClouds = null;
let lastFrame = performance.now();
// T toggles fast mode (0x33FCC): a tick waits 1 timer unit instead of 5.
// Any voyage event clears it (0x284B6). Real-time pacing only.
let fastTravel = false;
const tickSeconds = () => (fastTravel ? TICK_SECONDS / 5 : TICK_SECONDS);
let viewWidth = innerWidth;
let viewHeight = innerHeight;
let worldMap = null;
let worldMapLayer = null;
let terrain = null;
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
    : clamp(accumulator / tickSeconds(), 0, 1);
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
  const seed = (Date.now() ^ Math.floor(performance.now() * 1000)) >>> 0;
  const startRng = createRng(seed);
  const { point: [startX, startY], favour: startFavour } = startFromRecord(start, startRng);
  const favour = Object.fromEntries([...NATION_ORDER, 'pirate'].map((nation, index) => [nation, startFavour[index]]));
  const ranks = Object.fromEntries(NATION_ORDER.map((nation, index) => [nation, start.ranks[index]]));
  const diplomacy = Object.fromEntries(NATION_ORDER.map((nation, row) => [
    nation, Object.fromEntries(NATION_ORDER.map((other, column) => [other, start.diplomacy[row][column]])),
  ]));
  // The original's new game (0x133B9) seeds the opening news (0x13679), then
  // sets up the towns (0x1451E), then copies the start record. ASSUMED: the
  // port draws the news and town rolls from the start stream in that order
  // after the start point, and dates the news at the start (the original
  // spreads the entries over the preceding months).
  const scenarioTowns = scenario.towns;
  const calendar = { day: 0, month: 0, year: Number(era) };
  const worldNews = initialWorldNews({ diplomacy, townRange: randomTownRange(scenarioTowns), rng: startRng })
    .map((entry) => ({ message: worldNewsMessage(entry, scenarioTowns), month: calendar.month, year: calendar.year }));
  const towns = newGameTowns(scenarioTowns, difficulty, startRng);
  const logs = ['A westward trade wind fills the sails.', `The ${start.name} expedition begins.`];
  if (favour[nationality] >= 2) logs.push(`Your ${nationality} letter of marque is in good standing.`);
  return {
    version: SAVE_VERSION,
    era,
    captain: options.captain || 'Anonymous',
    nationality,
    difficulty,
    ability: options.ability,
    seed,
    rngState: startRng.state,
    mode: 'sailing', paused: false, tick: 0,
    calendar,
    player: {
      x: startX, y: startY, heading: 128, speed: 4, wind: 192, sails: 'full',
      ships: start.ships.map(shipRecord), crew: start.crew, cannon: start.cannon,
      foodFixed: start.food * 256, goods: start.goods, specialGoods: 0, partyGold: start.gold,
      personalWealth: 0, land: 0, reputation: 0, monthsAtSea: -16,
      // On foot (0x4D28A), the ship waits at `ship` and the party re-boards
      // only at `landing`; both are null afloat. `walk` is the persistent
      // walk vector (0x454A8/AA). The reef cooldown counts ticks (0x367FA).
      onFoot: false, ship: null, landing: null, walk: null, reefCooldown: 0,
      capturedCaptains: [],
      barmaidRapport: {}, barmaidInformants: [],
      favour, ranks,
    },
    towns,
    nearestTownIndex: 0,
    // One alert counter belongs to whichever town is nearest; it resets when
    // the nearest town changes (town_attack_and_plunder.md §1).
    alert: 0,
    diplomacy,
    worldNews,
    // 0x13679 places the treasure fleet and silver train before the news.
    convoys: initialConvoys({ routes: convoyRoutesFor(era, towns), dayOfYear: dayOfYear(calendar), eraIndex: eraIndexOf(era) }),
    // Buried treasure, lost relative and lost city (0x47186).
    treasureMaps: emptyMapRecords(),
    relativesRescued: 0,
    portTrade: { townIndex: null, merchantCash: null, shipwrightCash: null },
    logs,
    visit: null,
  };
}

const eraIndexOf = (era) => Object.keys(scenarios).indexOf(era);
const dayOfYear = (calendar) => calendar.month * 30 + calendar.day;

// The era header's convoy stops as indices into the voyage's towns.
function convoyRoutesFor(era, towns) {
  const routes = scenarios[era].convoyRoutes;
  return {
    treasureFleet: convoyRouteIndices(routes.treasureFleet, towns),
    silverTrain: convoyRouteIndices(routes.silverTrain, towns),
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
  // Version 9 adds the landing party and the three treasure-map records.
  state.treasureMaps ??= migrateTreasureMap(state.treasureMap);
  delete state.treasureMap;
  state.relativesRescued ??= 0;
  state.player.onFoot ??= false;
  state.player.reefCooldown ??= 0;
  // Version 8 adds the treasure fleet and silver train. An older voyage
  // places them as a new game would on the current day of the year.
  state.convoys ??= initialConvoys({ routes: convoyRoutesFor(state.era, state.towns), dayOfYear: dayOfYear(state.calendar), eraIndex: eraIndexOf(state.era) });
  state.hunterNameRows ??= 0;
  state.mission ??= null;
  state.player.barmaidRapport ??= {};
  state.player.barmaidInformants ??= [];
  state.player.capturedCaptains ??= [];
  state.player.land ??= 0;
  state.player.specialGoods ??= 0;
  state.portTrade ??= { townIndex: null, merchantCash: null, shipwrightCash: null };
  await loadWorldMap(state.era);
  // Loading recomputes morale (0x1D9A2). ASSUMED: a new game does the same;
  // the new-game routine does not set 0x45FAA.
  refreshCrewMorale();
  // A game saved in port resumes at sea as if leaving the town (0x19B9E).
  if (state.visit) placeForDeparture(state.visit.townIndex, state.visit.overland);
  state.visit = null;
  // ASSUMED: a party saved ashore stays ashore with its ship waiting
  // (landing_and_overland.md §4), although the voyage reset after loading
  // (porting_guide.md §5 step 3) would clear the on-foot flag.
  if (!state.player.onFoot) movePlayerToNavigableCell();
  // Overland and older saves may still lie beside the town's trigger cells.
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
    if (![1, 2, 3, 4, 5, 6, 7, 8, SAVE_VERSION].includes(saved?.version) || !saved.player || !saved.towns) return null;
    // Version 7 adds the town-information bits (0x80 current, 0x20
    // obsolete) to each town's flags. Earlier versions showed every town's
    // figures, so an older voyage keeps current information on every town.
    if (saved.version < 7) for (const town of saved.towns) town.flags = (town.flags ?? 0) | TOWN_INFO_CURRENT;
    // Before version 7 any beaten pirate captain could be held "for delivery",
    // with the ship kind as his value when he had no captain id. The original
    // takes only captains with an id (0xDE33), so those unnamed pirates are
    // released; named ones keep their id and stay ransomable like any prisoner.
    if (saved.version < 7 && saved.player.capturedCaptains) {
      saved.player.capturedCaptains = saved.player.capturedCaptains.filter(({ pirate, name }) => !pirate || name);
    }
    // Version 6 replaces per-town alert with the original's single counter,
    // keeping the value of the town that was nearest when the game was saved.
    if (saved.alert === undefined) saved.alert = saved.towns[saved.nearestTownIndex ?? 0]?.alert ?? 0;
    for (const town of saved.towns) delete town.alert;
    // Version 7 adds the landing party and the three treasure-map records;
    // startGame fills them in and converts the old single map.
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
  if (payload.version !== 6) throw new Error('unsupported scenario data version');
  scenarios = payload.eras;
}

async function loadWorldMap(era) {
  if (mapCache.has(era)) {
    retireTerrain();
    ({ map: worldMap, layer: worldMapLayer, terrain } = mapCache.get(era));
    return;
  }
  const response = await fetch(new URL(`../assets/world-${era}.bin`, import.meta.url));
  if (!response.ok) throw new Error(`map request failed: ${response.status}`);
  worldMap = decodeNavigationMap(await gunzip(await response.arrayBuffer()), WORLD.width, WORLD.height);
  worldMapLayer = buildWorldMapLayer(worldMap);
  retireTerrain();
  terrain = createTerrain(worldMap);
  mapCache.set(era, { map: worldMap, layer: worldMapLayer, terrain });
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

// Detailed terrain is painted lazily in chunks by a worker, with the coarse
// layer showing until a chunk arrives. Visible chunks are requested first,
// then a one-chunk ring around them. Least recently drawn chunks are dropped
// past the cache limit (each chunk is 1 MB of canvas).
const TERRAIN_CHUNKS_IN_FLIGHT = 2;
const TERRAIN_CHUNK_CACHE = 64;
const TERRAIN_CHUNK_PIXELS = TERRAIN_CHUNK_CELLS * TERRAIN_PIXELS_PER_CELL;

function createTerrain(map) {
  const entry = { chunks: new Map(), pending: new Set(), worker: null };
  if (typeof Worker !== 'function') return entry;
  entry.worker = new Worker(new URL('./terrain-worker.mjs', import.meta.url), { type: 'module' });
  entry.worker.onmessage = ({ data }) => {
    entry.pending.delete(data.key);
    // Chunks for an era no longer shown are dropped rather than cached.
    if (terrain !== entry) return;
    const chunk = document.createElement('canvas');
    chunk.width = TERRAIN_CHUNK_PIXELS; chunk.height = TERRAIN_CHUNK_PIXELS;
    chunk.getContext('2d').putImageData(new ImageData(data.pixels, TERRAIN_CHUNK_PIXELS, TERRAIN_CHUNK_PIXELS), 0, 0);
    entry.chunks.set(data.key, chunk);
    if (entry.chunks.size > TERRAIN_CHUNK_CACHE) entry.chunks.delete(entry.chunks.keys().next().value);
  };
  // Without the worker the coarse layer stays: terrain is presentation only.
  entry.worker.onerror = () => { entry.worker.terminate(); entry.worker = null; };
  entry.worker.postMessage({ type: 'map', map });
  return entry;
}

// Only the shown era keeps painted chunks; the others repaint on return.
function retireTerrain() {
  if (!terrain) return;
  terrain.chunks.clear();
  terrain.pending.clear();
}

function requestTerrainChunk(chunkX, chunkY) {
  const key = `${chunkX},${chunkY}`;
  if (!terrain.worker || terrain.chunks.has(key) || terrain.pending.has(key)) return;
  if (terrain.pending.size >= TERRAIN_CHUNKS_IN_FLIGHT) return;
  terrain.pending.add(key);
  terrain.worker.postMessage({ type: 'paint', key, chunkX, chunkY });
}

function drawTerrainChunks(camera, visibleWidth, visibleHeight) {
  if (!terrain) return;
  const maxX = Math.ceil(WORLD.width / TERRAIN_CHUNK_CELLS) - 1;
  const maxY = Math.ceil(WORLD.height / TERRAIN_CHUNK_CELLS) - 1;
  const left = Math.floor((camera.x - visibleWidth / 2) / TERRAIN_CHUNK_CELLS);
  const right = Math.floor((camera.x + visibleWidth / 2) / TERRAIN_CHUNK_CELLS);
  const top = Math.floor((camera.y - visibleHeight / 2) / TERRAIN_CHUNK_CELLS);
  const bottom = Math.floor((camera.y + visibleHeight / 2) / TERRAIN_CHUNK_CELLS);
  ctx.imageSmoothingEnabled = false;
  for (let chunkY = Math.max(top, 0); chunkY <= Math.min(bottom, maxY); chunkY += 1) {
    for (let chunkX = Math.max(left, 0); chunkX <= Math.min(right, maxX); chunkX += 1) {
      const key = `${chunkX},${chunkY}`;
      const chunk = terrain.chunks.get(key);
      if (!chunk) { requestTerrainChunk(chunkX, chunkY); continue; }
      terrain.chunks.delete(key);
      terrain.chunks.set(key, chunk);
      ctx.drawImage(chunk, chunkX * TERRAIN_CHUNK_CELLS, chunkY * TERRAIN_CHUNK_CELLS, TERRAIN_CHUNK_CELLS, TERRAIN_CHUNK_CELLS);
    }
  }
  // Prefetch only while the ring fits the cache, or it would evict itself.
  if ((right - left + 3) * (bottom - top + 3) > TERRAIN_CHUNK_CACHE) return;
  for (let chunkY = Math.max(top - 1, 0); chunkY <= Math.min(bottom + 1, maxY); chunkY += 1) {
    for (let chunkX = Math.max(left - 1, 0); chunkX <= Math.min(right + 1, maxX); chunkX += 1) {
      requestTerrainChunk(chunkX, chunkY);
    }
  }
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

function townDeparture(index) {
  return scenarios[state.era].towns[index].departure;
}

// 0x19B9E: leaving by sea puts the ship on the town's departure cell with the
// town's departure heading. A party that came on foot leaves on the town's
// own cell, "just outside the city gates", and its ship stays where it
// landed; the arrival guard keeps it from re-entering at once. If the party
// lost its ship meanwhile (0x33A50), it leaves by sea like everyone else.
function placeForDeparture(townIndex, overland) {
  if (overland && state.player.onFoot) {
    const town = state.towns[townIndex];
    state.player.x = town.x + .5;
    state.player.y = town.y + .5;
    return;
  }
  const pose = departurePose(townDeparture(townIndex));
  if (pose) Object.assign(state.player, pose);
}

function departFromApproach() {
  placeForDeparture(state.nearestTownIndex, state.approach?.overland);
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

// Last-ship path of remove_ship (0x1F2A1): prison in a town (0x1C056) or the
// uncharted island at sea (0x1BE71). Both then run 0x1F803: months pass,
// the fresh fleet 0x1EF87(0) is fitted out, held pirates go free and the
// difficulty drops a level.
function loseLastShip({ inTown, done, cause = '' }) {
  const town = state.visit ? state.towns[state.visit.townIndex] : nearestTown();
  const lost = state.player.ships[0];
  const release = inTown ? releaseFromTown(town) : shoreNear(state.player.x, state.player.y);
  if (release) {
    state.player.x = release.x + .5;
    state.player.y = release.y + .5;
    if (release.heading !== undefined) state.player.heading = release.heading;
  }
  state.player.speed = 0;
  // 0x33A50: any landing party is gone with its ship; the new voyage starts
  // aboard at the release point.
  clearLandingParty();
  showDialog({
    kicker: inTown ? 'Imprisoned' : 'Shipwrecked', title: inTown ? `Imprisoned in ${town.name}` : 'Washed ashore',
    body: inTown
      ? `${cause}<p>Your men flee in panic as the tide of battle turns against them. You fight on, are wounded, and are imprisoned in ${town.name}.</p>`
      : `${cause}<p>With your last ship gone, you are washed ashore on an uncharted island. The local Indians feed you and help you to regain your strength.</p>`,
    actions: [{ label: 'Continue', run: () => serveCaptivity({ inTown, town, lost, done }) }],
  });
}

const CAPTIVITY_TEXT = [
  'The months pass quickly as you search for a way out. Fortunately, you are still young and healthy.',
  'The passing months take their toll on your spirits and vitality. There is much yet to be done.',
  'The months pass slowly, with frequent bouts of discouragement and illness.',
  'Each month seems an eternity; age and old battle wounds sap your strength.',
];
const DIFFICULTY_ARTICLES = ['an apprentice', 'a journeyman', 'an adventurer', 'a swashbuckler'];

function captainHealth() {
  return healthLevel({
    yearsElapsed: state.calendar.year - Number(state.era),
    wounds: state.player.wounds ?? 0,
    medicine: state.ability === 'medicine',
  });
}

// 0x1F1D7 runs first: in poor health (3) the captain retires (CSTR 160) and
// the career ends. Retirement and the final score are not playable yet (K9),
// so the player chooses a provisional outcome. The famous-expedition branch
// (CSTR 159) does not apply: every port game is a career.
function serveCaptivity({ inTown, town, lost, done }) {
  if (captainHealth() < 3) {
    beginCaptivity({ inTown, town, lost, done });
    return;
  }
  showDialog({
    kicker: 'Poor health', title: 'Time to retire?',
    body: '<p>Your crew scatters to the winds. Age and old battle wounds sap your strength, and your officers sign on with a younger captain.</p><p>Retirement and the final score are not playable yet. Choose a provisional outcome.</p>',
    actions: [
      { label: 'Retire and end this career', run: () => {
        localStorage.removeItem(SAVE_KEY);
        location.reload();
      } },
      { label: 'Carry on for one more voyage', secondary: true, run: () => beginCaptivity({ inTown, town, lost, done }) },
    ],
  });
}

function beginCaptivity({ inTown, town, lost, done }) {
  const player = state.player;
  player.monthsAtSea = -16;
  const before = { ...state.calendar };
  // Each step is one 0x1DD0E call, so on the island its crew check can raise
  // a mutiny; reputation is re-read before every step.
  const serveStep = (step) => {
    if (!captivityContinues(state.player.reputation, step)) {
      endCaptivity({ inTown, town, lost, done, before });
      return;
    }
    const monthsCrossed = passCalendarDays(CAPTIVITY_STEP_DAYS);
    if (inTown) { serveStep(step + 1); return; }
    monthEndCrewCheck({ monthsCrossed, aboard: true }, () => serveStep(step + 1));
  };
  serveStep(0);
}

function endCaptivity({ inTown, town, lost, done, before }) {
  const months = (state.calendar.year - before.year) * 12 + state.calendar.month - before.month;
  state.player = restartAfterLastShip(state.player, lost, SHIPS);
  // 0x1F803 also abandons any governor mission (0x1F87C).
  state.mission = null;
  const released = releaseFromCaptivity(state.player, state.difficulty);
  state.player = released.player;
  state.difficulty = released.difficulty;
  const health = captainHealth();
  const captainKind = DIFFICULTY_ARTICLES[state.difficulty];
  addLog(inTown
    ? `Released from prison in ${town.name} after ${months} months; back at sea as ${captainKind} captain.`
    : `Rescued from an uncharted island after ${months} months; back at sea as ${captainKind} captain.`);
  showDialog({
    kicker: inTown ? 'Released' : 'Rescued', title: `${months} months pass`,
    body: `<p>${CAPTIVITY_TEXT[health]}</p><p>${inTown
      ? `Your former comrades take pity on you and trade a captured nobleman for your freedom. They agree to take you back as ${captainKind} captain.`
      : `One day a small ship puts in at the island to resupply, and you recognize some of your former crew. They agree to take you back as ${captainKind} captain.`}</p><p>Backers fund a new ${shipName(lost)} with ${state.player.partyGold.toLocaleString()} gold and ${state.player.crew} hands.</p>`,
    actions: [{ label: 'Continue', run: () => {
      saveGame(false);
      if (state.mode !== 'town') { done(); return; }
      // Released from a port visit: the new voyage starts at the release point.
      state.visit = null;
      state.mode = 'sailing';
      setupClouds();
      startVoyage();
    } }],
  });
}

// 0x1DD0E with captivity's day count: the calendar and the monthly world
// update advance, but no food is eaten. Its closing crew check (0x1DDC5) runs
// only while 0x47ACA is 0: after a loss at sea it still is, so it uses the
// lost fleet's crew on the island; in a town prison bit 1 is set and it is
// skipped (entering_towns.md, 0x47ACA table).
// The calendar routine 0x1DD0E, as 0x1E018 calls it for captivity and the
// refit after a division: day by day, with each month's update.
function passCalendarDays(days) {
  let monthsCrossed = 0;
  for (let day = 0; day < days; day += 1) {
    const nextDate = advanceDate(state.calendar);
    state.calendar = { day: nextDate.day, month: nextDate.month, year: nextDate.year };
    if (nextDate.newMonth) { monthlyUpdate({ newsLog: false }); monthsCrossed += 1; }
  }
  return monthsCrossed;
}

// 0x1C056: a coastal town releases you on its departure cell; an inland town
// shifts the point by its fixed offset and then searches for the shore.
function releaseFromTown(town) {
  const departure = townDeparture(state.towns.indexOf(town));
  if (departure) return { x: departure[0], y: departure[1], heading: departure[2] };
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
  state.player.voyageTick = VOYAGE_START_TICK;
}

// Every exit from the sailing view ends the voyage (0x2885B–0x289BB): the
// calendar gains tick / 64 + 1 days, running each month boundary crossed,
// and the next voyage restarts the tick at 63.
// The original charges the days (0x1DD0E, which ends with the mutiny check)
// before it dispatches the event that ended the voyage (0x2849C), so `next`
// runs after any mutiny has been resolved; it receives whether one happened.
function endVoyage(next = () => {}, { aboard = !state.player.onFoot } = {}) {
  fastTravel = false;
  const player = state.player;
  const monthsCrossed = passDays(voyageDays(player.voyageTick ?? VOYAGE_START_TICK));
  player.voyageTick = VOYAGE_START_TICK;
  player.cloudDistancePixels = 999;
  monthEndCrewCheck({ monthsCrossed, aboard }, next);
}

// The crew check that ends 0x1DD0E; `next` receives whether a mutiny happened.
function monthEndCrewCheck({ monthsCrossed, aboard }, next) {
  const player = state.player;
  const event = monthsCrossed > 0 && monthEndCrewEvent({
    morale: player.crewMorale,
    crew: player.crew,
    monthsAtSea: player.monthsAtSea,
    aboard,
  });
  if (event === 'mutiny') { showMutiny(() => next(true)); return; }
  if (event === 'restless') addLog('The men grow restless; without plunder soon they may mutiny.');
  if (event === 'divide') addLog('After many months at sea the men are anxious to divide the plunder.');
  next(false);
}

function showMutiny(next) {
  state.paused = true;
  const resolve = (duelWon) => {
    const player = state.player;
    const result = mutinyOutcome({ crew: player.crew, partyGold: player.partyGold, reputation: player.reputation, duelWon });
    Object.assign(player, { crew: result.crew, partyGold: result.partyGold, reputation: result.reputation });
    addLog(`Mutiny! ${result.deserters} men deserted with ${result.goldLost} gold; you ${duelWon ? 'cut down' : 'were beaten by'} their leader.`);
    next();
  };
  showDialog({
    kicker: 'Mutiny', title: 'Your men confront you on the quarterdeck',
    body: '<p>“Captain, you are a skulker and a coward. We are taking this ship to search for plunder!” A third of the crew deserts as you draw your sword and attack their leader.</p><p>Sword fighting is not playable yet. Choose the provisional result of the duel; either way the mutiny costs you reputation.</p>',
    actions: [
      { label: 'Defeat the ringleader', run: () => resolve(true) },
      { label: 'Lose the duel', secondary: true, run: () => resolve(false) },
    ],
  });
}

function passDays(days) {
  let monthsCrossed = 0;
  for (let day = 0; day < days; day += 1) {
    const nextDate = advanceDate(state.calendar);
    state.calendar = { day: nextDate.day, month: nextDate.month, year: nextDate.year };
    if (nextDate.newMonth) { monthlyUpdate(); monthsCrossed += 1; }
    // The browser autosave waits until sailing resumes, so it never records
    // a voyage that is about to open an encounter or a town.
    if ((state.calendar.day + state.calendar.month * 30) % 5 === 0) autosaveDue = true;
  }
  return monthsCrossed;
}

function stepSimulation() {
  if (!state || state.paused || state.mode !== 'sailing') return;
  if (autosaveDue) {
    autosaveDue = false;
    saveGame(false);
  }
  const player = state.player;
  const previousPlayerX = player.x;
  const previousPlayerY = player.y;
  previousSailingPose = sailingPose();
  previousSailingClouds = state.clouds.map((cloud) => ({ ...cloud }));
  state.tick += 1;
  player.voyageTick = (player.voyageTick ?? VOYAGE_START_TICK) + 1;
  if (player.reefCooldown > 0) player.reefCooldown -= 1;

  if (player.onFoot) {
    // On foot: no clouds' speed effects, no encounter roll and no alert
    // build-up, no reefs; food, wind, time and arrival still run (§3).
    if (stepPartyOnLand(previousPlayerX, previousPlayerY)) return;
    finishTick(previousPlayerX, previousPlayerY);
    return;
  }

  if (acceptsRudderInput(player.voyageTick)) {
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
  if (checkTownArrival(nextX, nextY, previousPlayerX, previousPlayerY)) return;
  // The land/sea switch tests the single map pixel under the new position;
  // only class 2 is land, so shallows are sailed over (porting_guide.md §6).
  if (!isNavigable(nextX, nextY)) {
    beginLanding(nextX, nextY, previousPlayerX, previousPlayerY);
    return;
  }
  player.x = nextX;
  player.y = nextY;
  finishTick(previousPlayerX, previousPlayerY);
}

// Steps 12-16 of the tick, shared afloat and on foot.
function finishTick(previousPlayerX, previousPlayerY) {
  const player = state.player;
  if (player.voyageTick % TICKS_PER_WIND_SHIFT === 0) player.wind = shiftWind(player.wind, rng);
  if (isHalfDayTick(player.voyageTick)) halfDayUpdate();
  if (isDailyTick(player.voyageTick)) dailyUpdate();
  // ASSUMED: the reef (event 3) is assigned last in the original and so wins
  // over an encounter or food event in the same tick; here it waits for the
  // next tick when one of those has already opened, as the fleet is still on
  // the shallows then.
  if (!state.paused && state.mode === 'sailing' && checkReef()) return;
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
  endVoyage(() => approachTown());
  return true;
}

function halfDayUpdate() {
  const previousTownIndex = state.nearestTownIndex;
  const distance = updateNearestTown();
  const town = nearestTown();
  state.alert = alertAfterNearestTownCheck(state.alert, previousTownIndex, state.nearestTownIndex);
  // On foot the nearest town still updates, but there is no encounter roll
  // and approaching overland does not raise the alert (0x23E00).
  if (state.player.onFoot) return;
  const result = encounterRoll(distance, state.alert, rng);
  state.alert = result.alert;
  if (result.sighted) openSighting(town, distance);
}

// The daily check eats food; the calendar moves only when the voyage ends.
function dailyUpdate() {
  const player = state.player;
  player.foodFixed = consumeDailyFood(player.foodFixed, player.crew);
  const remaining = foodDays(player.foodFixed, player.crew);
  const foodEvent = remaining <= 20 && remaining % 4 === 0 && player.crew > 0;
  if (remaining > 0 && foodEvent) addLog(`Only ${remaining} days of food remain.`);
  if (remaining === 0 && player.crew > 0) {
    const starving = starvationDesertion(player);
    player.crew = starving.crew;
    player.partyGold = starving.partyGold;
    player.foodFixed = starving.foodFixed;
    addLog(`Out of food: ${starving.deserters} men deserted with ${starving.goldLost} gold; the rest foraged 5 tons of food.`);
  }
  // Events 2 (food) and 5 (too few men for the fleet) end the voyage. After
  // event 5 the next voyage starts with the fleet check; an open encounter
  // runs it on resuming. Food runs on foot too; the crew check runs aboard.
  const undermanned = !state.paused && !player.onFoot && fleetIsUndermanned({ crew: player.crew, shipCount: player.ships.length });
  if (foodEvent || undermanned) endVoyage((mutinied) => { if (undermanned || mutinied) resumeSailing(); });
}

function monthlyUpdate({ newsLog = true } = {}) {
  const player = state.player;
  // 0xCEB8: wealth += land / 2; reputation -= reputation >> 3 (an
  // arithmetic shift, so -1 decays to 0).
  player.personalWealth += monthlyLandIncome(player.land);
  player.monthsAtSea += player.partyGold > 32767 ? 2 : 1;
  player.reputation -= player.reputation >> 3;
  for (const nation of NATION_ORDER) player.favour[nation] = clamp(player.favour[nation], -100, 100);
  const news = monthlyWorldUpdate({
    towns: state.towns,
    diplomacy: state.diplomacy,
    favour: player.favour,
    month: state.calendar.month,
    diplomacyK: scenarios[state.era].diplomacyK,
    // 0x46058: the town you are in, or the nearest town at sea.
    playerTownIndex: state.visit?.townIndex ?? state.nearestTownIndex,
    // 0x471AC while 0x471AA != 0: the town whose governor gave the mission.
    protectedTownIndex: state.mission ? state.mission.issuer : -1,
    rng,
  });
  const messages = news.map((entry) => worldNewsMessage(entry, state.towns));
  messages.forEach(addWorldNews);
  // Step 6 of 0xCEB8: the treasure fleet and silver train (0xCDE9). Their
  // movement is secret; nothing is logged.
  state.convoys = monthlyConvoyStep({
    convoys: state.convoys,
    routes: convoyRoutesFor(state.era, state.towns),
    towns: state.towns,
    month: state.calendar.month,
    eraIndex: eraIndexOf(state.era),
    rng,
  });
  // The original writes these events to the event log its Ship's Log lists
  // (0x1E8CF, 0x1FC0F); the captain's log line points the player there.
  if (newsLog) {
    addLog(`${MONTHS[state.calendar.month]} begins.`);
    messages.forEach((message) => addLog(`News: ${message}`));
  }
  // 0x1DD0E recomputes the stored morale after each month's update (0x1DDB7).
  refreshCrewMorale();
}

// Crew morale is a stored value (0x45FAA). 0x1DA9B overwrites it with the
// formula at each month end, on loading a game and when the Party Status
// mood is shown; in between, prizes raise it (0xDB7B), and port desertion,
// battle reload and the month-end crew check read the stored value.
function refreshCrewMorale() {
  state.player.crewMorale = morale({ ...state.player, difficulty: state.difficulty });
}

function formatDate({ day, month, year }) {
  return `${day + 1} ${MONTHS[month]} ${year}`;
}

function addWorldNews(message) {
  state.worldNews.unshift({ message, month: state.calendar.month, year: state.calendar.year });
  state.worldNews = state.worldNews.slice(0, 24);
}

function openSighting(town, distance) {
  endVoyage(() => showSighting(town, distance));
}

function showSighting(town, distance) {
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
  const encounters = scenarios[state.era].encounters;
  let template = encounters[nation][tier];
  // 0xD3E7: in the waters of an open pirate mission's target town, 4 times
  // in 5 the ship is the mission nation's pirate.
  const mission = state.mission;
  const missionWaters = mission?.type === MISSION.PIRATE && !mission.done && mission.target === state.nearestTownIndex;
  if (missionWaters && rng.int(5) !== 0) {
    template = encounters[mission.nation].find((entry) => entry[1] === 'pirate') ?? template;
  }
  // 0xD44F: in the waters of the treasure fleet's town, unless the town is
  // alerted, the sail is the fleet's galleon (nation slot 4, tier 0). The
  // original announces nothing more: she is a heavily manned Spanish
  // Galleon with a rich hold. Taking her at sea does not stop the fleet.
  if (meetsTreasureFleet({ convoys: state.convoys, nearestTownIndex: state.nearestTownIndex, alert: state.alert, rng })) {
    template = scenarios[state.era].treasureFleet;
  }
  const [ship, flag, crew, guns, kind, gold, cargo] = template;
  // 0xD525: any pirate met there is the wanted man, and he always gives chase.
  const wanted = missionWaters && flag === 'pirate';
  const hostile = wanted || isEncounterHunter({ kind, favour: state.player.favour[flag] });
  const enemy = { ship, flag, crew, guns, kind, gold, cargo, hostile, namedCaptain: hostile };
  if (wanted) {
    Object.assign(enemy, { captainId: mission.captainId, captainName: captainName(mission.captainId) });
  } else if (hostile) {
    // A pirate hunter takes his surname from the local waters' nation.
    const nationIndex = NATION_ORDER.indexOf(flag === 'pirate' ? town.nation : flag);
    const captain = drawHunterCaptain({ usedRows: state.hunterNameRows ?? 0, nationIndex, rng });
    state.hunterNameRows = captain.usedRows;
    Object.assign(enemy, { captainId: captain.id, captainName: captainName(captain.id) });
  }
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
  // CSTR 121 names a hunter: renown (CSTN 34), "pirate" or "pirate-hunter"
  // (CSTN 105) and the captain's name.
  const hunterLine = enemy.captainName
    ? `<p>“Arrgh! It’s the ${captainRenown(enemy.captainId)} ${enemy.flag === 'pirate' ? 'pirate' : 'pirate-hunter'}, ${enemy.captainName}! He’s chasing us, captain!”</p>`
    : '';
  showDialog({
    kicker: `${enemy.flag === 'pirate' ? 'Pirate' : enemy.flag} colors`, title: enemy.captainName ? `${enemy.captainName}’s ${enemy.ship}` : `The ${enemy.ship}`,
    body: `${hunterLine}<p>She carries about ${enemy.crew * 4} hands and ${enemy.guns} guns. ${enemy.hostile ? 'She alters course and gives chase.' : 'Her crew watches your approach.'}</p>`,
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
    body: `<p>${enemy.captainName ? `${enemy.captainName}’s ${enemy.ship}` : `The ${enemy.ship}`} closes too quickly to escape. You will have to fight.</p>`,
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
    crewMorale: state.player.crewMorale,
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

// remove_ship (0x1F2A1) with the ship's cargo share lost. The last ship takes
// the last-ship path (prison in a town, shipwreck at sea); `done` then gets
// null instead of the lost ship.
function loseShip(slot, { inTown = false, cause = '', done }) {
  if (state.player.ships.length === 1) {
    loseLastShip({ inTown, cause, done: () => done(null) });
    return;
  }
  const result = removeShipWithCargo(state.player, slot, SHIPS);
  state.player = result.player;
  done(result.lost);
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
    damage: battle.enemy.damage, // a kept prize carries it (0xDB7B reads 0x44A4A)
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
    state.player.wounds = (state.player.wounds ?? 0) + 1;
    loseShip(0, { cause: '<p>Your ship is holed in a dozen places, and gradually sinks beneath the waves.</p>', done: (lost) => endBattleToSailing(lost
      ? `Your ${shipName(lost)} was holed and sank, taking her share of the cargo.`
      : 'Your last ship was holed and sank.') });
    return;
  }
  if (battle.event === 'enemy-sunk') {
    state.player.reputation += 1;
    // Likely trade-loss target per sea_battles.md; the nearest-town pointer is not fully confirmed.
    nearestTown().growth = Math.max(0, nearestTown().growth - 10);
    endBattleToSailing(`The ${enemy.ship} exploded and sank. No prize remained.`);
    return;
  }
  if (escapeCostsShip({ event: battle.event, shipCount: state.player.ships.length, enemyDamage: battle.enemy.damage, enemyTactic: battle.enemy.tactic })) {
    let slowest = 1;
    for (let index = 2; index < state.player.ships.length; index += 1) {
      if (statsFor(state.player.ships[index]).type > statsFor(state.player.ships[slowest]).type) slowest = index;
    }
    loseShip(slowest, { done: (lost) => endBattleToSailing(`The enemy overtook and captured your reserve ${shipName(lost)} and her cargo during the escape.`) });
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
    body: `<p>She is a ${stats.cargo}-ton ${enemy.ship} carrying ${enemy.guns} guns${damageLevel(enemy.damage ?? 0) ? ` (${damageLevel(enemy.damage).toLowerCase()})` : ''}. Your fleet has ${freeHold} tons of empty hold space.</p><p>Will you keep her or strip and sink her?</p>`,
    actions: [
      { label: 'Send a prize crew', run: () => keepPrizeShip(enemy) },
      { label: 'Plunder and sink her', secondary: true, run: () => finishPrizeDecision(enemy, false) },
    ],
  });
}

function keepPrizeShip(enemy) {
  const prize = { type: enemy.ship, damage: enemy.damage ?? 0 };
  if (state.player.ships.length < 8) {
    state.player = keepPrize(state.player, prize).player;
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
        state.player = keepPrize(state.player, prize, index).player;
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
  state.player.crewMorale += prizeMoraleBonus(enemy.kind);
  if (enemy.flag !== 'pirate') propagateFavour(enemy.flag, -1);
  const nearbyTown = nearestTown();
  const distance = Math.round(Math.abs(state.player.x - nearbyTown.x) + Math.abs(state.player.y - nearbyTown.y));
  if (SHIPS[enemy.ship].type + 5 > distance) {
    nearbyTown.growth = Math.max(0, nearbyTown.growth - 10);
    addWorldNews(`Shipping losses have hurt trade at ${nearbyTown.name}.`);
  }

  if (isMissionPirateId(enemy.captainId ?? 0)) {
    completeMission(() => openShipPlunder(enemy));
    return;
  }
  if (enemy.captainId) {
    resolveNamedCaptain(enemy, () => openShipPlunder(enemy));
    return;
  }
  openShipPlunder(enemy);
}

// 0xDE33-0xDF80: a captured captain becomes a prisoner only if he has an id
// (a named hunter or pirate). Bit 15 (the mission pirate) completes the
// mission instead. When the flag's low two bits are 0 (Spain, and pirates,
// flag 4) the captain offers news of the treasure fleet or the silver train
// or is held for ransom (CSTR 165); any other captain is held. The prisoner
// word is ((flag & 4) << 6) | id in the first free of eight slots.
function resolveNamedCaptain(enemy, next) {
  state.player.capturedCaptains ??= [];
  const flagIndex = enemy.flag === 'pirate' ? 4 : NATION_ORDER.indexOf(enemy.flag);
  const who = enemy.captainName ?? `The ${enemy.flag} captain`;
  const hold = () => {
    if (state.player.capturedCaptains.length < 8) {
      state.player.capturedCaptains.push({
        nation: enemy.flag, ship: enemy.ship, pirate: flagIndex === 4, value: enemy.captainId, name: enemy.captainName,
        word: captiveWord({ flagIndex, captainId: enemy.captainId }),
      });
      addLog(`${who} is held for ransom.`);
    }
    next();
  };
  if ((flagIndex & 3) !== 0) {
    hold();
    return;
  }
  showDialog({
    kicker: enemy.flag === 'pirate' ? 'A pirate prisoner' : 'A notable prisoner', title: `${who} yields`,
    body: '<p>“Spare me, captain, and I will tell you what I know of the Spanish treasure.”</p>',
    actions: [
      { label: 'Ask about the treasure fleet', run: () => showConvoyReport('treasureFleet', next) },
      { label: 'Ask about the silver train', run: () => showConvoyReport('silverTrain', next) },
      { label: 'Hold for ransom', run: hold },
    ],
  });
}

// 0x1E953 / 0x1EA24: where the convoy is now. Asking sets the captain free.
function showConvoyReport(kind, next) {
  const report = noteConvoyReport(kind);
  showDialog({
    kicker: 'Intelligence from a prisoner', title: report.name,
    body: `<p>${report.message}</p>`,
    actions: [{ label: 'Continue to the captured ship', run: next }],
  });
}

// ASSUMED: the original's log strings "Treasure fleet in %s." and "Silver
// train in %s." (CSTN 20, events 20 and 21) have no caller in the
// executable. The port records a report the captain receives with them in
// the captain's log so the intelligence can be read back later, but only
// when it differs from the last one noted for that convoy. `convoyNotes`
// is optional in a save; an older voyage simply notes its next report.
function noteConvoyReport(kind) {
  const report = convoyReport(kind, state.convoys[kind], state.towns);
  const line = `${kind === 'treasureFleet' ? 'Treasure fleet' : 'Silver train'} in ${report.place}.`;
  state.convoyNotes ??= {};
  if (state.convoyNotes[kind] !== line) {
    state.convoyNotes[kind] = line;
    addLog(line);
  }
  return report;
}

function convoyReportsBody() {
  return ['treasureFleet', 'silverTrain'].map((kind) => `<p>${noteConvoyReport(kind).message}</p>`).join('');
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
    bindTransferButtons(applyTransfer, { repeatable: ['take', 'return'], preferredTransfer, preferredKind, defaultTransfer: 'take' });
  }
  showTransfer();
}

// One-unit transfer arrows, shared by the plunder and merchant windows: a
// click moves one unit and holding the arrow repeats. `apply` moves the
// units, redraws the window when anything moved, and returns the count.
let transferRepeatDelay = 0;
let transferRepeatInterval = 0;

function stopTransferRepeat() {
  clearTimeout(transferRepeatDelay);
  clearInterval(transferRepeatInterval);
  transferRepeatDelay = 0;
  transferRepeatInterval = 0;
}
addEventListener('pointerup', stopTransferRepeat);
addEventListener('pointercancel', stopTransferRepeat);
addEventListener('blur', stopTransferRepeat);

function bindTransferButtons(apply, { repeatable, preferredTransfer, preferredKind, defaultTransfer }) {
  const buttons = [...dialogBody.querySelectorAll('[data-transfer]')];
  for (const button of buttons) {
    button.addEventListener('click', () => apply(button.dataset.transfer, button.dataset.kind));
    if (!repeatable.includes(button.dataset.transfer)) continue;
    button.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || button.disabled) return;
      event.preventDefault();
      stopTransferRepeat();
      const { transfer, kind } = button.dataset;
      if (apply(transfer, kind) === 0) return;
      transferRepeatDelay = setTimeout(() => {
        transferRepeatInterval = setInterval(() => {
          if (apply(transfer, kind) === 0) stopTransferRepeat();
        }, 90);
      }, 320);
    });
  }
  const nextFocus = buttons.find(button => !button.disabled && button.dataset.transfer === preferredTransfer && button.dataset.kind === preferredKind)
    ?? buttons.find(button => !button.disabled && preferredKind && button.dataset.kind === preferredKind)
    ?? buttons.find(button => !button.disabled && button.dataset.transfer === defaultTransfer)
    ?? buttons.find(button => !button.disabled);
  nextFocus?.focus();
}

function finishCaptureFlow() {
  saveGame(false);
  resumeAfterEncounter();
}

function resumeAfterEncounter() {
  resumeSailing();
}

function approachTown({ overland = Boolean(state.player.onFoot) } = {}) {
  const town = nearestTown();
  state.paused = true;
  state.approach = { overland };
  // Leaving puts the ship on the departure cell, which is never a trigger
  // cell. The guard, cleared once the ship is off every trigger cell, covers
  // an overland visit, which leaves the fleet where it lay.
  state.player.arrivalGuard = true;
  const fortText = town.forts === 0 ? 'No fort guards the harbor.' : `${town.forts === 1 ? 'One fort guards' : `${town.forts} forts guard`} the harbor.`;
  // 0x19C62 shows the town's information screen (0x196D0), which has the
  // figures only for a town you have current information on.
  showDialog({
    kicker: townInfoStatus(town.flags) === 'current' ? `${town.nation} · ${prosperity(town.growth)}` : town.nation, title: town.name,
    body: `<p>You have arrived at ${town.name}. ${fortText}</p>${convoyArrivalLines(town)}${townInfoBody(town, { brief: true })}`,
    actions: [
      { label: overland ? 'March into town' : 'Sail into the harbor', run: () => tryHarbor(town) },
      { label: 'Sneak into town', run: () => trySneak(town) },
      { label: 'Attack the town', run: () => attackTown(town) },
      { label: 'Leave town', secondary: true, run: () => { departFromApproach(); resumeSailing(); } },
    ],
  });
}

// CSTN 29 [2], [3]: the approach names a convoy lying in the town. Both
// lines are copied into the same buffer (0x19193-0x1920A), so with both
// convoys in town only the silver train's line shows.
function convoyArrivalLines(town) {
  const present = convoysInTown(state.convoys, state.towns.indexOf(town));
  if (!present.length) return '';
  const line = present.includes('silverTrain') ? 'The silver train is in town!' : 'The treasure fleet is in the harbor!';
  return `<p><strong>${line}</strong></p>`;
}

// Landing (porting_guide.md §8): sailing onto a land pixel stops the ship
// where it lay at the start of the tick and puts a party ashore on the
// pixel it touched. The tick rounds up to the next half day. The prompt is
// "Disembark (Y/N)"; the voyage goes on either way.
function beginLanding(landX, landY, shipX, shipY) {
  const player = state.player;
  player.voyageTick = roundUpToHalfDay(player.voyageTick);
  Object.assign(player, {
    x: landX, y: landY, onFoot: true,
    ship: { x: shipX, y: shipY, heading: player.heading },
    landing: { x: landX, y: landY },
    // set_heading (0x1B565) also set the walk vector: the party walks on
    // inland the way the ship sailed.
    walk: walkVectorForHeading(player.heading),
  });
  state.paused = true;
  showDialog({
    kicker: 'Landfall', title: 'Disembark?',
    body: '<p>Your ship touches the shore and stops. A landing party waits beside it.</p><p>On land the party walks two map cells a day in any terrain, and re-boards only by walking back into the water where it landed. Press <kbd>S</kbd> or Dig to search for treasure.</p>',
    actions: [
      { label: 'Yes, go ashore (Y)', key: 'y', run: () => {
        addLog('A landing party goes ashore; the ship waits offshore.');
        continueVoyage();
      } },
      // 0x315D answered N: the ship is put back and turned round; on_foot
      // stays set, so the next tick walks the party back into the water at
      // the landing spot and re-boards it (rounding the time up again).
      { label: 'No, stay aboard (N)', key: 'n', secondary: true, run: () => {
        player.x = shipX;
        player.y = shipY;
        player.heading = (player.heading + 128) & 0xff;
        player.walk = walkVectorForHeading(player.heading);
        continueVoyage();
      } },
    ],
  });
}

// Resume the running voyage after a prompt that is not a voyage event.
function continueVoyage() {
  state.paused = false;
  resetSailingInterpolation();
  updateInterface();
}

function clearLandingParty() {
  Object.assign(state.player, { onFoot: false, ship: null, landing: null, walk: null, blockedByWater: false });
}

// The on-foot branch of the tick (0x235A3, porting_guide.md §5 and §8).
// Returns true when the tick ended in an event.
function stepPartyOnLand(previousX, previousY) {
  const player = state.player;
  const result = stepOnFoot({
    party: { x: player.x, y: player.y }, walk: player.walk, ship: player.ship, landing: player.landing,
    isLand: (x, y) => !isNavigable(x, y),
    bounds: { minX: 1, minY: 1, maxX: WORLD.width - 1, maxY: WORLD.height - 1 },
  });
  player.dirBits = result.dirBits;
  if (checkTownArrival(result.toX, result.toY, previousX, previousY)) return true;
  if (result.outcome === 'walk') {
    player.x = result.x;
    player.y = result.y;
    player.blockedByWater = false;
  } else if (result.outcome === 'blocked') {
    // Pushing against the water costs half a day a tick; food, wind and
    // encounters stand still until the party turns (landing_and_overland.md §3).
    player.voyageTick = roundUpToHalfDay(player.voyageTick);
    if (!player.blockedByWater) addLog('Water blocks the party; time slips by until it turns inland or walks back to its boat.');
    player.blockedByWater = true;
  } else if (result.outcome === 'board') {
    player.voyageTick = roundUpToHalfDay(player.voyageTick);
    player.x = result.x;
    player.y = result.y;
    player.heading = result.heading;
    player.speed = 0;
    player.blockedByWater = false;
    clearLandingParty();
    resetSailingInterpolation();
    addLog('The landing party is back aboard.');
  }
  return false;
}

const COMPASS_POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function boatBearing() {
  const { landing } = state.player;
  const dx = landing.x - state.player.x;
  const dy = landing.y - state.player.y;
  const distance = Math.round(Math.hypot(dx, dy));
  if (distance === 0) return 'Here';
  const point = COMPASS_POINTS[Math.round((Math.atan2(dx, -dy) / (Math.PI * 2)) * 8 + 8) % 8];
  return `${distance} ${point}`;
}

// Reef (0x2405D, event 3): aboard over a shallow pixel, a fleet with any ship
// bigger than a sloop loses the last such ship once per 100 ticks.
function checkReef() {
  const player = state.player;
  const victim = reefVictim({
    onFoot: player.onFoot,
    shallow: worldMap ? pixelClassAt(worldMap, player.x, player.y) === PIXEL.SHALLOW : false,
    cooldown: player.reefCooldown,
    ships: player.ships, shipStats: SHIPS,
  });
  if (victim < 0) return false;
  player.reefCooldown = REEF_COOLDOWN_TICKS;
  endVoyage(() => strikeReef(victim));
  return true;
}

const REEF_TEXT = '<p>With a jarring crash, one of your ships grinds onto a shallow reef and rapidly fills with water!</p>';

function strikeReef(slot) {
  state.paused = true;
  const wrecked = state.player.ships[slot];
  if (state.player.ships.length === 1) {
    addLog(`The ${shipName(wrecked)} was wrecked on a reef.`);
    loseShip(slot, { cause: REEF_TEXT, done: () => resumeSailing() });
    return;
  }
  loseShip(slot, { done: (lost) => {
    const before = state.player.crew;
    state.player.crew = crewAfterReef(state.player.crew, state.player.ships, SHIPS);
    const drowned = before - state.player.crew;
    addLog(`The ${shipName(lost)} sank on a reef${drowned ? ` with ${drowned} men` : ''}.`);
    showDialog({
      kicker: 'Shallows', title: `The ${shipName(lost)} is lost`,
      body: `${REEF_TEXT}<p>Her share of the cargo goes down with her.${drowned ? ` ${drowned} men who cannot fit aboard the remaining ships are lost.` : ''}</p><p>Pinnaces and sloops cross shallows safely; bigger ships risk the reefs.</p>`,
      actions: [{ label: 'Continue', run: resumeSailing }],
    });
  } });
}

// Search (S on foot, event 7 → 0xA801). The confirmation is the port's: the
// original digs at the key press. The search ends the voyage, which costs
// tick / 64 + 1 days whatever the outcome.
function showDigPrompt() {
  if (!state || state.mode !== 'sailing' || !state.player.onFoot || dialog.open) return;
  state.paused = true;
  const actions = [{ label: 'Dig here (S)', key: 's', run: () => endVoyage(resolveDig) }];
  if (state.treasureMaps.some(({ pieces }) => pieces)) {
    actions.push({ label: 'Study the treasure maps (M)', key: 'm', run: () => showTreasureMaps(showDigPrompt) });
  }
  actions.push({ label: 'Keep walking', secondary: true, run: continueVoyage });
  const [cellX, cellY] = playerCell();
  showDialog({
    kicker: 'Landing party', title: 'Search for treasure?',
    body: `<p>The party stands near ${nearestTown().name}, at map cell ${cellX}, ${cellY}. A search ends the day's march, and a cache must lie within a cell of where you dig.</p>`,
    actions,
  });
}

function resolveDig() {
  const [cellX, cellY] = playerCell();
  const result = digForTreasure({
    records: state.treasureMaps, cellX, cellY, rng,
    relativesRescued: state.relativesRescued,
    giveLostCityPiece: (records, rescued) => giveTreasureMapPiece(records, MAP_KIND.LOST_CITY, state.nearestTownIndex, rescued),
  });
  state.treasureMaps = result.records;
  state.relativesRescued = result.relativesRescued;
  state.player.partyGold += result.gold;
  const paragraphs = result.finds.map((find) => {
    const near = state.towns[find.townIndex]?.name ?? 'the coast';
    if (find.kind === MAP_KIND.BURIED) {
      addLog(`Found buried treasure near ${near}: ${find.gold.toLocaleString()} gold.`);
      return `<p>Your digging uncovers a chest of solid oak! Opening the box, you find ${find.gold.toLocaleString()} gleaming pieces of gold and silver.</p>`;
    }
    if (find.kind === MAP_KIND.RELATIVE) {
      // K7 hook: villains hand out the relative's map pieces and are wiped by
      // this rescue (lost_relatives.md §7). Until the family quest exists no
      // such map can be held, so this branch cannot run yet.
      const relative = RELATIVE_NAMES[find.relative] ?? 'relative';
      addLog(`Rescued my ${relative}.`);
      return `<p>Your ${relative} is rescued! After years of searching, you are reunited at last. "I have a mysterious and exciting tale to tell," your ${relative} exclaims.</p>`;
    }
    addLog('Found great lost treasure!');
    return `<p>You have found the lost ${LOST_CITY_NAMES[find.city] ?? ''} treasure! Riches beyond your wildest dreams are laid before you! A hundred thousand gold pieces are collected and carried aboard your ship.</p>`;
  });
  if (!paragraphs.length) addLog(`A search at cell ${cellX}, ${cellY} found nothing.`);
  state.paused = true;
  showDialog({
    kicker: 'The search', title: paragraphs.length ? 'Treasure!' : 'Nothing here',
    body: paragraphs.length ? paragraphs.join('') : '<p>After three days of fruitless digging, the search is called off. There is no treasure here.</p>',
    actions: [{ label: 'Continue', run: resumeSailing }],
  });
}

function attackTown(town) {
  // 0x18B9C: the convoys' guards join the garrison at every assault.
  town.soldiers = convoyGarrison(town.soldiers, convoysInTown(state.convoys, state.towns.indexOf(town)).length);
  showDialog({
    kicker: 'Assault', title: `Attack ${town.name}`,
    body: `<p>Town and land combat are not playable yet. Choose the provisional result of the assault; capture now leads into the documented plunder sequence.</p>`,
    actions: [
      { label: 'Capture the town', run: () => captureTown(town) },
      { label: 'Repelled with losses', run: () => { const lost = Math.min(state.player.crew - 1, Math.max(1, Math.floor(state.player.crew / 5))); state.player.crew -= lost; state.alert += 16; state.player.reputation -= 2; addLog(`Lost ${lost} crew attacking ${town.name}.`); departFromApproach(); runFleetCheck({ inTown: true, done: startVoyage }); } },
      { label: 'Withdraw from the assault', secondary: true, run: () => { state.alert += 16; addLog(`Withdrew from the assault on ${town.name}.`); departFromApproach(); resumeSailing(); } },
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
  // 0x2297B: a treasure fleet or silver train in the town adds its bonus
  // to the loot and is finished for the year.
  const convoys = captureConvoys({ convoys: state.convoys, townIndex: state.towns.indexOf(town), goldByte: scenarios[state.era].treasureFleet[5] });
  state.convoys = convoys.convoys;
  const loot = capturedTownPlunder({ town, alert: state.alert, rng, convoyBonus: convoys.bonus });
  Object.assign(town, applyTownCapture(town, loot));
  // 0x227AF: taking the town gives current information on it.
  town.flags = learnTownInfo(town.flags);
  state.player.reputation += loot.gold > 990 ? 2 : 0;
  propagateFavour(oldNation, -1);
  if (loot.gold > 990) propagateFavour(oldNation, -2);
  const threshold = 10 * town.population + rng.int(10 * town.population);
  addLog(`Captured ${town.name} from ${oldNation}.`);
  const settle = () => {
    // 0x2285C: taking the rescue mission's town frees the governor's son.
    const mission = state.mission;
    if (mission?.type === MISSION.RESCUE && !mission.done && mission.target === state.towns.indexOf(town)) {
      completeMission(() => settleCapturedTown(town, oldNation, loot, threshold));
      return;
    }
    settleCapturedTown(town, oldNation, loot, threshold);
  };
  showConvoyCaptures(convoys.captured, settle);
}

// CSTR 186 / 187 and log events 24 / 25, the fleet first.
const CONVOY_CAPTURE_TEXTS = {
  treasureFleet: {
    title: 'The treasure fleet is yours!',
    body: 'You have captured the royal Spanish treasure fleet! A flood of gold and jewels pours into the hold of your ship.',
    log: 'Captured the treasure fleet!',
  },
  silverTrain: {
    title: 'The silver train is yours!',
    body: 'You have captured the silver train, bearing a fortune in silver from the mines of Peru! The crew sings lustily as they haul it aboard.',
    log: 'Captured the silver train!',
  },
};

function showConvoyCaptures(captured, next) {
  if (!captured.length) { next(); return; }
  const text = CONVOY_CAPTURE_TEXTS[captured[0]];
  addLog(text.log);
  showDialog({
    kicker: 'Spanish treasure', title: text.title,
    body: `<p>${text.body}</p>`,
    actions: [{ label: 'Continue', run: () => showConvoyCaptures(captured.slice(1), next) }],
  });
}

function settleCapturedTown(town, oldNation, loot, threshold) {
  const proceed = () => beginPlunderTransfer(`Plunder of ${town.name}`, loot, () => {
    saveGame(false);
    departFromApproach();
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

function returnToApproach(kicker, title, body) {
  const overland = Boolean(state.approach?.overland);
  showDialog({
    kicker, title, body: `<p>${body}</p>`,
    actions: [{ label: 'Back to the approach', run: () => approachTown({ overland }) }],
  });
}

// entering_towns.md §2: a refused approach leaves the approach menu open, so
// the captain may try again (a new roll) or choose another course.
function tryHarbor(town) {
  const result = harborAttempt({ favour: state.player.favour[town.nation], governorMood: town.mood, crew: state.player.crew, forts: town.forts, rng });
  if (result.admitted) { enterTown(town, false); return; }
  // Fort fire can only sink a ship that arrived by sea (0x1953A).
  if (result.shipLost && !state.approach?.overland) {
    // 0x1F2A1(rnd(ship_count), 0, 1): cargo share lost; the last ship means prison.
    loseShip(rng.int(state.player.ships.length), { inTown: true, cause: '<p>As you approach the town, the fort opens fire! One of your ships is sunk!</p>', done: (lost) => {
      if (!lost) { resumeSailing(); return; }
      addLog(`The fort at ${town.name} sank your ${shipName(lost)} and her cargo.`);
      returnToApproach('The fort opens fire', 'One of your ships is sunk!', `An accurate salvo sinks your ${shipName(lost)} and her cargo.`);
    } });
  } else {
    returnToApproach('The fort opens fire', 'The fort opens fire!', 'Cannon fire throws up columns of water and the fleet stands off beyond range.');
  }
}

// entering_towns.md §3 and sword_fights.md: a recognised captain fights one
// guard (0x161BA at 0x1968C); win or lose, he is back at the approach menu.
function trySneak(town) {
  const unseen = sneakAttempt({ governorMood: town.mood, reputation: state.player.reputation, rng });
  if (unseen) { enterTown(town, true); return; }
  const overland = Boolean(state.approach?.overland);
  showDialog({
    kicker: 'Recognized!', title: '“Halt, you cowardly pirate scum!”',
    body: '<p>As you sneak into town, one of the governor’s guards recognizes you and draws his sword.</p><p>Sword fighting is not playable yet. Choose the provisional result of the duel.</p>',
    actions: [
      { label: 'Defeat the guard', run: () => {
        addLog(`Fought off a guard while sneaking into ${town.name}.`);
        approachTown({ overland });
      } },
      { label: 'Lose the duel', secondary: true, run: () => {
        // Losing any duel sets reputation to -1 (0x165FE, sword_fights.md).
        state.player.reputation = -1;
        addLog(`Beaten by a guard while sneaking into ${town.name}.`);
        approachTown({ overland });
      } },
    ],
  });
}

function enterTown(town, sneaking) {
  state.mode = 'town';
  state.paused = true;
  state.visit = { townIndex: state.nearestTownIndex, sneaking, overland: Boolean(state.approach?.overland), recruited: false, merchant: null };
  // 0x17EBB: entering a town makes your information on it current.
  town.flags = learnTownInfo(town.flags);
  if (state.portTrade.townIndex !== state.nearestTownIndex) {
    state.portTrade = { townIndex: state.nearestTownIndex, merchantCash: null, shipwrightCash: null };
  }
  addLog(`Made port at ${town.name}.`);
  showTownMenu();
}

// CSTR 200-209 and the logbook lines of CSTN 20 (28-36).
const MISSION_ORDERS = {
  [MISSION.LETTER]: (target) => `“You must deliver this letter to my cousin who lives in the city of ${target}. Please hurry.”`,
  [MISSION.PAPERS]: (target) => `“You must deliver these secret documents to my half-brother, who is acting as a spy for our king in the city of ${target}. His future depends upon your haste.”`,
  [MISSION.PIRATE]: (target, pirate) => `“The pirate ${pirate} is again roaming the seas off the coast of ${target}. You must capture him and his band of cutthroats.”`,
  [MISSION.RESCUE]: (target) => `“My son is held captive by our king’s enemies in the city of ${target}. I charge you to capture the town and free my son!”`,
};
const MISSION_ACCEPTED_LOGS = {
  [MISSION.LETTER]: (target) => `Accepted letter for ${target}.`,
  [MISSION.PAPERS]: (target) => `Accepted papers for ${target}.`,
  [MISSION.PIRATE]: (target, pirate) => `Pirate ${pirate} off ${target}.`,
  [MISSION.RESCUE]: (target) => `Accepted rescue mission to ${target}.`,
};
const MISSION_DONE_TEXTS = {
  [MISSION.LETTER]: (issuer) => `The cousin of the governor of ${issuer} accepts the letter you have brought him. “The governor will surely reward you for this service,” he adds with a smile.`,
  [MISSION.PAPERS]: (issuer) => `The half-brother of the governor of ${issuer} quietly accepts the secret documents you have brought him. “The king will be greatly pleased by your efforts,” he whispers.`,
  [MISSION.PIRATE]: (issuer, pirate) => `The governor of ${issuer} will be greatly pleased by your capture of the evil pirate ${pirate} and his crew.`,
  [MISSION.RESCUE]: (issuer) => `The son of the governor of ${issuer} is freed from his dark prison cell. “My father will reward you handsomely for this noble deed,” he cries.`,
};
const MISSION_DONE_LOGS = {
  [MISSION.LETTER]: (target) => `Delivered letter to ${target}.`,
  [MISSION.PAPERS]: (target) => `Delivered papers to ${target}.`,
  [MISSION.PIRATE]: (target, pirate) => `Captured the pirate ${pirate}.`,
  [MISSION.RESCUE]: (target) => `Rescued prisoner from ${target}.`,
};

function governorMission(town, next) {
  const townIndex = state.visit.townIndex;
  const mission = state.mission;
  const kicker = `${town.nation} governor`;
  if (mission) {
    // Only the governor who gave the mission settles it (0x12E9D).
    if (mission.issuer !== townIndex) { next(); return; }
    state.mission = null;
    if (!mission.done) {
      // 0x12EC9: an open mission counts as failed.
      state.player.favour[town.nation] -= 1;
      town.mood -= 1;
      addLog('Governor displeased by failure.');
      showDialog({
        kicker, title: 'A mission unfulfilled',
        body: '<p>“I am disappointed that you have failed to complete the mission I gave to you,” the governor says.</p>',
        actions: [{ label: 'Continue the audience', run: next }],
      });
      return;
    }
    // 0x12F70: favour +1 with the mission's nation. The binary adds the
    // status word, which is the negated type by now, to the governor's mood.
    state.player.favour[mission.nation] += 1;
    town.mood -= mission.type;
    showDialog({
      kicker, title: 'A mission fulfilled',
      body: mission.type === MISSION.PIRATE
        ? `<p>“So you have brought me that despicable pirate, ${captainName(mission.captainId)},” the governor observes. “The king will be very pleased at this news.”</p>`
        : '<p>“I am greatly pleased that you have fulfilled the mission I gave you,” the governor says. “Your service will be remembered.”</p>',
      actions: [{ label: 'Continue the audience', run: next }],
    });
    return;
  }
  const offer = rollGovernorMission({
    towns: state.towns, currentTownIndex: townIndex, nation: town.nation,
    favour: state.player.favour[town.nation], governorMood: town.mood, diplomacy: state.diplomacy, rng,
  });
  if (!offer) { next(); return; }
  showDialog({
    kicker, title: 'An urgent mission',
    body: '<p>“I have an urgent mission for you,” the governor says.</p>',
    actions: [
      { label: 'Accept the mission', run: () => acceptMission(town, offer, next) },
      { label: 'Decline the mission', secondary: true, run: next },
    ],
  });
}

function acceptMission(town, { type, target }, next) {
  const mission = { type, issuer: state.visit.townIndex, target, nation: town.nation, done: false };
  if (type === MISSION.PIRATE) mission.captainId = missionPirateId(NATION_ORDER.indexOf(town.nation), rng);
  state.mission = mission;
  const targetName = state.towns[target].name;
  const pirate = mission.captainId === undefined ? '' : captainName(mission.captainId);
  addLog(MISSION_ACCEPTED_LOGS[type](targetName, pirate));
  showDialog({
    kicker: `${town.nation} governor`, title: 'Your orders',
    body: `<p>${MISSION_ORDERS[type](targetName, pirate)}</p>`,
    actions: [{ label: 'Continue the audience', run: next }],
  });
}

// 0x1F8F7: the mission is done; its reward waits for the issuing governor.
function completeMission(next) {
  const mission = state.mission;
  if (!mission) { next(); return; }
  const issuer = state.towns[mission.issuer].name;
  const target = state.towns[mission.target].name;
  const pirate = mission.captainId === undefined ? '' : captainName(mission.captainId);
  mission.done = true;
  addLog(MISSION_DONE_LOGS[mission.type](target, pirate));
  showDialog({
    kicker: 'Mission accomplished', title: `Return to ${issuer}`,
    body: `<p>${MISSION_DONE_TEXTS[mission.type](issuer, pirate)}</p>`,
    actions: [{ label: 'Continue', run: next }],
  });
}

// 0x1108F: in the target town of a letter or papers mission the recipient
// appears. ASSUMED: the original shows him as a figure in the town view;
// here he is a town menu entry.
function missionDeliveryActions() {
  const mission = state.mission;
  if (!mission || mission.done || mission.target !== state.visit.townIndex) return [];
  if (mission.type !== MISSION.LETTER && mission.type !== MISSION.PAPERS) return [];
  const label = mission.type === MISSION.LETTER ? 'Deliver the letter' : 'Deliver the papers';
  return [{ label, run: () => completeMission(showTownMenu) }];
}

function showTownMenu() {
  const town = state.towns[state.visit.townIndex];
  const rank = RANK_NAMES[state.player.ranks[town.nation]];
  const standing = nationalStanding(state.player.favour[town.nation]);
  const governorAvailable = town.population >= 6 && !state.visit.governorSeen;
  const governorState = town.population < 6 ? 'No resident governor' : state.visit.governorSeen ? 'Audience completed' : 'Audience available';
  const actions = [];
  if (governorAvailable) actions.push({ label: 'Governor', run: showGovernor });
  actions.push(
    ...missionDeliveryActions(),
    { label: 'Tavern', run: showTavern },
    ...(!state.visit.sneaking ? [{ label: 'Merchant', run: openMerchant }] : []),
    { label: 'Shipwright', run: showShipwright },
    { label: 'Divide the plunder', run: showPlunderDivision },
    { label: 'Logbook', secondary: true, run: () => showLogbook(showTownMenu) },
    { label: 'Save voyage', secondary: true, run: () => { saveGame(); showTownMenu(); } },
    { label: 'Put to sea', secondary: true, run: leaveTown },
  );
  showDialog({
    kicker: `${town.nation} port`, title: town.name,
    body: `<p>${state.visit.sneaking ? 'You move through the streets under a borrowed name.' : 'Your ships lie safely at anchor.'}</p><dl><dt>${town.nation} rank</dt><dd>${rank}</dd><dt>Crown standing</dt><dd>${standing}</dd><dt>Land</dt><dd>${(state.player.land * 50).toLocaleString()} acres</dd><dt>Governor</dt><dd>${governorState}</dd><dt>Crew</dt><dd>${state.player.crew}</dd><dt>Food</dt><dd>${Math.floor(state.player.foodFixed / 256)}</dd><dt>Gold</dt><dd>${state.player.partyGold}</dd></dl>`,
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
  state.player = beginDivisionRefit(state.player, division);
  state.difficulty = nextDifficulty;
  // The decoded new-expedition initializer clears the current visit flags,
  // including clandestine entry and one-off tavern/merchant state.
  state.visit = { ...state.visit, sneaking: false, recruited: false, merchant: null };
  addLog(`Divided the plunder: ${oldCrew} crew received ${division.crewShare} gold each.`);
  // 0x184A8: the refit takes four 26-day calls of the calendar routine
  // (0x1E018), 104 days with every month's update, after months at sea is
  // reset to -16. ASSUMED: as for a town prison, the month-end crew check is
  // not run while the ship lies in port.
  const refitStart = { ...state.calendar };
  for (let step = 0; step < DIVISION_REFIT_STEPS; step += 1) passCalendarDays(DIVISION_REFIT_STEP_DAYS);
  // 0x1852D: then the fresh fleet with the party gold, which the division
  // has not touched: a tenth of it, the flagship repaired, a new crew of
  // reputation + 16. Zero party gold takes 0x1EF87's restart branch.
  state.player = freshFleet(state.player, { gold: state.player.partyGold, flagshipType: shipName(flagship), shipStats: SHIPS });
  const player = state.player;
  addLog(`The ${shipName(flagship)} was careened and refitted, ${DIVISION_REFIT_STEPS * DIVISION_REFIT_STEP_DAYS} days ashore from ${formatDate(refitStart)}.`);
  addLog(`A new expedition begins aboard the ${shipName(flagship)} with ${player.crew} loyal hands.`);
  saveGame(false);
  showDialog({
    kicker: 'A new account', title: 'The company disperses',
    body: `<p>Your share of ${division.captainTake.toLocaleString()} gold is secured as personal wealth. Your backers provide ${division.expeditionGold.toLocaleString()} gold for a new expedition.</p><p>Your ship is careened and refitted; provisions are collected and stowed. News of your expedition spreads among the islands. Small groups of hardy men return to join your band.</p><dl><dt>Time ashore</dt><dd>${DIVISION_REFIT_STEPS * DIVISION_REFIT_STEP_DAYS} days, until ${formatDate(state.calendar)}</dd><dt>Personal wealth</dt><dd>${state.player.personalWealth.toLocaleString()}</dd><dt>Reputation</dt><dd>${state.player.reputation}</dd><dt>New crew</dt><dd>${player.crew}</dd></dl>`,
    actions: [{ label: 'Return to town', run: () => runFleetCheck({ inTown: true, done: showTownMenu }) }],
  });
}

function governorStatusBody(town) {
  const favour = state.player.favour[town.nation];
  return `<dl><dt>${town.nation} rank</dt><dd>${RANK_NAMES[state.player.ranks[town.nation]]}</dd><dt>Crown standing</dt><dd>${nationalStanding(favour)}</dd><dt>${town.nation} national favour</dt><dd>${favour}</dd><dt>Land</dt><dd>${(state.player.land * 50).toLocaleString()} acres</dd><dt>Governor mood (debug)</dt><dd>${town.mood}</dd></dl>`;
}

function governorBriefingBody(town) {
  const briefing = diplomaticBriefing(state.diplomacy, town.nation);
  return briefing.length
    ? `<p>The governor describes the present affairs of the Crown:</p><ul class="ship-news">${briefing.map(({ message }) => `<li>${message}</li>`).join('')}</ul>`
    : `<p>The governor reports that ${town.nation} is at peace with every European power in the Caribbean.</p>`;
}

function showGovernor() {
  const town = state.towns[state.visit.townIndex];
  state.visit.governorSeen = true;
  // The governor driver settles or offers a mission (0x12E88) before the
  // pirate delivery (0x12432) and the promotion (0x12549).
  governorMission(town, () => deliverGovernorPirates(town));
}

// 0x12432 hands over, without asking, every prisoner that matches the
// governor's nation (see governorPirateHandover). With the words the capture
// code stores, nobody ever matches, so the audience moves straight on; the
// dialog stays for saves or future captives that do match.
function deliverGovernorPirates(town) {
  const { delivered, favourGain } = governorPirateHandover({
    captives: state.player.capturedCaptains,
    governorNationIndex: NATION_ORDER.indexOf(town.nation),
  });
  if (delivered.length === 0) {
    continueGovernorAudience(town);
    return;
  }
  state.player.favour[town.nation] += favourGain;
  state.player.capturedCaptains = state.player.capturedCaptains.filter((captive) => !delivered.includes(captive));
  const names = delivered.map(({ name, ship }) => name ?? `the captain of a ${ship}`).join(', ');
  addLog(`Turned over ${names} in ${town.name}; ${town.nation} favour rose by ${favourGain}.`);
  showDialog({
    kicker: `${town.nation} governor`, title: delivered.length === 1 ? 'A pirate brought to justice' : `${delivered.length} pirates brought to justice`,
    body: `<p>The governor takes ${names} into custody and promises that the Crown will remember your service.</p>`,
    actions: [{ label: 'Continue the audience', run: () => continueGovernorAudience(town) }],
  });
}

function continueGovernorAudience(town) {
  const promotion = governorPromotion({
    favour: state.player.favour[town.nation],
    rank: state.player.ranks[town.nation],
    governorMood: town.mood,
  });
  if (!promotion) {
    beginGovernorRansoms(town);
    return;
  }
  const oldRank = state.player.ranks[town.nation];
  state.player.ranks[town.nation] = promotion.rank;
  state.player.favour[town.nation] = promotion.favour;
  state.player.land += promotion.landUnits;
  addLog(`${town.nation} promoted you from ${RANK_NAMES[oldRank]} to ${RANK_NAMES[promotion.rank]}.`);
  showDialog({
    kicker: `${town.nation} governor`, title: `Promotion to ${RANK_NAMES[promotion.rank]}`,
    body: `<p>The Crown recognizes your service to ${town.nation}.</p><dl><dt>New rank</dt><dd>${RANK_NAMES[promotion.rank]}</dd><dt>${town.nation} national favour</dt><dd>${promotion.favour}</dd>${promotion.landUnits > 0 ? `<dt>Land grant</dt><dd>${(promotion.landUnits * 50).toLocaleString()} acres</dd>` : ''}<dt>Governor mood (debug)</dt><dd>${town.mood}</dd></dl>`,
    actions: [{ label: 'Continue the audience', run: () => beginGovernorRansoms(town) }],
  });
}

function beginGovernorRansoms(town) {
  const offers = captainRansomOffers({ captives: state.player.capturedCaptains, rng });
  showGovernorRansom(town, offers, 0);
}

function showGovernorRansom(town, offers, index) {
  if (index >= offers.length) {
    finishGovernorAudience(town);
    return;
  }
  const { captain, gold } = offers[index];
  if (!state.player.capturedCaptains.includes(captain)) {
    showGovernorRansom(town, offers, index + 1);
    return;
  }
  const description = `${captain.nation ?? 'foreign'} captain captured from a ${captain.ship}`;
  showDialog({
    kicker: 'A ransom offer', title: `${gold.toLocaleString()} gold for the prisoner`,
    body: `<p>An agent asks you to release the ${description}.</p>`,
    actions: [
      { label: 'Take the gold', run: () => {
        state.player.partyGold += gold;
        state.player.capturedCaptains.splice(state.player.capturedCaptains.indexOf(captain), 1);
        addLog(`Ransomed a captured ${captain.nation ?? 'foreign'} captain for ${gold} gold.`);
        showGovernorRansom(town, offers, index + 1);
      } },
      { label: 'Wait for a better offer', secondary: true, run: () => showGovernorRansom(town, offers, index + 1) },
    ],
  });
}

function finishGovernorAudience(town) {
  const favour = state.player.favour[town.nation];
  const status = governorStatusBody(town);
  const briefing = governorBriefingBody(town);
  const terms = governorAmnestyTerms(favour);
  if (terms) {
    const isAmnesty = terms.kind === 'amnesty';
    showDialog({
      kicker: `${town.nation} governor`, title: isAmnesty ? 'An offer of amnesty' : 'A letter of marque',
      body: `<p>${isAmnesty ? `The governor offers to pardon your offenses against ${town.nation}` : `The governor offers you a commission in the service of ${town.nation}`} for ${terms.price.toLocaleString()} gold.</p>${status}${briefing}`,
      actions: [
        { label: isAmnesty ? 'Accept amnesty' : 'Buy the commission', run: () => completeGovernorPurchase(town, terms) },
        { label: 'Decline', secondary: true, run: showTownMenu },
      ],
    });
    return;
  }
  if (favour <= -4) {
    showDialog({
      kicker: `${town.nation} governor`, title: 'A cold audience',
      body: `<p>The governor hears you but offers neither pardon nor commission.</p>${status}${briefing}`,
      actions: [{ label: 'Return to town', run: showTownMenu }],
    });
    return;
  }
  const rank = RANK_NAMES[state.player.ranks[town.nation]];
  showDialog({
    kicker: `${town.nation} governor`, title: `My dear ${rank} ${state.captain}`,
    body: `<p>The governor welcomes a proven friend of ${town.nation}. Your letter of marque remains in good standing.</p>${status}${briefing}`,
    actions: [{ label: 'Return to town', run: showTownMenu }],
  });
}

function completeGovernorPurchase(town, terms) {
  if (state.player.partyGold < terms.price) {
    showDialog({
      kicker: `${town.nation} governor`, title: 'Insufficient funds',
      body: `<p>The governor requires ${terms.price.toLocaleString()} gold, but you have ${state.player.partyGold.toLocaleString()}.</p>`,
      actions: [{ label: 'Return to town', run: showTownMenu }],
    });
    return;
  }
  state.player.partyGold -= terms.price;
  state.player.favour[town.nation] = terms.resultingFavour;
  town.mood = 0;
  const standing = nationalStanding(terms.resultingFavour);
  const message = terms.grantsCommission
    ? `${town.nation} granted you a letter of marque.`
    : `${town.nation} granted amnesty and now regards you as ${standing.toLowerCase()}.`;
  addLog(message);
  showDialog({
    kicker: `${town.nation} governor`, title: terms.grantsCommission ? 'Commission granted' : 'Amnesty recorded',
    body: `<p>${message}</p><dl><dt>Gold paid</dt><dd>${terms.price.toLocaleString()}</dd><dt>Crown standing</dt><dd>${standing}</dd><dt>${town.nation} national favour</dt><dd>${terms.resultingFavour}</dd><dt>Governor mood (debug)</dt><dd>${town.mood}</dd></dl>`,
    actions: [{ label: 'Return to town', run: showTownMenu }],
  });
}

function showTavern() {
  const town = state.towns[state.visit.townIndex];
  if (!state.visit.tavernEncounters) {
    state.visit.tavernEncounters = tavernSpecialEncounters({ mapPieces: mapPieceCount(state.treasureMaps[MAP_KIND.BURIED]), towns: state.towns, rng })
      .map((encounter) => ({
        ...encounter,
        resolved: false,
        townIndex: encounter.townIndex ?? null,
      }));
  }
  const encounters = state.visit.tavernEncounters.filter(({ resolved }) => !resolved);
  const mapPieces = mapPieceCount(state.treasureMaps[MAP_KIND.BURIED]);
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
  if (state.treasureMaps.some(({ pieces }) => pieces)) actions.push({ label: 'Study the treasure maps', run: () => showTreasureMaps(showTavern) });
  actions.push({ label: 'Return to town', secondary: true, run: showTownMenu });

  const visitor = encounters.length
    ? encounters.map(({ kind }) => kind === 'map-seller'
      ? 'A weather-beaten pirate guards a scrap of parchment in a shadowed booth.'
      : 'A traveller watches the room, waiting for someone willing to buy information.').join(' ')
    : 'No unusual visitors draw your attention tonight.';
  showDialog({
    kicker: `The tavern · ${town.name}`,
    title: 'Rumours, recruits, and strong drink',
    body: `<p>${visitor}</p><dl><dt>Sailors</dt><dd>${state.visit.recruited ? 'Already approached' : 'Available'}</dd><dt>Treasure map</dt><dd>${mapPieces}/4 pieces</dd><dt>Your gold</dt><dd>${state.player.partyGold}</dd></dl>`,
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

// The town information screen (0x196D0, CSTN 23): figures for a town you
// have current information on, otherwise "(no info)" or, after a random event
// there, "Recent events in %s have made your information obsolete."
function townInfoBody(town, { brief = false } = {}) {
  const status = townInfoStatus(town.flags);
  if (status === 'obsolete') return `<p>Recent events in ${town.name} have made your information obsolete.</p>`;
  if (status === 'none') return `<p>You have no information on ${town.name}.</p>`;
  const forts = town.forts === 0 ? 'None' : town.forts;
  return `<dl>${brief ? '' : `<dt>Flag</dt><dd>${town.nation}</dd><dt>Prosperity</dt><dd>${prosperity(town.growth)}</dd><dt>Forts</dt><dd>${forts}</dd>`}<dt>Treasury</dt><dd>${(town.gold * 1000).toLocaleString()} gold</dd><dt>Soldiers</dt><dd>${(town.soldiers * 5).toLocaleString()}</dd><dt>Citizens</dt><dd>${(town.population * 100).toLocaleString()}</dd></dl>`;
}

function newsBody(items, emptyMessage = 'There is no fresh news.') {
  return items.length
    ? `<ul class="ship-news">${items.map((item) => {
      if (typeof item === 'string') return `<li>${item}</li>`;
      return `<li><time>${MONTHS[item.month]} ${item.year}</time> — ${item.message}</li>`;
    }).join('')}</ul>`
    : `<p>${emptyMessage}</p>`;
}

// The captain's logbook (0xC46E): the Ship's Log lists the event log the
// monthly world writes to (0x1FC0F), and the map's gazetteer gives the known
// status of every city (0xB464, CSTN 24 "City Information"). The original
// opens both from the cabin; the port opens them from the Log control at sea
// and from the town menu, without the cabin's time cost (porting_guide §17).
function showLogbook(close) {
  showDialog({
    kicker: `Captain ${state.captain} · ${formatDate(state.calendar)}`, title: 'The captain’s logbook',
    body: '<p>Your log records the news of the Caribbean as it reaches you, and the gazetteer holds what you know of each city.</p>',
    actions: [
      { label: 'Ship’s log', run: () => showShipsLog(close) },
      { label: 'City information', run: () => showCityInformation(close) },
      { label: 'Close the logbook', secondary: true, run: close },
    ],
  });
}

function showShipsLog(close) {
  showDialog({
    kicker: 'The captain’s logbook', title: 'Ship’s log',
    body: newsBody(state.worldNews, 'No entries.'),
    actions: [
      { label: 'Back to the logbook', run: () => showLogbook(close) },
      { label: 'Close the logbook', secondary: true, run: close },
    ],
  });
}

function cityInformationLine(town) {
  const status = townInfoStatus(town.flags);
  if (status === 'none') return `<li><b>${town.name}</b><small>No information</small></li>`;
  if (status === 'obsolete') return `<li><b>${town.name}</b><small>Recent events in ${town.name} have made your information obsolete.</small></li>`;
  const forts = town.forts === 0 ? 'no fort' : `${town.forts} fort${town.forts === 1 ? '' : 's'}`;
  return `<li><b>${town.name}</b> (${town.nation}) · ${prosperity(town.growth)}<small>${forts} · ${(town.gold * 1000).toLocaleString()} gold · ${(town.soldiers * 5).toLocaleString()} soldiers · ${(town.population * 100).toLocaleString()} citizens</small></li>`;
}

function showCityInformation(close) {
  const towns = [...state.towns].sort((a, b) => a.name.localeCompare(b.name));
  showDialog({
    kicker: 'The captain’s logbook', title: 'City information',
    body: `<ul class="city-info">${towns.map(cityInformationLine).join('')}</ul>`,
    actions: [
      { label: 'Back to the logbook', run: () => showLogbook(close) },
      { label: 'Close the logbook', secondary: true, run: close },
    ],
  });
}

function openLogbookAtSea() {
  if (!state || state.mode !== 'sailing' || dialog.open) return;
  const wasPaused = state.paused;
  state.paused = true;
  showLogbook(() => {
    state.paused = wasPaused;
    if (!wasPaused) resetSailingInterpolation();
    updateInterface();
  });
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
      // ASSUMED: the barmaid stands in for the original's informant at the
      // governor's house (CSTN 26), who reports the treasure fleet and then
      // the silver train (0x1292D-0x12A0D) with the news.
      body: `${convoyReportsBody()}${newsBody(state.worldNews.slice(0, 4), 'Even your informant has heard nothing new.')}`,
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
    body: `<p>The seller asks ${encounter.price} gold pieces for part of an old treasure map. Each piece shows more of the land around the cache.</p>`,
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
  // 0x115A0: the report sets the town's current-information bit and shows
  // its status (0x196D0). ASSUMED: prominent-person quests are not
  // implemented yet, so the traveller always reports on a town.
  reportedTown.flags = learnTownInfo(reportedTown.flags);
  showDialog({
    kicker: 'The traveller’s report', title: `Intelligence from ${reportedTown.name}`,
    body: `${townInfoBody(reportedTown)}${newsBody(state.worldNews.slice(0, 3), 'No wider news reached the traveller.')}`,
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
  state.treasureMaps = giveTreasureMapPiece(state.treasureMaps, MAP_KIND.BURIED, state.visit.townIndex);
  const map = state.treasureMaps[MAP_KIND.BURIED];
  addLog(`Bought treasure-map piece ${mapPieceCount(map)}/4 near ${state.towns[map.townIndex].name}.`);
  showDialog({
    kicker: 'The treasure map', title: map.pieces === COMPLETE_MAP ? 'The map is complete' : `Piece ${mapPieceCount(map)} of 4`,
    body: treasureMapBody(MAP_KIND.BURIED),
    actions: [{ label: 'Return to the tavern', run: showTavern }],
  });
}

// give_piece (0x1F08A) with the site's nearest town from the trigger cells.
function giveTreasureMapPiece(records, kind, currentTownIndex, relativesRescued = state.relativesRescued) {
  return giveMapPiece({
    records, kind, sites: TREASURE_SITES,
    nearestTown: (x, y) => nearestTriggerTown(townTriggers(), x, y),
    currentTownIndex, difficulty: state.difficulty, relativesRescued, rng,
  });
}

// Saves before version 9 held one map with a piece count and a random clue
// town. ASSUMED: the converted map keeps the piece count and, when one
// exists, takes a dig site whose nearest town is the old clue town.
function migrateTreasureMap(old) {
  let records = emptyMapRecords();
  const count = Math.min(4, old?.pieces ?? 0);
  if (count === 0) return records;
  const clueSites = TREASURE_SITES.filter(([x, y]) => nearestTriggerTown(townTriggers(), x, y) === old.clueTownIndex);
  const sites = clueSites.length ? clueSites : TREASURE_SITES;
  records = giveMapPiece({
    records, kind: MAP_KIND.BURIED, sites,
    nearestTown: (x, y) => nearestTriggerTown(townTriggers(), x, y),
    currentTownIndex: null, difficulty: 1, rng: createRng(state.seed ^ 0x3a9),
  });
  records[MAP_KIND.BURIED].pieces = (1 << count) - 1;
  return records;
}

const TREASURE_MAP_TITLES = ['Pirate treasure map', 'Map to lost relative', 'Map to lost treasure'];

function treasureMapTitle(kind) {
  const record = state.treasureMaps[kind];
  if (kind === MAP_KIND.RELATIVE) return `Map to lost ${RELATIVE_NAMES[state.relativesRescued] ?? 'relative'}`;
  if (kind === MAP_KIND.LOST_CITY) return `Map to lost ${LOST_CITY_NAMES[record.city] ?? ''} treasure`;
  return TREASURE_MAP_TITLES[kind];
}

// The map view (0x29ECE) is render-only and the port draws its own: the
// terrain classes around the site, one quarter per piece. ASSUMED: piece
// bits 1, 2, 4, 8 are the NW, NE, SW and SE quarters, and the site lies
// where they meet.
const TREASURE_MAP_HALF_CELLS = 10;

function treasureMapImage(record) {
  const size = TREASURE_MAP_HALF_CELLS * 2 * 16;
  const image = document.createElement('canvas');
  image.width = size;
  image.height = size;
  const context = image.getContext('2d');
  const pixels = context.createImageData(size, size);
  const [siteX, siteY] = record.site;
  const left = siteX + .5 - TREASURE_MAP_HALF_CELLS;
  const top = siteY + .5 - TREASURE_MAP_HALF_CELLS;
  const colours = { [PIXEL.WATER]: [118, 150, 150], [PIXEL.SHALLOW]: [168, 190, 172], [PIXEL.LAND]: [196, 160, 104] };
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const quarter = (px < size / 2 ? 0 : 1) + (py < size / 2 ? 0 : 2);
      const owned = record.pieces & (1 << quarter);
      const offset = (py * size + px) * 4;
      const [r, g, b] = owned
        ? colours[pixelClassAt(worldMap, left + (px + .5) / 16, top + (py + .5) / 16)]
        : ((px >> 3) + (py >> 3)) & 1 ? [92, 72, 50] : [80, 62, 44];
      pixels.data.set([r, g, b, 255], offset);
    }
  }
  context.putImageData(pixels, 0, 0);
  context.strokeStyle = '#3d2410';
  context.lineWidth = 2;
  context.strokeRect(1, 1, size - 2, size - 2);
  if (record.pieces) {
    // The cross marks the dig site; a cache lies within one cell of it.
    const centre = size / 2;
    context.strokeStyle = '#8b1a10';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(centre - 9, centre - 9); context.lineTo(centre + 9, centre + 9);
    context.moveTo(centre + 9, centre - 9); context.lineTo(centre - 9, centre + 9);
    context.stroke();
  }
  return image.toDataURL();
}

function treasureMapBody(kind) {
  const record = state.treasureMaps[kind];
  const town = state.towns[record.townIndex];
  const count = mapPieceCount(record);
  const missing = ['north-west', 'north-east', 'south-west', 'south-east'].filter((_, bit) => !(record.pieces & (1 << bit)));
  const alt = `${treasureMapTitle(kind)}: ${count} of 4 pieces, showing the land around a cross marked somewhere near ${town.name}${missing.length ? `; the ${missing.join(', ')} quarter${missing.length === 1 ? ' is' : 's are'} missing` : ''}.`;
  return `<figure class="treasure-map"><img src="${treasureMapImage(record)}" alt="${alt}" width="320" height="320"><figcaption>Somewhere near ${town.name}</figcaption></figure><p>Land the party, walk to the cross and dig (<kbd>S</kbd>). Any piece is enough to dig; more pieces only show more of the land around the cache.</p>`;
}

// The Captain's Cabin "Treasure maps" item (0x29ECE for each record), offered
// from the tavern, the search prompt and the M key.
function showTreasureMaps(back, index = 0) {
  const kinds = [MAP_KIND.BURIED, MAP_KIND.RELATIVE, MAP_KIND.LOST_CITY].filter((kind) => state.treasureMaps[kind].pieces);
  if (!kinds.length) { back(); return; }
  const kind = kinds[index % kinds.length];
  const actions = [];
  if (kinds.length > 1) actions.push({ label: 'Next map', run: () => showTreasureMaps(back, index + 1) });
  actions.push({ label: 'Done', secondary: true, run: back });
  state.paused = true;
  showDialog({ kicker: 'Treasure maps', title: treasureMapTitle(kind), body: treasureMapBody(kind), actions });
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
  if (market?.bought) {
    const tons = (amount) => `${amount} ton${amount === 1 ? '' : 's'}`;
    const label = (kind) => (kind === 'specialGoods' ? specialGoodsName().toLowerCase() : kind);
    const trades = ['food', 'goods', 'specialGoods'].flatMap((kind) => [
      market.bought[kind] > 0 ? `bought ${tons(market.bought[kind])} of ${label(kind)}` : '',
      market.sold[kind] > 0 ? `sold ${tons(market.sold[kind])} of ${label(kind)}` : '',
    ]).filter(Boolean);
    if (trades.length) addLog(`At the ${town.name} merchant: ${trades.join(', ')}.`);
  }
  state.visit.merchant = null;
  showTownMenu();
}

function showMerchant(preferredTransfer = '', preferredKind = '') {
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
  market.bought ??= { food: 0, goods: 0, specialGoods: 0 };
  market.sold ??= { food: 0, goods: 0, specialGoods: 0 };
  const room = cargoRoom();
  const rows = ['food', 'goods', 'specialGoods'].map((kind) => {
    const price = market.prices[kind];
    const aboard = kind === 'food' ? Math.floor(state.player.foodFixed / 256) : state.player[kind];
    const label = kind === 'specialGoods' ? specialGoodsName() : kind === 'food' ? 'Food' : 'Goods';
    return {
      kind, label, aboard, price, stock: market.stocks[kind],
      unit: `ton of ${label.toLowerCase()}`,
      buyMaximum: Math.min(market.stocks[kind], room, Math.floor(state.player.partyGold / price)),
      sellMaximum: Math.min(aboard, Math.floor(market.cash / price)),
    };
  });
  const rowMarkup = rows.map(row => `<tr>
      <th scope="row">${row.label}</th>
      <td><div class="plunder-cell"><button type="button" class="plunder-arrow" data-transfer="buy" data-kind="${row.kind}" aria-label="Buy one ${row.unit}" title="Buy one ${row.unit}"${row.buyMaximum === 0 ? ' disabled' : ''}>←</button><strong>${row.aboard}</strong><button type="button" class="plunder-take-all" data-transfer="sell-all" data-kind="${row.kind}"${row.sellMaximum === 0 ? ' disabled' : ''}>Sell all</button></div></td>
      <td class="merchant-price">${row.price}</td>
      <td><div class="plunder-cell plunder-source"><strong>${row.stock}</strong><button type="button" class="plunder-arrow" data-transfer="sell" data-kind="${row.kind}" aria-label="Sell one ${row.unit}" title="Sell one ${row.unit}"${row.sellMaximum === 0 ? ' disabled' : ''}>→</button><button type="button" class="plunder-take-all" data-transfer="buy-max" data-kind="${row.kind}"${row.buyMaximum === 0 ? ' disabled' : ''}>Buy max</button></div></td>
    </tr>`).join('');
  showDialog({
    kicker: `The merchant · ${town.name}`, title: 'Buy or sell by the ton',
    body: `<p>Prices are per ton. Use the arrows to trade one ton at a time, and hold an arrow to keep trading.</p>
      <dl class="plunder-summary"><dt>Your gold</dt><dd>${state.player.partyGold}</dd><dt>Merchant cash</dt><dd>${market.cash}</dd><dt>Free hold</dt><dd>${room} tons</dd></dl>
      <table class="plunder-manifest merchant-manifest">
        <thead><tr><th>Type</th><th>Our fleet</th><th>Price</th><th>Merchant</th></tr></thead>
        <tbody>${rowMarkup}</tbody>
      </table>`,
    actions: [{ label: 'Return to town', secondary: true, run: finishMerchantVisit }],
  });
  const applyTrade = (transfer, kind) => {
    const all = Number.MAX_SAFE_INTEGER;
    const moved = {
      buy: () => tradeWithMerchant(kind, 1, 1),
      'buy-max': () => tradeWithMerchant(kind, 1, all),
      sell: () => tradeWithMerchant(kind, -1, 1),
      'sell-all': () => tradeWithMerchant(kind, -1, all),
    }[transfer]();
    if (moved > 0) showMerchant(transfer, kind);
    return moved;
  };
  bindTransferButtons(applyTrade, { repeatable: ['buy', 'sell'], preferredTransfer, preferredKind, defaultTransfer: 'buy' });
}

// Moves up to `requested` tons and returns how many moved. The log line is
// written once, when the captain leaves the merchant.
function tradeWithMerchant(kind, direction, requested) {
  const market = state.visit.merchant;
  const price = market.prices[kind];
  const aboard = kind === 'food' ? Math.floor(state.player.foodFixed / 256) : state.player[kind];
  const amount = direction > 0
    ? Math.min(requested, market.stocks[kind], cargoRoom(), Math.floor(state.player.partyGold / price))
    : Math.min(requested, aboard, Math.floor(market.cash / price));
  if (amount <= 0) return 0;
  const delta = direction * amount;
  if (kind === 'food') state.player.foodFixed += delta * 256;
  else state.player[kind] += delta;
  market.stocks[kind] -= delta;
  state.player.partyGold -= delta * price;
  market.cash += delta * price;
  state.portTrade.merchantCash = market.cash;
  market[direction > 0 ? 'bought' : 'sold'][kind] += amount;
  return amount;
}

// 0x17EFB, which the town loop runs as you leave (0x1DA91): first the crew
// desertion, then a prisoner may jump overboard (CSTR 110), then the fleet
// check while still in the town (0x180B0, 0x47ACA bit 1 set), so too few men
// for the last ship means prison (CSTR 175), then the departure (0x19B9E).
function leaveTown() {
  const player = state.player;
  const desertion = portDesertion({ crew: player.crew, partyGold: player.partyGold, morale: player.crewMorale });
  if (desertion) {
    Object.assign(player, { crew: desertion.crew, partyGold: desertion.partyGold });
    const town = state.towns[state.visit.townIndex];
    addLog(`${desertion.deserters} crewmen deserted at ${town.name} with ${desertion.goldLost} gold.`);
    showDialog({
      kicker: 'Roll call', title: 'Deserters',
      body: `<p>Roll call reveals that ${desertion.deserters} crew members have deserted.</p>`,
      actions: [{ label: 'Continue', run: releasePrisonerOverboard }],
    });
    return;
  }
  releasePrisonerOverboard();
}

function releasePrisonerOverboard() {
  const slot = prisonerEscape({ captives: state.player.capturedCaptains, rng });
  if (slot >= 0) {
    const [captive] = state.player.capturedCaptains.splice(slot, 1);
    const who = captive.name ?? `The ${captive.nation ?? 'captured'} captain`;
    addLog(`${who} jumped overboard and escaped.`);
    showDialog({
      kicker: 'A prisoner escapes', title: 'Man overboard',
      body: `<p>${who} jumps overboard and escapes!</p>`,
      actions: [{ label: 'Put to sea', run: departureFleetCheck }],
    });
    return;
  }
  departureFleetCheck();
}

function departureFleetCheck() {
  runFleetCheck({ inTown: true, done: putToSea });
}

function putToSea() {
  const town = state.towns[state.visit.townIndex];
  placeForDeparture(state.visit.townIndex, state.visit.overland);
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

// An action's optional `key` is a one-letter keyboard shortcut, such as the
// original's Y/N for "Disembark".
let dialogShortcuts = new Map();

function showDialog({ kicker, title, body, actions }) {
  if (dialog.open) dialog.close();
  dialogShortcuts = new Map();
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
    if (action.key) dialogShortcuts.set(action.key, button);
    dialogActions.append(button);
  });
  dialog.showModal();
  // Long dialogs (the ship's log, the gazetteer) open at the top.
  dialogActions.querySelector('button')?.focus({ preventScroll: true });
  dialog.scrollTop = 0;
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
  return ['struggling', 'surviving', 'prospering', 'wealthy'][prosperityLevel(growth)];
}

function setControl(button, icon, label, ariaLabel) {
  if (button.dataset.label === label) return;
  button.dataset.label = label;
  button.firstChild.textContent = icon;
  button.querySelector('span').textContent = label;
  button.setAttribute('aria-label', ariaLabel);
}

function updateInterface() {
  if (!state) return;
  const player = state.player;
  const inBattle = state.mode === 'battle' && state.battle;
  const onFoot = !inBattle && player.onFoot;
  if (inBattle) setControl(dockButton, '● ', 'Fire', 'Fire loaded broadside');
  else if (onFoot) setControl(dockButton, '⛏ ', 'Dig', 'Search for treasure here');
  else setControl(dockButton, '✉ ', 'Maps', 'Study your treasure maps');
  // On foot the four steering buttons walk the party (0x1B210).
  setControl(turnLeftButton, onFoot ? '← ' : '↶ ', onFoot ? 'West' : 'Port', onFoot ? 'Walk west' : 'Turn to port');
  setControl(turnRightButton, onFoot ? '→ ' : '↷ ', onFoot ? 'East' : 'Starboard', onFoot ? 'Walk east' : 'Turn to starboard');
  setControl(lowerSailsButton, '↓ ', onFoot ? 'South' : 'Sails', onFoot ? 'Walk south' : 'Lower sails');
  setControl(raiseSailsButton, '↑ ', onFoot ? 'North' : 'Sails', onFoot ? 'Walk north' : 'Raise sails');
  controls.setAttribute('aria-label', onFoot ? 'Landing party controls' : 'Sailing controls');
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
    const guns = broadsideState(battle.player);
    labels.gold.textContent = guns.label;
    labels.nearest.textContent = `${battle.enemy.men} crew · ${battle.enemy.guns} guns`;
    dockButton.disabled = state.paused || !guns.ready;
    logbookButton.disabled = true;
    return;
  }
  const town = nearestTown();
  const distance = nearestTownDistance();
  labels.captain.textContent = `Captain ${state.captain} · ${state.nationality}`;
  labels.date.textContent = formatDate(state.calendar);
  labels.speed.textContent = onFoot ? (player.blockedByWater ? '⚠ Blocked' : `On foot · 2 cells/day${fastTravel ? ' · fast' : ''}`) : `${player.speed.toFixed(1)} cells/day${fastTravel ? ' · fast' : ''}`;
  labels.wind.textContent = WIND_NAMES[(player.wind >> 4) & 15];
  labels.sails.previousElementSibling.textContent = onFoot ? 'Boat' : 'Sails';
  labels.sails.textContent = onFoot ? boatBearing() : { furled: 'Closed', battle: 'Low', full: 'High' }[player.sails];
  labels.food.textContent = `${foodDays(player.foodFixed, player.crew)} days`;
  labels.crew.textContent = player.crew.toLocaleString();
  labels.gold.textContent = player.partyGold.toLocaleString();
  labels.nearest.textContent = `${town.name} · ${distance}`;
  dockButton.disabled = state.paused || state.mode !== 'sailing' || (!onFoot && !state.treasureMaps.some(({ pieces }) => pieces));
  zoomOutButton.disabled = false;
  zoomInButton.disabled = false;
  logbookButton.disabled = state.mode !== 'sailing';
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
    drawTerrainChunks(camera, visibleWidth, visibleHeight);
  } else {
    drawSeaTexture(camera, visibleWidth, visibleHeight);
    drawLand();
  }
  drawClouds(zoom, playerPose, clouds);
  drawTowns(zoom);
  if (state.player.onFoot && state.player.ship) {
    drawShip(zoom, { ...state.player.ship, sails: 'furled' });
    drawLandingSpot(zoom, state.player.landing);
    drawParty(zoom, playerPose);
  } else {
    drawShip(zoom, playerPose);
  }
  ctx.restore();
  drawMinimap(width, height, camera, zoom, playerPose);
  if (state.player.onFoot && state.player.blockedByWater && !state.paused) drawBlockedWarning(width);
  if (state.paused && state.mode === 'sailing' && !dialog.open) drawPaused(width, height, 'Voyage paused');
}

// Clouds keep one screen size at every zoom; their shadow falls 30 screen
// pixels to the south-west, as before.
const cloudSpriteCache = new Map();
const CLOUD_SHADOW_OFFSET = { x: -30, y: 30 };

function drawClouds(zoom, playerPose, clouds) {
  const scale = CLOUD_ART_PIXEL * devicePixelScale();
  for (const cloud of clouds) {
    const opacity = cloudWrapOpacity(cloud, playerPose.x, playerPose.y);
    if (opacity <= 0) continue;
    const shadow = cachedSprite(cloudSpriteCache, `${cloud.shape}|shadow`, () => paintCloudSprite(cloud.shape, { shadow: true }));
    const body = cachedSprite(cloudSpriteCache, `${cloud.shape}`, () => paintCloudSprite(cloud.shape));
    if (!shadow || !body) continue;
    ctx.save();
    ctx.globalAlpha = opacity * .3;
    drawPixelSprite(ctx, shadow, cloud.x + CLOUD_SHADOW_OFFSET.x / zoom, cloud.y + CLOUD_SHADOW_OFFSET.y / zoom, scale);
    ctx.globalAlpha = opacity * .95;
    drawPixelSprite(ctx, body, cloud.x, cloud.y, scale);
    ctx.restore();
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

// Town markers are sized in screen pixels: each art pixel covers 2 screen
// pixels, stepping up to 3 and 4 as the map zooms in so the town keeps pace
// with the terrain without breaking the pixel grid. Labels stay one size.
const townSpriteScale = (zoom) => (zoom >= 48 ? 4 : zoom >= 28 ? 3 : 2);
const TOWN_LABEL_GAP = 14;
const townSpriteCache = new Map();

function drawTowns(zoom) {
  ctx.textBaseline = 'middle';
  ctx.font = `${16 / zoom}px "IM Fell English", Georgia, serif`;
  for (const town of state.towns) {
    const markerX = town.x + .5;
    const markerY = town.y + .5;
    const spriteScale = townSpriteScale(zoom);
    drawTownSprite(town, markerX, markerY, spriteScale);
    const labelX = markerX + (TOWN_LABEL_GAP * spriteScale) / zoom;
    const labelY = markerY - (3 * spriteScale) / zoom;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3 / zoom; ctx.strokeStyle = 'rgba(4,15,17,.8)'; ctx.strokeText(town.name, labelX, labelY);
    ctx.fillStyle = '#fff1c8'; ctx.fillText(town.name, labelX, labelY);
  }
}

function townSprite(town) {
  const prosperity = prosperityLevel(town.growth);
  const forts = Math.min(town.forts, 4);
  return cachedSprite(townSpriteCache, `${town.nation}|${prosperity}|${forts}`, () => ({
    pixels: paintTownSprite({ nation: { key: town.nation, ...NATIONS[town.nation] }, prosperity, forts }),
    width: TOWN_SPRITE_WIDTH, height: TOWN_SPRITE_HEIGHT, anchor: TOWN_SPRITE_ANCHOR,
  }));
}

function drawTownSprite(town, x, y, spriteScale) {
  const sprite = townSprite(town);
  if (sprite) drawPixelSprite(ctx, sprite, x, y, spriteScale * devicePixelScale());
}

// The flagship as a pixel-art sprite at the towns' scale, one per heading
// sector, sail state and wind (for the flag).
const shipSpriteCache = new Map();

function drawShip(zoom, player) {
  const type = statsFor(state.player.ships[0]).type;
  const key = NATIONS[state.nationality] ? state.nationality : 'pirate';
  const sector = headingSector(player.heading);
  const windSector = headingSector(state.player.wind);
  const sprite = cachedSprite(shipSpriteCache, `${type}|${sector}|${player.sails}|${key}|${windSector}`, () => paintShipSprite({
    type, heading: sector * 16, sails: player.sails, nation: { key, ...NATIONS[key] }, wind: windSector * 16,
  }));
  if (sprite) drawPixelSprite(ctx, sprite, player.x, player.y, townSpriteScale(zoom) * devicePixelScale());
}

// The rowboat marks the landing spot: walking into the water within reach
// of it (dashed ring, REBOARD_REACH_CELLS) re-boards the party.
function drawLandingSpot(zoom, landing) {
  ctx.save();
  ctx.translate(landing.x, landing.y);
  ctx.strokeStyle = 'rgba(243,229,197,.75)';
  ctx.lineWidth = 1.5 / zoom;
  ctx.setLineDash([3 / zoom, 3 / zoom]);
  ctx.beginPath(); ctx.arc(0, 0, REBOARD_REACH_CELLS, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.scale(1.6 / zoom, 1.6 / zoom);
  ctx.fillStyle = '#6b3f22'; ctx.strokeStyle = '#29170e'; ctx.lineWidth = .8;
  ctx.beginPath(); ctx.moveTo(-4, -1.2); ctx.lineTo(4, -1.2); ctx.lineTo(2.6, 1.8); ctx.lineTo(-2.6, 1.8); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// Original placeholder for the landing party: two walkers and a pennant in
// the captain's colours, bobbing with the walk cycle ((tick >> 2) & 3).
function drawParty(zoom, pose) {
  const step = (state.tick >> 2) & 3;
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.scale(2.3 / zoom, 2.3 / zoom);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 3.6, 4.6, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  for (const [offsetX, phase] of [[-1.8, 0], [1.8, 2]]) {
    const bob = ((step + phase) & 3) < 2 ? 0 : -.5;
    ctx.fillStyle = '#5c321b'; ctx.fillRect(offsetX - 1, -1.5 + bob, 2, 3.6);
    ctx.fillStyle = '#e2c49a'; ctx.beginPath(); ctx.arc(offsetX, -2.7 + bob, 1.1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = '#2b2116'; ctx.lineWidth = .6;
  ctx.beginPath(); ctx.moveTo(3.4, 3); ctx.lineTo(3.4, -6); ctx.stroke();
  ctx.fillStyle = NATIONS[state.nationality]?.color ?? NATIONS.pirate.color;
  ctx.beginPath(); ctx.moveTo(3.5, -6); ctx.lineTo(6.6, -5); ctx.lineTo(3.5, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
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

// The faithful rule (landing_and_overland.md §3) burns half a day for every
// tick the party pushes into water away from its boat, so say so plainly
// for as long as it lasts, in words as well as colour.
function drawBlockedWarning(width) {
  const lines = ['⚠ Water blocks the party: half a day passes every step.', 'Turn inland, or walk back into the water at the rowboat.'];
  const compact = width <= 760;
  ctx.save();
  ctx.font = `${compact ? 14 : 17}px "Source Sans 3", sans-serif`;
  ctx.textAlign = 'center';
  const boxWidth = Math.min(width - 24, Math.max(...lines.map((line) => ctx.measureText(line).width)) + 32);
  const lineHeight = compact ? 19 : 23;
  const top = compact ? 150 : 92;
  ctx.fillStyle = 'rgba(58,16,10,.88)'; ctx.fillRect((width - boxWidth) / 2, top, boxWidth, lineHeight * 2 + 16);
  ctx.strokeStyle = '#f0c36a'; ctx.lineWidth = 2; ctx.strokeRect((width - boxWidth) / 2, top, boxWidth, lineHeight * 2 + 16);
  ctx.fillStyle = '#fbe9c6';
  lines.forEach((line, index) => ctx.fillText(line, width / 2, top + 8 + lineHeight * (index + .8), boxWidth - 16));
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
logbookButton.addEventListener('click', openLogbookAtSea);
dockButton.addEventListener('click', () => {
  if (state?.mode === 'battle') input.firePressed = true;
  else if (state?.player.onFoot) showDigPrompt();
  else openTreasureMapsAtSea();
});
zoomOutButton.addEventListener('click', () => changeZoom(-ZOOM_STEP));
zoomInButton.addEventListener('click', () => changeZoom(ZOOM_STEP));
lowerSailsButton.addEventListener('click', () => changeSails(-1));
raiseSailsButton.addEventListener('click', () => changeSails(1));
dialog.addEventListener('cancel', (event) => event.preventDefault());
dialog.addEventListener('keydown', (event) => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  const button = dialogShortcuts.get(event.key.toLowerCase());
  if (!button) return;
  event.preventDefault();
  button.click();
});

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
  if (state.player.onFoot) {
    setWalk(delta > 0 ? { north: true } : { south: true });
    return;
  }
  const states = ['furled', 'battle', 'full'];
  const next = clamp(states.indexOf(state.player.sails) + delta, 0, states.length - 1);
  if (states[next] === state.player.sails) return;
  state.player.sails = states[next];
  addLog({ furled: 'The sails are closed.', battle: 'The sails are lowered.', full: 'The sails are raised high.' }[state.player.sails]);
}

// On foot a direction key replaces the walk vector, which persists until the
// next one: the party keeps walking (0x1B210 has no stop key). Two held
// arrows make a diagonal, like the original's diagonal keys. W, A and D walk
// too; S stays the original's search key, so south is the down arrow.
const walkKeys = { west: false, east: false, north: false, south: false };
const WALK_KEYS = {
  ArrowLeft: ['west'], ArrowRight: ['east'], ArrowUp: ['north'], ArrowDown: ['south'],
  Home: ['north', 'west'], PageUp: ['north', 'east'], End: ['south', 'west'], PageDown: ['south', 'east'],
  w: ['north'], a: ['west'], d: ['east'],
};
const walkKeyDirections = (event) => WALK_KEYS[event.key] ?? WALK_KEYS[event.key.toLowerCase()];

function onFootControls() {
  return state?.mode === 'sailing' && state.player.onFoot && !state.paused;
}

function setWalk(directions) {
  if (!onFootControls()) return;
  const vector = walkVectorForDirections(directions);
  if (vector) state.player.walk = vector;
}

function openTreasureMapsAtSea() {
  if (state?.mode !== 'sailing' || state.paused || dialog.open || !state.treasureMaps.some(({ pieces }) => pieces)) return;
  showTreasureMaps(continueVoyage);
}

for (const button of document.querySelectorAll('[data-hold]')) {
  const direction = button.dataset.hold;
  const walkDirection = direction === 'left' ? 'west' : 'east';
  const press = (event) => {
    event.preventDefault();
    if (state?.player.onFoot) {
      walkKeys[walkDirection] = true;
      setWalk(walkKeys);
    } else input[direction] = true;
  };
  const release = (event) => {
    event.preventDefault();
    walkKeys[walkDirection] = false;
    input[direction] = false;
  };
  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('pointerleave', release);
}

addEventListener('keydown', (event) => {
  if (dialog.open) return;
  const key = event.key.toLowerCase();
  if (state?.player.onFoot && state.mode === 'sailing') {
    const directions = walkKeyDirections(event);
    if (directions) {
      for (const direction of directions) walkKeys[direction] = true;
      setWalk(directions.length === 2 ? Object.fromEntries(directions.map((direction) => [direction, true])) : walkKeys);
      event.preventDefault();
    }
    if (key === 's' && !event.repeat && !state.paused) showDigPrompt();
  } else {
    if (event.key === 'ArrowLeft' || key === 'a') input.left = true;
    if (event.key === 'ArrowRight' || key === 'd') input.right = true;
    if (event.key === 'ArrowUp' && !event.repeat) changeSails(1);
    if (event.key === 'ArrowDown' && !event.repeat) changeSails(-1);
  }
  if (event.key === ' ' && !event.repeat) {
    if (state?.mode === 'battle' && !state.paused) input.firePressed = true;
    else togglePause();
  }
  if ((event.key === 'Escape' || key === 'p') && !event.repeat) togglePause();
  if (key === 'm' && !event.repeat) openTreasureMapsAtSea();
  if (key === 't' && !event.repeat && state?.mode === 'sailing') {
    fastTravel = !fastTravel;
    addLog(fastTravel ? 'Fast travel: time runs five times faster.' : 'Fast travel off.');
  }
  if (key === 'l' && !event.repeat) openLogbookAtSea();
  if (event.key === '+' || event.key === '=') changeZoom(ZOOM_STEP);
  if (event.key === '-' || event.key === '_') changeZoom(-ZOOM_STEP);
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Escape'].includes(event.key)) event.preventDefault();
});
addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') input.left = false;
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') input.right = false;
  for (const direction of walkKeyDirections(event) ?? []) walkKeys[direction] = false;
});
addEventListener('blur', () => {
  input.left = false;
  input.right = false;
  Object.keys(walkKeys).forEach((direction) => { walkKeys[direction] = false; });
});
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
    while (accumulator >= tickSeconds()) { stepSimulation(); accumulator -= tickSeconds(); }
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
  // Local previews expose the live state to the browser smoke checks.
  if (preview && ['localhost', '127.0.0.1'].includes(location.hostname)) {
    globalThis.piratesPreview = { get state() { return state; } };
  }
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
  if (preview === 'merchant' && ['localhost', '127.0.0.1'].includes(location.hostname)) {
    const previewState = newState({ era: '1680', captain: 'Preview', nationality: 'France', difficulty: 1, ability: 'navigation' });
    startGame(previewState).then(() => {
      state.nearestTownIndex = state.towns.findIndex(({ name }) => name === 'Guadeloupe');
      state.player.partyGold = 5000;
      state.mode = 'town';
      state.paused = true;
      state.visit = { townIndex: state.nearestTownIndex, sneaking: false, recruited: false, merchant: null };
      openMerchant();
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
  if (preview === 'town-rank' && ['localhost', '127.0.0.1'].includes(location.hostname)) {
    const previewState = newState({ era: '1680', captain: 'Preview', nationality: 'France', difficulty: 1, ability: 'navigation' });
    startGame(previewState).then(() => {
      state.nearestTownIndex = state.towns.findIndex(({ name }) => name === 'Guadeloupe');
      state.player.ranks.France = 1;
      state.player.favour.France = 3;
      state.player.land = 3;
      state.mode = 'town';
      state.paused = true;
      state.visit = { townIndex: state.nearestTownIndex, sneaking: false, recruited: false, merchant: null };
      showTownMenu();
    });
    return;
  }
  if (preview === 'governor-amnesty' && ['localhost', '127.0.0.1'].includes(location.hostname)) {
    const previewState = newState({ era: '1680', captain: 'Preview', nationality: 'France', difficulty: 1, ability: 'navigation' });
    startGame(previewState).then(() => {
      state.nearestTownIndex = state.towns.findIndex(({ name }) => name === 'Guadeloupe');
      state.player.favour.France = -3;
      state.player.partyGold = 7000;
      state.towns[state.nearestTownIndex].mood = -3;
      state.mode = 'town';
      state.paused = true;
      state.visit = { townIndex: state.nearestTownIndex, sneaking: true, recruited: false, merchant: null };
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
  if (preview === 'logbook' && ['localhost', '127.0.0.1'].includes(location.hostname)) {
    // A Swashbuckler year of the monthly world, then the logbook at sea.
    const previewState = newState({ era: '1660', captain: 'Preview', nationality: 'England', difficulty: 3, ability: 'navigation' });
    startGame(previewState).then(() => {
      passDays(360);
      updateInterface();
      openLogbookAtSea();
    });
    return;
  }
  if (['arrival', 'deserters'].includes(preview) && ['localhost', '127.0.0.1'].includes(location.hostname)) {
    // Havana 1560: the coast cell (244, 178) south of the ship is a trigger cell.
    const previewState = newState({ era: '1560', captain: 'Preview', nationality: 'France', difficulty: 1, ability: 'navigation' });
    Object.assign(previewState.player, { x: 244.5, y: 176.5, heading: 128, speed: 12 });
    // Deserters: one ship, 8 men and morale -2, so leaving Havana costs 2
    // men and the departure fleet check sends the captain to prison.
    if (preview === 'deserters') {
      Object.assign(previewState.player, { crew: 8, partyGold: 0, monthsAtSea: 5 });
      previewState.player.ships = previewState.player.ships.slice(0, 1);
    }
    startGame(previewState);
    return;
  }
  if (preview === 'treasure-fleet' && ['localhost', '127.0.0.1'].includes(location.hostname)) {
    // Both convoys lie in Campeche 1560, stop 13 of each route; the ship
    // waits on the town's departure cell and opens the approach.
    const previewState = newState({ era: '1560', captain: 'Preview', nationality: 'France', difficulty: 1, ability: 'navigation' });
    const campeche = previewState.towns.findIndex((town) => town.name === 'Campeche');
    previewState.convoys = { treasureFleet: { position: 13, townIndex: campeche }, silverTrain: { position: 13, townIndex: campeche } };
    const [x, y, heading] = scenarios['1560'].towns[campeche].departure;
    Object.assign(previewState.player, { x: x + 0.5, y: y + 0.5, heading, speed: 0, sails: 'furled' });
    startGame(previewState).then(() => {
      state.nearestTownIndex = campeche;
      approachTown();
    });
    return;
  }
  if (preview === 'landing' && ['localhost', '127.0.0.1'].includes(location.hostname)) {
    // Panama 1560 is inland: the ship sails north onto the coast at (318, 441),
    // two cells east of the town's trigger cells.
    const previewState = newState({ era: '1560', captain: 'Preview', nationality: 'France', difficulty: 1, ability: 'navigation' });
    Object.assign(previewState.player, { x: 318.5, y: 443.5, heading: 0, speed: 8, sails: 'full' });
    startGame(previewState);
    return;
  }
  if (preview === 'dig' && ['localhost', '127.0.0.1'].includes(location.hostname)) {
    // A party ashore on the first dig site (259, 192 in Cuba) holding three
    // pieces of its buried-treasure map; the ship waits at the nearest water.
    const previewState = newState({ era: '1560', captain: 'Preview', nationality: 'France', difficulty: 1, ability: 'navigation' });
    const [siteX, siteY] = TREASURE_SITES[0];
    Object.assign(previewState.player, { x: siteX + .5, y: siteY + .5 });
    startGame(previewState).then(() => {
      const player = state.player;
      const shore = { x: player.x, y: player.y };
      Object.assign(player, { ship: { ...shore, heading: player.heading }, landing: shore, onFoot: true, walk: null, x: siteX + .5, y: siteY + .5 });
      state.treasureMaps[MAP_KIND.BURIED] = { pieces: 7, site: [siteX, siteY], townIndex: nearestTriggerTown(townTriggers(), siteX, siteY), city: 0 };
      updateNearestTown();
      resetSailingInterpolation();
    });
    return;
  }
  if (preview === 'reef' && ['localhost', '127.0.0.1'].includes(location.hostname)) {
    // A frigate and a sloop sailing east over a run of shallow pixels in the
    // reefs at (192, 288), 1560.
    const previewState = newState({ era: '1560', captain: 'Preview', nationality: 'France', difficulty: 1, ability: 'navigation' });
    Object.assign(previewState.player, { x: 3079.5 / 16, y: 4607.5 / 16, heading: 64, speed: 4, sails: 'battle', crew: 300 });
    previewState.player.ships = [shipRecord('Frigate'), shipRecord('Sloop')];
    startGame(previewState);
    return;
  }
  if (preview === 'battle' && ['localhost', '127.0.0.1'].includes(location.hostname)) {
    // A sea battle against a Spanish Merchantman, for checking the battle
    // screen and its pace.
    const previewState = newState({ era: '1680', captain: 'Preview', nationality: 'France', difficulty: 1, ability: 'navigation' });
    startGame(previewState).then(() => {
      beginTacticalBattle({ ship: 'Merchantman', flag: 'Spain', crew: 20, guns: 12, kind: 5, gold: 10, cargo: 10 }, 0);
    });
    return;
  }
  if (preview === 'shipwreck' && ['localhost', '127.0.0.1'].includes(location.hostname)) {
    // Four men cannot sail the last ship: the fleet check takes the at-sea
    // last-ship path to the uncharted island.
    const previewState = newState({ era: '1560', captain: 'Preview', nationality: 'France', difficulty: 2, ability: 'navigation' });
    Object.assign(previewState.player, { crew: 4, reputation: 2, capturedCaptains: [{ pirate: true, ship: 'Sloop', value: 7 }] });
    previewState.player.ships = previewState.player.ships.slice(0, 1);
    startGame(previewState);
    return;
  }
  continueButton.classList.toggle('hidden', !loadGame());
}).catch((error) => {
  console.error('Scenario data unavailable:', error);
  beginButton.textContent = 'Scenario data failed to load';
});
requestAnimationFrame(frame);
