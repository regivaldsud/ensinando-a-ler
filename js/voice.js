'use strict';
// =====================================================================
//  Voz do avatar: fala (gravações > voz natural > voz do navegador)
//  e escuta (reconhecimento de voz do navegador, em português).
// =====================================================================
(function (App) {
  const D = App.data, U_ = App.util;
  const st = () => App.store.settings;

  // ---------- Montagem das falas ----------
  // Uma fala vira partes: trechos fixos e marcadores ({L}, {W}, {nome}...).
  // Cada parte tem uma chave — é por ela que os pais podem gravar a própria voz.
  function partFor(name, vars) {
    const s = st();
    switch (name) {
      case 'nome': return { k: 'nome', text: s.nome, tts: s.nome };
      case 'avatar': return { k: 'avatar', text: s.avatar, tts: s.avatar };
      case 'L': case 'X': case 'C': case 'V': {
        const L = String(vars[name] || '').toUpperCase();
        return { k: 'letra_' + L, text: vars[name + 'shown'] || L, tts: D.NAMES[L] || L, ttsN: D.NAMES_NEURAL[L] || D.NAMES[L] || L };
      }
      case 'W': {
        const w = D.word(vars.W);
        return { k: 'palavra_' + w[0], text: w[0], tts: w[1] };
      }
      case 'S': {
        const S = String(vars.S).toUpperCase();
        const sy = D.syllable(S[0], S[1]);
        return { k: 'silaba_' + S, text: S, tts: sy.t };
      }
    }
    return { k: null, text: '', tts: '' };
  }
  function U(key, vars) {
    vars = vars || {};
    const ph = D.PH[key];
    if (!ph) return { key, parts: [{ k: null, text: key, tts: key }], text: key, tts: key };
    // {menino} segue a criança; {orgulhosa}/{art}/{amiga} seguem a voz escolhida (feminina ou masculina).
    const fv = App.neural.isFem(App.neural.PERSONAS[st().voz] || App.neural.PERSONAS.dora);
    const tpl = ph.t.replace(/\{menino\}/g, st().genero === 'f' ? 'menina' : 'menino')
      .replace(/um ótimo menina/g, 'uma ótima menina')
      .replace(/\{orgulhosa\}/g, fv ? 'orgulhosa' : 'orgulhoso')
      .replace(/\{art\}/g, fv ? 'a' : 'o')
      .replace(/\{amiga\}/g, fv ? 'sua amiga' : 'seu amigo');
    const parts = [];
    let i = 0, idx = 0;
    const re = /\{(nome|avatar|L|X|W|S|C|V)\}/g;
    let m;
    while ((m = re.exec(tpl))) {
      if (m.index > i) { const t = tpl.slice(i, m.index); parts.push({ k: key + '.' + idx, text: t, tts: t }); }
      idx++;
      parts.push(partFor(m[1], vars));
      idx++;
      i = re.lastIndex;
    }
    if (i < tpl.length) { const t = tpl.slice(i); parts.push({ k: key + '.' + idx, text: t, tts: t }); }
    return {
      key, vars, parts,
      text: parts.map(p => p.text).join(''),
      tts: parts.map(p => p.tts).join(''),
      ttsN: parts.map(p => p.ttsN || p.tts).join('') // texto para as vozes naturais
    };
  }
  const hasWords = (t) => /[a-zà-ú0-9]/i.test(t || '');

  // ---------- Gravações dos pais (por chave) ----------
  let clipKeys = new Set();
  const clipBuf = new Map(); // chave -> AudioBuffer decodificado
  async function loadClipKeys() {
    try { clipKeys = new Set(await App.store.idb.keys('clips')); } catch (e) { clipKeys = new Set(); }
  }
  async function setClip(k, blob, name) {
    await App.store.idb.put('clips', k, { blob, name: name || '', at: Date.now() });
    clipKeys.add(k); clipBuf.delete(k);
  }
  async function delClip(k) { await App.store.idb.del('clips', k); clipKeys.delete(k); clipBuf.delete(k); }
  async function clipAudio(k) {
    if (clipBuf.has(k)) return clipBuf.get(k);
    const rec = await App.store.idb.get('clips', k);
    if (!rec || !rec.blob) return null;
    const ab = await rec.blob.arrayBuffer();
    const buf = await App.fx.ctx().decodeAudioData(ab);
    clipBuf.set(k, buf);
    return buf;
  }

  // ---------- Escolha do motor ----------
  const voiceId = () => (App.neural.PERSONAS[st().voz] ? st().voz : 'dora');
  const persona = () => App.neural.PERSONAS[voiceId()];
  // Voz feminina boa no navegador (Edge "Online/Natural", Google)? A "Maria" antiga do Windows não conta.
  function goodBrowserFemale() {
    return browserVoices().some(v => FEM.test(v.name) && /natural|neural|online|google/i.test(v.name));
  }
  function engine() {
    const s = st(), N = App.neural, p = persona(), id = voiceId();
    if (s.motor === 'navegador') return { e: 'browser', p, id };
    if (s.motor !== 'piper' && N.ready('kokoro')) return { e: 'kokoro', v: id, p, id };
    if (s.motor !== 'kokoro' && N.ready('piper', p.piper[0])) {
      // Sem Kokoro, voz feminina: prefere uma voz feminina natural do navegador, se existir.
      if (N.isFem(p) && s.motor !== 'piper' && goodBrowserFemale()) return { e: 'browser', p, id };
      return { e: 'piper', v: p.piper[0], p, id };
    }
    return { e: 'browser', p, id };
  }
  // Liga as vozes naturais ao abrir (baixa na primeira vez, como no jogo de xadrez).
  //  Computador com placa de vídeo -> Kokoro. Celular ou sem WebGPU -> Piper (mais leve).
  //  Em rede de dados móveis ou com "economia de dados", só baixa se os pais mandarem.
  let starting = null;
  function autoStart(force) {
    const run = (async () => {
      const s = st(), N = App.neural, p = persona();
      if (s.motor === 'navegador') return;
      try {
        const conn = navigator.connection || {};
        const metered = !force && s.motor === 'auto' && (conn.saveData || conn.type === 'cellular');
        const small = window.matchMedia && matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;
        const kCached = N.hasWebGPU() ? await N.kokoroCached() : false;
        const wantK = N.hasWebGPU() && (s.motor === 'kokoro' || (s.motor === 'auto' && (!small || kCached)));
        if (wantK && (kCached || !metered)) { if (await N.loadKokoro()) return; }
        if (s.motor === 'kokoro') return;
        if (!metered || await N.piperCached(p.piper[0])) await N.loadPiper(p.piper[0]);
      } catch (e) { console.warn(e); }
    })();
    starting = run;
    return run;
  }

  // ---------- Cache das falas geradas ----------
  const pcmMem = new Map();
  const speedOf = () => Math.max(0.6, Math.min(1.3, st().velocidade || 0.92));
  const playRate = () => 1 + ((st().tom || 1) - 1) * 0.45;
  // Tom próprio de cada voz (aceleração ao tocar)
  const voicePlay = (eng) => eng.e === 'kokoro' ? (eng.p.play || 1) : 1 + (eng.p.piper[1] - 1) * 0.45;
  const pcmKey = (eng, text) => eng.e + '|' + eng.id + '|' + eng.v + '|' + speedOf().toFixed(2) + '|' + text;
  function toI16(f32) {
    const o = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) { const v = Math.max(-1, Math.min(1, f32[i])); o[i] = v * 32767; }
    return o;
  }
  function toF32(i16) {
    const o = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) o[i] = i16[i] / 32767;
    return o;
  }
  async function getPcm(eng, text, generate) {
    const key = pcmKey(eng, text);
    if (pcmMem.has(key)) return pcmMem.get(key);
    try {
      const rec = await App.store.idb.get('pcm', key);
      if (rec && rec.d) {
        const r = { pcm: toF32(new Int16Array(rec.d)), rate: rec.r };
        pcmMem.set(key, r);
        if (pcmMem.size > 300) pcmMem.delete(pcmMem.keys().next().value);
        return r;
      }
    } catch (e) { }
    if (!generate) return null;
    const job = eng.e === 'kokoro'
      ? App.neural.synth('kokoro', eng.v, text, speedOf() * (eng.p.spd || 1))
      : App.neural.synth('piper', eng.v, text, speedOf() * (eng.p.piper[2] || 1), voicePlay(eng));
    // Se a voz natural travar (placa de vídeo dormindo), desiste em 12 s e a voz do navegador assume
    const r = await Promise.race([job, new Promise((_, rej) => setTimeout(() => rej(new Error('voz natural demorou')), 12000))]);
    const out = { pcm: r.pcm instanceof Float32Array ? r.pcm : Float32Array.from(r.pcm), rate: r.rate };
    pcmMem.set(key, out);
    if (pcmMem.size > 300) pcmMem.delete(pcmMem.keys().next().value);
    App.store.idb.put('pcm', key, { r: out.rate, d: toI16(out.pcm).buffer }).catch(() => { });
    return out;
  }

  // ---------- Tocar ----------
  let token = 0;
  let current = null; // fonte de áudio tocando
  let busy = 0;
  function playBuffer(buf, rate, myTok) {
    return new Promise(res => {
      if (myTok !== token) return res();
      const c = App.fx.ctx();
      const src = c.createBufferSource();
      src.buffer = buf; src.playbackRate.value = rate || 1;
      const an = c.createAnalyser(); an.fftSize = 512;
      const g = c.createGain(); g.gain.value = 1;
      src.connect(an); an.connect(g); g.connect(c.destination);
      const data = new Uint8Array(an.fftSize);
      let raf = 0;
      const lip = () => {
        an.getByteTimeDomainData(data);
        let sum = 0; for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
        App.avatar.mouth(Math.min(1, Math.sqrt(sum / data.length) * 5));
        raf = requestAnimationFrame(lip);
      };
      const done = () => { cancelAnimationFrame(raf); App.avatar.mouth(0); if (current === src) current = null; res(); };
      src.onended = done;
      // Se o áudio travar (aba em segundo plano, placa de vídeo dormindo), não prende o jogo
      setTimeout(done, (buf.duration / (rate || 1)) * 1000 + 1500);
      current = src;
      try { src.start(); lip(); } catch (e) { done(); }
    });
  }
  function playPcm(r, myTok, eng) {
    const c = App.fx.ctx();
    const buf = c.createBuffer(1, r.pcm.length, r.rate);
    buf.copyToChannel(r.pcm, 0);
    return playBuffer(buf, playRate() * (eng ? voicePlay(eng) : 1), myTok);
  }

  // Voz do navegador
  function browserVoices() {
    return ('speechSynthesis' in window) ? speechSynthesis.getVoices().filter(v => /^pt(?:[-_]|$)/i.test(v.lang)) : [];
  }
  const FEM = /francisca|thalita|maria|luciana|fernanda|helena|female|feminin|yara|leticia|camila|giovanna|vitoria|brenda|raquel|manuela|elza|ana\b/i;
  const MAS = /antonio|daniel|ricardo|male|masculin|donato|fabio|humberto|julio|valerio|felipe|jorge|rafael|nicolau/i;
  // Voz do navegador que mais combina com a voz escolhida (feminina ou masculina).
  function bestBrowserVoice(p) {
    const vs = browserVoices();
    if (!vs.length) return null;
    p = p || persona();
    const want = st().vozNavegador;
    if (want) { const v = vs.find(x => x.voiceURI === want); if (v) return v; }
    const score = v => (/^pt[-_]br/i.test(v.lang) ? 20 : 0) + (/natural|neural|online/i.test(v.name) ? 14 : 0) + (/google/i.test(v.name) ? 8 : 0);
    const fem = vs.filter(v => FEM.test(v.name));
    const mas = vs.filter(v => MAS.test(v.name) && !FEM.test(v.name));
    const notFem = vs.filter(v => !FEM.test(v.name));
    const female = App.neural.isFem(p);
    const pool = female ? (fem.length ? fem : vs) : (mas.length ? mas : (notFem.length ? notFem : vs));
    const ranked = pool.slice().sort((a, b) => score(b) - score(a));
    const top = ranked.filter(v => score(v) === score(ranked[0]));
    const order = Object.keys(App.neural.PERSONAS).filter(k => App.neural.isFem(App.neural.PERSONAS[k]) === female);
    return top[Math.max(0, order.indexOf(voiceId())) % top.length];
  }
  function speakBrowser(text, myTok) {
    return new Promise(res => {
      if (!('speechSynthesis' in window) || myTok !== token) return res();
      const u = new SpeechSynthesisUtterance(text);
      const p = persona();
      const v = bestBrowserVoice(p);
      if (v) u.voice = v;
      u.lang = v ? v.lang : 'pt-BR';
      u.rate = Math.max(0.6, Math.min(1.3, (st().velocidade || 0.92) * (p.spd || 1)));
      u.pitch = Math.max(0.5, Math.min(2, (st().tom || 1) * (p.bp || 1)));
      let fin = false;
      const done = () => { if (fin) return; fin = true; clearTimeout(wd); App.avatar.talking(false); res(); };
      // O Chrome às vezes não avisa que terminou: um vigia libera depois de um tempo.
      const wd = setTimeout(done, 2500 + text.length * 110);
      u.onend = done; u.onerror = done;
      u.onstart = () => App.avatar.talking(true);
      try { speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { done(); }
    });
  }

  async function ttsPart(text, myTok, textN) {
    text = (text || '').trim();
    if (!hasWords(text) || myTok !== token) return;
    const eng = engine();
    if (eng.e !== 'browser') {
      try {
        busy++;
        const r = await getPcm(eng, (textN || text).trim(), true);
        busy--;
        if (myTok !== token) return;
        App.avatar.talking(true);
        await playPcm(r, myTok, eng);
        App.avatar.talking(false);
        return;
      } catch (e) { busy = Math.max(0, busy - 1); console.warn('voz natural falhou, usando a do navegador', e); }
    }
    await speakBrowser(text, myTok);
  }

  // Fala uma frase pronta (resultado de U()).
  async function speak(u, opts) {
    opts = opts || {};
    const myTok = ++token;
    stopAudio();
    App.voice.lastU = u;
    if (!opts.silentBubble) App.ui.bubble(u.text);
    App.avatar.set('talk');
    try {
      const recorded = u.parts.some(p => p.k && clipKeys.has(p.k));
      if (!recorded) await ttsPart(u.tts, myTok, u.ttsN);
      else {
        for (const p of u.parts) {
          if (myTok !== token) break;
          if (p.k && clipKeys.has(p.k)) {
            try {
              const buf = await clipAudio(p.k);
              if (buf) { App.avatar.talking(true); await playBuffer(buf, 1, myTok); App.avatar.talking(false); continue; }
            } catch (e) { console.warn('gravação falhou', p.k, e); }
          }
          await ttsPart(p.tts, myTok, p.ttsN);
        }
      }
    } finally {
      if (myTok === token) { App.avatar.talking(false); App.avatar.set('idle'); }
    }
    pump();
  }
  const say = (key, vars, opts) => speak(U(key, vars), opts);

  function stopAudio() {
    if (current) { try { current.onended && current.onended(); current.stop(); } catch (e) { } current = null; }
    if ('speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch (e) { } }
  }
  function stop() { token++; stopAudio(); App.avatar.talking(false); stopListening(); }

  // ---------- Preparar falas com antecedência ----------
  let pre = [];
  let pumping = false;
  function prefetch(list) {
    const eng = engine();
    if (eng.e === 'browser') return;
    list.forEach(u => {
      if (!u) return;
      const has = u.parts.some(p => p.k && clipKeys.has(p.k));
      if (has) return;
      pre.push((u.ttsN || u.tts).trim());
    });
    pre = [...new Set(pre)].slice(-40);
    pump();
  }
  async function pump() {
    if (pumping) return;
    pumping = true;
    try {
      while (pre.length) {
        if (busy) { await U_.sleep(300); continue; }
        const eng = engine();
        if (eng.e === 'browser') { pre = []; break; }
        const t = pre.shift();
        try { await getPcm(eng, t, true); } catch (e) { break; }
      }
    } finally { pumping = false; }
  }

  // Todas as falas possíveis do aplicativo (para gerar tudo de uma vez).
  function catalog() {
    const out = [];
    const words = D.allWords();
    const syl = D.syllables();
    for (const key in D.PH) {
      const e = D.PH[key].each;
      if (!e) out.push(U(key));
      else if (e === 'L') D.ALPHABET.forEach(L => out.push(U(key, { L })));
      else if (e === 'LW') D.ALPHABET.forEach(L => D.WORDS[L].forEach(w => out.push(U(key, { L, W: w[0] }))));
      else if (e === 'W') words.forEach(w => out.push(U(key, { W: w[0] })));
      else if (e === 'WL') words.forEach(w => out.push(U(key, { W: w[0], L: U_.norm(w[0])[0].toUpperCase() })));
      else if (e === 'S') syl.forEach(s => out.push(U(key, { S: s.s })));
      else if (e === 'CVS') syl.forEach(s => out.push(U(key, { C: s.c, V: s.v, S: s.s })));
    }
    return out;
  }
  // Partes que os pais podem gravar (sem repetir).
  function recordable() {
    const map = new Map();
    const add = (k, text, group) => { if (k && hasWords(text) && !map.has(k)) map.set(k, { k, text: text.trim(), group }); };
    add('nome', st().nome, 'Nomes');
    add('avatar', st().avatar, 'Nomes');
    for (const key in D.PH) {
      const u = U(key, { L: 'A', X: 'A', W: 'BOLA', S: 'BA', C: 'B', V: 'A' });
      u.parts.forEach(p => { if (p.k && p.k.startsWith(key + '.')) add(p.k, p.text, 'Frases'); });
    }
    D.ALPHABET.forEach(L => add('letra_' + L, L + ' (' + D.NAMES[L] + ')', 'Letras'));
    D.allWords().forEach(w => add('palavra_' + w[0], w[0], 'Palavras'));
    D.syllables().forEach(s => add('silaba_' + s.s, s.s, 'Sílabas'));
    return [...map.values()];
  }
  let prepRun = 0;
  async function prepareAll(onProgress) {
    const eng = engine();
    if (eng.e === 'browser') throw new Error('Ligue primeiro uma voz natural (Kokoro ou Piper).');
    const run = ++prepRun;
    const texts = [...new Set(catalog().map(u => (u.ttsN || u.tts).trim()).filter(hasWords))];
    let done = 0;
    for (const t of texts) {
      if (run !== prepRun) return { cancelled: true, done, total: texts.length };
      try { busy++; await getPcm(eng, t, true); } catch (e) { console.warn(e); } finally { busy--; }
      done++; onProgress && onProgress(done, texts.length);
    }
    return { done, total: texts.length };
  }
  function cancelPrepare() { prepRun++; }

  // ---------- Escutar (reconhecimento de voz) ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, denied = false, srBroken = false;
  function canListen() { return !!SR && st().microfone && !denied && !srBroken; }
  function stopListening() { if (rec) { try { rec.abort(); } catch (e) { } rec = null; } App.ui.mic(false); }
  function listen(opts) {
    opts = opts || {};
    const ms = opts.ms || 6500;
    return new Promise(res => {
      if (!canListen()) return res({ supported: false, heard: [] });
      stopListening();
      let r;
      try { r = new SR(); } catch (e) { srBroken = true; return res({ supported: false, heard: [] }); }
      rec = r;
      r.lang = 'pt-BR'; r.interimResults = true; r.maxAlternatives = 5; r.continuous = false;
      const finals = []; let interim = ''; let fin = false; let error = '';
      const finish = () => {
        if (fin) return; fin = true;
        clearTimeout(t1); clearTimeout(t2);
        const mine = rec === r || rec === null;   // um reconhecedor antigo não apaga o aviso do novo
        if (rec === r) rec = null;
        if (mine) { App.ui.mic(false); App.avatar.set('idle'); }
        const heard = finals.length ? finals : (interim ? [interim] : []);
        res({ supported: !denied && !srBroken, heard, error });
      };
      r.onresult = (ev) => {
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const R = ev.results[i];
          if (R.isFinal) { for (let j = 0; j < R.length; j++) finals.push(R[j].transcript); }
          else interim = R[0].transcript;
        }
        const show = finals[0] || interim;
        if (show) App.ui.heard(show);
        if (finals.length) { try { r.stop(); } catch (e) { } }
      };
      r.onerror = (ev) => {
        error = ev.error || 'erro';
        if (error === 'not-allowed' || error === 'service-not-allowed') denied = true;
        // Sem internet ou sem microfone: desliga a escuta e deixa os botões assumirem
        if (error === 'language-not-supported' || error === 'network' || error === 'audio-capture') srBroken = true;
        finish();
      };
      r.onend = finish;
      const t1 = setTimeout(() => { try { r.stop(); } catch (e) { } }, ms);
      const t2 = setTimeout(finish, ms + 2500);
      try {
        r.start();
        App.ui.mic(true);
        App.avatar.set('listen');
      } catch (e) { error = 'start'; finish(); }
    });
  }

  // ---------- Conferir a resposta ----------
  const ARTICLES = new Set(['a', 'o', 'e', 'é', 'letra', 'eh', 'um', 'uma', 'de', 'do', 'da', 'é', 'isso', 'ai', 'essa', 'esse', 'e a', 'e o']);
  function letterOf(token) {
    for (const L of D.ALPHABET) if (D.HEARD[L].includes(token)) return L;
    return null;
  }
  function matchLetter(heard, L) {
    L = L.toUpperCase();
    let other = null;
    for (const alt of heard) {
      const n = U_.norm(alt);
      if (!n) continue;
      const toks = n.split(' ');
      if (toks.some(t => D.HEARD[L].includes(t)) || D.HEARD[L].includes(n.replace(/ /g, ''))) return { ok: true };
      if (!other) {
        const meaningful = toks.filter(t => !ARTICLES.has(t));
        for (const t of (meaningful.length ? meaningful : toks)) { const x = letterOf(t); if (x && x !== L) { other = x; break; } }
      }
    }
    return { ok: false, other, any: heard.some(h => U_.norm(h)) };
  }
  function lev(a, b) {
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    const d = Array.from({ length: m + 1 }, (_, i) => [i]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }
  // Trocar R por L (rato -> lato) nunca é perdoado: é justamente o que o treino do R precisa perceber.
  const swapRL = (k, t) => k !== t && ((k.length === t.length && k.replace(/l/g, 'r') === t.replace(/l/g, 'r')) || (t.includes('r') && k === t.replace(/r/g, '')));   // também não perdoa engolir o R (prato -> pato)
  function matchText(heard, target) {
    const t = U_.norm(target);
    for (const alt of heard) {
      const n = U_.norm(alt);
      if (!n) continue;
      if (n.includes(t)) return { ok: true };
      const toks = n.split(' ');
      if (toks.some(k => swapRL(k, t))) continue;
      for (const k of toks) {
        if (k.startsWith(t) || k === t + 'h') return { ok: true };
        if (t.length <= 3 && k[0] === t[0] && lev(k, t) <= 1) return { ok: true };
        if (t.length > 3 && lev(k, t) <= Math.floor(t.length / 4)) return { ok: true };
      }
      if (lev(n.replace(/ /g, ''), t) <= Math.max(1, Math.floor(t.length / 4))) return { ok: true };
    }
    return { ok: false, any: heard.some(h => U_.norm(h)) };
  }

  function engineLabel() {
    const e = engine();
    if (e.e === 'kokoro') return e.p.name + ' · voz natural (Kokoro)';
    if (e.e === 'piper') return e.p.name + ' · voz natural (Piper ' + App.neural.P.voices[e.v].name + ')';
    const v = bestBrowserVoice();
    return e.p.name + ' · voz do navegador' + (v ? ' (' + v.name + ')' : '');
  }

  if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = () => { };
    speechSynthesis.getVoices();
  }

  App.voice = {
    U, say, speak, stop, listen, stopListening, canListen, matchLetter, matchText, prefetch,
    catalog, recordable, prepareAll, cancelPrepare, engine, engineLabel, autoStart, persona, voiceId,
    browserVoices, bestBrowserVoice, loadClipKeys, setClip, delClip, clipAudio,
    hasClip: (k) => clipKeys.has(k), clipCount: () => clipKeys.size,
    isDenied: () => denied, hasSR: () => !!SR
  };
})(window.App);
