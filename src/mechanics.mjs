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

export function capturedTownPlunder({ town, rng }) {
  const baseGold = Math.floor((town.gold * 1500) / (town.alert + 15));
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

// Event 2 at 0x28537 with zero days left, traced through 0x1F044: the
// whole-ton food word becomes 5 (the fraction byte stays), and a third of
// the crew deserts, never the last man, taking a proportional share of the
// party's gold.
export function starvationDesertion({ crew, partyGold, foodFixed }) {
  const deserters = Math.min(Math.trunc(crew / 3), Math.max(0, crew - 1));
  const goldLost = crew > 0 ? Math.trunc((deserters * partyGold) / crew) : 0;
  return {
    deserters,
    goldLost,
    crew: crew - deserters,
    partyGold: partyGold - goldLost,
    foodFixed: 5 * 256 + (foodFixed & 0xff),
  };
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

// town_dist is measured to the town record's (x, y), not to a trigger cell,
// and a distance of 0 counts as 1 (0x23E0E–0x23E4C).
export function townDistanceCells(town, cellX, cellY) {
  return Math.max(1, Math.abs(town.x - cellX) + Math.abs(town.y - cellY));
}

export function chooseEncounterTier({ crew, alert, governorMood, rng }) {
  const range = Math.floor(crew / 50 + alert / 6 - governorMood);
  if (range <= 0) return 0;
  return Math.min(4, Math.floor(rng.int(range) / 3));
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
