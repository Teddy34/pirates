// What the start screen says about each era: the manual's title and its
// difficulty rating, with a short description. The descriptions are written
// for this port from ../piratesgold/docs/eras.md (the manual's "Historical
// Periods" plus each era's scenario block); they are not the manual's text.
// DOM-free.

// The manual rates the eras in words. `level` orders them, 1 easiest to 4 hardest.
export const ERA_DIFFICULTIES = {
  easy: { label: 'Easy', level: 1 },
  'somewhat hard': { label: 'Somewhat hard', level: 2 },
  'fairly hard': { label: 'Fairly hard', level: 3 },
  'very hard': { label: 'Very hard', level: 4 },
};

export const ERA_BRIEFS = {
  1560: {
    title: 'The Silver Empire',
    difficulty: 'very hard',
    description: 'Spain is at its height. Nearly every colony and every cargo is Spanish, and the other nations come only to steal what Spain cannot guard. Few friendly ports have a governor, and many Spanish merchants turn away a captain without rank.',
    highlights: ['34 towns, 27 of them Spanish', 'The richest treasure fleets', 'No Dutch flag yet'],
  },
  1600: {
    title: 'Merchants and Smugglers',
    difficulty: 'very hard',
    description: 'Spain is a little weaker, but its grip is still nearly total. The few English and French settlements are tiny, and Dutch smugglers run the trade the Spanish crown forbids. The Spanish markets are more open to an outsider than in any other early era.',
    highlights: ['30 of 34 towns are Spanish', 'Wars and alliances change least', 'Start as a Dutch trader'],
  },
  1620: {
    title: 'The New Colonists',
    difficulty: 'fairly hard',
    description: 'Spain’s rivals plant their first lasting colonies, and Barbados becomes the first real port outside Spanish rule. Spanish power is slipping, so a privateer’s prospects are improving, but many towns are poor and prices low.',
    highlights: ['40 towns; the Dutch arrive', 'Tobacco replaces hides', 'Struggling towns, low prices'],
  },
  1640: {
    title: 'War for Profit',
    difficulty: 'easy',
    description: 'The golden age of the small independent buccaneer. Spain’s army and treasury are at their weakest while new colonies flourish in the Antilles. Wars and alliances shift often. A good era for captains of every skill.',
    highlights: ['43 towns, nearly all with a governor', 'Frequent wars and alliances', 'Suits every skill level'],
  },
  1660: {
    title: 'The Buccaneer Heroes',
    difficulty: 'easy',
    suggested: true,
    description: 'The height of swashbuckling. Spanish silver flows again but Spanish arms are a joke, and every tavern is full of fortune hunters. Every town has a governor and the economy is the healthiest of any era. The best choice for a first career.',
    highlights: ['43 towns, every one with a governor', 'The richest merchants', 'The most changeable diplomacy'],
  },
  1680: {
    title: 'Pirates’ Sunset',
    difficulty: 'somewhat hard',
    description: 'The last days of Caribbean piracy. Navies patrol the sea lanes, letters of marque are harder to get and governors less forgiving. Spain holds barely half the towns, and the treasure fleets carry less than ever.',
    highlights: ['46 towns, the fewest Spanish', 'The smallest treasure fleets', 'English pirates start at peace with all'],
  },
};

// The start screen's view of an era: its brief with the difficulty spelled out.
export function eraBrief(era) {
  const brief = ERA_BRIEFS[era];
  if (!brief) return null;
  return { era: String(era), ...brief, difficulty: ERA_DIFFICULTIES[brief.difficulty] };
}

// Each career's advice, by era and start nation, written for this port from
// ../piratesgold/docs/careers.md (the manual's "Historical Periods" advice);
// not the manual's text. 1560 has no Dutch career: Holland is still Spanish.
export const CAREER_ADVICE = {
  1560: {
    England: 'Royal backing and a strong, flexible squadron, but an empty purse: you need profits quickly.',
    France: 'A small fore-and-aft ship that cannot stand up to a war galleon. Pick your fights, because lost men take months to replace.',
    Spain: 'You begin very weak and must gamble at every turn. Only for the bold.',
  },
  1600: {
    England: 'Trade or war? Your large crew suits privateering, but the big, slow, lightly armed merchantman makes trading tempting.',
    France: 'A good ship and crew for privateering, but no strong friendly port to recruit or sell in. Take Spanish towns and put friendly governors in them early.',
    Holland: 'Built for trade: slow and lightly armed. Keep a small crew and pay it off often, use Trinidad as a base, and learn which Spanish governors look the other way. Raiding Spain costs you its trade until an amnesty.',
    Spain: 'A hard road in this era, for the most courageous only.',
  },
  1620: {
    England: 'Raid Spain with a clear conscience. Once you have a name, money and a fleet, turn to plundering small towns.',
    France: 'A handy barque for raiding Catholic Spain. Tortuga and Petit-Goave make ideal bases, close to the Florida Channel and the treasure fleet.',
    Holland: 'A powerful force but few Dutch harbours. Make friends with France and England, and try your hand at the treasure fleet.',
    Spain: 'Still hard, though a little easier. Foreign colonies are few, so stay on good terms with England, France and Holland.',
  },
  1640: {
    England: 'Everything favours you: English colonies buy your plunder, taverns are full of sailors, and governors hand out land and honours.',
    France: 'Tortuga is the ideal base, between Santo Domingo, Cuba and the Florida Channel convoys, with the Main and friendly Curaçao to the south.',
    Holland: 'Carry goods between the rich colonies and the small new ones. Buy sugar and food cheap in poor Spanish towns and sell them dear in Curaçao or Barbados.',
    Spain: 'One of the renegade’s good eras: raiding Spain pays, at war or at peace.',
  },
  1660: {
    England: 'Port Royale makes an excellent base and Barbados the best market for plunder, but crews are easier to find in the French ports of Hispaniola or the English islands.',
    France: 'Leave one or two nations alone so you can still trade when peace comes. Hispaniola’s buccaneer ports make recruiting easy.',
    Holland: 'A soldier of fortune who sails for anyone. Do not overlook honest trade: Barbados and Curaçao are the richest ports outside Spain.',
    Spain: 'The renegade’s best era: privateering or piracy against Spain is the way to go.',
  },
  1680: {
    England: 'A plain pirate with no commission, and every nation starts at peace. Watch for navy pirate hunters, and try 1660 first if you are new.',
    France: 'Commissions are still legal: use them against Spain, and watch for the Spanish pirate hunters.',
    Holland: 'Think trade and smuggling. Dutch ports are few, but English and French traders ignore their bans and even Spain usually deals with you.',
    Spain: 'A Spanish pirate hunter, sent to give the rich English and French colonies a taste of their own medicine. The trick is staying clear of their warships.',
  },
};

const RANK_NAMES = ['', 'Ensign', 'Captain'];
const START_NATION_ORDER = ['Spain', 'England', 'France', 'Holland'];

// The start screen's view of a career: its advice and what the start record
// hands you. `start` is the scenario's start record for that era and nation.
export function careerBrief(era, nationality, start) {
  if (!start) return null;
  const rankIndex = start.ranks.findIndex((rank) => rank > 0);
  const counts = start.ships.reduce((tally, ship) => tally.set(ship, (tally.get(ship) ?? 0) + 1), new Map());
  const ships = [...counts].map(([ship, count]) => (count > 1 ? `${count} ${ship}s` : ship)).join(' + ');
  return {
    name: start.name,
    advice: CAREER_ADVICE[era]?.[nationality] ?? '',
    force: [ships, `${start.crew} crew`, `${start.cannon} guns`, `${start.gold.toLocaleString('en')} gold`],
    rank: rankIndex >= 0 ? `${RANK_NAMES[start.ranks[rankIndex]] ?? 'ranked'} of ${START_NATION_ORDER[rankIndex]}` : null,
  };
}
