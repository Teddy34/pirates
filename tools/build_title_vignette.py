#!/usr/bin/env python3
"""Build assets/vignettes/title-ship.png, the title screen picture.

The source is a 1536 x 1024 diffusion-generated comic-style illustration
supplied by the user (see assets/vignettes/PROVENANCE.md); it is not kept in
the repository. The tool first repaints the fort's flag as the Cross of
Burgundy, the Spanish flag of 1560-1680: the source drew the red-yellow-red
flag, which dates from 1785. A flat flag is warped onto the flag's four
corners. It then reduces the whole picture to 240 x 160 (3 : 2, the
source's own shape) with a box filter, raises contrast (x1.15) and colour
(x1.2), and quantises to 256 colours (the most an indexed PNG holds)
without dithering. The retro look comes from the pixel size, not from a tiny
palette; at 32 colours the flags' red folded into the hull browns.

Usage: python3 tools/build_title_vignette.py --source <image> [--out <png>]
Needs Pillow.
"""
import argparse

from PIL import Image, ImageDraw, ImageEnhance

PICTURE_SIZE = (240, 160)
SOURCE_SIZE = (1536, 1024)
COLOURS = 256
WHITE, RED, INK = (244, 240, 226), (196, 32, 36), (30, 24, 20)
# The fort flag's corners in source pixels: hoist top, fly top, fly bottom,
# hoist bottom.
FORT_FLAG = [(1252, 551), (1306, 563), (1309, 605), (1252, 596)]


def cross_of_burgundy(width=180, height=120):
    """A red saltire of ragged staves (knots along each stave) on white."""
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


def paste_flag(image, flag, quad):
    corners = [(0, 0), (flag.width, 0), (flag.width, flag.height), (0, flag.height)]
    warped = flag.transform(image.size, Image.Transform.PERSPECTIVE, perspective_coefficients(quad, corners), Image.Resampling.BICUBIC)
    mask = Image.new('L', image.size)
    ImageDraw.Draw(mask).polygon(quad, fill=255)
    image.paste(warped, (0, 0), mask)


def build(source_path, out_path):
    image = Image.open(source_path).convert('RGB')
    if image.size != SOURCE_SIZE:
        raise SystemExit(f'expected a {SOURCE_SIZE[0]} x {SOURCE_SIZE[1]} source, got {image.size}')
    paste_flag(image, cross_of_burgundy(), FORT_FLAG)
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
