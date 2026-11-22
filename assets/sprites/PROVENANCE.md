# Sprite art provenance

## ship-stacks-battle.png, ship-stacks-map.png

The sprite-stacked ships of the sea battle and the sailing map
(`src/ship-stacks.mjs`): one row per ship type and rig state (sails full,
battle or furled; whole rig or foremast lost), each row a strip of top-down
slices, ground slice first, the bow pointing down the cell. Cell sizes, rows
and mastheads are in `src/ship-stack-data.mjs`.

- **Source:** original art drawn in code by Claude Code: for every ship type
  `tools/build_ship_stacks.py` draws four orthographic pixel-art views (top,
  side, front, back) of each part (hull, bowsprit, each mast with its sails,
  the jibs) after the battle designs of `src/battle-ship-sprites.mjs`, with
  the same palette. No image generator and no material from the original
  game was used.
- **Process:** each part is carved into slices with the visual-hull `carve`
  of the sprite-stacking skill (`tools/sprite-stacking/`, copied from
  github.com/danielwh2/sprite-stacking at 6fecdfd, by Daniel White, MIT
  licence, `tools/sprite-stacking/LICENSE`), and the parts' volumes are
  joined.
- **Rebuild:** `python3 tools/build_ship_stacks.py` (Pillow, numpy);
  `--check DIR` also writes each row's four views and the skill's check
  sheet for review.

## fencers.png

The sword fight's fencer bodies: 384 × 320, one row per character (your
captain, an enemy captain, a guard, the villain, a sailor) and one 64 × 64
cell per body pose (guard, lunge, two walking strides, step back, kneeling
surrender), each body's feet on the cell's anchor (26, 61). The sword arm
and blade are drawn over them in code (`src/fencer-sprites.mjs`), so the
three weapons and three lines keep their poses. The coats of the captain
and guard rows carry alpha 254 and the sailor's headscarf alpha 253, so the
game recolours them to an opponent's nation or a crew's colour.

- **Source:** five pose sheets, 2172 × 724 each, generated on 2026-11-22
  (a second round, replacing the sheets of 2026-11-17) with the built-in image generation tool of the OpenAI Codex CLI
  (codex-cli 0.169.0, `image_gen`; model not reported), run under the
  user's own account at the user's request, from the prompts below. The
  user holds the rights to them. The source files are not kept in the
  repository. No material from the original game was used.
- **Process:** `tools/build_fencers.py` keys out the flat green background,
  finds the six figures, picks 16 colours per sheet (k-means, contrast
  ×1.15, no colour boost), and reduces each figure at one scale per sheet
  (the upright walking figure 37–41 art pixels tall): each art pixel takes
  the colour covering most of its block, the darkest colour (the ink
  outline) weighted ×1.8,
  lone pixels take their neighbours' colour, and a blank face gets an eye
  pixel. Each body is placed on the cell's anchor.
- **Second round (2026-11-22):** the first sheets, reduced by averaging,
  read as mud at this size. The prompt now asks for flat two-tone colouring
  without hatching, slightly large heads with a clear profile, and the
  sword-side arm hidden behind the body (the game draws that arm); the
  reduction keeps flat colours and outlines instead of averaging them.
- **Period notes:** the enemy captain wears a broad-brimmed felt hat, not
  the tricorne of the earlier code-drawn sprite (tricornes date from about
  1690); the guard wears a morion. See the period checklist in
  `.claude/skills/vignette-art/SKILL.md`.
- **Rebuild:** `python3 tools/build_fencers.py --source player=<png>
  --source captain=<png> --source guard=<png> --source villain=<png>
  --source sailor=<png>` (Pillow, numpy).

### Prompts

Every sheet used one prompt with only the man's description (and a few
negatives) changed. The prompt, with `<MAN>` for the description (for the
men in hats or a helmet, `hat` was left out of the negatives; the sailor's
said "head to feet" and, after the image tool once blocked it as violent,
"ready stance" for "fencer's guard", "as a dancer does" for "as a fencer
does", and no "in surrender"):

```text
A character pose sheet in the style of a finished comic-book panel, hand-inked and coloured. Clean, confident dark brown ink outlines; flat cel colouring: exactly two tones per material (a light tone and one shadow tone) with crisp edges; no hatching, no cross-hatching, no texture strokes, no gradients. Light from the upper left. Drawing in the manner of 1980s Franco-Belgian historical maritime comics: meticulous, period-accurate costume, stylised comic proportions with a slightly large head (about one sixth of his height) and a clearly drawn face in profile (eye, nose, mouth); clear, well-separated colours so each garment reads at a glance even when the picture is shrunk very small; bold, simple shapes and a thick dark outline around the whole figure. The Caribbean between 1560 and 1680.

The sheet shows the same man six times, full figure, head to boots, in a single straight row, evenly spaced, all the same size, all in strict side view facing RIGHT, feet on one common invisible ground line, no figure overlapping another. The man: <MAN> He holds no weapon and wears no scabbard. His right arm is completely hidden behind his body: not visible at all, no hand in front of his chest. His left arm is raised behind him for balance, as a fencer does.
Poses, from left to right:
1. fencer's guard: knees bent, front foot forward, feet a stride apart, body upright.
2. deep lunge forward: front knee bent far forward, back leg straight, torso leaning forward.
3. walking forward, left foot forward, mid-stride, knees slightly bent.
4. walking forward, right foot forward, mid-stride, knees slightly bent.
5. stepping back: weight on the back leg, torso leaning back, front foot lifted slightly.
6. kneeling in surrender on one knee, head bowed, both hands empty, left hand open and lowered.
Background: one plain flat bright green colour (#00B140) everywhere, no ground, no shadows on the ground, no scenery, and no green anywhere on the figure.

Avoid: pixel art, pixelated, dithering, text, letters, numbers, labels, captions, logos, signature, watermark, border or frame, sword, sabre, scabbard, gun, hat, tricorne, modern objects, photorealism, 3D render, blur, anime style, fantasy armour, front view, three-quarter view, figures facing left, figures of different sizes, cropped feet.
Format: landscape, 3:1 aspect ratio if supported, otherwise the widest supported landscape size (for example 1536 x 1024).
```

- **player** (your captain, the scene pictures' recurring captain): the captain, a lean man about thirty, sun-weathered face, dark hair tied back, short beard, bareheaded, clearly blue (medium cobalt blue, not grey) knee-length coat with brass buttons, bright red sash knotted at the hip, pale cream breeches, tall very dark brown, almost black boots.
- **captain** (enemy captains and suitors): a ship's captain about forty, weathered face, moustache and pointed beard, wide-brimmed black felt hat with a turned-up side, clearly red (medium brick red) knee-length coat with gold buttons, brown leather belt, pale cream breeches, tall very dark brown, almost black boots. Extra negatives: cocked hat, three-cornered hat, blue coat, sash.
- **guard** (guards and soldiers): a Spanish colonial garrison soldier about twenty-five, clean-shaven with a moustache, a polished steel morion helmet with a curved brim and a crest, clearly red (medium brick red) knee-length soldier's coat with yellow brass buttons, brown leather belt, dark grey-brown breeches, tall very dark brown, almost black boots. Extra negatives: cocked hat, three-cornered hat, blue coat, sash, breastplate covering the coat, plumes.
- **villain** (the villain): a sinister nobleman about forty-five, gaunt pale face, thin black moustache and pointed beard, wide-brimmed black felt hat with a long plum-purple feather, black knee-length coat with plum-purple trim and dark silver buttons, black breeches, tall black boots. Extra negatives: cocked hat, three-cornered hat, blue coat, red coat, sash, cape, eye patch.
- **sailor** (sailors, mutineers and sparring partners): a common sailor about twenty-five, stubble, a bright red cloth kerchief knotted over his head, loose off-white linen shirt with rolled sleeves, open collar, no coat, wide brown canvas breeches ending below the knee, bare lower legs, plain dark brown leather shoes. Extra negatives: cocked hat, three-cornered hat, coat, waistcoat, boots, striped shirt, sash, eye patch, peg leg.
