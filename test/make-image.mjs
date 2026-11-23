// Build an image from a folder with the same code the page uses.
//   node test/make-image.mjs <folder> <out.img> [--floppy 1440|2880] [--hd MB] [--label NAME]
//                            [--autoexec "LINE;LINE"]
// Prints the layout and the renamed files as JSON on stdout.
import fs from "node:fs";
import path from "node:path";
import { buildTree, unwrap, assignNames, makeImage, makeAuto, dosText } from "../js/fat.js";

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const [src, out] = args;

const files = [];
(function walk(dir, rel) {
  for (const n of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, n), r = rel ? `${rel}/${n}` : n, st = fs.statSync(p);
    if (st.isDirectory()) { files.push({ path: r, dir: true, mtime: st.mtime }); walk(p, r); }
    else files.push({ path: r, data: new Uint8Array(fs.readFileSync(p)), mtime: st.mtime });
  }
})(src, "");

let { root } = unwrap(buildTree(files));
if (opt("--autoexec")) {
  root.children = root.children.filter((c) => c.name.toUpperCase() !== "AUTOEXEC.BAT");
  root.children.push({ name: "AUTOEXEC.BAT", data: dosText(opt("--autoexec").split(";")), mtime: new Date() });
}
const renamed = assignNames(root);
const label = opt("--label") || path.basename(out).replace(/\.[^.]*$/, "");
const img = opt("--floppy") ? makeImage(root, { kind: "floppy", kb: +opt("--floppy") }, label)
  : opt("--hd") ? makeImage(root, { kind: "hd", mb: +opt("--hd") }, label)
  : makeAuto(root, label);
fs.writeFileSync(out, img.bytes);
const { bytes, ...info } = img;
console.log(JSON.stringify({ ...info, size: bytes.length, renamed }));
