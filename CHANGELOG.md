# Changelog

Every change to the game, its tools or its documentation is recorded here,
newest first. Add an entry under **Unreleased** in the same commit as the
change. Group entries under *Added*, *Changed*, *Fixed* or *Removed*, write
them for a player or maintainer (what changed and why, not which files), and
note any deliberate departure from the original's mechanics.

Changes merged before this log was started (2026-11-13) are in the git
history.

## Unreleased

### Added

- Courtship and marriage. At favour 2 or more with a town's nation, an
  audience ends with dinner and the governor's daughter or niece, courted by
  a rival suitor. Your charm is (personal wealth / 499 + twice your rank with
  that nation + difficulty), divided by two for a niece, then halved, and
  doubled with Wit and Charm. Making conversation can win her as an
  informant who reports the treasure fleet and silver train on later visits;
  proposing needs charm 4 or more and a sword duel with the suitor (losing
  sets reputation to −1). Winning marries her and pleases the governor (mood
  +2). After leaving a merchant, a single captain has one chance in ten to
  meet his daughter: proposing needs 400 personal wealth (200 with Wit and
  Charm) and 500 gold for her father's debt. Your father-in-law greets you by
  your purse, sells at three quarters of the usual price, trades even in a
  Spanish town that would turn you away, and you dine with your wife after
  each visit. Marriage now counts in the retirement score and career
  summary. As in the original, the debt is 500 gold although the text says
  5,000; one marriage blocks every other; and the suitor's surname comes
  from the original's name-id arithmetic, so a French governor's daughter
  may be courted by an Englishman. Departures: the informant's message names
  a niece as a niece (the original always says "daughter"), and the courtship
  scenes use the governor and merchant portraits until their own pictures
  exist. `?preview=governor-daughter`, `governor-niece`,
  `governor-informant`, `governor-wife`, `merchant-daughter` and
  `merchant-family` open them, and `make test-browser` checks them.
- Ten save slots. "Save voyage" in a town now asks which slot to use and
  checks before overwriting a used one. The start screen's "Load a voyage"
  lists the slots with the captain, date, town, ships and gold, and can
  delete a save. The autosave still follows the voyage and is what "Continue
  saved voyage" resumes; retiring clears only the autosave. The original kept
  a single save.
- The logbook has a Personal status page, as in the original: married or
  single, age, health
  (fine, good, fair or poor) with the wound count, personal wealth, land,
  reputation, difficulty, and your rank and standing with each nation.
- When your health worsens, the next month end tells you, and the log
  records it. At poor health the notice warns that the next division of the
  plunder ends your career. The original never announced it.

- Fort battles: attacking a fortified town from the sea is now fought with
  the sea-battle controls against its forts, which stand on rocky headlands
  along the coast beside the town's harbor. Each fort has 12 guns, never
  moves, always turns its guns on you and cannot be sunk, though your
  broadsides kill its gunners, dismount its guns and breach its walls; a fort
  with no guns left falls silent. Your broadside bears on the nearest fort
  still firing. You sail at half speed. Bring your flagship alongside the
  town quay to land her crew and storm the walls (alert +16, reputation −2, the garrison left at half the
  soldiers plus a tenth of the surviving gunners). Running aground, the fort's
  rocks included, leaving the field, nightfall or sinking ends the attack.
  The briefing says to land at the quay, not under the fort. Departure from
  the original: there you get through by touching the fort itself or the
  shore beside it; the port's landing place is the quay, and the field's
  layout is the port's own. The field turns with the wind so you always
  start upwind of the harbor, on a broad reach toward the quay; the original's
  start is not known. Also unlike the original, where all of a town's
  forts fight as one, with one 48-gun broadside for four forts, which made a
  four-fort town all but impossible to take from the sea, each fort fires
  its own 12 guns from its own place, and a distant fort misses more often.
  Check it with `?preview=fort-battle`.
- The captain's log is hidden during sea battles, as in sword fights, so it
  no longer covers the battle.
- Full-screen pixel-art sea chart of the Caribbean, painted as an old map
  from the era's navigation map, with every town and your ship marked.
  Open it with C, the Chart control at sea or the logbook; the voyage pauses
  while it is open. Check it with `?preview=chart`.
- Town gazetteer beside the chart: search, filter by flag, sort by name or
  distance, and pick a town to see its City Information figures and its
  distance and bearing from your ship.
- This changelog.
- Era panel on the start screen: choosing an era shows its title, its
  difficulty as the manual rates it (Easy to Very hard, also shown as
  pips), whether it is the suggested era for a first game (1660), a short
  description with three highlights, and your career for the chosen flag:
  its name, advice for that era and nation, and the ships, crew, guns,
  gold and any rank it starts with. The descriptions and advice are written
  for the port from the research archive, not quoted from the manual.

### Changed

- Fast travel (T, at sea or on foot) now runs time twice as fast instead
  of five times, so the ship stays steerable; T still toggles it off, and any
  voyage event still clears it. The speed readout starts with "×2" while it is
  on. Departure from the original, whose fast mode is five times faster.
- The shipwright works on one screen (#74). It lists every ship with her
  hold and her guns, and a Repair and a Sell button for each, plus Repair
  all when several are damaged. Cannon sell one per click, faster while the
  button is held, or all the spare ones at once. You stay in the yard after
  each sale or repair. Deliberate departure: the original picks ships from
  a list in separate menus; prices and cash rules are unchanged. The fleet
  still shares one cannon count, shown filling each ship in turn.

- The era menu uses the manual's titles: 1560 is "The Silver Empire" (was
  "Early explorers") and 1680 is "Pirates' Sunset".

- The barmaid's trust is hidden to keep the tavern in character: no trust
  counter, rules text or "+1 trust" label. Her manner hints at progress in
  four bands, the menu offers the original's "A drink, lass" and "A drink and
  some company", and winning her uses the original "won the barmaid's heart"
  line.
- Code-quality pass driven by SonarJS static analysis, with no change to
  play. The seven browser smoke checks share one harness
  (`tools/browser-harness.mjs`) instead of seven copies of the same 90 lines
  of server, Chromium and DevTools code. The `?preview=` states are one table
  instead of forty `if` branches. The sea chart, terrain, sea, fencer and
  backdrop painters, the sword-fight and sea-battle steps, the keyboard
  handler and the voyage status bar are split into small named functions.
  Painted pixels, fights and battles were checked to match the previous code
  exactly. Terrain chunks paint about 15% faster.

### Fixed

- A fort battle now puts the town on alert like any sea battle fought near
  it (24 − 2 per cell away, about +24 at the town), whether you land, run
  aground, are driven off or fight until nightfall, as in the original. A
  failed attack from the sea is no longer free.
- Ashore, the North and South buttons now light up while held, like West
  and East, whether you hold the button or the arrow key. Holding them also
  walks like West and East do, so holding two buttons at once walks
  diagonally (#78).
- After a drink with the barmaid, the only choice is now "Return to the
  tavern"; another round starts from the tavern, as in the original.
- Loading a voyage saved in a town now reopens that town instead of putting
  you at sea outside it. The visit carries on where you saved, so a reload
  gives no second governor audience or recruiting round. This departs from
  the original, which resumed at sea on the town's departure cell.
- The start screen's dropdown lists (era, flag, difficulty, ability) are
  readable again: they had cream text on a white list in some browsers and
  now use the game's dark panel colours.
- The start screen's era highlights no longer describe one flag's career:
  1600 always said "Start as a Dutch trader" and 1680 "English pirates
  start at peace with all", whatever flag was chosen. They now read "No
  Dutch towns, only smugglers" and "Cheap sugar on the sugar islands";
  each career's own advice still covers its start.
- The captain's name on the start screen can contain C and L again; game
  keys no longer fire while typing in a form field.
- The sea chart frees its canvas memory on close, ignores non-primary mouse
  buttons, lets its town panel scroll on short screens, and the game stops
  redrawing underneath it.
- The browser smoke checks no longer fail intermittently when Chromium is
  still writing its profile as a check finishes.
- `make syntax` now checks every source file: four modules, including the
  sea-battle rules and renderer, were missing from its hand-kept list.

### Removed

- An unreachable second `?preview=arrival` branch (the first always matched),
  an unused notice dialog and unused function parameters.
