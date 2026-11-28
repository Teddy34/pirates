// Scene vignettes (docs/scene-vignettes.md): each dialog's picture, drawn
// whole from its real art (assets/vignettes/, PROVENANCE.md) inside the
// shared 8 px frame. There is no code-drawn stand-in: until a picture has
// loaded, the frame holds an empty dark picture area.

// Two picture shapes, both 128 art px tall: a 224 px landscape for places
// and events and a 96 px portrait (3 : 4) for people, both shown beside the
// dialog text on wide screens and above it on narrow ones.
export const VIGNETTE_FRAME_WIDTH = 8;
const PICTURE_SIZES = {
  landscape: { width: 224, height: 128 },
  portrait: { width: 96, height: 128 },
  // The title screen's picture keeps its 3 : 2 artwork whole.
  title: { width: 240, height: 160 },
};
const OUTLINE = '#21180f';
const GOLD = '#f2c55c';
const BRASS = '#d6a447';
const WOOD = '#5a3b22';
const WOOD_DARK = '#3b2b1d';
const WOOD_LIGHT = '#7a5a36';
// Each flag's field and mark, matching the nation colours of the map
// flags, shared with the landing party's sprites.
export const FLAGS = {
  Spain: ['#e0b33a', '#a8331f'], England: ['#f4f0e4', '#b8322a'], France: ['#2f4f9a', '#f4f0e4'],
  Holland: ['#e07a2a', '#2f4f9a'], pirate: ['#1b1b1b', '#f4f0e4'],
};

// The reunion has one picture per relative's sex; every other scene's art is
// keyed by its id.
function sceneArtKey(id, options = {}) {
  if (id === 'reunion') return options.female === false ? 'reunion-male' : 'reunion-female';
  return id;
}

// The picture's text for screen readers. It describes the art, also while
// the picture is still loading.
export function vignetteDescription(id, options = {}) {
  if (id === 'governor') {
    return governorCell(options) ? `Portrait of the ${NATION_ADJECTIVES[options.nation]} governor in the dress of the ${options.era}s, pixelated from a period painting.` : 'Portrait of the governor.';
  }
  if (FORT_FLAG_SCENES[id]) return FORT_FLAG_SCENES[id](HARBOUR_FLAGS[harbourRow(options) ?? 0][1]);
  if (id === 'sail-colours') {
    const flag = colourFlag(options);
    return flag ? `Close under her carved stern, the ship shows her colours: ${COLOUR_DESCRIPTIONS[flag]}, pixelated from a comic-style illustration.` : 'Close under her carved stern, the ship shows her colours.';
  }
  if (id === 'sail-nearer') {
    const key = sightedShipArt(options);
    return `${key ? SHIP_ART_DESCRIPTIONS[key] : 'A ship'} under sail, seen past the ship’s rail, flying no colours yet, pixelated from a comic-style illustration.`;
  }
  return ART_DESCRIPTIONS[sceneArtKey(id, options)] ?? '';
}

// The governor's portrait follows the era and the town's nation
// (docs/governor-dress-1560-1680.md). Each is a public-domain period painting
// pixelated by tools/build_governor_portraits.py into one sheet of 96 x 128
// cells: a column per nation, a row per era. Sources are listed in
// assets/vignettes/PROVENANCE.md.
const GOVERNOR_SHEET_URL = new URL('../assets/vignettes/governors.png', import.meta.url).href;
export const GOVERNOR_NATIONS = ['Spain', 'England', 'France', 'Holland'];
export const GOVERNOR_ERAS = ['1560', '1600', '1620', '1640', '1660', '1680'];
const NATION_ADJECTIVES = { Spain: 'Spanish', England: 'English', France: 'French', Holland: 'Dutch' };
let governorSheet = null;
let artLoading = null;

// Scenes with finished art (assets/vignettes/PROVENANCE.md), drawn whole
// into the picture area once loaded.
const SCENE_ART_URLS = {
  'title-ship': new URL('../assets/vignettes/title-ship.png', import.meta.url).href,
  'harbour-arrival': new URL('../assets/vignettes/harbour-arrival.png', import.meta.url).href,
  'port-quay': new URL('../assets/vignettes/port-quay.png', import.meta.url).href,
  merchant: new URL('../assets/vignettes/merchant.png', import.meta.url).href,
  barmaid: new URL('../assets/vignettes/barmaid.png', import.meta.url).href,
  bartender: new URL('../assets/vignettes/bartender.png', import.meta.url).href,
  'sail-ho': new URL('../assets/vignettes/sail-ho.png', import.meta.url).href,
  'sailing-master': new URL('../assets/vignettes/sailing-master.png', import.meta.url).href,
  'open-swords': new URL('../assets/vignettes/open-swords.png', import.meta.url).href,
  'open-chart': new URL('../assets/vignettes/open-chart.png', import.meta.url).href,
  'open-buccaneers': new URL('../assets/vignettes/open-buccaneers.png', import.meta.url).href,
  'open-quarterdeck': new URL('../assets/vignettes/open-quarterdeck.png', import.meta.url).href,
  'open-court': new URL('../assets/vignettes/open-court.png', import.meta.url).href,
  'open-plantation': new URL('../assets/vignettes/open-plantation.png', import.meta.url).href,
  'open-boarded': new URL('../assets/vignettes/open-boarded.png', import.meta.url).href,
  'open-landfall': new URL('../assets/vignettes/open-landfall.png', import.meta.url).href,
  'open-prison': new URL('../assets/vignettes/open-prison.png', import.meta.url).href,
  'open-night-raid': new URL('../assets/vignettes/open-night-raid.png', import.meta.url).href,
  'open-colony': new URL('../assets/vignettes/open-colony.png', import.meta.url).href,
  tavern: new URL('../assets/vignettes/tavern.png', import.meta.url).href,
  'divide-plunder': new URL('../assets/vignettes/divide-plunder.png', import.meta.url).href,
  shipwright: new URL('../assets/vignettes/shipwright.png', import.meta.url).href,
  'governor-daughter': new URL('../assets/vignettes/governor-daughter.png', import.meta.url).href,
  'governor-niece': new URL('../assets/vignettes/governor-niece.png', import.meta.url).href,
  wedding: new URL('../assets/vignettes/wedding.png', import.meta.url).href,
  'merchant-daughter': new URL('../assets/vignettes/merchant-daughter.png', import.meta.url).href,
  'crew-recruits': new URL('../assets/vignettes/crew-recruits.png', import.meta.url).href,
  traveller: new URL('../assets/vignettes/traveller.png', import.meta.url).href,
  'map-seller': new URL('../assets/vignettes/map-seller.png', import.meta.url).href,
  'villain-news': new URL('../assets/vignettes/villain-news.png', import.meta.url).href,
  'dig-found': new URL('../assets/vignettes/dig-found.png', import.meta.url).href,
  'dig-nothing': new URL('../assets/vignettes/dig-nothing.png', import.meta.url).href,
  'reunion-female': new URL('../assets/vignettes/reunion-female.png', import.meta.url).href,
  'reunion-male': new URL('../assets/vignettes/reunion-male.png', import.meta.url).href,
  'lost-city-inca': new URL('../assets/vignettes/lost-city-inca.png', import.meta.url).href,
  'lost-city-aztec': new URL('../assets/vignettes/lost-city-aztec.png', import.meta.url).href,
  'lost-city-olmec': new URL('../assets/vignettes/lost-city-olmec.png', import.meta.url).href,
  'lost-city-maya': new URL('../assets/vignettes/lost-city-maya.png', import.meta.url).href,
  'shore-arrival': new URL('../assets/vignettes/shore-arrival.png', import.meta.url).href,
  'town-square': new URL('../assets/vignettes/town-square.png', import.meta.url).href,
  'land-attack': new URL('../assets/vignettes/land-attack.png', import.meta.url).href,
  'fort-walls': new URL('../assets/vignettes/fort-walls.png', import.meta.url).href,
  'boarding': new URL('../assets/vignettes/boarding.png', import.meta.url).href,
  'hostage-talks': new URL('../assets/vignettes/hostage-talks.png', import.meta.url).href,
  'prize-plunder': new URL('../assets/vignettes/prize-plunder.png', import.meta.url).href,
  'enemy-destroyed': new URL('../assets/vignettes/enemy-destroyed.png', import.meta.url).href,
  'sinking': new URL('../assets/vignettes/sinking.png', import.meta.url).href,
  'outrun': new URL('../assets/vignettes/outrun.png', import.meta.url).href,
  'nightfall': new URL('../assets/vignettes/nightfall.png', import.meta.url).href,
  'treasure-fleet': new URL('../assets/vignettes/treasure-fleet.png', import.meta.url).href,
  'silver-train': new URL('../assets/vignettes/silver-train.png', import.meta.url).href,
  shipwreck: new URL('../assets/vignettes/shipwreck.png', import.meta.url).href,
  marooned: new URL('../assets/vignettes/marooned.png', import.meta.url).href,
  'alley-duel': new URL('../assets/vignettes/alley-duel.png', import.meta.url).href,
  'hall-of-fame': new URL('../assets/vignettes/hall-of-fame.png', import.meta.url).href,
  mutiny: new URL('../assets/vignettes/mutiny.png', import.meta.url).href,
  prison: new URL('../assets/vignettes/prison.png', import.meta.url).href,
  'retire-1': new URL('../assets/vignettes/retire-1.png', import.meta.url).href,
  'retire-2': new URL('../assets/vignettes/retire-2.png', import.meta.url).href,
  'retire-3': new URL('../assets/vignettes/retire-3.png', import.meta.url).href,
  'retire-4': new URL('../assets/vignettes/retire-4.png', import.meta.url).href,
};
const ART_DESCRIPTIONS = {
  'treasure-fleet': 'In a sunlit harbour below a hilltop fort, barefoot sailors pass gold ingots, chests of coins and strings of pearls across a plank from a beaten royal galleon, shot-holed and flying a white flag with a red ragged saltire, into the glittering hold of the captain’s ship, while the captain in his blue coat holds up an ingot and the disarmed Spanish crew sits under guard, pixelated from a comic-style illustration.',
  'silver-train': 'In a dusty colonial street, a broken mule train spills silver bars and coins from its slashed packs as cheering buccaneers lift the bars overhead around the captain in his blue coat, and the escort soldiers in steel morions flee past a whitewashed church, pixelated from a comic-style illustration.',
  'boarding': 'Through thick gunsmoke two ships grind hull to hull, grapnels taut, as the captain in his blue coat leaps from the rail with his cutlass raised and his men swing across, while the enemy captain in a plumed hat draws his sword among soldiers in steel helmets, pixelated from a comic-style illustration.',
  'hostage-talks': 'In the lantern-lit stern cabin a bound enemy captain in a torn red coat and ruined lace collar leans over the table to whisper a secret, while the captain in his blue coat listens with his arms folded, a pistol and dividers on the chart between them, pixelated from a comic-style illustration.',
  'prize-plunder': 'On the deck of a captured ship grinning buccaneers hoist a chest from the hold, roll a cask and hold up a jewelled gold cross beside sacks of coin and bolts of silk, as the captain in his blue coat counts coins with the quartermaster and the beaten crew sits under guard, pixelated from a comic-style illustration.',
  'enemy-destroyed': 'At dusk, from behind the rail of their own ship, sailors shield their eyes as an enemy ship blows apart in a huge orange fireball, her masts and burning planks flying across a glowing sea, pixelated from a comic-style illustration.',
  'sinking': 'Under a stormy sky a shattered ship goes down by the stern, men leaping from her rail and clinging to spars, while the captain in his blue coat looks back from a crowded boat pulling away, pixelated from a comic-style illustration.',
  'outrun': 'A small ship under full sail heels through the whitecaps, her crew at the rail, while far behind a heavy warship fires a last shot whose splash falls short, pixelated from a comic-style illustration.',
  'nightfall': 'Under a crescent moon and the first stars, two distant ships drift apart on a dark sea, each with one lit stern lantern, the last red of sunset along the horizon, pixelated from a comic-style illustration.',
  shipwreck: 'Under a squally grey sky a three-masted ship lies driven onto a coral reef, her masts snapped and her sails in rags as the surf breaks over her, while sailors cling to a floating spar and haul a swimmer to it among barrels and crates, pixelated from a comic-style illustration.',
  'alley-duel': 'In a moonlit alley of whitewashed houses with wooden balconies and laundry lines, the captain in his blue coat crosses rapiers with a swordsman in a leather jerkin and broad black hat, as an old woman with a candle leans from a shutter and a cat bolts past a spilled bucket, pixelated from a comic-style illustration.',
  'hall-of-fame': 'In a wood-panelled hall hung with portraits of sea captains in breastplates and white collars, an empty gilded frame waits among them above a carved desk where a record book lies open beside a quill, an inkwell and a lit candle, pixelated from a comic-style illustration.',
  mutiny: 'At dawn on a ship’s quarterdeck the captain in his blue coat draws his cutlass alone at the rail as a huge bare-chested ringleader points a cutlass at him from the top of the ladder, an armed crew with an axe, knives and handspikes snarling behind him, pixelated from a comic-style illustration.',
  prison: 'In a vaulted stone cell lit by a barred window, the wounded captain, unshaven, a bloodied bandage on his arm, sits on straw beside his blue coat, a jug and a crust of bread, rows of tally marks scratched on the wall and a guard’s shadow with a pike on the iron-bound door, pixelated from a comic-style illustration.',
  'retire-1': 'At sunset outside a whitewashed, palm-thatched seaside cottage, the old grey captain in his faded, patched blue coat and red sash mends a fishing net on a bench, a clay pipe in his mouth and his old dog asleep at his feet, while a small rowing boat lies drawn up on the shingle and a ship sails past a distant fort, pixelated from a comic-style illustration.',
  'retire-2': 'Under a great shade tree on the stone terrace of a whitewashed plantation house, the old grey captain in a cream linen coat and red sash sits back in a carved armchair with a pewter cup, his hound beside him and his old cutlass hung on the chair, looking out over sugar cane fields falling to the bay and a lone sail on the sunset sea, pixelated from a comic-style illustration.',
  'retire-3': 'On the balcony of a whitewashed town house above a busy harbour at sunset, the old grey captain in a blue coat with gold buttons and a red sash points out his former flagship, a great three-masted galleon riding at anchor with her sails furled, while his laughing bald old shipmate raises a cup of wine beside him, pixelated from a comic-style illustration.',
  'retire-4': 'On a palace terrace above formal box-hedge gardens and a fountain at sunset, a crowned king in an ermine-lined blue mantle rests his hand on the shoulder of the old grey captain, now a nobleman in a crimson embroidered doublet with a gold chain and red sash, his plumed hat in his hand, pixelated from a comic-style illustration.',
  marooned: 'On a palm-fringed island beach the castaway captain, barefoot in a torn shirt, sits by a driftwood fire drinking from a coconut shell as two island men in cotton loincloths offer him papaya and grilled fish, while out in the bay a small two-masted ship lies at anchor and her boat rows in, pixelated from a comic-style illustration.',
  'dig-found': 'In a jungle clearing by a strange tall rock, three grinning sailors in a fresh pit of red earth lean over an iron-bound oak chest heaped with gold and silver coins, while the captain in his blue coat stands over them with the old map, pixelated from a comic-style illustration.',
  'dig-nothing': 'At sunset on a beach scarred with empty holes, one exhausted sailor slumps by a pit, another leans on his spade and a third flings down his hat, while the captain in his blue coat glares at a torn map, pixelated from a comic-style illustration.',
  'reunion-female': 'At the open gate of a plantation stockade a thin young woman in a patched bodice and linen coif, in tears of joy, embraces the captain in his blue coat, hat in his hand, as his sailors look on moved and broken chains lie on the ground, pixelated from a comic-style illustration.',
  'reunion-male': 'At the open gate of a plantation stockade a gaunt, grey-bearded old man in rags, barefoot and weeping, embraces the captain in his blue coat, hat in his hand, as his sailors look on moved and broken chains lie on the ground, pixelated from a comic-style illustration.',
  'lost-city-inca': 'In a sea cave beside the ribs of an old wreck, the captain and his torch-bearing sailors stare at Inca treasure spilling from broken chests: a gold sun disc with a face, gold llamas, tumi knives, gold and silver beakers and knotted quipu cords, pixelated from a comic-style illustration.',
  'lost-city-aztec': 'In a sea cave beside the ribs of an old wreck, the captain and his torch-bearing sailors stare at Aztec treasure: gold feathered serpents, a turquoise mosaic mask with shell eyes, jade beads and gold pendants, before a great carved stone calendar disc, pixelated from a comic-style illustration.',
  'lost-city-olmec': 'In a sea cave beside the ribs of an old wreck, the captain and his torch-bearing sailors stare at a colossal basalt head half buried in the sand, above broken chests of gold coins, green jade figures, a jade mask and polished jade celts, pixelated from a comic-style illustration.',
  'lost-city-maya': 'In a sea cave beside the ribs of an old wreck, the captain and his torch-bearing sailors stare at a carved Maya stela of glyphs, a painted ruler statue and a jaguar throne, above broken chests of gold and a green jade mosaic mask, pixelated from a comic-style illustration.',
  'crew-recruits': 'A rowdy crowd of barefoot sailors, a tall African freedman with an axe, a grey-bearded gunner and a ship’s boy among them, jostle round a tavern table as the captain writes their names in the articles, pixelated from a comic-style illustration.',
  traveller: 'A dusty, well-dressed traveller in a wide-brimmed hat, green doublet and brown cloak slides a letter sealed with red wax across a tavern table, his other palm open for payment, pixelated from a comic-style illustration.',
  'map-seller': 'A toothless, winking old pirate in a red head-scarf, with a gold earring and a peg leg, holds up a torn scrap of treasure map marked with a cross by a guttering candle, pixelated from a comic-style illustration.',
  'villain-news': 'A scarred nobleman with a cruel smile and a thin moustache, in black and crimson with a heavy gold chain, a gloved hand on his rapier, stands in a torch-lit stone hallway as a servant hurries away, pixelated from a comic-style illustration.',
  bartender: 'A burly, one-eyed tavernkeeper with a black eyepatch and a big grey moustache, in a leather jerkin and stained apron, dries a lidded pewter tankard behind a wooden counter, before casks, stoneware jugs and a chalked tally slate, pixelated from a comic-style illustration.',
  barmaid: 'A smiling, winking barmaid with chestnut curls under a linen coif, in a red laced bodice and apron, holds up three lidded pewter tankards in a candlelit tavern full of sailors, pixelated from a comic-style illustration.',
  merchant: 'A plump, beaming merchant in a linen apron and a dark doublet spreads his arms in welcome among sugar barrels, hides, cacao sacks and a brass balance, pixelated from a comic-style illustration.',
  'sail-ho': 'At the ship’s rail the captain shades his eyes beside three sailors, staring at a tiny sail on the horizon across a deep blue swell, pixelated from a comic-style illustration.',
  'sailing-master': 'A weather-beaten, grey-bearded sailing master in a knitted cap and brown jacket raises a hand in warning, brass dividers and a rolled sea chart in the other, as sullen sailors idle by the mainmast behind him, pixelated from a comic-style illustration.',
  'open-swords': 'At sunset on a ship’s deck the captain in his blue coat and a black-bearded captain in a wide-brimmed hat cross curved swords, as the crew looks on by lantern light, pixelated from a comic-style illustration.',
  shipwright: 'A burly, bald shipwright with a greying beard and a leather apron eyes you suspiciously, an adze on his shoulder, before a ship on trestles being caulked on the beach, a smoking tar cauldron and a row of old cannon in the sand, pixelated from a comic-style illustration.',
  'open-chart': 'A hand-drawn chart of the Caribbean on vellum, with Cuba, Hispaniola, Jamaica, the chain of small islands and the Spanish Main, lies on a cabin table under open brass dividers, beside an hourglass, a candlestick and a window on a harbour fort, pixelated from a comic-style illustration.',
  'open-buccaneers': 'On a Hispaniola beach a grizzled buccaneer teaches a young man to aim a long musket, beside a boucan smoking a wild pig, hides drying under a thatched lean-to and two men on a log, with a boat drawn up and a small ship in the bay, pixelated from a comic-style illustration.',
  'open-quarterdeck': 'On a ship’s quarterdeck the captain in his blue coat and a black-bearded captain in a wide-brimmed hat face each other with drawn curved swords, as the crew watches from the deck below, pixelated from a comic-style illustration.',
  'open-court': 'In a gilded hall hung with tapestries of ships, the captain kneels in his blue coat before a grey-bearded noble patron in black silk and a lace collar, who hands him a sealed charter from a red velvet chair, as courtiers whisper and a halberdier stands guard, pixelated from a comic-style illustration.',
  'open-plantation': 'At dusk at the edge of a sugar-cane field a young labourer in a torn shirt and straw hat, cane knife in hand, talks in secret with two crouching smugglers, one with a finger to his lips, above a cove where a small ship lies at anchor, with a boiling house smoking in the distance, pixelated from a comic-style illustration.',
  'open-boarded': 'A Spanish officer in a steel morion and breastplate leaps onto your deck and points his rapier at the captain in his blue coat, as soldiers with muskets and pikes climb over the rail from a galleon flying the red ragged cross of Burgundy, pixelated from a comic-style illustration.',
  'open-landfall': 'A galleon under full sail runs through the whitecaps toward a green, mountainous island fringed with palms, a lookout pointing from the maintop and sailors crowding the bow, pixelated from a comic-style illustration.',
  'open-prison': 'In a vaulted stone cell a ragged, chained young prisoner sits on straw and stares up at a barred window where the moon shines, beside a bucket, a cracked jug and a crust of bread, a rat in the corner and torchlight behind the iron-bound door, pixelated from a comic-style illustration.',
  'open-night-raid': 'Under a full moon a young man in a leather jerkin, cutlass in hand, points from the stern of a longboat at a small ship riding at anchor with a lantern lit, as smugglers row with rag-wrapped oars across the moonlit bay, pixelated from a comic-style illustration.',
  'open-colony': 'Inside a log stockade of thatched huts a red-bearded settler leader in a battered morion, sword drawn, points at the gate and the ship beyond while ragged colonists with pitchforks and spades shout behind him, facing the captain in his blue coat, sword in hand, pixelated from a comic-style illustration.',
  tavern: 'In a smoky, low-beamed waterfront tavern four sailors play cards and dice over pewter tankards while a fiddler plays by the casks, under a parrot, lanterns and a hanging ship model, the open door showing masts at dusk, pixelated from a comic-style illustration.',
  'divide-plunder': 'In a sunlit colonial counting house the captain rests a hand on an open chest of silver while a bald clerk in spectacles writes in a ledger and a quartermaster counts coins into the palm of grinning buccaneers lined up for their share, beside stacks of rough silver coins, gold, pearls and a brass balance, pixelated from a comic-style illustration.',
  'governor-daughter': 'In a governor’s sunlit courtyard with a fountain and bougainvillea, the captain bows, hat in hand, to a young lady in a rose silk gown with a lace collar and a folding fan, who glances back at him amused, while her suitor, an older nobleman in black with a plumed hat, glowers behind them with his arms crossed, pixelated from a comic-style illustration.',
  'governor-niece': 'On a lamplit balcony at night a young woman in a green silk gown with a lace collar leans on the balustrade and laughs with the captain, while a duenna in black frowns from a high-backed chair, a rosary in her hands, pixelated from a comic-style illustration.',
  wedding: 'The captain and his bride, in a crimson silk gown with a lace collar and flowers in her hair, come down the steps of a whitewashed church under a ringing bell, as townsfolk throw petals, a guitarist plays and his sailors toss their caps in the air, pixelated from a comic-style illustration.',
  'merchant-daughter': 'In a merchant’s warehouse a young woman in a blue bodice, apron and linen coif comes in with a basket of oranges and smiles shyly at the captain, while her father beams from behind his ledger desk under a brass balance, pixelated from a comic-style illustration.',
  'title-ship': 'A three-masted English warship flying St George’s cross at her mastheads and the red ensign at her stern, under full sail off a palm-fringed island with a Spanish stone fort, pixelated from a comic-style illustration.',
};
const sceneArt = {};

// harbour-arrival.png and port-quay.png are sheets of one 224 x 128 picture
// per fort flag, each built by tools/build_vignette.py from one illustration
// (rows in this order, its FORT_FLAGS). The Dutch flag follows the era: the
// orange Prince's flag to the 1640s, the red States flag from 1660 (both
// flew 1630-1662); the French flag too: the blue banner with gold lilies to
// 1600, white from 1620. Sources in docs/flags-1560-1680.md.
const HARBOUR_FLAGS = [
  ['Spain', 'the Cross of Burgundy, a red ragged saltire on white'],
  ['England', 'St George’s red cross on white'],
  ['France', 'the plain white royal flag'],
  ['Holland', 'the orange, white and blue Prince’s flag'],
  ['Holland', 'the red, white and blue States flag'],
  ['France', 'the blue banner of France with gold fleurs-de-lis'],
];

export function harbourRow({ flag, era } = {}) {
  if (flag === 'Holland') return Number(era) >= 1660 ? 4 : 3;
  // French forts flew the blue banner with gold lilies to about 1620, then
  // white (docs/flags-1560-1680.md).
  if (flag === 'France') return Number(era) >= 1620 ? 2 : 5;
  const row = HARBOUR_FLAGS.findIndex(([nation]) => nation === flag);
  return row < 0 ? null : row;
}

// The scenes drawn from a fort-flag sheet, and their description given the flag.
const FORT_FLAG_SCENES = {
  'harbour-arrival': (flag) => `Sailing into a colonial harbour town past a stone fort flying ${flag}, the captain at the rail, pixelated from a comic-style illustration.`,
  'shore-arrival': (flag) => `At the jungle’s edge above an inland valley the captain in his blue coat raises a hand to halt his armed buccaneers, looking down on a palisaded town with a church tower and a stone watchtower flying ${flag}, pixelated from a comic-style illustration.`,
  'town-square': (flag) => `A sunlit inland colonial plaza: a whitewashed church with a bell tower, the governor’s arcaded house flying ${flag}, market stalls of oranges, plantains and cloth, a stone well, an ox cart, chickens and militiamen in the shade, pixelated from a comic-style illustration.`,
  'land-attack': (flag) => `The captain points his cutlass at a town’s log palisade as his buccaneers and a young drummer march out of the jungle; militiamen in morions fire muskets over the stakes, smoke rises behind the church tower, and the gate’s watchtower flies ${flag}, pixelated from a comic-style illustration.`,
  'fort-walls': (flag) => `Buccaneers swarm up scaling ladders onto a fort’s stone ramparts through musket smoke as the captain crosses swords with the grey-bearded commander in a morion and steel breastplate, beside a toppled bronze cannon, while a snapped flagpole on the bastion still flies ${flag}, pixelated from a comic-style illustration.`,
  'port-quay': (flag) => `On a busy stone quay stevedores roll barrels and hoist bales beside a warehouse, with two ships at anchor in the bay below a distant headland fort flying ${flag}, pixelated from a comic-style illustration.`,
};


export function governorCell({ era, nation } = {}) {
  const column = GOVERNOR_NATIONS.indexOf(nation);
  const row = GOVERNOR_ERAS.indexOf(String(era));
  if (column < 0 || row < 0) return null;
  return { x: column * PICTURE_SIZES.portrait.width, y: row * PICTURE_SIZES.portrait.height };
}

// The ship that draws nearer after "Sail ho!" ("She looks like a ..."):
// one picture per ship type and period, too far off to read her colours
// (assets/vignettes/ships/, PROVENANCE.md). The eras fall into three
// bands, 1560-1600, 1620-1640 and 1660-1680; the barque and the sloop
// (1640 on) have one picture each. Before 1660 the frigate is the
// original's "fast galleon" (encounters.md §2), a race-built galleon.
const SHIP_ART_TYPES = {
  Pinnace: 'pinnace', Sloop: 'sloop', Barque: 'barque', 'Cargo fluyt': 'fluyt', Merchantman: 'merchantman',
  Frigate: 'frigate', 'Fast galleon': 'frigate', 'War galleon': 'wargalleon', Galleon: 'galleon',
};
const SHIP_ART_DESCRIPTIONS = {
  barque: 'A small two-masted bark with two lateen sails',
  sloop: 'A small single-masted sloop with a gaff mainsail and a headsail',
  'early-pinnace': 'A small, low two-masted pinnace of the 16th century',
  'early-fluyt': 'A round-sided Dutch fluyt with a tall, narrow stern',
  'early-merchantman': 'A high-sided armed merchant ship of the 16th century',
  'early-fastgalleon': 'A long, low, race-built fast galleon with four masts',
  'early-galleon': 'A towering Spanish treasure galleon with four masts',
  'early-wargalleon': 'A war galleon with two rows of guns and four masts',
  'mid-pinnace': 'A small, low two-masted pinnace',
  'mid-fluyt': 'A round-sided Dutch fluyt with a tall, narrow stern',
  'mid-merchantman': 'An armed merchant ship with a tall, flat stern',
  'mid-fastgalleon': 'A long, low, fast galleon with a single row of guns',
  'mid-galleon': 'A towering, gilded Spanish treasure galleon',
  'mid-wargalleon': 'A great warship with two tiers of guns and a gilded stern',
  'late-pinnace': 'A small, low two-masted pinnace',
  'late-fluyt': 'A round-sided Dutch fluyt with a tall, narrow stern',
  'late-merchantman': 'An armed merchant ship with a carved stern',
  'late-frigate': 'A long, low frigate with a single row of guns',
  'late-galleon': 'A broad, gilded Spanish treasure galleon',
  'late-wargalleon': 'A two-decked warship with two tiers of guns',
};
const shipArt = {};
const shipArtLoading = {};

export function sightedShipArt({ ship, era } = {}) {
  const type = SHIP_ART_TYPES[ship];
  if (!type) return null;
  if (type === 'barque' || type === 'sloop') return type;
  const year = Number(era);
  if (!Number.isFinite(year)) return null;
  const band = year <= 1600 ? 'early' : year <= 1640 ? 'mid' : 'late';
  if (type === 'frigate') return band === 'late' ? 'late-frigate' : `${band}-fastgalleon`;
  const key = `${band}-${type}`;
  return SHIP_ART_DESCRIPTIONS[key] ? key : null;
}

// The ship's colours, close at hand: "She's flying %s colors" (CSTR 122).
// A close view of her stern, one per period band and one for the small
// craft, each drawn with a plain white flag; the flag is painted onto it
// here from a sheet of flat flags and a map of the cloth
// (tools/build_colours.py, assets/vignettes/colours/). The flag follows the
// nation, the era and, where the sources differ, the ship's role (kind 6 and
// up: escorts, pirate hunters and warships); sources in PROVENANCE.md.
export const COLOUR_FLAGS = [
  'spain-burgundy', 'spain-arms', 'england-george', 'england-red-ensign', 'france-blue-cross', 'france-white',
  'holland-prince', 'holland-states', 'pirate-red', ...Array.from({ length: 32 }, (_, index) => `pirate-${index}`),
  'england-striped', 'france-lilies',
];
const COLOUR_CELL = { width: 72, height: 48, columns: 9 };
const PIRATE_EMBLEMS = [
  'a white cutlass', 'two crossed gold cutlasses', 'a white hourglass', 'a white arm raising a sword', 'a white heart',
  'a gold crown', 'a gold eight-pointed star', 'a white crescent moon', 'a white anchor', 'a gold lightning bolt',
  'a white boarding axe', 'three gold coins', 'a white key', 'a gold sun', 'a lit black grenade', 'a gold trident',
  'a white arrow', 'a white fish', 'a black hourglass in a black border', 'a black heart in a gold border',
  'two white dice', 'gold flames', 'a white chain', 'a white dagger', 'a gold bell', 'a black ship',
  'a white cutlass under a black band', 'a gold star under a black band', 'a white crescent under a black band',
  'a white anchor under a black band', 'a gold key under a black band', 'a gold sun under a black band',
];
const COLOUR_DESCRIPTIONS = {
  'spain-burgundy': 'the Cross of Burgundy, a red ragged saltire on white',
  'spain-arms': 'white with the crowned royal arms of Spain',
  'england-george': 'St George’s red cross on white',
  'england-red-ensign': 'a red ensign with St George’s cross in the canton',
  'england-striped': 'a green and white striped ensign with St George’s cross in the canton',
  'france-blue-cross': 'a white cross on blue',
  'france-white': 'the plain white flag of the French king’s ships',
  'france-lilies': 'the blue banner of France with gold fleurs-de-lis',
  'holland-prince': 'the orange, white and blue Prince’s flag',
  'holland-states': 'the red, white and blue States flag',
  'pirate-red': 'a plain red flag: no quarter',
  ...Object.fromEntries(PIRATE_EMBLEMS.map((emblem, index) => [`pirate-${index}`, `her captain’s own red colours with ${emblem}`])),
};

// The flag key for an encounter (or `colours`, a key, for the gallery).
export function colourFlag({ flag, era, kind = 0, captainId, colours } = {}) {
  if (colours) return COLOUR_DESCRIPTIONS[colours] ? colours : null;
  const year = Number(era);
  const navy = kind >= 6;
  switch (flag) {
    // Sources in docs/flags-1560-1680.md. Spain: the navy's ensign is white
    // with the royal arms by 1680 in every source; before that the sources
    // disagree (FOTW: the Cross of Burgundy; O'Donnell: the royal arms from
    // the late 16th century), so the cross, flown on every Spanish ship and
    // fort in either reading, stays.
    case 'Spain': return year >= 1680 && navy ? 'spain-arms' : 'spain-burgundy';
    // England: St George's cross in 1560 (stern ensigns appear from 1574),
    // striped ensigns with a St George canton to about 1625, the red ensign
    // after (the navy's from 1625, the merchants' legalised in 1674).
    case 'England': return year >= 1640 ? 'england-red-ensign' : year >= 1600 ? 'england-striped' : 'england-george';
    // France: the king's ships under the blue banner with gold lilies in
    // 1560, plain white from about 1600 (attested at sea from 1606, the
    // navy's by 1643, its alone from 1661); merchants a white cross on blue.
    case 'France': return !navy ? 'france-blue-cross' : year >= 1600 ? 'france-white' : 'france-lilies';
    // Orange to about 1630, both 1630-1662 (kept orange, as the forts),
    // red from 1663.
    case 'Holland': return year >= 1660 ? 'holland-states' : 'holland-prince';
    case 'pirate': {
      // A named pirate flies his own colours, one design per surname, as the
      // original ties its pirate flags to the captains' names.
      if (!captainId) return 'pirate-red';
      const low = captainId & 0xff;
      return `pirate-${((low >> 6) & 3) * 8 + ((low >> 3) & 7)}`;
    }
    default: return null;
  }
}

const SMALL_CRAFT = new Set(['Pinnace', 'Sloop', 'Barque']);
export function colourStern({ ship, era, stern } = {}) {
  if (stern) return stern;
  if (SMALL_CRAFT.has(ship)) return 'stern-small';
  const year = Number(era);
  return year <= 1600 ? 'stern-early' : year <= 1640 ? 'stern-mid' : 'stern-late';
}

let colourAtlas = null;
let colourAtlasLoading = null;
const colourSterns = {};
const colourSternLoading = {};
const colourPictures = new Map();

function loadColourArt(stern) {
  const url = (file) => new URL(`../assets/vignettes/colours/${file}`, import.meta.url).href;
  colourAtlasLoading ??= loadImage(url('flags.png'), (image) => { colourAtlas = image; });
  colourSternLoading[stern] ??= Promise.all([
    loadImage(url(`${stern}.png`), (image) => { (colourSterns[stern] ??= {}).base = image; }),
    loadImage(url(`${stern}-map.png`), (image) => { (colourSterns[stern] ??= {}).map = image; }),
  ]);
  return Promise.all([colourAtlasLoading, colourSternLoading[stern]]);
}

function imagePixels(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, image.width, image.height);
}

// The stern picture with the flag painted on: each cloth pixel of the map
// holds the flag's (u, v) in red and green and the folds' light in blue
// (200 = full light). Null until its images have loaded.
function composeColours(sternKey, flagKey) {
  const id = `${sternKey}|${flagKey}`;
  if (colourPictures.has(id)) return colourPictures.get(id);
  const stern = colourSterns[sternKey];
  const index = COLOUR_FLAGS.indexOf(flagKey);
  if (!stern?.base || !stern.map || !colourAtlas || index < 0 || typeof document === 'undefined') return null;
  const { width, height } = PICTURE_SIZES.landscape;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.drawImage(stern.base, 0, 0);
  const picture = context.getImageData(0, 0, width, height);
  const map = imagePixels(stern.map).data;
  const flags = imagePixels(colourAtlas);
  const { width: cellWidth, height: cellHeight, columns } = COLOUR_CELL;
  const left = (index % columns) * cellWidth;
  const top = Math.floor(index / columns) * cellHeight;
  for (let at = 0; at < width * height * 4; at += 4) {
    const light = map[at + 2];
    if (!light) continue;
    const x = left + Math.min(cellWidth - 1, Math.floor((map[at] / 256) * cellWidth));
    const y = top + Math.min(cellHeight - 1, Math.floor((map[at + 1] / 256) * cellHeight));
    const from = (y * flags.width + x) * 4;
    for (let channel = 0; channel < 3; channel += 1) {
      picture.data[at + channel] = Math.min(255, Math.round((flags.data[from + channel] * light) / 200));
    }
  }
  context.putImageData(picture, 0, 0);
  colourPictures.set(id, canvas);
  return canvas;
}

function loadImage(url, store) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => { store(image); resolve(); };
    image.onerror = () => resolve();
    image.src = url;
  });
}

// Starts loading every picture once, and resolves when the one this
// vignette shows has arrived (or failed), so its dialog repaints without
// waiting for the rest. A sighted ship's picture and a stern for the colours
// load only when first shown. Until a picture arrives, or if it cannot be
// loaded (or there is no DOM), the picture area stays empty.
export function loadVignetteArt(id, options) {
  if (!artLoading) {
    artLoading = {};
    if (typeof Image !== 'undefined') {
      artLoading.governor = loadImage(GOVERNOR_SHEET_URL, (image) => { governorSheet = image; });
      for (const [scene, url] of Object.entries(SCENE_ART_URLS)) artLoading[scene] = loadImage(url, (image) => { sceneArt[scene] = image; });
    }
  }
  if (typeof Image === 'undefined') return Promise.resolve();
  if (id === 'sail-colours') return loadColourArt(colourStern(options)).then(() => {});
  if (id === 'sail-nearer') {
    const key = sightedShipArt(options);
    if (!key) return Promise.resolve();
    shipArtLoading[key] ??= loadImage(new URL(`../assets/vignettes/ships/${key}.png`, import.meta.url).href, (image) => { shipArt[key] = image; });
    return shipArtLoading[key];
  }
  return artLoading[id === 'governor' ? 'governor' : sceneArtKey(id, options)] ?? Promise.resolve();
}

// True while the vignette's picture has not arrived.
export function vignetteNeedsArt(id, options) {
  return !sceneImage(id, options);
}

export function vignetteShape(id) {
  return SCENE_SHAPES[id] ?? 'landscape';
}

// The framed size in art pixels, for sizing the canvas.
export function vignetteSize(id) {
  const picture = PICTURE_SIZES[vignetteShape(id)];
  return { width: picture.width + 2 * VIGNETTE_FRAME_WIDTH, height: picture.height + 2 * VIGNETTE_FRAME_WIDTH };
}

// The loaded picture for a vignette and where it sits on its sheet, or null
// until it has arrived: the governor's cell of the portrait sheet, the
// sighted ship's period picture, the stern with the ship's colours painted
// on, the town's row of a fort-flag sheet, or the scene's own picture.
function sceneImage(id, options = {}) {
  if (id === 'governor') {
    const cell = governorCell(options);
    return governorSheet && cell ? { source: governorSheet, x: cell.x, y: cell.y } : null;
  }
  if (id === 'sail-nearer') {
    const key = sightedShipArt(options);
    return key && shipArt[key] ? { source: shipArt[key], x: 0, y: 0 } : null;
  }
  if (id === 'sail-colours') {
    const picture = composeColours(colourStern(options), colourFlag(options));
    return picture ? { source: picture, x: 0, y: 0 } : null;
  }
  if (FORT_FLAG_SCENES[id]) {
    const row = harbourRow(options);
    return sceneArt[id] && row !== null ? { source: sceneArt[id], x: 0, y: row * PICTURE_SIZES.landscape.height } : null;
  }
  const art = sceneArt[sceneArtKey(id, options)];
  return art ? { source: art, x: 0, y: 0 } : null;
}

// Draws the framed vignette into a context of vignetteSize(id): the picture
// whole, one art pixel per pixel, or an empty dark picture area until it
// has loaded.
export function drawVignette(ctx, id, options = {}) {
  const picture = PICTURE_SIZES[vignetteShape(id)];
  const framed = vignetteSize(id);
  ctx.clearRect(0, 0, framed.width, framed.height);
  const art = sceneImage(id, options);
  if (art) {
    ctx.drawImage(art.source, art.x, art.y, picture.width, picture.height, VIGNETTE_FRAME_WIDTH, VIGNETTE_FRAME_WIDTH, picture.width, picture.height);
  } else {
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(VIGNETTE_FRAME_WIDTH, VIGNETTE_FRAME_WIDTH, picture.width, picture.height);
  }
  drawFrame(painter(ctx), framed.width, framed.height);
}

function painter(ctx) {
  const rect = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  return { rect };
}

// Places and events are landscapes, people portraits; the title screen's
// picture has its own 3 : 2 shape.
const SCENE_SHAPES = {
  governor: 'portrait',
  'villain-news': 'portrait',
  merchant: 'portrait',
  shipwright: 'portrait',
  barmaid: 'portrait',
  bartender: 'portrait',
  traveller: 'portrait',
  'map-seller': 'portrait',
  'sailing-master': 'portrait',
  'title-ship': 'title',
};

// The shared 8 px carved frame with a brass fillet and corner pieces
// (scene-vignettes.md §3).
function drawFrame(p, w, h) {
  const ring = (inset, color) => {
    p.rect(inset, inset, w - 2 * inset, 1, color);
    p.rect(inset, h - inset - 1, w - 2 * inset, 1, color);
    p.rect(inset, inset, 1, h - 2 * inset, color);
    p.rect(w - inset - 1, inset, 1, h - 2 * inset, color);
  };
  ring(0, OUTLINE);
  for (let inset = 1; inset < 6; inset += 1) ring(inset, inset === 1 ? WOOD_LIGHT : inset === 5 ? WOOD_DARK : WOOD);
  // Bevel: the bottom and right sides of the wood fall in shadow.
  for (let inset = 1; inset < 6; inset += 1) {
    p.rect(inset, h - inset - 1, w - 2 * inset, 1, inset === 1 ? WOOD_DARK : WOOD);
    p.rect(w - inset - 1, inset, 1, h - 2 * inset, inset === 1 ? WOOD_DARK : WOOD);
  }
  ring(6, BRASS);
  ring(7, OUTLINE);
  for (const [x, y] of [[0, 0], [w - 6, 0], [0, h - 6], [w - 6, h - 6]]) {
    p.rect(x, y, 6, 6, OUTLINE);
    p.rect(x + 1, y + 1, 4, 4, BRASS);
    p.rect(x + 2, y + 2, 2, 2, GOLD);
  }
}

// How large a full-screen dialog draws its picture (style.css, "Dialogs"),
// always whole and framed, at the largest whole-number scale that fits its
// share of the dialog's inner box (CSS px). On wide screens the picture sits
// in the page's top left corner with the text beside and below it ('corner');
// on narrow ones it is a band above the text ('band'), at most `maxScale`.
// `room` caps the picture's height: the page left visible above a pinned
// action bar.
export function dialogPictureLayout(id, { width, height, room = Infinity, narrow = false, table = false, maxScale = Infinity }) {
  const framed = vignetteSize(id);
  const portrait = vignetteShape(id) === 'portrait';
  // Shares of the box: the picture leaves room for the text beside it and,
  // for a landscape, below it; a trading table needs more of the width.
  const share = narrow
    ? { width: 1, height: portrait ? 0.5 : 0.4 }
    : { width: table ? 0.3 : portrait ? 0.4 : 0.55, height: portrait ? 0.85 : 0.6 };
  const fit = Math.floor(Math.min(width * share.width / framed.width, Math.min(height * share.height, room) / framed.height));
  const scale = Math.max(1, Math.min(fit, maxScale));
  return { mode: narrow ? 'band' : 'corner', scale, width: framed.width * scale, height: framed.height * scale };
}
