# tico.py - Tico, o robo astronauta do Heitor (desenho original).
#   Modela o robo, monta o esqueleto, cria as animacoes, salva .blend / .glb
#   e renderiza os quadros de cada animacao.
#
#   Teste rapido (1 quadro-chave de cada animacao):
#     blender -b -P tools/blender/tico.py -- preview <pasta>
#   Completo (todos os quadros + tico.blend + tico.glb + tico.json):
#     blender -b -P tools/blender/tico.py -- all <pasta>
#   Depois:  python tools/blender/tico_folhas.py <pasta>   e   node tools/montar-meta.js
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from av_common import *
from mathutils import Euler, Quaternion

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
MODE = ARGS[0] if ARGS else 'preview'
TMP = ARGS[1] if len(ARGS) > 1 else os.path.join(HERE, '_tico_frames')
OUT = os.path.join(ROOT, 'assets', '3d', 'avatar')
os.makedirs(TMP, exist_ok=True)
W, H = 384, 442

bpy.context.scene.world = None
for _w in list(bpy.data.worlds):
    bpy.data.worlds.remove(_w)
for _a in list(bpy.data.armatures):
    bpy.data.armatures.remove(_a)
sc = reset(W, H, samples=24 if MODE == 'preview' else 48)
world(sc, strength=0.55,
      stops=[(0.0, (0.20, 0.22, 0.30)), (0.45, (0.42, 0.46, 0.58)), (0.55, (0.80, 0.86, 1.0)), (1.0, (1.0, 1.0, 1.0))],
      boxes=[((-0.6, -0.6, 0.6), 0.86, 0.97, 1.6), ((0.8, -0.3, 0.3), 0.90, 0.98, 0.9), ((0.0, 0.6, 0.9), 0.88, 0.98, 1.2)])

# ------------------------------------------------------------ materiais
WHITE = plastic('tico_branco', '#F6F8FC', rough=0.14, coat=0.75)
BLUE = plastic('tico_azul', '#1479F2', rough=0.20, coat=0.6)
ORANGE = plastic('tico_azul_claro', '#27C3FF', rough=0.20, coat=0.6)
DARK = metal('tico_junta', '#AEB8C8', rough=0.22)
CHROME = metal('tico_cromo', '#D3DAE6', rough=0.16)
VISOR = plastic('tico_visor', '#020308', rough=0.16, coat=0.35, spec=0.25)
STAR = emissive('tico_estrela', '#FFD23A', 2.2, base='#FFC81E')
CYAN = emissive('tico_ciano', '#48E8FF', 2.5)
EYE = emissive('tico_olho', '#6FF3FF', 4.0)
FLAME_O = emissive('tico_chama', '#FF8A1E', 5.0)
FLAME_Y = emissive('tico_chama2', '#FFE98A', 8.0)


# ------------------------------------------------------------ formas extra
def superell(name, semi, loc, mat, n=3.0, seg=64, rot=(0, 0, 0)):
    """Superelipsoide: entre a esfera (n=2) e a caixa arredondada (n grande)."""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=1.0)
    for v in bm.verts:
        d = v.co.normalized()
        t = (abs(d.x) ** n + abs(d.y) ** n + abs(d.z) ** n) ** (-1.0 / n)
        v.co = Vector((d.x * t * semi[0], d.y * t * semi[1], d.z * t * semi[2]))
    return _obj_public(name, bm, mat, loc, rot)


def _obj_public(name, bm, mat, loc, rot=(0, 0, 0)):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = rot
    me.materials.append(mat)
    return ob


def cone(name, a, b, r1, r2, mat, bev=0.0, seg=40):
    a = Vector(a); b = Vector(b)
    d = b - a
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r1, radius2=r2, depth=d.length)
    ob = _obj_public(name, bm, mat, (a + b) / 2)
    ob.rotation_mode = 'QUATERNION'
    ob.rotation_quaternion = d.to_track_quat('Z', 'Y')
    if bev > 0:
        bevel(ob, bev, 3)
    else:
        for p in ob.data.polygons:
            if len(p.vertices) > 4:
                p.use_smooth = False
    return ob


def capsule(name, a, b, r, mat):
    return [stick(name, a, b, r, mat), sphere(name + '_a', r, a, mat, seg=32), sphere(name + '_b', r, b, mat, seg=32)]


PARTS = {}   # osso -> objetos


def put(bone, *obs):
    for o in obs:
        if isinstance(o, (list, tuple)):
            put(bone, *o)
        else:
            PARTS.setdefault(bone, []).append(o)


# ------------------------------------------------------------ medidas
HZ = 1.88                       # centro do capacete
HEAD = (0.70, 0.58, 0.60)
VIS_C = (0.0, -0.115, HZ - 0.02)
SCR_Y = -0.618                  # frente do visor
SCR_W, SCR_H = 0.76, 0.52       # area util do rosto
SH = {1: Vector((0.50, 0.0, 1.10)), -1: Vector((-0.50, 0.0, 1.10))}
EL = {s: Vector((s * 0.63, 0.0, 0.85)) for s in (1, -1)}
WR = {s: Vector((s * 0.69, -0.02, 0.61)) for s in (1, -1)}
HIP = {s: Vector((s * 0.21, 0.0, 0.58)) for s in (1, -1)}
KNEE = {s: Vector((s * 0.215, 0.0, 0.40)) for s in (1, -1)}
SIDE = {1: 'L', -1: 'R'}

# ------------------------------------------------------------ cabeca
put('head', superell('capacete', HEAD, (0, 0, HZ), WHITE, n=2.4, seg=96))
put('head', superell('aro_visor', (0.625, 0.50, 0.48), (0, -0.095, HZ - 0.02), BLUE, n=3.2, seg=96))
put('head', superell('visor', (0.59, 0.50, 0.445), VIS_C, VISOR, n=3.2, seg=96))
for s in (1, -1):
    put('head', cyl('fone', 0.205, 0.13, (s * 0.685, 0, HZ - 0.02), BLUE, axis='X', bev=0.03))
    put('head', cyl('fone_aro', 0.225, 0.035, (s * 0.665, 0, HZ - 0.02), CHROME, axis='X', bev=0.012))
    put('head', cyl('fone_tampa', 0.115, 0.10, (s * 0.745, 0, HZ - 0.02), ORANGE, axis='X', bev=0.03))
    put('head', sphere('fone_led', 0.035, (s * 0.80, 0, HZ - 0.02), CYAN, seg=24))
    # olhos 3D (para o .glb / .blend); no app o rosto e desenhado por cima
    eye = prism('olho', rrect_outline(0.14, 0.21, 0.07, 10), 0.02, EYE, (s * 0.17, SCR_Y - 0.004, HZ + 0.03), bev=0.006)
    eye.hide_render = True
    put('head', eye)
# faixa azul no alto do capacete + base da antena
TOP = HZ + HEAD[2]
put('head', lathe('antena_base', [(0.12, 0.0), (0.12, 0.03), (0.08, 0.075), (0.04, 0.10), (0, 0.10)], CHROME, (0, 0, TOP - 0.02)))
# antena (mola + estrela)
put('ant', cone('antena_haste', (0, 0, TOP + 0.04), (0, 0, TOP + 0.30), 0.026, 0.020, CHROME))
for i in range(4):
    put('ant', cyl('antena_anel', 0.042, 0.022, (0, 0, TOP + 0.09 + i * 0.05), ORANGE, bev=0.008, seg=24))
put('ant', prism('antena_estrela', star_outline(0.17, 0.085, 5), 0.07, STAR, (0, 0, TOP + 0.43), bev=0.022, segs=3))

# ------------------------------------------------------------ corpo
put('body', cyl('pescoco', 0.15, 0.14, (0, 0, 1.29), VISOR))
put('body', cyl('gola', 0.215, 0.05, (0, 0, 1.25), CHROME, bev=0.018))
put('body', superell('tronco', (0.45, 0.36, 0.37), (0, 0, 0.93), WHITE, n=2.7, seg=80))
put('body', superell('quadril', (0.35, 0.285, 0.17), (0, 0, 0.62), BLUE, n=2.8, seg=64))
put('body', superell('cinto', (0.40, 0.325, 0.045), (0, 0, 0.705), ORANGE, n=2.7, seg=64))
# peito: placa azul, estrela acesa e luzinhas
put('body', prism('peito', rrect_outline(0.46, 0.34, 0.12, 12), 0.10, BLUE, (0, -0.315, 0.99), bev=0.03, segs=4))
put('body', prism('peito_estrela', star_outline(0.105, 0.052, 5), 0.04, STAR, (0, -0.372, 1.005), bev=0.012))
put('body', sphere('led_a', 0.026, (-0.15, -0.362, 0.885), CYAN, seg=20))
put('body', sphere('led_b', 0.026, (0.15, -0.362, 0.885), CYAN, seg=20))
put('body', rbox('fenda', (0.14, 0.03, 0.028), (0, -0.362, 0.885), 0.011, VISOR))
# mochila a jato
put('body', rbox('mochila', (0.52, 0.16, 0.36), (0, 0.33, 0.97), 0.07, BLUE, segs=5))
for s in (1, -1):
    put('body', capsule('tanque', (s * 0.15, 0.43, 0.84), (s * 0.15, 0.43, 1.10), 0.115, WHITE))
    put('body', cyl('tanque_faixa', 0.123, 0.07, (s * 0.15, 0.43, 0.98), ORANGE, bev=0.015))
    put('body', cone('bocal', (s * 0.15, 0.43, 0.66), (s * 0.15, 0.43, 0.76), 0.105, 0.065, CHROME, bev=0.012))
    put('flame', cone('chama', (s * 0.15, 0.43, 0.24), (s * 0.15, 0.43, 0.67), 0.004, 0.085, FLAME_O))
    put('flame', cone('chama_dentro', (s * 0.15, 0.43, 0.42), (s * 0.15, 0.43, 0.675), 0.003, 0.05, FLAME_Y))

# ------------------------------------------------------------ bracos
for s in (1, -1):
    sd = SIDE[s]
    put('arm.' + sd, sphere('ombro', 0.125, SH[s], BLUE))
    put('arm.' + sd, stick('braco', SH[s], EL[s], 0.082, WHITE))
    put('arm.' + sd, sphere('cotovelo', 0.088, EL[s], DARK, seg=32))
    d = (WR[s] - EL[s]).normalized()
    put('fore.' + sd, cone('antebraco', EL[s] + d * 0.03, WR[s], 0.082, 0.118, WHITE, bev=0.03))
    put('fore.' + sd, cone('punho', WR[s] - d * 0.035, WR[s] + d * 0.045, 0.128, 0.128, ORANGE, bev=0.022))
    hc = WR[s] + d * 0.15
    hand = superell('mao', (0.118, 0.105, 0.135), hc, BLUE, n=2.5, seg=40)
    orient(hand, d, (0, 1, 0))
    put('hand.' + sd, hand)
    inward = Vector((-s, 0, 0))
    inward = (inward - inward.dot(d) * d).normalized()
    put('hand.' + sd, sphere('polegar', 0.052, hc + inward * 0.105 + Vector((0, -0.03, 0.02)), BLUE, seg=24))
    for k in (-1, 0, 1):
        put('hand.' + sd, sphere('dedo', 0.046, hc + d * 0.105 + Vector((0, k * 0.062, 0)), BLUE, seg=24))

# ------------------------------------------------------------ pernas
for s in (1, -1):
    sd = SIDE[s]
    put('leg.' + sd, sphere('anca', 0.105, HIP[s], DARK, seg=32))
    put('leg.' + sd, stick('coxa', HIP[s], KNEE[s], 0.095, WHITE))
    put('shin.' + sd, sphere('joelho', 0.10, KNEE[s], DARK, seg=32))
    x = s * 0.22
    put('shin.' + sd, cone('canela', (x, 0, 0.385), (x, 0, 0.20), 0.105, 0.135, WHITE, bev=0.03))
    put('shin.' + sd, cyl('bota_aro', 0.148, 0.05, (x, 0, 0.225), ORANGE, bev=0.018))
    put('shin.' + sd, superell('bota', (0.165, 0.245, 0.135), (x, -0.065, 0.165), BLUE, n=2.7, seg=48))
    put('shin.' + sd, rbox('sola', (0.34, 0.50, 0.075), (x, -0.065, 0.04), 0.035, ORANGE, segs=4))
    put('shin.' + sd, rbox('biqueira', (0.20, 0.10, 0.07), (x, -0.275, 0.115), 0.03, WHITE, segs=4))

# ------------------------------------------------------------ esqueleto
BONES = [('root', (0, 0, 0), None), ('body', (0, 0, 0.62), 'root'), ('head', (0, 0, 1.30), 'body'),
         ('ant', (0, 0, TOP), 'head'), ('flame', (0, 0.43, 0.68), 'body')]
for s in (1, -1):
    sd = SIDE[s]
    BONES += [('arm.' + sd, tuple(SH[s]), 'body'), ('fore.' + sd, tuple(EL[s]), 'arm.' + sd), ('hand.' + sd, tuple(WR[s]), 'fore.' + sd),
              ('leg.' + sd, tuple(HIP[s]), 'body'), ('shin.' + sd, tuple(KNEE[s]), 'leg.' + sd)]

ad = bpy.data.armatures.new('Tico_Esqueleto')
arm = bpy.data.objects.new('Tico', ad)
sc.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
arm.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
for name, head, parent in BONES:
    eb = ad.edit_bones.new(name)
    eb.head = head
    eb.tail = (head[0], head[1], head[2] + 0.12)
    eb.roll = 0.0
    if parent:
        eb.parent = ad.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
arm.show_in_front = True
bpy.context.view_layer.update()

for bname, obs in PARTS.items():
    b = ad.bones[bname]
    pm = arm.matrix_world @ b.matrix_local @ Matrix.Translation((0, b.length, 0))
    for o in obs:
        o.parent = arm
        o.parent_type = 'BONE'
        o.parent_bone = bname
        o.matrix_parent_inverse = pm.inverted()
ALL = [o for obs in PARTS.values() for o in obs]

for pb in arm.pose.bones:
    pb.rotation_mode = 'QUATERNION'
BREST = {b.name: b.matrix_local.to_3x3() for b in ad.bones}

# ------------------------------------------------------------ animacoes
SHORT = {'body': 'body', 'head': 'head', 'ant': 'ant', 'aL': 'arm.L', 'aR': 'arm.R', 'fL': 'fore.L', 'fR': 'fore.R',
         'hL': 'hand.L', 'hR': 'hand.R', 'lL': 'leg.L', 'lR': 'leg.R', 'sL': 'shin.L', 'sR': 'shin.R', 'root': 'root'}
_last = {}


def key(frame, z=0.0, x=0.0, flame=0.0, **rots):
    """Quadro-chave: rotacoes em graus (eixos do robo), z/x = deslocamento do corpo todo, flame = chama."""
    for short, bname in SHORT.items():
        pb = arm.pose.bones[bname]
        r = rots.get(short, (0, 0, 0))
        B = BREST[bname]
        R = Euler((radians(r[0]), radians(r[1]), radians(r[2])), 'XYZ').to_matrix()
        q = (B.inverted() @ R @ B).to_quaternion()
        lq = _last.get(bname)
        if lq is not None and lq.dot(q) < 0:
            q.negate()
        _last[bname] = q.copy()
        pb.rotation_quaternion = q
        pb.keyframe_insert('rotation_quaternion', frame=frame)
    root = arm.pose.bones['root']
    root.location = BREST['root'].inverted() @ Vector((x, 0, z))
    root.keyframe_insert('location', frame=frame)
    fl = arm.pose.bones['flame']
    f = max(flame, 0.001)
    fl.scale = (f, f, f)
    fl.keyframe_insert('scale', frame=frame)


ACTIONS = {}


def action(name, frames, loop):
    _last.clear()
    act = bpy.data.actions.new('Tico_' + name)
    act.use_fake_user = True
    if arm.animation_data is None:
        arm.animation_data_create()
    arm.animation_data.action = act
    ACTIONS[name] = dict(act=act, n=frames, loop=loop)
    return act


def use(name):
    a = ACTIONS[name]['act']
    arm.animation_data.action = a
    try:
        if a.slots:
            arm.animation_data.action_slot = a.slots[0]
    except Exception as e:
        print('  [slot]', e)


# pose de descanso animada (base de quase tudo)
REST = dict(aL=(0, -4, 0), aR=(0, 4, 0))

# --- parado: respira, balanca de leve
action('idle', 30, True)
key(0, **REST)
key(8, z=0.022, head=(0, 2.5, 0), ant=(0, -7, 0), aL=(0, -9, 0), aR=(0, 7, 0), body=(0, 0.8, 0))
key(15, z=0.004, head=(1.5, 0, 0), ant=(0, 3, 0), **REST)
key(23, z=0.022, head=(0, -2.5, 0), ant=(0, 7, 0), aL=(0, -7, 0), aR=(0, 9, 0), body=(0, -0.8, 0))
key(30, **REST)

# --- acenar (ola!)
action('wave', 30, False)
key(0, **REST)
key(5, z=0.03, body=(0, -2, 0), head=(0, -6, 4), ant=(0, -12, 0), aL=(0, -108, -18), fL=(0, -52, 0), hL=(0, -10, 0), aR=(0, 8, 0))
key(9, z=0.03, body=(0, -2, 0), head=(0, -7, 4), ant=(0, 6, 0), aL=(0, -112, -18), fL=(0, -14, 0), hL=(0, 14, 0), aR=(0, 8, 0))
key(13, z=0.03, body=(0, -2, 0), head=(0, -6, 4), ant=(0, -8, 0), aL=(0, -108, -18), fL=(0, -54, 0), hL=(0, -12, 0), aR=(0, 8, 0))
key(17, z=0.03, body=(0, -2, 0), head=(0, -7, 4), ant=(0, 6, 0), aL=(0, -112, -18), fL=(0, -14, 0), hL=(0, 14, 0), aR=(0, 8, 0))
key(21, z=0.03, body=(0, -2, 0), head=(0, -6, 4), ant=(0, -8, 0), aL=(0, -108, -18), fL=(0, -52, 0), hL=(0, -10, 0), aR=(0, 8, 0))
key(26, z=0.01, head=(0, 2, 0), ant=(0, 5, 0), aL=(0, -40, 0), fL=(0, -20, 0), aR=(0, 5, 0))
key(30, **REST)

# --- falar: gestos com as maos
action('talk', 30, True)
key(0, **REST)
key(7, z=0.02, body=(0, 1.5, 3), head=(3, 2, 3), ant=(0, -6, 0), aL=(-42, -22, 0), fL=(-58, 0, 0), hL=(-15, 0, 0), aR=(6, 6, 0))
key(11, z=0.012, body=(0, 1.5, 3), head=(-2, 2, 3), ant=(0, 4, 0), aL=(-34, -26, 0), fL=(-44, 0, 0), hL=(10, 0, 0), aR=(6, 6, 0))
key(15, z=0.0, head=(2, 0, 0), ant=(0, 2, 0), aL=(-6, -6, 0), aR=(-6, 6, 0))
key(22, z=0.02, body=(0, -1.5, -3), head=(3, -2, -3), ant=(0, 6, 0), aR=(-42, 22, 0), fR=(-58, 0, 0), hR=(-15, 0, 0), aL=(6, -6, 0))
key(26, z=0.012, body=(0, -1.5, -3), head=(-2, -2, -3), ant=(0, -4, 0), aR=(-34, 26, 0), fR=(-44, 0, 0), hR=(10, 0, 0), aL=(6, -6, 0))
key(30, **REST)

# --- ouvir: mao no fone, cabeca inclinada
LIS = dict(aL=(0, -110, -22), fL=(0, -44, 0), hL=(0, 6, 0), aR=(0, 6, 0))
action('listen', 24, True)
key(0, body=(0, 4, 0), head=(0, 9, 5), ant=(0, -4, 0), **LIS)
key(6, z=0.018, body=(0, 5, 0), head=(2, 11, 5), ant=(0, -10, 0), aL=(0, -112, -22), fL=(0, -46, 0), hL=(0, 6, 0), aR=(0, 9, 0))
key(12, body=(0, 4, 0), head=(0, 9, 5), ant=(0, 2, 0), **LIS)
key(18, z=0.018, body=(0, 5, 0), head=(-1, 11, 5), ant=(0, -8, 0), aL=(0, -108, -22), fL=(0, -42, 0), hL=(0, 6, 0), aR=(0, 9, 0))
key(24, body=(0, 4, 0), head=(0, 9, 5), ant=(0, -4, 0), **LIS)

# --- comemorar: agacha, pula com o jato, cai e da um pulinho
CROUCH = dict(lL=(-24, -6, 0), sL=(40, 0, 0), lR=(-24, 6, 0), sR=(40, 0, 0))
UP = dict(aL=(0, -116, -15), fL=(0, -18, 0), aR=(0, 116, 15), fR=(0, 18, 0))
action('happy', 30, False)
key(0, **REST)
key(4, z=0.03, body=(4, 0, 0), head=(6, 0, 0), ant=(-10, 0, 0), aL=(18, -14, 0), aR=(18, 14, 0), **CROUCH)
key(8, z=0.18, flame=1.0, head=(-7, 0, 0), ant=(14, 0, 0), lL=(4, -4, 0), lR=(4, 4, 0), **UP)
key(11, z=0.26, flame=1.1, head=(-8, 0, 0), ant=(4, 0, 0), aL=(0, -122, -15), fL=(0, -22, 0), aR=(0, 122, 15), fR=(0, 22, 0), lL=(-10, -8, 0), sL=(24, 0, 0), lR=(-10, 8, 0), sR=(24, 0, 0))
key(14, z=0.16, flame=0.5, head=(-3, 0, 0), ant=(-8, 0, 0), **UP)
key(17, z=0.03, body=(4, 0, 0), head=(5, 0, 0), ant=(-14, 0, 0), aL=(0, -70, 0), aR=(0, 70, 0), **CROUCH)
key(20, z=0.0, ant=(8, 0, 0), aL=(0, -30, 0), aR=(0, 30, 0))
key(23, z=0.12, flame=0.6, head=(-4, 0, 0), ant=(8, 0, 0), aL=(0, -108, -15), fL=(0, -28, 0), aR=(0, 108, 15), fR=(0, 28, 0))
key(27, z=0.01, body=(2, 0, 0), ant=(-8, 0, 0), aL=(0, -30, 0), aR=(0, 30, 0), lL=(-10, 0, 0), sL=(20, 0, 0), lR=(-10, 0, 0), sR=(20, 0, 0))
key(30, **REST)

# --- dancar
action('dance', 32, True)
DA = dict(z=0.0, x=0.05, body=(0, 6, 6), head=(0, 4, -4), ant=(0, -12, 0), aL=(0, -114, -15), fL=(0, -30, 0), aR=(-30, 30, 0), fR=(-70, 0, 0),
          lL=(0, -7, 0), lR=(-14, -7, 0), sR=(26, 0, 0))
DB = dict(z=0.0, x=-0.05, body=(0, -6, -6), head=(0, -4, 4), ant=(0, 12, 0), aR=(0, 114, 15), fR=(0, 30, 0), aL=(-30, -30, 0), fL=(-70, 0, 0),
          lR=(0, 7, 0), lL=(-14, 7, 0), sL=(26, 0, 0))
MID = dict(z=0.07, aL=(-20, -60, 0), fL=(-50, 0, 0), aR=(-20, 60, 0), fR=(-50, 0, 0), ant=(0, 0, 0))
key(0, **DA)
key(4, **dict(DA, z=0.05, ant=(0, 6, 0), hL=(0, 20, 0)))
key(8, **DA)
key(12, **MID)
key(16, **DB)
key(20, **dict(DB, z=0.05, ant=(0, -6, 0), hR=(0, -20, 0)))
key(24, **DB)
key(28, **MID)
key(32, **DA)

# --- voar com a mochila a jato
FLY = dict(body=(13, 0, 0), head=(-9, 0, 0), lL=(22, -5, 0), sL=(24, 0, 0), lR=(34, 5, 0), sR=(34, 0, 0))
action('fly', 24, True)
key(0, z=0.20, flame=1.0, ant=(12, 0, 0), aL=(16, -34, 0), fL=(-20, 0, 0), aR=(16, 34, 0), fR=(-20, 0, 0), **FLY)
key(3, z=0.215, flame=1.2, ant=(14, 3, 0), aL=(16, -37, 0), fL=(-20, 0, 0), aR=(16, 37, 0), fR=(-20, 0, 0), **FLY)
key(6, z=0.235, flame=0.9, ant=(10, 0, 0), aL=(18, -40, 0), fL=(-24, 0, 0), aR=(18, 40, 0), fR=(-24, 0, 0), **dict(FLY, body=(13, 1.5, 0)))
key(9, z=0.245, flame=1.2, ant=(8, -3, 0), aL=(18, -42, 0), fL=(-24, 0, 0), aR=(18, 42, 0), fR=(-24, 0, 0), **FLY)
key(12, z=0.24, flame=0.95, ant=(10, 0, 0), aL=(16, -40, 0), fL=(-20, 0, 0), aR=(16, 40, 0), fR=(-20, 0, 0), **dict(FLY, lL=(34, -5, 0), sL=(34, 0, 0), lR=(22, 5, 0), sR=(24, 0, 0)))
key(15, z=0.225, flame=1.2, ant=(14, 3, 0), aL=(16, -37, 0), fL=(-20, 0, 0), aR=(16, 37, 0), fR=(-20, 0, 0), **dict(FLY, lL=(34, -5, 0), sL=(34, 0, 0), lR=(22, 5, 0), sR=(24, 0, 0)))
key(18, z=0.205, flame=0.9, ant=(16, 0, 0), aL=(14, -32, 0), fL=(-18, 0, 0), aR=(14, 32, 0), fR=(-18, 0, 0), **dict(FLY, body=(13, -1.5, 0)))
key(21, z=0.195, flame=1.2, ant=(14, -3, 0), aL=(15, -32, 0), fL=(-18, 0, 0), aR=(15, 32, 0), fR=(-18, 0, 0), **FLY)
key(24, z=0.20, flame=1.0, ant=(12, 0, 0), aL=(16, -34, 0), fL=(-20, 0, 0), aR=(16, 34, 0), fR=(-20, 0, 0), **FLY)

ORDER = ['idle', 'wave', 'talk', 'listen', 'happy', 'dance', 'fly']

# ------------------------------------------------------------ camara / luz
CZ = 1.58
TILT = radians(3.0)
D = 16.0
cam = camera(sc, (0, -D * cos(TILT), CZ + D * sin(TILT)), (0, 0, CZ), lens=110)
bmf = bmesh.new()
for px in (-1.34, 1.34):
    for pz in (-0.07, 3.33):
        bmf.verts.new((px, 0, pz))
me = bpy.data.meshes.new('moldura'); bmf.to_mesh(me); bmf.free()
frame_ob = bpy.data.objects.new('moldura', me)
sc.collection.objects.link(frame_ob)
fit_camera(sc, cam, [frame_ob], fill_w=1.0, fill_h=1.0)
bpy.data.objects.remove(frame_ob)
studio((0, 0, 1.5), 7.5, toward_cam=(0, -1, 0), power=0.40)
area('contra_azul', (-4.5, 4.0, 2.6), (0, 0, 1.5), 900, 3.0, (0.45, 0.65, 1.0))

# pontos do rosto (no osso da cabeca): cima-esq, cima-dir, baixo-esq
FACE_PTS = [Vector((-SCR_W / 2, SCR_Y, HZ - 0.02 + SCR_H / 2)), Vector((SCR_W / 2, SCR_Y, HZ - 0.02 + SCR_H / 2)),
            Vector((-SCR_W / 2, SCR_Y, HZ - 0.02 - SCR_H / 2))]


def face_now():
    bpy.context.view_layer.update()
    pb = arm.pose.bones['head']
    M = arm.matrix_world @ pb.matrix @ ad.bones['head'].matrix_local.inverted()
    out = []
    for p in FACE_PTS:
        c = world_to_camera_view(sc, cam, M @ p)
        out += [round(c.x, 4), round(1.0 - c.y, 4)]
    return out


# ------------------------------------------------------------ saida
if MODE == 'preview':
    shots = [('idle', 0), ('idle', 8), ('wave', 9), ('wave', 13), ('talk', 7), ('listen', 6), ('happy', 4), ('happy', 11), ('dance', 0), ('dance', 16), ('fly', 6)]
    if len(ARGS) > 2:
        shots = [(a.split(':')[0], int(a.split(':')[1])) for a in ARGS[2:]]
    for name, f in shots:
        use(name)
        sc.frame_set(f)
        print('FACE', name, f, face_now())
        render(sc, os.path.join(TMP, 'prev_%s_%02d.png' % (name, f)))
else:
    meta = {'w': W, 'h': H, 'fps': 15, 'cols': 8, 'anims': {}}
    for name in ORDER:
        a = ACTIONS[name]
        use(name)
        faces = []
        for f in range(a['n']):
            sc.frame_set(f)
            faces.append(face_now())
            render(sc, os.path.join(TMP, '%s_%03d.png' % (name, f)))
        meta['anims'][name] = {'n': a['n'], 'loop': a['loop'], 'face': faces}
    with open(os.path.join(TMP, 'tico.json'), 'w', encoding='utf-8') as fjs:
        json.dump(meta, fjs)
    # arquivos 3D: .blend (com o esqueleto e as acoes) e .glb (com as animacoes)
    use('idle')
    sc.frame_set(0)
    sc.frame_start, sc.frame_end = 0, 30
    sc.render.fps = 15
    for o in ALL:
        o.hide_render = False
    try:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'tico.blend'), compress=True)
        print('BLEND ok')
    except Exception as e:
        print('BLEND falhou', e)
    try:
        bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'tico.glb'), export_format='GLB', export_apply=True,
                                  export_animations=True, export_animation_mode='ACTIONS', export_cameras=False, export_lights=False,
                                  export_yup=True)
        print('GLB ok')
    except Exception as e:
        print('GLB falhou', e)
print('TICO FIM')
