// Courtship, marriage and informants (marriage.md; courtship.asm 0x128C1,
// merchant_daughter.asm 0x22451, the merchant's entry at 0x21E56). DOM-free.
//
// The governor's relative lives in the town word w11 (`governorRelative`):
// bit 0 picks daughter (0) or niece (1), 0x40 means you married her and
// 0x80 that she is your informant. Any of 0xE0 turns the visit into the
// informant's or wife's report (CSTN 26). The merchant's family lives in w12
// (`merchantFamily`): marrying his daughter sets 0x40, and any of 0xE0 makes
// him your father-in-law. `married` is the player byte 0x45E86: 0 single,
// 1 the merchant's daughter, 2 the governor's daughter, 3 his niece.

export const GOVERNOR_NIECE = 0x01;
export const GOVERNOR_MARRIED = 0x40;
export const GOVERNOR_INFORMANT = 0x80;
const GOVERNOR_MET = 0xe0;
export const MERCHANT_MARRIED = 0x40;
const MERCHANT_FAMILY = 0xe0;

export const MARRIED = Object.freeze({ SINGLE: 0, MERCHANT_DAUGHTER: 1, GOVERNOR_DAUGHTER: 2, GOVERNOR_NIECE: 3 });

// CSTN 89.
export function relativeWord(governorRelative = 0) {
  return governorRelative & GOVERNOR_NIECE ? 'niece' : 'daughter';
}

// 0x1291E: the visit becomes the informant's or wife's report.
export function governorRelativeMet(governorRelative = 0) {
  return Boolean(governorRelative & GOVERNOR_MET);
}

// CSTN 26 entry 1 or 2: "wife" when bit 0x40 is set, otherwise "informant".
export function governorRelativeRole(governorRelative = 0) {
  return governorRelative & GOVERNOR_MARRIED ? 'wife' : 'informant';
}

export function isMerchantFamily(merchantFamily = 0) {
  return Boolean(merchantFamily & MERCHANT_FAMILY);
}

// 0x12A12-0x12AB5. `rank` is your rank with the governor's nation (0x4605C),
// `personalWealth` 0x45EFE and `difficulty` 0x45E6F. The sum is divided by
// 1 for a daughter and 2 for a niece (C division, truncating). A result
// below 1, or any marriage, means she never appears. Otherwise charm is
// halved, then doubled with Wit and Charm (ability 2).
export function governorCharm({ personalWealth, rank, difficulty, governorRelative, married, witAndCharm }) {
  const divisor = (governorRelative & GOVERNOR_NIECE) + 1;
  const base = Math.trunc((Math.trunc(personalWealth / 499) + 2 * rank + difficulty) / divisor);
  if (base < 1 || married) return null;
  const charm = Math.trunc(base / 2);
  return witAndCharm ? charm * 2 : charm;
}

// 0x12AC7: the rival suitor is the 0x19FBB name id
// (town & 3) * 8 + nation * 32 + 2 * niece + 1, read by `captainName`. With
// the nation at bits 5-6 rather than 6-7, as the hunters store it, the
// surname list is nation >> 1 and the row (town & 3) + 4 * (nation & 1):
// an English governor's daughter is courted by a Spaniard, as in the original.
export function suitorId({ townIndex, nationIndex, governorRelative }) {
  return (townIndex & 3) * 8 + nationIndex * 32 + 2 * (governorRelative & GOVERNOR_NIECE) + 1;
}

// Make conversation (0x12CD3): rnd(charm) > 2 makes her your informant
// (w11 |= 0x80, informants + 1, and the sneaking bit 0x08 of 0x45F0A, which
// closes the merchant, is cleared). The roll is made every time.
export function converse({ charm, rng }) {
  return rng.int(charm) > 2;
}

// Propose (0x12B48): below 4 she refuses, with CSTR 142 when charm / 2 is 0
// and CSTR 143 when it is 1. From 4 up, CSTR 144 and the suitor's duel.
export function proposalAnswer(charm) {
  if (charm >= 4) return 'duel';
  return Math.trunc(charm / 2) === 0 ? 'scorned' : 'not-yet';
}

// Winning the duel (0x12C5B-0x12CCC): married = 2 + niece, w11 |= 0x40 and
// governor mood + 2.
export function marryGovernorRelative(town) {
  return {
    married: MARRIED.GOVERNOR_DAUGHTER + (town.governorRelative & GOVERNOR_NIECE),
    town: { ...town, governorRelative: town.governorRelative | GOVERNOR_MARRIED, mood: town.mood + 2 },
  };
}

export function makeInformant(town) {
  return { ...town, governorRelative: town.governorRelative | GOVERNOR_INFORMANT };
}

// 0x223C6-0x22464: leaving the merchant. His son-in-law dines with his wife
// (CSTR 295); otherwise, while you are single, his daughter appears on
// rnd(10) == 0. The roll is made only when single.
export function merchantFarewell({ merchantFamily, married, rng }) {
  if (isMerchantFamily(merchantFamily)) return 'wife';
  if (married) return null;
  return rng.int(10) === 0 ? 'daughter' : null;
}

// 0x224CC: to propose you need 400 personal wealth (200 with Wit and Charm).
export function merchantSuitAccepted({ personalWealth, witAndCharm }) {
  return personalWealth >= (witAndCharm ? 200 : 400);
}

// 0x2257C: the debt. CSTR 298 says 5,000 gold, but the code checks and takes
// 500 party gold (0x45FBA), the same purse the merchant's greetings measure.
export const MERCHANT_DEBT = 500;

// 0x21F29-0x21FAD: the greeting reads party gold. Father-in-law lines are
// CSTR 291-294 (the stranger's are 257-260).
export function fatherInLawGreeting(partyGold) {
  if (partyGold < 2001) return 0;
  if (partyGold < 5001) return 1;
  if (partyGold < 20001) return 2;
  return 3;
}
