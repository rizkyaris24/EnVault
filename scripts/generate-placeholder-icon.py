#!/usr/bin/env python3
"""Generates build-resources/icon.png (1024) and icon.icns: a PLACEHOLDER app icon (ink rounded square, keyhole).
Replace build-resources/icon.icns with the real icon before a public release. macOS only (uses sips and iconutil)."""
import math, os, struct, subprocess, tempfile, zlib

N = 1024
OUT = os.path.join(os.path.dirname(__file__), '..', 'build-resources')
INK = (11, 11, 12)
PAPER = (250, 250, 250)

def sd_round_rect(px, py, cx, cy, hw, hh, r):
    qx, qy = abs(px - cx) - (hw - r), abs(py - cy) - (hh - r)
    return math.hypot(max(qx, 0), max(qy, 0)) + min(max(qx, qy), 0) - r

def sd_circle(px, py, cx, cy, r):
    return math.hypot(px - cx, py - cy) - r

def sd_box(px, py, cx, cy, hw, hh):
    qx, qy = abs(px - cx) - hw, abs(py - cy) - hh
    return math.hypot(max(qx, 0), max(qy, 0)) + min(max(qx, qy), 0)

def cover(d):  # 1px anti-aliased edge
    return min(1.0, max(0.0, 0.5 - d))

rows = []
for y in range(N):
    row = bytearray([0])
    for x in range(N):
        px, py = x + 0.5, y + 0.5
        a_bg = cover(sd_round_rect(px, py, 512, 512, 412, 412, 186))
        key = min(sd_circle(px, py, 512, 448, 92), sd_box(px, py, 512, 600, 40, 120))
        a_key = cover(key)
        r = INK[0] * (1 - a_key) + PAPER[0] * a_key
        g = INK[1] * (1 - a_key) + PAPER[1] * a_key
        b = INK[2] * (1 - a_key) + PAPER[2] * a_key
        row += bytes((int(r), int(g), int(b), int(255 * a_bg)))
    rows.append(bytes(row))

raw = b''.join(rows)
def chunk(t, d):
    c = struct.pack('>I', len(d)) + t + d
    return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', N, N, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')

os.makedirs(OUT, exist_ok=True)
base = os.path.join(OUT, 'icon.png')
open(base, 'wb').write(png)

with tempfile.TemporaryDirectory() as tmp:
    iconset = os.path.join(tmp, 'icon.iconset')
    os.makedirs(iconset)
    for size in (16, 32, 128, 256, 512):
        for scale in (1, 2):
            px = size * scale
            name = f'icon_{size}x{size}{"@2x" if scale == 2 else ""}.png'
            subprocess.run(['sips', '-z', str(px), str(px), base, '--out', os.path.join(iconset, name)], check=True, capture_output=True)
    subprocess.run(['iconutil', '-c', 'icns', iconset, '-o', os.path.join(OUT, 'icon.icns')], check=True)
print('wrote', base, 'and icon.icns')
