import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/mechanics.mjs';
import {
  RETIREMENT_JOBS, careerSummary, mayReturnToPirating, moodIndex, recordInHallOfFame, reputationClass,
  retirementHappiness, retirementLine, retirementScore, wealthClass,
} from '../src/retirement.mjs';

const career = {
  personalWealth: 50000, land: 20, rankSum: 6, reputation: 20,
  relativesRescued: 1, married: 0, wounds: 1, careerYears: 6,
};

test('the retirement score follows 0x5039', () => {
  // raw = 5000 + 1000 + 3000 + 4000 + 1000 − 1000; points = trunc(raw/330 · 19/20)
  assert.deepEqual(retirementScore(career), { raw: 13000, points: 37, job: 11, tier: 2 });
  assert.equal(RETIREMENT_JOBS[11], 'Colonel');
  const legend = retirementScore({ personalWealth: 300000, land: 100, rankSum: 20, reputation: 40, relativesRescued: 4, wounds: 0, careerYears: 2 });
  assert.equal(legend.points, 198);
  assert.equal(legend.job, 0);
  assert.equal(legend.tier, 0);
});

test('a score of zero or less picks the low jobs, truncating toward zero', () => {
  const none = { personalWealth: 0, land: 0, rankSum: 0, reputation: 0, relativesRescued: 0 };
  assert.deepEqual(retirementScore({ ...none, wounds: 0, careerYears: 3 }), { raw: 0, points: 0, job: 19, tier: 3 });
  // −2000/330 · 15/20 = −4.5 → −4; 20 − trunc(−0.4) = 20 → Farm hand.
  assert.equal(retirementScore({ ...none, wounds: 2, careerYears: 10 }).job, 19);
  // −37 → 20 + 3 = 23, capped at 22 → Scoundrel; Pauper and Beggar are unreachable.
  const worst = retirementScore({ ...none, wounds: 10, careerYears: 0 });
  assert.equal(worst.points, -37);
  assert.equal(RETIREMENT_JOBS[worst.job], 'Scoundrel');
});

test('happiness, wealth and reputation classes', () => {
  assert.equal(retirementHappiness({ relativesRescued: 0, wounds: 0, careerYears: 5 }), 1);
  assert.equal(moodIndex(1), 3);
  assert.equal(retirementHappiness({ relativesRescued: 0, wounds: 18, careerYears: 5 }), -1);
  assert.equal(moodIndex(-1), 0);
  assert.equal(moodIndex(4), 5);
  assert.equal(wealthClass({ personalWealth: 50000, land: 20 }), 6);
  assert.equal(wealthClass({ personalWealth: 1000, land: 0 }), 1);
  assert.equal(wealthClass({ personalWealth: -500, land: 0 }), 0);
  assert.equal(reputationClass(20), 6);
  assert.equal(reputationClass(5), 2);
  assert.equal(reputationClass(-8), 0);
});

test('the lure of the sea needs a town, a normal difficulty and some health left', () => {
  const base = { inTown: true, difficulty: 1, careerYears: 9, wounds: 2, medicine: false };
  assert.equal(mayReturnToPirating(base), true);
  assert.equal(mayReturnToPirating({ ...base, careerYears: 10 }), false);
  assert.equal(mayReturnToPirating({ ...base, careerYears: 10, medicine: true }), true);
  assert.equal(mayReturnToPirating({ ...base, inTown: false }), false);
  assert.equal(mayReturnToPirating({ ...base, difficulty: 4 }), false);
});

test('the career summary reads like the original pages', () => {
  const summary = careerSummary({
    ...career, ranks: { Spain: 0, England: 2, France: 4, Holland: 0 }, happiness: 1,
  });
  assert.deepEqual(summary, [
    'You achieved the title of an English Captain and a French Colonel, making you an extremely important member of your community.',
    'You accumulated the sum of 50,000 gold pieces and 1,000 acres of land during your career, making you an extremely wealthy man.',
    'Your exploits on the high seas leave you with a reputation as a brave, bold, and fearless captain.',
    'You retired from privateering at the age of 31. You were unable to find a bride. You succeeded in rescuing one member of your family. You were wounded once. In the course of your travels, you become contented and cheerful.',
  ]);
  const plain = careerSummary({
    ranks: { Spain: 0, England: 0, France: 0, Holland: 0 }, personalWealth: 0, land: 0, reputation: 0,
    relativesRescued: 0, wounds: 0, careerYears: 2, happiness: 0,
  });
  assert.equal(plain[0], 'You failed to achieve a rank, making you an undistinguished member of your community.');
  assert.equal(plain[1], 'You accumulated the sum of 0 gold pieces during your career, making you a penniless pauper.');
  assert.equal(plain[3], 'You retired from privateering at the age of 27. You were unable to find a bride. In the course of your travels, you become sad and bitter.');
});

test('the retirement line names the job and the town', () => {
  const line = retirementLine({ job: 11, townName: 'Port Royal', rng: createRng(7) });
  assert.match(line, /^Your pirating days are over\. Your seafaring adventures have made you a Colonel in Port Royal, where /);
});

test('the hall of fame keeps the ten best careers', () => {
  let entries = [];
  for (let points = 0; points < 12; points += 1) entries = recordInHallOfFame(entries, { captain: `C${points}`, points });
  assert.equal(entries.length, 10);
  assert.equal(entries[0].points, 11);
  assert.equal(entries.at(-1).points, 2);
});
