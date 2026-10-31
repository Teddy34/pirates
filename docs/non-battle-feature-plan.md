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
| 3 | Governors and career progression | Partial | Done: missions (#22); the audience order, pirate delivery, ransoms, amnesty and commissions (#23). Left: titles, national rewards, and promotion hooks for relative quests. Pirate hand-over traced in #28 (D23): no stored prisoner ever matches, so governors never take a captured pirate, and ransom offers include pirates. Open questions from the #23 review: (a) answered in #28, except that the ransom offer text (CSTR 136) names the captain, which our dialog doesn't; (b) a captain who sneaked in can now see the governor, but the original's sneak check inside the governor visit (`0x13269`) is untraced (`entering_towns.md`, open questions). | main report sections 4.2–4.3, `diplomacy_and_world.md`, `lost_relatives.md` |
| 4 | Treasure fleet and silver train | Done (#29) | Initialize both routes, move them monthly, skip non-Spanish stops, publish reliable news, override eligible encounters, display their presence in port, award capture bonuses, and end that year's route when captured. | `treasure_fleet_silver_train.md`, `encounters.md` |
| 5 | Named pirates and pirate-hunters | Partial | Done: hunters overtake and can't simply be escaped (#3), hunter names from the captain id (#19), the wanted pirate of a governor mission (#22), and named captives held as the original's prisoner words, with the traced hand-over rule (#28). Left: the captain id's battle and sword skill, and allocating identities without repetition. | `encounters.md`, cited encounter and capture disassembly |
| 6 | Landing and overland travel | Done (#30) | Land on valid coast pixels, walk at the documented rate, reboard at the landing point, apply reefs, advance campaign events on foot, and expose a Dig action. | `landing_and_overland.md`, `sailing.md` |
| 7 | Treasure maps and digging | Partial (#30) | Done: three map records, the 256 decoded dig sites, tavern pieces and the dig's payout. Left: the relative branch of the dig waits for row 8's villains to hand out pieces. Maintain three four-piece maps, award random missing pieces, reveal a readable site, dig within the documented radius, consume three days on a failed dig, and resolve buried treasure and the lost city. | `treasure_fleet_silver_train.md` |
| 8 | Lost relatives and roaming villains | Missing | Start quests from promotions, move villains monthly, offer traceable gossip, encounter villains in their town, grant map pieces through provisional duel outcomes, and rescue all four relatives by digging. | `lost_relatives.md`, `treasure_fleet_silver_train.md` |
| 9 | Courtship, marriage, and informants | Missing | Model daughters and nieces, charm checks, rival suitors, proposals, merchant marriage, family discounts, and informant reports. Use provisional duel outcomes until sword combat exists. | `marriage.md`, `town_economy.md` |
| 10 | Health, age, land, and retirement | Missing | Track wounds, health, medicine, age pressure, land income, forced and voluntary retirement, career score, and a final career summary. | `health_age_land.md`, main report retirement sections |

## Delivery rules

Implement each row as a vertical slice with deterministic mechanics tests,
campaign UI, captain's-log entries, and save migration. A feature is not done
when only its state fields exist.

Where a slice reaches unfinished combat, present explicit provisional results
that apply consistent campaign consequences. Do not defer the entire
non-battle loop merely because its final duel or battle scene is unavailable.

Update this plan and `implementation-status.md` when a slice becomes playable.
Verify desktop and narrow viewport behavior for every new interaction.
