# 03 · Roteiro de mídia — imagens, vídeos e símbolos

Tudo aqui também está em `content/midia.json`. O nome do arquivo final é sempre o `id`.
Fluxo: gere a imagem-chave, aprove, e para os itens de vídeo anime a partir dela (imagem para vídeo).

**Estilo base (cole antes de cada prompt):**

> cinematic biblical epic, painterly realism, golden hour backlight, warm earth palette (ochre, sand, terracotta, deep umber), volumetric light rays, soft film grain, historically grounded ancient Near East clothing and architecture, vertical 9:16, calm lower third, no text

**Negativo:** text, letters, watermark, logo, modern objects, medieval European clothing, fantasy armor, halos, nudity, gore, blood splatter, distorted hands, extra fingers

Status: marque `[x]` quando o arquivo estiver em `public/media/`.

## Pacote 1 · Comece por aqui (o que mais muda o visual)

Ordem: **1. teste de estilo → 2. fundos de era → 3. símbolos → 4. capas**. Depois, as imagens e os vídeos de cada dia (abaixo).

**1. Teste de estilo.** Antes de gerar tudo, gere `era-d2` e `simbolo-arvore` em 3 ou 4 variações e escolha uma.
Use a mesma ferramenta, o mesmo modelo e, se ela permitir, a mesma *seed* ou uma imagem de referência de estilo para o resto do pacote.
O que faz o app parecer premium é o conjunto combinar; uma imagem bonita sozinha não basta.

### Fundos de era (um por dia)

Aparecem todo dia: na abertura do capítulo, no card "Continue" da Home e na tela de Conclusão.
O app escurece a metade de baixo com a cor da era, mas a imagem já precisa nascer calma ali.

**Estilo dos fundos (cole antes de cada prompt):**

> painterly cinematic landscape, wide establishing shot, vertical 9:16, main subject in the upper 40% of the frame, lower 55% calm and dark (shadowed ground, still water or deep sky) to hold text, no people or only tiny distant silhouettes, volumetric light, soft film grain, historically grounded ancient Near East, no text, no logos

**Negativo:** text, letters, watermark, logo, modern objects, people in the foreground, faces, halos, nudity, gore, busy lower half

Exportar: 1080×1920 WebP qualidade 80 (≤ 250 KB) como `era-dN.webp` e 540×960 como `era-dN-540.webp`, em `public/media/img/`.

- [ ] **`era-d1`** · Fundo · Fundo do Dia 1 (Visão do todo): abertura do capítulo, card Continue na Home e Conclusão
    - Prompt: a vast landscape seen from a high hill at dusk, one winding road crossing all of it from a garden on the left to a distant glowing city on the horizon, a small oil lamp burning on a stone in the near foreground, color palette dominated by #2A2620 and #B8893A with #F1E3C4 highlights
    - Atenção: O texto fica na metade de baixo: ela precisa ser escura e calma.
- [ ] **`era-d2`** · Fundo · Fundo do Dia 2 (Éden): abertura do capítulo, card Continue na Home e Conclusão
    - Prompt: a lush primordial garden at dawn, a river winding through, a great tree crowned with soft light in the distance, low mist between the trees, color palette dominated by #253222 and #6F8A4A with #E1E6D2 highlights
    - Atenção: O texto fica na metade de baixo: ela precisa ser escura e calma.
- [ ] **`era-d3`** · Fundo · Fundo do Dia 3 (Canaã): abertura do capítulo, card Continue na Home e Conclusão
    - Prompt: nomad tents of dark goat hair on rolling hills under a vast twilight sky filling with stars, a small campfire glow, sheep resting, color palette dominated by #352A1F and #B48A4E with #F0DDBE highlights
    - Atenção: O texto fica na metade de baixo: ela precisa ser escura e calma.
- [ ] **`era-d4`** · Fundo · Fundo do Dia 4 (Sinai): abertura do capítulo, card Continue na Home e Conclusão
    - Prompt: the rugged granite mountain of Sinai at dawn, its summit wrapped in a glowing cloud with fire inside it, a desert plain below with a faint line of distant tents, color palette dominated by #3A2418 and #B5663A with #F3D6C2 highlights
    - Atenção: O texto fica na metade de baixo: ela precisa ser escura e calma.
- [ ] **`era-d5`** · Fundo · Fundo do Dia 5 (Jerusalém e Babilônia): abertura do capítulo, card Continue na Home e Conclusão
    - Prompt: ancient Jerusalem on its hill at blue hour, the temple walls catching the last light, indigo sky, a long road leaving the city toward the east, color palette dominated by #232540 and #5E62A0 with #DCDDF2 highlights
    - Atenção: O texto fica na metade de baixo: ela precisa ser escura e calma.
- [ ] **`era-d6`** · Fundo · Fundo do Dia 6 (Galileia): abertura do capítulo, card Continue na Home e Conclusão
    - Prompt: the Sea of Galilee in early morning, a wooden fishing boat resting near the pebble shore, soft mist on the water, the hills of Galilee beyond, color palette dominated by #1C3140 and #3F7891 with #D3E6EE highlights
    - Atenção: O texto fica na metade de baixo: ela precisa ser escura e calma.
- [ ] **`era-d7`** · Fundo · Fundo do Dia 7 (Nova Jerusalém): abertura do capítulo, card Continue na Home e Conclusão
    - Prompt: a radiant city of golden light seen from far across a crystal clear river, trees on both banks, open gates, the whole sky glowing warm gold with no sun, the light comes from the city itself, color palette dominated by #33291A and #A8832E with #F6E7C1 highlights
    - Atenção: O texto fica na metade de baixo: ela precisa ser escura e calma.

### Símbolos (a coleção)

Os 7 são uma moeda de ouro com o símbolo em relevo. A imagem **é** o medalhão inteiro: o app só põe a luz e o brilho por cima.
Gere os 7 na mesma sessão, trocando só o símbolo.

**Prompt (troque {SIMBOLO}):**

> a single round antique gold medallion like a struck coin, {SIMBOLO} in raised relief at the center, simple engraved inner ring border, brushed gold with subtle wear, soft light from the top left, front view, perfectly centered, filling 92% of the frame, isolated on a plain flat white background, minimalist, no text, no letters, no numbers

**Negativo:** text, letters, numbers, coin inscriptions, face, person, background scenery, shadow on the ground, perspective tilt

Exportar: remova o fundo branco (remove.bg, Photoshop ou similar), recorte o círculo justo, e salve
`simbolo-X.png` (1024×1024, transparente, arquivo-fonte) e `simbolo-X.webp` (512×512, transparente, ≤ 120 KB) em `public/media/img/`.
Quando o símbolo está bloqueado, o app mostra a mesma imagem apagada; não precisa de uma versão "cadeado".

- [ ] **`simbolo-lampada`** · an ancient clay oil lamp with a small flame
- [ ] **`simbolo-arvore`** · the tree of life with spreading branches and visible roots
- [ ] **`simbolo-estrelas`** · a cluster of small stars around one larger bright star
- [ ] **`simbolo-cordeiro`** · a standing lamb seen in profile
- [ ] **`simbolo-coroa`** · an ancient royal crown
- [ ] **`simbolo-cruz`** · a simple empty cross
- [ ] **`simbolo-cidade`** · a city with open gates and a river flowing out of it

### Capas

- [ ] **`capa-boas-vindas`** · Fundo · Topo da tela de Boas-vindas
    - Prompt: soft dawn light over gentle hills, a single path winding from the foreground to a distant glowing horizon, airy and hopeful, very light palette of cream #F5EFE3, warm sand and pale gold, the bottom 35% fades into plain cream #F5EFE3, square 1:1
    - Atenção: Tela clara: nada escuro. A parte de baixo precisa ser creme liso para emendar com a tela.
- [ ] **`capa-jesus-em-ordem`** · Fundo · Card da Trilha 2 (Jesus em Ordem) na Home
    - Prompt: the shore of the Sea of Galilee at sunrise, one figure walking away along the shore far in the distance, seen only from behind, footprints in the wet sand, deep navy #1E2230 and warm gold light, the left half dark and calm for text, landscape 3:2
    - Atenção: A figura é Jesus: só de costas e à distância.

Exportar: `capa-boas-vindas` 1080×1080, `capa-jesus-em-ordem` 1200×800, WebP qualidade 80, mesmos nomes, em `public/media/img/`.

Confira o que falta a qualquer momento com `npm run check:media`.

## Dia 1 · A Bíblia não é um labirinto

- [ ] **`d1-labirinto`** · Vídeo · Abertura do Dia 1
    - Prompt: old parchment scrolls and an open ancient book on a wooden table lit by an oil lamp, camera slowly pushing in
    - Movimento do vídeo: the lines of text on the parchment slowly rearrange into a winding golden path, like a map drawing itself
    - Som ambiente: `amb_fire_soft`
- [ ] **`d1-emaus`** · Imagem · Card Na Palavra (Lucas 24)
    - Prompt: two travelers walking on a dusty road at sunset toward a small village, a third figure walking beside them seen only from behind, long shadows
    - Atenção: A terceira figura é Jesus: só de costas.
- [ ] **`simbolo-lampada`** · Símbolo · Conclusão do Dia 1 e Coleção
    - Prompt: a single round antique gold medallion like a struck coin, an ancient clay oil lamp with a small flame in raised relief at the center, simple engraved inner ring border, brushed gold with subtle wear, soft light from the top left, front view, perfectly centered, filling 92% of the frame, isolated on a plain flat white background, minimalist, no text, no letters, no numbers

## Dia 2 · Criação, queda e promessa

- [ ] **`d2-criacao`** · Vídeo · Cena de abertura do Dia 2
    - Prompt: beam of light breaking over dark primordial waters, mist, first dawn
    - Movimento do vídeo: light spreads across the water, land and green hills emerge, sky turns golden
    - Som ambiente: `amb_water_sea`
- [ ] **`d2-jardim`** · Imagem · Card Tudo era bom
    - Prompt: lush garden paradise with a river and a great luminous tree in the center, two tiny human silhouettes far away among the foliage
    - Atenção: Adão e Eva só como silhuetas distantes.
- [ ] **`d2-esconder`** · Imagem · Card O mundo se quebra
    - Prompt: close-up of a hand parting large fig leaves in dim evening light, a bitten fruit on the ground, mood of shame and hiding, cool shadows with a ray of warm light searching
- [ ] **`d2-arco-iris`** · Imagem · Card Na Palavra / recomeço
    - Prompt: large wooden ark resting on a mountain slope after the flood, wet earth, a soft rainbow across the clearing sky
- [ ] **`simbolo-arvore`** · Símbolo · Conclusão do Dia 2 e Coleção
    - Prompt: a single round antique gold medallion like a struck coin, the tree of life with spreading branches and visible roots in raised relief at the center, simple engraved inner ring border, brushed gold with subtle wear, soft light from the top left, front view, perfectly centered, filling 92% of the frame, isolated on a plain flat white background, minimalist, no text, no letters, no numbers

## Dia 3 · Abraão, Israel e aliança

- [ ] **`d3-estrelas`** · Vídeo · Cena do Dia 3 (promessa das estrelas)
    - Prompt: elderly man in a wool robe seen from behind, standing outside a tent in the desert at night under a vast starry sky
    - Movimento do vídeo: slow tilt up as more and more stars appear until the sky is full
    - Som ambiente: `amb_night_crickets`
    - Atenção: Abraão pode aparecer, mas de costas fica mais forte: o protagonista é o céu.
- [ ] **`d3-caravana`** · Imagem · Card O chamado de Abraão
    - Prompt: family caravan with camels, sheep and tents leaving a walled ancient city at dawn, heading into the open desert
- [ ] **`d3-jose`** · Imagem · Card De uma família, um povo
    - Prompt: young Hebrew man dressed as an Egyptian official overlooking large granaries along the Nile, workers carrying grain sacks
- [ ] **`simbolo-estrelas`** · Símbolo · Conclusão do Dia 3 e Coleção
    - Prompt: a single round antique gold medallion like a struck coin, a cluster of small stars around one larger bright star in raised relief at the center, simple engraved inner ring border, brushed gold with subtle wear, soft light from the top left, front view, perfectly centered, filling 92% of the frame, isolated on a plain flat white background, minimalist, no text, no letters, no numbers

## Dia 4 · Êxodo, lei e caminhada

- [ ] **`d4-sarca`** · Vídeo · Cena do Dia 4 (chamado de Moisés)
    - Prompt: a desert bush burning with bright gentle flames that do not consume its leaves, rocky mountain behind, a shepherd's staff lying on the ground
    - Movimento do vídeo: flames flicker softly, embers rise, the bush stays green
    - Som ambiente: `amb_fire_soft`
    - Atenção: Deus não aparece como pessoa: só o fogo.
- [ ] **`d4-porta-pascoa`** · Imagem · Card Deus liberta (Páscoa)
    - Prompt: night, mud-brick house doorway with a dark red mark painted on the wooden lintel and doorposts, warm lamp light inside, quiet street
    - Atenção: Marca discreta, sem aspecto de sangue escorrendo.
- [ ] **`d4-mar-aberto`** · Vídeo · Cena do Mar Vermelho
    - Prompt: wide aerial view of a sea parted into two towering walls of water, a multitude crossing on the dry seabed at dawn
    - Movimento do vídeo: camera glides forward slowly between the walls of water, spray in the light
    - Som ambiente: `amb_water_sea`
- [ ] **`d4-sinai`** · Imagem · Card Primeiro o resgate, depois a lei
    - Prompt: massive mountain wrapped in dark cloud with fire at the summit, a vast camp of tents at its base, people looking up
- [ ] **`d4-serpente-bronze`** · Imagem · Card extra Na caminhada (Números 21) — opcional
    - Prompt: Moses on a rock lifting a tall wooden pole with a bronze serpent sculpture mounted on top, crowd in the desert camp looking at it, snakes on the ground
    - Atenção: Sua imagem de referência serve, com um ajuste: em Números 21 é uma serpente de BRONZE presa numa haste, não uma cobra viva no cajado.
- [ ] **`simbolo-cordeiro`** · Símbolo · Conclusão do Dia 4 e Coleção
    - Prompt: a single round antique gold medallion like a struck coin, a standing lamb seen in profile in raised relief at the center, simple engraved inner ring border, brushed gold with subtle wear, soft light from the top left, front view, perfectly centered, filling 92% of the frame, isolated on a plain flat white background, minimalist, no text, no letters, no numbers

## Dia 5 · Reino, profetas e exílio

- [ ] **`d5-coroa`** · Imagem · Card De juízes a reis
    - Prompt: ancient golden crown resting on a stone ledge beside a wooden lyre, palace window light, Jerusalem hills beyond
- [ ] **`d5-templo`** · Vídeo · Cena do Dia 5 (templo de Salomão)
    - Prompt: Solomon's temple in Jerusalem at sunrise, cedar and stone, courtyard, smoke from the altar rising
    - Movimento do vídeo: slow rising crane shot revealing the temple and the city
    - Som ambiente: `amb_temple_reverb`
- [ ] **`d5-exilio`** · Imagem · Card O reino se divide e cai
    - Prompt: long line of exiles walking toward a monumental blue glazed-brick city gate of Babylon, dust, heavy sky, no chains in focus
- [ ] **`d5-muralhas`** · Imagem · Card / volta a Jerusalém
    - Prompt: people rebuilding the stone walls of Jerusalem, some carrying stones, others holding tools, morning light, hope
- [ ] **`simbolo-coroa`** · Símbolo · Conclusão do Dia 5 e Coleção
    - Prompt: a single round antique gold medallion like a struck coin, an ancient royal crown in raised relief at the center, simple engraved inner ring border, brushed gold with subtle wear, soft light from the top left, front view, perfectly centered, filling 92% of the frame, isolated on a plain flat white background, minimalist, no text, no letters, no numbers

## Dia 6 · Jesus e os Evangelhos

- [ ] **`d6-belem`** · Imagem · Card A promessa chega
    - Prompt: humble stone stable at night lit by a single oil lamp, a young mother and father seen from the side looking down at a swaddled baby in a manger, baby's face not visible
    - Atenção: Rosto do bebê não aparece.
- [ ] **`d6-sinagoga`** · Vídeo · Cena do Dia 6 (Lucas 4)
    - Prompt: close-up of hands unrolling an ancient Isaiah scroll inside a stone synagogue, lamp light, dust in the air
    - Movimento do vídeo: the scroll unrolls slowly, light shifts across the Hebrew letters
    - Som ambiente: `amb_temple_reverb`
    - Atenção: Só as mãos de Jesus.
- [ ] **`d6-cruz`** · Imagem · Card Quem é Jesus (crucificação)
    - Prompt: three crosses silhouetted on a distant hill against a dramatic stormy sunset, no detail of bodies
    - Atenção: Silhueta distante, sem violência gráfica.
- [ ] **`d6-tumulo`** · Vídeo · Cena da ressurreição (antes do card Na Palavra)
    - Prompt: rock-cut tomb in a garden at dawn, the large round stone rolled aside, empty interior
    - Movimento do vídeo: first sunlight pours into the empty tomb, linen cloths visible, birds start singing
    - Som ambiente: `amb_garden_birds`
    - Atenção: Momento mais forte da trilha: use day_complete curto aqui.
- [ ] **`simbolo-cruz`** · Símbolo · Conclusão do Dia 6 e Coleção
    - Prompt: a single round antique gold medallion like a struck coin, a simple empty cross in raised relief at the center, simple engraved inner ring border, brushed gold with subtle wear, soft light from the top left, front view, perfectly centered, filling 92% of the frame, isolated on a plain flat white background, minimalist, no text, no letters, no numbers

## Dia 7 · Igreja, cartas e esperança

- [ ] **`d7-pentecostes`** · Vídeo · Cena do Dia 7 (Atos 2)
    - Prompt: upper room full of people, small tongues of fire resting above their heads, wind moving the curtains
    - Movimento do vídeo: the wind rises, flames glow brighter, people look up in awe
    - Som ambiente: `amb_desert_wind`
- [ ] **`d7-paulo`** · Imagem · Card Onde entram as cartas
    - Prompt: middle-aged man writing a letter on parchment by oil lamp in a simple room, a travel bag and staff in the corner, Roman-era setting
- [ ] **`d7-cidade`** · Vídeo · Cena final (Apocalipse 21-22)
    - Prompt: luminous city with open gates, a crystal river flowing through the main street and a great tree of life on both banks, people from every nation walking in
    - Movimento do vídeo: slow approach through the open gates toward the river and the tree, light grows
    - Som ambiente: `amb_city_morning`
    - Atenção: Fecha o arco com d2-jardim: mesma árvore, mesmo rio.
- [ ] **`simbolo-cidade`** · Símbolo · Conclusão do Dia 7 e Coleção
    - Prompt: a single round antique gold medallion like a struck coin, a city with open gates and a river flowing out of it in raised relief at the center, simple engraved inner ring border, brushed gold with subtle wear, soft light from the top left, front view, perfectly centered, filling 92% of the frame, isolated on a plain flat white background, minimalist, no text, no letters, no numbers
