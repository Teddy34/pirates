export const TICKS_PER_DAY = 64;
export const TICKS_PER_HALF_DAY = 32;
export const TICKS_PER_WIND_SHIFT = 128;
export const SAILING_PIXELS_PER_CELL = 16;

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function createRng(seed = 0x50a7e5) {
  let state = seed >>> 0 || 1;
  return {
    int(limit) {
      if (limit <= 0) return 0;
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) % Math.floor(limit);
    },
    unit() {
      return this.int(0x80000000) / 0x80000000;
    },
    get state() {
      return state >>> 0;
    },
    set state(value) {
      state = value >>> 0 || 1;
    },
  };
}

export function relativeHeadingSector(heading, wind) {
  return ((heading + 8 - wind) >> 4) & 15;
}

export function navigationSkill(difficulty, hasNavigation) {
  return clamp(difficulty - (hasNavigation ? 1 : 0), 0, 4);
}

export function approximateDistance(x, y) {
  const major = Math.max(Math.abs(x), Math.abs(y));
  const minor = Math.min(Math.abs(x), Math.abs(y));
  return major + Math.floor(minor / 2);
}

export function targetSailingSpeed({
  heading, wind, speedRow, difficulty, hasNavigation, cloudDistancePixels = Infinity,
}) {
  const relative = relativeHeadingSector(heading, wind);
  const skill = navigationSkill(difficulty, hasNavigation);
  let target = 3 * (speedRow[relative] + Math.floor((5 - skill) / 2));
  if (cloudDistancePixels < 100) target *= 2;
  if (cloudDistancePixels < 64 * skill) target = Math.floor(target / 2);
  return target;
}

export function cloudCountForMonth(month) {
  return Math.min(3, Math.floor((Math.abs(month - 5) + 1) / 2));
}

export function turnHeadingDownwind(heading, wind) {
  const difference = ((wind - heading + 128) & 0xff) - 128;
  if (difference === 0) return heading;
  return (heading + Math.sign(difference) * 16) & 0xff;
}

export function createVoyageClouds({ count, playerX, playerY, rng }) {
  const shape = [0, 1, 2, 0][rng.int(4)];
  // The setup routine's initial coordinates are not yet decoded. Distributing
  // them over the documented 640 x 480 sailing view is the smallest playable
  // interpretation; wrapping and drift follow the confirmed rules.
  return Array.from({ length: count }, (_, index) => ({
    x: playerX + (rng.unit() * 2 - 1) * (320 / SAILING_PIXELS_PER_CELL),
    y: playerY + (rng.unit() * 2 - 1) * (240 / SAILING_PIXELS_PER_CELL),
    shape,
    index,
  }));
}

export function driftClouds({ clouds, playerX, playerY, playerDeltaX = 0, playerDeltaY = 0, wind, rng }) {
  const angle = wind / 256 * Math.PI * 2;
  const halfWidth = 320 / SAILING_PIXELS_PER_CELL;
  const halfHeight = 240 / SAILING_PIXELS_PER_CELL;
  return clouds.map((cloud) => {
    const pixelsPerTick = (4 * cloud.index + 6) * 2 / 8;
    let x = cloud.x + Math.sin(angle) * pixelsPerTick / SAILING_PIXELS_PER_CELL;
    let y = cloud.y - Math.cos(angle) * pixelsPerTick / SAILING_PIXELS_PER_CELL;
    if (Math.abs(x - playerX) > halfWidth || Math.abs(y - playerY) > halfHeight) {
      const cloudDeltaX = Math.sin(angle) * pixelsPerTick / SAILING_PIXELS_PER_CELL;
      const cloudDeltaY = -Math.cos(angle) * pixelsPerTick / SAILING_PIXELS_PER_CELL;
      const relativeDeltaX = cloudDeltaX - playerDeltaX;
      const relativeDeltaY = cloudDeltaY - playerDeltaY;
      // The original always uses the right edge. In a camera-centered browser
      // view, a faster ship can outrun the cloud and force it to wrap again
      // every tick. Use the upstream edge of the dominant relative movement
      // so the wrapped cloud travels into view instead.
      if (Math.abs(relativeDeltaX) >= Math.abs(relativeDeltaY)) {
        x = playerX + (relativeDeltaX > 0 ? -halfWidth : halfWidth);
        y = playerY + (rng.unit() * 2 - 1) * halfHeight;
      } else {
        x = playerX + (rng.unit() * 2 - 1) * halfWidth;
        y = playerY + (relativeDeltaY > 0 ? -halfHeight : halfHeight);
      }
    }
    return { ...cloud, x, y };
  });
}

export function nearestCloudDistancePixels(clouds, playerX, playerY) {
  return clouds.reduce((nearest, cloud) => {
    const dx = (cloud.x - playerX) * SAILING_PIXELS_PER_CELL;
    const dy = (cloud.y - playerY) * SAILING_PIXELS_PER_CELL;
    return Math.min(nearest, approximateDistance(dx, dy));
  }, Infinity);
}

export function cloudWrapOpacity(cloud, playerX, playerY) {
  const halfWidth = 320 / SAILING_PIXELS_PER_CELL;
  const halfHeight = 240 / SAILING_PIXELS_PER_CELL;
  const distanceToEdge = Math.min(
    halfWidth - Math.abs(cloud.x - playerX),
    halfHeight - Math.abs(cloud.y - playerY),
  );
  // The original wraps clouds at the edge of a fixed 640×480 view. Browser
  // zoom can expose both endpoints, so fade the sprite through that edge.
  return clamp(distanceToEdge / 4, 0, 1);
}

export function applyProvisionalBattleOutcome(player, enemy, outcome, shipStats) {
  const next = { ...player, ships: [...player.ships] };
  let message;
  if (outcome === 'captured') {
    next.ships.push(enemy.ship);
    next.reputation += 1;
    message = `Provisional victory: captured the ${enemy.flag} ${enemy.ship}.`;
  } else if (outcome === 'lost') {
    const casualties = Math.max(1, Math.floor(next.crew / 4));
    const ransom = Math.floor(next.partyGold / 10);
    next.crew = Math.max(1, next.crew - casualties);
    next.partyGold -= ransom;
    next.reputation -= 1;
    message = `Provisional defeat: lost ${casualties} crew and ${ransom} gold to the ${enemy.ship}.`;
  } else if (outcome === 'sunk') {
    const lostShip = next.ships.shift();
    // ASSUMED provisional recovery: until campaign-ending capture is built,
    // rescued lone-ship survivors receive a basic Pinnace.
    if (next.ships.length === 0) next.ships.push('Pinnace');
    const crewCapacity = next.ships.reduce((sum, ship) => sum + shipStats[ship].capacity, 0);
    const cargoCapacity = next.ships.reduce((sum, ship) => sum + shipStats[ship].cargo, 0);
    next.crew = Math.min(crewCapacity, Math.max(1, Math.floor(next.crew / 2)));
    next.cannon = Math.min(next.cannon, next.ships.reduce((sum, ship) => sum + shipStats[ship].guns, 0));
    const cargoAfterCannon = Math.max(0, cargoCapacity - Math.floor(next.cannon / 2));
    next.goods = Math.min(next.goods, cargoAfterCannon);
    next.specialGoods = Math.min(next.specialGoods ?? 0, Math.max(0, cargoAfterCannon - next.goods));
    next.foodFixed = Math.min(next.foodFixed, Math.max(0, cargoAfterCannon - next.goods - next.specialGoods) * 256);
    next.partyGold = Math.floor(next.partyGold / 2);
    message = `Provisional disaster: the ${lostShip} sank; ${next.crew} survivors continue the voyage.`;
  } else if (outcome === 'enemy-sunk') {
    next.reputation += 1;
    message = `Provisional victory: sank the ${enemy.flag} ${enemy.ship}.`;
  } else {
    message = `Provisional escape: broke away from the ${enemy.ship}.`;
  }
  return { player: next, message };
}

export function applyProvisionalBoardingOutcome(player, embarkedMen, outcome) {
  const next = { ...player };
  if (outcome === 'won') {
    return { player: next, casualties: 0, ransom: 0 };
  }
  next.reputation -= 2;
  if (outcome === 'driven-back') {
    return { player: next, casualties: 0, ransom: 0 };
  }
  // ASSUMED interim defeat: prison and ransom are not playable yet, so defeat
  // costs one quarter of the embarked crew and ten percent of party gold.
  const casualties = Math.min(next.crew - 1, Math.max(1, Math.floor(embarkedMen / 4)));
  const ransom = Math.floor(next.partyGold / 10);
  next.crew -= casualties;
  next.partyGold -= ransom;
  return { player: next, casualties, ransom };
}

function triangularCargoRoll(limit, rng) {
  const roll = rng.int(0x7fff);
  const squaredFixed = Math.floor((roll * roll) / 0x8000);
  return Math.floor((squaredFixed * limit) / 0x10000);
}

export function capturedShipPlunder({ enemy, nearbyTownGrowth, shipStats, rng }) {
  const goldRange = Math.floor((nearbyTownGrowth + 64) / 16) * enemy.gold;
  const gold = goldRange > 0 ? rng.int(goldRange) * 10 : 0;
  let food = enemy.crew;
  let firstGoods = triangularCargoRoll(enemy.cargo, rng);
  let secondGoods = triangularCargoRoll(enemy.cargo, rng);
  const cannon = enemy.guns;
  const prizeCapacity = shipStats[enemy.ship].cargo;

  // The aftermath routine cycles through cargo piles according to the running
  // excess total; it does not draw more random numbers here. Cannon occupy half
  // a ton apiece.
  let total = food + firstGoods + secondGoods + Math.floor(cannon / 2);
  while (total > prizeCapacity) {
    const category = total % 3;
    if (category === 0 && food > 0) food -= 1;
    if (category === 1 && firstGoods > 0) firstGoods -= 1;
    if (category === 2 && secondGoods > 0) secondGoods -= 1;
    total -= 1;
  }

  return {
    gold,
    food,
    goods: firstGoods,
    specialGoods: secondGoods,
    cannon,
  };
}

export function capturedTownPlunder({ town, alert, rng }) {
  const baseGold = Math.floor((town.gold * 1500) / (alert + 15));
  const food = rng.int(town.growth);
  const goods = rng.int(town.growth);
  const specialGoods = rng.int(town.growth);
  rng.int(town.growth); // The fourth decoded pile is overwritten by fort guns.
  return {
    gold: baseGold * 10,
    food,
    goods,
    specialGoods,
    cannon: town.forts * 6,
    treasuryLoss: Math.floor(baseGold / 50),
  };
}

export function applyTownCapture(town, plunder) {
  return {
    ...town,
    gold: Math.max(0, town.gold - plunder.treasuryLoss),
    growth: Math.max(0, town.growth - 20),
    mood: town.mood - 3,
  };
}

export function capturedShipRecruits({ enemyCrew, reputation, crew, capacity, rng }) {
  const range = Math.floor(((reputation + 5) * enemyCrew) / 10);
  const recruits = range > 0 ? rng.int(range) : 0;
  return recruits > 1 && crew + recruits <= capacity ? recruits : 0;
}

export function stepSailingSpeed(current, target, sailState) {
  // ASSUMED: furled sail is a web-port extension. The low-sail path follows
  // the decoded reduced-sail flag: accelerate, clamp, then halve.
  if (sailState === 'furled') return 0;
  const stepped = clamp(current + 2 * Math.sign(target - current), 4, 12);
  return sailState === 'battle' ? Math.floor(stepped / 2) : stepped;
}

// The voyage clock (porting_guide.md §5.1). Each voyage restarts its tick
// at 63 (0x23319, 0x2454D); the half-day check runs when (tick + 4) & 31 is
// 0 (0x23DC9) and the daily check when (tick + 2) & 63 is 0 (0x23F2D).
export const VOYAGE_START_TICK = 63;

export function isHalfDayTick(voyageTick) {
  return ((voyageTick + 4) & 31) === 0;
}

export function isDailyTick(voyageTick) {
  return ((voyageTick + 2) & 63) === 0;
}

// Leaving the sailing view passes tick / 64 + 1 days to the calendar
// (0x2898F → 0x1DD0E), so any voyage costs at least 2 days. Quirk 3 is kept
// as the original behaves.
export function voyageDays(voyageTick) {
  return Math.floor(voyageTick / 64) + 1;
}

export function acceptsRudderInput(tick) {
  return (tick & 4) === 0;
}

export function shiftWind(wind, rng) {
  const sector = wind >> 4;
  const step = (rng.int(8) + 10 - sector) >> 1;
  return (wind + 16 * step) & 0xff;
}

export function consumeDailyFood(foodFixed, crew) {
  return Math.max(0, foodFixed - crew);
}

export function foodDays(foodFixed, crew) {
  return crew > 0 ? Math.floor(foodFixed / crew) : 0;
}

// 0x1F044(n): n men desert, never the last man, each taking an equal share
// of the party gold.
export function thirdOfCrewDeserts({ crew, partyGold }) {
  const deserters = Math.min(Math.trunc(crew / 3), Math.max(0, crew - 1));
  const goldLost = crew > 0 ? Math.trunc((deserters * partyGold) / crew) : 0;
  return { deserters, goldLost, crew: crew - deserters, partyGold: partyGold - goldLost };
}

// Port desertion (0x17EFB, run as you leave a town): n = trunc((3 - morale)
// * crew / 15), at most crew - 1; when n > 1, "Roll call reveals that %s crew
// members have deserted" (CSTR 109) and 0x1F044(n) takes their share of the
// gold. Returns null when nobody deserts.
export function portDesertion({ crew, partyGold, morale }) {
  let deserters = Math.trunc(((3 - morale) * crew) / 15);
  if (deserters >= crew) deserters = crew - 1;
  if (deserters <= 1) return null;
  const goldLost = Math.trunc((deserters * partyGold) / crew);
  return { deserters, goldLost, crew: crew - deserters, partyGold: partyGold - goldLost };
}

// Event 2 at 0x28537 with zero days left: the whole-ton food word becomes 5
// (the fraction byte stays), and a third of the crew deserts via 0x1F044.
export function starvationDesertion({ crew, partyGold, foodFixed }) {
  return { ...thirdOfCrewDeserts({ crew, partyGold }), foodFixed: 5 * 256 + (foodFixed & 0xff) };
}

// 0x1DD0E, after the months a voyage crossed: aboard at sea with more than
// one man, morale <= -4 is a mutiny (CSTR 139) and a negative morale is a
// warning, CSTR 210 once months at sea reach 12, otherwise CSTR 140.
export function monthEndCrewEvent({ morale, crew, monthsAtSea, aboard }) {
  if (!aboard || crew === 1) return null;
  if (morale <= -4) return 'mutiny';
  if (morale < 0) return monthsAtSea >= 12 ? 'divide' : 'restless';
  return null;
}

// Mutiny: 0x1F044(crew / 3), the leader duel 0x161BA, then reputation -4 in
// any case; a lost duel first sets reputation to -1 (0x165FE).
export function mutinyOutcome({ crew, partyGold, reputation, duelWon }) {
  const deserted = thirdOfCrewDeserts({ crew, partyGold });
  return { ...deserted, reputation: (duelWon ? reputation : -1) - 4 };
}

export function encounterRoll(distance, alert, rng) {
  const d = Math.max(1, Math.floor(distance));
  let nextAlert = alert;
  let sighted = false;

  if (d >= 32) sighted = rng.int(64) < 4;
  else if (d >= 16) sighted = rng.int(32) < 4;
  else if (d >= 8) sighted = rng.int(16) < 2;
  else {
    nextAlert += 8 - d;
    sighted = rng.int(8) + Math.floor(nextAlert / 4) < 2;
  }

  return { sighted, alert: nextAlert };
}

// Trigger entries are [cellX, cellY, townIndex] in the era table's original
// order (entering_towns.md §0). Order matters: the nearest-town scan keeps the
// first entry on a tie, which decides Port-de-Paix over Tortuga.
export function triggerTownAt(triggers, cellX, cellY) {
  const entry = triggers.find(([x, y]) => x === cellX && y === cellY);
  return entry ? entry[2] : -1;
}

export function nearestTriggerTown(triggers, cellX, cellY) {
  let bestTown = -1;
  let bestDistance = Infinity;
  for (const [x, y, townIndex] of triggers) {
    const distance = Math.abs(x - cellX) + Math.abs(y - cellY);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestTown = townIndex;
    }
  }
  return bestTown;
}

// 0x19B9E: the ship starts on the centre of the town's departure cell
// (cell·16 + 8 px) facing departure_heading[w28]; inland towns have none.
export function departurePose(departure) {
  if (!departure) return null;
  const [cellX, cellY, heading] = departure;
  return { x: cellX + .5, y: cellY + .5, heading };
}

// town_dist is measured to the town record's (x, y), not to a trigger cell,
// and a distance of 0 counts as 1 (0x23E0E–0x23E4C).
export function townDistanceCells(town, cellX, cellY) {
  return Math.max(1, Math.abs(town.x - cellX) + Math.abs(town.y - cellY));
}

// The single alert counter belongs to the nearest town and is cleared when
// the half-day nearest-town check picks a different town (0x23DE4–0x23DF7).
export function alertAfterNearestTownCheck(alert, previousTownIndex, nearestTownIndex) {
  return nearestTownIndex === previousTownIndex ? alert : 0;
}

export function chooseEncounterTier({ crew, alert, governorMood, rng }) {
  const range = Math.floor(crew / 50 + alert / 6 - governorMood);
  if (range <= 0) return 0;
  return Math.min(4, Math.floor(rng.int(range) / 3));
}

// Encounter steps 7-8 (0xD540, 0xD980): a template whose kind byte is at
// least 6, met while your favour with its nation is negative, is a named
// hunter. Its CSTR 120 "Sail away" answer is ignored, and after the CSTR 121
// menu any answer but battle is overtaken when rnd(3) < difficulty (CSTR 126).
// Hunter captains (0xD60D). The name comes from 0x19FBB: a title from
// CSTN 78 (Captain .. Duke, index (id & 7) + 2) and a surname from the
// nation's list (CSTN 2-5, row (id >> 3) & 7, nation (id >> 6) & 3); the
// renown word (CSTN 34) is (id & 7) / 3.
export const CAPTAIN_TITLES = ['Captain', 'Major', 'Colonel', 'Admiral', 'Baron', 'Count', 'Marquis', 'Duke'];
export const CAPTAIN_SURNAMES = [
  ['Montalban', 'Delgado', 'Vasquez', 'La Mancha', 'de Silva', 'Almagro', 'Delado', 'Orgonez'],
  ['Fielding', 'Moodyford', 'Holcroft', 'Thatcher', 'Culliford', 'Roberts', 'Alexander', 'Gilford'],
  ['Raynale', 'de Coligny', 'le Crozat', 'Galoise', 'Carriere', 'Ribault', 'le Grand', 'Olonais'],
  ['vaan Ryhn', 'Ruyters', 'Tromper', 'de Vranck', 'de Graff', 'Brugmans', 'van Hudde', 'Haakles'],
];
export const CAPTAIN_RENOWN = ['cowardly', 'promising', 'well known', 'famous', 'notorious', 'infamous'];

// One of five name rows not yet used (bitmask 0x32E06, cleared once all
// five are taken), then rnd(8) for the title, plus 64 x nation. Id 0 means
// "no captain", so it is drawn again.
export function drawHunterCaptain({ usedRows, nationIndex, rng }) {
  let mask = usedRows;
  for (;;) {
    if (mask === 31) mask = 0;
    let row = rng.int(5);
    while (mask & (1 << row)) row = row >= 4 ? 0 : row + 1;
    mask |= 1 << row;
    const id = row * 8 + rng.int(8) + 64 * nationIndex;
    if (id !== 0) return { id, usedRows: mask };
  }
}

export function captainName(id) {
  const low = id & 0xff;
  return `${CAPTAIN_TITLES[low & 7]} ${CAPTAIN_SURNAMES[(low >> 6) & 3][(low >> 3) & 7]}`;
}

export function captainRenown(id) {
  return CAPTAIN_RENOWN[Math.trunc((id & 7) / 3)];
}

// Governor missions (0x12E88). The status word 0x471AA holds the type while
// the mission is open and its negation once it is done (0x1F9FC).
export const MISSION = Object.freeze({ LETTER: 1, PAPERS: 2, PIRATE: 3, RESCUE: 4 });

// 0x12FC1: type = rnd(5) + 1, where 5 means no mission. Up to ten random
// towns are tried as the target; if none fits, the type is rolled again. The
// offer then needs favour >> 2 >= type and a governor mood that is not
// negative.
export function rollGovernorMission({ towns, currentTownIndex, nation, favour, governorMood, diplomacy, rng }) {
  for (;;) {
    const type = rng.int(5) + 1;
    const target = missionTarget({ type, towns, currentTownIndex, nation, diplomacy, rng });
    if (target < 0) continue;
    if ((favour >> 2) < type || type === 5 || governorMood < 0) return null;
    return { type, target };
  }
}

// Odd types (letter, pirate, and the unused 5) need a town not at war with
// the governor's nation; the pirate mission needs a coastal town of the
// governor's own nation. Even types (papers, rescue) need an enemy town.
function missionTarget({ type, towns, currentTownIndex, nation, diplomacy, rng }) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const index = rng.int(randomTownRange(towns)); // 0x12FE4
    if (index === currentTownIndex) continue;
    const town = towns[index];
    const relation = diplomacy[nation]?.[town.nation] ?? 0;
    if (type & 1) {
      if (type === MISSION.PIRATE) {
        if (town.nation === nation && !(town.flags & 0x40)) return index;
        continue;
      }
      if (relation >= 0) return index;
    } else if (relation < 0) {
      return index;
    }
  }
  return -1;
}

// 0x13150: the wanted pirate's id is 0x8000 | (nation·4 + rnd(4))·8. Bit 15
// marks him (0xDE48), and the name comes from the low byte as usual.
export function missionPirateId(nationIndex, rng) {
  return 0x8000 | ((nationIndex * 4 + rng.int(4)) << 3);
}

export function isMissionPirateId(id) {
  return Boolean(id & 0x8000);
}

export function isEncounterHunter({ kind, favour }) {
  return kind >= 6 && favour < 0;
}

export function hunterOvertakes({ hunter, difficulty, rng }) {
  return hunter && rng.int(3) < difficulty;
}

export function harborAttempt({ favour, governorMood, crew, forts, rng }) {
  if (forts === 0) return { admitted: true, fired: false, shipLost: false };
  const x = favour + governorMood - crew / 100;
  const value = x * rng.unit();
  return {
    admitted: value > -0.5,
    fired: value <= -0.5,
    shipLost: value <= -1,
  };
}

export function sneakAttempt({ governorMood, reputation, rng }) {
  return governorMood * reputation > -rng.int(50);
}

export function tavernRecruits({ townPopulation, reputation, difficulty, crew, capacity, rng }) {
  const base = townPopulation + rng.int(townPopulation);
  const minimum = 6 * (4 - difficulty);
  let recruits = Math.floor(((reputation + 7 - difficulty) * base) / 9);
  if (4 * minimum > crew && recruits < minimum) recruits = minimum;
  recruits = clamp(recruits, 1, Math.max(1, capacity - crew));
  return recruits;
}

export function tavernSpecialEncounters({ mapPieces = 0, towns = null, rng }) {
  // These are prepared in the original order when the tavern opens. A roll of
  // 50 suppresses the traveller; the map seller has a separate 1-in-5 roll.
  // 0x110D8: the traveller's town is rnd(random-town range), and price and
  // town are drawn again while you already have current information on the
  // town (unless the price is 50), so he reports on a town you don't know.
  let travellerPrice;
  let townIndex;
  for (;;) {
    travellerPrice = (rng.int(10) + 5) * 10;
    if (!towns) break;
    townIndex = rng.int(randomTownRange(towns));
    if (!(towns[townIndex].flags & TOWN_INFO_CURRENT) || travellerPrice === 50) break;
  }
  const encounters = travellerPrice === 50
    ? []
    : [{ kind: 'traveller', price: travellerPrice, ...(towns ? { townIndex } : {}) }];
  if (mapPieces < 4 && rng.int(5) === 0) encounters.push({ kind: 'map-seller', price: 500 });
  return encounters;
}

export function diplomaticBriefing(diplomacy, nation) {
  return Object.entries(diplomacy[nation] ?? {})
    .filter(([other, relation]) => other !== nation && relation !== 0)
    .map(([other, relation]) => ({
      nation: other,
      relation,
      message: relation < 0
        ? `${nation} is at war with ${other}.`
        : `${nation} is allied with ${other}.`,
    }));
}

export function shipRepairPrice({ type, damage = 0 }) {
  return 50 * (type + 1) * Math.floor(damage / 16);
}

export function shipSalePrice({ type, damage = 0 }) {
  return 50 * (type + 1) * (10 - Math.floor(damage / 16));
}

export function shipwrightCash({ month, population, growth }) {
  const season = Math.abs(6 - month) + 6;
  const seasonalGrowth = Math.trunc((season * growth) / 6);
  return Math.min(50000, 600 * Math.trunc(((population + 10) * seasonalGrowth) / 150));
}

export function merchantCash({ month, population, growth }) {
  const season = 6 + Math.abs(6 - month);
  const quantity = Math.trunc((growth * season * (population + 10)) / (6 * 150));
  return Math.min(50000, quantity * 600);
}

export function morale({ partyGold, crew, monthsAtSea, difficulty }) {
  if (crew <= 0) return -99;
  return Math.floor(2 * Math.sqrt(partyGold / 10 / crew)) + 4 - monthsAtSea - difficulty;
}

// add_prize (0xDB7B): every captured prize, kept or sunk, raises the stored
// crew morale by 1, or by 2 when the encounter template's kind is above 5.
export function prizeMoraleBonus(kind) {
  return kind > 5 ? 2 : 1;
}

export function dividePlunder({ partyGold, crew, reputation, difficulty }) {
  const crewShare = Math.round((0.8 * partyGold) / Math.max(1, crew));
  const shareRoot = Math.floor(Math.sqrt(crewShare));
  const satisfaction = Math.min(3, Math.floor(shareRoot / 23));
  const averagedReputation = Math.trunc((reputation + shareRoot + 1) / 2);
  const nextReputation = ((averagedReputation + 128) & 0xff) - 128;

  return {
    crewShare,
    satisfaction,
    reputation: nextReputation,
    captainTake: Math.floor(((difficulty + 1) * partyGold) / 20),
    officerShares: 2 * difficulty + 2,
    expeditionGold: Math.floor(partyGold / 10),
  };
}

// The division itself (0x18203-0x18331, then 0x184F8): reputation is
// averaged, the captain's take goes to personal wealth and months at sea is
// set to -16 for the refit. The old crew, fleet and cargo stay until the
// fresh fleet (0x1EF87) replaces them after the refit.
export function beginDivisionRefit(player, division) {
  return {
    ...player,
    personalWealth: (player.personalWealth ?? 0) + division.captainTake,
    reputation: division.reputation,
    monthsAtSea: -16,
  };
}

// Fresh fleet (0x1EF87, ships.md §5), after dividing the plunder (gold = the
// party gold) and after captivity (gold = 0: a tenth of personal wealth is
// lost and a tenth of the rest funds the voyage). Only the flagship's type
// is kept, with the damage bits cleared (flagship byte &= 7), so it comes
// back repaired. Cannon 2·T + 6, 15 tons of food, no cargo, months at sea 0
// (0x1F02F, after the division's -16). Prisoners (0x4720A) are untouched.
// Crew = reputation + 16 (0x45E76), stored as an unsigned word and replaced
// by 1 only when it is 0 (0x1F010-0x1F029). A negative sum wraps to tens of
// thousands of men; ASSUMED: the port uses `minCrew` instead, which is 1
// after a division (the original's value at exactly -16) and RESTART_MIN_CREW
// after captivity. ships.md's "kept as is if <= 0" reading is not what the
// code does: the store comes before the test.
export function freshFleet(player, { gold, flagshipType, shipStats, minCrew = 1 }) {
  let personalWealth = player.personalWealth ?? 0;
  let funds = gold;
  if (funds === 0) {
    personalWealth -= Math.trunc(personalWealth / 10);
    funds = personalWealth;
  }
  const typeIndex = shipStats[flagshipType].type;
  const crew = player.reputation + 16;
  return {
    ...player,
    personalWealth,
    partyGold: Math.trunc(funds / 10),
    ships: [{ type: flagshipType, damage: 0 }],
    cannon: 2 * typeIndex + 6,
    foodFixed: 15 * 256,
    goods: 0,
    specialGoods: 0,
    crew: Math.max(minCrew, crew),
    monthsAtSea: 0,
  };
}

// The prisoner word in 0x4720A (8 slots). 0xDF54 stores a captured named
// captain as ((flag & 4) << 6) | captain id, so bit 8 marks a pirate (flag 4)
// and Hostage Status (0xA4B9) prints "(pirate)" or "(hunter)" from it.
// Captains with id 0 are not taken, and an id with bit 15 (the mission
// pirate) completes the mission instead (0xDE48), so a stored word never has
// bit 15 set.
export function captiveWord({ flagIndex, captainId }) {
  return (((flagIndex & 4) << 6) | captainId) & 0xffff;
}

// Old saves kept no word; rebuild it from the stored id and pirate flag.
export function captiveWordOf(captive) {
  return captive.word ?? ((captive.pirate ? 0x100 : 0) | ((captive.value ?? 0) & 0xff));
}

// Leaving a town (0x17EFB, after portDesertion): slot = rnd(8); a
// prisoner whose word has a non-zero low byte jumps overboard and escapes
// (CSTR 110) and the slot is cleared, while 0x47ACA bit 1 (in a town) is set,
// which it always is here. Returns the escaping captive's index or -1.
// ASSUMED: the port keeps prisoners in a packed list, so slot i is the i-th
// prisoner; the original leaves holes where prisoners were ransomed.
export function prisonerEscape({ captives, rng }) {
  const slot = rng.int(8);
  const captive = captives[slot];
  return captive && (captiveWordOf(captive) & 0xff) ? slot : -1;
}

// Pirate delivery at the governor (0x12432, deliver_pirates.asm), traced
// literally: for each prisoner word v, the hand-over needs v & 0x8000 and
// (v >> 8) & 4 == the governor's nation (0x4605C, 0 Spain .. 3 Holland). It
// is automatic: there is no choice to keep a matching prisoner. The favour
// gain is ((v & 0x255) & 7) / 2 + 1; the mask is 0x255, not 255, so only
// bits 0 and 2 count and the gain is 1 or 3. README §4.3's "(v & 7)/2 + 1"
// drops that mask.
// Since no stored word has bit 15 (see captiveWord), this never hands anyone
// over in the original, and the port keeps that: a held captain is ransomed
// (0x127DA), escapes when you leave a town (prisonerEscape) or is freed by
// captivity (0x1F88F).
export function governorPirateHandover({ captives, governorNationIndex }) {
  const delivered = [];
  let favourGain = 0;
  for (const captive of captives) {
    const word = captiveWordOf(captive);
    if (!(word & 0x8000) || ((word >> 8) & 4) !== governorNationIndex) continue;
    delivered.push(captive);
    favourGain += (((word & 0x255) & 7) >> 1) + 1;
  }
  return { delivered, favourGain };
}

// New-game record copy (0x1386C): the start point is rnd(4) of the record's
// four points (0x1395A), not chosen by difficulty, and pirate favour
// (0x45E7E) is set to -1 after the record's five favour bytes are copied.
export function startFromRecord(start, rng) {
  const favour = [...start.favour];
  favour[4] = -1;
  return { point: start.points[rng.int(4)], favour };
}

export function governorPromotion({ favour, rank, governorMood }) {
  const nextRank = rank + 1;
  if (nextRank > 9) return null;
  const threshold = nextRank ** 2 + 2;
  const excess = favour - threshold;
  if (excess < 0) return null;
  return {
    rank: nextRank,
    favour: threshold,
    excess,
    landUnits: Math.max(0, excess + governorMood),
  };
}

export function nationalStanding(favour) {
  if (favour >= 2) return 'Letter of marque';
  if (favour >= 0) return 'No title';
  if (favour >= -3) return 'Wary';
  return 'Hostile';
}

export function governorAmnestyTerms(favour) {
  if (favour <= -4 || favour >= 2) return null;
  const resultingFavour = Math.min(favour + 2, 2);
  return {
    kind: favour < 0 ? 'amnesty' : 'commission',
    price: 200 * (4 - favour ** 3),
    resultingFavour,
    grantsCommission: resultingFavour >= 2,
  };
}

export function captainRansomOffers({ captives, rng }) {
  const offers = [];
  for (let draw = 0; draw < 4; draw += 1) {
    const captain = captives[rng.int(8)];
    // 0x1280D reads every slot, pirates included (only the low byte counts).
    if (!captain) continue;
    const multiplier = rng.int(3) + 1;
    offers.push({ captain, gold: 500 * ((captiveWordOf(captain) & 7) + 1) * multiplier });
  }
  return offers;
}

export function monthlyLandIncome(landUnits) {
  return Math.trunc(landUnits / 2);
}

export function convoyReport({ kind, route, towns, calendar, eraIndex }) {
  const dayOfYear = calendar.month * 30 + calendar.day;
  // ASSUMED: full monthly convoy state is not simulated yet. Advancing one
  // route stop every 15 days is the deterministic midpoint of the documented
  // one-or-two-stop monthly movement and preserves the decoded restart dates.
  let position = Math.floor(dayOfYear / 15) + (kind === 'treasureFleet' ? -18 : -6) + 2 * (eraIndex & 1);
  if (position < 0) position += 24;
  while (position < route.length) {
    const location = towns.find(town => town.name === route[position]);
    if (location?.nation === 'Spain') {
      const next = route.slice(position + 1)
        .map(name => towns.find(town => town.name === name))
        .find(town => town?.nation === 'Spain');
      return { location: location.name, next: next?.name ?? null };
    }
    position += 1;
  }
  return { location: null, next: null };
}

export function merchantFoodPrice({ growth, month, producesFood, familyDiscount = false }) {
  return merchantCommodityPrice({ growth, month, kind: 'food', produces: producesFood, familyDiscount });
}

export function merchantCommodityPrice({ growth, month, kind, produces = false, demand = false, familyDiscount = false }) {
  const season = (6 + Math.abs(6 - month)) / 6;
  const effectiveGrowth = growth * season;
  let price = Math.floor(effectiveGrowth / 50 + (kind === 'special' ? 2 : 3));
  if (produces) price = Math.floor(price / 2) + 1;
  if (kind === 'special' && demand) price *= 2;
  price = Math.floor(price * 10 * (kind === 'special' ? 3 : 1.5));
  if (familyDiscount) price = Math.max(1, Math.floor(price * 0.75));
  return price;
}

export function merchantStock({ growth, population, month, rng }) {
  const season = (6 + Math.abs(6 - month)) / 6;
  const quantity = Math.floor((growth * season * (population + 10)) / 150);
  return quantity + rng.int(quantity);
}

export function updateTownMonthly(town, month, rng) {
  if (rng.int(4) !== 0) return { ...town };
  const growthGain = rng.int(255 - town.growth) >> 5;
  const growth = Math.min(255, town.growth + growthGain);
  const roll = rng.int(growth);
  const population = town.population + ((24 * month + roll) >> 8);
  let income = (roll * population) >> 9;
  if (town.nation === 'Spain') income = Math.floor(income / 2);
  const target = Math.floor((income + population) / 2);
  const soldiers = town.soldiers < target
    ? Math.min(255, town.soldiers + 1)
    : town.soldiers > target ? town.soldiers - 1 : town.soldiers;
  return { ...town, growth, population, soldiers, gold: town.gold + income };
}

// ---------------------------------------------------------------------------
// The monthly world (0xCEB8 step 5, diplomacy_and_world.md §1). Each rule
// below takes the world it changes and returns the news it logs as records
// ({ event, ... }); `worldNewsMessage` turns a record into the log text.
// Event numbers are the CSTN 20 log indices the original passes to 0x1E8CF.
// ---------------------------------------------------------------------------

export const NATION_ORDER = ['Spain', 'England', 'France', 'Holland'];

export const WORLD_EVENT = Object.freeze({
  AMNESTY: 10,
  INDIANS: 11,
  GOLD_MINE: 12,
  MALARIA: 13,
  NEW_GOVERNOR: 14,
  PIRATES: 15,
  WAR: 16,
  PEACE: 17,
  ALLIANCE: 18,
  CONQUEST: 19,
});

// Runtime bits in the town's flag word (+0x00), next to the static trade
// bits (town_economy.md §1): 0x80 = you have current information on the
// town, 0x20 = a random event has made that information obsolete. The town
// information routine 0x196D0 tests 0x80 first, then 0x20. Some towns carry
// a static 0x20 bit (Charlesfort, Nassau, ...); the original reads it the
// same way, so such a town reports obsolete information until visited.
export const TOWN_INFO_CURRENT = 0x80;
export const TOWN_INFO_OBSOLETE = 0x20;

export function townInfoStatus(flags = 0) {
  if (flags & TOWN_INFO_CURRENT) return 'current';
  return flags & TOWN_INFO_OBSOLETE ? 'obsolete' : 'none';
}

// Entering a town (0x17EBB), capturing it (0x227AF) and buying a traveller's
// report (0x115A0) set 0x80 and clear 0x20.
export function learnTownInfo(flags = 0) {
  return (flags | TOWN_INFO_CURRENT) & ~TOWN_INFO_OBSOLETE;
}

// 0xCAF4-0xCB07: 0x20 = old 0x80, then `and word, 0x7F` clears 0x80 (and
// the unused high byte).
export function obsoleteTownInfo(flags = 0) {
  const marked = flags & TOWN_INFO_CURRENT ? flags | TOWN_INFO_OBSOLETE : flags & ~TOWN_INFO_OBSOLETE;
  return marked & 0x7f;
}

// New-game town setup (0x1453C): each town is known when rnd(4) + 1 >
// difficulty (always on Apprentice, one in four on Swashbuckler); the
// governor's mood (w9) and w10 are cleared and his relative (w11) is
// rnd(16). The two rolls are made town by town in that order. The loop runs
// to the era header's count field 0x4607E (records - 1, 0x14548), so it
// covers every real town (and the first placeholder, which the port lacks).
export function newGameTowns(towns, difficulty, rng) {
  return towns.map((town) => {
    const known = rng.int(4) + 1 > difficulty;
    const governorRelative = rng.int(16);
    return {
      ...town,
      flags: known ? (town.flags ?? 0) | TOWN_INFO_CURRENT : town.flags ?? 0,
      mood: 0,
      governorRelative,
    };
  });
}

// 0xCA51, a new governor (random event 14 and AI conquest): mood 0 and a new
// daughter or niece, unless you married into the family (w11 bit 0x40).
export function installNewGovernor(town, rng) {
  town.mood = 0;
  if (!((town.governorRelative ?? 0) & 0x40)) town.governorRelative = rng.int(16);
  return town;
}

// The original's town range 0x4605A is the era header's count field
// 0x4607E minus 2 (0x134FE, 0x135F2, 0x1D8CC). That field is the record
// count minus 1 (35 for 1560's 36 records), and the last two records are
// the "Florida Channel" placeholders that tools/build_scenarios.mjs drops.
// So the range is the real towns minus one: the last real town of each era
// (1560 Yaguana, later Villa Hermosa) is never in it. The monthly economy
// (0xC729), AI conquest (0xC81B), the random event (0xCA7F) and the opening
// news (0x13679) all use this range, so that town never grows, falls to an
// AI nation or gets an event. A faithful quirk, kept. The other readers of
// 0x4605A: the governor's mission target (0x12FE4) and the tavern
// traveller's town (0x110F9) use it here too; the villain records and their
// moves and news (0xAAE4, 0xCBF7, 0x1224B, 0x18A02) wait for the lost
// relatives (K7); the gazetteer loops (0xB97C, 0xBC82) run to the range
// inclusive, i.e. every real town, as City information does; the Ship's Log
// (0x1E1DF) prints a town name only for indexes below it; the nearest-town
// search 0x1ADFC takes it as an argument (0x13988, 0x1F0F5, 0x2884F) but
// never reads it; 0xB53A, 0x13EC8 and 0x16666 are not ported.
export function randomTownRange(towns) {
  return Math.max(0, towns.length - 1);
}

// Random town event (0xCA7F): i = rnd(64), no event when i >= the random
// range (about half the months); e = 11 + rnd(5), rolled again while it is a
// new governor in the town whose governor gave the open mission (0x471AC).
export function rollRandomTownEvent({ townCount, protectedTownIndex = -1, rng }) {
  const townIndex = rng.int(64);
  if (townIndex >= townCount) return null;
  let event = WORLD_EVENT.INDIANS + rng.int(5);
  while (event === WORLD_EVENT.NEW_GOVERNOR && townIndex === protectedTownIndex) {
    event = WORLD_EVENT.INDIANS + rng.int(5);
  }
  return { event, townIndex };
}

export function applyRandomTownEvent(town, event, rng) {
  town.flags = obsoleteTownInfo(town.flags);
  switch (event) {
    case WORLD_EVENT.INDIANS:
      town.soldiers >>= 1;
      break;
    case WORLD_EVENT.GOLD_MINE:
      town.growth = town.growth >= 191 ? 255 : town.growth + 64;
      town.gold = town.gold >= 243 ? 255 : town.gold + 12;
      break;
    case WORLD_EVENT.MALARIA:
      town.soldiers >>= 1;
      town.population >>= 1;
      break;
    case WORLD_EVENT.NEW_GOVERNOR:
      installNewGovernor(town, rng);
      break;
    case WORLD_EVENT.PIRATES:
      town.gold = 0;
      town.growth -= town.growth >> 2;
      break;
    default:
      break;
  }
  return town;
}

// AI conquest (0xC81B, one attempt a month). Town A = rnd(n); town B =
// rnd(n), drawn again while it is the open mission's town (0x471AC with
// 0x471AA != 0). B falls to A's nation when the two nations are at war,
// 2 * B.soldiers < A.soldiers, |dx| + |dy| < 150 and B is not the town the
// player is in or beside (0x46058). B gets a new governor (0xCA51); its
// garrison, gold, growth and town information are untouched.
export function rollAiConquest({ towns, diplomacy, playerTownIndex = -1, protectedTownIndex = -1, rng }) {
  const count = randomTownRange(towns);
  const attackerIndex = rng.int(count);
  let defenderIndex = rng.int(count);
  while (defenderIndex === protectedTownIndex) defenderIndex = rng.int(count);
  const attacker = towns[attackerIndex];
  const defender = towns[defenderIndex];
  if ((diplomacy[attacker.nation]?.[defender.nation] ?? 0) !== -1) return null;
  if (2 * defender.soldiers >= attacker.soldiers) return null;
  if (Math.abs(attacker.x - defender.x) + Math.abs(attacker.y - defender.y) >= 150) return null;
  if (defenderIndex === playerTownIndex) return null;
  return { attackerIndex, defenderIndex };
}

// Diplomacy (0xC938): r = rnd(K); r >= 28 does nothing. The pair is
// (r & 3, r >> 2 & 3), the step +1 when r & 16 and -1 otherwise, and a
// relation already at the step's limit stays. Returns the change or null.
export function rollDiplomacyChange({ diplomacy, k, rng }) {
  const roll = rng.int(k);
  if (roll >= 28) return null;
  const first = roll & 3;
  const second = (roll >> 2) & 3;
  if (first === second) return null;
  const nationA = NATION_ORDER[first];
  const nationB = NATION_ORDER[second];
  const delta = roll & 16 ? 1 : -1;
  const from = diplomacy[nationA][nationB];
  if (from === delta) return null;
  return { nationA, nationB, from, to: from + delta };
}

// Applies a diplomacy change and returns its news: war (16), peace (17) or
// alliance (18); an alliance falling back to peace is not logged. A new
// alliance also logs "%s offers pirate amnesty!" (10) for the first nation
// and lifts your favour with it to at least -3.
export function applyDiplomacyChange(change, { diplomacy, favour }) {
  const { nationA, nationB, from, to } = change;
  diplomacy[nationA][nationB] = to;
  diplomacy[nationB][nationA] = to;
  if (to === 0 && from === 1) return [];
  const news = [{ event: WORLD_EVENT.PEACE + to, nationA, nationB }];
  if (to === 1) {
    news.push({ event: WORLD_EVENT.AMNESTY, nation: nationA });
    favour[nationA] = Math.max(-3, favour[nationA]);
  }
  return news;
}

// 0xC714, 0xC81B, 0xC938 and 0xCA7F in the original's order. The world is
// changed in place: town records keep their identity, so a town held by the
// caller (an open dialog, an encounter) sees the update. The villain moves
// (0xCBA7) and the treasure fleet and silver train step (0xCDE9) that follow
// in 0xCEB8 belong after this call.
export function monthlyWorldUpdate({ towns, diplomacy, favour, month, diplomacyK, playerTownIndex = -1, protectedTownIndex = -1, rng }) {
  const news = [];
  const range = randomTownRange(towns);
  for (const town of towns.slice(0, range)) Object.assign(town, updateTownMonthly(town, month, rng));

  const conquest = rollAiConquest({ towns, diplomacy, playerTownIndex, protectedTownIndex, rng });
  if (conquest) {
    const town = towns[conquest.defenderIndex];
    const nation = towns[conquest.attackerIndex].nation;
    news.push({ event: WORLD_EVENT.CONQUEST, nation, previousNation: town.nation, townIndex: conquest.defenderIndex });
    town.nation = nation;
    installNewGovernor(town, rng);
  }

  const change = rollDiplomacyChange({ diplomacy, k: diplomacyK, rng });
  if (change) news.push(...applyDiplomacyChange(change, { diplomacy, favour }));

  const townEvent = rollRandomTownEvent({ townCount: range, protectedTownIndex, rng });
  if (townEvent) {
    applyRandomTownEvent(towns[townEvent.townIndex], townEvent.event, rng);
    news.push(townEvent);
  }
  return news;
}

// Game start (0x13679): one log entry per nation pair, a < b: its war or
// alliance, or for a pair at peace a random town event (e = 11 + rnd(5) at
// town rnd(range), see randomTownRange) that is only reported, never applied.
export function initialWorldNews({ diplomacy, townRange, rng }) {
  const news = [];
  for (let first = 0; first < NATION_ORDER.length - 1; first += 1) {
    for (let second = first + 1; second < NATION_ORDER.length; second += 1) {
      const nationA = NATION_ORDER[first];
      const nationB = NATION_ORDER[second];
      const relation = diplomacy[nationA][nationB];
      if (relation !== 0) {
        news.push({ event: WORLD_EVENT.PEACE + relation, nationA, nationB });
      } else {
        const event = WORLD_EVENT.INDIANS + rng.int(5);
        news.push({ event, townIndex: rng.int(townRange) });
      }
    }
  }
  return news;
}

export function worldNewsMessage(entry, towns) {
  const town = towns[entry.townIndex]?.name;
  switch (entry.event) {
    case WORLD_EVENT.AMNESTY: return `${entry.nation} offers pirate amnesty!`;
    case WORLD_EVENT.INDIANS: return `Indians have attacked ${town}.`;
    case WORLD_EVENT.GOLD_MINE: return `A new gold mine has opened at ${town}.`;
    case WORLD_EVENT.MALARIA: return `Malaria has struck ${town}.`;
    case WORLD_EVENT.NEW_GOVERNOR: return `${town} has a new governor.`;
    case WORLD_EVENT.PIRATES: return `Pirates have plundered ${town}.`;
    case WORLD_EVENT.WAR: return `${entry.nationA} is at war with ${entry.nationB}.`;
    case WORLD_EVENT.PEACE: return `${entry.nationA} and ${entry.nationB} have made peace.`;
    case WORLD_EVENT.ALLIANCE: return `${entry.nationA} has allied with ${entry.nationB}.`;
    case WORLD_EVENT.CONQUEST: return `${entry.nation} has captured ${town} from ${entry.previousNation}.`;
    default: return '';
  }
}

export function advanceDate(calendar) {
  let { day, month, year } = calendar;
  day += 1;
  let newMonth = false;
  if (day >= 30) {
    day = 0;
    month += 1;
    newMonth = true;
    if (month >= 12) {
      month = 0;
      year += 1;
    }
  }
  return { day, month, year, newMonth };
}

// Fleet check (0x1F65F, ships.md §5): every ship needs eight men.
export const CREW_PER_SHIP = 8;

export function fleetIsUndermanned({ crew, shipCount }) {
  return CREW_PER_SHIP * shipCount > crew;
}

// Abandoning a ship for lack of crew keeps the whole cargo (0x1F748 calls
// 0x1F2A1 with keep_cargo set). The last ship takes the last-ship path instead.
export function abandonShip(player, slot) {
  if (player.ships.length < 2) throw new Error('the last ship takes the last-ship path');
  return { player: { ...player, ships: player.ships.filter((_, index) => index !== slot) }, lost: player.ships[slot] };
}

// remove_ship with cargo lost (0x1F2A1, keep_cargo = 0): the ship takes its
// share of the hold, 2·(T+1) of the fleet's units, as a fraction of the gold,
// food (8.8 fixed point), goods, third good and cannon. Gold is truncated;
// the rest are rounded. The last ship takes the last-ship path instead.
export function removeShipWithCargo(player, slot, shipStats) {
  if (player.ships.length < 2) throw new Error('the last ship takes the last-ship path');
  const units = (ship) => 2 * (shipStats[ship.type].type + 1);
  const share = units(player.ships[slot]) / player.ships.reduce((sum, ship) => sum + units(ship), 0);
  const rounded = (value) => value - Math.trunc(value * share + .5);
  return {
    player: {
      ...player,
      ships: player.ships.filter((_, index) => index !== slot),
      partyGold: player.partyGold - Math.trunc(player.partyGold * share),
      foodFixed: rounded(player.foodFixed),
      goods: rounded(player.goods),
      specialGoods: rounded(player.specialGoods),
      cannon: rounded(player.cannon),
    },
    lost: player.ships[slot],
  };
}

// Fresh fleet after the last ship is lost (0x1EF87 with g = 0): a tenth of
// personal wealth is lost, a tenth of the remainder funds the voyage, and the
// lost flagship's type returns repaired with a small crew. The crew comes
// from 0x45E76 (the README's reputation byte, the docs' captures counter),
// which the port stores as `reputation`; months at sea restart at 0.
// The original stores reputation + 16 as an unsigned word and uses 1 only
// when it is exactly 0: reputation -15..-9 leaves 1..7 men, so the fleet
// check abandons the ship again forever, and below -16 the word wraps to
// tens of thousands of men. ASSUMED: the port gives at least the eight men
// one ship needs.
export const RESTART_MIN_CREW = 8;

export function restartAfterLastShip(player, flagship, shipStats) {
  return freshFleet(player, { gold: 0, flagshipType: flagship.type, shipStats, minCrew: RESTART_MIN_CREW });
}

// Captivity after the last ship is lost (0x1F803, called by 0x1F2A1 for
// both prison and the uncharted island). Time passes in 27-day steps of the
// calendar routine 0x1DD0E while step <= trunc(reputation / 2) + 6; the
// reputation is re-read before every step, so monthly decay can shorten it.
export const CAPTIVITY_STEP_DAYS = 27;

export function captivityContinues(reputation, stepsServed) {
  return Math.trunc(reputation / 2) + 6 >= stepsServed;
}

// 0x1DB64: health 0 fine .. 3 poor, from years elapsed plus wounds.
export function healthLevel({ yearsElapsed, wounds = 0, medicine = false }) {
  return Math.min(3, Math.trunc((yearsElapsed + wounds) / (medicine ? 4 : 3)));
}

// The rest of 0x1F803 after the fresh fleet: every prisoner is freed (all
// eight 0x4720A slots are cleared at 0x1F88F, hunters and pirates alike), and
// the difficulty drops one level unless it is already Apprentice, so you
// return "as an apprentice/journeyman/... captain".
export function releaseFromCaptivity(player, difficulty) {
  return {
    player: { ...player, capturedCaptains: [] },
    difficulty: (difficulty & 3) !== 0 ? difficulty - 1 : difficulty,
  };
}

// The port's replacement for the original shore search 0x1BE71
// (porting_guide.md §10.1 find_shore): the first land cell on clockwise
// Chebyshev rings with open water beside it. The heading is a byte angle
// pointing away from the land.
export function findShore(cx, cy, { width, height, isLand, isOpenWater }) {
  const onMap = (x, y) => x >= 0 && y >= 0 && x < width && y < height;
  const sides = [[1, 0, 64], [0, 1, 128], [-1, 0, 192], [0, -1, 0]];
  for (let r = 1; r <= 640; r += 1) {
    for (const [x, y] of chebyshevRing(cx, cy, r)) {
      if (!onMap(x, y) || !isLand(x, y)) continue;
      for (const [dx, dy, heading] of sides) {
        if (onMap(x + dx, y + dy) && isOpenWater(x + dx, y + dy)) return { x: x + dx, y: y + dy, heading };
      }
    }
  }
  return null;
}

function* chebyshevRing(cx, cy, r) {
  for (let x = cx - r; x <= cx + r; x += 1) yield [x, cy - r];
  for (let y = cy - r + 1; y <= cy + r; y += 1) yield [cx + r, y];
  for (let x = cx + r - 1; x >= cx - r; x -= 1) yield [x, cy + r];
  for (let y = cy + r - 1; y >= cy - r + 1; y -= 1) yield [cx - r, y];
}

// Inland towns have no departure cell; 0x1C056 shifts the release point by
// these cell offsets before the shore search (landing_and_overland.md §6).
export const INLAND_RELEASE_OFFSETS = {
  'Gran Granada': [50, 0], Jalapa: [20, 0], Panama: [0, -20],
  'Puerto Principe': [0, 16], 'Villa Hermosa': [0, -10], 'St. Thome': [0, -20],
};

// sea_battles.md §6: only leaving the field (event 6) lets an undamaged,
// non-fleeing enemy overtake a reserve ship; sunset (event 8) just ends it.
export function escapeCostsShip({ event, shipCount, enemyDamage, enemyTactic }) {
  return event === 'escaped' && shipCount > 1 && enemyDamage < 16 && enemyTactic !== 'flee';
}
