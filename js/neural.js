'use strict';
// =====================================================================
//  Vozes naturais (redes neurais que rodam no próprio aparelho)
//  — o mesmo motor do "Xadrez de Bolso 3D":
//   1) Kokoro: voz feminina brasileira "Dora" (placa de vídeo, WebGPU)
//   2) Piper: vozes brasileiras Faber / Cadu / Jeff (processador)
//  Os arquivos dos modelos ficam guardados no IndexedDB "xadrez-piper",
//  o mesmo do jogo de xadrez: aberto direto do disco no mesmo navegador,
//  o que o xadrez já baixou é reaproveitado e não baixa de novo.
//  O texto é convertido em voz aqui mesmo — nada é enviado para fora.
// =====================================================================
(function (App) {
  const N = {
    ort: 'https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.22.0/',
    phon: 'https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.5/dist/piper-o91UDS6e.js',
    phonBase: 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize',
    db: null, base: null, create: null, wasm: null, data: null, chain: Promise.resolve()
  };
  const listeners = new Set();
  function notify() { listeners.forEach(f => { try { f(); } catch (e) { } }); }

  function loadScript(src) {
    return new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = src; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = ok; s.onerror = () => fail(new Error('não carregou ' + src));
      document.head.appendChild(s);
    });
  }

  // ---- Cache dos arquivos (mesmo formato do jogo de xadrez) ----
  function fileDb() {
    if (!N.db) N.db = App.store.openDb('xadrez-piper', 1, ['files']);
    return N.db;
  }
  async function fstore(mode, url, buf) {
    const db = await fileDb();
    return new Promise((ok, fail) => {
      const tx = db.transaction('files', mode), os = tx.objectStore('files');
      const rq = mode === 'readonly' ? os.get(url) : os.put(buf, url);
      tx.oncomplete = () => ok(rq.result);
      tx.onerror = tx.onabort = () => fail(tx.error);
    });
  }
  const CHUNK = 64 * 1024 * 1024;
  async function fget(url) {
    const v = await fstore('readonly', url);
    if (v instanceof ArrayBuffer) return v;
    if (!v || !v.chunks) return null;
    const all = new Uint8Array(v.size); let o = 0;
    for (let i = 0; i < v.chunks; i++) {
      const c = await fstore('readonly', url + '#' + i);
      if (!(c instanceof ArrayBuffer)) return null;
      all.set(new Uint8Array(c), o); o += c.byteLength;
    }
    return o === v.size ? all.buffer : null;
  }
  async function fput(url, buf) {
    if (buf.byteLength <= CHUNK) return fstore('readwrite', url, buf);
    const n = Math.ceil(buf.byteLength / CHUNK);
    for (let i = 0; i < n; i++) await fstore('readwrite', url + '#' + i, buf.slice(i * CHUNK, (i + 1) * CHUNK));
    await fstore('readwrite', url, { chunks: n, size: buf.byteLength });
  }
  async function has(url) {
    try { const v = await fstore('readonly', url); return !!(v && (v instanceof ArrayBuffer || v.chunks)); } catch (e) { return false; }
  }
  async function ffetch(url, onProgress) {
    let cache = true;
    try { const hit = await fget(url); if (hit) return hit; } catch (e) { cache = false; }
    const r = await fetch(url, { mode: 'cors' });
    if (!r.ok) throw new Error('HTTP ' + r.status + ' em ' + url);
    const total = +r.headers.get('content-length') || 0;
    let buf;
    if (onProgress && total && r.body && r.body.getReader) {
      const rd = r.body.getReader(), parts = []; let got = 0;
      for (; ;) {
        const st = await rd.read(); if (st.done) break;
        parts.push(st.value); got += st.value.length; onProgress(Math.min(1, got / total));
      }
      const all = new Uint8Array(got); let o = 0;
      parts.forEach(p => { all.set(p, o); o += p.length; });
      buf = all.buffer;
    } else buf = await r.arrayBuffer();
    if (cache) { try { await fput(url, buf); } catch (e) { console.warn('Não guardou ' + url, e); } }
    return buf;
  }

  function base() {
    if (!N.base) {
      N.base = (async () => {
        if (!window.ort) await loadScript(N.ort + 'ort.webgpu.min.js');
        const ort = window.ort; ort.env.wasm.wasmPaths = N.ort;
        ort.env.wasm.numThreads = window.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
        const got = await Promise.all([import(N.phon), ffetch(N.phonBase + '.wasm'), ffetch(N.phonBase + '.data')]);
        N.create = got[0].createPiperPhonemize; N.wasm = got[1]; N.data = got[2];
      })();
      N.base.catch(() => { N.base = null; });
    }
    return N.base;
  }
  function phonemize(lang, text) {
    return new Promise((ok, fail) => {
      let got = false;
      N.create({
        print: d => { if (got) return; try { const j = JSON.parse(d); if (j.phoneme_ids) { got = true; ok(j); } } catch (e) { } },
        printErr: () => { },
        wasmBinary: N.wasm,
        getPreloadedPackage: () => N.data,
        locateFile: u => u.endsWith('.wasm') ? N.phonBase + '.wasm' : u.endsWith('.data') ? N.phonBase + '.data' : u
      }).then(m => {
        m.callMain(['-l', lang, '--input', JSON.stringify([{ text }]), '--espeak_data', '/espeak-ng-data']);
        if (!got) fail(new Error('sem fonemas'));
      }).catch(fail);
    });
  }

  // ---- Kokoro ----
  const K = {
    repo: 'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/',
    file: 'onnx/model.onnx', // fp32 (a fp16 sai muda em algumas placas)
    vocab: JSON.parse('{"$":0,";":1,":":2,",":3,".":4,"!":5,"?":6,"—":9,"…":10,"\\"":11,"(":12,")":13,"“":14,"”":15," ":16,"̃":17,"ʣ":18,"ʥ":19,"ʦ":20,"ʨ":21,"ᵝ":22,"ꭧ":23,"A":24,"I":25,"O":31,"Q":33,"S":35,"T":36,"W":39,"Y":41,"ᵊ":42,"a":43,"b":44,"c":45,"d":46,"e":47,"f":48,"h":50,"i":51,"j":52,"k":53,"l":54,"m":55,"n":56,"o":57,"p":58,"q":59,"r":60,"s":61,"t":62,"u":63,"v":64,"w":65,"x":66,"y":67,"z":68,"ɑ":69,"ɐ":70,"ɒ":71,"æ":72,"β":75,"ɔ":76,"ɕ":77,"ç":78,"ɖ":80,"ð":81,"ʤ":82,"ə":83,"ɚ":85,"ɛ":86,"ɜ":87,"ɟ":90,"ɡ":92,"ɥ":99,"ɨ":101,"ɪ":102,"ʝ":103,"ɯ":110,"ɰ":111,"ŋ":112,"ɳ":113,"ɲ":114,"ɴ":115,"ø":116,"ɸ":118,"θ":119,"œ":120,"ɹ":123,"ɾ":125,"ɻ":126,"ʁ":128,"ɽ":129,"ʂ":130,"ʃ":131,"ʈ":132,"ʧ":133,"ʊ":135,"ʋ":136,"ʌ":138,"ɣ":139,"ɤ":140,"χ":142,"ʎ":143,"ʒ":147,"ʔ":148,"ˈ":156,"ˌ":157,"ː":158,"ʰ":162,"ʲ":164,"↓":169,"→":171,"↗":172,"↘":173,"ᵻ":177}'),
    state: undefined, session: null, loading: null, progress: 0, voices: {}, styles: {}, error: ''
  };
  // ---- As 8 vozes do avatar: 4 femininas e 4 masculinas ----
  //  mix   = mistura de vozes do Kokoro (pf_dora / pm_* dão o sotaque brasileiro)
  //  spd   = ritmo · play = tom (no Kokoro)
  //  piper = voz de reserva [modelo, tom, ritmo] quando não há placa de vídeo
  //  fem   = ordem da voz feminina do navegador (última reserva) · bp = tom no navegador
  const PERSONAS = {
    dora: { name: 'Dora', desc: 'clara e brasileira', fem: 0, mix: { pf_dora: 1 }, spd: 1, play: 1, piper: ['faber', 1.3, 1], bp: 1.05 },
    rosinha: { name: 'Rosinha', desc: 'doce e carinhosa', fem: 1, mix: { pf_dora: 0.65, af_heart: 0.35 }, spd: 0.96, play: 1.05, piper: ['faber', 1.36, 0.97], bp: 1.15 },
    isabela: { name: 'Isabela', desc: 'calma e suave', fem: 2, mix: { pf_dora: 0.5, af_nicole: 0.5 }, spd: 0.88, play: 0.98, piper: ['faber', 1.24, 0.93], bp: 0.96 },
    lili: { name: 'Lili', desc: 'alegre e animada', fem: 3, mix: { pf_dora: 0.6, af_sky: 0.4 }, spd: 1.04, play: 1.06, piper: ['faber', 1.4, 1.05], bp: 1.25 },
    alex: { name: 'Alex', desc: 'amigo e claro', mix: { pm_alex: 1 }, spd: 1, play: 1, piper: ['cadu', 1, 1], bp: 1 },
    tonico: { name: 'Tonico', desc: 'jovem e brincalhão', mix: { pm_alex: 0.7, am_liam: 0.3 }, spd: 1.05, play: 1.06, piper: ['jeff', 1.18, 1.08], bp: 1.18 },
    bento: { name: 'Seu Bento', desc: 'grave e tranquilo', mix: { pm_santa: 0.6, em_santa: 0.4 }, spd: 0.9, play: 0.97, piper: ['jeff', 0.9, 0.9], bp: 0.86 },
    afonso: { name: 'Afonso', desc: 'contador de histórias', mix: { pm_santa: 0.6, am_michael: 0.4 }, spd: 0.93, play: 0.95, piper: ['faber', 0.9, 0.92], bp: 0.92 }
  };
  const isFem = (p) => p && p.fem !== undefined;
  function kokoroNames() {
    const s = new Set();
    Object.values(PERSONAS).forEach(v => Object.keys(v.mix).forEach(n => s.add(n)));
    return [...s];
  }
  async function kokoroCached() {
    return has(K.repo + K.file);
  }
  function loadKokoro() {
    if (K.loading) return K.loading;
    K.state = 'loading'; K.progress = 0; K.error = ''; notify();
    K.loading = (async () => {
      if (!navigator.gpu) throw new Error('este navegador não tem WebGPU');
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) throw new Error('sem placa de vídeo compatível');
      await base();
      const names = kokoroNames();
      const vb = await Promise.all(names.map(n => ffetch(K.repo + 'voices/' + n + '.bin')));
      names.forEach((n, i) => { K.voices[n] = new Float32Array(vb[i]); });
      const model = await ffetch(K.repo + K.file, p => { K.progress = p; notify(); });
      K.state = 'starting'; notify();
      K.session = await window.ort.InferenceSession.create(model, { executionProviders: ['webgpu'] });
      await kokoroSynth('dora', 'Olá.', 1); // a primeira fala prepara a placa de vídeo
      K.state = 'ready'; notify();
      return true;
    })().catch(e => {
      console.warn('Kokoro:', e);
      K.state = 'failed'; K.error = String(e && e.message || e); K.loading = null; notify();
      return false;
    });
    return K.loading;
  }
  function kokoroStyle(vid, n) {
    const mix = (PERSONAS[vid] || PERSONAS.dora).mix;
    let st = K.styles[vid];
    if (!st) {
      st = new Float32Array(510 * 256); let tot = 0;
      for (const [name, w] of Object.entries(mix)) {
        const v = K.voices[name]; if (!v) continue; tot += w;
        for (let i = 0; i < st.length; i++) st[i] += v[i] * w;
      }
      if (tot && tot !== 1) for (let i = 0; i < st.length; i++) st[i] /= tot;
      K.styles[vid] = st;
    }
    return st.slice(n * 256, n * 256 + 256);
  }
  async function kokoroSynth(vid, text, speed) {
    const j = await phonemize('pt-br', text);
    let ps = Array.isArray(j.phonemes[0]) ? j.phonemes.map(s => s.join('')).join(' ') : j.phonemes.join('');
    ps = ps.replace(/t͡?ʃ/g, 'ʧ').replace(/d͡?ʒ/g, 'ʤ');
    const ids = [...ps].map(c => K.vocab[c]).filter(x => x !== undefined).slice(0, 509);
    if (!ids.length) throw new Error('texto vazio');
    const ort = window.ort;
    const out = await K.session.run({
      input_ids: new ort.Tensor('int64', BigInt64Array.from([0, ...ids, 0], n => BigInt(n)), [1, ids.length + 2]),
      style: new ort.Tensor('float32', kokoroStyle(vid, ids.length), [1, 256]),
      speed: new ort.Tensor('float32', Float32Array.from([speed || 1]), [1])
    });
    const pcm = out.waveform.data;
    for (let i = 0; i < pcm.length; i += 97) if (pcm[i] !== pcm[i]) {
      K.state = 'failed'; K.error = 'áudio inválido na placa de vídeo'; K.loading = null; notify();
      throw new Error(K.error);
    }
    return { pcm, rate: 24000 };
  }

  // ---- Piper ----
  const P = {
    voices: {
      faber: { name: 'Faber', path: 'pt/pt_BR/faber/medium/pt_BR-faber-medium' },
      cadu: { name: 'Cadu', path: 'pt/pt_BR/cadu/medium/pt_BR-cadu-medium' },
      jeff: { name: 'Jeff', path: 'pt/pt_BR/jeff/medium/pt_BR-jeff-medium' }
    },
    model: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/'
  };
  function piperCached(id) { const v = P.voices[id]; return v ? has(P.model + v.path + '.onnx') : Promise.resolve(false); }
  function loadPiper(id) {
    const v = P.voices[id];
    if (!v) return Promise.resolve(false);
    if (v.loading) return v.loading;
    v.state = 'loading'; v.progress = 0; v.error = ''; notify();
    v.loading = (async () => {
      await base();
      const cfg = JSON.parse(new TextDecoder().decode(await ffetch(P.model + v.path + '.onnx.json')));
      const buf = await ffetch(P.model + v.path + '.onnx', p => { v.progress = p; notify(); });
      v.session = await window.ort.InferenceSession.create(buf, { executionProviders: ['wasm'] });
      v.cfg = cfg; v.state = 'ready'; notify();
      return true;
    })().catch(e => {
      console.warn('Piper ' + v.name + ':', e);
      v.state = 'failed'; v.error = String(e && e.message || e); v.loading = null; notify();
      return false;
    });
    return v.loading;
  }
  // play = quanto o áudio será acelerado ao tocar (muda o tom); o ritmo é compensado aqui.
  async function piperSynth(id, text, speed, play) {
    const v = P.voices[id];
    const j = await phonemize(v.cfg.espeak.voice, text), ids = j.phoneme_ids;
    if (!ids.length) throw new Error('texto vazio');
    const ort = window.ort, inf = v.cfg.inference || {};
    const length = (inf.length_scale || 1) * (play || 1) / (speed || 1);
    const feeds = {
      input: new ort.Tensor('int64', BigInt64Array.from(ids, n => BigInt(n)), [1, ids.length]),
      input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
      scales: new ort.Tensor('float32', Float32Array.from([inf.noise_scale ?? 0.667, length, inf.noise_w ?? 0.8]), [3])
    };
    if ((v.cfg.num_speakers || 1) > 1) feeds.sid = new ort.Tensor('int64', BigInt64Array.from([0n]), [1]);
    const out = await v.session.run(feeds);
    return { pcm: out.output.data, rate: v.cfg.audio.sample_rate };
  }

  // Gera a fala (uma de cada vez, em fila).
  function synth(engine, vid, text, speed, play) {
    const job = N.chain.catch(() => { }).then(() =>
      engine === 'kokoro' ? kokoroSynth(vid, text, speed) : piperSynth(vid, text, speed, play));
    N.chain = job.catch(() => { });
    return job;
  }
  function ready(engine, vid) {
    if (engine === 'kokoro') return K.state === 'ready';
    if (engine === 'piper') return !!(P.voices[vid] && P.voices[vid].state === 'ready');
    return false;
  }

  App.neural = {
    K, P, PERSONAS, isFem, phonemize, loadKokoro, loadPiper, kokoroCached, piperCached, synth, ready,
    hasWebGPU: () => !!navigator.gpu,
    onChange: (f) => listeners.add(f)
  };
})(window.App);
