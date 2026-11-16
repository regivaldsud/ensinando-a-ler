# -*- coding: utf-8 -*-
"""Folhas de contato para conferir os renders (python do sistema + PIL).
Uso: python tools/blender/folhas.py [letras] [blocos]
Gera tools/blender/folha_letras.png e tools/blender/folha_blocos.png
"""
import glob
import json
import os
import sys

from PIL import Image, ImageDraw

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..'))
FUNDO = (244, 246, 252, 255)


def xadrez(w, h, t=16):
    im = Image.new('RGBA', (w, h), FUNDO)
    d = ImageDraw.Draw(im)
    for y in range(0, h, t):
        for x in range(0, w, t):
            if (x // t + y // t) % 2:
                d.rectangle([x, y, x + t - 1, y + t - 1], fill=(228, 232, 242, 255))
    return im


def folha_letras():
    pasta = os.path.join(RAIZ, 'assets', '3d', 'letras')
    nomes = [p + c for p, cs in (('up_', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
                                 ('lo_', 'abcdefghijklmnopqrstuvwxyz')) for c in cs]
    nomes += ['lo_%s_full' % c for c in 'gjpqy']
    nomes = [n for n in nomes if os.path.exists(os.path.join(pasta, n + '.png'))]
    esc, cols = 0.5, 13
    ch, cw = int(384 * esc), int(330 * esc)
    lin = (len(nomes) + cols - 1) // cols
    folha = Image.new('RGBA', (cols * cw, lin * (ch + 22)), FUNDO)
    d = ImageDraw.Draw(folha)
    for i, n in enumerate(nomes):
        im = Image.open(os.path.join(pasta, n + '.png')).convert('RGBA')
        im = im.resize((max(1, int(im.width * esc)), int(im.height * esc)), Image.LANCZOS)
        x = (i % cols) * cw + (cw - im.width) // 2
        y = (i // cols) * (ch + 22)
        # pautas: topo 15, meio 45, base 90, descida 116 (quadro y 4..120)
        for yy, cor in ((15, (200, 210, 235)), (45, (200, 210, 235)), (90, (150, 170, 215)), (116, (200, 210, 235))):
            py = y + int((yy - 4) / 116 * ch)
            d.line([(i % cols) * cw + 2, py, (i % cols + 1) * cw - 3, py], fill=cor + (255,), width=1)
        d.rectangle([x, y, x + im.width - 1, y + im.height - 1], outline=(255, 190, 120, 255))
        folha.alpha_composite(im, (x, y))
        d.text(((i % cols) * cw + 4, y + ch + 9), n, fill=(60, 70, 100, 255))
    folha.convert('RGB').save(os.path.join(AQUI, 'folha_letras.png'), optimize=True)
    print('folha_letras.png', folha.size, len(nomes), 'letras')


def folha_blocos():
    pasta = os.path.join(RAIZ, 'assets', '3d', 'blocos')
    meta = json.load(open(os.path.join(pasta, 'meta.json'), encoding='utf-8'))
    nomes = ['bloco_A', 'bloco_E', 'bloco_I', 'bloco_O', 'bloco_U', 'bloco_base']
    esc = 0.5
    t = int(512 * esc)
    folha = xadrez(3 * t + 620, 2 * t + 20)
    d = ImageDraw.Draw(folha)
    for i, n in enumerate(nomes):
        im = Image.open(os.path.join(pasta, n + '.png')).convert('RGBA').resize((t, t), Image.LANCZOS)
        x, y = (i % 3) * t, (i // 3) * (t + 10)
        folha.alpha_composite(im, (x, y))
        m = meta[n]
        for k, cor in (('stud_top', (255, 0, 0)), ('body_top', (255, 140, 0)), ('face_top', (0, 160, 0)),
                       ('body_bottom', (0, 0, 255))):
            py = y + int(m[k] * esc)
            d.line([x, py, x + 26, py], fill=cor + (255,), width=1)
        for k in ('body_left', 'body_right'):
            px = x + int(m[k] * esc)
            d.line([px, y, px, y + 14], fill=(120, 0, 160, 255), width=1)
        d.text((x + 4, y + t - 12), n, fill=(60, 70, 100, 255))
    # torre de prova: base + 5 blocos empilhados como o CSS faria
    mb, mA = meta['bloco_base'], meta['bloco_A']
    k = mb['px_per_unit'] / mA['px_per_unit']          # escala da base -> bloco
    f = 0.25                                           # escala de exibicao do bloco
    base = Image.open(os.path.join(pasta, 'bloco_base.png')).convert('RGBA')
    fb = f / k
    base = base.resize((int(512 * fb), int(512 * fb)), Image.LANCZOS)
    ox = 3 * t + 310 - int(256 * fb)
    oy = 2 * t - int(512 * fb) + int((512 - mb['body_bottom']) * fb) - 6
    folha.alpha_composite(base, (ox, oy))
    # o fundo do bloco assenta na aresta de cima-da-frente da base
    chao = oy + mb['face_top'] * fb
    cx = ox + 256 * fb
    for j, v in enumerate('UOIEA'):
        m = meta['bloco_' + v]
        im = Image.open(os.path.join(pasta, 'bloco_%s.png' % v)).convert('RGBA')
        im = im.resize((int(512 * f), int(512 * f)), Image.LANCZOS)
        px = int(round(cx - (m['body_left'] + m['body_right']) / 2 * f))
        py = int(round(chao - m['body_bottom'] * f - j * m['stack_step'] * f))
        folha.alpha_composite(im, (px, py))
    folha.convert('RGB').save(os.path.join(AQUI, 'folha_blocos.png'), optimize=True)
    print('folha_blocos.png', folha.size)


if __name__ == '__main__':
    quais = sys.argv[1:] or ['letras', 'blocos']
    if 'letras' in quais:
        folha_letras()
    if 'blocos' in quais:
        folha_blocos()
