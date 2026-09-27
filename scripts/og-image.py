#!/usr/bin/env python3
"""Generate public/og.png — the WhatsApp/Facebook share card for the landing page.

Why this exists: a link shared on WhatsApp with no og:image renders as a blank
card, and WhatsApp is how this product reaches its users. There is no image
toolchain in this project (no headless browser, no ImageMagick, no PIL), so the
card is drawn here: the same forest/amber palette and ledger grid as the hero,
typeset with a small built-in 5x7 face. Pure stdlib, deterministic output.

    python3 scripts/og-image.py
"""
import math
import os
import struct
import zlib

W, H = 1200, 630
BG = (0x00, 0x26, 0x1B)
AMBER = (0xEA, 0xB3, 0x08)
CREAM = (0xFD, 0xFC, 0xF7)
MUTED = (0x9C, 0xA3, 0xAF)

# 5x7 uppercase face, one string per row of pixels.
FONT = {
    'A': ('01110', '10001', '10001', '11111', '10001', '10001', '10001'),
    'B': ('11110', '10001', '11110', '10001', '10001', '10001', '11110'),
    'C': ('01111', '10000', '10000', '10000', '10000', '10000', '01111'),
    'D': ('11110', '10001', '10001', '10001', '10001', '10001', '11110'),
    'E': ('11111', '10000', '11110', '10000', '10000', '10000', '11111'),
    'F': ('11111', '10000', '11110', '10000', '10000', '10000', '10000'),
    'G': ('01111', '10000', '10000', '10011', '10001', '10001', '01110'),
    'H': ('10001', '10001', '11111', '10001', '10001', '10001', '10001'),
    'I': ('11111', '00100', '00100', '00100', '00100', '00100', '11111'),
    'J': ('00111', '00010', '00010', '00010', '00010', '10010', '01100'),
    'K': ('10001', '10010', '11100', '10100', '10010', '10010', '10001'),
    'L': ('10000', '10000', '10000', '10000', '10000', '10000', '11111'),
    'M': ('10001', '11011', '10101', '10101', '10001', '10001', '10001'),
    'N': ('10001', '11001', '10101', '10011', '10001', '10001', '10001'),
    'O': ('01110', '10001', '10001', '10001', '10001', '10001', '01110'),
    'P': ('11110', '10001', '10001', '11110', '10000', '10000', '10000'),
    'Q': ('01110', '10001', '10001', '10001', '10101', '10010', '01101'),
    'R': ('11110', '10001', '10001', '11110', '10100', '10010', '10001'),
    'S': ('01111', '10000', '10000', '01110', '00001', '00001', '11110'),
    'T': ('11111', '00100', '00100', '00100', '00100', '00100', '00100'),
    'U': ('10001', '10001', '10001', '10001', '10001', '10001', '01110'),
    'V': ('10001', '10001', '10001', '10001', '10001', '01010', '00100'),
    'W': ('10001', '10001', '10001', '10101', '10101', '11011', '10001'),
    'X': ('10001', '10001', '01010', '00100', '01010', '10001', '10001'),
    'Y': ('10001', '10001', '01010', '00100', '00100', '00100', '00100'),
    'Z': ('11111', '00001', '00010', '00100', '01000', '10000', '11111'),
    '0': ('01110', '10001', '10011', '10101', '11001', '10001', '01110'),
    '1': ('00100', '01100', '00100', '00100', '00100', '00100', '01110'),
    '2': ('01110', '10001', '00001', '00010', '00100', '01000', '11111'),
    '3': ('11111', '00010', '00100', '00010', '00001', '10001', '01110'),
    '4': ('00010', '00110', '01010', '10010', '11111', '00010', '00010'),
    '5': ('11111', '10000', '11110', '00001', '00001', '10001', '01110'),
    '6': ('00110', '01000', '10000', '11110', '10001', '10001', '01110'),
    '7': ('11111', '00001', '00010', '00100', '01000', '01000', '01000'),
    '8': ('01110', '10001', '10001', '01110', '10001', '10001', '01110'),
    '9': ('01110', '10001', '10001', '01111', '00001', '00010', '01100'),
    ' ': ('00000',) * 7,
    '.': ('00000', '00000', '00000', '00000', '00000', '01100', '01100'),
    ',': ('00000', '00000', '00000', '00000', '01100', '01100', '01000'),
    ':': ('00000', '01100', '01100', '00000', '01100', '01100', '00000'),
    '-': ('00000', '00000', '00000', '11111', '00000', '00000', '00000'),
    "'": ('01100', '01100', '01000', '00000', '00000', '00000', '00000'),
    '/': ('00001', '00010', '00010', '00100', '01000', '01000', '10000'),
    '+': ('00000', '00100', '00100', '11111', '00100', '00100', '00000'),
    '&': ('01100', '10010', '10100', '01000', '10101', '10010', '01101'),
    '%': ('11001', '11010', '00010', '00100', '01000', '01011', '10011'),
    '#': ('01010', '11111', '01010', '01010', '11111', '01010', '00000'),
    '!': ('00100', '00100', '00100', '00100', '00100', '00000', '00100'),
    '?': ('01110', '10001', '00001', '00010', '00100', '00000', '00100'),
}


def background(x, y):
    """The hero's own background: deep forest, a canopy glow, ledger lines."""
    cx, cy = W * 0.72, -H * 0.15
    d = math.hypot(x - cx, y - cy) / (W * 0.85)
    g = max(0.0, 1.0 - d) ** 1.8
    r = BG[0] + 24 * g
    gr = BG[1] + 104 * g
    b = BG[2] + 48 * g
    if y % 40 == 0 or x % 104 == 0:
        r, gr, b = r + 8, gr + 9, b + 8
    # a soft vignette so the corners settle
    v = math.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H / 2))
    fade = max(0.0, v - 0.75) * 46
    return (int(max(0, r - fade)), int(max(0, gr - fade)), int(max(0, b - fade)))


def text_width(text, scale, tracking=1):
    return (len(text) * 6 - 1) * scale + (len(text) - 1) * tracking


def draw_text(canvas, text, x, y, scale, colour, tracking=1):
    """Blit one line of uppercase text. No kerning: the face is monospaced."""
    cx = x
    for char in text.upper():
        glyph = FONT.get(char, FONT['?'])
        for row, bits in enumerate(glyph):
            for col, bit in enumerate(bits):
                if bit != '1':
                    continue
                for py in range(scale):
                    for px in range(scale):
                        tx, ty = cx + col * scale + px, y + row * scale + py
                        if 0 <= tx < W and 0 <= ty < H:
                            canvas[ty][tx] = colour
        cx += (6 * scale) + tracking
    return cx


def draw_rect(canvas, x0, y0, x1, y1, colour):
    for y in range(max(0, y0), min(H, y1)):
        for x in range(max(0, x0), min(W, x1)):
            canvas[y][x] = colour


def draw_rounded(canvas, x0, y0, size, radius, colour, cut=0):
    """A rounded square, in the same shape as the app's amber logo tile."""
    for y in range(y0, y0 + size):
        for x in range(x0, x0 + size):
            dx = min(x - x0, x0 + size - 1 - x)
            dy = min(y - y0, y0 + size - 1 - y)
            if dx < radius and dy < radius:
                if math.hypot(radius - dx, radius - dy) > radius + cut:
                    continue
            canvas[y][x] = colour


def main():
    canvas = [[background(x, y) for x in range(W)] for y in range(H)]

    # the app's mark: an amber tile with a dark open book, legible at 64px
    mark, mx, my = 64, 96, 188
    draw_rounded(canvas, mx, my, mark, 14, AMBER)
    dark = (0x00, 0x26, 0x1B)
    draw_rect(canvas, mx + 15, my + 20, mx + 29, my + 44, dark)   # left page
    draw_rect(canvas, mx + 35, my + 20, mx + 49, my + 44, dark)   # right page
    draw_rect(canvas, mx + 30, my + 27, mx + 34, my + 37, dark)   # spine

    left = mx + mark + 32
    draw_text(canvas, 'VSLA UG / UGANDA', left, my + 8, 5, AMBER, tracking=2)
    draw_text(canvas, 'VILLAGE SAVINGS, RECORDED', left, my + 52, 3, MUTED, tracking=2)

    # headline: the promise the product is bought for
    y = my + 96
    for line in ('EVERY MEMBER CAN', 'SEE THEIR SAVINGS.'):
        draw_text(canvas, line, left, y, 8, CREAM, tracking=2)
        y += 7 * 8 + 16

    draw_rect(canvas, left, y + 6, left + 88, y + 12, AMBER)
    draw_text(canvas, 'DIGITAL RECORD BOOK - WORKS OFFLINE', left, y + 36, 4, AMBER, tracking=2)

    # footer: the sentence that answers the real fear
    draw_rect(canvas, 0, H - 108, W, H, (0x00, 0x1F, 0x16))
    draw_rect(canvas, 0, H - 108, W, H - 106, (0x0E, 0x3A, 0x28))
    draw_text(canvas, 'YOUR GROUP KEEPS THE MONEY. WE KEEP THE RECORDS.', 96, H - 68, 3, CREAM, tracking=1)

    raw = bytearray()
    for row in canvas:
        raw.append(0)
        for px in row:
            raw.extend(px)

    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 2, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(bytes(raw), 9))
    png += chunk(b'IEND', b'')

    out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public', 'og.png')
    with open(out, 'wb') as handle:
        handle.write(png)
    print(f'wrote {out} ({len(png):,} bytes, {W}x{H})')


if __name__ == '__main__':
    main()
