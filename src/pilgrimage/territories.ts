import media from '../../content/pilgrimage-assets.json'
import { trilha } from '../content'

export type Point = readonly [x: number, y: number]
export type Area = readonly [left: number, top: number, right: number, bottom: number]
export type Camera = { point: Point; zoom: number }
export type ImageVariant = { path: string; width: number; height: number; bytes: number }
export type MapAsset = { width: number; height: number; preview: ImageVariant; variants: ImageVariant[] }

export const maps: Record<string, MapAsset | undefined> = media
export const world = media.mundo

type Hotspot = {
  id: string
  title: string
  reference: string
  description: string
  point: Point
  worldPoint: Point
  scene?: string
  lessonLabel?: string
  locality?: { asset: string; camera: Camera }
}

type TerritorySpec = {
  id: string
  entrance: Point
  area: Area
  focal: Point
  regionalCamera: Camera
  trailFromPrevious?: string
  crossing?: string
  hotspots: Hotspot[]
}

// World paths use a 1000 × 1000 grid aligned to the whole illustration, independent of its ratio.
const specs: TerritorySpec[] = [
  {
    id: 'visao-do-todo', entrance: [0.60, 0.853], area: [0.13, 0.80, 0.86, 1], focal: [0.49, 0.934],
    regionalCamera: { point: [0.5, 0.64], zoom: 1 },
    hotspots: [],
  },
  {
    id: 'eden', entrance: [0.53, 0.658], area: [0.16, 0.58, 0.95, 0.80], focal: [0.43, 0.634],
    regionalCamera: { point: [0.60, 0.48], zoom: 1 },
    trailFromPrevious: 'M600 853 C580 849 527 850 552 843 S700 826 642 815 C577 808 625 793 620 780 S593 764 627 751 S719 736 642 717 S501 684 530 658',
    hotspots: [{
      id: 'arvore-da-vida', title: 'Árvore da Vida', reference: 'Gênesis 2:8–17; 3:22–24',
      description: 'Deus planta o jardim do Éden. Depois da queda, o caminho para a árvore da vida fica guardado.',
      point: [0.64, 0.55], worldPoint: [0.70, 0.692], scene: 'arvore-da-vida',
    }],
  },
  {
    id: 'canaa', entrance: [0.27, 0.526], area: [0.02, 0.468, 0.57, 0.588], focal: [0.25, 0.506],
    regionalCamera: { point: [0.53, 0.56], zoom: 1 },
    trailFromPrevious: 'M530 658 C566 644 612 632 574 615 S440 599 481 588 C500 575 451 564 391 558 C347 553 256 549 261 538 L270 526',
    hotspots: [{
      id: 'acampamento-de-abraao', title: 'Acampamento de Abraão', reference: 'Gênesis 12:1–9',
      description: 'Abraão parte para Canaã. Ali, Deus promete dar a terra à sua descendência.',
      point: [0.29, 0.52], worldPoint: [0.37, 0.566], scene: 'acampamento-de-abraao',
    }],
  },
  {
    id: 'sinai', entrance: [0.54, 0.426], area: [0.28, 0.31, 0.98, 0.47], focal: [0.65, 0.403],
    regionalCamera: { point: [0.52, 0.55], zoom: 1 },
    trailFromPrevious: 'M270 526 C211 519 159 510 160 500 S218 485 201 476 M393 453 C429 448 420 440 455 435 L540 426',
    crossing: 'M201 476 C255 471 328 463 393 453',
    hotspots: [{
      id: 'mar-vermelho', title: 'À beira do Mar Vermelho', reference: 'Êxodo 14',
      description: 'Com o exército egípcio atrás deles, os israelitas atravessam o mar em terra seca.',
      point: [0.32, 0.62], worldPoint: [0.28, 0.468], scene: 'mar-vermelho', lessonLabel: 'Abrir a lição do Sinai',
    }],
  },
  {
    id: 'jerusalem-babilonia', entrance: [0.48, 0.269], area: [0.08, 0.205, 0.98, 0.315], focal: [0.47, 0.258],
    regionalCamera: { point: [0.55, 0.47], zoom: 1 },
    trailFromPrevious: 'M540 426 C513 417 381 407 345 396 S392 375 367 365 S257 352 296 339 S406 319 373 311 S294 297 361 286 S464 277 480 269',
    hotspots: [
      {
        id: 'jerusalem', title: 'Jerusalém', reference: '2 Samuel 5:6–10; 1 Reis 8',
        description: 'Davi estabelece sua capital em Jerusalém. Mais tarde, Salomão dedica o templo na cidade.',
        point: [0.46, 0.37], worldPoint: [0.35, 0.242], scene: 'jerusalem',
      },
      {
        id: 'babilonia', title: 'Babilônia', reference: '2 Reis 25:1–21',
        description: 'Jerusalém cai, e parte do povo de Judá é levada para o exílio na Babilônia.',
        point: [0.69, 0.64], worldPoint: [0.67, 0.306], scene: 'babilonia',
      },
    ],
  },
  {
    id: 'galileia', entrance: [0.56, 0.176], area: [0.40, 0.13, 0.98, 0.215], focal: [0.75, 0.168],
    regionalCamera: { point: [0.64, 0.48], zoom: 1 },
    trailFromPrevious: 'M480 269 C526 263 609 258 663 248 C594 242 566 232 599 219 S684 210 639 203 S533 199 548 190 L560 176',
    hotspots: [{
      id: 'lago-da-galileia', title: 'Lago da Galileia', reference: 'Marcos 1:16–20; 4:35–41',
      description: 'Jesus chama pescadores para segui-lo e, mais tarde, acalma uma tempestade no lago.',
      point: [0.56, 0.56], worldPoint: [0.70, 0.197], scene: 'lago-da-galileia',
    }],
  },
  {
    id: 'nova-jerusalem', entrance: [0.71, 0.123], area: [0.49, 0.052, 0.97, 0.15], focal: [0.78, 0.101],
    regionalCamera: { point: [0.56, 0.37], zoom: 1 },
    trailFromPrevious: 'M560 176 C565 164 581 159 617 154 S742 148 765 143 S746 132 710 123',
    hotspots: [],
  },
]

export const territories = specs.map((spec, index) => ({
  ...spec,
  n: index + 1,
  place: trilha.dias[index].lugar,
  reference: trilha.dias[index].base,
  lesson: trilha.dias[index],
  asset: maps[spec.id],
}))

export type Territory = (typeof territories)[number]
