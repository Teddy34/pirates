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
  Land is tested per map pixel with the original colour classes, so coastal
  tiles have their drawn shoreline and shallow water is recorded.
- Paint the sea and land as pixel art at the navigation mask's own
  resolution (16 pixels per tile). Sea depth comes from distance to land, and
  the coast gets surf and a beach. Inland there are grass, forest and shaded
  hills. Chunks are painted lazily from the mask, so the drawn coastline is
  the sailed coastline.
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
- Run the original voyage clock: each voyage starts its tick at 63, with half-day checks at `(tick + 4) & 31` and meals at `(tick + 2) & 63`. Every exit from the sailing view (town arrival, sighting, food warning, too few crew) adds `tick / 64 + 1` days, so any voyage costs at least 2 days (quirk 3, kept). The calendar uses 30-day months and 360-day years and runs each month boundary crossed.
- Consume food in 8.8 fixed point. When food runs out, a third of the crew deserts with a share of the gold and the rest forage 5 tons (traced from event 2 at `0x28537` and `0x1F044`; the reference archive marks this formula untraced).
- Run the decoded fleet check at the start of every voyage, after dividing the
  plunder, after a town assault, and when crew drops below eight men per ship:
  choose ships to abandon with their cargo kept, and lose the last ship to a
  shipwreck or prison restart with the decoded fresh fleet.
- Serve the decoded captivity after losing the last ship, in prison or on the
  uncharted island (`0x1F803`): 27-day steps while the step count is at most
  reputation/2 + 6, with the monthly world running; then the fresh fleet,
  freed pirate captives, a health-based message, and one difficulty level
  lower. In poor health the retirement check that runs first offers a
  provisional choice to retire or carry on.
- Apply the monthly land income and the decoded reputation decay
  (`rep -= rep >> 3`).
- Pause, zoom, steer, and change sail from keyboard or touch controls.

### World simulation

- Update town growth, population, soldiers, and treasury each month.
- Change diplomatic relations and publish wars, peace treaties, and alliances
  as world news.
- Apply simplified mine, malaria, raid, governor, and plunder events.
- Track the single nearest-town alert (reset when the nearest town changes), national favour, ranks, reputation, morale inputs, and time
  at sea.

### Ship encounters

- Roll encounters from distance to town and town alert.
- Select era-specific ships by nearby nation and encounter tier.
- Present the sighting, closer identification, flag, estimated crew, guns, and
  hostile intent in stages.
- Hail eligible ships and receive current world news.
- Sail away and apply the decoded town-alert consequence.
- Fight tactical battles on a fixed-step clock with flagship choice, steering,
  sail changes, broadsides, damage, enemy tactics, surrender, sinking, escape,
  and explicit provisional boarding outcomes.
- Lose a sunk flagship, or a reserve ship taken during an escape, with its
  decoded share of gold, food, goods, the era commodity, and cannon; losing
  the last ship ends in a shipwreck restart.
- Carry surviving crew, cannon, flagship damage, captured ships, reputation,
  and nearby-town alert back into the campaign. Captures continue through
  prize-ship choice, named-captain handling, plunder, and volunteers.

### Ports

- Arrive automatically on a town's decoded trigger cells; the nearest town is
  chosen from the trigger table as in the original.
- Send a provisional landing party to inland towns (overland travel is not
  playable yet).
- Attempt open harbor entry, including fort fire that can sink any ship with
  its share of the cargo, or the last ship and send you to prison. A refused
  entry returns to the approach menu for another try.
- Sneak into hostile towns and resolve the recognition check. A recognised
  captain fights a guard through a provisional duel dialog; either result
  returns to the approach menu, and losing sets reputation to −1.
- Apply port desertion from low morale.
- Visit the governor, tavern, and merchant through dialog menus.
- Receive current war and alliance briefings from governors.
- Ask tavern staff for news, cultivate barmaid informants, recruit sailors,
  buy traveller reports, and meet conditional treasure-map sellers.
- Repair damaged ships, sell surplus ships, and sell cannon at the shipwright.
- Trade food, goods, and the era-specific commodity one ton at a time or with
  maximum-quantity shortcuts; use the same fine controls while looting prizes.
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
- Verify the current mechanics, battle rules, renderer sizes, and map data with
  54 automated tests.

## Partially implemented

| System | Present | Still needed |
| --- | --- | --- |
| Sailing | Heading, wind, fleet speed, sails, collision, calendar, food, and seasonal clouds | Storms, exact reduced-sail behavior, and more faithful movement feedback |
| Encounters | Sighting stages, identification, news, escape, tactical combat, provisional boarding outcomes, and capture aftermath | Quest overrides, treasure fleet encounters, named-captain identities, coastal battle terrain, and interactive sword fights |
| Diplomacy | Initial relations, monthly changes, favour, news, and governor briefings | Full privateering consequences, promotions, titles, missions, pardons, and nation-specific rewards |
| Towns | Entry, sneaking, governor briefings, tavern staff and visitors, recruitment, three-good trading, ship repairs, ship sales, cannon sales, and departure from the decoded departure cell and heading | Missions and richer governor actions |
| Economy | Food, goods, and era-specific commodity trade; town growth, treasury, population, soldiers, and per-unit captured cargo transfer | Fleet upkeep, complete production rules, and treasure movements |
| Morale | Morale calculation, desertion, the month-end restless and divide-the-plunder warnings, mutiny (crew/3 desert with their gold, reputation −4) with a provisional leader duel, and plunder division with crew satisfaction | Persistent crew mood (D22) and interactive mutiny combat |
| Persistence | One versioned browser save slot and v1-v4 save migration | Multiple slots, battle-state persistence, and import/export |
| Accessibility | Keyboard and touch controls, visible labels, focus styles, and text HUD | Complete keyboard dialog navigation testing, screen-reader alternatives for the canvas, and configurable controls |

## Missing gameplay systems

The following systems have no complete playable implementation:

- interactive boarding and sword fighting;
- fort bombardment, land battles, town assaults, capture, and plunder;
- ship purchases and complete prize management;
- complete cannon management;
- treasure fleets, silver trains, overland treasure-map searching, and named pirates;
- lost relatives, villains, rumors, and rescue quests;
- courtship, rival suitors, marriage, and family benefits;
- aging and illness effects beyond the captivity message, ransom, and the
  retirement check at the start of captivity;
- retirement, land grants, final score, and career ending;
- music, sound effects, and a complete original art set.

The tactical naval-combat implementation record and remaining fidelity work are in
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
2. Replace provisional boarding outcomes with interactive sword fighting.
3. Complete the merchant and shipwright loops.
4. Add sword fighting, fort battles, land battles, and town capture.
5. Add missions, treasure systems, relatives, romance, aging, and retirement
   as complete vertical slices.

