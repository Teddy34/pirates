#!/usr/bin/env python3
"""Build the sword fight's fencer bodies (assets/sprites/fencers.png).

Each source is a generated pose sheet (see assets/sprites/PROVENANCE.md): one
man six times in a row on a flat green background, side view facing right,
in the poses of BODY_POSES. The sources are not kept in the repository. The
tool, for each sheet:

1. keys out the green background;
2. finds the six figures (the six largest connected shapes, left to right;
   stray bits join the nearest figure);
3. picks 16 colours for the sheet (k-means), then reduces each figure at
   one scale per sheet, chosen so the upright walking figure is the
   character's `height` art pixels tall: each art pixel takes the colour
   that covers most of its block, the darkest colour (the ink outline in
   these sheets) weighted up, so flat
   colours and outlines stay crisp; lone pixels take their neighbours'
   colour, pixels less than half covered are dropped, and a face the
   reduction left blank gets an eye pixel;
4. places it in a FENCER_ART cell (64x64, src/fencer-sprites.mjs) with the
   midpoint of its feet on the cell's anchor (26, 61).

Each palette gets the vignette pipeline's contrast (x1.15), but not its
colour boost, which turned the skin orange. Rows follow
CHARACTERS, columns BODY_POSES. A character with `coat` marks its coat:
those pixels get alpha 254 instead of 255, so the game can recolour the coat
to an opponent's nation (fencer-sprites.mjs); a `cap` (the sailor's
headscarf, a crew's colour) gets alpha 253.

Usage:
  python3 tools/build_fencers.py --source player=<png> --source captain=<png> ...
      [--out assets/sprites/fencers.png] [--preview <png>]

Every character needs a source. Needs Pillow and numpy.
"""
import argparse
import colorsys
from collections import deque

import numpy as np
from PIL import Image, ImageEnhance

CELL = (64, 64)
ANCHOR = (26, 61)
BODY_POSES = ['guard', 'lunge', 'walk-a', 'walk-b', 'back', 'kneel']
# Row order of the sheet; keep in step with BODY_ROWS in
# src/fencer-sprites.mjs. `height`: art pixels of the upright walking figure
# (frame walk-a), hat and raised hand included. `coat`: the hue band
# (degrees) and least saturation of the coat to mark for recolouring; `cap`
# the same for a headscarf.
CHARACTERS = {
    'player': {'height': 38},
    'captain': {'height': 40, 'coat': ((340, 18), .45)},
    'guard': {'height': 40, 'coat': ((340, 18), .45)},
    'villain': {'height': 41},
    'sailor': {'height': 37, 'cap': ((340, 12), .55)},
}
COLOURS_PER_CHARACTER = 16
INK_WEIGHT = 1.8
COAT_ALPHA = 254
CAP_ALPHA = 253


def background(rgb):
    r, g, b = (rgb[..., index].astype(int) for index in range(3))
    return (g > 110) & (g > r + 45) & (g > b + 35)


def erode(mask):
    padded = np.pad(mask, 1)
    return mask & padded[:-2, 1:-1] & padded[2:, 1:-1] & padded[1:-1, :-2] & padded[1:-1, 2:]


def grow(labels, mask):
    """Spread labels one step into unlabelled cells of `mask`."""
    padded = np.pad(labels, 1)
    for neighbour in (padded[:-2, 1:-1], padded[2:, 1:-1], padded[1:-1, :-2], padded[1:-1, 2:]):
        labels = np.where((labels == 0) & mask & (neighbour > 0), neighbour, labels)
    return labels


def figures(mask, count, step=4, thin=3):
    """Label each foreground pixel with its figure (1..count, left to right; 0 none).

    The figures are found on a coarse mask eroded `thin` times, so a hand
    that touches the next figure does not join them; the labels then grow
    back over the whole mask, and stray bits join the nearest figure.
    """
    height, width = mask.shape
    coarse = mask[:height // step * step, :width // step * step]
    coarse = coarse.reshape(height // step, step, width // step, step).any(axis=(1, 3))
    core = coarse
    for _ in range(thin):
        core = erode(core)
    labels = np.zeros(coarse.shape, int)
    parts = []
    for start in zip(*np.nonzero(core)):
        if labels[start]:
            continue
        label = len(parts) + 1
        labels[start] = label
        queue, cells = deque([start]), []
        while queue:
            y, x = queue.popleft()
            cells.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < core.shape[0] and 0 <= xx < core.shape[1] and core[yy, xx] and not labels[yy, xx]:
                        labels[yy, xx] = label
                        queue.append((yy, xx))
        xs = [x for _, x in cells]
        parts.append({'label': label, 'size': len(cells), 'cx': sum(xs) / len(xs)})
    main = sorted(sorted(parts, key=lambda part: -part['size'])[:count], key=lambda part: part['cx'])
    remap = np.zeros(len(parts) + 1, int)
    for order, part in enumerate(main, 1):
        remap[part['label']] = order
    labels = remap[labels]
    while True:
        grown = grow(labels, coarse)
        if (grown == labels).all():
            break
        labels = grown
    # Bits not connected to any figure join the nearest one by column.
    centres = [np.nonzero(labels == order)[1].mean() for order in range(1, count + 1)]
    for y, x in zip(*np.nonzero(coarse & (labels == 0))):
        labels[y, x] = 1 + min(range(count), key=lambda index: abs(centres[index] - x))
    full = np.repeat(np.repeat(labels, step, 0), step, 1)
    out = np.zeros(mask.shape, int)
    out[:full.shape[0], :full.shape[1]] = full
    return np.where(mask, out, 0)


def palette_for(rgb, mask, count, seed=1, rounds=20):
    """`count` colours for one sheet: k-means over its figures' inner pixels
    (the mask shrunk, so the green fringe does not get a colour)."""
    inner = mask
    for _ in range(3):
        inner = erode(inner)
    pixels = rgb[inner][::11].astype(float)
    centres = pixels[np.random.default_rng(seed).choice(len(pixels), count, replace=False)]
    for _ in range(rounds):
        nearest = nearest_colour(pixels, centres)
        centres = np.array([pixels[nearest == k].mean(0) if (nearest == k).any() else centres[k] for k in range(count)])
    return centres


def nearest_colour(pixels, centres, chunk=200000):
    out = np.empty(len(pixels), int)
    for start in range(0, len(pixels), chunk):
        part = pixels[start:start + chunk].astype(float)
        out[start:start + chunk] = ((part[:, None] - centres[None]) ** 2).sum(-1).argmin(1)
    return out


def reduce_figure(rgb, mask, scale, centres):
    """Reduce one figure by `scale`: each art pixel takes the palette colour
    that covers most of its block (the ink outline counts INK_WEIGHT times),
    so flat colours and outlines stay crisp instead of averaging to mud.
    Returns the palette index per art pixel and whether it is solid."""
    ys, xs = np.nonzero(mask)
    top, left = ys.min(), xs.min()
    height, width = int((ys.max() - top) / scale) + 1, int((xs.max() - left) / scale) + 1
    colour = nearest_colour(rgb[ys, xs], centres)
    cell = ((ys - top) / scale).astype(int) * width + ((xs - left) / scale).astype(int)
    count = len(centres)
    votes = np.bincount(cell * count + colour, minlength=height * width * count).reshape(height, width, count).astype(float)
    solid = votes.sum(-1) >= .5 * scale * scale
    ink = int((centres @ [.299, .587, .114]).argmin())
    votes[..., ink] *= INK_WEIGHT
    return despeckle(votes.argmax(-1), solid), solid


def despeckle(index, solid):
    """An art pixel unlike all four neighbours, three of which agree, takes
    their colour: drops the lone pixels the reduction leaves in flat areas."""
    padded = np.pad(np.where(solid, index, -1), 1, constant_values=-1)
    near = np.stack([padded[:-2, 1:-1], padded[2:, 1:-1], padded[1:-1, :-2], padded[1:-1, 2:]])
    out = index.copy()
    for candidate in near:
        agree = (near == candidate).sum(0)
        lone = solid & (candidate >= 0) & (agree >= 3) & (near != index).all(0)
        out = np.where(lone, candidate, out)
    return out


def feet_x(solid):
    """Middle of the lowest rows' extent: the point between the feet."""
    rows = np.nonzero(solid.any(1))[0]
    low = solid[rows.max() - 2:rows.max() + 1]
    xs = np.nonzero(low.any(0))[0]
    return (xs.min() + xs.max()) / 2, rows.max()


def coat_mask(colour, solid, band, saturation):
    flat = colour.reshape(-1, 3) / 255
    hsv = np.array([colorsys.rgb_to_hsv(*pixel) for pixel in flat]).reshape(colour.shape)
    hue = hsv[..., 0] * 360
    low, high = band
    in_band = (hue >= low) | (hue <= high) if low > high else (hue >= low) & (hue <= high)
    return solid & in_band & (hsv[..., 1] >= saturation) & (hsv[..., 2] > .2)


def add_eye(index, solid, palette):
    """Put an eye on a face the reduction left blank: the face is the
    frontmost run of skin in the head's rows; the eye goes one pixel in from
    its front edge, a third of the way down, in the darkest colour."""
    hsv = np.array([colorsys.rgb_to_hsv(*(colour / 255)) for colour in palette])
    skin = (hsv[:, 0] * 360 >= 12) & (hsv[:, 0] * 360 <= 40) & (hsv[:, 1] > .25) & (hsv[:, 1] < .75) & (hsv[:, 2] > .6)
    ink = int((palette @ [.299, .587, .114]).argmin())
    rows = np.nonzero(solid.any(1))[0]
    if not len(rows):
        return index
    top = rows.min()
    face = [(y, x) for y in range(top, min(top + 12, index.shape[0])) for x in range(index.shape[1]) if solid[y, x] and skin[index[y, x]]]
    if len(face) < 6:
        return index
    front = max(x for _, x in face)
    face = [(y, x) for y, x in face if x >= front - 5]
    face_top, face_bottom = min(y for y, _ in face), max(y for y, _ in face)
    eye_y = face_top + max(1, (face_bottom - face_top) // 3)
    xs = [x for y, x in face if y == eye_y]
    if not xs or max(xs) - min(xs) < 2:
        return index
    out = index.copy()
    out[eye_y, max(xs) - 1] = ink
    return out


def build_row(path, spec):
    rgb = np.asarray(Image.open(path).convert('RGB'))
    mask = ~background(rgb)
    labels = figures(mask, len(BODY_POSES))
    found = [int((labels == index + 1).sum()) for index in range(len(BODY_POSES))]
    if min(found) < 1000:
        raise SystemExit(f'{path}: expected {len(BODY_POSES)} figures on a flat green background, found pixel counts {found}')
    centres = palette_for(rgb, mask, COLOURS_PER_CHARACTER)
    walk = labels == 1 + BODY_POSES.index('walk-a')
    ys = np.nonzero(walk.any(1))[0]
    scale = (ys.max() + 1 - ys.min()) / spec['height']
    swatch = Image.fromarray(centres.reshape(1, -1, 3).clip(0, 255).astype(np.uint8))
    palette = np.asarray(ImageEnhance.Contrast(swatch).enhance(1.15)).reshape(-1, 3).astype(float)
    row_index = np.zeros((CELL[1], CELL[0] * len(BODY_POSES)), int)
    row_solid = np.zeros((CELL[1], CELL[0] * len(BODY_POSES)), bool)
    for index in range(len(BODY_POSES)):
        colour, solid = reduce_figure(rgb, labels == index + 1, scale, centres)
        colour = add_eye(colour, solid, palette)
        fx, fy = feet_x(solid)
        x0, y0 = round(ANCHOR[0] - fx) + index * CELL[0], ANCHOR[1] - fy
        h, w = solid.shape
        sy, sx = max(0, -y0), max(0, index * CELL[0] - x0)
        ey, ex = min(h, CELL[1] - y0), min(w, (index + 1) * CELL[0] - x0)
        if sy or sx or ey < h or ex < w:
            print(f'warning: {path} {BODY_POSES[index]} clipped to the cell')
        region = (slice(y0 + sy, y0 + ey), slice(x0 + sx, x0 + ex))
        keep = solid[sy:ey, sx:ex]
        row_index[region] = np.where(keep, colour[sy:ey, sx:ex], row_index[region])
        row_solid[region] |= keep
    # The palette has the vignette pipeline's contrast, but no colour boost,
    # which turned the skin orange.
    palette = palette.astype(int)
    marks = np.full(len(palette), 255)
    for key, alpha in (('coat', COAT_ALPHA), ('cap', CAP_ALPHA)):
        if key in spec:
            marks = np.where(coat_mask(palette.reshape(1, -1, 3).astype(float), np.ones((1, len(palette)), bool), *spec[key])[0], alpha, marks)
    return palette[row_index], np.where(row_solid, marks[row_index], 0)


def build(sources, out_path, preview_path=None):
    rows = [build_row(sources[name], spec) for name, spec in CHARACTERS.items()]
    colours = np.vstack([row[0] for row in rows])
    alpha = np.vstack([row[1] for row in rows])
    solid = alpha > 0
    out = Image.fromarray(np.dstack([colours, alpha]).astype(np.uint8), 'RGBA')
    out.save(out_path, optimize=True)
    print(f'{out_path}: {out.width}x{out.height}, {len(np.unique(colours[solid], axis=0))} colours')
    if preview_path:
        view = np.dstack([colours, np.full(solid.shape, 255)]).astype(np.uint8)
        view[~solid] = (110, 150, 190, 255)
        for marked in (COAT_ALPHA, CAP_ALPHA):
            view[alpha == marked] = (view[alpha == marked] * [.4, 1, .4, 1]).astype(np.uint8)
        image = Image.fromarray(view, 'RGBA')
        image.resize((image.width * 4, image.height * 4), Image.NEAREST).save(preview_path)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--source', action='append', default=[], help='<character>=<pose sheet png>')
    parser.add_argument('--out', default='assets/sprites/fencers.png')
    parser.add_argument('--preview', help='also save a x4 preview with the coat masks tinted green')
    args = parser.parse_args()
    sources = dict(item.split('=', 1) for item in args.source)
    missing = [name for name in CHARACTERS if name not in sources]
    if missing:
        parser.error(f'no source for {", ".join(missing)}')
    build(sources, args.out, args.preview)


if __name__ == '__main__':
    main()
