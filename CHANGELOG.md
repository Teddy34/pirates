# Changelog

Every change to the game, its tools or its documentation is recorded here,
newest first. Add an entry under **Unreleased** in the same commit as the
change. Group entries under *Added*, *Changed*, *Fixed* or *Removed*, write
them for a player or maintainer (what changed and why, not which files), and
note any deliberate departure from the original's mechanics.

Changes merged before this log was started (2026-11-13) are in the git
history.

## Unreleased

### Changed

- Sword fights no longer show the voyage status bar (wind, sails, food,
  gold, nearest town), whose fields meant nothing in a fight. The fight's
  panel moves to the top in a chunky pixel frame, and its two morale bars
  become one tug-of-war bar of 47 cells: the foe's share fills from the
  left, yours from the right, since the two always add up to 47 as in the
  original. In crew battles each side's crew count sits under the bar with
  a sailor icon.

- Buttons that carry on, agree or finish (Continue, Yes, Done, Take...)
  now show a tick instead of a right arrow, which read as "press the right
  arrow key" rather than Enter or Space. "Wait..." shows an hourglass and
  "Keep walking" a boot; the arrow stays on the on-foot "Walk east" control.

- Sea battle ships are now chunky pixel-art sprites with a design of their
  own for each ship type, so you can tell what you are fighting by its
  outline: the pinnace is a small two-master with square sails, the sloop a
  single gaff-rigged mast with jibs on a long bowsprit, the barque a
  three-master with a triangular mizzen, the cargo fluyt a round bow and a
  tall narrow stern, the merchantman has castles fore and aft and a row of
  gunports, the frigate a long low dark hull with a yellow gun band, the war
  galleon four masts, towering castles and two rows of guns, and the
  galleon a broad red-brown hull with a high gilded stern and lantern. The
  ships are drawn at a fixed coarse resolution in whole screen pixels
  instead of being redrawn finer on large and high-density screens, which
  made them look sharp and thin. Sail state, damage and the flag show as
  before; hit areas and battle rules are unchanged.

- In sword fights you now look like the captain in the scene pictures:
  bareheaded with dark hair tied back and a short beard, in a dark-blue coat
  with brass buttons and a red sash. You used to wear a red coat, which
  clashed with the blue-coated hero of the pictures. Your opponents keep a
  different colour. Their default captain's coat is now red, and French
  captains and guards wear red rather than France's blue, so you are the
  only fencer in blue. Every opponent wears a hat, helmet or bandana, so the
  two fencers also differ in outline, not only in colour.

### Fixed

- Fencing practice in town is now fought in a town street (the alley
  backdrop) instead of on a ship's deck (#140). The `?preview=sword-practice`
  preview opens it from a town and returns to the town menu.
- A town you walked into is now left with "Leave on foot" and a boot icon,
  not "Put to sea" with a ship (#139); the log says the party left on foot.
  "Leave town" on the approach to a town reached overland shows the boot
  too. Towns entered by ship keep "Put to sea". The `?preview=in-town` and
  `arrival-land` previews now put the landing party ashore at the town.
- In a dialog whose buttons wrap onto two lines of different widths (the
  town menu on a wide screen), the left and right arrows now stay on the
  focused button's own line instead of jumping back up to the first one
  (#108), and stop at the end of the line. Up and down prefer the button
  above or below in the same column.

- Fort battles at small island towns such as St. Eustatius: running your
  flagship ashore by the town now lands your men even where a fort stands
  right beside the town. The shore round such a fort used to count as
  running aground, so on an island too small to keep its forts away from the
  town, much of the shore by the town ended the attack with "your men refuse
  to march". As in the original, running ashore next to a fort by the town
  now gets you through; a fort's shore away from the town is still running
  aground. Check it with `?preview=fort-battle-island`.

- The shipwright's yard no longer shifts under the pointer as you trade
  (#118): selling a cannon, repairing or selling a ship keeps every button
  where it was, so repeated clicks on Sell land on the same button. The note
  of the last action has its line from the start, the Sell-all cannon button
  stays (greyed out) when no more than one cannon can be sold, "Sound" takes
  a Repair button's height, a sold ship leaves a "Sold" row in her place
  until you leave the yard, and the page keeps its scroll position and
  picture size when it redraws.

### Removed

- The Speed readout is gone from the status panel at sea, ashore, in sea
  battles and in sword fights (#136). Fast travel's "×2" now leads the date
  instead, the blocked walking party is still announced in the log and on
  the map, and the sword fight's panel still names your weapon.

- The code-drawn pictures that showed while a scene's real art was still
  loading, and then flickered into the art, are gone, in the dialogs and
  behind sword fights alike. Until a picture arrives its frame stays empty
  (a sword fight shows plain sky and ground), and each dialog repaints as
  soon as its own picture has loaded rather than after every picture.

### Changed

- The controls under the map (steering, sails, zoom, pause, logbook, sea
  chart and the maps, dig or fire button) now match the dialogs' buttons
  (#136): chunky brass pixel buttons, each showing only a pixel icon. The
  text labels are gone; each button keeps its name for screen readers and
  shows it, with its key, as a tooltip. The icons follow the mode: arrows
  when walking ashore, swords, arrows and a thrust in a sword fight, and the
  pause button turns into a play button while the game is paused.

- The tavern describes its room instead of listing figures (#117): a line of
  atmosphere, livelier in a more prosperous town, and a word on any special
  guest (the villain, the traveller, the map seller), with your gold kept
  below. The Sailors and Treasure map rows are gone: the sailors' button
  disappears once you have spoken to them, the map seller now says how many
  of the map's 4 pieces you already hold (or that his would be the first),
  and the treasure map's caption gives its piece count.

- Sword fights now take place before real comic-style backdrops instead of
  the code-drawn ones: the waist of a galleon at sea with its guns run out
  (boarding, the mutiny and practice), a moonlit street of a Spanish
  colonial town (the guard, the villain, the rival suitor and the attack by
  land), and a fort's stone wall at night flying the town's period flag
  (storming the walls). The code-drawn backdrops remain until the pictures
  load.

- The sword fight in a back alley and the Pirate Hall of Fame now show real
  comic-style art: the captain crossing rapiers with an anonymous swordsman
  in a moonlit alley (one picture for the guard, the villain and the rival
  suitor), and a panelled hall of sea captains' portraits with an empty
  frame waiting above the open record book.

- A mutiny and imprisonment now show real comic-style art: the captain
  drawing his cutlass alone at the rail as a bare-chested ringleader and
  his armed crew come up the quarterdeck ladder, and the wounded captain on
  the straw of a stone cell, tally marks on the wall and a guard's shadow on
  the door. Both are flagless, so they serve every era and nation.

- The four retirement endings now show real comic-style art of the old,
  grey captain: mending a net outside a seaside cottage, at ease on a
  plantation terrace above the cane fields, pointing out his old flagship
  from a balcony over the harbour with an old shipmate, and honoured by a
  king on a palace terrace. They are flagless and show no wife or family,
  so each serves every era, nation and career, married or not.

- Attacking a town now shows real comic-style art. By land, the captain
  points his cutlass at a town's palisade as his buccaneers and a drummer
  march out of the jungle under the militia's fire; against a fort,
  buccaneers come over the ramparts on scaling ladders while the captain
  fights the fort's commander beside a toppled cannon. Both fly the town's
  period flag.

- Losing a ship now shows real comic-style art: a ship driven onto a reef
  with her crew clinging to a spar, and, when your last ship is gone, the
  castaway captain fed by islanders on a palm beach while a small ship's
  boat rows in to rescue him. Both are flagless, so they serve every era
  and nation.

- Capturing the treasure fleet or the silver train now shows real
  comic-style art: gold passed hand to hand from a beaten Spanish galleon
  flying the Cross of Burgundy, and buccaneers lifting silver bars from a
  broken mule train while the escort flees.

- Inland towns and the sea fights now show real comic-style art. Arriving
  at an inland town shows the landing party halting above a palisaded
  town, and its town menu a sunlit plaza; both fly the town's period
  flag. Boarding, a prisoner's offer, plundering a prize, an enemy ship
  blowing up, your own ship going down, a ship outrunning the battle and
  night ending a chase each get one picture, drawn without readable flags
  so it serves every nation.

- The dig's results now show real comic-style art: the crew round an
  opened oak chest in a jungle pit, an exhausted crew among empty holes at
  sunset, a rescued sister or niece and a rescued father or uncle
  embracing the captain at a plantation gate, and the four lost cities'
  treasure in a sea cave by an old wreck, each with its culture's
  objects (an Inca sun disc and llamas, an Aztec turquoise mask and stone
  calendar, an Olmec colossal head and jades, a Maya stela and jaguar
  throne).

- When the lookout reads a ship's colours, the dialog now shows her stern
  close at hand with the flag streaming from it, a stern for each period
  and one for small craft. The flag follows the nation, the era and the
  ship's role: Spain's Cross of Burgundy (in 1680 the navy flies the
  royal arms), England's St George's cross and then the red ensign,
  France's white cross on blue for merchants and plain white for the
  king's ships from 1640, the Dutch orange and later red tricolour. A
  pirate flies a plain red "no quarter" flag; a named pirate flies his own
  colours, one new design per surname, as the original tied its pirate
  flags to captains' names; skull-and-crossbones flags, which came about
  1700, are left out. `?preview=colours` shows every flag.

- When a sail draws nearer ("She looks like a …"), the dialog now shows
  the ship: one picture per ship type and period (1560–1600, 1620–1640,
  1660–1680), from the high-castled four-masted galleons of the 16th
  century to the long, low frigates of the 1670s, with a two-masted lateen
  barque and a single-masted sloop. She flies no flags yet, as the lookout
  cannot make out her colours. Before 1660 the frigate is drawn as a fast,
  race-built galleon, as the original names it. Each picture loads only
  when shown, with a code-drawn ship as the fallback.

- The tavern's visitors now have real pictures: sailors crowding the
  captain's table to sign the articles when recruits join, a dusty
  traveller sliding a sealed letter across the table, a toothless old
  pirate holding up a scrap of treasure map, and the scarred Spanish
  nobleman who holds your lost relatives. Each is pixelated from a
  comic-style illustration; the code-drawn pictures stay as the fallback
  until the art loads.
- Courtship and marriage now have their own pictures instead of borrowing
  the governor's and merchant's portraits: the governor's daughter in a
  fountain courtyard with her jealous suitor, the governor's niece laughing
  on a lamplit balcony under a duenna's eye, the merchant's daughter with a
  basket of oranges in her father's warehouse, and a wedding on the church
  steps for every marriage. The bride wears coloured silk, as brides did
  before white gowns caught on in the 1840s. Each keeps a code-drawn
  fallback until its image loads.
- The career opening now has real art for every picture: the audience at
  court, the sugar plantation, the Spanish boarding (the galleon flies the
  Cross of Burgundy), the landfall in the West Indies, the prison cell, the
  night raid on a ship at anchor and the poor colony join the sword fight,
  sea chart, buccaneer camp and quarterdeck. Each keeps its code-drawn
  picture as the fallback until the image loads.
- Dividing the plunder now has real art: in a sunlit counting house the
  captain stands by an open chest of silver while a clerk keeps the ledger
  and the quartermaster pays out each buccaneer's share.
- The vignette-art workflow now always works in its own git worktree
  from an up-to-date `main` and stages files by path, so parallel
  sessions no longer sweep each other's files into their commits.
- Vignette art is now generated by default through the Codex CLI's
  built-in image generation instead of a prompt handed to the user; the
  user's own image provider remains an option.
- Menus and dialogs now fill the screen in an arcade-style frame. The scene
  picture sits whole and framed in the top left corner of the page, at the
  largest whole-number scale that fits, with the text beside and below it
  (the merchant goes from 1× to 2× on a laptop and 3× on a desktop screen,
  beside his table). On phones
  the picture is a band on top, shrunk or left out when the page would not
  fit on one screen. Text and trading tables are larger, buttons are
  bevelled pixel controls with a pixel icon for their action, the arrow keys
  move between them, and the action bar sits at the bottom of the screen.
- Arriving at a town, Enter now picks "Leave town": attacking a town,
  storming its walls, closing for battle, fighting a suitor's duel, selling a
  ship with cargo overboard, and overwriting or deleting a save are never the
  default button.
- The shared image-generation prompt for vignettes now asks for a normal
  inked and coloured comic panel instead of pixel art: the build tool does
  the pixelation, and generated fake pixels blur after reduction.
- The shared vignette prompt no longer names an artist: generators refuse
  or distort prompts that do, so the comic style is described in plain
  words.

### Removed

- The town menu no longer shows the governor line ("Audience available"): the
  Governor button appears only when you can see him.

### Added

- Real art for three career-opening pictures: the sailing master's sea
  chart of the Caribbean, the buccaneer camp on a Hispaniola beach (the
  French 1660 and 1680 stories) and the quarterdeck confrontation before
  the opening duel. Each keeps its code-drawn picture as the fallback
  until the image loads.
- The career opening's sword fight and the sailing master's portrait now
  have real comic-style art, generated with Codex and pixelated, with the
  code-drawn pictures as their fallback.
- The tavern now has real art: sailors at cards and dice, a fiddler, a
  parrot on a beam and a hanging ship model, with the harbour at dusk
  through the open door. One picture serves every nation (no flag shows);
  the code-drawn room stays as the fallback.
- The shipwright now has a real portrait: a burly, bald shipwright with an
  adze on his shoulder eyes you suspiciously, before a ship being caulked
  on the beach, a tar cauldron and a row of old cannon in the sand.
- The town menu of a coastal town now shows real art: stevedores at work
  on a busy stone quay, ships at anchor in the bay, and a distant fort on
  the headland flying the town's period flag (one version per nation, the
  Dutch flag following the era, as on the harbour approach).
- The bartender now has a real portrait: a burly, one-eyed tavernkeeper
  with a big grey moustache drying a pewter tankard behind his counter,
  among casks, stoneware jugs and a chalked tally slate.
- Sighting a sail now shows a real picture: the captain shades his eyes at
  the rail beside his men, staring at a distant ship on the horizon. No
  spyglass, since telescopes only appear in 1608.
- The barmaid now has a real portrait: a winking, curly-haired barmaid in a
  red laced bodice holding up three pewter tankards in a crowded,
  candlelit tavern.
- The merchant now has a real portrait: a plump, beaming trader in his
  apron, arms spread in welcome among sugar barrels, hides and cacao sacks.

- Sailing into a coastal town now shows a real picture: the captain at the
  rail, looking across the harbour at a stone fort and a colonial town. The
  fort flies the town's flag as it looked at the time: the Cross of
  Burgundy for Spain, St George's cross for England, the royal white for
  France, and for Holland the orange Prince's flag before 1660 and the red,
  white and blue flag from 1660.

- A vignette art workflow for maintainers (`vignette-art` skill). It covers
  a research brief and diffusion prompt for each scene, a historical-accuracy
  review of the returned image with a checklist of period traps (flags,
  ship's wheel, telescopes, hats), and one build tool,
  `tools/build_vignette.py`, for every vignette. That tool replaces the
  title-only one and rebuilds the title picture pixel for pixel. The
  vignette brief now gives period flags in pictures instead of the map
  colours.

- The game is now called **RetroPirates!**. The title screen shows "Retro"
  in pixel letters next to "Pirates!" in a script face, which reflects the
  game's two styles. Below the title is a framed picture of a sloop under
  full sail, seen from ahead and to one side. For now it is a code-drawn
  placeholder until real art is approved. The start screen picks up the
  arcade look with a chunky pixel border, pixel-edged buttons and fields,
  and monospace labels. The era description stays in a readable serif. The
  browser tab, README and server message use the new name. Existing saves
  are unaffected.
- The project's art direction is written down: arcade-retro pixel graphics
  overall, with historically accurate vignettes in the manner of 1980s
  Franco-Belgian historical comics.

- A default change workflow for maintainers and coding agents: each feature
  or fix is built in its own worktree, opened as a pull request, reviewed
  once independently, and merged automatically once tests pass; very small
  details may go straight to `main` after the unit tests.
- Reviews are now done by a separate Claude agent; cross-review with Codex
  is paused while Codex is unavailable.

- Courtship and marriage. At favour 2 or more with a town's nation, an
  audience ends with dinner and the governor's daughter or niece, courted by
  a rival suitor. Your charm is (personal wealth / 499 + twice your rank with
  that nation + difficulty), divided by two for a niece, then halved, and
  doubled with Wit and Charm. Making conversation can win her as an
  informant who reports the treasure fleet and silver train on later visits;
  proposing needs charm 4 or more and a sword duel with the suitor (losing
  sets reputation to −1). Winning marries her and pleases the governor (mood
  +2). After leaving a merchant, a single captain has one chance in ten to
  meet his daughter: proposing needs 400 personal wealth (200 with Wit and
  Charm) and 500 gold for her father's debt. Your father-in-law greets you by
  your purse, sells at three quarters of the usual price, trades even in a
  Spanish town that would turn you away, and you dine with your wife after
  each visit. Marriage now counts in the retirement score and career
  summary. As in the original, the debt is 500 gold although the text says
  5,000; one marriage blocks every other; and the suitor's surname comes
  from the original's name-id arithmetic, so a French governor's daughter
  may be courted by an Englishman. Departures: the informant's message names
  a niece as a niece (the original always says "daughter"), and the courtship
  scenes use the governor and merchant portraits until their own pictures
  exist. `?preview=governor-daughter`, `governor-niece`,
  `governor-informant`, `governor-wife`, `merchant-daughter` and
  `merchant-family` open them, and `make test-browser` checks them.
- Ten save slots. "Save voyage" in a town now asks which slot to use and
  checks before overwriting a used one. The start screen's "Load a voyage"
  lists the slots with the captain, date, town, ships and gold, and can
  delete a save. The autosave still follows the voyage and is what "Continue
  saved voyage" resumes; retiring clears only the autosave. The original kept
  a single save.
- The logbook has a Personal status page, as in the original: married or
  single, age, health
  (fine, good, fair or poor) with the wound count, personal wealth, land,
  reputation, difficulty, and your rank and standing with each nation.
- When your health worsens, the next month end tells you, and the log
  records it. At poor health the notice warns that the next division of the
  plunder ends your career. The original never announced it.

- Fort battles: attacking a fortified town from the sea is now fought with
  the sea-battle controls against its forts, which stand on rocky headlands
  along the coast beside the town's harbor. Each fort has 12 guns, never
  moves, always turns its guns on you and cannot be sunk, though your
  broadsides kill its gunners, dismount its guns and breach its walls; a fort
  with no guns left falls silent. Your broadside bears on the nearest fort
  still firing. You sail at half speed. Bring your flagship alongside the
  town quay to land her crew and storm the walls (alert +16, reputation −2, the garrison left at half the
  soldiers plus a tenth of the surviving gunners). Running aground, the fort's
  rocks included, leaving the field, nightfall or sinking ends the attack.
  The briefing says to land at the quay, not under the fort. Departure from
  the original: there you get through by touching the fort itself or the
  shore beside it; the port's landing place is the quay, and the field's
  layout is the port's own. The field turns with the wind so you always
  start upwind of the harbor, on a broad reach toward the quay; the original's
  start is not known. Also unlike the original, where all of a town's
  forts fight as one, with one 48-gun broadside for four forts, which made a
  four-fort town all but impossible to take from the sea, each fort fires
  its own 12 guns from its own place, and a distant fort misses more often.
  Check it with `?preview=fort-battle`.
- The captain's log is hidden during sea battles, as in sword fights, so it
  no longer covers the battle.
- Full-screen pixel-art sea chart of the Caribbean, painted as an old map
  from the era's navigation map, with every town and your ship marked.
  Open it with C, the Chart control at sea or the logbook; the voyage pauses
  while it is open. Check it with `?preview=chart`.
- Town gazetteer beside the chart: search, filter by flag, sort by name or
  distance, and pick a town to see its City Information figures and its
  distance and bearing from your ship.
- This changelog.
- Era panel on the start screen: choosing an era shows its title, its
  difficulty as the manual rates it (Easy to Very hard, also shown as
  pips), whether it is the suggested era for a first game (1660), a short
  description with three highlights, and your career for the chosen flag:
  its name, advice for that era and nation, and the ships, crew, guns,
  gold and any rank it starts with. The descriptions and advice are written
  for the port from the research archive, not quoted from the manual.

### Changed

- The title screen picture is now real art: a three-masted English warship
  under full sail off a palm-fringed island with a fort, pixelated from a
  comic-style illustration. It replaces the code-drawn sloop, which remains
  only as a fallback while the image loads. The picture keeps the
  artwork's 3 : 2 shape (240 × 160) instead of being cropped to the dialog
  format. The ship flies St George's cross, as English ships of the period
  did, and the island's Spanish fort flies the Cross of Burgundy, the
  Spanish flag of the period, rather than the red-yellow-red flag of 1785. The picture uses up to 256 colours:
  vignettes are no longer held to a 32-colour palette, since the retro look
  comes from the pixel size.

- Fort battles are fought on the real coast round the town, cut from the
  sailing map and painted the same way, north up, so its capes, bays and
  islands look as you know them; the forts stand on the shore beside the
  town as small pixel-art forts in the style of the town markers. The view
  is zoomed out, and you sail at full battle speed (the original halves it)
  so the forts' broadsides can be dodged. Land by running your flagship
  ashore by the town itself: no landing place is marked, and running onto any
  other shore, a fort's included, is running aground. You start in open water
  upwind of the town wherever the coast allows. Departure from the original,
  which draws each town's fort battle on its own hand-made harbor map.
- Fast travel (T, at sea or on foot) now runs time twice as fast instead
  of five times, so the ship stays steerable; T still toggles it off, and any
  voyage event still clears it. The speed readout starts with "×2" while it is
  on. Departure from the original, whose fast mode is five times faster.
- The shipwright works on one screen (#74). It lists every ship with her
  hold and her guns, and a Repair and a Sell button for each, plus Repair
  all when several are damaged. Cannon sell one per click, faster while the
  button is held, or all the spare ones at once. You stay in the yard after
  each sale or repair. Deliberate departure: the original picks ships from
  a list in separate menus; prices and cash rules are unchanged. The fleet
  still shares one cannon count, shown filling each ship in turn.

- The era menu uses the manual's titles: 1560 is "The Silver Empire" (was
  "Early explorers") and 1680 is "Pirates' Sunset".

- The barmaid's trust is hidden to keep the tavern in character: no trust
  counter, rules text or "+1 trust" label. Her manner hints at progress in
  four bands, the menu offers the original's "A drink, lass" and "A drink and
  some company", and winning her uses the original "won the barmaid's heart"
  line.
- Code-quality pass driven by SonarJS static analysis, with no change to
  play. The seven browser smoke checks share one harness
  (`tools/browser-harness.mjs`) instead of seven copies of the same 90 lines
  of server, Chromium and DevTools code. The `?preview=` states are one table
  instead of forty `if` branches. The sea chart, terrain, sea, fencer and
  backdrop painters, the sword-fight and sea-battle steps, the keyboard
  handler and the voyage status bar are split into small named functions.
  Painted pixels, fights and battles were checked to match the previous code
  exactly. Terrain chunks paint about 15% faster.

### Fixed

- The title screen now scrolls inside its pixel frame. Before, the page
  slid over and under the frame's edges.

- The local `?preview=` states now start from a fixed random seed, so each
  one opens the same way every time. Before, the governor sometimes offered
  a mission ahead of the promotion that `?preview=governor-promotion` exists
  to show, and the villain browser check failed about one run in three.

- A fort battle now puts the town on alert like any sea battle fought near
  it (24 − 2 per cell away, about +24 at the town), whether you land, run
  aground, are driven off or fight until nightfall, as in the original. A
  failed attack from the sea is no longer free.
- Ashore, the North and South buttons now light up while held, like West
  and East, whether you hold the button or the arrow key. Holding them also
  walks like West and East do, so holding two buttons at once walks
  diagonally (#78).
- After a drink with the barmaid, the only choice is now "Return to the
  tavern"; another round starts from the tavern, as in the original.
- Loading a voyage saved in a town now reopens that town instead of putting
  you at sea outside it. The visit carries on where you saved, so a reload
  gives no second governor audience or recruiting round. This departs from
  the original, which resumed at sea on the town's departure cell.
- The start screen's dropdown lists (era, flag, difficulty, ability) are
  readable again: they had cream text on a white list in some browsers and
  now use the game's dark panel colours.
- The start screen's era highlights no longer describe one flag's career:
  1600 always said "Start as a Dutch trader" and 1680 "English pirates
  start at peace with all", whatever flag was chosen. They now read "No
  Dutch towns, only smugglers" and "Cheap sugar on the sugar islands";
  each career's own advice still covers its start.
- The captain's name on the start screen can contain C and L again; game
  keys no longer fire while typing in a form field.
- The sea chart frees its canvas memory on close, ignores non-primary mouse
  buttons, lets its town panel scroll on short screens, and the game stops
  redrawing underneath it.
- The browser smoke checks no longer fail intermittently when Chromium is
  still writing its profile as a check finishes.
- `make syntax` now checks every source file: four modules, including the
  sea-battle rules and renderer, were missing from its hand-kept list.

### Removed

- An unreachable second `?preview=arrival` branch (the first always matched),
  an unused notice dialog and unused function parameters.
