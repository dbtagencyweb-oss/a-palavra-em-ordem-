# 05 · Narrações — voz, roteiros e integração

Salve este arquivo como `docs/05-narracoes.md` no projeto.

## Antes de tudo: o texto é nosso

As narrações **recontam** os trechos bíblicos com redação própria. Elas não leem uma tradução palavra por palavra, porque as traduções em português (NVI, ARA, NAA, NVT) têm direitos autorais. Frases muito curtas e conhecidas ("haja luz", "ele não está aqui") aparecem como citação breve. Se a igreja adotar uma tradução licenciada, essas frases podem ser ajustadas para ela.

Cada narração tem no máximo cerca de 25 palavras, o que dá até 10 segundos. Os vídeos têm 5 a 6 segundos, e o app segura o último quadro até a narração terminar.

---

## 1 · A voz do narrador

Use **uma voz principal** em todo o app, para virar parte da identidade. Uma segunda voz, opcional, só para as orações.

**Prompt de criação da voz principal** (para ferramentas que criam voz a partir de descrição, como o Voice Design do ElevenLabs, ou para orientar o estilo no Gemini TTS):

```
Voz masculina adulta, entre 40 e 55 anos, português do Brasil com sotaque neutro. Timbre grave e quente, levemente rouco, muito próximo do microfone, como alguém contando uma história a uma pessoa só. Ritmo calmo, pausas naturais entre as frases, sem pressa. Tom de contador de histórias, acolhedor e reverente, nunca de pregador, locutor de rádio ou trailer de filme. Sem eco, sem música de fundo.
```

**Prompt da voz das orações (opcional):**

```
Voz feminina adulta, entre 30 e 45 anos, português do Brasil com sotaque neutro. Timbre suave e quente, falado baixo e perto do microfone, como uma oração dita em voz alta no quarto. Ritmo lento, pausas longas, tom íntimo e sereno, sem dramatização. Sem eco, sem música de fundo.
```

**Direção para cada gravação** (cole junto do texto se a ferramenta aceitar instruções de estilo):

```
Leia devagar, com calma e reverência. Faça uma pausa curta depois de cada ponto. A última frase é a mais importante: diga com um pouco mais de peso e silêncio antes dela.
```

Se usar o ElevenLabs no modelo que aceita marcações de emoção entre colchetes, dá para pôr `[softly]` no início e `[pause]` onde quiser respiro. Teste antes: se a voz ler a marcação em voz alta, tire.

**Especificação dos arquivos:**
- MP3 mono, 44,1 kHz, 128 kbps
- Volume normalizado em −16 LUFS
- 0,3 s de silêncio no início e no fim
- Nome: `narr-<id>.mp3`, na pasta `public/audio/narr/`

---

## 2 · Roteiros

### Abertura

**`narr-intro-luz`** · Abertura de cinema (vídeo `intro-luz`)
> Uma lâmpada se acende. Um caminho aparece. Esta é a história inteira da Bíblia. Em ordem.

### Cenas dos 7 dias

**`narr-d1-labirinto`** · Dia 1, abertura
> Muita gente ama a Bíblia e se perde nela. Não é falta de fé. É falta de mapa.

**`narr-d2-criacao`** · Dia 2, abertura (Gênesis 1)
> No princípio, tudo era escuro e sem forma. Então Deus disse: haja luz. E houve luz.

**`narr-d3-estrelas`** · Dia 3 (Gênesis 15)
> Deus levou Abraão para fora da tenda e disse: olhe para o céu e conte as estrelas, se puder. Assim será a sua descendência.

**`narr-d4-sarca`** · Dia 4 (Êxodo 3)
> No deserto, Moisés viu uma sarça que ardia e não se consumia. Ali, Deus o chamou pelo nome.

**`narr-d4-mar-aberto`** · Dia 4 (Êxodo 14)
> À frente, o mar. Atrás, o exército do faraó. E Deus abriu um caminho onde não havia caminho.

**`narr-d5-templo`** · Dia 5 (1 Reis 8)
> Salomão construiu o templo em Jerusalém. Por séculos, ali o povo buscou a presença de Deus.

**`narr-d6-sinagoga`** · Dia 6 (Lucas 4)
> Em Nazaré, Jesus abriu o livro do profeta Isaías, leu diante de todos e disse: hoje isto se cumpriu.

**`narr-d6-tumulo`** · Dia 6, o momento mais forte (Lucas 24)
> No primeiro dia da semana, bem cedo, elas foram ao túmulo. A pedra tinha sido removida. Ele não está aqui. Ressuscitou.

**`narr-d7-pentecostes`** · Dia 7 (Atos 2)
> De repente, veio do céu um som como de um vento forte. O Espírito encheu cada um deles. Ali, a igreja nasceu.

**`narr-d7-cidade`** · Dia 7, fim da trilha (Apocalipse 21 e 22)
> No fim, Deus fará novas todas as coisas. Não haverá mais lágrima nem dor. E a árvore da vida estará de novo ao nosso alcance.

### Conclusão do dia

**`narr-conclusao`** · Tela de Conclusão, dias 1 a 6 (Salmo 119:105)
> Lâmpada para os meus pés é a tua palavra. Até amanhã.

**`narr-conclusao-final`** · Tela de Conclusão do Dia 7
> Você viu a história inteira. Do Éden à Nova Jerusalém. Agora, cada livro que você abrir tem o seu lugar.

### Orações (opcional, voz das orações)

**`narr-oracao-d1` a `narr-oracao-d7`**: use o texto do card `oracao` de cada dia em `content/trilhas/mapa-7-dias/dia-XX.json`, sem alterar. Esse texto é nosso e já foi revisado.

### Landing page (só toca quando a pessoa aperta "Ouvir")

**`narr-lp-hero`** · Hero
> Você ama a Palavra. Só nunca recebeu o mapa.

**`narr-lp-versiculo`** · Seção do versículo (Lucas 24:32)
> Dois discípulos caminhavam sem entender. Então Jesus abriu as Escrituras para eles. E depois disseram: não ardia o nosso coração?

**`narr-lp-fechamento`** · Fechamento
> Lâmpada para os meus pés é a tua palavra. Hoje pode ser o seu Dia 1.

---

## 3 · Comando para o Claude Code

```
Leia o CLAUDE.md e o docs/05-narracoes.md. Vamos integrar narração em voz no app e na landing page.

1. CONTEÚDO
   - Crie content/narracoes.json com cada narração: id, texto (exatamente como no docs/05-narracoes.md, sem alterar nenhuma palavra), voz ("principal" ou "oracao"), onde aparece (id do card, da tela ou da seção da LP) e status ("pendente" até o arquivo existir).
   - Nos cards do tipo "cena" em content/trilhas/mapa-7-dias/dia-XX.json, adicione o campo "narracao" apontando para o id correspondente. Faça o mesmo para a tela de Conclusão, a abertura de cinema e os cards de oração (opcional).
   - Inclua as narrações no npm run check:media.

2. PLAYER DE NARRAÇÃO (dentro do SoundManager, num canal próprio)
   - Canal "narração" separado de efeitos e ambiente, com volume próprio.
   - Quando uma narração toca, baixe o som ambiente para 20% (ducking com fade de 300 ms) e volte ao normal quando ela acabar.
   - Nas cenas: o vídeo começa, toca o scene_in e, 400 ms depois, a narração. O vídeo para no último quadro até a narração terminar.
   - O botão "Continuar" fica liberado desde o início: tocar avança e corta a narração com fade de 200 ms.
   - Pré-carregue a narração do próximo card.
   - Se o arquivo não existir, o app segue normalmente, só com a legenda.

3. LEGENDA
   - Toda narração tem legenda na tela: o texto aparece na parte de baixo da cena, frase por frase, sincronizado pelo tempo do áudio (divida a duração pelo número de palavras de cada frase).
   - A legenda aparece mesmo com o som desligado. É assim que muita gente vai ver.

4. CONTROLES
   - No Perfil: interruptor "Narração em voz" (ligado por padrão), separado do interruptor de efeitos sonoros.
   - Nas cenas: um ícone pequeno de alto-falante no canto para repetir a narração.
   - Respeite a regra dos navegadores: nada toca antes do primeiro toque do usuário. A abertura de cinema só roda depois do botão "Começar minha jornada".

5. LANDING PAGE
   - Nas seções hero, versículo e fechamento, coloque um botão discreto "▶ Ouvir" com uma onda sonora animada enquanto toca.
   - Nunca toque sozinho. Ao tocar, mostre a legenda com o mesmo efeito de reveal palavra por palavra da página.

6. TESTE
   - Gere arquivos provisórios com a voz do próprio sistema (Web Speech API, pt-BR) só no modo dev, para eu sentir o ritmo antes de ter as gravações reais. Marque claramente como provisório.
   - Me mostre a cena do d6-tumulo funcionando com vídeo, narração, legenda e ducking.
```

---

## 4 · Ordem de gravação sugerida

1. `narr-d6-tumulo`: é a cena mais forte. Use para testar e escolher a voz.
2. `narr-intro-luz` e `narr-d1-labirinto`: são as primeiras que todo mundo ouve.
3. As outras cenas, a Conclusão e, por fim, a landing page e as orações.
