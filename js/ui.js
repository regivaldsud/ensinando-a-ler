'use strict';
// =====================================================================
//  Interface comum: balão de fala, microfone, telas, estrelas e prêmios,
//  e as peças que todos os jogos usam (elogiar, perguntar, escolher letra).
// =====================================================================
(function (App) {
  const { $, h, pick, shuffle, sleep, signal, Session, CANCEL } = App.util;
  const D = App.data;
  const S = () => App.store.settings;

  // ---------- Balão e microfone ----------
  let bubbleTimer = 0;
  function bubble(text) {
    const b = $('bubble'), t = $('bubbleText');
    if (!b) return;
    t.textContent = text;
    b.classList.remove('heard');
    b.classList.add('show');
    clearTimeout(bubbleTimer);
  }
  function heard(text) {
    const b = $('bubble'), t = $('bubbleText');
    t.textContent = '🗣️ “' + text + '”';
    b.classList.add('show', 'heard');
  }
  function mic(on) {
    const m = $('micBadge');
    if (m) m.classList.toggle('on', !!on);
    document.body.classList.toggle('listening', !!on);
  }

  // ---------- Palco ----------
  function stage(cls) {
    const st = $('stage');
    st.innerHTML = '';
    st.className = 'stage ' + (cls || '');
    st.scrollTop = 0;
    return st;
  }
  function setTitle(t) { $('title').textContent = t || 'Ensinando a Ler'; }

  // ---------- Janelas ----------
  let modalGen = 0;
  function modal(content, opts) {
    opts = opts || {};
    const m = $('modal');
    const gen = ++modalGen;
    m.innerHTML = '';
    const box = h('div', { class: 'modal-box ' + (opts.cls || '') });
    if (opts.close !== false) box.appendChild(h('button', { class: 'modal-x', 'aria-label': 'Fechar', onclick: () => close() }, '✕'));
    box.appendChild(content);
    m.appendChild(box);
    m.hidden = false;
    requestAnimationFrame(() => m.classList.add('show'));
    let closed = false;
    const sig = signal();
    function close(v) {
      if (closed) return; closed = true;
      if (gen === modalGen) {
        m.classList.remove('show');
        setTimeout(() => { if (gen === modalGen) { m.hidden = true; m.innerHTML = ''; } }, 200);
      }
      opts.onClose && opts.onClose(v);
      sig.fire(v);
    }
    return { close, done: sig.wait(), box };
  }

  // ---------- Estrelas e adesivos ----------
  function refreshStars() { const e = $('starCount'); if (e) e.querySelector('b').textContent = App.store.progress.estrelas; }
  let pendingSticker = null;
  async function flushSticker(s) { if (pendingSticker) { const st = pendingSticker; pendingSticker = null; await showSticker(s, st); } }
  function addStar(fromEl) {
    const P = App.store.progress;
    P.estrelas++;
    let sticker = null;
    if (P.estrelas % 10 === 0) {
      const free = D.STICKERS.filter(x => !P.adesivos.includes(x));
      if (free.length) { sticker = free[0]; P.adesivos.push(sticker); pendingSticker = sticker; }
    }
    App.store.saveProgress();
    App.fx.flyStar(fromEl);
    App.fx.sfx.star();
    setTimeout(refreshStars, 850);
    return sticker;
  }
  async function showSticker(s, sticker) {
    App.fx.sfx.fanfare();
    App.fx.confetti(140);
    App.avatar.happy(3000);
    const m = modal(h('div', { class: 'sticker-win' },
      h('div', { class: 'sticker-big' }, sticker),
      h('h2', null, 'Adesivo novo!'),
      h('p', null, 'Ele foi para o seu álbum de prêmios.'),
      h('button', { class: 'btn big green', onclick: () => m.close() }, 'Oba! ▶')), { close: false, cls: 'center' });
    await s.say('adesivo');
    await s.wait(Promise.race([m.done, sleep(6000)]));
    m.close();
  }

  // ---------- Elogiar / incentivar ----------
  let lastPraise = '';
  async function praise(s, el, opts) {
    opts = opts || {};
    App.fx.sfx.ok();
    App.avatar.happy(2200);
    if (el) App.fx.sparkle(el);
    if (opts.confetti !== false) App.fx.confetti(opts.big ? 150 : 45);
    if (opts.star !== false) addStar(el);
    // Na maioria das rodadas o elogio é curtinho ("Isso!"), para não segurar a próxima;
    // as frases completas ficam para os momentos grandes e aparecem de vez em quando.
    const full = opts.big || Math.random() < 0.35;
    let k = pick(full ? D.PRAISE : D.SHORT);
    for (let n = 0; n < 4 && k === lastPraise; n++) k = pick(full ? D.PRAISE : D.SHORT);
    lastPraise = k;
    if (opts.u) await s.sayU(opts.u);
    else await s.say(opts.key || k);
    if (opts.then) await s.sayU(App.voice.U(k));
    await flushSticker(s);
  }
  async function retry(s, el) {
    App.fx.sfx.soft();
    if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
    await s.say(pick(D.RETRY));
  }

  // ---------- Letras ----------
  function unlocked() {
    if (S().todasLetras) return D.ORDER.slice();
    return D.ORDER.slice(0, Math.max(5, Math.min(26, App.store.progress.liberadas || 5)));
  }
  function letterSet(name) {
    if (name === 'vogais') return D.VOWELS.slice();
    if (name === 'todas') return D.ALPHABET.slice();
    if (name === 'aventura') return unlocked();
    if (Array.isArray(name)) return name;
    return D.ALPHABET.slice();
  }
  // Mostra maiúscula, minúscula ou as duas, conforme a configuração.
  function caseOf(L, force) {
    const c = force || S().caixa;
    if (c === 'maiusculas') return L.toUpperCase();
    if (c === 'minusculas') return L.toLowerCase();
    return Math.random() < 0.5 ? L.toUpperCase() : L.toLowerCase();
  }
  // Sorteia letras dando preferência às que ele ainda não domina.
  function pickLetter(set, avoid) {
    const pool = set.filter(L => L !== avoid);
    const w = pool.map(L => 1.25 - App.store.mastery(L));
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1] || set[0];
  }
  function distractors(L, n, set) {
    const base = (set && set.length > n ? set : D.ALPHABET);
    const pool = shuffle(base.filter(x => x !== L));
    // Letras parecidas aparecem juntas às vezes (b/d/p/q, m/n, e/a)
    const similar = { B: 'DP', D: 'BP', P: 'BQ', Q: 'PO', M: 'NW', N: 'MU', E: 'AF', A: 'EO', O: 'QC', C: 'OG', U: 'VN', V: 'UY', I: 'LJ', L: 'IT' };
    const out = [];
    if (similar[L] && Math.random() < 0.5) { const x = pick(similar[L].split('').filter(y => base.includes(y)) || []); if (x && x !== L) out.push(x); }
    for (const x of pool) { if (out.length >= n) break; if (!out.includes(x)) out.push(x); }
    return out.slice(0, n);
  }
  function wordFor(L) { return pick(D.WORDS[L.toUpperCase()]); }
  const vowelsTts = (ch) => ch;

  // ---------- Barra de progresso das rodadas ----------
  function dots(parent, total) {
    const bar = h('div', { class: 'dots' });
    for (let i = 0; i < total; i++) bar.appendChild(h('i'));
    parent.appendChild(bar);
    return {
      set(i) { [...bar.children].forEach((d, k) => { d.className = k < i ? 'done' : k === i ? 'now' : ''; }); },
      el: bar
    };
  }

  // ---------- "Fala pra mim": escuta a criança, com botões para os pais ----------
  //  o.question  — fala da pergunta (U)
  //  o.target    — letra ('B') ou texto ('ba', 'bola')
  //  o.type      — 'letter' | 'text'
  //  o.wrong     — fala para ensinar quando erra (U)
  //  o.lenient   — no "repita comigo" qualquer tentativa depois da correção vale
  // Devolve 'ok' (de primeira), 'ok2' (depois de ajuda) ou 'err'.
  async function ask(s, parent, o) {
    const sig = signal(true);
    // Fala, mas se alguém tocar num botão no meio, para de falar e atende o toque.
    let tapRes = null;
    const tap = (v) => { sig.fire(v); if (tapRes) { const r = tapRes; tapRes = null; r(true); } };
    const speakOrTap = async (u) => {
      const tapped = await s.wait(Promise.race([App.voice.speak(u).then(() => false), new Promise(r => { tapRes = r; })]));
      tapRes = null;
      if (tapped) App.voice.stop();
    };
    const parentsOn = S().botoesPais;
    const bar = h('div', { class: 'ask-bar' },
      h('button', { class: 'btn mic-btn', onclick: () => tap('mic'), title: 'Falar' }, '🎤', h('span', null, 'Falar')),
      h('button', { class: 'btn ghost', onclick: () => tap('again'), title: 'Ouvir de novo' }, '🔊', h('span', null, 'Ouvir')),
      parentsOn ? h('div', { class: 'parent-btns' },
        h('small', null, 'Pais:'),
        h('button', { class: 'btn ok-btn', onclick: () => tap('ok'), title: 'Acertou' }, '✔', h('span', null, 'Acertou')),
        h('button', { class: 'btn no-btn', onclick: () => tap('err'), title: 'Ainda não' }, '✖', h('span', null, 'Ainda não'))) : null);
    bar.classList.toggle('no-mic', !App.voice.canListen());
    parent.appendChild(bar);
    s.onEnd(() => App.voice.stopListening());
    let tries = 0, silent = 0, helped = false;
    await speakOrTap(o.question);
    let listenNow = true;
    for (; ;) {
      let r;
      const canL = App.voice.canListen();
      bar.classList.toggle('no-mic', !canL);
      if (canL && listenNow) {
        r = await s.wait(Promise.race([App.voice.listen({ ms: o.ms || 6000 }), sig.wait().then(b => ({ btn: b }))]));
      } else {
        if (!canL && !parentsOn) {
          // sem microfone e sem botões dos pais: segue em frente, só ensinando
          await s.sleep(2500);
          return 'ok2';
        }
        bar.classList.add('wait-btn');
        r = { btn: await s.wait(Promise.race([sig.wait(), canL ? new Promise(() => { }) : sleep(15000).then(() => 'skip')])) };
        bar.classList.remove('wait-btn');
        if (r.btn === 'skip') return 'ok2';
      }
      listenNow = true;
      if (r.btn) {
        App.voice.stopListening();
        if (r.btn === 'ok') return helped ? 'ok2' : 'ok';
        if (r.btn === 'again') { await speakOrTap(o.question); continue; }
        if (r.btn === 'mic') { bar.classList.remove('need-mic'); continue; }
        if (r.btn === 'err') {
          if (!helped && o.wrong) { helped = true; App.fx.sfx.soft(); await s.sayU(o.wrong); continue; }
          return 'err';
        }
        continue;
      }
      if (!r.supported) { listenNow = false; continue; }
      const m = o.type === 'letter' ? App.voice.matchLetter(r.heard, o.target) : App.voice.matchText(r.heard, o.target);
      if (m.ok) return helped ? 'ok2' : 'ok';
      if (!m.any) {
        silent++;
        if (silent <= 1) { await s.say('naoOuvi'); continue; }
        listenNow = false; // espera alguém tocar no microfone ou nos botões
        bar.classList.add('need-mic');
        await s.say('toqueMic');
        continue;
      }
      tries++;
      if (tries === 1 && o.wrong) { helped = true; App.fx.sfx.soft(); await s.sayU(o.wrong); continue; }
      if (o.lenient) return 'ok2';
      return 'err';
    }
  }

  // ---------- Rodando uma atividade ----------
  let current = null;
  let repeatFn = null;
  function run(fn, ...args) {
    stopCurrent();
    const s = new Session();
    current = s;
    repeatFn = null;
    const p = (async () => {
      try { await fn(s, ...args); }
      catch (e) { if (e !== CANCEL) { console.error(e); } }
      finally { /* fica registrada: a próxima navegação chama end() e roda as limpezas */ }
    })();
    return p;
  }
  function stopCurrent() {
    if (current) { current.end(); current = null; }
    App.voice.stop();
    App.avatar.set('idle');
    mic(false);
    const m = $('modal'); if (m && !m.hidden) { modalGen++; m.classList.remove('show'); m.hidden = true; m.innerHTML = ''; }
  }
  function onRepeat(fn) { repeatFn = fn; }
  function repeat() {
    if (repeatFn) { repeatFn(); return; }
    const u = App.voice.lastU;
    if (u) App.voice.speak(u);
  }

  // Troféu conforme os acertos de primeira: 80% ouro, 50% prata, senão bronze
  const tierOf = (ratio) => ratio >= 0.8 ? 'ouro' : ratio >= 0.5 ? 'prata' : 'bronze';

  App.ui = {
    tierOf, flushSticker, bubble, heard, mic, stage, setTitle, modal, refreshStars, addStar, showSticker, praise, retry,
    unlocked, letterSet, caseOf, pickLetter, distractors, wordFor, dots, ask, run, stopCurrent, onRepeat, repeat, vowelsTts
  };
})(window.App);
