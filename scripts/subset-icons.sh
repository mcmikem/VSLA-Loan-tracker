#!/bin/bash
# Regenerate public/fonts/material-symbols.woff2 after ADDING a new icon.
# The app self-hosts a ~14KB subset (was 3.9MB from Google Fonts).
# Any icon name NOT in the subset renders as plain text (e.g. the word "home").
set -e
cd "$(dirname "$0")/.."

FULL=/tmp/ms-full.woff2
PARTIAL=/tmp/ms-partial.ttf
KEEP=/tmp/keep.txt

echo "1/4 downloading full variable font..."
curl -s -o "$FULL" "https://fonts.gstatic.com/s/materialsymbolsoutlined/v373/kJEhBvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oFsI.woff2"

echo "2/4 collecting icon names used in src/ and the root HTML pages..."
python3 -c "
import re, pathlib
pat = re.compile(r'material-symbols-outlined[\"\']?[^>]*>(.{0,200}?)</', re.S)
pat2 = re.compile(r'class=\"ms[^\"]*\"[^>]*>\s*([A-Za-z0-9_]+)\s*<')  # landing page: <span class=\"ms w-5 h-5\">name</span>
pat3 = re.compile(r'[{\s]icon:\s*\'([A-Za-z0-9_]+)\'')
files = list(pathlib.Path('src').rglob('*.tsx')) + list(pathlib.Path('src').rglob('*.ts')) + list(pathlib.Path('.').glob('*.html'))
names = set()
for f in files:
    t = f.read_text()
    for m in pat.finditer(t):
        body = m.group(1)
        # literal text node: <span class=...>home</span>
        m2 = re.match(r'\s*([A-Za-z0-9_]+)\s*\$', body)
        if m2 and not m2.group(1).startswith('{'):
            names.add(m2.group(1))
        # ternary picks: <span class=...>{playing ? 'stop_circle' : 'volume_up'}</span>
        for a, b in re.findall(r'\?\s*\'([a-z][a-z0-9_]*)\'\s*:\s*(?:\'([a-z][a-z0-9_]*)\'|[a-zA-Z0-9_.]+)', body):
            names.add(a)
            if b:
                names.add(b)
    for m in pat2.finditer(t):  # landing page icons
        names.add(m.group(1))
    for m in pat3.finditer(t):  # data-driven icons like {f.icon}
        names.add(m.group(1))
open('$KEEP','w').write(' '.join(sorted(names)) + ' abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_. -')
print(len(names), 'icons')
"

echo "3/4 instantiating opsz/wght/GRAD (keeping FILL for active-tab icons)..."
python3 -c "
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
f = TTFont('$FULL')
instantiateVariableFont(f, {'opsz': 24, 'wght': 400, 'GRAD': 0}, inplace=True, updateFontNames=True)
f.save('$PARTIAL')
"

echo "4/4 subsetting to used ligatures (rlig feature)..."
python3 -c "
from fontTools.ttLib import TTFont
f = TTFont('$PARTIAL')
names = open('$KEEP').read().split()
# keep.txt is icon names then ASCII padding; padding is the mixed-case token
icons = []
for tok in names:
    if tok != tok.lower():
        break
    icons.append(tok)
cmap = f.getBestCmap()
lig_map = {}
for lookup in f['GSUB'].table.LookupList.Lookup:
    for sub in lookup.SubTable:
        target = getattr(sub, 'ExtSubTable', sub)
        for first, ligs in getattr(target, 'ligatures', {}).items():
            for lig in ligs:
                lig_map[tuple([first] + list(lig.Component))] = lig.LigGlyph
unknown = []
gids = set()
for n in icons:
    seq = tuple(cmap[ord(c)] for c in n)
    if seq not in lig_map:
        unknown.append(n)
        continue
    gids.add(f.getGlyphID(lig_map[seq]))
if unknown:
    print('WARNING not in Material Symbols font:', ' '.join(unknown))
gids = sorted(gids)
open('/tmp/lig_gids.txt','w').write(','.join(map(str, gids)))
"
# shellcheck disable=SC2046
pyftsubset "$PARTIAL" --output-file=public/fonts/material-symbols.woff2 \
  --flavor=woff2 --unicodes="U+0020-007E" --gids="$(cat /tmp/lig_gids.txt)" \
  --no-layout-closure --layout-features='rlig' --no-hinting --desubroutinize

echo "5/5 verifying every used icon survived..."
python3 -c "
from fontTools.ttLib import TTFont
icons = []
for tok in open('$KEEP').read().split():
    if tok != tok.lower():
        break
    icons.append(tok)
f = TTFont('public/fonts/material-symbols.woff2')
cmap = f.getBestCmap()
lig_map = {}
for lookup in f['GSUB'].table.LookupList.Lookup:
    for sub in lookup.SubTable:
        target = getattr(sub, 'ExtSubTable', sub)
        for first, ligs in getattr(target, 'ligatures', {}).items():
            for lig in ligs:
                lig_map[tuple([first] + list(lig.Component))] = lig.LigGlyph
missing = [n for n in icons if tuple(cmap[ord(c)] for c in n) not in lig_map]
assert not missing, 'MISSING ICONS: ' + str(missing)
print(len(icons), 'icons verified in subset')
"
ls -la public/fonts/
