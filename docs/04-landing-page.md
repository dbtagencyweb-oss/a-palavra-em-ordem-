# Prompt para o Claude Code · Landing page "A Palavra em Ordem"

Cole tudo abaixo no Claude Code, dentro do projeto do app.

---

Leia o CLAUDE.md. Vamos criar a landing page de vendas do app, em uma rota separada (`/lp`) ou num projeto irmão `lp/` com a mesma identidade. Objetivo único: vender o **Acesso Fundador (R$ 47/ano)**, com uma saída secundária para os **7 dias grátis** de quem ainda não está pronto.

## Direção de arte e técnica

- Mesma identidade do app: fundo ink `#1E2230` nas seções de cinema, paper `#F5EFE3` nas seções de leitura; dourado `#B8893A`, ember `#C4572E`, olive `#5D6B3B`. Fontes Fraunces (títulos), Newsreader (citações), Manrope (interface).
- Stack: Vite + React + TypeScript, **GSAP + ScrollTrigger** para reveal e parallax, **Lenis** para rolagem suave. Nada de bibliotecas pesadas além dessas.
- Imagens e vídeos já existem em `public/media/`: use os fundos de era (`era-d1` a `era-d7`), as medalhas (`simbolo-*`), os vídeos (`d1-labirinto`, `d4-mar-aberto`, `d6-tumulo`, `d7-pentecostes`) e a capa `capa-jesus-em-ordem`.
- Mobile first (390 px). Desktop com mais respiro e parallax mais profundo.
- Performance: LCP abaixo de 2,5 s no 4G. Hero com poster estático, vídeo só depois de carregar. Imagens lazy, webp, `srcset`.
- Acessibilidade: com `prefers-reduced-motion`, todos os efeitos viram fade simples; o conteúdo nunca depende da animação para ser lido.
- Botões de compra apontam para `CHECKOUT_URL` (variável de ambiente). Botões grátis apontam para `APP_URL/?start=1`.
- Rastreamento: Meta Pixel com `ViewContent` no carregamento, `Lead` no clique grátis, `InitiateCheckout` no clique de compra e eventos de rolagem a 25, 50, 75 e 100%. Preserve UTMs nos links.

## Mecânicas que dão recompensa imediata (usar ao longo da página)

1. **Barra de jornada no topo:** uma linha dourada fina que enche conforme a rolagem, com pegadas pequenas na ponta. No fim da página, a candeia acende.
2. **Pegadas que seguem a rolagem** na lateral esquerda, só no desktop.
3. **Quiz de 1 toque** (seção 3): resposta instantânea com som opcional, brilho e "+10 passos".
4. **Mini jogo de ordenar** (seção 5): ao acertar, explosão suave de partículas de luz, a candeia acende e o contador de passos sobe.
5. **Medalhas que viram ouro** ao entrar na tela (seção 6), com leve inclinação 3D ao passar o dedo ou o mouse.
6. **Contador de passos** fixo no canto, que sobe com as interações. É uma prévia da gamificação do app.
7. **Barra fixa de compra no mobile:** aparece depois do hero e some na seção de oferta, com preço e botão.

Som: desligado por padrão, com um botão de alto-falante no canto. Se o visitante ligar, toque `tap`, `correct` e `lamp_ignite` do app.

---

## Seções e copy

### 0 · Pré-carregamento (máx. 1,2 s)
Fundo ink. A candeia da logo se desenha e acende; o brilho abre a tela para o hero.

### 1 · Hero (parallax em 3 camadas com o `era-d1`: céu, terra com a estrada e a candeia em primeiro plano)

- Eyebrow: `PARA QUEM AMA A BÍBLIA E SE PERDE NELA`
- Título (reveal palavra por palavra):
  **Você ama a Palavra.**
  **Só nunca recebeu o mapa.**
- Subtítulo: A Palavra em Ordem coloca a Bíblia inteira na sequência da história e te guia um passo por dia, em 5 minutos, com lições interativas, cenas em vídeo e um caminho que você vê crescer.
- Botão principal: **Quero o Acesso Fundador · R$ 47/ano**
- Botão secundário (texto com sublinhado): Prefiro começar pelos 7 dias grátis
- Linha de confiança: Garantia de 30 dias · Acesso na hora · Funciona no celular, sem baixar nada
- Ao rolar, a estrada do fundo se acende da candeia até o horizonte (máscara animada pelo scroll).

### 2 · A dor (fundo ink, frases revelando uma por linha ao rolar, cada uma ocupando a tela)

1. Você abre em Gênesis decidido: *dessa vez eu vou até o fim.*
2. Os primeiros capítulos voam.
3. Aí chegam as leis, as genealogias, os reis com nomes parecidos.
4. Você não sabe mais quem veio antes de quem.
5. A leitura para. A culpa fica.
6. **Não é falta de fé.**
7. **É falta de mapa.**

### 3 · A virada (fundo paper)

- Título: **A Bíblia não está em ordem cronológica.**
- Texto: São 66 livros agrupados por tipo: lei, história, poesia, profecia e carta. Quem lê de capa a capa pula séculos sem perceber. Ninguém te contou isso, e é por isso que parecia difícil.
- **Quiz de 1 toque:** "Quem veio primeiro?" com dois cartões: **Abraão** | **Moisés**.
  - Acertou (Abraão): o cartão vira, brilha e mostra "Isso. Abraão veio séculos antes de Moisés. Agora imagine enxergar a Bíblia inteira assim." · +10 passos.
  - Errou: o cartão balança de leve e mostra "Quase todo mundo hesita aqui. É exatamente isso que o mapa resolve." · +5 passos por tentar.

### 4 · O mecanismo (seção fixada com scroll)

- Título: **Nós colocamos a Palavra em ordem.**
- Animação: 66 lombadas de livros embaralhadas numa estante. Conforme a rolagem, elas deslizam e se reorganizam na ordem da história, agrupadas em 7 blocos coloridos com as cores das eras. Ao terminar, aparece um caminho ligando os blocos: Criação → Abraão → Êxodo → Reis → Exílio → Jesus → Igreja.
- Legenda final: Uma história só. Do Éden à Nova Jerusalém.

### 5 · Mini jogo (fundo ink)

- Título: **Experimente 1 minuto do app.**
- Instrução: Coloque a história da Bíblia em ordem.
- Botões embaralhados: Criação · Queda · Redenção · Restauração. Toque preenche as vagas.
- Acerto: partículas de luz, a candeia acende, "+10 passos", e o texto **"Você acabou de entender o esqueleto da Bíblia inteira. Imagine 7 dias assim."** + botão **Quero continuar a jornada**.
- Erro: tremida leve, "Quase. O que vem primeiro, o mundo bom ou o mundo quebrado?", reinicia em 1,4 s.

### 6 · O app por dentro (celular fixo no centro, telas trocando com o scroll)

Cada passo troca a tela do mockup e revela o texto ao lado:

1. **Um mapa que você percorre.** Cada dia concluído deixa suas pegadas no caminho, do Éden à Nova Jerusalém.
2. **Lições de 5 minutos.** Um card, uma ideia. Leitura leve, sem enrolação.
3. **Cenas que você não esquece.** O mar se abrindo, a sarça, o túmulo vazio, em vídeo, nos momentos marcantes. (Toca um trecho de `d4-mar-aberto` no mockup.)
4. **Toque, arraste, acerte.** Atividades que fixam na memória o que você leu.
5. **A lâmpada acesa.** Cada dia cumprido acende sua lâmpada. Perdeu um dia? A Graça protege sua sequência.
6. **Sua coleção de símbolos.** A lâmpada, a árvore, as estrelas, o cordeiro, a coroa, a cruz, a cidade. As 7 medalhas aparecem em fila e viram ouro uma a uma.
7. **Seu diário com Deus.** O que você aprendeu, o versículo que marcou, pelo que quer orar.

### 7 · Versículo (parallax com o vídeo `d1-labirinto` ao fundo)

> "Não ardia o nosso coração quando ele nos abria as Escrituras?"
> Lucas 24:32

Texto curto abaixo: Foi o que dois discípulos sentiram quando Jesus mostrou como toda a Escritura se ligava. É isso que acontece quando a Bíblia faz sentido.

(Confirme a redação na tradução que o app adotar.)

### 8 · A jornada completa (linha do tempo horizontal no desktop e vertical no mobile, cada etapa com reveal)

1. **Mapa da Bíblia em 7 dias:** a visão do todo. (Fundos de era passando.)
2. **Jesus em Ordem:** os quatro Evangelhos na sequência dos acontecimentos, em 30 dias. (Capa `capa-jesus-em-ordem`.)
3. **A Bíblia em Ordem:** a leitura completa na ordem da história, com novas etapas todo mês.
4. **GuiaVerbo:** um assistente de estudo para tirar dúvidas, em breve para Fundadores.

### 9 · Para quem é

**É para você se:**
- Já tentou ler a Bíblia inteira e parou no meio.
- Ouve nomes como Abraão, Moisés e Davi, mas não sabe a ordem.
- Chegou à fé há pouco e quer começar do jeito certo.
- Quer voltar a ter constância, um dia de cada vez.

**Não é para você se:** procura um substituto para a igreja, a oração ou o seu pastor. O app é um apoio para a sua leitura, não um lugar no lugar deles.

### 10 · Oferta (fundo ink, card dourado central)

- Eyebrow: `ACESSO FUNDADOR`
- Título: **Toda a jornada, liberada aos poucos, pelo menor preço que ela vai ter.**
- Lista com checks animados:
  - Mapa da Bíblia em 7 dias
  - Jesus em Ordem: 30 dias pelos Evangelhos
  - A Bíblia em Ordem: novas etapas todo mês durante o ano
  - Cenas em vídeo, áudio das lições e atividades interativas
  - Diário Espiritual, lâmpada acesa e coleção de símbolos
  - GuiaVerbo assim que for lançado
- Preço: **R$ 47 por ano** · *menos de 13 centavos por dia*
- Por que "Fundador": O app está sendo construído agora. Quem entra nesta fase paga o menor preço que ele vai ter, recebe tudo o que for lançado durante o ano e ajuda a decidir os próximos passos.
- Urgência (só com prazo real; preencha antes de publicar): **O preço de Fundador vale até [DATA REAL].** Depois disso, o valor passa a ser [VALOR REAL].
- Botão: **Garantir meu Acesso Fundador**
- Garantia (selo animado): **30 dias de garantia incondicional.** Se não for para você, devolvemos 100% do valor. Sem perguntas.
- Linha abaixo: Pagamento seguro · Pix ou cartão · Acesso enviado na hora

### 11 · Perguntas frequentes (acordeão)

- **Preciso baixar algum aplicativo?** Não. Abre direto no navegador do celular e pode ser adicionado à tela inicial como um app.
- **Serve para quem nunca leu a Bíblia?** Sim. Foi feito para quem está começando.
- **É de alguma denominação?** Não. O conteúdo é cristão e interdenominacional.
- **E se eu ficar alguns dias sem ler?** A jornada espera por você. A Graça protege sua sequência um dia por semana.
- **O app substitui a leitura da Bíblia?** Não. Ele organiza o caminho e indica a passagem para você ler na sua Bíblia.
- **Renova automaticamente?** [Defina antes de publicar e escreva aqui com clareza.]
- **Posso começar de graça?** Pode. Os 7 primeiros dias são grátis. Mas o preço de Fundador é para quem entra agora.

### 12 · Fechamento (parallax com `era-d7`, a cidade dourada)

- Título (reveal lento): **Hoje pode ser o seu Dia 1.**
- Citação: "Lâmpada para os meus pés é a tua palavra." Salmo 119:105
- Botão principal: **Quero o Acesso Fundador · R$ 47/ano**
- Secundário: Começar os 7 dias grátis
- A candeia da barra de jornada acende por completo quando esta seção entra na tela.

### Saída da página (desktop: cursor saindo da janela; mobile: botão voltar, uma vez por sessão)

Janela leve: **Antes de ir: comece de graça.** Os 7 primeiros dias do mapa, sem cartão. Botão: **Começar os 7 dias grátis**. Fechar sempre visível.

---

## Regras da página

- Não usar cronômetro falso, contador de vagas inventado ou "X pessoas comprando agora" sem dado real.
- Depoimentos só reais, com permissão, e só depois do teste com os irmãos. Até lá, a seção não existe.
- Nenhuma promessa de resultado espiritual ("Deus vai mudar sua vida em 7 dias"). A promessa é entender a Bíblia em ordem.
- Citações bíblicas curtas, com referência, na tradução que o app adotar.

Comece pela estrutura e pelo hero, me mostre rodando no celular, e depois siga seção por seção.
