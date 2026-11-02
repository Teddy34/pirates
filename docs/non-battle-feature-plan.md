# Non-battle feature plan

This plan tracks the missing campaign systems outside tactical sea, sword,
land, and fort combat. The reverse-engineering documents and cited disassembly
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
| 2 | Morale and mutiny | Partial | Done: month-end warnings, port desertion, and mutiny resolved through an explicit provisional duel that updates crew, gold, and reputation. Stored crew morale (D22, #17) and the traced month-end mutiny check (K2, #14). Left: the Party Status mood display and replacing the provisional duel with sword combat. | main report sections 4.4–4.5, `sword_fights.md` |
| 3 | Governors and career progression | Partial | Done: missions (#22); the audience order, pirate delivery, ransoms, amnesty and commissions (#23). Left: titles and national rewards. Promotions now name the family quest's villains (row 8). Pirate hand-over traced in #28 (D23): no stored prisoner ever matches, so governors never take a captured pirate, and ransom offers include pirates. Open questions from the #23 review: (a) answered in #28, except that the ransom offer text (CSTR 136) names the captain, which our dialog doesn't; (b) a captain who sneaked in can now see the governor, but the original's sneak check inside the governor visit (`0x13269`) is untraced (`entering_towns.md`, open questions). | main report sections 4.2–4.3, `diplomacy_and_world.md`, `lost_relatives.md` |
| 4 | Treasure fleet and silver train | Done (#29) | Initialize both routes, move them monthly, skip non-Spanish stops, publish reliable news, override eligible encounters, display their presence in port, award capture bonuses, and end that year's route when captured. | `treasure_fleet_silver_train.md`, `encounters.md` |
| 5 | Named pirates and pirate-hunters | Partial | Done: hunters overtake and can't simply be escaped (#3), hunter names from the captain id (#19), the wanted pirate of a governor mission (#22), and named captives held as the original's prisoner words, with the traced hand-over rule (#28). Left: the captain id's battle and sword skill, and allocating identities without repetition. | `encounters.md`, cited encounter and capture disassembly |
| 6 | Landing and overland travel | Done (#30) | Land on valid coast pixels, walk at the documented rate, reboard at the landing point, apply reefs, advance campaign events on foot, and expose a Dig action. | `landing_and_overland.md`, `sailing.md` |
| 7 | Treasure maps and digging | Done (#30, row 8) | Maintain three four-piece maps, award random missing pieces, reveal a readable site, dig within the documented radius, consume three days on a failed dig, and resolve buried treasure and the lost city. | `treasure_fleet_silver_train.md` |
| 8 | Lost relatives and roaming villains | Done | Promotions name villains, villains move monthly, citizens, bartender, traveller and crewmen offer traceable gossip, villains are met in the tavern, at the governor's and in a captured town, provisional duels grant the relative's map pieces, and digging rescues all four relatives, wiping the villains and handing out lost-city pieces. | `lost_relatives.md`, `treasure_fleet_silver_train.md` |
| 9 | Courtship, marriage, and informants | Missing | Model daughters and nieces, charm checks, rival suitors, proposals, merchant marriage, family discounts, and informant reports. Use provisional duel outcomes until sword combat exists. | `marriage.md`, `town_economy.md` |
| 10 | Health, age, land, and retirement | Partial (#33) | Done: wounds, health with Medicine, land income, forced retirement at the division and in captivity, voluntary retirement, the decoded score, career summary, post-career job, lure of the sea, hall of fame and another game. Left: marriage's share of the score (row 9) and the four retirement pictures (row 12). | `health_age_land.md`, main report retirement sections |
| 11 | Career opening | Done (#35) | Start every career in the town screen of the town nearest the start record's point (`52f5fd3`), play the story for its era and nation, then the sailing master's briefing naming the closest city of each other nation. | `src/opening.mjs`, `0x139E2`, `0x13E3F`, `0x1D858` |
| 12 | Scene pictures | Partial (#34, #35) | Done: code-drawn placeholders in the dialogs for the governor, merchant, shipwright, tavern staff and visitors, the town approach and town menu, prizes, an exploding enemy, shipwreck, marooning, dividing the plunder, the career opening, and the dig's results: treasure found, nothing found, a relative's reunion and the four lost cities. Left: the catalogue's other scenes (among them mutiny, prison, boarding, the treasure fleet and silver train, weddings, the hall of fame and the four retirement pictures) and real art, which needs the user's rights confirmed first. | `scene-vignettes.md` |

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

### Provisional until the real system exists

- Sword fights are explicit choices: boarding, the mutiny leader duel, the guard
  duel when sneaking, and the opening's duel. The opening's is a practice bout
  in the original, so only the log differs.
- Town assaults are a provisional outcome dialog. Its "Repelled" result gives
  reputation −2 and alert +16, where the documented loss gives reputation −1 and
  −1 favour (D26).
- The villain duel. Its loss follows the documented rule (reputation −1, he
  escapes to the town he was sent to). A villain's 128 extra land-battle
  defenders wait for land battles (K3).
- A barmaid informant stands in for the governor's-house informant until
  marriage exists (K8).
- Married is 0 in the retirement score and summary.

### Not ported yet

- The famous expeditions, which are the only starts that open at sea, and their
  ending (CSTR 159).
- Sword, fort and land combat (K3), and battle shallows, beaching and terrain
  backdrops (K6).
- Courtship (K8).
- Status screens and practice fencing from the Captain's Cabin (D32). The
  logbook, city information and map views now cover part of that report item.
- The captain id's battle and sword skill, and Party Status mood.

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
