#!/usr/bin/env python3
"""Make the page's three logos: a Game & Watch (The Legend of Zelda edition:
green rim, buttons in a row, GAME/TIME/PAUSE on the right) whose LCD-style
screen shows each tab's picture.

  python3 tools/make_logos.py      -> img/logo-dosat.svg, logo-dosxt.svg, logo-tools.svg

The floppies are the cores' retro-go menu icons (src/assets/pad.png of
DosAT, a 3.5" floppy, and DosXT, a 5.25" one), traced pixel by pixel into
the path data below. No brand names or logos are drawn: the badge above the
D-pad is a plain silver plate.
"""
import os

GOLD_HI, GOLD, GOLD_LO, GOLD_EDGE = "#f6e4a6", "#e7cd78", "#c9a74e", "#a8873a"
GREEN, GREEN_DARK = "#2d9a4a", "#1f7436"
LCD_BG, LCD_FG = "#b9c7a0", "#26301f"
RED_HI, RED_LO = "#ff6a63", "#b4201d"
GREY = "#8e949d"

# 32x32 pixel art, one "M x y h n v1 h-n z" per run of lit pixels.
FLOPPY = {
    "dosat": "M20 3h3v1h-3zM15 4h3v1h-3zM20 4h4v1h-4zM10 5h8v1h-8zM20 5h6v1h-6zM5 6h2v1h-2zM8 6h7v1h-7zM17 6h2v1h-2zM20 6h6v1h-6zM2 7h5v1h-5zM8 7h7v1h-7zM17 7h2v1h-2zM20 7h6v1h-6zM3 8h4v1h-4zM9 8h6v1h-6zM18 8h1v1h-1zM21 8h5v1h-5zM3 9h4v1h-4zM9 9h6v1h-6zM17 9h2v1h-2zM21 9h5v1h-5zM3 10h5v1h-5zM9 10h10v1h-10zM21 10h6v1h-6zM3 11h5v1h-5zM9 11h6v1h-6zM21 11h6v1h-6zM3 12h5v1h-5zM10 12h1v1h-1zM17 12h10v1h-10zM4 13h4v1h-4zM12 13h15v1h-15zM4 14h14v1h-14zM24 14h4v1h-4zM4 15h10v1h-10zM20 15h3v1h-3zM24 15h4v1h-4zM4 16h5v1h-5zM15 16h8v1h-8zM24 16h4v1h-4zM5 17h3v1h-3zM11 17h12v1h-12zM25 17h3v1h-3zM5 18h3v1h-3zM10 18h9v1h-9zM22 18h1v1h-1zM25 18h3v1h-3zM5 19h4v1h-4zM10 19h4v1h-4zM20 19h4v1h-4zM25 19h4v1h-4zM5 20h4v1h-4zM10 20h2v1h-2zM16 20h8v1h-8zM25 20h4v1h-4zM5 21h4v1h-4zM10 21h11v1h-11zM22 21h2v1h-2zM25 21h4v1h-4zM6 22h3v1h-3zM11 22h6v1h-6zM22 22h2v1h-2zM26 22h3v1h-3zM6 23h3v1h-3zM11 23h2v1h-2zM18 23h6v1h-6zM26 23h3v1h-3zM6 24h4v1h-4zM11 24h2v1h-2zM14 24h11v1h-11zM26 24h4v1h-4zM6 25h4v1h-4zM11 25h14v1h-14zM6 26h2v1h-2zM9 26h1v1h-1zM11 26h11v1h-11zM7 27h1v1h-1zM9 27h1v1h-1zM12 27h6v1h-6zM7 28h3v1h-3zM12 28h1v1h-1zM7 29h1v1h-1z",
    "dosxt": "M21 2h4v1h-4zM17 3h4v1h-4zM22 3h3v1h-3zM13 4h4v1h-4zM22 4h4v1h-4zM9 5h4v1h-4zM18 5h8v1h-8zM5 6h4v1h-4zM14 6h10v1h-10zM2 7h3v1h-3zM10 7h14v1h-14zM2 8h3v1h-3zM6 8h18v1h-18zM2 9h25v1h-25zM2 10h13v1h-13zM17 10h10v1h-10zM3 11h10v1h-10zM19 11h8v1h-8zM3 12h9v1h-9zM15 12h1v1h-1zM20 12h7v1h-7zM3 13h8v1h-8zM14 13h4v1h-4zM20 13h2v1h-2zM23 13h5v1h-5zM3 14h8v1h-8zM13 14h2v1h-2zM17 14h1v1h-1zM20 14h1v1h-1zM23 14h5v1h-5zM4 15h7v1h-7zM13 15h2v1h-2zM17 15h1v1h-1zM20 15h8v1h-8zM4 16h7v1h-7zM13 16h5v1h-5zM20 16h8v1h-8zM4 17h8v1h-8zM15 17h2v1h-2zM20 17h9v1h-9zM4 18h9v1h-9zM19 18h10v1h-10zM5 19h10v1h-10zM17 19h12v1h-12zM5 20h24v1h-24zM5 21h11v1h-11zM19 21h11v1h-11zM5 22h11v1h-11zM19 22h11v1h-11zM6 23h10v1h-10zM20 23h10v1h-10zM6 24h11v1h-11zM20 24h10v1h-10zM6 25h11v1h-11zM20 25h7v1h-7zM6 26h12v1h-12zM19 26h4v1h-4zM6 27h13v1h-13zM7 28h8v1h-8zM7 29h4v1h-4z",
}
WRENCH = ("M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1"
          "c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z")   # Material Icons "build", Apache-2.0

W, H = 96, 54
# the screen (inside the green bezel)
SX, SY, SW, SH = 33, 12.5, 30, 23
CX, CY = SX + SW / 2, SY + SH / 2


def screen_art(kind):
    if kind in FLOPPY:
        s = 19 / 27                                   # the floppies span ~27 of their 32 px
        return (f'<path transform="translate({CX - 16 * s:.2f} {CY - 16.3 * s:.2f}) scale({s:.4f})" '
                f'fill="{LCD_FG}" shape-rendering="crispEdges" d="{FLOPPY[kind]}"/>')
    # crossed wrench and screwdriver, LCD dark, outlined in the screen colour
    s = .74
    return f"""<path transform="translate({CX - 12 * s:.2f} {CY - 12 * s:.2f}) scale({s})" fill="{LCD_FG}" d="{WRENCH}"/>
  <g transform="translate({CX} {CY}) rotate(45)" stroke="{LCD_BG}" stroke-width=".7">
    <rect x="-.75" y="-9.6" width="1.5" height="9.4" fill="{LCD_FG}"/>
    <path d="M-.75 -9.6h1.5l-.35 -1.3h-.8z" fill="{LCD_FG}"/>
    <rect x="-2.1" y="-.6" width="4.2" height="9.4" rx="1.6" fill="{LCD_FG}"/>
    <path d="M-.7 1v6.2M.7 1v6.2" stroke-width=".5"/>
  </g>"""


def pill(x, y, w, h):
    return (f'<rect x="{x - .8}" y="{y - .8}" width="{w + 1.6}" height="{h + 1.6}" rx="{(h + 1.6) / 2}" fill="{GREEN}"/>'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{h / 2}" fill="{GREY}"/>')


def red(cx, cy):
    return (f'<circle cx="{cx}" cy="{cy}" r="4.3" fill="{GREEN}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="3.3" fill="url(#btn)"/>')


def logo(kind, label):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="DOS G&amp;W Imager — {label}">
  <defs>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{GOLD_HI}"/><stop offset=".55" stop-color="{GOLD}"/><stop offset="1" stop-color="{GOLD_LO}"/>
    </linearGradient>
    <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fbedbd"/><stop offset="1" stop-color="#e2c56d"/>
    </linearGradient>
    <radialGradient id="btn" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="{RED_HI}"/><stop offset="1" stop-color="{RED_LO}"/></radialGradient>
  </defs>
  <!-- case: green rim, gold face -->
  <rect x=".5" y=".5" width="{W - 1}" height="{H - 1}" rx="6" fill="{GREEN}" stroke="{GREEN_DARK}" stroke-width=".6"/>
  <rect x="2.4" y="2.4" width="{W - 4.8}" height="{H - 4.8}" rx="4.6" fill="url(#body)" stroke="{GOLD_EDGE}" stroke-width=".5"/>
  <rect x="4" y="3.6" width="{W - 8}" height="2.2" rx="1.1" fill="#fff" opacity=".3"/>
  <!-- the plate above the D-pad (no lettering) -->
  <rect x="7.5" y="8" width="15" height="10" rx="1.6" fill="#e6e8ec" stroke="#9aa0a8" stroke-width=".5"/>
  <rect x="9.3" y="10" width="11.4" height="1.5" rx=".6" fill="#3a3f47"/>
  <rect x="12.5" y="12.3" width="5" height="1.3" rx=".6" fill="#3a3f47"/>
  <rect x="9.3" y="14.4" width="11.4" height="1.5" rx=".6" fill="#3a3f47"/>
  <!-- D-pad in its green frame -->
  <rect x="6.5" y="28.5" width="17" height="17" rx="3.4" fill="{GREEN}"/>
  <rect x="8" y="30" width="14" height="14" rx="2.4" fill="#d9bd66"/>
  <rect x="12.9" y="30.8" width="4.2" height="12.4" rx=".8" fill="#16181d"/>
  <rect x="8.8" y="34.9" width="12.4" height="4.2" rx=".8" fill="#16181d"/>
  <circle cx="15" cy="37" r=".9" fill="#2c3038"/>
  <!-- the screen panel, green bezel, LCD -->
  <rect x="27" y="5.5" width="42" height="43" rx="3" fill="url(#panel)" stroke="{GOLD_EDGE}" stroke-width=".4"/>
  <rect x="35" y="7.6" width="26" height="1.4" rx=".7" fill="{GOLD_EDGE}" opacity=".55"/>
  <rect x="{SX - 2.6}" y="{SY - 2.6}" width="{SW + 5.2}" height="{SH + 5.2}" rx="2.6" fill="{GREEN}"/>
  <rect x="{SX}" y="{SY}" width="{SW}" height="{SH}" rx="1" fill="{LCD_BG}"/>
  {screen_art(kind)}
  <rect x="39.5" y="41.6" width="17" height="4.4" rx="2.2" fill="none" stroke="#3a3f47" stroke-width=".7" opacity=".7"/>
  <!-- GAME, TIME, PAUSE/SET -->
  {pill(78, 7.5, 8, 3)}
  {pill(78, 13.3, 8, 3)}
  {pill(78, 19.1, 8, 3)}
  <!-- SELECT and START on their green bar -->
  <rect x="71.5" y="26.5" width="21" height="6.6" rx="3.3" fill="{GREEN}"/>
  <rect x="73.2" y="28.2" width="7.6" height="3.2" rx="1.6" fill="#c9cdd2"/>
  <rect x="83.2" y="28.2" width="7.6" height="3.2" rx="1.6" fill="#c9cdd2"/>
  <!-- B, A -->
  {red(76.8, 42.3)}
  {red(87.2, 42.3)}
</svg>
"""


if __name__ == "__main__":
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "img")
    for kind, label in (("dosat", "DosAT"), ("dosxt", "DosXT"), ("tools", "Tools")):
        with open(os.path.join(out, f"logo-{kind}.svg"), "w") as fh:
            fh.write(logo(kind, label))
    print("img/logo-{dosat,dosxt,tools}.svg written")
