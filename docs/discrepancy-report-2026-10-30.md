# Business-logic discrepancy report

- **Report date:** 2026-10-30
- **Scope:** game business logic in `src/` (mainly `game.mjs`, `mechanics.mjs`, `battle-mechanics.mjs`, `data.mjs`) and the data tools in `tools/`, compared with the reference archive linked from `AGENTS.md` (`../piratesgold`: `README.md`, `docs/*.md`, with some checks against `evidence/binary/disasm`).
- **Code state reviewed:** branch `main` at commit `e196271`, plus uncommitted changes in `src/game.mjs`, `src/mechanics.mjs` and `test/mechanics.test.mjs`.
- **Tests:** `make test` passes with 0 failures. The tests check the code's own formulas, so they don't catch any of the items below.
- **Code changes made by this review:** none.

Line numbers refer to the code as it was on the report date.

Severity: **H** = changes how the game plays, **M** = noticeable rule difference, **L** = minor or cosmetic.

## Sailing and the world map

| # | Sev | Discrepancy |
|---|---|---|
| D1 | H | **Fixed in #2.** **The land/sea map is wrong for some tiles.** `tools/build_world_map.py:14-21` counts every tile below 80 as sea. The docs say tiles 60–67 are all land and 68–79 are part land (porting_guide §6, landing_and_overland §1). Ships can sail over that land. There is also no shallow-water class, so reefs and battle shallows can't be built. `tactical-sea-combat-plan.md` wrongly says the map provides shallows. |
| D2 | H | **Fixed in #5.** **Arriving at a town works differently.** The original enters a town automatically when the ship touches one of its listed trigger cells (entering_towns §0). The port uses an "Approach" button that works anywhere within 7 cells of the town centre (`game.mjs:1125`, `:1998`). That lets ships enter inland towns. The nearest town is also chosen by distance to the town centre, not by trigger cell (`game.mjs:361`), which affects encounter distance and nationality. |
| D3 | H | **Fixed in #6.** **Town alert never resets.** The original keeps one alert counter for the nearest town and sets it to 0 when the nearest town changes (town_attack_and_plunder §1). The port stores alert on each town and never clears it (`game.mjs:504`, `605`, `644`, `710`). Once a town reaches alert 8, ships never appear near it again for the rest of the game, and its gold stays hidden forever. |
| D4 | M | **Fixed in #11.** **Time doesn't follow the voyage clock.** In the original, each voyage starts its tick count at 63, with half-day and daily checks at offsets from that. Every arrival or encounter ends the voyage and costs `tick/64 + 1` days (at least 2). The port runs the half-day and daily checks on a global tick (`game.mjs:489-490`) and charges no days for arrivals or encounters. Wind does use the voyage tick. The project hasn't recorded whether it keeps the original's "at least 2 days" rule (porting guide quirk 3). |
| D5 | M | **Fixed in #8.** **Leaving town ignores the town's departure cell and heading.** The port moves the ship 8 cells along its current heading (`game.mjs:1884-1892`). The departure heading isn't extracted, and the `harbors` field in the scenario data is never used. |
| D6 | M | **Fixed in #4.** **No minimum crew per ship.** The original makes you abandon ships when you have fewer than 8 men per ship, and checks this at every voyage start, after dividing the plunder and after an assault (ships §5). The port never enforces it. |
| D7 | M | **Fixed in #7.** **Losing a ship doesn't lose its share of the cargo.** When the flagship sinks, the enemy takes a ship during your escape, or the fort sinks one, the original also removes that ship's share of gold, food, goods and cannon. The port just deletes the ship and trims cargo to fit (`game.mjs:759-762`, `779-780`, `1206`). Fort fire also never sinks your only ship (`:1205`); in the original that is the "last ship" path, which means prison. |
| D8 | L | **Fixed in #1.** The starvation formula (crew/20 desert, `game.mjs:513-517`) isn't in the docs, which say it was never traced. It isn't marked `ASSUMED` as `AGENTS.md` requires. |
| D39 | M | **Fixed in #16.** **The start point is chosen by difficulty.** The new-game record copy (`0x1386C`) picks the start point with `rnd(4)` from the record's four points (`0x1395A`). The port used `points[difficulty]`, so a French 1680 Journeyman always started beside Guadeloupe. The same routine sets pirate favour (`0x45E7E`) to −1 after copying the record; the port left it at 0. |
| D9 | L | At the map edge the original turns the ship around; the port just stops it at the edge (`game.mjs:477-478`). |

## Encounters

| # | Sev | Discrepancy |
|---|---|---|
| D10 | M | **Fixed in #3.** **Hunters can be escaped.** Correction after tracing `0xD540`–`0xDB7B`: the original does offer Close for battle, Hail and Sail away to a hunter (CSTR 121). The real rules: (1) a hunter ignores "Sail away" at the CSTR 120 prompt; (2) after CSTR 121, any answer except battle is overtaken ("He's overtaking us", CSTR 126) when `rnd(3) < difficulty`; (3) a successful hail, like sailing away, raises the town alert by 16. The port escaped on the first prompt, never overtook, and charged no alert for hailing. The rule that a hail goes unanswered at favour ≤ −4 is original (CSTR 315 at `0xDA61`); the report was wrong to call it undocumented. |
| D11 | L | Before 1660 a Frigate should be shown as a "Fast galleon" in sightings, the capture prompt and the shipwright list. This isn't implemented anywhere. |

## Sea battles (`battle-mechanics.mjs`)

| # | Sev | Discrepancy |
|---|---|---|
| D12 | H | **Hit boxes are far too small.** The docs give fixed, non-rotating half-sizes of 20×10, 30×20 and 40×30 depending on ship size, read from the code. The port uses rotated boxes of about 4×8 to 7×13 (`:293-302`), so a pinnace is roughly 6× harder to hit. Boarding contact (a quarter of the half-size) and the "close enough to strike" test (twice the half-size) use circles instead (`:126-137`). |
| D13 | H | **Ships move 4× too fast.** The doc's formula works out to speed/64 pixels per frame. The port uses speed/16 (`:13`, `:245`). Shot flight time (distance/2 frames) and the 240-pixel escape distance are unchanged, so aiming and escaping are both easier than in the original. |
| D14 | M | **Ships drift downwind instead of stopping.** The docs say speeds below 1 become 0, and the drift branch and −12 limit never run (quirk 20, "keep: ships stop"). The port keeps both (`:69`, `:243`). |
| D15 | M | The enemy's "table value equals your skill, so subtract 1" rule (quirk 19) is missing. The port also hasn't recorded a decision on the player's unsigned-read upwind bug (quirk 18). |
| D16 | M | **The enemy only fires when duelling** (`:372`). The docs say he fires whenever loaded, armed, and within ±6 of his beam, whatever his tactic. |
| D17 | L | The battle wind's strength changes even when its direction didn't (`:329-336`); the docs say only if the direction changed. |
| D18 | L | The enemy's wanted heading isn't rounded to 16. |
| D19 | M | **Fixed in #9.** The "enemy takes a ship when you escape" penalty also applies at sunset (`game.mjs:773`). The docs limit it to escape (event 6). |
| D20 | M | **Fixed in #7** (with D7). When the flagship sinks, the port halves the crew (`game.mjs:761`). Nothing in the docs supports this and it isn't marked as an assumption. |

## Captures, morale and prisoners

| # | Sev | Discrepancy |
|---|---|---|
| D21 | M | **Captured ships arrive repaired.** The docs keep the prize's battle damage; the port sets it to 0 (`game.mjs:839`, `851`). The "raise crew to 8 × slot" quirk is also skipped when a prize replaces a ship in a full fleet. |
| D22 | M | **Fixed in #17.** **Crew morale isn't stored.** The original keeps a morale value that rises by 1 per capture (2 for kind > 5) and is recalculated monthly. The port recalculates it on every use (`game.mjs:687`, `1222`), so the capture bonus never affects reload time or desertion. |
| D23 | M | **Fixed in fix/world-economy.** Traced `0x12432`: a prisoner word `v` is handed over automatically, with no keep option, when `v & 0x8000` and `(v >> 8) & 4` equals the governor's nation (`0x4605C`); favour rises by `((v & 0x255) & 7)/2 + 1`, so 1 or 3 (the literal mask is `0x255`, which README §4.3 drops). The capture code (`0xDE33`–`0xDF80`) stores `((flag & 4) << 6) | id`, takes only captains with an id, and sends the bit-15 mission pirate to `0x1F8F7` instead, so no stored word ever matches: in the original the governor never takes a captured pirate. The port now does the same (`governorPirateHandover`, `captiveWord`). Named pirates are held like hunters, with the treasure fleet / silver train menu that `0xDE64` offers when `flag & 3 == 0` (Spain and pirates); unnamed captains are not taken; ransom offers (`0x127DA`) include pirates; captivity frees every prisoner (`0x1F88F`); leaving a town lets the prisoner in slot `rnd(8)` escape overboard (`0x18004`–`0x180AB`, CSTR 110). Saves from before version 7 release unnamed pirates held "for delivery" (the original never takes a captain without an id); named ones stay ransomable. `0x17EFB`, which holds both that escape and the port desertion, runs as you leave (after the town screen, `0x1DA91`), so the port now applies desertion on leaving too, first, with the deserters' share of the gold (`0x1F044`) and the roll-call message (CSTR 109), and its fleet check runs while still in town (`0x180B0`), so too few men for the last ship means prison (CSTR 175), not the uncharted island. The governor's mission target (`0x12FE4`) and the tavern traveller's town (`0x110F9`, drawn again while you know the town) also use the random-town range now. Confidence: high for the trace, medium that the shipped game behaves so (not checked at runtime). **Captive value partly fixed in #19** (named captives now carry the captain id). **Pirate delivery differs from the original (from the disassembly).** `deliver_pirates.asm` (`0x12461–0x1248F`) appears to check each prisoner against the governor's nation and hand them over automatically. The port delivers to any governor and lets you keep them. The port also uses the ship's kind as the value, so the favour gain is always +4. The original value comes from the captain's ID, so (v&7)/2+1 gives 1–4. The focused docs only give the formula, so treat this one as medium confidence. |

## Dividing the plunder and ports

| # | Sev | Discrepancy |
|---|---|---|
| D24 | M | **Fixed in fix/world-economy.** The fresh fleet (`0x1EF87`) now runs after the refit with the party gold, as `0x1852D` does: the flagship comes back repaired (`byte &= 7`), cargo and extra ships go, prisoners stay, and months at sea end at 0 (`0x1F02F` overwrites the division's −16). The crew claim below is wrong: `0x1F010` stores `u16(reputation + 16)` first and uses 1 only when it is 0, so the old crew is never kept; the port gives 1 for any sum ≤ 0 (ASSUMED for the negative sums, which wrap in the original). **The flagship keeps its damage after dividing the plunder** (`mechanics.mjs:397-403`); the original repairs it. If reputation + 16 ≤ 0, the original keeps the old crew, but the port forces the crew to 1 (`:389`). |
| D25 | M | **Fixed in #13.** **A failed harbor entry or sneak sends you back to sea.** The original keeps you at the approach menu so you can retry. Being spotted while sneaking should start a guard duel, and losing it sets reputation to −1. The port shows a notice only (`game.mjs:1205-1217`), with no provisional duel outcome as `AGENTS.md` requires. |
| D26 | L | The provisional "Repelled" assault outcome gives reputation −2 and alert +16. The documented loss gives reputation −1 and a −1 favour hit. The alert +16 on "Withdraw" isn't in the docs (`game.mjs:1147-1148`). |
| D27 | L | **Fixed in fix/world-economy** (with D30): the approach shows the figures only for towns you have current information on. Population, soldiers and treasury are shown for every town on approach (`game.mjs:1131`). The original shows them only for towns you have information on. |

## Monthly world update

| # | Sev | Discrepancy |
|---|---|---|
| D28 | M | **Fixed in fix/world-economy.** The range is the original's `0x4605A` = header field `0x4607E` − 2, and that field is the record count − 1 (35 for 1560's 36 records), so the range is the real towns − 1, not all of them. The port now uses `towns.length − 1` for the event (`rnd(64) < range`), the monthly economy, both AI-conquest draws and the opening news. The last real town of each era (1560 Yaguana, later Villa Hermosa) stays static, a faithful quirk. **Two real towns never get random events.** The port skips indexes from `towns.length − 2` up (`game.mjs:568`). The original subtracts 2 to exclude its two "Florida Channel" placeholder towns, but `build_scenarios.mjs:47` already removes those, so the port drops two real towns instead (in 1560, Villa Hermosa and Yaguana). |
| D29 | M | **Fixed in fix/world-economy.** `0xC81B` runs between the economy and diplomacy: town B falls to town A's nation (war, `2·B.soldiers < A.soldiers`, `|dx|+|dy| < 150`, B not the player's town or the mission town) and gets a new governor; the news reads "%s has captured %s". Flag, sprite, merchant, encounters and missions all read the town's nation. **AI conquest is missing** from the monthly update (README §4.11; diplomacy_and_world §1 step 5), and the status docs don't list it as a gap. |
| D30 | L | **Fixed in fix/world-economy.** New governors (event and conquest) re-roll the relative (`0xCA51`); random events set the obsolete-information bit 0x20 (`0xCAF4`), shown in the new logbook's city information, the approach and the traveller's report; new alliances log the amnesty line; the opening news reports a town event for each pair at peace (`0x13679`). Town information follows the original's 0x80 bit: rolled per town at a new game (`rnd(4)+1 > difficulty`), set by entering, capturing or a traveller's report. Several small effects are missing. A new governor doesn't re-roll the governor's relative. Random events don't mark town information as out of date. The "offers pirate amnesty" news line is never logged. At game start, the news should include a town event for each pair of nations at peace. |
| D31 | L | The monthly favour clamp skips favour with pirates (index 4). |

## Captain's Cabin replacement screens (porting guide §17)

| # | Sev | Discrepancy |
|---|---|---|
| D32 | M | The porting guide says the cabin's features must stay reachable. The port has no Party, Personal, Ship or Hostage status screens, no map or gazetteer, and no practice fencing (which §17 says must stay). The ship's log keeps only the last 4 lines (`game.mjs:1946`). |

## Project docs that contradict the reference docs

| # | Sev | Discrepancy |
|---|---|---|
| D33 | L | `implementation-status.md` lists "town assaults, capture, and plunder" as missing, but a provisional assault exists. It also lists promotions as still needed, but they are implemented. |
| D34 | L | `tactical-sea-combat-plan.md` treats drift and the −12..40 limit as confirmed, and the hit boxes as unverified. `sea_battles.md` says the opposite on both (see D12 and D14). |
| D35 | L | **Fixed in #2.** The plan says the navigation map provides shallows; it doesn't (D1). |
| D36 | L | The treasure-map clue town is a random town, not the town nearest a site from the documented list of treasure sites. This simplification isn't marked as an assumption (`game.mjs:1635`). |
| D37 | L | The original only allows saving in town. The port also auto-saves at sea every 5 days and after battles. The porting guide allows this, but it isn't written down as a project decision. |
| D38 | L | `applyProvisionalBattleOutcome` (`mechanics.mjs:129`) is no longer used by the game, only by tests. Its "sunk" and "lost" rules don't match the docs. |

## Known gaps already recorded in the project docs

| # | Gap |
|---|---|
| K1 | Landing, walking on land, digging and reefs |
| K2 | **Fixed in #14.** Mutiny when morale ≤ −4. Traced (`0x1DD0E`): checked once after the months a voyage crosses, aboard at sea; a third of the crew deserts with their gold, the leader duel is provisional, and reputation drops by 4 (to −5 if the duel is lost). There is no marooning. |
| K3 | Sword fights, fort battles and land battles |
| K4 | Treasure fleet and silver train: monthly movement, encounter override and capture bonus |
| K5 | Quest encounters and named-captain identities. **Hunter names done in #19; governor missions and the wanted pirate done in #22.** |
| K6 | Battle shallows, beaching and terrain backdrops (the "beached" ending can never happen) |
| K7 | Lost relatives and villains |
| K8 | Marriage and the governor's daughter (favour ≥ 2) |
| K9 | Health, forced retirement and score |
| K10 | **Done in #12.** Prison and shipwreck relocation (relocation and the fresh fleet since #4). Captivity time traced from `0x1F803`: both prison and the uncharted island last (trunc(reputation/2) + 7) steps of 27 days, re-checking reputation each step; the fresh fleet follows, held pirates go free, a health message (CSTR 176–179) shows, and difficulty drops one level. The original has no escape option. The retirement check (`0x1F1D7`) that runs first now offers a provisional retire / carry-on choice in poor health until K9. Also fixed in #12: the fresh fleet resets months at sea to 0 (`0x1EF87`); its crew is `u16(reputation + 16)`, 1 only when that is exactly 0 (ships.md's "kept as is" is wrong), so the port takes at least 8 men (ASSUMED) instead of the original's endless abandon loop or wrapped crew; monthly reputation decay is `rep -= rep >> 3` (floor, `0xCEB8`), not truncation; and monthly land income `wealth += land / 2` is applied. |

## What matched the docs

These systems match the documented formulas exactly:

- **Sailing:** speed target, clouds, wind shift, food consumption, ship stats.
- **Encounters:** the sighting roll and tier choice.
- **Battle basics:** crew and guns taken into battle, reload times, per-hit damage, and the enemy's tactics table.
- **Plunder:** ship and town plunder, including the deliberate −40 growth on capture.
- **Ports:** merchant and shipwright prices, harbor and sneak rolls, desertion, tavern and post-battle recruits.
- **Career and world:** promotion and land grants, amnesty pricing, favour spreading between nations, diplomacy changes, town economy, plunder division, ransom offers.

## Suggested priority

D1–D3, D12 and D13 change the game most, and each fix is small. D28 is a one-line fix.
