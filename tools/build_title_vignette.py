#!/usr/bin/env python3
"""Build assets/vignettes/title-ship.png, the title screen picture.

The source is a 1536 x 1024 diffusion-generated comic-style illustration
supplied by the user (see assets/vignettes/PROVENANCE.md); it is not kept in
the repository. The tool reduces the whole picture to 240 x 160 (3 : 2, the
source's own shape) with a box filter, raises contrast (x1.15) and colour
(x1.2), and quantises to 256 colours (the most an indexed PNG holds)
without dithering. The retro look comes from the pixel size, not from a tiny
palette; at 32 colours the flags' red folded into the hull browns.

Usage: python3 tools/build_title_vignette.py --source <image> [--out <png>]
Needs Pillow.
"""
import argparse

from PIL import Image, ImageEnhance

PICTURE_SIZE = (240, 160)
SOURCE_SIZE = (1536, 1024)
COLOURS = 256


def build(source_path, out_path):
    image = Image.open(source_path).convert('RGB')
    if image.size != SOURCE_SIZE:
        raise SystemExit(f'expected a {SOURCE_SIZE[0]} x {SOURCE_SIZE[1]} source, got {image.size}')
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
