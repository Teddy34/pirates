#!/usr/bin/env python3
"""Build the sprite-stacked ships (assets/sprites/ship-stacks-<size>.png).

Follows the sprite-stacking skill vendored in tools/sprite-stacking (path c:
no image generator, the agent draws the four orthographic views in code).
Each ship type is drawn as four pixel-art views (TOP, SIDE, FRONT, BACK) at
one pixel per art pixel and carved into a strip of top-down slices with the
skill's visual-hull `carve`. A ship's rig defeats a single carve (a lateen
mizzen's side area meets the square sails' front area and fills in as a
block), so each part (hull, bowsprit, every mast with its sails, the jibs)
is drawn and carved on its own and the parts' volumes are joined.

Output, per size (`battle` for the sea battle, `map` for the sailing map):
one PNG atlas, one row per ship type and rig state, each row a strip of
`slices` cells of `width` x `length` pixels (ground slice on the left, the
bow pointing down the cell), and `src/ship-stack-data.mjs` with the cell
sizes, the rows and each row's masthead (where the game paints the flag).

Usage: python3 tools/build_ship_stacks.py [--check DIR]
  --check DIR  also writes each row's four views and the skill's check sheet
               (views, four turntable angles, exploded view) to DIR.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SLICER = ROOT / "tools" / "sprite-stacking" / "scripts" / "views_to_slices.py"


def load_slicer():
    spec = importlib.util.spec_from_file_location("views_to_slices", SLICER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


slicer = load_slicer()


def rgb(hex_colour: str) -> tuple[int, int, int]:
    return tuple(int(hex_colour[i:i + 2], 16) for i in (1, 3, 5))


# Hull palettes, as in src/battle-ship-sprites.mjs, with a top (deck) ramp
# and a side ramp. `rail` caps the bulwarks and castle edges.
HULLS = {
    "merchant": dict(side="#7a4a27", sideDark="#4e2f19", sideLight="#8f5a30", deck="#b08049", deckLight="#c99a5c", rail="#5a3820", wale="#5a3820", port="#2a1a10", stern="#6a3f22"),
    "fluyt": dict(side="#93673b", sideDark="#5e4026", sideLight="#a87a49", deck="#c29a62", deckLight="#d8b47a", rail="#6b4a2b", wale="#6b4a2b", port="#2a1a10", stern="#7e5732"),
    "war": dict(side="#3b2a1f", sideDark="#251912", sideLight="#4b3627", deck="#8a6038", deckLight="#a8784a", rail="#2e1f14", wale="#d9b04a", port="#151010", stern="#33241a"),
    "galleon": dict(side="#6a2f1f", sideDark="#431c13", sideLight="#7e3a26", deck="#ad7a45", deckLight="#c89659", rail="#d6a73c", wale="#d6a73c", port="#1c120c", stern="#5a2718"),
}

# Canvas: lit face, shaded face, the back of the sail, and the furled
# bundle. The game recolours exactly these while sails are being changed
# and pierces them with shot holes (SAIL_COLOURS in ship-stack-data.mjs).
SAIL = dict(lit="#f2e6c2", shade="#cdb581", back="#d9c79a", furled="#d5c08c")
WOOD = dict(mast="#3a2614", yard="#5a3d24", glow="#f6cf5c", window="#20150d")

# One design per ship type, 0 pinnace ... 7 galleon, after the battle
# designs in src/battle-ship-sprites.mjs: `length` the hull in art pixels,
# `beam` the half-beam as a share of it, `depth` the freeboard, `shape` the
# deck outline, `fore`/`aft` castles (pixels above the deck and the aft
# one's share of the hull), `poop` a further step aft, `gunRows` rows of
# ports, `sprit` the bowsprit's reach, `masts` place along the hull (bow
# positive), height as a share of the mainmast and rig.
DESIGNS = [
    dict(name="Pinnace", length=14, beam=.2, depth=2, shape="sharp", hull="merchant", aft=(1, .3), sprit=.14, mastHeight=.95,
         masts=[dict(at=.2, height=.8, rig="square", tiers=1), dict(at=-.1, height=1, rig="square", tiers=2)]),
    dict(name="Sloop", length=15, beam=.19, depth=2, shape="sharp", hull="merchant", sprit=.34, jibs=2, mastHeight=1.05,
         masts=[dict(at=.14, height=1, rig="gaff", topsail=True)]),
    dict(name="Barque", length=17, beam=.2, depth=3, shape="sharp", hull="merchant", aft=(1, .3), sprit=.16, mastHeight=.9,
         masts=[dict(at=.26, height=.85, rig="square", tiers=2), dict(at=0, height=1, rig="square", tiers=2), dict(at=-.3, height=.62, rig="lateen")]),
    dict(name="Cargo fluyt", length=19, beam=.25, depth=3, shape="round", hull="fluyt", aft=(2, .24), sprit=.12, mastHeight=.95, yard=.8,
         masts=[dict(at=.27, height=.85, rig="square", tiers=2), dict(at=.01, height=1, rig="square", tiers=2), dict(at=-.27, height=.66, rig="lateen")]),
    dict(name="Merchantman", length=21, beam=.22, depth=3, shape="sharp", hull="merchant", fore=1, aft=(2, .3), gunRows=1, sprit=.18, mastHeight=.9,
         masts=[dict(at=.27, height=.85, rig="square", tiers=2), dict(at=.02, height=1, rig="square", tiers=3), dict(at=-.28, height=.66, rig="lateen")]),
    dict(name="Frigate", length=23, beam=.16, depth=3, shape="sharp", hull="war", aft=(1, .28), gunRows=1, sprit=.2, jibs=1, mastHeight=.92,
         masts=[dict(at=.28, height=.88, rig="square", tiers=3), dict(at=.02, height=1, rig="square", tiers=3), dict(at=-.27, height=.72, rig="lateen", topsail=True)]),
    dict(name="War galleon", length=25, beam=.2, depth=4, shape="beak", hull="war", fore=2, aft=(3, .34), poop=1, gunRows=2, sprit=.16, mastHeight=.85,
         masts=[dict(at=.28, height=.85, rig="square", tiers=2), dict(at=.06, height=1, rig="square", tiers=3), dict(at=-.18, height=.7, rig="lateen"), dict(at=-.36, height=.56, rig="lateen")]),
    dict(name="Galleon", length=25, beam=.24, depth=4, shape="beak", hull="galleon", fore=2, aft=(4, .36), poop=1, gunRows=1, sprit=.16, mastHeight=.85, lantern=True,
         masts=[dict(at=.26, height=.85, rig="square", tiers=2), dict(at=.03, height=1, rig="square", tiers=3), dict(at=-.26, height=.68, rig="lateen")]),
]

# Deck outline half (u along the hull as a share of the half-length, v
# across as a share of the half-beam), bow first.
OUTLINES = {
    "sharp": [(1, 0), (.7, .5), (.3, .9), (-.1, 1), (-.6, .92), (-1, .66)],
    "round": [(1, 0), (.86, .62), (.55, .95), (-.2, 1), (-.65, .78), (-1, .36)],
    "beak": [(.86, 0), (.62, .62), (.25, .95), (-.2, 1), (-.65, .9), (-1, .72)],
}

SIZES = {
    # The sea battle: twice the designs' sizes, one art pixel per battle
    # pixel (BATTLE_PIXELS_PER_ART_PIXEL), so the ships keep the size of
    # their hit boxes with finer pixels. `detail` scales the small parts
    # (ports, lantern, pennant, shot holes) with the resolution.
    "battle": dict(scale=2.0, detail=2),
    # The sailing map: smaller ships at the towns' scale.
    "map": dict(scale=.72, detail=1),
}

SAIL_STATES = ("full", "battle", "furled")


class Views:
    """The four orthographic views of one part, in the carve's axes.

    top[l, w]: looking down, row l along the hull (0 stern, L-1 bow).
    side[r, l]: from starboard, row r from the top (z = H-1-r).
    front[r, w], back[r, w]: from ahead and astern, both in top's w axis.
    """

    def __init__(self, L: int, W: int, H: int):
        self.L, self.W, self.H = L, W, H
        self.top = np.zeros((L, W, 4), np.uint8)
        self.side = np.zeros((H, L, 4), np.uint8)
        self.front = np.zeros((H, W, 4), np.uint8)
        self.back = np.zeros((H, W, 4), np.uint8)

    @staticmethod
    def _put(view, a, b, colour):
        if 0 <= a < view.shape[0] and 0 <= b < view.shape[1]:
            view[a, b, :3] = rgb(colour)
            view[a, b, 3] = 255

    def t(self, l, w, colour):
        self._put(self.top, l, w, colour)

    def s(self, l, z, colour):
        self._put(self.side, self.H - 1 - z, l, colour)

    def f(self, w, z, colour):
        self._put(self.front, self.H - 1 - z, w, colour)

    def b(self, w, z, colour):
        self._put(self.back, self.H - 1 - z, w, colour)

    def carve(self) -> np.ndarray:
        return slicer.carve(self.top, self.side, self.front, self.back, shade=0.0)


def outline_half_beam(shape: str, u: float) -> float:
    """Half-beam share of the deck outline at u (share of half-length)."""
    pts = sorted(OUTLINES[shape], key=lambda p: p[0])
    if u < pts[0][0] or u > pts[-1][0]:
        return -1.0
    for (u1, v1), (u2, v2) in zip(pts, pts[1:]):
        if u1 <= u <= u2:
            return v1 if u2 == u1 else v1 + (u - u1) * (v2 - v1) / (u2 - u1)
    return pts[-1][1]


def scaled(design: dict, scale: float) -> dict:
    length = max(10, round(design["length"] * scale))
    return dict(
        length=length,
        # A touch slimmer than the flat sprites: a stack shows its beam
        # from every side, so the old proportions read as a box.
        half_beam=max(2.0, length * design["beam"] * .85),
        depth=max(2, round(design["depth"] * (scale if scale >= 1 else .75))),
        mast_top=round(length * design["mastHeight"]),
        castle=lambda pixels: max(1, round(pixels * (scale if scale >= 1 else .75))),
        k=max(1, round(scale)),
    )


def cell_size(scale: float) -> tuple[int, int, int]:
    """One cell (L along, W across, H slices) that fits every design."""
    L = W = H = 0
    for design in DESIGNS:
        dims = scaled(design, scale)
        reach = dims["length"] / 2 + dims["length"] * design["sprit"] + 2
        L = max(L, 2 * math.ceil(reach) + 2)
        yard = (dims["half_beam"] + 1.5 * dims["k"]) * design.get("yard", 1)
        W = max(W, 2 * math.ceil(max(yard, dims["half_beam"])) + 4)
        H = max(H, dims["depth"] + dims["mast_top"] + 3 * dims["k"])
    return L, W, H


def build_ship(design: dict, scale: float, cell: tuple[int, int, int], sails: str, dismasted: bool):
    L, W, H = cell
    dims = scaled(design, scale)
    hull = HULLS[design["hull"]]
    length, half_beam, depth, k = dims["length"], dims["half_beam"], dims["depth"], dims["k"]
    half = length / 2
    lc = (L - 1) / 2          # hull centre along the cell
    wc = (W - 1) / 2          # centreline across the cell
    stern_l = round(lc - half + .5)
    bow_l = round(lc + max(u for u, _ in OUTLINES[design["shape"]]) * half - .5)
    centre = [W // 2 - 1, W // 2]   # the two centre columns (masts, rods)

    def l_of(u_share: float) -> int:
        return round(lc + u_share * half)

    def beam_at(l: int) -> float:
        share = outline_half_beam(design["shape"], (l + .5 - lc) / half)
        return share * half_beam if share >= 0 else -1

    def columns(half_width: float):
        return [w for w in range(W) if abs(w + .5 - W / 2) <= half_width]

    parts = []

    # ---- Hull: deck outline, profile with castles, sections, stern.
    hv = Views(L, W, H)
    aft_height, aft_share = design.get("aft", (0, 0))
    aft_height = dims["castle"](aft_height) if aft_height else 0
    aft_end = stern_l + round(aft_share * length)
    poop_end = stern_l + round(aft_share * length * .45)
    poop_height = aft_height + (dims["castle"](design["poop"]) if design.get("poop") else 0)
    fore_height = dims["castle"](design["fore"]) if design.get("fore") else 0
    fore_start = l_of(.55)
    deck_top = {}
    for l in range(L):
        top = depth
        if aft_height and l <= aft_end:
            top = depth + (poop_height if design.get("poop") and l <= poop_end else aft_height)
        if fore_height and l >= fore_start:
            top = depth + fore_height
        elif l >= bow_l - 1:
            top = depth + 1  # the sheer rises to the bow
        deck_top[l] = top
    for l in range(L):
        b = beam_at(l)
        if b < 0:
            continue
        cols = columns(b)
        for w in cols:
            edge = w in (cols[0], cols[-1])
            colour = hull["rail"] if edge else (hull["deckLight"] if w in centre and (l % 3) else hull["deck"])
            if deck_top[l] > depth and not edge:
                colour = hull["deckLight"]
            hv.t(l, w, colour)
        # Profile: a raked stem (the waterline starts a pixel aft of the bow).
        for z in range(deck_top[l] + 1):
            if l == bow_l and z == 0:
                continue
            if z == 0:
                colour = hull["sideDark"]
            elif z == deck_top[l]:
                colour = hull["rail"]
            elif design.get("gunRows") and depth - design["gunRows"] <= z < depth:
                colour = hull["port"] if ((l - stern_l) // k) % 2 == 1 and stern_l + 1 < l < bow_l - 1 else hull["wale"]
            elif z > depth:
                colour = hull["sideLight"]
            else:
                colour = hull["side"]
            hv.s(l, z, colour)
    # The beakhead: a narrow platform jutting ahead of the stem.
    if design["shape"] == "beak":
        for l in range(bow_l + 1, bow_l + 1 + max(2, round(length * .1))):
            for w in centre:
                hv.t(l, w, hull["side"])
            hv.s(l, depth - 1, hull["side"])
            hv.s(l, depth, hull["rail"])
    # Sections from ahead and astern: slight tumblehome, castles full width.
    max_top = max(deck_top.values())
    for z in range(max_top + 1):
        width = half_beam - (1 if z == 0 else 0) - (.5 if z > depth else 0)
        for w in columns(width):
            colour = hull["sideDark"] if z == 0 else hull["side"]
            if z in (depth, max_top):
                colour = hull["rail"]
            hv.f(w, z, colour)
            stern_colour = hull["stern"]
            if z == 0:
                stern_colour = hull["sideDark"]
            elif z == max_top:
                stern_colour = hull["rail"]
            elif max_top - k <= z < max_top and max_top > depth and (w // k) % 2 == 0:
                stern_colour = WOOD["glow"] if design.get("lantern") else WOOD["window"]
            hv.b(w, z, stern_colour)
    parts.append(hv)

    # The galleon's stern lantern above the taffrail: a post, then the light.
    masthead = None
    if design.get("lantern"):
        lv = Views(L, W, H)
        heights = range(max_top + 1, max_top + 1 + 2 * k)
        lit = lambda z: z >= max_top + 1 + k
        for l in range(stern_l, stern_l + 2):
            for w in centre:
                lv.t(l, w, WOOD["glow"])
            for z in heights:
                lv.s(l, z, WOOD["glow"] if lit(z) else WOOD["mast"])
        for w in centre:
            for z in heights:
                lv.f(w, z, WOOD["glow"] if lit(z) else WOOD["mast"])
                lv.b(w, z, WOOD["glow"] if lit(z) else WOOD["mast"])
        parts.append(lv)

    # ---- The bowsprit: a 2 px spar rising ahead of the bow.
    sprit_base = bow_l + (1 if design["shape"] == "beak" else 0)
    sprit_len = max(2, round(length * design["sprit"]))
    sprit_tip = (sprit_base + sprit_len, depth + 2 * k)
    sv = Views(L, W, H)
    for step in range(sprit_len + 1):
        l = sprit_base + step
        z = depth + round(2 * k * step / sprit_len)
        for w in centre:
            sv.t(l, w, WOOD["yard"])
        sv.s(l, z, WOOD["yard"])
        sv.s(l, z - 1, WOOD["yard"])
    for w in centre:
        for z in range(depth - 1, depth + 2 * k + 1):
            sv.f(w, z, WOOD["yard"])
            sv.b(w, z, WOOD["yard"])
    parts.append(sv)

    # ---- Masts and sails.
    masts = [dict(m, l=l_of(m["at"] * 2), top=round(m["height"] * dims["mast_top"])) for m in design["masts"]]
    if dismasted:
        masts = masts[1:] if len(masts) > 1 else [dict(masts[0], top=round(masts[0]["top"] * .45), stump=True)]
    mainmast = max(masts, key=lambda m: m["top"])
    foremast = max(masts, key=lambda m: m["l"])
    yard_half = (half_beam + 1.5 * k) * design.get("yard", 1)

    for mast in masts:
        mv = Views(L, W, H)
        l0 = mast["l"] - 1  # the mast's two rows along the hull: l0, l0+1
        foot = deck_top.get(mast["l"], depth) + 1
        top_z = depth + mast["top"]
        rows = (l0, l0 + 1)

        def z_at(fraction: float) -> int:
            return depth + round(fraction * mast["top"])

        # The mast itself: 2 x 2 px from the deck to the truck.
        for l in rows:
            for w in centre:
                mv.t(l, w, WOOD["mast"])
            for z in range(foot, top_z + 1):
                mv.s(l, z, WOOD["mast"])
        for w in centre:
            for z in range(foot, top_z + 1):
                mv.f(w, z, WOOD["mast"])
                mv.b(w, z, WOOD["mast"])

        def square_sail(lo: float, hi: float, width: float, set_: bool):
            """A square sail between lo and hi of the mast, its yard on top."""
            z_lo, z_hi = z_at(lo), z_at(hi)
            yard_cols = columns(max(1.5, yard_half * width))
            if not set_:
                # Furled: a bundle along the yard, 2 px deep.
                for l in rows:
                    for w in yard_cols:
                        mv.t(l, w, SAIL["furled"])
                for l in rows:
                    for z in (z_hi, z_hi - 1):
                        mv.s(l, z, SAIL["furled"])
                for w in yard_cols:
                    mv.f(w, z_hi, WOOD["yard"])
                    mv.b(w, z_hi, WOOD["yard"])
                    mv.f(w, z_hi - 1, SAIL["furled"])
                    mv.b(w, z_hi - 1, SAIL["furled"])
                return
            # Set: the canvas narrows a little to its head, and its lower
            # half bellies a pixel forward.
            belly = l0 + 2
            for l in (*rows, belly):
                for w in yard_cols:
                    mv.t(l, w, WOOD["yard"] if l != belly else SAIL["lit"])
            for z in range(z_lo, z_hi + 1):
                for l in rows:
                    mv.s(l, z, WOOD["yard"] if z == z_hi else SAIL["shade"])
                if z <= (z_lo + z_hi) // 2:
                    mv.s(belly, z, SAIL["lit"])
            span = max(1, z_hi - z_lo)
            for z in range(z_lo, z_hi + 1):
                head = (z - z_lo) / span
                cols = columns(max(1.5, yard_half * width * (1 - .15 * head)))
                mid = len(cols) // 2
                for i, w in enumerate(cols):
                    if z == z_hi:
                        colour = WOOD["yard"]
                    else:
                        # Lit from the north-west: the port half of the face
                        # is bright, the starboard half shaded; a reef band.
                        colour = SAIL["lit"] if i < mid else SAIL["shade"]
                        if z == z_lo + span // 2 and span >= 4:
                            colour = SAIL["shade"] if i < mid else SAIL["back"]
                    mv.f(w, z, colour)
                    mv.b(w, z, WOOD["yard"] if z == z_hi else SAIL["back"])

        def centre_sail(points: list[tuple[float, float]], set_: bool, yard_edge=None):
            """A fore-and-aft sail on the centreline: polygon in (l, z)."""
            ls = [p[0] for p in points]
            zs = [p[1] for p in points]
            if not set_:
                # Furled along its spar (the polygon's first edge).
                (la, za), (lb, zb) = points[0], points[1]
                steps = max(1, round(max(abs(lb - la), abs(zb - za))))
                for i in range(steps + 1):
                    l = round(la + (lb - la) * i / steps)
                    z = round(za + (zb - za) * i / steps)
                    mv.s(l, z, SAIL["furled"])
                    mv.s(l, z + 1, SAIL["furled"])
                    for w in centre:
                        mv.t(l, w, SAIL["furled"])
                for w in centre:
                    for z in range(round(min(za, zb)), round(max(za, zb)) + 2):
                        mv.f(w, z, SAIL["furled"])
                        mv.b(w, z, SAIL["furled"])
                return
            for l in range(math.floor(min(ls)), math.ceil(max(ls)) + 1):
                for z in range(math.floor(min(zs)), math.ceil(max(zs)) + 1):
                    if inside(points, l + .5, z + .5):
                        mv.s(l, z, SAIL["lit"] if (l + z) % 7 else SAIL["shade"])
                        for w in centre:
                            mv.t(l, w, SAIL["lit"])
            if yard_edge:
                (la, za), (lb, zb) = yard_edge
                steps = max(1, round(max(abs(lb - la), abs(zb - za))))
                for i in range(steps + 1):
                    mv.s(round(la + (lb - la) * i / steps), round(za + (zb - za) * i / steps), WOOD["yard"])
            for w in centre:
                for z in range(math.floor(min(zs)), math.ceil(max(zs)) + 1):
                    mv.f(w, z, SAIL["shade"])
                    mv.b(w, z, SAIL["back"])

        if mast.get("stump"):
            pass
        elif mast["rig"] == "square":
            tiers = [(.26, .56, 1, True), (.6, .82, .78, False), (.85, 1, .55, False)][:mast["tiers"]]
            for lo, hi, width, course in tiers:
                square_sail(lo, hi, width, sails == "full" or (sails == "battle" and not course))
        elif mast["rig"] == "gaff":
            reach = .78 if sails == "full" else .56
            boom = stern_l - 1
            pts = [(l0, z_at(.12)), (boom, z_at(.12)), (boom + (l0 - boom) * .22, z_at(reach + .08)), (l0, z_at(reach))]
            centre_sail(pts, sails != "furled", yard_edge=(pts[1], pts[0]))
            if mast.get("topsail"):
                square_sail(.82, 1, .62, sails != "furled")
        elif mast["rig"] == "lateen":
            low = (l0 + length * .12, z_at(.22))
            high = (l0 - length * .2, z_at(.72 if mast.get("topsail") else 1))
            clew = (l0 - length * .16, z_at(.12))
            centre_sail([low, high, clew], sails != "furled", yard_edge=(low, high))
            if mast.get("topsail"):
                square_sail(.76, 1, .5, sails in ("full", "battle"))
        parts.append(mv)

        # Jibs run from the bowsprit to the foremast, and go with it.
        if mast is foremast and design.get("jibs") and sails != "furled" and not dismasted:
            jv = Views(L, W, H)
            mv_saved = mv
            mv = jv  # centre_sail draws into `mv`
            tip = sprit_tip
            stem = (sprit_base + sprit_len * .45, depth + k)
            jibs = [[tip, (l0 + 1, z_at(.92)), (l0 + 2 + length * .06, z_at(.2))],
                    [stem, (l0 + 1, z_at(.7)), (l0 + 2 + length * .04, z_at(.16))]][:design["jibs"]]
            for jib in jibs:
                centre_sail(jib, True, yard_edge=(jib[0], jib[1]))
            parts.append(jv)
            mv = mv_saved

        if mast is mainmast and not mast.get("stump"):
            masthead = dict(l=l0 + .5, w=wc, z=top_z)
        elif mast is mainmast:
            masthead = dict(l=l0 + .5, w=wc, z=top_z)

    # Join the parts: the first part to fill a voxel keeps it.
    vol = np.zeros((H, L, W, 4), np.uint8)
    for part in parts:
        carved = part.carve()
        empty = vol[..., 3] == 0
        vol[empty] = carved[empty]
    return vol, parts, masthead


def inside(points, x, y) -> bool:
    hit = False
    for i in range(len(points)):
        (x1, y1), (x2, y2) = points[i], points[(i + 1) % len(points)]
        if (y1 <= y < y2) or (y2 <= y < y1):
            if x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
                hit = not hit
    return hit


def composite_views(parts):
    """The four views of the whole ship, for the check sheet."""
    out = []
    for name in ("top", "side", "front", "back"):
        base = np.zeros_like(getattr(parts[0], name))
        for part in parts:
            view = getattr(part, name)
            empty = base[..., 3] == 0
            base[empty] = view[empty]
        out.append(base)
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", type=Path, help="write each row's views and check sheet here")
    args = parser.parse_args()

    data = dict(sails=[SAIL["lit"], SAIL["shade"], SAIL["back"], SAIL["furled"]], sizes={})
    for size, spec in SIZES.items():
        cell = cell_size(spec["scale"])
        L, W, H = cell
        rows, strips = [], []
        for type_, design in enumerate(DESIGNS):
            for sails in SAIL_STATES:
                for dismasted in (False, True):
                    vol, parts, masthead = build_ship(design, spec["scale"], cell, sails, dismasted)
                    for z0, z1 in slicer.thin_runs(vol):
                        print(f"warning: {size} {design['name']} {sails}{' dismasted' if dismasted else ''}: slices {z0}-{z1} hold a 1px-thin part")
                    strips.append(np.concatenate(list(vol), axis=1))
                    rows.append(dict(type=type_, name=design["name"], sails=sails, dismasted=dismasted,
                                     masthead=[round(masthead["w"], 2), round(masthead["l"], 2), masthead["z"]]))
                    if args.check:
                        args.check.mkdir(parents=True, exist_ok=True)
                        stem = f"{size}-{type_}-{sails}{'-dismasted' if dismasted else ''}"
                        views = composite_views(parts)
                        sheet = views_sheet(views)
                        sheet.save(args.check / f"{stem}-views.png")
                        display = [views[0], views[1][:, ::-1], views[2], views[3][:, ::-1]]
                        slicer.build_preview(vol, display, args.check / f"{stem}-check.png")
        atlas = np.concatenate(strips, axis=0)
        path = ROOT / "assets" / "sprites" / f"ship-stacks-{size}.png"
        Image.fromarray(atlas).save(path, optimize=True)
        print(f"{size}: {len(rows)} rows of {H} slices, {W} x {L} px -> {path.relative_to(ROOT)} ({atlas.shape[1]} x {atlas.shape[0]})")
        data["sizes"][size] = dict(width=W, length=L, slices=H, detail=spec["detail"], rows=rows)

    module = ROOT / "src" / "ship-stack-data.mjs"
    module.write_text(
        "// Generated by tools/build_ship_stacks.py; do not edit by hand.\n"
        "// The sprite-stacked ships' atlases (assets/sprites/ship-stacks-<size>.png):\n"
        "// per size, the cell (`width` across, `length` along the hull, bow at the\n"
        "// cell's bottom), the slice count and one row per ship type and rig state,\n"
        "// with the mainmast's head [w, l, z] in the cell, where the flag flies;\n"
        "// `detail` is the size of the small parts' pixels (pennant, shot holes).\n"
        "// `sails` lists the canvas colours (recoloured while sails are changed).\n"
        f"export const SHIP_STACK_DATA = Object.freeze({json.dumps(data, separators=(',', ':'))});\n"
    )
    print(f"metadata -> {module.relative_to(ROOT)}")


def views_sheet(views):
    """The 1x4 row TOP, SIDE, FRONT, BACK on white, 8x, as the skill draws it."""
    top, side, front, back = views
    shown = [top, side[:, ::-1], front, back[:, ::-1]]  # top's bow down, side's bow left
    scale, gap = 8, 40
    tiles = [Image.fromarray(v).resize((v.shape[1] * scale, v.shape[0] * scale), Image.NEAREST) for v in shown]
    width = sum(t.width for t in tiles) + gap * (len(tiles) + 1)
    height = max(t.height for t in tiles) + 2 * gap
    sheet = Image.new("RGBA", (width, height), (255, 255, 255, 255))
    x = gap
    for tile in tiles:
        sheet.alpha_composite(tile, (x, gap))
        x += tile.width + gap
    return sheet


if __name__ == "__main__":
    main()
