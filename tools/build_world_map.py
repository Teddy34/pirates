#!/usr/bin/env python3
"""Build the web port's packed navigation map from Pirates! Gold's MAP1560.PCX.

Each output byte stores four two-bit cells, left to right. Classes are:
0 sea, 1 land, 2 coast/detail, 3 town. This keeps the decoded coastline and
collision geometry without copying the original tile artwork or palette.
"""

import argparse
from pathlib import Path
from PIL import Image


def tile_class(tile_index: int) -> int:
    if tile_index < 80:
        return 0
    if tile_index < 100:
        return 1
    if 123 <= tile_index <= 127:
        return 3
    return 2


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    parser.add_argument('--rsd', type=Path, help='optional era delta applied to MAP1560')
    args = parser.parse_args()

    image = Image.open(args.source)
    if image.size != (640, 480):
        raise ValueError(f'expected 640x480 map, got {image.size}')

    tiles = bytearray(image.get_flattened_data())
    if args.rsd:
        delta = args.rsd.read_bytes()
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

    cells = [tile_class(value) for value in tiles]
    packed = bytearray()
    for offset in range(0, len(cells), 4):
        packed.append(sum(cells[offset + index] << (index * 2) for index in range(4)))

    args.destination.parent.mkdir(parents=True, exist_ok=True)
    args.destination.write_bytes(packed)
    print(f'wrote {len(packed)} bytes to {args.destination}')


if __name__ == '__main__':
    main()
