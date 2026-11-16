'use strict';
// =====================================================================
//  Traçados das letras (letra bastão escolar), na ordem em que se escreve.
//  Caixa: x 0..100, y 0..120. Linha de cima 15, meio 45, base 90, descida 116.
//  Cada letra = lista de traços (caminhos SVG). Traço curtinho = pingo.
// =====================================================================
(function (App) {
  const O_UP = 'M50 14 C28 14 18 34 18 52 C18 72 28 90 50 90 C72 90 82 72 82 52 C82 34 72 14 50 14';
  const CIRC_A = 'M70 56 C66 49 59 45 50 45 C36 45 26 55 26 67.5 C26 80 36 90 50 90 C59 90 66 86 70 79';
  const BOWL_R = 'M30 67.5 C30 54 40 45 51 45 C64 45 74 55 74 67.5 C74 80 64 90 51 90 C40 90 30 81 30 67.5';

  const S = {
    // ---------------- MAIÚSCULAS ----------------
    A: ['M50 15 L20 90', 'M50 15 L80 90', 'M31 63 L69 63'],
    B: ['M28 15 L28 90', 'M28 15 L54 15 C74 15 74 52 54 52 L28 52', 'M28 52 L57 52 C80 52 80 90 57 90 L28 90'],
    C: ['M77 28 C70 18 61 14 50 14 C30 14 20 32 20 52 C20 74 32 90 50 90 C61 90 71 85 77 75'],
    D: ['M28 15 L28 90', 'M28 15 L45 15 C70 15 80 35 80 52 C80 72 68 90 45 90 L28 90'],
    E: ['M28 15 L28 90', 'M28 15 L72 15', 'M28 52 L64 52', 'M28 90 L72 90'],
    F: ['M30 15 L30 90', 'M30 15 L74 15', 'M30 52 L66 52'],
    G: ['M77 28 C70 18 61 14 50 14 C30 14 20 32 20 52 C20 74 32 90 50 90 C66 90 78 78 78 58 L54 58'],
    H: ['M26 15 L26 90', 'M74 15 L74 90', 'M26 52 L74 52'],
    I: ['M50 15 L50 90', 'M34 15 L66 15', 'M34 90 L66 90'],
    J: ['M66 15 L66 68 C66 84 58 90 46 90 C34 90 26 82 26 70', 'M46 15 L82 15'],
    K: ['M28 15 L28 90', 'M74 15 L28 60', 'M43 46 L77 90'],
    L: ['M30 15 L30 90 L72 90'],
    M: ['M20 15 L20 90', 'M20 15 L50 64 L80 15 L80 90'],
    N: ['M24 15 L24 90', 'M24 15 L76 90 L76 15'],
    O: [O_UP],
    P: ['M28 15 L28 90', 'M28 15 L54 15 C77 15 77 56 54 56 L28 56'],
    Q: [O_UP, 'M58 70 L82 95'],
    R: ['M28 15 L28 90', 'M28 15 L54 15 C76 15 76 54 54 54 L28 54', 'M50 54 L77 90'],
    S: ['M75 26 C69 17 60 14 50 14 C34 14 24 22 24 33 C24 46 38 49 50 52 C64 55 77 59 77 72 C77 84 66 90 50 90 C38 90 28 86 22 76'],
    T: ['M20 15 L80 15', 'M50 15 L50 90'],
    U: ['M24 15 L24 64 C24 80 35 90 50 90 C65 90 76 80 76 64 L76 15'],
    V: ['M20 15 L50 90 L80 15'],
    W: ['M10 15 L29 90 L50 34 L71 90 L90 15'],
    X: ['M22 15 L78 90', 'M78 15 L22 90'],
    Y: ['M22 15 L50 53', 'M78 15 L50 53 L50 90'],
    Z: ['M22 15 L78 15 L22 90 L78 90'],

    // ---------------- MINÚSCULAS ----------------
    a: [CIRC_A, 'M70 45 L70 90'],
    b: ['M30 15 L30 90', BOWL_R],
    c: ['M72 54 C67 48 60 45 52 45 C37 45 27 55 27 67.5 C27 80 37 90 52 90 C60 90 67 87 72 81'],
    d: [CIRC_A, 'M70 15 L70 90'],
    e: ['M28 67 L72 67 C72 54 63 45 50 45 C36 45 27 56 27 67.5 C27 80 37 90 51 90 C60 90 67 87 72 81'],
    f: ['M68 22 C64 16 59 15 55 15 C46 15 41 21 41 30 L41 90', 'M26 47 L60 47'],
    g: ['M70 56 C66 49 59 45 50 45 C36 45 26 55 26 66 C26 78 36 87 50 87 C59 87 66 83 70 76', 'M70 45 L70 100 C70 110 62 116 50 116 C41 116 34 113 30 107'],
    h: ['M30 15 L30 90', 'M30 62 C32 51 40 45 51 45 C63 45 70 52 70 64 L70 90'],
    i: ['M50 45 L50 90', 'M50 27 L50 28'],
    j: ['M56 45 L56 102 C56 111 50 116 42 116 C36 116 31 113 28 108', 'M56 27 L56 28'],
    k: ['M30 15 L30 90', 'M68 45 L30 72', 'M44 62 L70 90'],
    l: ['M50 15 L50 90'],
    m: ['M18 45 L18 90', 'M18 61 C20 50 26 45 34 45 C43 45 50 51 50 62 L50 90', 'M50 62 C50 51 57 45 66 45 C75 45 82 51 82 62 L82 90'],
    n: ['M28 45 L28 90', 'M28 62 C30 51 38 45 49 45 C62 45 72 52 72 64 L72 90'],
    o: ['M50 45 C35 45 26 56 26 67.5 C26 80 35 90 50 90 C65 90 74 80 74 67.5 C74 56 65 45 50 45'],
    p: ['M30 45 L30 116', BOWL_R],
    q: [CIRC_A, 'M70 45 L70 116'],
    r: ['M34 45 L34 90', 'M34 64 C36 52 44 45 56 45 C62 45 66 47 69 50'],
    s: ['M68 52 C64 47 58 45 50 45 C39 45 32 50 32 57 C32 65 41 67 50 68.5 C60 70 69 72 69 80 C69 87 61 90 50 90 C41 90 34 88 30 83'],
    t: ['M46 22 L46 81 C46 88 50 90 56 90 C60 90 64 89 67 86', 'M30 47 L64 47'],
    u: ['M28 45 L28 72 C28 84 37 90 48 90 C60 90 70 82 72 70', 'M72 45 L72 90'],
    v: ['M26 45 L50 90 L74 45'],
    w: ['M12 45 L29 90 L50 53 L71 90 L88 45'],
    x: ['M28 45 L72 90', 'M72 45 L28 90'],
    y: ['M26 45 L51 90', 'M74 45 L40 116'],
    z: ['M28 45 L72 45 L28 90 L72 90']
  };

  // ---- Amostragem dos caminhos (usa um SVG escondido para medir) ----
  let measureSvg = null;
  function measurer() {
    if (!measureSvg) {
      measureSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      measureSvg.setAttribute('width', '0');
      measureSvg.setAttribute('height', '0');
      measureSvg.style.position = 'absolute';
      measureSvg.style.left = '-9999px';
      document.body.appendChild(measureSvg);
    }
    return measureSvg;
  }
  const cache = {};
  // Pontos a cada "step" unidades ao longo de cada traço.
  function sample(ch, step) {
    step = step || 2;
    const key = ch + '@' + step;
    if (cache[key]) return cache[key];
    const svg = measurer();
    const out = (S[ch] || []).map(d => {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', d);
      svg.appendChild(p);
      const len = p.getTotalLength();
      const n = Math.max(1, Math.ceil(len / step));
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const q = p.getPointAtLength(len * i / n);
        pts.push({ x: q.x, y: q.y });
      }
      svg.removeChild(p);
      return { d, len, pts, dot: len < 4 };
    });
    cache[key] = out;
    return out;
  }
  function bbox(ch) {
    const k = 'bb' + ch;
    if (cache[k]) return cache[k];
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    sample(ch, 3).forEach(s => s.pts.forEach(p => {
      x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
    }));
    if (x0 > x1) { x0 = 20; x1 = 80; y0 = 15; y1 = 90; }
    return (cache[k] = { x0, y0, x1, y1 });
  }

  const VOWEL_COLOR = '#ff4d6d';
  const CONS_COLOR = '#2f7bff';
  function colorOf(ch) { return App.data.isVowel(ch) ? VOWEL_COLOR : CONS_COLOR; }

  // Desenha uma letra como SVG.
  //  opts.tight  = recorta no tamanho da letra (para letra sozinha bem grande)
  //  opts.color  = cor; opts.width = espessura; opts.lines = mostra pautas
  function svg(ch, opts) {
    opts = opts || {};
    const b = bbox(ch);
    const pad = 9;
    let vx = b.x0 - pad, vw = (b.x1 - b.x0) + pad * 2;
    let vy = 4, vh = 116;
    if (opts.tight) { vy = b.y0 - pad; vh = (b.y1 - b.y0) + pad * 2; }
    if (opts.minW && vw < opts.minW) { vx -= (opts.minW - vw) / 2; vw = opts.minW; }
    const col = opts.color || colorOf(ch);
    const w = opts.width || 12;
    const paths = (S[ch] || []).map(d =>
      `<path d="${d}" fill="none" stroke="rgba(0,0,0,.13)" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" transform="translate(1.5 3)"/>` +
      `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${d}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="${w * 0.28}" stroke-linecap="round" stroke-linejoin="round" transform="translate(-1.6 -1.8)"/>`
    ).join('');
    const lines = opts.lines ? `<g stroke="#c9d3ea" stroke-width="1" stroke-dasharray="3 3"><line x1="${vx}" x2="${vx + vw}" y1="15" y2="15"/><line x1="${vx}" x2="${vx + vw}" y1="45" y2="45"/><line x1="${vx}" x2="${vx + vw}" y1="116" y2="116"/></g><line x1="${vx}" x2="${vx + vw}" y1="90" y2="90" stroke="#9fb0d6" stroke-width="1.6"/>` : '';
    return `<svg class="letter-svg" viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}" role="img" aria-label="${ch}">${lines}${paths}</svg>`;
  }

  // Letra 3D (render do Blender), se existir. A imagem cobre x de (x0-9) a (x1+9) e y de 4 a 120,
  // igual ao desenho vetorial; aqui ela é recortada/centralizada conforme o pedido.
  function img3d(ch, opts) {
    const isUp = ch !== ch.toLowerCase();
    const key = (isUp ? 'up_' : 'lo_') + ch;
    const M = App.assetMeta && App.assetMeta.letras && App.assetMeta.letras[key];
    if (!M) return null;
    const vw = (M.x1 - M.x0) + 18;
    let vy = 4, H = 116, W = vw;
    if (opts.tight) { vy = M.y0 - 9; H = (M.y1 - M.y0) + 18; }
    if (opts.minW && W < opts.minW) W = opts.minW;
    // Altura que a imagem cobre: 116 unidades, ou um pouco mais nas letras com perninha (g j p q y)
    const ih = M.fy ? M.fy - 4 : 116;
    const file = M.f || (key + '.png');
    const st = `width:${(vw / W * 100).toFixed(2)}%;height:${(ih / H * 100).toFixed(2)}%;left:${((W - vw) / 2 / W * 100).toFixed(2)}%;top:${(-(vy - 4) / H * 100).toFixed(2)}%`;
    return `<span class="l3d-box${opts.tight ? ' crop' : ''}" style="aspect-ratio:${W.toFixed(1)}/${H.toFixed(1)}"><img src="assets/3d/letras/${file}" alt="${ch}" draggable="false" style="${st}"></span>`;
  }

  // Elemento DOM pronto com a letra
  function el(ch, opts) {
    opts = opts || {};
    const d = document.createElement('span');
    d.className = 'letter-art' + (opts.cls ? ' ' + opts.cls : '');
    const html = (!opts.color && !opts.lines && !opts.flat) ? img3d(ch, opts) : null;
    if (html) {
      d.classList.add('l3d');
      d.innerHTML = html;
      // Se a imagem não carregar, volta para o desenho vetorial.
      d.querySelector('img').addEventListener('error', () => { d.classList.remove('l3d'); d.innerHTML = svg(ch, opts); });
    } else d.innerHTML = svg(ch, opts);
    d.setAttribute('aria-label', ch);
    return d;
  }

  App.strokes = { S, sample, bbox, svg, el, colorOf, VOWEL_COLOR, CONS_COLOR };
})(window.App);
