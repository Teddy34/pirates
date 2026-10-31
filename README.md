# Pirates' Legacy!

`Pirates' Legacy!` is an original browser game that reconstructs the documented systems of *Pirates! Gold*. It currently provides sailing and port-trading across all six historical eras.

## Run

```sh
node server.js
```

Open <http://localhost:8000>. Node.js 18 or later is sufficient; there are no package dependencies or build steps.

## Controls

- Turn with the left and right arrow keys, `A` and `D`, or the on-screen controls.
- Raise and lower sail with the up and down arrow keys or the on-screen sail controls. The three states are closed, low, and high.
- Zoom from `16×` to `64×` with the `+` and `-` keys, the mouse wheel, or the on-screen controls.
- Sail onto a town's harbor cells to arrive there automatically.
- Sail onto any other coast to land a party (answer the **Disembark?** prompt with `Y` or `N`). On foot the arrow keys, `W`, `A`, `D` (`S` searches) or the on-screen West/South/North/East buttons set the walking direction, which persists; two held arrows walk diagonally. Walk onto a town to march in, and walk back into the water at the rowboat to re-board.
- On foot, press `S` or choose **Dig** to search for treasure. Press `M` or choose **Maps** to study your treasure maps. `T` toggles fast travel.
- Press Space or choose **Pause** to pause the voyage.
- Save from any town. The save remains in the current browser's local storage.

Fleet speed follows sail height, wind, heading, slowest ship, difficulty, and Navigation ability. Seasonal clouds drift downwind; depending on difficulty and distance, their squalls can fill the sails or push the fleet off course.

Clouds multiply the wind-derived target before the documented 4–12 speed clamp. A fast Sloop or Pinnace may already be at that cap, so its fair-weather cloud boost is not always visible; square-rigged ships and higher difficulties show the largest speed changes.

The campaign's closed/low/high sail control is a deliberate playable
approximation. The decoded game exposes a probable reduced-sail flag but not a
confirmed three-state campaign rule. Low sail applies the decoded half-speed
effect; closed sail lets the fleet stop.

## Implemented

- selectable 1560, 1600, 1620, 1640, 1660, and 1680 scenarios
- English, French, Dutch, and Spanish captain flags with decoded nation-specific starting careers (Dutch is unavailable in 1560 because that source record is empty)
- exact 640×480 world-tile grid (307,200 logical tiles) and per-pixel water, shallows and land classes decoded for every era (as the original tests the map pixel, not the tile); the 2× render texture does not change world coordinates
- era-specific towns, starting fleets, diplomacy, sailing speeds, and encounters
- seeded random number generator
- sixteen-point heading and wind model
- ship-specific sailing speed tables
- seasonal, wind-driven clouds with documented speed and heading effects
- 64-tick days, 30-day months, and monthly town growth
- fixed-point food consumption and starvation
- three-stage ship encounters, event-based Ship's News, and a documented
  post-capture sequence for prizes, cargo, captives, and volunteers
- fixed-step tactical sea battles with flagship choice, steering, sail changes,
  broadsides, damage, enemy tactics, surrender, sinking, escape, and provisional
  boarding outcomes
- open and clandestine town entry
- governor amnesty, tavern recruiting, and food trading
- division of plunder, including crew satisfaction, captain wealth, reputation,
  optional difficulty advancement, and a reset to a new expedition
- provisional town assaults with treasury plunder, cargo transfer, and the
  documented governor-installation check
- responsive keyboard, pointer, and touch controls
- versioned browser saves with migration from ship-name fleets to persistent
  ship-damage records

The map presentation and interface are original. Coast geometry, mechanics, and scenario values come from the installed game and the reverse-engineering notes in `../piratesgold`; no original tile artwork is included.

The implementation record and remaining naval-battle work are in
[`docs/tactical-sea-combat-plan.md`](docs/tactical-sea-combat-plan.md).
The complete feature inventory and backlog are in
[`docs/implementation-status.md`](docs/implementation-status.md).
The ordered roadmap for campaign features outside tactical battles is in
[`docs/non-battle-feature-plan.md`](docs/non-battle-feature-plan.md).

To rebuild the packed coastline from an installed copy of the game:

```sh
python3 -I tools/build_world_map.py "/path/to/PIRATESG/PCX/MAP1560.PCX" assets/world-1560.bin \
  --tables ../piratesgold/evidence/data/world_tables.json
# Later eras apply their delta to MAP1560, for example:
python3 -I tools/build_world_map.py "/path/to/PIRATESG/PCX/MAP1560.PCX" assets/world-1600.bin \
  --rsd "/path/to/PIRATESG/PCX/MAP1600.RSD" --tables ../piratesgold/evidence/data/world_tables.json
node tools/build_scenarios.mjs ../piratesgold/evidence/data assets/scenarios.json
```

## Test

```sh
make test
make test-browser
# Or run both plus the patch whitespace check:
make check
```

Use `make serve-test` for manual browser checks on the isolated
`http://127.0.0.1:8011` test server. Run `make help` to list all wrappers.
