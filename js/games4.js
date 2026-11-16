'use strict';
// =====================================================================
//  BRINCAR COM OS SONS (consciência fonológica): jogos de ouvido,
//  que preparam para a leitura — sílabas, som inicial e vogais.
// =====================================================================
(function (App) {
  const { h, pick, shuffle, sleep, clickQueue, signal, norm } = App.util;
  const D = App.data, ui = App.ui, V = App.voice, G = App.games;
  const S = () => App.store.settings;
  const art = (ch, o) => App.strokes.el(ch, o);
  const U = (k, v) => V.U(k, v);
  const lvl = () => S().nivel || 2;

  // Fala um pedacinho (sílaba) sem passar pelo catálogo
  const syl = (text, tts) => ({ key: 'sil', parts: [{ k: null, text, tts }], text, tts });
  async function saySyllables(s, w, onEach, isOver) {
    for (let i = 0; i < w.s.length; i++) {
      if (isOver && isOver()) break;
      onEach && onEach(i);
      await s.sayU(syl(w.s[i].toUpperCase(), w.t[i]));
      await s.sleep(280);
    }
    onEach && onEach(-1);
  }
  const wordsUpTo = (n) => D.SYL_WORDS.filter(w => w.s.length <= n);

  // ------------------------------------------------------------------
  //  TAMBOR DAS SÍLABAS: uma batida para cada pedacinho da palavra
  // ------------------------------------------------------------------
  async function drum(s, area, o) {
    const w = o.word, n = w.s.length;
    const pic = h('div', { class: 'word-pic big zoom-in' }, w.e);
    const dots = h('div', { class: 'drum-dots' });
    const btn = h('button', { class: 'drum', 'aria-label': 'Tambor' }, '🥁');
    area.appendChild(pic);
    area.appendChild(dots);
    area.appendChild(btn);
    let taps = 0, timer = 0, open = true, again = false;   // já vale bater enquanto o robô fala
    const sig = signal(true);
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (!open) return;
      taps++;
      App.fx.sfx.pop();
      btn.classList.remove('hit'); void btn.offsetWidth; btn.classList.add('hit');
      dots.appendChild(h('i', { class: 'pop-in' }));
      clearTimeout(timer);
      timer = setTimeout(() => sig.fire(taps), 1700);   // parou de bater: confere
    });
    s.onEnd(() => clearTimeout(timer));
    ui.onRepeat(() => V.say('tambor', { W: w.w }));
    await s.say('tambor', { W: w.w });
    let helped = false;
    for (; ;) {
      if (again) { taps = 0; dots.innerHTML = ''; }
      open = true; again = true;
      const got = await s.wait(sig.wait());
      open = false;
      if (got === n) break;
      // Conta junto, mostrando cada pedacinho
      helped = true;
      App.fx.sfx.soft();
      dots.innerHTML = '';
      await s.say('contarJuntos');
      await saySyllables(s, w, (i) => { if (i >= 0) { dots.appendChild(h('i', { class: 'pop-in ok' })); btn.classList.remove('hit'); void btn.offsetWidth; btn.classList.add('hit'); } });
      await s.say('suaVezTambor');
    }
    [...dots.children].forEach(d => d.classList.add('ok'));
    await ui.praise(s, pic, { confetti: !helped });
    return helped ? 'ok2' : 'ok';
  }

  // ------------------------------------------------------------------
  //  FALA DE ROBÔ: juntar os pedacinhos e achar a figura
  // ------------------------------------------------------------------
  async function robotTalk(s, area, o) {
    const w = o.word;
    const others = shuffle(D.SYL_WORDS.filter(x => x.w !== w.w && x.e !== w.e)).slice(0, lvl() >= 2 ? 2 : 1);
    const opts = shuffle([w].concat(others));
    const chips = h('div', { class: 'syl-strip' }, ...w.s.map(x => h('span', { class: 'syl-chip' }, lvl() >= 3 ? '?' : x.toUpperCase())));
    const again = h('button', { class: 'btn ghost' }, '🔊', h('span', null, 'Ouvir de novo'));
    const btns = opts.map(x => { const b = h('button', { class: 'pic-opt' }, x.e); b.dataset.w = x.w; return b; });
    area.appendChild(chips);
    area.appendChild(h('div', { class: 'ask-line' }, again));
    area.appendChild(h('div', { class: 'pic-opts' }, ...btns));
    const picks = clickQueue(btns);
    let busy = false, over = false;
    const speakIt = async () => {
      if (busy) return; busy = true;
      try { await saySyllables(s, w, (i) => [...chips.children].forEach((c, k) => c.classList.toggle('read', k === i)), () => over); } catch (e) { }
      busy = false;
    };
    again.addEventListener('click', speakIt);
    ui.onRepeat(speakIt);
    if (o.first) await s.wait(Promise.race([V.say('roboFala'), picks.any()]));
    await s.wait(Promise.race([speakIt(), picks.any()]));
    let wrongs = 0;
    for (; ;) {
      const b = btns[await s.wait(picks.next())];
      if (b.classList.contains('wrong')) continue;
      if (b.dataset.w === w.w) {
        over = true;
        b.classList.add('right');
        [...chips.children].forEach((c, k) => { c.classList.remove('read'); c.textContent = w.s[k].toUpperCase(); c.classList.add('done'); });
        await ui.praise(s, b, { u: U('palavraE', { W: w.w }), confetti: !wrongs });
        return wrongs ? 'ok2' : 'ok';
      }
      wrongs++;
      b.classList.add('wrong');
      App.fx.sfx.soft();
      await s.wait(speakIt());
    }
  }

  // ------------------------------------------------------------------
  //  MESMO SOM: qual figura começa igual? (só de ouvido, sem letras)
  // ------------------------------------------------------------------
  async function sameSound(s, area, o) {
    const all = D.allWords().filter(w => /^[A-Z]/.test(norm(w[0]).toUpperCase()));
    const first = (w) => norm(w[0])[0];
    const target = o.word;
    // o.same / o.diff / o.q / o.okKey permitem reusar este jogo para RIMA
    const same = o.same || pick(all.filter(w => first(w) === first(target) && w[0] !== target[0] && w[2] !== target[2]));
    const diff = o.diff || shuffle(all.filter(w => first(w) !== first(target))).filter((x, i, a) => a.findIndex(y => first(y) === first(x)) === i).slice(0, lvl() >= 2 ? 2 : 1);
    const opts = shuffle([same].concat(diff));
    const tgt = h('button', { class: 'pic-opt target' }, target[2]);
    const btns = opts.map(x => { const b = h('button', { class: 'pic-opt' }, x[2]); b.dataset.w = x[0]; return b; });
    area.appendChild(h('div', { class: 'sound-target' }, tgt, h('span', { class: 'arrow-big' }, '👂')));
    area.appendChild(h('div', { class: 'pic-opts' }, ...btns));
    const q = U(o.qKey || 'mesmoSom', { W: target[0] });
    tgt.addEventListener('click', () => V.say('palavra', { W: target[0] }));
    ui.onRepeat(() => V.speak(q));
    const picks = clickQueue(btns);
    await s.wait(Promise.race([V.speak(q), picks.any()]));
    let wrongs = 0;
    for (; ;) {
      const b = btns[await s.wait(picks.next())];
      if (b.classList.contains('wrong')) continue;
      if (b.dataset.w === same[0]) {
        b.classList.add('right');
        if (!o.same) App.store.record(first(target).toUpperCase(), wrongs ? 'visto' : 'ok');
        await ui.praise(s, b, { u: U(o.okKey || 'comecamIgual', { W: same[0] }), confetti: !wrongs });
        return wrongs ? 'ok2' : 'ok';
      }
      wrongs++;
      b.classList.add('wrong');
      App.fx.sfx.soft();
      await s.say('palavra', { W: b.dataset.w });   // diz o nome da figura tocada
      await s.sayU(q);
    }
  }

  // ------------------------------------------------------------------
  //  VOGAL QUE FALTA: G_TO — qual vogal completa a palavra?
  // ------------------------------------------------------------------
  async function missingVowel(s, area, o) {
    const w = o.word;                                  // ['GATO','gato','🐱']
    const idxs = w[0].split('').map((c, i) => D.isVowel(c) ? i : -1).filter(i => i >= 0);
    const at = idxs.length > 1 && lvl() >= 2 ? pick(idxs) : idxs[0];
    const V_ = w[0][at];
    const pic = h('div', { class: 'word-pic zoom-in' }, w[2]);
    const row = h('div', { class: 'word-row' });
    w[0].split('').forEach((ch, i) => row.appendChild(h('span', { class: 'slot ' + (i === at ? 'q' : 'filled') }, i === at ? '?' : art(ch, { minW: 60 }))));
    const tiles = shuffle(D.VOWELS).map(x => G.tile(x, 'sm'));
    area.appendChild(pic);
    area.appendChild(row);
    area.appendChild(h('div', { class: 'tiles n5' }, ...tiles));
    const q = U('vogalFalta', { W: w[0] });
    pic.addEventListener('click', () => V.speak(q));
    ui.onRepeat(() => V.speak(q));
    const picks = clickQueue(tiles);
    await s.wait(Promise.race([V.speak(q), picks.any()]));
    let wrongs = 0;
    for (; ;) {
      const t = tiles[await s.wait(picks.next())];
      if (t.classList.contains('wrong')) continue;
      if (t.dataset.ch === V_) {
        t.classList.add('right');
        const sl = row.children[at];
        sl.className = 'slot filled pop-in';
        sl.innerHTML = '';
        sl.appendChild(art(V_, { minW: 60 }));
        App.store.record(V_, wrongs ? 'err' : 'ok');
        await ui.praise(s, sl, { u: U('leuCerto', { W: w[0] }), confetti: !wrongs });
        return wrongs ? 'ok2' : 'ok';
      }
      wrongs++;
      t.classList.add('wrong');
      App.fx.sfx.soft();
      await s.say('essaEh', { L: t.dataset.ch });
      await s.sayU(q);
    }
  }

  // RIMA: qual figura rima com a palavra?
  function rhyme(s, area, o) {
    const pair = o.pair.map(D.word);
    const flip = Math.random() < 0.5;
    const target = pair[flip ? 1 : 0], same = pair[flip ? 0 : 1];
    const end = (w) => norm(w[0]).slice(-2);
    const diff = shuffle(D.allWords().filter(w => end(w) !== end(target) && w[2] !== target[2] && w[2] !== same[2])).slice(0, lvl() >= 2 ? 2 : 1);
    return sameSound(s, area, { word: target, same, diff, qKey: 'rima', okKey: 'rimaCerta' });
  }

  // TEM O SOM DO R? Ouvir a palavra e decidir (treino de ouvido para o R, com palavras com L de contraste)
  async function hasR(s, area, o) {
    const w = o.word, yes = o.hasR;
    const pic = h('div', { class: 'word-pic big zoom-in' }, w[2]);
    const bYes = h('button', { class: 'pic-opt yesno' }, '🏍️', h('small', null, 'Tem R'));
    const bNo = h('button', { class: 'pic-opt yesno' }, '🤚', h('small', null, 'Não tem'));
    area.appendChild(pic);
    area.appendChild(h('div', { class: 'pic-opts' }, bYes, bNo));
    const q = U('temR', { W: w[0] });
    pic.addEventListener('click', () => V.speak(q));
    ui.onRepeat(() => V.speak(q));
    const picks = clickQueue([bYes, bNo]);
    await s.wait(Promise.race([V.speak(q), picks.any()]));
    let wrongs = 0;
    for (; ;) {
      const i = await s.wait(picks.next());
      if ((i === 0) === yes) {
        (yes ? bYes : bNo).classList.add('right');
        await ui.praise(s, pic, { u: U(yes ? 'temRSim' : 'temRNao', { W: w[0] }), confetti: !wrongs });
        return wrongs ? 'ok2' : 'ok';
      }
      wrongs++;
      App.fx.sfx.soft();
      const b = i === 0 ? bYes : bNo;
      b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
      await s.say('escutaDeNovo', { W: w[0] });
    }
  }

  // R OU L? Ouvir a palavra e tocar na figura certa (RUA ou LUA, ROBÔ ou LOBO)
  async function listenPair(s, area, o) {
    const pair = o.pair.map(D.word);
    const target = pair[Math.random() < 0.5 ? 0 : 1];
    const btns = shuffle(pair).map(x => { const b = h('button', { class: 'pic-opt' }, x[2]); b.dataset.w = x[0]; return b; });
    const again = h('button', { class: 'btn ghost' }, '🔊', h('span', null, 'Ouvir de novo'));
    area.appendChild(h('div', { class: 'ask-line' }, again));
    area.appendChild(h('div', { class: 'pic-opts' }, ...btns));
    const q = U('qualOuviu', { W: target[0] });
    again.addEventListener('click', () => V.speak(q));
    ui.onRepeat(() => V.speak(q));
    const picks = clickQueue(btns);
    await s.wait(Promise.race([V.speak(q), picks.any()]));
    let wrongs = 0;
    for (; ;) {
      const b = btns[await s.wait(picks.next())];
      if (b.dataset.w === target[0]) {
        b.classList.add('right');
        await ui.praise(s, b, { u: U('palavraE', { W: target[0] }), confetti: !wrongs });
        return wrongs ? 'ok2' : 'ok';
      }
      wrongs++;
      App.fx.sfx.soft();
      b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
      await s.say('palavra', { W: b.dataset.w });      // diz o que ele tocou…
      await s.say('escutaDeNovo', { W: target[0] });   // …e repete o que foi pedido
    }
  }

  // MONSTRINHO COMILÃO: dar de comer a letra que ele pede (ouvir a letra e achar)
  async function monster(s, area, o) {
    const set = o.set, goal = 5;
    const mon = h('div', { class: 'monster' }, '👾');
    const belly = h('div', { class: 'balloon-meter' });
    for (let i = 0; i < goal; i++) belly.appendChild(h('i'));
    const tray = h('div', { class: 'tiles' });
    area.appendChild(h('div', { class: 'monster-row' }, mon, belly));
    area.appendChild(tray);
    let fed = 0, wrongs = 0, prev = null;
    while (fed < goal) {
      const L = ui.pickLetter(set, prev); prev = L;
      const ch = ui.caseOf(L);
      const opts = shuffle([L, ...ui.distractors(L, [2, 3, 3][lvl() - 1] || 3, set)]).map(x => ch === ch.toUpperCase() ? x.toUpperCase() : x.toLowerCase());
      tray.innerHTML = '';
      const tiles = opts.map(x => G.tile(x));
      tiles.forEach(t => tray.appendChild(t));
      const q = U('monstro', { L, Lshown: ch });
      ui.onRepeat(() => V.speak(q));
      const picks = clickQueue(tiles);
      await s.wait(Promise.race([V.speak(q), picks.any()]));
      for (; ;) {
        const t = tiles[await s.wait(picks.next())];
        if (t.classList.contains('wrong') || t.classList.contains('used')) continue;
        const a = t.getBoundingClientRect(), b = mon.getBoundingClientRect();
        if (t.dataset.ch === ch) {
          // a pedra voa até a boca do monstrinho
          t.style.transition = 'transform .45s ease-in, opacity .45s';
          t.style.transform = 'translate(' + (b.left + b.width / 2 - a.left - a.width / 2) + 'px,' + (b.top + b.height / 2 - a.top - a.height / 2) + 'px) scale(.2)';
          t.style.opacity = '0';
          App.fx.sfx.pop();
          await s.sleep(430);
          t.classList.add('used');
          mon.classList.remove('chomp'); void mon.offsetWidth; mon.classList.add('chomp');
          belly.children[fed].classList.add('on');
          fed++;
          App.store.record(L, 'ok');
          App.ui.addStar(mon);
          await s.say('monstroNham');
          break;
        }
        wrongs++;
        t.classList.add('wrong');
        App.fx.sfx.soft();
        App.store.record(L, 'err');
        mon.classList.remove('shake'); void mon.offsetWidth; mon.classList.add('shake');
        await s.say('monstroEca');
        await s.say('essaEh', { L: t.dataset.ch.toUpperCase(), Lshown: t.dataset.ch });
        await s.sayU(q);
      }
    }
    tray.innerHTML = '';
    await ui.praise(s, mon, { u: U('monstroCheio'), big: true, star: false });
    return wrongs ? 'ok2' : 'ok';
  }

  App.games4 = { drum, robotTalk, sameSound, missingVowel, rhyme, hasR, listenPair, monster, wordsUpTo };
})(window.App);
