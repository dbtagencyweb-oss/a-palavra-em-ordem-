// 2 · A dor. On ink, the section pins and each phrase takes the whole screen in turn as you scroll:
// it rises out of a blur, holds, and drifts away for the next. The last two ("Não é falta de fé." /
// "É falta de mapa.") stay together in gold, with the flame lighting above them.
// Reduced motion (or no JS animation): the phrases are simply stacked and always readable.
import { useLayoutEffect, useRef } from 'react'
import landing from '../../../content/landing.json'
import { Logo } from '../../ui/Logo'
import { gsap, reducedMotion } from '../motion'
import { copyFor, getPublico } from '../publico'

const { frases } = landing.dor
const finale = frases.filter((f) => 'destaque' in f && f.destaque)

/** *text* becomes an italic accent. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*[^*]+\*)/).map((part, i) =>
        part.startsWith('*') ? (
          <em key={i} className="font-serif font-normal italic text-gold-soft">
            {part.slice(1, -1)}
          </em>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}

/** The pain list follows the audience (content/lp-publicos.json); Landing remounts this section when
 * it changes, so the pinned timeline is rebuilt for the new number of phrases. */
export function Pain() {
  const root = useRef<HTMLElement>(null)
  const dores = copyFor(getPublico()).dores
  const plain = dores.itens.map((texto) => ({ texto }))
  // The list's title, above the phrases; not when it says the same as the closing lines.
  const norm = (t: string) => t.replace(/\W+/g, ' ').trim().toLowerCase()
  const label = norm(dores.titulo) === norm(finale.map((f) => f.texto).join(' ')) ? null : dores.titulo

  useLayoutEffect(() => {
    const el = root.current!
    if (reducedMotion()) return
    const q = gsap.utils.selector(el)
    const ctx = gsap.context(() => {
      el.classList.add('is-animated')
      const lines = q('.pain-line')
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: () => `+=${window.innerHeight * (plain.length + 2) * 0.75}`,
          pin: q('.pain-stage')[0],
          scrub: 0.5,
          anticipatePin: 1,
          // Rebuilt when the audience changes: it must still be measured before the pins below it.
          refreshPriority: 1,
        },
      })
      gsap.set(lines, { opacity: 0, y: 40, filter: 'blur(8px)' })
      gsap.set(q('.pain-finale > *'), { opacity: 0, y: 30, filter: 'blur(8px)' })
      gsap.set(q('.pain-flame'), { opacity: 0, scale: 0.4 })

      lines.forEach((line, i) => {
        const at = i * 1.2
        tl.to(line, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.5 }, at)
          .to(q('.pain-dot')[i], { backgroundColor: '#E2C580', scale: 1.4, duration: 0.2 }, at)
          .to(line, { opacity: 0, y: -40, filter: 'blur(6px)', duration: 0.45 }, at + 0.85)
          .to(q('.pain-dot')[i], { backgroundColor: 'rgba(245,239,227,0.25)', scale: 1, duration: 0.2 }, at + 0.85)
      })
      // "A culpa fica": the screen dims a little before the turn.
      const end = plain.length * 1.2
      tl.to(q('.pain-dim'), { opacity: 1, duration: 0.6 }, end - 1.2)
        .to(q('.pain-label'), { opacity: 0, duration: 0.4 }, end - 0.4)
        .to(q('.pain-dim'), { opacity: 0, duration: 0.5 }, end + 0.1)
        .to(q('.pain-finale > *')[0], { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.5 }, end + 0.1)
        .to(q('.pain-finale > *')[1], { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.5 }, end + 0.7)
        .to(q('.pain-flame'), { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' }, end + 0.9)
        .to(q('.pain-glow'), { opacity: 1, scale: 1, duration: 0.6 }, end + 0.9)
        .to(q('.pain-dots'), { opacity: 0, duration: 0.3 }, end + 0.2)
        .to({}, { duration: 0.6 }) // hold the finale before unpinning
    }, el)
    return () => ctx.revert()
  }, [plain.length])

  return (
    <section id="dor" ref={root} aria-label={landing.dor.rotulo} className="lp-pain relative bg-ink text-paper">
      <div className="pain-stage relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 py-24">
        <div aria-hidden="true" className="pain-dim pointer-events-none absolute inset-0 bg-black/40 opacity-0" />

        {label && (
          <p className="pain-label absolute inset-x-6 top-[14%] text-center text-xs font-bold uppercase tracking-[0.16em] text-gold-soft/80 md:top-[16%] md:text-sm">
            {label}
          </p>
        )}
        {/* The phrases. Animated: stacked in the same spot. Static: one after the other. */}
        <ol className="pain-lines relative w-full max-w-[15em] text-center">
          {plain.map((f, i) => (
            <li
              key={i}
              className="pain-line font-display text-[29px] font-medium leading-[1.2] tracking-[-0.01em] text-paper/90 md:text-[46px]"
            >
              <Rich text={f.texto} />
            </li>
          ))}
        </ol>

        <div className="pain-finale-wrap relative text-center">
          <div
            aria-hidden="true"
            className="pain-glow pointer-events-none absolute left-1/2 top-[-30%] h-72 w-72 -translate-x-1/2 scale-50 rounded-full bg-[radial-gradient(circle,rgba(226,197,128,0.28),rgba(226,197,128,0)_65%)] opacity-0"
          />
          <Logo variant="mark" title={null} className="pain-flame relative mx-auto mb-5 h-14 w-auto" />
          <p className="pain-finale relative font-display text-[34px] font-semibold leading-[1.15] md:text-[56px]">
            {finale.map((f, i) => (
              <span key={i} className={`block ${i === 1 ? 'text-gold-soft' : ''}`}>
                {f.texto}
              </span>
            ))}
          </p>
        </div>

        <div aria-hidden="true" className="pain-dots absolute bottom-8 left-1/2 hidden -translate-x-1/2 gap-2">
          {plain.map((_, i) => (
            <span key={i} className="pain-dot h-1.5 w-1.5 rounded-full bg-paper/25" />
          ))}
        </div>
      </div>
    </section>
  )
}
