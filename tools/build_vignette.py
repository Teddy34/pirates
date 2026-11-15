#!/usr/bin/env python3
"""Build a scene vignette PNG from a supplied illustration.

The source is a diffusion-generated comic-style illustration supplied by the
user (see assets/vignettes/PROVENANCE.md); it is not kept in the repository.
The tool:

1. applies the scene's historical fixes, if any (SCENES below), on the
   full-resolution source, e.g. warping a period-correct flat flag onto an
   anachronistic one;
2. crops to the vignette shape's aspect ratio (centred, or the scene's crop
   box);
3. reduces to the shape's art pixels with a box filter;
4. raises contrast (x1.15) and colour (x1.2) and quantises to 256 colours
   (the most an indexed PNG holds) with median cut and no dithering. The
   retro look comes from the pixel size, not from a tiny palette; at 32
   colours small red flags fold into the hull browns.

Usage:
  python3 tools/build_vignette.py --scene <id> --source <image> [--shape S] [--out <png>]

--shape is needed only for a scene not yet listed in SCENES. Needs Pillow.
"""
import argparse

from PIL import Image, ImageChops, ImageDraw, ImageEnhance

# Art pixels of each vignette shape; keep in step with PICTURE_SIZES in
# src/vignettes.mjs.
SHAPES = {'landscape': (224, 128), 'portrait': (96, 128), 'title': (240, 160)}
COLOURS = 256
WHITE, RED, INK = (244, 240, 226), (196, 32, 36), (30, 24, 20)
ORANGE, BLUE = (232, 118, 28), (34, 64, 140)


def cross_of_burgundy(width=180, height=120):
    """Spain 1560-1785: a red saltire of ragged staves (knots) on white."""
    flag = Image.new('RGB', (width, height), WHITE)
    draw = ImageDraw.Draw(flag)
    stave = round(height * 0.14)
    for start, end in (((0, 0), (width, height)), ((0, height), (width, 0))):
        draw.line([start, end], fill=RED, width=stave)
        for step in range(1, 6):
            x = start[0] + (end[0] - start[0]) * step / 6
            y = start[1] + (end[1] - start[1]) * step / 6
            knot = stave * 0.8
            draw.ellipse([x - knot, y - knot, x + knot, y + knot], fill=RED)
    draw.rectangle([0, 0, width - 1, height - 1], outline=INK, width=3)
    return flag


def st_george(width=180, height=120):
    """England: a red cross on white."""
    flag = Image.new('RGB', (width, height), WHITE)
    draw = ImageDraw.Draw(flag)
    bar = round(height / 5)
    draw.rectangle([width / 2 - bar / 2, 0, width / 2 + bar / 2, height], fill=RED)
    draw.rectangle([0, height / 2 - bar / 2, width, height / 2 + bar / 2], fill=RED)
    draw.rectangle([0, 0, width - 1, height - 1], outline=INK, width=3)
    return flag


def plain_white(width=180, height=120):
    """France: the royal navy's white flag, official on ships, forts and
    colonies from 1661 (plain; some sources add gold fleurs-de-lis)."""
    flag = Image.new('RGB', (width, height), WHITE)
    ImageDraw.Draw(flag).rectangle([0, 0, width - 1, height - 1], outline=INK, width=3)
    return flag


def tricolour_bands(colours, width=180, height=120):
    flag = Image.new('RGB', (width, height), WHITE)
    draw = ImageDraw.Draw(flag)
    for index, colour in enumerate(colours):
        draw.rectangle([0, height * index / 3, width, height * (index + 1) / 3], fill=colour)
    draw.rectangle([0, 0, width - 1, height - 1], outline=INK, width=3)
    return flag


def prince_flag():
    """Holland to about 1640: orange, white and blue."""
    return tricolour_bands([ORANGE, WHITE, BLUE])


def states_flag():
    """Holland from about 1660: red, white and blue."""
    return tricolour_bands([RED, WHITE, BLUE])


def solve(matrix, values):
    """Gaussian elimination with partial pivoting (no numpy dependency)."""
    size = len(values)
    rows = [row[:] + [values[index]] for index, row in enumerate(matrix)]
    for column in range(size):
        pivot = max(range(column, size), key=lambda row: abs(rows[row][column]))
        rows[column], rows[pivot] = rows[pivot], rows[column]
        for row in range(size):
            if row != column:
                factor = rows[row][column] / rows[column][column]
                rows[row] = [a - factor * b for a, b in zip(rows[row], rows[column])]
    return [rows[index][size] / rows[index][index] for index in range(size)]


def perspective_coefficients(target, source):
    """PIL PERSPECTIVE coefficients mapping target corners to source corners."""
    matrix, values = [], []
    for (x, y), (u, v) in zip(target, source):
        matrix.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        values.append(u)
        matrix.append([0, 0, 0, x, y, 1, -v * x, -v * y])
        values.append(v)
    return solve(matrix, values)


def paste_flag(image, flag, quad, shade=False):
    """Warps a flat flag onto quad, its corners in source pixels: hoist top,
    fly top, fly bottom, hoist bottom. With shade, the source's folds (its
    light and shadow on a plain flag) darken the new flag the same way."""
    corners = [(0, 0), (flag.width, 0), (flag.width, flag.height), (0, flag.height)]
    warped = flag.transform(image.size, Image.Transform.PERSPECTIVE, perspective_coefficients(quad, corners), Image.Resampling.BICUBIC)
    if shade:
        light = image.convert('L')
        flag_area = Image.new('L', image.size)
        ImageDraw.Draw(flag_area).polygon(quad, fill=255)
        brightest = max(1, ImageChops.multiply(light, flag_area).getextrema()[1])
        light = light.point(lambda value: min(255, round(value * 255 / brightest)))
        warped = ImageChops.multiply(warped, Image.merge('RGB', [light] * 3))
    mask = Image.new('L', image.size)
    ImageDraw.Draw(mask).polygon(quad, fill=255)
    image.paste(warped, (0, 0), mask)


def polygon_box(quad):
    xs, ys = [x for x, _ in quad], [y for _, y in quad]
    return (min(xs), min(ys), max(xs) + 1, max(ys) + 1)


def flag_fix(make_flag, quad, shade=False):
    return lambda image: paste_flag(image, make_flag(), quad, shade)


# One row per town flag, in the order of HARBOUR_FLAGS in src/vignettes.mjs.
FORT_FLAGS = [('Spain', cross_of_burgundy), ('England', st_george), ('France', plain_white), ('Holland', prince_flag), ('Holland 1660', states_flag)]


def fort_flag_variants(quad):
    """One variant per town flag, warped onto a plain white flag at quad."""
    return [(name, [flag_fix(make, quad, shade=True)]) for name, make in FORT_FLAGS]


# Scenes with art. `source` pins the expected source size (the fixes use
# source pixel coordinates); `crop` is an optional (left, top, right, bottom)
# box; `fixes` run on the source before reduction. `variants` makes a sheet:
# one picture per (name, fixes) pair, stacked top to bottom in that order and
# quantised to one shared palette; the game picks a row (src/vignettes.mjs).
SCENES = {
    'title-ship': {
        'shape': 'title',
        'source': (1536, 1024),
        # The source drew Spain's red-yellow-red flag of 1785 on the fort.
        'fixes': [flag_fix(cross_of_burgundy, [(1252, 551), (1306, 563), (1309, 605), (1252, 596)])],
    },
    'merchant': {
        'shape': 'portrait',
        'source': (1086, 1448),
    },
    'barmaid': {
        'shape': 'portrait',
        'source': (1086, 1448),
    },
    'bartender': {
        'shape': 'portrait',
        'source': (1086, 1448),
    },
    # The source flies a plain white flag on the fort, painted over with the
    # town's flag; rows follow HARBOUR_FLAGS in src/vignettes.mjs.
    'harbour-arrival': {
        'shape': 'landscape',
        'source': (1659, 948),
        'variants': fort_flag_variants([(646, 138), (763, 168), (777, 240), (648, 230)]),
    },
    # Same plain white fort flag on the far headland, same rows.
    'port-quay': {
        'shape': 'landscape',
        'source': (1659, 948),
        'variants': fort_flag_variants([(1565, 237), (1595, 242), (1595, 262), (1565, 259)]),
    },
    'sail-ho': {
        'shape': 'landscape',
        'source': (1536, 1024),
    },
    'sailing-master': {
        'shape': 'portrait',
        'source': (1086, 1448),
    },
}


def centred_crop(size, aspect):
    width, height = size
    if width / height > aspect:
        cropped = round(height * aspect)
        return ((width - cropped) // 2, 0, (width - cropped) // 2 + cropped, height)
    cropped = round(width / aspect)
    return (0, (height - cropped) // 2, width, (height - cropped) // 2 + cropped)


def reduce(image, size):
    picture = image.resize(size, Image.Resampling.BOX)
    picture = ImageEnhance.Contrast(picture).enhance(1.15)
    return ImageEnhance.Color(picture).enhance(1.2)


def quantise(picture, colours=COLOURS):
    return picture.quantize(colors=colours, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)


def pixelate(image, size, colours=COLOURS):
    return quantise(reduce(image, size), colours)


def build(scene, source_path, out_path, shape=None):
    entry = SCENES.get(scene, {})
    if shape and entry.get('shape') and shape != entry['shape']:
        raise SystemExit(f'{scene} is a {entry["shape"]} vignette in SCENES; drop --shape or change the entry')
    shape = shape or entry.get('shape')
    if shape not in SHAPES:
        raise SystemExit(f'unknown shape {shape!r} for {scene}; pass --shape {"|".join(SHAPES)}')
    size = SHAPES[shape]
    image = Image.open(source_path).convert('RGB')
    if entry.get('source') and image.size != entry['source']:
        raise SystemExit(f'expected a {entry["source"][0]} x {entry["source"][1]} source for {scene}, got {image.size}')
    for fix in entry.get('fixes', []):
        fix(image)
    box = entry.get('crop') or centred_crop(image.size, size[0] / size[1])
    check_box(box, shape, size)
    variants = entry.get('variants')
    if not variants:
        pixelate(image.crop(box), size).save(out_path, optimize=True)
        return
    sheet = Image.new('RGB', (size[0], size[1] * len(variants)))
    for row, (_, fixes) in enumerate(variants):
        picture = image.copy()
        for fix in fixes:
            fix(picture)
        sheet.paste(reduce(picture.crop(box), size), (0, row * size[1]))
    quantise(sheet).save(out_path, optimize=True)


def check_box(box, shape, size):
    box_width, box_height = box[2] - box[0], box[3] - box[1]
    if abs(box_width / box_height - size[0] / size[1]) > 0.01:
        raise SystemExit(f'crop box {box} is not the {shape} aspect {size[0]} : {size[1]}')
    if box_width < size[0] or box_height < size[1]:
        raise SystemExit(f'source crop {box_width} x {box_height} is smaller than the {size[0]} x {size[1]} picture')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--scene', required=True, help='the vignette id, e.g. title-ship')
    parser.add_argument('--source', required=True, help='the supplied illustration')
    parser.add_argument('--shape', choices=SHAPES, help='needed only for a scene not in SCENES')
    parser.add_argument('--out', help='defaults to assets/vignettes/<scene>.png')
    args = parser.parse_args()
    build(args.scene, args.source, args.out or f'assets/vignettes/{args.scene}.png', args.shape)
