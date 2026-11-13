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
  pips), whether it is the suggested first career (1660), a short
  description with three highlights, and your career for the chosen flag:
  its name, advice for that era and nation, and the ships, crew, guns,
  gold and any rank it starts with. The descriptions and advice are written
  for the port from the research archive, not quoted from the manual.

### Changed

- The era menu uses the manual's titles: 1560 is "The Silver Empire" (was
  "Early explorers") and 1680 is "Pirates' Sunset".

- The barmaid's trust is hidden to keep the tavern in character: no trust
  counter, rules text or "+1 trust" label. Her manner hints at progress in
  four bands, the menu offers the original's "A drink, lass" and "A drink and
  some company", and winning her uses the original "won the barmaid's heart"
  line.

### Fixed

- The captain's name on the start screen can contain C and L again; game
  keys no longer fire while typing in a form field.
- The sea chart frees its canvas memory on close, ignores non-primary mouse
  buttons, lets its town panel scroll on short screens, and the game stops
  redrawing underneath it.
