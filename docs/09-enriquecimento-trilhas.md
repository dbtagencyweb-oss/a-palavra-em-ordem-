# 09 · Enriquecimento das trilhas: 10 módulos novos

Salve como `docs/09-enriquecimento-trilhas.md`. Os dados estão em `content/extras/enriquecimento-v1.json`, com status "em revisão".

## Onde cada um entra

Para não alongar as lições de 5 a 7 minutos, a regra é: **no máximo um item novo dentro de cada lição**. O resto vai para uma seção opcional **"Para ir além"**, que aparece na tela de Conclusão do dia e dá +5 passos por item visto.

| Item | Trilha e dia | Modo |
| --- | --- | --- |
| A Bíblia em números | Mapa, Dia 1 (depois do card "A Bíblia é uma biblioteca") | Na lição; também na landing page |
| As três línguas da Bíblia | Mapa, Dia 1 | Para ir além |
| Os sete dias da criação | Mapa, Dia 2 | Para ir além |
| Hebreu, israelita ou judeu? | Mapa, Dia 3 | Para ir além |
| As dez pragas | Mapa, Dia 4 | Para ir além |
| As duas tábuas | Mapa, Dia 4 | Para ir além |
| O tabernáculo | Mapa, Dia 4 (e link no Dia 2 de Jesus em Ordem) | Para ir além |
| Os profetas na linha do tempo | Mapa, Dia 5 (substitui o visual do card "Onde entram os profetas") | Na lição |
| Os 400 anos entre os Testamentos | Mapa, Dia 6 (e link no Dia 4 de Jesus em Ordem) | Para ir além |
| A genealogia de Jesus em Mateus | Jesus em Ordem, Dia 3 | Para ir além |

## Pontos para o pastor revisar

| Item | O que conferir |
| --- | --- |
| A Bíblia em números | "Cerca de 40 autores", "cerca de 1.500 anos" e "3 continentes" são números tradicionais e aproximados, apresentados como "cerca de" |
| As duas tábuas | Usa a numeração da maioria das igrejas evangélicas, com a nota de que católicos e luteranos agrupam diferente |
| O tabernáculo | A ligação de cada peça com Cristo é uma leitura tipológica comum entre evangélicos, sempre com referência do Novo Testamento. Conferir se a igreja concorda com todas |
| As dez pragas | A observação sobre os deuses do Egito vem apresentada como "muitos estudiosos notam" |
| Os profetas | Joel e Obadias ficam à parte, com a época marcada como debatida |
| Os 400 anos | Datas aproximadas de fatos históricos amplamente aceitos. Cita os macabeus e o Hanucá como história, sem tratar dos livros dos Macabeus |
| Genealogia | Grafia dos nomes conforme a tradução adotada; nota sobre os 13 nomes do terceiro bloco |

---

## Prompt para o Claude Code

```
Leia o CLAUDE.md e o docs/09-enriquecimento-trilhas.md. Os dados estão em content/extras/enriquecimento-v1.json. Não altere nenhum texto do JSON.

1. "PARA IR ALÉM"
   - Na tela de Conclusão de cada dia, depois do símbolo, uma seção recolhível "Para ir além", com os itens daquele dia (campo onde.modo = "para-ir-alem"). Cada item é um cartão com título e ícone; tocar abre o componente em tela cheia.
   - Cada item visto pela primeira vez dá +5 passos. Não conta para a lâmpada.
   - Os itens ficam guardados numa tela "Meus extras" no Perfil, para rever depois.
   - Itens com onde.modo = "link" aparecem como um link discreto no fim do card indicado da trilha.

2. COMPONENTES (em src/extras/, um por campo "componente")
   - Numeros: contadores que sobem um de cada vez quando entram na tela (o "cerca de" aparece antes do número). Calcule livros e capítulos a partir de livros.json, não use o número fixo do JSON. O fecho aparece no fim. Entra como card dentro do Dia 1, depois de d1-c03.
   - Linguas: três cartões, cada um com a palavra escrita na língua original (fonte que suporte hebraico e grego; o hebraico da direita para a esquerda), a transliteração, o significado e o texto.
   - Ligar, Ordenar: reaproveite as atividades que já existem, com os sons e os passos.
   - Curiosidade: três cartões em sequência, com a referência em cada um.
   - Tabuas: duas tábuas de pedra lado a lado (4 itens à esquerda e 6 à direita) que se abrem com animação. O fecho e a nota de numeração aparecem embaixo.
   - Tabernaculo: planta vista de cima em SVG, nas proporções das medidas (pátio, tenda, Lugar Santo e Santo dos Santos). Cada peça é um botão: tocar destaca a área e abre um cartão com o nome, o texto, "Como aponta para Cristo" e a referência. Um botão "Percorrer" leva da entrada até a arca, peça por peça, na ordem do JSON. No fim, o véu se abre com animação e aparece o fecho.
   - LinhaProfetas: três faixas (antes, durante e depois do exílio) com os profetas como chips que abrem o cartão do livro da Biblioteca. Joel e Obadias numa área separada, com a nota. Substitui o visual do card d5-c05, mantendo o texto dele acima.
   - LinhaHorizontal: uma linha do tempo horizontal com rolagem, os marcos aparecendo um a um, e o fecho no fim.
   - Genealogia: três colunas (os blocos), nomes em sequência com uma linha ligando, contador 14 / 14 / 13. As mulheres aparecem como marcadores dourados ao lado do nome indicado; tocar abre o cartão. A nota de contagem aparece num ícone de informação.

3. LANDING PAGE
   - Use o componente Numeros na seção 4 da landing page, com o mesmo efeito de contagem disparado pela rolagem.

4. CONTEÚDO
   - Inclua o enriquecimento-v1.json no npm run content:check (referências preenchidas, componentes válidos, dias e cards existentes).
   - Respeite o status: só mostrar quando eu mudar para "publicado", depois da revisão do pastor. No modo dev, mostrar com a faixa "em revisão".

Me mostre primeiro o Tabernáculo e a Bíblia em números funcionando no celular.
```
