'use strict';
// =====================================================================
//  Sons (gerados na hora, sem arquivos) e efeitos visuais.
// =====================================================================
(function (App) {
  let ac = null;
  function ctx() {
    if (!ac) { const C = window.AudioContext || window.webkitAudioContext; ac = new C(); }
    if (ac.state === 'suspended') ac.resume().catch(() => { });
    return ac;
  }
  // Libera o som no celular (precisa de um toque do usuário).
  function unlock() {
    try {
      const c = ctx();
      const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource();
      s.buffer = b; s.connect(c.destination); s.start(0);
    } catch (e) { }
    try {
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0; speechSynthesis.speak(u);
      }
    } catch (e) { }
  }

  function tone(freq, dur, type, vol, when, slide) {
    if (!App.store.settings.efeitos) return;
    try {
      const c = ctx(), t = c.currentTime + (when || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dur + 0.05);
    } catch (e) { }
  }
  const sfx = {
    tap: () => tone(660, 0.08, 'triangle', 0.12),
    pop: () => { tone(900, 0.09, 'square', 0.08, 0, 300); tone(1400, 0.05, 'sine', 0.06, 0.02); },
    ok: () => { tone(784, 0.12, 'triangle', 0.16); tone(1047, 0.18, 'triangle', 0.16, 0.1); tone(1319, 0.25, 'triangle', 0.14, 0.2); },
    soft: () => { tone(330, 0.16, 'sine', 0.12); tone(262, 0.22, 'sine', 0.1, 0.12); },
    star: () => { [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.12, 'sine', 0.1, i * 0.06)); },
    flip: () => tone(520, 0.06, 'triangle', 0.08, 0, 760),
    fanfare: () => {
      [[523, 0], [659, .12], [784, .24], [1047, .38], [784, .55], [1047, .68]].forEach(([f, w]) => tone(f, 0.22, 'triangle', 0.14, w));
    },
    stroke: () => tone(988, 0.1, 'sine', 0.12, 0, 1480),
    whoosh: () => tone(300, 0.25, 'sawtooth', 0.04, 0, 1200)
  };

  // Confete
  function confetti(n) {
    n = n || 90;
    const layer = document.getElementById('fxLayer');
    if (!layer) return;
    const cols = ['#ff4d6d', '#ffd23f', '#3bceac', '#2f7bff', '#9b5de5', '#ff8c42'];
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      p.className = 'confetti';
      p.style.left = (Math.random() * 100) + 'vw';
      p.style.background = cols[i % cols.length];
      p.style.setProperty('--dx', (Math.random() * 40 - 20) + 'vw');
      p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      p.style.animationDuration = (1.6 + Math.random() * 1.6) + 's';
      p.style.animationDelay = (Math.random() * 0.3) + 's';
      if (i % 3 === 0) p.style.borderRadius = '50%';
      layer.appendChild(p);
      setTimeout(() => p.remove(), 3800);
    }
  }
  // Estrelinha voando até o contador
  function flyStar(fromEl) {
    const layer = document.getElementById('fxLayer');
    const target = document.getElementById('starCount');
    if (!layer || !target) return;
    const a = fromEl ? fromEl.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    const b = target.getBoundingClientRect();
    const s = document.createElement('div');
    s.className = 'fly-star'; s.textContent = '⭐';
    s.style.left = (a.left + a.width / 2) + 'px';
    s.style.top = (a.top + a.height / 2) + 'px';
    layer.appendChild(s);
    requestAnimationFrame(() => {
      s.style.transform = `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px, ${b.top + b.height / 2 - (a.top + a.height / 2)}px) scale(.6)`;
      s.style.opacity = '0.3';
    });
    setTimeout(() => { s.remove(); target.classList.remove('bump'); void target.offsetWidth; target.classList.add('bump'); }, 900);
  }
  function sparkle(el) {
    if (!el) return;
    const layer = document.getElementById('fxLayer');
    const r = el.getBoundingClientRect();
    for (let i = 0; i < 12; i++) {
      const s = document.createElement('div');
      s.className = 'sparkle';
      s.textContent = ['✨', '⭐', '💫'][i % 3];
      s.style.left = (r.left + r.width / 2) + 'px';
      s.style.top = (r.top + r.height / 2) + 'px';
      const ang = (i / 12) * Math.PI * 2, dist = 60 + Math.random() * 70;
      s.style.setProperty('--tx', Math.cos(ang) * dist + 'px');
      s.style.setProperty('--ty', Math.sin(ang) * dist + 'px');
      layer.appendChild(s);
      setTimeout(() => s.remove(), 1000);
    }
  }

  App.fx = { ctx, unlock, sfx, confetti, flyStar, sparkle };
})(window.App);
