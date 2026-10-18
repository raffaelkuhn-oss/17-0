#!/usr/bin/env python3
"""Bake the glyph atlas for the per-run preview image (src/lib/og/*).

The Worker composes 1200x630 previews from pre-rasterised glyphs instead of running a
font rasteriser per request (keeps render CPU inside the Workers Free 10 ms budget).
Fonts: Noto Sans Bold/Regular (SIL OFL 1.1, scripts/og-fonts/OFL.txt), subset to Latin + Latin Ext-A.
Run: python3 scripts/gen-og-atlas.py   (needs Pillow). Writes src/assets/og/atlas.json + atlas.bin.
"""
import json, os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = {"bold": "scripts/og-fonts/NotoSans-Bold.ttf", "regular": "scripts/og-fonts/NotoSans-Regular.ttf"}
FULL = "".join(chr(c) for c in list(range(0x20, 0x7F)) + list(range(0xA0, 0x180))) + "·…–—’"
# style name -> (font, px size, charset). Sizes match src/lib/og/run-image.ts.
STYLES = {
    "record": ("bold", 132, "0123456789-WDL "),  # "-" for "17-0"; W, D, L and space for "11W 0D 1L"
    "kicker": ("bold", 26, FULL),
    "stats": ("regular", 26, FULL),
    "square": ("bold", 22, "WDL"),
    "role": ("bold", 17, FULL),
    "name": ("bold", 22, FULL),
    "rating": ("bold", 20, "0123456789"),
    "cta": ("regular", 24, FULL),
    "url": ("bold", 30, FULL),
}

meta = {"styles": {}}
blob = bytearray()
for name, (fk, size, chars) in STYLES.items():
    font = ImageFont.truetype(os.path.join(ROOT, FONTS[fk]), size)
    glyphs = {}
    for ch in dict.fromkeys(chars):
        adv = round(font.getlength(ch), 2)
        l, t, r, b = font.getbbox(ch, anchor="ls")
        w, h = max(0, r - l), max(0, b - t)
        off = len(blob)
        if w and h:
            img = Image.new("L", (w, h), 0)
            ImageDraw.Draw(img).text((-l, -t), ch, font=font, fill=255, anchor="ls")
            blob += img.tobytes()
        glyphs[ch] = [w, h, l, t, adv, off]
    meta["styles"][name] = {"size": size, "glyphs": glyphs}

os.makedirs(os.path.join(ROOT, "src/assets/og"), exist_ok=True)
with open(os.path.join(ROOT, "src/assets/og/atlas.bin"), "wb") as f:
    f.write(blob)
with open(os.path.join(ROOT, "src/assets/og/atlas.json"), "w") as f:
    json.dump(meta, f, ensure_ascii=False, separators=(",", ":"))
print(f"atlas.bin {len(blob)} bytes, atlas.json {os.path.getsize(os.path.join(ROOT, 'src/assets/og/atlas.json'))} bytes")
