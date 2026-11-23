// 2b · "Sem mapa × Com mapa" (content/lp-comparacao.json, em revisão): the same passage read
// without and with the map. Two cards side by side (stacked on phones) with a divider; the "with
// the map" card reveals when the section comes into view, and its compact timeline of the seven eras
// (the hero map's eras and colors, drawn flat) lights the era of the passage.
import { useEffect, useRef, useState } from 'react'
import data from '../../../content/lp-comparacao.json'
import { desaturate, ERAS } from '../HeroBook'
import { reducedMotion } from '../motion'

export function Compare() {
  const root = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (reducedMotion()) return setShown(true)
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShown(true), { threshold: 0.3 })
    io.observe(root.current!)
    return () => io.disconnect()
  }, [])

  const { sem, com } = data
  return (
    <section id="com-e-sem-mapa" ref={root} className="relative bg-paper px-5 py-20 text-ink md:px-10 md:py-28">
      <h2 className="mx-auto max-w-2xl text-center font-display text-[30px] font-semibold leading-[1.12] tracking-[-0.015em] [text-wrap:balance] md:text-[42px]">
        {data.titulo}
      </h2>

      <div className="mx-auto mt-10 grid max-w-5xl items-stretch gap-5 md:grid-cols-[1fr_auto_1fr] md:gap-6">
        {/* Without the map: grey, a question mark, the doubts. */}
        <article className="rounded-card border border-line bg-[#ECE8E0] p-6 text-ink-2">
          <header className="flex items-center gap-3">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-ink/10 font-display text-xl font-semibold text-ink/55" aria-hidden="true">
              ?
            </span>
            <h3 className="text-[13px] font-bold uppercase tracking-[0.14em] text-ink-3">{sem.rotulo}</h3>
          </header>
          <p className="mt-5 text-xs font-bold tracking-[0.12em] text-ink-3">{sem.referencia.toUpperCase()}</p>
          <p className="mt-1.5 font-serif text-[19px] italic leading-snug text-ink/80">{sem.parafrase}</p>
          <ul className="mt-5 space-y-2">
            {sem.duvidas.map((d) => (
              <li key={d} className="flex items-start gap-2.5 text-[15px] leading-snug">
                <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-ink/30" aria-hidden="true" />
                {d}
              </li>
            ))}
          </ul>
        </article>

        {/* The divider: a line on desktop, a short rule on phones. */}
        <div className="flex items-center justify-center md:flex-col" aria-hidden="true">
          <span className="h-px w-12 bg-gold/50 md:h-full md:w-px" />
        </div>

        {/* With the map: paper, gold detail, the era lit. */}
        <article
          className={`rounded-card border border-gold/40 bg-[#F5EFE3] p-6 shadow-[0_18px_50px_-28px_rgba(138,100,32,0.55)] transition-[opacity,transform,filter] duration-700 ease-out ${
            shown ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-4 opacity-0 blur-[3px]'
          }`}
        >
          <header className="flex items-center gap-3">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-gold text-ink" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
                <path d="M9 4v14M15 6v14" />
              </svg>
            </span>
            <h3 className="text-[13px] font-bold uppercase tracking-[0.14em] text-gold-ink">{com.rotulo}</h3>
          </header>
          <EraLine active={com.eraAtiva} lit={shown} />
          <p className="mt-5 text-[15.5px] leading-relaxed text-ink">{com.texto}</p>
          <p className="mt-5 border-t border-gold/30 pt-4 text-[14px] font-semibold text-gold-ink">{com.rodape}</p>
        </article>
      </div>
    </section>
  )
}

/** The seven eras on one line, the active one lit (a compact, flat version of the hero map). */
function EraLine({ active, lit }: { active: string; lit: boolean }) {
  const W = 320
  const PAD = 30 // room for the first and last names
  const step = (W - 2 * PAD) / (ERAS.length - 1)
  const activeName = ERAS.find((e) => e.id === active)?.nome
  return (
    <figure className="mt-5">
      <svg viewBox={`0 0 ${W} 58`} className="w-full" role="img" aria-label={`Linha do tempo das sete eras, com ${activeName} em destaque`}>
        <path d={`M${PAD} 20 H${W - PAD}`} stroke="#5A3E1B" strokeOpacity="0.35" strokeWidth="1.5" strokeLinecap="round" />
        {ERAS.map((e, i) => {
          const x = PAD + i * step
          const on = e.id === active
          return (
            <g key={e.id}>
              {on && <circle cx={x} cy="20" r="14" fill="#E2C580" opacity={lit ? 0.45 : 0} className="transition-opacity delay-500 duration-700" />}
              <circle cx={x} cy="20" r={on ? 7.5 : 5} fill={on ? e.color : desaturate(e.color, 0.55)} stroke="#5A3E1B" strokeWidth="1.2" opacity={on ? 1 : 0.6} />
              <text x={x} y="48" textAnchor="middle" fontSize={on ? 11 : 9.5} fontWeight={on ? 700 : 500} fill={on ? '#3B2A14' : '#7A6A55'} fontFamily="Manrope, sans-serif">
                {e.nome}
              </text>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}
