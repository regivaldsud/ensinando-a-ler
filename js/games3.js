'use strict';
// =====================================================================
//  Jogos de FALAR, LER e de TEMPO: mostre e fale, motor do R,
//  desafio de voz (fases), leia e escolha, corrida contra o tempo,
//  escrever palavras letra por letra.
// =====================================================================
(function (App) {
  const { h, pick, shuffle, sleep, rand, signal, clickQueue, norm } = App.util;
  const D = App.data, ui = App.ui, V = App.voice, G = App.games, G2 = App.games2;
  const S = () => App.store.settings;
  const art = (ch, o) => App.strokes.el(ch, o);
  const U = (k, v) => V.U(k, v);
  const vL = (ch) => ({ L: ch.toUpperCase(), Lshown: ch });
  const lvl = () => S().nivel || 2;

  // Palavra escrita: com as letras desenhadas (ou texto, se tiver acento)
  function writtenWord(w, cls) {
    if (G.plainWord(w)) {
      const row = h('div', { class: 'word-row ' + (cls || '') });
      w.split('').forEach(ch => row.appendChild(h('span', { class: 'slot filled' }, art(ch, { minW: 60 }))));
      return row;
    }
    return h('div', { class: 'word-plain ' + (cls || '') }, h('b', { style: { color: App.strokes.colorOf(norm(w)[0] || 'b') } }, w[0]), w.slice(1));
  }

  // ------------------------------------------------------------------
  //  MOSTRE E FALE: aparece a figura, a criança diz a palavra
  // ------------------------------------------------------------------
  async function showSay(s, area, o) {
    const w = o.word;
    const picEl = h('div', { class: 'word-pic big zoom-in' }, w[2]);
    const word = writtenWord(w[0], 'flash-word' + (lvl() >= 2 && !o.showWord ? ' veil' : ''));
    area.appendChild(h('div', { class: 'flash' }, picEl, word));
    V.prefetch([U('issoE', { W: w[0] })]);
    const r = await ui.ask(s, area, {
      question: o.question || U('oQueE'), target: w[1], type: 'text', wrong: U('issoE', { W: w[0] }), lenient: true, ms: 6000
    });
    const bar = area.querySelector('.ask-bar'); bar && bar.remove();
    word.classList.remove('veil');
    word.classList.add('pop-in');
    if (r === 'ok') await ui.praise(s, picEl, { u: U('leuCerto', { W: w[0] }) });
    else await ui.praise(s, picEl, { key: 'esforco', confetti: false });
    return r;
  }

  // ------------------------------------------------------------------
  //  MOTOR DO R: a moto anda enquanto a criança faz o barulho do motor
  // ------------------------------------------------------------------
  async function motor(s, area) {
    const moto = h('div', { class: 'moto' }, G2.pic('jogo/moto.png', '🏍️'));
    const flag = h('div', { class: 'road-flag' }, G2.pic('jogo/bandeira.png', '🏁'));
    const meter = h('div', { class: 'vu' }, h('i'));
    const hold = h('button', { class: 'btn big mic-btn vrum' }, '🏍️ VRRRUM!');
    const road = h('div', { class: 'road' }, h('div', { class: 'road-line' }), moto, flag);
    area.appendChild(h('div', { class: 'r-big' }, 'RRRRRR!'));
    area.appendChild(road);
    area.appendChild(h('div', { class: 'row-btns' }, meter, hold));
    area.appendChild(h('p', { class: 'hint' }, 'Faça o barulho do motor no microfone — ou segure o botão — para a moto andar até a bandeira.'));
    let prog = 0, held = false, level = 0, stream = null, raf = 0, last = performance.now();
    const fin = signal(), finP = fin.wait();
    hold.addEventListener('pointerdown', (e) => { e.preventDefault(); held = true; prog = Math.min(1, prog + 0.05); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => hold.addEventListener(t, () => { held = false; }));
    // Microfone: mede só o volume (nada é gravado nem enviado).
    let an = null, data = null;
    // O pedido de permissão não trava o jogo: enquanto isso, o botão de segurar já funciona.
    if (S().microfone && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false } }).then(st => {
        if (!s.alive || prog >= 1) { st.getTracks().forEach(t => t.stop()); return; }
        stream = st;
        const c = App.fx.ctx();
        const src = c.createMediaStreamSource(st);
        const a2 = c.createAnalyser(); a2.fftSize = 1024;
        src.connect(a2);
        data = new Uint8Array(a2.fftSize);
        an = a2;
      }).catch(() => { });
    }
    const stopMic = () => { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } cancelAnimationFrame(raf); };
    s.onEnd(stopMic);
    await s.say('motor');
    last = performance.now();
    let speaking = true;
    setTimeout(() => { speaking = false; }, 300);
    const loop = () => {
      const now = performance.now(), dt = now - last; last = now;
      if (an) {
        an.getByteTimeDomainData(data);
        let sum = 0; for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
        level = Math.min(1, Math.sqrt(sum / data.length) * 6);
      } else level = 0;
      const on = held || (!speaking && level > 0.22);
      meter.firstChild.style.width = Math.round(Math.max(level, held ? 0.9 : 0) * 100) + '%';
      moto.classList.toggle('run', on);
      if (on) prog = Math.min(1, prog + dt / 3800);
      moto.style.left = (prog * 82) + '%';
      if (prog >= 1) { fin.fire(); return; }
      raf = requestAnimationFrame(loop);
    };
    loop();
    await s.wait(finP);
    stopMic();
    App.fx.sfx.fanfare();
    await ui.praise(s, moto, { u: U('motorFim'), big: true });
    return 'ok';
  }

  // ------------------------------------------------------------------
  //  DESAFIO DE VOZ: falar cada letra/palavra para passar de fase
  // ------------------------------------------------------------------
  function phases() {
    const name = G2.nameLetters();
    return [
      { id: 'f1', name: 'Vogais', icon: '🅰️', type: 'L', items: ['A', 'E', 'I', 'O', 'U'] },
      { id: 'f2', name: 'A até E', icon: '🔤', type: 'L', items: ['A', 'B', 'C', 'D', 'E'] },
      { id: 'f3', name: 'F até J', icon: '🔤', type: 'L', items: ['F', 'G', 'H', 'I', 'J'] },
      { id: 'f4', name: 'K até O', icon: '🔤', type: 'L', items: ['K', 'L', 'M', 'N', 'O'] },
      { id: 'f5', name: 'P até T', icon: '🔤', type: 'L', items: ['P', 'Q', 'R', 'S', 'T'] },
      { id: 'f6', name: 'U até Z', icon: '🔤', type: 'L', items: ['U', 'V', 'W', 'X', 'Y', 'Z'] },
      { id: 'f7', name: 'Meu nome', icon: '😀', type: 'L', items: name },
      { id: 'f8', name: 'Sílabas', icon: '🧱', type: 'S', items: ['BA', 'BE', 'BI', 'BO', 'BU'] },
      { id: 'f9', name: 'Palavras', icon: '📖', type: 'W', items: ['OVO', 'UVA', 'SOL', 'LUA', 'PAI'] },
      { id: 'f10', name: 'Mais palavras', icon: '📚', type: 'W', items: ['BOLA', 'GATO', 'CASA', 'SAPO', 'PATO'] }
    ];
  }
  // Devolve a fração de acertos de primeira (0..1)
  async function voicePhase(s, area, ph) {
    const chips = h('div', { class: 'phase-chips' }, ...ph.items.map(x => h('span', { class: 'phase-chip' }, x)));
    const view = h('div', { class: 'area' });
    area.appendChild(chips);
    area.appendChild(view);
    await s.say('fase');
    let first = 0;
    for (let i = 0; i < ph.items.length; i++) {
      const it = ph.items[i];
      view.innerHTML = '';
      chips.children[i].classList.add('now');
      let r, target;
      if (ph.type === 'L') {
        const ch = ui.caseOf(it);
        const big = G.bigLetter(ch, 'zoom-in');
        view.appendChild(big);
        r = await ui.ask(s, view, { question: U(i === 0 ? 'queLetra' : 'queLetra2'), target: it, type: 'letter', wrong: U('quaseLetra', vL(ch)) });
        // Só conta erro quando os pais marcam "Ainda não"; falha do microfone não é erro da criança.
        if (r === 'ok') App.store.record(it, 'ok'); else if (r === 'err') App.store.record(it, 'err');
        target = big;
      } else if (ph.type === 'S') {
        const sy = D.syllable(it[0], it[1]);
        const card = h('div', { class: 'syl-card zoom-in' }, art(sy.c, { tight: true }), art(sy.v, { tight: true }));
        view.appendChild(h('div', { class: 'syl-play' }, card));
        r = await ui.ask(s, view, { question: U('repitaSil', { S: sy.s }), target: norm(sy.t), type: 'text', wrong: U('repitaSil', { S: sy.s }), lenient: true });
        target = card;
      } else {
        const w = D.word(it);
        const row = writtenWord(w[0], 'zoom-in');
        view.appendChild(h('div', { class: 'word-pic' }, w[2]));
        view.appendChild(row);
        r = await ui.ask(s, view, { question: U('falaPalavra', { W: w[0] }), target: w[1], type: 'text', wrong: U('issoE', { W: w[0] }), lenient: true });
        target = row;
      }
      chips.children[i].classList.remove('now');
      chips.children[i].classList.add(r === 'ok' ? 'ok' : 'half');
      if (r === 'ok') first++;
      if (r === 'err') { App.fx.sfx.soft(); await s.say(pick(D.RETRY)); }
      else await ui.praise(s, target, { confetti: r === 'ok', key: r === 'ok' ? undefined : 'esforco' });
    }
    return first / ph.items.length;
  }

  // ------------------------------------------------------------------
  //  LEIA E ESCOLHA: ler a palavra e tocar na figura certa
  // ------------------------------------------------------------------
  async function readPick(s, area, o) {
    const w = o.word;
    const pool = o.pool.filter(x => x[0] !== w[0] && x[2] !== w[2]);
    const same = pool.filter(x => x[0][0] === w[0][0]);
    const others = shuffle(lvl() >= 3 && same.length ? same.concat(shuffle(pool)) : shuffle(pool)).filter((x, i, a) => a.findIndex(y => y[2] === x[2]) === i).slice(0, lvl() >= 2 ? 3 : 2);
    const opts = shuffle([w].concat(others));
    const row = writtenWord(w[0], 'zoom-in read-word');
    const help = h('button', { class: 'btn ghost' }, '🔊', h('span', null, 'Ajuda'));
    const btns = opts.map(x => { const b = h('button', { class: 'pic-opt' }, x[2]); b.dataset.w = x[0]; return b; });
    area.appendChild(row);
    area.appendChild(h('div', { class: 'ask-line' }, help));
    area.appendChild(h('div', { class: 'pic-opts' }, ...btns));
    let helped = false, wrongs = 0, busy = false, over = false;
    help.addEventListener('click', async () => {
      if (busy) return; busy = true; helped = true;
      try {
        const slots = [...row.querySelectorAll('.slot')];
        for (let i = 0; i < w[0].length && s.alive && !over; i++) {
          slots[i] && slots[i].classList.add('read');
          await V.say('letra', { L: norm(w[0][i]).toUpperCase() });
          slots[i] && slots[i].classList.remove('read');
        }
        if (s.alive && !over) await V.say('palavra', { W: w[0] });
      } finally { busy = false; }
    });
    ui.onRepeat(() => V.say('leiaEscolha'));
    const picks = clickQueue(btns);
    if (o.first) await s.wait(Promise.race([V.say('leiaEscolha'), picks.any()]));
    for (; ;) {
      const b = btns[await s.wait(picks.next())];
      if (b.classList.contains('wrong')) continue;
      if (b.dataset.w === w[0]) {
        over = true;
        b.classList.add('right');
        row.classList.add('glow');
        const r = (wrongs || helped) ? 'ok2' : 'ok';
        await ui.praise(s, b, { u: U('leuCerto', { W: w[0] }), confetti: r === 'ok' });
        return r;
      }
      wrongs++;
      b.classList.add('wrong');
      App.fx.sfx.soft();
      b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
      await s.say(pick(D.RETRY));
    }
  }

  // ------------------------------------------------------------------
  //  CORRIDA CONTRA O TEMPO: quantas letras em 60 segundos?
  // ------------------------------------------------------------------
  async function timeRace(s, area, o) {
    const secs = o.secs || 60;
    const set = o.set;
    const bar = h('div', { class: 'time-bar' }, h('i'));
    const scoreEl = h('b', null, '0');
    const rocket = h('div', { class: 'time-rocket' }, G2.pic('jogo/foguete.png', '🚀'));
    const sky = h('div', { class: 'time-sky' }, rocket);
    const grid = h('div', { class: 'tiles' });
    area.appendChild(h('div', { class: 'time-head' }, h('span', { class: 'time-clock' }, '⏱️'), bar, h('span', { class: 'time-score' }, '⭐ ', scoreEl)));
    area.appendChild(h('div', { class: 'time-body' }, grid, sky));
    await s.say('tempo');
    const t0 = Date.now();
    let score = 0, prev = null, over = false;
    const tick = setInterval(() => {
      const left = Math.max(0, 1 - (Date.now() - t0) / (secs * 1000));
      bar.firstChild.style.width = (left * 100) + '%';
      bar.classList.toggle('low', left < 0.2);
    }, 200);
    s.onEnd(() => clearInterval(tick));
    const timeUp = sleep(secs * 1000).then(() => { over = true; return -1; });
    while (!over) {
      const L = ui.pickLetter(set, prev); prev = L;
      const ch = ui.caseOf(L);
      const n = [3, 4, 5][lvl() - 1] || 4;
      const opts = shuffle([L, ...ui.distractors(L, n - 1, set)]).map(x => ch === ch.toUpperCase() ? x.toUpperCase() : x.toLowerCase());
      grid.innerHTML = '';
      const tiles = opts.map(x => G.tile(x));
      tiles.forEach(t => grid.appendChild(t));
      const u = U('letra', vL(ch));
      ui.onRepeat(() => V.speak(u));
      V.speak(u);
      const picks = clickQueue(tiles);
      for (; ;) {
        const i = await s.wait(Promise.race([picks.next(), timeUp]));
        if (i === -1 || over) break;
        const t = tiles[i];
        if (t.dataset.ch === ch) {
          score++;
          scoreEl.textContent = score;
          App.fx.sfx.pop();
          App.store.record(L, 'ok');
          rocket.style.bottom = Math.min(78, score * 6) + '%';
          t.classList.add('right');
          await sleep(160);
          break;
        }
        t.classList.add('wrong');
        App.fx.sfx.soft();
        App.store.record(L, 'err');
      }
    }
    clearInterval(tick);
    grid.innerHTML = '';
    const P = App.store.progress;
    P.recordes = P.recordes || {};
    const best = P.recordes.tempo || 0;
    const isRecord = score > best;
    if (isRecord) { P.recordes.tempo = score; App.store.saveProgress(); }
    grid.appendChild(h('div', { class: 'time-result pop-in' }, h('b', null, score + (score === 1 ? ' letra' : ' letras')), h('small', null, isRecord && best ? 'Novo recorde! (antes: ' + best + ')' : 'Recorde: ' + Math.max(best, score))));
    App.fx.sfx.fanfare(); App.fx.confetti(120); App.avatar.happy(2500);
    await s.say('tempoFim');
    if (isRecord && score > 0) await s.say('recorde');
    for (let i = 0; i < Math.min(5, Math.floor(score / 3)); i++) App.ui.addStar(scoreEl);
    return { score };
  }

  // ------------------------------------------------------------------
  //  ESCREVER UMA PALAVRA (ou o nome), letra por letra, com o dedo
  // ------------------------------------------------------------------
  async function traceWord(s, area, o) {
    const letters = o.letters;                    // letras como devem ser escritas (maiúsculas/minúsculas)
    const top = h('div', { class: 'word-row mini-row' });
    letters.forEach(ch => top.appendChild(h('span', { class: 'slot empty' }, art(ch, { minW: 60, color: '#d5dbee' }))));
    const zone = h('div', { class: 'area trace-area' });
    area.appendChild(top);
    area.appendChild(zone);
    await s.sayU(o.intro);
    for (let i = 0; i < letters.length; i++) {
      [...top.children].forEach((c, k) => c.classList.toggle('next', k === i));
      zone.innerHTML = '';
      const t = App.trace.play(s, zone, { ch: letters[i] });
      if (i === 0) { await s.say('olhaComo', vL(letters[i])); await s.wait(t.demo()); await s.say('suaVez'); }
      else V.say('letra', vL(letters[i]));
      await s.wait(t.finished);
      t.cleanup();
      App.store.record(letters[i], 'tr');
      App.fx.sfx.ok();
      const sl = top.children[i];
      sl.className = 'slot filled pop-in';
      sl.innerHTML = '';
      sl.appendChild(art(letters[i], { minW: 60 }));
      App.ui.addStar(sl);
      await s.sleep(450);
    }
    [...top.children].forEach(c => c.classList.remove('next'));
    zone.innerHTML = '';
    top.classList.add('glow');
    await ui.praise(s, top, { u: o.outro, big: true, star: false });
    return 'ok';
  }

  App.games3 = { showSay, motor, phases, voicePhase, readPick, timeRace, traceWord, writtenWord };
})(window.App);
