'use strict';
// =====================================================================
//  Dados do aplicativo: letras, palavras, sílabas e o catálogo de falas.
// =====================================================================
window.App = window.App || {};

(function (App) {
  // Nome falado de cada letra (o acento força a pronúncia certa na voz).
  const NAMES = {
    A: 'á', B: 'bê', C: 'cê', D: 'dê', E: 'é', F: 'éfe', G: 'gê', H: 'agá', I: 'i',
    J: 'jota', K: 'cá', L: 'éle', M: 'ême', N: 'êne', O: 'ó', P: 'pê', Q: 'quê',
    R: 'érre', S: 'ésse', T: 'tê', U: 'u', V: 'vê', W: 'dáblio', X: 'xis',
    Y: 'ípsilon', Z: 'zê'
  };
  // Nas vozes naturais, 'é' sozinho seria lido como 'é agudo'; 'hé' (h mudo) dá o som certo.
  const NAMES_NEURAL = { E: 'hé' };

  // Como o reconhecimento de voz costuma escrever cada letra falada (sem acentos).
  const HEARD = {
    A: ['a', 'ah', 'ha', 'aa', 'haa', 'la'],
    B: ['b', 'be', 'bem', 'beh', 'bebe', 'bee', 'bei'],
    C: ['c', 'ce', 'se', 'sei', 'ceh', 'seh', 'ser'],
    D: ['d', 'de', 'dei', 'deh', 'dee'],
    E: ['e', 'eh', 'he', 'ee', 'ei'],
    F: ['f', 'efe', 'ef', 'efi', 'efa', 'eff'],
    G: ['g', 'ge', 'je', 'gel', 'ji', 'jeh', 'gee'],
    H: ['h', 'aga', 'haga', 'ga', 'agah'],
    I: ['i', 'hi', 'ih', 'ii', 'y'],
    J: ['j', 'jota', 'iota', 'jot', 'yota', 'jotta'],
    K: ['k', 'ca', 'ka', 'car', 'kah', 'cah'],
    L: ['l', 'ele', 'eli', 'elle', 'el', 'ela'],
    M: ['m', 'eme', 'emi', 'em', 'ema'],
    N: ['n', 'ene', 'eni', 'enne', 'en'],
    O: ['o', 'oh', 'ho', 'ou', 'oo'],
    P: ['p', 'pe', 'pei', 'peh', 'pee'],
    Q: ['q', 'que', 'ke', 'quem', 'keh'],
    R: ['r', 'erre', 'eri', 'err', 'rre', 'ere'],
    S: ['s', 'esse', 'essi', 'es', 'ess', 'ese'],
    T: ['t', 'te', 'tei', 'teh', 'tee'],
    U: ['u', 'uh', 'hu', 'ul', 'uu'],
    V: ['v', 've', 'vei', 'veh', 'vee'],
    W: ['w', 'dablio', 'dabliu', 'dabliou', 'double', 'dabilio', 'dabliw'],
    X: ['x', 'xis', 'chis', 'shis', 'xiz', 'chiz', 'cheese', 'xiis'],
    Y: ['y', 'ipsilon', 'ipisilon', 'ipsilone', 'ipslon', 'ipsilom'],
    Z: ['z', 'ze', 'zei', 'zeh', 'zee']
  };

  const VOWELS = ['A', 'E', 'I', 'O', 'U'];
  // Ordem de apresentação na Aventura: primeiro as vogais, depois as consoantes mais fáceis.
  const ORDER = ['A', 'E', 'I', 'O', 'U', 'P', 'B', 'T', 'D', 'M', 'N', 'L', 'F', 'V', 'S',
    'C', 'G', 'J', 'R', 'Z', 'X', 'H', 'Q', 'K', 'W', 'Y'];
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // Palavras de cada letra (para "A de Abelha"). w = escrita, t = como falar, e = desenho.
  const WORDS = {
    A: [['ABELHA', 'abelha', '🐝'], ['AVIÃO', 'avião', '✈️'], ['ABACAXI', 'abacaxi', '🍍'], ['ANEL', 'anel', '💍']],
    B: [['BOLA', 'bola', '⚽'], ['BANANA', 'banana', '🍌'], ['BOLO', 'bolo', '🎂'], ['BARCO', 'barco', '⛵']],
    C: [['CASA', 'casa', '🏠'], ['CAVALO', 'cavalo', '🐴'], ['CARRO', 'carro', '🚗'], ['COELHO', 'coelho', '🐰']],
    D: [['DADO', 'dado', '🎲'], ['DENTE', 'dente', '🦷'], ['DINOSSAURO', 'dinossauro', '🦕']],
    E: [['ELEFANTE', 'elefante', '🐘'], ['ESTRELA', 'estrela', '⭐'], ['ESCOVA', 'escova', '🪥']],
    F: [['FOCA', 'foca', '🦭'], ['FLOR', 'flor', '🌸'], ['FADA', 'fada', '🧚'], ['FOGUETE', 'foguete', '🚀']],
    G: [['GATO', 'gato', '🐱'], ['GIRAFA', 'girafa', '🦒'], ['GALINHA', 'galinha', '🐔']],
    H: [['HIPOPÓTAMO', 'hipopótamo', '🦛'], ['HELICÓPTERO', 'helicóptero', '🚁'], ['HAMBÚRGUER', 'hambúrguer', '🍔']],
    I: [['ILHA', 'ilha', '🏝️'], ['IGREJA', 'igreja', '⛪'], ['ÍMÃ', 'ímã', '🧲'], ['IOIÔ', 'ioiô', '🪀']],
    J: [['JACARÉ', 'jacaré', '🐊'], ['JOANINHA', 'joaninha', '🐞'], ['JANELA', 'janela', '🪟']],
    K: [['KIWI', 'kiwi', '🥝'], ['KARATÊ', 'caratê', '🥋']],
    L: [['LEÃO', 'leão', '🦁'], ['LUA', 'lua', '🌙'], ['LARANJA', 'laranja', '🍊'], ['LÁPIS', 'lápis', '✏️']],
    M: [['MACACO', 'macaco', '🐒'], ['MAÇÃ', 'maçã', '🍎'], ['MALA', 'mala', '🧳'], ['MOTO', 'moto', '🏍️']],
    N: [['NAVIO', 'navio', '🚢'], ['NUVEM', 'nuvem', '☁️'], ['NARIZ', 'nariz', '👃'], ['NINHO', 'ninho', '🪺']],
    O: [['OVO', 'ovo', '🥚'], ['OVELHA', 'ovelha', '🐑'], ['OLHO', 'olho', '👁️'], ['ÓCULOS', 'óculos', '👓']],
    P: [['PATO', 'pato', '🦆'], ['PEIXE', 'peixe', '🐟'], ['PIPOCA', 'pipoca', '🍿'], ['PÃO', 'pão', '🍞']],
    Q: [['QUEIJO', 'queijo', '🧀'], ['QUADRO', 'quadro', '🖼️']],
    R: [['RATO', 'rato', '🐭'], ['ROBÔ', 'robô', '🤖'], ['RELÓGIO', 'relógio', '⏰'], ['ROSA', 'rosa', '🌹']],
    S: [['SAPO', 'sapo', '🐸'], ['SOL', 'sol', '☀️'], ['SORVETE', 'sorvete', '🍦'], ['SAPATO', 'sapato', '👞']],
    T: [['TARTARUGA', 'tartaruga', '🐢'], ['TOMATE', 'tomate', '🍅'], ['TIGRE', 'tigre', '🐯'], ['TREM', 'trem', '🚂']],
    U: [['UVA', 'uva', '🍇'], ['URSO', 'urso', '🐻'], ['UNICÓRNIO', 'unicórnio', '🦄']],
    V: [['VACA', 'vaca', '🐄'], ['VELA', 'vela', '🕯️'], ['VIOLÃO', 'violão', '🎸']],
    W: [['WAFFLE', 'uófol', '🧇']],
    X: [['XADREZ', 'xadrez', '♟️'], ['XÍCARA', 'xícara', '☕']],
    Y: [['YOGA', 'ióga', '🧘'], ['YAKISOBA', 'iakissôba', '🍜']],
    Z: [['ZEBRA', 'zebra', '🦓'], ['ZERO', 'zero', '0️⃣']]
  };

  // Palavras para montar letra por letra (sem acento, para o traçado das letras).
  const BUILD = [
    // nível 1: palavras curtinhas
    [['OVO', 'ovo', '🥚'], ['UVA', 'uva', '🍇'], ['LUA', 'lua', '🌙'], ['SOL', 'sol', '☀️'], ['BOI', 'boi', '🐂'],
      ['PAI', 'pai', '👨'], ['MAR', 'mar', '🌊'], ['AVE', 'ave', '🐦'], ['FIO', 'fio', '🧵'], ['MEL', 'mel', '🍯']],
    // nível 2: quatro letras
    [['BOLA', 'bola', '⚽'], ['CASA', 'casa', '🏠'], ['GATO', 'gato', '🐱'], ['PATO', 'pato', '🦆'], ['SAPO', 'sapo', '🐸'],
      ['MALA', 'mala', '🧳'], ['DADO', 'dado', '🎲'], ['VACA', 'vaca', '🐄'], ['FOCA', 'foca', '🦭'], ['RATO', 'rato', '🐭'],
      ['PIPA', 'pipa', '🪁'], ['MOTO', 'moto', '🏍️'], ['BOLO', 'bolo', '🎂'], ['URSO', 'urso', '🐻'], ['FADA', 'fada', '🧚'],
      ['LOBO', 'lobo', '🐺'], ['SUCO', 'suco', '🧃'], ['NAVE', 'nave', '🛸']],
    // nível 3: palavras maiores
    [['BANANA', 'banana', '🍌'], ['CAVALO', 'cavalo', '🐴'], ['MACACO', 'macaco', '🐒'], ['SAPATO', 'sapato', '👞'],
      ['TOMATE', 'tomate', '🍅'], ['PIPOCA', 'pipoca', '🍿'], ['GIRAFA', 'girafa', '🦒'], ['ZEBRA', 'zebra', '🦓'],
      ['PEIXE', 'peixe', '🐟'], ['BONECA', 'boneca', '🪆'], ['JANELA', 'janela', '🪟'], ['CAMELO', 'camelo', '🐫'],
      ['XADREZ', 'xadrez', '♟️'], ['ESCOVA', 'escova', '🪥']]
  ];

  // Palavras para treinar o som do R (ele aparece de jeitos diferentes na palavra).
  const R_WORDS = {
    comeco: [['RATO', 'rato', '🐭'], ['ROBÔ', 'robô', '🤖'], ['RODA', 'roda', '🛞'], ['RUA', 'rua', '🛣️'], ['REI', 'rei', '🤴'], ['ROSA', 'rosa', '🌹'], ['RELÓGIO', 'relógio', '⏰']],
    meio: [['ARARA', 'arara', '🦜'], ['PERA', 'pera', '🍐'], ['JACARÉ', 'jacaré', '🐊'], ['GIRAFA', 'girafa', '🦒'], ['BARATA', 'barata', '🪳'], ['CORUJA', 'coruja', '🦉'], ['TUBARÃO', 'tubarão', '🦈']],
    encontro: [['PRATO', 'prato', '🍽️'], ['TREM', 'trem', '🚂'], ['TIGRE', 'tigre', '🐯'], ['DRAGÃO', 'dragão', '🐉'], ['BRAÇO', 'braço', '💪'], ['FRUTA', 'fruta', '🍓'], ['ZEBRA', 'zebra', '🦓'], ['ESTRELA', 'estrela', '⭐']],
    fim: [['MAR', 'mar', '🌊'], ['FLOR', 'flor', '🌸'], ['COLHER', 'colher', '🥄'], ['TRATOR', 'trator', '🚜'], ['COR', 'cor', '🎨'], ['AMOR', 'amor', '❤️']]
  };
  const R_LEVELS = [['meio', 'R no meio (ARARA)'], ['comeco', 'R no começo (RATO)'], ['fim', 'R no fim (MAR)'], ['encontro', 'PR · TR · BR']];
  // Palavras SEM o som do R (várias com L, que é o som mais trocado com o R)
  const NO_R = [['BOLA', 'bola', '⚽'], ['MALA', 'mala', '🧳'], ['LUA', 'lua', '🌙'], ['VELA', 'vela', '🕯️'], ['GATO', 'gato', '🐱'], ['BOLO', 'bolo', '🎂'], ['LEÃO', 'leão', '🦁'], ['SAPO', 'sapo', '🐸'], ['UVA', 'uva', '🍇'], ['CAVALO', 'cavalo', '🐴']];
  // Pares de ouvir: R contra L (e contra outros sons parecidos)
  const R_PAIRS = [['RUA', 'LUA'], ['ROBÔ', 'LOBO'], ['RATO', 'PATO'], ['RATO', 'GATO'], ['ROSA', 'ROBÔ'], ['FRUTA', 'FLAUTA'], ['RODA', 'COLA'], ['CARRO', 'CAVALO'], ['PERA', 'VELA']];
  // Pares que rimam
  const EXTRA = [['MÃO', 'mão', '✋'], ['LUVA', 'luva', '🧤'], ['CHAVE', 'chave', '🔑'], ['PANELA', 'panela', '🍲'], ['PENTE', 'pente', '🪮'], ['FLAUTA', 'flauta', '🪈'], ['COLA', 'cola', '🧴'], ['CARRO', 'carro', '🚗']];
  const RHYMES = [['GATO', 'PATO'], ['MÃO', 'PÃO'], ['LEÃO', 'AVIÃO'], ['JANELA', 'PANELA'], ['FOGUETE', 'SORVETE'], ['CHAVE', 'NAVE'], ['DENTE', 'PENTE'], ['MEL', 'ANEL'], ['UVA', 'LUVA'], ['SAPATO', 'RATO'], ['BOLA', 'MALA'].slice(0, 0), ['FADA', 'MALA'].slice(0, 0)].filter(p => p.length);

  // Palavras separadas em sílabas (s = como se escreve, t = como falar cada pedacinho)
  const SW = (w, s, t, e) => ({ w, s, t, e });
  const SYL_WORDS = [
    SW('SOL', ['sol'], ['sól'], '☀️'), SW('PÃO', ['pão'], ['pão'], '🍞'), SW('FLOR', ['flor'], ['flôr'], '🌸'), SW('MAR', ['mar'], ['már'], '🌊'),
    SW('BOLA', ['bo', 'la'], ['bó', 'lá'], '⚽'), SW('GATO', ['ga', 'to'], ['gá', 'tô'], '🐱'), SW('PATO', ['pa', 'to'], ['pá', 'tô'], '🦆'),
    SW('SAPO', ['sa', 'po'], ['sá', 'pô'], '🐸'), SW('CASA', ['ca', 'sa'], ['cá', 'zá'], '🏠'), SW('MALA', ['ma', 'la'], ['má', 'lá'], '🧳'),
    SW('DADO', ['da', 'do'], ['dá', 'dô'], '🎲'), SW('VACA', ['va', 'ca'], ['vá', 'cá'], '🐄'), SW('RATO', ['ra', 'to'], ['rá', 'tô'], '🐭'),
    SW('PIPA', ['pi', 'pa'], ['pí', 'pá'], '🪁'), SW('BOLO', ['bo', 'lo'], ['bô', 'lô'], '🎂'), SW('LUA', ['lu', 'a'], ['lú', 'á'], '🌙'),
    SW('UVA', ['u', 'va'], ['hú', 'vá'], '🍇'), SW('OVO', ['o', 'vo'], ['hô', 'vô'], '🥚'), SW('MOTO', ['mo', 'to'], ['mó', 'tô'], '🏍️'),
    SW('MACACO', ['ma', 'ca', 'co'], ['má', 'cá', 'cô'], '🐒'), SW('BANANA', ['ba', 'na', 'na'], ['bá', 'ná', 'ná'], '🍌'),
    SW('CAVALO', ['ca', 'va', 'lo'], ['cá', 'vá', 'lô'], '🐴'), SW('SAPATO', ['sa', 'pa', 'to'], ['sá', 'pá', 'tô'], '👞'),
    SW('TOMATE', ['to', 'ma', 'te'], ['tô', 'má', 'tchi'], '🍅'), SW('GIRAFA', ['gi', 'ra', 'fa'], ['gí', 'rá', 'fá'], '🦒'),
    SW('PIPOCA', ['pi', 'po', 'ca'], ['pí', 'pó', 'cá'], '🍿'), SW('JANELA', ['ja', 'ne', 'la'], ['já', 'né', 'lá'], '🪟'),
    SW('ELEFANTE', ['e', 'le', 'fan', 'te'], ['hê', 'lê', 'fân', 'tchi'], '🐘'), SW('BORBOLETA', ['bor', 'bo', 'le', 'ta'], ['bôr', 'bô', 'lê', 'tá'], '🦋')
  ];

  // Famílias silábicas (consoante + vogal). t = como falar.
  const SYL_CONS = ['B', 'D', 'F', 'G', 'J', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'V', 'X', 'Z'];
  const SYL_VOWEL_TTS = { A: 'á', E: 'é', I: 'í', O: 'ó', U: 'ú' };
  function syllable(c, v) {
    return { s: c + v, c, v, t: c.toLowerCase() + SYL_VOWEL_TTS[v] };
  }

  // Adesivos de prêmio (um a cada 10 estrelas).
  const STICKERS = ['🦁', '🐶', '🐱', '🦊', '🐼', '🐨', '🐯', '🦄', '🐸', '🐵', '🦖', '🐙', '🦋', '🐢', '🐬', '🦉',
    '🚀', '🚂', '🚁', '⚽', '🏆', '🎈', '🌈', '⭐', '🍉', '🍦', '🎸', '🤖', '👑', '💎', '🦕', '🐳', '🐧', '🐝', '🌻', '🎁'];

  // ------------------------------------------------------------------
  //  Catálogo de falas. Cada fala é um modelo com marcadores:
  //  {nome} criança · {avatar} avatar · {L} {X} letras · {W} palavra
  //  {S} sílaba · {C} consoante · {V} vogal · {menino} menino/menina
  //  "each" diz quais combinações existem (para gerar todas de uma vez).
  // ------------------------------------------------------------------
  const PH = {
    // Boas-vindas e menu
    ola: { t: 'Olá, {nome}! Eu sou {avatar}! Vamos brincar com as letrinhas?' },
    menu: { t: '{nome}, toque no foguete para começar a aventura, ou escolha uma brincadeira!' },
    toqueMic: { t: 'Toque no microfone vermelho para falar de novo!' },
    curto1: { t: 'Isso!' },
    curto2: { t: 'Boa!' },
    curto3: { t: 'Muito bem!' },
    curto4: { t: 'Acertou!' },
    faseDeNovo: { t: 'Quase! Vamos treinar essa fase mais uma vez?' },
    menuVolta: { t: 'Qual brincadeira vamos fazer agora?' },
    proxima: { t: 'Vamos para a próxima atividade!' },
    fim: { t: 'Muito bem, {nome}! Você terminou a brincadeira!' },
    adesivo: { t: 'Uau! Você ganhou um adesivo novo!' },
    tchau: { t: 'Até logo, {nome}! Foi muito legal brincar com você!' },

    // Elogios (sorteados) — {menino} vira "menino" ou "menina".
    elogio1: { t: 'Muito bem, {nome}! Você é um ótimo {menino}!' },
    elogio2: { t: 'Isso mesmo! Parabéns, {nome}!' },
    elogio3: { t: 'Uau! Você acertou!' },
    elogio4: { t: 'Excelente! Estou muito {orgulhosa} de você!' },
    elogio5: { t: 'Que lindo! Você está aprendendo muito!' },
    elogio6: { t: 'Muito bem! Você é muito inteligente!' },
    elogio7: { t: 'Arrasou, {nome}! Toca aqui!' },
    elogio8: { t: 'Perfeito! Você é demais!' },

    // Incentivo (nunca broncas)
    quase1: { t: 'Quase! Vamos tentar de novo?' },
    quase2: { t: 'Não tem problema. Vamos tentar mais uma vez!' },
    quase3: { t: 'Você consegue! Tenta de novo!' },
    naoOuvi: { t: 'Não consegui ouvir. Fala mais alto pra mim!' },
    esforco: { t: 'Muito bem! Você está aprendendo!' },

    // Letras
    letra: { t: '{L}', each: 'L' },
    estaEh: { t: 'Esta é a letra {L}!', each: 'L' },
    essaEh: { t: 'Essa é a letra {L}.', each: 'L' },
    deWord: { t: '{L} de {W}!', each: 'LW' },
    maiMin: { t: 'Esta é a letra {L} maiúscula. E esta é a letra {L} minúscula.', each: 'L' },
    queLetra: { t: '{nome}, que letra é essa que você está vendo na tela? Fala pra mim!' },
    queLetra2: { t: 'E essa? Que letra é essa?' },
    repita: { t: 'Repita comigo: {L}!', each: 'L' },
    repitaAlto: { t: 'Mais uma vez, bem alto: {L}!', each: 'L' },
    quaseLetra: { t: 'Quase! Essa é a letra {L}. Repita comigo: {L}!', each: 'L' },
    toque: { t: 'Toque na letra {L}!', each: 'L' },
    toqueMai: { t: 'Toque na letra {L} maiúscula!', each: 'L' },
    toqueMin: { t: 'Toque na letra {L} minúscula!', each: 'L' },
    procure: { t: 'Procure a letra {L}!', each: 'L' },
    qualMin: { t: 'Qual é a letra {L} minúscula?', each: 'L' },
    qualMai: { t: 'Qual é a letra {L} maiúscula?', each: 'L' },
    aventura: { t: 'Hoje vamos aprender a letra {L}!', each: 'L' },
    trofeu: { t: 'Parabéns, {nome}! Você completou a aventura da letra {L}!', each: 'L' },
    escolhaLetra: { t: 'Toque numa letra para conhecer!' },
    alfabeto: { t: 'Vamos cantar o alfabeto juntos! Repita comigo cada letrinha.' },
    alfabetoFim: { t: 'Muito bem! Agora você conhece o alfabeto inteirinho!' },

    // Traçado
    olhaComo: { t: 'Olha como se escreve a letra {L}.', each: 'L' },
    suaVez: { t: 'Agora é a sua vez! Passe o dedo por cima da letra, começando na bolinha verde.' },
    comece: { t: 'Comece na bolinha verde!' },
    tracinho: { t: 'Isso! Agora o próximo tracinho.' },
    escreveu: { t: 'Muito bem! Você escreveu a letra {L}!', each: 'L' },

    // Balões, memória e primeira letra
    baloes: { t: 'Estoure os balões com a letra {L}!', each: 'L' },
    memoria: { t: 'Encontre os pares: a letra maiúscula e a letra minúscula!' },
    par: { t: 'Achou o par da letra {L}!', each: 'L' },
    comeca: { t: 'Com que letra começa {W}?', each: 'W' },
    comecaCom: { t: '{W} começa com a letra {L}!', each: 'WL' },

    // Palavras
    vamosEscrever: { t: 'Vamos escrever {W}!', each: 'W' },
    palavra: { t: '{W}', each: 'W' },
    toqueOrdem: { t: 'Toque nas letras na ordem certa.' },
    precisamos: { t: 'Agora precisamos da letra {L}.', each: 'L' },
    escreveuPalavra: { t: 'Você escreveu {W}! Fala comigo: {W}!', each: 'W' },
    seuNome: { t: 'Vamos escrever o seu nome!' },
    vogaisOrdem: { t: 'Vamos colocar as vogais na ordem certa!' },
    vogaisFim: { t: 'Muito bem! Essas são as cinco vogais!' },
    escreveuNome: { t: 'Que lindo! Você escreveu o seu nome: {nome}!' },

    // Labirinto, ligar letras, trem e blocos
    labirinto: { t: 'Toque no caminho para levar o carrinho até a letra {L}!', each: 'L' },
    agoraLetra: { t: 'Agora a letra {L}!', each: 'L' },
    labFim: { t: 'Você achou todas as letras do labirinto!' },
    ligue: { t: 'Ligue as letras na ordem certa. Comece pela letra {L}!', each: 'L' },
    ligueFim: { t: 'Olha só o desenho que você fez!' },
    qualFalta: { t: 'Qual letra está faltando no trem?' },
    depoisDe: { t: 'Qual letra vem depois da letra {L}?', each: 'L' },
    depoisVogal: { t: 'Qual vogal vem depois da letra {L}?', each: 'L' },
    tremFim: { t: 'O trem está completo! Vamos ler juntos?' },
    pegueBloco: { t: 'Pegue o bloco da letra {L}!', each: 'L' },
    torre: { t: 'A torre ficou pronta!' },
    naOrdem: { t: 'Agora monte a torre na ordem das vogais!' },

    // Falar, ler e tempo
    oQueE: { t: 'O que é isso? Fala pra mim!' },
    issoE: { t: 'Isso é {W}. Repita comigo: {W}!', each: 'W' },
    falaPalavra: { t: 'Fala comigo: {W}!', each: 'W' },
    leiaEscolha: { t: 'Leia a palavra e toque na figura certa!' },
    leuCerto: { t: 'Isso mesmo! Aqui está escrito {W}!', each: 'W' },
    tempo: { t: 'Vamos ver quantas letras você acha antes do tempo acabar. Valendo!' },
    tempoFim: { t: 'Acabou o tempo! Que rapidez!' },
    recorde: { t: 'Uau! É um novo recorde!' },
    motor: { t: 'Vamos ligar a moto! Faz o barulho do motor bem forte, ou aperte o botão vermelho!' },
    motorFim: { t: 'A moto chegou! Que motor forte!' },
    fase: { t: 'Fala bem alto o nome de cada letra para passar de fase!' },
    faseFim: { t: 'Você passou de fase!' },
    trofeuOuro: { t: 'Você ganhou um troféu de ouro!' },
    trofeuPrata: { t: 'Você ganhou um troféu de prata!' },
    trofeuBronze: { t: 'Você ganhou um troféu de bronze!' },
    escrevaNome: { t: 'Vamos escrever o seu nome, letra por letra!' },
    escrevaPalavra: { t: 'Vamos escrever {W}, letra por letra!', each: 'W' },

    // Brincar com os sons
    monstro: { t: 'O monstrinho quer comer a letra {L}!', each: 'L' },
    monstroNham: { t: 'Nham nham! Que delícia!' },
    monstroEca: { t: 'Eca! Essa não!' },
    monstroCheio: { t: 'O monstrinho ficou de barriga cheia!' },
    qualOuviu: { t: 'Toque na figura que eu falar: {W}!', each: 'W' },
    rima: { t: 'Qual figura rima com {W}?', each: 'W' },
    rimaCerta: { t: 'Isso! {W} rima!', each: 'W' },
    temR: { t: 'Escuta: {W}. Tem o som do R?', each: 'W' },
    temRSim: { t: 'Isso! {W} tem o som do R!', each: 'W' },
    temRNao: { t: 'Isso! {W} não tem o som do R!', each: 'W' },
    escutaDeNovo: { t: 'Escuta de novo: {W}.', each: 'W' },
    continuar: { t: 'Vamos continuar a aventura da letra {L}!', each: 'L' },
    tambor: { t: 'Bata no tambor uma vez para cada pedacinho de {W}!', each: 'W' },
    contarJuntos: { t: 'Vamos contar juntos!' },
    suaVezTambor: { t: 'Agora é a sua vez de bater!' },
    roboFala: { t: 'Eu vou falar igual robô. Que palavra é essa?' },
    palavraE: { t: 'Isso! A palavra é {W}!', each: 'W' },
    mesmoSom: { t: 'Qual figura começa com o mesmo som de {W}?', each: 'W' },
    comecamIgual: { t: 'Isso mesmo! {W} começa com o mesmo som!', each: 'W' },
    vogalFalta: { t: 'Qual vogal está faltando em {W}?', each: 'W' },

    // Sílabas
    faz: { t: '{C} com {V} faz {S}!', each: 'CVS' },
    silaba: { t: '{S}', each: 'S' },
    repitaSil: { t: 'Repita comigo: {S}!', each: 'S' },
    familia: { t: 'Agora vamos ler a família da letra {L}!', each: 'L' }
  };
  const PRAISE = ['elogio1', 'elogio2', 'elogio3', 'elogio4', 'elogio5', 'elogio6', 'elogio7', 'elogio8'];
  const RETRY = ['quase1', 'quase2', 'quase3'];
  const SHORT = ['curto1', 'curto2', 'curto3', 'curto4'];

  App.data = {
    NAMES, NAMES_NEURAL, HEARD, VOWELS, ORDER, ALPHABET, WORDS, BUILD, SYL_CONS, SYL_VOWEL_TTS, syllable, STICKERS, R_WORDS, R_LEVELS, SYL_WORDS, NO_R, RHYMES, R_PAIRS,
    PH, PRAISE, RETRY, SHORT,
    isVowel: (L) => VOWELS.includes(L.toUpperCase()),
    word: (w) => {
      for (const L of ALPHABET) for (const x of WORDS[L]) if (x[0] === w) return x;
      for (const lv of BUILD) for (const x of lv) if (x[0] === w) return x;
      for (const k in R_WORDS) for (const x of R_WORDS[k]) if (x[0] === w) return x;
      for (const x of SYL_WORDS) if (x.w === w) return [x.w, x.w.toLowerCase(), x.e];
      for (const x of EXTRA) if (x[0] === w) return x;
      return [w, w.toLowerCase(), '❓'];
    },
    allWords: () => {
      const m = new Map();
      ALPHABET.forEach(L => WORDS[L].forEach(x => m.set(x[0], x)));
      BUILD.forEach(lv => lv.forEach(x => m.set(x[0], x)));
      Object.values(R_WORDS).forEach(lv => lv.forEach(x => { if (!m.has(x[0])) m.set(x[0], x); }));
      SYL_WORDS.forEach(x => { if (!m.has(x.w)) m.set(x.w, [x.w, x.w.toLowerCase(), x.e]); });
      EXTRA.forEach(x => { if (!m.has(x[0])) m.set(x[0], x); });
      return [...m.values()];
    },
    syllables: () => {
      const out = [];
      SYL_CONS.forEach(c => VOWELS.forEach(v => out.push(syllable(c, v))));
      return out;
    }
  };
})(window.App);
