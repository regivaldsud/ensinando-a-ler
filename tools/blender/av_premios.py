# av_premios.py - trofeus (ouro/prata/bronze), medalha, estrela, cadeado  (512x512)
#   blender -b -P tools/blender/av_premios.py [-- nome ...]
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from av_common import *

OUT = os.path.join(ROOT, 'assets', '3d', 'premios')
ONLY = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []

METAL_STOPS = [(0.0, (0.10, 0.09, 0.09)), (0.40, (0.30, 0.29, 0.30)), (0.50, (0.85, 0.85, 0.90)),
               (0.62, (0.40, 0.44, 0.52)), (1.0, (1.0, 1.0, 1.0))]
BOXES = [((-0.75, -0.55, 0.45), 0.80, 0.95, 2.2), ((0.85, -0.45, 0.15), 0.86, 0.97, 1.2), ((0.2, -0.9, -0.1), 0.90, 0.99, 0.5)]

METALS = {
    'ouro': ('#FFB81C', '#FFE08A', 0.20),
    'prata': ('#D5DCE6', '#FFFFFF', 0.20),
    'bronze': ('#D9772E', '#F7B27A', 0.22),
}


def begin(strength=0.9):
    sc = reset(512, 512, samples=64)
    world(sc, strength=strength, stops=METAL_STOPS, boxes=BOXES)
    return sc


def finish(sc, objs, name, center, R=6.0, tilt=8.0, fill=0.92, power=0.5, lens=90):
    D = 16.0
    t = radians(tilt)
    c = Vector(center)
    cam = camera(sc, (c.x, c.y - D * cos(t), c.z + D * sin(t)), c, lens=lens)
    fit_camera(sc, cam, objs, fill_w=fill, fill_h=fill)
    studio(c, R, toward_cam=(0, -1, 0), power=power)
    render(sc, os.path.join(OUT, name + '.png'))


# ------------------------------------------------------------------ trofeu
def trofeu(kind):
    sc = begin()
    col, col2, rough = METALS[kind]
    MET = metal('met', col, rough=rough)
    STAR = metal('star', col2, rough=0.32)
    BASE = plastic('base', '#3B2A22', rough=0.35, coat=0.4)
    o = []
    o.append(rbox('plinth', (1.20, 1.00, 0.34), (0, 0, 0.17), 0.06, BASE))
    o.append(rbox('plinth2', (0.94, 0.80, 0.14), (0, 0, 0.40), 0.05, BASE))
    o.append(prism('plate', rrect_outline(0.62, 0.17, 0.05), 0.04, MET, (0, -0.50, 0.17), bev=0.012))
    foot = smooth_profile([(0.0, 0.46), (0.40, 0.46), (0.42, 0.52), (0.30, 0.60), (0.14, 0.72), (0.10, 0.88),
                           (0.17, 0.98), (0.17, 1.04), (0.10, 1.10), (0.12, 1.18), (0.0, 1.18)], 6)
    o.append(lathe('foot', foot, MET))
    outer = smooth_profile([(0.0, 1.15), (0.20, 1.17), (0.40, 1.28), (0.55, 1.50), (0.64, 1.80), (0.70, 2.12), (0.76, 2.40)], 8)
    lip = [(0.79, 2.44), (0.79, 2.48), (0.75, 2.50), (0.71, 2.47)]
    inner = smooth_profile([(0.69, 2.38), (0.63, 2.10), (0.56, 1.80), (0.44, 1.56), (0.24, 1.42), (0.0, 1.38)], 6)
    o.append(lathe('cup', outer + lip + inner, MET, seg=96))
    for s in (-1, 1):
        pts = [(s * 0.71, 0, 2.26), (s * 0.98, 0, 2.34), (s * 1.19, 0, 2.14), (s * 1.16, 0, 1.84), (s * 0.94, 0, 1.62), (s * 0.57, 0, 1.56)]
        o.append(tube('handle', pts, 0.07, MET))
    # estrela na frente (inclinada como a parede da taca)
    st = prism('star', star_outline(0.27, 0.118), 0.14, STAR, (0, -0.655, 1.90), rot=(radians(11), 0, 0), bev=0.022)
    o.append(st)
    finish(sc, o, 'trofeu_' + kind, (0, 0, 1.25), tilt=9.0)


# ------------------------------------------------------------------ medalha
def medalha():
    sc = begin()
    GOLD = metal('gold', '#FFB81C', rough=0.2)
    GOLD2 = metal('gold2', '#FFE08A', rough=0.3)
    BLUE = plastic('rb', '#1746D1', rough=0.55, coat=0.0)
    ORANGE = plastic('ro', '#FF7A12', rough=0.55, coat=0.0)
    o = []
    CZ = 0.70
    prof = [(0.0, 0.06), (0.50, 0.06), (0.54, 0.10), (0.63, 0.10), (0.67, 0.06), (0.67, -0.06), (0.63, -0.10), (0.0, -0.10)]
    o.append(lathe('disc', prof, GOLD, (0, 0, CZ), rot=(radians(90), 0, 0), seg=96, bev=0.012))
    o.append(prism('star', star_outline(0.37, 0.158), 0.10, GOLD2, (0, -0.10, CZ), bev=0.025))
    # argola + passador
    o.append(tube('ring', [(0.13 * cos(a), 0, CZ + 0.72 + 0.13 * sin(a)) for a in [2 * pi * i / 12 for i in range(12)]], 0.035, GOLD, cyclic=True))
    o.append(rbox('clasp', (0.62, 0.09, 0.13), (0, 0, CZ + 0.90), 0.035, GOLD))
    # fita em V: 2 tiras com 3 riscas (azul / laranja / azul)
    zb, zt = CZ + 0.90, CZ + 2.02
    w = 0.50
    for s, y in ((-1, 0.03), (1, -0.01)):
        xb, xt = s * 0.06, s * 0.56
        for (u0, u1, m) in ((0.0, 0.30, BLUE), (0.30, 0.70, ORANGE), (0.70, 1.0, BLUE)):
            a0, a1 = -w / 2 + u0 * w, -w / 2 + u1 * w
            out = [(xb + a0, zb), (xb + a1, zb), (xt + a1, zt), (xt + a0, zt)]
            o.append(prism('ribbon', out, 0.035, m, (0, y, 0)))
    finish(sc, o, 'medalha', (0, 0, 1.35), tilt=3.0, fill=0.93)


# ------------------------------------------------------------------ estrela fofa
def estrela():
    sc = begin()
    GOLD = metal('gold', '#FFB81C', rough=0.24, coat=0.3)
    R, r, t, D = 1.0, 0.52, 0.16, 0.50
    bm = bmesh.new()
    ring_f = [bm.verts.new((x, -t, z)) for x, z in star_outline(R, r)]
    ring_b = [bm.verts.new((x, t, z)) for x, z in star_outline(R, r)]
    cf = bm.verts.new((0, -D, 0))
    cb = bm.verts.new((0, D, 0))
    n = len(ring_f)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((cf, ring_f[i], ring_f[j]))
        bm.faces.new((cb, ring_b[j], ring_b[i]))
        bm.faces.new((ring_f[i], ring_b[i], ring_b[j], ring_f[j]))
    from av_common import _obj
    ob = _obj('estrela', bm, GOLD)
    subsurf(ob, 3)
    finish(sc, [ob], 'estrela', (0, 0, 0), tilt=0.0, fill=0.92, R=5.0)


# ------------------------------------------------------------------ cadeado
def cadeado():
    sc = begin(strength=0.7)
    BODY = plastic('body', '#6D86AD', rough=0.30, coat=0.4)
    BODY2 = plastic('body2', '#566E96', rough=0.30, coat=0.4)
    STEEL = metal('steel', '#C9D3E2', rough=0.22)
    DARK = plastic('dark', '#1E2A44', rough=0.4, coat=0.1)
    o = []
    o.append(rbox('body', (1.56, 0.72, 1.22), (0, 0, 0.61), 0.22, BODY, segs=8))
    o.append(rbox('band', (1.60, 0.76, 0.20), (0, 0, 0.98), 0.06, BODY2))
    o.append(prism('kh1', circle_outline(0.15), 0.06, DARK, (0, -0.36, 0.56), bev=0.012))
    o.append(prism('kh2', [(-0.065, 0.50), (0.065, 0.50), (0.11, 0.22), (-0.11, 0.22)], 0.06, DARK, (0, -0.36, 0.0), bev=0.012))
    pts = [(-0.46, 0, 1.05), (-0.46, 0, 1.40)] + arc_pts(0, 1.62, 0.46, 170, 10, 10) + [(0.46, 0, 1.40), (0.46, 0, 1.05)]
    o.append(tube('shackle', pts, 0.135, STEEL))
    finish(sc, o, 'cadeado', (0, 0, 1.1), tilt=6.0, fill=0.90)


JOBS = {
    'trofeu_ouro': lambda: trofeu('ouro'), 'trofeu_prata': lambda: trofeu('prata'), 'trofeu_bronze': lambda: trofeu('bronze'),
    'medalha': medalha, 'estrela': estrela, 'cadeado': cadeado,
}
for k, fn in JOBS.items():
    if not ONLY or k in ONLY:
        print('==', k)
        fn()
