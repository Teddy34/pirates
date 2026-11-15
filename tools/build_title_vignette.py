#!/usr/bin/env python3
"""Build assets/vignettes/title-ship.png, the title screen picture.

The source is a 1536 x 1024 diffusion-generated comic-style illustration
supplied by the user (see assets/vignettes/PROVENANCE.md); it is not kept in
the repository. The tool:

1. repaints the three Union flags in the source (the ensign's canton, the
   jack at the fore topmast and the fort's flag) as the 1606 Union Flag. The
   generated picture drew the post-1801 flag with St Patrick's red saltire,
   an anachronism for 1560-1680. A flat 1606 flag is warped onto each flag's
   four corners;
2. reduces the whole picture to 240 x 160 (3 : 2, the source's own shape)
   with a box filter;
3. raises contrast (x1.15) and colour (x1.2) and quantises to 32 colours
   without dithering, like the governor portraits.

Usage: python3 tools/build_title_vignette.py --source <image> [--out <png>]
Needs Pillow.
"""
import argparse

from PIL import Image, ImageDraw, ImageEnhance

PICTURE_SIZE = (240, 160)
SOURCE_SIZE = (1536, 1024)
COLOURS = 32
BLUE, WHITE, RED, INK = (38, 74, 150), (246, 242, 228), (206, 44, 40), (30, 24, 20)

# Corners of each flag in source pixels: hoist top, fly top, fly bottom,
# hoist bottom (the ensign flies from a staff on its right).
FLAG_QUADS = {
    'ensign canton': [(250, 448), (184, 486), (186, 536), (254, 517)],
    'fore-topmast jack': [(383, 101), (428, 120), (429, 147), (383, 135)],
    'fort flag': [(1251, 559), (1273, 568), (1273, 579), (1251, 576)],
}


def union_flag_1606(width=240, height=120):
    """The 1606 Union Flag: St Andrew's white saltire on blue under St
    George's red cross with its white border; no St Patrick's saltire."""
    flag = Image.new('RGB', (width, height), BLUE)
    draw = ImageDraw.Draw(flag)
    saltire = round(height * 0.2)
    draw.line([(0, 0), (width, height)], fill=WHITE, width=saltire)
    draw.line([(0, height), (width, 0)], fill=WHITE, width=saltire)
    border = round(height / 3)
    draw.rectangle([width / 2 - border / 2, 0, width / 2 + border / 2, height], fill=WHITE)
    draw.rectangle([0, height / 2 - border / 2, width, height / 2 + border / 2], fill=WHITE)
    cross = round(height / 5)
    draw.rectangle([width / 2 - cross / 2, 0, width / 2 + cross / 2, height], fill=RED)
    draw.rectangle([0, height / 2 - cross / 2, width, height / 2 + cross / 2], fill=RED)
    draw.rectangle([0, 0, width - 1, height - 1], outline=INK, width=3)
    return flag


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


def build(source_path, out_path):
    image = Image.open(source_path).convert('RGB')
    if image.size != SOURCE_SIZE:
        raise SystemExit(f'expected a {SOURCE_SIZE[0]} x {SOURCE_SIZE[1]} source, got {image.size}')
    flag = union_flag_1606()
    corners = [(0, 0), (flag.width, 0), (flag.width, flag.height), (0, flag.height)]
    for quad in FLAG_QUADS.values():
        warped = flag.transform(image.size, Image.Transform.PERSPECTIVE, perspective_coefficients(quad, corners), Image.Resampling.BICUBIC)
        mask = Image.new('L', image.size)
        ImageDraw.Draw(mask).polygon(quad, fill=255)
        image.paste(warped, (0, 0), mask)
    picture = image.resize(PICTURE_SIZE, Image.Resampling.BOX)
    picture = ImageEnhance.Contrast(picture).enhance(1.15)
    picture = ImageEnhance.Color(picture).enhance(1.2)
    picture.quantize(colors=COLOURS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(out_path, optimize=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--source', required=True, help='the 1536 x 1024 source illustration')
    parser.add_argument('--out', default='assets/vignettes/title-ship.png')
    args = parser.parse_args()
    build(args.source, args.out)
