# Implementation status

This document records what the current browser port supports and what remains
to be built. The decoded mechanics in `../../piratesgold` remain the authority
for future work.

## Playable now

### New game and scenarios

- Start a new career in 1560, 1600, 1620, 1640, 1660, or 1680.
- Choose a captain name, difficulty, and special ability.
- Load era-specific towns, fleets, diplomacy, ship encounters, and sailing
  speed tables from generated scenario data.
- Select a documented English, French, Dutch, or Spanish starting career and
  carry its flag, fleet, resources, favour, diplomacy, and starting position
  into the campaign.
- Use a seeded random-number generator for repeatable rule calculations.

### Caribbean map

- Sail on the original 640×480 world-tile grid: 307,200 logical tiles.
- Load a separate coastline and navigation mask for every era.
- Block ships from entering land while allowing movement along coastlines.
- Display fixed-size town sprites, nationality marks, labels, the player ship,
  and a minimap.
- Zoom from 16× to 64× without scaling town labels, town markers, or the ship.
- Show every decoded town for the selected era, including eastern Caribbean
  settlements.

### Campaign sailing

- Turn through the original sixteen heading sectors.
- Calculate fleet speed from heading, wind, ship type, difficulty, and the
  Navigation ability.
- Shift the prevailing wind on the campaign clock.
- Raise and lower sails through closed, low, and high states. This three-state
  control is a documented project approximation; the decoded campaign code
  confirms only a probable half-speed reduced-sail flag.
- Advance time at 64 ticks per day, using 30-day months and 360-day years.
- Consume food in 8.8 fixed point and lose crew to starvation.
- Pause, zoom, steer, and change sail from keyboard or touch controls.

### World simulation

- Update town growth, population, soldiers, and treasury each month.
- Change diplomatic relations and publish wars, peace treaties, and alliances
  as world news.
- Apply simplified mine, malaria, raid, governor, and plunder events.
- Track town alert, national favour, ranks, reputation, morale inputs, and time
  at sea.

### Ship encounters

- Roll encounters from distance to town and town alert.
- Select era-specific ships by nearby nation and encounter tier.
- Present the sighting, closer identification, flag, estimated crew, guns, and
  hostile intent in stages.
- Hail eligible ships and receive current world news.
- Sail away and apply the decoded town-alert consequence.
- Resolve the unfinished tactical battle through explicit provisional capture,
  defeat, player-sunk, escape, or enemy-sunk outcomes that update campaign
  state and the captain's log. Captures continue through prize-ship choice,
  named-captain handling, transferable plunder, and possible volunteers.

### Ports

- Approach towns within seven map cells.
- Attempt open harbor entry, including fort fire and possible reserve-ship
  loss.
- Sneak into hostile towns and resolve the recognition check.
- Apply port desertion from low morale.
- Visit the governor, tavern, and merchant through dialog menus.
- Buy basic amnesty or a letter of marque from eligible governors.
- Recruit tavern volunteers within fleet capacity.
- Buy food using seasonal prices, town production, stock, available gold, and
  cargo space.
- Save the voyage in browser storage while in town.
- Resolve a provisional town assault, including the decoded treasury and town
  damage formulas, possible governor installation, and transferable plunder.

### Presentation and engineering

- Run directly in a browser with Node's small static server and no package
  installation or build step.
- Scale the interface for desktop and narrow screens, including two-row mobile
  controls and a compact minimap.
- Keep deterministic mechanics separate from canvas and DOM code.
- Verify the current mechanics and map data with 15 automated tests.

## Partially implemented

| System | Present | Still needed |
| --- | --- | --- |
| Sailing | Heading, wind, fleet speed, sails, collision, calendar, and food | Clouds, cloud effects, storms, exact reduced-sail behavior, and more faithful movement feedback |
| Encounters | Sighting stages, template selection, identification, news, escape, and capture aftermath | Quest overrides, treasure fleet encounters, named-captain identities, and tactical outcomes |
| Diplomacy | Initial relations, monthly changes, favour, and news | Full privateering consequences, promotions, titles, missions, pardons, and nation-specific rewards |
| Towns | Entry, sneaking, governor, recruitment, food market, and departure | Shipwright, full commodity market, goods sales, cannon transactions, rumors, missions, and richer governor actions |
| Economy | Food prices and stock, town growth, treasury, population, soldiers, and captured cargo transfer | Separate third-good trading, fleet upkeep, complete production rules, and treasure movements |
| Morale | Morale calculation, desertion, low-morale warning, and plunder division with crew satisfaction | Persistent crew mood, mutiny checks, and mutiny combat |
| Persistence | One versioned browser save slot | Save migration, multiple slots, battle-state persistence, and import/export |
| Accessibility | Keyboard and touch controls, visible labels, focus styles, and text HUD | Complete keyboard dialog navigation testing, screen-reader alternatives for the canvas, and configurable controls |

## Missing gameplay systems

The following systems have no complete playable implementation:

- tactical ship-to-ship combat, including flagship choice, battle sailing,
  broadsides, damage, enemy tactics, surrender, sinking, escape, and capture;
- boarding and sword fighting;
- fort bombardment, land battles, town assaults, capture, and plunder;
- ship damage persistence, repairs, ship sales, purchases, and prize management;
- full cargo trading and cannon management;
- treasure fleets, silver trains, treasure maps, and named pirates;
- lost relatives, villains, rumors, and rescue quests;
- courtship, rival suitors, marriage, and family benefits;
- wounds, aging, illness, medicine effects, prison, ransom, and escape;
- retirement, land grants, final score, and career ending;
- music, sound effects, and a complete original art set.

The tactical naval-combat design is ready in
[`tactical-sea-combat-plan.md`](tactical-sea-combat-plan.md).
The ordered campaign roadmap outside tactical battles is in
[`non-battle-feature-plan.md`](non-battle-feature-plan.md).

## Required fallback for unfinished features

An unfinished action must remain playable. When the player reaches a feature
that lacks its final simulation or interactive scene, open an in-game dialog
that offers explicit temporary outcomes. Apply the selected result to campaign
state, record it in the captain's log, and return to a valid game mode.

For example, unfinished sea combat could offer:

- **Win and capture the enemy**;
- **Sink the enemy**;
- **Withdraw from battle**;
- **Lose the engagement**.

Label these choices as provisional. Never leave the player at a construction
message with only **Back**, **Disengage**, or a no-op action. Replace each
fallback dialog when the real system becomes playable.

## Suggested implementation order

1. Build the tactical naval-combat slice in the existing combat plan.
2. Add summarized boarding, capture, ship damage, and naval aftermath.
3. Complete the merchant and shipwright loops, then add mutiny.
4. Add sword fighting, fort battles, land battles, and town capture.
5. Add missions, treasure systems, relatives, romance, aging, and retirement
   as complete vertical slices.

