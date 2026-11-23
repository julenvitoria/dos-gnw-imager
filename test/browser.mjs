// Drive the page in Chromium: load a .zip and a folder, switch tabs and
// languages, download, and save what came out. Screenshots go to build/web.
//   node test/browser.mjs   (needs a server on :8765 serving the repo root)
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import fs from "node:fs";
const OUT = "build/web";
const browser = await chromium.launch();
const results = {};
for (const [label, ctxOpts] of [["desktop", { viewport: { width: 1200, height: 900 }, locale: "es-ES" }],
                                ["phone", { viewport: { width: 390, height: 844 }, locale: "en-US", deviceScaleFactor: 1 }]]) {
  const ctx = await browser.newContext({ ...ctxOpts, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("http://localhost:8765/index.html");
  await page.screenshot({ path: `${OUT}/${label}-0-empty.png`, fullPage: true });
  results[label] = { lang: await page.evaluate(() => document.documentElement.lang),
                     tab: await page.getAttribute("#tab-dosat", "aria-selected") };
  // zip
  await page.setInputFiles("#in-zip", `${OUT}/MONKEY.zip`);
  await page.waitForSelector("#steps:not([hidden])");
  await page.fill("#o-args", "v a");
  await page.fill('#pad input[data-btn="a"]', "click");
  await page.check("#o-mouse", { force: true });
  await page.screenshot({ path: `${OUT}/${label}-1-dosat.png`, fullPage: true });
  results[label].dosat = { cfg: await page.textContent("#cfg-preview"), program: await page.inputValue("#o-program"),
                           layoutAuto: await page.textContent("#o-layout option[value=auto]") };
  let [dl] = await Promise.all([page.waitForEvent("download"), page.click("#dl-zip")]);
  await dl.saveAs(`${OUT}/${label}-dosat.zip`);
  // DosXT tab
  await page.click("#tab-dosxt");
  await page.screenshot({ path: `${OUT}/${label}-2-dosxt.png`, fullPage: true });
  results[label].dosxt = { cfg: await page.textContent("#cfg-preview") };
  [dl] = await Promise.all([page.waitForEvent("download"), page.click("#dl-image")]);
  await dl.saveAs(`${OUT}/${label}-dosxt.img`);
  // language switch is remembered
  await page.selectOption("#lang", label === "desktop" ? "en" : "es");
  await page.reload();
  results[label].langAfterReload = await page.evaluate(() => document.documentElement.lang);
  results[label].tabAfterReload = await page.getAttribute("#tab-dosat", "aria-selected");
  // folder input
  if (label === "desktop") {
    await page.setInputFiles("#in-folder", "build/t/ALLEYCAT");
    await page.waitForSelector("#steps:not([hidden])");
    results[label].folder = { title: await page.textContent("#game-title"), program: await page.inputValue("#o-program"),
                              cfg: await page.textContent("#cfg-preview") };
    [dl] = await Promise.all([page.waitForEvent("download"), page.click("#dl-image")]);
    await dl.saveAs(`${OUT}/${label}-alleycat.dsk`);
  }
  results[label].errors = errors;
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
