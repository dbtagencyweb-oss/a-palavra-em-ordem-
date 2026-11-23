// 1b · "Qual é o seu caso?" Right below the hero: two big cards, one per audience. Nothing is chosen
// on arrival (only what was saved on this device); until then the general promise shows. Tapping a
// card swaps the hero subtitle, the pain list (section 2) and the objection (section 9), shows that
// version's promise and, under it, the free-start button with its own text and microcopy.
// Hidden when the address already says who it is (?p=).
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CheckIcon } from '../../ui/icons'
import { freeHref } from '../links'
import { copyFor, publicoFromUrl, seletor, setPublico, usePublico, type Publico } from '../publico'
import { ScrollCue } from '../ScrollCue'
import { lpEvent, onFreeClick } from '../track'

const SWAP_S = 0.3

export function Audience() {
  const publico = usePublico()
  const reduced = useReducedMotion()
  if (publicoFromUrl) return null

  const choose = (id: Publico) => {
    if (id === publico) return
    setPublico(id)
    lpEvent('lp_click', { tipo: 'publico', origem: id })
  }

  // Fade and a short slide; with reduced motion, the fade only.
  const swap = {
    initial: { opacity: 0, y: reduced ? 0 : 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reduced ? 0 : -6 },
    transition: { duration: SWAP_S, ease: [0.22, 1, 0.36, 1] as const },
  }
  const v = publico ? copyFor(publico) : null

  return (
    <section id="seu-caso" aria-labelledby="seu-caso-titulo" className="relative bg-ink px-5 pb-20 pt-6 text-paper md:pb-24 md:pt-4">
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="seu-caso-titulo" className="font-display text-[26px] font-semibold leading-tight tracking-[-0.01em] md:text-[34px]">
          {seletor.titulo}
        </h2>
        <p className="mt-1.5 font-serif text-[17px] italic text-paper/70 md:text-lg">{seletor.subtitulo}</p>
        {/* Phone (<640px): stacked, full width. Wider: side by side, same height. */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4" role="group" aria-label={seletor.titulo}>
          {seletor.opcoes.map((o) => {
            const on = o.id === publico
            return (
              <button
                key={o.id}
                type="button"
                aria-pressed={on}
                onClick={() => choose(o.id as Publico)}
                className={`lp-case group relative flex h-full min-h-[64px] w-full items-center gap-4 rounded-card border px-5 py-4 text-left transition-[border-color,background-color,transform,box-shadow] duration-300 active:scale-[0.985] sm:min-h-[96px] ${
                  on
                    ? 'border-gold-soft/80 bg-gold/[0.14] shadow-[0_14px_40px_-18px_rgba(226,197,128,0.55)]'
                    : 'border-white/15 bg-white/[0.04] hover:border-gold-soft/45 hover:bg-white/[0.07]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`grid h-7 w-7 flex-none place-items-center rounded-full border transition-colors duration-300 ${
                    on ? 'border-gold-soft bg-gold-soft text-ink' : 'border-white/30 text-transparent group-hover:border-gold-soft/60'
                  }`}
                >
                  <CheckIcon size={15} />
                </span>
                <span>
                  <span className="block text-[17px] font-semibold leading-snug [text-wrap:balance] sm:text-[18px]">{o.rotulo}</span>
                  <span className={`mt-1 block text-[14px] leading-snug transition-colors duration-300 ${on ? 'text-paper/85' : 'text-paper/60'}`}>{o.apoio}</span>
                </span>
              </button>
            )
          })}
        </div>

        {/* The promise: the general one until a choice, then that version's. */}
        <div className="mt-6 grid" aria-live="polite">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.p
              key={publico ?? 'geral'}
              {...swap}
              className="font-serif text-[19px] italic leading-snug text-[#E8DCC4] [grid-area:1/1] [text-wrap:balance] md:text-[22px]"
            >
              {v?.promessa ?? v?.subtitulo ?? seletor.promessaGeral}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* After the choice: the free start, in that version's words. */}
        <AnimatePresence initial={false} mode="popLayout">
          {v && (
            <motion.div key={publico} {...swap} className="mt-6 flex flex-col items-center gap-2">
              <a
                href={freeHref()}
                onClick={() => onFreeClick('seletor')}
                className="lp-shine grid min-h-[56px] w-full max-w-sm place-items-center rounded-btn bg-ember-button px-6 text-center text-[16px] font-bold text-white shadow-[0_12px_34px_-8px_rgba(196,87,46,0.75)] transition-transform active:scale-[0.98]"
              >
                {v.cta}
              </a>
              <span className="text-[13px] text-paper/65">{v.microcopy}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <ScrollCue className="absolute bottom-3 left-1/2 z-[2] -translate-x-1/2 md:bottom-5" />
    </section>
  )
}
