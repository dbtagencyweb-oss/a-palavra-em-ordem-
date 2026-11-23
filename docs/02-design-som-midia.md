# 02 · Design, som e mídia

## Identidade visual (do protótipo)

| Token | Valor | Uso |
| --- | --- | --- |
| paper | #F5EFE3 | Fundo do app |
| paper-2 | #EDE4D3 | Fundos secundários, nós bloqueados |
| card | #FFFCF6 | Cards |
| ink | #1E2230 | Texto principal, botão primário, tela de conclusão |
| ink-2 | #4A4F5E | Texto secundário |
| ink-3 | #8A8D98 | Texto apagado |
| ember | #C4572E | Ação principal da lição, dia atual, chama |
| ember-soft | #F3DCCF | Fundo de erro, lâmpada acesa |
| gold | #B8893A | Rótulos, passos, oferta |
| gold-soft | #F1E3C4 | Destaques de texto |
| olive | #5D6B3B | Concluído, acerto, graça |
| olive-soft | #E1E6D2 | Fundo de acerto |
| line | #E2D8C5 | Bordas |

Ajuste de acessibilidade (Sprint 5): textos pequenos precisam de contraste AA (4,5:1) sobre `paper`/`card`.
Os tons originais continuam nos fundos, ícones e em contextos escuros (`ink`).

| Token | Valor | Uso |
| --- | --- | --- |
| ink-3 | #6A6D75 | Texto apagado (antes #8A8D98, 2,9:1) |
| gold-ink | #8A672B | Rótulos dourados e números sobre fundo claro |
| ember-ink | #A34826 | Links e texto ember sobre fundo claro e sobre `ember-soft` |
| ember-button | #C0552D | Fundo do botão ember com texto branco |

Fontes (Google Fonts): **Fraunces** (títulos), **Newsreader** (texto de leitura e oração),
**Manrope** (interface). Raio padrão 18 px nos cards e 14 px nos botões.

Nas cenas de vídeo e nas imagens de fundo, o visual muda para o modo "cinema": tela cheia, texto
claro sobre um gradiente escuro na parte de baixo, mesma tipografia.

## Movimento

| Momento | Animação | Duração |
| --- | --- | --- |
| Avançar card | Card atual sai para a esquerda com leve escala 0.98; o próximo entra da direita | 320 ms, ease-out |
| Voltar card | Inverso | 320 ms |
| Entrar numa cena | Crossfade do card para o vídeo, com um leve zoom de 1.04 para 1 | 600 ms |
| Itens de lista | Entrada em sequência, 70 ms entre itens | 250 ms cada |
| Acerto | Vaga ou opção fica verde e pulsa uma vez | 300 ms |
| Erro | Tremida horizontal de 5 px | 350 ms |
| Lâmpada acendendo | A chama cresce de 0 a 1 e o brilho pulsa; os números sobem contando | 1,2 s |
| Símbolo desbloqueado | Silhueta vira ouro com brilho que atravessa o ícone | 900 ms |
| Mapa | O trecho verde do caminho se desenha até o novo nó | 800 ms |

Com `prefers-reduced-motion`, tudo vira fade de 150 ms.

## Som

Um `SoundManager` (Howler) carrega um sprite ou arquivos curtos, controla o volume global, o mudo e o
desbloqueio de áudio no primeiro toque (exigência do iOS). Nada toca antes da primeira interação.
Volume padrão 0.6. Sons de interface curtos (até 400 ms), sons de recompensa até 2,5 s.
Ambientes de cena em loop, volume 0.25, com fade de 500 ms na entrada e na saída.

| id | Quando toca | Caráter | Prompt sugerido para gerar (ex.: ElevenLabs Sound Effects) |
| --- | --- | --- | --- |
| `tap` | Toque em botão e opção | Clique de madeira macio | soft wooden tap, short, warm, UI click |
| `card_next` | Avançar card | Página de papel virando, sopro curto | single parchment page turn, soft whoosh, short |
| `slot_place` | Colocar item numa vaga (ordenar) | Peça de madeira encaixando | small wooden block placed on table, gentle click |
| `match` | Par certo (ligar) | Duas notas de sino suaves | two soft bell notes rising, gentle |
| `correct` | Atividade certa | Acorde de harpa ascendente | short harp arpeggio rising, bright, warm, 1 second |
| `wrong` | Erro | Nota grave abafada, nunca agressiva | soft muted low wooden thud, gentle, not harsh |
| `tick` | Itens entrando em sequência | Tique leve | tiny soft tick |
| `scene_in` | Entrar numa cena de vídeo | Sopro cinematográfico curto | cinematic soft whoosh with warm low swell, 1.2 seconds |
| `lamp_ignite` | Conclusão do dia | Fósforo riscando + chama acendendo | match strike then oil lamp flame igniting, warm crackle |
| `day_complete` | Logo após a lâmpada | Pad de coral com harpa | warm choir pad with harp, hopeful, 2.5 seconds |
| `symbol_unlock` | Símbolo desbloqueado | Brilho cristalino | magical shimmer, crystal chime, soft sparkle |
| `grace_used` | Graça protegeu a lâmpada | Zumbido suave de proteção | soft protective hum, gentle chime |
| `offer_open` | Folha de oferta abre | Sopro curto | soft short whoosh up |
| `footstep_sand` | Pegadas no mapa da Home (a cada 2 pegadas) | Passo leve na areia, abafado | single soft footstep on dry sand, muffled, very short, no reverb |

Ambientes por cena (`amb_*`), em loop: `amb_desert_wind`, `amb_night_crickets`, `amb_water_sea`,
`amb_fire_soft`, `amb_city_morning`, `amb_temple_reverb`, `amb_garden_birds`. O catálogo
`content/midia.json` diz qual ambiente acompanha cada cena.

Fontes alternativas sem custo: bibliotecas com licença CC0 ou de uso livre (por exemplo, Pixabay
Sound Effects e Freesound filtrado por CC0). Guarde a licença de cada arquivo em `public/audio/LICENSES.md`.

Vibração: em Android, `navigator.vibrate(12)` no acerto e `[8, 40, 8]` no erro, só se o som estiver ligado.

## Especificação de imagem

- Fundo de card e cena estática: gerar em 1080×1920 (9:16), exportar **WebP qualidade 80**, alvo ≤ 250 KB.
  Guardar uma versão 540×960 para telas pequenas (`srcset`).
- Símbolo (medalhão): 1024×1024, exportar PNG transparente e WebP transparente 512×512.
- Fundo de era: 1080×1920 e 540×960, como as cenas. Capas: `capa-boas-vindas` 1080×1080, `capa-jesus-em-ordem` 1200×800.
- Nome do arquivo = id do catálogo: `public/media/img/d4-porta-pascoa.webp`.
- Deixe o terço inferior da imagem mais calmo: o texto do card fica ali.

## Especificação de vídeo (cenas de transição)

- 9:16, 4 a 6 segundos, pensado para loop suave (início e fim parecidos) ou para parar no último quadro.
- Sem áudio na faixa do vídeo: o som vem do SoundManager.
- Exportar 720×1280, H.264 (`.mp4`, CRF ~28, `-preset veryfast`, `+faststart`) e VP9 (`.webm`), alvo ≤ 1,5 MB cada.
- Poster obrigatório: primeiro quadro em WebP (`d4-sarca.poster.webp`).
- Fluxo sugerido: gerar a imagem-chave da cena, aprovar, e animar a partir dela (imagem para vídeo).
  Isso mantém o mesmo estilo entre imagem e vídeo.

Comando de referência para converter:

```
ffmpeg -i bruto.mp4 -an -vf "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280" -c:v libx264 -preset veryfast -crf 28 -movflags +faststart d4-sarca.mp4
ffmpeg -i bruto.mp4 -an -vf "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280" -c:v libvpx-vp9 -b:v 0 -crf 36 d4-sarca.webm
ffmpeg -i d4-sarca.mp4 -frames:v 1 d4-sarca.poster.webp
```

## Estilo das imagens geradas por IA

Base de todo prompt (em inglês, funciona melhor nas ferramentas):

> cinematic biblical epic, painterly realism, golden hour backlight, warm earth palette (ochre, sand,
> terracotta, deep umber), volumetric light rays, soft film grain, historically grounded ancient Near
> East clothing and architecture, vertical 9:16 composition, calm lower third for text, no text, no logos

Negativo: `text, letters, watermark, logo, modern objects, medieval European clothing, fantasy armor,
halos, nudity, gore, blood splatter, distorted hands, extra fingers`.

Regras de representação: Deus como luz, fogo ou nuvem, nunca como pessoa. Jesus sempre de costas,
em silhueta, à distância ou só as mãos. Adão e Eva como silhuetas distantes entre a vegetação.

Símbolos (coleção): uma moeda de ouro com o símbolo em relevo. A imagem é o medalhão inteiro, em fundo
transparente. Prompt completo e exportação no Pacote 1 de `docs/03-roteiro-de-midia.md`.

Fundos de era (`era-d1` a `era-d7`): uma paisagem por dia, com o assunto na parte de cima e a metade de baixo
escura e calma para o texto. Prompt e exportação também no Pacote 1 do `docs/03`.
