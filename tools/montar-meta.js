// Junta as medidas das peças 3D (geradas pelo Blender) em js/assets-meta.js.
// Uso:  node tools/montar-meta.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => { try { return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8')); } catch (e) { return null; } };
const has = (p) => fs.existsSync(path.join(root, p));

const meta = {};
// Letras: só entram as que têm a imagem renderizada
const letras = read('assets/3d/letras/meta.json');
if (letras) {
  meta.letras = {};
  for (const k in letras) {
    if (!has('assets/3d/letras/' + k + '.png')) continue;
    const m = letras[k];
    meta.letras[k] = { x0: +m.x0.toFixed(2), x1: +m.x1.toFixed(2), y0: +m.y0.toFixed(2), y1: +m.y1.toFixed(2) };
    // Letras com perninha (g j p q y): versão "_full", com a moldura esticada para baixo até fy
    if (m.full && has('assets/3d/letras/' + m.full.file)) { meta.letras[k].f = m.full.file; meta.letras[k].fy = +m.full.frame_y1.toFixed(2); }
  }
  if (Object.keys(meta.letras).length < 52) { console.log('letras incompletas:', Object.keys(meta.letras).length, '/ 52 — mantendo as vetoriais'); delete meta.letras; }
}
// Robô: precisa das três poses
const robo = read('assets/3d/avatar/robo.json');
if (robo && ['idle', 'happy', 'listen'].every(p => has('assets/3d/avatar/robo_' + p + '.png'))) meta.robo = robo;
// Tico animado (folhas de quadros por animação): precisa de todas as folhas
const tico = read('assets/3d/avatar/tico.json');
if (tico && Object.keys(tico.anims).every(a => has('assets/3d/avatar/tico_' + a + '.webp'))) meta.tico = tico;
// Trem (painel do vagão) e blocos (medidas para empilhar)
const trem = read('assets/3d/jogo/trem.json');
if (trem) meta.trem = trem;
const blocos = read('assets/3d/blocos/meta.json');
if (blocos) meta.blocos = blocos;

const out = `'use strict';
// Medidas das peças 3D (geradas pelo Blender). Arquivo criado por tools/montar-meta.js — não edite à mão.
window.App = window.App || {};
window.App.assetMeta = ${JSON.stringify(meta)};
`;
fs.writeFileSync(path.join(root, 'js/assets-meta.js'), out);
console.log('js/assets-meta.js:', Object.keys(meta).join(', ') || '(vazio)', '· letras:', meta.letras ? Object.keys(meta.letras).length : 0);
