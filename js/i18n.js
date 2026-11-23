// Texts. The first visit follows the browser's language; a choice made
// with the selector is remembered in this browser. A missing text falls back
// to English. Adding a language = one file in js/lang/ and one line below.
import es from "./lang/es.js";
import en from "./lang/en.js";
import fr from "./lang/fr.js";
import de from "./lang/de.js";
import zh from "./lang/zh.js";
import ja from "./lang/ja.js";
import ko from "./lang/ko.js";

// In the selector's order, each named in its own language.
export const LANGS = { es: "Español", en: "English", fr: "Français", de: "Deutsch",
  zh: "简体中文", ja: "日本語", ko: "한국어" };

const T = { es, en, fr, de, zh, ja, ko };


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
export function setLang(lang) {
  current = T[lang] ? lang : "en";
  document.documentElement.lang = current === "zh" ? "zh-Hans" : current;
}
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
