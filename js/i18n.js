// Texts. The first visit follows the browser's language (Spanish if it is
// Spanish, English otherwise); a choice made with the selector is
// remembered in this browser. Adding a language = adding one block here.

export const LANGS = { es: "Español", en: "English" };

const T = {
  es: {
    title: "DOS G&W Imager",
    tagline: "Convierte un juego de DOS en una imagen de disco y su .cfg para la Game & Watch",
    privacy: "Todo ocurre en tu navegador: los archivos del juego no se suben a ningún sitio.",
    tab_dosat: "DosAT", tab_dosat_sub: "386 · VGA · Sound Blaster",
    tab_dosxt: "DosXT", tab_dosxt_sub: "PC XT · 8088 · CGA",
    step_game: "Juego",
    drop_title: "Arrastra aquí la carpeta o el .zip del juego",
    drop_or: "o",
    pick_folder: "Elegir carpeta",
    pick_zip: "Elegir .zip",
    loading: "Leyendo…",
    loaded_files: "{files} archivos · {size}",
    change_game: "Cambiar de juego",
    game_name: "Nombre",
    game_name_help: "Es el nombre del archivo en la SD y el que verás en el menú.",
    disk: "Disco",
    layout_auto: "Automático ({what})",
    floppy: "Disquete de {kb} KB",
    hd: "Disco duro de {mb} MB",
    renamed: "{n} nombres cambiados a formato DOS (8.3)",
    step_start: "Arranque",
    program: "Programa que arranca el juego",
    program_help: "El que más se parece a un juego va primero. Los instaladores y utilidades van al final.",
    no_program: "No hay ningún .EXE, .COM ni .BAT. ¿Es la carpeta correcta?",
    args: "Parámetros",
    args_help: "Lo que se escribe después del nombre del programa. Ej.: «a» en Monkey Island = música AdLib.",
    pre: "Programas antes del juego",
    pre_help: "Opcional. Separados por «;». Ej.: un driver de sonido como SOUND.",
    boot: "Disco de arranque de DOS",
    boot_help: "DosXT arranca MS-DOS desde este disquete (está en /cores/dosxt). Déjalo vacío si el juego arranca solo.",
    step_options: "Opciones",
    cpu_speed: "Velocidad de CPU",
    cyc_max: "Máxima (recomendada)",
    cyc_330: "8088 a 4,77 MHz (PC XT)",
    cyc_800: "286 a 8 MHz",
    cyc_1200: "286 a 12 MHz",
    cyc_2500: "386SX a 16 MHz",
    cyc_4500: "386DX a 25 MHz",
    cpu_help: "Algunos juegos antiguos van demasiado rápido con la CPU al máximo.",
    xt_cpu_help: "Megahercios al arrancar. El teclado en pantalla también la cambia.",
    memory: "Memoria",
    xms: "XMS (memoria extendida)",
    ems: "EMS (memoria expandida)",
    sound: "Sonido",
    snd_both: "AdLib + Sound Blaster",
    snd_adlib: "Solo AdLib",
    snd_sb: "Solo Sound Blaster",
    snd_none: "Ninguna (altavoz del PC)",
    sound_help: "Quita una tarjeta solo si el juego se cuelga o suena mal con ella.",
    video: "Vídeo",
    vga_pages: "Páginas VGA extra",
    vga_pages_help: "1 vale para casi todos. 2: Wolfenstein 3D. 3: Epic Pinball, Pinball Dreams.",
    vga_hz: "Frecuencia vertical",
    hz70: "70 Hz (como una VGA)",
    hz60: "60 Hz (movimiento más suave)",
    xt_video: "Tarjeta de vídeo",
    xt_vga: "EGA/VGA (por defecto)",
    xt_cga: "Solo CGA (640 KB para DOS)",
    vram: "Memoria de vídeo",
    advanced: "Avanzado",
    step_buttons: "Botones",
    mouse: "Ratón",
    mouse_help: "La cruceta mueve el puntero y A/B son los botones del ratón.",
    default_key: "{k}",
    keys_empty: "Vacío = la tecla por defecto, que se ve en gris.",
    console: "Tu consola",
    console_mario: "Mario",
    console_zelda: "Zelda",
    console_help_mario: "La de Mario no tiene START ni SELECT.",
    console_help_zelda: "La de Zelda tiene además START y SELECT.",
    key_bad: "Tecla no válida",
    keys_help: "Una tecla o hasta 3 con «+» (ctrl+x). «click» y «click2» son los botones del ratón.",
    btn_up: "Arriba", btn_down: "Abajo", btn_left: "Izquierda", btn_right: "Derecha",
    btn_a: "A", btn_b: "B", btn_game: "GAME", btn_time: "TIME", btn_start: "START", btn_select: "SELECT",
    game_fixed: "GAME abre siempre el teclado en pantalla en DosAT.",
    game_kbd: "Teclado",
    step_download: "Descargar",
    dl_zip: "Descargar todo para la SD (.zip)",
    dl_zip_help: "Descomprímelo en la raíz de la tarjeta SD: cada archivo queda en su carpeta.",
    dl_image: "Imagen",
    dl_cfg: ".cfg",
    sd_layout: "En la SD",
    cfg_preview: "Vista previa del .cfg",
    building: "Creando la imagen…",
    err_zip: "No se pudo leer el .zip: {why}",
    err_NOT_ZIP: "no es un archivo .zip",
    err_ZIP64: "es un ZIP64 (más de 4 GB o 65.535 archivos)",
    err_ENCRYPTED: "tiene contraseña",
    err_METHOD: "usa un método de compresión no soportado",
    err_BAD_ZIP: "está dañado",
    err_NO_INFLATE: "este navegador no sabe descomprimir; prueba con uno actualizado",
    err_empty: "No hay archivos.",
    err_build: "No se pudo crear la imagen: {why}",
    xt_boot_note: "DosXT necesita tu disco de arranque de MS-DOS (!BOOT.img) en /cores/dosxt. Mira el README de DosXT.",
    footer_repos: "Cores:",
    lang: "Idioma",
  },
  en: {
    title: "DOS G&W Imager",
    tagline: "Turn a DOS game into a disk image and .cfg for the Game & Watch",
    privacy: "Everything happens in your browser: the game's files are not uploaded anywhere.",
    tab_dosat: "DosAT", tab_dosat_sub: "386 · VGA · Sound Blaster",
    tab_dosxt: "DosXT", tab_dosxt_sub: "PC XT · 8088 · CGA",
    step_game: "Game",
    drop_title: "Drop the game's folder or .zip here",
    drop_or: "or",
    pick_folder: "Choose folder",
    pick_zip: "Choose .zip",
    loading: "Reading…",
    loaded_files: "{files} files · {size}",
    change_game: "Change game",
    game_name: "Name",
    game_name_help: "The file name on the SD card, and what the menu shows.",
    disk: "Disk",
    layout_auto: "Automatic ({what})",
    floppy: "{kb} KB floppy",
    hd: "{mb} MB hard disk",
    renamed: "{n} names changed to DOS (8.3) format",
    step_start: "Start-up",
    program: "Program that starts the game",
    program_help: "The one that looks most like a game comes first; installers and utilities go last.",
    no_program: "There is no .EXE, .COM or .BAT. Is it the right folder?",
    args: "Parameters",
    args_help: "What follows the program's name. E.g. “a” in Monkey Island = AdLib music.",
    pre: "Programs before the game",
    pre_help: "Optional, separated by “;”. E.g. a sound driver such as SOUND.",
    boot: "DOS boot disk",
    boot_help: "DosXT boots MS-DOS from this floppy (in /cores/dosxt). Leave it empty if the game boots by itself.",
    step_options: "Options",
    cpu_speed: "CPU speed",
    cyc_max: "Maximum (recommended)",
    cyc_330: "8088 at 4.77 MHz (PC XT)",
    cyc_800: "286 at 8 MHz",
    cyc_1200: "286 at 12 MHz",
    cyc_2500: "386SX at 16 MHz",
    cyc_4500: "386DX at 25 MHz",
    cpu_help: "Some old games run too fast with the CPU at maximum.",
    xt_cpu_help: "MHz at boot. The on-screen keyboard can change it too.",
    memory: "Memory",
    xms: "XMS (extended memory)",
    ems: "EMS (expanded memory)",
    sound: "Sound",
    snd_both: "AdLib + Sound Blaster",
    snd_adlib: "AdLib only",
    snd_sb: "Sound Blaster only",
    snd_none: "None (PC speaker)",
    sound_help: "Remove a card only if the game hangs or sounds wrong with it.",
    video: "Video",
    vga_pages: "Extra VGA pages",
    vga_pages_help: "1 suits almost every game. 2: Wolfenstein 3D. 3: Epic Pinball, Pinball Dreams.",
    vga_hz: "Vertical rate",
    hz70: "70 Hz (like a VGA)",
    hz60: "60 Hz (smoother motion)",
    xt_video: "Video card",
    xt_vga: "EGA/VGA (default)",
    xt_cga: "CGA only (640 KB for DOS)",
    vram: "Video memory",
    advanced: "Advanced",
    step_buttons: "Buttons",
    mouse: "Mouse",
    mouse_help: "The D-pad moves the pointer and A/B are the mouse buttons.",
    default_key: "{k}",
    keys_empty: "Empty = the default key, shown in grey.",
    console: "Your console",
    console_mario: "Mario",
    console_zelda: "Zelda",
    console_help_mario: "The Mario one has no START or SELECT.",
    console_help_zelda: "The Zelda one also has START and SELECT.",
    key_bad: "Not a valid key",
    keys_help: "One key, or up to 3 joined with “+” (ctrl+x). “click” and “click2” are the mouse buttons.",
    btn_up: "Up", btn_down: "Down", btn_left: "Left", btn_right: "Right",
    btn_a: "A", btn_b: "B", btn_game: "GAME", btn_time: "TIME", btn_start: "START", btn_select: "SELECT",
    game_fixed: "In DosAT, GAME always opens the on-screen keyboard.",
    game_kbd: "Keyboard",
    step_download: "Download",
    dl_zip: "Download everything for the SD (.zip)",
    dl_zip_help: "Unzip it at the root of the SD card: every file lands in its folder.",
    dl_image: "Image",
    dl_cfg: ".cfg",
    sd_layout: "On the SD card",
    cfg_preview: ".cfg preview",
    building: "Building the image…",
    err_zip: "Could not read the .zip: {why}",
    err_NOT_ZIP: "it is not a .zip file",
    err_ZIP64: "it is a ZIP64 (over 4 GB or 65,535 files)",
    err_ENCRYPTED: "it is password-protected",
    err_METHOD: "it uses an unsupported compression method",
    err_BAD_ZIP: "it is damaged",
    err_NO_INFLATE: "this browser cannot decompress; try an up-to-date one",
    err_empty: "There are no files.",
    err_build: "Could not build the image: {why}",
    xt_boot_note: "DosXT needs your MS-DOS boot disk (!BOOT.img) in /cores/dosxt. See the DosXT README.",
    footer_repos: "Cores:",
    lang: "Language",
  },
};

const KEY = "dos-gnw-imager.lang";

export function initialLang() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && T[saved]) return saved;
  } catch { /* storage blocked: follow the browser */ }
  for (const l of navigator.languages || [navigator.language || "en"]) {
    const code = String(l).slice(0, 2).toLowerCase();
    if (T[code]) return code;
  }
  return "en";
}

export function saveLang(lang) {
  try { localStorage.setItem(KEY, lang); } catch { /* not remembered, still applied */ }
}

let current = "en";
export function setLang(lang) { current = T[lang] ? lang : "en"; document.documentElement.lang = current; }
export function lang() { return current; }

export function t(key, vars) {
  let s = T[current][key] ?? T.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

// Fill every [data-i18n] element (text) and [data-i18n-ph] (placeholder).
export function applyTexts(rootEl = document) {
  for (const el of rootEl.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of rootEl.querySelectorAll("[data-i18n-ph]")) el.placeholder = t(el.dataset.i18nPh);
  document.title = `${t("title")} — ${t("tagline")}`;
}

export function fmtSize(bytes) {
  const nf = new Intl.NumberFormat(current, { maximumFractionDigits: 1 });
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1 << 20) return `${nf.format(bytes / 1024)} KB`;
  return `${nf.format(bytes / (1 << 20))} MB`;
}
