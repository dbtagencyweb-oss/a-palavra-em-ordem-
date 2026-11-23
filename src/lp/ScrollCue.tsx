// The scroll cue: a small mouse whose wheel slides down, over a chevron that pulses. It sits at the
// foot of the sections that have buttons but still have more page below, so a visitor who reads the
// buttons as the end knows to keep going. Tapping it scrolls to the next section.
import { useEffect, useRef, useState } from 'react'
import { scrollToEl } from './motion'

interface Props {
  /** Light text on ink sections, dark text on paper ones. */
  tone?: 'dark' | 'light'
  /** Fade out once the visitor has started scrolling (the hero). */
  hideOnScroll?: boolean
  className?: string
}

export function ScrollCue({ tone = 'dark', hideOnScroll = false, className = '' }: Props) {
  const ref = useRef<HTMLButtonElement>(null)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    if (!hideOnScroll) return
    const check = () => setGone(window.scrollY > 80)
    check()
    window.addEventListener('scroll', check, { passive: true })
    return () => window.removeEventListener('scroll', check)
  }, [hideOnScroll])

  const next = () => {
    // The section this cue sits in (or its pin wrapper), then whatever comes after it in the page.
    let el: Element | null = ref.current?.closest('main > *') ?? null
    while (el && el.nextElementSibling && !(el.nextElementSibling as HTMLElement).offsetHeight) el = el.nextElementSibling
    const target = el?.nextElementSibling
    if (target) scrollToEl(target)
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={next}
      aria-label="Rolar para a próxima seção"
      tabIndex={gone ? -1 : 0}
      className={`lp-scroll-cue group grid h-12 w-11 place-items-center transition-opacity duration-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-soft ${
        tone === 'dark' ? 'text-paper/70 hover:text-paper' : 'text-ink/55 hover:text-ink'
      } ${gone ? 'pointer-events-none opacity-0' : 'opacity-100'} ${className}`}
    >
      <svg width="20" height="38" viewBox="0 0 20 38" fill="none" aria-hidden="true">
        <rect x="1.5" y="1.5" width="17" height="25" rx="8.5" stroke="currentColor" strokeWidth="1.6" />
        <rect className="lp-scroll-wheel" x="8.6" y="6" width="2.8" height="5.5" rx="1.4" fill="currentColor" />
        <path className="lp-scroll-chevron" d="M5.5 31.5l4.5 4 4.5-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
