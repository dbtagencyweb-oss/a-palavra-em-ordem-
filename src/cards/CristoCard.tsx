import { motion, useReducedMotion } from 'framer-motion'
import type { CardOf, CardProps } from './types'

export function CristoCard({ card }: CardProps<CardOf<'cristo'>>) {
  const reduced = useReducedMotion()

  return (
    <div className="relative isolate overflow-hidden rounded-card border border-gold/50 bg-[radial-gradient(ellipse_at_0%_0%,#F0DCAD_0%,#FAF4E6_58%,#FFFCF5_100%)] px-5 pb-7 pt-5 shadow-card min-[380px]:px-6">
      {reduced === false && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_0%,#FFF9E3,transparent_70%)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.9, 0] }}
          transition={{ duration: 1.1, times: [0, 0.38, 1], ease: 'easeInOut' }}
        />
      )}
      <motion.div
        aria-hidden="true"
        className="mb-4 flex items-center gap-3 text-gold-ink"
        initial={reduced ? false : { opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.42, ease: 'easeOut' }}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-gold/45 bg-card/60">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 3v18M6 9h12" strokeLinecap="round" />
          </svg>
        </span>
        <span className="h-px w-16 bg-gradient-to-r from-gold/70 to-transparent" />
      </motion.div>
      <motion.p
        className="font-serif text-[22px] leading-[1.5] text-ink min-[380px]:text-[24px]"
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.55, delay: reduced ? 0 : 0.13, ease: 'easeOut' }}
      >
        {card.texto}
      </motion.p>
    </div>
  )
}
