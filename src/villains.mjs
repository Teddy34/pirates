// The villains of the family quest (lost_relatives.md): four records at
// 0x471DA, each a person who knows where your lost relative is. DOM-free.
// A free slot is null. Town values are indices into the voyage's towns.
//
// Record bytes the port drops: byte 0 (the nation he moves in, always Spain),
// byte 1 (always 6, its use is untraced) and the "heard" bit 0x80 on history
// entries, which is only masked off. On his current town the bit matters, and
// is kept as `heardHere` (see moveVillains).
import { randomTownRange } from './mechanics.mjs';

export const VILLAIN_SLOTS = 4;
const VILLAIN_NATION = 'Spain';

// CSTN 78's first eight titles (Marquis and Duke are never rolled).
const VILLAIN_TITLES = ['Mr.', 'Ensign', 'Captain', 'Major', 'Colonel', 'Admiral', 'Baron', 'Count'];
// CSTN 97.
const VILLAIN_NATIONALITIES = ['Spaniard', 'Englishman', 'Frenchman', 'Dutchman'];
// CSTN 2-5, all sixteen names of each nation.
const VILLAIN_SURNAMES = [
  ['Montalban', 'Delgado', 'Vasquez', 'La Mancha', 'de Silva', 'Almagro', 'Delado', 'Orgonez', 'de Loyola', 'de Nieva', 'Alvarado', 'Sanchez', 'de Toledo', 'Valdez', 'Mendoza', 'Enriquez'],
  ['Fielding', 'Moodyford', 'Holcroft', 'Thatcher', 'Culliford', 'Roberts', 'Alexander', 'Gilford', 'Rackham', 'Howards', 'Parks', 'Glatsby', 'Clinton', 'Wilsons', 'O’Gilby', 'Thornbill'],
  ['Raynale', 'de Coligny', 'le Crozat', 'Galoise', 'Carriere', 'Ribault', 'le Grand', 'Olonais', 'Fenelon', 'du Tertre', 'de Ville', 'Roberval', 'Desmaret', 'de Lavale', 'du Clarion', 'la Salle'],
  ['vaan Ryhn', 'Ruyters', 'Tromper', 'de Vranck', 'de Graff', 'Brugmans', 'van Hudde', 'Haakles', 'der Wee', 'van Neck', 'de Ginzu', 'de Vries', 'Huyghen', 'de Witt', 'Bruegel', 'van Rapp'],
];

export const emptyVillains = () => Array(VILLAIN_SLOTS).fill(null);

// 0x1A040: "Captain Ribault".
export function villainName({ title, nationality, surname }) {
  return `${VILLAIN_TITLES[title]} ${VILLAIN_SURNAMES[nationality][surname]}`;
}

// "Frenchman Captain Ribault", as in "the evil %s %s" (CSTR 131, 137).
export function villainDescription(villain) {
  return `${VILLAIN_NATIONALITIES[villain.nationality]} ${villainName(villain)}`;
}

// 0x12178, after a promotion. Nothing happens while the fourth slot is taken;
// otherwise the first free slot gets a villain in a random Spanish town.
// The history is every slot "no town": lost_relatives.md §3 says your current
// town, but the code writes 0x4605A + 1 (one past the town range, the same
// invalid town as the wipe at 0xAAE4), not 0x46058. This routine does not
// set the town's staying flag. The port stops when no Spanish town is left in
// the range, where the original would loop for ever. Returns the slot, or -1.
export function createVillain({ villains, towns, rng }) {
  const range = randomTownRange(towns);
  const spanish = towns.slice(0, range).some(({ nation }) => nation === VILLAIN_NATION);
  if (villains[VILLAIN_SLOTS - 1] || !spanish) return { villains, slot: -1 };
  let townIndex;
  do townIndex = rng.int(range); while (towns[townIndex].nation !== VILLAIN_NATION);
  const villain = {
    townIndex,
    history: [null, null, null, null],
    surname: rng.int(16), title: rng.int(8), nationality: rng.int(4),
  };
  const next = [...villains];
  const slot = next.indexOf(null);
  next[slot] = villain;
  return { villains: next, slot };
}

const townDistance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

// 0xCBA7. Each villain may hop to a Spanish town within a random radius with
// no villain staying there (w10). The best score wins: a content governor,
// little gold over soldiers, and far from the last Spanish town you left
// alerted (0x45EAE[Spain], `alertedTownIndex`). Town flags change in place,
// as monthlyWorldUpdate's do, so each villain sees the moves before his.
// Staying flags are cleared only here, from the town he just left. A jump
// from the duel (below) or a wipe leaves the old town flagged: a faithful
// quirk that shuts villains out of that town for the rest of the game.
// Quirk: gossip saying he is here sets bit 0x80 on the town byte (0x1EE7F), and
// 0xCD5C compares it masked against the unmasked seed (0xCBDE). So while the
// bit stands, a month in which no town scored shifts his own town into the
// history and flags it, wearing away his trail until he really moves.
export function moveVillains({ villains, towns, difficulty, alertedTownIndex, rng }) {
  const alerted = towns[alertedTownIndex] ?? towns[0];
  const range = randomTownRange(towns);
  return villains.map((villain) => {
    if (!villain) return null;
    const here = towns[villain.townIndex];
    let bestScore = -999;
    let bestIndex = null;
    towns.slice(0, range).forEach((town, index) => {
      if (town.nation !== VILLAIN_NATION || town.villainStaying) return;
      const radius = rng.int(difficulty + 5);
      if (radius * radius <= townDistance(town, here)) return;
      const score = 4 * town.mood - ((town.gold - town.soldiers) >> 3) + townDistance(town, alerted) - 255;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    const history = [villain.townIndex, ...villain.history.slice(0, 3)];
    if (bestIndex === null && villain.heardHere) {
      here.villainStaying = true;
      return { ...villain, history };
    }
    if (bestIndex === null || bestIndex === villain.townIndex) return villain;
    here.villainStaying = false;
    towns[bestIndex].villainStaying = true;
    return { ...villain, townIndex: bestIndex, history, heardHere: false };
  });
}

// 0x1EBA6: the slots someone in this town can talk about, those whose current
// town or one of the last four is this town.
export function villainsKnownIn(villains, townIndex) {
  return villains.flatMap((villain, slot) => (
    villain && (villain.townIndex === townIndex || villain.history.includes(townIndex)) ? [slot] : []));
}

// CSTR 108 "is now in" when he is here, otherwise CSTR 107 "left for": the
// town he moved to from here, taken from his most recent stay here.
export function villainReport(villain, townIndex) {
  if (villain.townIndex === townIndex) return { present: true, townIndex };
  const stay = villain.history.indexOf(townIndex);
  return { present: false, townIndex: stay === 0 ? villain.townIndex : villain.history[stay - 1] };
}

// 0x1EE7F: the gossip has placed him in the town he is in now.
export function villainHeardHere(villains, slot) {
  const next = [...villains];
  next[slot] = { ...villains[slot], heardHere: true };
  return next;
}

// 0x18913: the first villain staying in this town, or -1.
export function villainInTown(villains, townIndex) {
  return villains.findIndex((villain) => villain?.townIndex === townIndex);
}

// 0x18A02: before the fight he is sent to a random town of any nation. He
// stays there if he wins, and the history is left alone, so the gossip's
// "left for" chain from his last town points to where he fled.
export function villainFlees({ villains, slot, towns, rng }) {
  const next = [...villains];
  next[slot] = { ...villains[slot], townIndex: rng.int(randomTownRange(towns)), heardHere: false };
  return next;
}
