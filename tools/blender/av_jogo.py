# av_jogo.py - pecas do jogo: carro (topo), foguete, locomotiva, vagao (+trem.json), moto, bandeira
#   blender -b -P tools/blender/av_jogo.py [-- nome ...]
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from av_common import *
from av_common import _obj

OUT = os.path.join(ROOT, 'assets', '3d', 'jogo')
ONLY = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []

STOPS = [(0.0, (0.22, 0.22, 0.25)), (0.5, (0.42, 0.44, 0.50)), (1.0, (1.0, 1.0, 1.0))]


def begin(w, h, strength=0.5):
    sc = reset(w, h, samples=64)
    world(sc, strength=strength, stops=STOPS)
    return sc


def mats():
    class M:
        pass
    M.red = plastic('red', '#E3202A')
    M.red2 = plastic('red2', '#B3141C')
    M.blue = plastic('blue', '#1746D1')
    M.blue2 = plastic('blue2', '#0F2F9A')
    M.orange = plastic('orange', '#FF7A12')
    M.yellow = plastic('yellow', '#FFC61A')
    M.green = plastic('green', '#27B84A')
    M.white = plastic('white', '#EEF1F6')
    M.cream = plastic('cream', '#FFF4D6', rough=0.5, coat=0.0, spec=0.2)
    M.grey = plastic('grey', '#8D97A8')
    M.dark = plastic('dark', '#2B3040', rough=0.4, coat=0.1)
    M.tyre = plastic('tyre', '#1D1F26', rough=0.55, coat=0.0)
    M.glass = plastic('glass', '#16305E', rough=0.12, coat=0.6)
    M.window = plastic('window', '#8FD8FF', rough=0.15, coat=0.6)
    M.steel = metal('steel', '#C9D3E2', rough=0.25)
    M.lamp = emissive('lamp', '#FFE36A', 1.2)
    M.tail = emissive('tail', '#FF3B2F', 0.8)
    return M


def wheel(o, M, x, r, y=-0.48, w=0.14, hubm=None, capm=None):
    """roda de brinquedo com eixo em Y, apoiada em z=0."""
    o.append(cyl('tyre', r, w, (x, y, r), M.tyre, axis='Y', bev=0.035))
    o.append(cyl('hub', r * 0.74, w + 0.03, (x, y, r), hubm or M.red, axis='Y', bev=0.02))
    o.append(cyl('cap', r * 0.28, w + 0.08, (x, y, r), capm or M.yellow, axis='Y', bev=0.02))


# ------------------------------------------------------------------ carro (vista de cima, frente -> +X)
def carro():
    sc = begin(256, 256, 0.55)
    M = mats()
    o = []
    out = []
    for (x, y) in rrect_outline(2.10, 0.96, 0.30, 12):
        if x > 0.25:
            y *= 1.0 - 0.16 * ((x - 0.25) / 0.8) ** 2
        if x < -0.6:
            y *= 1.0 - 0.05 * ((-x - 0.6) / 0.45) ** 2
        out.append((x, y))
    o.append(prism('body', out, 0.34, M.red, (0, 0, 0.37), bev=0.10, plane='XY', segs=5))
    o.append(prism('glass', rrect_outline(1.02, 0.80, 0.24, 10), 0.26, M.glass, (-0.14, 0, 0.62), bev=0.09, plane='XY', segs=4))
    o.append(prism('roof', rrect_outline(0.56, 0.60, 0.16, 10), 0.08, M.red, (-0.18, 0, 0.77), bev=0.03, plane='XY'))
    # riscas brancas de corrida (capo, tejadilho, mala)
    for sy in (-1, 1):
        o.append(rbox('s1', (0.50, 0.10, 0.03), (0.66, sy * 0.11, 0.54), 0.012, M.white))
        o.append(rbox('s2', (0.50, 0.10, 0.03), (-0.18, sy * 0.11, 0.81), 0.012, M.white))
        o.append(rbox('s3', (0.26, 0.10, 0.03), (-0.84, sy * 0.11, 0.54), 0.012, M.white))
    # rodas (salientes dos lados)
    for sx in (0.64, -0.66):
        for sy in (-1, 1):
            o.append(cyl('wheel', 0.25, 0.24, (sx, sy * 0.50, 0.25), M.tyre, axis='Y', bev=0.06))
    # farois / farolins / para-choques / aileron / espelhos
    for sy in (-1, 1):
        o.append(sphere('farol', 1.0, (0.985, sy * 0.27, 0.46), M.lamp, scale=(0.07, 0.10, 0.06)))
        o.append(rbox('farolim', (0.06, 0.20, 0.07), (-1.03, sy * 0.28, 0.46), 0.02, M.tail))
        o.append(sphere('espelho', 1.0, (0.30, sy * 0.50, 0.57), M.red, scale=(0.07, 0.08, 0.05)))
        o.append(rbox('poste', (0.06, 0.05, 0.16), (-0.90, sy * 0.30, 0.60), 0.015, M.dark))
    o.append(rbox('parachoque', (0.10, 0.74, 0.12), (1.03, 0, 0.30), 0.04, M.grey))
    o.append(rbox('aileron', (0.20, 1.00, 0.05), (-0.93, 0, 0.70), 0.02, M.dark))
    cam = camera(sc, (0, 0, 14), (0, 0, 0), ortho=3.0)
    fit_camera(sc, cam, o, fill_w=0.94, fill_h=0.94)
    studio((0, 0, 0.4), 5.0, toward_cam=(0, 0, 1), up=(0, 1, 0), power=0.5)
    render(sc, os.path.join(OUT, 'carro.png'))


# ------------------------------------------------------------------ foguete
def foguete():
    sc = begin(384, 512, 0.5)
    M = mats()
    o = []
    prof = smooth_profile([(0.0, 0.52), (0.36, 0.55), (0.46, 0.80), (0.55, 1.25), (0.57, 1.70), (0.53, 2.15),
                           (0.43, 2.55), (0.28, 2.90), (0.12, 3.12), (0.0, 3.20)], 10)
    ZN, ZB = 2.42, 2.24                      # inicio do nariz / da faixa azul
    body = [p for p in prof if p[1] <= ZB + 1e-6]
    band = [p for p in prof if ZB - 0.02 <= p[1] <= ZN + 0.02]
    nose = [p for p in prof if p[1] >= ZN - 1e-6]
    o.append(lathe('body', body + [(0.0, body[-1][1])], M.white))
    o.append(lathe('band', [(0.0, band[0][1])] + [(r + 0.012, z) for r, z in band] + [(0.0, band[-1][1])], M.blue))
    o.append(lathe('nose', [(0.0, nose[0][1])] + [(r + 0.004, z) for r, z in nose], M.red))
    o.append(lathe('band2', [(0.0, 0.74), (0.455, 0.74), (0.485, 0.88), (0.0, 0.88)], M.blue))
    o.append(cyl('nozzle', 0.36, 0.36, (0, 0, 0.40), M.dark, r2=0.25, bev=0.03))
    fin = [(0.40, 1.36), (0.66, 1.08), (0.93, 0.52), (1.00, 0.0), (0.74, 0.0), (0.64, 0.38), (0.40, 0.50)]
    o.append(prism('finR', fin, 0.13, M.red, bev=0.045, segs=4))
    o.append(prism('finL', [(-x, z) for x, z in fin], 0.13, M.red, bev=0.045, segs=4))
    o.append(prism('finF', fin, 0.13, M.red, rot=(0, 0, radians(-90)), bev=0.045, segs=4))
    # janela redonda
    WZ, WY = 1.80, -0.57
    o.append(tube('wring', [(0.25 * cos(2 * pi * i / 16), WY + 0.01, WZ + 0.25 * sin(2 * pi * i / 16)) for i in range(16)], 0.06, M.blue, cyclic=True))
    o.append(sphere('wglass', 1.0, (0, WY + 0.02, WZ), M.window, scale=(0.24, 0.06, 0.24)))
    D, t = 16.0, radians(3.0)
    c = Vector((0, 0, 1.6))
    cam = camera(sc, (0, -D * cos(t), c.z + D * sin(t)), c, lens=90)
    fit_camera(sc, cam, o, fill_w=0.93, fill_h=0.94)
    studio(c, 6.5, power=0.5)
    render(sc, os.path.join(OUT, 'foguete.png'))


# ------------------------------------------------------------------ comboio (lado, ortografico, mesma escala)
PPU = 146.0          # pixels por unidade (locomotiva e vagao)
GROUND = 40          # px entre o fundo da imagem e a linha das rodas (z=0)
TRAIN_H = 384


def side_cam(sc, W, H, cx, ppu=PPU, ground=GROUND):
    vh = H / ppu
    zc = vh / 2 - ground / ppu
    cam = camera(sc, (cx, -20, zc), (cx, 0, zc), ortho=max(W, H) / ppu)
    studio((cx, 0, 1.0), 6.5, power=0.5)
    return cam


def loco():
    W, H = 512, TRAIN_H
    sc = begin(W, H)
    M = mats()
    o = []
    o.append(rbox('chassis', (2.75, 0.86, 0.20), (0.0, 0, 0.54), 0.06, M.dark))
    o.append(cyl('boiler', 0.45, 1.56, (0.55, 0, 1.09), M.blue, axis='X', bev=0.07))
    o.append(sphere('nose', 1.0, (1.32, 0, 1.09), M.dark, scale=(0.13, 0.40, 0.40)))
    for x in (0.12, 0.98):
        o.append(cyl('band', 0.468, 0.08, (x, 0, 1.09), M.yellow, axis='X', bev=0.015))
    o.append(rbox('cab', (1.10, 0.98, 1.24), (-0.80, 0, 1.24), 0.10, M.red, segs=6))
    o.append(prism('wframe', rrect_outline(0.70, 0.56, 0.14), 0.05, M.yellow, (-0.80, -0.49, 1.42), bev=0.015))
    o.append(prism('wglass', rrect_outline(0.56, 0.42, 0.09), 0.07, M.window, (-0.80, -0.50, 1.42), bev=0.012))
    o.append(rbox('roof', (1.36, 1.14, 0.15), (-0.80, 0, 1.915), 0.065, M.yellow, segs=5))
    chim = [(0.0, 0.0), (0.13, 0.0), (0.13, 0.26), (0.21, 0.40), (0.23, 0.48), (0.19, 0.50), (0.0, 0.50)]
    o.append(lathe('chimney', chim, M.dark, (0.98, 0, 1.49), bev=0.02))
    o.append(cyl('chimring', 0.145, 0.06, (0.98, 0, 1.56), M.yellow, bev=0.015))
    o.append(sphere('dome', 0.21, (0.36, 0, 1.50), M.yellow, scale=(1, 1, 0.85)))
    o.append(cyl('lampbox', 0.10, 0.18, (1.22, 0, 1.60), M.dark, axis='X', bev=0.02))
    o.append(sphere('lamp', 0.085, (1.31, 0, 1.60), M.lamp, scale=(0.5, 1, 1)))
    o.append(prism('cow', [(1.36, 0.60), (1.70, 0.08), (1.36, 0.08)], 0.84, M.orange, bev=0.03))
    o.append(rbox('coupler', (0.22, 0.20, 0.10), (-1.46, 0, 0.50), 0.03, M.grey))
    wheel(o, M, -0.86, 0.37)
    wheel(o, M, -0.08, 0.37)
    wheel(o, M, 0.64, 0.26)
    wheel(o, M, 1.18, 0.26)
    o.append(stick('rod', (-0.86, -0.60, 0.25), (-0.08, -0.60, 0.25), 0.04, M.steel))
    for x in (-0.86, -0.08):
        o.append(cyl('pin', 0.065, 0.05, (x, -0.61, 0.25), M.steel, axis='Y', bev=0.012))
    cam = side_cam(sc, W, H, 0.065)
    b = view_bounds(sc, cam, o)
    print('LOCO bounds', ['%.3f' % v for v in b])
    render(sc, os.path.join(OUT, 'trem_loco.png'))


def vagao():
    W, H = 384, TRAIN_H
    sc = begin(W, H)
    M = mats()
    o = []
    o.append(rbox('chassis', (1.96, 0.86, 0.20), (0.0, 0, 0.54), 0.06, M.dark))
    for s in (-1, 1):
        o.append(rbox('coupler', (0.22, 0.20, 0.10), (s * 1.05, 0, 0.50), 0.03, M.grey))
    # vagao-caixa alto: o painel claro leva UMA letra (mais alta que larga)
    BZ0, BZ1 = 0.62, 2.16
    o.append(rbox('box', (1.86, 0.96, BZ1 - BZ0), (0, 0, (BZ0 + BZ1) / 2), 0.09, M.blue, segs=6))
    o.append(rbox('rim', (1.96, 1.04, 0.12), (0, 0, BZ1), 0.05, M.yellow, segs=5))
    o.append(rbox('skirt', (1.92, 1.00, 0.10), (0, 0, BZ0 + 0.04), 0.04, M.blue2, segs=4))
    # painel claro e plano para a letra
    PW, PH, PB = 1.40, 1.30, 0.012
    PZ = (BZ0 + BZ1) / 2 + 0.01
    PY = -0.48 - 0.03
    o.append(prism('panel', rrect_outline(PW, PH, 0.09), 0.06, M.cream, (0, PY, PZ), bev=PB))
    wheel(o, M, -0.56, 0.30)
    wheel(o, M, 0.56, 0.30)
    cam = side_cam(sc, W, H, 0.0)
    fx, fz = PW / 2 - PB, PH / 2 - PB
    box = proj_bbox(sc, cam, [(sx * fx, PY - 0.03, PZ + sz * fz) for sx in (-1, 1) for sz in (-1, 1)])
    with open(os.path.join(OUT, 'trem.json'), 'w', encoding='utf-8') as f:
        json.dump({'panel': box}, f)
    print('PANEL', box)
    b = view_bounds(sc, cam, o)
    print('VAGAO bounds', ['%.3f' % v for v in b])
    render(sc, os.path.join(OUT, 'trem_vagao.png'))


# ------------------------------------------------------------------ moto (lado, frente -> +X)
def moto():
    sc = begin(512, 384)
    M = mats()
    o = []
    R = 0.52
    XR, XF = -0.98, 1.02
    for x in (XR, XF):
        o.append(cyl('tyre', R, 0.24, (x, 0, R), M.tyre, axis='Y', bev=0.09))
        o.append(cyl('rim', R * 0.64, 0.26, (x, 0, R), M.grey, axis='Y', bev=0.03))
        o.append(cyl('hub', R * 0.26, 0.30, (x, 0, R), M.orange, axis='Y', bev=0.03))
    # motor + quadro
    o.append(rbox('engine', (0.66, 0.40, 0.46), (0.02, 0, 0.62), 0.12, M.grey))
    o.append(cyl('cover', 0.17, 0.46, (0.02, 0, 0.62), M.orange, axis='Y', bev=0.03))
    o.append(stick('frame', (0.30, 0, 0.78), (0.68, 0, 1.24), 0.06, M.dark))
    for sy in (-1, 1):
        o.append(stick('swing', (-0.12, sy * 0.17, 0.56), (XR, sy * 0.17, R), 0.05, M.dark))
        o.append(stick('fork', (XF, sy * 0.17, R), (0.62, sy * 0.17, 1.44), 0.05, M.steel))
    # carenagem / deposito / banco / traseira
    o.append(rbox('fairing', (1.02, 0.34, 0.30), (-0.14, 0, 0.92), 0.13, M.blue, segs=6))
    o.append(sphere('tank', 1.0, (0.20, 0, 1.13), M.blue, scale=(0.54, 0.25, 0.27)))
    o.append(rbox('seat', (0.74, 0.34, 0.16), (-0.52, 0, 1.13), 0.07, M.dark, segs=5))
    o.append(prism('tail', [(-0.92, 0.98), (-0.20, 0.92), (-0.20, 1.07), (-0.90, 1.10), (-1.22, 1.30), (-1.28, 1.22)], 0.32, M.blue, bev=0.05, segs=4))
    o.append(sphere('taillight', 1.0, (-1.25, 0, 1.25), M.tail, scale=(0.05, 0.10, 0.06)))
    # guarda-lamas
    o.append(tube('fenderF', arc_pts(XF, R, R + 0.085, 35, 150, 10), 0.05, M.orange, scale=(1, 3.0, 1)))
    o.append(tube('fenderR', arc_pts(XR, R, R + 0.085, 55, 165, 10), 0.05, M.orange, scale=(1, 3.0, 1)))
    # guiador + farol
    o.append(stick('riser', (0.64, 0, 1.30), (0.60, 0, 1.50), 0.05, M.dark))
    o.append(stick('bar', (0.60, -0.34, 1.50), (0.60, 0.34, 1.50), 0.035, M.steel))
    o.append(cyl('grip', 0.06, 0.16, (0.60, -0.34, 1.50), M.dark, axis='Y', bev=0.02))
    o.append(sphere('headhouse', 0.17, (0.86, 0, 1.30), M.orange, scale=(0.9, 1, 1)))
    o.append(sphere('headlight', 0.13, (0.955, 0, 1.30), M.lamp, scale=(0.55, 1, 1)))
    # escape
    o.append(tube('pipe', [(0.22, -0.24, 0.44), (-0.25, -0.26, 0.38), (-0.70, -0.28, 0.50)], 0.055, M.steel))
    o.append(stick('muffler', (-0.62, -0.28, 0.48), (-1.30, -0.28, 0.72), 0.10, M.steel, bev=0.04))
    cam = camera(sc, (0, -20, 0.8), (0, 0, 0.8), ortho=4.0)
    fit_camera(sc, cam, o, fill_w=0.94, fill_h=0.94)
    studio((0, 0, 0.8), 6.5, power=0.5)
    render(sc, os.path.join(OUT, 'moto.png'))


# ------------------------------------------------------------------ bandeira de chegada
def bandeira():
    sc = begin(256, 256, 0.55)
    M = mats()
    BLACK = plastic('fb', '#17191E', rough=0.6, coat=0.0, spec=0.3)
    WHITE = plastic('fw', '#F5F6F8', rough=0.6, coat=0.0, spec=0.3)
    o = []
    PX = -0.72
    o.append(lathe('base', [(0.0, 0.0), (0.30, 0.0), (0.30, 0.05), (0.18, 0.13), (0.07, 0.16), (0.0, 0.16)], M.blue, (PX, 0, 0), bev=0.02))
    o.append(stick('pole', (PX, 0, 0.10), (PX, 0, 2.34), 0.05, M.steel))
    o.append(sphere('knob', 0.10, (PX, 0, 2.40), M.orange))
    cols, rows, sub, cs = 6, 4, 4, 0.245
    Z0 = 1.30
    bm = bmesh.new()
    nx, nz = cols * sub, rows * sub
    V = [[None] * (nz + 1) for _ in range(nx + 1)]
    for i in range(nx + 1):
        u = i / nx
        for j in range(nz + 1):
            x = PX + 0.05 + u * cols * cs
            z = Z0 + (j / nz) * rows * cs + 0.07 * sin(2 * pi * 1.15 * u) * u ** 0.6 - 0.05 * u
            y = 0.10 * sin(2 * pi * 1.15 * u + 0.6) * u ** 0.5
            V[i][j] = bm.verts.new((x, y, z))
    for i in range(nx):
        for j in range(nz):
            f = bm.faces.new((V[i][j], V[i + 1][j], V[i + 1][j + 1], V[i][j + 1]))
            f.material_index = ((i // sub) + (j // sub)) % 2
    flag = _obj('flag', bm, BLACK)
    flag.data.materials.append(WHITE)
    so = flag.modifiers.new('sol', 'SOLIDIFY')
    so.thickness = 0.03
    so.offset = 0.0
    o.append(flag)
    D, t = 16.0, radians(2.0)
    c = Vector((0, 0, 1.25))
    cam = camera(sc, (0, -D * cos(t), c.z + D * sin(t)), c, lens=90)
    fit_camera(sc, cam, o, fill_w=0.92, fill_h=0.92)
    studio(c, 6.0, power=0.5)
    render(sc, os.path.join(OUT, 'bandeira.png'))


JOBS = {'carro': carro, 'foguete': foguete, 'trem_loco': loco, 'trem_vagao': vagao, 'moto': moto, 'bandeira': bandeira}
for k, fn in JOBS.items():
    if not ONLY or k in ONLY:
        print('==', k)
        fn()
