# Scene vignettes: picture brief and image-generation prompts

A catalogue of the story moments that get a framed picture above the dialog
text, with one image-generation prompt for each. The list follows the
original game's scene table, so every moment that had a picture there gets
one here. The **context** for each moment (when it is shown, what the text
says) comes from the research archive: `../piratesgold` code, strings and
docs. **No original artwork was looked at, traced or described.** Every
prompt is written only from the game situation and our own art direction.

Asset rule (see `AGENTS.md`): a generated picture may be committed only after
the user confirms they have the rights to it. Record the tool, model and
prompt for each file in `assets/vignettes/PROVENANCE.md`. Never name the
original game, or describe its pictures, in a prompt.

## 1. Fixed format

| Item | Value |
|---|---|
| Picture (art pixels) | **224 × 128** (7 : 4) |
| Frame | 8 art px on every side, one shared frame (§3) |
| Framed vignette | **240 × 144** art px |
| Display | 2 screen px per art pixel → **480 × 288 CSS px**, like the clouds (`CLOUD_ART_PIXEL = 2`). It fits the 486 px content width of `#event-dialog` (540 px − 2 × 27 px padding). Below about 520 px of viewport, draw 1 px per art pixel (240 × 144). Always whole-number scale, `image-rendering: pixelated`. |
| Generate at | **1792 × 1024** (exactly 8 × the picture; most generators accept 7 : 4 or 16 : 9) |
| Reduce | Downscale ×8 with a box or nearest filter to 224 × 128, quantise to ≤ 32 colours, clean the 1 px outlines by hand |
| File | `assets/vignettes/<id>.png`, 224 × 128, indexed PNG, no frame baked in |

Why this size: 224 × 128 keeps a figure's face about 12–16 art px tall in a
mid shot. That is the detail level of the town and ship sprites. It is also
the largest 2× picture that fits the existing dialog without changing it.

## 2. Shared style block

Put this block in front of every scene prompt.

> Pixel-art illustration, 224×128 native pixels rendered at 1792×1024 (every
> art pixel a clean 8×8 block), about 32 colours, no anti-aliasing, no
> smooth gradients, at most light ordered dithering. A one-pixel very dark
> brown outline (#21180f) around figures and objects. Flat cel shading with
> 2–3 tones per material. Light from the upper left. Drawing and composition
> in the manner of François Bourgeon's historical maritime comics (*Les
> Passagers du vent*): meticulous, period-accurate costume, ships, rigging
> and colonial architecture; realistic proportions; expressive, grounded
> faces; a muted watercolour palette of ochre, sepia, terracotta, sea green
> and faded indigo, with warm highlights (#f2c55c) and parchment lights
> (#ead8ad). Cinematic comic-panel framing, one clear focal point. The
> Caribbean between 1560 and 1680.

**Negative prompt:** text, letters, captions, speech balloons, logos,
signature, watermark, border or frame, modern objects, photorealism, 3D
render, blur, depth-of-field bokeh, anime style, fantasy armour.

Notes:
- The reference is **François Bourgeon**'s *Les Passagers du vent*.
  Some generators refuse a living artist's name. The rest of the block
  describes the style without the name, so drop the name when that happens.
- **Recurring captain** (keep the same description in every prompt where he
  appears): *the captain, a lean man about thirty, sun-weathered face, dark
  hair tied back, short beard, faded dark-blue coat with brass buttons, red
  sash, cutlass at the hip, tall boots.* Make him grey and older in the
  retirement scenes.
- **Nation colours** for flags and uniforms: Spain yellow/red, England red
  with a white field, France blue with white, Holland orange/blue, pirates
  black. These match `FLAG_DARK` and the map colours.

## 3. The shared frame

One frame for every vignette: a 240 × 144 PNG with a transparent 224 × 128
centre, or the same frame drawn in code. It is 8 art px wide: a 1 px
outline (#21180f), 5 px of dark carved wood (#5a3b22 / #3b2b1d) with a
lighter top-left bevel (#7a5a36), and a 1 px brass inner fillet (#d6a447)
next to the picture. Each corner has a 6 × 6 brass corner piece. It matches
the brass and paper of the dialogs. The frame stays the same in every
scene, so it is not in any prompt.

## 4. Scene catalogue

Columns: **id** (our file name) · **orig.** (the original scene-table slot
and file stem, kept so the scene can be traced back in the disassembly; the
original picture itself is not used) · **when** · **text cue** (the
in-game text, from `evidence/text/CSTR.ENG.txt`) · **prompt** (scene part
only).

### 4.1 Arriving in a town

**harbour-arrival** · orig. 0x18 `arr_sea` · shown when you sail into a
town (`0x19CA7`, `entering_towns.md`) · *"You have arrived at the lovely
town of %s… The %s flag flies over the town. What will you do? Enter /
Attack / Sneak in / Leave"* (CSTR 114–115)
> Seen from the deck of an arriving ship: a Caribbean colonial harbour
> town in the afternoon, with whitewashed walls and terracotta roofs going up
> a green hill, a stone fort with cannon at the harbour mouth, a national
> flag on the fort, fishing boats and a moored merchant ship, palms, calm
> turquoise water. The captain stands in the foreground at the rail, seen
> from behind. *Variants: one per nation flag.*

**shore-arrival** · orig. 0x17 `arr_land` · shown when you arrive on foot,
and always for inland villages (`0x19C9B`) · same text as above
> A landing party of a dozen armed buccaneers comes out of the jungle edge
> onto a dirt road. Below them is a small colonial town with a palisade, a
> church bell tower and a flag. The captain leads the party with his hand
> raised to halt. Late morning, humid haze.

**town-square** · orig. 0x16 `town` · likely the town's backdrop near the
tavern and barmaid code (`0x11606`); context unconfirmed
> A busy colonial plaza: a church with a bell gable, the governor's
> arcaded house, market stalls with fruit and cloth, soldiers in morions
> leaning on halberds, an ox cart, chickens, a well, and sharp noon shadows.

### 4.2 The governor

**governor** · orig. 0x00 `governor` · the governor visit: letter of
marque or amnesty offer, promotions, land grants, missions, ransom offers
and villain news (`0x11D6D`, `governor_visit.asm`, `promotion.asm`) ·
*"Over a delicious dinner, the governor offers you a Letter of Marque…"*,
*"…I do gladly confer upon you the title of %s!"* (CSTR 134, 147, 200)
> The candlelit dining hall of a colonial governor's mansion: a portly
> governor in a lace collar and a dark velvet doublet sits at a long table
> with silver dishes, roast fowl, wine and a sealed parchment proclamation.
> Tall windows show a sunset harbour, with a portrait of the king on the
> wall. The captain stands across the table, hat in hand. A servant waits by
> the door.

**governor-daughter** · orig. 0x2B `daughter` · courtship at the
governor's house (`0x12935`, `marriage.md`) · *"The governor introduces you
to his young daughter. She is presently being courted by %s, but she seems
interested in you! Make conversation? / Propose marriage?"* (CSTR 141–146)
> A garden courtyard of a governor's mansion with bougainvillea and a
> fountain: a young noblewoman in a pale silk gown with a fan and a
> high-necked lace collar gives a curious sideways glance to the captain,
> who bows. Behind her, a stiff, richly dressed rival suitor watches with
> jealousy. Soft evening light.

**governor-niece** · orig. 0x2C `niece` · the same courtship when the
governor has a niece, not a daughter (`0x12AA4`)
> An inner balcony of a colonial mansion: a lively young woman in a dark
> green gown, a governor's niece, leans on the balustrade and laughs at
> something the captain has said. An older duenna in black frowns from a
> chair. Warm lamplight.

**wedding** · orig. 0x01 `wedding` · marriage to the governor's daughter
or niece, or to the merchant's daughter (`0x12C6D`, `0x225F9`) · *"Amid
merriment and celebration you and your lovely bride are married."* (CSTR
145, 299)
> The steps of a white colonial church: the captain, in a new coat, and his
> bride, in an ivory gown and mantilla, come out under a rain of petals.
> Guests in their best clothes cheer, a guitarist plays, sailors from his
> crew throw hats in the air, and the bell rings. Bright morning.

**villain-news** · orig. 0x02 `evilone` · after a promotion the governor
names the villain who knows where your lost relative is; also shown when
you meet him in his town (`0x122E9`, `0x1897A`, `lost_relatives.md`) ·
*"The evil %s %s knows the whereabouts of your %s! He was last seen in the
city of %s."* (CSTR 137–138)
> A menacing nobleman with a cruel smile, a thin moustache and a scarred
> cheek, in a black and crimson doublet, rings on gloved fingers, a hand on
> his rapier hilt. He stands half in shadow in a torch-lit stone hallway,
> and a frightened servant hurries away behind him.

**pirate-delivered** · orig. 0x23 `hostage` (same slot as
**hostage-talks**) · you hand a captured pirate to the governor
(`0x1249E`) · *"So you have brought me that despicable pirate, %s… The king
will be very pleased."* (CSTR 133)
> The governor's audience hall: two soldiers hold a chained, defiant pirate
> captain in a torn shirt with a bandana and gold earring before the
> governor, who is pleased. The captain stands to one side with his arms
> crossed.

### 4.3 Merchant and shipwright

**merchant** · orig. 0x05 `merchant` · the trading post; his greeting
depends on your purse; a married merchant is your father-in-law
(`0x21E98`, `merchant_prices.asm`) · *"The merchant leaps to his feet,
wipes his hands on his apron… 'My very dear Captain!'"*; *"We do not trade
with pirates!"* (CSTR 256–260, 291–294)
> A crowded colonial warehouse office: barrels of sugar, bales of tobacco
> and hides, a hanging scale, a ledger on a high desk. A plump merchant in
> an apron and spectacles gets up from his stool to greet the captain.
> Dust in the shaft of light from a high window.

**merchant-daughter** · orig. 0x2E `merdaugh` · after trading, 1 chance in
10 (`merchant_daughter.asm`) · *"An attractive young woman enters the
shop. The merchant introduces you to his daughter. She bats her eyes at you
appealingly."* (CSTR 296–300)
> The same warehouse office: a young woman in a simple blue bodice and white
> apron, with a basket of oranges, comes in through the door and smiles at
> the captain, while her father beams from behind the ledger desk.

**shipwright** · orig. 0x06 `swright` · repair, sell ships, sell cannon
(`0x218DA`) · *"The shipwright eyes you suspiciously, then asks your
business… Repairing a ship / Selling a ship / Selling some cannon"*; *"I
pay 50 gold pieces per cannon"* (CSTR 277–284, 313)
> A shipyard slipway on the beach: a ship careened on her side with
> carpenters caulking the hull, steam from a tar cauldron, stacked timber and
> a row of iron cannon in the sand. A burly, bald shipwright with a leather
> apron and an adze looks the captain up and down.

### 4.4 The tavern

**tavern** · orig. 0x07 `tavern` · the tavern visit (`tavern_recruit.asm`)
· *"Nothing happens at the tavern."* (CSTR 150)
> A smoky, low-beamed waterfront tavern: rough tables, sailors playing
> cards and dice, a fiddler, a parrot on a beam, lanterns, a ship model
> hanging from the ceiling, and the open door with a glimpse of masts at
> dusk.

**bartender** · orig. 0x5C `bartenda` · news and gossip about the villain
or your relative (`0x10B19`, `0x1E7F4`, `person_inquiry.asm`) · *"The
tavernkeeper listens with interest as you describe %s."*, *"The Bartender
tells you that…"* (CSTR 125, 154; CSTN 18)
> Behind a heavy wooden bar, a one-eyed bartender with a big moustache dries
> a pewter mug, leans in and talks quietly to the captain. Rum bottles and
> casks are behind him, and there is a tally chalked on a slate.

**barmaid** · orig. 0x2D `barmaid` · drinks, company, then an informant
(`0x11503`) · *"And what would ye be lookin' for, handsome?"*, *"You've
won the barmaid's heart! She agrees to gather information for you."* (CSTR
301–306)
> A cheerful barmaid with rolled sleeves, a red skirt and loose curls
> carries three tankards between crowded tables. She winks at the captain,
> who is seated with his hat pushed back. Candlelight, warm and lively.

**crew-recruits** · orig. 0x0C `crew` · sailors join your crew in a
tavern, or survivors after a sea battle (`0x10F0C`, `0xE1E2`) · *"Look!
It's that %s sea-dog… A rowdy group of %s men asks to join your crew."*;
*"Captain, %s sailors wish to join our crew."* (CSTR 151, 166, 309)
> A rowdy group of mixed sailors (tarred pigtails, bare feet, a tall
> African freedman with a boarding axe, a grizzled gunner, a boy with a
> knife) crowd around a table where the captain writes their names in the
> articles. Coins and a rum jug are on the table.

**traveller-information** · orig. 0x0D `infoman` · a traveller sells
information (`0x1118E`) · *"A traveller from %s offers to sell you
information for %s gold pieces."* (CSTR 152)
> In a quiet corner of the tavern a well-dressed but dusty traveller with a
> travelling cloak, a wide hat and a satchel slides a folded letter across
> the table, his palm open for payment. The captain weighs a purse.

**map-seller** · orig. 0x0E `mapman` · a scruffy pirate sells a piece of
a treasure map (`0x112F5`, `treasure_maps.asm`) · *"In a dark corner of
the tavern, a scruffy pirate offers to sell you part of an old treasure
map for 500 gold pieces."* (CSTR 153)
> A dark corner booth lit by one guttering candle: a toothless old pirate
> with a peg leg and a filthy head-scarf holds up a torn, yellowed scrap of
> map with an X on it, a grin on his face. The captain's hand is on his purse.

**ships-news** · orig. 0x24 / 0x15 `shipnews` · the news board, the
"Ship's News" pages (`0x1E84C`) · CSTN 18 "Ship's News"
> A tavern wall beside the door covered in notices: proclamations with wax
> seals, a wanted poster, a ship-sailing bill, a map of the islands.
> Sailors read and argue. A town crier is visible through the window.

### 4.5 Ending an expedition

**divide-plunder** · orig. 0x19 `bank` · dividing the plunder, the
captain's share, a new expedition or retirement (`divide_plunder.asm`) ·
*"Amid great anticipation, the plunder is counted and divided… The crew
swaggers off to squander their hard-won gold."* (CSTR 155–159)
> A colonial counting house: an open iron-bound chest, piles of doubloons
> and pieces of eight stacked in columns on a long table, a clerk with a
> quill and abacus, and crewmen lined up for their share. The captain
> oversees from the head of the table. Shafts of light come through barred
> windows.

**happy-crew** · orig. 0x2F `happy` · the crew is happy. No literal call
site was found, so the moment comes from the user, not the code: likely
after the plunder is divided or after a victory. A good fit is the end of
the division, when the crew feels pleased with their share · *"Most of the
crew feels quite %s with their portion."*, *"The local taverns resound to
the din of drunken sea-chanteys!"* (CSTR 155, 157)
> A waterfront at dusk in full celebration: crewmen with full purses dance a
> jig on barrels, a fiddler and a drummer play, tankards are raised, one
> sailor flings coins into the air and another hugs a laughing girl. Lanterns
> hang from the rigging of the ship moored behind them. The captain watches
> from the gangway with a satisfied grin.

**sailing-master** · orig. 0x09 `smaster` · the sailing master's advice
and warnings: his first briefing, restless men, months at sea, "we're in
%s waters" (`0x1DEB2`, `0x28523`, `0x14361`) · *"The men be growin'
restless, Cap'n. If ye don't find us plunder soon, methinks they'll
mutiny!"* (CSTR 68, 119, 140, 210)
> On the quarterdeck by the wheel, a stocky, weather-beaten sailing master
> with a grey queue and a pipe takes the captain aside and nods toward the
> sullen crew at the waist. A chart and dividers are on the binnacle, with
> billowing sails and the open sea behind them.

### 4.6 At sea

**sail-ho** · orig. 0x08 `sail-ho` · an encounter is sighted
(`encounter_generate.asm`) · *"Sail ho! The lookout reports a sail on the
horizon… Investigate? / Continue our voyage?"* (CSTR 118, 120–122)
> Seen from up in the rigging: a lookout in the crow's nest points at a
> tiny sail on a bright horizon. Below, the deck is busy and the captain
> raises a brass spyglass. There are wind-whipped clouds and a deep blue
> swell.

**boarding** · orig. 0x11 `boarding` · the two ships meet before the
boarding fight (`boarding.asm`) · *"The two ships crash together. Through
the smoke, you spot %s approaching."* (CSTR 171)
> Two wooden ships grinding hull to hull, with grappling lines taut, smoke
> from cannon fire, and the captain's men swinging across on ropes with
> cutlasses and pistols. Through the smoke on the enemy deck, the enemy
> captain draws his sword.

**sinking** · orig. 0x1F `sinking` · your ship sinks, or the enemy ship
blows up (`sea_battle.asm`, `sea_battle_status.asm`) · *"Your ship is holed
in a dozen places, and gradually sinks beneath the waves."*, *"The enemy
ship catches fire, and is destroyed as the flames reach the gunpowder
magazine."* (CSTR 167–168)
> *Variant A:* a shattered ship settling by the stern in a grey sea, masts
> leaning, sailors leaping into the water and clinging to spars, with a
> lifeboat pulling away. *Variant B:* an enemy ship exploding at dusk in an
> orange fireball, with spars flying and the captain's ship in silhouette in
> the foreground.

**outrun** · orig. 0x75 `outrun` · one ship gets out of range
(`0xE79A`) · *"Your ship sails out of range of the enemy; the battle is
over."*, *"Using full sails and skillful seamanship, the enemy vessel
pulls out of range."* (CSTR 197–198)
> A wide seascape: a small, fast ship under every stitch of canvas heels in a
> stiff breeze, leaving a white wake. Far behind, a heavier warship fires a
> last useless shot, and the splash falls short.

**nightfall** · orig. 0x74 `night` · the sun sets and ends a long chase
(`0xE88E`) · *"After a long chase, the sun sets, ending the battle."* (CSTR
169, 317)
> A dark-blue night sea under a sliver of moon and the first stars: two
> distant ship silhouettes with a single stern lantern each slip apart. The
> last red glow of sunset is on the horizon.

**hostage-talks** · orig. 0x23 `hostage` · a captured captain or
nobleman offers information or a ransom (`0xDE6A`) · *"I have information
which may be of value to you… the treasure fleet? the silver train? Hold him
for ransom?"* (CSTR 136, 165)
> The captain's stern cabin: a captured enemy captain in a fine but torn
> coat, hands bound, sits across a table from the captain under a swaying
> lantern. He leans forward, offering a secret. Charts and a pistol lie on
> the table.

**prize-plunder** · orig. 0x0F `plunder` · plundering a captured ship,
and the loot of a captured town (`0xDC14`, `0x22673`, `0xAE64`,
`0x1F64C`) · *"Captain, we've captured a %s ton %s with %s guns… Keep
her? / Plunder and sink her"*, *"Your crew begins to round up gold and
valuables."* (CSTR 164, 193)
> On a captured deck, crewmen haul up chests, sacks of coin and silks from
> the hold through an open hatch. One holds up a jewelled cross and another
> rolls a cask. The captain counts with a quartermaster, and the beaten enemy
> crew sits under guard.

**treasure-fleet** · orig. 0x29 `fleet` · you capture the treasure fleet
(`0x22988`, `treasure_fleet_silver_train.md`) · *"You have captured the
royal Spanish treasure fleet! A flood of gold and jewels pours into the
hold of your ship."* (CSTR 186)
> A great galleon with royal standards, now beaten, beside the captain's
> ship. A chain of sailors passes gold ingots, chests of coins and pearl
> strings across a plank. The sea is sunlit and the hold glitters.

**silver-train** · orig. 0x04 `silvertr` · you capture the silver train in
a town (`0x22A07`) · *"You have captured the silver train, bearing a
fortune in silver from the mines of Peru!"* (CSTR 187)
> A column of pack mules in a dusty town street, their panniers split
> open and spilling silver bars. The buccaneers cheer and lift ingots
> overhead, and the escort soldiers flee past the church.

### 4.7 Mutiny, prison and marooning

**mutiny** · orig. 0x21 `mutiny` · the crew mutinies (`0x1DDFE`,
`calendar_mutiny.asm`) · *"Your men confront you on the quarterdeck.
'Captain, ye're a skulker and a coward…' You draw your sword and attack
their leader."* (CSTR 139)
> A tense deck at dawn: an angry crew armed with belaying pins, knives and a
> boarding axe crowds the quarterdeck ladder. A huge bare-chested mutineer
> leader points his cutlass at the captain, who draws his own sword alone at
> the rail.

**prison** · orig. 0x0A `prison` · you are imprisoned after a lost
assault, and the months pass (`0x16696`, `0x1F2D1`) · *"You bravely fight on
and are wounded. You are imprisoned in %s."*, *"The months pass slowly…"*
(CSTR 175–179)
> A damp stone cell in a colonial fortress: the captain, unshaven, a
> bandage on his arm, sits on straw with his back to the wall. A single
> barred window throws a square of light. Tally marks are scratched on the
> wall, and a guard's shadow is on the door.

**marooned** · orig. 0x0B `maroon` · you lose your last ship and wash up
on an island (`0x1F360`) · *"With your last ship gone, you are washed
ashore on an uncharted island. The local Indians feed you…"*, *"One day, a
small ship arrives…"* (CSTR 161–162, 190)
> A tiny palm-fringed island beach: the castaway captain in a ragged shirt
> sits by a driftwood fire with Taíno islanders who offer him fruit and
> fish. A small sloop anchors offshore in the bay, and its boat rows in.

### 4.8 Duel backdrops

The original picks the fight scene from a 5-entry table (`0x3361C`:
`alley, fort, fort, shipdeck, shipdeck`). Our battle screens draw the fight.
These vignettes only open each fight.

**alley-duel** · orig. 0x27 `alley` · fight scene 0: a guard who
recognises you, the villain, the rival suitor (`0x1968C`, `0x18A49`,
`0x12C43`) · *"Halt, you cowardly pirate scum!"*, *"You spot the evil %s
%s sneaking out a back entrance. He draws his sword…"* (CSTR 131, 144, 163)
> A narrow moonlit back alley between whitewashed houses with wrought-iron
> balconies and laundry lines: the captain and a swordsman square off with
> rapiers, their shadows long on the cobbles. A cat bolts and a shutter
> opens above.

**fort-walls** · orig. 0x28 `fort` · fight scenes 1–2: storming the walls
(`0x18F4B`, `town_assault.asm`) · *"Your men scale the walls of the fort. As
the battle rages, the fort's commander attacks you with his sword."* (CSTR
192)
> The battlements of a stone star-fort: buccaneers come over the parapet on
> ladders through musket smoke. A fort commander in a steel breastplate and
> plumed helmet charges the captain with a sword, past a toppled cannon and
> a flag about to fall.

**shipdeck-duel** · orig. 0x2A `shipdeck` · fight scenes 3–4: the mutiny
duel and the boarding melee (`0x1DE7A`, `0xF235`) · CSTR 139, 171
> The waist of a ship in a swirl of smoke: crews clash with cutlasses
> among rigging and fallen spars. In the centre, two captains cross blades
> beside the mainmast, with the sea tilted behind them.

**land-attack** · orig. 0x73 `landpir` · attacking a town by land; an
armed band of citizens bars your way (`0x18EA6`, `0x1963D`) · *"As you and
your men enter the town, you encounter an armed band of citizens."*; *"The
attack on %s has failed."* (CSTR 191, 211)
> A column of buccaneers with muskets and cutlasses marches out of the jungle
> towards a town palisade. Smoke rises from the fort, a drummer beats, and
> the captain points his sword forward. Militia muskets show on the wall.

### 4.9 Treasure and lost relatives

**dig-found** · orig. 0x78 `find-t` · digging finds a chest
(`dig_site.asm`) · *"Your digging uncovers a chest of solid oak! Opening the
box, you find %s gleaming pieces of gold and silver."* (CSTR 183)
> A jungle clearing by a strange rock: sweaty crewmen with spades stand in a
> fresh pit around an oak chest whose lid has just been prised open. Gold
> glow is on their faces, and the captain holds the treasure map.

**dig-nothing** · orig. 0x1A `search` · nothing found (`0xABD0`) ·
*"After three days of fruitless digging, the search is called off. There
is no treasure here."* (CSTR 189)
> A beach scarred with many empty holes at sunset: exhausted sailors lean on
> spades, one throws down his hat, and the captain stares at a torn map,
> frustrated.

**reunion** · orig. 0x50–0x53 `reunionf` / `reunionm` (chosen by the
relative's sex) · you rescue a lost relative (`0xA95F`,
`lost_relatives.md`) · *"Your %s is rescued! After years of searching, you
are reunited at last."* (CSTR 184)
> *Female variant:* at the gate of a remote plantation, a thin, older woman
> in worn clothes, the captain's mother, sister or aunt, runs into his arms.
> His crew stands back, moved, and the broken chains of a stockade are on the
> ground. *Male variant:* the same scene with a gaunt, bearded man, father,
> brother or uncle, embracing the captain.

**lost-city-inca / -aztec / -olmec / -maya** · orig. 0x79–0x7C `inca`,
`aztec`, `olmec`, `maya` · you dig up the lost treasure of an ancient city
(`0xAB34`) · *"Many years ago, the Spanish plundered the ancient %s
capital… a treasure galleon foundered and sank."*; *"You have found the
lost %s treasure! … A hundred thousand gold pieces…"* (CSTR 185, 188)
> A hidden cave by the sea, its mouth half drowned: the ribs of an old
> galleon wreck and spilled chests of pre-Columbian gold, with stunned
> crewmen holding torches. *Per culture:* **Inca**: sun disc, gold
> llamas, tumi knives, quipu cords. **Aztec**: feathered-serpent
> carvings, turquoise mosaic masks, a sun-stone calendar. **Olmec**: a
> colossal basalt head half buried, jade figurines. **Maya**: stela glyphs,
> jade masks, a jaguar throne.

**treasure-trove** · orig. 0x32 `trescave` · "a picture of your wealth"
from the cabin's treasure chest (`0xBE05`, `captains_cabin.md`)
> The captain's private strong room below decks: an open chest heaped with
> doubloons, a jewelled goblet, pearls and a gilded crucifix by lamplight,
> with his ledger and keys on top.

### 4.10 Retirement

The career score picks one of four endings (`retirement_score.asm`,
`0x5183`): the best standing gives `sunset4`, the humblest `sunset1`. The
text is CSTR 82–84, and the posts come from CSTN 43 (King's advisor,
Governor, … Merchant captain …). The order of the four tiers is my reading of
the jump table, not tested at runtime.

**retire-1** · orig. 0x55 `sunset1` · humble retirement
> An old, grey captain sits on a bench outside a small seaside cottage at
> sunset, mending a net, with a pipe and a dog at his feet. A modest boat is
> beached nearby.

**retire-2** · orig. 0x56 `sunset2` · comfortable (merchant, planter)
> A veranda of a sugar plantation house at sunset: the grey-haired captain in
> a linen coat with his wife, a glass of rum, and the cane fields and a
> distant sail.

**retire-3** · orig. 0x57 `sunset3` · respected (council member, admiral,
lieutenant-governor)
> A balcony of a fine colonial mansion over the harbour at sunset: the older
> captain in an admiral's or councillor's dress coat with a sash, family
> around him, and his former flagship anchored below.

**retire-4** · orig. 0x58 `sunset4` · illustrious (governor, King's
advisor, a title)
> A European palace terrace at sunset: the white-haired captain, now a
> titled nobleman in court dress with the star of an order, stands beside a
> king who has a hand on his shoulder, with formal gardens and a fountain
> below. *"Your exploits become the stuff of legend."*

**hall-of-fame** · orig. 0x7D `fame` · *"Do you wish to have your
exploits recorded in the Pirate Hall of Fame?"* (CSTR 73)
> A wood-panelled hall lined with painted portraits of famous sea captains,
> with a large open book of records on a lectern, a quill, and a candle.
> An empty frame is waiting on the wall.

### 4.11 Optional: title and career openings

**title** · orig. 0x26 `moon03` · the cover picture and opening-theme
screen. That comes from the user. No literal call site was found, so it is
probably loaded by a computed index. The title screen is a full screen, not
a dialog, so this picture may be bigger than the 224 × 128 vignette. Keep
the same pixel size and style so the opening matches the game.
> A moonlit Caribbean night: a pirate ship under full sail crosses a silver
> path of moonlight on a dark-indigo sea. The captain stands at the bow,
> coat blowing, under a black flag. Palm-fringed islands are on the horizon
> under a huge full moon and scattered clouds. Epic, romantic, cover-art
> composition with clear space at the top for the title.

Picked with the nationality and era, and shown before play begins (CSTR
1–44). These are text only in the archive, so these vignettes are
additions. Suggested set:

| id | text cue | prompt |
|---|---|---|
| open-court | an audience at court for royal approval (CSTR 1–2, 31) | A gilded throne room: a young captain kneels before a patron noble who holds a royal charter. |
| open-plantation | indentured on a sugar plantation, meets smugglers (CSTR 13–16, 18) | Cane fields at dusk: a young labourer talks in secret with smugglers at the edge of the field, with a small ship at anchor beyond. |
| open-quarterdeck | duel the evil captain for command (CSTR 12, 20, 43) | The crew looks on as the young hero faces a brutal captain on the quarterdeck. |
| open-castoff | set adrift after a mutiny (CSTR 4–5) | A small leaky boat rows away from a jeering ship. |
| open-boarded | hailed a Spanish ship and boarded (CSTR 35, 44) | A Spanish officer draws his sword on the hero's deck. |

### 4.12 Optional: ship portraits

The original had one portrait per ship type (`0x3A`–`0x42`: pinnace,
sloop, barque, fluyt, merchantman, frigate, war galleon, galleon, fast
galleon). They can be shown on the prize question (*"we've captured a %s
ton %s…"*, CSTR 164) or in the shipwright's list. Prompt: *"Broadside
portrait of a 17th-century* `<type>` *under sail on a calm sea, full
rigging detail, neutral sky."* Our ships are drawn procedurally
(`ship-sprites.mjs`). If you add these, make them match the sprite colours.

## 5. Not vignettes

These scene-table entries are interface, data or logos. They get no picture:
the world map tiles (`map1560…1680`), nation flags (`f-*`, `baseflag`),
pirate flag identification (`idselect`, `fjolly01–20`), the captain's cabin
and logbook screens (`cabin`, `shiplog`), the city information map
(`citymap`), the save screen, the treasure-map frame and paper (`mapframe`,
`wood`), the generic text background and frame (`textback`, `frame`), the
battle screen backdrops (`sbat`, `lbat`), credits and the publisher logo.
`sellcann` is named in the table, but its file does not
exist.

## 6. Checklist per picture

1. Shared style block + scene prompt + negative prompt, at 1792 × 1024.
2. Downscale ×8 to 224 × 128, quantise to ≤ 32 colours, fix the outlines.
3. Check it at 1× and 2× inside the frame, in the dialog, at a desktop size
   and a narrow viewport.
4. Add tool, model, seed and prompt to `assets/vignettes/PROVENANCE.md`,
   and get the user's go-ahead before committing the image.
