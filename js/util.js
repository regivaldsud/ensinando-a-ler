'use strict';
// =====================================================================
//  Utilidades gerais + sessão de atividade (permite cancelar tudo ao sair)
// =====================================================================
window.App = window.App || {};
(function (App) {
  const $ = (id) => document.getElementById(id);

  // Cria elementos: h('div', {class:'x', onclick:fn}, 'texto', filho...)
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') {
        for (const p in v) { if (p.startsWith('--')) e.style.setProperty(p, v[p]); else e.style[p] = v[p]; }
      }
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    kids.flat().forEach(c => {
      if (c === undefined || c === null || c === false) return;
      e.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    });
    return e;
  }

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const rand = (n) => Math.floor(Math.random() * n);
  const pick = (a) => a[rand(a.length)];
  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  // Tira acentos e pontuação, deixa minúsculo.
  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function hash(s) {
    let h1 = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h1 ^= s.charCodeAt(i); h1 = Math.imul(h1, 0x01000193) >>> 0; }
    return h1.toString(36);
  }

  // Sinal: espera o próximo "disparo"
  // Com "buffered", um disparo sem ninguém esperando fica guardado para a próxima espera.
  function signal(buffered) {
    let waiters = [], pend, has = false;
    return {
      fire(v) {
        if (waiters.length) { const w = waiters; waiters = []; w.forEach(r => r(v)); }
        else if (buffered) { pend = v; has = true; }
      },
      wait() {
        if (has) { has = false; const v = pend; pend = undefined; return Promise.resolve(v); }
        return new Promise(r => waiters.push(r));
      }
    };
  }

  // ---- Sessão: tudo o que uma atividade espera passa por aqui ----
  const CANCEL = { cancelled: true };
  class Session {
    constructor() {
      this.alive = true;
      this.cleanups = [];
      this.dead = new Promise(r => { this._kill = r; });
    }
    check() { if (!this.alive) throw CANCEL; }
    async wait(p) {
      this.check();
      const r = await Promise.race([p, this.dead]);
      this.check();
      return r;
    }
    sleep(ms) { return this.wait(sleep(ms)); }
    say(key, vars, opts) { return this.wait(App.voice.say(key, vars, opts)); }
    sayU(u, opts) { return this.wait(App.voice.speak(u, opts)); }
    onEnd(fn) { this.cleanups.push(fn); }
    end() {
      if (!this.alive) return;
      this.alive = false;
      this._kill(CANCEL);
      this.cleanups.forEach(f => { try { f(); } catch (e) { console.warn(e); } });
      this.cleanups = [];
    }
  }

  // Espera um clique em qualquer um dos elementos; devolve o índice
  function waitClick(els, s) {
    return new Promise(res => {
      const handlers = els.map((e, i) => {
        const fn = (ev) => { ev.preventDefault(); res(i); };
        e.addEventListener('click', fn);
        return [e, fn];
      });
      if (s) s.onEnd(() => handlers.forEach(([e, f]) => e.removeEventListener('click', f)));
    });
  }

  // Fila de toques: guarda o toque mesmo se acontecer enquanto a corujinha fala.
  //  next() = próximo toque (índice) · any() = resolve no primeiro toque
  function clickQueue(els) {
    let last = null, waiter = null, anyRes, anyDone = false;
    const anyP = new Promise(r => { anyRes = r; });
    els.forEach((e, i) => e.addEventListener('click', ev => {
      ev.preventDefault();
      if (!anyDone) { anyDone = true; anyRes(i); }
      if (waiter) { const w = waiter; waiter = null; w(i); } else last = i;
    }));
    return {
      next() { if (last !== null) { const v = last; last = null; return Promise.resolve(v); } return new Promise(r => { waiter = r; }); },
      any() { return anyP; },
      clear() { last = null; }
    };
  }

  App.util = { $, h, sleep, rand, pick, shuffle, norm, hash, signal, Session, CANCEL, waitClick, clickQueue };
})(window.App);
