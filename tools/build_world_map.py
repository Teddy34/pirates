#!/usr/bin/env python3
"""Build the web port's navigation map from Pirates! Gold's tile map and tile bank.

The original tests land and sea per map pixel, not per tile: it reads the
colour of the 16x16-pixel tile under the position and looks it up in the
256-entry colour -> class table at 0x4113C (landing_and_overland.md §1,
porting_guide.md §6). This tool records only those classes, never colours,
so no tile artwork or palette is copied.

Output (gzip-compressed, deterministic):
  4 bytes   magic b'PNM2'
  76800     640x480 cell classes, four 2-bit cells per byte, LSB first:
            0 all water, 1 all land, 2 mixed, 3 town tile (all land)
  64 each   for every mixed cell, in row-major cell order: its 16x16 pixel
            classes, row-major, four 2-bit pixels per byte, LSB first:
            0 water, 1 shallow water, 2 land
"""

import argparse
import gzip
import json
from pathlib import Path
from PIL import Image

MAGIC = b'PNM2'
TILE_SIZE = 16
IMB_FIRST_TILE = 0x318
IMB_TILE_BYTES = 268
IMB_PIXEL_OFFSET = 10
TOWN_TILES = range(123, 128)
CELL_WATER, CELL_LAND, CELL_MIXED, CELL_TOWN = range(4)
PIXEL_WATER, PIXEL_SHALLOW, PIXEL_LAND = range(3)
# 0x4113C classes: 1 shallow, 2 land, 3 water.
ORIGINAL_TO_PIXEL = {1: PIXEL_SHALLOW, 2: PIXEL_LAND, 3: PIXEL_WATER}


def pack2(values) -> bytes:
    return bytes(sum(values[offset + index] << (index * 2) for index in range(4))
                 for offset in range(0, len(values), 4))


def tile_pixel_classes(imb: bytes, colour_class: list[int]) -> list[list[int]]:
    tiles = []
    for tile in range(256):
        base = IMB_FIRST_TILE + tile * IMB_TILE_BYTES + IMB_PIXEL_OFFSET
        pixels = imb[base:base + TILE_SIZE * TILE_SIZE]
        tiles.append([ORIGINAL_TO_PIXEL[colour_class[colour]] for colour in pixels])
    return tiles


def apply_rsd(tiles: bytearray, delta: bytes) -> None:
    position = offset = 0
    while offset < len(delta):
        command = delta[offset]
        if command == 0x80:
            position += delta[offset + 1] | delta[offset + 2] << 8
            offset += 3
        elif command > 0x80:
            position += command - 0x80
            offset += 1
        else:
            tiles[position:position + command] = delta[offset + 1:offset + 1 + command]
            position += command
            offset += command + 1
    if position != len(tiles):
        raise ValueError(f'RSD walked {position} cells, expected {len(tiles)}')


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path, help='PCX/MAP1560.PCX (tile-index map)')
    parser.add_argument('destination', type=Path)
    parser.add_argument('--imb', type=Path, help='MAP.IMB tile bank (default: beside the PCX directory)')
    parser.add_argument('--rsd', type=Path, help='optional era delta applied to MAP1560')
    parser.add_argument('--tables', type=Path,
                        default=Path(__file__).resolve().parents[1].parent / 'piratesgold/evidence/data/world_tables.json',
                        help='world_tables.json holding the decoded 0x4113C pixel_class table')
    args = parser.parse_args()

    image = Image.open(args.source)
    if image.size != (640, 480):
        raise ValueError(f'expected 640x480 map, got {image.size}')
    imb = (args.imb or args.source.parent.parent / 'MAP.IMB').read_bytes()
    if len(imb) < IMB_FIRST_TILE + 256 * IMB_TILE_BYTES:
        raise ValueError('MAP.IMB is too short for 256 tiles')
    colour_class = json.loads(args.tables.read_text())['pixel_class']['values']
    if len(colour_class) != 256:
        raise ValueError('pixel_class table must have 256 entries')

    tiles = bytearray(image.tobytes())
    if args.rsd:
        apply_rsd(tiles, args.rsd.read_bytes())

    pixel_classes = tile_pixel_classes(imb, colour_class)
    tile_cell_class = []
    for tile, pixels in enumerate(pixel_classes):
        kinds = set(pixels)
        if kinds == {PIXEL_WATER}:
            tile_cell_class.append(CELL_WATER)
        elif kinds == {PIXEL_LAND}:
            tile_cell_class.append(CELL_TOWN if tile in TOWN_TILES else CELL_LAND)
        else:
            tile_cell_class.append(CELL_MIXED)

    cells = [tile_cell_class[tile] for tile in tiles]
    blocks = b''.join(pack2(pixel_classes[tile]) for tile, cell in zip(tiles, cells) if cell == CELL_MIXED)
    payload = MAGIC + pack2(cells) + blocks

    args.destination.parent.mkdir(parents=True, exist_ok=True)
    args.destination.write_bytes(gzip.compress(payload, compresslevel=9, mtime=0))
    print(f'wrote {args.destination}: {cells.count(CELL_MIXED)} mixed cells, '
          f'{len(payload)} bytes before compression')


if __name__ == '__main__':
    main()
