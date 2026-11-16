'use strict';
// =====================================================================
//  Jogos com as letrinhas. Cada jogo tem uma "rodada" (usada também
//  pela Aventura) e um modo avulso que repete várias rodadas.
// =====================================================================
(function (App) {
  const { h, pick, shuffle, sleep, rand, signal, waitClick, clickQueue, norm } = App.util;
  // Fala a pergunta, mas se a criança tocar antes de terminar, segue na hora.
  async function askThenPick(s, u, picks) {
    await s.wait(Promise.race([V.speak(u), picks.any()]));
    return s.wait(picks.next());
  }
  const D = App.data, ui = App.ui, V = App.voice;
  const S = () => App.store.settings;
  const art = (ch, o) => App.strokes.el(ch, o);
  const U = (k, v) => V.U(k, v);
  const vL = (ch) => ({ L: ch.toUpperCase(), Lshown: ch });

  function bigLetter(ch, cls) {
    return h('div', { class: 'big-letter ' + (cls || '') }, art(ch, { tight: true }));
  }
  function tile(ch, cls) {
    const b = h('button', { class: 'tile ' + (cls || ''), 'aria-label': 'Letra ' + ch });
    b.appendChild(art(ch, { tight: false, minW: 70 }));
    b.dataset.ch = ch;
    return b;
  }
  const sameCase = (ch, L) => ch === ch.toUpperCase() ? L.toUpperCase() : L.toLowerCase();
  const plainWord = (w) => /^[A-Z]+$/.test(w);

  // ------------------------------------------------------------------
  //  CONHECER A LETRA
  // ------------------------------------------------------------------
  async function present(s, area, o) {
    const L = o.L.toUpperCase();
    const w = o.word || ui.wordFor(L);
    const cx = S().caixa;
    const box = h('div', { class: 'present' });
    const pair = h('div', { class: 'present-pair' });
    if (cx !== 'minusculas') pair.appendChild(h('div', { class: 'present-card' }, art(L), h('small', null, 'maiúscula')));
    if (cx !== 'maiusculas') pair.appendChild(h('div', { class: 'present-card' }, art(L.toLowerCase()), h('small', null, 'minúscula')));
    const wordEl = h('div', { class: 'present-word' },
      h('span', { class: 'emoji' }, w[2]),
      h('span', { class: 'word-text' }, h('b', { style: { color: App.strokes.colorOf(L) } }, w[0][0]), w[0].slice(1)));
    box.appendChild(pair);
    box.appendChild(wordEl);
    const again = h('button', { class: 'btn ghost' }, '🔊', h('span', null, 'Ouvir de novo'));
    const go = h('button', { class: 'btn big green pulse' }, 'Continuar ▶');
    const bar = h('div', { class: 'row-btns' }, again, go);
    area.appendChild(box);
    area.appendChild(bar);
    App.store.record(L, 'visto');
    V.prefetch([U('estaEh', { L }), U('maiMin', { L }), U('deWord', { L, W: w[0] })]);
    let skip = false;
    const talk = async () => {
      await s.say('estaEh', { L });
      if (skip) return;
      if (cx === 'ambas') await s.say('maiMin', { L });
      if (skip) return;
      wordEl.classList.add('pop-in');
      await s.say('deWord', { L, W: w[0] });
    };
    let busy = true;
    again.addEventListener('click', async () => { if (busy) return; busy = true; skip = false; try { await talk(); } catch (e) { } busy = false; });
    const goQ = clickQueue([go]);
    if (o.auto) { await talk(); await s.sleep(400); return 'ok'; }
    await s.wait(Promise.race([talk(), goQ.any()]));
    busy = false;
    await s.wait(goQ.next());
    skip = true;
    V.stop();
    App.fx.sfx.tap();
    return 'ok';
  }

  // ------------------------------------------------------------------
  //  QUE LETRA É ESSA? (fala pra mim)
  // ------------------------------------------------------------------
  async function whichLetter(s, area, o) {
    const ch = o.ch, L = ch.toUpperCase();
    const big = bigLetter(ch, 'zoom-in');
    area.appendChild(big);
    App.avatar.lookAt(big);
    V.prefetch([U('quaseLetra', vL(ch)), U('essaEh', vL(ch))]);
    const r = await ui.ask(s, area, {
      question: o.first ? U('queLetra') : U('queLetra2'),
      target: L, type: 'letter', wrong: U('quaseLetra', vL(ch))
    });
    if (r === 'ok') { App.store.record(L, 'ok'); await ui.praise(s, big); }
    else if (r === 'ok2') { App.store.record(L, 'visto'); await ui.praise(s, big, { key: 'esforco', confetti: false }); }
    else { App.store.record(L, 'err'); await s.say('essaEh', vL(ch)); }
    return r;
  }

  // ------------------------------------------------------------------
  //  REPITA COMIGO
  // ------------------------------------------------------------------
  async function repeatMe(s, area, o) {
    const ch = o.ch, L = ch.toUpperCase();
    const big = bigLetter(ch, 'zoom-in');
    area.appendChild(big);
    const r = await ui.ask(s, area, {
      question: U('repita', vL(ch)), target: L, type: 'letter', wrong: U('repitaAlto', vL(ch)), lenient: true
    });
    App.store.record(L, 'visto');
    if (r === 'ok') App.store.record(L, 'ok');
    await ui.praise(s, big, { confetti: r === 'ok' });
    return r;
  }

  // ------------------------------------------------------------------
  //  ENCONTRE A LETRA
  // ------------------------------------------------------------------
  async function findLetter(s, area, o) {
    const ch = o.ch, L = ch.toUpperCase();
    const n = o.n || [3, 4, 6][S().nivel - 1] || 4;
    const opts = shuffle([L, ...ui.distractors(L, n - 1, o.set)]).map(x => sameCase(ch, x));
    const grid = h('div', { class: 'tiles n' + opts.length });
    const tiles = opts.map(x => tile(x));
    tiles.forEach(t => grid.appendChild(t));
    const ear = h('button', { class: 'btn ghost' }, '🔊', h('span', null, 'Ouvir de novo'));
    area.appendChild(h('div', { class: 'ask-line' }, ear));
    area.appendChild(grid);
    const key = S().caixa === 'ambas' ? (ch === L ? 'toqueMai' : 'toqueMin') : 'toque';
    const q = U(key, vL(ch));
    V.prefetch([q, U('procure', vL(ch))].concat(opts.map(x => U('essaEh', vL(x)))));
    ear.addEventListener('click', () => V.speak(q));
    const picks = clickQueue(tiles);
    let missed = false, i = await askThenPick(s, q, picks);
    for (; ; i = await s.wait(picks.next())) {
      const t = tiles[i];
      if (t.classList.contains('wrong')) continue;
      if (t.dataset.ch === ch) {
        t.classList.add('right');
        grid.classList.add('solved');
        App.store.record(L, missed ? 'err' : 'ok');
        await ui.praise(s, t);
        return missed ? 'ok2' : 'ok';
      }
      missed = true;
      t.classList.add('wrong');
      App.fx.sfx.soft();
      t.classList.remove('shake'); void t.offsetWidth; t.classList.add('shake');
      await s.say('essaEh', vL(t.dataset.ch));
      await s.say('procure', vL(ch));
    }
  }

  // ------------------------------------------------------------------
  //  MAIÚSCULA E MINÚSCULA (achar o par)
  // ------------------------------------------------------------------
  async function pairCase(s, area, o) {
    const L = o.L.toUpperCase();
    const showUpper = o.upper !== undefined ? o.upper : Math.random() < 0.6;
    const shown = showUpper ? L : L.toLowerCase();
    const n = [3, 3, 4][S().nivel - 1] || 3;
    const opts = shuffle([L, ...ui.distractors(L, n - 1, o.set)]).map(x => showUpper ? x.toLowerCase() : x);
    const left = bigLetter(shown, 'zoom-in small');
    const tiles = opts.map(x => tile(x));
    const grid = h('div', { class: 'tiles n' + opts.length }, ...tiles);
    area.appendChild(h('div', { class: 'pair-row' }, left, h('div', { class: 'arrow-big' }, '➜'), h('div', { class: 'pair-q' }, '?')));
    area.appendChild(grid);
    const q = U(showUpper ? 'qualMin' : 'qualMai', { L, Lshown: shown });
    ui.onRepeat(() => V.speak(q));
    const picks = clickQueue(tiles);
    let missed = false, i = await askThenPick(s, q, picks);
    for (; ; i = await s.wait(picks.next())) {
      const t = tiles[i];
      if (t.classList.contains('wrong')) continue;
      if (t.dataset.ch.toUpperCase() === L) {
        t.classList.add('right');
        area.querySelector('.pair-q').replaceWith(bigLetter(t.dataset.ch, 'small pop-in'));
        App.store.record(L, missed ? 'err' : 'ok');
        await ui.praise(s, t);
        return missed ? 'ok2' : 'ok';
      }
      missed = true;
      t.classList.add('wrong');
      App.fx.sfx.soft();
      await s.say('essaEh', vL(t.dataset.ch));
    }
  }

  // ------------------------------------------------------------------
  //  BALÕES
  // ------------------------------------------------------------------
  const BCOL = ['#ff4d6d', '#ffd23f', '#3bceac', '#2f7bff', '#9b5de5', '#ff8c42', '#00bbf9', '#f15bb5'];
  async function balloons(s, area, o) {
    const L = o.L.toUpperCase();
    const goal = o.goal || [4, 6, 8][S().nivel - 1] || 6;
    const pool = (o.set && o.set.length > 2 ? o.set : D.VOWELS).filter(x => x !== L);
    const sky = h('div', { class: 'sky' });
    const meter = h('div', { class: 'balloon-meter' });
    for (let i = 0; i < goal; i++) meter.appendChild(h('i'));
    const badge = h('div', { class: 'sky-target' }, art(L), S().caixa !== 'maiusculas' ? art(L.toLowerCase()) : null);
    area.appendChild(h('div', { class: 'sky-head' }, badge, meter));
    area.appendChild(sky);
    let got = 0, lastSay = 0, spawned = 0, sinceTarget = 0;
    const fin = signal();
    const mk = () => {
      if (!s.alive) return;
      const isT = sinceTarget >= 2 || Math.random() < 0.45;
      sinceTarget = isT ? 0 : sinceTarget + 1;
      const letter = isT ? L : pick(pool.length ? pool : D.ALPHABET.filter(x => x !== L));
      const ch = ui.caseOf(letter);
      const b = h('button', { class: 'balloon', 'aria-label': 'Balão ' + ch });
      const col = BCOL[spawned++ % BCOL.length];
      b.style.setProperty('--c', col);
      b.style.left = (6 + Math.random() * 76) + '%';
      b.style.animationDuration = (8.5 - S().nivel * 0.8 + Math.random() * 2.5) + 's';
      b.appendChild(art(ch, { color: '#ffffff', width: 13 }));
      b.dataset.L = letter;
      b.dataset.ch = ch;
      b.addEventListener('animationend', (ev) => { if (ev.target === b) b.remove(); });
      b.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        if (b.classList.contains('popped')) return;
        if (b.dataset.L === L) {
          b.classList.add('popped');
          App.fx.sfx.pop();
          App.fx.sparkle(b);
          got++;
          meter.children[got - 1] && meter.children[got - 1].classList.add('on');
          App.store.record(L, 'ok');
          if (got >= goal) fin.fire();
          else if (got === Math.ceil(goal / 2)) V.say('elogio3');
          setTimeout(() => b.remove(), 300);
        } else {
          b.classList.remove('wobble'); void b.offsetWidth; b.classList.add('wobble');
          App.fx.sfx.soft();
          if (Date.now() - lastSay > 2500) { lastSay = Date.now(); V.say('essaEh', vL(b.dataset.ch)); }
        }
      });
      sky.appendChild(b);
    };
    await s.say('baloes', { L });
    const iv = setInterval(mk, 1250 - S().nivel * 120);
    mk();
    s.onEnd(() => clearInterval(iv));
    await s.wait(fin.wait());
    clearInterval(iv);
    sky.querySelectorAll('.balloon').forEach(b => b.classList.add('fly-away'));
    await ui.praise(s, badge, { big: true });
    return 'ok';
  }

  // ------------------------------------------------------------------
  //  JOGO DA MEMÓRIA (maiúscula com minúscula)
  // ------------------------------------------------------------------
  async function memory(s, area, o) {
    const n = o.pairs || [3, 4, 6][S().nivel - 1] || 4;
    const letters = shuffle(o.letters || ui.letterSet('aventura')).slice(0, n);
    const cards = shuffle(letters.flatMap(L => [L, L.toLowerCase()]));
    const grid = h('div', { class: 'memory n' + cards.length });
    const els = cards.map(ch => {
      const c = h('button', { class: 'mem-card', 'aria-label': 'Carta' },
        h('div', { class: 'mem-inner' },
          h('div', { class: 'mem-back' }, '🤖'),
          h('div', { class: 'mem-front' }, art(ch, { minW: 70 }))));
      c.dataset.ch = ch;
      grid.appendChild(c);
      return c;
    });
    area.appendChild(grid);
    let open = [], matched = 0, lock = false;
    const fin = signal();
    els.forEach(c => c.addEventListener('click', async () => {
      if (lock || c.classList.contains('flip') || c.classList.contains('match')) return;
      c.classList.add('flip');
      App.fx.sfx.flip();
      V.say('letra', vL(c.dataset.ch));
      open.push(c);
      if (open.length < 2) return;
      const [a, b] = open; open = [];
      if (a.dataset.ch !== b.dataset.ch && a.dataset.ch.toUpperCase() === b.dataset.ch.toUpperCase()) {
        lock = true;
        await sleep(450);
        a.classList.add('match'); b.classList.add('match');
        App.fx.sfx.ok(); App.fx.sparkle(b);
        App.store.record(a.dataset.ch, 'ok');
        matched++;
        V.say('par', vL(a.dataset.ch.toUpperCase()));
        lock = false;
        if (matched === letters.length) fin.fire();
      } else {
        lock = true;
        await sleep(1100);
        a.classList.remove('flip'); b.classList.remove('flip');
        lock = false;
      }
    }));
    const finP = fin.wait();
    await s.wait(Promise.race([V.say('memoria'), finP]));
    await s.wait(finP);
    await s.sleep(1200);
    await ui.praise(s, grid, { big: true });
    return 'ok';
  }

  // ------------------------------------------------------------------
  //  COM QUE LETRA COMEÇA?
  // ------------------------------------------------------------------
  function wordRow(word, cls) {
    const row = h('div', { class: 'word-row ' + (cls || '') });
    word.split('').forEach(ch => row.appendChild(h('span', { class: 'slot filled' }, art(ch, { minW: 60 }))));
    return row;
  }
  async function firstLetter(s, area, o) {
    const w = o.word;
    const L = w[0][0];
    const opts = shuffle([L, ...ui.distractors(L, ([2, 2, 3][S().nivel - 1] || 2), o.set)]);
    const pic = h('div', { class: 'word-pic zoom-in' }, w[2]);
    const row = h('div', { class: 'word-row' });
    w[0].split('').forEach((ch, i) => row.appendChild(h('span', { class: 'slot ' + (i === 0 ? 'q' : 'filled') }, i === 0 ? '?' : art(ch, { minW: 60 }))));
    const tiles = opts.map(x => tile(x));
    area.appendChild(pic);
    area.appendChild(row);
    area.appendChild(h('div', { class: 'tiles n' + tiles.length }, ...tiles));
    const q = U('comeca', { W: w[0] });
    ui.onRepeat(() => V.speak(q));
    pic.addEventListener('click', () => V.speak(q));
    V.prefetch([U('comecaCom', { W: w[0], L })]);
    const picks = clickQueue(tiles);
    let missed = false, i = await askThenPick(s, q, picks);
    for (; ; i = await s.wait(picks.next())) {
      const t = tiles[i];
      if (t.classList.contains('wrong')) continue;
      if (t.dataset.ch === L) {
        t.classList.add('right');
        const first = row.firstChild;
        first.className = 'slot filled pop-in';
        first.innerHTML = '';
        first.appendChild(art(L, { minW: 60 }));
        App.store.record(L, missed ? 'err' : 'ok');
        await ui.praise(s, first, { u: U('comecaCom', { W: w[0], L }), then: true });
        return missed ? 'ok2' : 'ok';
      }
      missed = true;
      t.classList.add('wrong');
      App.fx.sfx.soft();
      await s.say('essaEh', vL(t.dataset.ch));
      await s.sayU(q);
    }
  }

  // ------------------------------------------------------------------
  //  FORMAR PALAVRAS
  // ------------------------------------------------------------------
  async function buildWord(s, area, o) {
    const w = o.word;           // ['BOLA','bola','⚽']
    const isName = !!o.isName;
    const letters = w[0].split('');
    const level = o.level || S().nivel;
    const pic = h('div', { class: 'word-pic' }, w[2]);
    const row = h('div', { class: 'word-row build' });
    const slots = letters.map(ch => {
      const sl = h('span', { class: 'slot empty' });
      if (level <= 2) sl.appendChild(art(ch, { minW: 60, color: '#d5dbee' }));
      row.appendChild(sl);
      return sl;
    });
    let pool = letters.slice();
    if (level >= 3) pool = pool.concat(ui.distractors(letters[0], 2).filter(x => !letters.includes(x)));
    // Embaralha de verdade: nunca entrega as peças já na ordem da palavra.
    let mixed = shuffle(pool);
    for (let k = 0; k < 8 && mixed.join('').startsWith(w[0]) && new Set(pool).size > 1; k++) mixed = shuffle(pool);
    const tiles = mixed.map(x => tile(x, 'sm'));
    const tray = h('div', { class: 'tiles tray n' + tiles.length }, ...tiles);
    area.appendChild(pic);
    area.appendChild(row);
    area.appendChild(tray);
    const q = o.introU || (isName ? U('seuNome') : U('vamosEscrever', { W: w[0] }));
    ui.onRepeat(() => V.speak(q));
    V.prefetch([U('escreveuPalavra', { W: w[0] }), U('palavra', { W: w[0] })].concat(letters.map(x => U('letra', { L: x }))));
    const picks = clickQueue(tiles);
    await s.wait(Promise.race([(async () => { await s.sayU(q); if (o.firstTime) await s.say('toqueOrdem'); })(), picks.any()]));
    let pos = 0, errs = 0;
    while (pos < letters.length) {
      const need = letters[pos];
      slots.forEach((sl, i) => sl.classList.toggle('next', i === pos));
      const t = tiles[await s.wait(picks.next())];
      if (t.classList.contains('used')) continue;
      if (t.dataset.ch === need) {
        t.classList.add('used');
        const sl = slots[pos];
        sl.className = 'slot filled pop-in';
        sl.innerHTML = '';
        sl.appendChild(art(need, { minW: 60 }));
        App.fx.sfx.tap();
        App.store.record(need, 'ok');
        pos++;
        if (pos < letters.length) V.say('letra', { L: need });
      } else {
        errs++;
        App.fx.sfx.soft();
        t.classList.remove('shake'); void t.offsetWidth; t.classList.add('shake');
        await s.say('essaEh', { L: t.dataset.ch });
        await s.say('precisamos', { L: need });
      }
    }
    slots.forEach(sl => sl.classList.remove('next'));
    // Lê letra por letra, depois a palavra inteira
    await s.sleep(250);
    for (let i = 0; i < slots.length; i++) {
      slots[i].classList.add('read');
      await s.say('letra', { L: letters[i] });
      slots[i].classList.remove('read');
    }
    row.classList.add('glow');
    if (isName) { await ui.praise(s, row, { u: o.outroU || U('escreveuNome'), big: true }); return errs ? 'ok2' : 'ok'; }
    const r = await ui.ask(s, area, { question: U('escreveuPalavra', { W: w[0] }), target: w[1], type: 'text', lenient: true, ms: 5000 });
    area.querySelector('.ask-bar') && area.querySelector('.ask-bar').remove();
    await ui.praise(s, row, { big: true });
    return errs ? 'ok2' : 'ok';
  }

  // ------------------------------------------------------------------
  //  SÍLABAS (juntar consoante e vogal)
  // ------------------------------------------------------------------
  async function syllables(s, area, o) {
    const C = o.C.toUpperCase();
    const fam = D.VOWELS.map(v => D.syllable(C, v));
    const strip = h('div', { class: 'syl-strip' }, ...fam.map(sy => h('span', { class: 'syl-chip' }, sy.s)));
    const play = h('div', { class: 'syl-play' });
    area.appendChild(strip);
    area.appendChild(play);
    await s.say('familia', { L: C });
    for (let i = 0; i < fam.length; i++) {
      const sy = fam[i];
      play.innerHTML = '';
      const a = h('div', { class: 'syl-part left' }, art(sy.c, { tight: true }));
      const b = h('div', { class: 'syl-part right' }, art(sy.v, { tight: true }));
      const plus = h('div', { class: 'syl-plus' }, '+');
      play.append(a, plus, b);
      V.prefetch([U('faz', { C: sy.c, V: sy.v, S: sy.s }), U('repitaSil', { S: sy.s })]);
      await s.sleep(400);
      await s.say('faz', { C: sy.c, V: sy.v, S: sy.s });
      play.classList.add('merge');
      await s.sleep(500);
      play.classList.remove('merge');
      play.innerHTML = '';
      const card = h('div', { class: 'syl-card pop-in' }, art(sy.c, { tight: true }), art(sy.v, { tight: true }));
      play.appendChild(card);
      const r = await ui.ask(s, area, { question: U('repitaSil', { S: sy.s }), target: norm(sy.t), type: 'text', lenient: true, ms: 5000 });
      area.querySelector('.ask-bar') && area.querySelector('.ask-bar').remove();
      strip.children[i].classList.add('done');
      App.fx.sfx.ok();
      App.avatar.happy(1200);
      if (r === 'ok') App.ui.addStar(card);
    }
    // Leitura da família toda
    play.innerHTML = '';
    for (let i = 0; i < fam.length; i++) {
      strip.children[i].classList.add('read');
      await s.say('silaba', { S: fam[i].s });
      strip.children[i].classList.remove('read');
    }
    await ui.praise(s, strip, { big: true });
    return 'ok';
  }

  // ------------------------------------------------------------------
  //  CANTAR O ALFABETO
  // ------------------------------------------------------------------
  async function alphabetSong(s, area, o) {
    const list = o.letters || D.ALPHABET;
    const grid = h('div', { class: 'abc-strip' }, ...list.map(L => h('span', { class: 'abc-chip' }, L)));
    const big = h('div', { class: 'big-letter' });
    area.appendChild(big);
    area.appendChild(grid);
    await s.say('alfabeto');
    for (let i = 0; i < list.length; i++) {
      const L = list[i];
      big.innerHTML = '';
      big.appendChild(h('div', { class: 'duo pop-in' }, art(L), art(L.toLowerCase())));
      grid.children[i].classList.add('now');
      grid.children[i].scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      await s.say('letra', { L });
      if (V.canListen()) await s.wait(V.listen({ ms: 2600 }));
      else await s.sleep(1300);
      grid.children[i].classList.remove('now');
      grid.children[i].classList.add('done');
      App.store.record(L, 'visto');
    }
    await ui.praise(s, big, { key: 'alfabetoFim', big: true });
    return 'ok';
  }

  App.games = {
    present, whichLetter, repeatMe, findLetter, pairCase, balloons, memory, firstLetter, buildWord, syllables, alphabetSong,
    bigLetter, tile, plainWord
  };
})(window.App);
