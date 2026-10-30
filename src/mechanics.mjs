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

export function tavernSpecialEncounters({ mapPieces = 0, rng }) {
  // These are prepared in the original order when the tavern opens. A roll of
  // 50 suppresses the traveller; the map seller has a separate 1-in-5 roll.
  const travellerPrice = (rng.int(10) + 5) * 10;
  const encounters = travellerPrice === 50
    ? []
    : [{ kind: 'traveller', price: travellerPrice }];
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

export function dividePlunder({ partyGold, crew, reputation, difficulty, flagshipSizeClass }) {
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
    // The new-expedition routine retains the flagship and derives its initial
    // company and stores from ship class. Months at sea follow the documented
    // -16 reset; the binary's adjacent initialization remains ambiguous.
    crew: Math.max(1, nextReputation + 16),
    cannon: 2 * flagshipSizeClass + 6,
    foodFixed: 15 * 256,
    monthsAtSea: -16,
  };
}

export function startNewExpedition(player, division) {
  const flagship = player.ships[0];
  return {
    ...player,
    personalWealth: (player.personalWealth ?? 0) + division.captainTake,
    partyGold: division.expeditionGold,
    reputation: division.reputation,
    ships: [flagship],
    crew: division.crew,
    cannon: division.cannon,
    foodFixed: division.foodFixed,
    goods: 0,
    specialGoods: 0,
    monthsAtSea: division.monthsAtSea,
    capturedCaptains: [],
  };
}

export function pirateCaptainTerms(value = 7) {
  const favourGain = Math.floor((value & 7) / 2) + 1;
  return {
    favourGain,
    // ASSUMED: the binary confirms the favour gain but no cash award. A
    // modest bounty makes handing over a pirate a visible, useful transaction.
    bounty: 250 * favourGain,
  };
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
  const typeIndex = shipStats[flagship.type].type;
  const personalWealth = player.personalWealth - Math.trunc(player.personalWealth / 10);
  const crew = Math.max(RESTART_MIN_CREW, player.reputation + 16);
  return {
    ...player,
    personalWealth,
    partyGold: Math.trunc(personalWealth / 10),
    ships: [{ type: flagship.type, damage: 0 }],
    cannon: 2 * typeIndex + 6,
    foodFixed: 15 * 256,
    goods: 0,
    specialGoods: 0,
    crew,
    monthsAtSea: 0,
  };
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

// The rest of 0x1F803 after the fresh fleet: captured pirates are freed
// (0x4720A cleared), and the difficulty drops one level unless it is already
// Apprentice, so you return "as an apprentice/journeyman/... captain".
export function releaseFromCaptivity(player, difficulty) {
  return {
    player: { ...player, capturedCaptains: (player.capturedCaptains ?? []).filter(({ pirate }) => !pirate) },
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
