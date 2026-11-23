// The page: tabs, language, reading a folder or a .zip, the form, downloads.
import { LANGS, initialLang, saveLang, setLang, t, applyTexts, fmtSize } from "./i18n.js";
import { readZip, writeZip, ZipError } from "./zip.js";
import { loadGame, programs, prepare, build, CORES, keyNames, normKey, treeStats } from "./games.js";

const $ = (id) => document.getElementById(id);
const state = {
  core: "dosat",                 // DosAT is the first tab and the default
  game: null,                    // { root, top, name }
  progs: [],
  keys: {},                      // the game's keys: the same for both tabs
  console: loadConsole(),        // "mario" or "zelda": Zelda adds START and SELECT
  prep: null,
};

// ------------------------------------------------------------ language
const langSel = $("lang");
for (const [code, label] of Object.entries(LANGS)) langSel.add(new Option(label, code));
function useLang(code) {
  setLang(code);
  langSel.value = code;
  applyTexts();
  showConsole();
  renderPad();
  refresh();
}
langSel.addEventListener("change", () => { saveLang(langSel.value); useLang(langSel.value); });

// ------------------------------------------------------------ console
const ZELDA_ONLY = ["start", "select"];
const CONSOLE_KEY = "dos-gnw-imager.console";
function loadConsole() {
  try { const c = localStorage.getItem(CONSOLE_KEY); if (c === "mario" || c === "zelda") return c; } catch { /* default */ }
  return "zelda";
}
for (const btn of document.querySelectorAll("[data-console]")) {
  btn.addEventListener("click", () => {
    state.console = btn.dataset.console;
    try { localStorage.setItem(CONSOLE_KEY, state.console); } catch { /* not remembered */ }
    showConsole();
    renderPad();
    refresh();
  });
}
function showConsole() {
  for (const btn of document.querySelectorAll("[data-console]"))
    btn.setAttribute("aria-checked", String(btn.dataset.console === state.console));
  $("console-help").textContent = t(`console_help_${state.console}`);
}

// ------------------------------------------------------------ tabs
for (const tab of document.querySelectorAll(".tab")) {
  tab.addEventListener("click", () => selectCore(tab.dataset.core));
  tab.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const next = tab.dataset.core === "dosat" ? "dosxt" : "dosat";
      selectCore(next); $(`tab-${next}`).focus();
    }
  });
}
function selectCore(core) {
  state.core = core;
  for (const tab of document.querySelectorAll(".tab")) tab.setAttribute("aria-selected", String(tab.dataset.core === core));
  for (const el of document.querySelectorAll("[data-only]")) el.hidden = el.dataset.only !== core;
  fillLayouts();
  renderPad();
  refresh();
}

// ------------------------------------------------------------ input
const drop = $("drop");
$("pick-folder").addEventListener("click", () => $("in-folder").click());
$("pick-zip").addEventListener("click", () => $("in-zip").click());
$("change").addEventListener("click", () => { resetGame(); drop.focus(); });
drop.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target === drop) $("in-folder").click(); });

$("in-folder").addEventListener("change", async (e) => {
  const list = [...e.target.files];
  e.target.value = "";
  if (!list.length) return;
  await loadFromFiles(list.map((f) => ({ file: f, path: f.webkitRelativePath || f.name })),
                      (list[0].webkitRelativePath || "").split("/")[0]);
});
$("in-zip").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  e.target.value = "";
  if (f) await loadZip(f);
});

for (const ev of ["dragenter", "dragover"]) drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("is-over"); });
for (const ev of ["dragleave", "drop"]) drop.addEventListener(ev, () => drop.classList.remove("is-over"));
// Let a drop anywhere on the page work, but never let the browser open the file.
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => { e.preventDefault(); if (!drop.contains(e.target)) handleDrop(e); });
drop.addEventListener("drop", (e) => { e.preventDefault(); handleDrop(e); });

async function handleDrop(e) {
  const items = [...(e.dataTransfer?.items || [])].map((i) => i.webkitGetAsEntry?.()).filter(Boolean);
  if (items.length === 1 && items[0].isFile && /\.zip$/i.test(items[0].name)) {
    return loadZip(await entryFile(items[0]));
  }
  if (!items.length) {
    const f = e.dataTransfer?.files?.[0];
    if (f && /\.zip$/i.test(f.name)) return loadZip(f);
    return;
  }
  status(t("loading"));
  const out = [];
  for (const it of items) await walkEntry(it, "", out);
  const name = items.length === 1 && items[0].isDirectory ? items[0].name : "GAME";
  await loadFromFiles(out, name);
}

function entryFile(entry) { return new Promise((res, rej) => entry.file(res, rej)); }
async function walkEntry(entry, prefix, out) {
  const path = prefix + entry.name;
  if (entry.isFile) { out.push({ file: await entryFile(entry), path }); return; }
  out.push({ dir: true, path });
  const reader = entry.createReader();
  for (;;) {
    const batch = await new Promise((res, rej) => reader.readEntries(res, rej));
    if (!batch.length) break;
    for (const e of batch) await walkEntry(e, path + "/", out);
  }
}

async function loadFromFiles(list, name) {
  status(t("loading"));
  try {
    const files = [];
    for (const it of list) {
      if (it.dir) { files.push({ path: it.path, dir: true }); continue; }
      files.push({ path: it.path, data: new Uint8Array(await it.file.arrayBuffer()), mtime: it.file.lastModified });
    }
    setGame(files, name);
  } catch (err) {
    status(String(err.message || err), true);
  }
}

async function loadZip(file) {
  status(t("loading"));
  try {
    const files = await readZip(await file.arrayBuffer(), (n, total) => status(`${t("loading")} ${n}/${total}`));
    setGame(files, file.name.replace(/\.zip$/i, ""));
  } catch (err) {
    const why = err instanceof ZipError ? t(`err_${err.code}`) : String(err.message || err);
    status(t("err_zip", { why }), true);
  }
}

function setGame(files, fallbackName) {
  if (!files.some((f) => !f.dir)) { status(t("err_empty"), true); return; }
  const game = loadGame(files, fallbackName);
  if (!game.root.children.length) { status(t("err_empty"), true); return; }
  state.game = game;
  state.progs = programs(game.root, game.name);
  $("o-name").value = game.name;
  fillPrograms();
  presetFromAutoexec();
  status("");
  drop.hidden = true;
  $("loaded").hidden = false;
  $("steps").hidden = false;
  const st = treeStats(game.root);
  $("game-title").textContent = game.top || fallbackName || game.name;
  $("game-stats").textContent = t("loaded_files", { files: st.files, size: fmtSize(st.bytes) });
  fillLayouts();
  refresh();
}

function resetGame() {
  state.game = null;
  drop.hidden = false;
  $("loaded").hidden = true;
  $("steps").hidden = true;
}

function status(msg, isError = false) {
  const el = $("status");
  el.hidden = !msg;
  el.textContent = msg;
  el.classList.toggle("is-error", isError);
}

// ------------------------------------------------------------ form
function fillPrograms() {
  const sel = $("o-program");
  sel.textContent = "";
  for (const p of state.progs) sel.add(new Option(`${p.path}  ·  ${fmtSize(p.size)}`, p.path));
  $("no-program").hidden = state.progs.length > 0;
}

// If the game already carries an AUTOEXEC.BAT, start what it starts.
function presetFromAutoexec() {
  $("o-args").value = "";
  const f = state.game.root.children.find((c) => !c.dir && c.name.toUpperCase() === "AUTOEXEC.BAT");
  if (!f) return;
  const lines = new TextDecoder("latin1").decode(f.data).split(/\r?\n/).map((l) => l.trim())
    .filter((l) => l && !/^(@|echo\b|rem\b|::|cls\b|[a-z]:$)/i.test(l));
  let dir = "";
  for (const l of lines) {
    const cd = l.match(/^cd\s*\\?(.*)$/i);
    if (cd) { dir = cd[1].replace(/^\\+/, "").toUpperCase(); continue; }
    const [cmd, ...rest] = l.split(/\s+/);
    const base = cmd.toUpperCase().replace(/\.(EXE|COM|BAT)$/, "");
    const hit = state.progs.find((p) => p.base === base && p.dir.toUpperCase() === dir);
    if (hit) { $("o-program").value = hit.path; $("o-args").value = rest.join(" "); }
  }
}

function fillLayouts() {
  const sel = $("o-layout"), keep = sel.value;
  sel.textContent = "";
  sel.add(new Option(t("layout_auto", { what: "…" }), "auto"));
  sel.add(new Option(t("floppy", { kb: "1440" }), "floppy:1440"));
  if (state.core === "dosat") sel.add(new Option(t("floppy", { kb: "2880" }), "floppy:2880"));
  for (const mb of [8, 16, 32, 64, 128]) sel.add(new Option(t("hd", { mb }), `hd:${mb}`));
  sel.value = [...sel.options].some((o) => o.value === keep) ? keep : "auto";
}

function layoutText(l) {
  return l.kind === "floppy" ? t("floppy", { kb: l.kb === 1440 ? "1440" : "2880" }) : t("hd", { mb: l.mb });
}

const BTN_LABEL = { up: "▲", down: "▼", left: "◀", right: "▶", a: "A", b: "B", game: "GAME", time: "TIME", start: "START", select: "SELECT" };
function renderPad() {
  const C = CORES[state.core], pad = $("pad");
  pad.textContent = "";
  const dl = $("keys");
  dl.textContent = "";
  for (const k of keyNames(state.core)) dl.append(new Option(k));
  for (const b of C.buttons) {
    if (state.console !== "zelda" && ZELDA_ONLY.includes(b)) continue;
    const wrap = document.createElement("label");
    wrap.className = "key";
    const head = document.createElement("span");
    const chip = document.createElement("span");
    chip.className = "chip" + (b === "a" || b === "b" ? " chip--red" : ["game", "time", "start", "select"].includes(b) ? " chip--gray" : "");
    chip.textContent = BTN_LABEL[b];
    head.append(chip, document.createTextNode(t(`btn_${b}`)));
    const input = document.createElement("input");
    input.setAttribute("list", "keys");
    input.autocomplete = "off"; input.spellcheck = false;
    input.placeholder = t("default_key", { k: C.defaults[b] });
    input.value = state.keys[b] || "";
    input.dataset.btn = b;
    input.addEventListener("input", () => {
      state.keys[b] = input.value;
      const ok = normKey(state.core, input.value).ok;
      input.classList.toggle("bad", !ok);
      input.title = ok ? "" : t("key_bad");
      refresh();
    });
    wrap.append(head, input);
    pad.append(wrap);
  }
}

function opts() {
  return {
    name: $("o-name").value,
    layout: $("o-layout").value,
    program: $("o-program").value,
    args: $("o-args").value,
    pre: $("o-pre").value,
    boot: $("o-boot").value,
    cycles: $("o-cycles").value,
    sound: $("o-sound").value,
    xms: $("o-xms").checked,
    ems: $("o-ems").checked,
    vgaPages: $("o-vgapages").value,
    vgaHz: $("o-vgahz").value,
    cpu: $("o-cpu").value,
    video: $("o-video").value,
    vram: $("o-vram").value,
    mouse: $("o-mouse").checked,
    keys: Object.fromEntries(Object.entries(state.keys).filter(([b, v]) =>
      normKey(state.core, v).ok && (state.console === "zelda" || !ZELDA_ONLY.includes(b)))),
  };
}

for (const el of document.querySelectorAll("#s-game input, #s-game select, #steps input, #steps select")) {
  if (el.closest("#pad")) continue;
  el.addEventListener(el.tagName === "SELECT" || el.type === "checkbox" ? "change" : "input", refresh);
}

// ------------------------------------------------------------ preview
function refresh() {
  if (!state.game) return;
  const o = opts();
  try {
    state.prep = prepare(state.core, state.game, o);
  } catch (err) {
    status(t("err_build", { why: err.message }), true);
    return;
  }
  const p = state.prep;
  const autoOpt = $("o-layout").options[0];
  autoOpt.textContent = t("layout_auto", { what: layoutText(p.auto) });
  const det = $("renamed");
  det.hidden = !p.renamed.length;
  if (p.renamed.length) {
    det.querySelector("summary").textContent = t("renamed", { n: p.renamed.length });
    const ul = det.querySelector("ul");
    ul.textContent = "";
    for (const r of p.renamed.slice(0, 500)) {
      const li = document.createElement("li");
      li.textContent = `${r.from}  →  ${r.to}`;
      ul.append(li);
    }
  }
  $("cfg-preview").textContent = p.cfgText;
  const tree = $("sd-tree");
  tree.textContent = "";
  const lines = [
    ["/", ""],
    ["├─ cores/", ""],
    [`│  └─ ${CORES[state.core].cfgDir.split("/")[1]}/`, ""],
    ["│     └─ ", p.cfgName],
    ["└─ roms/", ""],
    ["   └─ dos/", ""],
    ["      └─ ", p.imageName],
  ];
  if (state.core === "dosxt") lines.splice(4, 0, ["│     └─ ", "!BOOT.img  (MS-DOS)"]), lines[3][0] = "│     ├─ ";
  for (const [pre, b] of lines) {
    tree.append(document.createTextNode(pre));
    if (b) { const el = document.createElement("b"); el.textContent = b; tree.append(el); }
    tree.append(document.createTextNode("\n"));
  }
  $("dl-image").textContent = `${t("dl_image")}: ${p.imageName}`;
  $("dl-cfg").textContent = p.cfgName;
  if (!$("status").classList.contains("is-error")) status("");
}

// ------------------------------------------------------------ download
function save(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
}

async function withBuild(fn) {
  if (!state.prep) return;
  const btns = document.querySelectorAll(".dl button");
  btns.forEach((b) => (b.disabled = true));
  status(t("building"));
  await new Promise((r) => setTimeout(r, 30));       // let the message paint
  try {
    const o = opts();
    const out = build(state.prep, o);
    status("");
    fn(out);
  } catch (err) {
    status(t("err_build", { why: err.message }), true);
  } finally {
    btns.forEach((b) => (b.disabled = false));
  }
}

const cfgBytes = (text) => new TextEncoder().encode(text.replace(/\r?\n/g, "\r\n"));
$("dl-zip").addEventListener("click", () => withBuild(({ image, cfgText }) => {
  const p = state.prep;
  save(writeZip([{ path: p.paths.image, data: image.bytes }, { path: p.paths.cfg, data: cfgBytes(cfgText) }]),
       `${p.name}-${state.core}.zip`);
}));
$("dl-image").addEventListener("click", () => withBuild(({ image }) => save(new Blob([image.bytes]), state.prep.imageName)));
$("dl-cfg").addEventListener("click", () => {
  if (!state.prep) return;
  save(new Blob([cfgBytes(state.prep.cfgText)], { type: "text/plain" }), state.prep.cfgName);
});

// ------------------------------------------------------------ start
selectCore("dosat");
useLang(initialLang());
