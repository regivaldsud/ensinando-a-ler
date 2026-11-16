'use strict';
// =====================================================================
//  Painel inicial, telas dos jogos, Aventura (trilha guiada),
//  troféus, álbum e início do aplicativo.
// =====================================================================
(function (App) {
  const { $, h, pick, shuffle, sleep } = App.util;
  const D = App.data, ui = App.ui, G = App.games, G2 = App.games2, G3 = App.games3, G4 = App.games4, V = App.voice;
  const S = () => App.store.settings;
  const P = () => App.store.progress;
  const art = (ch, o) => App.strokes.el(ch, o);
  const lvl = () => S().nivel || 2;

  // Preferências do modo avulso
  const prefs = (() => { try { return JSON.parse(localStorage.getItem('eal.prefs')) || {}; } catch (e) { return {}; } })();
  if (!prefs.set) prefs.set = 'vogais';
  if (!prefs.seq) prefs.seq = 'vogais';
  const savePrefs = () => { try { localStorage.setItem('eal.prefs', JSON.stringify(prefs)); } catch (e) { } };

  // ---------------- Catálogo das brincadeiras ----------------
  const GAMES = {
    alfabeto: { icon: '🔤', title: 'Alfabeto', sub: 'Conhecer cada letra', c1: '#2f7bff', c2: '#1746c9' },
    cantar: { icon: '🎵', title: 'Cantar o alfabeto', sub: 'Do A ao Z', c1: '#19a7f5', c2: '#2f7bff', trophy: true },
    encontre: { icon: '👆', title: 'Encontre a letra', sub: 'Toque na letra certa', c1: '#ffb11f', c2: '#ff8c42', trophy: true },
    pares: { icon: '🔠', title: 'Achar o par', sub: 'A grande e a pequena', c1: '#13b9c9', c2: '#0e8fd6', trophy: true },
    memoria: { icon: '🃏', title: 'Memória Aa', sub: 'Maiúscula e minúscula', c1: '#5b6cff', c2: '#3a3fd0', trophy: true },
    baloes: { icon: '🎈', title: 'Balões', sub: 'Estoure a letra', c1: '#ff5d73', c2: '#e23a6a', trophy: true },

    queletra: { icon: '🗣️', title: 'Que letra é essa?', sub: 'Fala pra mim!', c1: '#7a5cff', c2: '#4b3bd6', trophy: true },
    repita: { icon: '🔁', title: 'Repita comigo', sub: 'Falar bem alto', c1: '#19a7f5', c2: '#1b6fe0', trophy: true },
    fases: { icon: '🎤', title: 'Desafio de voz', sub: 'Fale e passe de fase', c1: '#ff8c42', c2: '#ff4d6d' },
    mostre: { icon: '🖼️', title: 'Mostre e fale', sub: 'O que é isso?', c1: '#27c06a', c2: '#0e9f6e', trophy: true },
    letraR: { icon: '🏍️', title: 'Motor do R', sub: 'Treinar o som do R', c1: '#ff4d6d', c2: '#c9184a', trophy: true },

    trem: { icon: '🚂', title: 'Trem das letras', sub: 'Qual letra falta?', c1: '#ff8c42', c2: '#e2571c', trophy: true },
    ligar: { icon: '✨', title: 'Ligue as letras', sub: 'Descubra o desenho', c1: '#ffb11f', c2: '#ff8c42', trophy: true },
    labirinto: { icon: '🚗', title: 'Labirinto', sub: 'Leve o carrinho', c1: '#27c06a', c2: '#128a5c', trophy: true },

    tracar: { icon: '✍️', title: 'Escrever com o dedo', sub: 'Passe o dedo na letra', c1: '#13b9c9', c2: '#0b8aa6' },
    nome: { icon: '😀', title: 'Escrever meu nome', sub: 'Letra por letra', c1: '#2f7bff', c2: '#5b6cff', trophy: true },
    blocos: { icon: '🧱', title: 'Blocos de vogais', sub: 'Monte a torre', c1: '#ff5d73', c2: '#ff8c42', trophy: true },
    palavras: { icon: '🧩', title: 'Formar palavras', sub: 'Juntar as letras', c1: '#27c06a', c2: '#13b9c9', trophy: true },

    tambor: { icon: '🥁', title: 'Tambor das sílabas', sub: 'Bata os pedacinhos', trophy: true },
    roboFala: { icon: '🤖', title: 'Fala de robô', sub: 'Junte os pedacinhos', trophy: true },
    mesmoSom: { icon: '👂', title: 'Mesmo som', sub: 'Começa igual?', trophy: true },
    vogalFalta: { icon: '❓', title: 'Vogal que falta', sub: 'G_TO: A E I O U?', trophy: true },
    monstro: { icon: '👾', title: 'Monstrinho comilão', sub: 'Dê a letra que ele pede', trophy: true },
    rima: { icon: '🎶', title: 'Rima', sub: 'Gato rima com pato', trophy: true },

    silabas: { icon: '🔡', title: 'Sílabas', sub: 'BA BE BI BO BU', c1: '#7a5cff', c2: '#19a7f5' },
    primeira: { icon: '🍎', title: 'Começa com...', sub: 'A primeira letra', c1: '#ff8c42', c2: '#ffb11f', trophy: true },
    leia: { icon: '📖', title: 'Leia e escolha', sub: 'Ler a palavra', c1: '#1b6fe0', c2: '#13b9c9', trophy: true },
    tempo: { icon: '⏱️', title: 'Corrida do tempo', sub: 'Quantas em 1 minuto?', c1: '#e23a6a', c2: '#7a5cff', trophy: true }
  };
  // Cada grupo tem UMA cor (a cor diz o tipo de brincadeira): [título, jogos, cor, cor escura]
  const SECTIONS = [
    ['🔤 Conhecer as letras', ['alfabeto', 'cantar', 'encontre', 'pares', 'memoria', 'baloes'], '#2f7bff', '#1c56c4'],
    ['🗣️ Falar em voz alta', ['queletra', 'repita', 'fases', 'mostre', 'letraR'], '#f0413e', '#b82a28'],
    ['👂 Brincar com os sons', ['monstro', 'tambor', 'roboFala', 'mesmoSom', 'rima', 'vogalFalta'], '#0e9aa7', '#0a6f79'],
    ['🚂 A ordem das letras', ['trem', 'ligar', 'labirinto'], '#1e9648', '#146c33'],
    ['✍️ Escrever e montar', ['tracar', 'nome', 'blocos', 'palavras'], '#d96f00', '#a85400'],
    ['📖 Ler', ['silabas', 'primeira', 'leia', 'tempo'], '#8a5cf0', '#6238c4']
  ];
  const MEDAL = { ouro: '🥇', prata: '🥈', bronze: '🥉' };

  // ---------------- PAINEL INICIAL ----------------
  let greeted = false;
  function learned() { return D.ALPHABET.filter(L => App.store.mastery(L) >= 0.6); }
  function todayMin() { const d = App.store.dayKey(); return Math.round(((P().tempo || {})[d] || 0) / 60); }
  function dayStreak() {
    const dias = P().dias || {}, tempo = P().tempo || {};
    let n = 0;
    for (let i = 0; i < 400; i++) {
      const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
      if (dias[d] > 0 || tempo[d] > 0) n++; else if (i > 0) break;
    }
    return n;
  }
  function menu() {
    ui.run(async (s) => {
      ui.setTitle('Ensinando a Ler');
      document.body.classList.add('at-menu');
      s.onEnd(() => document.body.classList.remove('at-menu'));
      const st = ui.stage('menu-stage');
      const ok = learned(), focus = chooseFocus(true).L, tc = App.store.trophyCount();
      const pct = Math.round(ok.length / 26 * 100);
      const ring = h('div', { class: 'ring', style: { '--p': pct } }, h('b', null, ok.length), h('small', null, 'de 26 letras'));
      const go = h('button', { class: 'hero-go' + (P().aventuras ? '' : ' pulse') },
        G2.pic('jogo/foguete.png', '🚀', 'hero-rocket'),
        h('span', { class: 'hero-go-text' }, h('small', null, (P().aventuras || (P().aventuraAtual && P().aventuraAtual.i > 0)) ? 'Continuar a aventura' : 'Começar a aventura'), h('b', null, 'Letra ', h('span', { class: 'hero-letter' }, art(focus), art(focus.toLowerCase())))),
        h('span', { class: 'hero-play' }, '▶'));
      go.addEventListener('click', () => { App.fx.sfx.tap(); adventure(); });
      const stats = h('div', { class: 'hero-stats' },
        h('button', { class: 'stat', onclick: () => album() }, h('b', null, '⭐ ' + P().estrelas), h('small', null, 'estrelas')),
        h('button', { class: 'stat', onclick: () => album() }, h('b', null, '🏆 ' + (tc.ouro + tc.prata + tc.bronze)), h('small', null, 'troféus')),
        h('div', { class: 'stat' }, h('b', null, '⏰ ' + todayMin()), h('small', null, 'min hoje')));
      stats.appendChild(h('div', { class: 'stat' }, h('b', null, '🔥 ' + dayStreak()), h('small', null, 'dias seguidos')));
      st.appendChild(h('div', { class: 'hero' }, h('div', { class: 'orbit' }, ring, h('i', { class: 'orbit-moon' })), go, stats));
      // Cabine: nível de astronauta (combustível = estrelas até o próximo adesivo) e constelação das letras
      const fuel = P().estrelas % 10, nivelAstro = Math.floor(P().estrelas / 10) + 1;
      const sky = h('div', { class: 'constel' });
      D.ALPHABET.forEach((L, i) => {
        const m = App.store.mastery(L);
        sky.appendChild(h('button', { class: 'cstar' + (m >= 0.6 ? ' on' : m > 0.15 ? ' mid' : '') + (L === focus ? ' now' : ''), style: { '--i': i }, 'aria-label': 'Letra ' + L }, L));
      });
      sky.addEventListener('click', () => { App.fx.sfx.tap(); open('alfabeto'); });
      st.appendChild(h('div', { class: 'cockpit' },
        h('div', { class: 'astro' },
          h('span', { class: 'astro-badge' }, '🧑‍🚀'),
          h('div', { class: 'astro-info' },
            h('b', null, 'Astronauta nível ' + nivelAstro),
            h('div', { class: 'fuel' }, h('i', { style: { width: (fuel * 10) + '%' } })),
            h('small', null, '⭐ ' + fuel + ' de 10 para o próximo adesivo'))),
        h('div', { class: 'constel-box' }, h('small', null, '✨ Constelação das letras'), sky)));
      const PLANETS = ['🪐', '🌍', '🌕', '☄️', '🛰️', '🌟'];
      SECTIONS.forEach(([title, ids, col, dark], si) => {
        const won = ids.filter(id => (P().trofeus || {})[id]).length, can = ids.filter(id => GAMES[id] && GAMES[id].trophy).length;
        const grid = h('div', { class: 'menu-grid' });
        ids.forEach(id => {
          const m = GAMES[id], t = (P().trofeus || {})[id];
          const card = h('button', { class: 'menu-card brickcard', style: { '--c': col, '--cd': dark } },
            h('span', { class: 'menu-icon' }, m.icon),
            h('span', { class: 'menu-text' }, h('b', null, m.title), h('small', null, m.sub)),
            t ? h('span', { class: 'menu-medal', title: 'Troféu de ' + t }, MEDAL[t]) : null);
          card.addEventListener('click', () => { App.fx.sfx.tap(); open(id); });
          grid.appendChild(card);
        });
        st.appendChild(h('section', { class: 'menu-section', style: { '--c': col } },
          h('h2', null, h('span', { class: 'planet' }, PLANETS[si % PLANETS.length]), h('span', { class: 'sec-title' }, title.replace(/^\S+\s/, '')),
            can ? h('span', { class: 'sec-count' }, '🏆 ' + won + '/' + can) : null),
          grid));
      });
      ui.onRepeat(() => V.say('menu'));
      if (!greeted) { greeted = true; await s.say('ola'); await s.say('menu'); }
      else await s.say('menuVolta');
    });
  }

  function open(id) {
    const map = {
      aventura: adventure, alfabeto: alphabetGrid, tracar: traceScreen, palavras: wordsScreen, silabas: syllableScreen,
      premios: album, fases: phasesScreen, letraR: rScreen, nome: nameScreen, ligar: dotsScreen
    };
    if (map[id]) map[id](); else if (LOOPS[id]) loop(id); else menu();
  }

  // ---------------- Barras de escolha ----------------
  function optToggle(parent) {
    if (parent.querySelector('.opt-toggle')) return;
    const b = h('button', { class: 'opt-toggle', title: 'Opções' }, '⚙️', h('span', null, 'Opções'));
    b.addEventListener('click', () => parent.classList.toggle('show-opts'));
    parent.appendChild(b);
  }
  function chips(parent, restart, opts) {
    opts = opts || {};
    optToggle(parent);
    const bar = h('div', { class: 'chips opt-chips' });
    if (opts.sets !== false) {
      [['vogais', 'Vogais'], ['todas', 'Alfabeto'], ['aventura', 'Já aprendidas']].forEach(([k, t]) => {
        const c = h('button', { class: 'chip' + (prefs.set === k ? ' on' : '') }, t);
        c.addEventListener('click', () => { prefs.set = k; savePrefs(); restart(); });
        bar.appendChild(c);
      });
      bar.appendChild(h('span', { class: 'chip-sep' }));
    }
    if (opts.cases !== false) {
      [['maiusculas', 'A'], ['minusculas', 'a'], ['ambas', 'Aa']].forEach(([k, t]) => {
        const c = h('button', { class: 'chip case' + (S().caixa === k ? ' on' : ''), title: k }, t);
        c.addEventListener('click', () => { S().caixa = k; App.store.saveSettings(); restart(); });
        bar.appendChild(c);
      });
    }
    parent.appendChild(bar);
    return bar;
  }
  // Qual sequência treinar: vogais, alfabeto ou o nome
  function seqChips(parent, restart) {
    optToggle(parent);
    const bar = h('div', { class: 'chips opt-chips' });
    [['vogais', 'A E I O U'], ['alfabeto', 'Alfabeto'], ['nome', '😀 ' + S().nome]].forEach(([k, t]) => {
      const c = h('button', { class: 'chip' + (prefs.seq === k ? ' on' : '') }, t);
      c.addEventListener('click', () => { prefs.seq = k; savePrefs(); restart(); });
      bar.appendChild(c);
    });
    parent.appendChild(bar);
    return bar;
  }
  const seqPart = (n) => prefs.seq === 'alfabeto' ? G2.windowOf(D.ALPHABET, n) : G2.sequence(prefs.seq).slice(0, 8);

  // ---------------- Jogos avulsos (várias rodadas) ----------------
  const next = (c, set) => (c.prev = ui.pickLetter(set, c.prev));
  const LOOPS = {
    queletra: { rounds: 6, fn: (s, a, i, set, c) => G.whichLetter(s, a, { ch: ui.caseOf(next(c, set)), first: i === 0 }) },
    repita: { rounds: 6, fn: (s, a, i, set, c) => G.repeatMe(s, a, { ch: ui.caseOf(next(c, set)) }) },
    encontre: { rounds: 6, fn: (s, a, i, set, c) => G.findLetter(s, a, { ch: ui.caseOf(next(c, set)), set }) },
    baloes: { rounds: 3, fn: (s, a, i, set, c) => G.balloons(s, a, { L: next(c, set), set }) },
    memoria: { rounds: 2, cases: false, fn: (s, a, i, set) => G.memory(s, a, { letters: set }) },
    pares: { rounds: 6, cases: false, fn: (s, a, i, set, c) => G.pairCase(s, a, { L: next(c, set), set }) },
    primeira: {
      rounds: 6, cases: false, fn: (s, a, i, set, c) => {
        const words = D.allWords().filter(w => G.plainWord(w[0]) && set.includes(w[0][0]) && w[0] !== c.prev);
        const w = pick(words.length ? words : D.BUILD[1]);
        c.prev = w[0];
        return G.firstLetter(s, a, { word: w, set });
      }
    },
    cantar: { rounds: 1, sets: false, cases: false, fn: (s, a) => G.alphabetSong(s, a, {}) },
    // ----- ordem das letras -----
    trem: { rounds: 4, sets: false, seq: true, fn: (s, a) => G2.train(s, a, { seq: seqPart(5) }) },
    labirinto: { rounds: 2, sets: false, seq: true, fn: (s, a) => G2.maze(s, a, { seq: seqPart([3, 4, 5][lvl() - 1] || 4).slice(0, 6) }) },
    blocos: { rounds: 2, sets: false, cases: false, fn: (s, a, i) => G2.blocks(s, a, { ordered: i === 1 }) },
    // ----- falar e ler -----
    mostre: {
      rounds: 5, sets: false, cases: false, fn: (s, a, i, set, c) => {
        const pool = D.allWords().filter(w => w[0] !== c.prev && w[0].length <= [5, 7, 12][lvl() - 1]);
        const w = pick(pool); c.prev = w[0];
        return G3.showSay(s, a, { word: w });
      }
    },
    leia: {
      rounds: 5, sets: false, cases: false, fn: (s, a, i, set, c) => {
        const pool = D.BUILD[0].concat(D.BUILD[1], lvl() >= 2 ? D.BUILD[2] : []);
        const cand = (lvl() === 1 ? D.BUILD[0].concat(D.BUILD[1].slice(0, 8)) : pool).filter(w => w[0] !== c.prev);
        const w = pick(cand); c.prev = w[0];
        return G3.readPick(s, a, { word: w, pool, first: i === 0 });
      }
    },
    // ----- brincar com os sons -----
    tambor: { rounds: 5, sets: false, cases: false, fn: (s, a, i, set, c) => { const w = pick(G4.wordsUpTo([2, 3, 4][lvl() - 1]).filter(x => x.w !== c.prev)); c.prev = w.w; return G4.drum(s, a, { word: w }); } },
    roboFala: { rounds: 5, sets: false, cases: false, fn: (s, a, i, set, c) => { const w = pick(G4.wordsUpTo([2, 3, 4][lvl() - 1]).filter(x => x.w !== c.prev && x.s.length > 1)); c.prev = w.w; return G4.robotTalk(s, a, { word: w, first: i === 0 }); } },
    mesmoSom: { rounds: 5, sets: false, cases: false, fn: (s, a, i, set, c) => {
      const all = D.allWords(); const f = (w) => App.util.norm(w[0])[0];
      const cand = all.filter(w => w[0] !== c.prev && all.some(x => x[0] !== w[0] && x[2] !== w[2] && f(x) === f(w)));
      const w = pick(cand); c.prev = w[0];
      return G4.sameSound(s, a, { word: w });
    } },
    monstro: { rounds: 1, fn: (s, a, i, set) => G4.monster(s, a, { set }) },
    rima: { rounds: 5, sets: false, cases: false, fn: (s, a, i, set, c) => { const p = pick(D.RHYMES.filter(x => x[0] !== c.prev)); c.prev = p[0]; return G4.rhyme(s, a, { pair: p }); } },
    vogalFalta: { rounds: 6, sets: false, cases: false, fn: (s, a, i, set, c) => { const pool = D.BUILD[0].concat(D.BUILD[1], lvl() >= 3 ? D.BUILD[2] : []).filter(w => w[0] !== c.prev); const w = pick(pool); c.prev = w[0]; return G4.missingVowel(s, a, { word: w }); } },
    tempo: { rounds: 1, score: true, fn: (s, a, i, set) => G3.timeRace(s, a, { set, secs: 60 }) }
  };
  function loop(id) {
    const cfg = LOOPS[id], meta = GAMES[id];
    ui.run(async (s) => {
      ui.setTitle(meta.title);
      const st = ui.stage('game-stage');
      if (cfg.seq) seqChips(st, () => loop(id));
      if (cfg.sets !== false || cfg.cases !== false) chips(st, () => loop(id), { sets: cfg.sets, cases: cfg.cases });
      const dots = cfg.rounds > 1 ? ui.dots(st, cfg.rounds) : null;
      const area = h('div', { class: 'area' });
      st.appendChild(area);
      const set = ui.letterSet(prefs.set);
      const ctx = { prev: null };
      const results = [];
      for (let i = 0; i < cfg.rounds; i++) {
        dots && dots.set(i);
        area.innerHTML = '';
        area.className = 'area fade-in';
        ui.onRepeat(null);
        results.push(await cfg.fn(s, area, i, set, ctx));
        await s.sleep(500);
      }
      dots && dots.set(cfg.rounds);
      let tier;
      if (cfg.score) { const sc = results[0].score; tier = sc >= 12 ? 'ouro' : sc >= 7 ? 'prata' : sc >= 3 ? 'bronze' : null; }
      else tier = ui.tierOf(results.filter(r => r === 'ok').length / results.length);
      await finish(s, area, () => loop(id), meta.trophy && tier ? { id, tier } : null);
    });
  }
  async function finish(s, area, again, trophy) {
    area.innerHTML = '';
    area.className = 'area';
    const box = h('div', { class: 'finish pop-in' },
      h('div', { class: 'trophy' }, G2.pic('premios/' + (trophy ? 'trofeu_' + trophy.tier : 'estrela') + '.png', trophy ? '🏆' : '⭐')),
      h('h2', null, 'Muito bem, ' + S().nome + '!'),
      trophy ? h('p', { class: 'finish-tier' }, MEDAL[trophy.tier] + ' Troféu de ' + trophy.tier) : null,
      h('div', { class: 'row-btns' },
        h('button', { class: 'btn big green', onclick: () => again() }, '🔁 Jogar de novo'),
        h('button', { class: 'btn big', onclick: () => menu() }, '🏠 Outras brincadeiras')));
    area.appendChild(box);
    App.fx.sfx.fanfare(); App.fx.confetti(160); App.avatar.happy(3000);
    await ui.flushSticker(s);
    if (trophy) {
      const better = App.store.setTrophy(trophy.id, trophy.tier);
      await s.say(better ? { ouro: 'trofeuOuro', prata: 'trofeuPrata', bronze: 'trofeuBronze' }[trophy.tier] : 'fim');
    } else await s.say('fim');
    await s.say('menuVolta');
  }

  // ---------------- ALFABETO ----------------
  function alphabetGrid() {
    ui.run(async (s) => {
      ui.setTitle('Alfabeto');
      const st = ui.stage('game-stage');
      const grid = h('div', { class: 'abc-grid' });
      D.ALPHABET.forEach(L => {
        const m = App.store.mastery(L);
        const c = h('button', { class: 'abc-card' + (D.isVowel(L) ? ' vowel' : '') },
          h('span', { class: 'pair' }, art(L), art(L.toLowerCase())),
          h('i', { class: 'm', style: { width: Math.round(m * 100) + '%' } }));
        c.addEventListener('click', () => { App.fx.sfx.tap(); letterPage(L); });
        grid.appendChild(c);
      });
      st.appendChild(h('p', { class: 'hint' }, 'Toque numa letra para conhecer. As vogais estão em vermelho.'));
      st.appendChild(grid);
      ui.onRepeat(null);
      await s.say('escolhaLetra');
    });
  }
  function letterPage(L) {
    ui.run(async (s) => {
      ui.setTitle('Letra ' + L);
      const st = ui.stage('game-stage');
      const area = h('div', { class: 'area' });
      st.appendChild(area);
      const i = D.ALPHABET.indexOf(L);
      const nav = h('div', { class: 'row-btns' },
        h('button', { class: 'btn', onclick: () => alphabetGrid() }, '⬅ Alfabeto'),
        h('button', { class: 'btn', onclick: () => traceOne(L) }, '✍️ Escrever'),
        i < 25 ? h('button', { class: 'btn green', onclick: () => letterPage(D.ALPHABET[i + 1]) }, D.ALPHABET[i + 1] + ' ▶') : null);
      area.appendChild(nav);
      await G.present(s, area, { L, auto: true });
      const rb = area.querySelectorAll('.row-btns'); if (rb.length > 1) rb[rb.length - 1].remove();
    });
  }

  // ---------------- ESCREVER ----------------
  const casesOf = (L) => S().caixa === 'maiusculas' ? [L] : S().caixa === 'minusculas' ? [L.toLowerCase()] : [L, L.toLowerCase()];
  function traceScreen(startL) {
    ui.run(async (s) => {
      ui.setTitle('Escrever com o dedo');
      const st = ui.stage('game-stage trace-stage');
      chips(st, () => traceScreen());
      const set = ui.letterSet(prefs.set);
      const strip = h('div', { class: 'letter-strip' });
      set.forEach(L => {
        const b = h('button', { class: 'strip-btn' + (D.isVowel(L) ? ' vowel' : '') }, L + L.toLowerCase());
        b.addEventListener('click', () => traceScreen(L));
        strip.appendChild(b);
      });
      st.appendChild(strip);
      const area = h('div', { class: 'area trace-area' });
      st.appendChild(area);
      let idx = startL ? Math.max(0, set.indexOf(startL)) : 0;
      for (; ;) {
        const L = set[idx % set.length];
        [...strip.children].forEach((b, k) => b.classList.toggle('on', k === idx % set.length));
        for (const ch of casesOf(L)) {
          area.innerHTML = '';
          ui.onRepeat(() => V.say('suaVez'));
          await App.trace.activity(s, area, { ch });
          await s.sleep(400);
        }
        await s.say('proxima');
        idx++;
      }
    });
  }
  function traceOne(L) {
    ui.run(async (s) => {
      ui.setTitle('Escrever a letra ' + L);
      const st = ui.stage('game-stage trace-stage');
      const area = h('div', { class: 'area trace-area' });
      st.appendChild(area);
      for (const ch of casesOf(L)) { area.innerHTML = ''; await App.trace.activity(s, area, { ch }); }
      letterPage(L);
    });
  }
  // Nome escrito do jeito certo: primeira maiúscula, o resto minúsculo (ou tudo maiúsculo)
  function nameAsWritten() {
    const ls = G2.nameLetters();
    return S().caixa === 'maiusculas' ? ls : ls.map((x, i) => i === 0 ? x : x.toLowerCase());
  }
  function nameScreen() {
    ui.run(async (s) => {
      ui.setTitle('Escrever meu nome');
      const st = ui.stage('game-stage trace-stage');
      const area = h('div', { class: 'area trace-area' });
      st.appendChild(area);
      await G3.traceWord(s, area, { letters: nameAsWritten(), intro: V.U('escrevaNome'), outro: V.U('escreveuNome') });
      st.classList.remove('trace-stage');
      await finish(s, area, () => nameScreen(), { id: 'nome', tier: 'ouro' });
    });
  }

  // ---------------- FORMAR PALAVRAS ----------------
  function wordsScreen(level) {
    ui.run(async (s) => {
      ui.setTitle('Formar palavras');
      const st = ui.stage('game-stage');
      const lv = level !== undefined ? level : (prefs.wordLevel ?? 1);
      const bar = h('div', { class: 'chips' });
      [[1, '⭐ Curtinhas'], [2, '⭐⭐ Médias'], [3, '⭐⭐⭐ Grandes'], [0, '😀 Meu nome'], [9, '🅰️ A E I O U']].forEach(([k, t]) => {
        const c = h('button', { class: 'chip' + (lv === k ? ' on' : '') }, t);
        c.addEventListener('click', () => { prefs.wordLevel = k; savePrefs(); wordsScreen(k); });
        bar.appendChild(c);
      });
      st.appendChild(bar);
      const area = h('div', { class: 'area' });
      st.appendChild(area);
      if (lv === 0 || lv === 9) {
        // Montar em ordem: o nome ou as vogais
        const word = lv === 0 ? [G2.nameLetters().join(''), S().nome, '😀'] : ['AEIOU', 'as vogais', '🅰️'];
        const r = await G.buildWord(s, area, { word, isName: true, level: 1, introU: lv === 9 ? V.U('vogaisOrdem') : null, outroU: lv === 9 ? V.U('vogaisFim') : null });
        await s.sleep(600);
        return finish(s, area, () => wordsScreen(lv), { id: 'palavras', tier: r === 'ok' ? 'ouro' : 'prata' });
      }
      const words = shuffle(D.BUILD[lv - 1]).slice(0, 4);
      const dots = ui.dots(st, words.length);
      st.insertBefore(dots.el, area);
      const results = [];
      for (let i = 0; i < words.length; i++) {
        dots.set(i);
        area.innerHTML = '';
        results.push(await G.buildWord(s, area, { word: words[i], firstTime: i === 0, level: Math.min(3, lvl() + (lv === 3 ? 1 : 0)) }));
        await s.sleep(500);
        if (i < words.length - 1) await s.say('proxima');
      }
      dots.set(words.length);
      await finish(s, area, () => wordsScreen(lv), { id: 'palavras', tier: ui.tierOf(results.filter(r => r === 'ok').length / results.length) });
    });
  }

  // ---------------- SÍLABAS ----------------
  function syllableScreen(C) {
    ui.run(async (s) => {
      ui.setTitle('Sílabas');
      const st = ui.stage('game-stage');
      const strip = h('div', { class: 'letter-strip' });
      const cons = D.SYL_CONS;
      const cur = C || prefs.sylC || 'B';
      cons.forEach(L => {
        const b = h('button', { class: 'strip-btn' + (L === cur ? ' on' : '') }, L);
        b.addEventListener('click', () => { prefs.sylC = L; savePrefs(); syllableScreen(L); });
        strip.appendChild(b);
      });
      st.appendChild(strip);
      const area = h('div', { class: 'area' });
      st.appendChild(area);
      await G.syllables(s, area, { C: cur });
      const nx = cons[(cons.indexOf(cur) + 1) % cons.length];
      prefs.sylC = nx; savePrefs();
      await s.say('proxima');
      syllableScreen(nx);
    });
  }

  // ---------------- LIGUE AS LETRAS ----------------
  function dotsScreen(kind) {
    ui.run(async (s) => {
      ui.setTitle('Ligue as letras');
      const st = ui.stage('game-stage');
      const k = kind || prefs.dots || 'vogais';
      const bar = h('div', { class: 'chips' });
      [['vogais', 'A E I O U'], ['aj', 'A até J'], ['az', 'A até Z'], ['nome', '😀 ' + S().nome]].filter(([id]) => id !== 'az' || window.innerWidth >= 600).forEach(([id, t]) => {
        const c = h('button', { class: 'chip' + (k === id ? ' on' : '') }, t);
        c.addEventListener('click', () => { prefs.dots = id; savePrefs(); dotsScreen(id); });
        bar.appendChild(c);
      });
      st.appendChild(bar);
      const area = h('div', { class: 'area' });
      st.appendChild(area);
      const seq = k === 'vogais' ? D.VOWELS.slice() : k === 'aj' ? D.ALPHABET.slice(0, 10) : k === 'az' ? D.ALPHABET.slice() : G2.nameLetters();
      const r = await G2.dots(s, area, { seq });
      await s.sleep(400);
      await finish(s, area, () => dotsScreen(k), { id: 'ligar', tier: r === 'ok' ? 'ouro' : 'prata' });
    });
  }

  // ---------------- MOTOR DO R ----------------
  function rScreen(step) {
    ui.run(async (s) => {
      ui.setTitle('Motor do R');
      const st = ui.stage('game-stage');
      const cur = step || prefs.rStep || 'motor';
      const steps = [['motor', '🏍️ Motor'], ['ouvir', '👂 Tem R?'], ['pares', '🌙 R ou L?'], ['silabas', 'RA RE RI RO RU']].concat(D.R_LEVELS);
      const bar = h('div', { class: 'chips' });
      steps.forEach(([id, t]) => {
        const c = h('button', { class: 'chip' + (cur === id ? ' on' : '') }, t);
        c.addEventListener('click', () => { prefs.rStep = id; savePrefs(); rScreen(id); });
        bar.appendChild(c);
      });
      st.appendChild(bar);
      const area = h('div', { class: 'area' });
      st.appendChild(area);
      const idx = steps.findIndex(x => x[0] === cur);
      const nx = steps[(idx + 1) % steps.length][0];
      const results = [];
      if (cur === 'motor') results.push(await G3.motor(s, area));
      else if (cur === 'silabas') results.push(await G.syllables(s, area, { C: 'R' }));
      else if (cur === 'pares') {
        const list = shuffle(D.R_PAIRS).slice(0, 6);
        const dots = ui.dots(st, list.length);
        st.insertBefore(dots.el, area);
        for (let i = 0; i < list.length; i++) { dots.set(i); area.innerHTML = ''; results.push(await G4.listenPair(s, area, { pair: list[i] })); await s.sleep(400); }
        dots.set(list.length);
      }
      else if (cur === 'ouvir') {
        const com = shuffle(Object.values(D.R_WORDS).flat()), sem = shuffle(D.NO_R);
        const list = shuffle(com.slice(0, 3).map(w => [w, true]).concat(sem.slice(0, 3).map(w => [w, false])));
        const dots = ui.dots(st, list.length);
        st.insertBefore(dots.el, area);
        for (let i = 0; i < list.length; i++) { dots.set(i); area.innerHTML = ''; results.push(await G4.hasR(s, area, { word: list[i][0], hasR: list[i][1] })); await s.sleep(400); }
        dots.set(list.length);
      }
      else {
        const words = shuffle(D.R_WORDS[cur]).slice(0, 4);
        const dots = ui.dots(st, words.length);
        st.insertBefore(dots.el, area);
        for (let i = 0; i < words.length; i++) {
          dots.set(i);
          area.innerHTML = '';
          results.push(await G3.showSay(s, area, { word: words[i], question: V.U('falaPalavra', { W: words[i][0] }), showWord: true }));
          await s.sleep(400);
        }
        dots.set(words.length);
      }
      prefs.rStep = nx; savePrefs();
      await finish(s, area, () => rScreen(nx), { id: 'letraR', tier: ui.tierOf(results.filter(r => r === 'ok').length / results.length) });
    });
  }

  // ---------------- DESAFIO DE VOZ (fases) ----------------
  function phasesScreen() {
    ui.run(async (s) => {
      ui.setTitle('Desafio de voz');
      const st = ui.stage('game-stage');
      const list = G3.phases();
      const done = P().fases || {};
      const map = h('div', { class: 'phase-map' });
      list.forEach((ph, i) => {
        const tier = done[ph.id];
        const open_ = i === 0 || done[list[i - 1].id] || S().todasLetras;
        const node = h('button', { class: 'phase-node' + (tier ? ' done' : open_ ? ' open' : ' locked') },
          h('span', { class: 'phase-num' }, 'Fase ' + (i + 1)),
          h('span', { class: 'phase-icon' }, tier ? G2.pic('premios/trofeu_' + tier + '.png', MEDAL[tier]) : open_ ? ph.icon : G2.pic('premios/cadeado.png', '🔒')),
          h('b', null, ph.name),
          h('small', null, ph.items.join(' ')));
        node.addEventListener('click', () => { if (!open_) { App.fx.sfx.soft(); return; } App.fx.sfx.tap(); phasePlay(ph); });
        map.appendChild(node);
      });
      st.appendChild(h('p', { class: 'hint' }, 'Fale cada letra bem alto. Passando de fase você ganha um troféu e abre a próxima!'));
      st.appendChild(map);
      ui.onRepeat(() => V.say('fase'));
      await s.say('fase');
    });
  }
  function phasePlay(ph) {
    ui.run(async (s) => {
      ui.setTitle('Fase: ' + ph.name);
      const st = ui.stage('game-stage');
      const area = h('div', { class: 'area' });
      st.appendChild(area);
      const ratio = await G3.voicePhase(s, area, ph);
      if (ratio < 0.5) {
        // Menos da metade de primeira: ainda não passa — treina de novo, sem bronca.
        area.innerHTML = '';
        area.appendChild(h('div', { class: 'finish pop-in' }, h('div', { class: 'trophy' }, '💪'), h('h2', null, 'Quase lá!'),
          h('div', { class: 'row-btns' }, h('button', { class: 'btn big green', onclick: () => phasePlay(ph) }, '🔁 Tentar de novo'), h('button', { class: 'btn big', onclick: () => phasesScreen() }, '⬅ Fases'))));
        await s.say('faseDeNovo');
        return;
      }
      const tier = ui.tierOf(ratio);
      const pr = P();
      pr.fases = pr.fases || {};
      const order = App.store.TIERS;
      if (!pr.fases[ph.id] || order.indexOf(tier) > order.indexOf(pr.fases[ph.id])) pr.fases[ph.id] = tier;
      App.store.saveProgress();
      area.innerHTML = '';
      const box = h('div', { class: 'finish pop-in' },
        h('div', { class: 'trophy' }, G2.pic('premios/trofeu_' + tier + '.png', '🏆')),
        h('h2', null, 'Você passou de fase!'),
        h('p', { class: 'finish-tier' }, MEDAL[tier] + ' Troféu de ' + tier),
        h('div', { class: 'row-btns' },
          h('button', { class: 'btn big green', onclick: () => phasesScreen() }, '▶ Próxima fase'),
          h('button', { class: 'btn big', onclick: () => phasePlay(ph) }, '🔁 De novo')));
      area.appendChild(box);
      App.fx.sfx.fanfare(); App.fx.confetti(180); App.avatar.happy(3000);
      App.store.setTrophy('fase_' + ph.id, tier);
      await s.say('faseFim');
      await s.say({ ouro: 'trofeuOuro', prata: 'trofeuPrata', bronze: 'trofeuBronze' }[tier]);
    });
  }

  // ---------------- AVENTURA ----------------
  function chooseFocus(peek) {
    const pr = P();
    if (pr.aventuraAtual && pr.aventuraAtual.L) return { L: pr.aventuraAtual.L, isNew: false };
    const unl = ui.unlocked();
    let cand = unl.filter(L => App.store.mastery(L) < 0.6);
    if (!cand.length && !S().todasLetras && (pr.liberadas || 5) < 26) {
      if (peek) return { L: D.ORDER[pr.liberadas || 5], isNew: true };
      pr.liberadas = (pr.liberadas || 5) + 1;
      App.store.saveProgress();
      return { L: D.ORDER[pr.liberadas - 1], isNew: true };
    }
    if (!cand.length) cand = unl.slice().sort((a, b) => App.store.mastery(a) - App.store.mastery(b)).slice(0, 3);
    return { L: cand[0], isNew: false };
  }
  function adventure() {
    ui.run(async (s) => {
      ui.setTitle('Aventura');
      const { L } = chooseFocus();
      const set = ui.unlocked();
      const others = set.filter(x => x !== L);
      const cx = S().caixa;
      const upper = cx !== 'minusculas', lower = cx !== 'maiusculas';
      const steps = [];
      steps.push(['👀', 'Conhecer', (a) => G.present(s, a, { L })]);
      steps.push(['🔁', 'Repita comigo', (a) => G.repeatMe(s, a, { ch: upper ? L : L.toLowerCase() })]);
      if (upper) steps.push(['✍️', 'Escrever', (a) => App.trace.activity(s, a, { ch: L })]);
      steps.push(['👆', 'Encontre', (a) => G.findLetter(s, a, { ch: ui.caseOf(L), set })]);
      steps.push(['🗣️', 'Que letra é essa?', (a) => G.whichLetter(s, a, { ch: ui.caseOf(L), first: true })]);
      if (lower) steps.push(['✍️', 'Escrever minúscula', (a) => App.trace.activity(s, a, { ch: L.toLowerCase() })]);
      if (others.length) steps.push(['🗣️', 'Lembra dessa?', (a) => G.whichLetter(s, a, { ch: ui.caseOf(ui.pickLetter(others)) })]);
      const words = D.allWords().filter(w => G.plainWord(w[0]) && w[0][0] === L);
      // Um trecho do alfabeto que contém a letra do dia (para o trem)
      const ai = D.ALPHABET.indexOf(L), a0 = Math.max(0, Math.min(21, ai - 2));
      const fun = [
        ['🎈', 'Balões', (a) => G.balloons(s, a, { L, set: set.length > 3 ? set : D.VOWELS })],
        ['🔠', 'Achar o par', (a) => G.pairCase(s, a, { L, set })],
        ['🚂', 'Trem das letras', (a) => G2.train(s, a, { seq: D.isVowel(L) ? D.VOWELS.slice() : D.ALPHABET.slice(a0, a0 + 5) })],
        ['🚗', 'Labirinto', (a) => G2.maze(s, a, { seq: shuffle(others).slice(0, 2).concat([L]) })]
      ];
      if (words.length) {
        fun.push(['🍎', 'Começa com...', (a) => G.firstLetter(s, a, { word: pick(words), set })]);
        fun.push(['🖼️', 'Mostre e fale', (a) => G3.showSay(s, a, { word: pick(words), showWord: true })]);
      }
      if (set.length >= 3) fun.push(['🃏', 'Memória', (a) => G.memory(s, a, { letters: [L, ...shuffle(others)].slice(0, [3, 4, 5][lvl() - 1] || 4), pairs: Math.min(set.length, [3, 4, 5][lvl() - 1] || 4) })]);
      shuffle(fun).slice(0, 1).forEach(f => steps.push(f));
      if (D.SYL_CONS.includes(L)) steps.push(['🔡', 'Sílabas', (a) => G.syllables(s, a, { C: L })]);
      const bw = D.BUILD[0].concat(D.BUILD[1]).filter(w => w[0].includes(L));
      if (bw.length) steps.push(['🧩', 'Formar palavra', (a) => G.buildWord(s, a, { word: pick(bw), firstTime: true, level: 1 })]);

      // Retomar: mesma lista de passos e o passo em que parou
      const saved = P().aventuraAtual;
      let start = 0;
      if (saved && saved.L === L && saved.labels) {
        const pool = steps.concat(fun);
        const re = saved.labels.map(l => pool.find(p => p[1] === l)).filter(Boolean);
        if (re.length === saved.labels.length) { steps.length = 0; re.forEach(x => steps.push(x)); start = Math.max(0, Math.min(saved.i || 0, steps.length - 1)); }
      }
      P().aventuraAtual = { L, i: start, labels: steps.map(x => x[1]) };
      App.store.saveProgress();
      const st = ui.stage('game-stage adventure');
      const path = h('div', { class: 'trail' });
      steps.forEach(([ic]) => path.appendChild(h('span', { class: 'trail-step' }, ic)));
      path.appendChild(h('span', { class: 'trail-step goal' }, '🏆'));
      const focusBadge = h('div', { class: 'focus-badge' }, art(L), art(L.toLowerCase()));
      st.appendChild(h('div', { class: 'adv-head' }, focusBadge, path));
      const area = h('div', { class: 'area' });
      st.appendChild(area);
      await s.say(start > 0 ? 'continuar' : 'aventura', { L });
      const results = [];
      for (let i = start; i < steps.length; i++) {
        P().aventuraAtual.i = i; App.store.saveProgress();
        [...path.children].forEach((c, k) => { c.className = 'trail-step' + (k < i ? ' done' : k === i ? ' now' : '') + (k === steps.length ? ' goal' : ''); });
        const isTrace = steps[i][1].startsWith('Escrever');
        st.classList.toggle('trace-stage', isTrace);
        area.innerHTML = '';
        area.className = 'area fade-in' + (isTrace ? ' trace-area' : '');
        area.appendChild(h('div', { class: 'step-title' }, steps[i][0] + ' ' + steps[i][1]));
        ui.onRepeat(null);
        results.push(await steps[i][2](area));
        await s.sleep(350);
        if (i < steps.length - 1) {
          st.classList.remove('trace-stage');
          area.innerHTML = '';
          area.className = 'area';
          area.appendChild(h('div', { class: 'next-card pop-in' }, h('span', null, steps[i + 1][0]), h('b', null, steps[i + 1][1])));
          App.fx.sfx.whoosh();
          await s.say('proxima');
          await s.sleep(300);
        }
      }
      st.classList.remove('trace-stage');
      [...path.children].forEach(c => c.classList.add('done'));
      const pr = P();
      pr.aventuras = (pr.aventuras || 0) + 1;
      delete pr.aventuraAtual;
      App.store.saveProgress();
      const tier = ui.tierOf(results.filter(r => r === 'ok').length / results.length);
      App.store.setTrophy('aventura_' + L, tier);
      area.innerHTML = '';
      area.className = 'area';
      const box = h('div', { class: 'finish pop-in' },
        h('div', { class: 'trophy' }, G2.pic('premios/trofeu_' + tier + '.png', '🏆')),
        h('div', { class: 'focus-badge big' }, art(L), art(L.toLowerCase())),
        h('h2', null, 'Aventura da letra ' + L + ' completa!'),
        h('p', { class: 'finish-tier' }, MEDAL[tier] + ' Troféu de ' + tier),
        h('div', { class: 'row-btns' },
          h('button', { class: 'btn big green', onclick: () => adventure() }, '🚀 Próxima aventura'),
          h('button', { class: 'btn big', onclick: () => menu() }, '🏠 Menu')));
      area.appendChild(box);
      App.fx.sfx.fanfare(); App.fx.confetti(200); App.avatar.happy(3500);
      ui.addStar(box);
      await s.say('trofeu', { L });
      await ui.flushSticker(s);
    });
  }

  // ---------------- PRÊMIOS ----------------
  function album() {
    ui.run(async (s) => {
      ui.setTitle('Meus prêmios');
      const st = ui.stage('game-stage');
      const pr = P();
      const nextIn = 10 - (pr.estrelas % 10);
      st.appendChild(h('div', { class: 'album-head' },
        h('div', { class: 'big-stars' }, G2.pic('premios/estrela.png', '⭐', 'star-pic'), h('b', null, pr.estrelas)),
        h('p', null, nextIn === 1 ? 'Falta 1 estrela para o próximo adesivo!' : 'Faltam ' + nextIn + ' estrelas para o próximo adesivo!'),
        h('div', { class: 'progress-bar' }, h('i', { style: { width: ((10 - nextIn) * 10) + '%' } }))));
      // Estante de troféus
      const tro = pr.trofeus || {};
      const shelf = h('div', { class: 'shelf' });
      const label = (id) => GAMES[id] ? GAMES[id].title : id.startsWith('aventura_') ? 'Aventura ' + id.slice(9) : id.startsWith('fase_') ? 'Fase de voz' : id;
      Object.keys(tro).forEach(id => shelf.appendChild(h('div', { class: 'shelf-item' }, G2.pic('premios/trofeu_' + tro[id] + '.png', MEDAL[tro[id]]), h('small', null, label(id)))));
      st.appendChild(h('h3', { class: 'sub' }, '🏆 Meus troféus'));
      st.appendChild(Object.keys(tro).length ? shelf : h('p', { class: 'hint' }, 'Termine uma brincadeira para ganhar o primeiro troféu!'));
      st.appendChild(h('h3', { class: 'sub' }, '🎁 Meus adesivos'));
      const grid = h('div', { class: 'album-grid' });
      D.STICKERS.forEach(x => grid.appendChild(h('div', { class: 'sticker' + (pr.adesivos.includes(x) ? ' got' : '') }, pr.adesivos.includes(x) ? x : '?')));
      st.appendChild(grid);
      st.appendChild(h('h3', { class: 'sub' }, '🔤 Letras que você já sabe'));
      const lg = h('div', { class: 'abc-grid mini' });
      D.ALPHABET.forEach(L => {
        const m = App.store.mastery(L);
        const stars = m >= 0.9 ? '⭐⭐⭐' : m >= 0.55 ? '⭐⭐' : m >= 0.2 ? '⭐' : '·';
        lg.appendChild(h('div', { class: 'abc-card' + (D.isVowel(L) ? ' vowel' : '') }, h('span', { class: 'pair' }, art(L, { tight: true })), h('small', null, stars)));
      });
      st.appendChild(lg);
      App.avatar.happy(1500);
      await s.say('elogio5');
    });
  }

  // ---------------- Voz natural: aquecimento e aviso ----------------
  let warmed = '';
  function warmUp() {
    const e = V.engine();
    if (e.e === 'browser' || warmed === e.e + e.id) return;
    warmed = e.e + e.id;
    const keys = ['menuVolta', 'menu', 'proxima', 'queLetra', 'queLetra2', 'suaVez', 'naoOuvi', 'fim', 'esforco'].concat(D.PRAISE, D.RETRY);
    V.prefetch(keys.map(k => V.U(k)));
  }
  let chipTimer = 0;
  function voiceChip() {
    warmUp();
    const el = $('voiceChip'); if (!el) return;
    const N = App.neural, K = N.K;
    const pv = N.P.voices[V.persona().piper[0]] || {};
    let t = '';
    if (K.state === 'loading') t = '⬇ Baixando a voz natural… ' + Math.round(K.progress * 100) + '%';
    else if (K.state === 'starting') t = '⏳ Ligando a voz natural…';
    else if (pv.state === 'loading') t = '⬇ Baixando a voz natural… ' + Math.round((pv.progress || 0) * 100) + '%';
    clearTimeout(chipTimer);
    if (t) { el.textContent = t; el.hidden = false; return; }
    if (!el.hidden && (K.state === 'ready' || pv.state === 'ready')) {
      el.textContent = '✔ Voz natural pronta: ' + V.persona().name;
      chipTimer = setTimeout(() => { el.hidden = true; }, 4000);
    } else el.hidden = true;
  }

  // ---------------- INÍCIO ----------------
  let started = false;
  async function boot() {
    App.avatar.mount($('splashAvatar'));
    ui.refreshStars();
    $('btnHome').addEventListener('click', () => { App.fx.sfx.tap(); menu(); });
    $('starCount').addEventListener('click', () => { App.fx.sfx.tap(); album(); });
    $('btnRepeat').addEventListener('click', () => { App.fx.sfx.tap(); ui.repeat(); });
    $('btnParents').addEventListener('click', () => { App.fx.sfx.tap(); App.parents.gate(); });
    $('avatarBox').addEventListener('click', () => { App.avatar.happy(900); App.fx.sfx.pop(); ui.repeat(); });
    V.loadClipKeys();   // em segundo plano: o botão de começar não pode depender disso
    App.neural.onChange(() => { voiceChip(); App.parents && App.parents.refreshStatus && App.parents.refreshStatus(); });
    const voiceUp = V.autoStart();
    const sp = $('splash');
    $('splashName').textContent = S().nome;
    // Se a voz natural já está baixada, espera ela ligar (uns 15 s) antes de começar,
    // para a criança não ouvir a voz antiga do computador no começo.
    const startBtn = sp.querySelector('.start');
    (async () => {
      try {
        if (S().motor === 'navegador') return;
        const N = App.neural;
        const cached = (N.hasWebGPU() && await N.kokoroCached()) || await N.piperCached(V.persona().piper[0]);
        if (!cached) return;
        const label = startBtn.textContent;
        startBtn.disabled = true;
        startBtn.classList.remove('pulse');
        startBtn.textContent = '⏳ Ligando a voz…';
        await Promise.race([voiceUp, sleep(30000)]);
        startBtn.textContent = label;
        startBtn.classList.add('pulse');
        startBtn.disabled = false;
      } catch (e) { startBtn.disabled = false; }
    })();
    startBtn.addEventListener('click', () => {
      App.fx.unlock();
      started = true;
      App.avatar.mount($('avatarBox'));
      sp.classList.add('hide');
      setTimeout(() => sp.remove(), 500);
      menu();
    }, { once: true });
    // Tempo de estudo: conta só com o app aberto, visível e já iniciado.
    setInterval(() => { if (started && document.visibilityState === 'visible') App.store.addTime(20); }, 20000);
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => { });
    }
  }
  // Troca o avatar na hora (usado pela área dos pais)
  function remountAvatar() { if (started) App.avatar.mount($('avatarBox')); }

  App.app = { menu, open, adventure, boot, prefs, GAMES, remountAvatar };
  document.addEventListener('DOMContentLoaded', boot);
})(window.App);
