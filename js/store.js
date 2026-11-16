'use strict';
// =====================================================================
//  Armazenamento: configurações e progresso (localStorage) e
//  gravações / falas prontas (IndexedDB). Tudo fica só neste aparelho.
// =====================================================================
(function (App) {
  const DEFAULTS = {
    nome: 'Heitor',
    genero: 'm',              // m = menino, f = menina
    avatar: 'Tico',
    avatarTipo: 'robo',       // robo (3D) | coruja
    caixa: 'ambas',           // maiusculas | minusculas | ambas
    nivel: 2,                 // 1 fácil · 2 médio · 3 difícil
    microfone: true,          // usa reconhecimento de voz
    botoesPais: true,         // mostra botões "acertou / errou" para os pais
    efeitos: true,
    motor: 'auto',            // auto | kokoro | piper | navegador
    voz: 'dora',              // dora rosinha isabela lili (femininas) · alex tonico bento afonso (masculinas)
    vozNavegador: '',
    velocidade: 0.92,
    tom: 1,
    todasLetras: false        // Aventura: libera todas as letras de uma vez
  };
  const KEY_S = 'eal.config.v1';
  const KEY_P = 'eal.progresso.v1';

  function load(key, def) {
    // Cópia profunda do padrão: senão jogar altera o próprio padrão e "zerar" não zera
    const base = JSON.parse(JSON.stringify(def));
    try { const v = JSON.parse(localStorage.getItem(key)); return v ? Object.assign(base, v) : base; }
    catch (e) { return base; }
  }
  const settings = load(KEY_S, DEFAULTS);
  function saveSettings() { try { localStorage.setItem(KEY_S, JSON.stringify(settings)); } catch (e) { } }

  const P_DEFAULT = { estrelas: 0, adesivos: [], letras: {}, liberadas: 5, aventuras: 0, dias: {}, trofeus: {}, fases: {}, recordes: {}, tempo: {} };
  const progress = load(KEY_P, P_DEFAULT);
  function saveProgress() { try { localStorage.setItem(KEY_P, JSON.stringify(progress)); } catch (e) { } }

  // Dia no horário local (e não em UTC, que viraria o dia às 21h no Brasil)
  function dayKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function letterStat(L) {
    L = L.toUpperCase();
    if (!progress.letras[L]) progress.letras[L] = { ok: 0, err: 0, tr: 0, visto: 0 };
    return progress.letras[L];
  }
  // Domínio da letra de 0 a 1
  function mastery(L) {
    const s = letterStat(L);
    const score = s.ok * 1 + s.tr * 1.2 - s.err * 0.6 + Math.min(s.visto, 3) * 0.3;
    return Math.max(0, Math.min(1, score / 10));
  }
  function record(L, kind) {
    if (!L) return;
    const s = letterStat(L);
    if (kind === 'ok') s.ok++;
    else if (kind === 'err') s.err++;
    else if (kind === 'tr') s.tr++;
    else if (kind === 'visto') s.visto++;
    const d = dayKey();
    progress.dias[d] = (progress.dias[d] || 0) + (kind === 'ok' || kind === 'tr' ? 1 : 0);
    saveProgress();
  }
  // Troféus: guarda o melhor de cada jogo (bronze < prata < ouro).
  const TIERS = ['bronze', 'prata', 'ouro'];
  function setTrophy(id, tier) {
    progress.trofeus = progress.trofeus || {};
    const cur = progress.trofeus[id];
    const better = !cur || TIERS.indexOf(tier) > TIERS.indexOf(cur);
    if (better) { progress.trofeus[id] = tier; saveProgress(); }
    return better;
  }
  function trophyCount() {
    const c = { ouro: 0, prata: 0, bronze: 0 };
    Object.values(progress.trofeus || {}).forEach(t => { if (c[t] !== undefined) c[t]++; });
    return c;
  }
  // Tempo de estudo (segundos por dia), contado só com o app aberto e visível.
  function addTime(sec) {
    const d = dayKey();
    progress.tempo = progress.tempo || {};
    progress.tempo[d] = (progress.tempo[d] || 0) + sec;
    saveProgress();
  }
  function resetProgress() {
    Object.keys(progress).forEach(k => delete progress[k]);
    Object.assign(progress, JSON.parse(JSON.stringify(P_DEFAULT)));
    saveProgress();
  }

  // ---- IndexedDB ----
  function openDb(name, version, stores) {
    return new Promise((ok, fail) => {
      try {
        const rq = indexedDB.open(name, version);
        rq.onupgradeneeded = () => stores.forEach(s => { if (!rq.result.objectStoreNames.contains(s)) rq.result.createObjectStore(s); });
        rq.onsuccess = () => ok(rq.result);
        rq.onerror = () => fail(rq.error);
        rq.onblocked = () => fail(new Error('banco bloqueado'));
      } catch (e) { fail(e); }
    });
  }
  let dbp = null;
  const db = () => (dbp = dbp || openDb('ensinando-a-ler', 1, ['clips', 'library', 'pcm']));
  function tx(store, mode, fn) {
    return db().then(d => new Promise((ok, fail) => {
      const t = d.transaction(store, mode), os = t.objectStore(store);
      const rq = fn(os);
      t.oncomplete = () => ok(rq && rq.result);
      t.onerror = t.onabort = () => fail(t.error);
    }));
  }
  const idb = {
    get: (store, k) => tx(store, 'readonly', os => os.get(k)),
    put: (store, k, v) => tx(store, 'readwrite', os => os.put(v, k)),
    del: (store, k) => tx(store, 'readwrite', os => os.delete(k)),
    keys: (store) => tx(store, 'readonly', os => os.getAllKeys()),
    all: (store) => tx(store, 'readonly', os => os.getAll()),
    clear: (store) => tx(store, 'readwrite', os => os.clear())
  };

  App.store = { settings, saveSettings, DEFAULTS, progress, saveProgress, dayKey, letterStat, mastery, record, resetProgress, setTrophy, trophyCount, addTime, TIERS, idb, openDb };
})(window.App);
