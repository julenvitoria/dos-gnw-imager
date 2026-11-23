// FAT disk images for the DosAT and DosXT Game & Watch cores.
//
// A JavaScript port of the two tools the cores' READMEs use:
//   - DosAT  scripts/make_dsk.py  (floppy if the game fits, else a hard disk)
//   - DosXT  tools/fat12.py        (new / newhd)
// Same layouts, so an image made here is read exactly like one made there:
//   - Floppy: 1.44 MB or 2.88 MB, no partition table, standard BPB.
//   - Hard disk: MBR with ONE active primary partition at LBA 63, geometry
//     16 heads x 63 sectors (the MS-DOS 5 shape the cores have run since
//     October), FAT12 below 4085 clusters, FAT16 above, partition type
//     0x01 / 0x04 / 0x06 to match.
//
// No DOM here: the module runs in the browser and under Node (tests).

const SECTOR = 512;
const HD_HEADS = 16, HD_SPT = 63;
const HD_MAX_MB = 500;           // 1024 cylinders of 16 x 63: the INT 13h limit

// MBR code (DosXT tools/src/mbr.asm): loads the active partition's boot
// sector, like MS-DOS's own, so DOS can be installed on the disk later.
const MBR_CODE = hex(
  "fa31c08ed0bc007c8ed88ec0fbfcbe007cbf0006b90001f3a5ea1e060000bebe07b90400f60480750a83c610e2f6" +
  "be7706eb33bf0500bb007cb801028a74018b4c0256cd135e730c31c0cd134f75e7be8e06eb12813efe7d55aa7405" +
  "bea706eb05ea007c0000ac08c07409b40ebb0700cd10ebf2f4ebfd53696e20706172746963696f6e206163746976" +
  "610d0a004572726f72206c6579656e646f20656c20646973636f0d0a00446973636f2073696e2073697374656d61" +
  "3a20617272616e636120646573646520756e206469737175657465206520696e7374616c6120444f5320286f2053" +
  "595320433a290d0a00");

// Volume boot code: prints a message and halts (the disk carries no DOS).
const BOOT_CODE = Uint8Array.from([
  0xFA, 0x31, 0xC0, 0x8E, 0xD8, 0x8E, 0xD0, 0xBC, 0x00, 0x7C, 0xFB, // cli; ds=ss=0; sp=7C00; sti
  0xBE, 0x5A, 0x7C,                                                 // mov si, 7C5A (message)
  0xAC, 0x08, 0xC0, 0x74, 0x06, 0xB4, 0x0E, 0xCD, 0x10, 0xEB, 0xF5, // print loop
  0xF4, 0xEB, 0xFD]);                                               // hlt; jmp $
const FLOPPY_MSG = "No es un disco de arranque. Arranca el DOS y usa este disco desde A:.\r\n";
const HD_MSG = "Disco sin sistema: arranca desde un disquete e instala DOS (o SYS C:)\r\n";

export const FLOPPIES = {
  1440: { bps: 512, spc: 1, rsv: 1, nfat: 2, nroot: 224, total: 2880, media: 0xF0, spf: 9, spt: 18, heads: 2 },
  2880: { bps: 512, spc: 2, rsv: 1, nfat: 2, nroot: 240, total: 5760, media: 0xF0, spf: 9, spt: 36, heads: 2 },
};

// Files that come along with an archive or a folder but are not the game.
const JUNK = /^(__MACOSX|\.DS_Store|Thumbs\.db|desktop\.ini|\._.*)$/i;

function hex(s) {
  const a = new Uint8Array(s.length / 2);
  for (let i = 0; i < a.length; i++) a[i] = parseInt(s.substr(i * 2, 2), 16);
  return a;
}

// ---------------------------------------------------------------- the tree
//
// A tree node is { name, dir: true, children: [...] } or
// { name, data: Uint8Array, mtime: Date|number }. The root node's name is
// ignored. buildTree() makes one from a flat list of { path, data, mtime }.

export function buildTree(files) {
  const root = { name: "", dir: true, children: [] };
  for (const f of files) {
    const parts = f.path.split(/[\\/]+/).filter(Boolean);
    if (!parts.length || parts.some((p) => JUNK.test(p))) continue;
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      let next = node.children.find((c) => c.dir && c.name === parts[i]);
      if (!next) {
        next = { name: parts[i], dir: true, children: [], mtime: f.mtime };
        node.children.push(next);
      }
      node = next;
    }
    if (f.dir) {
      if (!node.children.find((c) => c.dir && c.name === parts.at(-1)))
        node.children.push({ name: parts.at(-1), dir: true, children: [], mtime: f.mtime });
    } else {
      node.children.push({ name: parts.at(-1), data: f.data, mtime: f.mtime });
    }
  }
  return root;
}

// An archive or a folder often wraps the game in one extra folder
// ("MONKEY/..."). Returns { root, top } with that wrapper peeled off.
export function unwrap(root) {
  let top = null;
  while (root.children.length === 1 && root.children[0].dir) {
    top = root.children[0].name;
    root = root.children[0];
  }
  return { root, top };
}

export function treeStats(root) {
  let files = 0, dirs = 0, bytes = 0;
  (function walk(n) {
    for (const c of n.children) {
      if (c.dir) { dirs++; walk(c); } else { files++; bytes += c.data.length; }
    }
  })(root);
  return { files, dirs, bytes };
}

// ---------------------------------------------------------------- 8.3 names

const VALID = /[A-Z0-9!#$%&'()\-@^_`{}~]/;

function clean(s) {
  let out = "", lossy = false;
  for (const ch of s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase()) {
    if (VALID.test(ch)) out += ch;
    else { lossy = true; if (ch !== " " && ch !== ".") out += "_"; }
  }
  return { out, lossy };
}

// The DOS 8.3 name for `name`, unique among `taken` (a Set of "BASE.EXT").
// Short, valid names are kept as they are; others become BASE~N like
// Windows does, so a long-named file still gets a predictable name.
export function dosName(name, taken, isDir = false) {
  const dot = isDir ? -1 : name.lastIndexOf(".");
  const rawBase = dot > 0 ? name.slice(0, dot) : name;
  const rawExt = dot > 0 ? name.slice(dot + 1) : "";
  const b = clean(rawBase), e = clean(rawExt);
  let base = b.out || "_", ext = e.out.slice(0, 3);
  const lossy = b.lossy || e.lossy || b.out.length > 8 || e.out.length > 3;
  const key = (x, y) => (y ? `${x}.${y}` : x);
  if (!lossy && !taken.has(key(base, ext))) {
    taken.add(key(base, ext));
    return { base, ext, changed: false };
  }
  for (let n = 1; n < 100000; n++) {
    const tail = `~${n}`;
    const cand = base.slice(0, 8 - tail.length) + tail;
    if (!taken.has(key(cand, ext))) {
      taken.add(key(cand, ext));
      return { base: cand, ext, changed: true };
    }
  }
  throw new Error(`too many files named like ${name}`);
}

// Assign 8.3 names to the whole tree, in a stable order (directories first,
// then files, each alphabetical). Fills node.base / node.ext and returns the
// list of renamed paths, so the page can show them.
export function assignNames(root, reserved = []) {
  const renamed = [];
  (function walk(n, prefix, origPrefix, reservedHere) {
    const taken = new Set(reservedHere);
    n.children.sort((x, y) => (x.dir === y.dir ? x.name.localeCompare(y.name) : x.dir ? -1 : 1));
    for (const c of n.children) {
      const r = dosName(c.name, taken, c.dir);
      c.base = r.base; c.ext = r.ext;
      const dos = r.ext ? `${r.base}.${r.ext}` : r.base;
      c.dosPath = prefix + dos;
      c.origPath = origPrefix + c.name;
      if (r.changed || dos !== c.name.toUpperCase())
        renamed.push({ from: c.origPath, to: c.dosPath });
      if (c.dir) walk(c, c.dosPath + "\\", c.origPath + "/", []);
    }
  })(root, "", "", reserved);
  return renamed;
}

// ---------------------------------------------------------------- sizing

// Bytes the content takes, rounded per 4 KB cluster: the bound make_dsk.py
// sizes with.
export function treeBytes(root) {
  let total = 4096;
  (function walk(n) {
    for (const c of n.children) {
      if (c.dir) { total += 4096; walk(c); }
      else total += Math.ceil(c.data.length / 4096) * 4096;
    }
  })(root);
  return total;
}

// make_dsk.py's choice: a floppy if it fits with 64 KB to spare, else a
// hard disk of 1.25x the content plus 1 MB, rounded up to a whole MB (room
// for the saves and setup files games write next to themselves).
export function chooseLayout(root, extraBytes = 0) {
  const need = treeBytes(root) + 8192 + extraBytes;
  for (const kb of [1440, 2880]) {
    if (need <= kb * 1024 - 64 * 1024) return { kind: "floppy", kb };
  }
  const mb = Math.ceil((need * 5 / 4 + (1 << 20)) / (1 << 20));
  if (mb > HD_MAX_MB) throw new Error(`the game needs ${mb} MB; the largest disk is ${HD_MAX_MB} MB`);
  return { kind: "hd", mb };
}

// ---------------------------------------------------------------- geometry

function hdGeometry(sizeMB) {
  const cylBytes = HD_HEADS * HD_SPT * SECTOR;
  const cyls = Math.max(6, Math.min(1024, Math.ceil(sizeMB * 1024 * 1024 / cylBytes)));
  const total = cyls * HD_HEADS * HD_SPT;
  const psec = total - HD_SPT;           // partition starts at LBA 63 (cyl 0, head 1)
  const layout = (spc, f16) => {
    for (let spf = 1; ; spf++) {
      const clusters = Math.floor((psec - 1 - 2 * spf - 32) / spc);
      const need = f16 ? (clusters + 2) * 2 : Math.floor((clusters + 2) * 3 / 2);
      if (need <= spf * SECTOR) return { spf, clusters };
    }
  };
  // FAT12 while it stays below 4085 clusters, then FAT16 with MS-DOS
  // FORMAT's cluster sizes (fat12.py new_hd).
  let spc = 8, f16 = false, l;
  for (;;) {
    l = layout(spc, false);
    if (l.clusters < 4085) break;
    spc *= 2;
    if (spc > 16) { f16 = true; break; }
  }
  if (f16) {
    for (spc = 4; ; spc *= 2) {
      if (spc > 64) throw new Error("too big for FAT16");
      l = layout(spc, true);
      if (l.clusters >= 4085 && l.clusters < 65525) break;
    }
  }
  return {
    total, psec, f16,
    bpb: { bps: 512, spc, rsv: 1, nfat: 2, nroot: 512, total: psec, media: 0xF8,
           spf: l.spf, spt: HD_SPT, heads: HD_HEADS, hidden: HD_SPT, drive: 0x80 },
  };
}

// ---------------------------------------------------------------- writer

class Volume {
  constructor(buf, off, bpb, label, msg) {
    this.u8 = buf; this.dv = new DataView(buf.buffer, buf.byteOffset);
    this.off = off; this.b = bpb;
    this.csize = bpb.bps * bpb.spc;
    this.fatOff = off + bpb.rsv * bpb.bps;
    this.rootOff = off + (bpb.rsv + bpb.nfat * bpb.spf) * bpb.bps;
    this.dataOff = this.rootOff + bpb.nroot * 32;
    this.clusters = Math.floor((bpb.total * bpb.bps - (this.dataOff - off)) / this.csize);
    this.f16 = this.clusters >= 4085;    // the FAT type is decided by the cluster count alone
    this.next = 2;
    this.bootSector(label, msg);
  }

  bootSector(label, msg) {
    const { u8, dv, off, b } = this;
    u8.set([0xEB, 0x3C, 0x90], off);
    ascii(u8, off + 3, "MSDOS5.0", 8);
    dv.setUint16(off + 11, b.bps, true);
    u8[off + 13] = b.spc;
    dv.setUint16(off + 14, b.rsv, true);
    u8[off + 16] = b.nfat;
    dv.setUint16(off + 17, b.nroot, true);
    dv.setUint16(off + 19, b.total < 65536 ? b.total : 0, true);
    u8[off + 21] = b.media;
    dv.setUint16(off + 22, b.spf, true);
    dv.setUint16(off + 24, b.spt, true);
    dv.setUint16(off + 26, b.heads, true);
    dv.setUint32(off + 28, b.hidden || 0, true);
    dv.setUint32(off + 32, b.total >= 65536 ? b.total : 0, true);
    u8[off + 36] = b.drive || 0;
    u8[off + 38] = 0x29;
    dv.setUint32(off + 39, (Date.now() / 1000) >>> 0, true);
    ascii(u8, off + 43, (label || "NO NAME").toUpperCase(), 11);
    ascii(u8, off + 54, this.f16 ? "FAT16" : "FAT12", 8);
    u8.set(BOOT_CODE, off + 62);
    ascii(u8, off + 0x5A, msg, msg.length);
    u8[off + 510] = 0x55; u8[off + 511] = 0xAA;
    for (let k = 0; k < b.nfat; k++) {
      const f = this.fatOff + k * b.spf * b.bps;
      u8.set(this.f16 ? [b.media, 0xFF, 0xFF, 0xFF] : [b.media, 0xFF, 0xFF], f);
    }
  }

  setFat(c, v) {
    const { b, dv } = this;
    for (let k = 0; k < b.nfat; k++) {
      const base = this.fatOff + k * b.spf * b.bps;
      if (this.f16) { dv.setUint16(base + c * 2, v, true); continue; }
      const o = base + Math.floor(c * 3 / 2);
      const cur = dv.getUint16(o, true);
      dv.setUint16(o, c & 1 ? (cur & 0x000F) | (v << 4) : (cur & 0xF000) | v, true);
    }
  }

  // n contiguous clusters, chained, last one marked end-of-chain.
  alloc(n) {
    if (n === 0) return 0;
    const first = this.next;
    if (first + n > this.clusters + 2) throw new DiskFull();
    const eoc = this.f16 ? 0xFFFF : 0xFFF;
    for (let i = 0; i < n; i++) this.setFat(first + i, i + 1 < n ? first + i + 1 : eoc);
    this.next += n;
    return first;
  }

  clusterOff(c) { return this.dataOff + (c - 2) * this.csize; }

  freeBytes() { return (this.clusters + 2 - this.next) * this.csize; }
}

class DiskFull extends Error {
  constructor() { super("disk full"); this.code = "DISK_FULL"; }
}

function ascii(u8, off, s, len) {
  for (let i = 0; i < len; i++) {
    const ch = i < s.length ? s.charCodeAt(i) : 0x20;
    u8[off + i] = ch < 128 ? ch : 0x5F;
  }
}

function dosTime(mtime) {
  let d = mtime instanceof Date ? mtime : new Date(mtime ?? Date.now());
  if (isNaN(d) || d.getFullYear() < 1980) d = new Date(1980, 0, 1);
  if (d.getFullYear() > 2107) d = new Date(2107, 11, 31);
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

function writeEntry(vol, at, base, ext, attr, cluster, size, mtime) {
  const { u8, dv } = vol;
  ascii(u8, at, base, 8);
  ascii(u8, at + 8, ext, 3);
  u8[at + 11] = attr;
  const t = dosTime(mtime);
  dv.setUint16(at + 22, t.time, true);
  dv.setUint16(at + 24, t.date, true);
  dv.setUint16(at + 26, cluster, true);
  dv.setUint32(at + 28, size, true);
}

// Write the tree into the volume. The root directory is fixed-size; a
// subdirectory gets as many clusters as its entries need up front, so every
// directory and file is one contiguous run (DOS reads them fastest that way
// and nothing ever has to be grown).
function writeTree(vol, root, label) {
  const rootEntries = root.children.length + (label ? 1 : 0);
  if (rootEntries > vol.b.nroot)
    throw new Error(`too many entries in the root folder: ${rootEntries}, the most is ${vol.b.nroot}`);
  let slot = vol.rootOff;
  if (label) {
    writeEntry(vol, slot, label.toUpperCase().slice(0, 8), label.toUpperCase().slice(8, 11), 0x08, 0, 0, Date.now());
    slot += 32;
  }
  (function fill(node, firstSlot, selfCluster, parentCluster) {
    let s = firstSlot;
    if (selfCluster) {                                   // "." and ".."
      writeEntry(vol, s, ".", "", 0x10, selfCluster, 0, node.mtime); s += 32;
      writeEntry(vol, s, "..", "", 0x10, parentCluster, 0, node.mtime); s += 32;
    }
    for (const c of node.children) {
      if (c.dir) {
        const n = Math.max(1, Math.ceil((c.children.length + 2) * 32 / vol.csize));
        const cl = vol.alloc(n);
        vol.u8.fill(0, vol.clusterOff(cl), vol.clusterOff(cl) + n * vol.csize);
        writeEntry(vol, s, c.base, "", 0x10, cl, 0, c.mtime);
        fill(c, vol.clusterOff(cl), cl, selfCluster);
      } else {
        const n = Math.ceil(c.data.length / vol.csize);
        const cl = vol.alloc(n);
        if (n) vol.u8.set(c.data, vol.clusterOff(cl));
        writeEntry(vol, s, c.base, c.ext, 0x20, cl, c.data.length, c.mtime);
      }
      s += 32;
    }
  })(root, slot, 0, 0);
}

function mbrEntry(u8, dv, total, ptype) {
  const chs = (lba) => {
    let c = Math.floor(lba / (HD_HEADS * HD_SPT)), h = Math.floor(lba / HD_SPT) % HD_HEADS, s = lba % HD_SPT + 1;
    if (c > 1023) { c = 1023; h = HD_HEADS - 1; s = HD_SPT; }
    return [h, ((c >> 2) & 0xC0) | s, c & 0xFF];
  };
  u8.set(MBR_CODE, 0);
  u8.set([0x80, ...chs(HD_SPT), ptype, ...chs(total - 1)], 0x1BE);
  dv.setUint32(0x1BE + 8, HD_SPT, true);
  dv.setUint32(0x1BE + 12, total - HD_SPT, true);
  u8[510] = 0x55; u8[511] = 0xAA;
}

// Build the image. `layout` is { kind: "floppy", kb } or { kind: "hd", mb }
// (chooseLayout() picks one). Names must have been assigned (assignNames()).
// Returns { bytes: Uint8Array, desc, free, fat }.
export function makeImage(root, layout, label) {
  label = (label || "").toUpperCase().replace(/[^A-Z0-9 _\-]/g, "").slice(0, 11);
  if (layout.kind === "floppy") {
    const bpb = FLOPPIES[layout.kb];
    if (!bpb) throw new Error(`no floppy of ${layout.kb} KB`);
    const u8 = new Uint8Array(bpb.total * SECTOR);
    const vol = new Volume(u8, 0, bpb, label, FLOPPY_MSG);
    writeTree(vol, root, label);
    return { bytes: u8, kind: "floppy", kb: layout.kb, free: vol.freeBytes(), fat: "FAT12" };
  }
  const g = hdGeometry(layout.mb);
  const u8 = new Uint8Array(g.total * SECTOR);
  const dv = new DataView(u8.buffer);
  const vol = new Volume(u8, HD_SPT * SECTOR, g.bpb, label, HD_MSG);
  const ptype = !vol.f16 ? 0x01 : (g.psec < 65536 ? 0x04 : 0x06);
  mbrEntry(u8, dv, g.total, ptype);
  writeTree(vol, root, label);
  return { bytes: u8, kind: "hd", mb: Math.round(u8.length / (1 << 20)), free: vol.freeBytes(),
           fat: vol.f16 ? "FAT16" : "FAT12", ptype };
}

// Build with the smallest layout that fits, growing when the estimate was
// short (many tiny files in big clusters).
export function makeAuto(root, label, extraBytes = 0) {
  let layout = chooseLayout(root, extraBytes);
  for (;;) {
    try {
      return makeImage(root, layout, label);
    } catch (e) {
      if (e.code !== "DISK_FULL" && !/too many entries/.test(e.message)) throw e;
      if (layout.kind === "floppy" && layout.kb === 1440) layout = { kind: "floppy", kb: 2880 };
      else if (layout.kind === "floppy") layout = { kind: "hd", mb: 4 };
      else if (layout.mb < HD_MAX_MB) layout = { kind: "hd", mb: Math.min(HD_MAX_MB, Math.ceil(layout.mb * 1.25) + 1) };
      else throw e;
    }
  }
}

// A text file with DOS line ends.
export function dosText(lines) {
  return new TextEncoder().encode(lines.map((l) => l.replace(/[^\x20-\x7E]/g, "_")).join("\r\n") + "\r\n");
}
