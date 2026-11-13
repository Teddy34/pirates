// The career opening: which story each start tells, and the sailing master's
// first briefing. DOM-free.
//
// 0x139E2 walks a byte script at 0x35968, one per start record (index
// 4·era + nationality, ending in 0xFF): CSTR indices to print, -2 and 41 wait
// for a click, 50-55 are inert leftovers of the picture calls, 97 is a duel.
// Here each script is reduced to what the player sees, in order. Deliberate
// departure: op 42 (0x14630) is the manual-based copy protection. The port
// leaves out its penalty branch and the +16 favour with each nation it grants
// on a pass. The duel is a practice bout (mode -1), so its result changes nothing.

import { NATION_ORDER } from './mechanics.mjs';

// Record order, unlike NATION_ORDER (diplomacy_and_world.md §2).
const START_NATIONS = ['England', 'France', 'Holland', 'Spain'];

const D = 'duel';
// CSTR 1-44, the entries the scripts below reach. The original's capitals,
// spelling and pronouns are kept.
const STORY_TEXT = {
  1: "Through long, hard work, you become a merchant captain. Full of ambition, you cast covetous eyes on the vast wealth of the Spanish Main. The final step is an audience at court for royal approval.",
  2: "“My loyal Captain,” says your patron, “I can finance this voyage. I am sure you are the right man for the task.”",
  3: "Your vast knowledge encourages your patron. In a few months you are running before the trade winds with a fast, powerful warship beneath your feet. “Land ho!” cries the lookout. You have made landfall in the West Indies!",
  7: "One night, playing cards in a tavern, you overhear an old sea captain. “Mates, the Spanish conquered Peru years ago. Some of the treasure never reached Spain. A fortune in ancient gold awaits a bold man in the Caribbean!”",
  8: "Inspired by the tale, you seek support for a voyage from aristocratic friends. “What do you know of the West Indies?” they demand.",
  9: "Your correct answer wins powerful support. Soon you have a royal charter for a new colony in the Indies. But the land is poor, the colonists are discouraged. “Turn back,” they demand. You must face their leader, sword in hand!",
  10: "Victorious, you and your friends put the malcontents ashore. Now it’s time to set course for adventure, fame, and fortune along the fabled Spanish Main!",
  13: "Years ago your family was poor and starving. Your future lay in the New World, a land of opportunity and hope. Entering the Caribbean, a hurricane wrecks the ship. Clinging to a spar, you are rescued by the Spanish.",
  14: "You are indentured to hard labor on a sugar plantation. One day you chance upon some smugglers in a far corner of the fields. They start a conversation with you...",
  15: "Impressed by your knowledge, the smugglers elect you Captain on the spot. That night you lead the sturdy band in a sneak attack on a small ship riding at anchor.",
  17: "You sail to a friendly port nearby. A family friend introduces you to the governor. He provides a “Letter of Marque” authorizing attacks on enemy ships. Now you are ready to seek your fame and fortune on the Spanish Main!",
  18: "Young and poor, you seek your fortune in the New World. To purchase passage, you indenture yourself, binding you to work on a sugar plantation for five years as payment. But on the plantation your debts only grow.",
  19: "You decide to escape this life of debt slavery. You ask some local seamen about joining the “brethren of the coast.” “Aye, mate,” they reply, “come along with us”",
  20: "The seamen are really buccaneers! In need of knowledge, they invite you to join their party. But the voyage is unprofitable. The men decide new leadership is required. They nominate you to duel the captain for command of the ship!",
  21: "You are happy living as an honest seaman, but your uncle gambles away all the family’s money. To help feed your starving mother you steal a piece of bread from the back door of an aristocrat’s mansion and are caught!",
  22: "After months waiting in a foul prison, the Judge hears your case. “You common scum don’t take the law seriously!” he snarls. “Transportation to the colonies for ten years hard labor will teach you some honest work!”",
  23: "You and your sturdy band sail to a friendly port. There you arm and provision the ship. Your charismatic personality brings flocks of recruits from the taverns, each seeking new wealth on the Spanish Main!",
  24: "The governor of San Juan pockets your gold and smiles. “It gives me great pleasure to award you this commission as ensign in the Costa Garda.” He laughs. “Now you can legally repay those foreign devils we’ve suffered from for too long.”",
  25: "“Of course,” the governor continues, “you are obliged to protect our shipping too. But to be sure you know the difference.”",
  26: "On your first voyage a small convoy of enemy ships falls to your squadron. One enemy cuts grapples and starts away. “Take that ship,” your Captain yells, “and she’s yours!” Your party jumps aboard just in time!",
  27: "Victorious, you take the ship to a friendly port, where you repair, rearm, and provision it. With your promising reputation, finding a crew at the local tavern is no problem. In just a few weeks your sturdy band clamors to set sail!",
  31: "Through long, hard work, you become a merchant captain. Full of ambition, you cast covetous eyes on the vast wealth of the Spanish Main. The final step is an audience at court for royal approval.",
  32: "Years ago your family settled in the New World. Then a rich, grasping nobleman used a corrupt judge to seize the family lands and imprison you. You escape and begin a long search for your lost family.",
  33: "Finally, you encounter sailors in a portside tavern, down to their last few gold doubloons. “Mate,” they call, “help us refill our purses. Come join us.”",
  34: "Your skill as a merchant captain is famous throughout Europe. The best traders employ you. Finally, an officer of the powerful West Indies Company approaches you with a proposition to command a voyage to the Indies.",
  35: "A few months later your sturdy ship and crew are in the West Indies. You encounter a Spanish ship and hail them, only to find yourself boarded! “Foreign heretic scum aren’t permitted here,” says their leader, drawing his sword.",
  36: "Born into a family of sailors, you too wish to seek your fortune at sea. The current war offers many opportunities in the West Indies for an enterprising young man. The tales of old, wealthy privateer captains stir your blood.",
  37: "You decide to seek a life of adventure. In a seaside tavern you meet a famous captain. “I need strong men for my crew,” he says. “Mayhaps you’ll find a berth with me.”",
  38: "As a young man you fled your family’s debt slavery on a sugar plantation. You live among the buccaneers of the coast, learning to shoot, to handle a sword, to handle a ship. Most importantly, you learn bravery and leadership.",
  39: "You are born into a merchant sailor family, inheriting a ship. Alas, the new restrictive trade laws of England and France make most voyages unprofitable. Then you hear that enforcement of these regulations is lax in the Indies.",
  43: "Your grasp of Spanish affairs pleases your patron. Soon you are commanding a trim ship, westward bound. But below decks, a rival plots against you. One calm evening the challenger steps forward, sword in hand!",
  44: "A few days later you encounter a Spanish ship. You hail them, only to find yourself boarded! “Foreign heretic scum aren’t permitted here,” says their leader, drawing his sword.",
};

const SCRIPTS = [
  [1, 2, 43, D, 10], // 1560 England
  [7, 8, 3, 44, D, 23], // 1560 France
  [], // 1560 Holland
  [32, 33, 15, D, 23], // 1560 Spain
  [7, 8, 9, D, 10], // 1600 England
  [21, 22, 14, 20, D, 23], // 1600 France
  [34, 2, 35, D, 27], // 1600 Holland
  [32, 33, 15, D, 23], // 1600 Spain
  [13, 14, 15, D, 17], // 1620 England
  [31, 2, 9, D, 10], // 1620 France
  [36, 37, 3, 26, D, 17], // 1620 Holland
  [32, 33, 15, D, 23], // 1620 Spain
  [13, 14, 15, D, 17], // 1640 England
  [36, 37, 3, 26, D, 17], // 1640 France
  [34, 2, 35, D, 27], // 1640 Holland
  [32, 33, 15, D, 23], // 1640 Spain
  [18, 19, 20, D, 10], // 1660 England
  [38, 37, 26, D, 17], // 1660 France
  [7, 37, 26, D, 27], // 1660 Holland
  [32, 33, 15, D, 23], // 1660 Spain
  [21, 22, 14, 15, D, 23], // 1680 England
  [38, 37, 26, D, 17], // 1680 France
  [39, 8, 35, D, 23], // 1680 Holland
  [24, 25, 26, D, 27], // 1680 Spain
];

// One picture per string. The original shows none here (its picture ops are
// inert), so this choice is the port's: a story never repeats a picture on
// consecutive screens.
const STORY_VIGNETTES = {
  1: 'port-quay', 2: 'open-court', 3: 'open-landfall', 7: 'tavern', 8: 'open-court',
  9: 'open-colony', 10: 'open-landfall', 13: 'shipwreck', 14: 'open-plantation', 15: 'open-night-raid',
  17: 'governor', 18: 'open-plantation', 19: 'tavern', 20: 'open-quarterdeck', 21: 'town-square',
  22: 'open-prison', 23: 'tavern', 24: 'governor', 25: 'port-quay', 26: 'open-quarterdeck',
  27: 'port-quay', 31: 'port-quay', 32: 'open-prison', 33: 'tavern', 34: 'merchant',
  35: 'open-boarded', 36: 'harbour-arrival', 37: 'bartender', 38: 'open-buccaneers', 39: 'port-quay',
  43: 'open-quarterdeck', 44: 'open-boarded',
};
const DUEL_VIGNETTE = 'open-swords';

// The screens of a story: { text, vignette }, or { duel: true, vignette } for the fight.
export function openingSteps(eraIndex, nationality) {
  const script = SCRIPTS[eraIndex * 4 + START_NATIONS.indexOf(nationality)] ?? [];
  return script.map((step) => (step === D
    ? { duel: true, vignette: DUEL_VIGNETTE }
    : { text: STORY_TEXT[step], vignette: STORY_VIGNETTES[step] }));
}

// CSTN 75, indexed by the signs of the offset (0 for an exact match on an axis).
const COMPASS_POINTS = [
  ['northwest', 'north', 'northeast'],
  ['west', '', 'east'],
  ['southwest', 'south', 'southeast'],
];
function compassPoint(dx, dy) {
  // A non-number dy reads as level, as the original row choice did.
  return COMPASS_POINTS[(Math.sign(dy) || 0) + 1][Math.sign(dx) + 1];
}

// 0x13E3F, shown once as a career starts. CSTN 71 gives the adjectives.
const NATION_ADJECTIVES = { Spain: 'Spanish', England: 'English', France: 'French', Holland: 'Dutch' };

// `townRange` is the 0x4605A count (randomTownRange): the last town is never named.
export function sailingMasterBriefing({ towns, townIndex, townRange }) {
  const here = towns[townIndex];
  const closest = new Map();
  for (let index = 0; index < townRange; index += 1) {
    if (index === townIndex) continue;
    const town = towns[index];
    const distance = Math.abs(town.x - here.x) + Math.abs(town.y - here.y);
    if (distance < (closest.get(town.nation)?.distance ?? Infinity)) closest.set(town.nation, { town, distance });
  }
  const greeting = `The sailing master takes you aside. “Here in ${here.name}, you’ll probably be wantin’ to see the ${NATION_ADJECTIVES[here.nation]} governor and visit a tavern. The men’ll be anxious for plunder and adventure, so we needn’t be sightseein’ for too long.”`;
  const cities = NATION_ORDER.filter((nation) => nation !== here.nation && closest.has(nation)).map((nation) => {
    const { town } = closest.get(nation);
    let dx = town.x - here.x;
    let dy = town.y - here.y;
    // Mostly along one axis counts as that axis, and the days are measured
    // after this rounding (0x14078-0x14226).
    if (Math.abs(dy) * 2 < Math.abs(dx)) dy = 0;
    if (Math.abs(dx) * 2 < Math.abs(dy)) dx = 0;
    const days = Math.abs(dx) + Math.abs(dy) > 30 ? 'many' : 'a few';
    return `“The closest ${NATION_ADJECTIVES[nation]} city is ${town.name}, which lies ${days} days to the ${compassPoint(dx, dy)}.`;
  });
  if (cities.length) cities[cities.length - 1] += '”';
  return { greeting, cities };
}
