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
  python3 tools/build_vignette.py --scene <id> --extend-sheet [--out <png>]
  python3 tools/build_vignette.py --scene <id> --retouch [--out <png>]

--extend-sheet adds the town-flag rows a built sheet lacks (FORT_FLAGS)
without its source, from the sheet's plain white flag row. --retouch
repaints the scene's `retouch` flags on the built picture, without its
source.

--shape is needed only for a scene not yet listed in SCENES. Needs Pillow.
"""
import argparse

from PIL import Image, ImageChops, ImageDraw, ImageEnhance

# Art pixels of each vignette shape; keep in step with PICTURE_SIZES in
# src/vignettes.mjs. `backdrop` is a sword fight's backdrop (BACKDROP in
# src/fencer-sprites.mjs), its ground line on row 112.
SHAPES = {'landscape': (224, 128), 'portrait': (96, 128), 'title': (240, 160), 'backdrop': (260, 132)}
COLOURS = 256
WHITE, RED, INK = (244, 240, 226), (196, 32, 36), (30, 24, 20)
ORANGE, BLUE = (232, 118, 28), (34, 64, 140)
GOLD = (226, 178, 52)


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


def fleur_de_lis(draw, cx, cy, r, colour):
    """A heraldic lily about 2r tall, centred on (cx, cy)."""
    def shape(points, side=1):
        draw.polygon([(cx + side * x * r, cy + y * r) for x, y in points], fill=colour)
    # The upright middle petal, the band, and the foot below it.
    shape([(0, -1), (0.3, -0.45), (0.17, 0.25), (-0.17, 0.25), (-0.3, -0.45)])
    shape([(-0.55, 0.22), (0.55, 0.22), (0.55, 0.4), (-0.55, 0.4)])
    shape([(-0.14, 0.4), (0.14, 0.4), (0, 0.95)])
    for side in (-1, 1):
        # The outer petal rising from the band and curling down at its tip.
        shape([(0.12, 0.25), (0.3, -0.25), (0.6, -0.5), (0.88, -0.38), (0.98, -0.05), (0.85, 0.22),
               (0.78, -0.08), (0.6, -0.18), (0.42, 0.0), (0.32, 0.25)], side)
        shape([(0.14, 0.4), (0.5, 0.62), (0.55, 0.85), (0.3, 0.72), (0.08, 0.5)], side)


def banniere_de_france(width=180, height=120):
    """France to about 1620: the bannière de France, three gold
    fleurs-de-lis on blue (docs/flags-1560-1680.md, forts and towns)."""
    flag = Image.new('RGB', (width, height), BLUE)
    draw = ImageDraw.Draw(flag)
    r = height * 0.2
    for x, y in ((0.3, 0.3), (0.7, 0.3), (0.5, 0.7)):
        fleur_de_lis(draw, width * x, height * y, r, GOLD)
    draw.rectangle([0, 0, width - 1, height - 1], outline=INK, width=3)
    return flag


def red_ensign(width=180, height=120):
    """England from about 1625: red, with St George's cross in the canton.
    No ink border: it is painted only a few art pixels wide."""
    flag = Image.new('RGB', (width, height), RED)
    canton = Image.new('RGB', (width // 2, height // 2), WHITE)
    draw = ImageDraw.Draw(canton)
    bar = round(height / 9)
    draw.rectangle([width / 4 - bar / 2, 0, width / 4 + bar / 2, height / 2], fill=RED)
    draw.rectangle([0, height / 4 - bar / 2, width / 2, height / 4 + bar / 2], fill=RED)
    flag.paste(canton, (0, 0))
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


def patch_fix(box, to):
    """Cover a small blemish (a stray signature) with a nearby patch:
    copy the source box (left, top, right, bottom) to the point `to`."""
    return lambda image: image.paste(image.crop(box), to)


# One row per town flag, in the order of HARBOUR_FLAGS in src/vignettes.mjs.
FORT_FLAGS = [('Spain', cross_of_burgundy), ('England', st_george), ('France', plain_white), ('Holland', prince_flag),
              ('Holland 1660', states_flag), ('France 1560', banniere_de_france)]


def stretch_floor(top, height):
    """Stretch the rows from `top` to the bottom to `height` rows, so a floor
    band drawn too thin reaches the backdrop's ground line. Returns a new image."""
    def fix(image):
        stretched = Image.new('RGB', (image.width, top + height))
        stretched.paste(image.crop((0, 0, image.width, top)), (0, 0))
        stretched.paste(image.crop((0, top, image.width, image.height)).resize((image.width, height), Image.Resampling.LANCZOS), (0, top))
        return stretched
    return fix


# Where each sheet scene's source flies its plain white fort flag (source
# pixels: hoist top, fly top, fly bottom, hoist bottom).
FORT_QUADS = {
    'harbour-arrival': [(646, 138), (763, 168), (777, 240), (648, 230)],
    'port-quay': [(1565, 237), (1595, 242), (1595, 262), (1565, 259)],
    'shore-arrival': [(1474, 305), (1523, 308), (1523, 342), (1475, 341)],
    'town-square': [(1092, 36), (1205, 39), (1206, 109), (1092, 105)],
    'land-attack': [(1507, 24), (1624, 35), (1625, 111), (1508, 107)],
    'fort-walls': [(1460, 116), (1645, 214), (1591, 355), (1376, 247)],
    'fight-walls': [(828, 33), (1114, 68), (1126, 193), (828, 177)],
}


def fort_flag_variants(quad):
    """One variant per town flag, warped onto a plain white flag at quad."""
    return [(name, [flag_fix(make, quad, shade=True)]) for name, make in FORT_FLAGS]


# Scenes with art. `source` pins the expected source size (the fixes use
# source pixel coordinates); `crop` is an optional (left, top, right, bottom)
# box; `fixes` run on the source before reduction. `variants` makes a sheet:
# one picture per (name, fixes) pair, stacked top to bottom in that order and
# quantised to one shared palette; the game picks a row (src/vignettes.mjs).
# `kmeans` refines a sheet's palette with that many k-means passes, for a
# small flag colour found nowhere else in the picture.
SCENES = {
    'title-ship': {
        'shape': 'title',
        'source': (1536, 1024),
        # The source drew Spain's red-yellow-red flag of 1785 on the fort.
        'fixes': [flag_fix(cross_of_burgundy, [(1252, 551), (1306, 563), (1309, 605), (1252, 596)])],
        # Applied to the built picture (--retouch; the source is not at
        # hand): the three-decker's stern flag, a plain St George's cross in
        # the source, becomes the red ensign the navy flew from about 1625
        # (docs/flags-1560-1680.md). Corners in art pixels; the flag streams
        # left from its staff, so the hoist is on the right.
        'retouch': [(red_ensign, [(48.5, 75.5), (32.5, 81.5), (32.5, 93.5), (48.5, 92)])],
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
        'variants': fort_flag_variants(FORT_QUADS['harbour-arrival']),
    },
    # Same plain white fort flag on the far headland, same rows.
    'port-quay': {
        'shape': 'landscape',
        'source': (1659, 948),
        'variants': fort_flag_variants(FORT_QUADS['port-quay']),
    },
    'crew-recruits': {
        'shape': 'landscape',
        'source': (1659, 948),
    },
    'traveller': {
        'shape': 'portrait',
        'source': (1086, 1448),
    },
    'map-seller': {
        'shape': 'portrait',
        'source': (1086, 1448),
    },
    'villain-news': {
        'shape': 'portrait',
        'source': (1086, 1448),
    },
    'sail-ho': {
        'shape': 'landscape',
        'source': (1536, 1024),
    },
    'sailing-master': {
        'shape': 'portrait',
        'source': (1086, 1448),
    },
    'open-swords': {
        'shape': 'landscape',
        'source': (1659, 948),
    },
    # The generator scrawled a signature on the floor in the bottom right
    # corner; floor planks from just left of it cover it.
    'shipwright': {
        'shape': 'portrait',
        'source': (1086, 1448),
    },
    'tavern': {
        'shape': 'landscape',
        'source': (1659, 948),
        'fixes': [patch_fix((1520, 900, 1589, 948), (1590, 900))],
    },
    'governor-daughter': {
        'shape': 'landscape',
        'source': (1659, 948),
    },
    # The ship off the fort flew a red flag with a yellow cross, which reads
    # as Spain's colours of 1785 and shows in every nation's town; sky from
    # just above it paints it out between the two mast tops.
    'governor-niece': {
        'shape': 'landscape',
        'source': (1659, 948),
        'fixes': [patch_fix((344, 150, 370, 180), (344, 197))],
    },
    'wedding': {
        'shape': 'landscape',
        'source': (1659, 948),
    },
    'merchant-daughter': {
        'shape': 'landscape',
        'source': (1659, 948),
    },
    'dig-found': {
        'shape': 'landscape',
    },
    'dig-nothing': {
        'shape': 'landscape',
    },
    'reunion-female': {
        'shape': 'landscape',
    },
    'reunion-male': {
        'shape': 'landscape',
    },
    'lost-city-inca': {
        'shape': 'landscape',
    },
    'lost-city-aztec': {
        'shape': 'landscape',
    },
    'lost-city-olmec': {
        'shape': 'landscape',
    },
    'lost-city-maya': {
        'shape': 'landscape',
    },
    # Plain white flags on the inland town's watchtower and on the governor's
    # house, painted over with the town's flag; same rows as harbour-arrival.
    'shore-arrival': {
        'shape': 'landscape',
        'source': (1659, 948),
        'variants': fort_flag_variants(FORT_QUADS['shore-arrival']),
    },
    'town-square': {
        'shape': 'landscape',
        'source': (1659, 948),
        'variants': fort_flag_variants(FORT_QUADS['town-square']),
    },
    'boarding': {
        'shape': 'landscape',
    },
    'hostage-talks': {
        'shape': 'landscape',
    },
    'prize-plunder': {
        'shape': 'landscape',
    },
    'enemy-destroyed': {
        'shape': 'landscape',
    },
    'sinking': {
        'shape': 'landscape',
    },
    'outrun': {
        'shape': 'landscape',
    },
    'nightfall': {
        'shape': 'landscape',
    },
    'treasure-fleet': {
        'shape': 'landscape',
    },
    'silver-train': {
        'shape': 'landscape',
    },
    'shipwreck': {
        'shape': 'landscape',
    },
    'marooned': {
        'shape': 'landscape',
    },
    'alley-duel': {
        'shape': 'landscape',
    },
    'hall-of-fame': {
        'shape': 'landscape',
    },
    'mutiny': {
        'shape': 'landscape',
    },
    # The source has a thin dark baked-in border, 3 px wide: crop inside it.
    'prison': {
        'shape': 'landscape',
        'source': (1659, 948),
        'crop': (6, 4, 1653, 945),
    },
    'retire-1': {
        'shape': 'landscape',
    },
    'retire-2': {
        'shape': 'landscape',
    },
    'retire-3': {
        'shape': 'landscape',
    },
    'retire-4': {
        'shape': 'landscape',
    },
    # Plain white flags on the palisade's watchtower and on the fort's
    # snapped flagpole, painted over with the town's flag; same rows as
    # harbour-arrival.
    'land-attack': {
        'shape': 'landscape',
        'source': (1659, 948),
        'variants': fort_flag_variants(FORT_QUADS['land-attack']),
        # The picture has no other blue: plain median cut folds the Dutch
        # flags' small blue band into the coats' grey-brown. A few k-means
        # passes keep it blue.
        'kmeans': 8,
    },
    'fort-walls': {
        'shape': 'landscape',
        'source': (1659, 948),
        'variants': fort_flag_variants(FORT_QUADS['fort-walls']),
    },
    # Sword fight backdrops (src/sword-renderer.mjs). The floor band came out
    # thinner than the backdrop's (rows 112-132): stretch it so the fencers'
    # feet land just before the wall foot, then crop to put it there.
    'fight-deck': {
        'shape': 'backdrop',
        'source': (1774, 887),
        'fixes': [stretch_floor(750, 150)],
        'crop': (0, 0, 1773, 900),
    },
    'fight-alley': {
        'shape': 'backdrop',
        'source': (1774, 887),
        'fixes': [stretch_floor(785, 149)],
        'crop': (0, 34, 1773, 934),
    },
    # A plain white flag on the parapet, painted over with the town's flag.
    'fight-walls': {
        'shape': 'backdrop',
        'source': (1774, 887),
        'fixes': [stretch_floor(790, 135)],
        'crop': (0, 25, 1773, 925),
        'variants': fort_flag_variants(FORT_QUADS['fight-walls']),
    },
}


# The ship that draws nearer after "Sail ho!", one picture per type and
# period band, too far off to read her colours: the generator drew her with
# no flags. Each is built to assets/vignettes/ships/<key>.png
# (--scene ships/<key>); src/vignettes.mjs (sightedShipArt) picks the key.
SHIP_KEYS = ['barque', 'sloop'] + [
    f'{band}-{kind}' for band in ('early', 'mid', 'late')
    for kind in ('pinnace', 'fluyt', 'merchantman', 'frigate' if band == 'late' else 'fastgalleon', 'galleon', 'wargalleon')
]
for key in SHIP_KEYS:
    SCENES[f'ships/{key}'] = {'shape': 'landscape', 'source': (1659, 948)}


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


def quantise(picture, colours=COLOURS, kmeans=0):
    return picture.quantize(colors=colours, method=Image.Quantize.MEDIANCUT, kmeans=kmeans, dither=Image.Dither.NONE)


def pixelate(image, size, colours=COLOURS):
    return quantise(reduce(image, size), colours)


def extend_sheet(scene, sheet_path):
    """Add the missing town-flag rows to a built sheet whose source is no
    longer at hand: each new flag is warped onto the plain white French row
    (row 2), at 8x the art pixels, shaded by that flag's own light and
    shadow, reduced, enhanced like the build and mapped onto the sheet's
    palette, so the existing rows stay byte for byte."""
    entry = SCENES[scene]
    size = SHAPES[entry['shape']]
    sheet = Image.open(sheet_path)
    rows = sheet.height // size[1]
    if rows >= len(FORT_FLAGS):
        raise SystemExit(f'{sheet_path} already has {rows} rows')
    source_w, source_h = entry['source']
    left, top, right, bottom = entry.get('crop') or centred_crop(entry['source'], size[0] / size[1])
    zoom = 8
    scale = zoom * size[0] / (right - left)
    quad = [((x - left) * scale, (y - top) * scale) for x, y in FORT_QUADS[scene]]
    white = sheet.convert('RGB').crop((0, 2 * size[1], size[0], 3 * size[1]))
    mask = Image.new('L', size)
    ImageDraw.Draw(mask).polygon([(x / zoom, y / zoom) for x, y in quad], fill=255)
    out = Image.new('P', (size[0], size[1] * len(FORT_FLAGS)))
    out.putpalette(sheet.getpalette())
    out.paste(sheet, (0, 0))
    for row in range(rows, len(FORT_FLAGS)):
        big = white.resize((size[0] * zoom, size[1] * zoom), Image.Resampling.NEAREST)
        paste_flag(big, FORT_FLAGS[row][1](), quad, shade=True)
        flagged = ImageEnhance.Color(ImageEnhance.Contrast(big.resize(size, Image.Resampling.BOX)).enhance(1.15)).enhance(1.2)
        picture = white.copy()
        picture.paste(flagged, (0, 0), mask)
        out.paste(picture.quantize(palette=sheet, dither=Image.Dither.NONE), (0, row * size[1]))
    out.save(sheet_path, optimize=True)


def retouch(scene, path):
    """Repaint flags on a built picture whose source is no longer at hand
    (the scene's `retouch`: flat flag maker and its corners in art pixels).
    The old flag's light (each pixel's brightest channel, so a red cross
    reads as lit cloth) shades the new one at 8x the art pixels; the result
    is reduced, enhanced like the build and mapped onto the picture's
    palette."""
    picture = Image.open(path)
    rgb = picture.convert('RGB')
    zoom = 8
    for make_flag, quad in SCENES[scene]['retouch']:
        big_quad = [(x * zoom, y * zoom) for x, y in quad]
        light = rgb.resize((rgb.width * zoom, rgb.height * zoom), Image.Resampling.NEAREST)
        light = Image.merge('RGB', [ImageChops.lighter(ImageChops.lighter(*light.split()[:2]), light.split()[2])] * 3)
        flat = Image.new('RGB', light.size, WHITE)
        paste_flag(flat, make_flag(), big_quad)
        cloth = Image.new('L', light.size)
        ImageDraw.Draw(cloth).polygon(big_quad, fill=255)
        brightest = max(1, ImageChops.multiply(light.convert('L'), cloth).getextrema()[1])
        shaded = ImageChops.multiply(flat, light.point(lambda value: min(255, round(value * 255 / brightest))))
        small = ImageEnhance.Color(ImageEnhance.Contrast(shaded.resize(rgb.size, Image.Resampling.BOX)).enhance(1.15)).enhance(1.2)
        mask = Image.new('L', rgb.size)
        ImageDraw.Draw(mask).polygon(quad, fill=255)
        # Map only the repainted pixels onto the palette's nearest colours, so
        # every other pixel keeps its index.
        palette = picture.getpalette()
        colours = [tuple(palette[i:i + 3]) for i in range(0, len(palette), 3)]
        indices = picture.load()
        for y in range(rgb.height):
            for x in range(rgb.width):
                if mask.getpixel((x, y)):
                    r, g, b = small.getpixel((x, y))
                    indices[x, y] = min(range(len(colours)), key=lambda i: (colours[i][0] - r) ** 2 + (colours[i][1] - g) ** 2 + (colours[i][2] - b) ** 2)
    picture.save(path, optimize=True)


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
        image = fix(image) or image
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
            picture = fix(picture) or picture
        sheet.paste(reduce(picture.crop(box), size), (0, row * size[1]))
    quantise(sheet, kmeans=entry.get('kmeans', 0)).save(out_path, optimize=True)


def check_box(box, shape, size):
    box_width, box_height = box[2] - box[0], box[3] - box[1]
    if abs(box_width / box_height - size[0] / size[1]) > 0.01:
        raise SystemExit(f'crop box {box} is not the {shape} aspect {size[0]} : {size[1]}')
    if box_width < size[0] or box_height < size[1]:
        raise SystemExit(f'source crop {box_width} x {box_height} is smaller than the {size[0]} x {size[1]} picture')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--scene', required=True, help='the vignette id, e.g. title-ship')
    parser.add_argument('--source', help='the supplied illustration')
    parser.add_argument('--extend-sheet', action='store_true',
                        help='add the missing town-flag rows to the built sheet, without its source')
    parser.add_argument('--retouch', action='store_true',
                        help="repaint the scene's `retouch` flags on the built picture, without its source")
    parser.add_argument('--shape', choices=SHAPES, help='needed only for a scene not in SCENES')
    parser.add_argument('--out', help='defaults to assets/vignettes/<scene>.png')
    args = parser.parse_args()
    if args.extend_sheet:
        extend_sheet(args.scene, args.out or f'assets/vignettes/{args.scene}.png')
    elif args.retouch:
        retouch(args.scene, args.out or f'assets/vignettes/{args.scene}.png')
    elif not args.source:
        parser.error('--source is required unless --extend-sheet or --retouch')
    else:
        build(args.scene, args.source, args.out or f'assets/vignettes/{args.scene}.png', args.shape)
