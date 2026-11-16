'use strict';
// =====================================================================
//  Jogos de ORDEM e de MONTAR: labirinto, ligar as letras, trem do
//  alfabeto e blocos de vogais. Servem para aprender a sequência do
//  alfabeto, das vogais e das letras do nome.
// =====================================================================
(function (App) {
  const { h, pick, shuffle, sleep, rand, signal, clickQueue, norm } = App.util;
  const D = App.data, ui = App.ui, V = App.voice;
  const S = () => App.store.settings;
  const art = (ch, o) => App.strokes.el(ch, o);
  const U = (k, v) => V.U(k, v);
  const vL = (ch) => ({ L: ch.toUpperCase(), Lshown: ch });
  const lvl = () => S().nivel || 2;

  // Imagem 3D (Blender) com um desenho simples de reserva.
  function pic(path, emoji, cls) {
    const w = h('span', { class: 'pic ' + (cls || '') });
    const im = h('img', { src: 'assets/3d/' + path, alt: '', draggable: 'false' });
    im.addEventListener('error', () => { w.textContent = emoji; w.classList.add('emoji-pic'); });
    w.appendChild(im);
    return w;
  }

  // ---------- Sequências ----------
  function nameLetters() {
    const n = norm(S().nome).replace(/[^a-z]/g, '').toUpperCase();
    return (n || 'HEITOR').split('');
  }
  function sequence(kind) {
    if (kind === 'vogais') return D.VOWELS.slice();
    if (kind === 'nome') return nameLetters();
    return D.ALPHABET.slice();
  }
  function windowOf(seq, n) {
    if (seq.length <= n) return seq.slice();
    const i = rand(seq.length - n + 1);
    return seq.slice(i, i + n);
  }
  // Maiúscula ou minúscula para a rodada inteira (não mistura dentro da sequência).
  function roundCase() {
    const c = S().caixa;
    if (c === 'minusculas') return (x) => x.toLowerCase();
    if (c === 'ambas' && Math.random() < 0.35) return (x) => x.toLowerCase();
    return (x) => x.toUpperCase();
  }
  // Trilho no alto mostrando a ordem (o que já foi pego fica colorido).
  function rail(seq, cs, ghost) {
    const bar = h('div', { class: 'rail' });
    seq.forEach(L => {
      const sl = h('span', { class: 'rail-slot' });
      if (ghost) sl.appendChild(art(cs(L), { color: '#cfd8ee', minW: 60 }));
      bar.appendChild(sl);
    });
    return {
      el: bar,
      fill(i) { const sl = bar.children[i]; sl.innerHTML = ''; sl.appendChild(art(cs(seq[i]), { minW: 60 })); sl.classList.add('got', 'pop-in'); },
      next(i) { [...bar.children].forEach((c, k) => c.classList.toggle('next', k === i)); }
    };
  }

  // ------------------------------------------------------------------
  //  LABIRINTO: leve o carrinho até as letras, na ordem
  // ------------------------------------------------------------------
  function genMaze(cols, rows, extra) {
    const cells = [];
    for (let i = 0; i < cols * rows; i++) cells.push({ t: 1, r: 1, b: 1, l: 1, v: 0 });
    const at = (x, y) => cells[y * cols + x];
    const stack = [[0, 0]];
    at(0, 0).v = 1;
    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const nb = shuffle([[0, -1, 't', 'b'], [1, 0, 'r', 'l'], [0, 1, 'b', 't'], [-1, 0, 'l', 'r']]).filter(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        return nx >= 0 && ny >= 0 && nx < cols && ny < rows && !at(nx, ny).v;
      });
      if (!nb.length) { stack.pop(); continue; }
      const [dx, dy, a, b] = nb[0];
      at(x, y)[a] = 0; at(x + dx, y + dy)[b] = 0; at(x + dx, y + dy).v = 1;
      stack.push([x + dx, y + dy]);
    }
    // Abre algumas paredes a mais: mais de um caminho, menos becos.
    for (let k = 0; k < extra; k++) {
      const x = rand(cols - 1), y = rand(rows - 1);
      if (Math.random() < 0.5) { at(x, y).r = 0; at(x + 1, y).l = 0; } else { at(x, y).b = 0; at(x, y + 1).t = 0; }
    }
    return cells;
  }
  function mazePath(cells, cols, rows, from, to) {
    if (from === to) return [];
    const prev = new Array(cells.length).fill(-1);
    const q = [from]; prev[from] = from;
    while (q.length) {
      const c = q.shift();
      if (c === to) break;
      const x = c % cols, y = (c - x) / cols, w = cells[c];
      const nb = [];
      if (!w.t && y > 0) nb.push(c - cols);
      if (!w.b && y < rows - 1) nb.push(c + cols);
      if (!w.l && x > 0) nb.push(c - 1);
      if (!w.r && x < cols - 1) nb.push(c + 1);
      for (const n of nb) if (prev[n] < 0) { prev[n] = c; q.push(n); }
    }
    if (prev[to] < 0) return [];
    const path = [];
    for (let c = to; c !== from; c = prev[c]) path.unshift(c);
    return path;
  }
  async function maze(s, area, o) {
    const seq = o.seq;
    const cs = roundCase();
    const [cols, rows] = [[5, 4], [6, 4], [7, 5]][lvl() - 1] || [6, 4];
    const cells = genMaze(cols, rows, [6, 4, 3][lvl() - 1] || 4);
    // Espalha as letras (e, nos níveis maiores, umas letras que não fazem parte)
    const extras = lvl() >= 2 ? shuffle(D.ALPHABET.filter(x => !seq.includes(x))).slice(0, lvl() - 1) : [];
    const letters = seq.map((L, i) => ({ L, i })).concat(extras.map(L => ({ L, i: -1 })));
    const free = shuffle(cells.map((_, i) => i).filter(i => i !== 0));
    const spots = [];
    const far = (a, b) => Math.abs(a % cols - b % cols) + Math.abs(Math.floor(a / cols) - Math.floor(b / cols));
    for (const c of free) { if (spots.length >= letters.length) break; if (spots.every(p => far(p, c) >= 2) && far(0, c) >= 2) spots.push(c); }
    for (const c of free) { if (spots.length >= letters.length) break; if (!spots.includes(c)) spots.push(c); }
    const letterAt = {};
    letters.forEach((it, k) => { letterAt[spots[k]] = Object.assign({ got: false }, it); });

    const rl = rail(seq, cs, lvl() <= 2);
    const board = h('div', { class: 'maze', style: { gridTemplateColumns: `repeat(${cols}, 1fr)`, '--cols': cols, '--rows': rows } });
    const els = cells.map((c, i) => {
      const e = h('div', { class: 'mz-cell' + (c.t ? ' wt' : '') + (c.r ? ' wr' : '') + (c.b ? ' wb' : '') + (c.l ? ' wl' : '') });
      if (letterAt[i]) { const le = h('div', { class: 'mz-letter' }, art(cs(letterAt[i].L), { tight: true })); e.appendChild(le); letterAt[i].el = le; }
      e.dataset.i = i;
      board.appendChild(e);
      return e;
    });
    const car = h('div', { class: 'mz-car' }, pic('jogo/carro.png', '🚗'));
    board.appendChild(car);
    area.appendChild(rl.el);
    area.appendChild(h('div', { class: 'maze-wrap', style: { '--cols': cols, '--rows': rows } }, board));
    area.appendChild(h('p', { class: 'hint' }, 'Toque no caminho (ou use as setas do teclado) para levar o carrinho.'));

    let pos = 0, need = 0, goal = null, walking = false, wrongs = 0, lastSay = 0;
    const fin = signal();
    const finP = fin.wait();
    const place = (rot) => {
      car.style.left = ((pos % cols + 0.5) / cols * 100) + '%';
      car.style.top = ((Math.floor(pos / cols) + 0.5) / rows * 100) + '%';
      if (rot !== undefined) car.style.setProperty('--rot', rot + 'deg');
    };
    place(0);
    rl.next(0);
    function enter(isDest) {
      const it = letterAt[pos];
      if (!it || it.got) return;
      if (it.L === seq[need]) {
        it.got = true;
        it.el.classList.add('taken');
        rl.fill(need);
        App.fx.sfx.ok(); App.fx.sparkle(car);
        App.store.record(it.L, 'ok');
        need++;
        rl.next(need);
        if (need >= seq.length) { goal = null; fin.fire(); }
        else V.say('agoraLetra', vL(cs(seq[need])));
      } else if (isDest) {
        wrongs++;
        App.fx.sfx.soft();
        it.el.classList.remove('shake'); void it.el.offsetWidth; it.el.classList.add('shake');
        if (Date.now() - lastSay > 2500) {
          lastSay = Date.now();
          V.say('essaEh', vL(cs(it.L))).then(() => { if (s.alive && need < seq.length) V.say('procure', vL(cs(seq[need]))); });
        }
      }
    }
    async function walk() {
      if (walking) return;
      walking = true;
      try {
        while (s.alive && goal !== null && goal !== pos) {
          const p = mazePath(cells, cols, rows, pos, goal);
          if (!p.length) { goal = null; break; }
          const nx = p[0], d = nx - pos;
          pos = nx;
          place(d === 1 ? 0 : d === -1 ? 180 : d > 0 ? 90 : -90);
          App.fx.sfx.tap();
          await sleep(150);
          if (!s.alive) break;
          enter(pos === goal);
        }
      } finally { walking = false; }
    }
    els.forEach(e => e.addEventListener('click', () => { if (need >= seq.length) return; goal = +e.dataset.i; walk(); }));
    const key = (ev) => {
      const k = ev.key, w = cells[pos], x = pos % cols, y = Math.floor(pos / cols);
      let n = -1;
      if (k === 'ArrowUp' && !w.t && y > 0) n = pos - cols;
      else if (k === 'ArrowDown' && !w.b && y < rows - 1) n = pos + cols;
      else if (k === 'ArrowLeft' && !w.l && x > 0) n = pos - 1;
      else if (k === 'ArrowRight' && !w.r && x < cols - 1) n = pos + 1;
      else return;
      ev.preventDefault();
      if (need >= seq.length) return;
      goal = n; walk();
    };
    document.addEventListener('keydown', key);
    s.onEnd(() => document.removeEventListener('keydown', key));
    const q = U('labirinto', vL(cs(seq[0])));
    ui.onRepeat(() => V.say(need === 0 ? 'labirinto' : 'agoraLetra', vL(cs(seq[Math.min(need, seq.length - 1)]))));
    await s.wait(Promise.race([V.speak(q), finP]));
    await s.wait(finP);
    document.removeEventListener('keydown', key);
    await s.sleep(500);
    await ui.praise(s, rl.el, { u: U('labFim'), big: true });
    return wrongs ? 'ok2' : 'ok';
  }

  // ------------------------------------------------------------------
  //  LIGUE AS LETRAS (ligue os pontos na ordem e descubra o desenho)
  // ------------------------------------------------------------------
  const ROCKET = [[50, 4], [58, 12], [63, 22], [65, 34], [65, 46], [65, 58], [76, 66], [82, 78], [82, 90], [73, 86], [65, 76], [60, 86],
    [56, 97], [50, 88], [44, 97], [40, 86], [35, 76], [27, 86], [18, 90], [18, 78], [24, 66], [35, 58], [35, 46], [35, 34], [37, 22], [42, 12]];
  function shape(n) {
    const cx = 50, cy = 52, pts = [];
    if (n === 26) return { pts: ROCKET, emoji: '🚀', fill: '#ff8c42' };
    if (n === 5) {
      for (let k = 0; k < 5; k++) { const a = (-90 + k * 144) * Math.PI / 180; pts.push([cx + Math.cos(a) * 44, cy + Math.sin(a) * 44]); }
      return { pts, emoji: '⭐', fill: '#ffd23f' };
    }
    if (n % 2 === 0 && n >= 8) {
      for (let k = 0; k < n; k++) { const a = (-90 + k * 360 / n) * Math.PI / 180, r = k % 2 ? 21 : 45; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
      return { pts, emoji: '🌟', fill: '#ffd23f' };
    }
    for (let k = 0; k < n; k++) { const a = (-90 + k * 360 / n) * Math.PI / 180; pts.push([cx + Math.cos(a) * 43, cy + Math.sin(a) * 43]); }
    return { pts, emoji: '💎', fill: '#3bceac' };
  }
  async function dots(s, area, o) {
    const seq = o.seq, n = seq.length;
    const cs = roundCase();
    const sh = shape(n);
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 104');
    svg.setAttribute('class', 'dots-lines');
    const poly = document.createElementNS(NS, 'polygon');
    poly.setAttribute('points', sh.pts.map(p => p.join(',')).join(' '));
    poly.setAttribute('class', 'dots-fill');
    poly.style.fill = sh.fill;
    svg.appendChild(poly);
    const board = h('div', { class: 'dots-board' + (n > 12 ? ' many' : '') });
    board.appendChild(svg);
    const btns = seq.map((L, i) => {
      const b = h('button', { class: 'ldot' + (D.isVowel(L) ? ' vowel' : ''), style: { left: sh.pts[i][0] + '%', top: (sh.pts[i][1] / 104 * 100) + '%' } }, cs(L));
      b.dataset.i = i;
      board.appendChild(b);
      return b;
    });
    const prize = h('div', { class: 'dots-prize' }, sh.emoji);
    board.appendChild(prize);
    area.appendChild(board);
    let next = 0, wrongs = 0, lastSay = 0;
    const fin = signal(), finP = fin.wait();
    const mark = () => btns.forEach((b, i) => b.classList.toggle('next', i === next && lvl() <= 2));
    function line(a, b) {
      const l = document.createElementNS(NS, 'line');
      l.setAttribute('x1', sh.pts[a][0]); l.setAttribute('y1', sh.pts[a][1]);
      l.setAttribute('x2', sh.pts[b][0]); l.setAttribute('y2', sh.pts[b][1]);
      l.setAttribute('class', 'dots-line');
      svg.appendChild(l);
    }
    function hit(i) {
      if (next >= n) return;
      if (i === next) {
        btns[i].classList.add('done');
        if (i > 0) line(i - 1, i);
        App.fx.sfx.tap();
        App.store.record(seq[i], 'ok');
        V.say('letra', vL(cs(seq[i])));
        next++;
        mark();
        if (next >= n) { line(n - 1, 0); fin.fire(); }
      } else if (!btns[i].classList.contains('done')) {
        wrongs++;
        App.fx.sfx.soft();
        btns[i].classList.remove('shake'); void btns[i].offsetWidth; btns[i].classList.add('shake');
        if (Date.now() - lastSay > 2500) { lastSay = Date.now(); V.say('procure', vL(cs(seq[next]))); }
      }
    }
    btns.forEach((b, i) => b.addEventListener('click', () => hit(i)));
    // Arrastando o dedo também liga (só conta ao passar na próxima letra).
    board.addEventListener('pointermove', (ev) => {
      if (!ev.buttons && ev.pointerType === 'mouse') return;
      const e = document.elementFromPoint(ev.clientX, ev.clientY);
      const d = e && e.closest && e.closest('.ldot');
      if (d && +d.dataset.i === next) hit(next);
    });
    mark();
    ui.onRepeat(() => V.say(next === 0 ? 'ligue' : 'procure', vL(cs(seq[Math.min(next, n - 1)]))));
    await s.wait(Promise.race([V.say('ligue', vL(cs(seq[0]))), finP]));
    await s.wait(finP);
    board.classList.add('solved');
    App.fx.sfx.fanfare();
    await s.sleep(700);
    await ui.praise(s, prize, { u: U('ligueFim'), big: true });
    return wrongs ? 'ok2' : 'ok';
  }

  // ------------------------------------------------------------------
  //  TREM DO ALFABETO: qual letra está faltando?
  // ------------------------------------------------------------------
  async function train(s, area, o) {
    const seq = o.seq;                       // janela da sequência, em ordem
    const cs = roundCase();
    const nMiss = Math.min(seq.length - 1, [1, 2, 2][lvl() - 1] || 1);
    const miss = shuffle(seq.map((_, i) => i).filter(i => lvl() >= 3 || i > 0)).slice(0, nMiss).sort((a, b) => a - b);
    const panel = (App.assetMeta && App.assetMeta.trem && App.assetMeta.trem.panel) || { x: 0.16, y: 0.2, w: 0.68, h: 0.42 };
    const tr = h('div', { class: 'train', style: { '--n': seq.length } });
    const wagons = seq.map((L, i) => {
      const slot = h('div', { class: 'wagon-letter', style: { left: (panel.x * 100) + '%', top: (panel.y * 100) + '%', width: (panel.w * 100) + '%', height: (panel.h * 100) + '%' } });
      if (miss.includes(i)) slot.appendChild(h('b', { class: 'wagon-q' }, '?'));
      else slot.appendChild(art(cs(L), { tight: true }));
      const w = h('div', { class: 'wagon' + (miss.includes(i) ? ' miss' : '') }, pic('jogo/trem_vagao.png', '🚃'), slot);
      tr.appendChild(w);
      return { w, slot };
    });
    tr.appendChild(h('div', { class: 'loco' }, pic('jogo/trem_loco.png', '🚂')));
    const tray = h('div', { class: 'tiles' });
    area.appendChild(h('div', { class: 'train-track' }, tr));
    area.appendChild(tray);
    let wrongs = 0;
    for (let m = 0; m < miss.length; m++) {
      const i = miss[m], L = seq[i];
      wagons.forEach((x, k) => x.w.classList.toggle('now', k === i));
      const pool = D.ALPHABET.filter(x => x !== L);
      // Opções: a certa + vizinhas na ordem (as que mais confundem) + uma qualquer
      const near = [D.ALPHABET[D.ALPHABET.indexOf(L) + 1], D.ALPHABET[D.ALPHABET.indexOf(L) - 1]].filter(Boolean);
      const opts = shuffle([L].concat(shuffle(near.concat(shuffle(pool).slice(0, 3))).filter((x, k, a) => x !== L && a.indexOf(x) === k).slice(0, lvl() + 1)));
      tray.innerHTML = '';
      const tiles = opts.map(x => App.games.tile(cs(x)));
      tiles.forEach(t => tray.appendChild(t));
      const onlyVowels = seq.every(x => D.isVowel(x));
      // "Vem depois de" só vale para vogais ou letras vizinhas no alfabeto (no nome a ordem é outra)
      const consec = i > 0 && D.ALPHABET.indexOf(seq[i]) === D.ALPHABET.indexOf(seq[i - 1]) + 1;
      const q = i > 0 && !miss.includes(i - 1) && (onlyVowels || consec) ? U(onlyVowels ? 'depoisVogal' : 'depoisDe', vL(cs(seq[i - 1]))) : U('qualFalta');
      ui.onRepeat(() => V.speak(q));
      const picks = clickQueue(tiles);
      await s.wait(Promise.race([V.speak(q), picks.any()]));
      for (; ;) {
        const t = tiles[await s.wait(picks.next())];
        if (t.classList.contains('wrong')) continue;
        if (t.dataset.ch.toUpperCase() === L) {
          t.classList.add('right');
          const sl = wagons[i].slot;
          sl.innerHTML = '';
          sl.appendChild(art(cs(L), { tight: true }));
          wagons[i].w.classList.remove('miss', 'now');
          wagons[i].w.classList.add('pop-in');
          App.fx.sfx.ok(); App.fx.sparkle(wagons[i].w);
          App.store.record(L, 'ok');
          App.ui.addStar(wagons[i].w);
          await s.say('letra', vL(cs(L)));
          break;
        }
        wrongs++;
        t.classList.add('wrong');
        App.fx.sfx.soft();
        App.store.record(L, 'err');
        await s.say('essaEh', vL(t.dataset.ch));
      }
    }
    tray.innerHTML = '';
    await s.say('tremFim');
    for (let i = 0; i < seq.length; i++) {
      wagons[i].w.classList.add('read');
      await s.say('letra', vL(cs(seq[i])));
      wagons[i].w.classList.remove('read');
    }
    App.fx.sfx.whoosh();
    tr.classList.add('go');
    await ui.praise(s, tr, { big: true, star: false });
    return wrongs ? 'ok2' : 'ok';
  }

  // ------------------------------------------------------------------
  //  BLOCOS DE VOGAIS (peças de montar)
  // ------------------------------------------------------------------
  const BRICK_COL = { A: '#ff4d6d', E: '#ffb11f', I: '#27c06a', O: '#2f7bff', U: '#9b5de5' };
  function brick(L) {
    const b = h('button', { class: 'brick', 'aria-label': 'Bloco ' + L });
    b.dataset.L = L;
    const im = h('img', { src: 'assets/3d/blocos/bloco_' + L + '.png', alt: L, draggable: 'false' });
    im.addEventListener('error', () => {
      // Sem o render 3D: bloco desenhado em CSS
      b.innerHTML = '';
      b.classList.add('css');
      b.style.setProperty('--c', BRICK_COL[L] || '#2f7bff');
      b.appendChild(h('span', { class: 'studs' }, h('i'), h('i')));
      b.appendChild(art(L, { tight: true, color: '#ffffff', width: 13 }));
    });
    b.appendChild(im);
    return b;
  }
  async function blocks(s, area, o) {
    const order = o.ordered ? D.VOWELS.slice() : shuffle(D.VOWELS);
    const meta = (App.assetMeta && App.assetMeta.blocos) || {};
    // Quanto um bloco "entra" no de baixo ao empilhar (fração da altura da imagem)
    const mA = meta.bloco_A;
    const pitch = mA ? mA.stack_step / mA.h : 0.55;
    const tower = h('div', { class: 'tower', style: { '--pitch': pitch } });
    const base = h('div', { class: 'tower-base' });
    const bimg = h('img', { src: 'assets/3d/blocos/bloco_base.png', alt: '', draggable: 'false' });
    bimg.addEventListener('error', () => base.classList.add('css'));
    base.appendChild(bimg);
    const stack = h('div', { class: 'tower-stack' });
    tower.append(stack, base);
    const tray = h('div', { class: 'brick-tray' });
    area.appendChild(h('div', { class: 'blocks-table' }, tower, tray));
    let wrongs = 0;
    const fillTray = (left) => { tray.innerHTML = ''; const bs = shuffle(left).map(brick); bs.forEach(b => tray.appendChild(b)); return bs; };
    let left = D.VOWELS.slice();
    if (o.ordered) await s.say('naOrdem');
    for (let k = 0; k < order.length; k++) {
      const L = order[k];
      const bs = fillTray(o.ordered ? left : D.VOWELS);
      const q = U('pegueBloco', { L });
      ui.onRepeat(() => V.speak(q));
      const picks = clickQueue(bs);
      await s.wait(Promise.race([V.speak(q), picks.any()]));
      for (; ;) {
        const b = bs[await s.wait(picks.next())];
        if (b.dataset.L === L) {
          App.fx.sfx.pop();
          App.store.record(L, 'ok');
          const placed = brick(L);
          placed.classList.add('placed', 'drop-in');
          placed.disabled = true;
          stack.appendChild(placed);
          b.classList.add('used');
          App.ui.addStar(placed);
          left = left.filter(x => x !== L);
          await s.sleep(450);
          break;
        }
        wrongs++;
        App.fx.sfx.soft();
        App.store.record(L, 'err');
        b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
        await s.say('essaEh', { L: b.dataset.L });
        await s.say('procure', { L });
      }
    }
    tray.innerHTML = '';
    tower.classList.add('done');
    App.fx.sfx.fanfare();
    await ui.praise(s, tower, { u: U('torre'), big: true, star: false });
    return wrongs ? 'ok2' : 'ok';
  }

  App.games2 = { maze, dots, train, blocks, pic, sequence, windowOf, nameLetters, rail, roundCase };
})(window.App);
