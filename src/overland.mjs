// Landing, walking on land, re-boarding, reefs and digging for treasure.
// DOM-free rules from ../piratesgold/docs/landing_and_overland.md,
// porting_guide.md §8, §9 and §18, and treasure_fleet_silver_train.md §4.
//
// Positions here are world cells (16 original map pixels per cell), as in the
// rest of the port; the original keeps pixels with 1/8 remainders.

export const ORIGINAL_PIXELS_PER_CELL = 16;

// Direction bits 0x454A0: 1 W, 2 E, 4 N, 8 S.
export const DIR = Object.freeze({ WEST: 1, EAST: 2, NORTH: 4, SOUTH: 8 });

// 0x1B210: a direction key sets the walk vector to ±150 per axis; each axis
// becomes a step of -1, 0 or +1 outside a ±50 dead zone.
export const WALK_VECTOR_LIMIT = 150;
export const WALK_DEAD_ZONE = 50;

// 0x235C1: x8 += 4 · step, i.e. ½ px (1/32 cell) per axis per tick, so the
// party covers 2 cells a day on each axis whatever the terrain.
export const PARTY_CELLS_PER_TICK = 0.5 / ORIGINAL_PIXELS_PER_CELL;

// 0x23C1C: the party re-boards only by stepping onto water within 10 px of
// the exact landing spot.
export const REBOARD_REACH_CELLS = 10 / ORIGINAL_PIXELS_PER_CELL;

// 0x2405D: one big ship is lost per 100 ticks in shallows.
export const REEF_COOLDOWN_TICKS = 100;

// walk_vector_by_heading16 (0x33D24): set whenever the heading is set
// (0x1B565), so landing starts the party walking the way the ship sailed.
const WALK_VECTOR_BY_HEADING16 = [
  [0, -75], [35, -75], [75, -75], [75, -35], [75, 0], [75, 35], [75, 75], [35, 75],
  [0, 75], [-35, 75], [-75, 75], [-75, 35], [-75, 0], [-75, -35], [-75, -75], [-35, -75],
];

// board_heading_by_dir_bits (0x367AC): heading on re-boarding, the way the
// party was walking; no direction held gives north.
const BOARD_HEADING_BY_DIR_BITS = [0, 192, 64, 0, 0, 224, 32, 0, 128, 160, 96, 0, 0, 0, 0, 0];

export function walkVectorForHeading(heading) {
  const [x, y] = WALK_VECTOR_BY_HEADING16[(heading & 0xff) >> 4];
  return { x, y };
}

// The eight direction keys of 0x1B210. Opposite directions cancel. Returns
// null when nothing is held, so the previous vector persists.
export function walkVectorForDirections({ west = false, east = false, north = false, south = false }) {
  const x = (Number(east) - Number(west)) * WALK_VECTOR_LIMIT;
  const y = (Number(south) - Number(north)) * WALK_VECTOR_LIMIT;
  return x === 0 && y === 0 ? null : { x, y };
}

export function walkStep(vector) {
  const axis = (value) => (value > WALK_DEAD_ZONE ? 1 : value < -WALK_DEAD_ZONE ? -1 : 0);
  const dx = axis(vector?.x ?? 0);
  const dy = axis(vector?.y ?? 0);
  const dirBits = (dx < 0 ? DIR.WEST : 0) | (dx > 0 ? DIR.EAST : 0)
    | (dy < 0 ? DIR.NORTH : 0) | (dy > 0 ? DIR.SOUTH : 0);
  return { dx, dy, dirBits };
}

export function boardingHeading(dirBits) {
  return BOARD_HEADING_BY_DIR_BITS[dirBits & 15];
}

// Every land/sea switch and every blocked step into water on foot does
// tick |= 31, rounding the voyage clock up to the next half day (§5.1).
export function roundUpToHalfDay(voyageTick) {
  return voyageTick | 31;
}

export function withinReboardReach(x, y, landingX, landingY) {
  return Math.abs(x - landingX) <= REBOARD_REACH_CELLS && Math.abs(y - landingY) <= REBOARD_REACH_CELLS;
}

// One on-foot move (porting_guide.md §8). `isLand(x, y)` classifies the map
// pixel; arrival at a town is checked by the caller before this result is
// applied. Returns the new position and what happened:
//   'walk'    the party moved on land;
//   'idle'    no direction is held;
//   'blocked' water ahead and not at the landing spot: the party stays and
//             the clock rounds up to the next half day;
//   'board'   water at the landing spot: back aboard at the ship.
export function stepOnFoot({ party, walk, ship, landing, isLand, bounds }) {
  const { dx, dy, dirBits } = walkStep(walk);
  const x = clampTo(party.x + dx * PARTY_CELLS_PER_TICK, bounds.minX, bounds.maxX);
  const y = clampTo(party.y + dy * PARTY_CELLS_PER_TICK, bounds.minY, bounds.maxY);
  // toX/toY: where the step went, for the town-arrival check that precedes
  // the land/sea switch.
  const move = { dirBits, toX: x, toY: y };
  if (dx === 0 && dy === 0) return { outcome: 'idle', x: party.x, y: party.y, ...move };
  if (isLand(x, y)) return { outcome: 'walk', x, y, ...move };
  if (withinReboardReach(x, y, landing.x, landing.y)) {
    return { outcome: 'board', x: ship.x, y: ship.y, heading: boardingHeading(dirBits), ...move };
  }
  return { outcome: 'blocked', x: party.x, y: party.y, ...move };
}

function clampTo(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// fleet_row 0x4D28C = max(type & 7) over the fleet.
export function fleetRow(ships, shipStats) {
  return ships.reduce((row, ship) => Math.max(row, shipStats[ship.type].type), 0);
}

// 0x2405D: aboard, on a shallow pixel, with any ship bigger than a sloop and
// the cooldown run out, the last such ship in the fleet list is wrecked.
// Returns that slot, or -1 when the reef spares the fleet.
export function reefVictim({ onFoot, shallow, cooldown, ships, shipStats }) {
  if (onFoot || !shallow || cooldown > 0 || fleetRow(ships, shipStats) <= 1) return -1;
  for (let slot = ships.length - 1; slot >= 0; slot -= 1) {
    if (shipStats[ships[slot].type].type > 1) return slot;
  }
  return -1;
}

// Event 3 (0x28617): men who no longer fit in the remaining ships go down
// with the wreck; max crew is 32·(T + 2) per ship.
export function crewAfterReef(crew, ships, shipStats) {
  const room = ships.reduce((sum, ship) => sum + 32 * (shipStats[ship.type].type + 2), 0);
  return Math.min(crew, room);
}

// Treasure maps (0x47186, porting_guide.md §18): three records. Pieces are
// the bits 1, 2, 4, 8 (quarters of the map); any piece marks the map active.
export const MAP_KIND = Object.freeze({ BURIED: 0, RELATIVE: 1, LOST_CITY: 2 });
export const COMPLETE_MAP = 15;
export const RELATIVE_NAMES = ['sister', 'father', 'niece', 'uncle'];
export const LOST_CITY_NAMES = ['Incan', 'Aztec', 'Olmec', 'Mayan'];

export function emptyMapRecord() {
  return { pieces: 0, site: null, townIndex: null, city: 0 };
}

export function emptyMapRecords() {
  return [emptyMapRecord(), emptyMapRecord(), emptyMapRecord()];
}

export function mapPieceCount(record) {
  let count = 0;
  for (let bit = 1; bit <= 8; bit <<= 1) if (record.pieces & bit) count += 1;
  return count;
}

// give_piece(n) (0x1F08A). A new map rolls its site from `sites` until the
// site's nearest town is neither the current town nor any map's town; more
// pieces never move it. Apprentice gets the whole map at once.
// The check (0x1F11F-0x1F13E) compares the +8 town of all three records,
// whether or not they hold pieces, including this record's own: a dug map
// keeps its town (the dig clears only the pieces word), so a new map never
// starts near a town an earlier map pointed to.
// ASSUMED: a record that never held a map has no town. In the original its
// +8 word is presumably 0 from the new-game reset, which would also exclude
// town 0 until all three records have been used; the port does not.
export function giveMapPiece({ records, kind, sites, nearestTown, currentTownIndex, difficulty, relativesRescued = 0, rng }) {
  const next = records.map((record) => ({ ...record }));
  const record = next[kind];
  if (kind === MAP_KIND.LOST_CITY) record.city = relativesRescued;
  if (record.pieces === 0) {
    const taken = new Set(next.map(({ townIndex }) => townIndex).filter((townIndex) => townIndex !== null));
    for (let attempt = 0; ; attempt += 1) {
      const site = sites[rng.int(sites.length)];
      const townIndex = nearestTown(site[0], site[1]);
      if ((townIndex !== currentTownIndex && !taken.has(townIndex)) || attempt >= 4096) {
        record.site = [site[0], site[1]];
        record.townIndex = townIndex;
        break;
      }
    }
  }
  if (record.pieces !== COMPLETE_MAP) {
    let bit;
    do bit = 1 << rng.int(4); while (record.pieces & bit);
    record.pieces |= bit;
  }
  if (difficulty === 0) record.pieces = COMPLETE_MAP;
  return next;
}

// dig(cell) (0xA801): any piece is enough, within one cell of the site on
// both axes. Each record found is cleared and reported; a relative's rescue
// also hands out a lost-city piece (before relatives_rescued is raised).
// Gold is party gold. The villain wipe that follows a rescue belongs to the
// family quest (K7) and is left to the caller.
// Not replicated: the original's gold amount [ebp-0x58] is not reset between
// records, so one dig that finds buried treasure and a relative at once pays
// the treasure twice (0xA80E, 0xABA0).
export function digForTreasure({ records, cellX, cellY, rng, relativesRescued = 0, giveLostCityPiece }) {
  let next = records.map((record) => ({ ...record }));
  let rescued = relativesRescued;
  const finds = [];
  for (const kind of [MAP_KIND.BURIED, MAP_KIND.RELATIVE, MAP_KIND.LOST_CITY]) {
    const record = next[kind];
    if (record.pieces === 0 || !record.site) continue;
    if (Math.abs(cellX - record.site[0]) > 1 || Math.abs(cellY - record.site[1]) > 1) continue;
    const find = { kind, townIndex: record.townIndex, gold: 0 };
    if (kind === MAP_KIND.BURIED) find.gold = (5 + rng.int(9)) * 1000;
    if (kind === MAP_KIND.LOST_CITY) { find.gold = 100000; find.city = record.city; }
    // 0xABB0 clears only the pieces word: the site and town stay.
    next[kind] = { ...record, pieces: 0 };
    if (kind === MAP_KIND.RELATIVE) {
      find.relative = rescued;
      if (giveLostCityPiece) next = giveLostCityPiece(next, rescued);
      rescued += 1;
    }
    finds.push(find);
  }
  return { records: next, finds, relativesRescued: rescued, gold: finds.reduce((sum, { gold }) => sum + gold, 0) };
}
