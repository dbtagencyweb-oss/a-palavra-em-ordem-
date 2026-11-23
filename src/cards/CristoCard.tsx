import type { CardOf, CardProps } from './types'

export function CristoCard({ card }: CardProps<CardOf<'cristo'>>) {
  return (
    <div className="relative overflow-hidden rounded-card border border-gold/40 bg-gradient-to-br from-gold-soft to-card p-6 shadow-card">
      <svg
        className="absolute right-4 top-4 text-gold/50"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M12 3v18M6 9h12" strokeLinecap="round" />
      </svg>
      <p className="font-serif text-[20px] leading-[1.55] text-[#2B2F3D]">{card.texto}</p>
    </div>
  )
}
