// Smoke test of js/games.js on a folder: prints the guess, the cfgs and the layouts.
import fs from "node:fs"; import path from "node:path";
import { loadGame, programs, buildFor } from "../js/games.js";
const files = [];
(function w(d, r) { for (const n of fs.readdirSync(d)) { const p = path.join(d, n), rr = r ? `${r}/${n}` : n, st = fs.statSync(p);
  if (st.isDirectory()) { files.push({ path: rr, dir: true, mtime: st.mtime }); w(p, rr); }
  else files.push({ path: rr, data: new Uint8Array(fs.readFileSync(p)), mtime: st.mtime }); } })(process.argv[2], process.argv[3] || "");
const g = loadGame(files, path.basename(process.argv[2]));
const pr = programs(g.root, g.name);
console.log(g.name, "top:", g.top, pr.slice(0, 4).map((p) => `${p.path} (${p.score.toFixed(1)})`));
for (const core of ["dosat", "dosxt"]) {
  const r = buildFor(core, g, { program: pr[0]?.path, args: process.argv[4] || "", mouse: true, keys: { a: "Click" } });
  console.log(`== ${core}`, r.paths, r.layout, r.image.kind, r.image.fat, r.image.bytes.length);
  console.log(r.cfgText);
  if (process.argv[5]) fs.writeFileSync(`${process.argv[5]}.${core}.${r.image.kind === "hd" ? "hd" : "fl"}`, r.image.bytes);
}
