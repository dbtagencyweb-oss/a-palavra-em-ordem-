// A horizontal timeline whose milestones light up as the days are completed (e.g. the life of
// Jesus: Nascimento, Batismo, Início do ministério, … Ressurreição). Reusable for any trail that
// has milestones: give it the labels and which ones are lit.
import { motion, useReducedMotion } from 'framer-motion'

interface Props {
  milestones: string[]
  lit: ReadonlySet<string>
  current?: string
  /** The milestone just reached (pulses once). */
  fresh?: string | null
  tone?: 'dark' | 'light'
  className?: string
}

export function LifeTimeline({ milestones, lit, current, fresh = null, tone = 'dark', className = '' }: Props) {
  const reduced = useReducedMotion()
  const dark = tone === 'dark'
  const lastLit = milestones.reduce((m, label, i) => (lit.has(label) ? i : m), -1)
  const pct = milestones.length > 1 ? (Math.max(0, lastLit) / (milestones.length - 1)) * 100 : 0

  return (
    <figure className={`relative ${className}`} aria-label={`Linha do tempo: ${lit.size} de ${milestones.length} marcos`} data-testid="life-timeline">
      {milestones.length > 1 && (
        // 26 px for the label, 4 px gap and 10 px to the center of the dot.
        <span aria-hidden="true" className={`absolute top-[40px] h-[2px] -translate-y-1/2 rounded ${dark ? 'bg-white/15' : 'bg-line'}`}
          style={{ left: `${50 / milestones.length}%`, right: `${50 / milestones.length}%` }}>
          <motion.span
            className="block h-full rounded bg-[linear-gradient(90deg,#B8893A,#E2C580)]"
            initial={false}
            animate={{ width: lastLit < 0 ? '0%' : `${pct}%` }}
            transition={{ duration: reduced ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </span>
      )}
      <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${milestones.length}, minmax(0, 1fr))` }}>
        {milestones.map((label, i) => {
          const on = lit.has(label)
          const active = label === current
          const above = i % 2 === 1
          const labelColor = on || active ? (dark ? 'text-gold-soft' : 'text-gold-ink') : dark ? 'text-paper/45' : 'text-ink-3'
          const dotColor = active ? 'border-gold bg-gold-soft shadow-[0_0_0_3px_rgba(184,137,58,0.20),0_0_12px_rgba(226,197,128,0.8)]'
            : on ? 'border-gold bg-gold shadow-[0_0_12px_rgba(226,197,128,0.75)]'
            : dark ? 'border-white/30 bg-ink' : 'border-line bg-card'
          // The first and last labels open toward the inside, so they never touch the card's edge.
          const edge = i === 0 ? 'self-start justify-start text-left' : i === milestones.length - 1 ? 'self-end justify-end text-right' : 'justify-center'
          const text = (
            <span
              className={`flex h-[26px] w-[200%] px-0.5 text-[9.5px] font-semibold leading-tight ${edge} ${above ? 'items-end' : 'items-start'} ${labelColor}`}
            >
              {label}
            </span>
          )
          return (
            <li key={label} className="relative flex flex-col items-center gap-1 text-center" aria-current={active ? 'step' : undefined} aria-label={`${label}${on ? ', alcançado' : ''}`}>
              {above ? text : <span className="h-[26px]" aria-hidden="true" />}
              <motion.span
                className={`relative z-10 grid h-5 w-5 place-items-center rounded-full border-2 ${dotColor}`}
                animate={fresh === label && !reduced ? { scale: [1, 1.5, 1] } : { scale: 1 }}
                transition={{ duration: 0.8 }}
              >
                {(on || active) && <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-gold-ink' : 'bg-[#FFF6DC]'}`} />}
              </motion.span>
              {above ? <span className="h-[26px]" aria-hidden="true" /> : text}
            </li>
          )
        })}
      </ol>
    </figure>
  )
}

/** Milestones reached: those whose day (marcoLinhaDoTempo) is completed. */
export function reachedMilestones(outline: { n: number; marcoLinhaDoTempo?: string }[], completed: Record<number, string>): Set<string> {
  return new Set(outline.filter((d) => d.marcoLinhaDoTempo && completed[d.n]).map((d) => d.marcoLinhaDoTempo!))
}
