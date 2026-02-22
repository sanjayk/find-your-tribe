#!/usr/bin/env python3
"""Lightning bolt logo for SPEED — pixel by pixel, traced from ⚡."""
import os

def render(art, label, cwd):
    """Parse art string and render with half-blocks + true-color gradient."""
    rows = []
    for line in art.strip().split("\n"):
        row = [1 if c == '#' else 0 for c in line.strip()]
        rows.append(row)

    h = len(rows)
    w = max(len(r) for r in rows)
    # Pad rows to equal width
    for r in rows:
        while len(r) < w:
            r.append(0)

    R = "\033[0m"
    B = "\033[1m"
    W = "\033[38;5;255m"
    G = "\033[38;5;245m"
    D = "\033[0;90m"

    def color(y):
        t = y / max(h - 1, 1)
        return (255, int(230 - t * 140), int(75 - t * 65))

    lines = []
    for y in range(0, h, 2):
        s = ""
        for x in range(w):
            top = rows[y][x] if y < h else 0
            bot = rows[y+1][x] if y+1 < h else 0
            if not top and not bot:
                s += " "
            elif top and bot:
                tr, tg, tb = color(y)
                br, bg, bb = color(y+1)
                if (tr,tg,tb) == (br,bg,bb):
                    s += f"\033[38;2;{tr};{tg};{tb}m█{R}"
                else:
                    s += f"\033[38;2;{tr};{tg};{tb};48;2;{br};{bg};{bb}m▀{R}"
            elif top:
                tr, tg, tb = color(y)
                s += f"\033[38;2;{tr};{tg};{tb}m▀{R}"
            else:
                br, bg, bb = color(y+1)
                s += f"\033[38;2;{br};{bg};{bb}m▄{R}"
        lines.append(s.rstrip())

    # Info text placement
    mid = len(lines) // 2
    info = {
        mid - 1: f"   {B}{W}SPEED{R} {G}v0.1.0{R}",
        mid:     f"   {G}Opus 4.6 · Claude Max{R}",
        mid + 1: f"   {D}{cwd}{R}",
    }

    print(f"\n  {D}{'─'*50}{R}")
    print(f"  {B}{label}{R}")
    print(f"  {D}{'─'*50}{R}\n")
    for i, line in enumerate(lines):
        print(f"   {line}{info.get(i, '')}")
    print()


cwd = os.getcwd().replace(os.path.expanduser("~"), "~")

# ⚡ shape: upper arm slopes top-right → bottom-left (parallelogram).
# Bar spans full width. Lower arm right-of-center, tapers to point.

# A: 5-wide arms, 14 wide
render("""
.........#####
........#####.
.......#####..
......#####...
.....#####....
....#####.....
##############
##############
.......######.
........#####.
.........####.
..........###.
...........##.
............#.
""", "A: Classic bolt — 5-wide arm", cwd)

# B: 4-wide arms, cleaner
render("""
........####
.......####.
......####..
.....####...
....####....
...####.....
############
############
......#####.
.......####.
........###.
.........##.
..........#.
""", "B: Thinner — 4-wide arm", cwd)

# C: 7-wide arms, heavier
render("""
.......#######
......#######.
.....#######..
....#######...
...#######....
..#######.....
##############
##############
......########
.......#######
........######
.........#####
..........####
...........###
............##
.............#
""", "C: Heavy — 7-wide arm", cwd)

# D: Compact 3-wide, tiny
render("""
.......###
......###.
.....###..
....###...
...###....
..###.....
##########
##########
.....####.
......###.
.......##.
........#.
""", "D: Compact — 3-wide arm", cwd)

D = "\033[0;90m"
R = "\033[0m"
print(f"  {D}{'─'*50}{R}")
print(f"  {D}Pick A-D or say what to change.{R}\n")
