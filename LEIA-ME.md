# Ensinando a Ler

Aplicativo de alfabetização para o Heitor: reconhecer letras (vogais e consoantes, maiúsculas e
minúsculas), escrever com o dedo, aprender a ordem do alfabeto, juntar sílabas, formar e ler
palavras e falar em voz alta — sempre com um avatar que conversa com ele por voz natural.

## Como abrir

- **No computador:** dê dois cliques em `ABRIR - Ensinando a Ler.bat`. Ele abre o app no navegador
  em `http://localhost:8790/` (deixe a janelinha preta minimizada aberta enquanto usa).
  Use o **Chrome** ou o **Edge**.
- Sem o `.bat`, também funciona abrindo o `index.html` direto.
- **No celular/tablet:** o app se ajusta à tela, mas precisa estar publicado num endereço `https`
  (por exemplo GitHub Pages ou Netlify) para o microfone e a voz natural funcionarem. Depois de
  aberto no Chrome do celular: menu ⋮ → "Adicionar à tela inicial".

Na primeira vez a voz natural é baixada (cerca de 330 MB no computador). Depois fica guardada e
o app funciona sem internet.

## O que tem

| Objetivo | Brincadeiras |
| --- | --- |
| 🚀 Caminho guiado | **Aventura**: uma letra por vez, passando por conhecer, repetir, escrever, encontrar, falar e joguinhos |
| 🔤 Conhecer as letras | Alfabeto, Cantar o alfabeto, Encontre a letra, Achar o par (Aa), Memória Aa, Balões |
| 🗣️ Falar em voz alta | Que letra é essa?, Repita comigo, Desafio de voz (fases), Mostre e fale, Motor do R |
| 👂 Brincar com os sons | Tambor das sílabas, Fala de robô, Mesmo som, Vogal que falta — jogos de ouvido que preparam para ler |
| 🚂 Ordem das letras | Trem das letras, Ligue as letras, Labirinto — com as vogais, o alfabeto ou o nome dele |
| ✍️ Escrever e montar | Escrever com o dedo, Escrever meu nome, Blocos de vogais, Formar palavras |
| 📖 Ler | Sílabas, Começa com..., Leia e escolha, Corrida do tempo |

- **Estrelas, adesivos e troféus**: cada acerto vale uma estrela; a cada 10, um adesivo; cada
  brincadeira terminada dá um troféu de bronze, prata ou ouro.
- **Voz**: 8 vozes naturais (4 femininas e 4 masculinas) em ⚙️ Área dos pais → Voz. Também dá
  para gravar a sua própria voz para qualquer fala (aba Gravações).
- **Microfone**: nas atividades de falar o app escuta a criança. Quando ele não entende, use os
  botões "✔ Acertou" e "✖ Ainda não".
- **Área dos pais** (⚙️): nome, menino/menina, avatar, dificuldade, vozes, gravações e um resumo
  do progresso com sugestão do que treinar no dia.

## Privacidade

Tudo fica neste aparelho: configurações, progresso e gravações. As vozes naturais são geradas no
próprio computador. O reconhecimento de voz é o do navegador (no Chrome, usa o serviço do Google).

## Pastas

- `index.html`, `css/`, `js/` — o aplicativo (não precisa instalar nada).
- `assets/3d/` — peças 3D renderizadas no Blender (letras, blocos, robô, troféus, trem, carro...).
- `assets/3d/avatar/tico.blend` e `tico.glb` — o robô Tico em 3D, com esqueleto e 7 animações
  (parado, acenar, falar, ouvir, pular, dançar, voar). Para refazer depois de mudar o desenho:
  `blender -b -P tools/blender/tico.py -- all <pasta>`, `python tools/blender/tico_folhas.py <pasta>`
  e `node tools/montar-meta.js`.
- `css/espaco.css` — tema espacial do painel inicial e da abertura.
- `tools/blender/` — scripts que geram as peças 3D. Depois de renderizar de novo, rode
  `node tools/montar-meta.js` para atualizar `js/assets-meta.js`.
