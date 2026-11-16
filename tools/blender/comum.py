# -*- coding: utf-8 -*-
"""Funcoes comuns aos renders 3D (letras e blocos) - Blender 5.x, sem interface.

Caixa dos tracados (js/strokes.js): x 0..100, y 0..120 com y PARA BAIXO (SVG).
No Blender: X = x, Z = -y (para cima), camera olhando ao longo de +Y, entao a
letra fica em pe e NAO espelhada.  Tudo e multiplicado por U (1 unidade = 1 cm).
"""
import json
import math
import os
import re

import bpy
import bmesh
from mathutils import Vector

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..'))
U = 0.01                      # 1 unidade do tracado = 0.01 m
VOGAIS = set('AEIOUaeiou')
COR_VOGAL = '#ff4d6d'
COR_CONSOANTE = '#2f7bff'


# --------------------------------------------------------------------------
#  Tracados
# --------------------------------------------------------------------------
def carregar_tracos():
    with open(os.path.join(AQUI, 'strokes.json'), encoding='utf-8') as f:
        return json.load(f)


def _segmentos(d):
    """Caminho SVG (M/L/C absolutos) -> lista de ('L',p0,p1) / ('C',p0,c1,c2,p3)."""
    tok = re.findall(r'[MLC]|-?\d+\.?\d*', d)
    segs, cur, i, cmd = [], None, 0, None
    while i < len(tok):
        if tok[i] in 'MLC':
            cmd = tok[i]
            i += 1
            continue
        if cmd == 'M':
            cur = (float(tok[i]), float(tok[i + 1]))
            i += 2
            cmd = 'L'            # pares seguintes a um M viram L (regra do SVG)
        elif cmd == 'L':
            p = (float(tok[i]), float(tok[i + 1]))
            i += 2
            segs.append(('L', cur, p))
            cur = p
        elif cmd == 'C':
            c1 = (float(tok[i]), float(tok[i + 1]))
            c2 = (float(tok[i + 2]), float(tok[i + 3]))
            p = (float(tok[i + 4]), float(tok[i + 5]))
            i += 6
            segs.append(('C', cur, c1, c2, p))
            cur = p
        else:
            raise ValueError('comando SVG inesperado: ' + d)
    return segs


def _cubica(p0, c1, c2, p3, t):
    m = 1.0 - t
    a, b, c, e = m * m * m, 3 * m * m * t, 3 * m * t * t, t * t * t
    return (a * p0[0] + b * c1[0] + c * c2[0] + e * p3[0],
            a * p0[1] + b * c1[1] + c * c2[1] + e * p3[1])


def _pontos(seg, n=28):
    if seg[0] == 'L':
        return [seg[1], seg[2]]
    return [_cubica(seg[1], seg[2], seg[3], seg[4], k / n) for k in range(n + 1)]


def _dir(a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy) or 1.0
    return (dx / L, dy / L)


def _tangentes(seg):
    """(tangente no inicio, tangente no fim) de um segmento."""
    pts = [seg[1], seg[2]] if seg[0] == 'L' else [seg[1], seg[2], seg[3], seg[4]]
    ini = next((_dir(pts[0], p) for p in pts[1:] if p != pts[0]), (1, 0))
    fim = next((_dir(p, pts[-1]) for p in reversed(pts[:-1]) if p != pts[-1]), (1, 0))
    return ini, fim


def analisar(d):
    """Um traco -> dict com:
       pingo : True se for o pingo do i/j (comprimento < 4)
       trechos : lista de polilinhas suaves (quebradas nas quinas)
       pts : todos os pontos da linha de centro (para a caixa)
    """
    segs = _segmentos(d)
    todos, comp = [], 0.0
    for s in segs:
        p = _pontos(s, 64)
        for a, b in zip(p, p[1:]):
            comp += math.hypot(b[0] - a[0], b[1] - a[1])
        todos += p
    if comp < 4:
        cx = sum(p[0] for p in todos) / len(todos)
        cy = sum(p[1] for p in todos) / len(todos)
        return {'pingo': True, 'centro': (cx, cy), 'trechos': [], 'pts': todos}
    trechos, atual, tfim = [], [], None
    for s in segs:
        tini, tf = _tangentes(s)
        p = _pontos(s)
        if atual and tfim is not None:
            cosang = tini[0] * tfim[0] + tini[1] * tfim[1]
            if cosang < math.cos(math.radians(12)):      # quina -> novo trecho
                trechos.append(atual)
                atual = []
        atual = (atual + p[1:]) if atual else list(p)
        tfim = tf
    if atual:
        trechos.append(atual)
    return {'pingo': False, 'trechos': trechos, 'pts': todos}


def caixa(tracos):
    """Caixa das LINHAS DE CENTRO (sem espessura), em unidades do tracado."""
    xs, ys = [], []
    for d in tracos:
        for p in analisar(d)['pts']:
            xs.append(p[0])
            ys.append(p[1])
    return min(xs), max(xs), min(ys), max(ys)


# --------------------------------------------------------------------------
#  Cena / materiais / luz
# --------------------------------------------------------------------------
def hex_linear(h):
    h = h.lstrip('#')
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (out[0], out[1], out[2], 1.0)


def limpar_cena():
    """Esvazia a cena atual SEM tocar nas preferencias do Blender.
    (Nao usar read_factory_settings: ele desliga as extensoes do usuario e o
    Blender apaga as bibliotecas delas, ex. Bonsai, que so voltam no proximo
    inicio normal.)"""
    scene = bpy.context.scene
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    for col in (bpy.data.meshes, bpy.data.curves, bpy.data.lights, bpy.data.cameras,
                bpy.data.materials):
        for item in list(col):
            if item.users == 0:
                col.remove(item)
    r = scene.render
    r.use_border = False
    r.use_compositing = False
    r.use_sequencer = False
    r.pixel_aspect_x = r.pixel_aspect_y = 1.0
    vs = scene.view_settings
    vs.exposure, vs.gamma = 0.0, 1.0
    try:
        vs.use_curve_mapping = False
        scene.display_settings.display_device = 'sRGB'
    except Exception:
        pass
    return scene


def configurar_render(scene, w, h, amostras=64):
    for eng in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
        try:
            scene.render.engine = eng
            break
        except TypeError:
            continue
    r = scene.render
    r.resolution_x, r.resolution_y, r.resolution_percentage = w, h, 100
    r.film_transparent = True
    r.dither_intensity = 0.0
    try:
        r.image_settings.media_type = 'IMAGE'
    except Exception:
        pass
    r.image_settings.file_format = 'PNG'
    r.image_settings.color_mode = 'RGBA'
    r.image_settings.color_depth = '8'
    r.image_settings.compression = 100
    scene.view_settings.view_transform = 'Standard'
    try:
        scene.view_settings.look = 'None'
    except Exception:
        pass
    ee = scene.eevee
    for nome, val in (('taa_render_samples', amostras), ('use_shadows', True),
                      ('use_gtao', True), ('use_raytracing', False)):
        if hasattr(ee, nome):
            try:
                setattr(ee, nome, val)
            except Exception:
                pass


def material_plastico(nome, cor_hex, rugosidade=0.22, verniz=1.0, cor_linear=None):
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = cor_linear or hex_linear(cor_hex)
    b.inputs['Roughness'].default_value = rugosidade
    for nome_in, val in (('Coat Weight', verniz), ('Coat Roughness', 0.16),
                         ('Specular IOR Level', 0.5), ('IOR', 1.46)):
        if nome_in in b.inputs:
            b.inputs[nome_in].default_value = val
    return m


def mundo_estudio(scene, forca=1.0):
    """Ambiente de estudio: degrade claro em cima / mais escuro embaixo."""
    w = bpy.data.worlds.new('estudio')
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputWorld')
    bg = nt.nodes.new('ShaderNodeBackground')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    mp = nt.nodes.new('ShaderNodeMapRange')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    nt.links.new(sep.outputs['Z'], mp.inputs[0])
    mp.inputs[1].default_value = -1.0
    mp.inputs[2].default_value = 1.0
    nt.links.new(mp.outputs[0], ramp.inputs[0])
    e = ramp.color_ramp.elements
    e[0].position, e[0].color = 0.0, (0.30, 0.31, 0.36, 1)
    e[1].position, e[1].color = 1.0, (1.0, 1.0, 1.0, 1)
    meio = ramp.color_ramp.elements.new(0.5)
    meio.color = (0.62, 0.63, 0.68, 1)
    nt.links.new(ramp.outputs[0], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = forca
    nt.links.new(bg.outputs[0], out.inputs[0])
    scene.world = w
    return w


def luz_area(scene, nome, pos, alvo, potencia, tamanho, cor=(1, 1, 1), sombra=True,
             difusa=1.0, especular=1.0):
    L = bpy.data.lights.new(nome, 'AREA')
    L.energy = potencia
    L.diffuse_factor = difusa
    L.specular_factor = especular
    L.shape = 'DISK'
    L.size = tamanho
    L.color = cor
    try:
        L.use_shadow = sombra
    except Exception:
        pass
    ob = bpy.data.objects.new(nome, L)
    ob.location = pos
    d = Vector(alvo) - Vector(pos)
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    scene.collection.objects.link(ob)
    return ob


def camera_orto(scene, nome='cam'):
    cam = bpy.data.cameras.new(nome)
    cam.type = 'ORTHO'
    cam.sensor_fit = 'VERTICAL'
    cam.clip_start, cam.clip_end = 0.01, 100.0
    ob = bpy.data.objects.new(nome, cam)
    scene.collection.objects.link(ob)
    scene.camera = ob
    return ob


# --------------------------------------------------------------------------
#  Geometria da letra (tubos redondos + esferas nas pontas/quinas/pingos)
# --------------------------------------------------------------------------
def _esfera(scene, nome, centro, raio, mat, seg=48):
    me = bpy.data.meshes.new(nome)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=raio)
    for f in bm.faces:
        f.smooth = True
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    ob = bpy.data.objects.new(nome, me)
    ob.location = centro
    # polos no eixo Y (para a camera), assim o contorno de frente fica liso
    ob.rotation_euler = (math.radians(90), 0, 0)
    scene.collection.objects.link(ob)
    return ob


def construir_letra(scene, tracos, mat, mapa, raio=6.0, raio_pingo=6.5, prefixo='L'):
    """Cria a letra.  mapa(x, y) -> Vector 3D (em metros) da linha de centro;
    raio / raio_pingo ja em metros.  Devolve a lista de objetos criados."""
    objs = []
    cu = bpy.data.curves.new(prefixo + '_tubos', 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = raio
    cu.bevel_resolution = 14
    cu.use_fill_caps = True
    cu.twist_mode = 'MINIMUM'
    pontas = []
    for d in tracos:
        a = analisar(d)
        if a['pingo']:
            objs.append(_esfera(scene, prefixo + '_pingo', mapa(*a['centro']), raio_pingo, mat))
            continue
        for tr in a['trechos']:
            sp = cu.splines.new('POLY')
            sp.points.add(len(tr) - 1)
            for pt, (x, y) in zip(sp.points, tr):
                v = mapa(x, y)
                pt.co = (v.x, v.y, v.z, 1.0)
            sp.use_smooth = True
            pontas.append(tr[0])
            pontas.append(tr[-1])
    cu.materials.append(mat)
    ob = bpy.data.objects.new(prefixo + '_tubos', cu)
    scene.collection.objects.link(ob)
    objs.append(ob)
    vistos = set()
    for (x, y) in pontas:                       # pontas e quinas arredondadas
        k = (round(x, 3), round(y, 3))
        if k in vistos:
            continue
        vistos.add(k)
        objs.append(_esfera(scene, prefixo + '_ponta', mapa(x, y), raio, mat))
    return objs


def remover(objs):
    for ob in objs:
        dados = ob.data
        bpy.data.objects.remove(ob, do_unlink=True)
        if dados is not None and dados.users == 0:
            if isinstance(dados, bpy.types.Mesh):
                bpy.data.meshes.remove(dados)
            elif isinstance(dados, bpy.types.Curve):
                bpy.data.curves.remove(dados)
