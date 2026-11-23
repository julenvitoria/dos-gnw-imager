#!/usr/bin/env python3
"""Consistency check of a FAT12/FAT16 image (floppy or partitioned), the part
of fsck.fat that matters here: both FAT copies equal, every chain ends, no
cluster in two chains, no allocated cluster that nothing reaches, every file's
chain long enough for its size, "." and ".." right. Exit 1 on any problem."""
import struct, sys

def main(path):
    b = open(path, "rb").read()
    fl = b[0] in (0xEB, 0xE9) and struct.unpack_from("<H", b, 11)[0] == 512
    off = 0 if fl else struct.unpack_from("<I", b, 0x1C6)[0] * 512
    v = b[off:]
    bps, spc, rsv, nfat, nroot, t16, media, spf = struct.unpack_from("<HBHBHHBH", v, 11)
    tot = t16 or struct.unpack_from("<I", v, 32)[0]
    root = (rsv + nfat * spf) * bps
    data = root + nroot * 32
    ncl = (tot * bps - data) // (bps * spc)
    f16 = ncl >= 4085
    fat = v[rsv * bps:(rsv + spf) * bps]
    errs = []
    for k in range(1, nfat):
        if v[(rsv + k * spf) * bps:(rsv + (k + 1) * spf) * bps] != fat:
            errs.append("FAT copy %d differs" % k)
    def nxt(c):
        if f16: return struct.unpack_from("<H", fat, c * 2)[0]
        w = struct.unpack_from("<H", fat, c * 3 // 2)[0]
        return w >> 4 if c & 1 else w & 0xFFF
    end = 0xFFF8 if f16 else 0xFF8
    owner = {}
    csize = bps * spc
    def chain(c, who):
        out = []
        while True:
            if not (2 <= c < ncl + 2): errs.append("%s: bad cluster %#x" % (who, c)); break
            if c in owner: errs.append("%s: cluster %d also in %s" % (who, c, owner[c])); break
            owner[c] = who; out.append(c)
            n = nxt(c)
            if n >= end: break
            if n == 0: errs.append("%s: chain hits a free cluster" % who); break
            c = n
        return out
    def walk(slots, who_dir, self_c, parent_c):
        names = set()
        for i, so in enumerate(slots):
            e = v[so:so + 32]
            if e[0] == 0: break
            if e[0] == 0xE5 or e[11] == 0x0F: continue
            name = e[0:11].decode("cp437")
            clus, size = struct.unpack_from("<HI", e, 26)
            if e[11] & 0x08: continue
            if name.startswith(". ") or name.startswith(".."):
                want = self_c if name.startswith(". ") else parent_c
                if clus != want: errs.append("%s: '%s' points to %d, want %d" % (who_dir, name.strip(), clus, want))
                continue
            if name in names: errs.append("%s: duplicate %s" % (who_dir, name))
            names.add(name)
            who = who_dir + "\\" + name.strip()
            if e[11] & 0x10:
                cl = chain(clus, who)
                walk([data + (c - 2) * csize + j * 32 for c in cl for j in range(csize // 32)], who, clus, self_c)
            elif size:
                cl = chain(clus, who)
                if len(cl) * csize < size or (len(cl) - 1) * csize >= size:
                    errs.append("%s: %d clusters for %d bytes" % (who, len(cl), size))
            elif clus:
                errs.append("%s: empty file with a cluster" % who)
    walk([root + i * 32 for i in range(nroot)], "", 0, 0)
    lost = [c for c in range(2, ncl + 2) if nxt(c) != 0 and c not in owner]
    if lost: errs.append("%d allocated clusters reached by nothing" % len(lost))
    for e in errs[:20]: print("  " + e)
    print("%s: %s, %d clusters of %d B, %d used, %s" % (path, "FAT16" if f16 else "FAT12", ncl, csize,
                                                        len(owner), "OK" if not errs else "%d ERRORS" % len(errs)))
    return 1 if errs else 0

if __name__ == "__main__":
    sys.exit(max(main(p) for p in sys.argv[1:]))
