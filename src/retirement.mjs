// Retirement and the career ending: the driver (retirement_driver.asm,
// 0x45D0), the career summary (0x4A1A), the score (0x5039), the post-career
// line (0x51C2) and the hall of fame offer. DOM-free; text comes from CSTR
// 72–84 and CSTN 38–43, 44–67, 68, 78–80.

// CSTN 43, indexed by the job the score picks (0 best .. 23 worst).
export const RETIREMENT_JOBS = [
  "King's advisor", 'Governor', 'Lt. governor', 'Fleet admiral', 'Rich banker', 'Plantation owner',
  'Wealthy merchant', 'General', 'Sugar planter', 'Merchant captain', 'Council member', 'Colonel',
  'Shop owner', 'Major', 'Tavernkeeper', 'Sailing master', 'Sergeant', 'Bartender', 'Sailor',
  'Farm hand', 'Rogue', 'Scoundrel', 'Pauper', 'Beggar',
];

// CSTN 44 + job: three lines each, one picked with rnd(3) (0x5203).
const JOB_LINES = [
  ['you counsel the king on how to interact with other nobility.', 'you inform the king on the mood of his subjects.', 'you spread the influence of your king throughout the region.'],
  ['you issue Letters of Marque to young privateers seeking their fortunes in service of your king.', 'you report to the king the expansionist policies of his rival colonies.', 'you represent your king in trade agreements with other colonies.'],
  ['you advise the Governor on matters of state.', 'the merchants vie for your favor on tariff issues.', 'you are renowned for your good judgement in political affairs.'],
  ["His Majesty's navy is now under your command.", 'you command a flotilla of war ships mightier than your wildest dreams.', 'you grin as you recall the first "fleet" you captained in the Caribbean.'],
  ['the monies gained from plundering enemy ships finance your business.', 'little is known of your shady days toiling at the mast.', 'you finance young adventurers seeking fame and fortune in the new world.'],
  ['you reap the profit daily from your sugar plantation.', 'the pubs sell the rum made by your plantation.', 'the ladies wear fine garments made of the cotton from your plantation.'],
  ['your export business makes you a very wealthy man.', 'your merchant fleet plies waters around the globe.', 'invitations to your lavish social engagements are coveted by the court.'],
  ['the king has appointed you commander of all his armies.', "you advise the King's generals on military maneuvers.", "you make decisions in campaigns against your country's enemies."],
  ['you grow rich selling crops to local merchants.', 'the tropical sunshine and warm rain nourish your crops and your pocketbook.', 'your molasses becomes famous throughout the New England colonies.'],
  ['the women of the town eagerly await your next landfall.', 'you bring expensive gifts from Europe for the ladies of the town.', "there's always a handsome profit to be made."],
  ['you advise the Governor in matters of commerce.', 'you discuss problems of taxation in the colonies.', 'the other councilmen secretly envy your previous privateering exploits.'],
  ['you command the soldiers that protect the town.', 'you impress the ladies with your splendid uniforms.', "you command the Governor's honor guard in impressive displays of drill."],
  ['you sell household goods to lusty young women of the town.', 'you deal in absinthe imported from Spain.', 'you deal in spirituous liquors and aphrodisiacs from the Far East.'],
  ['your former exploits have made you famous.', 'you lead the local militia against foreign invaders.', 'the Governor consults you about military affairs.'],
  ['captains come to recruit crewmen from the scalawags in your tavern.', 'travelers come from far and wide to learn the latest news.', 'shady characters use your pub to deal in parchment treasure maps.'],
  ['you keep the crew and ship trim for others now.', 'your years at sea command respect from the crew.', 'your knowledge of the Caribbean and its dangers is valued by many a novice captain.'],
  ['you train the citizens to defend their town.', 'your skill with the sabre is greatly admired.', 'the citizens rely upon your knowledge of the evil ways of pirates.'],
  ["you pretend to listen with interest to other adventurers' exciting exploits.", 'you serve travelers from all over the West Indies and even Europe.', "you're forced to listen as the townspeople cry their tales of woe."],
  ['the sailing skills you mastered put food in your gullet.', "the others sneer because you're taking orders now instead of giving them.", 'you amuse the youngsters with your tales of adventure.'],
  ['the strength and determination you learned at sea are valued.', "your arms made strong hauling sails serve your master's table.", 'you dream of what might have been.'],
  ['your few skills barely keep you alive.', 'you are forced to lie and cheat just to survive.', 'you spend the rest of your dreary life, going from one menial job to the next.'],
  ['you learn the art of picking pockets and getting by on a pittance.', 'you become notorious as a "captain turned thief."', 'you live a life of crime from the lessons you learned at sea.'],
  ['you just manage to eke out a frugal existence selling fish.', 'your ever increasing debt drags you into despair.', 'you live a pitiful life, sleeping on the streets of the market place.'],
  ['you spend the rest of your unhappy days pinching money from your betters.', 'you take to drink and dream of the riches that should have been yours.', 'the populace sneers at you daily as it goes about its important business.'],
];

const NATION_ADJECTIVES = { Spain: 'a Spanish', England: 'an English', France: 'a French', Holland: 'a Dutch' };
const RANK_TITLES = ['Mr.', 'Ensign', 'Captain', 'Major', 'Colonel', 'Admiral', 'Baron', 'Count', 'Marquis', 'Duke'];
// CSTN 38 entries 4–11.
const COMMUNITY_STANDING = ['an undistinguished', 'a little-known', 'an average', 'a creditable', 'a well respected', 'a greatly admired', 'a very important', 'an extremely important'];
// CSTN 39 entries 2–8.
const WEALTH_CLASSES = ['a penniless pauper', 'a very poor man', 'a man of average wealth', 'a somewhat prosperous man', 'a rather wealthy man', 'a very wealthy man', 'an extremely wealthy man'];
// CSTN 40 entries 2–8.
const REPUTATIONS = ['a cautious and cowardly', 'a quiet and cautious', 'a competent and active', 'an active and daring', 'a daring and bold', 'a bold and fearless', 'a brave, bold, and fearless'];
// CSTN 41 entries 2–5, indexed by married − 1.
const BRIDES = ['the daughter of a wealthy merchant', 'the daughter of a governor', 'the niece of a governor', 'a barmaid in a local tavern'];
const NUMBER_WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five'];
const WOUND_COUNTS = ['once', 'twice', 'numerous times'];
// CSTN 42 entries 1–6.
const MOODS = ['sad and bitter', 'lonely and quiet', 'quiet and contented', 'contented and cheerful', 'cheerful and happy', 'happy and fun-loving'];

// The four retirement pictures (0x5183): sunset4 for jobs 0–3 down to
// sunset1 for jobs 12 and worse. The tier order is a reading of the jump
// table at 0x322EC, not tested at runtime (scene-vignettes.md §4.10).
export const ENDING_TIERS = ['Illustrious', 'Respected', 'Comfortable', 'Humble'];

// The career score (0x5039). `rankSum` is the sum of the four national ranks
// (0x45E7F..82) and `careerYears` the years since the start (0x46056 −
// 0x45E85). The code adds 1000 × married (0x45E86), so a governor's daughter
// (2) is worth 2000 and a niece (3) 3000; marriage.md's "+1000 for 2 or 3"
// does not match the multiply at 0x5081. Divisions truncate toward zero.
export function retirementScore({ personalWealth, land, rankSum, reputation, relativesRescued, married = 0, wounds, careerYears }) {
  const raw = Math.trunc(personalWealth / 10) + 50 * land + 500 * rankSum + 200 * reputation
    + 1000 * married + 1000 * relativesRescued - 1000 * wounds;
  const points = Math.trunc(raw / 330 * (25 - careerYears) / 20);
  const job = points > 0
    ? Math.max(1, 19 - Math.trunc(points / 5)) - 1
    : Math.min(22, 20 - Math.trunc(points / 10)) - 1;
  return { raw, points, job, tier: Math.min(3, Math.trunc(job / 4)) };
}

// The driver's happiness (0x45D7..0x4761), clamped below at −1; the summary
// shows trunc(3·h) clamped to 0..5 as a CSTN 42 mood.
export function retirementHappiness({ relativesRescued, married = 0, wounds, careerYears }) {
  const happiness = (relativesRescued / 8 + married / 8 + 1 - wounds / 6) * (25 - careerYears) / 20;
  return Math.max(-1, happiness);
}

export function moodIndex(happiness) {
  return Math.min(5, Math.max(0, Math.trunc(happiness * 3)));
}

// 0x4BB2: min(6, trunc(√((100·land + wealth) / 500))). ASSUMED: negative
// wealth, which the original would pass to sqrt, counts as a pauper.
export function wealthClass({ personalWealth, land }) {
  return Math.min(6, Math.trunc(Math.sqrt(Math.max(0, 100 * land + personalWealth) / 500)));
}

// 0x4D1A: min(6, max(0, trunc(reputation / 4) + 1)).
export function reputationClass(reputation) {
  return Math.min(6, Math.max(0, Math.trunc(reputation / 4) + 1));
}

// 0x47C7: in a town (0x47ACE), below difficulty 4, and while the unclamped
// health figure is under 4, the lure of the sea (CSTR 72) lets the captain
// return to pirating.
export function mayReturnToPirating({ inTown, difficulty, careerYears, wounds, medicine }) {
  return inTown && difficulty !== 4 && Math.trunc((careerYears + wounds) / (medicine ? 4 : 3)) < 4;
}

// The summary's paragraphs (0x4A1A), in the original's page order: ranks,
// wealth, reputation, then age, bride, relatives, wounds and mood. Port
// departures: amounts get thousands separators (the original's itoa at
// 0x2D8B8 has none), and the relatives count is lowercased (0x4ED8 discards
// its case conversion, printing "rescuing One member").
export function careerSummary({ ranks, personalWealth, land, reputation, relativesRescued, married = 0, wounds, careerYears, happiness }) {
  const titles = Object.entries(ranks).filter(([, rank]) => rank > 0)
    .map(([nation, rank]) => `${NATION_ADJECTIVES[nation]} ${RANK_TITLES[rank]}`);
  const rankSum = Object.values(ranks).reduce((sum, rank) => sum + rank, 0);
  const standing = COMMUNITY_STANDING[Math.min(11, Math.trunc(rankSum * 5 / 2) + 4) - 4];
  const rankLine = rankSum === 0
    ? `You failed to achieve a rank, making you ${standing} member of your community.`
    : `You achieved the title of ${titles.join(' and ')}, making you ${standing} member of your community.`;
  const acres = land ? `and ${(land * 50).toLocaleString('en-US')} acres of land ` : '';
  const wealthLine = `You accumulated the sum of ${personalWealth.toLocaleString('en-US')} gold pieces ${acres}during your career, making you ${WEALTH_CLASSES[wealthClass({ personalWealth, land })]}.`;
  const reputationLine = `Your exploits on the high seas leave you with a reputation as ${REPUTATIONS[reputationClass(reputation)]} captain.`;
  const personal = [
    `You retired from privateering at the age of ${careerYears + 25}.`,
    married ? `Your bride is ${BRIDES[married - 1]}.` : 'You were unable to find a bride.',
  ];
  if (relativesRescued) personal.push(`You succeeded in rescuing ${NUMBER_WORDS[relativesRescued].toLowerCase()} member${relativesRescued === 1 ? '' : 's'} of your family.`);
  if (wounds) personal.push(`You were wounded ${WOUND_COUNTS[Math.min(2, wounds - 1)]}.`);
  personal.push(`In the course of your travels, you become ${MOODS[moodIndex(happiness)]}.`);
  return [rankLine, wealthLine, reputationLine, personal.join(' ')];
}

// CSTR 82 with CSTN 43 and one of the job's three CSTN 44+ lines.
export function retirementLine({ job, townName, rng }) {
  const line = JOB_LINES[job][rng.int(3)];
  return `Your pirating days are over. Your seafaring adventures have made you a ${RETIREMENT_JOBS[job]} in ${townName}, where ${line}`;
}

// The hall of fame (0x529A writes it; its layout is not decoded). ASSUMED:
// the port keeps the ten best careers by pirate points.
export const HALL_OF_FAME_SIZE = 10;

export function recordInHallOfFame(entries, entry) {
  return [...entries, entry]
    .sort((a, b) => b.points - a.points)
    .slice(0, HALL_OF_FAME_SIZE);
}
