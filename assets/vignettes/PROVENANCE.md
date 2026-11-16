# Vignette art provenance

## governors.png

The governor portraits, one 96 × 128 cell per era and nation (columns Spain,
England, France, Holland; rows 1560, 1600, 1620, 1640, 1660, 1680). See
`docs/governor-dress-1560-1680.md` for why each painting was chosen.

- **Sources:** European portraits painted between about 1560 and 1690, all
  public domain by age (every painter, named or not, worked before 1700). Each is marked public domain on Wikimedia
  Commons (faithful reproductions of two-dimensional public-domain works).
  No material from the original game was used.
- **Process:** `tools/build_governor_portraits.py` downloads a standard
  Commons thumbnail (500–1920 px wide), crops the head and shoulders, reduces
  it to 96 × 128 with a box filter, raises contrast (×1.15) and colour
  (×1.2), and quantises it to 32 colours without dithering. The sheet is
  saved as an indexed PNG.
- **Rebuild:** `python3 tools/build_governor_portraits.py --cache <dir>`
  (Pillow). The crops and file names are in the tool's `SOURCES` table.

| Nation | Era | Painting | Commons file |
|---|---|---|---|
| Spain | 1560 | Sofonisba Anguissola, *Philip II of Spain*, 1573 | [link](https://commons.wikimedia.org/wiki/File:Felipe_II_por_Sofonisba_Anguissola,_1573.jpg) |
| Spain | 1600 | Juan Pantoja de la Cruz, *Philip III of Spain*, 1605 | [link](https://commons.wikimedia.org/wiki/File:Juan_Pantoja_de_la_Cruz_(c._1553-1608)_-_Philip_III,_King_of_Spain_(1578-1621)_-_RCIN_404969_-_Royal_Collection.jpg) |
| Spain | 1620 | Diego Velázquez, *Philip IV of Spain*, 1623 | [link](https://commons.wikimedia.org/wiki/File:Retrato_de_Felipe_IV,_by_Diego_Vel%C3%A1zquez.jpg) |
| Spain | 1640 | Diego Velázquez, *Don Diego del Corral y Arellano*, c. 1632 | [link](https://commons.wikimedia.org/wiki/File:Don_Diego_del_Corral_y_Arellano,_por_Diego_Vel%C3%A1zquez.jpg) |
| Spain | 1660 | Diego Velázquez, *Philip IV of Spain*, 1656 | [link](https://commons.wikimedia.org/wiki/File:Philip_IV_of_Spain.jpg) |
| Spain | 1680 | Claudio Coello, *Charles II of Spain*, 1680–83 | [link](https://commons.wikimedia.org/wiki/File:Claudio_Coello_-_Charles_II_-_Google_Art_Project.jpg) |
| England | 1560 | Antonis Mor, *Sir Thomas Gresham*, c. 1560 | [link](https://commons.wikimedia.org/wiki/File:Anthonis_Mor_-_Sir_Thomas_Gresham_-_WGA16185.jpg) |
| England | 1600 | 'H' monogrammist, *Sir Walter Ralegh*, 1588 | [link](https://commons.wikimedia.org/wiki/File:Sir_Walter_Ralegh_by_%27H%27_monogrammist.jpg) |
| England | 1620 | Cornelius Johnson, *Portrait of an unknown gentleman*, 1629 | [link](https://commons.wikimedia.org/wiki/File:Cornelius_Johnson_(1593-1661)_-_Portrait_of_an_Unknown_Gentleman_-_T00744_-_Tate.jpg) |
| England | 1640 | William Dobson, *Portrait of a Royalist*, c. 1643 | [link](https://commons.wikimedia.org/wiki/File:William_Dobson_(1611-1646)_-_Portrait_of_a_Royalist_-_BHC3133_-_Royal_Museums_Greenwich.jpg) |
| England | 1660 | Peter Lely, *Portrait of an unknown gentleman*, c. 1660 | [link](https://commons.wikimedia.org/wiki/File:Peter_Lely_(1618-1680)_-_Portrait_of_an_Unknown_Gentleman_(inscribed_as_%27Lionel_Tollemache,_1649%E2%80%931727,_3rd_Earl_of_Dysart%27)_-_1139945_-_National_Trust.jpg) |
| England | 1680 | Style of John Riley, *Portrait of an unknown gentleman*, c. 1680–90 | [link](https://commons.wikimedia.org/wiki/File:John_Riley_(1646-1691)_(style_of)_-_Portrait_of_an_Unknown_Gentleman_-_43_-_Sidney_Sussex_College.jpg) |
| France | 1560 | François Clouet, *Pierre Quthe*, 1562 | [link](https://commons.wikimedia.org/wiki/File:Pierre_Quthe_-_Fran%C3%A7ois_Clouet_-_Mus%C3%A9e_du_Louvre_Peintures_RF_1719.jpg) |
| France | 1600 | Frans Pourbus the Younger, *Henri IV of France*, c. 1610 | [link](https://commons.wikimedia.org/wiki/File:Henri_IV_by_F._Pourbus_the_Younger_(Royal_Collection).jpg) |
| France | 1620 | French school, *Henri II de Montmorency*, c. 1625 | [link](https://commons.wikimedia.org/wiki/File:Henri_II_de_Montmorency_Louvre.jpg) |
| France | 1640 | Philippe de Champaigne, *Louis XIII of France*, c. 1640 | [link](https://commons.wikimedia.org/wiki/File:Philippe_de_Champaigne_-_Louis_XIII_of_France_-_Carnavalet.png) |
| France | 1660 | Charles Le Brun, *Louis XIV of France*, 1667 | [link](https://commons.wikimedia.org/wiki/File:Charles_Le_Brun_-_Louis_XIV_-_WGA12539.jpg) |
| France | 1680 | Hyacinthe Rigaud, *Jules Hardouin-Mansart*, 1685 | [link](https://commons.wikimedia.org/wiki/File:Hyacinthe_Rigaud_1685_Jules-Hardouin_Mansart-001.JPG) |
| Holland | 1560 | Antonis Mor, *Portrait of a man*, early 1560s | [link](https://commons.wikimedia.org/wiki/File:Anthonis_Mor_-_Portrait_of_a_Man,_NG1231.jpg) |
| Holland | 1600 | Michiel van Mierevelt, *Johan van Oldenbarnevelt*, 1617 | [link](https://commons.wikimedia.org/wiki/File:Michiel_van_Mierevelt_-_Johan_van_Oldenbarnevelt_-_1930-001_-_Museum_Flehite.jpg) |
| Holland | 1620 | Frans Hals, *The Laughing Cavalier*, 1624 | [link](https://commons.wikimedia.org/wiki/File:Frans_Hals_%E2%80%93_The_Laughing_Cavalier.jpg) |
| Holland | 1640 | Rembrandt, *Nicolaes van Bambeeck*, 1641 | [link](https://commons.wikimedia.org/wiki/File:Rembrandt,_Portrait_of_Nicolaas_van_Bambeeck,_1641,_Koninklijke_Musea_voor_Schone_Kunsten_van_Belgi%C3%AB.jpg) |
| Holland | 1660 | Rembrandt, *The Syndics of the Drapers' Guild* (one syndic), 1662 | [link](https://commons.wikimedia.org/wiki/File:Rembrandt_-_De_Staalmeesters-_het_college_van_staalmeesters_(waardijns)_van_het_Amsterdamse_lakenbereidersgilde_-_Google_Art_Project.jpg) |
| Holland | 1680 | Nicolaes Maes, *Portrait of a man in a black wig*, 1680 | [link](https://commons.wikimedia.org/wiki/File:Nicolaes_Maes_(1634-1693)_-_Portrait_of_a_Man_in_a_Black_Wig_-_NG2954_-_National_Gallery.jpg) |

## title-ship.png

The title screen picture, 240 × 160 (3 : 2): a three-masted English warship
flying St George's cross, under full sail off a palm-fringed island with a
Spanish stone fort.

- **Source:** a 1536 × 1024 comic-style illustration generated by a
  diffusion model from a text prompt, supplied by the user, who holds the
  rights to it. The first version (2026-11-15) was replaced the same day by
  a corrected one with period flags and a better framing. The tool, model
  and prompt were not recorded. The source file is not kept in the
  repository. No material from the original game was used.
- **Process:** `tools/build_vignette.py` first repaints the fort's
  flag as the Cross of Burgundy, the Spanish flag of 1560–1680 (the source
  drew the red-yellow-red flag of 1785), by warping a flat flag onto its
  corners. It then reduces the picture to 240 × 160 with a box filter, raises contrast (×1.15) and colour (×1.2),
  and quantises to 256 colours (median cut) without dithering (indexed
  PNG).
- **Rebuild:** `python3 tools/build_vignette.py --scene title-ship --source <image>`
  (Pillow).

## harbour-arrival.png

The town approach at a coastal town: a sheet of five 224 × 128 pictures, one
per fort flag (rows: Spain, England, France, Holland to the 1640s, Holland
from 1660). The captain at the bow rail looks across a harbour at a stone
fort, a colonial town on a hill and a moored merchant ship.

- **Source:** a 1659 × 948 (7 : 4) comic-style illustration generated with
  ChatGPT from the prompt in `docs/scene-vignettes.md` (shared style block
  plus the harbour-arrival scene, which asks for a plain white fort flag),
  supplied by the user on 2026-11-15, who holds the rights to it. The exact
  model was not recorded, nor whether the prompt was edited before use. The source file is not
  kept in the repository. No material from the original game was used.
- **Process:** `tools/build_vignette.py` warps each period flag onto the
  plain white flag the source flies on the fort, keeping the source's folds
  as shading: the Cross of Burgundy (Spain), St George's cross (England),
  the plain white royal flag (France, official from 1661), the orange-white-
  blue Prince's flag and the red-white-blue States flag (Holland). Each
  version is reduced to 224 × 128 with a box filter, contrast ×1.15 and
  colour ×1.2; the five rows are quantised together to 256 colours (median
  cut, no dithering, indexed PNG).
- **Rebuild:** `python3 tools/build_vignette.py --scene harbour-arrival --source <image>`
  (Pillow).

## port-quay.png

The town menu of a coastal town, from the quay: a sheet of five 224 × 128
pictures, one per fort flag, in the same rows as harbour-arrival.png (Spain,
England, France, Holland to the 1640s, Holland from 1660). Stevedores roll
barrels and carry bales under a warehouse hoist beam, an arcaded street and
a church run along the waterfront, a galleon and a smaller two-master lie at
anchor, a rowing boat comes in, and a small stone fort stands on the far
headland. The captain is not shown.

- **Source:** a 1659 × 948 (7 : 4) comic-style illustration generated on
  2026-11-15 with the built-in image generation tool of the OpenAI Codex
  CLI (codex-cli 0.169.0, `image_gen`; model not reported), run under the
  user's own account at the user's request, from the port-quay prompt in
  `docs/scene-vignettes.md` with the shared style block and negatives (it
  asks for a plain white fort flag in proportion to the fort and no flags
  on the ships). The user holds the rights to it. It replaces a first
  generation the user rejected (the flag stood taller than the fort, and
  the recurring captain repeated the sail-ho picture). The source file is
  not kept in the repository. No material from the original game was used.
- **Process:** `tools/build_vignette.py` warps each period flag onto the
  plain white fort flag, keeping the source's folds as shading (the same
  five flags as harbour-arrival.png). Each version is reduced to 224 × 128
  with a box filter, contrast ×1.15 and colour ×1.2; the five rows are
  quantised together to 256 colours (median cut, no dithering, indexed
  PNG). The flag is about 4 × 3 art pixels, true to the fort's distance:
  the user chose that over a larger or pixel-drawn flag, so the crosses do
  not read and only the colours hint at the nation.
- **Rebuild:** `python3 tools/build_vignette.py --scene port-quay --source <image>`
  (Pillow).

## merchant.png

The merchant's portrait, 96 × 128 (3 : 4), shown wherever the game shows the
merchant (the trading post, his refusal of pirates, his daughter's courtship
and wedding, supper with your wife, and a career-opening story screen): a plump, beaming merchant of about 1640 in a linen
apron over a dark doublet with a flat white collar, arms spread in welcome,
among sugar barrels, hides, cacao sacks, cloth-wrapped bales and a brass
balance, with a ledger, a quill and coins on his desk.

- **Source:** a 1086 × 1448 comic-style illustration generated with ChatGPT
  (model not known) from the merchant prompt in `docs/scene-vignettes.md`,
  supplied by the user on 2026-11-15, who holds the rights to it. The
  source file is not kept in the repository. No material from the original
  game was used.
- **Process:** `tools/build_vignette.py` reduces it to 96 × 128 with a box
  filter, raises contrast (×1.15) and colour (×1.2), and quantises to 256
  colours (median cut, no dithering, indexed PNG). No historical fixes were
  needed.
- **Rebuild:** `python3 tools/build_vignette.py --scene merchant --source <image>`
  (Pillow).

## barmaid.png

The barmaid's portrait, 96 × 128 (3 : 4), shown in the tavern when the
captain talks to her: a smiling, winking barmaid of about 1640 with chestnut
curls under a linen coif, in a red laced bodice, linen shift and apron,
holding up three lidded pewter tankards in a candlelit tavern full of
sailors, with barrels and a grey-and-blue stoneware jug behind her.

- **Source:** a 1086 × 1448 comic-style illustration generated with ChatGPT
  (model not known) from the barmaid prompt in `docs/scene-vignettes.md`,
  supplied by the user on 2026-11-15, who holds the rights to it. The
  source file is not kept in the repository. No material from the original
  game was used.
- **Process:** `tools/build_vignette.py` reduces it to 96 × 128 with a box
  filter, raises contrast (×1.15) and colour (×1.2), and quantises to 256
  colours (median cut, no dithering, indexed PNG). No historical fixes were
  needed; the missing neckline kerchief was accepted (not an anachronism,
  barely visible at 1×).
- **Rebuild:** `python3 tools/build_vignette.py --scene barmaid --source <image>`
  (Pillow).

## bartender.png

The bartender's portrait, 96 × 128 (3 : 4), shown in the tavern when the
captain asks for news: a burly, one-eyed tavernkeeper of about 1640 with a
black eyepatch and a big grey moustache, in a linen shirt, leather jerkin
and stained apron, drying a lidded pewter tankard behind a wooden counter,
with casks, grey-and-blue stoneware jugs, leather bottles, a chalked tally
slate and tallow candles behind him.

- **Source:** a 1086 × 1448 comic-style illustration generated on
  2026-11-15 with the built-in image generation tool of the OpenAI Codex
  CLI (codex-cli 0.169.0, `image_gen`; model not reported), run under the
  user's own account at the user's request, from the bartender prompt in
  `docs/scene-vignettes.md` with the shared style block and negatives. The
  user holds the rights to it. The source file is not kept in the
  repository. No material from the original game was used.
- **Process:** `tools/build_vignette.py` reduces it to 96 × 128 with a box
  filter, raises contrast (×1.15) and colour (×1.2), and quantises to 256
  colours (median cut, no dithering, indexed PNG). No historical fixes were
  needed; the brass cask taps were accepted (plausible for the period,
  unreadable at 1×).
- **Rebuild:** `python3 tools/build_vignette.py --scene bartender --source <image>`
  (Pillow).

## ships/*.png

The sighted ship, 224 × 128 (7 : 4) each, shown when the sail draws nearer
("She looks like a …"): one ship under sail at middle distance, seen past
our own rail and shrouds, flying no flags. Twenty pictures, one per ship
type and period band: `barque`, `sloop`, and `early-`, `mid-` and `late-`
(1560–1600, 1620–1640, 1660–1680) `pinnace`, `fluyt`, `merchantman`,
`fastgalleon` (`frigate` in the late band), `galleon` and `wargalleon`.

- **Source:** twenty 1659 × 948 comic-style illustrations generated on
  2026-11-16 with the built-in image generation tool of the OpenAI Codex
  CLI (codex-cli 0.169.0, `image_gen`; model not reported), run under the
  user's own account at the user's request, from the sail-nearer prompt and
  ship table in `docs/scene-vignettes.md` with the shared style block and
  negatives. The user holds the rights to them. The source files are not
  kept in the repository. No material from the original game was used.
- **Period sources:** the fluyt's rounded, pear-shaped hull, two or three
  masts and lateen mizzen, and its light armament (Wikipedia, "Fluyt",
  rev. 1367062980); the galleon's beakhead, lateen mizzen and fourth
  "bonaventure" mizzen on large ships (Wikipedia, "Galleon",
  rev. 1378453936, several sections unsourced); the pinnace as a light,
  single-decked, square-sterned vessel with sweeps and varied rigs
  (Wikipedia, "Full-rigged pinnace", rev. 1353397534, citing *Some
  Seventeenth-Century Vessels and the Sparrow-Hawk*, 1980); the frigate as
  a long, low cruiser from the Dunkirk ships of about 1600 to the English
  fourth to sixth rates of 1675 (Wikipedia, "Frigate", rev. 1383778071);
  the later 17th-century Caribbean sloop with a large fore-and-aft gaff
  mainsail and a headsail, a square topsail being unusual (secondary
  sources only, e.g. bloodandpigment.com, 2020-10-18). "Bark" was a general
  name for small ships in the period (Wikipedia, "Barque",
  rev. 1378973771, citing Falconer); its rig is not recorded, so the
  two-masted lateen bark, like a small caravel, is a design choice that
  keeps the game's fore-and-aft barque, not a documented type. Before 1660
  the game's frigate is the original's "fast galleon" (encounters.md §2),
  drawn as a race-built galleon.
- **Review:** no flags, ensigns or pennants on any ship; no steering
  wheels, people or lettering. Accepted: the fluyts' tumblehome is milder
  than in period draughts, and the 16th-century war galleon shows one full
  tier of gunports rather than two; neither reads at 1×. No fixes were
  needed.
- **Process:** `tools/build_vignette.py` crops each source to 7 : 4
  (centred), reduces it to 224 × 128 with a box filter, raises contrast
  (×1.15) and colour (×1.2), and quantises to 256 colours (median cut, no
  dithering, indexed PNG).
- **Rebuild:** `python3 tools/build_vignette.py --scene ships/<key> --source <image>`
  (Pillow).

## colours/*

The ship's colours, 224 × 128 (7 : 4), shown when the lookout reads her
flag: a close view of her stern with a large flag streaming from its
flagstaff. Four sterns (`stern-early`, `stern-mid`, `stern-late`,
`stern-small`), each with its cloth map (`<stern>-map.png`), and the sheet
of flat flags painted onto them in the game (`flags.png`, order in
`flags.json`).

- **Source of the sterns:** four 1659 × 948 comic-style illustrations
  generated on 2026-11-16 with the built-in image generation tool of the
  OpenAI Codex CLI (codex-cli 0.169.0, `image_gen`; model not reported), run
  under the user's own account at the user's request, from the
  sail-colours prompt and stern table in `docs/scene-vignettes.md` with the
  shared style block and negatives, each with one plain white flag. The
  user holds the rights to them. The source files are not kept in the
  repository. No material from the original game was used.
- **Flags:** drawn by Claude Code in `tools/build_colours.py` from the
  period descriptions below; the 32 pirate captains' colours are new
  designs, not the original's pirate flags (which were tied to captains'
  names through the copy-protection question). Sources for the choice of
  flag by nation, era and role: Spain, FOTW "Cross of Burgundy"
  (fotw.info/flags/es_brgdy.html, ensign to the 1670s, then jack) and
  "Historical flags 1701–1785" (es1701.html, Ivan Sache, 2015-07-28,
  Charles II's royal arms ensign; its exact first year is not given);
  England, Wikipedia "Red Ensign" (the canton by 1620, merchants confirmed
  1674); France, Wikipedia "French ensigns" (the 1661 ordinance: white for
  the king's ships, a white cross on blue for merchants), Champlain's 1612
  map and FOTW's "white ensign 1638–1790" through a search summary (the
  white cross on blue before 1640 for every French ship is a choice: no
  source found for the navy's flag before 1638); Holland, Wikipedia "Flag
  of the Netherlands" (rev. 1383762538: orange 1588–1630, both 1630–1662,
  red from 1663); pirates, the "bloody flag" reported for buccaneers in
  1681 (secondary sources) and skull-and-crossbones flags only from about
  1700. Spain's royal arms are simplified to a crowned shield quartered
  with castles and lions.
- **Review:** the sterns show no flag but the white one, no lettering, no
  people; the late stern's carved figures are generic, with no coat of
  arms. No fixes were needed.
- **Process:** `python3 tools/build_colours.py flags` draws the flag sheet.
  `python3 tools/build_colours.py stern --key <stern> --source <image>`
  pixelates the stern like `tools/build_vignette.py` (box reduction,
  contrast ×1.15, colour ×1.2, 256 colours, no dithering) and measures the
  white flag (its bright, unsaturated pixels inside the stern's box, and
  their four extreme corners) into the cloth map: the flag's (u, v)
  through the perspective of those corners, and the folds' light.

## sail-ho.png

The sail-sighted picture, 224 × 128 (7 : 4), shown when the lookout reports
a sail: the captain shades his eyes at the rail beside three sailors,
staring at a tiny ship on the horizon, with the mainmast and its shrouds on
the left, a billowing sail above and cumulus clouds.

- **Source:** a 1536 × 1024 comic-style illustration generated with ChatGPT
  (image generation, model not known) from the sail-ho prompt in
  `docs/scene-vignettes.md` (the version that places the lookout's platform
  high on the mast), supplied by the user on 2026-11-15, who holds
  the rights to it. The source file is not kept in the repository. No
  material from the original game was used.
- **Period choices:** the prompt drops the spyglass (telescopes are first
  recorded in 1608, and the picture serves every era from 1560) and the
  barrel crow's nest (credited to William Scoresby in 1807) for an open
  masthead platform. A first image put the platform at head height on an
  oddly turned mast and was rejected; this one leaves the platform and the
  lookout out of frame, which the user accepted. The distant ship flies no
  visible flag, so one picture serves every nation.
- **Process:** `tools/build_vignette.py` crops the 3 : 2 source to 7 : 4
  (centred), reduces it to 224 × 128 with a box filter, raises contrast (×1.15) and
  colour (×1.2), and quantises to 256 colours (median cut, no dithering,
  indexed PNG). No historical fixes were needed; the distant ship's rig
  (about 4 × 4 art pixels), the turned balusters under the rail and the
  captain's buttoned coat, which suits the later decades best, were
  accepted.
- **Rebuild:** `python3 tools/build_vignette.py --scene sail-ho --source <image>`
  (Pillow).

## sailing-master.png

The sailing master's portrait, 96 × 128 (3 : 4), shown at the end of the
career opening when he gives his first briefing: a stocky, weather-beaten
seaman of about 1640 with a grizzled grey beard and long grey hair under a
knitted wool cap, in a linen shirt, a short brown wool jacket with pewter
buttons and wide canvas breeches, raising a hand in warning with brass
dividers and a rolled sea chart in the other, before the rail, shrouds,
a square sail and three sullen sailors by the mainmast.

- **Source:** a 1086 × 1448 comic-style illustration generated on
  2026-11-15 with the built-in image generation tool of the OpenAI Codex
  CLI (codex-cli 0.169.0, `image_gen`; model not reported), run under the
  user's own account at the user's request, from the sailing-master prompt
  in `docs/scene-vignettes.md` with the shared style block and negatives.
  The user holds the rights to it. The source file is not kept in the
  repository. No material from the original game was used.
- **Period choices:** one picture serves every era from 1560 to 1680; the
  prompt says "around 1640", mid-range, and keeps to dress and gear found
  across the whole span. It drops the old brief's ship's wheel (ships were
  steered by tiller and whipstaff until wheels came in during the early
  1700s: [Wikipedia, "Whipstaff"](https://en.wikipedia.org/wiki/Whipstaff),
  consulted 2026-11-15). It also drops the grey queue and the clay pipe:
  neither could be confirmed for seamen as early as the 1560 era, so they
  were left out rather than guessed. The knitted wool cap is the kind worn
  by soldiers, sailors and labourers in the 16th and 17th centuries
  ([Wikipedia, "Monmouth cap"](https://en.wikipedia.org/wiki/Monmouth_cap),
  consulted 2026-11-15).
- **Process:** `tools/build_vignette.py` reduces it to 96 × 128 with a box
  filter, raises contrast (×1.15) and colour (×1.2), and quantises to 256
  colours (median cut, no dithering, indexed PNG). No historical fixes
  were needed.
- **Rebuild:** `python3 tools/build_vignette.py --scene sailing-master --source <image>`
  (Pillow).

## open-swords.png

The career opening's sword-fight picture, 224 × 128 (7 : 4), shown before
the opening's practice bout: at sunset on a ship's deck the captain, in his
faded blue coat and red sash, crosses short curved swords with a
black-bearded, scarred ship's captain in a wide-brimmed black hat and buff
leather coat, while the crew watches by the rail and a sailor holds up a
lantern.

- **Source:** a 1659 × 948 comic-style illustration generated on
  2026-11-15 with the built-in image generation tool of the OpenAI Codex
  CLI (codex-cli 0.169.0, `image_gen`; model not reported), run under the
  user's own account at the user's request, from the open-swords prompt in
  `docs/scene-vignettes.md` with the shared style block and negatives. The
  user holds the rights to it. The source file is not kept in the
  repository. No material from the original game was used.
- **Period choices:** one picture serves every era from 1560 to 1680; the
  prompt says "around 1640", mid-range. Both men hold short, curved,
  shell-guarded seamen's swords, the hanger or cutlass common at sea in
  the 17th century ([Wikipedia, "Cutlass"](https://en.wikipedia.org/wiki/Cutlass);
  a late 17th-century iron shell-hilt hanger at [Royal Museums Greenwich](https://www.rmg.co.uk/collections/objects/rmgc-object-78877);
  both consulted 2026-11-15). The shell guard is a 17th-century form, so
  for the 1560 era the swords are an approximation, accepted because the
  hilts are a few pixels at 1×. No ship's wheel and no flag is shown, so
  one picture serves every nation.
- **Process:** `tools/build_vignette.py` reduces the 7 : 4 source to
  224 × 128 with a box filter, raises contrast (×1.15) and colour (×1.2),
  and quantises to 256 colours (median cut, no dithering, indexed PNG). No
  historical fixes were needed.
- **Rebuild:** `python3 tools/build_vignette.py --scene open-swords --source <image>`
  (Pillow).

## open-chart.png

The sailing master's chart, 224 × 128 (7 : 4), shown with his list of the
closest cities as a career starts: a hand-drawn chart of the Caribbean on
yellowed vellum, with rhumb lines and compass roses, lies on a cabin table
under open brass dividers, beside an hourglass, a coil of rope, a book and
a candlestick, with a harbour fort seen through the stern window.

- **Source:** a 1659 × 948 comic-style illustration generated on
  2026-11-15 with the built-in image generation tool of the OpenAI Codex
  CLI (codex-cli 0.169.0, `image_gen`; model not reported), run under the
  user's own account at the user's request, from the open-chart prompt in
  `docs/scene-vignettes.md` with the shared style block and negatives. The
  user holds the rights to it. The source file is not kept in the
  repository. No material from the original game was used.
- **Period choices:** working charts of the period were hand-drawn,
  often on vellum, with rhumb lines radiating from compass roses and a
  latitude scale (Utrecht University, ["VOC-chart of the Atlantic Ocean by
  Isaak de Graaf"](https://www.uu.nl/en/special-collections/collections/maps-and-atlases/regional-maps/voc-chart-of-the-atlantic-ocean-by-isaak-de-graaf);
  Royal Museums Greenwich, [Caribbean and coasts of America, manuscript on
  vellum](https://www.rmg.co.uk/collections/objects/rmgc-object-541167);
  both consulted 2026-11-15). The chart carries no lettering, by the
  vignette rule against text. The coastline is a generator's sketch:
  Cuba, Hispaniola, Puerto Rico, Jamaica, Florida, Yucatán, Central
  America, the Main and the Lesser Antilles are in the right places, but
  their shapes are approximate, as on many period charts. No sextant,
  octant or spyglass (the review checked for them). The ship seen through
  the window flies a small pennant a few source pixels wide, invisible at
  1×; accepted.
- **Process:** `tools/build_vignette.py` reduces the 7 : 4 source to
  224 × 128 with a box filter, raises contrast (×1.15) and colour (×1.2),
  and quantises to 256 colours (median cut, no dithering, indexed PNG). No
  historical fixes were needed.
- **Rebuild:** `python3 tools/build_vignette.py --scene open-chart --source <image> --shape landscape`
  (Pillow).

## open-buccaneers.png

The career opening's buccaneer camp, 224 × 128 (7 : 4), for "You live
among the buccaneers of the coast" (CSTR 38, the French 1660 and 1680
stories): on a Hispaniola beach a grizzled buccaneer teaches a young man to
aim a long musket, beside a boucan smoking a wild pig, hides drying under a
thatched lean-to, hunting dogs and two men on a log, with a boat drawn up
and a small ship in the bay.

- **Source:** a 1659 × 948 comic-style illustration generated on
  2026-11-15 with the built-in image generation tool of the OpenAI Codex
  CLI (codex-cli 0.169.0, `image_gen`; model not reported), run under the
  user's own account at the user's request, from the open-buccaneers prompt in
  `docs/scene-vignettes.md` with the shared style block and negatives. The
  user holds the rights to it. The source file is not kept in the
  repository. No material from the original game was used.
- **Period choices:** the boucaniers of western Hispaniola hunted wild
  cattle for hides and wild pigs for meat, with packs of dogs, and smoked
  the meat on a wooden frame, the boucan
  ([Britannica, "buccaneer"](https://www.britannica.com/topic/buccaneer);
  Benerson Little, ["The Authentic Eyewitness Image of the Real
  Buccaneer"](https://benersonlittle.com/2015/10/06/the-authentic-image-of-the-real-buccaneers-of-captain-blood-his-odyssey-by-rafael-sabatini/),
  2015, from Exquemelin 1678 and later French charts; both consulted
  2026-11-15). Dress and arms follow Little's reading of the period
  sources: loose linen shirts, linen drawers open at the knee, rawhide
  shoes, broad hats turned up in front, a cartridge box at the front of
  the belt, a brass-hilted cutlass and the long buccaneer musket. No
  boots, eyepatch, parrot or flag. The musket's lock and fittings are
  closer to the 18th century than to a 1660 fusil boucanier; accepted,
  because they are a few pixels at 1×.
- **Process:** `tools/build_vignette.py` reduces the 7 : 4 source to
  224 × 128 with a box filter, raises contrast (×1.15) and colour (×1.2),
  and quantises to 256 colours (median cut, no dithering, indexed PNG). No
  historical fixes were needed.
- **Rebuild:** `python3 tools/build_vignette.py --scene open-buccaneers --source <image> --shape landscape`
  (Pillow).

## open-quarterdeck.png

The career opening's quarterdeck confrontation, 224 × 128 (7 : 4), for a
fight or a duel for command on deck (CSTR 20, 26, 43), shown before the
practice bout: on a ship's quarterdeck the captain in his blue coat and the
black-bearded captain of `open-swords` face each other with drawn curved
swords, as the crew watches from the deck below.

- **Source:** a 1659 × 948 comic-style illustration generated on
  2026-11-15 with the built-in image generation tool of the OpenAI Codex
  CLI (codex-cli 0.169.0, `image_gen`; model not reported), run under the
  user's own account at the user's request, from the open-quarterdeck prompt in
  `docs/scene-vignettes.md` with the shared style block and negatives. The
  user holds the rights to it. The source file is not kept in the
  repository. No material from the original game was used.
- **Period choices:** one picture serves every era from 1560 to 1680; the
  prompt says "around 1640", like `open-swords`, and reuses its two men
  and swords. No ship's wheel shows: wheels came in only in the early
  18th century (the French navy adopted it in 1709, after Harland and
  Myers, *The Mariner's Mirror*, 1972, cited by
  [Wikipedia, "Ship's wheel"](https://en.wikipedia.org/wiki/Ship%27s_wheel),
  consulted 2026-11-15). No flag or ensign shows, so it serves every
  nation. The mainsail's light and shadow bands make a faint diagonal
  pattern; at 1× it reads as folds, not as a saltire, so it was accepted.
  Two sailors wear head kerchiefs, a later pirate cliché that is rare in
  17th-century imagery; accepted as minor.
- **Process:** `tools/build_vignette.py` reduces the 7 : 4 source to
  224 × 128 with a box filter, raises contrast (×1.15) and colour (×1.2),
  and quantises to 256 colours (median cut, no dithering, indexed PNG). No
  historical fixes were needed.
- **Rebuild:** `python3 tools/build_vignette.py --scene open-quarterdeck --source <image> --shape landscape`
  (Pillow).

## open-court.png

The career opening's audience at court, 224 × 128 (7 : 4), for "an audience
at court for royal approval" and the aristocratic friends' support (CSTR 2
and 8: the England, France and Holland stories from 1560 to 1680): in a
gilded hall hung with tapestries of ships, the captain kneels before a
grey-bearded noble patron in black silk who hands him a parchment charter
with a red wax seal, as courtiers whisper and a halberdier stands guard.

- **Source:** a 1659 × 948 comic-style illustration generated on 2026-11-15
  with the built-in image generation tool of the OpenAI Codex CLI (codex-cli
  0.169.0, `image_gen`; model not reported), run under the user's own
  account at the user's request, from the open-court prompt in
  `docs/scene-vignettes.md` with the shared style block and negatives. The
  user holds the rights to it. The source file is not kept in the
  repository. No material from the original game was used.
- **Period choices:** Dress around 1620: the patron's black silk doublet and
  breeches, lace-edged falling collar and gold chain, and the courtiers'
  falling collars and broad plumed hats, follow
  `docs/governor-dress-1560-1680.md` (the soft falling band had largely
  displaced the standing collar by the mid-1620s). One picture serves every
  era, as for `open-swords`; a 1560 audience would show ruffs instead,
  accepted. The story is told for three nations, and Holland had no king, so
  the hall shows no crown, coat of arms or flag, and the patron is a noble,
  not a king ("your patron" in the text). The charter carries only illegible
  scribble, no lettering. The tapestries' ships fly pennants a few source
  pixels wide, invisible at 1×; accepted. The captain's long coat with brass
  buttons is the recurring captain's dress, kept the same in every scene.
- **Process:** `tools/build_vignette.py` reduces the 7 : 4 source to 224 ×
  128 with a box filter, raises contrast (×1.15) and colour (×1.2), and
  quantises to 256 colours (median cut, no dithering, indexed PNG). No
  historical fixes were needed.
- **Rebuild:** `python3 tools/build_vignette.py --scene open-court --source <image> --shape landscape`
  (Pillow).

## open-plantation.png

The career opening's sugar plantation, 224 × 128 (7 : 4), for the indentured
labourer's stories (CSTR 14 and 18: France 1600 and England 1620 to 1680):
at dusk at the edge of the cane a young labourer in a torn shirt and straw
hat, cane knife in hand, talks in secret with two crouching smugglers above
a cove where a small single-masted ship lies at anchor, with a boiling house
smoking in the distance.

- **Source:** a 1659 × 948 comic-style illustration generated on 2026-11-15
  with the built-in image generation tool of the OpenAI Codex CLI (codex-cli
  0.169.0, `image_gen`; model not reported), run under the user's own
  account at the user's request, from the open-plantation prompt in
  `docs/scene-vignettes.md` with the shared style block and negatives. The
  user holds the rights to it. The source file is not kept in the
  repository. No material from the original game was used.
- **Period choices:** English sugar planting in Barbados took off in the
  1640s, worked at first largely by European indentured servants beside a
  smaller number of enslaved Africans ([King's College London, "The
  introduction of sugar
  cane"](https://kingscollections.org/exhibitions/specialcollections/caribbean/sugar);
  Hilary McD. Beckles, ["Plantation Production and White 'Proto-Slavery':
  White Indentured Servants and the Colonisation of the English West Indies,
  1624–1645"](https://resolve.cambridge.org/core/journals/americas/article/plantation-production-and-white-protoslavery-white-indentured-servants-and-the-colonisation-of-the-english-west-indies-16241645/86B4E777C5FE054DF931B07AF0E99BD8),
  *The Americas*; both consulted 2026-11-15). A plantation's works included
  a mill and a boiling house (Cryssa Bazos, ["Sugar Production in 17th
  century Colonial
  Barbados"](https://cryssabazos.com/2018/11/14/sugar-production-in-17th-century-colonial-barbados/),
  2018, a secondary blog source; consulted 2026-11-15). The prompt leaves
  out a windmill, whose date in the Caribbean was not checked. No flag
  shows: the small ship has none, so one picture serves both nations.
- **Process:** `tools/build_vignette.py` reduces the 7 : 4 source to 224 ×
  128 with a box filter, raises contrast (×1.15) and colour (×1.2), and
  quantises to 256 colours (median cut, no dithering, indexed PNG). No
  historical fixes were needed.
- **Rebuild:** `python3 tools/build_vignette.py --scene open-plantation --source <image> --shape landscape`
  (Pillow).

## open-boarded.png

The career opening's Spanish boarding, 224 × 128 (7 : 4), for "You encounter
a Spanish ship … only to find yourself boarded!" (CSTR 35 and 44: France
1560 and Holland 1600, 1640 and 1680): a Spanish officer in a steel morion
and breastplate leaps onto your deck and points his rapier at the captain,
as soldiers with muskets and pikes climb over the rail from a galleon flying
the Cross of Burgundy.

- **Source:** a 1659 × 948 comic-style illustration generated on 2026-11-15
  with the built-in image generation tool of the OpenAI Codex CLI (codex-cli
  0.169.0, `image_gen`; model not reported), run under the user's own
  account at the user's request, from the open-boarded prompt in
  `docs/scene-vignettes.md` with the shared style block and negatives. The
  user holds the rights to it. The source file is not kept in the
  repository. No material from the original game was used.
- **Period choices:** The galleon flies the Cross of Burgundy, a red ragged
  saltire on white, Spain's naval ensign in the period ([FOTW, "Cross of
  Burgundy flag"](https://fotw.info/FLAGS/es_brgdy.html), consulted
  2026-11-15); it survives the reduction at about 12 × 9 art pixels. The
  officer's morion, half armour, red sash and rapier, and the soldiers'
  morions, buff coats, muskets and pikes, follow late 16th and early 17th
  century Spanish soldiers (George Gush, ["Renaissance Armies: The
  Spanish"](https://myarmoury.com/feature_armies_spanish.php), myArmoury;
  Àlex Claramunt Soto, ["Tercios clothing. Spanish military fashion in the
  17th century (1600-1650)"](https://www.1898miniaturas.com/en/?p=3164);
  both consulted 2026-11-15). His small ruff and slashed sleeves suit 1560
  to about 1640; the Dutch 1680 story would show later dress, accepted. The
  muskets' locks are too small to read at 1×. Your own ship shows no flag,
  so one picture serves the French and Dutch stories.
- **Process:** `tools/build_vignette.py` reduces the 7 : 4 source to 224 ×
  128 with a box filter, raises contrast (×1.15) and colour (×1.2), and
  quantises to 256 colours (median cut, no dithering, indexed PNG). No
  historical fixes were needed.
- **Rebuild:** `python3 tools/build_vignette.py --scene open-boarded --source <image> --shape landscape`
  (Pillow).

## open-landfall.png

The career opening's landfall, 224 × 128 (7 : 4), for "Land ho!" and setting
course for the Main (CSTR 3 and 10: England, France and Holland from 1560 to
1660): a galleon under full sail runs through the whitecaps toward a green,
mountainous island fringed with palms, a lookout pointing from the maintop
and sailors crowding the bow.

- **Source:** a 1659 × 948 comic-style illustration generated on 2026-11-15
  with the built-in image generation tool of the OpenAI Codex CLI (codex-cli
  0.169.0, `image_gen`; model not reported), run under the user's own
  account at the user's request, from the open-landfall prompt in
  `docs/scene-vignettes.md` with the shared style block and negatives. The
  user holds the rights to it. The source file is not kept in the
  repository. No material from the original game was used.
- **Period choices:** The ship is a three-masted galleon with square sails
  on the fore and main masts and a lateen sail on the mizzen, a high carved
  stern and a beakhead, the usual galleon rig of the period ([The Mariners'
  Museum,
  "Galleon"](https://exploration.marinersmuseum.org/watercraft/galleon/),
  consulted 2026-11-15). No flag, ensign or pennant shows, so one picture
  serves every nation, and no ship's wheel shows. The island has no
  buildings, as a first landfall should.
- **Process:** `tools/build_vignette.py` reduces the 7 : 4 source to 224 ×
  128 with a box filter, raises contrast (×1.15) and colour (×1.2), and
  quantises to 256 colours (median cut, no dithering, indexed PNG). No
  historical fixes were needed.
- **Rebuild:** `python3 tools/build_vignette.py --scene open-landfall --source <image> --shape landscape`
  (Pillow).

## open-prison.png

The career opening's prison, 224 × 128 (7 : 4), for "a foul prison" (CSTR 22
and 32: France 1600, England 1680 and every Spanish story): in a vaulted
stone cell a ragged young prisoner, his ankle chained to the wall, sits on
straw and stares up at a barred window where the moon shines, beside a
bucket, a cracked jug and a crust of bread, with torchlight behind the
iron-bound door.

- **Source:** a 1659 × 948 comic-style illustration generated on 2026-11-15
  with the built-in image generation tool of the OpenAI Codex CLI (codex-cli
  0.169.0, `image_gen`; model not reported), run under the user's own
  account at the user's request, from the open-prison prompt in
  `docs/scene-vignettes.md` with the shared style block and negatives. The
  user holds the rights to it. The source file is not kept in the
  repository. No material from the original game was used.
- **Period choices:** A plain stone cell with an iron-bound oak door, straw,
  a shackle and chain, a wooden bucket and an earthenware jug: nothing in it
  is tied to one nation or decade. Two small palm trees show through the
  window; they place the cell in the colonies, which fits the Spanish story
  (CSTR 32) but not quite the European prison before transportation (CSTR
  22). They are a few art pixels at 1×; accepted.
- **Process:** `tools/build_vignette.py` reduces the 7 : 4 source to 224 ×
  128 with a box filter, raises contrast (×1.15) and colour (×1.2), and
  quantises to 256 colours (median cut, no dithering, indexed PNG). No
  historical fixes were needed.
- **Rebuild:** `python3 tools/build_vignette.py --scene open-prison --source <image> --shape landscape`
  (Pillow).

## open-night-raid.png

The career opening's night raid, 224 × 128 (7 : 4), for "a sneak attack on a
small ship riding at anchor" (CSTR 15: every Spanish story and England 1620,
1640 and 1680): under a full moon a young man in a leather jerkin, cutlass
in hand, points from the stern of a longboat at a small two-masted ship
riding at anchor with a lantern lit, as smugglers row with rag-wrapped oars
across the bay.

- **Source:** a 1659 × 948 comic-style illustration generated on 2026-11-15
  with the built-in image generation tool of the OpenAI Codex CLI (codex-cli
  0.169.0, `image_gen`; model not reported), run under the user's own
  account at the user's request, from the open-night-raid prompt in
  `docs/scene-vignettes.md` with the shared style block and negatives. The
  user holds the rights to it. The source file is not kept in the
  repository. No material from the original game was used.
- **Period choices:** A ship's longboat was its largest boat, rowed by eight
  or ten oarsmen ([Wikipedia,
  "Longboat"](https://en.wikipedia.org/wiki/Longboat), consulted
  2026-11-15); the picture shows eight. No flag shows on the anchored ship,
  so one picture serves every nation. The first take gave the young man a
  third hand and was regenerated with a corrected prompt. In both takes the
  rowers face the bow, toward the ship, where real rowers face the stern;
  the generator kept this, and it reads as a comic-panel convention, so it
  was accepted.
- **Process:** `tools/build_vignette.py` reduces the 7 : 4 source to 224 ×
  128 with a box filter, raises contrast (×1.15) and colour (×1.2), and
  quantises to 256 colours (median cut, no dithering, indexed PNG). No
  historical fixes were needed.
- **Rebuild:** `python3 tools/build_vignette.py --scene open-night-raid --source <image> --shape landscape`
  (Pillow).

## open-colony.png

The career opening's poor colony, 224 × 128 (7 : 4), for "the colonists are
discouraged. 'Turn back,' they demand" (CSTR 9: England 1600 and France
1620): inside a stockade of upright logs, among thatched huts, a dry well
and a field of stunted maize, a red-bearded settler leader in a battered
morion, sword drawn, points at the gate and the ship beyond while ragged
colonists with pitchforks and spades shout behind him, facing the captain,
sword in hand.

- **Source:** a 1659 × 948 comic-style illustration generated on 2026-11-15
  with the built-in image generation tool of the OpenAI Codex CLI (codex-cli
  0.169.0, `image_gen`; model not reported), run under the user's own
  account at the user's request, from the open-colony prompt in
  `docs/scene-vignettes.md` with the shared style block and negatives. The
  user holds the rights to it. The source file is not kept in the
  repository. No material from the original game was used.
- **Period choices:** Early English colonies were walled with upright logs
  set in a trench, and their first buildings were earthfast, built on posts
  in the ground (Historic Jamestowne, ["Finding the Walls of the
  Fort"](https://historicjamestowne.org/archaeology/map-of-discoveries/palisades/)
  and ["Reconstructing James
  Fort"](https://historicjamestowne.org/archaeology/projects/reconstructing-james-fort/),
  both consulted 2026-11-15). Thatched roofs: je ne sais pas, the sources
  found do not say what the roofs were. The settlers' worn doublets,
  breeches and broad felt hats suit about 1610, and the leader's morion is
  an old soldier's helmet. No flag shows, so one picture serves both
  stories.
- **Process:** `tools/build_vignette.py` reduces the 7 : 4 source to 224 ×
  128 with a box filter, raises contrast (×1.15) and colour (×1.2), and
  quantises to 256 colours (median cut, no dithering, indexed PNG). No
  historical fixes were needed.
- **Rebuild:** `python3 tools/build_vignette.py --scene open-colony --source <image> --shape landscape`
  (Pillow).

## tavern.png

The tavern picture, 224 × 128 (7 : 4), shown on every tavern visit: in a
smoky, low-beamed waterfront tavern at dusk, four sailors play cards and
dice over pewter tankards while a fiddler plays by the casks, with a parrot
on a beam, horn-paned lanterns, a hanging galleon model, and the harbour
seen through the open door.

- **Source:** a 1659 × 948 comic-style illustration generated on
  2026-11-15 with the built-in image generation tool of the OpenAI Codex
  CLI (codex-cli 0.169.0, `image_gen`; model not reported), run under the
  user's own account at the user's request, from the tavern prompt in
  `docs/scene-vignettes.md` with the shared style block and negatives. The
  user holds the rights to it. The source file is not kept in the
  repository. No material from the original game was used.
- **Fix:** the generator scrawled a small signature on the floor in the
  bottom right corner; `patch_fix` covers it with the floor planks just to
  its left (source box 1520–1589 × 900–948 copied to x 1590), since the
  picture must carry no lettering.
- **Period choices:** cards, dice, clay pipes, pewter tankards, stoneware
  jugs, leather jacks, tallow candles and horn-paned lanterns; no glass
  bottles or modern taps asked for. The ships through the door fly no
  flag, so one picture serves every nation.
- **Process:** `tools/build_vignette.py` applies the fix, reduces the 7 : 4
  source to 224 × 128 with a box filter, raises contrast (×1.15) and colour
  (×1.2), and quantises to 256 colours (median cut, no dithering, indexed
  PNG).
- **Rebuild:** `python3 tools/build_vignette.py --scene tavern --source <image>`
  (Pillow).

## divide-plunder.png

The plunder-division picture, 224 × 128 (7 : 4), shown when the plunder is
counted and divided: in a sunlit, whitewashed colonial counting house the
captain rests a hand on an open iron-bound chest of silver, a bald clerk in
spectacles writes in a ledger, and a quartermaster counts coins into the
palm of grinning buccaneers lined up for their share, beside stacks of
rough silver cobs, gold coins, pearls and a brass balance; a ship rides at
anchor beyond the barred window.

- **Source:** a 1659 × 948 comic-style illustration generated on
  2026-11-15 with the built-in image generation tool of the OpenAI Codex
  CLI (codex-cli 0.169.0, `image_gen`; model not reported), run under the
  user's own account at the user's request, from the divide-plunder prompt
  in `docs/scene-vignettes.md` with the shared style block and negatives.
  The user holds the rights to it. The source file is not kept in the
  repository. No material from the original game was used.
- **Fixes:** none. The ledger's writing is illegible scribble and the ship
  through the window flies no flag; both accepted.
- **Period choices:** irregular hand-cut silver and gold cobs rather than
  round milled coins ([American Numismatic Society](https://numismatics.org/europe-in-transformation-the-17th-century/));
  ledger, quill and balance rather than the first brief's abacus (European
  reckoning used pen or counters on a board, [mernick.org.uk](https://www.mernick.org.uk/jettons.htm));
  shares paid out by the quartermaster and a wounded man in the line, after
  the articles and injury compensation in Exquemelin, *The Buccaneers of
  America* (1678, [Project Gutenberg](https://www.gutenberg.org/ebooks/26690)).
- **Process:** `tools/build_vignette.py` reduces the 7 : 4 source to
  224 × 128 with a box filter, raises contrast (×1.15) and colour (×1.2),
  and quantises to 256 colours (median cut, no dithering, indexed PNG).
- **Rebuild:** `python3 tools/build_vignette.py --scene divide-plunder --shape landscape --source <image>`
  (Pillow).

## shipwright.png

The shipwright's portrait, 96 × 128 (3 : 4), shown at the shipyard: a
burly, bald shipwright with a greying beard, rolled linen sleeves and a
scarred leather apron eyes the viewer suspiciously, an adze on his
shoulder, before a ship on trestles being caulked on the beach, a tar
cauldron over a fire, stacked timber and a row of old iron cannon in the
sand.

- **Source:** a 1086 × 1448 comic-style illustration generated on
  2026-11-15 with the built-in image generation tool of the OpenAI Codex
  CLI (codex-cli 0.169.0, `image_gen`; model not reported), run under the
  user's own account at the user's request, from the shipwright prompt in
  `docs/scene-vignettes.md` with the shared style block and negatives. The
  user holds the rights to it. The source file is not kept in the
  repository. No material from the original game was used.
- **Period choices:** an adze, mallets and tarred oakum for caulking, a tar
  cauldron, iron cannon barrels without carriages; no flag on the ship, so
  one picture serves every nation. The ship stands upright on trestles
  rather than careened on her side as asked; accepted (see
  `docs/scene-vignettes.md`).
- **Process:** `tools/build_vignette.py` crops the source to 3 : 4 when
  needed, reduces it to 96 × 128 with a box filter, raises contrast (×1.15)
  and colour (×1.2), and quantises to 256 colours (median cut, no
  dithering, indexed PNG). No historical fixes were needed.
- **Rebuild:** `python3 tools/build_vignette.py --scene shipwright --source <image>`
  (Pillow).

## governor-daughter.png, governor-niece.png, wedding.png, merchant-daughter.png

The courtship scenes, each 224 × 128 (7 : 4): the governor's daughter in a
rose silk gown in a fountain courtyard, the captain bowing to her while her
rival suitor in black glowers; the governor's niece in green laughing with
the captain on a lamplit balcony at night, watched by a duenna with a
rosary; the newly married couple coming down the steps of a whitewashed
church as townsfolk throw petals, a guitarist plays and sailors toss their
caps (shown for every marriage); and the merchant's daughter, in a blue
bodice, apron and coif, coming into her father's warehouse with a basket of
oranges as he beams from his ledger desk.

- **Source:** four 1659 × 948 comic-style illustrations generated on
  2026-11-15 with the built-in image generation tool of the OpenAI Codex
  CLI (codex-cli 0.169.0, `image_gen`; model not reported), run under the
  user's own account at the user's request, from the prompts in
  `docs/scene-vignettes.md` §4.2 and §4.3 with the shared style block and
  negatives. The user holds the rights to them. The source files are not
  kept in the repository. No material from the original game was used.
- **Period choices:** mid-seventeenth-century gowns with pointed bodices,
  full sleeves and broad flat lace collars; the bride wears her best
  coloured silk, not white, which brides took up after Queen Victoria's
  wedding of 1840 ([V&A, "Wedding colour"](https://www.vam.ac.uk/articles/wedding-colour)).
  The off-shoulder line of the gowns became fully established in the 1650s
  ([FIT, Fashion History Timeline, 1650–1659](https://fashionhistory.fitnyc.edu/1650-1659/)),
  a little later than the 1640 the prompts name; accepted, since the
  pictures serve every era from 1560 to 1680. No flag shows in the
  wedding or the merchant's daughter; the governor's daughter has a red
  masthead pennant one or two pixels long at 1×, accepted. The wedding's
  guitar has a modern outline rather than a five-course baroque guitar's;
  it is about 15 pixels wide at 1×, accepted.
- **Fix:** in the governor's niece, a ship off the fort flew a red flag with
  a yellow cross, which reads as Spain's colours of 1785 and would show in
  every nation's town; a patch of sky from just above it paints it out
  (`patch_fix` in the scene's `SCENES` entry).
- **Process:** `tools/build_vignette.py` crops each source to 7 : 4, reduces
  it to 224 × 128 with a box filter, raises contrast (×1.15) and colour
  (×1.2), and quantises to 256 colours (median cut, no dithering, indexed
  PNG).
- **Rebuild:** `python3 tools/build_vignette.py --scene <governor-daughter|governor-niece|wedding|merchant-daughter> --source <image>`
  (Pillow).

## crew-recruits.png, traveller.png, map-seller.png, villain-news.png

Four tavern pictures of about 1640, one picture each for every era and
nation:

- `crew-recruits.png`, 224 × 128 (7 : 4), shown when sailors volunteer in
  the tavern or a beaten crew asks to join: a rowdy group of barefoot
  sailors in canvas slops and knitted caps, among them a tall African
  freedman with an axe, a grey-bearded gunner and a ship's boy, crowd a
  tavern table as the captain writes their names in the articles, coins and
  a stoneware jug beside him.
- `traveller.png`, 96 × 128 (3 : 4): a dusty, well-dressed traveller in a
  wide-brimmed hat, green doublet with a falling linen collar and brown
  cloak slides a letter sealed with red wax across the table, his other
  palm open for payment.
- `map-seller.png`, 96 × 128: a toothless, winking old pirate in a red
  head-scarf, with a gold earring and a peg leg, holds up a torn scrap of
  treasure map by a guttering candle.
- `villain-news.png`, 96 × 128, the villain of the family quest: a scarred
  Spanish nobleman in black and crimson with a standing white collar, a gold
  chain and a swept-hilt rapier, in a torch-lit stone hallway as a servant
  hurries away.

- **Source:** for each, a comic-style illustration (1659 × 948 for the
  recruits, 1086 × 1448 for the portraits) generated on 2026-11-16 with the
  built-in image generation tool of the OpenAI Codex CLI (codex-cli
  0.169.0, `image_gen`; model not reported), run under the user's own
  account at the user's request, from the scene's prompt in
  `docs/scene-vignettes.md` with the shared style block and negatives. The
  user holds the rights to them. The source files are not kept in the
  repository. No material from the original game was used.
- **Process:** `tools/build_vignette.py` reduces each to its shape with a
  box filter, raises contrast (×1.15) and colour (×1.2), and quantises to
  256 colours (median cut, no dithering, indexed PNG). No historical fixes
  were made. Accepted, as too small to read at 1×: the captain's sword in
  the recruits picture has a D-shaped knuckle-guard hilt that looks later
  than 1640; the traveller's letter is folded like a packet with diagonal
  creases; the villain's collar is a plain standing band rather than the
  projecting golilla of Philip IV's court.
- **Rebuild:** `python3 tools/build_vignette.py --scene <id> --source <image>`
  (Pillow), for `crew-recruits`, `traveller`, `map-seller` and
  `villain-news`.

## dig-found.png, dig-nothing.png, reunion-female.png, reunion-male.png, lost-city-inca.png, lost-city-aztec.png, lost-city-olmec.png, lost-city-maya.png

The dig's results, about 1640, each 224 × 128 (7 : 4), for every era and
nation:

- `dig-found.png`: three sailors in a fresh jungle pit by a tall rock lean
  over an opened, iron-bound oak chest of gold and silver coins; the
  captain stands over them with the map.
- `dig-nothing.png`: a beach of empty holes at sunset, one sailor slumped,
  one on his spade, one flinging down his hat; the captain glares at the
  torn map.
- `reunion-female.png` (the sister or the niece) and `reunion-male.png`
  (the father or the uncle): the rescued relative embraces the captain at
  a plantation stockade's open gate, the crew moved behind them, broken
  chains on the ground. The game's female relatives are a sister and a
  niece, so the woman is young, not the older woman of the first brief.
- `lost-city-<culture>.png`: a sea cave by an old wreck's ribs, the
  captain and torch-bearing sailors before spilled chests of the culture's
  objects: Inca (gold sun disc with a face, gold llamas, tumi knives,
  beakers, quipu cords); Aztec (gold feathered serpents, a turquoise
  mosaic mask with shell eyes, jade, a carved stone calendar disc); Olmec
  (a colossal basalt head, jade figures, mask and celts); Maya (a glyph
  stela, a painted ruler statue, a jaguar throne, a jade mosaic mask).

- **Source:** for each, a comic-style illustration (1659 × 948) generated
  on 2026-11-16 with the built-in image generation tool of the OpenAI
  Codex CLI (codex-cli 0.169.0, `image_gen`; model not reported), run
  under the user's own account at the user's request, from the scene's
  prompt in `docs/scene-vignettes.md` with the shared style block and
  negatives. The user holds the rights to them. The source files are not
  kept in the repository. No material from the original game was used.
- **Period references for the objects:** Smarthistory, "Mosaic mask of
  Tezcatlipoca" and "Turquoise mosaics, an introduction" (Mixtec-Aztec
  turquoise mosaics, 15th–16th century, British Museum),
  https://smarthistory.org/mosaic-mask-of-tezcatlipoca; The Metropolitan
  Museum of Art, "Ancient Andean Metalworking (900–1532 CE)" (Inca camelid
  effigies, tumis), https://www.metmuseum.org/essays/ancient-andean-metalworking;
  Smarthistory, "Olmec art" (colossal basalt heads, jade figurines),
  https://smarthistory.org/americas-before-1900/north-america-to-1500/mesoamerica/olmec-art;
  The Met, Piedras Negras Stela 5 (a ruler on a jaguar-pelt throne),
  https://www.metmuseum.org/art/collection/search/318413.
- **Process:** `tools/build_vignette.py` reduces each to its shape with a
  box filter, raises contrast (×1.15) and colour (×1.2), and quantises to
  256 colours (median cut, no dithering, indexed PNG). No historical fixes
  were made. Accepted, as too small to read at 1×: the distant ships'
  masthead pennants (one or two art pixels; their large flags are the
  correct red ragged saltire on white); the tumis carry a figure on the
  handle in the Lambayeque/Chimú manner rather than plain Inca blades;
  the captain's sword has a D-shaped knuckle-guard as in the earlier
  pictures. The lost cities themselves are the original game's fiction:
  the Olmec culture ended many centuries before the Spanish came, and
  its objects are shown only as the game's "lost Olmec treasure".
- **Rebuild:** `python3 tools/build_vignette.py --scene <id> --source <image>`
  (Pillow), for each of the eight ids above.
