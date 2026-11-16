// Extrai o objeto S (tracados das 52 letras) de js/strokes.js para strokes.json
// Uso: node tools/blender/extrair_tracos.js
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'strokes.js'), 'utf8');
const a = src.indexOf('const O_UP');
const b = src.indexOf('// ---- Amostragem');
if (a < 0 || b < 0) throw new Error('marcadores nao encontrados em strokes.js');
const S = new Function(src.slice(a, b) + '\nreturn S;')();
const keys = Object.keys(S);
if (keys.length !== 52) throw new Error('esperava 52 letras, achei ' + keys.length);
for (const k of keys) for (const d of S[k]) {
  if (!/^[MLC0-9 .\-]+$/.test(d)) throw new Error('comando inesperado em ' + k + ': ' + d);
}
fs.writeFileSync(path.join(__dirname, 'strokes.json'), JSON.stringify(S, null, 1));
console.log('ok', keys.length, 'letras ->', path.join(__dirname, 'strokes.json'));
