// What the page knows about DOS games and about each core: which program
// starts the game, how the disk is laid out, and what goes in the .cfg.
// No DOM here (tested under Node).

import { buildTree, unwrap, assignNames, makeImage, chooseLayout, dosText, treeBytes } from "./fat.js";
export { treeStats } from "./fat.js";

// Programs that come with games but are not the game (fat12.py todsk).
const NOT_THE_GAME = ["INSTALL", "SETUP", "CONFIG", "LOADFIX", "SOUND", "READKEY", "SIMCGA", "CGA",
  "EGA", "VGA", "TANDY", "MOUSE", "KEYB", "AUTOEXEC", "UNINSTAL", "CHOICE", "README", "LEEME",
  "CATALOG", "ORDER", "REGISTER", "DEINSTAL", "INSTALAR", "VESA", "UNIVBE", "DOS4GW", "PKUNZIP",
  "LHA", "ARJ", "SETSOUND", "SNDSETUP"];

const alnum = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

// Every .EXE/.COM/.BAT in the tree, best guess first. `hint` is the game's
// name (folder or archive). Returns [{ path, dir, file, base, size, score }]
// with DOS (8.3) names: assignNames() must have run.
export function programs(root, hint) {
  const h = alnum(hint || "");
  const list = [];
  (function walk(n, dirs) {
    for (const c of n.children) {
      if (c.dir) { walk(c, [...dirs, c.base]); continue; }
      if (!["EXE", "COM", "BAT"].includes(c.ext)) continue;
      const base = c.base;
      let score = 0;
      if (NOT_THE_GAME.some((x) => base.startsWith(x))) score -= 100;
      if (base === "AUTOEXEC") continue;
      if (h && base.length >= 2 && (base === h || h.startsWith(base) || base.startsWith(h.slice(0, Math.max(3, base.length - 1)))))
        score += 50;
      score -= dirs.length * 10;
      if (c.ext === "BAT") score -= 5;
      if (c.ext === "COM") score -= 1;
      score += Math.min(9, Math.log2(1 + c.data.length / 1024));   // the game is usually the big one
      list.push({ path: [...dirs, `${c.base}.${c.ext}`].join("\\"), dir: dirs.join("\\"),
                  file: `${c.base}.${c.ext}`, base, size: c.data.length, score });
    }
  })(root, []);
  list.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  return list;
}

// The commands an AUTOEXEC.BAT already on the disk runs, to offer them as the
// default instead of a guess (the game's author or a previous tool wrote it).
export function existingAutoexec(root) {
  const f = root.children.find((c) => !c.dir && c.name.toUpperCase() === "AUTOEXEC.BAT");
  if (!f) return null;
  const lines = new TextDecoder("latin1").decode(f.data).split(/\r?\n/)
    .map((l) => l.trim()).filter((l) => l && !/^(@?echo|rem|::|@echo off|cls)\b/i.test(l));
  return lines.length ? lines : null;
}

// The game's display/file name: what the SD card and the menu show.
export function cleanName(s) {
  return (s || "GAME").replace(/\.(zip|img|dsk)$/i, "").replace(/[^A-Za-z0-9 _\-!()]/g, "")
    .trim().replace(/\s+/g, " ").slice(0, 40) || "GAME";
}

// ---------------------------------------------------------------- cores

export const CORES = {
  dosat: {
    ext: "dsk", cfgDir: "cores/dosat", romDir: "roms/dos",
    // DosAT defaults (README): d-pad arrows, A Space, B Enter, TIME Esc, START Y, SELECT N.
    buttons: ["up", "down", "left", "right", "a", "b", "time", "start", "select"],
    defaults: { up: "up", down: "down", left: "left", right: "right", a: "space", b: "enter",
                time: "esc", start: "y", select: "n" },
  },
  dosxt: {
    ext: "img", cfgDir: "cores/dosxt", romDir: "roms/dos",
    // GAME stays on the on-screen keyboard, as in DosAT: not offered.
    buttons: ["up", "down", "left", "right", "a", "b", "time", "start", "select"],
    defaults: { up: "up", down: "down", left: "left", right: "right", a: "enter", b: "space",
                game: "keyboard", time: "esc", start: "tab", select: "backspace" },
  },
};

// Key names both cores accept (DosAT docs/input/06-gamepad-keys, DosXT
// docs/teclas), plus each core's extras.
const COMMON_KEYS = [
  ..."abcdefghijklmnopqrstuvwxyz0123456789".split(""),
  ...Array.from({ length: 12 }, (_, i) => `f${i + 1}`),
  "enter", "space", "esc", "tab", "backspace", "shift", "rshift", "ctrl", "alt", "capslock",
  "up", "down", "left", "right", "home", "end", "pgup", "pgdn", "ins", "del",
  ...Array.from({ length: 10 }, (_, i) => `kp${i}`), "kpplus", "kpminus", "kpmul",
  "-", "=", "[", "]", "'", "`", "\\", ",", ".", "/", "semicolon",
  "click", "click2", "none",
];
const ALIASES = { intro: "enter", espacio: "space", retroceso: "backspace", mayus: "shift",
  arriba: "up", abajo: "down", izquierda: "left", derecha: "right", inicio: "home", fin: "end",
  repag: "pgup", avpag: "pgdn", supr: "del", clic: "click", clic2: "click2", nada: "none" };
const XT_EXTRA = ["keyboard", "mup", "mdown", "mleft", "mright", "numlock", "scrolllock"];

export function keyNames(core) {
  return core === "dosxt" ? [...COMMON_KEYS, ...XT_EXTRA] : COMMON_KEYS;
}

// Normalise what the user typed for a button: "Ctrl + X" -> "ctrl+x".
// Returns { value, ok }.
export function normKey(core, s) {
  const v = String(s || "").trim().toLowerCase().replace(/\s*\+\s*/g, "+");
  if (!v) return { value: "", ok: true };
  const known = new Set(keyNames(core));
  const parts = v.split("+").map((p) => ALIASES[p] || p);
  const ok = parts.length <= 3 && parts.every((p) => known.has(p)) &&
             (parts.length === 1 || !parts.some((p) => ["none", "keyboard"].includes(p)));
  return { value: parts.join("+"), ok };
}

// ---------------------------------------------------------------- the build

// Everything the page needs to produce one game for one core, in two steps:
// prepare() is cheap (tree, names, the disk it will be, the .cfg) and runs on
// every change of the form; build() writes the image, on download.
//   game: { root (tree, unwrapped), top (wrapper folder name or null), name }
//   opts: the form's values (see app.js)
export function prepare(core, game, opts) {
  const C = CORES[core];
  const name = cleanName(opts.name || game.name);
  // DosXT on a hard disk keeps the game in its own folder (C:\MONKEY), as
  // fat12.py newhd does; everywhere else the game's files are the root.
  let root = cloneTree(game.root);
  const runLines = commandLines(opts);
  let folder = null;
  if (core === "dosxt") {
    const fits = treeBytes(root) + 8192 <= 1440 * 1024 - 64 * 1024;
    const forcedHd = opts.layout && opts.layout.startsWith("hd");
    if (!fits || forcedHd) {
      folder = (game.top || name).replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase() || "GAME";
      root = { name: "", dir: true, children: [{ name: folder, dir: true, children: root.children, mtime: Date.now() }] };
    }
  } else {
    // DosAT starts what AUTOEXEC.BAT says when the .cfg has no [autoexec]:
    // write it on the disk too, so the .dsk works on its own.
    root.children = root.children.filter((c) => c.dir || c.name.toUpperCase() !== "AUTOEXEC.BAT");
    if (runLines.length) root.children.push({ name: "AUTOEXEC.BAT", data: dosText(runLines), mtime: new Date() });
  }
  const renamed = assignNames(root);
  let layout = chooseLayout(root);
  if (core === "dosxt" && layout.kind === "floppy" && layout.kb !== 1440) layout = { kind: "hd", mb: 4 };
  const auto = { ...layout };
  if (opts.layout && opts.layout !== "auto") {
    const [kind, n] = opts.layout.split(":");
    layout = kind === "floppy" ? { kind, kb: +n } : { kind, mb: +n };
  }
  const prep = { core, name, root, runLines, folder, renamed, layout, auto, fixed: opts.layout && opts.layout !== "auto",
    imageName: `${name}.${C.ext}`, cfgName: `${name}.cfg`,
    paths: { image: `${C.romDir}/${name}.${C.ext}`, cfg: `${C.cfgDir}/${name}.cfg` } };
  prep.cfgText = cfgFor(prep, opts, layout.kind);
  return prep;
}

export function cfgFor(prep, opts, kind) {
  return prep.core === "dosat" ? dosatCfg(prep.name, opts, prep.runLines) : dosxtCfg(prep.name, opts, kind, prep.folder);
}

// Write the image (growing an automatic layout if the estimate was short).
export function build(prep, opts) {
  let layout = prep.layout, image;
  const label = prep.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 11);
  for (;;) {
    try { image = makeImage(prep.root, layout, label); break; }
    catch (e) {
      if (e.code !== "DISK_FULL" || prep.fixed) throw e;
      layout = layout.kind === "floppy" && prep.core === "dosat" && layout.kb === 1440 ? { kind: "floppy", kb: 2880 }
        : layout.kind === "floppy" ? { kind: "hd", mb: 4 } : { kind: "hd", mb: Math.ceil(layout.mb * 1.25) + 1 };
    }
  }
  return { image, cfgText: cfgFor(prep, opts, image.kind) };
}

// One call: prepare + build (tests, scripts).
export function buildFor(core, game, opts) {
  const prep = prepare(core, game, opts);
  return { ...prep, ...build(prep, opts) };
}

function cloneTree(n) {
  return n.dir ? { ...n, children: n.children.map(cloneTree) } : { ...n };
}

// The commands that start the game, DOS style: "CD \DIR", then optional
// programs that must run first, then the game with its parameters.
export function commandLines(opts) {
  const lines = [];
  if (opts.program) {
    const i = opts.program.lastIndexOf("\\");
    const dir = i >= 0 ? opts.program.slice(0, i) : "";
    const file = i >= 0 ? opts.program.slice(i + 1) : opts.program;
    if (dir) lines.push(`CD \\${dir}`);
    for (const p of (opts.pre || "").split(/[;\n]/).map((s) => s.trim()).filter(Boolean)) lines.push(p);
    const exe = /\.(EXE|COM)$/i.test(file) ? file.replace(/\.(EXE|COM)$/i, "") : file;
    lines.push([exe, (opts.args || "").trim()].filter(Boolean).join(" "));
  }
  return lines;
}

const HEADER = (path) => [`; ${path}`, "; made with dos-gnw-imager — https://julenvitoria.github.io/dos-gnw-imager/", ""];

function gamepadLines(core, opts) {
  const C = CORES[core], out = [];
  if (opts.mouse) out.push(`${"mouse".padEnd(6)} = on`);
  for (const b of C.buttons) {
    const v = normKey(core, opts.keys?.[b]).value;
    if (v && v !== C.defaults[b]) out.push(`${b.padEnd(6)} = ${v}`);
  }
  return out;
}

function dosatCfg(name, opts, runLines) {
  const L = HEADER(`/cores/dosat/${name}.cfg`);
  L.push("[cpu]", `cycles = ${opts.cycles || "max"}`, "");
  L.push("[dos]", `xms = ${opts.xms === false ? "false" : "true"}`, `ems = ${opts.ems ? "true" : "false"}`, "");
  const snd = opts.sound || "both";
  if (snd !== "both") {
    L.push("[sblaster]");
    if (snd === "adlib" || snd === "none") L.push("sbtype = none");
    if (snd === "sb" || snd === "none") L.push("oplmode = none");
    L.push("");
  }
  const video = [];
  if (opts.vgaPages !== undefined && opts.vgaPages !== "" && +opts.vgaPages !== 1) video.push(`vga_pages = ${+opts.vgaPages}`);
  if (opts.vgaHz && +opts.vgaHz !== 70) video.push(`vga_hz = ${+opts.vgaHz}`);
  if (video.length) L.push("[video]", ...video, "");
  if (runLines.length) L.push("[autoexec]", ...runLines.map((l) => l.replace(/^CD \\/, "cd \\")), "");
  const pad = gamepadLines("dosat", opts);
  if (pad.length) L.push("[gamepad]", ...pad, "");
  return L.join("\n");
}

function dosxtCfg(name, opts, kind, folder) {
  const L = HEADER(`/cores/dosxt/${name}.cfg`);
  const boot = (opts.boot ?? "!BOOT.img").trim();
  if (boot) L.push(`boot   = ${boot}`);
  // With a boot floppy on A:, a game floppy is B: and a hard disk C:; with
  // no boot image the game's own disk boots (and is A: or C:).
  const drive = kind === "floppy" ? (boot ? "b:" : "a:") : "c:";
  const cmds = [drive];
  const lines = commandLines(opts);
  for (const l of lines) {
    if (/^CD \\/.test(l)) cmds.push(`cd \\${folder ? folder + "\\" : ""}${l.slice(4)}`);
    else cmds.push(l);
  }
  if (folder && !lines.some((l) => /^CD \\/.test(l))) cmds.splice(1, 0, `cd \\${folder}`);
  if (lines.length) L.push(`run    = ${cmds.join(";")}`);
  if (opts.cpu && opts.cpu !== "8") L.push(`cpu    = ${opts.cpu}`);
  if (opts.video === "cga") L.push("video  = cga");
  if (opts.vram && opts.vram !== "128") L.push(`vram   = ${opts.vram}`);
  const pad = gamepadLines("dosxt", opts);
  if (pad.length) L.push(...pad);
  return L.join("\n") + "\n";
}

// Load a flat file list (from a folder or a zip) as a game.
export function loadGame(files, fallbackName) {
  const { root, top } = unwrap(buildTree(files));
  const name = cleanName(top || fallbackName);
  assignNames(root);
  return { root, top, name };
}
