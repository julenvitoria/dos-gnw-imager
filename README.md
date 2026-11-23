# DOS G&W Imager

*[Leer en español](README.es.md)*

In-browser disk image and `.cfg` maker for the DosAT and DosXT Game & Watch cores.

**Open it: <https://julenvitoria.github.io/dos-gnw-imager/>**

1. Pick the core: **DosAT** (386, VGA, Sound Blaster) or **DosXT** (PC XT, CGA).
2. Drop the game's folder or `.zip`.
3. Check the program that starts the game, the options and the buttons
   (Mario or Zelda console).
4. Download the `.zip` and unzip it at the root of the SD card: the disk image
   lands in `/roms/dos/` and the `.cfg` in `/cores/dosat/` or `/cores/dosxt/`.

Everything happens in your browser: the game's files are not uploaded anywhere.

The **Tools** tab links to [CoverStudio](https://sylverb.github.io/CoverStudio/?target=gw)
(covers from ScreenScraper, in the Game & Watch format) and to the cores' guides.

Languages: English, Spanish, French, German, Italian, Portuguese (Portugal and
Brazil), Russian, Chinese (Simplified and Traditional), Japanese and Korean. The page follows the browser's language and remembers a choice made
with the selector. A language is one file in `js/lang/` (missing texts fall
back to English) plus one line in `js/i18n.js`.

## The disks it makes

The same layouts as the cores' own tools
([`make_dsk.py`](https://github.com/julenvitoria/DosAT-retro-go-sd/blob/main/scripts/make_dsk.py) and
[`fat12.py`](https://github.com/julenvitoria/DosXT-retro-go-sd/blob/main/tools/fat12.py)):

- **Floppy** (1.44 MB, or 2.88 MB in DosAT) when the game fits.
- **Hard disk** otherwise: one FAT12/FAT16 partition, sized at 1.25× the game
  plus 1 MB, so the game has room for its saves.
- Long file names become DOS 8.3 names (`Fichero largo.dat` → `FICHER~1.DAT`);
  the page lists every name it changed.
- **DosAT**: the game's files are the root of the disk, and an `AUTOEXEC.BAT`
  starts it, so the `.dsk` also works without its `.cfg`.
- **DosXT**: a floppy game is on `B:`, a hard-disk game in its own folder on
  `C:`. DosXT boots your MS-DOS from `!BOOT.img` (see its README).

## Development

The logos (`img/logo-*.svg`) are made by `python3 tools/make_logos.py`.

No build step: plain HTML, CSS and JavaScript modules, served as they are by
GitHub Pages. To try it locally, serve the folder (modules do not load from
`file://`):

```
python3 -m http.server 8000
```

Tests (need Node and mtools):

```
test/run-tests.sh                 # disk images: round-trip through mtools + FAT check
node test/browser.mjs             # the page in Chromium (needs Playwright and a server on :8765)
```
