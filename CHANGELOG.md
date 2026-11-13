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
