#!/usr/bin/env python3
"""Regenerates src/assets/fonts/inter-latin-var.woff2 (self-hosted Inter, SIL OFL 1.1, see Inter-OFL.txt).

Source: google/fonts ofl/inter/Inter[opsz,wght].ttf (the same family Google Fonts served before).
- opsz pinned to 14 (the default Google serves for a wght-only request), wght kept variable 400-900
  (the site uses 400, 500, 600, 700, 900).
- Subset: Basic Latin, Latin-1, Latin Extended-A (every player and club name, incl. Č, ć, ě, ł, ő…)
  plus the punctuation the UI uses (– — ’ “ ” … · → − ≈ ▲ ▼ •). Emoji are not in Inter anyway.
Needs: pip install fonttools brotli. Usage: python3 scripts/gen-inter-subset.py path/to/Inter[opsz,wght].ttf
If the output changes, update the fallback metrics in src/styles.css only if the source font changes.
"""
import sys
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

src = sys.argv[1]
font = instancer.instantiateVariableFont(TTFont(src), {"opsz": 14, "wght": (400, 900)})
uni = list(range(0x20, 0x7F)) + list(range(0xA0, 0x180)) + [ord(c) for c in "–—‘’‚“”„…→←↑↓−≈▲▼•·€™Σ‹›′″"]
opts = subset.Options()
opts.flavor = "woff2"
opts.layout_features = ["kern", "liga", "calt", "ccmp", "locl", "mark", "mkmk", "tnum", "case"]
opts.name_IDs = ["*"]
opts.notdef_outline = True
opts.desubroutinize = True
s = subset.Subsetter(opts)
s.populate(unicodes=uni)
s.subset(font)
font.flavor = "woff2"
font.save("src/assets/fonts/inter-latin-var.woff2")
print("wrote src/assets/fonts/inter-latin-var.woff2")
