import type { CardOf, CardProps } from './types'

/** The day closes in prayer, by candlelight, on the era's dark background. */
export function OracaoCard({ card, api }: CardProps<CardOf<'oracao'>>) {
  const era = api.era
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden px-7 pb-6 pt-4">
      {/* Warm halo around the candle */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[6%] h-[320px] w-[320px] -translate-x-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(246,201,154,.28), rgba(232,140,80,.08) 45%, transparent 70%)' }}
      />
      <svg aria-hidden="true" width="64" height="120" viewBox="0 0 64 120" className="relative mx-auto mt-6">
        <g className="flame">
          <path d="M32 6 C 20 26, 22 40, 32 50 C 42 40, 44 26, 32 6 Z" fill="#E88C50" />
          <path d="M32 22 C 26 32, 27 40, 32 46 C 37 40, 38 32, 32 22 Z" fill="#F6C99A" />
        </g>
        <rect x="31" y="48" width="2" height="8" rx="1" fill="#2A2620" />
        <rect x="20" y="56" width="24" height="58" rx="4" fill={era.light} />
        <rect x="20" y="56" width="24" height="6" rx="3" fill="#ffffff" opacity=".35" />
      </svg>

      <div className="relative mt-auto">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: era.light, opacity: 0.75 }}>
          Dia {api.dayN} · {card.rotulo ?? 'Oração'}
        </div>
        <h2 className="mb-4 text-2xl" style={{ color: era.light }}>
          Para terminar.
        </h2>
        <p className="border-l-2 pl-[18px] pt-1 font-serif text-[21px] italic leading-[1.6]" style={{ color: era.light, borderColor: era.mid }}>
          {card.texto}
        </p>
      </div>
    </div>
  )
}
