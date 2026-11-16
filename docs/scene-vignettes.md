# Scene vignettes: picture brief and image-generation prompts

A catalogue of the story moments that get a framed picture in the dialog, with one image-generation prompt for each. The list follows the
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
| Display | The dialog fills the screen (`dialogPictureLayout` in `src/vignettes.mjs`). The picture is always whole, in its drawn frame, at the largest whole-number scale that fits its share, with `image-rendering: pixelated`. It sits in the page's top left corner with the text beside and below it: a landscape takes at most 55 % of the width and 60 % of the height, a portrait 40 % and 85 %, and 30 % of the width beside a trading table; neither runs under the pinned action bar. At 760 px wide or less the picture is a band above the text, shrunk and then left out when the page would not fit on one screen. |
| Generate at | **1792 × 1024** (exactly 8 × the picture; most generators accept 7 : 4 or 16 : 9) |
| Reduce | `tools/build_vignette.py`: historical fixes on the source, crop to shape, box downscale to 224 × 128, quantise to 256 colours (indexed PNG). Workflow: `.claude/skills/vignette-art/SKILL.md` |
| File | `assets/vignettes/<id>.png`, 224 × 128, indexed PNG, no frame baked in |

Why this size: 224 × 128 keeps a figure's face about 12–16 art px tall in a
mid shot. That is the detail level of the town and ship sprites. The full-screen
dialog shows it at 2× on a laptop and 3× on a desktop screen (1× in windows narrower than about 900 px, and on phones).

## 2. Shared style block

Put this block in front of every scene prompt.

> A finished comic-book panel, hand-inked and coloured. Clean, confident
> dark brown ink outlines around figures and objects; flat colour areas
> with 2–3 tones per material and crisp edges, no airbrushed gradients.
> Light from the upper left. Drawing and composition in the manner of
> 1980s Franco-Belgian historical maritime comics: meticulous,
> period-accurate costume, ships, rigging and colonial architecture; realistic proportions; expressive, grounded faces; a muted
> watercolour palette of ochre, sepia, terracotta, sea green and faded
> indigo, with warm golden highlights and parchment-coloured lights.
> Cinematic comic-panel framing, one clear focal point, details large and
> readable from a distance. The Caribbean between 1560 and 1680.

**Negative prompt:** pixel art, pixelated, dithering, text, letters,
captions, speech balloons, logos, signature, watermark, border or frame,
modern objects, photorealism, 3D render, blur, depth-of-field bokeh, anime
style, fantasy armour.

Notes:
- The generator draws a normal, full-resolution illustration; it is never
  asked for pixel art. `tools/build_vignette.py` does the pixelation (box
  reduction and 256-colour quantisation), so fake pixels or dithering from
  the generator would only blur after reduction. The flat colours, firm
  outlines and large details above are what survive the reduction well.
- The block names no artist: generators refuse or distort prompts that name
  a living artist, so the style is described in plain words instead.
- **Recurring captain** (keep the same description in every prompt where he
  appears): *the captain, a lean man about thirty, sun-weathered face, dark
  hair tied back, short beard, faded dark-blue coat with brass buttons, red
  sash, cutlass at the hip, tall boots.* Make him grey and older in the
  retirement scenes.
- **Flags in pictures** follow the period, not the game's map colours
  (`FLAG_DARK`): Spain the Cross of Burgundy (red ragged saltire on white),
  England St George's cross (and the 1606 Union Flag, on royal ships from 1634), France
  white, Holland the Prince's flag or the later red-white-blue, buccaneers their
  commission's colours or a plain red flag. Describe
  the flag's look in the prompt rather than naming it. The checklist of
  period traps is in `.claude/skills/vignette-art/SKILL.md`.

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
> Seen from the deck of an arriving 17th-century sailing ship, entering a
> small Caribbean colonial harbour town in warm afternoon light. In the
> foreground, at the ship's wooden bulwark rail with a coiled rope and a
> belaying pin rack, stands the captain seen from behind and slightly to
> one side: a lean man about thirty, dark hair tied back, bareheaded, faded
> dark-blue long coat with brass buttons, red sash, cutlass at the hip, tall
> boots, one hand on the rail. Beyond, across calm turquoise water: a low,
> thick-walled stone fort with angled bastions and a few cannon in
> embrasures guards the harbour mouth on the left; on its tallest bastion a
> single large plain white flag on a tall pole, flying flat and fully spread
> towards the viewer, clearly visible against the sky, with no emblem on it.
> Behind the fort the town climbs a green hill: plain whitewashed and ochre
> two-storey houses with small barred windows and wooden balconies, a few
> terracotta tile roofs, a modest church with a bell gable, palms and
> tropical trees. In the harbour: a moored three-masted merchant ship with
> furled square sails, two small fishing boats with single masts and a
> rowing boat. A few cumulus clouds, high blue sky.
>
> *Scene negatives:* emblem on the fort flag, red and yellow striped flag,
> tricolour flag, skull and crossbones, tricorne hat, bicorne hat,
> telescope, spyglass, ship's steering wheel, lighthouse, steamship,
> concrete, modern harbour, cars, power lines. *One image for every nation:
> the build paints the town's flag over the plain white one.*

The art is `assets/vignettes/harbour-arrival.png` (provenance in
`assets/vignettes/PROVENANCE.md`): one illustration with a plain white flag
on the fort, built into a sheet of five rows by `tools/build_vignette.py`,
one per flag (Spain's Cross of Burgundy, St George's cross, the French royal
white, the Dutch Prince's flag before 1660 and the States flag from 1660).
The game picks the row from the town's nation and the career's era.

**shore-arrival** · orig. 0x17 `arr_land` · the original shows it when you
arrive on foot, and always for inland villages (`0x19C9B`). Here it is
**only for landlocked towns**; a coastal town keeps its harbour picture even
if you walk in (a deliberate departure) · same text as above
> A landing party of a dozen armed buccaneers comes out of the jungle edge
> onto a dirt road. Below them is a small colonial town with a palisade, a
> church bell tower and a flag. The captain leads the party with his hand
> raised to halt. Late morning, humid haze.

In the game this is a 224 × 128 landscape (7 : 4, generate at 1792 ×
1024). The art is `assets/vignettes/shore-arrival.png`, one row per town
flag: the source flies a plain white flag that the build paints with the
town's flag, as for port-quay (provenance in
`assets/vignettes/PROVENANCE.md`). Final prompt:

> Wide landscape panel, around 1640, late morning, humid haze. A landing
> party of about a dozen armed buccaneers in linen shirts, canvas breeches,
> knitted caps and broad-brimmed hats, with long muskets, cutlasses and
> powder horns, comes out of the edge of a dense tropical jungle onto a red
> dirt road on a hillside. At the front, the captain, a lean man about
> thirty, sun-weathered face, dark hair tied back, short beard, faded
> dark-blue coat with brass buttons, red sash, cutlass at the hip, tall
> boots, raises one hand to halt his men. Below them in a green valley lies
> a small inland colonial town: whitewashed houses with terracotta tile
> roofs, a log palisade around it, a church bell tower, and a small square
> stone watchtower by the gate with a flagpole on top and one modest-sized
> plain white flag in proportion to the building (no wider than the tower is
> tall), flying flat and spread towards the viewer against the blue sky,
> with no emblem, cross or pattern on it. Palms, banana plants and misty
> green mountains behind; no sea.

Scene negatives: tricorne hats, bicorne, periwig, skull and crossbones,
black pirate flag, ship's steering wheel, parrot, hook hand, cartoon
pirate, sea, harbour, ships, oversized flag, emblem on the flag, red and
yellow striped flag, tricolour flag, union jack, more than one flag,
telescope, spyglass.

**port-quay** · no original slot; an addition · the town menu of a coastal
town, while you are in port · *"Your ships lie safely at anchor."*
> A busy stone quay in a small Caribbean colonial port town, warm afternoon
> light. On the left, a two-storey whitewashed warehouse with a terracotta
> tile roof and big wooden doors; from its upper loading door a plain
> wooden beam sticks out with a rope and a wooden pulley block lifting a
> bale. On the quay, four stevedores in loose linen shirts, knee-length
> baggy canvas breeches, knitted wool caps and bare feet roll wooden
> barrels, carry cloth-wrapped bales and sacks; a stack of barrels, a few
> hemp sacks and coiled ropes, a wooden bollard. The quay runs from the
> lower left towards the centre and ends in stone steps down to the water;
> no single figure stands in the foreground, the eye goes along the busy
> quay to the ships. Out on the calm turquoise water, two ships lie at
> anchor: a three-masted ship with a high stern castle and a smaller
> two-masted ship, their square sails furled on the yards, no flags flying
> from the ships. A rowing boat with two oarsmen comes in to the quay
> steps. On the far headland on the right, a small low stone fort with
> angled bastions; on it, a flagpole on its tower with one modest-sized
> plain white flag in proportion to the fort (the flag no wider than the
> fort's watchtower is tall), flying flat and spread towards the viewer
> against the blue sky, with no emblem, cross or pattern on it. Green
> hills and palms behind, a few cumulus clouds.
>
> *Scene negatives:* captain in the foreground, man in a dark-blue long
> coat with a red sash, figure seen from behind in the centre, oversized
> flag, emblem on the fort flag, flags on the ships, red and yellow
> striped flag, tricolour flag, union jack, skull and crossbones, tricorne
> hat, bicorne hat, telescope, spyglass, ship's steering wheel, iron crane,
> metal crane, lighthouse, steamship, shipping containers, wooden pallets,
> forklift, stencilled crates, concrete, cars, power lines, modern harbour.
> *One image for every nation: the build paints the town's flag over the
> plain white one.*

The art is `assets/vignettes/port-quay.png` (provenance in
`assets/vignettes/PROVENANCE.md`), built like harbour-arrival: one
illustration with a plain white fort flag, five rows, one per period flag,
picked from the town's nation and the career's era. The ships fly no flags,
so one picture serves every nation. The captain is left out on purpose: he
already stands at the rail in sail-ho. The flag keeps its true size for a
fort across the bay, about 4 × 3 art pixels, so its colours only hint at
the nation (the menu names it); a first version with a flag taller than the
fort was rejected. The career openings that reuse port-quay show it too,
with the fort flying the player's nation's flag.

**town-square** · orig. 0x16 `town` · likely the town's backdrop near the
tavern and barmaid code (`0x11606`); context unconfirmed. Used here for the
town menu of a landlocked town
> A busy colonial plaza: a church with a bell gable, the governor's
> arcaded house, market stalls with fruit and cloth, soldiers in morions
> leaning on halberds, an ox cart, chickens, a well, and sharp noon shadows.

In the game this is a 224 × 128 landscape (7 : 4, generate at 1792 ×
1024). The art is `assets/vignettes/town-square.png`, one row per town
flag: the source flies a plain white flag that the build paints with the
town's flag, as for port-quay (provenance in
`assets/vignettes/PROVENANCE.md`). Final prompt:

> Wide landscape panel, around 1640, sharp noon light and short shadows. A
> busy plaza of a small inland Caribbean colonial town, seen across its open
> dusty square: on the left a whitewashed church with a small bell tower; at
> the back the governor's two-storey house with a shaded arcade of round
> arches on the ground floor and a wooden balcony, a flagpole on its roof
> with one modest-sized plain white flag in proportion to the building (no
> wider than the tower is tall), flying flat and spread towards the viewer
> against the blue sky, with no emblem, cross or pattern on it. Market
> stalls under canvas awnings with heaps of oranges, plantains, melons and
> bolts of cloth; townsfolk in linen shirts, women in long skirts, bodices
> and linen coifs, a water seller; a stone well with a bucket in the centre;
> an ox cart loaded with sacks; chickens and a dog in the dust; two militia
> soldiers in buff leather coats and broad-brimmed hats leaning on long
> muskets in the arcade's shade. No single figure in the foreground; the eye
> goes across the square to the governor's house.

Scene negatives: tricorne hats, bicorne, periwig, skull and crossbones,
black pirate flag, ship's steering wheel, parrot, hook hand, cartoon
pirate, captain in the foreground, oversized flag, emblem on the flag, red
and yellow striped flag, tricolour flag, union jack, more than one flag,
glass windows, street lamps, cars, power lines, modern shop signs.

### 4.2 The governor

**governor** · orig. 0x00 `governor` · the governor visit: letter of
marque or amnesty offer, promotions, land grants, missions, ransom offers
and villain news (`0x11D6D`, `governor_visit.asm`, `promotion.asm`) ·
*"Over a delicious dinner, the governor offers you a Letter of Marque…"*,
*"…I do gladly confer upon you the title of %s!"* (CSTR 134, 147, 200)
In the game this is a 96 × 128 portrait, not this dining-hall scene: one
public-domain period painting per era and nation, pixelated
(`docs/governor-dress-1560-1680.md`, `assets/vignettes/governors.png`). The
prompt below is kept for a future landscape version.

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
The art is `assets/vignettes/governor-daughter.png` (provenance in
`assets/vignettes/PROVENANCE.md`), one picture for every era and nation; no
fixes were needed. Final prompt (after the §2 style block):

> Scene, around 1640: the garden courtyard of a colonial governor's mansion
> at golden evening light, whitewashed arcades with terracotta roof tiles,
> bougainvillea, palms in pots and a small stone fountain. On the left, a
> young noblewoman of about twenty in a pale rose silk gown with a stiff
> pointed bodice, full sleeves gathered with ribbons, a broad flat lace
> collar lying over her shoulders, a pearl necklace and dark hair in
> ringlets at the sides of her face, holds a closed folding fan and gives a
> curious, amused sideways glance to the right. On the right, the captain
> [recurring captain, §2] bows to her with his broad-brimmed felt hat in
> his hand. Behind them in the middle distance, a stiff, richly dressed
> rival suitor, a haughty older nobleman in a black silk doublet with
> slashed sleeves, a broad lace collar, a plumed broad-brimmed hat and a
> rapier, watches with jealousy, arms crossed. Mid shot, the two faces
> large and clearly lit.

Scene negatives: periwig, wig, powdered hair, tricorne hat, bicorne,
crinoline, hoop skirt, Victorian dress, white wedding dress, corset worn
outside, cleavage, high Renaissance ruff, modern garden furniture, electric
lights, glass windows with modern frames, ship's wheel.

**governor-niece** · orig. 0x2C `niece` · the same courtship when the
governor has a niece, not a daughter (`0x12AA4`)
The art is `assets/vignettes/governor-niece.png`. One fix: a ship off
the fort flew a red flag with a yellow cross (Spain's colours of 1785), so
sky from just above it paints it out. Final prompt (after the §2 style
block):

> Scene, around 1640: an inner balcony of a colonial mansion at night, a
> carved dark wooden balustrade over a lamplit courtyard, a hanging brass
> oil lamp and a lit candle in a pewter holder giving warm light. A lively
> young woman of about twenty, the governor's niece, in a dark green silk
> gown with a pointed bodice, full sleeves, a broad flat white lace collar
> over her shoulders and chestnut hair in a bun with loose curls at the
> sides, leans back on the balustrade and laughs openly at something said
> by the captain [recurring captain, §2], who stands beside her with a
> modest grin, hat under his arm. In the background on the right, an older
> duenna in plain black with a white linen headcloth sits stiffly on a
> high-backed wooden chair with a rosary in her hands and frowns at them.
> Mid shot, the two young faces large and clearly lit.

Scene negatives: periwig, wig, powdered hair, tricorne hat, bicorne,
crinoline, hoop skirt, Victorian dress, cleavage, nun's habit, modern lamp,
electric light, glass light bulb, ship's wheel.

**wedding** · orig. 0x01 `wedding` · marriage to the governor's daughter
or niece, or to the merchant's daughter (`0x12C6D`, `0x225F9`) · *"Amid
merriment and celebration you and your lovely bride are married."* (CSTR
145, 299)
The art is `assets/vignettes/wedding.png`, shown for every marriage; no
fixes were needed. The bride wears her best coloured silk: white wedding
gowns spread after Queen Victoria's wedding of 1840 ([V&A, "Wedding
colour"](https://www.vam.ac.uk/articles/wedding-colour)), so the earlier
ivory gown and mantilla were dropped. The guitar has a modern outline, about
15 pixels wide at 1×; accepted. Final prompt (after the §2 style block):

> Scene, around 1640, bright morning: the stone steps of a whitewashed
> colonial church with a plain bell tower and a big arched wooden door, a
> bell swinging in the tower. The newly married couple come down the steps
> arm in arm: the captain [recurring captain, §2], looking proud and happy,
> and his bride, a young woman in her best gown of deep crimson-red silk
> with a pointed bodice, full sleeves, a broad white lace collar over her
> shoulders, pearls, and a small wreath of fresh flowers in her loose dark
> hair. Townsfolk in their best seventeenth-century clothes cheer and
> scatter flower petals; a musician plays a small baroque guitar; on one
> side a group of rough sailors from the captain's crew, in loose shirts,
> short breeches and knitted caps, throw their caps in the air. Palms and a
> blue sky behind. The couple is the clear focal point, in the centre,
> faces large and clearly lit.

Scene negatives: white wedding dress, ivory gown, long white veil, bridal
train, tuxedo, top hat, rice, confetti, champagne, wedding cake, cars,
periwig, tricorne hat, bicorne, crinoline, hoop skirt, Victorian dress,
stained glass with figures, ship's wheel.

**villain-news** · orig. 0x02 `evilone` · after a promotion the governor
names the villain who knows where your lost relative is; also shown when
you meet him in his town (`0x122E9`, `0x1897A`, `lost_relatives.md`) ·
*"The evil %s %s knows the whereabouts of your %s! He was last seen in the
city of %s."* (CSTR 137–138)
In the game this is a 96 × 128 portrait (3 : 4, generate at 768 × 1024),
one picture for every era and nation. The art is
`assets/vignettes/villain-news.png` (provenance in
`assets/vignettes/PROVENANCE.md`); no fixes were needed. The plain
standing collar is accepted: Philip IV banned the ruff and brought in the
stiff golilla collar in the early 1620s (1623 per
[Artnet News, on the Hispanic Society's *Spanish Style* exhibition](https://news.artnet.com/art-world/hispanic-society-spanish-fashion-2711741);
Wikipedia's *Ruff* article says 1621), and its exact shape does not read
at 1×. The prompt sets him around 1640 in Spanish dress because the port's
villains always move among Spanish towns (`VILLAIN_NATION` in
`src/villains.mjs`).

> Vertical half-length portrait of a menacing Spanish nobleman, around 1640,
> a colonial grandee and the villain of the story. A man in his forties with
> a cruel thin smile, cold narrow eyes, a thin waxed upturned moustache and
> a small pointed beard on the chin, black hair swept back, a pale scar
> across one cheek. He wears a severe black doublet with a row of small gold
> buttons and slashed sleeves showing crimson silk, a stiff plain white flat
> collar standing up under the chin (a narrow rigid white collar, no ruff),
> a short black cape over one shoulder, and a heavy gold chain across his
> chest. One black-gloved hand with gold rings rests on the hilt of a rapier
> with a swept iron hilt. His head sits in the upper third of the picture
> and his face is large and clearly lit from the side, the other half in
> shadow. Behind him, simplified and dark: a torch-lit stone hallway with an
> arched doorway, and a small frightened servant hurrying away in the
> background.

Scene negatives: ruff, lace cravat, periwig, tricorne hat, bicorne, top hat,
cape with high Dracula collar, vampire, fantasy villain, armour, cutlass,
pistol, Napoleonic uniform, Victorian dress.

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
In the game this is a 96 × 128 portrait (3 : 4, generate at 768 × 1024),
one picture for every era and nation. The art is
`assets/vignettes/merchant.png` (provenance in
`assets/vignettes/PROVENANCE.md`).

> Vertical half-length portrait of a colonial merchant in his warehouse
> office, around 1640. A plump, prosperous man of about fifty, round ruddy
> face, a broad delighted smile, short greying hair and a trimmed beard,
> bareheaded. He has just risen from his stool and leans slightly forward in
> welcome, arms spread wide, wiping his hands on a stained linen apron tied
> over a plain dark-brown doublet with a flat white linen collar lying over
> the shoulders and rolled white shirtsleeves. His head sits in the upper
> third of the picture and his face is large and clearly lit. Behind him,
> simplified and slightly darker: stacked sugar barrels, bales of tobacco
> wrapped in cloth, a pile of dried cattle hides, sacks of cacao, and a
> large brass balance scale hanging from a beam. In the foreground at the
> bottom edge, a high wooden desk with an open ledger, a quill in an
> inkwell and a small pile of silver coins. A shaft of warm light from a
> high window on the upper left, with dust in the air.
>
> *Scene negatives:* spectacles, glasses, ruff, periwig, wig, cravat, tie,
> tricorne hat, waistcoat with many buttons, paper money, banknotes, modern
> scales, cardboard boxes, labels on barrels, lettering in the ledger,
> full-body view, small distant figure.

**merchant-daughter** · orig. 0x2E `merdaugh` · after trading, 1 chance in
10 (`merchant_daughter.asm`) · *"An attractive young woman enters the
shop. The merchant introduces you to his daughter. She bats her eyes at you
appealingly."* (CSTR 296–300)
The art is `assets/vignettes/merchant-daughter.png`; no fixes were
needed. Her father's refusal keeps the merchant's portrait, and the wedding
after paying his debt uses the wedding picture. Final prompt (after the §2
style block):

> Scene, around 1640: the warehouse office of a colonial merchant, stacked
> sugar barrels, cloth-wrapped tobacco bales and a large brass balance
> scale hanging from a beam, a shaft of warm light from a high window on
> the upper left. On the left, a pretty young woman of about eighteen in a
> simple blue wool bodice laced at the front, a white linen chemise with
> the sleeves rolled up, a long brown skirt, a white apron and a white
> linen coif over her fair hair, comes in through an open wooden door with
> a basket of oranges on her hip and smiles shyly at the captain, lowering
> her eyelashes. In the centre right, the captain [recurring captain, §2]
> turns towards her, hat in hand, surprised and charmed. On the right
> behind a high wooden desk with an open ledger, a quill and an inkwell,
> her father, a plump merchant of about fifty with a round ruddy face,
> greying short hair, a trimmed beard, a stained linen apron over a plain
> dark-brown doublet and a flat white linen collar, beams at them both.
> Mid shot, faces large and clearly lit.

Scene negatives: spectacles, glasses, ruff, periwig, wig, cravat, tie,
tricorne hat, waistcoat with many buttons, paper money, banknotes, modern
scales, cardboard boxes, labels on barrels, lettering in the ledger,
cleavage, ship's wheel.

**shipwright** · orig. 0x06 `swright` · repair, sell ships, sell cannon
(`0x218DA`) · *"The shipwright eyes you suspiciously, then asks your
business… Repairing a ship / Selling a ship / Selling some cannon"*; *"I
pay 50 gold pieces per cannon"* (CSTR 277–284, 313)
In the game this is a 96 × 128 portrait (3 : 4, generate at 768 × 1024),
one picture for every era and nation. The art is
`assets/vignettes/shipwright.png` (provenance in
`assets/vignettes/PROVENANCE.md`); no fixes were needed. The prompt asks
for a ship hauled over on her side for careening; the generator drew her
upright on trestles, with the caulkers on a plank stage. That is accepted:
it is still a beach repair, with no anachronism, and the hull is small at
1×.

> Vertical half-length portrait of a shipwright on a Caribbean beach
> shipyard, around 1640. A burly, broad-shouldered man in his forties,
> completely bald sunburnt head, a short dark beard going grey, thick
> forearms, a sceptical, suspicious look: one eyebrow raised, eyes
> narrowed, sizing up the viewer. He wears a coarse off-white linen shirt
> with the sleeves rolled above the elbow, open at the neck, and a heavy
> scarred leather apron. A long-handled shipwright's adze with a curved
> iron blade rests on his shoulder. His head sits in the upper third of
> the picture and his face is large and clearly lit. Behind him,
> simplified and slightly darker: on a sandy beach, a wooden three-masted
> merchant ship hauled over on her side for careening, her bare masts
> tilted and her weedy hull bottom exposed, with workmen on planks
> hammering tarred oakum into the seams with mallets; black smoke rising
> from an iron tar cauldron over a fire; stacked timber and planks; and in
> the sand in front of the hull a row of old iron cannon barrels lying
> without carriages. Palm trees, a bright blue sky, warm afternoon sun.

Scene negatives: flags, ship's steering wheel, tricorne hats, bicorne
hats, power tools, steel hammers with rubber grips, metal scaffolding,
modern dry dock, steamship, skull and crossbones, full-body view, small
distant figure. Period sources: shipwright's tools including the adze,
[Mary Rose Trust, "Meet the carpenter"](https://maryrose.org/meet-the-carpenter/)
(1545 wreck) and [Ministère de la Culture, corsair wrecks, ship's
tools](https://archeologie.culture.gouv.fr/epaves-corsaires/en/ships-tools);
oakum and pitch in the seams, [a 1691 list of English dockyard terms, as
transcribed on Model Ship World](https://modelshipworld.com/topic/14132-explanation-of-dockyard-terms-circa-1691)
(a forum transcription, not checked against the original). No source was
found for careening practice in the 1640s Caribbean.

### 4.4 The tavern

**tavern** · orig. 0x07 `tavern` · the tavern visit (`tavern_recruit.asm`)
· *"Nothing happens at the tavern."* (CSTR 150)
The art is `assets/vignettes/tavern.png` (provenance in
`assets/vignettes/PROVENANCE.md`). One fix: a scrawled signature on the
floor in the bottom right corner is covered with nearby floor planks
(`patch_fix` in `tools/build_vignette.py`). The ships through the door fly
no flag, so one picture serves every nation. The cask spigots look like
brass taps and the playing cards have modern-looking pips; both are
accepted, too small to read at 1×.

> Wide interior view of a smoky, low-beamed waterfront tavern in a
> Caribbean port, around 1640, at dusk. Heavy dark ceiling beams, rough
> whitewashed walls stained with smoke, a floor of worn wooden planks. On
> the left, a heavy wooden counter with casks stacked on their sides on a
> rack with wooden spigots, grey-and-blue salt-glazed stoneware jugs and
> dark leather drinking jacks on a shelf. In the middle, the focal point:
> four rough sailors around a scarred wooden table playing cards and
> throwing dice, lidded pewter tankards, a few silver coins, one sailor
> smoking a long white clay pipe; they wear loose linen shirts, short
> jackets, wide knee-length sailor's breeches, knitted caps, kerchiefs and
> broad-brimmed felt hats, some barefoot. Beside them a fiddler in a
> stained doublet plays a violin. A green parrot sits on a ceiling beam. A
> carved wooden model of a three-masted galleon with furled sails hangs
> from the ceiling on cords. Horn-paned iron lanterns and tallow candles
> give warm golden light; pipe smoke hangs under the beams. On the right,
> the open wooden door frames a glimpse of the harbour at dusk: an orange
> and violet sky, calm water and the bare masts and yards of two moored
> ships, with no flags. Lively, warm, candlelit.

Scene negatives: glass beer mugs, beer taps, bar stools, labelled glass
bottles, rum bottles, oil lamps, electric light, saloon, tricorne hats,
bicorne hats, ship's steering wheel, skull and crossbones, flags,
signboards with lettering. Period sources: cards, dice, clay pipes and a
violin in a 17th-century tavern, [National Gallery of Art, Van Ostade,
*Tavern Scene*, early 1660s](https://www.nga.gov/artworks/56291-tavern-scene)
and [Royal Collection Trust, Jan Steen, *Interior of a Tavern, with
Cardplayers and a Violin Player*, c. 1665](https://www.rct.uk/collection/405825/interior-of-a-tavern-with-cardplayers-and-a-violin-player);
vessels as for the bartender and barmaid below.

**bartender** · orig. 0x5C `bartenda` · news and gossip about the villain
or your relative (`0x10B19`, `0x1E7F4`, `person_inquiry.asm`) · *"The
tavernkeeper listens with interest as you describe %s."*, *"The Bartender
tells you that…"* (CSTR 125, 154; CSTN 18)
In the game this is a 96 × 128 portrait (3 : 4, generate at 768 × 1024),
one picture for every era and nation. The art is
`assets/vignettes/bartender.png` (provenance in
`assets/vignettes/PROVENANCE.md`); no fixes were needed. The brass cask taps
are accepted: brass spigots are plausible for the period and too small to
read at 1×.

> Vertical half-length portrait of a tavernkeeper in a Caribbean port,
> around 1640, standing behind a heavy, scarred wooden counter. A burly
> man in his fifties, weathered ruddy face, a black leather patch over his
> left eye, a big drooping grey-brown moustache, thinning hair, rough
> stubble. He leans forward over the counter towards the viewer with a
> sly, confiding look, as if sharing a secret. He wears a coarse off-white
> linen shirt with full sleeves rolled above the elbow, an open brown
> leather jerkin, and a long stained linen apron tied at the waist. His
> head sits in the upper third of the picture and his face is large and
> clearly lit. With a linen cloth he dries a lidded pewter tankard. Behind
> him, simplified and slightly darker: wooden casks stacked on their sides
> on a rack with wooden spigots, a shelf of round-bellied grey-and-blue
> salt-glazed stoneware jugs and dark leather drinking jacks, a small
> slate on the wall with a chalked tally of strokes, and tallow candles in
> iron holders giving a warm golden glow. Smoky, low-beamed, candlelit.

Scene negatives: glass beer mugs, beer taps, bar stools, labelled glass
bottles, wine racks of modern bottles, saloon, oil lamps, tricorne hats,
ship's steering wheel, skull and crossbones. The prompt avoids rum bottles:
glass wine bottles of the period are rare in a 1640 tavern picture and
generators draw modern ones, so the drink sits in casks, stoneware jugs and
leather jacks.

**barmaid** · orig. 0x2D `barmaid` · drinks, company, then an informant
(`0x11503`) · *"And what would ye be lookin' for, handsome?"*, *"You've
won the barmaid's heart! She agrees to gather information for you."* (CSTR
301–306)
In the game this is a 96 × 128 portrait (3 : 4, generate at 768 × 1024),
one picture for every era and nation. The art is
`assets/vignettes/barmaid.png` (provenance in
`assets/vignettes/PROVENANCE.md`); no fixes were needed. The source shows
an open shift neckline without the kerchief the prompt asks for, which is
accepted: it is not an anachronism and is barely visible at 1×.

> Vertical half-length portrait of a tavern barmaid in a Caribbean port,
> around 1640. A cheerful young woman in her twenties, sun-warmed face,
> freckles, a broad knowing smile, winking at the viewer. Thick chestnut
> curls escape from a small white linen coif pushed back on her head. She
> wears a white linen shift with full sleeves rolled above the elbow, a
> closely laced bodice of faded terracotta wool sitting at the natural
> waist, a white linen kerchief tucked into the neckline, a red wool skirt
> and a stained linen apron. Her head sits in the upper third of the
> picture and her face is large and clearly lit. In one hand she holds up
> three lidded pewter tankards by their handles, foam spilling over one
> lid; her other hand rests on her hip. Behind her, simplified and slightly
> darker: a smoky, low-beamed tavern room with crowded wooden tables, rough
> sailors drinking, a row of barrels on a rack, a grey-and-blue salt-glazed
> stoneware jug on a shelf, and tallow candles in iron holders giving a
> warm golden glow. Warm, lively, candlelit.

Scene negatives: glass beer mugs, beer taps, bar stools, Bavarian dirndl,
Oktoberfest, corset worn as outerwear, Victorian dress, saloon, oil lamps,
tricorne hats, ship's steering wheel, pinup pose. Period sources: dress,
[Wikipedia, 1600–1650 in Western fashion](https://en.wikipedia.org/wiki/1600%E2%80%931650_in_Western_fashion)
and [FIT Fashion History](https://fashionhistory.fitnyc.edu/?p=6379);
vessels, [London Museum, black jack](https://www.londonmuseum.org.uk/collections/v/object-440161/black-jack/)
and [Pewter Society](https://pewtersociety.org/node/48).

**crew-recruits** · orig. 0x0C `crew` · sailors join your crew in a
tavern, or survivors after a sea battle (`0x10F0C`, `0xE1E2`) · *"Look!
It's that %s sea-dog… A rowdy group of %s men asks to join your crew."*;
*"Captain, %s sailors wish to join our crew."* (CSTR 151, 166, 309)
In the game this is a 224 × 128 landscape (7 : 4, generated at 1659 × 948),
one picture for every era and nation. The art is
`assets/vignettes/crew-recruits.png` (provenance in
`assets/vignettes/PROVENANCE.md`); no fixes were needed. The captain's
D-guard sword hilt, which looks later than 1640, is accepted: it is a few
pixels at 1×. The first brief's tarred pigtails are dropped (their date
is not checked here). The sailors wear loose canvas slops and knitted
caps: knitted Monmouth caps were worn by labourers and sailors in the
16th–18th centuries ([The Historic Dockyard Chatham,
collection, Monmouth cap](https://collection.thedockyard.co.uk/objects/8924));
open-kneed slops and wide petticoat breeches for 17th-century seamen,
[Reconstructing History, "Breeches for Seamen"](https://reconstructinghistory.com/blogs/blog/breeches-for-seamen)
(a reenactors' source, which notes the evidence is thin). The articles
follow the written agreement buccaneer crews drew up before sailing, as
told by Exquemelin, *De Americaensche Zee-rovers*, Amsterdam 1678
([Library of Congress, The Buccaneers of America](https://www.loc.gov/exhibits/exploring-the-early-americas/interactives/buccaneers-of-america/);
[Wikipedia, Pirate code](https://en.wikipedia.org/wiki/Pirate_code)).

> Wide horizontal scene inside a smoky, low-beamed Caribbean port tavern,
> around 1640. On the right, seated at a heavy scarred wooden table, the
> captain, a lean man about thirty, sun-weathered face, dark hair tied back,
> short beard, faded dark-blue coat with brass buttons, red sash, cutlass at
> the hip, tall boots, writes names with a goose quill in a large open
> ledger of ship's articles, an inkpot beside it. On the table: a small heap
> of silver coins and a grey-and-blue salt-glazed stoneware jug. Crowding
> eagerly towards the table from the left, a rowdy group of five common
> sailors, each clearly different: a tall African freedman with a boarding
> axe over his shoulder, bare-chested under an open canvas jacket; a
> grizzled grey-bearded gunner with a powder horn on a cord; a young ship's
> boy with a knife in his belt; a red-faced sailor in a knitted red wool cap
> raising his hand to volunteer; a lean sailor in a broad-brimmed battered
> felt hat. The sailors wear loose linen shirts, short canvas jackets, very
> wide knee-length canvas breeches or loose canvas slops, coloured
> neckerchiefs, knitted wool caps; some are barefoot. Faces large and
> lively, grinning, jostling. Behind them, simplified and slightly darker:
> casks on a rack, tallow candles in iron holders giving a warm golden glow,
> an open doorway showing bright sunlight and a ship's masts in the harbour.

Scene negatives: tarred pigtails, striped sailor shirts, bell-bottom
trousers, tricorne hats, bicorne, periwig, skull and crossbones, black
pirate flag, glass bottles, glass beer mugs, beer taps, bar stools, ship's
steering wheel, parrot, eyepatch on everyone, fantasy pirates.

**traveller-information** · orig. 0x0D `infoman` · a traveller sells
information (`0x1118E`) · *"A traveller from %s offers to sell you
information for %s gold pieces."* (CSTR 152)
In the game this is a 96 × 128 portrait (3 : 4, generate at 768 × 1024),
one picture for every era and nation. The art is
`assets/vignettes/traveller.png` (provenance in
`assets/vignettes/PROVENANCE.md`); no fixes were needed. The captain and his purse
are left out of the portrait so the traveller fills it. The letter's
diagonal folds, close to a modern envelope, are accepted: it reads as a
sealed packet at 1×.

> Vertical half-length portrait of a travelling gentleman in a quiet corner
> of a Caribbean port tavern, around 1640. A man in his forties, lean,
> clever face with sharp watchful eyes, a neat pointed beard and upturned
> moustache, shoulder-length dark hair. He wears a broad-brimmed dark felt
> hat with a plain band, a good but road-dusty doublet of muted green wool
> with a plain falling white linen collar, a heavy brown travelling cloak
> thrown back over one shoulder, and a leather satchel on a strap across his
> chest. His head sits in the upper third of the picture and his face is
> large and clearly lit. Seated at a wooden table, he slides a folded letter
> sealed with red wax across the table towards the viewer with one gloved
> hand, and holds the other hand open, palm up, waiting for payment.
> Discreet, knowing half-smile. Behind him, simplified and slightly darker:
> a dim wooden wall, a single tallow candle in an iron holder giving a warm
> golden glow, a dusty pair of riding boots and a walking staff leaning
> against the wall.

Scene negatives: tricorne hats, bicorne, periwig, top hat, cravat, Victorian
dress, envelope, modern paper, glass beer mugs, oil lamps, ship's steering
wheel.

**map-seller** · orig. 0x0E `mapman` · a scruffy pirate sells a piece of
a treasure map (`0x112F5`, `treasure_maps.asm`) · *"In a dark corner of
the tavern, a scruffy pirate offers to sell you part of an old treasure
map for 500 gold pieces."* (CSTR 153)
In the game this is a 96 × 128 portrait (3 : 4, generate at 768 × 1024),
one picture for every era and nation. The art is
`assets/vignettes/map-seller.png` (provenance in
`assets/vignettes/PROVENANCE.md`); no fixes were needed. The captain's hand is left
out of the portrait so the seller fills it.

> Vertical half-length portrait of an old pirate in a dark corner booth of a
> Caribbean port tavern, around 1640, lit by one guttering tallow candle on
> the table. A scrawny, toothless old sea-dog in his sixties, leathery
> wrinkled face, a wide gap-toothed conspiratorial grin, a stubbly white
> beard, one eye half-closed in a wink, a filthy faded red cloth knotted
> over his head, a small gold ring in one ear. He wears a ragged, stained
> linen shirt and a patched, sleeveless canvas jerkin; a wooden peg leg
> sticks out from under the table. His head sits in the upper third of the
> picture and his face is large and clearly lit from below by the candle.
> With both gnarled hands he holds up towards the viewer a torn, yellowed,
> ragged-edged scrap of old parchment map with a hand-drawn coastline in
> brown ink and a bold ink cross on it. Behind him, simplified and very
> dark: the shadowy wooden wall of the booth, a grey stoneware jug, cobwebs.
> Secretive, shady, candlelit with deep shadows.

Scene negatives: skull and crossbones, black pirate flag, tricorne hat,
bicorne, parrot, hook hand, readable writing on the map, modern map, glass
bottle, rum bottle, oil lamp, ship's steering wheel, cartoon pirate.

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
The art is `assets/vignettes/divide-plunder.png` (provenance in
`assets/vignettes/PROVENANCE.md`); no fixes were needed. The first brief's
abacus is dropped: a bead abacus is not a European tool of the period,
where clerks reckoned in writing or with counters on a counting board. The
coins are irregular hand-cut "cobs", as Spanish colonial mints struck them.
The ship seen through the window flies no flag, so one picture serves
every era and nation.

> Wide interior view of a whitewashed colonial counting house in a
> Caribbean port, around 1640, with a heavy beamed ceiling and thick stone
> walls. Shafts of warm afternoon sunlight fall through two tall windows
> with wooden bars and open wooden shutters on the left. In the centre, a
> long, scarred wooden table runs from the foreground into the room. On
> it: an open iron-bound wooden chest spilling coins; piles of irregular,
> roughly cut silver coins with uneven edges, stacked in short columns; a
> smaller heap of irregular gold coins; a few pearl strings and a gold
> chain; a brass balance scale with two hanging pans; an open leather-
> bound ledger. A thin, bald clerk in a plain black doublet with a small
> flat white linen collar, round spectacles on his nose, sits at the table
> writing in the ledger with a goose quill and an ink pot. At the head of
> the table, standing, the captain oversees the count: a lean man about
> thirty, sun-weathered face, dark hair tied back, short beard, faded
> dark-blue coat with brass buttons, red sash, cutlass at the hip, tall
> boots, one hand resting on the lid of the chest. On the right, a line of
> rough buccaneer crewmen waits for their share, eager and grinning: loose
> off-white linen shirts, wide canvas breeches, knitted woollen caps,
> broad-brimmed felt hats and kerchiefs, one with a bandaged arm in a
> sling, one holding out his open palm while the quartermaster, a burly
> bearded man in a buff leather jerkin, counts coins into it. Dust motes
> glitter in the light; the back of the room fades into warm shadow with
> stacked casks and sacks.

Scene negatives: abacus, bead abacus, round machine-struck modern coins, banknotes, paper
money, tricorne hat, bicorne hat, periwig, naval uniform, epaulettes,
skull and crossbones, black flag, flags, parrot, eyepatch, striped
shirt, ship's wheel, glass display cases, electric light. Period sources: shares and
the oath not to hide plunder in Exquemelin, *The Buccaneers of America*
(1678; [Project Gutenberg](https://www.gutenberg.org/ebooks/26690)); cob
coins, [American Numismatic Society, *Europe in Transformation: The 17th
Century*](https://numismatics.org/europe-in-transformation-the-17th-century/);
counting boards and jetons, [mernick.org.uk, *Jettons or Reckoning
Counters*](https://www.mernick.org.uk/jettons.htm).

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
In the game this is a 96 × 128 portrait (3 : 4, generate at 768 × 1024),
one picture for every era and nation. The art is
`assets/vignettes/sailing-master.png` (provenance in
`assets/vignettes/PROVENANCE.md`); no fixes were needed. The prompt drops
the first brief's wheel (steering wheels date from the early 1700s), grey
queue and clay pipe (not confirmed for the 1560 era). The prompt's
"around 1640" is mid-range: the one picture serves every era. Sources are
in the provenance.

> Vertical half-length portrait of a ship's sailing master on the open
> upper deck of a 17th-century sailing ship at sea, around 1640. A stocky,
> weather-beaten seaman in his fifties, deeply tanned and lined face,
> shrewd narrowed eyes, a short grizzled grey beard, long grey hair falling
> to his collar from under a knitted brown woollen sailor's cap rolled at
> the brim. He wears a coarse off-white linen shirt open at the neck, a
> short, close-fitting dark brown wool jacket with a row of small pewter
> buttons, and wide, loose canvas breeches; a plain leather belt with a
> sheathed knife. His head sits in the upper third of the picture and his
> face is large and clearly lit. He turns towards the viewer as if taking
> the captain aside with a word of warning, one hand raised half-way, the
> other holding a pair of brass navigator's dividers over a rolled
> parchment sea chart tucked under his arm. Behind him, simplified and
> slightly hazy: the ship's wooden rail and tarred shrouds with ratlines, a
> billowing off-white square sail, a few sullen sailors in plain shirts and
> knitted caps idling by the mainmast at the waist of the ship, and the
> open blue-green sea under a pale sky with cumulus clouds.

Scene negatives: ship's steering wheel, wheel, tricorne hat, bicorne hat,
pigtail, queue, telescope, spyglass, epaulettes, naval uniform, striped
shirt, eyepatch, parrot, skull and crossbones, flags.

### 4.6 At sea

**sail-ho** · orig. 0x08 `sail-ho` · an encounter is sighted
(`encounter_generate.asm`) · *"Sail ho! The lookout reports a sail on the
horizon… Investigate? / Continue our voyage?"* (CSTR 118, 120–122)
The art is `assets/vignettes/sail-ho.png` (provenance in
`assets/vignettes/PROVENANCE.md`), centre-cropped from a 3 : 2 source; no
fixes were needed. The generated picture leaves the lookout out of frame
(accepted). The prompt avoids a spyglass (first recorded 1608)
and a barrel crow's nest (1807), so one picture serves every era and
nation.

> Wide view along the deck of a 17th-century three-masted sailing ship at
> sea, bright morning light, seen from deck level. On the left, the lower
> mast rises from the deck, tall and plain, and goes out of the top of the
> picture; tarred shrouds with rope ratlines run from the ship's side up
> along it, converging high above. At the very top-left corner of the
> picture, far above the deck, where the lower mast ends and a thinner
> topmast continues upward, a small open wooden platform rests on
> crosstrees, with short ropes running from its rim down to the shrouds; on
> it, small with distance, a barefoot sailor in a loose linen shirt and knee
> breeches leans out against the sky, one arm stretched far forward,
> pointing to the right. The platform is high up, about two thirds of the
> way up the mast, much higher than the sails' lower edges. On the right, far away
> on a bright pale horizon, a single tiny distant ship: a small pale square
> of sails above a thin dark hull, no flag visible. In the middle ground on
> the deck, below and to the right of the mast, stands the captain, a lean
> man about thirty, sun-weathered face, dark hair tied back, short beard,
> faded dark-blue coat with brass buttons, red sash, cutlass at the hip,
> tall boots; he shades his eyes with one flat hand and stares toward the
> distant sail. Behind him, two or three sailors pause at the rail with
> ropes in their hands and look the same way. A curved wooden bulwark rail
> with belaying pins along the lower edge of the picture. Deep blue swell
> with white wave crests, wind-whipped white clouds, the foot of a
> billowing off-white square sail at the top edge of the picture.
>
> *Scene negatives:* telescope, spyglass, binoculars, barrel crow's nest,
> ship's steering wheel, tricorne hat, bicorne hat, flag on the distant
> ship, skull and crossbones, black flag, red and yellow striped flag,
> tricolour flag, steamship, lighthouse, low platform near the deck,
> balcony railing, balustrade, turned wooden column, platform at head
> height.

**sail-nearer** · no slot of its own in our table (the original's ship
portraits `0x3A`–`0x42`, §4.12, are the nearest match) · the sail draws
nearer: *"She looks like %s, captain. Investigate? / Sail away?"* (CSTR
120; `encounters.md` §2 step 5) · the lookout can make out her type but
not yet her colours.
The art is one picture per ship type and period,
`assets/vignettes/ships/<key>.png` (provenance in
`assets/vignettes/PROVENANCE.md`), picked by `sightedShipArt` in
`src/vignettes.mjs`. The six eras fall into three bands, `early`
(1560–1600), `mid` (1620–1640) and `late` (1660–1680), each with only the
types its encounter tables hold; the barque (every era) and the sloop
(1640 on) have one picture each. Before 1660 the frigate is drawn as the
original's "fast galleon" (`encounters.md` §2 step 4), a long, low,
race-built galleon; from 1660 as a true frigate. The ship flies no flags
at all, so the colours stay for the next step, "She's flying %s colors"
(CSTR 122), with its own picture, sail-colours. The pictures share one frame and one
prompt; only the ship changes.

> Seen from the deck of our own ship in open Caribbean water at midday. In
> the lower left corner only, a short piece of our own ship's weathered
> wooden rail and two tarred shrouds with ratlines rising out of the
> picture; no people. The rest of the picture is open sea and sky: a deep
> blue swell flecked with small whitecaps, a pale blue sky with a few
> white cumulus clouds, no land. At middle distance, in the centre and
> right of the picture, one single ship under sail, seen from her side and
> slightly from astern (three-quarter broadside view), heeling a little to
> the wind, every sail full and pale cream with darker seams, a white bow
> wave. The whole ship, from the waterline to the mast tops, is inside the
> picture, about half the picture's width, sharp and clearly drawn against
> the sky, so that her hull shape, her masts and her sails can be read at
> a glance. Too far away to see any people on board. She flies no flags at
> all: bare mastheads, no ensign, no pennants, no streamers, no banners.
>
> The ship: *see the table.*

Shared negatives (after the §2 list): flags, ensign, pennants, streamers,
banners, coat of arms on the sails, painted crosses on the sails, skull
and crossbones, black flag, ship's steering wheel, people in the
foreground, telescope, second ship, land, island, fort, steamship, modern
yacht, Bermuda rig.

| key | the ship | extra negatives |
|---|---|---|
| `barque` | A small two-masted coasting bark, like a small caravel: a short, beamy, single-decked wooden hull with a raised poop deck at the stern, a low bow and a short stubby bowsprit; two masts, the foremast taller, each carrying one large triangular lateen sail on a long slanting yard; two small gunports on the side. A small ship, much smaller than a galleon. | square sails, gaff sail, jib, three masts |
| `sloop` | A small single-masted sloop of the later 17th century: a low, narrow, single-decked wooden hull with a low rail and a small square stern; one tall mast raked slightly back carrying a very large fore-and-aft gaff mainsail with a boom, and one large triangular headsail set to a long bowsprit; four small gunports and a row of small oar ports. A small, fast ship, much smaller than a galleon. | square sails, lateen sail, two masts, three masts, Bermuda rig, triangular mainsail |
| `early-pinnace` | A small, light pinnace of the late 16th century: a slim, low, single-decked wooden hull, a square stern with a small low poop, hardly any forecastle, a short pointed beak at the bow; two masts, each with a square course and a small square topsail, and a small square spritsail under the bowsprit; four small gunports and a row of small oar ports for sweeps. A small ship, much smaller than a galleon. | lateen sail, gaff sail, three masts, high castles |
| `early-fluyt` | An early Dutch fluyt merchant ship of about 1600: a long wooden hull with a strongly rounded, pear-shaped section, the sides bulging at the waterline and curving far inward above it to a narrow upper deck; a tall, narrow, rounded stern topped by a small high flat transom; a low bow with a small beakhead; only two small gunports; three tall masts with square courses and topsails on the fore and main masts, one triangular lateen sail on the short mizzen mast, a square spritsail under the bowsprit. | rows of gunports, high forecastle, ornate gilded carvings, four masts |
| `early-merchantman` | An armed merchant ship of the late 16th century: a deep, full-bodied, high-sided three-masted wooden hull, deep laden, with a raised forecastle at the bow and a tall stern castle with a flat square transom; plain dark tarred and ochre planking; a single row of six gunports; square courses and topsails on the fore and main masts, one triangular lateen sail on the mizzen mast, a square spritsail under the bowsprit. | two rows of gunports, gilded carvings, four masts |
| `early-fastgalleon` | A fast, low, race-built galleon of the 1580s: a long, low, narrow wooden hull with a low forecastle and a modest stern castle, a long projecting beakhead at the bow, a single long row of ten gunports; four masts: square courses and topsails on the fore and main masts, and two shorter masts aft, the mizzen and a smaller bonaventure mizzen, each with one triangular lateen sail; a square spritsail under the bowsprit. Sleek and fast-looking. | high towering castles, two rows of gunports, painted geometric patterns |
| `early-galleon` | A great Spanish treasure galleon of the late 16th century, very large, broad and heavy, riding deep in the water: a towering stern castle several decks high with carved and gilded galleries, a high forecastle, a long low beakhead; a few gunports; four masts: square courses and topsails on the fore and main masts, the mizzen and a smaller bonaventure mizzen each with one triangular lateen sail; a square spritsail under the bowsprit. Massive and stately. | sleek low hull, painted geometric patterns |
| `early-wargalleon` | A heavily armed war galleon of the late 16th century: a big, long wooden hull with two full rows of gunports and bronze cannon muzzles showing, a high forecastle and stern castle, a long beakhead; four masts: square courses, topsails and small topgallant sails on the fore and main masts, the mizzen and a smaller bonaventure mizzen each with one triangular lateen sail; a square spritsail under the bowsprit. Powerful and warlike. | painted geometric patterns |
| `mid-pinnace` | A small, light pinnace of the 1620s to 1640s: a slim, low, single-decked wooden hull, a square stern with a small flat transom, a low forecastle, a short beakhead; two masts, each with a square course and a square topsail, and a square spritsail under the bowsprit; four small gunports and a row of small oar ports for sweeps. A small ship, much smaller than a galleon. | lateen sail, gaff sail, three masts, high castles |
| `mid-fluyt` | A Dutch fluyt merchant ship of the 1620s to 1640s: a long wooden hull with a strongly rounded, pear-shaped section, the sides bulging at the waterline and curving far inward above it to a narrow upper deck; a tall, narrow, rounded stern topped by a small high flat transom with a little carving; a low bow with a small beakhead; only two small gunports; three very tall masts with square courses and topsails, small topgallant sails on the fore and main masts, a triangular lateen sail on the short mizzen mast, a square spritsail under the bowsprit and a small square sprit-topsail on a little mast at the end of the bowsprit. | rows of gunports, high forecastle, ornate gilded carvings, four masts |
| `mid-merchantman` | An armed merchant ship of the 1620s to 1640s: a full-bodied, deep-laden three-masted wooden hull with a low forecastle and a tall stern with a flat square transom and a small enclosed quarter gallery; plain dark tarred and ochre planking; a single row of eight gunports; square courses and topsails on the fore and main masts, a triangular lateen sail with a small square topsail above it on the mizzen mast, a square spritsail under the bowsprit and a small square sprit-topsail on a little mast at the end of the bowsprit. | two rows of gunports, gilded carvings, four masts |
| `mid-fastgalleon` | A fast, low galleon-frigate of the 1630s: a long, low, sleek wooden hull with an almost flush deck, a very low forecastle and a low poop, a sharp fine bow with a small beakhead, a single row of ten gunports; three tall masts with square courses, topsails and topgallant sails on the fore and main masts, a triangular lateen sail with a small square topsail above it on the mizzen, a square spritsail under the bowsprit and a small square sprit-topsail on a little mast at the end of the bowsprit. Sleek, fast and predatory. | high towering castles, two rows of gunports, four masts |
| `mid-galleon` | A great Spanish treasure galleon of the 1620s to 1640s, very large, broad and heavy, riding deep in the water: a towering, richly carved and gilded stern with open galleries and quarter galleries, a high forecastle, a long beakhead; one row of gunports with a few more above; three masts with square courses, topsails and topgallant sails on the fore and main masts, a triangular lateen sail with a small square topsail above it on the mizzen, a square spritsail under the bowsprit and a small square sprit-topsail on a little mast at the end of the bowsprit. Massive and stately. | sleek low hull, four masts |
| `mid-wargalleon` | A great warship of the 1620s to 1640s: a long, tall wooden hull with two full tiers of gunports, the port lids painted red and open, cannon muzzles out; a high, richly carved and gilded stern, a low forecastle, a long beakhead with a carved figurehead; three masts with square courses, topsails and topgallant sails on the fore and main masts, a triangular lateen sail with a small square topsail above it on the mizzen, a square spritsail under the bowsprit and a small square sprit-topsail on a little mast at the end of the bowsprit. Powerful and warlike. | four masts, painted geometric patterns |
| `late-pinnace` | A small, light pinnace of the 1660s: a slim, low, single-decked wooden hull, a square stern with a small carved flat transom, almost no forecastle, a short beakhead; two masts, each with a square course and a square topsail, and a square spritsail under the bowsprit; four small gunports and a row of small oar ports for sweeps. A small ship, much smaller than a galleon. | lateen sail, gaff sail, three masts, high castles |
| `late-fluyt` | A Dutch fluyt merchant ship of the 1670s: a long wooden hull with a strongly rounded, pear-shaped section, the sides bulging at the waterline and curving far inward above it to a narrow upper deck; a tall, narrow, rounded stern topped by a small high flat transom with a carved panel; a low bow with a small beakhead; only two small gunports; three very tall masts with square courses, topsails and topgallant sails on the fore and main masts, a triangular lateen sail with a small square topsail above it on the short mizzen mast, a square spritsail under the bowsprit and a small square sprit-topsail on a little mast at the end of the bowsprit. | rows of gunports, high forecastle, ornate gilded carvings, four masts |
| `late-merchantman` | An armed merchant ship of the 1670s: a long, full-bodied wooden hull with an almost flush upper deck, a low forecastle and a moderately high square stern with a carved transom and quarter galleries; plain dark tarred and ochre planking with a yellow ochre band; a single row of ten gunports; three masts with square courses, topsails and topgallant sails on the fore and main masts, a triangular lateen sail with a square topsail above it on the mizzen, a square spritsail under the bowsprit and a small square sprit-topsail on a little mast at the end of the bowsprit. | two rows of gunports, high castles, four masts |
| `late-frigate` | A fast frigate of the 1670s: a long, low, sleek wooden hull with a single continuous gun deck and a long row of twelve open gunports, a small raised quarterdeck aft, no raised forecastle castle, a sharp fine bow with a small beakhead and a carved figurehead, a square stern with a modest carved transom; three tall masts with square courses, topsails and topgallant sails on the fore and main masts, a triangular lateen sail with a square topsail above it on the mizzen, a square spritsail under the bowsprit and a small square sprit-topsail on a little mast at the end of the bowsprit. Sleek, fast and predatory. | high castles, two rows of gunports, four masts |
| `late-galleon` | A great Spanish treasure galleon of the 1660s to 1680s, very large, broad and heavy, riding deep in the water: a tall, high square stern richly carved and gilded with open galleries and quarter galleries, a modest forecastle, a long beakhead; two rows of gunports; three masts with square courses, topsails and topgallant sails on the fore and main masts, a triangular lateen sail with a square topsail above it on the mizzen, a square spritsail under the bowsprit and a small square sprit-topsail on a little mast at the end of the bowsprit. Massive and stately. | sleek low hull, four masts |
| `late-wargalleon` | A large two-decked warship of the 1660s: a long, tall wooden hull with two full tiers of gunports, the port lids painted red and open, cannon muzzles out; a low forecastle, a stepped stern with a carved and gilded transom and quarter galleries, a long beakhead with a carved figurehead; three masts with square courses, topsails and topgallant sails on the fore and main masts, a triangular lateen sail with a square topsail above it on the mizzen, a square spritsail under the bowsprit and a small square sprit-topsail on a little mast at the end of the bowsprit. Powerful and warlike. | four masts, high towering castles |

**sail-colours** · the original's flag pictures over a spyglass view
(`baseflag`, `f-span`, `f-engl`, `f-french`, `f-dutch`, `fjolly01`–`20`;
not used) · the lookout reads her colours: *"She's flying %s colors …
Close for battle? / Hail for news? / Sail away?"* (CSTR 122), or the named
pirate or pirate hunter who gives chase (CSTR 121).
The art is `assets/vignettes/colours/` (provenance in
`assets/vignettes/PROVENANCE.md`): a close view of her stern, one per
period band (`stern-early` 1560–1600, `stern-mid` 1620–1640,
`stern-late` 1660–1680) and `stern-small` for the pinnace, barque and
sloop of any era, each generated with one plain white flag. The game paints
the flag onto it (`composeColours` in `src/vignettes.mjs`) from a sheet of
flat flags (`flags.png`) and a map of the cloth that
`tools/build_colours.py` measures on the source, so one picture serves
every nation, era and pirate. The spyglass circle is not used: a telescope
is anachronistic before 1608.

Which flag (`colourFlag`): the nation, the era and, where the sources
differ, the ship's role (kind 6 and up: escorts, pirate hunters and
warships, "navy"):

| nation | flag | sources |
|---|---|---|
| Spain | the Cross of Burgundy (red ragged saltire on white); in 1680, navy ships fly white with the crowned royal arms | FOTW es_brgdy (ensign to the 1670s, then jack to 1785), es1701 (Charles II's royal arms ensign, 1670s) |
| England | 1560–1600: St George's cross; from 1620: the red ensign with St George's canton | Wikipedia "Red Ensign" (canton by 1620, merchants confirmed 1674) |
| France | merchants, and every ship before 1640: a white cross on blue; from 1640, navy: plain white | Wikipedia "French ensigns" (1661 ordinance); white cross on blue on Champlain's 1612 map; FOTW cites a white ensign "1638–1790" |
| Holland | 1600–1640: the Prince's flag (orange, white, blue); from 1660: red, white, blue. None in 1560: the encounter tables hold no Dutch ship before the Revolt | Wikipedia "Flag of the Netherlands" (navy 1588–1630 orange, both 1630–1662, red from 1663) |
| pirate | an unnamed pirate: a plain red flag (the "bloody flag", no quarter); a named pirate: his own colours | buccaneers' "bloody flag" reported in 1681 (secondary sources); skull and crossbones only from about 1700 |

Named pirates: the original ties its twenty pirate flags to captains'
names (the copy-protection question "Can you tell by his flag what his
name is?", CSTR 310; a flag picture per nation and name row, table
`0x32F90` read at `0xD78B`). Ours are new designs, one per surname
(`pirate-<nation × 8 + surname>`, 32 in all, of which the hunters' rows
0–4 and the mission pirates' Spanish and English rows 0–7 occur): red
fields with a bold white, gold or black emblem (cutlass, crossed cutlasses,
hourglass, arm and sword, heart, crown, star, crescent, anchor, lightning,
axe, coins, key, sun, grenade, trident, arrow, fish, dice, flames, chain,
dagger, bell, ship), some with a border or a black band. No skulls or
bones: those flags date from about 1700, after the game's eras. A pirate
hunter (a navy captain who chases you) flies his nation's navy flag. The
family quest's villains are never met at sea, so they have no flag. Check
every flag with `?preview=colours`, an encounter with `sail-colours` and a
named pirate with `sail-colours-pirate`.

> Seen from our own ship, close behind and slightly to one side of another
> ship sailing away from us across a deep blue swell flecked with
> whitecaps, at midday. Her stern fills the lower right two thirds of the
> picture: *<the stern, see the table>* From a tall wooden flagstaff
> rising straight up from the top of her stern, a single very large flag
> streams out to the left in a steady wind, held almost flat with only two
> or three soft, gentle folds, seen nearly face-on; the flag is one plain,
> pure white rectangle of cloth with no marks, no emblem, no cross, no
> stripes and no border, and it fills most of the upper left part of the
> picture, clear and sharp against an empty, cloudless clear blue sky.
> Beyond the stern, the lower parts of her masts, rigging and full pale
> cream sails. No people visible, no other flags, no pennants, no other
> ships, no land.

| key | the stern |
|---|---|
| `stern-early` | the high, narrow, square stern castle of a large late 16th-century ship: flat planked transom of dark tarred wood with ochre bands, a small open gallery with turned balusters, a few small square stern windows, two stern gunports, the long tiller port, a large carved wooden stern lantern on top. Not gilded. |
| `stern-mid` | the tall, flat-transomed stern of a large ship of the 1630s: dark wood with a carved and modestly gilded upper transom, two rows of leaded stern windows, an open stern gallery with a balustrade, small enclosed quarter galleries at the corners, two stern gunports below, three carved stern lanterns on top. |
| `stern-late` | the broad, high, richly carved stern of a large ship of the 1670s: two tiers of glazed stern windows with an open gallery, enclosed quarter galleries at the corners, a carved and gilded upper counter with scrollwork and carved figures (no coat of arms), dark blue-green painted panels, two stern gunports, three large gilded stern lanterns on top. |
| `stern-small` | the small, low, plain square transom stern of a small single-decked coasting vessel: weathered planking, a narrow rail, the rudder head and tiller, a small carved name board with no letters, one small stern window. No lanterns, no gilding. |

Negatives: the §2 list, plus coat of arms, emblem on the flag, cross on
the flag, stripes on the flag, coloured flag, second flag, pennant,
streamer, skull and crossbones, black flag, clouds behind the flag,
people, ship's steering wheel, telescope, land, steamship.

**boarding** · orig. 0x11 `boarding` · the two ships meet before the
boarding fight (`boarding.asm`) · *"The two ships crash together. Through
the smoke, you spot %s approaching."* (CSTR 171)
> Two wooden ships grinding hull to hull, with grappling lines taut, smoke
> from cannon fire, and the captain's men swinging across on ropes with
> cutlasses and pistols. Through the smoke on the enemy deck, the enemy
> captain draws his sword.

In the game this is a 224 × 128 landscape (7 : 4, generate at 1792 ×
1024), one picture for every era and nation: no flag is readable, so it
serves every enemy. The art is `assets/vignettes/boarding.png` (provenance
in `assets/vignettes/PROVENANCE.md`); no fixes were needed. Final prompt:

> Wide landscape panel, around 1640, mid-battle. Two wooden sailing warships
> of the 17th century grind together hull to hull in a heaving blue-grey
> sea, their rigging tangled, grappling hooks and taut lines between their
> rails, thick white and grey gunsmoke drifting across both decks and hiding
> their upper masts. In the foreground the captain's men, buccaneers in
> linen shirts and knitted caps with cutlasses, boarding axes and pistols,
> swing across on ropes and leap over the rail, led by the captain, a lean
> man about thirty, sun-weathered face, dark hair tied back, short beard,
> faded dark-blue coat with brass buttons, red sash, cutlass at the hip,
> tall boots, cutlass raised. On the enemy deck beyond, through a gap in the
> smoke, the enemy captain in a dark coat and broad-brimmed plumed hat draws
> his rapier among his sailors with pikes. Flashes of musket fire,
> splintered wood.

Scene negatives: tricorne hats, bicorne, periwig, skull and crossbones,
black pirate flag, ship's steering wheel, parrot, hook hand, cartoon
pirate, flags, ensigns, banners, pennants, red and yellow striped flag,
tricolour flag, union jack, cannon on wheels on the open top deck, modern
weapons.

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

In the game variant A is `sinking` (your ship) and variant B is
`enemy-destroyed`, each a 224 × 128 landscape (7 : 4, generate at 1792 ×
1024) for every era and nation, with no readable flag. The art is
`assets/vignettes/sinking.png` and `enemy-destroyed.png` (provenance in
`assets/vignettes/PROVENANCE.md`); no fixes were needed. Final prompts:

*Variant A (sinking):*

> Wide landscape panel, around 1640, a grey stormy afternoon. A shattered
> three-masted wooden ship of the 17th century settles by the stern in a
> heavy grey-green sea: her stern already under water, her bow lifting, her
> masts leaning and broken, torn sails and rigging trailing in the waves,
> cannon holes in her side. Sailors in linen shirts leap from the rail into
> the water; others cling to floating spars, barrels and planks. In the
> foreground a crowded ship's boat pulls away with oarsmen rowing hard, the
> captain, a lean man about thirty, sun-weathered face, dark hair tied back,
> short beard, faded dark-blue coat with brass buttons, red sash, cutlass at
> the hip, tall boots, standing in its stern looking back at his sinking
> ship in grief. Spray, low dark clouds.

Scene negatives: tricorne hats, bicorne, periwig, skull and crossbones,
black pirate flag, ship's steering wheel, parrot, hook hand, cartoon
pirate, flags, ensigns, banners, pennants, red and yellow striped flag,
tricolour flag, union jack, lifebuoys, life jackets, steamship, modern
lifeboat.

*Variant B (enemy-destroyed):*

> Wide landscape panel, around 1640, at dusk over a dark sea. In the middle
> distance a three-masted wooden warship of the 17th century blows up as the
> fire reaches her powder magazine: a huge orange and yellow fireball
> bursting from her waist, black smoke rolling up, masts and spars and
> burning planks flying through the air, debris splashing into the glowing
> water. In the foreground, the dark silhouette of the captain's own ship
> seen from behind her rail, her rigging and a few sailors black against the
> blaze, shielding their faces. The sky is deep violet and orange.

Scene negatives: tricorne hats, bicorne, periwig, skull and crossbones,
black pirate flag, ship's steering wheel, parrot, hook hand, cartoon
pirate, flags, ensigns, banners, pennants, red and yellow striped flag,
tricolour flag, union jack, modern explosion, mushroom cloud, steamship.

**outrun** · orig. 0x75 `outrun` · one ship gets out of range
(`0xE79A`) · *"Your ship sails out of range of the enemy; the battle is
over."*, *"Using full sails and skillful seamanship, the enemy vessel
pulls out of range."* (CSTR 197–198)
> A wide seascape: a small, fast ship under every stitch of canvas heels in a
> stiff breeze, leaving a white wake. Far behind, a heavier warship fires a
> last useless shot, and the splash falls short.

In the game this is a 224 × 128 landscape (7 : 4, generate at 1792 ×
1024), one picture for every era and nation: no flag is readable, so it
serves every enemy. The art is `assets/vignettes/outrun.png` (provenance
in `assets/vignettes/PROVENANCE.md`); no fixes were needed. Final prompt:

> Wide landscape panel, around 1640, a bright windy day with whitecaps. A
> wide seascape: in the foreground a small, fast two-masted 17th-century
> sailing ship under every stitch of square sail heels hard in a stiff
> breeze, leaving a long white wake, spray at her bow. Far behind, on the
> horizon, a heavier three-masted warship fires a last cannon shot with a
> puff of white smoke from her bow, and the splash of the ball falls short
> in the sea well behind the small ship's stern. Blue sky with fast clouds.

Scene negatives: tricorne hats, bicorne, periwig, skull and crossbones,
black pirate flag, ship's steering wheel, parrot, hook hand, cartoon
pirate, flags, ensigns, banners, pennants, red and yellow striped flag,
tricolour flag, union jack, steamship, ship's steering wheel.

**nightfall** · orig. 0x74 `night` · the sun sets and ends a long chase
(`0xE88E`) · *"After a long chase, the sun sets, ending the battle."* (CSTR
169, 317)
> A dark-blue night sea under a sliver of moon and the first stars: two
> distant ship silhouettes with a single stern lantern each slip apart. The
> last red glow of sunset is on the horizon.

In the game this is a 224 × 128 landscape (7 : 4, generate at 1792 ×
1024), one picture for every era and nation: no flag is readable, so it
serves every enemy. The art is `assets/vignettes/nightfall.png`
(provenance in `assets/vignettes/PROVENANCE.md`); no fixes were needed.
Final prompt:

> Wide landscape panel, around 1640, just after sunset. Seen from the open
> sea, with no land and no people anywhere in view: a calm dark-blue night
> sea filling the whole lower half of the picture under a thin crescent moon
> and the first stars, the last deep red glow of sunset along the horizon.
> Two distant 17th-century sailing ships, dark silhouettes with sails set,
> slip away from each other in opposite directions, each with a single warm
> yellow stern lantern lit, its reflection trembling on the water. Quiet,
> the battle over. Only sea, sky and the two distant ships.

Scene negatives: land, shore, island, coast, palm trees, rocks, foreground
figures, people, tricorne hats, bicorne, periwig, skull and crossbones,
black pirate flag, ship's steering wheel, parrot, hook hand, cartoon
pirate, flags, ensigns, banners, pennants, red and yellow striped flag,
tricolour flag, union jack, steamship, lighthouse, modern lights, city
lights.

**hostage-talks** · orig. 0x23 `hostage` · a captured captain or
nobleman offers information or a ransom (`0xDE6A`) · *"I have information
which may be of value to you… the treasure fleet? the silver train? Hold him
for ransom?"* (CSTR 136, 165)
> The captain's stern cabin: a captured enemy captain in a fine but torn
> coat, hands bound, sits across a table from the captain under a swaying
> lantern. He leans forward, offering a secret. Charts and a pistol lie on
> the table.

In the game this is a 224 × 128 landscape (7 : 4, generate at 1792 ×
1024), one picture for every era and nation: no flag is readable, so it
serves every enemy. The art is `assets/vignettes/hostage-talks.png`
(provenance in `assets/vignettes/PROVENANCE.md`); no fixes were needed.
Final prompt:

> Wide landscape panel, around 1640, night. Inside the low wooden stern
> cabin of a 17th-century ship, lit by one brass lantern swaying from a
> beam, with the leaded stern windows dark behind. At a heavy oak table, a
> captured enemy captain in a fine but torn and stained dark red coat with a
> ruined lace collar, his wrists bound with rope, sits forward and leans
> across the table, eyes narrowed, offering a secret in a low voice. Across
> the table, the captain, a lean man about thirty, sun-weathered face, dark
> hair tied back, short beard, faded dark-blue coat with brass buttons, red
> sash, cutlass at the hip, tall boots, sits back in a chair, arms folded,
> listening with suspicion. On the table: an unrolled sea chart held flat by
> a flintlock pistol, a pair of brass dividers, a pewter cup and a candle.
> Warm lamplight, deep shadows.

Scene negatives: tricorne hats, bicorne, periwig, skull and crossbones,
black pirate flag, ship's steering wheel, parrot, hook hand, cartoon
pirate, flags, ensigns, banners, pennants, red and yellow striped flag,
tricolour flag, union jack, ship's steering wheel, glass oil lamp,
readable writing on the chart, modern furniture.

**prize-plunder** · orig. 0x0F `plunder` · plundering a captured ship,
and the loot of a captured town (`0xDC14`, `0x22673`, `0xAE64`,
`0x1F64C`) · *"Captain, we've captured a %s ton %s with %s guns… Keep
her? / Plunder and sink her"*, *"Your crew begins to round up gold and
valuables."* (CSTR 164, 193)
> On a captured deck, crewmen haul up chests, sacks of coin and silks from
> the hold through an open hatch. One holds up a jewelled cross and another
> rolls a cask. The captain counts with a quartermaster, and the beaten enemy
> crew sits under guard.

In the game this is a 224 × 128 landscape (7 : 4, generate at 1792 ×
1024), one picture for every era and nation: no flag is readable, so it
serves every enemy. The art is `assets/vignettes/prize-plunder.png`
(provenance in `assets/vignettes/PROVENANCE.md`); no fixes were needed.
Final prompt:

> Wide landscape panel, around 1640, bright afternoon. On the main deck of a
> captured merchant ship, her flag already struck and no colours flying, the
> captain's buccaneers in linen shirts, knitted caps and head-scarves haul
> treasure up through an open square hatch from the hold with a rope: an
> iron-bound chest, leather sacks of coin and bolts of bright silk. One
> grinning man holds up a jewelled gold cross; another rolls a wine cask
> across the planks. By the mast, the captain, a lean man about thirty,
> sun-weathered face, dark hair tied back, short beard, faded dark-blue coat
> with brass buttons, red sash, cutlass at the hip, tall boots, counts coins
> into a ledger with a grizzled quartermaster. At the side the beaten enemy
> crew sits on the deck under guard of two buccaneers with muskets. Rigging,
> furled sails and blue sea around.

Scene negatives: tricorne hats, bicorne, periwig, skull and crossbones,
black pirate flag, ship's steering wheel, parrot, hook hand, cartoon
pirate, flags, ensigns, banners, pennants, red and yellow striped flag,
tricolour flag, union jack, ship's steering wheel, glass bottles, modern
weapons.

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

In the game these are 224 × 128 landscapes (7 : 4, generate at 1792 ×
1024). The treasure fleet is always Spanish, so its galleon flies the Cross
of Burgundy, a red ragged saltire on white, in every era; the silver train
shows no flag. The art is `assets/vignettes/treasure-fleet.png` and
`assets/vignettes/silver-train.png` (provenance in
`assets/vignettes/PROVENANCE.md`); no fixes were needed. Final prompts, after
the shared style block:

treasure-fleet:

> in a sunlit tropical harbour below a colonial town with a stone fort, a
> huge beaten Spanish galleon lies alongside a smaller, lower buccaneer
> ship. The galleon is a high-sided 17th-century galleon: a tall, ornately
> carved and gilded square stern castle with stern windows and lanterns, a
> beakhead at the bow, three masts with square sails furled on the yards and
> a triangular lateen sail furled on the mizzen yard, gun ports along her
> side, cannon-shot holes and splintered rails. At her stern flies one large
> white flag bearing a red ragged diagonal cross (a saltire made of two
> crossed knotty red branches with stubs). A wide plank bridges the two
> rails: a chain of barefoot sailors in loose linen shirts, knee breeches
> and headscarves passes heavy gold ingots, open iron-bound chests
> overflowing with gold and silver coins, and strings of pearls down into
> the open hatch of the buccaneer ship, where the hold glitters with heaped
> treasure. In the foreground on the buccaneer deck stands the captain, a
> lean man about thirty, sun-weathered face, dark hair tied back, short
> beard, faded dark-blue coat with brass buttons, red sash, cutlass at the
> hip, tall boots, one boot on a chest, holding up a gold ingot and
> grinning. On the galleon's deck a few disarmed Spanish sailors and an
> officer in a steel morion helmet and buff coat sit under guard of a
> buccaneer with a long musket. Blue sea, white clouds, gulls.

Scene negatives: red and yellow striped flag, modern Spanish flag, coat of
arms on a flag, skull and crossbones, black pirate flag, ship's steering
wheel, tricorne hats, bicorne, periwig, parrot, hook hand, cartoon pirate,
union jack, tricolour flag, glass bottles.

silver-train:

> a dusty street of a small Spanish colonial port town on the hot jungle
> coast of the Isthmus of Panama, whitewashed adobe houses with red clay
> tile roofs and wooden balconies, a plain whitewashed church with a bell
> gable at the end of the street, palm trees and green jungle hills behind.
> A long column of brown pack mules stands in the street, each with a rope
> halter and a wooden pack saddle; the leather and canvas packs are slashed
> open and spill flat grey-white silver bars and coins into the dust.
> Cheering buccaneers in loose linen shirts, broad-brimmed felt hats or
> headscarves, knee breeches, bare feet or rough shoes, with long muskets
> and cutlasses, lift silver bars over their heads. In the middle stands the
> captain, a lean man about thirty, sun-weathered face, dark hair tied back,
> short beard, faded dark-blue coat with brass buttons, red sash, cutlass at
> the hip, tall boots, raising a silver bar high. In the background the
> escort of Spanish soldiers flees past the church: steel morion helmets
> with a curved brim and a crest, buff leather coats, red sashes, matchlock
> muskets and pikes dropped on the ground. Bright afternoon sun, long
> shadows, dust in the air.

Scene negatives: flags, banners, red and yellow striped flag, horses with
modern saddles, wagons, carts, cowboys, Mexican sombreros, ponchos, tricorne
hats, bicorne, periwig, skull and crossbones, parrot, hook hand, cartoon
pirate, glass bottles.

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

In the game this is a 224 × 128 landscape (7 : 4, generate at 1792 ×
1024), one picture for every era and nation. The art is
`assets/vignettes/dig-found.png` (provenance in
`assets/vignettes/PROVENANCE.md`); no fixes were needed. Final prompt:

> Wide landscape panel, around 1640. A jungle clearing on a Caribbean island
> beside a tall, strangely shaped grey rock that marks the spot. In the
> centre, in a freshly dug pit of red-brown earth, three sweaty, bare-armed
> sailors in loose linen shirts, canvas breeches and knitted caps lean on
> wooden spades around an iron-bound oak chest whose lid has just been
> prised open with a crowbar: it is heaped with gleaming gold and silver
> coins, and a warm golden glow lights their amazed, grinning faces from
> below. Standing at the edge of the pit, the captain, a lean man about
> thirty, sun-weathered face, dark hair tied back, short beard, faded dark-blue coat with brass buttons, red sash, cutlass at the hip, tall boots,
> holds an old yellowed parchment map in one hand and stares down at the
> chest in triumph. Heaps of dug earth, a pickaxe and a coil of rope around
> the pit; palms, broad-leaved jungle plants and hanging vines frame the
> scene; dappled sunlight.

Scene negatives: tricorne hats, bicorne, periwig, skull and crossbones,
black pirate flag, ship's steering wheel, parrot, hook hand, cartoon
pirate, readable writing on the map, metal shovels with D-handles,
wheelbarrow, glass bottles, sunglasses.

**dig-nothing** · orig. 0x1A `search` · nothing found (`0xABD0`) ·
*"After three days of fruitless digging, the search is called off. There
is no treasure here."* (CSTR 189)
> A beach scarred with many empty holes at sunset: exhausted sailors lean on
> spades, one throws down his hat, and the captain stares at a torn map,
> frustrated.

In the game this is a 224 × 128 landscape (7 : 4, generate at 1792 ×
1024), one picture for every era and nation. The art is
`assets/vignettes/dig-nothing.png` (provenance in
`assets/vignettes/PROVENANCE.md`); no fixes were needed. Final prompt:

> Wide landscape panel, around 1640. A long Caribbean beach at sunset, the
> sand scarred with many empty, abandoned holes and heaps of dug sand, under
> an orange and violet sky with the sun low over the sea. Three exhausted,
> sunburnt sailors in sweat-stained linen shirts, canvas breeches and
> knitted caps lean wearily on wooden spades; one angrily throws his broad-brimmed hat down onto the sand; another sits slumped on the edge of a pit.
> In the foreground, the captain, a lean man about thirty, sun-weathered
> face, dark hair tied back, short beard, faded dark-blue coat with brass
> buttons, red sash, cutlass at the hip, tall boots, stands frustrated,
> glaring at a torn, yellowed parchment map in his hands. A ship's boat is
> drawn up at the waterline, a small ship at anchor beyond, a few leaning
> palms. Weary, defeated mood, long shadows.

Scene negatives: tricorne hats, bicorne, periwig, skull and crossbones,
black pirate flag, ship's steering wheel, parrot, hook hand, cartoon
pirate, readable writing on the map, metal shovels with D-handles, chest,
gold, treasure.

**reunion** · orig. 0x50–0x53 `reunionf` / `reunionm` (chosen by the
relative's sex) · you rescue a lost relative (`0xA95F`,
`lost_relatives.md`) · *"Your %s is rescued! After years of searching, you
are reunited at last."* (CSTR 184)
> *Female variant:* at the gate of a remote plantation, a thin, older woman
> in worn clothes, the captain's mother, sister or aunt, runs into his arms.
> His crew stands back, moved, and the broken chains of a stockade are on the
> ground. *Male variant:* the same scene with a gaunt, bearded man, father,
> brother or uncle, embracing the captain.

In the game this is a 224 × 128 landscape (7 : 4, generate at 1792 ×
1024), one picture for every era and nation. The art is
`assets/vignettes/reunion-female.png` and `reunion-male.png`, picked by
the relative's sex (provenance in `assets/vignettes/PROVENANCE.md`); no
fixes were needed. Final prompt: The game's female relatives are a sister
and a niece, so the woman is drawn young.

*Female:*

> Wide landscape panel, around 1640. At the open timber gate of a remote
> stockade on the edge of a Caribbean sugar plantation, at golden late-afternoon light, a thin young woman in her twenties, pale and worn from
> years of captivity, in a faded, patched brown wool bodice and a frayed
> linen skirt and coif, her long hair loose, runs into the arms of the
> captain, a lean man about thirty, sun-weathered face, dark hair tied back,
> short beard, faded dark-blue coat with brass buttons, red sash, cutlass at
> the hip, tall boots; they embrace, his hat in his hand, her face full of
> tearful joy. Broken iron chains and a smashed padlock lie on the ground by
> the gate. A few steps behind, his crew of sailors in linen shirts and
> knitted caps stand back, moved, one taking off his cap. Rough log
> palisade, thatched huts, tall green sugar cane and hills behind.

Scene negatives: tricorne hats, bicorne, periwig, skull and crossbones,
black pirate flag, ship's steering wheel, parrot, hook hand, cartoon
pirate, old woman, wedding dress, modern clothes, kissing.

*Male:*

> Wide landscape panel, around 1640. At the open timber gate of a remote
> stockade on the edge of a Caribbean sugar plantation, at golden late-afternoon light, a gaunt older man in his fifties with a long unkempt grey
> beard and thin grey hair, worn from years of captivity, in a ragged, faded
> linen shirt and patched brown breeches, barefoot, embraces the captain, a
> lean man about thirty, sun-weathered face, dark hair tied back, short
> beard, faded dark-blue coat with brass buttons, red sash, cutlass at the
> hip, tall boots; they hold each other tightly, the captain's hat in his
> hand, the old man's eyes closed in tearful joy. Broken iron chains and a
> smashed padlock lie on the ground by the gate. A few steps behind, his
> crew of sailors in linen shirts and knitted caps stand back, moved, one
> taking off his cap. Rough log palisade, thatched huts, tall green sugar
> cane and hills behind.

Scene negatives: tricorne hats, bicorne, periwig, skull and crossbones,
black pirate flag, ship's steering wheel, parrot, hook hand, cartoon
pirate, young man, modern clothes, kissing.

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

In the game this is a 224 × 128 landscape (7 : 4, generate at 1792 ×
1024), one picture for every era and nation. The art is
`assets/vignettes/lost-city-<culture>.png`, one per culture (provenance in
`assets/vignettes/PROVENANCE.md`); no fixes were needed. Final prompt: The
four prompts share the cave; only the last sentence changes.

*Inca:*

> Wide landscape panel, around 1640. A hidden sea cave on a Caribbean coast,
> its mouth half drowned by turquoise sea water with daylight beyond. Inside
> on a dark rock and sand floor lie the broken, blackened timber ribs and
> keel of an old Spanish galleon wreck, and split, rotten iron-bound chests
> spilling a hoard of ancient gold onto the sand. Three stunned sailors in
> linen shirts and knitted caps hold up burning torches whose warm orange
> light glints on the gold; the captain, a lean man about thirty, sun-weathered face, dark hair tied back, short beard, faded dark-blue coat
> with brass buttons, red sash, cutlass at the hip, tall boots, stands in
> the foreground in awe, one hand raised. The treasure is Inca: a large
> hammered gold sun disc with a human face and rays, small solid gold llama
> figurines, gold tumi ceremonial knives with crescent blades, gold and
> silver beakers, and coloured knotted quipu cords spilling out of a chest.

Scene negatives: tricorne hats, bicorne, periwig, skull and crossbones,
black pirate flag, ship's steering wheel, parrot, hook hand, cartoon
pirate, Aztec or Egyptian motifs, pyramids, skulls, jewelled crowns,
European coins only.

*Aztec:*

> Wide landscape panel, around 1640. A hidden sea cave on a Caribbean coast,
> its mouth half drowned by turquoise sea water with daylight beyond. Inside
> on a dark rock and sand floor lie the broken, blackened timber ribs and
> keel of an old Spanish galleon wreck, and split, rotten iron-bound chests
> spilling a hoard of ancient gold onto the sand. Three stunned sailors in
> linen shirts and knitted caps hold up burning torches whose warm orange
> light glints on the gold; the captain, a lean man about thirty, sun-weathered face, dark hair tied back, short beard, faded dark-blue coat
> with brass buttons, red sash, cutlass at the hip, tall boots, stands in
> the foreground in awe, one hand raised. The treasure is Aztec: gold
> feathered-serpent figures, a mask covered in turquoise mosaic with shell
> eyes, gold lip plugs and pendants, jade beads, and a large round carved
> stone calendar disc leaning against the rock wall, carved with a central
> face and rings of glyphs.

Scene negatives: tricorne hats, bicorne, periwig, skull and crossbones,
black pirate flag, ship's steering wheel, parrot, hook hand, cartoon
pirate, Inca or Egyptian motifs, pyramids, skulls, jewelled crowns,
European coins only, readable text.

*Olmec:*

> Wide landscape panel, around 1640. A hidden sea cave on a Caribbean coast,
> its mouth half drowned by turquoise sea water with daylight beyond. Inside
> on a dark rock and sand floor lie the broken, blackened timber ribs and
> keel of an old Spanish galleon wreck, and split, rotten iron-bound chests
> spilling a hoard of ancient gold onto the sand. Three stunned sailors in
> linen shirts and knitted caps hold up burning torches whose warm orange
> light glints on the gold; the captain, a lean man about thirty, sun-weathered face, dark hair tied back, short beard, faded dark-blue coat
> with brass buttons, red sash, cutlass at the hip, tall boots, stands in
> the foreground in awe, one hand raised. The treasure is Olmec: a colossal
> grey basalt head with a heavy-lidded, full-lipped face and a close-fitting
> helmet, half buried in the sand at the back of the cave, and green jade
> figurines with downturned, jaguar-like mouths, polished jade celts, a jade
> mask and jade beads spilling from a chest together with gold.

Scene negatives: tricorne hats, bicorne, periwig, skull and crossbones,
black pirate flag, ship's steering wheel, parrot, hook hand, cartoon
pirate, Easter Island moai, Egyptian motifs, pyramids, skulls, jewelled
crowns, readable text.

*Maya:*

> Wide landscape panel, around 1640. A hidden sea cave on a Caribbean coast,
> its mouth half drowned by turquoise sea water with daylight beyond. Inside
> on a dark rock and sand floor lie the broken, blackened timber ribs and
> keel of an old Spanish galleon wreck, and split, rotten iron-bound chests
> spilling a hoard of ancient gold onto the sand. Three stunned sailors in
> linen shirts and knitted caps hold up burning torches whose warm orange
> light glints on the gold; the captain, a lean man about thirty, sun-weathered face, dark hair tied back, short beard, faded dark-blue coat
> with brass buttons, red sash, cutlass at the hip, tall boots, stands in
> the foreground in awe, one hand raised. The treasure is Maya: a tall
> carved limestone stela covered with square glyph blocks and a richly
> dressed ruler figure standing at the back of the cave, a green jade mosaic
> mask, jade ear spools and beads, gold discs, and a stone throne carved in
> the shape of a jaguar.

Scene negatives: tricorne hats, bicorne, periwig, skull and crossbones,
black pirate flag, ship's steering wheel, parrot, hook hand, cartoon
pirate, Egyptian motifs, pyramids, skulls, jewelled crowns, readable text.

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

### 4.11 Title and career openings

**title-ship** · orig. 0x26 `moon03` (the cover picture) · the title
screen, under the RetroPirates! logo. The original's cover is a full screen;
ours is a framed vignette with its own 3 : 2 shape, **240 × 160**, so the
artwork stays whole. It is shown at 2× (1× below 620 px wide or 640 px tall).
The art is `assets/vignettes/title-ship.png`, built by
`tools/build_vignette.py` (provenance in
`assets/vignettes/PROVENANCE.md`): a three-masted English warship under full
sail flying St George's cross, seen from ahead and to one side, off a
palm-fringed island with a Spanish stone fort flying the Cross of
Burgundy (the build repaints the source's anachronistic 1785 flag). Until the image loads, the
code-drawn sloop placeholder stands in.

Picked by a script for each era and nationality, and shown before play
begins (CSTR 1–44, `src/opening.mjs`). These strings have no pictures in the
original, so these vignettes are additions. `STORY_VIGNETTES` gives each
string one picture, reusing a scene where it fits (tavern, shipwreck,
governor, merchant, bartender, port-quay, town-square, harbour-arrival), and a
story never repeats a picture on consecutive screens. Every opening picture is
real art; each keeps its code-drawn placeholder as the fallback:

| id | text cue | prompt |
|---|---|---|
| open-court | an audience at court for royal approval (CSTR 2, 8) | Real art, `assets/vignettes/open-court.png`: see the prompt below the table. |
| open-plantation | indentured on a sugar plantation (CSTR 14, 18) | Real art, `assets/vignettes/open-plantation.png`: see the prompt below the table. |
| open-quarterdeck | a fight on deck, or a duel for command (CSTR 20, 26, 43) | Real art, `assets/vignettes/open-quarterdeck.png`: see the prompt below the table. |
| open-boarded | a Spanish ship boards you (CSTR 35, 44) | Real art, `assets/vignettes/open-boarded.png`: see the prompt below the table. |
| open-landfall | "Land ho!"; setting course for the Main (CSTR 3, 10) | Real art, `assets/vignettes/open-landfall.png`: see the prompt below the table. |
| open-prison | a foul prison (CSTR 22, 32) | Real art, `assets/vignettes/open-prison.png`: see the prompt below the table. |
| open-night-raid | a sneak attack on a small ship at anchor (CSTR 15) | Real art, `assets/vignettes/open-night-raid.png`: see the prompt below the table. |
| open-buccaneers | living among the buccaneers (CSTR 38) | Real art, `assets/vignettes/open-buccaneers.png`: see the prompt below the table. |
| open-colony | a poor colony, "Turn back" (CSTR 9) | Real art, `assets/vignettes/open-colony.png`: see the prompt below the table. |
| open-swords | the story's sword fight | Real art, `assets/vignettes/open-swords.png`: see the prompt below the table. |
| open-chart | the sailing master's closest cities (CSTR 69) | Real art, `assets/vignettes/open-chart.png`: see the prompt below the table. |

**open-swords** is real art (provenance and sources in
`assets/vignettes/PROVENANCE.md`; no fixes were needed). No flag shows, so
one picture serves every nation; the prompt's "around 1640" is mid-range
for all eras.

> A close-up sword fight on the open deck of a 17th-century sailing ship at
> dusk, around 1640. Two men lock blades face to face, seen from the waist
> up, their two swords crossed high in the centre of the picture so the
> blades form a clear X against a glowing orange and violet sunset sky. On
> the left, the captain, a lean man about thirty, sun-weathered face, dark
> hair tied back, short beard, faded dark-blue long coat with brass
> buttons, red sash, tall boots, bareheaded, jaw set, gripping a short,
> slightly curved, broad-bladed seaman's sword with a plain iron
> shell-shaped guard. On the right, a brutal older ship's captain, broad
> and heavy, black beard, a scar across the cheek, snarling, a
> wide-brimmed black felt hat, a buff leather coat with a leather baldric
> across the chest, holding the same kind of short curved iron-hilted
> sword. Behind them, simplified and darker: the mainmast, tarred shrouds
> with ratlines, a coiled rope and the wooden rail, and a ring of rough
> sailors in plain linen shirts, knitted caps and canvas breeches watching
> tensely, one holding up a lit iron lantern. Calm dark sea at the
> horizon. Keep both faces and the crossed blades in the middle band of
> the picture, with some sky above and deck below.

Scene negatives: ship's steering wheel, wheel, tricorne hat, bicorne hat,
katana, rapier with a basket hilt, flintlock pistols, skull and
crossbones, black flag, flags, eyepatch, parrot, blood.

**open-chart**, **open-buccaneers** and **open-quarterdeck** are real art
(provenance, sources and review in `assets/vignettes/PROVENANCE.md`; no
fixes were needed). None shows a flag, so one picture serves every nation.

**open-chart** prompt:

> A close-up still life seen from above at a slight angle, around 1650: a
> hand-drawn manuscript sea chart of the Caribbean Sea spread across a worn
> dark wooden table in a ship's stern cabin, lit by warm daylight from a
> window at the upper left. The chart is on yellowed vellum with curling
> edges, held flat by a brass candlestick and a small leather-bound book.
> The chart fills most of the picture and shows the Caribbean in a
> recognisable outline: the long, narrow island of Cuba lying across the
> top, the large island of Hispaniola to its right and the small island of
> Puerto Rico beyond it, the small oval island of Jamaica just south of
> Cuba, the tip of the Florida peninsula at the top left, the Yucatan
> peninsula pointing up on the left side, the coast of Central America
> running down the lower left, the long coast of South America along the
> bottom, and a curving chain of tiny islands running down the right edge
> from Puerto Rico to the South American coast. Coastlines are drawn in
> fine brown ink with a narrow band of green wash along each shore, small
> red dots for coastal towns, the sea left pale parchment. Thin straight
> lines in red, green and black radiate across the sea from a large
> hand-painted compass rose in the open water, its north point marked with
> a gold fleur-de-lis, and from smaller roses near the edges. A plain ruled
> latitude scale runs down one side, with marks only and no numbers. A pair
> of open brass navigator's dividers stands on the chart with its two
> points on two islands, and a faint dotted course line is inked between
> them. A brass hourglass and a coil of rope sit at the table's edge. No
> writing anywhere on the chart: no place names, no titles, no numbers.

Scene negatives: place names, labels, map lettering, numbers, title
cartouche, grid of latitude and longitude lines, sextant, octant,
telescope, spyglass, ship's wheel, globe, magnifying glass, modern map,
satellite view, flags, skull and crossbones, X marks the spot, treasure
map.

**open-buccaneers** prompt:

> A buccaneer camp on a beach of western Hispaniola around 1660, in warm
> late-afternoon light. In the foreground on the left, a boucan: a low
> grill of green wooden sticks lashed on four forked posts over a
> smouldering fire, strips of meat and half a wild pig smoking on it, thick
> blue-grey smoke drifting up. Behind it a lean-to roofed with palm thatch,
> cured cattle hides stretched to dry on square wooden frames, a powder keg
> and a few barrels, and two lean hunting dogs lying in the shade. In the
> centre, an older buccaneer teaches a young man to shoot: the young man is
> lean, about twenty, sun-weathered face, dark hair tied back, a short
> beard, in a loose linen shirt, kneeling on the sand and aiming a very
> long-barrelled flintlock musket with a heavy wooden stock at a gourd set
> on a stump; the older man, grizzled and sunburnt, leans over him
> pointing. Two more buccaneers watch, sitting on a log. All the buccaneers
> wear loose linen shirts stained brown with blood and grease, short linen
> drawers open at the knee, bare legs, crude rawhide shoes, and
> broad-brimmed hats with the brim turned up or cut short at the front;
> each has a leather cartridge box on a belt at the front and a short
> cutlass with a plain brass hilt hanging from a narrow shoulder belt. On
> the right, a large open wooden boat is drawn up on the pale sand. Beyond,
> a calm turquoise bay with one small single-masted ship at anchor, palm
> trees and green wooded hills.

Scene negatives: flags, black flag, skull and crossbones, eyepatch, parrot,
peg leg, tattoos, earrings, boots, tricorne hat, bicorne hat, bandana,
ship's steering wheel, rifle with a scope, revolver, tents, women.

**open-quarterdeck** prompt:

> A tense confrontation on the quarterdeck of a 17th-century three-masted
> sailing ship at sea, around 1640, in bright afternoon light under full
> grey-white canvas sails. A wide shot from the ship's waist looking aft
> and up toward the raised quarterdeck, with its carved wooden balustrade,
> two short wooden ladders leading up to it, and a large ornate brass stern
> lantern behind. On the quarterdeck two men face each other a few paces
> apart, swords drawn but not yet crossed, the blades held low and ready.
> On the left, the captain, a lean man about thirty, sun-weathered face,
> dark hair tied back, short beard, faded dark-blue long coat with brass
> buttons, red sash, tall boots, bareheaded, holding a short, slightly
> curved, broad-bladed seaman's sword with a plain iron shell guard. On the
> right, a brutal older ship's captain, broad and heavy, black beard, a
> scar across the cheek, sneering, a wide-brimmed black felt hat, a buff
> leather coat with a leather baldric across the chest, holding the same
> kind of short curved iron-hilted sword. In the foreground below, seen
> from behind and from the side, a crowd of rough sailors in plain linen
> shirts, knitted caps and wide canvas breeches stands on the main deck and
> on the ladders, looking up at the two men; one points, one grips a
> belaying pin. A tarred mast, shrouds with ratlines and coiled ropes frame
> the scene; a glimpse of blue sea and sky beyond the rail. Keep both
> duellists and their faces clearly in the upper middle of the picture.

Scene negatives: flags, ensign, pennant, ship's steering wheel, wheel,
tricorne hat, bicorne hat, katana, rapier with a basket hilt, skull and
crossbones, black flag, eyepatch, parrot, blood, cannon firing, smoke.

**open-court** is real art (provenance, sources and review in
`assets/vignettes/PROVENANCE.md`; no fixes were needed). No flag shows, so
one picture serves every nation. Prompt:

> An audience at a European royal court around 1620, in a tall, gilded hall
> lit by warm daylight from high leaded windows on the left. On the right, a
> wealthy noble patron sits in a high-backed carved and gilded armchair on a
> low dais under a dark red velvet canopy: a grey-bearded man about sixty in
> a black silk doublet and breeches, a wide white lace falling collar, a
> heavy gold chain across his chest, black stockings and shoes with
> rosettes. He leans forward and holds out a large parchment charter with a
> red wax seal hanging from it on a ribbon. In the centre left, the captain,
> a lean man about thirty, sun-weathered face, dark hair tied back, short
> beard, faded dark-blue long coat with brass buttons, red sash, cutlass at
> the hip, tall boots, bareheaded, kneels on one knee on the polished stone
> floor, one hand on his heart, reaching up for the charter. Behind them,
> simplified: courtiers in black and dark-coloured doublets with lace
> collars, broad-brimmed plumed felt hats in hand, whispering; a guard
> holding a tall halberd; large faded tapestries of ships and sea on the
> walls, gilded panelling, a long table with an inkstand and quills. Keep
> the patron's face, the charter and the kneeling captain clearly in the
> middle band of the picture.

Scene negatives: crown, king on a throne, coat of arms, heraldry, flags,
banners, ship's steering wheel, tricorne hat, bicorne hat, periwig, powdered
wig, ruffled lace jabot, military uniforms, globe, chandelier with candles
lit by electricity.

**open-plantation** is real art (provenance, sources and review in
`assets/vignettes/PROVENANCE.md`; no fixes were needed). No flag shows, so
one picture serves every nation. Prompt:

> The edge of a sugar-cane plantation on a Caribbean island around 1640, at
> dusk, under an orange and violet sky. Tall, dense green sugar cane with
> long ragged leaves fills the left half of the picture. At the edge of the
> field, a young indentured labourer, lean, about twenty, sun-weathered
> face, dark hair tied back, a short beard, in a torn, sweat-stained loose
> linen shirt, rough canvas breeches and bare feet, a broad-brimmed battered
> straw hat, a long-bladed cane knife hanging from his hand, crouches and
> talks in secret with two rough smugglers who kneel half-hidden in the
> cane: one grizzled with a grey beard and a knitted cap, one younger with a
> broad felt hat and a short cutlass, both in faded linen shirts and short
> canvas breeches, leaning in, one with a finger to his lips. On the right,
> the field gives way to a rocky slope down to a small, hidden cove, where a
> small single-masted ship with a furled sail rides at anchor on calm dark
> water, and a small rowing boat is pulled up on the beach. Far off in the
> background, a low stone boiling house with a tall chimney trailing grey
> smoke. Keep the three faces clearly in the middle band of the picture.

Scene negatives: flags, whips, chains, overseer on a horse, windmill, steam
engine, factory, tractor, ship's steering wheel, tricorne hat, bicorne hat,
eyepatch, parrot, skull and crossbones, black flag, banana plantation, palm
oil plantation.

**open-boarded** is real art (provenance, sources and review in
`assets/vignettes/PROVENANCE.md`; no fixes were needed). The Spanish galleon
flies the Cross of Burgundy; your own ship shows no flag, so one picture
serves the French and Dutch stories. Prompt:

> A Spanish boarding on the open main deck of a 17th-century merchant
> sailing ship at sea, around 1620, in hard midday light. On the right, the
> high side of a Spanish galleon lies alongside, its dark wooden hull with
> open gunports and carved, painted upper works towering over the deck;
> grappling hooks on ropes bite into our rail, and Spanish soldiers are
> climbing over it. High on its stern a large white flag flies with a red
> ragged diagonal saltire cross made of two knotted, rough-cut branches, the
> only flag in the picture. In the centre, the Spanish boarding officer has
> just jumped down on our deck: a proud, dark-moustached man with a pointed
> beard, wearing a polished steel morion helmet with a high comb and a
> curved brim, a steel breastplate over a dark red doublet with slashed
> sleeves, a red silk sash, wide dark breeches and boots; he draws a long
> straight rapier with a swept iron hilt and points it, sneering. Facing him
> on the left, the captain, a lean man about thirty, sun-weathered face,
> dark hair tied back, short beard, faded dark-blue long coat with brass
> buttons, red sash, cutlass at the hip, tall boots, bareheaded, his hand
> going to his own short curved sword. Behind the officer, Spanish soldiers
> in morion helmets and plain buff coats with long matchlock muskets and
> pikes; behind the captain, his own sailors in plain linen shirts, knitted
> caps and canvas breeches, falling back. Tarred mast, shrouds with ratlines
> and coiled ropes frame the scene; a strip of blue sea. Keep the officer's
> face, the rapier and the captain in the middle band of the picture.

Scene negatives: red and yellow striped flag, Spanish flag with stripes,
coat of arms on a flag, any second flag, pennant, ensign on our ship, ship's
steering wheel, wheel, tricorne hat, bicorne hat, conquistador armour plates
on legs, full plate armour, skull and crossbones, black flag, eyepatch,
parrot, blood, cannon firing, smoke.

**open-landfall** is real art (provenance, sources and review in
`assets/vignettes/PROVENANCE.md`; no fixes were needed). No flag shows, so
one picture serves every nation. Prompt:

> Landfall in the West Indies around 1620: a powerful three-masted sailing
> warship of the period, a galleon with a high, carved, painted stern
> castle, a lower forecastle, a beakhead at the bow, a row of closed
> gunports along a dark tarred hull with ochre wales, square sails on the
> fore and main masts and a triangular lateen sail on the mizzen mast, all
> sails full and pale cream, runs before the trade wind across a deep blue
> sea flecked with whitecaps. It is seen from behind and to one side,
> heeling slightly, its bow wave white. Ahead, filling the right part of the
> picture, a green, mountainous West Indian island: a white sand beach
> fringed with tall coconut palms, dense green forest climbing steep hills,
> a line of surf on an outer reef, a few white clouds over the peaks. A tiny
> lookout stands in the round top of the mainmast, one arm stretched out
> toward the island; small sailors crowd the forecastle rail, looking ahead.
> Seabirds wheel in the bright blue sky. Keep the ship's hull and sails and
> the island clearly in the middle band of the picture.

Scene negatives: flags, ensign, pennants, streamers, banners, ship's
steering wheel, jib sails, staysails, spanker, steamship, modern yacht,
lighthouse, buildings, town, fort, skull and crossbones, black flag, people
on the beach.

**open-prison** is real art (provenance, sources and review in
`assets/vignettes/PROVENANCE.md`; no fixes were needed). No flag shows, so
one picture serves every nation. Prompt:

> A foul prison cell in a 17th-century stone fortress at night, around 1620.
> A low, vaulted cell of rough, damp grey stone blocks streaked with mould
> and water stains. High on the back wall, a small window with thick crossed
> iron bars lets in a single cold blue beam of moonlight that falls across
> the floor. In the beam, a young prisoner, lean, about twenty-five,
> sun-weathered, gaunt face, dark hair untied and matted, a short ragged
> beard, in a torn, dirty linen shirt and ragged breeches, barefoot, sits on
> a heap of filthy straw with his back against the wall and his arms on his
> knees, staring up at the window with a hard, determined look; a heavy iron
> shackle on one ankle is chained to a ring in the wall. Around him: a
> wooden bucket, a cracked earthenware water jug, a crust of bread, a rat in
> the corner. On the left, a heavy oak door banded with iron and studded
> with nails, with a small barred grille through which a faint warm orange
> glow of a torch shows. Deep shadows, cold blue and grey moonlight against
> small warm torchlight. Keep the prisoner's face and the moonlit window
> clearly in the picture.

Scene negatives: flags, modern prison bars, cell with metal bunks, padlock
of modern design, handcuffs, orange jumpsuit, electric light, skeleton,
skull, torture instruments, blood, tricorne hat, bicorne hat, eyepatch,
parrot.

**open-night-raid** is real art (provenance, sources and review in
`assets/vignettes/PROVENANCE.md`; no fixes were needed). No flag shows, so
one picture serves every nation. The rowers face the bow, toward the ship,
where real rowers face the stern; accepted. Prompt:

> A sneak attack at night in a quiet Caribbean bay around 1620, under a full
> moon. A large, low open wooden rowing boat, a ship's longboat, glides
> across calm black water toward a small two-masted sailing ship riding at
> anchor in the middle distance on the right: a modest wooden vessel with a
> high square stern, its sails furled on the yards, a taut anchor cable
> running down from its bow, a single small lantern glowing warm orange at
> its stern, no one awake on deck. In the boat, in the foreground on the
> left, eight rough smugglers sit on the thwarts in pairs facing the stern,
> backs toward the ship as rowers do, pulling the oars slowly and silently,
> oar blades wrapped in rags, crouched low; they wear plain linen shirts,
> knitted caps and broad-brimmed felt hats, with short curved cutlasses and
> long knives in their belts and a boarding axe at their feet. In the stern
> of the boat, facing forward toward the ship, a young man, lean, about
> twenty-five, sun-weathered face, dark hair tied back, a short beard, in a
> loose linen shirt and a dark sleeveless leather jerkin, crouches by the
> tiller: his right hand points at the ship, his left hand grips a cutlass
> at his side; he has exactly two arms and two hands, his face tense and
> watchful. A wide silver path of moonlight runs across the water from the
> moon low in the deep indigo sky; dark palm trees and black hills line the
> shore behind. Cold blue and silver moonlight, with only the lantern warm.
> Keep the boat, the young man's face and the anchored ship clearly in the
> middle band of the picture.

Scene negatives: flags, ensign, pennant, ship's steering wheel, wheel,
outboard motor, oars with metal rowlocks, guns firing, explosions, fire,
skull and crossbones, black flag, tricorne hat, bicorne hat, eyepatch,
parrot, daylight, sun, extra hands, extra arms, rowers facing forward.

**open-colony** is real art (provenance, sources and review in
`assets/vignettes/PROVENANCE.md`; no fixes were needed). No flag shows, so
one picture serves every nation. Prompt:

> A poor new colony on a tropical coast around 1610, at midday under a hazy,
> harsh sky. Inside a stockade of rough upright logs with sharpened tops, a
> few crude, earthfast houses with walls of split timber and mud and steep,
> ragged palm-thatch roofs; a muddy yard, a well with a wooden bucket, a
> small field of stunted, yellowing maize behind sandy soil, empty barrels,
> a broken hoe. In the centre a crowd of angry, ragged, gaunt colonists in
> worn, patched doublets and breeches, plain linen shirts and broad-brimmed
> felt hats, some barefoot, brandish pitchforks, a hoe and a spade and
> shout; at their head stands their leader, a tall, heavy, red-bearded man
> in a battered steel morion helmet and a buff leather coat, who draws a
> long straight sword and points at the open gate toward the sea. Facing him
> on the left, his back half to us, the captain, a lean man about thirty,
> sun-weathered face, dark hair tied back, short beard, faded dark-blue long
> coat with brass buttons, red sash, cutlass at the hip, tall boots,
> bareheaded, his short curved sword drawn and held low and ready. Through
> the open stockade gate, a strip of blue sea with a single three-masted
> ship at anchor. Keep the two men facing each other and the leader's face
> clearly in the middle band of the picture.

Scene negatives: flags, banners, flagpole, log cabins with notched corners,
stone church, brick houses, glass windows, ship's steering wheel, tricorne
hat, bicorne hat, pilgrim hats with buckles, native warriors, blood, skull
and crossbones, black flag, eyepatch, parrot.

The sailing master's greeting (CSTR 68) uses the **sailing-master** portrait (§4.5).

### 4.12 Optional: ship portraits

The original had one portrait per ship type (`0x3A`–`0x42`: pinnace,
sloop, barque, fluyt, merchantman, frigate, war galleon, galleon, fast
galleon). They can be shown on the prize question (*"we've captured a %s
ton %s…"*, CSTR 164) or in the shipwright's list. Prompt: *"Broadside
portrait of a 17th-century* `<type>` *under sail on a calm sea, full
rigging detail, neutral sky."* Our ships are drawn procedurally
(`ship-sprites.mjs`). If you add these, make them match the sprite colours.

### 4.13 Where the placeholders appear

`src/vignettes.mjs` draws a placeholder for these scenes from §4.4 to §4.10.
A scene can serve more than one dialog:

| id | dialogs |
|---|---|
| sail-ho | the first sighting only, not the closer looks that follow |
| sail-nearer | the closer look, "She looks like a …" |
| sail-colours | her colours, "She's flying %s colors", and the named pirate or hunter who gives chase |
| boarding | the provisional boarding choice, with the enemy's flag |
| hostage-talks | the prisoner's offer and the report he gives |
| crew-recruits | tavern volunteers and sailors from a captured ship |
| treasure-fleet, silver-train | each capture's own dialog in a taken town |
| mutiny | the quarterdeck confrontation |
| prison | imprisonment and release; an island rescue uses marooned |
| hall-of-fame | the offer and the list of entries |
| alley-duel | the guard who recognises you and the villain's back entrance; the rival suitor waits for courtship |
| retire-1 to retire-4 | "Your pirating days are over", by the score's tier (illustrious is retire-4) |
| land-attack, fort-walls | the assault choice, by land or from the sea |
| sinking | your flagship sinks in battle (variant A); the enemy blowing up keeps enemy-destroyed |
| outrun | a battle ends out of range, either ship escaping |
| nightfall | sunset ends the battle |

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
2. Downscale ×8 to 224 × 128, quantise to ≤ 256 colours, fix the outlines.
3. Check it at 1× and 2× inside the frame, in the dialog, at a desktop size
   and a narrow viewport.
4. Add tool, model, seed and prompt to `assets/vignettes/PROVENANCE.md`,
   and get the user's go-ahead before committing the image.
