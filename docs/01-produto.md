# 01 · Produto — telas, gamificação e regras

## Fluxo principal

```
Boas-vindas → Diagnóstico (5 opções) → Recomendação → Lição do Dia 1 → Conclusão → Home/Mapa
Home/Mapa → Lição do dia liberado → Conclusão → Home
Dia 5 (card de oferta) e Dia 7 (marco final) → Oferta Fundador → Checkout externo
```

O usuário só cria conta (Supabase, login por e-mail com link mágico ou Google) depois de concluir
o Dia 1 — "Salve sua jornada". Antes disso, o progresso fica local.

## Telas

| Tela | Conteúdo | Observações |
| --- | --- | --- |
| Boas-vindas | Ilustração com caminho e lâmpada, título "Você não precisa entender tudo de uma vez.", botão "Começar minha jornada" | Som ambiente suave ao tocar no botão |
| Diagnóstico | "O que mais parece com você hoje?" com 5 opções (ver protótipo) | A resposta personaliza o texto da Recomendação e fica salva no perfil |
| Recomendação | Título e texto por resposta + card da trilha com os 7 dias | Botão "Começar o Dia 1" |
| Home/Mapa | Chips (lâmpada, graça, passos), saudação por horário, card "Continue de onde parou", mapa-caminho dos 7 dias, card da próxima trilha (bloqueada), atalho para o Diário | O caminho se desenha em verde conforme os dias são concluídos |
| Lição | Barra de progresso, um card por vez, botão principal no rodapé | Ver tipos de card abaixo |
| Conclusão | Lâmpada acendendo (animação + som), dias seguidos, passos ganhos, progresso do mapa, símbolo desbloqueado | "O Dia X libera amanhã" |
| Coleção | Grade dos símbolos: desbloqueados em cor, os outros em silhueta | Tocar abre o significado |
| Diário | Lista de registros + formulário com 5 campos | Reflexões das lições entram aqui automaticamente |
| GuiaVerbo | Cards de comando "em breve" + aviso fixo | Só em uma fase futura |
| Perfil | Estatísticas, plano, som liga/desliga, horário do lembrete, sair | |
| Oferta | Folha que sobe do rodapé com o Acesso Fundador | Copy em `docs/` do funil; preço R$ 47/ano |

## Tipos de card (`tipo` no JSON)

Cada lição é uma lista ordenada de cards. Um componente por tipo em `src/cards/`.

| tipo | Campos | Comportamento |
| --- | --- | --- |
| `abertura` | rotulo, titulo, paragrafos[], midia? | Texto grande em serifa. Se houver imagem, ela fica de fundo com gradiente |
| `texto` | rotulo, titulo, paragrafos[], midia? | Card de explicação |
| `movimentos` | titulo, itens[{n, nome, texto}] | Os 4 movimentos entram um a um (stagger + som `tick`) |
| `mapa` | rotulo, titulo, paragrafos[] | Explica onde um bloco de livros se encaixa; pode abrir a ficha dos livros citados |
| `cena` | midia (vídeo), legenda, referencia? | Vídeo em tela cheia 9:16 com legenda; toque para seguir. Som `scene_in` + ambiente da cena |
| `ordenar` | titulo, instrucao, itens[] (ordem correta), acerto, erro | Botões embaralhados; toque preenche as vagas em ordem. Acerto: `correct`; erro: `wrong` e reinicia em 1,4 s |
| `ligar` | titulo, instrucao, pares[{a, b}], acerto | Toque em um item da esquerda e depois no da direita. Cada par certo: `match` |
| `palavra` | referencia, resumo, observar, link | Card "Leia em sua Bíblia" + bloco "O que observar" |
| `cristo` | texto | Card "Como aponta para Cristo", visual com acento dourado |
| `quiz` | pergunta, opcoes[{texto, correta}], acerto, erro | Errar mostra a dica e deixa tentar de novo; acertar de primeira dá +10 passos |
| `reflexao` | pergunta, apoio | Campo de texto; ao seguir, salva no Diário com a etiqueta do dia |
| `oracao` | texto | Texto em itálico; som ambiente baixa |
| `oferta` | texto, botao, botaoSecundario | Abre a folha de Oferta; nunca bloqueia a lição |

Depois do último card, a tela de Conclusão mostra o `simbolo` do dia e, se houver, o `marco`.

## Gamificação

| Regra | Definição |
| --- | --- |
| Lâmpada acesa (streak) | +1 quando o usuário conclui a lição liberada do dia. Zera se passar um dia inteiro sem lição, exceto se houver Graça |
| Graça | 1 por semana (renova na segunda-feira). Gasta automaticamente para proteger a lâmpada em um dia perdido. Máximo acumulado: 1 |
| Passos (XP) | +50 por lição concluída pela primeira vez; +10 por atividade acertada de primeira (ordenar, ligar, quiz) |
| Desbloqueio | Um dia novo por dia de calendário, à meia-noite local, depois de concluído o anterior. Revisar dias concluídos é livre e não dá passos |
| Símbolos | Um por dia concluído. Ficam na Coleção |
| Marcos | Dia 1: "O mapa nas mãos". Dia 7: "O mapa completo". Futuros: concluir cada bloco de livros |
| Sem ranking | Nada de competição entre usuários nesta fase |

Toda regra vive em `src/game/` como função pura com teste. Datas usam o fuso do aparelho.

## Fichas dos livros (elemento inspirado nos materiais de referência)

`content/livros.json` traz os 66 livros com nome, abreviação, testamento, bloco e capítulos. Os campos
`versiculos`, `autorTradicional`, `dataAproximada`, `tempoLeitura`, `eventos[]`, `personagens[]` e
`curiosidades[]` estão `null` ou vazios: serão preenchidos e verificados em etapa própria.

Componente `BookCard` (ficha): cabeçalho com nome e números (capítulos, versículos, tempo de leitura),
bloco a que pertence, onde se encaixa na história e uma linha do tempo de eventos tocáveis, cada um com
referência. Na Trilha 1, a ficha abre a partir dos cards `mapa`. Mostre só os campos preenchidos.

Módulos futuros previstos (só registrar a ideia, não construir agora): hebreu × israelita × judeu,
moedas e medidas da Bíblia, genealogia de Jesus como árvore interativa, mapa do reino dividido.

## Analytics (eventos)

`onboarding_start`, `diagnosis_answered{opcao}`, `day_start{dia}`, `card_view{dia,card}`,
`activity_result{dia,card,acertou,tentativas}`, `day_complete{dia}`, `streak_saved_by_grace`,
`offer_view{origem}`, `offer_click`, `diary_entry_saved`, `sound_toggled{ligado}`.
Implemente um `track()` único; o destino (Supabase, PostHog ou GA4) é decidido no Sprint 4.

## Fases

| Sprint | Entrega |
| --- | --- |
| 1 | Projeto, tokens visuais, telas de onboarding, Home/Mapa, motor de lição lendo o JSON, todos os tipos de card com placeholders de mídia, gamificação local com testes |
| 2 | SoundManager e todos os efeitos; cenas de vídeo com pré-carregamento; animações de transição; Coleção de símbolos |
| 3 | Diário completo, Perfil, PWA instalável, lembrete diário (notificação), ensinar "adicionar à tela inicial" no iPhone |
| 4 | Supabase (auth, progresso, diário), analytics, oferta + checkout com webhook liberando o Acesso Fundador |
| 5 | Revisão final, ajustes de texto e mídia, testes no celular, publicação |
