# -*- coding: utf-8 -*-
"""Renderiza os 5 blocos de montar com as vogais + a base em assets/3d/blocos/.

Uso:  blender -b -P tools/blender/render_blocos.py

Camera ORTOGRAFICA fixa, de frente e um pouco de cima (inclinacao INCL graus,
sem giro lateral): ve-se a face da frente (com a letra) e o topo com os pinos.
Os 5 blocos usam exatamente a mesma camera/escala/posicao (4 px por unidade).
A base usa a mesma camera, mas escala 1.6 px por unidade (cabe 3 blocos de largura
em 512 px) -> para casar com os blocos, mostre a base 2.5x maior que o bloco.
"""
import json
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comum as C  # noqa: E402

SAIDA = os.path.join(C.RAIZ, 'assets', '3d', 'blocos')
PX = 512
INCL = 25.0                        # graus acima da horizontal
ESC_BLOCO = 4.0                    # px por unidade (blocos)
ESC_BASE = 1.6                     # px por unidade (base)
PASSO_PX = 280                     # deslocamento vertical entre blocos empilhados
COS, SEN = math.cos(math.radians(INCL)), math.sin(math.radians(INCL))

LARG = 100.0                       # largura (x) e profundidade (y) do bloco
ALT = PASSO_PX / (ESC_BLOCO * COS)  # altura do corpo -> 280 px na tela (~77.24)
PINO_R, PINO_H = 15.5, 12.0
CHANFRO = 3.0
BASE_PASSO_PX = 37                 # altura da base na tela (px da imagem da base)
BASE_LARG, BASE_ALT = 300.0, BASE_PASSO_PX / (ESC_BASE * COS)   # ~25.5 = 1/3 do bloco

LETRA_K = 0.72                     # escala da letra na face
LETRA_RAIO = 5.0                   # raio do tubo da letra (unidades do bloco)

CORES = {
    'A': '#ff4d5e',    # vermelho
    'E': '#ffab1a',    # laranja-amarelo
    'I': '#2fc45a',    # verde
    'O': '#2f7bff',    # azul
    'U': '#9b5cf0',    # roxo
}
COR_BASE = '#3aa655'
COR_LETRA = '#ffffff'


def _obj(scene, nome, bm, mat):
    for f in bm.faces:
        f.smooth = True
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    ob = bpy.data.objects.new(nome, me)
    scene.collection.objects.link(ob)
    wn = ob.modifiers.new('normais', 'WEIGHTED_NORMAL')
    wn.keep_sharp = False
    wn.weight = 100
    return ob


def caixa_arredondada(scene, nome, lx, ly, lz, mat):
    """Corpo do bloco: x -lx/2..lx/2, y -ly/2..ly/2, z 0..lz, cantos arredondados."""
    U = C.U
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * lx * U, v.co.y * ly * U, (v.co.z + 0.5) * lz * U))
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=CHANFRO * U, segments=6,
                    profile=0.5, affect='EDGES')
    return _obj(scene, nome, bm, mat)


def pino(scene, nome, x, y, z0, mat):
    U = C.U
    bm = bmesh.new()
    afunda = 2.0
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=72,
                          radius1=PINO_R * U, radius2=PINO_R * U,
                          depth=(PINO_H + afunda) * U)
    ztopo = (PINO_H + afunda) * U / 2
    # sem a tampa de baixo (fica dentro do corpo e estragaria as normais do lado)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.normal.z < -0.5], context='FACES')
    arestas = [e for e in bm.edges if all(abs(v.co.z - ztopo) < 1e-6 for v in e.verts)]
    bmesh.ops.bevel(bm, geom=arestas, offset=2.4 * U, segments=5, profile=0.5,
                    affect='EDGES')
    for v in bm.verts:
        v.co += Vector((x * U, y * U, (z0 + PINO_H - (PINO_H + afunda) / 2) * U))
    return _obj(scene, nome, bm, mat)


def linha_px(v, v_centro, esc):
    return PX / 2 - (v - v_centro) * esc


def medir_alfa(caminho):
    import numpy as np
    img = bpy.data.images.load(caminho)
    w, h = img.size
    a = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1, :, 3]
    bpy.data.images.remove(img)
    lin = np.where(a.max(axis=1) > 0.5)[0]
    col = np.where(a.max(axis=0) > 0.5)[0]
    cantos = float(a[0, 0] + a[0, -1] + a[-1, 0] + a[-1, -1])
    return [int(col[0]), int(lin[0]), int(col[-1]), int(lin[-1])], cantos


def main():
    S = C.carregar_tracos()
    os.makedirs(SAIDA, exist_ok=True)
    U = C.U
    scene = C.limpar_cena()
    C.configurar_render(scene, PX, PX, amostras=64)
    C.mundo_estudio(scene, forca=0.32)
    try:
        scene.eevee.use_raytracing = True      # oclusao/reflexos de contato (pinos, letra)
    except Exception:
        pass

    foco = Vector((0, 0, 0.45))
    C.luz_area(scene, 'principal', foco + Vector((-3.3, -3.0, 4.5)), foco, 760, 2.4)
    C.luz_area(scene, 'enchimento', foco + Vector((2.6, -2.8, 0.5)), foco, 45, 3.5,
               cor=(0.92, 0.95, 1.0), sombra=False)
    C.luz_area(scene, 'brilho', foco + Vector((-1.4, -3.6, 3.2)), foco, 500, 1.4,
               sombra=False, difusa=0.0, especular=1.0)

    cam = C.camera_orto(scene)
    cam.rotation_euler = (math.radians(90 - INCL), 0, 0)

    def mirar(v_centro, esc):
        """Aponta a camera: o ponto de altura de tela v_centro fica no meio."""
        p = Vector((0, 0, v_centro / COS * U))
        cam.location = p + 8.0 * Vector((0, -COS, SEN))
        cam.data.ortho_scale = PX / esc * U

    def metricas(larg, alt, esc, pinos_y_fundo=25.0):
        vmin = -LARG / 2 * SEN
        vmax = (alt + PINO_H) * COS + (pinos_y_fundo + PINO_R) * SEN
        vc = (vmin + vmax) / 2
        # ajusta para a aresta de baixo cair numa linha inteira de pixels
        vc = vmin + (round(linha_px(vmin, vc, esc)) - PX / 2) / esc
        return vc, {
            'stud_top': int(round(linha_px(vmax, vc, esc))),      # trocado pelo medido
            'body_top': int(round(linha_px(alt * COS + LARG / 2 * SEN, vc, esc))),
            'face_top': int(round(linha_px(alt * COS - LARG / 2 * SEN, vc, esc))),
            'body_bottom': int(round(linha_px(vmin, vc, esc))),
            'body_left': int(round(PX / 2 - larg / 2 * esc)),
            'body_right': int(round(PX / 2 + larg / 2 * esc)),
            'px_per_unit': esc,
        }

    mat_letra = C.material_plastico('letra_branca', COR_LETRA, rugosidade=0.3, verniz=0.6)
    meta = {
        'camera': {
            'type': 'ORTHO', 'pitch_deg': INCL, 'yaw_deg': 0,
            'note': 'linhas/colunas em px da imagem 512x512 (linha 0 = topo). '
                    'stud_top = primeira linha opaca (topo dos pinos, medido); '
                    'body_top = aresta de cima-atras do corpo; face_top = aresta de '
                    'cima-da-frente; body_bottom = aresta de baixo-da-frente; body_left/right = '
                    'lados do corpo (arestas calculadas, sem o arredondamento dos cantos; '
                    'alpha_bbox = pixels opacos medidos [esq, topo, dir, baixo]). '
                    'Para empilhar: suba o bloco de cima stack_step px (= body_bottom - face_top) '
                    'e desenhe-o por cima do de baixo. Sobre a base: mostre a base com '
                    '1/scale_vs_brick (2.5x) do tamanho do bloco, alinhe body_bottom do bloco '
                    'com face_top da base e o centro do bloco com um dos slots_x.'},
    }

    # ---------------- blocos com vogais ----------------
    vc, m_bloco = metricas(LARG, ALT, ESC_BLOCO)
    mirar(vc, ESC_BLOCO)
    for letra, cor in CORES.items():
        mat = C.material_plastico('bloco_' + letra, cor, rugosidade=0.33, verniz=0.4)
        objs = [caixa_arredondada(scene, 'corpo', LARG, LARG, ALT, mat)]
        for px_ in (-25, 25):
            for py_ in (-25, 25):
                objs.append(pino(scene, 'pino', px_, py_, ALT, mat))
        x0, x1, y0, y1 = C.caixa(S[letra])
        cx = (x0 + x1) / 2

        def mapa(x, y, cx=cx):
            return Vector(((x - cx) * LETRA_K * U,
                           (-LARG / 2 - 0.25 * LETRA_RAIO) * U,
                           (ALT / 2 - (y - 52.5) * LETRA_K) * U))

        objs += C.construir_letra(scene, S[letra], mat_letra, mapa,
                                  raio=LETRA_RAIO * U, raio_pingo=LETRA_RAIO * U,
                                  prefixo='letra')
        nome = 'bloco_' + letra
        scene.render.filepath = os.path.join(SAIDA, nome + '.png')
        bpy.ops.render.render(write_still=True)
        C.remover(objs)
        bb, cantos = medir_alfa(scene.render.filepath)
        m = dict(m_bloco)
        m.update({'file': nome + '.png', 'w': PX, 'h': PX, 'letter': letra, 'color': cor,
                  'stack_step': PASSO_PX, 'alpha_bbox': bb, 'stud_top': bb[1]})
        meta[nome] = m
        print('BLOCO', nome, bb, 'alfa dos cantos', cantos)

    # ---------------- base ----------------
    mat = C.material_plastico('base', COR_BASE, rugosidade=0.33, verniz=0.4)
    objs = [caixa_arredondada(scene, 'base', BASE_LARG, LARG, BASE_ALT, mat)]
    for i in range(6):
        for py_ in (-25, 25):
            objs.append(pino(scene, 'pino', -125 + 50 * i, py_, BASE_ALT, mat))
    vc, m = metricas(BASE_LARG, BASE_ALT, ESC_BASE)
    mirar(vc, ESC_BASE)
    scene.render.filepath = os.path.join(SAIDA, 'bloco_base.png')
    bpy.ops.render.render(write_still=True)
    C.remover(objs)
    bb, cantos = medir_alfa(scene.render.filepath)
    m.update({'file': 'bloco_base.png', 'w': PX, 'h': PX, 'color': COR_BASE,
              'stack_step': BASE_PASSO_PX, 'alpha_bbox': bb, 'stud_top': bb[1],
              'scale_vs_brick': ESC_BASE / ESC_BLOCO,
              'slots_x': [int(round(PX / 2 + dx * ESC_BASE)) for dx in (-100, 0, 100)]})
    meta['bloco_base'] = m
    print('BASE', bb, 'alfa dos cantos', cantos)

    with open(os.path.join(SAIDA, 'meta.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=1, ensure_ascii=False)
    print('META blocos ok')


main()
