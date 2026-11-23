# DOS G&W Imager

*[Read in English](README.md)*

Creador de imágenes de disco y `.cfg` en el navegador para los cores DosAT y DosXT de Game & Watch.

**Ábrelo: <https://julenvitoria.github.io/dos-gnw-imager/>**

1. Elige el core: **DosAT** (386, VGA, Sound Blaster) o **DosXT** (PC XT, CGA).
2. Arrastra la carpeta o el `.zip` del juego.
3. Revisa el programa que arranca el juego, las opciones y los botones
   (consola de Mario o de Zelda).
4. Descarga el `.zip` y descomprímelo en la raíz de la tarjeta SD: la imagen
   queda en `/roms/dos/` y el `.cfg` en `/cores/dosat/` o `/cores/dosxt/`.

Todo ocurre en tu navegador: los archivos del juego no se suben a ningún sitio.

La pestaña **Herramientas** enlaza a [CoverStudio](https://sylverb.github.io/CoverStudio/?target=gw)
(carátulas de ScreenScraper en el formato de la Game & Watch) y a las guías de los cores.

Idiomas: inglés, español, francés, alemán, italiano, portugués (Portugal y
Brasil), ruso,
chino (simplificado y tradicional), japonés y coreano. La página sigue el idioma del navegador y recuerda el que elijas en
el selector. Cada idioma es un archivo en `js/lang/` (lo que falte sale en
inglés) y una línea en `js/i18n.js`.

## Los discos que crea

Los mismos formatos que las herramientas de los cores
([`make_dsk.py`](https://github.com/julenvitoria/DosAT-retro-go-sd/blob/main/scripts/make_dsk.py) y
[`fat12.py`](https://github.com/julenvitoria/DosXT-retro-go-sd/blob/main/tools/fat12.py)):

- **Disquete** (1,44 MB, o 2,88 MB en DosAT) si el juego cabe.
- **Disco duro** si no: una partición FAT12/FAT16 de 1,25 veces el juego más
  1 MB, para que el juego tenga sitio para sus partidas.
- Los nombres largos pasan a formato DOS 8.3 (`Fichero largo.dat` →
  `FICHER~1.DAT`); la página muestra todos los que ha cambiado.
- **DosAT**: los archivos del juego van en la raíz del disco y un
  `AUTOEXEC.BAT` lo arranca, así que el `.dsk` funciona también sin su `.cfg`.
- **DosXT**: un juego en disquete queda en `B:` y uno en disco duro, en su
  carpeta de `C:`. DosXT arranca tu MS-DOS desde `!BOOT.img` (mira su README).

## Desarrollo

Los iconos (`img/logo-*.svg`) se generan con `python3 tools/make_logos.py`.

Sin compilación: HTML, CSS y módulos de JavaScript tal cual, que GitHub Pages
sirve directamente. Para probarlo en local, sirve la carpeta (los módulos no
cargan desde `file://`):

```
python3 -m http.server 8000
```

Pruebas (necesitan Node y mtools):

```
test/run-tests.sh                 # imágenes: ida y vuelta con mtools + comprobación de la FAT
node test/browser.mjs             # la página en Chromium (Playwright y un servidor en :8765)
```
