# Non-battle feature plan

This plan tracks the missing campaign systems outside tactical sea, land and
fort combat, and records the sword-fight slice (row 13). The reverse-engineering documents and cited disassembly
under `../../piratesgold` define the mechanics. Keep uncertain findings marked
as uncertain, and record any small playable assumption beside its code.

## Status legend

- **Partial:** supporting state or a simplified interaction exists.
- **Missing:** no complete playable loop exists.
- **Dependency:** another planned system must land first.

## Planned feature slices

| Order | Feature | Status | Complete slice | Primary sources |
| --- | --- | --- | --- | --- |
| 1 | Full trading and shipwright | Partial | Done: three-good trading with the transfer arrows (#24); repairs, ship sales and cannon sales at the shipwright; damage and fleet state saved. Left: reordering ships and a complete prize management view. The original has no ship purchase (porting guide, shipwright), so none is planned. | `town_economy.md`, `save_format.md` |
| 2 | Morale and mutiny | Partial | Done: month-end warnings, port desertion, and mutiny resolved by a sword fight with the ringleader (row 13) that updates crew, gold, and reputation. Stored crew morale (D22, #17) and the traced month-end mutiny check (K2, #14). Left: the Party Status mood display. | main report sections 4.4–4.5, `sword_fights.md` |
| 3 | Governors and career progression | Partial | Done: missions (#22); the audience order, pirate delivery, ransoms, amnesty and commissions (#23). Left: titles and national rewards. Promotions now name the family quest's villains (row 8). Pirate hand-over traced in #28 (D23): no stored prisoner ever matches, so governors never take a captured pirate, and ransom offers include pirates. Open questions from the #23 review: (a) answered in #28, except that the ransom offer text (CSTR 136) names the captain, which our dialog doesn't; (b) a captain who sneaked in can now see the governor, but the original's sneak check inside the governor visit (`0x13269`) is untraced (`entering_towns.md`, open questions). | main report sections 4.2–4.3, `diplomacy_and_world.md`, `lost_relatives.md` |
| 4 | Treasure fleet and silver train | Done (#29) | Initialize both routes, move them monthly, skip non-Spanish stops, publish reliable news, override eligible encounters, display their presence in port, award capture bonuses, and end that year's route when captured. | `treasure_fleet_silver_train.md`, `encounters.md` |
| 5 | Named pirates and pirate-hunters | Partial | Done: hunters overtake and can't simply be escaped (#3), hunter names from the captain id (#19), the wanted pirate of a governor mission (#22), and named captives held as the original's prisoner words, with the traced hand-over rule (#28). The captain id's sword skill is in (row 13: +1 or +2 for named captains when boarding, `0xF207`). Left: the captain id's battle skill, and allocating identities without repetition. | `encounters.md`, cited encounter and capture disassembly |
| 6 | Landing and overland travel | Done (#30) | Land on valid coast pixels, walk at the documented rate, reboard at the landing point, apply reefs, advance campaign events on foot, and expose a Dig action. | `landing_and_overland.md`, `sailing.md` |
| 7 | Treasure maps and digging | Done (#30, row 8) | Maintain three four-piece maps, award random missing pieces, reveal a readable site, dig within the documented radius, consume three days on a failed dig, and resolve buried treasure and the lost city. | `treasure_fleet_silver_train.md` |
| 8 | Lost relatives and roaming villains | Done | Promotions name villains, villains move monthly, citizens, bartender, traveller and crewmen offer traceable gossip, villains are met in the tavern, at the governor's and in a captured town, sword fights with them grant the relative's map pieces, and digging rescues all four relatives, wiping the villains and handing out lost-city pieces. | `lost_relatives.md`, `treasure_fleet_silver_train.md` |
| 9 | Courtship, marriage, and informants | Missing | Model daughters and nieces, charm checks, rival suitors, proposals, merchant marriage, family discounts, and informant reports. The rival suitor's duel can use the sword fight (row 13). | `marriage.md`, `town_economy.md` |
| 10 | Health, age, land, and retirement | Partial (#33) | Done: wounds, health with Medicine, land income, forced retirement at the division and in captivity, voluntary retirement, the decoded score, career summary, post-career job, lure of the sea, hall of fame and another game. Left: marriage's share of the score (row 9). | `health_age_land.md`, main report retirement sections |
| 11 | Career opening | Done (#35) | Start every career in the town screen of the town nearest the start record's point (`52f5fd3`), play the story for its era and nation, then the sailing master's briefing naming the closest city of each other nation. | `src/opening.mjs`, `0x139E2`, `0x13E3F`, `0x1D858` |
| 13 | Sword fights | Partial (this change) | Done: the one fight engine of `sword_fights.md` (`src/sword-mechanics.mjs`), with the frame tables read from the executable: weapon choice, skill, reach, parries, hit rolls, morale transfer, yielding, the crews' clash, the edges, and the opponent's pattern AI with its counter-moves. Pixel-art fencers, crews and backdrops (`src/fencer-sprites.mjs`, `src/sword-renderer.mjs`). Boarding, storming the walls after an assault, the mutiny ringleader, the guard when sneaking, the villain and the opening's practice bout are real fights, and the town menu offers practice fencing (+5 hit bonus per bout, up to 30). Left: the fort and land battles before the walls (counted as won until K3), the duel-defeat scene's text (`0x159DF`), capture after a lost boarding (`0x16647`), sound, and art the user approves. | `sword_fights.md`, `sea_battles.md` §7, `fencing_*.asm` |
| 12 | Scene pictures | Partial (#34, #35) | Done: code-drawn placeholders in the dialogs for the governor, merchant, shipwright, tavern staff and visitors, the town approach and town menu, prizes, an exploding enemy, shipwreck, marooning, dividing the plunder, the career opening, the dig's results (treasure found, nothing found, a relative's reunion and the four lost cities), a sail sighted, boarding, a prisoner's offer, new recruits, the treasure fleet and silver train captures, mutiny, prison, the sword-fight alley, the hall of fame, the four retirement endings, the land and fort assaults, your own ship sinking, and a battle ended by outrunning or nightfall. Left: the courtship scenes (governor-daughter, governor-niece, wedding, merchant-daughter), which wait for row 9; happy-crew, pirate-delivered, ships-news, shipdeck-duel, treasure-trove and title, plus the optional ship portraits; and real art, which needs the user's rights confirmed first. | `scene-vignettes.md` |

## Added since the last plan update

The plan was last revised with #33. These changes followed it:

- **Retirement (#33):** the retirement driver, score, career summary, job, lure
  of the sea and hall of fame (row 10).
- **Pixel art (#34):** ships in every heading and sail state on the map and in
  battle, and clouds, all in the towns' style. The first scene pictures also
  landed here (row 12), and an exploding enemy now gets a short dialog
  (CSTR 168) so its picture has a place.
- **Starting in port (`52f5fd3`):** a new career opens in the town screen, not
  at sea (row 11).
- **Town pictures (`686fb51`, `0bbe2a5`):** the town menu shows a quay or a town
  square, landlocked towns drop the "port" wording, and the menu heading no
  longer names the nation.
- **Career opening (#35):** the story and the briefing (row 11). Esc no longer
  closes a dialog, which had stranded the opening's action chain.

- **Lost relatives and villains (row 8):** `src/villains.mjs` holds the four
  villain records and their rules; `?preview=villain-tavern` and
  `villain-rumour` show them, and `tools/check_villains.mjs` is their browser
  check. Saves move to version 10.
- **Ten more scene pictures (row 12):** sail-ho, boarding, hostage-talks,
  crew-recruits, treasure-fleet, silver-train, mutiny, prison, hall-of-fame and
  alley-duel, each with a `?preview=` state; `tools/check_vignettes.mjs` is their
  browser check. The treasure fleet and silver train previews are named
  `treasure-fleet-capture` and `silver-train-capture`, because `treasure-fleet`
  already opens the town approach.
- **Nine more scene pictures (row 12):** the four retirement endings, land-attack,
  fort-walls, sinking, outrun and nightfall, with previews of the same names
  (`retire-1` to `retire-4`). Your ship sinking, outrunning and nightfall now
  end the battle with a short dialog (CSTR 167, 197–198, 169) instead of only a
  log line.

- **Sword fights (row 13):** `src/sword-mechanics.mjs` (rules),
  `src/fencer-sprites.mjs` and `src/sword-renderer.mjs` (sprites and scene).
  Previews `sword-duel`, `sword-boarding` and `sword-practice`;
  `tools/check_sword_fights.mjs` is their browser check. The player's
  `fencingPractice` (`0x45E90`) is a new save field, defaulted to 0 on load.

## Known differences from the original

`implementation-status.md` and `discrepancy-report-2026-10-30.md` hold the
evidence for each item. This list collects them in one place.

### Deliberate

- The manual-based copy protection in the opening is left out, with its penalty
  branch and the +16 favour with each nation it grants on a pass.
- Every opening screen has a picture; the original shows none there.
- Coastal towns use the harbour-arrival and port-quay pictures however you
  arrive. Only landlocked towns use shore-arrival and town-square. The original
  picks the arrival picture by how you came.
- The prison picture also shows on the release dialog, and the marooned picture
  on the rescue dialog, so both ends of a captivity share one scene.
- A sinking flagship, an escape out of range and nightfall each get a short
  dialog for their picture; where the original shows these lines is untraced.
  With the last ship sunk, the island or prison dialog follows without
  repeating the sinking line.
- All art is original, and the pictures are placeholders. No original artwork is
  used.
- Your ship stops head to wind (porting-guide quirk 18 is not reproduced).
- The browser also autosaves at sea and after battles, where the original saves
  only in town (D37, allowed by the porting guide).
- A dig that finds both treasure and a relative pays once, not twice.
- Rumours and villain news go to the Ship's Log as dated text, not the
  original's event records. The "heard" bit is kept only on a villain's current
  town, the one place a traced routine acts on it (`0xCD5C`, see
  `src/villains.mjs`).
- With no Spanish town left in the range, a promotion names no villain. The
  original would loop for ever.
- Beating a pirate (a ship under the pirate flag, not a national pirate
  hunter) near a town helps that town instead of hurting it. Taken or sunk
  fewer than `type + 5` cells from the nearest town (4 for a Pinnace), it gives the town +10 growth
  (at most 255), and the governor, if the town has one, +1 mood up to +3. A
  pirate beaten farther out leaves the town alone. The original takes 10
  growth for any capture that close and for any ship blown up at any distance,
  pirates included (`0xDDDB`, `0xE706`, `town_economy.md` §3). National ships
  still follow the original rule. See `seaVictoryTownEffect` in
  `src/mechanics.mjs`. Side effects: the extra growth can push a Spanish town
  over its "We do not trade with pirates!" limit, as repeated trade can; a
  happier Spanish governor draws villains slightly more (`4 * mood` in
  `src/villains.mjs`); and the "Shipping losses" news now appears for a
  capture only when the town had growth to lose, as it already did for a
  sinking.

### Sword fights (row 13)

- The fight timer's rate is untraced, so a tick is assumed to be 1/140 s
  (`FENCING_TICK_SECONDS`): 9-12 ticks a frame give 12-16 frames a second.
  1/200 s played too fast; 1/120 s made the gaps between attacks feel too
  long in play.
- The original starts a fencer's next move as soon as an animation ends
  (`0x276F8`, `0x27A71`), and the opponent's patterns are nearly all attacks,
  so strokes came back to back. The port holds each fencer's follow-through
  pose for `RECOVERY_FRAMES` (3) frames after an attack, unguarded and
  standing still, before the next move; your keys wait until it ends.
- Keys: the original latches a key press until a move that consumes it starts
  (`0x38A0A`), so one tap of "away" keeps you backing off. The port reads held
  keys plus one latched tap per move. Shift is the quick thrust; the
  original's keyboard thrusts by default and slashes with Shift.
- `sword_fights.md` §4 names moves 3-5 and 6-8 "high, middle, low". The
  guard and attack bits show the order is middle, low, high (centre, down, up
  on the joystick); the port follows the bits. The archive should be
  corrected.
- Read as coded, the opponent picks from his attack patterns only when
  closer than 20 px (`0x2811C`); farther out he advances, stands or retreats.
  A simulation shows a captain who keeps attacking on varied lines wins nearly
  every duel and boarding at every difficulty, while one who stands still loses.
  Unverified against the running game.
- `sword_fights.md` §2 says only modes ≥ 0 choose a weapon. The code skips
  the menu only for mode 0xFF (`0x1622F`), which then fights with the rapier
  (`0x16563`): town practice (0xFE) chooses, and the opening's bout (0xFF)
  uses the rapier. The port follows the code; the archive should be corrected.
- A lost boarding fight costs a tenth of the party's gold as ransom, because
  capture (`0x16647`) is not ported. As in the original, its crew losses are
  not deducted (`0x1660E` skips the deduction).
- Quality is held at 1 or more when hull damage would make it zero or less
  (the original would divide by zero when both are zero).
- The duel-defeat scene (`0x159DF`) has no text yet; each caller's dialog
  reports the loss.
- Storming the walls (`0x18EFD`) is played after every assault, but the fort
  battle (by sea, a town with forts) or the land battle (overland, soldiers ×
  15 ≥ crew, a fort and 10+ soldiers) that comes first counts as won without
  losses. A skipped fort battle still applies its documented results: alert
  +16, reputation −2, the garrison at (s + 1)/2 plus a tenth of the fort's
  untouched men, and only the flagship's crew lands (the first ship is taken
  as the flagship). A skipped land battle leaves the garrison as it was and
  adds no march alert. You may still withdraw before storming, for alert +16.
- A defeat at the walls also costs a tenth of the party's gold as ransom
  instead of capture (`0x16647`), as for a lost boarding.

### Provisional until the real system exists

- The villain duel. Its loss follows the documented rule (reputation −1, he
  escapes to the town he was sent to). A villain's 128 extra land-battle
  defenders wait for land battles (K3).
- A barmaid informant stands in for the governor's-house informant until
  marriage exists (K8).
- Married is 0 in the retirement score and summary.

### Not ported yet

- The famous expeditions, which are the only starts that open at sea, and their
  ending (CSTR 159).
- Fort and land combat (K3), which count as won before the walls, and battle shallows, beaching and terrain
  backdrops (K6).
- Courtship (K8).
- Status screens from the Captain's Cabin (D32); practice fencing is in the
  town menu. The
  logbook, city information and map views now cover part of that report item.
- The captain id's battle skill, and Party Status mood.

### Assumptions to confirm

- The three-state sail control; the code confirms only a probable half-speed
  reduced-sail flag.
- The hall of fame's layout: the port keeps the ten best careers in this browser
  because `0x529A` is not decoded.
- The fresh fleet takes at least 8 men, instead of the original's wrapped crew
  or endless abandon loop.
- Reports are logged with the original's unused "Treasure fleet in %s." line.

- A new villain's history holds no town. `lost_relatives.md` §3 says your
  current town, but `0x12298` writes `0x4605A + 1`, the wipe's invalid town, so
  only his current town offers gossip until he moves. The archive should be
  corrected, along with `lost_relatives.md` §5's callers (`0x18F9C` and
  `0xDE2B`) and the alerted town of §4, set on every return to the map
  (`0x2888A`), not only on leaving a town.
- The tavern confrontation ignores the gate `0x3312A`. Only `0x11038` is seen
  writing it, and only to clear it, which would end all tavern confrontations
  after the first villainless visit if nothing else reset it.
- The staying flag (town w10) is not cleared when a villain flees or is wiped,
  as in the code, so that town stays closed to villains. Traced statically;
  unverified in the running game.

### Open in the discrepancy report

- D9: at the map edge the original turns the ship around.
- D11: before 1660 a Frigate should show as a "Fast galleon". The name appears
  nowhere in `src/`.
- D31: the monthly favour clamp skips favour with pirates.
- D38: `applyProvisionalBattleOutcome` is used only by tests, and its "sunk" and
  "lost" rules don't match the docs.

## Delivery rules

Implement each row as a vertical slice with deterministic mechanics tests,
campaign UI, captain's-log entries, and save migration. A feature is not done
when only its state fields exist.

Where a slice reaches unfinished combat, present explicit provisional results
that apply consistent campaign consequences. Do not defer the entire
non-battle loop merely because its final duel or battle scene is unavailable.

Update this plan and `implementation-status.md` when a slice becomes playable.
Verify desktop and narrow viewport behavior for every new interaction.
