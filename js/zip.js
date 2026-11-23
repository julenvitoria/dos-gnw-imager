// .zip reading and writing with no library: the browser's own
// DecompressionStream("deflate-raw") inflates, and the archives this page
// writes are "stored" (a disk image barely compresses, and storing keeps a
// 100 MB download instant).

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(u8) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

export class ZipError extends Error {
  constructor(code, detail) { super(detail || code); this.code = code; }
}

// DOS date/time of a zip entry -> Date (local time, as zip tools write it).
function dosDate(time, date) {
  return new Date(1980 + (date >> 9), ((date >> 5) & 15) - 1, date & 31,
                  time >> 11, (time >> 5) & 63, (time & 31) * 2);
}

const CP437_HI = "ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ";
function decodeName(bytes, utf8) {
  if (utf8) return new TextDecoder("utf-8").decode(bytes);
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { /* cp437 */ }
  let s = "";
  for (const b of bytes) s += b < 128 ? String.fromCharCode(b) : CP437_HI[b - 128];
  return s;
}

async function inflateRaw(u8) {
  if (typeof DecompressionStream === "undefined") throw new ZipError("NO_INFLATE");
  const ds = new DecompressionStream("deflate-raw");
  const out = new Response(new Blob([u8]).stream().pipeThrough(ds));
  return new Uint8Array(await out.arrayBuffer());
}

// Read a whole .zip (ArrayBuffer). Returns [{ path, dir, data, mtime }].
// onProgress(done, total) is called as entries are inflated.
export async function readZip(buf, onProgress) {
  const u8 = new Uint8Array(buf), dv = new DataView(buf);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 22 - 65535); i--) {
    if (dv.getUint32(i, true) === 0x06054B50) { eocd = i; break; }
  }
  if (eocd < 0) throw new ZipError("NOT_ZIP");
  let count = dv.getUint16(eocd + 10, true);
  let cd = dv.getUint32(eocd + 16, true);
  if (count === 0xFFFF || cd === 0xFFFFFFFF) throw new ZipError("ZIP64");
  const out = [];
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(cd, true) !== 0x02014B50) throw new ZipError("BAD_ZIP");
    const flags = dv.getUint16(cd + 8, true);
    const method = dv.getUint16(cd + 10, true);
    const time = dv.getUint16(cd + 12, true), date = dv.getUint16(cd + 14, true);
    const csize = dv.getUint32(cd + 20, true), usize = dv.getUint32(cd + 24, true);
    const nlen = dv.getUint16(cd + 28, true), xlen = dv.getUint16(cd + 30, true), clen = dv.getUint16(cd + 32, true);
    const local = dv.getUint32(cd + 42, true);
    const path = decodeName(u8.subarray(cd + 46, cd + 46 + nlen), flags & 0x800);
    cd += 46 + nlen + xlen + clen;
    if (csize === 0xFFFFFFFF || usize === 0xFFFFFFFF || local === 0xFFFFFFFF) throw new ZipError("ZIP64");
    const mtime = dosDate(time, date);
    if (path.endsWith("/") || path.endsWith("\\")) { out.push({ path, dir: true, mtime }); continue; }
    if (flags & 1) throw new ZipError("ENCRYPTED", path);
    if (dv.getUint32(local, true) !== 0x04034B50) throw new ZipError("BAD_ZIP");
    const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
    const raw = u8.subarray(start, start + csize);
    let data;
    if (method === 0) data = raw.slice();
    else if (method === 8) data = await inflateRaw(raw);
    else throw new ZipError("METHOD", `${path} (${method})`);
    if (data.length !== usize) throw new ZipError("BAD_ZIP", path);
    out.push({ path, data, mtime });
    if (onProgress) onProgress(n + 1, count);
  }
  return out;
}

// Write a stored .zip. files: [{ path, data }] -> Blob.
export function writeZip(files) {
  const enc = new TextEncoder();
  const parts = [], central = [];
  let offset = 0;
  const now = new Date();
  const t = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const d = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  for (const f of files) {
    const name = enc.encode(f.path);
    const crc = crc32(f.data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034B50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x800, true);
    lh.setUint16(8, 0, true); lh.setUint16(10, t, true); lh.setUint16(12, d, true);
    lh.setUint32(14, crc, true); lh.setUint32(18, f.data.length, true); lh.setUint32(22, f.data.length, true);
    lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    parts.push(lh, name, f.data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014B50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
    ch.setUint16(8, 0x800, true); ch.setUint16(10, 0, true); ch.setUint16(12, t, true); ch.setUint16(14, d, true);
    ch.setUint32(16, crc, true); ch.setUint32(20, f.data.length, true); ch.setUint32(24, f.data.length, true);
    ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
    central.push(ch, name);
    offset += 30 + name.length + f.data.length;
  }
  const cdSize = central.reduce((s, p) => s + p.byteLength, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054B50, true);
  end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end], { type: "application/zip" });
}
