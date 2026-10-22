#!/usr/bin/env python3
"""Builds specs/sheets.json (contact sheets + composites) from catalogue/*.json. Run, then render with render.mts."""
import json, glob, os, sys
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOX = {'S': 60, 'M': 96, 'L': 160}
props = []
for f in sorted(glob.glob(f'{S}/catalogue/batch-*.json')):
    props += json.load(open(f))
order = ['food-drink', 'kitchen', 'office', 'tech', 'travel', 'nature', 'clothing', 'furniture', 'festival']
props.sort(key=lambda p: (order.index(p['category']) if p['category'] in order else 99))
by = {p['id']: p for p in props}
specs = []

def sheet(file, title, sub, cells, cw=150, ch=180, cols=8, scale=2):
    rows = (len(cells) + cols - 1) // cols
    specs.append({'file': f'sheets/{file}', 'fn': 's_sheet', 'w': 20 + cw * cols, 'h': 64 + ch * rows + 10,
                  'o': {'title': title, 'sub': sub, 'cells': cells, 'cw': cw, 'ch': ch, 'cols': cols}, 'pad': 0, 'scale': scale, 'lint': False})

existing = [('mug', {'fam': 'desk', 'kind': 'mug', 'stage': 1}), ('stapler', {'fam': 'desk', 'kind': 'stapler', 'stage': 1}),
            ('headphones', {'fam': 'desk', 'kind': 'headphones', 'stage': 1}), ('notes', {'fam': 'desk', 'kind': 'notes', 'stage': 2}),
            ('jar', {'fam': 'jar', 'stage': 2}), ('plant', {'fam': 'plant', 'stage': 2}), ('mail', {'fam': 'mail', 'stage': 1}), ('seed packet', {'fam': 'seed', 'stage': 0})]
ex_cells = [{'fn': 's_obj', 'w': 60, 'h': 80, 'o': {'t': 0, **o}, 'label': n, 'sub': 'EXISTING', 'tag': 'existing'} for n, o in existing]
new_cells = [{'fn': 's_prop', 'w': BOX[p['size']], 'h': BOX[p['size']], 'o': {'id': p['id'], 't': 0}, 'label': p['word'], 'sub': f"{p['vi']} · {p['size']}"} for p in props]
sheet('props-vs-existing.png', 'Catalogue props next to the existing burrow objects',
      'Top row: existing @yapling/art objects (grey cards). Below: the 30 spike props by category, each at its nominal box. Rendered by the app renderer on CanvasKit.',
      ex_cells + new_cells, cw=150, ch=170, cols=8)
# same scale sheet: every prop at true relative size (1 unit = 1 pt) to judge line weight consistency
true_cells = [{'fn': 's_obj', 'w': 60, 'h': 80, 'o': {'t': 0, **existing[0][1]}, 'label': 'mug (existing)', 'tag': 'existing'}]
var_cells = []
for p in props:
    vs = (p.get('variants') or {}).get('v') or []
    for v in vs[:4]:
        var_cells.append({'fn': 's_prop', 'w': BOX[p['size']], 'h': BOX[p['size']], 'o': {'id': p['id'], 'v': v, 't': 0}, 'label': p['id'], 'sub': f'v={v}'})
    for k in ('season', 'tod'):
        for v in ((p.get('variants') or {}).get(k) or [])[:2]:
            var_cells.append({'fn': 's_prop', 'w': BOX[p['size']], 'h': BOX[p['size']], 'o': {'id': p['id'], k: v, 't': 0}, 'label': p['id'], 'sub': f'{k}={v}'})
sheet('prop-variants.png', 'Variants: one generator, many catalogue entries', f'{len(var_cells)} variant renders from {len(props)} generators (colour v, season, time of day).', var_cells, cw=130, ch=150, cols=10)

# scenes
scenes = ['market', 'park', 'platform']
sc_cells = [{'fn': 's_cafe', 'w': 390, 'h': 844, 'o': {'t': 0}, 'label': 'café', 'sub': 'EXISTING', 'tag': 'existing'},
            {'fn': 's_burrow2', 'w': 390, 'h': 844, 'o': {'t': 0}, 'label': 'burrow', 'sub': 'EXISTING', 'tag': 'existing'},
            {'fn': 's_street', 'w': 390, 'h': 844, 'o': {'t': 0}, 'label': 'street', 'sub': 'EXISTING', 'tag': 'existing'}]
sc_cells += [{'fn': 's_place', 'w': 390, 'h': 844, 'o': {'scene': s, 'props': [], 'so': {'t': 0}}, 'label': s, 'sub': 'NEW (agent), back + front layer'} for s in scenes]
sheet('scenes-vs-existing.png', 'New scenes next to the existing café, burrow and street', 'Grey cards: existing. White: agent-made, default variant.', sc_cells, cw=230, ch=470, cols=6, scale=2)
if os.path.exists(f'{S}/specs/scenes.json'):
    sv = [x for x in json.load(open(f'{S}/specs/scenes.json')) if 'anchors' not in x['file']]
    cells = [{'fn': x['fn'], 'w': 390, 'h': 844, 'o': x['o'], 'label': os.path.basename(x['file'])[:-4], 'sub': json.dumps(x['o'].get('so', {k: v for k, v in x['o'].items() if k != 't'}))[:44]} for x in sv]
    sheet('scene-variants.png', 'Scene variants (time of day, season, weather, front layer)', 'Each is one parameter on the same generator.', cells, cw=200, ch=420, cols=10, scale=1.5)

# composites: rotation in an existing scene and in a new one
def place(scene, props_, label):
    return {'fn': 's_place', 'w': 390, 'h': 844, 'o': {'scene': scene, 'props': props_, 'so': {'t': 0}}, 'label': label}
rot = json.load(open(f'{S}/harness/rotation.json'))
for name, sets in rot.items():
    cells = [{'fn': 's_place', 'w': 390, 'h': 844, 'o': {'scene': name.split(':')[0], 'so': sets.get('so', {'t': 0}), 'props': []}, 'label': 'scene alone', 'tag': 'existing' if name in ('cafe', 'burrow') else None}]
    cells[0] = {k: v for k, v in cells[0].items() if v is not None}
    for lab, ps in sets['sets'].items():
        cells.append({'fn': 's_place', 'w': 390, 'h': 844, 'o': {'scene': name.split(':')[0], 'so': sets.get('so', {'t': 0}), 'props': ps}, 'label': lab})
    sheet(f'rotation-{name.replace(":", "-")}.png', f'Rotation: the {name} with different prop sets', 'Same scene picture, props placed on named anchors; a story picks props by tag.', cells, cw=240, ch=500, cols=len(cells), scale=2)

json.dump(specs, open(f'{S}/specs/sheets.json', 'w'))
print(len(specs), 'sheets;', len(props), 'props;', len(var_cells), 'variants')
