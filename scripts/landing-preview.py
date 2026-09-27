#!/usr/bin/env python3
"""Build a self-contained copy of the landing page so it can be looked at.

No headless browser is available in this environment, but macOS Quick Look
renders HTML with WebKit, so inlining the compiled stylesheet and the icon
subset into a throwaway copy lets us screenshot the real layout — spacing,
alignment, overflow — instead of guessing at the markup.

    python3 scripts/landing-preview.py [width]
    bash  scripts/landing-preview.sh            # wrapper, then Quick Look

Writes /tmp/vsla-landing-preview/index.html (open or screenshot it).
"""
import base64
import glob
import os
import re
import sys
from pathlib import Path

WIDTH = int(sys.argv[1]) if len(sys.argv) > 1 else 1280
H = int(sys.argv[2]) if len(sys.argv) > 2 else 2600
OUT = Path('/tmp/vsla-landing-preview')
OUT.mkdir(parents=True, exist_ok=True)

css_file = sorted(glob.glob('dist/assets/index-*.css'), key=lambda p: Path(p).stat().st_mtime)[-1]
html = Path('index.html').read_text()
sheet = Path(css_file).read_text()

# the icon subset, inlined so icons are icons and not their own names
font = glob.glob('public/fonts/material-symbols.woff2')[0]
b64 = base64.b64encode(Path(font).read_bytes()).decode()
sheet = sheet.replace("url('/fonts/material-symbols.woff2')", f"url('data:font/woff2;base64,{b64}')")

# the brand mark is served from the root, which Quick Look cannot resolve
import base64 as _b64
icon = _b64.b64encode(Path('public/icon.svg').read_bytes()).decode()
html = html.replace('src="/icon.svg"', f'src="data:image/svg+xml;base64,{icon}"')
# hide the icon glyphs: without the subset font they render as their own names,
# which is noise when judging spacing
html = html.replace('</head>', '<style>.ms{font-size:0!important;width:1em;height:1em;display:inline-block;overflow:hidden}</style></head>')
# SECTION=n renders just the nth block of the page, so each part of a long
# landing page can actually be looked at on its own.
only = os.environ.get('SECTION')
if only:
    keep = int(only)
    html = html.replace('</head>', f'''<style>
    main>section{{display:none!important}}
    main>section:nth-of-type({keep}){{display:block!important}}
    body>header,body>footer{{display:none!important}}
    </style></head>''')
if os.environ.get('PROBE'):
    # show where the containers actually are, and where the page really ends
    html = html.replace('</head>', '<style>'
      '.shell{background:rgba(255,0,0,.07)!important;outline:1px solid rgba(255,0,0,.45)!important}'
      'body::after{content:"";position:fixed;left:0;top:0;bottom:0;width:2px;background:#0af;z-index:99}'
      '</style></head>')
html = html.replace('<link rel="stylesheet" href="/src/landing.css">', f'<style>{sheet}</style>')
html = re.sub(r'<link href="https://fonts\.googleapis\.com[^>]*>', '', html)
# Quick Look takes a single frame, so nothing may be caught mid-animation
html = html.replace('</head>', '<style>.reveal,.rv{opacity:1!important;transform:none!important;animation:none!important}.float{animation:none!important}.tabpanel{opacity:1!important;animation:none!important;transform:none!important}</style></head>')
# review it in its no-JS state, which is also how a crawler and a JS-blocked
# visitor see it
html = html.replace("document.addEventListener('DOMContentLoaded'", "if(0)document.addEventListener('DOMContentLoaded'")

# Quick Look renders at its own viewport width, so a phone layout has to be
# asked for inside a frame that is actually phone-wide.
if WIDTH < 900:
    page = html
    html = (
        '<!doctype html><html><head><meta charset="utf-8"><style>'
        'body{margin:0;background:#888;display:flex;justify-content:center}'
        f'iframe{{width:{WIDTH}px;height:{H}px;border:0;background:#fff}}'
        '</style></head><body>'
        f'<iframe srcdoc="{page.replace(chr(34), "&quot;")}"></iframe>'
        '</body></html>'
    )

(OUT / 'index.html').write_text(html)
print(f'{OUT / "index.html"} written with {css_file} (target width {WIDTH}px)')
