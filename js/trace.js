'use strict';
// =====================================================================
//  Traçar a letra com o dedo (ou com o mouse).
//  A criança segue cada traço na ordem certa: bolinha verde = começo,
//  setinhas = direção. O traço vai se colorindo conforme ela acompanha.
// =====================================================================
(function (App) {
  const { h, sleep } = App.util;

  function play(s, parent, o) {
    const ch = o.ch;
    const strokes = App.strokes.sample(ch, 1.5);
    const color = App.strokes.colorOf(ch);
    const isLower = ch === ch.toLowerCase();
    const wrap = h('div', { class: 'trace-wrap' });
    const canvas = h('canvas', { class: 'trace-canvas', 'aria-label': 'Traçar a letra ' + ch });
    const btnShow = h('button', { class: 'btn ghost' }, '👀', h('span', null, 'Mostrar como'));
    const btnClear = h('button', { class: 'btn ghost' }, '🧽', h('span', null, 'Começar de novo'));
    wrap.appendChild(canvas);
    const btnSkip = h('button', { class: 'btn ghost' }, '⏭', h('span', null, 'Pular'));
    const tools = h('div', { class: 'trace-tools' }, btnShow, btnClear, btnSkip);
    parent.appendChild(wrap);
    parent.appendChild(tools);
    const g = canvas.getContext('2d');

    const bb = App.strokes.bbox(ch);
    let W = 0, H = 0, dpr = 1, scale = 1, ox = 0, oy = 0;
    const TOL = 14;
    let cur = 0, idx = 0, active = false, finger = null, off = false, done = false, demo = null;
    const doneSet = new Set();
    let lastHint = 0, saidNext = false, hints = 0;
    let resolveDone;
    const finished = new Promise(r => { resolveDone = r; });

    function layout() {
      const r = wrap.getBoundingClientRect();
      dpr = Math.min(2.5, window.devicePixelRatio || 1);
      W = Math.max(200, r.width); H = Math.max(200, r.height);
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      const bw = Math.max(60, bb.x1 - bb.x0 + 34);
      scale = Math.min(W / bw, H / 124);
      ox = W / 2 - ((bb.x0 + bb.x1) / 2) * scale;
      oy = H / 2 - 62 * scale + 2 * scale;
      draw();
    }
    const X = (x) => ox + x * scale, Y = (y) => oy + y * scale;
    function toLetter(ev) {
      const r = canvas.getBoundingClientRect();
      return { x: (ev.clientX - r.left - ox) / scale, y: (ev.clientY - r.top - oy) / scale };
    }
    function polyline(pts, upto) {
      g.beginPath();
      const n = upto === undefined ? pts.length - 1 : upto;
      g.moveTo(X(pts[0].x), Y(pts[0].y));
      for (let i = 1; i <= n && i < pts.length; i++) g.lineTo(X(pts[i].x), Y(pts[i].y));
    }
    function draw() {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      // Pautas do caderno
      const line = (y, c, w, dash) => {
        g.beginPath(); g.setLineDash(dash || []); g.strokeStyle = c; g.lineWidth = w;
        g.moveTo(8, Y(y)); g.lineTo(W - 8, Y(y)); g.stroke(); g.setLineDash([]);
      };
      line(15, '#d6dcf0', 2, [8, 8]);
      line(45, isLower ? '#a9b8e6' : '#e3e8f6', isLower ? 2.5 : 2, [8, 8]);
      line(90, '#7d8fc7', 3);
      line(116, '#e3e8f6', 2, [8, 8]);
      g.lineCap = 'round'; g.lineJoin = 'round';
      // Letra-guia (cinza)
      strokes.forEach(st => {
        g.strokeStyle = '#e4e8f5'; g.lineWidth = 20 * scale;
        polyline(st.pts); g.stroke();
      });
      strokes.forEach(st => {
        g.strokeStyle = '#c3cce6'; g.lineWidth = Math.max(2, 1.4 * scale);
        g.setLineDash([6, 7]); polyline(st.pts); g.stroke(); g.setLineDash([]);
      });
      // Traços prontos
      strokes.forEach((st, i) => {
        if (!doneSet.has(i)) return;
        g.strokeStyle = color; g.lineWidth = 16 * scale;
        polyline(st.pts); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 4 * scale;
        g.save(); g.translate(-1.5 * scale, -1.5 * scale); polyline(st.pts); g.stroke(); g.restore();
      });
      if (done) return;
      const st = strokes[cur];
      if (!st) return;
      // Progresso do traço atual
      const prog = demo ? demo.idx : idx;
      if (prog > 0) {
        g.strokeStyle = color; g.lineWidth = 16 * scale;
        polyline(st.pts, prog); g.stroke();
      }
      // Setinhas de direção
      if (!st.dot && !demo) {
        const step = Math.max(8, Math.round(16 / 1.5));
        for (let i = Math.max(prog, 4) + 4; i < st.pts.length - 3; i += step) {
          const a = st.pts[i], b = st.pts[Math.min(st.pts.length - 1, i + 2)];
          const ang = Math.atan2(b.y - a.y, b.x - a.x);
          g.save(); g.translate(X(a.x), Y(a.y)); g.rotate(ang);
          g.fillStyle = 'rgba(255,140,66,.9)';
          const k = scale * 3.2;
          g.beginPath(); g.moveTo(k * 1.4, 0); g.lineTo(-k, -k * 1.1); g.lineTo(-k * 0.3, 0); g.lineTo(-k, k * 1.1); g.closePath(); g.fill();
          g.restore();
        }
        // ponto final
        const e = st.pts[st.pts.length - 1];
        g.fillStyle = 'rgba(255,77,109,.85)';
        g.beginPath(); g.arc(X(e.x), Y(e.y), 3.2 * scale, 0, Math.PI * 2); g.fill();
      }
      // Bolinha verde de início (com o número do traço)
      const p0 = st.pts[Math.min(prog, st.pts.length - 1)];
      const pulse = 1 + Math.sin(performance.now() / 220) * 0.08;
      g.fillStyle = '#21c08b';
      g.beginPath(); g.arc(X(p0.x), Y(p0.y), 8.5 * scale * pulse, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.stroke();
      g.fillStyle = '#fff'; g.font = `bold ${Math.round(9 * scale)}px system-ui, sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(cur + 1), X(p0.x), Y(p0.y) + 0.5);
      // Dedo
      const f = demo ? demo.pt : finger;
      if (f) {
        g.fillStyle = off ? 'rgba(255,77,109,.35)' : 'rgba(255,210,63,.55)';
        g.beginPath(); g.arc(X(f.x), Y(f.y), 9 * scale, 0, Math.PI * 2); g.fill();
        if (demo) { g.font = `${Math.round(22 * scale)}px system-ui`; g.fillText('☝️', X(f.x) + 6 * scale, Y(f.y) + 14 * scale); }
      }
    }
    let raf = 0;
    const loop = () => { draw(); raf = requestAnimationFrame(loop); };

    function completeStroke() {
      doneSet.add(cur);
      App.fx.sfx.stroke();
      cur++; idx = 0; active = false;
      if (cur >= strokes.length) {
        done = true; finger = null;
        draw();
        resolveDone('ok');
      } else if (!saidNext && strokes.length > 1) {
        saidNext = true;
        App.voice.say('tracinho');
      }
    }
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    function hint() {
      const now = Date.now();
      if (now - lastHint > 4500) {
        lastHint = now;
        hints++;
        // Depois de três tentativas no lugar errado, mostra de novo como se faz.
        if (hints % 3 === 0 && !demo) { App.voice.say('olhaComo', { L: ch.toUpperCase(), Lshown: ch }); showDemo(); }
        else App.voice.say('comece');
      }
    }
    function down(ev) {
      if (done || demo) return;
      ev.preventDefault();
      try { canvas.setPointerCapture(ev.pointerId); } catch (e) { }
      const p = toLetter(ev);
      finger = p;
      const st = strokes[cur];
      if (st.dot) { if (dist(p, st.pts[0]) < TOL * 2) completeStroke(); else hint(); return; }
      if (dist(p, st.pts[idx]) < TOL * 1.6) { active = true; off = false; }
      else { active = false; off = true; hint(); }
    }
    function move(ev) {
      if (done || demo || !finger) return;
      ev.preventDefault();
      const p = toLetter(ev);
      finger = p;
      const st = strokes[cur];
      if (!active) {
        if (dist(p, st.pts[idx]) < TOL * 1.3) { active = true; off = false; }
        return;
      }
      let best = -1;
      for (let j = idx; j < Math.min(st.pts.length, idx + 16); j++) if (dist(p, st.pts[j]) < TOL) best = j;
      if (best > idx) { idx = best; off = false; }
      else if (dist(p, st.pts[idx]) > TOL * 2.6) off = true;
      if (idx >= st.pts.length - 2) completeStroke();
    }
    function up() { finger = null; active = false; off = false; }

    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', up);
    const ro = new ResizeObserver(() => layout());
    ro.observe(wrap);

    // Demonstração animada
    let demoRunning = false;
    async function showDemo() {
      if (demoRunning) return;
      demoRunning = true;
      const saved = { cur, idx, doneSet: new Set(doneSet), done };
      doneSet.clear(); cur = 0; idx = 0; done = false;
      for (let i = 0; i < strokes.length; i++) {
        if (!s.alive) return;
        cur = i;
        const st = strokes[i];
        const dur = st.dot ? 400 : Math.max(700, st.len * 13);
        const t0 = performance.now();
        demo = { idx: 0, pt: st.pts[0] };
        await new Promise(res => {
          const step = () => {
            if (!s.alive) return res();
            const t = Math.min(1, (performance.now() - t0) / dur);
            const k = Math.round(t * (st.pts.length - 1));
            demo.idx = k; demo.pt = st.pts[k];
            if (t >= 1) return res();
            requestAnimationFrame(step);
          };
          step();
        });
        doneSet.add(i);
        await sleep(220);
      }
      await sleep(500);
      doneSet.clear(); cur = 0; idx = 0; done = false;
      demo = null;
      demoRunning = false;
    }
    btnShow.addEventListener('click', async () => {
      if (demo) return;
      App.voice.say('olhaComo', { L: ch.toUpperCase(), Lshown: ch });
      await showDemo();
    });
    btnSkip.addEventListener('click', () => { if (done) return; done = true; finger = null; resolveDone('skip'); });
    btnClear.addEventListener('click', () => { if (demo) return; doneSet.clear(); cur = 0; idx = 0; done = false; draw(); });

    s.onEnd(() => { cancelAnimationFrame(raf); ro.disconnect(); });
    layout();
    loop();

    return {
      demo: showDemo,
      finished,
      cleanup() { cancelAnimationFrame(raf); ro.disconnect(); draw(); }
    };
  }

  // Atividade completa: mostra como, a criança traça, comemora.
  async function activity(s, parent, o) {
    const ch = o.ch;
    const L = ch.toUpperCase();
    const head = h('div', { class: 'trace-head' },
      App.strokes.el(ch, { tight: true, cls: 'mini' }),
      h('div', { class: 'trace-label' }, ch === L ? 'Letra maiúscula' : 'Letra minúscula'));
    parent.appendChild(head);
    const t = play(s, parent, { ch });
    if (o.demo !== false) {
      await s.say('olhaComo', { L, Lshown: ch });
      await s.wait(t.demo());
    }
    await s.say('suaVez');
    const r = await s.wait(t.finished);
    t.cleanup();
    if (r === 'skip') return 'ok2';
    App.store.record(L, 'tr');
    await App.ui.praise(s, parent.querySelector('.trace-wrap'), { u: App.voice.U('escreveu', { L, Lshown: ch }), big: true });
    return r;
  }

  App.trace = { play, activity };
})(window.App);
