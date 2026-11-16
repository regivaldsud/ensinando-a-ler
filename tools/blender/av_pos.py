# av_pos.py - pos-processamento (python do sistema + PIL): optimiza PNGs e monta folhas de contacto
#   python tools/blender/av_pos.py [avatar|premios|jogo|all]
import os, sys, json
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
A3D = os.path.join(ROOT, 'assets', '3d')

SETS = {
    'avatar': (['robo_idle.png', 'robo_happy.png', 'robo_listen.png'], 250),
    'premios': (['trofeu_ouro.png', 'trofeu_prata.png', 'trofeu_bronze.png', 'medalha.png', 'estrela.png', 'cadeado.png'], 150),
    'jogo': (['carro.png', 'foguete.png', 'trem_loco.png', 'trem_vagao.png', 'moto.png', 'bandeira.png'], 150),
}


def optimise(path, limit_kb):
    im = Image.open(path).convert('RGBA')
    px = im.load()
    # limpa RGB onde alpha == 0 (comprime melhor)
    r, g, b, a = im.split()
    mask = a.point(lambda v: 255 if v > 0 else 0)
    clean = Image.new('RGBA', im.size, (0, 0, 0, 0))
    clean.paste(im, (0, 0), mask)
    clean.putalpha(a)
    clean.save(path, optimize=True, compress_level=9)
    kb = os.path.getsize(path) / 1024
    bits = 8
    # se ainda grande: reduz bits por canal de cor (imperceptivel) ate caber
    while kb > limit_kb and bits > 5:
        bits -= 1
        sh = 8 - bits
        lut = [min(255, ((v >> sh) << sh) + (1 << sh >> 1)) if v not in (0, 255) else v for v in range(256)]
        r2, g2, b2, a2 = clean.split()
        q = Image.merge('RGBA', (r2.point(lut), g2.point(lut), b2.point(lut), a2))
        q.save(path, optimize=True, compress_level=9)
        kb = os.path.getsize(path) / 1024
    return kb, bits


def alpha_bbox(im):
    return im.getchannel('A').getbbox()


def sheet(name, files, folder, out, cell=360, small=(96, 160)):
    ims = [(f, Image.open(os.path.join(folder, f)).convert('RGBA')) for f in files if os.path.exists(os.path.join(folder, f))]
    if not ims:
        return
    n = len(ims)
    cols = min(n, 3)
    rows = (n + cols - 1) // cols
    pad = 16
    strip = small[1] + 30
    Wd = cols * (cell + pad) + pad
    Hd = rows * (cell + pad + 20) + pad + strip
    bg = Image.new('RGBA', (Wd, Hd), (226, 234, 244, 255))
    d = ImageDraw.Draw(bg)
    for i, (f, im) in enumerate(ims):
        cx = pad + (i % cols) * (cell + pad)
        cy = pad + (i // cols) * (cell + pad + 20)
        # quadriculado claro para ver a transparencia + moldura = limites da imagem
        k = min(cell / im.width, cell / im.height)
        w, h = int(im.width * k), int(im.height * k)
        ox, oy = cx + (cell - w) // 2, cy + (cell - h) // 2
        for yy in range(0, h, 20):
            for xx in range(0, w, 20):
                if (xx // 20 + yy // 20) % 2 == 0:
                    d.rectangle([ox + xx, oy + yy, min(ox + xx + 19, ox + w - 1), min(oy + yy + 19, oy + h - 1)], fill=(240, 244, 250, 255))
        d.rectangle([ox, oy, ox + w - 1, oy + h - 1], outline=(150, 160, 180, 255))
        bg.alpha_composite(im.resize((w, h), Image.LANCZOS), (ox, oy))
        bb = alpha_bbox(im)
        d.text((cx, cy + cell + 4), '%s %dx%d bbox=%s %.0fKB' % (f, im.width, im.height, bb, os.path.getsize(os.path.join(folder, f)) / 1024), fill=(40, 50, 70, 255))
    # faixa com tamanhos pequenos (como na app) sobre fundo colorido
    y0 = Hd - strip + 4
    x = pad
    cols_bg = [(255, 255, 255, 255), (255, 244, 214, 255), (60, 90, 170, 255)]
    for i, (f, im) in enumerate(ims):
        for j, hh in enumerate(small):
            k = hh / im.height
            w, h = max(1, int(im.width * k)), hh
            if x + w + pad > Wd:
                break
            d.rectangle([x - 4, y0, x + w + 4, y0 + small[1] + 8], fill=cols_bg[(i + j) % 3])
            bg.alpha_composite(im.resize((w, h), Image.LANCZOS), (x, y0 + 4 + small[1] - h))
            x += w + 14
    bg.convert('RGB').save(out)
    print('SHEET', out)


def avatar_checks():
    folder = os.path.join(A3D, 'avatar')
    jp = os.path.join(folder, 'robo.json')
    if not os.path.exists(jp):
        return
    J = json.load(open(jp))
    s = J['screen']
    ims = {p: Image.open(os.path.join(folder, 'robo_%s.png' % p)).convert('RGBA') for p in ('idle', 'happy', 'listen')}
    W, H = ims['idle'].size
    box = (int(s['x'] * W), int(s['y'] * H), int((s['x'] + s['w']) * W), int((s['y'] + s['h']) * H))
    # 1) cabeca identica: compara a regiao do ecra + moldura entre poses
    from PIL import ImageChops, ImageStat
    reg = (box[0] - 30, box[1] - 30, box[2] + 30, box[3] + 30)
    for p in ('happy', 'listen'):
        diff = ImageChops.difference(ims['idle'].crop(reg), ims[p].crop(reg))
        print('HEAD diff idle vs %s: max per channel =' % p, [e[1] for e in diff.getextrema()])
    # 2) overlay de verificacao: desenha o rect do json + olhos de teste
    over = Image.new('RGBA', (W * 3, H), (226, 234, 244, 255))
    for i, p in enumerate(('idle', 'happy', 'listen')):
        im = ims[p].copy()
        d = ImageDraw.Draw(im)
        d.rectangle(box, outline=(0, 255, 120, 255), width=2)
        ex = (box[2] - box[0]); ey = (box[3] - box[1])
        for fx in (0.3, 0.7):
            cx = box[0] + ex * fx; cy = box[1] + ey * 0.42; r = ey * 0.16
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(90, 230, 255, 255))
        d.arc([box[0] + ex * 0.38, box[1] + ey * 0.5, box[0] + ex * 0.62, box[1] + ey * 0.82], 20, 160, fill=(90, 230, 255, 255), width=5)
        over.alpha_composite(im, (i * W, 0))
    out = os.path.join(HERE, 'av_folha_avatar_ecra.png')
    over.convert('RGB').resize((W * 3 // 2, H // 2), Image.LANCZOS).save(out)
    print('SHEET', out)
    # brilho medio do ecra (deve ser escuro e uniforme)
    st = ImageStat.Stat(ims['idle'].crop((box[0] + 6, box[1] + 6, box[2] - 6, box[3] - 6)).convert('RGB'))
    print('SCREEN mean rgb', [round(v) for v in st.mean], 'stddev', [round(v, 1) for v in st.stddev])


def main():
    which = sys.argv[1] if len(sys.argv) > 1 else 'all'
    for name, (files, limit) in SETS.items():
        if which not in ('all', name):
            continue
        folder = os.path.join(A3D, name)
        only = sys.argv[2:]          # opcional: so optimiza estes ficheiros (os outros ficam intocados)
        for f in files:
            p = os.path.join(folder, f)
            if os.path.exists(p):
                if only and f not in only:
                    kb, bits = os.path.getsize(p) / 1024, 0
                else:
                    kb, bits = optimise(p, limit)
                im = Image.open(p)
                print('%-18s %dx%d %s %.1f KB bits=%d bbox=%s' % (f, im.width, im.height, im.mode, kb, bits, alpha_bbox(im.convert('RGBA'))))
        sheet(name, files, folder, os.path.join(HERE, 'av_folha_%s.png' % name))
        if name == 'avatar':
            avatar_checks()


if __name__ == '__main__':
    main()
