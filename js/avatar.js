'use strict';
// =====================================================================
//  Avatar: a corujinha professora. Pisca, segue o dedo com os olhos,
//  mexe o bico no ritmo da voz, escuta com atenção e comemora.
// =====================================================================
(function (App) {
  const SVG = `
<svg class="owl" viewBox="0 0 200 230" aria-hidden="true">
  <defs>
    <radialGradient id="owlBody" cx="45%" cy="35%" r="70%">
      <stop offset="0" stop-color="#a98bff"/><stop offset="1" stop-color="#6a45e0"/>
    </radialGradient>
    <radialGradient id="owlBelly" cx="50%" cy="30%" r="75%">
      <stop offset="0" stop-color="#fff6e5"/><stop offset="1" stop-color="#ffd9a8"/>
    </radialGradient>
    <radialGradient id="owlEye" cx="40%" cy="35%" r="70%">
      <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e8ecff"/>
    </radialGradient>
  </defs>
  <ellipse class="owl-shadow" cx="100" cy="222" rx="52" ry="7" fill="rgba(40,20,90,.18)"/>
  <g class="owl-all">
    <g class="owl-wing owl-wing-l"><path d="M44 118 C16 128 14 172 40 192 C50 170 54 146 52 124 Z" fill="#5a37cf"/></g>
    <g class="owl-wing owl-wing-r"><path d="M156 118 C184 128 186 172 160 192 C150 170 146 146 148 124 Z" fill="#5a37cf"/></g>
    <path d="M100 40 C150 40 166 82 166 128 C166 178 140 210 100 210 C60 210 34 178 34 128 C34 82 50 40 100 40 Z" fill="url(#owlBody)"/>
    <path d="M52 56 L40 22 L74 46 Z" fill="#6a45e0"/><path d="M148 56 L160 22 L126 46 Z" fill="#6a45e0"/>
    <path d="M100 112 C134 112 146 138 146 162 C146 190 126 204 100 204 C74 204 54 190 54 162 C54 138 66 112 100 112 Z" fill="url(#owlBelly)"/>
    <g fill="none" stroke="#f2b874" stroke-width="3" stroke-linecap="round">
      <path d="M80 150 q6 6 12 0"/><path d="M98 150 q6 6 12 0"/><path d="M116 150 q-0 0 0 0"/>
      <path d="M88 168 q6 6 12 0"/><path d="M106 168 q6 6 12 0"/><path d="M80 186 q6 6 12 0"/><path d="M98 186 q6 6 12 0"/>
    </g>
    <circle cx="56" cy="122" r="9" fill="#ff8fb1" opacity=".55"/><circle cx="144" cy="122" r="9" fill="#ff8fb1" opacity=".55"/>
    <!-- olhos -->
    <g class="owl-eyes">
      <circle cx="70" cy="92" r="31" fill="#ffcf5c"/><circle cx="130" cy="92" r="31" fill="#ffcf5c"/>
      <circle cx="70" cy="92" r="25" fill="url(#owlEye)"/><circle cx="130" cy="92" r="25" fill="url(#owlEye)"/>
      <g class="owl-pupils">
        <circle cx="70" cy="94" r="13" fill="#2b1d4f"/><circle cx="130" cy="94" r="13" fill="#2b1d4f"/>
        <circle cx="65" cy="88" r="4.5" fill="#fff"/><circle cx="125" cy="88" r="4.5" fill="#fff"/>
        <circle cx="74" cy="99" r="2" fill="#fff" opacity=".8"/><circle cx="134" cy="99" r="2" fill="#fff" opacity=".8"/>
      </g>
      <g class="owl-happy-eyes" fill="none" stroke="#2b1d4f" stroke-width="6" stroke-linecap="round">
        <path d="M54 96 Q70 78 86 96"/><path d="M114 96 Q130 78 146 96"/>
      </g>
      <g class="owl-lids">
        <rect class="owl-lid" x="42" y="58" width="56" height="0" rx="10" fill="#7f5cf0"/>
        <rect class="owl-lid" x="102" y="58" width="56" height="0" rx="10" fill="#7f5cf0"/>
      </g>
    </g>
    <!-- bico -->
    <g class="owl-beak">
      <path class="beak-top" d="M88 112 L112 112 L100 128 Z" fill="#ff9f1c"/>
      <path class="beak-bottom" d="M91 116 L109 116 L100 126 Z" fill="#e07b00"/>
    </g>
    <!-- chapéu de formatura -->
    <g class="owl-cap">
      <path d="M62 42 L100 26 L138 42 L100 58 Z" fill="#26215a"/>
      <path d="M76 48 L76 60 C88 68 112 68 124 60 L124 48 L100 58 Z" fill="#332c74"/>
      <path class="tassel" d="M100 42 L134 48 L136 66" fill="none" stroke="#ffd23f" stroke-width="3" stroke-linecap="round"/>
      <circle class="tassel" cx="136" cy="68" r="4" fill="#ffd23f"/>
    </g>
    <!-- pés -->
    <g fill="#ff9f1c"><path d="M76 206 l-8 12 h20 z"/><path d="M124 206 l-8 12 h20 z"/></g>
    <!-- orelha de escuta -->
    <g class="owl-listen"><circle cx="172" cy="80" r="14" fill="#3bceac"/><path d="M166 80 a6 6 0 0 1 12 0 v4 a4 4 0 0 1 -8 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g>
  </g>
</svg>`;

  // ---------- Robô 3D: corpo renderizado no Blender + rosto animado por cima da tela ----------
  const FACE = `
<svg class="robo-face" viewBox="0 0 100 70" preserveAspectRatio="none" aria-hidden="true">
  <g class="rf-eyes" fill="#6ff3ff">
    <g class="rf-pupils">
      <rect class="rf-eye" x="20" y="14" width="18" height="26" rx="9"/>
      <rect class="rf-eye" x="62" y="14" width="18" height="26" rx="9"/>
      <circle cx="26" cy="21" r="3" fill="#fff"/><circle cx="68" cy="21" r="3" fill="#fff"/>
    </g>
    <g class="rf-happy" fill="none" stroke="#6ff3ff" stroke-width="6" stroke-linecap="round">
      <path d="M18 34 Q29 14 40 34"/><path d="M60 34 Q71 14 82 34"/>
    </g>
  </g>
  <path class="rf-smile" d="M36 52 Q50 62 64 52" fill="none" stroke="#6ff3ff" stroke-width="5" stroke-linecap="round"/>
  <rect class="rf-mouth" x="38" y="50" width="24" height="0" rx="5" fill="#6ff3ff"/>
  <g class="rf-cheeks" fill="#ff8fb1" opacity=".7"><circle cx="13" cy="46" r="5"/><circle cx="87" cy="46" r="5"/></g>
</svg>`;
  const POSES = ['idle', 'happy', 'listen'];

  let kind = 'coruja';
  let root = null, pupils = null, lids = null, beakB = null, eyes = null, mouthEl = null, poseImgs = {};
  let state = 'idle';
  let bound = false, blinkOn = false;

  function mountOwl(container) {
    kind = 'coruja';
    container.innerHTML = SVG;
    root = container.querySelector('.owl');
    pupils = root.querySelector('.owl-pupils');
    lids = [...root.querySelectorAll('.owl-lid')];
    beakB = root.querySelector('.beak-bottom');
  }
  function mountRobot(container) {
    kind = 'robo';
    const m = (App.assetMeta && App.assetMeta.robo && App.assetMeta.robo.screen) || { x: 0.3, y: 0.2, w: 0.4, h: 0.2 };
    container.innerHTML = '<div class="robo">' +
      POSES.map(p => '<img class="robo-img' + (p === 'idle' ? ' on' : '') + '" data-pose="' + p + '" src="assets/3d/avatar/robo_' + p + '.png" alt="" draggable="false">').join('') +
      FACE + '</div>';
    root = container.querySelector('.robo');
    const face = root.querySelector('.robo-face');
    face.style.left = (m.x * 100) + '%'; face.style.top = (m.y * 100) + '%';
    face.style.width = (m.w * 100) + '%'; face.style.height = (m.h * 100) + '%';
    pupils = root.querySelector('.rf-pupils');
    eyes = [...root.querySelectorAll('.rf-eye')];
    mouthEl = root.querySelector('.rf-mouth');
    poseImgs = {};
    root.querySelectorAll('.robo-img').forEach(i => { poseImgs[i.dataset.pose] = i; });
    // Sem as imagens 3D, usa a corujinha.
    const mine = root;
    poseImgs.idle.addEventListener('error', () => { if (root === mine) mountOwl(container); });
  }
  // ---------- Tico animado: quadros renderizados no Blender (uma folha por animação) ----------
  //  idle (parado) · wave (acenar) · talk (falar) · listen (ouvir) · happy (pular) · dance (dançar) · fly (voar)
  const T = { sheets: {}, meta: null, cv: null, ctx: null, face: null, anim: 'idle', frame: 0, base: 'idle', shot: null, prev: null, fade: 0, speaking: false, last: 0, raf: 0 };
  function ticoSheet(name) {
    if (!T.sheets[name]) { const i = new Image(); i.src = 'assets/3d/avatar/tico_' + name + '.webp'; T.sheets[name] = i; }
    return T.sheets[name];
  }
  function mountTico(container) {
    kind = 'tico';
    const m = T.meta = App.assetMeta.tico;
    container.innerHTML = '<div class="robo tico"><span class="tico-glow"></span><canvas class="tico-cv" width="' + m.w + '" height="' + m.h + '"></canvas>' + FACE + '</div>';
    root = container.querySelector('.robo');
    T.cv = root.querySelector('canvas'); T.ctx = T.cv.getContext('2d'); T.face = root.querySelector('.robo-face');
    pupils = root.querySelector('.rf-pupils');
    eyes = [...root.querySelectorAll('.rf-eye')];
    mouthEl = root.querySelector('.rf-mouth');
    T.base = container.id === 'splashAvatar' ? 'fly' : 'idle';
    T.anim = T.base; T.frame = 0; T.shot = null; T.prev = null; T.fade = 0; T.speaking = false;
    // Sem as folhas do Tico, usa o robô parado (ou a corujinha).
    const mine = root, first = ticoSheet(T.base);
    first.addEventListener('error', () => { if (root === mine) { if (App.assetMeta.robo) mountRobot(container); else mountOwl(container); } });
    first.addEventListener('load', () => { if (root === mine) ticoDraw(); });
    if (T.base === 'idle') ticoPlay('wave');
    setTimeout(() => Object.keys(m.anims).forEach(ticoSheet), 500);
    if (!T.raf) T.raf = requestAnimationFrame(ticoTick);
    ticoDraw();
  }
  function ticoWant() {
    if (T.shot) return T.shot;
    if (root._happyUntil > Date.now()) return 'dance';
    if (state === 'listen') return 'listen';
    if (T.speaking || state === 'talk') return 'talk';
    return T.base;
  }
  function ticoGo(name) {
    if (name === T.anim) return;
    T.prev = { anim: T.anim, frame: T.frame }; T.fade = 3; T.anim = name; T.frame = 0;
  }
  function ticoPlay(name) {
    if (kind !== 'tico' || !T.meta.anims[name]) return;
    T.shot = name;
    if (T.anim === name) T.frame = 0; else ticoGo(name);
  }
  function ticoTick(t) {
    T.raf = requestAnimationFrame(ticoTick);
    if (kind !== 'tico' || !root || !root.isConnected) return;
    const step = 1000 / T.meta.fps;
    if (t - T.last < step) return;
    T.last = t - T.last > step * 3 ? t : T.last + step;
    const a = T.meta.anims[T.anim];
    T.frame++;
    if (T.frame >= a.n) {
      if (a.loop && !T.shot) T.frame = 0; else { T.frame = a.n - 1; T.shot = null; }
    }
    const want = ticoWant();
    if (want !== T.anim) ticoGo(want);
    if (T.fade > 0) T.fade--;
    ticoDraw();
  }
  function ticoDraw() {
    const m = T.meta, c = T.ctx, img = ticoSheet(T.anim);
    // rosto acompanha a cabeça (3 cantos da tela projetados em cada quadro)
    const f = m.anims[T.anim].face[T.frame], cw = root.clientWidth, ch = root.clientHeight;
    if (f && cw) {
      T.face.style.transform = 'matrix(' + [(f[2] - f[0]) * cw / 100, (f[3] - f[1]) * ch / 100, (f[4] - f[0]) * cw / 70, (f[5] - f[1]) * ch / 70, f[0] * cw, f[1] * ch].map(v => v.toFixed(3)).join(',') + ')';
    }
    if (!img.complete || !img.naturalWidth) return;
    const put = (anim, fr, alpha) => {
      const im = ticoSheet(anim);
      if (!im.complete || !im.naturalWidth) return;
      c.globalAlpha = alpha;
      c.drawImage(im, (fr % m.cols) * m.w, Math.floor(fr / m.cols) * m.h, m.w, m.h, 0, 0, m.w, m.h);
    };
    c.clearRect(0, 0, m.w, m.h);
    const k = T.fade / 3;
    if (T.prev && k > 0) put(T.prev.anim, T.prev.frame, Math.min(1, k * 2));
    put(T.anim, T.frame, 1 - k);
    c.globalAlpha = 1;
  }

  function mount(container) {
    const want = App.store.settings.avatarTipo === 'coruja' ? 'coruja' : 'robo';
    const has3d = App.assetMeta && App.assetMeta.robo;
    if (want === 'robo' && App.assetMeta && App.assetMeta.tico) mountTico(container);
    else if (want === 'robo' && has3d) mountRobot(container); else mountOwl(container);
    state = 'idle';
    if (!blinkOn) { blinkOn = true; blinkLoop(); }
    if (!bound) {
      bound = true;
      document.addEventListener('pointermove', look, { passive: true });
      document.addEventListener('pointerdown', look, { passive: true });
    }
  }
  function look(ev) {
    if (!root || !pupils) return;
    const r = root.getBoundingClientRect();
    if (!r.width) return;
    const cx = r.left + r.width / 2, cy = r.top + r.height * 0.35;
    const dx = ev.clientX - cx, dy = ev.clientY - cy;
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / 300) * (kind !== 'coruja' ? 5 : 7);
    pupils.setAttribute('transform', 'translate(' + (dx / d * k).toFixed(1) + ' ' + (dy / d * k).toFixed(1) + ')');
  }
  function lookAt(el) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    look({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
  }
  function blink() {
    if (!root) return;
    if (kind !== 'coruja') {
      const es = eyes;
      es.forEach(e => { e.setAttribute('height', '4'); e.setAttribute('y', '25'); });
      setTimeout(() => es.forEach(e => { e.setAttribute('height', '26'); e.setAttribute('y', '14'); }), 130);
    } else if (lids) {
      const ls = lids;
      ls.forEach(l => l.setAttribute('height', '68'));
      setTimeout(() => ls.forEach(l => l.setAttribute('height', '0')), 130);
    }
  }
  function blinkLoop() {
    setTimeout(() => { if (state !== 'happy') blink(); blinkLoop(); }, 2200 + Math.random() * 3200);
  }
  function pose(p) {
    if (kind !== 'robo') return;
    POSES.forEach(k => poseImgs[k] && poseImgs[k].classList.toggle('on', k === p));
  }
  function set(s) {
    if (!root) return;
    if (state === 'happy' && s === 'idle' && root._happyUntil > Date.now()) return;
    state = s;
    root.classList.remove('is-talk', 'is-listen', 'is-happy', 'is-think');
    if (s !== 'idle') root.classList.add('is-' + s);
    pose(s === 'listen' ? 'listen' : s === 'happy' ? 'happy' : 'idle');
  }
  function happy(ms) {
    if (!root) return;
    const r = root;
    r._happyUntil = Date.now() + (ms || 1800);
    r.classList.add('is-happy');
    state = 'happy';
    pose('happy');
    ticoPlay('happy');
    setTimeout(() => {
      if (r._happyUntil > Date.now()) return;
      r.classList.remove('is-happy');
      if (state === 'happy') { state = 'idle'; if (r === root) pose('idle'); }
    }, (ms || 1800) + 50);
  }
  function talking(on) {
    if (!root) return;
    root.classList.toggle('is-speaking', !!on);
    T.speaking = !!on;
  }
  // Abre a boca conforme o volume (0..1)
  function mouth(v) {
    if (!root) return;
    root.classList.toggle('lip-sync', v > 0.001);
    if (kind !== 'coruja') {
      const hgt = Math.min(16, v * 20);
      mouthEl.setAttribute('height', hgt.toFixed(1));
      mouthEl.setAttribute('y', (56 - hgt / 2).toFixed(1));
    } else if (beakB) beakB.setAttribute('transform', 'translate(0 ' + (v * 9).toFixed(1) + ')');
  }

  App.avatar = { mount, set, happy, talking, mouth, blink, lookAt, play: ticoPlay, kind: () => kind };
})(window.App);
