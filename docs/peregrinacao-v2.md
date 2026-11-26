# Peregrinação imersiva V2

## Execução

- O servidor de desenvolvimento abre o mapa V2 na aba Jornada. Use `/?mapa=classico` para comparar com a versão anterior.
- O build publicado abre o mapa clássico por padrão. Use `/?mapa=v2` para testar o mapa novo no servidor. Defina `VITE_PILGRIMAGE_V2=true` no ambiente de build para tornar o V2 o padrão.
- Gere novamente as variantes com `npm.cmd run media:pilgrimage`. Os originais em PNG devem ficar em `media/ui/`, fora de `public/`. WebPs já compactados podem ficar em `public/media/ui/`. O script grava as opções de carregamento em `content/pilgrimage-assets.json` e as medidas em [peregrinacao-assets.md](./peregrinacao-assets.md).
- A validação do mapa roda com `npm.cmd run test:e2e -- e2e/pilgrimage.spec.ts`. Para aproveitar o Vite que já está rodando, defina `$env:PAO_E2E_URL = 'http://localhost:5174'` antes do teste.

## Arquitetura

`HomeScreen` consulta o progresso e as regras de disponibilidade usadas pelas lições. Ele passa os estados ao mapa e continua responsável por abrir a lição, o catálogo, os estudos e os grupos. O mapa guarda a câmera somente enquanto a tela está aberta.

`src/pilgrimage/territories.ts` associa as eras aos capítulos já existentes, às artes e às posições de cada marcador. Os pontos usam `[x, y]` entre 0 e 1, medidos a partir do canto superior esquerdo da imagem. Os limites da área seguem a ordem `[esquerda, topo, direita, base]`. A trilha divide esses mesmos valores numa grade SVG de 1.000 unidades. Ajuste as coordenadas no manifesto para reposicionar os marcadores e seus balões.

`MapViewport` aplica a câmera à imagem, à trilha e aos marcadores no mesmo plano. Durante os gestos, os eventos atualizam a transformação em um quadro de animação, sem atualizar o estado React a cada movimento. Arraste ou use a roda para deslocar. Para zoom, use pinça, Ctrl + roda ou os botões. Com o mapa focado, as setas deslocam e as teclas + e − ajustam o zoom.

`PilgrimageMap` move a câmera até o ponto focal no mundo enquanto prepara a imagem regional. Em seguida, as artes se sobrepõem por alguns quadros, e a região entra com sua própria posição de câmera. A volta restaura o enquadramento salvo. O botão de efeitos e a configuração de movimento reduzido oferecem a troca imediata. A travessia aparece sobre a água apenas depois de concluir o Sinai. A cena no mapa leva à lição onde a atividade original acontece.

## Arte e desempenho

O mapa-mestre mantém os 793 × 2.637 pixels e a proporção vertical. A maior versão é o WebP enviado pelo usuário. Sua imagem decodificada em RGBA ocupa cerca de 8 MiB. As variantes menores e a prévia reduzem a transferência inicial, e a câmera usa a mesma textura durante o zoom. A troca mantém no máximo duas artes do mapa em cena. O pré-carregamento fora da troca usa a prévia da região atual e, com economia de dados desativada, a da seguinte.

Em uma amostra de 480 px extraída do mapa-mestre, o AVIF ficou em 174 KiB e o WebP em 257 KiB. Cinco decodificações após aquecimento levaram em média cerca de 120 ms em AVIF e 46 ms em WebP, no Sharp deste ambiente. Mantivemos WebP para usar as artes fornecidas, evitar uma segunda família de variantes e reduzir o tempo de decodificação observado. Esse ensaio não mede a decodificação de um aparelho físico.

Canaã usa um enquadramento da sua área no mapa-mestre e tem um ponto interativo para a cena do acampamento. Quando a arte independente chegar com o nome `03_canaa`, o pipeline a registra automaticamente. Calibre então o ponto focal regional e o ponto do acampamento sobre a nova imagem. Confira também os trechos próximos das margens do Mar Vermelho em diferentes enquadramentos.

## Validação

- TypeScript e build de produção com o V2 habilitado passaram. O navegador carregou esse build sem erros de execução nas três dimensões testadas.
- Sete testes de navegador do V2 passaram. Eles incluem navegação, bloqueio, sete regiões, retorno, pinça, teclado e indisponibilidade da arte. O teste completo da jornada clássica também passou, do Dia 1 ao Dia 7. A suíte geral repetiu quatro falhas preexistentes sobre Trilha 2 e estudos.
- No build de produção, o deslocamento simulado por roda no Chromium headless com DPR 2 mediu cerca de 60 FPS em 320 × 568, 47 FPS em 390 × 844 e 48 FPS em 900 × 740. O percentil 95 entre quadros foi de 16,7 ms na tela menor e 33,4 ms nas outras duas. São medidas deste ambiente, com os efeitos ativos. A validação em aparelhos físicos segue pendente.
- Os 18 WebPs de origem foram conferidos com SHA-256. A cópia de recuperação guarda a referência ao commit `45464f6` e as alterações locais existentes antes da implementação.

## Adicionar localidades, cenas e eventos

1. Adicione a arte aprovada e registre o nome do arquivo no catálogo de `scripts/import-pilgrimage-maps.mjs`. Gere as variantes.
2. Calibre um ponto na região e adicione uma entrada em `hotspots` no manifesto.
3. Para uma localidade LOD 2, indique `locality.asset` e `locality.camera`. O mapa aproxima a arte, e o retorno restaura a câmera regional.
4. Para uma cena narrativa, indique `scene` com o ID da imagem. Ela abre no painel já usado pelo app. Para um evento pedagógico, direcione o painel para a lição responsável pela atividade, como no Sinai.
