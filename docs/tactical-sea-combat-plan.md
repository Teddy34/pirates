# Tactical sea combat plan

This plan turns the existing encounter placeholder into a deterministic,
playable ship-to-ship battle based on the decoded *Pirates! Gold* rules in
`../../piratesgold/docs/sea_battles.md`. It deliberately separates confirmed
mechanics from presentation choices and unresolved reverse-engineering work.

## Implementation progress

The browser port now includes the first playable release: fixed-step movement,
flagship choice, battle and full sails, wind shifts, broadsides, delayed shot
landing, damage, enemy tactics, surrender, sinking, escape, provisional boarding
outcomes, capture aftermath, and persistent flagship damage. Version 4 saves
migrate older ship-name fleets to damage-bearing ship records.

The next naval-combat pass should add coastal terrain and shallows, refine the
assumed frame timing against direct evidence, persist battles in progress, and
replace provisional boarding outcomes with interactive sword fighting. The
player rudder now follows the traced battle loop: 16 angle units every eight
frames (`battle_engine.asm` at `0x7E97`–`0x7EB8`).

## Outcome

The first complete release should let the player:

1. choose a flagship when commanding several ships;
2. steer, raise or lower sail, and fire the loaded broadside;
3. damage, disarm, deman, sink, capture, or escape from the enemy;
4. face an enemy that closes, duels, flees, or strikes according to the
   original comparison table;
5. carry surviving crew, cannon, ship damage, captured ships, reputation, and
   nearby-town alert back into the campaign.

Boarding currently opens an explicit provisional outcome menu. The interactive
sword-fight system remains a separate vertical slice because it has its own
controls, animation timing, morale model, and test surface. Fort battles should
reuse the finished naval engine in a later milestone.

## Evidence boundary

### Confirmed mechanics to reproduce

- Angles use a byte: 256 units make a full turn.
- Battles run on fixed frames, independent of display refresh rate.
- Player and enemy crew/gun limits, reload time, speed, sail transition time,
  wind effects, shot travel, hit tests, damage, AI decisions, and end events
  use the formulas documented in `sea_battles.md`.
- Broadsides choose the side facing the enemy. Range is automatic; the player
  aims by putting the target on the beam and firing at the right time.
- Battle sails halve incoming hull damage. Full sails give 1.5 times speed.
- Player rudder input changes heading by 16 angle units every eight battle
  frames (`battle_engine.asm` at `0x7E97`–`0x7EB8`).
- The enemy reconsiders its tactic every 64 battle frames.
- A battle ends on sinking, boarding contact, surrender, separation, sunset,
  or the player hitting land.
- Campaign aftermath preserves crew, guns, and damage and raises nearby town
  alert when cannon fire is heard.
- Battle wind shifts every 512 frames: direction by `-16`, `0`, `+16`, or
  `+32`, and strength by `-1`, `0`, `0`, or `+1`, clamped to `0..2`.

### Open points that must stay explicit

- The navigation map now records the original per-pixel classes (water,
  shallows, land) from the decoded `0x4113C` table, but battles do not use it
  yet: shallows damage, beaching, and terrain backdrops remain unimplemented.
- The encounter-provided extra gunnery skill and wind-strength source are not
  traced. Use `extra = 0` and `windStrength = rng.int(3)` for the first slice,
  matching the confirmed fort setup while marking both rules `ASSUMED`.
- The real-time duration of one original battle frame is not established.
  Choose one named provisional duration, keep all mechanics in frame units,
  and mark the wall-clock conversion `ASSUMED` so it can be tuned later.
- Exact initial ship placement, arena camera scale, collision boxes, and sprite
  dimensions are presentation-compatible approximations until verified.
- Enemy-ship prize cargo and the full captured-ship aftermath are incompletely
  decoded. The first slice may award the ship and template gold while leaving
  unknown cargo at zero.

No unresolved value should be hidden as an unexplained literal. Put provisional
values in one configuration object and mark them `ASSUMED` with the evidence
gap they cover.

## Architecture

Keep battle simulation outside the DOM and canvas code.

```text
encounter dialog
    -> createBattle(campaign state, enemy, selected flagship)
    -> stepBattle(battle, input, rng) at a fixed rate
        -> movement / terrain
        -> reload and projectiles
        -> damage and collision
        -> enemy decision and steering
        -> terminal event
    -> renderBattle(canvas, immutable battle snapshot)
    -> resolveBattle(campaign state, battle result)
```

Add these modules:

- `src/battle-mechanics.mjs`: pure formulas and one-frame state transition.
- `src/battle-renderer.mjs`: battle camera and original vector ship, shot,
  wake, smoke, wind, and status rendering.
- `test/battle-mechanics.test.mjs`: deterministic formula, transition, AI, and
  outcome tests.

Keep orchestration in `src/game.mjs`: mode changes, dialog flow, keyboard and
touch input, requestAnimationFrame accumulation, audio hooks, and campaign
aftermath. Do not duplicate campaign sailing rules inside the renderer.

### Fixed-step timing

Use a battle accumulator and a named frame duration. One call to `stepBattle`
is one original-style battle frame. Cap catch-up work per display frame so a
backgrounded tab cannot simulate minutes instantly. Rendering may interpolate
positions, but rules read only completed fixed-frame state.

The simulation receives a compact input snapshot:

```js
{
  turn: -1 | 0 | 1,
  firePressed: boolean,
  raiseSailsPressed: boolean,
  lowerSailsPressed: boolean
}
```

Treat fire and sail changes as edge-triggered commands; turning is held input.
Latch each edge command until exactly one simulation step consumes it, even if
a display frame performs zero or several simulation steps.

### Battle state

Use serializable plain data so a seeded replay can be inspected in tests:

```js
{
  frame, noHitFrames, wind: { direction, strength }, terrain,
  player: {
    x, y, heading, type, damage, men, reserveMen, guns, reserveGuns,
    reload, reloadTime, sails: 'battle' | 'full', sailTransition,
    groundedCooldown
  },
  enemy: {
    x, y, heading, type, kind, flag, damage, men, guns,
    reload, reloadTime, sails: 'battle' | 'full', tactic, aiCooldown
  },
  projectiles: [], effects: [], event: null, assumptions: []
}
```

Projectiles store their launch point, landing point, remaining frames, shooter,
and shot strength. Determine hit or miss at landing time so the target can sail
away from the point at which the guns were aimed.

### Campaign ship representation

The current `player.ships` array contains names only. Before battle aftermath,
migrate it to records such as `{ type: 'Barque', damage: 0 }`. Bump the browser
save version and provide a v1-to-v2 loader that wraps old string entries without
discarding saves. Update the versioned storage key without hiding the old v1
key, and update every ship consumer together: fleet capacity, cargo capacity,
slowest-ship speed selection, flagship choice, ship-loss messages, and town
shipyard code. Keep the flagship at index 0 after selection, matching the
decoded game.

## Mechanics work packages

### 1. Pure setup and formulas

Implement and test:

- flagship selection and the eight-hands-per-reserve-ship rule;
- maximum embarked men and guns by ship type;
- player and enemy reload times;
- enemy template men as `4 * templateCrewByte`, retaining the source's
  qualification that the template byte's scale is likely rather than proven;
- gunnery skill calculation;
- relative-wind sector and battle speed, including damage, wind strength,
  full sails, downwind drift, and the `-12..40` clamp;
- original distance approximation and shot travel time;
- target box enlargement for player shots only; enemy shots always test the
  player's exact box;
- hull, crew, and gun damage with injected RNG;
- the skill-0 1.5× bonus to player hull damage and the one-man player floor;
- damage-level labels.

This package should have no battle loop or canvas dependency.

### 2. Playable movement arena

Add a `battle` game mode and a local arena measured in battle pixels. Enter it
from **Close for battle**, initialize both ships and wind, and render a camera
that keeps both ships legible. Add:

- left/right steering;
- heading-relative speed and drift;
- full-sail/battle-sail toggle with the 160-frame transition;
- a wind arrow and sail-state indicator;
- the 512-frame battle wind shift;
- land/shallows sampling through an arena terrain adapter;
- pause and keyboard/touch controls.

Every battle starts under battle sails as in the decoded game, regardless of
the campaign's closed/low/high setting. Keep the campaign sail value untouched
and restore its presentation when returning to the world map.

The campaign clock, food use, encounters, and town simulation must stop while
the battle mode is active.

### 3. Gunnery and status

Add one-button broadside fire. The engine selects port or starboard by the
enemy bearing, calculates the landing point and delay, and starts the reload.
Render a short muzzle flash, smoke, shot trace, splash, and hit effect without
making visual particles authoritative.

The battle HUD should show, for both sides:

- crew and guns;
- reload progress or **Loaded**;
- Sail damage / Lost a mast / Hull leaking / Ship sinking;
- battle sails, full sails, or transition state;
- current enemy tactic only when observable as plain language, such as
  “closing rapidly” or “trying to escape,” not as a debug label.

### 4. Enemy captain

Every 64 frames, compute the documented D/G/M scores and table lookup. Implement
the three tactics:

- **close**: full sails, steer toward the player while respecting the
  downwind-course limit;
- **duel**: battle sails, turn to keep the player on the beam, fire within six
  angle units of the beam;
- **flee**: full sails, steer away while respecting the same wind limit.

Check the surrender condition before the behavior table. Use the documented
enemy turn rate, `3 - floor((type + 2) / 4)`, every eight frames. Put all AI
choice logic in pure functions and test the 27 table entries exhaustively.

### 5. End events and campaign aftermath

Resolve each terminal event exactly once:

- player sinks: remove the flagship, add one wound, and handle a fleet with no
  remaining ship;
- enemy sinks: no prize; apply the documented nearby-town growth penalty only
  after verifying its target;
- ships touch: run boarding resolution;
- enemy strikes: capture without boarding;
- separation beyond 240 pixels on either axis: escape, including loss of the slowest reserve
  ship when all documented conditions hold;
- 4,500 no-hit frames: sunset;
- land contact: beaching defeat.

Always merge embarked survivors with reserves, preserve surviving cannon, store
flagship damage in 16-point bands, add the campaign log entry, and raise alert
by `24 - 2d` within 12 cells of the nearest town.

Implement capture atomically: calculate capacity, transfer the prize, crew,
cannon, gold, and any known cargo, then show one summary before returning to
sailing. Never partially mutate campaign state while a result dialog is open.

### 6. Boarding fallback

Until interactive sword fighting exists, boarding opens a provisional outcome
menu. The player chooses victory and capture, a driven-back withdrawal, or
defeat and ransom. Each choice updates campaign state and the captain's log,
then returns to a valid mode.

The driven-back and defeated choices apply the documented `+16` nearby alert
and `-2` reputation consequences. Defeat also removes one quarter of the
embarked crew and ten percent of party gold as an explicit interim assumption.
Replace this menu when the sword-fight slice can model morale, casualties,
yielding, prison, and ransom.

### 7. Fort reuse

Only after ship combat is stable, add fort attacks as a specialized stationary
enemy:

- type 8, 12 guns per fort, and approximately twice the town's soldiers;
- 144-frame reload, beam-on aim, and small shot scatter;
- half player movement;
- no movement, surrender, or sinking;
- separate fort-damage display and transition to the later land-assault system.

## Controls and presentation

Default controls:

- Left/Right or A/D: steer.
- Space: fire the loaded broadside.
- Up/Down: raise to full sails or lower to battle sails, matching the campaign
  sail controls.
- Escape or P: pause; do not offer a consequence-free flee command.

Mirror these as large touch buttons. Disable browser scrolling for active battle
keys. Provide visible focus styles and text labels; cannon readiness, damage,
and sail state must not rely on color alone.

The visual style should remain original. Use simple vector silhouettes whose
collision boxes are visible enough to learn, keep ship markers a stable screen
size across camera changes, and let wakes show actual motion and drift. Do not
use extracted original sprites or sounds.

## Deterministic test matrix

At minimum, automate these cases:

1. all ship types cap embarked crew and cannon correctly;
2. reload times cover morale extremes and enemy kinds;
3. speed covers full/battle sails, all wind strengths, damage bands, negative
   into-wind results, and fort halving;
4. shot distance and travel time cover axial, diagonal, and minimum ranges;
5. the same seeded hit produces exact hull, crew, and gun outcomes, including
   the skill-0 bonus and one-man floor;
6. battle sails halve hull damage with the intended integer rounding;
7. every D/G/M combination selects the documented tactic;
8. surrender occurs only when all three comparisons are zero and ships are
   close enough;
9. enemy firing requires loaded guns and beam alignment;
10. land, collision, per-axis separation, sunset, and both sinking events
    trigger at their boundaries;
11. shallows add 16 damage only when `rng.int(16) >= type` and cannot trigger
    more often than once per 20 frames;
12. escape can take the slowest reserve ship only under the documented
    conditions;
13. capture, sinking, boarding win/driven-back/defeated, and escape each conserve crew and
    cannon and update campaign state once;
14. the battle wind shifts on the 512-frame boundary and remains in range;
15. a recorded input stream and seed replay to the same final state at 30, 60,
    and 144 Hz rendering;
16. v1 browser saves migrate ship names to undamaged ship records.

Use tiny scripted battle fixtures for integration tests: helpless target,
aggressive boarder, beam-on gun duel, fleeing pinnace, and damaged flagship.

## Delivery sequence

Each milestone ends in a runnable build:

1. **Simulation foundation** — setup formulas, state, fixed-step loop, replay
   harness, and unit tests.
2. **Playable duel** — steering, sails, camera, HUD, firing, hits, damage, and
   sinking against a stationary target.
3. **Enemy captain** — close/duel/flee/strike AI, collision, escape, sunset,
   and terrain.
4. **Campaign integration** — flagship choice, save migration, capture and all
   aftermath paths, and provisional boarding outcomes.
5. **Polish and verification** — touch controls, accessibility, effects,
   balance observation, and comparison against the installed binary.
6. **Follow-ons** — interactive sword fighting, then fort attack and land
   assault.

## Definition of done for the first release

- Every ordinary ship encounter can enter and finish tactical combat without a
  dead end. Unfinished boarding presents explicit provisional outcomes.
- The documented ship setup, movement, gunnery, AI, and outcome rules above are
  covered by deterministic tests.
- Campaign resources and fleet damage remain consistent after every result.
- Old browser saves migrate without losing the voyage.
- Keyboard and touch can complete a battle; the HUD exposes all essential
  state in text.
- The same seed and recorded commands reproduce the same outcome independent of
  display frame rate.
- Any remaining approximations are named in code and in this document.

