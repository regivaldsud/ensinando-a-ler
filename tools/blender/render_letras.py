# -*- coding: utf-8 -*-
"""Renderiza as 52 letras 3D (tubos de plastico brilhante) em assets/3d/letras/.

Uso:
  blender -b -P tools/blender/render_letras.py            (todas)
  blender -b -P tools/blender/render_letras.py -- A b S   (so algumas, sem meta)

Enquadramento igual ao do app (js/strokes.js, funcao svg):
  horizontal  bbox.x0-9 .. bbox.x1+9      vertical  y=4 .. y=120
  altura 384 px, largura = round(384 * larguraDoQuadro / 116)
As letras com descida (g j p q y) passam de y=120 por causa da espessura do tubo
(116 + 6 = 122): o arquivo normal sai cortado 2 unidades embaixo, igual ao quadro
do app; alem dele sai um "<nome>_full.png" com o mesmo quadro e 14 px a mais embaixo.
"""
import json
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comum as C  # noqa: E402

SAIDA = os.path.join(C.RAIZ, 'assets', '3d', 'letras')
ALT_PX = 384
MARGEM = 9.0
Y0, Y1 = 4.0, 120.0
RAIO = 6.0
RAIO_PINGO = 6.5
PX_UN = ALT_PX / (Y1 - Y0)          # px por unidade (3.3103)
ALT_FULL = 398                      # altura da versao "_full" (ate y ~ 124.2)


def nome_arquivo(ch):
    return ('up_' if ch.isupper() else 'lo_') + ch


def main():
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    S = C.carregar_tracos()
    letras = args or list(S.keys())
    os.makedirs(SAIDA, exist_ok=True)

    scene = C.limpar_cena()
    C.configurar_render(scene, 256, ALT_PX, amostras=64)
    C.mundo_estudio(scene, forca=0.45)
    U = C.U
    centro = Vector((50 * U, 0, -62 * U))
    # luz principal de cima-esquerda, enchimento a direita, recorte por baixo
    C.luz_area(scene, 'principal', centro + Vector((-1.9, -2.6, 2.3)), centro, 150, 2.6,
               especular=0.7)
    C.luz_area(scene, 'enchimento', centro + Vector((2.4, -2.8, 0.2)), centro, 30, 3.5,
               cor=(0.92, 0.95, 1.0), sombra=False)
    C.luz_area(scene, 'baixo', centro + Vector((0.6, -1.6, -2.6)), centro, 15, 3.0,
               cor=(1.0, 0.95, 0.92), sombra=False)
    cam = C.camera_orto(scene)
    cam.rotation_euler = (math.radians(90), 0, 0)
    cam.data.ortho_scale = (Y1 - Y0) * U

    mats = {
        True: C.material_plastico('vogal', C.COR_VOGAL),
        False: C.material_plastico('consoante', C.COR_CONSOANTE),
    }

    def mapa(x, y):
        return Vector((x * U, 0.0, -y * U))

    meta = {}
    for ch in letras:
        x0, x1, y0, y1 = C.caixa(S[ch])
        larg = (x1 - x0) + 2 * MARGEM
        w = int(round(ALT_PX * larg / (Y1 - Y0)))
        nome = nome_arquivo(ch)
        meta[nome] = {'x0': round(x0, 2), 'x1': round(x1, 2),
                      'y0': round(y0, 2), 'y1': round(y1, 2), 'w': w, 'h': ALT_PX}
        objs = C.construir_letra(scene, S[ch], mats[ch in C.VOGAIS], mapa,
                                 raio=RAIO * U, raio_pingo=RAIO_PINGO * U, prefixo=nome)
        scene.render.resolution_x = w
        cam.location = ((x0 + x1) / 2 * U, -6.0, -(Y0 + Y1) / 2 * U)
        scene.render.filepath = os.path.join(SAIDA, nome + '.png')
        bpy.ops.render.render(write_still=True)
        if y1 + RAIO > Y1:
            # g j p q y: o tubo passa de y=120 (116+6) e fica cortado no quadro do app.
            # Versao extra "_full": mesmo quadro/escala, so com mais linhas embaixo.
            scene.render.resolution_y = ALT_FULL
            cam.data.ortho_scale = ALT_FULL / PX_UN * U
            cam.location.z = -(Y0 + ALT_FULL / PX_UN / 2) * U
            scene.render.filepath = os.path.join(SAIDA, nome + '_full.png')
            bpy.ops.render.render(write_still=True)
            meta[nome]['full'] = {'file': nome + '_full.png', 'w': w, 'h': ALT_FULL,
                                  'frame_y1': round(Y0 + ALT_FULL / PX_UN, 2)}
            scene.render.resolution_y = ALT_PX
            cam.data.ortho_scale = (Y1 - Y0) * U
        C.remover(objs)
        print('LETRA', nome, w, 'x', ALT_PX)

    if not args:
        with open(os.path.join(SAIDA, 'meta.json'), 'w', encoding='utf-8') as f:
            json.dump(meta, f, indent=1)
        print('META ok', len(meta))


main()
