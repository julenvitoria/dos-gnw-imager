#!/bin/bash
# Round-trip tests for js/fat.js, checked by an independent reader (mtools):
# build an image from a folder, read every file back with mcopy and compare.
# Needs node and mtools. Scratch goes to build/test (deleted at the end).
set -euo pipefail
cd "$(dirname "$0")/.."
W=build/test
rm -rf "$W"; mkdir -p "$W"
trap 'rm -rf "$W"' EXIT
fail=0

part_offset() {   # byte offset of the FAT volume: 0 for a floppy, LBA*512 for a hard disk
  python3 -c "
import struct,sys
b=open(sys.argv[1],'rb').read(512)
fl=b[0] in (0xEB,0xE9) and struct.unpack_from('<H',b,11)[0]==512
print(0 if fl else struct.unpack_from('<I',b,0x1C6)[0]*512)" "$1"
}

check() {  # check NAME SRC IMG -- every file of the image equals its source, and nothing is missing
  local name=$1 src=$2 img=$3 off; off=$(part_offset "$img")
  local back="$W/$name.back"; rm -rf "$back"; mkdir -p "$back"
  if ! mcopy -s -n -m -i "$img@@$off" '::*' "$back/" 2>"$W/err"; then
    echo "FAIL $name: mcopy: $(cat "$W/err")"; fail=1; return; fi
  local nsrc nback
  nsrc=$(find "$src" -type f | wc -l); nback=$(find "$back" -type f | wc -l)
  # names were made 8.3, so compare by content: the sorted checksums must match
  if [ "$(cd "$src" && find . -type f -exec md5sum {} + | cut -d' ' -f1 | sort)" != \
       "$(cd "$back" && find . -type f ! -name AUTOEXEC.BAT -exec md5sum {} + | cut -d' ' -f1 | sort)" ]; then
    echo "FAIL $name: contents differ ($nsrc source files, $nback read back)"; fail=1; return; fi
  minfo -i "$img@@$off" :: >/dev/null 2>"$W/err" || { echo "FAIL $name: minfo: $(cat "$W/err")"; fail=1; return; }
  python3 test/fatcheck.py "$img" > "$W/err" || { echo "FAIL $name: fatcheck:"; cat "$W/err"; fail=1; return; }
  echo "ok   $name: $nsrc files, $(stat -c %s "$img") bytes, $(mdir -i "$img@@$off" :: 2>/dev/null | tail -1 | xargs)"
}

mk() { node test/make-image.mjs "$@" > "$W/last.json"; }

# 1. a small game: floppy
mkdir -p "$W/small/GAME"
head -c 70000 /dev/urandom > "$W/small/GAME/GAME.EXE"
printf 'hello\r\n' > "$W/small/README.TXT"
mk "$W/small" "$W/small.img"; grep -q '"kind":"floppy","kb":1440' "$W/last.json" || { echo "FAIL small: $(cat $W/last.json)"; fail=1; }
check small "$W/small" "$W/small.img"

# 2. long names, accents, collisions, a deep tree, an empty folder, an empty file
S="$W/names"; mkdir -p "$S/Un juego largo/datos de nivel/sub carpeta" "$S/vacía"
for i in 1 2 3 4 5; do head -c $((i*1000)) /dev/urandom > "$S/Un juego largo/Fichero con nombre largo $i.dat"; done
head -c 500 /dev/urandom > "$S/Un juego largo/datos de nivel/sub carpeta/niveau été.bin"
: > "$S/EMPTY.TXT"
head -c 3000 /dev/urandom > "$S/a.b.c.d"
mk "$S" "$W/names.img"; check names "$S" "$W/names.img"

# 3. a subfolder with more entries than one cluster holds (>16 on a 1.44 floppy)
S="$W/many"; mkdir -p "$S/DATA"
for i in $(seq 1 150); do head -c $((RANDOM % 600 + 1)) /dev/urandom > "$S/DATA/F$i.DAT"; done
mk "$S" "$W/many.img"; check many "$S" "$W/many.img"

# 4. a 2.88 MB floppy
S="$W/mid"; mkdir -p "$S"; head -c 2000000 /dev/urandom > "$S/BIG.DAT"
mk "$S" "$W/mid.img"; grep -q '"kb":2880' "$W/last.json" || { echo "FAIL mid: $(cat $W/last.json)"; fail=1; }
check mid "$W/mid" "$W/mid.img"

# 5. hard disks: FAT12 (small) and FAT16 (> 4084 clusters), sizes across the 32 MB line
S="$W/hd"; mkdir -p "$S/GAME/SUB"
head -c 3500000 /dev/urandom > "$S/GAME/DATA.BIN"
for i in $(seq 1 40); do head -c 9000 /dev/urandom > "$S/GAME/SUB/S$i.DAT"; done
for mb in auto 8 20 40 120; do
  if [ $mb = auto ]; then mk "$S" "$W/hd_$mb.img"; else mk "$S" "$W/hd_$mb.img" --hd $mb; fi
  check "hd_$mb($(python3 -c "import json;d=json.load(open('$W/last.json'));print(d['fat'],hex(d['ptype']))"))" "$S" "$W/hd_$mb.img"
done

# 6. the hard disk's MBR and BPB agree with what the cores expect
python3 - "$W/hd_40.img" <<'EOF' || fail=1
import struct, sys
b = open(sys.argv[1], 'rb').read()
st, ptype, lba, cnt = b[0x1BE], b[0x1C2], *struct.unpack_from('<II', b, 0x1C6)
assert st == 0x80 and lba == 63 and b[510:512] == b'\x55\xaa', (st, lba)
assert (lba + cnt) * 512 == len(b), "partition must end at the disk end"
assert len(b) % (16 * 63 * 512) == 0, "whole cylinders"
v = b[lba * 512:]
bps, spc, rsv, nfat, nroot, tot16, media, spf, spt, heads, hidden, tot32 = struct.unpack_from('<HBHBHHBHHHII', v, 11)
assert (bps, rsv, nfat, nroot, media, spt, heads, hidden) == (512, 1, 2, 512, 0xF8, 63, 16, 63)
assert (tot16 or tot32) == cnt and ptype in (1, 4, 6)
print("ok   hd_40 MBR/BPB: type 0x%02X, %d sectors, %d per cluster" % (ptype, cnt, spc))
EOF

# 7. the same game made by make_dsk.py-sized auto layout reads in mtools AND fat12.py
if [ -f ../dosxt-retro-go-sd/tools/fat12.py ]; then
  python3 ../dosxt-retro-go-sd/tools/fat12.py ls "$W/hd_auto.img" >/dev/null && echo "ok   fat12.py reads hd_auto" || { echo "FAIL fat12.py ls"; fail=1; }
  python3 ../dosxt-retro-go-sd/tools/fat12.py ls "$W/small.img" >/dev/null && echo "ok   fat12.py reads small" || { echo "FAIL fat12.py ls small"; fail=1; }
fi

[ $fail = 0 ] && echo "ALL OK" || { echo "SOME TESTS FAILED"; exit 1; }
