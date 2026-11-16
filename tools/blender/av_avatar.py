# av_avatar.py - robo mascote (3 poses, mesma camara) + robo.json
#   blender -b -P tools/blender/av_avatar.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from av_common import *

OUT = os.path.join(ROOT, 'assets', '3d', 'avatar')
W, H = 640, 736

sc = reset(W, H, samples=64)
world(sc, strength=0.42, stops=[(0.0, (0.22, 0.22, 0.25)), (0.5, (0.42, 0.44, 0.50)), (1.0, (1.0, 1.0, 1.0))])

WHITE = plastic('white', '#E6EAF2', rough=0.32, coat=0.3)
BLUE = plastic('blue', '#1746D1', rough=0.30, coat=0.35)
ORANGE = plastic('orange', '#FF7A12', rough=0.30, coat=0.35)
GREY = plastic('grey', '#7C8698', rough=0.35, coat=0.1)
DARK = plastic('dark', '#2A3142', rough=0.4, coat=0.1)
SCREEN = plastic('screen', '#05070E', rough=0.22, coat=0.2, spec=0.35)
YELLOW = emissive('yellow', '#FFD23A', 0.6)
CYAN = emissive('cyan', '#48D8FF', 0.6)
BALL = plastic('ball', '#FF7A12', rough=0.25, coat=0.5)
BALL_ON = emissive('ball_on', '#35F06A', 5.0, base='#35F06A')
HALO = halo_mat('halo', '#35F06A', strength=3.0, power=2.2, amount=0.55)

common = []


def add(o, group=None):
    (common if group is None else group).append(o)
    return o


# ------------------------------------------------------------ corpo
for s in (-1, 1):
    add(rbox('sole', (0.42, 0.60, 0.09), (s * 0.27, -0.09, 0.045), 0.04, ORANGE))
    add(rbox('foot', (0.38, 0.56, 0.22), (s * 0.27, -0.09, 0.17), 0.10, BLUE))
    add(cyl('leg', 0.115, 0.30, (s * 0.27, 0.02, 0.37), WHITE))

BODY_Z = 0.80
add(rbox('body', (0.94, 0.68, 0.72), (0, 0, BODY_Z), 0.22, BLUE, segs=8))
add(prism('chest', rrect_outline(0.56, 0.36, 0.10), 0.08, WHITE, (0, -0.325, BODY_Z + 0.02), bev=0.02))
add(cyl('button', 0.085, 0.07, (-0.13, -0.37, BODY_Z + 0.02), ORANGE, axis='Y', bev=0.02))
add(sphere('led1', 0.036, (0.07, -0.362, BODY_Z + 0.08), YELLOW))
add(sphere('led2', 0.036, (0.17, -0.362, BODY_Z + 0.08), CYAN))
add(rbox('slot', (0.17, 0.03, 0.035), (0.12, -0.362, BODY_Z - 0.04), 0.012, GREY))
add(cyl('neck', 0.20, 0.14, (0, 0, 1.19), DARK))

# ------------------------------------------------------------ cabeca
HEAD_Z = 1.75
HEAD = (1.34, 1.00, 1.06)
add(rbox('head', HEAD, (0, 0, HEAD_Z), 0.27, WHITE, segs=10))
YF = -HEAD[1] / 2
add(prism('bezel', rrect_outline(1.12, 0.82, 0.22, 14), 0.30, BLUE, (0, YF + 0.15 - 0.045, HEAD_Z), bev=0.035, segs=4))
SW, SH, SR, SB = 0.98, 0.68, 0.15, 0.012
SY = YF - 0.045 - 0.012          # centro da placa do ecra (espessura 0.03)
add(prism('screen', rrect_outline(SW, SH, SR, 14), 0.03, SCREEN, (0, SY, HEAD_Z), bev=SB, segs=3))
SCREEN_FRONT_Y = SY - 0.015
for s in (-1, 1):
    add(cyl('ear', 0.21, 0.13, (s * (HEAD[0] / 2 + 0.035), 0, HEAD_Z), BLUE, axis='X', bev=0.03))
    add(cyl('earc', 0.115, 0.10, (s * (HEAD[0] / 2 + 0.10), 0, HEAD_Z), ORANGE, axis='X', bev=0.03))

TOP = HEAD_Z + HEAD[2] / 2
add(lathe('antbase', [(0.13, 0.0), (0.13, 0.03), (0.09, 0.07), (0.045, 0.09), (0, 0.09)], BLUE, (0, 0, TOP - 0.01)))
add(cyl('antstem', 0.028, 0.26, (0, 0, TOP + 0.17), GREY))
BALLC = (0, 0, TOP + 0.36)
ball_off = sphere('ball_off', 0.105, BALLC, BALL)
ball_on = sphere('ball_on', 0.105, BALLC, BALL_ON)
halo = sphere('halo', 0.215, BALLC, HALO)
halo.visible_shadow = False


# ------------------------------------------------------------ bracos
L1 = L2 = 0.33
AR = 0.082


def arm(group, s, wrist_rel, pole, hand_dir=None, hand_off=0.12, palm=(0, 1, 0), hscale=(0.15, 0.105, 0.18)):
    S = Vector((s * 0.52, 0.0, 1.00))
    T = S + Vector(wrist_rel)
    d = T - S
    dist = min(d.length, (L1 + L2) * 0.995)
    dr = d.normalized()
    T = S + dr * dist
    a = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist)
    hgt = sqrt(max(L1 * L1 - a * a, 0.0))
    p = Vector(pole)
    p = (p - p.dot(dr) * dr).normalized()
    E = S + dr * a + p * hgt
    add(sphere('shoulder', 0.135, S, BLUE), group)
    add(stick('upper', S, E, AR, WHITE), group)
    add(sphere('elbow', AR * 1.06, E, WHITE), group)
    add(stick('fore', E, T, AR, WHITE), group)
    fd = (T - E).normalized()
    cuff = add(stick('cuff', T - fd * 0.045, T + fd * 0.045, 0.108, ORANGE, bev=0.02), group)
    hd = Vector(hand_dir).normalized() if hand_dir else fd
    C = T + hd * hand_off
    hand = add(sphere('hand', 1.0, C, BLUE, scale=hscale), group)
    orient(hand, hd, palm)
    inward = Vector((-s, 0, 0))
    inward = (inward - inward.dot(hd) * hd).normalized()
    th = add(sphere('thumb', 1.0, C + inward * 0.125 - hd * 0.03, BLUE, scale=(0.075, 0.065, 0.085)), group)
    orient(th, (hd + inward * 0.9).normalized(), palm)


idle, happy, listen = [], [], []
IDLE = dict(wrist_rel=None, pole=None)
for s in (-1, 1):
    arm(idle, s, (s * 0.12, -0.04, -0.63), (s, 0.1, 0.0))
    arm(happy, s, (s * 0.47, -0.14, 0.50), (s, 0.0, -0.8))
# listen: braco da direita da imagem (+x) levantado junto ao ouvido; o outro relaxado
arm(listen, -1, (-0.12, -0.04, -0.63), (-1, 0.1, 0.0))
arm(listen, 1, (0.46, -0.10, 0.48), (1, 0.0, -0.8), hand_dir=(-0.25, 0.0, 1.0), hand_off=0.17, hscale=(0.165, 0.08, 0.20))

groups = {'*': common, 'idle': idle + [ball_off], 'happy': happy + [ball_off], 'listen': listen + [ball_on, halo]}

# ------------------------------------------------------------ camara / luz
CZ = 1.36
TILT = radians(4.0)
D = 16.0
cam = camera(sc, (0, -D * cos(TILT), CZ + D * sin(TILT)), (0, 0, CZ), lens=110)
fit_objs = common + idle + happy + listen + [ball_off]
fit_camera(sc, cam, fit_objs, fill_w=0.965, fill_h=0.90)
studio((0, 0, 1.4), 7.0, toward_cam=(0, -1, 0), power=0.42)

# ------------------------------------------------------------ json do ecra
fx = SW / 2 - SB
fz = SH / 2 - SB
corners = [(sx * fx, SCREEN_FRONT_Y, HEAD_Z + sz * fz) for sx in (-1, 1) for sz in (-1, 1)]
box = proj_bbox(sc, cam, corners)
with open(os.path.join(OUT, 'robo.json'), 'w', encoding='utf-8') as f:
    json.dump({'w': W, 'h': H, 'screen': box}, f)
print('SCREEN', box)

for pose in ('idle', 'happy', 'listen'):
    show_only(groups, pose)
    render(sc, os.path.join(OUT, 'robo_%s.png' % pose))
