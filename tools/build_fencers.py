#!/usr/bin/env python3
"""Build the sword fight's fencer bodies (assets/sprites/fencers.png).

Each source is a generated pose sheet (see assets/sprites/PROVENANCE.md): one
man six times in a row on a flat green background, side view facing right,
in the poses of BODY_POSES. The sources are not kept in the repository. The
tool, for each sheet:

1. keys out the green background;
2. finds the six figures (the six largest connected shapes, left to right;
   stray bits join the nearest figure);
3. reduces each figure with a box filter at one scale per sheet, chosen so
   the upright walking figure is the character's `height` art pixels tall,
   and drops pixels less than half covered;
4. places it in a FENCER_ART cell (64x64, src/fencer-sprites.mjs) with the
   midpoint of its feet on the cell's anchor (26, 61).

Then the whole sheet gets the vignette pipeline's contrast (x1.15) and colour
(x1.2) and one shared palette (median cut, no dithering). Rows follow
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
COLOURS = 128
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


def reduce_figure(rgb, mask, scale):
    """Box-reduce one figure (premultiplied by its mask) by `scale`."""
    ys, xs = np.nonzero(mask)
    top, bottom, left, right = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    size = (max(1, round((right - left) / scale)), max(1, round((bottom - top) / scale)))
    alpha = mask[top:bottom, left:right].astype(np.float32)
    channels = [Image.fromarray(rgb[top:bottom, left:right, index].astype(np.float32) * alpha, 'F').resize(size, Image.BOX) for index in range(3)]
    cover = np.asarray(Image.fromarray(alpha, 'F').resize(size, Image.BOX))
    colour = np.dstack([np.asarray(channel) / np.maximum(cover, 1e-3) for channel in channels])
    return np.clip(colour, 0, 255), cover >= .5


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


def build_row(path, spec):
    rgb = np.asarray(Image.open(path).convert('RGB'))
    mask = ~background(rgb)
    labels = figures(mask, len(BODY_POSES))
    walk = labels == 1 + BODY_POSES.index('walk-a')
    ys = np.nonzero(walk.any(1))[0]
    scale = (ys.max() + 1 - ys.min()) / spec['height']
    row_rgb = np.zeros((CELL[1], CELL[0] * len(BODY_POSES), 3))
    row_solid = np.zeros((CELL[1], CELL[0] * len(BODY_POSES)), bool)
    for index in range(len(BODY_POSES)):
        colour, solid = reduce_figure(rgb, labels == index + 1, scale)
        fx, fy = feet_x(solid)
        x0, y0 = round(ANCHOR[0] - fx) + index * CELL[0], ANCHOR[1] - fy
        h, w = solid.shape
        sy, sx = max(0, -y0), max(0, index * CELL[0] - x0)
        ey, ex = min(h, CELL[1] - y0), min(w, (index + 1) * CELL[0] - x0)
        if sy or sx or ey < h or ex < w:
            print(f'warning: {path} {BODY_POSES[index]} clipped to the cell')
        region = (slice(y0 + sy, y0 + ey), slice(x0 + sx, x0 + ex))
        keep = solid[sy:ey, sx:ex]
        row_rgb[region] = np.where(keep[..., None], colour[sy:ey, sx:ex], row_rgb[region])
        row_solid[region] |= keep
    return row_rgb, row_solid


def build(sources, out_path, preview_path=None):
    rows = [build_row(sources[name], spec) for name, spec in CHARACTERS.items()]
    rgb = np.vstack([row[0] for row in rows]).astype(np.uint8)
    solid = np.vstack([row[1] for row in rows])
    picture = ImageEnhance.Contrast(Image.fromarray(rgb)).enhance(1.15)
    picture = ImageEnhance.Color(picture).enhance(1.2)
    # Quantise the figures only, so the empty cells take no palette entry.
    pixels = np.asarray(picture)[solid]
    strip = Image.fromarray(pixels.reshape(1, -1, 3))
    palette_image = strip.quantize(colors=COLOURS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    indices = np.asarray(picture.quantize(palette=palette_image, dither=Image.Dither.NONE))
    palette = np.array(palette_image.getpalette()[:COLOURS * 3]).reshape(-1, 3)
    colours = palette[indices]
    alpha = np.where(solid, 255, 0)
    for row, (name, spec) in enumerate(CHARACTERS.items()):
        rows_slice = slice(row * CELL[1], (row + 1) * CELL[1])
        if 'coat' in spec:
            coat = coat_mask(colours[rows_slice].astype(float), solid[rows_slice], *spec['coat'])
            alpha[rows_slice] = np.where(coat, COAT_ALPHA, alpha[rows_slice])
        if 'cap' in spec:
            cap = coat_mask(colours[rows_slice].astype(float), solid[rows_slice], *spec['cap'])
            alpha[rows_slice] = np.where(cap, CAP_ALPHA, alpha[rows_slice])
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
