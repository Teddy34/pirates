import test from 'node:test';
import assert from 'node:assert/strict';
import { captainName, merchantCommodityPrice } from '../src/mechanics.mjs';
import {
  MARRIED, MERCHANT_DEBT, converse, fatherInLawGreeting, governorCharm, governorRelativeMet, governorRelativeRole,
  isMerchantFamily, makeInformant, marryGovernorRelative, merchantFarewell, merchantSuitAccepted, proposalAnswer,
  relativeWord, suitorId,
} from '../src/romance.mjs';

const scripted = (...values) => {
  const limits = [];
  return { limits, int(limit) { limits.push(limit); return values.shift() ?? 0; } };
};

const single = { personalWealth: 0, rank: 0, difficulty: 0, governorRelative: 0, married: 0, witAndCharm: false };

test('charm follows 0x12A12: (wealth/499 + 2·rank + difficulty) / (1 + niece), halved', () => {
  // A daughter on Apprentice with rank Major and about 1,000 wealth: (2 + 6 + 0) / 1 = 8 → 4.
  assert.equal(governorCharm({ ...single, personalWealth: 998, rank: 3 }), 4);
  // Rank 0 with about 4,000: 8 → 4.
  assert.equal(governorCharm({ ...single, personalWealth: 3992 }), 4);
  // The niece halves the sum before the halving: 8 / 2 = 4 → 2.
  assert.equal(governorCharm({ ...single, personalWealth: 998, rank: 3, governorRelative: 0x01 }), 2);
  // Wit and Charm doubles the halved value; odd sums truncate first.
  assert.equal(governorCharm({ ...single, rank: 3, difficulty: 1, witAndCharm: true }), 6);
  assert.equal(governorCharm({ ...single, difficulty: 1 }), 0);
});

test('she does not appear with charm below 1 or once you are married', () => {
  assert.equal(governorCharm(single), null);
  assert.equal(governorCharm({ ...single, difficulty: 1, governorRelative: 0x01 }), null);
  assert.equal(governorCharm({ ...single, rank: 5, married: MARRIED.MERCHANT_DAUGHTER }), null);
});

test('the relative word, role and the meeting bits come from w11', () => {
  assert.equal(relativeWord(0x0e), 'daughter');
  assert.equal(relativeWord(0x0f), 'niece');
  assert.equal(governorRelativeMet(0x1f), false);
  assert.equal(governorRelativeMet(0x20), true);
  assert.equal(governorRelativeRole(0x81), 'informant');
  assert.equal(governorRelativeRole(0xc0), 'wife');
});

test('the rival suitor is name id (town & 3)·8 + nation·32 + 2·niece + 1', () => {
  assert.equal(suitorId({ townIndex: 5, nationIndex: 0, governorRelative: 0 }), 9);
  assert.equal(captainName(9), 'Major Delgado');
  // An English niece: 32 + 2 + 1 + 24 for town 3; the nation bits fall into
  // the row, so her suitor is a Spaniard.
  assert.equal(suitorId({ townIndex: 3, nationIndex: 1, governorRelative: 0x01 }), 59);
  assert.equal(captainName(59), 'Admiral Orgonez');
  assert.equal(captainName(suitorId({ townIndex: 0, nationIndex: 2, governorRelative: 0 })), 'Major Fielding');
});

test('conversation makes an informant on rnd(charm) > 2', () => {
  const rng = scripted(3, 2);
  assert.equal(converse({ charm: 4, rng }), true);
  assert.equal(converse({ charm: 4, rng }), false);
  assert.deepEqual(rng.limits, [4, 4]);
  assert.equal(converse({ charm: 2, rng: scripted(1) }), false);
  assert.deepEqual(makeInformant({ governorRelative: 0x05, mood: 0 }), { governorRelative: 0x85, mood: 0 });
});

test('a proposal is scorned below 2, put off at 2-3, and leads to a duel from 4', () => {
  assert.equal(proposalAnswer(0), 'scorned');
  assert.equal(proposalAnswer(1), 'scorned');
  assert.equal(proposalAnswer(2), 'not-yet');
  assert.equal(proposalAnswer(3), 'not-yet');
  assert.equal(proposalAnswer(4), 'duel');
});

test('winning the duel marries her: married 2 + niece, w11 | 0x40, mood + 2', () => {
  assert.deepEqual(marryGovernorRelative({ name: 'Havana', governorRelative: 0x84, mood: 1 }),
    { married: 2, town: { name: 'Havana', governorRelative: 0xc4, mood: 3 } });
  assert.equal(marryGovernorRelative({ governorRelative: 0x03, mood: -1 }).married, 3);
});

test('leaving the merchant: the wife dines, and the single captain may meet the daughter on rnd(10) == 0', () => {
  assert.equal(merchantFarewell({ merchantFamily: 0x40, married: 1, rng: scripted() }), 'wife');
  const rng = scripted(0, 3);
  assert.equal(merchantFarewell({ merchantFamily: 0, married: 0, rng }), 'daughter');
  assert.equal(merchantFarewell({ merchantFamily: 0, married: 0, rng }), null);
  assert.deepEqual(rng.limits, [10, 10]);
  const wed = scripted(0);
  assert.equal(merchantFarewell({ merchantFamily: 0, married: 2, rng: wed }), null);
  assert.deepEqual(wed.limits, []);
});

test('the merchant daughter needs 400 personal wealth (200 with Wit and Charm) and a 500 gold debt', () => {
  assert.equal(merchantSuitAccepted({ personalWealth: 399, witAndCharm: false }), false);
  assert.equal(merchantSuitAccepted({ personalWealth: 400, witAndCharm: false }), true);
  assert.equal(merchantSuitAccepted({ personalWealth: 200, witAndCharm: true }), true);
  assert.equal(merchantSuitAccepted({ personalWealth: 199, witAndCharm: true }), false);
  assert.equal(MERCHANT_DEBT, 500);
});

test('the merchant family: w12 & 0xE0, three-quarter prices and the father-in-law greetings', () => {
  assert.equal(isMerchantFamily(0x40), true);
  assert.equal(isMerchantFamily(0x1f), false);
  assert.equal(isMerchantFamily(undefined), false);
  const common = { growth: 130, month: 6, kind: 'goods' };
  assert.equal(merchantCommodityPrice(common), 75);
  assert.equal(merchantCommodityPrice({ ...common, familyDiscount: true }), 56);
  assert.deepEqual([0, 2000, 2001, 5000, 5001, 20000, 20001].map(fatherInLawGreeting), [0, 0, 1, 1, 2, 2, 3]);
});
