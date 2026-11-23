// 10 · Oferta, 11 · Perguntas frequentes, 12 · Fechamento.
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import landing from '../../../content/landing.json'
import { imagePath, imageSmallPath } from '../../media/paths'
import { CheckIcon } from '../../ui/icons'
import { Logo } from '../../ui/Logo'
import { LIGHT_LAMP_EVENT } from '../chrome/Chrome'
import { FadeBg } from '../FadeBg'
import { checkoutHref, freeHref } from '../links'
import { fill, OFERTA, offerText, useOffer } from '../oferta'
import { gsap, reducedMotion } from '../motion'
import { lpSound } from '../state'
import { onBuyClick, onFreeClick } from '../track'
import { Listen } from '../Listen'
import { useReveal } from '../useReveal'
import { ScrollCue } from '../ScrollCue'

// ---------- 10 · Oferta ----------
// The Founder offer (content/oferta.json) with real scarcity: the counter shows the seats taken
// from the database, or nothing when the count can't be read. When the seats are gone the block
// becomes the annual offer (R$ 67) by itself.

export function Offer() {
  const root = useRef<HTMLElement>(null)
  useReveal(root)
  const o = landing.oferta
  const offer = useOffer()
  const b = OFERTA.bloco
  const closed = OFERTA.blocoFechado

  useLayoutEffect(() => {
    const el = root.current!
    if (reducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.set('.offer-check', { scale: 0, rotate: -45 })
      gsap.set('.offer-item-text', { opacity: 0, x: -8 })
      gsap.timeline({ scrollTrigger: { trigger: '.offer-list', start: 'top 80%', once: true } })
        .to('.offer-check', { scale: 1, rotate: 0, duration: 0.45, ease: 'back.out(2.2)', stagger: 0.08 })
        .to('.offer-item-text', { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out', stagger: 0.08 }, 0.05)
      gsap.fromTo('.offer-seal', { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(1.8)', scrollTrigger: { trigger: '.offer-seal', start: 'top 90%', once: true } })
    }, el)
    return () => ctx.revert()
  }, [offer.fechada])

  const pct = offer.vendidos === null ? 0 : Math.min(100, (offer.vendidos / offer.limite) * 100)

  return (
    <section id="oferta" ref={root} className="relative overflow-hidden bg-ink px-4 py-20 text-paper md:py-28" data-oferta={offer.fechada ? 'anual' : 'fundador'}>
      <FadeBg id="capa-jesus-em-ordem" position="50% 70%" opacity={0.6} veil="radial-gradient(ellipse at 50% 45%, rgba(30,34,48,0.7), rgba(30,34,48,0.2) 75%)" />
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-24 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(226,197,128,0.16),rgba(226,197,128,0)_65%)]" />
      <div className="relative mx-auto max-w-[580px]">
        <p data-reveal className="text-center text-xs font-bold tracking-[0.18em] text-gold">
          {offer.fechada ? closed.selo : b.selo}
        </p>
        <h2 data-reveal className="mt-3 text-center font-display text-[28px] font-semibold leading-[1.15] tracking-[-0.015em] [text-wrap:balance] md:text-[40px]">
          {offer.fechada ? closed.titulo : b.titulo}
        </h2>
        <p data-reveal className="mx-auto mt-4 max-w-[520px] text-center text-[15.5px] leading-relaxed text-paper/80 [text-wrap:pretty]">
          {offer.fechada ? closed.texto : b.texto}
        </p>

        {/* The real counter: only when the number came from the database. */}
        {!offer.fechada && offer.vendidos !== null && (
          <div data-reveal className="mx-auto mt-6 max-w-[440px]" data-testid="contador-fundador">
            <div className="h-2.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={offer.limite} aria-valuenow={offer.vendidos} aria-label="Vagas de Fundador preenchidas">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#B8893A,#E2C580)] transition-[width] duration-700" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-center text-[13.5px] font-semibold text-gold-soft">{fill(b.contador, offer)}</p>
          </div>
        )}

        <div data-reveal className="mt-9 rounded-[22px] bg-[linear-gradient(150deg,#E2C580,#B8893A_45%,#8A672B)] p-[1.5px] shadow-[0_30px_80px_-30px_rgba(226,197,128,0.55)]">
          <div className="rounded-[21px] bg-[linear-gradient(170deg,#262A3A,#1E2230)] px-5 pb-6 pt-6 md:px-8 md:pt-8">
            <h3 className="text-[13px] font-bold uppercase tracking-[0.14em] text-gold-soft">{b.recebeTitulo}</h3>
            <ul className="offer-list mt-3 space-y-3">
              {b.recebe.map((it) => (
                <li key={it} className="flex items-start gap-3">
                  <span className="offer-check mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full bg-gold text-ink">
                    <CheckIcon size={14} />
                  </span>
                  <span className="offer-item-text text-[15.5px] leading-snug text-paper/90">{it}</span>
                </li>
              ))}
            </ul>

            {/* Founder-only bonuses: gone with the seats. Individual price only where docs/06 defines one. */}
            {!offer.fechada && (
              <>
                <h3 className="mt-7 text-[13px] font-bold uppercase tracking-[0.14em] text-gold-soft">{b.bonusTitulo}</h3>
                <ol className="mt-3 space-y-2.5">
                  {b.bonus.map((it, i) => {
                    const price = it.produto ? (b.precosReferencia as Record<string, string>)[it.produto] : null
                    return (
                      <li key={it.texto} className="flex items-start gap-3">
                        <span className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full border border-gold/60 text-[12px] font-bold text-gold-soft">{i + 1}</span>
                        <span className="flex-1 text-[15px] leading-snug text-paper/90">
                          {it.texto}
                          <span className="mt-0.5 block text-[12px] text-paper/55">{price ? `vale ${price}, incluso` : b.bonusSemPreco}</span>
                        </span>
                      </li>
                    )
                  })}
                </ol>
              </>
            )}

            <div className="mt-7 border-t border-white/10 pt-6 text-center">
              <strong className="font-display text-[44px] font-semibold leading-none text-gold-soft md:text-[52px]">{offer.fechada ? closed.preco : b.preco}</strong>
              <p className="mt-1.5 font-serif text-[17px] italic text-paper/70">{offer.fechada ? closed.precoDia : b.precoDia}</p>
              <p className="mt-1 text-[13px] text-paper/60">{b.precoNota}</p>
            </div>

            <a
              href={checkoutHref()}
              onClick={() => onBuyClick('oferta')}
              className="lp-shine mt-6 grid min-h-[56px] place-items-center rounded-btn bg-ember-button px-6 text-center text-base font-bold text-white shadow-[0_12px_34px_-8px_rgba(196,87,46,0.75)] transition-transform active:scale-[0.98]"
            >
              {offer.fechada ? closed.botao : b.botao}
            </a>
            <p className="mt-3 text-center text-[12.5px] text-paper/65">{b.rodape}</p>
            <p className="mt-1 text-center text-[12px] text-paper/45">{o.rodape}</p>
          </div>
        </div>

        <div data-reveal className="mt-8 flex items-center gap-4 rounded-card border border-white/10 bg-white/[0.04] p-4">
          <GuaranteeSeal />
          <p className="text-[14.5px] leading-snug text-paper/85">
            <strong className="text-paper">{o.garantiaTitulo}</strong> {o.garantia}
          </p>
        </div>

        {!offer.fechada && (
          <div data-reveal className="mt-8">
            <h3 className="font-display text-xl font-semibold text-gold-soft">{o.porQueTitulo}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-paper/75">{o.porQue}</p>
          </div>
        )}
      </div>
      <ScrollCue className="absolute bottom-3 left-1/2 z-[2] -translate-x-1/2 md:bottom-5" />
    </section>
  )
}

/** The guarantee seal (content/oferta.json → garantiaDias), with a slowly turning ring of text. */
function GuaranteeSeal() {
  const dias = OFERTA.garantiaDias
  const ring = `GARANTIA · ${dias} DIAS · GARANTIA · ${dias} DIAS · `
  return (
    <div className="offer-seal relative h-[84px] w-[84px] flex-none" aria-hidden="true">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full motion-safe:animate-[spin_18s_linear_infinite]">
        <defs>
          <path id="seal-ring" d="M50 50 m-38 0 a38 38 0 1 1 76 0 a38 38 0 1 1 -76 0" />
        </defs>
        <text fill="#E2C580" fontSize="9.2" fontWeight="700" letterSpacing="1.4" fontFamily="Manrope, sans-serif">
          <textPath href="#seal-ring">{ring}</textPath>
        </text>
      </svg>
      <div className="absolute inset-[18px] grid place-items-center rounded-full bg-gold text-ink shadow-[0_0_0_3px_rgba(226,197,128,0.25)]">
        <span className="text-center font-display text-[20px] font-bold leading-none">
          {dias}
          <span className="block text-[9px] font-sans font-bold tracking-wider">DIAS</span>
        </span>
      </div>
    </div>
  )
}
// ---------- 11 · Perguntas frequentes ----------

export function Faq() {
  const root = useRef<HTMLElement>(null)
  useReveal(root)
  const f = landing.faq
  const items = f.itens.filter((i): i is { p: string; r: string } => typeof i.r === 'string')
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" ref={root} className="relative bg-paper px-5 py-20 text-ink md:py-28">
      <div className="mx-auto max-w-2xl">
        <h2 data-reveal className="text-center font-display text-[30px] font-semibold leading-[1.12] md:text-5xl">
          {f.titulo}
        </h2>
        <div className="mt-10 divide-y divide-line rounded-card bg-card shadow-card">
          {items.map((it, i) => {
            const isOpen = open === i
            return (
              <div key={it.p} data-reveal>
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`faq-${i}`}
                    onClick={() => {
                      lpSound.play('tap')
                      setOpen(isOpen ? null : i)
                    }}
                    data-sound
                    className="flex min-h-[56px] w-full items-center justify-between gap-4 px-5 py-3 text-left text-[16px] font-semibold"
                  >
                    {it.p}
                    <span aria-hidden="true" className={`grid h-7 w-7 flex-none place-items-center rounded-full bg-paper-2 text-gold-ink transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}>
                      +
                    </span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-${i}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-[15px] leading-relaxed text-ink-2">{it.r}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ---------- 12 · Fechamento ----------

export function Finale() {
  const root = useRef<HTMLElement>(null)
  useReveal(root)
  const c = landing.fechamento

  useLayoutEffect(() => {
    const el = root.current!
    const lit = ScrollLight(el)
    if (reducedMotion()) return lit
    const ctx = gsap.context(() => {
      gsap.fromTo('.finale-bg', { yPercent: -10, scale: 1.08 }, { yPercent: 8, scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } })
      // Slow reveal of the title, letter by letter.
      gsap.fromTo(
        '.finale-char',
        { opacity: 0, y: 18, filter: 'blur(6px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.9, ease: 'power2.out', stagger: 0.035, scrollTrigger: { trigger: '.finale-title', start: 'top 80%', once: true } },
      )
    }, el)
    return () => {
      lit()
      ctx.revert()
    }
  }, [])

  return (
    <section id="fechamento" ref={root} className="relative grid min-h-[100svh] place-items-center overflow-hidden bg-ink px-6 pb-32 pt-24 text-paper md:pb-24">
      <div aria-hidden="true" className="finale-bg absolute -inset-y-[12%] inset-x-0">
        <img
          src={imagePath('era-d7')}
          srcSet={`${imageSmallPath('era-d7')} 540w, ${imagePath('era-d7')} 768w`}
          sizes="100vw"
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </div>
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_bottom,#1E2230_0%,rgba(30,34,48,0.55)_30%,rgba(30,34,48,0.6)_65%,#1E2230_100%)]" />
      <div className="relative mx-auto max-w-xl text-center">
        <Logo variant="mark" title={null} className="mx-auto mb-6 h-14 w-auto drop-shadow-[0_0_18px_rgba(241,217,160,0.6)]" />
        <h2 className="finale-title font-display text-[38px] font-semibold leading-[1.1] tracking-[-0.015em] md:text-6xl" aria-label={c.titulo}>
          {c.titulo.split(' ').map((w, i) => (
            <span key={i} aria-hidden="true" className="inline-block whitespace-nowrap">
              {[...w].map((ch, k) => (
                <span key={k} className="finale-char inline-block">
                  {ch}
                </span>
              ))}
              &nbsp;
            </span>
          ))}
        </h2>
        <figure data-reveal className="mt-6">
          <blockquote className="font-serif text-[20px] italic text-paper/85 md:text-2xl">“{c.citacao}”</blockquote>
          <figcaption className="mt-2 text-xs font-bold tracking-[0.14em] text-gold-soft">{c.referencia.toUpperCase()}</figcaption>
        </figure>
        <div data-reveal className="mt-6">
          <Listen id="narr-lp-fechamento" origem="fechamento" />
        </div>
        <div data-reveal className="mt-5 flex flex-col items-center gap-2">
          <a
            href={checkoutHref()}
            onClick={() => onBuyClick('fechamento')}
            className="lp-shine grid min-h-[56px] w-full max-w-sm place-items-center whitespace-nowrap rounded-btn bg-ember-button px-6 text-[15px] font-bold text-white shadow-[0_12px_34px_-8px_rgba(196,87,46,0.75)]"
          >
            {offerText(c.botaoPrincipal)}
          </a>
          <a
            href={freeHref()}
            onClick={() => onFreeClick('fechamento')}
            className="grid min-h-11 place-items-center text-sm font-semibold text-paper/85 underline decoration-gold/70 underline-offset-4"
          >
            {c.botaoSecundario}
          </a>
        </div>
      </div>
    </section>
  )
}

/** When the closing section comes into view, the lamp at the end of the journey bar lights fully. */
function ScrollLight(el: HTMLElement) {
  const io = new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting) {
        window.dispatchEvent(new Event(LIGHT_LAMP_EVENT))
        lpSound.play('lamp_ignite')
        io.disconnect()
      }
    },
    { threshold: 0.35 },
  )
  io.observe(el)
  return () => io.disconnect()
}

// ---------- Saída da página ----------

/**
 * A light "before you go" window, once per session: on desktop when the cursor leaves through the
 * top of the window; on mobile when the back button is pressed (one extra history entry).
 */
export function ExitIntent() {
  const [open, setOpen] = useState(false)
  const s = landing.saida
  const KEY = 'lp:exit-shown'

  useEffect(() => {
    let shown = false
    try {
      shown = sessionStorage.getItem(KEY) === '1'
    } catch {
      /* ignore */
    }
    if (shown) return
    const show = () => {
      try {
        sessionStorage.setItem(KEY, '1')
      } catch {
        /* ignore */
      }
      setOpen(true)
      cleanup()
    }
    const armedAt = Date.now()
    const onLeave = (e: MouseEvent) => {
      if (!e.relatedTarget && e.clientY <= 0 && Date.now() - armedAt > 6000) show()
    }
    const touch = window.matchMedia('(hover: none)').matches
    const onPop = () => show()
    if (touch) {
      history.pushState({ lpExit: true }, '')
      window.addEventListener('popstate', onPop)
    } else document.addEventListener('mouseout', onLeave)
    function cleanup() {
      document.removeEventListener('mouseout', onLeave)
      window.removeEventListener('popstate', onPop)
    }
    return cleanup
  }, [])

  // Escape closes it.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] grid place-items-end bg-black/55 p-3 backdrop-blur-sm md:place-items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-title"
            className="relative w-full max-w-md rounded-[22px] bg-paper p-6 pb-5 text-ink shadow-2xl"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={s.fechar}
              className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full text-2xl leading-none text-ink-3 hover:bg-paper-2"
              autoFocus
            >
              ×
            </button>
            <Logo variant="mark" title={null} className="h-10 w-auto" />
            <h2 id="exit-title" className="mt-3 pr-8 font-display text-2xl font-semibold leading-tight">
              {s.titulo}
            </h2>
            <p className="mt-2 text-[15px] text-ink-2">{s.texto}</p>
            <a
              href={freeHref()}
              onClick={() => onFreeClick('saida')}
              className="mt-5 grid min-h-[52px] place-items-center rounded-btn bg-ink px-6 text-[15px] font-bold text-paper"
            >
              {s.botao}
            </a>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
