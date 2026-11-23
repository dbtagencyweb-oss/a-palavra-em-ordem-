# A Palavra em Ordem — regras do projeto

Leia este arquivo inteiro antes de qualquer tarefa. Ele vale para todas as sessões.

## O que estamos construindo

Um app (PWA) de jornada bíblica guiada e gamificada. A promessa do produto é uma só:
**entender a Bíblia inteira, em ordem, 5 minutos por dia.**

O usuário avança por um mapa-caminho (do Éden à Nova Jerusalém). Cada dia é uma lição curta
feita de cards, com atividades de toque, cenas em vídeo nos momentos marcantes, efeitos sonoros
nas transições e um símbolo bíblico desbloqueado no fim.

Trilha 1 (grátis): **Mapa da Bíblia em 7 dias** — conteúdo completo e revisado em
`content/trilhas/mapa-7-dias/` (um arquivo por dia, com status).
Trilha 2 (paga, Acesso Fundador): **Jesus em Ordem** — os 4 Evangelhos em ordem cronológica, 30 dias.
Depois: **A Bíblia em Ordem** — plano cronológico completo, liberado em etapas.

Documentos de referência (leia quando a tarefa tocar o assunto):
- `docs/01-produto.md` — telas, fluxos, gamificação, tipos de card, eventos de analytics, fases.
- `docs/02-design-som-midia.md` — identidade visual, movimento, sons, especificação de imagem e vídeo.
- `docs/03-roteiro-de-midia.md` — lista de cada imagem e vídeo, com prompt de geração.
- `reference/prototipo.html` — protótipo funcional do Dia 1 (fonte da verdade para o visual e o tom).

## Stack

- Vite + React + TypeScript (strict).
- Tailwind CSS com os tokens de `docs/02-design-som-midia.md` em `tailwind.config`.
- Framer Motion para transições e animações.
- Howler.js para áudio (um único `SoundManager`, nunca `new Audio()` espalhado).
- `vite-plugin-pwa` (instalável, offline para o conteúdo já visitado).
- Supabase para login, progresso, diário e status de assinatura. Até o Sprint 4, progresso fica em
  `localStorage` atrás de uma interface `ProgressStore`, para trocar de implementação sem mexer nas telas.
- Testes: Vitest + Testing Library para lógica (gamificação, desbloqueio, streak); Playwright para o
  fluxo completo do Dia 1.

## Estrutura de pastas

```
content/            conteúdo como dados (JSON) — nunca texto de lição dentro de componentes
  trilhas/<id>/      uma trilha por pasta: trilha.json + dia-XX.json (status: rascunho, em_revisao, publicado)
  livros.json       fichas dos 66 livros (campos null = a preencher e verificar)
  midia.json        catálogo de imagens, vídeos e símbolos por id
public/media/img/   imagens (webp), nome = id do catálogo
public/media/video/ vídeos (mp4 + webm + poster .jpg), nome = id do catálogo
public/audio/sfx/   efeitos sonoros (mp3 + webm/ogg)
src/
  cards/            um componente por tipo de card (ver docs/01-produto.md)
  activities/       atividades interativas reutilizáveis (ordenar, ligar, linha do tempo...)
  game/             regras de lâmpada, graça, passos, símbolos, desbloqueio (funções puras + testes)
  sound/            SoundManager e mapa de sons
  media/            componentes Scene (vídeo), SmartImage, preload
  screens/          Boas-vindas, Diagnóstico, Recomendação, Home/Mapa, Lição, Conclusão, Diário, GuiaVerbo, Perfil, Oferta
  store/            ProgressStore (local e Supabase)
```

## Regras de conteúdo (inegociáveis)

1. **Todo texto de lição vem de `content/`.** Não invente, não reescreva e não "melhore" texto
   de conteúdo sem pedido explícito: ele foi revisado doutrinariamente.
2. **Não reproduza o texto bíblico.** O app mostra a referência (ex.: "Lucas 24:13-27"), um resumo
   próprio e um link para leitura externa. Traduções como NVI, ARA, NAA e NVT têm direitos autorais.
3. **Material de terceiros não entra no projeto.** Os PDFs "Jornada da Bíblia" e "Os 4 Evangelhos"
   usados como referência pertencem a outra pessoa. Deles aproveitamos só *tipos de elemento*
   (ficha técnica do livro, linha do tempo de eventos com referência, personagens, curiosidades).
   Nenhum texto, imagem, tabela ou layout deles é copiado. Fatos (ex.: Gênesis tem 50 capítulos)
   são livres; a redação é sempre nossa e precisa ser verificada.
4. **Linha doutrinária:** cristã evangélica, interdenominacional. Onde igrejas divergem (datas da
   criação e do êxodo, dons espirituais, milênio), o app não toma partido.
5. **Representação:** Deus nunca é mostrado como pessoa (luz, fogo, nuvem). O rosto de Jesus nunca
   aparece (de costas, mãos, silhueta, distância). Sem nudez, sem sangue explícito, sem violência gráfica.
6. **Tom de voz:** acolhedor, direto, sem culpa e sem medo. Frase-guia: "não é falta de fé, é falta de mapa".
   Erro em atividade nunca humilha: dá uma pista e deixa tentar de novo.
7. Português do Brasil em toda a interface. Código, nomes de variáveis e commits em inglês.

## Regras de experiência

- Cada lição dura 5 a 7 minutos. Um card = uma ideia. Texto de card com no máximo ~70 palavras.
- Toda transição tem som **e** respeita o botão de som (padrão: ligado, volume 0.6) e o modo silencioso.
- `prefers-reduced-motion`: troque movimentos por fades curtos e não dê autoplay em vídeo.
- Vídeos: mudos por padrão (o som vem do SoundManager), `playsInline`, `muted`, poster sempre presente,
  carregar só o vídeo do card atual e pré-carregar o próximo.
- Mobile first, largura de referência 390 px, alvo de toque mínimo de 44 px.
- Acessibilidade: contraste AA, foco visível, `aria-live` para feedback de acerto e erro, legenda de texto
  em toda cena de vídeo.
- Performance: primeiro carregamento abaixo de 300 KB de JS comprimido; mídia sempre sob demanda.

## Como trabalhar comigo (Diego)

- Trabalhe em passos pequenos e mostre o resultado rodando (`npm run dev`) antes de seguir.
- Antes de instalar uma dependência nova fora da stack acima, pergunte.
- Quando faltar uma imagem, vídeo ou som, use um placeholder visível com o id do catálogo
  (ex.: caixa escura escrito `d4-sarca`) e siga em frente. As mídias reais chegam depois.
- Ao terminar cada sprint: rode os testes, liste o que ficou pronto, o que ficou pendente e qual é o próximo passo.
- Commits pequenos, mensagens em inglês no imperativo.
