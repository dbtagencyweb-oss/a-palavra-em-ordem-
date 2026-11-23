import type { ComponentType } from 'react'
import type { CardType } from '../content/types'
import { AberturaCard } from './AberturaCard'
import { CenaCard } from './CenaCard'
import { CristoCard } from './CristoCard'
import { ContextoCard, LeituraCard, ObservarCard, PerguntaCard } from './LeituraGuiadaCards'
import { LigarCard } from './LigarCard'
import { MapaCard } from './MapaCard'
import { MovimentosCard } from './MovimentosCard'
import { OfertaCard } from './OfertaCard'
import { OracaoCard } from './OracaoCard'
import { OrdenarCard } from './OrdenarCard'
import { PalavraCard } from './PalavraCard'
import { QuizCard } from './QuizCard'
import { ReflexaoCard } from './ReflexaoCard'
import { TextoCard } from './TextoCard'
import type { CardOf, CardProps } from './types'

type Registry = { [T in CardType]: ComponentType<CardProps<CardOf<T>>> }

/** One component per "tipo" in the lesson JSON. */
export const cardRegistry: Registry = {
  abertura: AberturaCard,
  texto: TextoCard,
  movimentos: MovimentosCard,
  mapa: MapaCard,
  cena: CenaCard,
  ordenar: OrdenarCard,
  ligar: LigarCard,
  palavra: PalavraCard,
  cristo: CristoCard,
  quiz: QuizCard,
  reflexao: ReflexaoCard,
  oracao: OracaoCard,
  oferta: OfertaCard,
  leitura: LeituraCard,
  contexto: ContextoCard,
  observar: ObservarCard,
  pergunta: PerguntaCard,
}
