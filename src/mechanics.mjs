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

export function driftClouds({ clouds, playerX, playerY, wind, rng }) {
  const angle = wind / 256 * Math.PI * 2;
  const halfWidth = 320 / SAILING_PIXELS_PER_CELL;
  const halfHeight = 240 / SAILING_PIXELS_PER_CELL;
  return clouds.map((cloud) => {
    const pixelsPerTick = (4 * cloud.index + 6) * 2 / 8;
    let x = cloud.x + Math.sin(angle) * pixelsPerTick / SAILING_PIXELS_PER_CELL;
    let y = cloud.y - Math.cos(angle) * pixelsPerTick / SAILING_PIXELS_PER_CELL;
    if (Math.abs(x - playerX) > halfWidth || Math.abs(y - playerY) > halfHeight) {
      // The original always returns an escaped cloud at the right edge, even
      // during the rare easterly wind that may immediately carry it out again.
      x = playerX + halfWidth;
      y = playerY + (rng.unit() * 2 - 1) * halfHeight;
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
    next.goods = Math.min(next.goods, cargoCapacity);
    next.foodFixed = Math.min(next.foodFixed, Math.max(0, cargoCapacity - next.goods) * 256);
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
  // a ton apiece. The web port's two commodity piles are combined afterwards.
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
    goods: firstGoods + secondGoods,
    cannon,
  };
}

export function capturedTownPlunder({ town, rng }) {
  const baseGold = Math.floor((town.gold * 1500) / (town.alert + 15));
  const food = rng.int(town.growth);
  const goods = rng.int(town.growth) + rng.int(town.growth);
  rng.int(town.growth); // The fourth decoded pile is overwritten by fort guns.
  return {
    gold: baseGold * 10,
    food,
    // ASSUMED economy bridge: the web port has not split European goods from
    // hides/tobacco/sugar yet, so both documented town piles become goods.
    goods,
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
    monthsAtSea: division.monthsAtSea,
    capturedCaptains: [],
  };
}

export function merchantFoodPrice({ growth, month, producesFood, familyDiscount = false }) {
  const season = (6 + Math.abs(6 - month)) / 6;
  const effectiveGrowth = growth * season;
  let price = Math.floor(effectiveGrowth / 50 + 3);
  if (producesFood) price = Math.floor(price / 2) + 1;
  price = Math.floor(price * 10 * 1.5);
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
