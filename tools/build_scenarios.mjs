#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const [sourceDirectory, destination] = process.argv.slice(2);
if (!sourceDirectory || !destination) {
  console.error('usage: node tools/build_scenarios.mjs EVIDENCE_DATA assets/scenarios.json');
  process.exit(2);
}

const readJson = async (name) => JSON.parse(await readFile(path.join(sourceDirectory, name), 'utf8'));
const towns = await readJson('towns_by_era.json');
const speeds = await readJson('speed_tables.json');
const templates = await readJson('ship_templates.json');
const starts = await readJson('start_records.json');
const convoyRoutes = await readJson('fleet_train_routes.json');
const triggers = await readJson('town_triggers_by_era.json');
const eras = {};
const eraOrder = Object.keys(speeds);
const shipNames = ['Pinnace', 'Sloop', 'Barque', 'Cargo fluyt', 'Merchantman', 'Frigate', 'War galleon', 'Galleon'];
const startNations = ['England', 'France', 'Holland', 'Spain'];

function decodeStart(start) {
  const shipBytes = start.ship_bytes.match(/../g).map((value) => Number.parseInt(value, 16));
  return {
    name: start.name, crew: start.crew, cannon: start.cannon, gold: start.gold,
    food: start.food, goods: start.goods,
    ships: shipBytes.slice(0, start.ships).map((type) => shipNames[type & 7]),
    favour: start.favour, ranks: start.ranks, diplomacy: start.diplomacy,
    points: start.start_points,
  };
}

for (const [eraIndex, era] of eraOrder.entries()) {
  const eraStarts = Object.fromEntries(startNations
    .map((nation, nationality) => [nation, starts[eraIndex * 4 + nationality]])
    .filter(([, start]) => start.name && start.ships > 0)
    .map(([nation, start]) => [nation, decodeStart(start)]));
  const allEraTowns = towns.filter((entry) => String(entry.era) === era);
  const eraTowns = allEraTowns.filter((entry) => entry.name !== 'Florida Channel');
  const portIndexByRecord = new Map(allEraTowns.map((entry, index) => [index, eraTowns.indexOf(entry)]));
  eras[era] = {
    diplomacyK: templates[era].diplomacy_K,
    merchantThreshold: templates[era].byte_0xF9,
    convoyRoutes: {
      treasureFleet: convoyRoutes[era].treasure_fleet,
      silverTrain: convoyRoutes[era].silver_train,
    },
    starts: eraStarts,
    towns: eraTowns.map((entry) => ({
      name: entry.name, x: entry.x, y: entry.y, nation: entry.nation,
      forts: entry.w4, soldiers: entry.w5, population: entry.w6,
      gold: entry.w7, growth: entry.w8, flags: entry.flags, mood: entry.w9,
      harbors: [[entry.harbor1_x, entry.harbor1_y], [entry.harbor2_x, entry.harbor2_y]],
    })),
    // [cellX, cellY, townIndex] in the original table order; townIndex points
    // into `towns` above (the Florida Channel pseudo-towns have no cells).
    townTriggers: triggers
      .filter((entry) => String(entry.era) === era)
      .sort((a, b) => a.entry - b.entry)
      .map((entry) => {
        const townIndex = portIndexByRecord.get(entry.town_idx);
        if (townIndex === undefined || townIndex < 0 || eraTowns[townIndex].name !== entry.town) {
          throw new Error(`trigger ${era}/${entry.entry} names ${entry.town}, which is not a port town`);
        }
        return [entry.x, entry.y, townIndex];
      }),
    speeds: speeds[era],
    encounters: Object.fromEntries(['Spain', 'England', 'France', 'Holland'].map((nation) => [
      nation,
      templates[era].templates[nation].map((entry) => [
        entry.ship, entry.flag, entry['b2_crew?'], entry['b3_guns?'], entry.b4_kind, entry['b5_gold?'], entry.b6,
      ]),
    ])),
  };
}

await mkdir(path.dirname(destination), { recursive: true });
await writeFile(destination, `${JSON.stringify({ version: 5, eras })}\n`);
console.log(`wrote ${Object.keys(eras).length} eras to ${destination}`);
