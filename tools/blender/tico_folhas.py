# tico_folhas.py - junta os quadros renderizados do Tico em folhas (uma por animacao).
#   python tools/blender/tico_folhas.py <pasta dos quadros>
# Gera assets/3d/avatar/tico_<animacao>.webp e tico.json. Precisa do Pillow (pip install pillow).
import sys, os, json, shutil
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, '..', '..', 'assets', '3d', 'avatar'))
tmp = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '_tico_frames')

meta = json.load(open(os.path.join(tmp, 'tico.json'), encoding='utf-8'))
w, h, cols = meta['w'], meta['h'], meta['cols']
total = 0
for name, a in meta['anims'].items():
    n = a['n']
    rows = (n + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * w, rows * h), (0, 0, 0, 0))
    for i in range(n):
        im = Image.open(os.path.join(tmp, '%s_%03d.png' % (name, i))).convert('RGBA')
        sheet.paste(im, ((i % cols) * w, (i // cols) * h))
    dst = os.path.join(OUT, 'tico_%s.webp' % name)
    sheet.save(dst, 'WEBP', quality=90, method=6)
    total += os.path.getsize(dst)
    print(name, n, 'quadros ->', os.path.basename(dst), os.path.getsize(dst) // 1024, 'KB')
# imagem parada (icone / reserva)
shutil.copyfile(os.path.join(tmp, 'idle_000.png'), os.path.join(OUT, 'tico.png'))
json.dump(meta, open(os.path.join(OUT, 'tico.json'), 'w', encoding='utf-8'), separators=(',', ':'))
print('total', total // 1024, 'KB')
