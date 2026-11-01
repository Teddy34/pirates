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
- Test land per map pixel with the original colour classes, so coastal tiles
  have their drawn shoreline. Sailing onto a land pixel stops the ship and
  asks "Disembark?" (Y/N); No turns the ship round (landing_and_overland.md §2).
- Walk a landing party overland (`src/overland.mjs`): two cells a day on each
  axis in any terrain, a persistent walk direction set by the arrows (two held
  arrows or Home/PgUp/End/PgDn walk diagonally), food, wind and time running,
  no encounters or alert build-up, and half a day lost per tick spent pushing
  into water. The ship waits where it landed; the party re-boards only by
  walking into the water within 10 px of the landing spot (§3–§4).
- Wreck the last ship bigger than a sloop once per 100 ticks over shallow
  pixels; men who no longer fit drown, and a lone big ship takes the shipwreck
  path (§5).
- Toggle the original's fast mode with `T` (ticks five times faster).
- Paint the sea and land as pixel art at the navigation mask's own
  resolution (16 pixels per tile). Sea depth comes from distance to land, and
  the coast gets surf and a beach. Inland there are grass, forest and shaded
  hills. Chunks are painted lazily from the mask, so the drawn coastline is
  the sailed coastline.
- Display pixel-art town sprites whose buildings show the town's prosperity
  (struggling, surviving, prospering, wealthy) and whose walls show its
  forts. Only the flag shows who holds the town. Labels, the player ship and
  a minimap are drawn too.
- Zoom from 16× to 64× without scaling town labels or the ship. Town sprites
  step from 2 to 3 to 4 screen pixels per art pixel as the map zooms in.
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
  lower. In poor health the retirement check that runs first (`0x1F1D7`)
  retires the captain (CSTR 160); a prisoner in a town who still has some
  health left may return to pirating and serve the captivity.
- Apply the monthly land income and the decoded reputation decay
  (`rep -= rep >> 3`).
- Pause, zoom, steer, and change sail from keyboard or touch controls.
- Open the captain's logbook from the Log control (or `L`) at sea and from
  the town menu: the Ship's Log lists the world news with dates, and City
  information shows the known status of every town.

### Retirement and the career ending

- Retire from privateering when dividing the plunder (CSTR 157, confirmed
  with "Are you sure you want to end the game?"). In poor health the
  division retires the captain once the crew is paid (`0x1F1D7`, CSTR 160).
- Run the retirement driver (`0x45D0`): the decoded score (`0x5039`), the
  career summary pages (`0x4A1A`: ranks, wealth and land, reputation, age,
  bride, relatives, wounds and mood), and the job and town the score buys
  (`0x51C2`, CSTN 43–67) with the pirate points.
- Offer the lure of the sea (CSTR 72) in a town below difficulty 4 while the
  unclamped health figure is under 4; returning runs the division refit
  (`0x1D899` → `0x184A8`).
- Offer the hall of fame for 0 or more points (CSTR 73) when retiring in a
  town (`0x47BA` skips it on the uncharted island), kept in this
  browser as the ten best careers (ASSUMED: `0x529A`'s layout is not
  decoded), then another game (CSTR 80). A finished career deletes its save.
- Courtship is not playable, so the score and summary use married = 0.

### World simulation

- Run the monthly world in the original's order (`0xCEB8` step 5, in
  `monthlyWorldUpdate`): town economy, AI conquest, diplomacy, then the random
  town event. Town records are updated in place.
- Update town growth, population, soldiers, and treasury each month.
- Let a town fall to an enemy nation at war with it (`0xC81B`): a larger
  garrison within Manhattan distance 150 takes it, it gets a new governor,
  and its flag, merchant, encounters and missions follow the new nation.
- Change diplomatic relations and publish wars, peace treaties, alliances and
  the alliance's pirate amnesty as world news.
- Apply the decoded Indian, gold-mine, malaria, new-governor (with a new
  daughter or niece) and pirate events to any town (`0xCA7F`). As in the original,
  the last real town of each era lies outside the random-town range
  (`0x4605A`) and never grows, falls or gets an event.
- Track what you know of each town with the original's information bits:
  a new game knows each town when `rnd(4) + 1 > difficulty`; entering,
  capturing or buying a traveller's report makes it current; a random event
  there makes it obsolete ("Recent events in %s have made your information
  obsolete").
- Sail the treasure fleet and silver train along the era header's 15 stops
  (`0xCDE9`, step 6 of `0xCEB8`): one or two stops a month, skipping stops
  that are no longer Spanish, the town's growth +10 and, for the fleet, its
  gold / 4. The fleet restarts in October and the train in April (a month
  earlier in odd eras); a new game places both from the day of the year
  (`0x13679`). Their movement is never announced.
- Open the opening news with each war or alliance and a reported town event
  for each pair of nations at peace (`0x13679`).
- Track the single nearest-town alert (reset when the nearest town changes), national favour, ranks, reputation, stored crew morale, and time
  at sea.

### Ship encounters

- Roll encounters from distance to town and town alert.
- Select era-specific ships by nearby nation and encounter tier.
- Present the sighting, closer identification, flag, estimated crew, guns, and
  hostile intent in stages.
- Meet the treasure fleet's galleon in the waters of its current town when
  `rnd(24) > alert` (`0xD44F`). Taking her at sea gives the usual prize
  plunder (rich, from her gold byte) and does not stop the fleet.
- Hail eligible ships and receive current world news.
- Sail away and apply the decoded town-alert consequence.
- Fight tactical battles on a fixed-step clock with flagship choice, steering,
  sail changes, broadsides, damage, enemy tactics, surrender, sinking, escape,
  and explicit provisional boarding outcomes. Movement, hit boxes, boarding
  contact and enemy fire follow the traced engine; the one deliberate
  deviation is that your ship stops head to wind (porting-guide quirk 18 is
  not reproduced).
- Lose a sunk flagship, or a reserve ship taken during an escape, with its
  decoded share of gold, food, goods, the era commodity, and cannon; losing
  the last ship ends in a shipwreck restart.
- Carry surviving crew, cannon, flagship damage, captured ships, reputation,
  and nearby-town alert back into the campaign. Captures continue through
  prize-ship choice, named-captain handling, plunder, and volunteers. A kept
  prize keeps her battle damage, and keeping one raises the crew to 8 × her
  slot (quirk 14).

### Ports

- Arrive automatically on a town's decoded trigger cells; the nearest town is
  chosen from the trigger table as in the original.
- March into any town on foot by walking onto its trigger cells; leaving puts
  the party on the town's own cell with the ship still where it landed.
- Keep the three treasure-map records (buried treasure, lost relative, lost
  city) with the decoded 256 dig sites. Tavern map pieces pick a site away from
  the current town; any piece lets the party dig (`S` or Dig on foot) within a
  cell of the site for 5,000–13,000 gold. Maps are drawn from the navigation
  mask, one quarter per piece, and can be studied with `M` or Maps.
- Attempt open harbor entry, including fort fire that can sink any ship with
  its share of the cargo, or the last ship and send you to prison. A refused
  entry returns to the approach menu for another try.
- Sneak into hostile towns and resolve the recognition check. A recognised
  captain fights a guard through a provisional duel dialog; either result
  returns to the approach menu, and losing sets reputation to −1.
- Apply port desertion from low morale as you leave a town (`0x17EFB`):
  the deserters take their share of the party gold, and the fleet check
  that follows still counts as in town, so losing the last ship means prison.
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
- See "The treasure fleet is in the harbor!" / "The silver train is in
  town!" on the approach (only the train's line when both are there, as the
  original overwrites one with the other at `0x19193`). An assault adds 10 soldiers per convoy in town
  (`0x18B9C`); capturing the town adds 20 × the fleet template's byte 5 per
  convoy to the base loot (+51,000 shown in 1560), logs "Captured the
  treasure fleet!" / "Captured the silver train!" and finishes that convoy
  for the year (`0x2297B`).
- Hold named captains as prisoners with the original's prisoner word;
  Spanish and pirate captains offer treasure-fleet or silver-train news
  first ("The Treasure Fleet is in Havana.", "in Spain" / "in Peru" when
  away, `0x1E953`/`0x1EA24`); asking frees the captain. A barmaid informant
  gives both reports, standing in for the governor's-house informant
  (ASSUMED until marriage, K8). Each report is noted in the captain's log
  with the original's unused "Treasure fleet in %s." line (ASSUMED).
  Governors ransom any prisoner, and leaving a town may let one jump
  overboard (`0x17EFB`). The traced pirate hand-over
  (`0x12432`) never matches a stored prisoner, so, as in the original,
  governors do not take pirates.
- Divide the plunder: a 104-day refit with the monthly world, then the fresh
  fleet (`0x1EF87`) with the flagship repaired, the old prisoners kept and
  months at sea at 0.

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
| Encounters | Sighting stages, identification, named hunter captains (title, surname and renown from the original's captain id), the pirate-mission override and the wanted pirate's id, news, escape, tactical combat, provisional boarding outcomes, capture aftermath, and the treasure fleet | The captain id's battle and sword skill, coastal battle terrain, and interactive sword fights |
| Diplomacy | Initial relations, monthly changes, favour, news, and governor briefings | Full privateering consequences, titles, and nation-specific rewards (promotions, land grants, amnesty and commissions are in the governor audience) |
| Towns | Entry, sneaking, governor briefings, tavern staff and visitors, recruitment, three-good trading, ship repairs, ship sales, cannon sales, and departure from the decoded departure cell and heading, and governor missions (letter, papers, pirate hunt, rescue: offer, delivery, completion, failure and reward) | Richer governor actions |
| Economy | Food, goods, and era-specific commodity trade; town growth, treasury, population, soldiers, random town events, AI conquest, the treasure fleet and silver train, and per-unit captured cargo transfer | Fleet upkeep, complete production rules, and the villains' monthly moves |
| Morale | Stored crew morale (recomputed each month and on load, +1 or +2 per captured prize; used for port desertion, battle reload and the month-end check), desertion, the month-end restless and divide-the-plunder warnings, mutiny (crew/3 desert with their gold, reputation −4) with a provisional leader duel, and plunder division with crew satisfaction | A Party Status mood display (which recomputes morale in the original) and interactive mutiny combat |
| Persistence | One versioned browser save slot and v1-v8 save migration (v7 adds the town-information bits, and older voyages keep current information on every town, and releases unnamed pirates held for delivery; v8 adds the treasure fleet and silver train, placed for an older voyage as a new game would on its current day; v9 adds the landing party and three treasure-map records) | Multiple slots, battle-state persistence, and import/export |
| Accessibility | Keyboard and touch controls, visible labels, focus styles, and text HUD | Complete keyboard dialog navigation testing, screen-reader alternatives for the canvas, and configurable controls |

## Missing gameplay systems

The following systems have no complete playable implementation:

- interactive boarding and sword fighting;
- fort bombardment and land battles (town assaults, capture and plunder are
  resolved through a provisional outcome dialog);
- complete prize management and ship reordering (the original has no ship
  purchase);
- complete cannon management;
- the named captains' battle and sword skill;
- lost relatives, villains, rumors, and rescue quests (the dig already rescues
  a relative and hands out lost-city pieces once a relative's map exists);
- courtship, rival suitors, marriage, and family benefits;
- aging and illness effects beyond the captivity message, ransom, and the
  retirement check at the start of captivity;
- the famous-expedition ending (CSTR 159; the port has no famous
  expeditions) and the four retirement pictures;
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
5. Add treasure systems, relatives, romance, aging, and retirement
   as complete vertical slices.

