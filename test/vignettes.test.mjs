import assert from 'node:assert/strict';
import { test } from 'node:test';
import { drawVignette, vignetteDescription, vignetteShape, vignetteSize, VIGNETTE_FRAME_WIDTH } from '../src/vignettes.mjs';

// Every scene the dialogs show (SCENE_ART_URLS, plus the governor, the
// reunion and the sighted ship's two pictures).
const SCENES = [
  'governor', 'villain-news', 'prize-plunder', 'enemy-destroyed', 'divide-plunder', 'tavern', 'merchant', 'shipwright',
  'barmaid', 'bartender', 'traveller', 'map-seller', 'harbour-arrival', 'shore-arrival', 'port-quay', 'town-square',
  'shipwreck', 'marooned', 'open-court', 'open-plantation', 'open-quarterdeck', 'open-boarded', 'open-landfall',
  'open-prison', 'open-night-raid', 'open-buccaneers', 'open-colony', 'open-swords', 'open-chart', 'sailing-master',
  'dig-found', 'dig-nothing', 'reunion', 'lost-city-inca', 'lost-city-aztec', 'lost-city-olmec', 'lost-city-maya',
  'sail-ho', 'sail-nearer', 'sail-colours', 'boarding', 'hostage-talks', 'crew-recruits', 'treasure-fleet',
  'silver-train', 'mutiny', 'prison', 'hall-of-fame', 'alley-duel', 'retire-1', 'retire-2', 'retire-3', 'retire-4',
  'land-attack', 'fort-walls', 'sinking', 'outrun', 'nightfall', 'title-ship',
  'governor-daughter', 'governor-niece', 'wedding', 'merchant-daughter',
];
const OPTIONS = { flag: 'Spain', era: '1600', nation: 'Spain', ship: 'Galleon' };

// A context that records the colour of each art pixel painted.
function paintedPixels(id) {
  const { width, height } = vignetteSize(id);
  const painted = new Map();
  let colour = '';
  drawVignette({
    clearRect() {},
    set fillStyle(value) { colour = value; },
    fillRect(x, y, w, h) {
      for (let row = 0; row < h; row += 1) {
        for (let column = 0; column < w; column += 1) painted.set((y + row) * width + x + column, colour);
      }
    },
  }, id, OPTIONS);
  return { painted, width, height };
}

test('every scene has a picture shape and describes its art', () => {
  for (const id of SCENES) {
    assert.ok(['landscape', 'portrait', 'title'].includes(vignetteShape(id)), id);
    assert.match(vignetteDescription(id, OPTIONS), /\S/, `${id} has no description`);
  }
});

test('until its art loads, a picture is an empty dark area in its frame, with no code-drawn stand-in', () => {
  for (const id of SCENES) {
    const { painted, width, height } = paintedPixels(id);
    const inside = new Set();
    for (let y = VIGNETTE_FRAME_WIDTH; y < height - VIGNETTE_FRAME_WIDTH; y += 1) {
      for (let x = VIGNETTE_FRAME_WIDTH; x < width - VIGNETTE_FRAME_WIDTH; x += 1) {
        assert.ok(painted.has(y * width + x), `${id} leaves (${x}, ${y}) unpainted`);
        inside.add(painted.get(y * width + x));
      }
    }
    assert.deepEqual([...inside], ['#21180f'], `${id} draws more than an empty picture`);
  }
});

test('the governor portrait cell follows the era and the nation', async () => {
  const { governorCell, loadVignetteArt, vignetteNeedsArt } = await import('../src/vignettes.mjs');
  assert.deepEqual(governorCell({ era: '1560', nation: 'Spain' }), { x: 0, y: 0 });
  assert.deepEqual(governorCell({ era: '1680', nation: 'France' }), { x: 192, y: 640 });
  // Saves may hold the era as a number.
  assert.deepEqual(governorCell({ era: 1640, nation: 'Holland' }), { x: 288, y: 384 });
  assert.equal(governorCell({ era: '1680', nation: 'pirate' }), null);
  assert.equal(governorCell({ era: '1700', nation: 'Spain' }), null);
  assert.equal(governorCell(), null);
  // Without a DOM the art never loads.
  await loadVignetteArt('governor');
  assert.equal(vignetteNeedsArt('governor'), true);
  assert.equal(vignetteNeedsArt('traveller'), true);
  assert.equal(vignetteNeedsArt('tavern'), true);
  assert.match(vignetteDescription('governor', { era: '1680', nation: 'France' }), /^Portrait of the French governor in the dress of the 1680s/);
});

test('the harbour arrival and the quay pick their sheet row by the fort flag and era', async () => {
  const { harbourRow } = await import('../src/vignettes.mjs');
  assert.equal(harbourRow({ flag: 'Spain', era: '1560' }), 0);
  assert.equal(harbourRow({ flag: 'England', era: '1680' }), 1);
  assert.equal(harbourRow({ flag: 'France', era: '1620' }), 2);
  assert.equal(harbourRow({ flag: 'Holland', era: '1640' }), 3);
  assert.equal(harbourRow({ flag: 'Holland', era: 1660 }), 4);
  assert.equal(harbourRow({ flag: 'pirate', era: '1660' }), null);
  // The fort-flag scenes describe the town's flag.
  assert.match(vignetteDescription('harbour-arrival', { flag: 'England', era: '1600' }), /St George’s red cross/);
  assert.match(vignetteDescription('fort-walls', { flag: 'Holland', era: '1660' }), /States flag/);
  assert.match(vignetteDescription('reunion', { female: false }), /grey-bearded old man/);
});

test('the title logo spells Retro in outlined pixel letters inside its canvas', async () => {
  const { RETRO_LOGO_SIZE, drawRetroLogo } = await import('../src/title-logo.mjs');
  const fills = new Map();
  let colour = '';
  drawRetroLogo({
    clearRect() {},
    set fillStyle(value) { colour = value; },
    fillRect(x, y, w, h) {
      assert.ok(x >= 0 && y >= 0 && x + w <= RETRO_LOGO_SIZE.width && y + h <= RETRO_LOGO_SIZE.height, `(${x}, ${y}) is outside the logo`);
      fills.set(`${x},${y}`, colour);
    },
  });
  const colours = new Set(fills.values());
  assert.ok(colours.has('#21180f'), 'the letters have a dark outline');
  assert.ok(colours.size >= 5, 'the letters are banded, not flat');
  assert.deepEqual(RETRO_LOGO_SIZE, { width: 39, height: 11 });
});

test('the title picture keeps its 3 : 2 artwork inside the frame', () => {
  assert.deepEqual(vignetteSize('title-ship'), { width: 240 + 2 * VIGNETTE_FRAME_WIDTH, height: 160 + 2 * VIGNETTE_FRAME_WIDTH });
});

test('dialog pictures stay whole and framed at a whole-number scale that fits', async () => {
  const { dialogPictureLayout, vignetteSize } = await import('../src/vignettes.mjs');
  const boxes = [[976, 553], [1416, 876], [749, 548], [1656, 676], [788, 1038], [382, 772]];
  for (const id of ['merchant', 'tavern', 'arrival']) {
    const framed = vignetteSize(id);
    for (const [width, height] of boxes) {
      for (const table of [false, true]) {
        const narrow = width < 761;
        const layout = dialogPictureLayout(id, { width, height, narrow, table });
        assert.ok(Number.isInteger(layout.scale) && layout.scale >= 1);
        assert.deepEqual([layout.width, layout.height], [framed.width * layout.scale, framed.height * layout.scale]);
        if (layout.scale > 1) assert.ok(layout.width <= width && layout.height <= height, `${id} ${width}×${height}`);
      }
    }
  }
  // Laptop 1000×577 (inner box 964×541): the merchant beside his table, the
  // harbour in the corner; a pinned bar's room caps a portrait's height.
  assert.equal(dialogPictureLayout('merchant', { width: 964, height: 541, table: true }).scale, 2);
  assert.equal(dialogPictureLayout('merchant', { width: 964, height: 541 }).scale, 3);
  assert.equal(dialogPictureLayout('merchant', { width: 964, height: 541, room: 390 }).scale, 2);
  assert.equal(dialogPictureLayout('arrival', { width: 964, height: 541 }).scale, 2);
  assert.equal(dialogPictureLayout('tavern', { width: 382, height: 772, narrow: true, maxScale: 1 }).scale, 1);
});

test('the sighted ship\'s picture follows her type and the era band', async () => {
  const { sightedShipArt, vignetteNeedsArt, vignetteDescription: describe } = await import('../src/vignettes.mjs');
  assert.equal(sightedShipArt({ ship: 'Galleon', era: '1560' }), 'early-galleon');
  assert.equal(sightedShipArt({ ship: 'Cargo fluyt', era: 1600 }), 'early-fluyt');
  assert.equal(sightedShipArt({ ship: 'War galleon', era: '1620' }), 'mid-wargalleon');
  // Before 1660 the frigate is the original's fast galleon.
  assert.equal(sightedShipArt({ ship: 'Frigate', era: '1640' }), 'mid-fastgalleon');
  assert.equal(sightedShipArt({ ship: 'Frigate', era: '1660' }), 'late-frigate');
  assert.equal(sightedShipArt({ ship: 'Merchantman', era: '1680' }), 'late-merchantman');
  assert.equal(sightedShipArt({ ship: 'Sloop', era: '1640' }), 'sloop');
  assert.equal(sightedShipArt({ ship: 'Barque', era: '1560' }), 'barque');
  assert.equal(sightedShipArt({ ship: 'Canoe', era: '1600' }), null);
  assert.equal(sightedShipArt({ ship: 'Galleon' }), null);
  // Without a DOM the art never loads.
  assert.equal(vignetteNeedsArt('sail-nearer', { ship: 'Galleon', era: '1620' }), true);
  assert.match(describe('sail-nearer', { ship: 'Galleon', era: '1620' }), /^A towering, gilded Spanish treasure galleon.*no colours/);
});

test('every sighted ship\'s picture is in the repository', async () => {
  const { existsSync } = await import('node:fs');
  const { sightedShipArt } = await import('../src/vignettes.mjs');
  const scenarios = JSON.parse((await import('node:fs')).readFileSync(new URL('../assets/scenarios.json', import.meta.url)));
  for (const [era, data] of Object.entries(scenarios.eras)) {
    const ships = new Set([data.treasureFleet[0], ...Object.values(data.encounters).flat().map((entry) => entry[0])]);
    for (const ship of ships) {
      const key = sightedShipArt({ ship, era });
      assert.ok(key, `${ship} in ${era} has no picture`);
      assert.ok(existsSync(new URL(`../assets/vignettes/ships/${key}.png`, import.meta.url)), `${key}.png is missing`);
    }
  }
});

test('the ship\'s colours follow the nation, the era and her role', async () => {
  const { colourFlag, colourStern, COLOUR_FLAGS, vignetteNeedsArt, vignetteDescription: describe } = await import('../src/vignettes.mjs');
  const { readFileSync } = await import('node:fs');
  const sheet = JSON.parse(readFileSync(new URL('../assets/vignettes/colours/flags.json', import.meta.url)));
  assert.deepEqual(sheet.flags, COLOUR_FLAGS);
  assert.equal(colourFlag({ flag: 'Spain', era: '1560', kind: 8 }), 'spain-burgundy');
  // The royal arms became the Spanish navy's ensign in the 1670s.
  assert.equal(colourFlag({ flag: 'Spain', era: '1680', kind: 8 }), 'spain-arms');
  assert.equal(colourFlag({ flag: 'Spain', era: '1680', kind: 4 }), 'spain-burgundy');
  // England: St George's cross before the stern ensign, striped ensigns to
  // about 1625, the red ensign after.
  assert.equal(colourFlag({ flag: 'England', era: '1560', kind: 8 }), 'england-george');
  assert.equal(colourFlag({ flag: 'England', era: 1600, kind: 8 }), 'england-striped');
  assert.equal(colourFlag({ flag: 'England', era: '1620', kind: 3 }), 'england-striped');
  assert.equal(colourFlag({ flag: 'England', era: '1640', kind: 3 }), 'england-red-ensign');
  assert.equal(colourFlag({ flag: 'France', era: '1560', kind: 8 }), 'france-lilies');
  assert.equal(colourFlag({ flag: 'France', era: '1620', kind: 8 }), 'france-white');
  assert.equal(colourFlag({ flag: 'France', era: '1620', kind: 3 }), 'france-blue-cross');
  assert.equal(colourFlag({ flag: 'France', era: '1640', kind: 6 }), 'france-white');
  assert.equal(colourFlag({ flag: 'France', era: '1680', kind: 5 }), 'france-blue-cross');
  assert.equal(colourFlag({ flag: 'Holland', era: '1640', kind: 8 }), 'holland-prince');
  assert.equal(colourFlag({ flag: 'Holland', era: '1660', kind: 4 }), 'holland-states');
  assert.equal(colourFlag({ flag: 'pirate', era: '1620', kind: 7 }), 'pirate-red');
  // A named pirate flies his own colours, one per surname.
  assert.equal(colourFlag({ flag: 'pirate', captainId: 2 * 64 + 3 * 8 + 5 }), 'pirate-19');
  assert.equal(colourFlag({ flag: 'pirate', captainId: 0x8000 | (7 << 3) }), 'pirate-7');
  assert.equal(colourFlag({ colours: 'pirate-31' }), 'pirate-31');
  assert.equal(colourFlag({ colours: 'pirate-32' }), null);
  assert.equal(colourStern({ ship: 'Sloop', era: '1680' }), 'stern-small');
  assert.equal(colourStern({ ship: 'Galleon', era: '1600' }), 'stern-early');
  assert.equal(colourStern({ ship: 'Frigate', era: '1640' }), 'stern-mid');
  assert.equal(colourStern({ ship: 'Merchantman', era: '1660' }), 'stern-late');
  // Without a DOM the art never loads.
  assert.equal(vignetteNeedsArt('sail-colours', { flag: 'Spain', era: '1600' }), true);
  assert.match(describe('sail-colours', { flag: 'Spain', era: '1600' }), /colours: the Cross of Burgundy/);
});

test('every name a pirate can carry has its own colours', async () => {
  const { colourFlag } = await import('../src/vignettes.mjs');
  const { missionPirateId } = await import('../src/mechanics.mjs');
  const seen = new Map();
  const add = (id) => {
    const flag = colourFlag({ flag: 'pirate', captainId: id });
    const name = `${(id & 0xff) >> 3}`;
    assert.ok(!seen.has(flag) || seen.get(flag) === name, `${flag} is shared by two surnames`);
    seen.set(flag, name);
  };
  // Hunters: rows 0-4 of each nation's surnames; mission pirates: 0x8000 ids.
  for (let nation = 0; nation < 4; nation += 1) for (let row = 0; row < 5; row += 1) add(64 * nation + row * 8 + 1);
  for (let nation = 0; nation < 4; nation += 1) for (let pick = 0; pick < 4; pick += 1) add(missionPirateId(nation, { int: () => pick }));
  for (const flag of seen.keys()) assert.match(flag, /^pirate-([0-9]|[12][0-9]|3[01])$/);
});
