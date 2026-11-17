# Sprite art provenance

## fencers.png

The sword fight's fencer bodies: 384 × 320, one row per character (your
captain, an enemy captain, a guard, the villain, a sailor) and one 64 × 64
cell per body pose (guard, lunge, two walking strides, step back, kneeling
surrender), each body's feet on the cell's anchor (26, 61). The sword arm
and blade are drawn over them in code (`src/fencer-sprites.mjs`), so the
three weapons and three lines keep their poses. The coats of the captain
and guard rows carry alpha 254 and the sailor's headscarf alpha 253, so the
game recolours them to an opponent's nation or a crew's colour.

- **Source:** five pose sheets, 2172 × 724 each, generated on 2026-11-17
  with the built-in image generation tool of the OpenAI Codex CLI
  (codex-cli 0.169.0, `image_gen`; model not reported), run under the
  user's own account at the user's request, from the prompts below. The
  user holds the rights to them. The source files are not kept in the
  repository. No material from the original game was used.
- **Process:** `tools/build_fencers.py` keys out the flat green background,
  finds the six figures, reduces each with a box filter (one scale per
  sheet, so the upright walking figure is 37–41 art pixels tall), places it
  on the cell's anchor, raises contrast (×1.15) and colour (×1.2), and
  quantises the sheet to one 128-colour palette (median cut, no dithering).
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
said "head to feet"):

```text
A character pose sheet in the style of a finished comic-book panel, hand-inked and coloured. Clean, confident dark brown ink outlines; flat colour areas with 2-3 tones per material and crisp edges, no airbrushed gradients. Light from the upper left. Drawing in the manner of 1980s Franco-Belgian historical maritime comics: meticulous, period-accurate costume, realistic proportions; clear, well-separated colours so each garment reads at a glance even when the picture is shrunk very small; bold, simple shapes and a thick dark outline around the whole figure. The Caribbean between 1560 and 1680.

The sheet shows the same man six times, full figure, head to boots, in a single straight row, evenly spaced, all the same size, all in strict side view facing RIGHT, feet on one common invisible ground line, no figure overlapping another. The man: <MAN> He holds no weapon and wears no scabbard; his right hand is a fist held close against his chest. His left arm is raised behind him for balance, as a fencer does.
Poses, from left to right:
1. fencer's guard: knees bent, front foot forward, feet a stride apart, body upright.
2. deep lunge forward: front knee bent far forward, back leg straight, torso leaning forward.
3. walking forward, left foot forward, mid-stride, knees slightly bent.
4. walking forward, right foot forward, mid-stride, knees slightly bent.
5. stepping back: weight on the back leg, torso leaning back, front foot lifted slightly.
6. kneeling in surrender on one knee, head bowed, both hands empty, left hand open and lowered.
Background: one plain flat bright green colour (#00B140) everywhere, no ground, no shadows on the ground, no scenery.

Avoid: pixel art, pixelated, dithering, text, letters, numbers, labels, captions, logos, signature, watermark, border or frame, sword, sabre, scabbard, gun, hat, tricorne, modern objects, photorealism, 3D render, blur, anime style, fantasy armour, front view, three-quarter view, figures facing left, figures of different sizes, cropped feet.
Format: landscape, 3:1 aspect ratio if supported, otherwise the widest supported landscape size (for example 1536 x 1024).
```

- **player** (your captain, the scene pictures' recurring captain): the captain, a lean man about thirty, sun-weathered face, dark hair tied back, short beard, bareheaded, clearly blue (medium cobalt blue, not grey) knee-length coat with brass buttons, bright red sash knotted at the hip, pale cream breeches, tall very dark brown, almost black boots.
- **captain** (enemy captains and suitors): a ship's captain about forty, weathered face, moustache and pointed beard, wide-brimmed black felt hat with a turned-up side, clearly red (medium brick red) knee-length coat with gold buttons, brown leather belt, pale cream breeches, tall very dark brown, almost black boots. Extra negatives: cocked hat, three-cornered hat, blue coat, sash.
- **guard** (guards and soldiers): a Spanish colonial garrison soldier about twenty-five, clean-shaven with a moustache, a polished steel morion helmet with a curved brim and a crest, clearly red (medium brick red) knee-length soldier's coat with yellow brass buttons, brown leather belt, dark grey-brown breeches, tall very dark brown, almost black boots. Extra negatives: cocked hat, three-cornered hat, blue coat, sash, breastplate covering the coat, plumes.
- **villain** (the villain): a sinister nobleman about forty-five, gaunt pale face, thin black moustache and pointed beard, wide-brimmed black felt hat with a long plum-purple feather, black knee-length coat with plum-purple trim and dark silver buttons, black breeches, tall black boots. Extra negatives: cocked hat, three-cornered hat, blue coat, red coat, sash, cape, eye patch.
- **sailor** (sailors, mutineers and sparring partners): a common sailor about twenty-five, stubble, a bright red cloth kerchief knotted over his head, loose off-white linen shirt with rolled sleeves, open collar, no coat, wide brown canvas breeches ending below the knee, bare lower legs, plain dark brown leather shoes. Extra negatives: cocked hat, three-cornered hat, coat, waistcoat, boots, striped shirt, sash, eye patch, peg leg.
