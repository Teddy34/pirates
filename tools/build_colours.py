#!/usr/bin/env python3
"""Build the "flying her colours" pictures: stern close-ups and their flags.

When the sighted ship is close enough, the lookout reads her colours
(encounters.md §2 step 8). The picture is a close view of her stern with a
large flag streaming from its flagstaff. The generator drew each stern with
one plain white flag; any flag is painted onto it in the game, so one
picture serves every nation, era and pirate (src/vignettes.mjs).

Two commands:

  python3 tools/build_colours.py flags
      draws every flag flat into assets/vignettes/colours/flags.png, one
      FLAG_W x FLAG_H cell per flag in FLAGS order, and lists the order in
      flags.json.

  python3 tools/build_colours.py stern --key <stern-key> --source <image>
      pixelates the stern illustration like tools/build_vignette.py into
      colours/<key>.png, and writes colours/<key>-map.png: for each art
      pixel of the white flag, red and green hold the flag's (u, v)
      coordinates (0-255 across the cloth) and blue its light (1-255, the
      folds' shading; 0 = not flag). The flag is found as the bright,
      unsaturated pixels inside the box SCENES gives, and its four corners
      are the extreme points of that area.

Needs Pillow.
"""
import argparse
import json
import math
import os

from PIL import Image, ImageDraw

from build_vignette import (BLUE, INK, ORANGE, RED, SHAPES, WHITE, centred_crop, cross_of_burgundy,
                            perspective_coefficients, pixelate, prince_flag, st_george, states_flag)

OUT = 'assets/vignettes/colours'
FLAG_W, FLAG_H = 72, 48
DRAW_W, DRAW_H = 360, 240
GOLD, BLACK, BLOOD = (226, 178, 52), (28, 24, 22), (168, 26, 30)
PURPLE = (110, 40, 110)


def field(colour):
    flag = Image.new('RGB', (DRAW_W, DRAW_H), colour)
    return flag, ImageDraw.Draw(flag)


def outlined(flag):
    ImageDraw.Draw(flag).rectangle([0, 0, DRAW_W - 1, DRAW_H - 1], outline=INK, width=4)
    return flag


# ---- Nations (sources in assets/vignettes/PROVENANCE.md, colours/) ----

def england_red_ensign():
    """England from the 1620s: red with St George's cross in the canton."""
    flag, draw = field(RED)
    canton = st_george(DRAW_W // 2, DRAW_H // 2)
    flag.paste(canton, (0, 0))
    return outlined(flag)


def france_blue_cross():
    """French merchant ships: a white cross on blue (the "old flag of the
    French nation" of the 1661 ordinance; on Champlain's 1612 map)."""
    flag, draw = field(BLUE)
    bar = DRAW_H // 5
    draw.rectangle([DRAW_W / 2 - bar / 2, 0, DRAW_W / 2 + bar / 2, DRAW_H], fill=WHITE)
    draw.rectangle([0, DRAW_H / 2 - bar / 2, DRAW_W, DRAW_H / 2 + bar / 2], fill=WHITE)
    return outlined(flag)


def france_white():
    """French royal ships: plain white (from 1638 on some charts, by the
    1661 ordinance the navy's alone)."""
    return outlined(field(WHITE)[0])


def spain_royal_arms():
    """Spanish navy from the 1670s (Charles II): white with the royal arms,
    simplified here to a crowned shield quartered with the red-and-gold
    castle and the white-and-purple lion."""
    flag, draw = field(WHITE)
    cx, top, w, h = DRAW_W / 2, 72, 124, 140
    for index, (x, y) in enumerate([(0, 0), (1, 0), (0, 1), (1, 1)]):
        box = [cx - w / 2 + x * w / 2, top + y * h / 2, cx + x * w / 2, top + (y + 1) * h / 2]
        castle = index in (0, 3)
        draw.rectangle(box, fill=RED if castle else WHITE)
        mx, my = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
        if castle:
            draw.rectangle([mx - 14, my - 10, mx + 14, my + 18], fill=GOLD)
            for dx in (-14, -2, 10):
                draw.rectangle([mx + dx, my - 20, mx + dx + 6, my - 10], fill=GOLD)
        else:
            draw.ellipse([mx - 14, my - 18, mx + 14, my + 18], fill=PURPLE)
    draw.rectangle([cx - w / 2, top, cx + w / 2, top + h], outline=INK, width=4)
    # The crown.
    draw.polygon([(cx - 44, top - 4), (cx + 44, top - 4), (cx + 50, top - 40), (cx + 22, top - 22),
                  (cx, top - 46), (cx - 22, top - 22), (cx - 50, top - 40)], fill=GOLD, outline=INK)
    return outlined(flag)


def plain_red():
    """The buccaneers' "bloody flag": plain red, no quarter."""
    return outlined(field(BLOOD)[0])


# ---- Pirate captains' own colours: original designs, no skulls (skull and
# crossbones flags date from about 1700, after the game's eras). ----

def cutlass(draw, cx, cy, size, colour, angle=0):
    """A broad, slightly curved short sword with a cup guard, blade to the right."""
    top, bottom = [], []
    for step in range(13):
        t = step / 12
        x = -size * 0.55 + t * size * 1.55
        y = -math.sin(t * math.pi * 0.8) * size * 0.16
        half = size * 0.11 * (1 - t * 0.55)
        top.append((x, y - half))
        bottom.append((x, y + half))
    blade = top + [(size * 1.05, -size * 0.02)] + list(reversed(bottom))
    guard = [(-size * 0.62, -size * 0.3), (-size * 0.5, -size * 0.3), (-size * 0.5, size * 0.3), (-size * 0.62, size * 0.3)]
    grip = [(-size * 0.95, -size * 0.08), (-size * 0.62, -size * 0.08), (-size * 0.62, size * 0.08), (-size * 0.95, size * 0.08)]
    for shape in (blade, guard, grip):
        draw.polygon(rotate(shape, cx, cy, angle), fill=colour)


def rotate(points, cx, cy, angle):
    c, s = math.cos(math.radians(angle)), math.sin(math.radians(angle))
    return [(cx + x * c - y * s, cy + x * s + y * c) for x, y in points]


def star(draw, cx, cy, outer, inner, points, colour, angle=-90):
    shape = []
    for index in range(points * 2):
        radius = outer if index % 2 == 0 else inner
        a = math.radians(angle + index * 180 / points)
        shape.append((cx + radius * math.cos(a), cy + radius * math.sin(a)))
    draw.polygon(shape, fill=colour)


def heart(draw, cx, cy, r, colour):
    draw.ellipse([cx - r, cy - r * 0.8, cx, cy + r * 0.2], fill=colour)
    draw.ellipse([cx, cy - r * 0.8, cx + r, cy + r * 0.2], fill=colour)
    draw.polygon([(cx - r * 0.97, cy - r * 0.15), (cx + r * 0.97, cy - r * 0.15), (cx, cy + r * 1.1)], fill=colour)


def hourglass(draw, cx, cy, r, colour):
    draw.rectangle([cx - r * 0.8, cy - r, cx + r * 0.8, cy - r * 0.84], fill=colour)
    draw.rectangle([cx - r * 0.8, cy + r * 0.84, cx + r * 0.8, cy + r], fill=colour)
    draw.polygon([(cx - r * 0.62, cy - r * 0.84), (cx + r * 0.62, cy - r * 0.84), (cx + r * 0.08, cy), (cx + r * 0.62, cy + r * 0.84),
                  (cx - r * 0.62, cy + r * 0.84), (cx - r * 0.08, cy)], fill=colour)


def anchor(draw, cx, cy, r, colour):
    w = r * 0.14
    draw.rectangle([cx - w / 2, cy - r * 0.8, cx + w / 2, cy + r * 0.85], fill=colour)
    draw.rectangle([cx - r * 0.45, cy - r * 0.6, cx + r * 0.45, cy - r * 0.6 + w], fill=colour)
    draw.ellipse([cx - r * 0.2, cy - r * 1.08, cx + r * 0.2, cy - r * 0.7], outline=colour, width=round(w * 0.8))
    draw.arc([cx - r * 0.8, cy - r * 0.2, cx + r * 0.8, cy + r * 0.95], 20, 160, fill=colour, width=round(w))
    for side in (-1, 1):
        x = cx + side * r * 0.76
        draw.polygon([(x, cy + r * 0.2), (x - side * r * 0.04, cy + r * 0.5), (x + side * r * 0.18, cy + r * 0.38)], fill=colour)


def crown(draw, cx, cy, r, colour):
    draw.polygon([(cx - r, cy + r * 0.5), (cx + r, cy + r * 0.5), (cx + r * 1.1, cy - r * 0.6), (cx + r * 0.5, cy - r * 0.05),
                  (cx, cy - r * 0.8), (cx - r * 0.5, cy - r * 0.05), (cx - r * 1.1, cy - r * 0.6)], fill=colour)
    draw.rectangle([cx - r, cy + r * 0.55, cx + r, cy + r * 0.8], fill=colour)


def crescent(draw, cx, cy, r, colour, background):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=colour)
    draw.ellipse([cx - r * 0.55, cy - r * 1.0, cx + r * 1.25, cy + r * 0.8], fill=background)


def sun(draw, cx, cy, r, colour):
    star(draw, cx, cy, r * 1.25, r * 0.7, 12, colour)
    draw.ellipse([cx - r * 0.7, cy - r * 0.7, cx + r * 0.7, cy + r * 0.7], fill=colour)


def arm_and_sword(draw, cx, cy, r, colour):
    """A forearm rising from the bottom, the fist holding up a broad sword."""
    draw.polygon([(cx - r * 0.75, cy + r * 1.2), (cx - r * 0.2, cy + r * 1.2), (cx + r * 0.2, cy + r * 0.25), (cx - r * 0.3, cy + r * 0.1)], fill=colour)
    draw.ellipse([cx - r * 0.42, cy - r * 0.2, cx + r * 0.3, cy + r * 0.42], fill=colour)
    draw.polygon([(cx - r * 0.13, cy - r * 0.2), (cx + r * 0.13, cy - r * 0.2), (cx + r * 0.1, cy - r * 1.05), (cx, cy - r * 1.25), (cx - r * 0.1, cy - r * 1.05)], fill=colour)
    draw.rectangle([cx - r * 0.45, cy - r * 0.32, cx + r * 0.45, cy - r * 0.18], fill=colour)


def axe(draw, cx, cy, r, colour, angle=0):
    """A boarding axe: a straight haft and a broad, curved blade."""
    haft = [(-r * 0.08, -r), (r * 0.08, -r), (r * 0.08, r), (-r * 0.08, r)]
    head = [(r * 0.05, -r * 0.95), (r * 0.45, -r * 1.15), (r * 0.7, -r * 0.75), (r * 0.72, -r * 0.45), (r * 0.45, -r * 0.1), (r * 0.05, -r * 0.4)]
    draw.polygon(rotate(haft, cx, cy, angle), fill=colour)
    draw.polygon(rotate(head, cx, cy, angle), fill=colour)


def key(draw, cx, cy, r, colour):
    w = r * 0.14
    draw.ellipse([cx - r * 1.0, cy - r * 0.35, cx - r * 0.3, cy + r * 0.35], outline=colour, width=round(w))
    draw.rectangle([cx - r * 0.32, cy - w / 2, cx + r, cy + w / 2], fill=colour)
    for x in (r * 0.65, r * 0.88):
        draw.rectangle([cx + x - w / 2, cy, cx + x + w / 2, cy + r * 0.35], fill=colour)


def grenade(draw, cx, cy, r, colour, flame):
    draw.ellipse([cx - r * 0.7, cy - r * 0.4, cx + r * 0.7, cy + r], fill=colour)
    draw.polygon([(cx - r * 0.25, cy - r * 0.35), (cx - r * 0.5, cy - r), (cx - r * 0.1, cy - r * 0.7), (cx, cy - r * 1.25),
                  (cx + r * 0.15, cy - r * 0.7), (cx + r * 0.5, cy - r * 1.0), (cx + r * 0.25, cy - r * 0.35)], fill=flame)


def trident(draw, cx, cy, r, colour):
    w = r * 0.12
    draw.rectangle([cx - w / 2, cy - r * 0.5, cx + w / 2, cy + r * 1.1], fill=colour)
    draw.rectangle([cx - r * 0.5, cy - r * 0.5, cx + r * 0.5, cy - r * 0.5 + w], fill=colour)
    for x in (-r * 0.5, 0, r * 0.5):
        draw.rectangle([cx + x - w / 2, cy - r * 1.0, cx + x + w / 2, cy - r * 0.45], fill=colour)
        draw.polygon([(cx + x - w, cy - r * 1.0), (cx + x + w, cy - r * 1.0), (cx + x, cy - r * 1.25)], fill=colour)


def arrow(draw, cx, cy, r, colour, angle=0):
    shaft = [(-r, -r * 0.05), (r * 0.7, -r * 0.05), (r * 0.7, r * 0.05), (-r, r * 0.05)]
    head = [(r * 0.65, -r * 0.22), (r * 1.1, 0), (r * 0.65, r * 0.22)]
    fletch = [(-r, -r * 0.05), (-r * 0.75, -r * 0.05), (-r * 0.95, -r * 0.25), (-r * 1.15, -r * 0.25)]
    fletch2 = [(x, -y) for x, y in fletch]
    for shape in (shaft, head, fletch, fletch2):
        draw.polygon(rotate(shape, cx, cy, angle), fill=colour)


def fish(draw, cx, cy, r, colour, background):
    draw.ellipse([cx - r, cy - r * 0.42, cx + r * 0.6, cy + r * 0.42], fill=colour)
    draw.polygon([(cx + r * 0.45, cy), (cx + r * 1.1, cy - r * 0.45), (cx + r * 1.1, cy + r * 0.45)], fill=colour)
    draw.polygon([(cx - r * 0.3, cy - r * 0.35), (cx - r * 0.05, cy - r * 0.75), (cx + r * 0.1, cy - r * 0.3)], fill=colour)
    draw.ellipse([cx - r * 0.75, cy - r * 0.15, cx - r * 0.58, cy + r * 0.02], fill=background)


def lightning(draw, cx, cy, r, colour):
    draw.polygon([(cx + r * 0.25, cy - r * 1.1), (cx - r * 0.45, cy + r * 0.1), (cx - r * 0.02, cy + r * 0.1), (cx - r * 0.3, cy + r * 1.1),
                  (cx + r * 0.5, cy - r * 0.2), (cx + r * 0.05, cy - r * 0.2), (cx + r * 0.35, cy - r * 1.1)], fill=colour)


def coins(draw, cx, cy, r, colour):
    for dx, dy in ((-0.6, 0.35), (0.6, 0.35), (0, -0.6)):
        draw.ellipse([cx + dx * r - r * 0.42, cy + dy * r - r * 0.42, cx + dx * r + r * 0.42, cy + dy * r + r * 0.42], fill=colour)


def dice(draw, cx, cy, r, colour, background):
    for dx, dy, pips in ((-0.55, 0.1, 5), (0.5, -0.15, 3)):
        x, y, h = cx + dx * r, cy + dy * r, r * 0.45
        draw.rectangle([x - h, y - h, x + h, y + h], fill=colour)
        spots = {3: [(-0.5, -0.5), (0, 0), (0.5, 0.5)], 5: [(-0.5, -0.5), (0.5, -0.5), (0, 0), (-0.5, 0.5), (0.5, 0.5)]}[pips]
        for sx, sy in spots:
            draw.ellipse([x + sx * h - h * 0.17, y + sy * h - h * 0.17, x + sx * h + h * 0.17, y + sy * h + h * 0.17], fill=background)


def flame(draw, cx, cy, r, colour):
    """Three tongues of fire rising from a broad base."""
    draw.ellipse([cx - r * 0.7, cy - r * 0.1, cx + r * 0.7, cy + r * 0.9], fill=colour)
    for dx, h, w in ((-0.4, 0.75, 0.32), (0.0, 1.2, 0.38), (0.42, 0.85, 0.32)):
        x = cx + dx * r
        draw.polygon([(x - w * r, cy + r * 0.4), (x + w * r, cy + r * 0.4), (x + w * r * 0.4, cy - h * r * 0.5), (x + w * r * 0.1, cy - h * r)], fill=colour)


def chain(draw, cx, cy, r, colour):
    for index in range(3):
        x = cx + (index - 1) * r * 0.62
        draw.ellipse([x - r * 0.42, cy - r * 0.26, x + r * 0.42, cy + r * 0.26], outline=colour, width=round(r * 0.12))


def dagger(draw, cx, cy, r, colour, angle=0):
    blade = [(-r * 0.12, -r * 0.35), (r * 0.12, -r * 0.35), (0, -r * 1.2)]
    guard = [(-r * 0.4, -r * 0.35), (r * 0.4, -r * 0.35), (r * 0.4, -r * 0.22), (-r * 0.4, -r * 0.22)]
    grip = [(-r * 0.08, -r * 0.22), (r * 0.08, -r * 0.22), (r * 0.08, r * 0.2), (-r * 0.08, r * 0.2)]
    for shape in (blade, guard, grip):
        draw.polygon(rotate(shape, cx, cy, angle), fill=colour)
    x, y = rotate([(0, r * 0.28)], cx, cy, angle)[0]
    draw.ellipse([x - r * 0.13, y - r * 0.13, x + r * 0.13, y + r * 0.13], fill=colour)


def bell(draw, cx, cy, r, colour):
    draw.polygon([(cx - r * 0.35, cy - r * 0.7), (cx + r * 0.35, cy - r * 0.7), (cx + r * 0.5, cy + r * 0.3), (cx + r * 0.8, cy + r * 0.6),
                  (cx - r * 0.8, cy + r * 0.6), (cx - r * 0.5, cy + r * 0.3)], fill=colour)
    draw.ellipse([cx - r * 0.35, cy - r * 0.95, cx + r * 0.35, cy - r * 0.45], fill=colour)
    draw.ellipse([cx - r * 0.15, cy + r * 0.55, cx + r * 0.15, cy + r * 0.85], fill=colour)


def little_ship(draw, cx, cy, r, colour):
    draw.polygon([(cx - r, cy + r * 0.3), (cx + r * 0.9, cy + r * 0.3), (cx + r * 0.6, cy + r * 0.7), (cx - r * 0.7, cy + r * 0.7)], fill=colour)
    for x, h in ((-0.45, 0.9), (0.15, 1.1)):
        draw.polygon([(cx + x * r - r * 0.3, cy - h * r), (cx + x * r + r * 0.3, cy - h * r), (cx + x * r + r * 0.35, cy + r * 0.15),
                      (cx + x * r - r * 0.35, cy + r * 0.15)], fill=colour)


def black_chief(make_emblem):
    """A black band across the top, the emblem below it."""
    def emblem(draw, cx, cy, background):
        draw.rectangle([0, 0, DRAW_W, DRAW_H * 0.28], fill=BLACK)
        make_emblem(draw, cx, cy + DRAW_H * 0.14, background)
    return emblem


def pirate_flag(colour, emblem, border=None):
    def make():
        flag, draw = field(colour)
        if border:
            draw.rectangle([10, 10, DRAW_W - 11, DRAW_H - 11], outline=border, width=12)
        emblem(draw, DRAW_W / 2, DRAW_H / 2, colour)
        return outlined(flag)
    return make


# One design per captain's surname: `pirate-<nation * 8 + surname>`, the
# nation and surname of the name (src/mechanics.mjs, captainName), as the
# original ties its pirate flags to captains' names (a flag picture per
# nation and name row, table 0x32F90, read at 0xD78B). New designs, not the
# original's.
PIRATE_FLAGS = [
    pirate_flag(BLOOD, lambda d, x, y, bg: cutlass(d, x + 10, y + 10, 110, WHITE, -20)),
    pirate_flag(BLOOD, lambda d, x, y, bg: (cutlass(d, x, y + 10, 105, GOLD, -40), cutlass(d, x, y + 10, 105, GOLD, 220))),
    pirate_flag(BLOOD, lambda d, x, y, bg: hourglass(d, x, y, 80, WHITE)),
    pirate_flag(BLOOD, lambda d, x, y, bg: arm_and_sword(d, x, y + 6, 92, WHITE)),
    pirate_flag(BLOOD, lambda d, x, y, bg: heart(d, x, y - 6, 70, WHITE)),
    pirate_flag(BLOOD, lambda d, x, y, bg: crown(d, x, y, 70, GOLD)),
    pirate_flag(BLOOD, lambda d, x, y, bg: star(d, x, y, 90, 36, 8, GOLD)),
    pirate_flag(BLOOD, lambda d, x, y, bg: crescent(d, x - 10, y, 78, WHITE, bg)),
    pirate_flag(BLOOD, lambda d, x, y, bg: anchor(d, x, y, 90, WHITE)),
    pirate_flag(BLOOD, lambda d, x, y, bg: lightning(d, x, y, 92, GOLD)),
    pirate_flag(BLOOD, lambda d, x, y, bg: axe(d, x - 20, y + 15, 100, WHITE, 20)),
    pirate_flag(BLOOD, lambda d, x, y, bg: coins(d, x, y, 70, GOLD)),
    pirate_flag(BLOOD, lambda d, x, y, bg: key(d, x, y, 100, WHITE)),
    pirate_flag(BLOOD, lambda d, x, y, bg: sun(d, x, y, 70, GOLD)),
    pirate_flag(BLOOD, lambda d, x, y, bg: grenade(d, x, y + 10, 80, BLACK, GOLD)),
    pirate_flag(BLOOD, lambda d, x, y, bg: trident(d, x, y + 6, 90, GOLD)),
    pirate_flag(BLOOD, lambda d, x, y, bg: arrow(d, x, y, 120, WHITE, -15)),
    pirate_flag(BLOOD, lambda d, x, y, bg: fish(d, x, y, 110, WHITE, bg)),
    pirate_flag(BLOOD, lambda d, x, y, bg: hourglass(d, x, y, 80, BLACK), border=BLACK),
    pirate_flag(BLOOD, lambda d, x, y, bg: heart(d, x, y - 6, 70, BLACK), border=GOLD),
    pirate_flag(BLOOD, lambda d, x, y, bg: dice(d, x, y, 100, WHITE, bg)),
    pirate_flag(BLOOD, lambda d, x, y, bg: flame(d, x, y, 85, GOLD)),
    pirate_flag(BLOOD, lambda d, x, y, bg: chain(d, x, y, 110, WHITE)),
    pirate_flag(BLOOD, lambda d, x, y, bg: dagger(d, x, y + 30, 115, WHITE, 30)),
    pirate_flag(BLOOD, lambda d, x, y, bg: bell(d, x, y, 80, GOLD)),
    pirate_flag(BLOOD, lambda d, x, y, bg: little_ship(d, x, y, 90, BLACK)),
    pirate_flag(BLOOD, black_chief(lambda d, x, y, bg: cutlass(d, x + 10, y, 90, WHITE, -15))),
    pirate_flag(BLOOD, black_chief(lambda d, x, y, bg: star(d, x, y, 66, 26, 8, GOLD))),
    pirate_flag(BLOOD, black_chief(lambda d, x, y, bg: crescent(d, x - 8, y, 58, WHITE, bg))),
    pirate_flag(BLOOD, black_chief(lambda d, x, y, bg: anchor(d, x, y, 66, WHITE))),
    pirate_flag(BLOOD, black_chief(lambda d, x, y, bg: key(d, x, y, 80, GOLD))),
    pirate_flag(BLOOD, black_chief(lambda d, x, y, bg: sun(d, x, y, 50, GOLD))),
]

# The flag cells in order; keep in step with FLAG_KEYS in src/vignettes.mjs.
FLAGS = [
    ('spain-burgundy', lambda: cross_of_burgundy(DRAW_W, DRAW_H)),
    ('spain-arms', spain_royal_arms),
    ('england-george', lambda: st_george(DRAW_W, DRAW_H)),
    ('england-red-ensign', england_red_ensign),
    ('france-blue-cross', france_blue_cross),
    ('france-white', france_white),
    ('holland-prince', lambda: prince_flag().resize((DRAW_W, DRAW_H))),
    ('holland-states', lambda: states_flag().resize((DRAW_W, DRAW_H))),
    ('pirate-red', plain_red),
] + [(f'pirate-{index}', make) for index, make in enumerate(PIRATE_FLAGS)]

COLUMNS = 9


def build_flags():
    rows = math.ceil(len(FLAGS) / COLUMNS)
    atlas = Image.new('RGB', (FLAG_W * COLUMNS, FLAG_H * rows), (0, 0, 0))
    for index, (_, make) in enumerate(FLAGS):
        flag = make().resize((FLAG_W, FLAG_H), Image.Resampling.BOX)
        atlas.paste(flag, ((index % COLUMNS) * FLAG_W, (index // COLUMNS) * FLAG_H))
    os.makedirs(OUT, exist_ok=True)
    atlas.save(f'{OUT}/flags.png', optimize=True)
    with open(f'{OUT}/flags.json', 'w') as out:
        json.dump({'cell': [FLAG_W, FLAG_H], 'columns': COLUMNS, 'flags': [name for name, _ in FLAGS]}, out, indent=1)
        out.write('\n')


# Each stern's source size and the box (left, top, right, bottom) that
# holds its white flag and nothing else that is white.
STERNS = {
    'stern-early': {'source': (1659, 948), 'flag_box': (0, 0, 862, 500)},
    'stern-mid': {'source': (1659, 948), 'flag_box': (0, 0, 952, 520)},
    'stern-late': {'source': (1659, 948), 'flag_box': (0, 0, 892, 520)},
    'stern-small': {'source': (1659, 948), 'flag_box': (0, 0, 952, 520)},
}


def is_cloth(pixel):
    r, g, b = pixel
    return min(r, g, b) > 150 and max(r, g, b) - min(r, g, b) < 40


def flag_area(image, box):
    pixels = image.load()
    area = set()
    for y in range(box[1], box[3]):
        for x in range(box[0], box[2]):
            if is_cloth(pixels[x, y]):
                area.add((x, y))
    return area


def corners(area):
    """Hoist top, fly top, fly bottom, hoist bottom: the flag streams to
    the left, so the hoist is on the right."""
    return [max(area, key=lambda p: p[0] - p[1]), min(area, key=lambda p: p[0] + p[1]),
            min(area, key=lambda p: p[0] - p[1]), max(area, key=lambda p: p[0] + p[1])]


def build_stern(key, source_path):
    entry = STERNS[key]
    image = Image.open(source_path).convert('RGB')
    if image.size != entry['source']:
        raise SystemExit(f'expected a {entry["source"]} source for {key}, got {image.size}')
    size = SHAPES['landscape']
    box = centred_crop(image.size, size[0] / size[1])
    area = flag_area(image, entry['flag_box'])
    quad = corners(area)
    # (u, v) of each source pixel: the inverse of the perspective that puts
    # the flat flag (0..1 x 0..1) on the quad.
    a, b, c, d, e, f, g, h = perspective_coefficients(quad, [(0, 0), (1, 0), (1, 1), (0, 1)])
    light = sorted(sum(image.getpixel(p)) / 3 for p in area)
    white = light[int(len(light) * 0.95)]
    scale_x, scale_y = (box[2] - box[0]) / size[0], (box[3] - box[1]) / size[1]
    flag_map = Image.new('RGB', size, (0, 0, 0))
    sums = {}
    for (x, y) in area:
        if not (box[0] <= x < box[2] and box[1] <= y < box[3]):
            continue
        cell = (int((x - box[0]) / scale_x), int((y - box[1]) / scale_y))
        w = g * x + h * y + 1
        u, v = (a * x + b * y + c) / w, (d * x + e * y + f) / w
        shade = sum(image.getpixel((x, y))) / 3 / white
        total = sums.setdefault(cell, [0, 0, 0, 0])
        total[0] += u
        total[1] += v
        total[2] += shade
        total[3] += 1
    block = scale_x * scale_y
    for (cx, cy), (u, v, shade, count) in sums.items():
        # Edge pixels a fifth cloth are painted too, or white specks stay.
        if count < block / 5:
            continue
        flag_map.putpixel((cx, cy), (
            max(0, min(255, round(u / count * 255))),
            max(0, min(255, round(v / count * 255))),
            max(1, min(255, round(shade / count * 200))),
        ))
    os.makedirs(OUT, exist_ok=True)
    pixelate(image.crop(box), size).save(f'{OUT}/{key}.png', optimize=True)
    flag_map.save(f'{OUT}/{key}-map.png', optimize=True)
    print(key, 'flag corners', quad)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('command', choices=['flags', 'stern'])
    parser.add_argument('--key', choices=STERNS)
    parser.add_argument('--source')
    args = parser.parse_args()
    if args.command == 'flags':
        build_flags()
    else:
        if not args.key or not args.source:
            raise SystemExit('stern needs --key and --source')
        build_stern(args.key, args.source)
