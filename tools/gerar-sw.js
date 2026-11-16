// Gera a lista de arquivos e a versão do cache no sw.js. Rodar depois de mudar arquivos: node tools/gerar-sw.js
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
const skipDir = ['tools', '.claude', 'node_modules'];
const skipExt = /\.(blend|blend1|glb|bat|md|py|wav|png~)$/i;
const out = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f), r = path.relative(root, p).split(path.sep).join('/');
    if (fs.statSync(p).isDirectory()) { if (!skipDir.includes(f)) walk(p); continue; }
    if (d === root && /^(sw\.js|index\.html)$/.test(f)) continue;
    if (skipExt.test(f) || /^(av_)?folha/.test(f)) continue;
    out.push('./' + r);
  }
})(root);
const v = Date.now().toString(36);
const file = path.join(root, 'sw.js');
let t = fs.readFileSync(file, 'utf8');
t = t.replace(/const CACHE = '[^']*';/, "const CACHE = 'ensinando-a-ler-" + v + "';");
t = t.replace(/const FILES = \[[\s\S]*?\n?\];/, 'const FILES = ' + JSON.stringify(['./', './index.html', ...out]) + ';');
fs.writeFileSync(file, t);
console.log(out.length + ' arquivos, cache ' + v);
