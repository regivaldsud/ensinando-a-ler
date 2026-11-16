# av_common.py - helpers partilhados pelos scripts av_* (Blender 5.x, headless)
import bpy, bmesh, math, os, json
from math import sin, cos, pi, radians, sqrt
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))


def _s2l(v):
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4


def hexc(h, a=1.0):
    h = h.lstrip('#')
    return (_s2l(int(h[0:2], 16) / 255), _s2l(int(h[2:4], 16) / 255), _s2l(int(h[4:6], 16) / 255), a)


def _try(obj, attr, val):
    try:
        setattr(obj, attr, val)
        return True
    except Exception as e:
        print('  [skip]', attr, e)
        return False


def reset(w, h, samples=64):
    # NAO usar read_factory_settings: desliga as extensoes do utilizador e o Blender
    # apaga as bibliotecas delas (ex. Bonsai). Limpa-se a cena a mao.
    sc = bpy.context.scene
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    for col in (bpy.data.meshes, bpy.data.curves, bpy.data.lights, bpy.data.cameras,
                bpy.data.materials, bpy.data.worlds, bpy.data.images):
        for item in list(col):
            if item.users == 0:
                col.remove(item)
    sc.world = None
    for wd in list(bpy.data.worlds):
        if wd.users == 0:
            bpy.data.worlds.remove(wd)
    r = sc.render
    r.use_border = False
    r.use_compositing = False
    r.use_sequencer = False
    r.pixel_aspect_x = r.pixel_aspect_y = 1.0
    r.filter_size = 1.5
    r.dither_intensity = 0.0
    vs = sc.view_settings
    vs.exposure, vs.gamma = 0.0, 1.0
    _try(vs, 'use_curve_mapping', False)
    _try(sc.display_settings, 'display_device', 'sRGB')
    sc.frame_set(1)
    for eng in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
        try:
            sc.render.engine = eng
            break
        except Exception:
            pass
    r = sc.render
    r.resolution_x, r.resolution_y, r.resolution_percentage = w, h, 100
    r.film_transparent = True
    r.image_settings.file_format = 'PNG'
    r.image_settings.color_mode = 'RGBA'
    r.image_settings.color_depth = '8'
    r.image_settings.compression = 100
    _try(sc.view_settings, 'view_transform', 'Standard')
    _try(sc.view_settings, 'look', 'None')
    ee = sc.eevee
    _try(ee, 'taa_render_samples', samples)
    _try(ee, 'use_raytracing', True)
    _try(ee, 'ray_tracing_method', 'SCREEN')
    _try(ee, 'fast_gi_method', 'AMBIENT_OCCLUSION_ONLY')
    _try(ee, 'use_shadows', True)
    try:
        _try(ee.ray_tracing_options, 'trace_max_roughness', 0.5)
    except Exception:
        pass
    _try(ee, 'fast_gi_distance', 0.6)
    return sc


def set_res(sc, w, h):
    sc.render.resolution_x, sc.render.resolution_y = w, h


def world(sc, strength=1.0, stops=None, boxes=None):
    w = bpy.data.worlds.new('AVWorld')
    sc.world = w
    try:
        w.use_nodes = True
    except Exception:
        pass
    nt = w.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputWorld')
    bg = nt.nodes.new('ShaderNodeBackground')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    mr = nt.nodes.new('ShaderNodeMapRange')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    mr.inputs[1].default_value = -1.0
    mr.inputs[2].default_value = 1.0
    nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    nt.links.new(sep.outputs['Z'], mr.inputs[0])
    nt.links.new(mr.outputs[0], ramp.inputs[0])
    col = ramp.outputs[0]
    # "softboxes" procedurais: manchas claras no ambiente para os metais reflectirem
    for (d, lo, hi, inten) in (boxes or []):
        dv = Vector(d).normalized()
        dot = nt.nodes.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'
        nrm = nt.nodes.new('ShaderNodeVectorMath'); nrm.operation = 'NORMALIZE'
        nt.links.new(tc.outputs['Generated'], nrm.inputs[0])
        nt.links.new(nrm.outputs[0], dot.inputs[0])
        dot.inputs[1].default_value = dv
        m2 = nt.nodes.new('ShaderNodeMapRange')
        _try(m2, 'interpolation_type', 'SMOOTHSTEP')
        m2.inputs[1].default_value = lo
        m2.inputs[2].default_value = hi
        m2.inputs[3].default_value = 0.0
        m2.inputs[4].default_value = inten
        nt.links.new(dot.outputs['Value'], m2.inputs[0])
        addn = nt.nodes.new('ShaderNodeVectorMath'); addn.operation = 'ADD'
        nt.links.new(col, addn.inputs[0])
        nt.links.new(m2.outputs[0], addn.inputs[1])
        col = addn.outputs[0]
    nt.links.new(col, bg.inputs['Color'])
    nt.links.new(bg.outputs[0], out.inputs['Surface'])
    bg.inputs['Strength'].default_value = strength
    if stops is None:
        stops = [(0.0, (0.30, 0.28, 0.27)), (0.44, (0.42, 0.42, 0.45)), (0.52, (0.95, 0.95, 1.0)),
                 (0.66, (0.50, 0.55, 0.65)), (1.0, (1.0, 1.0, 1.0))]
    els = ramp.color_ramp.elements
    while len(els) < len(stops):
        els.new(0.5)
    for e, (p, c) in zip(els, stops):
        e.position = p
        e.color = (c[0], c[1], c[2], 1.0)
    return w


# ---------------------------------------------------------------- materials
def _principled(name):
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    b = None
    for n in nt.nodes:
        if n.type == 'BSDF_PRINCIPLED':
            b = n
    if b is None:
        nt.nodes.clear()
        out = nt.nodes.new('ShaderNodeOutputMaterial')
        b = nt.nodes.new('ShaderNodeBsdfPrincipled')
        nt.links.new(b.outputs[0], out.inputs['Surface'])
    return m, b


def _in(b, name, val):
    if name in b.inputs:
        b.inputs[name].default_value = val


def plastic(name, col, rough=0.33, coat=0.3, spec=0.5):
    m, b = _principled(name)
    _in(b, 'Base Color', hexc(col) if isinstance(col, str) else col)
    _in(b, 'Roughness', rough)
    _in(b, 'Metallic', 0.0)
    _in(b, 'Coat Weight', coat)
    _in(b, 'Coat Roughness', 0.12)
    _in(b, 'Specular IOR Level', spec)
    return m


def metal(name, col, rough=0.2, coat=0.0):
    m, b = _principled(name)
    _in(b, 'Base Color', hexc(col) if isinstance(col, str) else col)
    _in(b, 'Roughness', rough)
    _in(b, 'Metallic', 1.0)
    _in(b, 'Coat Weight', coat)
    return m


def emissive(name, col, strength=3.0, base=None):
    m, b = _principled(name)
    c = hexc(col)
    _in(b, 'Base Color', hexc(base) if base else c)
    _in(b, 'Emission Color', c)
    _in(b, 'Emission Strength', strength)
    _in(b, 'Roughness', 0.3)
    return m


def halo_mat(name, col, strength=2.5, power=2.5, amount=0.6):
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader')
    lw = nt.nodes.new('ShaderNodeLayerWeight')
    inv = nt.nodes.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0
    pw = nt.nodes.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = power
    mu = nt.nodes.new('ShaderNodeMath'); mu.operation = 'MULTIPLY'; mu.inputs[1].default_value = amount
    em.inputs['Color'].default_value = hexc(col)
    em.inputs['Strength'].default_value = strength
    lw.inputs['Blend'].default_value = 0.5
    nt.links.new(lw.outputs['Facing'], inv.inputs[1])
    nt.links.new(inv.outputs[0], pw.inputs[0])
    nt.links.new(pw.outputs[0], mu.inputs[0])
    nt.links.new(mu.outputs[0], mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    if not _try(m, 'surface_render_method', 'BLENDED'):
        _try(m, 'blend_method', 'BLEND')
    return m


# ---------------------------------------------------------------- geometry
def _obj(name, bm, mat=None, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1), smooth=True):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if smooth:
        me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = rot
    ob.scale = scale
    if mat is not None:
        me.materials.append(mat)
    return ob


def bevel(ob, width, segs=4, angle=30.0, wn=True):
    if width and width > 0:
        m = ob.modifiers.new('bev', 'BEVEL')
        m.width = width
        m.segments = segs
        m.limit_method = 'ANGLE'
        m.angle_limit = radians(angle)
    if wn:
        w = ob.modifiers.new('wn', 'WEIGHTED_NORMAL')
        w.keep_sharp = False
        w.weight = 60
    return ob


def _capfix(ob, bev):
    """cilindros: com bevel -> bevel + normais ponderadas; sem bevel -> tampas planas, lado liso."""
    if bev and bev > 0:
        return bevel(ob, bev, 3)
    for p in ob.data.polygons:
        if len(p.vertices) > 4:
            p.use_smooth = False
    return ob


def subsurf(ob, lv=2):
    m = ob.modifiers.new('sub', 'SUBSURF')
    m.levels = lv
    m.render_levels = lv
    return ob


def rbox(name, size, loc, r, mat, rot=(0, 0, 0), segs=5):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= size[0]; v.co.y *= size[1]; v.co.z *= size[2]
    ob = _obj(name, bm, mat, loc, rot)
    return bevel(ob, r, segs)


def sphere(name, r, loc, mat, scale=(1, 1, 1), rot=(0, 0, 0), seg=48):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=r)
    return _obj(name, bm, mat, loc, rot, scale)


def cyl(name, r, h, loc, mat, axis='Z', bev=0.0, r2=None, seg=48, rot=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r,
                          radius2=r if r2 is None else r2, depth=h)
    if rot is None:
        rot = {'Z': (0, 0, 0), 'X': (0, radians(90), 0), 'Y': (radians(90), 0, 0)}[axis]
    ob = _obj(name, bm, mat, loc, rot)
    return _capfix(ob, bev)


def stick(name, a, b, r, mat, bev=0.0, seg=32):
    a = Vector(a); b = Vector(b)
    d = b - a
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r, depth=d.length)
    ob = _obj(name, bm, mat, (a + b) / 2)
    ob.rotation_mode = 'QUATERNION'
    ob.rotation_quaternion = d.to_track_quat('Z', 'Y')
    return _capfix(ob, bev)


def lathe(name, profile, mat, loc=(0, 0, 0), rot=(0, 0, 0), seg=64, bev=0.0, scale=(1, 1, 1)):
    """profile: lista de (raio, z); revolucao em torno de Z."""
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        if r < 1e-6:
            rings.append([bm.verts.new((0, 0, z))])
        else:
            rings.append([bm.verts.new((r * cos(2 * pi * i / seg), r * sin(2 * pi * i / seg), z)) for i in range(seg)])
    for i in range(len(rings) - 1):
        a, b = rings[i], rings[i + 1]
        if len(a) == 1 and len(b) == 1:
            continue
        for j in range(seg):
            k = (j + 1) % seg
            if len(a) == 1:
                bm.faces.new((a[0], b[j], b[k]))
            elif len(b) == 1:
                bm.faces.new((a[k], a[j], b[0]))
            else:
                bm.faces.new((a[j], a[k], b[k], b[j]))
    ob = _obj(name, bm, mat, loc, rot, scale)
    return bevel(ob, bev, 3)


def rrect_outline(w, h, r, n=10):
    pts = []
    r = min(r, w / 2 - 1e-4, h / 2 - 1e-4)
    for cx, cy, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for i in range(n + 1):
            a = radians(a0 + 90 * i / n)
            pts.append((cx + r * cos(a), cy + r * sin(a)))
    return pts


def star_outline(R, r, n=5, rot=90.0):
    pts = []
    for i in range(2 * n):
        a = radians(rot) + pi * i / n
        rad = R if i % 2 == 0 else r
        pts.append((rad * cos(a), rad * sin(a)))
    return pts


def smooth_profile(pts, n=8):
    """Catmull-Rom por uma lista de (r, z); devolve lista densa."""
    P = [pts[0]] + list(pts) + [pts[-1]]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(n):
            t = k / n
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t
                                    + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t * t * t) for j in range(2)))
    out.append(tuple(pts[-1]))
    return [(max(r, 0.0), z) for r, z in out]


def circle_outline(r, n=40):
    return [(r * cos(2 * pi * i / n), r * sin(2 * pi * i / n)) for i in range(n)]


def prism(name, outline, depth, mat, loc=(0, 0, 0), rot=(0, 0, 0), bev=0.0, plane='XZ', segs=3, scale=(1, 1, 1)):
    """Extrusao de um contorno 2D. plane 'XZ' -> espessura em Y; 'XY' -> espessura em Z."""
    bm = bmesh.new()
    f = []; b = []
    for (u, v) in outline:
        if plane == 'XZ':
            f.append(bm.verts.new((u, -depth / 2, v)))
            b.append(bm.verts.new((u, depth / 2, v)))
        else:
            f.append(bm.verts.new((u, v, depth / 2)))
            b.append(bm.verts.new((u, v, -depth / 2)))
    n = len(outline)
    bm.faces.new(f)
    bm.faces.new(list(reversed(b)))
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((f[i], b[i], b[j], f[j]))
    ob = _obj(name, bm, mat, loc, rot, scale)
    return bevel(ob, bev, segs)


def tube(name, pts, r, mat, cyclic=False, res=16, bres=8, scale=(1, 1, 1), loc=(0, 0, 0), rot=(0, 0, 0)):
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    sp = cu.splines.new('BEZIER')
    sp.bezier_points.add(len(pts) - 1)
    for p, co in zip(sp.bezier_points, pts):
        p.co = co
        p.handle_left_type = p.handle_right_type = 'AUTO'
    sp.use_cyclic_u = cyclic
    cu.bevel_depth = r
    cu.bevel_resolution = bres
    cu.resolution_u = res
    cu.use_fill_caps = True
    ob = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc; ob.rotation_euler = rot; ob.scale = scale
    cu.materials.append(mat)
    return ob


def arc_pts(cx, cz, r, a0, a1, n=12, y=0.0):
    return [(cx + r * cos(radians(a0 + (a1 - a0) * i / n)), y, cz + r * sin(radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


def orient(ob, zdir, ydir=(0, 1, 0)):
    z = Vector(zdir).normalized()
    y = Vector(ydir)
    y = (y - y.dot(z) * z).normalized()
    x = y.cross(z)
    m = Matrix((x, y, z)).transposed()
    ob.rotation_mode = 'QUATERNION'
    ob.rotation_quaternion = m.to_quaternion()
    return ob


# ---------------------------------------------------------------- camera / lights
def camera(sc, loc, target, lens=85.0, ortho=None):
    cd = bpy.data.cameras.new('AVCam')
    ob = bpy.data.objects.new('AVCam', cd)
    sc.collection.objects.link(ob)
    if ortho:
        cd.type = 'ORTHO'
        cd.ortho_scale = ortho
    else:
        cd.lens = lens
    cd.clip_start = 0.1
    cd.clip_end = 500
    ob.location = loc
    d = Vector(target) - Vector(loc)
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    sc.camera = ob
    return ob


def area(name, loc, target, energy, size, color=(1, 1, 1)):
    ld = bpy.data.lights.new(name, 'AREA')
    ld.energy = energy
    ld.size = size
    ld.color = color
    ob = bpy.data.objects.new(name, ld)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    d = Vector(target) - Vector(loc)
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return ob


def studio(center, R, toward_cam=(0, -1, 0), up=(0, 0, 1), power=1.0):
    """Tres pontos (key/fill/rim) relativos a direcao da camara."""
    c = Vector(center); f = Vector(toward_cam).normalized(); u = Vector(up).normalized()
    rgt = u.cross(f)
    e = power * R * R

    def pos(a, b, cc):
        return c + (rgt * a + u * b + f * cc).normalized() * R
    area('key', pos(-0.7, 0.8, 0.9), c, 42 * e, R * 0.7, (1.0, 0.97, 0.92))
    area('fill', pos(0.95, 0.15, 0.75), c, 14 * e, R * 1.0, (0.90, 0.94, 1.0))
    area('rim', pos(0.45, 0.9, -0.9), c, 30 * e, R * 0.6, (1.0, 1.0, 1.0))
    area('front', pos(0.0, 0.1, 1.0), c, 6 * e, R * 1.2, (1.0, 1.0, 1.0))


def view_bounds(sc, cam, objs):
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    xs = []; ys = []
    for ob in objs:
        eo = ob.evaluated_get(dg)
        try:
            me = eo.to_mesh()
        except Exception:
            continue
        mw = eo.matrix_world
        for v in me.vertices:
            c = world_to_camera_view(sc, cam, mw @ v.co)
            xs.append(c.x); ys.append(c.y)
        eo.to_mesh_clear()
    return min(xs), max(xs), min(ys), max(ys)


def fit_camera(sc, cam, objs, fill_w=0.92, fill_h=0.92, iters=3, scale=True, cx_t=0.5, cy_t=0.5):
    cd = cam.data
    W, H = sc.render.resolution_x, sc.render.resolution_y
    m = max(W, H)
    for _ in range(iters):
        x0, x1, y0, y1 = view_bounds(sc, cam, objs)
        if scale:
            k = min(fill_w / (x1 - x0), fill_h / (y1 - y0))
            if cd.type == 'ORTHO':
                cd.ortho_scale /= k
            else:
                cd.lens *= k
            x0, x1, y0, y1 = view_bounds(sc, cam, objs)
        cd.shift_x += ((x0 + x1) / 2 - cx_t) * W / m
        cd.shift_y += ((y0 + y1) / 2 - cy_t) * H / m
    b = view_bounds(sc, cam, objs)
    print('FIT bounds x %.4f..%.4f  y %.4f..%.4f' % b)
    return b


def proj_bbox(sc, cam, pts):
    """bbox (fracoes, origem topo-esquerda) dos pontos de mundo projectados."""
    bpy.context.view_layer.update()
    xs = []; ys = []
    for p in pts:
        c = world_to_camera_view(sc, cam, Vector(p))
        xs.append(c.x); ys.append(1.0 - c.y)
    return {'x': round(min(xs), 4), 'y': round(min(ys), 4), 'w': round(max(xs) - min(xs), 4), 'h': round(max(ys) - min(ys), 4)}


def render(sc, path):
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print('RENDER', path)


def show_only(groups, active):
    vis = set()
    for name, objs in groups.items():
        if name == active or name == '*':
            vis.update(o.name for o in objs)
    for name, objs in groups.items():
        for o in objs:
            o.hide_render = o.name not in vis
