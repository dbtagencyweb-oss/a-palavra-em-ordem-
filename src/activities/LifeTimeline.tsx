// A horizontal timeline whose milestones light up as the days are completed (e.g. the life of
// Jesus: Nascimento, Batismo, Início do ministério, … Ressurreição). Reusable for any trail that
// has milestones: give it the labels and which ones are lit.
import { motion, useReducedMotion } from 'framer-motion'

interface Props {
  milestones: string[]
  lit: ReadonlySet<string>
  /** The milestone just reached (pulses once). */
  fresh?: string | null
  tone?: 'dark' | 'light'
  className?: string
}

export function LifeTimeline({ milestones, lit, fresh = null, tone = 'dark', className = '' }: Props) {
  const reduced = useReducedMotion()
  const dark = tone === 'dark'
  const lastLit = milestones.reduce((m, label, i) => (lit.has(label) ? i : m), -1)
  const pct = milestones.length > 1 ? (Math.max(0, lastLit) / (milestones.length - 1)) * 100 : 0

  return (
    <figure className={className} aria-label={`Linha do tempo: ${lit.size} de ${milestones.length} marcos`} data-testid="life-timeline">
      <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${milestones.length}, minmax(0, 1fr))` }}>
        {/* The line behind the dots, filled up to the last milestone reached. */}
        <span aria-hidden="true" className={`absolute left-[calc(50%/var(--n))] right-[calc(50%/var(--n))] top-[35px] h-[2px] rounded ${dark ? 'bg-white/15' : 'bg-line'}`} style={{ ['--n' as string]: milestones.length }}>
          <motion.span
            className="block h-full rounded bg-[linear-gradient(90deg,#B8893A,#E2C580)]"
            initial={false}
            animate={{ width: lastLit < 0 ? '0%' : `${pct}%` }}
            transition={{ duration: reduced ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </span>
        {milestones.map((label, i) => {
          const on = lit.has(label)
          const above = i % 2 === 1
          const text = (
            <span
              className={`flex h-[26px] w-[200%] justify-center px-0.5 text-[9.5px] font-semibold leading-tight ${above ? 'items-end' : 'items-start'} ${on ? (dark ? 'text-gold-soft' : 'text-gold-ink') : dark ? 'text-paper/45' : 'text-ink-3'}`}
            >
              {label}
            </span>
          )
          return (
            <li key={label} className="relative flex flex-col items-center gap-1 text-center" aria-label={`${label}${on ? ', alcançado' : ''}`}>
              {above ? text : <span className="h-[26px]" aria-hidden="true" />}
              <motion.span
                className={`relative z-10 grid h-5 w-5 place-items-center rounded-full border-2 ${
                  on ? 'border-gold bg-gold shadow-[0_0_12px_rgba(226,197,128,0.75)]' : dark ? 'border-white/30 bg-ink' : 'border-line bg-card'
                }`}
                animate={fresh === label && !reduced ? { scale: [1, 1.5, 1] } : { scale: 1 }}
                transition={{ duration: 0.8 }}
              >
                {on && <span className="h-1.5 w-1.5 rounded-full bg-[#FFF6DC]" />}
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
