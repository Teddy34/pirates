# Pirates! web port

This repository is a browser port inspired by *Pirates! Gold*. Build a playable single-player game that preserves the documented systems and feel while using web-native code and original presentation assets.

## Start here

Before changing a game system, read its source document in `../piratesgold`:

`../piratesgold` is the project's main research archive, not just a small set
of design notes. It contains focused mechanics documents, decoded scenario
data, extraction tools, annotated disassembly, and raw disassembly evidence.
Search it before guessing about original behavior or starting new reverse
engineering. In particular, inspect `../piratesgold/evidence/binary/disasm/`
when a focused document does not answer an implementation question, and trace
the document's cited routines before treating an ambiguity as unresolved.
Check the focused document and `docs/porting_guide.md` first: many systems
already have implementation-ready rules, UI flows, and known gaps. Do not
repeat reverse engineering that the archive has already documented.

- `../piratesgold/README.md` is the main reverse-engineering report and data-layout reference.
- `../piratesgold/docs/README.md` indexes the focused mechanics documents.
- `../piratesgold/docs/porting_guide.md` collects implementation-ready flows,
  priorities, and cross-references for the web port.
- `../piratesgold/docs/sailing.md` covers time, wind, fleet speed, movement, clouds, and food.
- `../piratesgold/docs/encounters.md` covers encounter timing and ship selection.
- `../piratesgold/docs/entering_towns.md` and `town_attack_and_plunder.md` cover town arrival and capture.
- `../piratesgold/docs/town_economy.md` covers growth, trade, prices, and garrisons.
- `../piratesgold/docs/diplomacy_and_world.md` covers relations and monthly world updates.
- `../piratesgold/docs/treasure_fleet_silver_train.md` covers routes, loot, and treasure maps.
- `../piratesgold/docs/lost_relatives.md`, `marriage.md`, and `health_age_land.md` cover the career systems.
- `../piratesgold/docs/save_format.md` documents the original save layout.
- `../piratesgold/evidence/binary/disasm/` contains the focused, annotated
  disassembly routines cited by the mechanics documents.
- `../piratesgold/evidence/data/` contains decoded tables and generated data
  suitable for checking scenario-specific values.
- `../piratesgold/evidence/binary/image32_full.asm` is the full disassembly for
  questions not yet isolated into a focused evidence file.

Treat confirmed formulas and decoded data as the authority for mechanics. Preserve qualifications such as “likely,” “guess,” and “unconfirmed”; do not silently promote them to facts. When the documentation leaves a gap, choose the smallest playable interpretation and record the assumption near the implementation.

## Non-negotiable asset rule

Never commit proprietary game binaries or proprietary artwork. This ban also
covers extracted, converted, re-encoded, cropped, traced, or renamed material
from the original game: executables, disk and CD images, archives, PCX files,
sprites, tiles, fonts, music, and sound. Changing a file's format does not make
it safe to commit.

The repository may contain original project assets, material the user supplies
with suitable rights, and generated data that records mechanics, factual
values, or measurements. The packed per-pixel navigation class masks are generated
data, not copies of the original tiles or artwork. Document the provenance and
generation command for any such derived data.

Before every commit or push, inspect all newly tracked binary, image, audio,
font, archive, and data files. If a file's rights or provenance are uncertain,
leave it untracked and ask the user. Never commit it on the assumption that it
is acceptable.

## Current repository

The project has no build step or third-party dependency:

- `index.html` owns the browser entry point and canvas.
- `src/data.mjs` contains shared immutable data and fallback vector geography.
- `assets/scenarios.json` contains the generated data for all six eras; rebuild it with `tools/build_scenarios.mjs`.
- `assets/world-<era>.bin` contains gzip-compressed per-pixel navigation class masks (water, shallows, land) derived from `MAP1560.PCX`, its era deltas, `MAP.IMB` and the decoded `0x4113C` class table; rebuild them with `tools/build_world_map.py`. `src/world-map.mjs` decodes them.
- `src/mechanics.mjs` contains deterministic, DOM-free game rules.
- `src/overland.mjs` contains the DOM-free landing, walking, reef, treasure-map and dig rules; `src/treasure-sites.mjs` holds the 256 decoded dig sites.
- `src/retirement.mjs` contains the DOM-free retirement score, career summary, post-career line and hall-of-fame rules.
- `src/vignettes.mjs` draws the framed scene pictures above dialog text (`docs/scene-vignettes.md`). Places and events are 224×128 landscapes above the text; people are 96×128 portraits beside it (stacked on narrow screens). The governor, merchant, shipwright, barmaid, bartender, traveller and map-seller portraits and the harbour-arrival, shore-arrival, prize, enemy-destroyed, shipwreck, marooned, divide-plunder and tavern landscapes are simple code-drawn placeholders until real art is approved; check them with `?preview=governor-promotion`, `merchant`, `shipwright`, `barmaid`, `news` (the bartender), `traveller`, `map-seller`, `tavern`, `arrival`, `arrival-land`, `prize`, `enemy-destroyed`, `reef-loss`, `marooned` and `retirement`.
- `src/game.mjs` owns state, input, modes, canvas rendering, and browser saves.
- `style.css` makes the canvas fill the viewport.
- `server.js` serves the directory at `http://localhost:8000`.

The simulation uses the documented 640×480 world coordinate space. Coast geometry, town positions, and scenario values come from decoded data; the palette, textures, labels, and interface are original.

## Run and verify

Start the game with:

```sh
make serve
```

Then open `http://localhost:8000`. Stop any server you started when verification is complete.

For every JavaScript change, run:

```sh
make syntax
```

Run `make test` for the deterministic mechanics suite and `make test-browser`
for the browser interaction smoke tests (transfer windows; landing,
walking, digging and reefs; and retirement, through the local `?preview=` states). `make check` runs the complete
automated set. Use `make serve-test` for manual browser checks on isolated
port 8011. Add rule tests with Node's built-in `node:test`; avoid adding a
package manager or framework solely for basic tests. Verify visible or
input-related changes in a browser at both a desktop size and a narrow
viewport.

## Engineering direction

Keep the game runnable after each change. Prefer a small complete gameplay slice over several disconnected foundations.

As the game grows, preserve these boundaries:

- immutable scenario data;
- mutable game state and calendar;
- deterministic simulation and mechanics;
- input and mode/state transitions;
- canvas rendering and UI;
- persistence.

Keep rules independent from drawing and DOM access. Pass state and dependencies into rule functions rather than reading globals. Route randomness through a seedable random source so encounters, economy updates, and tests can be reproduced. Advance game rules on explicit ticks or elapsed in-game time; do not make outcomes depend on display frame rate.

Use the original integer and fixed-point behavior when the documents establish that behavior and it affects play. Give conversions names that include their units or coordinate space. Keep one canonical state value for each fact, derive display values, and version any new browser save format.

Retain the zero-build browser setup until a concrete feature justifies changing it. If you introduce tooling or dependencies, document the commands here and add only the files needed to reproduce the setup.

## Product priorities

Unless the user sets another priority, build outward from the playable sailing and port slice:

1. Add a documented sea-combat slice and meaningful encounter outcomes.
2. Complete trading, shipwright, plunder division, morale, and mutiny.
3. Add diplomacy, governors, promotions, and monthly world events.
4. Add town, sword, and land combat.
5. Add quests, marriage, career progression, and retirement as vertical slices.

Use simple original placeholders when art or sound would otherwise block gameplay. Accessibility matters: retain keyboard support, prevent browser scrolling during game controls, make menus usable without precise pointer input, and do not communicate essential state by color alone.

For an unfinished gameplay feature, open an in-game dialog that lets the player choose among explicit provisional outcomes. Apply the chosen outcome consistently to state and the captain's log, then return to a valid mode. Do not end an unfinished path with only a construction notice, Back, Disengage, or a no-op action. Remove the fallback choices when the real system becomes playable.

## Working style

Inspect the relevant code and reference document before editing. Make reasonable, reversible assumptions and continue without asking for routine decisions. Ask only when a choice would materially change product scope, require restricted assets, or destroy user work.

Do not rewrite working code merely to impose a preferred architecture. Preserve unrelated changes. Keep comments focused on non-obvious rules, units, coordinate transforms, and departures from the reference mechanics.

A change is complete when the affected flow is playable, syntax checks and relevant tests pass, browser behavior has been checked when applicable, and the documentation reflects any new command or deliberate mechanics deviation.

## Reciprocal review

Before handing off substantial implementation changes, ask the other coding agent for one independent, read-only review: Codex asks Claude Code, and Claude Code asks Codex. Verify each finding against the code before acting on it. One reciprocal pass is enough unless the resulting fixes materially change the implementation.
