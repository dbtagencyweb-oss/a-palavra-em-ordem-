// Shapes of the JSON files in /content. Field names stay in Portuguese to match the data.

interface CardBase {
  id: string
  rotulo?: string
  midia?: string
  revisar?: boolean
}

export interface AberturaCard extends CardBase {
  tipo: 'abertura'
  titulo: string
  paragrafos: string[]
}
export interface TextoCard extends CardBase {
  tipo: 'texto'
  titulo: string
  paragrafos: string[]
}
export interface MovimentosCard extends CardBase {
  tipo: 'movimentos'
  titulo: string
  itens: { n: number; nome: string; texto: string }[]
}
export interface MapaCard extends CardBase {
  tipo: 'mapa'
  titulo: string
  paragrafos: string[]
  livros?: string[]
}
export interface CenaCard extends CardBase {
  tipo: 'cena'
  midia: string
  legenda: string
  referencia?: string
}
export interface OrdenarCard extends CardBase {
  tipo: 'ordenar'
  titulo: string
  instrucao: string
  itens: string[]
  acerto: string
  erro: string
}
export interface LigarCard extends CardBase {
  tipo: 'ligar'
  titulo: string
  instrucao: string
  pares: { a: string; b: string }[]
  acerto: string
}
export interface PalavraCard extends CardBase {
  tipo: 'palavra'
  titulo?: string
  referencia: string
  resumo: string
  observar: string
  link?: string
}
export interface CristoCard extends CardBase {
  tipo: 'cristo'
  texto: string
}
export interface QuizCard extends CardBase {
  tipo: 'quiz'
  pergunta: string
  opcoes: { texto: string; correta: boolean }[]
  acerto: string
  erro: string
}
export interface ReflexaoCard extends CardBase {
  tipo: 'reflexao'
  pergunta: string
  apoio?: string
}
export interface OracaoCard extends CardBase {
  tipo: 'oracao'
  texto: string
}
export interface OfertaCard extends CardBase {
  tipo: 'oferta'
  texto: string
  botao: string
  botaoSecundario: string
}

// ---- "Leitura guiada" (the chronological plan, docs/07 Prompt 4) ----
export interface LeituraCard extends CardBase {
  tipo: 'leitura'
  /** e.g. "Gênesis 1–2". The text is read in the person's own Bible. */
  referencia: string
  texto?: string
}
export interface ContextoCard extends CardBase {
  tipo: 'contexto'
  texto: string
}
export interface ObservarCard extends CardBase {
  tipo: 'observar'
  texto: string
}
export interface PerguntaCard extends CardBase {
  tipo: 'pergunta'
  /** Goes to the Diary with the answer. */
  texto: string
}

export type Card =
  | AberturaCard
  | TextoCard
  | MovimentosCard
  | MapaCard
  | CenaCard
  | OrdenarCard
  | LigarCard
  | PalavraCard
  | CristoCard
  | QuizCard
  | ReflexaoCard
  | OracaoCard
  | OfertaCard
  | LeituraCard
  | ContextoCard
  | ObservarCard
  | PerguntaCard

export type CardType = Card['tipo']

export interface Simbolo {
  id: string
  nome: string
  texto: string
  midia: string
}

export interface Marco {
  id: string
  nome: string
  texto: string
}

export interface Dia {
  n: number
  titulo: string
  base: string
  lugar: string
  simbolo: Simbolo
  /** "leitura-guiada" for the chronological plan; Trilha format otherwise. */
  formato?: 'trilha' | 'leitura-guiada'
  /** Reading of the day (leitura guiada) and the chapters it covers. */
  leitura?: string | null
  capitulos?: { livro: string; de: number; ate: number }[]
  marco?: Marco
  cards: Card[]
}

/** Review status of a lesson (docs/07, Prompt 2). */
export type LessonStatus = 'rascunho' | 'em_revisao' | 'publicado'

export interface Trilha {
  id: string
  titulo: string
  subtitulo: string
  gratis: boolean
  duracaoPorDia: string
  linkLeitura: { modelo: string; nota: string }
  dias: Dia[]
}

/** A dated event in a book's timeline. Schema proposed for when content/livros.json gets filled. */
export interface LivroEvento {
  titulo: string
  referencia: string
  texto?: string
}

export interface Livro {
  id: string
  ordem: number
  nome: string
  testamento: 'AT' | 'NT'
  bloco: string
  capitulos: number
  diasDoMapa?: number[]
  // Still null/empty in content/livros.json; the BookCard shows only what is filled.
  versiculos?: number | null
  autorTradicional?: string | null
  dataAproximada?: string | null
  tempoLeitura?: string | null
  ondeSeEncaixa?: string | null
  eventos?: LivroEvento[]
  personagens?: (string | { nome: string; texto?: string })[]
  curiosidades?: string[]
}

export interface DiagnosticoOpcao {
  id: string
  texto: string
  recTitulo: string
  recTexto: string
}

interface NextStep {
  titulo: string
  texto: string
  botao: string
  /** Shown instead of the button while the feature isn't built yet. */
  emBreve?: string
}

export interface InterfaceText {
  avisosPlano: Record<'atraso' | 'atrasoBotao' | 'renovacao' | 'renovacaoHoje' | 'renovacaoBotao' | 'trocaTitulo' | 'trocaTexto' | 'trocaBotao' | 'agoraNao', string>
  familia: Record<
    | 'titulo' | 'textoDono' | 'textoMembro' | 'vaga' | 'vagaLivre' | 'convidar' | 'convitePendente' | 'enviarDeNovo' | 'copiar' | 'copiado'
    | 'cancelar' | 'remover' | 'confirmarRemover' | 'trocas' | 'lampadasTitulo' | 'compartilhar' | 'compartilharDica'
    | 'conviteTitulo' | 'conviteTexto' | 'conviteAceito' | 'conviteErro' | 'comecar',
    string
  >
  plano: {
    titulo: string
    nomes: Record<'gratuito' | 'fundador' | 'anual' | 'vitalicio' | 'mensal' | 'igreja', string>
    selos: Record<'fundador' | 'vitalicio', string>
    gratuitoTexto: string
    vence: string
    semVencimento: string
    cancelado: string
    incluso: string
    produtos: Record<string, string>
    verOferta: string
  }
  obrigado: {
    titulo: string
    texto: string
    aguardando: string
    entrarTitulo: string
    entrarTexto: string
    verificar: string
    passos: Record<'principal' | 'mapa-impresso' | 'familia' | 'audio', NextStep>
  }
  abertura: {
    frase: string
    /** Skip button of the first-time cinema intro. */
    pular: string
  }
  boasVindas: {
    marca: string
    titulo: string
    texto: string
    botao: string
    botaoSecundario: string
  }
  diagnostico: { titulo: string; texto: string; opcoes: DiagnosticoOpcao[] }
  proximaTrilha: { rotulo: string; titulo: string; texto: string; botao: string; resumo: string }
  oferta: {
    rotulo: string
    titulo: string
    preco: string
    precoNota: string
    itens: string[]
    botao: string
    botaoSecundario: string
    aviso: string
  }
  conclusao: { verso: string }
  diario: {
    titulo: string
    texto: string
    abas: [string, string]
    campos: { id: string; pergunta: string; rotulo: string }[]
    botao: string
    vazio: string
    etiquetaLivre: string
  }
  guiaVerbo: {
    titulo: string
    texto: string
    aviso: string
    comandos: string[]
    emBreve: string
    fase: { rotulo: string; texto: string }
  }
}
