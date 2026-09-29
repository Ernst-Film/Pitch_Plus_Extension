#!/usr/bin/env python3
"""Concatenate extension/lib modules into one plain script for pasting into DevTools/JS tool."""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent / 'extension' / 'lib'
order = ['geometry.js', 'pitch-dom.js', 'frames.js', 'insert.js', 'timeline.js', 'ui.js']
out = []
for name in order:
    src = (root / name).read_text()
    names = re.findall(r'^export (?:async function|function|const) (\w+)', src, re.M)
    src = re.sub(r'^import .*?;\n', '', src, flags=re.M)
    src = re.sub(r'^export (async function|function|const) ', r'\1 ', src, flags=re.M)
    alias = name.replace('.js', '').replace('-', '_')
    extra = '\nconst dom = pitch_dom;' if name == 'pitch-dom.js' else ''
    out.append(f'// ---- {name}\n{src}\nconst {alias} = {{{", ".join(names)}}};{extra}\n')
print('(async () => {\n' + '\n'.join(out) + '\nwindow.__previs = {geometry, pitch_dom, frames, insert, timeline, ui};\n})();')
