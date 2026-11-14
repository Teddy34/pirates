// Browser smoke check for courtship and marriage: the governor's daughter
// after an audience at favour 2, the informant, both results of the
// suitor's duel, a niece's refusal, the wife's report, the merchant's
// daughter and the father-in-law's prices, at a desktop and a narrow
// viewport (local ?preview= states).
import { S, VIEWPORTS, dialogTitle, withBrowser } from './browser-harness.mjs';

await withBrowser({ name: 'romance', portOffset: 9, screenshotEnv: 'ROMANCE_SCREENSHOTS' }, async ({ evaluate, until, clickButton, screenshot, open, setViewport }) => {
  const bodyText = `document.querySelector('#dialog-body').textContent`;
  const expectBody = async (where, fragment) => {
    const text = await evaluate(bodyText);
    if (!text.includes(fragment)) throw new Error(`${where}: "${fragment}" not in: ${text}`);
  };
  const town = `${S}.towns[${S}.visit.townIndex]`;
  const meetDaughter = async () => {
    await open('governor-daughter');
    await until('the audience', `${dialogTitle}?.startsWith('My dear Major')`);
    await clickButton('Stay for dinner');
    await until('the introduction', `${dialogTitle} === 'The governor’s young daughter'`);
  };

  for (const viewport of VIEWPORTS) {
    const where = viewport.name;
    await setViewport(viewport);
    await evaluate(`localStorage.clear(), true`).catch(() => {});

    // Charm 4: the daughter, courted by a named suitor.
    await meetDaughter();
    await expectBody(where, 'presently being courted by Major');
    await screenshot(`${where}-introduction`);

    // Conversation: rnd(4) > 2 decides; the message must match the state.
    await clickButton('Make conversation');
    await until('the conversation', `['An informant at the governor’s house', 'A pleasant evening'].includes(${dialogTitle})`);
    const informant = await evaluate(`${dialogTitle} === 'An informant at the governor’s house'`);
    if (informant !== Boolean(await evaluate(`${town}.governorRelative & 0x80`))) throw new Error(`${where}: informant bit does not match the message`);
    if (informant && await evaluate(`${S}.player.informants`) !== 1) throw new Error(`${where}: informant count not raised`);

    // A lost duel: reputation -1, still single.
    await meetDaughter();
    await clickButton('Propose marriage');
    await until('the proposal', `${dialogTitle} === 'A jealous suitor'`);
    await expectBody(where, 'You have captured my heart, Major');
    await clickButton('Fight the duel');
    await clickButton('Cutlass');
    await until('the duel', `${S}.mode === 'sword' && globalThis.piratesPreview.settleFight('defeated')`);
    await until('the defeat', `${dialogTitle} === 'The suitor wins'`);
    if (await evaluate(`${S}.player.reputation`) !== -1) throw new Error(`${where}: a lost duel did not set reputation to -1`);
    if (await evaluate(`${S}.player.married`) !== 0) throw new Error(`${where}: married after losing`);

    // A won duel: married 2, w11 | 0x40, mood + 2.
    await meetDaughter();
    const mood = await evaluate(`${town}.mood`);
    await clickButton('Propose marriage');
    await until('the proposal', `${dialogTitle} === 'A jealous suitor'`);
    await clickButton('Fight the duel');
    await clickButton('Cutlass');
    await until('the duel', `${S}.mode === 'sword' && globalThis.piratesPreview.settleFight('won')`);
    await until('the wedding', `${dialogTitle} === 'A wedding'`);
    await screenshot(`${where}-wedding`);
    if (!await evaluate(`${S}.player.married === 2 && (${town}.governorRelative & 0x40) !== 0 && ${town}.mood === ${mood + 2}`)) throw new Error(`${where}: the wedding did not update the state`);
    await clickButton('Return to town');
    await until('the town', `${S}.mode === 'town' && ${dialogTitle} === 'Guadeloupe'`);

    // Charm 2 with a niece: put off.
    await open('governor-niece');
    await until('the audience', `${dialogTitle}?.startsWith('My dear Major')`);
    await clickButton('Stay for dinner');
    await until('the introduction', `${dialogTitle} === 'The governor’s young niece'`);
    await clickButton('Propose marriage');
    await until('the refusal', `${dialogTitle} === '“Perhaps when you have distinguished yourself”'`);

    // The wife reports the convoys after dinner.
    await open('governor-wife');
    await clickButton('Stay for dinner');
    await until('the report', `${dialogTitle} === 'Dinner with your wife'`);
    await expectBody(where, 'After dinner, you visit your wife');
    await expectBody(where, 'The Treasure Fleet is in');

    // The merchant's daughter: the 500 gold debt.
    await open('merchant-daughter');
    await until('the daughter', `${dialogTitle} === 'An attractive young woman'`);
    await clickButton('Propose marriage');
    await until('the debt', `${dialogTitle} === 'Her father’s debt'`);
    await screenshot(`${where}-merchant-daughter`);
    await clickButton('Pay the debt');
    await until('the wedding', `${dialogTitle} === 'A wedding'`);
    if (!await evaluate(`${S}.player.married === 1 && ${S}.player.partyGold === 700 && (${town}.merchantFamily & 0x40) !== 0`)) throw new Error(`${where}: the merchant wedding did not update the state`);

    // The father-in-law: greeting, three-quarter prices, supper with the wife.
    await open('merchant-family');
    await until('the merchant', `${dialogTitle} === 'Buy or sell by the ton'`);
    await expectBody(where, 'Your father-in-law claps you on the shoulder');
    await clickButton('Return to town');
    await until('supper', `${dialogTitle} === 'Supper at home'`);
    console.log(`${where}: courtship, informant, both duels, refusal, the wife, the merchant's daughter and the father-in-law all work.`);
  }
});
