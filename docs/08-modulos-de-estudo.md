# 08 · Módulos de estudo interativos e novos bumps

Salve como `docs/08-modulos-de-estudo.md`. Junto vai um `content/livros.json` atualizado: os 66 livros com sigla, nome completo, bloco, cor do bloco, capítulos, a era em que se encaixam na história e um resumo de uma linha (texto próprio, para revisão).

## Regra que vale para todos os módulos

Os PDFs "Jornada da Bíblia" e "Os 4 Evangelhos" servem só como referência dos **tipos** de conteúdo. Nenhum texto, gráfico, tabela, imagem ou layout deles entra no app. Tudo é construído a partir dos dados em `content/`, com redação própria e conferida. Datas são marcadas como "aproximadas" e ficam de fora onde há debate (criação, dilúvio e êxodo).

## Os módulos

| # | Módulo | O que faz | Acesso |
| --- | --- | --- | --- |
| 1 | **A Biblioteca** | Os 66 livros interativos: toque numa sigla e veja o nome, o bloco, os capítulos e o resumo. Botão para alternar entre a ordem da Bíblia e a ordem da história | Grátis (porta de entrada) |
| 2 | **Desafio dos 66** | Jogo para decorar a ordem dos livros, bloco por bloco, com tempo, recorde e medalha | Grátis (compartilhável) |
| 3 | **Fichas dos livros** | Uma ficha por livro: números, autor tradicional, época, tema, personagens, eventos com referência e curiosidades | Fundador |
| 4 | **Linha do tempo completa** | Do Éden à Nova Jerusalém, com zoom por era e eventos tocáveis | Fundador |
| 5 | **Genealogia de Jesus** | Árvore interativa de Abraão a Jesus (Mateus) e de Adão a Jesus (Lucas) | Fundador |
| 6 | **Festas bíblicas** | Roda do ano com as festas de Levítico 23 e onde Jesus aparece em cada uma | Fundador |
| 7 | **Você sabia?** | Curiosidades em cards: hebreu, israelita ou judeu; as línguas da Bíblia; moedas e medidas; como a Bíblia chegou até nós | Fundador |
| 8 | **Atlas da Bíblia** | Mapas interativos: Canaã de Abraão, a rota do Êxodo, o reino dividido, a Galileia de Jesus e as viagens de Paulo | Bump |
| 9 | **Personagens da Bíblia** | 100 personagens em cards, com época, livros, papel na história e ligação com o mapa | Bump |

## Novos bumps

| Código | Produto | Preço | Copy do checkout |
| --- | --- | --- | --- |
| `atlas` | Atlas da Bíblia | R$ 19,90 | **Sim, quero o Atlas da Bíblia · R$ 19,90.** Veja onde tudo aconteceu: 5 mapas interativos, de Abraão a Paulo, com as rotas animadas e a versão para imprimir. |
| `personagens` | 100 Personagens da Bíblia | R$ 17 | **Sim, quero os 100 Personagens · R$ 17.** De Adão a João: quem foi cada um, quando viveu e onde aparece. Nunca mais confunda os nomes. |

A esteira completa de bumps passa a ser: Mapa para imprimir, Acesso Família, Atlas, Personagens e Modo Áudio. Continue usando **no máximo 2 por checkout**, alternando as duplas em teste:
- Teste A: Mapa para imprimir + Acesso Família
- Teste B: Atlas + Acesso Família
- Teste C: Atlas + Personagens

Fique com a dupla que tiver a maior receita por comprador.

**Para anúncios:** o Desafio dos 66 é grátis e funciona como isca. "Consegue colocar os 66 livros da Bíblia em ordem? A maioria trava em Ageu." Quem joga cai no app e entra no funil dos 7 dias.

---

## Prompts para o Claude Code

Use um por vez: "Leia o CLAUDE.md, o docs/08-modulos-de-estudo.md e execute o Prompt N."

### Prompt 1 · A Biblioteca

```
Crie o módulo "A Biblioteca" a partir de content/livros.json (use o arquivo atualizado que veio junto com este documento, substituindo o antigo).

1. Tela /biblioteca, acessível pela Home e pelo menu, para todos os usuários, inclusive sem conta.
2. Visual principal: uma estante. Cada livro é uma lombada vertical com a sigla, na cor do seu bloco. A largura da lombada é proporcional ao número de capítulos (com um mínimo legível). Antigo Testamento numa prateleira, Novo Testamento em outra.
3. Legenda dos blocos em chips no topo. Tocar num chip destaca os livros daquele bloco e apaga os outros.
4. Tocar numa lombada: o livro "sai" da estante e abre um cartão com o nome completo, a sigla, o bloco, os capítulos, o resumo e a frase "Onde se encaixa: Dia X do mapa · [nome da era]". Botões: "Ver ficha" (Fundador; para os outros, abre a Oferta) e "Ler na minha Bíblia".
5. Botão de alternância no topo: "Ordem da Bíblia" ↔ "Ordem da história". Ao trocar, as lombadas deslizam com animação (FLIP, Framer Motion layout) e se reorganizam nas 7 eras do mapa, com o nome de cada era acima do grupo. Os poéticos e os profetas ficam juntos na era 5, com a legenda "escritos durante esta época". Som card_next ao terminar.
6. Busca: campo que filtra por nome ou sigla ("Hc" encontra Habacuque).
7. Visão alternativa em roda (botão "Roda"): dois anéis, Antigo e Novo Testamento, com fatias por livro na cor do bloco e a sigla dentro. Tocar numa fatia abre o mesmo cartão. Desenhe em SVG.
8. Contadores no rodapé: 66 livros · 39 no Antigo · 27 no Novo · 1.189 capítulos. Calcule a partir dos dados, não escreva os números à mão.
9. Acessibilidade: cada lombada é um botão com o nome completo no aria-label. Com prefers-reduced-motion, a troca de ordem é um fade.
```

### Prompt 2 · Desafio dos 66

```
Crie o jogo "Desafio dos 66" em /desafio, grátis e sem conta.

1. Modos: por bloco (Pentateuco, Históricos, Poéticos, Profetas Maiores, Profetas Menores, Evangelhos e Atos, Cartas de Paulo, Cartas Gerais e Apocalipse) e o modo "Os 66".
2. Mecânica: as siglas aparecem embaralhadas e o jogador toca na ordem certa. Acerto: a sigla voa para a estante, com o som slot_place. Erro: tremida, som wrong e +2 segundos de penalidade.
3. Cronômetro, recorde salvo no aparelho, e medalhas de bronze, prata e ouro por tempo. Completar cada bloco desbloqueia o próximo.
4. Tela final compartilhável: uma imagem 1080×1920 gerada no aparelho, com o tempo, a medalha e a frase "Coloquei os 66 livros da Bíblia em ordem em X segundos. Consegue?", mais o link do app com UTM utm_source=desafio. Botão de compartilhar pelo Web Share e de baixar a imagem.
5. Ao terminar, para quem ainda não começou a jornada: "Agora veja a história por trás de cada livro: comece o Mapa da Bíblia em 7 dias, grátis."
6. Eventos de analytics: desafio_inicio, desafio_fim{modo,tempo}, desafio_compartilhar.
```

### Prompt 3 · Fichas dos livros

```
Crie o componente BookCard (ficha completa) em /livro/:id, para Fundadores.

1. Cabeçalho com o fundo da era do livro, o nome, a sigla e os números (capítulos, versículos e tempo de leitura) em contadores que sobem ao abrir.
2. Seções, cada uma aparecendo só se o campo estiver preenchido: Autor tradicional, Época aproximada, Tema, Onde se encaixa (com um mini mapa das 7 eras destacando a do livro), Personagens principais (chips que abrem o card do personagem, se o usuário tiver o bump personagens), Eventos (uma linha do tempo vertical tocável, cada evento com a referência) e Você sabia?
3. Navegação: deslize para o livro anterior ou o próximo, na ordem da Bíblia ou da história (respeite o modo escolhido na Biblioteca).
4. Os campos que faltam em livros.json serão preenchidos em lotes pela linha de produção de conteúdo (docs/07, Prompt 2). Crie o tipo TypeScript com todos os campos e um validador.
```

### Prompt 4 · Linha do tempo completa

```
Crie /linha-do-tempo para Fundadores.

1. Arquivo content/linha-do-tempo.json com eventos: id, título, era (1 a 7), data_aproximada (texto, opcional, por exemplo "c. 1000 a.C."), referência, resumo de uma linha e livros relacionados. Crie a estrutura com 30 eventos-marco em status rascunho, usando só títulos e referências (o texto será escrito à parte). Sem datas para a criação, o dilúvio e o êxodo.
2. Visual: uma faixa vertical com as 7 eras, cada uma com o seu fundo de era. Pinça ou botões para zoom: na visão geral, só as eras; ao aproximar, aparecem os eventos.
3. Tocar num evento abre um cartão com o resumo, a referência e os livros relacionados (que abrem a ficha).
4. Um marcador "você está aqui" mostra onde o usuário está na jornada atual.
```

### Prompt 5 · Genealogia, Festas e Você sabia?

```
Três módulos menores, para Fundadores.

1. Genealogia (/genealogia): árvore vertical rolável de Abraão a Jesus, com os três blocos de 14 de Mateus em cores diferentes. Destaque nos nomes de Tamar, Raabe, Rute e Bate-Seba, com um toque explicando quem foi cada uma. Alternância para a linha de Lucas (de Jesus até Adão). Dados em content/genealogias.json, com os nomes conferidos em Mateus 1 e Lucas 3. Crie o arquivo com os nomes e me mostre para eu conferir antes de desenhar.
2. Festas (/festas): uma roda do ano em SVG com os meses do calendário bíblico e as 7 festas de Levítico 23 (Páscoa, Pães Asmos, Primícias, Pentecostes, Trombetas, Dia da Expiação e Tabernáculos). Cada festa abre um cartão: quando era, o que lembrava, a referência e "como aponta para Cristo". Os ícones das festas usam o estilo das medalhas. Texto em rascunho.
3. Você sabia? (cards no feed da Home, um por dia para Fundadores, e uma tela /curiosidades com todos): crie content/curiosidades.json com os temas, em rascunho: hebreu, israelita ou judeu; as três línguas da Bíblia; como a Bíblia foi dividida em capítulos e versículos; moedas do Novo Testamento (denário, dracma, talento); medidas (côvado, jornada de um sábado); o que é a Septuaginta.
```

### Prompt 6 · Atlas da Bíblia (bump)

```
Crie /atlas, liberado para quem tem o entitlement atlas.

1. Base dos mapas: use um mapa de relevo em domínio público (por exemplo, os dados de relevo do Natural Earth) recortado para a região entre o Egito e a Mesopotâmia, estilizado com as cores do app. Nunca gere mapas com IA: a geografia sai errada.
2. Cinco mapas, cada um com pontos e rotas desenhados em SVG por cima da base: Canaã na época de Abraão; a rota do Êxodo (marcada como "rota tradicional; o caminho exato é debatido"); o reino dividido (norte e sul, com Samaria e Jerusalém); a Galileia e a Judeia de Jesus; as viagens de Paulo.
3. As rotas se desenham com animação (stroke) quando o mapa abre, com pegadas iguais às do mapa da jornada.
4. Tocar num ponto abre um cartão com o nome do lugar, o que aconteceu ali e a referência.
5. Dados em content/atlas.json, com as coordenadas reais de cada lugar e o texto em rascunho.
6. Versão para imprimir de cada mapa em A4, pelo mesmo sistema do Mapa para imprimir (docs/07, Prompt 5).
7. Registre o produto atlas no catálogo de produtos e no config/produtos-plataforma.json.
```

### Prompt 7 · Personagens da Bíblia (bump)

```
Crie /personagens, liberado para quem tem o entitlement personagens.

1. Arquivo content/personagens.json com 100 personagens: id, nome, era, livros onde aparece, papel em uma linha, resumo, referências principais e personagens relacionados. Crie a lista dos 100 nomes, distribuídos pelas 7 eras, com o texto em rascunho, e me mostre a lista antes de seguir.
2. Tela em grade de cards, com filtro por era e busca. Ilustração: a medalha ou o ícone da era do personagem (sem rostos gerados por IA).
3. Card aberto: nome, era, livros (que abrem a ficha), papel, resumo, referências e "Veja também" com os relacionados.
4. Jogo rápido "Quem sou eu?": três pistas, uma por vez, e o jogador escolhe o personagem entre quatro opções. Usa os mesmos sons e passos do app.
5. Registre o produto personagens no catálogo e no config/produtos-plataforma.json.
```

---

## O que precisa ser escrito fora do Claude Code

O Claude Code monta as telas e a estrutura, mas o texto de cada módulo é escrito com redação própria, revisado e só então publicado. Ordem sugerida, pelo que mais vende e retém:

1. Biblioteca e Desafio dos 66: **já têm os dados prontos** no livros.json. Só falta o pastor revisar os 66 resumos.
2. Fichas dos 66 livros, em lotes de 11 (seis lotes)
3. Os 100 personagens (para o bump)
4. Os textos dos 5 mapas do Atlas (para o bump)
5. A linha do tempo, as festas, a genealogia e as curiosidades
