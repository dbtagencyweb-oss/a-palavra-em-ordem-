# Como começar no Claude Code

## Preparação (uma vez)

1. Instale o Claude Code seguindo o guia oficial (docs.claude.com → Claude Code) e confira se tem Node.js 20 ou mais novo (`node -v`).
2. Descompacte esta pasta onde você guarda seus projetos, por exemplo `~/Projetos/a-palavra-em-ordem`.
3. Abra o terminal dentro dela e rode `git init` e depois `claude`.
4. Cole o **Prompt do Sprint 1**, abaixo. Espere ele terminar, rode `npm run dev` e teste no celular
   (mesma rede Wi-Fi, endereço que o Vite mostrar com `--host`).
5. Só passe para o próximo sprint quando o atual estiver funcionando. Correções finas ficam para o Sprint 5.

As mídias não travam nada: o app mostra um placeholder com o id até você colocar o arquivo em
`public/media/`. Vá gerando as imagens e vídeos do `docs/03-roteiro-de-midia.md` em paralelo.

---

## Prompt do Sprint 1 · Base, telas e motor de lição

```
Leia o CLAUDE.md e os arquivos em docs/ e content/. Abra reference/prototipo.html para ver o visual e o tom.

Objetivo deste sprint: o app rodando com a Trilha 1 inteira lida do JSON, ainda sem sons e sem vídeos reais.

1. Crie o projeto (Vite + React + TS + Tailwind + Framer Motion) com os tokens de docs/02-design-som-midia.md.
2. Telas: Boas-vindas, Diagnóstico, Recomendação, Home/Mapa, Lição, Conclusão — fiéis ao protótipo.
3. Motor de lição: lê content/trilha-mapa-7-dias.json e renderiza cada card pelo campo "tipo",
   um componente por tipo em src/cards/. Cards "cena" e campos "midia" mostram placeholder com o id.
4. Atividades "ordenar", "ligar" e "quiz" funcionando, com feedback de acerto e erro do JSON.
5. Gamificação em src/game/ como funções puras com testes (Vitest): lâmpada, graça, passos,
   desbloqueio diário, símbolos e marcos, exatamente como em docs/01-produto.md.
6. ProgressStore com implementação em localStorage.
7. Um botão de desenvolvedor (só em modo dev) para "avançar um dia" e "zerar progresso".

Trabalhe em etapas, me mostre cada tela pronta e rode os testes no fim. Não altere texto de conteúdo.
```

## Prompt do Sprint 2 · Som, cenas e transições

```
Sprint 2: deixar a experiência viva.

1. src/sound/SoundManager.ts com Howler: desbloqueio no primeiro toque, volume global 0.6,
   mudo persistido, respeito ao modo silencioso. Mapeie todos os sons da tabela em
   docs/02-design-som-midia.md. Enquanto os arquivos não existem, gere sons provisórios curtos
   com Web Audio (osciladores simples) para eu já sentir o ritmo.
2. Transições entre cards e entre telas com Framer Motion conforme a tabela de Movimento.
   Toda transição dispara o som correspondente.
3. Componente Scene para cards "cena": vídeo 9:16 em tela cheia, mudo, playsInline, poster,
   legenda e referência; som scene_in + ambiente do content/midia.json em loop com fade.
   Pré-carregue a mídia do próximo card. Com prefers-reduced-motion, mostre o poster sem autoplay.
4. SmartImage: webp com srcset, fade-in ao carregar, gradiente no terço inferior.
5. Tela de Conclusão animada: lâmpada acendendo (lamp_ignite), números contando, day_complete,
   símbolo virando ouro (symbol_unlock). Tela Coleção de símbolos.
6. Vibração leve no Android em acerto e erro.
```

## Prompt do Sprint 3 · Diário, perfil e PWA

```
Sprint 3:
1. Diário completo (lista, novo registro com os 5 campos, reflexões das lições entrando automaticamente).
2. Perfil com estatísticas, som liga/desliga, horário do lembrete.
3. GuiaVerbo como tela "em breve" com o aviso fixo.
4. PWA com vite-plugin-pwa: ícones, manifest, cache do conteúdo visitado, funciona offline.
5. Lembrete diário por notificação. No iPhone, uma tela que ensina a adicionar à tela inicial.
6. BookCard (ficha do livro) a partir de content/livros.json, aberto pelos cards "mapa". Mostre só campos preenchidos.
```

## Prompt do Sprint 4 · Conta, dados e venda

```
Sprint 4:
1. Supabase: login por link mágico e Google, depois do Dia 1 ("Salve sua jornada").
   Tabelas de progresso, diário e assinatura, com RLS. Implementação Supabase do ProgressStore,
   migrando o que estiver no localStorage.
2. track() com os eventos de docs/01-produto.md (me pergunte qual destino usar).
3. Folha de Oferta (Acesso Fundador, R$ 47/ano) e integração com o checkout que eu escolher
   (Hotmart ou Kiwify): webhook numa Edge Function do Supabase que libera o acesso.
4. Trilha 2 bloqueada aparecendo na Home para quem não é Fundador.
```

## Prompt do Sprint 5 · Correções finais

```
Sprint 5: revisão geral.
1. Percorra a Trilha 1 inteira no tamanho 390 px e liste tudo que estiver desalinhado, lento ou confuso.
2. Confira acessibilidade (contraste, foco, aria-live) e performance (tamanho do bundle, peso das mídias).
3. Rode o Playwright no fluxo completo do Dia 1 ao Dia 7 com o avanço de dia de desenvolvedor.
4. Me entregue uma lista de correções priorizada antes de mudar qualquer coisa.
```

## Dicas para conversar com o Claude Code

- Um pedido por vez. "Agora deixe o card de ordenar com o mesmo movimento do protótipo" funciona melhor que dez pedidos juntos.
- Quando algo ficar diferente do que você imaginou, mande print e diga o que mudar.
- Ao colocar mídias novas, peça: "confira se todos os ids do content/midia.json têm arquivo e me liste os que faltam".
- Se a conversa ficar longa, comece uma nova sessão: o CLAUDE.md garante que ele lembra das regras.
