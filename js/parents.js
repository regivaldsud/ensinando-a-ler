'use strict';
// =====================================================================
//  Área dos pais: configurações, vozes, gravações e progresso.
// =====================================================================
(function (App) {
  const { h, shuffle, rand, norm } = App.util;
  const D = App.data, V = App.voice, N = App.neural;
  const S = () => App.store.settings;
  const save = () => App.store.saveSettings();

  // Pergunta simples para a criança não entrar sem querer
  function gate() {
    App.ui.stopCurrent();
    const a = 2 + rand(6), b = 1 + rand(5), ans = a + b;
    const opts = shuffle([ans, ans + 1, ans - 1, ans + 2].filter((v, i, arr) => v > 0 && arr.indexOf(v) === i));
    const body = h('div', { class: 'gate' },
      h('h2', null, '👨‍👩‍👦 Área dos pais'),
      h('p', null, `Para entrar, responda: quanto é ${a} + ${b}?`),
      h('div', { class: 'row-btns' }, ...opts.map(v => h('button', { class: 'btn big', onclick: () => { ok = v === ans; m.close(); if (ok) panel(); } }, String(v)))));
    // Fechou sem acertar: volta para o menu (a brincadeira anterior foi interrompida ao abrir)
    let ok = false;
    const m = App.ui.modal(body, { cls: 'center', onClose: () => { if (!ok) App.app.menu(); } });
  }

  let statusEl = null;
  function refreshStatus() {
    if (!statusEl || !document.body.contains(statusEl)) return;
    const K = N.K;
    const lines = [];
    lines.push('Falando agora com: ' + V.engineLabel());
    if (!N.hasWebGPU()) lines.push('Kokoro: este navegador/aparelho não tem WebGPU (use o Chrome ou o Edge atualizado).');
    else if (K.state === 'loading') lines.push('Kokoro: baixando… ' + Math.round(K.progress * 100) + '% (só na primeira vez, cerca de 330 MB)');
    else if (K.state === 'starting') lines.push('Kokoro: ligando na placa de vídeo…');
    else if (K.state === 'ready') lines.push('Kokoro: pronto ✔');
    else if (K.state === 'failed') lines.push('Kokoro: não funcionou aqui (' + K.error + ')');
    else lines.push('Kokoro: desligado');
    const pv = N.P.voices[V.persona().piper[0]];
    if (pv) {
      if (pv.state === 'loading') lines.push('Piper ' + pv.name + ': baixando… ' + Math.round((pv.progress || 0) * 100) + '%');
      else if (pv.state === 'ready') lines.push('Piper ' + pv.name + ': pronto ✔');
      else if (pv.state === 'failed') lines.push('Piper ' + pv.name + ': não funcionou (' + pv.error + ')');
    }
    statusEl.innerHTML = '';
    lines.forEach(l => statusEl.appendChild(h('div', null, l)));
  }

  function field(label, input, help) {
    return h('label', { class: 'field' }, h('span', { class: 'lbl' }, label), input, help ? h('small', null, help) : null);
  }
  function select(value, options, onchange) {
    const sel = h('select', null, ...options.map(([v, t]) => h('option', { value: v, selected: String(v) === String(value) }, t)));
    sel.addEventListener('change', () => onchange(sel.value));
    return sel;
  }
  function toggle(value, onchange) {
    const i = h('input', { type: 'checkbox', checked: !!value });
    i.addEventListener('change', () => onchange(i.checked));
    return h('span', { class: 'switch' }, i, h('i'));
  }

  // ---------------- Abas ----------------
  function tabGeral() {
    const s = S();
    const nome = h('input', { type: 'text', value: s.nome, maxlength: 20 });
    nome.addEventListener('change', () => { s.nome = nome.value.trim() || 'Heitor'; save(); });
    const av = h('input', { type: 'text', value: s.avatar, maxlength: 16 });
    av.addEventListener('change', () => { s.avatar = av.value.trim() || 'Tico'; save(); });
    const micInfo = !V.hasSR() ? 'Este navegador não reconhece voz. Use o Chrome ou o Edge. Os botões dos pais continuam funcionando.'
      : V.isDenied() ? 'O microfone foi bloqueado. Libere nas permissões do site (ícone do cadeado).'
        : 'A criança responde falando. O reconhecimento de voz é do próprio navegador.';
    return h('div', { class: 'tab-body' },
      field('Nome da criança', nome),
      field('É menino ou menina?', select(s.genero, [['m', 'Menino ("você é um ótimo menino")'], ['f', 'Menina ("você é uma ótima menina")']], v => { s.genero = v; save(); })),
      field('Avatar', (() => {
        const box = h('div', { class: 'avatar-pick' });
        const draw = () => {
          box.innerHTML = '';
          [['robo', '🤖 Robô 3D'], ['coruja', '🦉 Corujinha']].forEach(([k, t]) => {
            const b = h('button', { class: s.avatarTipo === k ? 'on' : '' }, t);
            b.addEventListener('click', () => { s.avatarTipo = k; save(); App.app.remountAvatar(); draw(); });
            box.appendChild(b);
          });
        };
        draw();
        return box;
      })()),
      field('Nome do avatar', av),
      field('Letras', select(s.caixa, [['ambas', 'Maiúsculas e minúsculas'], ['maiusculas', 'Só MAIÚSCULAS'], ['minusculas', 'Só minúsculas']], v => { s.caixa = v; save(); })),
      field('Dificuldade', select(s.nivel, [[1, 'Fácil (poucas opções)'], [2, 'Médio'], [3, 'Difícil (mais opções)']], v => { s.nivel = +v; save(); })),
      field('Ouvir a criança pelo microfone', toggle(s.microfone, v => { s.microfone = v; save(); }), micInfo),
      (() => {
        // Teste rápido: o que o aplicativo está ouvindo?
        const outp = h('small', null, 'Toque em "Testar", fale uma letra ou palavra e veja o que o aplicativo entendeu.');
        const b = h('button', { class: 'btn' }, '🎤 Testar microfone');
        b.addEventListener('click', async () => {
          b.disabled = true; outp.textContent = 'Ouvindo… fale agora.';
          const r = await V.listen({ ms: 6000 });
          b.disabled = false;
          outp.textContent = !r.supported ? ('Não foi possível ouvir' + (r.error ? ' (' + r.error + ')' : '') + '. Confira a permissão do microfone no cadeado ao lado do endereço e a internet.')
            : r.heard.length ? 'Entendi: "' + r.heard.slice(0, 3).join('" · "') + '"' : 'Não ouvi nada. Fale mais perto do microfone.';
        });
        return h('div', { class: 'field' }, h('div', { class: 'row-btns left' }, b), outp);
      })(),
      field('Mostrar botões "Acertou / Ainda não" para os pais', toggle(s.botoesPais, v => { s.botoesPais = v; save(); }), 'Úteis quando o reconhecimento de voz não entende bem a criança.'),
      field('Sons e efeitos', toggle(s.efeitos, v => { s.efeitos = v; save(); })),
      field('Aventura com todas as letras liberadas', toggle(s.todasLetras, v => { s.todasLetras = v; save(); }), 'Desligado: começa pelas vogais e libera uma letra nova a cada letra aprendida.')
    );
  }

  function tabVoz() {
    const s = S();
    statusEl = h('div', { class: 'status-box' });
    const bv = V.browserVoices();
    // Os 8 botões de voz: 4 femininas e 4 masculinas
    const cards = h('div', { class: 'voice-groups' });
    const drawCards = () => {
      cards.innerHTML = '';
      [['👩 Vozes femininas', true], ['👨 Vozes masculinas', false]].forEach(([title, fem]) => {
        const row = h('div', { class: 'voice-row' });
        Object.entries(N.PERSONAS).filter(([, p]) => N.isFem(p) === fem).forEach(([id, p]) => {
          const b = h('button', { class: 'voice-card' + (fem ? ' fem' : ' mas') + (V.voiceId() === id ? ' on' : '') },
            h('span', { class: 'voice-face' }, fem ? '👩' : '👨'),
            h('b', null, p.name), h('small', null, p.desc), h('i', null, '▶ ouvir'));
          b.addEventListener('click', async () => {
            s.voz = id; save(); drawCards(); refreshStatus();
            V.autoStart(true);
            V.say('elogio1');
          });
          row.appendChild(b);
        });
        cards.appendChild(h('div', { class: 'voice-group' }, h('h3', null, title), row));
      });
    };
    drawCards();
    const bSel = select(s.vozNavegador, [['', 'Automática (a melhor em português)']].concat(bv.map(v => [v.voiceURI, v.name + ' · ' + v.lang])), v => { s.vozNavegador = v; save(); refreshStatus(); });
    const rate = h('input', { type: 'range', min: 0.7, max: 1.2, step: 0.02, value: s.velocidade });
    rate.addEventListener('change', () => { s.velocidade = +rate.value; save(); });
    const pitch = h('input', { type: 'range', min: 0.8, max: 1.4, step: 0.02, value: s.tom });
    pitch.addEventListener('change', () => { s.tom = +pitch.value; save(); });
    const prepInfo = h('small', { class: 'prep-info' });
    const prepBtn = h('button', { class: 'btn' }, '⚡ Preparar todas as falas');
    let preparing = false;
    prepBtn.addEventListener('click', async () => {
      if (preparing) { V.cancelPrepare(); return; }
      preparing = true; prepBtn.textContent = '⏹ Parar';
      try {
        const r = await V.prepareAll((d, t) => { prepInfo.textContent = `Gerando falas: ${d} de ${t}…`; });
        prepInfo.textContent = r.cancelled ? `Parado em ${r.done} de ${r.total}.` : `Pronto! ${r.total} falas guardadas — agora tudo responde na hora.`;
      } catch (e) { prepInfo.textContent = e.message; }
      preparing = false; prepBtn.textContent = '⚡ Preparar todas as falas';
    });
    const box = h('div', { class: 'tab-body' },
      h('p', { class: 'lead' }, 'Escolha a voz do avatar: toque para ouvir. São vozes naturais, as mesmas do seu jogo de xadrez (Kokoro e Piper). Elas rodam aqui no aparelho — nada do que é falado vai para a internet. Na primeira vez os modelos são baixados; depois funcionam sem internet.'),
      cards,
      statusEl,
      field('Motor de voz', select(s.motor, [
        ['auto', 'Automático (o mais natural que este aparelho aguenta)'],
        ['kokoro', 'Kokoro — o mais natural (placa de vídeo, ≈330 MB)'],
        ['piper', 'Piper — natural e leve (processador, ≈60 MB por voz)'],
        ['navegador', 'Só a voz do navegador (sem baixar nada)']], v => { s.motor = v; save(); V.autoStart(true); refreshStatus(); })),
      h('div', { class: 'row-btns left' },
        h('button', { class: 'btn green', onclick: () => { V.autoStart(true); refreshStatus(); } }, '⬇ Baixar / ligar a voz natural agora'),
        h('button', { class: 'btn', onclick: () => V.say('elogio1') }, '🔊 Testar a voz')),
      field('Voz do navegador (reserva)', bSel, 'No Microsoft Edge aparecem as vozes "Francisca/Thalita Online (Natural)", que também são muito boas.'),
      field('Velocidade da fala', rate, 'Mais devagar ajuda a criança a entender cada som.'),
      field('Tom da voz', pitch),
      h('div', { class: 'row-btns left' }, prepBtn), prepInfo,
      h('small', null, '"Preparar todas as falas" gera e guarda de uma vez as mais de mil frases do aplicativo com a voz natural escolhida (leva alguns minutos). Assim o avatar responde na hora, mesmo em computador mais lento.')
    );
    setTimeout(refreshStatus, 0);
    return box;
  }

  // ---------------- Gravações ----------------
  let recorder = null, recChunks = [], recKey = null, recBtn = null;
  async function startRec(key, btn, after) {
    if (recorder) { recorder.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      recorder = new MediaRecorder(stream);
      recChunks = []; recKey = key; recBtn = btn;
      recorder.ondataavailable = e => e.data.size && recChunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(recChunks, { type: recorder.mimeType || 'audio/webm' });
        recorder = null;
        btn.classList.remove('rec'); btn.textContent = '🎤';
        if (blob.size > 800) { await V.setClip(recKey, blob, 'gravação'); after && after(); }
      };
      recorder.start();
      btn.classList.add('rec'); btn.textContent = '⏹';
    } catch (e) { alert('Não foi possível usar o microfone: ' + e.message); }
  }
  async function playBlob(blob) {
    try {
      const buf = await App.fx.ctx().decodeAudioData(await blob.arrayBuffer());
      const src = App.fx.ctx().createBufferSource(); src.buffer = buf; src.connect(App.fx.ctx().destination); src.start();
    } catch (e) { alert('Não consegui tocar este arquivo.'); }
  }
  // Tenta descobrir pelo nome do arquivo para qual fala ele serve
  function guessKey(fileName, keys) {
    const base = fileName.replace(/\.[a-z0-9]+$/i, '');
    const n = norm(base).replace(/ /g, '_');
    const byLower = new Map(keys.map(k => [norm(k.k).replace(/ /g, '_'), k.k]));
    if (byLower.has(n)) return byLower.get(n);
    const bare = n.replace(/^(letra|palavra|silaba)_?/, '');
    if (/^[a-z]$/.test(bare)) return 'letra_' + bare.toUpperCase();
    if (byLower.has('palavra_' + bare)) return byLower.get('palavra_' + bare);
    if (byLower.has('silaba_' + bare)) return byLower.get('silaba_' + bare);
    return null;
  }
  function tabGravacoes() {
    const keys = V.recordable();
    const groups = ['Nomes', 'Frases', 'Letras', 'Palavras', 'Sílabas'];
    let group = 'Frases', q = '';
    const list = h('div', { class: 'rec-list' });
    const lib = h('div', { class: 'lib-list' });
    const fileIn = h('input', { type: 'file', accept: 'audio/*', multiple: true, hidden: true });
    const dirIn = h('input', { type: 'file', accept: 'audio/*', multiple: true, hidden: true, webkitdirectory: true });
    const one = h('input', { type: 'file', accept: 'audio/*', hidden: true });
    let oneKey = null;
    const keyOptions = () => [['', 'Usar para…']].concat(keys.map(k => [k.k, k.group + ': ' + k.text.slice(0, 60)]));

    async function importFiles(files) {
      let auto = 0, toLib = 0;
      for (const f of files) {
        if (!/^audio\//.test(f.type) && !/\.(wav|mp3|ogg|m4a|webm|aac|flac)$/i.test(f.name)) continue;
        const k = guessKey(f.name, keys);
        if (k) { await V.setClip(k, f, f.name); auto++; }
        else { await App.store.idb.put('library', f.name + '|' + f.size, { name: f.name, blob: f }); toLib++; }
      }
      alert(`${auto} arquivo(s) ligados automaticamente pelo nome e ${toLib} guardado(s) na biblioteca para você escolher onde usar.`);
      renderLib(); renderList();
    }
    fileIn.addEventListener('change', () => importFiles([...fileIn.files]));
    dirIn.addEventListener('change', () => importFiles([...dirIn.files]));
    one.addEventListener('change', async () => { if (one.files[0] && oneKey) { await V.setClip(oneKey, one.files[0], one.files[0].name); renderList(); } one.value = ''; });

    async function renderLib() {
      lib.innerHTML = '';
      let items = [];
      try { const ks = await App.store.idb.keys('library'); items = await Promise.all(ks.map(async k => [k, await App.store.idb.get('library', k)])); } catch (e) { }
      if (!items.length) { lib.appendChild(h('small', null, 'Nenhum arquivo na biblioteca.')); return; }
      items.forEach(([k, it]) => {
        const sel = select('', keyOptions(), async v => { if (!v) return; await V.setClip(v, it.blob, it.name); renderList(); sel.value = ''; });
        lib.appendChild(h('div', { class: 'lib-row' },
          h('button', { class: 'btn icon', onclick: () => playBlob(it.blob) }, '▶'),
          h('span', { class: 'lib-name' }, it.name), sel,
          h('button', { class: 'btn icon', onclick: async () => { await App.store.idb.del('library', k); renderLib(); } }, '🗑')));
      });
    }
    function renderList() {
      list.innerHTML = '';
      const items = keys.filter(k => k.group === group && (!q || norm(k.text).includes(norm(q))));
      items.slice(0, 200).forEach(k => {
        const has = V.hasClip(k.k);
        const rec = h('button', { class: 'btn icon', title: 'Gravar' }, '🎤');
        rec.addEventListener('click', () => startRec(k.k, rec, renderList));
        list.appendChild(h('div', { class: 'rec-row' + (has ? ' has' : '') },
          h('span', { class: 'rec-state' }, has ? '✔' : '·'),
          h('span', { class: 'rec-text' }, k.text),
          h('button', {
            class: 'btn icon', title: 'Ouvir', onclick: async () => {
              if (V.hasClip(k.k)) { const r = await App.store.idb.get('clips', k.k); r && playBlob(r.blob); }
              else V.speak({ parts: [{ k: null, text: k.text, tts: k.k.startsWith('letra_') ? D.NAMES[k.k.slice(6)] : k.text }], text: k.text, tts: k.k.startsWith('letra_') ? D.NAMES[k.k.slice(6)] : k.text });
            }
          }, '▶'),
          rec,
          h('button', { class: 'btn icon', title: 'Escolher arquivo', onclick: () => { oneKey = k.k; one.click(); } }, '📂'),
          has ? h('button', { class: 'btn icon', title: 'Apagar gravação', onclick: async () => { await V.delClip(k.k); renderList(); } }, '🗑') : null));
      });
      if (items.length > 200) list.appendChild(h('small', null, 'Use a busca para ver mais.'));
    }
    const gbar = h('div', { class: 'chips' });
    groups.forEach(g => {
      const c = h('button', { class: 'chip' + (g === group ? ' on' : '') }, g);
      c.addEventListener('click', () => { group = g; [...gbar.children].forEach(x => x.classList.toggle('on', x === c)); renderList(); });
      gbar.appendChild(c);
    });
    const search = h('input', { type: 'search', placeholder: 'Buscar frase…' });
    search.addEventListener('input', () => { q = search.value; renderList(); });
    renderList(); renderLib();
    return h('div', { class: 'tab-body' },
      h('p', { class: 'lead' }, 'Aqui você pode trocar qualquer fala pela sua própria voz (🎤) ou por um arquivo de áudio (📂). O que tiver gravação toca a gravação; o resto usa a voz natural. Dica: grave pelo menos o nome da criança e os elogios.'),
      h('div', { class: 'row-btns left' },
        h('button', { class: 'btn', onclick: () => fileIn.click() }, '📂 Importar arquivos de áudio'),
        h('button', { class: 'btn', onclick: () => dirIn.click() }, '📁 Importar uma pasta')),
      h('small', null, 'Arquivos com o nome da fala são ligados sozinhos (ex.: "a.wav" vira a letra A, "bola.mp3" vira a palavra BOLA, "nome.wav" vira o nome). Os outros — como as amostras de voz do jogo de xadrez — vão para a biblioteca abaixo, e você escolhe onde usar cada um.'),
      fileIn, dirIn, one,
      h('h3', null, 'Biblioteca de áudios'), lib,
      h('h3', null, 'Falas do aplicativo'), gbar, search, list);
  }

  function tabProgresso() {
    const pr = App.store.progress;
    const M = (L) => App.store.mastery(L);
    const domina = D.ORDER.filter(L => M(L) >= 0.6);
    const pratica = D.ORDER.filter(L => M(L) >= 0.15 && M(L) < 0.6);
    const dificeis = D.ORDER.map(L => [L, App.store.letterStat(L)]).filter(([, st]) => st.err >= 2 && st.err >= st.ok).sort((x, y) => y[1].err - x[1].err).slice(0, 6).map(x => x[0]);
    const novas = D.ORDER.filter(L => { const st = App.store.letterStat(L); return !st.ok && !st.err && !st.tr && !st.visto; });
    const liberadas = App.ui.unlocked();
    const proxima = liberadas.find(L => M(L) < 0.6) || D.ORDER[Math.min(25, pr.liberadas || 5)];
    const tc = App.store.trophyCount();
    const tempo = pr.tempo || {};
    const dias = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5); const k = App.store.dayKey(d); dias.push([['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][d.getDay()], Math.round((tempo[k] || 0) / 60)]); }
    const maxMin = Math.max(10, ...dias.map(x => x[1]));
    const totalMin = Math.round(Object.values(tempo).reduce((x, y) => x + y, 0) / 60);
    const card = (cls, title, body) => h('div', { class: 'insight ' + cls }, h('h4', null, title), body);
    const letters = (arr, vazio) => arr.length ? h('p', { class: 'letters' }, arr.join(' ')) : h('p', null, vazio);
    const sug = [];
    sug.push('Aventura da letra ' + proxima + ' (cerca de 10 minutos).');
    if (dificeis.length) sug.push('Depois, "Encontre a letra" e "Escrever com o dedo" com: ' + dificeis.slice(0, 3).join(', ') + '.');
    sug.push('Para a fala: 5 minutos de "Motor do R" e uma fase do "Desafio de voz".');
    const table = h('div', { class: 'prog-table' },
      h('div', { class: 'prog-row head' }, h('b', null, 'Letra'), h('b', null, 'Domínio'), h('b', null, 'Acertos'), h('b', null, 'Erros'), h('b', null, 'Traçados')));
    D.ORDER.forEach(L => {
      const st = App.store.letterStat(L), m = M(L);
      table.appendChild(h('div', { class: 'prog-row' + (D.isVowel(L) ? ' vowel' : '') },
        h('b', null, L + ' ' + L.toLowerCase()),
        h('span', { class: 'bar' }, h('i', { style: { width: Math.round(m * 100) + '%', background: m > 0.6 ? '#0ead69' : m > 0.3 ? '#ffd23f' : '#ff8c42' } })),
        h('span', null, st.ok), h('span', null, st.err), h('span', null, st.tr)));
    });
    const lib = h('span', null, String(pr.liberadas || 5));
    const libBox = h('div', { class: 'row-btns left' },
      h('span', null, 'Letras liberadas na Aventura: '), lib,
      h('button', { class: 'btn icon', onclick: () => { pr.liberadas = Math.max(5, (pr.liberadas || 5) - 1); App.store.saveProgress(); lib.textContent = pr.liberadas; } }, '−'),
      h('button', { class: 'btn icon', onclick: () => { pr.liberadas = Math.min(26, (pr.liberadas || 5) + 1); App.store.saveProgress(); lib.textContent = pr.liberadas; } }, '+'),
      h('small', null, '(ordem: ' + D.ORDER.join(' ') + ')'));
    return h('div', { class: 'tab-body' },
      h('div', { class: 'kpis' },
        h('div', null, h('b', null, domina.length + '/26'), h('small', null, 'letras dominadas')),
        h('div', null, h('b', null, pr.estrelas), h('small', null, 'estrelas')),
        h('div', null, h('b', null, '🥇' + tc.ouro + ' 🥈' + tc.prata + ' 🥉' + tc.bronze), h('small', null, 'troféus')),
        h('div', null, h('b', null, totalMin + ' min'), h('small', null, 'tempo total'))),
      h('div', { class: 'insights' },
        card('', '👉 Sugestão para hoje', h('p', null, sug.join(' '))),
        card('good', '✅ Já domina', letters(domina, 'Ainda nenhuma — é normal no começo.')),
        card('', '📚 Está praticando', letters(pratica, 'Nenhuma no momento.')),
        card('warn', '🔁 Precisa de mais treino', letters(dificeis, 'Nenhuma letra com muitos erros. 👏')),
        card('', '🆕 Ainda não viu', h('p', null, novas.length ? novas.length + ' letras: ' + novas.join(' ') : 'Já viu todas as letras!')),
        card('', '⏰ Tempo de estudo (7 dias)', h('div', { class: 'week' }, ...dias.map(([d, m]) => h('div', null, h('span', null, m ? m + 'm' : ''), h('i', { style: { height: Math.round(m / maxMin * 70) + 'px' } }), d))))),
      h('small', null, 'Como ler: "domínio" sobe com acertos e letras traçadas e desce um pouco com erros. Sessões curtas (10 a 15 minutos) todos os dias funcionam melhor do que uma sessão longa.'),
      h('h3', null, 'Letra por letra'),
      libBox, table,
      h('div', { class: 'row-btns left' }, h('button', {
        class: 'btn danger', onclick: () => {
          if (confirm('Apagar todo o progresso (estrelas, adesivos, troféus e letras)? Isso não pode ser desfeito.')) { App.store.resetProgress(); App.ui.refreshStars(); tabSwitch('progresso'); }
        }
      }, 'Zerar progresso')));
  }

  function tabAjuda() {
    return h('div', { class: 'tab-body help' },
      h('h3', null, 'Como usar'),
      h('ul', null,
        h('li', null, '🚀 Aventura: o caminho principal. Começa pelas vogais A E I O U e libera uma letra nova quando a anterior estiver aprendida. Cada aventura passa por: conhecer, repetir, escrever com o dedo, encontrar, responder falando e um joguinho.'),
        h('li', null, '🗣️ Nas atividades de falar, o avatar escuta pelo microfone. Se ela não entender, use os botões "✔ Acertou" e "✖ Ainda não".'),
        h('li', null, '🔊 O botão de alto-falante (e tocar no avatar) repete a última fala.'),
        h('li', null, '⭐ Cada acerto vale uma estrela; a cada 10 estrelas a criança ganha um adesivo no álbum.'),
        h('li', null, '🏆 Cada brincadeira terminada dá um troféu (bronze, prata ou ouro, conforme os acertos de primeira). No "Desafio de voz" é preciso falar as letras para abrir a próxima fase.'),
        h('li', null, '🚂 Para a ORDEM das letras: Trem das letras, Ligue as letras e Labirinto — com as vogais, o alfabeto ou as letras do nome.'),
        h('li', null, 'Sessões curtas (10 a 15 minutos) todos os dias funcionam melhor do que uma longa.')),
      h('h3', null, 'Sobre o som do R'),
      h('p', null, 'O "Motor do R" é um treino de brincadeira: fazer o barulho do motor (rrrr), repetir RA RE RI RO RU e falar palavras com R no começo, no meio, junto de outra consoante (PR, TR, BR) e no fim. Trocar ou omitir o R ainda é comum aos 6 anos. Se a dificuldade continuar, vale conversar com um(a) fonoaudiólogo(a) — este aplicativo não substitui essa avaliação.'),
      h('h3', null, 'No celular'),
      h('ul', null,
        h('li', null, 'O aplicativo se ajusta à tela do celular e do tablet. Para instalar, abra o endereço dele no Chrome e toque em "Adicionar à tela inicial".'),
        h('li', null, 'O microfone e as vozes naturais precisam de um endereço seguro (https ou o próprio computador). Abrindo pelo Wi-Fi da casa (http://…), a voz do celular e os botões dos pais continuam funcionando.')),
      h('h3', null, 'Privacidade'),
      h('p', null, 'Configurações, progresso e gravações ficam só neste aparelho. As vozes naturais são geradas aqui mesmo. O reconhecimento de voz é o do navegador (no Chrome ele usa o serviço do Google).'));
  }

  const TABS = [['geral', '⚙️ Geral', tabGeral], ['voz', '🔊 Voz', tabVoz], ['gravacoes', '🎤 Gravações', tabGravacoes], ['progresso', '📈 Progresso', tabProgresso], ['ajuda', '❓ Ajuda', tabAjuda]];
  let bodyEl = null, tabsEl = null;
  function tabSwitch(id) {
    if (!bodyEl) return;
    [...tabsEl.children].forEach(b => b.classList.toggle('on', b.dataset.id === id));
    bodyEl.innerHTML = '';
    const t = TABS.find(x => x[0] === id) || TABS[0];
    bodyEl.appendChild(t[2]());
  }
  function panel() {
    tabsEl = h('div', { class: 'tabs' });
    TABS.forEach(([id, t]) => {
      const b = h('button', { class: 'tab' }, t); b.dataset.id = id;
      b.addEventListener('click', () => tabSwitch(id));
      tabsEl.appendChild(b);
    });
    bodyEl = h('div', { class: 'tab-wrap' });
    const m = App.ui.modal(h('div', { class: 'parents' }, h('h2', null, 'Área dos pais'), tabsEl, bodyEl,
      h('div', { class: 'row-btns' }, h('button', { class: 'btn big green', onclick: () => m.close() }, 'Voltar para as brincadeiras'))), {
      cls: 'wide', onClose: () => { V.cancelPrepare(); if (recorder) recorder.stop(); statusEl = null; App.ui.refreshStars(); App.app.menu(); }
    });
    tabSwitch('geral');
  }

  App.parents = { gate, panel, refreshStatus };
})(window.App);
